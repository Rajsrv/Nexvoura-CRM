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
import { Conversation, ChatMessage, UserPresence, UserProfile } from '../types';

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
      const conversations = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Conversation));
      callback(conversations);
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
      const messages = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as ChatMessage));
      callback(messages);
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

  updatePresence: async (userId: string, status: 'online' | 'offline', typingIn: string | null = null) => {
    const presenceRef = doc(db, 'userPresence', userId);
    await updateDoc(presenceRef, {
      status,
      lastSeen: serverTimestamp(),
      typingIn
    }).catch(async (err) => {
      // If doc doesn't exist, create it
      if (err.code === 'not-found') {
        const { setDoc } = await import('firebase/firestore');
        await setDoc(presenceRef, {
          status,
          lastSeen: serverTimestamp(),
          typingIn
        });
      }
    });
  },

  getPresence: (userIds: string[], callback: (presence: Record<string, UserPresence>) => void) => {
    // Note: Firestore 'in' query supports up to 30 items
    // For many users, this might need optimization
    if (userIds.length === 0) return () => {};

    const q = query(
      collection(db, 'userPresence'),
      where('__name__', 'in', userIds.slice(0, 30))
    );

    return onSnapshot(q, (snap) => {
      const presence: Record<string, UserPresence> = {};
      snap.docs.forEach(doc => {
        const data = doc.data();
        presence[doc.id] = { 
          uid: doc.id, 
          ...data,
          lastSeen: data.lastSeen?.toDate()?.toISOString() || new Date().toISOString()
        } as UserPresence;
      });
      callback(presence);
    });
  }
};
