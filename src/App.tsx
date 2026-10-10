/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  UserProfile,
  GameSession,
  SurvivorState,
  GameItem,
  SlotKey,
} from './types/game';
import {
  CHARACTERS_CATALOG,
  ITEMS_DATABASE,
  calculateSurvivorCapabilities,
} from './data/zombicideCatalog';
import { AuthAndLobby } from './components/AuthAndLobby';
import { SurvivorDashboard } from './components/SurvivorDashboard';
import { CatalogExplorer } from './components/CatalogExplorer';
import { LevelUpModal } from './components/LevelUpModal';
import { ZombieLogoIcon, BloodSplatterBackdrop } from './components/BloodDecor';
import { soundFX } from './utils/sound';
import {
  Volume2,
  VolumeX,
  RotateCcw,
  Users,
  Menu,
  X,
  Skull,
  FastForward,
  Crown,
  Lock,
  BookOpen,
  HelpCircle,
  Heart,
  Dices,
} from 'lucide-react';

type ActiveTab = 'LOBBY' | 'DASHBOARD' | 'CATALOG' | 'INSTRUCTIONS' | 'LOG';

const STORAGE_KEY_SESSION = 'zombicide_companion_session_v15';
const STORAGE_KEY_USERS = 'zombicide_companion_users_v15';
const STORAGE_KEY_CURRENT_USER = 'zombicide_companion_current_user_v15';

// Deterministic simulated Argon2id / Bcrypt hash for RF01.2
function computePasswordHash(plain: string, saltUser: string): string {
  let h1 = 0xdeadbeef ^ plain.length;
  let h2 = 0x41c6ce57 ^ saltUser.length;
  const combined = `${plain}:${saltUser}:zombicide_pepper_v15`;
  for (let i = 0; i < combined.length; i++) {
    const ch = combined.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 =
    Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^
    Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 =
    Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^
    Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  const hex =
    (h1 >>> 0).toString(16).padStart(8, '0') +
    (h2 >>> 0).toString(16).padStart(8, '0');
  return `$argon2id$v=19$m=65536,t=3,p=4$${btoa(saltUser).replace(/=/g, '')}$${hex}`;
}

function createJwtToken(username: string): string {
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).replace(/=/g, '');
  const payload = btoa(
    JSON.stringify({
      sub: username,
      iat: Math.floor(Date.now() / 1000),
      role: 'SURVIVOR_PLAYER',
    })
  ).replace(/=/g, '');
  return `${header}.${payload}.zmb_sig_9f8a7b`;
}

function createInitialSurvivorState(
  sessionId: string,
  username: string,
  characterId: string,
  initialXp: number = 0
): SurvivorState {
  const char =
    CHARACTERS_CATALOG.find((c) => c.id === characterId) || CHARACTERS_CATALOG[0];
  const startingItem =
    ITEMS_DATABASE.find((i) => i.id === char.startingEquipmentId) || null;

  const caps = calculateSurvivorCapabilities(char, initialXp, {
    orange: null,
    red: null,
  });

  return {
    id: `surv_${characterId}_${Math.random().toString(36).slice(2, 7)}`,
    session_id: sessionId,
    user_id: `usr_${username.toLowerCase()}`,
    username,
    character_id: characterId,
    xp: initialXp,
    health: 0,
    max_health: 3,
    actions_left: caps.maxActions,
    max_actions: caps.maxActions,
    moves_left: caps.freeMoveActions > 0 ? caps.freeMoveActions : 1,
    zones_per_move: caps.zonesPerMove,
    inventory_json: {
      handLeft: startingItem ? { ...startingItem } : null,
      handRight:
        characterId === 'char_doug'
          ? { ...(ITEMS_DATABASE.find((i) => i.id === 'eq_pistol') || startingItem!) }
          : null,
      backpack: [
        ITEMS_DATABASE.find((i) => i.id === 'eq_water') || null,
        null,
        null,
      ],
    },
    selected_skills_json: {
      orange: null,
      red: null,
    },
    skills_used_json: {},
  };
}

export default function App() {
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const [users, setUsers] = useState<UserProfile[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_USERS);
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore
    }
    return [];
  });

  const [currentUser, setCurrentUser] = useState<UserProfile | null>(() => {
    try {
      const savedCurrent = localStorage.getItem(STORAGE_KEY_CURRENT_USER);
      if (savedCurrent) return JSON.parse(savedCurrent);
    } catch {
      // ignore
    }
    return users[0] || null;
  });

  const [session, setSession] = useState<GameSession | null>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_SESSION);
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore
    }
    return null;
  });

  const isRemoteSyncRef = useRef(false);
  const lastZombiePhaseRef = useRef<boolean>(Boolean(session?.is_zombie_phase));

  // Always start on LOBBY (Step 1 Login & Room Creation) unless a match is actively in progress with survivors
  const [activeTab, setActiveTab] = useState<ActiveTab>(() => {
    if (session && session.status === 'IN_PROGRESS' && session.survivors.length > 0) {
      return 'DASHBOARD';
    }
    return 'LOBBY';
  });

  const [viewedSurvivorId, setViewedSurvivorId] = useState<string>(() => {
    return session?.survivors[0]?.id || '';
  });

  // Level-up modal queue state (RF03.4)
  const [pendingLevelUpModal, setPendingLevelUpModal] = useState<{
    survivorId: string;
    tier: 'ORANGE' | 'RED';
    isManualEdit: boolean;
  } | null>(null);

  useEffect(() => {
    try {
      if (currentUser) {
        localStorage.setItem(
          STORAGE_KEY_CURRENT_USER,
          JSON.stringify(currentUser)
        );
      } else {
        localStorage.removeItem(STORAGE_KEY_CURRENT_USER);
      }
    } catch {
      // ignore
    }
  }, [currentUser]);

  useEffect(() => {
    try {
      if (session) {
        localStorage.setItem(STORAGE_KEY_SESSION, JSON.stringify(session));
      } else {
        localStorage.removeItem(STORAGE_KEY_SESSION);
      }
    } catch {
      // ignore
    }

    if (session?.is_zombie_phase && !lastZombiePhaseRef.current) {
      soundFX.playZombiePhase();
    }
    lastZombiePhaseRef.current = Boolean(session?.is_zombie_phase);

    if (isRemoteSyncRef.current) {
      isRemoteSyncRef.current = false;
      return;
    }

    fetch('/api/session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ session }),
    }).catch(() => {
      // ignore offline errors
    });
  }, [session]);

  // Real-time synchronization across devices and browser tabs
  useEffect(() => {
    const handleStorageEvent = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY_SESSION) {
        try {
          const nextSess = e.newValue ? JSON.parse(e.newValue) : null;
          isRemoteSyncRef.current = true;
          setSession(nextSess);
        } catch {
          // ignore
        }
      }
    };
    window.addEventListener('storage', handleStorageEvent);

    const interval = window.setInterval(async () => {
      try {
        const res = await fetch('/api/session');
        if (!res.ok) return;
        const data = await res.json();
        if (data && data.session) {
          setSession((prev) => {
            const prevJson = prev ? JSON.stringify(prev) : '';
            const nextJson = JSON.stringify(data.session);
            if (prevJson !== nextJson) {
              isRemoteSyncRef.current = true;
              return data.session;
            }
            return prev;
          });
        }
      } catch {
        // ignore network error
      }
    }, 1200);

    return () => {
      window.removeEventListener('storage', handleStorageEvent);
      window.clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_USERS, JSON.stringify(users));
    } catch {
      // ignore
    }
  }, [users]);

  const appendLog = (
    prevSession: GameSession,
    message: string,
    type: GameSession['combat_log'][0]['type']
  ) => {
    const entry = {
      id: `log_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      timestamp: new Date().toLocaleTimeString('pt-BR', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      }),
      message,
      type,
    };
    return [entry, ...prevSession.combat_log].slice(0, 60);
  };

  // RF01 — Register or Authenticate User by Nickname & Profile Avatar (No personal password needed)
  const handleRegisterOrLogin = (username: string, avatarUrl?: string) => {
    const clean = username.trim().replace(/^@+/, '');
    const existing = users.find(
      (u) => u.username.toLowerCase() === clean.toLowerCase()
    );
    const computedHash = computePasswordHash('zombiapp_player_token', clean.toLowerCase());

    if (existing) {
      const updatedUser: UserProfile = {
        ...existing,
        avatar_url: avatarUrl || existing.avatar_url,
      };
      setUsers((prev) =>
        prev.map((u) => (u.id === existing.id ? updatedUser : u))
      );
      setCurrentUser(updatedUser);
      soundFX.playClick();
      return {
        success: true,
        message: `Nickname @${updatedUser.username} autenticado!`,
        user: updatedUser,
      };
    }

    const newUser: UserProfile = {
      id: `usr_${clean.toLowerCase()}_${Date.now()}`,
      username: clean,
      avatar_url: avatarUrl,
      password_hash: computedHash,
      jwt_token: createJwtToken(clean),
      created_at: new Date().toISOString(),
    };
    setUsers((prev) => [...prev, newUser]);
    setCurrentUser(newUser);
    soundFX.playClick();
    return {
      success: true,
      message: `Perfil @${newUser.username} criado com sucesso!`,
      user: newUser,
    };
  };

  // Host Creates the Room with Nickname, Profile Avatar, Room Code and Room Password
  const handleHostCreateRoom = (
    hostNickname: string,
    hostAvatarUrl: string,
    roomName: string,
    roomCode: string,
    roomPasswordPlain: string
  ) => {
    const cleanHost = hostNickname.trim().replace(/^@+/, '') || 'host';
    const authRes = handleRegisterOrLogin(cleanHost, hostAvatarUrl);
    const hostUser = authRes.user;
    const hostUsername = hostUser?.username || cleanHost;
    const hostId = hostUser?.id || `usr_${hostUsername}`;
    const code = roomCode.trim().toUpperCase() || 'ZMB204';
    const roomPasswordHash = computePasswordHash(
      roomPasswordPlain.trim(),
      `room_${code}`
    );

    const newSession: GameSession = {
      id: `sess_${Date.now()}`,
      room_code: code,
      room_name: roomName,
      room_password_hash: roomPasswordHash,
      host_user_id: hostId,
      host_username: hostUsername,
      status: 'LOBBY',
      round: 1,
      first_player_index: 0,
      turn_order_index: 0,
      is_zombie_phase: false,
      joined_players: [
        {
          user_id: hostId,
          username: hostUsername,
          avatar_url: hostAvatarUrl,
          is_host: true,
          joined_at: new Date().toISOString(),
        },
      ],
      survivors: [],
      combat_log: [
        {
          id: `log_${Date.now()}`,
          timestamp: new Date().toLocaleTimeString('pt-BR', {
            hour: '2-digit',
            minute: '2-digit',
          }),
          message: `Sala #${code} ("${roomName}") criada pelo Host @${hostUsername} com proteção por senha.`,
          type: 'TURN',
        },
      ],
    };

    soundFX.playLevelUp();
    setSession(newSession);
    return {
      success: true,
      message: `Sala #${code} criada por @${hostUsername}! Os demais jogadores já podem criar o nickname e entrar digitando a senha da sala.`,
    };
  };

  // Other Players Create Nickname + Choose Profile Image and Join the Host's Room using only the Host's Room Password
  const handlePlayerJoinRoom = (
    username: string,
    avatarUrl: string,
    roomCode: string,
    roomPasswordPlain: string
  ) => {
    if (!session) {
      return {
        success: false,
        message: 'Nenhuma sala foi criada pelo Host ainda.',
      };
    }

    if (roomCode.trim().toUpperCase() !== session.room_code.toUpperCase()) {
      return {
        success: false,
        message: `Código de sala incorreto. A sala ativa do Host é #${session.room_code}.`,
      };
    }

    const attemptedRoomHash = computePasswordHash(
      roomPasswordPlain.trim(),
      `room_${session.room_code}`
    );

    if (attemptedRoomHash !== session.room_password_hash) {
      return {
        success: false,
        message: 'Senha da sala incorreta! Digite a senha fornecida pelo Host.',
      };
    }

    const cleanNick = username.trim().replace(/^@+/, '');
    const authRes = handleRegisterOrLogin(cleanNick, avatarUrl);
    if (!authRes.success || !authRes.user) {
      return {
        success: false,
        message: authRes.message,
      };
    }

    const joiningUser = authRes.user;
    soundFX.playLevelUp();

    setSession((prev) => {
      if (!prev) return prev;
      const alreadyJoined = prev.joined_players.some(
        (p) => p.username.toLowerCase() === joiningUser.username.toLowerCase()
      );
      const nextPlayers = alreadyJoined
        ? prev.joined_players.map((p) =>
            p.username.toLowerCase() === joiningUser.username.toLowerCase()
              ? { ...p, avatar_url: avatarUrl || p.avatar_url }
              : p
          )
        : [
            ...prev.joined_players,
            {
              user_id: joiningUser.id,
              username: joiningUser.username,
              avatar_url: avatarUrl,
              is_host: false,
              joined_at: new Date().toISOString(),
            },
          ];

      return {
        ...prev,
        joined_players: nextPlayers,
        combat_log: appendLog(
          prev,
          `Jogador @${joiningUser.username} entrou na Sala #${prev.room_code} usando a senha do Host.`,
          'TURN'
        ),
      };
    });

    return {
      success: true,
      message: `Jogador @${joiningUser.username} entrou na Sala #${session.room_code}! Adicione mais jogadores ou avance para a Escolha de Personagens.`,
    };
  };

  // RF02.1 — Add Survivor to Table and Redirect Directly to the Game Table (DASHBOARD)
  const handleAddSurvivorToTable = (username: string, characterId: string) => {
    soundFX.playLevelUp();
    setSession((prev) => {
      if (!prev) return prev;
      const targetUser = username.trim() || prev.host_username;
      const filtered = prev.survivors.filter(
        (s) => s.character_id !== characterId
      );
      if (filtered.length >= 6) return prev;
      const newSurv = createInitialSurvivorState(
        prev.id,
        targetUser,
        characterId,
        0
      );
      const char = CHARACTERS_CATALOG.find((c) => c.id === characterId);
      const nextSurvivors = [...filtered, newSurv];
      setViewedSurvivorId(newSurv.id);
      return {
        ...prev,
        status: 'IN_PROGRESS',
        survivors: nextSurvivors,
        combat_log: appendLog(
          prev,
          `@${targetUser} escolheu o sobrevivente ${char?.name || characterId} (${char?.edition}) e entrou na mesa de jogo.`,
          'TURN'
        ),
      };
    });
    setActiveTab('DASHBOARD');
  };

  const handleRemoveSurvivorFromTable = (survivorId: string) => {
    soundFX.playClick();
    setSession((prev) => {
      if (!prev) return prev;
      const nextSurvivors = prev.survivors.filter((s) => s.id !== survivorId);
      if (viewedSurvivorId === survivorId && nextSurvivors[0]) {
        setViewedSurvivorId(nextSurvivors[0].id);
      }
      return {
        ...prev,
        survivors: nextSurvivors,
        first_player_index: 0,
        turn_order_index: 0,
      };
    });
  };

  const handleStartMatch = () => {
    if (!session || session.survivors.length === 0) return;
    soundFX.playLevelUp();
    setSession((prev) => {
      if (!prev) return prev;
      const firstSurv = prev.survivors[prev.first_player_index] || prev.survivors[0];
      const firstChar = CHARACTERS_CATALOG.find(
        (c) => c.id === firstSurv?.character_id
      );
      setViewedSurvivorId(firstSurv.id);
      return {
        ...prev,
        status: 'IN_PROGRESS',
        combat_log: appendLog(
          prev,
          `Partida iniciada na Sala #${prev.room_code}! Turno ativo: ${firstChar?.name} (@${firstSurv.username}).`,
          'TURN'
        ),
      };
    });
    setActiveTab('DASHBOARD');
  };

  const handleResetSessionToLogin = () => {
    soundFX.playClick();
    setSession(null);
    setActiveTab('LOBBY');
  };

  // Determine whether the active device/player is the Host of the room
  const isCurrentUserHost = Boolean(
    session &&
      (!currentUser ||
        currentUser.username.toLowerCase() ===
          session.host_username.toLowerCase())
  );

  // RF02.3 & RF02.4 — Pass Turn & Rotate First Player Marker on New Round
  const handlePassTurn = () => {
    setSession((prev) => {
      if (!prev) return prev;
      const count = prev.survivors.length;
      if (count === 0) return prev;

      // During Zombie Phase, ONLY the Host can pass the turn to start the next round
      if (prev.is_zombie_phase && !isCurrentUserHost) {
        return prev;
      }

      const resetSurvivorTurnCounters = (surv: SurvivorState): SurvivorState => {
        const char =
          CHARACTERS_CATALOG.find((c) => c.id === surv.character_id) ||
          CHARACTERS_CATALOG[0];
        const caps = calculateSurvivorCapabilities(
          char,
          surv.xp,
          surv.selected_skills_json
        );
        return {
          ...surv,
          actions_left: caps.maxActions,
          max_actions: caps.maxActions,
          moves_left: caps.freeMoveActions > 0 ? caps.freeMoveActions : 1,
          zones_per_move: caps.zonesPerMove,
          skills_used_json: {},
        };
      };

      if (prev.is_zombie_phase) {
        soundFX.playClick();
        const nextRound = prev.round + 1;
        const nextFirstPlayerIdx = (prev.first_player_index + 1) % count;
        const refreshedSurvivors = prev.survivors.map(resetSurvivorTurnCounters);
        const firstSurv = refreshedSurvivors[nextFirstPlayerIdx];
        const firstChar = CHARACTERS_CATALOG.find(
          (c) => c.id === firstSurv.character_id
        );
        setViewedSurvivorId(firstSurv.id);

        return {
          ...prev,
          round: nextRound,
          first_player_index: nextFirstPlayerIdx,
          turn_order_index: 0,
          is_zombie_phase: false,
          survivors: refreshedSurvivors,
          combat_log: appendLog(
            prev,
            `Rodada ${nextRound} iniciada! Marcador de 1º Jogador passou para ${firstChar?.name} (@${firstSurv.username}).`,
            'TURN'
          ),
        };
      }

      const nextOrderIdx = prev.turn_order_index + 1;
      const refreshedSurvivors = prev.survivors.map(resetSurvivorTurnCounters);

      if (nextOrderIdx >= count) {
        soundFX.playZombiePhase();
        return {
          ...prev,
          is_zombie_phase: true,
          survivors: refreshedSurvivors,
          combat_log: appendLog(
            prev,
            `Todos os sobreviventes agiram na Rodada ${prev.round}. ATENÇÃO: FASE DOS ZUMBIS iniciada!`,
            'TURN'
          ),
        };
      }

      soundFX.playClick();
      const actualArrayIndex = (prev.first_player_index + nextOrderIdx) % count;
      const nextSurv = refreshedSurvivors[actualArrayIndex];
      const nextChar = CHARACTERS_CATALOG.find(
        (c) => c.id === nextSurv.character_id
      );
      setViewedSurvivorId(nextSurv.id);

      return {
        ...prev,
        turn_order_index: nextOrderIdx,
        survivors: refreshedSurvivors,
        combat_log: appendLog(
          prev,
          `Turno passado para ${nextChar?.name} (@${nextSurv.username}). Contadores e habilidades de turno resetados.`,
          'TURN'
        ),
      };
    });
  };

  // RF03.1 & RF03.4 — Adjust XP & Trigger Level-Up Modal at 19 XP (Orange) or 43 XP (Red)
  const handleAdjustXP = (survivorId: string, delta: number) => {
    setSession((prev) => {
      if (!prev) return prev;
      let modalToTrigger: {
        survivorId: string;
        tier: 'ORANGE' | 'RED';
        isManualEdit: boolean;
      } | null = null;

      let logMsg = '';
      let logType: GameSession['combat_log'][0]['type'] = 'XP';

      const nextSurvivors = prev.survivors.map((surv) => {
        if (surv.id !== survivorId) return surv;
        const oldXp = surv.xp;
        const newXp = Math.max(0, surv.xp + delta);
        const char =
          CHARACTERS_CATALOG.find((c) => c.id === surv.character_id) ||
          CHARACTERS_CATALOG[0];

        const crossedYellow = oldXp < 7 && newXp >= 7;
        const crossedOrange =
          oldXp < 19 && newXp >= 19 && !surv.selected_skills_json.orange;
        const crossedRed =
          oldXp < 43 && newXp >= 43 && !surv.selected_skills_json.red;

        if (crossedRed) {
          modalToTrigger = { survivorId, tier: 'RED', isManualEdit: false };
          logMsg = `🌟 ${char.name} alcançou ${newXp} XP (Nível Vermelho)! Escolha 1 habilidade suprema.`;
          logType = 'LEVEL_UP';
        } else if (crossedOrange) {
          modalToTrigger = { survivorId, tier: 'ORANGE', isManualEdit: false };
          logMsg = `🌟 ${char.name} alcançou ${newXp} XP (Nível Laranja)! Escolha 1 habilidade.`;
          logType = 'LEVEL_UP';
        } else if (crossedYellow) {
          logMsg = `⚡ ${char.name} alcançou ${newXp} XP (Nível Amarelo) e desbloqueou automaticamente +1 Ação!`;
          logType = 'LEVEL_UP';
        } else {
          logMsg = `${char.name} ${delta > 0 ? `ganhou +${delta}` : `ajustou ${delta}`} XP (Total: ${newXp} XP).`;
        }

        const caps = calculateSurvivorCapabilities(
          char,
          newXp,
          surv.selected_skills_json
        );

        const extraActionGain = Math.max(0, caps.maxActions - surv.max_actions);

        return {
          ...surv,
          xp: newXp,
          max_actions: caps.maxActions,
          actions_left: Math.min(
            caps.maxActions,
            surv.actions_left + extraActionGain
          ),
          zones_per_move: caps.zonesPerMove,
        };
      });

      if (modalToTrigger) {
        soundFX.playLevelUp();
        setPendingLevelUpModal(modalToTrigger);
      } else if (logType === 'LEVEL_UP') {
        soundFX.playLevelUp();
      } else {
        soundFX.playClick();
      }

      return {
        ...prev,
        survivors: nextSurvivors,
        combat_log: logMsg ? appendLog(prev, logMsg, logType) : prev.combat_log,
      };
    });
  };

  const handleConfirmSkillSelection = (skillId: string) => {
    if (!pendingLevelUpModal) return;
    const { survivorId, tier } = pendingLevelUpModal;
    soundFX.playLevelUp();

    setSession((prev) => {
      if (!prev) return prev;
      let logMsg = '';
      const nextSurvivors = prev.survivors.map((surv) => {
        if (surv.id !== survivorId) return surv;
        const char =
          CHARACTERS_CATALOG.find((c) => c.id === surv.character_id) ||
          CHARACTERS_CATALOG[0];

        const nextSelected = {
          ...surv.selected_skills_json,
          [tier === 'ORANGE' ? 'orange' : 'red']: skillId,
        };

        const caps = calculateSurvivorCapabilities(char, surv.xp, nextSelected);
        const skillPool =
          tier === 'ORANGE' ? char.skills.orange : char.skills.red;
        const chosenSkill = skillPool.find((s) => s.id === skillId);

        logMsg = `${char.name} ativou a habilidade de Nível ${
          tier === 'ORANGE' ? 'Laranja' : 'Vermelho'
        }: "${chosenSkill?.name}".`;

        return {
          ...surv,
          selected_skills_json: nextSelected,
          max_actions: caps.maxActions,
          moves_left: Math.max(surv.moves_left, caps.freeMoveActions),
          zones_per_move: caps.zonesPerMove,
        };
      });

      return {
        ...prev,
        survivors: nextSurvivors,
        combat_log: logMsg
          ? appendLog(prev, logMsg, 'LEVEL_UP')
          : prev.combat_log,
      };
    });

    setPendingLevelUpModal(null);
  };

  // RF03.2 — Wound Counter
  const handleAdjustWound = (survivorId: string, delta: 1 | -1) => {
    if (delta === 1) {
      soundFX.playWound();
    } else {
      soundFX.playClick();
    }

    const woundItem = ITEMS_DATABASE.find((i) => i.id === 'eq_wound')!;

    setSession((prev) => {
      if (!prev) return prev;
      let logMsg = '';
      const nextSurvivors = prev.survivors.map((surv) => {
        if (surv.id !== survivorId) return surv;
        const char = CHARACTERS_CATALOG.find((c) => c.id === surv.character_id);
        const nextHealth = Math.max(
          0,
          Math.min(surv.max_health, surv.health + delta)
        );
        if (nextHealth === surv.health) return surv;

        const inv = {
          handLeft: surv.inventory_json.handLeft,
          handRight: surv.inventory_json.handRight,
          backpack: [...surv.inventory_json.backpack],
        };

        if (delta === 1) {
          let placed = false;
          for (let i = inv.backpack.length - 1; i >= 0; i--) {
            if (!inv.backpack[i]) {
              inv.backpack[i] = { ...woundItem };
              placed = true;
              break;
            }
          }
          if (!placed) {
            for (let i = inv.backpack.length - 1; i >= 0; i--) {
              if (inv.backpack[i]?.category !== 'WOUND') {
                inv.backpack[i] = { ...woundItem };
                placed = true;
                break;
              }
            }
          }
          if (!placed && inv.handRight?.category !== 'WOUND') {
            inv.handRight = { ...woundItem };
            placed = true;
          }
          if (!placed && inv.handLeft?.category !== 'WOUND') {
            inv.handLeft = { ...woundItem };
          }
          logMsg = `🩸 ${char?.name} sofreu 1 Ferimento (${nextHealth}/${surv.max_health})! Um slot do inventário foi bloqueado.`;
        } else {
          let removed = false;
          if (inv.handLeft?.category === 'WOUND') {
            inv.handLeft = null;
            removed = true;
          } else if (inv.handRight?.category === 'WOUND') {
            inv.handRight = null;
            removed = true;
          } else {
            for (let i = 0; i < inv.backpack.length; i++) {
              if (inv.backpack[i]?.category === 'WOUND') {
                inv.backpack[i] = null;
                removed = true;
                break;
              }
            }
          }
          if (removed) {
            logMsg = `💚 ${char?.name} curou 1 Ferimento (${nextHealth}/${surv.max_health}) e liberou o slot do inventário.`;
          }
        }

        return {
          ...surv,
          health: nextHealth,
          inventory_json: inv,
        };
      });

      return {
        ...prev,
        survivors: nextSurvivors,
        combat_log: logMsg ? appendLog(prev, logMsg, 'WOUND') : prev.combat_log,
      };
    });
  };

  // RF03.3 — Action and Movement Counters
  const handleSpendAction = (survivorId: string) => {
    soundFX.playClick();
    setSession((prev) =>
      prev
        ? {
            ...prev,
            survivors: prev.survivors.map((s) =>
              s.id === survivorId
                ? { ...s, actions_left: Math.max(0, s.actions_left - 1) }
                : s
            ),
          }
        : prev
    );
  };

  const handleResetActions = (survivorId: string) => {
    soundFX.playClick();
    setSession((prev) =>
      prev
        ? {
            ...prev,
            survivors: prev.survivors.map((s) => {
              if (s.id !== survivorId) return s;
              const char =
                CHARACTERS_CATALOG.find((c) => c.id === s.character_id) ||
                CHARACTERS_CATALOG[0];
              const caps = calculateSurvivorCapabilities(
                char,
                s.xp,
                s.selected_skills_json
              );
              return {
                ...s,
                actions_left: caps.maxActions,
                max_actions: caps.maxActions,
                moves_left: caps.freeMoveActions > 0 ? caps.freeMoveActions : 1,
                skills_used_json: {},
              };
            }),
          }
        : prev
    );
  };

  const handleSpendMove = (survivorId: string) => {
    soundFX.playClick();
    setSession((prev) =>
      prev
        ? {
            ...prev,
            survivors: prev.survivors.map((s) => {
              if (s.id !== survivorId) return s;
              if (s.moves_left > 0) {
                return { ...s, moves_left: s.moves_left - 1 };
              }
              if (s.actions_left > 0) {
                return { ...s, actions_left: s.actions_left - 1 };
              }
              return s;
            }),
          }
        : prev
    );
  };

  const handleToggleSkillUsed = (survivorId: string, skillId: string) => {
    soundFX.playClick();
    setSession((prev) =>
      prev
        ? {
            ...prev,
            survivors: prev.survivors.map((s) =>
              s.id === survivorId
                ? {
                    ...s,
                    skills_used_json: {
                      ...s.skills_used_json,
                      [skillId]: !s.skills_used_json[skillId],
                    },
                  }
                : s
            ),
          }
        : prev
    );
  };

  // RF04 — Inventory Management
  const handleEquipItem = (
    survivorId: string,
    item: GameItem,
    targetSlot?: SlotKey
  ) => {
    soundFX.playClick();
    setSession((prev) => {
      if (!prev) return prev;
      let logMsg = '';
      const nextSurvivors = prev.survivors.map((surv) => {
        if (surv.id !== survivorId) return surv;
        const char = CHARACTERS_CATALOG.find((c) => c.id === surv.character_id);
        const inv = {
          handLeft: surv.inventory_json.handLeft,
          handRight: surv.inventory_json.handRight,
          backpack: [...surv.inventory_json.backpack],
        };

        const setAtSlot = (slot: SlotKey, newItem: GameItem) => {
          if (slot === 'handLeft' && inv.handLeft?.category !== 'WOUND') {
            inv.handLeft = { ...newItem };
            return true;
          }
          if (slot === 'handRight' && inv.handRight?.category !== 'WOUND') {
            inv.handRight = { ...newItem };
            return true;
          }
          if (slot === 'backpack0' && inv.backpack[0]?.category !== 'WOUND') {
            inv.backpack[0] = { ...newItem };
            return true;
          }
          if (slot === 'backpack1' && inv.backpack[1]?.category !== 'WOUND') {
            inv.backpack[1] = { ...newItem };
            return true;
          }
          if (slot === 'backpack2' && inv.backpack[2]?.category !== 'WOUND') {
            inv.backpack[2] = { ...newItem };
            return true;
          }
          return false;
        };

        let equipped = false;
        if (targetSlot) {
          equipped = setAtSlot(targetSlot, item);
        }

        if (!equipped) {
          if (!inv.handLeft) {
            inv.handLeft = { ...item };
          } else if (!inv.handRight) {
            inv.handRight = { ...item };
          } else if (!inv.backpack[0]) {
            inv.backpack[0] = { ...item };
          } else if (!inv.backpack[1]) {
            inv.backpack[1] = { ...item };
          } else if (!inv.backpack[2]) {
            inv.backpack[2] = { ...item };
          } else if (inv.backpack[2]?.category !== 'WOUND') {
            inv.backpack[2] = { ...item };
          }
        }

        logMsg = `${char?.name} adicionou a carta "${item.name}" ao inventário.`;
        return { ...surv, inventory_json: inv };
      });

      return {
        ...prev,
        survivors: nextSurvivors,
        combat_log: logMsg ? appendLog(prev, logMsg, 'ITEM') : prev.combat_log,
      };
    });
  };

  const handleSwapSlots = (
    survivorId: string,
    source: SlotKey,
    target: SlotKey
  ) => {
    soundFX.playClick();
    setSession((prev) =>
      prev
        ? {
            ...prev,
            survivors: prev.survivors.map((surv) => {
              if (surv.id !== survivorId) return surv;
              const inv = {
                handLeft: surv.inventory_json.handLeft,
                handRight: surv.inventory_json.handRight,
                backpack: [...surv.inventory_json.backpack],
              };

              const readSlot = (k: SlotKey) => {
                if (k === 'handLeft') return inv.handLeft;
                if (k === 'handRight') return inv.handRight;
                if (k === 'backpack0') return inv.backpack[0];
                if (k === 'backpack1') return inv.backpack[1];
                return inv.backpack[2];
              };

              const writeSlot = (k: SlotKey, val: GameItem | null) => {
                if (k === 'handLeft') inv.handLeft = val;
                else if (k === 'handRight') inv.handRight = val;
                else if (k === 'backpack0') inv.backpack[0] = val;
                else if (k === 'backpack1') inv.backpack[1] = val;
                else inv.backpack[2] = val;
              };

              const itemA = readSlot(source);
              const itemB = readSlot(target);
              if (itemA?.category === 'WOUND' || itemB?.category === 'WOUND') {
                return surv;
              }
              writeSlot(source, itemB);
              writeSlot(target, itemA);
              return { ...surv, inventory_json: inv };
            }),
          }
        : prev
    );
  };

  const handleDiscardSlot = (survivorId: string, slot: SlotKey) => {
    soundFX.playClick();
    setSession((prev) =>
      prev
        ? {
            ...prev,
            survivors: prev.survivors.map((surv) => {
              if (surv.id !== survivorId) return surv;
              const inv = {
                handLeft: surv.inventory_json.handLeft,
                handRight: surv.inventory_json.handRight,
                backpack: [...surv.inventory_json.backpack],
              };
              if (slot === 'handLeft' && inv.handLeft?.category !== 'WOUND')
                inv.handLeft = null;
              if (slot === 'handRight' && inv.handRight?.category !== 'WOUND')
                inv.handRight = null;
              if (slot === 'backpack0' && inv.backpack[0]?.category !== 'WOUND')
                inv.backpack[0] = null;
              if (slot === 'backpack1' && inv.backpack[1]?.category !== 'WOUND')
                inv.backpack[1] = null;
              if (slot === 'backpack2' && inv.backpack[2]?.category !== 'WOUND')
                inv.backpack[2] = null;

              return { ...surv, inventory_json: inv };
            }),
          }
        : prev
    );
  };

  const handleUseConsumable = (
    survivorId: string,
    slot: SlotKey,
    item: GameItem
  ) => {
    handleDiscardSlot(survivorId, slot);
    if (
      item.id === 'eq_water' ||
      item.id === 'eq_canned_food' ||
      item.id === 'eq_bag_of_rice' ||
      item.id === 'eq_apples' ||
      item.id === 'eq_salted_meat' ||
      item.id === 'eq_cookies'
    ) {
      handleAdjustXP(survivorId, 1);
    } else if (item.id === 'eq_medkit') {
      handleAdjustWound(survivorId, -1);
    }
  };

  const handleCombineMolotov = (survivorId: string) => {
    soundFX.playLevelUp();
    const molotovItem = ITEMS_DATABASE.find((i) => i.id === 'eq_molotov')!;

    setSession((prev) => {
      if (!prev) return prev;
      let logMsg = '';
      const nextSurvivors = prev.survivors.map((surv) => {
        if (surv.id !== survivorId) return surv;
        const char = CHARACTERS_CATALOG.find((c) => c.id === surv.character_id);
        const slots: SlotKey[] = [
          'handLeft',
          'handRight',
          'backpack0',
          'backpack1',
          'backpack2',
        ];
        const inv = {
          handLeft: surv.inventory_json.handLeft,
          handRight: surv.inventory_json.handRight,
          backpack: [...surv.inventory_json.backpack],
        };

        const getSlot = (k: SlotKey) =>
          k === 'handLeft'
            ? inv.handLeft
            : k === 'handRight'
            ? inv.handRight
            : k === 'backpack0'
            ? inv.backpack[0]
            : k === 'backpack1'
            ? inv.backpack[1]
            : inv.backpack[2];

        const setSlot = (k: SlotKey, v: GameItem | null) => {
          if (k === 'handLeft') inv.handLeft = v;
          else if (k === 'handRight') inv.handRight = v;
          else if (k === 'backpack0') inv.backpack[0] = v;
          else if (k === 'backpack1') inv.backpack[1] = v;
          else inv.backpack[2] = v;
        };

        const gasSlot = slots.find((k) => getSlot(k)?.id === 'eq_gasoline');
        const bottleSlot = slots.find(
          (k) => getSlot(k)?.id === 'eq_glass_bottle'
        );

        if (gasSlot && bottleSlot) {
          setSlot(gasSlot, { ...molotovItem });
          setSlot(bottleSlot, null);
          logMsg = `🔥 ${char?.name} combinou Gasolina + Garrafa de Vidro e equipou um Cocktail Molotov!`;
        }

        return { ...surv, inventory_json: inv };
      });

      return {
        ...prev,
        survivors: nextSurvivors,
        combat_log: logMsg ? appendLog(prev, logMsg, 'ITEM') : prev.combat_log,
      };
    });
  };

  const handleRollWeaponAttack = (
    survivorId: string,
    item: GameItem,
    isDualAkimbo: boolean,
    outcome?: 'HIT' | 'MISS' | 'REROLL'
  ) => {
    if (outcome === 'HIT') {
      soundFX.playLevelUp();
    } else {
      soundFX.playDiceRoll();
    }

    setSession((prev) => {
      if (!prev) return prev;
      const surv = prev.survivors.find((s) => s.id === survivorId);
      const char = CHARACTERS_CATALOG.find((c) => c.id === surv?.character_id);

      // Spend 1 action only when initiating the attack (when outcome is undefined)
      const shouldSpendAction = !outcome;

      let logText = `🎲 ${char?.name} iniciou ataque com ${item.name}${
        isDualAkimbo ? ' (Akimbo)' : ''
      }${item.noise_on_use ? ' [Gerou +1 Ficha de Barulho]' : ' [Silencioso]'}.`;

      if (outcome === 'HIT') {
        logText = `🎯 ACERTO! ${char?.name} acertou o ataque com ${item.name}${
          isDualAkimbo ? ' (Akimbo)' : ''
        } (Dano ${item.stats_json.damage}).`;
      } else if (outcome === 'MISS') {
        logText = `❌ FALHA! ${char?.name} errou o ataque com ${item.name}.`;
      } else if (outcome === 'REROLL') {
        logText = `🔄 RE-ROLAGEM! ${char?.name} optou por re-rolar os dados com ${item.name}.`;
      }

      return {
        ...prev,
        survivors: shouldSpendAction
          ? prev.survivors.map((s) =>
              s.id === survivorId
                ? { ...s, actions_left: Math.max(0, s.actions_left - 1) }
                : s
            )
          : prev.survivors,
        combat_log: appendLog(prev, logText, 'COMBAT'),
      };
    });
  };

  const modalSurvivor =
    pendingLevelUpModal && session
      ? session.survivors.find((s) => s.id === pendingLevelUpModal.survivorId)
      : null;
  const modalCharacter = modalSurvivor
    ? CHARACTERS_CATALOG.find((c) => c.id === modalSurvivor.character_id)
    : null;

  return (
    <div className="relative min-h-screen flex flex-col bg-[#050505] blood-splatter-bg text-zinc-100">
      {/* Atmospheric Blood Splatters on Background */}
      <BloodSplatterBackdrop />

      {/* Top Bar Contract: Zone 1 (Brand ZOMBIAPP with Zombie Face) — Zone 2 (4 clean nav links) — Zone 3 (Actions + Mobile Hamburger) */}
      <header className="sticky top-0 z-40 bg-black/90 backdrop-blur-md border-b border-red-950/80">
        <div className="flex items-center justify-between px-4 sm:px-6 py-3.5">
          {/* Zone 1: Brand Title with Zombie Face Logo */}
          <a
            href="#lobby"
            onClick={(e) => {
              e.preventDefault();
              setActiveTab('LOBBY');
              setMobileMenuOpen(false);
            }}
            className="flex items-center gap-2.5 text-xl sm:text-2xl font-bold tracking-wider text-red-500 font-display whitespace-nowrap"
          >
            <ZombieLogoIcon className="w-8 h-8 sm:w-9 sm:h-9 shrink-0" />
            <span>ZOMBIAPP</span>
          </a>

          {/* Zone 2: Desktop Navigation Links (Hidden on Mobile) */}
          <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-zinc-300">
            <a
              href="#lobby"
              onClick={(e) => {
                e.preventDefault();
                setActiveTab('LOBBY');
              }}
              className={`transition-colors whitespace-nowrap py-1 border-b-2 ${
                activeTab === 'LOBBY'
                  ? 'text-red-500 border-red-500 font-semibold'
                  : 'border-transparent hover:text-white'
              }`}
            >
              Login e Sala
            </a>
            <a
              href="#dashboard"
              onClick={(e) => {
                e.preventDefault();
                setActiveTab('DASHBOARD');
              }}
              className={`transition-colors whitespace-nowrap py-1 border-b-2 ${
                activeTab === 'DASHBOARD'
                  ? 'text-red-500 border-red-500 font-semibold'
                  : 'border-transparent hover:text-white'
              }`}
            >
              Dashboard da Mesa
            </a>
            <a
              href="#catalog"
              onClick={(e) => {
                e.preventDefault();
                setActiveTab('CATALOG');
              }}
              className={`transition-colors whitespace-nowrap py-1 border-b-2 ${
                activeTab === 'CATALOG'
                  ? 'text-red-500 border-red-500 font-semibold'
                  : 'border-transparent hover:text-white'
              }`}
            >
              Catálogo Completo
            </a>
            <a
              href="#instructions"
              onClick={(e) => {
                e.preventDefault();
                setActiveTab('INSTRUCTIONS');
              }}
              className={`transition-colors whitespace-nowrap py-1 border-b-2 ${
                activeTab === 'INSTRUCTIONS'
                  ? 'text-red-500 border-red-500 font-semibold'
                  : 'border-transparent hover:text-white'
              }`}
            >
              Instruções e Regras
            </a>
            <a
              href="#log"
              onClick={(e) => {
                e.preventDefault();
                setActiveTab('LOG');
              }}
              className={`transition-colors whitespace-nowrap py-1 border-b-2 ${
                activeTab === 'LOG'
                  ? 'text-red-500 border-red-500 font-semibold'
                  : 'border-transparent hover:text-white'
              }`}
            >
              Histórico ({session?.combat_log.length || 0})
            </a>
          </nav>

          {/* Zone 3: Primary Actions & Mobile Hamburger Button */}
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => setActiveTab('INSTRUCTIONS')}
              title="Manual de Instruções e Regras"
              className={`p-2 rounded-lg border transition-colors cursor-pointer ${
                activeTab === 'INSTRUCTIONS'
                  ? 'bg-red-600/20 border-red-500 text-red-400'
                  : 'bg-zinc-950 border-zinc-800 text-zinc-300 hover:text-white'
              }`}
            >
              <HelpCircle className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={() => {
                const next = !soundEnabled;
                setSoundEnabled(next);
                soundFX.enabled = next;
              }}
              title={soundEnabled ? 'Desativar sons' : 'Ativar sons'}
              className="p-2 rounded-lg bg-zinc-950 border border-zinc-800 text-zinc-300 hover:text-white transition-colors"
            >
              {soundEnabled ? (
                <Volume2 className="w-4 h-4 text-red-500" />
              ) : (
                <VolumeX className="w-4 h-4 text-zinc-500" />
              )}
            </button>

            <button
              type="button"
              onClick={handleResetSessionToLogin}
              className="hidden sm:flex px-3.5 py-2 text-xs font-semibold text-zinc-200 bg-zinc-950 border border-zinc-800 rounded-lg hover:bg-zinc-900 hover:border-red-900/60 transition-colors items-center gap-1.5 whitespace-nowrap cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5 text-red-500" />
              <span>Nova Sala</span>
            </button>

            {/* Mobile Hamburger Button (Three Lines) */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen((prev) => !prev)}
              aria-label="Abrir menu de navegação"
              className="md:hidden p-2 rounded-lg bg-zinc-950 border border-zinc-800 text-zinc-200 hover:text-red-500 transition-colors"
            >
              {mobileMenuOpen ? (
                <X className="w-5 h-5" />
              ) : (
                <Menu className="w-5 h-5" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile Dropdown Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-red-950/70 bg-black px-4 py-3 space-y-1">
            <button
              type="button"
              onClick={() => {
                setActiveTab('LOBBY');
                setMobileMenuOpen(false);
              }}
              className={`w-full text-left px-3.5 py-2.5 rounded-lg text-sm font-medium transition-colors flex items-center justify-between ${
                activeTab === 'LOBBY'
                  ? 'bg-red-600/20 text-red-400 font-semibold'
                  : 'text-zinc-300 hover:bg-zinc-900 hover:text-white'
              }`}
            >
              <span>Login e Sala</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab('DASHBOARD');
                setMobileMenuOpen(false);
              }}
              className={`w-full text-left px-3.5 py-2.5 rounded-lg text-sm font-medium transition-colors flex items-center justify-between ${
                activeTab === 'DASHBOARD'
                  ? 'bg-red-600/20 text-red-400 font-semibold'
                  : 'text-zinc-300 hover:bg-zinc-900 hover:text-white'
              }`}
            >
              <span>Dashboard da Mesa</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab('CATALOG');
                setMobileMenuOpen(false);
              }}
              className={`w-full text-left px-3.5 py-2.5 rounded-lg text-sm font-medium transition-colors flex items-center justify-between ${
                activeTab === 'CATALOG'
                  ? 'bg-red-600/20 text-red-400 font-semibold'
                  : 'text-zinc-300 hover:bg-zinc-900 hover:text-white'
              }`}
            >
              <span>Catálogo Completo</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab('INSTRUCTIONS');
                setMobileMenuOpen(false);
              }}
              className={`w-full text-left px-3.5 py-2.5 rounded-lg text-sm font-medium transition-colors flex items-center justify-between ${
                activeTab === 'INSTRUCTIONS'
                  ? 'bg-red-600/20 text-red-400 font-semibold'
                  : 'text-zinc-300 hover:bg-zinc-900 hover:text-white'
              }`}
            >
              <span>Instruções e Regras</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab('LOG');
                setMobileMenuOpen(false);
              }}
              className={`w-full text-left px-3.5 py-2.5 rounded-lg text-sm font-medium transition-colors flex items-center justify-between ${
                activeTab === 'LOG'
                  ? 'bg-red-600/20 text-red-400 font-semibold'
                  : 'text-zinc-300 hover:bg-zinc-900 hover:text-white'
              }`}
            >
              <span>Histórico ({session?.combat_log.length || 0})</span>
            </button>

            <div className="pt-2 mt-2 border-t border-zinc-800/80">
              <button
                type="button"
                onClick={() => {
                  handleResetSessionToLogin();
                  setMobileMenuOpen(false);
                }}
                className="w-full px-3.5 py-2.5 rounded-lg text-xs font-semibold text-red-300 bg-red-950/40 border border-red-800/50 hover:bg-red-950/60 transition-colors flex items-center justify-center gap-2"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Nova Sala / Reiniciar Sessão</span>
              </button>
            </div>
          </div>
        )}
      </header>

      {/* Main Content Viewport */}
      <main className="relative z-10 flex-1 pb-24 md:pb-8">
        {activeTab === 'LOBBY' && (
          <AuthAndLobby
            users={users}
            currentUser={currentUser}
            session={session}
            onRegisterOrLogin={handleRegisterOrLogin}
            onHostCreateRoom={handleHostCreateRoom}
            onPlayerJoinRoom={handlePlayerJoinRoom}
            onAddSurvivorToTable={handleAddSurvivorToTable}
            onRemoveSurvivorFromTable={handleRemoveSurvivorFromTable}
            onStartMatch={handleStartMatch}
          />
        )}

        {activeTab === 'DASHBOARD' && (
          session && session.survivors.length > 0 ? (
            <SurvivorDashboard
              session={session}
              currentUser={currentUser}
              isCurrentUserHost={isCurrentUserHost}
              onSwitchActiveUser={(username) => {
                const found = users.find(
                  (u) => u.username.toLowerCase() === username.toLowerCase()
                );
                if (found) {
                  setCurrentUser(found);
                } else {
                  handleRegisterOrLogin(username);
                }
              }}
              viewedSurvivorId={viewedSurvivorId}
              onSelectViewedSurvivor={setViewedSurvivorId}
              onPassTurn={handlePassTurn}
              onAdjustXP={handleAdjustXP}
              onAdjustWound={handleAdjustWound}
              onSpendAction={handleSpendAction}
              onResetActions={handleResetActions}
              onSpendMove={handleSpendMove}
              onToggleSkillUsed={handleToggleSkillUsed}
              onOpenSkillModal={(survivorId, tier) =>
                setPendingLevelUpModal({
                  survivorId,
                  tier,
                  isManualEdit: true,
                })
              }
              onEquipItem={handleEquipItem}
              onSwapSlots={handleSwapSlots}
              onDiscardSlot={handleDiscardSlot}
              onUseConsumable={handleUseConsumable}
              onCombineMolotov={handleCombineMolotov}
              onRollWeaponAttack={handleRollWeaponAttack}
            />
          ) : (
            <div className="max-w-2xl mx-auto px-4 py-12 text-center space-y-4">
              <div className="p-6 sm:p-8 rounded-2xl bg-[#0A0A0C]/95 border border-zinc-800 space-y-4">
                <Users className="w-10 h-10 text-red-500 mx-auto" />
                <h2 className="text-xl sm:text-2xl font-bold text-white font-display">
                  Nenhum Sobrevivente na Mesa Ainda
                </h2>
                <p className="text-xs sm:text-sm text-zinc-300">
                  Primeiro crie a sala como Host (ou entre com a senha da sala) e escolha os personagens dos jogadores para liberar o Dashboard da partida.
                </p>
                <button
                  type="button"
                  onClick={() => setActiveTab('LOBBY')}
                  className="w-full sm:w-auto px-6 py-3 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-sm transition-colors cursor-pointer"
                >
                  Ir para Login e Escolha de Personagens
                </button>
              </div>
            </div>
          )
        )}

        {activeTab === 'CATALOG' && <CatalogExplorer />}

        {activeTab === 'INSTRUCTIONS' && (
          <div className="max-w-5xl mx-auto px-3.5 sm:px-6 py-6 sm:py-8 space-y-6">
            {/* Header Card */}
            <div className="p-5 sm:p-7 rounded-2xl bg-[#0A0A0C]/95 border border-zinc-800 space-y-2">
              <div className="flex items-center gap-2 text-xs text-red-500 font-mono-tabular uppercase tracking-wider font-bold">
                <BookOpen className="w-4 h-4" />
                <span>GUIA RÁPIDO E REGRAS DA MESA</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold text-white font-display">
                Instruções Organizadas de Jogo
              </h1>
              <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed max-w-3xl">
                Consulte abaixo o passo a passo organizado para configurar a sala, gerenciar sua ficha digital, realizar ataques na mesa e controlar a Fase dos Zumbis.
              </p>
            </div>

            {/* 4 Structured Instruction Sections */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* 1. Sala, Host e Escolha de Personagem */}
              <div className="p-5 rounded-2xl bg-[#0A0A0C]/95 border border-zinc-800 space-y-4">
                <div className="flex items-center gap-3 border-b border-zinc-800 pb-3">
                  <span className="w-8 h-8 rounded-xl bg-red-600/20 border border-red-500/40 text-red-400 font-bold text-sm flex items-center justify-center shrink-0">
                    1
                  </span>
                  <div>
                    <h2 className="text-base sm:text-lg font-bold text-white font-display">
                      Sala, Senha e Personagens
                    </h2>
                    <p className="text-xs text-zinc-400">
                      Como conectar todos os jogadores à mesa
                    </p>
                  </div>
                </div>
                <ol className="space-y-2.5 text-xs sm:text-sm text-zinc-300">
                  <li className="flex items-start gap-2.5">
                    <span className="font-mono-tabular font-bold text-red-400">1.1</span>
                    <span>
                      <strong>Host Cria a Sala:</strong> Na aba <em>Login e Sala</em>, o anfitrião define seu <strong>@nickname</strong>, escolhe um avatar e cria a <strong>Senha da Sala</strong>.
                    </span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <span className="font-mono-tabular font-bold text-red-400">1.2</span>
                    <span>
                      <strong>Jogadores Entram:</strong> Os demais jogadores usam a opção <em>Entrar na Sala</em> informando seu <strong>@nickname</strong> e a senha criada pelo Host.
                    </span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <span className="font-mono-tabular font-bold text-red-400">1.3</span>
                    <span>
                      <strong>Direcionamento Automático:</strong> Ao clicar em <em>+ Escolher</em> em qualquer sobrevivente, você é levado direto para o <strong>Dashboard da Mesa</strong>.
                    </span>
                  </li>
                </ol>
              </div>

              {/* 2. Vida (Corações) e Níveis de Perigo (XP) */}
              <div className="p-5 rounded-2xl bg-[#0A0A0C]/95 border border-zinc-800 space-y-4">
                <div className="flex items-center gap-3 border-b border-zinc-800 pb-3">
                  <span className="w-8 h-8 rounded-xl bg-red-600/20 border border-red-500/40 text-red-400 font-bold text-sm flex items-center justify-center shrink-0">
                    2
                  </span>
                  <div>
                    <h2 className="text-base sm:text-lg font-bold text-white font-display flex items-center gap-2">
                      <span>Vida (Corações) e XP</span>
                      <Heart className="w-4 h-4 text-red-500 fill-red-500" />
                    </h2>
                    <p className="text-xs text-zinc-400">
                      Controle visual de ferimentos e evolução
                    </p>
                  </div>
                </div>
                <ul className="space-y-2.5 text-xs sm:text-sm text-zinc-300">
                  <li className="flex items-start gap-2.5">
                    <span className="text-red-500 font-bold">❤️</span>
                    <span>
                      <strong>Ferir ou Restaurar:</strong> Toque diretamente em um <strong>Coração Inteiro</strong> para parti-lo (aplicar 1 ferimento e bloquear 1 slot) ou toque no <strong>Coração Partido 💔</strong> para curar.
                    </span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <span className="text-yellow-400 font-bold">⚡</span>
                    <span>
                      <strong>Níveis de Perigo:</strong> Azul (0–6 XP), Amarelo (7–18 XP · ganha +1 Ação automática), Laranja (19–42 XP · escolhe 1 de 2 habilidades) e Vermelho (43+ XP · escolhe 1 de 3 habilidades).
                    </span>
                  </li>
                </ul>
              </div>

              {/* 3. Inventário, Slots e Ataque com Dados */}
              <div className="p-5 rounded-2xl bg-[#0A0A0C]/95 border border-zinc-800 space-y-4">
                <div className="flex items-center gap-3 border-b border-zinc-800 pb-3">
                  <span className="w-8 h-8 rounded-xl bg-red-600/20 border border-red-500/40 text-red-400 font-bold text-sm flex items-center justify-center shrink-0">
                    3
                  </span>
                  <div>
                    <h2 className="text-base sm:text-lg font-bold text-white font-display flex items-center gap-2">
                      <span>Equipamentos e Ataques</span>
                      <Dices className="w-4 h-4 text-red-500" />
                    </h2>
                    <p className="text-xs text-zinc-400">
                      Mãos, mochila e resolução rápida de combate
                    </p>
                  </div>
                </div>
                <ul className="space-y-2.5 text-xs sm:text-sm text-zinc-300">
                  <li className="flex items-start gap-2.5">
                    <span className="font-mono-tabular font-bold text-red-400">3.1</span>
                    <span>
                      <strong>Equipar em Slot Vazio:</strong> Basta tocar em qualquer <em>Slot Livre</em> (Mão Esquerda, Mão Direita ou Mochila) para abrir a janela de escolha de equipamento.
                    </span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <span className="font-mono-tabular font-bold text-red-400">3.2</span>
                    <span>
                      <strong>Atacar na Mesa:</strong> Clique em <em>Atacar</em> na arma em mãos (requer pelo menos 1 Ação restante). O app exibirá <strong>&ldquo;Role os dados na mesa!&rdquo;</strong> com os botões <strong>Acerto (+1 XP)</strong> ou <strong>Falha</strong>, além de perguntar se deseja <strong>Re-rolar</strong> caso a arma/habilidade permita.
                    </span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <span className="font-mono-tabular font-bold text-red-400">3.3</span>
                    <span>
                      <strong>Fim das Ações:</strong> Quando suas ações chegam a 0, o app pergunta automaticamente se você deseja passar o turno.
                    </span>
                  </li>
                </ul>
              </div>

              {/* 4. Fase dos Zumbis e Controle do Host */}
              <div className="p-5 rounded-2xl bg-[#0A0A0C]/95 border border-zinc-800 space-y-4">
                <div className="flex items-center gap-3 border-b border-zinc-800 pb-3">
                  <span className="w-8 h-8 rounded-xl bg-red-600/20 border border-red-500/40 text-red-400 font-bold text-sm flex items-center justify-center shrink-0">
                    4
                  </span>
                  <div>
                    <h2 className="text-base sm:text-lg font-bold text-white font-display flex items-center gap-2">
                      <span>Fase dos Zumbis (Tela Cheia)</span>
                      <Skull className="w-4 h-4 text-red-500" />
                    </h2>
                    <p className="text-xs text-zinc-400">
                      Sincronização em todos os aparelhos
                    </p>
                  </div>
                </div>
                <ol className="space-y-2.5 text-xs sm:text-sm text-zinc-300">
                  <li className="flex items-start gap-2.5">
                    <span className="font-mono-tabular font-bold text-red-400">4.1</span>
                    <span>
                      <strong>Alerta Global:</strong> Quando o último sobrevivente encerra seu turno, a tela de <strong>todos os dispositivos</strong> exibe o alerta em tela cheia de <em>VEZ DOS ZUMBIS!</em>
                    </span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <span className="font-mono-tabular font-bold text-red-400">4.2</span>
                    <span>
                      <strong>Ordem na Mesa:</strong> Execute primeiro o <strong>Passo 1: Ativação (Ataque e Movimento)</strong> de todos os zumbis e depois o <strong>Passo 2: Entrada (Spawn)</strong> nos pontos de entrada.
                    </span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <span className="font-mono-tabular font-bold text-red-400">4.3</span>
                    <span>
                      <strong>Exclusivo do Host:</strong> Somente o jogador <strong>Host</strong> possui o botão liberado para encerrar a Fase dos Zumbis e iniciar a próxima rodada.
                    </span>
                  </li>
                </ol>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'LOG' && (
          <div className="max-w-4xl mx-auto px-3.5 sm:px-6 py-6 sm:py-8 space-y-6">
            <div className="p-4 sm:p-6 rounded-2xl bg-[#0A0A0C]/95 border border-zinc-800 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-zinc-800 pb-4 gap-2">
                <div>
                  <h1 className="text-xl sm:text-2xl font-bold text-white font-display">
                    Registro Tático da Mesa
                  </h1>
                  <p className="text-xs text-zinc-400">
                    Histórico cronológico de turnos, evolução de XP, escolhas de habilidades, ferimentos e equipamentos.
                  </p>
                </div>
                {session && (
                  <span className="text-xs font-mono-tabular text-red-400">
                    Sala #{session.room_code} · Rodada {session.round}
                  </span>
                )}
              </div>

              {!session || session.combat_log.length === 0 ? (
                <p className="text-xs text-zinc-400 py-6 text-center">
                  Nenhum evento registrado ainda. Crie uma sala para iniciar o registro tático.
                </p>
              ) : (
                <div className="divide-y divide-zinc-800/80">
                  {session.combat_log.map((item) => (
                    <div
                      key={item.id}
                      className="py-3 flex items-start justify-between gap-3 text-xs sm:text-sm"
                    >
                      <span className="text-zinc-200 leading-relaxed">{item.message}</span>
                      <span className="font-mono-tabular text-[11px] text-zinc-500 shrink-0">
                        {item.timestamp}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* Mobile Fixed Bottom Navigation Bar for One-Thumb Tabletop Control */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-black/95 backdrop-blur-md border-t border-red-950/80 grid grid-cols-5 px-1.5 py-1.5">
        <button
          type="button"
          onClick={() => {
            setActiveTab('LOBBY');
            setMobileMenuOpen(false);
          }}
          className={`flex flex-col items-center justify-center py-1.5 rounded-xl text-[10px] font-semibold transition-colors ${
            activeTab === 'LOBBY'
              ? 'text-red-500 bg-red-950/30'
              : 'text-zinc-400 hover:text-white'
          }`}
        >
          <span>Sala</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveTab('DASHBOARD');
            setMobileMenuOpen(false);
          }}
          className={`flex flex-col items-center justify-center py-1.5 rounded-xl text-[10px] font-semibold transition-colors ${
            activeTab === 'DASHBOARD'
              ? 'text-red-500 bg-red-950/30'
              : 'text-zinc-400 hover:text-white'
          }`}
        >
          <span>Mesa ({session?.survivors.length || 0})</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveTab('CATALOG');
            setMobileMenuOpen(false);
          }}
          className={`flex flex-col items-center justify-center py-1.5 rounded-xl text-[10px] font-semibold transition-colors ${
            activeTab === 'CATALOG'
              ? 'text-red-500 bg-red-950/30'
              : 'text-zinc-400 hover:text-white'
          }`}
        >
          <span>Catálogo</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveTab('INSTRUCTIONS');
            setMobileMenuOpen(false);
          }}
          className={`flex flex-col items-center justify-center py-1.5 rounded-xl text-[10px] font-semibold transition-colors ${
            activeTab === 'INSTRUCTIONS'
              ? 'text-red-500 bg-red-950/30'
              : 'text-zinc-400 hover:text-white'
          }`}
        >
          <span>Regras</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveTab('LOG');
            setMobileMenuOpen(false);
          }}
          className={`flex flex-col items-center justify-center py-1.5 rounded-xl text-[10px] font-semibold transition-colors ${
            activeTab === 'LOG'
              ? 'text-red-500 bg-red-950/30'
              : 'text-zinc-400 hover:text-white'
          }`}
        >
          <span>Log ({session?.combat_log.length || 0})</span>
        </button>
      </nav>

      {/* Full-Screen Zombie Phase Overlay displayed on ALL devices */}
      {session && session.is_zombie_phase && (
        <div className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-lg flex flex-col items-center justify-between p-4 sm:p-8 overflow-y-auto animate-fadeIn">
          {/* Top Bar inside Full-Screen Zombie Phase */}
          <div className="w-full max-w-2xl flex flex-wrap items-center justify-between gap-2 border-b border-red-900/60 pb-3">
            <div className="flex items-center gap-2 text-xs font-mono-tabular text-red-400">
              <span className="px-2.5 py-1 rounded-md bg-red-950/80 border border-red-700/60 font-bold text-red-300">
                SALA #{session.room_code}
              </span>
              <span>RODADA {session.round}</span>
            </div>

            {/* Device Identity / Host Switcher Pill */}
            <div className="flex items-center gap-1.5 text-xs">
              <span className="text-zinc-400">Dispositivo:</span>
              <span
                className={`px-2.5 py-1 rounded-md font-bold flex items-center gap-1 ${
                  isCurrentUserHost
                    ? 'bg-amber-500/20 border border-amber-500/60 text-amber-300'
                    : 'bg-zinc-900 border border-zinc-700 text-zinc-200'
                }`}
              >
                {isCurrentUserHost && <Crown className="w-3.5 h-3.5 text-amber-400" />}
                @{currentUser?.username || session.host_username}
                {isCurrentUserHost ? ' (HOST)' : ''}
              </span>
            </div>
          </div>

          {/* Center Alert Content */}
          <div className="my-auto w-full max-w-2xl text-center space-y-5 py-5">
            <div className="relative mx-auto w-20 h-20 sm:w-28 sm:h-28 rounded-full bg-red-600/20 border-2 border-red-500 flex items-center justify-center shadow-[0_0_60px_rgba(220,38,38,0.5)]">
              <Skull className="w-12 h-12 sm:w-16 sm:h-16 text-red-500 animate-pulse" />
            </div>

            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-red-950/90 border border-red-500/60 text-red-300 text-xs font-mono-tabular uppercase tracking-widest">
                Alerta Global · Rodada {session.round}
              </div>
              <h1 className="text-4xl sm:text-6xl font-extrabold text-red-500 font-display tracking-wider uppercase drop-shadow-[0_2px_20px_rgba(220,38,38,0.65)]">
                VEZ DOS ZUMBIS!
              </h1>
              <p className="text-xs sm:text-sm text-zinc-300 max-w-md mx-auto">
                Todos os sobreviventes encerraram suas ações. Siga as instruções na mesa física na ordem abaixo:
              </p>
            </div>

            {/* Organized Step-by-Step Instructions for Zombie Phase */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-left">
              <div className="p-3.5 sm:p-4 rounded-xl bg-zinc-950/95 border border-red-900/60 space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-lg bg-red-600 text-white font-mono-tabular font-bold text-xs flex items-center justify-center shrink-0">
                    1
                  </span>
                  <h3 className="text-xs sm:text-sm font-bold text-red-400 uppercase tracking-wide">
                    Ativação dos Zumbis
                  </h3>
                </div>
                <ul className="text-xs text-zinc-300 space-y-1 pl-2">
                  <li>• <strong>Ataque:</strong> Zumbis na mesma zona que sobreviventes atacam (causam 1 Ferimento 💔).</li>
                  <li>• <strong>Movimento:</strong> Zumbis que não atacaram movem 1 zona em direção aos sobreviventes visíveis ou ao maior barulho.</li>
                </ul>
              </div>

              <div className="p-3.5 sm:p-4 rounded-xl bg-zinc-950/95 border border-red-900/60 space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-lg bg-red-600 text-white font-mono-tabular font-bold text-xs flex items-center justify-center shrink-0">
                    2
                  </span>
                  <h3 className="text-xs sm:text-sm font-bold text-red-400 uppercase tracking-wide">
                    Entrada (Spawn)
                  </h3>
                </div>
                <ul className="text-xs text-zinc-300 space-y-1 pl-2">
                  <li>• Compre 1 carta de Zumbi para cada ficha de <strong>Ponto de Entrada (Spawn)</strong> no tabuleiro.</li>
                  <li>• Use a faixa de <strong>Maior Nível de Perigo</strong> (Azul, Amarelo, Laranja ou Vermelho) entre os sobreviventes vivos.</li>
                </ul>
              </div>
            </div>

            {/* Quick Wound Application Strip in case a Survivor is bitten during Zombie Phase */}
            <div className="p-4 sm:p-5 rounded-2xl bg-zinc-950/90 border border-red-900/60 text-left space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-red-400">
                  Sobreviventes na Mesa (Aplicar Ferimento se Atacado)
                </span>
                <span className="text-[11px] text-zinc-400 font-mono-tabular">
                  Toque para +1 Ferimento 💔
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {session.survivors.map((surv) => {
                  const char =
                    CHARACTERS_CATALOG.find((c) => c.id === surv.character_id) ||
                    CHARACTERS_CATALOG[0];
                  const isDead = surv.health >= surv.max_health;
                  return (
                    <div
                      key={surv.id}
                      className="flex items-center justify-between p-2.5 rounded-xl bg-black/80 border border-zinc-800/90"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="text-left truncate">
                          <div className="text-xs font-bold text-white truncate">
                            {char.name}{' '}
                            <span className="text-[11px] font-normal text-zinc-400">
                              (@{surv.username})
                            </span>
                          </div>
                          <div className="text-[11px] font-mono-tabular text-red-400">
                            Ferimentos: {surv.health}/{surv.max_health}{' '}
                            {isDead ? '(ELIMINADO 💀)' : ''}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {surv.health > 0 && (
                          <button
                            type="button"
                            onClick={() => handleAdjustWound(surv.id, -1)}
                            className="px-2 py-1 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-[11px] font-semibold text-zinc-300 cursor-pointer"
                            title="Desfazer ferimento"
                          >
                            -1
                          </button>
                        )}
                        <button
                          type="button"
                          disabled={isDead}
                          onClick={() => handleAdjustWound(surv.id, 1)}
                          className="px-2.5 py-1 rounded-lg bg-red-900/70 hover:bg-red-700 disabled:opacity-40 border border-red-500/50 text-[11px] font-bold text-white cursor-pointer"
                        >
                          +1 Ferir 💔
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Host-Only Turn Control Section */}
            <div className="pt-2">
              {isCurrentUserHost ? (
                <div className="space-y-2">
                  <button
                    type="button"
                    onClick={handlePassTurn}
                    className="w-full py-4 px-6 rounded-2xl bg-red-600 hover:bg-red-500 text-white font-extrabold text-base sm:text-lg tracking-wide transition-all flex items-center justify-center gap-3 cursor-pointer shadow-[0_0_35px_rgba(220,38,38,0.6)] border border-red-400/50"
                  >
                    <FastForward className="w-6 h-6" />
                    <span>ENCERRAR FASE DOS ZUMBIS E PASSAR TURNO (HOST)</span>
                  </button>
                  <p className="text-xs text-amber-300/90 font-medium">
                    👑 Você é o Host (@{session.host_username}). Somente você pode encerrar a vez dos zumbis e iniciar a Rodada {session.round + 1}.
                  </p>
                </div>
              ) : (
                <div className="p-5 rounded-2xl bg-zinc-950/95 border border-zinc-800 space-y-3">
                  <div className="flex items-center justify-center gap-2 text-amber-400 font-bold text-sm sm:text-base">
                    <Lock className="w-5 h-5 shrink-0" />
                    <span>
                      Aguardando o Host (@{session.host_username}) passar o turno...
                    </span>
                  </div>
                  <p className="text-xs text-zinc-400 max-w-md mx-auto">
                    Na Fase dos Zumbis, todos os dispositivos ficam bloqueados nesta tela e <strong className="text-zinc-200">somente o Host da sala (@{session.host_username})</strong> pode avançar para a próxima rodada.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Footer Device Profile Switcher (for testing or shared tabletop devices) */}
          {session.joined_players.length > 1 && (
            <div className="w-full max-w-2xl pt-3 border-t border-zinc-900 flex flex-wrap items-center justify-center gap-2 text-[11px] text-zinc-500">
              <span>Alternar visualização de jogador neste aparelho:</span>
              {session.joined_players.map((p) => {
                const isSelected =
                  (currentUser?.username || session.host_username).toLowerCase() ===
                  p.username.toLowerCase();
                return (
                  <button
                    key={p.user_id}
                    type="button"
                    onClick={() => handleRegisterOrLogin(p.username, p.avatar_url)}
                    className={`px-2.5 py-1 rounded-lg border font-mono-tabular transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-red-600/20 border-red-500 text-white font-bold'
                        : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    @{p.username} {p.is_host ? '👑' : ''}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Level-Up Skill Choice Modal (RF03.4) */}
      {pendingLevelUpModal && modalSurvivor && modalCharacter && (
        <LevelUpModal
          character={modalCharacter}
          survivorUsername={modalSurvivor.username}
          tier={pendingLevelUpModal.tier}
          currentSelection={
            pendingLevelUpModal.tier === 'ORANGE'
              ? modalSurvivor.selected_skills_json.orange
              : modalSurvivor.selected_skills_json.red
          }
          isManualEdit={pendingLevelUpModal.isManualEdit}
          onConfirm={handleConfirmSkillSelection}
          onClose={() => setPendingLevelUpModal(null)}
        />
      )}
    </div>
  );
}
