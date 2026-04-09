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
    // ── 1. Auth: validate JWT from Authorization header ────────────────────
    const authHeader = req.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized: missing token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    // Verify JWT using the caller's token
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

    // ── 2. Validate input ─────────────────────────────────────────────────
    const body = await req.json()
    const { amount, category, date, note } = body
    const errors: string[] = []

    if (typeof amount !== 'number' || amount <= 0 || amount > 1_000_000) {
      errors.push('amount must be a positive number less than 1,000,000')
    }

    if (!category || typeof category !== 'string' || category.trim() === '') {
      errors.push('category is required')
    }

    const dateRegex = /^\d{4}-\d{2}-\d{2}$/
    if (!date || !dateRegex.test(date)) {
      errors.push('date must be in YYYY-MM-DD format')
    } else {
      const parsed = new Date(date)
      if (isNaN(parsed.getTime())) {
        errors.push('date is not a valid date')
      }
    }

    if (errors.length > 0) {
      return new Response(
        JSON.stringify({ error: 'Validation failed', details: errors }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // ── 3. Build new expense ──────────────────────────────────────────────
    const newExpense = {
      id: crypto.randomUUID(),
      date: date.trim(),
      amount: Number(amount),
      category: category.trim(),
      ...(note && typeof note === 'string' && note.trim() !== '' ? { note: note.trim() } : {}),
    }

    // ── 4. Connect with service role to write data ────────────────────────
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // ── 5. Read current user data ─────────────────────────────────────────
    const { data: userData, error: readError } = await supabase
      .from('user_data')
      .select('finances_data')
      .eq('id', user.id)
      .single()

    if (readError && readError.code !== 'PGRST116') {
      return new Response(
        JSON.stringify({ error: 'Database read error', details: readError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // ── 6. Merge new expense into existing finances_data ──────────────────
    const existingFinances = userData?.finances_data ?? {}
    const updatedFinances = {
      ...existingFinances,
      realExpenses: [
        ...(existingFinances.realExpenses ?? []),
        newExpense,
      ],
    }

    // ── 7. Upsert back to Supabase ────────────────────────────────────────
    const { error: writeError } = await supabase
      .from('user_data')
      .upsert({
        id: user.id,
        finances_data: updatedFinances,
        updated_at: new Date().toISOString(),
      })

    if (writeError) {
      return new Response(
        JSON.stringify({ error: 'Database write error', details: writeError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({
        success: true,
        expense: {
          id: newExpense.id,
          date: newExpense.date,
          amount: newExpense.amount,
          category: newExpense.category,
          ...(newExpense.note ? { note: newExpense.note } : {}),
        },
        message: `Expense of ${newExpense.amount} registered in ${newExpense.category}`,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (err) {
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: String(err) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
