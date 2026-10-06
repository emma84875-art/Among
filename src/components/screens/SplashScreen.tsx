import { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { AmongLogo } from '../common/AmongLogo';
import { IconSecurity, IconChevronRight } from '../common/Icons';

interface SplashScreenProps {
  onComplete: () => void;
  onViewPrinciples?: () => void;
  onSkip?: () => void;
}

export function SplashScreen({ onComplete, onViewPrinciples }: SplashScreenProps) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // Auto timer to allow the tranquil splash feeling to settle
    const timer = setTimeout(() => {
      setReady(true);
    }, 1800);

    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="relative min-h-screen w-full flex flex-col justify-between items-center px-6 py-12 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 overflow-hidden select-none transition-colors duration-200">
      {/* Top security footnote */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
        className="flex items-center gap-1.5 text-xs text-zinc-600 dark:text-zinc-400 tracking-wide"
      >
        <IconSecurity className="w-3.5 h-3.5 text-zinc-700 dark:text-zinc-300" />
        <span>End-to-end quiet sanctuary</span>
      </motion.div>

      {/* Center Brand & Philosophy */}
      <div className="flex flex-col items-center text-center my-auto z-10 max-w-sm">
        <AmongLogo variant="splash" animated />

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.3 }}
          className="mt-6 space-y-2"
        >
          <p className="text-xl sm:text-2xl text-zinc-900 dark:text-zinc-100 font-normal tracking-tight">
            Stay close to your people.
          </p>
          <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 max-w-xs mx-auto leading-relaxed">
            A calm, private messaging space built for the few who matter most.
          </p>
        </motion.div>
      </div>

      {/* Bottom CTA / Tranquil Advance */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3, duration: 0.3 }}
        className="w-full max-w-xs flex flex-col items-center gap-4 z-10"
      >
        <button
          type="button"
          onClick={onComplete}
          className="group w-full h-12 rounded-full bg-zinc-950 hover:bg-zinc-800 text-zinc-50 dark:bg-zinc-100 dark:hover:bg-zinc-200 dark:text-zinc-950 flex items-center justify-center gap-2 text-sm font-medium transition-all shadow-sm active:scale-[0.98] cursor-pointer"
        >
          <span>Step inside</span>
          <IconChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
        </button>

        <div className="flex items-center gap-3 text-[11px] text-zinc-500 dark:text-zinc-400">
          <span className="tracking-wider uppercase">
            {ready ? 'Ready when you are' : 'Establishing local key...'}
          </span>
          {onViewPrinciples && (
            <>
              <span>·</span>
              <button
                type="button"
                onClick={onViewPrinciples}
                className="hover:text-zinc-900 dark:hover:text-zinc-200 underline underline-offset-4 cursor-pointer transition-colors"
              >
                Principles
              </button>
            </>
          )}
        </div>
      </motion.div>
    </div>
  );
}
