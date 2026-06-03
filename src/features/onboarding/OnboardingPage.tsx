import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, Wallet, Activity, Target, BookOpen, Check } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { CongruenceLevelIndicator } from '../habits/CongruenceLevelIndicator';
import { useHabitStore } from '../habits/useHabitStore';
import { useFinanceStore } from '../finance/useFinanceStore';
import { cn } from '../../utils/cn';

// Ring fills as you advance through the 7 steps
const STEP_PROGRESS = [0, 15, 35, 55, 75, 90, 100];
const TOTAL_STEPS = 7;

const CURRENCIES = [
    { code: 'MXN', symbol: '$', locale: 'es-MX' },
    { code: 'USD', symbol: '$', locale: 'en-US' },
    { code: 'EUR', symbol: '€', locale: 'de-DE' },
    { code: 'COP', symbol: '$', locale: 'es-CO' },
    { code: 'ARS', symbol: '$', locale: 'es-AR' },
    { code: 'GBP', symbol: '£', locale: 'en-GB' },
];

// Focus areas → personalize habit suggestions
const FOCUS_AREAS = [
    { id: 'salud',         emoji: '💪', label: 'Salud & Fitness' },
    { id: 'mente',         emoji: '🧠', label: 'Mente & Aprendizaje' },
    { id: 'dinero',        emoji: '💰', label: 'Dinero & Finanzas' },
    { id: 'productividad', emoji: '🎯', label: 'Productividad' },
    { id: 'bienestar',     emoji: '🧘', label: 'Bienestar & Calma' },
    { id: 'negocio',       emoji: '🚀', label: 'Negocio & Carrera' },
    { id: 'relaciones',    emoji: '❤️', label: 'Relaciones' },
    { id: 'creatividad',   emoji: '🎨', label: 'Creatividad' },
];

// Habit suggestions per focus area (icon + title)
const HABIT_SUGGESTIONS: Record<string, { icon: string; title: string }[]> = {
    salud:         [{ icon: '💪', title: 'Entrenar' }, { icon: '💧', title: 'Beber 2L de agua' }, { icon: '🚶', title: 'Caminar 10k pasos' }],
    mente:         [{ icon: '📚', title: 'Leer 20 min' }, { icon: '✍️', title: 'Journaling' }, { icon: '🎧', title: 'Aprender algo nuevo' }],
    dinero:        [{ icon: '💰', title: 'Registrar gastos' }, { icon: '📊', title: 'Revisar presupuesto' }],
    productividad: [{ icon: '🎯', title: 'Planear el día' }, { icon: '🍅', title: 'Sesión de foco' }],
    bienestar:     [{ icon: '🧘', title: 'Meditar' }, { icon: '😴', title: 'Dormir 8h' }, { icon: '🙏', title: 'Gratitud' }],
    negocio:       [{ icon: '🚀', title: 'Trabajar en mi proyecto' }, { icon: '📈', title: 'Aprender una skill' }],
    relaciones:    [{ icon: '❤️', title: 'Conectar con alguien' }, { icon: '📞', title: 'Llamar a un ser querido' }],
    creatividad:   [{ icon: '🎨', title: 'Crear algo' }, { icon: '🎸', title: 'Practicar instrumento' }],
};

const slideVariants = {
    enter: (dir: number) => ({ x: dir > 0 ? 50 : -50, opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (dir: number) => ({ x: dir > 0 ? -50 : 50, opacity: 0 }),
};

export default function OnboardingPage() {
    const navigate = useNavigate();
    const { addHabit, setManifesto } = useHabitStore();
    const { updateConfig } = useFinanceStore();

    const [step, setStep] = useState(0);
    const [dir, setDir] = useState(1);

    // Data
    const [name, setName] = useState('');
    const [focusAreas, setFocusAreas] = useState<string[]>([]);
    const [identityStatement, setIdentityStatement] = useState('');
    const [goal90, setGoal90] = useState('');
    const [habitTitle, setHabitTitle] = useState('');
    const [habitIcon, setHabitIcon] = useState('💪');
    const [currency, setCurrency] = useState('MXN');
    const [financeConfigured, setFinanceConfigured] = useState(false);

    const progress = STEP_PROGRESS[step] ?? 100;

    const goNext = () => { setDir(1); setStep(s => Math.min(s + 1, TOTAL_STEPS - 1)); };
    const goBack = () => { setDir(-1); setStep(s => Math.max(s - 1, 0)); };

    const toggleFocus = (id: string) => {
        setFocusAreas(prev => prev.includes(id) ? prev.filter(f => f !== id) : [...prev, id]);
    };

    const pickSuggestion = (s: { icon: string; title: string }) => {
        setHabitTitle(s.title);
        setHabitIcon(s.icon);
    };

    // Suggestions based on chosen focus areas (or a default mix)
    const suggestions = (() => {
        if (focusAreas.length === 0) {
            return [
                { icon: '💪', title: 'Entrenar' },
                { icon: '📚', title: 'Leer 20 min' },
                { icon: '🧘', title: 'Meditar' },
            ];
        }
        return focusAreas.flatMap(f => HABIT_SUGGESTIONS[f] || []).slice(0, 6);
    })();

    const finish = () => {
        if (name.trim()) localStorage.setItem('congruence_user_name', name.trim());
        if (focusAreas.length) localStorage.setItem('congruence_focus_areas', JSON.stringify(focusAreas));

        if (identityStatement.trim() || goal90.trim()) {
            setManifesto({
                identityStatement: identityStatement.trim() || undefined,
                identities: { personal: identityStatement.trim(), professional: '', financial: '' },
                goals: { oneYear: '', ninetyDays: goal90.trim(), antiGoals: '' },
                ignoranceDebt: { missingSkill: '', investmentAction: '' },
                executionProtocol: { planA_Action: '', planA_Volume: '', planB_Minimum: '' },
            });
        }

        if (habitTitle.trim()) {
            addHabit({ title: habitTitle.trim(), type: 'boolean', goal: 1, color: '#22d3ee', icon: habitIcon, identityAxis: 'physical' });
        }

        const cur = CURRENCIES.find(c => c.code === currency);
        updateConfig({ currency: cur?.code || 'MXN', currencyLocale: cur?.locale || 'es-MX' });

        localStorage.setItem('congruence_onboarding', 'done');
        navigate('/');
    };

    // Validation per step (only steps 1=name and 4=habit are "required-ish")
    const canContinue = () => {
        if (step === 1) return name.trim().length > 1;
        return true;
    };

    // Activation checklist for the aha-moment
    const checklist = [
        { done: !!name.trim(), label: `Te llamas ${name.trim() || '...'}`, key: 'name' },
        { done: !!identityStatement.trim() || !!goal90.trim(), label: 'Identidad definida', key: 'id' },
        { done: !!habitTitle.trim(), label: habitTitle.trim() ? `Hábito: ${habitTitle.trim()}` : 'Crear tu primer hábito', key: 'habit' },
        { done: financeConfigured, label: 'Configurar tus finanzas', key: 'fin' },
        { done: false, label: 'Escribir tu primera nota', key: 'note' },
    ];
    const doneCount = checklist.filter(c => c.done).length;

    return (
        <div className="min-h-screen bg-[#020202] text-white flex flex-col items-center p-6 relative overflow-hidden">
            {/* Background glow grows with progress */}
            <motion.div className="absolute inset-0 pointer-events-none" animate={{ opacity: progress / 100 }} transition={{ duration: 1 }}>
                <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[700px] h-[700px] bg-cyan-500/[0.08] rounded-full blur-[160px]" />
            </motion.div>

            {/* Skip — always visible from step 2 onwards (pillar #6) */}
            {step >= 2 && step < TOTAL_STEPS - 1 && (
                <button onClick={finish} className="absolute top-6 right-6 text-[11px] text-neutral-600 hover:text-neutral-400 transition-colors font-medium uppercase tracking-widest z-20">
                    Saltar →
                </button>
            )}

            {/* Progress dots */}
            <div className="flex gap-1.5 pt-2 z-10">
                {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
                    <div key={i} className={cn("h-1 rounded-full transition-all duration-500", i === step ? "w-6 bg-cyan-400" : i < step ? "w-3 bg-cyan-400/40" : "w-3 bg-white/10")} />
                ))}
            </div>

            {/* Ring — centered, grows each step */}
            <div className="flex items-center justify-center z-10 w-full" style={{ height: '34vh', minHeight: 200 }}>
                <motion.div key={`ring-${step}`} initial={{ scale: 0.92, opacity: 0.8 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 0.6, ease: 'easeOut' }}>
                    <CongruenceLevelIndicator
                        percentage={progress}
                        size={typeof window !== 'undefined' && window.innerWidth < 640 ? 190 : 240}
                        strokeWidth={typeof window !== 'undefined' && window.innerWidth < 640 ? 12 : 15}
                        level={progress === 100 ? 2 : 1}
                    />
                </motion.div>
            </div>

            {/* Step content */}
            <div className="w-full max-w-md z-10 flex flex-col justify-start pb-4">
                <AnimatePresence mode="wait" custom={dir}>
                    <motion.div key={step} custom={dir} variants={slideVariants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.32, ease: 'easeInOut' }} className="flex flex-col gap-5">

                        {/* ── 0 · BIENVENIDA (aspiracional, 4 módulos) ── */}
                        {step === 0 && (
                            <>
                                <div>
                                    <p className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: 'rgb(var(--accent-400))' }}>Bienvenido/a a</p>
                                    <h1 className="text-4xl font-black text-white leading-none mb-3">
                                        Congru<span style={{ color: 'rgb(var(--accent-400))' }}>ence</span>
                                    </h1>
                                    <p className="text-neutral-400 text-base leading-relaxed">
                                        Un solo lugar para construir a la persona que quieres ser: tus hábitos, tu dinero, tus ideas y tu identidad — todo alineado.
                                    </p>
                                </div>
                                <div className="grid grid-cols-2 gap-2.5">
                                    {[
                                        { icon: Activity, color: 'text-cyan-400',    label: 'Hábitos' },
                                        { icon: Wallet,   color: 'text-emerald-400', label: 'Finanzas' },
                                        { icon: BookOpen, color: 'text-amber-400',   label: 'Notas' },
                                        { icon: Target,   color: 'text-violet-400',  label: 'Mi Norte' },
                                    ].map(({ icon: Icon, color, label }) => (
                                        <div key={label} className="flex items-center gap-2.5 p-3 rounded-2xl bg-white/[0.03] border border-white/[0.06]">
                                            <Icon size={18} className={color} />
                                            <span className="text-sm font-bold text-white/80">{label}</span>
                                        </div>
                                    ))}
                                </div>
                                <p className="text-[12px] text-neutral-600 text-center">Toma menos de 2 minutos. Puedes saltar cualquier paso.</p>
                            </>
                        )}

                        {/* ── 1 · NOMBRE (fricción mínima) ── */}
                        {step === 1 && (
                            <>
                                <div>
                                    <p className="text-cyan-400/70 text-xs font-bold uppercase tracking-widest mb-2">Para empezar</p>
                                    <h1 className="text-3xl font-black text-white leading-tight">¿Cómo te llamas?</h1>
                                    <p className="text-neutral-400 text-base mt-2 leading-relaxed">Solo para personalizar tu experiencia. Nada más.</p>
                                </div>
                                <input
                                    autoFocus value={name}
                                    onChange={e => setName(e.target.value)}
                                    onKeyDown={e => e.key === 'Enter' && canContinue() && goNext()}
                                    placeholder="Tu nombre..."
                                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-xl font-bold text-white placeholder-white/20 outline-none focus:border-cyan-500/50 transition-colors"
                                />
                            </>
                        )}

                        {/* ── 2 · ÁREAS DE ENFOQUE (personalización con chips) ── */}
                        {step === 2 && (
                            <>
                                <div>
                                    <p className="text-cyan-400/70 text-xs font-bold uppercase tracking-widest mb-2">Personalización</p>
                                    <h1 className="text-2xl font-black text-white leading-tight">
                                        {name.trim() ? `${name.trim()}, ¿en qué` : '¿En qué'} quieres enfocarte?
                                    </h1>
                                    <p className="text-neutral-400 text-sm mt-2 leading-relaxed">
                                        Elige las áreas que más te importan ahora. Con esto te sugeriré hábitos a tu medida. Puedes elegir varias.
                                    </p>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    {FOCUS_AREAS.map(area => {
                                        const active = focusAreas.includes(area.id);
                                        return (
                                            <button
                                                key={area.id}
                                                onClick={() => toggleFocus(area.id)}
                                                className={cn(
                                                    "flex items-center gap-1.5 px-3 py-2 rounded-xl border text-[13px] font-bold transition-all",
                                                    active ? "bg-cyan-500/20 border-cyan-500/50 text-white scale-[1.02]" : "bg-white/5 border-white/10 text-neutral-400 hover:border-white/20"
                                                )}
                                            >
                                                <span>{area.emoji}</span>{area.label}
                                            </button>
                                        );
                                    })}
                                </div>
                                {focusAreas.length > 0 && (
                                    <p className="text-[12px] text-cyan-400/60 font-medium">✓ {focusAreas.length} área{focusAreas.length !== 1 ? 's' : ''} seleccionada{focusAreas.length !== 1 ? 's' : ''}</p>
                                )}
                            </>
                        )}

                        {/* ── 3 · IDENTIDAD ── */}
                        {step === 3 && (
                            <>
                                <div>
                                    <p className="text-cyan-400/70 text-xs font-bold uppercase tracking-widest mb-2">Tu Identidad</p>
                                    <h1 className="text-2xl font-black text-white leading-tight">El 95% nunca define quién quiere ser</h1>
                                    <p className="text-neutral-400 text-sm mt-2 leading-relaxed">
                                        Y por eso actúan sin dirección. Esta frase es tu norte: cuando tengas un día difícil, te recuerda por qué haces lo que haces. Puedes editarla cuando quieras.
                                    </p>
                                </div>
                                <div className="space-y-4">
                                    <div>
                                        <label className="text-[11px] font-bold uppercase tracking-widest text-neutral-500 block mb-1.5">Completa: "Soy una persona que..."</label>
                                        <textarea
                                            value={identityStatement} onChange={e => setIdentityStatement(e.target.value)}
                                            placeholder="...siempre cumple lo que dice y trabaja con disciplina"
                                            rows={2}
                                            className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white placeholder-white/20 outline-none focus:border-cyan-500/50 transition-colors text-sm leading-relaxed resize-none"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[11px] font-bold uppercase tracking-widest text-neutral-500 block mb-1.5">¿Qué quieres lograr en 90 días?</label>
                                        <input
                                            value={goal90} onChange={e => setGoal90(e.target.value)}
                                            placeholder="Ej: Bajar 5kg, lanzar mi negocio, ahorrar $X..."
                                            className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white placeholder-white/20 outline-none focus:border-cyan-500/50 transition-colors text-sm"
                                        />
                                    </div>
                                </div>
                            </>
                        )}

                        {/* ── 4 · HÁBITOS (crear el primero, con sugerencias) ── */}
                        {step === 4 && (
                            <>
                                <div>
                                    <p className="text-cyan-400/70 text-xs font-bold uppercase tracking-widest mb-2">Tu primer hábito</p>
                                    <h1 className="text-2xl font-black text-white leading-tight">Los hábitos construyen esa persona</h1>
                                    <p className="text-neutral-400 text-sm mt-2 leading-relaxed">
                                        Empieza con uno. {focusAreas.length > 0 ? 'Aquí tienes ideas según tus áreas:' : 'Elige una idea o escribe la tuya:'}
                                    </p>
                                </div>
                                {/* Suggestions (smart empty state) */}
                                <div className="flex flex-wrap gap-2">
                                    {suggestions.map(s => (
                                        <button
                                            key={s.title}
                                            onClick={() => pickSuggestion(s)}
                                            className={cn(
                                                "flex items-center gap-1.5 px-3 py-2 rounded-xl border text-[12px] font-bold transition-all",
                                                habitTitle === s.title ? "bg-cyan-500/20 border-cyan-500/50 text-white" : "bg-white/5 border-white/10 text-neutral-400 hover:border-white/20"
                                            )}
                                        >
                                            <span>{s.icon}</span>{s.title}
                                        </button>
                                    ))}
                                </div>
                                {/* Custom input */}
                                <div className="flex gap-2 items-center">
                                    <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-2xl shrink-0">{habitIcon}</div>
                                    <input
                                        value={habitTitle} onChange={e => setHabitTitle(e.target.value)}
                                        onKeyDown={e => e.key === 'Enter' && goNext()}
                                        placeholder="O escribe tu propio hábito..."
                                        className="flex-1 bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white placeholder-white/20 outline-none focus:border-cyan-500/50 transition-colors text-base font-bold"
                                    />
                                </div>
                            </>
                        )}

                        {/* ── 5 · FINANZAS Y NOTAS (presentación, sin forzar) ── */}
                        {step === 5 && (
                            <>
                                <div>
                                    <p className="text-cyan-400/70 text-xs font-bold uppercase tracking-widest mb-2">Dos herramientas más</p>
                                    <h1 className="text-2xl font-black text-white leading-tight">Cuando estés listo/a, te esperan aquí</h1>
                                    <p className="text-neutral-400 text-sm mt-2 leading-relaxed">
                                        No tienes que configurarlas ahora. Solo para que sepas que existen.
                                    </p>
                                </div>
                                <div className="space-y-3">
                                    <div className="flex items-start gap-3 p-4 rounded-2xl bg-emerald-500/[0.06] border border-emerald-500/20">
                                        <div className="p-2 rounded-xl bg-emerald-500/10 shrink-0"><Wallet size={18} className="text-emerald-400" /></div>
                                        <div>
                                            <p className="font-bold text-white text-sm">Finanzas</p>
                                            <p className="text-neutral-500 text-xs mt-0.5 leading-relaxed">Tu dinero día a día, sin juicios. Cuánto tienes, a dónde va y cuánto puedes gastar hoy.</p>
                                        </div>
                                    </div>
                                    <div className="flex items-start gap-3 p-4 rounded-2xl bg-amber-500/[0.06] border border-amber-500/20">
                                        <div className="p-2 rounded-xl bg-amber-500/10 shrink-0"><BookOpen size={18} className="text-amber-400" /></div>
                                        <div>
                                            <p className="font-bold text-white text-sm">Notas & Tareas</p>
                                            <p className="text-neutral-500 text-xs mt-0.5 leading-relaxed">Un diario y un gestor de tareas con estética de máquina de escribir. Captura ideas al instante.</p>
                                        </div>
                                    </div>
                                </div>
                                {/* Optional quick currency pick (no forced balance) */}
                                <div>
                                    <p className="text-[11px] font-bold uppercase tracking-widest text-neutral-500 mb-2">Opcional — tu moneda</p>
                                    <div className="flex flex-wrap gap-2">
                                        {CURRENCIES.map(c => (
                                            <button
                                                key={c.code}
                                                onClick={() => { setCurrency(c.code); setFinanceConfigured(true); }}
                                                className={cn(
                                                    "px-3 py-1.5 rounded-lg border text-[12px] font-bold transition-all",
                                                    currency === c.code && financeConfigured ? "bg-cyan-500/15 border-cyan-500/40 text-white" : "bg-white/5 border-white/10 text-neutral-400 hover:border-white/20"
                                                )}
                                            >
                                                {c.symbol} {c.code}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </>
                        )}

                        {/* ── 6 · AHA MOMENT (checklist activado vs pendiente) ── */}
                        {step === 6 && (
                            <>
                                <div className="text-center">
                                    <h1 className="text-3xl font-black text-white leading-tight">
                                        {name.trim() ? `${name.trim()}, tu sistema` : 'Tu sistema'} está <span className="text-cyan-400">listo</span>
                                    </h1>
                                    <p className="text-neutral-400 text-base mt-2 leading-relaxed">
                                        Completaste <span className="text-cyan-400 font-bold">{doneCount} de {checklist.length}</span>. Lo que falta lo desbloqueas usando la app.
                                    </p>
                                </div>
                                {/* Activation checklist */}
                                <div className="space-y-2">
                                    {checklist.map(item => (
                                        <div key={item.key} className={cn(
                                            "flex items-center gap-3 p-3 rounded-xl border transition-all",
                                            item.done ? "bg-cyan-500/[0.06] border-cyan-500/20" : "bg-white/[0.02] border-white/[0.06]"
                                        )}>
                                            <div className={cn(
                                                "w-5 h-5 rounded-full flex items-center justify-center shrink-0 border-2",
                                                item.done ? "bg-cyan-400/20 border-cyan-400" : "border-white/15"
                                            )}>
                                                {item.done && <Check size={11} className="text-cyan-400" strokeWidth={3} />}
                                            </div>
                                            <span className={cn("text-sm", item.done ? "text-white/80 font-medium" : "text-neutral-500")}>{item.label}</span>
                                        </div>
                                    ))}
                                </div>
                            </>
                        )}
                    </motion.div>
                </AnimatePresence>
            </div>

            {/* Navigation */}
            <div className="w-full max-w-md z-10 flex items-center justify-between pb-4">
                {step > 0 ? (
                    <button onClick={goBack} className="text-sm text-neutral-600 hover:text-neutral-400 transition-colors font-medium">← Atrás</button>
                ) : <div />}

                <motion.button
                    whileTap={{ scale: 0.97 }}
                    onClick={step === TOTAL_STEPS - 1 ? finish : goNext}
                    disabled={!canContinue()}
                    className={cn(
                        "flex items-center gap-2 px-7 py-3.5 rounded-2xl font-bold text-sm transition-all",
                        canContinue() ? "bg-cyan-500 text-black hover:bg-cyan-400 shadow-[0_0_30px_rgba(6,182,212,0.3)]" : "bg-white/10 text-neutral-600 cursor-not-allowed"
                    )}
                >
                    {step === 0 ? 'Empezar' : step === TOTAL_STEPS - 1 ? 'Entrar a Congruence' : 'Continuar'}
                    <ArrowRight size={16} strokeWidth={2.5} />
                </motion.button>
            </div>
        </div>
    );
}
