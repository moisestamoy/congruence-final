import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LayoutTemplate, Monitor, User, ChevronLeft, ChevronRight, Eye, EyeOff } from 'lucide-react';
import { CongruenceLevelIndicator } from './CongruenceLevelIndicator';
import { HabitCard } from './HabitCard';
import { HabitForm } from './HabitForm';
import { useHabitStore } from './useHabitStore';
import { format, addDays } from 'date-fns';
import { cn } from '../../utils/cn';

import { IdentityProtocolWizard } from './IdentityProtocolWizard';
import { Habit } from '../../types';
import { useGameStore } from '../gamification/useGameStore'; // Import GameStore

export default function HabitsPage() {
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [isIdentityBuilderOpen, setIsIdentityBuilderOpen] = useState(false);
    const [layoutView, setLayoutView] = useState<'split' | 'central'>('split');
    const [editingHabit, setEditingHabit] = useState<Habit | null>(null);
    const [currentDate, setCurrentDate] = useState(new Date());
    const [isMobileCircleVisible, setIsMobileCircleVisible] = useState(true);

    const navigateDate = (days: number) => {
        setCurrentDate(prev => addDays(prev, days));
    };

    // --- GAMIFICATION STATE (Dev) ---
    const [userStreak] = useState(0);

    // --- GAMIFICATION LOGIC ---
    // Level 1 (Base): 0 - 13 days
    // Level 2 (Active): 14 - 29 days
    // Level 3 (Radiant): 30 - 59 days
    // Level 4 (Flow): 60 - 199 days
    // Level 5 (Diamond): 200 - 364 days
    // Level 6 (Cosmic): 365+ days



    const calculateLevel = (streak: number) => {
        if (streak >= 365) return 6;
        if (streak >= 200) return 5;
        if (streak >= 60) return 4;
        if (streak >= 30) return 3;
        if (streak >= 14) return 2;
        return 1;
    };

    const currentLevel = calculateLevel(userStreak);

    // Dynamic Glow based on Level (Ambient Background)
    const getAmbientGlow = () => {
        switch (currentLevel) {
            case 6: return 'drop-shadow-[0_0_50px_rgba(255,255,255,0.3)]'; // Cosmic White/Rainbow
            case 5: return 'drop-shadow-[0_0_40px_rgba(14,165,233,0.3)]'; // Diamond Blue
            case 4: return 'drop-shadow-[0_0_30px_rgba(251,191,36,0.2)]'; // Gold
            case 3: return 'drop-shadow-[0_0_25px_rgba(217,70,239,0.2)]'; // Violet
            case 2: return 'drop-shadow-[0_0_15px_rgba(6,182,212,0.15)]'; // Cyan
            default: return '';
        }
    };

    const { habits, getCongruence, toggleHabit, setHabitValue, manifesto } = useHabitStore();

    const selectedDate = format(currentDate, 'yyyy-MM-dd');
    const congruence = getCongruence(selectedDate);
    const sortedHabits = [...habits].sort((a, b) => {
        const aCompleted = !!a.logs[selectedDate]?.completed;
        const bCompleted = !!b.logs[selectedDate]?.completed;
        if (aCompleted === bCompleted) return 0;
        return aCompleted ? 1 : -1;
    });

    // Handler to open form for creating a new habit
    const handleCreateHabit = () => {
        setEditingHabit(null);
        setIsFormOpen(true);
    };

    // Handler to open form for editing an existing habit
    const handleEditHabit = (habit: Habit) => {
        setEditingHabit(habit);
        setIsFormOpen(true);
    };

    // Handler for toggling habit (+ Points Logic)
    const handleToggleHabit = (habitId: string) => {
        const habit = habits.find(h => h.id === habitId);
        if (!habit) return;

        const isCompleted = !!habit.logs[selectedDate]?.completed;

        // If it was NOT completed, and we are toggling -> It becomes completed -> Award Points
        if (!isCompleted) {
            useGameStore.getState().addPoints(10, `Hábito completado: ${habit.title}`);
            // Optional: Trigger a sound or confetti here later
        }

        toggleHabit(habitId, selectedDate);
    };

    return (
        <div className="min-h-screen lg:h-screen w-full bg-[#020202] bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] from-cyan-900/20 via-[#050505] to-[#020202] text-white overflow-y-auto lg:overflow-hidden relative p-4 lg:p-8 font-sans">

            {/* Ambient Background Glow */}
            <div className={cn("absolute top-0 left-1/2 -translate-x-1/2 w-full h-1/2 pointer-events-none transition-all duration-1000", getAmbientGlow())} />



            {/* HEADER ACTIONS */}
            <div className="absolute top-8 right-8 z-40 flex gap-4">
                <button
                    onClick={() => setIsIdentityBuilderOpen(true)}
                    className="w-12 h-12 p-0 rounded-full backdrop-blur-lg bg-white/5 border border-white/10 text-neutral-400 hover:text-cyan-400 hover:bg-white/10 transition-all shadow-lg hover:shadow-cyan-500/20 flex items-center justify-center group"
                    title="Definir Identidad"
                >
                    <User size={22} className="opacity-80 group-hover:opacity-100 transition-opacity" />
                </button>
                <div className="hidden lg:block">
                    <button
                        onClick={() => setLayoutView(layoutView === 'split' ? 'central' : 'split')}
                        className="w-12 h-12 p-0 rounded-full backdrop-blur-lg bg-white/5 border border-white/10 text-neutral-400 hover:text-white hover:bg-white/10 transition-all shadow-lg hover:shadow-white/20 flex items-center justify-center group"
                        title={layoutView === 'split' ? "Cambiar a Vista Central" : "Cambiar a Vista Dividida"}
                    >
                        {layoutView === 'split' ?
                            <Monitor size={22} className="opacity-80 group-hover:opacity-100 transition-opacity" /> :
                            <LayoutTemplate size={22} className="opacity-80 group-hover:opacity-100 transition-opacity" />
                        }
                    </button>
                </div>
            </div>

            <AnimatePresence mode="wait">
                {layoutView === 'split' ? (
                    // --- LAYOUT A: SPLIT (Grid Layout) ---
                    <motion.div
                        key="split"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="flex flex-col lg:grid lg:grid-cols-2 h-full gap-8 lg:gap-12"
                    >
                        {/* Columna Izquierda (Anillo) - 50% */}
                        <div className={cn(
                            "flex-col justify-center items-center relative min-h-[30vh] lg:min-h-0 lg:h-full mt-4 lg:mt-0 lg:flex transition-all duration-500",
                            isMobileCircleVisible ? "flex opacity-100" : "hidden opacity-0"
                        )}>
                            {/* Ambient Glow behind rings - Dynamic based on level */}
                            <div className={cn(
                                "absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full pointer-events-none mix-blend-screen transition-all duration-1000",
                                currentLevel >= 3 ? "bg-cyan-500/30 w-[600px] h-[600px] blur-[100px]" : "bg-cyan-500/10 w-[300px] h-[300px] blur-[80px]"
                            )} />

                            <div className="scale-[0.55] lg:scale-110 relative z-10 transition-transform duration-500">
                                <CongruenceLevelIndicator percentage={congruence} size={450} strokeWidth={35} level={currentLevel} />
                            </div>
                            <p className="-mt-12 lg:mt-8 text-cyan-100/60 font-medium italic text-center max-w-xs lg:max-w-sm drop-shadow-md tracking-wide text-[10px] lg:text-base px-4 lg:px-0">
                                "La consistencia no es perfección. Es simplemente no rendirse nunca."
                            </p>
                        </div>

                        {/* Columna Derecha (Hábitos) - 50% - Grid Glass Panel */}
                        <div className={cn("flex flex-col justify-center lg:max-h-[90vh] transition-all duration-500", isMobileCircleVisible ? "h-full" : "h-[90vh]")}>
                            <div className={cn(
                                "backdrop-blur-3xl bg-white/[0.02] border border-white/[0.08] shadow-[0_25px_50px_-12px_rgba(0,0,0,0.8)] lg:rounded-[3rem] p-4 lg:p-10 h-full flex flex-col relative overflow-hidden group transition-all duration-500",
                                isMobileCircleVisible ? "rounded-t-[2.5rem]" : "rounded-t-none lg:rounded-t-[3rem]"
                            )}>
                                {/* Subtle internal sheen/gradient */}
                                <div className="absolute inset-0 bg-gradient-to-br from-white/[0.05] via-transparent to-transparent pointer-events-none" />

                                <div className="flex justify-between items-end mb-6 lg:mb-10 relative z-10 border-b border-white/5 pb-4 lg:pb-6">
                                    <div>
                                        <h2 className="text-2xl lg:text-3xl font-bold tracking-tight text-white drop-shadow-md mb-1">Tu Hábito</h2>
                                        <p className="text-cyan-400 text-xs lg:text-sm font-bold uppercase tracking-widest leading-none">Panel de Control</p>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <button
                                            onClick={() => setIsMobileCircleVisible(!isMobileCircleVisible)}
                                            className="lg:hidden p-2 rounded-full backdrop-blur-lg bg-white/5 border border-white/10 text-neutral-400 hover:text-cyan-400 hover:bg-white/10 transition-all shadow-lg flex items-center justify-center group"
                                            title={isMobileCircleVisible ? "Ocultar progreso" : "Ver progreso"}
                                        >
                                            {isMobileCircleVisible ? <EyeOff size={16} /> : <Eye size={16} />}
                                        </button>
                                        <div className="flex items-center gap-2 bg-white/5 rounded-full p-1 border border-white/10">
                                            <button
                                                onClick={() => navigateDate(-1)}
                                                className="p-1.5 rounded-full hover:bg-white/10 text-neutral-400 hover:text-white transition-colors"
                                            >
                                                <ChevronLeft size={16} />
                                            </button>
                                            <span className="text-xs lg:text-sm text-neutral-200 font-mono tracking-wider px-2 font-bold min-w-[100px] text-center">
                                                {format(currentDate, 'dd MMM yyyy')}
                                            </span>
                                            <button
                                                onClick={() => navigateDate(1)}
                                                className="p-1.5 rounded-full hover:bg-white/10 text-neutral-400 hover:text-white transition-colors"
                                                disabled={format(currentDate, 'yyyy-MM-dd') >= format(new Date(), 'yyyy-MM-dd')}
                                            >
                                                <ChevronRight size={16} className={cn(format(currentDate, 'yyyy-MM-dd') >= format(new Date(), 'yyyy-MM-dd') ? "opacity-30" : "")} />
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 overflow-y-auto pr-2 custom-scrollbar flex-1 relative z-10 content-start">
                                    {sortedHabits.map(habit => (
                                        <div key={habit.id} className="group h-full relative">
                                            <HabitCard
                                                habit={habit}
                                                isCompleted={!!habit.logs[selectedDate]?.completed}
                                                currentValue={habit.logs[selectedDate]?.value || 0}
                                                onToggle={() => handleToggleHabit(habit.id)}
                                                onValueChange={(val) => setHabitValue(habit.id, selectedDate, val)}
                                                onEdit={() => handleEditHabit(habit)}
                                            />
                                        </div>
                                    ))}
                                </div>

                                <button
                                    onClick={handleCreateHabit}
                                    className="mt-6 lg:mt-8 w-full py-4 lg:py-5 rounded-xl lg:rounded-2xl border border-dashed border-white/10 bg-white/[0.01] hover:bg-white/[0.05] hover:border-cyan-500/30 hover:shadow-[0_0_30px_rgba(6,182,212,0.1)] transition-all flex items-center justify-center gap-2 text-neutral-500 hover:text-cyan-200 relative z-10 group"
                                >
                                    <span className="text-[10px] lg:text-xs font-bold uppercase tracking-[0.2em] group-hover:scale-105 transition-transform">+ Nuevo Objetivo</span>
                                </button>
                            </div>
                        </div>
                    </motion.div>
                ) : (
                    // --- LAYOUT B: CENTRAL (Glass Panel Updated) ---
                    <motion.div
                        key="central"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="flex flex-col lg:grid lg:grid-cols-12 h-full gap-8 items-center overflow-y-auto lg:overflow-hidden pb-20 lg:pb-0"
                    >
                        {/* Columna Izquierda (Stats) - 3/12 - Orden 1 - GLASS CARDS */}
                        <div className="w-full lg:col-span-3 lg:h-full flex flex-col lg:justify-center gap-6 py-4 lg:py-12 order-2 lg:order-1">
                            {/* Card 1: Identity */}
                            <div
                                onClick={() => setIsIdentityBuilderOpen(true)}
                                className="backdrop-blur-xl bg-white/[0.02] border border-white/[0.08] rounded-[2rem] p-6 lg:p-8 flex flex-col justify-center relative overflow-hidden group shadow-lg hover:shadow-cyan-900/20 transition-all duration-500 min-h-[160px] lg:h-1/2 cursor-pointer"
                            >
                                <div className="absolute inset-0 bg-gradient-to-br from-white/[0.05] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                                <h3 className="text-cyan-400 text-[10px] lg:text-xs font-bold uppercase tracking-widest mb-2 lg:mb-4 z-10 flex items-center gap-2">
                                    <div className="w-1 h-4 bg-cyan-500 rounded-full" /> Identidad
                                </h3>
                                <p className="text-xl lg:text-2xl font-bold text-white leading-tight z-10 drop-shadow-md">
                                    "{manifesto?.identities.personal || "Define tu identidad..."}"
                                </p>
                                <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-cyan-500/10 rounded-full blur-[50px] group-hover:bg-cyan-500/20 transition-all duration-700" />
                            </div>

                            {/* Card 2: Streak */}
                            <div className="backdrop-blur-xl bg-white/[0.02] border border-white/[0.08] rounded-[2rem] p-6 lg:p-8 flex flex-col justify-center relative overflow-hidden group shadow-lg hover:shadow-emerald-900/20 transition-all duration-500 min-h-[160px] lg:h-1/2">
                                <div className="absolute inset-0 bg-gradient-to-br from-white/[0.05] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                                <h3 className="text-emerald-400 text-[10px] lg:text-xs font-bold uppercase tracking-widest mb-2 lg:mb-4 z-10 flex items-center gap-2">
                                    <div className="w-1 h-4 bg-emerald-500 rounded-full" /> Racha Global
                                </h3>
                                <div className="flex items-baseline gap-2 z-10">
                                    <span className="text-6xl lg:text-7xl font-bold text-white tracking-tighter drop-shadow-xl">{userStreak}</span>
                                    <span className="text-lg lg:text-xl text-neutral-400 font-medium">días</span>
                                </div>
                                <p className="text-xs lg:text-sm text-neutral-500 mt-2 z-10 font-medium">Mejor racha del mes</p>
                                <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-emerald-500/10 rounded-full blur-[50px] group-hover:bg-emerald-500/20 transition-all duration-700" />
                            </div>
                        </div>

                        {/* Columna Central (Núcleo) - 6/12 - Orden 2 - GIANT NEON RING */}
                        <div className="w-full lg:col-span-6 flex justify-center items-center relative min-h-[150px] lg:min-h-0 order-1 lg:order-2 my-2 lg:my-0">
                            {/* Ambient Glow */}
                            <div className={cn(
                                "absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full pointer-events-none mix-blend-screen transition-all duration-1000",
                                currentLevel >= 3 ? "bg-cyan-500/30 w-[600px] h-[600px] blur-[150px]" : "bg-cyan-500/10 w-[300px] h-[300px] blur-[80px]"
                            )} />
                            <div className="scale-[0.45] md:scale-75 lg:scale-110 relative z-10 transition-transform duration-500">
                                <CongruenceLevelIndicator percentage={congruence} size={600} strokeWidth={35} level={currentLevel} />
                            </div>
                        </div>

                        {/* Columna Derecha (Hábitos Lista) - 3/12 - Orden 3 - GLASS LIST */}
                        <div className="w-full lg:col-span-3 lg:h-full flex flex-col justify-center py-4 lg:py-12 order-3">
                            <div className="backdrop-blur-3xl bg-white/[0.02] border border-white/[0.08] rounded-t-[2.5rem] lg:rounded-[2.5rem] h-full p-4 lg:p-6 flex flex-col relative overflow-hidden shadow-2xl min-h-[400px]">
                                {/* Header */}
                                <div className="mb-4 lg:mb-6 pb-4 border-b border-white/5 flex items-center justify-between">
                                    <h2 className="text-lg font-bold tracking-tight text-white flex items-center gap-3">
                                        <div className="w-2 h-2 rounded-full bg-cyan-500 shadow-[0_0_10px_#06b6d4]" />
                                        HÁBITOS
                                    </h2>
                                    <div className="flex items-center gap-1 bg-white/5 rounded-full p-1 border border-white/10">
                                        <button
                                            onClick={() => navigateDate(-1)}
                                            className="p-1 rounded-full hover:bg-white/10 text-neutral-400 hover:text-white transition-colors"
                                        >
                                            <ChevronLeft size={14} />
                                        </button>
                                        <span className="text-[10px] text-neutral-200 font-mono tracking-wider px-1.5 font-bold min-w-[60px] text-center">
                                            {format(currentDate, 'dd MMM')}
                                        </span>
                                        <button
                                            onClick={() => navigateDate(1)}
                                            className="p-1 rounded-full hover:bg-white/10 text-neutral-400 hover:text-white transition-colors"
                                            disabled={format(currentDate, 'yyyy-MM-dd') >= format(new Date(), 'yyyy-MM-dd')}
                                        >
                                            <ChevronRight size={14} className={cn(format(currentDate, 'yyyy-MM-dd') >= format(new Date(), 'yyyy-MM-dd') ? "opacity-30" : "")} />
                                        </button>
                                    </div>
                                </div>

                                {/* List */}
                                <div className="space-y-3 overflow-y-auto flex-1 pr-2 custom-scrollbar relative z-10">
                                    {sortedHabits.map(habit => (
                                        <div key={habit.id} className="transform hover:scale-[1.02] transition-transform duration-300">
                                            <HabitCard
                                                habit={habit}
                                                isCompleted={!!habit.logs[selectedDate]?.completed}
                                                currentValue={habit.logs[selectedDate]?.value || 0}
                                                onToggle={() => handleToggleHabit(habit.id)}
                                                onValueChange={(val) => setHabitValue(habit.id, selectedDate, val)}
                                                onEdit={() => handleEditHabit(habit)}
                                            />
                                        </div>
                                    ))}
                                </div>

                                <button
                                    onClick={handleCreateHabit}
                                    className="mt-4 w-full py-4 rounded-xl border border-dashed border-white/10 bg-white/[0.01] hover:bg-white/[0.05] hover:border-cyan-500/30 transition-all flex items-center justify-center gap-2 text-neutral-500 hover:text-cyan-200 relative z-10"
                                >
                                    <span className="text-xs font-bold uppercase tracking-widest">+ Añadir</span>
                                </button>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Modal Portal */}
            {isFormOpen && (
                <HabitForm
                    onClose={() => setIsFormOpen(false)}
                    initialData={editingHabit}
                />
            )}
            <IdentityProtocolWizard
                isOpen={isIdentityBuilderOpen}
                onClose={() => setIsIdentityBuilderOpen(false)}
            />
        </div>
    );
}
