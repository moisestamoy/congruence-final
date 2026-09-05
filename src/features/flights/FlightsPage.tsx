import { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import {
    Plane, ArrowRightLeft, ArrowRight, Search, ExternalLink, Bell, BellRing, Trash2,
    RefreshCw, Loader2, AlertTriangle, Info, CalendarDays, Sparkles, X,
} from 'lucide-react';
import { cn } from '../../utils/cn';
import { useFlightStore } from './useFlightStore';
import { FlightOffer, FlightQuery, MaxStops, SavedSearch } from './types';
import { AIRLINES, buildDeepLinks, formatDuration, formatMoney, searchFlights, stopsLabel, validateQuery } from './flightService';

const STOP_OPTIONS: { value: MaxStops; label: string; hint: string }[] = [
    { value: 0, label: 'Directo', hint: 'Sin escalas' },
    { value: 1, label: 'Máx. 1', hint: 'Hasta 1 escala' },
    { value: 2, label: 'Máx. 2', hint: 'Hasta 2 escalas' },
];
const CURRENCIES = ['EUR', 'USD', 'MXN', 'ARS', 'COP', 'CLP', 'BRL', 'GBP'];

const fmtDate = (iso: string | null, withTime = true) => {
    if (!iso) return '—';
    try {
        return format(parseISO(iso), withTime ? "EEE d MMM · HH:mm" : 'EEE d MMM', { locale: es });
    } catch { return iso; }
};
const fmtMonthOrDate = (d: string) => {
    try {
        return d.length === 7 ? format(parseISO(`${d}-01`), 'MMMM yyyy', { locale: es }) : format(parseISO(d), 'd MMM yyyy', { locale: es });
    } catch { return d; }
};

// ── INPUTS ───────────────────────────────────────────────────────────────────
const fieldCls = "w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2.5 text-sm text-white placeholder-neutral-600 outline-none focus:border-sky-500/50 focus:bg-white/[0.06] transition-colors";
const labelCls = "block text-[10px] font-black uppercase tracking-widest text-neutral-500 mb-1.5";

function IataInput({ label, value, onChange, placeholder, recent }: {
    label: string; value: string; onChange: (v: string) => void; placeholder: string; recent: string[];
}) {
    const suggestions = recent.filter(c => c !== value);
    return (
        <div>
            <label className={labelCls}>{label}</label>
            <input
                value={value}
                onChange={e => onChange(e.target.value.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 3))}
                placeholder={placeholder}
                maxLength={3}
                className={cn(fieldCls, "font-courier tracking-[0.3em] uppercase text-base")}
            />
            {suggestions.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1.5">
                    {suggestions.slice(0, 5).map(c => (
                        <button key={c} type="button" onClick={() => onChange(c)}
                            className="px-2 py-0.5 rounded-md text-[10px] font-courier bg-white/[0.04] border border-white/[0.06] text-neutral-500 hover:text-white hover:bg-white/[0.08] transition-colors">
                            {c}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}

// ── RESULT CARD ──────────────────────────────────────────────────────────────
function OfferCard({ f, isBest, roundTrip }: { f: FlightOffer; isBest: boolean; roundTrip: boolean }) {
    const airline = f.airline ? (AIRLINES[f.airline] ?? f.airline) : 'Aerolínea';
    const worstStops = Math.max(f.stops, f.returnStops ?? 0);
    return (
        <motion.div
            layout
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className={cn(
                "relative rounded-2xl border p-4 flex flex-col sm:flex-row sm:items-center gap-3",
                isBest ? "bg-sky-500/[0.07] border-sky-500/30" : "bg-white/[0.02] border-white/[0.06] hover:bg-white/[0.04]"
            )}
        >
            {isBest && (
                <span className="absolute -top-2 left-4 px-2 py-0.5 rounded-full bg-sky-500 text-black text-[9px] font-black uppercase tracking-widest">
                    Más barato
                </span>
            )}
            <div className="flex-1 min-w-0 space-y-1.5">
                <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-bold text-white truncate">{airline}</span>
                    {f.flightNumber && <span className="text-[11px] font-courier text-neutral-500">{f.airline}{f.flightNumber}</span>}
                    <span className={cn(
                        "px-2 py-0.5 rounded-full text-[10px] font-bold",
                        worstStops === 0 ? "bg-emerald-500/15 text-emerald-400" : worstStops === 1 ? "bg-amber-500/15 text-amber-400" : "bg-rose-500/15 text-rose-400"
                    )}>
                        {stopsLabel(worstStops)}
                    </span>
                </div>
                <div className="flex items-center gap-2 text-xs text-neutral-400 font-courier">
                    <span className="text-white/90">{f.origin}</span>
                    <ArrowRight size={12} className="text-neutral-600" />
                    <span className="text-white/90">{f.destination}</span>
                    <span className="text-neutral-600">·</span>
                    <span>{fmtDate(f.departureAt)}</span>
                    <span className="text-neutral-600">·</span>
                    <span>{formatDuration(f.durationToMinutes ?? f.durationMinutes)}</span>
                </div>
                {roundTrip && f.returnAt && (
                    <div className="flex items-center gap-2 text-xs text-neutral-400 font-courier">
                        <span className="text-white/90">{f.destination}</span>
                        <ArrowRight size={12} className="text-neutral-600" />
                        <span className="text-white/90">{f.origin}</span>
                        <span className="text-neutral-600">·</span>
                        <span>{fmtDate(f.returnAt)}</span>
                        <span className="text-neutral-600">·</span>
                        <span>{formatDuration(f.durationBackMinutes)}</span>
                        {f.returnStops != null && <span className="text-neutral-600">· {stopsLabel(f.returnStops).toLowerCase()}</span>}
                    </div>
                )}
            </div>
            <div className="flex items-center justify-between sm:flex-col sm:items-end gap-2 shrink-0">
                <span className={cn("text-2xl font-black tracking-tight", isBest ? "text-sky-300" : "text-white")}>
                    {formatMoney(f.price, f.currency)}
                </span>
                {f.bookingUrl && (
                    <a href={f.bookingUrl} target="_blank" rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white text-black text-xs font-bold hover:bg-neutral-200 transition-colors">
                        Ver <ExternalLink size={12} />
                    </a>
                )}
            </div>
        </motion.div>
    );
}

// ── SAVED SEARCH ROW ─────────────────────────────────────────────────────────
function SavedRow({ s, onRun, onRemove, running }: { s: SavedSearch; onRun: () => void; onRemove: () => void; running: boolean }) {
    const hit = s.targetPrice != null && s.lastBestPrice != null && s.lastBestPrice <= s.targetPrice;
    return (
        <div className={cn(
            "rounded-xl border p-3 flex items-center gap-3",
            hit ? "bg-emerald-500/[0.06] border-emerald-500/25" : "bg-white/[0.02] border-white/[0.06]"
        )}>
            <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center shrink-0", hit ? "bg-emerald-500/15 text-emerald-400" : "bg-white/[0.04] text-neutral-500")}>
                {hit ? <BellRing size={15} /> : <Bell size={15} />}
            </div>
            <button onClick={onRun} className="flex-1 min-w-0 text-left">
                <div className="text-sm font-bold text-white truncate">{s.name}</div>
                <div className="text-[11px] font-courier text-neutral-500 truncate">
                    {s.query.origin} → {s.query.destination} · {fmtMonthOrDate(s.query.departDate)}{s.query.returnDate ? ` → ${fmtMonthOrDate(s.query.returnDate)}` : ''} · {stopsLabel(s.query.maxStops).toLowerCase()}
                    {s.targetPrice != null && ` · objetivo ${formatMoney(s.targetPrice, s.query.currency)}`}
                </div>
                <div className="text-[11px] text-neutral-400 mt-0.5">
                    {s.lastBestPrice != null
                        ? <>Mejor precio: <span className={hit ? "text-emerald-400 font-bold" : "text-white"}>{formatMoney(s.lastBestPrice, s.query.currency)}</span> · {s.lastCheckedAt ? format(s.lastCheckedAt, "d MMM HH:mm", { locale: es }) : ''}</>
                        : s.lastCheckedAt ? 'Sin resultados en la última revisión' : 'Aún no revisada'}
                </div>
            </button>
            <button onClick={onRun} disabled={running} title="Revisar ahora"
                className="w-8 h-8 rounded-lg flex items-center justify-center text-neutral-500 hover:text-sky-400 hover:bg-sky-500/10 transition-colors disabled:opacity-40">
                {running ? <Loader2 size={15} className="animate-spin" /> : <RefreshCw size={15} />}
            </button>
            <button onClick={onRemove} title="Eliminar"
                className="w-8 h-8 rounded-lg flex items-center justify-center text-neutral-600 hover:text-rose-400 hover:bg-rose-500/10 transition-colors">
                <Trash2 size={15} />
            </button>
        </div>
    );
}

// ── PAGE ─────────────────────────────────────────────────────────────────────
export default function FlightsPage() {
    const {
        query, results, lastFetchedAt, savedSearches, recentAirports,
        setQuery, setResults, clearResults, rememberAirports, saveSearch, recordCheck, removeSavedSearch,
    } = useFlightStore();

    const [loading, setLoading] = useState(false);
    const [runningId, setRunningId] = useState<string | null>(null);
    const [error, setError] = useState<{ code: string; message: string } | null>(null);
    const [searched, setSearched] = useState(false);
    const [flexible, setFlexible] = useState(query.departDate.length === 7);
    const [saveOpen, setSaveOpen] = useState(false);
    const [saveName, setSaveName] = useState('');
    const [saveTarget, setSaveTarget] = useState('');

    const roundTrip = query.returnDate !== null;
    const validation = validateQuery(query);
    const deepLinks = useMemo(() => (validation ? [] : buildDeepLinks(query)), [query, validation]);

    const swap = () => setQuery({ origin: query.destination, destination: query.origin });

    const toggleFlexible = (on: boolean) => {
        setFlexible(on);
        setQuery({
            departDate: on ? query.departDate.slice(0, 7) : (query.departDate.length === 7 ? `${query.departDate}-15` : query.departDate),
            returnDate: query.returnDate ? (on ? query.returnDate.slice(0, 7) : (query.returnDate.length === 7 ? `${query.returnDate}-22` : query.returnDate)) : null,
        });
    };

    const runQuery = async (q: FlightQuery) => {
        setLoading(true);
        setError(null);
        setSearched(true);
        const res = await searchFlights(q);
        if (res.ok) {
            setResults(res.flights, res.fetchedAt);
            rememberAirports(q.origin, q.destination);
        } else {
            clearResults();
            setError({ code: res.code, message: res.message });
        }
        setLoading(false);
        return res;
    };

    const handleSearch = () => {
        if (validation) { setError({ code: 'validation', message: validation }); setSearched(true); return; }
        runQuery(query);
    };

    const runSaved = async (s: SavedSearch) => {
        setRunningId(s.id);
        setQuery(s.query);
        setFlexible(s.query.departDate.length === 7);
        const res = await runQuery(s.query);
        if (res.ok) {
            const best = res.flights[0] ?? null;
            recordCheck(s.id, best?.price ?? null, best?.id ?? null);
        } else {
            recordCheck(s.id, null, null);
        }
        setRunningId(null);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const confirmSave = () => {
        const name = saveName.trim() || `${query.origin} → ${query.destination}`;
        const target = saveTarget.trim() ? Number(saveTarget.replace(',', '.')) : null;
        saveSearch(name, query, target && target > 0 ? target : null);
        setSaveOpen(false); setSaveName(''); setSaveTarget('');
    };

    const bestPrice = results[0]?.price ?? null;

    return (
        <div className="min-h-screen w-full bg-[#0a0a0a] text-white p-4 md:p-6 lg:p-8 overflow-y-auto pb-40 lg:pb-16 font-sans">
            <div className="max-w-3xl mx-auto">

                {/* ── HEADER ── */}
                <header className="mb-6">
                    <div className="flex items-center gap-3 mb-1">
                        <div className="w-10 h-10 rounded-xl bg-sky-500/15 border border-sky-500/20 flex items-center justify-center">
                            <Plane size={18} className="text-sky-400" />
                        </div>
                        <h1 className="text-3xl sm:text-4xl font-black tracking-tight">Vuelos</h1>
                    </div>
                    <p className="text-sm text-neutral-500">Lo más barato para tu ruta, sin vuelos de 5 escalas.</p>
                </header>

                {/* ── SEARCH FORM ── */}
                <section className="rounded-2xl bg-white/[0.02] border border-white/[0.06] p-4 md:p-5 space-y-4">
                    {/* Trip type + flexible */}
                    <div className="flex flex-wrap items-center gap-2">
                        <div className="flex gap-1 bg-white/[0.04] border border-white/[0.07] rounded-xl p-1">
                            <button onClick={() => setQuery({ returnDate: null })}
                                className={cn("px-3 py-1.5 rounded-lg text-xs font-bold transition-all", !roundTrip ? "bg-white text-black" : "text-neutral-400 hover:text-white")}>
                                Solo ida
                            </button>
                            <button onClick={() => setQuery({ returnDate: query.returnDate ?? (flexible ? query.departDate.slice(0, 7) : query.departDate) })}
                                className={cn("px-3 py-1.5 rounded-lg text-xs font-bold transition-all", roundTrip ? "bg-white text-black" : "text-neutral-400 hover:text-white")}>
                                Ida y vuelta
                            </button>
                        </div>
                        <button onClick={() => toggleFlexible(!flexible)}
                            className={cn(
                                "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all",
                                flexible ? "bg-sky-500/15 border-sky-500/30 text-sky-300" : "bg-white/[0.04] border-white/[0.07] text-neutral-400 hover:text-white"
                            )}>
                            <CalendarDays size={13} />
                            {flexible ? 'Mes completo' : 'Fecha exacta'}
                        </button>
                    </div>

                    {/* Route */}
                    <div className="grid grid-cols-[1fr_auto_1fr] gap-2 items-start">
                        <IataInput label="Origen" value={query.origin} onChange={v => setQuery({ origin: v })} placeholder="MAD" recent={recentAirports} />
                        <button onClick={swap} title="Invertir ruta"
                            className="mt-6 w-9 h-9 rounded-lg bg-white/[0.04] border border-white/[0.08] flex items-center justify-center text-neutral-500 hover:text-sky-400 hover:border-sky-500/30 transition-colors">
                            <ArrowRightLeft size={14} />
                        </button>
                        <IataInput label="Destino" value={query.destination} onChange={v => setQuery({ destination: v })} placeholder="BCN" recent={recentAirports} />
                    </div>

                    {/* Dates */}
                    <div className={cn("grid gap-2", roundTrip ? "grid-cols-2" : "grid-cols-1")}>
                        <div>
                            <label className={labelCls}>{flexible ? 'Mes de ida' : 'Ida'}</label>
                            <input type={flexible ? 'month' : 'date'} value={query.departDate}
                                onChange={e => setQuery({ departDate: e.target.value })}
                                className={cn(fieldCls, "[color-scheme:dark]")} />
                        </div>
                        {roundTrip && (
                            <div>
                                <label className={labelCls}>{flexible ? 'Mes de vuelta' : 'Vuelta'}</label>
                                <input type={flexible ? 'month' : 'date'} value={query.returnDate ?? ''} min={query.departDate}
                                    onChange={e => setQuery({ returnDate: e.target.value })}
                                    className={cn(fieldCls, "[color-scheme:dark]")} />
                            </div>
                        )}
                    </div>

                    {/* Stops + currency + budget */}
                    <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_auto] gap-3 items-end">
                        <div>
                            <label className={labelCls}>Escalas máximas</label>
                            <div className="flex gap-1 bg-white/[0.04] border border-white/[0.07] rounded-xl p-1">
                                {STOP_OPTIONS.map(o => (
                                    <button key={o.value} onClick={() => setQuery({ maxStops: o.value })} title={o.hint}
                                        className={cn("flex-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-all",
                                            query.maxStops === o.value ? "bg-sky-500 text-black" : "text-neutral-400 hover:text-white")}>
                                        {o.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div>
                            <label className={labelCls}>Moneda</label>
                            <select value={query.currency} onChange={e => setQuery({ currency: e.target.value })}
                                className={cn(fieldCls, "font-courier [color-scheme:dark] sm:w-24")}>
                                {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className={labelCls}>Presupuesto máx.</label>
                            <input type="number" min={0} inputMode="decimal" placeholder="Opcional"
                                value={query.maxPrice ?? ''}
                                onChange={e => setQuery({ maxPrice: e.target.value ? Number(e.target.value) : null })}
                                className={cn(fieldCls, "font-courier sm:w-32")} />
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-wrap items-center gap-2 pt-1">
                        <button onClick={handleSearch} disabled={loading}
                            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white text-black text-sm font-black hover:bg-neutral-200 transition-colors disabled:opacity-50">
                            {loading ? <Loader2 size={15} className="animate-spin" /> : <Search size={15} />}
                            Buscar
                        </button>
                        <button onClick={() => { if (validation) { setError({ code: 'validation', message: validation }); setSearched(true); return; } setSaveOpen(true); }}
                            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-sm font-bold text-neutral-300 hover:text-white hover:bg-white/[0.08] transition-colors">
                            <Bell size={14} /> Guardar alerta
                        </button>
                    </div>

                    {/* Deep links */}
                    {deepLinks.length > 0 && (
                        <div className="border-t border-white/[0.06] pt-3">
                            <div className="text-[10px] font-black uppercase tracking-widest text-neutral-600 mb-2">
                                Abrir con tu filtro en
                            </div>
                            <div className="flex flex-wrap gap-2">
                                {deepLinks.map(l => (
                                    <a key={l.provider} href={l.url} target="_blank" rel="noopener noreferrer" title={l.note}
                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.03] border border-white/[0.07] text-xs font-bold text-neutral-300 hover:text-sky-300 hover:border-sky-500/30 transition-colors">
                                        {l.label} <ExternalLink size={11} className="opacity-60" />
                                    </a>
                                ))}
                            </div>
                        </div>
                    )}
                </section>

                {/* ── SAVE MODAL ── */}
                <AnimatePresence>
                    {saveOpen && (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
                            onClick={() => setSaveOpen(false)}>
                            <motion.div initial={{ scale: 0.95, y: 10 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 10 }}
                                onClick={e => e.stopPropagation()}
                                className="w-full max-w-sm bg-[#111] border border-white/10 rounded-2xl p-5 space-y-4">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-base font-black">Guardar alerta</h3>
                                    <button onClick={() => setSaveOpen(false)} className="text-neutral-500 hover:text-white"><X size={16} /></button>
                                </div>
                                <p className="text-xs text-neutral-500 font-courier">
                                    {query.origin} → {query.destination} · {fmtMonthOrDate(query.departDate)}{query.returnDate ? ` → ${fmtMonthOrDate(query.returnDate)}` : ''} · {stopsLabel(query.maxStops).toLowerCase()}
                                </p>
                                <div>
                                    <label className={labelCls}>Nombre</label>
                                    <input value={saveName} onChange={e => setSaveName(e.target.value)} placeholder={`${query.origin} → ${query.destination}`} className={fieldCls} autoFocus />
                                </div>
                                <div>
                                    <label className={labelCls}>Avísame si baja de ({query.currency})</label>
                                    <input type="number" min={0} inputMode="decimal" value={saveTarget} onChange={e => setSaveTarget(e.target.value)}
                                        placeholder={bestPrice != null ? String(Math.round(bestPrice * 0.85)) : 'Opcional'} className={cn(fieldCls, "font-courier")} />
                                </div>
                                <button onClick={confirmSave} className="w-full py-2.5 rounded-xl bg-white text-black text-sm font-black hover:bg-neutral-200 transition-colors">
                                    Guardar
                                </button>
                            </motion.div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* ── RESULTS ── */}
                <section className="mt-6 space-y-3">
                    {error && (
                        <div className={cn(
                            "rounded-xl border p-4 flex gap-3 text-sm",
                            error.code === 'not_configured' || error.code === 'auth' ? "bg-amber-500/[0.06] border-amber-500/20 text-amber-200" : "bg-rose-500/[0.06] border-rose-500/20 text-rose-200"
                        )}>
                            {error.code === 'not_configured' || error.code === 'auth' ? <Info size={18} className="shrink-0 mt-0.5" /> : <AlertTriangle size={18} className="shrink-0 mt-0.5" />}
                            <div className="space-y-1">
                                <div className="font-bold">
                                    {error.code === 'not_configured' ? 'Búsqueda en la app no configurada'
                                        : error.code === 'auth' ? 'Necesitas iniciar sesión'
                                        : error.code === 'validation' ? 'Revisa el formulario'
                                        : 'No se pudo buscar'}
                                </div>
                                <div className="text-xs opacity-80">{error.message}</div>
                                {error.code !== 'validation' && deepLinks.length > 0 && (
                                    <div className="text-xs opacity-80">Mientras tanto, usa los enlaces de arriba: ya llevan tu ruta, fechas y filtro de escalas.</div>
                                )}
                            </div>
                        </div>
                    )}

                    {loading && (
                        <div className="space-y-2">
                            {[0, 1, 2].map(i => <div key={i} className="h-20 rounded-2xl bg-white/[0.03] border border-white/[0.05] animate-pulse" />)}
                        </div>
                    )}

                    {!loading && results.length > 0 && (
                        <>
                            <div className="flex items-center justify-between px-1">
                                <div className="text-[10px] font-black uppercase tracking-widest text-neutral-500">
                                    {results.length} opciones · {stopsLabel(query.maxStops).toLowerCase()} · ordenadas por precio
                                </div>
                                {lastFetchedAt && (
                                    <div className="text-[10px] font-courier text-neutral-600">
                                        {format(parseISO(lastFetchedAt), 'HH:mm', { locale: es })}
                                    </div>
                                )}
                            </div>
                            <div className="rounded-xl bg-sky-500/[0.05] border border-sky-500/15 px-4 py-2.5 flex items-center gap-2 text-xs text-sky-200/80">
                                <Sparkles size={13} className="text-sky-400 shrink-0" />
                                Precios cacheados de búsquedas recientes. Antes de pagar, confirma en el enlace de la oferta.
                            </div>
                            <AnimatePresence initial={false}>
                                {results.map((f, i) => <OfferCard key={f.id} f={f} isBest={i === 0} roundTrip={roundTrip} />)}
                            </AnimatePresence>
                        </>
                    )}

                    {!loading && !error && searched && results.length === 0 && (
                        <div className="rounded-2xl border border-dashed border-white/[0.08] p-8 text-center space-y-2">
                            <Plane size={22} className="mx-auto text-neutral-600" />
                            <div className="text-sm font-bold text-neutral-300">Nada con {stopsLabel(query.maxStops).toLowerCase()} para esas fechas</div>
                            <div className="text-xs text-neutral-500">Prueba con “Mes completo”, sube el máximo de escalas o revisa los enlaces externos.</div>
                        </div>
                    )}
                </section>

                {/* ── SAVED SEARCHES ── */}
                <section className="mt-8">
                    <div className="flex items-center justify-between mb-3 px-1">
                        <h2 className="text-[10px] font-black uppercase tracking-widest text-neutral-500">Alertas guardadas</h2>
                        {savedSearches.length > 1 && (
                            <button
                                disabled={runningId !== null}
                                onClick={async () => { for (const s of savedSearches) await runSaved(s); }}
                                className="text-[10px] font-black uppercase tracking-widest text-sky-400 hover:text-sky-300 disabled:opacity-40">
                                Revisar todas
                            </button>
                        )}
                    </div>
                    {savedSearches.length === 0 ? (
                        <div className="rounded-xl border border-dashed border-white/[0.08] p-5 text-center text-xs text-neutral-500">
                            Guarda una ruta con un precio objetivo y revísala en un toque. Se marca en verde cuando baja de tu objetivo.
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {savedSearches.map(s => (
                                <SavedRow key={s.id} s={s} running={runningId === s.id} onRun={() => runSaved(s)} onRemove={() => removeSavedSearch(s.id)} />
                            ))}
                        </div>
                    )}
                </section>
            </div>
        </div>
    );
}
