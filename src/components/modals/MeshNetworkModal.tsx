import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  IconClose,
  IconBluetooth,
  IconBluetoothSearching,
  IconWifi,
  IconBattery,
  IconZap,
  IconRadio,
  IconRotateCcw,
  IconHardDrive,
  IconCloud,
  IconCloudOff,
  IconArrowRight,
  IconCheck,
  IconCheckDouble,
  IconSecurity,
  IconLayers,
  IconForward,
} from '../common/Icons';
import { useMeshNetwork } from '../../lib/mesh';
import { StoreAndForwardPacket, OfflineQueuedMessage } from '../../types';

interface MeshNetworkModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MeshNetworkModal: React.FC<MeshNetworkModalProps> = ({
  isOpen,
  onClose,
}) => {
  const {
    meshState,
    setBatterySaver,
    toggleBatterySaver,
    setSimulatedOffline,
    triggerManualDiscoveryScan,
    syncQueuedMessages,
    simulatePeerRelayExchange,
    removeQueuedMessage,
  } = useMeshNetwork();

  const [activeTab, setActiveTab] = useState<'overview' | 'queue' | 'custody' | 'peers'>('overview');
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncFeedback, setSyncFeedback] = useState<string | null>(null);
  const [selectedPacket, setSelectedPacket] = useState<StoreAndForwardPacket | null>(null);

  if (!isOpen) return null;

  const isBatterySaverOn = meshState.batterySaver;

  const handleManualSync = async () => {
    setIsSyncing(true);
    setSyncFeedback(null);
    try {
      const res = await syncQueuedMessages();
      setSyncFeedback(
        res.syncedMessagesCount > 0 || res.syncedPacketsCount > 0
          ? `Synced ${res.syncedMessagesCount} queued whispers & ${res.syncedPacketsCount} relay packets.`
          : 'All messages and packets are already synchronized.'
      );
      setTimeout(() => setSyncFeedback(null), 4000);
    } catch (e) {
      setSyncFeedback('Sync attempt complete.');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleRelayHop = async (packetId: string) => {
    const success = await simulatePeerRelayExchange(packetId);
    if (success) {
      setSyncFeedback('Packet relayed to next AMONG custodian node.');
      setTimeout(() => setSyncFeedback(null), 3500);
    }
  };

  return (
    <AnimatePresence>
      <div
        className="fixed inset-0 z-60 flex items-center justify-center p-3 sm:p-4 bg-black/65 backdrop-blur-xs select-none"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ type: 'spring', damping: 28, stiffness: 380 }}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-lg rounded-3xl bg-white dark:bg-zinc-950 border border-zinc-200/90 dark:border-zinc-800 shadow-2xl overflow-hidden flex flex-col max-h-[90vh] text-zinc-900 dark:text-zinc-100"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3.5 border-b border-zinc-100 dark:border-zinc-850 bg-zinc-50/50 dark:bg-zinc-900/50">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-700 dark:text-zinc-300">
                {!meshState.isOnline ? (
                  <IconBluetooth className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                ) : (
                  <IconCloud className="w-4 h-4 text-sky-600 dark:text-sky-400" />
                )}
              </div>
              <div>
                <h3 className="text-xs font-semibold tracking-tight text-zinc-950 dark:text-zinc-50 flex items-center gap-1.5">
                  <span>Hybrid Communication Layer</span>
                  <span
                    className={`text-[9px] font-mono px-1.5 py-0.2 rounded-full font-medium ${
                      meshState.isOnline
                        ? 'bg-sky-500/15 text-sky-600 dark:text-sky-400 border border-sky-500/20'
                        : 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                    }`}
                  >
                    {meshState.isOnline ? 'Internet Active' : 'Offline Mesh Active'}
                  </span>
                </h3>
                <p className="text-[10px] text-zinc-400 font-mono">
                  Seamless Internet · BLE Mesh · Wi-Fi Direct · Store & Forward
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-1 rounded-md text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
              aria-label="Close mesh diagnostics"
            >
              <IconClose className="w-4 h-4" />
            </button>
          </div>

          {/* Navigation Tabs */}
          <div className="flex items-center border-b border-zinc-100 dark:border-zinc-850 px-3 bg-zinc-50/30 dark:bg-zinc-900/30 text-xs gap-1 overflow-x-auto">
            <button
              type="button"
              onClick={() => setActiveTab('overview')}
              className={`py-2 px-3 border-b-2 font-medium transition-colors whitespace-nowrap cursor-pointer ${
                activeTab === 'overview'
                  ? 'border-zinc-950 dark:border-zinc-100 text-zinc-950 dark:text-zinc-100 font-semibold'
                  : 'border-transparent text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300'
              }`}
            >
              Overview & Controls
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('queue')}
              className={`py-2 px-3 border-b-2 font-medium transition-colors whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'queue'
                  ? 'border-zinc-950 dark:border-zinc-100 text-zinc-950 dark:text-zinc-100 font-semibold'
                  : 'border-transparent text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300'
              }`}
            >
              <span>Offline Queue</span>
              {meshState.queuedMessagesCount > 0 && (
                <span className="text-[10px] px-1.5 py-0.2 bg-amber-500/20 text-amber-600 dark:text-amber-400 rounded-full font-mono font-semibold">
                  {meshState.queuedMessagesCount}
                </span>
              )}
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('custody')}
              className={`py-2 px-3 border-b-2 font-medium transition-colors whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'custody'
                  ? 'border-zinc-950 dark:border-zinc-100 text-zinc-950 dark:text-zinc-100 font-semibold'
                  : 'border-transparent text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300'
              }`}
            >
              <span>Relay Custody</span>
              <span className="text-[10px] px-1.5 py-0.2 bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 rounded-full font-mono font-semibold">
                {meshState.custodyPacketsCount}
              </span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('peers')}
              className={`py-2 px-3 border-b-2 font-medium transition-colors whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'peers'
                  ? 'border-zinc-950 dark:border-zinc-100 text-zinc-950 dark:text-zinc-100 font-semibold'
                  : 'border-transparent text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300'
              }`}
            >
              <span>Nearby Nodes</span>
              <span className="text-[10px] px-1.5 py-0.2 bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 rounded-full font-mono">
                {meshState.nearbyPeers.length}
              </span>
            </button>
          </div>

          {/* Sync Feedback Alert */}
          {syncFeedback && (
            <div className="px-4 py-2 bg-emerald-500/10 border-b border-emerald-500/20 text-[11px] text-emerald-600 dark:text-emerald-400 flex items-center justify-between">
              <span>{syncFeedback}</span>
              <button
                type="button"
                onClick={() => setSyncFeedback(null)}
                className="text-emerald-600 dark:text-emerald-400 hover:opacity-80"
              >
                <IconClose className="w-3 h-3" />
              </button>
            </div>
          )}

          {/* Modal Body */}
          <div className="p-4 space-y-4 overflow-y-auto flex-1 text-left text-xs">
            {/* TAB 1: OVERVIEW & CONTROLS */}
            {activeTab === 'overview' && (
              <div className="space-y-4">
                {/* Visual Architecture Diagram */}
                <div className="p-3.5 rounded-2xl bg-zinc-100/70 dark:bg-zinc-900/60 border border-zinc-200/80 dark:border-zinc-800">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 font-semibold">
                      Hybrid Architecture & Routing
                    </span>
                    <span className="text-[10px] text-zinc-500 dark:text-zinc-400 font-mono">
                      Fallback: Internet → BLE → Wi-Fi Direct → Relay Custody
                    </span>
                  </div>

                  <div className="grid grid-cols-4 gap-1.5 text-center mt-2.5">
                    <div
                      className={`p-2 rounded-xl border flex flex-col items-center justify-center gap-1 ${
                        meshState.isOnline
                          ? 'bg-sky-500/10 border-sky-500/30 text-sky-600 dark:text-sky-400 font-medium'
                          : 'bg-zinc-50 dark:bg-zinc-950/60 border-zinc-200 dark:border-zinc-800/80 text-zinc-400 opacity-60'
                      }`}
                    >
                      <IconCloud className="w-4 h-4" />
                      <span className="text-[10.5px]">Internet</span>
                      <span className="text-[9px] font-mono">{meshState.isOnline ? 'Active' : 'Offline'}</span>
                    </div>

                    <div
                      className={`p-2 rounded-xl border flex flex-col items-center justify-center gap-1 ${
                        !meshState.isOnline
                          ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400 font-medium'
                          : 'bg-zinc-50 dark:bg-zinc-950/60 border-zinc-200 dark:border-zinc-800/80 text-zinc-400'
                      }`}
                    >
                      <IconBluetooth className="w-4 h-4" />
                      <span className="text-[10.5px]">BLE Mesh</span>
                      <span className="text-[9px] font-mono">{!meshState.isOnline ? 'Primary' : 'Standby'}</span>
                    </div>

                    <div
                      className={`p-2 rounded-xl border flex flex-col items-center justify-center gap-1 ${
                        !meshState.isOnline
                          ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400 font-medium'
                          : 'bg-zinc-50 dark:bg-zinc-950/60 border-zinc-200 dark:border-zinc-800/80 text-zinc-400'
                      }`}
                    >
                      <IconWifi className="w-4 h-4" />
                      <span className="text-[10.5px]">Wi-Fi Direct</span>
                      <span className="text-[9px] font-mono">{!meshState.isOnline ? 'High Speed' : 'Standby'}</span>
                    </div>

                    <div className="p-2 rounded-xl border bg-zinc-50 dark:bg-zinc-950/60 border-zinc-200 dark:border-zinc-800/80 text-zinc-700 dark:text-zinc-300 flex flex-col items-center justify-center gap-1">
                      <IconHardDrive className="w-4 h-4 text-amber-500" />
                      <span className="text-[10.5px]">Custody Queue</span>
                      <span className="text-[9px] font-mono font-semibold text-amber-600 dark:text-amber-400">
                        {meshState.queuedMessagesCount + meshState.custodyPacketsCount} pkts
                      </span>
                    </div>
                  </div>
                </div>

                {/* Battery Saver Master Card */}
                <div
                  className={`p-3.5 rounded-2xl border transition-all ${
                    isBatterySaverOn
                      ? 'bg-emerald-500/5 border-emerald-500/30 dark:bg-emerald-950/20 dark:border-emerald-500/30'
                      : 'bg-zinc-100/60 dark:bg-zinc-900/60 border-zinc-200 dark:border-zinc-800'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-2.5">
                      <div
                        className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                          isBatterySaverOn
                            ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                            : 'bg-zinc-200 dark:bg-zinc-800 text-zinc-500'
                        }`}
                      >
                        <IconBattery className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-semibold text-zinc-950 dark:text-zinc-50">
                            Battery Saver Mode
                          </span>
                          <span
                            className={`text-[9.5px] font-mono font-medium px-1.5 py-0.2 rounded-full ${
                              isBatterySaverOn
                                ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                                : 'bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400'
                            }`}
                          >
                            {isBatterySaverOn ? '60s Scan' : '10s Scan'}
                          </span>
                        </div>
                        <p className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-relaxed mt-1">
                          {isBatterySaverOn
                            ? 'Discovery scans reduced to 60-second intervals when offline. Cuts radio draw by ~83% to preserve phone battery during off-grid travel.'
                            : 'Standard 10-second discovery scans active when offline. Rapid peer acquisition at the expense of higher radio energy use.'}
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={toggleBatterySaver}
                      className={`w-11 h-6 rounded-full transition-colors p-0.5 relative cursor-pointer shrink-0 ${
                        isBatterySaverOn
                          ? 'bg-emerald-500 dark:bg-emerald-500'
                          : 'bg-zinc-300 dark:bg-zinc-700'
                      }`}
                      aria-label="Toggle battery saver for mesh discovery scans"
                    >
                      <div
                        className={`w-5 h-5 rounded-full bg-white shadow-xs transition-transform ${
                          isBatterySaverOn ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>

                  <div className="mt-3 pt-2.5 border-t border-black/5 dark:border-white/5 grid grid-cols-3 gap-2 text-center text-xs">
                    <div className="p-2 rounded-xl bg-white/60 dark:bg-zinc-900/60 border border-black/5 dark:border-white/5">
                      <span className="text-[10px] text-zinc-400 block font-mono">SCAN CADENCE</span>
                      <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 font-mono">
                        {meshState.discoveryScanIntervalSeconds}s
                      </span>
                    </div>
                    <div className="p-2 rounded-xl bg-white/60 dark:bg-zinc-900/60 border border-black/5 dark:border-white/5">
                      <span className="text-[10px] text-zinc-400 block font-mono">SCAN WINDOW</span>
                      <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 font-mono">
                        {meshState.activeScanWindowMs}ms
                      </span>
                    </div>
                    <div className="p-2 rounded-xl bg-white/60 dark:bg-zinc-900/60 border border-black/5 dark:border-white/5">
                      <span className="text-[10px] text-zinc-400 block font-mono">RADIO SAVING</span>
                      <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 font-mono">
                        {meshState.powerSavingsPercent}%
                      </span>
                    </div>
                  </div>
                </div>

                {/* Offline Simulation & Cloud Sync Card */}
                <div className="p-3.5 rounded-2xl bg-zinc-100 dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 block">
                        Simulate Wilderness Offline
                      </span>
                      <p className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-tight mt-0.5">
                        Test Bluetooth mesh fallback and auto-sync without airplane mode
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => setSimulatedOffline(!meshState.isOnline ? false : true)}
                      className={`text-xs px-3 py-1 rounded-full font-medium transition-colors cursor-pointer ${
                        !meshState.isOnline
                          ? 'bg-amber-500 text-zinc-950 font-semibold shadow-xs'
                          : 'bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300'
                      }`}
                    >
                      {!meshState.isOnline ? 'Offline Mode Active' : 'Online Mode'}
                    </button>
                  </div>

                  <div className="pt-2 border-t border-black/5 dark:border-white/5 flex items-center justify-between gap-2">
                    <div className="text-[10.5px] font-mono text-zinc-500 dark:text-zinc-400">
                      <span>Relayed Packets: {meshState.relayedPacketsCount}</span>
                      <span className="mx-1.5">•</span>
                      <span>Queued: {meshState.queuedMessagesCount}</span>
                    </div>

                    <button
                      type="button"
                      disabled={isSyncing}
                      onClick={handleManualSync}
                      className="px-3 py-1 bg-zinc-950 dark:bg-zinc-100 text-zinc-50 dark:text-zinc-950 rounded-xl text-xs font-medium flex items-center gap-1.5 hover:opacity-90 transition-opacity disabled:opacity-50 cursor-pointer"
                    >
                      <IconRotateCcw className={`w-3 h-3 ${isSyncing ? 'animate-spin' : ''}`} />
                      <span>{isSyncing ? 'Syncing...' : 'Sync Now'}</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: OFFLINE OUTGOING QUEUE */}
            {activeTab === 'queue' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between px-1">
                  <span className="text-[10.5px] font-mono uppercase tracking-wider text-zinc-400 font-semibold">
                    Outgoing Messages Buffer ({meshState.queuedMessages.length})
                  </span>
                  {meshState.queuedMessagesCount > 0 && (
                    <button
                      type="button"
                      onClick={handleManualSync}
                      disabled={isSyncing}
                      className="text-[11px] text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <IconRotateCcw className={`w-3 h-3 ${isSyncing ? 'animate-spin' : ''}`} />
                      <span>Sync All To Cloud</span>
                    </button>
                  )}
                </div>

                {meshState.queuedMessages.length === 0 ? (
                  <div className="p-8 text-center rounded-2xl border border-dashed border-zinc-200 dark:border-zinc-800 text-zinc-400 space-y-1">
                    <IconCheckDouble className="w-6 h-6 mx-auto text-emerald-500 mb-2" />
                    <p className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
                      Queue is completely empty
                    </p>
                    <p className="text-[11px]">
                      All messages are synchronized via Internet or delivered via mesh.
                    </p>
                  </div>
                ) : (
                  <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 divide-y divide-zinc-100 dark:divide-zinc-800/80 bg-zinc-50/50 dark:bg-zinc-900/40 overflow-hidden">
                    {meshState.queuedMessages.map((msg) => (
                      <div key={msg.id} className="p-3 space-y-1.5">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5 font-medium text-zinc-900 dark:text-zinc-100">
                            <span>To: {msg.recipientName}</span>
                            <span
                              className={`text-[9px] font-mono px-1.5 py-0.2 rounded-full font-medium ${
                                msg.status === 'synced'
                                  ? 'bg-sky-500/15 text-sky-600 dark:text-sky-400'
                                  : msg.status === 'relaying'
                                  ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                                  : 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
                              }`}
                            >
                              {msg.status.toUpperCase()}
                            </span>
                          </div>
                          <span className="text-[10px] font-mono text-zinc-400">{msg.timeLabel}</span>
                        </div>

                        <p className="text-xs text-zinc-600 dark:text-zinc-300 italic line-clamp-1">
                          "{msg.text}"
                        </p>

                        <div className="flex items-center justify-between text-[10px] font-mono text-zinc-400 pt-1">
                          <span>Target: {msg.transportTarget.toUpperCase()}</span>
                          <div className="flex items-center gap-2">
                            {msg.status === 'queued' && (
                              <button
                                type="button"
                                onClick={handleManualSync}
                                className="text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer"
                              >
                                Sync Now
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => removeQueuedMessage(msg.id)}
                              className="text-zinc-400 hover:text-red-500 cursor-pointer"
                            >
                              Discard
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* TAB 3: STORE-AND-FORWARD RELAY CUSTODY */}
            {activeTab === 'custody' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between px-1">
                  <span className="text-[10.5px] font-mono uppercase tracking-wider text-zinc-400 font-semibold">
                    Encrypted Relay Custody ({meshState.custodyPackets.length})
                  </span>
                  <span className="text-[10px] text-zinc-400 font-mono">Zero-Knowledge Relaying</span>
                </div>

                <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-[11px] text-emerald-700 dark:text-emerald-300 leading-relaxed">
                  <span className="font-semibold block mb-0.5">Secure Store-and-Forward Protocol:</span>
                  These encrypted packets are carried by your device on behalf of nearby AMONG users. They are encrypted end-to-end with the recipient's public key—your device cannot read the plaintext, only carry and forward until an Internet gateway or recipient is encountered.
                </div>

                <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 divide-y divide-zinc-100 dark:divide-zinc-800/80 bg-zinc-50/50 dark:bg-zinc-900/40 overflow-hidden">
                  {meshState.custodyPackets.map((pkt) => (
                    <div key={pkt.packetId} className="p-3 space-y-2">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-1.5 font-medium text-zinc-900 dark:text-zinc-100">
                            <span>{pkt.sourceName}</span>
                            <IconArrowRight className="w-3 h-3 text-zinc-400" />
                            <span>{pkt.targetName}</span>
                          </div>
                          <span className="text-[10px] font-mono text-zinc-400 block mt-0.5">
                            ID: {pkt.packetId} · Cipher: {pkt.ciphertextEnvelope.cipher}
                          </span>
                        </div>

                        <span
                          className={`text-[9px] font-mono px-1.5 py-0.2 rounded-full font-medium ${
                            pkt.status === 'synced-to-cloud'
                              ? 'bg-sky-500/15 text-sky-600 dark:text-sky-400'
                              : pkt.status === 'relaying'
                              ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                              : 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
                          }`}
                        >
                          {pkt.status.toUpperCase()}
                        </span>
                      </div>

                      <div className="p-2 rounded-xl bg-zinc-100 dark:bg-zinc-900 border border-black/5 dark:border-white/5 font-mono text-[10px] space-y-1">
                        <div className="text-zinc-500 dark:text-zinc-400">
                          Route: {pkt.custodyChain.join(' → ')}
                        </div>
                        <div className="text-zinc-400 truncate">
                          Digest: {pkt.ciphertextEnvelope.sha256Digest}
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-[10.5px] font-mono text-zinc-500 dark:text-zinc-400 pt-0.5">
                        <span>Hops: {pkt.hops} / {pkt.maxHops} (TTL)</span>
                        {pkt.status !== 'synced-to-cloud' && (
                          <button
                            type="button"
                            onClick={() => handleRelayHop(pkt.packetId)}
                            className="text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1 cursor-pointer"
                          >
                            <IconForward className="w-3 h-3" />
                            <span>Relay to Peer</span>
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* TAB 4: NEARBY NODES */}
            {activeTab === 'peers' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between px-1">
                  <span className="text-[10.5px] font-mono uppercase tracking-wider text-zinc-400 font-semibold">
                    Nearby Radio Mesh Nodes ({meshState.nearbyPeers.length})
                  </span>
                  <button
                    type="button"
                    onClick={() => triggerManualDiscoveryScan()}
                    className="text-[11px] text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <IconRotateCcw className="w-3 h-3" />
                    <span>Scan Now</span>
                  </button>
                </div>

                <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 divide-y divide-zinc-100 dark:divide-zinc-800/80 bg-zinc-50/50 dark:bg-zinc-900/40 overflow-hidden">
                  {meshState.nearbyPeers.map((peer) => (
                    <div key={peer.id} className="p-3 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-8 h-8 rounded-xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center shrink-0">
                          {peer.transport === 'bluetooth-le' ? (
                            <IconBluetooth className="w-4 h-4 text-zinc-600 dark:text-zinc-300" />
                          ) : (
                            <IconWifi className="w-4 h-4 text-zinc-600 dark:text-zinc-300" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="font-medium text-zinc-900 dark:text-zinc-100 truncate">
                              {peer.name}
                            </span>
                            {peer.isVerifiedNeighbor && (
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                            )}
                          </div>
                          <span className="text-[10px] text-zinc-400 font-mono block">
                            @{peer.username} · {peer.hops === 1 ? '1 hop (Direct Peer)' : `${peer.hops} hops (Relay Route)`}
                          </span>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="text-[11px] font-mono text-zinc-700 dark:text-zinc-300 block font-medium">
                          {peer.rssi} dBm
                        </span>
                        {peer.batteryLevel && (
                          <span className="text-[10px] font-mono text-zinc-400">
                            {peer.batteryLevel}% bat · ~{peer.distanceMeters || 8}m
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-4 py-3 border-t border-zinc-100 dark:border-zinc-850 bg-zinc-50/50 dark:bg-zinc-900/50 flex items-center justify-between">
            <span className="text-[10.5px] font-mono text-zinc-400">
              Last Scan: {meshState.lastScanTimestamp ? new Date(meshState.lastScanTimestamp).toLocaleTimeString() : 'Active'}
            </span>

            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 rounded-xl bg-zinc-950 hover:bg-zinc-850 dark:bg-zinc-100 dark:hover:bg-white text-zinc-50 dark:text-zinc-950 text-xs font-semibold transition-colors cursor-pointer"
            >
              Done
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
