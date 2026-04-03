import { useEffect, useRef, useState, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { useHabitStore } from '../habits/useHabitStore';
import { useFinanceStore } from '../finance/useFinanceStore';
import { Loader2, CloudOff, RefreshCw } from 'lucide-react';

export function SupabaseSync() {
    const { user } = useAuth();
    const [status, setStatus] = useState<'idle' | 'saving' | 'synced' | 'error'>('idle');
    const [isHovered, setIsHovered] = useState(false);
    const lastSavedRef = useRef<number>(Date.now());
    const isSavingRef = useRef(false);
    const initialLoadDoneRef = useRef(false);
    const hasPendingChangesRef = useRef(false);
    const pendingDeletionsRef = useRef<Set<string>>(new Set());
    const prevExpenseIdsRef = useRef<Set<string>>(new Set());

    const habitsState = useHabitStore();
    const financeState = useFinanceStore();

    useEffect(() => {
        if (!initialLoadDoneRef.current) return;
        const currentIds = new Set((financeState.realExpenses as any[]).map((e: any) => e.id));
        prevExpenseIdsRef.current.forEach(id => {
            if (!currentIds.has(id)) pendingDeletionsRef.current.add(id);
        });
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
            const { error } = await supabase
                .from('user_data')
                .update({
                    habits_data: { habits, manifesto },
                    finances_data: { config, events, overrides, realExpenses, savingsGoals, savingsEntries, categoryBudgets },
                    updated_at: new Date().toISOString()
                })
                .eq('id', user.id);
            if (error) throw error;
            setStatus('synced');
            lastSavedRef.current = Date.now();
            pendingDeletionsRef.current.clear();
        } catch (e) {
            console.error('Save error:', e);
            setStatus('error');
        } finally {
            isSavingRef.current = false;
        }
    }, [user]);

    const loadData = useCallback(async () => {
        if (!user) return;
        if (hasPendingChangesRef.current) return;
        setStatus('saving');
        try {
            const { data, error } = await supabase
                .from('user_data')
                .select('habits_data, finances_data')
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
                    let financesData = data.finances_data;
                    if (pendingDeletes.size > 0 && Array.isArray(financesData.realExpenses)) {
                        financesData = {
                            ...financesData,
                            realExpenses: financesData.realExpenses.filter(
                                (e: any) => !pendingDeletes.has(e.id)
                            )
                        };
                    }
                    useFinanceStore.setState(financesData);
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
            {isHovered && status !== 'saving' && (
                <button
                    onClick={loadData}
                    className="pointer-events-auto ml-1 text-neutral-500 hover:text-cyan-400 transition-colors"
                    title="Sincronizar ahora"
                >
                    <RefreshCw size={10} />
                </button>
            )}
        </div>
    );
}
