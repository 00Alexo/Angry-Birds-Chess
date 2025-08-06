import React from 'react';

// Black Bird (Bomb) - Knight piece
// Unique L-shaped movement pattern, explosive power
export const BlackBird = ({ size = 40, className = "" }) => (
  <svg 
    width={size} 
    height={size} 
    viewBox="0 0 100 100" 
    className={className}
  >
    {/* Body */}
    <circle cx="50" cy="55" r="28" fill="#1F2937" stroke="#111827" strokeWidth="2"/>
    {/* Chest */}
    <ellipse cx="50" cy="65" rx="16" ry="10" fill="#6B7280"/>
    {/* Head */}
    <circle cx="50" cy="35" r="20" fill="#1F2937" stroke="#111827" strokeWidth="2"/>
    {/* Fuse */}
    <line x1="50" y1="15" x2="55" y2="5" stroke="#DC2626" strokeWidth="3" strokeLinecap="round"/>
    <circle cx="55" cy="5" r="2" fill="#F59E0B"/>
    {/* Beak */}
    <polygon points="35,35 25,37 35,39" fill="#F59E0B"/>
    {/* Eyes */}
    <circle cx="45" cy="30" r="5" fill="white"/>
    <circle cx="55" cy="30" r="5" fill="white"/>
    <circle cx="45" cy="28" r="2.5" fill="black"/>
    <circle cx="55" cy="28" r="2.5" fill="black"/>
    {/* Angry eyebrows */}
    <path d="M38,25 L48,22" stroke="black" strokeWidth="3" strokeLinecap="round"/>
    <path d="M62,25 L52,22" stroke="black" strokeWidth="3" strokeLinecap="round"/>
    {/* Explosion indicators */}
    <path d="M25,45 L20,40" stroke="#DC2626" strokeWidth="2" strokeLinecap="round"/>
    <path d="M75,45 L80,40" stroke="#DC2626" strokeWidth="2" strokeLinecap="round"/>
    <path d="M35,75 L30,80" stroke="#DC2626" strokeWidth="2" strokeLinecap="round"/>
    <path d="M65,75 L70,80" stroke="#DC2626" strokeWidth="2" strokeLinecap="round"/>
  </svg>
);

export default BlackBird;
