import { ChessAI } from './ChessAI.js';

export class NightmareAI extends ChessAI {
  constructor() {
    super('nightmare');
    this.transpositionTable = new Map(); // For caching positions
  }

  // Nightmare AI: Maximum strength with deep search and advanced tactics
  async calculateBestMove(board) {
    const allPossibleMoves = this.getAllPossibleMoves(board, 'pigs');
    
    if (allPossibleMoves.length === 0) return null;

    // Clear transposition table periodically to prevent memory issues
    if (this.transpositionTable.size > 10000) {
      this.transpositionTable.clear();
    }

    // Use iterative deepening with deeper search
    let bestMove = null;
    let bestValue = -Infinity;

    // Start with captures and tactical moves for better move ordering
    const orderedMoves = this.orderMoves(board, allPossibleMoves);

    // Process moves asynchronously to prevent UI freeze
    let moveIndex = 0;
    const processMoveBatch = async () => {
      const batchSize = Math.max(1, Math.ceil(orderedMoves.length / 10)); // Process in batches
      const endIndex = Math.min(moveIndex + batchSize, orderedMoves.length);
      
      for (let i = moveIndex; i < endIndex; i++) {
        const move = orderedMoves[i];
        const value = await this.alphaBetaWithDepthAsync(board, move, 2, -Infinity, Infinity, false); // Reduced depth to 2
        if (value > bestValue) {
          bestValue = value;
          bestMove = move;
        }
      }
      
      moveIndex = endIndex;
      
      if (moveIndex < orderedMoves.length) {
        // Yield control to browser before processing next batch
        await new Promise(resolve => setTimeout(resolve, 0));
        return await processMoveBatch();
      }
      
      return bestMove;
    };

    return await processMoveBatch();
  }

  // Advanced move ordering for better alpha-beta pruning
  orderMoves(board, moves) {
    return moves.map(move => ({
      ...move,
      priority: this.getMovePriority(board, move)
    }))
    .sort((a, b) => b.priority - a.priority)
    .map(move => ({ fromRow: move.fromRow, fromCol: move.fromCol, toRow: move.toRow, toCol: move.toCol, piece: move.piece }));
  }

  getMovePriority(board, move) {
    let priority = 0;
    const targetPiece = board[move.toRow][move.toCol];
    
    // Prioritize captures
    if (targetPiece) {
      priority += this.pieceValues[targetPiece.type];
      
      // MVV-LVA (Most Valuable Victim - Least Valuable Attacker)
      const attackerValue = this.pieceValues[move.piece];
      priority += (this.pieceValues[targetPiece.type] - attackerValue) * 0.1;
    }
    
    // Prioritize checks
    const tempBoard = this.makeTemporaryMove(board, move);
    if (this.isKingInCheck(tempBoard, 'birds')) {
      priority += 50;
    }
    
    // Prioritize center control
    const centerSquares = [[3,3], [3,4], [4,3], [4,4]];
    if (centerSquares.some(([r, c]) => r === move.toRow && c === move.toCol)) {
      priority += 10;
    }
    
    return priority;
  }

  // Enhanced minimax with transposition table (async version to prevent UI freeze)
  async alphaBetaWithDepthAsync(board, move, depth, alpha, beta, isMaximizing, nodeCount = 0) {
    const tempBoard = this.makeTemporaryMove(board, move);
    const boardKey = this.getBoardHash(tempBoard);
    
    // Yield control periodically to prevent UI freeze
    if (nodeCount % 100 === 0) {
      await new Promise(resolve => setTimeout(resolve, 0));
    }
    
    // Check transposition table
    if (this.transpositionTable.has(boardKey)) {
      const cached = this.transpositionTable.get(boardKey);
      if (cached.depth >= depth) {
        return cached.value;
      }
    }
    
    // Base case
    if (depth === 0) {
      const value = this.evaluatePositionAdvanced(tempBoard, 'pigs');
      this.transpositionTable.set(boardKey, { value, depth });
      return value;
    }

    const currentTeam = isMaximizing ? 'pigs' : 'birds';
    const possibleMoves = this.getAllPossibleMoves(tempBoard, currentTeam);

    if (possibleMoves.length === 0) {
      let value = 0;
      if (this.isKingInCheck(tempBoard, currentTeam)) {
        value = isMaximizing ? -10000 + depth : 10000 - depth; // Prefer longer mates when losing, shorter when winning
      }
      this.transpositionTable.set(boardKey, { value, depth });
      return value;
    }

    // Order moves for better pruning (limit move ordering for performance)
    const orderedMoves = possibleMoves.length > 20 ? 
      possibleMoves.slice(0, 20) : // Limit to top 20 moves for performance
      this.orderMoves(tempBoard, possibleMoves);

    if (isMaximizing) {
      let maxValue = -Infinity;
      for (const nextMove of orderedMoves) {
        const value = await this.alphaBetaWithDepthAsync(tempBoard, nextMove, depth - 1, alpha, beta, false, nodeCount + 1);
        maxValue = Math.max(maxValue, value);
        alpha = Math.max(alpha, value);
        if (beta <= alpha) break; // Alpha-beta pruning
      }
      this.transpositionTable.set(boardKey, { value: maxValue, depth });
      return maxValue;
    } else {
      let minValue = Infinity;
      for (const nextMove of orderedMoves) {
        const value = await this.alphaBetaWithDepthAsync(tempBoard, nextMove, depth - 1, alpha, beta, true, nodeCount + 1);
        minValue = Math.min(minValue, value);
        beta = Math.min(beta, value);
        if (beta <= alpha) break; // Alpha-beta pruning
      }
      this.transpositionTable.set(boardKey, { value: minValue, depth });
      return minValue;
    }
  }

  // Enhanced minimax with transposition table (original synchronous version for reference)
  alphaBetaWithDepth(board, move, depth, alpha, beta, isMaximizing) {
    const tempBoard = this.makeTemporaryMove(board, move);
    const boardKey = this.getBoardHash(tempBoard);
    
    // Check transposition table
    if (this.transpositionTable.has(boardKey)) {
      const cached = this.transpositionTable.get(boardKey);
      if (cached.depth >= depth) {
        return cached.value;
      }
    }
    
    // Base case
    if (depth === 0) {
      const value = this.evaluatePositionAdvanced(tempBoard, 'pigs');
      this.transpositionTable.set(boardKey, { value, depth });
      return value;
    }

    const currentTeam = isMaximizing ? 'pigs' : 'birds';
    const possibleMoves = this.getAllPossibleMoves(tempBoard, currentTeam);

    if (possibleMoves.length === 0) {
      let value = 0;
      if (this.isKingInCheck(tempBoard, currentTeam)) {
        value = isMaximizing ? -10000 + depth : 10000 - depth; // Prefer longer mates when losing, shorter when winning
      }
      this.transpositionTable.set(boardKey, { value, depth });
      return value;
    }

    // Order moves for better pruning
    const orderedMoves = this.orderMoves(tempBoard, possibleMoves);

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

  // Enhanced position evaluation (optimized for performance)
  evaluatePositionAdvanced(board, team) {
    let value = 0;
    
    // Quick material count first
    let myMaterial = 0;
    let opponentMaterial = 0;
    
    // Material and basic positional evaluation (optimized loop)
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const piece = board[row][col];
        if (piece) {
          const pieceValue = this.pieceValues[piece.type] || 0;
          if (piece.team === team) {
            myMaterial += pieceValue;
            value += pieceValue + this.getBasicPositionValue(piece.type, row, col, team);
          } else {
            opponentMaterial += pieceValue;
            value -= (pieceValue + this.getBasicPositionValue(piece.type, row, col, piece.team));
          }
        }
      }
    }

    // Only do expensive evaluations if the position is close
    const materialDifference = Math.abs(myMaterial - opponentMaterial);
    if (materialDifference < 300) { // Only if position is relatively equal
      // Advanced strategic factors (reduced intensity)
      const gamePhase = this.getGamePhase(board);
      value += this.evaluateKingSafetyAdvanced(board, team, gamePhase) * 2; // Reduced multiplier
      value += this.evaluateControlOfCenter(board, team);
      
      // Only do the most expensive evaluations occasionally
      if (Math.random() < 0.3) { // 30% chance to do full evaluation
        value += this.evaluatePawnStructureAdvanced(board, team);
        value += this.evaluateThreats(board, team);
      }
    }

    // Always check for checkmate/check (important)
    const opponentTeam = team === 'pigs' ? 'birds' : 'pigs';
    if (this.isKingInCheck(board, opponentTeam)) {
      if (this.isCheckmate(board, opponentTeam)) {
        value += 10000;
      } else {
        value += 100; // Reduced bonus for check
      }
    }
    
    return value;
  }

  // Simplified position value calculation
  getBasicPositionValue(pieceType, row, col, team) {
    let value = 0;
    
    switch (pieceType) {
      case 'pawn':
        // Simple advancement bonus
        const advancement = team === 'pigs' ? row : (7 - row);
        value += advancement * 10;
        break;
      case 'knight':
      case 'bishop':
        // Simple center bonus
        const centerDistance = Math.abs(3.5 - row) + Math.abs(3.5 - col);
        value += (7 - centerDistance) * 5;
        break;
      case 'king':
        // Keep king safe early, active late
        if (row === 0 || row === 7) {
          value += 10; // Slight bonus for back rank
        }
        break;
      default:
        break;
    }
    
    return value;
  }

  evaluatePieceNightmare(board, row, col) {
    const piece = board[row][col];
    if (!piece) return 0;

    let value = this.pieceValues[piece.type] || 0;

    // Game phase considerations
    const gamePhase = this.getGamePhase(board);
    
    // Enhanced piece-specific evaluation
    switch (piece.type) {
      case 'pawn':
        value += this.evaluatePawnNightmare(board, row, col, gamePhase);
        break;
      case 'knight':
        value += this.evaluateKnightNightmare(board, row, col, gamePhase);
        break;
      case 'bishop':
        value += this.evaluateBishopNightmare(board, row, col, gamePhase);
        break;
      case 'rook':
        value += this.evaluateRookNightmare(board, row, col, gamePhase);
        break;
      case 'queen':
        value += this.evaluateQueenNightmare(board, row, col, gamePhase);
        break;
      case 'king':
        value += this.evaluateKingNightmare(board, row, col, gamePhase);
        break;
      default:
        // Unknown piece type, no additional evaluation
        break;
    }

    return value;
  }

  getGamePhase(board) {
    // Count material to determine game phase
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

  evaluatePawnNightmare(board, row, col, gamePhase) {
    const piece = board[row][col];
    let value = 0;

    // Advanced pawn evaluation
    const advancement = piece.team === 'pigs' ? row : (7 - row);
    value += advancement * 20;

    // Passed pawn bonus (stronger in endgame)
    if (this.isPassedPawn(board, row, col)) {
      value += gamePhase === 'endgame' ? 100 : 50;
    }

    // Pawn chain bonus
    if (this.isInPawnChain(board, row, col)) {
      value += 15;
    }

    // Weakness penalties
    if (this.isDoubledPawn(board, row, col)) value -= 25;
    if (this.isIsolatedPawn(board, row, col)) value -= 30;
    if (this.isBackwardPawn(board, row, col)) value -= 20;

    return value;
  }

  evaluateThreats(board, team) {
    let value = 0;
    const opponentTeam = team === 'pigs' ? 'birds' : 'pigs';
    
    // Look for undefended pieces
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const piece = board[row][col];
        if (piece && piece.team === opponentTeam) {
          if (this.isPositionUnderAttack(board, row, col, team) && 
              !this.isPositionUnderAttack(board, row, col, opponentTeam)) {
            value += this.pieceValues[piece.type] * 0.5; // Half value for threatened pieces
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
            const hangingValue = this.pieceValues[piece.type] * 0.8;
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

  evaluatePieceCoordination(board, team) {
    let value = 0;
    
    // Bonus for pieces defending each other
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const piece = board[row][col];
        if (piece && piece.team === team) {
          const defenders = this.countAttackers(board, row, col, team);
          value += defenders * 5;
        }
      }
    }
    
    return value;
  }

  // Additional helper methods for nightmare evaluation
  isInPawnChain(board, row, col) {
    const piece = board[row][col];
    if (piece.type !== 'pawn') return false;
    
    const direction = piece.team === 'pigs' ? -1 : 1;
    const supportRow = row + direction;
    
    for (let c = col - 1; c <= col + 1; c += 2) {
      if (c >= 0 && c < 8 && supportRow >= 0 && supportRow < 8) {
        const supportPiece = board[supportRow][c];
        if (supportPiece && supportPiece.type === 'pawn' && supportPiece.team === piece.team) {
          return true;
        }
      }
    }
    
    return false;
  }

  isIsolatedPawn(board, row, col) {
    const piece = board[row][col];
    if (piece.type !== 'pawn') return false;
    
    for (let c = col - 1; c <= col + 1; c += 2) {
      if (c >= 0 && c < 8) {
        for (let r = 0; r < 8; r++) {
          const checkPiece = board[r][c];
          if (checkPiece && checkPiece.type === 'pawn' && checkPiece.team === piece.team) {
            return false;
          }
        }
      }
    }
    
    return true;
  }

  isBackwardPawn(board, row, col) {
    const piece = board[row][col];
    if (piece.type !== 'pawn') return false;
    
    // Simplified backward pawn detection
    const direction = piece.team === 'pigs' ? 1 : -1;
    const nextRow = row + direction;
    
    if (nextRow >= 0 && nextRow < 8) {
      // Check if square in front is controlled by opponent
      const opponentTeam = piece.team === 'pigs' ? 'birds' : 'pigs';
      if (this.isPositionUnderAttack(board, nextRow, col, opponentTeam)) {
        // Check if this pawn can't be supported by friendly pawns
        for (let c = col - 1; c <= col + 1; c += 2) {
          if (c >= 0 && c < 8) {
            for (let r = row - direction; r >= 0 && r < 8; r -= direction) {
              const supportPiece = board[r][c];
              if (supportPiece && supportPiece.type === 'pawn' && supportPiece.team === piece.team) {
                return false; // Can be supported
              }
            }
          }
        }
        return true;
      }
    }
    
    return false;
  }

  // Simple board hash for transposition table
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

  // Enhanced evaluation methods (simplified versions of the other methods)
  evaluateKnightNightmare(board, row, col, gamePhase) {
    let value = 0;
    const centerDistance = Math.abs(3.5 - row) + Math.abs(3.5 - col);
    value += (7 - centerDistance) * 10;
    
    // Knights are better in closed positions
    const mobility = this.getAllValidMoves(board, row, col).length;
    value += mobility * 3;
    
    return value;
  }

  evaluateBishopNightmare(board, row, col, gamePhase) {
    let value = 0;
    const mobility = this.getAllValidMoves(board, row, col).length;
    value += mobility * 6;
    
    // Bishop pair bonus (simplified)
    value += 25; // Assume bishop pair bonus
    
    return value;
  }

  evaluateRookNightmare(board, row, col, gamePhase) {
    let value = 0;
    const mobility = this.getAllValidMoves(board, row, col).length;
    value += mobility * 4;
    
    if (this.isOnOpenFile(board, col)) {
      value += 40;
    }
    
    // Rook on 7th rank bonus
    const piece = board[row][col];
    const seventhRank = piece.team === 'pigs' ? 6 : 1;
    if (row === seventhRank) {
      value += 30;
    }
    
    return value;
  }

  evaluateQueenNightmare(board, row, col, gamePhase) {
    const mobility = this.getAllValidMoves(board, row, col).length;
    let value = mobility * 3;
    
    // Don't develop queen too early
    if (gamePhase === 'opening' && (row !== 0 && row !== 7)) {
      value -= 20;
    }
    
    return value;
  }

  evaluateKingNightmare(board, row, col, gamePhase) {
    let value = 0;
    
    if (gamePhase === 'endgame') {
      // King activity in endgame
      const centerDistance = Math.abs(3.5 - row) + Math.abs(3.5 - col);
      value += (7 - centerDistance) * 15;
    } else {
      // King safety in opening/middlegame
      const piece = board[row][col];
      const backRank = piece.team === 'pigs' ? 0 : 7;
      if (row === backRank) {
        value += 20; // Stay on back rank
      } else {
        value -= 50; // Penalty for exposed king
      }
    }
    
    return value;
  }

  evaluateKingSafetyAdvanced(board, team, gamePhase) {
    if (gamePhase === 'endgame') return 0; // King safety less important in endgame
    
    const kingPos = this.findKing(board, team);
    if (!kingPos) return -1000;

    let safety = 0;
    
    // Detailed king safety evaluation
    const opponentTeam = team === 'pigs' ? 'birds' : 'pigs';
    
    // Count attackers near king
    for (let r = kingPos.row - 2; r <= kingPos.row + 2; r++) {
      for (let c = kingPos.col - 2; c <= kingPos.col + 2; c++) {
        if (r >= 0 && r < 8 && c >= 0 && c < 8) {
          if (this.isPositionUnderAttack(board, r, c, opponentTeam)) {
            const distance = Math.abs(r - kingPos.row) + Math.abs(c - kingPos.col);
            safety -= (3 - distance) * 15;
          }
        }
      }
    }
    
    // Pawn shield
    const pawnShield = this.countPawnShield(board, kingPos.row, kingPos.col, team);
    safety += pawnShield * 25;
    
    return safety;
  }

  evaluatePawnStructureAdvanced(board, team) {
    let value = 0;
    
    // More detailed pawn structure evaluation
    for (let col = 0; col < 8; col++) {
      const pawns = this.getPawnsInFile(board, col, team);
      
      if (pawns.length === 0) continue;
      
      // Doubled pawns
      if (pawns.length > 1) {
        value -= 30 * (pawns.length - 1);
      }
      
      // Isolated pawns
      if (this.isIsolatedFile(board, col, team)) {
        value -= 35 * pawns.length;
      }
      
      // Passed pawns
      pawns.forEach(pawnRow => {
        if (this.isPassedPawn(board, pawnRow, col)) {
          const advancement = team === 'pigs' ? pawnRow : (7 - pawnRow);
          value += 50 + advancement * 20;
        }
      });
    }
    
    return value;
  }

  // Missing helper methods that the Nightmare AI needs
  isPassedPawn(board, row, col) {
    const piece = board[row][col];
    if (!piece || piece.type !== 'pawn') return false;
    
    const direction = piece.team === 'pigs' ? 1 : -1;
    const opponentTeam = piece.team === 'pigs' ? 'birds' : 'pigs';
    
    // Check if there are any opponent pawns that can block or attack this pawn
    for (let checkCol = col - 1; checkCol <= col + 1; checkCol++) {
      if (checkCol >= 0 && checkCol < 8) {
        for (let checkRow = row + direction; checkRow >= 0 && checkRow < 8; checkRow += direction) {
          const checkPiece = board[checkRow][checkCol];
          if (checkPiece && checkPiece.type === 'pawn' && checkPiece.team === opponentTeam) {
            return false; // Not passed
          }
        }
      }
    }
    
    return true;
  }

  isDoubledPawn(board, row, col) {
    const piece = board[row][col];
    if (!piece || piece.type !== 'pawn') return false;
    
    // Check if there's another pawn of the same team in this file
    for (let r = 0; r < 8; r++) {
      if (r !== row) {
        const checkPiece = board[r][col];
        if (checkPiece && checkPiece.type === 'pawn' && checkPiece.team === piece.team) {
          return true;
        }
      }
    }
    
    return false;
  }

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
    // Check if there are any pawns on this file
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
    const direction = team === 'pigs' ? -1 : 1; // Direction towards own side
    
    // Check squares in front of king
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
    // Check if there are any friendly pawns in adjacent files
    for (let checkCol = col - 1; checkCol <= col + 1; checkCol += 2) {
      if (checkCol >= 0 && checkCol < 8) {
        for (let row = 0; row < 8; row++) {
          const piece = board[row][checkCol];
          if (piece && piece.type === 'pawn' && piece.team === team) {
            return false; // Not isolated
          }
        }
      }
    }
    
    return true; // Isolated
  }

  evaluateControlOfCenter(board, team) {
    let value = 0;
    const centerSquares = [[3,3], [3,4], [4,3], [4,4]];
    const extendedCenter = [[2,2], [2,3], [2,4], [2,5], [3,2], [3,5], [4,2], [4,5], [5,2], [5,3], [5,4], [5,5]];
    
    // Check control of center squares
    centerSquares.forEach(([row, col]) => {
      if (this.isPositionUnderAttack(board, row, col, team)) {
        value += 20;
      }
      
      const piece = board[row][col];
      if (piece && piece.team === team) {
        value += 30; // Bonus for occupying center
      }
    });
    
    // Check control of extended center
    extendedCenter.forEach(([row, col]) => {
      if (this.isPositionUnderAttack(board, row, col, team)) {
        value += 5;
      }
    });
    
    return value;
  }

  // Nightmare AI takes time to think but doesn't freeze the UI
  async makeMove(board, onMoveComplete) {
    console.log('🔥 Nightmare AI is thinking... (this may take a moment)');
    const startTime = Date.now();
    
    try {
      // Add a small initial delay for dramatic effect
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const move = await this.calculateBestMove(board);
      const thinkingTime = Date.now() - startTime;
      
      console.log(`🧠 Nightmare AI calculated move in ${thinkingTime}ms:`, move);
      
      if (move) {
        // Add a minimum thinking time for dramatic effect (but not too long)
        const minThinkingTime = 2000; // 2 seconds minimum
        const remainingTime = Math.max(0, minThinkingTime - thinkingTime);
        
        setTimeout(() => {
          onMoveComplete(move);
        }, remainingTime);
      } else {
        console.error('🔥 Nightmare AI could not find a valid move!');
        onMoveComplete(null);
      }
    } catch (error) {
      console.error('🔥 Nightmare AI encountered an error:', error);
      onMoveComplete(null);
    }
  }
}
