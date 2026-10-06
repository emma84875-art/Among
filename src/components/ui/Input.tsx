import { forwardRef, type InputHTMLAttributes, type ReactNode } from 'react';
import { IconSearch, IconClose } from '../common/Icons';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  hint?: string;
  error?: string;
  isSearch?: boolean;
  onClear?: () => void;
  prefixText?: string;
  trailing?: ReactNode;
  className?: string;
  id?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  {
    label,
    hint,
    error,
    isSearch = false,
    onClear,
    prefixText,
    trailing,
    value,
    className = '',
    id,
    ...props
  },
  ref
) {
  const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

  return (
    <div className="w-full">
      {label && (
        <label
          htmlFor={inputId}
          className="block text-xs font-medium tracking-wide text-zinc-700 dark:text-zinc-300 mb-1.5"
        >
          {label}
        </label>
      )}

      <div className="relative flex items-center">
        {isSearch && (
          <IconSearch className="absolute left-3.5 h-4 w-4 text-zinc-400 dark:text-zinc-500 pointer-events-none" />
        )}

        {prefixText && (
          <span className="absolute left-3.5 text-sm font-medium text-zinc-400 dark:text-zinc-500 pointer-events-none select-none">
            {prefixText}
          </span>
        )}

        <input
          ref={ref}
          id={inputId}
          value={value}
          className={`w-full bg-zinc-50 dark:bg-zinc-900 text-zinc-950 dark:text-zinc-50 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 text-sm rounded-xl py-2.5 transition-all border border-zinc-200 dark:border-zinc-800 focus:outline-none focus:border-zinc-950 dark:focus:border-zinc-100 focus:bg-white dark:focus:bg-zinc-900 ${
            isSearch ? 'pl-10 pr-9' : prefixText ? 'pl-8 pr-3.5' : trailing || onClear ? 'pl-3.5 pr-10' : 'px-3.5'
          } ${error ? 'border-rose-600 dark:border-rose-500' : ''} ${className}`}
          {...props}
        />

        {value && onClear && !trailing && (
          <button
            type="button"
            onClick={onClear}
            className="absolute right-3 p-1 rounded-full text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 focus:outline-none cursor-pointer"
            aria-label="Clear text"
          >
            <IconClose className="h-3.5 w-3.5" />
          </button>
        )}

        {trailing && (
          <div className="absolute right-3 flex items-center">
            {trailing}
          </div>
        )}
      </div>

      {hint && !error && (
        <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">{hint}</p>
      )}
      {error && (
        <p className="mt-1 text-xs text-rose-600 dark:text-rose-400 font-medium">{error}</p>
      )}
    </div>
  );
});
