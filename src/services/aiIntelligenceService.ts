import { GoogleGenAI } from "@google/genai";
import { IntelligencePost } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export const conductIntelligenceSearch = async (query: string): Promise<IntelligencePost[]> => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Search for real-time information regarding: "${query}". 
      Return the information as a JSON array of IntelligencePost objects.
      Each object must have: title, content (summary), topic, source, link (if found), and relevance (0-100).
      Ensure the news is current and highly relevant.`,
      config: {
        tools: [{ googleSearch: {} }],
        responseMimeType: "application/json",
      }
    });

    const text = response.text;
    if (!text) return [];

    try {
      const data = JSON.parse(text);
      if (Array.isArray(data)) {
        return data.map((item: any, idx: number) => ({
          id: `search-result-${Date.now()}-${idx}`,
          type: 'Global',
          title: item.title || 'Signal Detected',
          content: item.content || 'Intelligence gathering incomplete.',
          topic: item.topic || 'General',
          source: item.source || 'Open Source Intelligence',
          link: item.link || '#',
          relevance: item.relevance || 50,
          createdAt: new Date().toISOString(),
          imageUrl: `https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&q=80&w=800&sig=${idx}`
        }) as IntelligencePost);
      }
    } catch (parseError) {
      console.error("Failed to parse search results:", parseError);
    }
    
    return [];
  } catch (error) {
    console.error("AI Intelligence Search Failed:", error);
    throw error;
  }
};
