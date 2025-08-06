import React from 'react';

// White Bird (Matilda) - Pawn piece
// Basic movement, can drop explosive eggs
export const WhiteBird = ({ size = 40, className = "" }) => (
  <svg 
    width={size} 
    height={size} 
    viewBox="0 0 100 100" 
    className={className}
  >
    {/* Body */}
    <ellipse cx="50" cy="58" rx="22" ry="25" fill="#F8FAFC" stroke="#475569" strokeWidth="3"/>
    {/* Head */}
    <circle cx="50" cy="35" r="18" fill="#F8FAFC" stroke="#475569" strokeWidth="3"/>
    {/* Beak */}
    <polygon points="35,35 25,37 35,39" fill="#F97316" stroke="#C2410C" strokeWidth="1"/>
    {/* Eyes */}
    <circle cx="45" cy="30" r="4" fill="white" stroke="#1E293B" strokeWidth="1"/>
    <circle cx="55" cy="30" r="4" fill="white" stroke="#1E293B" strokeWidth="1"/>
    <circle cx="45" cy="28" r="2" fill="black"/>
    <circle cx="55" cy="28" r="2" fill="black"/>
    {/* Top knot */}
    <ellipse cx="50" cy="20" rx="8" ry="12" fill="#E2E8F0" stroke="#475569" strokeWidth="2"/>
    <circle cx="50" cy="15" r="3" fill="#F97316" stroke="#C2410C" strokeWidth="1"/>
    {/* Egg indicator */}
    <ellipse cx="50" cy="75" rx="4" ry="5" fill="#FEF3C7" stroke="#B45309" strokeWidth="2"/>
    {/* Additional shadow for better visibility */}
    <ellipse cx="52" cy="60" rx="20" ry="23" fill="none" stroke="#64748B" strokeWidth="1" opacity="0.3"/>
  </svg>
);

export default WhiteBird;
