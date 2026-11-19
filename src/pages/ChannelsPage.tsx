import React, { useEffect, useMemo, useState } from 'react';
import { Globe2 } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { EpisodeRow } from '../components/EpisodeRow';
import { ShowCard } from '../components/ShowCard';
import { CULTURAL_GENRES } from '../data/catalogData';
import { api } from '../services/api';
import type { Episode, LanguageChannel, PodcastShow } from '../types/podcast';

export const ChannelsPage: React.FC = () => {
  const { lang } = useParams<{ lang?: string }>();
  const navigate = useNavigate();

  const [channels, setChannels] = useState<LanguageChannel[]>([]);
  const [shows, setShows] = useState<PodcastShow[]>([]);
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [selectedGenre, setSelectedGenre] = useState<string>('All');
  const [loading, setLoading] = useState(true);

  const activeLanguage = useMemo(() => {
    if (!lang) return 'Hindi';
    const matched = channels.find((c) => c.name.toLowerCase() === lang.toLowerCase());
    return matched ? matched.name : lang;
  }, [channels, lang]);

  useEffect(() => {
    api.getChannels().then(setChannels);
  }, []);

  useEffect(() => {
    let active = true;
    setLoading(true);
    Promise.all([
      api.getShows({ language: activeLanguage, genre: selectedGenre }),
      api.getEpisodes({ language: activeLanguage, genre: selectedGenre }),
    ])
      .then(([showsData, epsData]) => {
        if (!active) return;
        setShows(showsData);
        setEpisodes(epsData);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [activeLanguage, selectedGenre]);

  const currentChannel = useMemo(
    () => channels.find((c) => c.name.toLowerCase() === activeLanguage.toLowerCase()) || channels[0],
    [activeLanguage, channels]
  );

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-2 text-xs font-medium text-orange-400">
          <Globe2 className="w-4 h-4" />
          <span>Regional Language Broadcast Catalog</span>
        </div>

        {/* Language Switcher Tabs */}
        <div className="flex flex-wrap items-center gap-2">
          {channels.map((ch) => {
            const isActive = ch.name.toLowerCase() === activeLanguage.toLowerCase();
            return (
              <button
                key={ch.id}
                type="button"
                onClick={() => {
                  setSelectedGenre('All');
                  navigate(`/channels/${ch.name}`);
                }}
                className={`px-4 py-2 min-h-[42px] rounded-xl text-sm font-medium transition-colors whitespace-nowrap shrink-0 flex items-center gap-2 ${
                  isActive
                    ? 'bg-violet-600 text-white shadow-md shadow-violet-950/40'
                    : 'bg-[#171721] border border-white/8 text-slate-300 hover:text-white hover:bg-[#1E1E2B]'
                }`}
              >
                <span>{ch.name}</span>
                <span className="text-xs opacity-80">{ch.nativeName}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Active Language Hero Header */}
      {currentChannel && (
        <section className="rounded-3xl bg-[#171721] border border-white/10 p-6 sm:p-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div className="max-w-2xl">
              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
                <span className="text-orange-400 font-medium">{currentChannel.regionLabel}</span>
                <span aria-hidden="true">·</span>
                <span>{currentChannel.scriptFamily}</span>
                <span aria-hidden="true">·</span>
                <span className="tabular-nums">{currentChannel.showCount || shows.length} shows</span>
              </div>
              <h1 className="mt-2 text-2xl sm:text-3xl font-bold text-white">
                {currentChannel.name} Channel · {currentChannel.nativeName}
              </h1>
              <p className="mt-2 text-sm text-slate-300 leading-relaxed">
                {currentChannel.description}
              </p>
            </div>
          </div>

          {/* Cultural Genre Filter Bar */}
          <div className="mt-6 pt-5 border-t border-white/8 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setSelectedGenre('All')}
              className={`px-3.5 py-1.5 min-h-[36px] rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
                selectedGenre === 'All'
                  ? 'bg-orange-500 text-white'
                  : 'bg-white/5 text-slate-300 hover:text-white hover:bg-white/10'
              }`}
            >
              All Themes
            </button>
            {CULTURAL_GENRES.map((genre) => (
              <button
                key={genre}
                type="button"
                onClick={() => setSelectedGenre(genre)}
                className={`px-3.5 py-1.5 min-h-[36px] rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
                  selectedGenre === genre
                    ? 'bg-orange-500 text-white'
                    : 'bg-white/5 text-slate-300 hover:text-white hover:bg-white/10'
                }`}
              >
                {genre}
              </button>
            ))}
          </div>
        </section>
      )}

      {loading ? (
        <div className="space-y-4 animate-pulse">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-64 rounded-2xl bg-[#171721]" />
            ))}
          </div>
        </div>
      ) : (
        <>
          {/* Podcast Shows Grid */}
          <section className="space-y-4">
            <h2 className="text-xl font-bold text-white">
              Popular {activeLanguage} Shows
              {selectedGenre !== 'All' ? ` · ${selectedGenre}` : ''}
            </h2>
            {shows.length === 0 ? (
              <div className="rounded-2xl bg-[#171721] border border-white/8 p-8 text-center">
                <p className="text-sm font-medium text-white">
                  No {activeLanguage} shows match the “{selectedGenre}” filter.
                </p>
                <button
                  type="button"
                  onClick={() => setSelectedGenre('All')}
                  className="mt-3 px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold"
                >
                  Show all {activeLanguage} programs
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                {shows.map((s) => (
                  <ShowCard key={s.id} show={s} />
                ))}
              </div>
            )}
          </section>

          {/* Trending Episodes in Language */}
          <section className="space-y-4">
            <h2 className="text-xl font-bold text-white">
              Trending {activeLanguage} Episodes ({episodes.length})
            </h2>
            {episodes.length === 0 ? (
              <div className="rounded-2xl bg-[#171721] border border-white/8 p-6 text-sm text-slate-400">
                Try switching genre filters above to hear more episodes in {activeLanguage}.
              </div>
            ) : (
              <div className="space-y-3">
                {episodes.map((ep) => (
                  <EpisodeRow key={ep.id} episode={ep} queueContext={episodes} />
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
};
