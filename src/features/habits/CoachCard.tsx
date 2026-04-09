import { useState } from 'react';
import { Brain, Sparkles, RefreshCw, Loader2, TrendingUp, Zap } from 'lucide-react';
import { useHabitStore } from './useHabitStore';
import { useFinanceStore } from '../finance/useFinanceStore';
import { AIService, DailyInsight } from '../../services/ai';
import { cn } from '../../utils/cn';
import { toast } from '../../hooks/useToastStore';

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
            toast('Error al generar análisis. Revisa tu conexión.', 'error');
        } finally {
            setIsLoading(false);
        }
    };

    const moodColor = insight?.mood === 'positive'
        ? 'text-emerald-400'
        : insight?.mood === 'warning'
        ? 'text-amber-400'
        : 'text-purple-400';

    return (
        <div className="rounded-2xl bg-white/[0.03] border border-purple-500/20 p-4 transition-all hover:border-purple-500/30">
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-purple-500/10 flex items-center justify-center">
                        <Brain size={14} className="text-purple-400" />
                    </div>
                    <span className="text-sm font-semibold text-purple-300">Coach IA</span>
                </div>
                <button
                    onClick={generate}
                    disabled={isLoading}
                    className={cn(
                        "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all",
                        isLoading
                            ? "bg-purple-500/10 text-purple-400 cursor-not-allowed"
                            : insight
                            ? "bg-white/5 text-neutral-400 hover:bg-purple-500/10 hover:text-purple-300"
                            : "bg-purple-500/15 text-purple-300 hover:bg-purple-500/25"
                    )}
                >
                    {isLoading ? <Loader2 size={11} className="animate-spin" /> : insight ? <RefreshCw size={11} /> : <Sparkles size={11} />}
                    <span>{isLoading ? 'Analizando...' : insight ? 'Regenerar' : 'Analizar hoy'}</span>
                </button>
            </div>
            {!insight && !isLoading && (
                <p className="text-xs text-neutral-600 text-center py-3">
                    Análisis personalizado de tus hábitos y finanzas de hoy
                </p>
            )}
            {isLoading && (
                <div className="flex items-center justify-center py-4 gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-bounce [animation-delay:0ms]" />
                    <div className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-bounce [animation-delay:150ms]" />
                    <div className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-bounce [animation-delay:300ms]" />
                </div>
            )}
            {insight && !isLoading && (
                <div className="space-y-3">
                    <p className={cn("text-sm font-medium leading-snug", moodColor)}>{insight.summary}</p>
                    {insight.insight && (
                        <div className="flex gap-2">
                            <TrendingUp size={13} className="text-neutral-500 shrink-0 mt-0.5" />
                            <p className="text-xs text-neutral-400 leading-relaxed">{insight.insight}</p>
                        </div>
                    )}
                    {insight.actionable_tip && (
                        <div className="flex gap-2 bg-purple-500/5 rounded-lg p-2.5 border border-purple-500/10">
                            <Zap size={12} className="text-purple-400 shrink-0 mt-0.5" />
                            <p className="text-xs text-neutral-300 leading-relaxed">{insight.actionable_tip}</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
