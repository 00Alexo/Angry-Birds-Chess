import { ChessAI } from './ChessAI.js';

export class HardAI extends ChessAI {
  constructor() {
    super('hard');
  }

  // Hard AI: Advanced evaluation with deeper search (async to prevent UI freeze)
  async calculateBestMove(board) {
    const allPossibleMoves = this.getAllPossibleMoves(board, 'pigs');
    
    if (allPossibleMoves.length === 0) return null;

    // Use minimax with alpha-beta pruning
    let bestMove = null;
    let bestValue = -Infinity;

    // Process moves in batches to prevent UI freeze
    let moveIndex = 0;
    const processMoveBatch = async () => {
      const batchSize = Math.max(1, Math.ceil(allPossibleMoves.length / 8)); // Process in batches
      const endIndex = Math.min(moveIndex + batchSize, allPossibleMoves.length);
      
      for (let i = moveIndex; i < endIndex; i++) {
        const move = allPossibleMoves[i];
        const value = await this.minimaxAsync(board, move, 2, -Infinity, Infinity, false); // 2-move depth
        if (value > bestValue) {
          bestValue = value;
          bestMove = move;
        }
      }
      
      moveIndex = endIndex;
      
      if (moveIndex < allPossibleMoves.length) {
        // Yield control to browser before processing next batch
        await new Promise(resolve => setTimeout(resolve, 0));
        return await processMoveBatch();
      }
      
      return bestMove;
    };

    return await processMoveBatch();
  }

  // Minimax algorithm with alpha-beta pruning (async version to prevent UI freeze)
  async minimaxAsync(board, move, depth, alpha, beta, isMaximizing, nodeCount = 0) {
    const tempBoard = this.makeTemporaryMove(board, move);
    
    // Yield control periodically to prevent UI freeze
    if (nodeCount % 50 === 0) {
      await new Promise(resolve => setTimeout(resolve, 0));
    }
    
    // Base case: evaluate position
    if (depth === 0) {
      return this.evaluatePosition(tempBoard, 'pigs');
    }

    const currentTeam = isMaximizing ? 'pigs' : 'birds';
    const possibleMoves = this.getAllPossibleMoves(tempBoard, currentTeam);

    if (possibleMoves.length === 0) {
      // No moves available - check for checkmate
      if (this.isKingInCheck(tempBoard, currentTeam)) {
        return isMaximizing ? -9999 : 9999; // Checkmate
      }
      return 0; // Stalemate
    }

    // Limit number of moves for performance
    const movesToConsider = possibleMoves.length > 15 ? 
      this.orderMovesByCaptures(possibleMoves, tempBoard).slice(0, 15) : 
      possibleMoves;

    if (isMaximizing) {
      let maxValue = -Infinity;
      for (const nextMove of movesToConsider) {
        const value = await this.minimaxAsync(tempBoard, nextMove, depth - 1, alpha, beta, false, nodeCount + 1);
        maxValue = Math.max(maxValue, value);
        alpha = Math.max(alpha, value);
        if (beta <= alpha) break; // Alpha-beta pruning
      }
      return maxValue;
    } else {
      let minValue = Infinity;
      for (const nextMove of movesToConsider) {
        const value = await this.minimaxAsync(tempBoard, nextMove, depth - 1, alpha, beta, true, nodeCount + 1);
        minValue = Math.min(minValue, value);
        beta = Math.min(beta, value);
        if (beta <= alpha) break; // Alpha-beta pruning
      }
      return minValue;
    }
  }

  // Simple move ordering to prioritize captures
  orderMovesByCaptures(moves, board) {
    return moves.sort((a, b) => {
      const aPiece = board[a.toRow][a.toCol];
      const bPiece = board[b.toRow][b.toCol];
      
      // Prioritize captures
      if (aPiece && !bPiece) return -1;
      if (!aPiece && bPiece) return 1;
      if (aPiece && bPiece) {
        // Higher value captures first
        return (this.pieceValues[bPiece.type] || 0) - (this.pieceValues[aPiece.type] || 0);
      }
      
      return 0; // No preference
    });
  }

  // Minimax algorithm with alpha-beta pruning (original synchronous version)
  minimax(board, move, depth, alpha, beta, isMaximizing) {
    const tempBoard = this.makeTemporaryMove(board, move);
    
    // Base case: evaluate position
    if (depth === 0) {
      return this.evaluatePosition(tempBoard, 'pigs');
    }

    const currentTeam = isMaximizing ? 'pigs' : 'birds';
    const possibleMoves = this.getAllPossibleMoves(tempBoard, currentTeam);

    if (possibleMoves.length === 0) {
      // No moves available - check for checkmate
      if (this.isKingInCheck(tempBoard, currentTeam)) {
        return isMaximizing ? -9999 : 9999; // Checkmate
      }
      return 0; // Stalemate
    }

    if (isMaximizing) {
      let maxValue = -Infinity;
      for (const nextMove of possibleMoves) {
        const value = this.minimax(tempBoard, nextMove, depth - 1, alpha, beta, false);
        maxValue = Math.max(maxValue, value);
        alpha = Math.max(alpha, value);
        if (beta <= alpha) break; // Alpha-beta pruning
      }
      return maxValue;
    } else {
      let minValue = Infinity;
      for (const nextMove of possibleMoves) {
        const value = this.minimax(tempBoard, nextMove, depth - 1, alpha, beta, true);
        minValue = Math.min(minValue, value);
        beta = Math.min(beta, value);
        if (beta <= alpha) break; // Alpha-beta pruning
      }
      return minValue;
    }
  }

  makeTemporaryMove(board, move) {
    const tempBoard = board.map(row => [...row]);
    const piece = tempBoard[move.fromRow][move.fromCol];
    tempBoard[move.toRow][move.toCol] = { ...piece, moved: true };
    tempBoard[move.fromRow][move.fromCol] = null;
    return tempBoard;
  }

  evaluatePosition(board, team) {
    let value = 0;
    
    // Material evaluation (optimized)
    let myMaterial = 0;
    let opponentMaterial = 0;
    
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const piece = board[row][col];
        if (piece) {
          const basicValue = this.pieceValues[piece.type] || 0;
          const positionalBonus = this.getQuickPositionalBonus(piece.type, row, col, piece.team);
          const totalValue = basicValue + positionalBonus;
          
          if (piece.team === team) {
            myMaterial += basicValue;
            value += totalValue;
          } else {
            opponentMaterial += basicValue;
            value -= totalValue;
          }
        }
      }
    }

    // Only do expensive evaluations if position is relatively balanced
    const materialDifference = Math.abs(myMaterial - opponentMaterial);
    if (materialDifference < 400) { // Only if close game
      // Strategic bonuses (reduced intensity)
      value += this.evaluateKingSafety(board, team);
      value += this.evaluateControlOfCenter(board, team);
      
      // Only occasionally do full pawn structure analysis
      if (Math.random() < 0.4) { // 40% chance
        value += this.evaluatePawnStructure(board, team);
      }
    }

    // Always check for checkmate/check (important)
    const opponentTeam = team === 'pigs' ? 'birds' : 'pigs';
    if (this.isKingInCheck(board, opponentTeam)) {
      if (this.isCheckmate(board, opponentTeam)) {
        value += 10000; // Checkmate
      } else {
        value += 100; // Check
      }
    }

    return value;
  }

  // Quick positional evaluation without complex calculations
  getQuickPositionalBonus(pieceType, row, col, team) {
    let bonus = 0;
    
    switch (pieceType) {
      case 'pawn':
        // Simple advancement bonus
        const advancement = team === 'pigs' ? row : (7 - row);
        bonus += advancement * 8;
        break;
      case 'knight':
      case 'bishop':
        // Simple center control bonus
        const centerDistance = Math.abs(3.5 - row) + Math.abs(3.5 - col);
        bonus += (7 - centerDistance) * 3;
        break;
      case 'king':
        // Keep king safe
        if (row === 0 || row === 7) {
          bonus += 5; // Back rank safety
        }
        break;
    }
    
    return bonus;
  }

  evaluatePieceAdvanced(board, row, col) {
    const piece = board[row][col];
    if (!piece) return 0;

    let value = this.pieceValues[piece.type] || 0;

    // Advanced piece-specific evaluation
    switch (piece.type) {
      case 'pawn':
        value += this.evaluatePawn(board, row, col);
        break;
      case 'knight':
        value += this.evaluateKnight(board, row, col);
        break;
      case 'bishop':
        value += this.evaluateBishop(board, row, col);
        break;
      case 'rook':
        value += this.evaluateRook(board, row, col);
        break;
      case 'queen':
        value += this.evaluateQueen(board, row, col);
        break;
      default:
        // Unknown piece type, no additional evaluation
        break;
    }

    return value;
  }

  evaluatePawn(board, row, col) {
    const piece = board[row][col];
    let value = 0;

    // Advancement bonus
    const advancement = piece.team === 'pigs' ? row : (7 - row);
    value += advancement * 15;

    // Passed pawn bonus
    if (this.isPassedPawn(board, row, col)) {
      value += 50;
    }

    // Doubled pawn penalty
    if (this.isDoubledPawn(board, row, col)) {
      value -= 20;
    }

    return value;
  }

  evaluateKnight(board, row, col) {
    // Knights prefer center squares
    const centerDistance = Math.abs(3.5 - row) + Math.abs(3.5 - col);
    return (7 - centerDistance) * 8;
  }

  evaluateBishop(board, row, col) {
    // Bishop mobility
    return this.getAllValidMoves(board, row, col).length * 5;
  }

  evaluateRook(board, row, col) {
    let value = 0;
    value += this.getAllValidMoves(board, row, col).length * 3;
    
    // Open file bonus
    if (this.isOnOpenFile(board, col)) {
      value += 25;
    }
    
    return value;
  }

  evaluateQueen(board, row, col) {
    // Queen mobility (but don't develop too early)
    const mobility = this.getAllValidMoves(board, row, col).length;
    return mobility * 2;
  }

  evaluateKingSafety(board, team) {
    const kingPos = this.findKing(board, team);
    if (!kingPos) return -1000;

    let safety = 0;
    
    // Penalize exposed king
    const opponentTeam = team === 'pigs' ? 'birds' : 'pigs';
    const attackers = this.countAttackers(board, kingPos.row, kingPos.col, opponentTeam);
    safety -= attackers * 30;

    // Reward pawn shield
    const pawnShield = this.countPawnShield(board, kingPos.row, kingPos.col, team);
    safety += pawnShield * 15;

    return safety;
  }

  evaluatePawnStructure(board, team) {
    let value = 0;
    
    for (let col = 0; col < 8; col++) {
      const pawns = this.getPawnsInFile(board, col, team);
      
      // Isolated pawn penalty
      if (pawns.length > 0 && this.isIsolatedFile(board, col, team)) {
        value -= 25 * pawns.length;
      }
      
      // Doubled pawns penalty
      if (pawns.length > 1) {
        value -= 20 * (pawns.length - 1);
      }
    }
    
    return value;
  }

  evaluateControlOfCenter(board, team) {
    const centerSquares = [[3,3], [3,4], [4,3], [4,4]];
    const extendedCenter = [[2,2], [2,3], [2,4], [2,5], [3,2], [3,5], [4,2], [4,5], [5,2], [5,3], [5,4], [5,5]];
    
    let control = 0;
    
    centerSquares.forEach(([r, c]) => {
      if (this.isPositionUnderAttack(board, r, c, team)) {
        control += 20;
      }
    });
    
    extendedCenter.forEach(([r, c]) => {
      if (this.isPositionUnderAttack(board, r, c, team)) {
        control += 5;
      }
    });
    
    return control;
  }

  // Helper methods for advanced evaluation
  isPassedPawn(board, row, col) {
    // Simplified - check if no enemy pawns ahead
    const piece = board[row][col];
    if (piece.type !== 'pawn') return false;
    
    const direction = piece.team === 'pigs' ? 1 : -1;
    for (let r = row + direction; r >= 0 && r < 8; r += direction) {
      for (let c = Math.max(0, col - 1); c <= Math.min(7, col + 1); c++) {
        const checkPiece = board[r][c];
        if (checkPiece && checkPiece.type === 'pawn' && checkPiece.team !== piece.team) {
          return false;
        }
      }
    }
    return true;
  }

  isDoubledPawn(board, row, col) {
    const piece = board[row][col];
    if (piece.type !== 'pawn') return false;
    
    for (let r = 0; r < 8; r++) {
      if (r !== row) {
        const otherPiece = board[r][col];
        if (otherPiece && otherPiece.type === 'pawn' && otherPiece.team === piece.team) {
          return true;
        }
      }
    }
    return false;
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

  countAttackers(board, row, col, byTeam) {
    let count = 0;
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const piece = board[r][c];
        if (piece && piece.team === byTeam) {
          if (this.canPieceAttackPosition(board, r, c, row, col)) {
            count++;
          }
        }
      }
    }
    return count;
  }

  countPawnShield(board, kingRow, kingCol, team) {
    let shield = 0;
    const direction = team === 'pigs' ? -1 : 1; // Direction towards own side
    
    for (let c = kingCol - 1; c <= kingCol + 1; c++) {
      if (c >= 0 && c < 8) {
        const shieldRow = kingRow + direction;
        if (shieldRow >= 0 && shieldRow < 8) {
          const piece = board[shieldRow][c];
          if (piece && piece.type === 'pawn' && piece.team === team) {
            shield++;
          }
        }
      }
    }
    
    return shield;
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
    const leftFile = col - 1;
    const rightFile = col + 1;
    
    for (let checkCol of [leftFile, rightFile]) {
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

  // Hard AI thinks strategically but doesn't freeze the UI
  async makeMove(board, onMoveComplete) {
    console.log('🔴 Hard AI is analyzing the position...');
    const startTime = Date.now();
    
    try {
      // Add a small initial delay
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const move = await this.calculateBestMove(board);
      const thinkingTime = Date.now() - startTime;
      
      console.log(`🧠 Hard AI calculated move in ${thinkingTime}ms:`, move);
      
      if (move) {
        // Add minimum thinking time for strategic feel
        const minThinkingTime = 1500; // 1.5 seconds minimum
        const remainingTime = Math.max(0, minThinkingTime - thinkingTime);
        
        setTimeout(() => {
          onMoveComplete(move);
        }, remainingTime);
      } else {
        console.error('🔴 Hard AI could not find a valid move!');
        onMoveComplete(null);
      }
    } catch (error) {
      console.error('🔴 Hard AI encountered an error:', error);
      onMoveComplete(null);
    }
  }
}
