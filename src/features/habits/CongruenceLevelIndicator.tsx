import { motion } from 'framer-motion';
import { cn } from '../../utils/cn';
import { useTheme } from '../../hooks/useTheme';

interface CongruenceLevelIndicatorProps {
    percentage: number;
    size?: number;
    strokeWidth?: number;
    level?: 1 | 2 | 3 | 4 | 5 | 6;
}

export function CongruenceLevelIndicator({ percentage, size = 160, strokeWidth = 10, level = 1 }: CongruenceLevelIndicatorProps) {
    const { theme } = useTheme();
    const isAccion = theme === 'accion';
    const isOcean = theme === 'ocean';
    const isSakura = theme === 'sakura';
    const center = size / 2;
    const baseRadius = size * 0.4;
    const step = size * 0.09;

    // --- DOPAMINE COLOR SYSTEM ---
    // ACCION theme: L1/L2 use red; higher levels keep their epic colors
    const getColors = () => {
        if (isAccion) {
            switch (level) {
                case 1: return { primary: '#ef4444', secondary: '#b91c1c', glow: 'rgba(239,68,68,0.4)', text: 'text-red-400' };
                case 2: return { primary: '#f87171', secondary: '#dc2626', glow: 'rgba(248,113,113,0.5)', text: 'text-red-400' };
                case 3: return { primary: '#ff3333', secondary: '#cc0000', glow: 'rgba(255,51,51,0.7)', text: 'text-red-400' };
                case 4: return { primary: '#fbbf24', secondary: '#d97706', glow: 'rgba(251,191,36,0.8)', text: 'text-amber-400' };
                case 5: return { primary: '#e2e8f0', secondary: '#94a3b8', glow: 'rgba(255,255,255,0.8)', text: 'text-slate-200' };
                case 6: return { primary: '#e2e8f0', secondary: '#94a3b8', glow: 'rgba(255,255,255,0.9)', text: 'text-slate-200' };
                default: return { primary: '#ef4444', secondary: '#b91c1c', glow: 'rgba(239,68,68,0.4)', text: 'text-red-400' };
            }
        }
        if (isOcean) {
            switch (level) {
                case 1: return { primary: '#818cf8', secondary: '#6366f1', glow: 'rgba(129,140,248,0.35)', text: 'text-indigo-400' };
                case 2: return { primary: '#6366f1', secondary: '#4f46e5', glow: 'rgba(99,102,241,0.5)', text: 'text-indigo-400' };
                case 3: return { primary: '#a78bfa', secondary: '#7c3aed', glow: 'rgba(167,139,250,0.6)', text: 'text-violet-400' };
                case 4: return { primary: '#fbbf24', secondary: '#d97706', glow: 'rgba(251,191,36,0.8)', text: 'text-amber-400' };
                case 5: return { primary: '#38bdf8', secondary: '#0284c7', glow: 'rgba(56,189,248,0.8)', text: 'text-sky-400' };
                case 6: return { primary: '#e2e8f0', secondary: '#94a3b8', glow: 'rgba(255,255,255,0.9)', text: 'text-slate-200' };
                default: return { primary: '#818cf8', secondary: '#6366f1', glow: 'rgba(129,140,248,0.35)', text: 'text-indigo-400' };
            }
        }
        if (isSakura) {
            switch (level) {
                case 1: return { primary: '#fda4af', secondary: '#fb7185', glow: 'rgba(253,164,175,0.35)', text: 'text-rose-300' };
                case 2: return { primary: '#fb7185', secondary: '#f43f5e', glow: 'rgba(251,113,133,0.5)', text: 'text-rose-400' };
                case 3: return { primary: '#f9a8d4', secondary: '#ec4899', glow: 'rgba(249,168,212,0.6)', text: 'text-pink-300' };
                case 4: return { primary: '#fbbf24', secondary: '#d97706', glow: 'rgba(251,191,36,0.8)', text: 'text-amber-400' };
                case 5: return { primary: '#e2e8f0', secondary: '#94a3b8', glow: 'rgba(255,255,255,0.8)', text: 'text-slate-200' };
                case 6: return { primary: '#e2e8f0', secondary: '#94a3b8', glow: 'rgba(255,255,255,0.9)', text: 'text-slate-200' };
                default: return { primary: '#fda4af', secondary: '#fb7185', glow: 'rgba(253,164,175,0.35)', text: 'text-rose-300' };
            }
        }
        switch (level) {
            case 1: return { primary: '#2dd4bf', secondary: '#0f766e', glow: 'none', text: 'text-teal-400' };
            case 2: return { primary: '#06b6d4', secondary: '#0891b2', glow: 'rgba(6,182,212,0.5)', text: 'text-cyan-400' };
            case 3: return { primary: '#d946ef', secondary: '#a21caf', glow: 'rgba(217,70,239,0.6)', text: 'text-fuchsia-400' };
            case 4: return { primary: '#fbbf24', secondary: '#d97706', glow: 'rgba(251,191,36,0.8)', text: 'text-amber-400' };
            case 5: return { primary: '#38bdf8', secondary: '#0284c7', glow: 'rgba(56,189,248,0.8)', text: 'text-sky-400' };
            case 6: return { primary: '#e2e8f0', secondary: '#94a3b8', glow: 'rgba(255,255,255,0.9)', text: 'text-slate-200' };
            default: return { primary: '#2dd4bf', secondary: '#0f766e', glow: 'rgba(45,212,191,0.25)', text: 'text-teal-400' };
        }
    };

    const colors = getColors();

    // In ACCIÓN mode make all rings brighter/more visible
    const rings = [
        { radius: baseRadius,           stroke: strokeWidth, opacity: isAccion ? 0.35 : (level === 1 ? 0.2 : 0.3) },
        { radius: baseRadius - step,    stroke: strokeWidth, opacity: isAccion ? 0.65 : (level === 1 ? 0.5 : 0.6) },
        { radius: baseRadius - step*2,  stroke: strokeWidth, opacity: 1.0 },
    ];

    // Filter Logic — all levels have at least a subtle glow
    const containerFilter = (() => {
        if (isAccion) {
            const g = colors.glow;
            if (level >= 3) return `drop-shadow(0 0 14px ${g}) drop-shadow(0 0 30px ${g}) drop-shadow(0 0 50px ${g})`;
            if (level === 2) return `drop-shadow(0 0 10px ${g}) drop-shadow(0 0 24px ${g})`;
            return `drop-shadow(0 0 8px ${g}) drop-shadow(0 0 20px ${g})`;
        }
        if (level >= 3) return `drop-shadow(0 0 10px ${colors.glow}) drop-shadow(0 0 20px ${colors.glow})`;
        if (level === 2) return `drop-shadow(0 0 5px ${colors.glow})`;
        return `drop-shadow(0 0 4px ${colors.glow})`; // L1: always a subtle glow
    })();

    return (
        <div className="flex flex-col items-center justify-center relative">

            {/* LEVEL 4-5-6 PARTICLES */}
            {level >= 4 && (
                <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                    {/* Base Rotate */}
                    <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: level >= 5 ? 10 : 20, repeat: Infinity, ease: "linear" }}
                        className={cn(
                            "w-full h-full absolute opacity-40 mix-blend-screen",
                            level === 6 ? "opacity-60" : ""
                        )}
                        style={{ width: size * 1.4, height: size * 1.4 }}
                    >
                        <svg className="w-full h-full">
                            <defs>
                                <linearGradient id="particleGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                                    <stop offset="0%" stopColor={colors.primary} stopOpacity="0" />
                                    <stop offset="50%" stopColor={colors.primary} stopOpacity="1" />
                                    <stop offset="100%" stopColor={colors.primary} stopOpacity="0" />
                                </linearGradient>
                            </defs>
                            <circle
                                cx="50%" cy="50%"
                                r={baseRadius + step}
                                fill="none"
                                stroke={level === 6 ? "url(#particleGrad)" : "url(#particleGrad)"} // Can be customized further
                                strokeWidth={level >= 5 ? 2 : 1}
                                strokeDasharray={level >= 5 ? "80 120" : "50 150"}
                                strokeLinecap="round"
                            />
                        </svg>
                    </motion.div>

                    {/* L6 Extra Contra-Rotating Ring */}
                    {level === 6 && (
                        <motion.div
                            animate={{ rotate: -360 }}
                            transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
                            className="w-full h-full absolute opacity-50 mix-blend-overlay"
                            style={{ width: size * 1.6, height: size * 1.6 }}
                        >
                            <svg className="w-full h-full">
                                <circle cx="50%" cy="50%" r={baseRadius + (step * 1.5)} fill="none" stroke="white" strokeWidth="1" strokeDasharray="10 10" strokeOpacity="0.5" />
                            </svg>
                        </motion.div>
                    )}
                </div>
            )}

            <motion.div
                className={cn(
                    "relative shrink-0 transition-all duration-1000",
                    level >= 4 ? "animate-pulse-slow" : ""
                )}
                style={{ width: size, height: size, filter: containerFilter }}
                animate={{
                    scale: [1, 1.03, 1],
                }}
                transition={{
                    duration: 3,
                    repeat: Infinity,
                    ease: "easeInOut"
                }}
            >
                <svg className="w-full h-full transform -rotate-90">
                    <defs>
                        <filter id="innerGlow">
                            <feGaussianBlur in="SourceAlpha" stdDeviation="2" result="blur" />
                            <feComposite in="SourceGraphic" in2="blur" operator="arithmetic" k2="1" k3="1" />
                        </filter>
                        {/* L6 Rainbow Gradient */}
                        <linearGradient id="cosmicGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor="#fff" />
                            <stop offset="50%" stopColor="#c084fc" />
                            <stop offset="100%" stopColor="#67e8f9" />
                        </linearGradient>
                    </defs>

                    {rings.map((ring, i) => {
                        if (ring.radius <= 0) return null;
                        const circumference = 2 * Math.PI * ring.radius;
                        const strokeDashoffset = circumference - (percentage / 100) * circumference;

                        return (
                            <g key={i}>
                                {/* Track Background */}
                                <circle
                                    cx={center}
                                    cy={center}
                                    r={ring.radius}
                                    fill="transparent"
                                    stroke={
                                        isAccion ? "#3d0000" :
                                        isOcean  ? "#0a0a28" :
                                        isSakura ? "#1a0010" :
                                        level === 1 ? "#333333" : "#1a1a1a"
                                    }
                                    strokeWidth={ring.stroke}
                                    strokeOpacity={level === 1 ? 1 : 0.8}
                                />

                                {/* Progress Ring */}
                                <motion.circle
                                    cx={center}
                                    cy={center}
                                    r={ring.radius}
                                    fill="transparent"
                                    stroke={level === 6 ? "url(#cosmicGrad)" : colors.primary}
                                    strokeOpacity={ring.opacity}
                                    strokeWidth={ring.stroke}
                                    strokeDasharray={circumference}
                                    initial={{ strokeDashoffset: circumference }}
                                    animate={{ strokeDashoffset }}
                                    transition={{ duration: 1.2, delay: i * 0.1, ease: "easeOut" }}
                                    strokeLinecap="round"
                                    style={{
                                        filter: level >= 2 ? 'none' : 'none' // Removed complex internal filters for cleaner vector look per request
                                    }}
                                />
                            </g>
                        );
                    })}
                </svg>
            </motion.div>

            {/* Percentage & Label below */}
            <div className="mt-6 flex flex-col items-center z-10">
                <motion.div
                    className={cn("font-bold tracking-tighter leading-none mb-2 transition-colors duration-500", colors.text)}
                    style={{
                        fontSize: size * 0.15,
                        textShadow: level >= 3 ? `0 0 20px ${colors.primary}` : 'none',
                        background: level === 6 ? 'linear-gradient(to right, #fff, #c084fc, #67e8f9)' : 'none',
                        WebkitBackgroundClip: level === 6 ? 'text' : 'none',
                        WebkitTextFillColor: level === 6 ? 'transparent' : 'currentColor'
                    }}
                    initial={{ opacity: 0, scale: 0.5 }}
                    animate={{ opacity: 1, scale: 1 }}
                >
                    {percentage}%
                </motion.div>

                <h3 className={cn(
                    "text-sm font-bold uppercase tracking-[0.3em] mb-1 transition-all duration-500",
                    colors.text,
                    level >= 3 ? "drop-shadow-[0_0_10px_currentColor]" : ""
                )}>
                    {level === 1 && "Estabilidad"}
                    {level === 2 && "Activo"}
                    {level === 3 && "Radiante"}
                    {level === 4 && "Congruencia"}
                    {level === 5 && "Diamante"}
                    {level === 6 && "Cósmico"}
                </h3>
            </div>
        </div>
    );
}
