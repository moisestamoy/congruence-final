import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, Check, Sparkles, AlertTriangle, Target, Zap, BookOpen, Skull, Flame } from 'lucide-react';
import { cn } from '../../utils/cn';
import { useHabitStore, IdentityManifesto } from './useHabitStore';

interface IdentityProtocolWizardProps {
    isOpen: boolean;
    onClose: () => void;
}

type Step = 'intro' | 'identity' | 'time' | 'ignorance' | 'protocol';

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

export function IdentityProtocolWizard({ isOpen, onClose }: IdentityProtocolWizardProps) {
    const [step, setStep] = useState<Step>('intro');
    const [direction, setDirection] = useState(0);
    const { setManifesto } = useHabitStore();

    const [data, setData] = useState<IdentityManifesto>({
        identities: { personal: '', professional: '', financial: '' },
        goals: { oneYear: '', ninetyDays: '', antiGoals: '' },
        ignoranceDebt: { missingSkill: '', investmentAction: '' },
        executionProtocol: { planA_Action: '', planA_Volume: '', planB_Minimum: '' }
    });

    const updateData = (section: keyof IdentityManifesto, field: string, value: string) => {
        setData(prev => ({
            ...prev,
            [section]: {
                ...prev[section],
                [field]: value
            }
        }));
    };

    const nextStep = (next: Step) => {
        setDirection(1);
        setStep(next);
    };

    const handleFinish = () => {
        setManifesto(data);
        onClose();
        // Here you could add a success confetti or animation trigger
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 backdrop-blur-xl p-0 lg:p-4">
            <div className="w-full h-full lg:h-[700px] lg:max-w-4xl bg-[#020202] border border-white/10 lg:rounded-3xl shadow-2xl relative overflow-hidden flex flex-col">

                {/* Progress Bar */}
                <div className="h-1 bg-white/5 w-full">
                    <motion.div
                        className={cn(
                            "h-full transition-colors duration-500",
                            step === 'identity' ? "bg-cyan-500" :
                                step === 'time' ? "bg-purple-500" :
                                    step === 'ignorance' ? "bg-rose-500" :
                                        step === 'protocol' ? "bg-yellow-500" : "bg-transparent"
                        )}
                        initial={{ width: "0%" }}
                        animate={{
                            width: step === 'intro' ? "5%" :
                                step === 'identity' ? "25%" :
                                    step === 'time' ? "50%" :
                                        step === 'ignorance' ? "75%" : "100%"
                        }}
                    />
                </div>

                <div className="flex-1 relative overflow-hidden flex flex-col">
                    <AnimatePresence initial={false} custom={direction} mode="wait">

                        {/* INTRO */}
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
                                <button
                                    onClick={() => nextStep('identity')}
                                    className="mt-12 px-10 py-4 bg-white text-black font-bold text-lg rounded-full hover:scale-105 transition-transform flex items-center gap-3"
                                >
                                    Iniciar Protocolo <ArrowRight size={20} />
                                </button>
                            </motion.div>
                        )}

                        {/* STEP 1: IDENTITY */}
                        {step === 'identity' && (
                            <motion.div
                                key="identity"
                                variants={slideVariants} initial="enter" animate="center" exit="exit" custom={direction}
                                className="absolute inset-0 p-8 lg:p-12 overflow-y-auto"
                            >
                                <div className="max-w-xl mx-auto space-y-8">
                                    <div className="text-center mb-8">
                                        <h3 className="text-cyan-400 font-bold tracking-widest text-xs uppercase mb-2">Bloque 1: Identidad</h3>
                                        <h2 className="text-3xl font-bold text-white">Yo Soy...</h2>
                                    </div>

                                    <div className="space-y-6">
                                        <div className="space-y-2">
                                            <label className="text-xs text-neutral-500 uppercase font-bold tracking-wider">Cuerpo / Mente</label>
                                            <input
                                                autoFocus
                                                type="text"
                                                value={data.identities.personal}
                                                onChange={e => updateData('identities', 'personal', e.target.value)}
                                                className="w-full bg-black border border-cyan-900/50 rounded-xl p-4 text-lg text-white placeholder-neutral-800 focus:border-cyan-400 focus:shadow-[0_0_15px_rgba(34,211,238,0.2)] transition-all outline-none"
                                                placeholder="Ej: Un atleta imparable..."
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-xs text-neutral-500 uppercase font-bold tracking-wider">Profesional</label>
                                            <input
                                                type="text"
                                                value={data.identities.professional}
                                                onChange={e => updateData('identities', 'professional', e.target.value)}
                                                className="w-full bg-black border border-cyan-900/50 rounded-xl p-4 text-lg text-white placeholder-neutral-800 focus:border-cyan-400 focus:shadow-[0_0_15px_rgba(34,211,238,0.2)] transition-all outline-none"
                                                placeholder="Ej: El mejor arquitecto de software..."
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-xs text-neutral-500 uppercase font-bold tracking-wider">Financiero</label>
                                            <input
                                                type="text"
                                                value={data.identities.financial}
                                                onChange={e => updateData('identities', 'financial', e.target.value)}
                                                className="w-full bg-black border border-cyan-900/50 rounded-xl p-4 text-lg text-white placeholder-neutral-800 focus:border-cyan-400 focus:shadow-[0_0_15px_rgba(34,211,238,0.2)] transition-all outline-none"
                                                placeholder="Ej: Un inversor inteligente..."
                                            />
                                        </div>
                                    </div>

                                    <div className="pt-8 flex justify-end">
                                        <button
                                            onClick={() => nextStep('time')}
                                            disabled={!data.identities.personal || !data.identities.professional}
                                            className="px-8 py-3 bg-cyan-950 text-cyan-200 border border-cyan-900 rounded-lg hover:bg-cyan-900 transition-all disabled:opacity-50 flex items-center gap-2"
                                        >
                                            Siguiente <ArrowRight size={18} />
                                        </button>
                                    </div>
                                </div>
                            </motion.div>
                        )}

                        {/* STEP 2: TIME */}
                        {step === 'time' && (
                            <motion.div
                                key="time"
                                variants={slideVariants} initial="enter" animate="center" exit="exit" custom={direction}
                                className="absolute inset-0 p-8 lg:p-12 overflow-y-auto"
                            >
                                <div className="max-w-xl mx-auto space-y-8">
                                    <div className="text-center mb-8">
                                        <h3 className="text-purple-400 font-bold tracking-widest text-xs uppercase mb-2">Bloque 2: Compresión de Tiempo</h3>
                                        <h2 className="text-3xl font-bold text-white">Foco 90 Días</h2>
                                    </div>

                                    {/* Pyramid Layout */}
                                    <div className="flex flex-col gap-4">
                                        {/* Top: 1 Year (Faded) */}
                                        <div className="opacity-50 hover:opacity-100 transition-opacity">
                                            <label className="text-[10px] text-neutral-400 uppercase font-bold tracking-wider mb-1 block">Visión 1 Año</label>
                                            <input
                                                type="text"
                                                value={data.goals.oneYear}
                                                onChange={e => updateData('goals', 'oneYear', e.target.value)}
                                                className="w-full bg-transparent border-b border-white/20 p-2 text-sm text-neutral-300 focus:border-white focus:outline-none"
                                                placeholder="¿Dónde estarás en 12 meses?"
                                            />
                                        </div>

                                        {/* Center: 90 Days (Focus) */}
                                        <div className="py-6 scale-105">
                                            <label className="text-xs text-purple-400 uppercase font-bold tracking-wider mb-2 block flex items-center gap-2">
                                                <Target size={14} /> La Misión (90 Días)
                                            </label>
                                            <textarea
                                                autoFocus
                                                value={data.goals.ninetyDays}
                                                onChange={e => updateData('goals', 'ninetyDays', e.target.value)}
                                                className="w-full bg-purple-900/10 border border-purple-500/50 rounded-xl p-6 text-2xl font-bold text-white placeholder-purple-900/50 focus:border-purple-400 focus:shadow-[0_0_30px_rgba(168,85,247,0.15)] transition-all outline-none resize-none h-32 leading-tight"
                                                placeholder="Tu único objetivo crítico para los próximos 3 meses..."
                                            />
                                        </div>

                                        {/* Bottom: Anti-Goals (Red) */}
                                        <div className="border border-red-900/30 bg-red-950/10 rounded-xl p-4 mt-2">
                                            <label className="text-xs text-red-500 uppercase font-bold tracking-wider mb-2 block flex items-center gap-2">
                                                <AlertTriangle size={14} /> Anti-Metas
                                            </label>
                                            <input
                                                type="text"
                                                value={data.goals.antiGoals}
                                                onChange={e => updateData('goals', 'antiGoals', e.target.value)}
                                                className="w-full bg-transparent border-b border-red-900/50 p-2 text-red-200 placeholder-red-900/50 focus:border-red-500 focus:outline-none"
                                                placeholder="NO estoy dispuesto a..."
                                            />
                                        </div>
                                    </div>

                                    <div className="pt-8 flex justify-end">
                                        <button
                                            onClick={() => nextStep('ignorance')}
                                            disabled={!data.goals.ninetyDays}
                                            className="px-8 py-3 bg-purple-950 text-purple-200 border border-purple-900 rounded-lg hover:bg-purple-900 transition-all disabled:opacity-50 flex items-center gap-2"
                                        >
                                            Siguiente <ArrowRight size={18} />
                                        </button>
                                    </div>
                                </div>
                            </motion.div>
                        )}

                        {/* STEP 3: IGNORANCE */}
                        {step === 'ignorance' && (
                            <motion.div
                                key="ignorance"
                                variants={slideVariants} initial="enter" animate="center" exit="exit" custom={direction}
                                className="absolute inset-0 p-8 lg:p-12 overflow-y-auto"
                            >
                                <div className="max-w-xl mx-auto space-y-8">
                                    <div className="text-center mb-8">
                                        <h3 className="text-rose-400 font-bold tracking-widest text-xs uppercase mb-2">Bloque 3: Deuda de Ignorancia</h3>
                                        <h2 className="text-3xl font-bold text-white">El Precio a Pagar</h2>
                                        <p className="text-neutral-500 mt-2 text-sm">"No fallas por vago, fallas porque no sabes cómo."</p>
                                    </div>

                                    <div className="space-y-8">
                                        <div className="space-y-3">
                                            <label className="text-sm text-neutral-300 font-bold flex items-center gap-2">
                                                <BookOpen size={16} className="text-rose-500" /> Habilidad Faltante #1
                                            </label>
                                            <input
                                                autoFocus
                                                type="text"
                                                value={data.ignoranceDebt.missingSkill}
                                                onChange={e => updateData('ignoranceDebt', 'missingSkill', e.target.value)}
                                                className="w-full bg-neutral-900 border border-neutral-800 rounded-xl p-4 text-white placeholder-neutral-600 focus:border-rose-500 transition-all outline-none"
                                                placeholder="¿Qué skill te separa del objetivo?"
                                            />
                                        </div>

                                        <div className="space-y-3">
                                            <label className="text-sm text-neutral-300 font-bold flex items-center gap-2">
                                                <Zap size={16} className="text-rose-500" /> La Inversión (Hoy)
                                            </label>
                                            <input
                                                type="text"
                                                value={data.ignoranceDebt.investmentAction}
                                                onChange={e => updateData('ignoranceDebt', 'investmentAction', e.target.value)}
                                                className="w-full bg-neutral-900 border border-neutral-800 rounded-xl p-4 text-white placeholder-neutral-600 focus:border-rose-500 transition-all outline-none"
                                                placeholder="Libro, curso o mentoría a comprar YA."
                                            />
                                        </div>
                                    </div>

                                    <div className="pt-8 flex justify-end">
                                        <button
                                            onClick={() => nextStep('protocol')}
                                            disabled={!data.ignoranceDebt.missingSkill}
                                            className="px-8 py-3 bg-rose-950 text-rose-200 border border-rose-900 rounded-lg hover:bg-rose-900 transition-all disabled:opacity-50 flex items-center gap-2"
                                        >
                                            Siguiente <ArrowRight size={18} />
                                        </button>
                                    </div>
                                </div>
                            </motion.div>
                        )}

                        {/* STEP 4: PROTOCOL (PLAN A/B) */}
                        {step === 'protocol' && (
                            <motion.div
                                key="protocol"
                                variants={slideVariants} initial="enter" animate="center" exit="exit" custom={direction}
                                className="absolute inset-0 p-8 lg:p-12 overflow-y-auto"
                            >
                                <div className="max-w-xl mx-auto space-y-6">
                                    <div className="text-center mb-6">
                                        <h3 className="text-yellow-400 font-bold tracking-widest text-xs uppercase mb-2">Bloque 4: Ejecución</h3>
                                        <h2 className="text-3xl font-bold text-white">Ataque vs Supervivencia</h2>
                                    </div>

                                    {/* PLAN A (GREEN) */}
                                    <div className="bg-emerald-950/20 border border-emerald-900/50 rounded-2xl p-6 space-y-4">
                                        <div className="flex items-center gap-3 mb-2">
                                            <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-400">
                                                <Flame size={20} fill="currentColor" />
                                            </div>
                                            <div>
                                                <h4 className="font-bold text-emerald-400 uppercase tracking-wider text-sm">Plan A: Ataque</h4>
                                                <p className="text-[10px] text-emerald-200/60">Condiciones óptimas. Racha x1.0</p>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="col-span-2">
                                                <label className="text-[10px] uppercase font-bold text-emerald-700/80 mb-1 block">Acción Pareto (20/80)</label>
                                                <input
                                                    type="text"
                                                    value={data.executionProtocol.planA_Action}
                                                    onChange={e => updateData('executionProtocol', 'planA_Action', e.target.value)}
                                                    className="w-full bg-emerald-900/20 border border-emerald-800/50 rounded-lg p-3 text-emerald-100 placeholder-emerald-800/50 focus:outline-none focus:border-emerald-500"
                                                    placeholder="Ej: Deep Work"
                                                />
                                            </div>
                                            <div className="col-span-2">
                                                <label className="text-[10px] uppercase font-bold text-emerald-700/80 mb-1 block">Volumen Diario</label>
                                                <input
                                                    type="text"
                                                    value={data.executionProtocol.planA_Volume}
                                                    onChange={e => updateData('executionProtocol', 'planA_Volume', e.target.value)}
                                                    className="w-full bg-emerald-900/20 border border-emerald-800/50 rounded-lg p-3 text-emerald-100 placeholder-emerald-800/50 focus:outline-none focus:border-emerald-500"
                                                    placeholder="Ej: 4 horas sin distracciones"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* PLAN B (YELLOW/ORANGE) */}
                                    <div className="bg-yellow-950/20 border border-yellow-900/50 rounded-2xl p-6 space-y-4">
                                        <div className="flex items-center gap-3 mb-2">
                                            <div className="p-2 bg-yellow-500/10 rounded-lg text-yellow-400">
                                                <Skull size={20} />
                                            </div>
                                            <div>
                                                <h4 className="font-bold text-yellow-500 uppercase tracking-wider text-sm">Plan B: Supervivencia</h4>
                                                <p className="text-[10px] text-yellow-200/60">Días de caos/enfermedad. Racha x0.5</p>
                                            </div>
                                        </div>

                                        <div>
                                            <label className="text-[10px] uppercase font-bold text-yellow-700/80 mb-1 block">Mínimo Ridículo</label>
                                            <input
                                                type="text"
                                                value={data.executionProtocol.planB_Minimum}
                                                onChange={e => updateData('executionProtocol', 'planB_Minimum', e.target.value)}
                                                className="w-full bg-yellow-900/20 border border-yellow-800/50 rounded-lg p-3 text-yellow-100 placeholder-yellow-800/50 focus:outline-none focus:border-yellow-500"
                                                placeholder="Ej: Leer 1 página o 5 min de revisión"
                                            />
                                        </div>
                                    </div>

                                    <div className="pt-4">
                                        <button
                                            onClick={handleFinish}
                                            disabled={!data.executionProtocol.planA_Action || !data.executionProtocol.planB_Minimum}
                                            className="w-full py-4 bg-white text-black font-black text-xl rounded-xl hover:bg-neutral-200 shadow-[0_0_20px_rgba(255,255,255,0.3)] transition-all flex items-center justify-center gap-3 disabled:opacity-50 disabled:shadow-none"
                                        >
                                            ACTIVAR PROTOCOLO <Check size={24} strokeWidth={3} />
                                        </button>
                                    </div>
                                </div>
                            </motion.div>
                        )}

                    </AnimatePresence>
                </div>
            </div>
        </div>
    );
}
