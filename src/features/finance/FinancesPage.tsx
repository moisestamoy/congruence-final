import { useState, useMemo, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { format, addMonths, parseISO, isSameMonth, startOfToday } from 'date-fns';
import { es, enUS, pt } from 'date-fns/locale';
import { useFinanceStore } from './useFinanceStore';
import { DailyProjectionEngine } from './DailyProjectionEngine';
import { cn } from '../../utils/cn';
import { Info, Target, Plus, Minus, ChevronUp, Calculator, RotateCcw, TrendingDown, TrendingUp, Minus as MinusIcon, AlertCircle, Edit3, Check, Trophy, Repeat, Sparkles } from 'lucide-react';
import { SavingsGoalsModal } from './SavingsGoalsModal';
import { TransactionModal } from './TransactionModal';
import { CashFlowChart } from './CashFlowChart';
import { CategoryBreakdownWidget } from './CategoryBreakdownWidget';
import { FinanceCoach } from './FinanceCoach';
import { DayDetailsModal } from './DayDetailsModal';
import { BudgetModal } from './BudgetModal';
import { AlertsModal } from './AlertsModal';
import { RestartModal } from './RestartModal';
import { CategoryBudgetsPanel } from './CategoryBudgetsPanel';
import { AnnualChart } from './AnnualChart';
import { useFabStore } from '../../hooks/useFabStore';

// Returns the events that apply on a given date, RECURRING-AWARE — mirrors the
// matching logic in DailyProjectionEngine. A recurring event repeats on its
// day-of-month for every month from its start month onward. Non-recurring
// events match only their exact date.
function eventsOnDate(events: any[], dateStr: string) {
    const [y, m, d] = dateStr.split('-');
    const targetYM = `${y}-${m}`;
    const dayOfMonth = parseInt(d, 10);
    const daysInMonth = new Date(parseInt(y, 10), parseInt(m, 10), 0).getDate();
    return events.filter((e: any) => {
        if (e.isRecurring) {
            const [eY, eM, eD] = e.date.split('-');
            const startYM = `${eY}-${eM}`;
            if (targetYM < startYM) return false;
            const effectiveDay = Math.min(parseInt(eD, 10), daysInMonth);
            return effectiveDay === dayOfMonth;
        }
        return e.date === dateStr;
    });
}

export default function FinancesPage() {
    const { i18n } = useTranslation();
    const { config, events, overrides, realExpenses, setDailyOverride, addTransaction, updateTransaction, deleteTransaction, makeRecurring, savingsGoals, savingsEntries, updateConfig } = useFinanceStore();

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
    const [isRestartOpen, setIsRestartOpen] = useState(false);
    const [expandedDay, setExpandedDay] = useState<string | null>(null);
    const [txModal, setTxModal] = useState<{
        isOpen: boolean;
        type: 'income' | 'expense';
        date: string;
        isGlobal?: boolean;
        editingId?: string;
        editingSource?: 'event' | 'realExpense';
        initialData?: { amount: number; category: string; description?: string };
        defaultIsRecurring?: boolean;
    }>({ isOpen: false, type: 'income', date: '' });
    const [dayDetailsDate, setDayDetailsDate] = useState<string | null>(null);
    const [editingBalance, setEditingBalance] = useState(false);
    const [draftBalance, setDraftBalance] = useState('');
    const [isBudgetsOpen, setIsBudgetsOpen] = useState(false);
    const [isCoachOpen, setIsCoachOpen] = useState(false);
    const { fabActionTick } = useFabStore();

    // Saves "saldo actual de hoy" back-calculating the correct initialBalance
    // so projections don't double-subtract past expenses.
    // actualBalanceDisplay stores the user-entered value for display purposes.
    const saveCurrentBalance = (userInput: number) => {
        const todayStr = format(startOfToday(), 'yyyy-MM-dd');
        const todayProjection = projections.find((d: any) => d.date === todayStr);
        if (todayProjection) {
            const netFlowToToday = todayProjection.balance - config.initialBalance;
            updateConfig({
                initialBalance: userInput - netFlowToToday,
                actualBalanceDisplay: userInput,
            });
        } else {
            updateConfig({ initialBalance: userInput, actualBalanceDisplay: userInput });
        }
    };

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

    const handleAddTransaction = (amount: number, category: string, description: string, globalDate?: string, globalType?: 'income' | 'expense', isRecurring?: boolean) => {
        const targetDate = globalDate || txModal.date;
        const targetType = globalType || txModal.type;
        if (!targetDate) return;

        if (txModal.editingId && txModal.editingSource) {
            // Pass isRecurring directly — updateTransaction sets it to the exact value
            // (and migrates realExpense → event when it becomes recurring)
            updateTransaction(txModal.editingId, txModal.editingSource, {
                amount,
                category,
                date: targetDate,
                type: targetType,
                note: description,
                isRecurring: isRecurring ?? false,
            });
        } else {
            addTransaction(targetDate, targetType, amount, category, isRecurring);
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
        // Determine where to start the balance walk
        const cycleStart = config.cycleStartYearMonth
            ? new Date(config.cycleStartYearMonth + '-01')
            : (() => {
                const allDates = [
                    ...events.map((e: any) => e.date),
                    ...realExpenses.map((e: any) => e.date)
                ].sort();
                return allDates.length > 0
                    ? new Date(allDates[0].substring(0, 7) + '-01')
                    : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
            })();

        let runningBalance = config.initialBalance;
        const currentMonthStart = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);

        // Walk from cycleStart up to (but not including) currentDate to accumulate balance
        let walkDate = new Date(cycleStart.getFullYear(), cycleStart.getMonth(), 1);
        while (walkDate < currentMonthStart) {
            const walkProjs = DailyProjectionEngine.generateMonthProjection(
                walkDate.getFullYear(),
                walkDate.getMonth(),
                config,
                events,
                overrides,
                realExpenses,
                runningBalance
            );
            if (walkProjs.length > 0) {
                runningBalance = walkProjs[walkProjs.length - 1].balance;
            }
            walkDate = addMonths(walkDate, 1);
        }

        // Generate the visible horizon from the accumulated balance
        let allProjections: any[] = [];
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
            // 1. Income (from Events) — recurring-aware
            const dayEvents = eventsOnDate(events, day.date);

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

    // Category spending map for CategoryBudgetsPanel
    const currentMonthSpending = useMemo(() => {
        const map: Record<string, number> = {};
        displayedMonthData.forEach(day => {
            realExpenses.filter(e => e.date === day.date).forEach(e => {
                const cat = e.category || '📦 Otros';
                map[cat] = (map[cat] || 0) + e.amount;
            });
            eventsOnDate(events, day.date).filter(e => e.type === 'expense').forEach(e => {
                const cat = e.category || '📦 Otros';
                map[cat] = (map[cat] || 0) + e.amount;
            });
        });
        return map;
    }, [displayedMonthData, realExpenses, events]);

    const categoryData = categoryBreakdown;

    // Savings Calculations
    const currentYear = new Date().getFullYear();
    const annualGoal = savingsGoals?.annual || 20000;
    // Current balance counts as patrimony already accumulated toward annual goal
    const currentBalanceForSavings = config.actualBalanceDisplay ?? config.initialBalance;
    const currentSaved = currentBalanceForSavings + savingsEntries
        .filter(e => new Date(e.date).getFullYear() === currentYear)
        .reduce((sum, e) => sum + e.amount, 0);
    const savingsProgress = Math.min((currentSaved / annualGoal) * 100, 100);
    const strokeDashoffset = 552 - (552 * savingsProgress) / 100;

    // Command Center Metrics (Safe-to-Spend)
    const today = startOfToday();
    const currentMonthData = monthsData.find(m => isSameMonth(m.date, today));

    let safemetric_projectedEnd = 0;

    if (currentMonthData) {
        safemetric_projectedEnd = currentMonthData.days[currentMonthData.days.length - 1].balance;
    }

    // Currency formatting helper
    const cs = config.currency === 'USD' ? '$' : config.currency === 'GBP' ? '£' : config.currency === 'BRL' ? 'R$' : config.currency === 'MXN' ? '$' : config.currency === 'COP' ? '$' : '€';
    const currencyLocale = config.currencyLocale || 'de-DE';
    // Show cents only when the amount actually has them (1.50 → "€1.50", 10 → "€10")
    const fmtCur = (n: number) => {
        const abs = Math.abs(n);
        const hasCents = abs % 1 !== 0;
        return `${cs}${abs.toLocaleString(currencyLocale, {
            minimumFractionDigits: hasCents ? 2 : 0,
            maximumFractionDigits: 2,
        })}`;
    };

    // Annual goal velocity: how many months until reaching the annual goal
    // Based on monthly income (not net flow) — pure earning rate
    const monthsToGoal = totalIncome > 0 && currentSaved < annualGoal
        ? Math.ceil((annualGoal - currentSaved) / totalIncome)
        : null;
    const goalTargetDate = monthsToGoal != null ? addMonths(today, monthsToGoal) : null;

    return (
        <div className="min-h-screen bg-[#050505] text-white font-sans selection:bg-emerald-500/30 pb-24">
            {/* BACKGROUND AMBIENCE */}
            <div className="fixed inset-0 pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-emerald-500/5 rounded-full blur-[120px]" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-emerald-500/[0.03] rounded-full blur-[120px]" />
            </div>

            <div className="w-full max-w-[1600px] mx-auto p-4 md:p-8 relative z-10 space-y-8">

                {/* --- DESKTOP VIEW: PRO COMMAND CENTER (Hidden on Mobile) --- */}
                <div className="hidden md:block space-y-6">
                    {/* Title Row with inline date navigation */}
                    <div className="flex items-center justify-between gap-4">
                        <div>
                            <h1 className="text-4xl md:text-5xl font-black tracking-tight text-white mb-1">Finanzas</h1>
                            <p className="text-emerald-400/60 text-sm font-medium">Realidad financiera · tú decides qué hacer con ella</p>
                        </div>
                    </div>

                    {/* Metric Cards Row */}
                    {(totalIncome === 0 && totalExpenses === 0) ? (
                        /* Smart empty state */
                        <div className="w-full rounded-2xl border border-white/[0.07] bg-gradient-to-br from-white/[0.04] to-white/[0.01] p-12 flex flex-col items-center justify-center gap-4 text-center">
                            <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center mb-2">
                                <TrendingUp size={32} className="text-neutral-600" />
                            </div>
                            <h3 className="text-xl font-bold text-neutral-300">Sin datos para este período</h3>
                            <p className="text-neutral-500 text-sm max-w-md">Registra ingresos y gastos para ver tu realidad financiera. El dashboard te mostrará los números tal como son, sin juicios.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
                            {/* Card 1: Saldo proyectado */}
                            <div className="rounded-2xl border border-white/[0.07] bg-gradient-to-br from-white/[0.04] to-white/[0.01] p-6 flex flex-col gap-3 hover:border-white/[0.12] transition-colors">
                                <div className="flex items-center justify-between">
                                    <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest">Saldo proyectado fin de mes</span>
                                    {safemetric_projectedEnd >= 0
                                        ? <TrendingUp size={16} className="text-emerald-500" />
                                        : <TrendingDown size={16} className="text-rose-500" />
                                    }
                                </div>
                                <div className={cn("text-4xl font-black font-mono tracking-tight", safemetric_projectedEnd >= 0 ? "text-white" : "text-rose-400")}>
                                    {fmtCur(safemetric_projectedEnd)}
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
                                            onClick={() => { setDraftBalance(String(config.actualBalanceDisplay ?? config.initialBalance)); setEditingBalance(true); }}
                                            className="flex items-center gap-1.5 text-[11px] text-neutral-500 hover:text-white transition-colors group"
                                        >
                                            <span className="font-mono">{fmtCur(config.actualBalanceDisplay ?? config.initialBalance)}</span>
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
                    )}

                    {/* CONTROL BAR — simplified */}
                    <div className="sticky top-4 z-40 bg-[#0a0a0a]/80 backdrop-blur-xl border border-white/10 p-2 rounded-[24px] shadow-2xl flex items-center justify-between gap-4 w-full">
                        <div className="flex items-center gap-2">
                            <button onClick={() => setIsRestartOpen(true)} className="flex justify-center items-center p-2 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20 hover:bg-rose-500/20 hover:border-rose-500/50 transition-all" title="Reiniciar todo">
                                <RotateCcw size={16} />
                            </button>
                            <button onClick={() => setIsAlertsOpen(true)} className="flex items-center gap-2 px-3 py-2 text-blue-400/50 hover:text-blue-400 transition-colors cursor-pointer" title="Ver alertas">
                                <div className="relative">
                                    <Info size={18} />
                                    <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
                                </div>
                            </button>
                        </div>
                        <div className="flex items-center gap-2">
                            <button onClick={() => setIsCoachOpen(true)} className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-violet-500/10 text-violet-300 border border-violet-500/20 text-[10px] font-bold uppercase tracking-widest hover:bg-violet-500/20 hover:border-violet-500/50 transition-all">
                                <Sparkles size={14} /> Coach IA
                            </button>
                            <button onClick={() => setIsBudgetOpen(true)} className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-bold uppercase tracking-widest hover:bg-emerald-500/20 hover:border-emerald-500/50 transition-all">
                                <Calculator size={14} /> Presupuesto
                            </button>
                            <button onClick={() => setIsGoalsOpen(true)} className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500 text-black border border-emerald-400 text-[10px] font-bold uppercase tracking-widest hover:bg-emerald-400 hover:scale-105 active:scale-95 transition-all shadow-[0_0_15px_rgba(16,185,129,0.3)]">
                                <Target size={14} /> Metas
                            </button>
                        </div>
                    </div>
                </div>

                {/* --- MOBILE VIEW: COMPACT FINANCIAL MASTER CARD --- */}
                <div className="block md:hidden space-y-3 relative z-10 w-full mb-4">
                    <div className="relative w-full rounded-[20px] overflow-hidden bg-gradient-to-br from-[#0a0a0a] to-[#050505] border border-white/10 shadow-lg p-5 shrink-0">
                        <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/[0.06] via-emerald-500/[0.02] to-transparent pointer-events-none opacity-50" />

                        <div className="flex justify-between items-center mb-4 relative z-10">
                            <div>
                                <h1 className="text-xl font-black tracking-tight text-white mb-0">Finanzas</h1>
                                <p className="text-xs text-neutral-400 font-medium">Balance General</p>
                            </div>

                            <div className="flex flex-col items-end gap-2">
                                {/* Month nav — bigger touch targets */}
                                <div className="flex bg-white/[0.06] backdrop-blur-md border border-white/10 rounded-xl items-center shadow-md overflow-hidden">
                                    <button
                                        onClick={() => navigateMonth(-1)}
                                        className="w-10 h-10 flex items-center justify-center text-neutral-400 active:bg-white/10 transition-colors"
                                    >
                                        <ChevronUp className="-rotate-90" size={16} />
                                    </button>
                                    <span className="px-2 text-xs font-bold text-neutral-200 min-w-[56px] text-center">
                                        {format(currentDate, 'MMM yy', { locale: dateLocale })}
                                    </span>
                                    <button
                                        onClick={() => navigateMonth(1)}
                                        className="w-10 h-10 flex items-center justify-center text-neutral-400 active:bg-white/10 transition-colors"
                                    >
                                        <ChevronUp className="rotate-90" size={16} />
                                    </button>
                                </div>
                                {/* Horizon buttons — bigger */}
                                <div className="flex bg-white/[0.06] border border-white/10 rounded-xl overflow-hidden shadow-md">
                                    {[1, 2, 3].map(m => (
                                        <button
                                            key={m}
                                            onClick={() => setHorizon(m)}
                                            className={cn(
                                                "min-w-[40px] h-9 text-xs font-bold transition-all uppercase tracking-wide",
                                                horizon === m ? "bg-emerald-500/20 text-emerald-300" : "text-neutral-500"
                                            )}
                                        >
                                            {m}M
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Current/Projected Balance */}
                        <div className="mb-4 relative z-10 flex flex-col items-center border-b border-white/5 pb-4">
                            <span className="text-xs font-bold text-neutral-500 uppercase tracking-widest mb-1">
                                Saldo Fin de Mes
                            </span>
                            <div className={cn(
                                "text-4xl font-black font-mono tracking-tighter drop-shadow-xl",
                                safemetric_projectedEnd >= 0 ? "text-white" : "text-rose-400"
                            )}>
                                {fmtCur(safemetric_projectedEnd)}
                            </div>

                            {/* Monthly Goal Progress */}
                            {savingsGoals?.monthly > 0 && (
                                <div className="mt-3 w-full flex flex-col">
                                    <div className="flex justify-between w-full text-xs font-bold mb-1.5">
                                        <span className="text-neutral-500">Progreso Meta</span>
                                        <span className={netFlow >= savingsGoals.monthly ? "text-emerald-400" : "text-cyan-400"}>
                                            {fmtCur(Math.max(0, netFlow))} / {fmtCur(savingsGoals.monthly)}
                                        </span>
                                    </div>
                                    <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                                        <div
                                            className={cn("h-full rounded-full transition-all duration-1000", netFlow >= savingsGoals.monthly ? "bg-emerald-400 shadow-[0_0_8px_#34d399]" : "bg-cyan-500 shadow-[0_0_8px_#06b6d4]")}
                                            style={{ width: `${Math.max(0, Math.min((netFlow / savingsGoals.monthly) * 100, 100))}%` }}
                                        />
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Income / Expenses Split */}
                        <div className="flex items-stretch gap-3 relative z-10">
                            {/* Income */}
                            <div className="flex-1 bg-white/[0.04] p-3 rounded-2xl border border-white/[0.07] flex flex-col items-center gap-1">
                                <div className="flex items-center gap-1">
                                    <Plus size={12} className="text-emerald-500" />
                                    <span className="text-xs font-bold text-neutral-400 uppercase tracking-wide">Ingresos</span>
                                </div>
                                <span className="text-lg font-bold font-mono text-emerald-400">
                                    {fmtCur(totalIncome)}
                                </span>
                            </div>

                            {/* Expenses */}
                            <div className="flex-1 bg-white/[0.04] p-3 rounded-2xl border border-white/[0.07] flex flex-col items-center gap-1">
                                <div className="flex items-center gap-1">
                                    <Minus size={12} className="text-rose-500" />
                                    <span className="text-xs font-bold text-neutral-400 uppercase tracking-wide">Gastos</span>
                                </div>
                                <span className="text-lg font-bold font-mono text-rose-400">
                                    {fmtCur(totalExpenses)}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Action buttons — proper touch targets (min h-12) */}
                    <div className="bg-[#0a0a0a]/80 backdrop-blur-xl border border-white/10 p-2 rounded-2xl shadow-md sticky top-4 z-40 space-y-2">
                        <button onClick={() => setIsCoachOpen(true)} className="w-full flex justify-center items-center gap-1.5 h-11 rounded-xl bg-violet-500/10 text-violet-300 border border-violet-500/20 text-xs font-bold uppercase tracking-wide active:bg-violet-500/20 transition-all">
                            <Sparkles size={14} /> Coach IA
                        </button>
                        <div className="grid grid-cols-3 gap-2">
                            <button onClick={() => setIsRestartOpen(true)} className="flex justify-center items-center gap-1.5 h-12 rounded-xl bg-rose-500/10 text-rose-400 border border-transparent text-xs font-bold uppercase tracking-wide active:bg-rose-500/20 transition-all">
                                <RotateCcw size={14} /> Reiniciar
                            </button>
                            <button onClick={() => setIsBudgetOpen(true)} className="flex justify-center items-center gap-1.5 h-12 rounded-xl bg-emerald-500/10 text-emerald-400 border border-transparent text-xs font-bold uppercase tracking-wide active:bg-emerald-500/20 transition-all">
                                <Calculator size={14} /> Presup.
                            </button>
                            <button onClick={() => setIsGoalsOpen(true)} className="flex justify-center items-center gap-1.5 h-12 rounded-xl bg-emerald-500 text-black border border-emerald-400 text-xs font-bold uppercase tracking-wide active:bg-emerald-400 transition-all shadow-[0_0_10px_rgba(16,185,129,0.3)]">
                                <Target size={14} /> Metas
                            </button>
                        </div>
                    </div>
                </div>

            </div>

            {/* Month range + horizon selector — sits right above the month panels */}
            <div className="hidden lg:flex w-full max-w-[1800px] mx-auto items-center justify-between gap-2 mb-4 px-1">
                <div className="flex items-center bg-[#111] rounded-2xl border border-white/5 p-1">
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
                <div className="flex items-center bg-white/[0.04] rounded-2xl border border-white/[0.07] p-1 gap-1">
                    {[1, 2, 3, 4, 12].map(m => (
                        <button
                            key={m}
                            onClick={() => setHorizon(m)}
                            className={cn(
                                "px-3 py-1.5 rounded-xl text-[10px] font-bold transition-all uppercase tracking-widest min-w-[32px]",
                                horizon === m ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30" : "text-neutral-500 hover:text-white hover:bg-white/5"
                            )}
                        >
                            {m === 1 && '1M'}{m === 2 && '2M'}{m === 3 && '3M'}{m === 4 && '4M'}{m === 12 && '1A'}
                        </button>
                    ))}
                </div>
            </div>

            {/* DESKTOP: PRO SPREADSHEET (Hidden on Mobile) */}
            <div className="hidden lg:grid w-full max-w-[1800px] mx-auto grid-cols-1 lg:grid-cols-2 gap-8">
                {monthsData.map((month, idx) => (
                    <div key={idx} className="bg-[#050505] rounded-[24px] border border-white/10 overflow-hidden w-full shadow-2xl shadow-black">
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
                                                onClick={() => setDayDetailsDate(day.date)}
                                                className="w-full text-right font-mono font-medium text-emerald-400 cursor-pointer hover:bg-emerald-500/10 rounded-sm px-1 py-0.5 transition-colors min-h-[1.5rem]"
                                            >
                                                {day.income > 0 ? Number(day.income.toFixed(2)) : <span className="text-emerald-500/20 text-[10px]">+</span>}
                                            </div>
                                        </div>

                                        {/* EXPENSES (Salidas) — fixed expense events (incl. recurring) + logged variable */}
                                        <div className="text-right relative">
                                            <div
                                                onClick={() => setDayDetailsDate(day.date)}
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
                        onOpenBudgets={() => setIsBudgetsOpen(true)}
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
                                    {fmtCur(currentSaved)}
                                </p>
                                <p className="text-sm text-neutral-500 font-medium">
                                    de <span className="text-neutral-300">{fmtCur(annualGoal)}</span> objetivo
                                </p>
                            </div>
                        </div>                        <button
                            onClick={() => setIsGoalsOpen(true)}
                            className="mt-8 w-full py-4 bg-white/5 hover:bg-white/10 border border-white/5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all text-white flex items-center justify-center gap-2 group-hover:border-emerald-500/30"
                        >
                            Ver Detalles <Target size={14} className="opacity-50" />
                        </button>
                    </div>

                </div>
            </div>

            {/* CASH FLOW WAVE CHART */}
            <div className="w-full max-w-[1800px] mx-auto mt-12">
                <CashFlowChart data={currentMonthData?.days || []} />
            </div>

            {/* ANNUAL PROJECTION CHART */}
            <div className="w-full max-w-[1800px] mx-auto mt-8 mb-12">
                <AnnualChart fmtCur={fmtCur} />
            </div>

            {/* MODALS */}
            {isBudgetsOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                    <div className="w-full max-w-lg bg-[#0a0a0a] border border-white/10 rounded-2xl shadow-2xl overflow-hidden">
                        <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
                            <span className="text-sm font-bold text-white">Techo por Categoría</span>
                            <button onClick={() => setIsBudgetsOpen(false)} className="text-neutral-500 hover:text-white transition-colors text-lg leading-none">✕</button>
                        </div>
                        <div className="p-2 max-h-[70vh] overflow-y-auto">
                            <CategoryBudgetsPanel currentMonthSpending={currentMonthSpending} fmtCur={fmtCur} />
                        </div>
                    </div>
                </div>
            )}

            {isCoachOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" onClick={() => setIsCoachOpen(false)}>
                    <div className="w-full max-w-md max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                        <FinanceCoach
                            finances={realExpenses}
                            config={config}
                            savingsGoals={savingsGoals}
                            monthIncome={totalIncome}
                            monthExpenses={totalExpenses}
                            categoryBreakdown={categoryData}
                            currentMonth={format(currentDate, 'MMMM yyyy', { locale: dateLocale })}
                            autoStart={true}
                        />
                        <button onClick={() => setIsCoachOpen(false)} className="mt-3 w-full py-2.5 rounded-xl bg-white/5 border border-white/10 text-neutral-400 text-xs font-bold uppercase tracking-widest hover:bg-white/10 hover:text-white transition-all">
                            Cerrar
                        </button>
                    </div>
                </div>
            )}

            {isRestartOpen && (
                <RestartModal onClose={() => setIsRestartOpen(false)} />
            )}

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
                onClose={() => setTxModal({ ...txModal, isOpen: false, editingId: undefined, editingSource: undefined, initialData: undefined, defaultIsRecurring: undefined })}
                type={txModal.type}
                date={txModal.date}
                isGlobal={txModal.isGlobal}
                initialData={txModal.initialData}
                defaultIsRecurring={txModal.defaultIsRecurring}
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
