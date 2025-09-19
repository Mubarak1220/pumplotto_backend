const db = require('../database/connection');

class ParticipantService {
    async addParticipant(gameId, walletAddress, transactionSig, solAmount) {
        try {
            // Add participant
            const [result] = await db.execute(
                'INSERT INTO participants (game_id, wallet_address, transaction_sig, sol_amount) VALUES (?, ?, ?, ?)',
                [gameId, walletAddress, transactionSig, solAmount]
            );
            
            // Update game volume and prize pool
            await this.updateGameVolume(gameId, solAmount);
            
            return {
                entry_id: result.insertId,
                game_id: gameId,
                wallet_address: walletAddress,
                transaction_sig: transactionSig,
                sol_amount: solAmount
            };
        } catch (error) {
            if (error.code === 'ER_DUP_ENTRY') {
                throw new Error('Transaction already exists');
            }
            throw error;
        }
    }
    
    async updateGameVolume(gameId, solAmount) {
        // Calculate prize pool: 10% of 1% = 0.1% of total volume
        const prizePercentage = 0.001; // 0.1%
        const prizeAddition = solAmount * prizePercentage;
        
        await db.execute(
            'UPDATE games SET total_volume = total_volume + ?, prize_pool = prize_pool + ? WHERE game_id = ?',
            [solAmount, prizeAddition, gameId]
        );
    }
    
    async getParticipantsByGameId(gameId) {
        const [rows] = await db.execute(
            'SELECT wallet_address, sol_amount FROM participants WHERE game_id = ?',
            [gameId]
        );
        
        return rows;
    }
    
    async getParticipantAddressesByGameId(gameId) {
        const [rows] = await db.execute(
            'SELECT wallet_address FROM participants WHERE game_id = ?',
            [gameId]
        );
        
        return rows.map(row => row.wallet_address);
    }
    
    async transactionExists(transactionSig) {
        const [rows] = await db.execute(
            'SELECT COUNT(*) as count FROM participants WHERE transaction_sig = ?',
            [transactionSig]
        );
        
        return rows[0].count > 0;
    }
}

module.exports = new ParticipantService();