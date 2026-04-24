import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../App';
import { chatService } from '../services/chatService';
import { Conversation, ChatMessage, UserProfile, UserPresence } from '../types';
import { usePresence } from '../contexts/PresenceContext';
import { Search, Send, Plus, Users, User as UserIcon, MoreVertical, Hash, Image, Paperclip, Smile, Phone, Video, Info, ChevronLeft, Circle, MessageSquare, X } from 'lucide-react';
import { format, isToday, isYesterday, parseISO } from 'date-fns';
import { motion, AnimatePresence } from 'motion/react';
import { db } from '../firebase';
import { collection, onSnapshot, query, where } from 'firebase/firestore';

export default function ChatPage() {
  const { user, company } = useAuth();
  const { presenceMap, setTyping } = usePresence();
  
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [teamMembers, setTeamMembers] = useState<UserProfile[]>([]);
  const [showMemberSelector, setShowMemberSelector] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 1. Fetch Conversations
  useEffect(() => {
    if (!user) return;
    const unsub = chatService.getConversations(user.companyId, user.uid, (convs) => {
      setConversations(convs);
    });
    return () => unsub();
  }, [user]);

  // 2. Fetch Team Members for new chat
  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, 'users'),
      where('companyId', '==', user.companyId)
    );
    const unsub = onSnapshot(q, (snap) => {
      const members = snap.docs.map(doc => ({ uid: doc.id, ...doc.data() } as UserProfile));
      setTeamMembers(members.filter(m => m.uid !== user.uid));
    });
    return () => unsub();
  }, [user]);

  // 3. Fetch Messages when conversation selected
  useEffect(() => {
    if (!selectedConversation) {
      setMessages([]);
      return;
    }
    const unsub = chatService.getMessages(selectedConversation.id, (msgs) => {
      setMessages(msgs);
      scrollToBottom();
    });
    return () => unsub();
  }, [selectedConversation]);

  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  const handleSendMessage = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!selectedConversation || !newMessage.trim() || !user) return;

    const content = newMessage.trim();
    setNewMessage('');
    setTyping(null);
    
    await chatService.sendMessage(selectedConversation.id, user, content);
    scrollToBottom();
  };

  const startDirectChat = async (targetUser: UserProfile) => {
    if (!user) return;
    const convId = await chatService.createDirectConversation(user.companyId, user, targetUser);
    const existing = conversations.find(c => c.id === convId);
    if (existing) {
      setSelectedConversation(existing);
    } else {
      // It will come through the snapshot listener, but we can set a temp state or wait
    }
    setShowMemberSelector(false);
  };

  const formatMessageTime = (dateStr: string) => {
    const date = parseISO(dateStr);
    if (isToday(date)) return format(date, 'HH:mm');
    if (isYesterday(date)) return 'Yesterday';
    return format(date, 'MMM d');
  };

  const getTargetUser = (conv: Conversation) => {
    if (conv.type === 'group') return null;
    const targetId = conv.memberIds.find(id => id !== user?.uid);
    return teamMembers.find(m => m.uid === targetId);
  };

  const isUserOnline = (uid: string) => {
    return presenceMap[uid]?.status === 'online';
  };

  const getTypingUsers = (): UserPresence[] => {
    if (!selectedConversation) return [];
    const presences = Object.values(presenceMap) as UserPresence[];
    return presences.filter(p => 
      p && p.typingIn === selectedConversation.id && p.uid !== user?.uid
    );
  };

  return (
    <div className="h-[calc(100vh-160px)] flex bg-white dark:bg-dark-surface rounded-3xl border border-slate-200/60 dark:border-dark-border shadow-2xl shadow-slate-200/50 dark:shadow-none overflow-hidden">
      {/* Sidebar: Conversations List */}
      <div className={`w-full md:w-80 lg:w-96 flex flex-col border-r border-slate-100 dark:border-dark-border ${selectedConversation ? 'hidden md:flex' : 'flex'}`}>
        <div className="p-6 border-b border-slate-50 dark:border-dark-border">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-black text-slate-900 dark:text-white flex items-center space-x-2">
              <MessageSquare className="text-brand-primary" size={24} />
              <span>Directives</span>
            </h2>
            <button 
              onClick={() => setShowMemberSelector(true)}
              className="p-2 bg-brand-primary/10 text-brand-primary rounded-xl hover:bg-brand-primary hover:text-white transition-all shadow-lg shadow-brand-primary/10"
            >
              <Plus size={20} />
            </button>
          </div>
          
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-dark-text-muted" size={16} />
            <input 
              type="text" 
              placeholder="Search conversations..."
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-dark-bg border border-transparent dark:border-dark-border rounded-xl text-sm font-medium focus:ring-2 focus:ring-brand-primary/20 transition-all text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-dark-text-muted"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-2">
          {conversations.map((conv) => {
            const target = getTargetUser(conv);
            const isActive = selectedConversation?.id === conv.id;
            const online = target ? isUserOnline(target.uid) : false;

            return (
              <button
                key={conv.id}
                onClick={() => setSelectedConversation(conv)}
                className={`w-full flex items-center space-x-4 p-3 rounded-2xl transition-all group ${
                  isActive 
                    ? 'bg-brand-primary text-white shadow-xl shadow-brand-primary/20' 
                    : 'hover:bg-slate-50 dark:hover:bg-dark-bg text-slate-600 dark:text-slate-400'
                }`}
              >
                <div className="relative shrink-0">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center overflow-hidden border-2 ${isActive ? 'border-white/20' : 'border-emerald-100 dark:border-dark-border'}`}>
                    {conv.type === 'group' ? (
                      conv.photoURL ? <img src={conv.photoURL} alt={conv.name} className="w-full h-full object-cover" /> : <div className="bg-brand-primary/20 text-brand-primary"><Users size={20} /></div>
                    ) : (
                      target?.photoURL ? (
                        <img src={target.photoURL} alt={target.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      ) : (
                        <div className="bg-indigo-50 text-indigo-600 w-full h-full flex items-center justify-center font-bold text-xs uppercase">
                          {target?.name.substring(0, 2) || '??'}
                        </div>
                      )
                    )}
                  </div>
                  {online && (
                    <div className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-emerald-500 border-2 border-white dark:border-dark-surface rounded-full shadow-sm" />
                  )}
                </div>
                
                <div className="flex-1 min-w-0 text-left">
                  <div className="flex items-center justify-between mb-0.5">
                    <p className={`text-sm font-bold truncate ${isActive ? 'text-white' : 'text-slate-900 dark:text-white'}`}>
                      {conv.type === 'group' ? conv.name : target?.name}
                    </p>
                    {conv.lastMessage && (
                      <span className={`text-[10px] font-medium ${isActive ? 'text-white/70' : 'text-slate-400 dark:text-dark-text-muted'}`}>
                        {formatMessageTime(conv.lastMessage.createdAt)}
                      </span>
                    )}
                  </div>
                  <p className={`text-xs truncate ${isActive ? 'text-white/80' : 'text-slate-500'}`}>
                    {conv.lastMessage ? (
                      <>
                        <span className="font-bold">{conv.lastMessage.senderId === user?.uid ? 'You: ' : ''}</span>
                        {conv.lastMessage.content}
                      </>
                    ) : (
                      <span className="italic">No messages yet</span>
                    )}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Chat Window */}
      <div className={`flex-1 flex flex-col bg-slate-50/30 dark:bg-dark-bg/10 ${!selectedConversation ? 'hidden md:flex' : 'flex'}`}>
        {selectedConversation ? (
          <>
            {/* Chat Header */}
            <header className="h-20 flex items-center justify-between px-8 bg-white dark:bg-dark-surface border-b border-slate-100 dark:border-dark-border">
              <div className="flex items-center space-x-4">
                <button 
                  onClick={() => setSelectedConversation(null)}
                  className="md:hidden p-2 text-slate-400 dark:text-dark-text-muted hover:text-slate-900 dark:hover:text-white transition-colors"
                >
                  <ChevronLeft size={24} />
                </button>
                
                <div className="relative">
                  <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-dark-bg flex items-center justify-center overflow-hidden border border-slate-200 dark:border-dark-border">
                    {selectedConversation.type === 'group' ? (
                      <Users size={20} className="text-brand-primary" />
                    ) : (
                      getTargetUser(selectedConversation)?.photoURL ? (
                        <img src={getTargetUser(selectedConversation)?.photoURL} alt="Avatar" className="w-full h-full object-cover" />
                      ) : (
                        <UserIcon size={20} className="text-slate-400 dark:text-dark-text-muted" />
                      )
                    )}
                  </div>
                  {selectedConversation.type === 'direct' && isUserOnline(getTargetUser(selectedConversation)?.uid || '') && (
                    <div className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-emerald-500 border-2 border-white dark:border-dark-surface rounded-full shadow-sm" />
                  )}
                </div>
                
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white leading-none">
                    {selectedConversation.type === 'group' ? selectedConversation.name : getTargetUser(selectedConversation)?.name}
                  </h3>
                  <p className="text-[10px] font-bold text-slate-400 dark:text-dark-text-muted uppercase tracking-widest mt-1.5 flex items-center">
                    {selectedConversation.type === 'group' ? (
                      `${selectedConversation.memberIds.length} agents active`
                    ) : (
                      isUserOnline(getTargetUser(selectedConversation)?.uid || '') ? (
                        <span className="flex items-center text-emerald-500"><Circle size={8} fill="currentColor" className="mr-1.5" /> Online Now</span>
                      ) : (
                        `Last seen: ${presenceMap[getTargetUser(selectedConversation)?.uid || '']?.lastSeen ? format(parseISO(presenceMap[getTargetUser(selectedConversation)?.uid || ''].lastSeen), 'MMM d, HH:mm') : 'Offline'}`
                      )
                    )}
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <button className="p-2.5 text-slate-400 dark:text-dark-text-muted hover:text-brand-primary hover:bg-brand-primary/5 rounded-xl transition-all"><Phone size={18} /></button>
                <button className="p-2.5 text-slate-400 dark:text-dark-text-muted hover:text-brand-primary hover:bg-brand-primary/5 rounded-xl transition-all"><Video size={18} /></button>
                <button className="p-2.5 text-slate-400 dark:text-dark-text-muted hover:text-brand-primary hover:bg-brand-primary/5 rounded-xl transition-all"><Info size={18} /></button>
                <button className="p-2.5 text-slate-400 dark:text-dark-text-muted hover:text-slate-900 dark:hover:text-white rounded-xl hover:bg-slate-50 dark:hover:bg-dark-bg transition-all"><MoreVertical size={18} /></button>
              </div>
            </header>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-8 space-y-6">
              {messages.map((msg, index) => {
                const isMe = msg.senderId === user?.uid;
                const prevMsg = messages[index - 1];
                const showAvatar = !prevMsg || prevMsg.senderId !== msg.senderId;

                return (
                  <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'} items-end space-x-3`}>
                    {!isMe && (
                      <div className="w-8 h-8 rounded-lg bg-slate-200 dark:bg-dark-bg overflow-hidden shrink-0 mb-1 border dark:border-dark-border">
                        {showAvatar && (
                          <div className="w-full h-full flex items-center justify-center text-[10px] font-black text-slate-500 dark:text-dark-text-muted uppercase">
                             {msg.senderName.substring(0, 2)}
                          </div>
                        )}
                      </div>
                    )}
                    <div className={`max-w-[70%] space-y-1`}>
                      {showAvatar && !isMe && (
                        <p className="text-[10px] font-black text-slate-400 dark:text-dark-text-muted uppercase tracking-widest ml-1">{msg.senderName}</p>
                      )}
                      <div className={`px-5 py-3 rounded-2xl text-sm font-medium leading-relaxed shadow-sm ${
                        isMe 
                          ? 'bg-brand-primary text-white rounded-br-none shadow-brand-primary/10' 
                          : 'bg-white dark:bg-dark-bg text-slate-700 dark:text-slate-200 rounded-bl-none border border-slate-100 dark:border-dark-border shadow-slate-200/20 dark:shadow-none'
                      }`}>
                        {msg.content}
                      </div>
                      <p className={`text-[9px] font-bold text-slate-400 dark:text-dark-text-muted uppercase tracking-tighter ${isMe ? 'text-right' : 'text-left'}`}>
                        {format(parseISO(msg.createdAt), 'HH:mm')}
                      </p>
                    </div>
                  </div>
                );
              })}
              
              {/* Typing indicators */}
              {getTypingUsers().length > 0 && (
                <div className="flex items-center space-x-2 text-slate-400 dark:text-dark-text-muted italic text-[11px] animate-pulse">
                  <div className="flex space-x-1">
                    <div className="w-1.5 h-1.5 bg-slate-300 dark:bg-slate-700 rounded-full" />
                    <div className="w-1.5 h-1.5 bg-slate-300 dark:bg-slate-700 rounded-full" />
                    <div className="w-1.5 h-1.5 bg-slate-300 dark:bg-slate-700 rounded-full" />
                  </div>
                  <span>{getTypingUsers().map(u => teamMembers.find(m => m.uid === u.uid)?.name).join(', ')} is typing...</span>
                </div>
              )}
              
              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <footer className="p-6 bg-white dark:bg-dark-surface border-t border-slate-100 dark:border-dark-border">
              <form onSubmit={handleSendMessage} className="flex items-center space-x-3">
                <div className="flex items-center space-x-1">
                  <button type="button" className="p-2.5 text-slate-400 hover:text-brand-primary rounded-xl transition-all"><Paperclip size={20} /></button>
                  <button type="button" className="p-2.5 text-slate-400 hover:text-brand-primary rounded-xl transition-all"><Image size={20} /></button>
                </div>
                
                <div className="flex-1 relative">
                  <input 
                    type="text" 
                    value={newMessage}
                    onChange={(e) => {
                      setNewMessage(e.target.value);
                      setTyping(e.target.value ? selectedConversation.id : null);
                    }}
                    placeholder="Dispatch a message..."
                    className="w-full pl-6 pr-12 py-3.5 bg-slate-50 dark:bg-dark-bg border border-transparent dark:border-dark-border rounded-2xl text-sm font-semibold focus:ring-2 focus:ring-brand-primary/20 transition-all text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-dark-text-muted"
                  />
                  <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-brand-primary hover:bg-brand-primary/10 rounded-lg transition-all">
                    <Smile size={20} />
                  </button>
                </div>

                <button 
                  type="submit"
                  disabled={!newMessage.trim()}
                  className="p-3.5 bg-brand-primary text-white rounded-2xl shadow-lg shadow-brand-primary/20 hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:scale-100 disabled:shadow-none"
                >
                  <Send size={20} />
                </button>
              </form>
            </footer>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-12 bg-pattern">
            <div className="w-24 h-24 bg-brand-primary/5 rounded-[40px] flex items-center justify-center text-brand-primary mb-8 animate-bounce-slow">
              <MessageSquare size={48} />
            </div>
            <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight mb-4">Secure Communications</h2>
            <p className="text-slate-500 font-medium max-w-sm leading-relaxed mb-8">Select an operative or group from the roster to begin encrypted communications.</p>
            <button 
              onClick={() => setShowMemberSelector(true)}
              className="px-8 py-4 bg-brand-primary text-white font-black uppercase tracking-widest text-xs rounded-2xl shadow-xl shadow-brand-primary/20 hover:shadow-brand-primary/40 transition-all active:scale-95"
            >
              Initialize New Stream
            </button>
          </div>
        )}
      </div>

      {/* Member Selector Modal */}
      <AnimatePresence>
        {showMemberSelector && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowMemberSelector(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-md"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-md bg-white dark:bg-dark-surface rounded-[32px] overflow-hidden shadow-2xl border border-slate-100 dark:border-dark-border"
            >
              <div className="p-8 border-b border-slate-50 dark:border-dark-border">
                <div className="flex items-center justify-between mb-8">
                  <h3 className="text-xl font-black text-slate-900 dark:text-white">Active Roster</h3>
                  <button onClick={() => setShowMemberSelector(false)} className="p-2 text-slate-400 dark:text-dark-text-muted hover:text-slate-900 dark:hover:text-white transition-colors"><X size={20} /></button>
                </div>
                
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-dark-text-muted" size={18} />
                  <input 
                    type="text" 
                    placeholder="Search operatives..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-12 pr-4 py-4 bg-slate-50 dark:bg-dark-bg border border-transparent dark:border-dark-border rounded-2xl text-sm font-bold focus:ring-2 focus:ring-brand-primary/20 transition-all text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-dark-text-muted"
                  />
                </div>
              </div>
              
              <div className="max-h-[400px] overflow-y-auto custom-scrollbar p-4 space-y-1">
                {teamMembers
                  .filter(m => m.name.toLowerCase().includes(searchQuery.toLowerCase()))
                  .map(member => (
                  <button 
                    key={member.uid}
                    onClick={() => startDirectChat(member)}
                    className="w-full flex items-center space-x-4 p-4 rounded-2xl hover:bg-slate-50 dark:hover:bg-dark-bg transition-all group"
                  >
                    <div className="relative">
                      <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-dark-bg flex items-center justify-center text-indigo-600 font-black border border-indigo-100 dark:border-dark-border group-hover:scale-105 transition-transform overflow-hidden font-display">
                        {member.photoURL ? (
                          <img src={member.photoURL} alt={member.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        ) : (
                          member.name.substring(0, 2).toUpperCase()
                        )}
                      </div>
                      {isUserOnline(member.uid) && (
                        <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 border-2 border-white dark:border-dark-surface rounded-full shadow-sm" />
                      )}
                    </div>
                    <div className="flex-1 text-left">
                      <p className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-tight">{member.name}</p>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">{member.role} • {member.department}</p>
                    </div>
                    <Plus size={18} className="text-slate-300 group-hover:text-brand-primary transition-colors" />
                  </button>
                ))}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
