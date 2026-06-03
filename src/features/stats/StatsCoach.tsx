import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Brain, RefreshCw, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { AIService } from '../../services/ai';
import { cn } from '../../utils/cn';

interface StatsCoachProps {
    avgCongruence: number;
    activeDays: number;
    totalDays: number;
    streak: number;
    period: string;
    habitStats: { title: string; rate: number; currentStreak: number }[];
    trendUp: boolean;
    bestDow?: { label: string; avg: number | null } | null;
    worstDow?: { label: string; avg: number | null } | null;
}

export function StatsCoach({
    avgCongruence, activeDays, totalDays, streak, period,
    habitStats, trendUp, bestDow, worstDow,
}: StatsCoachProps) {
    const [insight, setInsight] = useState<any | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    const analyze = async () => {
        setIsLoading(true);
        try {
            const context = {
                period,
                avgCongruence,
                activeDays,
                totalDays,
                streak,
                trendDirection: trendUp ? 'improving' : 'declining',
                bestDay: bestDow?.avg != null ? `${bestDow.label} (${bestDow.avg}%)` : null,
                worstDay: worstDow?.avg != null ? `${worstDow.label} (${worstDow.avg}%)` : null,
                habits: habitStats.map(h => ({
                    name: h.title,
                    completionRate: h.rate,
                    currentStreak: h.currentStreak,
                })),
            };

            const result = await AIService.generateInsight(
                habitStats,
                [],
                { type: 'stats_analysis', statsContext: context },
                []
            );
            setInsight(result);
        } catch (e) {
            console.error('Stats coach error', e);
        } finally {
            setIsLoading(false);
        }
    };

    const MoodIcon = insight?.mood === 'positive' ? TrendingUp
        : insight?.mood === 'warning' ? TrendingDown
        : Minus;

    return (
        <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] px-4 py-3 mb-5 flex items-center gap-4 flex-wrap min-h-[48px]">
            {/* Label */}
            <div className="flex items-center gap-2 shrink-0">
                <div className="p-1.5 rounded-lg border" style={{ background: 'rgba(var(--accent-500), 0.10)', borderColor: 'rgba(var(--accent-500), 0.15)' }}>
                    <Brain size={13} style={{ color: 'rgb(var(--accent-400))' }} />
                </div>
                <span className="text-[11px] font-bold text-neutral-500 uppercase tracking-wider">Coach IA</span>
            </div>

            {/* Context pills when no insight */}
            {!insight && !isLoading && habitStats.length > 0 && (
                <div className="flex gap-1.5 flex-wrap flex-1">
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 text-neutral-500 border border-white/5">
                        {avgCongruence}% congruencia
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 text-neutral-500 border border-white/5">
                        {streak}d racha
                    </span>
                    {bestDow?.avg != null && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 text-neutral-500 border border-white/5">
                            Mejor día: {bestDow.label}
                        </span>
                    )}
                </div>
            )}

            {/* Insight result */}
            {insight && (
                <div className="flex items-center gap-3 flex-1 flex-wrap">
                    <div className={cn(
                        "flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-1 rounded-full shrink-0",
                        insight.mood === 'positive' ? "bg-emerald-500/10 text-emerald-400" :
                        insight.mood === 'warning'  ? "bg-amber-500/10 text-amber-500" :
                                                      "bg-blue-500/10 text-blue-400"
                    )}>
                        <MoodIcon size={10} />
                        {insight.mood === 'positive' ? 'Óptimo' : insight.mood === 'warning' ? 'Atención' : 'Estable'}
                    </div>
                    <p className="text-xs text-neutral-300 leading-relaxed flex-1 min-w-0">
                        "{insight.summary}"
                    </p>
                    {insight.actionable_tip && (
                        <p className="w-full text-[10px] text-neutral-500 italic mt-0.5 pl-1">
                            → {insight.actionable_tip}
                        </p>
                    )}
                </div>
            )}

            {/* Button / loading / refresh */}
            <div className="shrink-0 ml-auto">
                <AnimatePresence mode="wait">
                    {!insight && !isLoading && (
                        <motion.button
                            key="btn"
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            whileTap={{ scale: 0.97 }}
                            onClick={analyze}
                            className="py-2 px-4 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all whitespace-nowrap border"
                            style={{
                                background: 'rgba(var(--accent-500), 0.10)',
                                borderColor: 'rgba(var(--accent-500), 0.20)',
                                color: 'rgb(var(--accent-400))',
                            }}
                        >
                            <Sparkles size={12} />
                            Analizar con IA
                        </motion.button>
                    )}
                    {isLoading && (
                        <motion.div key="loading" className="flex items-center gap-2 py-2 px-3">
                            <div className="w-3.5 h-3.5 border-t-2 rounded-full animate-spin shrink-0" style={{ borderColor: 'rgb(var(--accent-400))' }} />
                            <span className="text-xs font-mono animate-pulse" style={{ color: 'rgb(var(--accent-400))' }}>Analizando...</span>
                        </motion.div>
                    )}
                    {insight && !isLoading && (
                        <motion.button
                            key="regen"
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                            onClick={analyze}
                            className="flex items-center gap-1.5 text-xs text-neutral-600 hover:text-neutral-400 transition-colors py-2 px-2"
                        >
                            <RefreshCw size={11} />
                        </motion.button>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}
