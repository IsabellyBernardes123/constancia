
import { GoogleGenAI, Type } from "@google/genai";

export const getHabitSuggestions = async (currentHabits: string[]) => {
  try {
    const apiKey = process.env.API_KEY;
    if (!apiKey) {
      console.error("ERRO: API_KEY não encontrada no ambiente.");
      return [];
    }

    const ai = new GoogleGenAI({ apiKey });
    
    // Prompt otimizado para ser curto e preciso
    const prompt = `Atue como um coach de bem-estar. O usuário monitora estas metas: ${currentHabits.length > 0 ? currentHabits.join(', ') : 'nenhuma'}.
    Sugira 5 novas metas saudáveis para o mês. 
    Retorne APENAS um JSON no formato: [{"name": "nome", "description": "como fazer", "reason": "benefício"}].`;

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING },
              description: { type: Type.STRING },
              reason: { type: Type.STRING }
            },
            required: ["name", "description", "reason"]
          }
        }
      }
    });

    const result = response.text;
    if (!result) {
      console.warn("IA retornou texto vazio.");
      return [];
    }

    // Limpeza de segurança caso a IA retorne markdown
    let cleanedJson = result.trim();
    if (cleanedJson.startsWith("```")) {
      cleanedJson = cleanedJson.replace(/^```json\n?/, "").replace(/\n?```$/, "");
    }

    return JSON.parse(cleanedJson);
  } catch (error) {
    console.error("Erro crítico na integração Gemini (Sugestões):", error);
    throw error; // Lança para o App.tsx tratar visualmente
  }
};

export const getMotivationMessage = async (habitName: string) => {
  try {
    const apiKey = process.env.API_KEY;
    if (!apiKey) return "Continue firme!";

    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `O usuário completou a meta "${habitName}". Dê uma frase de incentivo de até 10 palavras em português.`,
    });
    return response.text || "Parabéns por completar sua meta!";
  } catch (error) {
    console.error("Erro Gemini (Motivação):", error);
    return "Excelente trabalho! Continue assim.";
  }
};
