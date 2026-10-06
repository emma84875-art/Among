import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { IconClose } from '../common/Icons';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  variant?: 'bottom-sheet' | 'dialog';
  className?: string;
}

export function Modal({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  footer,
  variant = 'bottom-sheet',
  className = '',
}: ModalProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/40 dark:bg-black/70 backdrop-blur-xs"
          />

          {/* Modal / Sheet Container */}
          <motion.div
            initial={
              variant === 'bottom-sheet'
                ? { y: '100%', opacity: 0.8 }
                : { scale: 0.95, opacity: 0 }
            }
            animate={{ y: 0, scale: 1, opacity: 1 }}
            exit={
              variant === 'bottom-sheet'
                ? { y: '100%', opacity: 0 }
                : { scale: 0.95, opacity: 0 }
            }
            transition={{ type: 'spring', damping: 28, stiffness: 320 }}
            className={`relative w-full max-w-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-2xl overflow-hidden flex flex-col z-10 ${
              variant === 'bottom-sheet'
                ? 'rounded-t-[2rem] sm:rounded-3xl max-h-[88vh]'
                : 'rounded-3xl max-h-[85vh]'
            } ${className}`}
          >
            {/* Sheet Handle */}
            {variant === 'bottom-sheet' && (
              <div className="pt-3 pb-1 flex justify-center sm:hidden">
                <div className="w-10 h-1 rounded-full bg-zinc-300 dark:bg-zinc-700" />
              </div>
            )}

            {/* Header */}
            {(title || subtitle) && (
              <div className="flex items-start justify-between px-6 pt-5 pb-3 border-b border-zinc-200 dark:border-zinc-800">
                <div className="pr-4">
                  {title && (
                    <h3 className="text-xl text-zinc-950 dark:text-zinc-50 font-semibold tracking-tight">
                      {title}
                    </h3>
                  )}
                  {subtitle && (
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                      {subtitle}
                    </p>
                  )}
                </div>

                <button
                  type="button"
                  onClick={onClose}
                  className="p-2 rounded-full text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                  aria-label="Close"
                >
                  <IconClose className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Content Body */}
            <div className="flex-1 overflow-y-auto px-6 py-5">{children}</div>

            {/* Footer */}
            {footer && (
              <div className="px-6 py-4 bg-zinc-50 dark:bg-zinc-950 border-t border-zinc-200 dark:border-zinc-800">
                {footer}
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
