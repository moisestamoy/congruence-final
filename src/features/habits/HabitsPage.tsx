import { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LayoutTemplate, Monitor, User, ChevronLeft, ChevronRight, LogIn, LogOut, Shield, Flame, CheckCircle2, ArrowRight, Brain } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { CongruenceLevelIndicator } from './CongruenceLevelIndicator';
import { HabitCard } from './HabitCard';
import { CoachCard } from './CoachCard';
import { HabitForm } from './HabitForm';
import { useHabitStore } from './useHabitStore';
import { format, addDays, subDays } from 'date-fns';
import { cn } from '../../utils/cn';

import { IdentityProtocolWizard } from './IdentityProtocolWizard';
import { Habit } from '../../types';
import { useGameStore } from '../gamification/useGameStore'; // Import GameStore
import { useFabStore } from '../../hooks/useFabStore';
import { useAuth } from '../../context/AuthContext';
import { AuthModal } from '../auth/AuthModal';
import { useTheme } from '../../hooks/useTheme';
import { useNavStore } from '../../hooks/useNavStore';

export default function HabitsPage() {
    const navigate = useNavigate();
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [isIdentityBuilderOpen, setIsIdentityBuilderOpen] = useState(false);
    const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
    const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
    const [layoutView, setLayoutView] = useState<'split' | 'central'>('split');
    const [editingHabit, setEditingHabit] = useState<Habit | null>(null);
    const [currentDate, setCurrentDate] = useState(new Date());
    const { fabActionTick } = useFabStore();
    const [isScrolled, setIsScrolled] = useState(false);
    const habitsListRef = useRef<HTMLDivElement>(null);
    const lastScrollTopRef = useRef(0);
    const { setNavVisible } = useNavStore();
    const { user, signOut } = useAuth();
    const { theme, setTheme } = useTheme();
    const isAccion = theme === 'accion';
    const { habits, getCongruence, toggleHabit, setHabitValue, manifesto, markHabitSkip } = useHabitStore();

    const navigateDate = (days: number) => {
        setCurrentDate(prev => addDays(prev, days));
    };

    // --- GAMIFICATION: Real streak calculation ---
    const userStreak = useMemo(() => {
        const todayStr = format(new Date(), 'yyyy-MM-dd');
        let count = 0;
        const todayC = getCongruence(todayStr);
        if (todayC > 0 || todayC === -1) count++;
        for (let i = 1; i <= 365; i++) {
            const d = subDays(new Date(), i);
            const dStr = format(d, 'yyyy-MM-dd');
            const c = getCongruence(dStr);
            if (c > 0 || c === -1) count++;
            else break;
        }
        return count;
    }, [habits, getCongruence]);

    // --- 90-DAY IDENTITY PROGRESS ---
    const ninetyDayStats = useMemo(() => {
        let congruentDays = 0;
        const weekDots: boolean[] = [];
        for (let i = 0; i < 90; i++) {
            const d = subDays(new Date(), i);
            const c = getCongruence(format(d, 'yyyy-MM-dd'));
            if (c > 0 || c === -1) congruentDays++;
            if (i < 7) weekDots.unshift(c > 0);  // last 7 days, oldest first
        }
        return { congruentDays, weekDots };
    }, [habits, getCongruence]);

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
        if (isAccion) {
            switch (currentLevel) {
                case 6: return 'drop-shadow-[0_0_60px_rgba(239,68,68,0.5)]';
                case 5: return 'drop-shadow-[0_0_50px_rgba(239,68,68,0.45)]';
                case 4: return 'drop-shadow-[0_0_40px_rgba(239,68,68,0.4)]';
                case 3: return 'drop-shadow-[0_0_35px_rgba(239,68,68,0.35)]';
                case 2: return 'drop-shadow-[0_0_25px_rgba(239,68,68,0.25)]';
                default: return 'drop-shadow-[0_0_15px_rgba(239,68,68,0.15)]'; // L1 still has subtle glow
            }
        }
        switch (currentLevel) {
            case 6: return 'drop-shadow-[0_0_50px_rgba(255,255,255,0.3)]';
            case 5: return 'drop-shadow-[0_0_40px_rgba(14,165,233,0.3)]';
            case 4: return 'drop-shadow-[0_0_30px_rgba(251,191,36,0.2)]';
            case 3: return 'drop-shadow-[0_0_25px_rgba(217,70,239,0.2)]';
            case 2: return 'drop-shadow-[0_0_15px_rgba(6,182,212,0.15)]';
            default: return '';
        }
    };

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

    // Global FAB Event Listener using Zustand
    useEffect(() => {
        if (fabActionTick > 0) {
            handleCreateHabit();
        }
    }, [fabActionTick]); // eslint-disable-line react-hooks/exhaustive-deps

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
        <div className={cn(
            "h-screen overflow-hidden flex flex-col w-full text-white relative p-3 lg:p-8 font-sans",
            isAccion
                ? "bg-[#000000] bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] from-red-950/40 via-[#000000] to-[#000000]"
                : "bg-[#020202] bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] from-cyan-900/20 via-[#050505] to-[#020202]"
        )}>

            {/* Ambient Background Glow */}
            <div className={cn("absolute top-0 left-1/2 -translate-x-1/2 w-full h-1/2 pointer-events-none transition-all duration-1000", getAmbientGlow())} />
            {/* ACCIÓN extra deep-red floor glow */}
            {isAccion && (
                <div className="absolute bottom-0 left-0 w-full h-1/3 pointer-events-none bg-gradient-to-t from-red-950/20 to-transparent" />
            )}



            {/* HEADER ACTIONS — fixed on mobile so it never overlaps the habit panel */}
            <div className="fixed top-3 right-3 z-50 lg:absolute lg:top-8 lg:right-8 flex gap-3 lg:gap-4">
                <div className="relative">
                    <button
                        onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
                        className="w-8 h-8 lg:w-12 lg:h-12 p-0 rounded-full backdrop-blur-lg bg-white/5 border border-white/10 text-neutral-400 hover:text-cyan-400 hover:bg-white/10 transition-all shadow-lg hover:shadow-cyan-500/20 flex items-center justify-center group relative overflow-hidden"
                        title="Opciones de Perfil"
                    >
                        {user && user.email ? (
                            <span className="font-bold text-lg text-cyan-300 group-hover:text-cyan-400 transition-colors drop-shadow-md">
                                {user.email.charAt(0).toUpperCase()}
                            </span>
                        ) : (
                            <User size={22} className="opacity-80 group-hover:opacity-100 transition-opacity" />
                        )}
                        {/* Status Dot */}
                        <div className={cn(
                            "absolute top-2.5 right-2.5 w-2 h-2 rounded-full border border-[#050505] shadow-[0_0_8px_rgba(0,0,0,0.5)]",
                            user ? "bg-emerald-400" : "bg-orange-400"
                        )} />
                    </button>

                    <AnimatePresence>
                        {isProfileMenuOpen && (
                            <>
                                <div className="fixed inset-0 z-40" onClick={() => setIsProfileMenuOpen(false)} />
                                <motion.div
                                    initial="hidden"
                                    animate="visible"
                                    exit="exit"
                                    variants={{
                                        hidden: { opacity: 0, y: 10, scale: 0.95 },
                                        visible: { opacity: 1, y: 0, scale: 1, transition: { type: "spring", bounce: 0, duration: 0.3, staggerChildren: 0.05 } },
                                        exit: { opacity: 0, y: 10, scale: 0.95, transition: { duration: 0.2 } }
                                    }}
                                    className="absolute right-0 mt-2 w-[min(256px,calc(100vw-2rem))] bg-[#0a0a0a]/95 backdrop-blur-2xl border border-white/10 rounded-3xl shadow-2xl overflow-hidden z-50 flex flex-col pointer-events-auto"
                                >
                                    {/* Stats & Greeting Header */}
                                    <div className="px-5 py-4 border-b border-white/5 bg-gradient-to-br from-white/[0.03] to-transparent">
                                        <p className="text-xs font-bold text-neutral-500 uppercase tracking-widest mb-1">¡A por el día!</p>
                                        <h3 className="text-lg font-bold text-white tracking-wide truncate">
                                            {user ? (user.user_metadata?.name || user.email?.split('@')[0] || 'Viajero') : 'Viajero Anónimo'}
                                        </h3>

                                        <div className="flex gap-4 mt-3">
                                            <div className="flex items-center gap-1.5 text-xs text-neutral-400">
                                                <CheckCircle2 size={14} className="text-cyan-400" />
                                                <span className="font-medium text-white">
                                                    {habits.filter(h => h.logs[selectedDate]?.completed).length}
                                                </span> hoy
                                            </div>
                                            <div className="flex items-center gap-1.5 text-xs text-neutral-400">
                                                <Flame size={14} className="text-fuchsia-400" />
                                                <span className="font-medium text-white">{habits.length}</span> rastreados
                                            </div>
                                        </div>
                                    </div>

                                    {/* Identity Builder Option */}
                                    <motion.button
                                        variants={{
                                            hidden: { opacity: 0, x: -10 },
                                            visible: { opacity: 1, x: 0 }
                                        }}
                                        onClick={() => {
                                            setIsProfileMenuOpen(false);
                                            setIsIdentityBuilderOpen(true);
                                        }}
                                        className="flex items-center gap-3 px-5 py-4 text-sm font-medium text-neutral-300 hover:text-white hover:bg-white/5 transition-colors text-left group"
                                    >
                                        <div className="w-8 h-8 rounded-full bg-cyan-400/10 flex items-center justify-center group-hover:bg-cyan-400/20 transition-colors shrink-0">
                                            <Shield size={16} className="text-cyan-400" />
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="font-bold text-white tracking-wide">Protocolo de Persona</span>
                                            <span className="text-[10px] text-neutral-500 mt-0.5 leading-tight">Tu brújula de 90 días</span>
                                        </div>
                                    </motion.button>

                                    <div className="h-px bg-white/5 mx-4" />

                                    {/* Theme Switcher */}
                                    <motion.button
                                        variants={{ hidden: { opacity: 0, x: -10 }, visible: { opacity: 1, x: 0 } }}
                                        onClick={() => {
                                            setTheme(isAccion ? 'dark' : 'accion');
                                            setIsProfileMenuOpen(false);
                                        }}
                                        className="flex items-center gap-3 px-5 py-4 text-sm font-medium transition-colors text-left group w-full"
                                    >
                                        <div className={cn(
                                            "w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-colors",
                                            isAccion ? "bg-red-400/10 group-hover:bg-red-400/20" : "bg-white/5 group-hover:bg-white/10"
                                        )}>
                                            <span className={cn("w-3 h-3 rounded-full transition-colors", isAccion ? "bg-red-500" : "bg-cyan-400")} />
                                        </div>
                                        <div className="flex flex-col">
                                            <span className={cn("font-bold tracking-wide", isAccion ? "text-red-400" : "text-white")}>
                                                {isAccion ? 'ACCIÓN (activo)' : 'Tema ACCIÓN'}
                                            </span>
                                            <span className="text-[10px] text-neutral-500 mt-0.5 leading-tight">
                                                {isAccion ? 'Toca para volver a Classic' : 'Negro puro + Rojo'}
                                            </span>
                                        </div>
                                    </motion.button>

                                    <div className="h-px bg-white/5 mx-4" />

                                    {/* Auth Option */}
                                    {user ? (
                                        <motion.button
                                            variants={{
                                                hidden: { opacity: 0, x: -10 },
                                                visible: { opacity: 1, x: 0 }
                                            }}
                                            onClick={() => {
                                                setIsProfileMenuOpen(false);
                                                signOut();
                                            }}
                                            className="flex items-center gap-3 px-5 py-4 text-sm font-medium text-red-400 hover:bg-red-500/10 transition-colors text-left group"
                                        >
                                            <div className="w-8 h-8 rounded-full bg-red-400/10 flex items-center justify-center group-hover:bg-red-400/20 transition-colors shrink-0">
                                                <LogOut size={16} />
                                            </div>
                                            <span className="font-bold tracking-wide">Cerrar Sesión</span>
                                        </motion.button>
                                    ) : (
                                        <motion.button
                                            variants={{
                                                hidden: { opacity: 0, x: -10 },
                                                visible: { opacity: 1, x: 0 }
                                            }}
                                            onClick={() => {
                                                setIsProfileMenuOpen(false);
                                                setIsAuthModalOpen(true);
                                            }}
                                            className="flex items-center gap-3 px-5 py-4 text-sm font-medium text-emerald-400 hover:bg-emerald-500/10 transition-colors text-left group"
                                        >
                                            <div className="w-8 h-8 rounded-full bg-emerald-400/10 flex items-center justify-center group-hover:bg-emerald-400/20 transition-colors shrink-0">
                                                <LogIn size={16} />
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="font-bold tracking-wide">Iniciar Sesión</span>
                                                <span className="text-[10px] text-emerald-500/60 mt-0.5 leading-tight">Guarda tu progreso</span>
                                            </div>
                                        </motion.button>
                                    )}
                                </motion.div>
                            </>
                        )}
                    </AnimatePresence>
                </div>
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
                        className="flex flex-col lg:grid lg:grid-cols-2 flex-1 min-h-0 gap-2 lg:gap-12"
                    >
                        {/* Ring column — adaptive on mobile: shrinks on scroll */}
                        <div className={cn(
                            "lg:order-1 shrink-0 lg:shrink-1 flex flex-col items-center justify-start pt-2 relative transition-all duration-300 ease-in-out",
                            "lg:h-full lg:justify-center lg:pt-0 lg:overflow-visible",
                            isScrolled ? "h-[115px] overflow-hidden" : "h-[320px] overflow-visible"
                        )}>
                            {/* Ambient glow */}
                            <div className={cn(
                                "absolute top-0 left-1/2 -translate-x-1/2 rounded-full pointer-events-none mix-blend-screen transition-all duration-300",
                                isAccion
                                    ? isScrolled ? "w-[120px] h-[120px] bg-cyan-500/20 blur-[40px]" : "w-[200px] h-[200px] bg-cyan-500/25 blur-[60px]"
                                    : isScrolled ? "w-[100px] h-[100px] bg-cyan-500/10 blur-[35px]" : "w-[180px] h-[180px] bg-cyan-500/10 blur-[50px]"
                            )} />

                            {/* Ring — scales down on scroll (mobile), large on desktop */}
                            <div
                                className={cn(
                                    "relative z-10 cursor-pointer transition-transform duration-300 ease-in-out origin-top",
                                    "lg:origin-center lg:!scale-100",
                                    isScrolled ? "scale-[0.58]" : "scale-100"
                                )}
                                onClick={() => navigate('/identity')}
                                title="Tu Identidad"
                            >
                                <CongruenceLevelIndicator
                                    percentage={congruence}
                                    size={typeof window !== 'undefined' && window.innerWidth < 1024 ? 230 : 500}
                                    strokeWidth={typeof window !== 'undefined' && window.innerWidth < 1024 ? 11 : 35}
                                    level={currentLevel}
                                />
                            </div>

                            {/* Quote — desktop only */}
                            <p className="hidden lg:block mt-8 text-cyan-200/40 font-light italic text-center max-w-sm drop-shadow-md tracking-wider text-sm">
                                "La consistencia no es perfección. Es simplemente no rendirse nunca."
                            </p>
                        </div>

                        {/* Habits column — fills full height on mobile, right col on desktop */}
                        <div className="lg:order-2 flex-1 flex flex-col min-h-0 lg:max-h-[90vh] transition-all duration-500">
                            <div className={cn(
                                "rounded-[1.5rem] lg:rounded-[2rem] p-3 lg:p-6 flex-1 flex flex-col overflow-hidden relative transition-all duration-500",
                                isAccion
                                    ? "bg-transparent border border-red-950/25"
                                    // Mobile: transparent (no card) so empty space doesn't show
                                    // Desktop: glass card effect
                                    : "bg-transparent border-0 lg:backdrop-blur-3xl lg:bg-gradient-to-br lg:from-white/[0.04] lg:to-white/[0.01] lg:border lg:border-white/[0.09] lg:shadow-[0_25px_50px_-12px_rgba(0,0,0,0.8)]"
                            )}>
                                {/* Top accent line — cyan in Classic, red in ACCIÓN */}
                                <div className={cn(
                                    "absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent to-transparent pointer-events-none",
                                    isAccion ? "via-red-500/40" : "via-cyan-500/30"
                                )} />
                                {/* Orb glow at top */}
                                <div className={cn(
                                    "absolute top-0 left-1/2 -translate-x-1/2 rounded-full blur-2xl pointer-events-none transition-all duration-500",
                                    isAccion ? "w-64 h-32 bg-red-500/[0.06]" : "w-48 h-24 bg-cyan-500/[0.04]"
                                )} />

                                <div className={cn(
                                    "flex justify-between items-end mb-3 lg:mb-4 relative z-10 pb-3 lg:pb-4",
                                    isAccion ? "border-b border-red-950/40" : "border-b border-white/[0.06]"
                                )}>
                                    <div className="flex items-center gap-2">
                                        <h2 className="text-base lg:text-3xl font-black tracking-tight text-white drop-shadow-md leading-none uppercase">Hábitos</h2>
                                        {/* Coach IA icon — navigates to /coach */}
                                        <button
                                            onClick={() => navigate('/coach')}
                                            title="Coach IA"
                                            className={cn(
                                                "w-7 h-7 rounded-lg flex items-center justify-center transition-all border shrink-0",
                                                isAccion
                                                    ? "bg-red-500/10 border-red-500/20 text-red-400 hover:bg-red-500/20"
                                                    : "bg-violet-500/10 border-violet-500/20 text-violet-400 hover:bg-violet-500/20"
                                            )}
                                        >
                                            <Brain size={13} />
                                        </button>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className="flex items-center gap-1 bg-white/5 rounded-full p-0.5 lg:p-1 border border-white/10">
                                            <button onClick={() => navigateDate(-1)} className="p-1 lg:p-1.5 rounded-full hover:bg-white/10 text-neutral-400 hover:text-white transition-colors">
                                                <ChevronLeft size={14} />
                                            </button>
                                            <span className="text-[10px] lg:text-sm text-neutral-200 font-mono tracking-wider px-1 lg:px-2 font-bold min-w-[56px] lg:min-w-[100px] text-center">
                                                {format(currentDate, 'dd MMM')}
                                                <span className="hidden lg:inline"> {format(currentDate, 'yyyy')}</span>
                                            </span>
                                            <button
                                                onClick={() => navigateDate(1)}
                                                disabled={format(currentDate, 'yyyy-MM-dd') >= format(new Date(), 'yyyy-MM-dd')}
                                                className="p-1 lg:p-1.5 rounded-full hover:bg-white/10 text-neutral-400 hover:text-white transition-colors disabled:opacity-30"
                                            >
                                                <ChevronRight size={14} />
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                <div ref={habitsListRef}
                                    onScroll={(e) => {
                                        const st = e.currentTarget.scrollTop;
                                        const delta = st - lastScrollTopRef.current;
                                        setIsScrolled(st > 30);
                                        if (Math.abs(delta) > 4) {
                                            // scroll down → hide nav, scroll up or near top → show nav
                                            setNavVisible(delta < 0 || st < 10);
                                        }
                                        lastScrollTopRef.current = st;
                                    }}
                                    className="flex flex-col gap-1 overflow-y-auto pr-1 custom-scrollbar flex-1 min-h-0 relative z-10">
                                    {sortedHabits.map(habit => (
                                        <HabitCard
                                            key={habit.id}
                                            habit={habit}
                                            isCompleted={!!habit.logs[selectedDate]?.completed}
                                            currentValue={habit.logs[selectedDate]?.value || 0}
                                            onToggle={() => handleToggleHabit(habit.id)}
                                            onValueChange={(val) => setHabitValue(habit.id, selectedDate, val)}
                                            onEdit={() => handleEditHabit(habit)}
                                            onSkip={() => markHabitSkip(habit.id, selectedDate, 'rest')}
                                            compact
                                        />
                                    ))}
                                </div>



                                <button
                                    onClick={handleCreateHabit}
                                    className={cn(
                                        "mt-2 mb-1 shrink-0 w-full py-3 lg:py-4 rounded-xl border border-dashed bg-transparent transition-all flex items-center justify-center gap-2 relative z-10 group",
                                        isAccion
                                            ? "border-red-950/40 text-neutral-700 hover:border-red-500/25 hover:text-red-400 hover:bg-red-500/[0.04]"
                                            : "border-white/[0.08] text-neutral-600 hover:bg-cyan-500/[0.04] hover:border-cyan-500/25 hover:text-cyan-300"
                                    )}
                                >
                                    <span className="text-[10px] font-bold uppercase tracking-[0.2em]">+ Nuevo Objetivo</span>
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
                        className="flex flex-col lg:grid lg:grid-cols-12 h-full gap-4 lg:gap-8 items-start lg:items-center overflow-y-auto lg:overflow-hidden pb-24 lg:pb-0"
                    >
                        {/* ── Columna Izquierda: Identidad + Progreso ── */}
                        <div className="w-full lg:col-span-3 lg:h-full flex flex-col lg:justify-center gap-3 lg:gap-4 order-3 lg:order-1 lg:py-8">

                            {/* Card 1: Tu Identidad */}
                            <div
                                onClick={() => setIsIdentityBuilderOpen(true)}
                                className={cn(
                                    "rounded-[1.5rem] lg:rounded-[2rem] p-4 lg:p-8 flex flex-col justify-between relative overflow-hidden group transition-all duration-500 min-h-[130px] lg:h-[55%] cursor-pointer",
                                    isAccion
                                        ? "bg-[#0a0000]/60 border border-red-950/30 hover:border-red-900/50 hover:shadow-[0_8px_32px_rgba(239,68,68,0.08)]"
                                        : "bg-white/[0.02] border border-white/[0.08] hover:border-white/[0.14] hover:shadow-cyan-900/20 shadow-lg"
                                )}
                            >
                                {/* Header */}
                                <h3 className={cn(
                                    "text-[10px] lg:text-xs font-bold uppercase tracking-widest z-10 flex items-center gap-2",
                                    isAccion ? "text-red-400" : "text-cyan-400"
                                )}>
                                    <div className={cn("w-1 h-3.5 rounded-full", isAccion ? "bg-red-500" : "bg-cyan-500")} />
                                    Tu Identidad
                                </h3>

                                {/* Content */}
                                <div className="z-10 flex-1 flex flex-col justify-center mt-3 lg:mt-4">
                                    {manifesto?.identityStatement || manifesto?.identities?.personal ? (
                                        <>
                                            <p className="text-base lg:text-xl font-bold text-white leading-snug drop-shadow-sm line-clamp-4">
                                                "{manifesto.identityStatement || manifesto.identities.personal}"
                                            </p>
                                            {manifesto.goals?.ninetyDays && (
                                                <p className="text-[10px] lg:text-xs text-neutral-500 mt-3 line-clamp-2 leading-relaxed">
                                                    <span className={cn("font-bold uppercase tracking-wider", isAccion ? "text-red-500/60" : "text-cyan-500/60")}>90 días: </span>
                                                    {manifesto.goals.ninetyDays}
                                                </p>
                                            )}
                                        </>
                                    ) : (
                                        <>
                                            <p className="text-neutral-600 text-sm font-medium leading-relaxed">
                                                Define quién eres y hacia dónde vas. Tu brújula de 90 días.
                                            </p>
                                            <div className={cn(
                                                "mt-4 inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest self-start px-3 py-2 rounded-xl border transition-colors",
                                                isAccion ? "text-red-400 border-red-900/50 bg-red-950/30 group-hover:bg-red-950/50" : "text-cyan-400 border-cyan-900/50 bg-cyan-950/20 group-hover:bg-cyan-950/40"
                                            )}>
                                                Iniciar Protocolo <ArrowRight size={10} />
                                            </div>
                                        </>
                                    )}
                                </div>

                                {/* Orb glow */}
                                <div className={cn(
                                    "absolute -bottom-10 -right-10 w-40 h-40 rounded-full blur-[50px] transition-all duration-700 pointer-events-none",
                                    isAccion ? "bg-red-500/8 group-hover:bg-red-500/15" : "bg-cyan-500/10 group-hover:bg-cyan-500/20"
                                )} />
                            </div>

                            {/* Card 2: Progreso 90 Días */}
                            <div className={cn(
                                "rounded-[1.5rem] lg:rounded-[2rem] p-4 lg:p-8 flex flex-col relative overflow-hidden group transition-all duration-500 min-h-[120px] lg:h-[45%]",
                                isAccion
                                    ? "bg-[#0a0000]/60 border border-red-950/30 hover:border-red-900/50"
                                    : "bg-white/[0.02] border border-white/[0.08] hover:border-white/[0.14] shadow-lg"
                            )}>
                                {/* Header */}
                                <h3 className={cn(
                                    "text-[10px] lg:text-xs font-bold uppercase tracking-widest z-10 flex items-center gap-2 mb-3 lg:mb-4",
                                    isAccion ? "text-red-400" : "text-cyan-400"
                                )}>
                                    <div className={cn("w-1 h-3.5 rounded-full", isAccion ? "bg-red-500" : "bg-cyan-500")} />
                                    Progreso 90 días
                                </h3>

                                {/* Big number */}
                                <div className="flex items-baseline gap-1.5 z-10 mb-3">
                                    <span className="text-4xl lg:text-5xl font-black text-white tracking-tighter drop-shadow-xl">
                                        {ninetyDayStats.congruentDays}
                                    </span>
                                    <span className="text-base lg:text-lg text-neutral-500 font-bold">/90</span>
                                    <span className="text-xs text-neutral-600 font-medium ml-1">días</span>
                                </div>

                                {/* Progress bar */}
                                <div className="w-full h-1.5 bg-white/[0.06] rounded-full overflow-hidden z-10 mb-4">
                                    <motion.div
                                        className={cn("h-full rounded-full", isAccion ? "bg-red-400" : "bg-cyan-400")}
                                        initial={{ width: 0 }}
                                        animate={{ width: `${(ninetyDayStats.congruentDays / 90) * 100}%` }}
                                        transition={{ duration: 1.2, ease: "easeOut" }}
                                    />
                                </div>

                                {/* Last 7 days dots */}
                                <div className="flex items-center gap-1.5 z-10 mb-2">
                                    {ninetyDayStats.weekDots.map((active, i) => (
                                        <div
                                            key={i}
                                            title={format(subDays(new Date(), 6 - i), 'EEE')}
                                            className={cn(
                                                "flex-1 h-1 rounded-full transition-colors",
                                                active
                                                    ? isAccion ? "bg-red-400" : "bg-cyan-400"
                                                    : "bg-white/10"
                                            )}
                                        />
                                    ))}
                                </div>
                                <p className="text-[9px] text-neutral-600 uppercase tracking-widest z-10">Última semana</p>

                                {/* Streak badge */}
                                {userStreak > 0 && (
                                    <div className={cn(
                                        "mt-auto pt-3 flex items-center gap-1.5 z-10",
                                        isAccion ? "text-red-400" : "text-cyan-400"
                                    )}>
                                        <Flame size={12} />
                                        <span className="text-xs font-bold">{userStreak} días de racha</span>
                                    </div>
                                )}

                                {/* Orb */}
                                <div className={cn(
                                    "absolute -bottom-8 -left-8 w-32 h-32 rounded-full blur-[40px] transition-all duration-700 pointer-events-none",
                                    isAccion ? "bg-red-500/8 group-hover:bg-red-500/15" : "bg-cyan-500/8 group-hover:bg-cyan-500/15"
                                )} />
                            </div>
                        </div>

                        {/* Columna Central (Núcleo) — order-2 on mobile, order-2 on desktop */}
                        <div className="w-full lg:col-span-6 flex justify-center items-center relative order-2 lg:order-2 h-[200px] lg:h-auto">
                            {/* Ambient Glow */}
                            <div className={cn(
                                "absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full pointer-events-none mix-blend-screen transition-all duration-1000",
                                currentLevel >= 3 ? "bg-cyan-500/30 w-[600px] h-[600px] blur-[150px]" : "bg-cyan-500/10 w-[300px] h-[300px] blur-[80px]"
                            )} />
                            <div
                                className="scale-[0.3] md:scale-60 lg:scale-110 relative z-10 transition-transform duration-500 cursor-pointer"
                                onClick={() => navigate('/identity')}
                                title="Tu Identidad"
                            >
                                <CongruenceLevelIndicator percentage={congruence} size={600} strokeWidth={35} level={currentLevel} />
                            </div>
                        </div>

                        {/* Columna Derecha (Hábitos Lista) — order-1 on mobile (TOP), order-3 on desktop */}
                        <div className="w-full lg:col-span-3 lg:h-full flex flex-col justify-center order-1 lg:order-3 lg:py-8">
                            <div className={cn(
                                "rounded-[1.5rem] p-3 lg:p-4 flex flex-col relative overflow-hidden min-h-[300px] lg:h-full",
                                isAccion
                                    ? "bg-transparent border border-red-950/25"
                                    : "backdrop-blur-3xl bg-white/[0.02] border border-white/[0.08] shadow-2xl"
                            )}>
                                {/* Accent top line */}
                                <div className={cn(
                                    "absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent to-transparent pointer-events-none",
                                    isAccion ? "via-red-500/35" : "via-cyan-500/25"
                                )} />

                                {/* Header — compact */}
                                <div className={cn(
                                    "mb-3 pb-3 flex items-center justify-between",
                                    isAccion ? "border-b border-red-950/40" : "border-b border-white/5"
                                )}>
                                    <h2 className="text-sm font-black tracking-widest uppercase text-white flex items-center gap-2">
                                        <div className="w-1.5 h-1.5 rounded-full bg-cyan-500" />
                                        HÁBITOS
                                    </h2>
                                    <div className="flex items-center gap-0.5 bg-white/5 rounded-full px-1 py-0.5 border border-white/8">
                                        <button onClick={() => navigateDate(-1)} className="p-1 rounded-full hover:bg-white/10 text-neutral-500 hover:text-white transition-colors">
                                            <ChevronLeft size={12} />
                                        </button>
                                        <span className="text-[9px] text-neutral-300 font-mono font-bold px-1 min-w-[46px] text-center">
                                            {format(currentDate, 'dd MMM')}
                                        </span>
                                        <button
                                            onClick={() => navigateDate(1)}
                                            disabled={format(currentDate, 'yyyy-MM-dd') >= format(new Date(), 'yyyy-MM-dd')}
                                            className="p-1 rounded-full hover:bg-white/10 text-neutral-500 hover:text-white transition-colors disabled:opacity-30"
                                        >
                                            <ChevronRight size={12} />
                                        </button>
                                    </div>
                                </div>

                                {/* Compact habit list */}
                                <div className="flex flex-col gap-1 overflow-y-auto flex-1 pr-0.5 custom-scrollbar relative z-10">
                                    {sortedHabits.map(habit => (
                                        <HabitCard
                                            key={habit.id}
                                            habit={habit}
                                            isCompleted={!!habit.logs[selectedDate]?.completed}
                                            currentValue={habit.logs[selectedDate]?.value || 0}
                                            onToggle={() => handleToggleHabit(habit.id)}
                                            onValueChange={(val) => setHabitValue(habit.id, selectedDate, val)}
                                            onEdit={() => handleEditHabit(habit)}
                                            onSkip={() => markHabitSkip(habit.id, selectedDate, 'rest')}
                                            compact
                                        />
                                    ))}
                                </div>

                                {/* Coach IA */}
                                <div className="mt-2 shrink-0">
                                    <CoachCard />
                                </div>

                                {/* Add habit */}
                                <button
                                    onClick={handleCreateHabit}
                                    className={cn(
                                        "mt-2 w-full py-2.5 rounded-xl border border-dashed transition-all flex items-center justify-center shrink-0",
                                        isAccion
                                            ? "border-red-950/40 text-neutral-700 hover:border-red-500/25 hover:text-red-400 hover:bg-red-500/[0.04]"
                                            : "border-white/8 text-neutral-600 hover:border-cyan-500/30 hover:text-cyan-300 hover:bg-white/[0.02]"
                                    )}
                                >
                                    <span className="text-[10px] font-bold uppercase tracking-widest">+ Añadir</span>
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
            <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} />
        </div>
    );
}
