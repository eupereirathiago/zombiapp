import React from 'react';
import {
  GameCharacter,
  SkillDefinition,
  ZombicideEdition,
} from '../types/game';
import { ITEMS_DATABASE, EDITION_LABELS } from '../data/zombicideCatalog';
import { CharacterAvatar } from './CharacterAvatar';
import {
  Skull,
  Heart,
  Play,
  BookOpen,
  ChevronRight,
  CheckCircle2,
  Shield,
} from 'lucide-react';

interface SurvivorIdCardProps {
  character: GameCharacter;
  isAlreadyInRoom?: boolean;
  activePlayerUsername?: string;
  onSelectCharacter?: (username: string, characterId: string) => void;
  onInspectSkill?: (detail: {
    charName: string;
    tierLabel: string;
    tierColor: string;
    skill: SkillDefinition;
  }) => void;
}

export const SurvivorIdCard: React.FC<SurvivorIdCardProps> = ({
  character: char,
  isAlreadyInRoom = false,
  activePlayerUsername,
  onSelectCharacter,
  onInspectSkill,
}) => {
  const maxHp = char.maxHealth || 3;
  const healthTrack = maxHp === 2 ? [2, 1] : [3, 2, 1];
  const startItem = ITEMS_DATABASE.find(
    (i) => i.id === char.startingEquipmentId
  );
  const editionLabel =
    EDITION_LABELS[char.edition as ZombicideEdition] || char.edition;

  return (
    <div
      className={`rounded-2xl bg-[#0A0A0C]/95 border transition-all overflow-hidden flex flex-col justify-between shadow-xl ${
        isAlreadyInRoom
          ? 'border-red-500/80 ring-1 ring-red-500/30'
          : 'border-zinc-800 hover:border-red-900/70'
      }`}
    >
      {/* Top Half: Authentic Zombicide ID Card Layout (Skills Bars Left + Comic Art & Wound Track Right) */}
      <div className="relative bg-gradient-to-br from-zinc-900 via-zinc-950 to-black border-b border-zinc-800 p-4 sm:p-5">
        {/* Character Name Banner */}
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[10px] font-mono-tabular uppercase tracking-widest px-2 py-0.5 rounded bg-red-600/20 border border-red-500/40 text-red-400 font-bold">
                {editionLabel}
                {char.originalName ? ` · ${char.originalName}` : ''}
              </span>
              <span className="inline-flex items-center gap-1 text-[11px] font-mono-tabular text-red-400 font-bold">
                <Heart className="w-3.5 h-3.5 fill-red-500 text-red-500" />
                {maxHp} Corações
              </span>
              {isAlreadyInRoom && (
                <span className="inline-flex items-center gap-1 text-[10px] font-mono-tabular uppercase px-2 py-0.5 rounded bg-emerald-950/80 border border-emerald-500/50 text-emerald-300 font-bold">
                  <CheckCircle2 className="w-3 h-3" />
                  Na Mesa
                </span>
              )}
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-white font-display tracking-wide mt-1 truncate">
              {char.name}
            </h2>
            <p className="text-xs text-zinc-400 truncate">{char.title}</p>
          </div>

          {startItem && (
            <div className="text-right shrink-0">
              <span className="block text-[10px] uppercase tracking-wider text-zinc-500">
                Equip. Inicial
              </span>
              <span className="text-xs font-bold text-red-400">
                {startItem.name}
              </span>
            </div>
          )}
        </div>

        {/* Card Body: Left Skill Bars + Right Portrait & Health Boxes */}
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-stretch">
          {/* Left 7 Cols: Official Zombicide Color Skill Bars (Blue, Yellow, Orange x2, Red x3) */}
          <div className="sm:col-span-7 flex flex-col justify-center space-y-1.5">
            {/* BLUE SKILL (0 XP) */}
            <button
              type="button"
              onClick={() =>
                onInspectSkill?.({
                  charName: char.name,
                  tierLabel: 'Nível Azul (0 XP)',
                  tierColor: 'text-sky-400',
                  skill: char.skills.blue,
                })
              }
              className="group w-full flex items-stretch rounded-md overflow-hidden border border-zinc-700/80 bg-zinc-100 hover:bg-white text-left transition-transform hover:translate-x-0.5 cursor-pointer shadow-sm"
            >
              <span className="w-9 bg-sky-600 text-white flex items-center justify-center shrink-0 font-bold">
                <ChevronRight className="w-4 h-4 stroke-[3]" />
              </span>
              <div className="px-2.5 py-1.5 flex-1 min-w-0 flex items-center justify-between gap-1">
                <span className="text-xs font-extrabold uppercase tracking-tight text-zinc-950 truncate">
                  {char.skills.blue.name}
                </span>
                {char.skills.blue.originalName && (
                  <span className="text-[9px] font-mono-tabular font-bold text-zinc-500 shrink-0">
                    {char.skills.blue.originalName}
                  </span>
                )}
              </div>
            </button>

            {/* YELLOW SKILL (7 XP) */}
            <button
              type="button"
              onClick={() =>
                onInspectSkill?.({
                  charName: char.name,
                  tierLabel: 'Nível Amarelo (7 XP)',
                  tierColor: 'text-yellow-400',
                  skill: char.skills.yellow,
                })
              }
              className="group w-full flex items-stretch rounded-md overflow-hidden border border-zinc-700/80 bg-zinc-100 hover:bg-white text-left transition-transform hover:translate-x-0.5 cursor-pointer shadow-sm"
            >
              <span className="w-9 bg-amber-400 text-black flex items-center justify-center shrink-0 font-bold">
                <ChevronRight className="w-4 h-4 stroke-[3]" />
              </span>
              <div className="px-2.5 py-1.5 flex-1 min-w-0 flex items-center justify-between gap-1">
                <span className="text-xs font-extrabold uppercase tracking-tight text-zinc-950 truncate">
                  {char.skills.yellow.name}
                </span>
                {char.skills.yellow.originalName && (
                  <span className="text-[9px] font-mono-tabular font-bold text-zinc-500 shrink-0">
                    {char.skills.yellow.originalName}
                  </span>
                )}
              </div>
            </button>

            {/* ORANGE SKILLS (19 XP) */}
            {char.skills.orange.map((sk) => (
              <button
                key={sk.id}
                type="button"
                onClick={() =>
                  onInspectSkill?.({
                    charName: char.name,
                    tierLabel: 'Nível Laranja (19 XP)',
                    tierColor: 'text-orange-400',
                    skill: sk,
                  })
                }
                className="group w-full flex items-stretch rounded-md overflow-hidden border border-zinc-700/80 bg-zinc-100 hover:bg-white text-left transition-transform hover:translate-x-0.5 cursor-pointer shadow-sm"
              >
                <span className="w-9 bg-orange-500 text-white flex items-center justify-center shrink-0 font-bold">
                  <ChevronRight className="w-4 h-4 stroke-[3]" />
                </span>
                <div className="px-2.5 py-1.5 flex-1 min-w-0 flex items-center justify-between gap-1">
                  <span className="text-xs font-extrabold uppercase tracking-tight text-zinc-950 truncate">
                    {sk.name}
                  </span>
                  {sk.originalName && (
                    <span className="text-[9px] font-mono-tabular font-bold text-zinc-500 shrink-0">
                      {sk.originalName}
                    </span>
                  )}
                </div>
              </button>
            ))}

            {/* RED SKILLS (43 XP) */}
            {char.skills.red.map((sk) => (
              <button
                key={sk.id}
                type="button"
                onClick={() =>
                  onInspectSkill?.({
                    charName: char.name,
                    tierLabel: 'Nível Vermelho (43 XP)',
                    tierColor: 'text-red-400',
                    skill: sk,
                  })
                }
                className="group w-full flex items-stretch rounded-md overflow-hidden border border-zinc-700/80 bg-zinc-100 hover:bg-white text-left transition-transform hover:translate-x-0.5 cursor-pointer shadow-sm"
              >
                <span className="w-9 bg-red-600 text-white flex items-center justify-center shrink-0 font-bold">
                  <ChevronRight className="w-4 h-4 stroke-[3]" />
                </span>
                <div className="px-2.5 py-1.5 flex-1 min-w-0 flex items-center justify-between gap-1">
                  <span className="text-xs font-extrabold uppercase tracking-tight text-zinc-950 truncate">
                    {sk.name}
                  </span>
                  {sk.originalName && (
                    <span className="text-[9px] font-mono-tabular font-bold text-zinc-500 shrink-0">
                      {sk.originalName}
                    </span>
                  )}
                </div>
              </button>
            ))}
          </div>

          {/* Right 5 Cols: Character Comic Illustration + Official Right-Side Wound Track (3/2/1/Skull or 2/1/Skull) */}
          <div className="sm:col-span-5 relative rounded-xl overflow-hidden border border-zinc-700/80 bg-zinc-950 min-h-[230px] flex items-end justify-end">
            <CharacterAvatar
              character={char}
              variant="portrait"
              size="xl"
              className="absolute inset-0 w-full h-full rounded-none border-0"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-transparent pointer-events-none" />

            {/* Official Right-Edge Health / Wound Column (3, 2, 1, Skull OR 2, 1, Skull) */}
            <div className="relative z-10 m-2.5 flex flex-col gap-1">
              {healthTrack.map((hpNum) => (
                <div
                  key={hpNum}
                  title={`Pontos de Vida: ${hpNum}`}
                  className="w-9 h-8 rounded bg-red-600 border border-white/30 text-white font-display font-extrabold text-base flex items-center justify-center shadow-md"
                >
                  {hpNum}
                </div>
              ))}
              <div
                title="Eliminado ao atingir a Caveira"
                className="w-9 h-8 rounded bg-black border border-zinc-600 text-white flex items-center justify-center shadow-md"
              >
                <Skull className="w-4 h-4 text-white" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Half: Full Portuguese Descriptions of All Skills & Selection Action */}
      <div className="p-4 sm:p-5 space-y-4 bg-[#0A0A0C] flex-1 flex flex-col justify-between">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-zinc-300 flex items-center gap-1.5">
              <BookOpen className="w-3.5 h-3.5 text-red-500" />
              <span>Descrição das Habilidades (PT-BR)</span>
            </span>
            <span className="text-[11px] text-zinc-500">
              Toque nas barras para ampliar
            </span>
          </div>

          <div className="space-y-2 text-xs">
            {/* Blue */}
            <div className="p-2.5 rounded-lg bg-zinc-950 border border-sky-900/40 flex items-start gap-2.5">
              <span className="px-2 py-0.5 rounded bg-sky-500/20 text-sky-300 font-bold text-[10px] shrink-0 mt-0.5">
                AZUL
              </span>
              <div>
                <div className="font-bold text-white">
                  {char.skills.blue.name}{' '}
                  {char.skills.blue.originalName && (
                    <span className="text-[10px] font-mono-tabular text-zinc-400 font-normal">
                      ({char.skills.blue.originalName})
                    </span>
                  )}
                </div>
                <p className="text-zinc-300 mt-0.5 leading-relaxed">
                  {char.skills.blue.description}
                </p>
              </div>
            </div>

            {/* Yellow */}
            <div className="p-2.5 rounded-lg bg-zinc-950 border border-yellow-900/40 flex items-start gap-2.5">
              <span className="px-2 py-0.5 rounded bg-yellow-500/20 text-yellow-300 font-bold text-[10px] shrink-0 mt-0.5">
                AMARELO
              </span>
              <div>
                <div className="font-bold text-white">
                  {char.skills.yellow.name}{' '}
                  {char.skills.yellow.originalName && (
                    <span className="text-[10px] font-mono-tabular text-zinc-400 font-normal">
                      ({char.skills.yellow.originalName})
                    </span>
                  )}
                </div>
                <p className="text-zinc-300 mt-0.5 leading-relaxed">
                  {char.skills.yellow.description}
                </p>
              </div>
            </div>

            {/* Orange */}
            <div className="p-2.5 rounded-lg bg-zinc-950 border border-orange-900/40 space-y-2">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded bg-orange-500/20 text-orange-300 font-bold text-[10px] shrink-0">
                  LARANJA (Escolha 1 aos 19 XP)
                </span>
              </div>
              <div className="grid grid-cols-1 gap-2 pl-1">
                {char.skills.orange.map((sk) => (
                  <div
                    key={sk.id}
                    className="border-l-2 border-orange-500/50 pl-2.5"
                  >
                    <div className="font-bold text-white">
                      {sk.name}{' '}
                      {sk.originalName && (
                        <span className="text-[10px] font-mono-tabular text-zinc-400 font-normal">
                          ({sk.originalName})
                        </span>
                      )}
                    </div>
                    <p className="text-zinc-300 leading-relaxed">
                      {sk.description}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Red */}
            <div className="p-2.5 rounded-lg bg-zinc-950 border border-red-900/40 space-y-2">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded bg-red-500/20 text-red-300 font-bold text-[10px] shrink-0">
                  VERMELHO (Escolha 1 aos 43 XP)
                </span>
              </div>
              <div className="grid grid-cols-1 gap-2 pl-1">
                {char.skills.red.map((sk) => (
                  <div
                    key={sk.id}
                    className="border-l-2 border-red-500/50 pl-2.5"
                  >
                    <div className="font-bold text-white">
                      {sk.name}{' '}
                      {sk.originalName && (
                        <span className="text-[10px] font-mono-tabular text-zinc-400 font-normal">
                          ({sk.originalName})
                        </span>
                      )}
                    </div>
                    <p className="text-zinc-300 leading-relaxed">
                      {sk.description}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Action Footer: Select Character for the Table */}
        {onSelectCharacter && (
          <div className="pt-3 border-t border-zinc-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <div className="text-xs text-zinc-400 flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-red-500 shrink-0" />
              <span>
                Para:{' '}
                <strong className="text-white">
                  @{activePlayerUsername || 'host'}
                </strong>{' '}
                · <strong className="text-red-400">{maxHp} Corações</strong>
              </span>
            </div>

            <button
              type="button"
              onClick={() =>
                onSelectCharacter(activePlayerUsername || 'host', char.id)
              }
              className={`px-4 py-2.5 rounded-xl font-bold text-xs transition-colors flex items-center justify-center gap-2 cursor-pointer ${
                isAlreadyInRoom
                  ? 'bg-emerald-950/70 border border-emerald-500/50 text-emerald-300 hover:bg-emerald-900/60'
                  : 'bg-red-600 hover:bg-red-500 text-white'
              }`}
            >
              {isAlreadyInRoom ? (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Já na Mesa · Reatribuir</span>
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>+ Escolher {char.name}</span>
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
