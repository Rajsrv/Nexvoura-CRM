import { 
  collection, 
  addDoc, 
  query, 
  where, 
  onSnapshot, 
  orderBy, 
  serverTimestamp, 
  updateDoc, 
  doc,
  getDocs,
  getDoc,
  Timestamp
} from 'firebase/firestore';
import { db } from '../firebase';
import { SupportTicket, SupportMessage } from '../types';

export const supportService = {
  // Generate a random token for guest access
  generateToken: () => {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  },

  // Create a new support ticket
  createTicket: async (data: { userName: string, userEmail: string, subject: string, companyId?: string }) => {
    const token = supportService.generateToken();
    const ticketRef = await addDoc(collection(db, 'supportTickets'), {
      ...data,
      token,
      status: 'open',
      priority: 'medium',
      createdAt: serverTimestamp(),
      lastMessageAt: serverTimestamp()
    });
    return { id: ticketRef.id, token };
  },

  // Send a message
  sendMessage: async (ticketId: string, content: string, sender: { id: string, name: string, role: 'user' | 'admin' }) => {
    await addDoc(collection(db, 'supportMessages'), {
      ticketId,
      content,
      senderId: sender.id,
      senderName: sender.name,
      senderRole: sender.role,
      createdAt: serverTimestamp()
    });

    // Update ticket last message timestamp
    await updateDoc(doc(db, 'supportTickets', ticketId), {
      lastMessageAt: serverTimestamp(),
      status: sender.role === 'admin' ? 'active' : 'open'
    });
  },

  // Listen to messages for a ticket
  onMessages: (ticketId: string, callback: (messages: SupportMessage[]) => void) => {
    const q = query(
      collection(db, 'supportMessages'),
      where('ticketId', '==', ticketId),
      orderBy('createdAt', 'asc')
    );

    return onSnapshot(q, (snapshot) => {
      const messages = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: (doc.data().createdAt as Timestamp)?.toDate().toISOString() || new Date().toISOString()
      } as SupportMessage));
      callback(messages);
    });
  },

  // Get ticket details (used for guest validation)
  getTicket: async (ticketId: string) => {
    const ticketDoc = await getDoc(doc(db, 'supportTickets', ticketId));
    if (!ticketDoc.exists()) return null;
    const data = ticketDoc.data();
    return {
      id: ticketDoc.id,
      ...data,
      createdAt: (data.createdAt as Timestamp)?.toDate().toISOString() || new Date().toISOString(),
      lastMessageAt: (data.lastMessageAt as Timestamp)?.toDate().toISOString() || new Date().toISOString()
    } as SupportTicket;
  },

  // ADMIN: Listen to all active tickets
  onAllTickets: (callback: (tickets: SupportTicket[]) => void) => {
    const q = query(
      collection(db, 'supportTickets'),
      orderBy('lastMessageAt', 'desc')
    );

    return onSnapshot(q, (snapshot) => {
      const tickets = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: (doc.data().createdAt as Timestamp)?.toDate().toISOString() || new Date().toISOString(),
        lastMessageAt: (doc.data().lastMessageAt as Timestamp)?.toDate().toISOString() || new Date().toISOString()
      } as SupportTicket));
      callback(tickets);
    });
  },

  // Update ticket status
  updateTicketStatus: async (ticketId: string, status: SupportTicket['status']) => {
    await updateDoc(doc(db, 'supportTickets', ticketId), { status });
  }
};
