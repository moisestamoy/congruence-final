import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { format } from 'date-fns';
import { generateId } from '../../utils/id';
import { getHabitDay } from '../../utils/habitDay';

export type PillarId = 'mental' | 'fisico' | 'financiero' | 'laboral' | 'social';

export const PILLAR_IDS: PillarId[] = ['mental', 'fisico', 'financiero', 'laboral', 'social'];

export const PILLAR_META: Record<PillarId, { label: string; emoji: string; color: string }> = {
    mental:     { label: 'Mental',     emoji: '🧠', color: '#818cf8' },
    fisico:     { label: 'Físico',     emoji: '💪', color: '#34d399' },
    financiero: { label: 'Financiero', emoji: '💰', color: '#fbbf24' },
    laboral:    { label: 'Laboral',    emoji: '💼', color: '#22d3ee' },
    social:     { label: 'Social',     emoji: '🤝', color: '#fb7185' },
};

export interface PillarData {
    id: PillarId;
    puntoA: string;      // dónde estoy hoy
    puntoB: string;      // dónde quiero estar
    scoreA: number;      // 1-10
    scoreB: number;      // 1-10
    quienSere?: string;  // quién tengo que ser para sostenerlo
    barrera: string;
    minimo: string;      // acción mínima diaria
    enFoco: boolean;
}

export interface DailyClose {
    date: string; // YYYY-MM-DD
    done: Record<PillarId, boolean>;
    hizo: string;
    mejora: string;
    evite: string;
}

export interface WeeklyReview {
    id: string;
    date: string; // YYYY-MM-DD
    scores: Record<PillarId, number>;
    reflexion: string;
    mejora1pct: string;
    pospuse: string;
}

/** Lo que se sincroniza en stats_data.pillars. */
export interface PillarsSnapshot {
    pillars: Record<PillarId, PillarData>;
    closes: DailyClose[];
    reviews: WeeklyReview[];
    themeStart: string;
}

interface PillarsState extends PillarsSnapshot {
    updatePillar: (id: PillarId, updates: Partial<Omit<PillarData, 'id'>>) => void;
    toggleDone: (date: string, id: PillarId) => void;
    saveClose: (date: string, answers: Pick<DailyClose, 'hizo' | 'mejora' | 'evite'>) => void;
    addReview: (review: Omit<WeeklyReview, 'id' | 'date'>) => void;
}

export const todayKey = () => format(getHabitDay(), 'yyyy-MM-dd');

const emptyDone = (): Record<PillarId, boolean> =>
    ({ mental: false, fisico: false, financiero: false, laboral: false, social: false });

const emptyPillars = (): Record<PillarId, PillarData> =>
    Object.fromEntries(PILLAR_IDS.map(id => [id, {
        id, puntoA: '', puntoB: '', scoreA: 5, scoreB: 8, barrera: '', minimo: '', enFoco: true,
    }])) as Record<PillarId, PillarData>;

/** El cierre de un día, creado vacío si todavía no existe. */
function withClose(closes: DailyClose[], date: string, change: (c: DailyClose) => DailyClose): DailyClose[] {
    const existing = closes.find(c => c.date === date);
    const next = change(existing ?? { date, done: emptyDone(), hizo: '', mejora: '', evite: '' });
    return existing ? closes.map(c => (c.date === date ? next : c)) : [...closes, next];
}

/** Completa lo que falte en un snapshot que viene de la nube o de una versión vieja. */
export function normalizePillars(raw: Partial<PillarsSnapshot> | undefined): PillarsSnapshot {
    const base = emptyPillars();
    const pillars = Object.fromEntries(PILLAR_IDS.map(id => [id, { ...base[id], ...(raw?.pillars?.[id] ?? {}), id }])) as Record<PillarId, PillarData>;
    return {
        pillars,
        closes: Array.isArray(raw?.closes) ? raw!.closes : [],
        reviews: Array.isArray(raw?.reviews) ? raw!.reviews : [],
        themeStart: raw?.themeStart || new Date().toISOString(),
    };
}

export const usePillarsStore = create<PillarsState>()(
    persist(
        (set) => ({
            pillars: emptyPillars(),
            closes: [],
            reviews: [],
            themeStart: new Date().toISOString(),

            updatePillar: (id, updates) => set(state => ({
                pillars: { ...state.pillars, [id]: { ...state.pillars[id], ...updates, id } },
            })),

            toggleDone: (date, id) => set(state => ({
                closes: withClose(state.closes, date, c => ({ ...c, done: { ...c.done, [id]: !c.done[id] } })),
            })),

            saveClose: (date, answers) => set(state => ({
                closes: withClose(state.closes, date, c => ({ ...c, ...answers })),
            })),

            // La revisión semanal es el nuevo Punto A de cada pilar.
            addReview: (review) => set(state => ({
                reviews: [...state.reviews, { ...review, id: generateId(), date: todayKey() }],
                pillars: Object.fromEntries(PILLAR_IDS.map(id => [id, { ...state.pillars[id], scoreA: review.scores[id] }])) as Record<PillarId, PillarData>,
            })),
        }),
        { name: 'congruence-pillars-storage' }
    )
);
