import React from 'react';
import { motion } from 'framer-motion';
import { ShoppingBag, Coins, Lock, Check, Zap, Wind, Award, BarChart2, Sparkles, ArrowUpRight } from 'lucide-react';
import { useGameStore, STORE_ITEMS } from './useGameStore';
import { cn } from '../../utils/cn';

const iconMap: Record<string, React.ElementType> = {
    Zap, Wind, Award, BarChart2
};

export default function StorePage() {
    const { points, purchaseItem, inventory, history } = useGameStore();

    return (
        <div className="min-h-screen bg-[#050505] text-white font-sans selection:bg-purple-500/30 pb-40 lg:pb-24 relative overflow-hidden">

            {/* Background ambience */}
            <div className="fixed inset-0 pointer-events-none">
                <div className="absolute top-[-20%] right-[5%] w-[55%] h-[55%] bg-purple-600/[0.05] rounded-full blur-[160px]" />
                <div className="absolute bottom-[-15%] left-[-10%] w-[45%] h-[45%] bg-indigo-500/[0.04] rounded-full blur-[130px]" />
            </div>

            <div className="w-full max-w-5xl mx-auto p-4 md:p-8 relative z-10">

                {/* Header */}
                <header className="mb-10 md:mb-14">
                    <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                        <div>
                            <div className="inline-flex items-center justify-center p-3 bg-purple-500/10 rounded-2xl mb-5 border border-purple-500/20 shadow-[0_0_30px_-10px_rgba(168,85,247,0.3)]">
                                <ShoppingBag className="text-purple-400" size={26} />
                            </div>
                            <h1 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white via-purple-100 to-white mb-3">
                                Tienda
                            </h1>
                            <p className="text-neutral-500 text-sm max-w-md leading-relaxed">
                                Canjea tus Puntos de Congruencia por mejoras y funcionalidades especiales.
                            </p>
                        </div>

                        {/* Balance */}
                        <div className="flex items-center gap-4 bg-white/[0.03] backdrop-blur-xl p-4 md:p-5 rounded-2xl border border-white/[0.08] shrink-0 relative overflow-hidden">
                            <div className="absolute inset-0 bg-gradient-to-br from-amber-500/[0.04] to-transparent pointer-events-none" />
                            <div className="relative w-11 h-11 rounded-xl bg-amber-500/10 border border-amber-500/15 flex items-center justify-center">
                                <Coins className="text-amber-400" size={20} />
                            </div>
                            <div className="relative">
                                <p className="text-[10px] text-neutral-500 font-bold uppercase tracking-widest mb-0.5">Saldo disponible</p>
                                <p className="text-2xl md:text-3xl font-black text-white tabular-nums tracking-tight leading-none">
                                    {points.toLocaleString()}
                                    <span className="text-base text-amber-400 font-bold ml-1.5">CP</span>
                                </p>
                            </div>
                        </div>
                    </div>
                </header>

                {/* Section divider */}
                <div className="flex items-center gap-4 mb-6">
                    <div className="h-px flex-1 bg-white/[0.05]" />
                    <span className="text-[10px] font-black uppercase tracking-[0.25em] text-neutral-600">Disponible</span>
                    <div className="h-px flex-1 bg-white/[0.05]" />
                </div>

                {/* Store Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5 mb-14">
                    {STORE_ITEMS.map((item, index) => {
                        const isOwned = inventory.includes(item.id);
                        const canAfford = points >= item.price;
                        const Icon = iconMap[item.icon] || Award;

                        return (
                            <motion.div
                                key={item.id}
                                initial={{ opacity: 0, y: 16 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.06, ease: [0.21, 0.47, 0.32, 0.98] }}
                                className={cn(
                                    "group relative flex flex-col p-5 md:p-6 rounded-2xl border transition-all duration-300 overflow-hidden",
                                    isOwned
                                        ? "bg-emerald-500/[0.04] border-emerald-500/20"
                                        : canAfford
                                        ? "bg-white/[0.02] border-white/[0.08] hover:border-purple-500/25 hover:bg-purple-500/[0.02] cursor-pointer"
                                        : "bg-white/[0.01] border-white/[0.05]"
                                )}
                            >
                                {/* Top glow for owned */}
                                {isOwned && (
                                    <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-emerald-500/40 to-transparent" />
                                )}
                                {/* Hover glow */}
                                {canAfford && !isOwned && (
                                    <div className="absolute inset-0 bg-gradient-to-br from-purple-500/0 to-purple-500/0 group-hover:from-purple-500/[0.03] transition-all duration-500 pointer-events-none" />
                                )}

                                {/* Header row */}
                                <div className="flex justify-between items-start mb-5">
                                    <div className={cn(
                                        "w-11 h-11 rounded-xl flex items-center justify-center border",
                                        isOwned
                                            ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                                            : canAfford
                                            ? "bg-purple-500/10 border-purple-500/20 text-purple-400"
                                            : "bg-white/5 border-white/10 text-neutral-500"
                                    )}>
                                        <Icon size={21} />
                                    </div>
                                    {isOwned ? (
                                        <span className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-[10px] font-black uppercase tracking-wider border border-emerald-500/15">
                                            <Check size={11} strokeWidth={3} /> Tuyo
                                        </span>
                                    ) : !canAfford ? (
                                        <span className="flex items-center gap-1 px-2 py-1 rounded-full bg-white/[0.04] text-neutral-600 text-[10px] font-bold uppercase tracking-wider">
                                            <Lock size={9} /> Bloqueado
                                        </span>
                                    ) : null}
                                </div>

                                <h3 className={cn(
                                    "text-base font-bold mb-1.5 transition-colors duration-200",
                                    isOwned
                                        ? "text-emerald-300"
                                        : canAfford
                                        ? "text-white group-hover:text-purple-200"
                                        : "text-neutral-500"
                                )}>
                                    {item.name}
                                </h3>
                                <p className={cn(
                                    "text-xs leading-relaxed mb-5 flex-1",
                                    isOwned || canAfford ? "text-neutral-500" : "text-neutral-700"
                                )}>
                                    {item.description}
                                </p>

                                {/* Action */}
                                <div className="mt-auto">
                                    {isOwned ? (
                                        <div className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-emerald-500/[0.06] border border-emerald-500/10 text-emerald-600 text-xs font-semibold">
                                            <Check size={12} strokeWidth={2.5} /> En tu inventario
                                        </div>
                                    ) : (
                                        <button
                                            onClick={() => purchaseItem(item.id)}
                                            disabled={!canAfford}
                                            className={cn(
                                                "w-full py-2.5 rounded-xl font-bold text-sm transition-all duration-200 flex items-center justify-center gap-2",
                                                canAfford
                                                    ? "bg-white text-black hover:bg-purple-200 shadow-[0_0_24px_rgba(168,85,247,0.12)] hover:shadow-[0_0_32px_rgba(168,85,247,0.28)]"
                                                    : "bg-white/[0.03] text-neutral-700 cursor-not-allowed border border-white/[0.05]"
                                            )}
                                        >
                                            {canAfford ? (
                                                <>
                                                    <Sparkles size={13} className="text-purple-600" />
                                                    Comprar · {item.price.toLocaleString()} CP
                                                </>
                                            ) : (
                                                <>
                                                    <Lock size={12} />
                                                    Faltan {(item.price - points).toLocaleString()} CP
                                                </>
                                            )}
                                        </button>
                                    )}
                                </div>
                            </motion.div>
                        );
                    })}
                </div>

                {/* History */}
                {history.length > 0 && (
                    <section>
                        <div className="flex items-center gap-4 mb-5">
                            <div className="h-px flex-1 bg-white/[0.05]" />
                            <span className="text-[10px] font-black uppercase tracking-[0.25em] text-neutral-600">Historial</span>
                            <div className="h-px flex-1 bg-white/[0.05]" />
                        </div>
                        <div className="space-y-2 max-w-2xl">
                            {history.slice(0, 8).map((tx) => (
                                <div
                                    key={tx.id}
                                    className="flex items-center justify-between px-4 py-3 rounded-xl bg-white/[0.02] border border-white/[0.05] hover:bg-white/[0.03] transition-colors"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className={cn(
                                            "w-7 h-7 rounded-full flex items-center justify-center text-xs font-black shrink-0",
                                            tx.type === 'earn'
                                                ? "bg-emerald-500/15 text-emerald-400"
                                                : "bg-red-500/15 text-red-400"
                                        )}>
                                            {tx.type === 'earn' ? '+' : '−'}
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-sm text-white/80 font-medium truncate">{tx.description}</p>
                                            <p className="text-[10px] text-neutral-600 mt-0.5">
                                                {new Date(tx.date).toLocaleDateString('es', { day: 'numeric', month: 'short', year: 'numeric' })}
                                            </p>
                                        </div>
                                    </div>
                                    <span className={cn(
                                        "text-sm font-black tabular-nums shrink-0 ml-3",
                                        tx.type === 'earn' ? "text-emerald-400" : "text-neutral-500"
                                    )}>
                                        {tx.type === 'earn' ? '+' : '−'}{tx.amount} CP
                                    </span>
                                </div>
                            ))}
                        </div>
                        {history.length > 8 && (
                            <button className="flex items-center gap-1.5 mt-4 text-xs text-neutral-600 hover:text-neutral-400 transition-colors font-medium">
                                Ver todo el historial <ArrowUpRight size={12} />
                            </button>
                        )}
                    </section>
                )}
            </div>
        </div>
    );
}
