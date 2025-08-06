import { ChessAI } from './ChessAI.js';

export class MediumAI extends ChessAI {
  constructor() {
    super('medium');
  }

  // Medium AI: Better positional evaluation and 2-move lookahead
  calculateBestMove(board) {
    const allPossibleMoves = this.getAllPossibleMoves(board, 'pigs');
    
    if (allPossibleMoves.length === 0) return null;

    // Evaluate all moves with deeper analysis
    const evaluatedMoves = allPossibleMoves.map(move => ({
      ...move,
      value: this.evaluateMoveWithLookahead(board, move, 1) // 1-move lookahead
    }));

    // Sort by value (highest first)
    evaluatedMoves.sort((a, b) => b.value - a.value);

    // Medium AI: More strategic, less random
    const bestMoves = evaluatedMoves.slice(0, Math.max(1, Math.floor(evaluatedMoves.length * 0.2)));
    
    // 80% chance to pick the best move, 20% chance for variety
    if (Math.random() < 0.8) {
      return bestMoves[0];
    } else {
      return bestMoves[Math.floor(Math.random() * bestMoves.length)];
    }
  }

  evaluateMoveWithLookahead(board, move, depth) {
    // Make the move temporarily
    const tempBoard = this.makeTemporaryMove(board, move);
    let value = this.evaluatePosition(tempBoard, 'pigs');

    // If we have depth left, consider opponent's response
    if (depth > 0) {
      const opponentMoves = this.getAllPossibleMoves(tempBoard, 'birds');
      if (opponentMoves.length > 0) {
        let bestOpponentValue = -Infinity;
        for (const opponentMove of opponentMoves.slice(0, 5)) { // Limit to top 5 moves
          const value = this.evaluateMoveWithLookahead(tempBoard, opponentMove, depth - 1);
          bestOpponentValue = Math.max(bestOpponentValue, value);
        }
        value -= bestOpponentValue; // Subtract opponent's best response
      }
    }

    return value;
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
    
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const piece = board[row][col];
        if (piece) {
          const pieceValue = this.evaluatePiece(board, row, col);
          if (piece.team === team) {
            value += pieceValue;
          } else {
            value -= pieceValue;
          }
        }
      }
    }

    // Check for check/checkmate
    if (this.isKingInCheck(board, team === 'pigs' ? 'birds' : 'pigs')) {
      value += 50; // Bonus for putting opponent in check
    }
    
    if (this.isCheckmate(board, team === 'pigs' ? 'birds' : 'pigs')) {
      value += 10000; // Huge bonus for checkmate
    }

    return value;
  }

  evaluatePiece(board, row, col) {
    const piece = board[row][col];
    if (!piece) return 0;

    let value = this.pieceValues[piece.type] || 0;

    // Positional bonuses
    switch (piece.type) {
      case 'pawn':
        // Pawns are more valuable when advanced
        const advancement = piece.team === 'pigs' ? row : (7 - row);
        value += advancement * 10;
        break;
      case 'knight':
        // Knights are better in the center
        const knightCenterDistance = Math.abs(3.5 - row) + Math.abs(3.5 - col);
        value += (7 - knightCenterDistance) * 5;
        break;
      case 'bishop':
        // Bishops prefer long diagonals
        value += this.getAllValidMoves(board, row, col).length * 3;
        break;
      case 'rook':
        // Rooks prefer open files
        value += this.getAllValidMoves(board, row, col).length * 2;
        break;
      case 'queen':
        // Queen mobility
        value += this.getAllValidMoves(board, row, col).length;
        break;
      case 'king':
        // King safety in early/mid game
        const isEndgame = this.countPieces(board) < 12;
        if (!isEndgame) {
          // Penalize exposed king
          const kingRow = piece.team === 'pigs' ? 0 : 7;
          if (row !== kingRow) {
            value -= 30;
          }
        }
        break;
    }

    return value;
  }

  countPieces(board) {
    let count = 0;
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        if (board[row][col]) count++;
      }
    }
    return count;
  }

  // Medium AI thinks a bit longer
  makeMove(board, onMoveComplete) {
    const thinkingTime = 1500 + Math.random() * 1500; // 1.5-3 seconds
    
    setTimeout(() => {
      const move = this.calculateBestMove(board);
      if (move) {
        onMoveComplete(move);
      }
    }, thinkingTime);
  }
}
