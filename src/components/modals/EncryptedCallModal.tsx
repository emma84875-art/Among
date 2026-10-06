import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Person } from '../../types';
import { Avatar } from '../ui/Avatar';
import {
  IconPhoneOff,
  IconMic,
  IconMicOff,
  IconSecurity,
  IconVolume,
  IconVolumeMute,
  IconCheck,
} from '../common/Icons';

interface EncryptedCallModalProps {
  isOpen: boolean;
  person: Person;
  onClose: () => void;
  onCallEnded?: (durationSeconds: number) => void;
}

export const EncryptedCallModal: React.FC<EncryptedCallModalProps> = ({
  isOpen,
  person,
  onClose,
  onCallEnded,
}) => {
  const [callState, setCallState] = useState<'calling' | 'connected' | 'ended'>('calling');
  const [seconds, setSeconds] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeaker, setIsSpeaker] = useState(true);
  const [voiceWave, setVoiceWave] = useState<number[]>([0.3, 0.6, 0.4, 0.8, 0.5, 0.7, 0.3]);

  // Simulate call connection progression
  useEffect(() => {
    if (!isOpen) {
      setCallState('calling');
      setSeconds(0);
      return;
    }

    setCallState('calling');
    setSeconds(0);

    const connectTimeout = setTimeout(() => {
      setCallState('connected');
    }, 2800);

    return () => clearTimeout(connectTimeout);
  }, [isOpen]);

  // Live timer & audio level fluctuation when connected
  useEffect(() => {
    if (callState !== 'connected') return;

    const timerInterval = setInterval(() => {
      setSeconds((prev) => prev + 1);
    }, 1000);

    const waveInterval = setInterval(() => {
      setVoiceWave(
        Array.from({ length: 9 }, () =>
          Number((0.15 + Math.random() * 0.75).toFixed(2))
        )
      );
    }, 240);

    return () => {
      clearInterval(timerInterval);
      clearInterval(waveInterval);
    };
  }, [callState]);

  const handleEndCall = () => {
    setCallState('ended');
    const finalDuration = seconds;
    setTimeout(() => {
      onCallEnded?.(finalDuration);
      onClose();
    }, 800);
  };

  if (!isOpen) return null;

  const formatTimer = (totalSec: number) => {
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-70 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md select-none">
        <motion.div
          initial={{ opacity: 0, scale: 0.92, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.92, y: 16 }}
          transition={{ type: 'spring', damping: 26, stiffness: 350 }}
          className="relative w-full max-w-sm rounded-3xl bg-zinc-950 border border-zinc-800 text-zinc-100 p-6 flex flex-col items-center shadow-2xl overflow-hidden"
        >
          {/* Subtle Ambient Glow */}
          <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

          {/* Top Cryptographic Security Status */}
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-zinc-900 border border-emerald-500/30 text-emerald-400 text-[11px] font-mono mb-6 shadow-xs">
            <IconSecurity className="w-3.5 h-3.5" />
            <span>E2EE · DTLS-SRTP 256-bit</span>
          </div>

          {/* Contact Avatar with Animated Aura */}
          <div className="relative my-4 flex items-center justify-center">
            {callState === 'calling' && (
              <span className="absolute w-28 h-28 rounded-full border border-emerald-500/30 animate-ping opacity-60" />
            )}
            {callState === 'connected' && (
              <span className="absolute w-24 h-24 rounded-full bg-emerald-500/10 animate-pulse" />
            )}
            <Avatar
              name={person.name}
              gradient={person.avatarColor}
              initials={person.initials}
              size="xl"
            />
          </div>

          {/* Contact Name & Call State */}
          <h3 className="text-lg font-semibold text-white tracking-tight mt-2">
            {person.name}
          </h3>
          <p className="text-xs text-zinc-400 mt-0.5">
            {callState === 'calling'
              ? 'Establishing peer encryption…'
              : callState === 'connected'
              ? formatTimer(seconds)
              : 'Call Ended'}
          </p>

          {/* Verifiable Call Security Token */}
          <div className="mt-4 px-3 py-1 rounded-lg bg-zinc-900/80 border border-zinc-800/80 text-[10.5px] font-mono text-zinc-400 flex items-center gap-1.5">
            <IconCheck className="w-3 h-3 text-emerald-400" />
            <span>Peer verified: 8492 · 1928</span>
          </div>

          {/* Live Soundwave (during active call) */}
          {callState === 'connected' && (
            <div className="flex items-center gap-1 h-8 my-5">
              {voiceWave.map((h, i) => (
                <span
                  key={i}
                  style={{ height: `${Math.max(6, Math.round(h * 32))}px` }}
                  className="w-1 rounded-full bg-emerald-400/80 transition-all duration-150"
                />
              ))}
            </div>
          )}

          {callState === 'calling' && (
            <div className="h-8 my-5 flex items-center text-xs text-zinc-500">
              <span>Direct cryptographic handshake…</span>
            </div>
          )}

          {callState === 'ended' && (
            <div className="h-8 my-5 flex items-center text-xs text-zinc-500">
              <span>Sanctuary session closed</span>
            </div>
          )}

          {/* Call Controls */}
          <div className="flex items-center justify-center gap-5 mt-4 w-full">
            {/* Mute Button */}
            <button
              type="button"
              disabled={callState !== 'connected'}
              onClick={() => setIsMuted(!isMuted)}
              className={`p-3.5 rounded-full transition-colors cursor-pointer ${
                isMuted
                  ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
                  : 'bg-zinc-850 hover:bg-zinc-800 text-zinc-300 border border-zinc-700/60'
              } disabled:opacity-40 disabled:cursor-not-allowed`}
              title={isMuted ? 'Unmute microphone' : 'Mute microphone'}
            >
              {isMuted ? <IconMicOff className="w-5 h-5" /> : <IconMic className="w-5 h-5" />}
            </button>

            {/* End Call Button */}
            <button
              type="button"
              onClick={handleEndCall}
              className="p-4 rounded-full bg-rose-600 hover:bg-rose-700 text-white shadow-lg transition-transform active:scale-95 cursor-pointer"
              title="End encrypted call"
            >
              <IconPhoneOff className="w-6 h-6" />
            </button>

            {/* Speaker Toggle */}
            <button
              type="button"
              disabled={callState !== 'connected'}
              onClick={() => setIsSpeaker(!isSpeaker)}
              className={`p-3.5 rounded-full transition-colors cursor-pointer ${
                isSpeaker
                  ? 'bg-zinc-850 hover:bg-zinc-800 text-zinc-300 border border-zinc-700/60'
                  : 'bg-zinc-900 text-zinc-500 border border-zinc-800'
              } disabled:opacity-40 disabled:cursor-not-allowed`}
              title={isSpeaker ? 'Speaker active' : 'Speaker muted'}
            >
              {isSpeaker ? <IconVolume className="w-5 h-5" /> : <IconVolumeMute className="w-5 h-5" />}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
