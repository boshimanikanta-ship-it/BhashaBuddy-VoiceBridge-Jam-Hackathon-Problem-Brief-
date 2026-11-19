import React, { useEffect, useState } from 'react';
import { Search, X } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { EpisodeRow } from '../components/EpisodeRow';
import { ShowCard } from '../components/ShowCard';
import { CULTURAL_GENRES, REGIONAL_LANGUAGES } from '../data/catalogData';
import { api } from '../services/api';
import type { Episode, PodcastShow } from '../types/podcast';

const QUICK_SEARCH_SUGGESTIONS = [
  'Folklore',
  'लोककथा',
  'தமிழ்',
  'Cinema',
  'Technology',
  'বাংলা',
  'తెలుగు',
  'മലയാളം',
  'ಕನ್ನಡ',
];

export const ExplorePage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialQuery = searchParams.get('q') || '';

  const [query, setQuery] = useState(initialQuery);
  const [language, setLanguage] = useState('All');
  const [genre, setGenre] = useState('All');
  const [shows, setShows] = useState<PodcastShow[]>([]);
  const [episodes, setEpisodes] = useState<Array<Episode & { matchedSnippet?: string }>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const paramQ = searchParams.get('q') || '';
    if (paramQ !== query) {
      setQuery(paramQ);
    }
  }, [searchParams]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    const timer = window.setTimeout(() => {
      api
        .search(query.normalize('NFC'), { language, genre })
        .then((res) => {
          if (!active) return;
          setShows(res.shows);
          setEpisodes(res.episodes);
        })
        .finally(() => {
          if (active) setLoading(false);
        });
    }, 120);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [genre, language, query]);

  const handleQueryChange = (val: string) => {
    const normalized = val.normalize('NFC');
    setQuery(normalized);
    if (normalized.trim()) {
      setSearchParams({ q: normalized }, { replace: true });
    } else {
      setSearchParams({}, { replace: true });
    }
  };

  const clearFilters = () => {
    setQuery('');
    setLanguage('All');
    setGenre('All');
    setSearchParams({}, { replace: true });
  };

  return (
    <div className="space-y-8">
      {/* Search Header */}
      <section className="rounded-3xl bg-[#171721] border border-white/10 p-6 sm:p-8 space-y-5">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white">
            Explore & Transcript Search
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Search episode titles, hosts, shows, spoken topics, and transcripts in English or native Indic scripts (Devanagari, Tamil, Bengali, Telugu, Malayalam, Kannada).
          </p>
        </div>

        <div className="relative flex items-center">
          <Search className="w-5 h-5 text-slate-400 absolute left-4 pointer-events-none" />
          <input
            type="search"
            value={query}
            onChange={(e) => handleQueryChange(e.target.value)}
            placeholder="Try “Folklore”, “Madras Melodies”, “लोककथा”, “தமிழ்”, or “বাংলা”..."
            aria-label="Search episodes, transcripts, shows, and hosts"
            className="w-full h-12 pl-12 pr-12 rounded-2xl bg-[#0E0E13] border border-white/12 text-sm sm:text-base text-white placeholder:text-slate-500 focus:outline-none focus:border-violet-500"
          />
          {query && (
            <button
              type="button"
              onClick={() => handleQueryChange('')}
              aria-label="Clear search"
              className="absolute right-3 min-w-[36px] min-h-[36px] rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Instant Search Suggestions */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="text-slate-400 mr-1">Try searching:</span>
          {QUICK_SEARCH_SUGGESTIONS.map((term) => (
            <button
              key={term}
              type="button"
              onClick={() => handleQueryChange(term)}
              className={`px-3 py-1.5 rounded-lg border transition-colors whitespace-nowrap ${
                query.normalize('NFC').toLowerCase() === term.normalize('NFC').toLowerCase()
                  ? 'bg-orange-500 border-orange-400 text-white'
                  : 'bg-white/5 border-white/8 text-slate-300 hover:text-white hover:bg-white/10'
              }`}
            >
              {term}
            </button>
          ))}
        </div>

        {/* Language & Genre Filters */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-white/8">
          <div className="space-y-1.5">
            <label htmlFor="explore-lang-filter" className="text-xs font-medium text-slate-400">
              Filter by Regional Language
            </label>
            <select
              id="explore-lang-filter"
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className="w-full h-10 px-3 rounded-xl bg-[#0E0E13] border border-white/10 text-sm text-white focus:outline-none focus:border-violet-500"
            >
              <option value="All">All 7 Languages</option>
              {REGIONAL_LANGUAGES.map((l) => (
                <option key={l} value={l}>
                  {l}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="explore-genre-filter" className="text-xs font-medium text-slate-400">
              Filter by Cultural Genre
            </label>
            <select
              id="explore-genre-filter"
              value={genre}
              onChange={(e) => setGenre(e.target.value)}
              className="w-full h-10 px-3 rounded-xl bg-[#0E0E13] border border-white/10 text-sm text-white focus:outline-none focus:border-violet-500"
            >
              <option value="All">All Genres</option>
              {CULTURAL_GENRES.map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </select>
          </div>
        </div>
      </section>

      {loading ? (
        <div className="space-y-4 animate-pulse">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-28 rounded-2xl bg-[#171721]" />
          ))}
        </div>
      ) : shows.length === 0 && episodes.length === 0 ? (
        <div className="rounded-3xl bg-[#171721] border border-white/8 p-10 text-center space-y-3">
          <h2 className="text-lg font-semibold text-white">No matching episodes or podcasts found</h2>
          <p className="text-sm text-slate-400 max-w-md mx-auto">
            We could not find matches for “{query}” under the current language and genre filters. Try clearing filters or searching another regional keyword.
          </p>
          <button
            type="button"
            onClick={clearFilters}
            className="mt-2 px-5 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-sm font-semibold"
          >
            Clear Search & Filters
          </button>
        </div>
      ) : (
        <>
          {shows.length > 0 && (
            <section className="space-y-4">
              <h2 className="text-xl font-bold text-white">
                Matching Podcast Shows ({shows.length})
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
              Episodes & Transcript Matches ({episodes.length})
            </h2>
            <div className="space-y-3">
              {episodes.map((ep) => (
                <EpisodeRow
                  key={ep.id}
                  episode={ep}
                  queueContext={episodes}
                  matchedSnippet={ep.matchedSnippet}
                />
              ))}
            </div>
          </section>
        </>
      )}
    </div>
  );
};
