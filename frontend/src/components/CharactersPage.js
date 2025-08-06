import React from 'react';
import { IoArrowBack } from 'react-icons/io5';
import { GiChessKing, GiChessQueen, GiChessRook, GiChessBishop, GiChessKnight, GiChessPawn } from 'react-icons/gi';
import { 
  RedBird, Stella, YellowBird, BlueBird, BlackBird, WhiteBird,
  KingPig, QueenPig, CorporalPig, ForemanPig, NinjaPig, RegularPig 
} from './characters';

const CharactersPage = ({ onBack }) => {
  const birdTeam = [
    {
      id: 1,
      name: "Red Bird",
      role: "King",
      icon: <RedBird size={80} />,
      chessIcon: <GiChessKing size={40} />,
      description: "The brave leader of the bird flock. Must be protected at all costs!",
      ability: "Royal leader, moves one square in any direction. Keep him safe to win!",
      bgColor: "from-red-500 to-red-700",
      textColor: "text-red-100"
    },
    {
      id: 2,
      name: "Stella",
      role: "Queen",
      icon: <Stella size={80} />,
      chessIcon: <GiChessQueen size={40} />,
      description: "The pink powerhouse and most versatile bird in your army.",
      ability: "Most powerful piece, moves unlimited squares in all directions - horizontally, vertically, and diagonally.",
      bgColor: "from-pink-500 to-pink-700",
      textColor: "text-pink-100"
    },
    {
      id: 3,
      name: "Chuck",
      role: "Rook/Tower",
      icon: <YellowBird size={80} />,
      chessIcon: <GiChessRook size={40} />,
      description: "The fastest bird in the flock, perfect for straight-line attacks.",
      ability: "Speed demon, moves unlimited squares in straight lines - horizontally and vertically.",
      bgColor: "from-yellow-500 to-yellow-700",
      textColor: "text-yellow-100"
    },
    {
      id: 4,
      name: "Matilda",
      role: "Bishop",
      icon: <WhiteBird size={80} />,
      chessIcon: <GiChessBishop size={40} />,
      description: "The mother hen with tactical diagonal movement abilities.",
      ability: "Diagonal specialist, moves unlimited squares diagonally.",
      bgColor: "from-gray-300 to-gray-500",
      textColor: "text-gray-800"
    },
    {
      id: 5,
      name: "Bomb",
      role: "Knight",
      icon: <BlackBird size={80} />,
      chessIcon: <GiChessKnight size={40} />,
      description: "The explosive bird that can jump over obstacles.",
      ability: "Explosive jumper, moves in L-shape (2+1 squares) and can jump over pieces.",
      bgColor: "from-gray-700 to-gray-900",
      textColor: "text-gray-100"
    },
    {
      id: 6,
      name: "Jay, Jake & Jim",
      role: "Pawns",
      icon: <BlueBird size={80} />,
      chessIcon: <GiChessPawn size={40} />,
      description: "The blue trio that forms your frontline army.",
      ability: "Frontline fighters, move forward one square (two on first move), attack diagonally.",
      bgColor: "from-blue-500 to-blue-700",
      textColor: "text-blue-100"
    }
  ];

  const pigArmy = [
    {
      id: 8,
      name: "King Pig",
      role: "King",
      icon: <KingPig size={80} />,
      chessIcon: <GiChessKing size={40} />,
      description: "The royal pig leader that the AI will protect fiercely.",
      ability: "Royal target, moves one square in any direction. Defeat him to win!",
      bgColor: "from-green-600 to-green-800",
      textColor: "text-green-100"
    },
    {
      id: 9,
      name: "Queen Pig",
      role: "Queen",
      icon: <QueenPig size={80} />,
      chessIcon: <GiChessQueen size={40} />,
      description: "The most dangerous pig in the AI army with unlimited power.",
      ability: "Most powerful enemy, moves unlimited squares in all directions.",
      bgColor: "from-green-600 to-green-800",
      textColor: "text-green-100"
    },
    {
      id: 10,
      name: "Corporal Pig",
      role: "Rook",
      icon: <CorporalPig size={80} />,
      chessIcon: <GiChessRook size={40} />,
      description: "Military pig with strong defensive capabilities.",
      ability: "Fortress guard, moves unlimited squares horizontally and vertically.",
      bgColor: "from-green-600 to-green-800",
      textColor: "text-green-100"
    },
    {
      id: 11,
      name: "Foreman Pig",
      role: "Bishop",
      icon: <ForemanPig size={80} />,
      chessIcon: <GiChessBishop size={40} />,
      description: "Construction expert pig with tactical diagonal attacks.",
      ability: "Construction tactician, moves unlimited squares diagonally.",
      bgColor: "from-green-600 to-green-800",
      textColor: "text-green-100"
    },
    {
      id: 12,
      name: "Ninja Pig",
      role: "Knight",
      icon: <NinjaPig size={80} />,
      chessIcon: <GiChessKnight size={40} />,
      description: "Stealthy pig that can appear anywhere on the battlefield.",
      ability: "Shadow warrior, moves in L-shape and jumps over pieces.",
      bgColor: "from-green-600 to-green-800",
      textColor: "text-green-100"
    },
    {
      id: 13,
      name: "Regular Pigs",
      role: "Pawns",
      icon: <RegularPig size={80} />,
      chessIcon: <GiChessPawn size={40} />,
      description: "Basic pig soldiers forming the AI's frontline army.",
      ability: "Frontline army, moves forward one square, attacks diagonally.",
      bgColor: "from-green-600 to-green-800",
      textColor: "text-green-100"
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-400 via-pink-300 to-indigo-400 p-4">
      {/* Header */}
      <div className="container mx-auto">
        <div className="flex items-center justify-between mb-8">
          <button
            onClick={onBack}
            className="bg-gradient-to-r from-gray-500 to-gray-600 hover:from-gray-600 hover:to-gray-700 
                       text-white font-bold px-6 py-3 rounded-full shadow-lg 
                       button-bounce transform hover:scale-105 transition-all duration-200 flex items-center"
          >
            <IoArrowBack className="mr-2" />
            Back to Menu
          </button>
          
          <h1 className="text-4xl md:text-6xl font-bold game-title text-center">
            ⚔️ BIRDS vs PIGS ⚔️
          </h1>
          
          <div className="w-32"></div> {/* Spacer for centering */}
        </div>

        {/* Your Bird Team Section */}
        <div className="mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-center text-white mb-8 drop-shadow-lg">
            🐦 YOUR BIRD ARMY 🐦
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
            {birdTeam.map((character) => (
              <div
                key={character.id}
                className={`bg-gradient-to-br ${character.bgColor} rounded-3xl p-4 shadow-2xl transform hover:scale-105 transition-all duration-300`}
              >
                {/* Character Icon and Chess Piece */}
                <div className="flex items-center justify-center mb-3 space-x-2">
                  <div className="animate-bounce">
                    {character.icon}
                  </div>
                  <div className={`${character.textColor}`}>
                    {character.chessIcon}
                  </div>
                </div>

                {/* Character Info */}
                <div className="text-center mb-3">
                  <h3 className={`text-lg font-bold ${character.textColor} mb-1`}>
                    {character.name}
                  </h3>
                  <h4 className={`text-md font-semibold ${character.textColor} opacity-90 mb-2`}>
                    Chess {character.role}
                  </h4>
                  <p className={`${character.textColor} opacity-80 text-xs mb-3`}>
                    {character.description}
                  </p>
                </div>

                {/* Ability Description */}
                <div className="bg-black/20 rounded-xl p-3">
                  <h5 className={`font-semibold ${character.textColor} mb-1 text-xs`}>Ability:</h5>
                  <p className={`${character.textColor} opacity-90 text-xs`}>
                    {character.ability}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Enemy Pig Army Section */}
        <div className="mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-center text-white mb-8 drop-shadow-lg">
            🐷 ENEMY PIG ARMY 🐷
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
            {pigArmy.map((character) => (
              <div
                key={character.id}
                className={`bg-gradient-to-br ${character.bgColor} rounded-3xl p-4 shadow-2xl transform hover:scale-105 transition-all duration-300 border-2 border-red-400`}
              >
                {/* Character Icon and Chess Piece */}
                <div className="flex items-center justify-center mb-3 space-x-2">
                  <div className="animate-pulse">
                    {character.icon}
                  </div>
                  <div className="text-2xl">💀</div>
                  <div className={`${character.textColor}`}>
                    {character.chessIcon}
                  </div>
                </div>

                {/* Character Info */}
                <div className="text-center mb-3">
                  <h3 className={`text-lg font-bold ${character.textColor} mb-1`}>
                    {character.name}
                  </h3>
                  <h4 className={`text-md font-semibold ${character.textColor} opacity-90 mb-2`}>
                    Enemy {character.role}
                  </h4>
                  <p className={`${character.textColor} opacity-80 text-xs mb-3`}>
                    {character.description}
                  </p>
                </div>

                {/* Ability Description */}
                <div className="bg-black/20 rounded-xl p-3">
                  <h5 className={`font-semibold ${character.textColor} mb-1 text-xs`}>AI Ability:</h5>
                  <p className={`${character.textColor} opacity-90 text-xs`}>
                    {character.ability}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Battle Strategy Tips */}
        <div className="text-center mt-12">
          <div className="bg-white/20 backdrop-blur-md rounded-2xl p-6 max-w-4xl mx-auto">
            <h3 className="text-2xl font-bold text-white mb-4">⚡ Battle Strategy Tips</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-white/90">
              <div className="bg-white/10 rounded-lg p-3">
                <h4 className="font-bold mb-1">👑 Protect Red Bird</h4>
                <p className="text-sm">Your king is your most important piece - keep him safe!</p>
              </div>
              <div className="bg-white/10 rounded-lg p-3">
                <h4 className="font-bold mb-1">� Unleash Stella</h4>
                <p className="text-sm">Your queen is your strongest weapon - use her strategically!</p>
              </div>
              <div className="bg-white/10 rounded-lg p-3">
                <h4 className="font-bold mb-1">⚡ Chuck's Speed</h4>
                <p className="text-sm">Use Chuck for powerful straight-line attacks and board control!</p>
              </div>
              <div className="bg-white/10 rounded-lg p-3">
                <h4 className="font-bold mb-1">� Bomb's Surprise</h4>
                <p className="text-sm">Jump over enemy lines and create explosive surprise attacks!</p>
              </div>
            </div>
            <div className="mt-4 bg-red-500/20 rounded-lg p-4 border-2 border-red-400">
              <h4 className="font-bold text-white mb-2">🎯 Your Mission: Defeat the King Pig!</h4>
              <p className="text-white/90 text-sm">
                The AI has a full army of pigs, but you only need your bird team to checkmate their King Pig to win!
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CharactersPage;
