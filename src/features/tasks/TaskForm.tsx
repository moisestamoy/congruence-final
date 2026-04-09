import { useState } from 'react';
import { motion } from 'framer-motion';
import { X } from 'lucide-react';
import { useTaskStore } from './useTaskStore';
import { TaskPriority, TaskCategory } from '../../types';
import { cn } from '../../utils/cn';
import { toast } from '../../hooks/useToastStore';

interface TaskFormProps {
    onClose: () => void;
}

const categoryColors: Record<TaskCategory, string> = {
    Personal:  'bg-cyan-500/10 text-cyan-300 border-cyan-500/25',
    Work:      'bg-violet-500/10 text-violet-300 border-violet-500/25',
    Finance:   'bg-emerald-500/10 text-emerald-300 border-emerald-500/25',
    Habits:    'bg-amber-500/10 text-amber-300 border-amber-500/25',
    LongTerm:  'bg-rose-500/10 text-rose-300 border-rose-500/25',
};

const priorityConfig: { value: TaskPriority; label: string; dot: string; active: string }[] = [
    { value: 'high',   label: 'Alta',  dot: 'bg-red-500',    active: 'border-red-500/40 bg-red-500/[0.08] text-red-300'   },
    { value: 'medium', label: 'Media', dot: 'bg-amber-400',  active: 'border-amber-400/40 bg-amber-400/[0.08] text-amber-300' },
    { value: 'low',    label: 'Baja',  dot: 'bg-blue-400',   active: 'border-blue-400/40 bg-blue-400/[0.08] text-blue-300' },
];

export function TaskForm({ onClose }: TaskFormProps) {
    const { addTask } = useTaskStore();

    const [title, setTitle] = useState('');
    const [titleError, setTitleError] = useState(false);
    const [priority, setPriority] = useState<TaskPriority>('medium');
    const [category, setCategory] = useState<TaskCategory>('Personal');

    const categories: TaskCategory[] = ['Personal', 'Work', 'Finance', 'Habits', 'LongTerm'];

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!title.trim()) {
            setTitleError(true);
            return;
        }

        addTask({ title: title.trim(), priority, category });
        toast('Tarea añadida', 'success');
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-md p-4">
            <motion.div
                initial={{ y: '100%', opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: '100%', opacity: 0 }}
                transition={{ type: 'spring', bounce: 0.15, duration: 0.45 }}
                className="w-full max-w-md bg-[#0a0a0a] border border-white/10 rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden"
            >
                {/* Header */}
                <div className="flex justify-between items-center px-6 pt-6 pb-4 border-b border-white/[0.06] bg-white/[0.02]">
                    <h2 className="text-lg font-bold text-white tracking-wide">Nueva Tarea</h2>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-white/10 rounded-full text-neutral-400 transition-colors"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    {/* Title */}
                    <div className="space-y-1.5">
                        <label className="text-xs uppercase font-bold text-neutral-500 tracking-wider">Título</label>
                        <input
                            type="text"
                            value={title}
                            onChange={(e) => { setTitle(e.target.value); if (titleError) setTitleError(false); }}
                            placeholder="¿Qué tienes que hacer?"
                            className={cn(
                                "w-full bg-neutral-900/60 border rounded-xl px-4 py-3 text-white placeholder-neutral-700 outline-none transition-all",
                                titleError
                                    ? "border-red-500/60 focus:border-red-500/80"
                                    : "border-white/10 focus:border-indigo-500/50 focus:bg-neutral-900"
                            )}
                            autoFocus
                        />
                        {titleError && (
                            <p className="text-xs text-red-400 mt-1">El título no puede estar vacío</p>
                        )}
                    </div>

                    {/* Priority */}
                    <div className="space-y-2">
                        <label className="text-xs uppercase font-bold text-neutral-500 tracking-wider">Prioridad</label>
                        <div className="grid grid-cols-3 gap-2.5">
                            {priorityConfig.map((p) => (
                                <button
                                    key={p.value}
                                    type="button"
                                    onClick={() => setPriority(p.value)}
                                    className={cn(
                                        "flex flex-col items-center gap-1.5 py-3 rounded-xl border transition-all duration-200",
                                        priority === p.value
                                            ? p.active
                                            : "border-white/[0.06] bg-neutral-900/50 text-neutral-500 hover:border-white/10 hover:text-neutral-300"
                                    )}
                                >
                                    <span className={cn("w-2.5 h-2.5 rounded-full", p.dot)} />
                                    <span className="text-xs font-semibold">{p.label}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Category */}
                    <div className="space-y-2">
                        <label className="text-xs uppercase font-bold text-neutral-500 tracking-wider">Categoría</label>
                        <div className="flex flex-wrap gap-2">
                            {categories.map((cat) => (
                                <button
                                    key={cat}
                                    type="button"
                                    onClick={() => setCategory(cat)}
                                    className={cn(
                                        "px-3 py-1.5 rounded-lg text-xs font-bold border transition-all duration-200",
                                        category === cat
                                            ? categoryColors[cat]
                                            : "border-white/[0.06] bg-white/[0.03] text-neutral-500 hover:text-neutral-300 hover:border-white/10"
                                    )}
                                >
                                    {cat}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Submit */}
                    <div className="flex gap-3 pt-1">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 py-3 rounded-xl border border-white/10 text-neutral-400 font-bold hover:bg-white/5 transition-colors text-sm"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            className="flex-[2] py-3 bg-indigo-500 text-white font-bold rounded-xl hover:bg-indigo-400 transition-all shadow-[0_0_24px_rgba(99,102,241,0.2)] hover:shadow-[0_0_36px_rgba(99,102,241,0.35)] text-sm"
                        >
                            Guardar Tarea
                        </button>
                    </div>
                </form>
            </motion.div>
        </div>
    );
}
