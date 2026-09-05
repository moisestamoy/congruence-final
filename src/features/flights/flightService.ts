import { supabase } from '../../lib/supabase';
import { DeepLink, FlightQuery, FlightSearchResult } from './types';

const IATA_RE = /^[A-Z]{3}$/;
const DATE_RE = /^\d{4}-\d{2}(-\d{2})?$/;

export function validateQuery(q: FlightQuery): string | null {
    if (!IATA_RE.test(q.origin)) return 'Origen: usa un código IATA de 3 letras (ej. MAD).';
    if (!IATA_RE.test(q.destination)) return 'Destino: usa un código IATA de 3 letras (ej. BCN).';
    if (q.origin === q.destination) return 'Origen y destino no pueden ser iguales.';
    if (!DATE_RE.test(q.departDate)) return 'Elige una fecha (o mes) de ida.';
    if (q.returnDate && !DATE_RE.test(q.returnDate)) return 'La fecha de vuelta no es válida.';
    if (q.returnDate && q.returnDate < q.departDate) return 'La vuelta no puede ser antes que la ida.';
    return null;
}

export async function searchFlights(q: FlightQuery): Promise<FlightSearchResult> {
    const invalid = validateQuery(q);
    if (invalid) return { ok: false, code: 'validation', message: invalid };

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
        return { ok: false, code: 'auth', message: 'Inicia sesión para buscar dentro de la app. Los enlaces externos funcionan igual.' };
    }

    try {
        const { data, error } = await supabase.functions.invoke('flight-search', {
            body: {
                origin: q.origin,
                destination: q.destination,
                departDate: q.departDate,
                returnDate: q.returnDate,
                maxStops: q.maxStops,
                currency: q.currency.toLowerCase(),
                maxPrice: q.maxPrice,
                market: 'es',
            },
        });
        if (error) throw error;
        if (data?.ok === true) {
            return { ok: true, flights: data.flights ?? [], totalFromProvider: data.totalFromProvider ?? 0, fetchedAt: data.fetchedAt };
        }
        return { ok: false, code: data?.code ?? 'provider_error', message: data?.message ?? 'Respuesta inesperada del servidor.' };
    } catch (err: any) {
        const status = err?.context?.status;
        if (status === 401) return { ok: false, code: 'auth', message: 'Tu sesión expiró. Vuelve a iniciar sesión.' };
        if (status === 404) return { ok: false, code: 'not_configured', message: 'La función flight-search no está desplegada todavía.' };
        return { ok: false, code: 'network', message: err?.message ?? 'No se pudo conectar con el servidor.' };
    }
}

// ── Enlaces directos a buscadores (no requieren API) ─────────────────────────
// Cada buscador recibe la ruta, las fechas y el filtro de escalas en su propio formato.

const isMonth = (d: string) => d.length === 7;
const midMonth = (d: string) => (isMonth(d) ? `${d}-15` : d);
const monthRange = (d: string) => {
    const [y, m] = d.split('-').map(Number);
    const last = new Date(y, m, 0).getDate();
    return [`${d}-01`, `${d}-${String(last).padStart(2, '0')}`] as const;
};
const skyDate = (d: string) => d.replace(/-/g, '').slice(2); // 2026-10-14 → 261014, 2026-10 → 2610
const MONTHS_EN = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const monthEn = (d: string) => `${MONTHS_EN[Number(d.slice(5, 7)) - 1]} ${d.slice(0, 4)}`;

export function buildDeepLinks(q: FlightQuery): DeepLink[] {
    const o = q.origin.toUpperCase();
    const d = q.destination.toUpperCase();
    const links: DeepLink[] = [];

    // Google Flights: consulta en lenguaje natural (inglés, es lo que mejor interpreta).
    const gWhen = isMonth(q.departDate) ? `in ${monthEn(q.departDate)}` : `on ${q.departDate}`;
    const gBack = q.returnDate ? (isMonth(q.returnDate) ? ` returning in ${monthEn(q.returnDate)}` : ` through ${q.returnDate}`) : ' one way';
    const gStops = q.maxStops === 0 ? ' nonstop' : '';
    links.push({
        provider: 'google',
        label: 'Google Flights',
        url: `https://www.google.com/travel/flights?q=${encodeURIComponent(`Flights from ${o} to ${d} ${gWhen}${gBack}${gStops}`)}&curr=${q.currency}`,
        note: q.maxStops > 0 ? `Ajusta “Escalas” a máx. ${q.maxStops} en la página` : undefined,
    });

    // Skyscanner: acepta yymmdd o yymm (mes entero). stops=!oneStop,!twoPlusStops excluye tipos.
    const skyStops = q.maxStops === 0 ? '&stops=!oneStop,!twoPlusStops' : q.maxStops === 1 ? '&stops=!twoPlusStops' : '';
    const skyPath = q.returnDate ? `${skyDate(q.departDate)}/${skyDate(q.returnDate)}` : skyDate(q.departDate);
    links.push({
        provider: 'skyscanner',
        label: 'Skyscanner',
        url: `https://www.skyscanner.es/transport/flights/${o.toLowerCase()}/${d.toLowerCase()}/${skyPath}/?adultsv2=1&cabinclass=economy&rtn=${q.returnDate ? 1 : 0}&preferdirects=${q.maxStops === 0}${skyStops}&currency=${q.currency}`,
    });

    // Kayak: exige fechas exactas; en modo mes usamos el día 15 ±3 días flexibles.
    const kDep = isMonth(q.departDate) ? `${midMonth(q.departDate)}-flexible-3` : q.departDate;
    const kRet = q.returnDate ? (isMonth(q.returnDate) ? `${midMonth(q.returnDate)}-flexible-3` : q.returnDate) : null;
    const kStops = q.maxStops === 0 ? '&fs=stops=0' : q.maxStops === 1 ? '&fs=stops=-2' : '';
    links.push({
        provider: 'kayak',
        label: 'Kayak',
        url: `https://www.kayak.es/flights/${o}-${d}/${kDep}${kRet ? `/${kRet}` : ''}?sort=price_a${kStops}`,
        note: isMonth(q.departDate) ? 'Fecha aprox. (día 15 ±3)' : undefined,
    });

    // Kiwi: acepta rangos YYYY-MM-DD_YYYY-MM-DD y stopNumber=N~true (máx. N escalas).
    const kwDep = isMonth(q.departDate) ? monthRange(q.departDate).join('_') : q.departDate;
    const kwRet = q.returnDate ? (isMonth(q.returnDate) ? monthRange(q.returnDate).join('_') : q.returnDate) : 'no-return';
    links.push({
        provider: 'kiwi',
        label: 'Kiwi.com',
        url: `https://www.kiwi.com/es/search/results/${o}/${d}/${kwDep}/${kwRet}?sortBy=price&stopNumber=${q.maxStops}~true&currency=${q.currency.toLowerCase()}`,
    });

    return links;
}

// ── Helpers de formato ───────────────────────────────────────────────────────
export function formatDuration(min: number | null | undefined): string {
    if (!min || min <= 0) return '—';
    const h = Math.floor(min / 60);
    const m = min % 60;
    return h ? `${h}h ${m ? `${m}m` : ''}`.trim() : `${m}m`;
}

export function formatMoney(amount: number, currency: string): string {
    try {
        return new Intl.NumberFormat('es-ES', { style: 'currency', currency, maximumFractionDigits: 0 }).format(amount);
    } catch {
        return `${Math.round(amount)} ${currency}`;
    }
}

export function stopsLabel(n: number): string {
    if (n === 0) return 'Directo';
    if (n === 1) return '1 escala';
    return `${n} escalas`;
}

// Aerolíneas frecuentes (IATA → nombre). Si no está, se muestra el código.
export const AIRLINES: Record<string, string> = {
    IB: 'Iberia', VY: 'Vueling', FR: 'Ryanair', U2: 'easyJet', UX: 'Air Europa', I2: 'Iberia Express',
    LH: 'Lufthansa', AF: 'Air France', KL: 'KLM', BA: 'British Airways', TP: 'TAP', AZ: 'ITA Airways',
    LX: 'Swiss', OS: 'Austrian', SK: 'SAS', AY: 'Finnair', EI: 'Aer Lingus', W6: 'Wizz Air', HV: 'Transavia',
    TK: 'Turkish Airlines', QR: 'Qatar Airways', EK: 'Emirates', EY: 'Etihad', SV: 'Saudia',
    AA: 'American', DL: 'Delta', UA: 'United', AC: 'Air Canada', B6: 'JetBlue', WN: 'Southwest', F9: 'Frontier', NK: 'Spirit',
    AM: 'Aeroméxico', Y4: 'Volaris', VB: 'Viva Aerobus', AV: 'Avianca', LA: 'LATAM', CM: 'Copa', AR: 'Aerolíneas Argentinas',
    G3: 'GOL', AD: 'Azul', JA: 'JetSMART', H2: 'Sky Airline', '2Z': 'Voepass',
    NH: 'ANA', JL: 'JAL', CX: 'Cathay Pacific', SQ: 'Singapore Airlines', QF: 'Qantas', KE: 'Korean Air', CA: 'Air China',
};
