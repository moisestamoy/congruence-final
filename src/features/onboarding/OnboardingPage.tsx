import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, Wallet, Activity, Target, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { CongruenceLevelIndicator } from '../habits/CongruenceLevelIndicator';
import { useHabitStore } from '../habits/useHabitStore';
import { useFinanceStore } from '../finance/useFinanceStore';
import { cn } from '../../utils/cn';

// ── Ring percentage per step ──────────────────────────────────────────────
const STEP_PROGRESS = [0, 20, 45, 68, 88, 100];

const CURRENCIES = [
    { code: 'MXN', symbol: '$', locale: 'es-MX', label: 'Peso MXN' },
    { code: 'USD', symbol: '$', locale: 'en-US', label: 'Dólar USD' },
    { code: 'EUR', symbol: '€', locale: 'de-DE', label: 'Euro' },
    { code: 'COP', symbol: '$', locale: 'es-CO', label: 'Peso COP' },
    { code: 'ARS', symbol: '$', locale: 'es-AR', label: 'Peso ARS' },
    { code: 'GBP', symbol: '£', locale: 'en-GB', label: 'Libra' },
];

const HABIT_ICONS = ['💪', '📚', '🧘', '🏃', '🎯', '💡', '✍️', '🌱', '💤', '🥗'];

// ── Slide transition ──────────────────────────────────────────────────────
const slideVariants = {
    enter: (dir: number) => ({ x: dir > 0 ? 60 : -60, opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (dir: number) => ({ x: dir > 0 ? -60 : 60, opacity: 0 }),
};

export default function OnboardingPage() {
    const navigate = useNavigate();
    const { addHabit, setManifesto } = useHabitStore();
    const { updateConfig } = useFinanceStore();

    const [step, setStep] = useState(0);
    const [dir, setDir] = useState(1);

    // Form data
    const [name, setName] = useState('');
    const [identityStatement, setIdentityStatement] = useState('');
    const [goal90, setGoal90] = useState('');
    const [habitTitle, setHabitTitle] = useState('');
    const [habitIcon, setHabitIcon] = useState('💪');
    const [currency, setCurrency] = useState('MXN');
    const [balance, setBalance] = useState('');

    const totalSteps = 6;
    const progress = STEP_PROGRESS[step] ?? 100;

    const goNext = () => {
        setDir(1);
        setStep(s => Math.min(s + 1, totalSteps - 1));
    };
    const goBack = () => {
        setDir(-1);
        setStep(s => Math.max(s - 1, 0));
    };

    const skip = () => finishOnboarding();

    const finishOnboarding = () => {
        // Save name
        if (name.trim()) localStorage.setItem('congruence_user_name', name.trim());

        // Save identity manifesto
        if (identityStatement.trim() || goal90.trim()) {
            setManifesto({
                identityStatement: identityStatement.trim() || undefined,
                identities: { personal: identityStatement.trim(), professional: '', financial: '' },
                goals: { oneYear: '', ninetyDays: goal90.trim(), antiGoals: '' },
                ignoranceDebt: { missingSkill: '', investmentAction: '' },
                executionProtocol: { planA_Action: '', planA_Volume: '', planB_Minimum: '' },
            });
        }

        // Save first habit
        if (habitTitle.trim()) {
            addHabit({
                title: habitTitle.trim(),
                type: 'boolean',
                goal: 1,
                color: '#22d3ee',
                icon: habitIcon,
                identityAxis: 'physical',
            });
        }

        // Save currency + balance
        const selectedCurrency = CURRENCIES.find(c => c.code === currency);
        const initialBalance = parseFloat(balance) || 0;
        updateConfig({
            currency: selectedCurrency?.code || 'MXN',
            currencyLocale: selectedCurrency?.locale || 'es-MX',
            initialBalance,
        });

        // Mark onboarding done
        localStorage.setItem('congruence_onboarding', 'done');
        navigate('/');
    };

    const canContinue = () => {
        if (step === 0) return name.trim().length > 1;
        if (step === 3) return habitTitle.trim().length > 1;
        return true;
    };

    

    return (
        <div className="min-h-screen bg-[#020202] text-white flex flex-col items-center p-6 relative overflow-hidden">
            {/* Background glow that grows with progress */}
            <motion.div
                className="absolute inset-0 pointer-events-none"
                animate={{ opacity: progress / 100 }}
                transition={{ duration: 1 }}
            >
                <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[700px] h-[700px] bg-cyan-500/[0.08] rounded-full blur-[160px]" />
            </motion.div>

            {/* Skip button — from step 2 onwards */}
            {step >= 2 && step < totalSteps - 1 && (
                <button
                    onClick={skip}
                    className="absolute top-6 right-6 text-[11px] text-neutral-600 hover:text-neutral-400 transition-colors font-medium uppercase tracking-widest"
                >
                    Saltar →
                </button>
            )}

            {/* Progress dots */}
            <div className="flex gap-2 pt-2 z-10">
                {Array.from({ length: totalSteps }).map((_, i) => (
                    <div
                        key={i}
                        className={cn(
                            "h-1 rounded-full transition-all duration-500",
                            i === step ? "w-6 bg-cyan-400" : i < step ? "w-3 bg-cyan-400/40" : "w-3 bg-white/10"
                        )}
                    />
                ))}
            </div>

            {/* Ring — centered, bigger, grows with each step */}
            <div className="flex flex-col items-center justify-center z-10 w-full" style={{ height: '42vh', minHeight: 220 }}>
                <motion.div
                    key={`ring-${step}`}
                    initial={{ scale: 0.9, opacity: 0.7 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ duration: 0.7, ease: 'easeOut' }}
                >
                    <CongruenceLevelIndicator
                        percentage={progress}
                        size={typeof window !== 'undefined' && window.innerWidth < 640 ? 210 : 260}
                        strokeWidth={typeof window !== 'undefined' && window.innerWidth < 640 ? 13 : 16}
                        level={progress === 100 ? 2 : 1}
                    />
                </motion.div>
            </div>

            {/* Step content */}
            <div className="w-full max-w-md z-10 flex flex-col justify-start pb-4">
                <AnimatePresence mode="wait" custom={dir}>
                    <motion.div
                        key={step}
                        custom={dir}
                        variants={slideVariants}
                        initial="enter"
                        animate="center"
                        exit="exit"
                        transition={{ duration: 0.35, ease: 'easeInOut' }}
                        className="flex flex-col gap-5"
                    >
                        {/* ── STEP 0: Bienvenida ── */}
                        {step === 0 && (
                            <>
                                <div>
                                    <p className="text-cyan-400/70 text-xs font-bold uppercase tracking-widest mb-2">Bienvenido/a</p>
                                    <h1 className="text-3xl font-black text-white leading-tight">
                                        Hola. Soy <span className="text-cyan-400">Congruence</span>.
                                    </h1>
                                    <p className="text-neutral-400 text-base mt-3 leading-relaxed">
                                        Soy tu sistema personal para vivir alineado con quien quieres ser. Solo toma 3 minutos configurarlo. ¿Cómo te llamas?
                                    </p>
                                </div>
                                <input
                                    autoFocus
                                    value={name}
                                    onChange={e => setName(e.target.value)}
                                    onKeyDown={e => e.key === 'Enter' && canContinue() && goNext()}
                                    placeholder="Tu nombre..."
                                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-xl font-bold text-white placeholder-white/20 outline-none focus:border-cyan-500/50 transition-colors"
                                />
                            </>
                        )}

                        {/* ── STEP 1: Qué es Congruence ── */}
                        {step === 1 && (
                            <>
                                <div>
                                    <p className="text-cyan-400/70 text-xs font-bold uppercase tracking-widest mb-2">¿Cómo funciona?</p>
                                    <h1 className="text-3xl font-black text-white leading-tight">
                                        Hola, <span className="text-cyan-400">{name.trim() || 'bienvenido/a'}</span> 👋
                                    </h1>
                                    <p className="text-neutral-400 text-base mt-3 leading-relaxed">
                                        Congruence mide qué tan alineado estás con la persona que quieres ser. El anillo de arriba lo refleja: mientras más lo completas, más en línea estás con tu versión ideal.
                                    </p>
                                </div>
                                <div className="space-y-3">
                                    {[
                                        { icon: Activity, color: 'text-cyan-400', bg: 'bg-cyan-500/10 border-cyan-500/20', title: 'Hábitos', desc: 'Las acciones diarias que te construyen. Cada día que los cumples, el anillo sube.' },
                                        { icon: Wallet, color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20', title: 'Finanzas', desc: 'Tu realidad financiera sin juicios. Sabes exactamente qué tienes y a dónde va tu dinero.' },
                                        { icon: Target, color: 'text-violet-400', bg: 'bg-violet-500/10 border-violet-500/20', title: 'Identidad', desc: 'Tu brújula. Define quién eres y hacia dónde vas en los próximos 90 días.' },
                                    ].map(({ icon: Icon, color, bg, title, desc }) => (
                                        <div key={title} className={cn("flex items-start gap-3 p-4 rounded-2xl border", bg)}>
                                            <div className={cn("p-2 rounded-xl shrink-0", bg)}>
                                                <Icon size={18} className={color} />
                                            </div>
                                            <div>
                                                <p className="font-bold text-white text-sm">{title}</p>
                                                <p className="text-neutral-500 text-xs mt-0.5 leading-relaxed">{desc}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </>
                        )}

                        {/* ── STEP 2: Identidad ── */}
                        {step === 2 && (
                            <>
                                <div>
                                    <p className="text-cyan-400/70 text-xs font-bold uppercase tracking-widest mb-2">Paso 1 de 3 — Tu Identidad</p>
                                    <h1 className="text-2xl font-black text-white leading-tight">
                                        El 95% de las personas nunca define quién quiere ser
                                    </h1>
                                    <p className="text-neutral-400 text-sm mt-2 leading-relaxed">
                                        Y por eso actúan sin dirección. Esta declaración es tu norte: cuando tengas un día difícil, te recuerda por qué haces lo que haces. No tiene que ser perfecta, puede editarse después.
                                    </p>
                                </div>
                                <div className="space-y-4">
                                    <div>
                                        <label className="text-[11px] font-bold uppercase tracking-widest text-neutral-500 block mb-1.5">
                                            Escribe: "Soy una persona que..."
                                        </label>
                                        <p className="text-[11px] text-neutral-600 mb-2">Usa el presente como si ya fueras esa persona. Por ejemplo: "siempre cumple lo que dice".</p>
                                        <textarea
                                            value={identityStatement}
                                            onChange={e => setIdentityStatement(e.target.value)}
                                            placeholder="...siempre cumple lo que dice y trabaja con disciplina cada día"
                                            rows={3}
                                            className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white placeholder-white/20 outline-none focus:border-cyan-500/50 transition-colors text-sm leading-relaxed resize-none"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[11px] font-bold uppercase tracking-widest text-neutral-500 block mb-1.5">
                                            ¿Qué quieres lograr en los próximos 90 días?
                                        </label>
                                        <p className="text-[11px] text-neutral-600 mb-2">Sé específico. "Bajar 5kg" es mejor que "estar más fit".</p>
                                        <input
                                            value={goal90}
                                            onChange={e => setGoal90(e.target.value)}
                                            placeholder="Ej: Perder 5kg, lanzar mi negocio, ahorrar $X..."
                                            className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white placeholder-white/20 outline-none focus:border-cyan-500/50 transition-colors text-sm"
                                        />
                                    </div>
                                </div>
                            </>
                        )}

                        {/* ── STEP 3: Primer hábito ── */}
                        {step === 3 && (
                            <>
                                <div>
                                    <p className="text-cyan-400/70 text-xs font-bold uppercase tracking-widest mb-2">Paso 2 de 3 — Tu primer hábito</p>
                                    <h1 className="text-2xl font-black text-white leading-tight">
                                        Los hábitos construyen a esa persona
                                    </h1>
                                    <p className="text-neutral-400 text-sm mt-2 leading-relaxed">
                                        ¿Cuál es la única acción que, si la hicieras todos los días, más te acercaría a quien quieres ser? Elige solo una. Puedes agregar más después.
                                    </p>
                                </div>
                                <div className="space-y-4">
                                    <div>
                                        <label className="text-[11px] font-bold uppercase tracking-widest text-neutral-500 block mb-2">Elige un icono</label>
                                        <div className="flex gap-2 flex-wrap">
                                            {HABIT_ICONS.map(icon => (
                                                <button
                                                    key={icon}
                                                    onClick={() => setHabitIcon(icon)}
                                                    className={cn(
                                                        "w-11 h-11 text-xl rounded-xl flex items-center justify-center transition-all border",
                                                        habitIcon === icon
                                                            ? "bg-cyan-500/20 border-cyan-500/50 scale-110"
                                                            : "bg-white/5 border-white/10 hover:bg-white/10"
                                                    )}
                                                >
                                                    {icon}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                    <div>
                                        <label className="text-[11px] font-bold uppercase tracking-widest text-neutral-500 block mb-1.5">Nombre del hábito</label>
                                        <p className="text-[11px] text-neutral-600 mb-2">Ponle un nombre corto y claro. Ej: "Entrenar 30 min", "Meditar", "Leer".</p>
                                        <input
                                            autoFocus
                                            value={habitTitle}
                                            onChange={e => setHabitTitle(e.target.value)}
                                            onKeyDown={e => e.key === 'Enter' && canContinue() && goNext()}
                                            placeholder="Ej: Entrenar, Meditar, Leer..."
                                            className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white placeholder-white/20 outline-none focus:border-cyan-500/50 transition-colors text-base font-bold"
                                        />
                                    </div>
                                </div>
                            </>
                        )}

                        {/* ── STEP 4: Finanzas ── */}
                        {step === 4 && (
                            <>
                                <div>
                                    <p className="text-cyan-400/70 text-xs font-bold uppercase tracking-widest mb-2">Paso 3 de 3 — Tus finanzas</p>
                                    <h1 className="text-2xl font-black text-white leading-tight">
                                        No puedes mejorar lo que no mides
                                    </h1>
                                    <p className="text-neutral-400 text-sm mt-2 leading-relaxed">
                                        Congruence no juzga tus números. Solo los muestra tal como son para que puedas tomar decisiones más inteligentes. ¿Con qué moneda trabajas y cuánto tienes disponible ahora mismo?
                                    </p>
                                </div>
                                <div className="space-y-4">
                                    <div>
                                        <label className="text-[11px] font-bold uppercase tracking-widest text-neutral-500 block mb-2">Tu moneda</label>
                                        <div className="grid grid-cols-3 gap-2">
                                            {CURRENCIES.map(c => (
                                                <button
                                                    key={c.code}
                                                    onClick={() => setCurrency(c.code)}
                                                    className={cn(
                                                        "py-2.5 px-3 rounded-xl border text-left transition-all",
                                                        currency === c.code
                                                            ? "bg-cyan-500/15 border-cyan-500/40 text-white"
                                                            : "bg-white/5 border-white/10 text-neutral-400 hover:border-white/20"
                                                    )}
                                                >
                                                    <span className="text-lg font-bold block">{c.symbol}</span>
                                                    <span className="text-[10px] font-bold uppercase tracking-widest">{c.code}</span>
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                    <div>
                                        <label className="text-[11px] font-bold uppercase tracking-widest text-neutral-500 block mb-1.5">
                                            ¿Cuánto dinero tienes disponible ahora?
                                        </label>
                                        <p className="text-[11px] text-neutral-600 mb-2">Este es tu punto de partida. Puedes ajustarlo en cualquier momento.</p>
                                        <div className="relative">
                                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-500 font-bold text-lg">
                                                {CURRENCIES.find(c => c.code === currency)?.symbol}
                                            </span>
                                            <input
                                                type="number"
                                                value={balance}
                                                onChange={e => setBalance(e.target.value)}
                                                placeholder="0"
                                                className="w-full bg-white/5 border border-white/10 rounded-2xl pl-10 pr-4 py-3 text-white placeholder-white/20 outline-none focus:border-cyan-500/50 transition-colors text-xl font-bold"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </>
                        )}

                        {/* ── STEP 5: ¡Listo! ── */}
                        {step === 5 && (
                            <>
                                <div className="text-center">
                                    <motion.div
                                        initial={{ scale: 0 }}
                                        animate={{ scale: 1 }}
                                        transition={{ delay: 0.2, type: 'spring', bounce: 0.4 }}
                                    >
                                        <Sparkles className="w-10 h-10 text-cyan-400 mx-auto mb-4" />
                                    </motion.div>
                                    <h1 className="text-3xl font-black text-white leading-tight">
                                        Tu sistema está <span className="text-cyan-400">activado</span>
                                    </h1>
                                    <p className="text-neutral-400 text-base mt-3 leading-relaxed">
                                        {name.trim() ? `${name.trim()}, ya tienes` : 'Tienes'} todo configurado. Cada día que completes tus hábitos, el anillo crece. Cada decisión financiera consciente cuenta. Cada acción alineada con tu identidad te acerca a quien quieres ser.
                                    </p>
                                </div>
                                <div className="space-y-2">
                                    {identityStatement.trim() && (
                                        <div className="flex items-center gap-2 p-3 bg-white/5 rounded-xl border border-white/8">
                                            <span className="text-base">🎯</span>
                                            <p className="text-sm text-neutral-300 line-clamp-1">"{identityStatement.trim()}"</p>
                                        </div>
                                    )}
                                    {habitTitle.trim() && (
                                        <div className="flex items-center gap-2 p-3 bg-white/5 rounded-xl border border-white/8">
                                            <span className="text-base">{habitIcon}</span>
                                            <p className="text-sm text-neutral-300">Hábito: <span className="text-white font-bold">{habitTitle.trim()}</span></p>
                                        </div>
                                    )}
                                    {balance && (
                                        <div className="flex items-center gap-2 p-3 bg-white/5 rounded-xl border border-white/8">
                                            <span className="text-base">💰</span>
                                            <p className="text-sm text-neutral-300">
                                                Balance: <span className="text-white font-bold">{CURRENCIES.find(c => c.code === currency)?.symbol}{parseFloat(balance).toLocaleString()}</span>
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </>
                        )}
                    </motion.div>
                </AnimatePresence>
            </div>

            {/* Navigation */}
            <div className="w-full max-w-md z-10 flex items-center justify-between pb-4">
                {step > 0 ? (
                    <button
                        onClick={goBack}
                        className="text-sm text-neutral-600 hover:text-neutral-400 transition-colors font-medium"
                    >
                        ← Atrás
                    </button>
                ) : (
                    <div />
                )}

                <motion.button
                    whileTap={{ scale: 0.97 }}
                    onClick={step === totalSteps - 1 ? finishOnboarding : goNext}
                    disabled={!canContinue()}
                    className={cn(
                        "flex items-center gap-2 px-7 py-3.5 rounded-2xl font-bold text-sm transition-all",
                        canContinue()
                            ? "bg-cyan-500 text-black hover:bg-cyan-400 shadow-[0_0_30px_rgba(6,182,212,0.3)]"
                            : "bg-white/10 text-neutral-600 cursor-not-allowed"
                    )}
                >
                    {step === totalSteps - 1 ? 'Empezar' : 'Continuar'}
                    <ArrowRight size={16} strokeWidth={2.5} />
                </motion.button>
            </div>
        </div>
    );
}
