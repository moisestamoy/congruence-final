import { useState } from 'react';
import { motion } from 'framer-motion';
import { X } from 'lucide-react';
import { cn } from '../../utils/cn';
import { useTheme } from '../../hooks/useTheme';

const QUICK_REASONS = [
    { icon: '✈️', label: 'Viaje' },
    { icon: '🤒', label: 'Enfermedad' },
    { icon: '💼', label: 'Trabajo' },
    { icon: '👨‍👩‍👦', label: 'Familia' },
    { icon: '😴', label: 'Descanso' },
    { icon: '⚡', label: 'Emergencia' },
];

interface PauseReasonModalProps {
    habitTitle: string;
    habitIcon?: string;
    onConfirm: (reason: string) => void;
    onClose: () => void;
}

export function PauseReasonModal({ habitTitle, habitIcon, onConfirm, onClose }: PauseReasonModalProps) {
    const { theme } = useTheme();
    const isAccion = theme === 'accion';
    const [selected, setSelected] = useState('');
    const [custom, setCustom] = useState('');

    const finalReason = custom.trim() || selected;

    const accent = isAccion
        ? { chip: 'border-red-500/30 bg-red-500/10 text-red-300', chipActive: 'border-red-500 bg-red-500/25 text-red-200', btn: 'bg-red-500/15 border-red-500/30 text-red-300 hover:bg-red-500/25' }
        : { chip: 'border-white/10 bg-white/5 text-neutral-400', chipActive: 'border-cyan-500/60 bg-cyan-500/15 text-cyan-300', btn: 'bg-cyan-500/10 border-cyan-500/20 text-cyan-300 hover:bg-cyan-500/20' };

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className={cn(
                    "w-full max-w-md rounded-2xl p-6 border shadow-2xl",
                    isAccion ? "bg-[#0a0000] border-red-950/40" : "bg-[#0a0a0a] border-white/10"
                )}
            >
                {/* Header */}
                <div className="flex items-center justify-between mb-5">
                    <div className="flex items-center gap-2.5">
                        <span className="text-2xl">{habitIcon || '⏸'}</span>
                        <div>
                            <p className={cn("text-[10px] font-bold uppercase tracking-widest mb-0.5", isAccion ? "text-red-400/70" : "text-cyan-400/70")}>
                                Día de pausa
                            </p>
                            <h3 className="text-white font-bold text-base leading-none">{habitTitle}</h3>
                        </div>
                    </div>
                    <button onClick={onClose} className="w-7 h-7 rounded-full bg-white/5 flex items-center justify-center text-neutral-500 hover:text-white transition-colors">
                        <X size={14} />
                    </button>
                </div>

                <p className="text-neutral-500 text-sm mb-4">¿Por qué pausas hoy este hábito?</p>

                {/* Quick reasons */}
                <div className="grid grid-cols-3 gap-2 mb-4">
                    {QUICK_REASONS.map(r => (
                        <button
                            key={r.label}
                            onClick={() => { setSelected(selected === r.label ? '' : r.label); setCustom(''); }}
                            className={cn(
                                "flex flex-col items-center gap-1 py-2.5 px-3 rounded-xl border text-[11px] font-bold transition-all",
                                selected === r.label ? accent.chipActive : accent.chip
                            )}
                        >
                            <span className="text-lg">{r.icon}</span>
                            {r.label}
                        </button>
                    ))}
                </div>

                {/* Custom text */}
                <input
                    value={custom}
                    onChange={e => { setCustom(e.target.value); setSelected(''); }}
                    placeholder="Otra razón..."
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white/80 placeholder-white/25 outline-none focus:border-white/25 transition-colors mb-5"
                />

                {/* Actions */}
                <div className="flex gap-2">
                    <button
                        onClick={() => onConfirm(finalReason)}
                        className={cn(
                            "flex-1 py-3 rounded-xl border text-sm font-bold transition-all",
                            accent.btn
                        )}
                    >
                        {finalReason ? `Pausar — ${finalReason}` : 'Confirmar pausa'}
                    </button>
                    <button
                        onClick={() => onConfirm('')}
                        className="px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-neutral-500 text-sm hover:text-white/70 transition-colors"
                    >
                        Sin motivo
                    </button>
                </div>
            </motion.div>
        </div>
    );
}
