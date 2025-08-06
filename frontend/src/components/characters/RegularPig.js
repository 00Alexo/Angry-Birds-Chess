import React from 'react';

// Regular Pig - Pawn piece
// Basic pig soldier, frontline of the pig army
export const RegularPig = ({ size = 40, className = "" }) => (
  <svg 
    width={size} 
    height={size} 
    viewBox="0 0 100 100" 
    className={className}
  >
    {/* Body */}
    <circle cx="50" cy="60" r="25" fill="#22C55E" stroke="#16A34A" strokeWidth="2"/>
    {/* Head */}
    <circle cx="50" cy="35" r="20" fill="#22C55E" stroke="#16A34A" strokeWidth="2"/>
    {/* Snout */}
    <ellipse cx="50" cy="40" rx="7" ry="5" fill="#16A34A"/>
    <circle cx="47" cy="40" r="1" fill="black"/>
    <circle cx="53" cy="40" r="1" fill="black"/>
    {/* Eyes */}
    <circle cx="45" cy="28" r="3" fill="white"/>
    <circle cx="55" cy="28" r="3" fill="white"/>
    <circle cx="45" cy="26" r="1.5" fill="black"/>
    <circle cx="55" cy="26" r="1.5" fill="black"/>
    {/* Ears */}
    <ellipse cx="35" cy="25" rx="4" ry="6" fill="#16A34A"/>
    <ellipse cx="65" cy="25" rx="4" ry="6" fill="#16A34A"/>
  </svg>
);

export default RegularPig;
