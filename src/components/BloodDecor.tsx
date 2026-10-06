import React from 'react';

export const ZombieLogoIcon: React.FC<{ className?: string }> = ({
  className = 'w-8 h-8',
}) => (
  <svg
    viewBox="0 0 64 64"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    aria-hidden="true"
  >
    {/* Blood aura glow */}
    <circle cx="32" cy="32" r="30" fill="#450A0A" stroke="#DC2626" strokeWidth="2.5" />
    {/* Splatter drips on top */}
    <path
      d="M18 8C18 13 16 17 16 20C16 21.5 17.5 22.5 19 21C20 19.5 20 14 21 9"
      fill="#DC2626"
    />
    <path
      d="M46 9C46 14 48 18 47 22C46.5 23.5 44.5 23 44 21C43.5 18 44 13 43 8"
      fill="#DC2626"
    />
    {/* Decayed Zombie Head Contour */}
    <path
      d="M16 26C16 15.5 22.5 10 32 10C41.5 10 48 15.5 48 26C48 31 46.5 35.5 44 39L42 50C41.5 52.5 38 54 32 54C26 54 22.5 52.5 22 50L20 39C17.5 35.5 16 31 16 26Z"
      fill="#18181B"
      stroke="#EF4444"
      strokeWidth="2"
    />
    {/* Forehead Stitch Scar */}
    <path d="M22 17L30 21" stroke="#DC2626" strokeWidth="2" strokeLinecap="round" />
    <path d="M24 15L23 20" stroke="#DC2626" strokeWidth="1.5" strokeLinecap="round" />
    <path d="M27 16.5L26 21" stroke="#DC2626" strokeWidth="1.5" strokeLinecap="round" />
    <path d="M30 18L29 22.5" stroke="#DC2626" strokeWidth="1.5" strokeLinecap="round" />

    {/* Left Zombie Eye (Glowing Crimson Socket) */}
    <ellipse cx="24.5" cy="29" rx="5.5" ry="5" fill="#09090B" stroke="#DC2626" strokeWidth="1.5" />
    <circle cx="24.5" cy="29" r="2.5" fill="#EF4444" />

    {/* Right Zombie Eye (Damaged Crossed Socket) */}
    <ellipse cx="39.5" cy="29" rx="5.5" ry="5" fill="#09090B" stroke="#DC2626" strokeWidth="1.5" />
    <path d="M37 26.5L42 31.5M42 26.5L37 31.5" stroke="#EF4444" strokeWidth="2" strokeLinecap="round" />

    {/* Skeletal Nose Cavity */}
    <path d="M32 32L29.5 37.5H34.5L32 32Z" fill="#09090B" stroke="#EF4444" strokeWidth="1.5" />

    {/* Menacing Jaw & Exposed Fang Teeth */}
    <path
      d="M23 42.5H41V49.5C41 50.5 37 51.5 32 51.5C27 51.5 23 50.5 23 49.5V42.5Z"
      fill="#09090B"
      stroke="#DC2626"
      strokeWidth="1.5"
    />
    <path
      d="M26.5 42.5V49.5M30 42.5V51M34 42.5V51M37.5 42.5V49.5M23 46.5H41"
      stroke="#EF4444"
      strokeWidth="1.5"
    />
    {/* Blood drip from jaw */}
    <path
      d="M35 51.5C35 55 34 58 35.5 59.5C37 58 36.5 55 36.5 51.5"
      fill="#DC2626"
    />
  </svg>
);

export const BloodSplatterBackdrop: React.FC = () => (
  <div
    className="fixed inset-0 pointer-events-none z-0 overflow-hidden select-none"
    aria-hidden="true"
  >
    {/* Top-Left Heavy Blood Splatter */}
    <svg
      viewBox="0 0 400 400"
      className="absolute -top-16 -left-16 w-80 h-80 sm:w-[440px] sm:h-[440px] text-red-800/35"
      fill="currentColor"
    >
      <path d="M156,92 C195,65 245,88 268,124 C295,166 288,225 246,256 C204,287 132,282 98,242 C64,202 117,119 156,92 Z" />
      <circle cx="290" cy="85" r="18" />
      <circle cx="325" cy="115" r="9" />
      <circle cx="310" cy="160" r="14" />
      <circle cx="275" cy="285" r="22" />
      <circle cx="320" cy="260" r="11" />
      <circle cx="115" cy="300" r="16" />
      <circle cx="80" cy="275" r="8" />
      <path d="M180,260 C183,310 176,355 182,380 C188,355 190,310 192,260 Z" />
      <path d="M235,250 C238,295 234,330 239,350 C244,330 245,295 246,250 Z" />
    </svg>

    {/* Top-Right Arterial Spray & Drips */}
    <svg
      viewBox="0 0 400 400"
      className="absolute -top-10 -right-12 w-72 h-72 sm:w-[400px] sm:h-[400px] text-red-700/30"
      fill="currentColor"
    >
      <path d="M260,60 C310,50 355,95 345,145 C335,195 275,230 230,205 C185,180 210,70 260,60 Z" />
      <circle cx="175" cy="95" r="14" />
      <circle cx="145" cy="125" r="7" />
      <circle cx="195" cy="175" r="19" />
      <circle cx="160" cy="210" r="10" />
      <circle cx="245" cy="255" r="15" />
      <path d="M285,190 C288,255 282,315 288,365 C295,315 296,255 298,190 Z" />
      <path d="M320,170 C322,220 319,265 324,295 C329,265 330,220 331,170 Z" />
    </svg>

    {/* Bottom-Right Corner Splatter */}
    <svg
      viewBox="0 0 400 400"
      className="absolute -bottom-20 -right-16 w-80 h-80 sm:w-[460px] sm:h-[460px] text-red-900/35"
      fill="currentColor"
    >
      <path d="M220,180 C275,155 340,190 350,250 C360,310 295,365 235,355 C175,345 165,205 220,180 Z" />
      <circle cx="150" cy="240" r="16" />
      <circle cx="120" cy="280" r="11" />
      <circle cx="185" cy="145" r="21" />
      <circle cx="240" cy="120" r="12" />
      <circle cx="285" cy="135" r="8" />
    </svg>

    {/* Bottom-Left Subtle Blood Mist & Drops */}
    <svg
      viewBox="0 0 400 400"
      className="absolute -bottom-16 -left-12 w-72 h-72 sm:w-96 sm:h-96 text-red-800/25"
      fill="currentColor"
    >
      <path d="M95,220 C145,195 205,235 195,290 C185,345 115,370 75,335 C35,300 45,245 95,220 Z" />
      <circle cx="220" cy="260" r="13" />
      <circle cx="250" cy="295" r="8" />
      <circle cx="165" cy="185" r="15" />
      <circle cx="115" cy="165" r="9" />
    </svg>
  </div>
);
