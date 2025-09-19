# Services Documentation

## Overview

The Pump Lotto backend is organized into a service-oriented architecture where each service handles a specific domain of functionality. All services are singleton instances that interact through well-defined interfaces.

## Service Layer Architecture

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│  Scheduler  │    │   Solana    │    │    Game     │
│   Service   │    │  Listener   │    │   Service   │
└──────┬──────┘    └──────┬──────┘    └──────┬──────┘
       │                  │                  │
       └────────────┬─────┴──────────────────┘
                    │
         ┌──────────▼──────────┐
         │   Participant       │
         │    Service          │
         └──────────┬──────────┘
                    │
         ┌──────────▼──────────┐
         │     Draw            │
         │    Service          │
         └─────────────────────┘
```

## Scheduler Service

**File**: `services/scheduler.js`

### Purpose
Manages the timing and lifecycle of game rounds, ensuring games start and end at precise intervals.

### Key Methods

#### `start()`
Initializes the cron job that runs every 20 minutes (configurable).

```javascript
const gameDurationMinutes = parseInt(process.env.GAME_DURATION_MINUTES) || 20;
const cronPattern = `*/${gameDurationMinutes} * * * *`;
```

#### `createInitialGame()`
Creates the first game when the server starts, or handles expired games if the server was offline.

#### `executeGameDraw(gameId)`
Triggers the draw process for a completed game and broadcasts results.

### Configuration
- `GAME_DURATION_MINUTES`: Game duration (default: 20 minutes)
- Cron pattern automatically calculated based on duration

### Events Emitted
- `new_game_started`: When a new game begins
- `winner_declared`: When a draw is completed

---

## Solana Listener Service

**File**: `services/solanaListener.js`

### Purpose
Continuously monitors the Solana blockchain for qualifying token transactions and records valid participants.

### Key Methods

#### `startListening()`
Establishes connection to Solana RPC and begins monitoring.

#### `stopListening()`
Gracefully closes all connections and stops monitoring.

#### `validateTransaction(transaction)`
Validates transactions against criteria:
- Minimum SOL amount (default: 0.040 SOL)
- Correct token mint address
- Transaction not already recorded

### Configuration
- `SOLANA_NETWORK`: Network to connect to (mainnet/devnet/testnet)
- `SOLANA_RPC_URL_*`: RPC endpoints for each network
- `TOKEN_MINT_ADDRESS_*`: Token mint addresses for each network
- `MIN_SOL_AMOUNT`: Minimum qualifying transaction amount

### Error Handling
- Automatic reconnection on RPC failures
- Graceful degradation when blockchain is unavailable
- Comprehensive logging for debugging

---

## Game Service

**File**: `services/gameService.js`

### Purpose
Manages game state, lifecycle, and historical data queries.

### Key Methods

#### `createNewGame()`
Creates a new game with calculated start and end times.

```javascript
const startTime = new Date();
const gameDurationMinutes = parseInt(process.env.GAME_DURATION_MINUTES) || 20;
const endTime = new Date(startTime.getTime() + gameDurationMinutes * 60 * 1000);
```

#### `getCurrentGame()`
Retrieves the currently active (running) game.

#### `getExpiredGames()`
Finds games that have passed their end time but haven't been completed.

#### `completeGame(gameId, winnerAddress, drawShortlist, totalParticipants)`
Marks a game as completed and records the winner information.

#### `getRecentWinners()`
Retrieves winners from the last 24 hours for display on the frontend.

#### `getWinnerStats(walletAddress)`
Provides statistics for a specific wallet address.

### Database Operations
- All methods use prepared statements for security
- Transactions used for critical operations
- Proper error handling and logging

---

## Participant Service

**File**: `services/participantService.js`

### Purpose
Handles participant registration, validation, and game volume tracking.

### Key Methods

#### `addParticipant(gameId, walletAddress, transactionSig, solAmount)`
Records a new participant and updates game volume/prize pool.

```javascript
// Prize pool calculation: 0.1% of total volume
const prizePercentage = 0.001;
const prizeAddition = solAmount * prizePercentage;
```

#### `updateGameVolume(gameId, solAmount)`
Updates the total volume and prize pool for a game.

#### `getParticipantsByGameId(gameId)`
Retrieves all participants for a specific game with their SOL amounts.

#### `getParticipantAddressesByGameId(gameId)`
Retrieves only wallet addresses for draw processing.

#### `transactionExists(transactionSig)`
Checks if a transaction has already been processed to prevent duplicates.

### Validation
- Duplicate transaction prevention
- Proper error handling for database constraints
- Volume and prize pool calculations

---

## Draw Service

**File**: `services/drawService.js`

### Purpose
Implements the fair draw algorithm for winner selection.

### Key Methods

#### `executeDrawForGame(gameId)`
Main draw execution method that orchestrates the entire process.

#### `selectShortlist(participants, maxCount)`
Creates a shortlist of up to 25 unique participants using fair randomization.

```javascript
// Remove duplicates and shuffle
const uniqueParticipants = [...new Set(participants)];
const shuffled = this.shuffleArray([...uniqueParticipants]);
return shuffled.slice(0, Math.min(maxCount, shuffled.length));
```

#### `selectRandomWinner(shortlist)`
Selects the final winner from the shortlist using cryptographically secure randomness.

#### `shuffleArray(array)`
Implements Fisher-Yates shuffle algorithm for fair randomization.

### Fairness Guarantees
- Cryptographically secure random number generation
- Equal probability for all participants
- Transparent shortlist creation
- Immutable draw results stored in database

---

## Service Interactions

### Game Lifecycle Flow
1. **Scheduler** creates new game via **Game Service**
2. **Solana Listener** detects transactions and adds participants via **Participant Service**
3. **Scheduler** triggers **Draw Service** when game expires
4. **Draw Service** uses **Game Service** to complete the game
5. Results broadcasted via WebSocket

### Error Handling Strategy
- Each service handles its own errors gracefully
- Critical errors are logged and reported
- Non-critical errors don't stop other services
- Graceful degradation when external services fail

### Performance Considerations
- Services use connection pooling for database access
- Caching strategies for frequently accessed data
- Asynchronous operations prevent blocking
- Resource cleanup on service shutdown

### Testing Strategy
- Unit tests for each service method
- Integration tests for service interactions
- Mock external dependencies (Solana RPC, database)
- Load testing for high-volume scenarios