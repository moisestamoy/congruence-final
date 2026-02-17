import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Habit } from '../../types';

interface HabitsState {
    habits: Habit[];
    manifesto?: IdentityManifesto;
    setManifesto: (manifesto: IdentityManifesto) => void;

    // Legacy (to be removed or kept for backward compat if needed, but better replace)
    identity?: any;
    setIdentity: (identity: any) => void;

    addHabit: (habit: Omit<Habit, 'id' | 'logs'>) => void;
    updateHabit: (id: string, updates: Partial<Omit<Habit, 'id' | 'logs'>>) => void;
    toggleHabit: (habitId: string, date: string) => void;
    setHabitValue: (habitId: string, date: string, value: number) => void;
    removeHabit: (id: string) => void;
    getCongruence: (date: string) => number; // 0-100
}

// --- IDENTITY MANIFESTO TYPES ---
export interface IdentityManifesto {
    identities: {
        personal: string;
        professional: string;
        financial: string;
    };
    goals: {
        oneYear: string;
        ninetyDays: string;
        antiGoals: string;
    };
    ignoranceDebt: {
        missingSkill: string;
        investmentAction: string;
    };
    executionProtocol: {
        planA_Action: string;
        planA_Volume: string;
        planB_Minimum: string;
    };
}

export const useHabitStore = create<HabitsState>()(
    persist(
        (set, get) => ({
            habits: [
                {
                    id: '1',
                    title: 'ENTRENAR',
                    subtitle: '1 días de racha',
                    type: 'boolean',
                    goal: 1,
                    color: '#fbbf24', // Amber-400
                    icon: '💪',
                    logs: {},
                },
                {
                    id: '2',
                    title: 'ALIMENTACION IDEAL',
                    subtitle: '1 días de racha',
                    type: 'boolean',
                    goal: 1,
                    color: '#34d399', // Emerald-400
                    icon: '⭐',
                    logs: {},
                },
                // Adding a numeric one for testing
                {
                    id: '3',
                    title: 'Reading',
                    type: 'numeric',
                    goal: 30, // mins
                    unit: 'min',
                    color: '#60a5fa', // Blue-400
                    icon: '📚',
                    logs: {},
                }
            ],
            addHabit: (habitData: Omit<Habit, 'id' | 'logs'>) => {
                const newHabit: Habit = {
                    ...habitData,
                    id: crypto.randomUUID(),
                    logs: {},
                };
                set((state) => ({ habits: [...state.habits, newHabit] }));
            },
            updateHabit: (id, updates) => {
                set((state) => ({
                    habits: state.habits.map((h) =>
                        h.id === id ? { ...h, ...updates } : h
                    )
                }));
            },
            setIdentity: (identity) => {
                set({ identity });
            },
            setManifesto: (manifesto) => {
                set({ manifesto });
            },
            removeHabit: (id) => {
                set((state) => ({ habits: state.habits.filter((h) => h.id !== id) }));
            },
            toggleHabit: (habitId, date) => {
                set((state) => {
                    const habits = [...state.habits];
                    const habitIndex = habits.findIndex((h) => h.id === habitId);
                    if (habitIndex === -1) return {};

                    const habit = habits[habitIndex];
                    const currentLog = habit.logs[date];

                    // Toggle logic
                    if (currentLog?.completed) {
                        const { [date]: _, ...rest } = habit.logs; // remove log
                        habit.logs = rest;
                    } else {
                        habit.logs[date] = { date, completed: true };
                    }

                    habits[habitIndex] = { ...habit };
                    return { habits };
                });
            },
            setHabitValue: (habitId, date, value) => {
                set((state) => {
                    const habits = [...state.habits];
                    const habitIndex = habits.findIndex((h) => h.id === habitId);
                    if (habitIndex === -1) return {};

                    const habit = habits[habitIndex];
                    const isCompleted = value >= habit.goal;

                    if (value <= 0) {
                        const { [date]: _, ...rest } = habit.logs;
                        habit.logs = rest;
                    } else {
                        habit.logs[date] = { date, completed: isCompleted, value };
                    }

                    habits[habitIndex] = { ...habit };
                    return { habits };
                });
            },
            getCongruence: (date) => {
                const { habits } = get();
                if (habits.length === 0) return 0;

                let completedCount = 0;
                habits.forEach(h => {
                    if (h.logs[date]?.completed) completedCount++;
                });

                return Math.round((completedCount / habits.length) * 100);
            }
        }),
        {
            name: 'lifeos-habits-storage',
        }
    )
);
