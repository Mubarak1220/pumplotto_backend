const cron = require('node-cron');
const gameService = require('./gameService');
const drawService = require('./drawService');

class Scheduler {
    constructor(io) {
        this.io = io;
        this.gameCreationJob = null;
    }
    
    start() {
        console.log('Starting scheduler...');
        
        // Create new game based on configured duration and handle draws
        const gameDurationMinutes = parseInt(process.env.GAME_DURATION_MINUTES) || 20;
        const cronPattern = `*/${gameDurationMinutes} * * * *`;
        
        console.log(`Scheduler will run every ${gameDurationMinutes} minutes with pattern: ${cronPattern}`);
        
        this.gameCreationJob = cron.schedule(cronPattern, async () => {
            try {
                console.log('Scheduler cycle starting...');
                
                // 1. First, complete any pending draws from expired games
                const expiredGames = await gameService.getExpiredGames();
                for (const game of expiredGames) {
                    console.log(`Processing expired game: ${game.game_id}`);
                    await this.executeGameDraw(game.game_id);
                }
                
                // 2. Then create new game
                console.log('Creating new game...');
                const newGame = await gameService.createNewGame();
                
                // 3. Emit new game started event
                this.io.emit('new_game_started', {
                    end_time: newGame.end_time.toISOString()
                });
                
                console.log(`New game created: ${newGame.game_id}, ends at ${newGame.end_time}`);
                console.log('Scheduler cycle completed');
            } catch (error) {
                console.error('Error in scheduler cycle:', error);
            }
        });
        
        console.log('Scheduler started');
    }
    
    stop() {
        console.log('Stopping scheduler...');
        
        try {
            if (this.gameCreationJob) {
                this.gameCreationJob.destroy();
                this.gameCreationJob = null;
            }
        } catch (error) {
            console.error('Error stopping scheduler:', error);
        }
        
        console.log('Scheduler stopped');
    }
    
    async executeGameDraw(gameId) {
        try {
            console.log(`Executing draw for game ${gameId}`);
            
            const drawResult = await drawService.executeDrawForGame(gameId);
            
            // Emit winner declared event
            this.io.emit('winner_declared', {
                winner: drawResult.winner,
                shortlist: drawResult.shortlist
            });
            
            console.log(`Draw completed for game ${gameId}, winner: ${drawResult.winner}`);
        } catch (error) {
            console.error(`Error executing draw for game ${gameId}:`, error);
        }
    }
    
    async createInitialGame() {
        // Create initial game if no running game exists
        const currentGame = await gameService.getCurrentGame();
        if (!currentGame) {
            console.log('No running game found, creating initial game...');
            const newGame = await gameService.createNewGame();
            
            // No need to schedule draw - it will be handled by the next cron cycle
            
            console.log(`Initial game created: ${newGame.game_id}`);
            return newGame;
        }
        
        // Check if current game has expired and needs drawing
        const now = new Date();
        if (currentGame.end_time <= now && currentGame.status === 'running') {
            console.log(`Found expired game ${currentGame.game_id}, executing draw...`);
            await this.executeGameDraw(currentGame.game_id);
        }
        
        return currentGame;
    }
}

module.exports = Scheduler;