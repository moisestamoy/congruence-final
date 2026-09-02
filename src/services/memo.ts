import { supabase } from '../lib/supabase';
import { ReadingTldr } from '../types';

export type TldrResult =
    | { ok: true; tldr: ReadingTldr }
    | { ok: false; reason: 'auth' | 'unavailable' | 'error'; message: string };

/**
 * Ask the `memo-tldr` Edge Function for a short Spanish summary of a link.
 * The function fetches the content server-side (the app's CSP blocks
 * cross-origin fetches from the browser) and runs it through Gemini.
 */
export async function fetchTldr(url: string): Promise<TldrResult> {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
        return { ok: false, reason: 'auth', message: 'Inicia sesión para que Memo pueda resumir.' };
    }
    try {
        const { data, error } = await supabase.functions.invoke('memo-tldr', { body: { url } });
        if (error) {
            const status = (error as { context?: { status?: number } }).context?.status;
            if (status === 404) {
                return { ok: false, reason: 'unavailable', message: 'La función memo-tldr no está desplegada todavía.' };
            }
            return { ok: false, reason: 'error', message: error.message ?? 'No se pudo generar el TLDR.' };
        }
        const t = data?.tldr;
        if (!t || !Array.isArray(t.lines) || t.lines.length === 0) {
            return { ok: false, reason: 'error', message: data?.error ?? 'Respuesta vacía del resumen.' };
        }
        return {
            ok: true,
            tldr: {
                title: String(t.title ?? '').trim() || url,
                ...(t.author ? { author: String(t.author) } : {}),
                lines: t.lines.slice(0, 5).map((l: unknown) => String(l).trim()).filter(Boolean),
                ...(t.why ? { why: String(t.why) } : {}),
                generatedAt: Date.now(),
            },
        };
    } catch (e) {
        return { ok: false, reason: 'error', message: e instanceof Error ? e.message : 'No se pudo generar el TLDR.' };
    }
}
