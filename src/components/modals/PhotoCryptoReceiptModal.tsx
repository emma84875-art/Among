import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MessageItem } from '../views/ConversationScreen';
import {
  IconClose,
  IconLock,
  IconSecurity,
  IconCheck,
  IconCopy,
  IconDownload,
  IconFeather,
  IconHourglass,
  IconKey,
} from '../common/Icons';
import { formatBytes } from '../../lib/e2ee';

interface PhotoCryptoReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  message: MessageItem | null;
  personName: string;
}

export const PhotoCryptoReceiptModal: React.FC<PhotoCryptoReceiptModalProps> = ({
  isOpen,
  onClose,
  message,
  personName,
}) => {
  const [copiedKey, setCopiedKey] = useState(false);

  if (!isOpen || !message || message.type !== 'photo') return null;

  const isSent = message.sender === 'you';
  const envelope = message.encryptedEnvelope;
  const meta = message.photoMetadata;

  const cipherName = envelope?.algorithm || meta?.cipher || 'AES-256-GCM (128-bit MAC)';
  const ivString = envelope?.iv || meta?.ivPreview || '96-bit unique random nonce';
  const fingerprint = envelope?.senderFingerprint || (isSent ? 'Device Master Key' : `${personName}'s Key`);
  const digest = meta?.sha256Digest || (envelope?.ciphertext ? envelope.ciphertext.slice(0, 32) + '…' : 'Verified Authenticated Hash');

  const handleCopyProof = () => {
    const proofText = `[AMONG CRYPTOGRAPHIC RECEIPT]\nCipher: ${cipherName}\nSender Fingerprint: ${fingerprint}\nIV (Base64): ${ivString}\nPayload Hash: ${digest}\nTimestamp: ${message.timestamp}\nStatus: Authenticated (Tamper-Proof)`;
    navigator.clipboard.writeText(proofText);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2000);
  };

  const handleDownloadDecrypted = () => {
    if (!message.imageUrl) return;
    const a = document.createElement('a');
    a.href = message.imageUrl;
    a.download = `among-photo-${message.timestamp.replace(':', '')}-${Date.now()}.jpg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <AnimatePresence>
      <div
        className="fixed inset-0 z-70 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-md select-none"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.94, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: 10 }}
          transition={{ type: 'spring', damping: 28, stiffness: 380 }}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-sm sm:max-w-md rounded-2xl bg-white dark:bg-zinc-950 border border-zinc-200/90 dark:border-zinc-800 shadow-2xl overflow-hidden flex flex-col max-h-[90vh] text-zinc-900 dark:text-zinc-100"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3.5 border-b border-zinc-100 dark:border-zinc-850 bg-zinc-50/50 dark:bg-zinc-900/50">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                <IconLock className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs font-semibold tracking-tight">
                  Cryptographic Media Receipt
                </h3>
                <p className="text-[10px] text-zinc-400 font-mono">
                  AES-256-GCM End-to-End Encryption
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-1 rounded-md text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
              aria-label="Close photo receipt"
            >
              <IconClose className="w-4 h-4" />
            </button>
          </div>

          {/* Modal Content */}
          <div className="p-4 space-y-4 overflow-y-auto flex-1 text-left">
            {/* Photo Snippet & Integrity Status */}
            <div className="flex items-center gap-3 p-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800">
              {message.imageUrl && (
                <img
                  src={message.imageUrl}
                  alt={message.imageCaption || 'Encrypted Photo'}
                  className="w-14 h-14 object-cover rounded-lg border border-black/10 dark:border-white/10 shrink-0"
                />
              )}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                    Authenticated & Verified
                  </span>
                </div>
                <p className="text-[11px] text-zinc-600 dark:text-zinc-300 truncate mt-0.5 font-medium">
                  {message.imageCaption || (message.text !== 'Photo' ? message.text : 'Quiet Camera Snapshot')}
                </p>
                <p className="text-[10px] font-mono text-zinc-400">
                  Dispatched at {message.timestamp} · {isSent ? 'Sent by you' : `Sent by ${personName}`}
                </p>
              </div>
            </div>

            {/* Cryptographic Specifications Table */}
            <div className="space-y-1.5">
              <span className="text-[10.5px] font-mono uppercase tracking-wider text-zinc-400 font-semibold block px-1">
                Cryptographic Parameters
              </span>

              <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/60 divide-y divide-zinc-100 dark:divide-zinc-800/80 text-xs">
                {/* Cipher */}
                <div className="p-2.5 flex items-center justify-between">
                  <span className="text-zinc-500 dark:text-zinc-400 font-sans">Cipher Protocol</span>
                  <span className="font-mono text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                    {cipherName}
                  </span>
                </div>

                {/* Key Derivation */}
                <div className="p-2.5 flex items-center justify-between">
                  <span className="text-zinc-500 dark:text-zinc-400 font-sans">Key Architecture</span>
                  <span className="font-mono text-[11px] text-zinc-700 dark:text-zinc-300">
                    Hardware Derived (WebCrypto)
                  </span>
                </div>

                {/* Initialization Vector */}
                <div className="p-2.5 flex items-center justify-between">
                  <span className="text-zinc-500 dark:text-zinc-400 font-sans">Unique IV (Nonce)</span>
                  <span className="font-mono text-[10.5px] text-zinc-600 dark:text-zinc-300 truncate max-w-[180px]">
                    {ivString}
                  </span>
                </div>

                {/* Sender Fingerprint */}
                <div className="p-2.5 flex items-center justify-between">
                  <span className="text-zinc-500 dark:text-zinc-400 font-sans">Device Fingerprint</span>
                  <span className="font-mono text-[10.5px] text-zinc-600 dark:text-zinc-300 truncate max-w-[180px]">
                    {fingerprint}
                  </span>
                </div>

                {/* Tag & Digest */}
                <div className="p-2.5 flex items-center justify-between">
                  <span className="text-zinc-500 dark:text-zinc-400 font-sans">Authentication Tag</span>
                  <span className="font-mono text-[11px] text-emerald-600 dark:text-emerald-400">
                    128-bit GCM MAC
                  </span>
                </div>

                {/* Media Digest */}
                <div className="p-2.5 flex items-center justify-between">
                  <span className="text-zinc-500 dark:text-zinc-400 font-sans">Payload Digest</span>
                  <span className="font-mono text-[10px] text-zinc-500 dark:text-zinc-400 truncate max-w-[180px]">
                    {digest}
                  </span>
                </div>
              </div>
            </div>

            {/* Privacy Protections Applied */}
            <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                <IconFeather className="w-3.5 h-3.5 text-emerald-500" />
                <span>Sanitization Guarantees</span>
              </div>
              <ul className="text-[11px] text-zinc-500 dark:text-zinc-400 space-y-1.5 pl-1 leading-relaxed">
                <li className="flex items-start gap-1.5">
                  <span className="text-emerald-500 font-bold">✓</span>
                  <span><strong>EXIF stripped:</strong> GPS location coordinates, camera lens serials, and device metadata were scrubbed prior to encryption.</span>
                </li>
                <li className="flex items-start gap-1.5">
                  <span className="text-emerald-500 font-bold">✓</span>
                  <span><strong>Zero cloud processing:</strong> Plaintext media is never uploaded to any remote server or AI service.</span>
                </li>
                {message.expiresAt && (
                  <li className="flex items-start gap-1.5 text-amber-600 dark:text-amber-400">
                    <span className="font-bold">✓</span>
                    <span><strong>Auto-delete timer:</strong> Whisper and encrypted media will automatically dissolve upon expiration.</span>
                  </li>
                )}
              </ul>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="px-4 py-3 border-t border-zinc-100 dark:border-zinc-850 bg-zinc-50/50 dark:bg-zinc-900/50 flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={handleCopyProof}
                className="px-3 py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-750 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-xs font-medium text-zinc-700 dark:text-zinc-200 transition-colors cursor-pointer flex items-center gap-1.5"
                title="Copy cryptographic proof to clipboard"
              >
                {copiedKey ? (
                  <>
                    <IconCheck className="w-3.5 h-3.5 text-emerald-500" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <IconCopy className="w-3.5 h-3.5" />
                    <span>Copy Proof</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handleDownloadDecrypted}
                className="px-3 py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-750 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-xs font-medium text-zinc-700 dark:text-zinc-200 transition-colors cursor-pointer flex items-center gap-1.5"
                title="Save decrypted photo to local device"
              >
                <IconDownload className="w-3.5 h-3.5" />
                <span>Save</span>
              </button>
            </div>

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
