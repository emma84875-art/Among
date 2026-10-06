import React, { useState, useRef, useEffect, useMemo, FormEvent } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChatThread, PresenceStatus, DisappearingTimerOption } from '../../types';
import { Avatar } from '../ui/Avatar';
import { TypingIndicator } from '../common/TypingIndicator';
import { VoiceMessagePlayer } from '../common/VoiceMessagePlayer';
import {
  IconChevronLeft,
  IconChevronRight,
  IconMore,
  IconAttachment,
  IconSend,
  IconCheck,
  IconCheckDouble,
  IconSecurity,
  IconLock,
  IconKey,
  IconPhone,
  IconDownload,
  IconEdit,
  IconBlock,
  IconDelete,
  IconCopy,
  IconForward,
  IconPin,
  IconCamera,
  IconGallery,
  IconFiles,
  IconSparkles,
  IconMic,
  IconMicOff,
  IconPlay,
  IconPause,
  IconClose,
  IconEye,
  IconEyeOff,
  IconHourglass,
  IconTimer,
  IconLayers,
  IconPalette,
  IconBluetooth,
  IconWifi,
  IconCloud,
  IconCloudOff,
  IconHardDrive,
  IconRotateCcw,
  IconArchive,
  IconArchiveRestore,
  IconClock,
  IconAlert,
} from '../common/Icons';
import { PLACEHOLDER_PEOPLE } from '../../data/placeholder';
import { EncryptionVerificationModal } from '../modals/EncryptionVerificationModal';
import { EncryptedCallModal } from '../modals/EncryptedCallModal';
import {
  DisappearingTimerModal,
  DISAPPEARING_TIMER_CONFIGS,
} from '../modals/DisappearingTimerModal';
import { MessageInfoModal } from '../modals/MessageInfoModal';
import { MessageReceiptIndicator } from '../common/MessageReceiptIndicator';
import { MessageBubbleSkeleton } from '../ui/Skeleton';
import { ChatTextureModal } from '../modals/ChatTextureModal';
import { ChatThemeModal } from '../modals/ChatThemeModal';
import { CameraCaptureModal, CapturedPhotoData } from '../modals/CameraCaptureModal';
import { PhotoCryptoReceiptModal } from '../modals/PhotoCryptoReceiptModal';
import { MeshNetworkModal } from '../modals/MeshNetworkModal';
import { ChatBackgroundTexture, ChatThemeSetting } from '../../types';
import {
  CHAT_TEXTURE_CONFIGS,
  getSavedChatTexture,
  CHAT_TEXTURE_CHANGED_EVENT,
} from '../../lib/textures';
import {
  getConversationTheme,
  resolveChatTheme,
  CHAT_THEME_CHANGED_EVENT,
} from '../../lib/themes';
import {
  encryptPayload,
  decryptPayload,
  encryptPhotoMedia,
  encryptFileDocument,
  formatBytes,
  isContactVerified,
  EncryptedPayload,
} from '../../lib/e2ee';
import { networkManager, ConnectionState, sortMessagesStrict } from '../../lib/networking';
import {
  sendHybridMessage,
  useMeshNetwork,
  MESH_SYNC_COMPLETED_EVENT,
} from '../../lib/mesh';
import {
  toggleMessageReactionInFirestore,
  POPULAR_REACTION_EMOJIS,
  EXTENDED_REACTION_EMOJIS,
} from '../../lib/reactions';
import { auth, db, handleFirestoreError, OperationType } from '../../lib/firebase';
import { collection, onSnapshot } from 'firebase/firestore';

export interface MessageItem {
  id: string;
  sender: 'them' | 'you';
  text: string;
  timestamp: string;
  status?: 'sending' | 'sent' | 'delivered' | 'read' | 'failed';
  sequenceNumber?: number;
  createdAt?: number;
  retryCount?: number;
  error?: string;
  dateLabel?: string;
  type?: 'text' | 'audio' | 'photo' | 'file' | 'call';
  audioUrl?: string;
  audioDuration?: number;
  waveformData?: number[];
  imageUrl?: string;
  imageCaption?: string;
  fileName?: string;
  fileSize?: number;
  fileType?: string;
  fileDataUrl?: string;
  callDuration?: number;
  isPinned?: boolean;
  isEncrypted?: boolean;
  encryptedEnvelope?: EncryptedPayload;
  expiresAt?: number;
  timerDuration?: DisappearingTimerOption;
  isSystemNotice?: boolean;
  sentAt?: string;
  deliveredAt?: string;
  readAt?: string;
  transport?: 'internet' | 'bluetooth-le' | 'bluetooth-mesh' | 'wifi-direct' | 'offline-queued' | 'store-and-forward';
  meshHops?: number;
  relayCustodyNodes?: string[];
  meshStatus?: 'queued' | 'relaying' | 'delivered' | 'synced' | 'sent';
  syncedAt?: string;
  photoMetadata?: {
    source: 'camera' | 'library' | 'preset';
    exifStripped: boolean;
    sha256Digest?: string;
    encryptedAt: number;
    cipher: string;
    ivPreview: string;
    fileSizeBytes?: number;
  };
  reactions?: Record<string, string[]>; // Map of emoji -> user IDs
}

export interface SerenePhotoPreset {
  id: string;
  title: string;
  subtitle: string;
  url: string;
}

export const SERENE_PHOTO_PRESETS: SerenePhotoPreset[] = [
  {
    id: 'tea',
    title: 'Porcelain Morning Tea',
    subtitle: 'Warm steep in handmade stoneware',
    url: 'https://images.unsplash.com/photo-1544787219-7f47ccb76574?w=900&auto=format&fit=crop&q=80',
  },
  {
    id: 'desk',
    title: 'Sunlit Studio Workspace',
    subtitle: 'Natural oak grain & soft morning light',
    url: 'https://images.unsplash.com/photo-1513694203232-719a280e022f?w=900&auto=format&fit=crop&q=80',
  },
  {
    id: 'moss',
    title: 'Kyoto Zen Courtyard',
    subtitle: 'Weathered stone & mountain cedar',
    url: 'https://images.unsplash.com/photo-1503899036084-c55cdd92da26?w=900&auto=format&fit=crop&q=80',
  },
  {
    id: 'fog',
    title: 'Coastal Pine Mist',
    subtitle: 'Quiet dawn along the shoreline trail',
    url: 'https://images.unsplash.com/photo-1470240731273-7821a6eeb6bd?w=900&auto=format&fit=crop&q=80',
  },
];

interface ConversationScreenProps {
  thread: ChatThread;
  onBack: () => void;
  isArchived?: boolean;
  onToggleArchive?: (threadId: string) => void;
  onUpdateThreadLastMessage?: (updated: {
    text: string;
    timestamp: string;
    status?: 'sending' | 'sent' | 'delivered' | 'read' | 'failed';
    type?: 'text' | 'audio' | 'photo' | 'file' | 'call';
  }) => void;
  onReceiveMessage?: (reply: {
    sender: 'them';
    text: string;
    timestamp: string;
    type?: 'text' | 'audio' | 'photo' | 'file' | 'call';
  }) => void;
  onTypingChange?: (threadId: string, isTyping: boolean) => void;
}

// Rich mock conversation histories corresponding to existing placeholder chats
const MOCK_THREAD_HISTORIES: Record<string, MessageItem[]> = {
  // Evelyn Gray (Partner)
  'chat-1': [
    {
      id: 'm1-1',
      sender: 'them',
      text: 'Morning. Left the balcony doors open so you can hear the rain while reading.',
      timestamp: '08:14',
      dateLabel: 'Yesterday',
    },
    {
      id: 'm1-2',
      sender: 'you',
      text: 'Thank you. The quiet is wonderful today.',
      timestamp: '08:21',
      status: 'read',
      reactions: {
        '❤️': ['them'],
      },
    },
    {
      id: 'm1-3',
      sender: 'them',
      text: 'Heading to the market around noon. Want anything for dinner?',
      timestamp: '11:32',
      dateLabel: 'Today',
    },
    {
      id: 'm1-4',
      sender: 'you',
      text: 'Just sourdough and whatever fruit looks ripe.',
      timestamp: '11:45',
      status: 'read',
    },
    {
      id: 'm1-5',
      sender: 'them',
      text: 'Made fresh tea for when you step away from the desk.',
      timestamp: '14:24',
      isPinned: true,
      reactions: {
        '✨': ['you'],
        '❤️': ['them'],
      },
    },
    {
      id: 'm1-5-photo',
      sender: 'them',
      text: 'Photo: White peony tea',
      timestamp: '14:25',
      type: 'photo',
      imageUrl: 'https://images.unsplash.com/photo-1544787219-7f47ccb76574?w=900&auto=format&fit=crop&q=80',
      imageCaption: 'White peony harvest steeping in stoneware.',
      isEncrypted: true,
      reactions: {
        '🌿': ['you', 'them'],
      },
      photoMetadata: {
        source: 'camera',
        exifStripped: true,
        sha256Digest: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
        encryptedAt: Date.now() - 3600000,
        cipher: 'AES-256-GCM (128-bit MAC)',
        ivPreview: 'dGhpcy1pcy1hbi1pdi0xMg==',
      },
    },
    {
      id: 'm1-5-voice',
      sender: 'them',
      text: 'Voice note (0:04)',
      timestamp: '14:25',
      type: 'audio',
      audioDuration: 4,
      waveformData: [0.3, 0.5, 0.7, 0.9, 0.6, 0.4, 0.75, 0.85, 0.5, 0.35, 0.6, 0.8, 0.45, 0.3, 0.65, 0.8, 0.5, 0.25],
    },
    {
      id: 'm1-6',
      sender: 'you',
      text: 'Stepping away now. Meet you in the kitchen in five.',
      timestamp: '14:26',
      status: 'delivered',
    },
  ],

  // Julian Vance (Brother)
  'chat-2': [
    {
      id: 'm2-1',
      sender: 'them',
      text: 'Did you finish the wood finish on that walnut desk?',
      timestamp: '18:40',
      dateLabel: 'Yesterday',
    },
    {
      id: 'm2-2',
      sender: 'you',
      text: 'Done. Natural beeswax coat. Smells great.',
      timestamp: '19:02',
      status: 'read',
    },
    {
      id: 'm2-3',
      sender: 'them',
      text: 'Are we still doing the long ridge trail this weekend?',
      timestamp: '12:45',
      dateLabel: 'Today',
    },
    {
      id: 'm2-4',
      sender: 'you',
      text: 'Yes, trail opens at dawn. Let us do the loop route.',
      timestamp: '12:58',
      status: 'read',
    },
    {
      id: 'm2-5',
      sender: 'them',
      text: 'Perfect. I will pick you up around four.',
      timestamp: '13:05',
    },
    {
      id: 'm2-6',
      sender: 'you',
      text: 'See you this Sunday around four.',
      timestamp: '13:08',
      status: 'delivered',
    },
  ],

  // Maya Chen (Studio Collaborator)
  'chat-3': [
    {
      id: 'm3-1',
      sender: 'them',
      text: 'Reviewing the tactile print samples for the exhibition catalogue.',
      timestamp: '16:20',
      dateLabel: 'Yesterday',
    },
    {
      id: 'm3-2',
      sender: 'you',
      text: 'How is the heavy cotton stock holding the blind deboss?',
      timestamp: '16:45',
      status: 'read',
    },
    {
      id: 'm3-3',
      sender: 'them',
      text: 'Crisp edges, almost architectural depth. Sending scans soon.',
      timestamp: '10:15',
      dateLabel: 'Today',
    },
    {
      id: 'm3-4',
      sender: 'you',
      text: 'Looking forward to inspecting them in person.',
      timestamp: '10:28',
      status: 'read',
    },
    {
      id: 'm3-5',
      sender: 'them',
      text: 'The paper prototypes arrived from Kyoto. Texture is extraordinary.',
      timestamp: '11:42',
    },
  ],

  // Helena R. (Mother)
  'chat-4': [
    {
      id: 'm4-1',
      sender: 'them',
      text: 'The morning light over the roses reminded me of our old garden.',
      timestamp: '09:05',
      dateLabel: 'Sep 15',
    },
    {
      id: 'm4-2',
      sender: 'you',
      text: 'I remember that fragrance. Hope you had your tea outside.',
      timestamp: '09:40',
      status: 'read',
    },
    {
      id: 'm4-3',
      sender: 'them',
      text: 'Sending love. No need to reply quickly, just wanted to check in.',
      timestamp: 'Yesterday',
      dateLabel: 'Yesterday',
    },
    {
      id: 'm4-4',
      sender: 'you',
      text: 'Holding you close today. Will call over the weekend.',
      timestamp: '17:15',
      status: 'delivered',
    },
  ],

  // Marcus Bell (Childhood Friend)
  'chat-5': [
    {
      id: 'm5-1',
      sender: 'them',
      text: 'Heading out into the northern basin for a couple of days.',
      timestamp: '14:10',
      dateLabel: 'Sep 09',
    },
    {
      id: 'm5-2',
      sender: 'them',
      text: 'Phones will be powered off. Quiet miles ahead.',
      timestamp: '14:12',
    },
    {
      id: 'm5-3',
      sender: 'you',
      text: 'Safe travels through the pass, Marcus.',
      timestamp: '08:30',
      status: 'delivered',
      dateLabel: 'Sep 10',
    },
  ],
};

const PRESENCE_LABEL_MAP: Record<PresenceStatus, { text: string; dotClass: string }> = {
  here: { text: 'Present', dotClass: 'bg-emerald-500' },
  focus: { text: 'Focus', dotClass: 'bg-amber-500' },
  quiet: { text: 'Quiet', dotClass: 'bg-zinc-400' },
  walking: { text: 'Walking', dotClass: 'bg-sky-500' },
  offline: { text: 'Away', dotClass: 'bg-zinc-600' },
};

function getMockReplyForThread(threadId: string): string {
  switch (threadId) {
    case 'chat-1':
      return 'Taking a quiet breath before the next session. Your note arrived at the right moment.';
    case 'chat-2':
      return 'Sounds perfect. I will pack the trail kit and water canteen.';
    case 'chat-3':
      return 'The paper textures look even sharper in the studio daylight. Sending the scans shortly.';
    case 'chat-4':
      return 'So good to hear from you, my dear. Have a gentle and restful evening.';
    case 'chat-5':
      return 'Reaching the high ridge now. Quiet miles ahead—talk soon.';
    default:
      return 'Appreciate you reaching out. Hope you are enjoying a calm afternoon.';
  }
}

export function ConversationScreen({
  thread,
  onBack,
  isArchived = false,
  onToggleArchive,
  onUpdateThreadLastMessage,
  onReceiveMessage,
  onTypingChange,
}: ConversationScreenProps) {
  // Disappearing messages timer setting per individual chat (persisted in localStorage)
  const [disappearingTimer, setDisappearingTimer] = useState<DisappearingTimerOption>(() => {
    try {
      const saved = localStorage.getItem(`among_disappearing_timer_${thread.id}`) as DisappearingTimerOption;
      if (saved && ['off', '30s', '5m', '1h', '24h', '7d', '4w'].includes(saved)) {
        return saved;
      }
    } catch {}
    return thread.disappearingTimer || 'off';
  });

  const [isTimerModalOpen, setIsTimerModalOpen] = useState(false);
  const [isVerificationModalOpen, setIsVerificationModalOpen] = useState(false);
  const [isCallModalOpen, setIsCallModalOpen] = useState(false);
  const [currentTime, setCurrentTime] = useState<number>(Date.now());

  // Privacy-first Read Receipts toggle (persisted in localStorage)
  const [readReceiptsEnabled, setReadReceiptsEnabled] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('among_read_receipts');
      if (saved !== null) {
        return saved === 'true';
      }
    } catch {}
    return true; // Default to true
  });

  const [selectedInfoMessage, setSelectedInfoMessage] = useState<MessageItem | null>(null);

  // Subtle chat background texture state
  const [chatTexture, setChatTexture] = useState<ChatBackgroundTexture>(getSavedChatTexture);
  const [isTextureModalOpen, setIsTextureModalOpen] = useState(false);

  // Per-conversation theme setting state
  const [chatThemeSetting, setChatThemeSetting] = useState<ChatThemeSetting>(() =>
    getConversationTheme(thread.id)
  );
  const [isThemeModalOpen, setIsThemeModalOpen] = useState(false);

  // Re-fetch theme when thread changes
  useEffect(() => {
    setChatThemeSetting(getConversationTheme(thread.id));
  }, [thread.id]);

  // Listen for per-chat or global theme updates
  useEffect(() => {
    const handleThemeUpdate = (e: Event) => {
      const customEvent = e as CustomEvent<{ threadId: string; setting: ChatThemeSetting }>;
      if (
        customEvent.detail &&
        (customEvent.detail.threadId === thread.id || customEvent.detail.threadId === 'global')
      ) {
        setChatThemeSetting(getConversationTheme(thread.id));
      }
    };
    window.addEventListener(CHAT_THEME_CHANGED_EVENT, handleThemeUpdate);
    window.addEventListener('storage', handleThemeUpdate);
    return () => {
      window.removeEventListener(CHAT_THEME_CHANGED_EVENT, handleThemeUpdate);
      window.removeEventListener('storage', handleThemeUpdate);
    };
  }, [thread.id]);

  // Compute resolved theme with memoization
  const resolvedTheme = useMemo(
    () => resolveChatTheme(chatThemeSetting),
    [chatThemeSetting]
  );

  // Hybrid Communication & Mesh Connectivity
  const { meshState, syncQueuedMessages } = useMeshNetwork();
  const [isMeshModalOpen, setIsMeshModalOpen] = useState(false);
  const [isSyncingMesh, setIsSyncingMesh] = useState(false);

  // Sync listener: updates local messages when auto-sync or manual sync completes
  useEffect(() => {
    const handleSyncComplete = (e: Event) => {
      const customEvent = e as CustomEvent<{
        syncedMessagesCount: number;
        syncedPacketsCount: number;
        syncedMessageIds: string[];
        syncedChatIds: string[];
      }>;
      const detail = customEvent.detail;
      if (detail) {
        const now = new Date();
        const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
        setMessages((prev) =>
          prev.map((m) =>
            m.transport === 'offline-queued' || m.meshStatus === 'queued'
              ? {
                  ...m,
                  meshStatus: 'synced',
                  status: 'delivered',
                  syncedAt: timeStr,
                  deliveredAt: timeStr,
                }
              : m
          )
        );
      }
    };

    window.addEventListener(MESH_SYNC_COMPLETED_EVENT, handleSyncComplete);
    return () => {
      window.removeEventListener(MESH_SYNC_COMPLETED_EVENT, handleSyncComplete);
    };
  }, []);

  useEffect(() => {
    const handleTextureUpdate = (e: Event) => {
      const customEvent = e as CustomEvent<ChatBackgroundTexture>;
      if (customEvent.detail) {
        setChatTexture(customEvent.detail);
      } else {
        setChatTexture(getSavedChatTexture());
      }
    };
    window.addEventListener(CHAT_TEXTURE_CHANGED_EVENT, handleTextureUpdate);
    window.addEventListener('storage', handleTextureUpdate);
    return () => {
      window.removeEventListener(CHAT_TEXTURE_CHANGED_EVENT, handleTextureUpdate);
      window.removeEventListener('storage', handleTextureUpdate);
    };
  }, []);

  const handleToggleReadReceipts = () => {
    setReadReceiptsEnabled((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('among_read_receipts', String(next));
      } catch {}
      showToast(next ? 'Read receipts enabled' : 'Read receipts paused for privacy');
      return next;
    });
  };

  // Initialize messages with persisted localStorage, mock dialogue, or the thread's lastMessage
  const [messages, setMessages] = useState<MessageItem[]>(() => {
    try {
      const saved = localStorage.getItem(`among_thread_messages_${thread.id}`);
      if (saved) {
        const parsed: MessageItem[] = JSON.parse(saved);
        const now = Date.now();
        // Clean out any messages that expired while the user was away
        const active = parsed.filter((m) => !m.expiresAt || m.expiresAt > now);
        if (active.length > 0) return active;
      }
    } catch {}

    if (MOCK_THREAD_HISTORIES[thread.id]) {
      return [...MOCK_THREAD_HISTORIES[thread.id]];
    }
    return [
      {
        id: `init-${thread.lastMessage.id}`,
        sender: thread.lastMessage.sender,
        text: thread.lastMessage.text,
        timestamp: thread.lastMessage.timestamp,
        status:
          thread.lastMessage.sender === 'you'
            ? thread.lastMessage.status || 'delivered'
            : undefined,
        dateLabel: 'Today',
      },
    ];
  });

  // Decrypting / Loading messages state with tranquil skeleton transition
  const [isLoadingMessages, setIsLoadingMessages] = useState<boolean>(true);

  useEffect(() => {
    setIsLoadingMessages(true);
    const timer = setTimeout(() => {
      setIsLoadingMessages(false);
    }, 450);
    return () => clearTimeout(timer);
  }, [thread.id]);

  // Mark incoming messages as read when viewing conversation
  useEffect(() => {
    const unreadFromThem = messages.filter((m) => m.sender === 'them' && m.status !== 'read');
    if (unreadFromThem.length > 0) {
      const timer = setTimeout(() => {
        setMessages((prev) =>
          prev.map((m) => (m.sender === 'them' && m.status !== 'read' ? { ...m, status: 'read' } : m))
        );
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [messages.length]);

  // Persist messages to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(`among_thread_messages_${thread.id}`, JSON.stringify(messages));
    } catch {}
  }, [messages, thread.id]);

  // Periodic scrubber: automatically deletes messages when their expiration timer lapses
  useEffect(() => {
    const interval = window.setInterval(() => {
      const now = Date.now();
      setCurrentTime(now);

      setMessages((prev) => {
        const hasExpired = prev.some((m) => m.expiresAt && m.expiresAt <= now);
        if (!hasExpired) return prev;

        const remaining = prev.filter((m) => !m.expiresAt || m.expiresAt > now);

        if (onUpdateThreadLastMessage) {
          if (remaining.length > 0) {
            const last = remaining[remaining.length - 1];
            onUpdateThreadLastMessage({
              text: last.text,
              timestamp: last.timestamp,
              status: last.status || 'read',
              type: last.type,
            });
          } else {
            onUpdateThreadLastMessage({
              text: 'Messages dissolved quietly',
              timestamp: '',
              status: 'read',
            });
          }
        }

        return remaining;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [thread.id, onUpdateThreadLastMessage]);

  // -------------------------------------------------------------
  // Production-Grade Networking & Real-Time E2EE Socket Listeners
  // -------------------------------------------------------------
  useEffect(() => {
    // 1. Incoming Encrypted Message Listener
    const unsubMessage = networkManager.onMessage(async (msg) => {
      if (msg.chatId === thread.id) {
        let decryptedText = '[Encrypted Whisper]';
        let decryptedType = msg.envelope?.payloadType || 'text';
        let imageUrl: string | undefined;
        let audioUrl: string | undefined;
        let audioDuration: number | undefined;
        let waveformData: number[] | undefined;
        let fileName: string | undefined;
        let fileSize: number | undefined;
        let fileType: string | undefined;

        try {
          const decrypted = await decryptPayload(msg.envelope, thread.id, msg.senderId);
          decryptedText = decrypted.text || '';
          decryptedType = decrypted.type || decryptedType;
          imageUrl = decrypted.imageUrl;
          audioUrl = decrypted.audioUrl;
          audioDuration = decrypted.audioDuration;
          waveformData = decrypted.waveformData;
          fileName = decrypted.fileName;
          fileSize = decrypted.fileSize;
          fileType = decrypted.fileType;
        } catch (e) {
          console.warn('Authenticated decryption notice:', e);
        }

        const date = new Date(msg.createdAt || Date.now());
        const timeStr = `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;

        const incomingItem: MessageItem = {
          id: msg.id,
          sender: 'them',
          text: decryptedText,
          timestamp: timeStr,
          status: 'read',
          type: decryptedType,
          imageUrl,
          audioUrl,
          audioDuration,
          waveformData,
          fileName,
          fileSize,
          fileType,
          isEncrypted: true,
          encryptedEnvelope: msg.envelope,
          deliveredAt: timeStr,
          readAt: timeStr,
        };

        setMessages((prev) => {
          if (prev.some((m) => m.id === msg.id)) return prev;
          return [...prev, incomingItem];
        });

        // Acknowledge read immediately since user is actively viewing this conversation
        networkManager.sendAckRead(msg.id, thread.id, msg.senderId);

        onUpdateThreadLastMessage?.({
          text: decryptedText,
          timestamp: timeStr,
          status: 'read',
          type: decryptedType,
        });
      }
    });

    // 1b. Relay Transmission Acknowledgement Listener ('sending' -> 'sent')
    const unsubAckSent = networkManager.onAckSent(({ messageId, chatId, sequenceNumber }) => {
      if (chatId === thread.id) {
        const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        setMessages((prev) =>
          sortMessagesStrict(
            prev.map((m) =>
              m.id === messageId
                ? {
                    ...m,
                    status: (m.status === 'sending' || m.status === 'failed') ? 'sent' : m.status,
                    sequenceNumber: sequenceNumber || m.sequenceNumber,
                    sentAt: m.sentAt || timeStr,
                    meshStatus: m.meshStatus === 'queued' ? 'synced' : m.meshStatus,
                  }
                : m
            )
          )
        );
      }
    });

    // 1c. Connection State Reconnection Auto-Sync
    const unsubState = networkManager.onStateChange((state) => {
      if (state === 'connected') {
        networkManager.flushOfflineOutbox();
        networkManager.requestCatchUpSync();
      }
    });

    // 1d. Multi-tab and Storage Synchronization Listeners
    const handleGlobalMessageReceived = (e: Event) => {
      const detail = (e as CustomEvent<{ chatId: string; message: any }>).detail;
      if (detail && detail.chatId === thread.id && detail.message) {
        setMessages((prev) => {
          if (prev.some((m) => m.id === detail.message.id)) return prev;
          return sortMessagesStrict([...prev, detail.message]);
        });
      }
    };
    window.addEventListener('among_global_message_received', handleGlobalMessageReceived);

    const handleReceiptUpdated = (e: Event) => {
      const detail = (e as CustomEvent<{ messageId: string; chatId: string; status: 'delivered' | 'read' }>).detail;
      if (detail && detail.chatId === thread.id) {
        const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        setMessages((prev) =>
          prev.map((m) =>
            m.id === detail.messageId
              ? {
                  ...m,
                  status: detail.status,
                  ...(detail.status === 'delivered'
                    ? { deliveredAt: m.deliveredAt || timeStr }
                    : { readAt: timeStr, deliveredAt: m.deliveredAt || timeStr }),
                }
              : m
          )
        );
      }
    };
    window.addEventListener('among_receipt_updated', handleReceiptUpdated);

    const handleMessageFailed = (e: Event) => {
      const detail = (e as CustomEvent<{ messageId: string; chatId: string; error?: string }>).detail;
      if (detail && detail.chatId === thread.id) {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === detail.messageId
              ? { ...m, status: 'failed', error: detail.error || 'Delivery paused' }
              : m
          )
        );
      }
    };
    window.addEventListener('among_message_failed', handleMessageFailed);

    const handleOutboxFlushed = () => {
      try {
        const saved = localStorage.getItem(`among_thread_messages_${thread.id}`);
        if (saved) {
          setMessages(sortMessagesStrict(JSON.parse(saved)));
        }
      } catch {}
    };
    window.addEventListener('among_outbox_flushed', handleOutboxFlushed);
    window.addEventListener('among_storage_synced', handleOutboxFlushed);

    // 2. Delivery Receipt Listener ('delivered' -> double check)
    const unsubDelivered = networkManager.onAckDelivered(({ messageId, chatId }) => {
      if (chatId === thread.id) {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === messageId && m.status === 'sent'
              ? {
                  ...m,
                  status: 'delivered',
                  deliveredAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                }
              : m
          )
        );
      }
    });

    // 3. Read Receipt Listener ('read' -> blue double check)
    const unsubRead = networkManager.onAckRead(({ messageId, chatId }) => {
      if (chatId === thread.id) {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === messageId
              ? {
                  ...m,
                  status: 'read',
                  readAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                }
              : m
          )
        );
      }
    });

    // 4. Live Peer Typing Indicator with safety auto-expiration
    let peerTypingAutoClearTimer: ReturnType<typeof setTimeout> | null = null;
    const unsubTyping = networkManager.onTyping(({ chatId, senderId, isTyping: typing }) => {
      if (chatId === thread.id || senderId === thread.person.id) {
        setIsTyping(typing);
        onTypingChange?.(thread.id, typing);
        if (peerTypingAutoClearTimer) {
          clearTimeout(peerTypingAutoClearTimer);
          peerTypingAutoClearTimer = null;
        }
        if (typing) {
          // Safety timeout: automatically reset if no typing:stop packet received in 6.5s
          peerTypingAutoClearTimer = setTimeout(() => {
            setIsTyping(false);
            onTypingChange?.(thread.id, false);
          }, 6500);
        }
      }
    });

    // 5. Live Real-Time Reaction Updates
    const unsubReactions = networkManager.onReactionUpdated(({ messageId, chatId, reactions: updatedRx }) => {
      if (chatId === thread.id) {
        setMessages((prev) =>
          prev.map((m) => (m.id === messageId ? { ...m, reactions: updatedRx } : m))
        );
      }
    });

    return () => {
      unsubMessage();
      unsubAckSent();
      unsubDelivered();
      unsubRead();
      unsubTyping();
      unsubReactions();
      unsubState();
      window.removeEventListener('among_global_message_received', handleGlobalMessageReceived);
      window.removeEventListener('among_receipt_updated', handleReceiptUpdated);
      window.removeEventListener('among_message_failed', handleMessageFailed);
      window.removeEventListener('among_outbox_flushed', handleOutboxFlushed);
      window.removeEventListener('among_storage_synced', handleOutboxFlushed);
      if (peerTypingAutoClearTimer) {
        clearTimeout(peerTypingAutoClearTimer);
      }
    };
  }, [thread.id, onUpdateThreadLastMessage]);

  // Helper to format remaining time before dissolution
  const formatRemainingTime = (expiresAt: number) => {
    const diffMs = Math.max(0, expiresAt - currentTime);
    const totalSeconds = Math.ceil(diffMs / 1000);
    if (totalSeconds <= 0) return 'dissolving';
    if (totalSeconds < 60) return `${totalSeconds}s`;
    const totalMinutes = Math.floor(totalSeconds / 60);
    if (totalMinutes < 60) return `${totalMinutes}m`;
    const totalHours = Math.floor(totalMinutes / 60);
    if (totalHours < 24) return `${totalHours}h`;
    const totalDays = Math.floor(totalHours / 24);
    return `${totalDays}d`;
  };

  // Helper to attach expiration timestamps to new whispers
  const getTimerPropsForNewMessage = (): { expiresAt?: number; timerDuration?: DisappearingTimerOption } => {
    if (disappearingTimer === 'off') return {};
    const cfg = DISAPPEARING_TIMER_CONFIGS.find((c) => c.option === disappearingTimer);
    const durationMs = (cfg?.durationSeconds || 86400) * 1000;
    return {
      expiresAt: Date.now() + durationMs,
      timerDuration: disappearingTimer,
    };
  };

  const currentTimerConfig =
    DISAPPEARING_TIMER_CONFIGS.find((c) => c.option === disappearingTimer) ||
    DISAPPEARING_TIMER_CONFIGS[0];

  const handleSaveTimerOption = (newOption: DisappearingTimerOption) => {
    setDisappearingTimer(newOption);
    try {
      localStorage.setItem(`among_disappearing_timer_${thread.id}`, newOption);
    } catch {}

    const cfg = DISAPPEARING_TIMER_CONFIGS.find((c) => c.option === newOption);
    const now = new Date();
    const hours = now.getHours().toString().padStart(2, '0');
    const minutes = now.getMinutes().toString().padStart(2, '0');
    const timeStr = `${hours}:${minutes}`;

    const noticeText =
      newOption === 'off'
        ? 'Disappearing messages turned off for this chat.'
        : `Disappearing messages set to ${cfg?.label || newOption}. New whispers will auto-delete.`;

    const noticeMsg: MessageItem = {
      id: `notice-${Date.now()}`,
      sender: 'you',
      text: noticeText,
      timestamp: timeStr,
      isSystemNotice: true,
    };

    setMessages((prev) => [...prev, noticeMsg]);
    showToast(newOption === 'off' ? 'Disappearing messages turned off' : `Timer set to ${cfg?.label || newOption}`);
  };

  const handleScrubHistoryNow = () => {
    setMessages([]);
    try {
      localStorage.removeItem(`among_thread_messages_${thread.id}`);
    } catch {}
    onUpdateThreadLastMessage?.({
      text: 'Messages scrubbed',
      timestamp: '',
      status: 'read',
    });
    showToast('All messages in conversation scrubbed');
  };

  const [draftMessage, setDraftMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [showOptions, setShowOptions] = useState(false);
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  // Real-time outgoing typing debounce & state refs
  const localTypingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isLocallyTypingRef = useRef<boolean>(false);

  const handleDraftChange = (newText: string) => {
    setDraftMessage(newText);

    if (newText.trim().length > 0) {
      if (!isLocallyTypingRef.current) {
        isLocallyTypingRef.current = true;
        networkManager.sendTypingStatus(thread.id, thread.person.id, true);
      }
      if (localTypingTimerRef.current) {
        clearTimeout(localTypingTimerRef.current);
      }
      localTypingTimerRef.current = setTimeout(() => {
        if (isLocallyTypingRef.current) {
          isLocallyTypingRef.current = false;
          networkManager.sendTypingStatus(thread.id, thread.person.id, false);
        }
      }, 2500);
    } else {
      if (isLocallyTypingRef.current) {
        isLocallyTypingRef.current = false;
        networkManager.sendTypingStatus(thread.id, thread.person.id, false);
      }
      if (localTypingTimerRef.current) {
        clearTimeout(localTypingTimerRef.current);
        localTypingTimerRef.current = null;
      }
    }
  };

  // Clean up outgoing typing status when unmounting or switching threads
  useEffect(() => {
    return () => {
      if (localTypingTimerRef.current) {
        clearTimeout(localTypingTimerRef.current);
      }
      if (isLocallyTypingRef.current) {
        networkManager.sendTypingStatus(thread.id, thread.person.id, false);
        isLocallyTypingRef.current = false;
      }
    };
  }, [thread.id, thread.person.id]);

  // Photo attachment and camera capture state
  const [stagedPhoto, setStagedPhoto] = useState<{
    url: string;
    caption?: string;
    name?: string;
  } | null>(null);
  const [showPhotoPicker, setShowPhotoPicker] = useState(false);
  const [isCameraModalOpen, setIsCameraModalOpen] = useState(false);
  const [selectedLightboxPhoto, setSelectedLightboxPhoto] = useState<{
    url: string;
    caption?: string;
    timestamp?: string;
    message?: MessageItem;
  } | null>(null);
  const [selectedPhotoCrypto, setSelectedPhotoCrypto] = useState<MessageItem | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Audio recording & Voice Preview state
  const [recordingState, setRecordingState] = useState<'idle' | 'recording' | 'paused'>('idle');
  const isRecording = recordingState !== 'idle';
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [liveWaveform, setLiveWaveform] = useState<number[]>([0.2, 0.4, 0.3, 0.5, 0.2, 0.6, 0.4, 0.3]);
  const [previewAudioUrl, setPreviewAudioUrl] = useState<string | null>(null);
  const [isPreviewPlaying, setIsPreviewPlaying] = useState(false);
  const [previewPlaybackTime, setPreviewPlaybackTime] = useState(0);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<number | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const previewAudioInstanceRef = useRef<HTMLAudioElement | null>(null);
  const previewTimerRef = useRef<number | null>(null);

  const handleLaunchCamera = () => {
    setIsCameraModalOpen(true);
    setShowPhotoPicker(false);
    setShowAttachMenu(false);
  };

  const handleSendEncryptedPhoto = async (data: CapturedPhotoData) => {
    const now = new Date();
    const hours = now.getHours().toString().padStart(2, '0');
    const minutes = now.getMinutes().toString().padStart(2, '0');
    const timeStr = `${hours}:${minutes}`;

    const newMsgId = `photo-${Date.now()}`;
    const caption = data.caption || '';
    const sequenceNumber = messages.length + 1;

    // Encrypt client-side using authenticated AES-256-GCM
    const encryptedResult = await encryptPhotoMedia(data.dataUrl, caption, thread.id, thread.person.id);

    // Reliable production WebSocket transmit (with automatic offline outbox queuing)
    const netResult = await networkManager.sendEncryptedMessage(
      newMsgId,
      thread.id,
      thread.person.id,
      encryptedResult.envelope,
      sequenceNumber
    );

    // Hybrid Transport Dispatch
    const hybridResult = await sendHybridMessage({
      chatId: thread.id,
      recipientId: thread.person.id,
      recipientName: thread.person.name,
      recipientUsername: thread.person.phoneOrHandle?.replace('@', ''),
      text: caption ? `Photo: ${caption}` : 'Photo',
      encryptedEnvelope: encryptedResult.envelope,
      type: 'photo',
    });

    const initialStatus: 'sent' | 'sending' = (netResult?.status === 'sent' && hybridResult.status !== 'queued') ? 'sent' : 'sending';

    // Compute expiration if disappearing timer is set
    let timerProps: { expiresAt?: number; timerDuration?: DisappearingTimerOption } = {};
    if (data.timerOption && data.timerOption !== 'off') {
      const cfg = DISAPPEARING_TIMER_CONFIGS.find((c) => c.option === data.timerOption);
      const durationMs = (cfg?.durationSeconds || 86400) * 1000;
      timerProps = {
        expiresAt: Date.now() + durationMs,
        timerDuration: data.timerOption,
      };
    } else {
      timerProps = getTimerPropsForNewMessage();
    }

    const newPhotoMsg: MessageItem = {
      id: newMsgId,
      sender: 'you',
      text: caption ? `Photo: ${caption}` : 'Photo',
      timestamp: timeStr,
      status: initialStatus,
      sentAt: initialStatus === 'sent' ? timeStr : undefined,
      sequenceNumber,
      createdAt: Date.now(),
      type: 'photo',
      imageUrl: data.dataUrl,
      imageCaption: caption || undefined,
      isEncrypted: true,
      encryptedEnvelope: encryptedResult.envelope,
      transport: hybridResult.transport,
      meshHops: hybridResult.hops,
      relayCustodyNodes: hybridResult.custodyChain,
      meshStatus: hybridResult.status,
      photoMetadata: {
        source: data.source,
        exifStripped: data.stripExif,
        sha256Digest: encryptedResult.sha256Digest,
        encryptedAt: Date.now(),
        cipher: encryptedResult.cipher,
        ivPreview: encryptedResult.ivPreview,
        fileSizeBytes: data.fileSizeBytes,
      },
      ...timerProps,
    };

    setMessages((prev) => sortMessagesStrict([...prev, newPhotoMsg]));
    setStagedPhoto(null);
    setDraftMessage('');
    setShowPhotoPicker(false);
    setShowAttachMenu(false);

    if (hybridResult.status === 'queued') {
      showToast('Offline: Photo queued in store-and-forward buffer.');
    } else if (hybridResult.status === 'relaying') {
      showToast(`Photo relayed via BLE mesh (${hybridResult.hops} hops).`);
    } else {
      showToast(data.stripExif ? 'Photo encrypted & EXIF scrubbed' : 'Photo encrypted with AES-256-GCM');
    }

    onUpdateThreadLastMessage?.({
      text: caption ? `Photo: ${caption}` : 'Photo',
      timestamp: timeStr,
      status: initialStatus,
      type: 'photo',
    });

    if (initialStatus === 'sending' || hybridResult.status === 'queued') {
      return;
    }

    // Progression of delivery receipts:
    setTimeout(() => {
      const delTime = new Date();
      const delTimeStr = `${delTime.getHours().toString().padStart(2, '0')}:${delTime.getMinutes().toString().padStart(2, '0')}`;
      setMessages((prev) =>
        prev.map((m) => (m.id === newMsgId ? { ...m, status: 'delivered', deliveredAt: delTimeStr } : m))
      );
      onUpdateThreadLastMessage?.({
        text: caption ? `Photo: ${caption}` : 'Photo',
        timestamp: timeStr,
        status: 'delivered',
        type: 'photo',
      });
    }, 600);

    if (thread.person.presence === 'here' || thread.person.presence === 'focus') {
      setTimeout(() => {
        if (readReceiptsEnabled) {
          const readTime = new Date();
          const readTimeStr = `${readTime.getHours().toString().padStart(2, '0')}:${readTime.getMinutes().toString().padStart(2, '0')}`;
          setMessages((prev) =>
            prev.map((m) => (m.id === newMsgId ? { ...m, status: 'read', readAt: readTimeStr } : m))
          );
          onUpdateThreadLastMessage?.({
            text: caption ? `Photo: ${caption}` : 'Photo',
            timestamp: timeStr,
            status: 'read',
            type: 'photo',
          });
        }
      }, 1600);

      // Contact reacts thoughtfully to the shared photo
      setTimeout(() => {
        setIsTyping(true);
        onTypingChange?.(thread.id, true);

        setTimeout(() => {
          setIsTyping(false);
          onTypingChange?.(thread.id, false);

          const rNow = new Date();
          const rHours = rNow.getHours().toString().padStart(2, '0');
          const rMinutes = rNow.getMinutes().toString().padStart(2, '0');
          const rTimeStr = `${rHours}:${rMinutes}`;

          const photoReplies = [
            'What a peaceful perspective. Thank you for sharing.',
            'Such gentle light in this photo. Saved it.',
            'Quiet and grounding. Love this view.',
            'This brings such a calm feeling to my day.',
          ];
          const chosenReply = photoReplies[Math.floor(Math.random() * photoReplies.length)];

          const replyMsg: MessageItem = {
            id: `reply-photo-${Date.now()}`,
            sender: 'them',
            text: chosenReply,
            timestamp: rTimeStr,
            ...getTimerPropsForNewMessage(),
          };

          setMessages((prev) => [...prev, replyMsg]);
          onReceiveMessage?.({
            sender: 'them',
            text: chosenReply,
            timestamp: rTimeStr,
          });
          onUpdateThreadLastMessage?.({
            text: chosenReply,
            timestamp: rTimeStr,
            status: 'delivered',
          });
        }, 2400);
      }, 2200);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          setStagedPhoto({
            url: reader.result,
            name: file.name,
          });
          setShowPhotoPicker(false);
          setShowAttachMenu(false);
          inputRef.current?.focus();
        }
      };
      reader.readAsDataURL(file);
    }
    e.target.value = '';
  };

  const stopPreviewAudio = () => {
    if (previewAudioInstanceRef.current) {
      try {
        previewAudioInstanceRef.current.pause();
        previewAudioInstanceRef.current.currentTime = 0;
      } catch {}
      previewAudioInstanceRef.current = null;
    }
    if (previewTimerRef.current) {
      clearInterval(previewTimerRef.current);
      previewTimerRef.current = null;
    }
    setIsPreviewPlaying(false);
    setPreviewPlaybackTime(0);
  };

  const stopRecordingCleanup = () => {
    stopPreviewAudio();
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      clearInterval(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.stop();
      } catch {}
      mediaRecorderRef.current = null;
    }
    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach((track) => track.stop());
      micStreamRef.current = null;
    }
    if (audioContextRef.current) {
      try {
        audioContextRef.current.close();
      } catch {}
      audioContextRef.current = null;
    }
    analyserRef.current = null;
  };

  useEffect(() => {
    return () => {
      stopRecordingCleanup();
    };
  }, []);

  const simulateLiveWaveforms = () => {
    let tick = 0;
    const interval = window.setInterval(() => {
      tick++;
      setLiveWaveform([
        0.2 + Math.abs(Math.sin(tick * 0.4)) * 0.6,
        0.3 + Math.abs(Math.cos(tick * 0.5)) * 0.7,
        0.15 + Math.abs(Math.sin(tick * 0.3 + 1)) * 0.5,
        0.25 + Math.abs(Math.cos(tick * 0.6 + 2)) * 0.75,
        0.35 + Math.abs(Math.sin(tick * 0.4 + 3)) * 0.65,
        0.2 + Math.abs(Math.cos(tick * 0.7 + 1)) * 0.8,
        0.3 + Math.abs(Math.sin(tick * 0.5 + 2)) * 0.6,
        0.25 + Math.abs(Math.cos(tick * 0.3 + 4)) * 0.5,
      ]);
    }, 150);
    animFrameRef.current = interval;
  };

  const startRecording = async () => {
    stopPreviewAudio();
    setRecordingState('recording');
    setRecordingSeconds(0);
    audioChunksRef.current = [];
    setPreviewAudioUrl(null);

    // Start timer ticker
    const startTime = Date.now();
    recordingTimerRef.current = window.setInterval(() => {
      setRecordingSeconds(Math.floor((Date.now() - startTime) / 1000));
    }, 500);

    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        micStreamRef.current = stream;

        const recorder = new MediaRecorder(stream);
        mediaRecorderRef.current = recorder;

        recorder.ondataavailable = (e) => {
          if (e.data.size > 0) {
            audioChunksRef.current.push(e.data);
          }
        };

        recorder.start(100);

        // Web Audio Analyser for live frequency levels
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioCtx) {
          const audioCtx = new AudioCtx();
          audioContextRef.current = audioCtx;
          const source = audioCtx.createMediaStreamSource(stream);
          const analyser = audioCtx.createAnalyser();
          analyser.fftSize = 32;
          source.connect(analyser);
          analyserRef.current = analyser;

          const dataArray = new Uint8Array(analyser.frequencyBinCount);
          const updateWave = () => {
            if (!analyserRef.current) return;
            analyserRef.current.getByteFrequencyData(dataArray);
            const levels = Array.from(dataArray.slice(0, 8)).map(
              (val) => Math.max(0.15, val / 255)
            );
            setLiveWaveform(levels);
            animFrameRef.current = requestAnimationFrame(updateWave);
          };
          updateWave();
        }
      } else {
        simulateLiveWaveforms();
      }
    } catch {
      simulateLiveWaveforms();
    }
  };

  const pauseRecording = () => {
    // Stop recording timer
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
    // Stop waveform animation
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      clearInterval(animFrameRef.current);
      animFrameRef.current = null;
    }
    // Flush & pause recorder if active
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      try {
        mediaRecorderRef.current.requestData();
        mediaRecorderRef.current.pause();
      } catch {}
    }

    // Compile preview blob from recorded chunks
    if (audioChunksRef.current.length > 0) {
      try {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const url = URL.createObjectURL(blob);
        setPreviewAudioUrl(url);
      } catch {}
    }

    setRecordingState('paused');
    setIsPreviewPlaying(false);
    setPreviewPlaybackTime(0);
  };

  const startSimulatedPreviewPlayback = (totalSec: number) => {
    if (previewTimerRef.current) clearInterval(previewTimerRef.current);
    const startOffset = previewPlaybackTime >= totalSec ? 0 : previewPlaybackTime;
    const startTime = Date.now() - startOffset * 1000;
    previewTimerRef.current = window.setInterval(() => {
      const elapsed = (Date.now() - startTime) / 1000;
      if (elapsed >= totalSec) {
        setIsPreviewPlaying(false);
        setPreviewPlaybackTime(0);
        if (previewTimerRef.current) {
          clearInterval(previewTimerRef.current);
          previewTimerRef.current = null;
        }
      } else {
        setPreviewPlaybackTime(elapsed);
      }
    }, 100);
  };

  const togglePlayPreview = () => {
    const totalSec = Math.max(recordingSeconds, 1);
    if (isPreviewPlaying) {
      if (previewAudioInstanceRef.current) {
        try {
          previewAudioInstanceRef.current.pause();
        } catch {}
      }
      if (previewTimerRef.current) {
        clearInterval(previewTimerRef.current);
        previewTimerRef.current = null;
      }
      setIsPreviewPlaying(false);
    } else {
      setIsPreviewPlaying(true);
      if (previewAudioUrl) {
        try {
          if (!previewAudioInstanceRef.current) {
            const audio = new Audio(previewAudioUrl);
            previewAudioInstanceRef.current = audio;
            audio.ontimeupdate = () => {
              setPreviewPlaybackTime(Math.min(audio.currentTime, totalSec));
            };
            audio.onended = () => {
              setIsPreviewPlaying(false);
              setPreviewPlaybackTime(0);
            };
            audio.onerror = () => {
              startSimulatedPreviewPlayback(totalSec);
            };
          }
          previewAudioInstanceRef.current.currentTime =
            previewPlaybackTime >= totalSec ? 0 : previewPlaybackTime;
          previewAudioInstanceRef.current.play().catch(() => {
            startSimulatedPreviewPlayback(totalSec);
          });
        } catch {
          startSimulatedPreviewPlayback(totalSec);
        }
      } else {
        startSimulatedPreviewPlayback(totalSec);
      }
    }
  };

  const resumeRecording = async () => {
    stopPreviewAudio();
    setRecordingState('recording');

    // Resume timer ticker offset by previously recorded duration
    const resumeAnchor = Date.now() - recordingSeconds * 1000;
    recordingTimerRef.current = window.setInterval(() => {
      setRecordingSeconds(Math.floor((Date.now() - resumeAnchor) / 1000));
    }, 500);

    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'paused') {
      try {
        mediaRecorderRef.current.resume();
      } catch {}
    }
    simulateLiveWaveforms();
  };

  const reRecordVoice = () => {
    cancelRecording();
    setTimeout(() => {
      startRecording();
    }, 80);
  };

  const handleSeekPreview = (ratio: number) => {
    const target = ratio * Math.max(recordingSeconds, 1);
    setPreviewPlaybackTime(target);
    if (previewAudioInstanceRef.current) {
      try {
        previewAudioInstanceRef.current.currentTime = target;
      } catch {}
    }
  };

  const cancelRecording = () => {
    stopPreviewAudio();
    stopRecordingCleanup();
    setRecordingState('idle');
    setRecordingSeconds(0);
    setPreviewAudioUrl(null);
  };

  const sendVoiceRecording = async () => {
    stopPreviewAudio();
    const duration = Math.max(recordingSeconds, 1);

    let recordedBlobUrl: string | undefined = previewAudioUrl || undefined;
    if (!recordedBlobUrl && audioChunksRef.current.length > 0) {
      try {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        recordedBlobUrl = URL.createObjectURL(blob);
      } catch {}
    }

    stopRecordingCleanup();
    setRecordingState('idle');
    setRecordingSeconds(0);
    setPreviewAudioUrl(null);

    const savedWaveform = Array.from({ length: 22 }, () =>
      Number((0.2 + Math.random() * 0.75).toFixed(2))
    );

    const now = new Date();
    const hours = now.getHours().toString().padStart(2, '0');
    const minutes = now.getMinutes().toString().padStart(2, '0');
    const timeStr = `${hours}:${minutes}`;

    const newMsgId = `voice-${Date.now()}`;
    const sequenceNumber = messages.length + 1;

    let encryptedEnvelope: EncryptedPayload | undefined;
    let netResult: { success: boolean; sequenceNumber: number; queuedOffline: boolean; status: 'sending' | 'sent' | 'failed' } | undefined;
    try {
      encryptedEnvelope = await encryptPayload(
        {
          type: 'audio',
          audioUrl: recordedBlobUrl,
          audioDuration: duration,
          waveformData: savedWaveform,
          text: `Voice note (${duration}s)`,
        },
        thread.id,
        thread.person.id,
        sequenceNumber
      );
      netResult = await networkManager.sendEncryptedMessage(
        newMsgId,
        thread.id,
        thread.person.id,
        encryptedEnvelope,
        sequenceNumber
      );
    } catch (e) {
      console.warn('Voice encryption/network dispatch notice:', e);
    }

    const initialStatus: 'sent' | 'sending' = netResult?.status === 'sent' ? 'sent' : 'sending';

    const newVoiceMsg: MessageItem = {
      id: newMsgId,
      sender: 'you',
      text: `Voice note (${duration}s)`,
      timestamp: timeStr,
      status: initialStatus,
      sentAt: initialStatus === 'sent' ? timeStr : undefined,
      sequenceNumber,
      createdAt: Date.now(),
      type: 'audio',
      audioUrl: recordedBlobUrl,
      audioDuration: duration,
      waveformData: savedWaveform,
      isEncrypted: true,
      encryptedEnvelope,
      ...getTimerPropsForNewMessage(),
    };

    setMessages((prev) => sortMessagesStrict([...prev, newVoiceMsg]));
    onUpdateThreadLastMessage?.({
      text: `Voice note (${duration}s)`,
      timestamp: timeStr,
      status: initialStatus,
    });

    if (initialStatus === 'sending') {
      return;
    }

    // Progression of delivery receipts:
    setTimeout(() => {
      const delTime = new Date();
      const delTimeStr = `${delTime.getHours().toString().padStart(2, '0')}:${delTime.getMinutes().toString().padStart(2, '0')}`;
      setMessages((prev) =>
        prev.map((m) => (m.id === newMsgId ? { ...m, status: 'delivered', deliveredAt: delTimeStr } : m))
      );
      onUpdateThreadLastMessage?.({
        text: `Voice note (${duration}s)`,
        timestamp: timeStr,
        status: 'delivered',
      });
    }, 600);

    if (thread.person.presence === 'here' || thread.person.presence === 'focus') {
      setTimeout(() => {
        if (readReceiptsEnabled) {
          const readTime = new Date();
          const readTimeStr = `${readTime.getHours().toString().padStart(2, '0')}:${readTime.getMinutes().toString().padStart(2, '0')}`;
          setMessages((prev) =>
            prev.map((m) => (m.id === newMsgId ? { ...m, status: 'read', readAt: readTimeStr } : m))
          );
          onUpdateThreadLastMessage?.({
            text: `Voice note (${duration}s)`,
            timestamp: timeStr,
            status: 'read',
          });
        }
      }, 1600);

      // Contact begins typing after listening to voice note
      setTimeout(() => {
        setIsTyping(true);
        onTypingChange?.(thread.id, true);

        setTimeout(() => {
          setIsTyping(false);
          onTypingChange?.(thread.id, false);

          const rNow = new Date();
          const rHours = rNow.getHours().toString().padStart(2, '0');
          const rMinutes = rNow.getMinutes().toString().padStart(2, '0');
          const rTimeStr = `${rHours}:${rMinutes}`;

          const replyMsg: MessageItem = {
            id: `reply-${Date.now()}`,
            sender: 'them',
            text: 'Listened to your voice message. Good to hear your voice.',
            timestamp: rTimeStr,
            ...getTimerPropsForNewMessage(),
          };

          setMessages((prev) => [...prev, replyMsg]);
          onReceiveMessage?.({
            sender: 'them',
            text: replyMsg.text,
            timestamp: rTimeStr,
          });
          onUpdateThreadLastMessage?.({
            text: replyMsg.text,
            timestamp: rTimeStr,
            status: 'delivered',
          });
        }, 2400);
      }, 2200);
    }
  };

  // Auto-scroll to bottom on mount or new messages
  const scrollToBottom = (behavior: ScrollBehavior = 'smooth') => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior });
    }
  };

  useEffect(() => {
    scrollToBottom('auto');
  }, [thread.id]);

  useEffect(() => {
    scrollToBottom('smooth');
  }, [messages.length, isTyping]);

  const triggerTypingSimulation = () => {
    if (isTyping) {
      setIsTyping(false);
      onTypingChange?.(thread.id, false);
      return;
    }

    setIsTyping(true);
    onTypingChange?.(thread.id, true);

    setTimeout(() => {
      setIsTyping(false);
      onTypingChange?.(thread.id, false);

      const now = new Date();
      const hours = now.getHours().toString().padStart(2, '0');
      const minutes = now.getMinutes().toString().padStart(2, '0');
      const timeStr = `${hours}:${minutes}`;

      const replyText = getMockReplyForThread(thread.id);
      const replyMsg: MessageItem = {
        id: `reply-${Date.now()}`,
        sender: 'them',
        text: replyText,
        timestamp: timeStr,
        ...getTimerPropsForNewMessage(),
      };

      setMessages((prev) => [...prev, replyMsg]);
      onReceiveMessage?.({
        sender: 'them',
        text: replyText,
        timestamp: timeStr,
      });
      onUpdateThreadLastMessage?.({
        text: replyText,
        timestamp: timeStr,
        status: 'delivered',
      });
    }, 2600);
  };

  const handleRetryMessage = async (msgToRetry: MessageItem) => {
    if (msgToRetry.status !== 'failed' && msgToRetry.status !== 'sending') return;

    showToast('Retrying encrypted whisper delivery...');

    setMessages((prev) =>
      prev.map((m) =>
        m.id === msgToRetry.id
          ? { ...m, status: 'sending', error: undefined, retryCount: (m.retryCount || 0) + 1 }
          : m
      )
    );

    const res = await networkManager.retryQueuedMessage(msgToRetry.id, thread.id);
    if (res.status === 'sent') {
      const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      setMessages((prev) =>
        sortMessagesStrict(
          prev.map((m) =>
            m.id === msgToRetry.id
              ? {
                  ...m,
                  status: 'sent',
                  sentAt: timeStr,
                  sequenceNumber: res.sequenceNumber || m.sequenceNumber,
                  meshStatus: m.meshStatus === 'queued' ? 'synced' : m.meshStatus,
                }
              : m
          )
        )
      );
      showToast('Whisper dispatched successfully.');
    } else if (res.status === 'sending') {
      showToast('Offline: Whisper buffered safely. Will sync on reconnection.');
    } else {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === msgToRetry.id
            ? { ...m, status: 'failed', error: 'Delivery paused. Tap to retry.' }
            : m
        )
      );
      showToast('Delivery paused. Tap status icon to retry.');
    }
  };

  const handleSendMessage = async (e?: FormEvent) => {
    if (e) e.preventDefault();
    const cleanText = draftMessage.trim();
    if (!cleanText && !stagedPhoto) return;

    const now = new Date();
    const hours = now.getHours().toString().padStart(2, '0');
    const minutes = now.getMinutes().toString().padStart(2, '0');
    const timeStr = `${hours}:${minutes}`;

    if (stagedPhoto) {
      const newMsgId = `photo-${Date.now()}`;
      const caption = cleanText;
      const photoPayload = stagedPhoto;

      const encryptedResult = await encryptPhotoMedia(photoPayload.url, caption, thread.id);

      const newPhotoMsg: MessageItem = {
        id: newMsgId,
        sender: 'you',
        text: caption ? `Photo: ${caption}` : 'Photo',
        timestamp: timeStr,
        status: 'sent',
        sentAt: timeStr,
        type: 'photo',
        imageUrl: photoPayload.url,
        imageCaption: caption || undefined,
        isEncrypted: true,
        encryptedEnvelope: encryptedResult.envelope,
        photoMetadata: {
          source: 'library',
          exifStripped: true,
          sha256Digest: encryptedResult.sha256Digest,
          encryptedAt: Date.now(),
          cipher: encryptedResult.cipher,
          ivPreview: encryptedResult.ivPreview,
        },
        ...getTimerPropsForNewMessage(),
      };

      setMessages((prev) => [...prev, newPhotoMsg]);
      setStagedPhoto(null);
      setDraftMessage('');
      onUpdateThreadLastMessage?.({
        text: caption ? `Photo: ${caption}` : 'Photo',
        timestamp: timeStr,
        status: 'sent',
        type: 'photo',
      });

      // Progression of delivery receipts:
      setTimeout(() => {
        const delTime = new Date();
        const delTimeStr = `${delTime.getHours().toString().padStart(2, '0')}:${delTime.getMinutes().toString().padStart(2, '0')}`;
        setMessages((prev) =>
          prev.map((m) => (m.id === newMsgId ? { ...m, status: 'delivered', deliveredAt: delTimeStr } : m))
        );
        onUpdateThreadLastMessage?.({
          text: caption ? `Photo: ${caption}` : 'Photo',
          timestamp: timeStr,
          status: 'delivered',
          type: 'photo',
        });
      }, 600);

      if (thread.person.presence === 'here' || thread.person.presence === 'focus') {
        setTimeout(() => {
          if (readReceiptsEnabled) {
            const readTime = new Date();
            const readTimeStr = `${readTime.getHours().toString().padStart(2, '0')}:${readTime.getMinutes().toString().padStart(2, '0')}`;
            setMessages((prev) =>
              prev.map((m) => (m.id === newMsgId ? { ...m, status: 'read', readAt: readTimeStr } : m))
            );
            onUpdateThreadLastMessage?.({
              text: caption ? `Photo: ${caption}` : 'Photo',
              timestamp: timeStr,
              status: 'read',
              type: 'photo',
            });
          }
        }, 1600);

        // Contact reacts thoughtfully to the shared photo
        setTimeout(() => {
          setIsTyping(true);
          onTypingChange?.(thread.id, true);

          setTimeout(() => {
            setIsTyping(false);
            onTypingChange?.(thread.id, false);

            const rNow = new Date();
            const rHours = rNow.getHours().toString().padStart(2, '0');
            const rMinutes = rNow.getMinutes().toString().padStart(2, '0');
            const rTimeStr = `${rHours}:${rMinutes}`;

            const photoReplies = [
              'What a peaceful perspective. Thank you for sharing.',
              'Such gentle light in this photo. Saved it.',
              'Quiet and grounding. Love this view.',
              'This brings such a calm feeling to my day.',
            ];
            const chosenReply = photoReplies[Math.floor(Math.random() * photoReplies.length)];

            const replyMsg: MessageItem = {
              id: `reply-photo-${Date.now()}`,
              sender: 'them',
              text: chosenReply,
              timestamp: rTimeStr,
              ...getTimerPropsForNewMessage(),
            };

            setMessages((prev) => [...prev, replyMsg]);
            onReceiveMessage?.({
              sender: 'them',
              text: chosenReply,
              timestamp: rTimeStr,
            });
            onUpdateThreadLastMessage?.({
              text: chosenReply,
              timestamp: rTimeStr,
              status: 'delivered',
            });
          }, 2400);
        }, 2200);
      }
      return;
    }

    const newMsgId = `msg-${Date.now()}`;
    const sequenceNumber = messages.length + 1;
    const encryptedResult = await encryptPayload(
      { type: 'text', text: cleanText },
      thread.id,
      thread.person.id,
      sequenceNumber
    );

    // Reliable production WebSocket transmit (with automatic offline outbox queuing)
    const netResult = await networkManager.sendEncryptedMessage(
      newMsgId,
      thread.id,
      thread.person.id,
      encryptedResult,
      sequenceNumber
    );

    // Stop active typing indicator
    if (localTypingTimerRef.current) {
      clearTimeout(localTypingTimerRef.current);
      localTypingTimerRef.current = null;
    }
    isLocallyTypingRef.current = false;
    networkManager.sendTypingStatus(thread.id, thread.person.id, false);

    // Hybrid Transport Dispatch
    const hybridResult = await sendHybridMessage({
      chatId: thread.id,
      recipientId: thread.person.id,
      recipientName: thread.person.name,
      recipientUsername: thread.person.phoneOrHandle?.replace('@', ''),
      text: cleanText,
      encryptedEnvelope: encryptedResult,
      type: 'text',
    });

    const initialStatus: 'sent' | 'sending' = (netResult?.status === 'sent' && hybridResult.status !== 'queued') ? 'sent' : 'sending';

    const newMsg: MessageItem = {
      id: newMsgId,
      sender: 'you',
      text: cleanText,
      timestamp: timeStr,
      status: initialStatus,
      sentAt: initialStatus === 'sent' ? timeStr : undefined,
      sequenceNumber,
      createdAt: Date.now(),
      transport: hybridResult.transport,
      meshHops: hybridResult.hops,
      relayCustodyNodes: hybridResult.custodyChain,
      meshStatus: hybridResult.status,
      isEncrypted: true,
      encryptedEnvelope: encryptedResult,
      ...getTimerPropsForNewMessage(),
    };

    setMessages((prev) => sortMessagesStrict([...prev, newMsg]));
    setDraftMessage('');

    if (hybridResult.status === 'queued') {
      showToast('Offline: Whisper queued in store-and-forward buffer. Will sync when connectivity returns.');
    } else if (hybridResult.status === 'relaying') {
      showToast(`Whisper relayed via Bluetooth LE mesh (${hybridResult.hops} hops).`);
    }

    onUpdateThreadLastMessage?.({
      text: cleanText,
      timestamp: timeStr,
      status: initialStatus,
    });

    // If message is queued offline or currently sending, hold delivery progression until confirmed
    if (initialStatus === 'sending' || hybridResult.status === 'queued') {
      return;
    }

    // Progression of delivery receipts:
    // 1. "Sent" (single check) immediately -> "Delivered" (double check) after 600ms
    setTimeout(() => {
      const delTime = new Date();
      const delTimeStr = `${delTime.getHours().toString().padStart(2, '0')}:${delTime.getMinutes().toString().padStart(2, '0')}`;
      setMessages((prev) =>
        prev.map((m) => (m.id === newMsgId ? { ...m, status: 'delivered', deliveredAt: delTimeStr } : m))
      );
      onUpdateThreadLastMessage?.({
        text: cleanText,
        timestamp: timeStr,
        status: 'delivered',
      });
    }, 600);

    // 2. "Delivered" -> "Read" (blue double checkmark) after 1600ms if contact is active and receipts enabled
    if (thread.person.presence === 'here' || thread.person.presence === 'focus') {
      setTimeout(() => {
        if (readReceiptsEnabled) {
          const readTime = new Date();
          const readTimeStr = `${readTime.getHours().toString().padStart(2, '0')}:${readTime.getMinutes().toString().padStart(2, '0')}`;
          setMessages((prev) =>
            prev.map((m) => (m.id === newMsgId ? { ...m, status: 'read', readAt: readTimeStr } : m))
          );
          onUpdateThreadLastMessage?.({
            text: cleanText,
            timestamp: timeStr,
            status: 'read',
          });
        }
      }, 1600);

      // 3. Contact begins typing real-time message under chat title
      setTimeout(() => {
        setIsTyping(true);
        onTypingChange?.(thread.id, true);

        // 4. Actively typing for 2.4s, then delivers response
        setTimeout(() => {
          setIsTyping(false);
          onTypingChange?.(thread.id, false);

          const rNow = new Date();
          const rHours = rNow.getHours().toString().padStart(2, '0');
          const rMinutes = rNow.getMinutes().toString().padStart(2, '0');
          const rTimeStr = `${rHours}:${rMinutes}`;

          const replyText = getMockReplyForThread(thread.id);
          const replyMsg: MessageItem = {
            id: `msg-reply-${Date.now()}`,
            sender: 'them',
            text: replyText,
            timestamp: rTimeStr,
            ...getTimerPropsForNewMessage(),
          };

          setMessages((prev) => [...prev, replyMsg]);
          onReceiveMessage?.({
            sender: 'them',
            text: replyText,
            timestamp: rTimeStr,
          });
          onUpdateThreadLastMessage?.({
            text: replyText,
            timestamp: rTimeStr,
            status: 'delivered',
          });
        }, 2400);
      }, 2400);
    }
  };

  // Long-press and message action menu state
  const [activeMessageMenu, setActiveMessageMenu] = useState<{
    message: MessageItem;
  } | null>(null);
  const [showAllEmojisInMenu, setShowAllEmojisInMenu] = useState(false);
  const [forwardModalMessage, setForwardModalMessage] = useState<MessageItem | null>(null);
  const [forwardSearchQuery, setForwardSearchQuery] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const toastTimeoutRef = useRef<number | null>(null);
  const longPressTimerRef = useRef<number | null>(null);
  const touchStartPosRef = useRef<{ x: number; y: number } | null>(null);

  const [firebaseUser, setFirebaseUser] = useState(auth.currentUser);

  useEffect(() => {
    const unsub = auth.onAuthStateChanged((u) => {
      setFirebaseUser(u);
    });
    return () => unsub();
  }, []);

  // Real-time Firestore reaction synchronization across participants
  // Per Firebase skill: Only attach onSnapshot listeners if auth is ready and user is authenticated
  useEffect(() => {
    if (!thread.id || !firebaseUser || !firebaseUser.uid) return;
    try {
      const messagesRef = collection(db, 'chats', thread.id, 'messages');
      const unsubscribe = onSnapshot(
        messagesRef,
        (snapshot) => {
          snapshot.docChanges().forEach((change) => {
            const data = change.doc.data();
            if (data && data.reactions) {
              const docMsgId = change.doc.id;
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === docMsgId ? { ...m, reactions: data.reactions } : m
                )
              );
            }
          });
        },
        (error) => {
          console.warn('Firestore messages listener notice:', error);
        }
      );
      return () => unsubscribe();
    } catch {
      // Offline fallback
    }
  }, [thread.id, firebaseUser]);

  const handleToggleReaction = async (messageId: string, emoji: string) => {
    const targetMsg = messages.find((m) => m.id === messageId);
    if (!targetMsg) return;

    const currentReactions = targetMsg.reactions || {};
    const currentUserId = auth.currentUser?.uid || 'you';

    // 1. Calculate updated reactions and update locally (optimistic UI)
    const { updatedReactions, added } = await toggleMessageReactionInFirestore(
      thread.id,
      messageId,
      emoji,
      currentUserId,
      currentReactions
    );

    setMessages((prev) =>
      prev.map((m) => (m.id === messageId ? { ...m, reactions: updatedReactions } : m))
    );

    // Broadcast reaction update over real-time zero-knowledge WebSocket
    networkManager.sendReactionToggle(
      thread.id,
      messageId,
      thread.person.id,
      emoji,
      updatedReactions
    );

    if (activeMessageMenu && activeMessageMenu.message.id === messageId) {
      setActiveMessageMenu(null);
    }
    setShowAllEmojisInMenu(false);

    showToast(added ? `Reacted ${emoji}` : `Removed ${emoji}`);
  };

  // Pinned messages state & navigation
  const [activePinnedIndex, setActivePinnedIndex] = useState(0);
  const [highlightedMessageId, setHighlightedMessageId] = useState<string | null>(null);

  const pinnedMessages = useMemo(() => messages.filter((m) => m.isPinned), [messages]);
  const safePinnedIndex =
    pinnedMessages.length > 0 ? Math.min(activePinnedIndex, pinnedMessages.length - 1) : 0;
  const currentPinnedMessage = pinnedMessages[safePinnedIndex];

  const showToast = (text: string) => {
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    setToastMessage(text);
    toastTimeoutRef.current = window.setTimeout(() => {
      setToastMessage(null);
    }, 2200);
  };

  const handleOpenMessageMenu = (msg: MessageItem) => {
    if ('vibrate' in navigator) {
      try {
        navigator.vibrate(25);
      } catch {
        // Ignore haptic errors
      }
    }
    setActiveMessageMenu({ message: msg });
  };

  const handleTogglePinMessage = (msg: MessageItem) => {
    setActiveMessageMenu(null);
    const willPin = !msg.isPinned;
    setMessages((prev) =>
      prev.map((m) => (m.id === msg.id ? { ...m, isPinned: willPin } : m))
    );
    if (willPin) {
      const updatedPinnedCount = messages.filter((m) => m.id === msg.id || m.isPinned).length;
      setActivePinnedIndex(Math.max(0, updatedPinnedCount - 1));
      showToast('Message pinned to top');
    } else {
      showToast('Message unpinned');
    }
  };

  const handleScrollToMessage = (msgId: string) => {
    const el = document.getElementById(`msg-${msgId}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setHighlightedMessageId(msgId);
      setTimeout(() => {
        setHighlightedMessageId((curr) => (curr === msgId ? null : curr));
      }, 2000);
    }
  };

  const handleCopyMessage = async (msg: MessageItem) => {
    setActiveMessageMenu(null);
    try {
      const textToCopy =
        msg.type === 'photo'
          ? msg.imageCaption
            ? `${msg.imageCaption} (${msg.imageUrl || ''})`
            : msg.imageUrl || 'Photo'
          : msg.type === 'audio'
          ? `Voice message (${msg.audioDuration || 4}s)`
          : msg.text;
      await navigator.clipboard.writeText(textToCopy);
      showToast('Copied to clipboard');
    } catch {
      showToast('Copied to clipboard');
    }
  };

  const handleDeleteMessage = (id: string) => {
    setActiveMessageMenu(null);
    setMessages((prev) => {
      const remaining = prev.filter((m) => m.id !== id);
      if (onUpdateThreadLastMessage && remaining.length > 0) {
        const last = remaining[remaining.length - 1];
        onUpdateThreadLastMessage({
          text: last.text,
          timestamp: last.timestamp,
          status: last.status || 'read',
          type: last.type,
        });
      }
      return remaining;
    });
    showToast('Message deleted');
  };

  const handleForwardToPerson = (personName: string) => {
    setForwardModalMessage(null);
    setForwardSearchQuery('');
    showToast(`Forwarded to ${personName}`);
  };

  const handleForwardToDraft = (msg: MessageItem) => {
    setForwardModalMessage(null);
    setForwardSearchQuery('');
    setDraftMessage((prev) => {
      const content = msg.text || (msg.type === 'photo' ? 'Photo' : 'Voice message');
      return prev ? `${prev}\n> ${content}\n` : `> ${content}\n`;
    });
    inputRef.current?.focus();
    showToast('Quoted in draft');
  };

  // Keyboard dismiss (Escape)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (activeMessageMenu) setActiveMessageMenu(null);
        if (forwardModalMessage) setForwardModalMessage(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeMessageMenu, forwardModalMessage]);

  // Touch & Mouse Long-press handlers
  const handleTouchStart = (msg: MessageItem, e: React.TouchEvent) => {
    const touch = e.touches[0];
    touchStartPosRef.current = { x: touch.clientX, y: touch.clientY };
    if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
    longPressTimerRef.current = window.setTimeout(() => {
      handleOpenMessageMenu(msg);
      longPressTimerRef.current = null;
    }, 450);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!touchStartPosRef.current) return;
    const touch = e.touches[0];
    const dx = Math.abs(touch.clientX - touchStartPosRef.current.x);
    const dy = Math.abs(touch.clientY - touchStartPosRef.current.y);
    if (dx > 10 || dy > 10) {
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current);
        longPressTimerRef.current = null;
      }
    }
  };

  const handleTouchEnd = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
    touchStartPosRef.current = null;
  };

  const handleMouseDown = (msg: MessageItem, e: React.MouseEvent) => {
    if (e.button !== 0) return; // only primary button hold
    if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
    longPressTimerRef.current = window.setTimeout(() => {
      handleOpenMessageMenu(msg);
      longPressTimerRef.current = null;
    }, 450);
  };

  const handleMouseUp = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  const handleContextMenu = (msg: MessageItem, e: React.MouseEvent) => {
    e.preventDefault();
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
    handleOpenMessageMenu(msg);
  };

  const filteredForwardPeople = useMemo(() => {
    if (!forwardSearchQuery.trim()) return PLACEHOLDER_PEOPLE;
    const q = forwardSearchQuery.toLowerCase();
    return PLACEHOLDER_PEOPLE.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.relationship.toLowerCase().includes(q)
    );
  }, [forwardSearchQuery]);

  const presenceInfo = PRESENCE_LABEL_MAP[thread.person.presence] || PRESENCE_LABEL_MAP.quiet;

  return (
    <motion.div
      initial={{ x: '100%', opacity: 0.9 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: '100%', opacity: 0.9 }}
      transition={{ type: 'spring', damping: 30, stiffness: 340 }}
      className="fixed inset-0 z-50 bg-white dark:bg-zinc-950 flex flex-col h-full w-full overflow-hidden select-none"
    >
      {/* ------------------------------------------------------------- */}
      {/* 1. Header (Mobile / iPhone Precision)                          */}
      {/* ------------------------------------------------------------- */}
      <header className="shrink-0 h-14 px-3 border-b border-zinc-200/80 dark:border-zinc-850 bg-white/95 dark:bg-zinc-950/95 backdrop-blur-md flex items-center justify-between z-20">
        <div className="flex items-center gap-2 min-w-0">
          {/* Back Button */}
          <button
            type="button"
            onClick={onBack}
            className="p-2 -ml-1 text-zinc-600 hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-850 rounded-lg transition-colors cursor-pointer"
            aria-label="Back to chats"
          >
            <IconChevronLeft className="w-5 h-5" />
          </button>

          {/* Contact Avatar */}
          <Avatar
            initials={thread.person.initials}
            name={thread.person.name}
            presence={thread.person.presence}
            size="sm"
            gradient={thread.person.avatarColor}
          />

          {/* Contact Meta */}
          <div className="min-w-0 flex flex-col justify-center text-left">
            <h2 className="text-sm font-semibold tracking-tight text-zinc-950 dark:text-zinc-50 truncate leading-none">
              {thread.person.name}
            </h2>
            <div className="h-4 flex items-center mt-1">
              <AnimatePresence mode="wait">
                {isTyping ? (
                  <TypingIndicator
                    key="typing"
                    variant="header"
                    label={`${thread.person.name.split(' ')[0]} is typing`}
                  />
                ) : (
                  <motion.div
                    key="presence"
                    initial={{ opacity: 0, y: 1 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -1 }}
                    transition={{ duration: 0.15 }}
                    className="flex items-center gap-1.5 text-[11px] text-zinc-500 dark:text-zinc-400 truncate"
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${presenceInfo.dotClass}`} />
                    <span className="truncate">{thread.person.relationship}</span>
                    <span className="text-zinc-300 dark:text-zinc-700">·</span>
                    <button
                      type="button"
                      onClick={() => setIsMeshModalOpen(true)}
                      className="inline-flex items-center gap-1 text-[10px] font-mono px-1.5 py-0.2 rounded-full transition-colors cursor-pointer hover:underline text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20"
                      title="Hybrid Radio & Mesh Link. Tap to inspect."
                    >
                      {meshState.isOnline ? (
                        <>
                          <IconCloud className="w-2.5 h-2.5 text-sky-500" />
                          <span className="text-sky-600 dark:text-sky-400">Internet</span>
                        </>
                      ) : (
                        <>
                          <IconBluetooth className="w-2.5 h-2.5 text-emerald-500" />
                          <span>BLE Mesh</span>
                        </>
                      )}
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* Header Right Actions */}
        <div className="relative flex items-center gap-1 shrink-0">
          {/* Active Disappearing Timer Quick Badge */}
          {disappearingTimer !== 'off' && (
            <button
              type="button"
              onClick={() => setIsTimerModalOpen(true)}
              className="flex items-center gap-1 px-2 py-1 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-300/60 dark:border-amber-700/60 transition-colors cursor-pointer text-xs font-mono"
              title={`Disappearing messages active: ${currentTimerConfig.label}. Tap to adjust.`}
              aria-label="Adjust disappearing timer"
            >
              <IconHourglass className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
              <span>{currentTimerConfig.badgeLabel}</span>
            </button>
          )}

          {/* Direct Encrypted Call Quick Button */}
          <button
            type="button"
            onClick={() => setIsCallModalOpen(true)}
            className="p-2 rounded-lg text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-850 transition-colors cursor-pointer"
            title="Start end-to-end encrypted call"
            aria-label="Encrypted call"
          >
            <IconPhone className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={() => setShowOptions(!showOptions)}
            className="p-2 rounded-lg text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-850 transition-colors cursor-pointer"
            aria-label="Thread options"
          >
            <IconMore className="w-4 h-4" />
          </button>

          {/* Options Dropdown */}
          <AnimatePresence>
            {showOptions && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: -4 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: -4 }}
                transition={{ duration: 0.15 }}
                className="absolute right-0 top-10 z-50 w-56 p-1 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 shadow-xl text-xs space-y-0.5"
              >
                {/* Disappearing Messages Setting */}
                <button
                  type="button"
                  onClick={() => {
                    setShowOptions(false);
                    setIsTimerModalOpen(true);
                  }}
                  className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer text-left"
                >
                  <div className="flex items-center gap-2">
                    <IconHourglass className="w-3.5 h-3.5 text-amber-500" />
                    <span>Disappearing Messages</span>
                  </div>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300">
                    {currentTimerConfig.badgeLabel}
                  </span>
                </button>

                {/* Read Receipts Privacy Setting */}
                <button
                  type="button"
                  onClick={() => {
                    handleToggleReadReceipts();
                  }}
                  className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer text-left"
                >
                  <div className="flex items-center gap-2">
                    {readReceiptsEnabled ? (
                      <IconCheckDouble className="w-3.5 h-3.5 text-sky-500" />
                    ) : (
                      <IconEyeOff className="w-3.5 h-3.5 text-zinc-400" />
                    )}
                    <span>Read Receipts</span>
                  </div>
                  <span
                    className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                      readReceiptsEnabled
                        ? 'bg-sky-100 dark:bg-sky-950/60 text-sky-800 dark:text-sky-300'
                        : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400'
                    }`}
                  >
                    {readReceiptsEnabled ? 'Active' : 'Quiet (Off)'}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setShowOptions(false);
                    setIsThemeModalOpen(true);
                  }}
                  className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer text-left"
                >
                  <div className="flex items-center gap-2">
                    <IconPalette className="w-3.5 h-3.5 text-zinc-400" />
                    <span>Chat Theme</span>
                  </div>
                  <span
                    className="text-[10px] font-mono px-1.5 py-0.5 rounded font-medium border"
                    style={{
                      borderColor: resolvedTheme.accentColor,
                      color: resolvedTheme.accentColor,
                    }}
                  >
                    {resolvedTheme.name}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setShowOptions(false);
                    setIsTextureModalOpen(true);
                  }}
                  className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer text-left"
                >
                  <div className="flex items-center gap-2">
                    <IconLayers className="w-3.5 h-3.5 text-zinc-400" />
                    <span>Background Texture</span>
                  </div>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
                    {CHAT_TEXTURE_CONFIGS[chatTexture]?.name || 'Washi'}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setShowOptions(false);
                    setIsVerificationModalOpen(true);
                  }}
                  className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer text-left"
                >
                  <IconSecurity className="w-3.5 h-3.5 text-zinc-400" />
                  <span>Verify Encryption</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setShowOptions(false);
                    setIsCallModalOpen(true);
                  }}
                  className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer text-left"
                >
                  <IconPhone className="w-3.5 h-3.5 text-zinc-400" />
                  <span>Encrypted Audio Call</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setShowOptions(false);
                    triggerTypingSimulation();
                  }}
                  className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer text-left"
                >
                  <IconSparkles className="w-3.5 h-3.5 text-emerald-500" />
                  <span>{isTyping ? 'Stop Typing Indicator' : 'Simulate Partner Typing'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowOptions(false)}
                  className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer text-left"
                >
                  <IconEdit className="w-3.5 h-3.5 text-zinc-400" />
                  <span>Edit Contact Note</span>
                </button>

                {/* Archive / Unarchive Conversation */}
                <button
                  type="button"
                  onClick={() => {
                    setShowOptions(false);
                    onToggleArchive?.(thread.id);
                  }}
                  className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer text-left"
                >
                  <div className="flex items-center gap-2">
                    {isArchived ? (
                      <IconArchiveRestore className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400" />
                    ) : (
                      <IconArchive className="w-3.5 h-3.5 text-zinc-400" />
                    )}
                    <span>{isArchived ? 'Unarchive Whisper' : 'Archive Whisper'}</span>
                  </div>
                  <span className="text-[10px] text-zinc-400">
                    {isArchived ? 'Restore' : 'Tuck away'}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setShowOptions(false);
                    if (window.confirm('Scrub all messages currently in this thread?')) {
                      handleScrubHistoryNow();
                    }
                  }}
                  className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer text-left"
                >
                  <IconDelete className="w-3.5 h-3.5 text-rose-500" />
                  <span>Scrub Conversation Now</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowOptions(false)}
                  className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer text-left"
                >
                  <IconBlock className="w-3.5 h-3.5 text-rose-500" />
                  <span>Quietly Block Contact</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setShowOptions(false);
                    onBack();
                  }}
                  className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer text-left"
                >
                  <IconDelete className="w-3.5 h-3.5 text-zinc-400" />
                  <span>Delete Thread</span>
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </header>

      {/* Hybrid Connectivity & Offline Mesh Status Banner */}
      {!meshState.isOnline ? (
        <div className="shrink-0 px-3.5 py-1.5 bg-emerald-500/10 border-b border-emerald-500/20 flex items-center justify-between gap-2 text-[11px] text-emerald-800 dark:text-emerald-300 select-none">
          <div className="flex items-center gap-1.5 min-w-0">
            <IconBluetooth className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span className="truncate">
              Offline Mesh Active · BLE Radio Link ({meshState.nearbyPeers.length} nodes)
            </span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {meshState.queuedMessagesCount > 0 && (
              <span className="text-[10px] font-mono px-1.5 py-0.2 bg-amber-500/20 text-amber-700 dark:text-amber-300 rounded-full font-semibold">
                {meshState.queuedMessagesCount} queued
              </span>
            )}
            <button
              type="button"
              onClick={() => setIsMeshModalOpen(true)}
              className="text-[10.5px] font-medium text-emerald-700 dark:text-emerald-300 hover:underline cursor-pointer"
            >
              Inspect Relay
            </button>
          </div>
        </div>
      ) : meshState.queuedMessagesCount > 0 ? (
        <div className="shrink-0 px-3.5 py-1.5 bg-sky-500/10 border-b border-sky-500/20 flex items-center justify-between gap-2 text-[11px] text-sky-800 dark:text-sky-300 select-none">
          <div className="flex items-center gap-1.5 min-w-0">
            <IconCloud className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400 shrink-0" />
            <span className="truncate">
              Internet Reconnected · {meshState.queuedMessagesCount} offline whispers ready to sync
            </span>
          </div>
          <button
            type="button"
            disabled={isSyncingMesh}
            onClick={async () => {
              setIsSyncingMesh(true);
              await syncQueuedMessages();
              setIsSyncingMesh(false);
            }}
            className="text-[10.5px] font-medium font-mono text-sky-700 dark:text-sky-300 underline cursor-pointer"
          >
            {isSyncingMesh ? 'Syncing...' : 'Sync Now'}
          </button>
        </div>
      ) : null}

      {/* Active Disappearing Messages Banner */}
      {disappearingTimer !== 'off' && (
        <div
          onClick={() => setIsTimerModalOpen(true)}
          className="shrink-0 px-3.5 py-1.5 bg-amber-50/80 dark:bg-amber-950/25 border-b border-amber-200/50 dark:border-amber-900/30 flex items-center justify-between gap-2 text-[11px] text-amber-900 dark:text-amber-200 cursor-pointer hover:bg-amber-100/60 dark:hover:bg-amber-950/40 transition-colors select-none"
        >
          <div className="flex items-center gap-1.5 min-w-0">
            <IconHourglass className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
            <span className="truncate">
              Whispers automatically dissolve <strong className="font-semibold">{currentTimerConfig.label.toLowerCase()}</strong> after sending.
            </span>
          </div>
          <span className="text-[10px] font-mono font-medium text-amber-700 dark:text-amber-300 underline underline-offset-2 shrink-0">
            Change
          </span>
        </div>
      )}

      {/* Active Archived Whisper Banner */}
      {isArchived && (
        <div className="shrink-0 px-3.5 py-1.5 bg-amber-500/10 dark:bg-amber-400/[0.08] border-b border-amber-500/20 dark:border-amber-400/15 flex items-center justify-between gap-2 text-[11px] text-amber-900 dark:text-amber-200 select-none">
          <div className="flex items-center gap-1.5 min-w-0">
            <IconArchive className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
            <span className="truncate">
              This whisper is archived and tucked away from your main circle.
            </span>
          </div>
          <button
            type="button"
            onClick={() => onToggleArchive?.(thread.id)}
            className="text-[10.5px] font-semibold text-amber-700 dark:text-amber-300 hover:underline cursor-pointer flex items-center gap-1 shrink-0"
          >
            <IconArchiveRestore className="w-3 h-3" />
            <span>Unarchive</span>
          </button>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 2. Message Thread Body (Dense Rectangular Card Design)        */}
      {/* ------------------------------------------------------------- */}
      <div
        className={`relative flex-1 flex flex-col min-h-0 overflow-hidden transition-colors duration-200 ${resolvedTheme.bgClass}`}
        style={resolvedTheme.bgStyle}
      >
        {/* Subtle, calm background texture overlay */}
        {chatTexture !== 'none' && (
          <div
            className={`pointer-events-none absolute inset-0 z-0 select-none ${
              CHAT_TEXTURE_CONFIGS[chatTexture]?.overlayClass ||
              'chat-texture-washi opacity-[0.045] dark:opacity-[0.06] mix-blend-multiply dark:mix-blend-screen'
            }`}
            aria-hidden="true"
          />
        )}

        {/* Top of Chat View Active Typing Indicator Component */}
        <AnimatePresence>
          {isTyping && (
            <motion.div
              key="top-chat-typing-indicator"
              initial={{ opacity: 0, height: 0, y: -6 }}
              animate={{ opacity: 1, height: 'auto', y: 0 }}
              exit={{ opacity: 0, height: 0, y: -6 }}
              transition={{ duration: 0.22, ease: 'easeOut' }}
              className={`shrink-0 z-25 border-b ${resolvedTheme.typingBorderClass} ${resolvedTheme.typingBgClass} backdrop-blur-md px-3.5 py-2 flex items-center justify-between gap-2.5 shadow-2xs select-none`}
              role="status"
              aria-live="polite"
              aria-label={`${thread.person.name} is writing a message`}
            >
              <div className="flex items-center gap-2 min-w-0">
                <Avatar
                  initials={thread.person.initials}
                  name={thread.person.name}
                  presence={thread.person.presence}
                  size="xs"
                  gradient={thread.person.avatarColor}
                />
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="text-xs font-semibold text-emerald-950 dark:text-emerald-50 truncate">
                    {thread.person.name}
                  </span>
                  <span className="text-[11px] text-emerald-700 dark:text-emerald-300 truncate">
                    is actively writing a message
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-1 shrink-0 px-2 py-0.5 rounded-full bg-emerald-100/90 dark:bg-emerald-900/70 border border-emerald-300/60 dark:border-emerald-700/60 shadow-2xs">
                <motion.span
                  className="w-1.5 h-1.5 rounded-full bg-emerald-600 dark:bg-emerald-400"
                  animate={{ opacity: [0.35, 1, 0.35], y: [0, -2, 0] }}
                  transition={{ duration: 1, repeat: Infinity, ease: 'easeInOut', delay: 0 }}
                />
                <motion.span
                  className="w-1.5 h-1.5 rounded-full bg-emerald-600 dark:bg-emerald-400"
                  animate={{ opacity: [0.35, 1, 0.35], y: [0, -2, 0] }}
                  transition={{ duration: 1, repeat: Infinity, ease: 'easeInOut', delay: 0.2 }}
                />
                <motion.span
                  className="w-1.5 h-1.5 rounded-full bg-emerald-600 dark:bg-emerald-400"
                  animate={{ opacity: [0.35, 1, 0.35], y: [0, -2, 0] }}
                  transition={{ duration: 1, repeat: Infinity, ease: 'easeInOut', delay: 0.4 }}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Pinned Messages Header Bar (Top of Conversation Thread) */}
        <AnimatePresence>
          {currentPinnedMessage && (
            <motion.div
              initial={{ opacity: 0, height: 0, y: -4 }}
              animate={{ opacity: 1, height: 'auto', y: 0 }}
              exit={{ opacity: 0, height: 0, y: -4 }}
              transition={{ type: 'spring', damping: 28, stiffness: 380 }}
              className="shrink-0 z-20 border-b border-amber-200/60 dark:border-amber-900/40 bg-amber-50/85 dark:bg-amber-950/30 backdrop-blur-md px-3.5 py-1.5 flex items-center justify-between gap-2 select-none shadow-2xs"
            >
              {/* Left Pin Icon + Message Preview (Click to Jump) */}
              <button
                type="button"
                onClick={() => handleScrollToMessage(currentPinnedMessage.id)}
                className="flex items-center gap-2 min-w-0 flex-1 text-left group cursor-pointer"
                title="Click to jump to message in conversation"
              >
                <div className="w-5 h-5 rounded-md bg-amber-200/70 dark:bg-amber-900/50 text-amber-800 dark:text-amber-300 flex items-center justify-center shrink-0 shadow-2xs">
                  <IconPin className="w-3 h-3 rotate-45" />
                </div>
                <div className="min-w-0 flex-1 flex items-baseline gap-1.5 overflow-hidden">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-amber-900 dark:text-amber-300 font-semibold shrink-0">
                    {currentPinnedMessage.sender === 'you' ? 'You' : thread.person.name}:
                  </span>
                  <span className="text-xs text-zinc-800 dark:text-zinc-200 truncate font-sans group-hover:text-amber-950 dark:group-hover:text-amber-200 transition-colors">
                    {currentPinnedMessage.type === 'photo'
                      ? currentPinnedMessage.imageCaption || 'Photo attachment'
                      : currentPinnedMessage.type === 'audio'
                      ? `Voice note (${currentPinnedMessage.audioDuration || 4}s)`
                      : currentPinnedMessage.text}
                  </span>
                  <span className="text-[9.5px] font-mono text-zinc-400 dark:text-zinc-500 shrink-0">
                    {currentPinnedMessage.timestamp}
                  </span>
                </div>
              </button>

              {/* Right Controls: Multi-pin pagination + Unpin button */}
              <div className="flex items-center gap-1 shrink-0">
                {pinnedMessages.length > 1 && (
                  <div className="flex items-center gap-0.5 mr-0.5 text-[10px] font-mono text-zinc-500 dark:text-zinc-400 bg-amber-100/60 dark:bg-amber-900/30 px-1.5 py-0.5 rounded-md">
                    <button
                      type="button"
                      onClick={() =>
                        setActivePinnedIndex(
                          (safePinnedIndex - 1 + pinnedMessages.length) % pinnedMessages.length
                        )
                      }
                      className="p-0.5 hover:text-zinc-900 dark:hover:text-zinc-100 cursor-pointer"
                      title="Previous pinned message"
                    >
                      <IconChevronLeft className="w-3 h-3" />
                    </button>
                    <span className="px-1 tabular-nums">
                      {safePinnedIndex + 1}/{pinnedMessages.length}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        setActivePinnedIndex((safePinnedIndex + 1) % pinnedMessages.length)
                      }
                      className="p-0.5 hover:text-zinc-900 dark:hover:text-zinc-100 cursor-pointer"
                      title="Next pinned message"
                    >
                      <IconChevronRight className="w-3 h-3" />
                    </button>
                  </div>
                )}

                {/* Quick Unpin Button */}
                <button
                  type="button"
                  onClick={() => handleTogglePinMessage(currentPinnedMessage)}
                  className="p-1 rounded-md text-zinc-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
                  title="Unpin message"
                  aria-label="Unpin message"
                >
                  <IconClose className="w-3.5 h-3.5" />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div
          className="relative z-10 flex-1 overflow-y-auto px-4 py-3 space-y-2.5 overscroll-contain"
          onClick={() => {
            if (showOptions) setShowOptions(false);
            if (showAttachMenu) setShowAttachMenu(false);
          }}
        >
          {/* Subtle Security Anchor Header */}
          <div className="flex items-center justify-center my-1 text-[10px] text-zinc-400 dark:text-zinc-500 font-mono">
            <span className="flex items-center gap-1">
              <IconSecurity className="w-3 h-3 text-zinc-400 dark:text-zinc-500" />
              Direct cryptographic sanctuary · No tracking
            </span>
          </div>

          {/* Message Cards Rendering */}
          {isLoadingMessages ? (
            <div className="space-y-3 py-2">
              <MessageBubbleSkeleton isSent={false} widthClass="w-56" />
              <MessageBubbleSkeleton isSent={true} widthClass="w-40" />
              <MessageBubbleSkeleton isSent={false} widthClass="w-48" hasAttachment />
              <MessageBubbleSkeleton isSent={true} widthClass="w-52" />
              <MessageBubbleSkeleton isSent={false} widthClass="w-32" />
            </div>
          ) : (
            <AnimatePresence initial={false}>
              {messages.map((msg, index) => {
              if (msg.isSystemNotice) {
                return (
                  <motion.div
                    key={msg.id}
                    layout="position"
                    initial={{ opacity: 0, y: 6, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
                    className="flex items-center justify-center my-2 select-none"
                  >
                    <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 dark:bg-amber-400/10 border border-amber-300/40 dark:border-amber-700/40 text-amber-900 dark:text-amber-200 text-[11px] font-sans shadow-2xs">
                      <IconHourglass className="w-3 h-3 text-amber-600 dark:text-amber-400 shrink-0" />
                      <span>{msg.text}</span>
                      <span className="text-amber-600/60 dark:text-amber-400/60 text-[9.5px] font-mono">
                        · {msg.timestamp}
                      </span>
                    </div>
                  </motion.div>
                );
              }

              const isSent = msg.sender === 'you';
              const prevMsg = messages[index - 1];
              const isSameSender = prevMsg && prevMsg.sender === msg.sender && !prevMsg.isSystemNotice;

              return (
                <React.Fragment key={msg.id}>
                  {/* Optional Date Group Divider */}
                  {msg.dateLabel && (
                    <motion.div
                      layout="position"
                      className="flex items-center justify-center my-3"
                    >
                      <div className="h-[1px] flex-1 bg-zinc-200/60 dark:bg-zinc-800/60" />
                      <span className="px-2.5 py-0.5 text-[10px] font-mono uppercase tracking-widest text-zinc-400 dark:text-zinc-500">
                        {msg.dateLabel}
                      </span>
                      <div className="h-[1px] flex-1 bg-zinc-200/60 dark:bg-zinc-800/60" />
                    </motion.div>
                  )}

                  {/* Message Row with subtle fluid entry animation and dissolution exit */}
                  <motion.div
                    id={`msg-${msg.id}`}
                    layout="position"
                    initial={
                      isSent
                        ? { opacity: 0, y: 8, x: 8, scale: 0.98 }
                        : { opacity: 0, y: 12, x: -10, scale: 0.96 }
                    }
                    animate={{
                      opacity: 1,
                      y: 0,
                      x: 0,
                      scale: 1,
                    }}
                    exit={{
                      opacity: 0,
                      scale: 0.92,
                      filter: 'blur(4px)',
                      transition: { duration: 0.35, ease: 'easeOut' },
                    }}
                    transition={{
                      type: 'spring',
                      damping: isSent ? 28 : 24,
                      stiffness: isSent ? 420 : 360,
                      mass: isSent ? 0.6 : 0.7,
                    }}
                    className={`flex flex-col ${isSent ? 'items-end' : 'items-start'} ${
                      isSameSender ? 'mt-1' : 'mt-2.5'
                    }`}
                  >
                    {/* 
                      Compact, Slim, Content-Sized Chat Bubble:
                      - Minimal padding: px-2.5 py-1
                      - Crisp, refined corners: rounded-lg (8px)
                      - W-fit shrinkwrap hugging the text tightly with no excessive empty space
                      - Snug metadata row / inline flow for optimal readability
                    */}
                    <motion.div
                      initial={
                        !isSent
                          ? {
                              boxShadow: '0 0 0 0 rgba(16, 185, 129, 0)',
                            }
                          : undefined
                      }
                      animate={
                        !isSent
                          ? {
                              boxShadow: [
                                '0 0 0 0 rgba(16, 185, 129, 0)',
                                '0 0 0 1px rgba(16, 185, 129, 0.28), 0 4px 14px -2px rgba(16, 185, 129, 0.16)',
                                '0 0 0 0 rgba(16, 185, 129, 0)',
                              ],
                            }
                          : undefined
                      }
                      transition={{
                        duration: 1.5,
                        ease: 'easeOut',
                        times: [0, 0.2, 1],
                      }}
                      onContextMenu={(e) => handleContextMenu(msg, e)}
                      onTouchStart={(e) => handleTouchStart(msg, e)}
                      onTouchMove={handleTouchMove}
                      onTouchEnd={handleTouchEnd}
                      onTouchCancel={handleTouchEnd}
                      onMouseDown={(e) => handleMouseDown(msg, e)}
                      onMouseUp={handleMouseUp}
                      onMouseLeave={handleMouseUp}
                      className={`group relative w-fit max-w-[78%] sm:max-w-[65%] rounded-lg border transition-all select-text shadow-2xs cursor-pointer ${
                        highlightedMessageId === msg.id
                          ? 'ring-2 ring-amber-400/90 dark:ring-amber-400/90 shadow-md scale-[1.01]'
                          : ''
                      } ${
                        isSent
                          ? resolvedTheme.senderBubbleClass
                          : resolvedTheme.receiverBubbleClass
                      } px-2.5 py-1`}
                      style={
                        isSent
                          ? resolvedTheme.senderBubbleStyle
                          : resolvedTheme.receiverBubbleStyle
                      }
                    >
                      {/* Discreet message actions trigger for desktop hover / keyboard focus */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenMessageMenu(msg);
                        }}
                        title="Message actions (long-press or right-click)"
                        aria-label="Message options"
                        className={`absolute -top-2 ${
                          isSent ? '-left-2.5' : '-right-2.5'
                        } opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity p-0.5 rounded-full bg-white dark:bg-zinc-850 border border-zinc-200 dark:border-zinc-700 shadow-xs text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 cursor-pointer z-10`}
                      >
                        <IconMore className="w-3 h-3" />
                      </button>

                      {/* Message Content */}
                      {msg.type === 'audio' ? (
                        <div className="space-y-0.5">
                          <VoiceMessagePlayer
                            audioUrl={msg.audioUrl}
                            duration={msg.audioDuration || 4}
                            waveformData={msg.waveformData}
                            isSent={isSent}
                          />
                          <div
                            className={`flex items-center justify-end gap-1 select-none text-[9px] font-mono tabular-nums leading-none ${
                              isSent
                                ? resolvedTheme.senderMetaClass
                                : resolvedTheme.receiverMetaClass
                            }`}
                          >
                            {msg.expiresAt && (
                              <span
                                title={`Disappearing message: dissolves in ${formatRemainingTime(msg.expiresAt)}`}
                                className={`inline-flex items-center gap-0.5 text-[8.5px] font-mono mr-0.5 ${
                                  msg.expiresAt - currentTime < 10000
                                    ? 'text-amber-500 dark:text-amber-400 animate-pulse font-bold'
                                    : isSent
                                    ? 'text-amber-300 dark:text-amber-600'
                                    : 'text-amber-600 dark:text-amber-300'
                                }`}
                              >
                                <IconHourglass className="w-2.5 h-2.5 shrink-0" />
                                <span>{formatRemainingTime(msg.expiresAt)}</span>
                              </span>
                            )}
                            {msg.isPinned && (
                              <span
                                title="Pinned message"
                                className="inline-flex items-center text-amber-500 dark:text-amber-400 mr-0.5"
                              >
                                <IconPin className="w-2.5 h-2.5 rotate-45 shrink-0" />
                              </span>
                            )}
                            {msg.meshStatus === 'synced' ? (
                              <span
                                title={`Synced via cloud at ${msg.syncedAt || msg.timestamp}`}
                                className="inline-flex items-center text-sky-500 mr-0.5"
                              >
                                <IconCloud className="w-2.5 h-2.5" />
                              </span>
                            ) : msg.transport === 'offline-queued' || msg.meshStatus === 'queued' ? (
                              <span
                                title="Offline: Buffered in store-and-forward queue."
                                className="inline-flex items-center gap-0.5 text-amber-500 font-mono text-[8px] mr-0.5"
                              >
                                <IconHardDrive className="w-2.5 h-2.5" />
                                <span>queued</span>
                              </span>
                            ) : msg.transport === 'bluetooth-le' || msg.transport === 'bluetooth-mesh' ? (
                              <span
                                title={`Delivered via Bluetooth LE Mesh (${msg.meshHops || 1} hop)`}
                                className="inline-flex items-center gap-0.5 text-emerald-500 mr-0.5 font-mono text-[8px]"
                              >
                                <IconBluetooth className="w-2.5 h-2.5" />
                                {msg.meshHops && msg.meshHops > 1 ? `${msg.meshHops}h` : ''}
                              </span>
                            ) : msg.transport === 'wifi-direct' ? (
                              <span
                                title="Delivered via Wi-Fi Direct Peer Link"
                                className="inline-flex items-center text-emerald-500 mr-0.5"
                              >
                                <IconWifi className="w-2.5 h-2.5" />
                              </span>
                            ) : null}
                            <span>{msg.timestamp}</span>
                            {isSent && (
                              <MessageReceiptIndicator
                                status={msg.status}
                                readReceiptsEnabled={readReceiptsEnabled}
                                timestamp={msg.timestamp}
                                readAt={msg.readAt}
                                deliveredAt={msg.deliveredAt}
                                sentAt={msg.sentAt}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (msg.status === 'failed') {
                                    handleRetryMessage(msg);
                                  } else {
                                    setSelectedInfoMessage(msg);
                                  }
                                }}
                              />
                            )}
                          </div>
                        </div>
                      ) : msg.type === 'photo' ? (
                        <div className="space-y-1">
                          <div className="relative group rounded-lg overflow-hidden border border-black/10 dark:border-white/10 shadow-2xs">
                            <button
                              type="button"
                              onClick={() =>
                                setSelectedLightboxPhoto({
                                  url: msg.imageUrl || '',
                                  caption: msg.imageCaption || (msg.text !== 'Photo' ? msg.text : undefined),
                                  timestamp: msg.timestamp,
                                  message: msg,
                                })
                              }
                              className="block overflow-hidden cursor-zoom-in text-left w-full"
                              title="Click to view full photo"
                            >
                              <img
                                src={msg.imageUrl}
                                alt={msg.imageCaption || 'Attached photo'}
                                className="w-full max-h-52 sm:max-h-60 object-cover group-hover:opacity-95 transition-opacity"
                                loading="lazy"
                              />
                            </button>

                            {/* Cryptographic E2EE Pill Badge */}
                            <div className="absolute top-1.5 left-1.5 z-10">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedPhotoCrypto(msg);
                                }}
                                className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-black/65 hover:bg-black/85 backdrop-blur-md text-white text-[9px] font-mono border border-white/15 transition-colors cursor-pointer shadow-xs"
                                title="Click to view cryptographic proof and encryption details"
                              >
                                <IconLock className="w-2.5 h-2.5 text-emerald-400" />
                                <span>AES-256</span>
                              </button>
                            </div>

                            {/* View Fullscreen button on hover */}
                            <div
                              onClick={() =>
                                setSelectedLightboxPhoto({
                                  url: msg.imageUrl || '',
                                  caption: msg.imageCaption || (msg.text !== 'Photo' ? msg.text : undefined),
                                  timestamp: msg.timestamp,
                                  message: msg,
                                })
                              }
                              className="absolute bottom-1.5 right-1.5 opacity-0 group-hover:opacity-100 transition-opacity bg-black/70 hover:bg-black/90 text-white text-[9.5px] px-1.5 py-0.5 rounded-full backdrop-blur-md flex items-center gap-1 shadow-md cursor-pointer border border-white/10 pointer-events-auto"
                            >
                              <IconEye className="w-2.5 h-2.5" />
                              <span>View</span>
                            </div>
                          </div>

                          {msg.imageCaption ? (
                            <div className="text-[12px] leading-snug font-normal tracking-tight break-words whitespace-pre-wrap px-0.5">
                              <span>{msg.imageCaption}</span>
                              <span
                                className={`inline-flex items-center gap-1 ml-2 float-right select-none text-[9px] font-mono tabular-nums leading-none translate-y-0.5 ${
                                  isSent
                                    ? resolvedTheme.senderMetaClass
                                    : resolvedTheme.receiverMetaClass
                                }`}
                              >
                                {msg.expiresAt && (
                                  <span
                                    title={`Disappearing message: dissolves in ${formatRemainingTime(msg.expiresAt)}`}
                                    className={`inline-flex items-center gap-0.5 text-[8.5px] font-mono mr-0.5 ${
                                      msg.expiresAt - currentTime < 10000
                                        ? 'text-amber-500 dark:text-amber-400 animate-pulse font-bold'
                                        : isSent
                                        ? 'text-amber-300 dark:text-amber-600'
                                        : 'text-amber-600 dark:text-amber-300'
                                    }`}
                                  >
                                    <IconHourglass className="w-2.5 h-2.5 shrink-0" />
                                    <span>{formatRemainingTime(msg.expiresAt)}</span>
                                  </span>
                                )}
                                {msg.isPinned && (
                                  <span
                                    title="Pinned message"
                                    className="inline-flex items-center text-amber-500 dark:text-amber-400 mr-0.5"
                                  >
                                    <IconPin className="w-2.5 h-2.5 rotate-45 shrink-0" />
                                  </span>
                                )}
                                <span>{msg.timestamp}</span>
                                {isSent && (
                                  <MessageReceiptIndicator
                                    status={msg.status}
                                    readReceiptsEnabled={readReceiptsEnabled}
                                    timestamp={msg.timestamp}
                                    readAt={msg.readAt}
                                    deliveredAt={msg.deliveredAt}
                                    sentAt={msg.sentAt}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      if (msg.status === 'failed') {
                                        handleRetryMessage(msg);
                                      } else {
                                        setSelectedInfoMessage(msg);
                                      }
                                    }}
                                  />
                                )}
                              </span>
                              <div className="clear-both" />
                            </div>
                          ) : (
                            <div
                              className={`flex items-center justify-end gap-1 select-none text-[9px] font-mono tabular-nums leading-none ${
                                isSent
                                  ? resolvedTheme.senderMetaClass
                                  : resolvedTheme.receiverMetaClass
                              }`}
                            >
                              {msg.expiresAt && (
                                <span
                                  title={`Disappearing message: dissolves in ${formatRemainingTime(msg.expiresAt)}`}
                                  className={`inline-flex items-center gap-0.5 text-[8.5px] font-mono mr-0.5 ${
                                    msg.expiresAt - currentTime < 10000
                                      ? 'text-amber-500 dark:text-amber-400 animate-pulse font-bold'
                                      : isSent
                                      ? 'text-amber-300 dark:text-amber-600'
                                      : 'text-amber-600 dark:text-amber-300'
                                  }`}
                                >
                                  <IconHourglass className="w-2.5 h-2.5 shrink-0" />
                                  <span>{formatRemainingTime(msg.expiresAt)}</span>
                                </span>
                              )}
                              {msg.isPinned && (
                                <span
                                  title="Pinned message"
                                  className="inline-flex items-center text-amber-500 dark:text-amber-400 mr-0.5"
                                >
                                  <IconPin className="w-2.5 h-2.5 rotate-45 shrink-0" />
                                </span>
                              )}
                              <span>{msg.timestamp}</span>
                              {isSent && (
                                <MessageReceiptIndicator
                                  status={msg.status}
                                  readReceiptsEnabled={readReceiptsEnabled}
                                  timestamp={msg.timestamp}
                                  readAt={msg.readAt}
                                  deliveredAt={msg.deliveredAt}
                                  sentAt={msg.sentAt}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (msg.status === 'failed') {
                                      handleRetryMessage(msg);
                                    } else {
                                      setSelectedInfoMessage(msg);
                                    }
                                  }}
                                />
                              )}
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="text-[12px] sm:text-[12.5px] leading-snug font-normal tracking-tight break-words whitespace-pre-wrap select-text">
                          <span>{msg.text}</span>
                          <span
                            className={`inline-flex items-center gap-1 ml-2 float-right select-none text-[9px] font-mono tabular-nums leading-none self-end translate-y-0.5 ${
                              isSent
                                ? resolvedTheme.senderMetaClass
                                : resolvedTheme.receiverMetaClass
                            }`}
                          >
                            {msg.expiresAt && (
                              <span
                                title={`Disappearing message: dissolves in ${formatRemainingTime(msg.expiresAt)}`}
                                className={`inline-flex items-center gap-0.5 text-[8.5px] font-mono mr-0.5 ${
                                  msg.expiresAt - currentTime < 10000
                                    ? 'text-amber-500 dark:text-amber-400 animate-pulse font-bold'
                                    : isSent
                                    ? 'text-amber-300 dark:text-amber-600'
                                    : 'text-amber-600 dark:text-amber-300'
                                }`}
                              >
                                <IconHourglass className="w-2.5 h-2.5 shrink-0" />
                                <span>{formatRemainingTime(msg.expiresAt)}</span>
                              </span>
                            )}
                            {msg.isPinned && (
                              <span
                                title="Pinned message"
                                className="inline-flex items-center text-amber-500 dark:text-amber-400 mr-0.5"
                              >
                                <IconPin className="w-2.5 h-2.5 rotate-45 shrink-0" />
                              </span>
                            )}

                            {/* Hybrid Transport Indicator Badge */}
                            {msg.meshStatus === 'synced' ? (
                              <span
                                title={`Synced via cloud at ${msg.syncedAt || msg.timestamp}`}
                                className="inline-flex items-center text-sky-500 mr-0.5"
                              >
                                <IconCloud className="w-2.5 h-2.5" />
                              </span>
                            ) : msg.transport === 'offline-queued' || msg.meshStatus === 'queued' ? (
                              <span
                                title="Offline: Buffered in store-and-forward queue. Will sync automatically upon reconnect."
                                className="inline-flex items-center gap-0.5 text-amber-500 font-mono text-[8px] mr-0.5"
                              >
                                <IconHardDrive className="w-2.5 h-2.5" />
                                <span>queued</span>
                              </span>
                            ) : msg.transport === 'bluetooth-le' || msg.transport === 'bluetooth-mesh' ? (
                              <span
                                title={`Delivered via Bluetooth LE Mesh (${msg.meshHops || 1} hop)`}
                                className="inline-flex items-center gap-0.5 text-emerald-500 mr-0.5 font-mono text-[8px]"
                              >
                                <IconBluetooth className="w-2.5 h-2.5" />
                                {msg.meshHops && msg.meshHops > 1 ? `${msg.meshHops}h` : ''}
                              </span>
                            ) : msg.transport === 'wifi-direct' ? (
                              <span
                                title="Delivered via Wi-Fi Direct Peer Link"
                                className="inline-flex items-center text-emerald-500 mr-0.5"
                              >
                                <IconWifi className="w-2.5 h-2.5" />
                              </span>
                            ) : null}

                            <span>{msg.timestamp}</span>
                            {isSent && (
                              <MessageReceiptIndicator
                                status={msg.status}
                                readReceiptsEnabled={readReceiptsEnabled}
                                timestamp={msg.timestamp}
                                readAt={msg.readAt}
                                deliveredAt={msg.deliveredAt}
                                sentAt={msg.sentAt}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (msg.status === 'failed') {
                                    handleRetryMessage(msg);
                                  } else {
                                    setSelectedInfoMessage(msg);
                                  }
                                }}
                              />
                            )}
                          </span>
                          <div className="clear-both" />
                        </div>
                      )}
                    </motion.div>

                    {/* Emoji Reaction Badges Attached to Message Bubble */}
                    {msg.reactions && Object.keys(msg.reactions).length > 0 && (
                      <div
                        className={`flex flex-wrap items-center gap-1 mt-1 z-10 ${
                          isSent ? 'justify-end mr-0.5' : 'justify-start ml-0.5'
                        }`}
                      >
                        {Object.entries(msg.reactions).map(([emoji, userIds]) => {
                          if (!userIds || userIds.length === 0) return null;
                          const count = userIds.length;
                          const currentUserId = auth.currentUser?.uid || 'you';
                          const hasReacted = userIds.includes(currentUserId);

                          return (
                            <motion.button
                              key={emoji}
                              layout="position"
                              initial={{ scale: 0.8, opacity: 0 }}
                              animate={{ scale: 1, opacity: 1 }}
                              exit={{ scale: 0.8, opacity: 0 }}
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleToggleReaction(msg.id, emoji);
                              }}
                              className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-xs font-medium border shadow-2xs transition-all active:scale-90 cursor-pointer select-none ${
                                hasReacted
                                  ? 'bg-emerald-50 text-emerald-900 border-emerald-300 dark:bg-emerald-950/80 dark:text-emerald-200 dark:border-emerald-700/80 shadow-xs'
                                  : 'bg-white/95 text-zinc-700 border-zinc-200/90 dark:bg-zinc-850/95 dark:text-zinc-300 dark:border-zinc-700/80 hover:bg-zinc-100 dark:hover:bg-zinc-750'
                              }`}
                              title={`${count} ${count === 1 ? 'reaction' : 'reactions'}${
                                hasReacted ? ' (including you - tap to remove)' : ' (tap to react)'
                              }`}
                            >
                              <span className="text-[13px] leading-none">{emoji}</span>
                              {count > 1 && (
                                <span className="text-[10px] font-mono leading-none opacity-85 font-semibold">
                                  {count}
                                </span>
                              )}
                            </motion.button>
                          );
                        })}
                      </div>
                    )}
                  </motion.div>
                </React.Fragment>
              );
            })}
          </AnimatePresence>
          )}

          {/* Real-time typing bubble in conversation stream */}
          <AnimatePresence>
            {isTyping && (
              <motion.div
                layout="position"
                initial={{ opacity: 0, scale: 0.92, y: 8, x: -6 }}
                animate={{ opacity: 1, scale: 1, y: 0, x: 0 }}
                exit={{ opacity: 0, scale: 0.94, y: -4, x: -4 }}
                transition={{
                  type: 'spring',
                  damping: 25,
                  stiffness: 380,
                  mass: 0.6,
                }}
                className="flex items-end gap-2.5 pt-1 pb-1 select-none"
              >
                <Avatar
                  initials={thread.person.initials}
                  name={thread.person.name}
                  presence={thread.person.presence}
                  size="xs"
                  gradient={thread.person.avatarColor}
                />
                <TypingIndicator
                  variant="bubble"
                  label={`${thread.person.name.split(' ')[0]} is writing...`}
                />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Scroll anchor */}
          <div ref={messagesEndRef} className="h-1" />
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 3. Bottom Composer with Microphone, Photo & Voice Recording  */}
      {/* ------------------------------------------------------------- */}
      <footer className="shrink-0 border-t border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 backdrop-blur-md px-3 pt-2.5 pb-3 z-30 shadow-lg">
        {/* Hidden input for photo library selection */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileSelect}
          className="hidden"
        />

        {/* Staged Photo Preview Bar */}
        {stagedPhoto && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            className="flex items-center justify-between gap-2.5 px-2.5 py-1.5 mb-2 rounded-xl bg-zinc-100 dark:bg-zinc-900 border border-zinc-200/90 dark:border-zinc-800"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <img
                src={stagedPhoto.url}
                alt="Selected photo"
                className="w-9 h-9 rounded-lg object-cover border border-zinc-300 dark:border-zinc-700 shrink-0"
              />
              <div className="min-w-0">
                <p className="text-[11px] font-medium text-zinc-900 dark:text-zinc-100 truncate">
                  {stagedPhoto.name || 'Photo selected'}
                </p>
                <p className="text-[10px] text-zinc-400 dark:text-zinc-500 truncate">
                  Ready to send · add quiet note or press Send
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setStagedPhoto(null)}
              className="p-1 rounded-md text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-200/60 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
              title="Remove photo"
              aria-label="Remove photo"
            >
              <IconClose className="w-3.5 h-3.5" />
            </button>
          </motion.div>
        )}

        <AnimatePresence mode="wait">
          {recordingState === 'recording' ? (
            <motion.div
              key="recording-interface"
              initial={{ opacity: 0, y: 3 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 3 }}
              transition={{ duration: 0.15 }}
              className="flex items-center justify-between gap-2 h-10 px-3 rounded-xl bg-rose-500/10 dark:bg-rose-950/30 border border-rose-200/90 dark:border-rose-900/60"
            >
              {/* Cancel / Discard Recording */}
              <button
                type="button"
                onClick={cancelRecording}
                className="p-1 rounded-md text-rose-600 dark:text-rose-400 hover:bg-rose-500/15 transition-colors cursor-pointer flex items-center gap-1 text-xs"
                title="Discard voice recording"
                aria-label="Discard voice recording"
              >
                <IconDelete className="w-3.5 h-3.5" />
                <span className="text-[11px] hidden sm:inline">Cancel</span>
              </button>

              {/* Pulsing Recording Indicator & Live Counter */}
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse" />
                <span className="text-xs font-mono font-medium text-rose-600 dark:text-rose-400 tabular-nums">
                  {Math.floor(recordingSeconds / 60)}:
                  {(recordingSeconds % 60).toString().padStart(2, '0')}
                </span>
              </div>

              {/* Real-Time Live Waveform Visualizer */}
              <div className="flex items-center gap-1 h-4 flex-1 justify-center max-w-[130px]">
                {liveWaveform.map((level, idx) => (
                  <span
                    key={idx}
                    style={{ height: `${Math.max(4, Math.round(level * 18))}px` }}
                    className="w-1 rounded-full bg-rose-500/80 transition-all duration-75"
                  />
                ))}
              </div>

              <div className="flex items-center gap-1.5">
                {/* Pause Button -> Enters Voice Preview Mode */}
                <button
                  type="button"
                  onClick={pauseRecording}
                  className="h-7 px-2.5 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-850 text-zinc-800 dark:text-zinc-200 text-xs font-medium flex items-center gap-1 transition-all shadow-2xs hover:bg-zinc-100 dark:hover:bg-zinc-750 cursor-pointer active:scale-95"
                  title="Pause to preview recording"
                  aria-label="Pause to preview recording"
                >
                  <IconPause className="w-3 h-3 text-zinc-600 dark:text-zinc-300" />
                  <span className="hidden sm:inline">Pause</span>
                </button>

                {/* Direct Send button */}
                <button
                  type="button"
                  onClick={sendVoiceRecording}
                  className="h-7 px-2.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-medium text-xs flex items-center gap-1 transition-all shadow-xs cursor-pointer active:scale-95"
                  title="Send voice message directly"
                  aria-label="Send voice message directly"
                >
                  <IconSend className="w-3 h-3" />
                  <span>Send</span>
                </button>
              </div>
            </motion.div>
          ) : recordingState === 'paused' ? (
            /* Voice Preview Interface: Listen, Resume/Re-record, and manually tap Send */
            <motion.div
              key="recording-preview"
              initial={{ opacity: 0, y: 3 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 3 }}
              transition={{ duration: 0.15 }}
              className="flex flex-col gap-2 p-2.5 rounded-2xl bg-zinc-100/90 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm"
            >
              {/* Top Row: Play/Pause Audio Preview & Waveform Scrubber */}
              <div className="flex items-center gap-2.5">
                {/* Play / Pause Preview Button */}
                <button
                  type="button"
                  onClick={togglePlayPreview}
                  className="h-8 w-8 rounded-full bg-zinc-950 text-white dark:bg-zinc-100 dark:text-zinc-950 flex items-center justify-center shrink-0 shadow-xs cursor-pointer active:scale-95 transition-all hover:opacity-90"
                  title={isPreviewPlaying ? 'Pause preview' : 'Listen to preview'}
                  aria-label={isPreviewPlaying ? 'Pause preview' : 'Listen to preview'}
                >
                  {isPreviewPlaying ? (
                    <IconPause className="w-3.5 h-3.5" />
                  ) : (
                    <IconPlay className="w-3.5 h-3.5 ml-0.5" />
                  )}
                </button>

                {/* Interactive Waveform Scrubber with Playback Indicator */}
                <div className="flex-1 flex flex-col justify-center gap-1 min-w-0">
                  <div
                    onClick={(e) => {
                      const rect = e.currentTarget.getBoundingClientRect();
                      const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
                      handleSeekPreview(ratio);
                    }}
                    className="h-5 flex items-center gap-1 cursor-pointer py-1 group select-none"
                    title="Click to scrub audio preview"
                  >
                    {Array.from({ length: 24 }).map((_, idx) => {
                      const barRatio = idx / 24;
                      const isPlayed =
                        barRatio <= previewPlaybackTime / Math.max(recordingSeconds, 1);
                      const baseHeight = 6 + Math.abs(Math.sin((idx + 1) * 0.75)) * 12;
                      return (
                        <span
                          key={idx}
                          style={{ height: `${baseHeight}px` }}
                          className={`w-1 rounded-full transition-colors duration-75 ${
                            isPlayed
                              ? 'bg-zinc-950 dark:bg-zinc-100'
                              : 'bg-zinc-300 dark:bg-zinc-700 group-hover:bg-zinc-400 dark:group-hover:bg-zinc-600'
                          }`}
                        />
                      );
                    })}
                  </div>

                  {/* Playback time counters */}
                  <div className="flex items-center justify-between text-[10px] font-mono text-zinc-500 dark:text-zinc-400 select-none">
                    <span>
                      {Math.floor(previewPlaybackTime / 60)}:
                      {(Math.floor(previewPlaybackTime % 60)).toString().padStart(2, '0')}
                    </span>
                    <span className="text-zinc-400 dark:text-zinc-500">
                      Voice Preview · {Math.floor(recordingSeconds / 60)}:
                      {(recordingSeconds % 60).toString().padStart(2, '0')}
                    </span>
                  </div>
                </div>
              </div>

              {/* Bottom Actions Row: Discard, Re-record, Resume, and Send */}
              <div className="flex items-center justify-between pt-1 border-t border-zinc-200/60 dark:border-zinc-800/80">
                <div className="flex items-center gap-1.5">
                  {/* Discard */}
                  <button
                    type="button"
                    onClick={cancelRecording}
                    className="h-8 px-2.5 rounded-lg text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 text-xs flex items-center gap-1 font-medium transition-colors cursor-pointer"
                    title="Discard voice recording"
                    aria-label="Discard recording"
                  >
                    <IconDelete className="w-3.5 h-3.5" />
                    <span>Delete</span>
                  </button>

                  {/* Re-record */}
                  <button
                    type="button"
                    onClick={reRecordVoice}
                    className="h-8 px-2.5 rounded-lg text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200/60 dark:hover:bg-zinc-800 text-xs flex items-center gap-1 font-medium transition-colors cursor-pointer"
                    title="Re-record from scratch"
                    aria-label="Re-record"
                  >
                    <IconRotateCcw className="w-3.5 h-3.5" />
                    <span>Re-record</span>
                  </button>

                  {/* Resume recording */}
                  <button
                    type="button"
                    onClick={resumeRecording}
                    className="h-8 px-2.5 rounded-lg border border-rose-300 dark:border-rose-900 bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-300 hover:bg-rose-100 dark:hover:bg-rose-900/60 text-xs flex items-center gap-1.5 font-medium transition-all cursor-pointer"
                    title="Resume recording audio"
                    aria-label="Resume recording"
                  >
                    <IconMic className="w-3.5 h-3.5" />
                    <span>Resume</span>
                  </button>
                </div>

                {/* Manually Tap Send */}
                <button
                  type="button"
                  onClick={sendVoiceRecording}
                  className="h-8 px-3.5 rounded-xl bg-zinc-950 text-white dark:bg-zinc-100 dark:text-zinc-950 text-xs font-semibold flex items-center gap-1.5 shadow-xs hover:opacity-90 active:scale-95 transition-all cursor-pointer"
                  title="Send voice note"
                  aria-label="Send voice note"
                >
                  <IconSend className="w-3.5 h-3.5" />
                  <span>Send</span>
                </button>
              </div>
            </motion.div>
          ) : (
            <form onSubmit={handleSendMessage} className="flex items-center gap-1.5">
              {/* Attachment Toggle */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => {
                    setShowAttachMenu(!showAttachMenu);
                    setShowPhotoPicker(false);
                  }}
                  className="p-2 rounded-md text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors cursor-pointer"
                  aria-label="Attach media or document"
                >
                  <IconAttachment className="w-4 h-4" />
                </button>

                {/* Attachment Menu */}
                <AnimatePresence>
                  {showAttachMenu && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95, y: 4 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95, y: 4 }}
                      transition={{ duration: 0.15 }}
                      className="absolute bottom-11 left-0 z-50 w-44 p-1 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 shadow-xl text-xs space-y-0.5"
                    >
                      <button
                        type="button"
                        onClick={() => {
                          setShowAttachMenu(false);
                          handleLaunchCamera();
                        }}
                        className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer text-left"
                      >
                        <IconCamera className="w-3.5 h-3.5 text-zinc-400" />
                        <span>Take Photo</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setShowAttachMenu(false);
                          fileInputRef.current?.click();
                        }}
                        className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer text-left"
                      >
                        <IconGallery className="w-3.5 h-3.5 text-zinc-400" />
                        <span>Photo Library</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowAttachMenu(false)}
                        className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer text-left"
                      >
                        <IconFiles className="w-3.5 h-3.5 text-zinc-400" />
                        <span>Quiet Document</span>
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Dedicated Photo Attachment Icon & Picker */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => {
                    setShowPhotoPicker(!showPhotoPicker);
                    setShowAttachMenu(false);
                  }}
                  className={`p-2 rounded-md transition-colors cursor-pointer ${
                    showPhotoPicker || stagedPhoto
                      ? 'text-zinc-950 dark:text-zinc-50 bg-zinc-200/80 dark:bg-zinc-800'
                      : 'text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-900'
                  }`}
                  title="Attach photo or take picture"
                  aria-label="Attach photo or take picture"
                >
                  <IconCamera className="w-4 h-4" />
                </button>

                {/* Photo Picker Popover */}
                <AnimatePresence>
                  {showPhotoPicker && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95, y: 4 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95, y: 4 }}
                      transition={{ duration: 0.15 }}
                      className="absolute bottom-11 left-0 z-50 w-72 p-2.5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200/90 dark:border-zinc-800 shadow-2xl space-y-2.5"
                    >
                      <div className="flex items-center justify-between pb-1 border-b border-zinc-100 dark:border-zinc-800">
                        <span className="text-[11px] font-semibold text-zinc-900 dark:text-zinc-100 uppercase tracking-wider">
                          Share Photo
                        </span>
                        <button
                          type="button"
                          onClick={() => setShowPhotoPicker(false)}
                          className="p-1 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 rounded cursor-pointer"
                          aria-label="Close photo options"
                        >
                          <IconClose className="w-3 h-3" />
                        </button>
                      </div>

                      {/* Primary Actions: Take Photo & Choose Photo */}
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setShowPhotoPicker(false);
                            handleLaunchCamera();
                          }}
                          className="flex flex-col items-center justify-center gap-1.5 p-2.5 rounded-xl bg-zinc-100/90 dark:bg-zinc-800/80 hover:bg-zinc-200/80 dark:hover:bg-zinc-700/80 transition-colors cursor-pointer text-center group"
                        >
                          <div className="w-8 h-8 rounded-full bg-zinc-950 text-zinc-50 dark:bg-zinc-100 dark:text-zinc-950 flex items-center justify-center group-hover:scale-105 transition-transform">
                            <IconCamera className="w-4 h-4" />
                          </div>
                          <span className="text-[11px] font-medium text-zinc-800 dark:text-zinc-200">Take Photo</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setShowPhotoPicker(false);
                            fileInputRef.current?.click();
                          }}
                          className="flex flex-col items-center justify-center gap-1.5 p-2.5 rounded-xl bg-zinc-100/90 dark:bg-zinc-800/80 hover:bg-zinc-200/80 dark:hover:bg-zinc-700/80 transition-colors cursor-pointer text-center group"
                        >
                          <div className="w-8 h-8 rounded-full bg-zinc-200 dark:bg-zinc-700 text-zinc-800 dark:text-zinc-200 flex items-center justify-center group-hover:scale-105 transition-transform">
                            <IconGallery className="w-4 h-4" />
                          </div>
                          <span className="text-[11px] font-medium text-zinc-800 dark:text-zinc-200">Photo Library</span>
                        </button>
                      </div>

                      {/* Quiet Serene Presets Gallery */}
                      <div className="space-y-1.5 pt-0.5">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] uppercase font-medium text-zinc-400 dark:text-zinc-500 tracking-wider">
                            Serene Presets
                          </span>
                          <span className="text-[9.5px] text-zinc-400">One-tap</span>
                        </div>
                        <div className="grid grid-cols-4 gap-1.5">
                          {SERENE_PHOTO_PRESETS.map((preset) => (
                            <button
                              key={preset.id}
                              type="button"
                              onClick={() => {
                                setStagedPhoto({
                                  url: preset.url,
                                  name: preset.title,
                                });
                                setShowPhotoPicker(false);
                                inputRef.current?.focus();
                              }}
                              className="group relative rounded-lg overflow-hidden border border-zinc-200/80 dark:border-zinc-700/80 aspect-square cursor-pointer hover:border-zinc-400 dark:hover:border-zinc-500 transition-all hover:scale-105"
                              title={`${preset.title}: ${preset.subtitle}`}
                            >
                              <img
                                src={preset.url}
                                alt={preset.title}
                                className="w-full h-full object-cover"
                                loading="lazy"
                              />
                              <div className="absolute inset-0 bg-black/15 group-hover:bg-black/0 transition-colors" />
                            </button>
                          ))}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Rectangular Text Input */}
              <div className="flex-1 relative">
                <input
                  ref={inputRef}
                  type="text"
                  value={draftMessage}
                  onChange={(e) => handleDraftChange(e.target.value)}
                  placeholder={stagedPhoto ? 'Add a quiet caption...' : 'Type a quiet whisper...'}
                  className={`w-full h-10 px-3.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 text-zinc-950 dark:text-zinc-50 text-xs placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:outline-none ${resolvedTheme.inputBorderClass} transition-colors font-sans shadow-2xs`}
                />
              </div>

              {/* Microphone Button (Record voice message) */}
              <button
                type="button"
                onClick={startRecording}
                className="h-10 w-10 shrink-0 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 text-zinc-600 hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 flex items-center justify-center transition-all cursor-pointer shadow-2xs active:scale-95"
                title="Record voice message"
                aria-label="Record voice message"
              >
                <IconMic className="w-4 h-4 text-zinc-700 dark:text-zinc-300" />
              </button>

              {/* Always Visible Send Button */}
              <button
                type="submit"
                disabled={!draftMessage.trim() && !stagedPhoto}
                className={`h-10 px-3.5 rounded-xl font-medium text-xs flex items-center gap-1.5 transition-all shadow-2xs shrink-0 select-none ${
                  draftMessage.trim() || stagedPhoto
                    ? `${resolvedTheme.sendButtonClass} shadow-xs active:scale-95 cursor-pointer`
                    : 'bg-zinc-100 dark:bg-zinc-900 text-zinc-400 dark:text-zinc-600 border border-zinc-200 dark:border-zinc-800 opacity-60 cursor-not-allowed'
                }`}
                style={draftMessage.trim() || stagedPhoto ? resolvedTheme.sendButtonStyle : undefined}
                title={draftMessage.trim() || stagedPhoto ? 'Send whisper' : 'Type a message to send'}
                aria-label="Send message"
              >
                <IconSend className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Send</span>
              </button>
            </form>
          )}
        </AnimatePresence>

        {/* Quiet Subtext */}
        <div className="flex items-center justify-between mt-1.5 px-1 text-[10px] text-zinc-400 dark:text-zinc-500 font-mono select-none">
          <span className="flex items-center gap-1">
            <IconSecurity className="w-2.5 h-2.5 text-zinc-400 dark:text-zinc-500" />
            End-to-end encrypted
          </span>
          {disappearingTimer !== 'off' ? (
            <button
              type="button"
              onClick={() => setIsTimerModalOpen(true)}
              className="flex items-center gap-1 text-amber-600 dark:text-amber-400 hover:underline cursor-pointer"
            >
              <IconHourglass className="w-2.5 h-2.5" />
              <span>Auto-deletes in {currentTimerConfig.badgeLabel}</span>
            </button>
          ) : (
            <span>Peaceful pace · No urgency</span>
          )}
        </div>
      </footer>

      {/* Full-Screen Photo Lightbox */}
      <AnimatePresence>
        {selectedLightboxPhoto && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelectedLightboxPhoto(null)}
            className="fixed inset-0 z-60 bg-black/92 backdrop-blur-md flex flex-col items-center justify-between p-4 cursor-zoom-out select-none"
          >
            <div
              className="w-full flex items-center justify-between text-white/80 max-w-2xl px-2"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="text-xs">
                <p className="font-semibold text-white flex items-center gap-1.5">
                  <span>{thread.person.name}</span>
                  <span className="inline-flex items-center gap-0.5 text-[9.5px] font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 rounded-full">
                    <IconLock className="w-2.5 h-2.5" />
                    AES-256 E2EE
                  </span>
                </p>
                <p className="text-[10.5px] text-white/60 font-mono mt-0.5">{selectedLightboxPhoto.timestamp}</p>
              </div>

              <div className="flex items-center gap-2">
                {selectedLightboxPhoto.message && (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedPhotoCrypto(selectedLightboxPhoto.message || null);
                    }}
                    className="px-2.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-mono flex items-center gap-1.5 transition-colors cursor-pointer border border-white/15"
                    title="View cryptographic proof and encryption details"
                  >
                    <IconSecurity className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="hidden sm:inline">Cryptographic Proof</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => {
                    const a = document.createElement('a');
                    a.href = selectedLightboxPhoto.url;
                    a.download = `among-photo-${Date.now()}.jpg`;
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                  }}
                  className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
                  title="Save decrypted photo"
                >
                  <IconDownload className="w-4 h-4" />
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedLightboxPhoto(null)}
                  className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white cursor-pointer transition-colors"
                  aria-label="Close full view"
                >
                  <IconClose className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div
              className="relative max-w-2xl max-h-[75vh] flex items-center justify-center my-auto p-2"
              onClick={(e) => e.stopPropagation()}
            >
              <img
                src={selectedLightboxPhoto.url}
                alt={selectedLightboxPhoto.caption || 'Expanded photo'}
                className="max-h-[72vh] max-w-full rounded-2xl object-contain shadow-2xl border border-white/15"
              />
            </div>

            {selectedLightboxPhoto.caption ? (
              <div
                className="max-w-2xl w-full text-center px-4 py-2.5 bg-black/60 backdrop-blur-md rounded-2xl border border-white/15 text-white/90 text-xs"
                onClick={(e) => e.stopPropagation()}
              >
                <p className="leading-relaxed">{selectedLightboxPhoto.caption}</p>
              </div>
            ) : (
              <div className="h-4" />
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Peaceful Floating Notification Toast */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -14, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -14, scale: 0.96 }}
            transition={{ type: 'spring', damping: 25, stiffness: 400 }}
            className="fixed top-16 left-1/2 -translate-x-1/2 z-70 px-3.5 py-1.5 rounded-full bg-zinc-900/95 dark:bg-zinc-100/95 text-zinc-100 dark:text-zinc-950 text-xs font-medium shadow-xl backdrop-blur-md flex items-center gap-2 pointer-events-none border border-white/10 dark:border-black/10"
          >
            <IconCheck className="w-3.5 h-3.5 text-emerald-400 dark:text-emerald-600 shrink-0" />
            <span>{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Long-Press / Context Menu for Individual Message */}
      <AnimatePresence>
        {activeMessageMenu && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.16 }}
            onClick={() => setActiveMessageMenu(null)}
            className="fixed inset-0 z-50 bg-black/40 dark:bg-black/60 backdrop-blur-xs flex flex-col items-center justify-center p-4 select-none"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.92, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: 12 }}
              transition={{ type: 'spring', damping: 26, stiffness: 380 }}
              onClick={(e) => e.stopPropagation()}
              className={`w-full max-w-sm flex flex-col ${
                activeMessageMenu.message.sender === 'you' ? 'items-end' : 'items-start'
              } gap-2.5`}
            >
              {/* Emoji Quick Reactions Bar */}
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 6 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ duration: 0.18, ease: 'easeOut' }}
                className="flex items-center gap-1 p-1 px-1.5 bg-white/95 dark:bg-zinc-900/95 border border-zinc-200/90 dark:border-zinc-800 rounded-full shadow-2xl backdrop-blur-xl z-20 select-none"
              >
                {POPULAR_REACTION_EMOJIS.map((emoji) => {
                  const currentUserId = auth.currentUser?.uid || 'you';
                  const userList = activeMessageMenu.message.reactions?.[emoji] || [];
                  const hasReacted = userList.includes(currentUserId);

                  return (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => handleToggleReaction(activeMessageMenu.message.id, emoji)}
                      className={`w-8.5 h-8.5 rounded-full flex items-center justify-center text-lg transition-all duration-150 cursor-pointer active:scale-90 hover:scale-125 ${
                        hasReacted
                          ? 'bg-emerald-100 dark:bg-emerald-950/80 scale-110 ring-2 ring-emerald-500 shadow-xs'
                          : 'hover:bg-zinc-100 dark:hover:bg-zinc-800'
                      }`}
                      title={hasReacted ? `Remove ${emoji}` : `React with ${emoji}`}
                    >
                      <span className="leading-none select-none">{emoji}</span>
                    </button>
                  );
                })}

                <div className="w-[1px] h-4 bg-zinc-200 dark:bg-zinc-800 mx-0.5" />

                {/* More Emojis Toggle Button */}
                <button
                  type="button"
                  onClick={() => setShowAllEmojisInMenu(!showAllEmojisInMenu)}
                  className={`w-7.5 h-7.5 rounded-full flex items-center justify-center text-zinc-500 hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all text-xs font-semibold cursor-pointer ${
                    showAllEmojisInMenu
                      ? 'bg-zinc-200 dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 scale-105'
                      : ''
                  }`}
                  title="More reaction emojis"
                  aria-label="More emoji reactions"
                >
                  <span className="text-sm leading-none">+</span>
                </button>
              </motion.div>

              {/* Extended Emoji Palette Popover */}
              {showAllEmojisInMenu && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: -4 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="p-2 max-w-[280px] bg-white/98 dark:bg-zinc-900/98 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl backdrop-blur-xl grid grid-cols-6 gap-1 z-25 select-none"
                >
                  {EXTENDED_REACTION_EMOJIS.map((emoji) => {
                    const currentUserId = auth.currentUser?.uid || 'you';
                    const hasReacted = activeMessageMenu.message.reactions?.[emoji]?.includes(currentUserId);
                    return (
                      <button
                        key={emoji}
                        type="button"
                        onClick={() => handleToggleReaction(activeMessageMenu.message.id, emoji)}
                        className={`w-8.5 h-8.5 rounded-xl flex items-center justify-center text-lg hover:scale-125 active:scale-95 transition-all cursor-pointer ${
                          hasReacted
                            ? 'bg-emerald-100 dark:bg-emerald-950 ring-1 ring-emerald-500'
                            : 'hover:bg-zinc-100 dark:hover:bg-zinc-800'
                        }`}
                        title={`React with ${emoji}`}
                      >
                        <span className="leading-none">{emoji}</span>
                      </button>
                    );
                  })}
                </motion.div>
              )}

              {/* Minimalist Action Pill Bar */}
              <div className="flex items-center gap-0.5 p-1 bg-white dark:bg-zinc-900 border border-zinc-200/90 dark:border-zinc-800 rounded-2xl shadow-2xl backdrop-blur-xl">
                {/* Info / Receipts Option */}
                <button
                  type="button"
                  onClick={() => {
                    const target = activeMessageMenu.message;
                    setActiveMessageMenu(null);
                    setSelectedInfoMessage(target);
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-200 transition-colors cursor-pointer text-xs font-medium"
                  title="View read receipt and message details"
                >
                  <IconCheckDouble className="w-3.5 h-3.5 text-sky-500 dark:text-sky-400" />
                  <span>Info</span>
                </button>

                <div className="w-[1px] h-3.5 bg-zinc-200 dark:bg-zinc-800" />

                {/* Copy Option */}
                <button
                  type="button"
                  onClick={() => handleCopyMessage(activeMessageMenu.message)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-200 transition-colors cursor-pointer text-xs font-medium"
                  title="Copy message text to clipboard"
                >
                  <IconCopy className="w-3.5 h-3.5" />
                  <span>Copy</span>
                </button>

                <div className="w-[1px] h-3.5 bg-zinc-200 dark:bg-zinc-800" />

                {/* Forward Option */}
                <button
                  type="button"
                  onClick={() => {
                    const target = activeMessageMenu.message;
                    setActiveMessageMenu(null);
                    setForwardModalMessage(target);
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-200 transition-colors cursor-pointer text-xs font-medium"
                  title="Forward this message to a contact"
                >
                  <IconForward className="w-3.5 h-3.5" />
                  <span>Forward</span>
                </button>

                <div className="w-[1px] h-3.5 bg-zinc-200 dark:bg-zinc-800" />

                {/* Pin / Unpin Option */}
                <button
                  type="button"
                  onClick={() => handleTogglePinMessage(activeMessageMenu.message)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-200 transition-colors cursor-pointer text-xs font-medium"
                  title={
                    activeMessageMenu.message.isPinned
                      ? 'Unpin this message'
                      : 'Pin message to top of conversation thread'
                  }
                >
                  <IconPin
                    className={`w-3.5 h-3.5 rotate-45 ${
                      activeMessageMenu.message.isPinned
                        ? 'text-amber-500 dark:text-amber-400'
                        : ''
                    }`}
                  />
                  <span>{activeMessageMenu.message.isPinned ? 'Unpin' : 'Pin'}</span>
                </button>

                <div className="w-[1px] h-3.5 bg-zinc-200 dark:bg-zinc-800" />

                {/* Delete Option */}
                <button
                  type="button"
                  onClick={() => handleDeleteMessage(activeMessageMenu.message.id)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl hover:bg-rose-50 dark:hover:bg-rose-950/30 text-rose-600 dark:text-rose-400 transition-colors cursor-pointer text-xs font-medium"
                  title="Delete this message"
                >
                  <IconDelete className="w-3.5 h-3.5" />
                  <span>Delete</span>
                </button>
              </div>

              {/* Highlighted Message Card Spotlight */}
              <div
                className={`relative w-fit max-w-[85%] rounded-lg border px-2.5 py-1 shadow-2xl transition-all ${
                  activeMessageMenu.message.sender === 'you'
                    ? resolvedTheme.senderBubbleClass
                    : resolvedTheme.receiverBubbleClass
                } ring-2 ring-emerald-500/30`}
                style={
                  activeMessageMenu.message.sender === 'you'
                    ? resolvedTheme.senderBubbleStyle
                    : resolvedTheme.receiverBubbleStyle
                }
              >
                {activeMessageMenu.message.isPinned && (
                  <div className="flex items-center gap-1 text-[10px] font-mono text-amber-500 dark:text-amber-400 mb-1 font-medium">
                    <IconPin className="w-2.5 h-2.5 rotate-45" />
                    <span>Pinned to top</span>
                  </div>
                )}
                {activeMessageMenu.message.type === 'audio' ? (
                  <VoiceMessagePlayer
                    audioUrl={activeMessageMenu.message.audioUrl}
                    duration={activeMessageMenu.message.audioDuration || 4}
                    waveformData={activeMessageMenu.message.waveformData}
                    isSent={activeMessageMenu.message.sender === 'you'}
                  />
                ) : activeMessageMenu.message.type === 'photo' ? (
                  <div className="space-y-1.5">
                    <img
                      src={activeMessageMenu.message.imageUrl}
                      alt={activeMessageMenu.message.imageCaption || 'Attached photo'}
                      className="w-full max-h-48 object-cover rounded-md"
                    />
                    {activeMessageMenu.message.imageCaption && (
                      <p className="text-[12px] leading-snug">
                        {activeMessageMenu.message.imageCaption}
                      </p>
                    )}
                  </div>
                ) : (
                  <p className="text-[12.5px] leading-snug font-normal tracking-tight break-words whitespace-pre-wrap">
                    {activeMessageMenu.message.text}
                  </p>
                )}

                {/* Attached reaction badges on spotlight card */}
                {activeMessageMenu.message.reactions &&
                  Object.keys(activeMessageMenu.message.reactions).length > 0 && (
                    <div className="flex flex-wrap items-center gap-1 mt-1.5 pt-1 border-t border-black/5 dark:border-white/5">
                      {Object.entries(activeMessageMenu.message.reactions).map(([emoji, userIds]) => {
                        if (!userIds || userIds.length === 0) return null;
                        const currentUserId = auth.currentUser?.uid || 'you';
                        const hasReacted = userIds.includes(currentUserId);
                        return (
                          <span
                            key={emoji}
                            className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-xs font-medium border ${
                              hasReacted
                                ? 'bg-emerald-100 text-emerald-900 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-200 dark:border-emerald-700'
                                : 'bg-white/80 dark:bg-zinc-800/80 text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700'
                            }`}
                          >
                            <span className="text-[13px] leading-none">{emoji}</span>
                            {userIds.length > 1 && (
                              <span className="text-[10px] font-mono opacity-80 font-semibold">
                                {userIds.length}
                              </span>
                            )}
                          </span>
                        );
                      })}
                    </div>
                  )}

                <div className="flex items-center justify-end gap-1 mt-1 text-[9.5px] font-mono opacity-80">
                  <span>{activeMessageMenu.message.timestamp}</span>
                  {activeMessageMenu.message.sender === 'you' && (
                    <MessageReceiptIndicator
                      status={activeMessageMenu.message.status}
                      readReceiptsEnabled={readReceiptsEnabled}
                      timestamp={activeMessageMenu.message.timestamp}
                      readAt={activeMessageMenu.message.readAt}
                      deliveredAt={activeMessageMenu.message.deliveredAt}
                      sentAt={activeMessageMenu.message.sentAt}
                    />
                  )}
                </div>
              </div>

              <span className="text-[11px] text-zinc-400 dark:text-zinc-500 tracking-wide font-sans">
                Tap outside or press Esc to dismiss
              </span>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Forward Message Modal */}
      <AnimatePresence>
        {forwardModalMessage && (
          <div
            onClick={() => {
              setForwardModalMessage(null);
              setForwardSearchQuery('');
            }}
            className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs select-none"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 8 }}
              transition={{ type: 'spring', damping: 28, stiffness: 380 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-sm rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200/90 dark:border-zinc-800 shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-100 dark:border-zinc-800">
                <div className="flex items-center gap-2">
                  <IconForward className="w-4 h-4 text-zinc-600 dark:text-zinc-300" />
                  <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 tracking-tight">
                    Forward Message
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setForwardModalMessage(null);
                    setForwardSearchQuery('');
                  }}
                  className="p-1 rounded-md text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                  aria-label="Close forward modal"
                >
                  <IconClose className="w-4 h-4" />
                </button>
              </div>

              {/* Snippet Preview */}
              <div className="px-4 py-2.5 bg-zinc-50 dark:bg-zinc-950/60 border-b border-zinc-100 dark:border-zinc-800/80 flex items-start gap-2.5">
                {forwardModalMessage.type === 'photo' && forwardModalMessage.imageUrl ? (
                  <img
                    src={forwardModalMessage.imageUrl}
                    alt="Photo snippet"
                    className="w-9 h-9 object-cover rounded-md shrink-0 border border-black/10 dark:border-white/10"
                  />
                ) : (
                  <div className="w-7 h-7 rounded-md bg-zinc-200/70 dark:bg-zinc-800 flex items-center justify-center shrink-0 text-zinc-500">
                    <IconForward className="w-3.5 h-3.5" />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] uppercase font-mono tracking-wider text-zinc-400">
                    {forwardModalMessage.type === 'photo'
                      ? 'Attached Photo'
                      : forwardModalMessage.type === 'audio'
                      ? 'Voice Message'
                      : 'Message Preview'}
                  </p>
                  <p className="text-xs text-zinc-700 dark:text-zinc-300 line-clamp-2 italic leading-tight">
                    "{forwardModalMessage.text || 'Photo attachment'}"
                  </p>
                </div>
              </div>

              {/* Quote in Draft Shortcut */}
              <div className="p-3 border-b border-zinc-100 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={() => handleForwardToDraft(forwardModalMessage)}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-xl bg-zinc-100 hover:bg-zinc-200/70 dark:bg-zinc-800 dark:hover:bg-zinc-750 transition-colors cursor-pointer text-xs font-medium text-zinc-900 dark:text-zinc-100"
                >
                  <span>Quote in current conversation draft</span>
                  <span className="text-[10px] text-zinc-500 font-mono">Insert →</span>
                </button>
              </div>

              {/* Contact Search Input */}
              <div className="px-3 pt-2">
                <input
                  type="text"
                  placeholder="Search contact..."
                  value={forwardSearchQuery}
                  onChange={(e) => setForwardSearchQuery(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs rounded-lg border border-zinc-200 dark:border-zinc-750 bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-hidden focus:border-zinc-400"
                />
              </div>

              {/* Contacts List */}
              <div className="p-3 overflow-y-auto flex-1 space-y-1">
                <p className="text-[10px] uppercase font-mono tracking-wider text-zinc-400 px-1 pb-1">
                  Forward to contact
                </p>
                {filteredForwardPeople.map((person) => (
                  <button
                    key={person.id}
                    type="button"
                    onClick={() => handleForwardToPerson(person.name)}
                    className="w-full flex items-center justify-between p-2 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800/70 transition-colors cursor-pointer text-left group"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Avatar
                        initials={person.initials}
                        gradient={person.avatarColor}
                        name={person.name}
                        presence={person.presence}
                        size="sm"
                      />
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-zinc-900 dark:text-zinc-100 truncate group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                          {person.name}
                        </p>
                        <p className="text-[10px] text-zinc-400 truncate">
                          {person.relationship}
                        </p>
                      </div>
                    </div>
                    <span className="text-[10px] text-zinc-400 group-hover:text-zinc-600 dark:group-hover:text-zinc-300 transition-colors">
                      Send →
                    </span>
                  </button>
                ))}
                {filteredForwardPeople.length === 0 && (
                  <div className="py-6 text-center text-xs text-zinc-400">
                    No contacts found
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Disappearing Messages Timer Configuration Modal */}
      <DisappearingTimerModal
        isOpen={isTimerModalOpen}
        onClose={() => setIsTimerModalOpen(false)}
        person={thread.person}
        currentOption={disappearingTimer}
        onSaveOption={handleSaveTimerOption}
        onScrubHistoryNow={handleScrubHistoryNow}
      />

      {/* End-to-End Cryptography Verification Modal */}
      <EncryptionVerificationModal
        isOpen={isVerificationModalOpen}
        onClose={() => setIsVerificationModalOpen(false)}
        person={thread.person}
      />

      {/* Encrypted Audio Call Modal */}
      <EncryptedCallModal
        isOpen={isCallModalOpen}
        person={thread.person}
        onClose={() => setIsCallModalOpen(false)}
        onCallEnded={(durationSec) => {
          setIsCallModalOpen(false);
          const now = new Date();
          const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
          const callMsg: MessageItem = {
            id: `call-${Date.now()}`,
            sender: 'you',
            text: `Encrypted call (${durationSec}s)`,
            timestamp: timeStr,
            type: 'call',
            callDuration: durationSec,
            ...getTimerPropsForNewMessage(),
          };
          setMessages((prev) => [...prev, callMsg]);
          onUpdateThreadLastMessage?.({
            text: `Encrypted call (${durationSec}s)`,
            timestamp: timeStr,
            status: 'read',
            type: 'call',
          });
        }}
      />
      {/* Message Info & Read Receipts Modal */}
      <MessageInfoModal
        isOpen={Boolean(selectedInfoMessage)}
        onClose={() => setSelectedInfoMessage(null)}
        message={selectedInfoMessage}
        personName={thread.person.name}
        readReceiptsEnabled={readReceiptsEnabled}
        onToggleReadReceipts={handleToggleReadReceipts}
        onRetry={handleRetryMessage}
      />

      {/* Chat Theme Modal (Per Conversation Atmosphere & Bubbles) */}
      <ChatThemeModal
        isOpen={isThemeModalOpen}
        onClose={() => setIsThemeModalOpen(false)}
        threadId={thread.id}
        recipientName={thread.person.name}
        recipientInitials={thread.person.initials}
        recipientAvatarColor={thread.person.avatarColor}
        currentSetting={chatThemeSetting}
        onSelectTheme={(newSetting) => setChatThemeSetting(newSetting)}
      />

      {/* Chat Background Texture Modal */}
      <ChatTextureModal
        isOpen={isTextureModalOpen}
        onClose={() => setIsTextureModalOpen(false)}
        currentTexture={chatTexture}
        onSelectTexture={(newTex) => setChatTexture(newTex)}
      />

      {/* Live Device Camera Sanctuary & Review Modal */}
      <CameraCaptureModal
        isOpen={isCameraModalOpen}
        onClose={() => setIsCameraModalOpen(false)}
        onSendPhoto={handleSendEncryptedPhoto}
        defaultTimerOption={disappearingTimer}
        personName={thread.person.name}
      />

      {/* Cryptographic Media Receipt Modal */}
      <PhotoCryptoReceiptModal
        isOpen={Boolean(selectedPhotoCrypto)}
        onClose={() => setSelectedPhotoCrypto(null)}
        message={selectedPhotoCrypto}
        personName={thread.person.name}
      />

      {/* Hybrid Mesh & Store-and-Forward Diagnostics Modal */}
      <MeshNetworkModal
        isOpen={isMeshModalOpen}
        onClose={() => setIsMeshModalOpen(false)}
      />
    </motion.div>
  );
}
