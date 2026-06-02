// Habits
export type IdentityAxis = 'physical' | 'emotional' | 'vision' | 'standards' | 'growth' | 'environment';
export type HabitType = 'boolean' | 'numeric';

export interface HabitLog {
    date: string; // ISO YYYY-MM-DD
    completed: boolean;
    value?: number;
    status?: 'completed' | 'rest' | 'emergency';
    pauseReason?: string; // reason when status is 'rest' or 'emergency'
}

export interface Habit {
    id: string;
    title: string;
    subtitle?: string; // "Estás construyendo la base..."
    type: HabitType;
    goal: number; // For numeric, e.g., 100
    unit?: string; // e.g., "min", "km"
    color: string;
    icon?: string; // emoji or icon name
    logs: Record<string, HabitLog>; // Map date to log for O(1) access
    archived?: boolean;
    identityAxis?: IdentityAxis; // Which identity axis this habit serves
    isDemo?: boolean; // Starter demo habits shown to new users
}

// Finance
export interface FinancialConfig {
    initialBalance: number;
    monthlyFixedBudget: number; // Global daily plan derived from this? Or this is the "Expense" baseline? Prompt says "presupuesto mensual fijo (gasto diario global)"
    cycleStartDate: number; // Day of month, e.g., 1
    monthlyIncomeGoal?: number;
    budgetChanges?: Record<string, number>; // "YYYY-MM": monthlyBudgetAmount
    cycleStartYearMonth?: string; // "YYYY-MM" format
    currency?: string; // ISO 4217, e.g. "EUR", "MXN", "USD"
    currencyLocale?: string; // BCP 47, e.g. "es-MX", "de-DE"
}

export interface FinancialEvent {
    id: string;
    date: string; // YYYY-MM-DD
    type: 'income' | 'expense';
    amount: number;
    category: string;
    description?: string;
    isRecurring?: boolean;
}

export interface DailyOverride {
    date: string; // YYYY-MM-DD
    budget?: number; // Override daily budget
}

export interface DailyRealExpense {
    id: string;
    date: string;
    amount: number;
    category: string;
    note?: string;
}

// Tasks — "do it." system
export type TaskPriority = null | '!' | '!!';

export interface TaskGroup {
    id: string;
    name: string;
    color: string;  // hex
}

export interface Task {
    id: string;
    text: string;
    priority: TaskPriority;
    deadline: string | null;  // 'YYYY-MM-DD'
    groupId: string | null;
    completed: boolean;
    completedAt: number | null;
    createdAt: number;
}

export interface Note {
    id: string;
    title: string;
    content: string;
    createdAt: number;
    updatedAt: number;
}

// Shared
export type Theme = 'dark' | 'light';
export type Language = 'es' | 'en' | 'pt';
