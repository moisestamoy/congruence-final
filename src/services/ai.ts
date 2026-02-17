import { GoogleGenerativeAI } from "@google/generative-ai";

const API_KEY = import.meta.env.VITE_GOOGLE_AI_KEY;

if (!API_KEY) {
    console.error("Missing VITE_GOOGLE_AI_KEY in environment variables.");
}

const genAI = new GoogleGenerativeAI(API_KEY || "dummy-key");
const model = genAI.getGenerativeModel({ model: "gemini-pro" });

export interface DailyInsight {
    date: string;
    summary: string;
    actionable_tip: string;
    mood: 'positive' | 'neutral' | 'warning';
}

export const AIService = {
    /**
     * Analyzes user data to generate a daily insight.
     * @param habits Recent habit data (last 7 days)
     * @param finances Recent financial transactions (last 7 days)
     * @param userName Name of the user (e.g. "Moises")
     */
    generateInsight: async (habits: any[], _finances: any[], userName: string = 'Usuario'): Promise<DailyInsight> => {
        try {
            // Simplify data to send to LLM (reduce token usage)
            const habitSummary = habits.map(h => ({ name: h.name, logic: h.completedDays?.length || 0 })).map(h => `${h.name}: ${h.logic} times`).join(', ');
            // Finance simplification logic would go here
            const financeSummary = "Spending normalized."; // Placeholder for now

            const prompt = `
            You are a stoic, highly intelligent, and data-driven Life Coach for ${userName}.
            Analyze the following data for the past week:
            
            Habits: ${habitSummary}
            Finances: ${financeSummary}

            Provide a concise, 2-sentence summary of performance and 1 concrete, actionable tip for today.
            Output purely in JSON format:
            {
                "summary": "Your analysis here.",
                "actionable_tip": "Do this specific thing today.",
                "mood": "positive/neutral/warning"
            }
            Do not include markdown blocks. Just the raw JSON.
            `;

            const result = await model.generateContent(prompt);
            const response = await result.response;
            const text = response.text();

            // Clean markdown if present
            const jsonString = text.replace(/```json/g, '').replace(/```/g, '').trim();

            return JSON.parse(jsonString);
        } catch (error: any) {
            console.error("AI Generation Error:", error);
            // Fallback for demo: return a mock insight
            return {
                date: new Date().toISOString(),
                summary: "You're seeing this because the API Key didn't work (Demo Mode). Your habits are consistent, but try to track finances daily.",
                actionable_tip: "Fix your API Key in Google AI Studio to get real insights.",
                mood: "neutral"
            };
        }
    }
};
