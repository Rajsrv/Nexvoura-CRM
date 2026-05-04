import React from 'react';
import { motion } from 'motion/react';

interface NexvouraLoaderProps {
  label?: string;
  size?: 'sm' | 'md' | 'lg';
}

export default function NexvouraLoader({ label = 'Initiating Nexvoura Protocol', size = 'md' }: NexvouraLoaderProps) {
  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-16 h-16',
    lg: 'w-24 h-24'
  };

  const iconSizes = {
    sm: 16,
    md: 32,
    lg: 48
  };

  return (
    <div className="flex flex-col items-center justify-center gap-6 p-12">
      <div className={`relative ${sizeClasses[size]}`}>
        {/* Orbiting Ring 1 */}
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          className="absolute inset-0 border-2 border-brand-primary/20 border-t-brand-primary rounded-full"
        />
        
        {/* Orbiting Ring 2 */}
        <motion.div
          animate={{ rotate: -360 }}
          transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
          className="absolute inset-2 border-2 border-indigo-400/20 border-b-indigo-400 rounded-full"
        />

        {/* Central Pulse */}
        <motion.div
          animate={{ 
            scale: [1, 1.2, 1],
            opacity: [0.5, 1, 0.5]
          }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          className="absolute inset-0 flex items-center justify-center"
        >
          <div className="text-brand-primary font-black italic tracking-tighter" style={{ fontSize: iconSizes[size] / 1.5 }}>
            NX
          </div>
        </motion.div>
      </div>

      {label && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-400 dark:text-dark-text-muted animate-pulse"
        >
          {label}
        </motion.p>
      )}
    </div>
  );
}
