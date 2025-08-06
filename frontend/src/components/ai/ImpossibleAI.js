import { ChessAI } from './ChessAI.js';

export class ImpossibleAI extends ChessAI {
  constructor() {
    super('impossible');
    this.transpositionTable = new Map();
    this.openingBook = this.initializeOpeningBook();
    this.endgameTablebase = this.initializeEndgameTablebase();
  }

  // Impossible AI: Theoretical maximum strength with opening book, deeper search, and endgame tablebases
  calculateBestMove(board) {
    const allPossibleMoves = this.getAllPossibleMoves(board, 'pigs');
    
    if (allPossibleMoves.length === 0) return null;

    // Check opening book first
    const openingMove = this.getOpeningBookMove(board);
    if (openingMove) return openingMove;

    // Check endgame tablebase
    const endgameMove = this.getEndgameTablebaseMove(board);
    if (endgameMove) return endgameMove;

    // Clear transposition table periodically
    if (this.transpositionTable.size > 50000) {
      this.transpositionTable.clear();
    }

    // Use deeper search than Nightmare AI
    let bestMove = null;
    let bestValue = -Infinity;

    const orderedMoves = this.orderMovesAdvanced(board, allPossibleMoves);

    // Try iterative deepening up to 5 moves deep
    for (let depth = 1; depth <= 5; depth++) {
      for (const move of orderedMoves) {
        const value = this.alphaBetaWithDepth(board, move, depth, -Infinity, Infinity, false);
        if (value > bestValue) {
          bestValue = value;
          bestMove = move;
        }
      }
      
      // If we find a forced mate, return immediately
      if (bestValue > 9000) break;
    }

    return bestMove;
  }

  // Initialize simplified opening book
  initializeOpeningBook() {
    return {
      // Starting position - control center
      "8r7n7b7q7k7b7n7r8p8p8p8p8p8p8p8p88888888888888888888P8P8P8P8P8P8P8P88R8N8B8Q8K8B8N8R": [
        { fromRow: 1, fromCol: 4, toRow: 3, toCol: 4 }, // e2-e4
        { fromRow: 1, fromCol: 3, toRow: 3, toCol: 3 }, // d2-d4
        { fromRow: 0, fromCol: 6, toRow: 2, toCol: 5 }, // Nf3
      ],
      // Common response patterns
      "8r7n7b7q7k7b7n7r8p8p8p7p8p8p8p8p88888888P888888888888P8P8P8P8P8P8P8P88R8N8B8Q8K8B8N8R": [
        { fromRow: 1, fromCol: 3, toRow: 3, toCol: 3 }, // d2-d4
        { fromRow: 0, fromCol: 6, toRow: 2, toCol: 5 }, // Nf3
      ]
    };
  }

  // Initialize simplified endgame tablebase
  initializeEndgameTablebase() {
    return {
      // King + Queen vs King positions
      'KQvK': true,
      // King + Rook vs King positions  
      'KRvK': true,
      // King + 2 Bishops vs King
      'KBBvK': true
    };
  }

  getOpeningBookMove(board) {
    const boardHash = this.getBoardHash(board);
    const moves = this.openingBook[boardHash];
    
    if (moves && moves.length > 0) {
      // Add some randomness to opening choices
      const randomIndex = Math.floor(Math.random() * moves.length);
      return moves[randomIndex];
    }
    
    return null;
  }

  getEndgameTablebaseMove(board) {
    const materialCount = this.countMaterial(board);
    
    // Only use tablebase in simplified endgame positions
    if (materialCount.total <= 6) {
      const tablebaseKey = this.getTablebaseKey(board);
      if (this.endgameTablebase[tablebaseKey]) {
        // Use perfect play for known endgames
        return this.calculatePerfectEndgameMove(board);
      }
    }
    
    return null;
  }

  calculatePerfectEndgameMove(board) {
    // Simplified perfect endgame play
    const allMoves = this.getAllPossibleMoves(board, 'pigs');
    let bestMove = null;
    let bestValue = -Infinity;

    for (const move of allMoves) {
      const value = this.evaluateEndgamePosition(board, move);
      if (value > bestValue) {
        bestValue = value;
        bestMove = move;
      }
    }

    return bestMove;
  }

  evaluateEndgamePosition(board, move) {
    const tempBoard = this.makeTemporaryMove(board, move);
    
    // In endgames, king activity and pawn promotion are key
    let value = 0;
    
    // King activity bonus
    const kingPos = this.findKing(tempBoard, 'pigs');
    if (kingPos) {
      const centerDistance = Math.abs(3.5 - kingPos.row) + Math.abs(3.5 - kingPos.col);
      value += (7 - centerDistance) * 50;
    }
    
    // Pawn advancement bonus
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const piece = tempBoard[row][col];
        if (piece && piece.type === 'pawn' && piece.team === 'pigs') {
          const advancement = row;
          value += advancement * advancement * 10; // Exponential bonus for advanced pawns
        }
      }
    }
    
    return value;
  }

  countMaterial(board) {
    let pigsMaterial = 0;
    let birdsMaterial = 0;
    let total = 0;
    
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const piece = board[row][col];
        if (piece) {
          const value = this.pieceValues[piece.type] || 0;
          total++;
          if (piece.team === 'pigs') {
            pigsMaterial += value;
          } else {
            birdsMaterial += value;
          }
        }
      }
    }
    
    return { pigs: pigsMaterial, birds: birdsMaterial, total };
  }

  getTablebaseKey(board) {
    const material = this.countMaterial(board);
    
    // Simplified tablebase key generation
    if (material.pigs > 2000 && material.birds < 500) {
      return 'KQvK';
    } else if (material.pigs > 1000 && material.birds < 500) {
      return 'KRvK';
    } else if (material.total <= 4) {
      return 'KBBvK';
    }
    
    return 'unknown';
  }

  // Enhanced move ordering for maximum strength
  orderMovesAdvanced(board, moves) {
    return moves.map(move => ({
      ...move,
      priority: this.getAdvancedMovePriority(board, move)
    }))
    .sort((a, b) => b.priority - a.priority)
    .map(move => ({ fromRow: move.fromRow, fromCol: move.fromCol, toRow: move.toRow, toCol: move.toCol, piece: move.piece }));
  }

  getAdvancedMovePriority(board, move) {
    let priority = 0;
    const targetPiece = board[move.toRow][move.toCol];
    
    // Enhanced capture evaluation
    if (targetPiece) {
      priority += this.pieceValues[targetPiece.type] * 10;
      
      // MVV-LVA with more precision
      const attackerValue = this.pieceValues[move.piece];
      priority += (this.pieceValues[targetPiece.type] - attackerValue);
    }
    
    // Check and discovery bonuses
    const tempBoard = this.makeTemporaryMove(board, move);
    if (this.isKingInCheck(tempBoard, 'birds')) {
      priority += 1000;
      
      // Checkmate bonus
      if (this.isCheckmate(tempBoard, 'birds')) {
        priority += 10000;
      }
    }
    
    // Advanced positional factors
    priority += this.evaluateAdvancedPosition(tempBoard, move) * 2;
    
    // Piece development in opening
    const gamePhase = this.getGamePhase(board);
    if (gamePhase === 'opening') {
      if (move.fromRow === 0 && (move.piece === 'knight' || move.piece === 'bishop')) {
        priority += 50; // Development bonus
      }
    }
    
    return priority;
  }

  evaluateAdvancedPosition(board, move) {
    // Use the same evaluation as Nightmare AI but with higher precision
    return this.evaluatePositionAdvanced(board, 'pigs') * 1.5;
  }

  // Enhanced minimax with null move pruning and advanced techniques
  alphaBetaWithDepth(board, move, depth, alpha, beta, isMaximizing) {
    const tempBoard = this.makeTemporaryMove(board, move);
    const boardKey = this.getBoardHash(tempBoard);
    
    // Check transposition table with depth consideration
    if (this.transpositionTable.has(boardKey)) {
      const cached = this.transpositionTable.get(boardKey);
      if (cached.depth >= depth) {
        return cached.value;
      }
    }
    
    // Quiescence search at leaf nodes for tactical accuracy
    if (depth === 0) {
      const quietValue = this.evaluatePositionAdvanced(tempBoard, 'pigs');
      const quiescenceValue = this.quiescenceSearch(tempBoard, alpha, beta, 4); // 4 ply quiescence
      const value = Math.max(quietValue, quiescenceValue);
      this.transpositionTable.set(boardKey, { value, depth: 0 });
      return value;
    }

    const currentTeam = isMaximizing ? 'pigs' : 'birds';
    let possibleMoves = this.getAllPossibleMoves(tempBoard, currentTeam);

    // Null move pruning for non-critical positions
    if (depth >= 3 && !this.isKingInCheck(tempBoard, currentTeam) && possibleMoves.length > 8) {
      const nullMoveValue = this.alphaBetaWithDepth(tempBoard, { fromRow: 0, fromCol: 0, toRow: 0, toCol: 0 }, depth - 3, -beta, -beta + 1, !isMaximizing);
      if (isMaximizing && nullMoveValue >= beta) {
        return beta;
      }
      if (!isMaximizing && nullMoveValue <= alpha) {
        return alpha;
      }
    }

    if (possibleMoves.length === 0) {
      let value = 0;
      if (this.isKingInCheck(tempBoard, currentTeam)) {
        value = isMaximizing ? -20000 + depth : 20000 - depth;
      }
      this.transpositionTable.set(boardKey, { value, depth });
      return value;
    }

    // Advanced move ordering
    const orderedMoves = this.orderMovesAdvanced(tempBoard, possibleMoves);

    if (isMaximizing) {
      let maxValue = -Infinity;
      for (const nextMove of orderedMoves) {
        const value = this.alphaBetaWithDepth(tempBoard, nextMove, depth - 1, alpha, beta, false);
        maxValue = Math.max(maxValue, value);
        alpha = Math.max(alpha, value);
        if (beta <= alpha) break; // Alpha-beta pruning
      }
      this.transpositionTable.set(boardKey, { value: maxValue, depth });
      return maxValue;
    } else {
      let minValue = Infinity;
      for (const nextMove of orderedMoves) {
        const value = this.alphaBetaWithDepth(tempBoard, nextMove, depth - 1, alpha, beta, true);
        minValue = Math.min(minValue, value);
        beta = Math.min(beta, value);
        if (beta <= alpha) break; // Alpha-beta pruning
      }
      this.transpositionTable.set(boardKey, { value: minValue, depth });
      return minValue;
    }
  }

  // Quiescence search to avoid horizon effect
  quiescenceSearch(board, alpha, beta, maxDepth) {
    if (maxDepth <= 0) {
      return this.evaluatePositionAdvanced(board, 'pigs');
    }

    const standPat = this.evaluatePositionAdvanced(board, 'pigs');
    
    if (standPat >= beta) {
      return beta;
    }
    if (alpha < standPat) {
      alpha = standPat;
    }

    // Only search tactical moves (captures, checks)
    const tacticalMoves = this.getTacticalMoves(board, 'pigs');
    
    for (const move of tacticalMoves) {
      const tempBoard = this.makeTemporaryMove(board, move);
      const value = -this.quiescenceSearch(tempBoard, -beta, -alpha, maxDepth - 1);
      
      if (value >= beta) {
        return beta;
      }
      if (value > alpha) {
        alpha = value;
      }
    }

    return alpha;
  }

  getTacticalMoves(board, team) {
    const allMoves = this.getAllPossibleMoves(board, team);
    const tacticalMoves = [];

    for (const move of allMoves) {
      const targetPiece = board[move.toRow][move.toCol];
      
      // Captures
      if (targetPiece) {
        tacticalMoves.push(move);
        continue;
      }
      
      // Checks
      const tempBoard = this.makeTemporaryMove(board, move);
      const opponentTeam = team === 'pigs' ? 'birds' : 'pigs';
      if (this.isKingInCheck(tempBoard, opponentTeam)) {
        tacticalMoves.push(move);
      }
    }

    return tacticalMoves;
  }

  // Enhanced position evaluation (reuse Nightmare AI's evaluation but with higher weights)
  evaluatePositionAdvanced(board, team) {
    let value = 0;
    
    // Material and enhanced positional evaluation
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const piece = board[row][col];
        if (piece) {
          const pieceValue = this.evaluatePieceImpossible(board, row, col);
          if (piece.team === team) {
            value += pieceValue;
          } else {
            value -= pieceValue;
          }
        }
      }
    }

    // Enhanced strategic factors with higher weights
    const gamePhase = this.getGamePhase(board);
    value += this.evaluateKingSafetyAdvanced(board, team, gamePhase) * 5;
    value += this.evaluatePawnStructureAdvanced(board, team) * 3;
    value += this.evaluateControlOfCenter(board, team) * 3;
    value += this.evaluatePieceCoordination(board, team) * 2;
    value += this.evaluateThreats(board, team) * 2;

    // Perfect tactical evaluation
    const opponentTeam = team === 'pigs' ? 'birds' : 'pigs';
    
    if (this.isKingInCheck(board, opponentTeam)) {
      if (this.isCheckmate(board, opponentTeam)) {
        value += 20000;
      } else {
        value += 500; // Even higher bonus for check
      }
    }
    
    value += this.evaluateHangingPieces(board, team) * 1.5;
    
    return value;
  }

  evaluatePieceImpossible(board, row, col) {
    const piece = board[row][col];
    if (!piece) return 0;

    let value = this.pieceValues[piece.type] || 0;

    // Enhanced piece evaluation with perfect positional understanding
    const gamePhase = this.getGamePhase(board);
    
    switch (piece.type) {
      case 'pawn':
        value += this.evaluatePawnImpossible(board, row, col, gamePhase);
        break;
      case 'knight':
        value += this.evaluateKnightImpossible(board, row, col, gamePhase);
        break;
      case 'bishop':
        value += this.evaluateBishopImpossible(board, row, col, gamePhase);
        break;
      case 'rook':
        value += this.evaluateRookImpossible(board, row, col, gamePhase);
        break;
      case 'queen':
        value += this.evaluateQueenImpossible(board, row, col, gamePhase);
        break;
      case 'king':
        value += this.evaluateKingImpossible(board, row, col, gamePhase);
        break;
      default:
        break;
    }

    return value;
  }

  // Perfect piece evaluations
  evaluatePawnImpossible(board, row, col, gamePhase) {
    // Reuse Nightmare AI evaluation but with enhanced bonuses
    const value = this.evaluatePawnNightmare ? this.evaluatePawnNightmare(board, row, col, gamePhase) : 0;
    
    // Additional perfect pawn evaluation
    const piece = board[row][col];
    const advancement = piece.team === 'pigs' ? row : (7 - row);
    
    // Exponential bonus for advanced pawns in endgame
    if (gamePhase === 'endgame' && advancement >= 5) {
      return value + (advancement * advancement * 20);
    }
    
    return value * 1.5; // Enhanced pawn evaluation
  }

  evaluateKnightImpossible(board, row, col, gamePhase) {
    let value = 0;
    const centerDistance = Math.abs(3.5 - row) + Math.abs(3.5 - col);
    value += (7 - centerDistance) * 15; // Higher center bonus
    
    const mobility = this.getAllValidMoves(board, row, col).length;
    value += mobility * 5; // Higher mobility bonus
    
    // Knight outposts
    if (this.isKnightOutpost(board, row, col)) {
      value += 60;
    }
    
    return value;
  }

  evaluateBishopImpossible(board, row, col, gamePhase) {
    let value = 0;
    const mobility = this.getAllValidMoves(board, row, col).length;
    value += mobility * 8; // Higher mobility bonus
    
    // Bishop pair bonus
    if (this.hasBishopPair(board, board[row][col].team)) {
      value += 50;
    }
    
    // Long diagonal control
    if (this.isOnLongDiagonal(row, col)) {
      value += 30;
    }
    
    return value;
  }

  evaluateRookImpossible(board, row, col, gamePhase) {
    let value = 0;
    const mobility = this.getAllValidMoves(board, row, col).length;
    value += mobility * 6;
    
    if (this.isOnOpenFile(board, col)) {
      value += 60; // Higher open file bonus
    }
    
    // Rook on 7th rank
    const piece = board[row][col];
    const seventhRank = piece.team === 'pigs' ? 6 : 1;
    if (row === seventhRank) {
      value += 50; // Higher 7th rank bonus
    }
    
    // Rook battery
    if (this.hasRookBattery(board, row, col)) {
      value += 40;
    }
    
    return value;
  }

  evaluateQueenImpossible(board, row, col, gamePhase) {
    const mobility = this.getAllValidMoves(board, row, col).length;
    let value = mobility * 4; // Higher mobility bonus
    
    if (gamePhase === 'opening' && (row !== 0 && row !== 7)) {
      value -= 40; // Higher penalty for early queen development
    }
    
    return value;
  }

  evaluateKingImpossible(board, row, col, gamePhase) {
    let value = 0;
    
    if (gamePhase === 'endgame') {
      // Perfect endgame king activity
      const centerDistance = Math.abs(3.5 - row) + Math.abs(3.5 - col);
      value += (7 - centerDistance) * 25; // Higher endgame activity bonus
      
      // Opposition bonus
      if (this.hasOpposition(board, row, col)) {
        value += 100;
      }
    } else {
      // Perfect king safety
      const piece = board[row][col];
      const backRank = piece.team === 'pigs' ? 0 : 7;
      if (row === backRank) {
        value += 40; // Higher safety bonus
      } else {
        value -= 100; // Higher penalty for exposed king
      }
    }
    
    return value;
  }

  // Additional helper methods for perfect evaluation
  isKnightOutpost(board, row, col) {
    // Simplified outpost detection
    const piece = board[row][col];
    if (piece.type !== 'knight') return false;
    
    // Check if square is defended by pawn and cannot be attacked by enemy pawns
    return this.isDefendedByPawn(board, row, col, piece.team) && 
           !this.canBeAttackedByEnemyPawn(board, row, col, piece.team);
  }

  hasBishopPair(board, team) {
    let bishopCount = 0;
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const piece = board[row][col];
        if (piece && piece.type === 'bishop' && piece.team === team) {
          bishopCount++;
        }
      }
    }
    return bishopCount >= 2;
  }

  isOnLongDiagonal(row, col) {
    return (row + col === 7) || (row === col);
  }

  hasRookBattery(board, row, col) {
    // Simplified rook battery detection
    const piece = board[row][col];
    if (piece.type !== 'rook') return false;
    
    // Check for doubled rooks on same file or rank
    for (let r = 0; r < 8; r++) {
      if (r !== row) {
        const checkPiece = board[r][col];
        if (checkPiece && (checkPiece.type === 'rook' || checkPiece.type === 'queen') && checkPiece.team === piece.team) {
          return true;
        }
      }
    }
    
    for (let c = 0; c < 8; c++) {
      if (c !== col) {
        const checkPiece = board[row][c];
        if (checkPiece && (checkPiece.type === 'rook' || checkPiece.type === 'queen') && checkPiece.team === piece.team) {
          return true;
        }
      }
    }
    
    return false;
  }

  hasOpposition(board, kingRow, kingCol) {
    // Simplified opposition detection
    const opponentTeam = board[kingRow][kingCol].team === 'pigs' ? 'birds' : 'pigs';
    const opponentKing = this.findKing(board, opponentTeam);
    
    if (!opponentKing) return false;
    
    const rowDiff = Math.abs(kingRow - opponentKing.row);
    const colDiff = Math.abs(kingCol - opponentKing.col);
    
    return (rowDiff === 2 && colDiff === 0) || (rowDiff === 0 && colDiff === 2) || (rowDiff === 2 && colDiff === 2);
  }

  isDefendedByPawn(board, row, col, team) {
    const direction = team === 'pigs' ? -1 : 1;
    const defendingRow = row + direction;
    
    for (let c = col - 1; c <= col + 1; c += 2) {
      if (c >= 0 && c < 8 && defendingRow >= 0 && defendingRow < 8) {
        const piece = board[defendingRow][c];
        if (piece && piece.type === 'pawn' && piece.team === team) {
          return true;
        }
      }
    }
    
    return false;
  }

  canBeAttackedByEnemyPawn(board, row, col, team) {
    const opponentTeam = team === 'pigs' ? 'birds' : 'pigs';
    const direction = opponentTeam === 'pigs' ? 1 : -1;
    const attackingRow = row + direction;
    
    for (let c = col - 1; c <= col + 1; c += 2) {
      if (c >= 0 && c < 8 && attackingRow >= 0 && attackingRow < 8) {
        const piece = board[attackingRow][c];
        if (piece && piece.type === 'pawn' && piece.team === opponentTeam) {
          return true;
        }
      }
    }
    
    return false;
  }

  // Import evaluation methods from Nightmare AI
  getGamePhase(board) {
    let material = 0;
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const piece = board[row][col];
        if (piece && piece.type !== 'king' && piece.type !== 'pawn') {
          material += this.pieceValues[piece.type];
        }
      }
    }
    
    if (material > 6000) return 'opening';
    if (material > 2500) return 'middlegame';
    return 'endgame';
  }

  // Inherit other evaluation methods from parent class and Nightmare AI
  evaluateKingSafetyAdvanced(board, team, gamePhase) {
    // Enhanced version of Nightmare AI's king safety evaluation
    if (gamePhase === 'endgame') return 0;
    
    const kingPos = this.findKing(board, team);
    if (!kingPos) return -2000;

    let safety = 0;
    const opponentTeam = team === 'pigs' ? 'birds' : 'pigs';
    
    // More detailed king safety with perfect evaluation
    for (let r = kingPos.row - 3; r <= kingPos.row + 3; r++) {
      for (let c = kingPos.col - 3; c <= kingPos.col + 3; c++) {
        if (r >= 0 && r < 8 && c >= 0 && c < 8) {
          if (this.isPositionUnderAttack(board, r, c, opponentTeam)) {
            const distance = Math.abs(r - kingPos.row) + Math.abs(c - kingPos.col);
            safety -= (4 - distance) * 20; // Higher penalty for closer attacks
          }
        }
      }
    }
    
    // Perfect pawn shield evaluation
    const pawnShield = this.countPawnShield(board, kingPos.row, kingPos.col, team);
    safety += pawnShield * 40; // Higher pawn shield bonus
    
    return safety;
  }

  evaluatePawnStructureAdvanced(board, team) {
    // Enhanced version with perfect pawn structure understanding
    let value = 0;
    
    for (let col = 0; col < 8; col++) {
      const pawns = this.getPawnsInFile(board, col, team);
      
      if (pawns.length === 0) continue;
      
      // Perfect pawn structure evaluation
      if (pawns.length > 1) {
        value -= 50 * (pawns.length - 1); // Higher doubled pawn penalty
      }
      
      if (this.isIsolatedFile(board, col, team)) {
        value -= 60 * pawns.length; // Higher isolated pawn penalty
      }
      
      pawns.forEach(pawnRow => {
        if (this.isPassedPawn(board, pawnRow, col)) {
          const advancement = team === 'pigs' ? pawnRow : (7 - pawnRow);
          value += 80 + advancement * 30; // Higher passed pawn bonus
        }
      });
    }
    
    return value;
  }

  evaluateControlOfCenter(board, team) {
    let value = 0;
    const centerSquares = [[3,3], [3,4], [4,3], [4,4]];
    const extendedCenter = [[2,2], [2,3], [2,4], [2,5], [3,2], [3,5], [4,2], [4,5], [5,2], [5,3], [5,4], [5,5]];
    
    centerSquares.forEach(([row, col]) => {
      if (this.isPositionUnderAttack(board, row, col, team)) {
        value += 40; // Higher center control bonus
      }
      
      const piece = board[row][col];
      if (piece && piece.team === team) {
        value += 60; // Higher center occupation bonus
      }
    });
    
    extendedCenter.forEach(([row, col]) => {
      if (this.isPositionUnderAttack(board, row, col, team)) {
        value += 10; // Extended center control
      }
    });
    
    return value;
  }

  evaluatePieceCoordination(board, team) {
    let value = 0;
    
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const piece = board[row][col];
        if (piece && piece.team === team) {
          const defenders = this.countAttackers(board, row, col, team);
          value += defenders * 8; // Higher coordination bonus
        }
      }
    }
    
    return value;
  }

  evaluateThreats(board, team) {
    let value = 0;
    const opponentTeam = team === 'pigs' ? 'birds' : 'pigs';
    
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const piece = board[row][col];
        if (piece && piece.team === opponentTeam) {
          if (this.isPositionUnderAttack(board, row, col, team) && 
              !this.isPositionUnderAttack(board, row, col, opponentTeam)) {
            value += this.pieceValues[piece.type] * 0.8; // Higher threat bonus
          }
        }
      }
    }
    
    return value;
  }

  evaluateHangingPieces(board, team) {
    let value = 0;
    
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const piece = board[row][col];
        if (piece) {
          const attackers = this.countAttackers(board, row, col, piece.team === 'pigs' ? 'birds' : 'pigs');
          const defenders = this.countAttackers(board, row, col, piece.team);
          
          if (attackers > defenders) {
            const hangingValue = this.pieceValues[piece.type];
            if (piece.team === team) {
              value -= hangingValue;
            } else {
              value += hangingValue;
            }
          }
        }
      }
    }
    
    return value;
  }

  // Helper methods (imported from NightmareAI)
  countAttackers(board, row, col, attackingTeam) {
    let count = 0;
    
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const piece = board[r][c];
        if (piece && piece.team === attackingTeam) {
          if (this.canPieceAttackPosition(board, r, c, row, col)) {
            count++;
          }
        }
      }
    }
    
    return count;
  }

  isOnOpenFile(board, col) {
    for (let row = 0; row < 8; row++) {
      const piece = board[row][col];
      if (piece && piece.type === 'pawn') {
        return false;
      }
    }
    return true;
  }

  countPawnShield(board, kingRow, kingCol, team) {
    let shieldCount = 0;
    const direction = team === 'pigs' ? -1 : 1;
    
    for (let col = kingCol - 1; col <= kingCol + 1; col++) {
      if (col >= 0 && col < 8) {
        const shieldRow = kingRow + direction;
        if (shieldRow >= 0 && shieldRow < 8) {
          const piece = board[shieldRow][col];
          if (piece && piece.type === 'pawn' && piece.team === team) {
            shieldCount++;
          }
        }
      }
    }
    
    return shieldCount;
  }

  getPawnsInFile(board, col, team) {
    const pawns = [];
    
    for (let row = 0; row < 8; row++) {
      const piece = board[row][col];
      if (piece && piece.type === 'pawn' && piece.team === team) {
        pawns.push(row);
      }
    }
    
    return pawns;
  }

  isIsolatedFile(board, col, team) {
    for (let checkCol = col - 1; checkCol <= col + 1; checkCol += 2) {
      if (checkCol >= 0 && checkCol < 8) {
        for (let row = 0; row < 8; row++) {
          const piece = board[row][checkCol];
          if (piece && piece.type === 'pawn' && piece.team === team) {
            return false;
          }
        }
      }
    }
    
    return true;
  }

  isPassedPawn(board, row, col) {
    const piece = board[row][col];
    if (!piece || piece.type !== 'pawn') return false;
    
    const direction = piece.team === 'pigs' ? 1 : -1;
    const opponentTeam = piece.team === 'pigs' ? 'birds' : 'pigs';
    
    for (let checkCol = col - 1; checkCol <= col + 1; checkCol++) {
      if (checkCol >= 0 && checkCol < 8) {
        for (let checkRow = row + direction; checkRow >= 0 && checkRow < 8; checkRow += direction) {
          const checkPiece = board[checkRow][checkCol];
          if (checkPiece && checkPiece.type === 'pawn' && checkPiece.team === opponentTeam) {
            return false;
          }
        }
      }
    }
    
    return true;
  }

  getBoardHash(board) {
    let hash = '';
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const piece = board[row][col];
        if (piece) {
          hash += `${piece.type[0]}${piece.team[0]}${row}${col}`;
        } else {
          hash += 'e';
        }
      }
    }
    return hash;
  }

  makeTemporaryMove(board, move) {
    const tempBoard = board.map(row => [...row]);
    const piece = tempBoard[move.fromRow][move.fromCol];
    tempBoard[move.toRow][move.toCol] = { ...piece, moved: true };
    tempBoard[move.fromRow][move.fromCol] = null;
    return tempBoard;
  }

  // Impossible AI takes even longer to think (simulating perfect calculation)
  makeMove(board, onMoveComplete) {
    const thinkingTime = 4000 + Math.random() * 3000; // 4-7 seconds
    
    setTimeout(() => {
      const move = this.calculateBestMove(board);
      if (move) {
        onMoveComplete(move);
      }
    }, thinkingTime);
  }
}
