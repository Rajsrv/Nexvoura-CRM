import React, { useState, useEffect, useRef } from 'react';
import { supportService } from '../services/supportService';
import { SupportTicket, SupportMessage } from '../types';
import { 
  LifeBuoy, 
  Send, 
  User, 
  Mail, 
  MessageSquare, 
  CheckCircle, 
  Clock, 
  AlertCircle,
  X,
  ChevronLeft
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { format, parseISO } from 'date-fns';

export default function SupportPortal() {
  const [step, setStep] = useState<'info' | 'chat'>('info');
  const [userName, setUserName] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [ticket, setTicket] = useState<SupportTicket | null>(null);
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Restore session from localStorage if exists
  useEffect(() => {
    const savedTicket = localStorage.getItem('nexvoura_support_ticket');
    if (savedTicket) {
      try {
        const { id, token } = JSON.parse(savedTicket);
        loadTicket(id, token);
      } catch (e) {
        localStorage.removeItem('nexvoura_support_ticket');
      }
    }
  }, []);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const loadTicket = async (id: string, token: string) => {
    setIsLoading(true);
    const fetched = await supportService.getTicket(id);
    if (fetched && fetched.token === token) {
      setTicket(fetched);
      setStep('chat');
      // Subscribe to messages
      const unsub = supportService.onMessages(id, setMessages);
      return () => unsub();
    } else {
      localStorage.removeItem('nexvoura_support_ticket');
    }
    setIsLoading(false);
  };

  const handleStartChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userName || !userEmail || !subject) return;

    setIsLoading(true);
    try {
      const { id, token } = await supportService.createTicket({
        userName,
        userEmail,
        subject
      });
      localStorage.setItem('nexvoura_support_ticket', JSON.stringify({ id, token }));
      
      // Initial message
      await supportService.sendMessage(id, `Initial Request: ${subject}`, {
        id: 'guest',
        name: userName,
        role: 'user'
      });

      loadTicket(id, token);
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !ticket) return;

    const msg = newMessage.trim();
    setNewMessage('');

    await supportService.sendMessage(ticket.id, msg, {
      id: 'guest',
      name: ticket.userName,
      role: 'user'
    });
  };

  const handleExitChat = () => {
    if (window.confirm('Are you sure you want to exit the chat session? You can return later with your session token.')) {
       setStep('info');
    }
  };

  if (step === 'info') {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-dark-bg flex items-center justify-center p-6 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-brand-primary/5 via-transparent to-transparent">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-lg bg-white dark:bg-dark-surface rounded-[40px] shadow-2xl border border-slate-100 dark:border-dark-border overflow-hidden"
        >
          <div className="p-10 bg-brand-primary text-white relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl" />
            <LifeBuoy className="mb-6 animate-pulse-slow" size={48} />
            <h1 className="text-3xl font-black uppercase tracking-tight mb-2">Support Portal</h1>
            <p className="text-white/80 font-bold uppercase tracking-widest text-xs">Connect with Nexvoura Neural Support</p>
          </div>

          <form onSubmit={handleStartChat} className="p-10 space-y-6">
            <div className="space-y-4">
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input 
                  type="text" 
                  required
                  placeholder="Full Name"
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  className="w-full pl-12 pr-6 py-4 bg-slate-50 dark:bg-dark-bg border border-transparent dark:border-dark-border rounded-2xl text-sm font-bold focus:ring-2 focus:ring-brand-primary/20 transition-all text-slate-900 dark:text-white"
                />
              </div>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input 
                  type="email" 
                  required
                  placeholder="Email Protocol"
                  value={userEmail}
                  onChange={(e) => setUserEmail(e.target.value)}
                  className="w-full pl-12 pr-6 py-4 bg-slate-50 dark:bg-dark-bg border border-transparent dark:border-dark-border rounded-2xl text-sm font-bold focus:ring-2 focus:ring-brand-primary/20 transition-all text-slate-900 dark:text-white"
                />
              </div>
              <div className="relative">
                <MessageSquare className="absolute left-4 top-4 text-slate-400" size={18} />
                <textarea 
                  required
                  placeholder="Brief Objective (How can we assist?)"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full pl-12 pr-6 py-4 bg-slate-50 dark:bg-dark-bg border border-transparent dark:border-dark-border rounded-2xl text-sm font-bold focus:ring-2 focus:ring-brand-primary/20 transition-all text-slate-900 dark:text-white min-h-[120px] resize-none"
                />
              </div>
            </div>

            <button 
              type="submit" 
              disabled={isLoading}
              className="w-full py-5 bg-brand-primary text-white font-black uppercase tracking-widest text-xs rounded-2xl shadow-xl shadow-brand-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50"
            >
              {isLoading ? 'Initializing Connection...' : 'Establish Support Link'}
            </button>

            <p className="text-center text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em]">
              Encrypted Peer-to-Peer Transmission
            </p>
          </form>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-dark-bg flex flex-col">
      {/* Header */}
      <header className="bg-white dark:bg-dark-surface border-b border-slate-100 dark:border-dark-border px-8 py-4 flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center space-x-4">
          <button onClick={handleExitChat} className="p-2 hover:bg-slate-50 dark:hover:bg-dark-bg rounded-xl text-slate-400 transition-colors">
            <ChevronLeft size={20} />
          </button>
          <div>
            <h2 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight">{ticket?.subject}</h2>
            <div className="flex items-center space-x-2">
              <div className={`w-2 h-2 rounded-full ${ticket?.status === 'resolved' ? 'bg-emerald-500' : 'bg-brand-primary pulse'}`} />
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{ticket?.status || 'Active'}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center space-x-6">
           <div className="hidden md:block text-right">
             <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Support Agent</p>
             <p className="text-xs font-bold text-slate-900 dark:text-white">Nexvoura Super Admin</p>
           </div>
           <div className="w-10 h-10 rounded-xl bg-brand-primary/10 flex items-center justify-center text-brand-primary">
             <LifeBuoy size={24} />
           </div>
        </div>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6 flex flex-col">
        <div className="max-w-4xl mx-auto w-full space-y-6">
          <div className="text-center mb-8">
            <span className="px-4 py-1 bg-slate-100 dark:bg-dark-bg text-[10px] font-black text-slate-400 uppercase tracking-widest rounded-full border border-slate-200 dark:border-dark-border">
              Secure Session Initialized {format(new Date(), 'HH:mm')}
            </span>
          </div>

          <AnimatePresence initial={false}>
            {messages.map((msg, idx) => {
              const isMe = msg.senderRole === 'user';
              return (
                <motion.div 
                  key={msg.id}
                  initial={{ opacity: 0, x: isMe ? 20 : -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`max-w-[85%] md:max-w-[70%] ${isMe ? 'items-end' : 'items-start'} flex flex-col`}>
                    <div className={`p-4 rounded-3xl text-sm font-bold shadow-sm ${
                      isMe 
                        ? 'bg-brand-primary text-white rounded-tr-none' 
                        : 'bg-white dark:bg-dark-surface text-slate-900 dark:text-white border border-slate-100 dark:border-dark-border rounded-tl-none'
                    }`}>
                      {msg.content}
                    </div>
                    <div className="flex items-center space-x-2 mt-2 px-1">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{msg.senderName}</span>
                      <span className="text-[9px] font-bold text-slate-300">•</span>
                      <span className="text-[9px] font-bold text-slate-300 uppercase">{format(parseISO(msg.createdAt), 'HH:mm')}</span>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Footer input */}
      <footer className="p-6 bg-white dark:bg-dark-surface border-t border-slate-100 dark:border-dark-border">
        <div className="max-w-4xl mx-auto">
          <form onSubmit={handleSendMessage} className="relative flex items-center">
            <input 
              type="text" 
              placeholder="Transmit message to support..."
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              className="w-full pl-6 pr-16 py-4 bg-slate-50 dark:bg-dark-bg border border-transparent dark:border-dark-border rounded-[24px] text-sm font-bold focus:ring-2 focus:ring-brand-primary/20 transition-all text-slate-900 dark:text-white shadow-inner"
            />
            <button 
              type="submit"
              disabled={!newMessage.trim()}
              className="absolute right-2 p-3 bg-brand-primary text-white rounded-2xl hover:scale-110 active:scale-95 transition-all shadow-lg shadow-brand-primary/20 disabled:scale-100 disabled:opacity-50"
            >
              <Send size={20} />
            </button>
          </form>
          <p className="text-center text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-4">
            System Directive: Response times may vary based on neural grid load.
          </p>
        </div>
      </footer>
    </div>
  );
}
