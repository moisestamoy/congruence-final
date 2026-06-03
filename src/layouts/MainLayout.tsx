import { useState, useEffect, useRef } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Reorder } from 'framer-motion';
import { LucideIcon, LayoutDashboard, Wallet, PieChart, LogIn, LogOut, Plus, User, Brain, CheckSquare, GripVertical } from 'lucide-react';
import { cn } from '../utils/cn';
import { AuthModal } from '../features/auth/AuthModal';
import { useAuth } from '../context/AuthContext';
import { SupabaseSync } from '../features/sync/SupabaseSync';
import { useFabStore } from '../hooks/useFabStore';
import { useTheme } from '../hooks/useTheme';
import { useNavStore } from '../hooks/useNavStore';

// ── STATIC CONFIG ────────────────────────────────────────────────────────────
const featureColors: Record<string, { icon: string; activeBg: string; mobileActiveBg: string; dot: string }> = {
    '/':         { icon: 'text-cyan-400',    activeBg: 'bg-cyan-500/[0.10]',    mobileActiveBg: 'bg-cyan-500/15',    dot: 'bg-cyan-400'    },
    '/finances': { icon: 'text-emerald-400', activeBg: 'bg-emerald-500/[0.10]', mobileActiveBg: 'bg-emerald-500/15', dot: 'bg-emerald-400' },
    '/stats':    { icon: 'text-violet-400',  activeBg: 'bg-violet-500/[0.10]',  mobileActiveBg: 'bg-violet-500/15',  dot: 'bg-violet-400'  },
    '/identity': { icon: 'text-purple-400',  activeBg: 'bg-purple-500/[0.10]',  mobileActiveBg: 'bg-purple-500/15',  dot: 'bg-purple-400'  },
    '/coach':    { icon: 'text-amber-400',   activeBg: 'bg-amber-500/[0.10]',   mobileActiveBg: 'bg-amber-500/15',   dot: 'bg-amber-400'   },
    '/tasks':    { icon: 'text-indigo-400',  activeBg: 'bg-indigo-500/[0.10]',  mobileActiveBg: 'bg-indigo-500/15',  dot: 'bg-indigo-400'  },
};

type NavItem = { path: string; icon: LucideIcon; label: string };

const DEFAULT_ITEMS: NavItem[] = [
    { path: '/',         icon: LayoutDashboard, label: 'Tracker'      },
    { path: '/finances', icon: Wallet,          label: 'Finanzas'     },
    { path: '/stats',    icon: PieChart,        label: 'Estadísticas' },
    { path: '/tasks',    icon: CheckSquare,     label: 'Tareas'       },
    { path: '/identity', icon: User,            label: 'Identidad'    },
    { path: '/coach',    icon: Brain,           label: 'Coach IA'     },
];

// Reconstruct full item list from saved path order
function loadSavedOrder(): NavItem[] {
    try {
        const saved = localStorage.getItem('sidebar-order');
        if (!saved) return DEFAULT_ITEMS;
        const paths = JSON.parse(saved) as string[];
        const byPath = new Map(DEFAULT_ITEMS.map(i => [i.path, i]));
        // Keep saved order, append any new items not in saved order
        const ordered = paths.filter(p => byPath.has(p)).map(p => byPath.get(p)!);
        DEFAULT_ITEMS.forEach(item => { if (!paths.includes(item.path)) ordered.push(item); });
        return ordered;
    } catch {
        return DEFAULT_ITEMS;
    }
}

// ── COMPONENT ─────────────────────────────────────────────────────────────────
export default function MainLayout() {
    const location = useLocation();
    const navigate = useNavigate();
    const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
    const [isEditingOrder, setIsEditingOrder] = useState(false);
    const [sidebarItems, setSidebarItems] = useState<NavItem[]>(loadSavedOrder);

    const { user, signOut } = useAuth();
    const { triggerFab } = useFabStore();
    const { theme, setTheme } = useTheme();
    const isAccion = theme === 'accion';
    const { navVisible, setNavVisible } = useNavStore();
    const touchStartYRef = useRef(0);

    // Touch-based scroll direction — works on ALL pages regardless of scroll container
    useEffect(() => {
        const handleTouchStart = (e: TouchEvent) => {
            touchStartYRef.current = e.touches[0].clientY;
        };
        const handleTouchMove = (e: TouchEvent) => {
            const dy = e.touches[0].clientY - touchStartYRef.current;
            if (Math.abs(dy) > 12) {
                // dy > 0 → finger moves down → user scrolling UP → show nav
                // dy < 0 → finger moves up  → user scrolling DOWN → hide nav
                setNavVisible(dy > 0);
                touchStartYRef.current = e.touches[0].clientY; // continuous tracking
            }
        };
        const handleTouchEnd = () => {
            // After lifting finger: check window scroll; if near top, show nav
            requestAnimationFrame(() => {
                const st = window.scrollY || document.documentElement.scrollTop || 0;
                if (st < 20) setNavVisible(true);
            });
        };

        document.addEventListener('touchstart', handleTouchStart, { passive: true });
        document.addEventListener('touchmove', handleTouchMove, { passive: true });
        document.addEventListener('touchend', handleTouchEnd, { passive: true });
        return () => {
            document.removeEventListener('touchstart', handleTouchStart);
            document.removeEventListener('touchmove', handleTouchMove);
            document.removeEventListener('touchend', handleTouchEnd);
        };
    }, [setNavVisible]);

    // Reset nav on route change
    useEffect(() => {
        setNavVisible(true);
    }, [location.pathname, setNavVisible]);

    const getColors = (path: string) => featureColors[path] ?? featureColors['/'];
    const showFab = ['/', '/finances', '/tasks'].includes(location.pathname) && !isEditingOrder;
    const toggleTheme = () => setTheme(isAccion ? 'dark' : 'accion');

    // Mobile always shows first 4 from the current order
    const mobileNavItems = sidebarItems.slice(0, 4);

    const handleReorder = (newOrder: NavItem[]) => {
        setSidebarItems(newOrder);
        localStorage.setItem('sidebar-order', JSON.stringify(newOrder.map(i => i.path)));
    };

    return (
        <div className="flex min-h-screen bg-[#050505] text-white font-sans selection:bg-cyan-500/30">
            <SupabaseSync />
            <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} />

            {/* ── DESKTOP SIDEBAR ── */}
            <aside className="hidden lg:flex flex-col items-center w-[68px] fixed left-0 top-0 bottom-0 z-50 bg-[#0a0a0a]/95 backdrop-blur-xl border-r border-white/[0.05]">

                {/* Logo */}
                <div className="flex items-center justify-center w-full pt-5 pb-4">
                    <button onClick={() => navigate('/')} title="CONGRUENCE" className="group">
                        <svg
                            width="34" height="34" viewBox="0 0 32 32" fill="none"
                            xmlns="http://www.w3.org/2000/svg"
                            style={{ filter: 'drop-shadow(0 0 8px var(--logo-glow-sm))' }}
                            className="group-hover:[filter:drop-shadow(0_0_18px_var(--logo-glow-lg))] transition-all duration-300"
                        >
                            <rect width="32" height="32" rx="7" fill="#0a0a0a"/>
                            <circle cx="16" cy="16" r="12.8" stroke="var(--logo-color)" strokeWidth="0.9"  strokeOpacity="0.2"/>
                            <circle cx="16" cy="16" r="9.6"  stroke="var(--logo-color)" strokeWidth="1.1"  strokeOpacity="0.55"/>
                            <circle cx="16" cy="16" r="6.4"  stroke="var(--logo-color)" strokeWidth="1.3"  strokeOpacity="1"/>
                            <circle cx="16" cy="16" r="1.1"  fill="var(--logo-color)"/>
                        </svg>
                    </button>
                </div>

                <div className="w-9 h-px bg-white/[0.06] mb-3" />

                {/* ── NAV ITEMS (sortable in edit mode) ── */}
                {isEditingOrder ? (
                    <Reorder.Group
                        axis="y"
                        values={sidebarItems}
                        onReorder={handleReorder}
                        style={{
                            flex: 1,
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: 4,
                            padding: '4px 12px',
                            listStyle: 'none',
                            margin: 0,
                            width: '100%',
                            overflowY: 'auto',
                        }}
                    >
                        {sidebarItems.map((item) => {
                            const isActive = location.pathname === item.path;
                            const colors = getColors(item.path);
                            return (
                                <Reorder.Item
                                    key={item.path}
                                    value={item}
                                    style={{ width: '100%', listStyle: 'none', cursor: 'grab' }}
                                    whileDrag={{ scale: 1.08, opacity: 0.9 }}
                                    dragConstraints={{ top: 0, bottom: 0 }}
                                >
                                    <div
                                        title={item.label}
                                        className={cn(
                                            "relative w-full h-11 flex items-center justify-center rounded-xl transition-all",
                                            "border border-dashed border-white/10 bg-white/[0.04]",
                                            isActive ? colors.activeBg : ""
                                        )}
                                    >
                                        <item.icon
                                            size={18}
                                            className={cn("transition-all duration-200", isActive ? colors.icon : "text-neutral-500")}
                                            strokeWidth={1.8}
                                        />
                                        {/* Grip dots on right */}
                                        <div className="absolute right-1.5 flex items-center opacity-40 pointer-events-none">
                                            <GripVertical size={11} className="text-neutral-400" />
                                        </div>
                                    </div>
                                </Reorder.Item>
                            );
                        })}
                    </Reorder.Group>
                ) : (
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
                )}

                <div className="w-9 h-px bg-white/[0.06] mt-3 mb-2" />

                {/* Reorder toggle button */}
                <div className="px-3 w-full mb-1">
                    <button
                        onClick={() => setIsEditingOrder(v => !v)}
                        title={isEditingOrder ? 'Guardar orden' : 'Reordenar menú'}
                        className={cn(
                            "w-full h-7 rounded-lg flex items-center justify-center gap-1 text-[9px] font-black uppercase tracking-widest transition-all border",
                            isEditingOrder
                                ? "bg-cyan-500/15 border-cyan-500/30 text-cyan-400"
                                : "bg-white/[0.03] border-white/[0.06] text-neutral-600 hover:bg-white/[0.07] hover:text-neutral-400"
                        )}
                    >
                        <GripVertical size={11} />
                        {isEditingOrder ? 'LISTO' : 'ORDEN'}
                    </button>
                </div>

                {/* Auth / profile + Theme switcher */}
                <div className="pb-3 flex flex-col items-center gap-2 px-3">
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

                    {/* Test Onboarding button */}
                    <button
                        onClick={() => {
                            localStorage.removeItem('congruence_onboarding');
                            navigate('/onboarding');
                        }}
                        title="Testear Onboarding"
                        className="w-full h-7 rounded-lg flex items-center justify-center gap-1 text-[9px] font-black uppercase tracking-widest transition-all border bg-white/[0.03] border-white/[0.06] text-neutral-600 hover:bg-violet-500/[0.10] hover:border-violet-500/20 hover:text-violet-400"
                    >
                        ▶ OB
                    </button>

                    {/* Theme Switcher */}
                    <button
                        onClick={toggleTheme}
                        title={isAccion ? 'Cambiar a tema Classic' : 'Cambiar a tema ACCIÓN'}
                        className={cn(
                            "w-full h-7 rounded-lg flex items-center justify-center gap-1 text-[9px] font-black uppercase tracking-widest transition-all border",
                            isAccion
                                ? "bg-red-500/10 border-red-500/20 text-red-400 hover:bg-red-500/20"
                                : "bg-white/[0.03] border-white/[0.06] text-neutral-600 hover:bg-white/[0.07] hover:text-neutral-400"
                        )}
                    >
                        <span className={cn("w-1.5 h-1.5 rounded-full transition-colors duration-300", isAccion ? "bg-red-500" : "bg-cyan-400")} />
                        {isAccion ? 'ACCIÓN' : 'CLASSIC'}
                    </button>
                </div>
            </aside>

            {/* ── MOBILE BOTTOM NAV — auto-hides on scroll down, reappears on scroll up ── */}
            <div className={cn(
                "lg:hidden fixed bottom-0 inset-x-0 z-50 flex items-end justify-center px-4 bottom-nav-safe",
                "transition-transform duration-300 ease-in-out",
                navVisible ? "translate-y-0" : "translate-y-[110%]"
            )}>
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
