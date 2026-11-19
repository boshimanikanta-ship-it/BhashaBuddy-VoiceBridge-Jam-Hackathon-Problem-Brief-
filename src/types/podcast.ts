export type RegionalLanguage =
  | 'Hindi'
  | 'Tamil'
  | 'Telugu'
  | 'Malayalam'
  | 'Bengali'
  | 'Marathi'
  | 'Kannada';

export type CulturalGenre =
  | 'Folklore'
  | 'History'
  | 'Education'
  | 'Technology'
  | 'Regional News'
  | 'Cinema'
  | 'Music'
  | 'Literature'
  | 'Entertainment';

export interface LanguageChannel {
  id: string;
  name: RegionalLanguage;
  nativeName: string;
  scriptFamily: string;
  tagline: string;
  description: string;
  regionLabel: string;
  accentHex: string;
  showCount?: number;
  episodeCount?: number;
}

export interface HostSocialLinks {
  x?: string;
  instagram?: string;
  youtube?: string;
  website?: string;
}

export interface Host {
  id: string;
  name: string;
  nativeName: string;
  language: RegionalLanguage;
  avatarUrl: string;
  bio: string;
  city: string;
  totalListens: number;
  subscriberCount: number;
  socials: HostSocialLinks;
}

export interface PodcastShow {
  id: string;
  title: string;
  nativeTitle: string;
  subtitle: string;
  description: string;
  language: RegionalLanguage;
  genre: CulturalGenre;
  coverUrl: string;
  hostId: string;
  hostName?: string;
  subscriberCount: number;
  totalEpisodes: number;
  trendingScore: number;
  featured?: boolean;
}

export interface EpisodeChapter {
  title: string;
  timestampSec: number;
}

export interface TranscriptCue {
  timeSec: number;
  speaker: string;
  nativeText: string;
  text: string;
}

export interface Episode {
  id: string;
  showId: string;
  showTitle?: string;
  episodeNumber: number;
  title: string;
  description: string;
  audioUrl: string;
  thumbnailUrl: string;
  durationSec: number;
  language: RegionalLanguage;
  genre: CulturalGenre;
  hostId: string;
  hostName?: string;
  publishedAt: string;
  topics: string[];
  chapters: EpisodeChapter[];
  transcript: TranscriptCue[];
  playCount: number;
}

export interface Bookmark {
  id: string;
  episodeId: string;
  timestampSec: number | null;
  note: string;
  createdAt: string;
}

export interface FavoriteShow {
  showId: string;
  createdAt: string;
}

export interface SubscriptionItem {
  targetId: string;
  targetType: 'show' | 'host';
  createdAt: string;
}

export interface ListeningHistoryItem {
  episodeId: string;
  positionSec: number;
  playedAt: string;
}

export interface DownloadItem {
  episodeId: string;
  status: 'downloading' | 'downloaded';
  progress: number;
  sizeMb: number;
  downloadedAt?: string;
}

export interface UserPreferences {
  displayName: string;
  handle: string;
  bio: string;
  preferredLanguages: RegionalLanguage[];
  defaultSpeed: number;
  autoFallbackAudio: boolean;
  notificationsEnabled: boolean;
}

export interface LibrarySnapshot {
  bookmarks: Bookmark[];
  favorites: FavoriteShow[];
  subscriptions: SubscriptionItem[];
  history: ListeningHistoryItem[];
  preferences: UserPreferences;
}

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  createdAt: string;
  read: boolean;
  link?: string;
}

export type SleepTimerMode = 'off' | '15' | '30' | '45' | 'end';
