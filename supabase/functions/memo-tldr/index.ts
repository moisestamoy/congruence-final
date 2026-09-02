// @ts-nocheck
// memo-tldr — fetches a saved link server-side and returns a short Spanish TLDR.
//
// Auth: Bearer JWT of the logged-in Congruence user (verify_jwt = true).
// Secrets: GEMINI_API_KEY (already used by ai-coach), optional GEMINI_MODEL.
//
// Request : POST { url: string }
// Response: { tldr: { title, author?, lines: string[], why? } }
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const ALLOWED_ORIGINS = [
  Deno.env.get('APP_URL') ?? '',
  'http://localhost:5173',
  'http://localhost:4173',
].filter(Boolean)

const GEMINI_MODEL = Deno.env.get('GEMINI_MODEL') ?? 'gemini-2.5-flash'
const MAX_CONTENT_CHARS = 9000
const UA = 'Mozilla/5.0 (compatible; CongruenceMemo/1.0; +https://congruence.app)'

function corsHeaders(origin: string | null) {
  const allowed = origin && ALLOWED_ORIGINS.includes(origin) ? origin : (ALLOWED_ORIGINS[0] ?? '*')
  return {
    'Access-Control-Allow-Origin': allowed,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Vary': 'Origin',
  }
}

function json(body: unknown, status: number, headers: Record<string, string>) {
  return new Response(JSON.stringify(body), { status, headers: { ...headers, 'Content-Type': 'application/json' } })
}

// ── Content extraction ────────────────────────────────────────────────────────

function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|li|h[1-6]|tr|blockquote)>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'")
    .replace(/[ \t]+/g, ' ')
    .replace(/\n\s*\n+/g, '\n')
    .trim()
}

function parseXUrl(url: URL): { handle: string; id: string } | null {
  const m = url.pathname.match(/^\/([A-Za-z0-9_]+)\/status\/(\d+)/)
  return m ? { handle: m[1], id: m[2] } : null
}

async function withTimeout(input: string, init: RequestInit = {}, ms = 8000): Promise<Response> {
  const ctrl = new AbortController()
  const t = setTimeout(() => ctrl.abort(), ms)
  try {
    return await fetch(input, { ...init, signal: ctrl.signal, headers: { 'User-Agent': UA, ...(init.headers ?? {}) } })
  } finally {
    clearTimeout(t)
  }
}

/** X post: official oEmbed first (no API key), then the fxtwitter mirror for long posts / articles. */
async function fetchXContent(url: URL): Promise<{ text: string; author?: string } | null> {
  const post = parseXUrl(url)

  if (post) {
    try {
      const res = await withTimeout(`https://api.fxtwitter.com/${post.handle}/status/${post.id}`)
      if (res.ok) {
        const data = await res.json()
        const tweet = data?.tweet
        if (tweet) {
          const articleText = tweet.article?.content?.blocks
            ?.map((b: any) => b?.text)
            .filter(Boolean)
            .join('\n')
          const text = [tweet.article?.title, articleText || tweet.text].filter(Boolean).join('\n\n')
          if (text.trim()) {
            return { text, author: tweet.author?.screen_name ? `@${tweet.author.screen_name}` : undefined }
          }
        }
      }
    } catch (_) { /* fall through */ }
  }

  try {
    const oembed = `https://publish.twitter.com/oembed?omit_script=1&url=${encodeURIComponent(url.toString())}`
    const res = await withTimeout(oembed)
    if (res.ok) {
      const data = await res.json()
      const text = stripHtml(data?.html ?? '')
      if (text) return { text, author: data?.author_name }
    }
  } catch (_) { /* fall through */ }

  return null
}

async function fetchWebContent(url: URL): Promise<{ text: string; title?: string } | null> {
  try {
    const res = await withTimeout(url.toString(), { headers: { Accept: 'text/html,*/*' } }, 10000)
    if (!res.ok) return null
    const html = (await res.text()).slice(0, 400_000)
    const title = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]?.trim()
    const desc = html.match(/<meta[^>]+(?:name|property)=["'](?:description|og:description)["'][^>]+content=["']([^"']+)["']/i)?.[1]
    // Prefer <article>/<main> when present, it's usually the actual content.
    const main = html.match(/<article[\s\S]*?<\/article>/i)?.[0] ?? html.match(/<main[\s\S]*?<\/main>/i)?.[0] ?? html
    const body = stripHtml(main)
    const text = [desc, body].filter(Boolean).join('\n\n')
    return text ? { text, title: title ? stripHtml(title) : undefined } : null
  } catch (_) {
    return null
  }
}

// ── Handler ──────────────────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  const headers = corsHeaders(req.headers.get('Origin'))
  if (req.method === 'OPTIONS') return new Response('ok', { headers })
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405, headers)

  try {
    // 1. Auth
    const authHeader = req.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) return json({ error: 'Unauthorized: missing token' }, 401, headers)
    const caller = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } },
    })
    const { data: { user }, error: authError } = await caller.auth.getUser()
    if (authError || !user) return json({ error: 'Unauthorized: invalid token' }, 401, headers)

    // 2. Input
    const body = await req.json().catch(() => ({}))
    let url: URL
    try {
      url = new URL(String(body?.url ?? ''))
      if (!/^https?:$/.test(url.protocol)) throw new Error('bad protocol')
    } catch {
      return json({ error: 'url must be a valid http(s) URL' }, 400, headers)
    }

    const apiKey = Deno.env.get('GEMINI_API_KEY')
    if (!apiKey) return json({ error: 'Server misconfiguration: missing AI key' }, 500, headers)

    // 3. Content
    const isX = /(^|\.)(x|twitter)\.com$/.test(url.hostname)
    const content = isX ? await fetchXContent(url) : await fetchWebContent(url)
    if (!content?.text) {
      return json({ error: 'No pude leer el contenido de ese link (¿privado o requiere login?).' }, 422, headers)
    }
    const text = content.text.slice(0, MAX_CONTENT_CHARS)
    const author = (content as any).author as string | undefined
    const pageTitle = (content as any).title as string | undefined

    // 4. Gemini
    const prompt = `Eres "Memo", un amigo que lee por otro y le cuenta lo esencial en español neutral, directo, sin relleno.
Resume el siguiente contenido (proviene de ${url.hostname}${author ? `, autor ${author}` : ''}).

Responde ÚNICAMENTE con JSON válido, sin markdown, con este formato exacto:
{
  "title": "título corto y concreto (máx 10 palabras)",
  "author": "${author ?? ''}",
  "lines": ["idea 1", "idea 2", "idea 3", "idea 4", "idea 5"],
  "why": "una frase: por qué vale (o no vale) la pena leer el original completo"
}
Reglas: entre 3 y 5 líneas, cada una de máximo 20 palabras, hechos e ideas accionables, nada de "el autor dice".
${pageTitle ? `Título original de la página: ${pageTitle}\n` : ''}
CONTENIDO:
"""
${text}
"""`

    const geminiRes = await withTimeout(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.4, maxOutputTokens: 700, responseMimeType: 'application/json' },
        }),
      },
      25000,
    )
    if (!geminiRes.ok) {
      console.error('Gemini error:', await geminiRes.text())
      return json({ error: 'AI service error' }, 502, headers)
    }
    const geminiData = await geminiRes.json()
    const raw = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text ?? ''

    let parsed: any
    try {
      parsed = JSON.parse(raw.replace(/```json|```/g, '').trim())
    } catch {
      console.error('Failed to parse Gemini JSON:', raw)
      return json({ error: 'Failed to parse AI response' }, 500, headers)
    }

    const lines = Array.isArray(parsed?.lines)
      ? parsed.lines.map((l: unknown) => String(l).trim()).filter(Boolean).slice(0, 5)
      : []
    if (lines.length === 0) return json({ error: 'AI returned no summary' }, 500, headers)

    return json({
      tldr: {
        title: String(parsed.title ?? pageTitle ?? '').trim() || url.hostname,
        author: parsed.author || author || undefined,
        lines,
        why: parsed.why ? String(parsed.why) : undefined,
      },
    }, 200, headers)
  } catch (err) {
    console.error('Unexpected error:', err)
    return json({ error: 'Internal server error', details: String(err) }, 500, headers)
  }
})
