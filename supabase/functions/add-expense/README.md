# Congruence — Webhook de Gastos (Edge Function)

## Descripción

Edge Function de Supabase que permite registrar gastos en Congruence
desde fuentes externas como **iPhone Shortcuts** (Apple Pay / Revolut).

Escribe directamente en la tabla `user_data` de Supabase, que el frontend
ya sincroniza automáticamente en el próximo ciclo de `SupabaseSync.tsx`.

---

## Setup inicial

### 1. Instalar Supabase CLI (si no lo tienes)

```bash
brew install supabase/tap/supabase
```

### 2. Vincular al proyecto

```bash
supabase link --project-ref vbtshztpqlliytgbdjzm
```

### 3. Setear los secrets en Supabase

```bash
# Tu token secreto — ponlo también en el iPhone Shortcut
supabase secrets set WEBHOOK_SECRET=elige_un_token_seguro

# Tu UUID de usuario en Supabase Auth
# Lo encuentras en: Supabase Dashboard → Authentication → Users
supabase secrets set USER_ID=tu-uuid-de-supabase-auth
```

### 4. Deploy de la Edge Function

```bash
supabase functions deploy add-expense --project-ref vbtshztpqlliytgbdjzm
```

---

## URL del endpoint

```
https://vbtshztpqlliytgbdjzm.supabase.co/functions/v1/add-expense
```

---

## Uso del endpoint

### Request

```http
POST https://vbtshztpqlliytgbdjzm.supabase.co/functions/v1/add-expense
Content-Type: application/json

{
  "amount": 12.50,
  "category": "Food",
  "date": "2026-04-02",
  "note": "Almuerzo",
  "token": "TU_WEBHOOK_SECRET"
}
```

### Campos

| Campo      | Tipo     | Requerido | Descripción                        |
|------------|----------|-----------|------------------------------------|
| `amount`   | number   | ✅         | Importe positivo (ej: 12.50)       |
| `category` | string   | ✅         | Categoría del gasto                |
| `date`     | string   | ✅         | Formato YYYY-MM-DD                 |
| `note`     | string   | ❌         | Nota opcional                      |
| `token`    | string   | ✅         | WEBHOOK_SECRET para autenticación  |

### Categorías disponibles

**Salidas:**
`🍔 Comida`, `🚕 Transporte`, `🎬 Entretenimiento`, `💊 Salud`, `📚 Educación`, 
`📦 Otros`, `🏠 Alquiler`, `💳 Tarjeta de crédito`, `🛒 Supermercado`, 
`💡 Servicios`, `🔄 Suscripciones`, `🐾 Mascotas`, `✈️ Viajes`, `💻 Tecnología`, 
`🛠️ Herramienta de trabajo`, `📉 Inversiones`, `🧠 Inversión en mentoría`

**Entradas:**
`💰 Salario`, `🤝 Comisiones`, `🏦 Préstamo`, `📈 Inversiones`, `🎁 Regalo`, `🪙 Otros ingresos`

Se acepta cualquier categoría, pero para que coincidan visualmente en la app se recomienda usar exactamente estos textos con sus emojis correspondientes.

### Respuestas

```jsonc
// 200 — OK
{ "success": true, "expense": { "id": "...", "date": "...", "amount": 12.5, "category": "Food" }, "message": "Expense of 12.5 registered in Food" }

// 401 — Token inválido
{ "error": "Unauthorized: invalid token" }

// 400 — Datos inválidos
{ "error": "Validation failed", "details": ["amount must be a positive number"] }

// 500 — Error de servidor
{ "error": "Database write error", "details": "..." }
```

---

## iPhone Shortcut

Una vez deployada la función, configura el atajo con:

- **URL**: `https://vbtshztpqlliytgbdjzm.supabase.co/functions/v1/add-expense`
- **Method**: POST
- **Headers**: `Content-Type: application/json`
- **Body (JSON)**:
  ```json
  {
    "amount": [IMPORTE],
    "category": "Food",
    "date": "[FECHA_HOY_YYYY-MM-DD]",
    "note": "[DESCRIPCION]",
    "token": "TU_WEBHOOK_SECRET"
  }
  ```

---

## Test rápido con curl

```bash
curl -X POST https://vbtshztpqlliytgbdjzm.supabase.co/functions/v1/add-expense \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 5.00,
    "category": "Food",
    "date": "2026-04-02",
    "note": "Test desde terminal",
    "token": "TU_WEBHOOK_SECRET"
  }'
```

---

## Arquitectura

```
iPhone Shortcut
      │
      │  POST /functions/v1/add-expense
      ▼
Supabase Edge Function (add-expense)
      │  Valida token + datos
      │  Lee user_data.finances_data
      │  Añade DailyRealExpense al array realExpenses[]
      │  Upsert → user_data
      ▼
Supabase DB (user_data)
      │
      │  SupabaseSync.tsx lo detecta en el próximo mount/sync
      ▼
Congruence Frontend (useFinanceStore)
```
