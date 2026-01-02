
import { GoogleGenAI, Type } from "@google/genai";

export const getHabitSuggestions = async (currentHabits: string[]) => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const prompt = currentHabits.length > 0 
      ? `O usuário do aplicativo Constância+ já está rastreando estas metas: ${currentHabits.join(', ')}. Sugira 3 novas metas saudáveis e motivadoras para o mês.`
      : "Sugira 5 metas de hábitos saudáveis e fáceis de começar para uma pessoa que quer usar o Constância+ para melhorar sua rotina mensal.";

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
    if (!text) return [];

    // Limpeza de possíveis blocos de código markdown que a IA possa retornar
    let jsonStr = text.trim();
    if (jsonStr.startsWith("```")) {
      jsonStr = jsonStr.replace(/^```json\n?/, "").replace(/\n?```$/, "");
    }

    return JSON.parse(jsonStr);
  } catch (error) {
    console.error("Erro na integração com Gemini (Sugestões):", error);
    return [];
  }
};

export const getMotivationMessage = async (habitName: string) => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `O usuário do Constância+ completou uma tarefa hoje. Dê uma frase curta, motivadora e inspiradora em português para alguém que quer manter a meta de "${habitName}".`,
    });
    return response.text || "Continue firme! Cada dia conta.";
  } catch (error) {
    console.error("Erro na integração com Gemini (Motivação):", error);
    return "Parabéns por mais um passo rumo à sua melhor versão!";
  }
};
