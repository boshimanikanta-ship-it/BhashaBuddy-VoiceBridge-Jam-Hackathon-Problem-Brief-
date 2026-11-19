import React, { useEffect, useState } from 'react';
import { Grid } from 'lucide-react';
import { EpisodeRow } from '../components/EpisodeRow';
import { ShowCard } from '../components/ShowCard';
import { CULTURAL_GENRES } from '../data/catalogData';
import { api } from '../services/api';
import type { CulturalGenre, Episode, PodcastShow } from '../types/podcast';

export const CategoriesPage: React.FC = () => {
  const [activeGenre, setActiveGenre] = useState<CulturalGenre | 'All'>('Folklore');
  const [shows, setShows] = useState<PodcastShow[]>([]);
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);
    Promise.all([
      api.getShows({ genre: activeGenre }),
      api.getEpisodes({ genre: activeGenre }),
    ])
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
  }, [activeGenre]);

  return (
    <div className="space-y-8">
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-xs font-medium text-orange-400">
          <Grid className="w-4 h-4" />
          <span>Cultural Themes & Programming</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold text-white">Browse by Category</h1>
        <p className="text-sm text-slate-400 max-w-2xl">
          Discover regional programs across folklore, history, education, technology, cinema, music, literature, and local reporting.
        </p>

        <div className="pt-2 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveGenre('All')}
            className={`px-4 py-2 min-h-[40px] rounded-xl text-sm font-medium transition-colors whitespace-nowrap ${
              activeGenre === 'All'
                ? 'bg-violet-600 text-white'
                : 'bg-[#171721] border border-white/8 text-slate-300 hover:text-white'
            }`}
          >
            All Categories
          </button>
          {CULTURAL_GENRES.map((genre) => (
            <button
              key={genre}
              type="button"
              onClick={() => setActiveGenre(genre)}
              className={`px-4 py-2 min-h-[40px] rounded-xl text-sm font-medium transition-colors whitespace-nowrap ${
                activeGenre === genre
                  ? 'bg-violet-600 text-white'
                  : 'bg-[#171721] border border-white/8 text-slate-300 hover:text-white'
              }`}
            >
              {genre}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 animate-pulse">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-64 rounded-2xl bg-[#171721]" />
          ))}
        </div>
      ) : (
        <>
          {shows.length > 0 && (
            <section className="space-y-4">
              <h2 className="text-xl font-bold text-white">
                {activeGenre === 'All' ? 'All Shows' : `${activeGenre} Shows`} ({shows.length})
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                {shows.map((s) => (
                  <ShowCard key={s.id} show={s} />
                ))}
              </div>
            </section>
          )}

          <section className="space-y-4">
            <h2 className="text-xl font-bold text-white">
              {activeGenre === 'All' ? 'All Episodes' : `${activeGenre} Episodes`} ({episodes.length})
            </h2>
            {episodes.length === 0 ? (
              <div className="rounded-2xl bg-[#171721] border border-white/8 p-8 text-center text-sm text-slate-400">
                No episodes currently tagged exclusively under {activeGenre}. Try selecting All Categories or Explore search for topic-level matches.
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
