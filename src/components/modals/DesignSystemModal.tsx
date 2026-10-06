import { useState } from 'react';
import {
  Modal,
  Button,
  Input,
  Avatar,
  Badge,
  ListRow,
  EmptyState,
  Card,
  DisplayTitle,
  SectionTitle,
  Subhead,
  BodyText,
  Caption,
  WhisperQuote,
  TypingIndicator,
  VoiceMessagePlayer,
  Skeleton,
  ChatRowSkeleton,
  PersonRowSkeleton,
  MessageBubbleSkeleton,
} from '../ui';
import { AmongLogo } from '../common/AmongLogo';
import {
  IconSparkles,
  IconSecurity,
  IconHeart,
  IconChats,
  IconLock,
  IconChevronRight,
  IconEye,
  IconSettings,
  IconPeople,
  IconYou,
  IconSearch,
  IconBack,
  IconNotifications,
  IconNotificationsQuiet,
  IconAdd,
  IconConnect,
  IconMore,
  IconClose,
  IconAttachment,
  IconSend,
  IconCamera,
  IconGallery,
  IconFiles,
  IconBlock,
  IconDelete,
  IconCheck,
  IconCheckDouble,
} from '../common/Icons';

interface DesignSystemModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function DesignSystemModal({ isOpen, onClose }: DesignSystemModalProps) {
  const [activeTab, setActiveTab] = useState<
    'brand' | 'typography' | 'buttons' | 'inputs' | 'cards' | 'avatars' | 'rows' | 'skeletons' | 'empty'
  >('brand');

  const [sampleInputValue, setSampleInputValue] = useState('Letters to my dearest');
  const [sampleSearchValue, setSampleSearchValue] = useState('Evelyn');

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="AMONG Design System"
      subtitle="Foundation tokens, components & calm human interface primitives"
      variant="bottom-sheet"
      className="max-w-2xl"
    >
      <div className="space-y-6 pb-4">
        {/* Navigation Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar border-b border-zinc-200/80 dark:border-zinc-800/80 pb-2">
          {(
            [
              { id: 'brand', label: 'Brand & Icons' },
              { id: 'typography', label: 'Typography' },
              { id: 'buttons', label: 'Buttons' },
              { id: 'inputs', label: 'Inputs' },
              { id: 'cards', label: 'Cards' },
              { id: 'avatars', label: 'Avatars' },
              { id: 'rows', label: 'List Rows' },
              { id: 'skeletons', label: 'Skeletons' },
              { id: 'empty', label: 'Empty States' },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`text-xs px-3 py-1.5 rounded-full transition-all cursor-pointer whitespace-nowrap ${
                activeTab === tab.id
                  ? 'bg-zinc-950 text-zinc-50 dark:bg-zinc-100 dark:text-zinc-950 font-medium'
                  : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab 0: Brand & Icons */}
        {activeTab === 'brand' && (
          <div className="space-y-6">
            <div className="p-5 rounded-3xl bg-zinc-100/70 dark:bg-zinc-800/50 border border-zinc-200/80 dark:border-zinc-700/60">
              <span className="text-[11px] uppercase tracking-wider text-zinc-400 block mb-3 font-medium">
                Among Wordmark & Brand Variants
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200/70 dark:border-zinc-800 flex flex-col items-center justify-center gap-2 text-center">
                  <AmongLogo variant="primary" size="lg" />
                  <span className="text-[10px] text-zinc-400 mt-2">Primary Wordmark</span>
                </div>
                <div className="p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200/70 dark:border-zinc-800 flex flex-col items-center justify-center gap-2 text-center">
                  <AmongLogo variant="compact" size="md" />
                  <span className="text-[10px] text-zinc-400 mt-2">Compact Navigation Mark</span>
                </div>
                <div className="p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200/70 dark:border-zinc-800 flex flex-col items-center justify-center gap-2 text-center">
                  <AmongLogo variant="app-icon" size="lg" />
                  <span className="text-[10px] text-zinc-400 mt-2">App Icon / Tile</span>
                </div>
                <div className="p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200/70 dark:border-zinc-800 flex flex-col items-center justify-center gap-2 text-center">
                  <AmongLogo variant="symbol-only" size="lg" />
                  <span className="text-[10px] text-zinc-400 mt-2">Harmonic Connection Symbol</span>
                </div>
              </div>
            </div>

            <div className="p-5 rounded-3xl bg-zinc-100/70 dark:bg-zinc-800/50 border border-zinc-200/80 dark:border-zinc-700/60">
              <span className="text-[11px] uppercase tracking-wider text-zinc-400 block mb-2 font-medium">
                Unified Icon Family (1.75px Optical Weight)
              </span>
              <p className="text-xs text-zinc-500 mb-4">
                Single coherent icon family spanning navigation, messaging, security, and device controls.
              </p>
              <div className="grid grid-cols-4 sm:grid-cols-6 gap-3 text-center">
                {[
                  { icon: IconChats, label: 'Chats' },
                  { icon: IconPeople, label: 'People' },
                  { icon: IconYou, label: 'You' },
                  { icon: IconSearch, label: 'Search' },
                  { icon: IconBack, label: 'Back' },
                  { icon: IconSettings, label: 'Settings' },
                  { icon: IconNotifications, label: 'Alerts' },
                  { icon: IconNotificationsQuiet, label: 'Quiet' },
                  { icon: IconConnect, label: 'Connect' },
                  { icon: IconAdd, label: 'Add' },
                  { icon: IconMore, label: 'More' },
                  { icon: IconClose, label: 'Close' },
                  { icon: IconAttachment, label: 'Attach' },
                  { icon: IconSend, label: 'Send' },
                  { icon: IconCamera, label: 'Camera' },
                  { icon: IconGallery, label: 'Gallery' },
                  { icon: IconFiles, label: 'Files' },
                  { icon: IconSecurity, label: 'Security' },
                  { icon: IconLock, label: 'Lock' },
                  { icon: IconBlock, label: 'Block' },
                  { icon: IconDelete, label: 'Delete' },
                  { icon: IconCheck, label: 'Sent' },
                  { icon: IconCheckDouble, label: 'Delivered' },
                  { icon: IconCheckDouble, label: 'Read Receipt', color: 'text-sky-500 dark:text-sky-400' },
                  { icon: IconEye, label: 'Visible' },
                ].map((item, idx) => {
                  const Icon = item.icon;
                  return (
                    <div
                      key={idx}
                      className="p-3 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200/70 dark:border-zinc-800 flex flex-col items-center justify-center gap-1.5"
                    >
                      <Icon className={`w-5 h-5 ${item.color || 'text-zinc-700 dark:text-zinc-300'}`} />
                      <span className="text-[10px] text-zinc-500 truncate w-full">{item.label}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Tab 1: Typography */}
        {activeTab === 'typography' && (
          <div className="space-y-6">
            <div className="p-4 rounded-2xl bg-zinc-100/70 dark:bg-zinc-800/50 border border-zinc-200/80 dark:border-zinc-700/60">
              <span className="text-[11px] uppercase tracking-wider text-zinc-400 block mb-1">
                Display Title (IBM Plex Mono · Light / Regular)
              </span>
              <DisplayTitle>Stay close to your people.</DisplayTitle>
            </div>

            <div className="p-4 rounded-2xl bg-zinc-100/70 dark:bg-zinc-800/50 border border-zinc-200/80 dark:border-zinc-700/60">
              <span className="text-[11px] uppercase tracking-wider text-zinc-400 block mb-1">
                Section Heading (IBM Plex Mono · Semibold)
              </span>
              <SectionTitle>A quiet sanctuary for what matters.</SectionTitle>
            </div>

            <div className="p-4 rounded-2xl bg-zinc-100/70 dark:bg-zinc-800/50 border border-zinc-200/80 dark:border-zinc-700/60">
              <span className="text-[11px] uppercase tracking-wider text-zinc-400 block mb-1">
                Subhead & Body Text (IBM Plex Mono · Medium & Regular)
              </span>
              <Subhead className="mb-1.5">Intimate Circle · Established 2026</Subhead>
              <BodyText>
                AMONG rejects algorithmic engagement feeds and hyperactive group chats in favor of quiet, deliberate human connection.
              </BodyText>
            </div>

            <div className="p-4 rounded-2xl bg-zinc-100/70 dark:bg-zinc-800/50 border border-zinc-200/80 dark:border-zinc-700/60">
              <span className="text-[11px] uppercase tracking-wider text-zinc-400 block mb-2">
                Whisper Quote, Caption & Timestamps (IBM Plex Mono)
              </span>
              <WhisperQuote>
                "True friendship needs no read receipts, only genuine presence."
              </WhisperQuote>
              <div className="mt-3 flex items-center justify-between">
                <Caption>Last synced: Moments ago</Caption>
                <Caption>Encrypted directly on device</Caption>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Buttons */}
        {activeTab === 'buttons' && (
          <div className="space-y-6">
            <div className="space-y-3">
              <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block">
                Button Variants
              </span>
              <div className="flex flex-wrap gap-3 items-center">
                <Button variant="primary">Primary Action</Button>
                <Button variant="secondary">Secondary Zinc</Button>
                <Button variant="outline">Outline Border</Button>
                <Button variant="ghost">Ghost Quiet</Button>
                <Button variant="subtle">Subtle Pill</Button>
              </div>
            </div>

            <div className="space-y-3">
              <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block">
                Button Sizes
              </span>
              <div className="flex flex-wrap gap-3 items-center">
                <Button size="sm">Small (32px)</Button>
                <Button size="md">Medium (44px)</Button>
                <Button size="lg">Large (52px)</Button>
                <Button size="icon" aria-label="Heart icon button">
                  <IconHeart className="w-4 h-4" />
                </Button>
              </div>
            </div>

            <div className="space-y-3">
              <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block">
                Button with Icons & States
              </span>
              <div className="flex flex-wrap gap-3 items-center">
                <Button variant="primary" icon={<IconChevronRight className="w-4 h-4" />}>
                  Proceed Gently
                </Button>
                <Button variant="secondary" icon={<IconSecurity className="w-4 h-4 text-zinc-700 dark:text-zinc-300" />}>
                  Protected
                </Button>
                <Button variant="primary" disabled>
                  Disabled State
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: Inputs */}
        {activeTab === 'inputs' && (
          <div className="space-y-5">
            <div>
              <Input
                label="Conversational Search"
                isSearch
                placeholder="Search by name, whisper, or memory..."
                value={sampleSearchValue}
                onChange={(e) => setSampleSearchValue(e.target.value)}
                onClear={() => setSampleSearchValue('')}
                hint="Searches within local device index only"
              />
            </div>

            <div>
              <Input
                label="Sanctuary Topic"
                value={sampleInputValue}
                onChange={(e) => setSampleInputValue(e.target.value)}
                hint="A quiet name for this shared space"
              />
            </div>

            <div>
              <Input
                label="Validation Error State"
                defaultValue="invalid_handle_format"
                error="Handle must begin with '@' and use only lowercase letters."
              />
            </div>
          </div>
        )}

        {/* Tab 4: Cards & Containers */}
        {activeTab === 'cards' && (
          <div className="space-y-5">
            <div className="space-y-3">
              <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block">
                Card Surface Variants (Subtle Contrast & 16px Math)
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Card variant="surface" padding="md">
                  <span className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 block mb-1">
                    Surface Card (Default)
                  </span>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    Standard quiet background with subtle 1px border and tight mathematical padding.
                  </p>
                </Card>

                <Card variant="elevated" padding="md">
                  <span className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 block mb-1">
                    Elevated Card
                  </span>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    Crisp background with minimal micro-shadow for modal popovers and active focus blocks.
                  </p>
                </Card>

                <Card variant="sunken" padding="md">
                  <span className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 block mb-1">
                    Sunken Container
                  </span>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    Slightly deeper background tone for secondary groups and cryptographic verification tags.
                  </p>
                </Card>

                <Card variant="interactive" padding="md">
                  <span className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 block mb-1">
                    Interactive Card
                  </span>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    Hover and active states for selectable circle members, threads, and privacy tiers.
                  </p>
                </Card>
              </div>
            </div>

            <div className="space-y-3">
              <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block">
                Mathematical Spacing Hierarchy
              </span>
              <div className="p-4 rounded-2xl bg-zinc-100/70 dark:bg-zinc-800/50 border border-zinc-200/80 dark:border-zinc-700/60 text-xs text-zinc-600 dark:text-zinc-400 space-y-2">
                <div className="flex justify-between items-center py-1 border-b border-zinc-200/60 dark:border-zinc-700/50">
                  <span className="font-mono text-zinc-700 dark:text-zinc-300">Outer View Margin</span>
                  <span>20px (px-5)</span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-zinc-200/60 dark:border-zinc-700/50">
                  <span className="font-mono text-zinc-700 dark:text-zinc-300">Container Outer Radius</span>
                  <span>16px–24px (rounded-2xl)</span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-zinc-200/60 dark:border-zinc-700/50">
                  <span className="font-mono text-zinc-700 dark:text-zinc-300">Nested Inner Element Radius</span>
                  <span>12px (rounded-xl)</span>
                </div>
                <div className="flex justify-between items-center py-1">
                  <span className="font-mono text-zinc-700 dark:text-zinc-300">Item Grid & Stack Gaps</span>
                  <span>8px–12px (gap-2 / gap-3)</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 4: Avatars & Badges */}
        {activeTab === 'avatars' && (
          <div className="space-y-6">
            <div className="space-y-3">
              <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block">
                Avatar Sizes & Organic Gradients
              </span>
              <div className="flex items-center gap-4">
                <Avatar initials="EG" size="xs" presence="here" />
                <Avatar initials="JV" size="sm" presence="walking" />
                <Avatar initials="MC" size="md" presence="focus" />
                <Avatar initials="MB" size="lg" presence="quiet" />
                <Avatar initials="HR" size="xl" presence="here" />
              </div>
            </div>

            <div className="space-y-3">
              <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block">
                Quiet Presence Aura
              </span>
              <p className="text-xs text-zinc-500">
                AMONG uses restrained monochrome and muted functional presence indicators.
              </p>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="flex items-center gap-2 p-2 rounded-xl bg-zinc-100 dark:bg-zinc-800">
                  <span className="w-2.5 h-2.5 rounded-full bg-zinc-900 dark:bg-zinc-100" />
                  <span>Present / Available</span>
                </div>
                <div className="flex items-center gap-2 p-2 rounded-xl bg-zinc-100 dark:bg-zinc-800">
                  <span className="w-2.5 h-2.5 rounded-full bg-zinc-500" />
                  <span>Deep Focus</span>
                </div>
                <div className="flex items-center gap-2 p-2 rounded-xl bg-zinc-100 dark:bg-zinc-800">
                  <span className="w-2.5 h-2.5 rounded-full bg-zinc-400" />
                  <span>Quiet Hours</span>
                </div>
                <div className="flex items-center gap-2 p-2 rounded-xl bg-zinc-100 dark:bg-zinc-800">
                  <span className="w-2.5 h-2.5 rounded-full bg-zinc-600 dark:bg-zinc-300" />
                  <span>Walking / Nature</span>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block">
                Badges & Tags
              </span>
              <div className="flex flex-wrap gap-2">
                <Badge variant="neutral">Default</Badge>
                <Badge variant="subtle">Inner Circle</Badge>
                <Badge variant="accent" icon={<IconSparkles className="w-3 h-3" />}>
                  Confidant
                </Badge>
                <Badge variant="outline">Verified Peer</Badge>
              </div>
            </div>
          </div>
        )}

        {/* Tab 5: List Rows */}
        {activeTab === 'rows' && (
          <div className="space-y-3">
            <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block">
              List Row Components
            </span>
            <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 divide-y divide-zinc-200/70 dark:divide-zinc-800/70 overflow-hidden bg-zinc-50 dark:bg-zinc-900/30">
              <ListRow
                leading={<Avatar initials="EG" size="md" presence="here" />}
                title="Evelyn Gray"
                badge={<Badge variant="subtle">Partner</Badge>}
                subtitle="Fresh tea is waiting for you in the kitchen."
                metadata="14:24"
                isUnread={true}
              />
              <ListRow
                leading={<Avatar initials="JV" size="md" presence="walking" />}
                title="Julian Vance"
                subtitle="See you this Sunday around four."
                metadata="13:08"
                isUnread={false}
              />
              <ListRow
                leading={<Avatar initials="MC" size="md" presence="focus" />}
                title="Maya Chen"
                badge={<Badge variant="subtle">Studio Collaborator</Badge>}
                subtitle={
                  <div className="flex items-center gap-1.5 py-0.5">
                    <TypingIndicator variant="header" label="Maya is typing" />
                  </div>
                }
                metadata="now"
                isUnread={false}
              />
              <ListRow
                leading={<IconLock className="w-4 h-4 text-zinc-500" />}
                title="Cryptographic Key Status"
                subtitle="Hardware isolation verified"
                metadata="Active"
                showChevron
              />
            </div>

            {/* Typing Indicator Variants Preview */}
            <div className="space-y-3 pt-2">
              <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block">
                Real-Time Typing Indicators
              </span>
              <div className="p-3.5 rounded-2xl bg-zinc-100/70 dark:bg-zinc-800/50 border border-zinc-200/80 dark:border-zinc-700/60 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-zinc-600 dark:text-zinc-400">Header Chat-Title Variant:</span>
                  <TypingIndicator variant="header" label="typing" />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-zinc-600 dark:text-zinc-400">Message Stream Bubble:</span>
                  <TypingIndicator variant="bubble" />
                </div>
              </div>
            </div>

            {/* Voice Message Audio Player Preview */}
            <div className="space-y-3 pt-2">
              <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block">
                Tactile Voice Message Clips
              </span>
              <div className="p-3.5 rounded-2xl bg-zinc-100/70 dark:bg-zinc-800/50 border border-zinc-200/80 dark:border-zinc-700/60 space-y-3">
                <div className="flex flex-col gap-1">
                  <span className="text-[11px] text-zinc-500">Incoming Voice Clip:</span>
                  <div className="p-2.5 rounded-lg bg-zinc-100 dark:bg-zinc-900 border border-zinc-200/70 dark:border-zinc-800/70 w-fit">
                    <VoiceMessagePlayer duration={6} isSent={false} />
                  </div>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-[11px] text-zinc-500">Sent Voice Clip:</span>
                  <div className="p-2.5 rounded-lg bg-zinc-950 text-zinc-50 border border-zinc-900 w-fit">
                    <VoiceMessagePlayer duration={4} isSent={true} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab: Skeletons */}
        {activeTab === 'skeletons' && (
          <div className="space-y-6">
            <div>
              <span className="text-xs font-mono uppercase tracking-wider text-zinc-400 block mb-2 font-semibold">
                Atmospheric Skeleton Primitives
              </span>
              <div className="p-4 rounded-2xl bg-zinc-100/70 dark:bg-zinc-800/40 border border-zinc-200/80 dark:border-zinc-700/60 space-y-4">
                <div className="space-y-2">
                  <span className="text-[11px] text-zinc-500 font-mono">Text Placeholders</span>
                  <Skeleton variant="text" className="w-3/4 h-4" />
                  <Skeleton variant="text" className="w-1/2 h-3" />
                </div>
                <div className="flex items-center gap-3">
                  <Skeleton variant="circular" className="w-10 h-10" />
                  <Skeleton variant="circular" className="w-8 h-8" />
                  <Skeleton variant="circular" className="w-6 h-6" />
                </div>
              </div>
            </div>

            <div>
              <span className="text-xs font-mono uppercase tracking-wider text-zinc-400 block mb-2 font-semibold">
                Chat List Row Skeleton
              </span>
              <div className="p-2 rounded-2xl bg-zinc-50 dark:bg-zinc-900/40 border border-zinc-200/80 dark:border-zinc-800 space-y-1">
                <ChatRowSkeleton delayIndex={0} />
                <ChatRowSkeleton delayIndex={1} />
              </div>
            </div>

            <div>
              <span className="text-xs font-mono uppercase tracking-wider text-zinc-400 block mb-2 font-semibold">
                Person Connection Row Skeleton
              </span>
              <div className="p-2 rounded-2xl bg-zinc-50 dark:bg-zinc-900/40 border border-zinc-200/80 dark:border-zinc-800 space-y-1">
                <PersonRowSkeleton delayIndex={0} />
                <PersonRowSkeleton delayIndex={1} />
              </div>
            </div>

            <div>
              <span className="text-xs font-mono uppercase tracking-wider text-zinc-400 block mb-2 font-semibold">
                Message Bubbles Skeleton
              </span>
              <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-900/40 border border-zinc-200/80 dark:border-zinc-800 space-y-2">
                <MessageBubbleSkeleton isSent={false} widthClass="w-48" />
                <MessageBubbleSkeleton isSent={true} widthClass="w-40" />
              </div>
            </div>
          </div>
        )}

        {/* Tab 6: Empty States */}
        {activeTab === 'empty' && (
          <div className="p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/40">
            <EmptyState
              icon={<IconChats className="w-6 h-6" />}
              title="A tranquil canvas"
              description="When words matter between you and your inner circle, they will gently rest here."
              actionLabel="Invite a Close Friend"
              onAction={() => {}}
            />
          </div>
        )}

        {/* Close Button */}
        <div className="pt-2">
          <Button variant="primary" fullWidth onClick={onClose}>
            Close Component Inspector
          </Button>
        </div>
      </div>
    </Modal>
  );
}
