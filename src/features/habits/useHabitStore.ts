import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Habit } from '../../types';
import { generateId } from '../../utils/id';

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
    markHabitSkip: (habitId: string, date: string, status: 'rest' | 'emergency') => void;
    getCongruence: (date: string) => number; // 0-100
}

// --- IDENTITY MANIFESTO TYPES ---
export interface IdentityManifesto {
    // New unified identity statement (Step 1 of redesigned wizard)
    identityStatement?: string;
    // Kept for backward compat with old wizard data
    identities: {
        personal: string;
        professional: string;
        financial: string;
    };
    goals: {
        oneYear: string;
        ninetyDays: string;
        antiGoals: string;
        sacrifice?: string;    // What I'll give up
        toxicHabit?: string;   // What I won't tolerate
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
                    subtitle: 'Ejemplo: hábito físico diario',
                    type: 'boolean' as const,
                    goal: 1,
                    color: '#fbbf24',
                    icon: '💪',
                    logs: {},
                    identityAxis: 'physical' as const,
                    isDemo: true,
                },
                {
                    id: '2',
                    title: 'ALIMENTACIÓN IDEAL',
                    subtitle: 'Ejemplo: hábito de salud',
                    type: 'boolean' as const,
                    goal: 1,
                    color: '#34d399',
                    icon: '⭐',
                    logs: {},
                    identityAxis: 'physical' as const,
                    isDemo: true,
                },
                {
                    id: '3',
                    title: 'LECTURA',
                    subtitle: 'Ejemplo: hábito de crecimiento',
                    type: 'numeric' as const,
                    goal: 30,
                    unit: 'min',
                    color: '#60a5fa',
                    icon: '📚',
                    logs: {},
                    identityAxis: 'growth' as const,
                    isDemo: true,
                }
            ],
            addHabit: (habitData: Omit<Habit, 'id' | 'logs'>) => {
                const newHabit: Habit = {
                    ...habitData,
                    id: generateId(),
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
                        habit.logs = { ...habit.logs, [date]: { date, completed: true } };
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
                        habit.logs = { ...habit.logs, [date]: { date, completed: isCompleted, value } };
                    }

                    habits[habitIndex] = { ...habit };
                    return { habits };
                });
            },
            markHabitSkip: (habitId, date, status) => {
                set((state) => {
                    const habits = [...state.habits];
                    const habitIndex = habits.findIndex((h) => h.id === habitId);
                    if (habitIndex === -1) return {};

                    const habit = habits[habitIndex];
                    habit.logs = { ...habit.logs, [date]: { date, completed: false, status } };

                    habits[habitIndex] = { ...habit };
                    return { habits };
                });
            },
            getCongruence: (date) => {
                const { habits } = get();
                if (habits.length === 0) return 0;

                let completedCount = 0;
                let applicableHabitsCount = 0;

                habits.forEach(h => {
                    const log = h.logs[date];
                    if (log?.status === 'rest' || log?.status === 'emergency') {
                        // Do not count this habit towards the total for the day
                        return;
                    }
                    applicableHabitsCount++;
                    if (log?.completed) completedCount++;
                });

                if (applicableHabitsCount === 0) return 100; // or 0, depending on preference. 100 means a full rest day is "perfect" congruence.
                return Math.round((completedCount / applicableHabitsCount) * 100);
            }
        }),
        {
            name: 'lifeos-habits-storage',
        }
    )
);
