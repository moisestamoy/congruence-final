import { useRef } from 'react';
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
    const inputRef = useRef<HTMLInputElement>(null);

    // Generate last 21 days for the mini graph
    const today = new Date();
    const pastDays = Array.from({ length: 21 }).map((_, i) => {
        const d = subDays(today, 20 - i);
        return format(d, 'yyyy-MM-dd');
    });

    // Define colors for the squares (can be customized per category later)
    // For now using the theme's cyan/emerald vibe
    const activeColor = "bg-cyan-500 shadow-[0_0_5px_rgba(6,182,212,0.4)]";
    const inactiveColor = "bg-white/5";

    return (
        <motion.div
            layout
            className={cn(
                "group relative flex items-center justify-between p-4 lg:p-5 rounded-2xl transition-all duration-300 mb-3 overflow-hidden",
                "bg-white/[0.03] border border-white/[0.05] backdrop-blur-md",
                "hover:bg-white/[0.06] hover:shadow-[0_0_20px_rgba(6,182,212,0.1)] hover:border-white/10",
                isCompleted && "opacity-80"
            )}
        >
            {/* Left Section: Controls and Info */}
            <div className="flex items-center gap-3 lg:gap-4 z-10">
                {/* Custom Neon Checkbox */}
                <button
                    onClick={onToggle}
                    className={cn(
                        "flex h-7 w-7 lg:h-8 lg:w-8 shrink-0 items-center justify-center rounded-full transition-all duration-300 border relative overflow-hidden",
                        isCompleted
                            ? "bg-gradient-to-br from-cyan-400 to-blue-500 border-transparent shadow-[0_0_15px_rgba(6,182,212,0.6)]"
                            : "bg-black/50 border-white/20 hover:border-white/50"
                    )}
                >
                    {isCompleted ? <Check className="h-4 w-4 lg:h-5 lg:w-5 text-white stroke-[3] drop-shadow-md" /> : null}
                </button>

                {/* Text Content */}
                <div className="flex flex-col justify-center min-w-0">
                    <div className="flex items-center gap-2">
                        {/* Icon Display */}
                        <span className="text-lg lg:text-xl drop-shadow-md">{habit.icon || '🎯'}</span>
                        <h3 className={cn(
                            "font-bold text-sm lg:text-base tracking-wide truncate transition-colors drop-shadow-sm",
                            isCompleted ? "text-white" : "text-neutral-200"
                        )}>
                            {habit.title}
                        </h3>
                    </div>

                    {/* Subtitle / Input */}
                    <div className="mt-0.5 lg:mt-1 pl-8">
                        {habit.type === 'boolean' ? (
                            <p className="text-[10px] lg:text-xs text-neutral-500 font-bold uppercase tracking-widest">
                                {habit.subtitle || '1 días de racha'}
                            </p>
                        ) : (
                            <div className="flex items-center gap-1.5">
                                <input
                                    ref={inputRef}
                                    type="number"
                                    className="w-10 bg-black/20 rounded-md border border-white/10 px-1 py-0.5 text-white focus:outline-none focus:border-cyan-500 text-center text-xs font-mono font-bold transition-all"
                                    value={currentValue || ''}
                                    placeholder="0"
                                    onChange={(e) => onValueChange(Number(e.target.value))}
                                    onClick={(e) => e.stopPropagation()}
                                />
                                <span className="text-[10px] lg:text-xs text-neutral-500 font-bold uppercase tracking-wider">/ {habit.goal} {habit.unit}</span>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Right Section: Mini Activity Graph & Edit Button */}
            <div className="flex items-center gap-3 lg:gap-4 z-10">
                {/* 7x3 Grid for 21 days */}
                <div className="grid grid-cols-7 grid-rows-3 gap-[2px] opacity-70 group-hover:opacity-100 transition-opacity">
                    {pastDays.map((dateStr) => {
                        const isDayCompleted = !!habit.logs[dateStr]?.completed;
                        return (
                            <div
                                key={dateStr}
                                className={cn(
                                    "w-1.5 h-1.5 lg:w-2 lg:h-2 rounded-[1px] transition-colors",
                                    isDayCompleted ? activeColor : inactiveColor
                                )}
                                title={`${dateStr}: ${isDayCompleted ? 'Completado' : 'No completado'}`}
                            />
                        )
                    })}
                </div>

                {/* Edit Button (Visible on Hover in Desktop, always subtle in Mobile) */}
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        onEdit();
                    }}
                    className="opacity-0 group-hover:opacity-100 p-1.5 lg:p-2 text-neutral-500 hover:text-cyan-400 transition-all rounded-full hover:bg-white/10 bg-white/5 lg:bg-transparent cursor-pointer"
                    title="Editar Hábito"
                >
                    <Edit2 size={14} className="lg:w-4 lg:h-4" />
                </button>
            </div>

            {/* Progress Bar Background for Numeric */}
            {habit.type === 'numeric' && (
                <div
                    className="absolute bottom-0 left-0 h-[2px] lg:h-1 bg-cyan-500/20 transition-all duration-500"
                    style={{ width: `${Math.min((currentValue / habit.goal) * 100, 100)}%` }}
                />
            )}

            {/* Soft background gradient fill when completed */}
            {isCompleted && (
                <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/5 to-transparent pointer-events-none" />
            )}
        </motion.div>
    );
}
