import React, { useState, useEffect } from 'react';
import { IoArrowBack, IoFlag, IoRefresh, IoHome } from 'react-icons/io5';
import { 
  RedBird, Stella, YellowBird, BlueBird, BlackBird, WhiteBird,
  KingPig, QueenPig, CorporalPig, ForemanPig, NinjaPig, RegularPig 
} from './characters';
import { EasyAI } from './ai/EasyAI.js';
import { MediumAI } from './ai/MediumAI.js';
import { HardAI } from './ai/HardAI.js';
import { NightmareAI } from './ai/NightmareAI.js';

const ChessBoardPage = ({ onBack, levelData, playerInventory, spendEnergy }) => {
  // Initial chess board setup
  const [board, setBoard] = useState([]);
  const [selectedSquare, setSelectedSquare] = useState(null);
  const [possibleMoves, setPossibleMoves] = useState([]);
  const [currentPlayer, setCurrentPlayer] = useState('birds'); // 'birds' or 'pigs'
  const [gameStatus, setGameStatus] = useState('playing'); // 'playing', 'checkmate', 'stalemate'
  const [moveHistory, setMoveHistory] = useState([]);
  const [isGameStarted, setIsGameStarted] = useState(false);
  const [draggedPiece, setDraggedPiece] = useState(null);
  const [moveTimer, setMoveTimer] = useState(null);
  const [timeRemaining, setTimeRemaining] = useState(null);
  const [showMissionModal, setShowMissionModal] = useState(false);
  const [isAiThinking, setIsAiThinking] = useState(false);
  const [aiInstance, setAiInstance] = useState(null);
  const [isInCheck, setIsInCheck] = useState({ birds: false, pigs: false });

  // Check for check status after each move
  useEffect(() => {
    if (aiInstance && board.length > 0) {
      const birdsInCheck = aiInstance.isKingInCheck(board, 'birds');
      const pigsInCheck = aiInstance.isKingInCheck(board, 'pigs');
      
      setIsInCheck({
        birds: birdsInCheck,
        pigs: pigsInCheck
      });
    }
  }, [board, aiInstance]);

  // Initialize AI based on difficulty
  useEffect(() => {
    const difficulty = levelData?.difficulty?.toLowerCase();
    let ai = null;
    
    switch (difficulty) {
      case 'easy':
        ai = new EasyAI();
        break;
      case 'medium':
        ai = new MediumAI();
        break;
      case 'hard':
        ai = new HardAI();
        break;
      case 'nightmare':
        ai = new NightmareAI();
        break;
      default:
        ai = new EasyAI();
    }
    
    setAiInstance(ai);
  }, [levelData?.difficulty]);

  // Initialize the chess board
  useEffect(() => {
    initializeBoard();
  }, []);

  // Timer effect for hard and nightmare difficulties
  useEffect(() => {
    const difficulty = levelData?.difficulty?.toLowerCase();
    let timerDuration = null;
    
    if (difficulty === 'hard') {
      timerDuration = 45;
    } else if (difficulty === 'nightmare') {
      timerDuration = 20;
    }
    
    if (timerDuration && gameStatus === 'playing') {
      setTimeRemaining(timerDuration);
      
      const timer = setInterval(() => {
        setTimeRemaining(prev => {
          if (prev <= 1) {
            // Time's up - make random move or skip turn
            setCurrentPlayer(currentPlayer === 'birds' ? 'pigs' : 'birds');
            return timerDuration; // Reset timer for next player
          }
          return prev - 1;
        });
      }, 1000);
      
      setMoveTimer(timer);
      
      return () => {
        if (timer) clearInterval(timer);
      };
    }
  }, [currentPlayer, gameStatus, levelData?.difficulty]);

  const getPositionName = (row, col) => {
    const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
    const ranks = ['8', '7', '6', '5', '4', '3', '2', '1'];
    return files[col] + ranks[row];
  };

  const initializeBoard = () => {
    const newBoard = Array(8).fill(null).map(() => Array(8).fill(null));
    
    // Responsive piece sizes - much larger to fill cells
    const getPieceSize = () => {
      if (typeof window !== 'undefined') {
        if (window.innerWidth < 640) return 45; // Mobile - almost fill small cells
        if (window.innerWidth < 1024) return 55; // Tablet - fill medium cells
        return 65; // Desktop - fill large cells
      }
      return 55; // Default for SSR
    };
    
    const mainPieceSize = getPieceSize();
    const pawnSize = Math.max(40, mainPieceSize - 5); // Pawns also much larger
    
    // Setup Pigs (Black pieces) - top rows
    newBoard[0] = [
      { type: 'rook', team: 'pigs', piece: <CorporalPig size={mainPieceSize} />, moved: false },
      { type: 'knight', team: 'pigs', piece: <NinjaPig size={mainPieceSize} />, moved: false },
      { type: 'bishop', team: 'pigs', piece: <ForemanPig size={mainPieceSize} />, moved: false },
      { type: 'queen', team: 'pigs', piece: <QueenPig size={mainPieceSize} />, moved: false },
      { type: 'king', team: 'pigs', piece: <KingPig size={mainPieceSize} />, moved: false },
      { type: 'bishop', team: 'pigs', piece: <ForemanPig size={mainPieceSize} />, moved: false },
      { type: 'knight', team: 'pigs', piece: <NinjaPig size={mainPieceSize} />, moved: false },
      { type: 'rook', team: 'pigs', piece: <CorporalPig size={mainPieceSize} />, moved: false }
    ];
    
    for (let i = 0; i < 8; i++) {
      newBoard[1][i] = { type: 'pawn', team: 'pigs', piece: <RegularPig size={pawnSize} />, moved: false };
    }

    // Setup Birds (White pieces) - bottom rows
    newBoard[7] = [
      { type: 'rook', team: 'birds', piece: <YellowBird size={mainPieceSize} />, moved: false }, // Chuck as Rook
      { type: 'knight', team: 'birds', piece: <BlackBird size={mainPieceSize} />, moved: false }, // Bomb as Knight
      { type: 'bishop', team: 'birds', piece: <WhiteBird size={mainPieceSize} />, moved: false }, // Matilda as Bishop
      { type: 'queen', team: 'birds', piece: <Stella size={mainPieceSize} />, moved: false }, // Stella as Queen
      { type: 'king', team: 'birds', piece: <RedBird size={mainPieceSize} />, moved: false }, // Red as King
      { type: 'bishop', team: 'birds', piece: <WhiteBird size={mainPieceSize} />, moved: false }, // Matilda as Bishop
      { type: 'knight', team: 'birds', piece: <BlackBird size={mainPieceSize} />, moved: false }, // Bomb as Knight
      { type: 'rook', team: 'birds', piece: <YellowBird size={mainPieceSize} />, moved: false } // Chuck as Rook
    ];
    
    for (let i = 0; i < 8; i++) {
      newBoard[6][i] = { type: 'pawn', team: 'birds', piece: <BlueBird size={pawnSize} />, moved: false }; // Jak and Jim as Pawns
    }

    setBoard(newBoard);
    setIsGameStarted(true);
  };

  const isValidMove = (fromRow, fromCol, toRow, toCol) => {
    if (!aiInstance) return false;
    return aiInstance.isValidMove(board, fromRow, fromCol, toRow, toCol);
  };

  const calculatePossibleMoves = (fromRow, fromCol) => {
    if (!aiInstance) return [];
    return aiInstance.getAllValidMoves(board, fromRow, fromCol);
  };

  // AI Logic using the new AI system
  const makeAiMove = () => {
    if (currentPlayer !== 'pigs' || gameStatus !== 'playing' || !aiInstance) return;
    
    setIsAiThinking(true);
    
    aiInstance.makeMove(board, (move) => {
      if (move) {
        executeMove(move.fromRow, move.fromCol, move.toRow, move.toCol);
      }
      setIsAiThinking(false);
    });
  };

  const executeMove = (fromRow, fromCol, toRow, toCol) => {
    const piece = board[fromRow][fromCol];
    const newBoard = board.map(r => [...r]);
    const capturedPiece = newBoard[toRow][toCol];
    
    newBoard[toRow][toCol] = { ...piece, moved: true };
    newBoard[fromRow][fromCol] = null;
    
    setBoard(newBoard);
    setMoveHistory(prev => [...prev, { 
      from: [fromRow, fromCol], 
      to: [toRow, toCol], 
      piece: piece.type,
      captured: capturedPiece?.type || null,
      capturedTeam: capturedPiece?.team || null,
      fromPosition: getPositionName(fromRow, fromCol),
      toPosition: getPositionName(toRow, toCol)
    }]);
    
    // Check for checkmate after the move
    const newCurrentPlayer = currentPlayer === 'birds' ? 'pigs' : 'birds';
    
    // Use a timeout to allow the board to update before checking game status
    setTimeout(() => {
      if (aiInstance && aiInstance.isCheckmate(newBoard, newCurrentPlayer)) {
        setGameStatus('checkmate');
        // Winner is the team that just moved
        console.log(`Checkmate! ${currentPlayer === 'birds' ? 'Angry Birds' : 'Green Pigs'} win!`);
      } else if (aiInstance && aiInstance.getAllPossibleMoves(newBoard, newCurrentPlayer).length === 0) {
        setGameStatus('stalemate');
        console.log('Stalemate!');
      }
      
      // Check if the move resulted in check
      const isCheckMove = aiInstance.isKingInCheck(newBoard, newCurrentPlayer);
      if (isCheckMove) {
        // Update the move history to indicate check
        setMoveHistory(prev => {
          const updatedHistory = [...prev];
          const lastMove = updatedHistory[updatedHistory.length - 1];
          if (lastMove) {
            lastMove.isCheck = true;
          }
          return updatedHistory;
        });
      }
    }, 100);
    
    // Switch players and reset timer
    setCurrentPlayer(newCurrentPlayer);
    const difficulty = levelData?.difficulty?.toLowerCase();
    if (difficulty === 'hard') {
      setTimeRemaining(45);
    } else if (difficulty === 'nightmare') {
      setTimeRemaining(20);
    }
  };

  // Trigger AI move when it's pigs turn
  useEffect(() => {
    if (currentPlayer === 'pigs' && gameStatus === 'playing' && !isAiThinking && aiInstance) {
      const aiDelay = setTimeout(() => {
        makeAiMove();
      }, 500); // Small delay before AI starts thinking
      
      return () => clearTimeout(aiDelay);
    }
  }, [currentPlayer, gameStatus, board, aiInstance]);

  const handleDragStart = (e, row, col) => {
    const piece = board[row][col];
    if (!piece || piece.team !== currentPlayer) {
      e.preventDefault();
      return;
    }
    
    setDraggedPiece({ row, col, piece });
    setSelectedSquare([row, col]);
    setPossibleMoves(calculatePossibleMoves(row, col));
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDragEnd = (e) => {
    setDraggedPiece(null);
  };

  const handleDrop = (e, row, col) => {
    e.preventDefault();
    
    if (!draggedPiece) return;
    
    const { row: fromRow, col: fromCol } = draggedPiece;
    
    if (fromRow === row && fromCol === col) {
      // Dropped on same square, just deselect
      setSelectedSquare(null);
      setPossibleMoves([]);
      return;
    }

    const piece = board[fromRow][fromCol];
    if (piece && piece.team === currentPlayer && isValidMove(fromRow, fromCol, row, col)) {
      // Make the move
      const newBoard = board.map(r => [...r]);
      const capturedPiece = newBoard[row][col];
      
      newBoard[row][col] = { ...piece, moved: true };
      newBoard[fromRow][fromCol] = null;
      
      setBoard(newBoard);
      setMoveHistory(prev => [...prev, { 
        from: [fromRow, fromCol], 
        to: [row, col], 
        piece: piece.type,
        captured: capturedPiece?.type || null,
        capturedTeam: capturedPiece?.team || null,
        fromPosition: getPositionName(fromRow, fromCol),
        toPosition: getPositionName(row, col)
      }]);
      
      // Switch players and reset timer
      setCurrentPlayer(currentPlayer === 'birds' ? 'pigs' : 'birds');
      const difficulty = levelData?.difficulty?.toLowerCase();
      if (difficulty === 'hard') {
        setTimeRemaining(45);
      } else if (difficulty === 'nightmare') {
        setTimeRemaining(20);
      }
      setSelectedSquare(null);
      setPossibleMoves([]);
      
      // Check for checkmate/stalemate after player move
      const newCurrentPlayer = currentPlayer === 'birds' ? 'pigs' : 'birds';
      setTimeout(() => {
        if (aiInstance && aiInstance.isCheckmate(newBoard, newCurrentPlayer)) {
          setGameStatus('checkmate');
          console.log(`Checkmate! ${currentPlayer === 'birds' ? 'Angry Birds' : 'Green Pigs'} win!`);
        } else if (aiInstance && aiInstance.getAllPossibleMoves(newBoard, newCurrentPlayer).length === 0) {
          setGameStatus('stalemate');
          console.log('Stalemate!');
        }
        
        // Check if the move resulted in check
        const isCheckMove = aiInstance.isKingInCheck(newBoard, newCurrentPlayer);
        if (isCheckMove) {
          // Update the move history to indicate check
          setMoveHistory(prev => {
            const updatedHistory = [...prev];
            const lastMove = updatedHistory[updatedHistory.length - 1];
            if (lastMove) {
              lastMove.isCheck = true;
            }
            return updatedHistory;
          });
        }
      }, 100);
    }
  };

  const handleSquareClick = (row, col) => {
    if (gameStatus !== 'playing') return;

    if (selectedSquare) {
      const [fromRow, fromCol] = selectedSquare;
      
      if (fromRow === row && fromCol === col) {
        // Deselect if clicking the same square
        setSelectedSquare(null);
        return;
      }

      const piece = board[fromRow][fromCol];
      if (piece && piece.team === currentPlayer && isValidMove(fromRow, fromCol, row, col)) {
        // Make the move
        const newBoard = board.map(r => [...r]);
        const capturedPiece = newBoard[row][col];
        
        newBoard[row][col] = { ...piece, moved: true };
        newBoard[fromRow][fromCol] = null;
        
        setBoard(newBoard);
        setMoveHistory(prev => [...prev, { 
          from: [fromRow, fromCol], 
          to: [row, col], 
          piece: piece.type,
          captured: capturedPiece?.type || null,
          capturedTeam: capturedPiece?.team || null,
          fromPosition: getPositionName(fromRow, fromCol),
          toPosition: getPositionName(row, col)
        }]);
        
        // Switch players and reset timer
        setCurrentPlayer(currentPlayer === 'birds' ? 'pigs' : 'birds');
        const difficulty = levelData?.difficulty?.toLowerCase();
        if (difficulty === 'hard') {
          setTimeRemaining(45);
        } else if (difficulty === 'nightmare') {
          setTimeRemaining(20);
        }
        setSelectedSquare(null);
        setPossibleMoves([]);
        
        // Check for checkmate/stalemate after player move
        const newCurrentPlayer = currentPlayer === 'birds' ? 'pigs' : 'birds';
        setTimeout(() => {
          if (aiInstance && aiInstance.isCheckmate(newBoard, newCurrentPlayer)) {
            setGameStatus('checkmate');
            console.log(`Checkmate! ${currentPlayer === 'birds' ? 'Angry Birds' : 'Green Pigs'} win!`);
          } else if (aiInstance && aiInstance.getAllPossibleMoves(newBoard, newCurrentPlayer).length === 0) {
            setGameStatus('stalemate');
            console.log('Stalemate!');
          }
          
          // Check if the move resulted in check
          const isCheckMove = aiInstance.isKingInCheck(newBoard, newCurrentPlayer);
          if (isCheckMove) {
            // Update the move history to indicate check
            setMoveHistory(prev => {
              const updatedHistory = [...prev];
              const lastMove = updatedHistory[updatedHistory.length - 1];
              if (lastMove) {
                lastMove.isCheck = true;
              }
              return updatedHistory;
            });
          }
        }, 100);
      } else {
        // Select new piece if it belongs to current player
        const newPiece = board[row][col];
        if (newPiece && newPiece.team === currentPlayer) {
          setSelectedSquare([row, col]);
          setPossibleMoves(calculatePossibleMoves(row, col));
        } else {
          setSelectedSquare(null);
          setPossibleMoves([]);
        }
      }
    } else {
      // Select piece if it belongs to current player
      const piece = board[row][col];
      if (piece && piece.team === currentPlayer) {
        setSelectedSquare([row, col]);
        setPossibleMoves(calculatePossibleMoves(row, col));
      }
    }
  };

  const getSquareColor = (row, col) => {
    const isLight = (row + col) % 2 === 0;
    const isSelected = selectedSquare && selectedSquare[0] === row && selectedSquare[1] === col;
    const isPossibleMove = possibleMoves.some(([moveRow, moveCol]) => moveRow === row && moveCol === col);
    const isCapture = isPossibleMove && board[row][col] !== null;
    const isDraggedOver = draggedPiece && isPossibleMove;
    
    // Check if this square contains a king in check
    const piece = board[row][col];
    const isKingInCheckSquare = piece && piece.type === 'king' && (
      (piece.team === 'birds' && isInCheck.birds) || 
      (piece.team === 'pigs' && isInCheck.pigs)
    );
    
    // Check if this piece is attacking the enemy king
    let isAttackingKing = false;
    if (piece && aiInstance && (isInCheck.birds || isInCheck.pigs)) {
      const enemyTeam = piece.team === 'birds' ? 'pigs' : 'birds';
      const enemyKingPos = aiInstance.findKing(board, enemyTeam);
      if (enemyKingPos && (
          (enemyTeam === 'birds' && isInCheck.birds) || 
          (enemyTeam === 'pigs' && isInCheck.pigs)
        )) {
        isAttackingKing = aiInstance.canPieceAttackPosition(board, row, col, enemyKingPos.row, enemyKingPos.col);
      }
    }
    
    if (isSelected) return 'bg-yellow-400 border-yellow-600';
    if (isKingInCheckSquare) return 'bg-red-500 border-red-700 animate-pulse shadow-lg shadow-red-500/50'; // Highlight king in check with glow
    if (isAttackingKing) return 'bg-orange-400 border-orange-600 animate-pulse'; // Highlight attacking pieces
    if (isCapture) return 'bg-red-400 border-red-600'; // Highlight capture moves in red
    if (isPossibleMove) return 'bg-green-400 border-green-600'; // Highlight possible moves in green
    if (isLight) return 'bg-amber-100 border-amber-200';
    return 'bg-amber-800 border-amber-900';
  };

  const resetGame = () => {
    if (moveTimer) {
      clearInterval(moveTimer);
      setMoveTimer(null);
    }
    initializeBoard();
    setSelectedSquare(null);
    setPossibleMoves([]);
    setDraggedPiece(null);
    setCurrentPlayer('birds');
    setGameStatus('playing');
    setMoveHistory([]);
    setTimeRemaining(null);
    setIsAiThinking(false);
    setIsInCheck({ birds: false, pigs: false });
  };

  if (!isGameStarted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-purple-900 flex items-center justify-center">
        <div className="text-center text-white">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-yellow-400 mx-auto mb-4"></div>
          <p className="text-xl">Setting up the battlefield...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen max-h-screen overflow-hidden bg-gradient-to-br from-slate-900 via-blue-900 to-purple-900 text-white p-2 sm:p-4">
      <div className="max-w-7xl mx-auto h-full flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between mb-2 sm:mb-4 flex-shrink-0">
          <button
            onClick={onBack}
            className="flex items-center gap-1 sm:gap-2 px-2 sm:px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors text-sm sm:text-base"
          >
            <IoArrowBack />
            <span className="hidden sm:inline">Back to Campaign</span>
            <span className="sm:hidden">Back</span>
          </button>
          
          <div className="text-center">
            <h1 className="text-lg sm:text-xl lg:text-2xl font-bold">{levelData?.name || 'Chess Battle'}</h1>
            <p className="text-xs sm:text-sm text-slate-400">{levelData?.terrain || 'Battlefield'}</p>
          </div>
          
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Battle Status - Compact */}
            <div className="bg-slate-800 rounded-lg p-2 text-xs hidden sm:block">
              <div className="text-slate-400 mb-1">Status</div>
              <div className="text-green-400 capitalize font-medium">{gameStatus}</div>
              <div className="text-slate-300">Move {moveHistory.length + 1}</div>
              {/* Check indicator in header */}
              {(isInCheck.birds || isInCheck.pigs) && gameStatus === 'playing' && (
                <div className="text-red-400 font-bold text-xs mt-1 animate-pulse">
                  ⚠️ CHECK
                </div>
              )}
            </div>
            
            <div className="flex gap-1 sm:gap-2">
              <button
                onClick={resetGame}
                className="p-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors text-sm"
                title="Reset Game"
              >
                <IoRefresh />
              </button>
              <button
                onClick={onBack}
                className="p-2 bg-green-600 hover:bg-green-700 rounded-lg transition-colors text-sm"
                title="Home"
              >
                <IoHome />
              </button>
            </div>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-3 lg:gap-4 flex-1 min-h-0">
          {/* Chess Board */}
          <div className="flex-1 max-w-2xl mx-auto lg:mx-0 flex flex-col min-h-0">
            {/* Top Territory Label - Pigs */}
            <div className="text-center mb-1 flex-shrink-0">
              <span className="text-xs sm:text-sm text-slate-400 bg-slate-800 px-3 py-1 rounded-full">
                🐷 Pig Territory
              </span>
            </div>

            <div className="bg-gradient-to-br from-amber-200 to-amber-600 p-2 sm:p-3 rounded-2xl shadow-2xl flex-shrink-0">
              <div className="grid grid-cols-8 gap-0.5 sm:gap-1 bg-amber-900 p-1 sm:p-2 rounded-xl">
                {board.map((row, rowIndex) =>
                  row.map((square, colIndex) => (
                    <div
                      key={`${rowIndex}-${colIndex}`}
                      className={`
                        aspect-square border border-opacity-50 rounded cursor-pointer 
                        transition-all duration-200 hover:shadow-lg
                        flex items-center justify-center
                        text-xs sm:text-sm
                        ${getSquareColor(rowIndex, colIndex)}
                      `}
                      onClick={() => handleSquareClick(rowIndex, colIndex)}
                      onDragOver={handleDragOver}
                      onDrop={(e) => handleDrop(e, rowIndex, colIndex)}
                    >
                      {square && (
                        <div 
                          className="transition-transform duration-200 hover:scale-110 w-full h-full flex items-center justify-center cursor-grab active:cursor-grabbing"
                          draggable={square.team === currentPlayer}
                          onDragStart={(e) => handleDragStart(e, rowIndex, colIndex)}
                          onDragEnd={handleDragEnd}
                        >
                          {square.piece}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Bottom Territory Label - Birds */}
            <div className="text-center mt-1 flex-shrink-0">
              <span className="text-xs sm:text-sm text-slate-400 bg-slate-800 px-3 py-1 rounded-full">
                🐦 Bird Territory
              </span>
            </div>
          </div>

          {/* Game Info Panel */}
          <div className="w-full lg:w-80 xl:w-96 space-y-3 sm:space-y-4">
            {/* Current Turn */}
            <div className="bg-slate-800 rounded-xl p-4 sm:p-5">
              <h3 className="text-lg sm:text-xl font-bold mb-3">Current Turn</h3>
              <div className="flex items-center gap-3">
                {currentPlayer === 'birds' ? <RedBird size={32} /> : <KingPig size={32} />}
                <span className="capitalize font-semibold text-base sm:text-lg">
                  {currentPlayer === 'birds' ? 'Angry Birds' : 'Green Pigs'}
                  {currentPlayer === 'pigs' && isAiThinking && (
                    <span className="text-sm text-slate-400 ml-2">(AI Thinking...)</span>
                  )}
                </span>
              </div>
              
              {/* Check Warning */}
              {((currentPlayer === 'birds' && isInCheck.birds) || (currentPlayer === 'pigs' && isInCheck.pigs)) && (
                <div className="mt-3 pt-3 border-t border-slate-600">
                  <div className="bg-red-900/50 border border-red-600 rounded-lg p-3 animate-pulse">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">⚠️</span>
                      <div>
                        <div className="text-red-300 font-bold">CHECK!</div>
                        <div className="text-red-200 text-sm">
                          Your king is under attack! You must move to safety.
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              
              {/* AI Thinking Indicator */}
              {currentPlayer === 'pigs' && isAiThinking && (
                <div className="mt-3 pt-3 border-t border-slate-600">
                  <div className="flex items-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-amber-400"></div>
                    <span className="text-sm text-slate-400">AI is calculating next move...</span>
                  </div>
                </div>
              )}
              
              {/* Game Status Display */}
              {gameStatus !== 'playing' && (
                <div className="mt-3 pt-3 border-t border-slate-600">
                  <div className="text-center">
                    {gameStatus === 'checkmate' && (
                      <div className="bg-red-900/50 border border-red-600 rounded-lg p-3">
                        <div className="text-red-300 font-bold text-lg">🏆 CHECKMATE!</div>
                        <div className="text-red-200 text-sm mt-1">
                          {currentPlayer === 'birds' ? 'Green Pigs' : 'Angry Birds'} Win!
                        </div>
                        <div className="text-red-100 text-xs mt-2 italic">
                          The king had no escape from check!
                        </div>
                      </div>
                    )}
                    {gameStatus === 'stalemate' && (
                      <div className="bg-yellow-900/50 border border-yellow-600 rounded-lg p-3">
                        <div className="text-yellow-300 font-bold text-lg">🤝 STALEMATE!</div>
                        <div className="text-yellow-200 text-sm mt-1">
                          It's a draw!
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
              
              {/* Timer for hard and nightmare difficulties */}
              {timeRemaining && (levelData?.difficulty?.toLowerCase() === 'hard' || levelData?.difficulty?.toLowerCase() === 'nightmare') && (
                <div className="mt-3 pt-3 border-t border-slate-600">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-slate-400">Time Remaining:</span>
                    <span className={`text-lg font-bold ${timeRemaining <= 10 ? 'text-red-400' : 'text-green-400'}`}>
                      {timeRemaining}s
                    </span>
                  </div>
                  <div className="mt-2 bg-slate-700 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full transition-all duration-1000 ${timeRemaining <= 10 ? 'bg-red-400' : 'bg-green-400'}`}
                      style={{ 
                        width: `${(timeRemaining / (levelData?.difficulty?.toLowerCase() === 'hard' ? 45 : 20)) * 100}%` 
                      }}
                    ></div>
                  </div>
                </div>
              )}
            </div>

            {/* Captured Pieces */}
            <div className="bg-slate-800 rounded-xl p-4 sm:p-5">
              <h3 className="text-lg sm:text-xl font-bold mb-3">Captured Pieces</h3>
              
              {/* Captured Birds */}
              <div className="mb-4">
                <div className="text-sm text-slate-400 mb-2 flex items-center gap-2">
                  🐦 Birds: 
                  <span className="text-xs bg-slate-700 px-2 py-0.5 rounded">
                    {moveHistory.filter(move => move.captured && move.capturedTeam === 'birds').length}
                  </span>
                </div>
                <div className="flex flex-wrap gap-2 min-h-[32px] p-2 bg-slate-700/30 rounded-lg">
                  {moveHistory
                    .filter(move => move.captured && move.capturedTeam === 'birds')
                    .map((move, index) => {
                      const getCapturedPiece = (type) => {
                        const size = 28;
                        switch(type) {
                          case 'pawn': return <BlueBird size={size} />;
                          case 'rook': return <YellowBird size={size} />;
                          case 'knight': return <BlackBird size={size} />;
                          case 'bishop': return <WhiteBird size={size} />;
                          case 'queen': return <Stella size={size} />;
                          case 'king': return <RedBird size={size} />;
                          default: return null;
                        }
                      };
                      const getPieceName = (type) => {
                        switch(type) {
                          case 'pawn': return 'Jim & Jake (Pawn)';
                          case 'rook': return 'Chuck (Rook)';
                          case 'knight': return 'Bomb (Knight)';
                          case 'bishop': return 'Matilda (Bishop)';
                          case 'queen': return 'Stella (Queen)';
                          case 'king': return 'Red (King)';
                          default: return 'Unknown';
                        }
                      };
                      return (
                        <div 
                          key={index} 
                          className="opacity-70 hover:opacity-100 cursor-help relative group transition-opacity duration-200" 
                          title={getPieceName(move.captured)}
                        >
                          <div className="relative p-1 bg-slate-800/50 rounded-lg hover:bg-slate-700/50 transition-colors duration-200">
                            {getCapturedPiece(move.captured)}
                            {/* Custom tooltip */}
                            <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-slate-900 text-white text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-10">
                              {getPieceName(move.captured)}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  {moveHistory.filter(move => move.captured && move.capturedTeam === 'birds').length === 0 && (
                    <span className="text-slate-500 text-sm italic self-center">None captured yet</span>
                  )}
                </div>
              </div>

              {/* Captured Pigs */}
              <div>
                <div className="text-sm text-slate-400 mb-2 flex items-center gap-2">
                  🐷 Pigs: 
                  <span className="text-xs bg-slate-700 px-2 py-0.5 rounded">
                    {moveHistory.filter(move => move.captured && move.capturedTeam === 'pigs').length}
                  </span>
                </div>
                <div className="flex flex-wrap gap-2 min-h-[32px] p-2 bg-slate-700/30 rounded-lg">
                  {moveHistory
                    .filter(move => move.captured && move.capturedTeam === 'pigs')
                    .map((move, index) => {
                      const getCapturedPiece = (type) => {
                        const size = 28;
                        switch(type) {
                          case 'pawn': return <RegularPig size={size} />;
                          case 'rook': return <CorporalPig size={size} />;
                          case 'knight': return <NinjaPig size={size} />;
                          case 'bishop': return <ForemanPig size={size} />;
                          case 'queen': return <QueenPig size={size} />;
                          case 'king': return <KingPig size={size} />;
                          default: return null;
                        }
                      };
                      const getPieceName = (type) => {
                        switch(type) {
                          case 'pawn': return 'Regular Pig (Pawn)';
                          case 'rook': return 'Corporal Pig (Rook)';
                          case 'knight': return 'Ninja Pig (Knight)';
                          case 'bishop': return 'Foreman Pig (Bishop)';
                          case 'queen': return 'Queen Pig (Queen)';
                          case 'king': return 'King Pig (King)';
                          default: return 'Unknown';
                        }
                      };
                      return (
                        <div 
                          key={index} 
                          className="opacity-70 hover:opacity-100 cursor-help relative group transition-opacity duration-200" 
                          title={getPieceName(move.captured)}
                        >
                          <div className="relative p-1 bg-slate-800/50 rounded-lg hover:bg-slate-700/50 transition-colors duration-200">
                            {getCapturedPiece(move.captured)}
                            {/* Custom tooltip */}
                            <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-slate-900 text-white text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-10">
                              {getPieceName(move.captured)}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  {moveHistory.filter(move => move.captured && move.capturedTeam === 'pigs').length === 0 && (
                    <span className="text-slate-500 text-sm italic self-center">None captured yet</span>
                  )}
                </div>
              </div>
            </div>

            {/* Move History */}
            <div className="bg-slate-800 rounded-xl p-4 sm:p-5">
              <h3 className="text-lg sm:text-xl font-bold mb-3">Recent Moves</h3>
              <div className="h-32 sm:h-36 overflow-y-auto space-y-2">
                {moveHistory.slice(-8).map((move, index) => (
                  <div key={index} className="text-sm text-slate-300 bg-slate-700/50 p-3 rounded">
                    <div className="flex justify-between items-start mb-1">
                      <span className="font-medium capitalize flex-1">
                        {move.piece} {move.captured ? `captures ${move.captured}` : 'moves'}
                        {move.isCheck && (
                          <span className="text-red-400 ml-1 font-bold">+</span>
                        )}
                      </span>
                      <span className="text-xs text-slate-400 ml-2 flex-shrink-0">
                        #{moveHistory.length - moveHistory.slice(-8).length + index + 1}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-slate-400 font-mono">
                        {move.fromPosition} → {move.toPosition}
                      </span>
                      <div className="flex gap-1">
                        {move.captured && (
                          <span className="text-xs text-red-400">
                            ⚔️ Capture
                          </span>
                        )}
                        {move.isCheck && (
                          <span className="text-xs text-orange-400">
                            ⚠️ Check
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                {moveHistory.length === 0 && (
                  <p className="text-slate-500 text-sm sm:text-base">No moves yet</p>
                )}
              </div>
            </div>

            {/* Mission Briefing - Clickable */}
            {levelData && (
              <button
                onClick={() => setShowMissionModal(true)}
                className="w-full bg-slate-800 hover:bg-slate-700 rounded-xl p-4 sm:p-5 text-left transition-all duration-200 hover:scale-[1.02] shadow-lg hover:shadow-xl border border-slate-700 hover:border-slate-600 group"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg sm:text-xl font-bold mb-1 text-white group-hover:text-amber-300 transition-colors duration-200">
                      Mission Briefing
                    </h3>
                    <p className="text-sm text-slate-400 group-hover:text-slate-300 transition-colors duration-200">
                      {levelData.coinReward} coins • {levelData.difficulty} • Click for details
                    </p>
                  </div>
                  <div className="text-slate-400 group-hover:text-amber-300 transition-all duration-200 text-2xl group-hover:scale-110">
                    📋
                  </div>
                </div>
                <div className="mt-2 text-xs text-slate-500 group-hover:text-slate-400 transition-colors duration-200">
                  ▶ Click to view full mission details
                </div>
              </button>
            )}
          </div>
        </div>

        {/* Mission Modal */}
        {showMissionModal && levelData && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
            <div className="bg-slate-800 rounded-2xl p-6 sm:p-8 max-w-md w-full mx-4 shadow-2xl border border-slate-700">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                  📋 Mission Briefing
                </h2>
                <button
                  onClick={() => setShowMissionModal(false)}
                  className="text-slate-400 hover:text-white transition-colors text-2xl"
                >
                  ×
                </button>
              </div>
              
              <div className="space-y-4">
                <div className="bg-slate-700/50 rounded-lg p-4">
                  <h3 className="font-semibold text-amber-400 mb-2">Level Details</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-300">Name:</span>
                      <span className="text-white font-medium">{levelData.name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-300">Terrain:</span>
                      <span className="text-white">{levelData.terrain}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-300">Difficulty:</span>
                      <span className={`capitalize font-medium ${
                        levelData.difficulty?.toLowerCase() === 'easy' ? 'text-green-400' :
                        levelData.difficulty?.toLowerCase() === 'medium' ? 'text-yellow-400' :
                        levelData.difficulty?.toLowerCase() === 'hard' ? 'text-orange-400' :
                        levelData.difficulty?.toLowerCase() === 'nightmare' ? 'text-red-400' :
                        'text-slate-400'
                      }`}>
                        {levelData.difficulty}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="bg-slate-700/50 rounded-lg p-4">
                  <h3 className="font-semibold text-green-400 mb-2">Rewards</h3>
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">🪙</span>
                    <span className="text-xl font-bold text-yellow-400">{levelData.coinReward}</span>
                    <span className="text-slate-300">coins</span>
                  </div>
                </div>

                {(levelData.difficulty?.toLowerCase() === 'hard' || levelData.difficulty?.toLowerCase() === 'nightmare') && (
                  <div className="bg-red-900/30 border border-red-800/50 rounded-lg p-4">
                    <h3 className="font-semibold text-red-400 mb-2 flex items-center gap-2">
                      ⚠️ Special Rules
                    </h3>
                    <div className="text-sm text-red-200">
                      <div className="flex justify-between">
                        <span>Move Timer:</span>
                        <span className="font-medium">
                          {levelData.difficulty?.toLowerCase() === 'hard' ? '45s' : '20s'} per move
                        </span>
                      </div>
                      <p className="mt-2 text-xs text-red-300">
                        You must make your move within the time limit or your turn will be skipped!
                      </p>
                    </div>
                  </div>
                )}

                <div className="bg-blue-900/30 border border-blue-800/50 rounded-lg p-4">
                  <h3 className="font-semibold text-blue-400 mb-2">Objective</h3>
                  <p className="text-sm text-blue-200">
                    Defeat the enemy king by using classic chess tactics with your favorite Angry Birds characters!
                  </p>
                </div>
              </div>
              
              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setShowMissionModal(false)}
                  className="flex-1 bg-slate-700 hover:bg-slate-600 text-white py-3 px-4 rounded-lg transition-colors font-medium"
                >
                  Close
                </button>
                <button
                  onClick={() => {
                    setShowMissionModal(false);
                    resetGame();
                  }}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-3 px-4 rounded-lg transition-colors font-medium"
                >
                  Restart Game
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ChessBoardPage;
