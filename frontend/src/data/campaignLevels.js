import { 
  RedBird, Stella, YellowBird, BlueBird, BlackBird, WhiteBird,
  KingPig, QueenPig, CorporalPig, ForemanPig, NinjaPig, RegularPig 
} from '../components/characters';

export const campaignLevels = [
  {
    id: 1,
    name: "Grassland Outpost",
    difficulty: "easy",
    stars: 0,
    completed: false,
    unlocked: true,
    enemy: <RegularPig size={45} />,
    position: { x: 12, y: 88 },
    coinReward: 50,
    terrain: "Plains",
    // Starter level - you have advantage with rook
    birdPieces: {
      king: true,
      pawns: 6,
      rooks: 1, // You get 1 rook advantage
      knights: 0,
      bishops: 0,
      queen: false
    },
    pigPieces: {
      king: true,
      pawns: 4, // Enemy has fewer pawns
      rooks: 0,
      knights: 0,
      bishops: 0,
      queen: false
    }
  },
  {
    id: 2,
    name: "Timber Barricades",
    difficulty: "easy", 
    stars: 0,
    completed: false,
    unlocked: false,
    enemy: <CorporalPig size={45} />,
    position: { x: 25, y: 75 },
    coinReward: 75,
    terrain: "Forest",
    // You get knight advantage
    birdPieces: {
      king: true,
      pawns: 7,
      rooks: 1,
      knights: 1, // You get knight
      bishops: 0,
      queen: false
    },
    pigPieces: {
      king: true,
      pawns: 5,
      rooks: 0,
      knights: 0, // Enemy has no knight
      bishops: 0,
      queen: false
    }
  },
  {
    id: 3,
    name: "Stone Stronghold",
    difficulty: "easy",
    stars: 0,
    completed: false,
    unlocked: false,
    enemy: <ForemanPig size={45} />,
    position: { x: 42, y: 62 },
    coinReward: 100,
    terrain: "Mountain",
    // Balanced with minor advantage
    birdPieces: {
      king: true,
      pawns: 7,
      rooks: 1,
      knights: 1,
      bishops: 1, // You get bishop
      queen: false
    },
    pigPieces: {
      king: true,
      pawns: 6,
      rooks: 1,
      knights: 0,
      bishops: 0, // Enemy has no bishop
      queen: false
    }
  },
  {
    id: 4,
    name: "Misty Marshlands",
    difficulty: "medium",
    stars: 0,
    completed: false,
    unlocked: false,
    enemy: <NinjaPig size={45} />,
    position: { x: 58, y: 52 },
    coinReward: 150,
    terrain: "Swamp",
    // More balanced
    birdPieces: {
      king: true,
      pawns: 8,
      rooks: 2,
      knights: 1,
      bishops: 1,
      queen: false
    },
    pigPieces: {
      king: true,
      pawns: 7,
      rooks: 1,
      knights: 1,
      bishops: 1,
      queen: false
    }
  },
  {
    id: 5,
    name: "Desert Citadel",
    difficulty: "medium",
    stars: 0,
    completed: false,
    unlocked: false,
    enemy: <QueenPig size={45} />,
    position: { x: 72, y: 68 },
    coinReward: 200,
    terrain: "Desert",
    // Enemy gets queen advantage
    birdPieces: {
      king: true,
      pawns: 8,
      rooks: 2,
      knights: 2,
      bishops: 1,
      queen: false // You don't have queen
    },
    pigPieces: {
      king: true,
      pawns: 6,
      rooks: 1,
      knights: 1,
      bishops: 1,
      queen: true // Enemy has queen
    }
  },
  {
    id: 6,
    name: "Frozen Tundra",
    difficulty: "medium",
    stars: 0,
    completed: false,
    unlocked: false,
    enemy: <CorporalPig size={45} />,
    position: { x: 85, y: 55 },
    coinReward: 250,
    terrain: "Ice",
    // Balanced queens
    birdPieces: {
      king: true,
      pawns: 8,
      rooks: 2,
      knights: 2,
      bishops: 2,
      queen: true
    },
    pigPieces: {
      king: true,
      pawns: 8,
      rooks: 2,
      knights: 2,
      bishops: 2,
      queen: true
    }
  },
  {
    id: 7,
    name: "Volcanic Peaks",
    difficulty: "hard",
    stars: 0,
    completed: false,
    unlocked: false,
    enemy: <ForemanPig size={45} />,
    position: { x: 92, y: 38 },
    coinReward: 300,
    terrain: "Volcano",
    // Enemy advantage
    birdPieces: {
      king: true,
      pawns: 7,
      rooks: 2,
      knights: 2,
      bishops: 2,
      queen: true
    },
    pigPieces: {
      king: true,
      pawns: 8,
      rooks: 2,
      knights: 2,
      bishops: 2,
      queen: true
    }
  },
  {
    id: 8,
    name: "Sky Gardens",
    difficulty: "hard",
    stars: 0,
    completed: false,
    unlocked: false,
    enemy: <NinjaPig size={45} />,
    position: { x: 88, y: 25 },
    coinReward: 400,
    terrain: "Cloud",
    // Enemy has more pieces
    birdPieces: {
      king: true,
      pawns: 6,
      rooks: 1,
      knights: 2,
      bishops: 2,
      queen: true
    },
    pigPieces: {
      king: true,
      pawns: 8,
      rooks: 2,
      knights: 2,
      bishops: 2,
      queen: true
    }
  },
  {
    id: 9,
    name: "Abyssal Depths",
    difficulty: "hard",
    stars: 0,
    completed: false,
    unlocked: false,
    enemy: <QueenPig size={45} />,
    position: { x: 78, y: 12 },
    coinReward: 500,
    terrain: "Abyss",
    // Significant enemy advantage
    birdPieces: {
      king: true,
      pawns: 5,
      rooks: 1,
      knights: 1,
      bishops: 1,
      queen: true
    },
    pigPieces: {
      king: true,
      pawns: 8,
      rooks: 2,
      knights: 2,
      bishops: 2,
      queen: true
    }
  },
  {
    id: 10,
    name: "Crystal Caverns",
    difficulty: "hard",
    stars: 0,
    completed: false,
    unlocked: false,
    enemy: <ForemanPig size={45} />,
    position: { x: 75, y: 45 },
    coinReward: 600,
    terrain: "Crystal"
  },
  {
    id: 11,
    name: "Shadow Spire",
    difficulty: "hard",
    stars: 0,
    completed: false,
    unlocked: false,
    enemy: <NinjaPig size={45} />,
    position: { x: 42, y: 28 },
    coinReward: 700,
    terrain: "Shadow"
  },
  {
    id: 12,
    name: "King's Dominion",
    difficulty: "hard",
    stars: 0,
    completed: false,
    unlocked: false,
    enemy: <KingPig size={45} />,
    position: { x: 62, y: 18 },
    coinReward: 800,
    terrain: "Royal"
  },
  {
    id: 13,
    name: "The Obsidian Throne",
    difficulty: "nightmare",
    stars: 0,
    completed: false,
    unlocked: false,
    enemy: <KingPig size={50} />,
    position: { x: 35, y: 12 },
    coinReward: 1000,
    terrain: "Throne"
  }
];
