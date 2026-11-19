import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import {
  api,
  readLocalDownloads,
  readLocalLibrary,
  writeLocalDownloads,
  writeLocalLibrary,
} from '../services/api';
import type {
  AppNotification,
  Bookmark,
  DownloadItem,
  Episode,
  FavoriteShow,
  LibrarySnapshot,
  ListeningHistoryItem,
  SubscriptionItem,
  UserPreferences,
} from '../types/podcast';

interface ConfirmState {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  onConfirm: () => void;
}

interface LibraryContextValue {
  isLoading: boolean;
  bookmarks: Bookmark[];
  favorites: FavoriteShow[];
  subscriptions: SubscriptionItem[];
  history: ListeningHistoryItem[];
  downloads: DownloadItem[];
  preferences: UserPreferences;
  notifications: AppNotification[];
  unreadCount: number;
  confirmState: ConfirmState;
  closeConfirm: () => void;
  requestConfirm: (opts: Omit<ConfirmState, 'isOpen'>) => void;
  isEpisodeBookmarked: (episodeId: string) => boolean;
  toggleEpisodeBookmark: (episode: Episode) => Promise<void>;
  saveTimestampBookmark: (episode: Episode, timestampSec: number, note?: string) => Promise<void>;
  removeBookmarkById: (bookmarkId: string, label?: string) => void;
  isShowFavorite: (showId: string) => boolean;
  toggleFavoriteShow: (showId: string, showTitle?: string) => Promise<void>;
  isSubscribed: (targetId: string) => boolean;
  toggleSubscription: (targetId: string, targetType: 'show' | 'host', label?: string) => Promise<void>;
  recordPlayProgress: (episodeId: string, positionSec: number) => void;
  clearHistoryWithConfirm: () => void;
  startSimulatedDownload: (episode: Episode) => void;
  removeDownloadWithConfirm: (episodeId: string, title?: string) => void;
  getDownloadStatus: (episodeId: string) => DownloadItem | undefined;
  updateUserPreferences: (partial: Partial<UserPreferences>) => Promise<void>;
  markAllNotificationsRead: () => void;
  pushNotification: (title: string, message: string, link?: string) => void;
}

const LibraryContext = createContext<LibraryContextValue | null>(null);

const INITIAL_NOTIFICATIONS: AppNotification[] = [
  {
    id: 'notif-welcome',
    title: 'New Tamil Broadcast',
    message: 'Madras Melodies Episode 4: Margazhi Dawn Ragas is now streaming.',
    createdAt: new Date().toISOString(),
    read: false,
    link: '/shows/show-madras-melodies',
  },
  {
    id: 'notif-folklore',
    title: 'Hindi Folklore Spotlight',
    message: 'Katha Lok added synchronized Devanagari transcripts across all episodes.',
    createdAt: new Date().toISOString(),
    read: false,
    link: '/shows/show-katha-lok',
  },
];

export const LibraryProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const initialLocal = readLocalLibrary();
  const [isLoading, setIsLoading] = useState(true);
  const [bookmarks, setBookmarks] = useState<Bookmark[]>(initialLocal.bookmarks);
  const [favorites, setFavorites] = useState<FavoriteShow[]>(initialLocal.favorites);
  const [subscriptions, setSubscriptions] = useState<SubscriptionItem[]>(initialLocal.subscriptions);
  const [history, setHistory] = useState<ListeningHistoryItem[]>(initialLocal.history);
  const [preferences, setPreferences] = useState<UserPreferences>(initialLocal.preferences);
  const [downloads, setDownloads] = useState<DownloadItem[]>(() => readLocalDownloads());
  const [notifications, setNotifications] = useState<AppNotification[]>(INITIAL_NOTIFICATIONS);
  const [confirmState, setConfirmState] = useState<ConfirmState>({
    isOpen: false,
    title: '',
    message: '',
    confirmLabel: 'Remove',
    onConfirm: () => {},
  });

  const syncLocal = useCallback(
    (next: Partial<LibrarySnapshot>) => {
      const snapshot: LibrarySnapshot = {
        bookmarks: next.bookmarks ?? bookmarks,
        favorites: next.favorites ?? favorites,
        subscriptions: next.subscriptions ?? subscriptions,
        history: next.history ?? history,
        preferences: next.preferences ?? preferences,
      };
      writeLocalLibrary(snapshot);
    },
    [bookmarks, favorites, subscriptions, history, preferences]
  );

  useEffect(() => {
    let active = true;
    api
      .getLibrary()
      .then((snap) => {
        if (!active) return;
        setBookmarks(snap.bookmarks);
        setFavorites(snap.favorites);
        setSubscriptions(snap.subscriptions);
        setHistory(snap.history);
        setPreferences(snap.preferences);
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const pushNotification = useCallback((title: string, message: string, link?: string) => {
    setNotifications((prev) => [
      {
        id: `notif-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        title,
        message,
        createdAt: new Date().toISOString(),
        read: false,
        link,
      },
      ...prev.slice(0, 14),
    ]);
  }, []);

  const markAllNotificationsRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }, []);

  const closeConfirm = useCallback(() => {
    setConfirmState((prev) => ({ ...prev, isOpen: false }));
  }, []);

  const requestConfirm = useCallback((opts: Omit<ConfirmState, 'isOpen'>) => {
    setConfirmState({ ...opts, isOpen: true });
  }, []);

  const isEpisodeBookmarked = useCallback(
    (episodeId: string) => bookmarks.some((b) => b.episodeId === episodeId && b.timestampSec === null),
    [bookmarks]
  );

  const toggleEpisodeBookmark = useCallback(
    async (episode: Episode) => {
      const existing = bookmarks.find((b) => b.episodeId === episode.id && b.timestampSec === null);
      if (existing) {
        requestConfirm({
          title: 'Remove Bookmarked Episode?',
          message: `Remove "${episode.title}" from your saved episodes?`,
          confirmLabel: 'Remove Bookmark',
          onConfirm: async () => {
            const next = bookmarks.filter((b) => b.id !== existing.id);
            setBookmarks(next);
            syncLocal({ bookmarks: next });
            closeConfirm();
            try {
              await api.deleteBookmark(existing.id);
            } catch {
              // Local state already persisted
            }
          },
        });
        return;
      }

      const optimistic: Bookmark = {
        id: `bm-${episode.id}`,
        episodeId: episode.id,
        timestampSec: null,
        note: '',
        createdAt: new Date().toISOString(),
      };
      const next = [optimistic, ...bookmarks.filter((b) => b.id !== optimistic.id)];
      setBookmarks(next);
      syncLocal({ bookmarks: next });
      pushNotification('Episode Bookmarked', `Saved "${episode.title}" to My Library.`, '/library');

      try {
        const saved = await api.saveBookmark({ episodeId: episode.id, timestampSec: null, note: '' });
        setBookmarks((curr) => [saved, ...curr.filter((b) => b.id !== optimistic.id && b.id !== saved.id)]);
      } catch {
        // Optimistic entry remains in localStorage
      }
    },
    [bookmarks, closeConfirm, pushNotification, requestConfirm, syncLocal]
  );

  const saveTimestampBookmark = useCallback(
    async (episode: Episode, timestampSec: number, note = '') => {
      const cleanSec = Math.max(0, Math.floor(timestampSec));
      const optimistic: Bookmark = {
        id: `bm-${episode.id}-${cleanSec}-${Date.now()}`,
        episodeId: episode.id,
        timestampSec: cleanSec,
        note: note.trim() || `Saved moment at ${Math.floor(cleanSec / 60)}:${(cleanSec % 60).toString().padStart(2, '0')}`,
        createdAt: new Date().toISOString(),
      };
      const next = [optimistic, ...bookmarks];
      setBookmarks(next);
      syncLocal({ bookmarks: next });
      pushNotification(
        'Timestamp Saved',
        `Saved ${Math.floor(cleanSec / 60)}:${(cleanSec % 60).toString().padStart(2, '0')} in "${episode.title}".`,
        '/library'
      );

      try {
        const saved = await api.saveBookmark({
          episodeId: episode.id,
          timestampSec: cleanSec,
          note: optimistic.note,
        });
        setBookmarks((curr) => [saved, ...curr.filter((b) => b.id !== optimistic.id)]);
      } catch {
        // LocalStorage retains entry
      }
    },
    [bookmarks, pushNotification, syncLocal]
  );

  const removeBookmarkById = useCallback(
    (bookmarkId: string, label = 'this bookmark') => {
      requestConfirm({
        title: 'Remove Saved Bookmark?',
        message: `Are you sure you want to remove ${label} from your library?`,
        confirmLabel: 'Remove',
        onConfirm: async () => {
          const next = bookmarks.filter((b) => b.id !== bookmarkId);
          setBookmarks(next);
          syncLocal({ bookmarks: next });
          closeConfirm();
          try {
            await api.deleteBookmark(bookmarkId);
          } catch {
            // ignore
          }
        },
      });
    },
    [bookmarks, closeConfirm, requestConfirm, syncLocal]
  );

  const isShowFavorite = useCallback(
    (showId: string) => favorites.some((f) => f.showId === showId),
    [favorites]
  );

  const toggleFavoriteShow = useCallback(
    async (showId: string, showTitle = 'this podcast') => {
      const exists = favorites.some((f) => f.showId === showId);
      if (exists) {
        requestConfirm({
          title: 'Remove Favorite Show?',
          message: `Remove "${showTitle}" from your Favorites?`,
          confirmLabel: 'Remove Favorite',
          onConfirm: async () => {
            const next = favorites.filter((f) => f.showId !== showId);
            setFavorites(next);
            syncLocal({ favorites: next });
            closeConfirm();
            try {
              await api.removeFavorite(showId);
            } catch {
              // ignore
            }
          },
        });
        return;
      }

      const item: FavoriteShow = { showId, createdAt: new Date().toISOString() };
      const next = [item, ...favorites];
      setFavorites(next);
      syncLocal({ favorites: next });
      pushNotification('Added to Favorites', `"${showTitle}" added to your favorite shows.`, '/favorites');
      try {
        await api.addFavorite(showId);
      } catch {
        // ignore
      }
    },
    [closeConfirm, favorites, pushNotification, requestConfirm, syncLocal]
  );

  const isSubscribed = useCallback(
    (targetId: string) => subscriptions.some((s) => s.targetId === targetId),
    [subscriptions]
  );

  const toggleSubscription = useCallback(
    async (targetId: string, targetType: 'show' | 'host', label = 'creator') => {
      const exists = subscriptions.some((s) => s.targetId === targetId);
      if (exists) {
        requestConfirm({
          title: 'Unsubscribe?',
          message: `Stop following updates from ${label}?`,
          confirmLabel: 'Unsubscribe',
          onConfirm: async () => {
            const next = subscriptions.filter((s) => s.targetId !== targetId);
            setSubscriptions(next);
            syncLocal({ subscriptions: next });
            closeConfirm();
            try {
              await api.removeSubscription(targetId);
            } catch {
              // ignore
            }
          },
        });
        return;
      }

      const sub: SubscriptionItem = {
        targetId,
        targetType,
        createdAt: new Date().toISOString(),
      };
      const next = [sub, ...subscriptions];
      setSubscriptions(next);
      syncLocal({ subscriptions: next });
      pushNotification('Subscribed', `You are now subscribed to ${label}.`);
      try {
        await api.addSubscription(targetId, targetType);
      } catch {
        // ignore
      }
    },
    [closeConfirm, pushNotification, requestConfirm, subscriptions, syncLocal]
  );

  const recordPlayProgress = useCallback(
    (episodeId: string, positionSec: number) => {
      const entry: ListeningHistoryItem = {
        episodeId,
        positionSec: Math.max(0, Math.floor(positionSec)),
        playedAt: new Date().toISOString(),
      };
      setHistory((prev) => {
        const next = [entry, ...prev.filter((h) => h.episodeId !== episodeId)].slice(0, 25);
        writeLocalLibrary({
          bookmarks,
          favorites,
          subscriptions,
          history: next,
          preferences,
        });
        return next;
      });
      api.recordHistory(episodeId, positionSec).catch(() => {});
    },
    [bookmarks, favorites, preferences, subscriptions]
  );

  const clearHistoryWithConfirm = useCallback(() => {
    requestConfirm({
      title: 'Clear Recently Played History?',
      message: 'This will remove your listening history and saved resume timestamps.',
      confirmLabel: 'Clear History',
      onConfirm: async () => {
        setHistory([]);
        syncLocal({ history: [] });
        closeConfirm();
        try {
          await api.clearHistory();
        } catch {
          // ignore
        }
      },
    });
  }, [closeConfirm, requestConfirm, syncLocal]);

  const startSimulatedDownload = useCallback(
    (episode: Episode) => {
      const existing = downloads.find((d) => d.episodeId === episode.id);
      if (existing) return;

      const sizeMb = Number((episode.durationSec * 0.14).toFixed(1));
      const initial: DownloadItem = {
        episodeId: episode.id,
        status: 'downloading',
        progress: 12,
        sizeMb,
      };
      setDownloads((prev) => {
        const next = [initial, ...prev];
        writeLocalDownloads(next);
        return next;
      });

      let step = 12;
      const timer = window.setInterval(() => {
        step = Math.min(100, step + 22);
        setDownloads((prev) => {
          const next = prev.map((d) =>
            d.episodeId === episode.id
              ? {
                  ...d,
                  progress: step,
                  status: step >= 100 ? ('downloaded' as const) : ('downloading' as const),
                  downloadedAt: step >= 100 ? new Date().toISOString() : undefined,
                }
              : d
          );
          writeLocalDownloads(next);
          return next;
        });
        if (step >= 100) {
          clearInterval(timer);
          pushNotification(
            'Simulated Download Complete',
            `"${episode.title}" cached in browser simulator (${sizeMb} MB).`,
            '/downloads'
          );
        }
      }, 280);
    },
    [downloads, pushNotification]
  );

  const removeDownloadWithConfirm = useCallback(
    (episodeId: string, title = 'this episode') => {
      requestConfirm({
        title: 'Remove Offline Cache?',
        message: `Remove simulated offline cache for "${title}"?`,
        confirmLabel: 'Remove Download',
        onConfirm: () => {
          setDownloads((prev) => {
            const next = prev.filter((d) => d.episodeId !== episodeId);
            writeLocalDownloads(next);
            return next;
          });
          closeConfirm();
        },
      });
    },
    [closeConfirm, requestConfirm]
  );

  const getDownloadStatus = useCallback(
    (episodeId: string) => downloads.find((d) => d.episodeId === episodeId),
    [downloads]
  );

  const updateUserPreferences = useCallback(
    async (partial: Partial<UserPreferences>) => {
      const next = { ...preferences, ...partial };
      setPreferences(next);
      syncLocal({ preferences: next });
      try {
        await api.updatePreferences(partial);
      } catch {
        // ignore
      }
    },
    [preferences, syncLocal]
  );

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <LibraryContext.Provider
      value={{
        isLoading,
        bookmarks,
        favorites,
        subscriptions,
        history,
        downloads,
        preferences,
        notifications,
        unreadCount,
        confirmState,
        closeConfirm,
        requestConfirm,
        isEpisodeBookmarked,
        toggleEpisodeBookmark,
        saveTimestampBookmark,
        removeBookmarkById,
        isShowFavorite,
        toggleFavoriteShow,
        isSubscribed,
        toggleSubscription,
        recordPlayProgress,
        clearHistoryWithConfirm,
        startSimulatedDownload,
        removeDownloadWithConfirm,
        getDownloadStatus,
        updateUserPreferences,
        markAllNotificationsRead,
        pushNotification,
      }}
    >
      {children}
    </LibraryContext.Provider>
  );
};

export function useLibrary(): LibraryContextValue {
  const ctx = useContext(LibraryContext);
  if (!ctx) throw new Error('useLibrary must be used within LibraryProvider');
  return ctx;
}
