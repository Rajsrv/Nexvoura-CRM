import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../App';
import { supportService } from '../services/supportService';
import { SupportTicket, SupportMessage } from '../types';
import { 
  LifeBuoy, 
  Search, 
  Filter, 
  MessageSquare, 
  CheckCircle, 
  Clock, 
  AlertCircle,
  MoreVertical,
  Send,
  User,
  Shield,
  Trash2,
  ExternalLink,
  ChevronRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { format, parseISO } from 'date-fns';
import { toast } from 'sonner';

export default function SupportAdminPage() {
  const { user } = useAuth();
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'open' | 'active' | 'resolved'>('all');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const unsub = supportService.onAllTickets((all) => {
      setTickets(all);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (selectedTicket) {
      const unsub = supportService.onMessages(selectedTicket.id, setMessages);
      return () => unsub();
    }
  }, [selectedTicket?.id]);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedTicket || !user) return;

    const content = newMessage.trim();
    setNewMessage('');

    await supportService.sendMessage(selectedTicket.id, content, {
      id: user.uid,
      name: user.name,
      role: 'admin'
    });
  };

  const updateStatus = async (ticketId: string, status: SupportTicket['status']) => {
    try {
      await supportService.updateTicketStatus(ticketId, status);
      toast.success(`Ticket marked as ${status}`);
    } catch (error) {
      toast.error('Failed to update status');
    }
  };

  const filteredTickets = tickets.filter(t => {
    const matchesSearch = t.userName.toLowerCase().includes(searchQuery.toLowerCase()) || 
                         t.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         t.userEmail.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = filter === 'all' || t.status === filter;
    return matchesSearch && matchesFilter;
  });

  return (
    <div className="h-full flex bg-slate-50 dark:bg-dark-bg overflow-hidden pt-16">
      {/* Sidebar: Tickets List */}
      <div className="w-96 flex flex-col border-r border-slate-100 dark:border-dark-border bg-white dark:bg-dark-surface">
        <div className="p-6 border-b border-slate-50 dark:border-dark-border">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-black text-slate-800 dark:text-white flex items-center space-x-2">
              <LifeBuoy className="text-brand-primary" size={24} />
              <span>Support Board</span>
            </h2>
            <Shield className="text-brand-primary/40" size={20} />
          </div>

          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input 
                type="text" 
                placeholder="Search sessions..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-dark-bg border border-transparent dark:border-dark-border rounded-xl text-xs font-bold focus:ring-2 focus:ring-brand-primary/20 transition-all text-slate-900 dark:text-white"
              />
            </div>
            
            <div className="flex bg-slate-50 dark:bg-dark-bg p-1 rounded-xl">
              {(['all', 'open', 'resolved'] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`flex-1 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-tighter transition-all ${
                    filter === f 
                      ? 'bg-white dark:bg-dark-surface shadow-sm text-brand-primary' 
                      : 'text-slate-400 hover:text-slate-600'
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-2">
          {filteredTickets.map((ticket) => (
            <button
              key={ticket.id}
              onClick={() => setSelectedTicket(ticket)}
              className={`w-full text-left p-4 rounded-2xl border transition-all group ${
                selectedTicket?.id === ticket.id 
                  ? 'bg-brand-primary border-brand-primary shadow-lg shadow-brand-primary/20' 
                  : 'bg-white dark:bg-dark-surface border-slate-50 dark:border-dark-border hover:bg-slate-50 dark:hover:bg-dark-bg'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className={`text-[9px] font-black uppercase tracking-[0.2em] px-2 py-0.5 rounded-full ${
                  selectedTicket?.id === ticket.id 
                    ? 'bg-white/20 text-white' 
                    : ticket.status === 'open' ? 'bg-amber-100 text-amber-600' : 'bg-emerald-100 text-emerald-600'
                }`}>
                  {ticket.status}
                </span>
                <span className={`text-[9px] font-bold ${selectedTicket?.id === ticket.id ? 'text-white/60' : 'text-slate-400'}`}>
                  {format(parseISO(ticket.lastMessageAt), 'MMM d')}
                </span>
              </div>
              <h4 className={`text-sm font-black mb-1 truncate ${selectedTicket?.id === ticket.id ? 'text-white' : 'text-slate-800 dark:text-white'}`}>
                {ticket.subject}
              </h4>
              <p className={`text-[10px] font-bold truncate ${selectedTicket?.id === ticket.id ? 'text-white/70' : 'text-slate-400'}`}>
                {ticket.userName} • {ticket.userEmail}
              </p>
            </button>
          ))}
          {filteredTickets.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 px-6 text-center opacity-40">
              <LifeBuoy size={48} className="mb-4 text-slate-300" />
              <p className="text-xs font-black uppercase tracking-widest text-slate-400 italic">No Support Signals Detected</p>
            </div>
          )}
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col relative">
        {selectedTicket ? (
          <>
            {/* Chat Header */}
            <div className="p-6 bg-white dark:bg-dark-surface border-b border-slate-100 dark:border-dark-border flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 rounded-2xl bg-brand-primary/10 flex items-center justify-center text-brand-primary">
                  <User size={24} />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight">{selectedTicket.userName}</h3>
                  <div className="flex items-center space-x-2">
                    <span className="text-[10px] font-bold text-slate-400">{selectedTicket.userEmail}</span>
                    <span className="text-slate-300">•</span>
                    <span className="text-[10px] font-black text-brand-primary uppercase tracking-widest italic">{selectedTicket.status}</span>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center space-x-3">
                <button 
                  onClick={() => updateStatus(selectedTicket.id, selectedTicket.status === 'resolved' ? 'open' : 'resolved')}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                    selectedTicket.status === 'resolved' 
                      ? 'bg-amber-100 text-amber-600' 
                      : 'bg-emerald-100 text-emerald-600'
                  }`}
                >
                  {selectedTicket.status === 'resolved' ? <Clock size={14} /> : <CheckCircle size={14} />}
                  <span>{selectedTicket.status === 'resolved' ? 'Re-open' : 'Resolve'}</span>
                </button>
                <button className="p-2 text-slate-400 hover:bg-slate-50 dark:hover:bg-dark-bg rounded-xl transition-all">
                  <MoreVertical size={20} />
                </button>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-8 space-y-6 flex flex-col bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] bg-repeat">
              {messages.map((msg) => {
                const isAdmin = msg.senderRole === 'admin';
                return (
                  <motion.div 
                    key={msg.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`flex ${isAdmin ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`max-w-[70%] flex flex-col ${isAdmin ? 'items-end' : 'items-start'}`}>
                      <div className={`p-4 rounded-3xl text-sm font-bold shadow-sm ${
                        isAdmin 
                          ? 'bg-brand-primary text-white rounded-tr-none' 
                          : 'bg-white dark:bg-dark-surface text-slate-800 dark:text-white border border-slate-100 dark:border-dark-border rounded-tl-none'
                      }`}>
                        {msg.content}
                      </div>
                      <div className="flex items-center space-x-2 mt-2 px-1">
                        <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">{msg.senderName}</span>
                        <span className="text-[9px] font-bold text-slate-300">•</span>
                        <span className="text-[9px] font-bold text-slate-300 uppercase">{format(parseISO(msg.createdAt), 'HH:mm')}</span>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="p-6 bg-white dark:bg-dark-surface border-t border-slate-100 dark:border-dark-border">
              <form onSubmit={handleSendMessage} className="relative">
                <input 
                  type="text" 
                  placeholder="Transmit neural response..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  className="w-full pl-6 pr-16 py-4 bg-slate-50 dark:bg-dark-bg border border-transparent dark:border-dark-border rounded-2xl text-sm font-bold focus:ring-2 focus:ring-brand-primary/20 transition-all text-slate-900 dark:text-white"
                />
                <button 
                  type="submit"
                  disabled={!newMessage.trim()}
                  className="absolute right-2 top-2 p-2.5 bg-brand-primary text-white rounded-xl shadow-lg shadow-brand-primary/20 hover:scale-110 active:scale-95 transition-all disabled:opacity-50 disabled:scale-100"
                >
                  <Send size={20} />
                </button>
              </form>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-12 text-center">
             <div className="w-24 h-24 bg-brand-primary/5 rounded-[40px] flex items-center justify-center mb-8 animate-pulse-slow">
               <LifeBuoy className="text-brand-primary" size={48} />
             </div>
             <h3 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight mb-2 italic">Neural Hub Selective</h3>
             <p className="text-slate-400 font-bold max-w-sm uppercase tracking-widest text-[10px]">Select a support signal to begin the diagnostic and resolution protocol.</p>
          </div>
        )}
      </div>
    </div>
  );
}
