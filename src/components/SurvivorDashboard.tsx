import React, { useState } from 'react';
import {
  UserProfile,
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
  HeartCrack,
  Footprints,
  Zap,
  CheckSquare,
  Square,
  Settings2,
  Skull,
  Dices,
  RotateCcw,
  Crown,
  CheckCircle2,
  XCircle,
  Repeat,
  Lock,
} from 'lucide-react';

interface SurvivorDashboardProps {
  session: GameSession;
  currentUser: UserProfile | null;
  isCurrentUserHost: boolean;
  onSwitchActiveUser: (username: string) => void;
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
  onRollWeaponAttack: (
    survivorId: string,
    item: GameItem,
    isDualAkimbo: boolean,
    outcome?: 'HIT' | 'MISS' | 'REROLL'
  ) => void;
}

export const SurvivorDashboard: React.FC<SurvivorDashboardProps> = ({
  session,
  currentUser,
  isCurrentUserHost,
  onSwitchActiveUser,
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
  const [mobileSection, setMobileSection] = useState<'STATUS' | 'INVENTORY'>('STATUS');
  const [showPassTurnPrompt, setShowPassTurnPrompt] = useState(false);
  const [attackPromptModal, setAttackPromptModal] = useState<{
    item: GameItem;
    isDualAkimbo: boolean;
    weaponName: string;
    totalDice: number;
    targetAccuracy: string;
    bonusRollPlus: number;
    damage: number;
    canReroll: boolean;
    rerollReason: string;
    hasRerolled: boolean;
    askingReroll: boolean;
    actionsAfterAttack: number;
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
    if (viewedSurvivor.actions_left <= 0) {
      setShowPassTurnPrompt(true);
      return;
    }

    const actionsAfterAttack = Math.max(0, viewedSurvivor.actions_left - 1);
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

    // Check if weapon or survivor has a reroll option (Weapon special rule, Plenty of Ammo/Shells/Arrows/Bolts in inventory, or Lucky/1 Reroll per Turn skill)
    const allHeldItems = [
      viewedSurvivor.inventory_json.handLeft,
      viewedSurvivor.inventory_json.handRight,
      ...viewedSurvivor.inventory_json.backpack,
    ].filter(Boolean) as GameItem[];

    const weaponText = `${item.name} ${item.description} ${
      item.stats_json.specialRule || ''
    }`.toLowerCase();

    const weaponHasBuiltInReroll =
      weaponText.includes('re-rol') ||
      weaponText.includes('rerol') ||
      weaponText.includes('reroll');

    const isShotgunWeapon =
      weaponText.includes('shotgun') ||
      weaponText.includes('escopeta') ||
      weaponText.includes('sawed-off') ||
      weaponText.includes('cano serrado') ||
      weaponText.includes('jackhammer');

    const isBowOrCrossbow =
      weaponText.includes('bow') ||
      weaponText.includes('arco') ||
      weaponText.includes('besta') ||
      weaponText.includes('crossbow');

    const hasPlentyOfShells =
      isShotgunWeapon &&
      allHeldItems.some((i) => i.id === 'eq_plenty_of_shells');

    const hasPlentyOfBullets =
      item.category === 'RANGED' &&
      !isShotgunWeapon &&
      !isBowOrCrossbow &&
      allHeldItems.some(
        (i) => i.id === 'eq_plenty_of_bullets' || i.id === 'eq_hollow_point'
      );

    const hasPlentyOfArrowsOrBolts =
      isBowOrCrossbow &&
      allHeldItems.some(
        (i) => i.id === 'eq_plenty_of_arrows' || i.id === 'eq_plenty_of_bolts'
      );

    const activeSkills = [
      character.skills.blue,
      viewedSurvivor.xp >= 7 ? character.skills.yellow : null,
      viewedSurvivor.xp >= 19
        ? character.skills.orange.find(
            (s) => s.id === viewedSurvivor.selected_skills_json.orange
          )
        : null,
      viewedSurvivor.xp >= 43
        ? character.skills.red.find(
            (s) => s.id === viewedSurvivor.selected_skills_json.red
          )
        : null,
    ].filter(Boolean);

    const hasRerollSkill = activeSkills.some(
      (s) =>
        s?.effectType === 'REROLL_ONCE' &&
        !viewedSurvivor.skills_used_json[s.id]
    );

    const canReroll =
      weaponHasBuiltInReroll ||
      hasPlentyOfShells ||
      hasPlentyOfBullets ||
      hasPlentyOfArrowsOrBolts ||
      hasRerollSkill;

    let rerollReason = 'Habilidade da Arma';
    if (hasPlentyOfShells) rerollReason = 'Carta: Munição de Sobr. (Cartuchos)';
    else if (hasPlentyOfBullets) rerollReason = 'Carta: Munição de Sobr. (Balas)';
    else if (hasPlentyOfArrowsOrBolts) rerollReason = 'Carta: Munição de Flechas/Virotes';
    else if (hasRerollSkill) rerollReason = 'Habilidade: 1 Re-rolagem por Turno';

    setAttackPromptModal({
      item,
      isDualAkimbo,
      weaponName: isDualAkimbo ? `${item.name} (Akimbo)` : item.name,
      totalDice: Math.max(1, totalDice),
      targetAccuracy: item.stats_json.accuracy,
      bonusRollPlus,
      damage: item.stats_json.damage,
      canReroll,
      rerollReason,
      hasRerolled: false,
      askingReroll: false,
      actionsAfterAttack,
    });
  };

  return (
    <div className="max-w-[1400px] mx-auto px-3 sm:px-6 py-4 sm:py-6 space-y-4 sm:space-y-6">
      {/* RF02.2 & RF02.3 — Active Turn Bar & Initiative Order */}
      <div
        className={`p-3.5 sm:p-5 rounded-2xl border transition-colors ${
          session.is_zombie_phase
            ? 'bg-gradient-to-r from-red-950/90 via-[#0A0A0C] to-[#0A0A0C] border-red-500/80'
            : 'bg-[#0A0A0C]/95 border-zinc-800'
        }`}
      >
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3.5">
          {/* Active Turn Status */}
          <div className="flex flex-wrap items-center justify-between sm:justify-start gap-2 sm:gap-4">
            <div className="font-mono-tabular text-[11px] sm:text-xs text-zinc-400 flex items-center gap-1.5">
              <span>RODADA {session.round}</span>
              <span aria-hidden="true">·</span>
              <span className="text-red-400 font-bold">SALA #{session.room_code}</span>
              <span aria-hidden="true">·</span>
              <button
                type="button"
                onClick={() => {
                  if (session.joined_players.length > 1) {
                    const currentUsername = (
                      currentUser?.username || session.host_username
                    ).toLowerCase();
                    const curIdx = session.joined_players.findIndex(
                      (p) => p.username.toLowerCase() === currentUsername
                    );
                    const nextPlayer =
                      session.joined_players[
                        (curIdx + 1) % session.joined_players.length
                      ];
                    if (nextPlayer) {
                      onSwitchActiveUser(nextPlayer.username);
                    }
                  }
                }}
                title="Jogador ativo neste dispositivo (toque para alternar se estiver compartilhando aparelho)"
                className={`px-2 py-0.5 rounded text-[10px] font-bold inline-flex items-center gap-1 cursor-pointer ${
                  isCurrentUserHost
                    ? 'bg-amber-500/15 border border-amber-500/50 text-amber-300'
                    : 'bg-zinc-900 border border-zinc-700 text-zinc-300'
                }`}
              >
                {isCurrentUserHost && <Crown className="w-2.5 h-2.5 text-amber-400" />}
                @{currentUser?.username || session.host_username}
                {isCurrentUserHost ? ' (Host)' : ''}
              </button>
            </div>
            <div className="h-4 w-[1px] bg-zinc-800 hidden sm:block" />
            {session.is_zombie_phase ? (
              <div className="flex items-center gap-2 text-red-400 font-bold text-sm sm:text-lg font-display w-full sm:w-auto">
                <Skull className="w-4 h-4 sm:w-5 sm:h-5 animate-pulse shrink-0" />
                <span>FASE DOS ZUMBIS — ATIVAÇÃO NA MESA!</span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 text-xs sm:text-base">
                <span className="text-zinc-400">Vez de:</span>
                <span className="font-bold text-red-500">
                  {activeTurnSurvivor
                    ? CHARACTERS_CATALOG.find(
                        (c) => c.id === activeTurnSurvivor.character_id
                      )?.name
                    : ''}
                </span>
                <span className="text-[11px] text-zinc-500">
                  (@{activeTurnSurvivor?.username})
                </span>
              </div>
            )}
          </div>

          {/* Survivor Initiative Strip + Pass Turn CTA */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between lg:justify-end gap-2.5 sm:gap-3">
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
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
                    className={`px-2.5 py-1.5 rounded-xl border transition-all flex items-center gap-2 shrink-0 cursor-pointer ${
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
              disabled={session.is_zombie_phase && !isCurrentUserHost}
              className={`w-full sm:w-auto px-4 sm:px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-colors flex items-center justify-center gap-2 whitespace-nowrap ${
                session.is_zombie_phase && !isCurrentUserHost
                  ? 'bg-zinc-900 border border-zinc-800 text-zinc-500 cursor-not-allowed'
                  : 'bg-red-600 hover:bg-red-500 text-white cursor-pointer'
              }`}
            >
              {session.is_zombie_phase && !isCurrentUserHost ? (
                <>
                  <Lock className="w-4 h-4" />
                  <span>Só o Host (@{session.host_username}) Passa</span>
                </>
              ) : (
                <>
                  <FastForward className="w-4 h-4" />
                  <span>
                    {session.is_zombie_phase
                      ? 'Encerrar Fase dos Zumbis (Host)'
                      : 'Passar Turno'}
                  </span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* RF03.1 & RF03.2 — Danger Level, XP Progress Bar & Heart/Broken Heart Wound System */}
      <div className="p-4 sm:p-5 rounded-2xl bg-[#0A0A0C]/95 border border-zinc-800 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-1.5 text-[11px] sm:text-xs text-zinc-400">
              <span>EXPERIÊNCIA (XP) E NÍVEL DE PERIGO</span>
              <span aria-hidden="true">·</span>
              <span className="font-semibold text-white">
                {getDangerLevelLabel(capabilities.level)}
              </span>
            </div>
            <div className="flex flex-wrap items-baseline gap-2.5 mt-0.5">
              <span className="text-2xl sm:text-3xl font-bold font-mono-tabular text-white">
                {viewedSurvivor.xp}{' '}
                <span className="text-sm sm:text-base font-normal text-zinc-400">
                  XP
                </span>
              </span>
              <span className="text-[11px] sm:text-xs text-zinc-400">
                {viewedSurvivor.xp < 7
                  ? `Faltam ${7 - viewedSurvivor.xp} XP p/ Amarelo (+1 Ação)`
                  : viewedSurvivor.xp < 19
                  ? `Faltam ${19 - viewedSurvivor.xp} XP p/ Laranja`
                  : viewedSurvivor.xp < 43
                  ? `Faltam ${43 - viewedSurvivor.xp} XP p/ Vermelho`
                  : 'Nível Máximo (43+ XP)'}
              </span>
            </div>
          </div>

          {/* Quick XP Adjustment Buttons (+1, +2, +5, -1) — 4 columns on mobile */}
          <div className="grid grid-cols-4 sm:flex items-center gap-1.5 sm:gap-2">
            <button
              type="button"
              onClick={() => onAdjustXP(viewedSurvivor.id, -1)}
              disabled={viewedSurvivor.xp <= 0}
              className="py-2 px-2 sm:px-3.5 rounded-lg bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 disabled:opacity-40 text-xs font-mono-tabular font-semibold text-zinc-200 transition-colors text-center cursor-pointer"
            >
              -1 XP
            </button>
            <button
              type="button"
              onClick={() => onAdjustXP(viewedSurvivor.id, 1)}
              className="py-2 px-2 sm:px-4 rounded-lg bg-red-600 hover:bg-red-500 text-xs font-mono-tabular font-bold text-white transition-colors text-center cursor-pointer"
            >
              +1 XP
            </button>
            <button
              type="button"
              onClick={() => onAdjustXP(viewedSurvivor.id, 2)}
              className="py-2 px-2 sm:px-3.5 rounded-lg bg-red-700 hover:bg-red-600 text-xs font-mono-tabular font-bold text-white transition-colors text-center cursor-pointer"
            >
              +2 XP
            </button>
            <button
              type="button"
              onClick={() => onAdjustXP(viewedSurvivor.id, 5)}
              className="py-2 px-2 sm:px-3.5 rounded-lg bg-red-900 hover:bg-red-800 border border-red-500/50 text-xs font-mono-tabular font-bold text-white transition-colors text-center cursor-pointer"
              title="Objetivo ou Abominação (+5 XP)"
            >
              +5 XP
            </button>
          </div>
        </div>

        {/* 4-Zone Danger Bar: Blue (0-6), Yellow (7-18), Orange (19-42), Red (43+) */}
        <div className="space-y-2">
          <div className="h-3.5 sm:h-4 w-full rounded-full bg-black overflow-hidden p-0.5 border border-zinc-800 relative">
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

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 sm:gap-2 text-[11px] sm:text-xs font-mono-tabular">
            <div
              className={`p-1.5 sm:p-2 rounded-lg border text-center sm:text-left ${
                capabilities.level === 'BLUE'
                  ? 'bg-sky-500/15 border-sky-500/60 text-sky-300 font-semibold'
                  : 'bg-zinc-950 border-zinc-800/80 text-zinc-400'
              }`}
            >
              Azul · 0–6
            </div>
            <div
              className={`p-1.5 sm:p-2 rounded-lg border text-center sm:text-left ${
                capabilities.level === 'YELLOW'
                  ? 'bg-yellow-500/15 border-yellow-500/60 text-yellow-300 font-semibold'
                  : 'bg-zinc-950 border-zinc-800/80 text-zinc-400'
              }`}
            >
              Amarelo · 7–18
            </div>
            <div
              className={`p-1.5 sm:p-2 rounded-lg border text-center sm:text-left ${
                capabilities.level === 'ORANGE'
                  ? 'bg-orange-500/15 border-orange-500/60 text-orange-300 font-semibold'
                  : 'bg-zinc-950 border-zinc-800/80 text-zinc-400'
              }`}
            >
              Laranja · 19–42
            </div>
            <div
              className={`p-1.5 sm:p-2 rounded-lg border text-center sm:text-left ${
                capabilities.level === 'RED'
                  ? 'bg-red-500/15 border-red-500/60 text-red-300 font-semibold'
                  : 'bg-zinc-950 border-zinc-800/80 text-zinc-400'
              }`}
            >
              Vermelho · 43+
            </div>
          </div>
        </div>

        {/* RF03.2 — Visual Heart / Broken Heart Wound Tracker integrated inside the XP Block */}
        <div className="pt-3.5 border-t border-zinc-800/90 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2 text-xs font-bold text-white">
              <Heart className="w-4 h-4 text-red-500 fill-red-500 shrink-0" />
              <span>VIDA E FERIMENTOS</span>
              <span className="font-mono-tabular text-red-400">
                ({viewedSurvivor.max_health - viewedSurvivor.health}/
                {viewedSurvivor.max_health})
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-[11px] text-zinc-400">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-300">
                ❤️ <strong>Inteiro:</strong> Toque para ferir
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-300">
                💔 <strong>Partido:</strong> Toque para restaurar
              </span>
            </div>
          </div>

          {/* Interactive 3 Hearts Visual Display */}
          <div className="grid grid-cols-3 gap-2 w-full md:w-auto">
            {Array.from({ length: viewedSurvivor.max_health }).map((_, idx) => {
              const healthyCount =
                viewedSurvivor.max_health - viewedSurvivor.health;
              const isBroken = idx >= healthyCount;

              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() =>
                    onAdjustWound(viewedSurvivor.id, isBroken ? -1 : 1)
                  }
                  title={
                    isBroken
                      ? 'Coração Partido (Ferido) — Toque para restaurar'
                      : 'Coração Inteiro (Saudável) — Toque para partir'
                  }
                  className={`group relative px-3.5 py-2.5 rounded-xl border transition-all flex items-center justify-center gap-2 cursor-pointer ${
                    isBroken
                      ? 'bg-red-950/35 border-red-800/70 text-zinc-400 hover:border-red-500/70 hover:text-white'
                      : 'bg-red-600/15 border-red-500/70 text-red-500 hover:bg-red-600/25 shadow-sm'
                  }`}
                >
                  {isBroken ? (
                    <HeartCrack className="w-5 h-5 sm:w-6 sm:h-6 text-red-500/80 transition-transform group-hover:scale-110 shrink-0" />
                  ) : (
                    <Heart className="w-5 h-5 sm:w-6 sm:h-6 text-red-500 fill-red-600 transition-transform group-hover:scale-110 shrink-0" />
                  )}
                  <div className="text-left">
                    <span className="block text-[10px] font-mono-tabular uppercase tracking-wider font-bold text-zinc-200 leading-tight">
                      {isBroken ? 'Partido' : 'Inteiro'}
                    </span>
                    <span className="block text-[9px] text-zinc-400 leading-tight">
                      {isBroken ? 'Ferido' : `Vida ${idx + 1}`}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Mobile Quick Switcher: Ficha & Habilidades vs. Inventário & Cartas */}
      <div className="lg:hidden grid grid-cols-2 gap-2 p-1.5 bg-[#0A0A0C] border border-zinc-800 rounded-xl">
        <button
          type="button"
          onClick={() => setMobileSection('STATUS')}
          className={`py-2.5 px-3 rounded-lg text-xs font-bold transition-colors flex items-center justify-center gap-1.5 ${
            mobileSection === 'STATUS'
              ? 'bg-red-600 text-white'
              : 'text-zinc-400 hover:text-white'
          }`}
        >
          <Zap className="w-3.5 h-3.5" />
          <span>Ficha e Habilidades</span>
        </button>
        <button
          type="button"
          onClick={() => setMobileSection('INVENTORY')}
          className={`py-2.5 px-3 rounded-lg text-xs font-bold transition-colors flex items-center justify-center gap-1.5 ${
            mobileSection === 'INVENTORY'
              ? 'bg-red-600 text-white'
              : 'text-zinc-400 hover:text-white'
          }`}
        >
          <Dices className="w-3.5 h-3.5" />
          <span>Mãos e Inventário (5)</span>
        </button>
      </div>

      {/* Main 12-Column Tabletop Dashboard Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6">
        {/* Left Column (5 Cols): Survivor Identity, Action/Movement Counters & Skills */}
        <div
          className={`lg:col-span-5 space-y-5 sm:space-y-6 ${
            mobileSection === 'INVENTORY' ? 'hidden lg:block' : 'block'
          }`}
        >
          {/* Survivor Identity + Counters Card */}
          <div className="p-4 sm:p-5 rounded-2xl bg-[#0A0A0C]/95 border border-zinc-800 space-y-4 sm:space-y-5">
            <div className="flex flex-col xs:flex-row sm:flex-row gap-4 items-center sm:items-stretch">
              <CharacterAvatar
                character={character}
                variant="portrait"
                size="md"
                className="shrink-0 border border-zinc-800"
              />
              <div className="flex-1 min-w-0 w-full flex flex-col justify-between">
                <div className="text-center sm:text-left">
                  <div className="flex items-center justify-center sm:justify-start gap-2 text-xs text-zinc-400">
                    {(() => {
                      const playerProfile = session.joined_players.find(
                        (p) =>
                          p.username.toLowerCase() ===
                          viewedSurvivor.username.toLowerCase()
                      );
                      return playerProfile?.avatar_url ? (
                        <img
                          src={playerProfile.avatar_url}
                          alt={viewedSurvivor.username}
                          className="w-5 h-5 rounded-full object-cover object-top border border-red-500/60"
                        />
                      ) : null;
                    })()}
                    <span className="text-zinc-200 font-semibold">
                      @{viewedSurvivor.username}
                    </span>
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
                    <div className="mt-2 p-2 rounded-lg bg-red-950/70 border border-red-500 text-xs font-bold text-red-300 flex items-center justify-center sm:justify-start gap-1.5">
                      <Skull className="w-4 h-4 shrink-0" />
                      <span>SOBREVIVENTE ELIMINADO (3 CORAÇÕES PARTIDOS)</span>
                    </div>
                  )}
                </div>

                {/* Compact Heart Status Summary inside Survivor Identity Card */}
                <div className="pt-3 mt-3 sm:mt-0 border-t border-zinc-800/80 flex items-center justify-between gap-2">
                  <span className="text-xs text-zinc-400">Estado Vital:</span>
                  <div className="flex items-center gap-1.5">
                    {Array.from({ length: viewedSurvivor.max_health }).map(
                      (_, idx) => {
                        const healthyCount =
                          viewedSurvivor.max_health - viewedSurvivor.health;
                        const isBroken = idx >= healthyCount;
                        return isBroken ? (
                          <HeartCrack
                            key={idx}
                            className="w-4 h-4 text-zinc-500"
                          />
                        ) : (
                          <Heart
                            key={idx}
                            className="w-4 h-4 text-red-500 fill-red-600"
                          />
                        );
                      }
                    )}
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
                    onClick={() => {
                      const willZeroOut = viewedSurvivor.actions_left === 1;
                      onSpendAction(viewedSurvivor.id);
                      if (willZeroOut) {
                        setShowPassTurnPrompt(true);
                      }
                    }}
                    disabled={viewedSurvivor.actions_left <= 0}
                    className="flex-1 py-1.5 px-3 rounded-lg bg-red-600 hover:bg-red-500 disabled:opacity-40 text-white text-xs font-bold transition-colors whitespace-nowrap cursor-pointer disabled:cursor-not-allowed"
                  >
                    Gastar 1 Ação
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowPassTurnPrompt(false);
                      onResetActions(viewedSurvivor.id);
                    }}
                    title="Resetar ações do turno"
                    className="p-1.5 rounded-lg bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-zinc-300 transition-colors cursor-pointer"
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
                    onClick={() => {
                      const willZeroOut =
                        viewedSurvivor.moves_left <= 0 &&
                        viewedSurvivor.actions_left === 1;
                      onSpendMove(viewedSurvivor.id);
                      if (willZeroOut) {
                        setShowPassTurnPrompt(true);
                      }
                    }}
                    disabled={
                      viewedSurvivor.moves_left <= 0 &&
                      viewedSurvivor.actions_left <= 0
                    }
                    className="w-full py-1.5 px-3 rounded-lg bg-red-600/20 hover:bg-red-600/30 border border-red-500/40 disabled:opacity-40 text-red-200 text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer disabled:cursor-not-allowed"
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
        <div
          className={`lg:col-span-7 space-y-6 ${
            mobileSection === 'STATUS' ? 'hidden lg:block' : 'block'
          }`}
        >
          <div className="p-4 sm:p-6 rounded-2xl bg-[#0A0A0C]/95 border border-zinc-800">
            <InventoryPanel
              inventory={viewedSurvivor.inventory_json}
              actionsLeft={viewedSurvivor.actions_left}
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

      {/* Modal de Ataque Físico: "Role os dados!" -> Acerto ou Falha -> Opção de Re-rolar */}
      {attackPromptModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-md rounded-2xl bg-[#0A0A0C] border border-red-600/70 p-6 space-y-5 shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <div className="flex items-center gap-2">
                <Dices className="w-5 h-5 text-red-500 animate-bounce" />
                <h3 className="text-lg font-bold text-white font-display">
                  {attackPromptModal.hasRerolled
                    ? 'Re-rolagem de Dados!'
                    : 'Ataque em Andamento'}
                </h3>
              </div>
              <div className="text-right">
                <span className="block text-xs font-mono-tabular text-red-400 font-semibold">
                  {attackPromptModal.weaponName}
                </span>
                <span className="block text-[10px] font-mono-tabular text-zinc-400">
                  Ações restantes: {viewedSurvivor.actions_left}/{capabilities.maxActions}
                </span>
              </div>
            </div>

            {!attackPromptModal.askingReroll ? (
              <>
                {/* Main Message: Role os dados! */}
                <div className="p-5 rounded-xl bg-zinc-950 border border-red-900/50 text-center space-y-3">
                  <p className="text-xl sm:text-2xl font-bold text-white font-display tracking-wide">
                    🎲 Role os dados na mesa!
                  </p>
                  <div className="grid grid-cols-3 gap-2 pt-1 text-center font-mono-tabular">
                    <div className="p-2 rounded-lg bg-black border border-zinc-800">
                      <span className="block text-[10px] text-zinc-400 uppercase">Dados</span>
                      <span className="text-sm font-bold text-red-400">
                        {attackPromptModal.totalDice} {attackPromptModal.totalDice === 1 ? 'dado' : 'dados'}
                      </span>
                    </div>
                    <div className="p-2 rounded-lg bg-black border border-zinc-800">
                      <span className="block text-[10px] text-zinc-400 uppercase">Acerto</span>
                      <span className="text-sm font-bold text-emerald-400">
                        {attackPromptModal.targetAccuracy}
                        {attackPromptModal.bonusRollPlus > 0
                          ? ` (+${attackPromptModal.bonusRollPlus})`
                          : ''}
                      </span>
                    </div>
                    <div className="p-2 rounded-lg bg-black border border-zinc-800">
                      <span className="block text-[10px] text-zinc-400 uppercase">Dano</span>
                      <span className="text-sm font-bold text-red-400">
                        {attackPromptModal.damage}
                      </span>
                    </div>
                  </div>
                  {attackPromptModal.canReroll && !attackPromptModal.hasRerolled && (
                    <div className="pt-1">
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-red-950/60 border border-red-700/50 text-[11px] text-red-300">
                        <Repeat className="w-3 h-3" />
                        <span>Re-rolagem disponível: <strong>{attackPromptModal.rerollReason}</strong></span>
                      </span>
                    </div>
                  )}
                </div>

                {/* Two Primary Outcome Buttons: ACERTO or FALHA */}
                <div className="space-y-2">
                  <span className="block text-xs text-center text-zinc-400">
                    Qual foi o resultado da sua rolagem física?
                  </span>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        const outOfActions =
                          viewedSurvivor.actions_left <= 0 ||
                          attackPromptModal.actionsAfterAttack <= 0;
                        onRollWeaponAttack(
                          viewedSurvivor.id,
                          attackPromptModal.item,
                          attackPromptModal.isDualAkimbo,
                          'HIT'
                        );
                        onAdjustXP(viewedSurvivor.id, 1);
                        setAttackPromptModal(null);
                        if (outOfActions) {
                          setShowPassTurnPrompt(true);
                        }
                      }}
                      className="py-3.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-lg"
                    >
                      <CheckCircle2 className="w-5 h-5" />
                      <span>Acerto (+1 XP)</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        if (
                          attackPromptModal.canReroll &&
                          !attackPromptModal.hasRerolled
                        ) {
                          setAttackPromptModal({
                            ...attackPromptModal,
                            askingReroll: true,
                          });
                        } else {
                          const outOfActions =
                            viewedSurvivor.actions_left <= 0 ||
                            attackPromptModal.actionsAfterAttack <= 0;
                          onRollWeaponAttack(
                            viewedSurvivor.id,
                            attackPromptModal.item,
                            attackPromptModal.isDualAkimbo,
                            'MISS'
                          );
                          setAttackPromptModal(null);
                          if (outOfActions) {
                            setShowPassTurnPrompt(true);
                          }
                        }
                      }}
                      className="py-3.5 px-4 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-sm transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-lg"
                    >
                      <XCircle className="w-5 h-5" />
                      <span>Falha</span>
                    </button>
                  </div>
                </div>

                {/* Direct Reroll Option Button if Weapon/Ammo allows rerolling */}
                {attackPromptModal.canReroll && !attackPromptModal.hasRerolled && (
                  <button
                    type="button"
                    onClick={() =>
                      setAttackPromptModal({
                        ...attackPromptModal,
                        askingReroll: true,
                      })
                    }
                    className="w-full py-2 px-3 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-xs font-semibold text-zinc-300 hover:text-white transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Repeat className="w-3.5 h-3.5 text-red-400" />
                    <span>Deseja re-rolar os dados? ({attackPromptModal.rerollReason})</span>
                  </button>
                )}
              </>
            ) : (
              /* Reroll Confirmation Prompt */
              <div className="space-y-4">
                <div className="p-4 rounded-xl bg-red-950/30 border border-red-500/60 text-center space-y-2">
                  <Repeat className="w-7 h-7 text-red-500 mx-auto" />
                  <h4 className="text-base font-bold text-white font-display">
                    Deseja re-rolar os dados?
                  </h4>
                  <p className="text-xs text-zinc-300">
                    Seu ataque possui opção de re-rolagem ativa (
                    <strong className="text-red-400">
                      {attackPromptModal.rerollReason}
                    </strong>
                    ). Quer jogar os dados novamente?
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      onRollWeaponAttack(
                        viewedSurvivor.id,
                        attackPromptModal.item,
                        attackPromptModal.isDualAkimbo,
                        'REROLL'
                      );
                      setAttackPromptModal({
                        ...attackPromptModal,
                        hasRerolled: true,
                        askingReroll: false,
                      });
                    }}
                    className="py-3 px-4 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs sm:text-sm transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Repeat className="w-4 h-4" />
                    <span>Sim, Re-rolar Dados!</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      const outOfActions =
                        viewedSurvivor.actions_left <= 0 ||
                        attackPromptModal.actionsAfterAttack <= 0;
                      onRollWeaponAttack(
                        viewedSurvivor.id,
                        attackPromptModal.item,
                        attackPromptModal.isDualAkimbo,
                        'MISS'
                      );
                      setAttackPromptModal(null);
                      if (outOfActions) {
                        setShowPassTurnPrompt(true);
                      }
                    }}
                    className="py-3 px-4 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 font-semibold text-xs sm:text-sm transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <span>Não, Manter Falha</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal Perguntando se Quer Passar o Turno quando acabam as Ações */}
      {showPassTurnPrompt && !attackPromptModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-md rounded-2xl bg-[#0A0A0C] border border-red-600/80 p-6 space-y-5 shadow-2xl">
            <div className="flex items-center gap-3 border-b border-zinc-800 pb-3">
              <div className="w-10 h-10 rounded-xl bg-red-600/20 border border-red-500/40 flex items-center justify-center shrink-0">
                <Zap className="w-5 h-5 text-red-500" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white font-display">
                  Ações Esgotadas no Turno!
                </h3>
                <p className="text-xs text-zinc-400">
                  {character.name} (@{viewedSurvivor.username}) · 0/{capabilities.maxActions} Ações restantes
                </p>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800 text-center space-y-1.5">
              <p className="text-sm font-semibold text-white">
                Suas ações deste turno acabaram. Deseja passar o turno agora?
              </p>
              <p className="text-xs text-zinc-400">
                Ao passar o turno, a vez avança para o próximo sobrevivente (ou para a Fase dos Zumbis) e suas ações serão restauradas na próxima rodada.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => {
                  setShowPassTurnPrompt(false);
                  onPassTurn();
                }}
                className="py-3 px-4 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs sm:text-sm transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-lg"
              >
                <FastForward className="w-4 h-4" />
                <span>Sim, Passar Turno</span>
              </button>

              <button
                type="button"
                onClick={() => setShowPassTurnPrompt(false)}
                className="py-3 px-4 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 hover:text-white font-semibold text-xs sm:text-sm transition-colors flex items-center justify-center cursor-pointer"
              >
                <span>Ainda Não (Ficar)</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
