// @ts-nocheck
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
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
    const body = await req.json()
    const { amount, category, date, note, token } = body

    // ── 1. Auth: validate webhook secret ──────────────────────────────────
    const WEBHOOK_SECRET = Deno.env.get('WEBHOOK_SECRET')
    const USER_ID = Deno.env.get('USER_ID')

    if (!WEBHOOK_SECRET || !USER_ID) {
      console.error('Missing environment variables: WEBHOOK_SECRET or USER_ID')
      return new Response(
        JSON.stringify({ error: 'Server misconfiguration' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!token || token !== WEBHOOK_SECRET) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized: invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // ── 2. Validate input ─────────────────────────────────────────────────
    const errors: string[] = []

    if (typeof amount !== 'number' || amount <= 0) {
      errors.push('amount must be a positive number')
    }

    if (!category || typeof category !== 'string' || category.trim() === '') {
      errors.push('category is required')
    }

    // Validate date format YYYY-MM-DD
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

    // ── 4. Connect to Supabase with service role key ──────────────────────
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // ── 5. Read current user data ─────────────────────────────────────────
    const { data: userData, error: readError } = await supabase
      .from('user_data')
      .select('finances_data')
      .eq('id', USER_ID)
      .single()

    if (readError && readError.code !== 'PGRST116') {
      // PGRST116 = row not found, ok if first write
      console.error('DB read error:', readError)
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
        id: USER_ID,
        finances_data: updatedFinances,
        updated_at: new Date().toISOString(),
      })

    if (writeError) {
      console.error('DB write error:', writeError)
      return new Response(
        JSON.stringify({ error: 'Database write error', details: writeError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // ── 8. Success ────────────────────────────────────────────────────────
    console.log(`✅ Expense added: ${newExpense.amount} in ${newExpense.category} on ${newExpense.date}`)

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
    console.error('Unexpected error:', err)
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: String(err) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
