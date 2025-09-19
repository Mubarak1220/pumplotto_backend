const participantService = require('./participantService');
const gameService = require('./gameService');

class DrawService {
    async executeDrawForGame(gameId) {
        console.log(`Executing draw for game ${gameId}`);
        
        // Get all participants for this game
        const participants = await participantService.getParticipantAddressesByGameId(gameId);
        
        if (participants.length === 0) {
            console.log(`No participants found for game ${gameId}`);
            await gameService.completeGame(gameId, null, [], 0);
            return {
                winner: null,
                shortlist: []
            };
        }
        
        // Create shortlist of max 25 unique addresses
        const shortlist = this.selectShortlist(participants, 25);
        
        // Select winner from shortlist
        const winner = this.selectRandomWinner(shortlist);
        
        // Update game in database
        await gameService.completeGame(gameId, winner, shortlist, participants.length);
        
        console.log(`Game ${gameId} completed. Winner: ${winner}, Total participants: ${participants.length}`);
        
        return {
            winner,
            shortlist
        };
    }
    
    selectShortlist(participants, maxCount) {
        // Remove duplicates and shuffle
        const uniqueParticipants = [...new Set(participants)];
        const shuffled = this.shuffleArray([...uniqueParticipants]);
        
        // Return max 25 addresses
        return shuffled.slice(0, Math.min(maxCount, shuffled.length));
    }
    
    selectRandomWinner(shortlist) {
        if (shortlist.length === 0) return null;
        const randomIndex = Math.floor(Math.random() * shortlist.length);
        return shortlist[randomIndex];
    }
    
    shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    }
}

module.exports = new DrawService();