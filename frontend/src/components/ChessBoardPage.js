import React, { useState, useEffect, useRef } from 'react';
import { IoArrowBack, IoFlag, IoRefresh, IoHome } from 'react-icons/io5';
import { 
  RedBird, Stella, YellowBird, BlueBird, BlackBird, WhiteBird,
  KingPig, QueenPig, CorporalPig, ForemanPig, NinjaPig, RegularPig 
} from './characters';
import { EasyAI } from './ai/EasyAI.js';
import { MediumAI } from './ai/MediumAI.js';
import { HardAI } from './ai/HardAI.js';
import { NightmareAI } from './ai/NightmareAI.js';
import { ImpossibleAI } from './ai/ImpossibleAI.js';

const ChessBoardPage = ({ onBack, levelData, playerInventory, spendEnergy, addCoins, completeLevelWithStars }) => {
  // Add custom animations
  React.useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      @keyframes fadeIn {
        from { opacity: 0; transform: scale(0.9); }
        to { opacity: 1; transform: scale(1); }
      }
      @keyframes bounce-gentle {
        0%, 20%, 50%, 80%, 100% { transform: translateY(0); }
        40% { transform: translateY(-10px); }
        60% { transform: translateY(-5px); }
      }
      @keyframes shake {
        0%, 100% { transform: translateX(0); }
        10%, 30%, 50%, 70%, 90% { transform: translateX(-3px); }
        20%, 40%, 60%, 80% { transform: translateX(3px); }
      }
      @keyframes spin-slow {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
      }
      .animate-fadeIn { animation: fadeIn 0.5s ease-out; }
      .animate-bounce-gentle { animation: bounce-gentle 2s infinite; }
      .animate-shake { animation: shake 0.5s ease-in-out; }
      .animate-spin-slow { animation: spin-slow 3s linear infinite; }
    `;
    document.head.appendChild(style);
    return () => document.head.removeChild(style);
  }, []);

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
  const [showGameEndModal, setShowGameEndModal] = useState(false);
  const [gameResult, setGameResult] = useState(null); // 'win', 'loss', 'draw'
  const [isAiThinking, setIsAiThinking] = useState(false);
  const [aiInstance, setAiInstance] = useState(null);
  const [isInCheck, setIsInCheck] = useState({ birds: false, pigs: false });
  const [positionHistory, setPositionHistory] = useState([]);
  const [fiftyMoveCounter, setFiftyMoveCounter] = useState(0);
  const [showPromotionModal, setShowPromotionModal] = useState(false);
  const [promotionData, setPromotionData] = useState(null);
  const [lastMove, setLastMove] = useState(null);
  const [coinAnimation, setCoinAnimation] = useState({ isAnimating: false, startAmount: 0, endAmount: 0, currentAmount: 0 });
  const [premove, setPremove] = useState(null); // { fromRow, fromCol, toRow, toCol, specialMove, promotionType }
  const [premoveHighlight, setPremoveHighlight] = useState(null); // Highlight premove squares
  const moveHistoryRef = useRef(null);

  // Check for check status after each move
  useEffect(() => {
    if (aiInstance && board.length > 0) {
      const birdsInCheck = aiInstance.isKingInCheck(board, 'birds');
      const pigsInCheck = aiInstance.isKingInCheck(board, 'pigs');
      
      // Debug log
      if (birdsInCheck) {
        console.log('🚨 BIRDS KING IS IN CHECK!');
      }
      if (pigsInCheck) {
        console.log('🚨 PIGS KING IS IN CHECK!');
      }
      
      setIsInCheck({
        birds: birdsInCheck,
        pigs: pigsInCheck
      });
    }
  }, [board, aiInstance]);

  // Auto-scroll to latest move in history
  useEffect(() => {
    if (moveHistoryRef.current && moveHistory.length > 0) {
      moveHistoryRef.current.scrollLeft = moveHistoryRef.current.scrollWidth;
    }
  }, [moveHistory]);

  // Coin animation effect
  useEffect(() => {
    if (coinAnimation.isAnimating) {
      const duration = 2000; // 2 seconds animation
      const steps = 50; // Number of animation steps
      const increment = (coinAnimation.endAmount - coinAnimation.startAmount) / steps;
      const stepDuration = duration / steps;
      
      let currentStep = 0;
      const interval = setInterval(() => {
        currentStep++;
        const newAmount = Math.round(coinAnimation.startAmount + (increment * currentStep));
        
        setCoinAnimation(prev => ({ ...prev, currentAmount: newAmount }));
        
        if (currentStep >= steps) {
          clearInterval(interval);
          // Actually add the coins to inventory after animation completes
          if (addCoins) {
            const coinsToAdd = coinAnimation.endAmount - coinAnimation.startAmount;
            addCoins(coinsToAdd);
          }
          // Stop animation to prevent infinite loop
          setCoinAnimation(prev => ({ ...prev, isAnimating: false }));
        }
      }, stepDuration);
      
      return () => clearInterval(interval);
    }
  }, [coinAnimation.isAnimating]); // Removed dependencies to prevent infinite loop

  // Initiialize AI based on difficulty
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
      case 'impossible':
        ai = new ImpossibleAI();
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

  // Timer effect for hard, nightmare, and impossible difficulties
  useEffect(() => {
    const difficulty = levelData?.difficulty?.toLowerCase();
    let timerDuration = null;
    
    if (difficulty === 'hard') {
      timerDuration = 45;
    } else if (difficulty === 'nightmare') {
      timerDuration = 20;
    } else if (difficulty === 'impossible') {
      timerDuration = 15; // Even shorter time for impossible
    }
    
    if (timerDuration && gameStatus === 'playing') {
      setTimeRemaining(timerDuration);
      
      const timer = setInterval(() => {
        setTimeRemaining(prev => {
          if (prev <= 1) {
            // Time's up!
            if (currentPlayer === 'birds') {
              // Player runs out of time - they lose
              setGameStatus('checkmate');
              setGameResult('loss');
              setTimeout(() => setShowGameEndModal(true), 500);
              clearInterval(timer);
              setMoveTimer(null);
              return 0;
            } else {
              // AI runs out of time - switch turns (AI doesn't lose on time)
              setCurrentPlayer('birds');
              return timerDuration;
            }
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

  const getPromotedPiece = (type, team, size) => {
    if (team === 'birds') {
      switch (type) {
        case 'queen': return <Stella size={size} />;
        case 'rook': return <YellowBird size={size} />;
        case 'bishop': return <WhiteBird size={size} />;
        case 'knight': return <BlackBird size={size} />;
        default: return <Stella size={size} />;
      }
    } else {
      switch (type) {
        case 'queen': return <QueenPig size={size} />;
        case 'rook': return <CorporalPig size={size} />;
        case 'bishop': return <ForemanPig size={size} />;
        case 'knight': return <NinjaPig size={size} />;
        default: return <QueenPig size={size} />;
      }
    }
  };

  const savePositionToHistory = (board, currentPlayer) => {
    const position = {
      board: board.map(row => row.map(piece => piece ? {...piece} : null)),
      currentPlayer
    };
    setPositionHistory(prev => [...prev, position]);
  };

  // Calculate coin rewards from level data (new system)
  const calculateCoinReward = () => {
    // Use the level's specific coin reward, or fall back to difficulty-based for practice modes
    if (levelData && levelData.coinReward) {
      return levelData.coinReward;
    }
    
    // Fallback for practice modes without specific level data
    const difficultyLower = levelData?.difficulty?.toLowerCase();
    switch (difficultyLower) {
      case 'easy': return 25;
      case 'medium': return 50;
      case 'hard': return 100;
      case 'nightmare': return 250;
      case 'impossible': return 150;
      default: return 25;
    }
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
    
    // Get piece configuration from level data or use default
    const pieceConfig = levelData?.birdPieces ? {
      birdPieces: levelData.birdPieces,
      pigPieces: levelData.pigPieces
    } : {
      // Default full chess setup for practice modes
      birdPieces: { king: true, pawns: 8, rooks: 2, knights: 2, bishops: 2, queen: true },
      pigPieces: { king: true, pawns: 8, rooks: 2, knights: 2, bishops: 2, queen: true }
    };
    
    // Setup Pigs (Black pieces) - top rows
    setupPigPieces(newBoard, pieceConfig.pigPieces, mainPieceSize, pawnSize);
    
    // Setup Birds (White pieces) - bottom rows  
    setupBirdPieces(newBoard, pieceConfig.birdPieces, mainPieceSize, pawnSize);

    console.log('🎯 Final board state after initialization:');
    console.log('Row 0 (Pigs):', newBoard[0].map((piece, i) => piece ? `${i}:${piece.type}` : `${i}:empty`));
    console.log('Row 1 (Pig Pawns):', newBoard[1].map((piece, i) => piece ? `${i}:${piece.type}` : `${i}:empty`));
    console.log('Row 6 (Bird Pawns):', newBoard[6].map((piece, i) => piece ? `${i}:${piece.type}` : `${i}:empty`));
    console.log('Row 7 (Birds):', newBoard[7].map((piece, i) => piece ? `${i}:${piece.type}` : `${i}:empty`));

    setBoard(newBoard);
    setIsGameStarted(true);
    
    // Initialize position history
    savePositionToHistory(newBoard, 'birds');
  };

  const setupPigPieces = (board, pigConfig, mainSize, pawnSize) => {
    console.log('🏗️ Setting up pig pieces with config:', pigConfig);
    
    // Setup pig back rank - Initialize all positions as null first
    const backRank = Array(8).fill(null);
    
    // Always place king in center
    const kingPos = 4;
    backRank[kingPos] = { type: 'king', team: 'pigs', piece: <KingPig size={mainSize} />, moved: false };
    console.log(`👑 Placed pig king at position ${kingPos}`);
    
    // Place queen if available
    if (pigConfig.queen) {
      backRank[3] = { type: 'queen', team: 'pigs', piece: <QueenPig size={mainSize} />, moved: false };
      console.log('👸 Placed pig queen at position 3');
    }
    
    // Place bishops
    const bishopPositions = [2, 5];
    for (let i = 0; i < Math.min(pigConfig.bishops || 0, 2); i++) {
      backRank[bishopPositions[i]] = { type: 'bishop', team: 'pigs', piece: <ForemanPig size={mainSize} />, moved: false };
      console.log(`♗ Placed pig bishop ${i + 1} at position ${bishopPositions[i]}`);
    }
    
    // Place knights  
    const knightPositions = [1, 6];
    for (let i = 0; i < Math.min(pigConfig.knights || 0, 2); i++) {
      backRank[knightPositions[i]] = { type: 'knight', team: 'pigs', piece: <NinjaPig size={mainSize} />, moved: false };
      console.log(`♞ Placed pig knight ${i + 1} at position ${knightPositions[i]}`);
    }
    
    // Place rooks
    const rookPositions = [0, 7];
    for (let i = 0; i < Math.min(pigConfig.rooks || 0, 2); i++) {
      backRank[rookPositions[i]] = { type: 'rook', team: 'pigs', piece: <CorporalPig size={mainSize} />, moved: false };
      console.log(`♖ Placed pig rook ${i + 1} at position ${rookPositions[i]}`);
    }
    
    board[0] = backRank;
    console.log('🏁 Final pig back rank:', backRank.map((piece, i) => piece ? `${i}:${piece.type}` : `${i}:empty`));
    
    // Setup pig pawns - centered based on count
    const pawnCount = Math.min(pigConfig.pawns || 0, 8);
    const startCol = Math.floor((8 - pawnCount) / 2);
    for (let i = 0; i < pawnCount; i++) {
      board[1][startCol + i] = { type: 'pawn', team: 'pigs', piece: <RegularPig size={pawnSize} />, moved: false };
    }
    console.log(`♟️ Placed ${pawnCount} pig pawns starting at column ${startCol}`);
  };

  const setupBirdPieces = (board, birdConfig, mainSize, pawnSize) => {
    console.log('🐦 Setting up bird pieces with config:', birdConfig);
    
    // Setup bird back rank - Initialize all positions as null first
    const backRank = Array(8).fill(null);
    
    // Always place king in center
    const kingPos = 4;
    backRank[kingPos] = { type: 'king', team: 'birds', piece: <RedBird size={mainSize} />, moved: false };
    console.log(`👑 Placed bird king at position ${kingPos}`);
    
    // Place queen if available
    if (birdConfig.queen) {
      backRank[3] = { type: 'queen', team: 'birds', piece: <Stella size={mainSize} />, moved: false };
      console.log('👸 Placed bird queen at position 3');
    }
    
    // Place bishops
    const bishopPositions = [2, 5];
    for (let i = 0; i < Math.min(birdConfig.bishops || 0, 2); i++) {
      backRank[bishopPositions[i]] = { type: 'bishop', team: 'birds', piece: <WhiteBird size={mainSize} />, moved: false };
      console.log(`♗ Placed bird bishop ${i + 1} at position ${bishopPositions[i]}`);
    }
    
    // Place knights
    const knightPositions = [1, 6];
    for (let i = 0; i < Math.min(birdConfig.knights || 0, 2); i++) {
      backRank[knightPositions[i]] = { type: 'knight', team: 'birds', piece: <BlackBird size={mainSize} />, moved: false };
      console.log(`♞ Placed bird knight ${i + 1} at position ${knightPositions[i]}`);
    }
    
    // Place rooks
    const rookPositions = [0, 7];
    for (let i = 0; i < Math.min(birdConfig.rooks || 0, 2); i++) {
      backRank[rookPositions[i]] = { type: 'rook', team: 'birds', piece: <YellowBird size={mainSize} />, moved: false };
      console.log(`♖ Placed bird rook ${i + 1} at position ${rookPositions[i]}`);
    }
    
    board[7] = backRank;
    console.log('🏁 Final bird back rank:', backRank.map((piece, i) => piece ? `${i}:${piece.type}` : `${i}:empty`));
    
    // Setup bird pawns - centered based on count
    const pawnCount = Math.min(birdConfig.pawns || 0, 8);
    const startCol = Math.floor((8 - pawnCount) / 2);
    for (let i = 0; i < pawnCount; i++) {
      board[6][startCol + i] = { type: 'pawn', team: 'birds', piece: <BlueBird size={pawnSize} />, moved: false };
    }
    console.log(`♟️ Placed ${pawnCount} bird pawns starting at column ${startCol}`);
  };

  const isValidMove = (fromRow, fromCol, toRow, toCol) => {
    if (!aiInstance) return false;
    return aiInstance.isValidMove(board, fromRow, fromCol, toRow, toCol);
  };

  const calculatePossibleMoves = (fromRow, fromCol) => {
    if (!aiInstance) return [];
    
    const moves = [];
    const piece = board[fromRow][fromCol];
    if (!piece) return [];
    
    console.log(`🔍 Calculating moves for ${piece.type} at ${fromRow},${fromCol}`);
    
    // Check all squares on the board
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const moveValidation = aiInstance.isValidMoveWithSpecialRules(
          board, fromRow, fromCol, row, col, lastMove, { positionHistory, fiftyMoveCounter }
        );
        
        if (moveValidation.valid) {
          moves.push([row, col]);
        }
      }
    }
    
    console.log(`✅ Found ${moves.length} valid moves:`, moves);
    return moves;
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

  const executeMove = (fromRow, fromCol, toRow, toCol, specialMove = null, promotionType = 'queen') => {
    const piece = board[fromRow][fromCol];
    console.log(`🎯 Executing move: ${piece?.type} from ${fromRow},${fromCol} to ${toRow},${toCol}`, { specialMove, piece });
    
    const newBoard = board.map(r => [...r]);
    const capturedPiece = newBoard[toRow][toCol];
    let moveData = {
      from: [fromRow, fromCol], 
      to: [toRow, toCol], 
      piece: piece.type,
      captured: capturedPiece?.type || null,
      capturedTeam: capturedPiece?.team || null,
      fromPosition: getPositionName(fromRow, fromCol),
      toPosition: getPositionName(toRow, toCol),
      special: specialMove
    };

    // Handle special moves
    if (specialMove === 'castle') {
      // Move king
      newBoard[toRow][toCol] = { ...piece, moved: true };
      newBoard[fromRow][fromCol] = null;
      
      // Move rook
      const rookFromCol = toCol > fromCol ? 7 : 0;
      const rookToCol = toCol > fromCol ? 5 : 3;
      const rook = newBoard[fromRow][rookFromCol];
      newBoard[fromRow][rookToCol] = { ...rook, moved: true };
      newBoard[fromRow][rookFromCol] = null;
      
      moveData.special = toCol > fromCol ? 'castleKingside' : 'castleQueenside';
    } else if (specialMove === 'enPassant') {
      // Move pawn
      newBoard[toRow][toCol] = { ...piece, moved: true };
      newBoard[fromRow][fromCol] = null;
      
      // Remove captured pawn
      const capturedPawnRow = piece.team === 'birds' ? toRow + 1 : toRow - 1;
      const capturedPawn = newBoard[capturedPawnRow][toCol];
      newBoard[capturedPawnRow][toCol] = null;
      
      moveData.captured = 'pawn';
      moveData.capturedTeam = capturedPawn.team;
      moveData.special = 'enPassant';
    } else if (specialMove === 'promotion') {
      // Promote pawn
      const size = piece.piece.props.size;
      newBoard[toRow][toCol] = { 
        type: promotionType, 
        team: piece.team, 
        piece: getPromotedPiece(promotionType, piece.team, size), 
        moved: true 
      };
      newBoard[fromRow][fromCol] = null;
      
      moveData.special = `promotion_${promotionType}`;
      moveData.piece = promotionType; // Update piece type in history
    } else {
      // Normal move
      newBoard[toRow][toCol] = { ...piece, moved: true };
      newBoard[fromRow][fromCol] = null;
    }
    
    setBoard(newBoard);
    
    // Check if premove needs to be cancelled due to AI's move
    if (premove) {
      const { fromRow, fromCol } = premove;
      
      // Cancel premove if:
      // 1. The piece at the premove's from position was captured/moved
      // 2. The piece is no longer a bird piece (shouldn't happen, but safety check)
      const premovePiece = newBoard[fromRow][fromCol];
      if (!premovePiece || premovePiece.team !== 'birds') {
        console.log('🚫 Premove cancelled - piece was captured or moved by AI');
        setPremove(null);
        setPremoveHighlight(null);
        setSelectedSquare(null);
        setPossibleMoves([]);
      }
    }
    
    // Update move counters for 50-move rule
    const isPawnMoveOrCapture = piece.type === 'pawn' || capturedPiece !== null;
    if (isPawnMoveOrCapture) {
      setFiftyMoveCounter(0);
    } else {
      setFiftyMoveCounter(prev => prev + 1);
    }
    
    // Set last move for en passant detection
    setLastMove(moveData);
    
    setMoveHistory(prev => [...prev, moveData]);
    
    // Save position for repetition detection
    savePositionToHistory(newBoard, currentPlayer === 'birds' ? 'pigs' : 'birds');
    
    // Check for checkmate after the move
    const newCurrentPlayer = currentPlayer === 'birds' ? 'pigs' : 'birds';
    
    // Use a timeout to allow the board to update before checking game status
    setTimeout(() => {
      // Check for draws first
      if (aiInstance.hasInsufficientMaterial(newBoard)) {
        setGameStatus('stalemate');
        setGameResult('draw');
        
        // Award partial coins for draw
        if (levelData && addCoins && completeLevelWithStars) {
          const baseCoins = calculateCoinReward();
          const coinsEarned = Math.floor(baseCoins / 2);
          const currentCoins = playerInventory?.coins || 0;
          
          // Start coin animation
          setCoinAnimation({
            isAnimating: true,
            startAmount: currentCoins,
            endAmount: currentCoins + coinsEarned,
            currentAmount: currentCoins
          });
          
          completeLevelWithStars(levelData.id, 1, coinsEarned); // 1 star for draw
          console.log(`🤝 Draw by insufficient material! Earned ${coinsEarned} coins (${levelData.difficulty} difficulty)!`);
        }
        
        setTimeout(() => setShowGameEndModal(true), 500);
        console.log('Draw by insufficient material!');
        return;
      }
      
      if (aiInstance.isThreefoldRepetition(positionHistory)) {
        setGameStatus('stalemate');
        setGameResult('draw');
        
        // Award partial coins for draw
        if (levelData && addCoins && completeLevelWithStars) {
          const baseCoins = calculateCoinReward();
          const coinsEarned = Math.floor(baseCoins / 2);
          const currentCoins = playerInventory?.coins || 0;
          
          // Start coin animation
          setCoinAnimation({
            isAnimating: true,
            startAmount: currentCoins,
            endAmount: currentCoins + coinsEarned,
            currentAmount: currentCoins
          });
          
          completeLevelWithStars(levelData.id, 1, coinsEarned); // 1 star for draw
          console.log(`🤝 Draw by threefold repetition! Earned ${coinsEarned} coins (${levelData.difficulty} difficulty)!`);
        }
        
        setTimeout(() => setShowGameEndModal(true), 500);
        console.log('Draw by threefold repetition!');
        return;
      }
      
      if (aiInstance.isFiftyMoveRule(moveHistory)) {
        setGameStatus('stalemate');
        setGameResult('draw');
        
        // Award partial coins for draw
        if (levelData && addCoins && completeLevelWithStars) {
          const baseCoins = calculateCoinReward();
          const coinsEarned = Math.floor(baseCoins / 2);
          const currentCoins = playerInventory?.coins || 0;
          
          // Start coin animation
          setCoinAnimation({
            isAnimating: true,
            startAmount: currentCoins,
            endAmount: currentCoins + coinsEarned,
            currentAmount: currentCoins
          });
          
          completeLevelWithStars(levelData.id, 1, coinsEarned); // 1 star for draw
          console.log(`🤝 Draw by 50-move rule! Earned ${coinsEarned} coins (${levelData.difficulty} difficulty)!`);
        }
        
        setTimeout(() => setShowGameEndModal(true), 500);
        console.log('Draw by 50-move rule!');
        return;
      }
      
      if (aiInstance && aiInstance.isCheckmate(newBoard, newCurrentPlayer, lastMove, { positionHistory, fiftyMoveCounter })) {
        setGameStatus('checkmate');
        // Winner is the team that just moved
        const winner = currentPlayer;
        const isPlayerWin = winner === 'birds';
        setGameResult(isPlayerWin ? 'win' : 'loss');
        
        // Award coins for winning and save level progress
        if (isPlayerWin && levelData && addCoins && completeLevelWithStars) {
          const coinsEarned = calculateCoinReward();
          const currentCoins = playerInventory?.coins || 0;
          
          // Start coin animation
          setCoinAnimation({
            isAnimating: true,
            startAmount: currentCoins,
            endAmount: currentCoins + coinsEarned,
            currentAmount: currentCoins
          });
          
          completeLevelWithStars(levelData.id, 3, coinsEarned); // 3 stars for checkmate win
          console.log(`🏆 Victory! Earned ${coinsEarned} coins (${levelData.difficulty} difficulty)!`);
        }
        
        setTimeout(() => setShowGameEndModal(true), 500); // Small delay for dramatic effect
        console.log(`Checkmate! ${currentPlayer === 'birds' ? 'Angry Birds' : 'Green Pigs'} win!`);
      } else if (aiInstance && aiInstance.getAllPossibleMoves(newBoard, newCurrentPlayer, lastMove, { positionHistory, fiftyMoveCounter }).length === 0) {
        setGameStatus('stalemate');
        setGameResult('draw');
        
        // Award partial coins for draw
        if (levelData && addCoins && completeLevelWithStars) {
          const baseCoins = calculateCoinReward();
          const coinsEarned = Math.floor(baseCoins / 2);
          const currentCoins = playerInventory?.coins || 0;
          
          // Start coin animation
          setCoinAnimation({
            isAnimating: true,
            startAmount: currentCoins,
            endAmount: currentCoins + coinsEarned,
            currentAmount: currentCoins
          });
          
          completeLevelWithStars(levelData.id, 1, coinsEarned); // 1 star for draw
          console.log(`🤝 Draw! Earned ${coinsEarned} coins (${levelData.difficulty} difficulty)!`);
        }
        
        setTimeout(() => setShowGameEndModal(true), 500);
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
    } else if (difficulty === 'impossible') {
      setTimeRemaining(15);
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
    
    // Execute premove when it becomes player's turn
    if (currentPlayer === 'birds' && gameStatus === 'playing' && !isAiThinking && premove) {
      const { fromRow, fromCol, toRow, toCol, specialMove, promotionType } = premove;
      
      // Validate premove is still legal
      if (aiInstance && board[fromRow] && board[fromRow][fromCol]) {
        const piece = board[fromRow][fromCol];
        if (piece && piece.team === 'birds') {
          const moveValidation = aiInstance.isValidMoveWithSpecialRules(
            board, fromRow, fromCol, toRow, toCol, lastMove, { positionHistory, fiftyMoveCounter }
          );
          
          if (moveValidation.valid) {
            console.log('🚀 Executing premove:', premove);
            // Clear premove before executing
            setPremove(null);
            setPremoveHighlight(null);
            
            // Execute the premoved move
            setTimeout(() => {
              executeMove(fromRow, fromCol, toRow, toCol, specialMove || moveValidation.specialMove, promotionType);
            }, 100);
          } else {
            console.log('❌ Premove invalid, clearing:', premove);
            setPremove(null);
            setPremoveHighlight(null);
          }
        } else {
          // Piece no longer exists or wrong team
          console.log('❌ Premove piece invalid, clearing:', premove);
          setPremove(null);
          setPremoveHighlight(null);
        }
      }
    }
  }, [currentPlayer, gameStatus, board, aiInstance, premove]);

  const handleDragStart = (e, row, col) => {
    const piece = board[row][col];
    
    // Allow dragging bird pieces during AI thinking (for premoves)
    if (isAiThinking && piece && piece.team === 'birds') {
      setDraggedPiece({ row, col, piece });
      setSelectedSquare([row, col]);
      setPossibleMoves(calculatePossibleMoves(row, col));
      return;
    }
    
    // Normal drag logic - only allow dragging current player's pieces
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
    
    // Handle premoves during AI thinking
    if (isAiThinking && piece && piece.team === 'birds') {
      const moveValidation = aiInstance.isValidMoveWithSpecialRules(
        board, fromRow, fromCol, row, col, lastMove, { positionHistory, fiftyMoveCounter }
      );
      
      if (moveValidation.valid) {
        // Set premove
        const premoveData = {
          fromRow,
          fromCol,
          toRow: row,
          toCol: col,
          specialMove: moveValidation.special,
          promotionType: moveValidation.special === 'promotion' ? 'queen' : null
        };
        
        setPremove(premoveData);
        setPremoveHighlight({ from: [fromRow, fromCol], to: [row, col] });
        console.log('🚀 Premove set via drag:', premoveData);
        
        setSelectedSquare(null);
        setPossibleMoves([]);
      }
      return;
    }
    
    // Normal move logic
    if (piece && piece.team === currentPlayer) {
      // Check for special moves
      const moveValidation = aiInstance.isValidMoveWithSpecialRules(
        board, fromRow, fromCol, row, col, lastMove, { positionHistory, fiftyMoveCounter }
      );
      
      if (moveValidation.valid) {
        if (moveValidation.special === 'promotion') {
          // Show promotion modal
          setPromotionData({ fromRow, fromCol, toRow: row, toCol: col });
          setShowPromotionModal(true);
          setSelectedSquare(null);
          setPossibleMoves([]);
          return;
        } else if (moveValidation.special === 'castleKingside' || moveValidation.special === 'castleQueenside') {
          executeMove(fromRow, fromCol, row, col, 'castle');
        } else if (moveValidation.special === 'enPassant') {
          executeMove(fromRow, fromCol, row, col, 'enPassant');
        } else {
          executeMove(fromRow, fromCol, row, col);
        }
        
        setSelectedSquare(null);
        setPossibleMoves([]);
      }
    }
  };

  const handleSquareClick = (row, col) => {
    if (gameStatus !== 'playing') return;

    // Allow premoves whenever AI is thinking (regardless of whose "turn" it is)
    if (isAiThinking) {
      // Handle premove logic
      if (selectedSquare) {
        const [fromRow, fromCol] = selectedSquare;
        
        if (fromRow === row && fromCol === col) {
          // Deselect if clicking the same square
          setSelectedSquare(null);
          setPossibleMoves([]);
          setPremove(null);
          setPremoveHighlight(null);
          return;
        }

        const piece = board[fromRow][fromCol];
        if (piece && piece.team === 'birds') { // Only birds can make premoves
          // Validate premove (simulate what the move would be on current board)
          const moveValidation = aiInstance.isValidMoveWithSpecialRules(
            board, fromRow, fromCol, row, col, lastMove, { positionHistory, fiftyMoveCounter }
          );
          
          if (moveValidation.valid) {
            // Set premove
            const premoveData = {
              fromRow,
              fromCol,
              toRow: row,
              toCol: col,
              specialMove: moveValidation.special,
              promotionType: moveValidation.special === 'promotion' ? 'queen' : null // Default to queen for premove promotions
            };
            
            setPremove(premoveData);
            setPremoveHighlight({ from: [fromRow, fromCol], to: [row, col] });
            console.log('📝 Premove set:', premoveData);
            
            setSelectedSquare(null);
            setPossibleMoves([]);
          } else {
            // Invalid premove, select new piece if it's a bird
            const newPiece = board[row][col];
            if (newPiece && newPiece.team === 'birds') {
              setSelectedSquare([row, col]);
              setPossibleMoves(calculatePossibleMoves(row, col));
              setPremove(null);
              setPremoveHighlight(null);
            } else {
              setSelectedSquare(null);
              setPossibleMoves([]);
              setPremove(null);
              setPremoveHighlight(null);
            }
          }
        }
      } else {
        // Select piece for premove (only birds)
        const piece = board[row][col];
        if (piece && piece.team === 'birds') {
          setSelectedSquare([row, col]);
          setPossibleMoves(calculatePossibleMoves(row, col));
          setPremove(null);
          setPremoveHighlight(null);
        }
      }
      return;
    }

    // Normal move logic (when it's player's turn)
    if (selectedSquare) {
      const [fromRow, fromCol] = selectedSquare;
      
      if (fromRow === row && fromCol === col) {
        // Deselect if clicking the same square
        setSelectedSquare(null);
        setPossibleMoves([]);
        return;
      }

      const piece = board[fromRow][fromCol];
      if (piece && piece.team === currentPlayer) {
        // Check for special moves
        const moveValidation = aiInstance.isValidMoveWithSpecialRules(
          board, fromRow, fromCol, row, col, lastMove, { positionHistory, fiftyMoveCounter }
        );
        
        console.log(`🎯 Move validation for ${piece.type} from ${fromRow},${fromCol} to ${row},${col}:`, moveValidation);
        
        if (moveValidation.valid) {
          if (moveValidation.special === 'promotion') {
            // Show promotion modal
            setPromotionData({ fromRow, fromCol, toRow: row, toCol: col });
            setShowPromotionModal(true);
            setSelectedSquare(null);
            setPossibleMoves([]);
            return;
          } else if (moveValidation.special === 'castleKingside' || moveValidation.special === 'castleQueenside') {
            executeMove(fromRow, fromCol, row, col, 'castle');
          } else if (moveValidation.special === 'enPassant') {
            executeMove(fromRow, fromCol, row, col, 'enPassant');
          } else {
            executeMove(fromRow, fromCol, row, col);
          }
          
          setSelectedSquare(null);
          setPossibleMoves([]);
        } else {
          console.log(`❌ Invalid move: ${piece.type} from ${fromRow},${fromCol} to ${row},${col}`);
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
    
    // Check if this square is part of a premove
    const isPremoveFrom = premoveHighlight && premoveHighlight.from && 
                         premoveHighlight.from[0] === row && premoveHighlight.from[1] === col;
    const isPremoveTo = premoveHighlight && premoveHighlight.to && 
                       premoveHighlight.to[0] === row && premoveHighlight.to[1] === col;
    
    // Check if this square contains a king in check
    const piece = board[row][col];
    const isKingInCheckSquare = piece && piece.type === 'king' && (
      (piece.team === 'birds' && isInCheck.birds) || 
      (piece.team === 'pigs' && isInCheck.pigs)
    );
    
    // Check if this is a castling move
    const selectedPiece = selectedSquare ? board[selectedSquare[0]][selectedSquare[1]] : null;
    const isCastlingMove = selectedPiece?.type === 'king' && 
                          selectedSquare?.[1] === 4 && 
                          selectedSquare?.[0] === row &&
                          (col === 2 || col === 6) &&
                          isPossibleMove;
    
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
    
    // Premoves should have highest priority for blue coloring
    if (isPremoveFrom) return 'bg-blue-400 border-blue-600 animate-pulse shadow-lg shadow-blue-500/50'; // Premove from square
    if (isPremoveTo) return 'bg-blue-300 border-blue-500 animate-pulse shadow-lg shadow-blue-400/40'; // Premove to square
    if (isSelected) return 'bg-yellow-400 border-yellow-600';
    if (isKingInCheckSquare) return 'bg-red-500 border-red-700 animate-pulse shadow-lg shadow-red-500/50'; // Highlight king in check with glow
    if (isAttackingKing) return 'bg-orange-400 border-orange-600 animate-pulse'; // Highlight attacking pieces
    if (isCastlingMove) return 'bg-purple-400 border-purple-600 animate-pulse shadow-lg'; // Special highlight for castling
    
    // During AI thinking, show all possible moves in blue (premove style)
    if (isAiThinking && isPossibleMove && isCapture) return 'bg-blue-400 border-blue-600 animate-pulse'; // Blue for premove captures
    if (isAiThinking && isPossibleMove) return 'bg-blue-300 border-blue-500 animate-pulse'; // Blue for premove moves
    
    // Normal game colors (when not AI thinking)
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
    setShowGameEndModal(false);
    setPremove(null);
    setPremoveHighlight(null);
    setGameResult(null);
    setPositionHistory([]);
    setFiftyMoveCounter(0);
    setShowPromotionModal(false);
    setPromotionData(null);
    setLastMove(null);
    setCoinAnimation({ isAnimating: false, startAmount: 0, endAmount: 0, currentAmount: 0 });
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
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-purple-900 text-white p-2 sm:p-4">
      <div className="max-w-7xl mx-auto flex flex-col">
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
              {/* Check indicator in header - show when birds in check */}
              {isInCheck.birds && gameStatus === 'playing' && (
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

        <div className="flex flex-col lg:flex-row gap-3 lg:gap-4">
          {/* Chess Board */}
          <div className="flex-1 max-w-2xl mx-auto lg:mx-0 flex flex-col">
            {/* Top Territory Label - Pigs */}
            <div className="text-center mb-1 flex-shrink-0">
              <span className="text-xs sm:text-sm text-slate-400 bg-slate-800 px-3 py-1 rounded-full">
                🐷 Pig Territory
              </span>
            </div>

            <div className="bg-gradient-to-br from-amber-200 to-amber-600 p-3 rounded-2xl shadow-2xl flex-shrink-0">
              <div className="grid grid-cols-8 gap-1 bg-amber-900 p-2 rounded-xl w-full max-w-2xl mx-auto">
                {Array(8).fill(null).map((_, rowIndex) =>
                  Array(8).fill(null).map((_, colIndex) => (
                    <div
                      key={`${rowIndex}-${colIndex}`}
                      className={`
                        aspect-square border border-opacity-50 rounded cursor-pointer 
                        transition-all duration-200 hover:shadow-lg
                        flex items-center justify-center relative
                        w-full h-full min-w-[40px] min-h-[40px]
                        ${getSquareColor(rowIndex, colIndex)}
                      `}
                      onClick={() => handleSquareClick(rowIndex, colIndex)}
                      onDragOver={handleDragOver}
                      onDrop={(e) => handleDrop(e, rowIndex, colIndex)}
                    >
                      {board[rowIndex] && board[rowIndex][colIndex] && (
                        <div 
                          className="transition-transform duration-200 hover:scale-110 w-full h-full flex items-center justify-center cursor-grab active:cursor-grabbing"
                          draggable={board[rowIndex][colIndex].team === currentPlayer || (isAiThinking && board[rowIndex][colIndex].team === 'birds')}
                          onDragStart={(e) => handleDragStart(e, rowIndex, colIndex)}
                          onDragEnd={handleDragEnd}
                        >
                          {board[rowIndex][colIndex].piece}
                        </div>
                      )}
                      
                      {/* Castling indicator */}
                      {(!board[rowIndex] || !board[rowIndex][colIndex]) && possibleMoves.some(move => move[0] === rowIndex && move[1] === colIndex) && 
                       selectedSquare && board[selectedSquare[0]] && board[selectedSquare[0]][selectedSquare[1]]?.type === 'king' && 
                       selectedSquare[1] === 4 && selectedSquare[0] === rowIndex && (colIndex === 2 || colIndex === 6) && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                          <div className="text-2xl animate-bounce">🏰</div>
                          <div className="text-xs font-bold text-white bg-purple-600 px-1 rounded mt-1">
                            {colIndex === 6 ? 'O-O' : 'O-O-O'}
                          </div>
                        </div>
                      )}
                      
                      {/* Regular move indicator */}
                      {(!board[rowIndex] || !board[rowIndex][colIndex]) && possibleMoves.some(move => move[0] === rowIndex && move[1] === colIndex) && 
                       !(selectedSquare && board[selectedSquare[0]] && board[selectedSquare[0]][selectedSquare[1]]?.type === 'king' && 
                         selectedSquare[1] === 4 && selectedSquare[0] === rowIndex && (colIndex === 2 || colIndex === 6)) && (
                        <div className="w-4 h-4 bg-green-400 rounded-full opacity-80"></div>
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
                  {premove && (
                    <span className="text-sm text-blue-400 ml-2">(Premove Set)</span>
                  )}
                </span>
              </div>
              
              {/* Check Warning - Show for birds (player) when in check */}
              {isInCheck.birds && gameStatus === 'playing' && (
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
                  
                  {/* Premove Cancel Button */}
                  {premove && (
                    <div className="mt-2 flex items-center gap-2">
                      <button
                        onClick={() => {
                          setPremove(null);
                          setPremoveHighlight(null);
                          setSelectedSquare(null);
                          setPossibleMoves([]);
                        }}
                        className="text-xs bg-blue-500 hover:bg-blue-600 text-white px-2 py-1 rounded transition-colors"
                      >
                        Cancel Premove
                      </button>
                      <span className="text-xs text-blue-400">
                        {premove && `${String.fromCharCode(97 + premove.fromCol)}${8 - premove.fromRow} → ${String.fromCharCode(97 + premove.toCol)}${8 - premove.toRow}`}
                      </span>
                    </div>
                  )}
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
              
              {/* Timer for hard, nightmare, and impossible difficulties */}
              {timeRemaining && (levelData?.difficulty?.toLowerCase() === 'hard' || levelData?.difficulty?.toLowerCase() === 'nightmare' || levelData?.difficulty?.toLowerCase() === 'impossible') && (
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
                        width: `${(timeRemaining / (
                          levelData?.difficulty?.toLowerCase() === 'hard' ? 45 : 
                          levelData?.difficulty?.toLowerCase() === 'nightmare' ? 20 : 
                          levelData?.difficulty?.toLowerCase() === 'impossible' ? 15 : 20
                        )) * 100}%` 
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
              <div className="h-20 overflow-x-auto overflow-y-hidden" ref={moveHistoryRef}>
                <div className="flex gap-2 pb-2 min-w-max">
                  {moveHistory.slice(-12).map((move, index) => (
                    <div 
                      key={index} 
                      className="text-xs text-slate-300 bg-slate-700/50 p-2 rounded flex-shrink-0 min-w-[160px] max-w-[200px] border border-slate-600/50"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium capitalize text-xs truncate">
                          {move.special?.startsWith('promotion_') ? move.special.split('_')[1] : move.piece}
                          {move.isCheck && (
                            <span className="text-red-400 ml-1 font-bold">+</span>
                          )}
                        </span>
                        <span className="text-xs text-slate-400 flex-shrink-0 ml-1">
                          #{moveHistory.length - moveHistory.slice(-12).length + index + 1}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-400 font-mono flex-shrink-0">
                          {move.special === 'castleKingside' ? 'O-O' :
                           move.special === 'castleQueenside' ? 'O-O-O' :
                           `${move.fromPosition}→${move.toPosition}`}
                        </span>
                        <div className="flex gap-1 ml-1 flex-shrink-0">
                          {move.captured && (
                            <span className="text-red-400 text-xs">⚔️</span>
                          )}
                          {move.isCheck && (
                            <span className="text-orange-400 text-xs">⚠️</span>
                          )}
                          {move.special === 'enPassant' && (
                            <span className="text-purple-400 text-xs">🎯</span>
                          )}
                          {(move.special === 'castleKingside' || move.special === 'castleQueenside') && (
                            <span className="text-blue-400 text-xs">🏰</span>
                          )}
                          {move.special?.startsWith('promotion_') && (
                            <span className="text-yellow-400 text-xs">👑</span>
                          )}
                        </div>
                      </div>
                      {move.captured && !move.special?.includes('enPassant') && (
                        <div className="text-xs text-red-300 mt-1 truncate">
                          Took {move.captured}
                        </div>
                      )}
                      {move.special === 'enPassant' && (
                        <div className="text-xs text-purple-300 mt-1">
                          En passant capture
                        </div>
                      )}
                      {move.special?.startsWith('promotion_') && (
                        <div className="text-xs text-yellow-300 mt-1">
                          Promoted to {move.special.split('_')[1]}
                        </div>
                      )}
                      {(move.special === 'castleKingside' || move.special === 'castleQueenside') && (
                        <div className="text-xs text-blue-300 mt-1">
                          {move.special === 'castleKingside' ? 'Short castle' : 'Long castle'}
                        </div>
                      )}
                    </div>
                  ))}
                  {moveHistory.length === 0 && (
                    <div className="flex items-center justify-center h-full text-slate-500 text-sm w-full">
                      No moves yet
                    </div>
                  )}
                </div>
              </div>
              {moveHistory.length > 12 && (
                <div className="text-xs text-slate-500 mt-2 text-center">
                  ← Auto-scrolls to latest move →
                </div>
              )}
              
              {/* Game rule status indicators */}
              {(fiftyMoveCounter > 40 || positionHistory.length > 4) && (
                <div className="mt-3 pt-3 border-t border-slate-600">
                  <div className="text-xs text-slate-400 space-y-1">
                    {fiftyMoveCounter > 40 && (
                      <div className="flex justify-between">
                        <span>50-Move Rule:</span>
                        <span className={fiftyMoveCounter >= 100 ? 'text-red-400' : 'text-yellow-400'}>
                          {Math.floor(fiftyMoveCounter / 2)}/50
                        </span>
                      </div>
                    )}
                    {aiInstance && positionHistory.length > 4 && aiInstance.isThreefoldRepetition(positionHistory) && (
                      <div className="text-orange-400">
                        Threefold repetition possible - claim draw!
                      </div>
                    )}
                  </div>
                </div>
              )}
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
                      {calculateCoinReward()} coins • {levelData.difficulty} • Click for details
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

        {/* Promotion Modal */}
        {showPromotionModal && promotionData && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 animate-fadeIn">
            <div className="bg-slate-800 rounded-2xl p-6 sm:p-8 max-w-sm w-full mx-4 shadow-2xl border border-slate-700">
              <h2 className="text-2xl font-bold text-white mb-4 text-center flex items-center justify-center gap-2">
                🎖️ Pawn Promotion
              </h2>
              <p className="text-slate-300 text-center mb-6">
                Choose what to promote your pawn to:
              </p>
              <div className="grid grid-cols-2 gap-4">
                {['queen', 'rook', 'bishop', 'knight'].map(pieceType => (
                  <button
                    key={pieceType}
                    onClick={() => {
                      executeMove(
                        promotionData.fromRow, 
                        promotionData.fromCol, 
                        promotionData.toRow, 
                        promotionData.toCol, 
                        'promotion', 
                        pieceType
                      );
                      setShowPromotionModal(false);
                      setPromotionData(null);
                    }}
                    className="bg-slate-700 hover:bg-slate-600 text-white py-4 px-3 rounded-xl transition-all duration-200 font-medium hover:scale-105 flex flex-col items-center gap-2 border border-slate-600 hover:border-slate-500"
                  >
                    <div className="text-3xl">
                      {getPromotedPiece(pieceType, currentPlayer, 32)}
                    </div>
                    <span className="text-sm capitalize">{pieceType}</span>
                  </button>
                ))}
              </div>
              <div className="text-xs text-slate-400 text-center mt-4">
                Queen is the most powerful choice, but others have strategic value!
              </div>
            </div>
          </div>
        )}

        {/* Game End Modal */}
        {showGameEndModal && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 animate-fadeIn">
            <div className={`bg-gradient-to-br rounded-3xl p-8 max-w-md w-full mx-4 shadow-2xl border-4 transform transition-all duration-500 ${
              gameResult === 'win' 
                ? 'from-green-400 via-emerald-500 to-teal-600 border-green-300 animate-bounce-gentle' 
                : gameResult === 'loss'
                ? 'from-red-400 via-red-500 to-red-600 border-red-300 animate-shake'
                : 'from-yellow-400 via-orange-500 to-amber-600 border-yellow-300 animate-pulse'
            }`}>
              {/* Win Screen */}
              {gameResult === 'win' && (
                <div className="text-center text-white">
                  <div className="text-6xl mb-4 animate-spin-slow">🏆</div>
                  <h2 className="text-3xl font-bold mb-2 text-yellow-100 drop-shadow-lg">
                    VICTORY!
                  </h2>
                  <p className="text-lg mb-4 text-green-100">
                    The Angry Birds triumph! 🐦
                  </p>
                  <div className="bg-white/20 rounded-lg p-4 mb-6 backdrop-blur-sm">
                    <div className="flex items-center justify-center gap-2 mb-2">
                      <span className="text-2xl">🪙</span>
                      <span className="text-2xl font-bold text-yellow-200">
                        +{coinAnimation.isAnimating ? 
                          (coinAnimation.currentAmount - coinAnimation.startAmount) : 
                          calculateCoinReward()
                        }
                      </span>
                      <span className="text-lg text-yellow-100">coins</span>
                      {coinAnimation.isAnimating && (
                        <span className="text-lg text-green-300 animate-pulse">⬆️</span>
                      )}
                    </div>
                    <p className="text-sm text-green-100">Mission accomplished!</p>
                  </div>
                </div>
              )}

              {/* Loss Screen */}
              {gameResult === 'loss' && (
                <div className="text-center text-white">
                  <div className="text-6xl mb-4 animate-pulse">💀</div>
                  <h2 className="text-3xl font-bold mb-2 text-red-100 drop-shadow-lg">
                    DEFEAT
                  </h2>
                  <p className="text-lg mb-4 text-red-100">
                    The Pigs have won this battle... 🐷
                  </p>
                  <div className="bg-white/20 rounded-lg p-4 mb-6 backdrop-blur-sm">
                    <p className="text-sm text-red-100">
                      Don't give up! Try again with a different strategy.
                    </p>
                  </div>
                </div>
              )}

              {/* Draw Screen */}
              {gameResult === 'draw' && (
                <div className="text-center text-white">
                  <div className="text-6xl mb-4 animate-bounce">🤝</div>
                  <h2 className="text-3xl font-bold mb-2 text-orange-100 drop-shadow-lg">
                    STALEMATE
                  </h2>
                  <p className="text-lg mb-4 text-amber-100">
                    A draw! Neither side could claim victory.
                  </p>
                  <div className="bg-white/20 rounded-lg p-4 mb-6 backdrop-blur-sm">
                    <div className="flex items-center justify-center gap-2 mb-2">
                      <span className="text-2xl">🪙</span>
                      <span className="text-2xl font-bold text-yellow-200">
                        +{coinAnimation.isAnimating ? 
                          (coinAnimation.currentAmount - coinAnimation.startAmount) : 
                          Math.floor(calculateCoinReward() / 2)
                        }
                      </span>
                      <span className="text-lg text-yellow-100">coins</span>
                      {coinAnimation.isAnimating && (
                        <span className="text-lg text-amber-300 animate-pulse">⬆️</span>
                      )}
                    </div>
                    <p className="text-sm text-amber-100">Partial reward for the effort!</p>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowGameEndModal(false);
                    resetGame();
                  }}
                  className="flex-1 bg-white/20 hover:bg-white/30 text-white py-3 px-4 rounded-xl transition-all duration-200 font-semibold backdrop-blur-sm border border-white/30 hover:scale-105"
                >
                  Play Again
                </button>
                <button
                  onClick={onBack}
                  className="flex-1 bg-white/20 hover:bg-white/30 text-white py-3 px-4 rounded-xl transition-all duration-200 font-semibold backdrop-blur-sm border border-white/30 hover:scale-105"
                >
                  Back to Menu
                </button>
              </div>
            </div>
          </div>
        )}

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
                        levelData.difficulty?.toLowerCase() === 'impossible' ? 'text-purple-400' :
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
                    <span className="text-xl font-bold text-yellow-400">{calculateCoinReward()}</span>
                    <span className="text-slate-300">coins</span>
                  </div>
                </div>

                {(levelData.difficulty?.toLowerCase() === 'hard' || levelData.difficulty?.toLowerCase() === 'nightmare' || levelData.difficulty?.toLowerCase() === 'impossible') && (
                  <div className="bg-red-900/30 border border-red-800/50 rounded-lg p-4">
                    <h3 className="font-semibold text-red-400 mb-2 flex items-center gap-2">
                      ⚠️ Special Rules
                    </h3>
                    <div className="text-sm text-red-200">
                      <div className="flex justify-between">
                        <span>Move Timer:</span>
                        <span className="font-medium">
                          {levelData.difficulty?.toLowerCase() === 'hard' ? '45s' : 
                           levelData.difficulty?.toLowerCase() === 'nightmare' ? '20s' : 
                           levelData.difficulty?.toLowerCase() === 'impossible' ? '15s' : '20s'} per move
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
