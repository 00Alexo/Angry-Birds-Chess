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
    {/* Hard hat */}
    <ellipse cx="50" cy="18" rx="22" ry="10" fill="#FBBF24" stroke="#F59E0B" strokeWidth="2"/>
    <rect x="45" y="13" width="10" height="3" fill="#F59E0B"/>
    {/* Mustache */}
    <ellipse cx="50" cy="35" rx="8" ry="3" fill="#8B4513"/>
    {/* Snout */}
    <ellipse cx="50" cy="40" rx="7" ry="5" fill="#16A34A"/>
    <circle cx="47" cy="40" r="1.5" fill="black"/>
    <circle cx="53" cy="40" r="1.5" fill="black"/>
    {/* Eyes with glasses */}
    <circle cx="43" cy="28" r="4" fill="white"/>
    <circle cx="57" cy="28" r="4" fill="white"/>
    <circle cx="43" cy="26" r="2" fill="black"/>
    <circle cx="57" cy="26" r="2" fill="black"/>
    <circle cx="43" cy="28" r="6" fill="none" stroke="#4B5563" strokeWidth="2"/>
    <circle cx="57" cy="28" r="6" fill="none" stroke="#4B5563" strokeWidth="2"/>
    <line x1="49" y1="28" x2="51" y2="28" stroke="#4B5563" strokeWidth="2"/>
    {/* Ears */}
    <ellipse cx="30" cy="25" rx="4" ry="7" fill="#16A34A"/>
    <ellipse cx="70" cy="25" rx="4" ry="7" fill="#16A34A"/>
  </svg>
);

export default ForemanPig;
