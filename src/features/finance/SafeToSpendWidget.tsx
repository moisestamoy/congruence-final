
import { ShieldCheck, AlertTriangle } from 'lucide-react';
import { cn } from '../../utils/cn';

interface SafeToSpendProps {
    dailyBaseBudget: number; // The planned daily (e.g. 10€)
    projectedEndBalance: number;
    savingsGoal: number;
    daysRemaining: number;
}

export function SafeToSpendWidget({ dailyBaseBudget, projectedEndBalance, savingsGoal, daysRemaining }: SafeToSpendProps) {
    if (daysRemaining <= 0) return null;

    // Logic:
    // We are currently projected to end with `projectedEndBalance`.
    // We WANT to end with `savingsGoal`.
    // The difference is our "Surplus" or "Deficit" relative to the goal.
    // This difference, spread over remaining days, validates our Safe Spend.

    // Note: projectedEndBalance ALREADY assumes we spend `dailyBaseBudget` every remaining day.
    const surplus = projectedEndBalance - savingsGoal;
    const dailyAdjustment = surplus / daysRemaining;
    const safeDaily = Math.floor(dailyBaseBudget + dailyAdjustment);

    const isHealthy = safeDaily > 0;
    const isAbundant = safeDaily >= dailyBaseBudget;

    return (
        <div className="relative overflow-hidden rounded-2xl bg-[#0a0a0a] border border-white/10 p-3 shadow-2xl group h-full">
            {/* Background Effects */}
            <div className={cn("absolute inset-0 bg-gradient-to-br opacity-5 transition-colors duration-500", isHealthy ? "from-emerald-500 to-cyan-500" : "from-rose-500 to-orange-500")} />

            <div className="relative z-10 flex flex-col justify-between h-full gap-2">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className={cn("p-1 rounded-full", isHealthy ? "bg-emerald-500/20 text-emerald-400" : "bg-rose-500/20 text-rose-400")}>
                            {isHealthy ? <ShieldCheck size={14} /> : <AlertTriangle size={14} />}
                        </div>
                        <span className="text-[9px] font-bold text-neutral-400 uppercase tracking-widest">Gasto Seguro Hoy</span>
                    </div>
                </div>

                <div className="flex flex-col">
                    {/* Main Amount */}
                    <div className="flex items-baseline gap-1">
                        <span className={cn("text-2xl font-bold font-mono tracking-tighter transition-colors duration-500", isHealthy ? "text-white" : "text-rose-400")}>
                            {safeDaily}€
                        </span>
                        <span className="text-[10px] font-medium text-neutral-500">/ hoy</span>
                    </div>

                    {/* Context Message */}
                    <p className="text-[9px] text-neutral-500 mt-0.5 font-medium leading-relaxed max-w-[200px]">
                        {isHealthy
                            ? (isAbundant
                                ? "Excelente. Superávit."
                                : "Ajustado. Cumples meta.")
                            : "¡Cuidado! Hay déficit."
                        }
                    </p>
                </div>

                {/* Progress/Goal Context */}
                <div className="mt-1 pt-2 border-t border-white/5 flex justify-between items-center text-[9px] uppercase font-bold text-neutral-500 tracking-wider">
                    <span>Meta: {savingsGoal}€</span>
                    <span className={cn(surplus >= 0 ? "text-emerald-500" : "text-rose-500")}>
                        {surplus >= 0 ? '+' : ''}{Math.round(surplus)}€
                    </span>
                </div>
            </div>
        </div>
    );
}
