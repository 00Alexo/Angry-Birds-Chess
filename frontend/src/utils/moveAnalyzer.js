// Simple move analysis similar in spirit (but far simpler) to chess.com style annotations.
// Provides evaluation, best-move comparison, and heuristic classification.

const PIECE_VALUES = {
  pawn: 1,
  knight: 3,
  bishop: 3,
  rook: 5,
  queen: 9,
  king: 0
};

function cloneBoard(board) {
  return board.map(r => r.map(p => p ? { ...p } : null));
}

function evaluatePosition(board) {
  // Positive score favors birds (player), negative favors pigs (AI)
  let score = 0;
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const piece = board[r][c];
      if (!piece) continue;
      const val = PIECE_VALUES[piece.type] || 0;
      score += piece.team === 'birds' ? val : -val;
    }
  }
  return score;
}

function applyMove(board, move) {
  const newBoard = cloneBoard(board);
  const { fromRow, fromCol, toRow, toCol, special, promotionType } = move;
  const piece = newBoard[fromRow][fromCol];
  if (!piece) return newBoard;
  // Basic handling (no full special nuance besides promotion & castling minimal)
  if (special === 'castleKingside' || special === 'castleQueenside' || special === 'castle') {
    // Mirror logic from executeMove (simplified)
    const rookFromCol = toCol > fromCol ? 7 : 0;
    const rookToCol = toCol > fromCol ? 5 : 3;
    newBoard[toRow][toCol] = { ...piece, moved: true };
    newBoard[fromRow][fromCol] = null;
    const rook = newBoard[fromRow][rookFromCol];
    if (rook) {
      newBoard[fromRow][rookToCol] = { ...rook, moved: true };
      newBoard[fromRow][rookFromCol] = null;
    }
  } else if (special === 'enPassant') {
    newBoard[toRow][toCol] = { ...piece, moved: true };
    newBoard[fromRow][fromCol] = null;
    const capturedPawnRow = piece.team === 'birds' ? toRow + 1 : toRow - 1;
    newBoard[capturedPawnRow][toCol] = null;
  } else if (special === 'promotion' || (special || '').startsWith('promotion')) {
    const type = promotionType || (special && special.split('_')[1]) || 'queen';
    newBoard[toRow][toCol] = { ...piece, type, moved: true };
    newBoard[fromRow][fromCol] = null;
  } else {
    newBoard[toRow][toCol] = { ...piece, moved: true };
    newBoard[fromRow][fromCol] = null;
  }
  return newBoard;
}

function generatePseudoMoves(aiInstance, board, side, lastMove, context) {
  if (!aiInstance) return [];
  const moves = aiInstance.getAllPossibleMoves(board, side, lastMove, context) || [];
  // Map AI move objects (which might already have needed fields) into analyzer format.
  return moves.map(m => ({
    fromRow: m.fromRow,
    fromCol: m.fromCol,
    toRow: m.toRow,
    toCol: m.toCol,
    special: m.special || m.specialMove,
    promotionType: m.promotionType
  }));
}

function classifyMove({ side, evalBefore, evalAfter, bestEval, chosenEval, piece, capturedPieceValue, improved, sacrifice, isCheckmate, deliversCheck, tacticalStrike }) {
  // Perspective normalization: eval* values are from birds perspective.
  let diff = Math.abs(bestEval - chosenEval);
  let classification = 'Good';

  // Determine advantage delta relative to best.
  if (diff < 0.02) classification = 'Best';        // Very strict for "Best"
  else if (diff < 0.15) classification = 'Excellent'; 
  else if (diff < 0.35) classification = 'Great';      
  else if (diff < 0.60) classification = 'Good';      
  else if (diff < 1.20) classification = 'Inaccuracy'; 
  else if (diff < 2.50) classification = 'Mistake';   
  else classification = 'Blunder';

  // Special cases - CHECKMATE ALWAYS OVERRIDES OTHER CLASSIFICATIONS
  // From the mover's perspective:
  const moverImproved = side === 'birds' ? (evalAfter > evalBefore + 1.0) : (evalAfter < evalBefore - 1.0);
  const massiveImprovement = side === 'birds' ? (evalAfter > evalBefore + 2.0) : (evalAfter < evalBefore - 2.0);

  // CHECKMATE DETECTION FIRST - overrides any other classification
  if (isCheckmate) {
    if (sacrifice && massiveImprovement) {
      classification = 'Brilliant'; // Sacrificial checkmate
    } else if (capturedPieceValue >= 5) {
      classification = 'Brilliant'; // Checkmate capturing major piece
    } else if (sacrifice) {
      classification = 'Excellent'; // Any sacrificial checkmate is at least Excellent
    } else {
      classification = 'Best'; // Regular checkmate is always Best minimum
    }
  }
  // Only check other brilliant criteria if not already checkmate
  else if (classification === 'Best' && sacrifice && massiveImprovement && capturedPieceValue >= 9) {
    // Perfect sacrifice of queen for massive advantage = Brilliant  
    classification = 'Brilliant';
  }

  // Missed Win: best move yields winning eval but chosen drops the advantage.
  const winningThreshold = 3.0;
  if (side === 'birds' && bestEval > winningThreshold && chosenEval < 1.5 && classification !== 'Brilliant') {
    classification = 'Missed Win';
  }
  if (side === 'pigs' && bestEval < -winningThreshold && chosenEval > -1.5 && classification !== 'Brilliant') {
    classification = 'Missed Win';
  }

  return { classification, diff };
}

function analyzeMove({ boardBefore, boardAfter, move, side, aiInstance, lastMove, context }) {
  try {
    const evalBefore = evaluatePosition(boardBefore);
    const evalAfter = evaluatePosition(boardAfter);

    // Generate and score candidate moves for side on boardBefore (1-ply search)
    const candidates = generatePseudoMoves(aiInstance, boardBefore, side, lastMove, context);

    let bestEval = side === 'birds' ? -Infinity : Infinity;
    const candidateEvaluations = [];

    for (const cand of candidates) {
      const candBoard = applyMove(boardBefore, cand);
      const candEval = evaluatePosition(candBoard);
      candidateEvaluations.push({ cand, eval: candEval });
      if (side === 'birds') {
        if (candEval > bestEval) bestEval = candEval;
      } else {
        if (candEval < bestEval) bestEval = candEval;
      }
    }

    // Chosen move evaluation (already have evalAfter)
    const chosenEval = evalAfter;

    // Material sacrifice detection (simple): if captured value > moved piece value and position still improves
    const pieceValue = PIECE_VALUES[move.piece] || 0;
    const capturedValue = PIECE_VALUES[move.captured] || 0;
    const sacrifice = capturedValue > pieceValue && (side === 'birds' ? evalAfter >= evalBefore : evalAfter <= evalBefore);

    // Additional brilliant move detection criteria
    const isCheckmate = (aiInstance && context && aiInstance.isCheckmate && 
                       aiInstance.isCheckmate(boardAfter, side === 'birds' ? 'pigs' : 'birds', lastMove, context)) ||
                       // Also check if the move results in a winning position (crude checkmate detection)
                       (side === 'birds' && evalAfter > 10) || (side === 'pigs' && evalAfter < -10);
    const deliversCheck = move.captured && capturedValue >= 3; // Major piece capture
    const tacticalStrike = move.special && (move.special.includes('promotion') || move.special.includes('castle'));

    const { classification, diff } = classifyMove({
      side,
      evalBefore,
      evalAfter,
      bestEval: candidates.length ? bestEval : evalAfter,
      chosenEval,
      piece: move.piece,
      capturedPieceValue: capturedValue,
      improved: (side === 'birds' ? evalAfter > evalBefore : evalAfter < evalBefore),
      sacrifice,
      isCheckmate,
      deliversCheck,
      tacticalStrike
    });

    return {
      evalBefore,
      evalAfter,
      bestEval: candidates.length ? bestEval : evalAfter,
      chosenEval,
      diff,
      classification,
      sacrifice
    };
  } catch (err) {
    console.warn('[Analyzer] Failed to analyze move:', err);
    return null;
  }
}

export {
  evaluatePosition,
  analyzeMove
};
