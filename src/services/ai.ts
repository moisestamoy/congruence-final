import { supabase } from '../lib/supabase';

export interface DailyInsight {
    date: string;
    summary: string;
    insight: string;
    actionable_tip: string;
    mood: 'positive' | 'neutral' | 'warning';
    score_context?: string;
}

export const AIService = {
    generateInsight: async (
        habits: any[],
        finances: any[],
        manifesto?: any,
        holisticCheckIns?: any[]
    ): Promise<DailyInsight> => {
        try {
            // Uses supabase.functions.invoke so the JWT is sent automatically
            // in the Authorization header — no shared secret exposed client-side
            const { data, error } = await supabase.functions.invoke('ai-coach', {
                body: {
                    habits,
                    finances,
                    manifesto,
                    holisticCheckIns: holisticCheckIns?.slice(-3) ?? []
                }
            });

            if (error) throw error;

            const insight = data.insight;

            return {
                date: new Date().toISOString(),
                summary: insight.summary ?? '',
                insight: insight.insight ?? '',
                actionable_tip: insight.action ?? '',
                mood: insight.mood ?? 'neutral',
                score_context: insight.score_context ?? ''
            };

        } catch (error: any) {
            return {
                date: new Date().toISOString(),
                summary: 'No se pudo conectar con el coach. Revisa tu conexión.',
                insight: '',
                actionable_tip: 'Completa al menos un hábito hoy.',
                mood: 'neutral'
            };
        }
    }
};
