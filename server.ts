import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// In-memory store of rooms by room_code (uppercase) + latest active room
const roomsByCode = new Map<string, { session: unknown; updatedAt: number }>();
let latestRoomCode: string | null = null;

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '5mb' }));

  // Get room state by roomCode or return the latest active room
  app.get('/api/session', (req, res) => {
    const codeParam = typeof req.query.roomCode === 'string' ? req.query.roomCode.trim().toUpperCase() : '';
    if (codeParam && roomsByCode.has(codeParam)) {
      const entry = roomsByCode.get(codeParam)!;
      res.json({ session: entry.session, updatedAt: entry.updatedAt });
      return;
    }

    if (latestRoomCode && roomsByCode.has(latestRoomCode)) {
      const entry = roomsByCode.get(latestRoomCode)!;
      res.json({ session: entry.session, updatedAt: entry.updatedAt });
      return;
    }

    res.json({ session: null, updatedAt: 0 });
  });

  // Update or clear room state
  app.post('/api/session', (req, res) => {
    const { session } = req.body;
    const now = Date.now();

    if (!session) {
      if (latestRoomCode) {
        roomsByCode.delete(latestRoomCode);
      }
      latestRoomCode = null;
      res.json({ ok: true, updatedAt: now });
      return;
    }

    const code = String(session.room_code || 'ZMB204').trim().toUpperCase();
    roomsByCode.set(code, { session, updatedAt: now });
    latestRoomCode = code;
    res.json({ ok: true, updatedAt: now });
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`ZOMBIAPP server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
