import React from 'react';
import { motion } from 'motion/react';

export type LogoVariant = 'primary' | 'compact' | 'splash' | 'app-icon' | 'symbol-only';
export type LogoSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'hero';

export interface AmongLogoProps {
  variant?: LogoVariant;
  size?: LogoSize;
  animated?: boolean;
  className?: string;
  showWordmark?: boolean;
  layout?: 'horizontal' | 'vertical';
  subtitle?: string;
}

/**
 * The New AMONG Distinctive Symbol: "The Sanctuary Embrace"
 * Represents connection (two beings reaching in), belonging (shared sanctuary space),
 * and privacy (protective outer haven and inner sheltered hearth).
 */
export function AmongSymbol({
  className = 'w-10 h-10',
  size,
}: {
  className?: string;
  size?: number;
}) {
  return (
    <svg
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      width={size}
      height={size}
      aria-label="Among sanctuary mark"
    >
      {/* Outer Protective Haven Contour (Privacy & Refuge) */}
      <path
        d="M24 6C14.0589 6 6 14.0589 6 24C6 33.9411 14.0589 42 24 42C33.9411 42 42 33.9411 42 24C42 14.0589 33.9411 6 24 6Z"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        className="opacity-25"
      />

      {/* Left Communion Arc (Connection - One leaning in to shelter) */}
      <path
        d="M24 10C16.268 10 10 16.268 10 24C10 29.5 13.2 34.3 18 36.4C19.8 37.2 21.6 36 21.6 34.1C21.6 32.7 20.6 31.5 19.3 30.9C16.1 29.5 14 26.3 14 22.5C14 17.8 17.8 14 22.5 14C24.8 14 26.8 14.9 28.3 16.4"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
      />

      {/* Right Communion Arc (Belonging - The other meeting in quiet communion) */}
      <path
        d="M24 38C31.732 38 38 31.732 38 24C38 18.5 34.8 13.7 30 11.6C28.2 10.8 26.4 12 26.4 13.9C26.4 15.3 27.4 16.5 28.7 17.1C31.9 18.5 34 21.7 34 25.5C34 30.2 30.2 34 25.5 34C23.2 34 21.2 33.1 19.7 31.6"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
      />

      {/* Center Sanctuary Hearth (The intimate, protected private space) */}
      <circle
        cx="24"
        cy="24"
        r="3.2"
        fill="currentColor"
        className="text-zinc-900 dark:text-zinc-100"
      />
      <circle
        cx="24"
        cy="24"
        r="1.2"
        className="fill-white dark:fill-zinc-950"
      />
    </svg>
  );
}

/**
 * The New AMONG Wordmark:
 * Minimal, Premium, Modern, Calm, Distinctive, Strong but understated.
 * Employs IBM Plex Mono with refined letter spacing and proportions.
 */
export function AmongWordmark({
  size = 'md',
  className = '',
}: {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'hero';
  className?: string;
}) {
  const sizeClasses = {
    xs: 'text-[10px] tracking-[0.24em]',
    sm: 'text-xs tracking-[0.26em]',
    md: 'text-sm tracking-[0.28em]',
    lg: 'text-xl tracking-[0.3em]',
    xl: 'text-2xl tracking-[0.32em]',
    hero: 'text-3xl sm:text-4xl tracking-[0.34em]',
  }[size];

  return (
    <span
      className={`font-semibold tracking-tight select-none text-zinc-950 dark:text-zinc-50 ${sizeClasses} ${className}`}
      style={{ fontFamily: "'IBM Plex Mono', ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace" }}
    >
      Among
    </span>
  );
}

/**
 * Primary Among Logo Component with support for:
 * - 'primary': standard lockup (horizontal or vertical)
 * - 'compact': for small spaces, toolbars & headers
 * - 'splash': large hero version with atmospheric aura and calm cadence
 * - 'app-icon': standalone symbol in squircle tile
 * - 'symbol-only': bare vector mark
 */
export function AmongLogo({
  variant = 'primary',
  size = 'md',
  animated = false,
  className = '',
  showWordmark = true,
  layout = 'vertical',
  subtitle,
}: AmongLogoProps) {
  // App-Icon Version
  if (variant === 'app-icon') {
    const tileSizes = {
      xs: 'w-8 h-8 rounded-xl',
      sm: 'w-10 h-10 rounded-2xl',
      md: 'w-14 h-14 rounded-2xl',
      lg: 'w-20 h-20 rounded-3xl',
      xl: 'w-28 h-28 rounded-[32px]',
      hero: 'w-36 h-36 rounded-[40px]',
    }[size];

    const symbolSizes = {
      xs: 'w-5 h-5',
      sm: 'w-6 h-6',
      md: 'w-9 h-9',
      lg: 'w-13 h-13',
      xl: 'w-18 h-18',
      hero: 'w-24 h-24',
    }[size];

    return (
      <div
        className={`relative flex items-center justify-center bg-zinc-950 dark:bg-black text-zinc-100 shadow-md border border-zinc-800 select-none ${tileSizes} ${className}`}
        role="img"
        aria-label="Among App Icon"
      >
        <AmongSymbol className={symbolSizes} />
      </div>
    );
  }

  // Compact Logo for small spaces
  if (variant === 'compact') {
    return (
      <div className={`inline-flex items-center gap-2 select-none ${className}`}>
        <AmongSymbol className="w-5 h-5 text-zinc-900 dark:text-zinc-100" />
        {showWordmark && (
          <AmongWordmark size="xs" className="font-semibold text-zinc-800 dark:text-zinc-200" />
        )}
      </div>
    );
  }

  // Splash Screen Version
  if (variant === 'splash') {
    const splashContent = (
      <div className={`flex flex-col items-center justify-center text-center select-none ${className}`}>
        <div className="mb-5 flex items-center justify-center">
          <AmongSymbol className="w-20 h-20 relative z-10 text-zinc-950 dark:text-zinc-50" />
        </div>

        {/* Hero Wordmark */}
        <AmongWordmark size="hero" className="font-medium" />

        {/* Subtitle / Sanctuary Tagline */}
        {subtitle && (
          <p className="mt-3 text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 max-w-xs leading-relaxed font-normal">
            {subtitle}
          </p>
        )}
      </div>
    );

    if (animated) {
      return (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4 }}
        >
          {splashContent}
        </motion.div>
      );
    }
    return splashContent;
  }

  // Symbol-only version
  if (variant === 'symbol-only' || !showWordmark) {
    const symbolSizes = {
      xs: 'w-4 h-4',
      sm: 'w-6 h-6',
      md: 'w-10 h-10',
      lg: 'w-14 h-14',
      xl: 'w-20 h-20',
      hero: 'w-28 h-28',
    }[size];

    return (
      <div className={`flex items-center justify-center text-zinc-900 dark:text-zinc-100 ${className}`}>
        <AmongSymbol className={symbolSizes} />
      </div>
    );
  }

  // Primary AMONG Logo (Horizontal or Vertical)
  const symbolClass = {
    xs: 'w-4 h-4',
    sm: 'w-6 h-6',
    md: 'w-9 h-9',
    lg: 'w-12 h-12',
    xl: 'w-16 h-16',
    hero: 'w-24 h-24',
  }[size];

  const wordmarkSize = {
    xs: 'xs',
    sm: 'sm',
    md: 'md',
    lg: 'lg',
    xl: 'xl',
    hero: 'hero',
  }[size] as 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'hero';

  const isHorizontal = layout === 'horizontal';

  const primaryContent = (
    <div
      className={`flex ${
        isHorizontal ? 'flex-row items-center gap-2.5' : 'flex-col items-center justify-center gap-3'
      } text-zinc-900 dark:text-zinc-100 select-none ${className}`}
    >
      <AmongSymbol className={symbolClass} />
      <AmongWordmark size={wordmarkSize} />
      {subtitle && (
        <span className="text-[11px] text-zinc-500 dark:text-zinc-400 font-normal">
          {subtitle}
        </span>
      )}
    </div>
  );

  if (animated) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      >
        {primaryContent}
      </motion.div>
    );
  }

  return primaryContent;
}
