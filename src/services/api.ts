import {
  EPISODES,
  HOSTS,
  LANGUAGE_CHANNELS,
  PODCAST_SHOWS,
} from '../data/catalogData';
import type {
  Bookmark,
  Episode,
  FavoriteShow,
  Host,
  LanguageChannel,
  LibrarySnapshot,
  ListeningHistoryItem,
  PodcastShow,
  SubscriptionItem,
  UserPreferences,
} from '../types/podcast';
import { normalizeNfc } from '../utils/formatters';

const LS_LIBRARY_KEY = 'echoepisodes_library_v1';
const LS_DOWNLOADS_KEY = 'echoepisodes_downloads_v1';

const DEFAULT_PREFS: UserPreferences = {
  displayName: 'Aarav Listener',
  handle: '@aarav_radio',
  bio: 'Exploring regional stories, cinema archives, and vernacular tech across India.',
  preferredLanguages: ['Hindi', 'Tamil', 'Telugu', 'Bengali'],
  defaultSpeed: 1,
  autoFallbackAudio: true,
  notificationsEnabled: true,
};

export function readLocalLibrary(): LibrarySnapshot {
  try {
    const raw = localStorage.getItem(LS_LIBRARY_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        bookmarks: Array.isArray(parsed.bookmarks) ? parsed.bookmarks : [],
        favorites: Array.isArray(parsed.favorites) ? parsed.favorites : [],
        subscriptions: Array.isArray(parsed.subscriptions) ? parsed.subscriptions : [],
        history: Array.isArray(parsed.history) ? parsed.history : [],
        preferences: { ...DEFAULT_PREFS, ...(parsed.preferences || {}) },
      };
    }
  } catch {
    // ignore storage errors
  }
  return {
    bookmarks: [],
    favorites: [],
    subscriptions: [],
    history: [],
    preferences: DEFAULT_PREFS,
  };
}

export function writeLocalLibrary(snapshot: LibrarySnapshot): void {
  try {
    localStorage.setItem(LS_LIBRARY_KEY, JSON.stringify(snapshot));
  } catch {
    // ignore storage quota errors
  }
}

export function readLocalDownloads() {
  try {
    const raw = localStorage.getItem(LS_DOWNLOADS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function writeLocalDownloads(items: unknown[]) {
  try {
    localStorage.setItem(LS_DOWNLOADS_KEY, JSON.stringify(items));
  } catch {
    // ignore
  }
}

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers || {}),
    },
    ...init,
  });
  if (!res.ok) {
    const errBody = await res.json().catch(() => ({}));
    throw new Error(errBody.error || `Request failed (${res.status})`);
  }
  return res.json() as Promise<T>;
}

export const api = {
  async getChannels(): Promise<LanguageChannel[]> {
    try {
      const data = await fetchJson<{ channels: LanguageChannel[] }>('/api/channels');
      return data.channels;
    } catch {
      return LANGUAGE_CHANNELS.map((ch) => ({
        ...ch,
        showCount: PODCAST_SHOWS.filter((s) => s.language === ch.name).length,
        episodeCount: EPISODES.filter((e) => e.language === ch.name).length,
      }));
    }
  },

  async getShows(params?: { language?: string; genre?: string; sort?: string }): Promise<PodcastShow[]> {
    try {
      const qs = new URLSearchParams();
      if (params?.language && params.language !== 'All') qs.set('language', params.language);
      if (params?.genre && params.genre !== 'All') qs.set('genre', params.genre);
      if (params?.sort) qs.set('sort', params.sort);
      const data = await fetchJson<{ shows: PodcastShow[] }>(`/api/shows?${qs.toString()}`);
      return data.shows;
    } catch {
      return PODCAST_SHOWS.filter((s) => {
        if (params?.language && params.language !== 'All' && s.language !== params.language) return false;
        if (params?.genre && params.genre !== 'All' && s.genre !== params.genre) return false;
        return true;
      });
    }
  },

  async getShowDetail(id: string): Promise<{ show: PodcastShow; host: Host; episodes: Episode[] }> {
    try {
      return await fetchJson(`/api/shows/${encodeURIComponent(id)}`);
    } catch {
      const show = PODCAST_SHOWS.find((s) => s.id === id);
      if (!show) throw new Error('Podcast show not found');
      const host = HOSTS.find((h) => h.id === show.hostId)!;
      const episodes = EPISODES.filter((e) => e.showId === show.id);
      return { show, host, episodes };
    }
  },

  async getEpisodes(params?: { language?: string; genre?: string; showId?: string; limit?: number }): Promise<Episode[]> {
    try {
      const qs = new URLSearchParams();
      if (params?.language && params.language !== 'All') qs.set('language', params.language);
      if (params?.genre && params.genre !== 'All') qs.set('genre', params.genre);
      if (params?.showId) qs.set('showId', params.showId);
      if (params?.limit) qs.set('limit', String(params.limit));
      const data = await fetchJson<{ episodes: Episode[] }>(`/api/episodes?${qs.toString()}`);
      return data.episodes;
    } catch {
      return EPISODES.filter((e) => {
        if (params?.language && params.language !== 'All' && e.language !== params.language) return false;
        if (params?.genre && params.genre !== 'All' && e.genre !== params.genre) return false;
        if (params?.showId && e.showId !== params.showId) return false;
        return true;
      }).slice(0, params?.limit || EPISODES.length);
    }
  },

  async getHosts(): Promise<Host[]> {
    try {
      const data = await fetchJson<{ hosts: Host[] }>('/api/hosts');
      return data.hosts;
    } catch {
      return HOSTS;
    }
  },

  async getHostDetail(id: string): Promise<{ host: Host; shows: PodcastShow[]; episodes: Episode[] }> {
    try {
      return await fetchJson(`/api/hosts/${encodeURIComponent(id)}`);
    } catch {
      const host = HOSTS.find((h) => h.id === id);
      if (!host) throw new Error('Host not found');
      const shows = PODCAST_SHOWS.filter((s) => s.hostId === host.id);
      const episodes = EPISODES.filter((e) => e.hostId === host.id);
      return { host, shows, episodes };
    }
  },

  async search(
    q: string,
    filters?: { language?: string; genre?: string }
  ): Promise<{ episodes: Array<Episode & { matchedSnippet?: string }>; shows: PodcastShow[] }> {
    const normalized = q.normalize('NFC');
    try {
      const qs = new URLSearchParams();
      qs.set('q', normalized);
      if (filters?.language && filters.language !== 'All') qs.set('language', filters.language);
      if (filters?.genre && filters.genre !== 'All') qs.set('genre', filters.genre);
      return await fetchJson(`/api/search?${qs.toString()}`);
    } catch {
      const term = normalizeNfc(normalized);
      const shows = PODCAST_SHOWS.filter((s) => {
        if (filters?.language && filters.language !== 'All' && s.language !== filters.language) return false;
        if (filters?.genre && filters.genre !== 'All' && s.genre !== filters.genre) return false;
        if (!term) return true;
        return normalizeNfc(`${s.title} ${s.nativeTitle} ${s.description} ${s.language} ${s.genre}`).includes(term);
      });
      const episodes = EPISODES.filter((e) => {
        if (filters?.language && filters.language !== 'All' && e.language !== filters.language) return false;
        if (filters?.genre && filters.genre !== 'All' && e.genre !== filters.genre) return false;
        if (!term) return true;
        const transcriptJoined = e.transcript.map((c) => `${c.nativeText} ${c.text}`).join(' ');
        return normalizeNfc(
          `${e.title} ${e.description} ${e.showTitle || ''} ${e.hostName || ''} ${e.topics.join(' ')} ${transcriptJoined}`
        ).includes(term);
      });
      return { episodes, shows };
    }
  },

  async getLibrary(): Promise<LibrarySnapshot> {
    try {
      const data = await fetchJson<LibrarySnapshot>('/api/library');
      const local = readLocalLibrary();
      // Merge local items if server database started fresh
      const merged: LibrarySnapshot = {
        bookmarks: data.bookmarks.length > 0 ? data.bookmarks : local.bookmarks,
        favorites: data.favorites.length > 0 ? data.favorites : local.favorites,
        subscriptions: data.subscriptions.length > 0 ? data.subscriptions : local.subscriptions,
        history: data.history.length > 0 ? data.history : local.history,
        preferences: data.preferences || local.preferences,
      };
      writeLocalLibrary(merged);
      return merged;
    } catch {
      return readLocalLibrary();
    }
  },

  async saveBookmark(payload: { episodeId: string; timestampSec?: number | null; note?: string }): Promise<Bookmark> {
    const data = await fetchJson<{ bookmark: Bookmark }>('/api/bookmarks', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return data.bookmark;
  },

  async deleteBookmark(idOrEpisodeId: string): Promise<void> {
    await fetchJson(`/api/bookmarks/${encodeURIComponent(idOrEpisodeId)}`, {
      method: 'DELETE',
    });
  },

  async addFavorite(showId: string): Promise<FavoriteShow> {
    const data = await fetchJson<{ favorite: FavoriteShow }>('/api/favorites', {
      method: 'POST',
      body: JSON.stringify({ showId }),
    });
    return data.favorite;
  },

  async removeFavorite(showId: string): Promise<void> {
    await fetchJson(`/api/favorites/${encodeURIComponent(showId)}`, {
      method: 'DELETE',
    });
  },

  async addSubscription(targetId: string, targetType: 'show' | 'host'): Promise<SubscriptionItem> {
    const data = await fetchJson<{ subscription: SubscriptionItem }>('/api/subscriptions', {
      method: 'POST',
      body: JSON.stringify({ targetId, targetType }),
    });
    return data.subscription;
  },

  async removeSubscription(targetId: string): Promise<void> {
    await fetchJson(`/api/subscriptions/${encodeURIComponent(targetId)}`, {
      method: 'DELETE',
    });
  },

  async recordHistory(episodeId: string, positionSec: number): Promise<ListeningHistoryItem> {
    const data = await fetchJson<{ item: ListeningHistoryItem }>('/api/history', {
      method: 'POST',
      body: JSON.stringify({ episodeId, positionSec }),
    });
    return data.item;
  },

  async clearHistory(): Promise<void> {
    await fetchJson('/api/history', { method: 'DELETE' });
  },

  async updatePreferences(prefs: Partial<UserPreferences>): Promise<UserPreferences> {
    const data = await fetchJson<{ preferences: UserPreferences }>('/api/preferences', {
      method: 'PUT',
      body: JSON.stringify(prefs),
    });
    return data.preferences;
  },
};
