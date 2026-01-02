
import { GoogleGenAI, Type } from "@google/genai";

export const getHabitSuggestions = async (currentHabits: string[]) => {
  try {
    const apiKey = process.env.API_KEY;
    
    if (!apiKey || apiKey === "undefined" || apiKey === "") {
      throw new Error("MISSING_API_KEY");
    }

    const ai = new GoogleGenAI({ apiKey });
    
    // Prompt mais rigoroso para garantir retorno de JSON válido
    const prompt = `Você é um assistente de produtividade. 
    O usuário já tem estas metas: ${currentHabits.length > 0 ? currentHabits.join(', ') : 'nenhuma'}.
    Sugira exatamente 5 metas para o próximo mês que ajudem no bem-estar.
    Retorne apenas o JSON puro, sem markdown, seguindo este esquema exato:
    [{"name": "título curto", "description": "descrição breve", "reason": "por que fazer"}]`;

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

    const text = response.text;
    if (!text) throw new Error("EMPTY_RESPONSE");

    // Tenta limpar o JSON caso venha com lixo
    let cleanJson = text.trim();
    if (cleanJson.includes("[") && cleanJson.includes("]")) {
      const start = cleanJson.indexOf("[");
      const end = cleanJson.lastIndexOf("]") + 1;
      cleanJson = cleanJson.substring(start, end);
    }

    const parsed = JSON.parse(cleanJson);
    if (!Array.isArray(parsed)) return [];
    
    return parsed;
  } catch (error: any) {
    console.error("Erro no GeminiService:", error);
    if (error.message === "MISSING_API_KEY") {
      throw new Error("A chave de API não foi configurada no Vercel. Adicione API_KEY nas Environment Variables.");
    }
    throw error;
  }
};

export const getMotivationMessage = async (habitName: string) => {
  try {
    const apiKey = process.env.API_KEY;
    if (!apiKey) return "Continue firme no seu propósito!";

    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `O usuário completou a meta "${habitName}". Escreva uma frase de incentivo muito curta (máximo 8 palavras).`,
    });
    return response.text || "Excelente progresso hoje!";
  } catch (error) {
    return "Um passo de cada vez leva ao topo!";
  }
};
