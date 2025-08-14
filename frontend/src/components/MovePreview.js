import React, { useState, useEffect } from 'react';
import { 
  RedBird, Stella, YellowBird, BlueBird, BlackBird, WhiteBird,
  KingPig, QueenPig, CorporalPig, ForemanPig, NinjaPig, RegularPig 
} from './characters';

const MovePreview = ({ moves, gameId, onClose }) => {
  const [currentMoveIndex, setCurrentMoveIndex] = useState(0);
  const [board, setBoard] = useState([]);
  const [highlightSquares, setHighlightSquares] = useState({ from: null, to: null });

  const getClassificationDisplay = (classification) => {
    const displays = {
      'Brilliant': { color: 'text-yellow-300', bg: 'bg-yellow-600/30', icon: '💎' },
      'Best': { color: 'text-green-300', bg: 'bg-green-600/30', icon: '⭐' },
      'Excellent': { color: 'text-blue-300', bg: 'bg-blue-600/30', icon: '✨' },
      'Great': { color: 'text-emerald-300', bg: 'bg-emerald-600/30', icon: '👌' },
      'Good': { color: 'text-cyan-300', bg: 'bg-cyan-600/30', icon: '✅' },
      'Inaccuracy': { color: 'text-yellow-400', bg: 'bg-yellow-600/30', icon: '⚠️' },
      'Mistake': { color: 'text-orange-400', bg: 'bg-orange-600/30', icon: '❗' },
      'Blunder': { color: 'text-red-400', bg: 'bg-red-600/30', icon: '💥' },
      'Missed Win': { color: 'text-red-300', bg: 'bg-red-700/30', icon: '😵' }
    };
    return displays[classification] || { color: 'text-gray-400', bg: 'bg-gray-900/30', icon: '' };
  };

  const currentMove = currentMoveIndex < moves.length ? moves[currentMoveIndex] : null;

  // Initialize starting position
  const initializeBoard = () => {
    const newBoard = Array(8).fill(null).map(() => Array(8).fill(null));
    const pieceSize = 28; // Small pieces for preview

    // Standard chess setup
    // Pigs (black pieces) - top
    newBoard[0][0] = { type: 'rook', team: 'pigs', piece: <CorporalPig size={pieceSize} /> };
    newBoard[0][1] = { type: 'knight', team: 'pigs', piece: <NinjaPig size={pieceSize} /> };
    newBoard[0][2] = { type: 'bishop', team: 'pigs', piece: <ForemanPig size={pieceSize} /> };
    newBoard[0][3] = { type: 'queen', team: 'pigs', piece: <QueenPig size={pieceSize} /> };
    newBoard[0][4] = { type: 'king', team: 'pigs', piece: <KingPig size={pieceSize} /> };
    newBoard[0][5] = { type: 'bishop', team: 'pigs', piece: <ForemanPig size={pieceSize} /> };
    newBoard[0][6] = { type: 'knight', team: 'pigs', piece: <NinjaPig size={pieceSize} /> };
    newBoard[0][7] = { type: 'rook', team: 'pigs', piece: <CorporalPig size={pieceSize} /> };
    
    for (let i = 0; i < 8; i++) {
      newBoard[1][i] = { type: 'pawn', team: 'pigs', piece: <RegularPig size={pieceSize} /> };
    }

    // Birds (white pieces) - bottom
    for (let i = 0; i < 8; i++) {
      newBoard[6][i] = { type: 'pawn', team: 'birds', piece: <BlueBird size={pieceSize} /> };
    }

    newBoard[7][0] = { type: 'rook', team: 'birds', piece: <YellowBird size={pieceSize} /> };
    newBoard[7][1] = { type: 'knight', team: 'birds', piece: <BlackBird size={pieceSize} /> };
    newBoard[7][2] = { type: 'bishop', team: 'birds', piece: <WhiteBird size={pieceSize} /> };
    newBoard[7][3] = { type: 'queen', team: 'birds', piece: <Stella size={pieceSize} /> };
    newBoard[7][4] = { type: 'king', team: 'birds', piece: <RedBird size={pieceSize} /> };
    newBoard[7][5] = { type: 'bishop', team: 'birds', piece: <WhiteBird size={pieceSize} /> };
    newBoard[7][6] = { type: 'knight', team: 'birds', piece: <BlackBird size={pieceSize} /> };
    newBoard[7][7] = { type: 'rook', team: 'birds', piece: <YellowBird size={pieceSize} /> };

    return newBoard;
  };

  // Convert algebraic notation to coordinates
  const algebraicToCoords = (notation) => {
    // Handle array format [row, col] (used by multiplayer)
    if (Array.isArray(notation) && notation.length >= 2) {
      return { row: notation[0], col: notation[1] };
    }
    
    // Handle string algebraic notation (used by single-player)
    if (typeof notation === 'string' && notation.length >= 2) {
      const file = notation.charCodeAt(0) - 97; // 'a' = 0
      const rank = 8 - parseInt(notation[1]); // '8' = 0
      return { row: rank, col: file };
    }
    
    // Invalid format
    return null;
  };

  // Convert coordinates to readable format for display
  const formatMoveCoordinate = (coordinate) => {
    // Handle array format [row, col] -> convert to algebraic notation
    if (Array.isArray(coordinate) && coordinate.length >= 2) {
      const file = String.fromCharCode(97 + coordinate[1]); // 0 = 'a'
      const rank = 8 - coordinate[0]; // 0 = '8'
      return file + rank;
    }
    
    // Handle string format (already algebraic notation)
    if (typeof coordinate === 'string') {
      return coordinate;
    }
    
    // Fallback
    return String(coordinate);
  };

  // Apply move to board
  const applyMoveToBoard = (boardState, move) => {
    const newBoard = boardState.map(row => [...row]);
    const from = algebraicToCoords(move.from);
    const to = algebraicToCoords(move.to);
    
    if (!from || !to) return newBoard;

    const piece = newBoard[from.row][from.col];
    if (!piece) return newBoard;

    // Handle castling first (king and rook move together)
    if (move.special === 'castleKingside' || move.special === 'castleQueenside') {
      // Move king
      newBoard[to.row][to.col] = piece;
      newBoard[from.row][from.col] = null;
      
      // Move rook
      const rookFromCol = move.special === 'castleKingside' ? 7 : 0;
      const rookToCol = move.special === 'castleKingside' ? 5 : 3;
      const rook = newBoard[from.row][rookFromCol];
      if (rook) {
        newBoard[from.row][rookToCol] = rook;
        newBoard[from.row][rookFromCol] = null;
      }
    }
    // Handle en passant (capture pawn on different square)
    else if (move.special === 'enPassant') {
      newBoard[to.row][to.col] = piece;
      newBoard[from.row][from.col] = null;
      // Remove captured pawn
      const capturedPawnRow = piece.team === 'birds' ? to.row + 1 : to.row - 1;
      newBoard[capturedPawnRow][to.col] = null;
    }
    // Handle promotion
    else if (move.special && move.special.includes('promotion')) {
      const promotionType = move.special.split('_')[1] || 'queen';
      const pieceSize = 28;
      let promotedPiece;
      
      if (piece.team === 'birds') {
        switch (promotionType) {
          case 'queen': promotedPiece = <Stella size={pieceSize} />; break;
          case 'rook': promotedPiece = <YellowBird size={pieceSize} />; break;
          case 'bishop': promotedPiece = <WhiteBird size={pieceSize} />; break;
          case 'knight': promotedPiece = <BlackBird size={pieceSize} />; break;
          default: promotedPiece = <Stella size={pieceSize} />;
        }
      } else {
        switch (promotionType) {
          case 'queen': promotedPiece = <QueenPig size={pieceSize} />; break;
          case 'rook': promotedPiece = <CorporalPig size={pieceSize} />; break;
          case 'bishop': promotedPiece = <ForemanPig size={pieceSize} />; break;
          case 'knight': promotedPiece = <NinjaPig size={pieceSize} />; break;
          default: promotedPiece = <QueenPig size={pieceSize} />;
        }
      }
      
      newBoard[to.row][to.col] = { ...piece, type: promotionType, piece: promotedPiece };
      newBoard[from.row][from.col] = null;
    }
    // Regular move (including captures)
    else {
      newBoard[to.row][to.col] = piece;
      newBoard[from.row][from.col] = null;
    }

    return newBoard;
  };

  // Update board when move index changes
  useEffect(() => {
    let boardState = initializeBoard();
    
    // Apply all moves up to current index (but not including it to show "before" state)
    for (let i = 0; i < currentMoveIndex && i < moves.length; i++) {
      boardState = applyMoveToBoard(boardState, moves[i]);
    }
    
    setBoard(boardState);
    
    // Highlight current move (if we're showing a move)
    if (currentMoveIndex < moves.length) {
      const currentMove = moves[currentMoveIndex];
      const from = algebraicToCoords(currentMove.from);
      const to = algebraicToCoords(currentMove.to);
      setHighlightSquares({ from, to });
    } else {
      setHighlightSquares({ from: null, to: null });
    }
  }, [currentMoveIndex, moves]);

  const getSquareColor = (row, col) => {
    const isLight = (row + col) % 2 === 0;
    const isFromHighlight = highlightSquares.from && 
                           highlightSquares.from.row === row && 
                           highlightSquares.from.col === col;
    const isToHighlight = highlightSquares.to && 
                         highlightSquares.to.row === row && 
                         highlightSquares.to.col === col;
    
    if (isFromHighlight) return 'bg-yellow-400 border-yellow-600';
    if (isToHighlight) return 'bg-green-400 border-green-600';
    
    return isLight ? 'bg-amber-100 border-amber-200' : 'bg-amber-800 border-amber-900';
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-800 rounded-2xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold text-white">Move Analysis Preview</h3>
          <button
            onClick={onClose}
            className="text-white/70 hover:text-white text-xl"
          >
            ×
          </button>
        </div>

        {/* Move Navigation */}
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={() => setCurrentMoveIndex(Math.max(0, currentMoveIndex - 1))}
            disabled={currentMoveIndex === 0}
            className="px-3 py-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white rounded text-sm"
          >
            ← Previous
          </button>
          
          <div className="text-center">
            <div className="text-white font-mono">
              {currentMoveIndex === 0 ? 'Starting Position' : 
               currentMoveIndex >= moves.length ? 'Final Position' : 
               `Move ${currentMoveIndex} of ${moves.length}`}
            </div>
            {currentMove && (
              <div className="flex items-center justify-center gap-2 mt-1">
                <span className="text-white font-mono">{formatMoveCoordinate(currentMove.from)}→{formatMoveCoordinate(currentMove.to)}</span>
                <span className="capitalize text-white/70">{currentMove.piece}</span>
                {currentMove.actor && (
                  <span className={`px-2 py-1 rounded text-xs font-semibold ${
                    currentMove.actor === 'player' 
                      ? 'bg-blue-600/30 text-blue-300' 
                      : 'bg-red-600/30 text-red-300'
                  }`}>
                    {currentMove.actor === 'player' ? '👤 Player' : '🤖 AI'}
                  </span>
                )}
                {currentMove.captured && (
                  <span className="text-red-400">x{currentMove.captured}</span>
                )}
                {currentMove.classification && (
                  <div className={`px-2 py-1 rounded text-xs flex items-center gap-1 ${getClassificationDisplay(currentMove.classification).bg} ${getClassificationDisplay(currentMove.classification).color}`}>
                    <span>{getClassificationDisplay(currentMove.classification).icon}</span>
                    <span>{currentMove.classification}</span>
                  </div>
                )}
              </div>
            )}
          </div>
          
          <button
            onClick={() => setCurrentMoveIndex(Math.min(moves.length, currentMoveIndex + 1))}
            disabled={currentMoveIndex === moves.length}
            className="px-3 py-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white rounded text-sm"
          >
            Next →
          </button>
        </div>

        {/* Chess Board */}
        <div className="bg-gradient-to-br from-amber-200 to-amber-600 p-3 rounded-xl shadow-xl mx-auto" style={{ width: 'fit-content' }}>
          <div className="grid grid-cols-8 gap-1 bg-amber-900 p-2 rounded-lg">
            {Array(8).fill(null).map((_, rowIndex) =>
              Array(8).fill(null).map((_, colIndex) => (
                <div
                  key={`${rowIndex}-${colIndex}`}
                  className={`
                    aspect-square border border-opacity-50 rounded
                    flex items-center justify-center relative
                    w-8 h-8
                    ${getSquareColor(rowIndex, colIndex)}
                  `}
                >
                  {board[rowIndex] && board[rowIndex][colIndex] && (
                    <div className="w-full h-full flex items-center justify-center">
                      {board[rowIndex][colIndex].piece}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Move Details */}
        {currentMove && (
          <div className="mt-4 p-3 bg-slate-700 rounded-lg">
            <div className="text-sm text-white/90">
              <div className="mb-2">
                <strong>Move Details:</strong> {currentMove.piece} from {formatMoveCoordinate(currentMove.from)} to {formatMoveCoordinate(currentMove.to)}
              </div>
              {currentMove.captured && (
                <div className="text-red-400 mb-1">Captured: {currentMove.captured}</div>
              )}
              {currentMove.special && (
                <div className="text-purple-400 mb-1">Special: {currentMove.special}</div>
              )}
              {currentMove.isCheck && (
                <div className="text-orange-400 mb-1">Delivered Check</div>
              )}
              {currentMove.classification && (
                <div className={`mt-2 ${getClassificationDisplay(currentMove.classification).color}`}>
                  <strong>Analysis:</strong> {getClassificationDisplay(currentMove.classification).icon} {currentMove.classification}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Jump to Notable Moves */}
        <div className="mt-4 flex flex-wrap gap-2">
          {moves.map((move, index) => {
            // Only show player moves with notable classifications
            if (!move.classification || move.classification === 'Good' || move.actor !== 'player') return null;
            const display = getClassificationDisplay(move.classification);
            return (
              <button
                key={index}
                onClick={() => setCurrentMoveIndex(index)}
                className={`px-2 py-1 rounded text-xs flex items-center gap-1 ${display.bg} ${display.color} hover:opacity-80`}
              >
                <span>{display.icon}</span>
                <span>Move {index + 1}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default MovePreview;
