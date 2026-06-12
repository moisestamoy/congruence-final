import { format, parseISO, type Locale } from 'date-fns';
import { Check, ChevronUp, Plus, Minus, Repeat } from 'lucide-react';
import { cn } from '../../utils/cn';
import { eventsOnDate } from './financeUtils';

interface TxModalState {
    isOpen: boolean;
    type: 'income' | 'expense';
    date: string;
    isGlobal?: boolean;
    editingId?: string;
    editingSource?: 'event' | 'realExpense';
    initialData?: { amount: number; category: string; description?: string };
    defaultIsRecurring?: boolean;
}

interface MobileMonthListProps {
    month: { date: Date; days: any[] };
    dateLocale: Locale;
    fmtCur: (n: number) => string;
    events: any[];
    realExpenses: any[];
    expandedDay: string | null;
    setExpandedDay: (date: string | null) => void;
    setDailyOverride: (override: { date: string; budget: number }) => void;
    setTxModal: (modal: TxModalState) => void;
    makeRecurring: (id: string, source: 'event' | 'realExpense') => void;
}

export function MobileMonthList({
    month,
    dateLocale,
    fmtCur,
    events,
    realExpenses,
    expandedDay,
    setExpandedDay,
    setDailyOverride,
    setTxModal,
    makeRecurring,
}: MobileMonthListProps) {
    return (
        <div className="w-full">
            {/* Month Header Stick */}
            <div className="sticky top-0 z-20 bg-[#050505]/95 backdrop-blur-md py-4 border-b border-white/10 mb-2 flex justify-between items-center px-2">
                <h2 className="text-xl font-bold text-white capitalize">
                    {format(month.date, 'MMMM yyyy', { locale: dateLocale })}
                </h2>
                <span className="text-xs font-bold text-neutral-500 uppercase tracking-widest">Saldo Futuro</span>
            </div>

            <div className="space-y-1">
                {month.days.map((day: any) => {
                    const isToday = day.date === format(new Date(), 'yyyy-MM-dd');
                    const isExpanded = expandedDay === day.date;

                    // Elegant Gradient Logic
                    let gradientBg = '';
                    let accentColor = '';

                    if (day.status === 'solid') {
                        gradientBg = 'from-emerald-900/40 via-emerald-900/10 to-transparent';
                        accentColor = 'text-emerald-400';
                    } else if (day.status === 'caution') {
                        gradientBg = 'from-amber-900/40 via-amber-900/10 to-transparent';
                        accentColor = 'text-amber-400';
                    } else if (day.status === 'risk') {
                        gradientBg = 'from-orange-900/40 via-orange-900/10 to-transparent';
                        accentColor = 'text-orange-400';
                    } else if (day.status === 'critical') {
                        gradientBg = 'from-rose-900/40 via-rose-900/10 to-transparent';
                        accentColor = 'text-rose-400';
                    }

                    // Calculate Daily Net for display
                    const dailyNet = day.income - day.totalExpense;

                    // Filter events for this day — recurring-aware, so fixed
                    // income/expenses also appear in future months' day panels
                    const dayEvents = [
                        ...eventsOnDate(events, day.date).map(e => ({ ...e, source: 'event' as const })),
                        ...realExpenses.filter(e => e.date === day.date).map(e => ({ ...e, type: 'expense' as const, source: 'realExpense' as const, isRecurring: false }))
                    ];

                    return (
                        <div key={day.date} className={cn("transition-all duration-500", isExpanded ? "mb-4 rounded-xl overflow-hidden bg-[#080808] border border-white/5 shadow-2xl" : "mb-0.5")}>
                            <div
                                onClick={() => setExpandedDay(isExpanded ? null : day.date)}
                                className="relative flex items-center justify-between p-4 min-h-[72px] cursor-pointer overflow-hidden group"
                            >
                                {/* Status Gradient Background (Right Aligned) */}
                                <div className={cn("absolute inset-y-0 right-0 w-[70%] bg-gradient-to-l transition-opacity duration-500", gradientBg, isExpanded ? "opacity-20" : "opacity-100")} />

                                {/* Today Indicator Line */}
                                {isToday && <div className="absolute left-0 inset-y-0 w-1 bg-cyan-500 shadow-[0_0_10px_#06b6d4]" />}

                                {/* Content - Left: Date */}
                                <div className="flex flex-col w-14 text-center relative z-10">
                                    <span className={cn("text-xl font-bold leading-none", isToday ? "text-cyan-400" : "text-white")}>{format(parseISO(day.date), 'dd')}</span>
                                    <span className="text-[10px] uppercase font-bold text-neutral-500 tracking-wider">{format(parseISO(day.date), 'EEE', { locale: dateLocale })}</span>
                                </div>

                                {/* Content - Middle: Inputs/Details */}
                                <div className="flex-1 px-4 flex flex-col items-center relative z-10">
                                    {isExpanded ? (
                                        <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-[0.2em]">Detalles</span>
                                    ) : (
                                        <div className="flex flex-col items-center opacity-60 group-hover:opacity-100 transition-opacity">
                                            {/* Simplified Input Appearance */}
                                            <div onClick={(e) => e.stopPropagation()} className="relative flex items-center gap-1">
                                                <span className="absolute -top-3 left-1/2 -translate-x-1/2 text-[8px] font-bold text-neutral-600 uppercase tracking-wider whitespace-nowrap">Diario</span>
                                                <input
                                                    type="number"
                                                    className="w-16 bg-white/5 rounded-lg px-2 py-1 text-center font-bold text-neutral-300 text-sm focus:outline-none focus:bg-white/10 focus:text-white transition-colors"
                                                    value={day.plannedExpense}
                                                    onChange={(e) => setDailyOverride({ date: day.date, budget: Number(e.target.value) })}
                                                />
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); setDailyOverride({ date: day.date, budget: 0 }); }}
                                                    title="Poner a 0"
                                                    className="w-6 h-6 rounded-full flex items-center justify-center border bg-white/5 border-white/10 text-neutral-500 active:bg-emerald-500/30 active:text-emerald-400 hover:border-emerald-500/40 hover:text-emerald-400 transition-all shrink-0"
                                                >
                                                    <Check size={11} />
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Content - Right: Running Balance */}
                                <div className="flex flex-col items-end text-right w-28 relative z-10">
                                    {!isExpanded && (
                                        <>
                                            <span className={cn("text-lg font-bold font-mono tracking-tight drop-shadow-sm", day.status === 'solid' ? "text-white" : "text-white")}>
                                                {fmtCur(day.balance)}
                                            </span>
                                            <div className="flex items-center gap-1">
                                                {dailyNet !== 0 ? (
                                                    <span className={cn(
                                                        "text-[10px] font-bold",
                                                        dailyNet > 0 ? "text-emerald-400" : "text-red-400"
                                                    )}>
                                                        {dailyNet > 0 ? '+' : '-'}{fmtCur(dailyNet)}
                                                    </span>
                                                ) : (
                                                    <span className="text-[10px] font-medium text-neutral-600">-</span>
                                                )}
                                            </div>
                                        </>
                                    )}
                                    {isExpanded && <ChevronUp size={20} className="text-neutral-500" />}
                                </div>
                            </div>

                            {/* EXPANDED CONTENT PANEL */}
                            {isExpanded && (
                                <div className="p-4 bg-black/40 backdrop-blur-md border-t border-white/5 relative">
                                    {/* Summary Header */}
                                    <div className="flex justify-between items-end mb-6 pb-4 border-b border-white/5">
                                        <div className="flex flex-col gap-1">
                                            <span className="text-[10px] text-neutral-500 font-bold uppercase tracking-widest">Saldo Final</span>
                                            <span className={cn("text-3xl font-bold font-mono tracking-tighter", accentColor)}>
                                                {fmtCur(day.balance)}
                                            </span>
                                        </div>
                                        <div className="flex flex-col items-end gap-1 px-4 py-2 bg-white/[0.03] rounded-xl border border-white/5">
                                            <span className="text-[10px] text-neutral-400 font-medium uppercase tracking-wider">Flujo Neto</span>
                                            <span className={cn("text-lg font-bold font-mono", dailyNet >= 0 ? "text-emerald-400" : "text-rose-400")}>
                                                {dailyNet > 0 ? '+' : '-'}{fmtCur(dailyNet)}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Transactions */}
                                    <div className="space-y-2.5 mb-8">
                                        {dayEvents.length === 0 && (
                                            <div className="flex flex-col items-center justify-center py-6 text-neutral-600">
                                                <span className="text-xs italic">No hay movimientos registrados</span>
                                            </div>
                                        )}
                                        {dayEvents.map(event => (
                                            <div
                                                key={`${event.source}-${event.id}`}
                                                className="group flex justify-between items-center bg-white/[0.03] p-3 rounded-xl border border-white/[0.02] hover:bg-white/[0.05] transition-colors"
                                            >
                                                {/* Left: clickable to edit */}
                                                <div
                                                    className="flex items-center gap-3 flex-1 cursor-pointer"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setTxModal({
                                                            isOpen: true,
                                                            type: event.type,
                                                            date: event.date || day.date,
                                                            editingId: event.id,
                                                            editingSource: event.source,
                                                            initialData: { amount: event.amount, category: event.category, description: '' },
                                                            defaultIsRecurring: event.isRecurring ?? false
                                                        });
                                                    }}
                                                >
                                                    <div className={cn("w-1 h-8 rounded-full", event.type === 'income' ? 'bg-emerald-500' : 'bg-red-500')} />
                                                    <div className="flex flex-col">
                                                        <div className="flex items-center gap-1.5">
                                                            <span className="text-sm font-bold text-white">{event.category}</span>
                                                            {event.isRecurring && (
                                                                <span className="text-[8px] font-bold text-violet-400 bg-violet-500/15 border border-violet-500/20 px-1.5 py-0.5 rounded-full uppercase tracking-wide">🔄 Fijo</span>
                                                            )}
                                                        </div>
                                                        <span className="text-[9px] text-neutral-500 uppercase tracking-wider">{event.type === 'income' ? 'Ingreso' : (event.isRecurring ? 'Gasto Fijo' : 'Gasto Variable')}</span>
                                                    </div>
                                                </div>

                                                {/* Right: amount + quick recurring toggle */}
                                                <div className="flex items-center gap-2">
                                                    {!event.isRecurring && (
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                makeRecurring(event.id, event.source);
                                                            }}
                                                            title="Hacer fijo (se repite cada mes)"
                                                            className="opacity-0 group-hover:opacity-100 flex items-center gap-1 px-2 py-1 rounded-lg bg-violet-500/10 border border-violet-500/20 text-violet-400 text-[9px] font-bold hover:bg-violet-500/25 transition-all"
                                                        >
                                                            <Repeat size={9} /> Hacer fijo
                                                        </button>
                                                    )}
                                                    <span className={cn("font-mono font-bold text-sm", event.type === 'income' ? "text-emerald-400" : "text-red-400")}>
                                                        {event.type === 'income' ? '+' : '-'}{fmtCur(event.amount)}
                                                    </span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    {/* Action Buttons */}
                                    <div className="grid grid-cols-2 gap-4">
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setTxModal({ isOpen: true, type: 'income', date: day.date, editingId: undefined, editingSource: undefined, initialData: undefined });
                                            }}
                                            className="group flex flex-col items-center justify-center gap-2 py-4 rounded-2xl bg-emerald-500/[0.08] hover:bg-emerald-500/[0.15] border border-emerald-500/10 active:scale-[0.98] transition-all"
                                        >
                                            <div className="p-2 rounded-full bg-emerald-500/20 text-emerald-400 group-hover:text-emerald-300 group-hover:scale-110 transition-all">
                                                <Plus size={18} />
                                            </div>
                                            <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest">Añadir Ingreso</span>
                                        </button>

                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setTxModal({ isOpen: true, type: 'expense', date: day.date, editingId: undefined, editingSource: undefined, initialData: undefined });
                                            }}
                                            className="group flex flex-col items-center justify-center gap-2 py-4 rounded-2xl bg-red-500/[0.08] hover:bg-red-500/[0.15] border border-red-500/10 active:scale-[0.98] transition-all"
                                        >
                                            <div className="p-2 rounded-full bg-red-500/20 text-red-400 group-hover:text-red-300 group-hover:scale-110 transition-all">
                                                <Minus size={18} />
                                            </div>
                                            <span className="text-[10px] font-bold text-red-500 uppercase tracking-widest">Añadir Gasto</span>
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
