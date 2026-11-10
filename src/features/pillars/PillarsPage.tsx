import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, ChevronDown, ChevronLeft, Moon, Star, X, Compass, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { differenceInCalendarDays, format, subDays } from 'date-fns';
import { PentagonRadar } from './PentagonRadar';
import {
    usePillarsStore, PILLAR_IDS, PILLAR_META, PillarId, PillarData, todayKey,
} from './usePillarsStore';
import { useHabitStore } from '../habits/useHabitStore';
import { getHabitDay } from '../../utils/habitDay';
import { cn } from '../../utils/cn';

const label = 'text-[10px] font-bold text-neutral-500 uppercase tracking-widest';
const field = 'w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/20 outline-none transition-colors text-sm focus:border-white/20';
const card = 'rounded-2xl border border-white/10 bg-white/[0.02] p-5 md:p-6';

// ── Temas de la semana ──────────────────────────────────────────────────

const THEMES = [
    {
        title: 'Responsabilidad',
        pasos: [
            'Escribe 3 excusas que te diste esta semana (tus "balones fuera").',
            'Reescribe cada una como "depende de mí: puedo hacer X".',
        ],
    },
    {
        title: 'Energía y entorno',
        pasos: [
            'Lista 3 cosas que te drenan y 3 que te cargan.',
            'Elimina o reduce una de las que te drenan.',
        ],
    },
    {
        title: 'Acción imperfecta',
        pasos: [
            'Elige algo que llevas más de una semana pensando.',
            'Ejecútalo en 48 h en su versión imperfecta.',
            'Antes, haz un premortem de 5 minutos: ¿qué podría salir mal y cómo lo evitas?',
        ],
    },
    {
        title: 'Opinión ajena y personas',
        pasos: [
            'Anota qué decisión estás frenando por el qué dirán.',
            'Reescribe tu discurso interno sobre esa decisión.',
            'Contacta a una persona clave para ti esta semana.',
        ],
    },
];

function WeeklyThemeCard({ themeStart }: { themeStart: string }) {
    const dias = Math.max(0, differenceInCalendarDays(getHabitDay(), new Date(themeStart)));
    const semana = Math.floor(dias / 7) % THEMES.length;
    const quedan = 7 - (dias % 7);
    const tema = THEMES[semana];

    return (
        <section className={card}>
            <div className="flex items-center justify-between mb-3">
                <span className={label}>Tema de la semana · {semana + 1} de 4</span>
                <span className="text-[10px] text-neutral-600 font-bold">
                    {quedan === 1 ? 'último día' : `quedan ${quedan} días`}
                </span>
            </div>
            <h2 className="text-xl font-black text-white mb-3">{tema.title}</h2>
            <ol className="space-y-2">
                {tema.pasos.map((paso, i) => (
                    <li key={i} className="flex gap-3 text-sm text-neutral-300 leading-relaxed">
                        <span className="text-indigo-400 font-black shrink-0">{i + 1}.</span>
                        {paso}
                    </li>
                ))}
            </ol>
        </section>
    );
}

// ── Hoy: un check por pilar y el cierre nocturno ───────────────────────

const PREGUNTAS = [
    { key: 'hizo', text: '¿Qué hice hoy por cada pilar?' },
    { key: 'mejora', text: '¿Qué haría un 1% mejor mañana?' },
    { key: 'evite', text: '¿Qué evité hoy por pensarlo demasiado?' },
] as const;

function TodayCard() {
    const { pillars, closes, toggleDone, saveClose } = usePillarsStore();
    const { habits, toggleHabit } = useHabitStore();
    const date = todayKey();
    const close = closes.find(c => c.date === date);

    const enFoco = PILLAR_IDS.filter(id => pillars[id].enFoco);
    const visibles = enFoco.length > 0 ? enFoco : PILLAR_IDS;

    const [answers, setAnswers] = useState({ hizo: close?.hizo ?? '', mejora: close?.mejora ?? '', evite: close?.evite ?? '' });
    const dirty = answers.hizo !== (close?.hizo ?? '') || answers.mejora !== (close?.mejora ?? '') || answers.evite !== (close?.evite ?? '');
    const hasClose = !!(close?.hizo || close?.mejora || close?.evite);
    // El cierre es para la noche: antes de las 18 h queda plegado para no alargar la pantalla.
    const [closeOpen, setCloseOpen] = useState(() => new Date().getHours() >= 18 || new Date().getHours() < 5);
    const persist = () => { if (dirty) saveClose(date, { hizo: answers.hizo.trim(), mejora: answers.mejora.trim(), evite: answers.evite.trim() }); };

    // Los 6 días anteriores, del más viejo al más reciente: la constancia de cada pilar.
    const previos = Array.from({ length: 6 }, (_, i) => format(subDays(getHabitDay(), 6 - i), 'yyyy-MM-dd'));
    const hechoEl = (id: PillarId, day: string) =>
        !!closes.find(c => c.date === day)?.done[id] || !!habits.find(h => h.pillar === id && h.type === 'boolean' && !h.archived)?.logs[day]?.completed;

    // Si el pilar tiene un hábito sí/no vinculado, el check también lo marca: así suma al anillo.
    const linkedHabit = (id: PillarId) => habits.find(h => h.pillar === id && h.type === 'boolean' && !h.archived);
    const isDone = (id: PillarId) => !!close?.done[id] || !!linkedHabit(id)?.logs[date]?.completed;

    const toggle = (id: PillarId) => {
        const next = !isDone(id);
        if (!!close?.done[id] !== next) toggleDone(date, id);
        const habit = linkedHabit(id);
        if (habit && !!habit.logs[date]?.completed !== next) toggleHabit(habit.id, date);
    };

    const hechos = visibles.filter(isDone).length;
    const completo = hechos === visibles.length;

    return (
        <section className={cn(card, 'transition-colors duration-500', completo && 'border-emerald-500/30')}>
            <div className="flex items-center justify-between mb-2">
                <span className={label}>Hoy</span>
                <span className={cn('text-[10px] font-bold tabular-nums', completo ? 'text-emerald-400' : 'text-neutral-600')}>
                    {hechos}/{visibles.length}
                </span>
            </div>
            <div className="h-1 rounded-full bg-white/[0.06] overflow-hidden mb-4">
                <motion.div className="h-full rounded-full bg-emerald-400" initial={false}
                    animate={{ width: `${(hechos / visibles.length) * 100}%` }} transition={{ type: 'spring', stiffness: 120, damping: 20 }} />
            </div>
            <AnimatePresence>
                {completo && (
                    <motion.p initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                        className="flex items-center gap-2 text-sm font-bold text-emerald-300 overflow-hidden">
                        <Sparkles size={14} /> <span className="pb-3">Hoy cumpliste con todos tus pilares en foco.</span>
                    </motion.p>
                )}
            </AnimatePresence>

            <div className="space-y-2 mb-6">
                {visibles.map(id => {
                    const meta = PILLAR_META[id];
                    const done = isDone(id);
                    const minimo = pillars[id].minimo.trim();
                    return (
                        <button
                            key={id}
                            onClick={() => toggle(id)}
                            className={cn(
                                'w-full flex items-center gap-3 rounded-xl border px-4 py-3 text-left transition-all',
                                done ? 'border-emerald-500/30 bg-emerald-500/[0.06]' : 'border-white/10 bg-white/[0.02] hover:bg-white/5'
                            )}
                        >
                            <span className={cn(
                                'w-5 h-5 rounded-full border flex items-center justify-center shrink-0 transition-colors',
                                done ? 'bg-emerald-500 border-emerald-500' : 'border-white/20'
                            )}>
                                <AnimatePresence>
                                    {done && (
                                        <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}
                                            transition={{ type: 'spring', stiffness: 500, damping: 18 }}>
                                            <Check size={12} className="text-black" strokeWidth={3} />
                                        </motion.span>
                                    )}
                                </AnimatePresence>
                            </span>
                            <span className="text-base">{meta.emoji}</span>
                            <span className="flex-1 min-w-0">
                                <span className="block text-[10px] font-bold uppercase tracking-widest" style={{ color: meta.color }}>{meta.label}</span>
                                <span className={cn('block text-sm truncate', minimo ? 'text-white' : 'text-neutral-600 italic')}>
                                    {minimo || 'Sin acción mínima'}
                                </span>
                            </span>
                            <span className="flex flex-col items-end gap-1.5 shrink-0">
                                <span className="flex items-center gap-1" aria-label="Últimos 7 días">
                                    {previos.map(day => (
                                        <span key={day} className="w-1.5 h-1.5 rounded-full"
                                            style={{ backgroundColor: hechoEl(id, day) ? meta.color : 'rgba(255,255,255,0.1)' }} />
                                    ))}
                                    <span className="w-1.5 h-1.5 rounded-full ring-1 ring-white/20"
                                        style={{ backgroundColor: done ? meta.color : 'transparent' }} />
                                </span>
                                {linkedHabit(id) && <span className="text-[9px] text-neutral-600 font-bold uppercase tracking-widest">hábito</span>}
                            </span>
                        </button>
                    );
                })}
            </div>

            <button onClick={() => setCloseOpen(o => !o)} className="w-full flex items-center gap-2 text-left">
                <Moon size={13} className="text-indigo-400" />
                <span className={label}>Cierre nocturno</span>
                {hasClose && !dirty && <span className="text-[10px] font-bold text-emerald-400">· guardado</span>}
                <ChevronDown size={14} className={cn('ml-auto text-neutral-500 transition-transform', closeOpen && 'rotate-180')} />
            </button>
            <AnimatePresence initial={false}>
                {closeOpen && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden">
                        <div className="space-y-3 pt-3">
                            {PREGUNTAS.map(q => (
                                <div key={q.key}>
                                    <p className="text-sm text-neutral-300 font-medium mb-1.5">{q.text}</p>
                                    {/* Se guarda solo al salir del campo: no hay botón que olvidar. */}
                                    <textarea
                                        rows={2}
                                        value={answers[q.key]}
                                        onChange={e => setAnswers(a => ({ ...a, [q.key]: e.target.value }))}
                                        onBlur={persist}
                                        className={cn(field, 'resize-none')}
                                    />
                                </div>
                            ))}
                            <p className="text-[11px] text-neutral-600">
                                {dirty ? 'Se guarda al salir del campo.' : hasClose ? 'Cierre de hoy guardado.' : 'Tres respuestas cortas bastan.'}
                            </p>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </section>
    );
}

// ── Tarjeta de cada pilar ──────────────────────────────────────────────

function ScoreInput({ value, onChange, color }: { value: number; onChange: (v: number) => void; color: string }) {
    return (
        <div className="flex items-center gap-3">
            <input type="range" min={1} max={10} value={value} onChange={e => onChange(Number(e.target.value))}
                className="flex-1" style={{ accentColor: color }} />
            <span className="w-6 text-right text-sm font-black text-white tabular-nums">{value}</span>
        </div>
    );
}

function PillarCard({ pillar, open, onToggle }: { pillar: PillarData; open: boolean; onToggle: () => void }) {
    const updatePillar = usePillarsStore(s => s.updatePillar);
    const meta = PILLAR_META[pillar.id];
    const reviews = usePillarsStore(s => s.reviews);
    // Cuánto se movió este pilar entre las dos últimas revisiones.
    const delta = reviews.length >= 2 ? reviews[reviews.length - 1].scores[pillar.id] - reviews[reviews.length - 2].scores[pillar.id] : 0;
    const avance = pillar.scoreB > 0 ? Math.min(1, pillar.scoreA / pillar.scoreB) : 0;
    const set = (updates: Partial<Omit<PillarData, 'id'>>) => updatePillar(pillar.id, updates);

    return (
        <div id={`pilar-${pillar.id}`} className="rounded-2xl border scroll-mt-6 transition-all"
            style={{ borderColor: `${meta.color}33`, backgroundColor: `${meta.color}0a` }}>
            <button onClick={onToggle} className="w-full flex items-center gap-3 p-5 text-left">
                <span className="text-xl">{meta.emoji}</span>
                <span className="flex-1 min-w-0">
                    <span className="block text-lg font-black text-white">{meta.label}</span>
                    <span className="block text-xs text-neutral-500 truncate">
                        {pillar.puntoB.trim() ? `→ ${pillar.puntoB}` : 'Toca para definir tu Punto A y tu Punto B'}
                    </span>
                </span>
                <span className="flex flex-col items-end gap-1 shrink-0">
                    <span className="text-xs font-black tabular-nums" style={{ color: meta.color }}>
                        {pillar.scoreA} → {pillar.scoreB}
                        {delta !== 0 && <span className={cn('ml-1.5', delta > 0 ? 'text-emerald-400' : 'text-rose-400')}>{delta > 0 ? `+${delta}` : delta}</span>}
                    </span>
                    <span className="block w-14 h-1 rounded-full bg-white/10 overflow-hidden">
                        <motion.span className="block h-full rounded-full" style={{ backgroundColor: meta.color }}
                            initial={false} animate={{ width: `${avance * 100}%` }} transition={{ type: 'spring', stiffness: 120, damping: 20 }} />
                    </span>
                </span>
                {!pillar.enFoco && <span className="text-[9px] font-bold uppercase tracking-widest text-neutral-600">pausa</span>}
                <ChevronDown size={16} className={cn('text-neutral-500 transition-transform', open && 'rotate-180')} />
            </button>

            <AnimatePresence initial={false}>
                {open && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden">
                        <div className="px-5 pb-5 space-y-4">
                            <div>
                                <p className={cn(label, 'mb-1.5')}>Punto A · dónde estoy hoy</p>
                                <textarea rows={2} value={pillar.puntoA} onChange={e => set({ puntoA: e.target.value })}
                                    placeholder="Describe con honestidad cómo estás hoy" className={cn(field, 'resize-none')} />
                                <div className="mt-2"><ScoreInput value={pillar.scoreA} onChange={v => set({ scoreA: v })} color="#818cf8" /></div>
                            </div>
                            <div>
                                <p className={cn(label, 'mb-1.5')}>Punto B · a dónde voy</p>
                                <textarea rows={2} value={pillar.puntoB} onChange={e => set({ puntoB: e.target.value })}
                                    placeholder="Cómo se ve este pilar cuando lo logras" className={cn(field, 'resize-none')} />
                                <div className="mt-2"><ScoreInput value={pillar.scoreB} onChange={v => set({ scoreB: v })} color="#34d399" /></div>
                            </div>
                            <div>
                                <p className={cn(label, 'mb-1.5')}>Barrera</p>
                                <input value={pillar.barrera} onChange={e => set({ barrera: e.target.value })}
                                    placeholder="Qué te frena hoy en este pilar" className={field} />
                            </div>
                            <div>
                                <p className={cn(label, 'mb-1.5')}>Acción mínima diaria</p>
                                <input value={pillar.minimo} onChange={e => set({ minimo: e.target.value })}
                                    placeholder="Lo mínimo que harás aunque el día salga mal" className={field} />
                            </div>
                            <div>
                                <p className={cn(label, 'mb-1.5')}>Quién tengo que ser para sostenerlo <span className="normal-case font-normal text-neutral-700">(opcional)</span></p>
                                <input value={pillar.quienSere ?? ''} onChange={e => set({ quienSere: e.target.value })}
                                    placeholder="Soy alguien que..." className={field} />
                            </div>
                            <label className="flex items-center justify-between gap-3 pt-1 cursor-pointer">
                                <span>
                                    <span className="block text-sm font-bold text-white">En foco</span>
                                    <span className="block text-xs text-neutral-500">Aparece en tu check de hoy</span>
                                </span>
                                <button type="button" role="switch" aria-checked={pillar.enFoco} onClick={() => set({ enFoco: !pillar.enFoco })}
                                    className={cn('relative w-11 h-6 rounded-full transition-colors shrink-0', pillar.enFoco ? 'bg-emerald-500' : 'bg-white/10')}>
                                    <span className={cn('absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all', pillar.enFoco ? 'left-[22px]' : 'left-0.5')} />
                                </button>
                            </label>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

// ── Revisión semanal ───────────────────────────────────────────────────

function WeeklyReviewModal({ onClose }: { onClose: () => void }) {
    const { pillars, addReview } = usePillarsStore();
    const [scores, setScores] = useState(() =>
        Object.fromEntries(PILLAR_IDS.map(id => [id, pillars[id].scoreA])) as Record<PillarId, number>);
    const [reflexion, setReflexion] = useState('');
    const [mejora1pct, setMejora1pct] = useState('');
    const [pospuse, setPospuse] = useState('');

    const save = () => {
        addReview({ scores, reflexion: reflexion.trim(), mejora1pct: mejora1pct.trim(), pospuse: pospuse.trim() });
        onClose();
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 overflow-y-auto">
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }}
                className="w-full max-w-lg bg-[#0a0a0a] border border-white/10 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] my-auto">
                <div className="flex justify-between items-center p-6 border-b border-white/5 bg-white/[0.02]">
                    <h2 className="text-xl font-bold text-white tracking-wide">Revisión semanal</h2>
                    <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full text-neutral-400 transition-colors">
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    <div className="space-y-3">
                        <p className={label}>¿Cómo está cada pilar hoy? (1–10)</p>
                        {PILLAR_IDS.map(id => (
                            <div key={id}>
                                <p className="text-sm text-neutral-300 mb-1">{PILLAR_META[id].emoji} {PILLAR_META[id].label}</p>
                                <ScoreInput value={scores[id]} onChange={v => setScores(s => ({ ...s, [id]: v }))} color={PILLAR_META[id].color} />
                            </div>
                        ))}
                    </div>
                    <div>
                        <p className={cn(label, 'mb-1.5')}>Reflexión</p>
                        <textarea rows={3} value={reflexion} onChange={e => setReflexion(e.target.value)} className={cn(field, 'resize-none')} />
                    </div>
                    <div>
                        <p className={cn(label, 'mb-1.5')}>¿Qué mejoré un 1%?</p>
                        <textarea rows={2} value={mejora1pct} onChange={e => setMejora1pct(e.target.value)} className={cn(field, 'resize-none')} />
                    </div>
                    <div>
                        <p className={cn(label, 'mb-1.5')}>¿Qué pospuse por pensar?</p>
                        <textarea rows={2} value={pospuse} onChange={e => setPospuse(e.target.value)} className={cn(field, 'resize-none')} />
                    </div>
                </div>

                <div className="p-6 border-t border-white/5">
                    <button onClick={save}
                        className="w-full py-3 rounded-xl bg-indigo-500 hover:bg-indigo-400 text-white text-sm font-black uppercase tracking-wide transition-all">
                        Guardar revisión
                    </button>
                </div>
            </motion.div>
        </div>
    );
}

function WeeklyReviewCard({ onOpen }: { onOpen: () => void }) {
    const reviews = usePillarsStore(s => s.reviews);
    const esDomingo = getHabitDay().getDay() === 0;
    const ultima = reviews.at(-1);

    return (
        <section className={cn(card, esDomingo && 'border-indigo-500/40 bg-indigo-500/[0.06]')}>
            <div className="flex items-center gap-2 mb-2">
                <Star size={13} className={esDomingo ? 'text-indigo-300' : 'text-neutral-500'} />
                <span className={label}>{esDomingo ? 'Hoy toca revisión semanal' : 'Revisión semanal'}</span>
            </div>
            <p className="text-sm text-neutral-400 mb-4">
                {ultima ? `La última fue el ${ultima.date}.` : 'Todavía no hiciste ninguna.'} Puntúa cada pilar: ese número pasa a ser tu Punto A.
            </p>
            <button onClick={onOpen}
                className={cn('px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wide transition-all',
                    esDomingo ? 'bg-indigo-500 text-white hover:bg-indigo-400' : 'bg-white/5 text-neutral-300 hover:bg-white/10')}>
                Hacer la revisión
            </button>
        </section>
    );
}

// ── Página ──────────────────────────────────────────────────────────────

const entrada = {
    hidden: { opacity: 0, y: 14 },
    visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.06, duration: 0.35, ease: 'easeOut' } }),
};

export default function PillarsPage() {
    const navigate = useNavigate();
    const { pillars, themeStart } = usePillarsStore();
    const [openId, setOpenId] = useState<PillarId | null>(null);
    const [reviewOpen, setReviewOpen] = useState(false);

    const selectFromRadar = (id: PillarId) => {
        setOpenId(id);
        // Un instante para que la tarjeta se abra antes de llevarte a ella.
        setTimeout(() => document.getElementById(`pilar-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 60);
    };

    const sinDefinir = PILLAR_IDS.filter(id => !pillars[id].minimo.trim() && !pillars[id].puntoB.trim());
    const promedio = PILLAR_IDS.reduce((s, id) => s + pillars[id].scoreA, 0) / PILLAR_IDS.length;
    // El pilar más lejos de su meta: por ahí conviene empezar.
    const masLejos = [...PILLAR_IDS].sort((a, b) => (pillars[b].scoreB - pillars[b].scoreA) - (pillars[a].scoreB - pillars[a].scoreA))[0];
    const brecha = pillars[masLejos].scoreB - pillars[masLejos].scoreA;

    return (
        <div className="min-h-screen w-full bg-[#0a0a0a] text-white p-4 md:p-6 lg:p-8 pb-40 lg:pb-16 font-sans">
            <header className="mb-6 md:mb-8">
                <button onClick={() => navigate('/')}
                    className="flex items-center gap-1 text-[11px] font-bold uppercase tracking-widest text-neutral-500 hover:text-neutral-300 transition-colors mb-3 -ml-1">
                    <ChevronLeft size={14} /> Tracker
                </button>
                <p className="text-xs font-bold uppercase tracking-widest mb-1 flex items-center gap-1.5" style={{ color: 'rgb(var(--accent-400))' }}>
                    <Compass size={12} /> Tu equilibrio
                </p>
                <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-white">Pilares</h1>
            </header>

            <div className="space-y-4 max-w-2xl">
                <motion.section className={card} variants={entrada} initial="hidden" animate="visible" custom={0}>
                    <PentagonRadar pillars={pillars} onSelect={selectFromRadar} />
                    <div className="mt-5 pt-4 border-t border-white/5 flex items-center gap-4">
                        <div className="shrink-0">
                            <p className="text-3xl font-black text-white tabular-nums leading-none">{promedio.toFixed(1)}</p>
                            <p className={cn(label, 'mt-1')}>promedio</p>
                        </div>
                        <p className="text-sm text-neutral-400 leading-relaxed">
                            {brecha > 0 ? (
                                <>Tu pilar más lejos de su meta es{' '}
                                    <button onClick={() => selectFromRadar(masLejos)} className="font-bold underline underline-offset-2"
                                        style={{ color: PILLAR_META[masLejos].color }}>{PILLAR_META[masLejos].label}</button>
                                    : le faltan {brecha} {brecha === 1 ? 'punto' : 'puntos'}.</>
                            ) : 'Todos tus pilares están en su meta. Sube el Punto B de alguno.'}
                        </p>
                    </div>
                </motion.section>

                {sinDefinir.length === PILLAR_IDS.length && (
                    <motion.button variants={entrada} initial="hidden" animate="visible" custom={1}
                        onClick={() => selectFromRadar('fisico')}
                        className="w-full text-left rounded-2xl border border-indigo-500/30 bg-indigo-500/[0.06] p-5 hover:bg-indigo-500/10 transition-colors">
                        <p className={cn(label, 'text-indigo-300 mb-1')}>Empieza aquí</p>
                        <p className="text-sm text-neutral-300">Define un solo pilar: dónde estás, a dónde vas y tu acción mínima. Los demás pueden esperar.</p>
                    </motion.button>
                )}

                <motion.div variants={entrada} initial="hidden" animate="visible" custom={2}><TodayCard /></motion.div>
                <motion.div variants={entrada} initial="hidden" animate="visible" custom={3}><WeeklyThemeCard themeStart={themeStart} /></motion.div>

                <motion.div className="space-y-3 pt-2" variants={entrada} initial="hidden" animate="visible" custom={4}>
                    <p className={label}>Tus 5 pilares</p>
                    {PILLAR_IDS.map(id => (
                        <PillarCard key={id} pillar={pillars[id]} open={openId === id}
                            onToggle={() => setOpenId(openId === id ? null : id)} />
                    ))}
                </motion.div>

                <motion.div variants={entrada} initial="hidden" animate="visible" custom={5}>
                    <WeeklyReviewCard onOpen={() => setReviewOpen(true)} />
                </motion.div>
            </div>

            <AnimatePresence>
                {reviewOpen && <WeeklyReviewModal onClose={() => setReviewOpen(false)} />}
            </AnimatePresence>
        </div>
    );
}
