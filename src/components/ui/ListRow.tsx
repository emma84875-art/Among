import type { ReactNode, Key } from 'react';
import { IconChevronRight } from '../common/Icons';

export interface ListRowProps {
  key?: Key;
  leading?: ReactNode;
  title: ReactNode;
  subtitle?: ReactNode;
  metadata?: ReactNode;
  badge?: ReactNode;
  trailing?: ReactNode;
  showChevron?: boolean;
  isUnread?: boolean;
  onClick?: () => void;
  className?: string;
}

export function ListRow({
  leading,
  title,
  subtitle,
  metadata,
  badge,
  trailing,
  showChevron = false,
  isUnread = false,
  onClick,
  className = '',
}: ListRowProps) {
  return (
    <div
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick}
      onKeyDown={(e) => {
        if (onClick && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          onClick();
        }
      }}
      className={`group relative w-full flex items-center gap-3 py-3 px-3 rounded-2xl transition-all duration-150 select-none ${
        onClick
          ? 'cursor-pointer hover:bg-zinc-100/90 dark:hover:bg-zinc-900/90 active:bg-zinc-200/60 dark:active:bg-zinc-800/80 focus:outline-none focus-visible:ring-1 focus-visible:ring-zinc-400'
          : ''
      } ${className}`}
    >
      {leading && <div className="shrink-0">{leading}</div>}

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2 mb-0.5">
          <div className="flex items-center gap-2 min-w-0">
            <span
              className={`text-sm truncate ${
                isUnread
                  ? 'font-semibold text-zinc-950 dark:text-zinc-50'
                  : 'font-medium text-zinc-900 dark:text-zinc-100'
              }`}
            >
              {title}
            </span>
            {badge}
          </div>

          {metadata ? (
            <div className="shrink-0 flex items-center gap-1.5 relative">
              <span
                className={`text-xs text-zinc-400 dark:text-zinc-500 font-normal transition-opacity duration-150 ${
                  trailing ? 'group-hover:opacity-0 focus-within:opacity-0' : ''
                }`}
              >
                {metadata}
              </span>
              {trailing && (
                <div className="absolute right-0 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity z-10 flex items-center">
                  {trailing}
                </div>
              )}
            </div>
          ) : (
            trailing && (
              <div className="shrink-0 flex items-center text-zinc-400 group-hover:text-zinc-600 dark:group-hover:text-zinc-300">
                {trailing}
              </div>
            )
          )}
        </div>

        {subtitle && (
          <div className="flex items-center justify-between gap-2">
            <div
              className={`text-xs truncate leading-relaxed ${
                isUnread
                  ? 'text-zinc-800 dark:text-zinc-200 font-medium'
                  : 'text-zinc-500 dark:text-zinc-400'
              }`}
            >
              {subtitle}
            </div>

            {isUnread && (
              <span
                className="shrink-0 w-2 h-2 rounded-full bg-amber-500"
                aria-label="Unread"
              />
            )}
          </div>
        )}
      </div>

      {showChevron && (
        <div className="shrink-0 flex items-center text-zinc-400 group-hover:text-zinc-600 dark:group-hover:text-zinc-300">
          <IconChevronRight className="w-4 h-4 ml-1" />
        </div>
      )}
    </div>
  );
}
