import React from 'react';

export interface BadgeProps {
  children: React.ReactNode;
  variant?: 'neutral' | 'subtle' | 'accent' | 'outline' | 'status';
  size?: 'sm' | 'md';
  className?: string;
  icon?: React.ReactNode;
}

export function Badge({
  children,
  variant = 'neutral',
  size = 'sm',
  className = '',
  icon,
}: BadgeProps) {
  const sizeStyles = {
    sm: 'text-[11px] px-2 py-0.5 tracking-wider uppercase',
    md: 'text-xs px-2.5 py-1',
  }[size];

  const variantStyles = {
    neutral: 'bg-zinc-200 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200',
    subtle: 'bg-zinc-100 text-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-800',
    accent: 'bg-zinc-950 text-white dark:bg-zinc-100 dark:text-zinc-950 font-semibold',
    outline: 'border border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300',
    status: 'bg-amber-100 text-amber-900 dark:bg-amber-950/80 dark:text-amber-300 border border-amber-300/60 dark:border-amber-700/60',
  }[variant];

  return (
    <span
      className={`inline-flex items-center gap-1 font-medium rounded-full whitespace-nowrap select-none ${sizeStyles} ${variantStyles} ${className}`}
    >
      {icon && <span className="shrink-0">{icon}</span>}
      {children}
    </span>
  );
}
