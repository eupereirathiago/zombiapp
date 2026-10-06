import React, { useState } from 'react';
import { GameCharacter } from '../types/game';
import {
  Shield,
  Skull,
  Zap,
  Crosshair,
  Search,
  Footprints,
  Swords,
  Flame,
  Sparkles,
  Crown,
} from 'lucide-react';

interface CharacterAvatarProps {
  character: GameCharacter;
  variant?: 'circle' | 'portrait';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

export const CharacterAvatar: React.FC<CharacterAvatarProps> = ({
  character,
  variant = 'circle',
  size = 'md',
  className = '',
}) => {
  const [imgError, setImgError] = useState(false);

  const src = variant === 'circle' ? character.avatar_url : character.full_art_url;

  const sizeClasses = {
    sm: variant === 'circle' ? 'w-9 h-9' : 'w-20 h-28',
    md: variant === 'circle' ? 'w-12 h-12' : 'w-32 h-44',
    lg: variant === 'circle' ? 'w-16 h-16' : 'w-48 h-64',
    xl: variant === 'circle' ? 'w-20 h-20' : 'w-full h-full',
  }[size];

  const getEditionAccent = () => {
    switch (character.edition) {
      case 'Black_Plague':
      case 'Wulfsburg':
      case 'Green_Horde':
        return 'from-red-950/90 via-zinc-950 to-black border-red-700/60 text-red-400';
      case 'Invader':
      case 'Dark_Side':
        return 'from-red-900/70 via-zinc-950 to-black border-red-600/50 text-red-400';
      case 'Undead_or_Alive':
        return 'from-red-950/90 via-zinc-900 to-black border-red-600/60 text-red-400';
      case 'Prison_Outbreak':
      case 'Rue_Morgue':
      case 'Toxic_City_Mall':
      case 'Angry_Neighbors':
        return 'from-red-950/80 via-zinc-950 to-black border-red-700/50 text-red-400';
      default:
        return 'from-zinc-900 via-zinc-950 to-black border-red-900/60 text-red-500';
    }
  };

  const getFallbackIcon = () => {
    const iconSize = variant === 'circle' ? 'w-4 h-4' : 'w-7 h-7';
    const effect = character.skills.blue.effectType;
    if (effect === 'DOUBLE_ZONES_PER_MOVE' || effect === 'FREE_MOVE') {
      return <Footprints className={iconSize} />;
    }
    if (effect === 'FREE_SEARCH') {
      return <Search className={iconSize} />;
    }
    if (effect === 'SLIPPERY') {
      return <Zap className={iconSize} />;
    }
    if (effect === 'AMBIDEXTROUS' || effect === 'DICE_BONUS_MELEE') {
      return <Swords className={iconSize} />;
    }
    if (effect === 'DICE_BONUS_RANGED' || effect === 'FREE_RANGED') {
      return <Crosshair className={iconSize} />;
    }
    if (
      character.edition === 'Black_Plague' ||
      character.edition === 'Wulfsburg' ||
      character.edition === 'Green_Horde'
    ) {
      return <Crown className={iconSize} />;
    }
    if (character.edition === 'Invader' || character.edition === 'Dark_Side') {
      return <Sparkles className={iconSize} />;
    }
    if (character.edition === 'Undead_or_Alive') {
      return <Flame className={iconSize} />;
    }
    return <Shield className={iconSize} />;
  };

  const initials = character.name
    .split(' ')
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  if (imgError || !src) {
    return (
      <div
        className={`relative overflow-hidden bg-gradient-to-br border flex flex-col items-center justify-center select-none ${getEditionAccent()} ${
          variant === 'circle' ? 'rounded-full' : 'rounded-xl'
        } ${sizeClasses} ${className}`}
      >
        {variant === 'circle' ? (
          <span className="text-xs font-bold font-display tracking-tight text-white">
            {initials}
          </span>
        ) : (
          <>
            <div className="p-2.5 rounded-full bg-slate-950/60 border border-white/10 mb-2">
              {getFallbackIcon()}
            </div>
            <span className="text-sm font-bold font-display text-white px-2 text-center leading-tight">
              {character.name}
            </span>
            <span className="text-[10px] text-slate-400 px-2 text-center mt-0.5 line-clamp-1">
              {character.title}
            </span>
          </>
        )}
      </div>
    );
  }

  return (
    <div
      className={`relative overflow-hidden bg-slate-900 select-none ${
        variant === 'circle' ? 'rounded-full' : 'rounded-xl'
      } ${sizeClasses} ${className}`}
    >
      <img
        src={src}
        alt={`Retrato de ${character.name} - ${character.title}`}
        referrerPolicy="no-referrer"
        onError={() => setImgError(true)}
        className="w-full h-full object-cover object-top"
      />
      {variant === 'portrait' && (
        <div className="absolute inset-0 bg-gradient-to-t from-[#0B0F19] via-[#0B0F19]/25 to-transparent pointer-events-none" />
      )}
    </div>
  );
};
