import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { useHabitStore } from '../habits/useHabitStore';
import { useFinanceStore } from '../finance/useFinanceStore';
import { Loader2, CloudOff } from 'lucide-react';

export function SupabaseSync() {
    const { user } = useAuth();
    const [status, setStatus] = useState<'idle' | 'saving' | 'synced' | 'error'>('idle');
    const lastSavedRef = useRef<number>(Date.now());

    // Store access
    const habitsState = useHabitStore();
    const financeState = useFinanceStore();

    // Load data on mount/login
    useEffect(() => {
        if (!user) return;

        const loadData = async () => {
            setStatus('saving'); // Indicate loading
            try {
                const { data, error } = await supabase
                    .from('user_data')
                    .select('habits_data, finances_data')
                    .eq('id', user.id)
                    .single();

                if (error && error.code !== 'PGRST116') { // PGRST116 = Row not found
                    console.error('Error loading data:', error);
                    setStatus('error');
                    return;
                }

                if (data) {
                    // Hydrate stores if remote data exists
                    if (data.habits_data && Object.keys(data.habits_data).length > 0) {
                        useHabitStore.setState(data.habits_data);
                    }
                    if (data.finances_data && Object.keys(data.finances_data).length > 0) {
                        useFinanceStore.setState(data.finances_data);
                    }
                    setStatus('synced');
                } else {
                    // No remote data, create initial row
                    await supabase.from('user_data').insert({ id: user.id });
                    setStatus('synced');
                }
            } catch (e) {
                console.error(e);
                setStatus('error');
            }
        };

        loadData();
    }, [user]);

    // Debounced Save
    useEffect(() => {
        if (!user) return;
        if (status === 'saving') return; // Don't trigger save if loading

        const saveToCloud = async () => {
            setStatus('saving');
            try {
                // Prepare payloads (strip actions, keep state)
                // Zustand persist usually keeps state in local storage, we just grab current state
                const { habits, manifesto } = useHabitStore.getState();
                const { config, events, overrides, realExpenses, savingsGoals, savingsEntries } = useFinanceStore.getState();

                const habitsPayload = { habits, manifesto };
                const financesPayload = { config, events, overrides, realExpenses, savingsGoals, savingsEntries };

                const { error } = await supabase
                    .from('user_data')
                    .update({
                        habits_data: habitsPayload,
                        finances_data: financesPayload,
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', user.id);

                if (error) throw error;

                setStatus('synced');
                lastSavedRef.current = Date.now();
            } catch (e) {
                console.error('Save error:', e);
                setStatus('error');
            }
        };

        const timeout = setTimeout(saveToCloud, 2000); // 2s debounce

        return () => clearTimeout(timeout);
    }, [
        // Dependencies required to trigger save
        habitsState.habits,
        financeState.events,
        financeState.realExpenses
        // Add minimal trigger dependencies to avoid aggressive saving
    ]);

    if (!user) return null;

    return (
        <div className="fixed bottom-4 right-4 z-50 flex items-center gap-2 bg-black/80 backdrop-blur border border-white/10 px-3 py-1.5 rounded-full text-xs font-mono select-none pointer-events-none">
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
        </div>
    );
}
