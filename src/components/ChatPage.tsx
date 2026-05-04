import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../App';
import { chatService } from '../services/chatService';
import { Conversation, ChatMessage, UserProfile, UserPresence } from '../types';
import { usePresence } from '../contexts/PresenceContext';
import { Search, Send, Plus, Users, User as UserIcon, MoreVertical, Hash, Image, Paperclip, Smile, Phone, Video, Info, ChevronLeft, Circle, MessageSquare, X, Check, CheckCheck, Coffee, Moon, Utensils, AlertCircle, Sparkles, Clock, Trash2, ChevronDown, ChevronRight } from 'lucide-react';
import { format, isToday, isYesterday, parseISO } from 'date-fns';
import { motion, AnimatePresence } from 'motion/react';
import { db } from '../firebase';
import { collection, onSnapshot, query, where } from 'firebase/firestore';

export default function ChatPage() {
  const { user, company } = useAuth();
  const { presenceMap, setTyping, updateStatus, setStory, contactGroups, createGroup, deleteGroup } = usePresence();
  
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [teamMembers, setTeamMembers] = useState<UserProfile[]>([]);
  const [showMemberSelector, setShowMemberSelector] = useState(false);
  const [showGroupCreator, setShowGroupCreator] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [selectedGroupMembers, setSelectedGroupMembers] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showStoryModal, setShowStoryModal] = useState(false);
  const [storyContent, setStoryContent] = useState('');
  const [storyMediaUrl, setStoryMediaUrl] = useState('');
  const [storyMediaType, setStoryMediaType] = useState<'image' | 'video'>('image');
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);
  const [viewingStoryUser, setViewingStoryUser] = useState<UserProfile | null>(null);
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({ 'everyone': true });
  
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
    }, (error) => {
      console.error("ChatPage team snapshot error:", error);
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
      
      // Mark as read if needed
      if (user) {
        msgs.forEach(msg => {
          if (!msg.readBy.includes(user.uid)) {
            chatService.markAsRead(selectedConversation.id, msg.id, user.uid);
          }
        });
      }
    });
    return () => unsub();
  }, [selectedConversation, user?.uid]);

  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  // 4. Scroll on typing change
  useEffect(() => {
    if (getTypingUsers().length > 0) {
      scrollToBottom();
    }
  }, [presenceMap]);

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

  const getStatusIcon = (status: UserPresence['status'], size = 12) => {
    switch (status) {
      case 'online': return <div className="bg-emerald-500 rounded-full" style={{ width: size, height: size }} />;
      case 'busy': return <AlertCircle size={size} className="text-rose-500 fill-rose-500/20" />;
      case 'dnd': return <Moon size={size} className="text-slate-600 fill-slate-600/20" />;
      case 'break': return <Coffee size={size} className="text-amber-500" />;
      case 'lunch': return <Utensils size={size} className="text-orange-500" />;
      case 'away': return <Clock size={size} className="text-slate-400" />;
      default: return <div className="bg-slate-300 rounded-full" style={{ width: size, height: size }} />;
    }
  };

  const getStatusLabel = (status: UserPresence['status']) => {
    switch (status) {
      case 'online': return 'Active';
      case 'busy': return 'Busy';
      case 'dnd': return 'Do Not Disturb';
      case 'break': return 'Out for Break';
      case 'lunch': return 'On Lunch';
      case 'away': return 'Away';
      default: return 'Offline';
    }
  };

  const handleCreateGroup = async () => {
    if (!groupName.trim() || selectedGroupMembers.length === 0) return;
    await createGroup(groupName.trim(), selectedGroupMembers);
    setShowGroupCreator(false);
    setGroupName('');
    setSelectedGroupMembers([]);
  };

  const storyUsers = teamMembers.filter(m => {
    const story = presenceMap[m.uid]?.story;
    if (!story) return false;
    try {
      return new Date(story.expiresAt) > new Date();
    } catch (e) {
      return false;
    }
  });

  const getReadReceiptStatus = (msg: ChatMessage) => {
    if (!selectedConversation) return null;
    const recipientIds = selectedConversation.memberIds.filter(id => id !== user?.uid);
    const readCount = msg.readBy.filter(id => id !== user?.uid).length;
    
    if (readCount === 0) return <Check size={12} className="text-slate-400" />;
    if (readCount < recipientIds.length) return <CheckCheck size={12} className="text-slate-400" />;
    return <CheckCheck size={12} className="text-blue-500" />;
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
          {/* User Status & Activity */}
          <div className="relative mb-6">
            <div className="flex items-center space-x-3 p-3 bg-slate-50 dark:bg-dark-bg rounded-2xl border border-slate-100 dark:border-dark-border">
               <div className="relative">
                 <img 
                   src={user?.photoURL || `https://ui-avatars.com/api/?name=${user?.name}&background=6366f1&color=fff`} 
                   alt="Me" 
                   className="w-10 h-10 rounded-xl object-cover border border-slate-200 dark:border-dark-border shadow-sm"
                 />
                 <div className="absolute -bottom-1 -right-1">
                   {getStatusIcon(presenceMap[user?.uid || '']?.status || 'online', 14)}
                 </div>
               </div>
               <div className="flex-1 min-w-0">
                 <button 
                   onClick={() => setShowStatusDropdown(!showStatusDropdown)}
                   className="flex items-center space-x-1.5 w-full text-[11px] font-black uppercase tracking-widest text-slate-900 dark:text-white hover:text-brand-primary transition-colors"
                 >
                   <span>{getStatusLabel(presenceMap[user?.uid || '']?.status || 'online')}</span>
                   <ChevronDown size={12} className={`transition-transform ${showStatusDropdown ? 'rotate-180' : ''}`} />
                 </button>
                 <button 
                   onClick={() => setShowStoryModal(true)}
                   className="text-[9px] font-bold text-brand-primary uppercase tracking-tighter hover:underline"
                 >
                   {presenceMap[user?.uid || '']?.story ? 'Update Daily Story' : 'Post Daily Story'}
                 </button>
               </div>
            </div>

            <AnimatePresence>
              {showStatusDropdown && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowStatusDropdown(false)} />
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.95, y: -10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: -10 }}
                    className="absolute top-full left-0 right-0 mt-2 z-50 bg-white dark:bg-dark-surface rounded-2xl border border-slate-100 dark:border-dark-border shadow-2xl overflow-hidden py-1"
                  >
                    {[
                      { status: 'online', label: 'Online' },
                      { status: 'busy', label: 'Busy' },
                      { status: 'dnd', label: 'Do Not Disturb' },
                      { status: 'away', label: 'Away' },
                      { status: 'break', label: 'Break' },
                      { status: 'lunch', label: 'Lunch' }
                    ].map((opt) => (
                      <button
                        key={opt.status}
                        onClick={() => {
                          updateStatus(opt.status as UserPresence['status']);
                          setShowStatusDropdown(false);
                        }}
                        className="w-full flex items-center space-x-3 px-4 py-3 hover:bg-slate-50 dark:hover:bg-dark-bg transition-all"
                      >
                        {getStatusIcon(opt.status as UserPresence['status'], 14)}
                        <span className="text-[11px] font-bold text-slate-700 dark:text-slate-200 uppercase tracking-widest">{opt.label}</span>
                      </button>
                    ))}
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>

          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-black text-slate-900 dark:text-white flex items-center space-x-2">
              <MessageSquare className="text-brand-primary" size={24} />
              <span>Directives</span>
            </h2>
            <div className="flex items-center space-x-2">
              <button 
                onClick={() => setShowGroupCreator(true)}
                title="Create Group"
                className="p-2 bg-slate-100 dark:bg-dark-bg text-slate-600 dark:text-slate-400 rounded-xl hover:bg-brand-primary hover:text-white transition-all"
              >
                <Users size={18} />
              </button>
              <button 
                onClick={() => setShowMemberSelector(true)}
                title="New Direct Chat"
                className="p-2 bg-brand-primary/10 text-brand-primary rounded-xl hover:bg-brand-primary hover:text-white transition-all shadow-lg shadow-brand-primary/10"
              >
                <Plus size={18} />
              </button>
            </div>
          </div>
          
          {/* Daily Stories Row */}
          {storyUsers.length > 0 && (
            <div className="flex items-center space-x-3 overflow-x-auto no-scrollbar pb-2 mb-4">
               {storyUsers.map(m => (
                 <button 
                   key={m.uid} 
                   onClick={() => setViewingStoryUser(m)}
                   className="shrink-0 flex flex-col items-center space-y-1 group"
                 >
                   <div className="w-12 h-12 rounded-full p-0.5 border-2 border-brand-primary transition-transform group-hover:scale-110">
                     <img 
                       src={m.photoURL || `https://ui-avatars.com/api/?name=${m.name}`} 
                       className="w-full h-full rounded-full object-cover" 
                       alt={m.name} 
                       referrerPolicy="no-referrer"
                     />
                   </div>
                   <span className="text-[10px] font-bold text-slate-500 max-w-[48px] truncate">{m.name.split(' ')[0]}</span>
                 </button>
               ))}
            </div>
          )}

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
          {/* Contact Groups Section */}
          {contactGroups.map(group => (
            <div key={group.id} className="mb-2">
              <button 
                onClick={() => setExpandedGroups(prev => ({ ...prev, [group.id]: !prev[group.id] }))}
                className="w-full flex items-center justify-between p-2 text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-brand-primary transition-colors"
               >
                <div className="flex items-center space-x-2">
                  {expandedGroups[group.id] ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                  <span>{group.name} ({group.memberIds.length})</span>
                </div>
                <button 
                  onClick={(e) => { e.stopPropagation(); deleteGroup(group.id); }}
                  className="opacity-0 group-hover:opacity-100 hover:text-rose-500"
                >
                  <Trash2 size={12} />
                </button>
              </button>
              
              <AnimatePresence>
                {expandedGroups[group.id] && (
                  <motion.div 
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden space-y-1 mt-1 pl-2"
                  >
                    {group.memberIds.map(mid => {
                      const member = teamMembers.find(m => m.uid === mid);
                      if (!member) return null;
                      return (
                        <button
                          key={mid}
                          onClick={() => startDirectChat(member)}
                          className="w-full flex items-center space-x-3 p-2 rounded-xl hover:bg-slate-50 dark:hover:bg-dark-bg transition-all"
                        >
                          <div className="relative">
                            <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-dark-bg flex items-center justify-center overflow-hidden border border-slate-200 dark:border-dark-border text-[10px] font-bold">
                               {member.photoURL ? <img src={member.photoURL} alt="" className="w-full h-full object-cover" /> : member.name.substring(0,2)}
                            </div>
                            <div className="absolute -bottom-0.5 -right-0.5">
                              {getStatusIcon(presenceMap[mid]?.status || 'offline', 10)}
                            </div>
                          </div>
                          <div className="flex-1 text-left">
                            <p className="text-xs font-bold text-slate-800 dark:text-white truncate">{member.name}</p>
                          </div>
                        </button>
                      );
                    })}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}

          {/* Conversations Section */}
          <div className="pt-2 border-t border-slate-100 dark:border-dark-border mt-2">
            <p className="px-2 mb-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">Active Streams</p>
          {conversations.map((conv) => {
            const target = getTargetUser(conv);
            const isActive = selectedConversation?.id === conv.id;
            const presence = target ? presenceMap[target.uid] : null;

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
                  {presence && (
                    <div className="absolute -bottom-1 -right-1">
                      {getStatusIcon(presence.status, 14)}
                    </div>
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
                  {selectedConversation.type === 'direct' && presenceMap[getTargetUser(selectedConversation)?.uid || ''] && (
                    <div className="absolute -bottom-1 -right-1">
                      {getStatusIcon(presenceMap[getTargetUser(selectedConversation)?.uid || ''].status, 14)}
                    </div>
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
                      presenceMap[getTargetUser(selectedConversation)?.uid || ''] ? (
                        <span className="flex items-center">
                          <span className="mr-2 uppercase">{getStatusLabel(presenceMap[getTargetUser(selectedConversation)?.uid || ''].status)}</span>
                          {presenceMap[getTargetUser(selectedConversation)?.uid || ''].story && (
                            <span className="text-brand-primary italic">• "{presenceMap[getTargetUser(selectedConversation)?.uid || ''].story?.content}"</span>
                          )}
                        </span>
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
            <div className="flex-1 overflow-y-auto custom-scrollbar p-8 space-y-4">
              {messages.map((msg, index) => {
                const isMe = msg.senderId === user?.uid;
                const prevMsg = messages[index - 1];
                const nextMsg = messages[index + 1];
                
                // Show avatar if it's the first message from this sender in a sequence
                const isFirstInSequence = !prevMsg || prevMsg.senderId !== msg.senderId || 
                  (prevMsg && Math.abs(new Date(msg.createdAt).getTime() - new Date(prevMsg.createdAt).getTime()) > 300000);
                
                // Show timestamp if it's the last message in a sequence or has a significant time gap
                const isLastInSequence = !nextMsg || nextMsg.senderId !== msg.senderId ||
                  (nextMsg && Math.abs(new Date(nextMsg.createdAt).getTime() - new Date(msg.createdAt).getTime()) > 300000);

                const msgDate = parseISO(msg.createdAt);
                const prevMsgDate = prevMsg ? parseISO(prevMsg.createdAt) : null;
                const showDateDivider = !prevMsgDate || format(msgDate, 'yyyy-MM-dd') !== format(prevMsgDate, 'yyyy-MM-dd');

                const sender = teamMembers.find(m => m.uid === msg.senderId) || (isMe ? user : null);

                return (
                  <React.Fragment key={msg.id}>
                    {showDateDivider && (
                      <div className="flex justify-center my-8">
                        <div className="px-4 py-1.5 bg-slate-100 dark:bg-dark-bg/50 rounded-full border border-slate-200/50 dark:border-dark-border">
                          <span className="text-[10px] font-black text-slate-500 dark:text-dark-text-muted uppercase tracking-widest">
                            {isToday(msgDate) ? 'Today' : isYesterday(msgDate) ? 'Yesterday' : format(msgDate, 'MMMM d, yyyy')}
                          </span>
                        </div>
                      </div>
                    )}
                    
                    <div className={`flex ${isMe ? 'flex-row-reverse' : 'flex-row'} items-start group relative mb-1`}>
                      {/* Avatar Column */}
                      <div className={`w-10 flex-shrink-0 flex flex-col justify-end ${isMe ? 'ml-3' : 'mr-3'}`}>
                        {isFirstInSequence && !isMe && sender && (
                          <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-dark-bg border border-indigo-100 dark:border-dark-border overflow-hidden shadow-sm transition-transform hover:scale-110">
                            {sender.photoURL ? (
                              <img src={sender.photoURL} alt={sender.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-xs font-black text-indigo-600">
                                {sender.name.substring(0, 2).toUpperCase()}
                              </div>
                            )}
                          </div>
                        )}
                        {isFirstInSequence && isMe && (
                           <div className="w-10 h-10 rounded-2xl bg-brand-primary/10 border border-brand-primary/20 overflow-hidden shadow-sm transition-transform hover:scale-110">
                            {user?.photoURL ? (
                              <img src={user.photoURL} alt="Me" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-xs font-black text-brand-primary">
                                ME
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Content Column */}
                      <div className={`flex flex-col max-w-[70%] ${isMe ? 'items-end' : 'items-start'}`}>
                        {isFirstInSequence && !isMe && (
                          <span className="text-[10px] font-black text-slate-400 dark:text-dark-text-muted uppercase tracking-widest mb-1 ml-1 px-1">
                            {msg.senderName}
                          </span>
                        )}
                        
                        <div className="relative group/bubble">
                          <div className={`px-5 py-3 rounded-3xl text-sm font-medium leading-relaxed shadow-sm transition-all ${
                            isMe 
                              ? `bg-brand-primary text-white ${isFirstInSequence ? 'rounded-tr-none' : ''} ${!isLastInSequence ? 'rounded-br-sm' : ''}` 
                              : `bg-white dark:bg-dark-surface text-slate-700 dark:text-slate-200 border border-slate-100 dark:border-dark-border ${isFirstInSequence ? 'rounded-tl-none' : ''} ${!isLastInSequence ? 'rounded-bl-sm' : ''}`
                          }`}>
                            {msg.content}
                          </div>
                          
                          {/* Timestamp - shown on hover or for last in sequence */}
                          <div className={`mt-1 flex items-center space-x-1.5 ${isMe ? 'justify-end' : 'justify-start'} ${isLastInSequence ? 'opacity-100' : 'opacity-0 group-hover/bubble:opacity-100'} transition-opacity duration-200`}>
                            <span className="text-[9px] font-bold text-slate-400 dark:text-dark-text-muted uppercase tracking-tighter">
                              {format(msgDate, 'HH:mm')}
                            </span>
                            {isMe && getReadReceiptStatus(msg)}
                          </div>
                        </div>
                      </div>
                    </div>
                  </React.Fragment>
                );
              })}
              
              {/* Typing indicators */}
              <AnimatePresence>
                {getTypingUsers().length > 0 && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="flex items-center space-x-3 mb-4 ml-11"
                  >
                    <div className="flex space-x-1.5 p-2 bg-white dark:bg-dark-bg border border-slate-100 dark:border-dark-border rounded-full shadow-sm">
                      <motion.div 
                        animate={{ scale: [1, 1.2, 1] }} 
                        transition={{ repeat: Infinity, duration: 0.6, delay: 0 }}
                        className="w-1.5 h-1.5 bg-brand-primary rounded-full" 
                      />
                      <motion.div 
                        animate={{ scale: [1, 1.2, 1] }} 
                        transition={{ repeat: Infinity, duration: 0.6, delay: 0.2 }}
                        className="w-1.5 h-1.5 bg-brand-primary rounded-full" 
                      />
                      <motion.div 
                        animate={{ scale: [1, 1.2, 1] }} 
                        transition={{ repeat: Infinity, duration: 0.6, delay: 0.4 }}
                        className="w-1.5 h-1.5 bg-brand-primary rounded-full" 
                      />
                    </div>
                    <span className="text-[11px] font-bold text-slate-400 dark:text-dark-text-muted uppercase tracking-widest animate-pulse">
                      {getTypingUsers().length === 1 
                        ? `${teamMembers.find(m => m.uid === getTypingUsers()[0].uid)?.name} is typing...`
                        : `${getTypingUsers().length} agents are typing...`}
                    </span>
                  </motion.div>
                )}
              </AnimatePresence>
              
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
                      <div className="absolute -bottom-1 -right-1">
                        {getStatusIcon(presenceMap[member.uid]?.status || 'offline', 16)}
                      </div>
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

      {/* Story Modal */}
      <AnimatePresence>
        {showStoryModal && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowStoryModal(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-md"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-md bg-white dark:bg-dark-surface rounded-[32px] overflow-hidden shadow-2xl border border-slate-100 dark:border-dark-border p-8"
            >
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-xl font-black text-slate-900 dark:text-white">Daily Story</h3>
                <button onClick={() => setShowStoryModal(false)} className="p-2 text-slate-400 dark:text-dark-text-muted hover:text-slate-900 dark:hover:text-white transition-colors"><X size={20} /></button>
              </div>
              
              <div className="space-y-6">
                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 px-1">Story Content</label>
                  <textarea 
                    value={storyContent}
                    onChange={(e) => setStoryContent(e.target.value)}
                    placeholder="What's happening today?"
                    maxLength={100}
                    className="w-full p-4 bg-slate-50 dark:bg-dark-bg border border-transparent dark:border-dark-border rounded-2xl text-sm font-bold focus:ring-2 focus:ring-brand-primary/20 transition-all text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-dark-text-muted h-24 resize-none"
                  />
                  <p className="text-[9px] text-right text-slate-400 mt-1 font-bold">{storyContent.length}/100</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 px-1">Media URL (Optional)</label>
                    <input 
                      type="url"
                      value={storyMediaUrl}
                      onChange={(e) => setStoryMediaUrl(e.target.value)}
                      placeholder="https://..."
                      className="w-full p-3 bg-slate-50 dark:bg-dark-bg border border-transparent dark:border-dark-border rounded-xl text-xs font-bold focus:ring-2 focus:ring-brand-primary/20 transition-all text-slate-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 px-1">Media Type</label>
                    <div className="flex bg-slate-100 dark:bg-dark-bg p-1 rounded-xl">
                      <button 
                        onClick={() => setStoryMediaType('image')}
                        className={`flex-1 py-2 rounded-lg text-[10px] font-bold uppercase transition-all ${storyMediaType === 'image' ? 'bg-white dark:bg-dark-surface shadow-sm text-brand-primary' : 'text-slate-400'}`}
                      >
                        Image
                      </button>
                      <button 
                        onClick={() => setStoryMediaType('video')}
                        className={`flex-1 py-2 rounded-lg text-[10px] font-bold uppercase transition-all ${storyMediaType === 'video' ? 'bg-white dark:bg-dark-surface shadow-sm text-brand-primary' : 'text-slate-400'}`}
                      >
                        Video
                      </button>
                    </div>
                  </div>
                </div>
                
                <button 
                  onClick={async () => {
                    await setStory(storyContent, storyMediaUrl, storyMediaType);
                    setShowStoryModal(false);
                    setStoryContent('');
                    setStoryMediaUrl('');
                  }}
                  className="w-full py-4 bg-brand-primary text-white font-black uppercase tracking-widest text-xs rounded-2xl shadow-xl shadow-brand-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
                >
                  Broadcast Story
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Story Viewer */}
      <AnimatePresence>
        {viewingStoryUser && presenceMap[viewingStoryUser.uid]?.story && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setViewingStoryUser(null)}
              className="absolute inset-0 bg-slate-900/95 backdrop-blur-xl"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="relative w-full max-w-lg aspect-[9/16] bg-black rounded-[40px] overflow-hidden shadow-2xl flex flex-col"
            >
              {/* Progress Bar */}
              <div className="absolute top-6 left-6 right-6 z-20 flex space-x-1">
                <div className="h-1 flex-1 bg-white/20 rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: '100%' }}
                    transition={{ duration: 5, ease: 'linear' }}
                    onAnimationComplete={() => setViewingStoryUser(null)}
                    className="h-full bg-white shadow-sm shadow-white/50"
                  />
                </div>
              </div>

              {/* Story Content */}
              <div className="flex-1 relative">
                {presenceMap[viewingStoryUser.uid].story?.mediaUrl ? (
                  presenceMap[viewingStoryUser.uid].story?.mediaType === 'video' ? (
                    <video 
                      src={presenceMap[viewingStoryUser.uid].story?.mediaUrl} 
                      autoPlay 
                      muted 
                      loop 
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <img 
                      src={presenceMap[viewingStoryUser.uid].story?.mediaUrl} 
                      className="w-full h-full object-cover" 
                      alt="" 
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1614850523296-d8c1af93d400?q=80&w=1000&auto=format&fit=crop';
                      }}
                    />
                  )
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-indigo-900 via-purple-900 to-brand-primary flex items-center justify-center p-12 text-center">
                    <p className="text-3xl font-black text-white leading-tight italic tracking-tight uppercase">
                      {presenceMap[viewingStoryUser.uid].story?.content}
                    </p>
                  </div>
                )}
                
                {/* Overlay Quote if media exists */}
                {presenceMap[viewingStoryUser.uid].story?.mediaUrl && (
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex flex-col justify-end p-8">
                    <p className="text-white text-xl font-bold leading-relaxed mb-4 italic">
                      "{presenceMap[viewingStoryUser.uid].story?.content}"
                    </p>
                  </div>
                )}
              </div>

              {/* User Info Footer */}
              <div className="p-8 pb-10 bg-black/50 backdrop-blur-md flex items-center space-x-4 border-t border-white/10">
                <div className="relative">
                  <img 
                    src={viewingStoryUser.photoURL || `https://ui-avatars.com/api/?name=${viewingStoryUser.name}`} 
                    className="w-12 h-12 rounded-2xl border-2 border-white/20 shadow-xl"
                    alt={viewingStoryUser.name}
                  />
                  <div className="absolute -bottom-1 -right-1">
                    {getStatusIcon(presenceMap[viewingStoryUser.uid]?.status || 'online', 16)}
                  </div>
                </div>
                <div>
                  <h4 className="text-white font-black uppercase tracking-widest">{viewingStoryUser.name}</h4>
                  <p className="text-white/60 text-[10px] font-bold uppercase tracking-widest">{viewingStoryUser.role}</p>
                </div>
                <button 
                  onClick={() => setViewingStoryUser(null)}
                  className="ml-auto p-3 bg-white/10 hover:bg-white/20 text-white rounded-2xl transition-all"
                >
                  <X size={20} />
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Group Creator Modal */}
      <AnimatePresence>
        {showGroupCreator && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowGroupCreator(false)}
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
                  <h3 className="text-xl font-black text-slate-900 dark:text-white">New Contact Group</h3>
                  <button onClick={() => setShowGroupCreator(false)} className="p-2 text-slate-400 dark:text-dark-text-muted hover:text-slate-900 dark:hover:text-white transition-colors"><X size={20} /></button>
                </div>
                
                <input 
                  type="text" 
                  placeholder="Group Name (e.g. Sales Team)"
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  className="w-full px-6 py-4 bg-slate-50 dark:bg-dark-bg border border-transparent dark:border-dark-border rounded-2xl text-sm font-bold focus:ring-2 focus:ring-brand-primary/20 transition-all text-slate-900 dark:text-white mb-6"
                />

                <div className="relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-dark-text-muted" size={18} />
                  <input 
                    type="text" 
                    placeholder="Search agents..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-12 pr-4 py-4 bg-slate-50 dark:bg-dark-bg border border-transparent dark:border-dark-border rounded-2xl text-sm font-bold focus:ring-2 focus:ring-brand-primary/20 transition-all text-slate-900 dark:text-white"
                  />
                </div>
              </div>
              
              <div className="max-h-[300px] overflow-y-auto custom-scrollbar p-4 space-y-1">
                {teamMembers
                  .filter(m => m.name.toLowerCase().includes(searchQuery.toLowerCase()))
                  .map(member => {
                    const isSelected = selectedGroupMembers.includes(member.uid);
                    return (
                      <button 
                        key={member.uid}
                        onClick={() => {
                          if (isSelected) setSelectedGroupMembers(prev => prev.filter(id => id !== member.uid));
                          else setSelectedGroupMembers(prev => [...prev, member.uid]);
                        }}
                        className={`w-full flex items-center space-x-4 p-3 rounded-2xl transition-all ${isSelected ? 'bg-brand-primary/5 border border-brand-primary/20' : 'hover:bg-slate-50 dark:hover:bg-dark-bg'}`}
                      >
                        <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-dark-bg flex items-center justify-center overflow-hidden border border-slate-200 dark:border-dark-border">
                          {member.photoURL ? <img src={member.photoURL} className="w-full h-full object-cover" alt="" /> : member.name.substring(0,2)}
                        </div>
                        <div className="flex-1 text-left">
                          <p className="text-xs font-bold text-slate-900 dark:text-white">{member.name}</p>
                          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{member.role}</p>
                        </div>
                        {isSelected && <Check size={16} className="text-brand-primary" />}
                      </button>
                    );
                  })}
              </div>

              <div className="p-6 border-t border-slate-50 dark:border-dark-border">
                <button 
                  onClick={handleCreateGroup}
                  disabled={!groupName.trim() || selectedGroupMembers.length === 0}
                  className="w-full py-4 bg-brand-primary text-white font-black uppercase tracking-widest text-xs rounded-2xl shadow-xl shadow-brand-primary/20 disabled:opacity-50 transition-all"
                >
                  Create Group ({selectedGroupMembers.length})
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
