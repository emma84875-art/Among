import React, { useState, useMemo, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChatThread } from '../../types';
import { Avatar, Badge, EmptyState, Input } from '../ui';
import {
  IconChevronLeft,
  IconArchive,
  IconArchiveRestore,
  IconSearch,
  IconCheck,
  IconCheckDouble,
  IconMic,
  IconCamera,
  IconHourglass,
  IconLock,
} from '../common/Icons';

interface ArchivedChatsViewProps {
  archivedChats: ChatThread[];
  onBack: () => void;
  onSelectThread: (chat: ChatThread) => void;
  onUnarchiveThread: (threadId: string) => void;
  onUnarchiveAll: () => void;
}

function formatArchivedDate(dateString?: string): string {
  if (!dateString) return 'Archived';
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'Archived';
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Archived just now';
    if (diffMins < 60) return `Archived ${diffMins}m ago`;
    if (diffHours < 24) return `Archived ${diffHours}h ago`;
    if (diffDays === 1) return 'Archived yesterday';
    if (diffDays < 7) return `Archived ${diffDays}d ago`;
    return `Archived ${date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`;
  } catch {
    return 'Archived';
  }
}

export function ArchivedChatsView({
  archivedChats,
  onBack,
  onSelectThread,
  onUnarchiveThread,
  onUnarchiveAll,
}: ArchivedChatsViewProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);

  const filteredArchived = useMemo(() => {
    if (!searchQuery.trim()) return archivedChats;
    const q = searchQuery.toLowerCase().trim();
    return archivedChats.filter((chat) => {
      const name = chat.person.name.toLowerCase();
      const msg = chat.lastMessage.text.toLowerCase();
      const rel = chat.person.relationship.toLowerCase();
      const status = chat.person.statusMessage?.toLowerCase() || '';
      const handle = chat.person.phoneOrHandle?.toLowerCase() || '';
      return (
        name.includes(q) ||
        msg.includes(q) ||
        rel.includes(q) ||
        status.includes(q) ||
        handle.includes(q)
      );
    });
  }, [archivedChats, searchQuery]);

  return (
    <motion.div
      initial={{ opacity: 0, x: 24 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 24 }}
      transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
      className="fixed inset-0 z-40 flex flex-col bg-white dark:bg-zinc-950 max-w-md mx-auto h-full overflow-hidden"
    >
      {/* Top Header */}
      <header className="shrink-0 flex items-center justify-between px-4 py-3 border-b border-zinc-200/70 dark:border-zinc-800/80 bg-white/90 dark:bg-zinc-950/90 backdrop-blur-md">
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={onBack}
            className="p-1.5 -ml-1 rounded-xl text-zinc-600 hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-850 transition-colors cursor-pointer"
            aria-label="Back to main chats"
          >
            <IconChevronLeft className="w-5 h-5" />
          </button>

          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-semibold text-zinc-950 dark:text-zinc-50 tracking-tight">
                Archived Whispers
              </h2>
              <span className="text-[10.5px] font-mono px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20 font-medium">
                {archivedChats.length}
              </span>
            </div>
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
              Tucked away out of your main circle
            </p>
          </div>
        </div>

        {archivedChats.length > 1 && (
          <button
            type="button"
            onClick={onUnarchiveAll}
            className="text-xs font-medium text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300 hover:underline px-2 py-1 rounded-lg hover:bg-amber-50 dark:hover:bg-amber-950/30 transition-colors cursor-pointer"
          >
            Restore All
          </button>
        )}
      </header>

      {/* Main Body */}
      <div className="flex-1 overflow-y-auto px-5 py-4 pb-20 space-y-3.5">
        {/* Serene Privacy & Clutter-Free Notice */}
        <div className="p-3.5 rounded-2xl bg-amber-500/[0.06] dark:bg-amber-400/[0.04] border border-amber-500/15 dark:border-amber-400/10 text-xs text-zinc-600 dark:text-zinc-400 space-y-1">
          <div className="flex items-center gap-2 font-medium text-amber-900 dark:text-amber-200">
            <IconLock className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
            <span>Kept safe, quiet, and private</span>
          </div>
          <p className="text-[11.5px] leading-relaxed text-zinc-600 dark:text-zinc-400">
            Archived conversations remain fully end-to-end encrypted and intact. They are moved out
            of your main feed so your sanctuary stays focused on daily people.
          </p>
        </div>

        {/* Search archived chats */}
        {archivedChats.length > 0 && (
          <div className="relative">
            <Input
              ref={searchInputRef}
              id="archived-search-input"
              isSearch
              placeholder="Search archived conversations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onClear={() => {
                setSearchQuery('');
                searchInputRef.current?.focus();
              }}
              autoComplete="off"
              spellCheck={false}
              aria-label="Search archived conversations"
            />
          </div>
        )}

        {/* List of Archived Chats */}
        {filteredArchived.length > 0 ? (
          <div className="space-y-1.5 pt-1">
            <AnimatePresence>
              {filteredArchived.map((chat) => (
                <motion.div
                  key={chat.id}
                  layout
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -20, height: 0, marginBottom: 0 }}
                  transition={{ duration: 0.2 }}
                  className="group relative flex items-center justify-between p-3 rounded-2xl border border-zinc-200/70 dark:border-zinc-800/80 bg-zinc-50/50 dark:bg-zinc-900/40 hover:bg-zinc-100/90 dark:hover:bg-zinc-900/90 transition-all select-none"
                >
                  {/* Clickable Area to Open Thread */}
                  <div
                    onClick={() => onSelectThread(chat)}
                    className="flex items-center gap-3 min-w-0 flex-1 cursor-pointer pr-2"
                  >
                    <Avatar
                      initials={chat.person.initials}
                      name={chat.person.name}
                      presence={chat.person.presence}
                      size="md"
                      gradient={chat.person.avatarColor}
                    />

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1.5 mb-0.5">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100 truncate">
                            {chat.person.name}
                          </span>
                          {chat.person.isInnerCircle && (
                            <Badge variant="subtle" size="sm">
                              {chat.person.relationship}
                            </Badge>
                          )}
                        </div>
                        <span className="text-[11px] font-mono text-zinc-400 dark:text-zinc-500 shrink-0">
                          {chat.lastMessage.timestamp}
                        </span>
                      </div>

                      <div className="flex items-center justify-between gap-2">
                        <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate leading-relaxed">
                          {chat.lastMessage.sender === 'you' && (
                            <span className="inline-flex items-center mr-1">
                              {chat.lastMessage.status === 'read' ? (
                                <IconCheckDouble className="w-3.5 h-3.5 text-sky-500 dark:text-sky-400 inline" />
                              ) : chat.lastMessage.status === 'delivered' ? (
                                <IconCheckDouble className="w-3.5 h-3.5 text-zinc-400 inline" />
                              ) : (
                                <IconCheck className="w-3.5 h-3.5 text-zinc-400 inline" />
                              )}
                            </span>
                          )}
                          {chat.lastMessage.text}
                        </p>
                        <span className="text-[10px] text-amber-600/80 dark:text-amber-400/80 font-mono shrink-0">
                          {formatArchivedDate(chat.archivedAt)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Single-tap Unarchive Action */}
                  <div className="shrink-0 pl-1">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onUnarchiveThread(chat.id);
                      }}
                      className="p-2 rounded-xl text-zinc-400 hover:text-amber-600 dark:hover:text-amber-400 hover:bg-amber-500/10 dark:hover:bg-amber-400/10 transition-colors cursor-pointer"
                      title="Restore to main conversations"
                      aria-label={`Unarchive ${chat.person.name}`}
                    >
                      <IconArchiveRestore className="w-4 h-4" />
                    </button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        ) : archivedChats.length === 0 ? (
          <EmptyState
            icon={<IconArchive className="w-6 h-6 text-zinc-400" />}
            title="Archive is Empty"
            description="When you have older whispers you want to tuck away without deleting, archive them here to keep your main conversation circle quiet and focused."
            actionLabel="Return to Chats"
            onAction={onBack}
          />
        ) : (
          <EmptyState
            icon={<IconSearch className="w-6 h-6 text-zinc-400" />}
            title="No matching archived whispers"
            description={`No archived conversations matched "${searchQuery}".`}
            actionLabel="Clear Search"
            onAction={() => setSearchQuery('')}
          />
        )}
      </div>
    </motion.div>
  );
}
