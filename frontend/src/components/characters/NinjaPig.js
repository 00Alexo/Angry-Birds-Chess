import React from 'react';

// Ninja Pig - Knight piece
// Stealthy pig with unique L-shaped movement
export const NinjaPig = ({ size = 40, className = "" }) => (
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
    {/* Ninja mask */}
    <path d="M30,30 Q50,15 70,30 L70,45 Q50,40 30,45 Z" fill="#1F2937"/>
    {/* Eye slits */}
    <ellipse cx="42" cy="30" rx="3" ry="5" fill="white"/>
    <ellipse cx="58" cy="30" rx="3" ry="5" fill="white"/>
    <circle cx="42" cy="30" r="2" fill="black"/>
    <circle cx="58" cy="30" r="2" fill="black"/>
    {/* Snout (partially visible) */}
    <ellipse cx="50" cy="42" rx="6" ry="4" fill="#16A34A"/>
    <circle cx="48" cy="42" r="1" fill="black"/>
    <circle cx="52" cy="42" r="1" fill="black"/>
    {/* Ears */}
    <ellipse cx="32" cy="25" rx="4" ry="6" fill="#16A34A"/>
    <ellipse cx="68" cy="25" rx="4" ry="6" fill="#16A34A"/>
    {/* Throwing star indicator */}
    <g transform="translate(75,20) scale(0.3)">
      <path d="M0,-10 L3,-3 L10,0 L3,3 L0,10 L-3,3 L-10,0 L-3,-3 Z" fill="#9CA3AF"/>
    </g>
  </svg>
);

export default NinjaPig;
