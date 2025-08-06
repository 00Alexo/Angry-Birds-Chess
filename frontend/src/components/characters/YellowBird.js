import React from 'react';

// Yellow Bird (Chuck) - Rook piece
// Fast-moving bird, moves in straight lines across the board
export const YellowBird = ({ size = 40, className = "" }) => (
  <svg 
    width={size} 
    height={size} 
    viewBox="0 0 100 100" 
    className={className}
  >
    {/* Body - triangular shape */}
    <polygon points="50,20 25,70 75,70" fill="#FCD34D" stroke="#F59E0B" strokeWidth="2"/>
    {/* Chest */}
    <polygon points="50,35 35,60 65,60" fill="#FEF3C7"/>
    {/* Eyes */}
    <circle cx="42" cy="35" r="5" fill="white"/>
    <circle cx="58" cy="35" r="5" fill="white"/>
    <circle cx="42" cy="33" r="2.5" fill="black"/>
    <circle cx="58" cy="33" r="2.5" fill="black"/>
    {/* Beak */}
    <polygon points="38,38 28,40 38,42" fill="#F97316"/>
    {/* Eyebrows */}
    <path d="M37,30 L45,27" stroke="black" strokeWidth="2" strokeLinecap="round"/>
    <path d="M63,30 L55,27" stroke="black" strokeWidth="2" strokeLinecap="round"/>
    {/* Top feather */}
    <polygon points="45,20 50,10 55,20" fill="#F59E0B"/>
    {/* Speed lines */}
    <path d="M20,40 L15,40" stroke="#F59E0B" strokeWidth="2" strokeLinecap="round"/>
    <path d="M20,45 L12,45" stroke="#F59E0B" strokeWidth="2" strokeLinecap="round"/>
    <path d="M20,50 L15,50" stroke="#F59E0B" strokeWidth="2" strokeLinecap="round"/>
  </svg>
);

export default YellowBird;
