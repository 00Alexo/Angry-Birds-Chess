import React, { useState, useEffect, useCallback } from 'react';
import { IoFlag, IoVolumeHigh, IoVolumeOff } from 'react-icons/io5';
import multiplayerSocket from '../services/multiplayerSocket';
import { useAuth } from '../contexts/AuthContext';

// Import all the chess pieces
import { 
  RedBird, BlueBird, YellowBird, WhiteBird, BlackBird, Stella,
  KingPig, QueenPig, RegularPig, CorporalPig, ForemanPig, NinjaPig
} from './characters';

// Import AI for move validation and analysis
import { ChessAI } from './ai/ChessAI';
import { analyzeMove, evaluatePosition } from '../utils/moveAnalyzer';

const MultiplayerChessBoard = ({ matchData, onGameEnd }) => {
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
  const [gameEndData, setGameEndData] = useState(null); // For showing game end modal
  const [myTimer, setMyTimer] = useState(60); // MY timer - only counts when it's my turn
  const [gameEnded, setGameEnded] = useState(false);
  
  // Premove system
  const [premove, setPremove] = useState(null); // Stores premove data
  const [premoveHighlight, setPremoveHighlight] = useState(null); // Visual highlight for premove

  // Initialize board when component mounts
  useEffect(() => {
    console.log('🎮 [MultiplayerChess] ===== COMPONENT INITIALIZATION =====');
    console.log('🎮 [MultiplayerChess] matchData received:', JSON.stringify(matchData, null, 2));
    
    if (matchData) {
      console.log('🎮 [MultiplayerChess] Setting myColor to:', matchData.playerColor);
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

  // Additional effect to ensure myColor is synced with matchData
  useEffect(() => {
    if (matchData && matchData.playerColor && myColor !== matchData.playerColor) {
      console.log(`🔄 [MultiplayerChess] Syncing myColor: ${myColor} → ${matchData.playerColor}`);
      setMyColor(matchData.playerColor);
    }
  }, [matchData?.playerColor, myColor]);

  // Handle page leave/refresh as abandonment
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (matchData?.matchId && gameStatus === 'active') {
        // Browser will show a confirmation dialog
        e.preventDefault();
        e.returnValue = 'Are you sure you want to leave? This will count as abandoning the match.';
        return e.returnValue;
      }
    };

    const handleUnload = () => {
      if (matchData?.matchId && gameStatus === 'active') {
        // Player is leaving - this will be detected as abandonment by the backend
        console.log('🚪 [MultiplayerChess] Player leaving page during active game');
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('unload', handleUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('unload', handleUnload);
    };
  }, [matchData?.matchId, gameStatus]);

  // MY timer - only runs when it's MY turn
  useEffect(() => {
    if (gameEnded || gameStatus !== 'active') {
      return; // Don't run timer if game is over
    }

    // Only run MY timer when it's MY turn
    if (currentPlayer !== myColor) {
      console.log(`⏸️ [MultiplayerChess] MY timer paused - it's ${currentPlayer}'s turn, I am ${myColor}`);
      return; // Don't run my timer, it's not my turn
    }

    console.log(`⏰ [MultiplayerChess] Starting MY 60s timer - it's my turn (${myColor})`);

    const interval = setInterval(() => {
      setMyTimer(prev => {
        const newTime = prev - 1;
        
        if (newTime <= 0) {
          console.log('⏰ [MultiplayerChess] MY TIMER EXPIRED! I lose!');
          
          // I timed out, opponent wins
          const winner = myColor === 'white' ? 'black' : 'white';
          
          console.log('⏰ [MultiplayerChess] Timeout details:');
          console.log('⏰ [MultiplayerChess] - My color:', myColor);
          console.log('⏰ [MultiplayerChess] - Winner (opponent):', winner);
          console.log('⏰ [MultiplayerChess] - Loser (me):', myColor);
          
          // End the game immediately
          setGameEnded(true);
          setGameStatus('timeout');
          
          // Send timeout notification via WebSocket
          const timeoutData = {
            gameId: matchData?.matchId, // Use matchId instead of gameId
            player: myColor,
            winner: winner
          };
          
          console.log('⏰ [MultiplayerChess] Sending timeout event:', timeoutData);
          console.log('⏰ [MultiplayerChess] matchData.matchId:', matchData?.matchId);
          multiplayerSocket.emit('playerTimeout', timeoutData);
          
          // Show game end modal
          setGameEndData({
            result: 'loss', // I lost due to MY timeout
            reason: 'timeout',
            winner: winner,
            loser: myColor,
            matchId: matchData?.matchId
          });
          
          return 0;
        }
        return newTime;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [currentPlayer, myColor, gameEnded, gameStatus, matchData?.matchId]);

  // Reset MY timer to 60 seconds when it becomes my turn
  useEffect(() => {
    if (currentPlayer === myColor && !gameEnded && gameStatus === 'active') {
      console.log(`🔄 [MultiplayerChess] Resetting MY timer to 60s - my turn started`);
      setMyTimer(60);
      
      // Execute premove if one is set
      if (premove) {
        console.log('📝 [MultiplayerChess] ===== EXECUTING PREMOVE =====');
        console.log('📝 [MultiplayerChess] Premove data:', premove);
        
        const { fromRow, fromCol, toRow, toCol, specialMove, promotionType } = premove;
        
        // Validate the premove is still legal
        const myTeam = myColor === 'white' ? 'birds' : 'pigs';
        const allTeamMoves = aiInstance.getAllPossibleMoves(board, myTeam, lastMove);
        const isStillValid = allTeamMoves.some(move => 
          move.fromRow === fromRow && move.fromCol === fromCol && 
          move.toRow === toRow && move.toCol === toCol
        );
        
        if (isStillValid) {
          console.log('✅ [MultiplayerChess] Premove is still valid - executing');
          // Execute the premove
          makeMove(fromRow, fromCol, toRow, toCol, specialMove, promotionType);
        } else {
          console.log('❌ [MultiplayerChess] Premove no longer valid - cancelling');
        }
        
        // Clear premove
        setPremove(null);
        setPremoveHighlight(null);
      }
    }
  }, [currentPlayer, myColor, gameEnded, gameStatus, premove, board, lastMove]);

  // Initialize chess board with pieces oriented correctly for each player
  const initializeBoard = () => {
    const newBoard = Array(8).fill(null).map(() => Array(8).fill(null));
    
    // Determine which team I'm playing as
    const iPlayBirds = matchData.playerColor === 'white';
    
    console.log(`🎮 [MultiplayerChess] Setting up board. I play: ${iPlayBirds ? 'Birds (white)' : 'Pigs (black)'}`);
    
    // Setup Bird pieces (always white in chess logic)
    const birdBackRank = [
      { type: 'rook', color: 'white', team: 'birds', piece: <YellowBird size={40} />, moved: false },
      { type: 'knight', color: 'white', team: 'birds', piece: <BlackBird size={40} />, moved: false },
      { type: 'bishop', color: 'white', team: 'birds', piece: <WhiteBird size={40} />, moved: false },
      { type: 'queen', color: 'white', team: 'birds', piece: <Stella size={40} />, moved: false },
      { type: 'king', color: 'white', team: 'birds', piece: <RedBird size={40} />, moved: false },
      { type: 'bishop', color: 'white', team: 'birds', piece: <WhiteBird size={40} />, moved: false },
      { type: 'knight', color: 'white', team: 'birds', piece: <BlackBird size={40} />, moved: false },
      { type: 'rook', color: 'white', team: 'birds', piece: <YellowBird size={40} />, moved: false }
    ];
    
    // Setup Pig pieces (always black in chess logic) - Using ORIGINAL correct assignments
    const pigBackRank = [
      { type: 'rook', color: 'black', team: 'pigs', piece: <CorporalPig size={40} />, moved: false },      // Rook = CorporalPig (gray military helmet)
      { type: 'knight', color: 'black', team: 'pigs', piece: <NinjaPig size={40} />, moved: false },       // Knight = NinjaPig  
      { type: 'bishop', color: 'black', team: 'pigs', piece: <ForemanPig size={40} />, moved: false },     // Bishop = ForemanPig (yellow construction helmet)
      { type: 'queen', color: 'black', team: 'pigs', piece: <QueenPig size={40} />, moved: false },        // Queen = QueenPig
      { type: 'king', color: 'black', team: 'pigs', piece: <KingPig size={40} />, moved: false },          // King = KingPig
      { type: 'bishop', color: 'black', team: 'pigs', piece: <ForemanPig size={40} />, moved: false },     // Bishop = ForemanPig (yellow construction helmet)
      { type: 'knight', color: 'black', team: 'pigs', piece: <NinjaPig size={40} />, moved: false },       // Knight = NinjaPig
      { type: 'rook', color: 'black', team: 'pigs', piece: <CorporalPig size={40} />, moved: false }       // Rook = CorporalPig (gray military helmet)
    ];
    
    // Place pieces based on standard chess positions
    // Birds (white) always start from white's perspective (row 7 for back rank, row 6 for pawns)
    // Pigs (black) always start from black's perspective (row 0 for back rank, row 1 for pawns)
    newBoard[0] = [...pigBackRank];   // Pigs back rank (top)
    newBoard[7] = [...birdBackRank];  // Birds back rank (bottom)
    
    // Place pawns
    for (let col = 0; col < 8; col++) {
      newBoard[1][col] = { type: 'pawn', color: 'black', team: 'pigs', piece: <RegularPig size={32} />, moved: false };  // Pig pawns (top)
      newBoard[6][col] = { type: 'pawn', color: 'white', team: 'birds', piece: <BlueBird size={32} />, moved: false };   // Bird pawns (bottom)
    }
    
    setBoard(newBoard);
    console.log(`🎮 [MultiplayerChess] Board initialized. I am playing as ${iPlayBirds ? 'Birds' : 'Pigs'} (${matchData.playerColor})`);
    console.log(`🎮 [MultiplayerChess] My color: ${myColor}, Current player: ${currentPlayer}`);
    console.log(`🎮 [MultiplayerChess] Sample pieces:`, {
      topLeft: newBoard[0][0],
      bottomLeft: newBoard[7][0],
      topPawn: newBoard[1][0],
      bottomPawn: newBoard[6][0]
    });
  };

  // Setup multiplayer event listeners
  const setupMultiplayerListeners = useCallback(() => {
    console.log('🔌 [MultiplayerChess] Setting up opponent move listeners...');
    const unsubscribeOpponentMove = multiplayerSocket.onOpponentMove((moveData) => {
      console.log('🎯 [MultiplayerChess] ===== OPPONENT MOVE EVENT TRIGGERED =====');
      console.log('🎯 [MultiplayerChess] Raw moveData:', JSON.stringify(moveData, null, 2));
      applyOpponentMove(moveData);
    });
    
    const unsubscribeGameEnd = multiplayerSocket.onGameEnd((result, reason, data) => {
      console.log('🏁 [MultiplayerChess] ===== GAME END EVENT TRIGGERED =====');
      console.log('🏁 [MultiplayerChess] Result:', result, 'Reason:', reason);
      console.log('🏁 [MultiplayerChess] Full data:', JSON.stringify(data, null, 2));
      
      // Show game end modal with details
      setGameEndData({
        result,
        reason,
        winner: data.winner,
        loser: data.loser,
        matchId: data.matchId
      });
    });

    // Listen for timeout events (when opponent times out)
    const unsubscribeTimeout = multiplayerSocket.onPlayerTimeout((data) => {
      console.log('⏰ [MultiplayerChess] ===== OPPONENT TIMEOUT RECEIVED =====');
      console.log('⏰ [MultiplayerChess] Timeout data:', data);
      console.log('⏰ [MultiplayerChess] My color:', myColor);
      console.log('⏰ [MultiplayerChess] Winner from event:', data.winner);
      console.log('⏰ [MultiplayerChess] Am I the winner?', data.winner === myColor);
      
      // Stop local timer and end game
      setGameEnded(true);
      setGameStatus('timeout');
      
      // Show game end modal
      const gameEndResult = {
        result: data.winner === myColor ? 'win' : 'loss',
        reason: 'timeout',
        winner: data.winner,
        loser: data.player,
        matchId: matchData?.matchId
      };
      
      console.log('⏰ [MultiplayerChess] Setting game end data:', gameEndResult);
      setGameEndData(gameEndResult);
    });
    
    console.log('✅ [MultiplayerChess] All listeners set up successfully');
    
    // Store cleanup functions
    window.multiplayerCleanup = () => {
      unsubscribeOpponentMove();
      unsubscribeGameEnd();
      unsubscribeTimeout();
    };
  }, []);

  const cleanupMultiplayerListeners = () => {
    if (window.multiplayerCleanup) {
      window.multiplayerCleanup();
      window.multiplayerCleanup = null;
    }
  };

  // Apply opponent's move to the board
  const applyOpponentMove = useCallback((moveData) => {
    console.log('🎯 [MultiplayerChess] ===== APPLYING OPPONENT MOVE =====');
    console.log('[MultiplayerChess] Full moveData received:', JSON.stringify(moveData, null, 2));
    
    if (!moveData || !moveData.move) {
      console.error('[MultiplayerChess] ❌ Invalid moveData - missing move object');
      return;
    }
    
    const { move } = moveData;
    const { from, to, piece, special, promotionType } = move;
    
    if (!from || !to || !Array.isArray(from) || !Array.isArray(to)) {
      console.error('[MultiplayerChess] ❌ Invalid move coordinates:', { from, to });
      return;
    }
    
    console.log(`🎯 [MultiplayerChess] Applying opponent move: ${piece} from [${from[0]},${from[1]}] to [${to[0]},${to[1]}]`);
    
    // Capture current board state for analysis
    let boardBeforeOpponentMove = null;
    let boardAfterOpponentMove = null;
    let capturedPiece = null;
    let movingPiece = null;
    
    // Use functional state update to get current board state
    setBoard(currentBoard => {
      console.log('[MultiplayerChess] Current board state when applying opponent move:', currentBoard);
      
      // Store board state for analysis
      boardBeforeOpponentMove = currentBoard;
      
      const newBoard = currentBoard.map(row => [...row]);
      movingPiece = newBoard[from[0]][from[1]];
      capturedPiece = newBoard[to[0]][to[1]];
      
      if (!movingPiece) {
        console.error('[MultiplayerChess] ❌ No piece found at opponent move origin:', from);
        console.error('[MultiplayerChess] Current board state at origin:', newBoard[from[0]][from[1]]);
        return currentBoard; // Return unchanged board
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
      
      // Store final board state for analysis
      boardAfterOpponentMove = newBoard;
      
      console.log('✅ [MultiplayerChess] Board updated with opponent move');
      return newBoard;
    });
    
    setSelectedSquare(null);
    setPossibleMoves([]);
    
    // After opponent's move, it becomes my turn
    const correctMyColor = matchData?.playerColor || myColor;
    console.log(`🔄 [MultiplayerChess] BEFORE turn switch - myColor: ${myColor}, correctMyColor: ${correctMyColor}, currentPlayer before: ${currentPlayer}`);
    console.log(`🔄 [MultiplayerChess] matchData.playerColor: ${matchData?.playerColor}`);
    console.log(`🔄 [MultiplayerChess] Expected turn after opponent move: ${correctMyColor}`);
    
    // The current player should switch to my color
    setCurrentPlayer(correctMyColor);
    
    console.log(`🔄 [MultiplayerChess] AFTER turn switch - set currentPlayer to: ${correctMyColor}`);
    console.log(`🔄 [MultiplayerChess] Opponent move applied, now it's my turn (${correctMyColor})`);
    
    // Let's verify the turn switch worked by checking again in a timeout
    setTimeout(() => {
      console.log(`🔍 [MultiplayerChess] Turn verification - currentPlayer should now be: ${correctMyColor}`);
    }, 100);
    
    // Analyze opponent's move for classification
    let opponentAnalysis = null;
    try {
      if (aiInstance && boardBeforeOpponentMove && boardAfterOpponentMove && movingPiece) {
        console.log(`🔍 [MultiplayerAnalysis] Starting analysis for opponent move: ${movingPiece.type} from [${from[0]},${from[1]}] to [${to[0]},${to[1]}]`);
        
        // Convert color to team for analysis (white = birds, black = pigs)
        const side = movingPiece.color === 'white' ? 'birds' : 'pigs';
        console.log(`🔍 [MultiplayerAnalysis] Opponent analysis side: ${side}`);
        
        opponentAnalysis = analyzeMove({
          boardBefore: boardBeforeOpponentMove,
          boardAfter: boardAfterOpponentMove,
          move: {
            fromRow: from[0],
            fromCol: from[1],
            toRow: to[0],
            toCol: to[1],
            piece: movingPiece.type,
            captured: capturedPiece?.type || null,
            special
          },
          side,
          aiInstance,
          lastMove,
          context: {} // No position history tracking in multiplayer yet
        });
        
        if (opponentAnalysis) {
          console.log(`🎯 [MultiplayerAnalysis] Opponent move classified as: ${opponentAnalysis.classification}`, opponentAnalysis);
        } else {
          console.log(`❌ [MultiplayerAnalysis] Opponent analysis returned null/undefined - using fallback`);
          // Fallback classification for testing opponent moves
          opponentAnalysis = {
            classification: capturedPiece ? 'Good' : 'Best',
            evalBefore: 0,
            evalAfter: capturedPiece ? 1 : 0,
            sacrifice: false
          };
          console.log(`🔄 [MultiplayerAnalysis] Using fallback opponent classification: ${opponentAnalysis.classification}`);
        }
      }
    } catch (err) {
      console.warn('[MultiplayerAnalysis] Failed to analyze opponent move:', err);
    }
    
    // Add to move history
    const moveRecord = {
      from,
      to,
      piece,
      color: move.color,
      special,
      timestamp: Date.now(),
      // Add analysis data for move quality display
      ...(opponentAnalysis && {
        classification: opponentAnalysis.classification,
        evalBefore: opponentAnalysis.evalBefore,
        evalAfter: opponentAnalysis.evalAfter,
  sacrifice: opponentAnalysis.sacrifice
      })
    };
    setMoveHistory(prev => [...prev, moveRecord]);
    setLastMove(moveRecord);
    
    console.log('✅ [MultiplayerChess] Opponent move applied successfully');
  }, [matchData?.playerColor]);  // Use matchData.playerColor instead of myColor
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
    const team = color === 'white' ? 'birds' : 'pigs';
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
      // Use ORIGINAL correct assignments for promoted pieces
      switch (pieceType) {
        case 'queen': piece = <QueenPig size={size} />; break;        // Queen = QueenPig
        case 'rook': piece = <CorporalPig size={size} />; break;      // Rook = CorporalPig (gray military helmet)
        case 'bishop': piece = <ForemanPig size={size} />; break;     // Bishop = ForemanPig (yellow construction helmet)
        case 'knight': piece = <NinjaPig size={size} />; break;       // Knight = NinjaPig
        default: piece = <QueenPig size={size} />;
      }
    }
    
    return { type: pieceType, color, team, piece, moved: true };
  };

  // Handle square click
  const handleSquareClick = (row, col) => {
    console.log(`🖱️ [MultiplayerChess] Square clicked: [${row},${col}]`);
    console.log(`🖱️ [MultiplayerChess] Current player: ${currentPlayer}, My color: ${myColor}`);
    
    const piece = board[row][col];
    const myTeam = myColor === 'white' ? 'birds' : 'pigs';
    
    // Handle premoves when it's NOT my turn
    if (currentPlayer !== myColor) {
      console.log(`� [MultiplayerChess] Not my turn - handling premove logic`);
      
      // If clicking on my own piece, select it for premove
      if (piece && piece.team === myTeam) {
        setSelectedSquare([row, col]);
        // Get all possible moves for this team
        const allTeamMoves = aiInstance.getAllPossibleMoves(board, myTeam, lastMove);
        const pieceMoves = allTeamMoves.filter(move => move.fromRow === row && move.fromCol === col);
        const moves = pieceMoves.map(move => ({ row: move.toRow, col: move.toCol }));
        setPossibleMoves(moves);
        console.log(`� [MultiplayerChess] Selected piece for premove: ${piece.type} at [${row},${col}]`);
        return;
      }
      
      // If I have a piece selected, try to make a premove
      if (selectedSquare) {
        const [fromRow, fromCol] = selectedSquare;
        const selectedPiece = board[fromRow][fromCol];
        
        if (selectedPiece && selectedPiece.team === myTeam) {
          // Check if this is a valid premove
          const allTeamMoves = aiInstance.getAllPossibleMoves(board, myTeam, lastMove);
          const pieceMoves = allTeamMoves.filter(move => move.fromRow === fromRow && move.fromCol === fromCol);
          const isValidPremove = pieceMoves.some(move => move.toRow === row && move.toCol === col);
          
          if (isValidPremove) {
            const moveDetails = pieceMoves.find(move => move.toRow === row && move.toCol === col);
            
            // Set premove
            const premoveData = {
              fromRow,
              fromCol,
              toRow: row,
              toCol: col,
              specialMove: moveDetails?.special,
              promotionType: moveDetails?.special === 'promotion' ? 'queen' : null
            };
            
            setPremove(premoveData);
            setPremoveHighlight({ from: [fromRow, fromCol], to: [row, col] });
            console.log('📝 [MultiplayerChess] Premove set:', premoveData);
            
            setSelectedSquare(null);
            setPossibleMoves([]);
          } else {
            console.log(`❌ [MultiplayerChess] Invalid premove to [${row},${col}]`);
            setSelectedSquare(null);
            setPossibleMoves([]);
          }
        }
      }
      return;
    }

    // Regular move handling when it's my turn
    console.log(`🎯 [MultiplayerChess] My turn - handling regular move`);
    
    // If clicking on my piece, select it
    if (piece && piece.team === myTeam) {
      setSelectedSquare([row, col]);
      // Get all possible moves for this team using the correct method
      const allTeamMoves = aiInstance.getAllPossibleMoves(board, myTeam, lastMove);
      const pieceMoves = allTeamMoves.filter(move => move.fromRow === row && move.fromCol === col);
      const moves = pieceMoves.map(move => ({ row: move.toRow, col: move.toCol }));
      setPossibleMoves(moves);
      console.log(`🎯 [MultiplayerChess] Selected ${piece.type} at [${row},${col}], ${moves.length} possible moves:`, moves);
      return;
    }
    
    // If I have a piece selected and clicking on a valid move
    if (selectedSquare) {
      const [fromRow, fromCol] = selectedSquare;
      console.log(`🖱️ [MultiplayerChess] Have selected square: [${fromRow},${fromCol}]`);
      console.log(`🖱️ [MultiplayerChess] Possible moves:`, possibleMoves);
      const isValidMove = possibleMoves.some(move => move.row === row && move.col === col);
      console.log(`🖱️ [MultiplayerChess] Is valid move to [${row},${col}]: ${isValidMove}`);
      
      if (isValidMove) {
        makeMove(fromRow, fromCol, row, col);
      } else {
        // Invalid move, deselect
        setSelectedSquare(null);
        setPossibleMoves([]);
        console.log(`🖱️ [MultiplayerChess] Invalid move, deselecting`);
      }
    } else {
      console.log(`🖱️ [MultiplayerChess] No piece selected and clicked piece is not mine`);
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
    
    // After I make a move, it becomes opponent's turn
    const opponentColor = myColor === 'white' ? 'black' : 'white';
    setCurrentPlayer(opponentColor);
    
    console.log(`🔄 [MultiplayerChess] I made a move, now it's opponent's turn (${opponentColor})`);
    
    // Analyze move for classification (Brilliant, Blunder, Best, etc.)
    let analysis = null;
    console.log(`🚀 [MultiplayerAnalysis] ATTEMPTING ANALYSIS - aiInstance exists: ${!!aiInstance}`);
    
    try {
      if (aiInstance) {
        console.log(`🔍 [MultiplayerAnalysis] Starting analysis for my move: ${movingPiece.type} from [${fromRow},${fromCol}] to [${toRow},${toCol}]`);
        
        // Convert color to team for analysis (white = birds, black = pigs)
        const side = movingPiece.color === 'white' ? 'birds' : 'pigs';
        console.log(`🔍 [MultiplayerAnalysis] Analysis side: ${side}`);
        
        // Test basic evaluation first
        const evalBefore = evaluatePosition ? evaluatePosition(board) : 'NO_EVAL_FUNCTION';
        const evalAfter = evaluatePosition ? evaluatePosition(newBoard) : 'NO_EVAL_FUNCTION';
        console.log(`🔍 [MultiplayerAnalysis] Basic eval test - before: ${evalBefore}, after: ${evalAfter}`);
        
        analysis = analyzeMove({
          boardBefore: board, // previous board state
          boardAfter: newBoard, // after executing move
          move: {
            fromRow,
            fromCol,
            toRow,
            toCol,
            piece: movingPiece.type,
            captured: capturedPiece?.type || null,
            special
          },
          side,
          aiInstance,
          lastMove,
          context: {} // No position history tracking in multiplayer yet
        });
        
        if (analysis) {
          console.log(`🎯 [MultiplayerAnalysis] Move classified as: ${analysis.classification}`, analysis);
        } else {
          console.log(`❌ [MultiplayerAnalysis] Analysis returned null/undefined - using fallback`);
          // Fallback classification for testing
          analysis = {
            classification: capturedPiece ? 'Good' : 'Best',
            evalBefore: 0,
            evalAfter: capturedPiece ? 1 : 0,
            sacrifice: false
          };
          console.log(`🔄 [MultiplayerAnalysis] Using fallback classification: ${analysis.classification}`);
        }
      } else {
        console.log(`❌ [MultiplayerAnalysis] No aiInstance available for analysis`);
      }
    } catch (err) {
      console.error('[MultiplayerAnalysis] Failed to analyze move:', err);
      console.error('[MultiplayerAnalysis] Error stack:', err.stack);
    }
    
    // Create move record
    const moveRecord = {
      from: [fromRow, fromCol],
      to: [toRow, toCol],
      piece: movingPiece.type,
      color: movingPiece.color,
      captured: capturedPiece?.type || null,
      special,
      promotionType,
      timestamp: Date.now(),
      // Add analysis data for move quality display
      ...(analysis && {
        classification: analysis.classification,
        evalBefore: analysis.evalBefore,
        evalAfter: analysis.evalAfter,
        sacrifice: analysis.sacrifice
      })
    };
    
    console.log(`📝 [MultiplayerAnalysis] Created move record:`, moveRecord);
    console.log(`📝 [MultiplayerAnalysis] Classification in record: ${moveRecord.classification}`);
    
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
        color: moveRecord.color, // Changed from 'team' to 'color' to match applyOpponentMove expectation
        captured: moveRecord.captured,
        special: moveRecord.special,
        promotionType: moveRecord.promotionType,
        // Include analysis data for move quality tracking
        classification: moveRecord.classification,
        evalBefore: moveRecord.evalBefore,
        evalAfter: moveRecord.evalAfter,
        sacrifice: moveRecord.sacrifice
      },
      player: {
        username: user?.username,
        userId: user?.id || user?._id
      }
    };
    
    console.log(`📤 [MultiplayerChess] Sending move with classification: ${moveData.move.classification}`);
    console.log('📤 [MultiplayerChess] ===== SENDING MOVE TO OPPONENT =====');
    console.log('[MultiplayerChess] moveRecord:', JSON.stringify(moveRecord, null, 2));
    console.log('[MultiplayerChess] matchData:', JSON.stringify(matchData, null, 2));
    console.log('[MultiplayerChess] user:', JSON.stringify(user, null, 2));
    console.log('[MultiplayerChess] Final moveData to send:', JSON.stringify(moveData, null, 2));
    
    if (!matchData?.matchId) {
      console.error('[MultiplayerChess] ❌ No matchId available!');
      return;
    }
    
    const success = multiplayerSocket.sendMove(moveData);
    console.log(`📤 [MultiplayerChess] Move send ${success ? '✅ SUCCESSFUL' : '❌ FAILED'}`);
  };

  // Check for game end conditions after each move
  const checkGameEnd = useCallback((board, currentPlayer) => {
    if (!aiInstance) return;
    
    // Safety check: Don't end game on initial board state or very early in the game
    if (moveHistory.length < 2) {
      console.log(`🔍 [MultiplayerChess] Skipping game end check - too early (${moveHistory.length} moves)`);
      return;
    }
    
    // Convert currentPlayer color to team name for AI methods
    const currentTeam = currentPlayer === 'white' ? 'birds' : 'pigs';
    
    const isInCheck = aiInstance.isKingInCheck(board, currentTeam);
    const hasValidMoves = aiInstance.getAllPossibleMoves(board, currentTeam, lastMove).length > 0;
    
    console.log(`🔍 [MultiplayerChess] Game end check: player=${currentPlayer}, team=${currentTeam}, inCheck=${isInCheck}, hasValidMoves=${hasValidMoves}`);
    
    if (isInCheck && !hasValidMoves) {
      // Checkmate
      const winner = currentPlayer === 'white' ? 'black' : 'white';
      const result = winner === myColor ? 'win' : 'loss';
      setGameStatus('checkmate');
      console.log(`🏁 [MultiplayerChess] CHECKMATE! ${winner} wins`);
      
      // Send game end to backend
      const success = multiplayerSocket.endGame(
        matchData?.matchId, 
        'win', 
        winner, 
        'checkmate'
      );
      
      if (success) {
        console.log('✅ [MultiplayerChess] Checkmate sent to backend successfully');
      } else {
        console.error('❌ [MultiplayerChess] Failed to send checkmate to backend');
        // Fallback to local game end
        setTimeout(() => {
          onGameEnd(result);
        }, 2000);
      }
      
    } else if (!hasValidMoves) {
      // Stalemate
      setGameStatus('draw');
      console.log(`🏁 [MultiplayerChess] STALEMATE! Game is a draw`);
      
      // Send draw to backend
      const success = multiplayerSocket.endGame(
        matchData?.matchId, 
        'draw', 
        null, 
        'stalemate'
      );
      
      if (success) {
        console.log('✅ [MultiplayerChess] Stalemate sent to backend successfully');
      } else {
        console.error('❌ [MultiplayerChess] Failed to send stalemate to backend');
        // Fallback to local game end
        setTimeout(() => {
          onGameEnd('draw');
        }, 2000);
      }
      
    } else if (isInCheck) {
      // Check
      setGameStatus('check');
      console.log(`⚠️ [MultiplayerChess] ${currentPlayer} is in CHECK!`);
      
    } else {
      // Normal game continues
      setGameStatus('active');
    }
  }, [aiInstance, myColor, onGameEnd, moveHistory.length, lastMove, matchData?.matchId]);

  // Check game end after board updates
  useEffect(() => {
    // Only check game end conditions after the game has actually started
    // and there have been some moves (avoid false positives on initial board)
    if (board.length > 0 && moveHistory.length > 0) {
      checkGameEnd(board, currentPlayer);
    }
  }, [board, currentPlayer, checkGameEnd, moveHistory.length]);
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

  // Get square color with enhanced styling like singleplayer
  const getSquareColor = (row, col) => {
    const isLight = (row + col) % 2 === 0;
    const highlight = isSquareHighlighted(row, col);
    
    // Enhanced highlighting similar to singleplayer
    if (highlight === 'selected') return 'bg-yellow-400 border-yellow-600';
    if (highlight === 'possible') return 'bg-green-400 border-green-600';
    if (highlight === 'lastMove') return 'bg-blue-400 border-blue-600';
    
    // Use amber theme like singleplayer default
    return isLight ? 'bg-amber-100 border-amber-200' : 'bg-amber-800 border-amber-900';
  };

  // Render the board from my perspective (my pieces always at bottom)
  const renderBoard = () => {
    // If I'm playing as pigs (black), flip the board so my pieces are at bottom
    const shouldFlip = myColor === 'black';
    
    return (
      <div className="flex-1 max-w-2xl mx-auto lg:mx-0 flex flex-col">
        {/* Top Territory Label - Opponent */}
        <div className="text-center mb-1 flex-shrink-0">
          <span className="text-xs sm:text-sm text-slate-400 bg-slate-800 px-3 py-1 rounded-full">
            {shouldFlip ? '🐦 Bird Territory' : '🐷 Pig Territory'}
          </span>
        </div>

        <div className="bg-gradient-to-br from-amber-200 to-amber-600 p-3 rounded-2xl shadow-2xl flex-shrink-0">
          <div className="grid grid-cols-8 gap-1 bg-amber-900 p-2 rounded-xl w-full max-w-2xl mx-auto">
            {Array.from({ length: 8 }, (_, row) => 
              Array.from({ length: 8 }, (_, col) => {
                const actualRow = shouldFlip ? 7 - row : row;
                const actualCol = shouldFlip ? 7 - col : col;
                const piece = board[actualRow] && board[actualRow][actualCol];
                
                // Check if this square is part of a premove
                const isPremoveFrom = premoveHighlight?.from && premoveHighlight.from[0] === actualRow && premoveHighlight.from[1] === actualCol;
                const isPremoveTo = premoveHighlight?.to && premoveHighlight.to[0] === actualRow && premoveHighlight.to[1] === actualCol;
                
                return (
                  <div
                    key={`${row}-${col}`}
                    className={`
                      aspect-square border border-opacity-50 rounded cursor-pointer 
                      transition-all duration-200 hover:shadow-lg
                      flex items-center justify-center relative
                      w-full h-full min-w-[40px] min-h-[40px]
                      ${isPremoveFrom ? 'bg-blue-500/50 border-blue-300' : 
                        isPremoveTo ? 'bg-blue-400/50 border-blue-200' : 
                        getSquareColor(actualRow, actualCol)}
                    `}
                    onClick={() => handleSquareClick(actualRow, actualCol)}
                  >
                    {piece && (
                      <div className="w-full h-full flex items-center justify-center">
                        {piece.piece}
                      </div>
                    )}
                    
                    {/* Move indicator dots like singleplayer */}
                    {(() => {
                      const isPossibleMove = possibleMoves.some(move => move.row === actualRow && move.col === actualCol);
                      const isCapture = isPossibleMove && board[actualRow]?.[actualCol] !== null;
                      if (isPossibleMove && !piece && !isCapture) {
                        return <div className="w-4 h-4 bg-green-400 rounded-full opacity-80"></div>;
                      }
                      return null;
                    })()}

                    {/* Square coordinates for reference (smaller and less intrusive) */}
                    <div className="absolute bottom-0 right-0 text-[10px] text-gray-500 opacity-50">
                      {getAlgebraicNotation(actualRow, actualCol)}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Bottom Territory Label - My pieces */}
        <div className="text-center mt-1 flex-shrink-0">
          <span className="text-xs sm:text-sm text-slate-400 bg-slate-800 px-3 py-1 rounded-full">
            {shouldFlip ? '🐷 Pig Territory' : '🐦 Bird Territory'}
          </span>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-purple-900 text-white p-2 sm:p-4">
      <div className="max-w-7xl mx-auto flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between mb-2 sm:mb-4 flex-shrink-0">
          {/* Empty div for layout balance */}
          <div className="w-20 sm:w-32"></div>
          
          <div className="text-center">
            <h1 className="text-lg sm:text-xl lg:text-2xl font-bold">
              vs {matchData.opponent.username}
            </h1>
            <p className="text-xs sm:text-sm text-slate-400">
              Multiplayer Match • You play as {myColor === 'white' ? 'Birds' : 'Pigs'}
            </p>
          </div>
          
          <div className="flex items-center gap-2 sm:gap-3">
            {/* My Timer - only shows when it's my turn */}
            {currentPlayer === myColor && (
              <div className="bg-slate-800 rounded-lg p-2 text-xs">
                <div className="text-slate-400 mb-1">My Timer</div>
                <div className={`font-mono text-lg font-bold ${
                  myTimer <= 10 ? 'text-red-400 animate-pulse' :
                  myTimer <= 30 ? 'text-orange-400' :
                  'text-green-400'
                }`}>
                  {myTimer}s
                </div>
                <div className="text-xs text-green-400 mt-1">
                  🎯 Your move!
                </div>
              </div>
            )}

            {/* Battle Status - Compact */}
            <div className="bg-slate-800 rounded-lg p-2 text-xs hidden sm:block">
              <div className="text-slate-400 mb-1">Status</div>
              <div className="text-green-400 capitalize font-medium">
                {currentPlayer === myColor ? '🎯 Your Turn' : '⏳ Opponent\'s Turn'}
              </div>
              {gameStatus === 'check' && (
                <div className="text-red-400 font-bold text-xs mt-1 animate-pulse">
                  ⚠️ CHECK
                </div>
              )}
            </div>
            
            <div className="flex gap-1 sm:gap-2">
              <button
                onClick={() => setSoundEnabled(!soundEnabled)}
                className="p-2 bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors text-sm"
                title={soundEnabled ? "Mute Sound" : "Enable Sound"}
              >
                {soundEnabled ? <IoVolumeHigh /> : <IoVolumeOff />}
              </button>
              
              <button
                onClick={() => {
                  if (window.confirm('Are you sure you want to resign? This will count as a loss.')) {
                    console.log('🏳️ [MultiplayerChess] Player resigned');
                    // Use the new resign functionality
                    const success = multiplayerSocket.resignGame(matchData.matchId);
                    if (success) {
                      console.log('✅ [MultiplayerChess] Resignation sent successfully');
                    } else {
                      console.error('❌ [MultiplayerChess] Failed to send resignation');
                      // Fallback to regular game end
                      onGameEnd('loss');
                    }
                  }
                }}
                className="flex items-center gap-1 px-2 sm:px-3 py-2 bg-red-600 hover:bg-red-700 rounded-lg transition-colors text-sm"
                title="Resign Game"
              >
                <IoFlag size={16} />
                <span className="hidden sm:inline">Resign</span>
              </button>
            </div>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-3 lg:gap-4">
          {/* Chess Board */}
          {renderBoard()}

          {/* Game Info Panel */}
          <div className="w-full lg:w-80 xl:w-96 space-y-3 sm:space-y-4">
            {/* Current Turn */}
            <div className="bg-slate-800 rounded-xl p-4 sm:p-5">
              <h3 className="text-lg sm:text-xl font-bold mb-3">Current Turn</h3>
              <div className="flex items-center gap-3">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg transition-all ${
                  currentPlayer === myColor ? 'bg-blue-600 ring-4 ring-blue-400/30' : 'bg-gray-600'
                }`}>
                  {user?.username[0].toUpperCase()}
                </div>
                <div>
                  <div className="font-semibold">{user?.username}</div>
                  <div className="text-sm text-slate-400">
                    Playing as {myColor === 'white' ? 'Birds 🐦' : 'Pigs 🐷'}
                  </div>
                  {currentPlayer === myColor && (
                    <div className="text-blue-400 font-bold text-sm">● YOUR TURN</div>
                  )}
                </div>
              </div>
              
              <div className="mt-3 pt-3 border-t border-slate-600">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold transition-all ${
                    currentPlayer !== myColor ? 'bg-red-600 ring-4 ring-red-400/30' : 'bg-gray-600'
                  }`}>
                    {matchData.opponent.username[0].toUpperCase()}
                  </div>
                  <div>
                    <div className="font-semibold">{matchData.opponent.username}</div>
                    <div className="text-sm text-slate-400">
                      Playing as {myColor === 'white' ? 'Pigs 🐷' : 'Birds 🐦'}
                    </div>
                    {currentPlayer !== myColor && (
                      <div className="text-red-400 font-bold text-sm">● OPPONENT'S TURN</div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Premove Display */}
            {premove && currentPlayer !== myColor && (
              <div className="bg-blue-900/30 border border-blue-600/30 rounded-xl p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-blue-400 font-bold text-sm">📝 Premove Set</div>
                    <div className="text-blue-200 text-xs mt-1">
                      {String.fromCharCode(97 + premove.fromCol)}{8 - premove.fromRow}→{String.fromCharCode(97 + premove.toCol)}{8 - premove.toRow}
                      {premove.specialMove && ` (${premove.specialMove})`}
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setPremove(null);
                      setPremoveHighlight(null);
                      setSelectedSquare(null);
                      setPossibleMoves([]);
                    }}
                    className="px-3 py-1 bg-red-600/20 hover:bg-red-600/30 text-red-400 text-xs rounded border border-red-500/30 transition-all"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* Move History */}
            {moveHistory.length > 0 && (
              <div className="bg-slate-800 rounded-xl p-4 sm:p-5">
                <h3 className="text-lg font-bold mb-3">Recent Moves</h3>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {moveHistory.slice(-6).map((move, index) => (
                    <div key={index} className="bg-slate-700/50 rounded-lg p-2">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium capitalize text-xs">
                          {move.piece}
                        </span>
                        <span className="text-xs text-slate-400">
                          #{moveHistory.length - (moveHistory.slice(-6).length - index - 1)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-400 font-mono">
                          {getAlgebraicNotation(move.from[0], move.from[1])}→{getAlgebraicNotation(move.to[0], move.to[1])}
                        </span>
                        <div className="flex gap-1">
                          {move.captured && (
                            <span className="text-red-400 text-xs">⚔️</span>
                          )}
                          {move.special === 'castleKingside' && (
                            <span className="text-blue-400 text-xs">🏰</span>
                          )}
                          {move.special === 'castleQueenside' && (
                            <span className="text-blue-400 text-xs">🏰</span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Game Status */}
            <div className="bg-slate-800 rounded-xl p-4 sm:p-5">
              <h3 className="text-lg font-bold mb-3">Game Status</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-400">Moves played:</span>
                  <span className="text-white">{moveHistory.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Game state:</span>
                  <span className={`capitalize ${
                    gameStatus === 'active' ? 'text-green-400' :
                    gameStatus === 'check' ? 'text-yellow-400' :
                    gameStatus === 'checkmate' ? 'text-red-400' :
                    'text-slate-400'
                  }`}>
                    {gameStatus}
                  </span>
                </div>
                {gameStatus === 'check' && (
                  <div className="text-center mt-2 p-2 bg-yellow-600/20 rounded-lg">
                    <div className="text-yellow-400 font-bold">⚠️ CHECK!</div>
                    <div className="text-xs text-yellow-200 mt-1">King is under attack!</div>
                  </div>
                )}
                {gameStatus === 'checkmate' && (
                  <div className="text-center mt-2 p-2 bg-red-600/20 rounded-lg">
                    <div className="text-red-400 font-bold text-xl">CHECKMATE!</div>
                    <div className="text-xs text-red-200 mt-1">Game Over</div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modern Game End Modal */}
      {gameEndData && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-3xl p-8 max-w-lg w-full text-center shadow-2xl border border-slate-700/50 animate-in slide-in-from-bottom duration-300">
            {/* Result Icon and Animation */}
            <div className="relative mb-6">
              {gameEndData.result === 'win' ? (
                <div className="relative">
                  <div className="text-8xl mb-2 animate-bounce">�</div>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-24 h-24 bg-yellow-500/20 rounded-full animate-ping"></div>
                  </div>
                </div>
              ) : gameEndData.result === 'draw' ? (
                <div className="relative">
                  <div className="text-8xl mb-2">🤝</div>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-24 h-24 bg-blue-500/20 rounded-full animate-pulse"></div>
                  </div>
                </div>
              ) : (
                <div className="relative">
                  <div className="text-8xl mb-2">⚔️</div>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-24 h-24 bg-red-500/20 rounded-full animate-pulse"></div>
                  </div>
                </div>
              )}
            </div>

            {/* Result Title */}
            <h2 className={`text-4xl font-bold mb-3 ${
              gameEndData.result === 'win' ? 'text-yellow-400' :
              gameEndData.result === 'draw' ? 'text-blue-400' : 'text-red-400'
            }`}>
              {gameEndData.result === 'win' ? 'Victory!' :
               gameEndData.result === 'draw' ? 'Draw!' : 'Defeat!'}
            </h2>

            {/* Result Description */}
            <div className="bg-slate-700/50 rounded-2xl p-4 mb-6">
              <p className="text-slate-200 text-lg">
                {gameEndData.result === 'win' ? (
                  gameEndData.reason === 'resign' ? 
                    `${gameEndData.loser?.username || 'Opponent'} resigned` : 
                    gameEndData.reason === 'abandon' ? 
                    `${gameEndData.loser?.username || 'Opponent'} left the game` :
                    gameEndData.reason === 'checkmate' ?
                    'Checkmate! You outplayed your opponent!' :
                    'You emerged victorious!'
                ) : gameEndData.result === 'draw' ? (
                  gameEndData.reason === 'stalemate' ? 
                    'Stalemate - A well-fought battle!' : 
                    gameEndData.reason === 'insufficient-material' ?
                    'Draw by insufficient material' :
                    gameEndData.reason === 'threefold-repetition' ?
                    'Draw by threefold repetition' :
                    'An evenly matched contest!'
                ) : (
                  gameEndData.reason === 'resign' ? 
                    'You resigned from the match' : 
                    gameEndData.reason === 'abandon' ? 
                    'You left the game early' :
                    gameEndData.reason === 'checkmate' ?
                    'Checkmate! Better luck next time!' :
                    `${gameEndData.winner?.username || 'Your opponent'} proved superior!`
                )}
              </p>
            </div>

            {/* Match Stats */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-slate-700/30 rounded-xl p-3">
                <div className="text-slate-400 text-sm">Moves Played</div>
                <div className="text-white text-2xl font-bold">{moveHistory.length}</div>
              </div>
              <div className="bg-slate-700/30 rounded-xl p-3">
                <div className="text-slate-400 text-sm">Match Type</div>
                <div className="text-white text-lg font-semibold">Competitive</div>
                <div className="text-yellow-400 text-xs">Ranked Match</div>
              </div>
            </div>

            {/* Rewards & Rating */}
            <div className="space-y-3 mb-8">
              {/* Coins Earned */}
              <div className={`rounded-xl p-4 border ${
                gameEndData.result === 'win' ? 'bg-gradient-to-r from-yellow-600/20 to-yellow-500/20 border-yellow-500/30' :
                gameEndData.result === 'draw' ? 'bg-gradient-to-r from-blue-600/20 to-blue-500/20 border-blue-500/30' :
                'bg-gradient-to-r from-gray-600/20 to-gray-500/20 border-gray-500/30'
              }`}>
                <div className="flex items-center justify-center gap-2">
                  <span className="text-2xl">🪙</span>
                  <div className="text-center">
                    <div className={`text-sm font-medium ${
                      gameEndData.result === 'win' ? 'text-yellow-400' :
                      gameEndData.result === 'draw' ? 'text-blue-400' : 'text-gray-400'
                    }`}>Coins Earned</div>
                    <div className={`text-xl font-bold ${
                      gameEndData.result === 'win' ? 'text-yellow-300' :
                      gameEndData.result === 'draw' ? 'text-blue-300' : 'text-gray-300'
                    }`}>
                      {gameEndData.result === 'win' ? '+250' :
                       gameEndData.result === 'draw' ? '+50' : '+0'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Elo Rating Change */}
              <div className="bg-gradient-to-r from-blue-600/20 to-purple-600/20 rounded-xl p-4 border border-blue-500/30">
                <div className="text-center">
                  <div className="text-blue-400 text-sm font-medium mb-2">Elo Rating</div>
                  <div className="flex items-center justify-center gap-2">
                    <span className="text-slate-300 text-lg">1200</span>
                    <span className="text-slate-400">→</span>
                    <span className={`text-lg font-bold ${
                      gameEndData.result === 'win' ? 'text-green-400' :
                      gameEndData.result === 'draw' ? 'text-yellow-400' : 'text-red-400'
                    }`}>
                      {gameEndData.result === 'win' ? '1235' :
                       gameEndData.result === 'draw' ? '1205' : '1175'}
                    </span>
                    <span className={`text-sm font-semibold ${
                      gameEndData.result === 'win' ? 'text-green-400' :
                      gameEndData.result === 'draw' ? 'text-yellow-400' : 'text-red-400'
                    }`}>
                      ({gameEndData.result === 'win' ? '+35' :
                        gameEndData.result === 'draw' ? '+5' : '-25'})
                    </span>
                  </div>
                  <div className="text-xs text-slate-400 mt-1">
                    {gameEndData.result === 'win' ? 'Great victory!' :
                     gameEndData.result === 'draw' ? 'Solid performance' : 'Better luck next time'}
                  </div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                onClick={() => {
                  console.log('🔄 [MultiplayerChess] Starting new game');
                  setGameEndData(null);
                  // Reset game state
                  setBoard([]);
                  setCurrentPlayer('white');
                  setSelectedSquare(null);
                  setPossibleMoves([]);
                  setMoveHistory([]);
                  setGameStatus('active');
                  // Find new match
                  onGameEnd('rematch');
                }}
                className="group relative px-8 py-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-xl font-semibold transition-all duration-200 transform hover:scale-105 hover:shadow-lg flex items-center justify-center gap-2"
              >
                <span className="text-lg">🎮</span>
                <span>Play Again</span>
                <div className="absolute inset-0 bg-white/10 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
              </button>
              
              <button
                onClick={() => {
                  console.log('🏠 [MultiplayerChess] Returning to main menu');
                  onGameEnd('menu');
                }}
                className="group relative px-8 py-3 bg-gradient-to-r from-slate-600 to-slate-700 hover:from-slate-700 hover:to-slate-800 text-white rounded-xl font-semibold transition-all duration-200 transform hover:scale-105 hover:shadow-lg flex items-center justify-center gap-2"
              >
                <span className="text-lg">🏠</span>
                <span>Main Menu</span>
                <div className="absolute inset-0 bg-white/10 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
              </button>
            </div>
          </div>
        </div>
      )}
  </div>
  );
};

export default MultiplayerChessBoard;
