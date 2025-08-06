import React from 'react';

// King Pig - King piece
// Leader of the pig army, must be protected at all costs
export const KingPig = ({ size = 40, className = "" }) => (
  <svg 
    width={size} 
    height={size} 
    viewBox="0 0 100 100" 
    className={className}
  >
    {/* Body */}
    <circle cx="50" cy="60" r="30" fill="#22C55E" stroke="#16A34A" strokeWidth="2"/>
    {/* Head */}
    <circle cx="50" cy="35" r="25" fill="#22C55E" stroke="#16A34A" strokeWidth="2"/>
    {/* Crown */}
    <polygon points="30,20 35,8 40,15 45,5 50,15 55,5 60,15 65,8 70,20" fill="#FCD34D" stroke="#F59E0B" strokeWidth="2"/>
    <circle cx="50" cy="10" r="3" fill="#DC2626"/>
    {/* Snout */}
    <ellipse cx="50" cy="40" rx="8" ry="6" fill="#16A34A"/>
    <circle cx="47" cy="40" r="1.5" fill="black"/>
    <circle cx="53" cy="40" r="1.5" fill="black"/>
    {/* Eyes */}
    <circle cx="43" cy="28" r="4" fill="white"/>
    <circle cx="57" cy="28" r="4" fill="white"/>
    <circle cx="43" cy="26" r="2" fill="black"/>
    <circle cx="57" cy="26" r="2" fill="black"/>
    {/* Ears */}
    <ellipse cx="30" cy="25" rx="5" ry="8" fill="#16A34A"/>
    <ellipse cx="70" cy="25" rx="5" ry="8" fill="#16A34A"/>
  </svg>
);

export default KingPig;
