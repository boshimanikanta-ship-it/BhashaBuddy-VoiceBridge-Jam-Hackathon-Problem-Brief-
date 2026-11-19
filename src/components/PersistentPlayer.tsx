import React, { useState } from 'react';
import {
  AlertCircle,
  Bookmark,
  BookmarkPlus,
  ChevronDown,
  ChevronUp,
  FileText,
  ListMusic,
  Moon,
  Pause,
  Play,
  RotateCcw,
  RotateCw,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAudioPlayer } from '../context/AudioPlayerContext';
import { useLibrary } from '../context/LibraryContext';
import type { SleepTimerMode } from '../types/podcast';
import { formatDuration } from '../utils/formatters';
import { SafeImage } from './SafeImage';

const SPEED_OPTIONS = [0.75, 1, 1.25, 1.5, 2];

const SLEEP_OPTIONS: Array<{ value: SleepTimerMode; label: string }> = [
  { value: 'off', label: 'Off' },
  { value: '15', label: '15 minutes' },
  { value: '30', label: '30 minutes' },
  { value: '45', label: '45 minutes' },
  { value: 'end', label: 'End of Episode' },
];

export const PersistentPlayer: React.FC = () => {
  const {
    currentEpisode,
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
  } = useAudioPlayer();

  const { isEpisodeBookmarked, toggleEpisodeBookmark, saveTimestampBookmark } = useLibrary();

  const [drawerTab, setDrawerTab] = useState<'none' | 'chapters' | 'transcript'>('none');
  const [showSleepMenu, setShowSleepMenu] = useState(false);
  const [mobileExpanded, setMobileExpanded] = useState(false);

  if (!currentEpisode) {
    return null;
  }

  const effectiveDuration = Math.max(duration || currentEpisode.durationSec || 1, 1);
  const progressPct = Math.min(100, Math.max(0, (currentTime / effectiveDuration) * 100));
  const bookmarked = isEpisodeBookmarked(currentEpisode.id);

  const activeChapterIdx = currentEpisode.chapters.reduce((acc, ch, idx) => {
    return currentTime >= ch.timestampSec ? idx : acc;
  }, 0);

  const activeTranscriptIdx = currentEpisode.transcript.reduce((acc, cue, idx) => {
    return currentTime >= cue.timeSec ? idx : acc;
  }, 0);

  const toggleDrawer = (tab: 'chapters' | 'transcript') => {
    setDrawerTab((prev) => (prev === tab ? 'none' : tab));
  };

  return (
    <aside
      aria-label="Persistent audio player"
      className="fixed bottom-0 left-0 right-0 z-40"
    >
      {/* Audio Error / Fallback Notice Banner */}
      {audioError && (
        <div className="mx-auto max-w-4xl px-3 mb-2">
          <div className="rounded-xl bg-[#1E1B2E] border border-orange-500/40 px-3.5 py-2 flex items-center justify-between gap-3 shadow-xl text-xs">
            <div className="flex items-center gap-2 text-orange-200 min-w-0">
              <AlertCircle className="w-4 h-4 text-orange-400 shrink-0" />
              <span className="truncate">{audioError}</span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {!usingFallbackAudio && (
                <button
                  type="button"
                  onClick={activateFallbackDemo}
                  className="px-2.5 py-1 rounded-lg bg-orange-500 text-white font-medium hover:bg-orange-400 transition-colors whitespace-nowrap"
                >
                  Use Audio Demo
                </button>
              )}
              <button
                type="button"
                onClick={dismissError}
                aria-label="Dismiss audio notification"
                className="p-1 text-slate-400 hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Slide-up Chapters / Transcript Panel */}
      {drawerTab !== 'none' && (
        <div className="border-t border-white/10 bg-[#13131C]/98 backdrop-blur-xl shadow-2xl">
          <div className="max-w-5xl mx-auto px-4 py-4 max-h-72 overflow-y-auto">
            <div className="flex items-center justify-between gap-4 pb-3 border-b border-white/8">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setDrawerTab('chapters')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
                    drawerTab === 'chapters'
                      ? 'bg-violet-600 text-white'
                      : 'text-slate-400 hover:text-white bg-white/5'
                  }`}
                >
                  Chapters ({currentEpisode.chapters.length})
                </button>
                <button
                  type="button"
                  onClick={() => setDrawerTab('transcript')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
                    drawerTab === 'transcript'
                      ? 'bg-orange-500 text-white'
                      : 'text-slate-400 hover:text-white bg-white/5'
                  }`}
                >
                  Live Transcript ({currentEpisode.language})
                </button>
              </div>
              <button
                type="button"
                onClick={() => setDrawerTab('none')}
                className="min-w-[36px] min-h-[36px] rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/5"
                aria-label="Close player drawer"
              >
                <ChevronDown className="w-4 h-4" />
              </button>
            </div>

            {drawerTab === 'chapters' && (
              <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
                {currentEpisode.chapters.map((ch, idx) => {
                  const isActive = idx === activeChapterIdx;
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => seekTo(ch.timestampSec)}
                      className={`flex items-center justify-between gap-3 rounded-xl px-3.5 py-2.5 text-left border transition-colors ${
                        isActive
                          ? 'bg-violet-600/20 border-violet-500/50 text-white'
                          : 'bg-[#171721] border-white/8 text-slate-300 hover:bg-white/5'
                      }`}
                    >
                      <span className="text-xs font-medium truncate">
                        {idx + 1}. {ch.title}
                      </span>
                      <span className="font-mono tabular-nums text-xs text-orange-400 shrink-0">
                        {formatDuration(ch.timestampSec)}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}

            {drawerTab === 'transcript' && (
              <div className="mt-3 space-y-2">
                {currentEpisode.transcript.map((cue, idx) => {
                  const isActive = idx === activeTranscriptIdx;
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => seekTo(cue.timeSec)}
                      className={`w-full text-left flex items-start gap-3 rounded-xl p-3 border transition-colors ${
                        isActive
                          ? 'bg-orange-500/12 border-orange-500/35'
                          : 'bg-[#171721]/60 border-transparent hover:bg-white/5'
                      }`}
                    >
                      <span className="font-mono tabular-nums text-xs text-orange-400 shrink-0 mt-0.5">
                        {formatDuration(cue.timeSec)}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-medium text-violet-300">{cue.speaker}</div>
                        <p className="text-sm text-white mt-0.5 leading-relaxed">{cue.nativeText}</p>
                        <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">{cue.text}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Mobile Expanded Control Sheet */}
      {mobileExpanded && (
        <div className="md:hidden border-t border-white/10 bg-[#12121A]/98 backdrop-blur-xl px-4 py-4 space-y-4 shadow-2xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">
              Now Playing · {currentEpisode.language}
              {usingFallbackAudio ? ' · Web Audio Demo' : ''}
            </span>
            <button
              type="button"
              onClick={() => setMobileExpanded(false)}
              className="min-w-[40px] min-h-[40px] flex items-center justify-center rounded-lg text-slate-400 hover:text-white"
              aria-label="Collapse mobile player controls"
            >
              <ChevronDown className="w-5 h-5" />
            </button>
          </div>

          <div className="space-y-1.5">
            <input
              type="range"
              min={0}
              max={effectiveDuration}
              step={0.5}
              value={currentTime}
              onChange={(e) => seekTo(Number(e.target.value))}
              aria-label="Seek episode position"
              className="w-full echo-slider"
              style={{
                background: `linear-gradient(to right, #F97316 ${progressPct}%, rgba(255,255,255,0.12) ${progressPct}%)`,
              }}
            />
            <div className="flex justify-between text-[11px] font-mono tabular-nums text-slate-400">
              <span>{formatDuration(currentTime)}</span>
              <span>{formatDuration(effectiveDuration)}</span>
            </div>
          </div>

          <div className="flex items-center justify-center gap-4">
            <button
              type="button"
              onClick={playPrevious}
              className="min-w-[44px] min-h-[44px] rounded-xl flex items-center justify-center text-slate-300 hover:text-white bg-white/5"
              aria-label="Previous episode"
            >
              <SkipBack className="w-5 h-5" />
            </button>
            <button
              type="button"
              onClick={() => skipBy(-10)}
              className="min-w-[44px] min-h-[44px] rounded-xl flex items-center justify-center text-slate-300 hover:text-white bg-white/5"
              aria-label="Rewind 10 seconds"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={togglePlay}
              className="w-12 h-12 rounded-full bg-violet-600 hover:bg-violet-500 text-white flex items-center justify-center shadow-lg"
              aria-label={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current ml-0.5" />}
            </button>
            <button
              type="button"
              onClick={() => skipBy(10)}
              className="min-w-[44px] min-h-[44px] rounded-xl flex items-center justify-center text-slate-300 hover:text-white bg-white/5"
              aria-label="Forward 10 seconds"
            >
              <RotateCw className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={playNext}
              className="min-w-[44px] min-h-[44px] rounded-xl flex items-center justify-center text-slate-300 hover:text-white bg-white/5"
              aria-label="Next episode"
            >
              <SkipForward className="w-5 h-5" />
            </button>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-white/8">
            <div className="flex items-center gap-1.5">
              {SPEED_OPTIONS.map((rate) => (
                <button
                  key={rate}
                  type="button"
                  onClick={() => setPlaybackRate(rate)}
                  className={`px-2 py-1.5 rounded-lg text-xs font-mono tabular-nums ${
                    playbackRate === rate
                      ? 'bg-violet-600 text-white'
                      : 'bg-white/5 text-slate-300'
                  }`}
                >
                  {rate}x
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => saveTimestampBookmark(currentEpisode, currentTime)}
                className="px-2.5 py-1.5 rounded-lg bg-orange-500/15 text-orange-400 text-xs font-medium flex items-center gap-1"
              >
                <BookmarkPlus className="w-3.5 h-3.5" />
                <span>Save {formatDuration(currentTime)}</span>
              </button>
              <button
                type="button"
                onClick={() => toggleDrawer('chapters')}
                className="px-2.5 py-1.5 rounded-lg bg-white/5 text-slate-200 text-xs"
              >
                Chapters
              </button>
              <button
                type="button"
                onClick={() => toggleDrawer('transcript')}
                className="px-2.5 py-1.5 rounded-lg bg-white/5 text-slate-200 text-xs"
              >
                Transcript
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 flex-1">
              <button
                type="button"
                onClick={toggleMute}
                className="min-w-[36px] min-h-[36px] flex items-center justify-center text-slate-300"
                aria-label={isMuted ? 'Unmute' : 'Mute'}
              >
                {isMuted || volume === 0 ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              </button>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={isMuted ? 0 : volume}
                onChange={(e) => setVolume(Number(e.target.value))}
                aria-label="Volume"
                className="w-full echo-slider"
              />
            </div>

            <select
              value={sleepTimer}
              onChange={(e) => setSleepTimer(e.target.value as SleepTimerMode)}
              aria-label="Sleep timer"
              className="rounded-lg bg-[#171721] border border-white/10 px-2.5 py-1.5 text-xs text-slate-200"
            >
              {SLEEP_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  Sleep: {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* Main Bottom Bar (Compact 64px on mobile, full studio deck on desktop) */}
      <div className="border-t border-white/10 bg-[#12121A]/95 backdrop-blur-xl px-3 md:px-6 h-16 md:h-[84px] flex items-center justify-between gap-3 md:gap-6">
        {/* Left: Episode Info */}
        <div className="flex items-center gap-3 min-w-0 flex-1 md:flex-initial md:w-[300px]">
          <Link
            to={`/shows/${currentEpisode.showId}`}
            className="w-11 h-11 md:w-13 md:h-13 rounded-xl overflow-hidden bg-[#171721] shrink-0 border border-white/10"
          >
            <SafeImage
              src={currentEpisode.thumbnailUrl}
              alt={currentEpisode.title}
              fallbackLabel={currentEpisode.showTitle}
            />
          </Link>
          <div className="min-w-0 flex-1">
            <Link
              to={`/shows/${currentEpisode.showId}`}
              className="block text-sm font-semibold text-white truncate hover:text-violet-300 transition-colors"
            >
              {currentEpisode.title}
            </Link>
            <div className="flex items-center gap-1.5 text-xs text-slate-400 truncate">
              <Link
                to={`/hosts/${currentEpisode.hostId}`}
                className="truncate hover:text-white transition-colors"
              >
                {currentEpisode.hostName}
              </Link>
              <span aria-hidden="true">·</span>
              <span className="text-orange-400 shrink-0">{currentEpisode.language}</span>
              {usingFallbackAudio && (
                <>
                  <span aria-hidden="true">·</span>
                  <span className="text-violet-300 shrink-0">Audio Demo</span>
                </>
              )}
            </div>
          </div>

          <div className="hidden sm:flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={() => toggleEpisodeBookmark(currentEpisode)}
              aria-label={bookmarked ? 'Remove episode bookmark' : 'Bookmark current episode'}
              title={bookmarked ? 'Bookmarked' : 'Bookmark episode'}
              className={`min-w-[36px] min-h-[36px] rounded-lg flex items-center justify-center transition-colors ${
                bookmarked ? 'text-orange-400 bg-orange-500/15' : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Bookmark className={`w-4 h-4 ${bookmarked ? 'fill-current' : ''}`} />
            </button>
            <button
              type="button"
              onClick={() => saveTimestampBookmark(currentEpisode, currentTime)}
              aria-label={`Save timestamp bookmark at ${formatDuration(currentTime)}`}
              title={`Save timestamp at ${formatDuration(currentTime)}`}
              className="min-w-[36px] min-h-[36px] rounded-lg flex items-center justify-center text-slate-400 hover:text-orange-400 hover:bg-white/5 transition-colors"
            >
              <BookmarkPlus className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Center: Transport + Seekbar (Desktop) */}
        <div className="hidden md:flex flex-col items-center justify-center flex-1 max-w-xl gap-1.5">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={playPrevious}
              aria-label="Previous episode"
              className="min-w-[36px] min-h-[36px] rounded-lg flex items-center justify-center text-slate-300 hover:text-white hover:bg-white/5 transition-colors"
            >
              <SkipBack className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => skipBy(-10)}
              aria-label="Rewind 10 seconds"
              className="min-w-[36px] min-h-[36px] rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
              title="-10s (Left Arrow)"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={togglePlay}
              disabled={isLoadingAudio}
              aria-label={isPlaying ? 'Pause episode' : 'Play episode'}
              title="Play/Pause (Space)"
              className="w-10 h-10 rounded-full bg-violet-600 hover:bg-violet-500 disabled:opacity-60 text-white flex items-center justify-center shadow-lg transition-transform active:scale-95"
            >
              {isPlaying ? (
                <Pause className="w-4 h-4 fill-current" />
              ) : (
                <Play className="w-4 h-4 fill-current ml-0.5" />
              )}
            </button>
            <button
              type="button"
              onClick={() => skipBy(10)}
              aria-label="Forward 10 seconds"
              className="min-w-[36px] min-h-[36px] rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
              title="+10s (Right Arrow)"
            >
              <RotateCw className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={playNext}
              aria-label="Next episode"
              className="min-w-[36px] min-h-[36px] rounded-lg flex items-center justify-center text-slate-300 hover:text-white hover:bg-white/5 transition-colors"
            >
              <SkipForward className="w-4 h-4" />
            </button>
          </div>

          <div className="w-full flex items-center gap-2.5">
            <span className="text-[11px] font-mono tabular-nums text-slate-400 w-10 text-right">
              {formatDuration(currentTime)}
            </span>
            <div className="relative flex-1 flex items-center">
              <input
                type="range"
                min={0}
                max={effectiveDuration}
                step={0.25}
                value={currentTime}
                onChange={(e) => seekTo(Number(e.target.value))}
                aria-label="Episode progress"
                className="w-full echo-slider relative z-10"
                style={{
                  background: `linear-gradient(to right, #F97316 ${progressPct}%, rgba(255,255,255,0.14) ${progressPct}%)`,
                }}
              />
            </div>
            <span className="text-[11px] font-mono tabular-nums text-slate-400 w-10">
              {formatDuration(effectiveDuration)}
            </span>
          </div>
        </div>

        {/* Right: Speed, Sleep Timer, Chapters, Transcript, Volume (Desktop) */}
        <div className="hidden md:flex items-center justify-end gap-2 shrink-0">
          <button
            type="button"
            onClick={() => {
              const idx = SPEED_OPTIONS.indexOf(playbackRate);
              const next = SPEED_OPTIONS[(idx + 1) % SPEED_OPTIONS.length];
              setPlaybackRate(next);
            }}
            title="Cycle playback speed"
            aria-label={`Playback speed ${playbackRate}x`}
            className="px-2.5 h-9 rounded-lg bg-white/5 hover:bg-white/10 text-xs font-mono tabular-nums text-slate-200 transition-colors whitespace-nowrap"
          >
            {playbackRate}x
          </button>

          <div className="relative">
            <button
              type="button"
              onClick={() => setShowSleepMenu((s) => !s)}
              aria-label="Sleep timer"
              title="Sleep timer"
              className={`h-9 px-2.5 rounded-lg flex items-center gap-1.5 text-xs transition-colors whitespace-nowrap ${
                sleepTimer !== 'off'
                  ? 'bg-orange-500/20 text-orange-300 border border-orange-500/35'
                  : 'bg-white/5 hover:bg-white/10 text-slate-300'
              }`}
            >
              <Moon className="w-3.5 h-3.5" />
              {sleepRemainingSec !== null ? (
                <span className="font-mono tabular-nums">{formatDuration(sleepRemainingSec)}</span>
              ) : sleepTimer === 'end' ? (
                <span>End</span>
              ) : null}
            </button>

            {showSleepMenu && (
              <div className="absolute bottom-12 right-0 w-44 rounded-xl bg-[#171721] border border-white/12 p-1.5 shadow-2xl">
                <div className="px-2.5 py-1.5 text-[11px] font-medium text-slate-400">
                  Sleep Timer (Fade Out)
                </div>
                {SLEEP_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => {
                      setSleepTimer(opt.value);
                      setShowSleepMenu(false);
                    }}
                    className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs transition-colors ${
                      sleepTimer === opt.value
                        ? 'bg-violet-600 text-white'
                        : 'text-slate-200 hover:bg-white/5'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={() => toggleDrawer('chapters')}
            aria-label="Toggle episode chapters"
            title="Chapters"
            className={`min-w-[36px] h-9 px-2 rounded-lg flex items-center justify-center transition-colors ${
              drawerTab === 'chapters'
                ? 'bg-violet-600 text-white'
                : 'bg-white/5 hover:bg-white/10 text-slate-300'
            }`}
          >
            <ListMusic className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={() => toggleDrawer('transcript')}
            aria-label="Toggle episode transcript"
            title="Live Transcript"
            className={`min-w-[36px] h-9 px-2 rounded-lg flex items-center justify-center transition-colors ${
              drawerTab === 'transcript'
                ? 'bg-orange-500 text-white'
                : 'bg-white/5 hover:bg-white/10 text-slate-300'
            }`}
          >
            <FileText className="w-4 h-4" />
          </button>

          <div className="hidden lg:flex items-center gap-1.5 pl-2 border-l border-white/8">
            <button
              type="button"
              onClick={toggleMute}
              aria-label={isMuted ? 'Unmute audio' : 'Mute audio'}
              title="Mute / Unmute (M)"
              className="min-w-[36px] min-h-[36px] rounded-lg flex items-center justify-center text-slate-300 hover:text-white hover:bg-white/5"
            >
              {isMuted || volume === 0 ? (
                <VolumeX className="w-4 h-4 text-orange-400" />
              ) : (
                <Volume2 className="w-4 h-4" />
              )}
            </button>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={isMuted ? 0 : volume}
              onChange={(e) => setVolume(Number(e.target.value))}
              aria-label="Volume control"
              className="w-20 echo-slider"
              style={{
                background: `linear-gradient(to right, #7C3AED ${(isMuted ? 0 : volume) * 100}%, rgba(255,255,255,0.14) ${(isMuted ? 0 : volume) * 100}%)`,
              }}
            />
          </div>
        </div>

        {/* Mobile Compact Actions */}
        <div className="flex md:hidden items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={togglePlay}
            aria-label={isPlaying ? 'Pause' : 'Play'}
            className="w-11 h-11 rounded-full bg-violet-600 text-white flex items-center justify-center"
          >
            {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current ml-0.5" />}
          </button>
          <button
            type="button"
            onClick={() => setMobileExpanded((prev) => !prev)}
            aria-label="Expand player controls"
            className="min-w-[44px] min-h-[44px] rounded-xl bg-white/5 text-slate-200 flex items-center justify-center"
          >
            {mobileExpanded ? <ChevronDown className="w-5 h-5" /> : <ChevronUp className="w-5 h-5" />}
          </button>
        </div>
      </div>
    </aside>
  );
};
