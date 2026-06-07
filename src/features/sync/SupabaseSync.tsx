import { useEffect, useRef, useState, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { useHabitStore } from '../habits/useHabitStore';
import { useFinanceStore } from '../finance/useFinanceStore';
import { Loader2, CloudOff, RefreshCw } from 'lucide-react';

// Tracks when this device last edited finance data (client epoch ms).
// Used for last-write-wins against the cloud copy's updated_at.
const LOCAL_EDIT_KEY = 'finance_local_edit_at';
// Tombstones for realExpenses deleted/migrated locally but possibly still in the
// cloud copy. Persisted so they survive a reload before the change has synced —
// otherwise the cloud merge would resurrect a just-deleted/migrated expense.
const PENDING_DELETES_KEY = 'finance_pending_deletes';
// Highest `_forceAdoptAt` marker this device has already force-adopted from the cloud.
const FORCE_APPLIED_KEY = 'finance_force_applied';

function loadPendingDeletes(): Set<string> {
    try {
        return new Set(JSON.parse(localStorage.getItem(PENDING_DELETES_KEY) || '[]'));
    } catch {
        return new Set();
    }
}
function persistPendingDeletes(set: Set<string>) {
    try { localStorage.setItem(PENDING_DELETES_KEY, JSON.stringify([...set])); } catch { /* ignore */ }
}
function clearPendingDeletes() {
    try { localStorage.removeItem(PENDING_DELETES_KEY); } catch { /* ignore */ }
}

export function SupabaseSync() {
    const { user } = useAuth();
    const [status, setStatus] = useState<'idle' | 'saving' | 'synced' | 'error'>('idle');
    const [isHovered, setIsHovered] = useState(false);
    const lastSavedRef = useRef<number>(Date.now());
    const isSavingRef = useRef(false);
    const initialLoadDoneRef = useRef(false);
    const hasPendingChangesRef = useRef(false);
    const pendingDeletionsRef = useRef<Set<string>>(loadPendingDeletes());
    const prevExpenseIdsRef = useRef<Set<string>>(new Set());

    const habitsState = useHabitStore();
    const financeState = useFinanceStore();

    useEffect(() => {
        if (!initialLoadDoneRef.current) return;
        const currentIds = new Set((financeState.realExpenses as any[]).map((e: any) => e.id));
        let changed = false;
        prevExpenseIdsRef.current.forEach(id => {
            if (!currentIds.has(id)) { pendingDeletionsRef.current.add(id); changed = true; }
        });
        if (changed) persistPendingDeletes(pendingDeletionsRef.current);
        prevExpenseIdsRef.current = currentIds;
    }, [financeState.realExpenses]);

    const saveToCloud = useCallback(async () => {
        if (!user) return;
        isSavingRef.current = true;
        hasPendingChangesRef.current = false;
        setStatus('saving');
        try {
            const { habits, manifesto } = useHabitStore.getState();
            const { config, events, overrides, realExpenses, savingsGoals, savingsEntries, categoryBudgets } = useFinanceStore.getState();

            // Fetch remote expenses BEFORE saving to preserve any iOS Shortcut additions
            // that may have been added to Supabase without going through local state
            const { data: remoteData } = await supabase
                .from('user_data')
                .select('finances_data')
                .eq('id', user.id)
                .single();

            const remoteExpenses: any[] = remoteData?.finances_data?.realExpenses ?? [];
            const localIds = new Set((realExpenses as any[]).map((e: any) => e.id));
            const pendingDeletes = pendingDeletionsRef.current;

            // Merge: keep all local (edits/deletes take priority) + add remote-only iOS expenses
            const mergedExpenses = [
                ...(realExpenses as any[]),
                ...remoteExpenses.filter((e: any) => !localIds.has(e.id) && !pendingDeletes.has(e.id)),
            ];

            const nowIso = new Date().toISOString();
            const { error } = await supabase
                .from('user_data')
                .update({
                    habits_data: { habits, manifesto },
                    finances_data: { config, events, overrides, realExpenses: mergedExpenses, savingsGoals, savingsEntries, categoryBudgets },
                    updated_at: nowIso
                })
                .eq('id', user.id);
            if (error) throw error;

            // If iOS shortcut added expenses that weren't in local state, update local store
            if (mergedExpenses.length !== (realExpenses as any[]).length) {
                useFinanceStore.setState({ realExpenses: mergedExpenses });
            }

            // Mark local as synced up to this remote timestamp (last-write-wins anchor)
            try { localStorage.setItem(LOCAL_EDIT_KEY, String(Date.parse(nowIso))); } catch { /* ignore */ }

            setStatus('synced');
            lastSavedRef.current = Date.now();
            // The cloud copy we just wrote already excludes the tombstoned ids,
            // so it's safe to forget them now.
            pendingDeletionsRef.current.clear();
            clearPendingDeletes();
        } catch (e) {
            console.error('Save error:', e);
            setStatus('error');
        } finally {
            isSavingRef.current = false;
        }
    }, [user]);

    const loadData = useCallback(async (force = false) => {
        if (!user) return;
        setStatus('saving');
        try {
            const { data, error } = await supabase
                .from('user_data')
                .select('habits_data, finances_data, updated_at')
                .eq('id', user.id)
                .single();
            if (error && error.code !== 'PGRST116') {
                console.error('Error loading data:', error);
                setStatus('error');
                return;
            }
            if (data) {
                if (data.habits_data && Object.keys(data.habits_data).length > 0) {
                    useHabitStore.setState(data.habits_data);
                }
                if (data.finances_data && Object.keys(data.finances_data).length > 0) {
                    const pendingDeletes = pendingDeletionsRef.current;
                    const remote = data.finances_data;
                    const local = useFinanceStore.getState();

                    // LAST-WRITE-WINS via timestamps (both stamps are client-generated,
                    // so no clock-skew on the same device):
                    //   remoteUpdatedAt = when the cloud copy was last written
                    //   localEditAt     = when this device last changed finance data
                    const remoteUpdatedAt = data.updated_at ? Date.parse(data.updated_at) : 0;
                    const localEditAt = Number(localStorage.getItem(LOCAL_EDIT_KEY) || '0');

                    // Server-driven force-adopt: if the cloud copy carries a
                    // `_forceAdoptAt` newer than what this device has already applied,
                    // adopt it unconditionally (once). Lets a server-side data fix
                    // break a sync deadlock WITHOUT any user action.
                    const remoteForceAt = Number((remote as any)._forceAdoptAt || 0);
                    const lastForceApplied = Number(localStorage.getItem(FORCE_APPLIED_KEY) || '0');
                    const mustForce = remoteForceAt > lastForceApplied;

                    const doForce = force || mustForce;
                    // Local is "ahead" if it has unsynced edits newer than the cloud copy.
                    // A forced pull overrides this and adopts the cloud copy unconditionally.
                    const localAhead = !doForce && (hasPendingChangesRef.current || localEditAt > remoteUpdatedAt);

                    if (doForce) {
                        // Forced pull: discard any local-ahead state and tombstones,
                        // adopt the cloud copy verbatim. Used to break a sync deadlock.
                        hasPendingChangesRef.current = false;
                        pendingDeletionsRef.current.clear();
                        clearPendingDeletes();
                        if (mustForce) {
                            try { localStorage.setItem(FORCE_APPLIED_KEY, String(remoteForceAt)); } catch { /* ignore */ }
                        }
                    }

                    if (localAhead) {
                        // Don't clobber fresh local edits. Only pull in remote-only
                        // realExpenses (e.g. iOS Shortcut additions) we don't already have.
                        const localExpenseIds = new Set((local.realExpenses as any[]).map((e: any) => e.id));
                        const extraRemote = (remote.realExpenses || []).filter(
                            (e: any) => !localExpenseIds.has(e.id) && !pendingDeletes.has(e.id)
                        );
                        if (extraRemote.length > 0) {
                            useFinanceStore.setState({
                                realExpenses: [...(local.realExpenses as any[]), ...extraRemote],
                            });
                        }
                        // Make sure our newer local state eventually reaches the cloud.
                        hasPendingChangesRef.current = true;
                    } else {
                        // Cloud copy is authoritative (newer or equal). Adopt it,
                        // honouring any pending local deletions of realExpenses.
                        // Strip the sync-only `_forceAdoptAt` marker so it never lands in the store.
                        const { _forceAdoptAt, ...remoteClean } = remote as any;
                        let financesData: any = remoteClean;
                        if (pendingDeletes.size > 0 && Array.isArray(remoteClean.realExpenses)) {
                            financesData = {
                                ...remoteClean,
                                realExpenses: remoteClean.realExpenses.filter((e: any) => !pendingDeletes.has(e.id)),
                            };
                        }
                        useFinanceStore.setState(financesData);
                        try { localStorage.setItem(LOCAL_EDIT_KEY, String(remoteUpdatedAt)); } catch { /* ignore */ }
                    }
                }
                setStatus('synced');
            } else {
                await supabase.from('user_data').insert({ id: user.id });
                setStatus('synced');
            }
            initialLoadDoneRef.current = true;
        } catch (e) {
            console.error(e);
            setStatus('error');
        }
    }, [user]);

    useEffect(() => {
        if (!user) return;
        loadData();
    }, [user, loadData]);

    useEffect(() => {
        if (!user) return;
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible' && !isSavingRef.current) loadData();
        };
        const handleFocus = () => {
            if (!isSavingRef.current) loadData();
        };
        document.addEventListener('visibilitychange', handleVisibilityChange);
        window.addEventListener('focus', handleFocus);
        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            window.removeEventListener('focus', handleFocus);
        };
    }, [user, loadData]);

    useEffect(() => {
        if (!user) return;
        if (!initialLoadDoneRef.current) return;
        hasPendingChangesRef.current = true;
        // Stamp this edit so a reload/focus before the cloud save still wins (LWW).
        try { localStorage.setItem(LOCAL_EDIT_KEY, String(Date.now())); } catch { /* ignore */ }
        if (isSavingRef.current) return;
        const timeout = setTimeout(saveToCloud, 2000);
        return () => clearTimeout(timeout);
    }, [
        user, saveToCloud,
        habitsState.habits, habitsState.manifesto,
        financeState.config, financeState.events, financeState.overrides,
        financeState.realExpenses, financeState.savingsGoals,
        financeState.savingsEntries, financeState.categoryBudgets,
    ]);

    useEffect(() => {
        if (!user) return;
        const handleBeforeUnload = () => {
            if (hasPendingChangesRef.current) saveToCloud();
        };
        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }, [user, saveToCloud]);

    if (!user) return null;

    return (
        <div
            className="fixed bottom-4 right-4 z-50 flex items-center gap-2 bg-black/80 backdrop-blur border border-white/10 px-3 py-1.5 rounded-full text-xs font-mono select-none transition-all duration-200"
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            {status === 'saving' && (
                <>
                    <Loader2 size={10} className="animate-spin text-cyan-400" />
                    <span className="text-neutral-400">Syncing...</span>
                </>
            )}
            {status === 'synced' && (
                <>
                    <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_5px_#10b981]" />
                    <span className="text-neutral-400">Synced</span>
                </>
            )}
            {status === 'error' && (
                <>
                    <CloudOff size={10} className="text-red-500" />
                    <span className="text-red-400">Offline</span>
                </>
            )}
            {status !== 'saving' && (
                <button
                    onClick={() => loadData(true)}
                    className="pointer-events-auto ml-1 flex items-center gap-1 text-neutral-400 hover:text-cyan-400 transition-colors"
                    title="Forzar bajar de la nube (descarta cambios locales sin sincronizar)"
                >
                    <RefreshCw size={11} />
                    {isHovered && <span className="text-[10px]">Bajar de nube</span>}
                </button>
            )}
        </div>
    );
}
