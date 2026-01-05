import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const summarizeFAQContent = async (
  pfNumber: string,
  question: string,
  content: string,
  system: string
): Promise<string> => {
  try {
    const prompt = `
      Você é um assistente técnico especialista em sistemas da Secullum.
      Analise o seguinte conteúdo de uma Pergunta Frequente (PF).
      
      Informações:
      - Sistema: ${system}
      - Número da PF: ${pfNumber}
      - Pergunta/Título: ${question}
      
      Conteúdo Bruto:
      ${content}
      
      Tarefa:
      Crie um resumo conciso e técnico (máximo 3 parágrafos).
      Foque na causa do problema e na solução apresentada.
      Se o conteúdo estiver vazio ou irrelevante, avise.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });

    return response.text || "Não foi possível gerar um resumo.";
  } catch (error) {
    console.error("Error summarizing FAQ:", error);
    return "Erro ao comunicar com a IA. Verifique sua chave de API ou tente novamente mais tarde.";
  }
};

export const generateSmartId = async (pfNumber: string, question: string): Promise<string> => {
  try {
    const prompt = `
      Gere um ID único (slug) curto e descritivo para uma FAQ.
      Formato: kebab-case, sem acentos, minúsculo.
      Deve combinar o número da PF e palavras-chave do título.
      
      Exemplo Entrada: PF 685 - Erro de comunicação Henry
      Exemplo Saída: pf-685-erro-comunicacao-henry

      Entrada: PF ${pfNumber} - ${question}
      Saída (apenas o ID):
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });

    const slug = response.text?.trim() || `pf-${pfNumber}-${Date.now()}`;
    // Remove any accidental formatting or whitespace
    return slug.replace(/[^a-z0-9-]/g, '');
  } catch (error) {
    console.error("Error generating Smart ID:", error);
    return `pf-${pfNumber}-${Date.now()}`; // Fallback
  }
};
