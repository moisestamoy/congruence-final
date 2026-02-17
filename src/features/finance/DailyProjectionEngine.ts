import { addDays, format, getDaysInMonth } from 'date-fns';
import { FinancialConfig, FinancialEvent, DailyOverride, DailyRealExpense } from '../../types';

export interface DayProjection {
    date: string; // YYYY-MM-DD
    dayName: string; // "Lun", "Mar"
    income: number;
    plannedExpense: number; // From fixed budget or overrides
    realExpense: number; // Actual input
    totalExpense: number; // Real takes precedence? Or additive? Spec says "sustituyen/conviven". Usually Real replaces Plan for that category/day if tracked. 
    // Simplified strategy: Total Expense = Sum(Events) + (RealExpenses > 0 ? RealExpenses : DailyBudget)
    // Actually spec says: "DailyRealExpense... sustituyen/conviven".
    // Let's assume:
    // - "Events" are large one-offs or bills (Rent, Salary).
    // - "DailyBudget" is for variable spend (Food, Fun).
    // - "RealExpense" overrides the "DailyBudget" for that day if present.

    balance: number; // End of day balance
    status: 'solid' | 'caution' | 'risk' | 'critical'; // Based on balance trend
}

export class DailyProjectionEngine {
    /*
     * Generates a projection for a given month/cycle.
     */
    static generateMonthProjection(
        year: number,
        month: number, // 0-indexed
        config: FinancialConfig,
        events: FinancialEvent[],
        overrides: DailyOverride[],
        realExpenses: DailyRealExpense[],
        startBalance: number
    ): DayProjection[] {
        const startDate = new Date(year, month, 1);
        const daysInMonth = getDaysInMonth(startDate);
        const projections: DayProjection[] = [];

        let currentBalance = startBalance;

        // Dynamic Daily Budget: Total Monthly Budget / Days in Month (Rounded Up)
        const dailyBaseBudget = Math.ceil(config.monthlyFixedBudget / daysInMonth);

        // Get real expenses grouped by date
        const realExpensesMap = realExpenses.reduce((acc, curr) => {
            const d = curr.date;
            acc[d] = (acc[d] || 0) + curr.amount;
            return acc;
        }, {} as Record<string, number>);

        // Overrides map
        const overridesMap = overrides.reduce((acc, curr) => {
            acc[curr.date] = curr.budget;
            return acc;
        }, {} as Record<string, number | undefined>);

        for (let i = 0; i < daysInMonth; i++) {
            const currentDate = addDays(startDate, i);
            const dateStr = format(currentDate, 'yyyy-MM-dd');

            // 1. Calculate Incomes & Fixed Expenses (Bills) for this day
            const dayEvents = events.filter(e => e.date === dateStr);
            const income = dayEvents.filter(e => e.type === 'income').reduce((sum, e) => sum + e.amount, 0);
            const fixedExpenses = dayEvents.filter(e => e.type === 'expense').reduce((sum, e) => sum + e.amount, 0);

            // 2. Variable Expense (Plan vs Real)
            // If there's a specific budget override, use it. Else use global daily average (Calculated for this month).
            const plannedVariable = overridesMap[dateStr] ?? dailyBaseBudget;

            // If we have LOGGED real expenses, use them. Otherwise assume we spend the plan? 
            // Usually projections show the Plan until the day passes.
            // If day is in past/today, ideally we use Real if available. 
            // For simplicity: If Real > 0, use Real. Else use Plan.
            const realVariable = realExpensesMap[dateStr] || 0;

            // Effective Variable Expense for Balance Calculation
            // If we have real data, that is the truth. If not, we project the plan.
            const effectiveVariable = realVariable > 0 ? realVariable : plannedVariable;

            const totalOutgoing = fixedExpenses + effectiveVariable;

            currentBalance = currentBalance + income - totalOutgoing;

            // Status logic
            let stat: 'solid' | 'caution' | 'risk' | 'critical' = 'solid';

            if (currentBalance < 0) {
                stat = 'critical';
            } else if (currentBalance < 200) {
                stat = 'risk';
            } else if (currentBalance < 1000) {
                stat = 'caution';
            } else {
                stat = 'solid';
            }

            projections.push({
                date: dateStr,
                dayName: format(currentDate, 'EEE'),
                income,
                plannedExpense: Math.round(plannedVariable), // Ensure display is round
                realExpense: realVariable,
                totalExpense: totalOutgoing,
                balance: currentBalance,
                status: stat
            });
        }

        return projections;
    }
}
