import { IntelligencePost } from "../types";

export const conductIntelligenceSearch = async (query: string): Promise<IntelligencePost[]> => {
  try {
    const response = await fetch("/api/intelligence/search", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || "Search failed");
    }

    const data = await response.json();
    
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
        imageUrl: `https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&q=80&w=800&sig=${idx % 10}`
      }) as IntelligencePost);
    }
    
    return [];
  } catch (error) {
    console.error("AI Intelligence Search Failed:", error);
    throw error;
  }
};
