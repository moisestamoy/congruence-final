import { motion } from 'framer-motion';

interface MomentumPanelProps {
    currentLevel: string;
    nextLevel: string;
    streak: number;
    congruence: number;
}

export function MomentumPanel({ currentLevel, nextLevel, streak, congruence }: MomentumPanelProps) {
    return (
        <div className="w-full max-w-md mx-auto mt-8 p-6 rounded-3xl bg-[#0a0a0a] border border-white/10">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <div className="p-2 bg-white/[0.05] rounded-full">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-neutral-400">
                            <circle cx="12" cy="12" r="10" />
                            <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" />
                        </svg>
                    </div>
                    <h3 className="font-semibold text-lg text-white">Camino al siguiente nivel</h3>
                </div>
                <span className="text-xs font-medium px-2 py-1 bg-white/[0.05] text-neutral-300 rounded-full">
                    {currentLevel}
                </span>
            </div>

            <p className="text-sm text-neutral-500 mb-6">
                Ve qué te falta para subir de etapa.
            </p>

            <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-white/[0.04] p-4 rounded-xl border border-white/[0.06]">
                    <span className="text-xs text-neutral-600 uppercase block mb-1">Nivel Actual</span>
                    <span className="font-bold text-white">{currentLevel}</span>
                </div>
                <div className="bg-white/[0.04] p-4 rounded-xl border border-white/[0.06] opacity-50">
                    <span className="text-xs text-neutral-600 uppercase block mb-1">Siguiente Nivel</span>
                    <span className="font-bold text-indigo-400">{nextLevel}</span>
                </div>
            </div>

            <div className="mb-2 flex items-center gap-2 text-amber-400 font-medium">
                <span>⚡</span>
                <span className="text-sm">Semanas consecutivas: {streak}</span>
            </div>

            <div className="h-1.5 w-full bg-white/[0.06] rounded-full overflow-hidden mb-4">
                <motion.div
                    className="h-full bg-indigo-500 rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min(100, congruence)}%` }}
                    transition={{ duration: 1 }}
                />
            </div>

            <div className="text-sm">
                <div className="flex items-center gap-2 mb-1">
                    <span className="text-indigo-400">↗</span>
                    <span className="font-medium text-neutral-300">
                        Te faltan {2 - streak > 0 ? 2 - streak : 0} semanas congruentes para llegar a {nextLevel}.
                    </span>
                </div>
                <p className="text-xs text-neutral-600 ml-6">
                    Para que esta semana cuente, necesitas llegar al 80% de congruencia.
                </p>
            </div>
        </div>
    );
}
