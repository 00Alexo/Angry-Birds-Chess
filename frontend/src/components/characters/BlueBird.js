import React from 'react';

// Blue Bird (Jay, Jim, Jake) - Bishop piece
// Moves diagonally, can split into multiple attacks
export const BlueBird = ({ size = 40, className = "" }) => (
  <svg 
    width={size} 
    height={size} 
    viewBox="0 0 100 100" 
    className={className}
  >
    {/* Body */}
    <ellipse cx="50" cy="55" rx="25" ry="28" fill="#3B82F6" stroke="#1D4ED8" strokeWidth="2"/>
    {/* Chest */}
    <ellipse cx="50" cy="62" rx="15" ry="18" fill="#DBEAFE"/>
    {/* Head */}
    <circle cx="50" cy="32" r="20" fill="#3B82F6" stroke="#1D4ED8" strokeWidth="2"/>
    {/* Beak */}
    <polygon points="35,32 25,34 35,36" fill="#F97316"/>
    {/* Eyes */}
    <circle cx="45" cy="28" r="5" fill="white"/>
    <circle cx="55" cy="28" r="5" fill="white"/>
    <circle cx="45" cy="26" r="2.5" fill="black"/>
    <circle cx="55" cy="26" r="2.5" fill="black"/>
    {/* Eyebrows */}
    <path d="M40,23 L48,20" stroke="black" strokeWidth="2" strokeLinecap="round"/>
    <path d="M60,23 L52,20" stroke="black" strokeWidth="2" strokeLinecap="round"/>
    {/* Head feathers */}
    <path d="M40,15 Q50,5 60,15" fill="#1D4ED8"/>
    {/* Split ability indicators */}
    <circle cx="75" cy="25" r="2" fill="#3B82F6" opacity="0.6"/>
    <circle cx="80" cy="20" r="1.5" fill="#3B82F6" opacity="0.4"/>
    <circle cx="25" cy="25" r="2" fill="#3B82F6" opacity="0.6"/>
    <circle cx="20" cy="20" r="1.5" fill="#3B82F6" opacity="0.4"/>
  </svg>
);

export default BlueBird;
