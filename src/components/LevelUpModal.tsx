import React, { useState } from 'react';
import { GameCharacter, SkillDefinition } from '../types/game';
import { CharacterAvatar } from './CharacterAvatar';
import { CheckCircle2, Flame } from 'lucide-react';

interface LevelUpModalProps {
  character: GameCharacter;
  survivorUsername: string;
  tier: 'ORANGE' | 'RED';
  currentSelection: string | null;
  onConfirm: (skillId: string) => void;
  onClose?: () => void;
  isManualEdit?: boolean;
}

export const LevelUpModal: React.FC<LevelUpModalProps> = ({
  character,
  survivorUsername,
  tier,
  currentSelection,
  onConfirm,
  onClose,
  isManualEdit = false,
}) => {
  const options: SkillDefinition[] =
    tier === 'ORANGE' ? character.skills.orange : character.skills.red;

  const [selectedId, setSelectedId] = useState<string>(
    currentSelection || (options[0]?.id ?? '')
  );

  const isOrange = tier === 'ORANGE';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-sm animate-fadeIn">
      <div
        className={`w-full max-w-xl max-h-[90vh] flex flex-col rounded-2xl bg-[#0A0A0C] border ${
          isOrange ? 'border-orange-500/60' : 'border-red-500/70'
        } shadow-2xl overflow-hidden`}
      >
        {/* Top Header */}
        <div
          className={`px-4 sm:px-6 py-4 sm:py-5 border-b shrink-0 ${
            isOrange
              ? 'bg-gradient-to-r from-orange-950/60 via-zinc-950 to-black border-orange-500/30'
              : 'bg-gradient-to-r from-red-950/70 via-zinc-950 to-black border-red-500/40'
          } flex items-center gap-3.5 sm:gap-4`}
        >
          <CharacterAvatar
            character={character}
            variant="circle"
            size="md"
            className={`border-2 shrink-0 ${isOrange ? 'border-orange-400' : 'border-red-500'}`}
          />
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 text-xs text-slate-300">
              <span>{character.name}</span>
              <span aria-hidden="true">·</span>
              <span>@{survivorUsername}</span>
              <span aria-hidden="true">·</span>
              <span className={isOrange ? 'text-orange-400 font-semibold' : 'text-red-400 font-semibold'}>
                {isOrange ? '19+ XP (Laranja)' : '43+ XP (Vermelho)'}
              </span>
            </div>
            <h2 className="text-base sm:text-xl font-bold text-white mt-0.5 font-display">
              {isManualEdit
                ? `Alterar Habilidade de Nível ${isOrange ? 'Laranja' : 'Vermelho'}`
                : `Parabéns! ${character.name} alcançou o Nível ${
                    isOrange ? 'Laranja' : 'Vermelho'
                  }!`}
            </h2>
          </div>
        </div>

        {/* Body */}
        <div className="p-4 sm:p-6 space-y-4 overflow-y-auto flex-1">
          <p className="text-sm text-slate-300">
            Escolha explicitamente <strong>1 habilidade</strong> entre as opções disponíveis para ativar permanentemente no painel do seu sobrevivente:
          </p>

          <div className="space-y-3">
            {options.map((skill) => {
              const isSelected = selectedId === skill.id;
              return (
                <button
                  key={skill.id}
                  type="button"
                  onClick={() => setSelectedId(skill.id)}
                  className={`w-full text-left p-4 rounded-xl border transition-all flex items-start gap-3.5 ${
                    isSelected
                      ? isOrange
                        ? 'bg-orange-500/15 border-orange-500 text-white'
                        : 'bg-red-500/15 border-red-500 text-white'
                      : 'bg-slate-900/80 border-slate-800 text-slate-300 hover:border-slate-700'
                  }`}
                >
                  <div className="mt-0.5 shrink-0">
                    <div
                      className={`w-5 h-5 rounded-full border flex items-center justify-center ${
                        isSelected
                          ? isOrange
                            ? 'border-orange-400 bg-orange-500 text-slate-950'
                            : 'border-red-400 bg-red-500 text-white'
                          : 'border-slate-600'
                      }`}
                    >
                      {isSelected && <CheckCircle2 className="w-3.5 h-3.5" />}
                    </div>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-base text-white">
                        {skill.name}
                      </span>
                      <span className="text-xs text-slate-400">
                        {skill.isTurnTrackable ? 'Ativável por Turno' : 'Passiva Permanente'}
                      </span>
                    </div>
                    <p className="text-sm text-slate-300 mt-1 leading-relaxed">
                      {skill.description}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-950/80 border-t border-slate-800/80 flex items-center justify-end gap-3">
          {isManualEdit && onClose && (
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-300 hover:text-white transition-colors whitespace-nowrap"
            >
              Cancelar
            </button>
          )}
          <button
            type="button"
            disabled={!selectedId}
            onClick={() => onConfirm(selectedId)}
            className={`px-5 py-2.5 rounded-lg text-sm font-semibold text-white transition-colors flex items-center gap-2 whitespace-nowrap ${
              isOrange
                ? 'bg-orange-600 hover:bg-orange-500'
                : 'bg-red-600 hover:bg-red-500'
            }`}
          >
            <Flame className="w-4 h-4" />
            <span>Confirmar Escolha</span>
          </button>
        </div>
      </div>
    </div>
  );
};
