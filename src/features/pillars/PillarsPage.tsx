import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, ChevronLeft, ChevronDown, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { differenceInCalendarDays, format, subDays } from 'date-fns';
import { es } from 'date-fns/locale';
import { PentagonRadar } from './PentagonRadar';
import {
    usePillarsStore, PILLAR_IDS, PILLAR_META, PillarId, PillarData, todayKey,
} from './usePillarsStore';
import { useHabitStore } from '../habits/useHabitStore';
import { getHabitDay } from '../../utils/habitDay';
import { cn } from '../../utils/cn';

const ACCENT = 'rgb(var(--accent-400))';
const caption = 'text-[10px] font-bold uppercase tracking-widest text-neutral-500';
// Campos de línea, sin caja: se escriben como en un cuaderno.
const line = 'w-full bg-transparent border-b border-white/10 py-2 text-sm text-white placeholder-white/20 outline-none transition-colors focus:border-[rgb(var(--accent-400))] resize-none';
const panel = 'rounded-[1.5rem] border border-white/[0.08] bg-white/[0.02]';

/** Puntaje de 1 a 10 en diez marcas: se toca la que corresponde. */
function Scale({ value, onChange }: { value: number; onChange: (v: number) => void }) {
    return (
        <div className="flex items-center gap-3">
            <div className="flex-1 flex gap-1" role="slider" aria-valuemin={1} aria-valuemax={10} aria-valuenow={value}>
                {Array.from({ length: 10 }, (_, i) => i + 1).map(n => (
                    <button key={n} type="button" onClick={() => onChange(n)} aria-label={`${n}`}
                        className="flex-1 h-6 flex items-center group">
                        <span className="w-full h-1.5 rounded-full transition-colors group-hover:bg-white/30"
                            style={{ backgroundColor: n <= value ? ACCENT : 'rgba(255,255,255,0.08)' }} />
                    </button>
                ))}
            </div>
            <span className="w-5 text-right text-sm font-black text-white tabular-nums">{value}</span>
        </div>
    );
}

// ── La lista: un pilar por fila, igual que los hábitos ─────────────────

function PillarRow({ pillar, open, onToggleOpen }: { pillar: PillarData; open: boolean; onToggleOpen: () => void }) {
    const { closes, reviews, toggleDone, updatePillar } = usePillarsStore();
    const { habits, toggleHabit } = useHabitStore();
    const date = todayKey();
    const name = PILLAR_META[pillar.id].label;
    const set = (updates: Partial<Omit<PillarData, 'id'>>) => updatePillar(pillar.id, updates);

    // Si un hábito sí/no sirve a este pilar, el check también lo marca: así suma al anillo.
    const habit = habits.find(h => h.pillar === pillar.id && h.type === 'boolean' && !h.archived);
    const doneOn = (day: string) => !!closes.find(c => c.date === day)?.done[pillar.id] || !!habit?.logs[day]?.completed;
    const done = doneOn(date);
    const week = Array.from({ length: 7 }, (_, i) => format(subDays(getHabitDay(), 6 - i), 'yyyy-MM-dd'));

    const toggle = () => {
        const next = !done;
        if (!!closes.find(c => c.date === date)?.done[pillar.id] !== next) toggleDone(date, pillar.id);
        if (habit && !!habit.logs[date]?.completed !== next) toggleHabit(habit.id, date);
    };

    const delta = reviews.length >= 2 ? reviews[reviews.length - 1].scores[pillar.id] - reviews[reviews.length - 2].scores[pillar.id] : 0;

    return (
        <div id={`pilar-${pillar.id}`} className="scroll-mt-6 border-b border-white/[0.06] last:border-b-0">
            <div className={cn('flex items-center gap-3 px-1 py-3.5', !pillar.enFoco && 'opacity-45')}>
                {pillar.enFoco ? (
                    <button onClick={toggle} aria-label={done ? `Desmarcar ${name}` : `Marcar ${name}`}
                        className="w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors"
                        style={{ borderColor: done ? ACCENT : 'rgba(255,255,255,0.18)' }}>
                        <AnimatePresence>
                            {done && (
                                <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}
                                    transition={{ type: 'spring', stiffness: 500, damping: 20 }}>
                                    <Check className="w-3.5 h-3.5 stroke-[3]" style={{ color: ACCENT }} />
                                </motion.span>
                            )}
                        </AnimatePresence>
                    </button>
                ) : (
                    <span className="w-6 h-6 flex items-center justify-center shrink-0 text-neutral-600">–</span>
                )}

                <button onClick={onToggleOpen} className="flex-1 min-w-0 flex items-center gap-3 text-left">
                    <span className="flex-1 min-w-0">
                        <span className="block text-[13px] font-black uppercase tracking-wide text-white">{name}</span>
                        <span className="block text-xs text-white/40 truncate mt-0.5">
                            {pillar.minimo.trim() || (pillar.enFoco ? 'Falta tu acción mínima' : 'En pausa')}
                        </span>
                    </span>
                    <span className="hidden sm:flex gap-[3px] shrink-0" aria-hidden>
                        {week.map(day => (
                            <span key={day} className="w-1.5 h-1.5 rounded-full"
                                style={{ backgroundColor: doneOn(day) ? ACCENT : 'rgba(255,255,255,0.1)' }} />
                        ))}
                    </span>
                    <span className="w-14 text-right text-xs font-bold text-white tabular-nums shrink-0">
                        {pillar.scoreA}<span className="text-white/30"> → {pillar.scoreB}</span>
                        {delta !== 0 && <span className="block text-[10px]" style={{ color: delta > 0 ? ACCENT : 'rgb(251 113 133)' }}>{delta > 0 ? `+${delta}` : delta} esta semana</span>}
                    </span>
                    <ChevronDown size={14} className={cn('text-neutral-600 transition-transform shrink-0', open && 'rotate-180')} />
                </button>
            </div>

            <AnimatePresence initial={false}>
                {open && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.22 }} className="overflow-hidden">
                        <div className="pl-10 pr-1 pb-6 pt-1 space-y-5">
                            <div className="grid sm:grid-cols-2 gap-5">
                                <div>
                                    <p className={caption}>Dónde estoy</p>
                                    <textarea rows={2} value={pillar.puntoA} onChange={e => set({ puntoA: e.target.value })}
                                        placeholder="Cómo está esto hoy, sin adornos" className={line} />
                                    <div className="mt-2"><Scale value={pillar.scoreA} onChange={v => set({ scoreA: v })} /></div>
                                </div>
                                <div>
                                    <p className={caption}>A dónde voy</p>
                                    <textarea rows={2} value={pillar.puntoB} onChange={e => set({ puntoB: e.target.value })}
                                        placeholder="Cómo se ve cuando lo logre" className={line} />
                                    <div className="mt-2"><Scale value={pillar.scoreB} onChange={v => set({ scoreB: v })} /></div>
                                </div>
                            </div>
                            <div className="grid sm:grid-cols-2 gap-5">
                                <div>
                                    <p className={caption}>Qué me frena</p>
                                    <input value={pillar.barrera} onChange={e => set({ barrera: e.target.value })}
                                        placeholder="La barrera de ahora" className={line} />
                                </div>
                                <div>
                                    <p className={caption}>Acción mínima</p>
                                    <input value={pillar.minimo} onChange={e => set({ minimo: e.target.value })}
                                        placeholder="Lo que hago aunque el día salga mal" className={line} />
                                </div>
                            </div>
                            <div>
                                <p className={caption}>Quién tengo que ser para sostenerlo</p>
                                <input value={pillar.quienSere ?? ''} onChange={e => set({ quienSere: e.target.value })}
                                    placeholder="Opcional" className={line} />
                            </div>
                            <button type="button" role="switch" aria-checked={pillar.enFoco} onClick={() => set({ enFoco: !pillar.enFoco })}
                                className="flex items-center gap-3 text-left">
                                <span className="relative w-9 h-5 rounded-full transition-colors shrink-0"
                                    style={{ backgroundColor: pillar.enFoco ? ACCENT : 'rgba(255,255,255,0.1)' }}>
                                    <span className={cn('absolute top-0.5 w-4 h-4 rounded-full bg-[#0a0a0a] transition-all', pillar.enFoco ? 'left-[18px]' : 'left-0.5')} />
                                </span>
                                <span className="text-xs text-neutral-400">
                                    {pillar.enFoco ? 'En foco: lo marco cada día' : 'En pausa: no lo marco por ahora'}
                                </span>
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

// ── Cierre del día ──────────────────────────────────────────────────────

const PREGUNTAS = [
    { key: 'hizo', text: '¿Qué hice hoy por cada pilar?' },
    { key: 'mejora', text: '¿Qué haría un 1% mejor mañana?' },
    { key: 'evite', text: '¿Qué evité hoy por pensarlo demasiado?' },
] as const;

function NightClose() {
    const { closes, saveClose } = usePillarsStore();
    const date = todayKey();
    const close = closes.find(c => c.date === date);
    const [answers, setAnswers] = useState({ hizo: close?.hizo ?? '', mejora: close?.mejora ?? '', evite: close?.evite ?? '' });
    const dirty = answers.hizo !== (close?.hizo ?? '') || answers.mejora !== (close?.mejora ?? '') || answers.evite !== (close?.evite ?? '');
    const written = !!(close?.hizo || close?.mejora || close?.evite);
    // Es para la noche: antes de las 18 h queda plegado.
    const [open, setOpen] = useState(() => new Date().getHours() >= 18 || new Date().getHours() < 5);
    const persist = () => { if (dirty) saveClose(date, { hizo: answers.hizo.trim(), mejora: answers.mejora.trim(), evite: answers.evite.trim() }); };

    return (
        <section className={cn(panel, 'p-5 lg:p-6')}>
            <button onClick={() => setOpen(o => !o)} className="w-full flex items-baseline gap-3 text-left">
                <h2 className="text-sm font-black uppercase tracking-widest text-white">Cierre del día</h2>
                <span className="text-xs text-neutral-500">
                    {written && !dirty ? 'guardado' : open ? 'tres respuestas cortas' : 'para la noche'}
                </span>
                <ChevronDown size={14} className={cn('ml-auto self-center text-neutral-600 transition-transform', open && 'rotate-180')} />
            </button>
            <AnimatePresence initial={false}>
                {open && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.22 }} className="overflow-hidden">
                        <div className="space-y-5 pt-5">
                            {PREGUNTAS.map(q => (
                                <label key={q.key} className="block">
                                    <span className="text-sm text-neutral-300">{q.text}</span>
                                    {/* Se guarda solo al salir del campo: no hay botón que olvidar. */}
                                    <textarea rows={2} value={answers[q.key]} onBlur={persist}
                                        onChange={e => setAnswers(a => ({ ...a, [q.key]: e.target.value }))} className={line} />
                                </label>
                            ))}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </section>
    );
}

// ── Tema de la semana ───────────────────────────────────────────────────

const THEMES = [
    {
        title: 'Responsabilidad',
        pasos: [
            'Escribe 3 excusas que te diste esta semana: tus balones fuera.',
            'Reescribe cada una como “depende de mí: puedo hacer X”.',
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
            'Ejecútalo en 48 horas, en su versión imperfecta.',
            'Antes, 5 minutos de premortem: qué puede salir mal y cómo lo evitas.',
        ],
    },
    {
        title: 'Opinión ajena y personas',
        pasos: [
            'Anota qué decisión estás frenando por el qué dirán.',
            'Reescribe lo que te dices sobre esa decisión.',
            'Contacta a una persona clave esta semana.',
        ],
    },
];

function WeeklyTheme({ themeStart }: { themeStart: string }) {
    const dias = Math.max(0, differenceInCalendarDays(getHabitDay(), new Date(themeStart)));
    const semana = Math.floor(dias / 7) % THEMES.length;
    const quedan = 7 - (dias % 7);
    const tema = THEMES[semana];

    return (
        <section className={cn(panel, 'p-5 lg:p-6')}>
            <p className="font-mono text-[11px] text-neutral-500">
                semana {semana + 1}/4 · {quedan === 1 ? 'último día' : `quedan ${quedan} días`}
            </p>
            <h2 className="text-2xl font-black tracking-tight text-white mt-1 mb-4">{tema.title}</h2>
            <ol className="space-y-3">
                {tema.pasos.map((paso, i) => (
                    <li key={i} className="flex gap-4 text-sm text-neutral-300 leading-relaxed">
                        <span className="font-mono text-[11px] pt-0.5 shrink-0" style={{ color: ACCENT }}>{String(i + 1).padStart(2, '0')}</span>
                        {paso}
                    </li>
                ))}
            </ol>
        </section>
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
                    <h2 className="text-xl font-bold text-white tracking-wide">Revisión de la semana</h2>
                    <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full text-neutral-400 transition-colors" aria-label="Cerrar">
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    <div className="space-y-4">
                        {PILLAR_IDS.map(id => (
                            <div key={id}>
                                <p className="text-[13px] font-black uppercase tracking-wide text-white mb-1">{PILLAR_META[id].label}</p>
                                <Scale value={scores[id]} onChange={v => setScores(s => ({ ...s, [id]: v }))} />
                            </div>
                        ))}
                    </div>
                    <label className="block">
                        <span className="text-sm text-neutral-300">¿Cómo fue la semana?</span>
                        <textarea rows={3} value={reflexion} onChange={e => setReflexion(e.target.value)} className={line} />
                    </label>
                    <label className="block">
                        <span className="text-sm text-neutral-300">¿Qué mejoré un 1%?</span>
                        <textarea rows={2} value={mejora1pct} onChange={e => setMejora1pct(e.target.value)} className={line} />
                    </label>
                    <label className="block">
                        <span className="text-sm text-neutral-300">¿Qué pospuse por pensar?</span>
                        <textarea rows={2} value={pospuse} onChange={e => setPospuse(e.target.value)} className={line} />
                    </label>
                </div>

                <div className="p-6 border-t border-white/5">
                    <button onClick={save}
                        className="w-full py-3 rounded-xl text-black text-sm font-black uppercase tracking-wide transition-opacity hover:opacity-90"
                        style={{ background: ACCENT }}>
                        Guardar
                    </button>
                </div>
            </motion.div>
        </div>
    );
}

// ── Página ──────────────────────────────────────────────────────────────

export default function PillarsPage() {
    const navigate = useNavigate();
    const { pillars, reviews, closes, themeStart } = usePillarsStore();
    const { habits } = useHabitStore();
    const [openId, setOpenId] = useState<PillarId | null>(null);
    const [reviewOpen, setReviewOpen] = useState(false);

    const openPillar = (id: PillarId) => {
        setOpenId(id);
        // Un instante para que la fila se abra antes de llevarte a ella.
        setTimeout(() => document.getElementById(`pilar-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 60);
    };

    const promedio = PILLAR_IDS.reduce((s, id) => s + pillars[id].scoreA, 0) / PILLAR_IDS.length;
    // El pilar más lejos de su meta.
    const lejos = [...PILLAR_IDS].sort((a, b) => (pillars[b].scoreB - pillars[b].scoreA) - (pillars[a].scoreB - pillars[a].scoreA))[0];
    const brecha = pillars[lejos].scoreB - pillars[lejos].scoreA;

    const date = todayKey();
    const enFoco = PILLAR_IDS.filter(id => pillars[id].enFoco);
    const hechos = enFoco.filter(id =>
        !!closes.find(c => c.date === date)?.done[id] ||
        !!habits.find(h => h.pillar === id && h.type === 'boolean' && !h.archived)?.logs[date]?.completed).length;

    const esDomingo = getHabitDay().getDay() === 0;
    const ultima = reviews.at(-1);

    return (
        <div className="min-h-screen w-full bg-[#0a0a0a] text-white p-4 md:p-6 lg:p-8 pb-40 lg:pb-16 font-sans">
            <header className="mb-4 lg:mb-6 flex items-center gap-3">
                <button onClick={() => navigate('/')} aria-label="Volver al Tracker"
                    className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 text-neutral-400 hover:text-white hover:bg-white/10 transition-all flex items-center justify-center">
                    <ChevronLeft size={16} />
                </button>
                <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-white">Pilares</h1>
            </header>

            <div className="lg:grid lg:grid-cols-12 lg:gap-10 max-w-6xl">
                {/* El pentágono, a la izquierda y fijo, como el anillo en el Tracker */}
                <div className="lg:col-span-5 lg:sticky lg:top-8 lg:self-start flex flex-col items-center mb-6 lg:mb-0">
                    <PentagonRadar pillars={pillars} onSelect={openPillar} />
                    <p className="text-6xl lg:text-7xl font-black tracking-tighter tabular-nums leading-none mt-2" style={{ color: ACCENT }}>
                        {promedio.toFixed(1)}
                    </p>
                    <p className="text-[11px] font-bold uppercase tracking-[0.3em] mt-2" style={{ color: ACCENT }}>Equilibrio</p>
                    <p className="text-sm text-neutral-500 text-center mt-4 max-w-xs">
                        {brecha > 0 ? (
                            <>Lo más lejos de tu meta: <button onClick={() => openPillar(lejos)} className="text-white font-bold hover:underline underline-offset-4">{PILLAR_META[lejos].label}</button>, a {brecha} {brecha === 1 ? 'punto' : 'puntos'}.</>
                        ) : 'Todo en su meta. Toca subir alguna.'}
                    </p>
                </div>

                <div className="lg:col-span-7 space-y-4">
                    <section className={cn(panel, 'p-4 lg:p-5 relative overflow-hidden')}>
                        <div className="absolute top-0 left-0 right-0 h-px pointer-events-none"
                            style={{ background: 'linear-gradient(to right, transparent, rgb(var(--accent-500) / 0.3), transparent)' }} />
                        <div className="flex items-end justify-between pb-3 border-b border-white/[0.06]">
                            <h2 className="text-sm font-black tracking-widest uppercase text-white flex items-center gap-2">
                                <span className="w-1.5 h-1.5 rounded-full" style={{ background: ACCENT }} />
                                Hoy
                            </h2>
                            <span className="font-mono text-[11px] text-neutral-500">
                                {format(getHabitDay(), 'd MMM', { locale: es })} · {hechos}/{enFoco.length}
                            </span>
                        </div>
                        {PILLAR_IDS.map(id => (
                            <PillarRow key={id} pillar={pillars[id]} open={openId === id}
                                onToggleOpen={() => setOpenId(openId === id ? null : id)} />
                        ))}
                    </section>

                    <NightClose />
                    <WeeklyTheme themeStart={themeStart} />

                    <section className={cn(panel, 'p-5 lg:p-6 flex items-center gap-4')}
                        style={esDomingo ? { borderColor: 'rgb(var(--accent-500) / 0.4)' } : undefined}>
                        <div className="flex-1 min-w-0">
                            <h2 className="text-sm font-black uppercase tracking-widest text-white">
                                {esDomingo ? 'Hoy toca revisar la semana' : 'Revisión de la semana'}
                            </h2>
                            <p className="text-xs text-neutral-500 mt-1">
                                {ultima ? `Última: ${format(new Date(`${ultima.date}T12:00:00`), "d 'de' MMMM", { locale: es })}.` : 'Aún no hay ninguna.'} Tus puntajes pasan a ser tu punto de partida.
                            </p>
                        </div>
                        <button onClick={() => setReviewOpen(true)}
                            className={cn('px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wide transition-all shrink-0',
                                esDomingo ? 'text-black hover:opacity-90' : 'bg-white/5 border border-white/10 text-neutral-300 hover:bg-white/10')}
                            style={esDomingo ? { background: ACCENT } : undefined}>
                            Revisar
                        </button>
                    </section>
                </div>
            </div>

            <AnimatePresence>
                {reviewOpen && <WeeklyReviewModal onClose={() => setReviewOpen(false)} />}
            </AnimatePresence>
        </div>
    );
}
