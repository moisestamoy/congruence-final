// @ts-nocheck
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const ALLOWED_ORIGINS = [
  Deno.env.get('APP_URL') ?? '',
  'http://localhost:5173',
  'http://localhost:4173',
].filter(Boolean)

function getCorsHeaders(origin: string | null) {
  const allowed = origin && ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0]
  return {
    'Access-Control-Allow-Origin': allowed,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Vary': 'Origin',
  }
}

Deno.serve(async (req: Request) => {
  const origin = req.headers.get('Origin')
  const corsHeaders = getCorsHeaders(origin)

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  try {
    // ── 1. Validate JWT ───────────────────────────────────────────────────
    const authHeader = req.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized: missing token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!

    const callerClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    })

    const { data: { user }, error: authError } = await callerClient.auth.getUser()

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized: invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // ── 2. Parse body ─────────────────────────────────────────────────────
    const { habits, finances, manifesto, holisticCheckIns } = await req.json()

    const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY')
    if (!GEMINI_API_KEY) {
      return new Response(
        JSON.stringify({ error: 'Server misconfiguration: missing AI key' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // ── 3. Build prompt ───────────────────────────────────────────────────
    const today = new Date().toISOString().split('T')[0]

    const completedHabits = (habits ?? []).filter((h: any) => {
      const log = h.logs?.[today]
      return log?.completed || log?.value > 0
    })
    const totalHabits = (habits ?? []).length
    const congruence = totalHabits > 0
      ? Math.round((completedHabits.length / totalHabits) * 100)
      : 0

    const recentExpenses = (finances ?? []).slice(-7)
    const totalSpentRecently = recentExpenses.reduce((sum: number, e: any) => sum + (e.amount ?? 0), 0)

    const latestCheckIn = (holisticCheckIns ?? []).at(-1)
    const checkInSummary = latestCheckIn
      ? Object.entries(latestCheckIn.scores ?? {})
          .map(([axis, score]) => `${axis}: ${score}/10`)
          .join(', ')
      : 'Sin evaluación reciente'

    const identityStatement = manifesto?.identityStatement ?? ''
    const goalNinetyDays = manifesto?.goals?.ninetyDays ?? ''

    const prompt = `Eres un coach estoico y directo. Analiza estos datos del usuario y responde ÚNICAMENTE con un JSON válido, sin markdown, sin texto adicional.

DATOS DEL USUARIO (${today}):
- Identidad: "${identityStatement}"
- Meta 90 días: "${goalNinetyDays}"
- Hábitos completados hoy: ${completedHabits.length}/${totalHabits} (${congruence}% congruencia)
- Hábitos completados: ${completedHabits.map((h: any) => h.name).join(', ') || 'ninguno'}
- Gasto últimos 7 días: ${totalSpentRecently.toFixed(2)}
- Check-in holístico: ${checkInSummary}

Responde con este JSON exacto:
{
  "summary": "frase corta y poderosa (max 20 palabras) sobre su situación actual",
  "insight": "análisis estoico en 2-3 oraciones. Sé directo, sin suavizar",
  "action": "una sola acción concreta y medible para hoy",
  "mood": "positive|neutral|warning",
  "score_context": "una frase breve sobre el número de congruencia"
}`

    // ── 4. Call Gemini ────────────────────────────────────────────────────
    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 512,
          }
        })
      }
    )

    if (!geminiRes.ok) {
      const errText = await geminiRes.text()
      console.error('Gemini error:', errText)
      return new Response(
        JSON.stringify({ error: 'AI service error' }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const geminiData = await geminiRes.json()
    const rawText = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text ?? ''

    // ── 5. Parse Gemini response safely ──────────────────────────────────
    let insight: any
    try {
      // Strip any accidental markdown fences
      const cleaned = rawText.replace(/```json|```/g, '').trim()
      insight = JSON.parse(cleaned)
    } catch {
      console.error('Failed to parse Gemini JSON:', rawText)
      return new Response(
        JSON.stringify({ error: 'Failed to parse AI response' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // ── 6. Validate mood field ────────────────────────────────────────────
    const validMoods = ['positive', 'neutral', 'warning']
    if (!validMoods.includes(insight.mood)) {
      insight.mood = 'neutral'
    }

    return new Response(
      JSON.stringify({ insight }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (err) {
    console.error('Unexpected error:', err)
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: String(err) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
