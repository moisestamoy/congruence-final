import { useState } from 'react';
import { X, Save, BrainCircuit, Activity, Heart, Target, TrendingUp, Compass } from 'lucide-react';
import { useHolisticStore, HolisticCheckIn } from './useHolisticStore';
import { cn } from '../../utils/cn';

interface HolisticCheckInModalProps {
    onClose: () => void;
}

const AXES = [
    {
        id: 'physical' as keyof Omit<HolisticCheckIn, 'id' | 'date' | 'note'>,
        label: 'Físico',
        icon: Activity,
        color: 'text-emerald-400',
        bg: 'bg-emerald-500/10',
        activeBg: 'bg-emerald-500',
        desc: 'Ejercicio, dieta, sueño, meditación y rutinas diarias.'
    },
    {
        id: 'emotional' as keyof Omit<HolisticCheckIn, 'id' | 'date' | 'note'>,
        label: 'Emocional',
        icon: Heart,
        color: 'text-rose-400',
        bg: 'bg-rose-500/10',
        activeBg: 'bg-rose-500',
        desc: 'Estado actual, situaciones externas y tu capacidad de estar presente.'
    },
    {
        id: 'vision' as keyof Omit<HolisticCheckIn, 'id' | 'date' | 'note'>,
        label: 'Visión',
        icon: Compass,
        color: 'text-cyan-400',
        bg: 'bg-cyan-500/10',
        activeBg: 'bg-cyan-500',
        desc: 'Claridad mental en tus objetivos y por qué los persigues.'
    },
    {
        id: 'standards' as keyof Omit<HolisticCheckIn, 'id' | 'date' | 'note'>,
        label: 'Disciplina',
        icon: Target,
        color: 'text-amber-400',
        bg: 'bg-amber-500/10',
        activeBg: 'bg-amber-500',
        desc: 'Estándares, valores y mantenerte accountable ante ellos.'
    },
    {
        id: 'growth' as keyof Omit<HolisticCheckIn, 'id' | 'date' | 'note'>,
        label: 'Crecimiento',
        icon: TrendingUp,
        color: 'text-indigo-400',
        bg: 'bg-indigo-500/10',
        activeBg: 'bg-indigo-500',
        desc: 'Sentimiento de mejora real y entendimiento de tus brechas.'
    },
    {
        id: 'environment' as keyof Omit<HolisticCheckIn, 'id' | 'date' | 'note'>,
        label: 'Entorno',
        icon: BrainCircuit,
        color: 'text-fuchsia-400',
        bg: 'bg-fuchsia-500/10',
        activeBg: 'bg-fuchsia-500',
        desc: 'Calidad de información que consumes (inputs) y madurez ante problemas.'
    }
];

export function HolisticCheckInModal({ onClose }: HolisticCheckInModalProps) {
    const { addCheckIn, getLatestCheckIn } = useHolisticStore();
    const latest = getLatestCheckIn();

    const [form, setForm] = useState({
        physical: latest?.physical ?? 5,
        emotional: latest?.emotional ?? 5,
        vision: latest?.vision ?? 5,
        standards: latest?.standards ?? 5,
        growth: latest?.growth ?? 5,
        environment: latest?.environment ?? 5
    });

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
            environment: form.environment
        });
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
            <div className="w-full max-w-2xl bg-[#0a0a0a] border border-white/10 rounded-[2rem] shadow-2xl overflow-hidden flex flex-col my-auto relative">
                
                {/* Header */}
                <div className="flex justify-between items-center p-6 border-b border-white/5 bg-[#0a0a0a] sticky top-0 z-20">
                    <div>
                        <h2 className="text-xl md:text-2xl font-black text-white tracking-tight flex items-center gap-3">
                            <span className="p-2 rounded-xl bg-purple-500/10 text-purple-400">
                                <BrainCircuit size={24} />
                            </span>
                            Check-In Holístico
                        </h2>
                        <p className="text-[10px] md:text-xs text-neutral-400 uppercase tracking-widest font-bold mt-2 ml-14">
                            Evalúa del 1 al 10 cómo te encuentras
                        </p>
                    </div>
                    <button onClick={onClose} className="p-2 text-neutral-400 hover:text-white hover:bg-white/5 rounded-full transition-colors self-start">
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 md:p-8 space-y-8 bg-[#050505]">
                    {AXES.map((axis) => {
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
                        Guardar Check-In
                    </button>
                </div>

            </div>
        </div>
    );
}
