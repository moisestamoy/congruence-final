import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ListTodo, Plus, CheckCircle2, Trash2, Circle } from 'lucide-react';
import { useTaskStore } from './useTaskStore';
import { TaskForm } from './TaskForm';
import { useFabStore } from '../../hooks/useFabStore';
import { cn } from '../../utils/cn';

type FilterType = 'all' | 'active' | 'done';

const categoryColors: Record<string, { bg: string; text: string; dot: string }> = {
    Personal:  { bg: 'bg-cyan-500/10',   text: 'text-cyan-400',   dot: 'bg-cyan-400'   },
    Work:      { bg: 'bg-violet-500/10', text: 'text-violet-400', dot: 'bg-violet-400' },
    Finance:   { bg: 'bg-emerald-500/10',text: 'text-emerald-400',dot: 'bg-emerald-400'},
    Habits:    { bg: 'bg-amber-500/10',  text: 'text-amber-400',  dot: 'bg-amber-400'  },
    LongTerm:  { bg: 'bg-rose-500/10',   text: 'text-rose-400',   dot: 'bg-rose-400'   },
};

const priorityDot: Record<string, string> = {
    high:   'bg-red-500',
    medium: 'bg-amber-400',
    low:    'bg-blue-400',
};

const priorityLabel: Record<string, string> = {
    high:   'Alta',
    medium: 'Media',
    low:    'Baja',
};

export default function ToDoPage() {
    const { tasks, toggleTask, removeTask } = useTaskStore();
    const { fabActionTick } = useFabStore();
    const [filter, setFilter] = useState<FilterType>('all');
    const [isFormOpen, setIsFormOpen] = useState(false);

    useEffect(() => {
        if (fabActionTick > 0) setIsFormOpen(true);
    }, [fabActionTick]);

    const filtered = tasks.filter((t) => {
        if (filter === 'active') return !t.completed;
        if (filter === 'done') return t.completed;
        return true;
    });

    const activeCount = tasks.filter(t => !t.completed).length;
    const doneCount = tasks.filter(t => t.completed).length;

    const filters: { value: FilterType; label: string }[] = [
        { value: 'all',    label: 'Todas'       },
        { value: 'active', label: 'Pendientes'  },
        { value: 'done',   label: 'Completadas' },
    ];

    return (
        <div className="min-h-screen bg-[#050505] text-white font-sans selection:bg-indigo-500/30 pb-40 lg:pb-24 relative overflow-hidden">

            {/* Background ambience */}
            <div className="fixed inset-0 pointer-events-none">
                <div className="absolute top-[-15%] left-[5%] w-[50%] h-[50%] bg-indigo-600/[0.05] rounded-full blur-[160px]" />
                <div className="absolute bottom-[-10%] right-[-5%] w-[40%] h-[40%] bg-violet-500/[0.04] rounded-full blur-[130px]" />
            </div>

            <div className="w-full max-w-3xl mx-auto p-4 md:p-8 relative z-10">

                {/* Header */}
                <header className="mb-8 md:mb-10">
                    <div className="flex items-start justify-between gap-4">
                        <div>
                            <div className="inline-flex items-center justify-center p-3 bg-indigo-500/10 rounded-2xl mb-4 border border-indigo-500/20">
                                <ListTodo className="text-indigo-400" size={24} />
                            </div>
                            <h1 className="text-3xl sm:text-4xl font-black tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white via-indigo-100 to-white mb-2">
                                Tareas
                            </h1>
                            <p className="text-sm text-neutral-500">
                                <span className="text-white font-bold">{activeCount}</span> pendientes
                                {doneCount > 0 && (
                                    <> · <span className="text-neutral-600 font-medium">{doneCount} completadas</span></>
                                )}
                            </p>
                        </div>

                        <button
                            onClick={() => setIsFormOpen(true)}
                            className="hidden lg:flex items-center gap-2 px-5 py-3 bg-indigo-500 text-white rounded-2xl font-bold text-sm hover:bg-indigo-400 transition-all shadow-[0_0_24px_rgba(99,102,241,0.25)] hover:shadow-[0_0_36px_rgba(99,102,241,0.4)] shrink-0 mt-1"
                        >
                            <Plus size={17} /> Nueva tarea
                        </button>
                    </div>
                </header>

                {/* Filter tabs */}
                <div className="flex items-center gap-1 bg-white/[0.03] p-1 rounded-2xl border border-white/[0.06] mb-6 w-fit">
                    {filters.map(({ value, label }) => (
                        <button
                            key={value}
                            onClick={() => setFilter(value)}
                            className={cn(
                                "px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-200",
                                filter === value
                                    ? "bg-indigo-500/15 text-indigo-300 border border-indigo-500/25"
                                    : "text-neutral-500 hover:text-neutral-300"
                            )}
                        >
                            {label}
                        </button>
                    ))}
                </div>

                {/* Task list */}
                <div className="space-y-2.5">
                    <AnimatePresence mode="popLayout">
                        {filtered.length === 0 ? (
                            <motion.div
                                key="empty"
                                initial={{ opacity: 0, y: 8 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0 }}
                                className="flex flex-col items-center justify-center py-20 gap-4 text-center"
                            >
                                <div className="w-16 h-16 rounded-2xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center">
                                    {filter === 'done'
                                        ? <CheckCircle2 size={28} className="text-neutral-600" />
                                        : <Circle size={28} className="text-neutral-600" />
                                    }
                                </div>
                                <div>
                                    <p className="text-white/40 font-medium text-sm">
                                        {filter === 'done'
                                            ? 'Sin tareas completadas aún'
                                            : filter === 'active'
                                            ? '¡Todo al día! Sin pendientes'
                                            : 'Sin tareas todavía'
                                        }
                                    </p>
                                    {filter !== 'done' && (
                                        <button
                                            onClick={() => setIsFormOpen(true)}
                                            className="mt-3 text-indigo-400 text-sm font-semibold hover:text-indigo-300 transition-colors"
                                        >
                                            + Añadir primera tarea
                                        </button>
                                    )}
                                </div>
                            </motion.div>
                        ) : (
                            filtered.map((task, i) => {
                                const cat = categoryColors[task.category] ?? { bg: 'bg-white/5', text: 'text-neutral-400', dot: 'bg-neutral-500' };
                                return (
                                    <motion.div
                                        key={task.id}
                                        layout
                                        initial={{ opacity: 0, y: 8 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, x: -20, transition: { duration: 0.18 } }}
                                        transition={{ delay: Math.min(i * 0.04, 0.3) }}
                                        className={cn(
                                            "flex items-center gap-3 p-4 rounded-2xl border transition-all duration-200",
                                            "bg-gradient-to-br from-white/[0.04] to-white/[0.01] border-white/[0.07]",
                                            "hover:border-white/[0.12] hover:from-white/[0.06]",
                                            task.completed && "opacity-50"
                                        )}
                                    >
                                        {/* Checkbox */}
                                        <button
                                            onClick={() => toggleTask(task.id)}
                                            className={cn(
                                                "w-11 h-11 shrink-0 rounded-full border-2 flex items-center justify-center transition-all duration-300 active:scale-95",
                                                task.completed
                                                    ? "bg-indigo-400/20 border-indigo-400/80 shadow-[0_0_12px_rgba(99,102,241,0.3)]"
                                                    : "bg-black/60 border-white/20 hover:border-indigo-400/60 hover:bg-indigo-400/10"
                                            )}
                                        >
                                            {task.completed && (
                                                <CheckCircle2 size={17} className="text-indigo-400" />
                                            )}
                                        </button>

                                        {/* Content */}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-1.5">
                                                <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", priorityDot[task.priority])} />
                                                <span className={cn(
                                                    "font-semibold text-sm truncate",
                                                    task.completed ? "line-through text-neutral-500" : "text-white"
                                                )}>
                                                    {task.title}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className={cn(
                                                    "text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full",
                                                    cat.bg, cat.text
                                                )}>
                                                    {task.category}
                                                </span>
                                                <span className="text-[10px] text-neutral-600 font-medium">
                                                    {priorityLabel[task.priority]}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Delete — always visible */}
                                        <button
                                            onClick={() => removeTask(task.id)}
                                            className="w-9 h-9 rounded-xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center text-neutral-600 hover:text-red-400 hover:bg-red-500/10 hover:border-red-500/20 transition-all shrink-0"
                                            title="Eliminar tarea"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </motion.div>
                                );
                            })
                        )}
                    </AnimatePresence>
                </div>
            </div>

            {/* Form modal */}
            <AnimatePresence>
                {isFormOpen && <TaskForm onClose={() => setIsFormOpen(false)} />}
            </AnimatePresence>
        </div>
    );
}
