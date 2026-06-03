import { useState } from 'react';
import { Edit3, Target, Flame, Compass } from 'lucide-react';
import { useHabitStore, IdentityManifesto } from '../habits/useHabitStore';
import { IdentityProtocolWizard } from '../habits/IdentityProtocolWizard';
import { cn } from '../../utils/cn';

type CardKey = 'identity' | 'goal' | 'minimum';

const EMPTY_MANIFESTO: IdentityManifesto = {
    identityStatement: '',
    identities: { personal: '', professional: '', financial: '' },
    goals: { oneYear: '', ninetyDays: '', antiGoals: '' },
    ignoranceDebt: { missingSkill: '', investmentAction: '' },
    executionProtocol: { planA_Action: '', planA_Volume: '', planB_Minimum: '' },
};

export default function IdentityPage() {
    const { manifesto, setManifesto } = useHabitStore();
    const [isWizardOpen, setIsWizardOpen] = useState(false);
    const [editing, setEditing] = useState<CardKey | null>(null);
    const [draft, setDraft] = useState({ identity: '', goal: '', minimum: '' });

    const identityText = manifesto?.identityStatement || manifesto?.identities?.personal || '';
    const goalText     = manifesto?.goals?.ninetyDays || '';
    const minimumText  = manifesto?.executionProtocol?.planB_Minimum || '';

    const startEdit = (key: CardKey) => {
        setDraft({ identity: identityText, goal: goalText, minimum: minimumText });
        setEditing(key);
    };

    const saveEdit = () => {
        const base = manifesto ?? EMPTY_MANIFESTO;
        setManifesto({
            ...base,
            identityStatement: draft.identity.trim() || base.identityStatement,
            identities: { ...base.identities, personal: draft.identity.trim() },
            goals: { ...base.goals, ninetyDays: draft.goal.trim() },
            executionProtocol: { ...base.executionProtocol, planB_Minimum: draft.minimum.trim() },
        });
        setEditing(null);
    };

    const cards = [
        {
            key: 'identity' as CardKey,
            Icon: Compass,
            accentStyle: { color: 'rgb(var(--accent-400))' },
            borderStyle: { borderColor: 'rgba(var(--accent-500), 0.20)' },
            bgStyle:     { backgroundColor: 'rgba(var(--accent-500), 0.04)' },
            label: 'Soy una persona que...',
            value: identityText,
            placeholder: '...siempre hace lo que dice, sin importar cómo se sienta',
            multiline: true,
        },
        {
            key: 'goal' as CardKey,
            Icon: Target,
            accentStyle: { color: 'rgb(167 139 250)' },
            borderStyle: { borderColor: 'rgba(139 92 246 / 0.20)' },
            bgStyle:     { backgroundColor: 'rgba(139 92 246 / 0.04)' },
            label: 'Meta a 90 días',
            value: goalText,
            placeholder: 'Ej: Lanzar mi negocio, bajar 5kg, ahorrar $X...',
            multiline: false,
        },
        {
            key: 'minimum' as CardKey,
            Icon: Flame,
            accentStyle: { color: 'rgb(251 191 36)' },
            borderStyle: { borderColor: 'rgba(245 158 11 / 0.20)' },
            bgStyle:     { backgroundColor: 'rgba(245 158 11 / 0.04)' },
            label: 'Mi mínimo diario',
            value: minimumText,
            placeholder: 'Lo mínimo que haré sin importar qué pase hoy...',
            multiline: false,
        },
    ];

    return (
        <div className="min-h-screen w-full bg-[#0a0a0a] text-white p-4 md:p-6 lg:p-8 pb-40 lg:pb-16 font-sans">

            {/* Header */}
            <header className="mb-6 md:mb-8">
                <p className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color: 'rgb(var(--accent-400))' }}>
                    Tu brújula
                </p>
                <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-white">Mi Norte</h1>
            </header>

            <div className="space-y-3 max-w-2xl">
                {cards.map(({ key, Icon, accentStyle, borderStyle, bgStyle, label, value, placeholder, multiline }) => {
                    const isEditing = editing === key;
                    const isEmpty   = !value.trim();
                    const draftVal  = key === 'identity' ? draft.identity : key === 'goal' ? draft.goal : draft.minimum;
                    const setDraftVal = (v: string) => setDraft(prev => ({ ...prev, [key === 'identity' ? 'identity' : key === 'goal' ? 'goal' : 'minimum']: v }));

                    return (
                        <div
                            key={key}
                            className="rounded-2xl border p-5 md:p-6 transition-all"
                            style={{ ...borderStyle, ...bgStyle }}
                        >
                            {/* Card header */}
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-2">
                                    <Icon size={14} style={accentStyle} />
                                    <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest">{label}</span>
                                </div>
                                {!isEditing && (
                                    <button
                                        onClick={() => startEdit(key)}
                                        className="text-neutral-600 hover:text-neutral-300 transition-colors p-1 rounded-lg hover:bg-white/5"
                                    >
                                        <Edit3 size={13} />
                                    </button>
                                )}
                            </div>

                            {/* Content */}
                            {isEditing ? (
                                <div className="space-y-2.5">
                                    {multiline ? (
                                        <textarea
                                            autoFocus
                                            value={draftVal}
                                            onChange={e => setDraftVal(e.target.value)}
                                            placeholder={placeholder}
                                            rows={2}
                                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/20 outline-none transition-colors text-base resize-none focus:border-white/20"
                                        />
                                    ) : (
                                        <input
                                            autoFocus
                                            value={draftVal}
                                            onChange={e => setDraftVal(e.target.value)}
                                            onKeyDown={e => e.key === 'Enter' && saveEdit()}
                                            placeholder={placeholder}
                                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/20 outline-none transition-colors text-base focus:border-white/20"
                                        />
                                    )}
                                    <div className="flex gap-2">
                                        <button
                                            onClick={saveEdit}
                                            className="px-4 py-2 rounded-xl text-black text-xs font-black uppercase tracking-wide transition-all hover:opacity-90"
                                            style={{ background: 'rgb(var(--accent-400))' }}
                                        >
                                            Guardar
                                        </button>
                                        <button
                                            onClick={() => setEditing(null)}
                                            className="px-4 py-2 rounded-xl bg-white/5 text-neutral-400 text-xs font-bold uppercase tracking-wide hover:bg-white/10 transition-all"
                                        >
                                            Cancelar
                                        </button>
                                    </div>
                                </div>
                            ) : isEmpty ? (
                                <button
                                    onClick={() => startEdit(key)}
                                    className="text-sm font-medium italic transition-colors hover:opacity-80"
                                    style={{ ...accentStyle, opacity: 0.45 }}
                                >
                                    Toca para definir →
                                </button>
                            ) : (
                                <p className="text-lg md:text-xl font-bold text-white leading-snug">{value}</p>
                            )}
                        </div>
                    );
                })}

                {/* Full wizard access */}
                <button
                    onClick={() => setIsWizardOpen(true)}
                    className="text-[11px] text-neutral-600 hover:text-neutral-400 transition-colors uppercase tracking-widest font-bold flex items-center gap-1.5 pt-1"
                >
                    <Edit3 size={11} /> Editar manifiesto completo
                </button>
            </div>

            <IdentityProtocolWizard isOpen={isWizardOpen} onClose={() => setIsWizardOpen(false)} />
        </div>
    );
}
