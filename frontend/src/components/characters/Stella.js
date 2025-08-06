import React from 'react';

// Stella - Pink Bird - Queen piece
// Most powerful bird, can move in any direction
export const Stella = ({ size = 40, className = "" }) => (
  <svg 
    width={size} 
    height={size} 
    viewBox="0 0 100 100" 
    className={className}
  >
    {/* Body */}
    <circle cx="50" cy="55" r="28" fill="#EC4899" stroke="#DB2777" strokeWidth="2"/>
    {/* Chest */}
    <ellipse cx="50" cy="65" rx="16" ry="10" fill="#FCE7F3"/>
    {/* Head */}
    <circle cx="50" cy="35" r="20" fill="#EC4899" stroke="#DB2777" strokeWidth="2"/>
    {/* Beak */}
    <polygon points="35,35 25,37 35,39" fill="#F97316"/>
    {/* Eyes */}
    <circle cx="45" cy="30" r="5" fill="white"/>
    <circle cx="55" cy="30" r="5" fill="white"/>
    <circle cx="45" cy="28" r="2.5" fill="black"/>
    <circle cx="55" cy="28" r="2.5" fill="black"/>
    {/* Eyelashes */}
    <path d="M38,25 L40,22" stroke="black" strokeWidth="2" strokeLinecap="round"/>
    <path d="M42,24 L44,21" stroke="black" strokeWidth="1.5" strokeLinecap="round"/>
    <path d="M62,25 L60,22" stroke="black" strokeWidth="2" strokeLinecap="round"/>
    <path d="M58,24 L56,21" stroke="black" strokeWidth="1.5" strokeLinecap="round"/>
    {/* Top feathers (crown-like) */}
    <path d="M40,18 Q45,8 50,18" fill="#DB2777"/>
    <path d="M50,18 Q55,8 60,18" fill="#DB2777"/>
    {/* Bubble ability indicator */}
    <circle cx="70" cy="25" r="3" fill="#FBBF24" opacity="0.7"/>
    <circle cx="75" cy="30" r="2" fill="#FBBF24" opacity="0.5"/>
  </svg>
);

export default Stella;
