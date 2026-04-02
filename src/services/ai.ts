const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const WEBHOOK_SECRET = import.meta.env.VITE_WEBHOOK_SECRET;

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
            const response = await fetch(`${SUPABASE_URL}/functions/v1/ai-coach`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    token: WEBHOOK_SECRET,
                    habits,
                    finances,
                    manifesto,
                    holisticCheckIns: holisticCheckIns?.slice(-3) ?? []
                })
            });

            if (!response.ok) {
                throw new Error(`Coach API error: ${response.status}`);
            }

            const data = await response.json();
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
            console.error('AI Coach Error:', error);
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
