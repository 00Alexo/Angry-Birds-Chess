// Fixed version of handleMultiplayerGameEnd function
const handleMultiplayerGameEnd = async (matchId, leavingPlayerSocketId, reason) => {
  try {
    console.log(`🏁 [Multiplayer] ===== GAME END HANDLER TRIGGERED =====`);
    console.log(`🏁 [Multiplayer] matchId: ${matchId}, leavingPlayer: ${leavingPlayerSocketId}, reason: ${reason}`);
    
    const match = activeMatches.get(matchId);
    if (!match) {
      console.warn(`[Multiplayer] Match ${matchId} not found for game end - may have already ended`);
      console.log(`[Multiplayer] Available matches:`, Array.from(activeMatches.keys()));
      return;
    }
    
    // Check if game was already ended (prevent duplicate processing)
    if (match.gameEnded) {
      console.log(`⚠️ [Multiplayer] Match ${matchId} already ended, ignoring duplicate game end event`);
      return;
    }
    
    // Mark game as ended to prevent duplicate processing
    match.gameEnded = true;
    
    console.log(`🏁 [Multiplayer] Ending match ${matchId} due to ${reason}`);
    console.log(`🏁 [Multiplayer] Match details:`, {
      matchId: match.matchId,
      startTime: match.startTime,
      moveCount: match.moveCount,
      player1: match.player1?.username,
      player2: match.player2?.username
    });
    
    // Determine winner and loser
    const isPlayer1Leaving = match.player1.socketId === leavingPlayerSocketId;
    const winner = isPlayer1Leaving ? match.player2 : match.player1;
    const loser = isPlayer1Leaving ? match.player1 : match.player2;
    const winnerColor = isPlayer1Leaving ? 'black' : 'white'; // Player1 is always white
    const result = 'win'; // The leaving player loses
    
    console.log(`👑 [Multiplayer] Winner: ${winner.username} (${winner.userId})`);
    console.log(`💔 [Multiplayer] Loser: ${loser.username} (${loser.userId}) - ${reason}`);
    
    // *** USE THE RATING SERVICE INSTEAD OF OLD MANUAL SYSTEM ***
    // Save match results to database - handle cases where some players might not have userId
    if (match.player1.userId || match.player2.userId) {
      try {
        console.log(`🔧 [DEBUG] About to require User and multiplayerRatingService...`);
        const User = require('./models/User');
        const multiplayerRatingService = require('./services/multiplayerRatingService');
        console.log(`✅ [DEBUG] Successfully imported User and multiplayerRatingService`);
        
        // Create detailed game history entries for both players
        const gameId = `multiplayer_${matchId}_${Date.now()}`;
        const matchDuration = match.startTime ? Date.now() - match.startTime : 0;
        
        console.log(`⏱️ [Multiplayer] Match duration calculation: ${Date.now()} - ${match.startTime} = ${matchDuration}ms`);
        console.log(`🔧 [DEBUG] About to prepare player data...`);
        
        // Prepare player data for rating service
        const player1Data = {
          userId: match.player1.userId,
          username: match.player1.username,
          rating: match.player1.rating || 1200 // Use stored rating or default
        };
        
        const player2Data = {
          userId: match.player2.userId,
          username: match.player2.username,
          rating: match.player2.rating || 1200 // Use stored rating or default
        };
        
        // Prepare game data
        const gameData = {
          gameId,
          duration: matchDuration,
          movesPlayed: match.moveCount || 0,
          moves: match.moveHistory || [],
          coinsEarned: result === 'draw' ? 50 : 250, // Draw: 50 coins, Win: 250 coins
          energySpent: 1,
          endReason: reason,
          player1Color: 'white', // Player1 is always white
          player2Color: 'black'  // Player2 is always black
        };
        
        // Determine result format for rating service
        let ratingServiceResult;
        if (result === 'draw') {
          ratingServiceResult = 'draw';
        } else if (winnerColor === 'white') {
          ratingServiceResult = 'player1_win'; // Player1 (white) wins
        } else {
          ratingServiceResult = 'player2_win'; // Player2 (black) wins
        }
        
        console.log(`🎯 [Multiplayer] Processing ${match.gameMode} game with rating service:`);
        console.log(`🎯 [Multiplayer] Players: ${player1Data.username} (${player1Data.rating}) vs ${player2Data.username} (${player2Data.rating})`);
        console.log(`🎯 [Multiplayer] Result: ${ratingServiceResult}`);
        console.log(`🔧 [DEBUG] About to call rating service method...`);
        
        // Process game result based on game mode
        let ratingResult;
        if (match.gameMode === 'competitive') {
          console.log(`🔧 [DEBUG] Calling processCompetitiveGameResult...`);
          ratingResult = await multiplayerRatingService.processCompetitiveGameResult(
            player1Data,
            player2Data,
            ratingServiceResult,
            gameData
          );
          console.log(`✅ [Multiplayer] Competitive game processed with rating changes:`, ratingResult);
        } else {
          console.log(`🔧 [DEBUG] Calling processUnrankedGameResult...`);
          ratingResult = await multiplayerRatingService.processUnrankedGameResult(
            player1Data,
            player2Data,
            ratingServiceResult,
            gameData
          );
          console.log(`✅ [Multiplayer] Unranked game processed (no rating changes):`, ratingResult);
        }
        
        // Log final results
        console.log(`📊 [Multiplayer] Game processing completed successfully!`);
        if (ratingResult.isUpset) {
          console.log(`🎉 [Multiplayer] UPSET VICTORY! Rating changes were doubled!`);
        }
        
      } catch (error) {
        console.error('❌ [Multiplayer] Error processing game with rating service:', error);
        console.error('❌ [DEBUG] Error stack trace:', error.stack);
        console.error('❌ [DEBUG] Error name:', error.name);
        console.error('❌ [DEBUG] Error message:', error.message);
        console.log('⚠️ [DEBUG] Falling back to manual system...');
        // Fallback to old manual system if rating service fails
        await handleMultiplayerGameFallback(match, result, winnerColor, reason, matchDuration);
      }
    } else {
      console.warn('⚠️ [Multiplayer] No user IDs available - game results will not be saved');
    }
    
    // Notify both players of game end
    const gameEndData = {
      matchId,
      reason,
      winner: {
        username: winner.username,
        userId: winner.userId
      },
      loser: {
        username: loser.username,  
        userId: loser.userId,
        reason
      }
    };
    
    // Send win message to winner
    io.to(winner.socketId).emit('multiplayer:game-end', {
      ...gameEndData,
      result: 'win'
    });
    
    // Send loss message to loser (if still connected)
    io.to(loser.socketId).emit('multiplayer:game-end', {
      ...gameEndData,
      result: 'loss'
    });
    
    console.log(`📤 [Multiplayer] Game end notifications sent to both players`);
    
    // Update player statuses back to online
    const winnerOnline = onlinePlayers.get(winner.socketId);
    const loserOnline = onlinePlayers.get(loser.socketId);
    
    if (winnerOnline) {
      winnerOnline.status = 'online';
      onlinePlayers.set(winner.socketId, winnerOnline);
    }
    if (loserOnline) {
      loserOnline.status = 'online';  
      onlinePlayers.set(loser.socketId, loserOnline);
    }
    
    // Broadcast updated presence
    io.emit('multiplayer:online-players', Array.from(onlinePlayers.values()));
    
    // Clean up match
    activeMatches.delete(matchId);
    console.log(`🧹 [Multiplayer] Match ${matchId} cleaned up`);
    
  } catch (err) {
    console.error(`❌ [Multiplayer] Error ending match ${matchId}:`, err);
  }
};
