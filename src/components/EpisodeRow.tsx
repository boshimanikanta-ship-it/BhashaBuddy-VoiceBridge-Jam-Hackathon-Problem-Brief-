import React, { useState } from 'react';
import {
  Bookmark,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Download,
  FileText,
  ListMusic,
  Pause,
  Play,
  Trash2,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAudioPlayer } from '../context/AudioPlayerContext';
import { useLibrary } from '../context/LibraryContext';
import type { Episode } from '../types/podcast';
import { formatDateLabel, formatDuration } from '../utils/formatters';
import { SafeImage } from './SafeImage';

interface EpisodeRowProps {
  episode: Episode;
  queueContext?: Episode[];
  matchedSnippet?: string;
  resumeSec?: number;
  showTranscriptDefault?: boolean;
}

export const EpisodeRow: React.FC<EpisodeRowProps> = ({
  episode,
  queueContext,
  matchedSnippet,
  resumeSec,
  showTranscriptDefault = false,
}) => {
  const { currentEpisode, isPlaying, playEpisode, togglePlay, seekTo } = useAudioPlayer();
  const {
    isEpisodeBookmarked,
    toggleEpisodeBookmark,
    startSimulatedDownload,
    removeDownloadWithConfirm,
    getDownloadStatus,
  } = useLibrary();

  const [expandedPanel, setExpandedPanel] = useState<'none' | 'transcript' | 'chapters'>(
    showTranscriptDefault ? 'transcript' : 'none'
  );

  const isCurrent = currentEpisode?.id === episode.id;
  const bookmarked = isEpisodeBookmarked(episode.id);
  const download = getDownloadStatus(episode.id);

  const handlePlayClick = () => {
    if (isCurrent) {
      togglePlay();
    } else {
      playEpisode(episode, queueContext || [episode], resumeSec || 0);
    }
  };

  const handleChapterSeek = (timestampSec: number) => {
    if (isCurrent) {
      seekTo(timestampSec);
    } else {
      playEpisode(episode, queueContext || [episode], timestampSec);
    }
  };

  return (
    <article
      className={`rounded-2xl border transition-colors duration-150 p-4 ${
        isCurrent
          ? 'bg-[#1C1A29] border-violet-500/40'
          : 'bg-[#171721] border-white/8 hover:bg-[#1C1C28]'
      }`}
    >
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="flex items-start sm:items-center gap-3.5 min-w-0 flex-1">
          <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-xl overflow-hidden bg-[#111119] shrink-0">
            <SafeImage
              src={episode.thumbnailUrl}
              alt={episode.title}
              fallbackLabel={episode.showTitle}
            />
            <button
              type="button"
              onClick={handlePlayClick}
              aria-label={isCurrent && isPlaying ? `Pause ${episode.title}` : `Play ${episode.title}`}
              className={`absolute inset-0 flex items-center justify-center transition-opacity ${
                isCurrent ? 'bg-black/50 opacity-100' : 'bg-black/45 opacity-0 hover:opacity-100 focus-visible:opacity-100'
              }`}
            >
              <span className="w-9 h-9 rounded-full bg-violet-600 text-white flex items-center justify-center shadow">
                {isCurrent && isPlaying ? (
                  <Pause className="w-4 h-4 fill-current" />
                ) : (
                  <Play className="w-4 h-4 fill-current ml-0.5" />
                )}
              </span>
            </button>
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-slate-400">
              <span className="text-orange-400 font-medium">{episode.language}</span>
              <span aria-hidden="true">·</span>
              <span>{episode.genre}</span>
              <span aria-hidden="true">·</span>
              <span>Ep {episode.episodeNumber}</span>
              <span aria-hidden="true">·</span>
              <span className="font-mono tabular-nums">{formatDuration(episode.durationSec)}</span>
              <span aria-hidden="true">·</span>
              <span>{formatDateLabel(episode.publishedAt)}</span>
            </div>

            <h3 className="mt-1 text-base font-semibold text-white leading-snug">
              {episode.title}
            </h3>

            <p className="mt-1 text-sm text-slate-300 line-clamp-2">{episode.description}</p>

            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-400">
              {episode.showTitle && (
                <Link
                  to={`/shows/${episode.showId}`}
                  className="hover:text-violet-300 transition-colors font-medium text-slate-300"
                >
                  {episode.showTitle}
                </Link>
              )}
              <span aria-hidden="true">·</span>
              <Link
                to={`/hosts/${episode.hostId}`}
                className="hover:text-white transition-colors"
              >
                Host: {episode.hostName}
              </Link>
              {resumeSec !== undefined && resumeSec > 0 && (
                <>
                  <span aria-hidden="true">·</span>
                  <span className="text-orange-400 font-mono tabular-nums">
                    Resume at {formatDuration(resumeSec)}
                  </span>
                </>
              )}
            </div>

            {matchedSnippet && (
              <div className="mt-2.5 rounded-lg bg-[#12121A] border border-orange-500/20 px-3 py-2 text-xs text-slate-200">
                <span className="text-orange-400 font-medium mr-1.5">Transcript match:</span>
                {matchedSnippet}
              </div>
            )}
          </div>
        </div>

        {/* Action controls */}
        <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
          <button
            type="button"
            onClick={handlePlayClick}
            className={`px-3.5 py-2 min-h-[40px] rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 ${
              isCurrent && isPlaying
                ? 'bg-orange-500 hover:bg-orange-400 text-white'
                : 'bg-violet-600 hover:bg-violet-500 text-white'
            }`}
          >
            {isCurrent && isPlaying ? (
              <>
                <Pause className="w-3.5 h-3.5 fill-current" />
                <span>Pause</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>{resumeSec && resumeSec > 0 ? 'Resume' : 'Play'}</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={() => toggleEpisodeBookmark(episode)}
            aria-label={bookmarked ? `Remove bookmark for ${episode.title}` : `Bookmark ${episode.title}`}
            title={bookmarked ? 'Bookmarked' : 'Bookmark episode'}
            className={`min-w-[40px] min-h-[40px] rounded-xl border flex items-center justify-center transition-colors ${
              bookmarked
                ? 'bg-orange-500/15 border-orange-500/40 text-orange-400'
                : 'bg-white/5 border-white/8 text-slate-300 hover:text-white hover:bg-white/10'
            }`}
          >
            <Bookmark className={`w-4 h-4 ${bookmarked ? 'fill-current' : ''}`} />
          </button>

          {download?.status === 'downloaded' ? (
            <button
              type="button"
              onClick={() => removeDownloadWithConfirm(episode.id, episode.title)}
              title={`Cached in offline simulator (${download.sizeMb} MB) — click to remove`}
              aria-label={`Remove simulated download for ${episode.title}`}
              className="min-w-[40px] min-h-[40px] px-2.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 flex items-center gap-1.5 text-xs font-medium transition-colors"
            >
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <Trash2 className="w-3.5 h-3.5 opacity-75 shrink-0" />
            </button>
          ) : download?.status === 'downloading' ? (
            <div
              className="min-w-[68px] h-[40px] px-2.5 rounded-xl border border-violet-500/30 bg-violet-500/10 flex flex-col justify-center"
              title="Simulating offline download"
            >
              <span className="text-[11px] font-mono tabular-nums text-violet-300 text-center">
                {download.progress}%
              </span>
              <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden mt-0.5">
                <div
                  className="h-full bg-violet-500 transition-all duration-150"
                  style={{ width: `${download.progress}%` }}
                />
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => startSimulatedDownload(episode)}
              title="Simulate offline audio download"
              aria-label={`Download ${episode.title} (simulator)`}
              className="min-w-[40px] min-h-[40px] rounded-xl border border-white/8 bg-white/5 text-slate-300 hover:text-white hover:bg-white/10 flex items-center justify-center transition-colors"
            >
              <Download className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Expandable Chapters & Transcript Toolbar */}
      <div className="mt-3 pt-2.5 border-t border-white/6 flex flex-wrap items-center gap-4 text-xs">
        <button
          type="button"
          onClick={() =>
            setExpandedPanel((prev) => (prev === 'transcript' ? 'none' : 'transcript'))
          }
          className={`flex items-center gap-1.5 py-1 transition-colors ${
            expandedPanel === 'transcript'
              ? 'text-orange-400 font-medium'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <FileText className="w-3.5 h-3.5" />
          <span>Transcript ({episode.language})</span>
          {expandedPanel === 'transcript' ? (
            <ChevronUp className="w-3.5 h-3.5" />
          ) : (
            <ChevronDown className="w-3.5 h-3.5" />
          )}
        </button>

        <button
          type="button"
          onClick={() =>
            setExpandedPanel((prev) => (prev === 'chapters' ? 'none' : 'chapters'))
          }
          className={`flex items-center gap-1.5 py-1 transition-colors ${
            expandedPanel === 'chapters'
              ? 'text-violet-300 font-medium'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <ListMusic className="w-3.5 h-3.5" />
          <span>Chapters ({episode.chapters.length})</span>
          {expandedPanel === 'chapters' ? (
            <ChevronUp className="w-3.5 h-3.5" />
          ) : (
            <ChevronDown className="w-3.5 h-3.5" />
          )}
        </button>
      </div>

      {expandedPanel === 'transcript' && (
        <div className="mt-3 rounded-xl bg-[#12121A] border border-white/6 p-3.5 space-y-2.5">
          {episode.transcript.map((cue, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handleChapterSeek(cue.timeSec)}
              className="w-full text-left flex items-start gap-3 rounded-lg p-2 hover:bg-white/5 transition-colors group"
            >
              <span className="font-mono tabular-nums text-xs text-orange-400 shrink-0 mt-0.5 group-hover:underline">
                {formatDuration(cue.timeSec)}
              </span>
              <div className="min-w-0 flex-1 space-y-1">
                <div className="text-xs font-medium text-violet-300">{cue.speaker}</div>
                <p className="text-sm text-white leading-relaxed">{cue.nativeText}</p>
                <p className="text-xs text-slate-400 leading-relaxed">{cue.text}</p>
              </div>
            </button>
          ))}
        </div>
      )}

      {expandedPanel === 'chapters' && (
        <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
          {episode.chapters.map((ch, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handleChapterSeek(ch.timestampSec)}
              className="flex items-center justify-between gap-3 rounded-xl bg-[#12121A] border border-white/6 px-3.5 py-2.5 text-left hover:border-violet-500/40 hover:bg-white/5 transition-colors"
            >
              <span className="text-xs font-medium text-slate-200 truncate">
                {idx + 1}. {ch.title}
              </span>
              <span className="font-mono tabular-nums text-xs text-orange-400 shrink-0">
                {formatDuration(ch.timestampSec)}
              </span>
            </button>
          ))}
        </div>
      )}
    </article>
  );
};
