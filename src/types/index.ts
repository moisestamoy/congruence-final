// Habits
export type HabitType = 'boolean' | 'numeric';

export interface HabitLog {
    date: string; // ISO YYYY-MM-DD
    completed: boolean;
    value?: number;
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
}

// Finance
export interface FinancialConfig {
    initialBalance: number;
    monthlyFixedBudget: number; // Global daily plan derived from this? Or this is the "Expense" baseline? Prompt says "presupuesto mensual fijo (gasto diario global)"
    cycleStartDate: number; // Day of month, e.g., 1
    monthlyIncomeGoal?: number;
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

// Tasks
export type TaskPriority = 'high' | 'medium' | 'low';
export type TaskCategory = 'Personal' | 'Work' | 'Finance' | 'Habits' | 'LongTerm';

export interface Task {
    id: string;
    title: string;
    category: TaskCategory;
    priority: TaskPriority;
    dueDate?: string;
    completed: boolean;
    tags: string[];
    icon?: string;
    color?: string;
}

// Shared
export type Theme = 'dark' | 'light';
export type Language = 'es' | 'en' | 'pt';
