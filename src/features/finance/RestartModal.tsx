import { useState } from 'react';
import { X, RotateCcw, CalendarClock, AlertTriangle, Save, Trash2 } from 'lucide-react';
import { useFinanceStore } from './useFinanceStore';
import { cn } from '../../utils/cn';
import { format } from 'date-fns';
import { es, enUS, pt } from 'date-fns/locale';
import { useTranslation } from 'react-i18next';

interface RestartModalProps {
    onClose: () => void;
}

export function RestartModal({ onClose }: RestartModalProps) {
    const { i18n } = useTranslation();
    const { config, resetAll, setBudgetFromMonth } = useFinanceStore();
    const [mode, setMode] = useState<'new-cycle' | 'hard-reset'>('new-cycle');

    // New Cycle State
    const now = new Date();
    const [selectedYear, setSelectedYear] = useState(now.getFullYear().toString());
    const [selectedMonth, setSelectedMonth] = useState((now.getMonth() + 1).toString());
    const [newBudget, setNewBudget] = useState(config.monthlyFixedBudget.toString());
    const [clearFuture, setClearFuture] = useState(false);
    const [initialBalance, setInitialBalance] = useState('0');
    const [hardResetBalance, setHardResetBalance] = useState('0');

    const dateLocale = i18n.language === 'es' ? es : i18n.language === 'pt' ? pt : enUS;

    const handleApplyCycle = () => {
        const amount = Number(newBudget);
        if (!isNaN(amount) && amount > 0) {
            const yearMonth = `${selectedYear}-${selectedMonth.padStart(2, '0')}`;
            const balance = Number(initialBalance) || undefined;
            setBudgetFromMonth(yearMonth, amount, clearFuture, balance);
            onClose();
        }
    };

    const handleHardReset = () => {
        if (window.confirm('¿Estás SEGURO de que quieres eliminar todo tu historial financiero? Esta acción no se puede deshacer.')) {
            const balance = Number(hardResetBalance) || 0;
            resetAll(balance);
            onClose();
        }
    };

    const months = Array.from({ length: 12 }, (_, i) => {
        const date = new Date(2020, i, 1);
        return { value: (i + 1).toString(), label: format(date, 'MMMM', { locale: dateLocale }) };
    });

    const years = Array.from({ length: 5 }, (_, i) => (now.getFullYear() - 2 + i).toString());

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <div className="w-full max-w-xl bg-[#0a0a0a] border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="flex justify-between items-center p-6 border-b border-white/5 bg-[#0a0a0a]">
                    <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-3">
                        <span className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400">
                            <RotateCcw size={20} />
                        </span>
                        Opciones de Reinicio
                    </h2>
                    <button onClick={onClose} className="p-2 text-neutral-400 hover:text-white hover:bg-white/5 rounded-full transition-colors">
                        <X size={20} />
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-white/5 bg-[#050505] p-2 gap-2">
                    <button
                        onClick={() => setMode('new-cycle')}
                        className={cn(
                            "flex-1 py-3 px-4 rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2",
                            mode === 'new-cycle' ? "text-indigo-400 bg-indigo-500/10 border border-indigo-500/20" : "text-neutral-500 hover:text-neutral-300 hover:bg-white/[0.02] border border-transparent"
                        )}
                    >
                        <CalendarClock size={16} />
                        Nuevo Ciclo / Presupuesto
                    </button>
                    <button
                        onClick={() => setMode('hard-reset')}
                        className={cn(
                            "flex-1 py-3 px-4 rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2",
                            mode === 'hard-reset' ? "text-rose-400 bg-rose-500/10 border border-rose-500/20" : "text-neutral-500 hover:text-neutral-300 hover:bg-white/[0.02] border border-transparent"
                        )}
                    >
                        <AlertTriangle size={16} />
                        Borrado Total
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 md:p-8 overflow-y-auto custom-scrollbar">
                    {mode === 'new-cycle' ? (
                        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <div className="p-4 rounded-xl bg-indigo-950/10 border border-indigo-500/20 relative overflow-hidden">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
                                <h3 className="text-sm font-bold text-indigo-300 mb-1">Iniciar un nuevo ciclo</h3>
                                <p className="text-xs text-neutral-400 leading-relaxed">
                                    Establece un nuevo presupuesto a partir de un mes específico <b>sin alterar la configuración de los meses anteriores</b>. 
                                </p>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-neutral-500 uppercase tracking-widest">Mes de Inicio</label>
                                    <select
                                        value={selectedMonth}
                                        onChange={e => setSelectedMonth(e.target.value)}
                                        className="w-full bg-[#050505] border border-white/10 rounded-xl py-3 px-4 text-sm font-bold text-white focus:outline-none focus:border-indigo-500 transition-colors capitalize"
                                    >
                                        {months.map(m => (
                                            <option key={m.value} value={m.value}>{m.label}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-neutral-500 uppercase tracking-widest">Año</label>
                                    <select
                                        value={selectedYear}
                                        onChange={e => setSelectedYear(e.target.value)}
                                        className="w-full bg-[#050505] border border-white/10 rounded-xl py-3 px-4 text-sm font-bold text-white focus:outline-none focus:border-indigo-500 transition-colors"
                                    >
                                        {years.map(y => (
                                            <option key={y} value={y}>{y}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-bold text-indigo-400 uppercase tracking-widest">Nuevo Presupuesto Mensual</label>
                                <div className="relative">
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-500 font-mono text-lg">€</span>
                                    <input
                                        type="number"
                                        value={newBudget}
                                        onChange={(e) => setNewBudget(e.target.value)}
                                        className="w-full bg-[#050505] border border-white/10 rounded-xl py-4 pl-10 pr-4 text-xl font-mono font-bold text-white focus:outline-none focus:border-indigo-500 transition-colors placeholder-neutral-700"
                                        placeholder="1500"
                                    />
                                </div>
                                <p className="text-[10px] text-neutral-500">
                                    ~€{Math.round(Number(newBudget || 0) / 30)} por día
                                </p>
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-bold text-indigo-400 uppercase tracking-widest">Balance Inicial</label>
                                <div className="relative">
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-500 font-mono text-lg">€</span>
                                    <input
                                        type="number"
                                        value={initialBalance}
                                        onChange={(e) => setInitialBalance(e.target.value)}
                                        className="w-full bg-[#050505] border border-white/10 rounded-xl py-4 pl-10 pr-4 text-xl font-mono font-bold text-white focus:outline-none focus:border-indigo-500 transition-colors placeholder-neutral-700"
                                        placeholder="0"
                                    />
                                </div>
                                <p className="text-[10px] text-neutral-500">
                                    Dinero disponible al inicio del ciclo (ahorros, efectivo, etc.)
                                </p>
                            </div>

                            <label className="flex items-start gap-3 p-4 rounded-xl border border-white/5 hover:bg-white/[0.02] transition-colors cursor-pointer group">
                                <div className="mt-0.5 relative flex items-center justify-center">
                                    <input 
                                        type="checkbox" 
                                        checked={clearFuture}
                                        onChange={e => setClearFuture(e.target.checked)}
                                        className="peer sr-only" 
                                    />
                                    <div className="w-5 h-5 rounded border border-neutral-600 peer-checked:bg-rose-500 peer-checked:border-rose-500 transition-all flex items-center justify-center">
                                        {clearFuture && <X size={14} className="text-white" />}
                                    </div>
                                </div>
                                <div>
                                    <span className="text-sm font-bold text-neutral-300 block mb-0.5 group-hover:text-white transition-colors">Limpiar datos futuros</span>
                                    <span className="text-xs text-neutral-500">
                                        Si activas esta opción, se borrarán los gastos reales y ajustes manuales a partir del mes seleccionado en adelante. Tus gastos e ingresos recurrentes se mantendrán.
                                    </span>
                                </div>
                            </label>

                        </div>
                    ) : (
                        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <div className="p-6 rounded-xl bg-rose-950/10 border border-rose-500/20 text-center flex flex-col items-center">
                                <div className="w-16 h-16 rounded-full bg-rose-500/10 text-rose-500 flex items-center justify-center mb-4">
                                    <Trash2 size={32} />
                                </div>
                                <h3 className="text-lg font-bold text-rose-400 mb-2">Eliminar Todo el Historial</h3>
                                <p className="text-sm text-neutral-400 mb-4 max-w-sm mx-auto">
                                    Esta acción eliminará de forma <b>permanente</b> absolutamente todas las transacciones, metas, ingresos y configuraciones registradas hasta ahora. Volverás a cero.
                                </p>

                                <div className="w-full max-w-xs mx-auto mb-6 space-y-2">
                                    <label className="text-xs font-bold text-rose-400 uppercase tracking-widest">Balance Inicial</label>
                                    <div className="relative">
                                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-500 font-mono text-lg">€</span>
                                        <input
                                            type="number"
                                            value={hardResetBalance}
                                            onChange={(e) => setHardResetBalance(e.target.value)}
                                            className="w-full bg-[#050505] border border-white/10 rounded-xl py-3 pl-10 pr-4 text-lg font-mono font-bold text-white focus:outline-none focus:border-rose-500 transition-colors placeholder-neutral-700"
                                            placeholder="0"
                                        />
                                    </div>
                                    <p className="text-[10px] text-neutral-500">
                                        Dinero con el que empezarás de nuevo
                                    </p>
                                </div>

                                <button
                                    onClick={handleHardReset}
                                    className="px-6 py-3 rounded-xl bg-rose-500 hover:bg-rose-600 text-white font-bold uppercase tracking-widest text-xs transition-colors shadow-lg shadow-rose-500/20"
                                >
                                    Sí, borrar todo
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                {mode === 'new-cycle' && (
                    <div className="p-6 border-t border-white/5 bg-[#0a0a0a] flex justify-end gap-3 filter backdrop-blur-md">
                        <button
                            onClick={onClose}
                            className="px-6 py-3 rounded-xl text-xs font-bold uppercase tracking-wider text-neutral-400 hover:bg-white/5 transition-colors"
                        >
                            Cancelar
                        </button>
                        <button
                            onClick={handleApplyCycle}
                            className={cn(
                                "px-8 py-3 rounded-xl text-xs font-bold uppercase tracking-wider text-black transition-all transform active:scale-95 flex items-center gap-2 shadow-lg bg-indigo-500 hover:bg-indigo-400 shadow-indigo-500/20"
                            )}
                        >
                            <Save size={16} />
                            Guardar Cambios
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
