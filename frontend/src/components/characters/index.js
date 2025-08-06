// Birds (Player Team)
export { default as RedBird } from './RedBird';
export { default as Stella } from './Stella';
export { default as YellowBird } from './YellowBird';
export { default as BlueBird } from './BlueBird';
export { default as BlackBird } from './BlackBird';
export { default as WhiteBird } from './WhiteBird';

// Pigs (AI Team)
export { default as KingPig } from './KingPig';
export { default as QueenPig } from './QueenPig';
export { default as CorporalPig } from './CorporalPig';
export { default as ForemanPig } from './ForemanPig';
export { default as NinjaPig } from './NinjaPig';
export { default as RegularPig } from './RegularPig';

// Team configurations
export const BIRD_TEAM = {
  king: 'RedBird',
  queen: 'Stella',
  rook: 'YellowBird',
  bishop: 'WhiteBird',
  knight: 'BlackBird',
  pawn: 'BlueBird'
};

export const PIG_TEAM = {
  king: 'KingPig',
  queen: 'QueenPig',
  rook: 'CorporalPig',
  bishop: 'ForemanPig',
  knight: 'NinjaPig',
  pawn: 'RegularPig'
};
