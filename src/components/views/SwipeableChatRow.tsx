import React, { useState, useRef, useCallback } from 'react';
import { motion, useMotionValue, useTransform, useAnimation, PanInfo } from 'motion/react';
import { ChatThread } from '../../types';
import { Avatar, Badge, ListRow } from '../ui';
import { TypingIndicator } from '../common/TypingIndicator';
import {
  IconArchive,
  IconArchiveRestore,
  IconCheck,
  IconCheckDouble,
  IconMic,
  IconCamera,
  IconHourglass,
  IconPin,
} from '../common/Icons';

export interface SwipeableChatRowProps {
  chat: ChatThread;
  onSelect: () => void;
  onToggleArchive: () => void;
  searchQuery?: string;
  isTyping?: boolean;
  highlightMatch?: (text: string, query: string) => React.ReactNode;
}

export const SwipeableChatRow: React.FC<SwipeableChatRowProps> = ({
  chat,
  onSelect,
  onToggleArchive,
  searchQuery = '',
  isTyping = false,
  highlightMatch = (t) => t,
}) => {
  const controls = useAnimation();
  const x = useMotionValue(0);
  const [isRevealed, setIsRevealed] = useState(false);
  const [isPastThreshold, setIsPastThreshold] = useState(false);

  // Track drag distance to differentiate between a tap and a genuine swipe
  const dragDistanceRef = useRef(0);
  const hasSwipedRef = useRef(false);
  const lastSelectTimeRef = useRef(0);

  // Dynamic visual feedback for archive action under the row
  const actionOpacity = useTransform(x, [-110, -35, 0], [1, 0.8, 0]);
  const actionScale = useTransform(x, [-120, -75, 0], [1.1, 1, 0.75]);

  const handleDragStart = () => {
    dragDistanceRef.current = 0;
    hasSwipedRef.current = false;
  };

  const handleDrag = (_: unknown, info: PanInfo) => {
    dragDistanceRef.current = Math.abs(info.offset.x);
    if (Math.abs(info.offset.x) > 8) {
      hasSwipedRef.current = true;
    }
    const currentX = info.offset.x;
    setIsPastThreshold(currentX < -85);
  };

  const handleDragEnd = async (_: unknown, info: PanInfo) => {
    const offset = info.offset.x;
    const velocity = info.velocity.x;
    dragDistanceRef.current = Math.abs(offset);

    if (Math.abs(offset) > 8) {
      hasSwipedRef.current = true;
    }

    // Full swipe trigger: user dragged past threshold (-85px) or flicked with velocity
    if (offset < -85 || (offset < -40 && velocity < -250)) {
      setIsPastThreshold(false);
      setIsRevealed(false);
      // Animate row completely off screen
      await controls.start({
        x: -320,
        opacity: 0,
        transition: { duration: 0.2, ease: 'easeOut' },
      });
      onToggleArchive();
      controls.set({ x: 0, opacity: 1 });
    } else if (offset < -40) {
      // Partial swipe: reveal the Archive button
      await controls.start({
        x: -78,
        opacity: 1,
        transition: { type: 'spring', damping: 25, stiffness: 350 },
      });
      setIsRevealed(true);
      setIsPastThreshold(false);
    } else {
      // Snap back to closed state
      await controls.start({
        x: 0,
        opacity: 1,
        transition: { type: 'spring', damping: 25, stiffness: 350 },
      });
      setIsRevealed(false);
      setIsPastThreshold(false);
    }

    // Reset swipe flag after brief delay
    setTimeout(() => {
      hasSwipedRef.current = false;
      dragDistanceRef.current = 0;
    }, 60);
  };

  const handleTapOrClick = useCallback(() => {
    // If the user performed an actual drag (> 8px), do not trigger tap
    if (hasSwipedRef.current || dragDistanceRef.current > 8) {
      return;
    }

    // If row was swiped open to revealed state, a tap simply snaps it back shut
    if (isRevealed || Math.abs(x.get()) > 10) {
      controls.start({
        x: 0,
        opacity: 1,
        transition: { type: 'spring', damping: 25, stiffness: 350 },
      });
      setIsRevealed(false);
      setIsPastThreshold(false);
      return;
    }

    // Debounce to prevent double invocation from simultaneous onTap and onClick
    const now = Date.now();
    if (now - lastSelectTimeRef.current < 350) return;
    lastSelectTimeRef.current = now;

    // Normal tap: open conversation!
    onSelect();
  }, [controls, isRevealed, onSelect, x]);

  const handleActionClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsRevealed(false);
    controls.start({
      x: 0,
      opacity: 1,
      transition: { duration: 0.15 },
    });
    onToggleArchive();
  };

  return (
    <div className="relative overflow-hidden rounded-2xl group select-none">
      {/* Background Revealed Action Layer */}
      <motion.div
        style={{ opacity: actionOpacity }}
        onClick={handleActionClick}
        className={`absolute inset-0 z-0 flex items-center justify-end px-4 rounded-2xl cursor-pointer transition-colors duration-150 ${
          chat.isArchived
            ? isPastThreshold
              ? 'bg-emerald-500 text-white'
              : 'bg-emerald-600 text-white'
            : isPastThreshold
            ? 'bg-amber-500 text-white'
            : 'bg-amber-600 text-white'
        }`}
        title={chat.isArchived ? 'Restore conversation' : 'Archive conversation'}
        aria-label={chat.isArchived ? 'Restore conversation' : 'Archive conversation'}
      >
        <motion.div
          style={{ scale: actionScale }}
          className="flex flex-col items-center justify-center gap-0.5 min-w-[56px] text-center"
        >
          {chat.isArchived ? (
            <IconArchiveRestore className="w-5 h-5 drop-shadow-2xs" />
          ) : (
            <IconArchive className="w-5 h-5 drop-shadow-2xs" />
          )}
          <span className="text-[10px] font-mono font-medium tracking-tight">
            {chat.isArchived ? 'Restore' : 'Archive'}
          </span>
        </motion.div>
      </motion.div>

      {/* Foreground Swipeable Chat Row */}
      <motion.div
        style={{ x }}
        animate={controls}
        drag="x"
        dragConstraints={{ left: -140, right: 0 }}
        dragElastic={{ left: 0.25, right: 0.04 }}
        onDragStart={handleDragStart}
        onDrag={handleDrag}
        onDragEnd={handleDragEnd}
        onTap={handleTapOrClick}
        className="relative z-10 w-full touch-pan-y bg-white dark:bg-zinc-950 rounded-2xl border border-transparent hover:border-zinc-200/40 dark:hover:border-zinc-800/40 cursor-pointer"
      >
        <ListRow
          onClick={handleTapOrClick}
          leading={
            <Avatar
              initials={chat.person.initials}
              name={chat.person.name}
              presence={chat.person.presence}
              size="md"
              gradient={chat.person.avatarColor}
            />
          }
          title={highlightMatch(chat.person.name, searchQuery)}
          badge={
            chat.person.isInnerCircle ? (
              <Badge variant="subtle" size="sm">
                {chat.person.relationship}
              </Badge>
            ) : undefined
          }
          subtitle={
            isTyping ? (
              <div className="flex items-center gap-1.5 py-0.5">
                <TypingIndicator
                  variant="header"
                  label={`${chat.person.name.split(' ')[0]} is typing`}
                />
              </div>
            ) : (
              <span className="flex items-center gap-1.5 truncate">
                {chat.lastMessage.sender === 'you' && (
                  <span
                    className="inline-flex items-center shrink-0"
                    title={
                      chat.lastMessage.status === 'read'
                        ? 'Read'
                        : chat.lastMessage.status === 'delivered'
                        ? 'Delivered'
                        : 'Sent'
                    }
                    aria-label={
                      chat.lastMessage.status === 'read'
                        ? 'Read receipt: Read'
                        : chat.lastMessage.status === 'delivered'
                        ? 'Delivery receipt: Delivered'
                        : 'Message sent'
                    }
                  >
                    {chat.lastMessage.status === 'read' &&
                    localStorage.getItem('among_read_receipts') !== 'false' ? (
                      <IconCheckDouble className="w-3.5 h-3.5 text-sky-500 dark:text-sky-400" />
                    ) : chat.lastMessage.status === 'delivered' ||
                      chat.lastMessage.status === 'read' ? (
                      <IconCheckDouble className="w-3.5 h-3.5 text-zinc-400 dark:text-zinc-500" />
                    ) : (
                      <IconCheck className="w-3.5 h-3.5 text-zinc-400 dark:text-zinc-500" />
                    )}
                  </span>
                )}
                {chat.lastMessage.text.toLowerCase().includes('voice note') && (
                  <IconMic className="w-3.5 h-3.5 text-zinc-400 dark:text-zinc-500 shrink-0 inline" />
                )}
                {(chat.lastMessage.type === 'photo' ||
                  chat.lastMessage.text.toLowerCase().includes('photo')) && (
                  <IconCamera className="w-3.5 h-3.5 text-zinc-400 dark:text-zinc-500 shrink-0 inline" />
                )}
                <span className="truncate">
                  {highlightMatch(chat.lastMessage.text, searchQuery)}
                </span>
              </span>
            )
          }
          metadata={
            <div className="flex items-center gap-1.5">
              {(() => {
                const timerSetting =
                  localStorage.getItem(`among_disappearing_timer_${chat.id}`) ||
                  chat.disappearingTimer;
                if (timerSetting && timerSetting !== 'off') {
                  return (
                    <span
                      title={`Disappearing messages active: ${timerSetting}`}
                      className="inline-flex items-center text-amber-500 dark:text-amber-400"
                    >
                      <IconHourglass className="w-3 h-3" />
                    </span>
                  );
                }
                return null;
              })()}
              {chat.isPinned && (
                <IconPin className="w-3 h-3 text-zinc-400 dark:text-zinc-500 fill-zinc-400/20" />
              )}
              <span>{chat.lastMessage.timestamp}</span>
            </div>
          }
          trailing={
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onToggleArchive();
              }}
              className="p-1.5 rounded-xl bg-white/95 dark:bg-zinc-850/95 border border-zinc-200/80 dark:border-zinc-700/80 shadow-2xs text-zinc-400 hover:text-amber-600 dark:hover:text-amber-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all cursor-pointer"
              title={chat.isArchived ? 'Restore to main chats' : 'Archive conversation (or swipe left)'}
              aria-label={
                chat.isArchived
                  ? `Unarchive ${chat.person.name}`
                  : `Archive ${chat.person.name}`
              }
            >
              {chat.isArchived ? (
                <IconArchiveRestore className="w-3.5 h-3.5" />
              ) : (
                <IconArchive className="w-3.5 h-3.5" />
              )}
            </button>
          }
          isUnread={chat.lastMessage.isUnread}
        />
      </motion.div>
    </div>
  );
};
