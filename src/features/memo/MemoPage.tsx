import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { BookOpen, Check, ExternalLink, Loader2, RefreshCw, Shuffle, Sparkles, Trash2, X as XIcon } from 'lucide-react';
import { cn } from '../../utils/cn';
import { useTheme } from '../../hooks/useTheme';
import { useFabStore } from '../../hooks/useFabStore';
import { useAuth } from '../../context/AuthContext';
import { ReadingItem } from '../../types';
import { useMemoStore } from './useMemoStore';
import { currentNightKey, formatServeTime, readStreak, serveTimeToday } from './memoUtils';
import { fetchTldr } from '../../services/memo';

// ── Helpers ───────────────────────────────────────────────────────────────────
function timeUntil(target: Date, now: Date): string {
    const ms = Math.max(0, target.getTime() - now.getTime());
    const h = Math.floor(ms / 3_600_000);
    const m = Math.floor((ms % 3_600_000) / 60_000);
    if (h === 0) return `${m} min`;
    return `${h} h ${String(m).padStart(2, '0')} min`;
}

// ── Tonight card ──────────────────────────────────────────────────────────────
function TonightCard({ item, isFromLastNight, queueLeft }: { item: ReadingItem; isFromLastNight: boolean; queueLeft: number }) {
    const { markOpened, markRead, skipTonight, archiveItem, setTldr } = useMemoStore();
    const { user } = useAuth();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const requestedRef = useRef<string | null>(null);

    const generate = async () => {
        setLoading(true);
        setError(null);
        const res = await fetchTldr(item.url);
        if (res.ok) setTldr(item.id, res.tldr);
        else setError(res.message);
        setLoading(false);
    };

    // Auto-generate the TLDR once per item when logged in.
    useEffect(() => {
        if (item.tldr || !user || requestedRef.current === item.id) return;
        requestedRef.current = item.id;
        generate();
    }, [item.id, item.tldr, user]); // eslint-disable-line

    const open = () => {
        markOpened(item.id);
        window.open(item.url, '_blank', 'noopener,noreferrer');
    };

    return (
        <motion.div
            key={item.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="rounded-2xl border border-amber-500/20 bg-amber-500/[0.04] p-5 lg:p-6"
        >
            <div className="flex items-center justify-between mb-3">
                <span className="text-[10px] font-courier uppercase tracking-[0.2em] text-amber-400/80">
                    {isFromLastNight ? 'anoche · sigue pendiente' : 'esta noche'}
                </span>
                <span className="text-[11px] font-courier text-white/40">{item.label}</span>
            </div>

            <p className="font-cormorant italic text-2xl lg:text-3xl text-white/90 leading-tight mb-4">
                {item.tldr?.title ?? (item.note || item.label)}
            </p>

            {item.tldr ? (
                <ul className="space-y-2 mb-4">
                    {item.tldr.lines.map((line, i) => (
                        <li key={i} className="flex gap-3 font-courier text-[13px] text-white/75 leading-relaxed">
                            <span className="text-amber-400/60 shrink-0">{i + 1}.</span>
                            <span>{line}</span>
                        </li>
                    ))}
                    {item.tldr.why && (
                        <li className="font-courier text-[12px] italic text-white/45 pt-1">→ {item.tldr.why}</li>
                    )}
                </ul>
            ) : loading ? (
                <div className="flex items-center gap-2 text-[12px] font-courier text-white/40 mb-4">
                    <Loader2 size={12} className="animate-spin" /> Memo está leyendo por ti…
                </div>
            ) : (
                <div className="mb-4 space-y-2">
                    <p className="font-courier text-[12px] text-white/40">
                        {error ?? (user ? 'Sin TLDR todavía.' : 'Inicia sesión para que Memo lo resuma.')}
                    </p>
                    {user && (
                        <button onClick={generate} className="flex items-center gap-1.5 text-[11px] font-courier text-amber-400/80 hover:text-amber-300 transition-colors">
                            <Sparkles size={11} /> generar TLDR
                        </button>
                    )}
                </div>
            )}

            <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-white/[0.06]">
                <button
                    onClick={open}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-white text-black text-[12px] font-courier font-bold active:scale-95 transition-transform"
                >
                    <ExternalLink size={13} /> abrir
                </button>
                <button
                    onClick={() => markRead(item.id)}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-full border border-emerald-500/30 text-emerald-300 text-[12px] font-courier hover:bg-emerald-500/10 transition-colors"
                >
                    <Check size={13} /> leído
                </button>
                {queueLeft > 0 && (
                    <button
                        onClick={skipTonight}
                        title="Cambiar por otro de la cola"
                        className="flex items-center gap-1.5 px-3 py-2 rounded-full text-white/45 text-[12px] font-courier hover:text-white hover:bg-white/5 transition-colors"
                    >
                        <Shuffle size={13} /> otro
                    </button>
                )}
                <button
                    onClick={() => archiveItem(item.id)}
                    title="Ya no me interesa"
                    className="ml-auto flex items-center gap-1.5 px-2 py-2 rounded-full text-white/30 text-[12px] font-courier hover:text-red-400 transition-colors"
                >
                    <XIcon size={13} /> no me interesa
                </button>
            </div>
        </motion.div>
    );
}

// ── Queue row ─────────────────────────────────────────────────────────────────
function QueueRow({ item }: { item: ReadingItem }) {
    const { removeItem, restoreItem, markRead } = useMemoStore();
    const isRead = item.status === 'read';
    return (
        <li className="group flex items-start gap-3 py-2.5 border-b border-white/[0.04] last:border-0">
            <span className={cn("mt-1 w-1.5 h-1.5 rounded-full shrink-0", isRead ? "bg-emerald-400/60" : item.status === 'archived' ? "bg-white/15" : "bg-amber-400/70")} />
            <div className="flex-1 min-w-0">
                <a
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={cn("block font-courier text-[13px] truncate transition-colors", isRead ? "text-white/35 line-through" : "text-white/75 hover:text-white")}
                >
                    {item.tldr?.title ?? item.note ?? item.url.replace(/^https?:\/\//, '')}
                </a>
                <p className="text-[10px] font-courier text-white/30 truncate">
                    {item.label} · {format(new Date(item.addedAt), "d MMM", { locale: es })}
                    {item.servedDates.length > 0 && !isRead && ` · ofrecido ${item.servedDates.length}×`}
                </p>
            </div>
            <div className="flex items-center gap-1 shrink-0 opacity-60 group-hover:opacity-100 transition-opacity">
                {item.status === 'queue' && (
                    <button onClick={() => markRead(item.id)} title="Marcar leído" className="p-1 text-white/35 hover:text-emerald-400 transition-colors"><Check size={13} /></button>
                )}
                {item.status !== 'queue' && (
                    <button onClick={() => restoreItem(item.id)} title="Volver a la cola" className="p-1 text-white/35 hover:text-amber-300 transition-colors"><RefreshCw size={12} /></button>
                )}
                <button onClick={() => removeItem(item.id)} title="Eliminar" className="p-1 text-white/25 hover:text-red-400 transition-colors"><Trash2 size={13} /></button>
            </div>
        </li>
    );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function MemoPage() {
    const { theme } = useTheme();
    const isAccion = theme === 'accion';
    const { items, settings, tonight, addFromText, ensureTonight, setServeTime } = useMemoStore();
    const { fabActionTick } = useFabStore();

    const [now, setNow] = useState(new Date());
    const [input, setInput] = useState('');
    const [flash, setFlash] = useState<string | null>(null);
    const [tab, setTab] = useState<'cola' | 'leídos'>('cola');
    const [editingTime, setEditingTime] = useState(false);
    const inputRef = useRef<HTMLTextAreaElement>(null);

    // Clock + nightly assignment
    useEffect(() => {
        ensureTonight(new Date());
        const t = setInterval(() => {
            const d = new Date();
            setNow(d);
            ensureTonight(d);
        }, 30_000);
        return () => clearInterval(t);
    }, [ensureTonight, settings.hour, settings.minute, items.length]);

    // FAB focuses the paste box
    useEffect(() => {
        if (fabActionTick > 0) inputRef.current?.focus();
    }, [fabActionTick]);

    const queue = useMemo(() => items.filter(i => i.status === 'queue').sort((a, b) => b.addedAt - a.addedAt), [items]);
    const done = useMemo(() => items.filter(i => i.status !== 'queue').sort((a, b) => (b.readAt ?? b.addedAt) - (a.readAt ?? a.addedAt)), [items]);
    const readCount = items.filter(i => i.status === 'read').length;
    const streak = readStreak(items, now);

    const { key: nightKey, startedToday } = currentNightKey(now, settings);
    const tonightItem = tonight?.date === nightKey ? items.find(i => i.id === tonight.itemId) ?? null : null;
    const tonightPending = tonightItem && tonightItem.status === 'queue' ? tonightItem : null;
    const tonightDone = tonightItem && tonightItem.status !== 'queue';
    const nextServe = startedToday
        ? new Date(serveTimeToday(now, settings).getTime() + 86_400_000)
        : serveTimeToday(now, settings);

    const submit = () => {
        const added = addFromText(input);
        if (added > 0) {
            setInput('');
            setFlash(added === 1 ? 'guardado. lo verás una noche de estas.' : `${added} guardados. uno por noche, sin apilar.`);
        } else {
            setFlash(input.trim() ? 'no encontré links nuevos ahí.' : null);
        }
        setTimeout(() => setFlash(null), 2500);
    };

    return (
        <div className={cn("min-h-screen font-courier pb-32 lg:pb-12 transition-colors duration-500", isAccion ? "bg-[#000000]" : "bg-[#050505]")}>
            <div className="max-w-2xl mx-auto px-6 lg:px-8 pt-8 lg:pt-12">

                {/* ── Header ── */}
                <div className="flex items-start justify-between mb-6">
                    <div>
                        <h1 className="flex items-center gap-2 text-2xl font-bold text-white/90 leading-none">
                            <BookOpen size={20} className="text-amber-400" /> Memo
                        </h1>
                        <p className="font-cormorant italic text-white/45 text-lg mt-2 leading-snug">
                            el primo que te reenvía el hilo y al rato te pregunta "¿lo leíste o no?"
                        </p>
                    </div>
                    <button
                        onClick={() => setEditingTime(v => !v)}
                        className="text-[11px] font-courier text-white/40 hover:text-white/70 transition-colors shrink-0 pt-1"
                        title="Cambiar hora de entrega"
                    >
                        {formatServeTime(settings)}
                    </button>
                </div>

                <AnimatePresence>
                    {editingTime && (
                        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden mb-4">
                            <div className="flex items-center gap-3 text-[12px] text-white/60 border border-white/10 rounded-xl px-4 py-3">
                                <span>te lo suelto a las</span>
                                <input
                                    type="time"
                                    value={formatServeTime(settings)}
                                    onChange={e => {
                                        const [h, m] = e.target.value.split(':').map(Number);
                                        if (!isNaN(h) && !isNaN(m)) setServeTime(h, m);
                                    }}
                                    className="bg-transparent border-b border-white/20 text-white outline-none font-courier"
                                />
                                <span className="text-white/30">hora local</span>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* ── Stats strip ── */}
                <div className="flex items-center gap-4 text-[11px] text-white/40 mb-6">
                    <span><b className="text-white/70">{queue.length}</b> en cola</span>
                    <span><b className="text-white/70">{readCount}</b> leídos</span>
                    <span><b className={cn(streak > 0 ? "text-amber-300" : "text-white/70")}>{streak}</b> noches seguidas</span>
                </div>

                {/* ── Tonight ── */}
                <section className="mb-8">
                    <AnimatePresence mode="wait">
                        {tonightPending ? (
                            <TonightCard item={tonightPending} isFromLastNight={!startedToday} queueLeft={queue.length - 1} />
                        ) : (
                            <motion.div
                                key={tonightDone ? 'done' : queue.length === 0 ? 'empty' : 'waiting'}
                                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                                className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5 lg:p-6"
                            >
                                {tonightDone ? (
                                    <>
                                        <p className="font-cormorant italic text-2xl text-white/85 mb-1">Listo por hoy.</p>
                                        <p className="text-[12px] text-white/40">El siguiente cae mañana a las {formatServeTime(settings)}. El resto espera.</p>
                                    </>
                                ) : queue.length === 0 ? (
                                    <>
                                        <p className="font-cormorant italic text-2xl text-white/85 mb-1">Cola vacía.</p>
                                        <p className="text-[12px] text-white/40">Pega abajo los links que guardas en X y no lees. Memo te suelta uno por noche.</p>
                                    </>
                                ) : (
                                    <>
                                        <p className="font-cormorant italic text-2xl text-white/85 mb-1">Esta noche a las {formatServeTime(settings)}.</p>
                                        <p className="text-[12px] text-white/40">Faltan {timeUntil(nextServe, now)}. Uno solo, con TLDR. Sin apilar.</p>
                                    </>
                                )}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </section>

                {/* ── Add ── */}
                <section className="mb-8">
                    <textarea
                        ref={inputRef}
                        value={input}
                        onChange={e => setInput(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) submit(); }}
                        placeholder="pega uno o varios links de X (o de donde sea)…"
                        rows={2}
                        className="w-full bg-transparent border border-white/10 focus:border-amber-500/40 rounded-xl px-4 py-3 text-[13px] font-courier text-white/80 placeholder-white/25 outline-none resize-none transition-colors"
                    />
                    <div className="flex items-center justify-between mt-2">
                        <span className="text-[11px] font-courier text-white/35 h-4">{flash ?? ''}</span>
                        <button
                            onClick={submit}
                            disabled={!input.trim()}
                            className="text-[12px] font-courier text-amber-300 disabled:text-white/20 hover:text-amber-200 transition-colors"
                        >
                            guardar →
                        </button>
                    </div>
                </section>

                {/* ── Lists ── */}
                <nav className="flex items-center gap-4 mb-3 border-b border-white/5 pb-3">
                    {(['cola', 'leídos'] as const).map(v => (
                        <button
                            key={v}
                            onClick={() => setTab(v)}
                            className={cn("text-[12px] font-courier pb-1 transition-all", tab === v ? "text-white border-b border-amber-400/60" : "text-white/40 hover:text-white/70")}
                        >
                            {v} <span className="text-white/30">{v === 'cola' ? queue.length : done.length}</span>
                        </button>
                    ))}
                </nav>
                <ul>
                    {(tab === 'cola' ? queue : done).map(item => <QueueRow key={item.id} item={item} />)}
                    {(tab === 'cola' ? queue : done).length === 0 && (
                        <li className="font-cormorant italic text-white/20 text-center text-lg py-6">
                            {tab === 'cola' ? 'nada esperando' : 'todavía nada leído'}
                        </li>
                    )}
                </ul>

                <p className="mt-10 text-[10px] font-courier text-white/25 leading-relaxed">
                    Tip iPhone: Atajos → Automatización → Hora del día {formatServeTime(settings)} → Abrir URL de Congruence en /memo.
                    Y desde X, "Compartir" → atajo "Guardar en Memo" (ver supabase/functions/add-reading/README.md).
                </p>
            </div>
        </div>
    );
}
