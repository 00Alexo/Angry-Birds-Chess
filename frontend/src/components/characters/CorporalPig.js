import React from 'react';

// Corporal Pig - Rook piece
// Strong defender, moves in straight lines like a castle tower
export const CorporalPig = ({ size = 40, className = "" }) => (
  <svg 
    width={size} 
    height={size} 
    viewBox="0 0 100 100" 
    className={className}
  >
    {/* Body */}
    <circle cx="50" cy="60" r="26" fill="#22C55E" stroke="#16A34A" strokeWidth="2"/>
    {/* Head */}
    <circle cx="50" cy="35" r="21" fill="#22C55E" stroke="#16A34A" strokeWidth="2"/>
    {/* Castle Tower Crown with battlements */}
    <rect x="28" y="10" width="44" height="16" fill="#6B7280" stroke="#4B5563" strokeWidth="2" rx="2"/>
    {/* Battlements (castle tower tops) */}
    <rect x="30" y="10" width="6" height="8" fill="#6B7280"/>
    <rect x="38" y="10" width="6" height="8" fill="#6B7280"/>
    <rect x="46" y="10" width="8" height="8" fill="#6B7280"/>
    <rect x="56" y="10" width="6" height="8" fill="#6B7280"/>
    <rect x="64" y="10" width="6" height="8" fill="#6B7280"/>
    {/* Tower base decoration */}
    <rect x="30" y="20" width="40" height="3" fill="#4B5563"/>
    {/* Small tower flag */}
    <rect x="49" y="8" width="2" height="8" fill="#374151"/>
    <polygon points="51,8 51,12 58,10" fill="#DC2626"/>
    {/* Snout */}
    <ellipse cx="50" cy="40" rx="7" ry="5" fill="#16A34A"/>
    <circle cx="47" cy="40" r="1.5" fill="black"/>
    <circle cx="53" cy="40" r="1.5" fill="black"/>
    {/* Eyes */}
    <circle cx="43" cy="28" r="4" fill="white"/>
    <circle cx="57" cy="28" r="4" fill="white"/>
    <circle cx="43" cy="26" r="2" fill="black"/>
    <circle cx="57" cy="26" r="2" fill="black"/>
    {/* Stern military eyebrows */}
    <path d="M39,24 L45,22" stroke="black" strokeWidth="2" strokeLinecap="round"/>
    <path d="M61,24 L55,22" stroke="black" strokeWidth="2" strokeLinecap="round"/>
    {/* Ears */}
    <ellipse cx="30" cy="25" rx="4" ry="7" fill="#16A34A"/>
    <ellipse cx="70" cy="25" rx="4" ry="7" fill="#16A34A"/>
  </svg>
);

export default CorporalPig;
