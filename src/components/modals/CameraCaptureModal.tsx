import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  IconCamera,
  IconSwitchCamera,
  IconClose,
  IconLock,
  IconSecurity,
  IconHourglass,
  IconCheck,
  IconGallery,
  IconSend,
  IconAlert,
  IconFeather,
} from '../common/Icons';
import { DisappearingTimerOption } from '../../types';
import { DISAPPEARING_TIMER_CONFIGS } from './DisappearingTimerModal';

export interface CapturedPhotoData {
  dataUrl: string;
  caption?: string;
  stripExif: boolean;
  timerOption: DisappearingTimerOption;
  source: 'camera' | 'library';
  fileSizeBytes: number;
}

interface CameraCaptureModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSendPhoto: (data: CapturedPhotoData) => void;
  defaultTimerOption?: DisappearingTimerOption;
  personName: string;
}

export const CameraCaptureModal: React.FC<CameraCaptureModalProps> = ({
  isOpen,
  onClose,
  onSendPhoto,
  defaultTimerOption = 'off',
  personName,
}) => {
  const [modalMode, setModalMode] = useState<'viewfinder' | 'review'>('viewfinder');
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isStartingCamera, setIsStartingCamera] = useState(false);
  const [shutterFlash, setShutterFlash] = useState(false);

  // Review screen state
  const [capturedPhotoUrl, setCapturedPhotoUrl] = useState<string | null>(null);
  const [capturedSource, setCapturedSource] = useState<'camera' | 'library'>('camera');
  const [caption, setCaption] = useState('');
  const [stripExif, setStripExif] = useState(true);
  const [selectedTimer, setSelectedTimer] = useState<DisappearingTimerOption>(defaultTimerOption);
  const [approxSizeBytes, setApproxSizeBytes] = useState(0);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileFallbackRef = useRef<HTMLInputElement | null>(null);

  // Clean up any running media streams
  const stopStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch {}
      });
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  // Start the device camera stream
  const startCamera = useCallback(async (facing: 'environment' | 'user') => {
    stopStream();
    setCameraError(null);
    setIsStartingCamera(true);

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setCameraError('Camera API not accessible in this browser context.');
      setIsStartingCamera(false);
      return;
    }

    try {
      // Primary attempt: requested facingMode and clean quiet resolution
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: facing },
          width: { ideal: 1280 },
          height: { ideal: 960 },
        },
        audio: false,
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setIsStartingCamera(false);
    } catch (err: any) {
      console.warn('Initial camera constraint failed, attempting basic stream fallback:', err);
      try {
        // Fallback attempt: any video stream
        const fallbackStream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false,
        });
        streamRef.current = fallbackStream;
        if (videoRef.current) {
          videoRef.current.srcObject = fallbackStream;
          await videoRef.current.play();
        }
        setIsStartingCamera(false);
      } catch (fallbackErr: any) {
        console.error('All camera attempts failed:', fallbackErr);
        setIsStartingCamera(false);
        if (fallbackErr.name === 'NotAllowedError' || fallbackErr.name === 'PermissionDeniedError') {
          setCameraError('Camera access permission was declined. You can take a photo via system upload below.');
        } else {
          setCameraError('Could not start video sensor. You can snap a photo directly using the button below.');
        }
      }
    }
  }, [stopStream]);

  // Handle modal opening/closing lifecycle
  useEffect(() => {
    if (isOpen) {
      setModalMode('viewfinder');
      setCapturedPhotoUrl(null);
      setCaption('');
      setStripExif(true);
      setSelectedTimer(defaultTimerOption);
      startCamera(facingMode);
    } else {
      stopStream();
      setCapturedPhotoUrl(null);
      setCameraError(null);
    }
    return () => {
      stopStream();
    };
  }, [isOpen, startCamera, stopStream, facingMode, defaultTimerOption]);

  // Switch camera front/back
  const handleToggleFacingMode = () => {
    const nextFacing = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(nextFacing);
    startCamera(nextFacing);
  };

  // Capture current frame from video stream
  const handleSnapShutter = () => {
    if (!videoRef.current || !canvasRef.current) return;

    // Trigger visual shutter flash
    setShutterFlash(true);
    setTimeout(() => setShutterFlash(false), 220);

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const vWidth = video.videoWidth || 1280;
    const vHeight = video.videoHeight || 960;

    // Constrain max dimension to 1600px for pristine cryptographic performance
    const maxDim = 1600;
    let targetWidth = vWidth;
    let targetHeight = vHeight;
    if (targetWidth > maxDim || targetHeight > maxDim) {
      if (targetWidth > targetHeight) {
        targetHeight = Math.round((targetHeight * maxDim) / targetWidth);
        targetWidth = maxDim;
      } else {
        targetWidth = Math.round((targetWidth * maxDim) / targetHeight);
        targetHeight = maxDim;
      }
    }

    canvas.width = targetWidth;
    canvas.height = targetHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // If front camera, mirror image for natural reflection
    if (facingMode === 'user') {
      ctx.translate(targetWidth, 0);
      ctx.scale(-1, 1);
    }

    ctx.drawImage(video, 0, 0, targetWidth, targetHeight);

    // Canvas re-encoding scrubs binary EXIF / location header markers
    const dataUrl = canvas.toDataURL('image/jpeg', 0.88);
    const approxBytes = Math.round((dataUrl.length * 3) / 4);

    stopStream();
    setCapturedPhotoUrl(dataUrl);
    setCapturedSource('camera');
    setApproxSizeBytes(approxBytes);
    setModalMode('review');
  };

  // Fallback system file selection / camera capture
  const handleFallbackFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        const url = reader.result;
        setCapturedPhotoUrl(url);
        setCapturedSource('library');
        setApproxSizeBytes(file.size);
        stopStream();
        setModalMode('review');
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // Retake photo: discard memory and re-open viewfinder
  const handleRetake = () => {
    setCapturedPhotoUrl(null);
    setModalMode('viewfinder');
    startCamera(facingMode);
  };

  // Final dispatch: send encrypted photo
  const handleConfirmSend = () => {
    if (!capturedPhotoUrl) return;

    onSendPhoto({
      dataUrl: capturedPhotoUrl,
      caption: caption.trim() || undefined,
      stripExif,
      timerOption: selectedTimer,
      source: capturedSource,
      fileSizeBytes: approxSizeBytes,
    });

    onClose();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div
        className="fixed inset-0 z-60 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md select-none"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.94, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: 10 }}
          transition={{ type: 'spring', damping: 28, stiffness: 380 }}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-md rounded-2xl bg-zinc-950 border border-zinc-800 shadow-2xl overflow-hidden flex flex-col max-h-[92vh] text-white"
        >
          {/* Header Bar */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-850 bg-zinc-900/60 backdrop-blur-md">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-zinc-800 flex items-center justify-center text-zinc-300">
                <IconCamera className="w-4 h-4 text-emerald-400" />
              </div>
              <div>
                <h3 className="text-xs font-semibold tracking-tight text-zinc-100 flex items-center gap-1.5">
                  <span>{modalMode === 'viewfinder' ? 'Quiet Lens · Live Camera' : 'Review & Encrypt'}</span>
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                </h3>
                <p className="text-[10px] text-zinc-400 font-mono">
                  {modalMode === 'viewfinder'
                    ? 'Isolated hardware feed · Zero cloud telemetry'
                    : `To: ${personName}`}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer"
              aria-label="Close camera modal"
            >
              <IconClose className="w-4 h-4" />
            </button>
          </div>

          {/* Modal Body */}
          {modalMode === 'viewfinder' ? (
            <div className="flex flex-col flex-1 overflow-hidden">
              {/* Viewfinder Window */}
              <div className="relative bg-black aspect-4/3 sm:aspect-4/3 w-full flex items-center justify-center overflow-hidden">
                {/* Live Video Feed */}
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className={`w-full h-full object-cover transition-transform duration-300 ${
                    facingMode === 'user' ? 'scale-x-[-1]' : ''
                  }`}
                />
                <canvas ref={canvasRef} className="hidden" />

                {/* Shutter Flash Animation Overlay */}
                <AnimatePresence>
                  {shutterFlash && (
                    <motion.div
                      initial={{ opacity: 0.9 }}
                      animate={{ opacity: 0 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="absolute inset-0 bg-white z-20 pointer-events-none"
                    />
                  )}
                </AnimatePresence>

                {/* Starting / Loading Overlay - Skeleton Viewfinder */}
                {isStartingCamera && !cameraError && (
                  <div className="absolute inset-0 bg-zinc-950 flex flex-col items-center justify-center gap-3 text-zinc-400 z-10 p-6 select-none animate-pulse">
                    <div className="relative w-24 h-24 rounded-2xl border-2 border-dashed border-zinc-700/60 flex items-center justify-center overflow-hidden">
                      <div className="w-12 h-12 rounded-full bg-zinc-800/80 animate-ping opacity-25" />
                      <div className="w-10 h-10 rounded-full bg-zinc-850 border border-zinc-700/80 flex items-center justify-center">
                        <div className="w-3.5 h-3.5 rounded-full bg-emerald-500/40" />
                      </div>
                    </div>
                    <div className="space-y-1.5 flex flex-col items-center">
                      <div className="w-24 h-2.5 rounded-full bg-zinc-800 animate-pulse" />
                      <span className="text-[11px] font-mono text-zinc-500">
                        Initializing hardware sensor…
                      </span>
                    </div>
                  </div>
                )}

                {/* Camera Permission or Hardware Error */}
                {cameraError && (
                  <div className="absolute inset-0 bg-zinc-950/95 p-6 flex flex-col items-center justify-center text-center gap-3 z-10">
                    <div className="w-10 h-10 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                      <IconAlert className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-zinc-200 mb-1">
                        Direct Camera Access Unavailable
                      </p>
                      <p className="text-[11px] text-zinc-400 max-w-xs leading-relaxed">
                        {cameraError}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => fileFallbackRef.current?.click()}
                      className="mt-1 px-4 py-2 rounded-xl bg-zinc-100 hover:bg-white text-zinc-950 font-semibold text-xs transition-colors cursor-pointer flex items-center gap-1.5 shadow-lg"
                    >
                      <IconCamera className="w-3.5 h-3.5 text-zinc-900" />
                      <span>Take Photo via Device Camera</span>
                    </button>
                  </div>
                )}

                {/* Serene Viewfinder HUD Overlay */}
                {!cameraError && (
                  <div className="absolute inset-3 border border-white/15 rounded-xl pointer-events-none flex flex-col justify-between p-2.5 z-10">
                    <div className="flex items-center justify-between text-white/50 text-[9.5px] font-mono tracking-wider">
                      <span className="flex items-center gap-1">
                        <IconLock className="w-2.5 h-2.5 text-emerald-400" />
                        AES-256 RAW
                      </span>
                      <span>{facingMode === 'environment' ? 'BACK LENS' : 'FRONT LENS'}</span>
                    </div>

                    {/* Subtle Rule of Thirds Center Target */}
                    <div className="flex items-center justify-center">
                      <div className="w-10 h-10 border border-white/25 rounded-full flex items-center justify-center">
                        <div className="w-1 h-1 bg-emerald-400/80 rounded-full" />
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-white/50 text-[9.5px] font-mono tracking-wider">
                      <span>SERENE SANCTUARY</span>
                      <span>F/2.0 · E2EE</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Viewfinder Bottom Control Console */}
              <div className="p-4 bg-zinc-950 border-t border-zinc-850 flex items-center justify-between">
                {/* Switch Camera (Front/Back) */}
                <button
                  type="button"
                  onClick={handleToggleFacingMode}
                  disabled={Boolean(cameraError)}
                  className="w-10 h-10 rounded-full bg-zinc-850 hover:bg-zinc-800 text-zinc-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer disabled:opacity-30 disabled:pointer-events-none"
                  title="Switch between front and rear camera"
                  aria-label="Switch camera lens"
                >
                  <IconSwitchCamera className="w-4 h-4" />
                </button>

                {/* Tactile Shutter Button */}
                <button
                  type="button"
                  onClick={handleSnapShutter}
                  disabled={isStartingCamera || Boolean(cameraError)}
                  className="w-16 h-16 rounded-full border-4 border-white/30 hover:border-white/70 flex items-center justify-center cursor-pointer transition-all active:scale-90 group disabled:opacity-40 disabled:pointer-events-none shadow-xl"
                  title="Capture photo quietly"
                  aria-label="Shutter capture"
                >
                  <div className="w-11 h-11 rounded-full bg-white group-hover:bg-zinc-200 transition-colors shadow-inner" />
                </button>

                {/* Gallery / Fallback File Upload */}
                <button
                  type="button"
                  onClick={() => fileFallbackRef.current?.click()}
                  className="w-10 h-10 rounded-full bg-zinc-850 hover:bg-zinc-800 text-zinc-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
                  title="Choose existing photo from device library"
                  aria-label="Open photo library"
                >
                  <IconGallery className="w-4 h-4" />
                </button>
              </div>

              {/* Privacy Footer Banner */}
              <div className="px-4 py-2 bg-zinc-900/60 border-t border-zinc-850/80 flex items-center justify-between text-[10px] text-zinc-400 font-mono">
                <span className="flex items-center gap-1.5 text-emerald-400">
                  <IconSecurity className="w-3 h-3" />
                  No server storage
                </span>
                <span>Encrypted on device</span>
              </div>
            </div>
          ) : (
            /* Review & Encrypt Screen */
            <div className="flex flex-col flex-1 overflow-y-auto">
              {/* Photo Preview Canvas Card */}
              <div className="relative bg-zinc-900 p-3 flex items-center justify-center border-b border-zinc-850">
                {capturedPhotoUrl && (
                  <div className="relative max-h-56 sm:max-h-64 w-full flex items-center justify-center overflow-hidden rounded-xl border border-white/10 shadow-lg bg-black">
                    <img
                      src={capturedPhotoUrl}
                      alt="Captured snapshot preview"
                      className="max-h-56 sm:max-h-64 w-full object-contain"
                    />

                    {/* Encrypted assurance pill */}
                    <div className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-black/70 backdrop-blur-md border border-white/15 text-[10px] font-mono text-emerald-400 flex items-center gap-1">
                      <IconLock className="w-2.5 h-2.5" />
                      <span>Ready for AES-256-GCM</span>
                    </div>

                    {/* Source tag */}
                    <div className="absolute bottom-2 right-2 px-2 py-0.5 rounded-full bg-black/70 backdrop-blur-md border border-white/10 text-[9.5px] font-mono text-zinc-400">
                      {capturedSource === 'camera' ? 'Camera Snapshot' : 'Device Photo'}
                    </div>
                  </div>
                )}
              </div>

              {/* Options & Privacy Settings */}
              <div className="p-4 space-y-3.5 text-left text-xs">
                {/* Caption Input */}
                <div>
                  <label className="block text-[11px] font-medium text-zinc-300 mb-1">
                    Quiet Caption (Optional)
                  </label>
                  <input
                    type="text"
                    value={caption}
                    onChange={(e) => setCaption(e.target.value)}
                    placeholder="Add a quiet note with this photo..."
                    className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-100 placeholder:text-zinc-500 text-xs focus:outline-none focus:border-zinc-600 transition-colors"
                  />
                </div>

                {/* Privacy Sanitization Card: EXIF Strip */}
                <div className="p-3 rounded-xl bg-zinc-900 border border-zinc-800 flex items-start justify-between gap-3">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-1.5 font-medium text-zinc-200">
                      <IconFeather className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Sanitize & Strip EXIF Data</span>
                    </div>
                    <p className="text-[11px] text-zinc-400 leading-snug">
                      Removes GPS coordinates, device serial, and camera hardware fingerprint before
                      encrypting.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => setStripExif(!stripExif)}
                    className={`w-10 h-5.5 rounded-full transition-colors p-0.5 relative cursor-pointer shrink-0 ${
                      stripExif ? 'bg-emerald-500' : 'bg-zinc-700'
                    }`}
                    aria-label="Toggle EXIF metadata strip"
                  >
                    <div
                      className={`w-4.5 h-4.5 rounded-full bg-white transition-transform ${
                        stripExif ? 'translate-x-4.5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                {/* Ephemeral Disappearing Whisper Selector */}
                <div className="p-3 rounded-xl bg-zinc-900 border border-zinc-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 font-medium text-zinc-200">
                      <IconHourglass className="w-3.5 h-3.5 text-amber-400" />
                      <span>Disappearing Media Lifespan</span>
                    </div>
                    <span className="text-[10px] font-mono text-amber-400">
                      {selectedTimer === 'off' ? 'Permanent' : `Auto-deletes`}
                    </span>
                  </div>

                  <div className="grid grid-cols-4 gap-1.5">
                    {[
                      { opt: 'off' as DisappearingTimerOption, label: 'Keep' },
                      { opt: '30s' as DisappearingTimerOption, label: '30s' },
                      { opt: '5m' as DisappearingTimerOption, label: '5m' },
                      { opt: '24h' as DisappearingTimerOption, label: '24h' },
                    ].map((item) => {
                      const isSelected = selectedTimer === item.opt;
                      return (
                        <button
                          key={item.opt}
                          type="button"
                          onClick={() => setSelectedTimer(item.opt)}
                          className={`py-1.5 px-2 rounded-lg text-center text-[11px] font-mono transition-colors cursor-pointer border ${
                            isSelected
                              ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 font-semibold'
                              : 'bg-zinc-850 hover:bg-zinc-800 text-zinc-400 border-transparent'
                          }`}
                        >
                          {item.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Cryptographic Assurance Details */}
                <div className="p-2.5 rounded-xl bg-zinc-900/60 border border-zinc-850 text-[10.5px] text-zinc-400 font-mono space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-zinc-500">CIPHER:</span>
                    <span className="text-zinc-300">AES-256-GCM (128-bit MAC)</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-zinc-500">AUTHENTICATION:</span>
                    <span className="text-emerald-400">Client-Side Authenticated</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-zinc-500">ROUTING:</span>
                    <span className="text-zinc-300">Zero Unencrypted Relay</span>
                  </div>
                </div>
              </div>

              {/* Review Bottom Actions */}
              <div className="p-4 border-t border-zinc-850 bg-zinc-950 flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={handleRetake}
                  className="px-4 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-850 text-zinc-300 hover:text-white text-xs font-medium transition-colors cursor-pointer"
                >
                  Retake Photo
                </button>

                <button
                  type="button"
                  onClick={handleConfirmSend}
                  className="px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-semibold text-xs transition-colors cursor-pointer flex items-center gap-1.5 shadow-lg shadow-emerald-500/20"
                >
                  <IconLock className="w-3.5 h-3.5 text-zinc-950" />
                  <span>Send Encrypted Photo</span>
                </button>
              </div>
            </div>
          )}

          {/* Hidden HTML5 File fallback input for system camera & gallery */}
          <input
            ref={fileFallbackRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={handleFallbackFile}
          />
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
