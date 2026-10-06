import { PresenceStatus } from '../../types';

export interface AvatarProps {
  initials: string;
  name?: string;
  presence?: PresenceStatus;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  tone?: string;
  gradient?: string; // Kept for backwards compatibility, normalized to monochrome
  className?: string;
}

export function Avatar({
  initials,
  name,
  presence,
  size = 'md',
  tone,
  gradient,
  className = '',
}: AvatarProps) {
  const sizeMap = {
    xs: 'w-7 h-7 text-xs',
    sm: 'w-9 h-9 text-xs',
    md: 'w-11 h-11 text-sm',
    lg: 'w-14 h-14 text-base',
    xl: 'w-18 h-18 text-xl',
  }[size];

  const dotSizeMap = {
    xs: 'w-2 h-2 ring-1',
    sm: 'w-2.5 h-2.5 ring-1.5',
    md: 'w-3 h-3 ring-2',
    lg: 'w-3.5 h-3.5 ring-2',
    xl: 'w-4 h-4 ring-2',
  }[size];

  // Purposeful status accent indicators: strictly functional
  const presenceColor = {
    here: 'bg-emerald-500 ring-white dark:ring-zinc-950',
    focus: 'bg-amber-500 ring-white dark:ring-zinc-950',
    quiet: 'bg-zinc-400 dark:bg-zinc-500 ring-white dark:ring-zinc-950',
    walking: 'bg-zinc-400 dark:bg-zinc-500 ring-white dark:ring-zinc-950',
    offline: 'bg-zinc-300 dark:bg-zinc-700 ring-white dark:ring-zinc-950',
  }[presence || 'offline'];

  // Pure monochrome avatar tones - never gradients
  const rawTone = tone || gradient || '';
  const isInvalidGradient = rawTone.includes('gradient') || rawTone.includes('from-');

  const bgStyle = isInvalidGradient || !rawTone
    ? 'bg-zinc-900 text-zinc-50 dark:bg-zinc-800 dark:text-zinc-100 border border-zinc-200/80 dark:border-zinc-700/80'
    : `${rawTone} border border-zinc-200/80 dark:border-zinc-700/80`;

  return (
    <div className={`relative inline-block shrink-0 ${className}`}>
      <div
        className={`${sizeMap} rounded-full flex items-center justify-center font-semibold tracking-normal select-none shadow-xs ${bgStyle}`}
        aria-label={name || initials}
      >
        <span>{initials}</span>
      </div>

      {presence && (
        <span
          className={`absolute bottom-0 right-0 rounded-full ${dotSizeMap} ${presenceColor}`}
          title={`Status: ${presence}`}
        />
      )}
    </div>
  );
}

