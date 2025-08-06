import { ChessAI } from './ChessAI.js';

export class HardAI extends ChessAI {
  constructor() {
    super('hard');
  }

  // Hard AI: Advanced evaluation with deeper search
  calculateBestMove(board) {
    const allPossibleMoves = this.getAllPossibleMoves(board, 'pigs');
    
    if (allPossibleMoves.length === 0) return null;

    // Use minimax with alpha-beta pruning
    let bestMove = null;
    let bestValue = -Infinity;

    for (const move of allPossibleMoves) {
      const value = this.minimax(board, move, 2, -Infinity, Infinity, false); // 2-move depth
      if (value > bestValue) {
        bestValue = value;
        bestMove = move;
      }
    }

    return bestMove;
  }

  // Minimax algorithm with alpha-beta pruning
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
    
    // Material evaluation
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const piece = board[row][col];
        if (piece) {
          const pieceValue = this.evaluatePieceAdvanced(board, row, col);
          if (piece.team === team) {
            value += pieceValue;
          } else {
            value -= pieceValue;
          }
        }
      }
    }

    // Strategic bonuses
    value += this.evaluateKingSafety(board, team) * 2;
    value += this.evaluatePawnStructure(board, team);
    value += this.evaluateControlOfCenter(board, team) * 1.5;

    // Check and checkmate detection
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

  // Hard AI thinks even longer
  makeMove(board, onMoveComplete) {
    const thinkingTime = 2000 + Math.random() * 2000; // 2-4 seconds
    
    setTimeout(() => {
      const move = this.calculateBestMove(board);
      if (move) {
        onMoveComplete(move);
      }
    }, thinkingTime);
  }
}
