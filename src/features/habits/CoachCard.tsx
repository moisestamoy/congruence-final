import { useState } from 'react';
import { Brain, Sparkles, RefreshCw, Loader2, TrendingUp, Zap, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useHabitStore } from './useHabitStore';
import { useFinanceStore } from '../finance/useFinanceStore';
import { AIService, DailyInsight } from '../../services/ai';
import { cn } from '../../utils/cn';

export function CoachCard() {
    const { habits, manifesto } = useHabitStore();
    const { realExpenses } = useFinanceStore();
    const [insight, setInsight] = useState<DailyInsight | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    const generate = async () => {
        setIsLoading(true);
        try {
            const result = await AIService.generateInsight(habits, realExpenses, manifesto, []);
            setInsight(result);
        } catch (e) {
            console.error('Coach error:', e);
        } finally {
            setIsLoading(false);
        }
    };

    const mood = {
        positive: { text: 'text-emerald-400', bg: 'bg-emerald-500/10',  border: 'border-emerald-500/20' },
        warning:  { text: 'text-amber-400',   bg: 'bg-amber-500/10',    border: 'border-amber-500/20'  },
        neutral:  { text: 'text-violet-400',  bg: 'bg-violet-500/10',   border: 'border-violet-500/20' },
    };
    const moodKey = (insight?.mood === 'positive' || insight?.mood === 'warning') ? insight.mood : 'neutral';
    const moodColors = mood[moodKey];

    return (
        <div className="relative rounded-2xl bg-[#0b0b10] border border-white/[0.07] overflow-hidden">
            {/* Top accent line */}
            <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-violet-500/25 to-transparent" />

            <div className="p-4">
                {/* Header */}
                <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-lg bg-violet-500/10 border border-violet-500/15 flex items-center justify-center">
                            <Brain size={13} className="text-violet-400" />
                        </div>
                        <div>
                            <p className="text-xs font-bold text-white/80 leading-none">Coach IA</p>
                            <p className="text-[9px] font-semibold text-neutral-600 uppercase tracking-widest mt-0.5 leading-none">Análisis Diario</p>
                        </div>
                    </div>

                    <button
                        onClick={generate}
                        disabled={isLoading}
                        className={cn(
                            "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all",
                            isLoading
                                ? "bg-violet-500/10 text-violet-400/50 cursor-not-allowed"
                                : insight
                                ? "bg-white/[0.04] border border-white/[0.06] text-neutral-500 hover:bg-violet-500/10 hover:border-violet-500/20 hover:text-violet-300"
                                : "bg-violet-500/15 border border-violet-500/20 text-violet-300 hover:bg-violet-500/25"
                        )}
                    >
                        {isLoading
                            ? <Loader2 size={11} className="animate-spin" />
                            : insight
                            ? <RefreshCw size={11} />
                            : <Sparkles size={11} />
                        }
                        <span>{isLoading ? 'Analizando...' : insight ? 'Regenerar' : 'Analizar'}</span>
                    </button>
                </div>

                <AnimatePresence mode="wait">
                    {/* Empty state — clickable prompt */}
                    {!insight && !isLoading && (
                        <motion.button
                            key="prompt"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0, transition: { duration: 0.1 } }}
                            onClick={generate}
                            className="w-full flex items-center justify-between py-3 px-3 rounded-xl bg-white/[0.02] border border-white/[0.05] hover:bg-violet-500/[0.04] hover:border-violet-500/15 transition-all group/cta"
                        >
                            <span className="text-xs text-neutral-600 group-hover/cta:text-neutral-400 transition-colors text-left leading-relaxed">
                                Análisis personalizado de hábitos y finanzas
                            </span>
                            <ChevronRight size={13} className="text-neutral-700 group-hover/cta:text-violet-400 transition-colors shrink-0 ml-2" />
                        </motion.button>
                    )}

                    {/* Loading */}
                    {isLoading && (
                        <motion.div
                            key="loading"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="flex items-center justify-center gap-1.5 py-5"
                        >
                            {[0, 0.15, 0.3].map((delay, i) => (
                                <motion.div
                                    key={i}
                                    className="w-1.5 h-1.5 rounded-full bg-violet-400/60"
                                    animate={{ y: [0, -5, 0], opacity: [0.4, 1, 0.4] }}
                                    transition={{ duration: 0.9, repeat: Infinity, delay, ease: "easeInOut" }}
                                />
                            ))}
                        </motion.div>
                    )}

                    {/* Result */}
                    {insight && !isLoading && (
                        <motion.div
                            key="insight"
                            initial={{ opacity: 0, y: 6 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0 }}
                            className="space-y-2.5"
                        >
                            <p className={cn("text-sm font-medium leading-snug", moodColors.text)}>
                                {insight.summary}
                            </p>
                            {insight.insight && (
                                <div className="flex gap-2 items-start">
                                    <TrendingUp size={12} className="text-neutral-600 shrink-0 mt-0.5" />
                                    <p className="text-xs text-neutral-500 leading-relaxed">{insight.insight}</p>
                                </div>
                            )}
                            {insight.actionable_tip && (
                                <div className={cn("flex gap-2 items-start rounded-xl p-2.5 border", moodColors.bg, moodColors.border)}>
                                    <Zap size={11} className={cn("shrink-0 mt-0.5", moodColors.text)} />
                                    <p className="text-xs text-neutral-300 leading-relaxed">{insight.actionable_tip}</p>
                                </div>
                            )}
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}
