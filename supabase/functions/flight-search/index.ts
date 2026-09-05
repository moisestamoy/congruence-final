// @ts-nocheck
// Edge Function: flight-search
// Busca los vuelos más baratos para una ruta y filtra por número máximo de escalas.
// Proveedor: Travelpayouts / Aviasales Data API (precios cacheados de búsquedas reales).
// El token vive en los secrets de Supabase (TRAVELPAYOUTS_TOKEN), nunca en el cliente.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const ALLOWED_ORIGINS = [
  Deno.env.get('APP_URL') ?? '',
  'http://localhost:5173',
  'http://localhost:4173',
].filter(Boolean)

const PROVIDER_URL = 'https://api.travelpayouts.com/aviasales/v3/prices_for_dates'
const BOOKING_BASE = 'https://www.aviasales.com'

const IATA_RE = /^[A-Z]{3}$/
const DATE_RE = /^\d{4}-\d{2}(-\d{2})?$/          // YYYY-MM (mes flexible) o YYYY-MM-DD
const CURRENCY_RE = /^[a-z]{3}$/

function getCorsHeaders(origin: string | null) {
  const allowed = origin && ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0]
  return {
    'Access-Control-Allow-Origin': allowed,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Vary': 'Origin',
  }
}

function json(body: unknown, status: number, corsHeaders: Record<string, string>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

// Errores "esperados" (config, validación, proveedor) se devuelven con 200 + ok:false
// para que supabase.functions.invoke entregue el cuerpo al cliente sin tirar excepción.
function fail(code: string, message: string, corsHeaders: Record<string, string>) {
  return json({ ok: false, code, message }, 200, corsHeaders)
}

Deno.serve(async (req: Request) => {
  const origin = req.headers.get('Origin')
  const corsHeaders = getCorsHeaders(origin)

  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405, corsHeaders)

  try {
    // ── 1. Auth: validar JWT del usuario ──────────────────────────────────
    const authHeader = req.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return json({ error: 'Unauthorized: missing token' }, 401, corsHeaders)
    }
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!
    const callerClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    })
    const { data: { user }, error: authError } = await callerClient.auth.getUser()
    if (authError || !user) {
      return json({ error: 'Unauthorized: invalid token' }, 401, corsHeaders)
    }

    // ── 2. Config del proveedor ───────────────────────────────────────────
    const token = Deno.env.get('TRAVELPAYOUTS_TOKEN')
    if (!token) {
      return fail(
        'not_configured',
        'Falta el secret TRAVELPAYOUTS_TOKEN en Supabase. Mira supabase/functions/flight-search/README.md.',
        corsHeaders,
      )
    }

    // ── 3. Validar input ──────────────────────────────────────────────────
    const body = await req.json().catch(() => ({}))
    const origin_ = String(body.origin ?? '').trim().toUpperCase()
    const destination = String(body.destination ?? '').trim().toUpperCase()
    const departDate = String(body.departDate ?? '').trim()
    const returnDate = body.returnDate ? String(body.returnDate).trim() : ''
    const oneWay = returnDate === ''
    const maxStops = Number.isInteger(body.maxStops) ? Math.min(Math.max(body.maxStops, 0), 3) : 1
    const currency = String(body.currency ?? 'eur').trim().toLowerCase()
    const maxPrice = typeof body.maxPrice === 'number' && body.maxPrice > 0 ? body.maxPrice : null
    const market = String(body.market ?? 'es').trim().toLowerCase().slice(0, 2)

    const errors: string[] = []
    if (!IATA_RE.test(origin_)) errors.push('origin debe ser un código IATA de 3 letras (ej. MAD)')
    if (!IATA_RE.test(destination)) errors.push('destination debe ser un código IATA de 3 letras (ej. BCN)')
    if (origin_ && origin_ === destination) errors.push('origen y destino no pueden ser iguales')
    if (!DATE_RE.test(departDate)) errors.push('departDate debe ser YYYY-MM o YYYY-MM-DD')
    if (returnDate && !DATE_RE.test(returnDate)) errors.push('returnDate debe ser YYYY-MM o YYYY-MM-DD')
    if (!CURRENCY_RE.test(currency)) errors.push('currency debe ser un código de 3 letras (ej. eur)')
    if (errors.length) return fail('validation', errors.join('; '), corsHeaders)

    // ── 4. Llamar al proveedor ────────────────────────────────────────────
    const params = new URLSearchParams({
      origin: origin_,
      destination,
      departure_at: departDate,
      one_way: String(oneWay),
      direct: String(maxStops === 0),   // el proveedor filtra directos; el resto lo filtramos abajo
      currency,
      market,
      sorting: 'price',
      unique: 'false',
      limit: '1000',
      page: '1',
      token,
    })
    if (!oneWay) params.set('return_at', returnDate)

    const res = await fetch(`${PROVIDER_URL}?${params.toString()}`, {
      headers: { 'Accept-Encoding': 'gzip, deflate' },
    })
    if (!res.ok) {
      const text = await res.text().catch(() => '')
      return fail('provider_error', `El proveedor respondió ${res.status}: ${text.slice(0, 200)}`, corsHeaders)
    }
    const payload = await res.json()
    if (!payload?.success || !Array.isArray(payload.data)) {
      return fail('provider_error', payload?.error ?? 'Respuesta inesperada del proveedor', corsHeaders)
    }

    // ── 5. Normalizar + filtrar escalas / presupuesto ─────────────────────
    const flights = payload.data
      .map((f: any) => ({
        id: `${f.airline ?? ''}${f.flight_number ?? ''}-${f.departure_at ?? ''}-${f.return_at ?? ''}`,
        origin: f.origin ?? origin_,
        destination: f.destination ?? destination,
        originAirport: f.origin_airport ?? null,
        destinationAirport: f.destination_airport ?? null,
        airline: f.airline ?? null,
        flightNumber: f.flight_number ?? null,
        price: Number(f.price),
        currency: String(payload.currency ?? currency).toUpperCase(),
        departureAt: f.departure_at ?? null,
        returnAt: f.return_at ?? null,
        stops: Number(f.transfers ?? 0),
        returnStops: f.return_transfers == null ? null : Number(f.return_transfers),
        durationMinutes: Number(f.duration ?? 0),
        durationToMinutes: f.duration_to == null ? null : Number(f.duration_to),
        durationBackMinutes: f.duration_back == null ? null : Number(f.duration_back),
        bookingUrl: f.link ? `${BOOKING_BASE}${f.link}` : null,
      }))
      .filter((f: any) => Number.isFinite(f.price) && f.price > 0)
      .filter((f: any) => f.stops <= maxStops && (f.returnStops == null || f.returnStops <= maxStops))
      .filter((f: any) => maxPrice == null || f.price <= maxPrice)
      .sort((a: any, b: any) => a.price - b.price)

    // Deduplicar por (fecha ida, fecha vuelta, aerolínea) conservando el más barato
    const seen = new Set<string>()
    const unique = flights.filter((f: any) => {
      const key = `${f.departureAt?.slice(0, 10)}|${f.returnAt?.slice(0, 10) ?? ''}|${f.airline}`
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })

    return json({
      ok: true,
      query: { origin: origin_, destination, departDate, returnDate: returnDate || null, maxStops, currency: currency.toUpperCase(), maxPrice },
      totalFromProvider: payload.data.length,
      flights: unique.slice(0, 60),
      fetchedAt: new Date().toISOString(),
    }, 200, corsHeaders)
  } catch (err) {
    console.error('flight-search error:', err)
    return json({ error: 'Internal server error' }, 500, corsHeaders)
  }
})
