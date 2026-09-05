# Congruence — Buscador de vuelos baratos (Edge Function)

## Descripción

Edge Function que busca los vuelos más baratos de una ruta y devuelve solo
los que tienen como máximo el número de escalas que elijas (directo, 1 o 2).

Usa la **Aviasales / Travelpayouts Data API**: precios cacheados de búsquedas
reales de los últimos días. Es gratuita y no requiere tarjeta.
La app la llama desde la página **Vuelos** (`/flights`) con el JWT del usuario.

Si no configuras el token, la página sigue funcionando con los enlaces
directos a Google Flights, Skyscanner, Kayak y Kiwi (ya llevan el filtro de
escalas aplicado); solo no verás resultados dentro de la app.

---

## Setup

### 1. Conseguir el token (gratis)

1. Crea una cuenta en https://www.travelpayouts.com
2. Ve a **Tools → Data API** (o *Developers → API*) y copia tu **API token**.

### 2. Vincular el proyecto y setear el secret

```bash
supabase link --project-ref vbtshztpqlliytgbdjzm
supabase secrets set TRAVELPAYOUTS_TOKEN=tu_token_aqui
# Opcional: dominio de producción para CORS (igual que las otras funciones)
supabase secrets set APP_URL=https://tu-dominio.vercel.app
```

### 3. Deploy

```bash
supabase functions deploy flight-search
```

### 4. Probar

```bash
curl -X POST "https://vbtshztpqlliytgbdjzm.supabase.co/functions/v1/flight-search" \
  -H "Authorization: Bearer <JWT_DEL_USUARIO>" \
  -H "Content-Type: application/json" \
  -d '{"origin":"MAD","destination":"BCN","departDate":"2026-10","maxStops":0,"currency":"eur"}'
```

---

## Contrato

**Request** (`POST`, JSON):

| Campo         | Tipo    | Obligatorio | Notas                                             |
|---------------|---------|-------------|---------------------------------------------------|
| `origin`      | string  | sí          | IATA de 3 letras (ciudad o aeropuerto), ej. `MAD` |
| `destination` | string  | sí          | IATA de 3 letras, ej. `BCN`                       |
| `departDate`  | string  | sí          | `YYYY-MM-DD` o `YYYY-MM` (mes entero, flexible)   |
| `returnDate`  | string  | no          | Igual formato. Si falta, es solo ida              |
| `maxStops`    | number  | no          | 0 = directo, 1, 2. Por defecto 1                  |
| `currency`    | string  | no          | `eur`, `usd`, `mxn`… Por defecto `eur`            |
| `maxPrice`    | number  | no          | Descarta resultados por encima                    |

**Response** (`200`):

```json
{
  "ok": true,
  "query": { "origin": "MAD", "destination": "BCN", "departDate": "2026-10", "returnDate": null, "maxStops": 0, "currency": "EUR", "maxPrice": null },
  "totalFromProvider": 128,
  "flights": [
    {
      "id": "VY1002-2026-10-14T07:10:00+02:00-",
      "airline": "VY", "flightNumber": "1002",
      "price": 24, "currency": "EUR",
      "departureAt": "2026-10-14T07:10:00+02:00", "returnAt": null,
      "stops": 0, "returnStops": null,
      "durationMinutes": 80, "durationToMinutes": 80, "durationBackMinutes": null,
      "bookingUrl": "https://www.aviasales.com/search/MAD1410BCN1?t=..."
    }
  ],
  "fetchedAt": "2026-09-05T10:00:00.000Z"
}
```

Errores esperados llegan con `200` y `ok: false`:

| `code`             | Significado                                          |
|--------------------|------------------------------------------------------|
| `not_configured`   | Falta `TRAVELPAYOUTS_TOKEN`                          |
| `validation`       | Input inválido (`message` explica qué)               |
| `provider_error`   | El proveedor falló o devolvió algo inesperado        |

`401` si el JWT falta o es inválido. `500` en errores internos.
