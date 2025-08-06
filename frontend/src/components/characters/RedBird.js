import React from 'react';

// Red Bird - King piece
// Leader of the flock, provides protection and leadership
export const RedBird = ({ size = 40, className = "" }) => (
  <svg 
    width={size} 
    height={size} 
    viewBox="0 0 100 100" 
    className={className}
  >
    {/* Body */}
    <circle cx="50" cy="55" r="30" fill="#DC2626" stroke="#B91C1C" strokeWidth="2"/>
    {/* Chest */}
    <ellipse cx="50" cy="65" rx="18" ry="12" fill="#FEE2E2"/>
    {/* Head */}
    <circle cx="50" cy="35" r="22" fill="#DC2626" stroke="#B91C1C" strokeWidth="2"/>
    {/* Beak */}
    <polygon points="35,35 25,38 35,41" fill="#F59E0B"/>
    {/* Eyes */}
    <circle cx="45" cy="30" r="6" fill="white"/>
    <circle cx="55" cy="30" r="6" fill="white"/>
    <circle cx="45" cy="28" r="3" fill="black"/>
    <circle cx="55" cy="28" r="3" fill="black"/>
    {/* Eyebrows (angry) */}
    <path d="M38,25 L48,22" stroke="black" strokeWidth="3" strokeLinecap="round"/>
    <path d="M62,25 L52,22" stroke="black" strokeWidth="3" strokeLinecap="round"/>
    {/* Feathers on top */}
    <path d="M45,15 Q50,5 55,15" fill="#B91C1C"/>
  </svg>
);

export default RedBird;
