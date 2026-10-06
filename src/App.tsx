/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
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
import { Volume2, VolumeX, RotateCcw, Users, Menu, X } from 'lucide-react';

type ActiveTab = 'LOBBY' | 'DASHBOARD' | 'CATALOG' | 'LOG';

const STORAGE_KEY_SESSION = 'zombicide_companion_session_v15';
const STORAGE_KEY_USERS = 'zombicide_companion_users_v15';

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
      if (session) {
        localStorage.setItem(STORAGE_KEY_SESSION, JSON.stringify(session));
      } else {
        localStorage.removeItem(STORAGE_KEY_SESSION);
      }
    } catch {
      // ignore
    }
  }, [session]);

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

  // RF01 — Register or Authenticate User
  const handleRegisterOrLogin = (username: string, passwordPlain: string) => {
    const clean = username.trim();
    const existing = users.find(
      (u) => u.username.toLowerCase() === clean.toLowerCase()
    );
    const computedHash = computePasswordHash(passwordPlain, clean.toLowerCase());

    if (existing) {
      if (existing.password_hash !== computedHash) {
        return {
          success: false,
          message: `Senha incorreta para o usuário @${existing.username}.`,
        };
      }
      setCurrentUser(existing);
      soundFX.playClick();
      return {
        success: true,
        message: `Usuário @${existing.username} autenticado com sucesso!`,
        user: existing,
      };
    }

    const newUser: UserProfile = {
      id: `usr_${clean.toLowerCase()}_${Date.now()}`,
      username: clean,
      password_hash: computedHash,
      jwt_token: createJwtToken(clean),
      created_at: new Date().toISOString(),
    };
    setUsers((prev) => [...prev, newUser]);
    setCurrentUser(newUser);
    soundFX.playClick();
    return {
      success: true,
      message: `Usuário @${newUser.username} criado com hash Argon2id e JWT!`,
      user: newUser,
    };
  };

  // Host Creates the Room with a Room Password
  const handleHostCreateRoom = (
    roomName: string,
    roomCode: string,
    roomPasswordPlain: string
  ) => {
    const hostUser = currentUser || users[users.length - 1];
    const hostUsername = hostUser?.username || 'host';
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
      message: `Sala #${code} criada por @${hostUsername}! Agora os demais jogadores podem criar seus usuários e entrar com a senha da sala.`,
    };
  };

  // Other Players Register/Login and Join the Host's Room using the Host's Room Password
  const handlePlayerJoinRoom = (
    username: string,
    userPasswordPlain: string,
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
        message: 'Senha da sala incorreta! Solicite a senha correta criada pelo jogador Host.',
      };
    }

    // Authenticate or create the player's account
    const authRes = handleRegisterOrLogin(username, userPasswordPlain);
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
        ? prev.joined_players
        : [
            ...prev.joined_players,
            {
              user_id: joiningUser.id,
              username: joiningUser.username,
              is_host: false,
              joined_at: new Date().toISOString(),
            },
          ];

      return {
        ...prev,
        joined_players: nextPlayers,
        combat_log: appendLog(
          prev,
          `Jogador @${joiningUser.username} autenticou-se e entrou na Sala #${prev.room_code} usando a senha do Host.`,
          'TURN'
        ),
      };
    });

    return {
      success: true,
      message: `Jogador @${joiningUser.username} entrou na Sala #${session.room_code}! Adicione mais jogadores ou avance para a Escolha de Personagens.`,
    };
  };

  // RF02.1 — Add Survivor to Table
  const handleAddSurvivorToTable = (username: string, characterId: string) => {
    soundFX.playClick();
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
        survivors: nextSurvivors,
        combat_log: appendLog(
          prev,
          `@${targetUser} escolheu o sobrevivente ${char?.name || characterId} (${char?.edition}).`,
          'TURN'
        ),
      };
    });
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

  // RF02.3 & RF02.4 — Pass Turn & Rotate First Player Marker on New Round
  const handlePassTurn = () => {
    setSession((prev) => {
      if (!prev) return prev;
      const count = prev.survivors.length;
      if (count === 0) return prev;

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
    if (item.id === 'eq_water' || item.id === 'eq_canned_food') {
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
    isDualAkimbo: boolean
  ) => {
    soundFX.playDiceRoll();
    setSession((prev) => {
      if (!prev) return prev;
      const surv = prev.survivors.find((s) => s.id === survivorId);
      const char = CHARACTERS_CATALOG.find((c) => c.id === surv?.character_id);
      return {
        ...prev,
        survivors: prev.survivors.map((s) =>
          s.id === survivorId
            ? { ...s, actions_left: Math.max(0, s.actions_left - 1) }
            : s
        ),
        combat_log: appendLog(
          prev,
          `🎲 ${char?.name} atacou com ${item.name}${
            isDualAkimbo ? ' (Akimbo)' : ''
          }${item.noise_on_use ? ' [Gerou +1 Ficha de Barulho]' : ' [Silencioso]'}.`,
          'COMBAT'
        ),
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
      <main className="relative z-10 flex-1">
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
            <div className="max-w-2xl mx-auto px-4 py-16 text-center space-y-4">
              <div className="p-8 rounded-2xl bg-[#0A0A0C]/95 border border-zinc-800 space-y-4">
                <Users className="w-10 h-10 text-red-500 mx-auto" />
                <h2 className="text-2xl font-bold text-white font-display">
                  Nenhum Sobrevivente na Mesa Ainda
                </h2>
                <p className="text-sm text-zinc-300">
                  Primeiro crie a sala como Host (ou entre com a senha da sala) e escolha os personagens dos jogadores para liberar o Dashboard da partida.
                </p>
                <button
                  type="button"
                  onClick={() => setActiveTab('LOBBY')}
                  className="px-6 py-3 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-sm transition-colors cursor-pointer"
                >
                  Ir para Login e Escolha de Personagens
                </button>
              </div>
            </div>
          )
        )}

        {activeTab === 'CATALOG' && <CatalogExplorer />}

        {activeTab === 'LOG' && (
          <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-6">
            <div className="p-6 rounded-2xl bg-[#0A0A0C]/95 border border-zinc-800 space-y-4">
              <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
                <div>
                  <h1 className="text-2xl font-bold text-white font-display">
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
                      className="py-3 flex items-start justify-between gap-4 text-xs sm:text-sm"
                    >
                      <span className="text-zinc-200">{item.message}</span>
                      <span className="font-mono-tabular text-xs text-zinc-500 shrink-0">
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
