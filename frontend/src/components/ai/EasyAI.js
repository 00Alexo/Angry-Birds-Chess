import { ChessAI } from './ChessAI.js';

export class EasyAI extends ChessAI {
  constructor() {
    super('easy');
  }

  // Easy AI: Simple move selection with basic priorities
  calculateBestMove(board) {
    const allPossibleMoves = this.getAllPossibleMoves(board, 'pigs');
    
    if (allPossibleMoves.length === 0) return null;

    // Evaluate all moves
    const evaluatedMoves = allPossibleMoves.map(move => ({
      ...move,
      value: this.evaluateMove(board, move.fromRow, move.fromCol, move.toRow, move.toCol)
    }));

    // Sort by value (highest first)
    evaluatedMoves.sort((a, b) => b.value - a.value);

    // Easy AI: Add some randomness
    const captureMoves = evaluatedMoves.filter(move => move.value >= 100);
    const goodMoves = evaluatedMoves.filter(move => move.value > 0);
    
    if (captureMoves.length > 0) {
      // 70% chance to take the best capture, 30% random capture
      if (Math.random() < 0.7) {
        return captureMoves[0];
      } else {
        return captureMoves[Math.floor(Math.random() * Math.min(3, captureMoves.length))];
      }
    } else if (goodMoves.length > 0) {
      // Pick from top 50% of good moves
      const topMoves = goodMoves.slice(0, Math.max(1, Math.floor(goodMoves.length * 0.5)));
      return topMoves[Math.floor(Math.random() * topMoves.length)];
    } else {
      // Random move
      return evaluatedMoves[Math.floor(Math.random() * evaluatedMoves.length)];
    }
  }

  evaluateMove(board, fromRow, fromCol, toRow, toCol) {
    let value = 0;
    const targetSquare = board[toRow][toCol];
    
    // Capture value
    if (targetSquare) {
      value += this.pieceValues[targetSquare.type] || 0;
    }
    
    // Center control bonus (simple)
    const centerSquares = [[3,3], [3,4], [4,3], [4,4]];
    if (centerSquares.some(([r, c]) => r === toRow && c === toCol)) {
      value += 20;
    }
    
    // Piece development bonus
    const piece = board[fromRow][fromCol];
    if (piece.type !== 'pawn' && fromRow < 2) {
      value += 15; // Move pieces from back rank
    }
    
    // King safety - avoid moving king unnecessarily
    if (piece.type === 'king') {
      value -= 10;
    }
    
    // Random factor for unpredictability (small for easy)
    value += Math.random() * 30;
    
    return value;
  }

  // Easy AI makes moves with natural delays
  makeMove(board, onMoveComplete) {
    const thinkingTime = 800 + Math.random() * 1200; // 0.8-2 seconds
    
    setTimeout(() => {
      const move = this.calculateBestMove(board);
      if (move) {
        onMoveComplete(move);
      }
    }, thinkingTime);
  }
}
