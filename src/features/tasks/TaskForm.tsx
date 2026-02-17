import { useState } from 'react';
import { motion } from 'framer-motion';
import { X } from 'lucide-react';
import { useTaskStore } from './useTaskStore';
import { TaskPriority, TaskCategory } from '../../types';
import { cn } from '../../utils/cn';

interface TaskFormProps {
    onClose: () => void;
}

export function TaskForm({ onClose }: TaskFormProps) {
    const { addTask } = useTaskStore();

    const [title, setTitle] = useState('');
    const [priority, setPriority] = useState<TaskPriority>('medium');
    const [category, setCategory] = useState<TaskCategory>('Personal');

    const categories: TaskCategory[] = ['Personal', 'Work', 'Finance', 'Habits', 'LongTerm'];
    const priorities: { value: TaskPriority; label: string; color: string }[] = [
        { value: 'high', label: 'Alta', color: 'bg-red-500' },
        { value: 'medium', label: 'Media', color: 'bg-yellow-500' },
        { value: 'low', label: 'Baja', color: 'bg-blue-500' },
    ];

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!title.trim()) return;

        addTask({
            title,
            priority,
            category,
            dueDate: new Date().toISOString() // Default to today for now
        });
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-background/80 backdrop-blur-sm p-4">
            <motion.div
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                exit={{ y: "100%" }}
                className="w-full max-w-md bg-card border border-border rounded-t-3xl sm:rounded-3xl shadow-xl p-6"
            >
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-bold">Nueva Tarea</h2>
                    <button onClick={onClose} className="p-2 hover:bg-muted rounded-full">
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Título</label>
                        <input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="¿Qué tienes que hacer?"
                            className="w-full bg-secondary/50 rounded-xl p-3 outline-none focus:ring-2 focus:ring-primary/50"
                            autoFocus
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium">Prioridad</label>
                        <div className="grid grid-cols-3 gap-3">
                            {priorities.map((p) => (
                                <button
                                    key={p.value}
                                    type="button"
                                    onClick={() => setPriority(p.value)}
                                    className={cn(
                                        "flex flex-col items-center gap-1 p-3 rounded-xl border transition-all",
                                        priority === p.value
                                            ? "border-primary bg-primary/5 shadow-sm scale-105"
                                            : "border-border bg-secondary/30 hover:bg-secondary/50"
                                    )}
                                >
                                    <span className={cn("w-3 h-3 rounded-full", p.color)} />
                                    <span className="text-xs font-medium">{p.label}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium">Categoría</label>
                        <div className="flex flex-wrap gap-2">
                            {categories.map((cat) => (
                                <button
                                    key={cat}
                                    type="button"
                                    onClick={() => setCategory(cat)}
                                    className={cn(
                                        "px-3 py-1.5 rounded-lg text-sm transition-all",
                                        category === cat
                                            ? "bg-foreground text-background font-medium"
                                            : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                                    )}
                                >
                                    {cat}
                                </button>
                            ))}
                        </div>
                    </div>

                    <button
                        type="submit"
                        className="w-full py-4 bg-primary text-primary-foreground font-bold rounded-xl active:scale-95 transition-transform"
                    >
                        Guardar Tarea
                    </button>
                </form>
            </motion.div>
        </div>
    );
}
