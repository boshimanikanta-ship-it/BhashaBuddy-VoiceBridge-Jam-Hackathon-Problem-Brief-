import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import { EPISODES } from '../data/catalogData';
import type { Episode, SleepTimerMode } from '../types/podcast';
import { WebAudioFallbackPlayer } from '../utils/webAudioFallback';
import { useLibrary } from './LibraryContext';

interface AudioPlayerContextValue {
  currentEpisode: Episode | null;
  queue: Episode[];
  isPlaying: boolean;
  isLoadingAudio: boolean;
  audioError: string | null;
  usingFallbackAudio: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  isMuted: boolean;
  playbackRate: number;
  sleepTimer: SleepTimerMode;
  sleepRemainingSec: number | null;
  playEpisode: (episode: Episode, queueList?: Episode[], startAtSec?: number) => void;
  togglePlay: () => void;
  playNext: () => void;
  playPrevious: () => void;
  seekTo: (sec: number) => void;
  skipBy: (deltaSec: number) => void;
  setVolume: (vol: number) => void;
  toggleMute: () => void;
  setPlaybackRate: (rate: number) => void;
  setSleepTimer: (mode: SleepTimerMode) => void;
  dismissError: () => void;
  activateFallbackDemo: () => void;
}

const AudioPlayerContext = createContext<AudioPlayerContextValue | null>(null);

export const AudioPlayerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { preferences, recordPlayProgress } = useLibrary();

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const fallbackRef = useRef<WebAudioFallbackPlayer | null>(null);
  const lastHistorySyncRef = useRef<number>(0);
  const preFadeVolumeRef = useRef<number>(0.85);

  const [currentEpisode, setCurrentEpisode] = useState<Episode | null>(null);
  const [queue, setQueue] = useState<Episode[]>(EPISODES);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoadingAudio, setIsLoadingAudio] = useState(false);
  const [audioError, setAudioError] = useState<string | null>(null);
  const [usingFallbackAudio, setUsingFallbackAudio] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolumeState] = useState(0.85);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackRate, setPlaybackRateState] = useState(preferences.defaultSpeed || 1);
  const [sleepTimer, setSleepTimerState] = useState<SleepTimerMode>('off');
  const [sleepRemainingSec, setSleepRemainingSec] = useState<number | null>(null);

  // Initialize persistent HTML5 Audio instance once outside Router
  useEffect(() => {
    const audio = new Audio();
    audio.preload = 'metadata';
    audioRef.current = audio;
    fallbackRef.current = new WebAudioFallbackPlayer();

    return () => {
      audio.pause();
      audio.src = '';
      fallbackRef.current?.stop();
    };
  }, []);

  const stopPlaybackCompletely = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
    }
    fallbackRef.current?.stop();
    setIsPlaying(false);
  }, []);

  const startFallbackForEpisode = useCallback(
    (episode: Episode, startAtSec: number) => {
      if (!fallbackRef.current) return;
      if (audioRef.current) {
        audioRef.current.pause();
      }
      setUsingFallbackAudio(true);
      setIsLoadingAudio(false);
      setDuration(episode.durationSec);
      setIsPlaying(true);

      fallbackRef.current.start({
        language: episode.language,
        durationSec: episode.durationSec,
        startAtSec,
        volume: isMuted ? 0 : volume,
        speed: playbackRate,
        onTick: (t) => {
          setCurrentTime(t);
          if (Math.abs(t - lastHistorySyncRef.current) >= 5) {
            lastHistorySyncRef.current = t;
            recordPlayProgress(episode.id, t);
          }
        },
        onEnded: () => {
          setIsPlaying(false);
        },
      });
    },
    [isMuted, playbackRate, recordPlayProgress, volume]
  );

  const playEpisode = useCallback(
    (episode: Episode, queueList?: Episode[], startAtSec = 0) => {
      const audio = audioRef.current;
      if (!audio) return;

      fallbackRef.current?.stop();
      setUsingFallbackAudio(false);
      setAudioError(null);
      setIsLoadingAudio(true);

      if (queueList && queueList.length > 0) {
        setQueue(queueList);
      }

      setCurrentEpisode(episode);
      setDuration(episode.durationSec);
      setCurrentTime(startAtSec);
      lastHistorySyncRef.current = startAtSec;
      recordPlayProgress(episode.id, startAtSec);

      audio.src = episode.audioUrl;
      audio.playbackRate = playbackRate;
      audio.volume = isMuted ? 0 : volume;

      const handleLoaded = () => {
        if (startAtSec > 0 && Number.isFinite(audio.duration)) {
          audio.currentTime = Math.min(startAtSec, Math.max(0, audio.duration - 1));
        }
        setDuration(Number.isFinite(audio.duration) && audio.duration > 0 ? audio.duration : episode.durationSec);
        setIsLoadingAudio(false);
      };

      audio.onloadedmetadata = handleLoaded;
      audio.play()
        .then(() => {
          setIsPlaying(true);
          setIsLoadingAudio(false);
        })
        .catch(() => {
          setIsLoadingAudio(false);
          if (preferences.autoFallbackAudio) {
            setAudioError('Audio stream unavailable — switched to EchoEpisodes Web Audio demo synthesizer.');
            startFallbackForEpisode(episode, startAtSec);
          } else {
            setAudioError('Unable to stream episode audio. Click "Use Audio Demo" to continue listening.');
            setIsPlaying(false);
          }
        });
    },
    [isMuted, playbackRate, preferences.autoFallbackAudio, recordPlayProgress, startFallbackForEpisode, volume]
  );

  const playNext = useCallback(() => {
    if (!currentEpisode || queue.length === 0) return;
    const idx = queue.findIndex((e) => e.id === currentEpisode.id);
    const nextIdx = idx >= 0 ? (idx + 1) % queue.length : 0;
    playEpisode(queue[nextIdx], queue, 0);
  }, [currentEpisode, playEpisode, queue]);

  const playPrevious = useCallback(() => {
    if (!currentEpisode || queue.length === 0) return;
    if (currentTime > 4) {
      if (usingFallbackAudio) {
        fallbackRef.current?.seek(0);
      } else if (audioRef.current) {
        audioRef.current.currentTime = 0;
      }
      setCurrentTime(0);
      return;
    }
    const idx = queue.findIndex((e) => e.id === currentEpisode.id);
    const prevIdx = idx >= 0 ? (idx - 1 + queue.length) % queue.length : 0;
    playEpisode(queue[prevIdx], queue, 0);
  }, [currentEpisode, currentTime, playEpisode, queue, usingFallbackAudio]);

  // Attach HTML5 audio element event listeners
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onTimeUpdate = () => {
      if (usingFallbackAudio) return;
      const t = audio.currentTime || 0;
      setCurrentTime(t);
      if (currentEpisode && Math.abs(t - lastHistorySyncRef.current) >= 5) {
        lastHistorySyncRef.current = t;
        recordPlayProgress(currentEpisode.id, t);
      }
    };

    const onDurationChange = () => {
      if (Number.isFinite(audio.duration) && audio.duration > 0) {
        setDuration(audio.duration);
      }
    };

    const onEnded = () => {
      if (sleepTimer === 'end') {
        setIsPlaying(false);
        setSleepTimerState('off');
        setSleepRemainingSec(null);
        return;
      }
      playNext();
    };

    const onError = () => {
      if (!currentEpisode || usingFallbackAudio) return;
      setIsLoadingAudio(false);
      if (preferences.autoFallbackAudio) {
        setAudioError('Network stream interrupted — playing EchoEpisodes Web Audio demo fallback.');
        startFallbackForEpisode(currentEpisode, currentTime);
      } else {
        setAudioError('Failed to load audio stream. Try retrying or launching the Web Audio demo.');
        setIsPlaying(false);
      }
    };

    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('durationchange', onDurationChange);
    audio.addEventListener('ended', onEnded);
    audio.addEventListener('error', onError);

    return () => {
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audio.removeEventListener('durationchange', onDurationChange);
      audio.removeEventListener('ended', onEnded);
      audio.removeEventListener('error', onError);
    };
  }, [
    currentEpisode,
    currentTime,
    playNext,
    preferences.autoFallbackAudio,
    recordPlayProgress,
    sleepTimer,
    startFallbackForEpisode,
    usingFallbackAudio,
  ]);

  const togglePlay = useCallback(() => {
    if (!currentEpisode) {
      playEpisode(EPISODES[0], EPISODES, 0);
      return;
    }

    if (usingFallbackAudio) {
      if (isPlaying) {
        fallbackRef.current?.stop();
        setIsPlaying(false);
      } else {
        startFallbackForEpisode(currentEpisode, currentTime);
      }
      return;
    }

    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      audio
        .play()
        .then(() => setIsPlaying(true))
        .catch(() => {
          startFallbackForEpisode(currentEpisode, currentTime);
        });
    }
  }, [currentEpisode, currentTime, isPlaying, playEpisode, startFallbackForEpisode, usingFallbackAudio]);

  const seekTo = useCallback(
    (sec: number) => {
      const clamped = Math.max(0, Math.min(sec, duration || currentEpisode?.durationSec || 0));
      setCurrentTime(clamped);
      if (usingFallbackAudio) {
        fallbackRef.current?.seek(clamped);
      } else if (audioRef.current) {
        audioRef.current.currentTime = clamped;
      }
      if (currentEpisode) {
        recordPlayProgress(currentEpisode.id, clamped);
      }
    },
    [currentEpisode, duration, recordPlayProgress, usingFallbackAudio]
  );

  const skipBy = useCallback(
    (deltaSec: number) => {
      seekTo(currentTime + deltaSec);
    },
    [currentTime, seekTo]
  );

  const setVolume = useCallback(
    (vol: number) => {
      const clamped = Math.max(0, Math.min(1, vol));
      setVolumeState(clamped);
      preFadeVolumeRef.current = clamped;
      if (clamped > 0 && isMuted) {
        setIsMuted(false);
      }
      if (audioRef.current) {
        audioRef.current.volume = clamped;
      }
      fallbackRef.current?.setVolume(clamped);
    },
    [isMuted]
  );

  const toggleMute = useCallback(() => {
    setIsMuted((prev) => {
      const next = !prev;
      const targetVol = next ? 0 : volume;
      if (audioRef.current) audioRef.current.volume = targetVol;
      fallbackRef.current?.setVolume(targetVol);
      return next;
    });
  }, [volume]);

  const setPlaybackRate = useCallback((rate: number) => {
    setPlaybackRateState(rate);
    if (audioRef.current) {
      audioRef.current.playbackRate = rate;
    }
    fallbackRef.current?.setSpeed(rate);
  }, []);

  const setSleepTimer = useCallback(
    (mode: SleepTimerMode) => {
      setSleepTimerState(mode);
      preFadeVolumeRef.current = volume;
      if (mode === 'off' || mode === 'end') {
        setSleepRemainingSec(null);
      } else {
        setSleepRemainingSec(Number(mode) * 60);
      }
    },
    [volume]
  );

  // Sleep timer countdown with gentle 5-second audio fade-out before stopping
  useEffect(() => {
    if (sleepTimer === 'off' || !isPlaying) return;

    const timer = window.setInterval(() => {
      if (sleepTimer === 'end') {
        const remaining = Math.max(0, (duration || 0) - currentTime);
        if (remaining <= 5 && remaining > 0) {
          const factor = remaining / 5;
          const faded = preFadeVolumeRef.current * factor;
          if (audioRef.current) audioRef.current.volume = isMuted ? 0 : faded;
          fallbackRef.current?.setVolume(isMuted ? 0 : faded);
        }
        return;
      }

      setSleepRemainingSec((prev) => {
        if (prev === null) return null;
        if (prev <= 1) {
          stopPlaybackCompletely();
          setSleepTimerState('off');
          if (audioRef.current) audioRef.current.volume = isMuted ? 0 : preFadeVolumeRef.current;
          fallbackRef.current?.setVolume(isMuted ? 0 : preFadeVolumeRef.current);
          return null;
        }
        if (prev <= 6) {
          const factor = (prev - 1) / 5;
          const faded = preFadeVolumeRef.current * factor;
          if (audioRef.current) audioRef.current.volume = isMuted ? 0 : faded;
          fallbackRef.current?.setVolume(isMuted ? 0 : faded);
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [currentTime, duration, isMuted, isPlaying, sleepTimer, stopPlaybackCompletely]);

  // Global keyboard shortcuts (Space, Left/Right arrows, M)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const tag = target?.tagName?.toLowerCase();
      if (tag === 'input' || tag === 'textarea' || tag === 'select' || target?.isContentEditable) {
        return;
      }
      if (!currentEpisode) return;

      if (e.code === 'Space') {
        e.preventDefault();
        togglePlay();
      } else if (e.code === 'ArrowLeft') {
        e.preventDefault();
        skipBy(-10);
      } else if (e.code === 'ArrowRight') {
        e.preventDefault();
        skipBy(10);
      } else if (e.key.toLowerCase() === 'm') {
        e.preventDefault();
        toggleMute();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [currentEpisode, skipBy, toggleMute, togglePlay]);

  const dismissError = useCallback(() => setAudioError(null), []);

  const activateFallbackDemo = useCallback(() => {
    if (!currentEpisode) return;
    setAudioError(null);
    startFallbackForEpisode(currentEpisode, currentTime);
  }, [currentEpisode, currentTime, startFallbackForEpisode]);

  return (
    <AudioPlayerContext.Provider
      value={{
        currentEpisode,
        queue,
        isPlaying,
        isLoadingAudio,
        audioError,
        usingFallbackAudio,
        currentTime,
        duration,
        volume,
        isMuted,
        playbackRate,
        sleepTimer,
        sleepRemainingSec,
        playEpisode,
        togglePlay,
        playNext,
        playPrevious,
        seekTo,
        skipBy,
        setVolume,
        toggleMute,
        setPlaybackRate,
        setSleepTimer,
        dismissError,
        activateFallbackDemo,
      }}
    >
      {children}
    </AudioPlayerContext.Provider>
  );
};

export function useAudioPlayer(): AudioPlayerContextValue {
  const ctx = useContext(AudioPlayerContext);
  if (!ctx) throw new Error('useAudioPlayer must be used within AudioPlayerProvider');
  return ctx;
}
