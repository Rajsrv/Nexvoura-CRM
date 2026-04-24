import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Search, ChevronDown } from 'lucide-react';
import { UserProfile } from '../types';

interface UserSelectorProps { 
  team: UserProfile[]; 
  value: string; 
  onChange: (uid: string) => void;
  placeholder?: string;
}

export function UserSelector({ 
  team, 
  value, 
  onChange, 
  placeholder = "Select Member" 
}: UserSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const selectedUser = team.find(m => m.uid === value);

  const filteredTeam = team.filter(m => 
    m.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    m.role.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full saas-input flex items-center justify-between group"
      >
        <div className="flex items-center space-x-2">
          {selectedUser ? (
            <>
              <div className="w-6 h-6 rounded-full bg-brand-primary/10 dark:bg-indigo-500/10 flex items-center justify-center text-[10px] font-bold text-brand-primary dark:text-indigo-400">
                {selectedUser.name[0]}
              </div>
              <span className="text-sm font-medium text-slate-900 dark:text-white truncate max-w-[150px]">{selectedUser.name}</span>
            </>
          ) : (
            <span className="text-sm text-slate-400 dark:text-dark-text-muted">{placeholder}</span>
          )}
        </div>
        <ChevronDown size={16} className={`text-slate-400 dark:text-dark-text-muted transition-transform flex-shrink-0 group-hover:text-brand-primary dark:group-hover:text-indigo-400 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => { setIsOpen(false); setSearchTerm(''); }} />
            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              className="absolute z-50 mt-2 w-full bg-white dark:bg-dark-surface rounded-2xl shadow-xl border border-slate-100 dark:border-dark-border py-2 max-h-72 flex flex-col overflow-hidden transition-colors"
            >
              <div className="px-3 pb-2 border-b border-slate-50 dark:border-dark-border">
                <div className="relative">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-dark-text-muted" />
                  <input
                    type="text"
                    autoFocus
                    placeholder="Search team..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-dark-bg border border-slate-100 dark:border-dark-border rounded-lg text-xs outline-none focus:ring-2 focus:ring-brand-primary/20 dark:focus:ring-indigo-500/20 transition-all text-slate-900 dark:text-white"
                    onClick={(e) => e.stopPropagation()}
                  />
                </div>
              </div>
              <div className="overflow-y-auto flex-1 h-full min-h-0 custom-scrollbar">
                <button
                  type="button"
                  onClick={() => { onChange(''); setIsOpen(false); setSearchTerm(''); }}
                  className="w-full px-4 py-3 text-left text-xs text-slate-500 dark:text-dark-text-muted hover:bg-slate-50 dark:hover:bg-dark-bg font-bold uppercase tracking-widest border-b border-slate-50 dark:border-dark-border"
                >
                  Unassigned
                </button>
                {filteredTeam.length > 0 ? (
                  filteredTeam.map(member => (
                    <button
                      key={member.uid}
                      type="button"
                      onClick={() => { onChange(member.uid); setIsOpen(false); setSearchTerm(''); }}
                      className="w-full px-4 py-3 flex items-center space-x-3 hover:bg-slate-50 dark:hover:bg-dark-bg transition-all group/item"
                    >
                      <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-dark-bg flex items-center justify-center text-xs font-bold text-slate-600 dark:text-dark-text-muted transition-colors group-hover/item:bg-brand-primary dark:group-hover/item:bg-indigo-600 group-hover/item:text-white">
                        {member.name[0]}
                      </div>
                      <div className="text-left overflow-hidden">
                        <p className="text-sm font-bold text-slate-900 dark:text-white leading-none truncate group-hover/item:text-brand-primary dark:group-hover/item:text-indigo-400 transition-colors">{member.name}</p>
                        <p className="text-[10px] text-slate-400 dark:text-dark-text-muted mt-1 uppercase truncate font-bold tracking-widest">{member.role}</p>
                      </div>
                    </button>
                  ))
                ) : (
                  <div className="px-4 py-8 text-center text-slate-400 dark:text-dark-text-muted text-xs italic">
                    No matching members
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
