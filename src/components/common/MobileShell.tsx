import React, { useState, useEffect } from 'react';
import { AmongLogo } from './AmongLogo';
import { IconWifi, IconBattery, IconBluetooth, IconSmartphone, IconMaximize, IconSun, IconMoon } from './Icons';
import { useTheme } from '../../context/ThemeContext';
import { useMeshNetwork } from '../../lib/mesh';

interface MobileShellProps {
  children: React.ReactNode;
  activePlatform?: 'ios' | 'android';
}

export function MobileShell({ children }: MobileShellProps) {
  const [isFrameMode, setIsFrameMode] = useState(true);
  const [currentTime, setCurrentTime] = useState('09:41');
  const { appearance, resolvedTheme, toggleTheme } = useTheme();
  const { meshState } = useMeshNetwork();

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const hours = now.getHours().toString().padStart(2, '0');
      const minutes = now.getMinutes().toString().padStart(2, '0');
      setCurrentTime(`${hours}:${minutes}`);
    };
    updateTime();
    const interval = setInterval(updateTime, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-start bg-zinc-200 dark:bg-black p-0 sm:p-4 md:p-6 transition-colors duration-300">
      {/* Desktop Preview Toolbar */}
      <div className="hidden sm:flex items-center justify-between w-full max-w-md mb-3 px-3 py-1.5 rounded-full bg-white/90 dark:bg-zinc-900/90 border border-zinc-300 dark:border-zinc-800 text-xs text-zinc-600 dark:text-zinc-400 shadow-xs">
        <div className="flex items-center gap-2">
          <AmongLogo variant="compact" showWordmark={true} />
          <span className="text-[11px] text-zinc-400">· Preview</span>
        </div>

        <div className="flex items-center gap-1.5">
          {/* Quick Theme Toggle */}
          <button
            type="button"
            id="mobile-shell-theme-toggle"
            onClick={toggleTheme}
            className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 transition-colors cursor-pointer"
            title={`Active: ${appearance} (rendering ${resolvedTheme}). Click to switch theme.`}
            aria-label="Toggle light/dark theme"
          >
            {resolvedTheme === 'dark' ? (
              <>
                <IconSun className="w-3 h-3 text-amber-400" />
                <span>Light</span>
              </>
            ) : (
              <>
                <IconMoon className="w-3 h-3 text-zinc-600" />
                <span>Dark</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={() => setIsFrameMode(!isFrameMode)}
            className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 transition-colors cursor-pointer"
            title="Toggle between framed mobile mockup and fluid layout"
          >
            {isFrameMode ? (
              <>
                <IconMaximize className="w-3 h-3" />
                <span>Fluid</span>
              </>
            ) : (
              <>
                <IconSmartphone className="w-3 h-3" />
                <span>Device Frame</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Main Container */}
      <div
        className={`w-full transition-all duration-300 flex flex-col transform-gpu [transform:translateZ(0)] ${
          isFrameMode
            ? 'sm:max-w-[420px] sm:h-[844px] sm:max-h-[92vh] sm:rounded-[44px] sm:ring-12 sm:ring-zinc-900 dark:sm:ring-zinc-800 sm:shadow-2xl overflow-hidden'
            : 'max-w-2xl min-h-screen sm:min-h-[90vh] sm:rounded-3xl sm:border sm:border-zinc-300 dark:sm:border-zinc-800 overflow-hidden shadow-lg'
        }`}
      >
        {/* Device Status Bar */}
        <div className="w-full bg-white dark:bg-zinc-950 pt-3 pb-1 px-7 flex items-center justify-between z-30 select-none text-xs font-semibold text-zinc-950 dark:text-zinc-100 transition-colors duration-300 border-b border-zinc-100 dark:border-zinc-900">
          <span>{currentTime}</span>

          {/* Dynamic Island / Camera pill in frame mode */}
          <div className="w-24 h-5 rounded-full bg-zinc-950 dark:bg-zinc-900 flex items-center justify-center">
            <div className="w-2 h-2 rounded-full bg-zinc-800 dark:bg-zinc-950 ml-auto mr-3" />
          </div>

          <div className="flex items-center gap-1.5">
            {!meshState.isOnline ? (
              <span title="Offline: Bluetooth Mesh Active" className="flex items-center text-emerald-600 dark:text-emerald-400">
                <IconBluetooth className="w-3.5 h-3.5" />
              </span>
            ) : (
              <IconWifi className="w-3.5 h-3.5" />
            )}
            <span
              title={
                meshState.batterySaver
                  ? 'Battery Saver Active (60s mesh scan interval)'
                  : 'Standard Battery (10s mesh scan interval)'
              }
              className={`flex items-center ${
                meshState.batterySaver
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : 'text-zinc-950 dark:text-zinc-100'
              }`}
            >
              <IconBattery className="w-4 h-4" />
            </span>
          </div>
        </div>

        {/* Inner Screen Content */}
        <div
          id="mobile-screen-root"
          className="flex-1 w-full bg-white dark:bg-zinc-950 overflow-hidden flex flex-col relative transition-colors duration-300 min-h-0"
        >
          {children}
        </div>

        {/* Mobile Home Indicator Pill */}
        <div className="w-full bg-white dark:bg-zinc-950 pb-2 pt-1 flex justify-center z-30 select-none transition-colors duration-300">
          <div className="w-32 h-1 rounded-full bg-zinc-300 dark:bg-zinc-700" />
        </div>
      </div>
    </div>
  );
}
