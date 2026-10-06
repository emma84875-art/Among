import { motion } from 'motion/react';

export interface TypingIndicatorProps {
  variant?: 'header' | 'bubble' | 'inline';
  label?: string;
  className?: string;
}

export function TypingIndicator({
  variant = 'header',
  label = 'typing',
  className = '',
}: TypingIndicatorProps) {
  if (variant === 'bubble') {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 6 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 4 }}
        transition={{ duration: 0.2 }}
        className={`flex items-center gap-2 px-2.5 py-1 rounded-lg bg-zinc-100/90 dark:bg-zinc-900 border border-zinc-200/70 dark:border-zinc-800/70 text-zinc-500 dark:text-zinc-400 w-fit select-none shadow-2xs ${className}`}
        role="status"
        aria-live="polite"
        aria-label={label || 'Participant is typing'}
      >
        <div className="flex items-center gap-1">
          <motion.span
            className="w-1.5 h-1.5 rounded-full bg-emerald-500 dark:bg-emerald-400"
            animate={{ opacity: [0.35, 1, 0.35], y: [0, -2.5, 0] }}
            transition={{ duration: 1.1, repeat: Infinity, ease: 'easeInOut', delay: 0 }}
          />
          <motion.span
            className="w-1.5 h-1.5 rounded-full bg-emerald-500 dark:bg-emerald-400"
            animate={{ opacity: [0.35, 1, 0.35], y: [0, -2.5, 0] }}
            transition={{ duration: 1.1, repeat: Infinity, ease: 'easeInOut', delay: 0.2 }}
          />
          <motion.span
            className="w-1.5 h-1.5 rounded-full bg-emerald-500 dark:bg-emerald-400"
            animate={{ opacity: [0.35, 1, 0.35], y: [0, -2.5, 0] }}
            transition={{ duration: 1.1, repeat: Infinity, ease: 'easeInOut', delay: 0.4 }}
          />
        </div>
        <span className="text-[11px] font-medium tracking-tight text-zinc-500 dark:text-zinc-400">
          {label || 'writing...'}
        </span>
      </motion.div>
    );
  }

  // Header and inline variants (rendered under the chat title)
  return (
    <motion.div
      initial={{ opacity: 0, y: -2 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -2 }}
      transition={{ duration: 0.15 }}
      className={`flex items-center gap-1.5 text-[11px] font-medium text-emerald-600 dark:text-emerald-400 ${className}`}
      role="status"
      aria-live="polite"
      aria-label={`${label}...`}
    >
      <span className="leading-none">{label}</span>
      <span className="flex items-center gap-0.5" aria-hidden="true">
        <motion.span
          className="w-1 h-1 rounded-full bg-emerald-500 dark:bg-emerald-400"
          animate={{ opacity: [0.3, 1, 0.3], y: [0, -1.5, 0] }}
          transition={{ duration: 1, repeat: Infinity, ease: 'easeInOut', delay: 0 }}
        />
        <motion.span
          className="w-1 h-1 rounded-full bg-emerald-500 dark:bg-emerald-400"
          animate={{ opacity: [0.3, 1, 0.3], y: [0, -1.5, 0] }}
          transition={{ duration: 1, repeat: Infinity, ease: 'easeInOut', delay: 0.2 }}
        />
        <motion.span
          className="w-1 h-1 rounded-full bg-emerald-500 dark:bg-emerald-400"
          animate={{ opacity: [0.3, 1, 0.3], y: [0, -1.5, 0] }}
          transition={{ duration: 1, repeat: Infinity, ease: 'easeInOut', delay: 0.4 }}
        />
      </span>
    </motion.div>
  );
}
