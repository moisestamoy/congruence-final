import { useState } from 'react';
import { format, type Locale } from 'date-fns';
import { cn } from '../../utils/cn';
import { TrendingUp, TrendingDown, Plus, Minus as MinusIcon, AlertCircle, Edit3, Trophy } from 'lucide-react';

interface MetricCardsRowProps {
    totalIncome: number;
    totalExpenses: number;
    netFlow: number;
    projectedEndBalance: number;
    currentBalanceDisplay: number;
    saveCurrentBalance: (value: number) => void;
    savingsGoals: { annual: number; monthly: number };
    currentSaved: number;
    annualGoal: number;
    savingsProgress: number;
    monthsToGoal: number | null;
    goalTargetDate: Date | null;
    fmtCur: (n: number) => string;
    dateLocale: Locale;
}

export function MetricCardsRow({
    totalIncome,
    totalExpenses,
    netFlow,
    projectedEndBalance,
    currentBalanceDisplay,
    saveCurrentBalance,
    savingsGoals,
    currentSaved,
    annualGoal,
    savingsProgress,
    monthsToGoal,
    goalTargetDate,
    fmtCur,
    dateLocale,
}: MetricCardsRowProps) {
    const [editingBalance, setEditingBalance] = useState(false);
    const [draftBalance, setDraftBalance] = useState('');

    if (totalIncome === 0 && totalExpenses === 0) {
        /* Smart empty state */
        return (
            <div className="w-full rounded-2xl border border-white/[0.07] bg-gradient-to-br from-white/[0.04] to-white/[0.01] p-12 flex flex-col items-center justify-center gap-4 text-center">
                <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center mb-2">
                    <TrendingUp size={32} className="text-neutral-600" />
                </div>
                <h3 className="text-xl font-bold text-neutral-300">Sin datos para este período</h3>
                <p className="text-neutral-500 text-sm max-w-md">Registra ingresos y gastos para ver tu realidad financiera. El dashboard te mostrará los números tal como son, sin juicios.</p>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
            {/* Card 1: Saldo proyectado */}
            <div className="rounded-2xl border border-white/[0.07] bg-gradient-to-br from-white/[0.04] to-white/[0.01] p-6 flex flex-col gap-3 hover:border-white/[0.12] transition-colors">
                <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest">Saldo proyectado fin de mes</span>
                    {projectedEndBalance >= 0
                        ? <TrendingUp size={16} className="text-emerald-500" />
                        : <TrendingDown size={16} className="text-rose-500" />
                    }
                </div>
                <div className={cn("text-4xl font-black font-mono tracking-tight", projectedEndBalance >= 0 ? "text-white" : "text-rose-400")}>
                    {fmtCur(projectedEndBalance)}
                </div>
                {/* Saldo inicial editable */}
                <div className="flex items-center justify-between border-t border-white/[0.05] pt-2 mt-auto">
                    <span className="text-[10px] text-neutral-600 uppercase font-bold tracking-widest">Saldo actual</span>
                    {editingBalance ? (
                        <div className="flex items-center gap-1.5">
                            <input
                                autoFocus
                                value={draftBalance}
                                onChange={e => setDraftBalance(e.target.value)}
                                onKeyDown={e => {
                                    if (e.key === 'Enter') {
                                        const val = parseFloat(draftBalance.replace(',', '.'));
                                        if (!isNaN(val)) saveCurrentBalance(val);
                                        setEditingBalance(false);
                                    }
                                    if (e.key === 'Escape') setEditingBalance(false);
                                }}
                                className="w-28 bg-white/10 border border-white/20 rounded-lg px-2 py-1 text-xs font-mono text-white outline-none focus:border-emerald-500/40"
                            />
                            <button
                                onClick={() => {
                                    const val = parseFloat(draftBalance.replace(',', '.'));
                                    if (!isNaN(val)) saveCurrentBalance(val);
                                    setEditingBalance(false);
                                }}
                                className="text-emerald-400 hover:text-emerald-300 transition-colors text-xs font-bold"
                            >✓</button>
                            <button
                                onClick={() => setEditingBalance(false)}
                                className="text-neutral-600 hover:text-neutral-400 transition-colors text-xs"
                            >✕</button>
                        </div>
                    ) : (
                        <button
                            onClick={() => { setDraftBalance(String(currentBalanceDisplay)); setEditingBalance(true); }}
                            className="flex items-center gap-1.5 text-[11px] text-neutral-500 hover:text-white transition-colors group"
                        >
                            <span className="font-mono">{fmtCur(currentBalanceDisplay)}</span>
                            <Edit3 size={10} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                        </button>
                    )}
                </div>
                {savingsGoals?.monthly > 0 && (
                    <div className="flex flex-col gap-1.5 mt-1">
                        <div className="flex justify-between text-[9px] font-bold uppercase tracking-widest">
                            <span className="text-neutral-600">Meta mensual</span>
                            <span className={netFlow >= savingsGoals.monthly ? "text-emerald-400" : "text-neutral-400"}>
                                {fmtCur(Math.max(0, netFlow))} / {fmtCur(savingsGoals.monthly)}
                            </span>
                        </div>
                        <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                            <div
                                className={cn("h-full rounded-full transition-all duration-1000", netFlow >= savingsGoals.monthly ? "bg-emerald-400" : "bg-cyan-500")}
                                style={{ width: `${Math.max(0, Math.min((netFlow / savingsGoals.monthly) * 100, 100))}%` }}
                            />
                        </div>
                    </div>
                )}
            </div>

            {/* Card 2: Flujo neto */}
            <div className="rounded-2xl border border-white/[0.07] bg-gradient-to-br from-white/[0.04] to-white/[0.01] p-6 flex flex-col gap-3 hover:border-white/[0.12] transition-colors">
                <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest">Flujo neto del mes</span>
                    {netFlow >= 0
                        ? <Plus size={16} className="text-emerald-500" />
                        : <MinusIcon size={16} className="text-rose-500" />
                    }
                </div>
                <div className={cn("text-4xl font-black font-mono tracking-tight", netFlow >= 0 ? "text-emerald-400" : "text-rose-400")}>
                    {netFlow >= 0 ? '+' : '-'}{fmtCur(netFlow)}
                </div>
                <div className="flex justify-between text-xs text-neutral-500 mt-1">
                    <span className="flex items-center gap-1"><Plus size={10} className="text-emerald-500" /> {fmtCur(totalIncome)}</span>
                    <span className="flex items-center gap-1"><MinusIcon size={10} className="text-rose-500" /> {fmtCur(totalExpenses)}</span>
                </div>
            </div>

            {/* Card 3: Ritmo de gasto */}
            <div className="rounded-2xl border border-white/[0.07] bg-gradient-to-br from-white/[0.04] to-white/[0.01] p-6 flex flex-col gap-3 hover:border-white/[0.12] transition-colors">
                <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest">Ritmo de gasto vs ingresos</span>
                    {totalIncome > 0 && Math.abs(totalExpenses) / totalIncome > 0.9
                        ? <AlertCircle size={16} className="text-amber-500" />
                        : <TrendingDown size={16} className="text-neutral-500" />
                    }
                </div>
                <div className="text-4xl font-black font-mono tracking-tight text-white">
                    {totalIncome > 0 ? Math.round((Math.abs(totalExpenses) / totalIncome) * 100) : 0}%
                </div>
                <div className="flex flex-col gap-1.5 mt-1">
                    <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                        <div
                            className={cn("h-full rounded-full transition-all duration-1000",
                                totalIncome > 0 && Math.abs(totalExpenses) / totalIncome > 0.9 ? "bg-amber-500" :
                                totalIncome > 0 && Math.abs(totalExpenses) / totalIncome > 0.7 ? "bg-yellow-500" : "bg-emerald-500"
                            )}
                            style={{ width: `${totalIncome > 0 ? Math.min((Math.abs(totalExpenses) / totalIncome) * 100, 100) : 0}%` }}
                        />
                    </div>
                    <span className="text-[9px] text-neutral-600 uppercase tracking-widest">
                        {totalIncome > 0 && Math.abs(totalExpenses) / totalIncome > 0.9 ? 'Gasto elevado respecto a ingresos' : 'Dentro del rango habitual'}
                    </span>
                </div>
            </div>

            {/* Card 4: Velocidad a Meta Anual */}
            <div className="rounded-2xl border border-white/[0.07] bg-gradient-to-br from-white/[0.04] to-white/[0.01] p-6 flex flex-col gap-3 hover:border-white/[0.12] transition-colors">
                <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest">Velocidad meta anual</span>
                    <Trophy size={16} className="text-violet-400" />
                </div>

                {currentSaved >= annualGoal ? (
                    <>
                        <div className="text-3xl font-black text-emerald-400">¡Meta cumplida!</div>
                        <p className="text-xs text-emerald-500/60">Alcanzaste {fmtCur(annualGoal)} este año</p>
                    </>
                ) : goalTargetDate ? (
                    <>
                        <div className="text-4xl font-black font-mono tracking-tight text-white capitalize">
                            {format(goalTargetDate, 'MMM yy', { locale: dateLocale })}
                        </div>
                        <p className="text-xs text-neutral-500">
                            en {monthsToGoal} meses · {fmtCur(totalIncome)}/mes
                        </p>
                    </>
                ) : (
                    <>
                        <div className="text-2xl font-black text-neutral-600">—</div>
                        <p className="text-xs text-neutral-600">Registra ingresos para proyectar</p>
                    </>
                )}

                <div className="flex flex-col gap-1.5 mt-auto">
                    <div className="flex justify-between text-[9px] font-bold uppercase tracking-widest">
                        <span className="text-neutral-600">{fmtCur(currentSaved)}</span>
                        <span className="text-violet-400">{Math.round(savingsProgress)}%</span>
                    </div>
                    <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                        <div
                            className="h-full rounded-full bg-violet-500 transition-all duration-1000"
                            style={{ width: `${savingsProgress}%` }}
                        />
                    </div>
                    <span className="text-[9px] text-neutral-600 text-right">meta: {fmtCur(annualGoal)}</span>
                </div>
            </div>
        </div>
    );
}
