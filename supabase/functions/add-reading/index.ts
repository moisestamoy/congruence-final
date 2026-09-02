// @ts-nocheck
// add-reading — saves a link into the Memo queue from outside the app
// (iOS Shortcut "Compartir → Guardar en Memo", Make/n8n, curl...).
//
// Auth (either):
//   • body.token / header x-shortcut-key == SHORTCUT_KEY secret  → writes for USER_ID secret
//   • Authorization: Bearer <Supabase JWT>                          → writes for that user
//
// Request : POST { url: string, note?: string, token?: string }
//           `url` may be free text with one or more links (share-sheet text works).
// Response: { success: true, added: number, items: [{ id, url, label }] }
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SHORTCUT_KEY = Deno.env.get('SHORTCUT_KEY') ?? ''
const DEFAULT_USER_ID = Deno.env.get('USER_ID') ?? ''

const X_HOSTS = ['x.com', 'twitter.com', 'mobile.twitter.com', 'www.x.com', 'www.twitter.com']

function extractUrls(text: string): string[] {
  return (text.match(/https?:\/\/[^\s<>"')\]]+/gi) ?? []).map(u => u.replace(/[.,;:!?)]+$/, ''))
}

function normalizeUrl(raw: string): string {
  try {
    const u = new URL(raw.trim())
    u.hash = ''
    if (X_HOSTS.includes(u.hostname)) {
      u.hostname = 'x.com'
      u.search = ''
    } else {
      ;[...u.searchParams.keys()]
        .filter(k => /^(utm_|fbclid|gclid|ref|s|t)$/i.test(k) || k.startsWith('utm_'))
        .forEach(k => u.searchParams.delete(k))
    }
    return u.toString().replace(/\/$/, '')
  } catch {
    return raw.trim()
  }
}

function labelFor(url: string): string {
  try {
    const u = new URL(url)
    if (X_HOSTS.includes(u.hostname)) {
      const [handle] = u.pathname.split('/').filter(Boolean)
      return handle && handle !== 'i' ? `@${handle}` : 'x.com'
    }
    return u.hostname.replace(/^www\./, '')
  } catch {
    return url
  }
}

Deno.serve(async (req: Request) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-shortcut-key',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json',
  }
  if (req.method === 'OPTIONS') return new Response('ok', { headers })
  if (req.method !== 'POST') return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers })

  try {
    const body = await req.json().catch(() => ({}))
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!

    // ── Auth ────────────────────────────────────────────────────────────────
    let userId = ''
    const provided = body?.token ?? req.headers.get('x-shortcut-key') ?? ''
    if (SHORTCUT_KEY && provided && provided === SHORTCUT_KEY && DEFAULT_USER_ID) {
      userId = DEFAULT_USER_ID
    } else {
      const authHeader = req.headers.get('Authorization') ?? ''
      if (authHeader.startsWith('Bearer ')) {
        const caller = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
          global: { headers: { Authorization: authHeader } },
        })
        const { data: { user } } = await caller.auth.getUser()
        if (user) userId = user.id
      }
    }
    if (!userId) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers })

    // ── Input ───────────────────────────────────────────────────────────────
    const urls = [...new Set(extractUrls(String(body?.url ?? '')).map(normalizeUrl))]
    if (urls.length === 0) {
      return new Response(JSON.stringify({ error: 'url must contain at least one http(s) link' }), { status: 400, headers })
    }
    const note = typeof body?.note === 'string' && body.note.trim() ? body.note.trim().slice(0, 200) : undefined

    // ── Merge into tasks_data.reading ───────────────────────────────────────
    const admin = createClient(supabaseUrl, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
    const { data: row, error: readError } = await admin
      .from('user_data')
      .select('tasks_data')
      .eq('id', userId)
      .single()
    if (readError && readError.code !== 'PGRST116') {
      return new Response(JSON.stringify({ error: 'Database read error', details: readError.message }), { status: 500, headers })
    }

    const tasksData = row?.tasks_data ?? {}
    const reading = tasksData.reading ?? { items: [], settings: { hour: 21, minute: 0 }, tonight: null }
    const existing = new Set((reading.items ?? []).map((i: any) => i.url))
    const now = Date.now()
    const added = urls
      .filter(u => !existing.has(u))
      .map((url, idx) => ({
        id: crypto.randomUUID(),
        url,
        label: labelFor(url),
        ...(note ? { note } : {}),
        source: X_HOSTS.includes(new URL(url).hostname) ? 'x' : 'web',
        status: 'queue',
        addedAt: now + idx,
        servedDates: [],
        openedAt: null,
        readAt: null,
      }))

    if (added.length > 0) {
      const { error: writeError } = await admin
        .from('user_data')
        .upsert({
          id: userId,
          tasks_data: { ...tasksData, reading: { ...reading, items: [...(reading.items ?? []), ...added] } },
          updated_at: new Date().toISOString(),
        })
      if (writeError) {
        return new Response(JSON.stringify({ error: 'Database write error', details: writeError.message }), { status: 500, headers })
      }
    }

    return new Response(JSON.stringify({
      success: true,
      added: added.length,
      items: added.map(i => ({ id: i.id, url: i.url, label: i.label })),
      message: added.length === 0 ? 'Ya estaba guardado.' : `Guardado. Memo te lo suelta una noche de estas.`,
    }), { status: 200, headers })
  } catch (err) {
    return new Response(JSON.stringify({ error: 'Internal error', details: String(err) }), { status: 500, headers })
  }
})
