import React from 'react';

interface TextProps extends React.HTMLAttributes<HTMLElement> {
  children: React.ReactNode;
  className?: string;
  as?: 'h1' | 'h2' | 'h3' | 'h4' | 'p' | 'span' | 'div';
}

export function DisplayTitle({ children, className = '', as = 'h1', ...props }: TextProps) {
  const Component = as;
  return (
    <Component
      className={`text-3xl sm:text-4xl font-light sm:font-normal tracking-tight text-zinc-950 dark:text-zinc-50 ${className}`}
      {...props}
    >
      {children}
    </Component>
  );
}

export function SectionTitle({ children, className = '', as = 'h2', ...props }: TextProps) {
  const Component = as;
  return (
    <Component
      className={`text-xl sm:text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100 ${className}`}
      {...props}
    >
      {children}
    </Component>
  );
}

export function Subhead({ children, className = '', as = 'p', ...props }: TextProps) {
  const Component = as;
  return (
    <Component
      className={`text-sm font-medium tracking-normal text-zinc-600 dark:text-zinc-400 ${className}`}
      {...props}
    >
      {children}
    </Component>
  );
}

export function BodyText({ children, className = '', as = 'p', ...props }: TextProps) {
  const Component = as;
  return (
    <Component
      className={`text-base leading-relaxed text-zinc-700 dark:text-zinc-300 ${className}`}
      {...props}
    >
      {children}
    </Component>
  );
}

export function Caption({ children, className = '', as = 'span', ...props }: TextProps) {
  const Component = as;
  return (
    <Component
      className={`text-xs font-normal tracking-wide text-zinc-500 dark:text-zinc-400 ${className}`}
      {...props}
    >
      {children}
    </Component>
  );
}

export function WhisperQuote({ children, className = '', ...props }: TextProps) {
  return (
    <blockquote
      className={`italic text-base sm:text-lg text-zinc-600 dark:text-zinc-300 pl-4 border-l-2 border-zinc-300 dark:border-zinc-700 ${className}`}
      {...props}
    >
      {children}
    </blockquote>
  );
}
