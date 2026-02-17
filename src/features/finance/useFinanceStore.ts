import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { FinancialConfig, FinancialEvent, DailyOverride, DailyRealExpense } from '../../types';

interface FinanceState {
    config: FinancialConfig;
    events: FinancialEvent[];
    overrides: DailyOverride[];
    realExpenses: DailyRealExpense[];

    // Savings Feature
    savingsGoals: {
        annual: number;
        monthly: number;
    };
    savingsEntries: {
        id: string;
        date: string;
        amount: number;
        note?: string;
    }[];

    updateConfig: (config: Partial<FinancialConfig>) => void;
    addEvent: (event: FinancialEvent) => void;
    deleteEvent: (id: string) => void;
    setDailyOverride: (override: DailyOverride) => void;
    addRealExpense: (expense: DailyRealExpense) => void;
    upsertEvent: (date: string, type: 'income' | 'expense', amount: number) => void;
    addTransaction: (date: string, type: 'income' | 'expense', amount: number, category: string) => void;

    // Savings Actions
    setSavingsGoal: (type: 'annual' | 'monthly', amount: number) => void;
    addSavingsEntry: (amount: number, note?: string) => void;
    deleteSavingsEntry: (id: string) => void;
    setMonthlyDailyBudget: (date: Date, totalAmount: number) => void;
    setRealDailyExpense: (date: string, amount: number) => void;

    // Edit/Delete support
    updateTransaction: (id: string, type: 'income' | 'expense', updates: { amount?: number; category?: string; date?: string; note?: string }) => void;
    deleteTransaction: (id: string, type: 'income' | 'expense') => void;
    categoryBudgets: Record<string, number>;
    setCategoryBudget: (category: string, amount: number) => void;
}

export const useFinanceStore = create<FinanceState>()(
    persist(
        (set) => ({
            config: {
                initialBalance: 0,
                monthlyFixedBudget: 1500,
                cycleStartDate: 1,
                monthlyIncomeGoal: 3000
            },
            events: [
                // Demo data
                {
                    id: '1',
                    date: '2026-01-05',
                    type: 'income',
                    amount: 5000,
                    category: 'Salary',
                    isRecurring: true
                },
                {
                    id: '2',
                    date: '2026-01-08',
                    type: 'expense',
                    amount: 850,
                    category: 'Rent',
                    isRecurring: true
                }
            ],
            overrides: [],
            realExpenses: [],

            savingsGoals: {
                annual: 20000,
                monthly: 1500
            },
            savingsEntries: [],
            categoryBudgets: {},

            setCategoryBudget: (category, amount) =>
                set((state) => ({
                    categoryBudgets: {
                        ...state.categoryBudgets,
                        [category]: amount
                    }
                })),

            updateConfig: (newConfig) =>
                set((state) => ({ config: { ...state.config, ...newConfig } })),

            addEvent: (event) =>
                set((state) => ({ events: [...state.events, event] })),

            deleteEvent: (id) =>
                set((state) => ({ events: state.events.filter(e => e.id !== id) })),

            setDailyOverride: (override) =>
                set((state) => {
                    const filtered = state.overrides.filter(o => o.date !== override.date);
                    return { overrides: [...filtered, override] };
                }),

            addRealExpense: (expense) =>
                set((state) => ({ realExpenses: [...state.realExpenses, expense] })),

            upsertEvent: (date: string, type: 'income' | 'expense', amount: number) =>
                set((state) => {
                    // Remove existing event of same type/date (simple strategy: single event per type per day for cell edit)
                    const filtered = state.events.filter(e => !(e.date === date && e.type === type));

                    if (amount <= 0) {
                        return { events: filtered };
                    }

                    const newEvent: FinancialEvent = {
                        id: crypto.randomUUID(),
                        date,
                        type,
                        amount,
                        category: type === 'income' ? 'Income' : 'Expense', // Generic for cell edit
                        isRecurring: false
                    };
                    return { events: [...filtered, newEvent] };
                }),

            addTransaction: (date: string, type: 'income' | 'expense', amount: number, category: string) =>
                set((state) => {
                    if (type === 'income') {
                        return {
                            events: [
                                ...state.events,
                                {
                                    id: crypto.randomUUID(),
                                    date,
                                    type,
                                    amount,
                                    category,
                                    isRecurring: false
                                }
                            ]
                        };
                    } else {
                        return {
                            realExpenses: [
                                ...state.realExpenses,
                                {
                                    id: crypto.randomUUID(),
                                    date,
                                    amount,
                                    category: category || 'Variable'
                                }
                            ]
                        };
                    }
                }),

            setSavingsGoal: (type, amount) =>
                set((state) => ({
                    savingsGoals: {
                        ...state.savingsGoals,
                        [type]: amount
                    }
                })),

            addSavingsEntry: (amount, note) =>
                set((state) => ({
                    savingsEntries: [
                        {
                            id: crypto.randomUUID(),
                            date: new Date().toISOString(),
                            amount,
                            note
                        },
                        ...state.savingsEntries
                    ]
                })),

            deleteSavingsEntry: (id) =>
                set((state) => ({
                    savingsEntries: state.savingsEntries.filter(e => e.id !== id)
                })),

            setMonthlyDailyBudget: (date: Date, totalAmount: number) =>
                set((state) => {
                    const year = date.getFullYear();
                    const month = date.getMonth();

                    // 1. Update Global Config (Propagates to future months automatically via Projection Engine)
                    const newConfig = { ...state.config, monthlyFixedBudget: totalAmount };

                    // 2. Clear overrides for THIS month (to allow new config to take precedence)
                    // If we previously "batched" overrides, we need to remove them.
                    const filteredOverrides = state.overrides.filter(o => {
                        const d = new Date(o.date);
                        // Keep overrides that are NOT in the target month
                        return d.getFullYear() !== year || d.getMonth() !== month;
                    });

                    return {
                        config: newConfig,
                        overrides: filteredOverrides
                    };
                }),

            setRealDailyExpense: (date: string, amount: number) =>
                set((state) => {
                    const filtered = state.realExpenses.filter(r => r.date !== date);
                    if (amount <= 0 && amount !== 0) return { realExpenses: filtered }; // Remove if null/undefined? But allow 0?
                    // actually if user deletes text, amount might be 0.
                    // If 0, we should save 0 to override the Plan?
                    // Yes, spending 0 is a valid "Real Expense".
                    // But if they want to "Clear" it to revert to Plan?
                    // Usually empty string -> 0 or undefined.
                    // Let's assume if they type, they mean it.

                    const newExpense: DailyRealExpense = {
                        id: crypto.randomUUID(),
                        date,
                        amount,
                        category: 'Variable'
                    };
                    return { realExpenses: [...filtered, newExpense] };
                }),

            updateTransaction: (id, type, updates) =>
                set((state) => {
                    if (type === 'income') {
                        return {
                            events: state.events.map(e => e.id === id ? { ...e, ...updates } : e)
                        };
                    } else {
                        return {
                            realExpenses: state.realExpenses.map(e => e.id === id ? { ...e, ...updates } : e)
                        };
                    }
                }),

            deleteTransaction: (id, type) =>
                set((state) => {
                    if (type === 'income') {
                        return { events: state.events.filter(e => e.id !== id) };
                    } else {
                        return { realExpenses: state.realExpenses.filter(e => e.id !== id) };
                    }
                })
        }),
        {
            name: 'lifeos-finance-storage',
        }
    )
);
