import React from 'react';
import { Button } from './Button';
import { IconSecurity } from '../common/Icons';

export interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  secondaryActionLabel?: string;
  onSecondaryAction?: () => void;
  className?: string;
}

export function EmptyState({
  icon,
  title,
  description,
  actionLabel,
  onAction,
  secondaryActionLabel,
  onSecondaryAction,
  className = '',
}: EmptyStateProps) {
  return (
    <div
      className={`flex flex-col items-center justify-center text-center px-8 py-16 max-w-sm mx-auto ${className}`}
    >
      <div className="w-16 h-16 rounded-full bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 flex items-center justify-center text-zinc-500 dark:text-zinc-400 mb-5 shadow-xs">
        {icon || <IconSecurity className="w-7 h-7 text-zinc-400 dark:text-zinc-500" />}
      </div>

      <h3 className="text-xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50 mb-2">
        {title}
      </h3>

      <p className="text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed mb-6 max-w-xs">
        {description}
      </p>

      <div className="flex flex-col sm:flex-row items-center gap-2.5 w-full justify-center">
        {actionLabel && onAction && (
          <Button variant="primary" size="md" onClick={onAction}>
            {actionLabel}
          </Button>
        )}

        {secondaryActionLabel && onSecondaryAction && (
          <Button variant="ghost" size="md" onClick={onSecondaryAction}>
            {secondaryActionLabel}
          </Button>
        )}
      </div>
    </div>
  );
}
