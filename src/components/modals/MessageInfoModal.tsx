import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MessageItem } from '../views/ConversationScreen';
import {
  IconClose,
  IconCheck,
  IconCheckDouble,
  IconSecurity,
  IconHourglass,
  IconEye,
  IconEyeOff,
  IconClock,
  IconBluetooth,
  IconWifi,
  IconCloud,
  IconHardDrive,
  IconArrowRight,
  IconAlert,
  IconRotateCcw,
} from '../common/Icons';

interface MessageInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
  message: MessageItem | null;
  personName: string;
  readReceiptsEnabled: boolean;
  onToggleReadReceipts: () => void;
  onRetry?: (message: MessageItem) => void;
}

export const MessageInfoModal: React.FC<MessageInfoModalProps> = ({
  isOpen,
  onClose,
  message,
  personName,
  readReceiptsEnabled,
  onToggleReadReceipts,
  onRetry,
}) => {
  if (!isOpen || !message) return null;

  const isSent = message.sender === 'you';
  const isRead = message.status === 'read';
  const isDelivered = message.status === 'delivered' || message.status === 'read';
  const isSentConfirmed = message.status === 'sent' || isDelivered;
  const isSending = message.status === 'sending';
  const isFailed = message.status === 'failed';

  return (
    <AnimatePresence>
      <div
        className="fixed inset-0 z-60 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs select-none"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ type: 'spring', damping: 28, stiffness: 380 }}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-sm rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200/90 dark:border-zinc-800 shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3.5 border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-600 dark:text-zinc-300">
                <IconCheckDouble className="w-4 h-4 text-sky-500 dark:text-sky-400" />
              </div>
              <div>
                <h3 className="text-xs font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
                  Message Details & Receipts
                </h3>
                <p className="text-[10.5px] text-zinc-400">Delivery verification</p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-1 rounded-md text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
              aria-label="Close message info"
            >
              <IconClose className="w-4 h-4" />
            </button>
          </div>

          {/* Message Preview Snippet */}
          <div className="px-4 py-3 bg-zinc-50 dark:bg-zinc-950/60 border-b border-zinc-100 dark:border-zinc-800/80">
            <div className="text-[10px] uppercase font-mono tracking-wider text-zinc-400 mb-1 flex items-center justify-between">
              <span>{isSent ? 'Your Message' : `${personName}'s Message`}</span>
              {typeof message.sequenceNumber === 'number' && (
                <span className="text-zinc-500 font-mono">Seq #{message.sequenceNumber}</span>
              )}
            </div>
            <p className="text-xs text-zinc-800 dark:text-zinc-200 line-clamp-3 italic leading-relaxed">
              "{message.text || (message.type === 'photo' ? 'Photo attachment' : 'Voice note')}"
            </p>
          </div>

          {/* Receipts Progression Timeline */}
          <div className="p-4 space-y-4 overflow-y-auto flex-1 text-left">
            <div className="space-y-3">
              <span className="text-[10.5px] font-mono uppercase tracking-wider text-zinc-400 dark:text-zinc-500 font-semibold block px-1">
                Receipts Progression
              </span>

              <div className="space-y-2 relative before:absolute before:left-3.5 before:top-2 before:bottom-2 before:w-[1px] before:bg-zinc-200 dark:before:bg-zinc-800">
                {/* 1. Read Receipt State */}
                <div className="relative flex items-start gap-3 pl-1">
                  <div
                    className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 border z-10 ${
                      isRead
                        ? 'bg-sky-500 text-white border-sky-400 dark:bg-sky-500 dark:border-sky-400'
                        : !readReceiptsEnabled
                        ? 'bg-zinc-100 text-zinc-400 border-zinc-200 dark:bg-zinc-800 dark:border-zinc-700'
                        : 'bg-zinc-100 text-zinc-400 border-zinc-200 dark:bg-zinc-800 dark:border-zinc-700'
                    }`}
                  >
                    <IconCheckDouble className="w-3.5 h-3.5" />
                  </div>
                  <div className="min-w-0 flex-1 pt-0.5">
                    <div className="flex items-center justify-between">
                      <span
                        className={`text-xs font-semibold ${
                          isRead
                            ? 'text-sky-600 dark:text-sky-400'
                            : 'text-zinc-600 dark:text-zinc-400'
                        }`}
                      >
                        Read
                      </span>
                      <span className="text-[10px] font-mono text-zinc-400 dark:text-zinc-500">
                        {isRead
                          ? message.readAt || message.timestamp
                          : !readReceiptsEnabled
                          ? 'Receipts Paused'
                          : 'Pending'}
                      </span>
                    </div>
                    <p className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-tight mt-0.5">
                      {isRead
                        ? `Viewed by ${personName} in chat`
                        : !readReceiptsEnabled
                        ? 'Read receipts are turned off in your privacy settings'
                        : `Delivered to device; waiting for ${personName} to open`}
                    </p>
                  </div>
                </div>

                {/* 2. Delivered State */}
                <div className="relative flex items-start gap-3 pl-1">
                  <div
                    className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 border z-10 ${
                      isDelivered
                        ? 'bg-zinc-900 text-zinc-100 border-zinc-800 dark:bg-zinc-100 dark:text-zinc-950 dark:border-zinc-200'
                        : 'bg-zinc-100 text-zinc-400 border-zinc-200 dark:bg-zinc-800 dark:border-zinc-700'
                    }`}
                  >
                    <IconCheckDouble className="w-3.5 h-3.5" />
                  </div>
                  <div className="min-w-0 flex-1 pt-0.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                        Delivered
                      </span>
                      <span className="text-[10px] font-mono text-zinc-400 dark:text-zinc-500">
                        {isDelivered ? message.deliveredAt || message.timestamp : 'Pending'}
                      </span>
                    </div>
                    <p className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-tight mt-0.5">
                      Received and stored on recipient's cryptographic device
                    </p>
                  </div>
                </div>

                {/* 3. Sent / Queued State */}
                <div className="relative flex items-start gap-3 pl-1">
                  <div
                    className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 border z-10 ${
                      isSentConfirmed
                        ? 'bg-zinc-900 text-zinc-100 border-zinc-800 dark:bg-zinc-100 dark:text-zinc-950 dark:border-zinc-200'
                        : isFailed
                        ? 'bg-rose-50 text-rose-600 border-rose-200 dark:bg-rose-950 dark:text-rose-400 dark:border-rose-800'
                        : 'bg-amber-50 text-amber-600 border-amber-200 dark:bg-amber-950 dark:text-amber-400 dark:border-amber-800'
                    }`}
                  >
                    {isSentConfirmed ? (
                      <IconCheck className="w-3 h-3" />
                    ) : isFailed ? (
                      <IconAlert className="w-3 h-3" />
                    ) : (
                      <IconClock className="w-3 h-3 animate-pulse" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1 pt-0.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                        {isSentConfirmed
                          ? 'Sent'
                          : isFailed
                          ? 'Delivery Paused'
                          : 'Queued / Sending'}
                      </span>
                      <span className="text-[10px] font-mono text-zinc-400 dark:text-zinc-500">
                        {isSentConfirmed
                          ? message.sentAt || message.timestamp
                          : isFailed
                          ? 'Paused'
                          : 'Outbox Buffer'}
                      </span>
                    </div>
                    <p className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-tight mt-0.5">
                      {isSentConfirmed
                        ? 'Encrypted and dispatched from this device'
                        : isFailed
                        ? 'Network transmission paused. Tap retry to dispatch.'
                        : 'Encrypted and buffered locally in outbox. Dispatching upon connection...'}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Hybrid Transmission & Relay Path */}
            <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-850/60 border border-zinc-200/60 dark:border-zinc-800 space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                  {message.transport === 'bluetooth-le' || message.transport === 'bluetooth-mesh' ? (
                    <IconBluetooth className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  ) : message.transport === 'wifi-direct' ? (
                    <IconWifi className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  ) : message.transport === 'offline-queued' || message.meshStatus === 'queued' ? (
                    <IconHardDrive className="w-4 h-4 text-amber-500" />
                  ) : (
                    <IconCloud className="w-4 h-4 text-sky-500" />
                  )}
                  <span>Hybrid Transmission Path</span>
                </div>

                <span
                  className={`text-[9.5px] font-mono px-2 py-0.5 rounded-full font-medium ${
                    message.meshStatus === 'synced'
                      ? 'bg-sky-500/15 text-sky-600 dark:text-sky-400'
                      : message.meshStatus === 'queued' || message.transport === 'offline-queued'
                      ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
                      : message.transport === 'bluetooth-le' || message.transport === 'bluetooth-mesh' || message.transport === 'wifi-direct'
                      ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                      : 'bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400'
                  }`}
                >
                  {message.meshStatus === 'synced'
                    ? 'CLOUD SYNCED'
                    : message.transport === 'offline-queued' || message.meshStatus === 'queued'
                    ? 'QUEUED BUFFER'
                    : message.transport === 'bluetooth-le' || message.transport === 'bluetooth-mesh'
                    ? 'BLE MESH'
                    : message.transport === 'wifi-direct'
                    ? 'WIFI DIRECT'
                    : 'INTERNET DIRECT'}
                </span>
              </div>

              <div className="space-y-1.5 text-[11px] font-mono">
                <div className="flex justify-between items-center text-zinc-700 dark:text-zinc-300">
                  <span className="text-zinc-400 font-sans">Active Transport:</span>
                  <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                    {message.transport === 'bluetooth-le' || message.transport === 'bluetooth-mesh'
                      ? 'Bluetooth LE Nearby Mesh'
                      : message.transport === 'wifi-direct'
                      ? 'Wi-Fi Direct Peer Link'
                      : message.transport === 'offline-queued'
                      ? 'Offline Store & Forward Buffer'
                      : 'TLS Internet Gateway (Direct)'}
                  </span>
                </div>

                {message.meshHops && (
                  <div className="flex justify-between items-center text-zinc-700 dark:text-zinc-300">
                    <span className="text-zinc-400 font-sans">Radio Hops:</span>
                    <span>{message.meshHops === 1 ? '1 hop (Direct Peer)' : `${message.meshHops} hops (Multi-Hop Relay)`}</span>
                  </div>
                )}

                {message.relayCustodyNodes && message.relayCustodyNodes.length > 0 && (
                  <div className="pt-1 border-t border-black/5 dark:border-white/5">
                    <span className="text-zinc-400 font-sans block mb-0.5">Custody Chain:</span>
                    <div className="text-[10px] text-emerald-700 dark:text-emerald-400 bg-white/70 dark:bg-zinc-900/70 p-1.5 rounded-lg border border-black/5 dark:border-white/5 break-words">
                      {message.relayCustodyNodes.join(' → ')}
                    </div>
                  </div>
                )}

                {message.syncedAt && (
                  <div className="flex justify-between items-center text-sky-600 dark:text-sky-400 pt-1 border-t border-black/5 dark:border-white/5">
                    <span className="font-sans">Cloud Reconnect Sync:</span>
                    <span>{message.syncedAt}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Cryptography & Privacy Guarantees */}
            <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-850/60 border border-zinc-200/60 dark:border-zinc-800 space-y-2">
              <div className="flex items-center gap-2 text-xs font-medium text-zinc-900 dark:text-zinc-100">
                <IconSecurity className="w-3.5 h-3.5 text-emerald-500" />
                <span>End-to-End Cryptography</span>
              </div>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-relaxed">
                Receipts and message payloads are cryptographically signed. No intermediary servers
                can read timestamps or decipher message contents.
              </p>

              {message.type === 'photo' && (
                <div className="pt-2 border-t border-zinc-200/60 dark:border-zinc-800 space-y-1 text-[10.5px] font-mono">
                  <div className="flex justify-between items-center text-zinc-700 dark:text-zinc-300">
                    <span className="text-zinc-500 dark:text-zinc-400 font-sans">Media Cipher:</span>
                    <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                      {message.encryptedEnvelope?.algorithm || message.photoMetadata?.cipher || 'AES-256-GCM (128-bit MAC)'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-zinc-700 dark:text-zinc-300">
                    <span className="text-zinc-500 dark:text-zinc-400 font-sans">EXIF Metadata:</span>
                    <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                      {message.photoMetadata?.exifStripped !== false ? 'Scrubbed Client-Side' : 'Retained'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-zinc-700 dark:text-zinc-300">
                    <span className="text-zinc-500 dark:text-zinc-400 font-sans">Cloud Relays:</span>
                    <span className="text-zinc-600 dark:text-zinc-400">Zero Unencrypted Access</span>
                  </div>
                </div>
              )}

              {message.expiresAt && (
                <div className="flex items-center gap-1.5 pt-1 text-[11px] text-amber-600 dark:text-amber-400 font-mono">
                  <IconHourglass className="w-3.5 h-3.5" />
                  <span>Auto-delete timer active for this whisper</span>
                </div>
              )}
            </div>

            {/* Privacy Setting Toggle */}
            <div className="p-3 rounded-xl border border-zinc-200/80 dark:border-zinc-800 flex items-center justify-between gap-3 bg-white dark:bg-zinc-900">
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  {readReceiptsEnabled ? (
                    <IconEye className="w-3.5 h-3.5 text-emerald-500" />
                  ) : (
                    <IconEyeOff className="w-3.5 h-3.5 text-zinc-400" />
                  )}
                  <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                    Read Receipts
                  </span>
                </div>
                <p className="text-[10.5px] text-zinc-500 dark:text-zinc-400 leading-tight mt-0.5">
                  {readReceiptsEnabled
                    ? 'Active: Double check turns blue when read'
                    : 'Quiet: Double checks stay gray; no read pressure'}
                </p>
              </div>

              <button
                type="button"
                onClick={onToggleReadReceipts}
                className={`w-11 h-6 rounded-full transition-colors p-0.5 relative cursor-pointer shrink-0 ${
                  readReceiptsEnabled
                    ? 'bg-zinc-950 dark:bg-zinc-100'
                    : 'bg-zinc-200 dark:bg-zinc-700'
                }`}
                aria-label="Toggle read receipts"
              >
                <div
                  className={`w-5 h-5 rounded-full bg-white dark:bg-zinc-950 shadow-xs transition-transform ${
                    readReceiptsEnabled ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Footer */}
          <div className="px-4 py-3 border-t border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50 flex items-center justify-between gap-2">
            {onRetry && (isFailed || isSending) ? (
              <button
                type="button"
                onClick={() => {
                  onRetry(message);
                  onClose();
                }}
                className="px-3.5 py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-700 text-zinc-900 dark:text-zinc-100 text-xs font-medium transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <IconRotateCcw className="w-3.5 h-3.5 text-zinc-500" />
                Retry Whisper
              </button>
            ) : <div />}
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 rounded-xl bg-zinc-950 hover:bg-zinc-850 dark:bg-zinc-100 dark:hover:bg-white text-zinc-50 dark:text-zinc-950 text-xs font-semibold transition-colors cursor-pointer"
            >
              Done
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
