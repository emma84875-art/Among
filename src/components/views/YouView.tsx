import { useState, type ComponentType } from 'react';
import { AppearanceMode, PresenceStatus } from '../../types';
import { useAuth } from '../../context/AuthContext';
import {
  Avatar,
  Badge,
  Button,
  Input,
  ListRow,
  Modal,
  Card,
} from '../ui';
import {
  IconSun,
  IconMoon,
  IconLaptop,
  IconSecurity,
  IconRotateCcw,
  IconSparkles,
  IconSettings,
  IconCheck,
  IconCheckDouble,
  IconCompass,
  IconNotificationsQuiet,
  IconHardDrive,
  IconEye,
  IconEyeOff,
  IconLogOut,
  IconAtSign,
  IconMail,
  IconCalendar,
  IconPhone,
  IconLayers,
  IconChevronRight,
  IconBattery,
  IconBluetooth,
  IconPalette,
} from '../common/Icons';
import { ChatBackgroundTexture } from '../../types';
import {
  CHAT_TEXTURE_CONFIGS,
  CHAT_TEXTURE_LIST,
  getSavedChatTexture,
  saveChatTexture,
} from '../../lib/textures';
import { ChatTextureModal } from '../modals/ChatTextureModal';
import { ChatThemeModal } from '../modals/ChatThemeModal';
import { ChatThemeSetting } from '../../types';
import {
  CHAT_THEME_LIST,
  getDefaultChatTheme,
  saveDefaultChatTheme,
  resolveChatTheme,
  CHAT_THEME_CHANGED_EVENT,
} from '../../lib/themes';
import { useMeshNetwork } from '../../lib/mesh';
import { MeshNetworkModal } from '../modals/MeshNetworkModal';

interface YouViewProps {
  appearance: AppearanceMode;
  onChangeAppearance: (mode: AppearanceMode) => void;
  onReplaySplash: () => void;
  onReplayOnboarding: () => void;
  onOpenDesignSystem: () => void;
  onSignOut?: () => void;
}

export function YouView({
  appearance,
  onChangeAppearance,
  onReplaySplash,
  onReplayOnboarding,
  onOpenDesignSystem,
  onSignOut,
}: YouViewProps) {
  const { user, logout, updatePresence, updateProfile, login } = useAuth();
  const [presence, setPresence] = useState<PresenceStatus>(user?.presence || 'quiet');
  const [isPresenceModalOpen, setIsPresenceModalOpen] = useState(false);
  const [isPrivacyModalOpen, setIsPrivacyModalOpen] = useState(false);
  const [isSignOutModalOpen, setIsSignOutModalOpen] = useState(false);
  const [isBioModalOpen, setIsBioModalOpen] = useState(false);
  const [bioInput, setBioInput] = useState(user?.bio || '');
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [isUpdatingPrivacy, setIsUpdatingPrivacy] = useState(false);
  const [readReceipts, setReadReceipts] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('among_read_receipts');
      if (saved !== null) return saved === 'true';
    } catch {}
    return true;
  });

  // Chat Background Texture setting
  const [chatTexture, setChatTexture] = useState<ChatBackgroundTexture>(getSavedChatTexture);
  const [isTextureModalOpen, setIsTextureModalOpen] = useState(false);

  // Global Chat Theme setting
  const [defaultTheme, setDefaultTheme] = useState<ChatThemeSetting>(getDefaultChatTheme);
  const [isThemeModalOpen, setIsThemeModalOpen] = useState(false);

  // Mesh & Offline Hybrid Connectivity with Battery Saver
  const { meshState, toggleBatterySaver } = useMeshNetwork();
  const [isMeshModalOpen, setIsMeshModalOpen] = useState(false);

  const handleSelectTexture = (newTexture: ChatBackgroundTexture) => {
    setChatTexture(newTexture);
    saveChatTexture(newTexture);
  };

  const handleSelectTheme = (newSetting: ChatThemeSetting) => {
    setDefaultTheme(newSetting);
    saveDefaultChatTheme(newSetting);
  };

  const handleToggleGlobalReadReceipts = () => {
    setReadReceipts((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('among_read_receipts', String(next));
      } catch {}
      return next;
    });
  };

  const presenceOptions: { id: PresenceStatus; label: string; desc: string }[] = [
    { id: 'quiet', label: 'Quiet Hours', desc: 'No sound or visual banners; whispers kept for later' },
    { id: 'focus', label: 'In Deep Focus', desc: 'Working without interruptions' },
    { id: 'here', label: 'Present', desc: 'Close and available for a quiet word' },
    { id: 'walking', label: 'Walking / Out', desc: 'Away from screens' },
    { id: 'offline', label: 'Resting', desc: 'Disconnected' },
  ];

  const handlePresenceChange = async (newPresence: PresenceStatus) => {
    setPresence(newPresence);
    setIsPresenceModalOpen(false);
    await updatePresence(newPresence);
  };

  const handleSaveBio = async () => {
    await updateProfile({ bio: bioInput });
    setIsBioModalOpen(false);
  };

  const handleToggleOnlinePrivacy = async () => {
    setIsUpdatingPrivacy(true);
    try {
      const current = user?.shareOnlineStatus ?? true;
      await updateProfile({ shareOnlineStatus: !current });
    } finally {
      setIsUpdatingPrivacy(false);
    }
  };

  const handleQuickSwitchTo = async (identifier: string) => {
    try {
      await login({ identifier, password: 'password123' });
    } catch (err) {
      console.error('Quick switch failed:', err);
    }
  };

  const handleConfirmSignOut = async () => {
    setIsSigningOut(true);
    try {
      await logout();
      if (onSignOut) {
        onSignOut();
      }
    } finally {
      setIsSigningOut(false);
      setIsSignOutModalOpen(false);
    }
  };

  const appearanceOptions: {
    id: AppearanceMode;
    label: string;
    description: string;
    icon: ComponentType<{ className?: string }>;
  }[] = [
    {
      id: 'light',
      label: 'Light Mode',
      description: 'Clean stark white, balanced neutral zinc & deep black',
      icon: IconSun,
    },
    {
      id: 'dark',
      label: 'Dark Mode',
      description: 'Deep obsidian black, graphite zinc & crisp high contrast white',
      icon: IconMoon,
    },
    {
      id: 'system',
      label: 'System Appearance',
      description: 'Automatically synchronizes with your device settings',
      icon: IconLaptop,
    },
  ];

  return (
    <div className="flex flex-col min-h-full px-5 py-4 pb-24 max-w-md mx-auto w-full">
      {/* Top Header */}
      <div className="pt-2 pb-5">
        <span className="text-[11px] font-medium tracking-widest uppercase text-zinc-500 dark:text-zinc-400 block mb-0.5">
          Presence & Privacy
        </span>
        <h1 className="text-3xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
          You
        </h1>
      </div>

      {/* Your Profile Card */}
      <Card variant="surface" padding="lg" className="mb-6">
        <div className="flex items-center gap-4">
          <Avatar
            initials={user?.initials || 'ME'}
            name={user?.displayName || 'Sanctuary Member'}
            presence={presence}
            size="lg"
            gradient={user?.avatarColor || 'from-zinc-700 to-zinc-900'}
          />

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-semibold tracking-tight text-zinc-900 dark:text-zinc-100 truncate">
                {user?.displayName || 'Sanctuary Member'}
              </h3>
              {user?.username && (
                <Badge variant="subtle" size="sm">
                  @{user.username}
                </Badge>
              )}
            </div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate mt-0.5 font-mono">
              {user?.phoneNumber || 'Verified phone account'}
            </p>

            <button
              type="button"
              onClick={() => setIsPresenceModalOpen(true)}
              className="mt-2.5 inline-flex items-center gap-1.5 text-xs text-zinc-700 dark:text-zinc-300 hover:text-zinc-950 dark:hover:text-zinc-100 bg-zinc-200/70 dark:bg-zinc-800/80 px-2.5 py-1 rounded-full cursor-pointer transition-colors"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-zinc-900 dark:bg-zinc-100" />
              <span>
                {presenceOptions.find((p) => p.id === presence)?.label || 'Quiet Hours'}
              </span>
              <IconSettings className="w-3 h-3 ml-0.5 text-zinc-400" />
            </button>
          </div>
        </div>

        {/* User Bio Section */}
        <div className="mt-4 pt-3 border-t border-zinc-200/70 dark:border-zinc-800/80 flex items-start justify-between gap-3">
          <div className="flex-1">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400 block mb-0.5">
              Bio
            </span>
            <p className="text-xs text-zinc-600 dark:text-zinc-300">
              {user?.bio || 'No bio written yet.'}
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setBioInput(user?.bio || '');
              setIsBioModalOpen(true);
            }}
            className="text-xs text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:underline font-medium pt-1 cursor-pointer"
          >
            Edit
          </button>
        </div>
      </Card>

      {/* Appearance Section */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2.5 px-1">
          <h2 className="text-xs font-semibold tracking-wider uppercase text-zinc-500 dark:text-zinc-400">
            Appearance
          </h2>
          <span className="text-[11px] text-zinc-400 capitalize">
            Active: {appearance}
          </span>
        </div>

        <div className="space-y-2">
          {appearanceOptions.map((opt) => {
            const Icon = opt.icon;
            const isSelected = appearance === opt.id;

            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => onChangeAppearance(opt.id)}
                className={`w-full flex items-start gap-3.5 p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-zinc-950 text-zinc-50 dark:bg-zinc-100 dark:text-zinc-950 border-transparent shadow-xs'
                    : 'bg-zinc-100/60 dark:bg-zinc-900/60 text-zinc-800 dark:text-zinc-200 border-zinc-200/80 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700'
                }`}
              >
                <div
                  className={`p-2 rounded-xl shrink-0 ${
                    isSelected
                      ? 'bg-zinc-800 text-zinc-100 dark:bg-zinc-200 dark:text-zinc-900'
                      : 'bg-zinc-200/60 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                </div>

                <div className="flex-1 min-w-0 pr-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">{opt.label}</span>
                    {isSelected && (
                      <IconCheck className="w-4 h-4 text-zinc-100 dark:text-zinc-900 shrink-0" />
                    )}
                  </div>
                  <p
                    className={`text-xs mt-0.5 leading-relaxed ${
                      isSelected
                        ? 'text-zinc-300 dark:text-zinc-600'
                        : 'text-zinc-500 dark:text-zinc-400'
                    }`}
                  >
                    {opt.description}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Default Chat Theme Section */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2.5 px-1">
          <div className="flex items-center gap-1.5">
            <h2 className="text-xs font-semibold tracking-wider uppercase text-zinc-500 dark:text-zinc-400">
              Default Chat Theme
            </h2>
          </div>
          <button
            type="button"
            onClick={() => setIsThemeModalOpen(true)}
            className="text-[11px] text-zinc-500 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-zinc-100 flex items-center gap-1 transition-colors cursor-pointer"
          >
            <span>Custom & Palette</span>
            <IconChevronRight className="w-3 h-3 text-zinc-400" />
          </button>
        </div>

        {/* Themes Selection Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {CHAT_THEME_LIST.slice(0, 4).map((theme) => {
            const isSelected = defaultTheme.themeId === theme.id;
            return (
              <button
                key={theme.id}
                type="button"
                onClick={() => handleSelectTheme({ themeId: theme.id })}
                className={`flex items-center gap-2 p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-zinc-950 text-zinc-50 dark:bg-zinc-100 dark:text-zinc-950 border-transparent shadow-xs'
                    : 'bg-zinc-100/60 dark:bg-zinc-900/60 text-zinc-800 dark:text-zinc-200 border-zinc-200/80 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700'
                }`}
              >
                <span
                  className="w-3.5 h-3.5 rounded-full shrink-0 border border-black/10 dark:border-white/10"
                  style={{ backgroundColor: theme.accentColor }}
                />
                <span className="text-xs font-medium truncate">{theme.name}</span>
                {isSelected && (
                  <IconCheck className="w-3 h-3 ml-auto text-zinc-100 dark:text-zinc-900 shrink-0" />
                )}
              </button>
            );
          })}
        </div>

        <div className="grid grid-cols-3 gap-2 mt-2">
          {CHAT_THEME_LIST.slice(4).map((theme) => {
            const isSelected = defaultTheme.themeId === theme.id;
            return (
              <button
                key={theme.id}
                type="button"
                onClick={() =>
                  theme.id === 'custom'
                    ? setIsThemeModalOpen(true)
                    : handleSelectTheme({ themeId: theme.id })
                }
                className={`flex items-center gap-2 p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-zinc-950 text-zinc-50 dark:bg-zinc-100 dark:text-zinc-950 border-transparent shadow-xs'
                    : 'bg-zinc-100/60 dark:bg-zinc-900/60 text-zinc-800 dark:text-zinc-200 border-zinc-200/80 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700'
                }`}
              >
                <span
                  className="w-3.5 h-3.5 rounded-full shrink-0 border border-black/10 dark:border-white/10"
                  style={{
                    backgroundColor:
                      theme.id === 'custom' && defaultTheme.customColor
                        ? defaultTheme.customColor
                        : theme.accentColor,
                  }}
                />
                <span className="text-xs font-medium truncate">{theme.name}</span>
                {isSelected && (
                  <IconCheck className="w-3 h-3 ml-auto text-zinc-100 dark:text-zinc-900 shrink-0" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Chat Background Texture Section */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2.5 px-1">
          <div className="flex items-center gap-1.5">
            <h2 className="text-xs font-semibold tracking-wider uppercase text-zinc-500 dark:text-zinc-400">
              Chat Background Texture
            </h2>
          </div>
          <button
            type="button"
            onClick={() => setIsTextureModalOpen(true)}
            className="text-[11px] text-zinc-500 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-zinc-100 flex items-center gap-1 transition-colors cursor-pointer"
          >
            <span>Full Gallery</span>
            <IconChevronRight className="w-3 h-3 text-zinc-400" />
          </button>
        </div>

        {/* Live Interactive Preview Card */}
        <div className="mb-3 rounded-2xl border border-zinc-200/90 dark:border-zinc-800 bg-[#faf9f6]/95 dark:bg-zinc-950 overflow-hidden relative shadow-xs p-3.5 flex flex-col justify-between">
          {/* Subtle Texture Overlay */}
          {chatTexture !== 'none' && (
            <div
              className={`pointer-events-none absolute inset-0 z-0 select-none ${
                CHAT_TEXTURE_CONFIGS[chatTexture]?.overlayClass || ''
              }`}
              aria-hidden="true"
            />
          )}

          {/* Mini Header */}
          <div className="relative z-10 flex items-center justify-between pb-2 border-b border-black/5 dark:border-white/5">
            <div className="flex items-center gap-2">
              <Avatar
                initials="EV"
                name="Elena Vance"
                gradient="from-emerald-700 to-teal-900"
                size="xs"
                presence="here"
              />
              <div>
                <span className="text-xs font-medium text-zinc-900 dark:text-zinc-100 block leading-tight">
                  Elena Vance
                </span>
                <span className="text-[10px] text-zinc-400 font-mono">Present</span>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-mono tracking-wider px-2 py-0.5 rounded-full bg-zinc-200/60 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-medium">
                {CHAT_TEXTURE_CONFIGS[chatTexture]?.name}
              </span>
            </div>
          </div>

          {/* Messages Snippet with Read Receipts Showcase */}
          <div className="relative z-10 space-y-2 py-2.5">
            <div className="flex justify-start">
              <div className="max-w-[82%] rounded-lg px-2.5 py-1.5 bg-zinc-100/90 dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 border border-zinc-200/70 dark:border-zinc-800/70 shadow-2xs text-[11px] leading-relaxed">
                The morning quiet here is grounding.
                <span className="block text-right text-[9px] font-mono text-zinc-400 mt-0.5">
                  09:12
                </span>
              </div>
            </div>

            <div className="flex justify-end">
              <div className="max-w-[82%] rounded-lg px-2.5 py-1.5 bg-zinc-950 text-zinc-50 dark:bg-zinc-100 dark:text-zinc-950 border border-zinc-900 dark:border-zinc-200 shadow-2xs text-[11px] leading-relaxed">
                Glad you found time to disconnect.
                <div className="flex items-center justify-end gap-1 mt-0.5 text-[9px] font-mono">
                  <span className="opacity-75">09:14</span>
                  <IconCheckDouble className="w-2.5 h-2.5 text-sky-400 dark:text-sky-500 inline" />
                </div>
              </div>
            </div>
          </div>

          <div className="relative z-10 pt-1.5 border-t border-black/5 dark:border-white/5 flex items-center justify-between text-[10px] text-zinc-400 font-mono">
            <span>{CHAT_TEXTURE_CONFIGS[chatTexture]?.tagline}</span>
            <span>Tactile & Calm</span>
          </div>
        </div>

        {/* Textures Selection Grid */}
        <div className="grid grid-cols-2 gap-2">
          {CHAT_TEXTURE_LIST.map((tex) => {
            const isSelected = chatTexture === tex.id;
            return (
              <button
                key={tex.id}
                type="button"
                onClick={() => handleSelectTexture(tex.id)}
                className={`flex items-start gap-2.5 p-2.5 rounded-2xl border text-left transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-zinc-950 text-zinc-50 dark:bg-zinc-100 dark:text-zinc-950 border-transparent shadow-xs'
                    : 'bg-zinc-100/60 dark:bg-zinc-900/60 text-zinc-800 dark:text-zinc-200 border-zinc-200/80 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700'
                }`}
              >
                {/* Visual Swatch */}
                <div
                  className={`w-7 h-7 rounded-lg shrink-0 overflow-hidden border relative ${
                    isSelected
                      ? 'border-zinc-700 dark:border-zinc-300 bg-zinc-900 dark:bg-zinc-200'
                      : 'border-zinc-250 dark:border-zinc-750 bg-white dark:bg-zinc-850'
                  }`}
                >
                  {tex.id !== 'none' ? (
                    <div className={`absolute inset-0 ${tex.previewClass || tex.overlayClass}`} />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center text-[9px] font-mono text-zinc-400">
                      -
                    </div>
                  )}
                </div>

                <div className="flex-1 min-w-0 pr-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold truncate leading-tight">
                      {tex.name}
                    </span>
                    {isSelected && (
                      <IconCheck className="w-3.5 h-3.5 text-zinc-100 dark:text-zinc-900 shrink-0 ml-1" />
                    )}
                  </div>
                  <p
                    className={`text-[10px] mt-0.5 truncate ${
                      isSelected
                        ? 'text-zinc-300 dark:text-zinc-600'
                        : 'text-zinc-500 dark:text-zinc-400'
                    }`}
                  >
                    {tex.tagline}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Privacy & Sovereignty Section */}
      <div className="mb-6">
        <h2 className="text-xs font-semibold tracking-wider uppercase text-zinc-500 dark:text-zinc-400 mb-2.5 px-1">
          Privacy Foundation
        </h2>

        <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 divide-y divide-zinc-200/60 dark:divide-zinc-800/60 overflow-hidden bg-zinc-50 dark:bg-zinc-900/40">
          <ListRow
            leading={<IconSecurity className="w-4 h-4 text-zinc-700 dark:text-zinc-300" />}
            title="Isolated Local Key"
            subtitle="Device hardware enclave · active"
            onClick={() => setIsPrivacyModalOpen(true)}
            showChevron
          />
          <ListRow
            leading={<IconEyeOff className="w-4 h-4 text-zinc-400" />}
            title="Zero Behavioral Analytics"
            subtitle="No event trackers or crash pingers"
            onClick={() => setIsPrivacyModalOpen(true)}
            showChevron
          />
          <ListRow
            leading={<IconNotificationsQuiet className="w-4 h-4 text-zinc-400" />}
            title="Quiet Delivery Mode"
            subtitle="No artificial notification urgency"
            onClick={() => setIsPrivacyModalOpen(true)}
            showChevron
          />
          <ListRow
            leading={<IconEye className="w-4 h-4 text-zinc-400" />}
            title="Share Online Presence"
            subtitle={
              user?.shareOnlineStatus ?? true
                ? 'Connections can see your presence rhythm'
                : 'Private · Connections see you as resting'
            }
            trailing={
              <button
                type="button"
                disabled={isUpdatingPrivacy}
                onClick={handleToggleOnlinePrivacy}
                className={`text-xs px-2.5 py-1 rounded-full font-medium transition-colors cursor-pointer ${
                  user?.shareOnlineStatus ?? true
                    ? 'bg-zinc-950 text-zinc-50 dark:bg-zinc-100 dark:text-zinc-950 border border-zinc-900 dark:border-zinc-100'
                    : 'bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border border-zinc-300 dark:border-zinc-700'
                }`}
              >
                {user?.shareOnlineStatus ?? true ? 'Active' : 'Hidden'}
              </button>
            }
          />
          <ListRow
            leading={<IconCheckDouble className="w-4 h-4 text-zinc-400" />}
            title="Read Receipts"
            subtitle={
              readReceipts
                ? 'Shows blue double checks when messages are read'
                : 'Quiet · Double checks stay neutral; no read pressure'
            }
            trailing={
              <button
                type="button"
                onClick={handleToggleGlobalReadReceipts}
                className={`text-xs px-2.5 py-1 rounded-full font-medium transition-colors cursor-pointer ${
                  readReceipts
                    ? 'bg-zinc-950 text-zinc-50 dark:bg-zinc-100 dark:text-zinc-950 border border-zinc-900 dark:border-zinc-100'
                    : 'bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border border-zinc-300 dark:border-zinc-700'
                }`}
              >
                {readReceipts ? 'Active' : 'Quiet'}
              </button>
            }
          />
        </div>
      </div>

      {/* Mesh & Offline Radios / Battery Management Section */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2.5 px-1">
          <h2 className="text-xs font-semibold tracking-wider uppercase text-zinc-500 dark:text-zinc-400">
            Mesh & Offline Radios
          </h2>
          <button
            type="button"
            onClick={() => setIsMeshModalOpen(true)}
            className="text-[11px] text-zinc-500 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-zinc-100 flex items-center gap-1 transition-colors cursor-pointer"
          >
            <span>Mesh Diagnostics</span>
            <IconChevronRight className="w-3 h-3 text-zinc-400" />
          </button>
        </div>

        <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 divide-y divide-zinc-200/60 dark:divide-zinc-800/60 overflow-hidden bg-zinc-50 dark:bg-zinc-900/40">
          {/* Core Battery Saver Toggle Row */}
          <div className="p-3.5 flex items-start justify-between gap-3">
            <div className="flex items-start gap-3 min-w-0">
              <div
                className={`p-2 rounded-xl shrink-0 transition-colors ${
                  meshState.batterySaver
                    ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                    : 'bg-zinc-200/60 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400'
                }`}
              >
                <IconBattery className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                    Battery Saver
                  </span>
                  <span
                    className={`text-[9.5px] font-mono px-2 py-0.5 rounded-full font-medium transition-colors ${
                      meshState.batterySaver
                        ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                        : 'bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400'
                    }`}
                  >
                    {meshState.batterySaver ? '60s Scan Interval' : '10s Scan Interval'}
                  </span>
                </div>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed mt-1">
                  {meshState.batterySaver
                    ? 'Reduces Bluetooth discovery scans from every 10s to every 60s during offline mode, cutting radio duty-cycle by ~83% to conserve power when relying on mesh messaging.'
                    : 'Standard 10-second discovery scans active during offline mode. Provides faster discovery of nearby peers at the expense of higher battery consumption.'}
                </p>
                <div className="flex items-center gap-3 mt-2 text-[10.5px] font-mono text-zinc-400 dark:text-zinc-500">
                  <span className="flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
                    Duty cycle: {meshState.batterySaver ? '1.6% (Low Power)' : '25% (Standard)'}
                  </span>
                  <span>•</span>
                  <span>Power saved: {meshState.powerSavingsPercent}%</span>
                </div>
              </div>
            </div>

            {/* Toggle switch */}
            <button
              type="button"
              onClick={toggleBatterySaver}
              className={`w-11 h-6 rounded-full transition-colors p-0.5 relative cursor-pointer shrink-0 mt-0.5 ${
                meshState.batterySaver
                  ? 'bg-zinc-950 dark:bg-zinc-100'
                  : 'bg-zinc-300 dark:bg-zinc-700'
              }`}
              aria-label="Toggle Battery Saver for mesh discovery scans"
            >
              <div
                className={`w-5 h-5 rounded-full transition-transform ${
                  meshState.batterySaver
                    ? 'bg-white dark:bg-zinc-950 translate-x-5 shadow-xs'
                    : 'bg-white dark:bg-zinc-300 translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* Hybrid Peer-to-Peer Mesh Status Row */}
          <ListRow
            leading={<IconBluetooth className="w-4 h-4 text-zinc-500" />}
            title="Peer-to-Peer Mesh Status"
            subtitle={
              meshState.isOnline
                ? 'Primary Internet connected · BLE Mesh on standby'
                : `Offline Mesh Active · ${meshState.nearbyPeers.length} relay peers in range`
            }
            trailing={
              <button
                type="button"
                onClick={() => setIsMeshModalOpen(true)}
                className="text-xs px-2.5 py-1 rounded-full font-medium bg-zinc-200/80 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-300 dark:hover:bg-zinc-700 transition-colors cursor-pointer"
              >
                Inspect
              </button>
            }
          />
        </div>
      </div>

      {/* Account & Session Section */}
      <div className="mb-6">
        <h2 className="text-xs font-semibold tracking-wider uppercase text-zinc-500 dark:text-zinc-400 mb-2.5 px-1">
          Account & Session
        </h2>

        <div className="rounded-3xl border border-zinc-200/80 dark:border-zinc-800 bg-zinc-100/60 dark:bg-zinc-900/60 divide-y divide-zinc-200/70 dark:divide-zinc-800/70 overflow-hidden shadow-xs">
          <ListRow
            leading={<IconPhone className="w-4 h-4 text-zinc-500" />}
            title="Phone Number"
            subtitle="Verified login identity"
            metadata={user?.phoneNumber || 'Verified'}
          />
          {user?.username && (
            <ListRow
              leading={<IconAtSign className="w-4 h-4 text-zinc-500" />}
              title="Handle"
              subtitle="Sanctuary username"
              metadata={`@${user.username}`}
            />
          )}
          <ListRow
            leading={<IconCalendar className="w-4 h-4 text-zinc-500" />}
            title="Member Since"
            subtitle="Cryptographic node created"
            metadata={
              user?.createdAt
                ? new Date(user.createdAt).toLocaleDateString(undefined, {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })
                : 'Active'
            }
          />
        </div>

        {/* Quick Sanctuary Switch for Flow Testing */}
        <div className="mt-3 p-3 rounded-2xl bg-zinc-100/80 dark:bg-zinc-900/80 border border-zinc-200/80 dark:border-zinc-800 text-xs">
          <span className="font-semibold text-zinc-900 dark:text-zinc-100 block mb-0.5">
            Quick Account Switch (Test Flow)
          </span>
          <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mb-2">
            Switch between seeded accounts to verify requests, Close status, and blocking:
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => handleQuickSwitchTo('elena')}
              className={`flex-1 py-1.5 px-2 rounded-xl text-xs font-medium transition-all cursor-pointer ${
                user?.username === 'elena'
                  ? 'bg-zinc-950 text-zinc-50 dark:bg-zinc-100 dark:text-zinc-950 shadow-xs'
                  : 'bg-zinc-200/80 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-300 dark:hover:bg-zinc-700'
              }`}
            >
              Elena Vance (@elena)
            </button>
            <button
              type="button"
              onClick={() => handleQuickSwitchTo('siobhan')}
              className={`flex-1 py-1.5 px-2 rounded-xl text-xs font-medium transition-all cursor-pointer ${
                user?.username === 'siobhan'
                  ? 'bg-zinc-950 text-zinc-50 dark:bg-zinc-100 dark:text-zinc-950 shadow-xs'
                  : 'bg-zinc-200/80 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-300 dark:hover:bg-zinc-700'
              }`}
            >
              Siobhan Chen (@siobhan)
            </button>
          </div>
        </div>

        {/* Sign out action button */}
        <div className="mt-3">
          <Button
            variant="outline"
            size="md"
            fullWidth
            onClick={() => setIsSignOutModalOpen(true)}
            icon={<IconLogOut className="w-4 h-4 text-zinc-500 dark:text-zinc-400" />}
            className="text-zinc-700 dark:text-zinc-300 hover:text-zinc-950 dark:hover:text-zinc-100 hover:border-zinc-400 dark:hover:border-zinc-600"
          >
            <span>Sign Out of Among</span>
          </Button>
        </div>
      </div>

      {/* Design System Inspector & App Flow Controls */}
      <div className="mb-6">
        <h2 className="text-xs font-semibold tracking-wider uppercase text-zinc-500 dark:text-zinc-400 mb-2.5 px-1">
          App Architecture & Design System
        </h2>

        <div className="space-y-2">
          {/* Design System UI Primitives Gallery */}
          <Button
            variant="outline"
            size="md"
            fullWidth
            onClick={onOpenDesignSystem}
            icon={<IconSparkles className="w-4 h-4 text-zinc-900 dark:text-zinc-100" />}
            className="justify-between"
          >
            <span>Open UI Component Gallery</span>
            <span className="text-xs text-zinc-400">Monochrome Design System</span>
          </Button>

          <div className="grid grid-cols-2 gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={onReplaySplash}
              icon={<IconRotateCcw className="w-3.5 h-3.5" />}
            >
              Replay Splash
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={onReplayOnboarding}
              icon={<IconCompass className="w-3.5 h-3.5" />}
            >
              Onboarding
            </Button>
          </div>
        </div>
      </div>

      {/* Presence Selector Modal */}
      <Modal
        isOpen={isPresenceModalOpen}
        onClose={() => setIsPresenceModalOpen(false)}
        title="Your Human Rhythm"
        subtitle="Share your availability gently without notification noise"
        variant="bottom-sheet"
      >
        <div className="space-y-2 py-2">
          {presenceOptions.map((opt) => {
            const isSelected = opt.id === presence;
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => handlePresenceChange(opt.id)}
                className={`w-full flex items-start gap-3 p-3.5 rounded-2xl text-left transition-colors cursor-pointer ${
                  isSelected
                    ? 'bg-zinc-950 text-zinc-50 dark:bg-zinc-100 dark:text-zinc-950'
                    : 'bg-zinc-100 dark:bg-zinc-800/70 text-zinc-800 dark:text-zinc-200 hover:bg-zinc-200/70'
                }`}
              >
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">{opt.label}</span>
                    {isSelected && <IconCheck className="w-4 h-4" />}
                  </div>
                  <p
                    className={`text-xs mt-0.5 ${
                      isSelected
                        ? 'text-zinc-300 dark:text-zinc-600'
                        : 'text-zinc-500 dark:text-zinc-400'
                    }`}
                  >
                    {opt.desc}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </Modal>

      {/* Privacy Foundation Modal */}
      <Modal
        isOpen={isPrivacyModalOpen}
        onClose={() => setIsPrivacyModalOpen(false)}
        title="Privacy Architecture"
        subtitle="Built from the ground up to protect what is sacred"
        variant="bottom-sheet"
      >
        <div className="space-y-4 py-2 text-xs leading-relaxed text-zinc-600 dark:text-zinc-300">
          <div className="p-4 rounded-2xl bg-zinc-100 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700/60 space-y-2">
            <div className="flex items-center gap-2 font-medium text-zinc-900 dark:text-zinc-100 text-sm">
              <IconHardDrive className="w-4 h-4 text-zinc-700 dark:text-zinc-300" />
              <span>Zero-Knowledge Device Enclave</span>
            </div>
            <p>
              Your identities, keys, and future chat logs are held only on this device. No central cloud server holds encryption keys or relational social graphs.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-zinc-100 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700/60 space-y-2">
            <div className="flex items-center gap-2 font-medium text-zinc-900 dark:text-zinc-100 text-sm">
              <IconEyeOff className="w-4 h-4 text-zinc-700 dark:text-zinc-300" />
              <span>Absence of Attention Economy</span>
            </div>
            <p>
              AMONG removes unread count badges on your home screen, typing bubbles, active green dots, and infinite scroll feeds. You message when you are inspired to, not when an algorithm demands it.
            </p>
          </div>

          <div className="pt-2">
            <Button
              variant="primary"
              fullWidth
              onClick={() => setIsPrivacyModalOpen(false)}
            >
              Understood
            </Button>
          </div>
        </div>
      </Modal>

      {/* Sign Out Confirmation Modal */}
      <Modal
        isOpen={isSignOutModalOpen}
        onClose={() => setIsSignOutModalOpen(false)}
        title="Leave Sanctuary?"
        subtitle="Sign out of Among on this device"
        variant="dialog"
      >
        <div className="space-y-4 py-2 text-xs leading-relaxed text-zinc-600 dark:text-zinc-300">
          <p>
            Your account and identity will remain cryptographically safe. You can sign back into your sanctuary anytime with your email or username.
          </p>

          <div className="pt-2 flex flex-col gap-2 sm:flex-row-reverse">
            <Button
              variant="primary"
              fullWidth
              disabled={isSigningOut}
              onClick={handleConfirmSignOut}
              icon={<IconLogOut className="w-4 h-4" />}
            >
              {isSigningOut ? 'Signing out...' : 'Sign Out'}
            </Button>
            <Button
              variant="ghost"
              fullWidth
              disabled={isSigningOut}
              onClick={() => setIsSignOutModalOpen(false)}
            >
              Stay in Sanctuary
            </Button>
          </div>
        </div>
      </Modal>
      {/* Bio Editing Modal */}
      <Modal
        isOpen={isBioModalOpen}
        onClose={() => setIsBioModalOpen(false)}
        title="Edit Bio"
        subtitle="A quiet phrase about who you are in sanctuary"
        variant="bottom-sheet"
      >
        <div className="space-y-4 py-2">
          <Input
            value={bioInput}
            onChange={(e) => setBioInput(e.target.value)}
            placeholder="e.g. Architect of quiet systems & tactile software"
            maxLength={140}
          />
          <div className="flex justify-between items-center text-xs text-zinc-400">
            <span>Keep it minimal. No follower bait.</span>
            <span>{bioInput.length}/140</span>
          </div>
          <div className="pt-2 flex gap-2">
            <Button
              variant="secondary"
              fullWidth
              onClick={() => setIsBioModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              fullWidth
              onClick={handleSaveBio}
            >
              Save Bio
            </Button>
          </div>
        </div>
      </Modal>

      {/* Chat Theme Modal */}
      <ChatThemeModal
        isOpen={isThemeModalOpen}
        onClose={() => setIsThemeModalOpen(false)}
        threadId="global"
        recipientName="Default Theme"
        recipientInitials="AM"
        recipientAvatarColor="from-zinc-800 to-zinc-950"
        currentSetting={defaultTheme}
        onSelectTheme={handleSelectTheme}
      />

      {/* Chat Background Texture Gallery Modal */}
      <ChatTextureModal
        isOpen={isTextureModalOpen}
        onClose={() => setIsTextureModalOpen(false)}
        currentTexture={chatTexture}
        onSelectTexture={handleSelectTexture}
      />

      {/* Mesh Network & Radio Diagnostics Modal */}
      <MeshNetworkModal
        isOpen={isMeshModalOpen}
        onClose={() => setIsMeshModalOpen(false)}
      />
    </div>
  );
}
