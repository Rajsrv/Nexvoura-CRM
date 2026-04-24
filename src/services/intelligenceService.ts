import { collection, query, where, orderBy, onSnapshot, addDoc, serverTimestamp, getDocs, limit } from 'firebase/firestore';
import { db } from '../firebase';
import { IntelligencePost } from '../types';

export const getIntelligencePosts = (companyId: string, type: 'Internal' | 'Global', callback: (posts: IntelligencePost[]) => void) => {
  const q = type === 'Internal' 
    ? query(
        collection(db, 'intelligence'),
        where('companyId', '==', companyId),
        where('type', '==', 'Internal'),
        orderBy('createdAt', 'desc')
      )
    : query(
        collection(db, 'intelligence'),
        where('type', '==', 'Global'),
        orderBy('createdAt', 'desc'),
        limit(20)
      );

  return onSnapshot(q, (snapshot) => {
    const posts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as IntelligencePost));
    callback(posts);
  });
};

export const postIntelligence = async (post: Partial<IntelligencePost>) => {
  await addDoc(collection(db, 'intelligence'), {
    ...post,
    createdAt: serverTimestamp(),
  });
};

// Simulated Global Intelligence (In a real app, this would call a news API + Gemini)
export const fetchGlobalIntelligence = async (interests: string[]) => {
  // For demo purposes, we return a curated list that "pretends" to be live
  const allSignals = [
    {
      id: 'g1',
      type: 'Global',
      title: 'The AI Singularity in Enterprise SaaS',
      content: 'New report suggests AI automation will handle 40% of standard HR tasks by 2025.',
      topic: 'Technology',
      source: 'Future Tech Review',
      imageUrl: 'https://images.unsplash.com/photo-1677442136019-21780ecad995?auto=format&fit=crop&q=80&w=800',
      link: '#',
      relevance: 95,
      createdAt: new Date().toISOString()
    },
    {
      id: 'g2',
      type: 'Global',
      title: 'Global Remote Work Regulations Tighten',
      content: 'New EU directives require companies to provide standardized equipment for remote workers.',
      topic: 'Compliance',
      source: 'Global HR Watch',
      imageUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=800',
      link: '#',
      relevance: 82,
      createdAt: new Date().toISOString()
    },
    {
      id: 'g3',
      type: 'Global',
      title: 'Crypto-Payroll Mainstreaming',
      content: 'Major payroll providers are integrating USDC and Bitcoin payment rails for contractors.',
      topic: 'Finance',
      source: 'Fintech Daily',
      imageUrl: 'https://images.unsplash.com/photo-1621761191319-c6fb62004009?auto=format&fit=crop&q=80&w=800',
      link: '#',
      relevance: 75,
      createdAt: new Date().toISOString()
    }
  ];

  if (interests.length === 0) return allSignals;
  
  return allSignals.filter(signal => 
    interests.some(interest => 
      signal.topic.toLowerCase().includes(interest.toLowerCase()) || 
      signal.title.toLowerCase().includes(interest.toLowerCase())
    )
  );
};
