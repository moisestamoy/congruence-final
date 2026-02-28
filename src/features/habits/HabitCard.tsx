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
                "group relative flex items-center justify-between p-5 lg:p-6 rounded-[20px] transition-all duration-300 mb-3 overflow-hidden",
                "bg-white/[0.03] border border-white/[0.05] backdrop-blur-md",
                "hover:bg-white/[0.06] hover:shadow-[0_0_20px_rgba(6,182,212,0.15)] hover:border-white/10",
                isCompleted && "opacity-80"
            )}
        >
            {/* Left Section: Controls and Info */}
            <div className="flex items-center gap-4 lg:gap-5 z-10 flex-1 min-w-0 pr-2 lg:pr-4">
                {/* Custom Neon Checkbox */}
                <button
                    onClick={onToggle}
                    className={cn(
                        "flex h-8 w-8 lg:h-9 lg:w-9 shrink-0 items-center justify-center rounded-full transition-all duration-300 border relative overflow-hidden",
                        isCompleted
                            ? "bg-gradient-to-br from-cyan-400 to-blue-500 border-transparent shadow-[0_0_15px_rgba(6,182,212,0.6)]"
                            : "bg-black/50 border-white/20 hover:border-white/50"
                    )}
                >
                    {isCompleted ? <Check className="h-4 w-4 lg:h-5 lg:w-5 text-white stroke-[3] drop-shadow-md" /> : null}
                </button>

                {/* Text Content */}
                <div className="flex flex-col justify-center flex-1 min-w-0">
                    <div className="flex items-center gap-2 lg:gap-3 min-w-0">
                        {/* Icon Display */}
                        <span className="text-xl lg:text-2xl drop-shadow-md shrink-0">{habit.icon || '🎯'}</span>
                        <h3 className={cn(
                            "font-bold text-base lg:text-lg tracking-wide truncate transition-colors drop-shadow-sm flex-1",
                            isCompleted ? "text-white" : "text-neutral-200"
                        )}>
                            {habit.title}
                        </h3>
                    </div>

                    {/* Subtitle / Input */}
                    <div className="mt-1 lg:mt-1.5 pl-9 lg:pl-10 min-w-0">
                        {habit.type === 'boolean' ? (
                            <p className="text-xs lg:text-sm text-neutral-500 font-bold uppercase tracking-widest truncate">
                                {habit.subtitle || '1 días de racha'}
                            </p>
                        ) : (
                            <div className="flex items-center gap-1.5 min-w-0">
                                <input
                                    ref={inputRef}
                                    type="number"
                                    className="w-10 bg-black/20 rounded-md border border-white/10 px-1 py-0.5 text-white focus:outline-none focus:border-cyan-500 text-center text-xs font-mono font-bold transition-all shrink-0"
                                    value={currentValue || ''}
                                    placeholder="0"
                                    onChange={(e) => onValueChange(Number(e.target.value))}
                                    onClick={(e) => e.stopPropagation()}
                                />
                                <span className="text-[10px] lg:text-xs text-neutral-500 font-bold uppercase tracking-wider truncate">/ {habit.goal} {habit.unit}</span>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Right Section: Mini Activity Graph & Edit Button */}
            <div className="flex items-center gap-4 lg:gap-5 z-10 shrink-0">
                {/* 7x3 Grid for 21 days */}
                <div className="grid grid-cols-7 grid-rows-3 gap-[3px] lg:gap-[4px] opacity-80 group-hover:opacity-100 transition-opacity w-[88px] lg:w-[101px] shrink-0">
                    {pastDays.map((dateStr) => {
                        const isDayCompleted = !!habit.logs[dateStr]?.completed;
                        return (
                            <div
                                key={dateStr}
                                className={cn(
                                    "w-2.5 h-2.5 lg:w-[11px] lg:h-[11px] rounded-[3px] transition-colors shrink-0",
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
