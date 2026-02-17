import { useState } from 'react';
import { X, Calculator, PieChart, Save, AlertCircle } from 'lucide-react';
import { useFinanceStore } from './useFinanceStore';
import { cn } from '../../utils/cn';

interface BudgetModalProps {
    onClose: () => void;
}

const PREDEFINED_CATEGORIES = [
    'Supermercado', 'Comida', 'Transporte', 'Ocio', 'Salud', 'Alquiler', 'Educación', 'Servicios', 'Otros'
];

export function BudgetModal({ onClose }: BudgetModalProps) {
    const { config, setMonthlyDailyBudget, categoryBudgets, setCategoryBudget } = useFinanceStore();
    const [activeTab, setActiveTab] = useState<'daily' | 'categories'>('daily');

    // Daily Budget State
    const [monthlyBudget, setMonthlyBudget] = useState(config.monthlyFixedBudget.toString());
    const dailyAmount = Math.round(Number(monthlyBudget) / 30); // Approx

    // Category Budget State
    const [localCatBudgets, setLocalCatBudgets] = useState(categoryBudgets);

    const handleSaveDaily = () => {
        const amount = Number(monthlyBudget);
        if (!isNaN(amount) && amount > 0) {
            setMonthlyDailyBudget(new Date(), amount);
            onClose();
        }
    };

    const handleSaveCategories = () => {
        Object.entries(localCatBudgets).forEach(([cat, amount]) => {
            setCategoryBudget(cat, amount);
        });
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <div className="w-full max-w-2xl bg-[#0a0a0a] border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">

                {/* Header */}
                <div className="flex justify-between items-center p-6 border-b border-white/5 bg-[#0a0a0a]">
                    <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-3">
                        <span className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400">
                            <Calculator size={20} />
                        </span>
                        Configuración de Presupuesto
                    </h2>
                    <button onClick={onClose} className="p-2 text-neutral-400 hover:text-white hover:bg-white/5 rounded-full transition-colors">
                        <X size={20} />
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-white/5 bg-[#050505]">
                    <button
                        onClick={() => setActiveTab('daily')}
                        className={cn(
                            "flex-1 py-4 text-sm font-bold uppercase tracking-wider transition-all relative",
                            activeTab === 'daily' ? "text-cyan-400 bg-cyan-500/5" : "text-neutral-500 hover:text-neutral-300 hover:bg-white/[0.02]"
                        )}
                    >
                        Gastos Diarios (Variable)
                        {activeTab === 'daily' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-cyan-500 shadow-[0_0_10px_#06b6d4]" />}
                    </button>
                    <button
                        onClick={() => setActiveTab('categories')}
                        className={cn(
                            "flex-1 py-4 text-sm font-bold uppercase tracking-wider transition-all relative",
                            activeTab === 'categories' ? "text-indigo-400 bg-indigo-500/5" : "text-neutral-500 hover:text-neutral-300 hover:bg-white/[0.02]"
                        )}
                    >
                        Por Categorías
                        {activeTab === 'categories' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-500 shadow-[0_0_10px_#6366f1]" />}
                    </button>
                </div>

                {/* Content */}
                <div className="p-8 overflow-y-auto custom-scrollbar">
                    {activeTab === 'daily' ? (
                        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <div className="p-6 rounded-xl bg-cyan-950/10 border border-cyan-500/20 relative overflow-hidden">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
                                <h3 className="text-lg font-bold text-white mb-2">Presupuesto Global Mensual</h3>
                                <p className="text-sm text-neutral-400 mb-6 max-w-md">
                                    Este monto se dividirá automáticamente entre los días del mes para darte un límite diario "Seguro para Gastar".
                                </p>

                                <div className="space-y-4">
                                    <label className="text-xs font-bold text-cyan-500 uppercase tracking-widest">Total Mensual</label>
                                    <div className="relative">
                                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-500 font-mono text-lg">€</span>
                                        <input
                                            type="number"
                                            value={monthlyBudget}
                                            onChange={(e) => setMonthlyBudget(e.target.value)}
                                            className="w-full bg-[#050505] border border-white/10 rounded-xl py-4 pl-10 pr-4 text-2xl font-mono font-bold text-white focus:outline-none focus:border-cyan-500 transition-colors placeholder-neutral-700"
                                            placeholder="1500"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center justify-between p-6 rounded-xl bg-[#050505] border border-white/5">
                                <div className="flex flex-col">
                                    <span className="text-xs font-bold text-neutral-500 uppercase tracking-widest mb-1">Resultado: Límite Diario</span>
                                    <span className="text-3xl font-bold font-mono text-white">~€{dailyAmount}/día</span>
                                </div>
                                <div className="p-3 bg-white/5 rounded-full text-neutral-400">
                                    <Calculator size={24} />
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <div className="flex items-center gap-3 mb-4 p-4 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-sm">
                                <AlertCircle size={18} />
                                <span>Define límites mensuales para categorías específicas. Te avisaremos si te acercas al límite.</span>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {PREDEFINED_CATEGORIES.map(cat => (
                                    <div key={cat} className="p-4 rounded-xl bg-[#050505] border border-white/5 hover:border-white/10 transition-colors group">
                                        <div className="flex justify-between items-center mb-2">
                                            <span className="font-bold text-white text-sm">{cat}</span>
                                            <PieChart size={14} className="text-neutral-600 group-hover:text-indigo-400 transition-colors" />
                                        </div>
                                        <div className="relative">
                                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-600 font-mono text-xs">€</span>
                                            <input
                                                type="number"
                                                value={localCatBudgets[cat] || ''}
                                                onChange={(e) => setLocalCatBudgets(prev => ({ ...prev, [cat]: Number(e.target.value) }))}
                                                className="w-full bg-[#0a0a0a] border border-white/10 rounded-lg py-2 pl-7 pr-3 text-sm font-mono font-bold text-white focus:outline-none focus:border-indigo-500 transition-colors placeholder-neutral-800"
                                                placeholder="Sin límite"
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-white/5 bg-[#0a0a0a] flex justify-end gap-3 filter backdrop-blur-md">
                    <button
                        onClick={onClose}
                        className="px-6 py-3 rounded-xl text-xs font-bold uppercase tracking-wider text-neutral-400 hover:bg-white/5 transition-colors"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={activeTab === 'daily' ? handleSaveDaily : handleSaveCategories}
                        className={cn(
                            "px-8 py-3 rounded-xl text-xs font-bold uppercase tracking-wider text-black transition-all transform active:scale-95 flex items-center gap-2 shadow-lg",
                            activeTab === 'daily'
                                ? "bg-cyan-500 hover:bg-cyan-400 shadow-cyan-500/20"
                                : "bg-indigo-500 hover:bg-indigo-400 shadow-indigo-500/20"
                        )}
                    >
                        <Save size={16} />
                        Guardar {activeTab === 'daily' ? 'Presupuesto' : 'Límites'}
                    </button>
                </div>
            </div>
        </div>
    );
}
