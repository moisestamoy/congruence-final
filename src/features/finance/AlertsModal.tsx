import { X, AlertTriangle, AlertCircle, Info } from 'lucide-react';
import { motion } from 'framer-motion';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '../../utils/cn';

interface AlertsModalProps {
    onClose: () => void;
    monthsData: any[]; // Passing the computed data to scan for alerts
}

export function AlertsModal({ onClose, monthsData }: AlertsModalProps) {
    // Scan for alerts
    const alerts: any[] = [];

    monthsData.forEach(month => {
        month.days.forEach((day: any) => {
            if (day.status === 'critical') {
                alerts.push({
                    date: day.date,
                    type: 'critical',
                    message: 'Déficit proyectado. El saldo cae por debajo de 0.',
                    amount: day.balance
                });
            } else if (day.status === 'risk') {
                alerts.push({
                    date: day.date,
                    type: 'risk',
                    message: 'Saldo bajo riesgo. Menor a 10% del presupuesto mensual.',
                    amount: day.balance
                });
            }
        });
    });

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-[#0a0a0a] w-full max-w-md rounded-3xl border border-white/10 shadow-2xl overflow-hidden"
            >
                {/* Header */}
                <div className="px-6 py-5 border-b border-white/10 flex items-center justify-between bg-[#111]">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-full bg-blue-500/10 text-blue-400">
                            <Info size={20} />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-white">Alertas Financieras</h2>
                            <p className="text-xs text-neutral-400 font-medium">{alerts.length} alertas detectadas</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="text-neutral-500 hover:text-white transition-colors">
                        <X size={24} />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 max-h-[60vh] overflow-y-auto space-y-4">
                    {alerts.length === 0 ? (
                        <div className="text-center py-8">
                            <div className="flex justify-center mb-4">
                                <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                                    <Info size={32} />
                                </div>
                            </div>
                            <h3 className="text-lg font-bold text-white mb-2">Todo en orden</h3>
                            <p className="text-neutral-400 text-sm">No se han detectado riesgos financieros en tu proyección actual.</p>
                        </div>
                    ) : (
                        alerts.map((alert: any, idx) => (
                            <div
                                key={idx}
                                className={cn(
                                    "p-4 rounded-xl border flex gap-4",
                                    alert.type === 'critical'
                                        ? "bg-rose-500/5 border-rose-500/20"
                                        : "bg-orange-500/5 border-orange-500/20"
                                )}
                            >
                                <div className={cn(
                                    "mt-1 min-w-[24px]",
                                    alert.type === 'critical' ? "text-rose-500" : "text-orange-500"
                                )}>
                                    {alert.type === 'critical' ? <AlertCircle size={24} /> : <AlertTriangle size={24} />}
                                </div>
                                <div>
                                    <div className="flex items-center justify-between mb-1">
                                        <span className={cn(
                                            "text-xs font-bold uppercase tracking-wider",
                                            alert.type === 'critical' ? "text-rose-400" : "text-orange-400"
                                        )}>
                                            {format(parseISO(alert.date), "dd 'de' MMMM", { locale: es })}
                                        </span>
                                        <span className="font-mono font-bold text-white">€{Math.floor(alert.amount).toLocaleString()}</span>
                                    </div>
                                    <p className="text-sm text-neutral-300 font-medium leading-relaxed">
                                        {alert.message}
                                    </p>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-white/10 bg-[#111]">
                    <button
                        onClick={onClose}
                        className="w-full py-3 rounded-xl bg-white text-black font-bold hover:bg-neutral-200 transition-colors"
                    >
                        Entendido
                    </button>
                </div>
            </motion.div>
        </div>
    );
}
