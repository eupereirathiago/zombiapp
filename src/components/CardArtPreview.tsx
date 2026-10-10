import React, { useState } from 'react';
import { GameItem } from '../types/game';
import { Volume2, VolumeX, DoorOpen, Repeat } from 'lucide-react';

interface CardArtPreviewProps {
  item: GameItem;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const CardArtPreview: React.FC<CardArtPreviewProps> = ({
  item,
  size = 'md',
  className = '',
}) => {
  const [imgError, setImgError] = useState(false);

  const renderWeaponIllustration = () => {
    switch (item.id) {
      case 'eq_aaahh':
        return (
          <svg viewBox="0 0 120 110" className="w-20 h-20 drop-shadow-md">
            {/* Zombie bloody hand reaching up */}
            <path
              d="M48 105 L44 65 L34 48 C31 43 36 39 40 44 L47 54 L46 25 C46 19 53 19 54 25 L55 50 L60 20 C61 14 68 15 67 22 L65 50 L72 26 C74 20 80 22 78 29 L72 56 L80 44 C84 39 89 43 85 49 L73 68 L70 105 Z"
              fill="#D6C79C"
              stroke="#18181B"
              strokeWidth="3"
            />
            <path
              d="M48 35 C50 52 46 68 50 85 M62 28 C60 48 64 65 60 90 M70 45 C68 60 71 75 67 95"
              stroke="#991B1B"
              strokeWidth="3.5"
              strokeLinecap="round"
            />
          </svg>
        );
      case 'eq_bag_of_rice':
        return (
          <svg viewBox="0 0 120 110" className="w-20 h-20 drop-shadow-md">
            <path
              d="M35 22 C45 26 75 26 85 22 L90 92 C75 96 45 96 30 92 Z"
              fill="#E4E4E7"
              stroke="#18181B"
              strokeWidth="3"
            />
            <text
              x="60"
              y="55"
              textAnchor="middle"
              fill="#1D4ED8"
              fontSize="16"
              fontWeight="900"
              fontFamily="sans-serif"
            >
              RICE
            </text>
            <text
              x="60"
              y="74"
              textAnchor="middle"
              fill="#3B82F6"
              fontSize="8"
              fontWeight="700"
            >
              CEREALS
            </text>
          </svg>
        );
      case 'eq_baseball_bat':
        return (
          <svg viewBox="0 0 120 110" className="w-20 h-20 drop-shadow-md">
            <path
              d="M22 24 L32 16 L96 86 L90 92 Z"
              fill="#E4E4E7"
              stroke="#18181B"
              strokeWidth="3"
            />
            <path
              d="M72 62 L94 86 L90 90 L67 66 Z"
              fill="#78350F"
              stroke="#18181B"
              strokeWidth="2"
            />
            <path
              d="M28 24 L48 45"
              stroke="#DC2626"
              strokeWidth="5"
              strokeLinecap="round"
            />
          </svg>
        );
      case 'eq_canned_food':
        return (
          <svg viewBox="0 0 120 110" className="w-20 h-20 drop-shadow-md">
            <rect
              x="22"
              y="36"
              width="28"
              height="42"
              rx="4"
              fill="#A1A1AA"
              stroke="#18181B"
              strokeWidth="2.5"
            />
            <rect
              x="70"
              y="36"
              width="28"
              height="42"
              rx="4"
              fill="#A1A1AA"
              stroke="#18181B"
              strokeWidth="2.5"
            />
            <rect
              x="44"
              y="30"
              width="32"
              height="52"
              rx="5"
              fill="#D4D4D8"
              stroke="#18181B"
              strokeWidth="3"
            />
            <rect x="46" y="46" width="28" height="18" fill="#B45309" />
          </svg>
        );
      case 'eq_chainsaw':
        return (
          <svg viewBox="0 0 120 110" className="w-20 h-20 drop-shadow-md">
            <path
              d="M18 24 L68 68 L58 78 L12 32 Z"
              fill="#D4D4D8"
              stroke="#18181B"
              strokeWidth="2.5"
              strokeDasharray="4 2"
            />
            <path
              d="M24 30 L48 54"
              stroke="#DC2626"
              strokeWidth="6"
              strokeLinecap="round"
            />
            <rect
              x="55"
              y="55"
              width="42"
              height="32"
              rx="6"
              transform="rotate(35 76 71)"
              fill="#F97316"
              stroke="#18181B"
              strokeWidth="3"
            />
          </svg>
        );
      case 'eq_crowbar':
        return (
          <svg viewBox="0 0 120 110" className="w-20 h-20 drop-shadow-md">
            <path
              d="M32 36 C26 20 38 14 46 26 L92 88 L84 94 L38 30 C35 26 32 30 35 36 Z"
              fill="#2563EB"
              stroke="#18181B"
              strokeWidth="3"
            />
          </svg>
        );
      case 'eq_evil_twins':
        return (
          <svg viewBox="0 0 120 110" className="w-20 h-20 drop-shadow-md">
            <path
              d="M18 42 L62 24 L66 35 L36 48 L38 72 L24 72 Z"
              fill="#EAB308"
              stroke="#18181B"
              strokeWidth="2.5"
            />
            <path
              d="M56 46 L100 64 L95 75 L66 62 L62 86 L48 84 Z"
              fill="#CA8A04"
              stroke="#18181B"
              strokeWidth="2.5"
            />
          </svg>
        );
      case 'eq_fire_axe':
        return (
          <svg viewBox="0 0 120 110" className="w-20 h-20 drop-shadow-md">
            <path
              d="M34 28 L92 88 L85 94 L28 34 Z"
              fill="#EAB308"
              stroke="#18181B"
              strokeWidth="2.5"
            />
            <path
              d="M22 36 L42 18 L52 28 L32 48 Z"
              fill="#DC2626"
              stroke="#18181B"
              strokeWidth="3"
            />
          </svg>
        );
      case 'eq_flashlight':
        return (
          <svg viewBox="0 0 120 110" className="w-20 h-20 drop-shadow-md">
            <path
              d="M20 42 L74 58 L88 52 L96 76 L78 82 L68 70 L16 54 Z"
              fill="#27272A"
              stroke="#18181B"
              strokeWidth="3"
            />
            <ellipse
              cx="88"
              cy="66"
              rx="10"
              ry="14"
              fill="#FEF08A"
              stroke="#18181B"
              strokeWidth="2.5"
            />
          </svg>
        );
      case 'eq_gasoline':
        return (
          <svg viewBox="0 0 120 110" className="w-20 h-20 drop-shadow-md">
            <rect
              x="32"
              y="22"
              width="56"
              height="70"
              rx="6"
              fill="#DC2626"
              stroke="#18181B"
              strokeWidth="3"
            />
            <path
              d="M44 42 L76 76 M76 42 L44 76"
              stroke="#991B1B"
              strokeWidth="5"
              strokeLinecap="round"
            />
          </svg>
        );
      case 'eq_glass_bottle':
        return (
          <svg viewBox="0 0 120 110" className="w-20 h-20 drop-shadow-md">
            <path
              d="M53 16 H67 V36 L78 48 V92 H42 V48 L53 36 Z"
              fill="#15803D"
              stroke="#18181B"
              strokeWidth="3"
            />
          </svg>
        );
      case 'eq_goalie_mask':
        return (
          <svg viewBox="0 0 120 110" className="w-20 h-20 drop-shadow-md">
            <path
              d="M32 45 C32 22 88 22 88 45 C88 72 74 92 60 94 C46 92 32 72 32 45 Z"
              fill="#F4F4F5"
              stroke="#18181B"
              strokeWidth="3"
            />
            <ellipse cx="47" cy="48" rx="7" ry="5" fill="#09090B" />
            <ellipse cx="73" cy="48" rx="7" ry="5" fill="#09090B" />
            <circle cx="60" cy="68" r="2.5" fill="#52525B" />
            <circle cx="52" cy="76" r="2.5" fill="#52525B" />
            <circle cx="68" cy="76" r="2.5" fill="#52525B" />
          </svg>
        );
      case 'eq_katana':
      case 'eq_machete':
        return (
          <svg viewBox="0 0 120 110" className="w-20 h-20 drop-shadow-md">
            <path
              d="M20 20 L82 76 L75 84 L16 26 Z"
              fill="#E4E4E7"
              stroke="#18181B"
              strokeWidth="2.5"
            />
            <path
              d="M32 32 L62 60"
              stroke="#DC2626"
              strokeWidth="4"
              strokeLinecap="round"
            />
            <path
              d="M78 72 L100 92 L93 98 L72 78 Z"
              fill="#78350F"
              stroke="#18181B"
              strokeWidth="2.5"
            />
          </svg>
        );
      case 'eq_molotov':
        return (
          <svg viewBox="0 0 120 110" className="w-20 h-20 drop-shadow-md">
            <path
              d="M65 44 H77 V58 L86 68 V96 H56 V68 L65 58 Z"
              fill="#15803D"
              stroke="#18181B"
              strokeWidth="3"
            />
            <path
              d="M70 44 C62 24 38 18 22 26 C38 34 45 42 66 46 Z"
              fill="#F97316"
              stroke="#18181B"
              strokeWidth="2.5"
            />
          </svg>
        );
      case 'eq_pan':
        return (
          <svg viewBox="0 0 120 110" className="w-20 h-20 drop-shadow-md">
            <circle
              cx="50"
              cy="48"
              r="28"
              fill="#52525B"
              stroke="#18181B"
              strokeWidth="3.5"
            />
            <circle cx="50" cy="48" r="21" fill="#A1A1AA" />
            <path
              d="M72 66 L98 92 L91 98 L66 72 Z"
              fill="#27272A"
              stroke="#18181B"
              strokeWidth="3"
            />
          </svg>
        );
      case 'eq_pistol':
      case 'eq_peacemaker':
        return (
          <svg viewBox="0 0 120 110" className="w-20 h-20 drop-shadow-md">
            <path
              d="M24 30 L88 50 L84 64 L64 58 L60 88 L42 84 L48 52 L20 42 Z"
              fill="#3F3F46"
              stroke="#18181B"
              strokeWidth="3"
            />
          </svg>
        );
      case 'eq_plenty_bullets':
        return (
          <svg viewBox="0 0 120 110" className="w-20 h-20 drop-shadow-md">
            <rect
              x="28"
              y="42"
              width="26"
              height="10"
              rx="4"
              transform="rotate(25 41 47)"
              fill="#EAB308"
              stroke="#18181B"
              strokeWidth="2.5"
            />
            <rect
              x="52"
              y="36"
              width="26"
              height="10"
              rx="4"
              transform="rotate(75 65 41)"
              fill="#EAB308"
              stroke="#18181B"
              strokeWidth="2.5"
            />
            <rect
              x="68"
              y="48"
              width="26"
              height="10"
              rx="4"
              transform="rotate(-20 81 53)"
              fill="#EAB308"
              stroke="#18181B"
              strokeWidth="2.5"
            />
            <rect
              x="36"
              y="64"
              width="26"
              height="10"
              rx="4"
              transform="rotate(-15 49 69)"
              fill="#CA8A04"
              stroke="#18181B"
              strokeWidth="2.5"
            />
          </svg>
        );
      case 'eq_plenty_shells':
        return (
          <svg viewBox="0 0 120 110" className="w-20 h-20 drop-shadow-md">
            <rect
              x="46"
              y="34"
              width="52"
              height="40"
              rx="4"
              fill="#78350F"
              stroke="#18181B"
              strokeWidth="3"
            />
            <rect
              x="24"
              y="40"
              width="12"
              height="28"
              rx="2"
              fill="#DC2626"
              stroke="#18181B"
              strokeWidth="2.5"
            />
            <rect
              x="20"
              y="58"
              width="28"
              height="12"
              rx="2"
              transform="rotate(30 34 64)"
              fill="#DC2626"
              stroke="#18181B"
              strokeWidth="2.5"
            />
          </svg>
        );
      case 'eq_scope':
        return (
          <svg viewBox="0 0 120 110" className="w-20 h-20 drop-shadow-md">
            <path
              d="M22 76 L86 22 L98 34 L32 88 Z"
              fill="#27272A"
              stroke="#18181B"
              strokeWidth="3"
            />
          </svg>
        );
      case 'eq_water':
        return (
          <svg viewBox="0 0 120 110" className="w-20 h-20 drop-shadow-md">
            <rect
              x="30"
              y="32"
              width="20"
              height="54"
              rx="6"
              fill="#93C5FD"
              stroke="#18181B"
              strokeWidth="2.5"
            />
            <rect
              x="70"
              y="32"
              width="20"
              height="54"
              rx="6"
              fill="#93C5FD"
              stroke="#18181B"
              strokeWidth="2.5"
            />
            <rect
              x="46"
              y="24"
              width="28"
              height="68"
              rx="8"
              fill="#BFDBFE"
              stroke="#18181B"
              strokeWidth="3"
            />
            <rect x="52" y="16" width="16" height="8" fill="#2563EB" stroke="#18181B" strokeWidth="2" />
          </svg>
        );
      default:
        // Shotgun / Rifle / Mas Shotgun / Sawed-Off / SMG
        return (
          <svg viewBox="0 0 120 110" className="w-20 h-20 drop-shadow-md">
            <path
              d="M16 24 L82 68 L96 88 L84 94 L68 74 L12 32 Z"
              fill="#3F3F46"
              stroke="#18181B"
              strokeWidth="3"
            />
            <path
              d="M66 64 L94 88 L84 94 L58 70 Z"
              fill="#78350F"
              stroke="#18181B"
              strokeWidth="2.5"
            />
          </svg>
        );
    }
  };

  if (item.image_url && !imgError) {
    return (
      <div
        className={`relative rounded-xl overflow-hidden border border-zinc-700 shadow-lg select-none aspect-[3/4] ${className}`}
      >
        <img
          src={item.image_url}
          alt={item.name}
          referrerPolicy="no-referrer"
          onError={() => setImgError(true)}
          className="w-full h-full object-cover"
        />
      </div>
    );
  }

  const isCompact = size === 'sm';

  return (
    <div
      className={`relative rounded-xl overflow-hidden border-2 border-zinc-800 shadow-lg select-none flex flex-col justify-between bg-gradient-to-b from-zinc-200 via-zinc-500 to-red-900 ${
        isCompact ? 'p-2.5 min-h-[175px]' : 'p-3.5 min-h-[240px]'
      } ${className}`}
    >
      {/* Silhouette Zombie Horde Midground Strip */}
      <div
        className="absolute inset-x-0 top-[34%] h-14 bg-gradient-to-b from-transparent via-zinc-900/45 to-red-950/70 pointer-events-none"
        aria-hidden="true"
      />

      {/* Top Section: Akimbo Icon + Cracked Classic Card Title */}
      <div className="relative z-10 flex items-start justify-between gap-1">
        {item.is_akimbo ? (
          <div
            title="Suporta Akimbo (Armas Emparelhadas)"
            className="w-6 h-6 rounded-full bg-red-600 border border-white text-white flex items-center justify-center shrink-0 shadow"
          >
            <Repeat className="w-3.5 h-3.5" />
          </div>
        ) : (
          <div className="w-6" />
        )}

        <div className="text-center flex-1">
          <div
            className={`font-black uppercase tracking-tight text-zinc-950 drop-shadow-[0_1px_0_rgba(255,255,255,0.8)] leading-tight ${
              isCompact ? 'text-xs' : 'text-sm'
            }`}
          >
            {item.card_title_en || item.name}
          </div>
          <div className="text-[10px] font-bold text-zinc-900/80 leading-tight">
            {item.name}
          </div>
        </div>

        {item.can_open_doors ? (
          <div
            title={
              item.door_noise
                ? 'Arromba portas gerando barulho'
                : 'Arromba portas silenciosamente'
            }
            className={`px-1.5 py-0.5 rounded border text-[10px] font-bold flex items-center gap-0.5 shrink-0 shadow ${
              item.door_noise
                ? 'bg-yellow-400 border-zinc-900 text-zinc-950'
                : 'bg-sky-600 border-white text-white'
            }`}
          >
            <DoorOpen className="w-3 h-3" />
          </div>
        ) : (
          <div className="w-6" />
        )}
      </div>

      {/* Center Section: Classic Weapon / Item Illustration + Noise Badge */}
      <div className="relative z-10 my-auto flex items-center justify-center py-1">
        {renderWeaponIllustration()}

        {/* Classic Zombicide Left Noise / Silent Indicator Strip */}
        {item.stats_json.dice > 0 && (
          <div className="absolute left-0 bottom-1 flex items-center bg-white/95 border border-zinc-900 rounded-r px-1.5 py-0.5 shadow">
            {item.noise_on_use ? (
              <span
                title="Arma barulhenta (gera ficha de barulho)"
                className="flex items-center gap-0.5 text-[10px] font-black text-amber-600"
              >
                <Volume2 className="w-3.5 h-3.5 fill-amber-400 text-zinc-950" />
              </span>
            ) : (
              <span
                title="Arma silenciosa"
                className="flex items-center gap-0.5 text-[10px] font-black text-sky-700"
              >
                <VolumeX className="w-3.5 h-3.5 text-sky-600" />
              </span>
            )}
          </div>
        )}
      </div>

      {/* Bottom Section: 4 White Distressed Stat Boxes OR White Rule Text Box */}
      <div className="relative z-10 mt-1 space-y-1">
        {item.stats_json.secondaryMode && !isCompact && (
          <div className="grid grid-cols-4 gap-1 text-center font-mono-tabular bg-zinc-900/90 p-1 rounded border border-zinc-700">
            <div className="col-span-4 text-[8px] font-black uppercase text-amber-400 tracking-wider leading-none mb-0.5">
              {item.stats_json.secondaryMode.modeName}
            </div>
            <div className="bg-white/95 rounded px-1 py-0.5">
              <span className="text-[10px] font-black text-zinc-950">
                {item.stats_json.secondaryMode.range}
              </span>
            </div>
            <div className="bg-white/95 rounded px-1 py-0.5">
              <span className="text-[10px] font-black text-zinc-950">
                {item.stats_json.secondaryMode.dice}
              </span>
            </div>
            <div className="bg-white/95 rounded px-1 py-0.5">
              <span className="text-[10px] font-black text-zinc-950">
                {item.stats_json.secondaryMode.accuracy}
              </span>
            </div>
            <div className="bg-white/95 rounded px-1 py-0.5">
              <span className="text-[10px] font-black text-red-700">
                {item.stats_json.secondaryMode.damage}
              </span>
            </div>
          </div>
        )}

        {item.stats_json.dice > 0 || item.id === 'eq_molotov' ? (
          <div className="grid grid-cols-4 gap-1 text-center font-mono-tabular">
            <div className="bg-white/95 border border-zinc-900 rounded px-1 py-1 shadow-sm">
              <span className="block text-[8px] font-bold uppercase text-zinc-500 leading-none">
                Alc
              </span>
              <span className="text-xs font-black text-zinc-950 leading-tight">
                {item.stats_json.range}
              </span>
            </div>
            <div className="bg-white/95 border border-zinc-900 rounded px-1 py-1 shadow-sm">
              <span className="block text-[8px] font-bold uppercase text-zinc-500 leading-none">
                Dados
              </span>
              <span className="text-xs font-black text-zinc-950 leading-tight">
                {item.id === 'eq_molotov' ? 'spec' : item.stats_json.dice}
              </span>
            </div>
            <div className="bg-white/95 border border-zinc-900 rounded px-1 py-1 shadow-sm">
              <span className="block text-[8px] font-bold uppercase text-zinc-500 leading-none">
                Acerto
              </span>
              <span className="text-xs font-black text-zinc-950 leading-tight">
                {item.id === 'eq_molotov' ? 'spec' : item.stats_json.accuracy}
              </span>
            </div>
            <div className="bg-white/95 border border-zinc-900 rounded px-1 py-1 shadow-sm">
              <span className="block text-[8px] font-bold uppercase text-zinc-500 leading-none">
                Dano
              </span>
              <span className="text-xs font-black text-red-700 leading-tight">
                {item.id === 'eq_molotov' ? 'a lot' : item.stats_json.damage}
              </span>
            </div>
          </div>
        ) : (
          <div className="bg-white/95 border border-zinc-900 rounded p-1.5 text-center shadow-sm">
            <p className="text-[10px] font-extrabold text-zinc-950 uppercase leading-snug line-clamp-3">
              {item.stats_json.specialRule || item.description}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
