import { useRef } from 'react';
import { motion } from 'framer-motion';
import { Check, Edit2 } from 'lucide-react';
import { cn } from '../../utils/cn';
import { Habit } from '../../types';

interface HabitCardProps {
    habit: Habit;
    isCompleted: boolean;
    currentValue: number;
    onToggle: () => void;
    onValueChange: (val: number) => void;
    onEdit: () => void;
}

export function HabitCard({ habit, isCompleted, currentValue, onToggle, onValueChange, onEdit }: HabitCardProps) {
    const inputRef = useRef<HTMLInputElement>(null);

    // Colors map roughly to the reference (Dark gray bg, white text, subtle icons)

    return (
        <motion.div
            layout
            className={cn(
                "group relative flex items-center gap-4 p-5 rounded-2xl transition-all duration-300 mb-3",
                // Glassmorphism: bg-white/[0.05], subtle border, blur
                "bg-white/[0.05] border border-white/[0.05] backdrop-blur-md",
                "hover:bg-white/[0.08] hover:shadow-[0_0_20px_rgba(6,182,212,0.1)] hover:border-white/10",
                isCompleted && "opacity-70"
            )}
        >
            {/* Custom Neon Checkbox */}
            <button
                onClick={onToggle}
                className={cn(
                    "flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-all duration-300 border relative overflow-hidden",
                    isCompleted
                        ? "bg-gradient-to-br from-cyan-400 to-blue-500 border-transparent shadow-[0_0_15px_rgba(6,182,212,0.6)]" // Neon active state
                        : "bg-transparent border-white/20 hover:border-white/50"
                )}
            >
                {isCompleted ? <Check className="h-5 w-5 text-white stroke-[3] drop-shadow-md" /> : null}
            </button>

            {/* Text Content */}
            <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        {/* Icon Display */}
                        <span className="text-xl">{habit.icon || '🎯'}</span>
                        <h3 className={cn(
                            "font-medium text-base tracking-wide truncate transition-colors",
                            isCompleted ? "text-white" : "text-neutral-200"
                        )}>
                            {habit.title}
                        </h3>
                    </div>

                    {/* Edit Button (Visible on Hover) */}
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onEdit();
                        }}
                        className="opacity-0 group-hover:opacity-100 p-2 text-neutral-400 hover:text-cyan-400 transition-all rounded-full hover:bg-white/10 relative z-20 cursor-pointer"
                        title="Editar Hábito"
                    >
                        <Edit2 size={16} />
                    </button>
                </div>

                {/* Subtitle / Input */}
                <div className="mt-1 pl-8">
                    {habit.type === 'boolean' ? (
                        <p className="text-xs text-neutral-500 font-medium">
                            {habit.subtitle || 'Racha actual: 1'}
                        </p>
                    ) : (
                        <div className="flex items-center gap-2">
                            <input
                                ref={inputRef}
                                type="number"
                                className="w-12 bg-transparent border-b border-white/20 text-white focus:outline-none focus:border-cyan-500 text-right text-sm font-mono transition-colors"
                                value={currentValue || ''}
                                placeholder="0"
                                onChange={(e) => onValueChange(Number(e.target.value))}
                                onClick={(e) => e.stopPropagation()}
                            />
                            <span className="text-xs text-neutral-500">/ {habit.goal} {habit.unit}</span>
                        </div>
                    )}
                </div>
            </div>

            {/* Progress Bar Background for Numeric */}
            {habit.type === 'numeric' && (
                <div
                    className="absolute bottom-0 left-0 h-1 bg-cyan-500/20 transition-all duration-500"
                    style={{ width: `${Math.min((currentValue / habit.goal) * 100, 100)}%` }}
                />
            )}
        </motion.div>
    );
}
