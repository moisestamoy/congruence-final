import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, Check, Sparkles, AlertTriangle, Target, BookOpen, Skull, Flame, Pen } from 'lucide-react';
import { cn } from '../../utils/cn';
import { useHabitStore, IdentityManifesto } from './useHabitStore';

interface IdentityProtocolWizardProps {
    isOpen: boolean;
    onClose: () => void;
}

type Step = 'intro' | 'identity' | 'mission' | 'contract' | 'confirm';

const slideVariants = {
    enter: (direction: number) => ({
        x: direction > 0 ? 1000 : -1000,
        opacity: 0
    }),
    center: {
        zIndex: 1,
        x: 0,
        opacity: 1
    },
    exit: (direction: number) => ({
        zIndex: 0,
        x: direction < 0 ? 1000 : -1000,
        opacity: 0
    })
};


const progressByStep: Record<Step, string> = {
    intro: '5%',
    identity: '33%',
    mission: '66%',
    contract: '90%',
    confirm: '100%',
};

export function IdentityProtocolWizard({ isOpen, onClose }: IdentityProtocolWizardProps) {
    const [step, setStep] = useState<Step>('intro');
    const [direction, setDirection] = useState(0);
    const { setManifesto, manifesto } = useHabitStore();

    const [data, setData] = useState<IdentityManifesto>(() => ({
        identityStatement: manifesto?.identityStatement || manifesto?.identities?.personal || '',
        identities: manifesto?.identities || { personal: '', professional: '', financial: '' },
        goals: {
            oneYear: manifesto?.goals?.oneYear || '',
            ninetyDays: manifesto?.goals?.ninetyDays || '',
            antiGoals: manifesto?.goals?.antiGoals || '',
            sacrifice: manifesto?.goals?.sacrifice || '',
            toxicHabit: manifesto?.goals?.toxicHabit || '',
        },
        ignoranceDebt: manifesto?.ignoranceDebt || { missingSkill: '', investmentAction: '' },
        executionProtocol: manifesto?.executionProtocol || { planA_Action: '', planA_Volume: '', planB_Minimum: '' },
    }));

    const nextStep = (next: Step) => {
        setDirection(1);
        setStep(next);
    };

    const handleFinish = () => {
        setManifesto(data);
        onClose();
    };

    if (!isOpen) return null;

    const stepColor: Record<Step, string> = {
        intro: 'bg-transparent',
        identity: 'bg-cyan-500',
        mission: 'bg-purple-500',
        contract: 'bg-yellow-500',
        confirm: 'bg-emerald-500',
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 backdrop-blur-xl p-0 lg:p-4">
            <div className="w-full h-full lg:h-[700px] lg:max-w-4xl bg-[#020202] border border-white/10 lg:rounded-3xl shadow-2xl relative overflow-hidden flex flex-col">

                {/* Progress Bar */}
                <div className="h-1 bg-white/5 w-full">
                    <motion.div
                        className={cn("h-full transition-colors duration-500", stepColor[step])}
                        initial={{ width: "0%" }}
                        animate={{ width: progressByStep[step] }}
                        transition={{ duration: 0.4 }}
                    />
                </div>

                <div className="flex-1 relative overflow-hidden flex flex-col">
                    <AnimatePresence initial={false} custom={direction} mode="wait">

                        {/* ─────────── INTRO ─────────── */}
                        {step === 'intro' && (
                            <motion.div
                                key="intro"
                                variants={slideVariants} initial="enter" animate="center" exit="exit" custom={direction}
                                className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center"
                            >
                                <div className="w-24 h-24 mb-6 rounded-full bg-white/5 flex items-center justify-center border border-white/10 shadow-[0_0_30px_rgba(255,255,255,0.05)]">
                                    <Sparkles className="text-white" size={40} />
                                </div>
                                <h2 className="text-4xl lg:text-5xl font-black text-white tracking-tighter mb-4">
                                    IDENTITY<span className="text-cyan-400">PROTOCOL</span>
                                </h2>
                                <p className="text-neutral-500 text-lg max-w-md">
                                    No escribas lo que quieres. <br />
                                    Escribe <span className="text-white font-bold">quién eres</span>.
                                </p>
                                <p className="text-neutral-700 text-sm max-w-xs mt-4">
                                    3 pasos. Todo lo demás en la app se evalúa contra esto.
                                </p>
                                <button
                                    onClick={() => nextStep('identity')}
                                    className="mt-12 px-10 py-4 bg-white text-black font-bold text-lg rounded-full hover:scale-105 transition-transform flex items-center gap-3"
                                >
                                    Iniciar Protocolo <ArrowRight size={20} />
                                </button>
                            </motion.div>
                        )}

                        {/* ─────────── STEP 1: IDENTITY STATEMENT ─────────── */}
                        {step === 'identity' && (
                            <motion.div
                                key="identity"
                                variants={slideVariants} initial="enter" animate="center" exit="exit" custom={direction}
                                className="absolute inset-0 p-8 lg:p-12 overflow-y-auto flex flex-col justify-center"
                            >
                                <div className="max-w-xl mx-auto w-full space-y-8">
                                    <div className="text-center mb-8">
                                        <div className="flex items-center justify-center gap-2 text-cyan-400 mb-2">
                                            <Pen size={14} />
                                            <span className="font-bold tracking-widest text-xs uppercase">Paso 1 de 3 — Identidad</span>
                                        </div>
                                        <h2 className="text-3xl font-black text-white">¿Quién eres?</h2>
                                        <p className="text-neutral-500 text-sm mt-2 max-w-sm mx-auto">
                                            Una sola frase. Todo el peso en ella.
                                        </p>
                                    </div>

                                    <div className="space-y-3">
                                        <label className="text-xs text-neutral-500 uppercase font-bold tracking-wider block">
                                            Tu declaración de identidad
                                        </label>
                                        <textarea
                                            autoFocus
                                            rows={4}
                                            value={data.identityStatement}
                                            onChange={e => setData(prev => ({ ...prev, identityStatement: e.target.value }))}
                                            className="w-full bg-black border border-cyan-900/50 rounded-2xl p-6 text-2xl font-bold text-white placeholder-neutral-800 focus:border-cyan-400 focus:shadow-[0_0_30px_rgba(34,211,238,0.15)] transition-all outline-none resize-none leading-tight"
                                            placeholder="Soy el tipo de persona que..."
                                        />
                                        <p className="text-[10px] text-neutral-700 italic">
                                            Ej: "Soy el tipo de persona que mantiene sus compromisos sin importar cómo empieza el día."
                                        </p>
                                    </div>

                                    <div className="pt-4 flex justify-end">
                                        <button
                                            onClick={() => nextStep('mission')}
                                            disabled={!data.identityStatement?.trim()}
                                            className="px-8 py-3 bg-cyan-950 text-cyan-200 border border-cyan-900 rounded-lg hover:bg-cyan-900 transition-all disabled:opacity-30 flex items-center gap-2"
                                        >
                                            Confirmar y continuar <ArrowRight size={18} />
                                        </button>
                                    </div>
                                </div>
                            </motion.div>
                        )}

                        {/* ─────────── STEP 2: MISSION / FOCUS 90 DAYS ─────────── */}
                        {step === 'mission' && (
                            <motion.div
                                key="mission"
                                variants={slideVariants} initial="enter" animate="center" exit="exit" custom={direction}
                                className="absolute inset-0 p-8 lg:p-12 overflow-y-auto"
                            >
                                <div className="max-w-xl mx-auto space-y-6">
                                    <div className="text-center mb-8">
                                        <div className="flex items-center justify-center gap-2 text-purple-400 mb-2">
                                            <Target size={14} />
                                            <span className="font-bold tracking-widest text-xs uppercase">Paso 2 de 3 — Misión</span>
                                        </div>
                                        <h2 className="text-3xl font-black text-white">Foco 90 Días</h2>
                                        <p className="text-neutral-500 text-sm mt-2">La única meta que importa este trimestre.</p>
                                    </div>

                                    {/* 90-day goal */}
                                    <div>
                                        <label className="text-xs text-purple-400 uppercase font-bold tracking-wider mb-2 block flex items-center gap-2">
                                            <Target size={12} /> La misión (90 días)
                                        </label>
                                        <textarea
                                            autoFocus
                                            value={data.goals.ninetyDays}
                                            onChange={e => setData(prev => ({ ...prev, goals: { ...prev.goals, ninetyDays: e.target.value } }))}
                                            className="w-full bg-purple-900/10 border border-purple-500/50 rounded-2xl p-6 text-xl font-bold text-white placeholder-purple-900/50 focus:border-purple-400 focus:shadow-[0_0_30px_rgba(168,85,247,0.15)] transition-all outline-none resize-none h-24 leading-tight"
                                            placeholder="Mi único objetivo crítico para los próximos 3 meses..."
                                        />
                                    </div>

                                    {/* Sacrifice */}
                                    <div className="border border-amber-900/30 bg-amber-950/10 rounded-xl p-4">
                                        <label className="text-xs text-amber-500 uppercase font-bold tracking-wider mb-2 block">
                                            ¿Qué sacrificaré para lograrlo? <span className="text-neutral-600 normal-case">(opcional)</span>
                                        </label>
                                        <input
                                            type="text"
                                            value={data.goals.sacrifice || ''}
                                            onChange={e => setData(prev => ({ ...prev, goals: { ...prev.goals, sacrifice: e.target.value } }))}
                                            className="w-full bg-transparent border-b border-amber-900/50 p-2 text-amber-100 placeholder-amber-900/40 focus:border-amber-500 focus:outline-none text-sm"
                                            placeholder="Ej: salidas, series, tiempo en redes..."
                                        />
                                    </div>

                                    {/* Toxic habit */}
                                    <div className="border border-red-900/30 bg-red-950/10 rounded-xl p-4">
                                        <label className="text-xs text-red-500 uppercase font-bold tracking-wider mb-2 block flex items-center gap-2">
                                            <AlertTriangle size={12} /> Hábito tóxico que no toleraré <span className="text-neutral-600 normal-case font-normal">(opcional)</span>
                                        </label>
                                        <input
                                            type="text"
                                            value={data.goals.toxicHabit || ''}
                                            onChange={e => setData(prev => ({ ...prev, goals: { ...prev.goals, toxicHabit: e.target.value } }))}
                                            className="w-full bg-transparent border-b border-red-900/50 p-2 text-red-200 placeholder-red-900/40 focus:border-red-500 focus:outline-none text-sm"
                                            placeholder="Ej: scrollear al despertar, procrastinar tareas vitales..."
                                        />
                                    </div>

                                    {/* Ignorance debt — kept but compact */}
                                    <div className="border border-rose-900/20 bg-rose-950/5 rounded-xl p-4 space-y-3">
                                        <div className="flex items-center gap-2 text-rose-400">
                                            <BookOpen size={12} />
                                            <span className="text-xs font-bold uppercase tracking-wider">Deuda de ignorancia <span className="text-neutral-600 normal-case font-normal">(opcional)</span></span>
                                        </div>
                                        <input
                                            type="text"
                                            value={data.ignoranceDebt.missingSkill}
                                            onChange={e => setData(prev => ({ ...prev, ignoranceDebt: { ...prev.ignoranceDebt, missingSkill: e.target.value } }))}
                                            className="w-full bg-transparent border-b border-rose-900/30 p-2 text-rose-100 placeholder-rose-900/30 focus:border-rose-400 focus:outline-none text-sm"
                                            placeholder="Habilidad que me separa del objetivo..."
                                        />
                                    </div>

                                    <div className="pt-2 flex justify-end">
                                        <button
                                            onClick={() => nextStep('contract')}
                                            disabled={!data.goals.ninetyDays.trim()}
                                            className="px-8 py-3 bg-purple-950 text-purple-200 border border-purple-900 rounded-lg hover:bg-purple-900 transition-all disabled:opacity-30 flex items-center gap-2"
                                        >
                                            Confirmar y continuar <ArrowRight size={18} />
                                        </button>
                                    </div>
                                </div>
                            </motion.div>
                        )}

                        {/* ─────────── STEP 3: CONTRATO DIARIO ─────────── */}
                        {step === 'contract' && (
                            <motion.div
                                key="contract"
                                variants={slideVariants} initial="enter" animate="center" exit="exit" custom={direction}
                                className="absolute inset-0 p-8 lg:p-12 overflow-y-auto"
                            >
                                <div className="max-w-xl mx-auto space-y-6">
                                    <div className="text-center mb-6">
                                        <div className="flex items-center justify-center gap-2 text-yellow-400 mb-2">
                                            <Skull size={14} />
                                            <span className="font-bold tracking-widest text-xs uppercase">Paso 3 de 3 — El Contrato Diario</span>
                                        </div>
                                        <h2 className="text-3xl font-black text-white">Ataque vs Supervivencia</h2>
                                        <p className="text-neutral-500 text-sm mt-2">El Plan B es lo que te medirás cada noche.</p>
                                    </div>

                                    {/* PLAN A (GREEN) */}
                                    <div className="bg-emerald-950/20 border border-emerald-900/50 rounded-2xl p-6 space-y-4">
                                        <div className="flex items-center gap-3 mb-2">
                                            <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-400">
                                                <Flame size={20} fill="currentColor" />
                                            </div>
                                            <div>
                                                <h4 className="font-bold text-emerald-400 uppercase tracking-wider text-sm">Plan A: Ataque</h4>
                                                <p className="text-[10px] text-emerald-200/60">Día perfecto al 100% de energía</p>
                                            </div>
                                        </div>
                                        <div className="space-y-3">
                                            <div>
                                                <label className="text-[10px] uppercase font-bold text-emerald-700/80 mb-1 block">Acción Pareto (20/80)</label>
                                                <input
                                                    type="text"
                                                    autoFocus
                                                    value={data.executionProtocol.planA_Action}
                                                    onChange={e => setData(prev => ({ ...prev, executionProtocol: { ...prev.executionProtocol, planA_Action: e.target.value } }))}
                                                    className="w-full bg-emerald-900/20 border border-emerald-800/50 rounded-lg p-3 text-emerald-100 placeholder-emerald-800/50 focus:outline-none focus:border-emerald-500"
                                                    placeholder="Ej: Deep Work 4h + entrenamiento"
                                                />
                                            </div>
                                            <div>
                                                <label className="text-[10px] uppercase font-bold text-emerald-700/80 mb-1 block">Volumen Diario</label>
                                                <input
                                                    type="text"
                                                    value={data.executionProtocol.planA_Volume}
                                                    onChange={e => setData(prev => ({ ...prev, executionProtocol: { ...prev.executionProtocol, planA_Volume: e.target.value } }))}
                                                    className="w-full bg-emerald-900/20 border border-emerald-800/50 rounded-lg p-3 text-emerald-100 placeholder-emerald-800/50 focus:outline-none focus:border-emerald-500"
                                                    placeholder="Ej: 4 horas sin distracciones"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* PLAN B (YELLOW) */}
                                    <div className="bg-yellow-950/20 border border-yellow-900/50 rounded-2xl p-6 space-y-4">
                                        <div className="flex items-center gap-3 mb-2">
                                            <div className="p-2 bg-yellow-500/10 rounded-lg text-yellow-400">
                                                <Skull size={20} />
                                            </div>
                                            <div>
                                                <h4 className="font-bold text-yellow-500 uppercase tracking-wider text-sm">Plan B: Supervivencia</h4>
                                                <p className="text-[10px] text-yellow-200/60">Días de caos o emergencia. El mínimo ridículo.</p>
                                            </div>
                                        </div>
                                        <div>
                                            <label className="text-[10px] uppercase font-bold text-yellow-700/80 mb-1 block">Mínimo ridículo (siempre ejecutable)</label>
                                            <input
                                                type="text"
                                                value={data.executionProtocol.planB_Minimum}
                                                onChange={e => setData(prev => ({ ...prev, executionProtocol: { ...prev.executionProtocol, planB_Minimum: e.target.value } }))}
                                                className="w-full bg-yellow-900/20 border border-yellow-800/50 rounded-lg p-3 text-yellow-100 placeholder-yellow-800/50 focus:outline-none focus:border-yellow-500"
                                                placeholder="Ej: Leer 1 página o 5 min de revisión"
                                            />
                                        </div>
                                    </div>

                                    <div className="pt-2">
                                        <button
                                            onClick={() => nextStep('confirm')}
                                            disabled={!data.executionProtocol.planA_Action || !data.executionProtocol.planB_Minimum}
                                            className="w-full py-4 bg-white text-black font-black text-lg rounded-xl hover:bg-neutral-200 shadow-[0_0_20px_rgba(255,255,255,0.2)] transition-all flex items-center justify-center gap-3 disabled:opacity-30 disabled:shadow-none"
                                        >
                                            Confirmar y continuar <ArrowRight size={22} />
                                        </button>
                                    </div>
                                </div>
                            </motion.div>
                        )}

                        {/* ─────────── CONFIRM SCREEN ─────────── */}
                        {step === 'confirm' && (
                            <motion.div
                                key="confirm"
                                variants={slideVariants} initial="enter" animate="center" exit="exit" custom={direction}
                                className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center"
                            >
                                <div className="w-full max-w-lg mx-auto">
                                    {/* Plan B hero reveal */}
                                    <p className="text-[10px] font-bold uppercase tracking-widest text-yellow-500/70 mb-3">
                                        Tu contrato mínimo diario
                                    </p>
                                    <div className="bg-yellow-950/30 border border-yellow-500/30 rounded-3xl p-8 mb-8 shadow-[0_0_40px_rgba(234,179,8,0.1)]">
                                        <Skull className="text-yellow-400 mx-auto mb-4" size={32} />
                                        <p className="text-2xl md:text-3xl font-black text-yellow-100 leading-snug">
                                            "{data.executionProtocol.planB_Minimum}"
                                        </p>
                                    </div>
                                    <p className="text-neutral-400 text-sm max-w-sm mx-auto mb-10">
                                        <span className="text-white font-bold">Esto es lo que te medirás cada noche.</span><br />
                                        Sin excusas. Sin negociación. El mínimo siempre se cumple.
                                    </p>
                                    <button
                                        onClick={handleFinish}
                                        className="w-full py-5 bg-white text-black font-black text-xl rounded-xl hover:bg-neutral-100 shadow-[0_0_30px_rgba(255,255,255,0.3)] transition-all flex items-center justify-center gap-3"
                                    >
                                        FIRMAR CONTRATO <Check size={24} strokeWidth={3} />
                                    </button>
                                    <p className="text-[10px] text-neutral-700 mt-4 italic">
                                        Puedes editar esto en cualquier momento desde el Centro de Identidad.
                                    </p>
                                </div>
                            </motion.div>
                        )}

                    </AnimatePresence>
                </div>
            </div>
        </div>
    );
}
