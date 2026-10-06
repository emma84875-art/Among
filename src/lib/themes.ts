import { ChatThemeConfig, ChatThemeId, ChatThemeSetting } from '../types';

export const CHAT_THEME_STORAGE_KEY_PREFIX = 'among_chat_theme_';
export const DEFAULT_CHAT_THEME_STORAGE_KEY = 'among_default_chat_theme';
export const CHAT_THEME_CHANGED_EVENT = 'among:chat-theme-changed';

export const DEFAULT_THEME_SETTING: ChatThemeSetting = {
  themeId: 'default',
  customColor: '#8B5CF6', // Calm violet fallback for custom
};

export const CHAT_THEME_LIST: ChatThemeConfig[] = [
  {
    id: 'default',
    name: 'Default',
    tagline: 'Signature Calm Monochrome',
    description: 'Among’s original quiet contrast with crisp dark & light gray message bubbles.',
    accentColor: '#10B981',
  },
  {
    id: 'midnight',
    name: 'Midnight',
    tagline: 'Deep Obsidian & Indigo',
    description: 'Cosmic obsidian depths and celestial indigo for tranquil late-night conversations.',
    accentColor: '#6366F1',
  },
  {
    id: 'slate',
    name: 'Slate',
    tagline: 'Technical Graphite & Steel',
    description: 'Clean mineral tones, cool graphite, and steel cyan for clear contemplative focus.',
    accentColor: '#0EA5E9',
  },
  {
    id: 'ocean',
    name: 'Ocean',
    tagline: 'Marine Azure & Sea Glass',
    description: 'Serene maritime blues and sea-glass hues inspired by calm coastal fog.',
    accentColor: '#06B6D4',
  },
  {
    id: 'forest',
    name: 'Forest',
    tagline: 'Pine Needle & Sage Moss',
    description: 'Organic woodland canopy, pine needle, and soothing moss tones.',
    accentColor: '#10B981',
  },
  {
    id: 'rose',
    name: 'Rose',
    tagline: 'Cedar & Dusty Blush',
    description: 'Muted berry-taupe, warm cedarwood, and gentle blush for soft, warm dialogue.',
    accentColor: '#F43F5E',
  },
  {
    id: 'custom',
    name: 'Custom',
    tagline: 'Personalized Accent',
    description: 'Dynamic harmonious chat theme derived from any custom accent color.',
    accentColor: '#8B5CF6',
  },
];

export const CUSTOM_COLOR_PRESETS = [
  { name: 'Lavender', hex: '#8B5CF6' },
  { name: 'Indigo', hex: '#6366F1' },
  { name: 'Sky', hex: '#0284C7' },
  { name: 'Teal', hex: '#0D9488' },
  { name: 'Emerald', hex: '#059669' },
  { name: 'Amber', hex: '#D97706' },
  { name: 'Coral', hex: '#EA580C' },
  { name: 'Rose', hex: '#E11D48' },
];

/**
 * Utility functions to convert Hex to HSL for custom dynamic styling
 */
function hexToHsl(hex: string): { h: number; s: number; l: number } {
  let cleanHex = hex.replace('#', '');
  if (cleanHex.length === 3) {
    cleanHex = cleanHex.split('').map((c) => c + c).join('');
  }
  const num = parseInt(cleanHex, 16);
  if (isNaN(num)) return { h: 260, s: 80, l: 60 };

  const r = ((num >> 16) & 255) / 255;
  const g = ((num >> 8) & 255) / 255;
  const b = (num & 255) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      case b:
        h = (r - g) / d + 4;
        break;
    }
    h = Math.round(h * 60);
  }

  return { h, s: Math.round(s * 100), l: Math.round(l * 100) };
}

export interface ResolvedTheme {
  themeId: ChatThemeId;
  name: string;
  accentColor: string;
  bgClass: string;
  bgStyle?: React.CSSProperties;
  senderBubbleClass: string;
  senderBubbleStyle?: React.CSSProperties;
  receiverBubbleClass: string;
  receiverBubbleStyle?: React.CSSProperties;
  senderMetaClass: string;
  receiverMetaClass: string;
  inputBorderClass: string;
  sendButtonClass: string;
  sendButtonStyle?: React.CSSProperties;
  accentPillClass: string;
  typingBorderClass: string;
  typingBgClass: string;
  activeRingColor: string;
}

export function resolveChatTheme(setting: ChatThemeSetting): ResolvedTheme {
  const { themeId, customColor = '#8B5CF6' } = setting;

  switch (themeId) {
    case 'midnight':
      return {
        themeId: 'midnight',
        name: 'Midnight',
        accentColor: '#6366F1',
        bgClass: 'bg-[#eff2f9] dark:bg-[#0a0d16]',
        senderBubbleClass:
          'bg-[#1d243b] text-indigo-50 border-[#2d3758]/80 dark:bg-[#dbe2fd] dark:text-[#0a0f21] dark:border-[#b8c6fa]',
        receiverBubbleClass:
          'bg-[#e2e6f4] text-[#13192e] border-[#cdd4ec]/80 dark:bg-[#181d2e] dark:text-[#eaeffe] dark:border-[#27304b]/80',
        senderMetaClass: 'text-indigo-200/90 dark:text-[#37446e]',
        receiverMetaClass: 'text-[#4c587c] dark:text-[#96a4cc]',
        inputBorderClass: 'focus:border-indigo-400 dark:focus:border-indigo-400',
        sendButtonClass:
          'bg-[#1d243b] text-white hover:bg-[#283252] dark:bg-[#dbe2fd] dark:text-[#0a0f21] dark:hover:bg-white',
        accentPillClass:
          'bg-indigo-100 dark:bg-indigo-950/70 text-indigo-800 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800/60',
        typingBorderClass: 'border-indigo-200/80 dark:border-indigo-900/60',
        typingBgClass: 'bg-indigo-50/95 dark:bg-indigo-950/85',
        activeRingColor: 'rgba(99, 102, 241, 0.4)',
      };

    case 'slate':
      return {
        themeId: 'slate',
        name: 'Slate',
        accentColor: '#0EA5E9',
        bgClass: 'bg-[#f0f3f6] dark:bg-[#0c0f13]',
        senderBubbleClass:
          'bg-[#222a33] text-slate-50 border-[#333e4b]/80 dark:bg-[#dce3ea] dark:text-[#10161c] dark:border-[#c0ccd7]',
        receiverBubbleClass:
          'bg-[#e1e6ec] text-[#131920] border-[#ccd5de]/80 dark:bg-[#1a2129] dark:text-[#ecf1f6] dark:border-[#2a3642]/80',
        senderMetaClass: 'text-slate-300 dark:text-[#3c4c5a]',
        receiverMetaClass: 'text-[#475767] dark:text-[#8ea0b1]',
        inputBorderClass: 'focus:border-sky-500 dark:focus:border-sky-400',
        sendButtonClass:
          'bg-[#222a33] text-white hover:bg-[#2c3743] dark:bg-[#dce3ea] dark:text-[#10161c] dark:hover:bg-white',
        accentPillClass:
          'bg-slate-200/80 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border-slate-300 dark:border-slate-700',
        typingBorderClass: 'border-slate-300/80 dark:border-slate-800/80',
        typingBgClass: 'bg-slate-100/95 dark:bg-slate-900/90',
        activeRingColor: 'rgba(14, 165, 233, 0.4)',
      };

    case 'ocean':
      return {
        themeId: 'ocean',
        name: 'Ocean',
        accentColor: '#06B6D4',
        bgClass: 'bg-[#edf5f7] dark:bg-[#071216]',
        senderBubbleClass:
          'bg-[#132d36] text-cyan-50 border-[#1d4350]/80 dark:bg-[#cfedf5] dark:text-[#051c23] dark:border-[#a8dded]',
        receiverBubbleClass:
          'bg-[#dae8ed] text-[#0b2128] border-[#c0d6de]/80 dark:bg-[#11242b] dark:text-[#e2f5fb] dark:border-[#1c3843]/80',
        senderMetaClass: 'text-cyan-200/90 dark:text-[#184855]',
        receiverMetaClass: 'text-[#2d5563] dark:text-[#78adc0]',
        inputBorderClass: 'focus:border-cyan-500 dark:focus:border-cyan-400',
        sendButtonClass:
          'bg-[#132d36] text-white hover:bg-[#1a3d49] dark:bg-[#cfedf5] dark:text-[#051c23] dark:hover:bg-white',
        accentPillClass:
          'bg-cyan-100 dark:bg-cyan-950/70 text-cyan-800 dark:text-cyan-300 border-cyan-200 dark:border-cyan-800/60',
        typingBorderClass: 'border-cyan-200/80 dark:border-cyan-900/60',
        typingBgClass: 'bg-cyan-50/95 dark:bg-cyan-950/85',
        activeRingColor: 'rgba(6, 182, 212, 0.4)',
      };

    case 'forest':
      return {
        themeId: 'forest',
        name: 'Forest',
        accentColor: '#10B981',
        bgClass: 'bg-[#eef5f0] dark:bg-[#08130a]',
        senderBubbleClass:
          'bg-[#162e1c] text-emerald-50 border-[#23452b]/80 dark:bg-[#d3ebd7] dark:text-[#061e0b] dark:border-[#b0dcba]',
        receiverBubbleClass:
          'bg-[#dce9df] text-[#0d2312] border-[#c2d7c6]/80 dark:bg-[#122516] dark:text-[#e4f7e8] dark:border-[#1e3c25]/80',
        senderMetaClass: 'text-emerald-200/90 dark:text-[#214b28]',
        receiverMetaClass: 'text-[#335939] dark:text-[#7ba983]',
        inputBorderClass: 'focus:border-emerald-500 dark:focus:border-emerald-400',
        sendButtonClass:
          'bg-[#162e1c] text-white hover:bg-[#204028] dark:bg-[#d3ebd7] dark:text-[#061e0b] dark:hover:bg-white',
        accentPillClass:
          'bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/60',
        typingBorderClass: 'border-emerald-200/80 dark:border-emerald-900/60',
        typingBgClass: 'bg-emerald-50/95 dark:bg-emerald-950/85',
        activeRingColor: 'rgba(16, 185, 129, 0.4)',
      };

    case 'rose':
      return {
        themeId: 'rose',
        name: 'Rose',
        accentColor: '#F43F5E',
        bgClass: 'bg-[#faf0f2] dark:bg-[#140a0d]',
        senderBubbleClass:
          'bg-[#341b21] text-rose-50 border-[#4d2831]/80 dark:bg-[#f6d9df] dark:text-[#220d12] dark:border-[#ecc0cb]',
        receiverBubbleClass:
          'bg-[#f0dce0] text-[#291016] border-[#e2c4cb]/80 dark:bg-[#261318] dark:text-[#faedf0] dark:border-[#3e2027]/80',
        senderMetaClass: 'text-rose-200/90 dark:text-[#5a2a33]',
        receiverMetaClass: 'text-[#6c3943] dark:text-[#c48a97]',
        inputBorderClass: 'focus:border-rose-400 dark:focus:border-rose-400',
        sendButtonClass:
          'bg-[#341b21] text-white hover:bg-[#46242c] dark:bg-[#f6d9df] dark:text-[#220d12] dark:hover:bg-white',
        accentPillClass:
          'bg-rose-100 dark:bg-rose-950/70 text-rose-800 dark:text-rose-300 border-rose-200 dark:border-rose-800/60',
        typingBorderClass: 'border-rose-200/80 dark:border-rose-900/60',
        typingBgClass: 'bg-rose-50/95 dark:bg-rose-950/85',
        activeRingColor: 'rgba(244, 63, 94, 0.4)',
      };

    case 'custom': {
      const hsl = hexToHsl(customColor);
      // CSS custom properties mapped for both light and dark modes
      const isDarkEnv = typeof document !== 'undefined' && document.documentElement.classList.contains('dark');

      // Light mode computed colors:
      const lightBg = `hsl(${hsl.h}, ${Math.min(hsl.s * 0.35, 30)}%, 97%)`;
      const lightSenderBg = `hsl(${hsl.h}, ${Math.min(hsl.s * 0.45, 45)}%, 18%)`;
      const lightSenderBorder = `hsl(${hsl.h}, ${Math.min(hsl.s * 0.4, 40)}%, 28%)`;
      const lightReceiverBg = `hsl(${hsl.h}, ${Math.min(hsl.s * 0.3, 28)}%, 92%)`;
      const lightReceiverBorder = `hsl(${hsl.h}, ${Math.min(hsl.s * 0.35, 30)}%, 82%)`;

      // Dark mode computed colors:
      const darkBg = `hsl(${hsl.h}, ${Math.min(hsl.s * 0.3, 30)}%, 6.5%)`;
      const darkSenderBg = `hsl(${hsl.h}, ${Math.min(hsl.s * 0.4, 40)}%, 88%)`;
      const darkSenderBorder = `hsl(${hsl.h}, ${Math.min(hsl.s * 0.35, 35)}%, 76%)`;
      const darkReceiverBg = `hsl(${hsl.h}, ${Math.min(hsl.s * 0.3, 30)}%, 14%)`;
      const darkReceiverBorder = `hsl(${hsl.h}, ${Math.min(hsl.s * 0.35, 35)}%, 24%)`;

      const activeBg = isDarkEnv ? darkBg : lightBg;
      const activeSenderBg = isDarkEnv ? darkSenderBg : lightSenderBg;
      const activeSenderBorder = isDarkEnv ? darkSenderBorder : lightSenderBorder;
      const activeReceiverBg = isDarkEnv ? darkReceiverBg : lightReceiverBg;
      const activeReceiverBorder = isDarkEnv ? darkReceiverBorder : lightReceiverBorder;

      return {
        themeId: 'custom',
        name: 'Custom',
        accentColor: customColor,
        bgClass: 'transition-colors duration-200',
        bgStyle: { backgroundColor: activeBg },
        senderBubbleClass: isDarkEnv
          ? 'text-zinc-950 shadow-2xs'
          : 'text-zinc-50 shadow-2xs',
        senderBubbleStyle: {
          backgroundColor: activeSenderBg,
          borderColor: activeSenderBorder,
        },
        receiverBubbleClass: isDarkEnv
          ? 'text-zinc-50 shadow-2xs'
          : 'text-zinc-900 shadow-2xs',
        receiverBubbleStyle: {
          backgroundColor: activeReceiverBg,
          borderColor: activeReceiverBorder,
        },
        senderMetaClass: isDarkEnv ? 'text-zinc-700' : 'text-zinc-300',
        receiverMetaClass: isDarkEnv ? 'text-zinc-300' : 'text-zinc-600',
        inputBorderClass: 'focus:border-current',
        sendButtonClass: isDarkEnv
          ? 'text-zinc-950 font-semibold'
          : 'text-white font-semibold',
        sendButtonStyle: {
          backgroundColor: isDarkEnv ? darkSenderBg : lightSenderBg,
        },
        accentPillClass: 'border',
        typingBorderClass: isDarkEnv ? 'border-zinc-800' : 'border-zinc-200',
        typingBgClass: isDarkEnv ? 'bg-zinc-900/90' : 'bg-zinc-100/95',
        activeRingColor: `${customColor}66`,
      };
    }

    case 'default':
    default:
      return {
        themeId: 'default',
        name: 'Default',
        accentColor: '#10B981',
        bgClass: 'bg-[#faf9f6]/90 dark:bg-zinc-950',
        senderBubbleClass:
          'bg-[#2B2B2B] text-zinc-50 border-[#383838]/80 dark:bg-[#E5E5E5] dark:text-zinc-950 dark:border-[#D4D4D4]',
        receiverBubbleClass:
          'bg-[#E8E8E8] text-zinc-900 border-[#D8D8D8]/80 dark:bg-[#292929] dark:text-zinc-50 dark:border-[#383838]/80',
        senderMetaClass: 'text-zinc-300 dark:text-zinc-600',
        receiverMetaClass: 'text-zinc-600 dark:text-zinc-300',
        inputBorderClass: 'focus:border-zinc-500 dark:focus:border-zinc-400',
        sendButtonClass:
          'bg-zinc-950 text-zinc-50 dark:bg-zinc-100 dark:text-zinc-950 hover:opacity-90',
        accentPillClass:
          'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700',
        typingBorderClass: 'border-emerald-200/80 dark:border-emerald-900/50',
        typingBgClass: 'bg-emerald-50/95 dark:bg-emerald-950/85',
        activeRingColor: 'rgba(16, 185, 129, 0.4)',
      };
  }
}

/**
 * Gets conversation theme from localStorage, falling back to default theme
 */
export function getConversationTheme(threadId: string): ChatThemeSetting {
  try {
    const raw = localStorage.getItem(`${CHAT_THEME_STORAGE_KEY_PREFIX}${threadId}`);
    if (raw) {
      const parsed = JSON.parse(raw) as ChatThemeSetting;
      if (parsed && parsed.themeId) {
        return parsed;
      }
    }
    // Check if there is a global default fallback
    const globalDefault = localStorage.getItem(DEFAULT_CHAT_THEME_STORAGE_KEY);
    if (globalDefault) {
      const parsed = JSON.parse(globalDefault) as ChatThemeSetting;
      if (parsed && parsed.themeId) {
        return parsed;
      }
    }
  } catch {}
  return DEFAULT_THEME_SETTING;
}

/**
 * Saves conversation theme to localStorage and dispatches change event
 */
export function saveConversationTheme(threadId: string, setting: ChatThemeSetting): void {
  try {
    localStorage.setItem(
      `${CHAT_THEME_STORAGE_KEY_PREFIX}${threadId}`,
      JSON.stringify(setting)
    );
  } catch {}
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent(CHAT_THEME_CHANGED_EVENT, { detail: { threadId, setting } })
    );
  }
}

/**
 * Global default chat theme getter and setter
 */
export function getDefaultChatTheme(): ChatThemeSetting {
  try {
    const raw = localStorage.getItem(DEFAULT_CHAT_THEME_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as ChatThemeSetting;
      if (parsed && parsed.themeId) {
        return parsed;
      }
    }
  } catch {}
  return DEFAULT_THEME_SETTING;
}

export function saveDefaultChatTheme(setting: ChatThemeSetting): void {
  try {
    localStorage.setItem(DEFAULT_CHAT_THEME_STORAGE_KEY, JSON.stringify(setting));
  } catch {}
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent(CHAT_THEME_CHANGED_EVENT, { detail: { threadId: 'global', setting } })
    );
  }
}
