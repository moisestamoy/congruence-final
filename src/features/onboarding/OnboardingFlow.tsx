import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, CheckCircle2 } from 'lucide-react';
import { cn } from '../../utils/cn';

const FEATURES = [
    {
        emoji: '🎯',
        title: 'Hábitos Diarios',
        description: 'Construye quien eres con acciones consistentes. El anillo de congruencia refleja tu progreso real cada día.',
        accent: 'text-cyan-400',
        bg: 'bg-cyan-500/[0.08]',
        border: 'border-cyan-500/20',
    },
    {
        emoji: '💰',
        title: 'Control Financiero',
        description: 'Registra gastos, define tu presupuesto y mantente en balance. Sabe exactamente dónde va tu dinero.',
        accent: 'text-emerald-400',
        bg: 'bg-emerald-500/[0.08]',
        border: 'border-emerald-500/20',
    },
    {
        emoji: '🧠',
        title: 'Coach Inteligente',
        description: 'Análisis diario de tus hábitos, finanzas y estado emocional. Una perspectiva que no te miente.',
        accent: 'text-amber-400',
        bg: 'bg-amber-500/[0.08]',
        border: 'border-amber-500/20',
    },
    {
        emoji: '⚡',
        title: 'Tu Identidad',
        description: 'Define quién decides ser. Tu protocolo de identidad guía cada hábito y decisión del día.',
        accent: 'text-purple-400',
        bg: 'bg-purple-500/[0.08]',
        border: 'border-purple-500/20',
    },
] as const;

interface Props {
    onComplete: () => void;
}

export function OnboardingFlow({ onComplete }: Props) {
    const [step, setStep] = useState<0 | 1 | 2>(0);
    const [featureIndex, setFeatureIndex] = useState(0);
    const [direction, setDirection] = useState(1);

    const nextFeature = () => {
        if (featureIndex < FEATURES.length - 1) {
            setDirection(1);
            setFeatureIndex(i => i + 1);
        } else {
            setStep(2);
        }
    };

    return (
        <div className="fixed inset-0 z-[300] bg-[#050505] flex flex-col items-center justify-center overflow-hidden select-none">
            {/* Ambient */}
            <div className="absolute inset-0 pointer-events-none">
                <div className="absolute top-[-25%] left-[5%] w-[80%] h-[70%] bg-cyan-500/[0.04] rounded-full blur-[200px]" />
                <div className="absolute bottom-[-20%] right-[-5%] w-[55%] h-[55%] bg-purple-500/[0.04] rounded-full blur-[160px]" />
            </div>

            {/* Skip */}
            {step < 2 && (
                <button
                    onClick={onComplete}
                    className="absolute top-6 right-6 text-xs text-neutral-600 hover:text-neutral-400 transition-colors font-medium"
                >
                    Omitir
                </button>
            )}

            {/* Global step dots */}
            <div className="absolute bottom-10 flex gap-1.5">
                {([0, 1, 2] as const).map(i => (
                    <div
                        key={i}
                        className={cn(
                            "rounded-full transition-all duration-300",
                            i === step ? "w-6 h-1.5 bg-white" : "w-1.5 h-1.5 bg-white/20"
                        )}
                    />
                ))}
            </div>

            <AnimatePresence mode="wait">

                {/* ── STEP 0: WELCOME ── */}
                {step === 0 && (
                    <motion.div
                        key="welcome"
                        initial={{ opacity: 0, y: 28 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        transition={{ duration: 0.5, ease: [0.21, 0.47, 0.32, 0.98] }}
                        className="flex flex-col items-center text-center px-8 max-w-xs"
                    >
                        <motion.div
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ delay: 0.1, duration: 0.6, ease: [0.21, 0.47, 0.32, 0.98] }}
                            className="mb-8"
                        >
                            <svg
                                width="80" height="80" viewBox="0 0 32 32" fill="none"
                                xmlns="http://www.w3.org/2000/svg"
                                className="drop-shadow-[0_0_40px_rgba(34,211,238,0.55)]"
                            >
                                <rect width="32" height="32" rx="7" fill="#0a0a0a" />
                                <circle cx="16" cy="16" r="12.8" stroke="#22d3ee" strokeWidth="0.9" strokeOpacity="0.2" />
                                <circle cx="16" cy="16" r="9.6"  stroke="#22d3ee" strokeWidth="1.1" strokeOpacity="0.55" />
                                <circle cx="16" cy="16" r="6.4"  stroke="#22d3ee" strokeWidth="1.3" strokeOpacity="1" />
                                <circle cx="16" cy="16" r="1.1"  fill="#22d3ee" />
                            </svg>
                        </motion.div>

                        <motion.h1
                            initial={{ opacity: 0, y: 12 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.2 }}
                            className="text-4xl font-black tracking-tight text-white mb-3"
                        >
                            Congruencia
                        </motion.h1>

                        <motion.p
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.3 }}
                            className="text-neutral-400 text-base leading-relaxed mb-12"
                        >
                            Vive en línea con quien decides ser.
                        </motion.p>

                        <motion.button
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.4 }}
                            onClick={() => setStep(1)}
                            className="flex items-center justify-center gap-2 w-full px-8 py-4 bg-white text-black font-bold rounded-2xl text-base shadow-[0_0_40px_rgba(255,255,255,0.12)] hover:bg-neutral-100 active:scale-[0.97] transition-all"
                        >
                            Comenzar <ArrowRight size={18} />
                        </motion.button>
                    </motion.div>
                )}

                {/* ── STEP 1: FEATURE HIGHLIGHTS ── */}
                {step === 1 && (
                    <motion.div
                        key="features"
                        initial={{ opacity: 0, x: 40 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -40 }}
                        transition={{ duration: 0.4, ease: [0.21, 0.47, 0.32, 0.98] }}
                        className="flex flex-col items-center w-full max-w-sm px-6"
                    >
                        {/* Feature card */}
                        <div className="w-full overflow-hidden mb-6">
                            <AnimatePresence custom={direction} mode="wait">
                                <motion.div
                                    key={featureIndex}
                                    custom={direction}
                                    initial={{ opacity: 0, x: direction * 60 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: direction * -60 }}
                                    transition={{ duration: 0.3, ease: [0.21, 0.47, 0.32, 0.98] }}
                                    className={cn(
                                        "p-8 rounded-3xl border text-center",
                                        FEATURES[featureIndex].bg,
                                        FEATURES[featureIndex].border
                                    )}
                                >
                                    <div className="text-6xl mb-5 leading-none">{FEATURES[featureIndex].emoji}</div>
                                    <h2 className={cn("text-xl font-black mb-3", FEATURES[featureIndex].accent)}>
                                        {FEATURES[featureIndex].title}
                                    </h2>
                                    <p className="text-neutral-400 text-sm leading-relaxed">
                                        {FEATURES[featureIndex].description}
                                    </p>
                                </motion.div>
                            </AnimatePresence>
                        </div>

                        {/* Feature sub-dots */}
                        <div className="flex gap-1.5 mb-8">
                            {FEATURES.map((_, i) => (
                                <button
                                    key={i}
                                    onClick={() => { setDirection(i > featureIndex ? 1 : -1); setFeatureIndex(i); }}
                                    className={cn(
                                        "rounded-full transition-all duration-300",
                                        i === featureIndex ? "w-5 h-1.5 bg-white" : "w-1.5 h-1.5 bg-white/20 hover:bg-white/40"
                                    )}
                                />
                            ))}
                        </div>

                        <button
                            onClick={nextFeature}
                            className="flex items-center justify-center gap-2 w-full px-8 py-4 bg-white text-black font-bold rounded-2xl text-base hover:bg-neutral-100 active:scale-[0.97] transition-all"
                        >
                            {featureIndex < FEATURES.length - 1 ? (
                                <>Siguiente <ArrowRight size={18} /></>
                            ) : (
                                <>¡Entendido! <ArrowRight size={18} /></>
                            )}
                        </button>
                    </motion.div>
                )}

                {/* ── STEP 2: DONE ── */}
                {step === 2 && (
                    <motion.div
                        key="done"
                        initial={{ opacity: 0, scale: 0.94 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.45, ease: [0.21, 0.47, 0.32, 0.98] }}
                        className="flex flex-col items-center text-center px-8 max-w-xs"
                    >
                        <motion.div
                            initial={{ scale: 0, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ delay: 0.15, type: 'spring', bounce: 0.45 }}
                            className="w-20 h-20 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center mb-8 shadow-[0_0_40px_rgba(52,211,153,0.2)]"
                        >
                            <CheckCircle2 className="text-emerald-400" size={36} />
                        </motion.div>

                        <motion.h2
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.3 }}
                            className="text-3xl font-black text-white mb-3"
                        >
                            Todo listo
                        </motion.h2>

                        <motion.p
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.4 }}
                            className="text-neutral-400 text-sm leading-relaxed mb-12"
                        >
                            Tu sistema de vida está activado. Empieza por definir tus hábitos o configura tu identidad.
                        </motion.p>

                        <motion.button
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.5 }}
                            onClick={onComplete}
                            className="flex items-center justify-center gap-2 w-full px-8 py-4 bg-white text-black font-bold rounded-2xl text-base shadow-[0_0_40px_rgba(255,255,255,0.12)] hover:bg-neutral-100 active:scale-[0.97] transition-all"
                        >
                            Entrar a Congruencia <ArrowRight size={18} />
                        </motion.button>
                    </motion.div>
                )}

            </AnimatePresence>
        </div>
    );
}
