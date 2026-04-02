import { useMemo, useState } from 'react';
import { TrendingUp, TrendingDown, Activity, Wallet, Target, Brain, Zap } from 'lucide-react';
import { motion } from 'framer-motion';
import { useHabitStore } from '../habits/useHabitStore';
import { useFinanceStore } from '../finance/useFinanceStore';
import { format, subDays, eachDayOfInterval, getDay } from 'date-fns';
import { es } from 'date-fns/locale';
import {
    ComposedChart, Bar, XAxis, YAxis, Tooltip,
    ResponsiveContainer, CartesianGrid, Area, Cell
} from 'recharts';
import { cn } from '../../utils/cn';

const DAY_LABELS = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];

type Period = '7d' | '14d' | '30d';

export default function StatsPage() {
    const { habits, getCongruence, manifesto } = useHabitStore();
    const { events, realExpenses } = useFinanceStore();
    const [period, setPeriod] = useState<Period>('14d');

    const periodDays = period === '7d' ? 7 : period === '14d' ? 14 : 30;

    // --- Congruence averages ---
    const last30Days = useMemo(() => eachDayOfInterval({ start: subDays(new Date(), 29), end: new Date() }), []);
    const lastWeek = useMemo(() => eachDayOfInterval({ start: subDays(new Date(), 6), end: new Date() }), []);
    const prevWeek = useMemo(() => eachDayOfInterval({ start: subDays(new Date(), 13), end: subDays(new Date(), 7) }), []);

    const avgCongruence30d = useMemo(() => {
        if (habits.length === 0) return 0;
        const sum = last30Days.reduce((acc, d) => acc + getCongruence(format(d, 'yyyy-MM-dd')), 0);
        return Math.round(sum / 30);
    }, [last30Days, getCongruence, habits.length]);

    const avgCongruenceThisWeek = useMemo(() => {
        if (habits.length === 0) return 0;
        const sum = lastWeek.reduce((acc, d) => acc + getCongruence(format(d, 'yyyy-MM-dd')), 0);
        return Math.round(sum / 7);
    }, [lastWeek, getCongruence, habits.length]);

    const avgCongruencePrevWeek = useMemo(() => {
        if (habits.length === 0) return 0;
        const sum = prevWeek.reduce((acc, d) => acc + getCongruence(format(d, 'yyyy-MM-dd')), 0);
        return Math.round(sum / 7);
    }, [prevWeek, getCongruence, habits.length]);

    const congruenceTrend = avgCongruenceThisWeek - avgCongruencePrevWeek;

    // --- Chart Data ---
    const chartData = useMemo(() => {
        const days = eachDayOfInterval({ start: subDays(new Date(), periodDays - 1), end: new Date() });
        return days.map(date => {
            const dateStr = format(date, 'yyyy-MM-dd');
            const congruence = getCongruence(dateStr);
            const dayIncome = events.filter(e => e.date === dateStr && e.type === 'income').reduce((s, e) => s + e.amount, 0);
            const dayExpenses = realExpenses.filter(e => e.date === dateStr).reduce((s, e) => s + e.amount, 0);
            return {
                date: format(date, period === '30d' ? 'dd/MM' : 'dd MMM', { locale: es }),
                congruence,
                netFlow: dayIncome - dayExpenses,
                expenses: dayExpenses,
            };
        });
    }, [events, realExpenses, getCongruence, periodDays, period]);

    // --- Finance totals ---
    const totalNetFlow = chartData.reduce((acc, d) => acc + d.netFlow, 0);
    const totalExpenses = chartData.reduce((acc, d) => acc + d.expenses, 0);

    // Previous period for trend
    const prevChartData = useMemo(() => {
        const days = eachDayOfInterval({ start: subDays(new Date(), periodDays * 2 - 1), end: subDays(new Date(), periodDays) });
        return days.map(date => {
            const dateStr = format(date, 'yyyy-MM-dd');
            const dayIncome = events.filter(e => e.date === dateStr && e.type === 'income').reduce((s, e) => s + e.amount, 0);
            const dayExpenses = realExpenses.filter(e => e.date === dateStr).reduce((s, e) => s + e.amount, 0);
            return { netFlow: dayIncome - dayExpenses, expenses: dayExpenses };
        });
    }, [events, realExpenses, periodDays]);

    const prevNetFlow = prevChartData.reduce((acc, d) => acc + d.netFlow, 0);
    const prevExpenses = prevChartData.reduce((acc, d) => acc + d.expenses, 0);
    const netFlowTrend = totalNetFlow - prevNetFlow;
    const expensesTrend = totalExpenses - prevExpenses;

    // --- Heatmap (35 days, aligned to week) ---
    const heatmapData = useMemo(() => {
        const end = new Date();
        const start = subDays(end, 34);
        const days = eachDayOfInterval({ start, end });
        // Find what day of week the first day is (Mon=0)
        const firstDow = (getDay(start) + 6) % 7; // convert Sun=0 to Mon=0
        const padded: (null | { date: Date; value: number })[] = [
            ...Array(firstDow).fill(null),
            ...days.map(date => ({ date, value: getCongruence(format(date, 'yyyy-MM-dd')) }))
        ];
        return padded;
    }, [getCongruence]);

    // --- Say-Do Ratio ---
    const sayDoRatio = avgCongruence30d;
    const sayDoLabel =
        sayDoRatio >= 90 ? 'Alta congruencia' :
        sayDoRatio >= 70 ? 'Buena alineación' :
        sayDoRatio >= 50 ? 'En progreso' :
        sayDoRatio > 0 ? 'Brecha alta' : 'Sin datos';
    const sayDoColor =
        sayDoRatio >= 90 ? 'text-emerald-400' :
        sayDoRatio >= 70 ? 'text-cyan-400' :
        sayDoRatio >= 50 ? 'text-yellow-400' : 'text-rose-400';
    const sayDoBarColor =
        sayDoRatio >= 90 ? 'bg-emerald-400' :
        sayDoRatio >= 70 ? 'bg-cyan-400' :
        sayDoRatio >= 50 ? 'bg-yellow-400' : 'bg-rose-400';

    const totalHabits = habits.length;

    return (
        <div className="min-h-screen w-full bg-[#020508] text-white p-6 md:p-8 font-sans overflow-y-auto pb-32">

            {/* Header */}
            <header className="mb-8">
                <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-white mb-1">
                    Inteligencia Personal
                </h1>
                <p className="text-neutral-500 text-sm font-medium">
                    {format(new Date(), "EEEE d 'de' MMMM", { locale: es })} · datos reales, sin interpretación
                </p>
            </header>

            {/* SAY-DO RATIO — Hero metric */}
            <div className="relative w-full rounded-2xl border border-white/5 bg-[#0a0a0a] p-6 md:p-8 mb-6 overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 via-transparent to-transparent pointer-events-none" />
                <div className="relative z-10 flex flex-col md:flex-row md:items-center gap-6">
                    <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                            <Brain size={14} className="text-cyan-400" />
                            <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest">Say-Do Ratio · 30 días</span>
                        </div>
                        <div className="flex items-end gap-3 mb-3">
                            <span className={cn("text-6xl font-black font-mono tracking-tight", sayDoColor)}>
                                {sayDoRatio}%
                            </span>
                            <span className="text-neutral-500 text-sm mb-2">{sayDoLabel}</span>
                        </div>
                        <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
                            <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${sayDoRatio}%` }}
                                transition={{ duration: 1.2, ease: 'easeOut' }}
                                className={cn("h-full rounded-full", sayDoBarColor)}
                            />
                        </div>
                        <p className="text-[11px] text-neutral-600 mt-2">
                            Brecha entre lo que declaras ser y lo que haces cada día.
                        </p>
                    </div>

                    {/* Week trend */}
                    <div className="flex flex-col items-center justify-center min-w-[140px] border border-white/5 rounded-xl p-4 bg-white/[0.02]">
                        <span className="text-[9px] font-bold text-neutral-600 uppercase tracking-widest mb-1">Esta semana</span>
                        <span className={cn("text-3xl font-black font-mono", avgCongruenceThisWeek >= avgCongruencePrevWeek ? "text-emerald-400" : "text-rose-400")}>
                            {avgCongruenceThisWeek}%
                        </span>
                        <div className={cn("flex items-center gap-1 text-[10px] font-bold mt-1", congruenceTrend >= 0 ? "text-emerald-500" : "text-rose-500")}>
                            {congruenceTrend >= 0 ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                            {congruenceTrend >= 0 ? '+' : ''}{congruenceTrend}% vs semana ant.
                        </div>
                    </div>
                </div>
            </div>

            {/* 4 Metric cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                {/* Hábitos activos */}
                <div className="rounded-2xl border border-white/5 bg-[#0a0a0a] p-5 flex flex-col gap-2 hover:border-white/10 transition-colors">
                    <div className="flex items-center gap-2">
                        <Target size={12} className="text-purple-400" />
                        <span className="text-[9px] font-bold text-neutral-500 uppercase tracking-widest">Hábitos activos</span>
                    </div>
                    <span className="text-3xl font-black text-white">{totalHabits}</span>
                    <span className="text-[10px] text-neutral-600">
                        {habits.filter(h => h.type === 'boolean').length} simples · {habits.filter(h => h.type === 'numeric').length} medibles
                    </span>
                </div>

                {/* Mejor racha */}
                <div className="rounded-2xl border border-white/5 bg-[#0a0a0a] p-5 flex flex-col gap-2 hover:border-white/10 transition-colors">
                    <div className="flex items-center gap-2">
                        <Zap size={12} className="text-yellow-400" />
                        <span className="text-[9px] font-bold text-neutral-500 uppercase tracking-widest">Días activos (30d)</span>
                    </div>
                    <span className="text-3xl font-black text-white">
                        {last30Days.filter(d => getCongruence(format(d, 'yyyy-MM-dd')) > 0).length}
                    </span>
                    <span className="text-[10px] text-neutral-600">de 30 días con registro</span>
                </div>

                {/* Flujo neto */}
                <div className="rounded-2xl border border-white/5 bg-[#0a0a0a] p-5 flex flex-col gap-2 hover:border-white/10 transition-colors">
                    <div className="flex items-center gap-2">
                        <Wallet size={12} className="text-cyan-400" />
                        <span className="text-[9px] font-bold text-neutral-500 uppercase tracking-widest">Flujo neto ({period})</span>
                    </div>
                    <span className={cn("text-3xl font-black font-mono", totalNetFlow >= 0 ? "text-emerald-400" : "text-rose-400")}>
                        {totalNetFlow >= 0 ? '+' : ''}€{totalNetFlow.toLocaleString('de-DE')}
                    </span>
                    <div className={cn("flex items-center gap-1 text-[10px] font-bold", netFlowTrend >= 0 ? "text-emerald-600" : "text-rose-600")}>
                        {netFlowTrend >= 0 ? <TrendingUp size={9} /> : <TrendingDown size={9} />}
                        {netFlowTrend >= 0 ? '+' : ''}€{netFlowTrend.toLocaleString('de-DE')} vs período ant.
                    </div>
                </div>

                {/* Gastos */}
                <div className="rounded-2xl border border-white/5 bg-[#0a0a0a] p-5 flex flex-col gap-2 hover:border-white/10 transition-colors">
                    <div className="flex items-center gap-2">
                        <Activity size={12} className="text-rose-400" />
                        <span className="text-[9px] font-bold text-neutral-500 uppercase tracking-widest">Gastos ({period})</span>
                    </div>
                    <span className="text-3xl font-black font-mono text-white">
                        €{Math.abs(totalExpenses).toLocaleString('de-DE')}
                    </span>
                    <div className={cn("flex items-center gap-1 text-[10px] font-bold", expensesTrend <= 0 ? "text-emerald-600" : "text-rose-600")}>
                        {expensesTrend <= 0 ? <TrendingDown size={9} /> : <TrendingUp size={9} />}
                        {expensesTrend >= 0 ? '+' : ''}€{expensesTrend.toLocaleString('de-DE')} vs período ant.
                    </div>
                </div>
            </div>

            {/* Main chart + Heatmap */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">

                {/* Correlation Chart */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="lg:col-span-2 rounded-2xl border border-white/5 bg-[#0a0a0a] p-6 relative overflow-hidden"
                >
                    <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none" />
                    <div className="flex items-center justify-between mb-6 relative z-10">
                        <div>
                            <h3 className="text-base font-bold text-white flex items-center gap-2">
                                <Activity size={16} className="text-cyan-400" />
                                Disciplina vs Finanzas
                            </h3>
                            <p className="text-[11px] text-neutral-600 mt-0.5">% hábitos completados · flujo de caja diario</p>
                        </div>
                        {/* Period selector */}
                        <div className="flex items-center bg-[#111] rounded-xl border border-white/5 p-0.5 gap-0.5">
                            {(['7d', '14d', '30d'] as Period[]).map(p => (
                                <button
                                    key={p}
                                    onClick={() => setPeriod(p)}
                                    className={cn(
                                        "px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all uppercase tracking-widest",
                                        period === p ? "bg-white text-black" : "text-neutral-500 hover:text-white"
                                    )}
                                >
                                    {p}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <ComposedChart data={chartData} margin={{ top: 10, right: 10, bottom: 10, left: -10 }}>
                                <defs>
                                    <linearGradient id="colorCongruence" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#22d3ee" stopOpacity={0.2} />
                                        <stop offset="95%" stopColor="#22d3ee" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08" vertical={false} />
                                <XAxis dataKey="date" stroke="#333" tick={{ fill: '#525252', fontSize: 9 }} axisLine={false} tickLine={false} />
                                <YAxis yAxisId="left" stroke="#333" tick={{ fill: '#525252', fontSize: 9 }} axisLine={false} tickLine={false} unit="%" domain={[0, 100]} />
                                <YAxis yAxisId="right" orientation="right" stroke="#333" tick={{ fill: '#525252', fontSize: 9 }} axisLine={false} tickLine={false} unit="€" />
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#0d0d0d', borderColor: '#222', borderRadius: '12px', fontSize: '11px' }}
                                    itemStyle={{ fontWeight: 'bold' }}
                                    labelStyle={{ color: '#888', fontSize: '10px' }}
                                />
                                <Bar yAxisId="right" dataKey="netFlow" name="Flujo Neto" barSize={period === '30d' ? 6 : 10} radius={[3, 3, 0, 0]}>
                                    {chartData.map((entry, i) => (
                                        <Cell key={`cell-${i}`} fill={entry.netFlow >= 0 ? '#10b981' : '#f43f5e'} />
                                    ))}
                                </Bar>
                                <Area yAxisId="left" type="monotone" dataKey="congruence" name="Congruencia" stroke="#22d3ee" fill="url(#colorCongruence)" strokeWidth={2.5} dot={false} activeDot={{ r: 5, fill: '#22d3ee', strokeWidth: 0 }} />
                            </ComposedChart>
                        </ResponsiveContainer>
                    </div>

                    {/* Legend */}
                    <div className="flex items-center gap-4 mt-2 relative z-10">
                        <div className="flex items-center gap-1.5">
                            <div className="w-3 h-0.5 bg-cyan-400 rounded" />
                            <span className="text-[10px] text-neutral-500">Congruencia %</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <div className="w-3 h-2 bg-emerald-500 rounded-sm" />
                            <span className="text-[10px] text-neutral-500">Flujo neto +</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <div className="w-3 h-2 bg-rose-500 rounded-sm" />
                            <span className="text-[10px] text-neutral-500">Flujo neto −</span>
                        </div>
                    </div>
                </motion.div>

                {/* Heatmap */}
                <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="lg:col-span-1 rounded-2xl border border-white/5 bg-[#0a0a0a] p-6 flex flex-col"
                >
                    <div className="flex items-center gap-2 mb-4">
                        <div className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_#34d399]" />
                        <h3 className="text-base font-bold text-white">Consistencia · 35d</h3>
                    </div>

                    {/* Day labels */}
                    <div className="grid grid-cols-7 gap-1.5 mb-1">
                        {DAY_LABELS.map(d => (
                            <div key={d} className="text-center text-[8px] font-bold text-neutral-600 uppercase">{d}</div>
                        ))}
                    </div>

                    {/* Grid */}
                    <div className="grid grid-cols-7 gap-1.5 flex-1 content-start">
                        {heatmapData.map((day, i) => (
                            day === null ? (
                                <div key={`pad-${i}`} />
                            ) : (
                                <div
                                    key={i}
                                    className={cn(
                                        "aspect-square rounded-md transition-all duration-300 relative group cursor-default",
                                        day.value >= 100 ? "bg-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.5)]" :
                                        day.value >= 75  ? "bg-cyan-600" :
                                        day.value >= 50  ? "bg-cyan-800/80" :
                                        day.value >= 25  ? "bg-cyan-900/60" :
                                        day.value > 0    ? "bg-cyan-950/80" : "bg-white/[0.03]"
                                    )}
                                    title={`${format(day.date, 'dd MMM', { locale: es })}: ${day.value}%`}
                                >
                                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 text-[7px] font-bold text-white/80 pointer-events-none">
                                        {day.value}%
                                    </div>
                                </div>
                            )
                        ))}
                    </div>

                    {/* Intensity legend */}
                    <div className="flex items-center gap-1.5 mt-4 justify-center">
                        <span className="text-[9px] text-neutral-600 mr-1">Menos</span>
                        {['bg-white/[0.03]', 'bg-cyan-950/80', 'bg-cyan-900/60', 'bg-cyan-800/80', 'bg-cyan-600', 'bg-cyan-400'].map((c, i) => (
                            <div key={i} className={cn("w-3 h-3 rounded-sm", c)} />
                        ))}
                        <span className="text-[9px] text-neutral-600 ml-1">Más</span>
                    </div>
                </motion.div>
            </div>

            {/* Identity anchors (if manifesto exists) */}
            {manifesto?.identityStatement && (
                <div className="rounded-2xl border border-white/5 bg-[#0a0a0a] p-6">
                    <div className="flex items-center gap-2 mb-4">
                        <Brain size={14} className="text-violet-400" />
                        <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest">Tu ancla de identidad</span>
                    </div>
                    <p className="text-white font-semibold text-lg leading-snug mb-4">"{manifesto.identityStatement}"</p>
                    {manifesto.beliefs?.empowering && manifesto.beliefs.empowering.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                            {manifesto.beliefs.empowering.filter(b => b.trim()).map((belief, i) => (
                                <span key={i} className="text-[11px] font-medium text-violet-300 bg-violet-500/10 border border-violet-500/20 px-3 py-1 rounded-full">
                                    Soy el tipo de persona que {belief}
                                </span>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
