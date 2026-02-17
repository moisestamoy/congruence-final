import { useState } from 'react';
import { X, Target, Wallet, TrendingUp, Trash2 } from 'lucide-react';
import { useFinanceStore } from './useFinanceStore';
// import { cn } from '../../utils/cn';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface SavingsGoalsModalProps {
    onClose: () => void;
}

export function SavingsGoalsModal({ onClose }: SavingsGoalsModalProps) {
    const { savingsGoals, savingsEntries, setSavingsGoal, addSavingsEntry, deleteSavingsEntry } = useFinanceStore();
    const [amount, setAmount] = useState('');
    const [note, setNote] = useState('');

    // Calculate Progress
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth();

    const annualSaved = savingsEntries
        .filter(e => new Date(e.date).getFullYear() === currentYear)
        .reduce((sum, e) => sum + e.amount, 0);

    const monthlySaved = savingsEntries
        .filter(e => {
            const d = new Date(e.date);
            return d.getFullYear() === currentYear && d.getMonth() === currentMonth;
        })
        .reduce((sum, e) => sum + e.amount, 0);

    const annualProgress = Math.min((annualSaved / savingsGoals.annual) * 100, 100);
    const monthlyProgress = Math.min((monthlySaved / savingsGoals.monthly) * 100, 100);

    const handleAddSavings = () => {
        const val = Number(amount);
        if (val > 0) {
            addSavingsEntry(val, note);
            setAmount('');
            setNote('');
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <div className="bg-[#0a0a0a] border border-white/10 rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">

                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-white/5">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-emerald-500/10 rounded-xl">
                            <Target className="text-emerald-500" size={24} />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-white tracking-tight">Metas de Ahorro</h2>
                            <p className="text-sm text-neutral-500">Construye tu patrimonio</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full transition-colors text-neutral-400 hover:text-white">
                        <X size={20} />
                    </button>
                </div>

                <div className="p-8 space-y-10">

                    {/* Progress Rings Section */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {/* Annual Goal */}
                        <div className="bg-[#111] rounded-2xl p-6 border border-white/5 flex flex-col items-center relative overflow-hidden group">
                            <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity">
                                <input
                                    type="number"
                                    className="bg-black/50 border border-white/10 rounded px-2 py-1 text-xs text-right w-24 text-white focus:outline-none focus:border-emerald-500"
                                    value={savingsGoals.annual}
                                    onChange={(e) => setSavingsGoal('annual', Number(e.target.value))}
                                />
                                <span className="block text-[10px] text-neutral-500 text-right mt-1">Editar Meta</span>
                            </div>

                            <div className="relative w-32 h-32 mb-4">
                                <svg className="w-full h-full transform -rotate-90">
                                    <circle cx="64" cy="64" r="58" stroke="#333" strokeWidth="8" fill="transparent" />
                                    <circle cx="64" cy="64" r="58" stroke="#10b981" strokeWidth="8" fill="transparent"
                                        strokeDasharray={364}
                                        strokeDashoffset={364 - (364 * annualProgress) / 100}
                                        className="transition-all duration-1000 ease-out"
                                    />
                                </svg>
                                <div className="absolute inset-0 flex items-center justify-center flex-col">
                                    <span className="text-2xl font-bold text-white">{Math.round(annualProgress)}%</span>
                                </div>
                            </div>
                            <h3 className="text-neutral-400 font-bold text-sm uppercase tracking-wider mb-1">Anual</h3>
                            <p className="text-emerald-400 font-mono font-medium">
                                {annualSaved.toLocaleString()} / {savingsGoals.annual.toLocaleString()} €
                            </p>
                        </div>

                        {/* Monthly Goal */}
                        <div className="bg-[#111] rounded-2xl p-6 border border-white/5 flex flex-col items-center relative overflow-hidden group">
                            <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity">
                                <input
                                    type="number"
                                    className="bg-black/50 border border-white/10 rounded px-2 py-1 text-xs text-right w-24 text-white focus:outline-none focus:border-blue-500"
                                    value={savingsGoals.monthly}
                                    onChange={(e) => setSavingsGoal('monthly', Number(e.target.value))}
                                />
                                <span className="block text-[10px] text-neutral-500 text-right mt-1">Editar Meta</span>
                            </div>

                            <div className="relative w-32 h-32 mb-4">
                                <svg className="w-full h-full transform -rotate-90">
                                    <circle cx="64" cy="64" r="58" stroke="#333" strokeWidth="8" fill="transparent" />
                                    <circle cx="64" cy="64" r="58" stroke="#3b82f6" strokeWidth="8" fill="transparent"
                                        strokeDasharray={364}
                                        strokeDashoffset={364 - (364 * monthlyProgress) / 100}
                                        className="transition-all duration-1000 ease-out"
                                    />
                                </svg>
                                <div className="absolute inset-0 flex items-center justify-center flex-col">
                                    <span className="text-2xl font-bold text-white">{Math.round(monthlyProgress)}%</span>
                                </div>
                            </div>
                            <h3 className="text-neutral-400 font-bold text-sm uppercase tracking-wider mb-1">Mensual</h3>
                            <p className="text-blue-400 font-mono font-medium">
                                {monthlySaved.toLocaleString()} / {savingsGoals.monthly.toLocaleString()} €
                            </p>
                        </div>
                    </div>

                    {/* Add Savings Form */}
                    <div className="bg-[#111] dark:bg-[#111] p-6 rounded-2xl border border-white/5">
                        <h3 className="text-white font-bold mb-4 flex items-center gap-2">
                            <Wallet size={18} className="text-emerald-500" />
                            Registrar Ahorro
                        </h3>
                        <div className="flex gap-4">
                            <div className="flex-1">
                                <input
                                    type="number"
                                    placeholder="0.00"
                                    className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-emerald-500 font-mono text-lg"
                                    value={amount}
                                    onChange={(e) => setAmount(e.target.value)}
                                />
                            </div>
                            <div className="flex-[2]">
                                <input
                                    type="text"
                                    placeholder="Nota (ej: Bono, Ahorro extra...)"
                                    className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-emerald-500"
                                    value={note}
                                    onChange={(e) => setNote(e.target.value)}
                                />
                            </div>
                            <button
                                onClick={handleAddSavings}
                                disabled={!amount}
                                className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-6 py-3 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Guardar
                            </button>
                        </div>
                    </div>

                    {/* Recent History */}
                    <div>
                        <h3 className="text-neutral-400 font-bold text-sm uppercase tracking-wider mb-4 flex items-center gap-2">
                            <TrendingUp size={16} />
                            Historial Reciente
                        </h3>
                        <div className="space-y-2">
                            {savingsEntries.slice(0, 5).map(entry => (
                                <div key={entry.id} className="flex items-center justify-between p-4 bg-[#111] rounded-xl border border-white/5 group">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-full bg-emerald-900/20 flex items-center justify-center text-emerald-500 font-bold">
                                            $
                                        </div>
                                        <div>
                                            <p className="text-white font-medium">{entry.note || 'Ahorro'}</p>
                                            <p className="text-xs text-neutral-500 capitalize">{format(new Date(entry.date), 'dd MMMM yyyy', { locale: es })}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <span className="text-emerald-400 font-bold font-mono">+ {entry.amount.toLocaleString()} €</span>
                                        <button
                                            onClick={() => deleteSavingsEntry(entry.id)}
                                            className="text-neutral-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all p-2"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                            {savingsEntries.length === 0 && (
                                <p className="text-neutral-600 text-center py-4 text-sm italic">No hay ahorros registrados aún.</p>
                            )}
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
}
