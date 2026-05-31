import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, Trash2, Plus, Calendar } from 'lucide-react';
import { useTaskStore } from './useTaskStore';
import { useFabStore } from '../../hooks/useFabStore';
import { Task, TaskPriority, TaskCategory } from '../../types';
import { cn } from '../../utils/cn';
import { format, parseISO } from 'date-fns';

const PRIORITY_CONFIG: Record<TaskPriority, { label: string; color: string; dot: string }> = {
    high: { label: 'Alta', color: 'text-rose-400', dot: 'bg-rose-500' },
    medium: { label: 'Media', color: 'text-amber-400', dot: 'bg-amber-500' },
    low: { label: 'Baja', color: 'text-sky-400', dot: 'bg-sky-500' },
};

const CATEGORY_LABELS: Record<TaskCategory, string> = {
    Personal: 'Personal',
    Work: 'Trabajo',
    Finance: 'Finanzas',
    Habits: 'Hábitos',
    LongTerm: 'Largo Plazo',
};

interface TaskFormInlineProps {
    onSave: (title: string, priority: TaskPriority, category: TaskCategory) => void;
    onCancel: () => void;
}

function TaskFormInline({ onSave, onCancel }: TaskFormInlineProps) {
    const [title, setTitle] = useState('');
    const [priority, setPriority] = useState<TaskPriority>('medium');
    const [category, setCategory] = useState<TaskCategory>('Personal');
    const priorities: TaskPriority[] = ['high', 'medium', 'low'];
    const categories: TaskCategory[] = ['Personal', 'Work', 'Finance', 'Habits', 'LongTerm'];

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!title.trim()) return;
        onSave(title.trim(), priority, category);
    };

    return (
        <motion.form
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            onSubmit={handleSubmit}
            className="bg-white/[0.04] border border-white/10 rounded-2xl p-4 space-y-3"
        >
            <input
                type="text"
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="¿Qué tienes que hacer?"
                className="w-full bg-transparent text-white placeholder-neutral-600 font-medium text-base outline-none"
                autoFocus
            />
            <div className="flex flex-wrap gap-2">
                {priorities.map(p => (
                    <button
                        key={p}
                        type="button"
                        onClick={() => setPriority(p)}
                        className={cn(
                            "flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all border",
                            priority === p
                                ? `${PRIORITY_CONFIG[p].color} bg-white/10 border-white/20`
                                : "text-neutral-600 border-white/5 hover:border-white/10"
                        )}
                    >
                        <span className={cn("w-1.5 h-1.5 rounded-full", PRIORITY_CONFIG[p].dot)} />
                        {PRIORITY_CONFIG[p].label}
                    </button>
                ))}
                <div className="w-px bg-white/10 mx-1" />
                {categories.map(c => (
                    <button
                        key={c}
                        type="button"
                        onClick={() => setCategory(c)}
                        className={cn(
                            "px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all border",
                            category === c
                                ? "text-cyan-400 bg-cyan-400/10 border-cyan-400/20"
                                : "text-neutral-600 border-white/5 hover:border-white/10"
                        )}
                    >
                        {CATEGORY_LABELS[c]}
                    </button>
                ))}
            </div>
            <div className="flex gap-2 pt-1">
                <button
                    type="submit"
                    className="flex-1 py-2 rounded-xl bg-cyan-500/20 text-cyan-400 font-bold text-sm hover:bg-cyan-500/30 transition-all"
                >
                    Guardar
                </button>
                <button
                    type="button"
                    onClick={onCancel}
                    className="px-4 py-2 rounded-xl bg-white/5 text-neutral-500 font-bold text-sm hover:bg-white/10 transition-all"
                >
                    Cancelar
                </button>
            </div>
        </motion.form>
    );
}

export default function ToDoPage() {
    const { tasks, addTask, toggleTask, removeTask } = useTaskStore();
    const { fabActionTick } = useFabStore();
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [filter, setFilter] = useState<'all' | 'pending' | 'done'>('all');

    useEffect(() => {
        if (fabActionTick > 0) setIsFormOpen(true);
    }, [fabActionTick]); // eslint-disable-line react-hooks/exhaustive-deps

    const handleSave = (title: string, priority: TaskPriority, category: TaskCategory) => {
        addTask({ title, priority, category });
        setIsFormOpen(false);
    };

    const filtered = tasks.filter(t => {
        if (filter === 'pending') return !t.completed;
        if (filter === 'done') return t.completed;
        return true;
    });

    const pending = tasks.filter(t => !t.completed).length;

    return (
        <div className="min-h-screen bg-[#050505] text-white font-sans pb-32 lg:pb-8">
            <div className="fixed inset-0 pointer-events-none">
                <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-500/5 rounded-full blur-[120px]" />
            </div>

            <div className="w-full max-w-2xl mx-auto p-4 md:p-8 relative z-10">
                {/* Header */}
                <div className="flex items-end justify-between mb-6">
                    <div>
                        <h1 className="text-4xl font-bold tracking-tight">Tareas</h1>
                        <p className="text-neutral-500 text-sm mt-1">
                            {pending > 0 ? `${pending} pendiente${pending !== 1 ? 's' : ''}` : 'Todo al día ✓'}
                        </p>
                    </div>
                    <button
                        onClick={() => setIsFormOpen(true)}
                        className="hidden lg:flex items-center gap-2 px-4 py-2 rounded-xl bg-white text-black font-bold text-sm hover:bg-neutral-200 transition-all"
                    >
                        <Plus size={16} />
                        Nueva tarea
                    </button>
                </div>

                {/* Filter tabs */}
                <div className="flex gap-1 bg-white/5 p-1 rounded-xl mb-6">
                    {(['all', 'pending', 'done'] as const).map(f => (
                        <button
                            key={f}
                            onClick={() => setFilter(f)}
                            className={cn(
                                "flex-1 py-2 rounded-lg text-xs font-bold transition-all",
                                filter === f ? "bg-white/10 text-white" : "text-neutral-500 hover:text-white"
                            )}
                        >
                            {f === 'all' ? 'Todas' : f === 'pending' ? 'Pendientes' : 'Completadas'}
                        </button>
                    ))}
                </div>

                {/* New Task Form */}
                <AnimatePresence>
                    {isFormOpen && (
                        <div className="mb-4">
                            <TaskFormInline
                                onSave={handleSave}
                                onCancel={() => setIsFormOpen(false)}
                            />
                        </div>
                    )}
                </AnimatePresence>

                {/* Task List */}
                <div className="space-y-2">
                    <AnimatePresence>
                        {filtered.length === 0 && (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="flex flex-col items-center justify-center py-16 text-center"
                            >
                                <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center mb-4">
                                    <Check size={28} className="text-neutral-600" />
                                </div>
                                <p className="text-neutral-500 font-medium">
                                    {filter === 'done' ? 'Aún no hay tareas completadas' :
                                     filter === 'pending' ? 'No hay tareas pendientes 🎉' :
                                     'No hay tareas. ¡Crea una!'}
                                </p>
                            </motion.div>
                        )}
                        {filtered.map((task: Task) => (
                            <motion.div
                                key={task.id}
                                layout
                                initial={{ opacity: 0, y: -8 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                className={cn(
                                    "flex items-start gap-3 p-4 rounded-2xl border transition-all group",
                                    task.completed
                                        ? "bg-white/[0.02] border-white/5 opacity-50"
                                        : "bg-white/[0.04] border-white/[0.07] hover:border-white/[0.12]"
                                )}
                            >
                                {/* Checkbox */}
                                <button
                                    onClick={() => toggleTask(task.id)}
                                    className={cn(
                                        "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-all",
                                        task.completed
                                            ? "bg-cyan-400/20 border-cyan-400/60"
                                            : "border-white/20 hover:border-cyan-400/60"
                                    )}
                                >
                                    {task.completed && <Check className="w-3 h-3 text-cyan-400" strokeWidth={3} />}
                                </button>

                                {/* Content */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1.5">
                                        <span className={cn("w-2 h-2 rounded-full shrink-0", PRIORITY_CONFIG[task.priority].dot)} />
                                        <span className={cn(
                                            "font-semibold text-sm",
                                            task.completed ? "line-through text-neutral-600" : "text-white"
                                        )}>
                                            {task.title}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <span className="text-[10px] font-bold uppercase tracking-wide text-neutral-600 bg-white/5 px-2 py-0.5 rounded-lg">
                                            {CATEGORY_LABELS[task.category]}
                                        </span>
                                        <span className={cn("text-[10px] font-bold uppercase tracking-wide", PRIORITY_CONFIG[task.priority].color)}>
                                            {PRIORITY_CONFIG[task.priority].label}
                                        </span>
                                        {task.dueDate && (
                                            <span className="flex items-center gap-1 text-[10px] text-neutral-600">
                                                <Calendar size={10} />
                                                {format(parseISO(task.dueDate), 'dd MMM')}
                                            </span>
                                        )}
                                    </div>
                                </div>

                                {/* Delete */}
                                <button
                                    onClick={() => removeTask(task.id)}
                                    className="shrink-0 p-1.5 rounded-lg text-neutral-700 hover:text-rose-400 hover:bg-rose-400/10 opacity-0 group-hover:opacity-100 transition-all"
                                >
                                    <Trash2 size={14} />
                                </button>
                            </motion.div>
                        ))}
                    </AnimatePresence>
                </div>
            </div>
        </div>
    );
}
