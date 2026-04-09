import { useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Wallet, PieChart, LogIn, LogOut, Plus, User, Brain } from 'lucide-react';
import { cn } from '../utils/cn';
import { AuthModal } from '../features/auth/AuthModal';
import { useAuth } from '../context/AuthContext';
import { SupabaseSync } from '../features/sync/SupabaseSync';
import { useFabStore } from '../hooks/useFabStore';

const featureColors: Record<string, { icon: string; activeBg: string; mobileActiveBg: string; dot: string }> = {
    '/':         { icon: 'text-cyan-400',    activeBg: 'bg-cyan-500/[0.10]',    mobileActiveBg: 'bg-cyan-500/15',    dot: 'bg-cyan-400'    },
    '/finances': { icon: 'text-emerald-400', activeBg: 'bg-emerald-500/[0.10]', mobileActiveBg: 'bg-emerald-500/15', dot: 'bg-emerald-400' },
    '/stats':    { icon: 'text-violet-400',  activeBg: 'bg-violet-500/[0.10]',  mobileActiveBg: 'bg-violet-500/15',  dot: 'bg-violet-400'  },
    '/identity': { icon: 'text-purple-400',  activeBg: 'bg-purple-500/[0.10]',  mobileActiveBg: 'bg-purple-500/15',  dot: 'bg-purple-400'  },
    '/coach':    { icon: 'text-amber-400',   activeBg: 'bg-amber-500/[0.10]',   mobileActiveBg: 'bg-amber-500/15',   dot: 'bg-amber-400'   },
};

const sidebarItems = [
    { path: '/',         icon: LayoutDashboard, label: 'Tracker'      },
    { path: '/finances', icon: Wallet,          label: 'Finanzas'     },
    { path: '/stats',    icon: PieChart,        label: 'Estadísticas' },
    { path: '/identity', icon: User,            label: 'Identidad'    },
    { path: '/coach',    icon: Brain,           label: 'Coach IA'     },
];

const mobileNavItems = [
    { path: '/',         icon: LayoutDashboard, label: 'Tracker'  },
    { path: '/finances', icon: Wallet,          label: 'Finanzas' },
    { path: '/stats',    icon: PieChart,        label: 'Stats'    },
    { path: '/identity', icon: User,            label: 'Yo'       },
];

export default function MainLayout() {
    const location = useLocation();
    const navigate = useNavigate();
    const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
    const { user, signOut } = useAuth();
    const { triggerFab } = useFabStore();

    const getColors = (path: string) => featureColors[path] ?? featureColors['/'];
    const showFab = ['/', '/finances'].includes(location.pathname);

    return (
        <div className="flex min-h-screen bg-[#050505] text-white font-sans selection:bg-cyan-500/30">
            <SupabaseSync />
            <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} />

            {/* ── DESKTOP SIDEBAR ── */}
            <aside className="hidden lg:flex flex-col items-center w-[68px] fixed left-0 top-0 bottom-0 z-50 bg-[#0a0a0a]/95 backdrop-blur-xl border-r border-white/[0.05]">

                {/* Logo */}
                <div className="flex items-center justify-center w-full pt-5 pb-4">
                    <button
                        onClick={() => navigate('/')}
                        title="CONGRUENCE"
                        className="group"
                    >
                        <svg
                            width="34" height="34" viewBox="0 0 32 32" fill="none"
                            xmlns="http://www.w3.org/2000/svg"
                            className="drop-shadow-[0_0_8px_rgba(34,211,238,0.35)] group-hover:drop-shadow-[0_0_18px_rgba(34,211,238,0.7)] transition-all duration-300"
                        >
                            <rect width="32" height="32" rx="7" fill="#0a0a0a"/>
                            <circle cx="16" cy="16" r="12.8" stroke="#22d3ee" strokeWidth="0.9"  strokeOpacity="0.2"/>
                            <circle cx="16" cy="16" r="9.6"  stroke="#22d3ee" strokeWidth="1.1"  strokeOpacity="0.55"/>
                            <circle cx="16" cy="16" r="6.4"  stroke="#22d3ee" strokeWidth="1.3"  strokeOpacity="1"/>
                            <circle cx="16" cy="16" r="1.1"  fill="#22d3ee"/>
                        </svg>
                    </button>
                </div>

                <div className="w-9 h-px bg-white/[0.06] mb-3" />

                {/* Nav items */}
                <nav className="flex-1 flex flex-col items-center gap-1 px-3 py-1">
                    {sidebarItems.map((item) => {
                        const isActive = location.pathname === item.path;
                        const colors = getColors(item.path);
                        return (
                            <button
                                key={item.path}
                                onClick={() => navigate(item.path)}
                                title={item.label}
                                className={cn(
                                    "relative w-full h-11 flex items-center justify-center rounded-xl transition-all duration-200",
                                    isActive
                                        ? colors.activeBg
                                        : "text-neutral-600 hover:text-neutral-300 hover:bg-white/[0.04]"
                                )}
                            >
                                <item.icon
                                    size={19}
                                    className={cn("transition-all duration-200", isActive ? colors.icon : "")}
                                    strokeWidth={isActive ? 2.5 : 1.8}
                                />
                                {/* Active left edge indicator */}
                                {isActive && (
                                    <span className={cn(
                                        "absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full",
                                        colors.dot
                                    )} />
                                )}
                            </button>
                        );
                    })}
                </nav>

                <div className="w-9 h-px bg-white/[0.06] mt-3 mb-4" />

                {/* Auth / profile */}
                <div className="pb-5 flex justify-center">
                    <button
                        onClick={() => user ? signOut() : setIsAuthModalOpen(true)}
                        title={user ? `${user.email} — Cerrar sesión` : 'Iniciar sesión'}
                        className={cn(
                            "w-9 h-9 rounded-full flex items-center justify-center transition-all border text-xs font-black",
                            user
                                ? "bg-white/[0.04] border-white/10 text-cyan-300 hover:bg-red-500/10 hover:border-red-500/20 hover:text-red-400"
                                : "bg-emerald-500/[0.08] border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/15"
                        )}
                    >
                        {user
                            ? (user.email ? user.email.charAt(0).toUpperCase() : <LogOut size={14} />)
                            : <LogIn size={14} />
                        }
                    </button>
                </div>
            </aside>

            {/* ── MOBILE BOTTOM NAV ── */}
            <div className="lg:hidden fixed bottom-0 inset-x-0 z-50 flex items-end justify-center px-4 bottom-nav-safe">
                <div className="w-full flex items-center gap-2 pb-4">
                    <nav className="flex-1 bg-[#121212]/95 backdrop-blur-3xl border border-white/10 rounded-full p-1.5 flex justify-between items-center shadow-2xl">
                        {mobileNavItems.map((item) => {
                            const isActive = location.pathname === item.path;
                            const colors = getColors(item.path);
                            return (
                                <button
                                    key={item.path}
                                    onClick={() => navigate(item.path)}
                                    className={cn(
                                        "relative flex flex-col items-center justify-center flex-1 h-14 min-w-[58px] rounded-[1.5rem] transition-all duration-300",
                                        isActive ? cn(colors.mobileActiveBg, "text-white") : "text-neutral-500 active:bg-white/5"
                                    )}
                                >
                                    <item.icon
                                        size={20}
                                        className={cn("mb-1 transition-colors", isActive ? colors.icon : "")}
                                        strokeWidth={isActive ? 2.5 : 2}
                                    />
                                    <span className={cn(
                                        "text-[11px] font-semibold tracking-wide transition-colors leading-none",
                                        isActive ? "text-white" : "text-neutral-500"
                                    )}>
                                        {item.label}
                                    </span>
                                </button>
                            );
                        })}
                    </nav>

                    {showFab && (
                        <button
                            onClick={triggerFab}
                            className="w-14 h-14 rounded-full bg-white text-black shrink-0 flex items-center justify-center shadow-xl active:scale-95 transition-transform"
                        >
                            <Plus size={28} strokeWidth={2.5} />
                        </button>
                    )}
                </div>
            </div>

            {/* ── MAIN CONTENT ── */}
            <main className="flex-1 min-w-0 pb-36 lg:pb-0 lg:ml-[68px] relative z-10">
                <Outlet />
            </main>
        </div>
    );
}
