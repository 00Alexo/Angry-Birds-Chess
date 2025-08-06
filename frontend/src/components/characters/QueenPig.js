import React from 'react';

// Queen Pig - Queen piece
// Most powerful pig, can move in any direction
export const QueenPig = ({ size = 40, className = "" }) => (
  <svg 
    width={size} 
    height={size} 
    viewBox="0 0 100 100" 
    className={className}
  >
    {/* Body */}
    <circle cx="50" cy="60" r="28" fill="#22C55E" stroke="#16A34A" strokeWidth="2"/>
    {/* Head */}
    <circle cx="50" cy="35" r="23" fill="#22C55E" stroke="#16A34A" strokeWidth="2"/>
    {/* Tiara */}
    <path d="M32,22 Q40,15 50,22 Q60,15 68,22" fill="#FCD34D" stroke="#F59E0B" strokeWidth="2"/>
    <circle cx="42" cy="18" r="2" fill="#DC2626"/>
    <circle cx="50" cy="16" r="2.5" fill="#DC2626"/>
    <circle cx="58" cy="18" r="2" fill="#DC2626"/>
    {/* Snout */}
    <ellipse cx="50" cy="40" rx="8" ry="6" fill="#16A34A"/>
    <circle cx="47" cy="40" r="1.5" fill="black"/>
    <circle cx="53" cy="40" r="1.5" fill="black"/>
    {/* Eyes with eyelashes */}
    <circle cx="43" cy="28" r="4" fill="white"/>
    <circle cx="57" cy="28" r="4" fill="white"/>
    <circle cx="43" cy="26" r="2" fill="black"/>
    <circle cx="57" cy="26" r="2" fill="black"/>
    <path d="M39,24 L37,22" stroke="black" strokeWidth="1.5" strokeLinecap="round"/>
    <path d="M41,23 L39,21" stroke="black" strokeWidth="1.5" strokeLinecap="round"/>
    <path d="M61,24 L63,22" stroke="black" strokeWidth="1.5" strokeLinecap="round"/>
    <path d="M59,23 L61,21" stroke="black" strokeWidth="1.5" strokeLinecap="round"/>
    {/* Ears */}
    <ellipse cx="30" cy="25" rx="5" ry="8" fill="#16A34A"/>
    <ellipse cx="70" cy="25" rx="5" ry="8" fill="#16A34A"/>
  </svg>
);

export default QueenPig;
