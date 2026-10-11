import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DB_FILE_PATH = path.join(__dirname, 'zombiapp_database.json');

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

function buildDeterministicSummary(session: any): string {
  if (!session || !Array.isArray(session.survivors) || session.survivors.length === 0) {
    return 'A missão foi concluída com sucesso pela equipe na mesa!';
  }

  const parts: string[] = [];
  session.survivors.forEach((s: any, idx: number) => {
    const rawName = s.character_name || (s.character_id ? String(s.character_id).replace(/^char_/, '') : s.username);
    const charName = rawName.charAt(0).toUpperCase() + rawName.slice(1);
    const wounds = Number(s.health || 0);
    const maxHealth = Number(s.max_health || 3);
    const isDead = wounds >= maxHealth;

    const inv = s.inventory_json || {};
    const equippedItems = [
      inv.handLeft,
      inv.handRight,
      ...(Array.isArray(inv.backpack) ? inv.backpack : []),
    ].filter((it: any) => it && it.category !== 'WOUND');

    const itemNames = equippedItems.map((it: any) => it.name).slice(0, 2);

    if (isDead) {
      parts.push(
        `${charName} (@${s.username}) morreu durante a partida após sofrer ${wounds} ferimentos tentando conter a horda`
      );
    } else if (wounds >= maxHealth - 1) {
      parts.push(
        `${charName} (@${s.username}) escapou por pouco com ${wounds} ferimento(s)${
          idx === session.survivors.length - 1 ? ' e foi o último a concluir a missão' : ''
        }`
      );
    } else if (equippedItems.length >= 3) {
      parts.push(
        `${charName} (@${s.username}) terminou com ${wounds} ferimento(s), ${s.xp || 0} XP e bastante loot de equipamentos (${itemNames.join(', ')})`
      );
    } else {
      parts.push(
        `${charName} (@${s.username}) sobreviveu com ${wounds} ferimento(s) e ${s.xp || 0} XP${
          itemNames.length > 0 ? ` carregando ${itemNames.join(' e ')}` : ''
        }`
      );
    }
  });

  return `Missão concluída na Rodada ${session.round || 1}: ${parts.join('; ')}.`;
}

interface PersistedDatabase {
  latestRoomCode: string | null;
  roomsByCode: Record<string, { session: any; updatedAt: number }>;
  matchHistory: any[];
}

function readDatabase(): PersistedDatabase {
  try {
    if (fs.existsSync(DB_FILE_PATH)) {
      const raw = fs.readFileSync(DB_FILE_PATH, 'utf-8');
      const parsed = JSON.parse(raw);
      return {
        latestRoomCode: parsed.latestRoomCode || null,
        roomsByCode: parsed.roomsByCode || {},
        matchHistory: Array.isArray(parsed.matchHistory) ? parsed.matchHistory : [],
      };
    }
  } catch (err) {
    console.error('Error reading zombiapp_database.json:', err);
  }
  return {
    latestRoomCode: null,
    roomsByCode: {},
    matchHistory: [],
  };
}

function writeDatabase(db: PersistedDatabase) {
  try {
    fs.writeFileSync(DB_FILE_PATH, JSON.stringify(db, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error writing zombiapp_database.json:', err);
  }
}

const initialDb = readDatabase();
const roomsByCode = new Map<string, { session: any; updatedAt: number }>(
  Object.entries(initialDb.roomsByCode)
);
let latestRoomCode: string | null = initialDb.latestRoomCode;
let matchHistory: any[] = initialDb.matchHistory;

function persistAllToDisk() {
  const roomsObj: Record<string, { session: any; updatedAt: number }> = {};
  for (const [k, v] of roomsByCode.entries()) {
    roomsObj[k] = v;
  }
  writeDatabase({
    latestRoomCode,
    roomsByCode: roomsObj,
    matchHistory,
  });
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '15mb' }));

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
      persistAllToDisk();
      res.json({ ok: true, updatedAt: now });
      return;
    }

    const code = String(session.room_code || 'ZMB204').trim().toUpperCase();
    roomsByCode.set(code, { session, updatedAt: now });
    latestRoomCode = code;
    persistAllToDisk();
    res.json({ ok: true, updatedAt: now });
  });

  // List all saved/ended/paused matches in the database history
  app.get('/api/matches/history', (_req, res) => {
    const sorted = [...matchHistory].sort(
      (a, b) => (b.saved_timestamp || 0) - (a.saved_timestamp || 0)
    );
    res.json({ matches: sorted });
  });

  // Generate a brief AI summary of the match turns and final survivor states using Gemini 3.8 Flash
  app.post('/api/matches/generate-summary', async (req, res) => {
    const { session } = req.body;
    if (!session) {
      res.status(400).json({ ok: false, message: 'Sessão ausente para leitura da IA.' });
      return;
    }

    const fallbackSummary = buildDeterministicSummary(session);

    if (!process.env.GEMINI_API_KEY) {
      res.json({ ok: true, summary: fallbackSummary, usedAi: false });
      return;
    }

    try {
      const survivorsBreakdown = Array.isArray(session.survivors)
        ? session.survivors.map((s: any, idx: number) => {
            const rawName =
              s.character_name ||
              (s.character_id ? String(s.character_id).replace(/^char_/, '') : s.username);
            const inv = s.inventory_json || {};
            const items = [
              inv.handLeft?.name,
              inv.handRight?.name,
              ...(Array.isArray(inv.backpack)
                ? inv.backpack.map((b: any) => b?.name)
                : []),
            ].filter((name: any) => name && name !== 'Ferimento (Wound)');

            const isDead = Number(s.health || 0) >= Number(s.max_health || 3);
            return `${idx + 1}. Personagem: ${rawName} (Jogador @${s.username}) | XP: ${
              s.xp || 0
            } | Ferimentos: ${s.health || 0}/${s.max_health || 3} (${
              isDead ? 'MORTO / ELIMINADO DURANTE A PARTIDA' : 'SOBREVIVEU'
            }) | Equipamentos/Loot: ${items.length > 0 ? items.join(', ') : 'Nenhum equipamento'}`;
          })
        : [];

      const recentLogs = Array.isArray(session.combat_log)
        ? session.combat_log
            .slice(0, 30)
            .reverse()
            .map((l: any) => `[${l.timestamp}] ${l.message}`)
            .join('\n')
        : '';

      const prompt = `Você é o narrador tático de uma mesa de Zombicide. Faça um resumo MUITO BREVE (em português, de 2 a 3 frases curtas num único parágrafo direto) contando como foi a partida de acordo com o passar dos turnos (${
        session.round || 1
      } rodadas na Sala "${session.room_name || session.room_code}") e PRINCIPALMENTE como ficou o estado final de cada personagem até a conclusão.
Siga exatamente este estilo de exemplo: "Ned terminou com 2 ferimentos e com bastante loot de equipamentos, Wanda morreu durante a partida pois não conseguiu escapar dos corredores, e Josh escapou por pouco e foi o último a concluir a missão."

Estado final dos personagens:
${survivorsBreakdown.join('\n')}

Histórico de eventos e turnos da partida:
${recentLogs || 'Partida concluída na mesa.'}`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt,
      });

      const generatedText = response.text?.trim() || fallbackSummary;
      res.json({ ok: true, summary: generatedText, usedAi: true });
    } catch (err: any) {
      console.error('Gemini summary error:', err);
      res.json({
        ok: true,
        summary: fallbackSummary,
        usedAi: false,
        error: err?.message,
      });
    }
  });

  // Host immediately disbands/abandons the room without saving to history
  app.post('/api/session/abandon', (req, res) => {
    const { roomCode } = req.body || {};
    const code = roomCode ? String(roomCode).trim().toUpperCase() : latestRoomCode;
    if (code) {
      roomsByCode.delete(code);
      if (latestRoomCode === code) {
        latestRoomCode = null;
      }
    } else if (latestRoomCode) {
      roomsByCode.delete(latestRoomCode);
      latestRoomCode = null;
    }
    persistAllToDisk();
    res.json({
      ok: true,
      message: 'Sala desfeita imediatamente pelo Host.',
    });
  });

  // Player leaves or abandons room without disbanding the entire room
  app.post('/api/session/leave', (req, res) => {
    const { roomCode, username, survivorId, mode, targetUsername } = req.body || {};
    const code = roomCode ? String(roomCode).trim().toUpperCase() : latestRoomCode;
    if (code && roomsByCode.has(code)) {
      const entry = roomsByCode.get(code)!;
      let session = entry.session;
      if (session) {
        const cleanUser = username ? String(username).toLowerCase().replace(/^@+/, '') : '';
        const joined_players = (session.joined_players || []).filter(
          (p: any) => String(p.username).toLowerCase().replace(/^@+/, '') !== cleanUser
        );
        let survivors = session.survivors || [];
        if (survivorId) {
          survivors = survivors.map((s: any) => {
            if (s.id !== survivorId) return s;
            if (mode === 'MARK_DEAD') {
              return {
                ...s,
                health: s.max_health || 3,
                actions_left: 0,
                moves_left: 0,
              };
            }
            if (mode === 'REASSIGN') {
              const newOwner = (targetUsername || session.host_username || 'host').replace(/^@+/, '');
              return {
                ...s,
                username: newOwner,
                user_id: `usr_${newOwner.toLowerCase()}`,
              };
            }
            return s;
          });
        }
        session = {
          ...session,
          joined_players,
          survivors,
        };
        roomsByCode.set(code, { session, updatedAt: Date.now() });
        persistAllToDisk();
      }
    }
    res.json({ ok: true, message: 'Jogador saiu da sala com sucesso.' });
  });

  // Save or update a match in the database history (PAUSADO, CONCLUIDO, ENCERRADO)
  app.post('/api/matches/save', async (req, res) => {
    const { session, historyStatus, aiSummary } = req.body;
    if (!session || !session.room_code) {
      res.status(400).json({ ok: false, message: 'Sessão inválida para salvar no banco de dados.' });
      return;
    }

    const validStatus =
      historyStatus === 'CONCLUIDO' || historyStatus === 'ENCERRADO' || historyStatus === 'PAUSADO'
        ? historyStatus
        : 'PAUSADO';

    const now = Date.now();
    const formattedDate = new Date(now).toLocaleString('pt-BR');
    const code = String(session.room_code).trim().toUpperCase();

    let finalSummary: string | undefined = aiSummary || session.ai_summary;
    if (validStatus === 'CONCLUIDO' && !finalSummary) {
      finalSummary = buildDeterministicSummary(session);
    }

    // Collect all participants (Host + Joined Players + Survivor Owners) so the match stays in everyone's history
    const participantSet = new Set<string>();
    if (session.host_username) participantSet.add(String(session.host_username));
    if (Array.isArray(session.joined_players)) {
      session.joined_players.forEach((p: any) => {
        if (p?.username) participantSet.add(String(p.username));
      });
    }
    if (Array.isArray(session.survivors)) {
      session.survivors.forEach((s: any) => {
        if (s?.username) participantSet.add(String(s.username));
      });
    }

    const updatedSession = {
      ...session,
      history_status: validStatus,
      ai_summary: finalSummary,
      status:
        validStatus === 'PAUSADO'
          ? 'PAUSED'
          : validStatus === 'CONCLUIDO'
          ? 'FINISHED'
          : 'ENDED',
    };

    const record = {
      id: session.id || `hist_${code}_${now}`,
      room_code: code,
      room_name: session.room_name || `Sala #${code}`,
      room_password_hash: session.room_password_hash || '',
      host_username: session.host_username || 'host',
      participants: Array.from(participantSet),
      history_status: validStatus,
      saved_at: formattedDate,
      saved_timestamp: now,
      round: session.round || 1,
      ai_summary: finalSummary,
      survivor_Summary: Array.isArray(session.survivors)
        ? session.survivors.map((s: any) => {
            const inv = s.inventory_json || {};
            const itemsCount = [
              inv.handLeft,
              inv.handRight,
              ...(Array.isArray(inv.backpack) ? inv.backpack : []),
            ].filter((it: any) => it && it.category !== 'WOUND').length;
            return {
              id: s.id,
              username: s.username,
              character_id: s.character_id,
              xp: s.xp,
              health: s.health,
              max_health: s.max_health,
              items_count: itemsCount,
            };
          })
        : [],
      has_board_photo: Boolean(session.board_save?.photo_data_url),
      pins_count: Array.isArray(session.board_save?.pins) ? session.board_save.pins.length : 0,
      zones_count: Array.isArray(session.board_save?.zones) ? session.board_save.zones.length : 0,
      session_snapshot: updatedSession,
    };

    // Upsert by session.id or room_code so the room's entry in match history stays updated
    const existingIdx = matchHistory.findIndex(
      (m) => m.id === record.id || m.room_code.toUpperCase() === code
    );
    if (existingIdx >= 0) {
      matchHistory[existingIdx] = record;
    } else {
      matchHistory.unshift(record);
    }

    // Clear active session so the gameplay is closed on all devices and can ONLY be rescued via Match History with the room password
    roomsByCode.delete(code);
    if (latestRoomCode === code) {
      latestRoomCode = null;
    }
    persistAllToDisk();

    res.json({
      ok: true,
      record,
      matches: [...matchHistory].sort(
        (a, b) => (b.saved_timestamp || 0) - (a.saved_timestamp || 0)
      ),
    });
  });

  // Load a saved match from history by verifying the room password
  app.post('/api/matches/load', (req, res) => {
    const { matchId, roomCode, passwordHash } = req.body;
    const found = matchHistory.find(
      (m) =>
        (matchId && m.id === matchId) ||
        (roomCode && String(m.room_code).toUpperCase() === String(roomCode).trim().toUpperCase())
    );

    if (!found) {
      res.status(404).json({
        ok: false,
        message: 'Partida não encontrada no histórico do banco de dados.',
      });
      return;
    }

    if (found.room_password_hash && found.room_password_hash !== passwordHash) {
      res.status(403).json({
        ok: false,
        message: 'Senha da sala incorreta! Digite a senha cadastrada pelo Host da sala para carregar a partida.',
      });
      return;
    }

    const now = Date.now();
    const restoredSession = {
      ...found.session_snapshot,
      status: 'IN_PROGRESS',
    };
    const code = String(restoredSession.room_code).toUpperCase();
    roomsByCode.set(code, { session: restoredSession, updatedAt: now });
    latestRoomCode = code;
    persistAllToDisk();

    res.json({
      ok: true,
      session: restoredSession,
      record: found,
    });
  });

  // Delete a match from history if desired
  app.delete('/api/matches/:id', (req, res) => {
    const { id } = req.params;
    matchHistory = matchHistory.filter((m) => m.id !== id);
    persistAllToDisk();
    res.json({
      ok: true,
      matches: [...matchHistory].sort(
        (a, b) => (b.saved_timestamp || 0) - (a.saved_timestamp || 0)
      ),
    });
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
