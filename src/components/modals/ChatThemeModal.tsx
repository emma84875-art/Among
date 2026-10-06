import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChatThemeId, ChatThemeSetting } from '../../types';
import {
  CHAT_THEME_LIST,
  CUSTOM_COLOR_PRESETS,
  resolveChatTheme,
  saveConversationTheme,
} from '../../lib/themes';
import {
  IconClose,
  IconCheck,
  IconCheckDouble,
  IconPalette,
  IconSparkles,
  IconLock,
} from '../common/Icons';
import { Avatar } from '../ui/Avatar';

interface ChatThemeModalProps {
  isOpen: boolean;
  onClose: () => void;
  threadId: string;
  recipientName: string;
  recipientInitials: string;
  recipientAvatarColor?: string;
  currentSetting: ChatThemeSetting;
  onSelectTheme: (setting: ChatThemeSetting) => void;
}

export const ChatThemeModal: React.FC<ChatThemeModalProps> = ({
  isOpen,
  onClose,
  threadId,
  recipientName,
  recipientInitials,
  recipientAvatarColor,
  currentSetting,
  onSelectTheme,
}) => {
  const [selectedThemeId, setSelectedThemeId] = useState<ChatThemeId>(currentSetting.themeId);
  const [customColor, setCustomColor] = useState<string>(
    currentSetting.customColor || '#8B5CF6'
  );

  // Sync state whenever modal opens or currentSetting changes
  useEffect(() => {
    setSelectedThemeId(currentSetting.themeId);
    if (currentSetting.customColor) {
      setCustomColor(currentSetting.customColor);
    }
  }, [currentSetting, isOpen]);

  if (!isOpen) return null;

  const currentThemeSetting: ChatThemeSetting = {
    themeId: selectedThemeId,
    customColor: selectedThemeId === 'custom' ? customColor : undefined,
  };

  const resolvedTheme = resolveChatTheme(currentThemeSetting);

  const handleApply = (themeId: ChatThemeId, color?: string) => {
    const newSetting: ChatThemeSetting = {
      themeId,
      customColor: themeId === 'custom' ? (color || customColor) : undefined,
    };
    setSelectedThemeId(themeId);
    if (color) setCustomColor(color);
    saveConversationTheme(threadId, newSetting);
    onSelectTheme(newSetting);
  };

  const handleCustomColorChange = (newHex: string) => {
    setCustomColor(newHex);
    if (selectedThemeId === 'custom') {
      const newSetting: ChatThemeSetting = {
        themeId: 'custom',
        customColor: newHex,
      };
      saveConversationTheme(threadId, newSetting);
      onSelectTheme(newSetting);
    }
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
          <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-150 dark:border-zinc-800 bg-zinc-50/60 dark:bg-zinc-900/60 shrink-0">
            <div className="flex items-center gap-2.5">
              <div
                className="w-8 h-8 rounded-xl flex items-center justify-center text-white shadow-2xs"
                style={{ backgroundColor: resolvedTheme.accentColor }}
              >
                <IconPalette className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
                  Chat Theme · {recipientName}
                </h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  Custom atmosphere & bubble tones for this conversation
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
              aria-label="Close theme modal"
            >
              <IconClose className="w-4 h-4" />
            </button>
          </div>

          {/* Interactive Live Mini-Preview of Selected Theme */}
          <div className="p-4 sm:p-5 border-b border-zinc-150 dark:border-zinc-800 bg-zinc-100/50 dark:bg-zinc-950/40 shrink-0">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10.5px] uppercase font-mono tracking-wider text-zinc-400 font-semibold flex items-center gap-1.5">
                <IconSparkles className="w-3 h-3 text-zinc-500" />
                Live Conversation Preview
              </span>
              <span
                className="text-xs font-semibold px-2 py-0.5 rounded-md border font-mono text-[11px]"
                style={{
                  borderColor: resolvedTheme.accentColor,
                  color: resolvedTheme.accentColor,
                }}
              >
                {resolvedTheme.name}
              </span>
            </div>

            {/* Simulated Chat Window with Chosen Theme */}
            <div
              className={`relative rounded-2xl border border-zinc-250 dark:border-zinc-800 overflow-hidden shadow-inner min-h-[148px] p-3 flex flex-col justify-between transition-colors duration-200 ${resolvedTheme.bgClass}`}
              style={resolvedTheme.bgStyle}
            >
              {/* Mini Header */}
              <div className="relative z-10 flex items-center justify-between pb-2 border-b border-black/5 dark:border-white/5">
                <div className="flex items-center gap-2">
                  <Avatar
                    initials={recipientInitials}
                    name={recipientName}
                    gradient={recipientAvatarColor || 'from-emerald-700 to-teal-900'}
                    size="xs"
                    presence="here"
                  />
                  <div>
                    <span className="text-xs font-medium text-zinc-900 dark:text-zinc-100 block leading-tight">
                      {recipientName}
                    </span>
                    <span className="text-[10px] text-zinc-400 font-mono">Present</span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <span className="text-[9px] font-mono flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-black/5 dark:bg-white/5 text-zinc-500 dark:text-zinc-400">
                    <IconLock className="w-2.5 h-2.5 text-emerald-500" />
                    <span>E2EE</span>
                  </span>
                </div>
              </div>

              {/* Message Bubbles Showcase */}
              <div className="relative z-10 space-y-1.5 py-2">
                {/* Incoming Whisper (Receiver) */}
                <div className="flex justify-start">
                  <div
                    className={`w-fit max-w-[82%] rounded-lg px-2.5 py-1 border text-[11.5px] leading-snug transition-colors ${resolvedTheme.receiverBubbleClass}`}
                    style={resolvedTheme.receiverBubbleStyle}
                  >
                    <span>The silence here makes every thought clearer.</span>
                    <span
                      className={`inline-flex items-center ml-2 float-right text-[9px] font-mono translate-y-0.5 ${resolvedTheme.receiverMetaClass}`}
                    >
                      18:42
                    </span>
                    <div className="clear-both" />
                  </div>
                </div>

                {/* Outgoing Message (Sender) */}
                <div className="flex justify-end">
                  <div
                    className={`w-fit max-w-[82%] rounded-lg px-2.5 py-1 border text-[11.5px] leading-snug transition-colors ${resolvedTheme.senderBubbleClass}`}
                    style={resolvedTheme.senderBubbleStyle}
                  >
                    <span>Spaces with intentional calm endure longer.</span>
                    <span
                      className={`inline-flex items-center gap-1 ml-2 float-right text-[9px] font-mono translate-y-0.5 ${resolvedTheme.senderMetaClass}`}
                    >
                      <span>18:43</span>
                      <IconCheckDouble className="w-3 h-3 text-sky-400 dark:text-sky-400 drop-shadow-[0_0_3px_rgba(56,189,248,0.45)] inline" />
                    </span>
                    <div className="clear-both" />
                  </div>
                </div>
              </div>

              {/* Atmosphere Tagline */}
              <div className="relative z-10 pt-1 border-t border-black/5 dark:border-white/5 text-[10px] text-zinc-400 font-mono flex justify-between items-center">
                <span>{resolvedTheme.name} Palette</span>
                <span className="flex items-center gap-1">
                  <span
                    className="w-2 h-2 rounded-full inline-block"
                    style={{ backgroundColor: resolvedTheme.accentColor }}
                  />
                  <span>Per-Chat Setting</span>
                </span>
              </div>
            </div>
          </div>

          {/* Theme Selector Options List */}
          <div className="p-4 sm:p-5 overflow-y-auto space-y-3 flex-1">
            <span className="text-[10.5px] uppercase font-mono tracking-wider text-zinc-400 font-semibold block px-0.5">
              Available Themes
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {CHAT_THEME_LIST.map((theme) => {
                const isSelected = selectedThemeId === theme.id;
                const sampleTheme = resolveChatTheme({
                  themeId: theme.id,
                  customColor: theme.id === 'custom' ? customColor : undefined,
                });

                return (
                  <button
                    key={theme.id}
                    type="button"
                    onClick={() => handleApply(theme.id)}
                    className={`flex items-start gap-3 p-3 rounded-2xl border text-left transition-all cursor-pointer relative overflow-hidden group ${
                      isSelected
                        ? 'bg-zinc-950 text-zinc-50 dark:bg-zinc-100 dark:text-zinc-950 border-transparent shadow-md'
                        : 'bg-zinc-100/60 dark:bg-zinc-900/60 text-zinc-800 dark:text-zinc-200 border-zinc-200/80 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700'
                    }`}
                  >
                    {/* Visual Color Swatch Dot */}
                    <div className="flex flex-col items-center gap-1.5 shrink-0 pt-0.5">
                      <div
                        className="w-5 h-5 rounded-full border border-black/10 dark:border-white/10 shadow-xs flex items-center justify-center"
                        style={{
                          backgroundColor:
                            theme.id === 'custom' ? customColor : theme.accentColor,
                        }}
                      >
                        {isSelected && (
                          <IconCheck className="w-3 h-3 text-white drop-shadow-xs" />
                        )}
                      </div>
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1 mb-0.5">
                        <span className="text-xs font-semibold tracking-tight">
                          {theme.name}
                        </span>
                        {isSelected && (
                          <span className="text-[9px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded bg-white/20 dark:bg-black/15 font-medium">
                            Active
                          </span>
                        )}
                      </div>
                      <p
                        className={`text-[10px] leading-tight font-mono mb-1 truncate ${
                          isSelected
                            ? 'text-zinc-300 dark:text-zinc-600'
                            : 'text-zinc-500 dark:text-zinc-400'
                        }`}
                      >
                        {theme.tagline}
                      </p>
                      <p
                        className={`text-[10.5px] leading-snug line-clamp-2 ${
                          isSelected
                            ? 'text-zinc-400 dark:text-zinc-500'
                            : 'text-zinc-500 dark:text-zinc-400'
                        }`}
                      >
                        {theme.description}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Custom Accent Color Palette Section */}
            {selectedThemeId === 'custom' && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
                className="pt-2 pb-1 space-y-3"
              >
                <div className="p-3.5 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950/60 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 block">
                        Custom Accent Color
                      </span>
                      <span className="text-[10.5px] text-zinc-500 dark:text-zinc-400">
                        Pick a color or select from curated swatches
                      </span>
                    </div>

                    {/* Color Input and Hex */}
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={customColor}
                        onChange={(e) => handleCustomColorChange(e.target.value)}
                        className="w-8 h-8 rounded-lg border border-zinc-300 dark:border-zinc-700 cursor-pointer p-0.5 bg-white dark:bg-zinc-800"
                        title="Pick custom color"
                      />
                      <input
                        type="text"
                        value={customColor.toUpperCase()}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val.startsWith('#') && val.length <= 7) {
                            handleCustomColorChange(val);
                          } else if (!val.startsWith('#') && val.length <= 6) {
                            handleCustomColorChange(`#${val}`);
                          }
                        }}
                        className="w-20 px-2 py-1 text-xs font-mono rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 text-center uppercase"
                        placeholder="#8B5CF6"
                      />
                    </div>
                  </div>

                  {/* Swatch Quick Selector */}
                  <div className="space-y-1.5">
                    <span className="text-[10px] font-mono uppercase text-zinc-400">
                      Curated Swatches
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {CUSTOM_COLOR_PRESETS.map((preset) => (
                        <button
                          key={preset.hex}
                          type="button"
                          onClick={() => handleCustomColorChange(preset.hex)}
                          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-mono border transition-all cursor-pointer ${
                            customColor.toLowerCase() === preset.hex.toLowerCase()
                              ? 'border-zinc-900 dark:border-zinc-100 ring-2 ring-zinc-400 dark:ring-zinc-600 bg-zinc-200/60 dark:bg-zinc-800'
                              : 'border-zinc-200 dark:border-zinc-800 hover:border-zinc-400 dark:hover:border-zinc-600 bg-white dark:bg-zinc-900'
                          }`}
                        >
                          <span
                            className="w-2.5 h-2.5 rounded-full shrink-0"
                            style={{ backgroundColor: preset.hex }}
                          />
                          <span className="text-zinc-800 dark:text-zinc-200 text-[11px]">
                            {preset.name}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </div>

          {/* Modal Footer */}
          <div className="p-4 border-t border-zinc-150 dark:border-zinc-800 bg-zinc-50/60 dark:bg-zinc-900/60 flex items-center justify-between shrink-0">
            <button
              type="button"
              onClick={() => handleApply('default')}
              className="text-xs text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 transition-colors cursor-pointer px-2 py-1 rounded"
            >
              Reset to Default
            </button>

            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-zinc-950 text-white dark:bg-zinc-100 dark:text-zinc-950 text-xs font-semibold shadow-xs hover:opacity-90 active:scale-95 transition-all cursor-pointer"
            >
              Done
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
