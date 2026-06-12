import { format, parseISO, type Locale } from 'date-fns';
import { Check } from 'lucide-react';
import { cn } from '../../utils/cn';

interface MonthSpreadsheetProps {
    month: { date: Date; days: any[] };
    dateLocale: Locale;
    fmtCur: (n: number) => string;
    onOpenDayDetails: (date: string) => void;
    setDailyOverride: (override: { date: string; budget: number }) => void;
}

export function MonthSpreadsheet({ month, dateLocale, fmtCur, onOpenDayDetails, setDailyOverride }: MonthSpreadsheetProps) {
    return (
        <div className="bg-[#050505] rounded-[24px] border border-white/10 overflow-hidden w-full shadow-2xl shadow-black">
            {/* Month Header */}
            <div className="px-6 py-5 border-b border-white/10 bg-[#080808] flex justify-between items-center">
                <h2 className="text-xl font-bold text-white capitalize tracking-tight flex items-center gap-3">
                    <span className="w-2 h-6 rounded-full bg-emerald-500 shadow-[0_0_10px_#10b981]"></span>
                    {format(month.date, 'MMMM yyyy', { locale: dateLocale })}
                </h2>
                <span className="text-xs font-mono text-neutral-500 font-bold opacity-50">PROYECCIÓN MENSUAL</span>
            </div>

            {/* Column Headers */}
            <div className="grid grid-cols-[3.5rem_3.5rem_1fr_1fr_1fr_6rem_6rem] gap-4 px-6 py-4 border-b border-white/5 bg-[#0a0a0a] text-[9px] font-bold text-neutral-500 uppercase tracking-[0.15em] select-none">
                <div>Fecha</div>
                <div>Día</div>
                <div className="text-right text-emerald-500/80">Entradas</div>
                <div className="text-right text-rose-500/80">Salidas</div>
                <div className="text-right text-cyan-500/80">Diario</div>
                <div className="text-right text-white/80">Saldo</div>
                <div className="text-right">Estado</div>
            </div>

            {/* Rows Container */}
            <div className="w-full">
                {month.days.map((day: any) => {
                    const isToday = day.date === format(new Date(), 'yyyy-MM-dd');
                    return (
                        <div
                            key={day.date}
                            className={cn(
                                "grid grid-cols-[3.5rem_3.5rem_1fr_1fr_1fr_6rem_6rem] gap-4 px-6 py-3.5 border-b border-white/[0.03] items-center hover:bg-white/[0.03] transition-all group",
                                isToday ? "bg-cyan-950/10 border-cyan-900/30" : ""
                            )}
                        >
                            <span className={cn("font-mono font-bold text-sm", isToday ? "text-cyan-400" : "text-neutral-500")}>
                                {format(parseISO(day.date), 'dd')}
                            </span>
                            <span className="text-[10px] font-bold text-neutral-600 uppercase tracking-wider group-hover:text-neutral-400 transition-colors">
                                {format(parseISO(day.date), 'EEE', { locale: dateLocale })}
                            </span>

                            {/* INCOMES (Entradas) */}
                            <div className="text-right relative">
                                <div
                                    onClick={() => onOpenDayDetails(day.date)}
                                    className="w-full text-right font-mono font-medium text-emerald-400 cursor-pointer hover:bg-emerald-500/10 rounded-sm px-1 py-0.5 transition-colors min-h-[1.5rem]"
                                >
                                    {day.income > 0 ? Number(day.income.toFixed(2)) : <span className="text-emerald-500/20 text-[10px]">+</span>}
                                </div>
                            </div>

                            {/* EXPENSES (Salidas) — fixed expense events (incl. recurring) + logged variable */}
                            <div className="text-right relative">
                                <div
                                    onClick={() => onOpenDayDetails(day.date)}
                                    className="w-full text-right font-mono font-medium text-rose-400 cursor-pointer hover:bg-rose-500/10 rounded-sm px-1 py-0.5 transition-colors min-h-[1.5rem]"
                                >
                                    {(day.fixedExpense + day.realExpense) > 0 ? Number((day.fixedExpense + day.realExpense).toFixed(2)) : <span className="text-rose-500/20 text-[10px]">+</span>}
                                </div>
                            </div>

                            {/* DAILY PLAN */}
                            <div className="flex items-center gap-1.5 justify-end relative">
                                <input
                                    type="number"
                                    className="w-12 bg-transparent text-right font-mono font-medium text-white/50 focus:text-white focus:outline-none placeholder-neutral-800 border-b border-transparent focus:border-cyan-500/50 focus:bg-cyan-500/5 transition-all rounded-sm px-1 py-0.5"
                                    value={day.plannedExpense}
                                    onChange={(e) => setDailyOverride({ date: day.date, budget: Number(e.target.value) })}
                                />
                                <button
                                    onClick={(e) => { e.stopPropagation(); setDailyOverride({ date: day.date, budget: 0 }); }}
                                    title="Poner diario a 0"
                                    className="w-5 h-5 rounded-full flex items-center justify-center border transition-all opacity-0 group-hover:opacity-100 bg-white/5 border-white/10 text-neutral-600 hover:bg-emerald-500/20 hover:border-emerald-500/40 hover:text-emerald-400 shrink-0"
                                >
                                    <Check size={9} />
                                </button>
                            </div>

                            {/* BALANCE */}
                            <div className="flex justify-end">
                                <span className={cn(
                                    "font-mono font-bold text-sm tracking-tight",
                                    day.balance >= 0 ? "text-emerald-500" : "text-rose-500"
                                )}>
                                    {fmtCur(day.balance)}
                                </span>
                            </div>

                            {/* STATUS */}
                            <div className="flex justify-end">
                                <StatusBadge status={day.status} />
                            </div>
                        </div>
                    )
                })}
            </div>
        </div>
    );
}

function StatusBadge({ status }: { status: 'solid' | 'caution' | 'risk' | 'critical' }) {
    const styles = {
        solid: "bg-emerald-500/10 text-emerald-400 opacity-80",
        caution: "bg-amber-500/10 text-amber-400 opacity-80",
        risk: "bg-orange-500/10 text-orange-400 opacity-80",
        critical: "bg-rose-500/10 text-rose-400 opacity-80",
    };

    const dots = {
        solid: "bg-emerald-500",
        caution: "bg-amber-500",
        risk: "bg-orange-500",
        critical: "bg-rose-500",
    }

    const labels = {
        solid: "Solvente",
        caution: "Ajustado",
        risk: "Riesgo",
        critical: "Déficit",
    };

    return (
        <span className={cn("pl-2 pr-3 py-1 rounded-full text-[9px] font-bold uppercase tracking-widest flex items-center gap-2 w-fit", styles[status])}>
            <div className={cn("w-1.5 h-1.5 rounded-full", dots[status])} />
            {labels[status]}
        </span>
    );
}
