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
      SEMPRE liste "Pré-requisitos" ou "Condições" se o texto mencionar.
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
    // Faster, simpler prompt for ID generation
    const cleanQ = question.replace(/[^a-zA-Z0-9 ]/g, "").toLowerCase();
    const prompt = `Create a short kebab-case ID for "PF ${pfNumber} ${cleanQ}". Max 4 words. Output ONLY the ID.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });

    const slug = response.text?.trim() || `pf-${pfNumber}`;
    return slug.replace(/[^a-z0-9-]/g, '');
  } catch (error) {
    console.error("Error generating Smart ID:", error);
    return `pf-${pfNumber}-${Date.now().toString().slice(-4)}`;
  }
};

export const fetchPFTitle = async (url: string): Promise<{ title: string; pfNumber: string }> => {
  try {
    const urlObj = new URL(url);
    const idParam = urlObj.searchParams.get("id");
    let title = "";

    // OPTIMIZATION: If it's a standard Secullum URL, assume we just need the title.
    // Use a very fast search prompt.
    const prompt = `
      Find the exact page title for: ${url}
      Return ONLY the title in plain text.
      If it starts with "PF XXX -", include that part.
    `;

    // We use search tool because the page content is dynamic
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
      },
    });

    let rawTitle = response.text?.trim() || "";
    
    // Attempt to extract PF ID from title if URL param failed
    let pfFromTitle = "";
    const pfMatch = rawTitle.match(/PF\s*(\d+)/i);
    if (pfMatch) {
        pfFromTitle = pfMatch[1];
    }

    // Cleaning up the title for display
    title = rawTitle
        .replace(/^PF\s*\d+\s*-\s*/i, '') // Remove "PF 123 - " prefix
        .replace(/\s*-\s*Secullum.*$/i, '') // Remove " - Secullum" suffix
        .trim();

    return {
      title: title,
      pfNumber: idParam || pfFromTitle || ""
    };
  } catch (error) {
    console.error("Error fetching URL metadata:", error);
    try {
        const id = new URL(url).searchParams.get("id") || "";
        return { title: "", pfNumber: id };
    } catch {
        return { title: "", pfNumber: "" };
    }
  }
};