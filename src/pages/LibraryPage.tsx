import React, { useEffect, useMemo, useState } from 'react';
import {
  Bookmark,
  BookmarkCheck,
  Clock,
  Download,
  Heart,
  Play,
  Trash2,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { EpisodeRow } from '../components/EpisodeRow';
import { SafeImage } from '../components/SafeImage';
import { ShowCard } from '../components/ShowCard';
import { useAudioPlayer } from '../context/AudioPlayerContext';
import { useLibrary } from '../context/LibraryContext';
import { api } from '../services/api';
import type { Episode, PodcastShow } from '../types/podcast';
import { formatDateLabel, formatDuration } from '../utils/formatters';

type LibraryTab = 'all' | 'bookmarks' | 'timestamps' | 'favorites' | 'recent' | 'downloads';

interface LibraryPageProps {
  defaultTab?: LibraryTab;
}

export const LibraryPage: React.FC<LibraryPageProps> = ({ defaultTab = 'all' }) => {
  const {
    bookmarks,
    favorites,
    history,
    downloads,
    removeBookmarkById,
    clearHistoryWithConfirm,
    removeDownloadWithConfirm,
  } = useLibrary();
  const { playEpisode } = useAudioPlayer();

  const [activeTab, setActiveTab] = useState<LibraryTab>(defaultTab);
  const [shows, setShows] = useState<PodcastShow[]>([]);
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setActiveTab(defaultTab);
  }, [defaultTab]);

  useEffect(() => {
    let active = true;
    Promise.all([api.getShows(), api.getEpisodes()])
      .then(([s, e]) => {
        if (!active) return;
        setShows(s);
        setEpisodes(e);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const showMap = useMemo(() => new Map(shows.map((s) => [s.id, s])), [shows]);
  const episodeMap = useMemo(() => new Map(episodes.map((e) => [e.id, e])), [episodes]);

  const bookmarkedEpisodes = useMemo(() => {
    return bookmarks
      .filter((b) => b.timestampSec === null)
      .map((b) => ({ bookmark: b, episode: episodeMap.get(b.episodeId) }))
      .filter((x): x is { bookmark: typeof bookmarks[number]; episode: Episode } => Boolean(x.episode));
  }, [bookmarks, episodeMap]);

  const timestampedBookmarks = useMemo(() => {
    return bookmarks
      .filter((b) => b.timestampSec !== null)
      .map((b) => ({ bookmark: b, episode: episodeMap.get(b.episodeId) }))
      .filter((x): x is { bookmark: typeof bookmarks[number]; episode: Episode } => Boolean(x.episode));
  }, [bookmarks, episodeMap]);

  const favoriteShows = useMemo(() => {
    return favorites
      .map((f) => showMap.get(f.showId))
      .filter((s): s is PodcastShow => Boolean(s));
  }, [favorites, showMap]);

  const recentEpisodes = useMemo(() => {
    return history
      .map((h) => ({ history: h, episode: episodeMap.get(h.episodeId) }))
      .filter((x): x is { history: typeof history[number]; episode: Episode } => Boolean(x.episode));
  }, [episodeMap, history]);

  const downloadedItems = useMemo(() => {
    return downloads
      .map((d) => ({ download: d, episode: episodeMap.get(d.episodeId) }))
      .filter((x): x is { download: typeof downloads[number]; episode: Episode } => Boolean(x.episode));
  }, [downloads, episodeMap]);

  const tabs: Array<{ id: LibraryTab; label: string; count: number }> = [
    { id: 'all', label: 'All Library', count: bookmarkedEpisodes.length + favoriteShows.length + timestampedBookmarks.length },
    { id: 'bookmarks', label: 'Bookmarked Episodes', count: bookmarkedEpisodes.length },
    { id: 'timestamps', label: 'Timestamped Moments', count: timestampedBookmarks.length },
    { id: 'favorites', label: 'Favorite Shows', count: favoriteShows.length },
    { id: 'recent', label: 'Recently Played', count: recentEpisodes.length },
    { id: 'downloads', label: 'Downloads', count: downloadedItems.length },
  ];

  const pageHeading =
    activeTab === 'favorites'
      ? 'Favorite Shows'
      : activeTab === 'downloads'
      ? 'Offline Downloads Simulator'
      : activeTab === 'recent'
      ? 'Recently Played'
      : 'My Audio Library';

  return (
    <div className="space-y-8">
      <div className="space-y-3">
        <h1 className="text-2xl sm:text-3xl font-bold text-white">{pageHeading}</h1>
        <p className="text-sm text-slate-400">
          Your personal regional radio collection—synced automatically with SQLite and LocalStorage.
        </p>

        <div className="pt-2 flex flex-wrap items-center gap-2">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`px-3.5 py-2 min-h-[40px] rounded-xl text-xs font-medium transition-colors whitespace-nowrap flex items-center gap-2 ${
                activeTab === tab.id
                  ? 'bg-violet-600 text-white'
                  : 'bg-[#171721] border border-white/8 text-slate-300 hover:text-white'
              }`}
            >
              <span>{tab.label}</span>
              <span className="font-mono tabular-nums opacity-75">{tab.count}</span>
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="space-y-3 animate-pulse">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-28 rounded-2xl bg-[#171721]" />
          ))}
        </div>
      ) : (
        <div className="space-y-10">
          {/* Bookmarked Episodes */}
          {(activeTab === 'all' || activeTab === 'bookmarks') && (
            <section className="space-y-4">
              <div className="flex items-center gap-2">
                <Bookmark className="w-5 h-5 text-orange-400" />
                <h2 className="text-xl font-bold text-white">
                  Bookmarked Episodes ({bookmarkedEpisodes.length})
                </h2>
              </div>

              {bookmarkedEpisodes.length === 0 ? (
                <div className="rounded-2xl bg-[#171721] border border-white/8 p-8 text-center space-y-3">
                  <p className="text-sm font-medium text-white">No bookmarked episodes yet</p>
                  <p className="text-xs text-slate-400 max-w-md mx-auto">
                    Click the bookmark ribbon on any episode card or inside the audio player to save it here for quick listening.
                  </p>
                  <Link
                    to="/explore"
                    className="inline-flex px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold"
                  >
                    Discover Episodes
                  </Link>
                </div>
              ) : (
                <div className="space-y-3">
                  {bookmarkedEpisodes.map(({ episode }) => (
                    <EpisodeRow
                      key={episode.id}
                      episode={episode}
                      queueContext={bookmarkedEpisodes.map((x) => x.episode)}
                    />
                  ))}
                </div>
              )}
            </section>
          )}

          {/* Timestamped Bookmarks */}
          {(activeTab === 'all' || activeTab === 'timestamps') && (
            <section className="space-y-4">
              <div className="flex items-center gap-2">
                <BookmarkCheck className="w-5 h-5 text-violet-400" />
                <h2 className="text-xl font-bold text-white">
                  Timestamped Bookmarks ({timestampedBookmarks.length})
                </h2>
              </div>

              {timestampedBookmarks.length === 0 ? (
                <div className="rounded-2xl bg-[#171721] border border-white/8 p-6 text-sm text-slate-400">
                  While streaming any episode, click the <span className="text-orange-400 font-medium">Bookmark+</span> icon in the bottom player to save an exact playback timestamp.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {timestampedBookmarks.map(({ bookmark, episode }) => (
                    <div
                      key={bookmark.id}
                      className="rounded-2xl bg-[#171721] border border-white/8 p-4 flex items-center justify-between gap-3"
                    >
                      <button
                        type="button"
                        onClick={() => playEpisode(episode, [episode], bookmark.timestampSec || 0)}
                        className="flex items-center gap-3 min-w-0 flex-1 text-left group"
                      >
                        <div className="w-12 h-12 rounded-xl overflow-hidden bg-[#111119] shrink-0 relative">
                          <SafeImage src={episode.thumbnailUrl} alt={episode.title} />
                          <span className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                            <Play className="w-4 h-4 text-white fill-current" />
                          </span>
                        </div>
                        <div className="min-w-0">
                          <div className="text-xs font-mono tabular-nums text-orange-400">
                            Jump to {formatDuration(bookmark.timestampSec || 0)} · {episode.language}
                          </div>
                          <div className="text-sm font-semibold text-white truncate group-hover:text-violet-300">
                            {episode.title}
                          </div>
                          <div className="text-xs text-slate-400 truncate">{bookmark.note}</div>
                        </div>
                      </button>
                      <button
                        type="button"
                        onClick={() => removeBookmarkById(bookmark.id, `"${bookmark.note}"`)}
                        aria-label="Delete timestamp bookmark"
                        className="min-w-[36px] min-h-[36px] rounded-lg flex items-center justify-center text-slate-400 hover:text-orange-400 hover:bg-white/5"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </section>
          )}

          {/* Favorite Shows */}
          {(activeTab === 'all' || activeTab === 'favorites') && (
            <section className="space-y-4">
              <div className="flex items-center gap-2">
                <Heart className="w-5 h-5 text-orange-400" />
                <h2 className="text-xl font-bold text-white">
                  Favorite Shows ({favoriteShows.length})
                </h2>
              </div>

              {favoriteShows.length === 0 ? (
                <div className="rounded-2xl bg-[#171721] border border-white/8 p-8 text-center space-y-3">
                  <p className="text-sm font-medium text-white">No favorite shows saved</p>
                  <p className="text-xs text-slate-400">
                    Tap the heart button on any regional podcast show to pin it here.
                  </p>
                  <Link
                    to="/channels"
                    className="inline-flex px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold"
                  >
                    Browse Language Channels
                  </Link>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                  {favoriteShows.map((s) => (
                    <ShowCard key={s.id} show={s} />
                  ))}
                </div>
              )}
            </section>
          )}

          {/* Recently Played */}
          {(activeTab === 'all' || activeTab === 'recent') && (
            <section className="space-y-4">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <Clock className="w-5 h-5 text-violet-400" />
                  <h2 className="text-xl font-bold text-white">
                    Recently Played ({recentEpisodes.length})
                  </h2>
                </div>
                {recentEpisodes.length > 0 && (
                  <button
                    type="button"
                    onClick={clearHistoryWithConfirm}
                    className="text-xs font-medium text-slate-400 hover:text-orange-400 transition-colors"
                  >
                    Clear History
                  </button>
                )}
              </div>

              {recentEpisodes.length === 0 ? (
                <div className="rounded-2xl bg-[#171721] border border-white/8 p-6 text-sm text-slate-400">
                  No listening history recorded yet. Start streaming any episode to track progress and resume later.
                </div>
              ) : (
                <div className="space-y-3">
                  {recentEpisodes.map(({ episode, history: h }) => (
                    <EpisodeRow
                      key={episode.id}
                      episode={episode}
                      resumeSec={h.positionSec}
                      queueContext={recentEpisodes.map((r) => r.episode)}
                    />
                  ))}
                </div>
              )}
            </section>
          )}

          {/* Downloaded Episodes (Offline Simulator) */}
          {(activeTab === 'all' || activeTab === 'downloads') && (
            <section className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Download className="w-5 h-5 text-emerald-400" />
                  <h2 className="text-xl font-bold text-white">
                    Downloaded Episodes ({downloadedItems.length})
                  </h2>
                </div>
                <span className="text-xs text-slate-400">
                  Offline Cache Simulator · Plays locally via Web Audio / browser state
                </span>
              </div>

              {downloadedItems.length === 0 ? (
                <div className="rounded-2xl bg-[#171721] border border-white/8 p-6 text-sm text-slate-400">
                  Use the Download button on any episode to simulate offline audio caching with live progress tracking.
                </div>
              ) : (
                <div className="space-y-3">
                  {downloadedItems.map(({ download, episode }) => (
                    <div
                      key={episode.id}
                      className="rounded-2xl bg-[#171721] border border-white/8 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                    >
                      <div className="flex items-center gap-3.5 min-w-0">
                        <div className="w-14 h-14 rounded-xl overflow-hidden bg-[#111119] shrink-0">
                          <SafeImage src={episode.thumbnailUrl} alt={episode.title} />
                        </div>
                        <div className="min-w-0">
                          <div className="text-xs text-emerald-400 font-medium">
                            {download.status === 'downloaded'
                              ? `Simulated Offline Ready · ${download.sizeMb} MB`
                              : `Caching ${download.progress}%...`}
                            {download.downloadedAt && ` · ${formatDateLabel(download.downloadedAt)}`}
                          </div>
                          <div className="text-sm font-semibold text-white truncate mt-0.5">
                            {episode.title}
                          </div>
                          <div className="text-xs text-slate-400 truncate">
                            {episode.showTitle} · {episode.language}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => playEpisode(episode, [episode], 0)}
                          className="px-4 py-2 min-h-[40px] rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold flex items-center gap-1.5"
                        >
                          <Play className="w-3.5 h-3.5 fill-current" />
                          <span>Play Cached</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => removeDownloadWithConfirm(episode.id, episode.title)}
                          aria-label={`Remove cached ${episode.title}`}
                          className="min-w-[40px] min-h-[40px] rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-orange-400 flex items-center justify-center"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          )}
        </div>
      )}
    </div>
  );
};
