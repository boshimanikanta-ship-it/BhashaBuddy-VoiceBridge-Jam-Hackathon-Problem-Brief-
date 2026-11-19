import React, { useEffect, useMemo, useState } from 'react';
import { ArrowRight, Play, Radio, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import { EpisodeRow } from '../components/EpisodeRow';
import { SafeImage } from '../components/SafeImage';
import { ShowCard } from '../components/ShowCard';
import { useAudioPlayer } from '../context/AudioPlayerContext';
import { useLibrary } from '../context/LibraryContext';
import { HERO_STUDIO_IMAGE } from '../data/catalogData';
import { api } from '../services/api';
import type { Episode, LanguageChannel, PodcastShow } from '../types/podcast';
import { formatCompactNumber, formatDuration } from '../utils/formatters';

export const HomePage: React.FC = () => {
  const { playEpisode } = useAudioPlayer();
  const { history } = useLibrary();

  const [shows, setShows] = useState<PodcastShow[]>([]);
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [channels, setChannels] = useState<LanguageChannel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    Promise.all([api.getShows(), api.getEpisodes(), api.getChannels()])
      .then(([showsData, episodesData, channelsData]) => {
        if (!active) return;
        setShows(showsData);
        setEpisodes(episodesData);
        setChannels(channelsData);
      })
      .catch((err) => {
        if (!active) return;
        setError(err instanceof Error ? err.message : 'Failed to load catalog');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const featuredShow = useMemo(
    () => shows.find((s) => s.id === 'show-katha-lok') || shows[0],
    [shows]
  );

  const featuredEpisodes = useMemo(
    () => (featuredShow ? episodes.filter((e) => e.showId === featuredShow.id) : []),
    [episodes, featuredShow]
  );

  const trendingShows = useMemo(() => shows.slice(0, 8), [shows]);
  const recommendedEpisodes = useMemo(() => episodes.slice(0, 6), [episodes]);

  const recentEntries = useMemo(() => {
    const epMap = new Map(episodes.map((e) => [e.id, e]));
    return history
      .map((h) => {
        const ep = epMap.get(h.episodeId);
        return ep ? { episode: ep, positionSec: h.positionSec } : null;
      })
      .filter((item): item is { episode: Episode; positionSec: number } => item !== null)
      .slice(0, 4);
  }, [episodes, history]);

  if (loading) {
    return (
      <div className="space-y-8 animate-pulse" aria-busy="true" aria-label="Loading EchoEpisodes home">
        <div className="h-72 rounded-3xl bg-[#171721]" />
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={i} className="h-24 rounded-2xl bg-[#171721]" />
          ))}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-72 rounded-2xl bg-[#171721]" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl bg-[#171721] border border-orange-500/30 p-8 text-center">
        <p className="text-base font-semibold text-white">{error}</p>
        <p className="mt-1 text-sm text-slate-400">Please refresh to reconnect to the regional broadcast catalog.</p>
      </div>
    );
  }

  return (
    <div className="space-y-10">
      {/* Hero Spotlight */}
      {featuredShow && (
        <section
          aria-label="Featured regional podcast"
          className="relative overflow-hidden rounded-3xl border border-white/10 bg-[#151520]"
        >
          <div className="grid grid-cols-1 lg:grid-cols-12 items-stretch">
            <div className="lg:col-span-7 p-6 sm:p-8 lg:p-10 flex flex-col justify-between gap-6 relative z-10">
              <div>
                <div className="flex flex-wrap items-center gap-2 text-xs text-slate-300">
                  <span className="text-orange-400 font-semibold">Featured Broadcast</span>
                  <span aria-hidden="true">·</span>
                  <span>{featuredShow.language} ({featuredShow.nativeTitle})</span>
                  <span aria-hidden="true">·</span>
                  <span>{featuredShow.genre}</span>
                </div>

                <h1 className="mt-3 text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-white">
                  {featuredShow.title}
                </h1>
                <p className="mt-3 text-sm sm:text-base text-slate-300 max-w-2xl leading-relaxed">
                  {featuredShow.description}
                </p>

                <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-400">
                  <span>
                    Hosted by{' '}
                    <Link
                      to={`/hosts/${featuredShow.hostId}`}
                      className="text-white font-medium hover:text-violet-300 transition-colors"
                    >
                      {featuredShow.hostName}
                    </Link>
                  </span>
                  <span aria-hidden="true">·</span>
                  <span className="tabular-nums">
                    {formatCompactNumber(featuredShow.subscriberCount)} subscribers
                  </span>
                  <span aria-hidden="true">·</span>
                  <span className="tabular-nums">{featuredShow.totalEpisodes} episodes</span>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={() => {
                    if (featuredEpisodes.length > 0) {
                      playEpisode(featuredEpisodes[0], featuredEpisodes, 0);
                    }
                  }}
                  className="px-6 py-3 min-h-[44px] rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-sm font-semibold flex items-center gap-2 shadow-lg shadow-violet-950/50 transition-colors whitespace-nowrap"
                >
                  <Play className="w-4 h-4 fill-current" />
                  <span>Play Now</span>
                </button>
                <Link
                  to="/channels"
                  className="px-5 py-3 min-h-[44px] rounded-xl bg-white/8 hover:bg-white/12 border border-white/10 text-white text-sm font-medium flex items-center gap-2 transition-colors whitespace-nowrap"
                >
                  <span>Explore Channels</span>
                  <ArrowRight className="w-4 h-4 text-orange-400" />
                </Link>
              </div>
            </div>

            <div className="lg:col-span-5 relative min-h-[220px] lg:min-h-full overflow-hidden">
              <SafeImage
                src={HERO_STUDIO_IMAGE}
                alt="EchoEpisodes regional audio broadcast studio"
                fallbackLabel={featuredShow.title}
                className="w-full h-full object-cover lg:absolute lg:inset-0"
              />
              <div className="absolute inset-0 bg-gradient-to-t lg:bg-gradient-to-l from-transparent via-[#151520]/40 to-[#151520]" />
              <div className="absolute bottom-4 right-4 w-24 h-24 sm:w-28 sm:h-28 rounded-2xl overflow-hidden border border-white/20 shadow-2xl">
                <SafeImage
                  src={featuredShow.coverUrl}
                  alt={featuredShow.title}
                  fallbackLabel={featuredShow.title}
                />
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Popular Regional Channels (All 7 Languages) */}
      <section aria-labelledby="home-channels-heading" className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 id="home-channels-heading" className="text-xl sm:text-2xl font-bold text-white">
              Popular Regional Channels
            </h2>
            <p className="text-sm text-slate-400 mt-0.5">
              Switch instantly between 7 Indian regional audio streams
            </p>
          </div>
          <Link
            to="/channels"
            className="text-sm font-medium text-orange-400 hover:text-orange-300 flex items-center gap-1 whitespace-nowrap"
          >
            <span>All channels</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-3">
          {channels.map((ch) => (
            <Link
              key={ch.id}
              to={`/channels/${ch.name}`}
              className="group rounded-2xl bg-[#171721] border border-white/8 hover:border-violet-500/45 hover:bg-[#1D1C2B] p-4 transition-colors flex flex-col justify-between min-h-[110px]"
            >
              <div>
                <div className="text-lg font-bold text-white group-hover:text-orange-400 transition-colors">
                  {ch.nativeName}
                </div>
                <div className="text-sm font-medium text-slate-200 mt-0.5">{ch.name}</div>
              </div>
              <div className="mt-3 text-xs text-slate-400 tabular-nums">
                {ch.showCount || 0} shows · {ch.episodeCount || 0} ep
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Trending Podcasts */}
      <section aria-labelledby="home-trending-heading" className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 id="home-trending-heading" className="text-xl sm:text-2xl font-bold text-white">
              Trending Podcasts
            </h2>
            <p className="text-sm text-slate-400 mt-0.5">
              Regional storytelling, culture, cinema, and technology shows
            </p>
          </div>
          <Link
            to="/explore"
            className="text-sm font-medium text-violet-300 hover:text-violet-200 flex items-center gap-1 whitespace-nowrap"
          >
            <span>Explore all</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {trendingShows.map((show) => (
            <ShowCard key={show.id} show={show} />
          ))}
        </div>
      </section>

      {/* Recently Played */}
      <section aria-labelledby="home-recent-heading" className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <h2 id="home-recent-heading" className="text-xl sm:text-2xl font-bold text-white">
            Recently Played
          </h2>
          {recentEntries.length > 0 && (
            <Link
              to="/recent"
              className="text-sm font-medium text-orange-400 hover:text-orange-300 flex items-center gap-1 whitespace-nowrap"
            >
              <span>Full history</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          )}
        </div>

        {recentEntries.length === 0 ? (
          <div className="rounded-2xl bg-[#171721] border border-white/8 p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-xl bg-violet-600/15 text-violet-300 flex items-center justify-center shrink-0">
                <Radio className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm font-semibold text-white">Start your first regional broadcast</p>
                <p className="text-xs text-slate-400 mt-0.5">
                  Episodes you stream appear here with saved resume timestamps.
                </p>
              </div>
            </div>
            {recommendedEpisodes[0] && (
              <button
                type="button"
                onClick={() => playEpisode(recommendedEpisodes[0], recommendedEpisodes, 0)}
                className="px-4 py-2 min-h-[40px] rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap self-start sm:self-center"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Stream First Episode</span>
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {recentEntries.map(({ episode, positionSec }) => (
              <button
                key={episode.id}
                type="button"
                onClick={() => playEpisode(episode, episodes, positionSec)}
                className="text-left rounded-2xl bg-[#171721] border border-white/8 hover:border-orange-500/40 p-3.5 flex items-center gap-3 transition-colors group"
              >
                <div className="w-14 h-14 rounded-xl overflow-hidden bg-[#111119] shrink-0 relative">
                  <SafeImage src={episode.thumbnailUrl} alt={episode.title} fallbackLabel={episode.showTitle} />
                  <span className="absolute inset-0 bg-black/45 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                    <Play className="w-4 h-4 text-white fill-current" />
                  </span>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-xs text-orange-400 font-medium">{episode.language}</div>
                  <div className="text-sm font-semibold text-white truncate mt-0.5">{episode.title}</div>
                  <div className="text-xs text-slate-400 font-mono tabular-nums mt-0.5">
                    Resume {formatDuration(positionSec)} / {formatDuration(episode.durationSec)}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </section>

      {/* Recommended Episodes */}
      <section aria-labelledby="home-recommended-heading" className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-orange-400" />
            <h2 id="home-recommended-heading" className="text-xl sm:text-2xl font-bold text-white">
              Recommended Episodes
            </h2>
          </div>
          <Link
            to="/explore"
            className="text-sm font-medium text-violet-300 hover:text-violet-200 flex items-center gap-1 whitespace-nowrap"
          >
            <span>Browse all 40 episodes</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="space-y-3">
          {recommendedEpisodes.map((ep) => (
            <EpisodeRow key={ep.id} episode={ep} queueContext={recommendedEpisodes} />
          ))}
        </div>
      </section>
    </div>
  );
};
