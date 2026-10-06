import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChatBackgroundTexture, ChatTextureConfig } from '../../types';
import {
  CHAT_TEXTURE_CONFIGS,
  CHAT_TEXTURE_LIST,
  saveChatTexture,
} from '../../lib/textures';
import {
  IconClose,
  IconCheck,
  IconCheckDouble,
  IconPalette,
  IconLayers,
  IconSparkles,
} from '../common/Icons';
import { Avatar } from '../ui/Avatar';

interface ChatTextureModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentTexture: ChatBackgroundTexture;
  onSelectTexture: (texture: ChatBackgroundTexture) => void;
}

export const ChatTextureModal: React.FC<ChatTextureModalProps> = ({
  isOpen,
  onClose,
  currentTexture,
  onSelectTexture,
}) => {
  const [selected, setSelected] = useState<ChatBackgroundTexture>(currentTexture);

  if (!isOpen) return null;

  const activeConfig = CHAT_TEXTURE_CONFIGS[selected] || CHAT_TEXTURE_CONFIGS.washi;

  const handleApply = (texture: ChatBackgroundTexture) => {
    setSelected(texture);
    saveChatTexture(texture);
    onSelectTexture(texture);
  };

  return (
    <AnimatePresence>
      <div
        className="fixed inset-0 z-60 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs select-none"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, y: 30, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 30, scale: 0.98 }}
          transition={{ type: 'spring', damping: 28, stiffness: 360 }}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-lg rounded-t-3xl sm:rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200/90 dark:border-zinc-800 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-150 dark:border-zinc-800 bg-zinc-50/60 dark:bg-zinc-900/60">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-zinc-150 dark:bg-zinc-800 flex items-center justify-center text-zinc-800 dark:text-zinc-200">
                <IconLayers className="w-4 h-4 text-zinc-700 dark:text-zinc-300" />
              </div>
              <div>
                <h3 className="text-sm font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
                  Chat Sanctuary Texture
                </h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  Quiet tactile surfaces for conversation screens
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
              aria-label="Close texture modal"
            >
              <IconClose className="w-4 h-4" />
            </button>
          </div>

          {/* Interactive Live Mini-Preview of Selected Texture */}
          <div className="p-4 sm:p-5 border-b border-zinc-150 dark:border-zinc-800 bg-zinc-100/50 dark:bg-zinc-950/40">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10.5px] uppercase font-mono tracking-wider text-zinc-400 font-semibold flex items-center gap-1.5">
                <IconSparkles className="w-3 h-3 text-zinc-500" />
                Live Atmosphere Preview
              </span>
              <span className="text-xs font-medium text-zinc-900 dark:text-zinc-100">
                {activeConfig.name}
              </span>
            </div>

            {/* Simulated Chat Window with Chosen Texture */}
            <div className="relative rounded-2xl border border-zinc-250 dark:border-zinc-800 overflow-hidden bg-[#faf9f6]/95 dark:bg-zinc-950 shadow-inner min-h-[140px] p-3 flex flex-col justify-between">
              {/* Dynamic Texture Overlay */}
              {selected !== 'none' && (
                <div
                  className={`pointer-events-none absolute inset-0 z-0 select-none ${activeConfig.overlayClass}`}
                  aria-hidden="true"
                />
              )}

              {/* Top Contact Header Bar */}
              <div className="relative z-10 flex items-center justify-between pb-2 border-b border-black/5 dark:border-white/5">
                <div className="flex items-center gap-2">
                  <Avatar
                    initials="EV"
                    name="Elena Vance"
                    gradient="from-emerald-700 to-teal-900"
                    size="xs"
                    presence="here"
                  />
                  <span className="text-xs font-medium text-zinc-800 dark:text-zinc-200">
                    Elena Vance
                  </span>
                </div>
                <span className="text-[10px] font-mono text-zinc-400">Encrypted</span>
              </div>

              {/* Message Bubbles Showcase */}
              <div className="relative z-10 space-y-1.5 py-2">
                {/* Incoming Whisper */}
                <div className="flex justify-start">
                  <div className="w-fit max-w-[80%] rounded-lg px-2.5 py-1 bg-[#E8E8E8] text-zinc-900 border border-[#D8D8D8]/80 dark:bg-[#292929] dark:text-zinc-50 dark:border-[#383838]/80 shadow-2xs text-[11.5px] leading-snug">
                    <span>The pines are completely still this evening.</span>
                    <span className="inline-flex items-center ml-2 float-right text-[9px] font-mono text-zinc-600 dark:text-zinc-300 translate-y-0.5">
                      18:42
                    </span>
                    <div className="clear-both" />
                  </div>
                </div>

                {/* Outgoing Message with Read Receipts */}
                <div className="flex justify-end">
                  <div className="w-fit max-w-[80%] rounded-lg px-2.5 py-1 bg-[#2B2B2B] text-zinc-50 border border-[#383838]/80 dark:bg-[#E5E5E5] dark:text-zinc-950 dark:border-[#D4D4D4] shadow-2xs text-[11.5px] leading-snug">
                    <span>Peaceful spaces make for clearer thoughts.</span>
                    <span className="inline-flex items-center gap-1 ml-2 float-right text-[9px] font-mono text-zinc-300 dark:text-zinc-600 translate-y-0.5">
                      <span>18:43</span>
                      <IconCheckDouble className="w-2.5 h-2.5 text-sky-400 dark:text-sky-600 inline" />
                    </span>
                    <div className="clear-both" />
                  </div>
                </div>
              </div>

              <div className="relative z-10 pt-1 border-t border-black/5 dark:border-white/5 text-[10px] text-zinc-400 font-mono flex justify-between items-center">
                <span>{activeConfig.tagline}</span>
                <span>Tactile & Calm</span>
              </div>
            </div>
          </div>

          {/* Texture Selector Options */}
          <div className="p-4 sm:p-5 overflow-y-auto space-y-2.5 flex-1">
            <span className="text-[10.5px] uppercase font-mono tracking-wider text-zinc-400 font-semibold block px-0.5">
              Available Textures
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {CHAT_TEXTURE_LIST.map((texture) => {
                const isSelected = selected === texture.id;

                return (
                  <button
                    key={texture.id}
                    type="button"
                    onClick={() => handleApply(texture.id)}
                    className={`relative flex items-start gap-3 p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                      isSelected
                        ? 'border-zinc-900 dark:border-zinc-100 bg-zinc-950 text-zinc-50 dark:bg-zinc-100 dark:text-zinc-950 shadow-sm'
                        : 'border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/60 text-zinc-800 dark:text-zinc-200 hover:border-zinc-300 dark:hover:border-zinc-700'
                    }`}
                  >
                    {/* Visual Swatch */}
                    <div
                      className={`relative w-10 h-10 rounded-xl shrink-0 overflow-hidden border ${
                        isSelected
                          ? 'border-zinc-700 dark:border-zinc-300 bg-zinc-900 dark:bg-zinc-200'
                          : 'border-zinc-200 dark:border-zinc-750 bg-white dark:bg-zinc-850'
                      }`}
                    >
                      {texture.id !== 'none' ? (
                        <div
                          className={`absolute inset-0 ${texture.previewClass || texture.overlayClass}`}
                        />
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center text-[10px] font-mono text-zinc-400">
                          Flat
                        </div>
                      )}
                    </div>

                    {/* Text Details */}
                    <div className="flex-1 min-w-0 pr-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold tracking-tight">
                          {texture.name}
                        </span>
                        {isSelected && (
                          <IconCheck className="w-3.5 h-3.5 text-zinc-100 dark:text-zinc-900 shrink-0" />
                        )}
                      </div>
                      <span
                        className={`text-[10.5px] block mt-0.5 font-medium ${
                          isSelected
                            ? 'text-zinc-300 dark:text-zinc-600'
                            : 'text-zinc-500 dark:text-zinc-400'
                        }`}
                      >
                        {texture.tagline}
                      </span>
                      <p
                        className={`text-[10px] mt-1 leading-relaxed line-clamp-2 ${
                          isSelected
                            ? 'text-zinc-400 dark:text-zinc-500'
                            : 'text-zinc-400 dark:text-zinc-500'
                        }`}
                      >
                        {texture.description}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Footer Controls */}
          <div className="p-4 border-t border-zinc-150 dark:border-zinc-800 bg-zinc-50/80 dark:bg-zinc-900/80 flex items-center justify-between gap-3">
            <span className="text-xs text-zinc-500 dark:text-zinc-400 font-mono">
              Persisted across all chats
            </span>
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2 rounded-xl bg-zinc-950 text-zinc-50 dark:bg-zinc-100 dark:text-zinc-950 hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors text-xs font-semibold cursor-pointer shadow-xs"
            >
              Done
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
