import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Check, Edit2 } from 'lucide-react';
import { format, subDays } from 'date-fns';
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
    // Calculate streak locally (helper inside component for simplicity like before)
    const [streak, setStreak] = useState(0);

    useEffect(() => {
        let count = 0;
        let d = new Date();
        const todayStr = format(d, 'yyyy-MM-dd');

        if (habit.logs[todayStr]?.completed) {
            count++;
        }

        d = subDays(d, 1);
        while (true) {
            const dStr = format(d, 'yyyy-MM-dd');
            if (habit.logs[dStr]?.completed) {
                count++;
                d = subDays(d, 1);
            } else {
                break;
            }
        }
        setStreak(count);
    }, [habit.logs]);

    const getStreakText = (count: number) => {
        if (count === 0) return 'Sin racha aún';
        if (count === 1) return '🔥 1 día de racha';
        return `🔥 ${count} días de racha`;
    };

    return (
        <motion.div
            layout
            className={cn(
                "group relative flex flex-col items-stretch gap-2 lg:gap-3 p-5 lg:p-6 rounded-[20px] transition-all duration-300 mb-2 overflow-hidden",
                "bg-white/[0.04] border border-white/[0.07] backdrop-blur-md",
                "hover:bg-white/[0.07] hover:border-white/[0.12] hover:shadow-[0_0_24px_rgba(6,182,212,0.12),inset_0_1px_0_rgba(255,255,255,0.05)]",
                isCompleted && "border-cyan-400/20 shadow-[0_0_20px_rgba(6,182,212,0.08)] opacity-80"
            )}
        >
            <div className="flex items-start justify-between w-full">
                <div className="flex flex-row items-center gap-3 lg:gap-[10px] min-w-0 flex-1">
                    {/* Custom Neon Checkbox - Bigger and better contrast */}
                    <button
                        onClick={onToggle}
                        className={cn(
                            "flex h-10 w-10 lg:h-11 lg:w-11 shrink-0 items-center justify-center rounded-full transition-all duration-300 border-2 relative overflow-hidden active:scale-95",
                            isCompleted
                                ? "bg-cyan-400/20 border-cyan-400/80 shadow-[0_0_16px_rgba(6,182,212,0.4)]"
                                : "bg-black/60 border-white/20 hover:border-cyan-400/60 hover:bg-cyan-400/10 hover:shadow-[0_0_12px_rgba(6,182,212,0.3)]"
                        )}
                    >
                        {isCompleted && (
                            <Check className="w-5 h-5 text-cyan-400 stroke-[3]" />
                        )}
                    </button>

                    {/* Text Content */}
                    <div className="flex flex-col justify-center min-w-0 flex-1">
                        <div className="flex items-center gap-2 lg:gap-3 min-w-0">
                            {/* Icon Display */}
                            <span className="text-xl lg:text-2xl drop-shadow-md shrink-0">{habit.icon || '🎯'}</span>
                            <h3 className={cn(
                                "font-bold text-base lg:text-lg tracking-wide truncate transition-colors drop-shadow-sm max-w-full",
                                isCompleted ? "text-cyan-300" : "text-neutral-200"
                            )}>
                                {habit.title}
                            </h3>
                        </div>

                        {/* Subtitle / Input - Better layout for both types */}
                        <div className="mt-1 lg:mt-1.5 pl-9 lg:pl-[2.75rem] min-w-0">
                            {habit.type === 'boolean' ? (
                                <span className={cn(
                                    "text-xs font-medium tracking-wide max-w-full truncate block",
                                    streak > 0 ? "text-cyan-400/70" : "text-white/30"
                                )}>
                                    {getStreakText(streak)}
                                </span>
                            ) : (
                                <div className="flex flex-col gap-1 w-full mt-1">
                                    {/* Progress Bar for numeric/time */}
                                    <div className="flex items-center gap-2 mt-1">
                                        <div className="w-32 h-1.5 rounded-full bg-white/10 overflow-hidden shrink-0">
                                            <div
                                                className="h-full rounded-full bg-cyan-400/70 transition-all duration-500"
                                                style={{ width: `${Math.min(((currentValue || 0) / habit.goal) * 100, 100)}%` }}
                                            />
                                        </div>
                                        <span className="text-xs text-white/40 tabular-nums">
                                            {currentValue ?? 0}/{habit.goal} {habit.unit || 'min'}
                                        </span>
                                    </div>

                                    {/* Quick action buttons */}
                                    <div className="flex gap-1.5 mt-2 overflow-x-auto custom-scrollbar pb-1">
                                        <button
                                            onClick={(e) => { e.stopPropagation(); onValueChange(Math.max(0, (currentValue || 0) - 5)); }}
                                            className="px-3 py-1 text-xs rounded-lg bg-white/5 border border-white/10 text-white/50 hover:bg-white/10 hover:text-white/70 transition-all shrink-0"
                                        >
                                            -5
                                        </button>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); onValueChange((currentValue || 0) + 10); }}
                                            className="px-3 py-1.5 text-xs rounded-lg bg-cyan-400/15 border border-cyan-400/25 text-cyan-400/80 hover:bg-cyan-400/25 hover:text-cyan-400 transition-all font-medium shrink-0"
                                        >
                                            +10
                                        </button>
                                        {(currentValue || 0) >= habit.goal && (
                                            <button
                                                onClick={(e) => { e.stopPropagation(); if (!isCompleted) onToggle(); }}
                                                className="px-3 py-1.5 text-xs rounded-lg bg-cyan-400/20 border border-cyan-400/40 text-cyan-400 hover:bg-cyan-400/30 transition-all font-medium ml-auto shrink-0"
                                            >
                                                ✓ Listo
                                            </button>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Edit Button */}
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        onEdit();
                    }}
                    className="opacity-0 group-hover:opacity-100 p-1.5 lg:p-2.5 text-neutral-500 hover:text-cyan-400 transition-all rounded-xl hover:bg-white/10 bg-white/5 lg:bg-transparent cursor-pointer shrink-0 ml-2"
                    title="Editar Hábito"
                >
                    <Edit2 size={16} className="lg:w-4 lg:h-4" />
                </button>
            </div>

            {/* Soft background gradient fill when completed */}
            {isCompleted && (
                <div className="absolute inset-0 bg-gradient-to-r from-cyan-400/5 to-transparent pointer-events-none" />
            )}
        </motion.div>
    );
}
