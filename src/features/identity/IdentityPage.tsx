import { useState, useMemo } from 'react';
import { ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from 'recharts';
import { Hexagon, Plus, BrainCircuit, Target, AlertTriangle, Zap, BookOpen, Flame, Skull, Edit3, ArrowRight } from 'lucide-react';
import { useHolisticStore } from '../stats/useHolisticStore';
import { HolisticCheckInModal } from '../stats/HolisticCheckInModal';
import { useHabitStore } from '../habits/useHabitStore';
import { IdentityProtocolWizard } from '../habits/IdentityProtocolWizard';

const AXIS_LABELS: Record<string, string> = {
    physical: 'Físico',
    emotional: 'Emocional',
    vision: 'Visión',
    standards: 'Disciplina',
    growth: 'Crecimiento',
    environment: 'Entorno',
};

export default function IdentityPage() {
    const { getLatestCheckIn, getCheckInAxesForDay, isFullCheckIn } = useHolisticStore();
    const { manifesto } = useHabitStore();
    const [isHolisticModalOpen, setIsHolisticModalOpen] = useState(false);
    const [isWizardOpen, setIsWizardOpen] = useState(false);

    const latestHolistic = getLatestCheckIn();
    const todayAxes = getCheckInAxesForDay();
    const isSunday = isFullCheckIn();

    // Normalize data for chart (0-100 scale)
    const holisticData = useMemo(() => {
        const h = latestHolistic || { physical: 0, emotional: 0, vision: 0, standards: 0, growth: 0, environment: 0 };
        return [
            { subject: 'Físico', A: h.physical * 10, fullMark: 100 },
            { subject: 'Crecimiento', A: h.growth * 10, fullMark: 100 },
            { subject: 'Visión', A: h.vision * 10, fullMark: 100 },
            { subject: 'Emocional', A: h.emotional * 10, fullMark: 100 },
            { subject: 'Entorno', A: h.environment * 10, fullMark: 100 },
            { subject: 'Disciplina', A: h.standards * 10, fullMark: 100 },
        ];
    }, [latestHolistic]);

    const isRadarEmpty = !latestHolistic;

    const displayedIdentity = manifesto?.identityStatement ||
        manifesto?.identities?.personal || null;

    return (
        <div className="min-h-screen w-full bg-[#020508] bg-[radial-gradient(ellipse_at_top_center,_var(--tw-gradient-stops))] from-[#1a0b2e] via-[#020508] to-black text-white p-8 font-sans overflow-y-auto pb-32">

            <header className="mb-12 flex items-center justify-between">
                <div>
                    <h1 className="text-4xl font-bold tracking-tight text-white mb-2 drop-shadow-[0_0_15px_rgba(255,255,255,0.3)]">
                        Centro de Identidad
                    </h1>
                    <p className="text-purple-400 font-medium tracking-widest uppercase text-sm">
                        Protocolo de Personaje & Perfil Holístico
                    </p>
                </div>
            </header>

            {/* 1. HOLISTIC PROFILE WIDGET */}
            <div className="relative w-full rounded-[32px] overflow-hidden bg-gradient-to-br from-[#0a0a0a] to-[#050505] border border-white/10 shadow-2xl p-6 md:p-8 shrink-0 mb-12 flex flex-col lg:flex-row items-center gap-8">
                <div className="absolute top-0 left-0 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

                <div className="w-full lg:w-1/3 flex flex-col justify-center relative z-10 text-center lg:text-left">
                    <div className="inline-flex items-center justify-center lg:justify-start gap-3 mb-4">
                        <div className="p-3 bg-purple-500/10 rounded-2xl text-purple-400">
                            <Hexagon size={24} />
                        </div>
                        <h2 className="text-2xl font-bold text-white tracking-tight">Estado Actual</h2>
                    </div>
                    <p className="text-sm text-neutral-400 mb-4 max-w-sm mx-auto lg:mx-0">
                        Una representación visual de tu ejecución diaria.
                    </p>

                    {/* Today's axes indicator */}
                    <div className="mb-6 flex flex-wrap gap-2 justify-center lg:justify-start">
                        {isSunday ? (
                            <span className="px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-purple-500/20 text-purple-300 border border-purple-500/30">
                                🌟 Domingo — Radar Completo
                            </span>
                        ) : (
                            <>
                                <span className="text-[10px] text-neutral-600 uppercase font-bold tracking-wider flex items-center">Hoy:</span>
                                {todayAxes.map(axis => (
                                    <span key={axis} className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-white/5 text-neutral-300 border border-white/10">
                                        {AXIS_LABELS[axis]}
                                    </span>
                                ))}
                            </>
                        )}
                    </div>

                    <button
                        onClick={() => setIsHolisticModalOpen(true)}
                        className="flex items-center justify-center gap-2 w-full md:w-auto px-6 py-4 rounded-xl bg-purple-500 text-black font-bold uppercase tracking-widest text-xs hover:bg-purple-400 transition-all shadow-[0_0_20px_rgba(168,85,247,0.3)] hover:shadow-[0_0_30px_rgba(168,85,247,0.5)] active:scale-95"
                    >
                        <Plus size={16} /> Evaluarte Hoy
                    </button>
                </div>

                <div className="w-full lg:w-2/3 h-[300px] sm:h-[400px] relative z-10 flex justify-center items-center">
                    {isRadarEmpty ? (
                        <div className="text-center flex flex-col items-center gap-4">
                            {/* Faint empty hexagon outline */}
                            <div className="w-48 h-48 flex items-center justify-center opacity-10">
                                <Hexagon size={180} className="text-purple-400" />
                            </div>
                            <div className="absolute flex flex-col items-center gap-3">
                                <p className="text-sm text-neutral-400 max-w-[200px] text-center leading-snug">
                                    Tu primera evaluación dibujará esto. Empieza ahora.
                                </p>
                                <button
                                    onClick={() => setIsHolisticModalOpen(true)}
                                    className="flex items-center gap-1.5 text-purple-400 text-xs font-bold uppercase tracking-widest hover:text-purple-300 transition-colors"
                                >
                                    Evaluarte hoy <ArrowRight size={12} />
                                </button>
                            </div>
                        </div>
                    ) : (
                        <ResponsiveContainer width="100%" height="100%">
                            <RadarChart cx="50%" cy="50%" outerRadius="70%" data={holisticData}>
                                <PolarGrid stroke="#ffffff20" />
                                <PolarAngleAxis
                                    dataKey="subject"
                                    tick={{ fill: '#a3a3a3', fontSize: 11, fontWeight: 'bold' }}
                                />
                                <PolarRadiusAxis
                                    angle={30}
                                    domain={[0, 100]}
                                    tick={false}
                                    axisLine={false}
                                />
                                <Radar
                                    name="Nivel Actual"
                                    dataKey="A"
                                    stroke="#a855f7"
                                    strokeWidth={3}
                                    fill="#a855f7"
                                    fillOpacity={0.4}
                                />
                            </RadarChart>
                        </ResponsiveContainer>
                    )}
                </div>
            </div>

            {/* 2. IDENTITY MANIFESTO */}
            <div className="relative w-full rounded-[32px] overflow-hidden bg-[#050505] border border-white/10 shadow-2xl p-6 md:p-8">
                <div className="flex justify-between items-center mb-10 border-b border-white/10 pb-6">
                    <div>
                        <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                            <BrainCircuit className="text-purple-400" size={24} />
                            Tu Palabra
                        </h2>
                        <p className="text-sm text-neutral-500 mt-2">Todo lo demás se evalúa contra esto.</p>
                    </div>
                    {manifesto && (
                        <button
                            onClick={() => setIsWizardOpen(true)}
                            className="px-4 py-2 bg-white/5 border border-white/10 hover:bg-white/10 rounded-xl text-xs font-bold uppercase tracking-widest text-neutral-300 transition-all flex items-center gap-2"
                        >
                            <Edit3 size={14} /> Editar
                        </button>
                    )}
                </div>

                {!manifesto ? (
                    <div className="text-center py-16 flex flex-col items-center gap-5">
                        <div className="p-5 rounded-full bg-purple-500/10 border border-purple-500/20">
                            <BrainCircuit className="text-purple-400" size={36} />
                        </div>
                        <div>
                            <p className="text-neutral-400 mb-1 text-lg font-semibold">Aún no has definido Tu Palabra.</p>
                            <p className="text-neutral-600 text-sm max-w-xs mx-auto">
                                Sin esto, no hay nada contra qué medirte.
                            </p>
                        </div>
                        <button
                            onClick={() => setIsWizardOpen(true)}
                            className="px-8 py-4 bg-white text-black text-sm font-black rounded-xl hover:scale-105 transition-transform shadow-[0_0_30px_rgba(255,255,255,0.15)] flex flex-col items-center gap-1"
                        >
                            <span>Crear Tu Manifiesto</span>
                            <span className="text-[10px] font-normal text-black/50 normal-case tracking-normal">Todo lo demás se evalúa contra esto</span>
                        </button>
                    </div>
                ) : (
                    <div className="space-y-6">
                        {/* Identity Statement hero */}
                        {displayedIdentity && (
                            <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-6 mb-6">
                                <div className="text-[10px] font-bold text-cyan-400 uppercase tracking-widest mb-3">Declaración de Identidad</div>
                                <p className="text-xl font-bold text-white leading-snug">"{displayedIdentity}"</p>
                            </div>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {/* Misión 90 Días */}
                            <div className="bg-purple-500/5 border border-purple-500/20 rounded-2xl p-6">
                                <div className="text-xs font-bold text-purple-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                                    <Target size={14} /> Misión 90 Días
                                </div>
                                <div className="space-y-4">
                                    <div>
                                        <div className="text-lg font-bold text-white leading-tight">{manifesto.goals.ninetyDays || '-'}</div>
                                    </div>
                                    {manifesto.goals.toxicHabit && (
                                        <div className="mt-4 pt-4 border-t border-purple-500/10">
                                            <div className="text-[10px] text-red-400/60 uppercase font-bold flex items-center gap-1">
                                                <AlertTriangle size={12} /> No toleraré
                                            </div>
                                            <div className="text-xs text-red-200 mt-1">{manifesto.goals.toxicHabit}</div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Deuda de Ignorancia */}
                            {manifesto.ignoranceDebt.missingSkill && (
                                <div className="bg-rose-500/5 border border-rose-500/20 rounded-2xl p-6">
                                    <div className="text-xs font-bold text-rose-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                                        <BookOpen size={14} /> Deuda de Ignorancia
                                    </div>
                                    <div className="space-y-4">
                                        <div>
                                            <div className="text-[10px] text-rose-400/60 uppercase font-bold">Skill Faltante</div>
                                            <div className="text-sm font-bold text-white mt-1">{manifesto.ignoranceDebt.missingSkill}</div>
                                        </div>
                                        {manifesto.ignoranceDebt.investmentAction && (
                                            <div>
                                                <div className="text-[10px] text-rose-400/60 uppercase font-bold flex items-center gap-1">
                                                    <Zap size={12} /> Inversión
                                                </div>
                                                <div className="text-sm text-neutral-300 mt-1">{manifesto.ignoranceDebt.investmentAction}</div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Plan B (hero) */}
                            <div className="bg-yellow-950/20 border border-yellow-500/20 rounded-2xl p-6">
                                <div className="text-xs font-bold text-yellow-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                                    <Skull size={14} /> Tu Contrato Diario
                                </div>
                                <div className="space-y-3">
                                    <div>
                                        <div className="text-[10px] text-emerald-400/60 uppercase font-bold flex items-center gap-1">
                                            <Flame size={12} /> Plan A
                                        </div>
                                        <div className="text-sm font-bold text-emerald-100 mt-1">{manifesto.executionProtocol.planA_Action || '-'}</div>
                                    </div>
                                    <div className="pt-3 border-t border-yellow-500/10">
                                        <div className="text-[10px] text-yellow-400/70 uppercase font-bold flex items-center gap-1">
                                            <Skull size={12} /> Plan B — Mínimo
                                        </div>
                                        <div className="text-sm font-semibold text-yellow-100 mt-1 leading-snug">
                                            "{manifesto.executionProtocol.planB_Minimum || '-'}"
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {isHolisticModalOpen && (
                <HolisticCheckInModal onClose={() => setIsHolisticModalOpen(false)} />
            )}

            <IdentityProtocolWizard isOpen={isWizardOpen} onClose={() => setIsWizardOpen(false)} />

        </div>
    );
}
