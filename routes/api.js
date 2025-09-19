const express = require('express');
const gameService = require('../services/gameService');
const participantService = require('../services/participantService');

const router = express.Router();

// GET /api/v1/gamestate - Initial game state for frontend
router.get('/v1/gamestate', async (req, res) => {
    try {
        // Get current running game
        const currentGame = await gameService.getCurrentGame();
        
        let participants = [];
        let endTime = null;
        let currentPrizePool = 0;
        let currentVolume = 0;
        
        if (currentGame) {
            // Get participants for current game
            const participantData = await participantService.getParticipantsByGameId(currentGame.game_id);
            participants = participantData.map(p => ({
                wallet_address: p.wallet_address,
                sol_amount: parseFloat(p.sol_amount)
            }));
            endTime = currentGame.end_time;
            currentPrizePool = parseFloat(currentGame.prize_pool || 0);
            currentVolume = parseFloat(currentGame.total_volume || 0);
        }
        
        // Get recent winners (last 24 hours)
        const recentWinners = await gameService.getRecentWinners();
        
        const gameState = {
            end_time: endTime ? endTime.toISOString() : null,
            participants: participants,
            current_prize_pool: currentPrizePool,
            current_volume: currentVolume,
            recent_winners: recentWinners.map(winner => ({
                winner_address: winner.winner_address,
                start_time: winner.start_time.toISOString(),
                won_at: winner.won_at.toISOString(),
                total_participants: winner.total_participants,
                shortlist_size: winner.shortlist_size,
                game_id: winner.game_id,
                prize_pool: parseFloat(winner.prize_pool || 0),
                total_volume: parseFloat(winner.total_volume || 0)
            }))
        };
        
        res.json(gameState);
        
    } catch (error) {
        console.error('Error fetching game state:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// GET /api/v1/winners - Get all winners with pagination
router.get('/v1/winners', async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 100;
        const winners = await gameService.getAllWinners(limit);
        
        res.json({
            winners: winners.map(winner => ({
                winner_address: winner.winner_address,
                game_id: winner.game_id,
                start_time: winner.start_time.toISOString(),
                won_at: winner.won_at.toISOString(),
                total_participants: winner.total_participants,
                shortlist_size: winner.shortlist_size
            }))
        });
        
    } catch (error) {
        console.error('Error fetching winners:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// GET /api/v1/winners/:address/stats - Get winner statistics for a specific address
router.get('/v1/winners/:address/stats', async (req, res) => {
    try {
        const { address } = req.params;
        const stats = await gameService.getWinnerStats(address);
        
        res.json({
            wallet_address: address,
            total_wins: stats.total_wins,
            first_win: stats.first_win ? stats.first_win.toISOString() : null,
            latest_win: stats.latest_win ? stats.latest_win.toISOString() : null
        });
        
    } catch (error) {
        console.error('Error fetching winner stats:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;