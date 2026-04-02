import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Brain, RefreshCw, TrendingDown, TrendingUp, Minus, DollarSign } from 'lucide-react';
import { AIService } from '../../services/ai';
import { cn } from '../../utils/cn';

interface FinanceCoachProps {
    finances: any[];
    config: any;
    savingsGoals: any;
    monthIncome: number;
    monthExpenses: number;
    categoryBreakdown: { name: string; value: number; color: string }[];
    currentMonth: string;
}

export function FinanceCoach({ finances, config, savingsGoals, monthIncome, monthExpenses, categoryBreakdown, currentMonth }: FinanceCoachProps) {
    const [insight, setInsight] = useState<any | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    const netFlow = monthIncome - monthExpenses;
    const budgetUsedPct = config?.monthlyFixedBudget > 0 ? Math.round((monthExpenses / config.monthlyFixedBudget) * 100) : 0;
    const top3 = categoryBreakdown.slice(0, 3);

    const generateInsight = async () => {
        setIsLoading(true);
        try {
            const financeContext = {
                month: currentMonth,
                totalIncome: monthIncome,
                totalExpenses: monthExpenses,
                netFlow,
                budgetUsedPercent: budgetUsedPct,
                monthlyBudget: config?.monthlyFixedBudget || 0,
                topCategories: top3.map(c => ({ name: c.name, amount: c.value })),
                savingsGoalMonthly: savingsGoals?.monthly || 0,
                recentTransactions: finances.slice(-10)
            };

            const result = await AIService.generateInsight(
                [],
                [financeContext],
                { 
                    type: 'finance_analysis',
                    savingsGoals, 
                    config,
                    monthSummary: financeContext
                },
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
        <div className="rounded-2xl bg-[#0a0a0a] border border-white/5 overflow-hidden">
            {/* Header */}
            <div className="flex items-center gap-3 p-5 border-b border-white/5">
                <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/10">
                    <Brain size={18} className="text-emerald-400" />
                </div>
                <div className="flex-1">
                    <h3 className="text-sm font-bold text-white">Coach Financiero IA</h3>
                    <p className="text-xs text-neutral-500">Análisis personalizado de tu mes</p>
                </div>
                {insight && (
                    <button
                        onClick={generateInsight}
                        className="flex items-center gap-1.5 text-xs text-neutral-500 hover:text-emerald-400 transition-colors px-2 py-1 rounded-lg hover:bg-emerald-500/5"
                    >
                        <RefreshCw size={11} /> Nuevo
                    </button>
                )}
            </div>

            {/* Context Preview - always visible */}
            <div className="px-5 pt-4 pb-2 grid grid-cols-3 gap-3">
                <div className="text-center">
                    <p className="text-[10px] text-neutral-500 uppercase tracking-wider mb-0.5">Ingresos</p>
                    <p className="text-sm font-bold font-mono text-emerald-400">€{monthIncome.toLocaleString('de-DE')}</p>
                </div>
                <div className="text-center border-x border-white/5">
                    <p className="text-[10px] text-neutral-500 uppercase tracking-wider mb-0.5">Gastos</p>
                    <p className="text-sm font-bold font-mono text-rose-400">€{monthExpenses.toLocaleString('de-DE')}</p>
                </div>
                <div className="text-center">
                    <p className="text-[10px] text-neutral-500 uppercase tracking-wider mb-0.5">Flujo</p>
                    <p className={cn("text-sm font-bold font-mono", netFlow >= 0 ? "text-white" : "text-rose-400")}>
                        {netFlow >= 0 ? '+' : ''}€{netFlow.toLocaleString('de-DE')}
                    </p>
                </div>
            </div>

            {/* Top categories preview */}
            {top3.length > 0 && (
                <div className="px-5 pb-4">
                    <div className="flex gap-1.5 flex-wrap mt-2">
                        {top3.map((cat, i) => (
                            <span key={i} className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 text-neutral-400 border border-white/5">
                                {cat.name} <span className="text-neutral-300 font-mono">€{cat.value.toLocaleString('de-DE')}</span>
                            </span>
                        ))}
                    </div>
                </div>
            )}

            {/* Coach Action */}
            <div className="px-5 pb-5">
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
                            Analizar este mes con IA
                        </motion.button>
                    )}

                    {isLoading && (
                        <motion.div key="loading" className="flex flex-col items-center gap-3 py-4">
                            <div className="relative w-10 h-10">
                                <div className="absolute inset-0 border-t-2 border-emerald-500 rounded-full animate-spin" />
                                <Brain className="absolute inset-0 m-auto text-white/20 animate-pulse" size={16} />
                            </div>
                            <p className="text-xs font-mono text-emerald-400 animate-pulse">Analizando tus patrones...</p>
                        </motion.div>
                    )}

                    {insight && (
                        <motion.div
                            key="result"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="space-y-3 mt-2"
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

                            <div className="p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/10">
                                <p className="text-xs font-bold text-emerald-400 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                                    <DollarSign size={11} /> Acción concreta
                                </p>
                                <p className="text-xs text-white">{insight.actionable_tip}</p>
                            </div>

                            <div className={cn(
                                "inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full",
                                insight.mood === 'positive' ? "bg-emerald-500/10 text-emerald-400" :
                                    insight.mood === 'warning' ? "bg-amber-500/10 text-amber-500" :
                                        "bg-blue-500/10 text-blue-400"
                            )}>
                                <MoodIcon size={11} />
                                {insight.mood === 'positive' ? 'Finanzas óptimas' : insight.mood === 'warning' ? 'Requiere atención' : 'Situación estable'}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}
