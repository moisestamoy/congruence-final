import { Task } from '../../types';
import { cn } from '../../utils/cn';
import { Check, Trash2, Calendar, Tag } from 'lucide-react';
import { format, parseISO } from 'date-fns';

interface TaskCardProps {
    task: Task;
    onToggle: () => void;
    onDelete: () => void;
}

const priorityColors = {
    high: 'border-red-500/50 bg-red-500/5',
    medium: 'border-yellow-500/50 bg-yellow-500/5',
    low: 'border-blue-500/50 bg-blue-500/5',
}

const priorityIndicator = {
    high: 'bg-red-500',
    medium: 'bg-yellow-500',
    low: 'bg-blue-500',
}

export function TaskCard({ task, onToggle, onDelete }: TaskCardProps) {
    return (
        <div className={cn(
            "group relative flex items-start gap-3 p-4 rounded-xl border transition-all hover:shadow-md",
            task.completed ? "border-border bg-muted/20 opacity-60" : "bg-card",
            !task.completed ? priorityColors[task.priority] : ""
        )}>

            {/* Checkbox */}
            <button
                onClick={onToggle}
                className={cn(
                    "mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition-colors",
                    task.completed ? "bg-primary border-primary text-primary-foreground" : "border-muted-foreground hover:border-primary"
                )}
            >
                {task.completed && <Check className="h-3 w-3" />}
            </button>

            {/* Content */}
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                    <span className={cn("h-2 w-2 rounded-full", priorityIndicator[task.priority])} />
                    <h3 className={cn("font-medium truncate", task.completed && "line-through text-muted-foreground")}>
                        {task.title}
                    </h3>
                </div>

                <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                    <span className="bg-secondary px-2 py-0.5 rounded text-secondary-foreground font-medium">
                        {task.category}
                    </span>
                    {task.dueDate && (
                        <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            <span>{format(parseISO(task.dueDate), 'MMM dd')}</span>
                        </div>
                    )}
                    {task.tags.length > 0 && (
                        <div className="flex items-center gap-1">
                            <Tag className="h-3 w-3" />
                            <span>{task.tags[0]}</span>
                        </div>
                    )}
                </div>
            </div>

            {/* Actions */}
            <button
                onClick={onDelete}
                className="opacity-0 group-hover:opacity-100 p-2 text-muted-foreground hover:text-red-500 transition-all"
                title="Delete task"
            >
                <Trash2 className="h-4 w-4" />
            </button>
        </div>
    );
}
