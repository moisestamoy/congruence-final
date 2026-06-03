import { useMemo } from 'react';
import { TrendingUp, TrendingDown, Flame, Wallet, Calendar } from 'lucide-react';
import { motion } from 'framer-motion';
import { useHabitStore } from '../habits/useHabitStore';
import { useFinanceStore } from '../finance/useFinanceStore';
import { format, subDays, eachDayOfInterval, startOfWeek, endOfWeek, getDay } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '../../utils/cn';

const DAY_LABELS = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];

export default function StatsPage() {
    const { habits, getCongruence } = useHabitStore();
    const { events, realExpenses } = useFinanceStore();

    const today = useMemo(() => new Date(), []);
    const todayStr = format(today, 'yyyy-MM-dd');

    const weekStart = startOfWeek(today, { weekStartsOn: 1 });
    const weekEnd   = endOfWeek(today,   { weekStartsOn: 1 });
    const thisWeekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });

    const prevWeekStart = subDays(weekStart, 7);
    const prevWeekEnd   = subDays(weekEnd,   7);
    const prevWeekDays  = eachDayOfInterval({ start: prevWeekStart, end: prevWeekEnd });

    const calcAvg = (days: Date[]) => {
        if (habits.length === 0) return 0;
        const past = days.filter(d => d <= today);
        if (past.length === 0) return 0;
        const vals = past.map(d => getCongruence(format(d, 'yyyy-MM-dd'))).filter(v => v >= 0);
        if (vals.length === 0) return 0;
        return Math.round(vals.reduce((a, b) => a + b, 0) / vals.length);
    };

    const thisWeekAvg = calcAvg(thisWeekDays);
    const prevWeekAvg = calcAvg(prevWeekDays);
    const weekTrend   = thisWeekAvg - prevWeekAvg;

    // 7-day dot data
    const weekDots = thisWeekDays.map(date => {
        const isFuture = date > today;
        const isToday  = format(date, 'yyyy-MM-dd') === todayStr;
        const value    = isFuture ? -1 : getCongruence(format(date, 'yyyy-MM-dd'));
        const dow      = (getDay(date) + 6) % 7; // Mon=0
        return { value, isFuture, isToday, label: DAY_LABELS[dow] };
    });

    // Streak
    const streak = useMemo(() => {
        let count = 0;
        let d = today;
        for (let i = 0; i < 365; i++) {
            const v = getCongruence(format(d, 'yyyy-MM-dd'));
            if (v > 0) { count++; d = subDays(d, 1); }
            else break;
        }
        return count;
    }, [habits, getCongruence, today]);

    // Days completed this week
    const pastDaysThisWeek     = thisWeekDays.filter(d => d <= today).length;
    const daysCompletedThisWeek = thisWeekDays.filter(d => d <= today && getCongruence(format(d, 'yyyy-MM-dd')) > 0).length;

    // Finance this week
    const weekFinance = thisWeekDays.reduce((acc, date) => {
        const ds = format(date, 'yyyy-MM-dd');
        const income  = events.filter(e => e.date === ds && e.type === 'income').reduce((s, e) => s + e.amount, 0);
        const expense = realExpenses.filter(e => e.date === ds).reduce((s, e) => s + e.amount, 0);
        return acc + income - expense;
    }, 0);

    // Insight
    const insight =
        habits.length === 0
            ? 'Crea tus primeros hábitos para ver tu progreso aquí.'
        : thisWeekAvg === 0
            ? 'Empieza a completar hábitos para ver tu Congruencia esta semana.'
        : weekTrend > 5
            ? `Vas ${weekTrend}% mejor que la semana pasada. Sigue así.`
        : weekTrend < -5
            ? `Bajaste ${Math.abs(weekTrend)}% vs la semana pasada. Todavía tienes tiempo esta semana.`
        : 'Vas al mismo ritmo que la semana pasada.';

    const dotColor = (value: number, isFuture: boolean) => {
        if (isFuture) return {};
        if (value >= 100) return { background: 'rgb(var(--accent-400))', boxShadow: '0 0 10px rgba(var(--accent-500), 0.5)' };
        if (value >= 75)  return { background: 'rgba(var(--accent-500), 0.70)' };
        if (value >= 50)  return { background: 'rgba(var(--accent-500), 0.40)' };
        if (value >= 25)  return { background: 'rgba(var(--accent-500), 0.20)' };
        if (value > 0)    return { background: 'rgba(var(--accent-500), 0.10)' };
        return {};
    };

    return (
        <div className="min-h-screen w-full bg-[#0a0a0a] text-white p-4 md:p-6 lg:p-8 overflow-y-auto pb-40 lg:pb-16">

            {/* Header */}
            <header className="mb-6">
                <p className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color: 'rgb(var(--accent-400))' }}>
                    {format(weekStart, "d MMM", { locale: es })} – {format(weekEnd, "d MMM", { locale: es })}
                </p>
                <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-white">Esta Semana</h1>
            </header>

            {/* Hero — congruencia */}
            <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-5 md:p-7 mb-4 relative overflow-hidden"
            >
                <div className="absolute top-0 right-0 w-56 h-56 rounded-full blur-3xl pointer-events-none" style={{ background: 'rgba(var(--accent-500), 0.06)' }} />
                <div className="relative z-10">
                    <p className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest mb-3">Congruencia · esta semana</p>

                    <div className="flex items-end gap-4 mb-3">
                        <span className="text-6xl md:text-7xl font-black font-mono" style={{ color: 'rgb(var(--accent-400))' }}>
                            {thisWeekAvg}%
                        </span>
                        {prevWeekAvg > 0 && (
                            <div className={cn("flex items-center gap-1 text-sm font-bold mb-2.5", weekTrend >= 0 ? 'text-emerald-400' : 'text-rose-400')}>
                                {weekTrend >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                                {weekTrend >= 0 ? '+' : ''}{weekTrend}% vs sem. ant.
                            </div>
                        )}
                    </div>

                    {/* Progress bar */}
                    <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden mb-5">
                        <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${thisWeekAvg}%` }}
                            transition={{ duration: 1, ease: 'easeOut' }}
                            className="h-full rounded-full"
                            style={{ background: 'rgb(var(--accent-400))' }}
                        />
                    </div>

                    {/* 7-day dots */}
                    <div className="flex gap-2 md:gap-2.5">
                        {weekDots.map(({ value, isFuture, isToday, label }, i) => (
                            <div key={i} className="flex flex-col items-center gap-1.5 flex-1">
                                <div
                                    className={cn(
                                        "w-full aspect-square rounded-lg transition-all",
                                        isToday ? "ring-1" : "",
                                        isFuture ? "bg-white/[0.03] border border-white/[0.06]" :
                                        value === 0 ? "bg-white/[0.04]" : ""
                                    )}
                                    style={{
                                        ...(isToday ? { outlineColor: 'rgb(var(--accent-400))' } : {}),
                                        ...(isToday ? { ringColor: 'rgb(var(--accent-400))' } : {}),
                                        ...dotColor(value, isFuture),
                                    }}
                                />
                                <span className={cn("text-[10px] font-bold", isToday ? '' : "text-neutral-600")} style={isToday ? { color: 'rgb(var(--accent-400))' } : {}}>
                                    {label}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            </motion.div>

            {/* 3 metric cards */}
            <div className="grid grid-cols-3 gap-3 mb-4">
                <div className="rounded-2xl border border-white/[0.07] bg-white/[0.03] p-4">
                    <div className="flex items-center gap-1.5 mb-2">
                        <Flame size={12} className="text-orange-400" />
                        <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-wide">Racha</span>
                    </div>
                    <p className="text-2xl font-black text-white">{streak}<span className="text-neutral-600 text-sm font-bold">d</span></p>
                    <p className="text-[10px] text-neutral-600 mt-0.5">consecutivos</p>
                </div>

                <div className="rounded-2xl border border-white/[0.07] bg-white/[0.03] p-4">
                    <div className="flex items-center gap-1.5 mb-2">
                        <Calendar size={12} style={{ color: 'rgb(var(--accent-400))' }} />
                        <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-wide">Días</span>
                    </div>
                    <p className="text-2xl font-black text-white">
                        {daysCompletedThisWeek}<span className="text-neutral-600 text-sm font-bold">/{pastDaysThisWeek}</span>
                    </p>
                    <p className="text-[10px] text-neutral-600 mt-0.5">completados</p>
                </div>

                <div className="rounded-2xl border border-white/[0.07] bg-white/[0.03] p-4">
                    <div className="flex items-center gap-1.5 mb-2">
                        <Wallet size={12} className="text-emerald-400" />
                        <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-wide">Flujo</span>
                    </div>
                    <p className={cn("text-xl font-black font-mono", weekFinance >= 0 ? 'text-emerald-400' : 'text-rose-400')}>
                        {weekFinance >= 0 ? '+' : ''}{weekFinance.toFixed(0)}
                    </p>
                    <p className="text-[10px] text-neutral-600 mt-0.5">esta semana</p>
                </div>
            </div>

            {/* Insight */}
            <div className="rounded-2xl border border-white/[0.05] bg-white/[0.02] px-5 py-4">
                <p className="text-sm text-neutral-400 italic text-center">{insight}</p>
            </div>
        </div>
    );
}
