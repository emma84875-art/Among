import { useState, useMemo, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChatThread, Person } from '../../types';
import { PLACEHOLDER_CHATS } from '../../data/placeholder';
import { ConversationScreen } from './ConversationScreen';
import { ArchivedChatsView } from './ArchivedChatsView';
import { SwipeableChatRow } from './SwipeableChatRow';
import {
  Avatar,
  Badge,
  Button,
  Input,
  ListRow,
  Modal,
  EmptyState,
  TypingIndicator,
  ChatListSkeleton,
} from '../ui';
import {
  IconEdit,
  IconPin,
  IconSecurity,
  IconChats,
  IconCheck,
  IconCheckDouble,
  IconSearch,
  IconMic,
  IconCamera,
  IconHourglass,
  IconBluetooth,
  IconCloud,
  IconRotateCcw,
  IconArchive,
  IconArchiveRestore,
  IconChevronRight,
} from '../common/Icons';
import { useMeshNetwork } from '../../lib/mesh';
import { MeshNetworkModal } from '../modals/MeshNetworkModal';
import {
  getArchivedRecord,
  toggleThreadArchive,
  unarchiveThread,
  unarchiveAllThreads,
  ARCHIVE_CHANGED_EVENT,
} from '../../lib/archive';
import { networkManager } from '../../lib/networking';

interface ChatsViewProps {
  onOpenDesignSystem?: () => void;
  initialPerson?: Person | null;
  onClearInitialPerson?: () => void;
}

interface ToastNotice {
  id: string;
  message: string;
  undoAction?: () => void;
}

function highlightMatch(text: string, query: string) {
  if (!query.trim()) return text;
  const cleanQuery = query.trim();
  const escaped = cleanQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`(${escaped})`, 'gi');
  const parts = text.split(regex);
  if (parts.length <= 1) return text;
  return (
    <>
      {parts.map((part, i) =>
        regex.test(part) ? (
          <mark
            key={i}
            className="bg-amber-400/25 dark:bg-amber-400/20 text-zinc-950 dark:text-zinc-100 rounded-[2px] px-0.5"
          >
            {part}
          </mark>
        ) : (
          part
        )
      )}
    </>
  );
}

export function ChatsView({
  onOpenDesignSystem,
  initialPerson,
  onClearInitialPerson,
}: ChatsViewProps) {
  // Initialize chats with their persisted archive statuses and latest messages
  const [chats, setChats] = useState<ChatThread[]>(() => {
    const archivedRecord = getArchivedRecord();
    return PLACEHOLDER_CHATS.map((c) => {
      let lastMsg = c.lastMessage;
      try {
        const savedRaw = localStorage.getItem(`among_thread_messages_${c.id}`);
        if (savedRaw) {
          const msgs = JSON.parse(savedRaw);
          if (msgs && msgs.length > 0) {
            const last = msgs[msgs.length - 1];
            lastMsg = {
              ...lastMsg,
              id: last.id,
              text: last.text,
              timestamp: last.timestamp,
              sender: last.sender,
              status: last.status,
              type: last.type,
              sequenceNumber: last.sequenceNumber,
              createdAt: last.createdAt,
            };
          }
        }
      } catch {}

      return {
        ...c,
        lastMessage: lastMsg,
        isArchived: Boolean(archivedRecord[c.id]),
        archivedAt: archivedRecord[c.id]?.archivedAt,
      };
    });
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'unread' | 'inner' | 'archived'>('all');
  const [forceEmpty, setForceEmpty] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedThread, setSelectedThread] = useState<ChatThread | null>(null);
  const [isNewThreadOpen, setIsNewThreadOpen] = useState(false);
  const [isArchivedViewOpen, setIsArchivedViewOpen] = useState(false);
  const [typingThreadIds, setTypingThreadIds] = useState<Set<string>>(new Set());
  const [toast, setToast] = useState<ToastNotice | null>(null);
  const toastTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Initial load simulation for encrypted local messages
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 650);
    return () => clearTimeout(timer);
  }, []);

  // Sync archive changes across tabs or components
  useEffect(() => {
    const handleArchiveChanged = () => {
      const archivedRecord = getArchivedRecord();
      setChats((prev) =>
        prev.map((c) => ({
          ...c,
          isArchived: Boolean(archivedRecord[c.id]),
          archivedAt: archivedRecord[c.id]?.archivedAt,
        }))
      );
    };
    window.addEventListener(ARCHIVE_CHANGED_EVENT, handleArchiveChanged);
    return () => window.removeEventListener(ARCHIVE_CHANGED_EVENT, handleArchiveChanged);
  }, []);

  // Listen for real-time WebSocket peer typing status across all threads
  useEffect(() => {
    const unsubTyping = networkManager.onTyping(({ chatId, senderId, isTyping: typing }) => {
      const match = chats.find((c) => c.id === chatId || c.person.id === senderId);
      const threadId = match ? match.id : chatId;
      if (threadId) {
        setTypingThreadIds((prev) => {
          const next = new Set(prev);
          if (typing) {
            next.add(threadId);
          } else {
            next.delete(threadId);
          }
          return next;
        });
      }
    });

    return () => {
      unsubTyping();
    };
  }, [chats]);

  // Real-time synchronization of messages, delivery receipts, and acknowledgements across all threads
  useEffect(() => {
    const handleIncomingOrSync = (msg: {
      id: string;
      chatId: string;
      senderId: string;
      envelope: any;
      createdAt?: string | number;
      status?: any;
      sequenceNumber?: number;
    }) => {
      const date = new Date(msg.createdAt || Date.now());
      const timeStr = `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
      const previewText =
        msg.envelope?.plaintextFallback ||
        (msg.envelope?.payloadType === 'text' ? '[Encrypted Whisper]' : `[${msg.envelope?.payloadType || 'Media'}]`);

      setChats((prev) => {
        const targetIdx = prev.findIndex((c) => c.id === msg.chatId || c.person.id === msg.senderId);
        if (targetIdx === -1) return prev;

        const target = prev[targetIdx];
        const updatedThread: ChatThread = {
          ...target,
          lastMessage: {
            ...target.lastMessage,
            id: msg.id,
            sender: 'them',
            text: previewText,
            timestamp: timeStr,
            status: msg.status || 'delivered',
            isUnread: selectedThread?.id !== target.id,
            type: msg.envelope?.payloadType || 'text',
            sequenceNumber: msg.sequenceNumber,
          },
        };

        // Reorder: Move the freshly messaged conversation to the very top
        const next = [...prev];
        next.splice(targetIdx, 1);
        return [updatedThread, ...next];
      });
    };

    // A. WebSocket network manager message listener
    const unsubMessage = networkManager.onMessage((msg) => {
      handleIncomingOrSync(msg);
    });

    // B. Global message received event
    const handleGlobalMessageReceived = (e: Event) => {
      const detail = (e as CustomEvent<{ chatId: string; message: any }>).detail;
      if (detail && detail.message) {
        handleIncomingOrSync({
          id: detail.message.id,
          chatId: detail.chatId,
          senderId: detail.message.sender === 'them' ? 'peer' : 'you',
          envelope: detail.message.encryptedEnvelope || { plaintextFallback: detail.message.text },
          createdAt: detail.message.timestamp,
          status: detail.message.status,
          sequenceNumber: detail.message.sequenceNumber,
        });
      }
    };
    window.addEventListener('among_global_message_received', handleGlobalMessageReceived);

    // C. Delivery Receipt updates
    const unsubDelivered = networkManager.onAckDelivered(({ messageId, chatId }) => {
      setChats((prev) =>
        prev.map((c) =>
          c.id === chatId && c.lastMessage.id === messageId
            ? { ...c, lastMessage: { ...c.lastMessage, status: 'delivered' } }
            : c
        )
      );
    });

    // D. Read Receipt updates
    const unsubRead = networkManager.onAckRead(({ messageId, chatId }) => {
      setChats((prev) =>
        prev.map((c) =>
          c.id === chatId && c.lastMessage.id === messageId
            ? { ...c, lastMessage: { ...c.lastMessage, status: 'read' } }
            : c
        )
      );
    });

    // E. Ack sent updates
    const unsubAckSent = networkManager.onAckSent(({ messageId, chatId, sequenceNumber }) => {
      setChats((prev) =>
        prev.map((c) =>
          c.id === chatId && c.lastMessage.id === messageId
            ? { ...c, lastMessage: { ...c.lastMessage, status: 'sent', sequenceNumber } }
            : c
        )
      );
    });

    return () => {
      unsubMessage();
      unsubDelivered();
      unsubRead();
      unsubAckSent();
      window.removeEventListener('among_global_message_received', handleGlobalMessageReceived);
    };
  }, [selectedThread?.id]);

  const showToast = (message: string, undoAction?: () => void) => {
    if (toastTimeoutRef.current) {
      clearTimeout(toastTimeoutRef.current);
    }
    setToast({ id: `toast-${Date.now()}`, message, undoAction });
    toastTimeoutRef.current = setTimeout(() => {
      setToast(null);
    }, 4500);
  };

  const handleToggleArchive = (threadId: string) => {
    const targetChat = chats.find((c) => c.id === threadId);
    const isNowArchived = toggleThreadArchive(threadId);

    setChats((prev) =>
      prev.map((c) =>
        c.id === threadId
          ? {
              ...c,
              isArchived: isNowArchived,
              archivedAt: isNowArchived ? new Date().toISOString() : undefined,
            }
          : c
      )
    );

    if (selectedThread && selectedThread.id === threadId) {
      setSelectedThread((prev) =>
        prev
          ? {
              ...prev,
              isArchived: isNowArchived,
              archivedAt: isNowArchived ? new Date().toISOString() : undefined,
            }
          : null
      );
    }

    const name = targetChat?.person.name || 'Conversation';
    showToast(
      isNowArchived ? `Tucked away "${name}" to archive` : `Restored "${name}" to main chats`,
      () => handleToggleArchive(threadId)
    );
  };

  const handleUnarchiveThread = (threadId: string) => {
    const targetChat = chats.find((c) => c.id === threadId);
    unarchiveThread(threadId);
    setChats((prev) =>
      prev.map((c) =>
        c.id === threadId
          ? { ...c, isArchived: false, archivedAt: undefined }
          : c
      )
    );
    if (selectedThread && selectedThread.id === threadId) {
      setSelectedThread((prev) =>
        prev ? { ...prev, isArchived: false, archivedAt: undefined } : null
      );
    }
    const name = targetChat?.person.name || 'Conversation';
    showToast(`Restored "${name}" to main conversations`, () => handleToggleArchive(threadId));
  };

  const handleUnarchiveAll = () => {
    unarchiveAllThreads();
    setChats((prev) =>
      prev.map((c) => ({
        ...c,
        isArchived: false,
        archivedAt: undefined,
      }))
    );
    if (selectedThread) {
      setSelectedThread((prev) =>
        prev ? { ...prev, isArchived: false, archivedAt: undefined } : null
      );
    }
    showToast('Restored all whispers back to your main circle');
  };

  // Automatically open thread if initialPerson is passed (e.g. from People tab)
  useEffect(() => {
    if (initialPerson) {
      const existing = chats.find(
        (c) =>
          c.person.id === initialPerson.id ||
          c.person.name.toLowerCase() === initialPerson.name.toLowerCase()
      );
      if (existing) {
        // If it was archived, automatically restore it when user explicitly initiates chat
        if (existing.isArchived) {
          handleUnarchiveThread(existing.id);
        }
        setSelectedThread(existing);
      } else {
        const newThread: ChatThread = {
          id: `thread-${initialPerson.id || Date.now()}`,
          person: initialPerson,
          lastMessage: {
            id: `msg-init-${Date.now()}`,
            sender: 'them',
            text: initialPerson.statusMessage || 'Beginning of end-to-end encrypted whisper.',
            timestamp: 'Just now',
            status: 'read',
            isUnread: false,
          },
          isPinned: false,
          isArchived: false,
        };
        setChats((prev) => [newThread, ...prev]);
        setSelectedThread(newThread);
      }
      onClearInitialPerson?.();
    }
  }, [initialPerson, chats, onClearInitialPerson]);

  // Hybrid Communication & Mesh Connectivity
  const { meshState, syncQueuedMessages } = useMeshNetwork();
  const [isMeshModalOpen, setIsMeshModalOpen] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  // Global keyboard shortcut to focus search with Cmd+K / Ctrl+K or '/'
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        searchInputRef.current?.focus();
      } else if (
        e.key === '/' &&
        document.activeElement !== searchInputRef.current &&
        document.activeElement?.tagName !== 'INPUT' &&
        document.activeElement?.tagName !== 'TEXTAREA'
      ) {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Split into active (non-archived) and archived chats
  const activeChats = useMemo(() => chats.filter((c) => !c.isArchived), [chats]);
  const archivedChats = useMemo(() => chats.filter((c) => c.isArchived), [chats]);

  // Calculate search matches across archived chats to offer a jump-link
  const matchingArchivedCount = useMemo(() => {
    if (!searchQuery.trim() || activeFilter === 'archived') return 0;
    const query = searchQuery.toLowerCase().trim();
    return archivedChats.filter((chat) => {
      const name = chat.person.name.toLowerCase();
      const msg = chat.lastMessage.text.toLowerCase();
      const rel = chat.person.relationship.toLowerCase();
      const status = chat.person.statusMessage?.toLowerCase() || '';
      const handle = chat.person.phoneOrHandle?.toLowerCase() || '';
      return (
        name.includes(query) ||
        msg.includes(query) ||
        rel.includes(query) ||
        status.includes(query) ||
        handle.includes(query)
      );
    }).length;
  }, [archivedChats, searchQuery, activeFilter]);

  const filteredChats = useMemo(() => {
    if (forceEmpty) return [];

    // When viewing 'archived', source from archivedChats; otherwise strictly from activeChats
    const sourceList = activeFilter === 'archived' ? archivedChats : activeChats;

    return sourceList.filter((chat) => {
      // Filter tab logic
      if (activeFilter === 'unread' && !chat.lastMessage.isUnread) return false;
      if (activeFilter === 'inner' && !chat.person.isInnerCircle) return false;

      // Search query - matches person name, message text, relationship, status message, or handle
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const matchesName = chat.person.name.toLowerCase().includes(query);
        const matchesMsg = chat.lastMessage.text.toLowerCase().includes(query);
        const matchesRel = chat.person.relationship.toLowerCase().includes(query);
        const matchesStatus = chat.person.statusMessage?.toLowerCase().includes(query);
        const matchesHandle = chat.person.phoneOrHandle?.toLowerCase().includes(query);
        return matchesName || matchesMsg || matchesRel || Boolean(matchesStatus) || Boolean(matchesHandle);
      }

      return true;
    });
  }, [activeChats, archivedChats, searchQuery, activeFilter, forceEmpty]);

  const handleSelectThread = (chat: ChatThread) => {
    if (chat.lastMessage.isUnread) {
      setChats((prev) =>
        prev.map((c) =>
          c.id === chat.id
            ? { ...c, lastMessage: { ...c.lastMessage, isUnread: false } }
            : c
        )
      );
    }
    setSelectedThread(chat);
  };

  return (
    <div className="flex flex-col min-h-full px-5 py-4 pb-24 max-w-md mx-auto w-full relative">
      {/* Top Header */}
      <div className="flex items-center justify-between pt-2 pb-4">
        <div>
          <span className="text-[11px] font-medium tracking-widest uppercase text-zinc-500 dark:text-zinc-400 block mb-0.5">
            Sanctuary
          </span>
          <h1 className="text-3xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
            Chats
          </h1>
        </div>

        <div className="flex items-center gap-1.5">
          {/* Quick Sync & Reload with Skeleton Loading */}
          <button
            type="button"
            onClick={() => {
              setIsLoading(true);
              setTimeout(() => setIsLoading(false), 700);
            }}
            className={`text-xs px-2.5 py-1 rounded-full border transition-all flex items-center gap-1.5 cursor-pointer ${
              isLoading
                ? 'bg-zinc-900 text-zinc-50 dark:bg-zinc-100 dark:text-zinc-950 border-zinc-900 dark:border-zinc-100 font-medium'
                : 'border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100'
            }`}
            title="Refresh conversations (shows skeleton loader)"
          >
            <IconRotateCcw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
            <span>{isLoading ? 'Syncing...' : 'Sync'}</span>
          </button>

          {/* Toggle to preview empty state */}
          <button
            type="button"
            onClick={() => setForceEmpty(!forceEmpty)}
            className={`text-xs px-2.5 py-1 rounded-full border transition-all cursor-pointer ${
              forceEmpty
                ? 'bg-zinc-900 text-zinc-50 dark:bg-zinc-100 dark:text-zinc-950 border-zinc-900 dark:border-zinc-100 font-medium'
                : 'border-zinc-200 dark:border-zinc-800 text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
            }`}
            title="Preview Empty State for design review"
          >
            {forceEmpty ? 'Data' : 'Empty'}
          </button>

          <Button
            variant="secondary"
            size="icon"
            onClick={() => setIsNewThreadOpen(true)}
            aria-label="Start new conversation"
          >
            <IconEdit className="w-4 h-4 text-zinc-700 dark:text-zinc-300" />
          </Button>
        </div>
      </div>

      {/* Hybrid Connectivity Banner */}
      {!meshState.isOnline ? (
        <div
          onClick={() => setIsMeshModalOpen(true)}
          className="mb-3 p-2.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-between text-xs text-emerald-800 dark:text-emerald-300 cursor-pointer hover:bg-emerald-500/15 transition-colors select-none"
        >
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-6 h-6 rounded-lg bg-emerald-500/20 flex items-center justify-center shrink-0">
              <IconBluetooth className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-[11.5px] truncate">
                Offline Mode · Bluetooth Mesh Active
              </p>
              <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-mono">
                {meshState.nearbyPeers.length} peer nodes in range · store & forward ready
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            {meshState.queuedMessagesCount > 0 && (
              <span className="text-[10px] font-mono px-1.5 py-0.2 bg-amber-500/20 text-amber-700 dark:text-amber-300 rounded-full font-semibold">
                {meshState.queuedMessagesCount} queued
              </span>
            )}
            <span className="text-[11px] underline font-medium">Inspect</span>
          </div>
        </div>
      ) : meshState.queuedMessagesCount > 0 ? (
        <div className="mb-3 p-2.5 rounded-2xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-between text-xs text-sky-800 dark:text-sky-300 select-none">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-6 h-6 rounded-lg bg-sky-500/20 flex items-center justify-center shrink-0">
              <IconCloud className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-[11.5px] truncate">Internet Reconnected</p>
              <p className="text-[10px] text-sky-600 dark:text-sky-400 font-mono">
                {meshState.queuedMessagesCount} offline whispers queued for delivery
              </p>
            </div>
          </div>
          <button
            type="button"
            disabled={isSyncing}
            onClick={async () => {
              setIsSyncing(true);
              await syncQueuedMessages();
              setIsSyncing(false);
            }}
            className="px-2.5 py-1 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1 cursor-pointer transition-colors"
          >
            <IconRotateCcw className={`w-3 h-3 ${isSyncing ? 'animate-spin' : ''}`} />
            <span>{isSyncing ? 'Syncing...' : 'Sync Now'}</span>
          </button>
        </div>
      ) : null}

      {/* Prominent Search Bar */}
      <div className="mb-3 relative">
        <Input
          ref={searchInputRef}
          id="chats-search-input"
          isSearch
          placeholder="Search conversations, names, or messages..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onClear={() => {
            setSearchQuery('');
            searchInputRef.current?.focus();
          }}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              setSearchQuery('');
              searchInputRef.current?.blur();
            } else if (e.key === 'Enter' && filteredChats.length > 0) {
              setSelectedThread(filteredChats[0]);
            }
          }}
          trailing={
            !searchQuery ? (
              <div className="hidden sm:flex items-center gap-1 text-[10px] font-mono text-zinc-400 dark:text-zinc-500 bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded border border-zinc-200/80 dark:border-zinc-700/80 pointer-events-none select-none">
                <span className="text-[11px]">⌘</span>K
              </div>
            ) : undefined
          }
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          aria-label="Search conversations"
        />
      </div>

      {/* Active Search Result Summary */}
      {searchQuery.trim() && (
        <div className="space-y-1.5 mb-2.5">
          <div className="flex items-center justify-between px-1 text-xs text-zinc-500 dark:text-zinc-400 animate-in fade-in duration-150">
            <span>
              {filteredChats.length === 0
                ? `No conversations matching "${searchQuery}"`
                : filteredChats.length === 1
                ? `1 conversation found`
                : `${filteredChats.length} conversations found`}
            </span>
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                searchInputRef.current?.focus();
              }}
              className="text-[11px] font-medium text-zinc-700 dark:text-zinc-300 hover:underline cursor-pointer"
            >
              Clear
            </button>
          </div>

          {/* Search jump to archived chats if matches exist */}
          {matchingArchivedCount > 0 && (
            <div
              onClick={() => setIsArchivedViewOpen(true)}
              className="px-3 py-1.5 rounded-xl bg-amber-500/10 dark:bg-amber-400/[0.08] border border-amber-500/20 text-xs text-amber-900 dark:text-amber-200 flex items-center justify-between cursor-pointer hover:bg-amber-500/15 transition-colors select-none"
            >
              <div className="flex items-center gap-2">
                <IconArchive className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
                <span>
                  Found {matchingArchivedCount} matching {matchingArchivedCount === 1 ? 'whisper' : 'whispers'} in Archive
                </span>
              </div>
              <span className="underline font-medium text-[11px] shrink-0">View Archive</span>
            </div>
          )}
        </div>
      )}

      {/* Filter Chips */}
      <div className="flex items-center gap-1.5 mb-3 overflow-x-auto no-scrollbar py-1">
        {(
          [
            { id: 'all' as const, label: 'All Conversations' },
            { id: 'unread' as const, label: 'Unread' },
            { id: 'inner' as const, label: 'Close People' },
            ...(archivedChats.length > 0
              ? [
                  {
                    id: 'archived' as const,
                    label: `Archived (${archivedChats.length})`,
                  },
                ]
              : []),
          ]
        ).map((filter) => (
          <button
            key={filter.id}
            type="button"
            onClick={() => {
              setActiveFilter(filter.id);
              setForceEmpty(false);
            }}
            className={`text-xs px-3 py-1.5 rounded-full transition-all cursor-pointer whitespace-nowrap ${
              activeFilter === filter.id && !forceEmpty
                ? 'bg-zinc-950 text-zinc-50 dark:bg-zinc-100 dark:text-zinc-950 font-medium shadow-xs'
                : 'bg-zinc-100 dark:bg-zinc-800/80 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100'
            }`}
          >
            {filter.label}
          </button>
        ))}
      </div>

      {/* Dedicated Serene "Archived Whispers" Banner Entry (when not on archived filter) */}
      {archivedChats.length > 0 && activeFilter !== 'archived' && !searchQuery.trim() && (
        <div
          onClick={() => setIsArchivedViewOpen(true)}
          className="mb-3.5 p-3 rounded-2xl bg-zinc-100/70 dark:bg-zinc-900/70 border border-zinc-200/60 dark:border-zinc-800/60 flex items-center justify-between hover:bg-zinc-200/50 dark:hover:bg-zinc-850/50 transition-all cursor-pointer group select-none"
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 dark:bg-amber-400/10 flex items-center justify-center text-amber-700 dark:text-amber-300 shrink-0">
              <IconArchive className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                  Archived Whispers
                </span>
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-medium">
                  {archivedChats.length}
                </span>
              </div>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400 truncate">
                Tucked away safely to keep your active circle calm
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1 text-zinc-400 group-hover:text-zinc-700 dark:group-hover:text-zinc-200 text-xs font-medium shrink-0">
            <span>View</span>
            <IconChevronRight className="w-3.5 h-3.5" />
          </div>
        </div>
      )}

      {/* Notice regarding UI foundation phase */}
      <div className="mb-3.5 px-3.5 py-2.5 rounded-xl bg-zinc-100/60 dark:bg-zinc-900/60 border border-zinc-200/60 dark:border-zinc-800/60 flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400">
        <div className="flex items-center gap-2">
          <IconSecurity className="w-3.5 h-3.5 text-zinc-400 dark:text-zinc-500 shrink-0" />
          <span className="text-[11px]">
            {activeFilter === 'archived'
              ? 'Archived Whispers · Tucked Away & Private'
              : 'Visual Foundation · Realistic Placeholder Data'}
          </span>
        </div>
        {activeFilter === 'archived' ? (
          <button
            type="button"
            onClick={() => setActiveFilter('all')}
            className="text-[11px] underline underline-offset-2 hover:text-zinc-800 dark:hover:text-zinc-200 cursor-pointer text-amber-600 dark:text-amber-400"
          >
            Show Active
          </button>
        ) : onOpenDesignSystem ? (
          <button
            type="button"
            onClick={onOpenDesignSystem}
            className="text-[11px] underline underline-offset-2 hover:text-zinc-800 dark:hover:text-zinc-200 cursor-pointer"
          >
            UI Spec
          </button>
        ) : null}
      </div>

      {/* Threads List, Skeleton Loader, or Empty State */}
      {isLoading ? (
        <div className="pt-1">
          <ChatListSkeleton count={5} />
        </div>
      ) : filteredChats.length > 0 ? (
        <div className="space-y-1">
          <AnimatePresence initial={false}>
            {filteredChats.map((chat) => (
              <motion.div
                key={chat.id}
                layout="position"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{
                  opacity: 0,
                  height: 0,
                  marginBottom: 0,
                  transition: { duration: 0.2, ease: 'easeOut' },
                }}
                className="overflow-hidden rounded-2xl"
              >
                <SwipeableChatRow
                  chat={chat}
                  onSelect={() => handleSelectThread(chat)}
                  onToggleArchive={() => handleToggleArchive(chat.id)}
                  searchQuery={searchQuery}
                  isTyping={typingThreadIds.has(chat.id)}
                  highlightMatch={highlightMatch}
                />
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      ) : (
        <EmptyState
          icon={
            searchQuery ? (
              <IconSearch className="w-6 h-6 text-zinc-400 dark:text-zinc-500" />
            ) : activeFilter === 'archived' ? (
              <IconArchive className="w-6 h-6 text-zinc-400" />
            ) : (
              <IconChats className="w-6 h-6 text-zinc-400" />
            )
          }
          title={
            searchQuery
              ? 'No matching conversations'
              : activeFilter === 'archived'
              ? 'No archived conversations'
              : 'Quiet in your circle'
          }
          description={
            searchQuery
              ? `No threads or messages found matching "${searchQuery}". Search by person name, message content, or relationship.`
              : activeFilter === 'archived'
              ? 'Older conversations you tuck away will appear here, keeping your main list peaceful and clear.'
              : 'When someone in your circle reaches out, their quiet messages will appear here.'
          }
          actionLabel={
            forceEmpty
              ? 'Restore Sample Chats'
              : searchQuery
              ? 'Clear Search'
              : activeFilter === 'archived'
              ? 'Show All Chats'
              : 'Start a Thread'
          }
          onAction={() => {
            if (forceEmpty) {
              setForceEmpty(false);
            } else if (searchQuery) {
              setSearchQuery('');
              searchInputRef.current?.focus();
            } else if (activeFilter === 'archived') {
              setActiveFilter('all');
            } else {
              setIsNewThreadOpen(true);
            }
          }}
        />
      )}

      {/* Floating Undo Toast Banner */}
      <AnimatePresence>
        {toast && (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, y: 16, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-4 py-2.5 rounded-2xl bg-zinc-950 text-zinc-50 dark:bg-zinc-100 dark:text-zinc-950 shadow-2xl text-xs font-medium border border-zinc-800/80 dark:border-zinc-200/80 max-w-sm w-full mx-auto"
          >
            <span className="flex-1 truncate">{toast.message}</span>
            {toast.undoAction && (
              <button
                type="button"
                onClick={() => {
                  toast.undoAction?.();
                  setToast(null);
                }}
                className="text-amber-400 dark:text-amber-600 font-semibold hover:underline cursor-pointer shrink-0 ml-1"
              >
                Undo
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Dedicated Archived Whispers Full View */}
      <AnimatePresence>
        {isArchivedViewOpen && (
          <ArchivedChatsView
            key="archived-whispers-view"
            archivedChats={archivedChats}
            onBack={() => setIsArchivedViewOpen(false)}
            onSelectThread={(chat) => {
              setIsArchivedViewOpen(false);
              handleSelectThread(chat);
            }}
            onUnarchiveThread={handleUnarchiveThread}
            onUnarchiveAll={handleUnarchiveAll}
          />
        )}
      </AnimatePresence>

      {/* Redesigned Among Conversation Screen */}
      <AnimatePresence>
        {selectedThread && (
          <ConversationScreen
            key={selectedThread.id}
            thread={selectedThread}
            isArchived={Boolean(selectedThread.isArchived)}
            onToggleArchive={handleToggleArchive}
            onBack={() => setSelectedThread(null)}
            onTypingChange={(threadId, isTyping) => {
              setTypingThreadIds((prev) => {
                const next = new Set(prev);
                if (isTyping) next.add(threadId);
                else next.delete(threadId);
                return next;
              });
            }}
            onReceiveMessage={(reply) => {
              setChats((prev) =>
                prev.map((c) =>
                  c.id === selectedThread.id
                    ? {
                        ...c,
                        lastMessage: {
                          id: `msg-incoming-${Date.now()}`,
                          sender: 'them',
                          text: reply.text,
                          timestamp: reply.timestamp,
                          isUnread: false,
                          type: reply.type,
                        },
                      }
                    : c
                )
              );
            }}
            onUpdateThreadLastMessage={(updated) => {
              setChats((prev) =>
                prev.map((c) =>
                  c.id === selectedThread.id
                    ? {
                        ...c,
                        lastMessage: {
                          ...c.lastMessage,
                          sender: 'you',
                          text: updated.text,
                          timestamp: updated.timestamp,
                          status: updated.status,
                          type: updated.type,
                          isUnread: false,
                        },
                      }
                    : c
                )
              );
            }}
          />
        )}
      </AnimatePresence>

      {/* Start New Thread Sheet */}
      <Modal
        isOpen={isNewThreadOpen}
        onClose={() => setIsNewThreadOpen(false)}
        title="New Quiet Thread"
        subtitle="Select someone from your circle"
        variant="bottom-sheet"
      >
        <div className="space-y-2 py-2">
          {chats.map((chat) => (
            <ListRow
              key={`new-${chat.id}`}
              onClick={() => {
                setIsNewThreadOpen(false);
                if (chat.isArchived) {
                  handleUnarchiveThread(chat.id);
                }
                handleSelectThread(chat);
              }}
              leading={
                <Avatar
                  initials={chat.person.initials}
                  name={chat.person.name}
                  presence={chat.person.presence}
                  size="sm"
                  gradient={chat.person.avatarColor}
                />
              }
              title={chat.person.name}
              subtitle={chat.person.relationship}
              metadata={chat.person.presence}
              showChevron
            />
          ))}
        </div>
      </Modal>

      {/* Hybrid Mesh & Store-and-Forward Diagnostics Modal */}
      <MeshNetworkModal
        isOpen={isMeshModalOpen}
        onClose={() => setIsMeshModalOpen(false)}
      />
    </div>
  );
}
