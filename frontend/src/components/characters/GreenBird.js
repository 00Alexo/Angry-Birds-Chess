import React from 'react';

// Green Bird (Hal) - Bishop piece alternative
// Boomerang movement, can return to original position
export const GreenBird = ({ size = 40, className = "" }) => (
  <svg 
    width={size} 
    height={size} 
    viewBox="0 0 100 100" 
    className={className}
  >
    {/* Body */}
    <ellipse cx="50" cy="55" rx="20" ry="25" fill="#22C55E" stroke="#16A34A" strokeWidth="2"/>
    {/* Chest */}
    <ellipse cx="50" cy="62" rx="12" ry="15" fill="#DCFCE7"/>
    {/* Head */}
    <circle cx="50" cy="35" r="18" fill="#22C55E" stroke="#16A34A" strokeWidth="2"/>
    {/* Beak (longer, curved) */}
    <path d="M32,35 Q22,37 32,40 Q27,37 32,35" fill="#F59E0B"/>
    {/* Eyes */}
    <circle cx="48" cy="30" r="4" fill="white"/>
    <circle cx="58" cy="30" r="4" fill="white"/>
    <circle cx="48" cy="28" r="2" fill="black"/>
    <circle cx="58" cy="28" r="2" fill="black"/>
    {/* Mohawk */}
    <polygon points="45,20 50,8 55,20" fill="#16A34A"/>
    {/* Boomerang indicator */}
    <path d="M75,20 Q80,15 85,20 Q80,25 75,20" fill="none" stroke="#22C55E" strokeWidth="2"/>
  </svg>
);

export default GreenBird;
