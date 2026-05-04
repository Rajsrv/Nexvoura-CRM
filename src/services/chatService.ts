import { db } from '../firebase';
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  limit, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  doc, 
  serverTimestamp, 
  getDocs,
  getDoc,
  Timestamp,
  writeBatch,
  arrayUnion
} from 'firebase/firestore';
import { Conversation, ChatMessage, UserPresence, UserProfile, ContactGroup } from '../types';

export const chatService = {
  // --- Conversations ---

  getConversations: (companyId: string, userId: string, callback: (conversations: Conversation[]) => void) => {
    const q = query(
      collection(db, 'conversations'),
      where('companyId', '==', companyId),
      where('memberIds', 'array-contains', userId),
      orderBy('updatedAt', 'desc')
    );

    return onSnapshot(q, (snap) => {
      const conversations = snap.docs.map(doc => {
        const data = doc.data();
        // Convert Timestamps to ISO strings
        const lastMessage = data.lastMessage ? {
          ...data.lastMessage,
          createdAt: data.lastMessage.createdAt && typeof data.lastMessage.createdAt.toDate === 'function'
            ? data.lastMessage.createdAt.toDate().toISOString()
            : data.lastMessage.createdAt
        } : undefined;

        return { 
          id: doc.id, 
          ...data,
          lastMessage,
          updatedAt: data.updatedAt && typeof data.updatedAt.toDate === 'function'
            ? data.updatedAt.toDate().toISOString()
            : data.updatedAt
        } as Conversation;
      });
      callback(conversations);
    }, (error) => {
      console.error("ChatService conversations snapshot error:", error);
    });
  },

  createDirectConversation: async (companyId: string, userA: UserProfile, userB: UserProfile) => {
    // Check if exists
    const q = query(
      collection(db, 'conversations'),
      where('companyId', '==', companyId),
      where('type', '==', 'direct'),
      where('memberIds', 'array-contains', userA.uid)
    );

    const snap = await getDocs(q);
    const existing = snap.docs.find(doc => {
      const data = doc.data() as Conversation;
      return data.memberIds.includes(userB.uid);
    });

    if (existing) return existing.id;

    const docRef = await addDoc(collection(db, 'conversations'), {
      companyId,
      type: 'direct',
      memberIds: [userA.uid, userB.uid],
      createdBy: userA.uid,
      updatedAt: serverTimestamp()
    });

    return docRef.id;
  },

  createGroupConversation: async (companyId: string, creatorId: string, name: string, memberIds: string[]) => {
    const docRef = await addDoc(collection(db, 'conversations'), {
      companyId,
      type: 'group',
      name,
      memberIds: [creatorId, ...memberIds],
      createdBy: creatorId,
      updatedAt: serverTimestamp()
    });

    return docRef.id;
  },

  // --- Messages ---

  getMessages: (conversationId: string, callback: (messages: ChatMessage[]) => void) => {
    const q = query(
      collection(db, 'conversations', conversationId, 'messages'),
      orderBy('createdAt', 'asc'),
      limit(100)
    );

    return onSnapshot(q, (snap) => {
      const messages = snap.docs.map(doc => {
        const data = doc.data();
        return { 
          id: doc.id, 
          ...data,
          createdAt: data.createdAt && typeof data.createdAt.toDate === 'function'
            ? data.createdAt.toDate().toISOString()
            : data.createdAt
        } as ChatMessage;
      });
      callback(messages);
    }, (error) => {
      console.error("ChatService messages snapshot error:", error);
    });
  },

  sendMessage: async (conversationId: string, sender: UserProfile, content: string, mentions: string[] = []) => {
    const batch = writeBatch(db);
    
    // 1. Add Message
    const msgRef = doc(collection(db, 'conversations', conversationId, 'messages'));
    const messageData = {
      conversationId,
      senderId: sender.uid,
      senderName: sender.name,
      content,
      createdAt: serverTimestamp(),
      readBy: [sender.uid],
      mentions
    };
    batch.set(msgRef, messageData);

    // 2. Update Conversation (lastMessage & updatedAt)
    const convRef = doc(db, 'conversations', conversationId);
    batch.update(convRef, {
      lastMessage: {
        content,
        senderId: sender.uid,
        senderName: sender.name,
        createdAt: serverTimestamp()
      },
      updatedAt: serverTimestamp()
    });

    await batch.commit();

    // 3. Create Notifications (optional/async)
    // In a real app, this would be a Cloud Function. 
    // Here we can manually add to /notifications if needed, but rules-wise it might be complex
    // unless the sender has permission to create notifications for others.
  },

  markAsRead: async (conversationId: string, messageId: string, userId: string) => {
    const msgRef = doc(db, 'conversations', conversationId, 'messages', messageId);
    await updateDoc(msgRef, {
      readBy: arrayUnion(userId)
    });
  },

  // --- Presence ---
  updatePresence: async (userId: string, companyId: string, status: UserPresence['status'], typingIn: string | null = null, story?: UserPresence['story']) => {
    const presenceRef = doc(db, 'userPresence', userId);
    const presenceData: any = {
      status,
      lastSeen: serverTimestamp(),
      typingIn,
      companyId
    };

    if (story) {
      const cleanStory: any = {
        content: story.content,
        createdAt: serverTimestamp(),
        expiresAt: Timestamp.fromDate(new Date(story.expiresAt))
      };
      if (story.mediaUrl) cleanStory.mediaUrl = story.mediaUrl;
      if (story.mediaType) cleanStory.mediaType = story.mediaType;
      presenceData.story = cleanStory;
    }

    await updateDoc(presenceRef, presenceData).catch(async (err) => {
      // If doc doesn't exist, create it
      if (err.code === 'not-found') {
        const { setDoc } = await import('firebase/firestore');
        await setDoc(presenceRef, presenceData);
      }
    });
  },

  getPresence: (userIds: string[], callback: (presence: Record<string, UserPresence>) => void) => {
    // Note: Firestore 'in' query supports up to 30 items
    if (userIds.length === 0) {
      callback({});
      return () => {};
    }

    const q = query(
      collection(db, 'userPresence'),
      where('__name__', 'in', userIds.slice(0, 30))
    );

    return onSnapshot(q, (snap) => {
      const presence: Record<string, UserPresence> = {};
      snap.docs.forEach(doc => {
        const data = doc.data();
        let lastSeenIso = new Date().toISOString();
        try {
          if (data.lastSeen && typeof data.lastSeen.toDate === 'function') {
            lastSeenIso = data.lastSeen.toDate().toISOString();
          }
        } catch (e) {
          console.warn("Presence lastSeen conversion failed:", e);
        }

        const story = data.story ? {
          ...data.story,
          createdAt: data.story.createdAt?.toDate?.()?.toISOString() || data.story.createdAt,
          expiresAt: data.story.expiresAt?.toDate?.()?.toISOString() || data.story.expiresAt
        } : undefined;

        presence[doc.id] = { 
          uid: doc.id, 
          ...data,
          lastSeen: lastSeenIso,
          story
        } as UserPresence;
      });
      callback(presence);
    }, (error) => {
      console.error("ChatService presence snapshot error:", error);
    });
  },

  // --- Contact Groups ---
  getContactGroups: (companyId: string, userId: string, callback: (groups: ContactGroup[]) => void) => {
    const q = query(
      collection(db, 'contactGroups'),
      where('companyId', '==', companyId),
      where('createdBy', '==', userId)
    );

    return onSnapshot(q, (snap) => {
      const groups = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as ContactGroup));
      callback(groups);
    }, (error) => {
      console.error("ChatService contactGroups snapshot error:", error);
    });
  },

  createContactGroup: async (companyId: string, userId: string, name: string, memberIds: string[]) => {
    const docRef = await addDoc(collection(db, 'contactGroups'), {
      companyId,
      createdBy: userId,
      name,
      memberIds,
      createdAt: serverTimestamp()
    });
    return docRef.id;
  },

  updateContactGroup: async (groupId: string, name: string, memberIds: string[]) => {
    const docRef = doc(db, 'contactGroups', groupId);
    await updateDoc(docRef, {
      name,
      memberIds,
      updatedAt: serverTimestamp()
    });
  },

  deleteContactGroup: async (groupId: string) => {
    const { deleteDoc } = await import('firebase/firestore');
    await deleteDoc(doc(db, 'contactGroups', groupId));
  }
};
