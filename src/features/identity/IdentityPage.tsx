import { useState, useMemo } from 'react';
import { ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from 'recharts';
import { Hexagon, Plus, BrainCircuit, Target, AlertTriangle, Zap, BookOpen, Flame, Skull, Edit3 } from 'lucide-react';
import { useHolisticStore } from '../stats/useHolisticStore';
import { HolisticCheckInModal } from '../stats/HolisticCheckInModal';
import { useHabitStore } from '../habits/useHabitStore';
import { IdentityProtocolWizard } from '../habits/IdentityProtocolWizard';

export default function IdentityPage() {
    const { getLatestCheckIn } = useHolisticStore();
    const { manifesto } = useHabitStore();
    const [isHolisticModalOpen, setIsHolisticModalOpen] = useState(false);
    const [isWizardOpen, setIsWizardOpen] = useState(false);

    const latestHolistic = getLatestCheckIn();
    
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
                    <p className="text-sm text-neutral-400 mb-8 max-w-sm mx-auto lg:mx-0">
                        Una representación visual de tu ejecución diaria. Se compara contra el Protocolo de Personaje que ves abajo.
                    </p>
                    
                    <button 
                        onClick={() => setIsHolisticModalOpen(true)}
                        className="flex items-center justify-center gap-2 w-full md:w-auto px-6 py-4 rounded-xl bg-purple-500 text-black font-bold uppercase tracking-widest text-xs hover:bg-purple-400 transition-all shadow-[0_0_20px_rgba(168,85,247,0.3)] hover:shadow-[0_0_30px_rgba(168,85,247,0.5)] active:scale-95"
                    >
                        <Plus size={16} /> Realizar Check-In
                    </button>
                    {!latestHolistic && (
                        <p className="text-xs text-neutral-600 mt-4 italic">
                            Aún no has registrado ningún Check-In. 
                        </p>
                    )}
                </div>

                <div className="w-full lg:w-2/3 h-[300px] sm:h-[400px] relative z-10 flex justify-center items-center">
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
                </div>
            </div>

            {/* 2. IDENTITY MANIFESTO */}
            <div className="relative w-full rounded-[32px] overflow-hidden bg-[#050505] border border-white/10 shadow-2xl p-6 md:p-8">
                <div className="flex justify-between items-center mb-10 border-b border-white/10 pb-6">
                    <div>
                        <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                            <BrainCircuit className="text-purple-400" size={24} />
                            Tu Protocolo Base
                        </h2>
                        <p className="text-sm text-neutral-500 mt-2">Las reglas estáticas bajo las cuales te evalúas.</p>
                    </div>
                    <button 
                        onClick={() => setIsWizardOpen(true)}
                        className="px-4 py-2 bg-white/5 border border-white/10 hover:bg-white/10 rounded-xl text-xs font-bold uppercase tracking-widest text-neutral-300 transition-all flex items-center gap-2"
                    >
                        <Edit3 size={14} /> Editar
                    </button>
                </div>

                {!manifesto ? (
                    <div className="text-center py-12">
                        <p className="text-neutral-500 mb-4">Aún no has definido tu Protocolo de Personaje.</p>
                        <button 
                            onClick={() => setIsWizardOpen(true)}
                            className="px-6 py-3 bg-white text-black text-sm font-bold rounded-lg hover:scale-105 transition-transform"
                        >
                            Crear Manifiesto
                        </button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        {/* Identidad */}
                        <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                            <div className="text-xs font-bold text-cyan-400 uppercase tracking-widest mb-4">1. Identidad</div>
                            <div className="space-y-4">
                                <div>
                                    <div className="text-[10px] text-neutral-500 uppercase font-bold">Yo Soy (Físico)</div>
                                    <div className="text-sm font-medium text-white mt-1">{manifesto.identities.personal || '-'}</div>
                                </div>
                                <div>
                                    <div className="text-[10px] text-neutral-500 uppercase font-bold">Profesional</div>
                                    <div className="text-sm font-medium text-white mt-1">{manifesto.identities.professional || '-'}</div>
                                </div>
                            </div>
                        </div>

                        {/* Foco 90 Días */}
                        <div className="bg-purple-500/5 border border-purple-500/20 rounded-2xl p-6">
                            <div className="text-xs font-bold text-purple-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                                <Target size={14} /> 2. Misión
                            </div>
                            <div className="space-y-4">
                                <div>
                                    <div className="text-[10px] text-purple-400/60 uppercase font-bold">Foco Crítico (90 Días)</div>
                                    <div className="text-lg font-bold text-white mt-1 leading-tight">{manifesto.goals.ninetyDays || '-'}</div>
                                </div>
                                <div className="mt-4 pt-4 border-t border-purple-500/10">
                                    <div className="text-[10px] text-red-400/60 uppercase font-bold flex items-center gap-1">
                                        <AlertTriangle size={12} /> Anti-Meta
                                    </div>
                                    <div className="text-xs text-red-200 mt-1">{manifesto.goals.antiGoals || '-'}</div>
                                </div>
                            </div>
                        </div>

                        {/* Deuda de Ignorancia */}
                        <div className="bg-rose-500/5 border border-rose-500/20 rounded-2xl p-6">
                            <div className="text-xs font-bold text-rose-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                                <BookOpen size={14} /> 3. Ignorancia
                            </div>
                            <div className="space-y-4">
                                <div>
                                    <div className="text-[10px] text-rose-400/60 uppercase font-bold">Skill Faltante #1</div>
                                    <div className="text-sm font-bold text-white mt-1">{manifesto.ignoranceDebt.missingSkill || '-'}</div>
                                </div>
                                <div>
                                    <div className="text-[10px] text-rose-400/60 uppercase font-bold flex items-center gap-1">
                                        <Zap size={12} /> Inversión / Acción
                                    </div>
                                    <div className="text-sm text-neutral-300 mt-1">{manifesto.ignoranceDebt.investmentAction || '-'}</div>
                                </div>
                            </div>
                        </div>

                        {/* Ejecución */}
                        <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-2xl p-6">
                            <div className="text-xs font-bold text-emerald-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                                <Flame size={14} /> 4. Ejecución
                            </div>
                            <div className="space-y-4">
                                <div>
                                    <div className="text-[10px] text-emerald-400/60 uppercase font-bold">Plan A (Ataque)</div>
                                    <div className="text-sm font-bold text-emerald-50 mt-1">{manifesto.executionProtocol.planA_Action || '-'}</div>
                                    <div className="text-xs text-emerald-200/50 mt-1">Vol: {manifesto.executionProtocol.planA_Volume || '-'}</div>
                                </div>
                                <div className="mt-4 pt-4 border-t border-emerald-500/10">
                                    <div className="text-[10px] text-yellow-400/60 uppercase font-bold flex items-center gap-1">
                                        <Skull size={12} /> Plan B (Supervivencia)
                                    </div>
                                    <div className="text-xs text-yellow-100 mt-1">{manifesto.executionProtocol.planB_Minimum || '-'}</div>
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
