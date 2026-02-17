
import { useState } from 'react';
import { motion } from 'framer-motion';
import { X, Activity, Heart, Briefcase, Smile } from 'lucide-react';
import { useHabitStore } from './useHabitStore';
import { cn } from '../../utils/cn';
import { Habit } from '../../types';

interface HabitFormProps {
    onClose: () => void;
    initialData?: Habit | null;
}

const EMOJI_CATEGORIES = [
    { name: 'Salud', icon: Activity, emojis: ['💪', '🏃', '🧘', '💧', '🍎', '💤', '🏋️', '🚴', '🥑', '🥦'] },
    { name: 'Mente', icon: checkIcon, emojis: ['📚', '🧠', '✍️', '🎸', '🎹', '🎨', '🧩', '🎭', '♟️', '🗣️'] }, // Placeholder for checkIcon
    { name: 'Trabajo', icon: Briefcase, emojis: ['💻', '💰', '📈', '📅', '📧', '📞', '🤝', '📊', '🚀', '👔'] },
    { name: 'Vida', icon: Smile, emojis: ['🎯', '⭐', '🔥', '⚡', '🌞', '🌱', '🧹', '🧺', '🪴', '🐕'] },
];

function checkIcon(props: any) { return <Heart {...props} /> } // Helper or use generic icons

export function HabitForm({ onClose, initialData }: HabitFormProps) {
    const { addHabit, updateHabit } = useHabitStore();

    const [title, setTitle] = useState(initialData?.title || '');
    const [type, setType] = useState<'boolean' | 'numeric'>(initialData?.type || 'boolean');
    const [goal, setGoal] = useState(initialData?.goal || 1);
    const [unit, setUnit] = useState(initialData?.unit || '');
    const [color, setColor] = useState(initialData?.color || '#fbbf24');
    const [icon, setIcon] = useState(initialData?.icon || '🎯');

    // Emoji Tab State
    const [activeEmojiTab, setActiveEmojiTab] = useState('Salud');

    const colors = ['#fbbf24', '#34d399', '#60a5fa', '#f87171', '#a78bfa', '#f472b6', '#ffffff'];

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!title.trim()) return;

        const habitData = {
            title,
            type,
            goal,
            unit: type === 'numeric' ? unit : undefined,
            color,
            icon,
            subtitle: initialData?.subtitle || '0 días de racha'
        };

        if (initialData) {
            updateHabit(initialData.id, habitData);
        } else {
            addHabit(habitData);
        }
        onClose();
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="w-full max-w-lg bg-[#0a0a0a] border border-white/10 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
                {/* Header */}
                <div className="flex justify-between items-center p-6 border-b border-white/5 bg-white/[0.02]">
                    <h2 className="text-xl font-bold text-white tracking-wide">
                        {initialData ? 'Editar Hábito' : 'Nuevo Hábito'}
                    </h2>
                    <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full text-neutral-400 transition-colors">
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">

                    {/* Name Input */}
                    <div className="space-y-2">
                        <label className="text-xs uppercase font-bold text-neutral-500 tracking-wider">Nombre del Hábito</label>
                        <input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="Ej. Leer Deep Work, Entrenar..."
                            className="w-full bg-neutral-900/50 border border-white/10 rounded-xl p-4 text-lg text-white placeholder-neutral-700 outline-none focus:border-cyan-500/50 focus:bg-neutral-900 transition-all"
                            autoFocus
                        />
                    </div>

                    {/* Type Selector */}
                    <div className="grid grid-cols-2 gap-4 p-1 bg-neutral-900/50 rounded-2xl border border-white/5">
                        <button
                            type="button"
                            onClick={() => setType('boolean')}
                            className={cn(
                                "py-3 rounded-xl text-sm font-bold transition-all",
                                type === 'boolean' ? "bg-white/10 text-white shadow-lg" : "text-neutral-500 hover:text-neutral-300"
                            )}
                        >
                            Sí / No
                        </button>
                        <button
                            type="button"
                            onClick={() => setType('numeric')}
                            className={cn(
                                "py-3 rounded-xl text-sm font-bold transition-all",
                                type === 'numeric' ? "bg-white/10 text-white shadow-lg" : "text-neutral-500 hover:text-neutral-300"
                            )}
                        >
                            Numérico
                        </button>
                    </div>

                    {/* Numeric Goals */}
                    {type === 'numeric' && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            className="grid grid-cols-2 gap-4"
                        >
                            <div className="space-y-2">
                                <label className="text-xs uppercase font-bold text-neutral-500 tracking-wider">Meta Diaria</label>
                                <input
                                    type="number"
                                    value={goal}
                                    onChange={(e) => setGoal(Number(e.target.value))}
                                    className="w-full bg-neutral-900/50 border border-white/10 rounded-xl p-4 text-white outline-none focus:border-cyan-500/50"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs uppercase font-bold text-neutral-500 tracking-wider">Unidad</label>
                                <input
                                    type="text"
                                    value={unit}
                                    onChange={(e) => setUnit(e.target.value)}
                                    placeholder="min, páginas..."
                                    className="w-full bg-neutral-900/50 border border-white/10 rounded-xl p-4 text-white outline-none focus:border-cyan-500/50"
                                />
                            </div>
                        </motion.div>
                    )}

                    {/* Enhanced Emoji Picker */}
                    <div className="space-y-4">
                        <label className="text-xs uppercase font-bold text-neutral-500 tracking-wider block">Icono</label>

                        {/* Selected Icon Preview */}
                        <div className="flex items-center gap-4 mb-4">
                            <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-4xl bg-white/5 border border-white/10 shadow-[0_0_20px_rgba(0,0,0,0.3)]">
                                {icon}
                            </div>
                            <div className="text-sm text-neutral-400">Selecciona un icono <br /> para identificar tu hábito.</div>
                        </div>

                        {/* Tabs */}
                        <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
                            {EMOJI_CATEGORIES.map(cat => (
                                <button
                                    key={cat.name}
                                    type="button"
                                    onClick={() => setActiveEmojiTab(cat.name)}
                                    className={cn(
                                        "px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider whitespace-nowrap transition-colors flex items-center gap-2",
                                        activeEmojiTab === cat.name ? "bg-white text-black" : "bg-neutral-900 text-neutral-500 hover:text-neutral-300"
                                    )}
                                >
                                    {cat.name}
                                </button>
                            ))}
                        </div>

                        {/* Grid */}
                        <div className="grid grid-cols-6 gap-2">
                            {EMOJI_CATEGORIES.find(c => c.name === activeEmojiTab)?.emojis.map(emoji => (
                                <button
                                    key={emoji}
                                    type="button"
                                    onClick={() => setIcon(emoji)}
                                    className={cn(
                                        "aspect-square rounded-xl flex items-center justify-center text-2xl transition-all hover:scale-110",
                                        icon === emoji ? "bg-cyan-500/20 border border-cyan-500 shadow-[0_0_10px_rgba(6,182,212,0.3)]" : "bg-neutral-900/50 border border-transparent hover:bg-neutral-800"
                                    )}
                                >
                                    {emoji}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Color Picker */}
                    <div className="space-y-3">
                        <label className="text-xs uppercase font-bold text-neutral-500 tracking-wider">Color de Acento</label>
                        <div className="flex flex-wrap gap-3">
                            {colors.map(c => (
                                <button
                                    key={c}
                                    type="button"
                                    onClick={() => setColor(c)}
                                    className={cn(
                                        "h-8 w-8 rounded-full transition-all duration-300",
                                        color === c ? "ring-2 ring-white ring-offset-2 ring-offset-black scale-110" : "hover:scale-110 opacity-70 hover:opacity-100"
                                    )}
                                    style={{ backgroundColor: c, boxShadow: color === c ? `0 0 15px ${c}` : 'none' }}
                                />
                            ))}
                        </div>
                    </div>

                    <div className="h-4" /> {/* Spacer */}
                </div>

                {/* Footer Buttons */}
                <div className="p-6 border-t border-white/5 bg-black/40 backdrop-blur-md flex gap-4">
                    <button
                        type="button"
                        onClick={onClose}
                        className="flex-1 py-4 rounded-xl border border-white/10 text-neutral-400 font-bold hover:bg-white/5 transition-colors"
                    >
                        Cancelar
                    </button>
                    <button
                        type="button"
                        onClick={handleSubmit}
                        className="flex-[2] py-4 bg-white text-black font-bold rounded-xl hover:bg-neutral-200 transition-colors shadow-[0_0_20px_rgba(255,255,255,0.2)]"
                    >
                        {initialData ? 'Guardar Cambios' : 'Crear Hábito'}
                    </button>
                </div>
            </motion.div>
        </div>
    );
}
