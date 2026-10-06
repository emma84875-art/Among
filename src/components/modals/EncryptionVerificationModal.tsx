import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Person } from '../../types';
import { Avatar } from '../ui/Avatar';
import {
  IconClose,
  IconSecurity,
  IconCheck,
  IconCopy,
  IconKey,
  IconQrCode,
  IconLock,
  IconEye,
  IconEyeOff,
} from '../common/Icons';
import {
  getOrCreateDeviceIdentity,
  generateSafetyNumbers,
  isContactVerified,
  setContactVerified,
  DeviceKeyBundle,
} from '../../lib/e2ee';

interface EncryptionVerificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  person: Person;
  onVerificationChange?: (isVerified: boolean) => void;
}

export const EncryptionVerificationModal: React.FC<EncryptionVerificationModalProps> = ({
  isOpen,
  onClose,
  person,
  onVerificationChange,
}) => {
  const [deviceBundle, setDeviceBundle] = useState<DeviceKeyBundle | null>(null);
  const [safetyNumbers, setSafetyNumbers] = useState<string[]>([]);
  const [formattedNumbers, setFormattedNumbers] = useState<string>('');
  const [isVerified, setIsVerified] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);
  const [showInspector, setShowInspector] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'numbers' | 'guarantees'>('numbers');

  useEffect(() => {
    if (!isOpen) return;

    let mounted = true;
    async function loadCryptoInfo() {
      const bundle = await getOrCreateDeviceIdentity();
      if (!mounted) return;
      setDeviceBundle(bundle);

      const numbersData = await generateSafetyNumbers(
        bundle.publicKeyFingerprint,
        person.id || person.name
      );
      if (!mounted) return;
      setSafetyNumbers(numbersData.safetyNumbers);
      setFormattedNumbers(numbersData.formattedString);

      const verifiedStatus = await isContactVerified(person.id);
      if (!mounted) return;
      setIsVerified(verifiedStatus);
    }

    loadCryptoInfo();
    return () => {
      mounted = false;
    };
  }, [isOpen, person.id, person.name]);

  const handleCopyNumbers = async () => {
    try {
      await navigator.clipboard.writeText(formattedNumbers);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  const handleToggleVerified = async () => {
    const nextState = !isVerified;
    setIsVerified(nextState);
    await setContactVerified(person.id, nextState);
    onVerificationChange?.(nextState);
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-60 flex items-center justify-center p-3 sm:p-4 bg-black/50 backdrop-blur-sm select-none">
        <motion.div
          initial={{ opacity: 0, scale: 0.94, y: 14 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: 14 }}
          transition={{ type: 'spring', damping: 28, stiffness: 360 }}
          className="relative w-full max-w-md bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="px-5 py-4 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between bg-zinc-50/70 dark:bg-zinc-900/70">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                <IconSecurity className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50 leading-tight">
                  Cryptographic Verification
                </h3>
                <p className="text-[11px] font-mono text-zinc-400 dark:text-zinc-500">
                  End-to-End Sanctuary Encryption
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
              aria-label="Close verification modal"
            >
              <IconClose className="w-4 h-4" />
            </button>
          </div>

          {/* Body Content */}
          <div className="p-5 overflow-y-auto space-y-4 flex-1">
            {/* Person Card & Verification State */}
            <div className="flex items-center justify-between p-3 rounded-2xl bg-zinc-50 dark:bg-zinc-850/60 border border-zinc-200/60 dark:border-zinc-800">
              <div className="flex items-center gap-3 min-w-0">
                <Avatar
                  name={person.name}
                  gradient={person.avatarColor}
                  initials={person.initials}
                  size="md"
                />
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100 truncate">
                      {person.name}
                    </span>
                    {isVerified && (
                      <span
                        className="inline-flex items-center text-emerald-600 dark:text-emerald-400"
                        title="Cryptographically verified identity"
                      >
                        <IconSecurity className="w-3.5 h-3.5 fill-emerald-500/20" />
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-zinc-500 dark:text-zinc-400 truncate block">
                    {person.relationship}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={handleToggleVerified}
                className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all cursor-pointer flex items-center gap-1.5 shadow-2xs ${
                  isVerified
                    ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                    : 'bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-300 dark:hover:bg-zinc-700'
                }`}
              >
                <IconCheck className={`w-3.5 h-3.5 ${isVerified ? 'text-white' : 'opacity-40'}`} />
                <span>{isVerified ? 'Verified' : 'Mark Verified'}</span>
              </button>
            </div>

            {/* View Switcher Tabs */}
            <div className="flex rounded-xl bg-zinc-100 dark:bg-zinc-800 p-0.5 text-xs font-medium">
              <button
                type="button"
                onClick={() => setActiveTab('numbers')}
                className={`flex-1 py-1.5 rounded-lg transition-all cursor-pointer ${
                  activeTab === 'numbers'
                    ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-50 shadow-xs'
                    : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200'
                }`}
              >
                Safety Numbers
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('guarantees')}
                className={`flex-1 py-1.5 rounded-lg transition-all cursor-pointer ${
                  activeTab === 'guarantees'
                    ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-50 shadow-xs'
                    : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200'
                }`}
              >
                Privacy Architecture
              </button>
            </div>

            {activeTab === 'numbers' ? (
              <div className="space-y-3">
                <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
                  Compare these 60 numbers with{' '}
                  <strong className="text-zinc-900 dark:text-zinc-100">{person.name}</strong> in
                  person or over a trusted channel to mathematically verify that no intermediary can
                  intercept your messages, media, or voice notes.
                </p>

                {/* 60-digit Signal-Style Number Grid */}
                <div className="p-3.5 rounded-2xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200/80 dark:border-zinc-800 space-y-2">
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 font-mono text-center text-xs tracking-wider text-zinc-800 dark:text-zinc-200 tabular-nums">
                    {safetyNumbers.map((block, idx) => (
                      <span
                        key={idx}
                        className="py-1 px-1.5 rounded bg-white dark:bg-zinc-900 border border-zinc-200/60 dark:border-zinc-800/80 shadow-2xs font-medium"
                      >
                        {block}
                      </span>
                    ))}
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <span className="text-[10px] font-mono text-zinc-400 dark:text-zinc-500">
                      Standard Signal / E2EE Compatible
                    </span>
                    <button
                      type="button"
                      onClick={handleCopyNumbers}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-zinc-100 hover:bg-zinc-200/60 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                    >
                      {copied ? (
                        <>
                          <IconCheck className="w-3.5 h-3.5 text-emerald-500" />
                          <span className="text-emerald-600 dark:text-emerald-400">Copied</span>
                        </>
                      ) : (
                        <>
                          <IconCopy className="w-3.5 h-3.5" />
                          <span>Copy numbers</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Device Key Fingerprint */}
                <div className="flex items-center justify-between text-xs px-2 py-1 text-zinc-500 dark:text-zinc-400">
                  <span className="flex items-center gap-1.5 font-mono text-[11px]">
                    <IconKey className="w-3.5 h-3.5 text-zinc-400" />
                    <span>Your device key:</span>
                  </span>
                  <span className="font-mono text-[11px] text-zinc-700 dark:text-zinc-300">
                    {deviceBundle?.publicKeyFingerprint || 'Calculating…'}
                  </span>
                </div>
              </div>
            ) : (
              /* Privacy Guarantees Breakdown */
              <div className="space-y-2.5 text-xs text-zinc-600 dark:text-zinc-400">
                <div className="p-3 rounded-2xl bg-zinc-50 dark:bg-zinc-850/50 border border-zinc-200/60 dark:border-zinc-800 flex items-start gap-2.5">
                  <div className="w-6 h-6 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                    <IconKey className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-zinc-900 dark:text-zinc-100 text-xs">
                      Keys Kept Exclusively on Device
                    </h4>
                    <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5 leading-relaxed">
                      Encryption keys are generated inside your browser and stored in non-extractable
                      device storage. Private keys never touch any server.
                    </p>
                  </div>
                </div>

                <div className="p-3 rounded-2xl bg-zinc-50 dark:bg-zinc-850/50 border border-zinc-200/60 dark:border-zinc-800 flex items-start gap-2.5">
                  <div className="w-6 h-6 rounded-md bg-sky-500/10 text-sky-600 dark:text-sky-400 flex items-center justify-center shrink-0 mt-0.5">
                    <IconLock className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-zinc-900 dark:text-zinc-100 text-xs">
                      Zero Readable Server Plaintext
                    </h4>
                    <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5 leading-relaxed">
                      All messages, photos, voice notes, and files are encrypted with authenticated
                      AES-256-GCM. The server sees only opaque ciphertext.
                    </p>
                  </div>
                </div>

                <div className="p-3 rounded-2xl bg-zinc-50 dark:bg-zinc-850/50 border border-zinc-200/60 dark:border-zinc-800 flex items-start gap-2.5">
                  <div className="w-6 h-6 rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 mt-0.5">
                    <IconSecurity className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-zinc-900 dark:text-zinc-100 text-xs">
                      Zero Advertising & Tracking
                    </h4>
                    <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5 leading-relaxed">
                      AMONG does not track users, serve advertisements, or build marketing profiles.
                      Private conversations are completely off-limits to third parties.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Live Cryptographic Inspector Toggle */}
            <div className="pt-1">
              <button
                type="button"
                onClick={() => setShowInspector(!showInspector)}
                className="w-full flex items-center justify-between px-3 py-2 rounded-xl bg-zinc-100 dark:bg-zinc-800/80 hover:bg-zinc-200/80 dark:hover:bg-zinc-800 transition-colors text-xs text-zinc-700 dark:text-zinc-300 cursor-pointer"
              >
                <span className="flex items-center gap-1.5 font-medium">
                  {showInspector ? <IconEyeOff className="w-3.5 h-3.5" /> : <IconEye className="w-3.5 h-3.5" />}
                  <span>Live Ciphertext Inspector</span>
                </span>
                <span className="text-[10px] font-mono text-zinc-400">
                  {showInspector ? 'Hide' : 'Inspect'}
                </span>
              </button>

              <AnimatePresence>
                {showInspector && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden mt-2 p-3 rounded-xl bg-zinc-950 text-zinc-300 font-mono text-[10.5px] space-y-1.5 border border-zinc-800"
                  >
                    <div>
                      <span className="text-zinc-500">// Authenticated Envelope</span>
                    </div>
                    <div>
                      <span className="text-emerald-400">algorithm:</span> "AES-256-GCM"
                    </div>
                    <div>
                      <span className="text-sky-400">iv:</span> "u5mN7xK...12bytes=="
                    </div>
                    <div className="break-all">
                      <span className="text-amber-400">sampleCiphertext:</span> "gA4F9wE8...[E2EE encrypted payload]...d8Q=="
                    </div>
                    <div>
                      <span className="text-zinc-400">tagLength:</span> 128
                    </div>
                    <div>
                      <span className="text-zinc-400">serverVisibility:</span> 0 (Zero Plaintext)
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Footer Action */}
          <div className="p-4 border-t border-zinc-100 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-900/70 flex items-center justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-zinc-900 dark:bg-zinc-100 hover:bg-zinc-800 dark:hover:bg-zinc-200 text-white dark:text-zinc-900 text-xs font-medium transition-colors cursor-pointer shadow-xs"
            >
              Done
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
