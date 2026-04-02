import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { FinancialConfig, FinancialEvent, DailyOverride, DailyRealExpense } from '../../types';
import { generateId } from '../../utils/id';

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
    updateTransaction: (id: string, source: 'event' | 'realExpense', updates: { amount?: number; category?: string; date?: string; note?: string; type?: 'income' | 'expense' }) => void;
    deleteTransaction: (id: string, source: 'event' | 'realExpense') => void;
    categoryBudgets: Record<string, number>;
    setCategoryBudget: (category: string, amount: number) => void;
    resetAll: () => void;
    
    // Selective Restart
    setBudgetFromMonth: (yearMonth: string, totalAmount: number, clearFutureData?: boolean) => void;
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
                    category: '💰 Salario',
                    isRecurring: true
                },
                {
                    id: '2',
                    date: '2026-01-08',
                    type: 'expense',
                    amount: 850,
                    category: '🏠 Alquiler',
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

            resetAll: () => set({
                config: {
                    initialBalance: 0,
                    monthlyFixedBudget: 1500,
                    cycleStartDate: 1,
                    monthlyIncomeGoal: 3000,
                    budgetChanges: {}
                },
                events: [],
                overrides: [],
                realExpenses: [],
                savingsGoals: {
                    annual: 20000,
                    monthly: 1500
                },
                savingsEntries: [],
                categoryBudgets: {}
            }),

            setBudgetFromMonth: (yearMonth: string, totalAmount: number, clearFutureData?: boolean) => set((state) => {
                const newConfig = { 
                    ...state.config, 
                    budgetChanges: {
                        ...(state.config.budgetChanges || {}),
                        [yearMonth]: totalAmount
                    }
                };

                // If they want to also update the master fallback (optional):
                // We'll leave monthlyFixedBudget as the "first ever budget" unless they want to fully overwrite.
                // Actually, best to update monthlyFixedBudget if there was no budgetChanges before.
                if (Object.keys(newConfig.budgetChanges!).length === 1) {
                    newConfig.monthlyFixedBudget = totalAmount;
                }

                if (clearFutureData) {
                    // yearMonth format is "YYYY-MM"
                    const filterDate = `${yearMonth}-01`;
                    return {
                        config: newConfig,
                        overrides: state.overrides.filter(o => o.date < filterDate),
                        realExpenses: state.realExpenses.filter(e => e.date < filterDate),
                        // Only clear non-recurring events? Safest is to just clear overrides and realExpenses, 
                        // Events might be Rent which they still want. Leaving events alone is safer.
                    };
                }

                return { config: newConfig };
            }),

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
                        id: generateId(),
                        date,
                        type,
                        amount,
                        category: type === 'income' ? '🪙 Otros ingresos' : '📦 Otros', // Generic for cell edit
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
                                    id: generateId(),
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
                                    id: generateId(),
                                    date,
                                    amount,
                                    category: category || '📦 Otros'
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
                            id: generateId(),
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
                    const month = date.getMonth() + 1; // 1-indexed for YYYY-MM
                    const yearMonth = `${year}-${month.toString().padStart(2, '0')}`;

                    // Update Global Config AND budgetChanges so it's a historical record
                    const newConfig = { 
                        ...state.config, 
                        monthlyFixedBudget: totalAmount,
                        budgetChanges: {
                            ...(state.config.budgetChanges || {}),
                            [yearMonth]: totalAmount
                        }
                    };

                    // Clear overrides for THIS month
                    const filteredOverrides = state.overrides.filter(o => {
                        const d = new Date(o.date);
                        return d.getFullYear() !== year || d.getMonth() !== (month - 1);
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
                        id: generateId(),
                        date,
                        amount,
                        category: '📦 Otros'
                    };
                    return { realExpenses: [...filtered, newExpense] };
                }),

            updateTransaction: (id, source, updates) =>
                set((state) => {
                    if (source === 'event') {
                        return {
                            events: state.events.map(e => e.id === id ? { ...e, ...updates } : e)
                        };
                    } else {
                        return {
                            realExpenses: state.realExpenses.map(e => e.id === id ? { ...e, ...updates } : e)
                        };
                    }
                }),

            deleteTransaction: (id, source) =>
                set((state) => {
                    if (source === 'event') {
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
