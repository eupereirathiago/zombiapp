import React, { useState, useMemo, useRef } from 'react';
import {
  UserProfile,
  GameSession,
  ZombicideEdition,
} from '../types/game';
import {
  CHARACTERS_CATALOG,
  ITEMS_DATABASE,
  EDITION_LABELS,
} from '../data/zombicideCatalog';
import { CharacterAvatar } from './CharacterAvatar';
import {
  UserPlus,
  Lock,
  CheckCircle2,
  AlertCircle,
  Play,
  Users,
  ShieldCheck,
  Trash2,
  KeyRound,
  DoorOpen,
  Search,
  Crown,
  ArrowRight,
  PlusCircle,
  Eye,
  EyeOff,
  Camera,
  Upload,
} from 'lucide-react';

interface AuthAndLobbyProps {
  users: UserProfile[];
  currentUser: UserProfile | null;
  session: GameSession | null;
  onRegisterOrLogin: (username: string, avatarUrl?: string) => {
    success: boolean;
    message: string;
    user?: UserProfile;
  };
  onHostCreateRoom: (
    hostNickname: string,
    hostAvatarUrl: string,
    roomName: string,
    roomCode: string,
    roomPasswordPlain: string
  ) => {
    success: boolean;
    message: string;
  };
  onPlayerJoinRoom: (
    username: string,
    avatarUrl: string,
    roomCode: string,
    roomPasswordPlain: string
  ) => {
    success: boolean;
    message: string;
  };
  onAddSurvivorToTable: (username: string, characterId: string) => void;
  onRemoveSurvivorFromTable: (survivorId: string) => void;
  onStartMatch: () => void;
}

const USERNAME_REGEX = /^[a-zA-Z0-9_]{3,20}$/;

const PROFILE_AVATAR_PRESETS = [
  { id: 'av_wanda', label: 'Wanda', url: '/assets/survivors/Wanda.webp' },
  { id: 'av_phil', label: 'Phil', url: '/assets/survivors/Phil.webp' },
  { id: 'av_ned', label: 'Ned', url: '/assets/survivors/Ned.webp' },
  { id: 'av_josh', label: 'Josh', url: '/assets/survivors/Josh.webp' },
  { id: 'av_amy', label: 'Amy', url: '/assets/survivors/Amy.webp' },
  { id: 'av_doug', label: 'Doug', url: '/assets/survivors/Doug.webp' },
  { id: 'av_grindlock', label: 'Grindlock', url: '/assets/survivors/Grindlock.webp' },
  { id: 'av_belle', label: 'Belle', url: '/assets/survivors/Belle.webp' },
  { id: 'av_kim', label: 'Kim', url: '/assets/survivors/Kim.webp' },
  { id: 'av_elsa', label: 'Elsa', url: '/assets/survivors/Elsa.webp' },
  { id: 'av_raoul', label: 'Raoul', url: '/assets/survivors/Raoul.webp' },
  { id: 'av_maddie', label: 'Maddie', url: '/assets/survivors/Maddie.webp' },
];

type WizardStep = 'STEP_1_ROOM_GATE' | 'STEP_2_CHARACTER_SELECT';
type GateMode = 'HOST_CREATE' | 'PLAYER_JOIN';

export const AuthAndLobby: React.FC<AuthAndLobbyProps> = ({
  users,
  currentUser,
  session,
  onHostCreateRoom,
  onPlayerJoinRoom,
  onAddSurvivorToTable,
  onRemoveSurvivorFromTable,
  onStartMatch,
}) => {
  const [wizardStep, setWizardStep] = useState<WizardStep>(
    session ? 'STEP_2_CHARACTER_SELECT' : 'STEP_1_ROOM_GATE'
  );
  const [gateMode, setGateMode] = useState<GateMode>(
    session ? 'PLAYER_JOIN' : 'HOST_CREATE'
  );

  // Nickname & Profile Avatar State (Shared between Host Create & Player Join)
  const [username, setUsername] = useState(currentUser?.username || '');
  const [selectedAvatar, setSelectedAvatar] = useState<string>(
    currentUser?.avatar_url || PROFILE_AVATAR_PRESETS[0].url
  );
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Host Room Creation State
  const [roomName, setRoomName] = useState('Missão Zombicide #01');
  const [roomCode, setRoomCode] = useState(session?.room_code || 'ZMB204');
  const [roomPassword, setRoomPassword] = useState('');
  const [showHostRoomPassword, setShowHostRoomPassword] = useState(false);

  // Player Join Room State
  const [joinRoomCode, setJoinRoomCode] = useState(
    session?.room_code || 'ZMB204'
  );
  const [joinRoomPassword, setJoinRoomPassword] = useState('');
  const [showJoinRoomPassword, setShowJoinRoomPassword] = useState(false);

  const [feedback, setFeedback] = useState<{
    type: 'error' | 'success';
    text: string;
  } | null>(null);

  // Character Selection State
  const [selectedPlayerForPick, setSelectedPlayerForPick] = useState<string>(
    currentUser?.username || ''
  );
  const [editionFilter, setEditionFilter] = useState<ZombicideEdition | 'ALL'>('ALL');
  const [charSearch, setCharSearch] = useState('');

  // Handle custom image upload from device for player profile
  const handleCustomAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setSelectedAvatar(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  // Real-time nickname validation (supports optional leading @ like @lordvoldemort)
  const usernameValidation = useMemo(() => {
    const clean = username.trim().replace(/^@+/, '');
    if (!clean) {
      return {
        valid: false,
        clean: '',
        exists: false,
        hint: 'Digite seu nickname (ex: @lordvoldemort) com 3 a 20 caracteres alfanuméricos.',
      };
    }
    const isValidFormat = USERNAME_REGEX.test(clean);
    const existingUser = users.find(
      (u) => u.username.toLowerCase() === clean.toLowerCase()
    );
    if (!isValidFormat) {
      return {
        valid: false,
        clean,
        exists: false,
        hint: 'Formato inválido: use apenas letras, números e sublinhado (_) entre 3 e 20 caracteres.',
      };
    }
    if (existingUser) {
      return {
        valid: true,
        clean,
        exists: true,
        hint: `Nickname @${existingUser.username} reconhecido — pronto para entrar sem precisar de senha pessoal!`,
      };
    }
    return {
      valid: true,
      clean,
      exists: false,
      hint: `Nickname @${clean} disponível!`,
    };
  }, [username, users]);

  // Host creates nickname + profile photo + room code + room password
  const handleHostSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);

    if (!usernameValidation.valid) {
      setFeedback({ type: 'error', text: usernameValidation.hint });
      return;
    }
    if (roomPassword.trim().length < 3) {
      setFeedback({
        type: 'error',
        text: 'Defina uma senha para a sala (mínimo de 3 caracteres) para os demais jogadores entrarem.',
      });
      return;
    }

    const cleanNick = usernameValidation.clean;
    const roomResult = onHostCreateRoom(
      cleanNick,
      selectedAvatar,
      roomName.trim() || 'Mesa Zombicide',
      roomCode.trim().toUpperCase() || 'ZMB204',
      roomPassword.trim()
    );

    if (roomResult.success) {
      setSelectedPlayerForPick(cleanNick);
      setFeedback({ type: 'success', text: roomResult.message });
      setJoinRoomCode(roomCode.trim().toUpperCase() || 'ZMB204');
      setUsername('');
      setWizardStep('STEP_2_CHARACTER_SELECT');
    } else {
      setFeedback({ type: 'error', text: roomResult.message });
    }
  };

  // Other players create nickname + choose profile image + enter Host's room password
  const handlePlayerJoinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);

    if (!session) {
      setFeedback({
        type: 'error',
        text: 'Nenhuma sala criada ainda! O jogador Host deve criar a sala primeiro.',
      });
      return;
    }

    if (!usernameValidation.valid) {
      setFeedback({ type: 'error', text: usernameValidation.hint });
      return;
    }

    if (!joinRoomPassword.trim()) {
      setFeedback({
        type: 'error',
        text: 'Digite a senha da sala fornecida pelo Host.',
      });
      return;
    }

    const cleanNick = usernameValidation.clean;
    const joinRes = onPlayerJoinRoom(
      cleanNick,
      selectedAvatar,
      joinRoomCode.trim().toUpperCase(),
      joinRoomPassword.trim()
    );

    if (joinRes.success) {
      setSelectedPlayerForPick(cleanNick);
      setFeedback({ type: 'success', text: joinRes.message });
      setUsername('');
      setJoinRoomPassword('');
      setWizardStep('STEP_2_CHARACTER_SELECT');
    } else {
      setFeedback({ type: 'error', text: joinRes.message });
    }
  };

  // Filtered characters across all Zombicide editions
  const filteredCharacters = useMemo(() => {
    return CHARACTERS_CATALOG.filter((char) => {
      const matchesEdition =
        editionFilter === 'ALL' || char.edition === editionFilter;
      const q = charSearch.trim().toLowerCase();
      const matchesSearch =
        !q ||
        char.name.toLowerCase().includes(q) ||
        char.title.toLowerCase().includes(q) ||
        char.skills.blue.name.toLowerCase().includes(q) ||
        char.skills.orange.some((s) => s.name.toLowerCase().includes(q)) ||
        char.skills.red.some((s) => s.name.toLowerCase().includes(q));
      return matchesEdition && matchesSearch;
    });
  }, [editionFilter, charSearch]);

  const assignedCharacterIds = new Set(
    session?.survivors.map((s) => s.character_id) || []
  );

  const activePlayerUsername =
    selectedPlayerForPick ||
    session?.joined_players[session.joined_players.length - 1]?.username ||
    currentUser?.username ||
    '';

  const renderProfileAvatarPicker = () => (
    <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <label className="text-xs font-semibold text-zinc-200 flex items-center gap-1.5">
          <Camera className="w-3.5 h-3.5 text-red-500" />
          <span>Escolha uma Imagem para seu Perfil</span>
        </label>

        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="px-2.5 py-1 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-[11px] font-semibold text-red-400 flex items-center gap-1.5 transition-colors cursor-pointer"
        >
          <Upload className="w-3 h-3" />
          <span>Enviar Foto</span>
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleCustomAvatarUpload}
          className="hidden"
        />
      </div>

      <div className="flex items-center gap-3">
        {/* Selected Profile Avatar Preview */}
        <div className="relative shrink-0">
          <img
            src={selectedAvatar}
            alt="Avatar do Jogador"
            className="w-14 h-14 rounded-full object-cover object-top border-2 border-red-500 bg-black"
          />
          <span className="absolute -bottom-1 -right-1 px-1.5 py-0.5 rounded bg-red-600 text-[9px] font-bold text-white">
            PERFIL
          </span>
        </div>

        {/* Preset Avatars Grid */}
        <div className="flex items-center gap-2 overflow-x-auto py-1 flex-1">
          {PROFILE_AVATAR_PRESETS.map((preset) => {
            const isSelected = selectedAvatar === preset.url;
            return (
              <button
                key={preset.id}
                type="button"
                onClick={() => setSelectedAvatar(preset.url)}
                title={`Escolher avatar ${preset.label}`}
                className={`group flex flex-col items-center gap-1 p-1 rounded-xl border transition-all shrink-0 cursor-pointer ${
                  isSelected
                    ? 'border-red-500 bg-red-950/30 scale-105'
                    : 'border-zinc-800 bg-black/60 opacity-70 hover:opacity-100 hover:border-zinc-700'
                }`}
              >
                <img
                  src={preset.url}
                  alt={preset.label}
                  className="w-9 h-9 rounded-full object-cover object-top"
                />
                <span className="text-[9px] font-medium text-zinc-400 group-hover:text-zinc-200">
                  {preset.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 py-4 sm:py-8 space-y-5 sm:space-y-8">
      {/* Header */}
      <div className="p-4 sm:p-6 rounded-2xl bg-[#0A0A0C]/95 border border-zinc-800 flex flex-col md:flex-row md:items-center justify-between gap-3.5">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 text-[11px] sm:text-xs text-red-500 font-mono-tabular">
            <span>PREPARAÇÃO DA PARTIDA</span>
            {session && (
              <>
                <span aria-hidden="true">·</span>
                <span>SALA #{session.room_code}</span>
                <span aria-hidden="true">·</span>
                <span>HOST: @{session.host_username}</span>
              </>
            )}
          </div>
          <h1 className="text-lg sm:text-2xl font-bold text-white font-display">
            {wizardStep === 'STEP_1_ROOM_GATE'
              ? 'Login e Acesso à Sala'
              : 'Seleção de Personagens'}
          </h1>
        </div>

        {/* Switch Buttons */}
        <div className="grid grid-cols-2 sm:flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setWizardStep('STEP_1_ROOM_GATE')}
            className={`px-3 sm:px-4 py-2.5 sm:py-2 rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-2 whitespace-nowrap cursor-pointer ${
              wizardStep === 'STEP_1_ROOM_GATE'
                ? 'bg-red-600 text-white'
                : 'bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-white'
            }`}
          >
            <KeyRound className="w-3.5 h-3.5" />
            <span>Login e Sala</span>
          </button>

          <button
            type="button"
            disabled={!session}
            onClick={() => setWizardStep('STEP_2_CHARACTER_SELECT')}
            className={`px-3 sm:px-4 py-2.5 sm:py-2 rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-2 whitespace-nowrap cursor-pointer disabled:opacity-40 ${
              wizardStep === 'STEP_2_CHARACTER_SELECT'
                ? 'bg-red-600 text-white'
                : 'bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-white'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Personagens ({CHARACTERS_CATALOG.length})</span>
          </button>
        </div>
      </div>

      {/* =====================================================================
          LOGIN & ROOM CREATION (HOST) / JOIN ROOM WITH PASSWORD
         ===================================================================== */}
      {wizardStep === 'STEP_1_ROOM_GATE' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left Column (7 Cols): Host Create Room OR Player Join Room */}
          <div className="lg:col-span-7 space-y-6">
            <div className="p-6 sm:p-8 rounded-2xl bg-[#0A0A0C]/95 border border-zinc-800 space-y-6">
              {/* Mode Selector Tabs */}
              <div className="grid grid-cols-2 gap-2 p-1.5 bg-black border border-zinc-800 rounded-xl">
                <button
                  type="button"
                  onClick={() => {
                    setGateMode('HOST_CREATE');
                    setFeedback(null);
                  }}
                  className={`py-2.5 px-4 rounded-lg text-xs sm:text-sm font-bold transition-colors flex items-center justify-center gap-2 whitespace-nowrap cursor-pointer ${
                    gateMode === 'HOST_CREATE'
                      ? 'bg-red-600 text-white'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  <Crown className="w-4 h-4" />
                  <span>Criar Sala (Host)</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setGateMode('PLAYER_JOIN');
                    setFeedback(null);
                  }}
                  className={`py-2.5 px-4 rounded-lg text-xs sm:text-sm font-bold transition-colors flex items-center justify-center gap-2 whitespace-nowrap cursor-pointer ${
                    gateMode === 'PLAYER_JOIN'
                      ? 'bg-red-600 text-white'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  <DoorOpen className="w-4 h-4" />
                  <span>Entrar na Sala</span>
                </button>
              </div>

              {gateMode === 'HOST_CREATE' ? (
                <form onSubmit={handleHostSubmit} className="space-y-5">
                  <div className="border-b border-zinc-800 pb-3 space-y-2">
                    <h2 className="text-lg font-bold text-white font-display">
                      Criação da Sala pelo Host
                    </h2>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs text-zinc-300">
                      <div className="p-2 rounded-lg bg-zinc-950 border border-zinc-800/80 flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-red-600/20 border border-red-500/40 text-red-400 font-bold text-[11px] flex items-center justify-center shrink-0">
                          1
                        </span>
                        <span>Crie seu <strong>@nickname</strong></span>
                      </div>
                      <div className="p-2 rounded-lg bg-zinc-950 border border-zinc-800/80 flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-red-600/20 border border-red-500/40 text-red-400 font-bold text-[11px] flex items-center justify-center shrink-0">
                          2
                        </span>
                        <span>Escolha sua <strong>Foto</strong></span>
                      </div>
                      <div className="p-2 rounded-lg bg-zinc-950 border border-zinc-800/80 flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-red-600/20 border border-red-500/40 text-red-400 font-bold text-[11px] flex items-center justify-center shrink-0">
                          3
                        </span>
                        <span>Defina a <strong>Senha da Sala</strong></span>
                      </div>
                    </div>
                  </div>

                  {/* Host Nickname (No personal password required) */}
                  <div>
                    <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                      Nickname do Host
                    </label>
                    <div className="relative">
                      <span className="text-red-500 font-mono-tabular font-bold text-sm absolute left-3.5 top-1/2 -translate-y-1/2">
                        @
                      </span>
                      <input
                        type="text"
                        value={username.replace(/^@+/, '')}
                        onChange={(e) => setUsername(e.target.value.replace(/^@+/, ''))}
                        maxLength={20}
                        placeholder="lordvoldemort"
                        className="w-full pl-8 pr-3.5 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-red-500"
                      />
                    </div>
                  </div>

                  <div className="flex items-start gap-1.5 text-xs">
                    {username ? (
                      usernameValidation.valid ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                      ) : (
                        <AlertCircle className="w-3.5 h-3.5 text-red-400 shrink-0 mt-0.5" />
                      )
                    ) : null}
                    <span
                      className={
                        !username
                          ? 'text-zinc-500'
                          : usernameValidation.valid
                          ? 'text-emerald-400'
                          : 'text-red-400'
                      }
                    >
                      {usernameValidation.hint}
                    </span>
                  </div>

                  {/* Player Profile Image Picker */}
                  {renderProfileAvatarPicker()}

                  {/* Room Settings & Room Password with Eye Toggle */}
                  <div className="p-4 rounded-xl bg-zinc-950 border border-red-900/50 space-y-4">
                    <div className="text-xs font-semibold text-red-500 flex items-center gap-1.5">
                      <KeyRound className="w-4 h-4" />
                      <span>Configuração e Senha da Sala</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="sm:col-span-1">
                        <label className="block text-xs text-zinc-400 mb-1">
                          Código da Sala
                        </label>
                        <input
                          type="text"
                          value={roomCode}
                          onChange={(e) =>
                            setRoomCode(e.target.value.toUpperCase())
                          }
                          maxLength={6}
                          placeholder="ZMB204"
                          className="w-full px-3 py-2 bg-black border border-zinc-800 rounded-lg text-sm font-mono-tabular font-bold text-red-500 uppercase focus:outline-none focus:border-red-500"
                        />
                      </div>

                      <div className="sm:col-span-2">
                        <label className="block text-xs text-zinc-400 mb-1">
                          Nome da Mesa / Missão
                        </label>
                        <input
                          type="text"
                          value={roomName}
                          onChange={(e) => setRoomName(e.target.value)}
                          placeholder="Ex: Noite dos Mortos"
                          className="w-full px-3 py-2 bg-black border border-zinc-800 rounded-lg text-sm text-white focus:outline-none focus:border-red-500"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-red-400 mb-1">
                        Senha da Sala (Para os outros jogadores entrarem)
                      </label>
                      <div className="relative">
                        <Lock className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                        <input
                          type={showHostRoomPassword ? 'text' : 'password'}
                          value={roomPassword}
                          onChange={(e) => setRoomPassword(e.target.value)}
                          placeholder="Crie a senha da sala (ex: mesa123)"
                          className="w-full pl-10 pr-11 py-2.5 bg-black border border-red-600/50 rounded-lg text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-red-500"
                        />
                        <button
                          type="button"
                          onClick={() => setShowHostRoomPassword((prev) => !prev)}
                          title={
                            showHostRoomPassword
                              ? 'Ocultar senha da sala'
                              : 'Mostrar senha da sala'
                          }
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-red-400 transition-colors cursor-pointer"
                        >
                          {showHostRoomPassword ? (
                            <EyeOff className="w-4 h-4" />
                          ) : (
                            <Eye className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>

                  {feedback && (
                    <div
                      className={`p-3.5 rounded-xl text-xs font-medium ${
                        feedback.type === 'success'
                          ? 'bg-emerald-950/60 text-emerald-300 border border-emerald-500/40'
                          : 'bg-red-950/60 text-red-300 border border-red-500/40'
                      }`}
                    >
                      {feedback.text}
                    </div>
                  )}

                  <button
                    type="submit"
                    className="w-full py-3 px-5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-sm transition-colors flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Crown className="w-4 h-4" />
                    <span>Criar Nickname do Host e Abrir Sala</span>
                  </button>
                </form>
              ) : (
                <form onSubmit={handlePlayerJoinSubmit} className="space-y-5">
                  <div className="border-b border-zinc-800 pb-3 space-y-2">
                    <h2 className="text-lg font-bold text-white font-display">
                      Entrar na Sala do Host
                    </h2>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs text-zinc-300">
                      <div className="p-2 rounded-lg bg-zinc-950 border border-zinc-800/80 flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-red-600/20 border border-red-500/40 text-red-400 font-bold text-[11px] flex items-center justify-center shrink-0">
                          1
                        </span>
                        <span>Digite seu <strong>@nickname</strong></span>
                      </div>
                      <div className="p-2 rounded-lg bg-zinc-950 border border-zinc-800/80 flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-red-600/20 border border-red-500/40 text-red-400 font-bold text-[11px] flex items-center justify-center shrink-0">
                          2
                        </span>
                        <span>Escolha seu <strong>Avatar</strong></span>
                      </div>
                      <div className="p-2 rounded-lg bg-zinc-950 border border-zinc-800/80 flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-red-600/20 border border-red-500/40 text-red-400 font-bold text-[11px] flex items-center justify-center shrink-0">
                          3
                        </span>
                        <span>Use a <strong>Senha do Host</strong></span>
                      </div>
                    </div>
                  </div>

                  {!session && (
                    <div className="p-4 rounded-xl bg-red-950/40 border border-red-600/50 text-xs text-red-200 flex items-center justify-between gap-3">
                      <span>
                        Atenção: O Host ainda não criou a sala. Crie a sala na aba &ldquo;Criar Sala (Host)&rdquo; primeiro!
                      </span>
                      <button
                        type="button"
                        onClick={() => setGateMode('HOST_CREATE')}
                        className="px-3 py-1.5 rounded-lg bg-red-600 text-white font-bold whitespace-nowrap cursor-pointer"
                      >
                        Ir para Host
                      </button>
                    </div>
                  )}

                  {/* Player Nickname Only (No personal password) */}
                  <div>
                    <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                      Seu Nickname
                    </label>
                    <div className="relative">
                      <span className="text-red-500 font-mono-tabular font-bold text-sm absolute left-3.5 top-1/2 -translate-y-1/2">
                        @
                      </span>
                      <input
                        type="text"
                        value={username.replace(/^@+/, '')}
                        onChange={(e) => setUsername(e.target.value.replace(/^@+/, ''))}
                        maxLength={20}
                        placeholder="lucas_sniper"
                        className="w-full pl-8 pr-3.5 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-red-500"
                      />
                    </div>
                  </div>

                  <div className="flex items-start gap-1.5 text-xs">
                    {username ? (
                      usernameValidation.valid ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                      ) : (
                        <AlertCircle className="w-3.5 h-3.5 text-red-400 shrink-0 mt-0.5" />
                      )
                    ) : null}
                    <span
                      className={
                        !username
                          ? 'text-zinc-500'
                          : usernameValidation.valid
                          ? 'text-emerald-400'
                          : 'text-red-400'
                      }
                    >
                      {usernameValidation.hint}
                    </span>
                  </div>

                  {/* Player Profile Image Picker */}
                  {renderProfileAvatarPicker()}

                  {/* Host Room Code & Password Verification with Eye Icon */}
                  <div className="p-4 rounded-xl bg-zinc-950 border border-red-900/50 space-y-4">
                    <div className="text-xs font-semibold text-red-500 flex items-center gap-1.5">
                      <DoorOpen className="w-4 h-4" />
                      <span>Acesso à Sala do Host</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs text-zinc-400 mb-1">
                          Código da Sala do Host
                        </label>
                        <input
                          type="text"
                          value={joinRoomCode}
                          onChange={(e) =>
                            setJoinRoomCode(e.target.value.toUpperCase())
                          }
                          maxLength={6}
                          placeholder="ZMB204"
                          className="w-full px-3.5 py-2 bg-black border border-zinc-800 rounded-lg text-sm font-mono-tabular font-bold text-red-500 uppercase focus:outline-none focus:border-red-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-red-400 mb-1">
                          Senha da Sala (Fornecida pelo Host)
                        </label>
                        <div className="relative">
                          <Lock className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                          <input
                            type={showJoinRoomPassword ? 'text' : 'password'}
                            value={joinRoomPassword}
                            onChange={(e) => setJoinRoomPassword(e.target.value)}
                            placeholder="Digite a senha da sala"
                            className="w-full pl-10 pr-11 py-2 bg-black border border-red-600/50 rounded-lg text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-red-500"
                          />
                          <button
                            type="button"
                            onClick={() =>
                              setShowJoinRoomPassword((prev) => !prev)
                            }
                            title={
                              showJoinRoomPassword
                                ? 'Ocultar senha da sala'
                                : 'Mostrar senha da sala'
                            }
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-red-400 transition-colors cursor-pointer"
                          >
                            {showJoinRoomPassword ? (
                              <EyeOff className="w-4 h-4" />
                            ) : (
                              <Eye className="w-4 h-4" />
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {feedback && (
                    <div
                      className={`p-3.5 rounded-xl text-xs font-medium ${
                        feedback.type === 'success'
                          ? 'bg-emerald-950/60 text-emerald-300 border border-emerald-500/40'
                          : 'bg-red-950/60 text-red-300 border border-red-500/40'
                      }`}
                    >
                      {feedback.text}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={!session}
                    className="w-full py-3 px-5 rounded-xl bg-red-600 hover:bg-red-500 disabled:opacity-40 text-white font-bold text-sm transition-colors flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <UserPlus className="w-4 h-4" />
                    <span>Entrar na Sala do Host</span>
                  </button>
                </form>
              )}
            </div>
          </div>

          {/* Right Column (5 Cols): Room Status & Joined Players List */}
          <div className="lg:col-span-5 space-y-6">
            <div className="p-6 rounded-2xl bg-[#0A0A0C]/95 border border-zinc-800 space-y-5">
              <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
                <div>
                  <h3 className="text-base font-bold text-white font-display">
                    Status da Sala e Jogadores Conectados
                  </h3>
                  <p className="text-xs text-zinc-400">
                    Após todos entrarem na sala, avance para a Escolha de Personagens.
                  </p>
                </div>
                {session && (
                  <span className="px-2.5 py-1 rounded-md bg-red-950/80 border border-red-600/40 text-red-400 font-mono-tabular text-xs font-bold">
                    #{session.room_code}
                  </span>
                )}
              </div>

              {!session ? (
                <div className="py-10 text-center space-y-2">
                  <Lock className="w-8 h-8 text-zinc-600 mx-auto" />
                  <p className="text-sm font-semibold text-zinc-300">
                    Nenhuma Sala Ativa no Momento
                  </p>
                  <p className="text-xs text-zinc-500 max-w-xs mx-auto">
                    O jogador Host deve criar seu nickname e definir a senha da sala no formulário ao lado.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="p-3.5 rounded-xl bg-zinc-950 border border-zinc-800 space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-zinc-400">Mesa / Missão:</span>
                      <span className="font-bold text-white">{session.room_name}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-zinc-400">Anfitrião (Host):</span>
                      <span className="font-mono-tabular text-red-500">
                        @{session.host_username}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-zinc-400">Proteção da Sala:</span>
                      <span className="text-emerald-400 flex items-center gap-1">
                        <ShieldCheck className="w-3.5 h-3.5" />
                        Senha da Sala Ativa
                      </span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="text-xs font-semibold text-zinc-300 flex items-center justify-between">
                      <span>Jogadores na Sala ({session.joined_players.length})</span>
                    </div>

                    <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                      {session.joined_players.map((p, idx) => {
                        const playerSurvivors = session.survivors.filter(
                          (s) => s.username.toLowerCase() === p.username.toLowerCase()
                        );
                        return (
                          <div
                            key={p.user_id}
                            className="p-3 rounded-xl bg-zinc-950 border border-zinc-800 flex items-center justify-between gap-2"
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              {p.avatar_url ? (
                                <img
                                  src={p.avatar_url}
                                  alt={p.username}
                                  className="w-8 h-8 rounded-full object-cover object-top border border-red-500/60 shrink-0"
                                />
                              ) : (
                                <span className="w-8 h-8 rounded-full bg-zinc-900 border border-red-900/50 text-xs font-mono-tabular font-bold text-red-500 flex items-center justify-center shrink-0">
                                  {idx + 1}
                                </span>
                              )}
                              <div className="min-w-0">
                                <div className="text-sm font-bold text-white flex items-center gap-1.5 truncate">
                                  <span>@{p.username}</span>
                                  {p.is_host && (
                                    <span className="text-[10px] font-semibold text-red-500">
                                      · HOST
                                    </span>
                                  )}
                                </div>
                                <div className="text-[11px] text-zinc-400 truncate">
                                  {playerSurvivors.length > 0
                                    ? `${playerSurvivors.length} sobrevivente(s) escolhido(s)`
                                    : 'Aguardando escolha de personagem'}
                                </div>
                              </div>
                            </div>

                            <span className="text-[11px] font-mono-tabular text-emerald-400 shrink-0">
                              Na Sala
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setWizardStep('STEP_2_CHARACTER_SELECT')}
                    className="w-full py-3 px-4 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs sm:text-sm transition-colors flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <span>Avançar para Escolha de Personagens</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          CHARACTER SELECTION (ALL EDITIONS OF ZOMBICIDE)
         ===================================================================== */}
      {wizardStep === 'STEP_2_CHARACTER_SELECT' && session && (
        <div className="space-y-8">
          {/* Active Squad Bar & Player Selector */}
          <div className="p-6 rounded-2xl bg-[#0A0A0C]/95 border border-zinc-800 space-y-5">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-zinc-800 pb-4">
              <div>
                <h2 className="text-lg font-bold text-white font-display">
                  Jogadores na Sala #{session.room_code} — Vincular Sobreviventes
                </h2>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Selecione qual jogador da sala está escolhendo agora e clique em qualquer personagem do catálogo abaixo.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setWizardStep('STEP_1_ROOM_GATE');
                    setGateMode('PLAYER_JOIN');
                  }}
                  className="px-3.5 py-2 rounded-xl bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-xs font-semibold text-zinc-200 transition-colors flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
                >
                  <PlusCircle className="w-3.5 h-3.5 text-red-500" />
                  <span>+ Entrar Outro Jogador com Senha</span>
                </button>

                <button
                  type="button"
                  disabled={session.survivors.length === 0}
                  onClick={onStartMatch}
                  className="px-6 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 disabled:opacity-40 text-white text-xs sm:text-sm font-bold transition-colors flex items-center gap-2 whitespace-nowrap cursor-pointer"
                >
                  <Play className="w-4 h-4 fill-current" />
                  <span>
                    Iniciar Partida na Mesa ({session.survivors.length} Sobreviventes)
                  </span>
                </button>
              </div>
            </div>

            {/* Joined Players Selector Buttons with Profile Avatars */}
            <div className="space-y-2">
              <span className="text-xs font-semibold text-zinc-300 block">
                Escolhendo personagem para o jogador:
              </span>
              <div className="flex flex-wrap items-center gap-2">
                {session.joined_players.map((player) => {
                  const isActivePicker =
                    activePlayerUsername.toLowerCase() ===
                    player.username.toLowerCase();
                  return (
                    <button
                      key={player.user_id}
                      type="button"
                      onClick={() => setSelectedPlayerForPick(player.username)}
                      className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                        isActivePicker
                          ? 'bg-red-600 text-white border-red-500'
                          : 'bg-zinc-950 border-zinc-800 text-zinc-300 hover:border-zinc-700'
                      }`}
                    >
                      {player.avatar_url && (
                        <img
                          src={player.avatar_url}
                          alt={player.username}
                          className="w-5 h-5 rounded-full object-cover object-top border border-white/30"
                        />
                      )}
                      <span>@{player.username}</span>
                      {player.is_host && (
                        <span className="text-[10px] opacity-80">(Host)</span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Currently Selected Survivors on Table */}
            {session.survivors.length > 0 && (
              <div className="pt-3 border-t border-zinc-800/80">
                <div className="text-xs font-semibold text-zinc-400 mb-2.5">
                  Ordem de Iniciativa Atual na Mesa ({session.survivors.length} / 6):
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2.5">
                  {session.survivors.map((surv, idx) => {
                    const char =
                      CHARACTERS_CATALOG.find((c) => c.id === surv.character_id) ||
                      CHARACTERS_CATALOG[0];
                    const ownerPlayer = session.joined_players.find(
                      (p) => p.username.toLowerCase() === surv.username.toLowerCase()
                    );
                    return (
                      <div
                        key={surv.id}
                        className="p-2.5 rounded-xl bg-zinc-950 border border-zinc-800 flex items-center justify-between gap-2"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <CharacterAvatar
                            character={char}
                            variant="circle"
                            size="sm"
                          />
                          <div className="min-w-0">
                            <div className="text-xs font-bold text-white truncate">
                              {idx + 1}. {char.name}
                            </div>
                            <div className="text-[10px] text-red-400 truncate flex items-center gap-1">
                              {ownerPlayer?.avatar_url && (
                                <img
                                  src={ownerPlayer.avatar_url}
                                  alt={surv.username}
                                  className="w-3.5 h-3.5 rounded-full object-cover inline-block"
                                />
                              )}
                              <span>@{surv.username}</span>
                            </div>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => onRemoveSurvivorFromTable(surv.id)}
                          className="p-1 text-zinc-500 hover:text-red-400 transition-colors shrink-0"
                          title="Remover da mesa"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Complete Multi-Edition Character Browser */}
          <div className="p-6 rounded-2xl bg-[#0A0A0C]/95 border border-zinc-800 space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h3 className="text-xl font-bold text-white font-display">
                  Catálogo Completo de Sobreviventes ({filteredCharacters.length} exibidos)
                </h3>
                <p className="text-xs text-zinc-400">
                  Inclui Zombicide 2ª Edição, Clássico S1, Prison Outbreak, Toxic City Mall, Rue Morgue, Angry Neighbors, Black Plague, Wulfsburg, Green Horde, Invader, Dark Side e Undead or Alive.
                </p>
              </div>

              {/* Search Input */}
              <div className="relative w-full md:w-80">
                <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={charSearch}
                  onChange={(e) => setCharSearch(e.target.value)}
                  placeholder="Buscar sobrevivente ou habilidade..."
                  className="w-full pl-10 pr-4 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs sm:text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-red-500"
                />
              </div>
            </div>

            {/* Edition Filter Tabs */}
            <div className="flex items-center gap-1.5 p-1.5 bg-black border border-zinc-800 rounded-xl overflow-x-auto">
              {(Object.keys(EDITION_LABELS) as (ZombicideEdition | 'ALL')[]).map(
                (edKey) => (
                  <button
                    key={edKey}
                    type="button"
                    onClick={() => setEditionFilter(edKey)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                      editionFilter === edKey
                        ? 'bg-red-600 text-white font-bold'
                        : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    {EDITION_LABELS[edKey]}
                  </button>
                )
              )}
            </div>

            {/* Character Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {filteredCharacters.map((char) => {
                const isAlreadyInRoom = assignedCharacterIds.has(char.id);
                const startItem = ITEMS_DATABASE.find(
                  (i) => i.id === char.startingEquipmentId
                );

                return (
                  <div
                    key={char.id}
                    className={`p-4 rounded-xl border transition-all flex gap-4 ${
                      isAlreadyInRoom
                        ? 'bg-red-950/20 border-red-600/60'
                        : 'bg-zinc-950 border-zinc-800 hover:border-zinc-700'
                    }`}
                  >
                    <CharacterAvatar
                      character={char}
                      variant="portrait"
                      size="md"
                      className="shrink-0"
                    />

                    <div className="flex-1 min-w-0 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between gap-1 text-[11px] text-zinc-400">
                          <span className="truncate">
                            {EDITION_LABELS[char.edition as ZombicideEdition] ||
                              char.edition}
                          </span>
                          {isAlreadyInRoom && (
                            <span className="text-red-500 font-bold shrink-0">
                              · Na Mesa
                            </span>
                          )}
                        </div>

                        <h4 className="text-lg font-bold text-white font-display leading-snug">
                          {char.name}
                        </h4>
                        <div className="text-xs text-zinc-400">{char.title}</div>

                        {startItem && (
                          <div className="text-[11px] text-red-400 mt-1">
                            Equip. Inicial: {startItem.name}
                          </div>
                        )}

                        <div className="mt-2.5 space-y-1 text-[11px]">
                          <div className="text-sky-300">
                            <span className="font-semibold">Azul:</span>{' '}
                            {char.skills.blue.name}
                          </div>
                          <div className="text-yellow-300">
                            <span className="font-semibold">Amarelo:</span>{' '}
                            {char.skills.yellow.name}
                          </div>
                          <div className="text-orange-300">
                            <span className="font-semibold">Laranja:</span>{' '}
                            {char.skills.orange.map((s) => s.name).join(' / ')}
                          </div>
                          <div className="text-rose-300">
                            <span className="font-semibold">Vermelho:</span>{' '}
                            {char.skills.red.map((s) => s.name).join(' / ')}
                          </div>
                        </div>
                      </div>

                      <div className="mt-3 pt-2.5 border-t border-zinc-800/80 flex items-center justify-between gap-2">
                        <span className="text-[11px] text-zinc-400 truncate">
                          Para: <strong className="text-zinc-200">@{activePlayerUsername}</strong>
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            onAddSurvivorToTable(activePlayerUsername, char.id)
                          }
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors whitespace-nowrap cursor-pointer ${
                            isAlreadyInRoom
                              ? 'bg-zinc-900 text-red-400 border border-red-800/50 hover:bg-zinc-800'
                              : 'bg-red-600 hover:bg-red-500 text-white'
                          }`}
                        >
                          {isAlreadyInRoom
                            ? 'Reatribuir'
                            : `+ Escolher ${char.name}`}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
