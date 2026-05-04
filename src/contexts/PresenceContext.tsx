import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { chatService } from '../services/chatService';
import { UserProfile, UserPresence, ContactGroup } from '../types';

interface PresenceContextType {
  presenceMap: Record<string, UserPresence>;
  contactGroups: ContactGroup[];
  setTyping: (conversationId: string | null) => void;
  updateStatus: (status: UserPresence['status']) => void;
  createGroup: (name: string, members: string[]) => Promise<string>;
  deleteGroup: (groupId: string) => Promise<void>;
  setStory: (content: string, mediaUrl?: string, mediaType?: 'image' | 'video') => Promise<void>;
}

const PresenceContext = createContext<PresenceContextType | undefined>(undefined);

export function PresenceProvider({ children, user, companyMembers }: { 
  children: React.ReactNode, 
  user: UserProfile | null,
  companyMembers: UserProfile[]
}) {
  const [presenceMap, setPresenceMap] = useState<Record<string, UserPresence>>({});
  const [contactGroups, setContactGroups] = useState<ContactGroup[]>([]);
  const [currentStatus, setCurrentStatus] = useState<UserPresence['status']>('online');
  const [manualStatus, setManualStatus] = useState<boolean>(false);

  useEffect(() => {
    if (!user) return;

    // 1. Initial presence
    chatService.updatePresence(user.uid, user.companyId, 'online');

    // 2. Groups
    const unsubGroups = chatService.getContactGroups(user.companyId, user.uid, setContactGroups);

    // 3. Visibility handling
    const handleVisibilityChange = () => {
      if (manualStatus) return; // Don't override if user explicitly set a status
      const status = document.visibilityState === 'visible' ? 'online' : 'away';
      setCurrentStatus(status);
      chatService.updatePresence(user.uid, user.companyId, status);
    };

    window.addEventListener('visibilitychange', handleVisibilityChange);
    
    // Periodically heartbeat
    const interval = setInterval(() => {
      chatService.updatePresence(user.uid, user.companyId, currentStatus);
    }, 60000);

    return () => {
      window.removeEventListener('visibilitychange', handleVisibilityChange);
      clearInterval(interval);
      unsubGroups();
      chatService.updatePresence(user.uid, user.companyId, 'offline');
    };
  }, [user?.uid, user?.companyId, manualStatus, currentStatus]);

  useEffect(() => {
    if (!user?.uid || !user?.companyId || companyMembers.length === 0) return;

    const memberIds = companyMembers.map(m => m.uid).filter(id => id !== user.uid);
    const unsub = chatService.getPresence(memberIds, setPresenceMap);

    return () => unsub();
  }, [user?.uid, user?.companyId, companyMembers.length]);

  const [typingTimeout, setTypingTimeout] = useState<NodeJS.Timeout | null>(null);
  const lastStateRef = useRef<string | null>(null);

  const setTyping = (conversationId: string | null) => {
    if (!user) return;
    if (typingTimeout) clearTimeout(typingTimeout);

    if (conversationId !== lastStateRef.current) {
      chatService.updatePresence(user.uid, user.companyId, currentStatus, conversationId);
      lastStateRef.current = conversationId;
    }

    if (conversationId) {
      const timeout = setTimeout(() => {
        chatService.updatePresence(user.uid, user.companyId, currentStatus, null);
        lastStateRef.current = null;
      }, 4000); 
      setTypingTimeout(timeout);
    }
  };

  const updateStatus = (status: UserPresence['status']) => {
    if (!user) return;
    setCurrentStatus(status);
    setManualStatus(status !== 'online');
    chatService.updatePresence(user.uid, user.companyId, status);
  };

  const createGroup = async (name: string, members: string[]) => {
    if (!user) return '';
    return chatService.createContactGroup(user.companyId, user.uid, name, members);
  };

  const deleteGroup = async (groupId: string) => {
    return chatService.deleteContactGroup(groupId);
  };

  const setStory = async (content: string, mediaUrl?: string, mediaType?: 'image' | 'video') => {
    if (!user) return;
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);
    
    await chatService.updatePresence(user.uid, user.companyId, currentStatus, null, {
      content,
      mediaUrl,
      mediaType,
      createdAt: new Date().toISOString(),
      expiresAt: expiresAt.toISOString()
    });
  };

  return (
    <PresenceContext.Provider value={{ 
      presenceMap, 
      contactGroups, 
      setTyping, 
      updateStatus, 
      createGroup, 
      deleteGroup,
      setStory 
    }}>
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
