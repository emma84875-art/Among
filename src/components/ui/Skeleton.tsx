import React from 'react';

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
  variant?: 'rectangular' | 'rounded' | 'circular' | 'text';
  shimmer?: boolean;
}

/**
 * Base tranquil Skeleton primitive for Among design system.
 * Uses gentle pulse & optional atmospheric shimmer that matches the app's calm aesthetic.
 */
export const Skeleton: React.FC<SkeletonProps> = ({
  className = '',
  variant = 'rounded',
  shimmer = true,
  ...props
}) => {
  const variantClasses = {
    rectangular: 'rounded-none',
    rounded: 'rounded-xl',
    circular: 'rounded-full',
    text: 'rounded-md h-3.5',
  }[variant];

  return (
    <div
      aria-hidden="true"
      className={`relative overflow-hidden select-none bg-zinc-200/85 dark:bg-zinc-800/85 animate-pulse ${variantClasses} ${
        shimmer
          ? 'after:absolute after:inset-0 after:-translate-x-full after:animate-[shimmer_1.8s_infinite] after:bg-gradient-to-r after:from-transparent after:via-white/45 dark:after:via-white/12 after:to-transparent'
          : ''
      } ${className}`}
      {...props}
    />
  );
};

/**
 * Skeleton placeholder that mirrors a Chat item in ChatsView.
 */
export const ChatRowSkeleton: React.FC<{ delayIndex?: number }> = ({ delayIndex = 0 }) => {
  return (
    <div
      className="flex items-center gap-3 py-3 px-3 rounded-2xl bg-white/40 dark:bg-zinc-950/40 select-none border border-transparent"
      style={{
        animationDelay: `${delayIndex * 120}ms`,
      }}
    >
      {/* Avatar placeholder */}
      <Skeleton variant="circular" className="w-10 h-10 shrink-0" />

      {/* Content lines */}
      <div className="flex-1 min-w-0 space-y-2">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Skeleton
              variant="text"
              className={delayIndex % 2 === 0 ? 'w-24 h-4' : 'w-32 h-4'}
            />
            {delayIndex % 2 === 0 && (
              <Skeleton variant="rounded" className="w-12 h-3.5 rounded-full" />
            )}
          </div>
          <Skeleton variant="text" className="w-10 h-3" />
        </div>

        <div className="flex items-center justify-between gap-4">
          <Skeleton
            variant="text"
            className={delayIndex % 3 === 0 ? 'w-48 h-3' : delayIndex % 2 === 0 ? 'w-36 h-3' : 'w-56 h-3'}
          />
          <Skeleton variant="circular" className="w-3.5 h-3.5 shrink-0 opacity-60" />
        </div>
      </div>
    </div>
  );
};

/**
 * Full Chat List Skeleton screen with header and rows.
 */
export const ChatListSkeleton: React.FC<{ count?: number }> = ({ count = 5 }) => {
  return (
    <div className="space-y-1.5 w-full">
      {Array.from({ length: count }).map((_, i) => (
        <ChatRowSkeleton key={i} delayIndex={i} />
      ))}
    </div>
  );
};

/**
 * Skeleton placeholder that mirrors a Person connection row in PeopleView.
 */
export const PersonRowSkeleton: React.FC<{ delayIndex?: number }> = ({ delayIndex = 0 }) => {
  return (
    <div
      className="flex items-center justify-between gap-3 py-3 px-3 rounded-2xl bg-white/40 dark:bg-zinc-950/40 select-none border border-transparent"
      style={{
        animationDelay: `${delayIndex * 120}ms`,
      }}
    >
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <Skeleton variant="circular" className="w-10 h-10 shrink-0" />
        <div className="space-y-1.5 flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <Skeleton variant="text" className="w-28 h-4" />
            {delayIndex === 0 && (
              <Skeleton variant="rounded" className="w-12 h-3.5 rounded-full" />
            )}
          </div>
          <Skeleton variant="text" className="w-36 h-3 opacity-75" />
        </div>
      </div>

      <Skeleton variant="rounded" className="w-16 h-7 rounded-xl shrink-0" />
    </div>
  );
};

/**
 * Full People List Skeleton screen.
 */
export const PeopleListSkeleton: React.FC<{ count?: number }> = ({ count = 5 }) => {
  return (
    <div className="space-y-1.5 w-full">
      {Array.from({ length: count }).map((_, i) => (
        <PersonRowSkeleton key={i} delayIndex={i} />
      ))}
    </div>
  );
};

/**
 * Skeleton placeholder for individual message bubbles in ConversationScreen.
 */
export const MessageBubbleSkeleton: React.FC<{
  isSent?: boolean;
  widthClass?: string;
  hasAttachment?: boolean;
}> = ({ isSent = false, widthClass = 'w-48', hasAttachment = false }) => {
  return (
    <div className={`flex w-full ${isSent ? 'justify-end' : 'justify-start'} py-1`}>
      <div
        className={`max-w-[82%] rounded-2xl px-3.5 py-2.5 flex flex-col gap-1.5 ${
          isSent
            ? 'bg-zinc-200/80 dark:bg-zinc-800/80 rounded-br-sm'
            : 'bg-zinc-100/90 dark:bg-zinc-900/90 rounded-bl-sm border border-zinc-200/50 dark:border-zinc-800/50'
        }`}
      >
        {hasAttachment && (
          <Skeleton
            variant="rounded"
            className="w-44 h-28 rounded-xl mb-1 opacity-80"
          />
        )}
        <Skeleton variant="text" className={`${widthClass} h-3.5`} />
        <div className="flex items-center justify-end gap-1 mt-0.5 pt-0.5">
          <Skeleton variant="text" className="w-8 h-2.5 opacity-60" />
          {isSent && <Skeleton variant="circular" className="w-2.5 h-2.5 opacity-60" />}
        </div>
      </div>
    </div>
  );
};

/**
 * Full Conversation Screen skeleton (header + messages + input).
 */
export const ConversationSkeleton: React.FC = () => {
  return (
    <div className="flex flex-col h-full w-full bg-white dark:bg-zinc-950 overflow-hidden">
      {/* Top Header */}
      <div className="shrink-0 flex items-center justify-between px-4 py-3 border-b border-zinc-200/70 dark:border-zinc-800/70 bg-white/90 dark:bg-zinc-950/90">
        <div className="flex items-center gap-3">
          <Skeleton variant="circular" className="w-7 h-7" />
          <Skeleton variant="circular" className="w-8 h-8" />
          <div className="space-y-1">
            <Skeleton variant="text" className="w-24 h-3.5" />
            <Skeleton variant="text" className="w-14 h-2.5 opacity-70" />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Skeleton variant="rounded" className="w-7 h-7 rounded-lg" />
          <Skeleton variant="rounded" className="w-7 h-7 rounded-lg" />
        </div>
      </div>

      {/* Messages Stream */}
      <div className="flex-1 p-4 space-y-3 overflow-hidden">
        <div className="flex justify-center my-2">
          <Skeleton variant="rounded" className="w-16 h-4 rounded-full opacity-60" />
        </div>
        <MessageBubbleSkeleton isSent={false} widthClass="w-56" />
        <MessageBubbleSkeleton isSent={true} widthClass="w-40" />
        <MessageBubbleSkeleton isSent={false} widthClass="w-48" hasAttachment />
        <MessageBubbleSkeleton isSent={true} widthClass="w-52" />
        <MessageBubbleSkeleton isSent={false} widthClass="w-32" />
      </div>

      {/* Bottom Composer */}
      <div className="p-3 border-t border-zinc-200/70 dark:border-zinc-800/70 flex items-center gap-2 bg-white dark:bg-zinc-950">
        <Skeleton variant="rounded" className="w-8 h-8 rounded-full" />
        <Skeleton variant="rounded" className="flex-1 h-9 rounded-full" />
        <Skeleton variant="circular" className="w-8 h-8" />
      </div>
    </div>
  );
};

/**
 * Top-level application shell skeleton with header, chat list items, and bottom navigation bar.
 */
export const AppShellSkeleton: React.FC = () => {
  return (
    <div className="flex flex-col min-h-screen w-full max-w-md mx-auto bg-white dark:bg-zinc-950 px-5 py-4 pb-20 justify-between select-none">
      <div className="space-y-4">
        {/* Top Header */}
        <div className="flex items-center justify-between pt-2 pb-2">
          <div className="space-y-1.5">
            <Skeleton variant="text" className="w-16 h-3" />
            <Skeleton variant="text" className="w-28 h-7 rounded-lg" />
          </div>
          <div className="flex items-center gap-2">
            <Skeleton variant="rounded" className="w-14 h-6 rounded-full" />
            <Skeleton variant="rounded" className="w-8 h-8 rounded-xl" />
          </div>
        </div>

        {/* Search bar skeleton */}
        <Skeleton variant="rounded" className="w-full h-11 rounded-xl" />

        {/* Filter chips skeleton */}
        <div className="flex items-center gap-1.5 pt-1">
          <Skeleton variant="rounded" className="w-12 h-6 rounded-full" />
          <Skeleton variant="rounded" className="w-16 h-6 rounded-full" />
          <Skeleton variant="rounded" className="w-16 h-6 rounded-full" />
        </div>

        {/* List items skeleton */}
        <div className="pt-2">
          <ChatListSkeleton count={5} />
        </div>
      </div>

      {/* Bottom Navigation skeleton */}
      <div className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-white/95 dark:bg-zinc-950/95 border-t border-zinc-200/80 dark:border-zinc-800/80 px-6 py-2.5 flex items-center justify-around">
        <Skeleton variant="circular" className="w-6 h-6" />
        <Skeleton variant="circular" className="w-6 h-6" />
        <Skeleton variant="circular" className="w-6 h-6" />
      </div>
    </div>
  );
};

