export type AppearanceMode = 'light' | 'dark' | 'system';

export type NavigationTab = 'chats' | 'people' | 'you';

export type AppStage = 'splash' | 'onboarding' | 'auth' | 'main';

export type PresenceStatus = 'here' | 'focus' | 'quiet' | 'offline' | 'walking';

export interface AuthUser {
  id: string;
  phoneNumber?: string;
  displayName: string;
  username?: string;
  email?: string;
  avatarColor: string;
  initials: string;
  bio?: string;
  presence: PresenceStatus;
  statusMessage: string;
  shareOnlineStatus?: boolean;
  closeUserIds?: string[];
  createdAt: string;
}

export interface PersonConnection {
  id: string;
  displayName: string;
  username: string;
  avatarColor: string;
  initials: string;
  bio: string;
  statusMessage: string;
  isClose: boolean;
  onlineStatus: PresenceStatus | 'offline';
  presence: PresenceStatus;
  shareOnlineStatus: boolean;
  connectedAt: string;
}

export interface SearchResultUser {
  id: string;
  displayName: string;
  username: string;
  bio: string;
  avatarColor: string;
  initials: string;
  connectionStatus: 'connected' | 'outgoing_pending' | 'incoming_pending' | 'none';
  requestId?: string;
}

export interface ConnectionRequestItem {
  id: string;
  createdAt: string;
  sender?: {
    id: string;
    displayName: string;
    username: string;
    avatarColor: string;
    initials: string;
    bio: string;
  };
  receiver?: {
    id: string;
    displayName: string;
    username: string;
    avatarColor: string;
    initials: string;
    bio: string;
  };
}

export interface BlockedUserItem {
  id: string;
  displayName: string;
  username: string;
  avatarColor: string;
  initials: string;
  bio: string;
}

export interface Person {
  id: string;
  name: string;
  relationship: string;
  presence: PresenceStatus;
  statusMessage: string;
  avatarColor: string;
  initials: string;
  isInnerCircle: boolean;
  lastContactTime?: string;
  phoneOrHandle?: string;
}

export type DisappearingTimerOption = 'off' | '30s' | '5m' | '1h' | '24h' | '7d' | '4w';

export interface DisappearingTimerConfig {
  option: DisappearingTimerOption;
  label: string;
  badgeLabel: string;
  durationSeconds: number; // 0 for off
  description: string;
  recommended?: boolean;
  ephemeralTest?: boolean;
}

export interface ChatMessagePreview {
  id: string;
  sender: 'them' | 'you';
  text: string;
  timestamp: string;
  sequenceNumber?: number;
  createdAt?: number;
  isUnread?: boolean;
  status?: 'sending' | 'sent' | 'delivered' | 'read' | 'failed';
  type?: 'text' | 'audio' | 'photo' | 'file' | 'call';
  imageUrl?: string;
  fileName?: string;
  fileSize?: number;
  isEncrypted?: boolean;
  expiresAt?: number;
  timerDuration?: DisappearingTimerOption;
}

export interface ChatThread {
  id: string;
  person: Person;
  lastMessage: ChatMessagePreview;
  isPinned?: boolean;
  isQuiet?: boolean;
  isArchived?: boolean;
  archivedAt?: string;
  disappearingTimer?: DisappearingTimerOption;
}

export interface DesignToken {
  name: string;
  value: string;
  description: string;
}

export type ChatBackgroundTexture =
  | 'none'
  | 'washi'
  | 'dotgrid'
  | 'linen'
  | 'graph'
  | 'constellation';

export interface ChatTextureConfig {
  id: ChatBackgroundTexture;
  name: string;
  tagline: string;
  description: string;
  overlayClass: string;
  previewClass?: string;
}

export type ChatThemeId =
  | 'default'
  | 'midnight'
  | 'slate'
  | 'ocean'
  | 'forest'
  | 'rose'
  | 'custom';

export interface ChatThemeSetting {
  themeId: ChatThemeId;
  customColor?: string; // hex string e.g. '#8b5cf6'
}

export interface ChatThemeConfig {
  id: ChatThemeId;
  name: string;
  tagline: string;
  description: string;
  accentColor: string;
}

// ----------------------------------------------------------------------
// HYBRID COMMUNICATION & MESH NETWORK TYPES
// ----------------------------------------------------------------------
export type NetworkTransportMode = 'internet' | 'bluetooth-mesh' | 'wifi-direct' | 'offline-queued' | 'store-and-forward';

export interface MeshPeerNode {
  id: string;
  name: string;
  username: string;
  transport: 'bluetooth-le' | 'wifi-direct';
  rssi: number; // dBm e.g. -64
  hops: number; // 1 = direct neighbor, 2+ = multi-hop relay
  batteryLevel?: number; // percentage
  lastHeardAt: number;
  isVerifiedNeighbor: boolean;
  distanceMeters?: number;
}

export interface StoreAndForwardPacket {
  packetId: string;
  sourceNodeId: string;
  sourceName: string;
  sourceUsername?: string;
  targetNodeId: string;
  targetName: string;
  targetUsername?: string;
  chatId: string;
  ciphertextEnvelope: {
    cipher: string;
    ivPreview: string;
    sha256Digest: string;
    payloadType: 'text' | 'photo' | 'audio' | 'file' | 'call';
    encryptedAt: number;
  };
  previewText?: string;
  transport: 'bluetooth-le' | 'wifi-direct' | 'internet';
  hops: number;
  maxHops: number;
  custodyChain: string[]; // List of nodes that held or relayed this packet
  currentCustodian: string;
  status: 'in-custody' | 'relaying' | 'delivered-to-peer' | 'synced-to-cloud';
  createdAt: number;
  expiresAt: number;
  syncedAt?: number;
}

export interface OfflineQueuedMessage {
  id: string;
  chatId: string;
  recipientId: string;
  recipientName: string;
  text: string;
  type?: 'text' | 'audio' | 'photo' | 'file' | 'call';
  encryptedEnvelope?: any;
  transportTarget: 'bluetooth-le' | 'wifi-direct' | 'internet';
  status: 'queued' | 'relaying' | 'delivered' | 'synced';
  timestamp: number;
  timeLabel: string;
  meshHops?: number;
  relayCustodyNodes?: string[];
  retryCount: number;
}

export interface MeshNetworkState {
  isOnline: boolean;
  isSyncing: boolean;
  activeTransport: NetworkTransportMode;
  batterySaver: boolean;
  discoveryScanIntervalSeconds: number; // 10s in standard mode, 60s in battery saver mode
  activeScanWindowMs: number; // 2500ms in standard, 1000ms in battery saver
  powerSavingsPercent: number; // 0% standard, ~83% in battery saver
  offlineMeshEnabled: boolean;
  storeAndForwardRelayEnabled: boolean;
  queuedMessagesCount: number;
  relayedPacketsCount: number;
  custodyPacketsCount: number;
  lastScanTimestamp: number | null;
  lastSyncTimestamp: number | null;
  nearbyPeers: MeshPeerNode[];
  custodyPackets: StoreAndForwardPacket[];
  queuedMessages: OfflineQueuedMessage[];
}


