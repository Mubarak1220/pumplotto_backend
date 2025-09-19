const db = require('../database/connection');

class GameService {
    async createNewGame() {
        const startTime = new Date();
        const gameDurationMinutes = parseInt(process.env.GAME_DURATION_MINUTES) || 20;
        const endTime = new Date(startTime.getTime() + gameDurationMinutes * 60 * 1000);
        
        const [result] = await db.execute(
            'INSERT INTO games (start_time, end_time, status) VALUES (?, ?, ?)',
            [startTime, endTime, 'running']
        );
        
        return {
            game_id: result.insertId,
            start_time: startTime,
            end_time: endTime,
            status: 'running'
        };
    }
    
    async getCurrentGame() {
        const [rows] = await db.execute(
            'SELECT * FROM games WHERE status = ? ORDER BY start_time DESC LIMIT 1',
            ['running']
        );
        
        return rows[0] || null;
    }
    
    async getGameById(gameId) {
        const [rows] = await db.execute(
            'SELECT * FROM games WHERE game_id = ?',
            [gameId]
        );
        
        return rows[0] || null;
    }
    
    async getExpiredGames() {
        const now = new Date();
        const [rows] = await db.execute(
            'SELECT * FROM games WHERE status = ? AND end_time < ?',
            ['running', now]
        );
        
        return rows;
    }
    
    async completeGame(gameId, winnerAddress, drawShortlist, totalParticipants) {
        await db.execute(
            'UPDATE games SET status = ?, winner_address = ?, draw_shortlist = ? WHERE game_id = ?',
            ['completed', winnerAddress, JSON.stringify(drawShortlist), gameId]
        );
        
        // Also store in winners table for better tracking
        if (winnerAddress) {
            await db.execute(
                'INSERT INTO winners (game_id, wallet_address, total_participants, shortlist_size) VALUES (?, ?, ?, ?)',
                [gameId, winnerAddress, totalParticipants, drawShortlist.length]
            );
        }
    }
    
    async getRecentWinners() {
        const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
        const [rows] = await db.execute(
            `SELECT 
                w.wallet_address as winner_address,
                g.start_time,
                w.won_at,
                w.total_participants,
                w.shortlist_size,
                g.game_id,
                g.prize_pool,
                g.total_volume
            FROM winners w 
            JOIN games g ON w.game_id = g.game_id 
            WHERE w.won_at > ? 
            ORDER BY w.won_at DESC`,
            [twentyFourHoursAgo]
        );
        
        return rows;
    }
    
    async getAllWinners(limit = 100) {
        const [rows] = await db.execute(
            `SELECT 
                w.wallet_address as winner_address,
                g.start_time,
                w.won_at,
                w.total_participants,
                w.shortlist_size,
                g.game_id
            FROM winners w 
            JOIN games g ON w.game_id = g.game_id 
            ORDER BY w.won_at DESC 
            LIMIT ?`,
            [limit]
        );
        
        return rows;
    }
    
    async getWinnerStats(walletAddress) {
        const [rows] = await db.execute(
            `SELECT 
                COUNT(*) as total_wins,
                MIN(won_at) as first_win,
                MAX(won_at) as latest_win
            FROM winners 
            WHERE wallet_address = ?`,
            [walletAddress]
        );
        
        return rows[0];
    }
}

module.exports = new GameService();