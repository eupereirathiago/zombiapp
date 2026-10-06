import React, { useState } from 'react';
import {
  GameSession,
  SurvivorState,
  GameCharacter,
  GameItem,
  SlotKey,
} from '../types/game';
import {
  CHARACTERS_CATALOG,
  calculateSurvivorCapabilities,
  getDangerLevelLabel,
} from '../data/zombicideCatalog';
import { CharacterAvatar } from './CharacterAvatar';
import { InventoryPanel } from './InventoryPanel';
import {
  FastForward,
  Heart,
  HeartOff,
  Footprints,
  Zap,
  CheckSquare,
  Square,
  Settings2,
  Skull,
  Dices,
  RotateCcw,
  Crown,
} from 'lucide-react';

interface SurvivorDashboardProps {
  session: GameSession;
  viewedSurvivorId: string;
  onSelectViewedSurvivor: (id: string) => void;
  onPassTurn: () => void;
  onAdjustXP: (survivorId: string, delta: number) => void;
  onAdjustWound: (survivorId: string, delta: 1 | -1) => void;
  onSpendAction: (survivorId: string) => void;
  onResetActions: (survivorId: string) => void;
  onSpendMove: (survivorId: string) => void;
  onToggleSkillUsed: (survivorId: string, skillId: string) => void;
  onOpenSkillModal: (survivorId: string, tier: 'ORANGE' | 'RED') => void;
  onEquipItem: (survivorId: string, item: GameItem, targetSlot?: SlotKey) => void;
  onSwapSlots: (survivorId: string, source: SlotKey, target: SlotKey) => void;
  onDiscardSlot: (survivorId: string, slot: SlotKey) => void;
  onUseConsumable: (survivorId: string, slot: SlotKey, item: GameItem) => void;
  onCombineMolotov: (survivorId: string) => void;
  onRollWeaponAttack: (survivorId: string, item: GameItem, isDualAkimbo: boolean) => void;
}

export const SurvivorDashboard: React.FC<SurvivorDashboardProps> = ({
  session,
  viewedSurvivorId,
  onSelectViewedSurvivor,
  onPassTurn,
  onAdjustXP,
  onAdjustWound,
  onSpendAction,
  onResetActions,
  onSpendMove,
  onToggleSkillUsed,
  onOpenSkillModal,
  onEquipItem,
  onSwapSlots,
  onDiscardSlot,
  onUseConsumable,
  onCombineMolotov,
  onRollWeaponAttack,
}) => {
  const [diceModalResult, setDiceModalResult] = useState<{
    weaponName: string;
    rolls: number[];
    bonusRollPlus: number;
    targetAccuracy: number;
    damage: number;
    hits: number;
  } | null>(null);

  // Determine turn order sequence based on first_player_index (RF02.4)
  const orderedSurvivors: SurvivorState[] = [];
  if (session.survivors.length > 0) {
    for (let i = 0; i < session.survivors.length; i++) {
      const index = (session.first_player_index + i) % session.survivors.length;
      orderedSurvivors.push(session.survivors[index]);
    }
  }

  const activeTurnSurvivor = session.is_zombie_phase
    ? null
    : orderedSurvivors[session.turn_order_index] || orderedSurvivors[0];

  const viewedSurvivor =
    session.survivors.find((s) => s.id === viewedSurvivorId) ||
    activeTurnSurvivor ||
    session.survivors[0];

  if (!viewedSurvivor) return null;

  const character: GameCharacter =
    CHARACTERS_CATALOG.find((c) => c.id === viewedSurvivor.character_id) ||
    CHARACTERS_CATALOG[0];

  const capabilities = calculateSurvivorCapabilities(
    character,
    viewedSurvivor.xp,
    viewedSurvivor.selected_skills_json
  );

  const isEliminated = viewedSurvivor.health >= viewedSurvivor.max_health;
  const xpProgressPercent = Math.min(100, Math.round((viewedSurvivor.xp / 43) * 100));

  const triggerAttackRoll = (item: GameItem, isDualAkimbo: boolean) => {
    onRollWeaponAttack(viewedSurvivor.id, item, isDualAkimbo);
    const baseDice = item.stats_json.dice;
    const skillBonusDice =
      (item.category === 'MELEE' ? capabilities.meleeDiceBonus : 0) +
      (item.category === 'RANGED' ? capabilities.rangedDiceBonus : 0);
    const totalDice = isDualAkimbo
      ? (baseDice + skillBonusDice) * 2
      : baseDice + skillBonusDice;

    const bonusRollPlus =
      (item.category === 'MELEE' ? capabilities.meleeRollPlus : 0) +
      (item.category === 'RANGED' ? capabilities.rangedRollPlus : 0);

    const parsedTarget = parseInt(item.stats_json.accuracy, 10) || 4;
    const rolls: number[] = [];
    let hits = 0;

    for (let i = 0; i < Math.max(1, totalDice); i++) {
      const raw = Math.floor(Math.random() * 6) + 1;
      rolls.push(raw);
      if (item.stats_json.accuracy === 'Auto' || raw + bonusRollPlus >= parsedTarget) {
        hits++;
      }
    }

    setDiceModalResult({
      weaponName: isDualAkimbo ? `${item.name} (Akimbo Duplo)` : item.name,
      rolls,
      bonusRollPlus,
      targetAccuracy: parsedTarget,
      damage: item.stats_json.damage,
      hits,
    });
  };

  return (
    <div className="max-w-[1400px] mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* RF02.2 & RF02.3 — Active Turn Bar & Initiative Order */}
      <div
        className={`p-4 sm:p-5 rounded-2xl border transition-colors ${
          session.is_zombie_phase
            ? 'bg-gradient-to-r from-red-950/90 via-[#0A0A0C] to-[#0A0A0C] border-red-500/80'
            : 'bg-[#0A0A0C]/95 border-zinc-800'
        }`}
      >
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Active Turn Status */}
          <div className="flex items-center gap-4">
            <div className="font-mono-tabular text-xs text-zinc-400">
              <span>RODADA {session.round}</span>
              <span className="mx-2" aria-hidden="true">·</span>
              <span>SALA #{session.room_code}</span>
            </div>
            <div className="h-4 w-[1px] bg-zinc-800 hidden sm:block" />
            {session.is_zombie_phase ? (
              <div className="flex items-center gap-2.5 text-red-400 font-bold text-base sm:text-lg font-display">
                <Skull className="w-5 h-5 animate-pulse" />
                <span>FASE DOS ZUMBIS — ATIVAÇÃO E SPAWN NA MESA!</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-sm sm:text-base">
                <span className="text-zinc-400">Turno Ativo:</span>
                <span className="font-bold text-red-500">
                  Turno de {activeTurnSurvivor ? CHARACTERS_CATALOG.find((c) => c.id === activeTurnSurvivor.character_id)?.name : ''}
                </span>
                <span className="text-xs text-zinc-500">
                  (@{activeTurnSurvivor?.username})
                </span>
              </div>
            )}
          </div>

          {/* Survivor Initiative Strip + Pass Turn CTA */}
          <div className="flex flex-wrap items-center justify-between lg:justify-end gap-3">
            <div className="flex items-center gap-2 overflow-x-auto py-1">
              {orderedSurvivors.map((surv, idx) => {
                const char =
                  CHARACTERS_CATALOG.find((c) => c.id === surv.character_id) ||
                  CHARACTERS_CATALOG[0];
                const isCurrentTurn =
                  !session.is_zombie_phase && activeTurnSurvivor?.id === surv.id;
                const isViewing = viewedSurvivor.id === surv.id;
                const isFirstPlayer = idx === 0;

                return (
                  <button
                    key={surv.id}
                    type="button"
                    onClick={() => onSelectViewedSurvivor(surv.id)}
                    className={`px-3 py-1.5 rounded-xl border transition-all flex items-center gap-2 shrink-0 cursor-pointer ${
                      isViewing
                        ? 'bg-zinc-900 border-red-500 text-white'
                        : isCurrentTurn
                        ? 'bg-red-600/15 border-red-600/60 text-red-200'
                        : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    <div className="relative">
                      <CharacterAvatar
                        character={char}
                        variant="circle"
                        size="sm"
                      />
                      {isFirstPlayer && (
                        <span
                          title="Marcador de 1º Jogador da Rodada"
                          className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-600 text-white flex items-center justify-center"
                        >
                          <Crown className="w-2.5 h-2.5 fill-current" />
                        </span>
                      )}
                    </div>
                    <div className="text-left">
                      <div className="text-xs font-bold leading-tight flex items-center gap-1">
                        <span>{char.name}</span>
                        {isCurrentTurn && (
                          <span className="w-2 h-2 rounded-full bg-red-500 inline-block" />
                        )}
                      </div>
                      <div className="text-[10px] font-mono-tabular text-zinc-400">
                        {surv.xp} XP · {surv.actions_left}/{surv.max_actions} Aç
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              onClick={onPassTurn}
              className="px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm bg-red-600 hover:bg-red-500 text-white transition-colors flex items-center gap-2 whitespace-nowrap cursor-pointer"
            >
              <FastForward className="w-4 h-4" />
              <span>
                {session.is_zombie_phase
                  ? 'Encerrar Fase dos Zumbis (Nova Rodada)'
                  : 'Passar Turno'}
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* RF03.1 — Danger Level & Interactive XP Progress Bar */}
      <div className="p-5 rounded-2xl bg-[#0A0A0C]/95 border border-zinc-800 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs text-zinc-400">
              <span>MEDIDOR DE EXPERIÊNCIA (XP) E NÍVEL DE PERIGO</span>
              <span aria-hidden="true">·</span>
              <span className="font-semibold text-white">
                {getDangerLevelLabel(capabilities.level)}
              </span>
            </div>
            <div className="flex items-baseline gap-3 mt-1">
              <span className="text-3xl font-bold font-mono-tabular text-white">
                {viewedSurvivor.xp} <span className="text-base font-normal text-zinc-400">XP</span>
              </span>
              <span className="text-xs text-zinc-400">
                {viewedSurvivor.xp < 7
                  ? `Faltam ${7 - viewedSurvivor.xp} XP para o Nível Amarelo (+1 Ação)`
                  : viewedSurvivor.xp < 19
                  ? `Faltam ${19 - viewedSurvivor.xp} XP para o Nível Laranja`
                  : viewedSurvivor.xp < 43
                  ? `Faltam ${43 - viewedSurvivor.xp} XP para o Nível Vermelho`
                  : 'Nível Máximo Alcançado (Ultrared / 43+ XP)'}
              </span>
            </div>
          </div>

          {/* Quick XP Adjustment Buttons (+1, +2, +5, -1) */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onAdjustXP(viewedSurvivor.id, -1)}
              disabled={viewedSurvivor.xp <= 0}
              className="px-3.5 py-2 rounded-lg bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 disabled:opacity-40 text-xs font-mono-tabular font-semibold text-zinc-200 transition-colors"
            >
              -1 XP
            </button>
            <button
              type="button"
              onClick={() => onAdjustXP(viewedSurvivor.id, 1)}
              className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-xs font-mono-tabular font-bold text-white transition-colors"
            >
              +1 XP (Zumbi)
            </button>
            <button
              type="button"
              onClick={() => onAdjustXP(viewedSurvivor.id, 2)}
              className="px-3.5 py-2 rounded-lg bg-red-700 hover:bg-red-600 text-xs font-mono-tabular font-bold text-white transition-colors"
            >
              +2 XP
            </button>
            <button
              type="button"
              onClick={() => onAdjustXP(viewedSurvivor.id, 5)}
              className="px-3.5 py-2 rounded-lg bg-red-900 hover:bg-red-800 border border-red-500/50 text-xs font-mono-tabular font-bold text-white transition-colors"
              title="Objetivo ou Abominação (+5 XP)"
            >
              +5 XP (Objetivo)
            </button>
          </div>
        </div>

        {/* 4-Zone Danger Bar: Blue (0-6), Yellow (7-18), Orange (19-42), Red (43+) */}
        <div className="space-y-2">
          <div className="h-4 w-full rounded-full bg-black overflow-hidden p-0.5 border border-zinc-800 relative">
            <div
              className={`h-full rounded-full transition-all duration-200 ${
                capabilities.level === 'BLUE'
                  ? 'bg-sky-500'
                  : capabilities.level === 'YELLOW'
                  ? 'bg-yellow-400'
                  : capabilities.level === 'ORANGE'
                  ? 'bg-orange-500'
                  : 'bg-red-600'
              }`}
              style={{ width: `${xpProgressPercent}%` }}
            />
          </div>

          <div className="grid grid-cols-4 gap-2 text-xs font-mono-tabular">
            <div
              className={`p-2 rounded-lg border ${
                capabilities.level === 'BLUE'
                  ? 'bg-sky-500/15 border-sky-500/60 text-sky-300 font-semibold'
                  : 'bg-zinc-950 border-zinc-800/80 text-zinc-400'
              }`}
            >
              Azul · 0–6 XP
            </div>
            <div
              className={`p-2 rounded-lg border ${
                capabilities.level === 'YELLOW'
                  ? 'bg-yellow-500/15 border-yellow-500/60 text-yellow-300 font-semibold'
                  : 'bg-zinc-950 border-zinc-800/80 text-zinc-400'
              }`}
            >
              Amarelo · 7–18 XP
            </div>
            <div
              className={`p-2 rounded-lg border ${
                capabilities.level === 'ORANGE'
                  ? 'bg-orange-500/15 border-orange-500/60 text-orange-300 font-semibold'
                  : 'bg-zinc-950 border-zinc-800/80 text-zinc-400'
              }`}
            >
              Laranja · 19–42 XP
            </div>
            <div
              className={`p-2 rounded-lg border ${
                capabilities.level === 'RED'
                  ? 'bg-red-500/15 border-red-500/60 text-red-300 font-semibold'
                  : 'bg-zinc-950 border-zinc-800/80 text-zinc-400'
              }`}
            >
              Vermelho · 43+ XP
            </div>
          </div>
        </div>
      </div>

      {/* Main 12-Column Tabletop Dashboard Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column (5 Cols): Survivor Identity, Wounds, Action/Movement Counters & Skills */}
        <div className="lg:col-span-5 space-y-6">
          {/* Survivor Identity + Counters Card */}
          <div className="p-5 rounded-2xl bg-[#0A0A0C]/95 border border-zinc-800 space-y-5">
            <div className="flex gap-4">
              <CharacterAvatar
                character={character}
                variant="portrait"
                size="md"
                className="shrink-0 border border-zinc-800"
              />
              <div className="flex-1 min-w-0 flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2 text-xs text-zinc-400">
                    <span>@{viewedSurvivor.username}</span>
                    <span aria-hidden="true">·</span>
                    <span>{character.edition}</span>
                  </div>
                  <h2 className="text-2xl font-bold text-white font-display mt-0.5">
                    {character.name}
                  </h2>
                  <p className="text-xs text-red-500 font-medium">
                    {character.title}
                  </p>

                  {isEliminated && (
                    <div className="mt-2 p-2 rounded-lg bg-red-950/70 border border-red-500 text-xs font-bold text-red-300 flex items-center gap-1.5">
                      <Skull className="w-4 h-4 shrink-0" />
                      <span>SOBREVIVENTE ELIMINADO (3/3 FERIMENTOS)</span>
                    </div>
                  )}
                </div>

                {/* RF03.2 — Health & Wound Counter */}
                <div className="pt-3 border-t border-zinc-800/80 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-zinc-300 font-semibold">
                      Ferimentos Sofridos:
                    </span>
                    <span className="font-mono-tabular font-bold text-red-400">
                      {viewedSurvivor.health} / {viewedSurvivor.max_health} Ferimentos
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => onAdjustWound(viewedSurvivor.id, 1)}
                      disabled={viewedSurvivor.health >= viewedSurvivor.max_health}
                      className="flex-1 py-2 px-3 rounded-lg bg-red-950/70 hover:bg-red-900/80 border border-red-700/60 disabled:opacity-40 text-xs font-semibold text-red-200 transition-colors flex items-center justify-center gap-1.5 whitespace-nowrap"
                    >
                      <HeartOff className="w-3.5 h-3.5" />
                      <span>Sofrer Ferimento (+Carta)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => onAdjustWound(viewedSurvivor.id, -1)}
                      disabled={viewedSurvivor.health <= 0}
                      className="py-2 px-3 rounded-lg bg-emerald-950/60 hover:bg-emerald-900/70 border border-emerald-700/50 disabled:opacity-40 text-xs font-semibold text-emerald-300 transition-colors flex items-center justify-center gap-1.5 whitespace-nowrap"
                    >
                      <Heart className="w-3.5 h-3.5" />
                      <span>Curar (-1)</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* RF03.3 — Dynamic Actions & Movement Counters */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-4 border-t border-zinc-800">
              {/* Total Actions Counter */}
              <div className="p-3.5 rounded-xl bg-zinc-950 border border-zinc-800 flex flex-col justify-between space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-zinc-300 flex items-center gap-1.5">
                    <Zap className="w-4 h-4 text-red-500" />
                    Ações no Turno
                  </span>
                  <span className="text-lg font-bold font-mono-tabular text-white">
                    {viewedSurvivor.actions_left} / {capabilities.maxActions}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => onSpendAction(viewedSurvivor.id)}
                    disabled={viewedSurvivor.actions_left <= 0}
                    className="flex-1 py-1.5 px-3 rounded-lg bg-red-600 hover:bg-red-500 disabled:opacity-40 text-white text-xs font-bold transition-colors whitespace-nowrap"
                  >
                    Gastar 1 Ação
                  </button>
                  <button
                    type="button"
                    onClick={() => onResetActions(viewedSurvivor.id)}
                    title="Resetar ações do turno"
                    className="p-1.5 rounded-lg bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-zinc-300 transition-colors"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Dedicated Movement Counter */}
              <div className="p-3.5 rounded-xl bg-zinc-950 border border-zinc-800 flex flex-col justify-between space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-zinc-300 flex items-center gap-1.5">
                    <Footprints className="w-4 h-4 text-red-400" />
                    Movimento ({capabilities.zonesPerMove} Zonas/Aç)
                  </span>
                  <span className="text-lg font-bold font-mono-tabular text-red-400">
                    {viewedSurvivor.moves_left} Rest.
                  </span>
                </div>

                <div className="flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => onSpendMove(viewedSurvivor.id)}
                    disabled={
                      viewedSurvivor.moves_left <= 0 &&
                      viewedSurvivor.actions_left <= 0
                    }
                    className="w-full py-1.5 px-3 rounded-lg bg-red-600/20 hover:bg-red-600/30 border border-red-500/40 disabled:opacity-40 text-red-200 text-xs font-semibold transition-colors whitespace-nowrap"
                  >
                    Mover ({capabilities.zonesPerMove}{' '}
                    {capabilities.zonesPerMove > 1 ? 'Zonas' : 'Zona'})
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* RF03.4 — Skills Tree & Per-Turn Usage Checkboxes */}
          <div className="p-5 rounded-2xl bg-[#0A0A0C]/95 border border-zinc-800 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white font-display">
                Habilidades do Sobrevivente
              </h3>
              <span className="text-xs text-zinc-400">
                Checkboxes resetam ao Passar Turno
              </span>
            </div>

            <div className="space-y-3">
              {/* Blue Level Skill (Always Unlocked) */}
              <div className="p-3.5 rounded-xl bg-zinc-950 border border-sky-500/40 flex items-start justify-between gap-3">
                <div className="space-y-0.5">
                  <div className="text-xs font-semibold text-sky-400">
                    Nível Azul (0 XP · Nativa)
                  </div>
                  <div className="text-sm font-bold text-white">
                    {character.skills.blue.name}
                  </div>
                  <p className="text-xs text-zinc-400">
                    {character.skills.blue.description}
                  </p>
                </div>
                {character.skills.blue.isTurnTrackable && (
                  <button
                    type="button"
                    onClick={() =>
                      onToggleSkillUsed(viewedSurvivor.id, character.skills.blue.id)
                    }
                    className="shrink-0 flex items-center gap-1.5 text-xs font-medium text-sky-300 bg-sky-950/60 px-2.5 py-1.5 rounded-lg border border-sky-500/30"
                  >
                    {viewedSurvivor.skills_used_json[character.skills.blue.id] ? (
                      <>
                        <CheckSquare className="w-4 h-4 text-emerald-400" />
                        <span>Usada</span>
                      </>
                    ) : (
                      <>
                        <Square className="w-4 h-4" />
                        <span>Usar 1x</span>
                      </>
                    )}
                  </button>
                )}
              </div>

              {/* Yellow Level Skill (7+ XP) */}
              <div
                className={`p-3.5 rounded-xl border transition-opacity ${
                  viewedSurvivor.xp >= 7
                    ? 'bg-zinc-950 border-yellow-500/40 opacity-100'
                    : 'bg-black/60 border-zinc-800/70 opacity-50'
                }`}
              >
                <div className="text-xs font-semibold text-yellow-400">
                  Nível Amarelo (7 XP · Automática)
                </div>
                <div className="text-sm font-bold text-white">
                  {character.skills.yellow.name}
                </div>
                <p className="text-xs text-zinc-400">
                  {character.skills.yellow.description}
                </p>
              </div>

              {/* Orange Level Skill (19+ XP - User Choice) */}
              {(() => {
                const unlocked = viewedSurvivor.xp >= 19;
                const chosenSkill = character.skills.orange.find(
                  (s) => s.id === viewedSurvivor.selected_skills_json.orange
                );
                return (
                  <div
                    className={`p-3.5 rounded-xl border transition-opacity ${
                      unlocked
                        ? 'bg-zinc-950 border-orange-500/50 opacity-100'
                        : 'bg-black/60 border-zinc-800/70 opacity-55'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-semibold text-orange-400">
                        Nível Laranja (19 XP · Escolha 1 de 2)
                      </span>
                      {unlocked && (
                        <button
                          type="button"
                          onClick={() => onOpenSkillModal(viewedSurvivor.id, 'ORANGE')}
                          className="text-xs text-orange-300 hover:text-white flex items-center gap-1"
                        >
                          <Settings2 className="w-3.5 h-3.5" />
                          <span>{chosenSkill ? 'Alterar' : 'Escolher'}</span>
                        </button>
                      )}
                    </div>

                    {chosenSkill ? (
                      <div className="mt-1 flex items-start justify-between gap-3">
                        <div>
                          <div className="text-sm font-bold text-white">
                            {chosenSkill.name}
                          </div>
                          <p className="text-xs text-zinc-400">
                            {chosenSkill.description}
                          </p>
                        </div>
                        {unlocked && chosenSkill.isTurnTrackable && (
                          <button
                            type="button"
                            onClick={() =>
                              onToggleSkillUsed(viewedSurvivor.id, chosenSkill.id)
                            }
                            className="shrink-0 flex items-center gap-1.5 text-xs font-medium text-orange-300 bg-orange-950/60 px-2.5 py-1.5 rounded-lg border border-orange-500/30"
                          >
                            {viewedSurvivor.skills_used_json[chosenSkill.id] ? (
                              <>
                                <CheckSquare className="w-4 h-4 text-emerald-400" />
                                <span>Usada</span>
                              </>
                            ) : (
                              <>
                                <Square className="w-4 h-4" />
                                <span>Usar 1x</span>
                              </>
                            )}
                          </button>
                        )}
                      </div>
                    ) : (
                      <div className="mt-1 text-xs text-zinc-400">
                        Opções: {character.skills.orange.map((s) => s.name).join(' ou ')}
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* Red Level Skill (43+ XP - User Choice) */}
              {(() => {
                const unlocked = viewedSurvivor.xp >= 43;
                const chosenSkill = character.skills.red.find(
                  (s) => s.id === viewedSurvivor.selected_skills_json.red
                );
                return (
                  <div
                    className={`p-3.5 rounded-xl border transition-opacity ${
                      unlocked
                        ? 'bg-zinc-950 border-red-500/50 opacity-100'
                        : 'bg-black/60 border-zinc-800/70 opacity-55'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-semibold text-red-400">
                        Nível Vermelho (43 XP · Escolha 1 de 3)
                      </span>
                      {unlocked && (
                        <button
                          type="button"
                          onClick={() => onOpenSkillModal(viewedSurvivor.id, 'RED')}
                          className="text-xs text-red-300 hover:text-white flex items-center gap-1"
                        >
                          <Settings2 className="w-3.5 h-3.5" />
                          <span>{chosenSkill ? 'Alterar' : 'Escolher'}</span>
                        </button>
                      )}
                    </div>

                    {chosenSkill ? (
                      <div className="mt-1 flex items-start justify-between gap-3">
                        <div>
                          <div className="text-sm font-bold text-white">
                            {chosenSkill.name}
                          </div>
                          <p className="text-xs text-zinc-400">
                            {chosenSkill.description}
                          </p>
                        </div>
                        {unlocked && chosenSkill.isTurnTrackable && (
                          <button
                            type="button"
                            onClick={() =>
                              onToggleSkillUsed(viewedSurvivor.id, chosenSkill.id)
                            }
                            className="shrink-0 flex items-center gap-1.5 text-xs font-medium text-red-300 bg-red-950/60 px-2.5 py-1.5 rounded-lg border border-red-500/30"
                          >
                            {viewedSurvivor.skills_used_json[chosenSkill.id] ? (
                              <>
                                <CheckSquare className="w-4 h-4 text-emerald-400" />
                                <span>Usada</span>
                              </>
                            ) : (
                              <>
                                <Square className="w-4 h-4" />
                                <span>Usar 1x</span>
                              </>
                            )}
                          </button>
                        )}
                      </div>
                    ) : (
                      <div className="mt-1 text-xs text-zinc-400">
                        Opções: {character.skills.red.map((s) => s.name).join(' · ')}
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
          </div>
        </div>

        {/* Right Column (7 Cols): RF04 Digital Inventory & Physical Card Search */}
        <div className="lg:col-span-7 space-y-6">
          <div className="p-5 sm:p-6 rounded-2xl bg-[#0A0A0C]/95 border border-zinc-800">
            <InventoryPanel
              inventory={viewedSurvivor.inventory_json}
              hasAmbidextrous={capabilities.hasAmbidextrous}
              meleeDiceBonus={capabilities.meleeDiceBonus}
              rangedDiceBonus={capabilities.rangedDiceBonus}
              meleeRollPlus={capabilities.meleeRollPlus}
              rangedRollPlus={capabilities.rangedRollPlus}
              onEquipItem={(item, slot) =>
                onEquipItem(viewedSurvivor.id, item, slot)
              }
              onSwapSlots={(source, target) =>
                onSwapSlots(viewedSurvivor.id, source, target)
              }
              onDiscardSlot={(slot) => onDiscardSlot(viewedSurvivor.id, slot)}
              onUseConsumable={(slot, item) =>
                onUseConsumable(viewedSurvivor.id, slot, item)
              }
              onCombineMolotov={() => onCombineMolotov(viewedSurvivor.id)}
              onRollWeaponAttack={triggerAttackRoll}
            />
          </div>
        </div>
      </div>

      {/* Interactive Dice Roller Result Modal */}
      {diceModalResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-[#0A0A0C] border border-red-600/60 p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <div className="flex items-center gap-2">
                <Dices className="w-5 h-5 text-red-500" />
                <h3 className="text-lg font-bold text-white font-display">
                  Resultado do Ataque
                </h3>
              </div>
              <span className="text-xs font-mono-tabular text-zinc-400">
                Alvo: {diceModalResult.targetAccuracy}+ · Dano {diceModalResult.damage}
              </span>
            </div>

            <div>
              <div className="text-xs text-zinc-400 mb-2">
                Arma utilizada: <strong className="text-white">{diceModalResult.weaponName}</strong>
              </div>
              <div className="flex flex-wrap gap-2.5 py-2">
                {diceModalResult.rolls.map((val, idx) => {
                  const modified = val + diceModalResult.bonusRollPlus;
                  const isHit = modified >= diceModalResult.targetAccuracy;
                  return (
                    <div
                      key={idx}
                      className={`w-12 h-12 rounded-xl border flex flex-col items-center justify-center font-mono-tabular font-bold ${
                        isHit
                          ? 'bg-red-600/20 border-red-500 text-red-300'
                          : 'bg-zinc-950 border-zinc-800 text-zinc-500'
                      }`}
                    >
                      <span className="text-base">{modified}</span>
                      {diceModalResult.bonusRollPlus > 0 && (
                        <span className="text-[9px] text-zinc-400">
                          ({val}+{diceModalResult.bonusRollPlus})
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-zinc-950 border border-zinc-800 flex items-center justify-between">
              <span className="text-sm text-zinc-300">Acertos Confirmados:</span>
              <span className="text-xl font-bold font-mono-tabular text-red-500">
                {diceModalResult.hits} {diceModalResult.hits === 1 ? 'Acerto' : 'Acertos'} (Dano {diceModalResult.damage})
              </span>
            </div>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setDiceModalResult(null)}
                className="px-5 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-bold transition-colors"
              >
                Concluir Ataque
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
