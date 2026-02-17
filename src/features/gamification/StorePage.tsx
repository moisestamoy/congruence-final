import React from 'react';
import { motion } from 'framer-motion';
import { ShoppingBag, Coins, Lock, Check, Zap, Wind, Award, BarChart2 } from 'lucide-react';
import { useGameStore, STORE_ITEMS } from './useGameStore';
import { cn } from '../../utils/cn';

// Icon Map
const iconMap: Record<string, React.ElementType> = {
    Zap, Wind, Award, BarChart2
};

export default function StorePage() {
    const { points, purchaseItem, inventory, history } = useGameStore();

    return (
        <div className="p-8 max-w-7xl mx-auto space-y-8">
            {/* Header / Wallet */}
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-400 flex items-center gap-3">
                        <ShoppingBag className="text-purple-400" size={32} />
                        Tienda de Recompensas
                    </h1>
                    <p className="text-neutral-400 mt-2">Canjea tus Puntos de Congruencia (CP) por mejoras visuales y funcionalidades.</p>
                </div>

                <div className="flex items-center gap-4 bg-white/5 p-4 rounded-2xl border border-white/10 backdrop-blur-md">
                    <div className="w-12 h-12 rounded-full bg-yellow-500/20 flex items-center justify-center">
                        <Coins className="text-yellow-400" size={24} />
                    </div>
                    <div>
                        <div className="text-sm text-neutral-400 font-medium uppercase tracking-wider">Saldo Disponible</div>
                        <div className="text-3xl font-bold text-white tabular-nums tracking-tight">
                            {points.toLocaleString()} <span className="text-lg text-yellow-400">CP</span>
                        </div>
                    </div>
                </div>
            </header>

            {/* Store Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {STORE_ITEMS.map((item) => {
                    const isOwned = inventory.includes(item.id);
                    const canAfford = points >= item.price;
                    const Icon = iconMap[item.icon] || Award;

                    return (
                        <motion.div
                            key={item.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className={cn(
                                "group relative p-6 rounded-3xl border transition-all duration-300 overflow-hidden",
                                isOwned
                                    ? "bg-emerald-500/5 border-emerald-500/20"
                                    : "bg-white/5 border-white/10 hover:border-purple-500/30 hover:bg-white/10"
                            )}
                        >
                            {/* Background Glow */}
                            <div className="absolute inset-0 bg-gradient-to-br from-purple-500/0 via-transparent to-pink-500/0 group-hover:via-purple-500/5 transition-all duration-500" />

                            <div className="relative z-10 flex flex-col h-full">
                                {/* Header */}
                                <div className="flex justify-between items-start mb-4">
                                    <div className={cn(
                                        "w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-lg",
                                        isOwned ? "bg-emerald-500" : "bg-gradient-to-br from-purple-500 to-pink-600"
                                    )}>
                                        <Icon size={24} />
                                    </div>
                                    {isOwned && (
                                        <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-bold uppercase tracking-wider border border-emerald-500/20 flex items-center gap-1">
                                            <Check size={12} /> Adquirido
                                        </span>
                                    )}
                                </div>

                                {/* Content */}
                                <h3 className="text-xl font-bold text-white mb-2 group-hover:text-purple-300 transition-colors">
                                    {item.name}
                                </h3>
                                <p className="text-neutral-400 text-sm mb-6 flex-1 leading-relaxed">
                                    {item.description}
                                </p>

                                {/* Price / Action */}
                                <div className="mt-auto">
                                    {isOwned ? (
                                        <button disabled className="w-full py-3 rounded-xl bg-white/5 text-neutral-500 font-medium cursor-default border border-white/5">
                                            Ya lo tienes
                                        </button>
                                    ) : (
                                        <button
                                            onClick={() => purchaseItem(item.id)}
                                            disabled={!canAfford}
                                            className={cn(
                                                "w-full py-3 rounded-xl font-bold transition-all flex items-center justify-center gap-2",
                                                canAfford
                                                    ? "bg-white text-black hover:bg-purple-400 hover:text-white hover:scale-[1.02] shadow-[0_0_20px_rgba(255,255,255,0.2)]"
                                                    : "bg-white/5 text-neutral-500 cursor-not-allowed border border-white/5"
                                            )}
                                        >
                                            {canAfford ? (
                                                <>Comprar por {item.price} CP</>
                                            ) : (
                                                <><Lock size={16} /> Faltan {item.price - points} CP</>
                                            )}
                                        </button>
                                    )}
                                </div>
                            </div>
                        </motion.div>
                    );
                })}
            </div>

            {/* History Feed */}
            <div className="max-w-2xl">
                <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                    <div className="w-1 h-1 rounded-full bg-neutral-500" />
                    Historial de Transacciones
                </h2>
                <div className="space-y-3">
                    {history.slice(0, 5).map((tx) => (
                        <div key={tx.id} className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/5">
                            <div className="flex items-center gap-4">
                                <div className={cn(
                                    "w-8 h-8 rounded-full flex items-center justify-center text-white",
                                    tx.type === 'earn' ? "bg-emerald-500/20 text-emerald-400" : "bg-red-500/20 text-red-400"
                                )}>
                                    {tx.type === 'earn' ? '+' : '-'}
                                </div>
                                <div>
                                    <div className="text-white font-medium">{tx.description}</div>
                                    <div className="text-xs text-neutral-500">{new Date(tx.date).toLocaleDateString()}</div>
                                </div>
                            </div>
                            <div className={cn(
                                "font-bold tabular-nums",
                                tx.type === 'earn' ? "text-emerald-400" : "text-white"
                            )}>
                                {tx.type === 'earn' ? '+' : '-'}{tx.amount} CP
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
