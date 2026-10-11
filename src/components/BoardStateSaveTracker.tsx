import React, { useState, useRef } from 'react';
import {
  GameSession,
  BoardSaveState,
  BoardPhotoPin,
  BoardZoneEntry,
  BoardMarkerType,
  UserProfile,
  MatchHistoryStatus,
} from '../types/game';
import { CHARACTERS_CATALOG } from '../data/zombicideCatalog';
import { CharacterAvatar } from './CharacterAvatar';
import { soundFX } from '../utils/sound';
import {
  Camera,
  MapPin,
  Plus,
  Trash2,
  Download,
  Upload,
  CheckCircle2,
  Grid,
  Image as ImageIcon,
  Sparkles,
  Minus,
  Save,
  PauseCircle,
  Trophy,
  StopCircle,
  Eye,
  EyeOff,
  Lock,
} from 'lucide-react';

interface BoardStateSaveTrackerProps {
  session: GameSession | null;
  currentUser: UserProfile | null;
  isCurrentUserHost: boolean;
  onUpdateBoardSave: (newSave: BoardSaveState, logMessage?: string) => void;
  onSaveMatchToHistory: (
    status: MatchHistoryStatus,
    customLog?: string,
    aiSummary?: string
  ) => Promise<void>;
  onImportFullSession: (importedSession: GameSession) => void;
  onBackToDashboard?: () => void;
}

const MARKER_CONFIG: Record<
  BoardMarkerType,
  {
    label: string;
    short: string;
    badgeBg: string;
    border: string;
    text: string;
  }
> = {
  SURVIVOR: {
    label: 'Sobrevivente',
    short: 'SOB',
    badgeBg: 'bg-sky-600',
    border: 'border-sky-300',
    text: 'text-white',
  },
  WALKER: {
    label: 'Lerdos (Walkers)',
    short: 'LER',
    badgeBg: 'bg-zinc-800',
    border: 'border-zinc-400',
    text: 'text-zinc-100',
  },
  RUNNER: {
    label: 'Corredores (Runners)',
    short: 'COR',
    badgeBg: 'bg-amber-600',
    border: 'border-amber-300',
    text: 'text-white',
  },
  FATTY: {
    label: 'Balofos (Fatties)',
    short: 'BAL',
    badgeBg: 'bg-orange-700',
    border: 'border-orange-300',
    text: 'text-white',
  },
  ABOMINATION: {
    label: 'Abominação',
    short: 'ABO',
    badgeBg: 'bg-red-700',
    border: 'border-red-300',
    text: 'text-white',
  },
  SPAWN: {
    label: 'Ponto de Spawn',
    short: 'SPW',
    badgeBg: 'bg-rose-900',
    border: 'border-rose-400',
    text: 'text-rose-100',
  },
  OBJECTIVE: {
    label: 'Objetivo (Ficha)',
    short: 'OBJ',
    badgeBg: 'bg-emerald-600',
    border: 'border-emerald-300',
    text: 'text-white',
  },
  NOISE: {
    label: 'Ficha de Barulho',
    short: 'BAR',
    badgeBg: 'bg-yellow-500',
    border: 'border-yellow-200',
    text: 'text-black',
  },
  DOOR_OPEN: {
    label: 'Porta Aberta',
    short: 'P.AB',
    badgeBg: 'bg-teal-700',
    border: 'border-teal-300',
    text: 'text-white',
  },
  DOOR_CLOSED: {
    label: 'Porta Fechada',
    short: 'P.FE',
    badgeBg: 'bg-purple-800',
    border: 'border-purple-300',
    text: 'text-white',
  },
};

function createDefaultBoardSave(session: GameSession | null, username: string): BoardSaveState {
  if (session?.board_save) {
    return {
      ...session.board_save,
      show_grid_3x3: session.board_save.show_grid_3x3 ?? false,
      use_zone_tracker: session.board_save.use_zone_tracker ?? false,
    };
  }
  return {
    updated_at: new Date().toLocaleString('pt-BR'),
    updated_by: username || session?.host_username || 'Host',
    round_saved: session?.round || 1,
    photo_data_url: undefined,
    show_grid_3x3: false, // Clean board image without 3x3 grid by default!
    use_zone_tracker: false, // Option 2 is optional — only enabled if desired!
    general_notes: '',
    pins: [],
    zones: [
      {
        id: 'zone_1',
        zoneName: 'Zona 1 - Ponto de Partida',
        survivorIds: session ? session.survivors.map((s) => s.id) : [],
        walkers: 0,
        runners: 0,
        fatties: 0,
        abominations: 0,
        noiseTokens: 0,
        hasSpawn: false,
        hasObjective: false,
        doorStatus: 'NONE',
        notes: 'Início dos sobreviventes',
      },
    ],
  };
}

// Helper to compress photo on client so it syncs fast over Express & Database
async function compressBoardPhoto(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = new Image();
      img.onload = () => {
        const maxDim = 1280;
        let width = img.width;
        let height = img.height;
        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(ev.target?.result as string);
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.78);
        resolve(compressedDataUrl);
      };
      img.onerror = reject;
      img.src = ev.target?.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export const BoardStateSaveTracker: React.FC<BoardStateSaveTrackerProps> = ({
  session,
  currentUser,
  isCurrentUserHost,
  onUpdateBoardSave,
  onSaveMatchToHistory,
  onImportFullSession,
  onBackToDashboard,
}) => {
  const activeUsername = currentUser?.username || session?.host_username || 'Host';
  const boardSave = createDefaultBoardSave(session, activeUsername);

  const [selectedTool, setSelectedTool] = useState<BoardMarkerType>('SURVIVOR');
  const [selectedSurvivorId, setSelectedSurvivorId] = useState<string>(
    session?.survivors[0]?.id || ''
  );
  const [selectedCount, setSelectedCount] = useState<number>(1);
  const [activePinId, setActivePinId] = useState<string | null>(null);
  const [newZoneName, setNewZoneName] = useState('');
  const [saveFeedback, setSaveFeedback] = useState<string | null>(null);

  const photoContainerRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const importJsonRef = useRef<HTMLInputElement | null>(null);

  if (!session) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-12 text-center">
        <div className="p-6 sm:p-8 rounded-2xl bg-[#0A0A0C]/95 border border-zinc-800 space-y-4">
          <Camera className="w-10 h-10 text-red-500 mx-auto" />
          <h2 className="text-xl sm:text-2xl font-bold text-white font-display">
            Crie ou Carregue uma Sala Primeiro
          </h2>
          <p className="text-xs sm:text-sm text-zinc-300 max-w-lg mx-auto">
            Para salvar a foto do tabuleiro (Opção 1) e, se desejar, o mapa de zonas (Opção 2), inicie uma sala como Host ou carregue uma partida salva no Histórico de Partidas.
          </p>
        </div>
      </div>
    );
  }

  const commitSave = (next: Partial<BoardSaveState>, logMsg?: string) => {
    const merged: BoardSaveState = {
      ...boardSave,
      ...next,
      updated_at: new Date().toLocaleString('pt-BR'),
      updated_by: activeUsername,
      round_saved: session.round,
    };
    onUpdateBoardSave(merged, logMsg);
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const compressed = await compressBoardPhoto(file);
      soundFX.playLevelUp();
      commitSave(
        { photo_data_url: compressed },
        `📸 @${activeUsername} atualizou a imagem do tabuleiro no Save Point (Rodada ${session.round}).`
      );
      setSaveFeedback('Imagem limpa do tabuleiro anexada e sincronizada com a sala!');
      setTimeout(() => setSaveFeedback(null), 3500);
    } catch {
      // ignore
    }
  };

  const handleClickBoardCanvas = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isCurrentUserHost) return;
    if (!photoContainerRef.current) return;
    const rect = photoContainerRef.current.getBoundingClientRect();
    const xPercent = Math.max(
      2,
      Math.min(98, Number((((e.clientX - rect.left) / rect.width) * 100).toFixed(1)))
    );
    const yPercent = Math.max(
      2,
      Math.min(98, Number((((e.clientY - rect.top) / rect.height) * 100).toFixed(1)))
    );

    soundFX.playClick();

    if (selectedTool === 'SURVIVOR') {
      const targetSurv =
        session.survivors.find((s) => s.id === selectedSurvivorId) ||
        session.survivors[0];
      if (!targetSurv) return;
      const char = CHARACTERS_CATALOG.find((c) => c.id === targetSurv.character_id);
      const label = char?.name || targetSurv.username;

      const filteredPins = boardSave.pins.filter(
        (p) => !(p.type === 'SURVIVOR' && p.survivorId === targetSurv.id)
      );

      const newPin: BoardPhotoPin = {
        id: `pin_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        xPercent,
        yPercent,
        type: 'SURVIVOR',
        survivorId: targetSurv.id,
        label,
        count: 1,
      };

      commitSave({ pins: [...filteredPins, newPin] });
      setActivePinId(newPin.id);
      return;
    }

    const cfg = MARKER_CONFIG[selectedTool];
    const newPin: BoardPhotoPin = {
      id: `pin_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      xPercent,
      yPercent,
      type: selectedTool,
      label: cfg.label,
      count: selectedCount,
    };

    commitSave({ pins: [...boardSave.pins, newPin] });
    setActivePinId(newPin.id);
  };

  const handleAdjustPinCount = (pinId: string, delta: number) => {
    if (!isCurrentUserHost) return;
    soundFX.playClick();
    const nextPins = boardSave.pins
      .map((p) => {
        if (p.id !== pinId) return p;
        const nextCount = p.count + delta;
        return nextCount > 0 ? { ...p, count: nextCount } : null;
      })
      .filter(Boolean) as BoardPhotoPin[];

    commitSave({ pins: nextPins });
  };

  const handleDeletePin = (pinId: string) => {
    if (!isCurrentUserHost) return;
    soundFX.playClick();
    commitSave({ pins: boardSave.pins.filter((p) => p.id !== pinId) });
    if (activePinId === pinId) setActivePinId(null);
  };

  // Option 2: Optional Zone Grid Matrix Handlers
  const handleAddZone = (presetName?: string) => {
    if (!isCurrentUserHost) return;
    const title = (presetName || newZoneName).trim();
    if (!title) return;
    soundFX.playClick();
    const newZone: BoardZoneEntry = {
      id: `zone_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      zoneName: title,
      survivorIds: [],
      walkers: 0,
      runners: 0,
      fatties: 0,
      abominations: 0,
      noiseTokens: 0,
      hasSpawn: false,
      hasObjective: false,
      doorStatus: 'NONE',
      notes: '',
    };
    commitSave({ zones: [...boardSave.zones, newZone], use_zone_tracker: true });
    if (!presetName) setNewZoneName('');
  };

  const handleGenerate3x3GridPresets = () => {
    if (!isCurrentUserHost) return;
    soundFX.playLevelUp();
    const coords = ['A1', 'A2', 'A3', 'B1', 'B2', 'B3', 'C1', 'C2', 'C3'];
    const existingNames = new Set(boardSave.zones.map((z) => z.zoneName));
    const created: BoardZoneEntry[] = [];
    coords.forEach((coord) => {
      const label = `Tile ${coord}`;
      if (!existingNames.has(label)) {
        created.push({
          id: `zone_${coord}_${Date.now()}`,
          zoneName: label,
          survivorIds: [],
          walkers: 0,
          runners: 0,
          fatties: 0,
          abominations: 0,
          noiseTokens: 0,
          hasSpawn: false,
          hasObjective: false,
          doorStatus: 'NONE',
          notes: '',
        });
      }
    });
    commitSave(
      { zones: [...boardSave.zones, ...created], use_zone_tracker: true },
      `🗺️ @${activeUsername} ativou e gerou os Tiles na Opção 2 do Save Point.`
    );
  };

  const handleUpdateZone = (zoneId: string, patch: Partial<BoardZoneEntry>) => {
    if (!isCurrentUserHost) return;
    soundFX.playClick();
    const nextZones = boardSave.zones.map((z) =>
      z.id === zoneId ? { ...z, ...patch } : z
    );
    commitSave({ zones: nextZones });
  };

  const handleToggleSurvivorInZone = (zoneId: string, survivorId: string) => {
    if (!isCurrentUserHost) return;
    soundFX.playClick();
    const nextZones = boardSave.zones.map((z) => {
      if (z.id !== zoneId) {
        return {
          ...z,
          survivorIds: z.survivorIds.filter((id) => id !== survivorId),
        };
      }
      const exists = z.survivorIds.includes(survivorId);
      return {
        ...z,
        survivorIds: exists
          ? z.survivorIds.filter((id) => id !== survivorId)
          : [...z.survivorIds, survivorId],
      };
    });
    commitSave({ zones: nextZones });
  };

  const handleDeleteZone = (zoneId: string) => {
    if (!isCurrentUserHost) return;
    soundFX.playClick();
    commitSave({ zones: boardSave.zones.filter((z) => z.id !== zoneId) });
  };

  const handleExportSaveFile = () => {
    soundFX.playLevelUp();
    const payload = JSON.stringify(session, null, 2);
    const blob = new Blob([payload], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `zombiapp-save-${session.room_code.toLowerCase()}-rodada-${session.round}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportSaveFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const parsed = JSON.parse(String(ev.target?.result));
        if (parsed && parsed.room_code && Array.isArray(parsed.survivors)) {
          onImportFullSession(parsed);
          soundFX.playLevelUp();
          setSaveFeedback('Save Point completo (Fichas + Tabuleiro) restaurado com sucesso!');
          setTimeout(() => setSaveFeedback(null), 4000);
        }
      } catch {
        // ignore invalid file
      }
    };
    reader.readAsText(file);
  };

  const handleTriggerDatabaseSave = async (status: MatchHistoryStatus) => {
    if (!isCurrentUserHost) return;
    let generatedSummary: string | undefined;
    if (status === 'CONCLUIDO') {
      try {
        const enrichedSurvivors = session.survivors.map((s) => {
          const char = CHARACTERS_CATALOG.find((c) => c.id === s.character_id);
          return {
            ...s,
            character_name: char?.name || s.character_id,
          };
        });
        const res = await fetch('/api/matches/generate-summary', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            session: {
              ...session,
              survivors: enrichedSurvivors,
            },
          }),
        });
        const data = await res.json();
        if (res.ok && data?.summary) {
          generatedSummary = data.summary;
        }
      } catch {
        // fallback handled by server
      }
    }
    await onSaveMatchToHistory(status, undefined, generatedSummary);
    const label =
      status === 'PAUSADO'
        ? 'PAUSADO (Para continuar depois com a senha da sala)'
        : status === 'CONCLUIDO'
        ? 'CONCLUÍDO (Vitória na Missão com Resumo IA)'
        : 'ENCERRADO';
    setSaveFeedback(
      `Partida salva no Banco de Dados e adicionada ao Histórico de Partidas como ${label}!`
    );
    setTimeout(() => setSaveFeedback(null), 5000);
  };

  const show3x3Grid = Boolean(boardSave.show_grid_3x3);
  const useZoneTracker = Boolean(boardSave.use_zone_tracker);

  return (
    <div className="max-w-7xl mx-auto px-3.5 sm:px-6 py-5 sm:py-8 space-y-6">
      {/* Top Header Banner with Host Save / End Match Controls */}
      <div className="p-5 sm:p-6 rounded-2xl bg-[#0A0A0C]/95 border border-zinc-800 space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md bg-red-950/70 border border-red-800/60 text-red-400 text-[11px] font-mono-tabular uppercase tracking-wider font-bold">
                <Save className="w-3.5 h-3.5" />
                <span>Save Point do Host · Sala #{session.room_code} · Rodada {session.round}</span>
              </div>
              {onBackToDashboard && (
                <button
                  type="button"
                  onClick={onBackToDashboard}
                  className="px-3 py-1 rounded-md bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-200 text-[11px] font-bold transition-colors cursor-pointer"
                >
                  ← Voltar para o Dashboard do Host
                </button>
              )}
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white font-display">
              Salvar ou Encerrar Partida no Banco de Dados
            </h1>
            <p className="text-xs sm:text-sm text-zinc-300 max-w-3xl leading-relaxed">
              Você pode salvar <strong>somente a imagem limpa do tabuleiro (sem marcação 3x3)</strong> com ou sem pins, e ativar a <strong>Opção 2 (Zonas/Tiles) apenas se quiser</strong>. Ao salvar ou encerrar, a sala fica registrada no <strong>Histórico de Partidas</strong> do banco de dados.
            </p>
          </div>

          {!isCurrentUserHost && (
            <div className="px-4 py-3 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-zinc-400 flex items-center gap-2 shrink-0">
              <Lock className="w-4 h-4 text-amber-400 shrink-0" />
              <span>Somente o Host (@{session.host_username}) pode salvar ou encerrar a partida.</span>
            </div>
          )}
        </div>

        {/* Host Action Buttons: Salvar (Pausado) | Concluir | Encerrar */}
        {isCurrentUserHost && (
          <div className="pt-4 border-t border-zinc-800/90 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2.5">
              <button
                type="button"
                onClick={() => handleTriggerDatabaseSave('PAUSADO')}
                className="px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs sm:text-sm flex items-center gap-2 transition-colors cursor-pointer shadow-lg shadow-amber-950/40"
              >
                <PauseCircle className="w-4 h-4" />
                <span>Salvar e Voltar ao Login (PAUSADO)</span>
              </button>

              <button
                type="button"
                onClick={() => handleTriggerDatabaseSave('CONCLUIDO')}
                className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs sm:text-sm flex items-center gap-2 transition-colors cursor-pointer shadow-lg shadow-emerald-950/40"
              >
                <Trophy className="w-4 h-4" />
                <span>Concluir e Voltar ao Login (CONCLUÍDO)</span>
              </button>

              <button
                type="button"
                onClick={() => handleTriggerDatabaseSave('ENCERRADO')}
                className="px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs sm:text-sm flex items-center gap-2 transition-colors cursor-pointer shadow-lg shadow-red-950/40"
              >
                <StopCircle className="w-4 h-4" />
                <span>Encerrar e Voltar ao Login (ENCERRADO)</span>
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleExportSaveFile}
                className="px-3 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-200 font-semibold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                title="Baixar arquivo JSON de backup"
              >
                <Download className="w-3.5 h-3.5 text-red-400" />
                <span>Backup (.JSON)</span>
              </button>

              <input
                ref={importJsonRef}
                type="file"
                accept=".json,application/json"
                className="hidden"
                onChange={handleImportSaveFile}
              />
              <button
                type="button"
                onClick={() => importJsonRef.current?.click()}
                className="px-3 py-2 rounded-xl bg-zinc-950 hover:bg-zinc-900 border border-zinc-800 text-zinc-300 font-semibold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Upload className="w-3.5 h-3.5 text-amber-400" />
                <span>Importar (.JSON)</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {saveFeedback && (
        <div className="p-4 rounded-xl bg-emerald-950/90 border border-emerald-500/60 text-emerald-200 text-xs sm:text-sm font-semibold flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{saveFeedback}</span>
          </div>
          <span className="text-[11px] font-mono-tabular text-emerald-400">
            Sala #{session.room_code} · Rodada {session.round}
          </span>
        </div>
      )}

      {/* =====================================================================
          OPÇÃO 1: IMAGEM DO TABULEIRO (SEM MARCAÇÃO 3X3 POR PADRÃO + PINS OPCIONAIS)
      ===================================================================== */}
      <section className="p-4 sm:p-6 rounded-2xl bg-[#0A0A0C]/95 border border-zinc-800 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-800 pb-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs font-mono-tabular uppercase tracking-wider text-red-400 font-bold">
              <Camera className="w-4 h-4" />
              <span>OPÇÃO 1 · IMAGEM DO TABULEIRO (SEM GRADE 3x3 OBRIGATÓRIA)</span>
            </div>
            <h2 className="text-lg sm:text-xl font-bold text-white font-display">
              Foto Real do Tabuleiro (Com ou Sem Marcação de Pins)
            </h2>
            <p className="text-xs text-zinc-400">
              Você pode salvar <strong>apenas a foto limpa do seu tabuleiro</strong> ou clicar na imagem para posicionar marcadores de onde estão os sobreviventes e zumbis.
            </p>
          </div>

          {isCurrentUserHost && (
            <div className="flex flex-wrap items-center gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={handlePhotoUpload}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs flex items-center gap-2 transition-colors cursor-pointer"
              >
                <Camera className="w-4 h-4" />
                <span>
                  {boardSave.photo_data_url
                    ? 'Trocar Imagem do Tabuleiro'
                    : 'Enviar / Tirar Foto do Tabuleiro'}
                </span>
              </button>

              {/* Toggle 3x3 Grid Overlay Optional */}
              <button
                type="button"
                onClick={() => {
                  soundFX.playClick();
                  commitSave({ show_grid_3x3: !show3x3Grid });
                }}
                className={`px-3 py-2 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                  show3x3Grid
                    ? 'bg-amber-500/20 border-amber-500/60 text-amber-300'
                    : 'bg-zinc-900 border-zinc-700 text-zinc-300 hover:text-white'
                }`}
                title="Ativar ou ocultar linhas de referência 3x3 sobre a área do tabuleiro"
              >
                {show3x3Grid ? (
                  <>
                    <EyeOff className="w-3.5 h-3.5" />
                    <span>Ocultar Grade 3x3</span>
                  </>
                ) : (
                  <>
                    <Grid className="w-3.5 h-3.5" />
                    <span>Mostrar Grade 3x3 (Opcional)</span>
                  </>
                )}
              </button>

              {boardSave.pins.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    soundFX.playClick();
                    commitSave({ pins: [] });
                    setActivePinId(null);
                  }}
                  className="px-3 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-300 text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5 text-red-400" />
                  <span>Limpar Pins</span>
                </button>
              )}
            </div>
          )}
        </div>

        {/* Optional Marker Palette Toolbar (Only for Host) */}
        {isCurrentUserHost && (
          <div className="p-3.5 rounded-xl bg-black/80 border border-zinc-800/90 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-zinc-300 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-red-500" />
                <span>Pins Interativos na Imagem (Opcional — toque na foto para marcar):</span>
              </span>

              {selectedTool !== 'SURVIVOR' && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-zinc-400">Quantidade no Pin:</span>
                  <div className="flex items-center gap-1 bg-zinc-900 border border-zinc-700 rounded-lg px-1.5 py-0.5">
                    <button
                      type="button"
                      onClick={() => setSelectedCount((c) => Math.max(1, c - 1))}
                      className="p-1 text-zinc-300 hover:text-white cursor-pointer"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="px-2 text-xs font-mono-tabular font-bold text-white">
                      x{selectedCount}
                    </span>
                    <button
                      type="button"
                      onClick={() => setSelectedCount((c) => c + 1)}
                      className="p-1 text-zinc-300 hover:text-white cursor-pointer"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="flex flex-wrap gap-1.5">
              {(Object.keys(MARKER_CONFIG) as BoardMarkerType[]).map((type) => {
                const cfg = MARKER_CONFIG[type];
                const isSelected = selectedTool === type;
                return (
                  <button
                    key={type}
                    type="button"
                    onClick={() => {
                      soundFX.playClick();
                      setSelectedTool(type);
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all flex items-center gap-1.5 cursor-pointer ${
                      isSelected
                        ? `${cfg.badgeBg} ${cfg.border} ${cfg.text} shadow-md scale-[1.02]`
                        : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:border-zinc-700'
                    }`}
                  >
                    <span className="w-2 h-2 rounded-full bg-current" />
                    <span>{cfg.label}</span>
                  </button>
                );
              })}
            </div>

            {selectedTool === 'SURVIVOR' && session.survivors.length > 0 && (
              <div className="pt-2 border-t border-zinc-800/80 flex flex-wrap items-center gap-2">
                <span className="text-xs text-sky-400 font-semibold">
                  Sobrevivente para posicionar:
                </span>
                {session.survivors.map((surv) => {
                  const char =
                    CHARACTERS_CATALOG.find((c) => c.id === surv.character_id) ||
                    CHARACTERS_CATALOG[0];
                  const isSelected =
                    (selectedSurvivorId || session.survivors[0]?.id) === surv.id;
                  const alreadyPinned = boardSave.pins.some(
                    (p) => p.type === 'SURVIVOR' && p.survivorId === surv.id
                  );
                  return (
                    <button
                      key={surv.id}
                      type="button"
                      onClick={() => setSelectedSurvivorId(surv.id)}
                      className={`px-2.5 py-1.5 rounded-lg border text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-sky-600/30 border-sky-400 text-white'
                          : 'bg-zinc-950 border-zinc-800 text-zinc-300 hover:border-zinc-700'
                      }`}
                    >
                      <CharacterAvatar character={char} size="sm" />
                      <span>{char.name}</span>
                      {alreadyPinned && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-mono-tabular">
                          No Mapa
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Board Image Canvas — Clean Photo without 3x3 Grid by default */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-start">
          <div className="lg:col-span-2 space-y-2">
            <div
              ref={photoContainerRef}
              onClick={handleClickBoardCanvas}
              className={`relative w-full aspect-[16/10] rounded-2xl overflow-hidden border-2 border-zinc-800 bg-zinc-950 select-none shadow-inner ${
                isCurrentUserHost ? 'hover:border-red-500/60 cursor-crosshair' : ''
              }`}
            >
              {boardSave.photo_data_url ? (
                <img
                  src={boardSave.photo_data_url}
                  alt="Foto do Tabuleiro Salvo"
                  className="w-full h-full object-contain bg-black pointer-events-none"
                />
              ) : (
                /* Clean Photo Dropzone without 3x3 markings unless show3x3Grid is explicitly toggled on */
                <div className="w-full h-full flex flex-col items-center justify-center bg-[#090B10] p-6 text-center pointer-events-none">
                  <ImageIcon className="w-12 h-12 text-red-500/80 mb-3" />
                  <p className="text-sm sm:text-base font-bold text-zinc-100">
                    Imagem do Tabuleiro (Sem Marcação 3x3)
                  </p>
                  <p className="text-xs text-zinc-400 mt-1 max-w-md">
                    Clique em &ldquo;Enviar / Tirar Foto do Tabuleiro&rdquo; acima para salvar somente a foto limpa da sua mesa, ou toque aqui para marcar pins se desejar.
                  </p>
                </div>
              )}

              {/* Optional 3x3 Grid Overlay ONLY if user explicitly clicked "Mostrar Grade 3x3 (Opcional)" */}
              {show3x3Grid && (
                <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 pointer-events-none z-10">
                  {['A1', 'A2', 'A3', 'B1', 'B2', 'B3', 'C1', 'C2', 'C3'].map(
                    (tile) => (
                      <div
                        key={tile}
                        className="border border-amber-400/35 flex items-start justify-start p-2"
                      >
                        <span className="px-1.5 py-0.5 rounded bg-black/70 text-[10px] font-mono-tabular font-bold text-amber-300">
                          {tile}
                        </span>
                      </div>
                    )
                  )}
                </div>
              )}

              {/* Render Interactive Pins over the Photo */}
              {boardSave.pins.map((pin) => {
                const cfg = MARKER_CONFIG[pin.type];
                const surv =
                  pin.type === 'SURVIVOR'
                    ? session.survivors.find((s) => s.id === pin.survivorId)
                    : null;
                const char = surv
                  ? CHARACTERS_CATALOG.find((c) => c.id === surv.character_id)
                  : null;
                const isSelected = activePinId === pin.id;

                return (
                  <div
                    key={pin.id}
                    style={{
                      left: `${pin.xPercent}%`,
                      top: `${pin.yPercent}%`,
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      setActivePinId(pin.id);
                    }}
                    className={`absolute -translate-x-1/2 -translate-y-1/2 z-20 transition-transform cursor-pointer ${
                      isSelected ? 'scale-125 z-30' : 'hover:scale-110'
                    }`}
                  >
                    {pin.type === 'SURVIVOR' && char ? (
                      <div className="flex flex-col items-center">
                        <div
                          className={`p-0.5 rounded-full border-2 ${
                            isSelected
                              ? 'border-amber-400 shadow-[0_0_15px_rgba(251,191,36,0.9)]'
                              : 'border-sky-400 shadow-md'
                          } bg-black`}
                        >
                          <CharacterAvatar character={char} size="sm" />
                        </div>
                        <span className="mt-0.5 px-1.5 py-0.5 rounded bg-black/90 border border-sky-500/60 text-[10px] font-bold text-white whitespace-nowrap shadow">
                          {char.name}
                        </span>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center">
                        <div
                          className={`px-2 py-1 rounded-full border-2 ${cfg.badgeBg} ${
                            isSelected ? 'border-white ring-2 ring-red-500' : cfg.border
                          } ${cfg.text} text-[11px] font-mono-tabular font-extrabold shadow-lg flex items-center gap-1 whitespace-nowrap`}
                        >
                          <span>{cfg.short}</span>
                          {pin.count > 1 && <span>x{pin.count}</span>}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="flex items-center justify-between text-[11px] text-zinc-400 px-1">
              <span>
                {boardSave.photo_data_url
                  ? '✅ Imagem do tabuleiro carregada (Modo limpo sem grade 3x3 obrigatória).'
                  : '📷 Envie uma foto do tabuleiro para salvar apenas a imagem da mesa.'}
              </span>
              <span>{boardSave.pins.length} pins marcados</span>
            </div>
          </div>

          {/* Right Column: Active Pins Inspector List */}
          <div className="p-4 rounded-xl bg-black/80 border border-zinc-800 space-y-3 max-h-[420px] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-300">
                Pins na Imagem ({boardSave.pins.length})
              </h3>
            </div>

            {boardSave.pins.length === 0 ? (
              <p className="text-xs text-zinc-500 py-8 text-center">
                Nenhum pin colocado. Você pode salvar <strong>somente a foto do tabuleiro</strong> sem nenhum pin ou clicar na imagem caso queira destacar alguma peça!
              </p>
            ) : (
              <div className="space-y-2">
                {boardSave.pins.map((pin) => {
                  const cfg = MARKER_CONFIG[pin.type];
                  const isSelected = activePinId === pin.id;
                  return (
                    <div
                      key={pin.id}
                      onClick={() => setActivePinId(pin.id)}
                      className={`p-2.5 rounded-xl border transition-colors flex items-center justify-between gap-2 cursor-pointer ${
                        isSelected
                          ? 'bg-zinc-900 border-red-500/70'
                          : 'bg-zinc-950/90 border-zinc-800/90 hover:border-zinc-700'
                      }`}
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] font-mono-tabular font-bold ${cfg.badgeBg} ${cfg.text}`}
                          >
                            {cfg.short}
                          </span>
                          <span className="text-xs font-bold text-white truncate">
                            {pin.label}
                          </span>
                        </div>
                        <div className="text-[10px] text-zinc-500 font-mono-tabular mt-0.5">
                          Posição: X {pin.xPercent}% · Y {pin.yPercent}%
                        </div>
                      </div>

                      {isCurrentUserHost && (
                        <div className="flex items-center gap-1 shrink-0">
                          {pin.type !== 'SURVIVOR' && (
                            <div className="flex items-center gap-1 bg-black border border-zinc-800 rounded-lg px-1 py-0.5">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleAdjustPinCount(pin.id, -1);
                                }}
                                className="px-1 text-xs text-zinc-400 hover:text-white cursor-pointer"
                              >
                                -
                              </button>
                              <span className="text-xs font-mono-tabular font-bold text-white px-1">
                                x{pin.count}
                              </span>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleAdjustPinCount(pin.id, 1);
                                }}
                                className="px-1 text-xs text-zinc-400 hover:text-white cursor-pointer"
                              >
                                +
                              </button>
                            </div>
                          )}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeletePin(pin.id);
                            }}
                            className="p-1.5 rounded-lg bg-red-950/50 hover:bg-red-900/70 text-red-300 border border-red-800/40 cursor-pointer"
                            title="Remover Pin"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* General Match Notes for Resuming Later */}
        <div className="pt-3 border-t border-zinc-800/80 space-y-2">
          <label className="text-xs font-bold uppercase tracking-wider text-zinc-300 block">
            Anotações Gerais do Save (Missão, objetivos pegos ou lembretes):
          </label>
          <textarea
            rows={2}
            disabled={!isCurrentUserHost}
            value={boardSave.general_notes}
            onChange={(e) => commitSave({ general_notes: e.target.value })}
            placeholder="Ex: Missão M04 - Paramos no início da Rodada 6, porta do prédio central aberta..."
            className="w-full p-3 rounded-xl bg-black border border-zinc-800 text-xs sm:text-sm text-zinc-200 focus:outline-none focus:border-red-500 disabled:opacity-60"
          />
        </div>
      </section>

      {/* =====================================================================
          OPÇÃO 2 (TOTALMENTE OPCIONAL): CONTADORES POR ZONA / TILE SE QUISER USAR
      ===================================================================== */}
      <section className="p-4 sm:p-6 rounded-2xl bg-[#0A0A0C]/95 border border-zinc-800 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs font-mono-tabular uppercase tracking-wider text-amber-400 font-bold">
              <Grid className="w-4 h-4" />
              <span>OPÇÃO 2 (OPCIONAL) · MAPA DE ZONAS / TILES POR TEXTO</span>
            </div>
            <h2 className="text-lg sm:text-xl font-bold text-white font-display">
              Contadores por Zona/Sala (Use somente se quiser complementar ou substituir a foto)
            </h2>
            <p className="text-xs text-zinc-400">
              A Opção 2 não é obrigatória junto com a imagem do tabuleiro. Ative abaixo apenas se desejar anotar os zumbis por zona em formato de fichas.
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              soundFX.playClick();
              commitSave({ use_zone_tracker: !useZoneTracker });
            }}
            className={`px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 transition-colors shrink-0 cursor-pointer ${
              useZoneTracker
                ? 'bg-zinc-900 border border-zinc-700 text-zinc-200 hover:bg-zinc-800'
                : 'bg-amber-500/20 border border-amber-500/50 text-amber-300 hover:bg-amber-500/30'
            }`}
          >
            {useZoneTracker ? (
              <>
                <EyeOff className="w-4 h-4" />
                <span>Ocultar Opção 2 (Usar Só Imagem)</span>
              </>
            ) : (
              <>
                <Eye className="w-4 h-4" />
                <span>Ativar Opção 2 (Mapa de Zonas)</span>
              </>
            )}
          </button>
        </div>

        {useZoneTracker && (
          <div className="pt-4 border-t border-zinc-800 space-y-5">
            {isCurrentUserHost && (
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  value={newZoneName}
                  onChange={(e) => setNewZoneName(e.target.value)}
                  placeholder="Ex: Corredor Central, Sala do Objetivo, Rua Norte..."
                  className="flex-1 px-3.5 py-2.5 rounded-xl bg-black border border-zinc-800 text-xs sm:text-sm text-white focus:outline-none focus:border-red-500"
                />
                <button
                  type="button"
                  onClick={() => handleAddZone()}
                  className="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 shrink-0 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Adicionar Zona</span>
                </button>
                <button
                  type="button"
                  onClick={handleGenerate3x3GridPresets}
                  className="px-4 py-2.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 text-amber-300 text-xs font-bold flex items-center justify-center gap-1.5 shrink-0 cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Gerar Zonas A1..C3 (Opcional)</span>
                </button>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {boardSave.zones.map((zone) => {
                return (
                  <div
                    key={zone.id}
                    className="p-4 rounded-2xl bg-black/85 border border-zinc-800/90 flex flex-col justify-between space-y-4"
                  >
                    <div className="space-y-3">
                      <div className="flex items-center justify-between gap-2 border-b border-zinc-800/80 pb-2.5">
                        <input
                          type="text"
                          disabled={!isCurrentUserHost}
                          value={zone.zoneName}
                          onChange={(e) =>
                            handleUpdateZone(zone.id, { zoneName: e.target.value })
                          }
                          className="bg-transparent text-sm font-bold text-white font-display focus:outline-none focus:border-b focus:border-red-500 w-full"
                        />
                        {isCurrentUserHost && (
                          <button
                            type="button"
                            onClick={() => handleDeleteZone(zone.id)}
                            className="p-1.5 rounded-lg text-zinc-500 hover:text-red-400 hover:bg-red-950/30 transition-colors cursor-pointer"
                            title="Remover Zona"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>

                      <div className="space-y-1.5">
                        <span className="text-[11px] font-mono-tabular uppercase text-zinc-400 block">
                          Sobreviventes nesta Zona:
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {session.survivors.map((surv) => {
                            const char =
                              CHARACTERS_CATALOG.find(
                                (c) => c.id === surv.character_id
                              ) || CHARACTERS_CATALOG[0];
                            const isHere = zone.survivorIds.includes(surv.id);
                            return (
                              <button
                                key={surv.id}
                                type="button"
                                disabled={!isCurrentUserHost}
                                onClick={() =>
                                  handleToggleSurvivorInZone(zone.id, surv.id)
                                }
                                className={`px-2 py-1 rounded-lg text-[11px] font-semibold border transition-all flex items-center gap-1.5 cursor-pointer ${
                                  isHere
                                    ? 'bg-sky-600/30 border-sky-400 text-white shadow-sm'
                                    : 'bg-zinc-950 border-zinc-800 text-zinc-500 hover:text-zinc-300'
                                }`}
                              >
                                <span>{char.name}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2 pt-1">
                        {(
                          [
                            { key: 'walkers', label: 'Lerdos', color: 'text-zinc-200' },
                            { key: 'runners', label: 'Corredores', color: 'text-amber-400' },
                            { key: 'fatties', label: 'Balofos', color: 'text-orange-400' },
                            { key: 'abominations', label: 'Abominação', color: 'text-red-400' },
                          ] as const
                        ).map((zType) => {
                          const val = zone[zType.key];
                          return (
                            <div
                              key={zType.key}
                              className="p-2 rounded-xl bg-zinc-950 border border-zinc-800/90 flex items-center justify-between"
                            >
                              <span className={`text-[11px] font-bold ${zType.color}`}>
                                {zType.label}
                              </span>
                              <div className="flex items-center gap-1">
                                <button
                                  type="button"
                                  disabled={!isCurrentUserHost}
                                  onClick={() =>
                                    handleUpdateZone(zone.id, {
                                      [zType.key]: Math.max(0, val - 1),
                                    })
                                  }
                                  className="w-5 h-5 rounded bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-xs font-bold flex items-center justify-center cursor-pointer"
                                >
                                  -
                                </button>
                                <span className="w-5 text-center text-xs font-mono-tabular font-bold text-white">
                                  {val}
                                </span>
                                <button
                                  type="button"
                                  disabled={!isCurrentUserHost}
                                  onClick={() =>
                                    handleUpdateZone(zone.id, {
                                      [zType.key]: val + 1,
                                    })
                                  }
                                  className="w-5 h-5 rounded bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-xs font-bold flex items-center justify-center cursor-pointer"
                                >
                                  +
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      <div className="flex flex-wrap items-center gap-1.5 pt-1">
                        <button
                          type="button"
                          disabled={!isCurrentUserHost}
                          onClick={() =>
                            handleUpdateZone(zone.id, { hasSpawn: !zone.hasSpawn })
                          }
                          className={`px-2 py-1 rounded-lg text-[10px] font-bold border cursor-pointer ${
                            zone.hasSpawn
                              ? 'bg-rose-900/60 border-rose-400 text-rose-200'
                              : 'bg-zinc-950 border-zinc-800 text-zinc-500'
                          }`}
                        >
                          Spawn {zone.hasSpawn ? '✓' : ''}
                        </button>

                        <button
                          type="button"
                          disabled={!isCurrentUserHost}
                          onClick={() =>
                            handleUpdateZone(zone.id, {
                              hasObjective: !zone.hasObjective,
                            })
                          }
                          className={`px-2 py-1 rounded-lg text-[10px] font-bold border cursor-pointer ${
                            zone.hasObjective
                              ? 'bg-emerald-900/60 border-emerald-400 text-emerald-200'
                              : 'bg-zinc-950 border-zinc-800 text-zinc-500'
                          }`}
                        >
                          Objetivo {zone.hasObjective ? '✓' : ''}
                        </button>

                        <button
                          type="button"
                          disabled={!isCurrentUserHost}
                          onClick={() => {
                            const nextDoor =
                              zone.doorStatus === 'NONE'
                                ? 'CLOSED'
                                : zone.doorStatus === 'CLOSED'
                                ? 'OPEN'
                                : 'NONE';
                            handleUpdateZone(zone.id, { doorStatus: nextDoor });
                          }}
                          className={`px-2 py-1 rounded-lg text-[10px] font-bold border cursor-pointer ${
                            zone.doorStatus === 'OPEN'
                              ? 'bg-teal-900/60 border-teal-400 text-teal-200'
                              : zone.doorStatus === 'CLOSED'
                              ? 'bg-purple-900/60 border-purple-400 text-purple-200'
                              : 'bg-zinc-950 border-zinc-800 text-zinc-500'
                          }`}
                        >
                          Porta:{' '}
                          {zone.doorStatus === 'NONE'
                            ? 'Nenhuma'
                            : zone.doorStatus === 'OPEN'
                            ? 'Aberta'
                            : 'Fechada'}
                        </button>

                        <div className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-zinc-950 border border-zinc-800 text-[10px] text-yellow-400 font-bold ml-auto">
                          <span>Barulho:</span>
                          <button
                            type="button"
                            disabled={!isCurrentUserHost}
                            onClick={() =>
                              handleUpdateZone(zone.id, {
                                noiseTokens: Math.max(0, zone.noiseTokens - 1),
                              })
                            }
                            className="px-1 text-zinc-400 hover:text-white cursor-pointer"
                          >
                            -
                          </button>
                          <span className="font-mono-tabular text-white">
                            {zone.noiseTokens}
                          </span>
                          <button
                            type="button"
                            disabled={!isCurrentUserHost}
                            onClick={() =>
                              handleUpdateZone(zone.id, {
                                noiseTokens: zone.noiseTokens + 1,
                              })
                            }
                            className="px-1 text-zinc-400 hover:text-white cursor-pointer"
                          >
                            +
                          </button>
                        </div>
                      </div>
                    </div>

                    <input
                      type="text"
                      disabled={!isCurrentUserHost}
                      value={zone.notes}
                      onChange={(e) =>
                        handleUpdateZone(zone.id, { notes: e.target.value })
                      }
                      placeholder="Observação da zona..."
                      className="w-full px-2.5 py-1.5 rounded-lg bg-zinc-950 border border-zinc-800 text-[11px] text-zinc-300 focus:outline-none focus:border-zinc-600"
                    />
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </section>
    </div>
  );
};
