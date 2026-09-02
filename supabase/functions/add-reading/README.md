# Memo — guardar links desde X (Edge Functions)

Memo reemplaza al bot de Grok "Memo": **un link guardado por noche, con TLDR, a una hora fija**.
El resto de la cola espera. Vive en la app en `/memo`.

Dos Edge Functions lo sostienen:

| Función        | Para qué                                                        | Auth                         |
|----------------|-----------------------------------------------------------------|------------------------------|
| `add-reading`  | Guardar un link desde fuera de la app (atajo de iOS, curl, n8n)  | `SHORTCUT_KEY` o JWT         |
| `memo-tldr`    | Leer el link en el servidor y devolver un TLDR en español (Gemini) | JWT del usuario logueado   |

Sin `memo-tldr` desplegada la app sigue funcionando: sirve un link por noche, solo sin resumen.

---

## 1. Secrets

```bash
supabase link --project-ref vbtshztpqlliytgbdjzm

# Ya existe si ai-coach funciona
supabase secrets set GEMINI_API_KEY=...
# Opcional (default: gemini-2.5-flash)
supabase secrets set GEMINI_MODEL=gemini-2.5-flash

# Para el atajo de iOS (elige un token largo) y tu UUID de Authentication → Users
supabase secrets set SHORTCUT_KEY=elige_un_token_largo
supabase secrets set USER_ID=tu-uuid-de-supabase-auth
```

## 2. Deploy

```bash
supabase functions deploy memo-tldr   --project-ref vbtshztpqlliytgbdjzm
supabase functions deploy add-reading --project-ref vbtshztpqlliytgbdjzm --no-verify-jwt
```

> El proyecto debe estar activo (no pausado) para desplegar.

---

## 3. Atajo de iOS: "Guardar en Memo" (desde el botón Compartir de X)

1. Atajos → nuevo atajo → nombre **Guardar en Memo**.
2. Detalles del atajo → activar **Mostrar en hoja de compartir** → tipos: URL y Texto.
3. Acciones:
   - **Obtener contenidos de URL**
     - URL: `https://vbtshztpqlliytgbdjzm.supabase.co/functions/v1/add-reading`
     - Método: `POST`
     - Cabeceras: `Content-Type: application/json`
     - Cuerpo (JSON):
       - `url` → *Entrada del atajo* (funciona aunque X comparta texto con el link dentro)
       - `token` → tu `SHORTCUT_KEY`
   - **Mostrar notificación** → `Guardado en Memo`

Desde X: post → Compartir → **Guardar en Memo**. Listo. No hace falta abrir la app.

## 4. Automatización: que Memo te "suelte" el link a las 21:00

iOS no deja a una web app avisarte sola sin push server, así que el aviso lo pone el iPhone:

Atajos → Automatización → **Hora del día** → 21:00 → diario → acción **Abrir URL** → `https://TU-URL-DE-CONGRUENCE/memo` → *Ejecutar inmediatamente*.

A esa hora se abre Memo con el artículo de la noche y su TLDR ya generado.

---

## 5. Prueba rápida

```bash
curl -X POST https://vbtshztpqlliytgbdjzm.supabase.co/functions/v1/add-reading \
  -H "Content-Type: application/json" \
  -d '{"url":"https://x.com/naval/status/1002103360646823936","token":"TU_SHORTCUT_KEY"}'
# → { "success": true, "added": 1, "items": [{ "label": "@naval", ... }] }
```

## 6. Cómo decide Memo qué darte

- Ventana nocturna: empieza a la hora configurada (default 21:00) y dura hasta la siguiente.
- Al abrir la ventana elige **uno**: si el de anoche no lo abriste y solo se ofreció una vez, lo repite;
  si no, el de la cola ofrecido menos veces, el más antiguo primero.
- `otro` cambia el de esta noche por el siguiente candidato. `leído` cierra la noche. `no me interesa` lo archiva.
- Nunca apila: aunque tengas 40 links, ves uno.

## Datos

Todo vive en `user_data.tasks_data.reading` (`{ items, settings, tonight }`), sin migraciones.
El frontend lo sincroniza con `SupabaseSync.tsx` igual que tareas y notas.
