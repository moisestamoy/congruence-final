import { useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Wallet, PieChart, Menu, X, LogIn, LogOut, Brain } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../utils/cn';
import { AuthModal } from '../features/auth/AuthModal';
import { useAuth } from '../context/AuthContext';
import { SupabaseSync } from '../features/sync/SupabaseSync';

export default function MainLayout() {
    const location = useLocation();
    const navigate = useNavigate();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
    const { user, signOut } = useAuth();

    const navItems = [
        { path: '/', icon: LayoutDashboard, label: 'Tracker' },
        { path: '/finances', icon: Wallet, label: 'Finanzas' },
        { path: '/stats', icon: PieChart, label: 'Estadísticas' },
        { path: '/coach', icon: Brain, label: 'Coach' },
    ];

    return (
        <div className="flex flex-col min-h-screen bg-black text-white font-sans selection:bg-cyan-500/30">
            {/* Background Effects */}
            <div className="fixed inset-0 bg-[#050505] z-0 pointer-events-none" />
            <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900/20 via-black to-black z-0 pointer-events-none" />

            {/* Sync Indicator */}
            <SupabaseSync />

            {/* Auth Modal */}
            <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} />

            {/* DESKTOP TOP NAV */}
            <header className="hidden lg:flex items-center justify-between px-8 py-4 sticky top-0 z-50 bg-[#0a0a0a]/80 backdrop-blur-xl border-b border-white/5">
                {/* Logo */}
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-cyan-400 to-emerald-400 shadow-[0_0_15px_rgba(6,182,212,0.5)]" />
                    <span className="text-xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-neutral-400">
                        CONGRUENCE
                    </span>
                </div>

                {/* Navigation */}
                <nav className="flex items-center gap-2 bg-white/5 p-1 rounded-2xl border border-white/5">
                    {navItems.map((item) => {
                        const isActive = location.pathname === item.path;
                        return (
                            <button
                                key={item.path}
                                onClick={() => navigate(item.path)}
                                className={cn(
                                    "relative px-4 py-2 rounded-xl text-sm font-medium transition-all duration-300 flex items-center gap-2",
                                    isActive
                                        ? "text-white bg-white/10 shadow-[0_0_20px_rgba(255,255,255,0.05)]"
                                        : "text-neutral-500 hover:text-white hover:bg-white/5"
                                )}
                            >
                                <item.icon size={18} className={cn("transition-colors", isActive ? "text-cyan-400" : "group-hover:text-cyan-200")} />
                                <span>{item.label}</span>
                                {isActive && (
                                    <motion.div
                                        layoutId="navbar-indicator"
                                        className="absolute inset-0 bg-white/5 rounded-xl border border-white/10"
                                        transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                                    />
                                )}
                            </button>
                        );
                    })}
                </nav>

                {/* User Actions */}
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => user ? signOut() : setIsAuthModalOpen(true)}
                        className={cn(
                            "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all",
                            user
                                ? "bg-red-500/10 text-red-400 hover:bg-red-500/20"
                                : "bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20"
                        )}
                    >
                        {user ? (
                            <>
                                <LogOut size={16} />
                                <span>Salir</span>
                            </>
                        ) : (
                            <>
                                <LogIn size={16} />
                                <span>Entrar</span>
                            </>
                        )}
                    </button>
                </div>
            </header>

            {/* MOBILE HEADER */}
            <div className="lg:hidden fixed top-0 w-full h-16 bg-black/80 backdrop-blur-md border-b border-white/5 z-50 flex items-center justify-between px-4">
                <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-cyan-400 to-emerald-400 shadow-[0_0_10px_rgba(6,182,212,0.5)]" />
                    <span className="text-lg font-bold tracking-tight text-white">CONGRUENCE</span>
                </div>
                <button onClick={() => setIsMobileMenuOpen(true)} className="text-neutral-400 hover:text-white">
                    <Menu size={24} />
                </button>
            </div>

            {/* MOBILE MENU OVERLAY */}
            <AnimatePresence>
                {isMobileMenuOpen && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsMobileMenuOpen(false)}
                            className="fixed inset-0 bg-black/80 z-[60] lg:hidden backdrop-blur-sm"
                        />
                        <motion.div
                            initial={{ x: '100%' }}
                            animate={{ x: 0 }}
                            exit={{ x: '100%' }}
                            className="fixed right-0 top-0 h-screen w-64 bg-[#0a0a0a] border-l border-white/10 z-[70] lg:hidden p-6 flex flex-col"
                        >
                            <div className="flex justify-end mb-8">
                                <button onClick={() => setIsMobileMenuOpen(false)} className="text-neutral-400 hover:text-white">
                                    <X size={24} />
                                </button>
                            </div>
                            <nav className="flex-1 space-y-4">
                                {navItems.map((item) => {
                                    const isActive = location.pathname === item.path;
                                    return (
                                        <button
                                            key={item.path}
                                            onClick={() => {
                                                navigate(item.path);
                                                setIsMobileMenuOpen(false);
                                            }}
                                            className={cn(
                                                "w-full flex items-center gap-4 px-4 py-3 rounded-xl transition-all",
                                                isActive ? "bg-white/10 text-white" : "text-neutral-500"
                                            )}
                                        >
                                            <item.icon size={20} className={isActive ? "text-cyan-400" : ""} />
                                            <span className="font-medium text-lg">{item.label}</span>
                                        </button>
                                    );
                                })}
                            </nav>

                            <button
                                onClick={() => {
                                    if (user) signOut();
                                    else setIsAuthModalOpen(true);
                                    setIsMobileMenuOpen(false);
                                }}
                                className="mt-8 w-full flex items-center gap-4 px-4 py-3 rounded-xl text-neutral-500 hover:bg-white/5 transition-all"
                            >
                                {user ? (
                                    <>
                                        <LogOut size={20} />
                                        <span>Cerrar Sesión</span>
                                    </>
                                ) : (
                                    <>
                                        <LogIn size={20} />
                                        <span>Iniciar Sesión</span>
                                    </>
                                )}
                            </button>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>

            {/* MAIN CONTENT */}
            <main className="flex-1 min-w-0 pt-20 lg:pt-0 relative z-10">
                <Outlet />
            </main>
        </div>
    );
}
