import React, { useRef, useEffect, useState, useCallback } from "react";
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize2,
  RotateCcw,
  RotateCw,
  Film,
  Sparkles,
  Gauge,
  CheckCircle2,
  Youtube,
} from "lucide-react";
import { VideoState, FloatingReaction, Language } from "../types";
import { TRANSLATIONS } from "../utils/translations";
import { extractYouTubeId, loadYouTubeIFrameAPI } from "../utils/youtube";

interface SyncedPlayerProps {
  videoState: VideoState;
  onUpdateVideoState: (newState: Partial<VideoState>) => void;
  floatingReactions: FloatingReaction[];
  onTriggerReaction: (emoji: string) => void;
  language: Language;
  onOpenMovieSelector: () => void;
  isHost: boolean;
}

export const SyncedPlayer: React.FC<SyncedPlayerProps> = ({
  videoState,
  onUpdateVideoState,
  floatingReactions,
  onTriggerReaction,
  language,
  onOpenMovieSelector,
}) => {
  const t = TRANSLATIONS[language];
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const ytPlayerRef = useRef<any>(null);
  const ytContainerRef = useRef<HTMLDivElement | null>(null);

  const [isPlaying, setIsPlaying] = useState<boolean>(videoState.isPlaying);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [volume, setVolume] = useState<number>(0.9);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);
  const [, setIsFullscreen] = useState<boolean>(false);
  const [showControls, setShowControls] = useState<boolean>(true);
  const [driftMs, setDriftMs] = useState<number>(0);
  const [ytReady, setYtReady] = useState<boolean>(false);

  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isRemoteUpdatingRef = useRef<boolean>(false);
  const ytPollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const isYouTube = videoState.videoType === "youtube";
  const youtubeVideoId = videoState.youtubeId || (isYouTube ? extractYouTubeId(videoState.url) : null);

  // -------------------------------------------------------------
  // 1. YouTube Player Lifecycle & Synchronization
  // -------------------------------------------------------------
  useEffect(() => {
    if (!isYouTube || !youtubeVideoId) {
      if (ytPlayerRef.current) {
        try {
          ytPlayerRef.current.destroy();
        } catch {}
        ytPlayerRef.current = null;
        setYtReady(false);
      }
      return;
    }

    let isMounted = true;

    loadYouTubeIFrameAPI().then(() => {
      if (!isMounted || !ytContainerRef.current) return;

      // If player already exists and video ID changed
      if (ytPlayerRef.current && typeof ytPlayerRef.current.loadVideoById === "function") {
        try {
          ytPlayerRef.current.loadVideoById({
            videoId: youtubeVideoId,
            startSeconds: videoState.currentTime || 0,
          });
          if (!videoState.isPlaying) {
            ytPlayerRef.current.pauseVideo();
          }
        } catch (e) {
          console.warn("Error updating YouTube video ID:", e);
        }
        return;
      }

      // Create new YouTube player
      try {
        new (window as any).YT.Player(ytContainerRef.current, {
          videoId: youtubeVideoId,
          playerVars: {
            autoplay: videoState.isPlaying ? 1 : 0,
            controls: 1, // Keep native controls available
            disablekb: 0,
            enablejsapi: 1,
            fs: 0,
            iv_load_policy: 3,
            modestbranding: 1,
            rel: 0,
            start: Math.floor(videoState.currentTime || 0),
          },
          events: {
            onReady: (event: any) => {
              if (!isMounted) return;
              ytPlayerRef.current = event.target;
              setYtReady(true);
              const dur = event.target.getDuration();
              if (dur) setDuration(dur);
              event.target.setVolume(volume * 100);
              if (isMuted) event.target.mute();
              event.target.setPlaybackRate(videoState.playbackRate || 1);

              if (videoState.isPlaying) {
                event.target.playVideo();
                setIsPlaying(true);
              } else {
                event.target.pauseVideo();
                setIsPlaying(false);
              }
            },
            onStateChange: (event: any) => {
              if (!isMounted || isRemoteUpdatingRef.current) return;

              const YTState = (window as any).YT?.PlayerState;
              if (!YTState) return;

              if (event.data === YTState.PLAYING) {
                setIsPlaying(true);
                const curr = event.target.getCurrentTime() || 0;
                setCurrentTime(curr);
                onUpdateVideoState({
                  isPlaying: true,
                  currentTime: curr,
                });
              } else if (event.data === YTState.PAUSED) {
                setIsPlaying(false);
                const curr = event.target.getCurrentTime() || 0;
                setCurrentTime(curr);
                onUpdateVideoState({
                  isPlaying: false,
                  currentTime: curr,
                });
              } else if (event.data === YTState.ENDED) {
                setIsPlaying(false);
                onUpdateVideoState({
                  isPlaying: false,
                  currentTime: duration,
                });
              }
            },
          },
        });
      } catch (err) {
        console.error("Failed to initialize YouTube Player:", err);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [isYouTube, youtubeVideoId]);

  // YouTube Periodic Time & Duration Poller
  useEffect(() => {
    if (!isYouTube) {
      if (ytPollIntervalRef.current) clearInterval(ytPollIntervalRef.current);
      return;
    }

    ytPollIntervalRef.current = setInterval(() => {
      const yt = ytPlayerRef.current;
      if (yt && typeof yt.getCurrentTime === "function") {
        try {
          const curr = yt.getCurrentTime();
          const dur = yt.getDuration();
          if (curr !== undefined && !isNaN(curr)) {
            setCurrentTime(curr);
          }
          if (dur && !isNaN(dur) && dur > 0) {
            setDuration(dur);
          }
        } catch {}
      }
    }, 500);

    return () => {
      if (ytPollIntervalRef.current) clearInterval(ytPollIntervalRef.current);
    };
  }, [isYouTube]);

  // -------------------------------------------------------------
  // 2. Sync with incoming remote videoState
  // -------------------------------------------------------------
  useEffect(() => {
    isRemoteUpdatingRef.current = true;

    if (isYouTube && ytPlayerRef.current && ytReady) {
      const yt = ytPlayerRef.current;
      try {
        // Rate
        if (typeof yt.getPlaybackRate === "function" && yt.getPlaybackRate() !== videoState.playbackRate) {
          yt.setPlaybackRate(videoState.playbackRate);
          setPlaybackSpeed(videoState.playbackRate);
        }

        // Time sync & drift calculation
        const ytCurr = yt.getCurrentTime() || 0;
        const targetTime = videoState.currentTime;
        const diff = Math.abs(ytCurr - targetTime);
        setDriftMs(Math.round(diff * 1000));

        if (diff > 1.2 && typeof yt.seekTo === "function") {
          yt.seekTo(targetTime, true);
          setCurrentTime(targetTime);
        }

        // Play/Pause
        const ytState = yt.getPlayerState?.();
        const YTState = (window as any).YT?.PlayerState;
        if (YTState) {
          if (videoState.isPlaying && ytState !== YTState.PLAYING && ytState !== YTState.BUFFERING) {
            yt.playVideo();
            setIsPlaying(true);
          } else if (!videoState.isPlaying && ytState === YTState.PLAYING) {
            yt.pauseVideo();
            setIsPlaying(false);
          }
        }
      } catch (e) {
        console.warn("YouTube sync update error:", e);
      }
    } else if (!isYouTube) {
      const video = videoRef.current;
      if (!video) return;

      // Check URL change
      if (videoState.url && video.src !== videoState.url) {
        video.src = videoState.url;
        video.load();
      }

      // Playback rate
      if (video.playbackRate !== videoState.playbackRate) {
        video.playbackRate = videoState.playbackRate;
        setPlaybackSpeed(videoState.playbackRate);
      }

      // Drift calculation & seek sync
      const currentVideoTime = video.currentTime;
      const targetTime = videoState.currentTime;
      const diff = Math.abs(currentVideoTime - targetTime);
      setDriftMs(Math.round(diff * 1000));

      if (diff > 0.6) {
        video.currentTime = targetTime;
        setCurrentTime(targetTime);
      }

      // Play / Pause sync
      if (videoState.isPlaying && video.paused) {
        video.play().catch(() => {});
        setIsPlaying(true);
      } else if (!videoState.isPlaying && !video.paused) {
        video.pause();
        setIsPlaying(false);
      }
    }

    const timer = setTimeout(() => {
      isRemoteUpdatingRef.current = false;
    }, 250);

    return () => clearTimeout(timer);
  }, [videoState, isYouTube, ytReady]);

  // -------------------------------------------------------------
  // 3. User Interaction Handlers (Play, Pause, Seek, Skip, Volume)
  // -------------------------------------------------------------
  const handleTogglePlay = useCallback(() => {
    if (isYouTube && ytPlayerRef.current) {
      const yt = ytPlayerRef.current;
      try {
        const YTState = (window as any).YT?.PlayerState;
        const ytState = yt.getPlayerState?.();

        if (ytState === YTState?.PLAYING) {
          yt.pauseVideo();
          setIsPlaying(false);
          onUpdateVideoState({
            isPlaying: false,
            currentTime: yt.getCurrentTime() || currentTime,
          });
        } else {
          yt.playVideo();
          setIsPlaying(true);
          onUpdateVideoState({
            isPlaying: true,
            currentTime: yt.getCurrentTime() || currentTime,
          });
        }
      } catch (err) {
        console.warn("YouTube play/pause error:", err);
      }
      return;
    }

    const video = videoRef.current;
    if (!video) return;

    if (video.paused) {
      video.play().then(() => {
        setIsPlaying(true);
        onUpdateVideoState({
          isPlaying: true,
          currentTime: video.currentTime,
        });
      }).catch(console.warn);
    } else {
      video.pause();
      setIsPlaying(false);
      onUpdateVideoState({
        isPlaying: false,
        currentTime: video.currentTime,
      });
    }
  }, [isYouTube, currentTime, onUpdateVideoState]);

  const handleSeek = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const newTime = parseFloat(e.target.value);
      setCurrentTime(newTime);

      if (isYouTube && ytPlayerRef.current) {
        try {
          ytPlayerRef.current.seekTo(newTime, true);
          onUpdateVideoState({
            currentTime: newTime,
            isPlaying,
          });
        } catch {}
        return;
      }

      const video = videoRef.current;
      if (!video) return;

      video.currentTime = newTime;
      onUpdateVideoState({
        currentTime: newTime,
        isPlaying: !video.paused,
      });
    },
    [isYouTube, isPlaying, onUpdateVideoState]
  );

  const handleSkip = useCallback(
    (seconds: number) => {
      if (isYouTube && ytPlayerRef.current) {
        try {
          const curr = ytPlayerRef.current.getCurrentTime() || currentTime;
          const target = Math.max(0, Math.min(duration || 99999, curr + seconds));
          ytPlayerRef.current.seekTo(target, true);
          setCurrentTime(target);
          onUpdateVideoState({
            currentTime: target,
            isPlaying,
          });
        } catch {}
        return;
      }

      const video = videoRef.current;
      if (!video) return;
      const target = Math.max(0, Math.min(video.duration || 0, video.currentTime + seconds));
      video.currentTime = target;
      setCurrentTime(target);
      onUpdateVideoState({
        currentTime: target,
        isPlaying: !video.paused,
      });
    },
    [isYouTube, currentTime, duration, isPlaying, onUpdateVideoState]
  );

  const handleSpeedChange = useCallback(
    (rate: number) => {
      setPlaybackSpeed(rate);

      if (isYouTube && ytPlayerRef.current) {
        try {
          ytPlayerRef.current.setPlaybackRate(rate);
          onUpdateVideoState({
            playbackRate: rate,
            currentTime: ytPlayerRef.current.getCurrentTime() || currentTime,
          });
        } catch {}
        return;
      }

      const video = videoRef.current;
      if (video) {
        video.playbackRate = rate;
      }
      onUpdateVideoState({
        playbackRate: rate,
        currentTime: video ? video.currentTime : currentTime,
      });
    },
    [isYouTube, currentTime, onUpdateVideoState]
  );

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setVolume(val);
    const muted = val === 0;
    setIsMuted(muted);

    if (isYouTube && ytPlayerRef.current) {
      try {
        ytPlayerRef.current.setVolume(val * 100);
        if (muted) ytPlayerRef.current.mute();
        else ytPlayerRef.current.unMute();
      } catch {}
      return;
    }

    if (videoRef.current) {
      videoRef.current.volume = val;
      videoRef.current.muted = muted;
    }
  };

  const handleToggleMute = () => {
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);

    if (isYouTube && ytPlayerRef.current) {
      try {
        if (nextMuted) {
          ytPlayerRef.current.mute();
        } else {
          ytPlayerRef.current.unMute();
          if (volume === 0) {
            setVolume(0.5);
            ytPlayerRef.current.setVolume(50);
          }
        }
      } catch {}
      return;
    }

    if (videoRef.current) {
      videoRef.current.muted = nextMuted;
      if (!nextMuted && volume === 0) {
        setVolume(0.5);
        videoRef.current.volume = 0.5;
      }
    }
  };

  const handleToggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(console.warn);
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(console.warn);
      setIsFullscreen(false);
    }
  };

  const handleMouseMove = () => {
    setShowControls(true);
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    if (isPlaying) {
      controlsTimeoutRef.current = setTimeout(() => {
        setShowControls(false);
      }, 4000);
    }
  };

  const formatTime = (sec: number) => {
    if (isNaN(sec) || !isFinite(sec)) return "00:00";
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = Math.floor(sec % 60);
    if (h > 0) {
      return `${h}:${m < 10 ? "0" : ""}${m}:${s < 10 ? "0" : ""}${s}`;
    }
    return `${m < 10 ? "0" : ""}${m}:${s < 10 ? "0" : ""}${s}`;
  };

  return (
    <div
      ref={containerRef}
      id="synced-player-container"
      onMouseMove={handleMouseMove}
      onMouseLeave={() => isPlaying && setShowControls(false)}
      className="relative w-full h-full min-h-[350px] bg-black rounded-2xl overflow-hidden shadow-2xl flex items-center justify-center select-none group border border-white/10"
    >
      {/* 1. YouTube Player Mount */}
      {isYouTube && (
        <div className="w-full h-full absolute inset-0 flex items-center justify-center bg-black">
          <div
            ref={ytContainerRef}
            id="youtube-player-mount"
            className="w-full h-full pointer-events-auto"
          />
        </div>
      )}

      {/* 2. HTML5 Video Element */}
      <video
        ref={videoRef}
        id="synced-video-element"
        playsInline
        crossOrigin="anonymous"
        onTimeUpdate={() => {
          if (!isYouTube && videoRef.current) {
            setCurrentTime(videoRef.current.currentTime);
          }
        }}
        onLoadedMetadata={() => {
          if (!isYouTube && videoRef.current) {
            setDuration(videoRef.current.duration);
          }
        }}
        onEnded={() => {
          if (!isYouTube) {
            setIsPlaying(false);
            onUpdateVideoState({ isPlaying: false, currentTime: duration });
          }
        }}
        onClick={handleTogglePlay}
        className={`w-full h-full object-contain cursor-pointer ${
          isYouTube ? "hidden pointer-events-none" : "block"
        }`}
      />

      {/* Floating Reaction Animations on Video Screen */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-20">
        {floatingReactions.map((reaction) => (
          <div
            key={reaction.id}
            className="absolute bottom-20 text-4xl drop-shadow-lg transition-all"
            style={{
              left: `${Math.max(10, Math.min(85, reaction.xOffset))}%`,
              animation: "floatUp 2.8s cubic-bezier(0.2, 0.8, 0.2, 1) forwards",
            }}
          >
            <div className="flex flex-col items-center">
              <span className="text-4xl">{reaction.emoji}</span>
              <span className="text-[10px] text-white/90 bg-black/70 px-2 py-0.5 rounded-full mt-0.5 font-medium shadow">
                {reaction.senderName}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Top Banner Info / Movie Title & P2P Sync Pill */}
      <div
        className={`absolute top-0 left-0 right-0 p-4 bg-gradient-to-b from-black/90 via-black/50 to-transparent flex items-center justify-between z-30 transition-opacity duration-300 ${
          showControls ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
      >
        <div className="flex items-center space-x-3 max-w-[70%]">
          <div
            className={`p-2 rounded-lg backdrop-blur-md border ${
              isYouTube
                ? "bg-red-500/20 text-red-400 border-red-500/30"
                : "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
            }`}
          >
            {isYouTube ? <Youtube className="w-5 h-5" /> : <Film className="w-5 h-5" />}
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-white font-semibold text-sm sm:text-base truncate drop-shadow">
                {videoState.title || "Selected Video"}
              </h2>
              {isYouTube && (
                <span className="px-2 py-0.5 text-[10px] font-semibold bg-red-600/90 text-white rounded-full uppercase tracking-wider shrink-0 shadow">
                  YouTube Sync
                </span>
              )}
            </div>
            <div className="flex items-center space-x-2 text-xs text-neutral-300 mt-0.5">
              <span className="inline-flex items-center text-emerald-400 font-medium">
                <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                {t.inSync}
              </span>
              <span className="text-neutral-500">•</span>
              <span className="text-neutral-400">
                {t.syncDrift}: {driftMs}ms
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {/* Movie / YouTube Picker Button */}
          <button
            id="choose-movie-btn"
            onClick={onOpenMovieSelector}
            className="px-4 py-2 bg-white/15 hover:bg-white/25 text-white text-xs sm:text-sm font-semibold rounded-xl backdrop-blur-md border border-white/20 transition flex items-center space-x-1.5 cursor-pointer shadow-lg hover:scale-105"
          >
            <Sparkles className="w-4 h-4 text-amber-300" />
            <span>{t.selectMovie}</span>
          </button>
        </div>
      </div>

      {/* Floating Big Play/Pause Indicator (Only when HTML5 video is paused and not YouTube) */}
      {!isPlaying && !isYouTube && (
        <div
          onClick={handleTogglePlay}
          className="absolute inset-0 flex items-center justify-center bg-black/30 backdrop-blur-[1px] cursor-pointer z-10"
        >
          <div className="w-20 h-20 bg-emerald-500/90 text-white rounded-full flex items-center justify-center shadow-2xl hover:scale-110 transition-transform">
            <Play className="w-10 h-10 ml-1 fill-current" />
          </div>
        </div>
      )}

      {/* Bottom Controls Bar */}
      <div
        className={`absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/95 via-black/70 to-transparent z-30 transition-opacity duration-300 ${
          showControls ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
      >
        {/* Progress Bar */}
        <div className="flex items-center space-x-3 mb-3">
          <span className="text-xs text-neutral-300 font-mono w-12 text-right">
            {formatTime(currentTime)}
          </span>
          <div className="relative flex-1 flex items-center">
            <input
              id="video-timeline-slider"
              type="range"
              min={0}
              max={duration > 0 ? duration : 100}
              step={0.1}
              value={currentTime}
              onChange={handleSeek}
              className={`w-full h-1.5 bg-white/25 rounded-lg appearance-none cursor-pointer hover:h-2.5 transition-all ${
                isYouTube ? "accent-red-500" : "accent-emerald-500"
              }`}
            />
          </div>
          <span className="text-xs text-neutral-300 font-mono w-12">
            {formatTime(duration)}
          </span>
        </div>

        {/* Buttons Row */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2 sm:space-x-4">
            {/* Play/Pause */}
            <button
              id="player-play-pause-btn"
              onClick={handleTogglePlay}
              className="p-2 bg-white/10 hover:bg-white/20 text-white rounded-xl transition cursor-pointer"
              title={isPlaying ? "Pause (Space)" : "Play (Space)"}
            >
              {isPlaying ? (
                <Pause className="w-5 h-5 fill-current" />
              ) : (
                <Play className="w-5 h-5 fill-current ml-0.5" />
              )}
            </button>

            {/* Jump Back 10s */}
            <button
              id="skip-back-10s-btn"
              onClick={() => handleSkip(-10)}
              className="p-2 text-neutral-300 hover:text-white transition cursor-pointer"
              title="-10 Seconds"
            >
              <RotateCcw className="w-4 h-4" />
            </button>

            {/* Jump Forward 10s */}
            <button
              id="skip-forward-10s-btn"
              onClick={() => handleSkip(10)}
              className="p-2 text-neutral-300 hover:text-white transition cursor-pointer"
              title="+10 Seconds"
            >
              <RotateCw className="w-4 h-4" />
            </button>

            {/* Volume Control */}
            <div className="flex items-center space-x-2 group/volume">
              <button
                id="volume-mute-btn"
                onClick={handleToggleMute}
                className="p-2 text-neutral-300 hover:text-white transition cursor-pointer"
              >
                {isMuted || volume === 0 ? (
                  <VolumeX className="w-5 h-5 text-rose-400" />
                ) : (
                  <Volume2 className="w-5 h-5" />
                )}
              </button>
              <input
                id="volume-slider"
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={isMuted ? 0 : volume}
                onChange={handleVolumeChange}
                className={`w-16 sm:w-20 h-1 bg-white/30 rounded-lg appearance-none cursor-pointer ${
                  isYouTube ? "accent-red-500" : "accent-emerald-500"
                }`}
              />
            </div>
          </div>

          {/* Right Controls: Speed, Emojis, Fullscreen */}
          <div className="flex items-center space-x-1.5 sm:space-x-3">
            {/* Quick Live Reactions Bar */}
            <div className="hidden md:flex items-center space-x-1 bg-white/10 px-2 py-1 rounded-xl backdrop-blur-sm">
              {["🍿", "❤️", "😂", "🔥", "😭", "👏"].map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => onTriggerReaction(emoji)}
                  className="hover:scale-125 active:scale-95 transition-transform text-base sm:text-lg px-1 cursor-pointer"
                  title={`Send ${emoji}`}
                >
                  {emoji}
                </button>
              ))}
            </div>

            {/* Playback Speed Select */}
            <div className="flex items-center space-x-1 bg-white/10 px-2.5 py-1.5 rounded-xl text-xs text-white">
              <Gauge className="w-3.5 h-3.5 text-neutral-400" />
              <select
                id="playback-speed-select"
                value={playbackSpeed}
                onChange={(e) => handleSpeedChange(parseFloat(e.target.value))}
                className="bg-transparent text-white text-xs border-0 outline-none cursor-pointer font-medium"
              >
                <option value={0.5} className="bg-neutral-900 text-white">0.5x</option>
                <option value={0.75} className="bg-neutral-900 text-white">0.75x</option>
                <option value={1} className="bg-neutral-900 text-white">1.0x</option>
                <option value={1.25} className="bg-neutral-900 text-white">1.25x</option>
                <option value={1.5} className="bg-neutral-900 text-white">1.5x</option>
                <option value={2} className="bg-neutral-900 text-white">2.0x</option>
              </select>
            </div>

            {/* Fullscreen */}
            <button
              id="toggle-fullscreen-btn"
              onClick={handleToggleFullscreen}
              className="p-2 text-neutral-300 hover:text-white transition cursor-pointer"
              title="Fullscreen (F)"
            >
              <Maximize2 className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
