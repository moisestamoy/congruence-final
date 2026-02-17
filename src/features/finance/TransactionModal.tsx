
import { X, Check } from 'lucide-react';
import { useState } from 'react';
import { cn } from '../../utils/cn';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

interface TransactionModalProps {
    isOpen: boolean;
    onClose: () => void;
    type: 'income' | 'expense';
    date: string; // YYYY-MM-DD
    initialData?: { amount: number; category: string; description?: string };
    onSave: (amount: number, category: string, description: string) => void;
    onDelete?: () => void;
}

const INCOME_CATEGORIES = [
    '💰 Salario',
    '🤝 Comisiones',
    '🏦 Préstamo',
    '📈 Inversiones',
    '🎁 Regalo',
    '🪙 Otros ingresos'
];

const EXPENSE_CATEGORIES = [
    '🍔 Comida',
    '🚕 Transporte',
    '🎬 Entretenimiento',
    '💊 Salud',
    '📚 Educación',
    '📦 Otros',
    '🏠 Alquiler',
    '💳 Tarjeta de crédito',
    '🛒 Supermercado',
    '💡 Servicios',
    '🔄 Suscripciones',
    '🐾 Mascotas',
    '✈️ Viajes',
    '💻 Tecnología',
    '🛠️ Herramienta de trabajo',
    '📉 Inversiones',
    '🧠 Inversión en mentoría'
];

export function TransactionModal({ isOpen, onClose, type, date, initialData, onSave, onDelete }: TransactionModalProps) {
    const [amount, setAmount] = useState<string>(initialData ? initialData.amount.toString() : '');
    const [category, setCategory] = useState<string>(initialData ? initialData.category : '');
    const [description, setDescription] = useState<string>(initialData?.description || '');

    // Reset state when opening clean or with new data
    // (Note: This simple resetting depends on the key or onClose behavior. 
    // Ideally use useEffect or key to reset form.)
    if (!isOpen) return null;

    const categories = type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
    const isEditing = !!initialData;
    const title = isEditing ? (type === 'income' ? 'Editar Ingreso' : 'Editar Gasto') : (type === 'income' ? 'Nueva Entrada' : 'Nuevo Gasto');
    const accentColor = type === 'income' ? 'text-emerald-400' : 'text-rose-400';
    const btnColor = type === 'income' ? 'bg-emerald-500 hover:bg-emerald-400' : 'bg-rose-500 hover:bg-rose-400';
    const borderColor = type === 'income' ? 'focus:border-emerald-500' : 'focus:border-rose-500';

    const handleSave = () => {
        if (!amount || isNaN(Number(amount))) return;
        const finalAmount = Math.round(Number(amount));
        onSave(finalAmount, category || 'Otros', description);
        // Only clear if adding; if editing, maybe keep? But onClose usually unmounts or hides.
        if (!isEditing) {
            setAmount('');
            setCategory('');
            setDescription('');
        }
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="w-full max-w-md bg-[#0a0a0a] border border-white/10 rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="flex justify-between items-center p-4 border-b border-white/5">
                    <div>
                        <h3 className={cn("text-lg font-bold", accentColor)}>{title}</h3>
                        <p className="text-xs text-neutral-500 font-medium uppercase tracking-wider">
                            {date ? format(parseISO(date), "d 'de' MMMM", { locale: es }) : ''}
                        </p>
                    </div>
                    <button onClick={onClose} className="p-2 text-neutral-400 hover:text-white transition-colors">
                        <X size={20} />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 space-y-6">
                    {/* Amount */}
                    <div className="space-y-2">
                        <label className="text-xs font-bold uppercase tracking-widest text-neutral-500">Monto (€)</label>
                        <input
                            type="number"
                            autoFocus
                            placeholder="0"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            className={cn(
                                "w-full bg-[#111] border border-white/5 rounded-xl px-4 py-3 text-2xl font-bold text-white outline-none transition-all placeholder-neutral-700",
                                borderColor
                            )}
                        />
                        <p className="text-[10px] text-neutral-600 font-medium">Se redondeará al número entero más cercano.</p>
                    </div>

                    {/* Category */}
                    <div className="space-y-2">
                        <label className="text-xs font-bold uppercase tracking-widest text-neutral-500">Categoría</label>
                        <select
                            value={category}
                            onChange={(e) => setCategory(e.target.value)}
                            className={cn(
                                "w-full bg-[#111] border border-white/5 rounded-xl px-4 py-3 text-sm font-medium text-white outline-none transition-all appearance-none cursor-pointer hover:bg-[#161616]",
                                borderColor
                            )}
                        >
                            <option value="" disabled>Seleccionar...</option>
                            {categories.map(cat => (
                                <option key={cat} value={cat}>{cat}</option>
                            ))}
                        </select>
                    </div>

                    {/* Description */}
                    <div className="space-y-2">
                        <label className="text-xs font-bold uppercase tracking-widest text-neutral-500">Descripción (opcional)</label>
                        <input
                            type="text"
                            placeholder="Detalles..."
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            className={cn(
                                "w-full bg-[#111] border border-white/5 rounded-xl px-4 py-3 text-sm font-medium text-white outline-none transition-all placeholder-neutral-700",
                                borderColor
                            )}
                        />
                    </div>
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-white/5 bg-[#080808] grid grid-cols-1 gap-3">
                    <button
                        onClick={handleSave}
                        className={cn("w-full py-4 rounded-xl text-black font-bold uppercase tracking-widest transition-all transform active:scale-[0.98] flex items-center justify-center gap-2", btnColor, !amount ? "opacity-50 cursor-not-allowed" : "")}
                        disabled={!amount}
                    >
                        <Check size={18} /> {isEditing ? 'Guardar cambios' : 'Agregar'}
                    </button>

                    {isEditing && onDelete && (
                        <button
                            onClick={() => {
                                if (confirm('¿Estás seguro de eliminar este registro?')) {
                                    onDelete();
                                    onClose();
                                }
                            }}
                            className="w-full py-3 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-500 text-xs font-bold uppercase tracking-widest transition-all"
                        >
                            Eliminar
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
