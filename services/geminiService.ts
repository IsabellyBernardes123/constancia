
import { GoogleGenAI, Type } from "@google/genai";

// Initialize the GoogleGenAI client with the API key from environment variables.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const getHabitSuggestions = async (currentHabits: string[]) => {
  const prompt = currentHabits.length > 0 
    ? `O usuário do aplicativo Constância+ já está rastreando estas metas: ${currentHabits.join(', ')}. Sugira 3 novas metas saudáveis e motivadoras para o mês.`
    : "Sugira 5 metas de hábitos saudáveis e fáceis de começar para uma pessoa que quer usar o Constância+ para melhorar sua rotina mensal.";

  try {
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

    return JSON.parse(response.text || '[]');
  } catch (error) {
    console.error("Erro ao buscar sugestões:", error);
    return [];
  }
};

export const getMotivationMessage = async (habitName: string) => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `O usuário do Constância+ completou uma tarefa hoje. Dê uma frase curta, motivadora e inspiradora em português para alguém que quer manter a meta de "${habitName}".`,
    });
    return response.text;
  } catch (error) {
    return "Continue firme! Cada dia conta.";
  }
};
