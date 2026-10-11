import React, { useState } from 'react';
import {
  MatchHistoryRecord,
  MatchHistoryStatus,
  GameSession,
} from '../types/game';
import { CHARACTERS_CATALOG } from '../data/zombicideCatalog';
import { CharacterAvatar } from './CharacterAvatar';
import {
  History,
  Lock,
  PauseCircle,
  Trophy,
  StopCircle,
  Play,
  Trash2,
  Camera,
  MapPin,
  Grid,
  Crown,
  AlertCircle,
  CheckCircle2,
  Eye,
  EyeOff,
  X,
  Sparkles,
  Users,
} from 'lucide-react';

interface MatchHistoryPanelProps {
  matchHistory: MatchHistoryRecord[];
  activeSession: GameSession | null;
  onLoadMatchWithPassword: (
    matchId: string,
    roomCode: string,
    passwordPlain: string
  ) => Promise<{ success: boolean; message: string }>;
  onDeleteMatchRecord?: (matchId: string) => Promise<void>;
  compact?: boolean;
}

const STATUS_BADGE_CONFIG: Record<
  MatchHistoryStatus,
  {
    label: string;
    badgeClass: string;
    icon: React.ReactNode;
  }
> = {
  PAUSADO: {
    label: 'PAUSADO',
    badgeClass: 'bg-amber-500/20 border-amber-500/60 text-amber-300',
    icon: <PauseCircle className="w-3.5 h-3.5 text-amber-400" />,
  },
  CONCLUIDO: {
    label: 'CONCLUÍDO',
    badgeClass: 'bg-emerald-500/20 border-emerald-500/60 text-emerald-300',
    icon: <Trophy className="w-3.5 h-3.5 text-emerald-400" />,
  },
  ENCERRADO: {
    label: 'ENCERRADO',
    badgeClass: 'bg-red-500/20 border-red-500/60 text-red-300',
    icon: <StopCircle className="w-3.5 h-3.5 text-red-400" />,
  },
};

export const MatchHistoryPanel: React.FC<MatchHistoryPanelProps> = ({
  matchHistory,
  activeSession,
  onLoadMatchWithPassword,
  onDeleteMatchRecord,
  compact = false,
}) => {
  const [statusFilter, setStatusFilter] = useState<'ALL' | MatchHistoryStatus>('ALL');
  const [selectedMatchForPassword, setSelectedMatchForPassword] =
    useState<MatchHistoryRecord | null>(null);
  const [roomPasswordInput, setRoomPasswordInput] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [isLoadingMatch, setIsLoadingMatch] = useState(false);
  const [previewPhotoUrl, setPreviewPhotoUrl] = useState<string | null>(null);

  const filteredMatches = matchHistory.filter((m) =>
    statusFilter === 'ALL' ? true : m.history_status === statusFilter
  );

  const handleOpenPasswordPrompt = (record: MatchHistoryRecord) => {
    setSelectedMatchForPassword(record);
    setRoomPasswordInput('');
    setAuthError(null);
    setShowPassword(false);
  };

  const handleSubmitLoadMatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMatchForPassword) return;
    if (!roomPasswordInput.trim()) {
      setAuthError('Digite a senha da sala definida pelo Host para carregar a partida.');
      return;
    }

    setIsLoadingMatch(true);
    setAuthError(null);
    try {
      const res = await onLoadMatchWithPassword(
        selectedMatchForPassword.id,
        selectedMatchForPassword.room_code,
        roomPasswordInput.trim()
      );
      if (res.success) {
        setSelectedMatchForPassword(null);
        setRoomPasswordInput('');
      } else {
        setAuthError(res.message);
      }
    } finally {
      setIsLoadingMatch(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="p-5 sm:p-6 rounded-2xl bg-[#0A0A0C]/95 border border-zinc-800 space-y-5">
        {/* Header & Status Filter */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-800 pb-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs text-red-500 font-mono-tabular uppercase tracking-wider font-bold">
              <History className="w-4 h-4" />
              <span>BANCO DE DADOS · HISTÓRICO DE PARTIDAS SALVAS</span>
            </div>
            <h2 className="text-lg sm:text-2xl font-bold text-white font-display">
              Histórico de Salas (Pausado, Concluído ou Encerrado)
            </h2>
            <p className="text-xs text-zinc-400">
              Para carregar uma partida salva, o <strong>Host</strong> seleciona a sala abaixo, digita a <strong>senha da sala</strong> e restaura todas as fichas e a foto do tabuleiro.
            </p>
          </div>

          {/* Filter Pills */}
          <div className="flex flex-wrap items-center gap-1.5 bg-black p-1.5 rounded-xl border border-zinc-800 self-start">
            {(
              [
                { key: 'ALL', label: `Todas (${matchHistory.length})` },
                {
                  key: 'PAUSADO',
                  label: `Pausadas (${
                    matchHistory.filter((m) => m.history_status === 'PAUSADO').length
                  })`,
                },
                {
                  key: 'CONCLUIDO',
                  label: `Concluídas (${
                    matchHistory.filter((m) => m.history_status === 'CONCLUIDO').length
                  })`,
                },
                {
                  key: 'ENCERRADO',
                  label: `Encerradas (${
                    matchHistory.filter((m) => m.history_status === 'ENCERRADO').length
                  })`,
                },
              ] as const
            ).map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setStatusFilter(tab.key)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                  statusFilter === tab.key
                    ? 'bg-red-600 text-white'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* List of Saved Matches */}
        {filteredMatches.length === 0 ? (
          <div className="py-10 text-center space-y-2">
            <History className="w-9 h-9 text-zinc-600 mx-auto" />
            <p className="text-sm font-bold text-zinc-300">
              Nenhuma partida registrada neste filtro ainda
            </p>
            <p className="text-xs text-zinc-500 max-w-md mx-auto">
              Durante a partida, o Host pode clicar em <strong>&ldquo;Salvar Partida&rdquo;</strong> ou <strong>&ldquo;Encerrar Partida&rdquo;</strong> no Dashboard da Mesa para registrar a sala no banco de dados.
            </p>
          </div>
        ) : (
          <div
            className={`grid grid-cols-1 ${
              compact ? 'gap-3' : 'md:grid-cols-2 gap-4'
            }`}
          >
            {filteredMatches.map((record) => {
              const badge =
                STATUS_BADGE_CONFIG[record.history_status] ||
                STATUS_BADGE_CONFIG.PAUSADO;
              const isCurrentlyLoaded =
                activeSession &&
                activeSession.room_code.toUpperCase() ===
                  record.room_code.toUpperCase() &&
                activeSession.id === record.id;
              const boardPhoto =
                record.session_snapshot?.board_save?.photo_data_url;

              return (
                <div
                  key={record.id}
                  className={`p-4 rounded-2xl border transition-all flex flex-col justify-between gap-4 ${
                    isCurrentlyLoaded
                      ? 'bg-zinc-900/90 border-red-500/80'
                      : 'bg-zinc-950/90 border-zinc-800 hover:border-zinc-700'
                  }`}
                >
                  <div className="space-y-3">
                    {/* Top Row: Room Code + Status Badge */}
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded bg-red-950/90 border border-red-700/60 font-mono-tabular text-xs font-bold text-red-400">
                            SALA #{record.room_code}
                          </span>
                          <span className="text-xs font-mono-tabular text-zinc-400">
                            Rodada {record.round}
                          </span>
                        </div>
                        <h3 className="text-base font-bold text-white font-display mt-1">
                          {record.room_name}
                        </h3>
                        <div className="flex flex-wrap items-center gap-2 text-[11px] text-zinc-400 mt-0.5">
                          <span className="flex items-center gap-1 text-amber-300 font-semibold">
                            <Crown className="w-3 h-3 text-amber-400" />
                            Host: @{record.host_username}
                          </span>
                          <span>·</span>
                          <span>Salvo em: {record.saved_at}</span>
                        </div>
                        {record.participants && record.participants.length > 0 && (
                          <div className="flex flex-wrap items-center gap-1 text-[10px] text-zinc-400 mt-1">
                            <Users className="w-3 h-3 text-red-400 shrink-0" />
                            <span>Players no Histórico:</span>
                            {record.participants.map((user) => (
                              <span
                                key={user}
                                className="px-1.5 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-200 font-mono-tabular"
                              >
                                @{user}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      <span
                        className={`px-2.5 py-1 rounded-lg border text-[11px] font-mono-tabular font-bold flex items-center gap-1.5 shrink-0 ${badge.badgeClass}`}
                      >
                        {badge.icon}
                        <span>{badge.label}</span>
                      </span>
                    </div>

                    {/* AI Summary Box for Concluded Matches */}
                    {(record.ai_summary || record.session_snapshot?.ai_summary) && (
                      <div className="p-3 rounded-xl bg-emerald-950/25 border border-emerald-500/40 space-y-1">
                        <div className="flex items-center gap-1.5 text-[11px] font-bold text-emerald-300 uppercase tracking-wider">
                          <Sparkles className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                          <span>Resumo da Partida (IA · Estado Final dos Personagens)</span>
                        </div>
                        <p className="text-xs text-zinc-200 leading-relaxed">
                          {record.ai_summary || record.session_snapshot?.ai_summary}
                        </p>
                      </div>
                    )}

                    {/* Survivors Summary Strip */}
                    {record.survivor_Summary && record.survivor_Summary.length > 0 && (
                      <div className="flex flex-wrap items-center gap-1.5 pt-1">
                        {record.survivor_Summary.map((surv) => {
                          const char =
                            CHARACTERS_CATALOG.find(
                              (c) => c.id === surv.character_id
                            ) || CHARACTERS_CATALOG[0];
                          return (
                            <div
                              key={surv.id}
                              className="px-2 py-1 rounded-lg bg-black border border-zinc-800 flex items-center gap-1.5"
                            >
                              <CharacterAvatar character={char} size="sm" />
                              <div className="text-[10px] leading-tight">
                                <div className="font-bold text-white">{char.name}</div>
                                <div className="text-zinc-400 font-mono-tabular">
                                  {surv.xp} XP · ❤️ {surv.max_health - surv.health}/{surv.max_health}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Board Save Metadata Badges */}
                    <div className="flex flex-wrap items-center gap-2 text-[11px]">
                      {record.has_board_photo && boardPhoto ? (
                        <button
                          type="button"
                          onClick={() => setPreviewPhotoUrl(boardPhoto)}
                          className="px-2.5 py-1 rounded-lg bg-sky-950/60 hover:bg-sky-900/70 border border-sky-500/40 text-sky-300 font-semibold flex items-center gap-1.5 cursor-pointer"
                        >
                          <Camera className="w-3.5 h-3.5" />
                          <span>Ver Foto Salva do Tabuleiro</span>
                        </button>
                      ) : (
                        <span className="px-2 py-0.5 rounded bg-zinc-900 text-zinc-500">
                          Sem foto de tabuleiro
                        </span>
                      )}

                      {record.pins_count > 0 && (
                        <span className="px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-300 flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-red-400" />
                          <span>{record.pins_count} pins</span>
                        </span>
                      )}

                      {record.session_snapshot?.board_save?.use_zone_tracker &&
                        record.zones_count > 0 && (
                          <span className="px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-amber-300 flex items-center gap-1">
                            <Grid className="w-3 h-3" />
                            <span>{record.zones_count} zonas (Opção 2)</span>
                          </span>
                        )}
                    </div>
                  </div>

                  {/* Action Footer: Enter Room & Load Match with Password */}
                  <div className="pt-3 border-t border-zinc-800/80 flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => handleOpenPasswordPrompt(record)}
                      className="flex-1 py-2.5 px-4 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-md"
                    >
                      <Lock className="w-3.5 h-3.5" />
                      <span>
                        Entrar na Sala #{record.room_code} e Carregar Save (Senha)
                      </span>
                    </button>

                    {onDeleteMatchRecord && (
                      <button
                        type="button"
                        onClick={() => onDeleteMatchRecord(record.id)}
                        title="Remover registro do histórico"
                        className="p-2.5 rounded-xl bg-zinc-900 hover:bg-red-950/60 border border-zinc-800 hover:border-red-700/50 text-zinc-400 hover:text-red-300 transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Password Verification Modal to Load Saved Match */}
      {selectedMatchForPassword && (
        <div
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn"
          onClick={() => setSelectedMatchForPassword(null)}
        >
          <div
            className="w-full max-w-md rounded-2xl bg-[#0A0A0C] border border-red-600/80 p-6 space-y-5 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-red-600/20 border border-red-500/40 flex items-center justify-center shrink-0">
                  <Lock className="w-5 h-5 text-red-500" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-white font-display">
                    Carregar Partida Salva · Sala #{selectedMatchForPassword.room_code}
                  </h3>
                  <p className="text-xs text-zinc-400">
                    Host: @{selectedMatchForPassword.host_username} · Estado:{' '}
                    {selectedMatchForPassword.history_status}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedMatchForPassword(null)}
                className="p-1 text-zinc-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitLoadMatch} className="space-y-4">
              <div className="p-3.5 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-zinc-300 space-y-1">
                <div className="font-bold text-white">
                  {selectedMatchForPassword.room_name} (Rodada{' '}
                  {selectedMatchForPassword.round})
                </div>
                <p className="text-zinc-400">
                  Digite a <strong>senha da sala</strong> cadastrada pelo Host{' '}
                  <strong>@{selectedMatchForPassword.host_username}</strong> para autenticar e restaurar a partida completa.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-red-400 mb-1.5">
                  Senha da Sala #{selectedMatchForPassword.room_code}
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={roomPasswordInput}
                    onChange={(e) => setRoomPasswordInput(e.target.value)}
                    placeholder="Digite a senha da sala para carregar"
                    autoFocus
                    className="w-full pl-10 pr-11 py-2.5 bg-black border border-red-600/60 rounded-xl text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-red-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((p) => !p)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white cursor-pointer"
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              {authError && (
                <div className="p-3 rounded-xl bg-red-950/70 border border-red-500/50 text-xs text-red-200 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                  <span>{authError}</span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3 pt-1">
                <button
                  type="submit"
                  disabled={isLoadingMatch}
                  className="py-3 px-4 rounded-xl bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-lg"
                >
                  <Play className="w-4 h-4 fill-current" />
                  <span>{isLoadingMatch ? 'Carregando...' : 'Carregar Partida'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedMatchForPassword(null)}
                  className="py-3 px-4 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 font-semibold text-xs sm:text-sm transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Saved Board Photo Lightbox Preview */}
      {previewPhotoUrl && (
        <div
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4"
          onClick={() => setPreviewPhotoUrl(null)}
        >
          <div
            className="max-w-4xl w-full bg-[#0A0A0C] border border-zinc-700 rounded-2xl p-4 space-y-3"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-red-400 flex items-center gap-1.5">
                <Camera className="w-4 h-4" />
                <span>Imagem Salva do Tabuleiro</span>
              </span>
              <button
                type="button"
                onClick={() => setPreviewPhotoUrl(null)}
                className="px-3 py-1 rounded-lg bg-zinc-900 text-xs font-bold text-zinc-300 hover:text-white cursor-pointer"
              >
                Fechar
              </button>
            </div>
            <img
              src={previewPhotoUrl}
              alt="Tabuleiro Salvo"
              className="w-full max-h-[75vh] object-contain rounded-xl bg-black"
            />
          </div>
        </div>
      )}
    </div>
  );
};
