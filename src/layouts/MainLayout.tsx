import { useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Wallet, PieChart, LogIn, LogOut, Plus } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '../utils/cn';
import { AuthModal } from '../features/auth/AuthModal';
import { useAuth } from '../context/AuthContext';
import { SupabaseSync } from '../features/sync/SupabaseSync';
import { useFabStore } from '../hooks/useFabStore';

const featureColors: Record<string, { icon: string; activeBg: string; activeBorder: string; mobileActiveBg: string }> = {
    '/':         { icon: 'text-cyan-400',   activeBg: 'bg-cyan-500/[0.08]',   activeBorder: 'border-cyan-500/25',   mobileActiveBg: 'bg-cyan-500/15'   },
    '/finances': { icon: 'text-emerald-400', activeBg: 'bg-emerald-500/[0.08]', activeBorder: 'border-emerald-500/25', mobileActiveBg: 'bg-emerald-500/15' },
    '/stats':    { icon: 'text-violet-400',  activeBg: 'bg-violet-500/[0.08]',  activeBorder: 'border-violet-500/25',  mobileActiveBg: 'bg-violet-500/15'  },
};

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
    ];

    return (
        <div className="flex flex-col min-h-screen bg-black text-white font-sans selection:bg-cyan-500/30">
            <div className="fixed inset-0 bg-[#050505] z-0 pointer-events-none" />
            <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900/20 via-black to-black z-0 pointer-events-none" />
            <SupabaseSync />
            <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} />

            {/* DESKTOP TOP NAV */}
            <header className="hidden lg:flex items-center justify-between px-8 py-4 sticky top-0 z-50 bg-[#0a0a0a]/80 backdrop-blur-xl border-b border-white/5">
                {/* Logo — click to open Identidad */}
                <div
                    className="flex items-center gap-3 cursor-pointer group"
                    onClick={() => navigate('/identity')}
                    title="Tu Identidad"
                >
                    <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" className="drop-shadow-[0_0_8px_rgba(34,211,238,0.6)] group-hover:drop-shadow-[0_0_14px_rgba(34,211,238,0.9)] transition-all duration-300">
                        <rect width="32" height="32" rx="7" fill="#0a0a0a"/>
                        <circle cx="16" cy="16" r="12.8" stroke="#22d3ee" strokeWidth="0.96" strokeOpacity="0.25"/>
                        <circle cx="16" cy="16" r="9.6" stroke="#22d3ee" strokeWidth="1.12" strokeOpacity="0.60"/>
                        <circle cx="16" cy="16" r="6.4" stroke="#22d3ee" strokeWidth="1.28" strokeOpacity="1"/>
                        <circle cx="16" cy="16" r="1.12" fill="#22d3ee"/>
                    </svg>
                    <span className="text-xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-neutral-400 group-hover:from-cyan-200 group-hover:to-white transition-all duration-300">
                        CONGRUENCE
                    </span>
                </div>

                {/* Navigation */}
                <nav className="flex items-center gap-2 bg-white/5 p-1 rounded-2xl border border-white/5">
                    {navItems.map((item) => {
                        const isActive = location.pathname === item.path;
                        const colors = featureColors[item.path] ?? featureColors['/'];
                        return (
                            <button
                                key={item.path}
                                onClick={() => navigate(item.path)}
                                className={cn(
                                    "relative px-4 py-2 rounded-xl text-sm font-medium transition-all duration-300 flex items-center gap-2",
                                    isActive
                                        ? cn("text-white", colors.activeBg)
                                        : "text-neutral-500 hover:text-white hover:bg-white/5"
                                )}
                            >
                                <item.icon size={18} className={cn("transition-colors", isActive ? colors.icon : "")} />
                                <span>{item.label}</span>
                                {isActive && (
                                    <motion.div
                                        layoutId="navbar-indicator"
                                        className={cn("absolute inset-0 rounded-xl border", colors.activeBg, colors.activeBorder)}
                                        transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                                    />
                                )}
                            </button>
                        );
                    })}
                </nav>

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
                        {user ? (<><LogOut size={16} /><span>Salir</span></>) : (<><LogIn size={16} /><span>Entrar</span></>)}
                    </button>
                </div>
            </header>

            {/* MOBILE BOTTOM NAV — with iPhone safe area */}
            <div className="lg:hidden fixed bottom-0 inset-x-0 z-50 flex items-end justify-center px-4 bottom-nav-safe">
                <div className="w-full flex items-center gap-2 pb-4">
                    <nav className="flex-1 bg-[#121212]/95 backdrop-blur-3xl border border-white/10 rounded-full p-1.5 flex justify-between items-center shadow-2xl">
                        {navItems.map((item) => {
                            const isActive = location.pathname === item.path;
                            const colors = featureColors[item.path] ?? featureColors['/'];
                            return (
                                <button
                                    key={item.path}
                                    onClick={() => navigate(item.path)}
                                    className={cn(
                                        "relative flex flex-col items-center justify-center flex-1 h-14 min-w-[64px] rounded-[1.5rem] transition-all duration-300",
                                        isActive ? cn(colors.mobileActiveBg, "text-white shadow-inner") : "text-neutral-500 active:bg-white/5"
                                    )}
                                >
                                    <item.icon size={20} className={cn("mb-1 transition-colors", isActive ? colors.icon : "")} strokeWidth={isActive ? 2.5 : 2} />
                                    <span className={cn("text-[11px] font-semibold tracking-wide transition-colors leading-none", isActive ? "text-white" : "text-neutral-500")}>
                                        {item.label}
                                    </span>
                                </button>
                            );
                        })}
                    </nav>
                    {location.pathname !== '/stats' && (
                        <button
                            onClick={triggerFab}
                            className="w-14 h-14 rounded-full bg-white text-black shrink-0 flex items-center justify-center shadow-xl active:scale-95 transition-transform"
                        >
                            <Plus size={28} strokeWidth={2.5} />
                        </button>
                    )}
                </div>
            </div>

            <main className="flex-1 min-w-0 pb-36 lg:pb-0 relative z-10">
                <Outlet />
            </main>
        </div>
    );
}
