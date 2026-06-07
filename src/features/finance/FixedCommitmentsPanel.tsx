import { Repeat, Plus, Trash2 } from 'lucide-react';
import { useFinanceStore } from './useFinanceStore';
import { cn } from '../../utils/cn';

interface FixedCommitmentsPanelProps {
    onAddRecurring: () => void;
    fmtCur: (n: number) => string;
}

function extractEmoji(category: string): string {
    const match = category.match(/^\p{Emoji}/u);
    return match ? match[0] : '•';
}

function extractLabel(category: string): string {
    return category.replace(/^\p{Emoji}\s*/u, '').trim();
}

function dayOfMonth(date: string): string {
    const parts = date.split('-');
    return parts[2] ? String(parseInt(parts[2], 10)) : '?';
}

export function FixedCommitmentsPanel({ onAddRecurring, fmtCur }: FixedCommitmentsPanelProps) {
    const events = useFinanceStore((s) => s.events);
    const deleteTransaction = useFinanceStore((s) => s.deleteTransaction);

    const recurringEvents = events.filter((e) => e.isRecurring);
    const recurringIncome = recurringEvents.filter((e) => e.type === 'income');
    const recurringExpenses = recurringEvents.filter((e) => e.type === 'expense');

    const totalIncome = recurringIncome.reduce((sum, e) => sum + e.amount, 0);
    const totalExpenses = recurringExpenses.reduce((sum, e) => sum + e.amount, 0);
    const netMonthly = totalIncome - totalExpenses;
    const totalCount = recurringEvents.length;

    return (
        <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] flex flex-col overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.05]">
                <div className="flex items-center gap-2.5">
                    <Repeat size={16} className="text-violet-400" />
                    <span className="text-sm font-semibold text-white/90">Compromisos Fijos</span>
                    {totalCount > 0 && (
                        <span className="text-xs font-medium bg-violet-500/15 text-violet-400 border border-violet-500/20 rounded-full px-2 py-0.5">
                            {totalCount}
                        </span>
                    )}
                </div>
                <button
                    onClick={onAddRecurring}
                    className="flex items-center gap-1.5 text-xs font-medium text-violet-400 hover:text-violet-300 bg-violet-500/10 hover:bg-violet-500/20 border border-violet-500/20 hover:border-violet-500/30 rounded-lg px-3 py-1.5 transition-all"
                >
                    <Plus size={13} />
                    Agregar fijo
                </button>
            </div>

            {/* Columns */}
            <div className="flex flex-col sm:flex-row divide-y sm:divide-y-0 sm:divide-x divide-white/[0.05] flex-1">
                {/* Income column */}
                <div className="flex-1 flex flex-col">
                    <div className="px-4 py-2.5 border-b border-white/[0.04]">
                        <span className="text-[11px] font-semibold uppercase tracking-widest text-emerald-500/70">
                            Ingresos
                        </span>
                    </div>
                    <div className="flex flex-col flex-1">
                        {recurringIncome.length === 0 ? (
                            <p className="text-xs italic text-neutral-600 px-4 py-4">Sin ingresos fijos</p>
                        ) : (
                            recurringIncome.map((event) => (
                                <div
                                    key={event.id}
                                    className="group flex items-center gap-3 px-4 py-2.5 hover:bg-white/[0.02] transition-colors"
                                >
                                    <span className="text-base leading-none select-none">
                                        {extractEmoji(event.category)}
                                    </span>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-xs text-white/75 truncate">
                                            {extractLabel(event.category)}
                                        </p>
                                        <p className="text-[10px] text-neutral-600">
                                            Día {dayOfMonth(event.date)}
                                        </p>
                                    </div>
                                    <span className="text-xs font-semibold text-emerald-400 tabular-nums shrink-0">
                                        +{fmtCur(event.amount)}
                                    </span>
                                    <button
                                        onClick={() => deleteTransaction(event.id, 'event')}
                                        className="opacity-0 group-hover:opacity-100 text-white/30 hover:text-red-400 transition-all ml-1"
                                        title="Eliminar"
                                    >
                                        <Trash2 size={13} />
                                    </button>
                                </div>
                            ))
                        )}
                    </div>
                    {recurringIncome.length > 0 && (
                        <div className="px-4 py-2 border-t border-white/[0.04] flex justify-between items-center">
                            <span className="text-[10px] text-neutral-600 uppercase tracking-wide">Total</span>
                            <span className="text-xs font-bold text-emerald-400 tabular-nums">
                                +{fmtCur(totalIncome)}
                            </span>
                        </div>
                    )}
                </div>

                {/* Expenses column */}
                <div className="flex-1 flex flex-col">
                    <div className="px-4 py-2.5 border-b border-white/[0.04]">
                        <span className="text-[11px] font-semibold uppercase tracking-widest text-rose-500/70">
                            Gastos
                        </span>
                    </div>
                    <div className="flex flex-col flex-1">
                        {recurringExpenses.length === 0 ? (
                            <p className="text-xs italic text-neutral-600 px-4 py-4">Sin gastos fijos</p>
                        ) : (
                            recurringExpenses.map((event) => (
                                <div
                                    key={event.id}
                                    className="group flex items-center gap-3 px-4 py-2.5 hover:bg-white/[0.02] transition-colors"
                                >
                                    <span className="text-base leading-none select-none">
                                        {extractEmoji(event.category)}
                                    </span>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-xs text-white/75 truncate">
                                            {extractLabel(event.category)}
                                        </p>
                                        <p className="text-[10px] text-neutral-600">
                                            Día {dayOfMonth(event.date)}
                                        </p>
                                    </div>
                                    <span className="text-xs font-semibold text-rose-400 tabular-nums shrink-0">
                                        -{fmtCur(event.amount)}
                                    </span>
                                    <button
                                        onClick={() => deleteTransaction(event.id, 'event')}
                                        className="opacity-0 group-hover:opacity-100 text-white/30 hover:text-red-400 transition-all ml-1"
                                        title="Eliminar"
                                    >
                                        <Trash2 size={13} />
                                    </button>
                                </div>
                            ))
                        )}
                    </div>
                    {recurringExpenses.length > 0 && (
                        <div className="px-4 py-2 border-t border-white/[0.04] flex justify-between items-center">
                            <span className="text-[10px] text-neutral-600 uppercase tracking-wide">Total</span>
                            <span className="text-xs font-bold text-rose-400 tabular-nums">
                                -{fmtCur(totalExpenses)}
                            </span>
                        </div>
                    )}
                </div>
            </div>

            {/* Footer: neto mensual fijo */}
            <div className="flex items-center justify-between px-5 py-3 border-t border-white/[0.07] bg-white/[0.01]">
                <span className="text-xs text-white/40 font-medium">Neto mensual fijo</span>
                <span
                    className={cn(
                        'text-sm font-bold tabular-nums',
                        netMonthly >= 0 ? 'text-emerald-400' : 'text-rose-400'
                    )}
                >
                    {netMonthly >= 0 ? '+' : ''}{fmtCur(netMonthly)}
                </span>
            </div>
        </div>
    );
}
