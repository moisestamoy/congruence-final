import { useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Wallet, PieChart, Brain, LogIn, LogOut, Plus } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '../utils/cn';
import { AuthModal } from '../features/auth/AuthModal';
import { useAuth } from '../context/AuthContext';
import { SupabaseSync } from '../features/sync/SupabaseSync';
import { useFabStore } from '../hooks/useFabStore';

export default function MainLayout() {
    const location = useLocation();
    const navigate = useNavigate();
    const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
    const { user, signOut } = useAuth();
    const { triggerFab } = useFabStore();

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

            {/* BEVEL MOBILE BOTTOM NAVIGATION */}
            <div className="lg:hidden fixed bottom-6 inset-x-4 z-50 flex items-center gap-3">
                <nav className="flex-1 bg-[#121212]/95 backdrop-blur-3xl border border-white/10 rounded-[2.5rem] p-2 flex justify-between items-center shadow-2xl mr-2">
                    {navItems.map((item) => {
                        const isActive = location.pathname === item.path;
                        return (
                            <button
                                key={item.path}
                                onClick={() => navigate(item.path)}
                                className={cn(
                                    "relative flex flex-col items-center justify-center w-[4.5rem] h-[3.8rem] rounded-[2rem] transition-all duration-300",
                                    isActive ? "bg-white/15 text-white shadow-inner" : "text-neutral-500 active:bg-white/5"
                                )}
                            >
                                <item.icon size={20} className={cn("mb-1 transition-colors", isActive ? "text-white" : "")} strokeWidth={isActive ? 2.5 : 2} />
                                <span className={cn(
                                    "text-[10px] font-semibold tracking-wide transition-colors",
                                    isActive ? "text-white" : "text-neutral-500"
                                )}>
                                    {item.label}
                                </span>
                            </button>
                        );
                    })}
                </nav>

                {/* DYNAMIC FAB */}
                {location.pathname !== '/stats' && location.pathname !== '/coach' && (
                    <button
                        onClick={triggerFab}
                        className="w-[4.8rem] h-[4.8rem] rounded-[2.4rem] bg-white text-black shrink-0 flex items-center justify-center shadow-xl active:scale-95 transition-transform"
                    >
                        <Plus size={32} strokeWidth={2.5} />
                    </button>
                )}
            </div>

            {/* MAIN CONTENT */}
            <main className="flex-1 min-w-0 pb-32 lg:pb-0 relative z-10">
                <Outlet />
            </main>
        </div>
    );
}
