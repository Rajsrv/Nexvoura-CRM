import React, { createContext, useContext, useEffect, useState } from 'react';
import { chatService } from '../services/chatService';
import { UserProfile, UserPresence } from '../types';

interface PresenceContextType {
  presenceMap: Record<string, UserPresence>;
  setTyping: (conversationId: string | null) => void;
}

const PresenceContext = createContext<PresenceContextType | undefined>(undefined);

export function PresenceProvider({ children, user, companyMembers }: { 
  children: React.ReactNode, 
  user: UserProfile | null,
  companyMembers: UserProfile[]
}) {
  const [presenceMap, setPresenceMap] = useState<Record<string, UserPresence>>({});

  useEffect(() => {
    if (!user) return;

    // 1. Mark self as online
    chatService.updatePresence(user.uid, user.companyId, 'online');

    // 2. Cleanup on disconnect/unmount
    const handleVisibilityChange = () => {
      const status = document.visibilityState === 'visible' ? 'online' : 'offline';
      chatService.updatePresence(user.uid, user.companyId, status);
    };

    window.addEventListener('visibilitychange', handleVisibilityChange);
    
    // Periodically heartbeat
    const interval = setInterval(() => {
      chatService.updatePresence(user.uid, user.companyId, 'online');
    }, 60000); // Every 1 minute

    return () => {
      window.removeEventListener('visibilitychange', handleVisibilityChange);
      clearInterval(interval);
      chatService.updatePresence(user.uid, user.companyId, 'offline');
    };
  }, [user]);

  useEffect(() => {
    if (!user || companyMembers.length === 0) return;

    // Listen to presence of all members (first 30 for now)
    const memberIds = companyMembers.map(m => m.uid).filter(id => id !== user.uid);
    const unsub = chatService.getPresence(memberIds, (map) => {
      setPresenceMap(map);
    });

    return () => unsub();
  }, [user, companyMembers]);

  const setTyping = (conversationId: string | null) => {
    if (!user) return;
    chatService.updatePresence(user.uid, user.companyId, 'online', conversationId);
  };

  return (
    <PresenceContext.Provider value={{ presenceMap, setTyping }}>
      {children}
    </PresenceContext.Provider>
  );
}

export function usePresence() {
  const context = useContext(PresenceContext);
  if (context === undefined) {
    throw new Error('usePresence must be used within a PresenceProvider');
  }
  return context;
}
