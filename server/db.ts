import Database from 'better-sqlite3';
import path from 'path';
import {
  EPISODES,
  HOSTS,
  LANGUAGE_CHANNELS,
  PODCAST_SHOWS,
} from '../src/data/catalogData';
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
} from '../src/types/podcast';

const DB_PATH = process.env.DATABASE_PATH || path.resolve(process.cwd(), 'echoepisodes.db');

let db: Database.Database;

const DEFAULT_PREFS: UserPreferences = {
  displayName: 'Aarav Listener',
  handle: '@aarav_radio',
  bio: 'Exploring regional stories, cinema archives, and vernacular tech across India.',
  preferredLanguages: ['Hindi', 'Tamil', 'Telugu', 'Bengali'],
  defaultSpeed: 1,
  autoFallbackAudio: true,
  notificationsEnabled: true,
};

// Phonetic & native-script synonym mapping for Unicode NFC search
const SCRIPT_ALIASES: Array<[string, string[]]> = [
  ['folklore', ['लोककथा', 'நாட்டுப்புற', 'జానపద', 'നാടോടി', 'লোককথা', 'लोकगीत', 'ಜಾನಪದ', 'janapada', 'kathalu', 'katha']],
  ['music', ['संगीत', 'இசை', 'సంగీతం', 'സംഗീതം', 'সঙ্গীত', 'sangeet', 'carnatic', 'raga', 'melodies', 'veena']],
  ['cinema', ['सिनेमा', 'சினிமா', 'సినిమా', 'സിനിമ', 'সিনেমা', 'charithra', 'film']],
  ['technology', ['तकनीक', 'தொழில்நுட்பம்', 'సాంకేతికత', 'സാങ്കേതികവിദ്യ', 'প্রযুক্তি', 'ತಂತ್ರಜ್ಞಾನ', 'tech', 'ai', 'nlp', 'coding']],
  ['history', ['इतिहास', 'வரலாறு', 'చరిత్ర', 'ചരിത്രം', 'ইতিহাস', 'ಇತಿಹಾಸ', 'sangam', 'fort', 'maritime']],
  ['literature', ['साहित्य', 'இலக்கியம்', 'సాహిత్యం', 'സാഹിത്യം', 'সাহিত্য', 'ಸಾಹಿತ್ಯ', 'sahitya', 'poetry']],
  ['hindi', ['हिन्दी', 'हिंदी', 'devanagari']],
  ['tamil', ['தமிழ்', 'madras', 'chennai', 'carnatic']],
  ['telugu', ['తెలుగు', 'hyderabad', 'godavari']],
  ['malayalam', ['മലയാളം', 'kerala', 'malabar', 'kochi']],
  ['bengali', ['বাংলা', 'kolkata', 'bangla', 'adda']],
  ['marathi', ['मराठी', 'pune', 'sahyadri']],
  ['kannada', ['ಕನ್ನಡ', 'bengaluru', 'hampi', 'yakshagana']],
];

export function initDatabase(): Database.Database {
  if (db) return db;

  db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  db.exec(`
    CREATE TABLE IF NOT EXISTS Hosts (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      nativeName TEXT NOT NULL,
      language TEXT NOT NULL,
      avatarUrl TEXT NOT NULL,
      bio TEXT NOT NULL,
      city TEXT NOT NULL,
      totalListens INTEGER NOT NULL DEFAULT 0,
      subscriberCount INTEGER NOT NULL DEFAULT 0,
      socialsJson TEXT NOT NULL DEFAULT '{}'
    );

    CREATE TABLE IF NOT EXISTS PodcastShows (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      nativeTitle TEXT NOT NULL,
      subtitle TEXT NOT NULL,
      description TEXT NOT NULL,
      language TEXT NOT NULL,
      genre TEXT NOT NULL,
      coverUrl TEXT NOT NULL,
      hostId TEXT NOT NULL,
      subscriberCount INTEGER NOT NULL DEFAULT 0,
      totalEpisodes INTEGER NOT NULL DEFAULT 0,
      trendingScore INTEGER NOT NULL DEFAULT 0,
      featured INTEGER NOT NULL DEFAULT 0,
      FOREIGN KEY (hostId) REFERENCES Hosts(id)
    );

    CREATE TABLE IF NOT EXISTS Episodes (
      id TEXT PRIMARY KEY,
      showId TEXT NOT NULL,
      episodeNumber INTEGER NOT NULL,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      audioUrl TEXT NOT NULL,
      thumbnailUrl TEXT NOT NULL,
      durationSec INTEGER NOT NULL,
      language TEXT NOT NULL,
      genre TEXT NOT NULL,
      hostId TEXT NOT NULL,
      publishedAt TEXT NOT NULL,
      topicsJson TEXT NOT NULL DEFAULT '[]',
      chaptersJson TEXT NOT NULL DEFAULT '[]',
      transcriptJson TEXT NOT NULL DEFAULT '[]',
      playCount INTEGER NOT NULL DEFAULT 0,
      FOREIGN KEY (showId) REFERENCES PodcastShows(id),
      FOREIGN KEY (hostId) REFERENCES Hosts(id)
    );

    CREATE TABLE IF NOT EXISTS Bookmarks (
      id TEXT PRIMARY KEY,
      episodeId TEXT NOT NULL,
      timestampSec INTEGER,
      note TEXT NOT NULL DEFAULT '',
      createdAt TEXT NOT NULL,
      FOREIGN KEY (episodeId) REFERENCES Episodes(id)
    );

    CREATE TABLE IF NOT EXISTS Favorites (
      showId TEXT PRIMARY KEY,
      createdAt TEXT NOT NULL,
      FOREIGN KEY (showId) REFERENCES PodcastShows(id)
    );

    CREATE TABLE IF NOT EXISTS ListeningHistory (
      episodeId TEXT PRIMARY KEY,
      positionSec INTEGER NOT NULL DEFAULT 0,
      playedAt TEXT NOT NULL,
      FOREIGN KEY (episodeId) REFERENCES Episodes(id)
    );

    CREATE TABLE IF NOT EXISTS Subscriptions (
      targetId TEXT PRIMARY KEY,
      targetType TEXT NOT NULL CHECK(targetType IN ('show', 'host')),
      createdAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS UserPreferences (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      prefsJson TEXT NOT NULL
    );
  `);

  seedCatalog();
  return db;
}

function seedCatalog(): void {
  const hostStmt = db.prepare(`
    INSERT OR REPLACE INTO Hosts (
      id, name, nativeName, language, avatarUrl, bio, city, totalListens, subscriberCount, socialsJson
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const showStmt = db.prepare(`
    INSERT OR REPLACE INTO PodcastShows (
      id, title, nativeTitle, subtitle, description, language, genre, coverUrl, hostId, subscriberCount, totalEpisodes, trendingScore, featured
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const epStmt = db.prepare(`
    INSERT OR REPLACE INTO Episodes (
      id, showId, episodeNumber, title, description, audioUrl, thumbnailUrl, durationSec, language, genre, hostId, publishedAt, topicsJson, chaptersJson, transcriptJson, playCount
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const runSeed = db.transaction(() => {
    for (const h of HOSTS) {
      hostStmt.run(
        h.id,
        h.name,
        h.nativeName,
        h.language,
        h.avatarUrl,
        h.bio,
        h.city,
        h.totalListens,
        h.subscriberCount,
        JSON.stringify(h.socials)
      );
    }

    for (const s of PODCAST_SHOWS) {
      showStmt.run(
        s.id,
        s.title,
        s.nativeTitle,
        s.subtitle,
        s.description,
        s.language,
        s.genre,
        s.coverUrl,
        s.hostId,
        s.subscriberCount,
        s.totalEpisodes,
        s.trendingScore,
        s.featured ? 1 : 0
      );
    }

    for (const e of EPISODES) {
      epStmt.run(
        e.id,
        e.showId,
        e.episodeNumber,
        e.title,
        e.description,
        e.audioUrl,
        e.thumbnailUrl,
        e.durationSec,
        e.language,
        e.genre,
        e.hostId,
        e.publishedAt,
        JSON.stringify(e.topics),
        JSON.stringify(e.chapters),
        JSON.stringify(e.transcript),
        e.playCount
      );
    }

    const prefRow = db.prepare('SELECT id FROM UserPreferences WHERE id = 1').get();
    if (!prefRow) {
      db.prepare('INSERT INTO UserPreferences (id, prefsJson) VALUES (1, ?)').run(
        JSON.stringify(DEFAULT_PREFS)
      );
    }
  });

  runSeed();
}

function mapHost(row: any): Host {
  return {
    id: row.id,
    name: row.name,
    nativeName: row.nativeName,
    language: row.language,
    avatarUrl: row.avatarUrl,
    bio: row.bio,
    city: row.city,
    totalListens: row.totalListens,
    subscriberCount: row.subscriberCount,
    socials: JSON.parse(row.socialsJson || '{}'),
  };
}

function mapShow(row: any): PodcastShow {
  return {
    id: row.id,
    title: row.title,
    nativeTitle: row.nativeTitle,
    subtitle: row.subtitle,
    description: row.description,
    language: row.language,
    genre: row.genre,
    coverUrl: row.coverUrl,
    hostId: row.hostId,
    hostName: row.hostName,
    subscriberCount: row.subscriberCount,
    totalEpisodes: row.totalEpisodes,
    trendingScore: row.trendingScore,
    featured: Boolean(row.featured),
  };
}

function mapEpisode(row: any): Episode {
  return {
    id: row.id,
    showId: row.showId,
    showTitle: row.showTitle,
    episodeNumber: row.episodeNumber,
    title: row.title,
    description: row.description,
    audioUrl: row.audioUrl,
    thumbnailUrl: row.thumbnailUrl,
    durationSec: row.durationSec,
    language: row.language,
    genre: row.genre,
    hostId: row.hostId,
    hostName: row.hostName,
    publishedAt: row.publishedAt,
    topics: JSON.parse(row.topicsJson || '[]'),
    chapters: JSON.parse(row.chaptersJson || '[]'),
    transcript: JSON.parse(row.transcriptJson || '[]'),
    playCount: row.playCount,
  };
}

export function listShows(filters?: { language?: string; genre?: string; sort?: string }): PodcastShow[] {
  const database = initDatabase();
  const clauses: string[] = [];
  const params: any[] = [];

  if (filters?.language && filters.language !== 'All') {
    clauses.push('s.language = ?');
    params.push(filters.language);
  }
  if (filters?.genre && filters.genre !== 'All') {
    clauses.push('s.genre = ?');
    params.push(filters.genre);
  }

  const where = clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : '';
  const order =
    filters?.sort === 'subscribers'
      ? 'ORDER BY s.subscriberCount DESC'
      : 'ORDER BY s.trendingScore DESC, s.subscriberCount DESC';

  const rows = database
    .prepare(
      `SELECT s.*, h.name as hostName
       FROM PodcastShows s
       JOIN Hosts h ON s.hostId = h.id
       ${where}
       ${order}`
    )
    .all(...params);

  return rows.map(mapShow);
}

export function getShowById(id: string): { show: PodcastShow; host: Host; episodes: Episode[] } | null {
  const database = initDatabase();
  const showRow = database
    .prepare(
      `SELECT s.*, h.name as hostName
       FROM PodcastShows s
       JOIN Hosts h ON s.hostId = h.id
       WHERE s.id = ?`
    )
    .get(id);

  if (!showRow) return null;

  const hostRow = database.prepare('SELECT * FROM Hosts WHERE id = ?').get((showRow as any).hostId);
  const epRows = database
    .prepare(
      `SELECT e.*, s.title as showTitle, h.name as hostName
       FROM Episodes e
       JOIN PodcastShows s ON e.showId = s.id
       JOIN Hosts h ON e.hostId = h.id
       WHERE e.showId = ?
       ORDER BY e.episodeNumber ASC`
    )
    .all(id);

  return {
    show: mapShow(showRow),
    host: mapHost(hostRow),
    episodes: epRows.map(mapEpisode),
  };
}

export function listEpisodes(filters?: {
  language?: string;
  genre?: string;
  showId?: string;
  limit?: number;
}): Episode[] {
  const database = initDatabase();
  const clauses: string[] = [];
  const params: any[] = [];

  if (filters?.language && filters.language !== 'All') {
    clauses.push('e.language = ?');
    params.push(filters.language);
  }
  if (filters?.genre && filters.genre !== 'All') {
    clauses.push('e.genre = ?');
    params.push(filters.genre);
  }
  if (filters?.showId) {
    clauses.push('e.showId = ?');
    params.push(filters.showId);
  }

  const where = clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : '';
  const limitSql = filters?.limit ? `LIMIT ${Math.max(1, Math.min(100, filters.limit))}` : '';

  const rows = database
    .prepare(
      `SELECT e.*, s.title as showTitle, h.name as hostName
       FROM Episodes e
       JOIN PodcastShows s ON e.showId = s.id
       JOIN Hosts h ON e.hostId = h.id
       ${where}
       ORDER BY e.playCount DESC, e.publishedAt DESC
       ${limitSql}`
    )
    .all(...params);

  return rows.map(mapEpisode);
}

export function getEpisodeById(id: string): Episode | null {
  const database = initDatabase();
  const row = database
    .prepare(
      `SELECT e.*, s.title as showTitle, h.name as hostName
       FROM Episodes e
       JOIN PodcastShows s ON e.showId = s.id
       JOIN Hosts h ON e.hostId = h.id
       WHERE e.id = ?`
    )
    .get(id);

  return row ? mapEpisode(row) : null;
}

export function getLanguageChannels(): LanguageChannel[] {
  const database = initDatabase();
  const showCounts = database
    .prepare('SELECT language, COUNT(*) as count FROM PodcastShows GROUP BY language')
    .all() as Array<{ language: string; count: number }>;
  const epCounts = database
    .prepare('SELECT language, COUNT(*) as count FROM Episodes GROUP BY language')
    .all() as Array<{ language: string; count: number }>;

  const showMap = new Map(showCounts.map((r) => [r.language, r.count]));
  const epMap = new Map(epCounts.map((r) => [r.language, r.count]));

  return LANGUAGE_CHANNELS.map((ch) => ({
    ...ch,
    showCount: showMap.get(ch.name) || 0,
    episodeCount: epMap.get(ch.name) || 0,
  }));
}

export function getHostById(id: string): { host: Host; shows: PodcastShow[]; episodes: Episode[] } | null {
  const database = initDatabase();
  const hostRow = database.prepare('SELECT * FROM Hosts WHERE id = ?').get(id);
  if (!hostRow) return null;

  const showRows = database
    .prepare(
      `SELECT s.*, h.name as hostName
       FROM PodcastShows s
       JOIN Hosts h ON s.hostId = h.id
       WHERE s.hostId = ?
       ORDER BY s.trendingScore DESC`
    )
    .all(id);

  const epRows = database
    .prepare(
      `SELECT e.*, s.title as showTitle, h.name as hostName
       FROM Episodes e
       JOIN PodcastShows s ON e.showId = s.id
       JOIN Hosts h ON e.hostId = h.id
       WHERE e.hostId = ?
       ORDER BY e.publishedAt DESC`
    )
    .all(id);

  return {
    host: mapHost(hostRow),
    shows: showRows.map(mapShow),
    episodes: epRows.map(mapEpisode),
  };
}

export function listHosts(): Host[] {
  const database = initDatabase();
  const rows = database.prepare('SELECT * FROM Hosts ORDER BY subscriberCount DESC').all();
  return rows.map(mapHost);
}

export function searchCatalog(
  rawQuery: string,
  filters?: { language?: string; genre?: string }
): {
  episodes: Array<Episode & { matchedSnippet?: string }>;
  shows: PodcastShow[];
} {
  const normalizedQuery = rawQuery.normalize('NFC').trim().toLowerCase();
  const allShows = listShows(filters);
  const allEpisodes = listEpisodes(filters);

  if (!normalizedQuery) {
    return {
      episodes: allEpisodes,
      shows: allShows,
    };
  }

  // Expand query with phonetic / native script aliases
  const searchTerms = new Set<string>([normalizedQuery]);
  for (const [key, aliases] of SCRIPT_ALIASES) {
    const keyNfc = key.normalize('NFC').toLowerCase();
    if (keyNfc.includes(normalizedQuery) || normalizedQuery.includes(keyNfc)) {
      aliases.forEach((a) => searchTerms.add(a.normalize('NFC').toLowerCase()));
    }
    for (const alias of aliases) {
      const aliasNfc = alias.normalize('NFC').toLowerCase();
      if (aliasNfc.includes(normalizedQuery) || normalizedQuery.includes(aliasNfc)) {
        searchTerms.add(keyNfc);
        aliases.forEach((a) => searchTerms.add(a.normalize('NFC').toLowerCase()));
      }
    }
  }

  const matchesAnyTerm = (text: string): boolean => {
    const hay = text.normalize('NFC').toLowerCase();
    for (const term of searchTerms) {
      if (hay.includes(term)) return true;
    }
    return false;
  };

  const matchedShows = allShows.filter((s) =>
    matchesAnyTerm(
      `${s.title} ${s.nativeTitle} ${s.subtitle} ${s.description} ${s.language} ${s.genre} ${s.hostName || ''}`
    )
  );

  const matchedEpisodes: Array<Episode & { matchedSnippet?: string }> = [];

  for (const ep of allEpisodes) {
    const metaHay = `${ep.title} ${ep.description} ${ep.showTitle || ''} ${ep.hostName || ''} ${ep.language} ${ep.genre} ${ep.topics.join(' ')}`;
    let matchedSnippet: string | undefined;

    for (const cue of ep.transcript) {
      const cueCombined = `${cue.nativeText} ${cue.text}`;
      if (matchesAnyTerm(cueCombined)) {
        matchedSnippet = `${cue.nativeText} — ${cue.text}`;
        break;
      }
    }

    if (matchesAnyTerm(metaHay) || matchedSnippet) {
      matchedEpisodes.push({
        ...ep,
        matchedSnippet,
      });
    }
  }

  return {
    episodes: matchedEpisodes,
    shows: matchedShows,
  };
}

export function getLibrarySnapshot(): LibrarySnapshot {
  const database = initDatabase();

  const bookmarks = database
    .prepare('SELECT * FROM Bookmarks ORDER BY createdAt DESC')
    .all() as Bookmark[];
  const favorites = database
    .prepare('SELECT * FROM Favorites ORDER BY createdAt DESC')
    .all() as FavoriteShow[];
  const subscriptions = database
    .prepare('SELECT * FROM Subscriptions ORDER BY createdAt DESC')
    .all() as SubscriptionItem[];
  const history = database
    .prepare('SELECT * FROM ListeningHistory ORDER BY playedAt DESC LIMIT 25')
    .all() as ListeningHistoryItem[];
  const prefRow = database.prepare('SELECT prefsJson FROM UserPreferences WHERE id = 1').get() as
    | { prefsJson: string }
    | undefined;

  return {
    bookmarks,
    favorites,
    subscriptions,
    history,
    preferences: prefRow ? JSON.parse(prefRow.prefsJson) : DEFAULT_PREFS,
  };
}

export function saveBookmark(input: {
  episodeId: string;
  timestampSec?: number | null;
  note?: string;
}): Bookmark {
  const database = initDatabase();
  const id =
    input.timestampSec !== null && input.timestampSec !== undefined
      ? `bm-${input.episodeId}-${Math.floor(input.timestampSec)}-${Date.now()}`
      : `bm-${input.episodeId}`;
  const createdAt = new Date().toISOString();
  const ts =
    input.timestampSec !== null && input.timestampSec !== undefined
      ? Math.max(0, Math.floor(input.timestampSec))
      : null;

  database
    .prepare(
      `INSERT OR REPLACE INTO Bookmarks (id, episodeId, timestampSec, note, createdAt)
       VALUES (?, ?, ?, ?, ?)`
    )
    .run(id, input.episodeId, ts, (input.note || '').trim(), createdAt);

  return {
    id,
    episodeId: input.episodeId,
    timestampSec: ts,
    note: (input.note || '').trim(),
    createdAt,
  };
}

export function removeBookmark(idOrEpisodeId: string): boolean {
  const database = initDatabase();
  const res = database
    .prepare('DELETE FROM Bookmarks WHERE id = ? OR (episodeId = ? AND timestampSec IS NULL)')
    .run(idOrEpisodeId, idOrEpisodeId);
  return res.changes > 0;
}

export function addFavoriteShow(showId: string): FavoriteShow {
  const database = initDatabase();
  const createdAt = new Date().toISOString();
  database
    .prepare('INSERT OR REPLACE INTO Favorites (showId, createdAt) VALUES (?, ?)')
    .run(showId, createdAt);
  return { showId, createdAt };
}

export function removeFavoriteShow(showId: string): boolean {
  const database = initDatabase();
  const res = database.prepare('DELETE FROM Favorites WHERE showId = ?').run(showId);
  return res.changes > 0;
}

export function addSubscription(targetId: string, targetType: 'show' | 'host'): SubscriptionItem {
  const database = initDatabase();
  const createdAt = new Date().toISOString();
  database
    .prepare('INSERT OR REPLACE INTO Subscriptions (targetId, targetType, createdAt) VALUES (?, ?, ?)')
    .run(targetId, targetType, createdAt);
  return { targetId, targetType, createdAt };
}

export function removeSubscription(targetId: string): boolean {
  const database = initDatabase();
  const res = database.prepare('DELETE FROM Subscriptions WHERE targetId = ?').run(targetId);
  return res.changes > 0;
}

export function recordListeningHistory(episodeId: string, positionSec: number): ListeningHistoryItem {
  const database = initDatabase();
  const playedAt = new Date().toISOString();
  const safePos = Math.max(0, Math.floor(positionSec));
  database
    .prepare(
      `INSERT OR REPLACE INTO ListeningHistory (episodeId, positionSec, playedAt)
       VALUES (?, ?, ?)`
    )
    .run(episodeId, safePos, playedAt);

  return { episodeId, positionSec: safePos, playedAt };
}

export function clearListeningHistory(): void {
  const database = initDatabase();
  database.prepare('DELETE FROM ListeningHistory').run();
}

export function updatePreferences(partial: Partial<UserPreferences>): UserPreferences {
  const database = initDatabase();
  const current = getLibrarySnapshot().preferences;
  const merged: UserPreferences = {
    ...current,
    ...partial,
  };
  database
    .prepare('INSERT OR REPLACE INTO UserPreferences (id, prefsJson) VALUES (1, ?)')
    .run(JSON.stringify(merged));
  return merged;
}
