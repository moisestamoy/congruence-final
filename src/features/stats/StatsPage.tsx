import { useState, useMemo } from 'react';
import { TrendingUp, TrendingDown, Flame, Calendar, Target, Activity, Zap } from 'lucide-react';
import { useHabitStore } from '../habits/useHabitStore';
import {
    format, subDays, eachDayOfInterval,
    startOfWeek, endOfWeek, startOfMonth, endOfMonth,
    startOfYear, getDay,
} from 'date-fns';
import { es } from 'date-fns/locale';
import {
    AreaChart, Area, XAxis, YAxis, Tooltip,
    ResponsiveContainer, CartesianGrid,
} from 'recharts';
import { cn } from '../../utils/cn';

// ─────────────────────────────────────────────────────────────────────────────
type Period = 'week' | 'month' | 'year' | 'global';
const PERIOD_LABELS: Record<Period, string> = {
    week: 'Esta semana', month: 'Este mes', year: 'Este año', global: 'Global',
};
const DOW_SHORT = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
const DOW_LONG  = ['lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábados', 'domingos'];
// ─────────────────────────────────────────────────────────────────────────────

export default function StatsPage() {
    const [period, setPeriod] = useState<Period>('week');
    const { habits, getCongruence } = useHabitStore();
    const today = useMemo(() => new Date(), []);

    // ── All historical days (from first logged habit to today) ────────────────
    const allDays = useMemo(() => {
        const allDates = habits.flatMap(h => Object.keys(h.logs as Record<string, unknown>));
        if (!allDates.length) return [] as Date[];
        const earliest = new Date(allDates.sort()[0]);
        return eachDayOfInterval({ start: earliest, end: today });
    }, [habits, today]);

    // ── Period days ───────────────────────────────────────────────────────────
    const periodDays = useMemo((): Date[] => {
        switch (period) {
            case 'week':   return eachDayOfInterval({ start: startOfWeek(today, { weekStartsOn: 1 }), end: endOfWeek(today, { weekStartsOn: 1 }) });
            case 'month':  return eachDayOfInterval({ start: startOfMonth(today), end: endOfMonth(today) });
            case 'year':   return eachDayOfInterval({ start: startOfYear(today), end: today });
            case 'global': return allDays;
        }
    }, [period, today, allDays]);

    const pastDays = useMemo(() => periodDays.filter(d => d <= today), [periodDays, today]);

    // ── Bloque 1 — Pulso ─────────────────────────────────────────────────────
    const avgCongruence = useMemo(() => {
        if (!habits.length || !pastDays.length) return 0;
        const vals = pastDays.map(d => getCongruence(format(d, 'yyyy-MM-dd'))).filter(v => v >= 0);
        return vals.length ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : 0;
    }, [pastDays, habits, getCongruence]);

    const activeDays = useMemo(
        () => pastDays.filter(d => getCongruence(format(d, 'yyyy-MM-dd')) > 0).length,
        [pastDays, getCongruence],
    );

    const streak = useMemo(() => {
        let count = 0, d = today;
        for (let i = 0; i < 365; i++) {
            if (getCongruence(format(d, 'yyyy-MM-dd')) > 0) { count++; d = subDays(d, 1); }
            else break;
        }
        return count;
    }, [habits, getCongruence, today]);

    // ── Bloque 2 — Hábitos en detalle ────────────────────────────────────────
    const habitStats = useMemo(() => habits.map(habit => {
        const logs = habit.logs as Record<string, any>;

        const completed = pastDays.filter(d => logs[format(d, 'yyyy-MM-dd')]?.status === 'done').length;
        const rate = pastDays.length > 0 ? Math.round((completed / pastDays.length) * 100) : 0;

        // Current streak for this habit
        let cs = 0, d = today;
        for (let i = 0; i < 365; i++) {
            if (logs[format(d, 'yyyy-MM-dd')]?.status === 'done') { cs++; d = subDays(d, 1); }
            else break;
        }

        // Record streak
        const sorted = Object.keys(logs).sort();
        let maxS = 0, runS = 0;
        sorted.forEach(ds => {
            if (logs[ds]?.status === 'done') { runS++; maxS = Math.max(maxS, runS); }
            else runS = 0;
        });

        // Sparkline: last 14 days — 2=done, 1=paused, 0=missed, -1=no entry
        const sparkline = Array.from({ length: 14 }, (_, i) => {
            const log = logs[format(subDays(today, 13 - i), 'yyyy-MM-dd')];
            if (!log) return -1;
            if (log.status === 'done') return 2;
            if (log.status === 'rest' || log.status === 'emergency') return 1;
            return 0;
        });

        return { habit, rate, currentStreak: cs, recordStreak: maxS, sparkline };
    }).sort((a, b) => b.rate - a.rate), [habits, pastDays, today]);

    // ── Bloque 3 — Gráfica de evolución ──────────────────────────────────────
    const chartData = useMemo(() => {
        if (period === 'week' || period === 'month') {
            return pastDays.map(date => ({
                label: format(date, period === 'week' ? 'EEEEEE' : 'dd', { locale: es }),
                value: Math.max(0, getCongruence(format(date, 'yyyy-MM-dd'))),
            }));
        }
        // Year / Global → aggregate by week
        const weeks: { label: string; value: number }[] = [];
        for (let i = 0; i < pastDays.length; i += 7) {
            const chunk = pastDays.slice(i, i + 7);
            const vals = chunk.map(d => getCongruence(format(d, 'yyyy-MM-dd'))).filter(v => v >= 0);
            if (vals.length) weeks.push({
                label: format(chunk[0], 'dd MMM', { locale: es }),
                value: Math.round(vals.reduce((a, b) => a + b, 0) / vals.length),
            });
        }
        return weeks;
    }, [pastDays, period, getCongruence]);

    // ── Bloque 4 — Patrones (siempre datos globales) ─────────────────────────

    // Day-of-week averages
    const dowStats = useMemo(() => {
        const buckets: number[][] = Array.from({ length: 7 }, () => []);
        allDays.forEach(d => {
            const val = getCongruence(format(d, 'yyyy-MM-dd'));
            if (val >= 0) buckets[(getDay(d) + 6) % 7].push(val);
        });
        return buckets.map((vals, i) => ({
            label: DOW_SHORT[i],
            avg: vals.length >= 2 ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : null,
        }));
    }, [allDays, getCongruence]);

    const validDow  = dowStats.filter(d => d.avg !== null);
    const bestDow   = [...validDow].sort((a, b) => (b.avg ?? 0) - (a.avg ?? 0))[0];
    const worstDow  = [...validDow].sort((a, b) => (a.avg ?? 0) - (b.avg ?? 0))[0];
    const showDow   = validDow.length >= 3 && bestDow?.label !== worstDow?.label;

    // 4-week trend
    const weekAvgs = useMemo(() => Array.from({ length: 4 }, (_, i) => {
        const wStart = startOfWeek(subDays(today, i * 7), { weekStartsOn: 1 });
        const wEnd   = endOfWeek(subDays(today, i * 7),   { weekStartsOn: 1 });
        const days   = eachDayOfInterval({ start: wStart, end: wEnd }).filter(d => d <= today);
        const vals   = days.map(d => getCongruence(format(d, 'yyyy-MM-dd'))).filter(v => v >= 0);
        return vals.length ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : 0;
    }).reverse(), [habits, getCongruence, today]);

    const trendUp = weekAvgs[3] > weekAvgs[0] && weekAvgs[3] > 0;
    const consecutiveUp = weekAvgs.reduce((acc, val, i, arr) => i > 0 && val >= arr[i - 1] ? acc + 1 : 0, 0);

    // Best week ever
    const bestWeekEver = useMemo(() => {
        if (allDays.length < 7) return null;
        let best = { avg: 0, label: '' };
        for (let i = 0; i <= allDays.length - 7; i++) {
            const week = allDays.slice(i, i + 7);
            const vals = week.map(d => getCongruence(format(d, 'yyyy-MM-dd'))).filter(v => v >= 0);
            if (!vals.length) continue;
            const avg = Math.round(vals.reduce((a, b) => a + b, 0) / vals.length);
            if (avg > best.avg) best = { avg, label: format(week[0], "d 'de' MMM", { locale: es }) };
        }
        return best.avg > 0 ? best : null;
    }, [allDays, getCongruence]);

    // Pause patterns
    const pauseData = useMemo(() => {
        const byHabit: Record<string, { title: string; icon?: string; count: number }> = {};
        const reasons: Record<string, number> = {};
        const dowP = Array(7).fill(0);

        habits.forEach(habit => {
            let c = 0;
            Object.values(habit.logs as Record<string, any>).forEach((log: any) => {
                if (log.status === 'rest' || log.status === 'emergency') {
                    c++;
                    if (log.pauseReason) reasons[log.pauseReason] = (reasons[log.pauseReason] || 0) + 1;
                    if (log.date) dowP[(getDay(new Date(log.date)) + 6) % 7]++;
                }
            });
            if (c > 0) byHabit[habit.title] = { title: habit.title, icon: habit.icon, count: c };
        });

        const sortedHabits   = Object.values(byHabit).sort((a, b) => b.count - a.count);
        const topReason      = Object.entries(reasons).sort((a, b) => b[1] - a[1])[0];
        const totalPauses    = Object.values(reasons).reduce((a, b) => a + b, 0);
        const maxPauseIdx    = dowP.indexOf(Math.max(...dowP));

        return {
            mostPaused: sortedHabits[0] ?? null,
            topReason:  topReason ? { text: topReason[0], count: topReason[1], total: totalPauses } : null,
            worstDay:   dowP[maxPauseIdx] > 0 ? { label: DOW_LONG[maxPauseIdx], count: dowP[maxPauseIdx] } : null,
            hasPauses:  sortedHabits.length > 0,
        };
    }, [habits]);

    // Most solid / most inconsistent habit
    const solidityList = useMemo(() => habits.map(habit => {
        const logs  = habit.logs as Record<string, any>;
        const dates = Object.keys(logs).sort();
        if (dates.length < 7) return null;
        let maxFail = 0, run = 0;
        dates.forEach(ds => {
            const s = logs[ds]?.status;
            if (s !== 'done' && s !== 'rest' && s !== 'emergency') { run++; maxFail = Math.max(maxFail, run); }
            else run = 0;
        });
        return { habit, maxFail };
    }).filter(Boolean) as { habit: any; maxFail: number }[], [habits]);

    const byFail       = [...solidityList].sort((a, b) => a.maxFail - b.maxFail);
    const mostSolid    = byFail[0];
    const mostUnstable = byFail[byFail.length - 1];

    const hasData      = allDays.length >= 7;
    const showPatterns = hasData && habits.length > 0;

    // ─────────────────────────────────────────────────────────────────────────
    return (
        <div className="min-h-screen w-full bg-[#0a0a0a] text-white p-4 md:p-6 lg:p-8 overflow-y-auto pb-40 lg:pb-16 font-sans">

            {/* ── HEADER ── */}
            <header className="mb-6">
                <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-white mb-4">Estadísticas</h1>
                <div className="flex flex-wrap gap-1 bg-white/[0.04] border border-white/[0.07] rounded-xl p-1 w-fit">
                    {(Object.keys(PERIOD_LABELS) as Period[]).map(p => (
                        <button
                            key={p}
                            onClick={() => setPeriod(p)}
                            className={cn(
                                'px-3 py-1.5 rounded-lg text-xs font-bold transition-all',
                                period === p ? 'text-black' : 'text-neutral-500 hover:text-white',
                            )}
                            style={period === p ? { background: 'rgb(var(--accent-400))' } : {}}
                        >
                            {PERIOD_LABELS[p]}
                        </button>
                    ))}
                </div>
            </header>

            {/* ── BLOQUE 1: PULSO ── */}
            <div className="grid grid-cols-3 gap-3 mb-5">
                {[
                    { Icon: Activity, label: 'Congruencia', value: `${avgCongruence}%`, sub: 'promedio del período', accent: true },
                    { Icon: Calendar, label: 'Días activos', value: String(activeDays),  sub: `de ${pastDays.length} días`,    accent: false },
                    { Icon: Flame,    label: 'Racha actual', value: `${streak}d`,         sub: 'días consecutivos',             accent: false },
                ].map(({ Icon, label, value, sub, accent }) => (
                    <div key={label} className="rounded-2xl border border-white/[0.07] bg-white/[0.03] p-4">
                        <div className="flex items-center gap-1.5 mb-2">
                            <Icon size={12} style={{ color: accent ? 'rgb(var(--accent-400))' : '#fb923c' }} />
                            <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-wide">{label}</span>
                        </div>
                        <p
                            className="text-2xl font-black"
                            style={{ color: accent ? 'rgb(var(--accent-400))' : 'white' }}
                        >
                            {value}
                        </p>
                        <p className="text-[10px] text-neutral-600 mt-0.5">{sub}</p>
                    </div>
                ))}
            </div>

            {/* ── BLOQUE 2: HÁBITOS EN DETALLE ── */}
            {habits.length > 0 && (
                <div className="rounded-2xl border border-white/[0.07] bg-white/[0.03] mb-5 overflow-hidden">
                    <div className="px-4 py-3 border-b border-white/[0.05] flex items-center gap-2">
                        <Target size={13} style={{ color: 'rgb(var(--accent-400))' }} />
                        <span className="text-xs font-bold text-neutral-400 uppercase tracking-widest">Hábitos</span>
                    </div>
                    <div className="divide-y divide-white/[0.04]">
                        {habitStats.map(({ habit, rate, currentStreak, recordStreak, sparkline }) => (
                            <div key={habit.title} className="px-4 py-3.5 flex items-center gap-3">
                                <span className="text-xl shrink-0">{habit.icon || '⚡'}</span>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-bold text-white truncate">{habit.title}</p>
                                    <p className="text-[10px] text-neutral-600 mt-0.5">
                                        Racha: <span className="text-neutral-400">{currentStreak}d</span>
                                        {recordStreak > 0 && (
                                            <> · Récord: <span className="text-neutral-400">{recordStreak}d</span></>
                                        )}
                                    </p>
                                </div>
                                {/* Sparkline */}
                                <div className="flex gap-[2px] shrink-0">
                                    {sparkline.map((v, i) => (
                                        <div
                                            key={i}
                                            className="w-1.5 rounded-[2px]"
                                            style={{
                                                height: 20,
                                                background:
                                                    v === 2  ? 'rgb(var(--accent-400))' :
                                                    v === 1  ? 'rgba(var(--accent-500), 0.30)' :
                                                    v === 0  ? 'rgba(255,255,255,0.06)' :
                                                    'transparent',
                                            }}
                                        />
                                    ))}
                                </div>
                                {/* Rate */}
                                <p
                                    className="text-sm font-black shrink-0 w-9 text-right"
                                    style={{
                                        color: rate >= 70 ? 'rgb(var(--accent-400))' : rate >= 40 ? '#fbbf24' : '#f87171',
                                    }}
                                >
                                    {rate}%
                                </p>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* ── BLOQUE 3: EVOLUCIÓN ── */}
            {chartData.length > 1 && (
                <div className="rounded-2xl border border-white/[0.07] bg-white/[0.03] p-4 md:p-5 mb-5">
                    <div className="flex items-center gap-2 mb-4">
                        <Activity size={13} style={{ color: 'rgb(var(--accent-400))' }} />
                        <span className="text-xs font-bold text-neutral-400 uppercase tracking-widest">Evolución</span>
                    </div>
                    <div className="h-[180px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={chartData} margin={{ top: 5, right: 5, bottom: 0, left: -30 }}>
                                <defs>
                                    <linearGradient id="gradStats" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%"  stopColor="rgb(var(--accent-400))" stopOpacity={0.25} />
                                        <stop offset="95%" stopColor="rgb(var(--accent-400))" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff06" vertical={false} />
                                <XAxis
                                    dataKey="label"
                                    stroke="#333"
                                    tick={{ fill: '#404040', fontSize: 9 }}
                                    axisLine={false}
                                    tickLine={false}
                                    interval="preserveStartEnd"
                                />
                                <YAxis
                                    domain={[0, 100]}
                                    stroke="#333"
                                    tick={{ fill: '#404040', fontSize: 9 }}
                                    axisLine={false}
                                    tickLine={false}
                                    unit="%"
                                />
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#111', borderColor: '#222', borderRadius: 10, fontSize: 11 }}
                                    labelStyle={{ color: '#888', fontSize: 10 }}
                                    itemStyle={{ color: 'rgb(var(--accent-400))' }}
                                    formatter={(v: number) => [`${v}%`, 'Congruencia']}
                                />
                                <Area
                                    type="monotone"
                                    dataKey="value"
                                    stroke="rgb(var(--accent-400))"
                                    fill="url(#gradStats)"
                                    strokeWidth={2.5}
                                    dot={false}
                                    activeDot={{ r: 4, strokeWidth: 0, fill: 'rgb(var(--accent-400))' }}
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            )}

            {/* ── BLOQUE 4: PATRONES ── */}
            {showPatterns && (
                <div>
                    <div className="flex items-center gap-2 mb-3">
                        <Zap size={13} style={{ color: 'rgb(var(--accent-400))' }} />
                        <span className="text-xs font-bold text-neutral-400 uppercase tracking-widest">Patrones</span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">

                        {/* Mejor / peor día de la semana */}
                        {showDow && (
                            <div className="rounded-2xl border border-white/[0.07] bg-white/[0.03] p-4">
                                <p className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest mb-3">
                                    Días de la semana
                                </p>
                                {/* Mini bar chart */}
                                <div className="flex gap-1 items-end h-10 mb-2">
                                    {dowStats.map((d, i) => (
                                        <div key={i} className="flex-1 flex flex-col items-center gap-0.5">
                                            <div
                                                className="w-full rounded-sm"
                                                style={{
                                                    height: d.avg !== null ? `${Math.max(3, (d.avg / 100) * 36)}px` : 3,
                                                    background:
                                                        d.label === bestDow?.label  ? 'rgb(var(--accent-400))' :
                                                        d.label === worstDow?.label ? '#f87171' :
                                                        'rgba(255,255,255,0.10)',
                                                }}
                                            />
                                        </div>
                                    ))}
                                </div>
                                <div className="flex gap-1 mb-3">
                                    {dowStats.map((d, i) => (
                                        <div key={i} className="flex-1 text-center">
                                            <span
                                                className="text-[8px] font-bold"
                                                style={{
                                                    color:
                                                        d.label === bestDow?.label  ? 'rgb(var(--accent-400))' :
                                                        d.label === worstDow?.label ? '#f87171' :
                                                        '#404040',
                                                }}
                                            >
                                                {d.label}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                                <p className="text-sm font-bold text-white">
                                    Mejor: {bestDow.label} <span style={{ color: 'rgb(var(--accent-400))' }}>({bestDow.avg}%)</span>
                                </p>
                                <p className="text-xs text-neutral-500 mt-0.5">
                                    Más difícil: {worstDow.label} ({worstDow.avg}%)
                                </p>
                            </div>
                        )}

                        {/* Tendencia 4 semanas */}
                        {weekAvgs.some(v => v > 0) && (
                            <div className="rounded-2xl border border-white/[0.07] bg-white/[0.03] p-4">
                                <p className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest mb-3">
                                    Tendencia · 4 semanas
                                </p>
                                <div className="flex gap-1.5 items-end h-12 mb-3">
                                    {weekAvgs.map((avg, i) => (
                                        <div
                                            key={i}
                                            className="flex-1 rounded-sm"
                                            style={{
                                                height: `${Math.max(4, (avg / 100) * 48)}px`,
                                                background: i === 3
                                                    ? 'rgb(var(--accent-400))'
                                                    : 'rgba(255,255,255,0.08)',
                                            }}
                                        />
                                    ))}
                                </div>
                                <div className={cn('flex items-center gap-1.5', trendUp ? 'text-emerald-400' : 'text-rose-400')}>
                                    {trendUp ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                                    <p className="text-sm font-bold text-white">
                                        {trendUp
                                            ? consecutiveUp >= 3 ? `${consecutiveUp} semanas mejorando seguidas` : 'Tendencia al alza'
                                            : 'Tendencia a la baja'
                                        }
                                    </p>
                                </div>
                            </div>
                        )}

                        {/* Récord histórico */}
                        {bestWeekEver && (
                            <div className="rounded-2xl border border-white/[0.07] bg-white/[0.03] p-4">
                                <p className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest mb-2">
                                    Tu mejor semana
                                </p>
                                <p
                                    className="text-4xl font-black font-mono"
                                    style={{ color: 'rgb(var(--accent-400))' }}
                                >
                                    {bestWeekEver.avg}%
                                </p>
                                <p className="text-xs text-neutral-500 mt-1">Semana del {bestWeekEver.label}</p>
                            </div>
                        )}

                        {/* Hábito más sólido */}
                        {mostSolid && (
                            <div className="rounded-2xl border border-white/[0.07] bg-white/[0.03] p-4">
                                <p className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest mb-2">
                                    Hábito más sólido
                                </p>
                                <div className="flex items-center gap-2 mb-1">
                                    <span className="text-xl">{mostSolid.habit.icon || '⚡'}</span>
                                    <p className="text-base font-bold text-white">{mostSolid.habit.title}</p>
                                </div>
                                <p className="text-xs text-neutral-500">
                                    {mostSolid.maxFail === 0
                                        ? 'Nunca ha fallado más de 1 día seguido'
                                        : `Máximo ${mostSolid.maxFail} días fallidos consecutivos`}
                                </p>
                            </div>
                        )}

                        {/* Hábito más inconsistente */}
                        {mostUnstable && mostUnstable.habit.title !== mostSolid?.habit.title && (
                            <div className="rounded-2xl border border-white/[0.07] bg-white/[0.03] p-4">
                                <p className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest mb-2">
                                    Hábito más inconsistente
                                </p>
                                <div className="flex items-center gap-2 mb-1">
                                    <span className="text-xl">{mostUnstable.habit.icon || '⚡'}</span>
                                    <p className="text-base font-bold text-white">{mostUnstable.habit.title}</p>
                                </div>
                                <p className="text-xs text-neutral-500">
                                    Hasta {mostUnstable.maxFail} días fallidos seguidos
                                </p>
                            </div>
                        )}

                        {/* Patrones de pausas */}
                        {pauseData.hasPauses && (
                            <div className={cn(
                                "rounded-2xl border border-white/[0.07] bg-white/[0.03] p-4",
                                "md:col-span-2"
                            )}>
                                <p className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest mb-3">
                                    Patrones de pausas
                                </p>
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                    {pauseData.mostPaused && (
                                        <div>
                                            <p className="text-[10px] text-neutral-600 uppercase font-bold mb-1.5">Más pausado</p>
                                            <p className="text-sm font-bold text-white">
                                                {pauseData.mostPaused.icon} {pauseData.mostPaused.title}
                                            </p>
                                            <p className="text-xs text-neutral-500 mt-0.5">
                                                {pauseData.mostPaused.count} pausas en total
                                            </p>
                                        </div>
                                    )}
                                    {pauseData.topReason && (
                                        <div>
                                            <p className="text-[10px] text-neutral-600 uppercase font-bold mb-1.5">Razón más frecuente</p>
                                            <p className="text-sm font-bold text-white">"{pauseData.topReason.text}"</p>
                                            <p className="text-xs text-neutral-500 mt-0.5">
                                                {pauseData.topReason.count} de {pauseData.topReason.total} pausas
                                            </p>
                                        </div>
                                    )}
                                    {pauseData.worstDay && (
                                        <div>
                                            <p className="text-[10px] text-neutral-600 uppercase font-bold mb-1.5">Día con más pausas</p>
                                            <p className="text-sm font-bold text-white capitalize">
                                                Los {pauseData.worstDay.label}
                                            </p>
                                            <p className="text-xs text-neutral-500 mt-0.5">
                                                {pauseData.worstDay.count} pausas registradas
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                    </div>
                </div>
            )}

            {/* Empty state */}
            {!hasData && (
                <div className="rounded-2xl border border-white/[0.05] bg-white/[0.02] p-10 text-center mt-4">
                    <p className="text-neutral-500 text-sm">Empieza a registrar hábitos para ver tus estadísticas y patrones aquí.</p>
                </div>
            )}

        </div>
    );
}
