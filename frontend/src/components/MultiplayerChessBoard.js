import React, { useState, useEffect, useCallback } from 'react';
import { IoArrowBack, IoFlag, IoVolumeHigh, IoVolumeOff } from 'react-icons/io5';
import multiplayerSocket from '../services/multiplayerSocket';
import { useAuth } from '../contexts/AuthContext';

// Import all the chess pieces
import { 
  RedBird, BlueBird, YellowBird, WhiteBird, BlackBird, Stella,
  KingPig, QueenPig, RegularPig, CorporalPig, ForemanPig, NinjaPig
} from './characters';

// Import AI for move validation
import { ChessAI } from './ai/ChessAI';

const MultiplayerChessBoard = ({ matchData, onGameEnd, onBack }) => {
  const { user } = useAuth();
  const [board, setBoard] = useState([]);
  const [selectedSquare, setSelectedSquare] = useState(null);
  const [possibleMoves, setPossibleMoves] = useState([]);
  const [currentPlayer, setCurrentPlayer] = useState('white'); // white/black (chess terms)
  const [gameStatus, setGameStatus] = useState('active'); // active, check, checkmate, draw
  const [moveHistory, setMoveHistory] = useState([]);
  const [lastMove, setLastMove] = useState(null);
  const [myColor, setMyColor] = useState('white'); // My assigned color
  const [aiInstance] = useState(new ChessAI());
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Initialize board when component mounts
  useEffect(() => {
    if (matchData) {
      setMyColor(matchData.playerColor);
      setCurrentPlayer('white'); // White always starts
      initializeBoard();
      setupMultiplayerListeners();
    }

    return () => {
      // Cleanup listeners when component unmounts
      cleanupMultiplayerListeners();
    };
  }, [matchData]);

  // Initialize chess board with standard setup
  const initializeBoard = () => {
    const newBoard = Array(8).fill(null).map(() => Array(8).fill(null));
    
    // Setup white pieces (bottom - row 7 and 6)
    const whiteBackRank = [
      { type: 'rook', color: 'white', piece: <YellowBird size={40} />, moved: false },
      { type: 'knight', color: 'white', piece: <BlackBird size={40} />, moved: false },
      { type: 'bishop', color: 'white', piece: <WhiteBird size={40} />, moved: false },
      { type: 'queen', color: 'white', piece: <Stella size={40} />, moved: false },
      { type: 'king', color: 'white', piece: <RedBird size={40} />, moved: false },
      { type: 'bishop', color: 'white', piece: <WhiteBird size={40} />, moved: false },
      { type: 'knight', color: 'white', piece: <BlackBird size={40} />, moved: false },
      { type: 'rook', color: 'white', piece: <YellowBird size={40} />, moved: false }
    ];
    
    // Setup black pieces (top - row 0 and 1)
    const blackBackRank = [
      { type: 'rook', color: 'black', piece: <RegularPig size={40} />, moved: false },
      { type: 'knight', color: 'black', piece: <NinjaPig size={40} />, moved: false },
      { type: 'bishop', color: 'black', piece: <CorporalPig size={40} />, moved: false },
      { type: 'queen', color: 'black', piece: <QueenPig size={40} />, moved: false },
      { type: 'king', color: 'black', piece: <KingPig size={40} />, moved: false },
      { type: 'bishop', color: 'black', piece: <CorporalPig size={40} />, moved: false },
      { type: 'knight', color: 'black', piece: <NinjaPig size={40} />, moved: false },
      { type: 'rook', color: 'black', piece: <RegularPig size={40} />, moved: false }
    ];
    
    // Place pieces on board
    newBoard[0] = [...blackBackRank];
    newBoard[7] = [...whiteBackRank];
    
    // Place pawns
    for (let col = 0; col < 8; col++) {
      newBoard[1][col] = { type: 'pawn', color: 'black', piece: <RegularPig size={32} />, moved: false };
      newBoard[6][col] = { type: 'pawn', color: 'white', piece: <BlueBird size={32} />, moved: false };
    }
    
    setBoard(newBoard);
    console.log(`🎮 [MultiplayerChess] Board initialized. I am playing as ${matchData.playerColor}`);
  };

  // Setup multiplayer event listeners
  const setupMultiplayerListeners = () => {
    const unsubscribe = multiplayerSocket.onOpponentMove((moveData) => {
      console.log('🎯 [MultiplayerChess] Opponent move received:', moveData);
      applyOpponentMove(moveData);
    });
    
    // Store cleanup function
    window.multiplayerCleanup = unsubscribe;
  };

  const cleanupMultiplayerListeners = () => {
    if (window.multiplayerCleanup) {
      window.multiplayerCleanup();
      window.multiplayerCleanup = null;
    }
  };

  // Apply opponent's move to the board
  const applyOpponentMove = (moveData) => {
    const { move } = moveData;
    const { from, to, piece, special, promotionType } = move;
    
    console.log(`🎯 [MultiplayerChess] Applying opponent move: ${piece} from [${from[0]},${from[1]}] to [${to[0]},${to[1]}]`);
    
    const newBoard = board.map(row => [...row]);
    const movingPiece = newBoard[from[0]][from[1]];
    
    if (!movingPiece) {
      console.error('[MultiplayerChess] No piece found at opponent move origin');
      return;
    }
    
    // Handle special moves
    if (special === 'castle' || special === 'castleKingside' || special === 'castleQueenside') {
      handleCastling(newBoard, from, to, special);
    } else if (special === 'enPassant') {
      handleEnPassant(newBoard, from, to, movingPiece.color);
    }
    
    // Make the main move
    newBoard[to[0]][to[1]] = { ...movingPiece, moved: true };
    newBoard[from[0]][from[1]] = null;
    
    // Handle pawn promotion
    if (special === 'promotion' && promotionType) {
      newBoard[to[0]][to[1]] = createPromotedPiece(promotionType, movingPiece.color);
    }
    
    // Update game state
    setBoard(newBoard);
    setSelectedSquare(null);
    setPossibleMoves([]);
    setCurrentPlayer(myColor); // It's now my turn
    
    // Add to move history
    const moveRecord = {
      from,
      to,
      piece: movingPiece.type,
      color: movingPiece.color,
      special,
      timestamp: Date.now()
    };
    setMoveHistory(prev => [...prev, moveRecord]);
    setLastMove(moveRecord);
    
    console.log('✅ [MultiplayerChess] Opponent move applied successfully');
  };

  // Handle castling for opponent moves
  const handleCastling = (board, from, to, castleType) => {
    const row = from[0];
    const isKingSide = castleType === 'castleKingside' || to[1] > from[1];
    const rookFromCol = isKingSide ? 7 : 0;
    const rookToCol = isKingSide ? 5 : 3;
    
    const rook = board[row][rookFromCol];
    if (rook) {
      board[row][rookToCol] = { ...rook, moved: true };
      board[row][rookFromCol] = null;
    }
  };

  // Handle en passant for opponent moves
  const handleEnPassant = (board, from, to, pieceColor) => {
    const captureRow = pieceColor === 'white' ? to[0] + 1 : to[0] - 1;
    board[captureRow][to[1]] = null;
  };

  // Create promoted piece
  const createPromotedPiece = (pieceType, color) => {
    const size = 40;
    let piece;
    
    if (color === 'white') {
      switch (pieceType) {
        case 'queen': piece = <Stella size={size} />; break;
        case 'rook': piece = <YellowBird size={size} />; break;
        case 'bishop': piece = <WhiteBird size={size} />; break;
        case 'knight': piece = <BlackBird size={size} />; break;
        default: piece = <Stella size={size} />;
      }
    } else {
      switch (pieceType) {
        case 'queen': piece = <QueenPig size={size} />; break;
        case 'rook': piece = <RegularPig size={size} />; break;
        case 'bishop': piece = <CorporalPig size={size} />; break;
        case 'knight': piece = <NinjaPig size={size} />; break;
        default: piece = <QueenPig size={size} />;
      }
    }
    
    return { type: pieceType, color, piece, moved: true };
  };

  // Handle square click
  const handleSquareClick = (row, col) => {
    // Only allow moves when it's my turn
    if (currentPlayer !== myColor) {
      console.log(`🚫 [MultiplayerChess] Not my turn (current: ${currentPlayer}, mine: ${myColor})`);
      return;
    }
    
    const piece = board[row][col];
    
    // If clicking on my piece, select it
    if (piece && piece.color === myColor) {
      setSelectedSquare([row, col]);
      const moves = aiInstance.getPossibleMoves(board, row, col, lastMove);
      setPossibleMoves(moves);
      console.log(`🎯 [MultiplayerChess] Selected ${piece.type} at [${row},${col}], ${moves.length} possible moves`);
      return;
    }
    
    // If I have a piece selected and clicking on a valid move
    if (selectedSquare) {
      const [fromRow, fromCol] = selectedSquare;
      const isValidMove = possibleMoves.some(move => move.row === row && move.col === col);
      
      if (isValidMove) {
        makeMove(fromRow, fromCol, row, col);
      } else {
        // Invalid move, deselect
        setSelectedSquare(null);
        setPossibleMoves([]);
      }
    }
  };

  // Make a move
  const makeMove = (fromRow, fromCol, toRow, toCol) => {
    const movingPiece = board[fromRow][fromCol];
    if (!movingPiece) return;
    
    const newBoard = board.map(row => [...row]);
    const capturedPiece = newBoard[toRow][toCol];
    
    // Determine special moves
    let special = null;
    let promotionType = null;
    
    // Check for castling
    if (movingPiece.type === 'king' && Math.abs(toCol - fromCol) === 2) {
      special = toCol > fromCol ? 'castleKingside' : 'castleQueenside';
      handleCastlingForMyMove(newBoard, fromRow, fromCol, toRow, toCol);
    }
    
    // Check for en passant
    else if (movingPiece.type === 'pawn' && Math.abs(toCol - fromCol) === 1 && !capturedPiece) {
      special = 'enPassant';
      const captureRow = movingPiece.color === 'white' ? toRow + 1 : toRow - 1;
      newBoard[captureRow][toCol] = null;
    }
    
    // Check for promotion
    else if (movingPiece.type === 'pawn' && (toRow === 0 || toRow === 7)) {
      special = 'promotion';
      promotionType = 'queen'; // Auto-promote to queen for now
    }
    
    // Make the move
    newBoard[toRow][toCol] = { ...movingPiece, moved: true };
    newBoard[fromRow][fromCol] = null;
    
    // Handle promotion
    if (special === 'promotion') {
      newBoard[toRow][toCol] = createPromotedPiece(promotionType, movingPiece.color);
    }
    
    // Update board state
    setBoard(newBoard);
    setSelectedSquare(null);
    setPossibleMoves([]);
    setCurrentPlayer(myColor === 'white' ? 'black' : 'white'); // Switch turns
    
    // Create move record
    const moveRecord = {
      from: [fromRow, fromCol],
      to: [toRow, toCol],
      piece: movingPiece.type,
      color: movingPiece.color,
      captured: capturedPiece?.type || null,
      special,
      promotionType,
      timestamp: Date.now()
    };
    
    setMoveHistory(prev => [...prev, moveRecord]);
    setLastMove(moveRecord);
    
    // Send move to opponent
    sendMoveToOpponent(moveRecord);
    
    console.log(`✅ [MultiplayerChess] Made move: ${movingPiece.type} from [${fromRow},${fromCol}] to [${toRow},${toCol}]`);
  };

  // Handle castling for my moves
  const handleCastlingForMyMove = (board, fromRow, fromCol, toRow, toCol) => {
    const isKingSide = toCol > fromCol;
    const rookFromCol = isKingSide ? 7 : 0;
    const rookToCol = isKingSide ? 5 : 3;
    
    const rook = board[fromRow][rookFromCol];
    if (rook) {
      board[fromRow][rookToCol] = { ...rook, moved: true };
      board[fromRow][rookFromCol] = null;
    }
  };

  // Send move to opponent via WebSocket
  const sendMoveToOpponent = (moveRecord) => {
    const moveData = {
      matchId: matchData.matchId,
      move: {
        from: moveRecord.from,
        to: moveRecord.to,
        piece: moveRecord.piece,
        team: moveRecord.color, // For compatibility with backend
        captured: moveRecord.captured,
        special: moveRecord.special,
        promotionType: moveRecord.promotionType
      },
      player: {
        username: user?.username,
        userId: user?.id || user?._id
      }
    };
    
    console.log('📤 [MultiplayerChess] Sending move to opponent:', moveData);
    multiplayerSocket.sendMove(moveData);
  };

  // Check for game end conditions after each move
  const checkGameEnd = useCallback((board, currentPlayer) => {
    if (!aiInstance) return;
    
    const isInCheck = aiInstance.isKingInCheck(board, currentPlayer);
    const hasValidMoves = aiInstance.hasValidMoves(board, currentPlayer);
    
    if (isInCheck && !hasValidMoves) {
      // Checkmate
      const winner = currentPlayer === 'white' ? 'black' : 'white';
      const result = winner === myColor ? 'win' : 'loss';
      setGameStatus('checkmate');
      console.log(`🏁 [MultiplayerChess] CHECKMATE! ${winner} wins`);
      
      setTimeout(() => {
        onGameEnd(result);
      }, 2000); // Give time to see the checkmate message
      
    } else if (!hasValidMoves) {
      // Stalemate
      setGameStatus('draw');
      console.log(`🏁 [MultiplayerChess] STALEMATE! Game is a draw`);
      
      setTimeout(() => {
        onGameEnd('draw');
      }, 2000);
      
    } else if (isInCheck) {
      // Check
      setGameStatus('check');
      console.log(`⚠️ [MultiplayerChess] ${currentPlayer} is in CHECK!`);
      
    } else {
      // Normal game continues
      setGameStatus('active');
    }
  }, [aiInstance, myColor, onGameEnd]);

  // Check game end after board updates
  useEffect(() => {
    if (board.length > 0) {
      checkGameEnd(board, currentPlayer);
    }
  }, [board, currentPlayer, checkGameEnd]);
  const getAlgebraicNotation = (row, col) => {
    const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
    const ranks = ['8', '7', '6', '5', '4', '3', '2', '1'];
    return files[col] + ranks[row];
  };

  // Check if square is highlighted
  const isSquareHighlighted = (row, col) => {
    if (selectedSquare && selectedSquare[0] === row && selectedSquare[1] === col) {
      return 'selected';
    }
    if (possibleMoves.some(move => move.row === row && move.col === col)) {
      return 'possible';
    }
    if (lastMove && ((lastMove.from[0] === row && lastMove.from[1] === col) || 
                     (lastMove.to[0] === row && lastMove.to[1] === col))) {
      return 'lastMove';
    }
    return null;
  };

  // Get square color
  const getSquareColor = (row, col) => {
    const isLight = (row + col) % 2 === 0;
    const highlight = isSquareHighlighted(row, col);
    
    if (highlight === 'selected') return 'bg-yellow-400';
    if (highlight === 'possible') return 'bg-green-400';
    if (highlight === 'lastMove') return 'bg-blue-400';
    
    return isLight ? 'bg-amber-100' : 'bg-amber-800';
  };

  // Render the board from my perspective
  const renderBoard = () => {
    // If I'm playing as black, flip the board
    const shouldFlip = myColor === 'black';
    
    return (
      <div className="grid grid-cols-8 gap-0 border-4 border-amber-900 bg-amber-900">
        {Array.from({ length: 8 }, (_, row) => 
          Array.from({ length: 8 }, (_, col) => {
            const actualRow = shouldFlip ? 7 - row : row;
            const actualCol = shouldFlip ? 7 - col : col;
            const piece = board[actualRow] && board[actualRow][actualCol];
            
            return (
              <div
                key={`${row}-${col}`}
                className={`w-16 h-16 flex items-center justify-center cursor-pointer relative ${getSquareColor(actualRow, actualCol)}`}
                onClick={() => handleSquareClick(actualRow, actualCol)}
              >
                {piece && (
                  <div className="w-full h-full flex items-center justify-center">
                    {piece.piece}
                  </div>
                )}
                
                {/* Square coordinates for debugging */}
                <div className="absolute bottom-0 right-0 text-xs text-gray-600">
                  {getAlgebraicNotation(actualRow, actualCol)}
                </div>
              </div>
            );
          })
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-sky-400 to-sky-600 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-black/20">
        <button
          onClick={onBack}
          className="flex items-center gap-2 px-4 py-2 bg-white/20 rounded-lg text-white hover:bg-white/30 transition-colors"
        >
          <IoArrowBack size={20} />
          Back
        </button>
        
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-bold text-white">
            vs {matchData.opponent.username}
          </h1>
          <div className="text-white text-sm">
            Playing as {myColor} • {currentPlayer === myColor ? 'Your turn' : 'Opponent\'s turn'}
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="p-2 bg-white/20 rounded-lg text-white hover:bg-white/30 transition-colors"
          >
            {soundEnabled ? <IoVolumeHigh size={20} /> : <IoVolumeOff size={20} />}
          </button>
          
          <button
            onClick={() => {
              if (window.confirm('Are you sure you want to resign? This will count as a loss.')) {
                console.log('🏳️ [MultiplayerChess] Player resigned');
                onGameEnd('loss');
              }
            }}
            className="flex items-center gap-1 px-3 py-2 bg-red-500/80 rounded-lg text-white hover:bg-red-500 transition-colors"
          >
            <IoFlag size={16} />
            Resign
          </button>
        </div>
      </div>

      {/* Main Game Area */}
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="flex flex-col items-center gap-4">
          {/* Opponent Info */}
          <div className={`flex items-center gap-3 p-3 rounded-lg text-white transition-all ${
            currentPlayer !== myColor ? 'bg-green-500/30 ring-2 ring-green-400' : 'bg-black/20'
          }`}>
            <div className="w-8 h-8 bg-red-500 rounded-full flex items-center justify-center text-white font-bold">
              {matchData.opponent.username[0].toUpperCase()}
            </div>
            <span className="font-semibold">{matchData.opponent.username}</span>
            <span className="text-sm opacity-75">({myColor === 'white' ? 'Black' : 'White'})</span>
            {currentPlayer !== myColor && (
              <span className="text-sm font-bold text-green-400">● TURN</span>
            )}
          </div>

          {/* Chess Board */}
          {renderBoard()}

          {/* My Info */}
          <div className={`flex items-center gap-3 p-3 rounded-lg text-white transition-all ${
            currentPlayer === myColor ? 'bg-blue-500/30 ring-2 ring-blue-400' : 'bg-black/20'
          }`}>
            <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold">
              {user?.username[0].toUpperCase()}
            </div>
            <span className="font-semibold">{user?.username}</span>
            <span className="text-sm opacity-75">({myColor})</span>
            {currentPlayer === myColor && (
              <span className="text-sm font-bold text-blue-400">● YOUR TURN</span>
            )}
          </div>

          {/* Game Status */}
          <div className="text-center text-white">
            <div className="text-lg font-semibold">
              {currentPlayer === myColor ? '🎯 Your Turn' : '⏳ Opponent\'s Turn'}
            </div>
            {gameStatus === 'check' && (
              <div className="text-red-400 font-bold">CHECK!</div>
            )}
            {gameStatus === 'checkmate' && (
              <div className="text-red-400 font-bold text-xl">CHECKMATE!</div>
            )}
          </div>
        </div>
      </div>

      {/* Move History (optional, can be toggled) */}
      {moveHistory.length > 0 && (
        <div className="p-4 bg-black/20 max-h-32 overflow-y-auto">
          <div className="text-white text-sm">
            <strong>Move History:</strong>
            <div className="flex flex-wrap gap-2 mt-2">
              {moveHistory.slice(-10).map((move, index) => (
                <span key={index} className="bg-white/20 px-2 py-1 rounded text-xs">
                  {move.piece} {getAlgebraicNotation(move.from[0], move.from[1])}-{getAlgebraicNotation(move.to[0], move.to[1])}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MultiplayerChessBoard;
