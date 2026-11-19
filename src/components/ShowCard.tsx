import React from 'react';
import { Heart, Play } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAudioPlayer } from '../context/AudioPlayerContext';
import { useLibrary } from '../context/LibraryContext';
import { api } from '../services/api';
import type { PodcastShow } from '../types/podcast';
import { formatCompactNumber } from '../utils/formatters';
import { SafeImage } from './SafeImage';

interface ShowCardProps {
  show: PodcastShow;
}

export const ShowCard: React.FC<ShowCardProps> = ({ show }) => {
  const { isShowFavorite, toggleFavoriteShow } = useLibrary();
  const { playEpisode } = useAudioPlayer();
  const favored = isShowFavorite(show.id);

  const handleQuickPlay = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const eps = await api.getEpisodes({ showId: show.id });
    if (eps.length > 0) {
      playEpisode(eps[0], eps, 0);
    }
  };

  return (
    <div className="group relative flex flex-col rounded-2xl bg-[#171721] border border-white/8 p-4 transition-colors duration-150 hover:bg-[#1E1E2B]">
      <Link to={`/shows/${show.id}`} className="block">
        <div className="relative aspect-square w-full overflow-hidden rounded-xl bg-[#111119]">
          <SafeImage
            src={show.coverUrl}
            alt={`${show.title} cover artwork`}
            fallbackLabel={show.title}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/15 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-150" />
          <button
            type="button"
            onClick={handleQuickPlay}
            aria-label={`Play ${show.title}`}
            className="absolute bottom-3 right-3 w-11 h-11 rounded-full bg-violet-600 hover:bg-violet-500 text-white flex items-center justify-center shadow-lg opacity-95 md:opacity-0 md:group-hover:opacity-100 md:translate-y-1 md:group-hover:translate-y-0 transition-all duration-150 focus-visible:opacity-100"
          >
            <Play className="w-5 h-5 fill-current ml-0.5" />
          </button>
        </div>

        <div className="mt-3.5 min-w-0">
          <div className="flex items-center gap-2 text-xs text-slate-400 truncate">
            <span className="text-orange-400 font-medium">{show.language}</span>
            <span aria-hidden="true">·</span>
            <span>{show.genre}</span>
            <span aria-hidden="true">·</span>
            <span className="tabular-nums">{show.totalEpisodes} ep</span>
          </div>
          <h3 className="mt-1 text-base font-semibold text-white truncate group-hover:text-violet-300 transition-colors">
            {show.title}
          </h3>
          <p className="mt-0.5 text-xs text-slate-400 truncate">
            {show.nativeTitle} · {show.subtitle}
          </p>
        </div>
      </Link>

      <div className="mt-3 pt-3 border-t border-white/6 flex items-center justify-between gap-2 text-xs text-slate-400">
        <Link
          to={`/hosts/${show.hostId}`}
          className="truncate hover:text-white transition-colors"
        >
          {show.hostName || 'Regional Host'} ·{' '}
          <span className="tabular-nums">{formatCompactNumber(show.subscriberCount)}</span>
        </Link>
        <button
          type="button"
          onClick={() => toggleFavoriteShow(show.id, show.title)}
          aria-label={favored ? `Remove ${show.title} from favorites` : `Favorite ${show.title}`}
          className={`min-w-[36px] min-h-[36px] rounded-lg flex items-center justify-center transition-colors shrink-0 ${
            favored
              ? 'text-orange-400 bg-orange-500/15'
              : 'text-slate-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <Heart className={`w-4 h-4 ${favored ? 'fill-current' : ''}`} />
        </button>
      </div>
    </div>
  );
};
