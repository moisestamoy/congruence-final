import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, Check, Sparkles, AlertTriangle, Target, User } from 'lucide-react';
import { cn } from '../../utils/cn';
import { useHabitStore } from './useHabitStore'; // Assuming this store exists

interface IdentityBuilderProps {
    isOpen: boolean;
    onClose: () => void;
}

type Step = 'intro' | 'identity' | 'pain' | 'pleasure' | 'review';

export function IdentityBuilder({ isOpen, onClose }: IdentityBuilderProps) {
    const [step, setStep] = useState<Step>('intro');
    const [formData, setFormData] = useState({
        who: '',
        pain: '',
        pleasure: ''
    });

    const { setIdentity } = useHabitStore();

    const handleNext = () => {
        if (step === 'intro') setStep('identity');
        else if (step === 'identity') setStep('pain');
        else if (step === 'pain') setStep('pleasure');
        else if (step === 'pleasure') setStep('review');
    };

    const handleConfirm = () => {
        console.log('Identity Confirmed:', formData);
        setIdentity(formData);
        onClose();
        // Reset or keep? Maybe keep for viewing later.
    };

    const getProgress = () => {
        switch (step) {
            case 'intro': return 0;
            case 'identity': return 25;
            case 'pain': return 50;
            case 'pleasure': return 75;
            case 'review': return 100;
        }
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4"
            >
                <div className="w-full max-w-2xl bg-[#09090b] border border-white/10 rounded-2xl shadow-2xl relative overflow-hidden flex flex-col min-h-[500px]">

                    {/* Top Progress Bar */}
                    <div className="h-1 w-full bg-white/5 relative">
                        <motion.div
                            className={cn(
                                "h-full absolute left-0 top-0 transition-colors duration-500",
                                step === 'identity' ? "bg-neutral-400" :
                                    step === 'pain' ? "bg-red-500" :
                                        step === 'pleasure' ? "bg-cyan-500" :
                                            step === 'review' ? "bg-emerald-500" : "bg-transparent"
                            )}
                            initial={{ width: 0 }}
                            animate={{ width: `${getProgress()}%` }}
                        />
                    </div>

                    {/* Content Container */}
                    <div className="flex-1 p-12 flex flex-col justify-center relative">
                        {/* Background Gradients based on step */}
                        <div className={cn(
                            "absolute inset-0 opacity-20 transition-colors duration-1000 pointer-events-none",
                            step === 'intro' ? "bg-gradient-to-br from-white/5 to-transparent" :
                                step === 'identity' ? "bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-neutral-800/30 to-transparent" :
                                    step === 'pain' ? "bg-[radial-gradient(circle_at_top,_var(--tw-gradient-stops))] from-red-900/20 to-transparent" :
                                        step === 'pleasure' ? "bg-[radial-gradient(circle_at_bottom,_var(--tw-gradient-stops))] from-cyan-900/20 to-transparent" :
                                            "bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-emerald-900/20 to-transparent"
                        )} />

                        <AnimatePresence mode="wait">

                            {/* INTRO STEP */}
                            {step === 'intro' && (
                                <motion.div
                                    key="intro"
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -20 }}
                                    className="text-center space-y-8 relative z-10"
                                >
                                    <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-6 shadow-[0_0_30px_rgba(255,255,255,0.1)]">
                                        <Sparkles className="text-white" size={32} />
                                    </div>
                                    <h2 className="text-4xl font-bold text-white tracking-tight">Diseña tu Sistema</h2>
                                    <p className="text-neutral-400 text-lg max-w-md mx-auto">
                                        La congruencia no es un acto, es una identidad. Define quién eres para saber qué hacer.
                                    </p>
                                    <button
                                        onClick={handleNext}
                                        className="px-8 py-3 bg-white text-black font-bold rounded-full hover:bg-neutral-200 transition-all flex items-center gap-2 mx-auto"
                                    >
                                        Comenzar <ArrowRight size={18} />
                                    </button>
                                </motion.div>
                            )}

                            {/* STEP 1: IDENTITY */}
                            {step === 'identity' && (
                                <motion.div
                                    key="identity"
                                    initial={{ opacity: 0, x: 50 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -50 }}
                                    className="space-y-6 relative z-10"
                                >
                                    <div className="flex items-center gap-3 mb-2">
                                        <User className="text-neutral-400" />
                                        <span className="text-neutral-500 font-bold tracking-widest text-sm uppercase">Paso 1: Identidad</span>
                                    </div>
                                    <h2 className="text-3xl font-bold text-white">¿Quién eres cuando cumples?</h2>

                                    <input
                                        autoFocus
                                        type="text"
                                        value={formData.who}
                                        onChange={(e) => setFormData({ ...formData, who: e.target.value })}
                                        className="w-full bg-transparent border-b-2 border-neutral-700 text-3xl font-medium text-white placeholder-neutral-600 focus:outline-none focus:border-white transition-colors py-4"
                                        placeholder="Ej: Soy un atleta de élite..."
                                    />

                                    <div className="flex justify-end pt-8">
                                        <button
                                            onClick={handleNext}
                                            disabled={!formData.who}
                                            className="px-6 py-2 bg-neutral-800 text-white rounded-lg hover:bg-neutral-700 disabled:opacity-50 transition-all flex items-center gap-2"
                                        >
                                            Siguiente <ArrowRight size={16} />
                                        </button>
                                    </div>
                                </motion.div>
                            )}

                            {/* STEP 2: PAIN */}
                            {step === 'pain' && (
                                <motion.div
                                    key="pain"
                                    initial={{ opacity: 0, x: 50 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -50 }}
                                    className="space-y-6 relative z-10"
                                >
                                    <div className="flex items-center gap-3 mb-2">
                                        <AlertTriangle className="text-red-500" />
                                        <span className="text-red-500/80 font-bold tracking-widest text-sm uppercase">Paso 2: Anti-Visión</span>
                                    </div>
                                    <h2 className="text-3xl font-bold text-white">¿Cuál es el precio de fallarte a ti mismo?</h2>
                                    <p className="text-neutral-500">Define tu peor escenario si no mantienes la congruencia. Sé crudo.</p>

                                    <textarea
                                        autoFocus
                                        value={formData.pain}
                                        onChange={(e) => setFormData({ ...formData, pain: e.target.value })}
                                        className="w-full h-32 bg-red-950/10 border border-red-900/30 rounded-xl p-4 text-xl text-white placeholder-red-900/50 focus:outline-none focus:border-red-500/50 transition-all resize-none"
                                        placeholder="Sentiré que he desperdiciado mi potencial..."
                                    />

                                    <div className="flex justify-end pt-8">
                                        <button
                                            onClick={handleNext}
                                            disabled={!formData.pain}
                                            className="px-6 py-2 bg-red-900/20 text-red-200 border border-red-900/50 rounded-lg hover:bg-red-900/40 disabled:opacity-50 transition-all flex items-center gap-2"
                                        >
                                            Continuar <ArrowRight size={16} />
                                        </button>
                                    </div>
                                </motion.div>
                            )}

                            {/* STEP 3: PLEASURE */}
                            {step === 'pleasure' && (
                                <motion.div
                                    key="pleasure"
                                    initial={{ opacity: 0, x: 50 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -50 }}
                                    className="space-y-6 relative z-10"
                                >
                                    <div className="flex items-center gap-3 mb-2">
                                        <Target className="text-cyan-400" />
                                        <span className="text-cyan-400 font-bold tracking-widest text-sm uppercase">Paso 3: La Visión</span>
                                    </div>
                                    <h2 className="text-3xl font-bold text-white">¿Qué es inevitable si mantienes el ritmo?</h2>
                                    <p className="text-neutral-500">Visualiza el resultado obvio de tu disciplina diaria.</p>

                                    <textarea
                                        autoFocus
                                        value={formData.pleasure}
                                        onChange={(e) => setFormData({ ...formData, pleasure: e.target.value })}
                                        className="w-full h-32 bg-cyan-950/10 border border-cyan-900/30 rounded-xl p-4 text-xl text-white placeholder-cyan-900/50 focus:outline-none focus:border-cyan-500/50 transition-all resize-none"
                                        placeholder="Mi éxito se vuelve una consecuencia matemática..."
                                    />

                                    <div className="flex justify-end pt-8">
                                        <button
                                            onClick={handleNext}
                                            disabled={!formData.pleasure}
                                            className="px-6 py-2 bg-cyan-950/30 text-cyan-200 border border-cyan-900/50 rounded-lg hover:bg-cyan-900/40 disabled:opacity-50 transition-all flex items-center gap-2"
                                        >
                                            Revisar <ArrowRight size={16} />
                                        </button>
                                    </div>
                                </motion.div>
                            )}

                            {/* REVIEW */}
                            {step === 'review' && (
                                <motion.div
                                    key="review"
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    className="space-y-8 relative z-10"
                                >
                                    <div className="text-center">
                                        <h2 className="text-3xl font-bold text-white mb-2">Tu Manifiesto</h2>
                                        <p className="text-neutral-500">Confirma tu nueva realidad.</p>
                                    </div>

                                    <div className="space-y-4">
                                        <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                                            <p className="text-xs font-bold text-neutral-500 uppercase mb-1">Identidad</p>
                                            <p className="text-lg text-white font-medium">"{formData.who}"</p>
                                        </div>
                                        <div className="p-4 rounded-xl bg-red-950/10 border border-red-900/30">
                                            <p className="text-xs font-bold text-red-400/70 uppercase mb-1">Anti-Visión</p>
                                            <p className="text-lg text-red-100/90 font-medium">"{formData.pain}"</p>
                                        </div>
                                        <div className="p-4 rounded-xl bg-cyan-950/10 border border-cyan-900/30">
                                            <p className="text-xs font-bold text-cyan-400/70 uppercase mb-1">Visión</p>
                                            <p className="text-lg text-cyan-100/90 font-medium">"{formData.pleasure}"</p>
                                        </div>
                                    </div>

                                    <div className="flex justify-center pt-4">
                                        <button
                                            onClick={handleConfirm}
                                            className="w-full py-4 bg-emerald-500 text-black font-bold text-lg rounded-xl hover:bg-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.4)] transition-all flex items-center justify-center gap-2"
                                        >
                                            <Check size={20} /> Confirmar Identidad
                                        </button>
                                    </div>
                                </motion.div>
                            )}

                        </AnimatePresence>
                    </div>
                </div>
            </motion.div>
        </AnimatePresence>
    );
}
