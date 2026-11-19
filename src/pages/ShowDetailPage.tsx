import React, { useEffect, useState } from 'react';
import { ArrowLeft, Bell, BellOff, Heart, Play, User } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { EpisodeRow } from '../components/EpisodeRow';
import { SafeImage } from '../components/SafeImage';
import { useAudioPlayer } from '../context/AudioPlayerContext';
import { useLibrary } from '../context/LibraryContext';
import { api } from '../services/api';
import type { Episode, Host, PodcastShow } from '../types/podcast';
import { formatCompactNumber } from '../utils/formatters';

export const ShowDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { playEpisode } = useAudioPlayer();
  const { isShowFavorite, toggleFavoriteShow, isSubscribed, toggleSubscription } = useLibrary();

  const [show, setShow] = useState<PodcastShow | null>(null);
  const [host, setHost] = useState<Host | null>(null);
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    let active = true;
    setLoading(true);
    setError(null);

    api
      .getShowDetail(id)
      .then((res) => {
        if (!active) return;
        setShow(res.show);
        setHost(res.host);
        setEpisodes(res.episodes);
      })
      .catch((err) => {
        if (!active) return;
        setError(err instanceof Error ? err.message : 'Unable to load podcast details');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [id]);

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-64 rounded-3xl bg-[#171721]" />
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-28 rounded-2xl bg-[#171721]" />
          ))}
        </div>
      </div>
    );
  }

  if (error || !show) {
    return (
      <div className="rounded-3xl bg-[#171721] border border-white/10 p-8 text-center space-y-3">
        <h1 className="text-xl font-bold text-white">{error || 'Show not found'}</h1>
        <Link
          to="/explore"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-violet-600 text-white text-sm font-medium"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Explore</span>
        </Link>
      </div>
    );
  }

  const favored = isShowFavorite(show.id);
  const subscribed = isSubscribed(show.id);
  const displaySubscribers = show.subscriberCount + (subscribed ? 1 : 0);

  return (
    <div className="space-y-8">
      <Link
        to={`/channels/${show.language}`}
        className="inline-flex items-center gap-2 text-xs font-medium text-slate-400 hover:text-white transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to {show.language} Channel</span>
      </Link>

      {/* Show Overview Header */}
      <section className="rounded-3xl bg-[#171721] border border-white/10 p-6 sm:p-8">
        <div className="flex flex-col md:flex-row gap-6 lg:gap-8">
          <div className="w-44 h-44 sm:w-52 sm:h-52 rounded-2xl overflow-hidden bg-[#111119] border border-white/10 shrink-0 self-start shadow-2xl">
            <SafeImage src={show.coverUrl} alt={show.title} fallbackLabel={show.title} />
          </div>

          <div className="flex-1 min-w-0 flex flex-col justify-between gap-5">
            <div>
              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-300">
                <span className="text-orange-400 font-semibold">{show.language}</span>
                <span aria-hidden="true">·</span>
                <span>{show.genre}</span>
                <span aria-hidden="true">·</span>
                <span className="tabular-nums">{episodes.length} episodes</span>
                <span aria-hidden="true">·</span>
                <span className="tabular-nums">{formatCompactNumber(displaySubscribers)} subscribers</span>
              </div>

              <h1 className="mt-2 text-2xl sm:text-4xl font-bold text-white tracking-tight">
                {show.title}
              </h1>
              <p className="text-sm font-medium text-violet-300 mt-1">
                {show.nativeTitle} · {show.subtitle}
              </p>

              <p className="mt-3 text-sm sm:text-base text-slate-300 leading-relaxed max-w-3xl">
                {show.description}
              </p>

              {host && (
                <div className="mt-4 inline-flex items-center gap-3">
                  <Link
                    to={`/hosts/${host.id}`}
                    className="inline-flex items-center gap-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/8 px-3 py-2 transition-colors"
                  >
                    <div className="w-7 h-7 rounded-lg overflow-hidden bg-[#111119]">
                      <SafeImage src={host.avatarUrl} alt={host.name} />
                    </div>
                    <div className="text-left">
                      <div className="text-xs font-semibold text-white flex items-center gap-1">
                        <User className="w-3 h-3 text-orange-400" />
                        <span>{host.name}</span>
                      </div>
                      <div className="text-[11px] text-slate-400">
                        View Host Profile · {host.city}
                      </div>
                    </div>
                  </Link>
                </div>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {episodes.length > 0 && (
                <button
                  type="button"
                  onClick={() => playEpisode(episodes[0], episodes, 0)}
                  className="px-5 py-2.5 min-h-[44px] rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-sm font-semibold flex items-center gap-2 transition-colors whitespace-nowrap"
                >
                  <Play className="w-4 h-4 fill-current" />
                  <span>Play Episode 1</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => toggleSubscription(show.id, 'show', show.title)}
                className={`px-4 py-2.5 min-h-[44px] rounded-xl border text-sm font-medium flex items-center gap-2 transition-colors whitespace-nowrap ${
                  subscribed
                    ? 'bg-violet-600/20 border-violet-500/45 text-violet-200'
                    : 'bg-white/5 border-white/10 text-slate-200 hover:bg-white/10'
                }`}
              >
                {subscribed ? (
                  <>
                    <BellOff className="w-4 h-4 text-violet-300" />
                    <span>Subscribed</span>
                  </>
                ) : (
                  <>
                    <Bell className="w-4 h-4" />
                    <span>Subscribe</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => toggleFavoriteShow(show.id, show.title)}
                className={`px-4 py-2.5 min-h-[44px] rounded-xl border text-sm font-medium flex items-center gap-2 transition-colors whitespace-nowrap ${
                  favored
                    ? 'bg-orange-500/15 border-orange-500/45 text-orange-300'
                    : 'bg-white/5 border-white/10 text-slate-200 hover:bg-white/10'
                }`}
              >
                <Heart className={`w-4 h-4 ${favored ? 'fill-current text-orange-400' : ''}`} />
                <span>{favored ? 'Favorited' : 'Favorite'}</span>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Episode List */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-white">All Episodes ({episodes.length})</h2>
        </div>
        <div className="space-y-3">
          {episodes.map((ep) => (
            <EpisodeRow key={ep.id} episode={ep} queueContext={episodes} />
          ))}
        </div>
      </section>
    </div>
  );
};
