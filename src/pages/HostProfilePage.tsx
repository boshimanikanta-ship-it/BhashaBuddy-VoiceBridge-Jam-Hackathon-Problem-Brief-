import React, { useEffect, useState } from 'react';
import { ArrowLeft, Bell, BellOff, ExternalLink, Headphones, MapPin } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { EpisodeRow } from '../components/EpisodeRow';
import { SafeImage } from '../components/SafeImage';
import { ShowCard } from '../components/ShowCard';
import { useLibrary } from '../context/LibraryContext';
import { api } from '../services/api';
import type { Episode, Host, PodcastShow } from '../types/podcast';
import { formatCompactNumber } from '../utils/formatters';

export const HostProfilePage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { isSubscribed, toggleSubscription } = useLibrary();

  const [host, setHost] = useState<Host | null>(null);
  const [shows, setShows] = useState<PodcastShow[]>([]);
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    let active = true;
    setLoading(true);
    setError(null);

    api
      .getHostDetail(id)
      .then((res) => {
        if (!active) return;
        setHost(res.host);
        setShows(res.shows);
        setEpisodes(res.episodes);
      })
      .catch((err) => {
        if (!active) return;
        setError(err instanceof Error ? err.message : 'Unable to load host profile');
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
        <div className="h-56 rounded-3xl bg-[#171721]" />
        <div className="h-44 rounded-2xl bg-[#171721]" />
      </div>
    );
  }

  if (error || !host) {
    return (
      <div className="rounded-3xl bg-[#171721] border border-white/10 p-8 text-center space-y-3">
        <h1 className="text-xl font-bold text-white">{error || 'Host not found'}</h1>
        <Link
          to="/explore"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-violet-600 text-white text-sm font-medium"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Explore Creators</span>
        </Link>
      </div>
    );
  }

  const subscribed = isSubscribed(host.id);
  const displaySubs = host.subscriberCount + (subscribed ? 1 : 0);

  return (
    <div className="space-y-8">
      <Link
        to="/explore"
        className="inline-flex items-center gap-2 text-xs font-medium text-slate-400 hover:text-white transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to Explore</span>
      </Link>

      {/* Host Profile Banner */}
      <section className="rounded-3xl bg-[#171721] border border-white/10 p-6 sm:p-8">
        <div className="flex flex-col md:flex-row gap-6 lg:gap-8 items-start">
          <div className="w-32 h-32 sm:w-40 sm:h-40 rounded-2xl overflow-hidden bg-[#111119] border border-white/10 shrink-0 shadow-xl">
            <SafeImage src={host.avatarUrl} alt={host.name} fallbackLabel={host.name} />
          </div>

          <div className="flex-1 min-w-0 space-y-4">
            <div>
              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-300">
                <span className="text-orange-400 font-semibold">{host.language} Creator</span>
                <span aria-hidden="true">·</span>
                <span className="inline-flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-slate-400" />
                  {host.city}
                </span>
              </div>

              <h1 className="mt-2 text-2xl sm:text-4xl font-bold text-white">{host.name}</h1>
              <p className="text-sm font-medium text-violet-300 mt-0.5">{host.nativeName}</p>
              <p className="mt-3 text-sm sm:text-base text-slate-300 leading-relaxed max-w-3xl">
                {host.bio}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-6 pt-1 text-sm">
              <div>
                <div className="text-xs text-slate-400">Total Listens</div>
                <div className="font-mono tabular-nums font-semibold text-white flex items-center gap-1.5 mt-0.5">
                  <Headphones className="w-4 h-4 text-orange-400" />
                  {formatCompactNumber(host.totalListens)}
                </div>
              </div>
              <div>
                <div className="text-xs text-slate-400">Subscribers</div>
                <div className="font-mono tabular-nums font-semibold text-white mt-0.5">
                  {formatCompactNumber(displaySubs)}
                </div>
              </div>
              <div>
                <div className="text-xs text-slate-400">Programs</div>
                <div className="font-mono tabular-nums font-semibold text-white mt-0.5">
                  {shows.length} shows · {episodes.length} episodes
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 pt-1">
              <button
                type="button"
                onClick={() => toggleSubscription(host.id, 'host', host.name)}
                className={`px-5 py-2.5 min-h-[44px] rounded-xl text-sm font-semibold flex items-center gap-2 transition-colors whitespace-nowrap ${
                  subscribed
                    ? 'bg-violet-600/20 border border-violet-500/45 text-violet-200'
                    : 'bg-violet-600 hover:bg-violet-500 text-white'
                }`}
              >
                {subscribed ? (
                  <>
                    <BellOff className="w-4 h-4" />
                    <span>Subscribed</span>
                  </>
                ) : (
                  <>
                    <Bell className="w-4 h-4" />
                    <span>Subscribe to Host</span>
                  </>
                )}
              </button>

              {Object.entries(host.socials).map(([platform, url]) =>
                url ? (
                  <a
                    key={platform}
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3.5 py-2 min-h-[40px] rounded-xl bg-white/5 hover:bg-white/10 border border-white/8 text-xs font-medium text-slate-200 inline-flex items-center gap-1.5 capitalize transition-colors"
                  >
                    <span>{platform === 'x' ? 'X / Twitter' : platform}</span>
                    <ExternalLink className="w-3 h-3 text-slate-400" />
                  </a>
                ) : null
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Hosted Shows */}
      <section className="space-y-4">
        <h2 className="text-xl font-bold text-white">Podcast Shows by {host.name}</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {shows.map((s) => (
            <ShowCard key={s.id} show={s} />
          ))}
        </div>
      </section>

      {/* Episode Discography */}
      <section className="space-y-4">
        <h2 className="text-xl font-bold text-white">Published Episode Discography ({episodes.length})</h2>
        <div className="space-y-3">
          {episodes.map((ep) => (
            <EpisodeRow key={ep.id} episode={ep} queueContext={episodes} />
          ))}
        </div>
      </section>
    </div>
  );
};
