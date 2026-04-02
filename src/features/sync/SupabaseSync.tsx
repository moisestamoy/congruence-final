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

    // Store access
    const habitsState = useHabitStore();
    const financeState = useFinanceStore();

    // ── Pull from Supabase → hydrate stores ──────────────────────────────
    const loadData = useCallback(async () => {
        if (!user) return;
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
                    useFinanceStore.setState(data.finances_data);
                }
                setStatus('synced');
            } else {
                await supabase.from('user_data').insert({ id: user.id });
                setStatus('synced');
            }
        } catch (e) {
            console.error(e);
            setStatus('error');
        }
    }, [user]);

    // Load on mount / login
    useEffect(() => {
        if (!user) return;
        loadData();
    }, [user, loadData]);

    // ── Sync on window focus / tab visibility change ──────────────────────
    // This is the key feature: when user comes back from Apple Pay / iPhone Shortcut,
    // the app automatically pulls the new expense from Supabase.
    useEffect(() => {
        if (!user) return;

        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible' && !isSavingRef.current) {
                loadData();
            }
        };

        const handleFocus = () => {
            if (!isSavingRef.current) {
                loadData();
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        window.addEventListener('focus', handleFocus);

        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            window.removeEventListener('focus', handleFocus);
        };
    }, [user, loadData]);

    // ── Debounced save (local changes → Supabase) ─────────────────────────
    useEffect(() => {
        if (!user) return;
        if (isSavingRef.current) return;

        const saveToCloud = async () => {
            isSavingRef.current = true;
            setStatus('saving');
            try {
                const { habits, manifesto } = useHabitStore.getState();
                const { config, events, overrides, realExpenses, savingsGoals, savingsEntries } = useFinanceStore.getState();

                const { error } = await supabase
                    .from('user_data')
                    .update({
                        habits_data: { habits, manifesto },
                        finances_data: { config, events, overrides, realExpenses, savingsGoals, savingsEntries },
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', user.id);

                if (error) throw error;
                setStatus('synced');
                lastSavedRef.current = Date.now();
            } catch (e) {
                console.error('Save error:', e);
                setStatus('error');
            } finally {
                isSavingRef.current = false;
            }
        };

        const timeout = setTimeout(saveToCloud, 2000);
        return () => clearTimeout(timeout);
    }, [
        habitsState.habits,
        financeState.events,
        financeState.realExpenses,
    ]);

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

            {/* Manual sync button — visible on hover */}
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
