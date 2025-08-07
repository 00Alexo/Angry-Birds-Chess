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
  isCheckmate(board, team, lastMove = null, gameState = null) {
    if (!this.isKingInCheck(board, team)) return false;

    // Try all possible moves to see if any can get out of check
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const piece = board[row][col];
        if (piece && piece.team === team) {
          const moves = this.getAllValidMoves(board, row, col, lastMove, gameState);
          if (moves.length > 0) {
            return false; // Found a valid move, not checkmate
          }
        }
      }
    }
    return true; // No valid moves, it's checkmate
  }

  // Get all valid moves for a piece (considering check and special moves)
  getAllValidMoves(board, fromRow, fromCol, lastMove = null, gameState = null) {
    const piece = board[fromRow][fromCol];
    if (!piece) return [];

    const moves = [];
    
    // Check all squares on the board
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const moveValidation = this.isValidMoveWithSpecialRules(
          board, fromRow, fromCol, row, col, lastMove, gameState || {}
        );
        
        if (moveValidation.valid) {
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
  getAllPossibleMoves(board, team, lastMove = null, gameState = null) {
    const moves = [];
    
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const piece = board[row][col];
        if (piece && piece.team === team) {
          const pieceMoves = this.getAllValidMoves(board, row, col, lastMove, gameState);
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

  // Check if castling is possible
  canCastle(board, team, side) {
    const kingRow = team === 'birds' ? 7 : 0;
    const rookCol = side === 'kingside' ? 7 : 0;
    const kingCol = 4;
    
    const king = board[kingRow][kingCol];
    const rook = board[kingRow][rookCol];
    
    // Check if king and rook exist and haven't moved
    if (!king || !rook || king.type !== 'king' || rook.type !== 'rook' || 
        king.team !== team || rook.team !== team || king.moved || rook.moved) {
      return false;
    }
    
    // Check if king is in check
    if (this.isKingInCheck(board, team)) {
      return false;
    }
    
    // Check if squares between king and rook are empty and not under attack
    const start = Math.min(kingCol, rookCol) + 1;
    const end = Math.max(kingCol, rookCol);
    const opponentTeam = team === 'birds' ? 'pigs' : 'birds';
    
    for (let col = start; col < end; col++) {
      // Square must be empty
      if (board[kingRow][col] !== null) {
        return false;
      }
      
      // King's path squares must not be under attack
      if (Math.abs(col - kingCol) <= 2) {
        if (this.isPositionUnderAttack(board, kingRow, col, opponentTeam)) {
          return false;
        }
      }
    }
    
    return true;
  }

  // Check for en passant possibility
  canEnPassant(board, fromRow, fromCol, toRow, toCol, lastMove) {
    const piece = board[fromRow][fromCol];
    if (!piece || piece.type !== 'pawn' || !lastMove) return false;
    
    // Check if last move was a double pawn move
    if (lastMove.piece !== 'pawn' || Math.abs(lastMove.toRow - lastMove.fromRow) !== 2) {
      return false;
    }
    
    // Check if the target pawn is adjacent
    if (Math.abs(fromCol - lastMove.toCol) !== 1 || fromRow !== lastMove.toRow) {
      return false;
    }
    
    // Check if moving to the square the pawn passed through
    const expectedRow = piece.team === 'birds' ? fromRow - 1 : fromRow + 1;
    return toRow === expectedRow && toCol === lastMove.toCol;
  }

  // Check for pawn promotion
  isPawnPromotion(board, fromRow, fromCol, toRow) {
    const piece = board[fromRow][fromCol];
    if (!piece || piece.type !== 'pawn') return false;
    
    // Birds promote on row 0, Pigs promote on row 7
    return (piece.team === 'birds' && toRow === 0) || (piece.team === 'pigs' && toRow === 7);
  }

  // Check for insufficient material (automatic draw)
  hasInsufficientMaterial(board) {
    const pieces = { birds: [], pigs: [] };
    
    // Collect all pieces
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const piece = board[row][col];
        if (piece) {
          pieces[piece.team].push({...piece, row, col});
        }
      }
    }
    
    // Check various insufficient material scenarios
    for (const team of ['birds', 'pigs']) {
      const teamPieces = pieces[team];
      const otherTeam = team === 'birds' ? 'pigs' : 'birds';
      const otherPieces = pieces[otherTeam];
      
      // King vs King
      if (teamPieces.length === 1 && otherPieces.length === 1) {
        return true;
      }
      
      // King vs King + Bishop/Knight
      if (teamPieces.length === 1 && otherPieces.length === 2) {
        const nonKingPiece = otherPieces.find(p => p.type !== 'king');
        if (nonKingPiece && (nonKingPiece.type === 'bishop' || nonKingPiece.type === 'knight')) {
          return true;
        }
      }
      
      // King + Bishop vs King + Bishop (same color squares)
      if (teamPieces.length === 2 && otherPieces.length === 2) {
        const teamBishop = teamPieces.find(p => p.type === 'bishop');
        const otherBishop = otherPieces.find(p => p.type === 'bishop');
        
        if (teamBishop && otherBishop) {
          const teamSquareColor = (teamBishop.row + teamBishop.col) % 2;
          const otherSquareColor = (otherBishop.row + otherBishop.col) % 2;
          
          if (teamSquareColor === otherSquareColor) {
            return true;
          }
        }
      }
    }
    
    return false;
  }

  // Check for threefold repetition
  isThreefoldRepetition(positionHistory) {
    if (positionHistory.length < 6) return false; // Need at least 3 positions to repeat
    
    const currentPosition = positionHistory[positionHistory.length - 1];
    let repetitionCount = 0;
    
    // Check the last positions (only check positions with same player to move)
    for (let i = positionHistory.length - 3; i >= 0; i -= 2) {
      if (this.positionsEqual(currentPosition, positionHistory[i])) {
        repetitionCount++;
        if (repetitionCount >= 2) { // Current position + 2 repetitions = 3 total
          return true;
        }
      }
    }
    
    return false;
  }

  // Check if two positions are equal (for repetition detection)
  positionsEqual(pos1, pos2) {
    if (pos1.currentPlayer !== pos2.currentPlayer) return false;
    
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const piece1 = pos1.board[row][col];
        const piece2 = pos2.board[row][col];
        
        if ((piece1 === null) !== (piece2 === null)) return false;
        if (piece1 && piece2) {
          if (piece1.type !== piece2.type || piece1.team !== piece2.team || 
              piece1.moved !== piece2.moved) {
            return false;
          }
        }
      }
    }
    
    return true;
  }

  // Check for 50-move rule
  isFiftyMoveRule(moveHistory) {
    if (moveHistory.length < 100) return false; // Need at least 50 moves for each side
    
    // Check the last 100 half-moves (50 full moves)
    const last100Moves = moveHistory.slice(-100);
    
    for (const move of last100Moves) {
      // If there was a pawn move or capture, reset the counter
      if (move.piece === 'pawn' || move.captured) {
        return false;
      }
    }
    
    return true;
  }

  // Enhanced move validation with special rules
  isValidMoveWithSpecialRules(board, fromRow, fromCol, toRow, toCol, lastMove, gameState) {
    const piece = board[fromRow][fromCol];
    if (!piece) return { valid: false };
    
    // Check basic move validity first
    if (this.isValidMove(board, fromRow, fromCol, toRow, toCol)) {
      // Check for pawn promotion
      if (piece.type === 'pawn') {
        const promotionRow = piece.team === 'birds' ? 0 : 7;
        if (toRow === promotionRow) {
          return { valid: true, special: 'promotion' };
        }
      }
      
      return { valid: true };
    }
    
    // If basic move is invalid, check for special moves
    
    // Castling - ONLY allow specific castling destinations
    if (piece.type === 'king' && fromRow === toRow) {
      // Kingside castling: King moves from column 4 to column 6
      if (fromCol === 4 && toCol === 6) {
        if (this.canCastle(board, piece.team, 'kingside')) {
          return { valid: true, special: 'castleKingside' };
        }
      }
      // Queenside castling: King moves from column 4 to column 2
      else if (fromCol === 4 && toCol === 2) {
        if (this.canCastle(board, piece.team, 'queenside')) {
          return { valid: true, special: 'castleQueenside' };
        }
      }
    }
    
    // En passant
    if (piece.type === 'pawn' && Math.abs(toCol - fromCol) === 1 && !board[toRow][toCol]) {
      if (this.canEnPassant(board, fromRow, fromCol, toRow, toCol, lastMove)) {
        return { valid: true, special: 'enPassant' };
      }
    }
    
    return { valid: false };
  }
}
