import dotenv from 'dotenv';
import express, { type NextFunction, type Request, type Response } from 'express';
import fs from 'fs';
import path from 'path';
import { getEpisodeWavBuffer } from './server/audioSynth';
import {
  addFavoriteShow,
  addSubscription,
  clearListeningHistory,
  getEpisodeById,
  getHostById,
  getLanguageChannels,
  getLibrarySnapshot,
  getShowById,
  initDatabase,
  listEpisodes,
  listHosts,
  listShows,
  recordListeningHistory,
  removeBookmark,
  removeFavoriteShow,
  removeSubscription,
  saveBookmark,
  searchCatalog,
  updatePreferences,
} from './server/db';

dotenv.config();

async function startServer() {
  initDatabase();

  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  app.use(express.json({ limit: '1mb' }));

  // API Routes
  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', service: 'EchoEpisodes Regional Radio' });
  });

  app.get('/api/channels', (_req, res) => {
    res.json({ channels: getLanguageChannels() });
  });

  app.get('/api/shows', (req, res) => {
    const language = typeof req.query.language === 'string' ? req.query.language : undefined;
    const genre = typeof req.query.genre === 'string' ? req.query.genre : undefined;
    const sort = typeof req.query.sort === 'string' ? req.query.sort : undefined;
    res.json({ shows: listShows({ language, genre, sort }) });
  });

  app.get('/api/shows/:id', (req, res) => {
    const result = getShowById(req.params.id);
    if (!result) {
      res.status(404).json({ error: 'Podcast show not found' });
      return;
    }
    res.json(result);
  });

  app.get('/api/episodes', (req, res) => {
    const language = typeof req.query.language === 'string' ? req.query.language : undefined;
    const genre = typeof req.query.genre === 'string' ? req.query.genre : undefined;
    const showId = typeof req.query.showId === 'string' ? req.query.showId : undefined;
    const limit = typeof req.query.limit === 'string' ? Number(req.query.limit) : undefined;
    res.json({ episodes: listEpisodes({ language, genre, showId, limit }) });
  });

  app.get('/api/episodes/:id', (req, res) => {
    const episode = getEpisodeById(req.params.id);
    if (!episode) {
      res.status(404).json({ error: 'Episode not found' });
      return;
    }
    res.json({ episode });
  });

  app.get('/api/episodes/:id/transcript', (req, res) => {
    const episode = getEpisodeById(req.params.id);
    if (!episode) {
      res.status(404).json({ error: 'Episode not found' });
      return;
    }
    res.json({
      episodeId: episode.id,
      title: episode.title,
      language: episode.language,
      transcript: episode.transcript,
      chapters: episode.chapters,
    });
  });

  app.get('/api/hosts', (_req, res) => {
    res.json({ hosts: listHosts() });
  });

  app.get('/api/hosts/:id', (req, res) => {
    const result = getHostById(req.params.id);
    if (!result) {
      res.status(404).json({ error: 'Host not found' });
      return;
    }
    res.json(result);
  });

  app.get('/api/search', (req, res) => {
    const q = typeof req.query.q === 'string' ? req.query.q.normalize('NFC') : '';
    const language = typeof req.query.language === 'string' ? req.query.language : undefined;
    const genre = typeof req.query.genre === 'string' ? req.query.genre : undefined;
    res.json(searchCatalog(q, { language, genre }));
  });

  app.get('/api/library', (_req, res) => {
    res.json(getLibrarySnapshot());
  });

  app.post('/api/bookmarks', (req, res) => {
    const { episodeId, timestampSec, note } = req.body || {};
    if (typeof episodeId !== 'string' || !episodeId.trim()) {
      res.status(400).json({ error: 'Valid episodeId is required' });
      return;
    }
    const episode = getEpisodeById(episodeId);
    if (!episode) {
      res.status(404).json({ error: 'Episode not found' });
      return;
    }
    if (timestampSec !== undefined && timestampSec !== null && (typeof timestampSec !== 'number' || Number.isNaN(timestampSec) || timestampSec < 0)) {
      res.status(400).json({ error: 'timestampSec must be a non-negative number' });
      return;
    }
    const safeNote = typeof note === 'string' ? note.slice(0, 240) : '';
    const bookmark = saveBookmark({ episodeId, timestampSec: timestampSec ?? null, note: safeNote });
    res.status(201).json({ bookmark });
  });

  app.delete('/api/bookmarks/:id', (req, res) => {
    const removed = removeBookmark(req.params.id);
    res.json({ removed });
  });

  app.post('/api/favorites', (req, res) => {
    const { showId } = req.body || {};
    if (typeof showId !== 'string' || !showId.trim()) {
      res.status(400).json({ error: 'Valid showId is required' });
      return;
    }
    const show = getShowById(showId);
    if (!show) {
      res.status(404).json({ error: 'Podcast show not found' });
      return;
    }
    const favorite = addFavoriteShow(showId);
    res.status(201).json({ favorite });
  });

  app.delete('/api/favorites/:showId', (req, res) => {
    const removed = removeFavoriteShow(req.params.showId);
    res.json({ removed });
  });

  app.post('/api/subscriptions', (req, res) => {
    const { targetId, targetType } = req.body || {};
    if (typeof targetId !== 'string' || !targetId.trim()) {
      res.status(400).json({ error: 'Valid targetId is required' });
      return;
    }
    if (targetType !== 'show' && targetType !== 'host') {
      res.status(400).json({ error: 'targetType must be "show" or "host"' });
      return;
    }
    const subscription = addSubscription(targetId, targetType);
    res.status(201).json({ subscription });
  });

  app.delete('/api/subscriptions/:targetId', (req, res) => {
    const removed = removeSubscription(req.params.targetId);
    res.json({ removed });
  });

  app.post('/api/history', (req, res) => {
    const { episodeId, positionSec } = req.body || {};
    if (typeof episodeId !== 'string' || !episodeId.trim()) {
      res.status(400).json({ error: 'Valid episodeId is required' });
      return;
    }
    const episode = getEpisodeById(episodeId);
    if (!episode) {
      res.status(404).json({ error: 'Episode not found' });
      return;
    }
    const safePos = typeof positionSec === 'number' && !Number.isNaN(positionSec) ? positionSec : 0;
    const item = recordListeningHistory(episodeId, safePos);
    res.status(201).json({ item });
  });

  app.delete('/api/history', (_req, res) => {
    clearListeningHistory();
    res.json({ cleared: true });
  });

  app.put('/api/preferences', (req, res) => {
    const body = req.body || {};
    if (body.displayName !== undefined && (typeof body.displayName !== 'string' || !body.displayName.trim())) {
      res.status(400).json({ error: 'Display name cannot be empty' });
      return;
    }
    const preferences = updatePreferences(body);
    res.json({ preferences });
  });

  // Playable regional audio streaming endpoint with HTTP Range (206) support
  app.get('/api/audio/:episodeId', (req, res) => {
    const episode = getEpisodeById(req.params.episodeId);
    if (!episode) {
      res.status(404).json({ error: 'Audio stream not found' });
      return;
    }

    const wavBuffer = getEpisodeWavBuffer(episode.id, episode.language, episode.durationSec);
    const totalLength = wavBuffer.length;
    const range = req.headers.range;

    if (range) {
      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : totalLength - 1;

      if (Number.isNaN(start) || start >= totalLength || end >= totalLength || start > end) {
        res.status(416).set('Content-Range', `bytes */${totalLength}`).end();
        return;
      }

      const chunkSize = end - start + 1;
      res.writeHead(206, {
        'Content-Range': `bytes ${start}-${end}/${totalLength}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunkSize,
        'Content-Type': 'audio/wav',
        'Cache-Control': 'public, max-age=3600',
      });
      res.end(wavBuffer.subarray(start, end + 1));
      return;
    }

    res.writeHead(200, {
      'Content-Length': totalLength,
      'Content-Type': 'audio/wav',
      'Accept-Ranges': 'bytes',
      'Cache-Control': 'public, max-age=3600',
    });
    res.end(wavBuffer);
  });

  // API Error handler
  app.use('/api', (err: any, _req: Request, res: Response, _next: NextFunction) => {
    console.error('API error:', err);
    res.status(500).json({ error: 'Internal server error' });
  });

  // Vite middleware in development, static dist in production
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distDir));
    app.get('/{*splat}', (_req, res) => {
      const indexHtml = path.join(distDir, 'index.html');
      if (fs.existsSync(indexHtml)) {
        res.sendFile(indexHtml);
      } else {
        res.status(404).send('Build output not found');
      }
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`EchoEpisodes Regional Radio server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start EchoEpisodes server:', err);
  process.exit(1);
});
