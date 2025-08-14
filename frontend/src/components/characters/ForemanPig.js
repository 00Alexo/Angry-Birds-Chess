import React from 'react';

// Foreman Pig - Bishop piece
// Tactical pig with construction expertise, moves diagonally
export const ForemanPig = ({ size = 40, className = "" }) => (
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
    {/* Construction Hard Hat (distinctive yellow) */}
    <ellipse cx="50" cy="18" rx="24" ry="12" fill="#FEF3C7" stroke="#F59E0B" strokeWidth="2"/>
    <ellipse cx="50" cy="16" rx="22" ry="10" fill="#FCD34D" stroke="#F59E0B" strokeWidth="1"/>
    {/* Hard hat brim/visor */}
    <ellipse cx="50" cy="22" rx="26" ry="4" fill="#F59E0B" stroke="#D97706" strokeWidth="1"/>
    {/* Construction helmet lamp */}
    <rect x="48" y="10" width="4" height="6" fill="#374151" rx="2"/>
    <circle cx="50" cy="8" r="3" fill="#FEF3C7" stroke="#F59E0B" strokeWidth="1"/>
    <circle cx="50" cy="8" r="1.5" fill="#FBBF24"/>
    {/* Bishop diagonal cross pattern on helmet */}
    <path d="M42,18 L58,18" stroke="#D97706" strokeWidth="1"/>
    <path d="M50,12 L50,24" stroke="#D97706" strokeWidth="1"/>
    {/* Mustache (construction foreman feature) */}
    <ellipse cx="50" cy="36" rx="9" ry="3" fill="#8B4513"/>
    {/* Snout */}
    <ellipse cx="50" cy="41" rx="7" ry="5" fill="#16A34A"/>
    <circle cx="47" cy="41" r="1.5" fill="black"/>
    <circle cx="53" cy="41" r="1.5" fill="black"/>
    {/* Eyes with safety glasses */}
    <circle cx="43" cy="28" r="5" fill="white"/>
    <circle cx="57" cy="28" r="5" fill="white"/>
    <circle cx="43" cy="27" r="2.5" fill="black"/>
    <circle cx="57" cy="27" r="2.5" fill="black"/>
    {/* Safety glasses frame */}
    <circle cx="43" cy="28" r="7" fill="none" stroke="#374151" strokeWidth="2"/>
    <circle cx="57" cy="28" r="7" fill="none" stroke="#374151" strokeWidth="2"/>
    <line x1="50" y1="28" x2="50" y2="28" stroke="#374151" strokeWidth="3"/>
    {/* Glasses strap */}
    <path d="M36,26 Q30,20 30,25 Q30,30 36,30" stroke="#374151" strokeWidth="2" fill="none"/>
    <path d="M64,26 Q70,20 70,25 Q70,30 64,30" stroke="#374151" strokeWidth="2" fill="none"/>
    {/* Ears */}
    <ellipse cx="30" cy="25" rx="4" ry="7" fill="#16A34A"/>
    <ellipse cx="70" cy="25" rx="4" ry="7" fill="#16A34A"/>
  </svg>
);

export default ForemanPig;
