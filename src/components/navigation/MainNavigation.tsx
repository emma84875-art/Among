import React, { useState } from 'react';
import type { ComponentType } from 'react';
import { NavigationTab } from '../../types';
import {
  IconChats,
  IconPeople,
  IconYou,
  IconBluetooth,
  IconCloud,
  IconRotateCcw,
  IconChevronRight,
  IconRadio,
} from '../common/Icons';
import { motion, AnimatePresence } from 'motion/react';
import { useMeshNetwork } from '../../lib/mesh';
import { MeshNetworkModal } from '../modals/MeshNetworkModal';

export interface ConnectivityStatusHeaderProps {
  className?: string;
  onOpenDiagnostics?: () => void;
}

/**
 * Persistent connectivity status indicator showing:
 * - 'Online' (Internet)
 * - 'Syncing'
 * - 'Mesh Active' (Bluetooth/Wi-Fi Direct)
 */
export function ConnectivityStatusHeader({
  className = '',
  onOpenDiagnostics,
}: ConnectivityStatusHeaderProps) {
  const { meshState, syncQueuedMessages } = useMeshNetwork();
  const [isLocalModalOpen, setIsLocalModalOpen] = useState(false);
  const [isTriggeringSync, setIsTriggeringSync] = useState(false);

  const handleOpenModal = () => {
    if (onOpenDiagnostics) {
      onOpenDiagnostics();
    } else {
      setIsLocalModalOpen(true);
    }
  };

  const handleManualSync = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsTriggeringSync(true);
    try {
      await syncQueuedMessages();
    } finally {
      setIsTriggeringSync(false);
    }
  };

  const isSyncing = meshState.isSyncing || isTriggeringSync;
  const isOnline = meshState.isOnline;

  // Determine active display mode
  // 1. 'Syncing'
  // 2. 'Online' (Internet)
  // 3. 'Mesh Active' (Bluetooth/Wi-Fi Direct)
  let statusText = 'Online';
  let transportSuffix = '(Internet)';
  let dotColor = 'bg-emerald-500';
  let badgeClasses = 'bg-sky-500/10 text-sky-700 dark:text-sky-300 border-sky-500/20';

  if (isSyncing) {
    statusText = 'Syncing';
    transportSuffix = '(Internet)';
    dotColor = 'bg-amber-500';
    badgeClasses = 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/25';
  } else if (!isOnline) {
    statusText = 'Mesh Active';
    transportSuffix = '(Bluetooth/Wi-Fi Direct)';
    dotColor = 'bg-emerald-500';
    badgeClasses = 'bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 border-emerald-500/25';
  }

  return (
    <>
      <header
        role="status"
        aria-label={`Network status: ${statusText} ${transportSuffix}`}
        className={`w-full shrink-0 h-10 px-4 bg-white/95 dark:bg-zinc-950/95 backdrop-blur-md border-b border-zinc-200/80 dark:border-zinc-850 flex items-center justify-between text-xs select-none z-30 transition-colors ${className}`}
      >
        {/* Main Status Indicator Button */}
        <button
          type="button"
          onClick={handleOpenModal}
          className="flex items-center gap-2 group cursor-pointer text-left focus:outline-none"
          title={`Connectivity: ${statusText} ${transportSuffix}. Tap to inspect mesh routing & relay buffers.`}
        >
          {/* Animated beacon dot */}
          <div className="relative flex items-center justify-center w-2.5 h-2.5 shrink-0">
            {isSyncing ? (
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
            ) : !isOnline ? (
              <span className="animate-pulse absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60" />
            ) : null}
            <span className={`relative inline-flex rounded-full w-2 h-2 ${dotColor}`} />
          </div>

          {/* Status Label & Transport */}
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="font-semibold text-zinc-900 dark:text-zinc-100 tracking-tight">
              {statusText}
            </span>
            <span className="text-[11px] font-mono text-zinc-500 dark:text-zinc-400 truncate group-hover:text-zinc-700 dark:group-hover:text-zinc-200 transition-colors">
              {transportSuffix}
            </span>
          </div>
        </button>

        {/* Right Action / Context Pill */}
        <div className="flex items-center gap-2">
          {/* If Online with pending queued whispers, offer instant sync trigger */}
          {isOnline && meshState.queuedMessagesCount > 0 && (
            <button
              type="button"
              onClick={handleManualSync}
              disabled={isSyncing}
              className="text-[10px] font-mono font-medium px-2 py-0.5 rounded-full bg-sky-500/15 text-sky-700 dark:text-sky-300 border border-sky-500/30 hover:bg-sky-500/25 transition-colors flex items-center gap-1 cursor-pointer"
              title="Sync queued whispers with cloud gateway"
            >
              <IconRotateCcw className={`w-2.5 h-2.5 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>Sync ({meshState.queuedMessagesCount})</span>
            </button>
          )}

          {/* If Offline, show peer count indicator */}
          {!isOnline && (
            <span className="text-[10px] font-mono text-emerald-700 dark:text-emerald-300 bg-emerald-500/15 border border-emerald-500/25 px-2 py-0.5 rounded-full flex items-center gap-1">
              <IconRadio className="w-2.5 h-2.5" />
              <span>{meshState.nearbyPeers.length} nodes</span>
            </span>
          )}

          {/* Open Diagnostics Chevron */}
          <button
            type="button"
            onClick={handleOpenModal}
            className="p-1 rounded-md text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-850 transition-colors cursor-pointer"
            aria-label="Inspect mesh network diagnostics"
            title="Inspect mesh network diagnostics"
          >
            <IconChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </header>

      {/* Internal diagnostics modal if opened from header directly */}
      <MeshNetworkModal
        isOpen={isLocalModalOpen}
        onClose={() => setIsLocalModalOpen(false)}
      />
    </>
  );
}

// Export alias for semantic clarity
export const MainNavigationHeader = ConnectivityStatusHeader;

interface MainNavigationProps {
  activeTab: NavigationTab;
  onChangeTab: (tab: NavigationTab) => void;
  hasUnreadChats?: boolean;
  children?: React.ReactNode;
  showHeader?: boolean;
}

export function MainNavigation({
  activeTab,
  onChangeTab,
  hasUnreadChats = true,
  children,
  showHeader = true,
}: MainNavigationProps) {
  const tabs: { id: NavigationTab; label: string; icon: ComponentType<{ className?: string; strokeWidth?: number }> }[] = [
    { id: 'chats', label: 'Chats', icon: IconChats },
    { id: 'people', label: 'People', icon: IconPeople },
    { id: 'you', label: 'You', icon: IconYou },
  ];

  const navigationBar = (
    <nav
      className="sticky bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-zinc-950/95 backdrop-blur-md border-t border-zinc-200 dark:border-zinc-800 pb-safe transition-colors duration-300"
      aria-label="Main Navigation"
    >
      <div className="max-w-md mx-auto px-6 h-16 flex items-center justify-around">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          const Icon = tab.icon;

          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onChangeTab(tab.id)}
              className="relative flex flex-col items-center justify-center w-20 py-1 transition-transform active:scale-95 cursor-pointer focus:outline-none"
            >
              <div className="relative">
                <Icon
                  className={`w-5 h-5 transition-colors duration-200 ${
                    isActive
                      ? 'text-zinc-950 dark:text-zinc-50 stroke-[2.2]'
                      : 'text-zinc-400 dark:text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 stroke-[1.6]'
                  }`}
                />

                {/* Quiet unread whisper badge on chats */}
                {tab.id === 'chats' && hasUnreadChats && !isActive && (
                  <span className="absolute -top-0.5 -right-1 w-2 h-2 rounded-full bg-amber-500 ring-2 ring-white dark:ring-zinc-950" />
                )}
              </div>

              <span
                className={`text-[11px] mt-1 tracking-tight transition-colors duration-200 ${
                  isActive
                    ? 'font-semibold text-zinc-950 dark:text-zinc-50'
                    : 'font-normal text-zinc-400 dark:text-zinc-500'
                }`}
              >
                {tab.label}
              </span>

              {isActive && (
                <motion.div
                  layoutId="activeTabIndicator"
                  className="absolute -bottom-1 w-5 h-0.5 rounded-full bg-zinc-950 dark:bg-zinc-50"
                  transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );

  // If used as a container wrapper with children
  if (children) {
    return (
      <div className="flex-1 flex flex-col justify-between relative h-full w-full">
        {showHeader && <ConnectivityStatusHeader />}
        <div className="flex-1 flex flex-col min-h-0 overflow-y-auto">
          {children}
        </div>
        {navigationBar}
      </div>
    );
  }

  // Standalone bottom navigation
  return navigationBar;
}
