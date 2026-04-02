import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Brain, RefreshCw, TrendingDown, TrendingUp, Minus } from 'lucide-react';
import { AIService } from '../../services/ai';
import { cn } from '../../utils/cn';

interface FinanceCoachProps {
    finances: any[];
    config: any;
    savingsGoals: any;
}

export function FinanceCoach({ finances, config, savingsGoals }: FinanceCoachProps) {
    const [insight, setInsight] = useState<any | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    const generateInsight = async () => {
        setIsLoading(true);
        try {
            const result = await AIService.generateInsight(
                [],
                finances,
                { savingsGoals, config },
                []
            );
            setInsight(result);
        } catch (error) {
            console.error('Finance coach error', error);
        } finally {
            setIsLoading(false);
        }
    };

    const MoodIcon = insight?.mood === 'positive' ? TrendingUp : insight?.mood === 'warning' ? TrendingDown : Minus;

    return (
        <div className="rounded-2xl bg-[#0a0a0a] border border-white/5 p-5">
            <div className="flex items-center gap-3 mb-4">
                <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/10">
                    <Brain size={18} className="text-emerald-400" />
                </div>
                <div>
                    <h3 className="text-sm font-bold text-white">Coach Financiero</h3>
                    <p className="text-xs text-neutral-500">Análisis IA de tus gastos y metas</p>
                </div>
            </div>

            <AnimatePresence mode="wait">
                {!insight && !isLoading && (
                    <motion.button
                        key="btn"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        whileTap={{ scale: 0.97 }}
                        onClick={generateInsight}
                        className="w-full py-3 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/15 border border-emerald-500/20 text-emerald-400 text-sm font-semibold flex items-center justify-center gap-2 transition-all"
                    >
                        <Sparkles size={15} />
                        Analizar mis finanzas
                    </motion.button>
                )}

                {isLoading && (
                    <motion.div key="loading" className="flex flex-col items-center gap-3 py-4">
                        <div className="relative w-10 h-10">
                            <div className="absolute inset-0 border-t-2 border-emerald-500 rounded-full animate-spin" />
                            <Brain className="absolute inset-0 m-auto text-white/20 animate-pulse" size={16} />
                        </div>
                        <p className="text-xs font-mono text-emerald-400 animate-pulse">Analizando patrones...</p>
                    </motion.div>
                )}

                {insight && (
                    <motion.div
                        key="result"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="space-y-3"
                    >
                        <div className={cn(
                            "h-0.5 w-full rounded-full bg-gradient-to-r",
                            insight.mood === 'positive' ? "from-emerald-500 to-transparent" :
                                insight.mood === 'warning' ? "from-amber-500 to-transparent" :
                                    "from-blue-500 to-transparent"
                        )} />

                        <p className="text-sm font-medium text-white leading-relaxed">"{insight.summary}"</p>

                        {insight.insight && (
                            <p className="text-xs text-neutral-400 leading-relaxed">{insight.insight}</p>
                        )}

                        <div className="p-3 rounded-xl bg-white/5 border border-white/5">
                            <p className="text-xs font-bold text-emerald-400 uppercase tracking-wider mb-1">Acción concreta</p>
                            <p className="text-xs text-white">{insight.actionable_tip}</p>
                        </div>

                        <div className="flex items-center justify-between">
                            <div className={cn(
                                "flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full",
                                insight.mood === 'positive' ? "bg-emerald-500/10 text-emerald-400" :
                                    insight.mood === 'warning' ? "bg-amber-500/10 text-amber-500" :
                                        "bg-blue-500/10 text-blue-400"
                            )}>
                                <MoodIcon size={11} />
                                {insight.mood === 'positive' ? 'Óptimo' : insight.mood === 'warning' ? 'Atención' : 'Estable'}
                            </div>
                            <button
                                onClick={generateInsight}
                                className="flex items-center gap-1.5 text-xs text-neutral-500 hover:text-white transition-colors"
                            >
                                <RefreshCw size={11} /> Regenerar
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
