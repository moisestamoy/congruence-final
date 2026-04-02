import { useState } from 'react';
import { X, Save, BrainCircuit, Activity, Heart, Target, TrendingUp, Compass, Skull, Star } from 'lucide-react';
import { useHolisticStore, HolisticCheckIn } from './useHolisticStore';
import { useHabitStore } from '../habits/useHabitStore';
import { cn } from '../../utils/cn';

interface HolisticCheckInModalProps {
    onClose: () => void;
}

const ALL_AXES = [
    {
        id: 'physical' as keyof Omit<HolisticCheckIn, 'id' | 'date' | 'note' | 'weeklyReflection'>,
        label: 'Físico',
        icon: Activity,
        color: 'text-emerald-400',
        bg: 'bg-emerald-500/10',
        activeBg: 'bg-emerald-500',
        desc: 'Ejercicio, dieta, sueño, meditación y rutinas diarias.'
    },
    {
        id: 'emotional' as keyof Omit<HolisticCheckIn, 'id' | 'date' | 'note' | 'weeklyReflection'>,
        label: 'Emocional',
        icon: Heart,
        color: 'text-rose-400',
        bg: 'bg-rose-500/10',
        activeBg: 'bg-rose-500',
        desc: 'Estado actual, situaciones externas y tu capacidad de estar presente.'
    },
    {
        id: 'vision' as keyof Omit<HolisticCheckIn, 'id' | 'date' | 'note' | 'weeklyReflection'>,
        label: 'Visión',
        icon: Compass,
        color: 'text-cyan-400',
        bg: 'bg-cyan-500/10',
        activeBg: 'bg-cyan-500',
        desc: 'Claridad mental en tus objetivos y por qué los persigues.'
    },
    {
        id: 'standards' as keyof Omit<HolisticCheckIn, 'id' | 'date' | 'note' | 'weeklyReflection'>,
        label: 'Disciplina',
        icon: Target,
        color: 'text-amber-400',
        bg: 'bg-amber-500/10',
        activeBg: 'bg-amber-500',
        desc: 'Estándares, valores y mantenerte accountable ante ellos.'
    },
    {
        id: 'growth' as keyof Omit<HolisticCheckIn, 'id' | 'date' | 'note' | 'weeklyReflection'>,
        label: 'Crecimiento',
        icon: TrendingUp,
        color: 'text-indigo-400',
        bg: 'bg-indigo-500/10',
        activeBg: 'bg-indigo-500',
        desc: 'Sentimiento de mejora real y entendimiento de tus brechas.'
    },
    {
        id: 'environment' as keyof Omit<HolisticCheckIn, 'id' | 'date' | 'note' | 'weeklyReflection'>,
        label: 'Entorno',
        icon: BrainCircuit,
        color: 'text-fuchsia-400',
        bg: 'bg-fuchsia-500/10',
        activeBg: 'bg-fuchsia-500',
        desc: 'Calidad de información que consumes (inputs) y madurez ante problemas.'
    }
];

export function HolisticCheckInModal({ onClose }: HolisticCheckInModalProps) {
    const { addCheckIn, getLatestCheckIn, getCheckInAxesForDay, isFullCheckIn } = useHolisticStore();
    const { manifesto } = useHabitStore();
    const latest = getLatestCheckIn();

    const today = new Date();
    const isSunday = isFullCheckIn(today);
    const activeAxisIds = getCheckInAxesForDay(today);
    const visibleAxes = ALL_AXES.filter(a => activeAxisIds.includes(a.id));

    const [form, setForm] = useState({
        physical: latest?.physical ?? 5,
        emotional: latest?.emotional ?? 5,
        vision: latest?.vision ?? 5,
        standards: latest?.standards ?? 5,
        growth: latest?.growth ?? 5,
        environment: latest?.environment ?? 5,
    });

    const [weeklyReflection, setWeeklyReflection] = useState('');

    const handleChange = (axis: keyof typeof form, value: number) => {
        setForm(prev => ({ ...prev, [axis]: value }));
    };

    const handleSave = () => {
        addCheckIn({
            physical: form.physical,
            emotional: form.emotional,
            vision: form.vision,
            standards: form.standards,
            growth: form.growth,
            environment: form.environment,
            weeklyReflection: isSunday && weeklyReflection.trim() ? weeklyReflection.trim() : undefined,
        });
        onClose();
    };

    const planB = manifesto?.executionProtocol?.planB_Minimum;

    // Day labels for the rotation badge
    const DAY_LABELS: Record<number, string> = {
        1: 'Lunes', 2: 'Martes', 3: 'Miércoles', 4: 'Jueves', 5: 'Viernes', 6: 'Sábado', 0: 'Domingo'
    };
    const todayLabel = DAY_LABELS[today.getDay()];

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
            <div className={cn(
                "w-full bg-[#0a0a0a] border border-white/10 rounded-[2rem] shadow-2xl overflow-hidden flex flex-col my-auto relative",
                isSunday ? "max-w-2xl" : "max-w-lg"
            )}>

                {/* Header */}
                <div className="flex justify-between items-center p-6 border-b border-white/5 bg-[#0a0a0a] sticky top-0 z-20">
                    <div>
                        <h2 className="text-xl md:text-2xl font-black text-white tracking-tight flex items-center gap-3">
                            <span className="p-2 rounded-xl bg-purple-500/10 text-purple-400">
                                {isSunday ? <Star size={24} /> : <BrainCircuit size={24} />}
                            </span>
                            {isSunday ? 'Revisión Semanal' : 'Evaluarte Hoy'}
                        </h2>
                        <p className="text-[10px] md:text-xs text-neutral-400 uppercase tracking-widest font-bold mt-2 ml-14">
                            {isSunday
                                ? 'Radar completo — mereces este momento'
                                : `${todayLabel} · Ejes de hoy: ${visibleAxes.map(a => a.label).join(' + ')}`}
                        </p>
                    </div>
                    <button onClick={onClose} className="p-2 text-neutral-400 hover:text-white hover:bg-white/5 rounded-full transition-colors self-start">
                        <X size={20} />
                    </button>
                </div>

                {/* Plan B Mirror — shown only if manifesto exists */}
                {planB && (
                    <div className="mx-6 mt-6 p-5 rounded-2xl bg-yellow-500/5 border border-yellow-500/20">
                        <div className="flex items-start gap-3">
                            <div className="p-2 rounded-lg bg-yellow-500/10 text-yellow-400 shrink-0 mt-0.5">
                                <Skull size={16} />
                            </div>
                            <div>
                                <p className="text-[10px] font-bold uppercase tracking-widest text-yellow-500/70 mb-1">
                                    Tu contrato mínimo de hoy
                                </p>
                                <p className="text-yellow-100 font-semibold text-sm leading-relaxed">
                                    "{planB}"
                                </p>
                                <p className="text-[10px] text-yellow-400/50 mt-2 italic">
                                    ¿Lo cumpliste? Usa los sliders abajo para evaluarte.
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Content — Axes */}
                <div className="p-6 md:p-8 space-y-8 bg-[#050505]">
                    {visibleAxes.map((axis) => {
                        const Icon = axis.icon;
                        const value = form[axis.id];

                        return (
                            <div key={axis.id} className="relative group">
                                <div className="flex justify-between items-end mb-2">
                                    <div className="flex items-center gap-3">
                                        <div className={cn("p-2 rounded-lg", axis.bg, axis.color)}>
                                            <Icon size={16} />
                                        </div>
                                        <div>
                                            <label className="text-sm font-bold text-white tracking-wide block">
                                                {axis.label}
                                            </label>
                                            <span className="text-[10px] text-neutral-500 font-medium">
                                                {axis.desc}
                                            </span>
                                        </div>
                                    </div>
                                    <span className={cn("text-xl font-black font-mono", axis.color)}>
                                        {value}
                                        <span className="text-xs text-neutral-600">/10</span>
                                    </span>
                                </div>

                                {/* Custom Slider */}
                                <div className="relative h-2 bg-white/5 rounded-full mt-4 overflow-hidden">
                                    <div
                                        className={cn("absolute inset-y-0 left-0 transition-all duration-300", axis.activeBg)}
                                        style={{ width: `${(value / 10) * 100}%` }}
                                    />
                                </div>
                                <input
                                    type="range"
                                    min="1"
                                    max="10"
                                    value={value}
                                    onChange={(e) => handleChange(axis.id, Number(e.target.value))}
                                    className="absolute inset-x-0 bottom-0 w-full h-8 opacity-0 cursor-pointer"
                                />
                            </div>
                        );
                    })}

                    {/* Sunday weekly reflection */}
                    {isSunday && (
                        <div className="pt-4 border-t border-white/5">
                            <label className="text-xs font-bold text-purple-400 uppercase tracking-widest block mb-3">
                                Reflexión Semanal (opcional)
                            </label>
                            <p className="text-sm text-neutral-400 mb-3 italic">
                                "¿Qué hice esta semana que el yo de hace un año no hubiera hecho?"
                            </p>
                            <textarea
                                value={weeklyReflection}
                                onChange={e => setWeeklyReflection(e.target.value)}
                                placeholder="Una línea. Sin filtros."
                                rows={3}
                                className="w-full bg-purple-900/10 border border-purple-500/20 rounded-xl p-4 text-sm text-white placeholder-neutral-700 outline-none focus:border-purple-400 focus:shadow-[0_0_15px_rgba(168,85,247,0.1)] transition-all resize-none"
                            />
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-white/5 bg-[#0a0a0a] flex justify-end gap-3 sticky bottom-0 z-20">
                    <button
                        onClick={onClose}
                        className="px-6 py-3 rounded-xl text-xs font-bold uppercase tracking-wider text-neutral-400 hover:bg-white/5 transition-colors"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleSave}
                        className="px-8 py-3 rounded-xl text-xs font-bold uppercase tracking-wider text-black transition-all transform active:scale-95 flex items-center gap-2 shadow-lg bg-purple-500 hover:bg-purple-400 shadow-purple-500/20"
                    >
                        <Save size={16} />
                        Guardar Evaluación
                    </button>
                </div>

            </div>
        </div>
    );
}
