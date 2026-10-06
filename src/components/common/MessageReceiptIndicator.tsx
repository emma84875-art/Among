import React from 'react';
import { motion } from 'motion/react';
import { IconCheck, IconCheckDouble, IconClock, IconAlert } from './Icons';

export type ReceiptStatus = 'sending' | 'sent' | 'delivered' | 'read' | 'failed';

export interface MessageReceiptIndicatorProps {
  status?: ReceiptStatus;
  readReceiptsEnabled?: boolean;
  timestamp?: string;
  readAt?: string;
  deliveredAt?: string;
  sentAt?: string;
  onClick?: (e: React.MouseEvent) => void;
  className?: string;
}

export const MessageReceiptIndicator: React.FC<MessageReceiptIndicatorProps> = ({
  status = 'delivered',
  readReceiptsEnabled = true,
  timestamp,
  readAt,
  deliveredAt,
  sentAt,
  onClick,
  className = '',
}) => {
  const isRead = status === 'read' && readReceiptsEnabled;
  const isDelivered = status === 'delivered' || (status === 'read' && !readReceiptsEnabled);
  const isSent = status === 'sent';
  const isSending = status === 'sending';
  const isFailed = status === 'failed';

  const tooltipTitle = isFailed
    ? 'Delivery paused · Click to retry'
    : isSending
    ? 'Sending whisper · Buffered securely'
    : isRead
    ? `Read at ${readAt || timestamp || 'recent'}. Click for receipts info.`
    : isDelivered
    ? `Delivered at ${deliveredAt || timestamp || 'recent'}. Click for receipts info.`
    : isSent
    ? `Sent at ${sentAt || timestamp || 'recent'}. Click for receipts info.`
    : 'Sent · Click for receipts info.';

  const ariaLabel = isFailed
    ? 'Delivery failed. Click to retry.'
    : isSending
    ? 'Sending message'
    : isRead
    ? `Read receipt: Read at ${readAt || timestamp || 'recent'}`
    : isDelivered
    ? `Delivery receipt: Delivered at ${deliveredAt || timestamp || 'recent'}`
    : 'Message sent';

  return (
    <button
      type="button"
      onClick={onClick}
      title={tooltipTitle}
      aria-label={ariaLabel}
      className={`inline-flex items-center justify-center p-0.5 rounded transition-transform duration-150 hover:scale-115 active:scale-95 cursor-pointer focus:outline-hidden select-none ${className}`}
    >
      {isRead ? (
        <motion.span
          key="read-check"
          initial={{ scale: 0.75, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 450, damping: 22 }}
          className="inline-flex items-center text-sky-400 dark:text-sky-400 drop-shadow-[0_0_3px_rgba(56,189,248,0.45)]"
        >
          <IconCheckDouble className="w-3 h-3 shrink-0" />
        </motion.span>
      ) : isDelivered ? (
        <motion.span
          key="delivered-check"
          initial={{ scale: 0.85, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="inline-flex items-center text-zinc-300 dark:text-zinc-500 opacity-90"
        >
          <IconCheckDouble className="w-3 h-3 shrink-0" />
        </motion.span>
      ) : isSent ? (
        <motion.span
          key="sent-check"
          initial={{ scale: 0.85, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="inline-flex items-center text-zinc-300 dark:text-zinc-500 opacity-90"
        >
          <IconCheck className="w-3 h-3 shrink-0" />
        </motion.span>
      ) : isFailed ? (
        <span className="inline-flex items-center text-rose-400 dark:text-rose-500 animate-pulse">
          <IconAlert className="w-3 h-3 shrink-0" />
        </span>
      ) : (
        <span className="inline-flex items-center text-zinc-400 dark:text-zinc-500 animate-pulse">
          <IconClock className="w-3 h-3 shrink-0" />
        </span>
      )}
    </button>
  );
};
