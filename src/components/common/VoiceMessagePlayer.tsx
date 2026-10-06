import React, { useState, useRef, useEffect } from 'react';
import { IconPlay, IconPause } from './Icons';

interface VoiceMessagePlayerProps {
  audioUrl?: string;
  duration?: number; // duration in seconds
  waveformData?: number[];
  isSent?: boolean;
}

// Generate default waveform heights if none provided
const DEFAULT_WAVEFORM = [
  0.25, 0.4, 0.65, 0.9, 0.55, 0.35, 0.7, 0.85, 0.45, 0.3, 0.6, 0.95,
  0.8, 0.5, 0.3, 0.65, 0.85, 0.4, 0.25, 0.55, 0.75, 0.6, 0.35, 0.2,
];

export function VoiceMessagePlayer({
  audioUrl,
  duration = 5,
  waveformData = DEFAULT_WAVEFORM,
  isSent = false,
}: VoiceMessagePlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackTime, setPlaybackTime] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const timerRef = useRef<number | null>(null);
  const synthCtxRef = useRef<AudioContext | null>(null);

  const totalDuration = Math.max(duration, 1);
  const progressRatio = Math.min(playbackTime / totalDuration, 1);

  // Play synthesized gentle warm tone if no real audio file or if audioUrl fails
  const playSynthesizedVoiceTone = () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;

      const ctx = new AudioCtx();
      synthCtxRef.current = ctx;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      // Warm, relaxing frequency ~320Hz to 440Hz gently modulated
      osc.frequency.setValueAtTime(320, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + totalDuration * 0.4);
      osc.frequency.exponentialRampToValueAtTime(280, ctx.currentTime + totalDuration);

      gain.gain.setValueAtTime(0.001, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.08, ctx.currentTime + 0.1);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + totalDuration);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + totalDuration);
    } catch {
      // AudioContext unavailable or blocked
    }
  };

  const handleTogglePlay = () => {
    if (isPlaying) {
      // Pause
      if (audioRef.current) {
        audioRef.current.pause();
      }
      if (synthCtxRef.current) {
        try {
          synthCtxRef.current.close();
        } catch {}
        synthCtxRef.current = null;
      }
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      setIsPlaying(false);
    } else {
      // Start playback
      setIsPlaying(true);

      if (audioUrl) {
        if (!audioRef.current) {
          const audio = new Audio(audioUrl);
          audioRef.current = audio;

          audio.onended = () => {
            setIsPlaying(false);
            setPlaybackTime(0);
            if (timerRef.current) clearInterval(timerRef.current);
          };

          audio.ontimeupdate = () => {
            setPlaybackTime(audio.currentTime);
          };

          audio.onerror = () => {
            // Fallback to simulated synthesized tone
            playSynthesizedVoiceTone();
          };
        }

        audioRef.current.currentTime = playbackTime >= totalDuration ? 0 : playbackTime;
        audioRef.current.play().catch(() => {
          playSynthesizedVoiceTone();
        });
      } else {
        playSynthesizedVoiceTone();
      }

      // Interval ticker for smooth progress update
      const startTime = Date.now() - playbackTime * 1000;
      timerRef.current = window.setInterval(() => {
        const elapsed = (Date.now() - startTime) / 1000;
        if (elapsed >= totalDuration) {
          setIsPlaying(false);
          setPlaybackTime(0);
          if (timerRef.current) clearInterval(timerRef.current);
        } else {
          setPlaybackTime(elapsed);
        }
      }, 100);
    }
  };

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      if (synthCtxRef.current) {
        try {
          synthCtxRef.current.close();
        } catch {}
        synthCtxRef.current = null;
      }
    };
  }, []);

  const formatSecs = (sec: number) => {
    const s = Math.floor(sec);
    const m = Math.floor(s / 60);
    const rem = s % 60;
    return `${m}:${rem.toString().padStart(2, '0')}`;
  };

  const currentDisplayTime = isPlaying
    ? formatSecs(playbackTime)
    : formatSecs(totalDuration);

  return (
    <div className="flex items-center gap-3 py-1 select-none w-full max-w-[240px]">
      {/* Play/Pause Button */}
      <button
        type="button"
        onClick={handleTogglePlay}
        className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 cursor-pointer transition-transform active:scale-95 shadow-2xs ${
          isSent
            ? 'bg-zinc-100 text-zinc-900 hover:bg-white dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800'
            : 'bg-zinc-900 text-zinc-100 hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white'
        }`}
        aria-label={isPlaying ? 'Pause audio message' : 'Play audio message'}
      >
        {isPlaying ? (
          <IconPause className="w-3.5 h-3.5 fill-current" />
        ) : (
          <IconPlay className="w-3.5 h-3.5 fill-current ml-0.5" />
        )}
      </button>

      {/* Waveform Visualization & Duration */}
      <div className="flex-1 flex flex-col justify-center min-w-0">
        <div className="flex items-center gap-0.5 h-5 w-full">
          {waveformData.map((heightNorm, i) => {
            const barProgress = i / waveformData.length;
            const isPlayed = barProgress <= progressRatio;
            const barHeight = Math.max(3, Math.round(heightNorm * 18));

            return (
              <span
                key={i}
                style={{ height: `${barHeight}px` }}
                className={`w-[2.5px] rounded-full transition-colors duration-150 ${
                  isPlayed
                    ? isSent
                      ? 'bg-zinc-100 dark:bg-zinc-900'
                      : 'bg-zinc-900 dark:bg-zinc-100'
                    : isSent
                    ? 'bg-zinc-500/60 dark:bg-zinc-400'
                    : 'bg-zinc-400 dark:bg-zinc-600'
                }`}
              />
            );
          })}
        </div>

        {/* Timestamp / Elapsed */}
        <div className="flex items-center justify-between mt-1 text-[10px] font-mono tabular-nums leading-none">
          <span
            className={
              isPlaying
                ? isSent
                  ? 'text-zinc-100 dark:text-zinc-900 font-medium'
                  : 'text-zinc-900 dark:text-zinc-100 font-medium'
                : isSent
                ? 'text-zinc-300 dark:text-zinc-600'
                : 'text-zinc-600 dark:text-zinc-300'
            }
          >
            {currentDisplayTime}
          </span>
          <span
            className={`text-[9.5px] uppercase tracking-wider ${
              isSent
                ? 'text-zinc-400 dark:text-zinc-600'
                : 'text-zinc-500 dark:text-zinc-400'
            }`}
          >
            Voice Note
          </span>
        </div>
      </div>
    </div>
  );
}
