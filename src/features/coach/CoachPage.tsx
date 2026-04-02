import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Brain, RefreshCw } from 'lucide-react';
import { useFinanceStore } from '../../features/finance/useFinanceStore';
import { useHabitStore } from '../../features/habits/useHabitStore';
import { useHolisticStore } from '../../features/stats/useHolisticStore';
import { DailyInsight, AIService } from '../../services/ai';
import { cn } from '../../utils/cn';

export default function CoachPage() {
    const { habits, manifesto } = useHabitStore();
    const { realExpenses } = useFinanceStore();
    const { checkIns } = useHolisticStore();
    const [insight, setInsight] = useState<DailyInsight | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    const generateInsight = async () => {
        setIsLoading(true);
        try {
            const result = await AIService.generateInsight(
                habits,
                realExpenses,
                manifesto,
                checkIns.slice(-3)
            );
            setInsight(result);
        } catch (error) {
            console.error("Failed to generate insight", error);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#050505] text-white font-sans selection:bg-purple-500/30 pb-24 relative overflow-hidden">
            {/* BACKGROUND AMBIENCE */}
            <div className="fixed inset-0 pointer-events-none">
                <div className="absolute top-[-20%] left-[20%] w-[60%] h-[60%] bg-purple-500/5 rounded-full blur-[150px]" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-500/5 rounded-full blur-[120px]" />
            </div>

            <div className="w-full max-w-4xl mx-auto p-4 md:p-8 relative z-10">
                {/* Header */}
                <header className="mb-12 text-center">
                    <div className="inline-flex items-center justify-center p-3 bg-white/5 rounded-2xl mb-6 shadow-2xl border border-white/5">
                        <Brain className="text-purple-400" size={32} />
                    </div>
                    <h1 className="text-4xl md:text-5xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white via-purple-200 to-white mb-4">
                        Tu Coach Personal
                    </h1>
                    <p className="text-neutral-400 max-w-lg mx-auto">
                        Analizo tus hábitos y finanzas para darte claridad estoica y pasos accionables.
                    </p>
                </header>

                {/* Main Action Area */}
                <div className="flex flex-col items-center gap-8">
                    {!insight && !isLoading && (
                        <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={generateInsight}
                            className="group relative px-8 py-4 bg-white text-black rounded-full font-bold text-lg shadow-[0_0_40px_-10px_rgba(255,255,255,0.3)] hover:shadow-[0_0_60px_-10px_rgba(168,85,247,0.5)] transition-all overflow-hidden"
                        >
                            <span className="relative z-10 flex items-center gap-2">
                                <Sparkles size={20} className="text-purple-600" />
                                Generar Análisis Diario
                            </span>
                            <div className="absolute inset-0 bg-gradient-to-r from-purple-100 to-blue-100 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </motion.button>
                    )}

                    {/* Loading State */}
                    {isLoading && (
                        <div className="flex flex-col items-center gap-4">
                            <div className="relative w-16 h-16">
                                <div className="absolute inset-0 border-t-2 border-purple-500 rounded-full animate-spin" />
                                <div className="absolute inset-2 border-t-2 border-blue-500 rounded-full animate-spin reverse" />
                                <Brain className="absolute inset-0 m-auto text-white/20 animate-pulse" size={24} />
                            </div>
                            <p className="text-sm font-mono text-purple-400 animate-pulse">Analizando patrones...</p>
                        </div>
                    )}

                    {/* Result Card */}
                    <AnimatePresence>
                        {insight && (
                            <motion.div
                                initial={{ opacity: 0, y: 20, scale: 0.95 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.9 }}
                                className="w-full bg-[#0a0a0a]/80 backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-2xl relative overflow-hidden"
                            >
                                {/* Glow Effect based on mood */}
                                <div className={cn(
                                    "absolute top-0 left-0 w-full h-1 bg-gradient-to-r",
                                    insight.mood === 'positive' ? "from-emerald-500 via-green-500 to-transparent" :
                                        insight.mood === 'warning' ? "from-amber-500 via-orange-500 to-transparent" :
                                            "from-blue-500 via-purple-500 to-transparent"
                                )} />

                                <div className="grid gap-8 md:grid-cols-[2fr_1fr]">
                                    <div className="space-y-6">
                                        <div>
                                            <h3 className="text-xs font-bold text-neutral-500 uppercase tracking-widest mb-2">Resumen Estoico</h3>
                                            <p className="text-xl md:text-2xl font-medium text-white leading-relaxed">
                                                "{insight.summary}"
                                            </p>
                                        </div>

                                        {insight.insight && (
                                            <div className="p-4 rounded-xl bg-purple-500/5 border border-purple-500/10">
                                                <h3 className="text-xs font-bold text-purple-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                                                    <Brain className="w-4 h-4" /> Análisis
                                                </h3>
                                                <p className="text-neutral-300 text-sm leading-relaxed">
                                                    {insight.insight}
                                                </p>
                                            </div>
                                        )}

                                        <div className="p-4 rounded-xl bg-white/5 border border-white/5">
                                            <h3 className="text-xs font-bold text-purple-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                                                <TargetIcon className="w-4 h-4" /> Misión de Hoy
                                            </h3>
                                            <p className="text-white font-medium">
                                                {insight.actionable_tip}
                                            </p>
                                        </div>

                                        {insight.score_context && (
                                            <p className="text-xs text-neutral-500 italic">{insight.score_context}</p>
                                        )}
                                    </div>

                                    <div className="flex flex-col gap-4 border-l border-white/5 pl-8 md:pl-8">
                                        <div className="flex items-center justify-between text-sm text-neutral-400">
                                            <span>Estado</span>
                                            <span className={cn(
                                                "font-bold uppercase text-[10px] px-2 py-1 rounded-full",
                                                insight.mood === 'positive' ? "bg-emerald-500/10 text-emerald-400" :
                                                    insight.mood === 'warning' ? "bg-amber-500/10 text-amber-500" :
                                                        "bg-blue-500/10 text-blue-400"
                                            )}>
                                                {insight.mood === 'positive' ? 'Óptimo' : insight.mood === 'warning' ? 'Atención' : 'Estable'}
                                            </span>
                                        </div>

                                        <button
                                            onClick={generateInsight}
                                            className="mt-auto flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors text-xs font-bold uppercase tracking-wider text-neutral-300"
                                        >
                                            <RefreshCw size={14} /> Regenerar
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

function TargetIcon({ className }: { className?: string }) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
            <circle cx="12" cy="12" r="10" />
            <circle cx="12" cy="12" r="6" />
            <circle cx="12" cy="12" r="2" />
        </svg>
    )
}
