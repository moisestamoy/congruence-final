import { AnimatePresence, motion } from 'framer-motion';
import { CheckCircle2, XCircle, Info, AlertTriangle, X } from 'lucide-react';
import { useToastStore } from '../hooks/useToastStore';
import { cn } from '../utils/cn';

const icons = {
    success: CheckCircle2,
    error: XCircle,
    info: Info,
    warning: AlertTriangle,
};

const styles = {
    success: 'border-emerald-500/30 bg-emerald-500/[0.12] text-emerald-300',
    error:   'border-red-500/30    bg-red-500/[0.12]    text-red-300',
    info:    'border-white/10      bg-[#0d0d0d]/95      text-white',
    warning: 'border-amber-500/30  bg-amber-500/[0.12]  text-amber-300',
};

export function Toaster() {
    const { toasts, dismiss } = useToastStore();

    return (
        <div className="fixed bottom-28 lg:bottom-6 left-1/2 -translate-x-1/2 lg:left-auto lg:right-5 lg:translate-x-0 z-[200] flex flex-col gap-2 items-center lg:items-end pointer-events-none">
            <AnimatePresence initial={false}>
                {toasts.map((t) => {
                    const Icon = icons[t.type];
                    return (
                        <motion.div
                            key={t.id}
                            layout
                            initial={{ opacity: 0, y: 12, scale: 0.94 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 6, scale: 0.94 }}
                            transition={{ type: 'spring', bounce: 0.25, duration: 0.35 }}
                            className={cn(
                                "pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-2xl border backdrop-blur-xl shadow-2xl text-sm font-medium",
                                "w-[calc(100vw-2rem)] max-w-sm lg:w-auto lg:min-w-[260px] lg:max-w-sm",
                                styles[t.type]
                            )}
                        >
                            <Icon size={16} className="shrink-0" />
                            <span className="flex-1 leading-snug">{t.message}</span>
                            <button
                                onClick={() => dismiss(t.id)}
                                className="shrink-0 opacity-50 hover:opacity-100 transition-opacity ml-1"
                            >
                                <X size={13} />
                            </button>
                        </motion.div>
                    );
                })}
            </AnimatePresence>
        </div>
    );
}
