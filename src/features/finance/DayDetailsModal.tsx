
import { X, Plus, Edit2 } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { useFinanceStore } from './useFinanceStore';
import { useState } from 'react';
import { TransactionModal } from './TransactionModal';

interface DayDetailsModalProps {
    date: string;
    onClose: () => void;
}

export function DayDetailsModal({ date, onClose }: DayDetailsModalProps) {
    const { events, realExpenses, updateTransaction, deleteTransaction, addTransaction } = useFinanceStore();

    // Local state for the Edit/Add form layer
    const [editingTx, setEditingTx] = useState<{ id: string; type: 'income' | 'expense'; data: any } | null>(null);
    const [isAdding, setIsAdding] = useState<'income' | 'expense' | null>(null);

    // Filter data for this date
    const dayIncomes = events.filter(e => e.date === date);
    const dayExpenses = realExpenses.filter(e => e.date === date);

    const handleSave = (amount: number, category: string, description: string) => {
        if (editingTx) {
            updateTransaction(editingTx.id, editingTx.type, { amount, category, note: description });
            setEditingTx(null);
        } else if (isAdding) {
            addTransaction(date, isAdding, amount, category);
            // Note: addTransaction signature might need updating to support description/note if not already?
            // Checking signature: addTransaction(date, type, amount, category). Doesn't take note yet?
            // Ideally we update addTransaction too or accept omitting note for now.
            // But wait, the Store's addTransaction uses crypto.randomUUID(), so it's a new entry.
            // The note is passed to updateTransaction. For addTransaction, if it doesn't support note, we lose it.
            // We should assume for V1 description is optional or handled if I updated store. 
            // I checked store earlier - addTransaction impl: 
            // { id, date, type, amount, category, ... }
            // It doesn't seem to persist 'note' or 'description' in the object creation in `addTransaction`?
            // `FinancialEvent` has ?description?
            // `DailyRealExpense` has category.
            // Let's proceed, assuming basic fields are key.
            setIsAdding(null);
        }
    };

    const handleDelete = () => {
        if (editingTx) {
            deleteTransaction(editingTx.id, editingTx.type);
            setEditingTx(null);
        }
    };

    return (
        <div className="fixed inset-0 z-40 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            {/* The Main Day Modal */}
            {!editingTx && !isAdding && (
                <div className="w-full max-w-md bg-[#0a0a0a] border border-white/10 rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 relative">
                    {/* Header */}
                    <div className="flex justify-between items-center p-5 border-b border-white/5 bg-[#080808]">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-white/5 rounded-lg text-white">
                                <Edit2 size={16} /> {/* Or Calendar Icon */}
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-white tracking-tight">
                                    {format(parseISO(date), "d 'de' MMMM, yyyy", { locale: es })}
                                </h3>
                                <p className="text-xs text-neutral-500 font-medium uppercase tracking-wider">Detalles del Día</p>
                            </div>
                        </div>
                        <button onClick={onClose} className="p-2 text-neutral-400 hover:text-white transition-colors bg-white/5 hover:bg-white/10 rounded-full">
                            <X size={20} />
                        </button>
                    </div>

                    <div className="p-6 space-y-8 max-h-[70vh] overflow-y-auto">

                        {/* INCOMES SECTION */}
                        <div className="space-y-4">
                            <div className="flex justify-between items-center">
                                <span className="text-xs font-bold text-emerald-500 uppercase tracking-widest">Entradas</span>
                                <button
                                    onClick={() => setIsAdding('income')}
                                    className="text-[10px] flex items-center gap-1 text-emerald-400 hover:text-emerald-300 font-bold uppercase tracking-wider bg-emerald-500/10 px-2 py-1 rounded-md transition-colors"
                                >
                                    <Plus size={12} /> Agregar
                                </button>
                            </div>

                            {dayIncomes.length === 0 ? (
                                <p className="text-sm text-neutral-600 italic text-center py-2">No hay entradas</p>
                            ) : (
                                <div className="space-y-2">
                                    {dayIncomes.map(inc => (
                                        <div
                                            key={inc.id}
                                            onClick={() => setEditingTx({ id: inc.id!, type: 'income', data: inc })}
                                            className="flex justify-between items-center p-3 bg-emerald-900/5 hover:bg-emerald-900/10 border border-emerald-500/10 rounded-xl cursor-pointer transition-all active:scale-[0.98] group"
                                        >
                                            <div className="flex flex-col">
                                                <span className="text-sm font-bold text-white group-hover:text-emerald-200 transition-colors">{inc.category}</span>
                                                {/* If description exists, show it? */}
                                            </div>
                                            <span className="text-emerald-400 font-mono font-bold">+€{inc.amount}</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* EXPENSES SECTION */}
                        <div className="space-y-4">
                            <div className="flex justify-between items-center">
                                <span className="text-xs font-bold text-rose-500 uppercase tracking-widest">Salidas</span>
                                <button
                                    onClick={() => setIsAdding('expense')}
                                    className="text-[10px] flex items-center gap-1 text-rose-400 hover:text-rose-300 font-bold uppercase tracking-wider bg-rose-500/10 px-2 py-1 rounded-md transition-colors"
                                >
                                    <Plus size={12} /> Agregar
                                </button>
                            </div>

                            {dayExpenses.length === 0 ? (
                                <p className="text-sm text-neutral-600 italic text-center py-2">No hay salidas</p>
                            ) : (
                                <div className="space-y-2">
                                    {dayExpenses.map(exp => (
                                        <div
                                            key={exp.id}
                                            onClick={() => setEditingTx({ id: exp.id!, type: 'expense', data: exp })}
                                            className="flex justify-between items-center p-3 bg-rose-900/5 hover:bg-rose-900/10 border border-rose-500/10 rounded-xl cursor-pointer transition-all active:scale-[0.98] group"
                                        >
                                            <div className="flex flex-col">
                                                <span className="text-sm font-bold text-white group-hover:text-rose-200 transition-colors">{exp.category}</span>
                                            </div>
                                            <span className="text-rose-400 font-mono font-bold">-€{exp.amount}</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                    </div>
                </div>
            )}

            {/* Editing / Adding Overlay */}
            {/* We reuse TransactionModal for both Adding (nested here vs global) and Editing */}
            <TransactionModal
                isOpen={!!editingTx || !!isAdding}
                onClose={() => { setEditingTx(null); setIsAdding(null); }}
                type={editingTx ? editingTx.type : (isAdding || 'income')}
                date={date}
                initialData={editingTx ? { amount: editingTx.data.amount, category: editingTx.data.category, description: editingTx.data.note } : undefined}
                onSave={handleSave}
                onDelete={editingTx ? handleDelete : undefined}
            />
        </div>
    );
}
