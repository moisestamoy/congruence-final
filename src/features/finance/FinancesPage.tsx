import { useMemo, useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { format, addMonths, parseISO, isSameMonth, differenceInCalendarDays, endOfMonth, startOfToday } from 'date-fns';
import { es, enUS, pt } from 'date-fns/locale';
import { useFinanceStore } from './useFinanceStore';
import { DailyProjectionEngine } from './DailyProjectionEngine';
import { cn } from '../../utils/cn';
import { Info, Target, Plus, Minus, ChevronUp, Calculator, ShieldCheck } from 'lucide-react';
import { SavingsGoalsModal } from './SavingsGoalsModal';
import { TransactionModal } from './TransactionModal';
import { SafeToSpendWidget } from './SafeToSpendWidget';
import { CashFlowChart } from './CashFlowChart';
import { CategoryBreakdownWidget } from './CategoryBreakdownWidget';
import { DayDetailsModal } from './DayDetailsModal';
import { BudgetModal } from './BudgetModal';
import { AlertsModal } from './AlertsModal';
import { useFabStore } from '../../hooks/useFabStore';

export default function FinancesPage() {
    const { i18n } = useTranslation();
    const { config, events, overrides, realExpenses, setDailyOverride, addTransaction, updateTransaction, deleteTransaction, savingsGoals, savingsEntries } = useFinanceStore();

    // Force 2 months view for this specific "Dashboard" requirement
    const [horizon, setHorizon] = useState<number>(2);
    // Modified to allow navigation
    const [currentDate, setCurrentDate] = useState(new Date());

    const navigateMonth = (direction: number) => {
        setCurrentDate(prev => addMonths(prev, direction));
    };

    // UI State
    const [isGoalsOpen, setIsGoalsOpen] = useState(false);
    const [isBudgetOpen, setIsBudgetOpen] = useState(false);
    const [isAlertsOpen, setIsAlertsOpen] = useState(false);
    const [expandedDay, setExpandedDay] = useState<string | null>(null);
    const [txModal, setTxModal] = useState<{
        isOpen: boolean;
        type: 'income' | 'expense';
        date: string;
        isGlobal?: boolean;
        editingId?: string;
        editingSource?: 'event' | 'realExpense';
        initialData?: { amount: number; category: string; description?: string };
    }>({ isOpen: false, type: 'income', date: '' });
    const [dayDetailsDate, setDayDetailsDate] = useState<string | null>(null);
    const { fabActionTick } = useFabStore();

    // Global FAB Event Listener using Zustand
    useEffect(() => {
        if (fabActionTick > 0) {
            setTxModal({
                isOpen: true,
                type: 'expense',
                date: format(new Date(), 'yyyy-MM-dd'),
                isGlobal: true
            });
        }
    }, [fabActionTick]); // eslint-disable-line react-hooks/exhaustive-deps

    const handleAddTransaction = (amount: number, category: string, description: string, globalDate?: string, globalType?: 'income' | 'expense') => {
        const targetDate = globalDate || txModal.date;
        const targetType = globalType || txModal.type;
        if (!targetDate) return;

        if (txModal.editingId && txModal.editingSource) {
            updateTransaction(txModal.editingId, txModal.editingSource, { amount, category, date: targetDate, type: targetType, note: description });
        } else {
            // Use addTransaction for distinct entries (additive)
            addTransaction(targetDate, targetType, amount, category);
        }
    };

    const handleDeleteTransaction = () => {
        if (txModal.editingId && txModal.editingSource) {
            deleteTransaction(txModal.editingId, txModal.editingSource);
        }
    };

    const dateLocale = useMemo(() => {
        if (i18n.language === 'es') return es;
        if (i18n.language === 'pt') return pt;
        return enUS;
    }, [i18n.language]);

    // --- CALCULATION ENGINE ---
    const projections = useMemo(() => {
        let allProjections: any[] = [];
        let runningBalance = config.initialBalance;

        for (let i = 0; i < horizon; i++) {
            const targetDate = addMonths(currentDate, i);
            const monthProjs = DailyProjectionEngine.generateMonthProjection(
                targetDate.getFullYear(),
                targetDate.getMonth(),
                config,
                events,
                overrides,
                realExpenses,
                runningBalance
            );
            allProjections = [...allProjections, ...monthProjs];
            runningBalance = monthProjs[monthProjs.length - 1].balance;
        }
        return allProjections;
    }, [currentDate, config, events, overrides, realExpenses, horizon]);

    // Split projections by month for the grid view
    const monthsData = useMemo(() => {
        const months = [];
        for (let i = 0; i < horizon; i++) {
            const targetMonth = addMonths(currentDate, i);
            const days = projections.filter(p => isSameMonth(parseISO(p.date), targetMonth));
            months.push({ date: targetMonth, days });
        }
        return months;
    }, [projections, currentDate, horizon]);


    // --- STATS DATA (Bottom Section) ---
    // Calculate totals based on the VIEWED month (currentDate), not the whole horizon
    const displayedMonthData = monthsData.find((m: any) => isSameMonth(m.date, currentDate))?.days || [];

    // Calculate aggregated categories for the displayed month
    const { monthIncome, monthExpenses, categoryBreakdown } = useMemo(() => {
        let inc = 0;
        let exp = 0;
        const catMap: Record<string, number> = {};

        displayedMonthData.forEach(day => {
            // 1. Income (from Events)
            const dayEvents = events.filter(e => e.date === day.date);

            dayEvents.filter(e => e.type === 'income').forEach(e => {
                inc += e.amount;
            });

            // 2. Fixed Expenses (from Events)
            dayEvents.filter(e => e.type === 'expense').forEach(e => {
                exp += e.amount;
                const cat = e.category || 'Fijos';
                catMap[cat] = (catMap[cat] || 0) + e.amount;
            });

            // 3. Variable Expenses
            if (day.realExpense > 0) {
                const dayReal = realExpenses.filter(e => e.date === day.date);
                dayReal.forEach(e => {
                    exp += e.amount;
                    const cat = e.category || 'Variables';
                    catMap[cat] = (catMap[cat] || 0) + e.amount;
                });
            } else {
                // Otherwise custom plan/override
                exp += day.plannedExpense;
                catMap['Ajuste diario'] = (catMap['Ajuste diario'] || 0) + day.plannedExpense;
            }
        });

        // Format for Chart
        const colors = ['#6366f1', '#f59e0b', '#3b82f6', '#ef4444', '#f97316', '#a855f7', '#10b981', '#ec4899'];
        const breakdown = Object.entries(catMap)
            .map(([name, value], idx) => ({
                name,
                value,
                color: colors[idx % colors.length]
            }))
            .sort((a, b) => b.value - a.value);

        return { monthIncome: inc, monthExpenses: exp, categoryBreakdown: breakdown };
    }, [displayedMonthData, events, realExpenses]);

    // Use computed values instead of global projections
    const totalIncome = monthIncome;
    const totalExpenses = monthExpenses;
    const netFlow = totalIncome - totalExpenses;

    const categoryData = categoryBreakdown;

    // Savings Calculations
    const currentYear = new Date().getFullYear();
    const annualGoal = savingsGoals?.annual || 20000;
    const currentSaved = savingsEntries
        .filter(e => new Date(e.date).getFullYear() === currentYear)
        .reduce((sum, e) => sum + e.amount, 0);
    const savingsProgress = Math.min((currentSaved / annualGoal) * 100, 100);
    const strokeDashoffset = 552 - (552 * savingsProgress) / 100;

    // Command Center Metrics (Safe-to-Spend)
    const today = startOfToday();
    const currentMonthData = monthsData.find(m => isSameMonth(m.date, today));

    let safemetric_projectedEnd = 0;
    let safemetric_daysRemaining = 0;
    let safemetric_chartData: any[] = [];
    let safemetric_dailyBase = Math.ceil(config.monthlyFixedBudget / 30); // Approx

    if (currentMonthData) {
        safemetric_projectedEnd = currentMonthData.days[currentMonthData.days.length - 1].balance;
        safemetric_daysRemaining = differenceInCalendarDays(endOfMonth(today), today) + 1;
        safemetric_chartData = currentMonthData.days;
        safemetric_dailyBase = Math.ceil(config.monthlyFixedBudget / currentMonthData.days.length);
    }

    return (
        <div className="min-h-screen bg-[#050505] text-white font-sans selection:bg-cyan-500/30 pb-24">
            {/* BACKGROUND AMBIENCE */}
            <div className="fixed inset-0 pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-emerald-500/5 rounded-full blur-[120px]" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-cyan-500/5 rounded-full blur-[120px]" />
            </div>

            <div className="w-full max-w-[1600px] mx-auto p-4 md:p-8 relative z-10 space-y-8">

                {/* --- DESKTOP VIEW: PRO COMMAND CENTER (Hidden on Mobile) --- */}
                <div className="hidden md:block space-y-8">
                    {/* Title & Actions */}
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                            <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-white mb-2">Finanzas</h1>
                            <p className="text-neutral-400 font-medium">Panel de Control & Proyección</p>
                        </div>
                    </div>

                    {/* Summary Widgets Grid (4 Columns) */}
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                        {/* Ingresos Totales */}
                        <div className="p-3 rounded-2xl bg-[#0a0a0a] border border-white/5 shadow-xl relative overflow-hidden group hover:border-white/10 transition-colors">
                            <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] to-transparent" />
                            <span className="text-[9px] font-bold text-neutral-500 uppercase tracking-widest relative z-10">Ingresos Totales</span>
                            <div className="text-xl font-bold font-mono text-emerald-400 mt-1 relative z-10">€{totalIncome.toLocaleString()}</div>
                        </div>
                        {/* Gastos Totales */}
                        <div className="p-3 rounded-2xl bg-[#0a0a0a] border border-white/5 shadow-xl relative overflow-hidden group hover:border-white/10 transition-colors">
                            <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] to-transparent" />
                            <span className="text-[9px] font-bold text-neutral-500 uppercase tracking-widest relative z-10">Gastos Totales</span>
                            <div className="text-xl font-bold font-mono text-rose-400 mt-1 relative z-10">€{Math.abs(totalExpenses).toLocaleString()}</div>
                        </div>
                        {/* Flujo Neto */}
                        <div className="p-3 rounded-2xl bg-[#0a0a0a] border border-white/5 shadow-xl relative overflow-hidden group hover:border-white/10 transition-colors">
                            <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] to-transparent" />
                            <span className="text-[9px] font-bold text-neutral-500 uppercase tracking-widest relative z-10">Flujo Neto</span>
                            <div className={cn("text-xl font-bold font-mono mt-1 relative z-10", netFlow >= 0 ? "text-cyan-400" : "text-amber-400")}>
                                {netFlow >= 0 ? '+' : ''}€{netFlow.toLocaleString()}
                            </div>
                        </div>
                        {/* Safe-To-Spend Widget */}
                        <div className="h-full">
                            <SafeToSpendWidget
                                dailyBaseBudget={safemetric_dailyBase}
                                projectedEndBalance={safemetric_projectedEnd}
                                savingsGoal={savingsGoals.monthly}
                                daysRemaining={safemetric_daysRemaining}
                            />
                        </div>
                    </div>

                    {/* CONTROL BAR (Floating & Unified) */}
                    <div className="sticky top-4 z-40 bg-[#0a0a0a]/80 backdrop-blur-xl border border-white/10 p-2 rounded-[24px] shadow-2xl flex items-center justify-between gap-4 w-full">
                        {/* LEFT: Date Navigation & Horizon */}
                        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
                            <div className="flex items-center bg-[#151515] rounded-2xl border border-white/5 p-1">
                                <button onClick={() => navigateMonth(-1)} className="w-8 h-8 flex items-center justify-center text-neutral-400 hover:text-white hover:bg-white/10 rounded-xl transition-colors">
                                    <ChevronUp className="-rotate-90" size={16} />
                                </button>
                                <span className="px-4 text-xs font-bold uppercase tracking-wider min-w-[140px] text-center text-neutral-200">
                                    {format(currentDate, 'MMM yyyy', { locale: dateLocale })}
                                    {horizon > 1 && ` - ${format(addMonths(currentDate, horizon - 1), 'MMM yyyy', { locale: dateLocale })}`}
                                </span>
                                <button onClick={() => navigateMonth(1)} className="w-8 h-8 flex items-center justify-center text-neutral-400 hover:text-white hover:bg-white/10 rounded-xl transition-colors">
                                    <ChevronUp className="rotate-90" size={16} />
                                </button>
                            </div>

                            <div className="w-px h-6 bg-white/10 mx-2" />

                            <div className="flex items-center bg-[#151515] rounded-2xl border border-white/5 p-1 gap-1">
                                {[1, 2, 3, 4, 12].map(m => (
                                    <button
                                        key={m}
                                        onClick={() => setHorizon(m)}
                                        className={cn(
                                            "px-3 py-1.5 rounded-xl text-[10px] font-bold transition-all uppercase tracking-widest min-w-[32px]",
                                            horizon === m ? "bg-white text-black shadow-lg scale-105" : "text-neutral-500 hover:text-white hover:bg-white/5"
                                        )}
                                    >
                                        {m === 1 && '1M'}
                                        {m === 2 && '2M'}
                                        {m === 3 && '3M'}
                                        {m === 4 && '4M'}
                                        {m === 12 && '1A'}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* RIGHT: Actions */}
                        <div className="flex items-center gap-2">
                            <button onClick={() => setIsAlertsOpen(true)} className="flex items-center gap-2 px-3 py-2 text-blue-400/50 hover:text-blue-400 transition-colors cursor-pointer" title="Ver alertas">
                                <div className="relative">
                                    <Info size={18} />
                                    <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
                                </div>
                            </button>

                            <div className="h-6 w-px bg-white/10 mx-1" />

                            <button onClick={() => setIsBudgetOpen(true)} className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 text-[10px] font-bold uppercase tracking-widest hover:bg-cyan-500/20 hover:border-cyan-500/50 transition-all">
                                <Calculator size={14} /> Presupuesto
                            </button>
                            <button onClick={() => setIsGoalsOpen(true)} className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-500 text-black border border-emerald-400 text-[10px] font-bold uppercase tracking-widest hover:bg-emerald-400 hover:scale-105 active:scale-95 transition-all shadow-[0_0_15px_rgba(16,185,129,0.3)]">
                                <Target size={14} /> Metas
                            </button>
                        </div>
                    </div>
                </div>

                {/* --- MOBILE VIEW: COMPACT FINANCIAL MASTER CARD --- */}
                <div className="block md:hidden space-y-2 relative z-10 w-full">
                    <div className="relative w-full rounded-[32px] overflow-hidden bg-gradient-to-br from-[#0a0a0a] to-[#050505] border border-white/10 shadow-2xl p-6 shrink-0">
                        <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 via-cyan-500/5 to-transparent pointer-events-none opacity-50" />

                        <div className="flex justify-between items-start mb-6 relative z-10">
                            <div>
                                <h1 className="text-2xl font-black tracking-tight text-white mb-1">Finanzas</h1>
                                <p className="text-[10px] text-neutral-400 font-bold uppercase tracking-widest">Balance General</p>
                            </div>

                            <div className="flex flex-col items-end gap-2">
                                <div className="flex bg-[#111] backdrop-blur-md border border-white/5 rounded-full p-1 items-center shadow-lg">
                                    <button onClick={() => navigateMonth(-1)} className="w-6 h-6 flex items-center justify-center text-neutral-400 hover:text-white transition-colors">
                                        <ChevronUp className="-rotate-90" size={12} />
                                    </button>
                                    <span className="px-2 text-[10px] font-bold uppercase tracking-wider text-neutral-300 min-w-[70px] text-center">
                                        {format(currentDate, 'MMM yy', { locale: dateLocale })}
                                    </span>
                                    <button onClick={() => navigateMonth(1)} className="w-6 h-6 flex items-center justify-center text-neutral-400 hover:text-white transition-colors">
                                        <ChevronUp className="rotate-90" size={12} />
                                    </button>
                                </div>
                                <div className="flex bg-[#111] border border-white/5 rounded-full p-0.5 shadow-lg">
                                    {[1, 2, 3].map(m => (
                                        <button key={m} onClick={() => setHorizon(m)} className={cn("min-w-[24px] h-5 rounded-full text-[9px] font-bold transition-all uppercase tracking-widest", horizon === m ? "bg-white text-black shadow-md" : "text-neutral-500 hover:text-white")}>
                                            {m}M
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="mb-8 relative z-10">
                            <div className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest shadow-sm">Flujo Neto Global</div>
                            <div className={cn("text-5xl font-black font-mono tracking-tighter drop-shadow-2xl mt-1", netFlow >= 0 ? "text-cyan-400" : "text-amber-400")}>
                                {netFlow >= 0 ? '+' : ''}€{netFlow.toLocaleString()}
                            </div>
                        </div>

                        <div className="flex items-center gap-3 mb-6 relative z-10">
                            <div className="flex-1 bg-black/40 p-4 rounded-2xl border border-white/5 backdrop-blur-sm">
                                <div className="flex justify-between items-center mb-1">
                                    <div className="text-[9px] font-bold text-neutral-500 uppercase tracking-widest">Ingresos</div>
                                    <Plus size={10} className="text-emerald-500/50" />
                                </div>
                                <div className="text-xl font-bold font-mono text-emerald-400">€{totalIncome.toLocaleString()}</div>
                            </div>
                            <div className="flex-1 bg-black/40 p-4 rounded-2xl border border-white/5 backdrop-blur-sm">
                                <div className="flex justify-between items-center mb-1">
                                    <div className="text-[9px] font-bold text-neutral-500 uppercase tracking-widest">Gastos</div>
                                    <Minus size={10} className="text-rose-500/50" />
                                </div>
                                <div className="text-xl font-bold font-mono text-rose-400">€{Math.abs(totalExpenses).toLocaleString()}</div>
                            </div>
                        </div>

                        <div className="border-t border-white/5 pt-5 flex justify-between items-center relative z-10">
                            <div className="flex items-center gap-2">
                                <div className="w-6 h-6 rounded-full bg-emerald-500/10 flex items-center justify-center">
                                    <ShieldCheck size={12} className="text-emerald-400" />
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-500">Gasto Seguro</span>
                                    <span className="text-[9px] text-neutral-500">Restan {safemetric_daysRemaining} días</span>
                                </div>
                            </div>
                            <div className="text-right">
                                <span className="font-mono text-xl font-black text-white">€{safemetric_dailyBase}</span>
                                <span className="text-[10px] text-neutral-500 ml-1 font-bold uppercase">/día</span>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 bg-[#0a0a0a]/80 backdrop-blur-xl border border-white/10 p-2 rounded-[20px] shadow-lg sticky top-4 z-40 gap-2">
                        <button onClick={() => setIsBudgetOpen(true)} className="flex justify-center items-center gap-2 py-3 mr-1 rounded-xl bg-cyan-500/10 text-cyan-400 border border-transparent text-[10px] font-bold uppercase tracking-widest hover:bg-cyan-500/20 transition-all">
                            <Calculator size={14} /> Presupuesto
                        </button>
                        <button onClick={() => setIsGoalsOpen(true)} className="flex justify-center items-center gap-2 py-3 rounded-xl bg-emerald-500 text-black border border-emerald-400 text-[10px] font-bold uppercase tracking-widest hover:bg-emerald-400 transition-all shadow-[0_0_15px_rgba(16,185,129,0.3)]">
                            <Target size={14} /> Metas
                        </button>
                    </div>
                </div>

            </div>

            {/* DESKTOP: PRO SPREADSHEET (Hidden on Mobile) */}
            <div className="hidden lg:grid w-full max-w-[1800px] mx-auto grid-cols-1 lg:grid-cols-2 gap-8">
                {monthsData.map((month, idx) => (
                    <div key={idx} className="bg-[#050505] rounded-[24px] border border-white/10 overflow-hidden w-full shadow-2xl shadow-black">
                        {/* Month Header */}
                        <div className="px-6 py-5 border-b border-white/10 bg-[#080808] flex justify-between items-center">
                            <h2 className="text-xl font-bold text-white capitalize tracking-tight flex items-center gap-3">
                                <span className="w-2 h-6 rounded-full bg-cyan-500 shadow-[0_0_10px_#06b6d4]"></span>
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
                                                onClick={() => setDayDetailsDate(day.date)}
                                                className="w-full text-right font-mono font-medium text-emerald-400 cursor-pointer hover:bg-emerald-500/10 rounded-sm px-1 py-0.5 transition-colors min-h-[1.5rem]"
                                            >
                                                {day.income > 0 ? Number(day.income.toFixed(2)) : <span className="text-emerald-500/20 text-[10px]">+</span>}
                                            </div>
                                        </div>

                                        {/* EXPENSES (Salidas) */}
                                        <div className="text-right relative">
                                            <div
                                                onClick={() => setDayDetailsDate(day.date)}
                                                className="w-full text-right font-mono font-medium text-rose-400 cursor-pointer hover:bg-rose-500/10 rounded-sm px-1 py-0.5 transition-colors min-h-[1.5rem]"
                                            >
                                                {day.realExpense > 0 ? Number(day.realExpense.toFixed(2)) : <span className="text-rose-500/20 text-[10px]">+</span>}
                                            </div>
                                        </div>

                                        {/* DAILY PLAN */}
                                        <div className="text-right relative">
                                            <input
                                                type="number"
                                                className="w-full bg-transparent text-right font-mono font-medium text-white/50 focus:text-white focus:outline-none placeholder-neutral-800 border-b border-transparent focus:border-cyan-500/50 focus:bg-cyan-500/5 transition-all rounded-sm px-1 py-0.5"
                                                value={day.plannedExpense}
                                                onChange={(e) => setDailyOverride({ date: day.date, budget: Number(e.target.value) })}
                                            />
                                        </div>

                                        {/* BALANCE */}
                                        <div className="flex justify-end">
                                            <span className={cn(
                                                "font-mono font-bold text-sm tracking-tight",
                                                day.balance >= 0 ? "text-emerald-500" : "text-rose-500"
                                            )}>
                                                €{Math.floor(day.balance).toLocaleString('de-DE')}
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
                ))}
            </div>

            {/* MOBILE: FUTURE BALANCE LIST (Visible on Mobile) */}
            <div className="block lg:hidden w-full space-y-8">
                {monthsData.map((month, idx) => (
                    <div key={idx} className="w-full">
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

                                // Filter events for this day
                                const dayEvents = [
                                    ...events.filter(e => e.date === day.date).map(e => ({ ...e, source: 'event' as const })),
                                    ...realExpenses.filter(e => e.date === day.date).map(e => ({ ...e, type: 'expense' as const, source: 'realExpense' as const, isRecurring: false }))
                                ];

                                // DEBUG LOG
                                if (dayEvents.length > 0 || realExpenses.length > 0) {
                                    console.log(`[Mobile List] Day: ${day.date}`, {
                                        globalRealExpenses: realExpenses,
                                        dayEventsMapped: dayEvents
                                    });
                                }

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
                                                        <div onClick={(e) => e.stopPropagation()} className="relative">
                                                            <span className="absolute -top-3 left-1/2 -translate-x-1/2 text-[8px] font-bold text-neutral-600 uppercase tracking-wider whitespace-nowrap">Diario</span>
                                                            <input
                                                                type="number"
                                                                className="w-16 bg-white/5 rounded-lg px-2 py-1 text-center font-bold text-neutral-300 text-sm focus:outline-none focus:bg-white/10 focus:text-white transition-colors"
                                                                value={day.plannedExpense}
                                                                onChange={(e) => setDailyOverride({ date: day.date, budget: Number(e.target.value) })}
                                                            />
                                                        </div>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Content - Right: Running Balance */}
                                            <div className="flex flex-col items-end text-right w-28 relative z-10">
                                                {!isExpanded && (
                                                    <>
                                                        <span className={cn("text-lg font-bold font-mono tracking-tight drop-shadow-sm", day.status === 'solid' ? "text-white" : "text-white")}>
                                                            €{Math.floor(day.balance).toLocaleString('de-DE')}
                                                        </span>
                                                        <div className="flex items-center gap-1">
                                                            {dailyNet !== 0 ? (
                                                                <span className={cn(
                                                                    "text-[10px] font-bold",
                                                                    dailyNet > 0 ? "text-emerald-400" : "text-red-400"
                                                                )}>
                                                                    {dailyNet > 0 ? '+' : ''}{Math.round(dailyNet)}€
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
                                                            €{Math.floor(day.balance).toLocaleString('de-DE')}
                                                        </span>
                                                    </div>
                                                    <div className="flex flex-col items-end gap-1 px-4 py-2 bg-white/[0.03] rounded-xl border border-white/5">
                                                        <span className="text-[10px] text-neutral-400 font-medium uppercase tracking-wider">Flujo Neto</span>
                                                        <span className={cn("text-lg font-bold font-mono", dailyNet >= 0 ? "text-emerald-400" : "text-rose-400")}>
                                                            {dailyNet > 0 ? '+' : ''}{Math.round(dailyNet)}€
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
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setTxModal({
                                                                    isOpen: true,
                                                                    type: event.type,
                                                                    date: event.date || day.date,
                                                                    editingId: event.id,
                                                                    editingSource: event.source,
                                                                    initialData: { amount: event.amount, category: event.category, description: '' }
                                                                });
                                                            }}
                                                            className="flex justify-between items-center bg-white/[0.03] p-3 rounded-xl border border-white/[0.02] cursor-pointer hover:bg-white/[0.05] transition-colors"
                                                        >
                                                            <div className="flex items-center gap-3">
                                                                <div className={cn("w-1 h-8 rounded-full", event.type === 'income' ? 'bg-emerald-500' : 'bg-red-500')} />
                                                                <div className="flex flex-col">
                                                                    <span className="text-sm font-bold text-white">{event.category}</span>
                                                                    <span className="text-[9px] text-neutral-500 uppercase tracking-wider">{event.type === 'income' ? 'Ingreso' : 'Gasto Variable'}</span>
                                                                </div>
                                                            </div>
                                                            <span className={cn("font-mono font-bold text-sm", event.type === 'income' ? "text-emerald-400" : "text-red-400")}>
                                                                {event.type === 'income' ? '+' : ''}{event.amount}€
                                                            </span>
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
                ))}
            </div>

            {/* STATS SECTION (Bottom) */}
            <div className="w-full max-w-[1800px] mx-auto mt-12">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                    {/* Categories Chart (2/3) */}
                    <CategoryBreakdownWidget
                        totalIncome={totalIncome}
                        totalExpenses={totalExpenses}
                        categories={categoryData}
                        monthLabel={format(currentDate, 'MMM yyyy', { locale: dateLocale })}
                    />

                    {/* Savings Summary Widget (1/3) */}
                    <div className="bg-[#050505] rounded-[24px] border border-white/10 p-8 flex flex-col relative overflow-hidden group shadow-2xl">
                        <div className="absolute top-0 right-0 p-32 bg-emerald-500/5 rounded-full blur-3xl group-hover:bg-emerald-500/10 transition-all duration-1000 transform translate-x-1/2 -translate-y-1/2"></div>

                        <div className="flex items-center gap-3 mb-8 relative z-10">
                            <div className="p-3 bg-emerald-500/10 rounded-xl text-emerald-400">
                                <Target size={20} />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-white leading-tight">Meta Anual</h3>
                                <p className="text-xs text-neutral-500 uppercase tracking-wider font-bold">Progreso de Ahorro</p>
                            </div>
                        </div>

                        <div className="flex-1 flex flex-col justify-center items-center relative z-10">
                            <div className="relative w-48 h-48 mb-6">
                                <svg className="w-full h-full transform -rotate-90">
                                    <circle cx="96" cy="96" r="88" stroke="#1a1a1a" strokeWidth="12" fill="transparent" />
                                    <circle cx="96" cy="96" r="88" stroke="#10b981" strokeWidth="12" fill="transparent"
                                        strokeDasharray={552}
                                        strokeDashoffset={strokeDashoffset}
                                        className="transition-all duration-1000 ease-out"
                                        strokeLinecap="round"
                                    />
                                </svg>
                                <div className="absolute inset-0 flex items-center justify-center flex-col">
                                    <span className="text-4xl font-bold text-white tracking-tighter">
                                        {Math.round(savingsProgress)}%
                                    </span>
                                    <span className="text-xs text-emerald-500 font-bold uppercase mt-1">Completado</span>
                                </div>
                            </div>

                            <div className="text-center">
                                <p className="text-3xl font-bold text-white tracking-tight mb-1">
                                    €{currentSaved.toLocaleString()}
                                </p>
                                <p className="text-sm text-neutral-500 font-medium">
                                    de <span className="text-neutral-300">€{annualGoal.toLocaleString()}</span> objetivo
                                </p>
                            </div>
                        </div>

                        <button
                            onClick={() => setIsGoalsOpen(true)}
                            className="mt-8 w-full py-4 bg-white/5 hover:bg-white/10 border border-white/5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all text-white flex items-center justify-center gap-2 group-hover:border-emerald-500/30"
                        >
                            Ver Detalles <Target size={14} className="opacity-50" />
                        </button>
                    </div>

                </div>
            </div>

            {/* 6. CASH FLOW WAVE CHART (Moved to Bottom) */}
            <div className="w-full max-w-[1800px] mx-auto mt-12 mb-12">
                <CashFlowChart data={safemetric_chartData} />
            </div>

            {/* MODALS */}
            {isGoalsOpen && (
                <SavingsGoalsModal onClose={() => setIsGoalsOpen(false)} />
            )}

            {isBudgetOpen && (
                <BudgetModal onClose={() => setIsBudgetOpen(false)} />
            )}

            {isAlertsOpen && (
                <AlertsModal onClose={() => setIsAlertsOpen(false)} monthsData={monthsData} />
            )}

            {dayDetailsDate && (
                <DayDetailsModal
                    date={dayDetailsDate}
                    onClose={() => setDayDetailsDate(null)}
                />
            )}

            <TransactionModal
                isOpen={txModal.isOpen}
                onClose={() => setTxModal({ ...txModal, isOpen: false, editingId: undefined, editingSource: undefined, initialData: undefined })}
                type={txModal.type}
                date={txModal.date}
                isGlobal={txModal.isGlobal}
                initialData={txModal.initialData}
                onSave={handleAddTransaction}
                onDelete={txModal.editingId ? handleDeleteTransaction : undefined}
            />
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
