import { useMemo } from 'react';
import { TrendingUp, Activity, Wallet, Target, Hexagon, Plus } from 'lucide-react';
import { useState } from 'react';
import { useHolisticStore } from './useHolisticStore';
import { HolisticCheckInModal } from './HolisticCheckInModal';
import { motion } from 'framer-motion';
import { useHabitStore } from '../habits/useHabitStore';
import { useFinanceStore } from '../finance/useFinanceStore';
import { format, subDays, eachDayOfInterval } from 'date-fns';
import { es } from 'date-fns/locale';
import { ComposedChart, Line, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Area, Cell, Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis } from 'recharts';
import { cn } from '../../utils/cn';

export default function StatsPage() {
    const { habits, getCongruence } = useHabitStore();
    const { events, realExpenses } = useFinanceStore();
    const { getLatestCheckIn } = useHolisticStore();
    const [isHolisticModalOpen, setIsHolisticModalOpen] = useState(false);

    // 1. Calculate Global Metrics
    const totalHabits = habits.length;

    // Calculate Average Congruence (Last 30 days)
    const last30Days = useMemo(() => {
        const end = new Date();
        const start = subDays(end, 29);
        return eachDayOfInterval({ start, end });
    }, []);

    const avgCongruence = useMemo(() => {
        if (habits.length === 0) return 0;
        const sum = last30Days.reduce((acc, date) => {
            return acc + getCongruence(format(date, 'yyyy-MM-dd'));
        }, 0);
        return Math.round(sum / 30);
    }, [last30Days, getCongruence, habits.length]);

    // 2. Prepare Chart Data (Last 14 Days) - Correlation View
    const chartData = useMemo(() => {
        const days = eachDayOfInterval({ start: subDays(new Date(), 13), end: new Date() });
        return days.map(date => {
            const dateStr = format(date, 'yyyy-MM-dd');

            // Habit Data
            const congruence = getCongruence(dateStr);

            // Finance Data
            const dayIncome = events
                .filter(e => e.date === dateStr && e.type === 'income')
                .reduce((sum, e) => sum + e.amount, 0);

            const dayExpenses = realExpenses
                .filter(e => e.date === dateStr)
                .reduce((sum, e) => sum + e.amount, 0);

            return {
                date: format(date, 'dd MMM', { locale: es }),
                congruence,
                netFlow: dayIncome - dayExpenses,
                expenses: dayExpenses,
                income: dayIncome
            };
        });
    }, [events, realExpenses, getCongruence]);

    // 3. Heatmap Data (Last 35 days for grid)
    const heatmapData = useMemo(() => {
        const end = new Date();
        const start = subDays(end, 34);
        const days = eachDayOfInterval({ start, end });
        return days.map(date => {
            const val = getCongruence(format(date, 'yyyy-MM-dd'));
            return {
                date,
                value: val,
                intensity: val / 100
            };
        });
    }, [getCongruence]);

    // 4. Holistic Data
    const latestHolistic = getLatestCheckIn();
    const holisticData = useMemo(() => {
        const h = latestHolistic || { physical: 0, emotional: 0, vision: 0, standards: 0, growth: 0, environment: 0 };
        return [
            { subject: 'Físico', A: h.physical * 10, fullMark: 100 },
            { subject: 'Crecimiento', A: h.growth * 10, fullMark: 100 },
            { subject: 'Visión', A: h.vision * 10, fullMark: 100 },
            { subject: 'Emocional', A: h.emotional * 10, fullMark: 100 },
            { subject: 'Entorno', A: h.environment * 10, fullMark: 100 },
            { subject: 'Disciplina', A: h.standards * 10, fullMark: 100 },
        ];
    }, [latestHolistic]);

    return (
        <div className="min-h-screen w-full bg-[#020508] bg-[radial-gradient(ellipse_at_top_center,_var(--tw-gradient-stops))] from-[#0a1a2a] via-[#020508] to-black text-white p-8 font-sans overflow-y-auto pb-32">

            {/* Header */}
            <header className="mb-12 flex items-center justify-between">
                <div>
                    <h1 className="text-4xl font-bold tracking-tight text-white mb-2 drop-shadow-[0_0_15px_rgba(255,255,255,0.3)]">
                        Centro de Comando
                    </h1>
                    <p className="text-cyan-400 font-medium tracking-widest uppercase text-sm">
                        Correlación: Hábitos vs Finanzas
                    </p>
                </div>
            </header>

            {/* MASTER COMMAND CARD (2x2 Grid) */}
            <div className="relative w-full rounded-[32px] overflow-hidden bg-gradient-to-br from-[#0a0a0a] to-[#050505] border border-white/10 shadow-2xl p-6 md:p-8 shrink-0 mb-12">
                <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 via-purple-500/5 to-transparent pointer-events-none opacity-50" />

                <h2 className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest mb-6 relative z-10">Resumen Estadístico</h2>

                <div className="grid grid-cols-2 gap-4 md:gap-6 relative z-10">
                    {/* Congruence */}
                    <div className="flex flex-col border-r border-b border-white/5 pb-4 pr-4">
                        <div className="flex items-center gap-2 mb-2 text-emerald-400">
                            <Activity size={14} className="drop-shadow-[0_0_8px_rgba(52,211,153,0.5)]" />
                            <span className="text-[9px] font-bold text-neutral-500 uppercase tracking-widest">Congruencia (30d)</span>
                        </div>
                        <span className="text-3xl lg:text-4xl font-black tracking-tighter text-white">{avgCongruence}%</span>
                        <span className="text-[10px] text-neutral-600 font-medium mt-1">{avgCongruence > 80 ? 'Excelente' : 'Mejorable'}</span>
                    </div>

                    {/* Active Habits */}
                    <div className="flex flex-col border-b border-white/5 pb-4 pl-2 lg:pl-4">
                        <div className="flex items-center gap-2 mb-2 text-purple-400">
                            <Target size={14} className="drop-shadow-[0_0_8px_rgba(168,85,247,0.5)]" />
                            <span className="text-[9px] font-bold text-neutral-500 uppercase tracking-widest">Hábitos Activos</span>
                        </div>
                        <span className="text-3xl lg:text-4xl font-black tracking-tighter text-white">{totalHabits}</span>
                        <span className="text-[10px] text-neutral-600 font-medium mt-1">{habits.filter(h => h.type === 'boolean').length} Simples</span>
                    </div>

                    {/* Net Flow */}
                    <div className="flex flex-col border-r border-white/5 pt-2 pr-4">
                        <div className="flex items-center gap-2 mb-2 text-cyan-400">
                            <Wallet size={14} className="drop-shadow-[0_0_8px_rgba(34,211,238,0.5)]" />
                            <span className="text-[9px] font-bold text-neutral-500 uppercase tracking-widest">Flujo Neto (14d)</span>
                        </div>
                        <span className="text-3xl lg:text-4xl font-bold font-mono text-cyan-50">{chartData.reduce((acc, d) => acc + d.netFlow, 0)}€</span>
                        <span className="text-[10px] text-neutral-600 font-medium mt-1">Balance reciente</span>
                    </div>

                    {/* Expenses */}
                    <div className="flex flex-col pt-2 pl-2 lg:pl-4">
                        <div className="flex items-center gap-2 mb-2 text-rose-400">
                            <TrendingUp size={14} className="drop-shadow-[0_0_8px_rgba(244,63,94,0.5)]" />
                            <span className="text-[9px] font-bold text-neutral-500 uppercase tracking-widest">Gastos (14d)</span>
                        </div>
                        <span className="text-3xl lg:text-4xl font-bold font-mono text-rose-50">{Math.abs(chartData.reduce((acc, d) => acc + d.expenses, 0))}€</span>
                        <span className="text-[10px] text-neutral-600 font-medium mt-1">Controlar</span>
                    </div>
                </div>
            </div>

            {/* HOLISTIC PROFILE WIDGET */}
            <div className="relative w-full rounded-[32px] overflow-hidden bg-gradient-to-br from-[#0a0a0a] to-[#050505] border border-white/10 shadow-2xl p-6 md:p-8 shrink-0 mb-12 flex flex-col lg:flex-row items-center gap-8">
                <div className="absolute top-0 left-0 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />
                
                <div className="w-full lg:w-1/3 flex flex-col justify-center relative z-10 text-center lg:text-left">
                    <div className="inline-flex items-center justify-center lg:justify-start gap-3 mb-4">
                        <div className="p-3 bg-purple-500/10 rounded-2xl text-purple-400">
                            <Hexagon size={24} />
                        </div>
                        <h2 className="text-2xl font-bold text-white tracking-tight">Perfil Holístico</h2>
                    </div>
                    <p className="text-sm text-neutral-400 mb-8 max-w-sm mx-auto lg:mx-0">
                        Una representación visual de tu estado actual en las 6 áreas clave de la congruencia: Física, Emocional y Mental.
                    </p>
                    
                    <button 
                        onClick={() => setIsHolisticModalOpen(true)}
                        className="flex items-center justify-center gap-2 w-full md:w-auto px-6 py-4 rounded-xl bg-purple-500 text-black font-bold uppercase tracking-widest text-xs hover:bg-purple-400 transition-all shadow-[0_0_20px_rgba(168,85,247,0.3)] hover:shadow-[0_0_30px_rgba(168,85,247,0.5)] active:scale-95"
                    >
                        <Plus size={16} /> Realizar Check-In
                    </button>
                    {!latestHolistic && (
                        <p className="text-xs text-neutral-600 mt-4 italic">
                            Aún no has registrado ningún Check-In. 
                        </p>
                    )}
                </div>

                <div className="w-full lg:w-2/3 h-[300px] sm:h-[400px] relative z-10 flex justify-center items-center">
                    <ResponsiveContainer width="100%" height="100%">
                        <RadarChart cx="50%" cy="50%" outerRadius="70%" data={holisticData}>
                            <PolarGrid stroke="#ffffff20" />
                            <PolarAngleAxis 
                                dataKey="subject" 
                                tick={{ fill: '#a3a3a3', fontSize: 11, fontWeight: 'bold' }} 
                            />
                            <PolarRadiusAxis 
                                angle={30} 
                                domain={[0, 100]} 
                                tick={false} 
                                axisLine={false} 
                            />
                            <Radar
                                name="Nivel Actual"
                                dataKey="A"
                                stroke="#a855f7"
                                strokeWidth={3}
                                fill="#a855f7"
                                fillOpacity={0.4}
                            />
                        </RadarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Main Correlation Chart */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="lg:col-span-2 backdrop-blur-2xl bg-[#050505]/80 border border-white/10 rounded-[2rem] p-8 shadow-2xl relative overflow-hidden"
                >
                    <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none" />

                    <div className="flex justify-between items-center mb-8 relative z-10">
                        <div>
                            <h3 className="text-xl font-bold text-white flex items-center gap-3">
                                <Activity className="text-cyan-400" size={20} />
                                Disciplina vs Finanzas
                            </h3>
                            <p className="text-xs text-neutral-500 mt-1">Comparando % de hábitos completados con flujo de caja diario.</p>
                        </div>
                    </div>

                    <div className="h-[350px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <ComposedChart data={chartData} margin={{ top: 20, right: 20, bottom: 20, left: 0 }}>
                                <defs>
                                    <linearGradient id="colorCongruence" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#22d3ee" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#22d3ee" stopOpacity={0} />
                                    </linearGradient>
                                    <linearGradient id="colorNet" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.8} />
                                        <stop offset="95%" stopColor="#10b981" stopOpacity={0.2} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                                <XAxis
                                    dataKey="date"
                                    stroke="#525252"
                                    tick={{ fill: '#525252', fontSize: 10 }}
                                    axisLine={false}
                                    tickLine={false}
                                />
                                <YAxis
                                    yAxisId="left"
                                    stroke="#525252"
                                    tick={{ fill: '#525252', fontSize: 10 }}
                                    axisLine={false}
                                    tickLine={false}
                                    unit="%"
                                />
                                <YAxis
                                    yAxisId="right"
                                    orientation="right"
                                    stroke="#525252"
                                    tick={{ fill: '#525252', fontSize: 10 }}
                                    axisLine={false}
                                    tickLine={false}
                                    unit="€"
                                />
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#0a0a0a', borderColor: '#333', borderRadius: '12px' }}
                                    itemStyle={{ fontSize: '12px', fontWeight: 'bold' }}
                                />
                                {/* Expenses Bar (Negative flow kinda, but let's show Net Flow) */}
                                <Bar
                                    yAxisId="right"
                                    dataKey="netFlow"
                                    name="Flujo Neto"
                                    barSize={12}
                                    radius={[4, 4, 0, 0]}
                                    fill="#10b981"
                                >
                                    {chartData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.netFlow >= 0 ? '#10b981' : '#f43f5e'} />
                                    ))}
                                </Bar>

                                {/* Congruence Line */}
                                <Area
                                    yAxisId="left"
                                    type="monotone"
                                    dataKey="congruence"
                                    name="Congruencia"
                                    stroke="#22d3ee"
                                    fillOpacity={1}
                                    fill="url(#colorCongruence)"
                                    strokeWidth={3}
                                />
                                <Line
                                    yAxisId="left"
                                    type="monotone"
                                    dataKey="congruence"
                                    stroke="#22d3ee"
                                    strokeWidth={2}
                                    dot={{ r: 4, fill: '#0891b2', strokeWidth: 2, stroke: '#fff' }}
                                    activeDot={{ r: 6 }}
                                />
                            </ComposedChart>
                        </ResponsiveContainer>
                    </div>
                </motion.div>

                {/* Heatmap Panel */}
                <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="lg:col-span-1 backdrop-blur-2xl bg-[#050505]/80 border border-white/10 rounded-[2rem] p-8 shadow-2xl relative flex flex-col"
                >
                    <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-3">
                        <div className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_10px_#34d399]" />
                        Consistencia (35d)
                    </h3>

                    <div className="flex-1 grid grid-cols-7 gap-2 content-start">
                        {heatmapData.map((day, i) => (
                            <div
                                key={i}
                                className={cn(
                                    "aspect-square rounded-md transition-all duration-300 relative group cursor-pointer",
                                    day.value > 0 ? "scale-100" : "scale-90 opacity-30 bg-white/5",
                                    day.value >= 100 ? "bg-cyan-400 shadow-[0_0_15px_#22d3ee]" :
                                        day.value >= 75 ? "bg-cyan-600 shadow-[0_0_10px_#0891b2]" :
                                            day.value >= 50 ? "bg-cyan-800" :
                                                day.value > 0 ? "bg-cyan-900/50" : ""
                                )}
                            >
                                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 text-[8px] font-bold text-white">
                                    {day.value}%
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="mt-4 text-xs text-neutral-500 text-center">
                        Muestra la intensidad de cumplimiento de hábitos
                    </div>
                </motion.div>
            </div>

            {isHolisticModalOpen && (
                <HolisticCheckInModal onClose={() => setIsHolisticModalOpen(false)} />
            )}
        </div>
    );
}
