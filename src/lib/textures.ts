import { ChatBackgroundTexture, ChatTextureConfig } from '../types';

export const CHAT_TEXTURES_STORAGE_KEY = 'among_chat_texture';
export const CHAT_TEXTURE_CHANGED_EVENT = 'among:texture-changed';
export const DEFAULT_CHAT_TEXTURE: ChatBackgroundTexture = 'washi';

export const CHAT_TEXTURE_CONFIGS: Record<ChatBackgroundTexture, ChatTextureConfig> = {
  washi: {
    id: 'washi',
    name: 'Japanese Washi',
    tagline: 'Tactile Paper Grain',
    description: 'Subtle micro-fibers evoking textured handmade stationery for a physical, warm feel.',
    overlayClass: 'opacity-[0.05] dark:opacity-[0.065] mix-blend-multiply dark:mix-blend-screen chat-texture-washi',
    previewClass: 'chat-texture-washi opacity-75 dark:opacity-60',
  },
  dotgrid: {
    id: 'dotgrid',
    name: 'Architectural Stipple',
    tagline: 'Calm Micro Dot Grid',
    description: 'Rhythmic, delicate 20px stipple points providing a grounded, structured writing space.',
    overlayClass: 'opacity-[0.14] dark:opacity-[0.20] text-zinc-700 dark:text-zinc-300 chat-texture-dotgrid',
    previewClass: 'chat-texture-dotgrid text-zinc-600 dark:text-zinc-400 opacity-80',
  },
  linen: {
    id: 'linen',
    name: 'Woven Linen',
    tagline: 'Fine Fabric Weave',
    description: 'Soft criss-cross tactile weave reminiscent of natural linen and quiet cloth.',
    overlayClass: 'opacity-[0.06] dark:opacity-[0.08] text-zinc-700 dark:text-zinc-300 chat-texture-linen',
    previewClass: 'chat-texture-linen text-zinc-600 dark:text-zinc-400 opacity-75',
  },
  graph: {
    id: 'graph',
    name: 'Minimal Blueprint',
    tagline: 'Quiet Drafting Grid',
    description: 'Soft 24px geometric graph lines for mindful, contemplative correspondence.',
    overlayClass: 'opacity-[0.07] dark:opacity-[0.10] text-zinc-700 dark:text-zinc-300 chat-texture-graph',
    previewClass: 'chat-texture-graph text-zinc-600 dark:text-zinc-400 opacity-75',
  },
  constellation: {
    id: 'constellation',
    name: 'Whisper Constellation',
    tagline: 'Quiet Stardust Points',
    description: 'Delicate scattered celestial coordinates for serene late-night whispers.',
    overlayClass: 'opacity-[0.18] dark:opacity-[0.25] text-zinc-700 dark:text-zinc-300 chat-texture-constellation',
    previewClass: 'chat-texture-constellation text-zinc-600 dark:text-zinc-400 opacity-85',
  },
  none: {
    id: 'none',
    name: 'Pure Canvas',
    tagline: 'Clean & Unadorned',
    description: 'Zero texture overlay. Smooth monochrome canvas for maximum minimalism.',
    overlayClass: 'hidden',
    previewClass: 'bg-zinc-50 dark:bg-zinc-900',
  },
};

export const CHAT_TEXTURE_LIST: ChatTextureConfig[] = [
  CHAT_TEXTURE_CONFIGS.washi,
  CHAT_TEXTURE_CONFIGS.dotgrid,
  CHAT_TEXTURE_CONFIGS.linen,
  CHAT_TEXTURE_CONFIGS.graph,
  CHAT_TEXTURE_CONFIGS.constellation,
  CHAT_TEXTURE_CONFIGS.none,
];

export function getSavedChatTexture(): ChatBackgroundTexture {
  try {
    const saved = localStorage.getItem(CHAT_TEXTURES_STORAGE_KEY) as ChatBackgroundTexture;
    if (saved && Object.keys(CHAT_TEXTURE_CONFIGS).includes(saved)) {
      return saved;
    }
  } catch {}
  return DEFAULT_CHAT_TEXTURE;
}

export function saveChatTexture(texture: ChatBackgroundTexture): void {
  try {
    localStorage.setItem(CHAT_TEXTURES_STORAGE_KEY, texture);
  } catch {}
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(CHAT_TEXTURE_CHANGED_EVENT, { detail: texture }));
  }
}
