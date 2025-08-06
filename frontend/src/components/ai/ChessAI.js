// Base Chess AI class with common functionality
export class ChessAI {
  constructor(difficulty = 'easy') {
    this.difficulty = difficulty;
    this.pieceValues = {
      pawn: 100,
      knight: 320,
      bishop: 330,
      rook: 500,
      queen: 900,
      king: 20000
    };
  }

  // Find the king position for a given team
  findKing(board, team) {
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const piece = board[row][col];
        if (piece && piece.type === 'king' && piece.team === team) {
          return { row, col };
        }
      }
    }
    return null;
  }

  // Check if a position is under attack by the opponent
  isPositionUnderAttack(board, row, col, byTeam) {
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const piece = board[r][c];
        if (piece && piece.team === byTeam) {
          if (this.canPieceAttackPosition(board, r, c, row, col)) {
            return true;
          }
        }
      }
    }
    return false;
  }

  // Check if a piece can attack a specific position (ignoring king safety)
  canPieceAttackPosition(board, fromRow, fromCol, toRow, toCol) {
    const piece = board[fromRow][fromCol];
    if (!piece) return false;

    const rowDiff = Math.abs(toRow - fromRow);
    const colDiff = Math.abs(toCol - fromCol);

    switch (piece.type) {
      case 'pawn':
        if (piece.team === 'birds') {
          // Birds move up (decreasing row), attack diagonally
          return fromRow - toRow === 1 && colDiff === 1;
        } else {
          // Pigs move down (increasing row), attack diagonally
          return toRow - fromRow === 1 && colDiff === 1;
        }
      case 'rook':
        return (rowDiff === 0 || colDiff === 0) && this.isPathClear(board, fromRow, fromCol, toRow, toCol);
      case 'bishop':
        return rowDiff === colDiff && this.isPathClear(board, fromRow, fromCol, toRow, toCol);
      case 'queen':
        return (rowDiff === colDiff || rowDiff === 0 || colDiff === 0) && this.isPathClear(board, fromRow, fromCol, toRow, toCol);
      case 'king':
        return rowDiff <= 1 && colDiff <= 1;
      case 'knight':
        return (rowDiff === 2 && colDiff === 1) || (rowDiff === 1 && colDiff === 2);
      default:
        return false;
    }
  }

  // Check if path is clear between two positions
  isPathClear(board, fromRow, fromCol, toRow, toCol) {
    const rowStep = toRow > fromRow ? 1 : toRow < fromRow ? -1 : 0;
    const colStep = toCol > fromCol ? 1 : toCol < fromCol ? -1 : 0;
    
    let currentRow = fromRow + rowStep;
    let currentCol = fromCol + colStep;
    
    while (currentRow !== toRow || currentCol !== toCol) {
      if (board[currentRow][currentCol] !== null) return false;
      currentRow += rowStep;
      currentCol += colStep;
    }
    
    return true;
  }

  // Check if a king is in check
  isKingInCheck(board, team) {
    const kingPos = this.findKing(board, team);
    if (!kingPos) return false;

    const opponentTeam = team === 'birds' ? 'pigs' : 'birds';
    return this.isPositionUnderAttack(board, kingPos.row, kingPos.col, opponentTeam);
  }

  // Check if a move would leave the king in check
  wouldLeaveKingInCheck(board, fromRow, fromCol, toRow, toCol) {
    const piece = board[fromRow][fromCol];
    if (!piece) return false;

    // Create a temporary board with the move made
    const tempBoard = board.map(row => [...row]);
    const capturedPiece = tempBoard[toRow][toCol];
    tempBoard[toRow][toCol] = tempBoard[fromRow][fromCol];
    tempBoard[fromRow][fromCol] = null;

    // Check if the king is in check after this move
    const inCheck = this.isKingInCheck(tempBoard, piece.team);
    
    return inCheck;
  }

  // Check if it's checkmate
  isCheckmate(board, team) {
    if (!this.isKingInCheck(board, team)) return false;

    // Try all possible moves to see if any can get out of check
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const piece = board[row][col];
        if (piece && piece.team === team) {
          const moves = this.getAllValidMoves(board, row, col);
          if (moves.length > 0) {
            return false; // Found a valid move, not checkmate
          }
        }
      }
    }
    return true; // No valid moves, it's checkmate
  }

  // Get all valid moves for a piece (considering check)
  getAllValidMoves(board, fromRow, fromCol) {
    const piece = board[fromRow][fromCol];
    if (!piece) return [];

    const moves = [];
    
    // Check all squares on the board
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        if (this.isValidMove(board, fromRow, fromCol, row, col)) {
          moves.push([row, col]);
        }
      }
    }
    
    return moves;
  }

  // Validate a move (including check rules)
  isValidMove(board, fromRow, fromCol, toRow, toCol) {
    const piece = board[fromRow][fromCol];
    const targetSquare = board[toRow][toCol];
    
    if (!piece) return false;
    
    // Can't capture your own piece
    if (targetSquare && targetSquare.team === piece.team) return false;
    
    // Can't capture the king directly
    if (targetSquare && targetSquare.type === 'king') return false;
    
    // Check basic piece movement rules
    if (!this.isBasicMoveValid(board, fromRow, fromCol, toRow, toCol)) return false;
    
    // Check if this move would leave the king in check
    if (this.wouldLeaveKingInCheck(board, fromRow, fromCol, toRow, toCol)) return false;
    
    return true;
  }

  // Basic piece movement validation (without considering check)
  isBasicMoveValid(board, fromRow, fromCol, toRow, toCol) {
    const piece = board[fromRow][fromCol];
    const targetSquare = board[toRow][toCol];
    
    const rowDiff = Math.abs(toRow - fromRow);
    const colDiff = Math.abs(toCol - fromCol);
    
    switch (piece.type) {
      case 'pawn':
        if (piece.team === 'birds') {
          // Birds move up (decreasing row)
          if (fromRow - toRow === 1 && colDiff === 0 && !targetSquare) return true;
          if (fromRow - toRow === 1 && colDiff === 1 && targetSquare) return true; // Capture
          if (!piece.moved && fromRow - toRow === 2 && colDiff === 0 && !targetSquare) return true;
        } else {
          // Pigs move down (increasing row)
          if (toRow - fromRow === 1 && colDiff === 0 && !targetSquare) return true;
          if (toRow - fromRow === 1 && colDiff === 1 && targetSquare) return true; // Capture
          if (!piece.moved && toRow - fromRow === 2 && colDiff === 0 && !targetSquare) return true;
        }
        return false;
      case 'rook':
        return (rowDiff === 0 || colDiff === 0) && this.isPathClear(board, fromRow, fromCol, toRow, toCol);
      case 'bishop':
        return rowDiff === colDiff && this.isPathClear(board, fromRow, fromCol, toRow, toCol);
      case 'queen':
        return (rowDiff === colDiff || rowDiff === 0 || colDiff === 0) && this.isPathClear(board, fromRow, fromCol, toRow, toCol);
      case 'king':
        return rowDiff <= 1 && colDiff <= 1;
      case 'knight':
        return (rowDiff === 2 && colDiff === 1) || (rowDiff === 1 && colDiff === 2);
      default:
        return false;
    }
  }

  // Get all possible moves for a team
  getAllPossibleMoves(board, team) {
    const moves = [];
    
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const piece = board[row][col];
        if (piece && piece.team === team) {
          const pieceMoves = this.getAllValidMoves(board, row, col);
          pieceMoves.forEach(([toRow, toCol]) => {
            moves.push({
              fromRow: row,
              fromCol: col,
              toRow,
              toCol,
              piece: piece.type
            });
          });
        }
      }
    }
    
    return moves;
  }
}
