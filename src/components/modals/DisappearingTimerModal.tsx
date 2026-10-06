import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Person, DisappearingTimerOption, DisappearingTimerConfig } from '../../types';
import { Avatar } from '../ui/Avatar';
import {
  IconClose,
  IconHourglass,
  IconSecurity,
  IconCheck,
  IconSparkles,
  IconLock,
  IconDelete,
  IconTimer,
} from '../common/Icons';

export const DISAPPEARING_TIMER_CONFIGS: DisappearingTimerConfig[] = [
  {
    option: 'off',
    label: 'Off',
    badgeLabel: 'Keep',
    durationSeconds: 0,
    description: 'Messages remain in conversation history until you manually delete them.',
  },
  {
    option: '30s',
    label: '30 Seconds',
    badgeLabel: '30s',
    durationSeconds: 30,
    description: 'Fast ephemeral whisper. Perfect for sensitive passwords, keys, or quick testing.',
    ephemeralTest: true,
  },
  {
    option: '5m',
    label: '5 Minutes',
    badgeLabel: '5m',
    durationSeconds: 300,
    description: 'Short dialogue window. Dissolves shortly after your exchange concludes.',
  },
  {
    option: '1h',
    label: '1 Hour',
    badgeLabel: '1h',
    durationSeconds: 3600,
    description: 'Intimate focus. Vanishes after sixty minutes to keep your space uncluttered.',
  },
  {
    option: '24h',
    label: '24 Hours',
    badgeLabel: '24h',
    durationSeconds: 86400,
    description: 'Daily clean slate. Recommended for a peaceful, unburdened sanctuary.',
    recommended: true,
  },
  {
    option: '7d',
    label: '7 Days',
    badgeLabel: '7d',
    durationSeconds: 604800,
    description: 'Weekly renewal. Preserves calm context before gentle automated dissolution.',
  },
  {
    option: '4w',
    label: '4 Weeks',
    badgeLabel: '4w',
    durationSeconds: 2419200,
    description: 'Monthly horizon. Balances easy recall with zero permanent digital trail.',
  },
];

interface DisappearingTimerModalProps {
  isOpen: boolean;
  onClose: () => void;
  person: Person;
  currentOption: DisappearingTimerOption;
  onSaveOption: (option: DisappearingTimerOption) => void;
  onScrubHistoryNow?: () => void;
}

export const DisappearingTimerModal: React.FC<DisappearingTimerModalProps> = ({
  isOpen,
  onClose,
  person,
  currentOption,
  onSaveOption,
  onScrubHistoryNow,
}) => {
  const [selectedOption, setSelectedOption] = useState<DisappearingTimerOption>(currentOption);

  if (!isOpen) return null;

  const currentConfig =
    DISAPPEARING_TIMER_CONFIGS.find((c) => c.option === selectedOption) ||
    DISAPPEARING_TIMER_CONFIGS[0];

  const handleApply = () => {
    onSaveOption(selectedOption);
    onClose();
  };

  return (
    <AnimatePresence>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs select-none"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ type: 'spring', damping: 28, stiffness: 380 }}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-md rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200/90 dark:border-zinc-800 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3.5 border-b border-zinc-100 dark:border-zinc-800/80 bg-zinc-50/50 dark:bg-zinc-900/50">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-amber-500/10 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                <IconHourglass className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <h3 className="text-sm font-semibold tracking-tight text-zinc-950 dark:text-zinc-50 truncate">
                  Disappearing Messages
                </h3>
                <p className="text-[11px] text-zinc-500 dark:text-zinc-400 truncate">
                  Timer for chat with {person.name}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
              aria-label="Close modal"
            >
              <IconClose className="w-4 h-4" />
            </button>
          </div>

          {/* Body Content */}
          <div className="p-4 overflow-y-auto space-y-3.5 flex-1 overscroll-contain">
            {/* Architectural Security Guarantee Notice */}
            <div className="p-3 rounded-xl bg-zinc-100/80 dark:bg-zinc-800/60 border border-zinc-200/70 dark:border-zinc-750 flex items-start gap-2.5 text-left">
              <IconSecurity className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
              <div className="text-[11.5px] leading-relaxed text-zinc-600 dark:text-zinc-300">
                <span className="font-medium text-zinc-900 dark:text-zinc-100">
                  Cryptographic Ephemerality:
                </span>{' '}
                When enabled, new whispers in this thread are securely purged from device storage
                and decrypted memory once the countdown reaches zero. Existing messages are not
                impacted unless manually cleared.
              </div>
            </div>

            {/* Options List */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between px-1">
                <span className="text-[10.5px] font-mono uppercase tracking-wider text-zinc-400 dark:text-zinc-500 font-semibold">
                  Auto-Delete Duration
                </span>
                <span className="text-[10px] font-mono text-zinc-400 dark:text-zinc-500">
                  Current: {currentConfig.label}
                </span>
              </div>

              <div className="grid grid-cols-1 gap-1.5">
                {DISAPPEARING_TIMER_CONFIGS.map((cfg) => {
                  const isSelected = selectedOption === cfg.option;

                  return (
                    <button
                      key={cfg.option}
                      type="button"
                      onClick={() => setSelectedOption(cfg.option)}
                      className={`w-full flex items-start justify-between p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-zinc-950 text-zinc-50 border-zinc-950 dark:bg-zinc-100 dark:text-zinc-950 dark:border-zinc-100 shadow-xs'
                          : 'bg-white hover:bg-zinc-50/80 dark:bg-zinc-850/60 dark:hover:bg-zinc-800/80 border-zinc-200/80 dark:border-zinc-800 text-zinc-800 dark:text-zinc-200'
                      }`}
                    >
                      <div className="min-w-0 flex-1 pr-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-semibold tracking-tight">{cfg.label}</span>

                          {cfg.recommended && (
                            <span
                              className={`text-[9.5px] font-mono px-1.5 py-0.5 rounded-md uppercase tracking-wider font-semibold ${
                                isSelected
                                  ? 'bg-emerald-500/20 text-emerald-300 dark:bg-emerald-500/25 dark:text-emerald-800'
                                  : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                              }`}
                            >
                              Recommended
                            </span>
                          )}

                          {cfg.ephemeralTest && (
                            <span
                              className={`text-[9.5px] font-mono px-1.5 py-0.5 rounded-md uppercase tracking-wider font-semibold ${
                                isSelected
                                  ? 'bg-amber-400/20 text-amber-200 dark:bg-amber-500/25 dark:text-amber-800'
                                  : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                              }`}
                            >
                              Quick Test
                            </span>
                          )}
                        </div>

                        <p
                          className={`text-[11px] leading-tight mt-1 ${
                            isSelected
                              ? 'text-zinc-300 dark:text-zinc-600'
                              : 'text-zinc-500 dark:text-zinc-400'
                          }`}
                        >
                          {cfg.description}
                        </p>
                      </div>

                      {/* Radio indicator */}
                      <div
                        className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 mt-0.5 transition-colors ${
                          isSelected
                            ? 'border-emerald-400 dark:border-emerald-600 bg-emerald-500 dark:bg-emerald-600 text-white'
                            : 'border-zinc-300 dark:border-zinc-700 bg-transparent'
                        }`}
                      >
                        {isSelected && <IconCheck className="w-2.5 h-2.5 stroke-[3]" />}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Optional Immediate Manual Scrub Button */}
            {onScrubHistoryNow && (
              <div className="pt-1">
                <button
                  type="button"
                  onClick={() => {
                    if (window.confirm('Delete all messages in this conversation right now?')) {
                      onScrubHistoryNow();
                      onClose();
                    }
                  }}
                  className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl border border-rose-200/80 dark:border-rose-900/50 hover:bg-rose-50/60 dark:hover:bg-rose-950/30 text-rose-600 dark:text-rose-400 text-xs font-medium transition-colors cursor-pointer"
                >
                  <IconDelete className="w-3.5 h-3.5" />
                  <span>Scrub All Current Messages Immediately</span>
                </button>
              </div>
            )}
          </div>

          {/* Footer Controls */}
          <div className="px-4 py-3 border-t border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50 flex items-center justify-end gap-2 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-750 text-xs font-medium text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={handleApply}
              className="px-4 py-1.5 rounded-xl bg-zinc-950 hover:bg-zinc-850 dark:bg-zinc-100 dark:hover:bg-white text-zinc-50 dark:text-zinc-950 text-xs font-semibold shadow-xs transition-all cursor-pointer active:scale-95"
            >
              Save Timer Setting
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
