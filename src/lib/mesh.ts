import { useState, useEffect } from 'react';
import {
  MeshNetworkState,
  MeshPeerNode,
  NetworkTransportMode,
  StoreAndForwardPacket,
  OfflineQueuedMessage,
} from '../types';

export const BATTERY_SAVER_STORAGE_KEY = 'among_mesh_battery_saver';
export const OFFLINE_SIMULATION_KEY = 'among_mesh_simulated_offline';
export const OFFLINE_QUEUE_STORAGE_KEY = 'among_mesh_offline_queue';
export const CUSTODY_PACKETS_STORAGE_KEY = 'among_mesh_custody_packets';
export const MESH_STATE_CHANGE_EVENT = 'among:mesh-state-changed';
export const MESH_SYNC_COMPLETED_EVENT = 'among:mesh-sync-completed';

export const STANDARD_SCAN_INTERVAL_SECONDS = 10;
export const STANDARD_SCAN_WINDOW_MS = 2500;
export const BATTERY_SAVER_SCAN_INTERVAL_SECONDS = 60;
export const BATTERY_SAVER_SCAN_WINDOW_MS = 1000;
export const BATTERY_SAVER_POWER_SAVINGS_PERCENT = 83; // ~83% reduction in radio duty-cycle

// Initial simulated nearby AMONG mesh nodes
const INITIAL_PEERS: MeshPeerNode[] = [
  {
    id: 'peer-elena',
    name: 'Elena Vance',
    username: 'elena',
    transport: 'bluetooth-le',
    rssi: -62,
    hops: 1,
    batteryLevel: 88,
    lastHeardAt: Date.now() - 4000,
    isVerifiedNeighbor: true,
    distanceMeters: 6,
  },
  {
    id: 'peer-siobhan',
    name: 'Siobhan Chen',
    username: 'siobhan',
    transport: 'bluetooth-le',
    rssi: -74,
    hops: 1,
    batteryLevel: 72,
    lastHeardAt: Date.now() - 12000,
    isVerifiedNeighbor: true,
    distanceMeters: 14,
  },
  {
    id: 'peer-relay-marcus',
    name: 'Marcus Aurelius',
    username: 'marcus',
    transport: 'bluetooth-le',
    rssi: -82,
    hops: 2,
    batteryLevel: 91,
    lastHeardAt: Date.now() - 18000,
    isVerifiedNeighbor: true,
    distanceMeters: 28,
  },
  {
    id: 'peer-gateway-sanctuary',
    name: 'Quiet Ridge Relay',
    username: 'sanctuary-node',
    transport: 'wifi-direct',
    rssi: -54,
    hops: 1,
    batteryLevel: 100,
    lastHeardAt: Date.now() - 2000,
    isVerifiedNeighbor: true,
    distanceMeters: 4,
  },
];

// Initial seeded store-and-forward relay custody packets
const INITIAL_CUSTODY_PACKETS: StoreAndForwardPacket[] = [
  {
    packetId: 'pkt-saf-891',
    sourceNodeId: 'peer-elena',
    sourceName: 'Elena Vance',
    sourceUsername: 'elena',
    targetNodeId: 'peer-relay-marcus',
    targetName: 'Marcus Aurelius',
    targetUsername: 'marcus',
    chatId: 'chat-relay-marcus',
    ciphertextEnvelope: {
      cipher: 'AES-256-GCM',
      ivPreview: 'c2FuY3R1YXJ5LTAx',
      sha256Digest: '7f83b1657ff1fc53b92dc18148a1d65dfc2d4b1fa3d677284addd200126d9069',
      payloadType: 'text',
      encryptedAt: Date.now() - 180000,
    },
    previewText: 'Encrypted mesh payload · [Zero-knowledge custody]',
    transport: 'bluetooth-le',
    hops: 1,
    maxHops: 4,
    custodyChain: ['Elena Vance', 'Your Device (Holding Custody)'],
    currentCustodian: 'Your Device',
    status: 'in-custody',
    createdAt: Date.now() - 180000,
    expiresAt: Date.now() + 86400000 * 2,
  },
  {
    packetId: 'pkt-saf-304',
    sourceNodeId: 'peer-siobhan',
    sourceName: 'Siobhan Chen',
    sourceUsername: 'siobhan',
    targetNodeId: 'cloud-gateway-archive',
    targetName: 'Quiet Ridge Gateway',
    targetUsername: 'gateway',
    chatId: 'chat-gateway-sync',
    ciphertextEnvelope: {
      cipher: 'AES-256-GCM',
      ivPreview: 'dmFuY2UtZGlzcGF0Y2g=',
      sha256Digest: 'cb8379ac2098aa165029e3938a51da0bcecfc008fd6795f401178647f96c5b34',
      payloadType: 'text',
      encryptedAt: Date.now() - 320000,
    },
    previewText: 'Store-and-forward telemetry packet awaiting Internet gateway',
    transport: 'wifi-direct',
    hops: 2,
    maxHops: 5,
    custodyChain: ['Siobhan Chen', 'Quiet Ridge Relay', 'Your Device'],
    currentCustodian: 'Your Device',
    status: 'in-custody',
    createdAt: Date.now() - 320000,
    expiresAt: Date.now() + 86400000 * 3,
  },
];

// Helper to safely read localStorage JSON
function getStoredJson<T>(key: string, defaultValue: T): T {
  try {
    const val = localStorage.getItem(key);
    if (val !== null) {
      return JSON.parse(val);
    }
  } catch {}
  return defaultValue;
}

// Helper to safely read localStorage boolean
function getStoredBoolean(key: string, defaultValue: boolean): boolean {
  try {
    const val = localStorage.getItem(key);
    if (val !== null) {
      return val === 'true';
    }
  } catch {}
  return defaultValue;
}

// State stores
let offlineMessageQueue: OfflineQueuedMessage[] = getStoredJson<OfflineQueuedMessage[]>(
  OFFLINE_QUEUE_STORAGE_KEY,
  []
);

let custodyPackets: StoreAndForwardPacket[] = getStoredJson<StoreAndForwardPacket[]>(
  CUSTODY_PACKETS_STORAGE_KEY,
  INITIAL_CUSTODY_PACKETS
);

let simulatedOffline = getStoredBoolean(OFFLINE_SIMULATION_KEY, false);
let batterySaver = getStoredBoolean(BATTERY_SAVER_STORAGE_KEY, true); // default true for serene battery conservation
let isSyncing = false;
let lastScanTimestamp: number | null = Date.now();
let lastSyncTimestamp: number | null = Date.now() - 60000;
let scanTimer: number | null = null;
let relayedPacketsCount = 28;

// Listeners
type MeshListener = (state: MeshNetworkState) => void;
const listeners = new Set<MeshListener>();

function saveOfflineQueue() {
  try {
    localStorage.setItem(OFFLINE_QUEUE_STORAGE_KEY, JSON.stringify(offlineMessageQueue));
  } catch {}
}

function saveCustodyPackets() {
  try {
    localStorage.setItem(CUSTODY_PACKETS_STORAGE_KEY, JSON.stringify(custodyPackets));
  } catch {}
}

export function notifyListeners() {
  const state = getMeshState();
  listeners.forEach((listener) => {
    try {
      listener(state);
    } catch (err) {
      console.error('Mesh state listener error:', err);
    }
  });

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(MESH_STATE_CHANGE_EVENT, { detail: state }));
  }
}

// Compute active network transport
function computeActiveTransport(isOnline: boolean): NetworkTransportMode {
  if (isOnline) return 'internet';
  if (INITIAL_PEERS.length > 0) return 'bluetooth-mesh';
  return 'offline-queued';
}

// Compute full current mesh network state
export function getMeshState(): MeshNetworkState {
  const isOnline =
    typeof navigator !== 'undefined'
      ? navigator.onLine && !simulatedOffline
      : !simulatedOffline;

  const scanInterval = batterySaver
    ? BATTERY_SAVER_SCAN_INTERVAL_SECONDS
    : STANDARD_SCAN_INTERVAL_SECONDS;
  const scanWindow = batterySaver
    ? BATTERY_SAVER_SCAN_WINDOW_MS
    : STANDARD_SCAN_WINDOW_MS;
  const powerSavings = batterySaver ? BATTERY_SAVER_POWER_SAVINGS_PERCENT : 0;

  return {
    isOnline,
    isSyncing,
    activeTransport: computeActiveTransport(isOnline),
    batterySaver,
    discoveryScanIntervalSeconds: scanInterval,
    activeScanWindowMs: scanWindow,
    powerSavingsPercent: powerSavings,
    offlineMeshEnabled: true,
    storeAndForwardRelayEnabled: true,
    queuedMessagesCount: offlineMessageQueue.filter((m) => m.status === 'queued').length,
    relayedPacketsCount,
    custodyPacketsCount: custodyPackets.filter((p) => p.status === 'in-custody').length,
    lastScanTimestamp,
    lastSyncTimestamp,
    nearbyPeers: INITIAL_PEERS,
    custodyPackets,
    queuedMessages: offlineMessageQueue,
  };
}

// Set Battery Saver Mode
export function setMeshBatterySaver(enabled: boolean) {
  batterySaver = enabled;
  try {
    localStorage.setItem(BATTERY_SAVER_STORAGE_KEY, String(enabled));
  } catch {}

  restartScanSchedule();
  notifyListeners();
}

// Toggle Battery Saver
export function toggleMeshBatterySaver(): boolean {
  const next = !batterySaver;
  setMeshBatterySaver(next);
  return next;
}

// Set Simulated Offline Mode
export function setMeshSimulatedOffline(offline: boolean) {
  const wasOffline = simulatedOffline;
  simulatedOffline = offline;
  try {
    localStorage.setItem(OFFLINE_SIMULATION_KEY, String(offline));
  } catch {}

  if (offline) {
    restartScanSchedule();
    notifyListeners();
  } else {
    stopScanSchedule();
    notifyListeners();
    // Automatic cloud sync on reconnect!
    if (wasOffline) {
      setTimeout(() => {
        syncQueuedMessages();
      }, 350);
    }
  }
}

// Perform simulated Bluetooth discovery scan
export async function triggerManualDiscoveryScan(): Promise<void> {
  lastScanTimestamp = Date.now();
  relayedPacketsCount += 1;
  INITIAL_PEERS.forEach((peer) => {
    const delta = Math.floor(Math.random() * 5) - 2;
    peer.rssi = Math.min(-45, Math.max(-95, peer.rssi + delta));
    peer.lastHeardAt = Date.now();
  });
  notifyListeners();
}

// Scan scheduler based on Battery Saver setting
function startScanLoop() {
  stopScanSchedule();

  const isOnline =
    typeof navigator !== 'undefined'
      ? navigator.onLine && !simulatedOffline
      : !simulatedOffline;

  // When offline, maintain BLE discovery scans
  if (!isOnline) {
    const intervalSeconds = batterySaver
      ? BATTERY_SAVER_SCAN_INTERVAL_SECONDS
      : STANDARD_SCAN_INTERVAL_SECONDS;

    scanTimer = window.setInterval(() => {
      lastScanTimestamp = Date.now();
      // Jitter peer RSSI slightly to reflect real wireless radio dynamics
      INITIAL_PEERS.forEach((peer) => {
        const delta = Math.floor(Math.random() * 5) - 2;
        peer.rssi = Math.min(-45, Math.max(-95, peer.rssi + delta));
        peer.lastHeardAt = Date.now();
      });
      relayedPacketsCount += Math.random() > 0.4 ? 1 : 0;
      notifyListeners();
    }, intervalSeconds * 1000);
  }
}

function stopScanSchedule() {
  if (scanTimer !== null) {
    clearInterval(scanTimer);
    scanTimer = null;
  }
}

function restartScanSchedule() {
  stopScanSchedule();
  startScanLoop();
}

// Subscribe to state changes
export function subscribeMeshState(listener: MeshListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

// ---------------------------------------------------------------------------
// HYBRID MESSAGING LAYER & STORE-AND-FORWARD RELAY ENGINE
// ---------------------------------------------------------------------------

export interface HybridSendResult {
  transport: NetworkTransportMode;
  protocol: 'internet' | 'bluetooth-le' | 'wifi-direct' | 'offline-queued';
  hops: number;
  status: 'sent' | 'delivered' | 'queued' | 'relaying';
  custodyChain: string[];
  queuedMessageId?: string;
  packetId?: string;
}

/**
 * Sends a message using the hybrid layer:
 * 1. If online: uses Internet directly.
 * 2. If offline:
 *    - If recipient is a direct 1-hop neighbor: sends via BLE / Wi-Fi Direct.
 *    - If recipient is reachable via a relay peer: initiates store-and-forward relaying.
 *    - Otherwise: queues message locally in store-and-forward buffer for auto-sync.
 */
export async function sendHybridMessage(params: {
  chatId: string;
  recipientId: string;
  recipientName: string;
  recipientUsername?: string;
  text: string;
  encryptedEnvelope?: any;
  type?: 'text' | 'audio' | 'photo' | 'file' | 'call';
}): Promise<HybridSendResult> {
  const isOnline =
    typeof navigator !== 'undefined'
      ? navigator.onLine && !simulatedOffline
      : !simulatedOffline;

  // Path A: Internet Online
  if (isOnline) {
    return {
      transport: 'internet',
      protocol: 'internet',
      hops: 0,
      status: 'sent',
      custodyChain: ['Internet Cloud Gateway (E2EE)'],
    };
  }

  // Path B: Offline Mesh Evaluation
  const cleanTargetName = params.recipientName.toLowerCase();
  const cleanTargetId = params.recipientId.toLowerCase();

  // Find if recipient matches a direct nearby peer
  const directPeer = INITIAL_PEERS.find(
    (p) =>
      p.hops === 1 &&
      (cleanTargetName.includes(p.name.toLowerCase().split(' ')[0]) ||
        cleanTargetId.includes(p.username.toLowerCase()) ||
        p.id === params.recipientId)
  );

  if (directPeer) {
    // Deliver directly via Bluetooth LE / Wi-Fi Direct
    relayedPacketsCount += 1;
    notifyListeners();

    return {
      transport: directPeer.transport === 'bluetooth-le' ? 'bluetooth-mesh' : 'wifi-direct',
      protocol: directPeer.transport,
      hops: 1,
      status: 'delivered',
      custodyChain: ['Your Device', `${directPeer.name} (Direct ${directPeer.transport.toUpperCase()})`],
    };
  }

  // Find if recipient can be reached via a multi-hop relay node
  const relayPeer = INITIAL_PEERS.find(
    (p) =>
      p.hops > 1 &&
      (cleanTargetName.includes(p.name.toLowerCase().split(' ')[0]) ||
        cleanTargetId.includes(p.username.toLowerCase()))
  );

  if (relayPeer) {
    // Forward through intermediate relay node (e.g. Marcus Aurelius)
    const intermediateNode = INITIAL_PEERS.find((p) => p.hops === 1) || INITIAL_PEERS[0];
    const newPacket: StoreAndForwardPacket = {
      packetId: `pkt-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      sourceNodeId: 'current-user-node',
      sourceName: 'You',
      targetNodeId: params.recipientId,
      targetName: params.recipientName,
      targetUsername: params.recipientUsername,
      chatId: params.chatId,
      ciphertextEnvelope: {
        cipher: 'AES-256-GCM',
        ivPreview: params.encryptedEnvelope?.iv?.slice(0, 16) || 'dGhpcy1pcy1hbi1pdi0xMg==',
        sha256Digest: params.encryptedEnvelope?.sha256Digest || 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
        payloadType: params.type || 'text',
        encryptedAt: Date.now(),
      },
      previewText: params.text ? `[Encrypted Mesh Payload: ${params.text.slice(0, 24)}...]` : '[Encrypted Media]',
      transport: 'bluetooth-le',
      hops: 2,
      maxHops: 5,
      custodyChain: ['Your Device', `${intermediateNode.name} (Relay)`, `${relayPeer.name} (Destination)`],
      currentCustodian: intermediateNode.name,
      status: 'relaying',
      createdAt: Date.now(),
      expiresAt: Date.now() + 86400000 * 3,
    };

    custodyPackets.unshift(newPacket);
    saveCustodyPackets();
    relayedPacketsCount += 2;
    notifyListeners();

    return {
      transport: 'bluetooth-mesh',
      protocol: 'bluetooth-le',
      hops: 2,
      status: 'relaying',
      custodyChain: newPacket.custodyChain,
      packetId: newPacket.packetId,
    };
  }

  // Path C: Recipient is currently unreachable on nearby radio mesh
  // Queue in local store-and-forward buffer for automatic sync upon Internet reconnect or relay encounter
  const now = new Date();
  const timeLabel = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
  const queuedMsgId = `queued-${Date.now()}`;

  const queuedItem: OfflineQueuedMessage = {
    id: queuedMsgId,
    chatId: params.chatId,
    recipientId: params.recipientId,
    recipientName: params.recipientName,
    text: params.text,
    type: params.type,
    encryptedEnvelope: params.encryptedEnvelope,
    transportTarget: 'internet',
    status: 'queued',
    timestamp: Date.now(),
    timeLabel,
    meshHops: 0,
    relayCustodyNodes: ['Your Device (Local Custody Buffer)'],
    retryCount: 0,
  };

  offlineMessageQueue.unshift(queuedItem);
  saveOfflineQueue();

  // Also add a store-and-forward custody packet representation
  const custodyPacket: StoreAndForwardPacket = {
    packetId: `pkt-${Date.now()}`,
    sourceNodeId: 'current-user-node',
    sourceName: 'You',
    targetNodeId: params.recipientId,
    targetName: params.recipientName,
    targetUsername: params.recipientUsername,
    chatId: params.chatId,
    ciphertextEnvelope: {
      cipher: 'AES-256-GCM',
      ivPreview: params.encryptedEnvelope?.iv?.slice(0, 16) || 'dGhpcy1pcy1hbi1pdi0xMg==',
      sha256Digest: 'a1b2c3d4e5f67890abcdef1234567890abcdef1234567890abcdef1234567890',
      payloadType: params.type || 'text',
      encryptedAt: Date.now(),
    },
    previewText: `Queued whisper for ${params.recipientName}`,
    transport: 'bluetooth-le',
    hops: 0,
    maxHops: 5,
    custodyChain: ['Your Device (Holding until Gateway/Peer Sync)'],
    currentCustodian: 'Your Device',
    status: 'in-custody',
    createdAt: Date.now(),
    expiresAt: Date.now() + 86400000 * 7,
  };

  custodyPackets.unshift(custodyPacket);
  saveCustodyPackets();
  notifyListeners();

  return {
    transport: 'offline-queued',
    protocol: 'offline-queued',
    hops: 0,
    status: 'queued',
    custodyChain: ['Your Device (Buffered Offline)'],
    queuedMessageId: queuedMsgId,
    packetId: custodyPacket.packetId,
  };
}

/**
 * Synchronizes all queued offline messages and store-and-forward custody packets.
 * Automatically called when connectivity returns or when manually triggered by user.
 */
export async function syncQueuedMessages(): Promise<{
  syncedMessagesCount: number;
  syncedPacketsCount: number;
}> {
  isSyncing = true;
  notifyListeners();

  try {
    // Artificial small delay for serene visual feedback so user perceives sync progress
    await new Promise((r) => setTimeout(r, 650));

    const pendingMessages = offlineMessageQueue.filter((m) => m.status === 'queued');
    const pendingPackets = custodyPackets.filter((p) => p.status === 'in-custody' || p.status === 'relaying');

    if (pendingMessages.length === 0 && pendingPackets.length === 0) {
      lastSyncTimestamp = Date.now();
      return { syncedMessagesCount: 0, syncedPacketsCount: 0 };
    }

    // Update queued messages to 'synced' status with cloud confirmation
    const now = Date.now();
    pendingMessages.forEach((msg) => {
      msg.status = 'synced';
      msg.transportTarget = 'internet';
      msg.meshHops = 1;
      msg.relayCustodyNodes = ['Your Device', 'Internet Cloud Gateway (Delivered)'];
    });

    // Update custody packets to synced
    pendingPackets.forEach((pkt) => {
      pkt.status = 'synced-to-cloud';
      pkt.syncedAt = now;
      pkt.custodyChain.push('Cloud Gateway (Delivered)');
    });

    saveOfflineQueue();
    saveCustodyPackets();

    lastSyncTimestamp = now;
    relayedPacketsCount += pendingMessages.length + pendingPackets.length;

    // Dispatch sync event with details so ConversationScreens and ChatsViews can update in real-time
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent(MESH_SYNC_COMPLETED_EVENT, {
          detail: {
            syncedMessagesCount: pendingMessages.length,
            syncedPacketsCount: pendingPackets.length,
            syncedMessageIds: pendingMessages.map((m) => m.id),
            syncedChatIds: Array.from(new Set(pendingMessages.map((m) => m.chatId))),
            timestamp: now,
          },
        })
      );
    }

    return {
      syncedMessagesCount: pendingMessages.length,
      syncedPacketsCount: pendingPackets.length,
    };
  } finally {
    isSyncing = false;
    notifyListeners();
  }
}

/**
 * Simulates a peer-to-peer store-and-forward relay exchange with a nearby node.
 */
export async function simulatePeerRelayExchange(packetId: string): Promise<boolean> {
  const packet = custodyPackets.find((p) => p.packetId === packetId);
  if (!packet) return false;

  const targetPeer = INITIAL_PEERS.find((p) => p.name !== packet.currentCustodian) || INITIAL_PEERS[0];
  packet.hops += 1;
  packet.currentCustodian = targetPeer.name;
  packet.custodyChain.push(`${targetPeer.name} (Mesh Relay Hop ${packet.hops})`);
  packet.status = 'relaying';

  relayedPacketsCount += 1;
  saveCustodyPackets();
  notifyListeners();
  return true;
}

/**
 * Remove an item from the offline queue
 */
export function removeQueuedMessage(id: string) {
  offlineMessageQueue = offlineMessageQueue.filter((m) => m.id !== id);
  saveOfflineQueue();
  notifyListeners();
}

/**
 * Clear the entire offline message queue
 */
export function clearOfflineMessageQueue() {
  offlineMessageQueue = [];
  saveOfflineQueue();
  notifyListeners();
}

// React Hook to consume live mesh network state
export function useMeshNetwork(): {
  meshState: MeshNetworkState;
  setBatterySaver: (enabled: boolean) => void;
  toggleBatterySaver: () => boolean;
  setSimulatedOffline: (offline: boolean) => void;
  triggerManualDiscoveryScan: () => Promise<void>;
  syncQueuedMessages: () => Promise<{ syncedMessagesCount: number; syncedPacketsCount: number }>;
  simulatePeerRelayExchange: (packetId: string) => Promise<boolean>;
  removeQueuedMessage: (id: string) => void;
} {
  const [meshState, setMeshState] = useState<MeshNetworkState>(getMeshState);

  useEffect(() => {
    const handleOnline = () => {
      notifyListeners();
      restartScanSchedule();
      // Automatic sync when browser regains actual internet connectivity!
      setTimeout(() => {
        syncQueuedMessages();
      }, 500);
    };

    const handleOffline = () => {
      notifyListeners();
      restartScanSchedule();
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    const unsubscribe = subscribeMeshState((next) => {
      setMeshState(next);
    });

    startScanLoop();

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      unsubscribe();
      stopScanSchedule();
    };
  }, []);

  return {
    meshState,
    setBatterySaver: setMeshBatterySaver,
    toggleBatterySaver: toggleMeshBatterySaver,
    setSimulatedOffline: setMeshSimulatedOffline,
    triggerManualDiscoveryScan,
    syncQueuedMessages,
    simulatePeerRelayExchange,
    removeQueuedMessage,
  };
}
