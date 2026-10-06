import type { HTMLAttributes, ReactNode } from 'react';

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'surface' | 'elevated' | 'sunken' | 'outline' | 'interactive';
  padding?: 'none' | 'sm' | 'md' | 'lg';
  children: ReactNode;
  className?: string;
  onClick?: () => void;
}

/**
 * Among Design System Card Primitive
 * Tight, calm, mathematical padding hierarchy with crisp borders and calm neutrals.
 * Supports light & dark modes with subtle contrast.
 */
export function Card({
  variant = 'surface',
  padding = 'md',
  children,
  className = '',
  onClick,
  ...props
}: CardProps) {
  const paddingStyles = {
    none: 'p-0',
    sm: 'p-2.5',
    md: 'p-3.5',
    lg: 'p-4 sm:p-5',
  }[padding];

  const variantStyles = {
    surface:
      'bg-zinc-50 dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800/80 text-zinc-950 dark:text-zinc-50',
    elevated:
      'bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800/80 shadow-2xs text-zinc-950 dark:text-zinc-50',
    sunken:
      'bg-zinc-100/90 dark:bg-zinc-950 border border-zinc-200/70 dark:border-zinc-800/60 text-zinc-900 dark:text-zinc-100',
    outline:
      'bg-transparent border border-zinc-200 dark:border-zinc-800 text-zinc-950 dark:text-zinc-50',
    interactive:
      'bg-zinc-50 hover:bg-zinc-100 dark:bg-zinc-900 dark:hover:bg-zinc-850 border border-zinc-200/80 hover:border-zinc-300 dark:border-zinc-800/80 dark:hover:border-zinc-700 text-zinc-950 dark:text-zinc-50 cursor-pointer transition-colors duration-150 active:scale-[0.99]',
  }[variant];

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
      className={`rounded-xl transition-all ${paddingStyles} ${variantStyles} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}
