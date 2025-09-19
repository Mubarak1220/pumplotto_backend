# Database Schema

## Overview

The Pump Lotto backend uses MySQL as its primary database to store game state, participant entries, and winner information. The schema is designed for high read performance and data integrity.

## Tables

### games

Tracks each 20-minute sweepstakes game cycle.

```sql
CREATE TABLE games (
    game_id INT PRIMARY KEY AUTO_INCREMENT,
    start_time DATETIME NOT NULL,
    end_time DATETIME NOT NULL,
    status ENUM('running', 'completed') NOT NULL DEFAULT 'running',
    winner_address VARCHAR(44) NULL,
    draw_shortlist JSON NULL,
    total_volume DECIMAL(20, 9) NOT NULL DEFAULT 0,
    prize_pool DECIMAL(20, 9) NOT NULL DEFAULT 0
);
```

**Columns:**
- `game_id`: Unique identifier for each game
- `start_time`: When the game began
- `end_time`: When the game is scheduled to end
- `status`: Current game state ('running' or 'completed')
- `winner_address`: Solana wallet address of the winner (NULL until drawn)
- `draw_shortlist`: JSON array of up to 25 addresses selected for final draw
- `total_volume`: Total SOL volume traded during the game
- `prize_pool`: Accumulated prize pool (0.1% of total volume)

### participants

Records every valid entry for each game.

```sql
CREATE TABLE participants (
    entry_id INT PRIMARY KEY AUTO_INCREMENT,
    game_id INT NOT NULL,
    wallet_address VARCHAR(44) NOT NULL,
    transaction_sig VARCHAR(88) NOT NULL UNIQUE,
    sol_amount DECIMAL(20, 9) NOT NULL DEFAULT 0,
    entry_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (game_id) REFERENCES games(game_id)
);
```

**Columns:**
- `entry_id`: Unique identifier for each participant entry
- `game_id`: Links to the specific game (foreign key)
- `wallet_address`: Participant's Solana wallet address
- `transaction_sig`: Unique Solana transaction signature (prevents duplicates)
- `sol_amount`: Amount of SOL in the qualifying transaction
- `entry_time`: When the entry was recorded

### winners

Dedicated table for winner tracking and statistics.

```sql
CREATE TABLE winners (
    winner_id INT PRIMARY KEY AUTO_INCREMENT,
    game_id INT NOT NULL,
    wallet_address VARCHAR(44) NOT NULL,
    won_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    total_participants INT NOT NULL DEFAULT 0,
    shortlist_size INT NOT NULL DEFAULT 0,
    FOREIGN KEY (game_id) REFERENCES games(game_id),
    UNIQUE KEY unique_game_winner (game_id)
);
```

**Columns:**
- `winner_id`: Unique identifier for each winner record
- `game_id`: Links to the specific game (foreign key)
- `wallet_address`: Winner's Solana wallet address
- `won_at`: Timestamp when the winner was declared
- `total_participants`: Number of participants in the winning game
- `shortlist_size`: Number of addresses in the final draw shortlist

## Indexes

```sql
-- Performance indexes for common queries
CREATE INDEX idx_games_status_end_time ON games(status, end_time);
CREATE INDEX idx_participants_game_id ON participants(game_id);
CREATE INDEX idx_participants_transaction_sig ON participants(transaction_sig);
CREATE INDEX idx_winners_wallet_address ON winners(wallet_address);
CREATE INDEX idx_winners_won_at ON winners(won_at);
```

## Relationships

```
games (1) ←→ (many) participants
games (1) ←→ (1) winners
```

## Query Patterns

### Current Game State
```sql
-- Get current running game
SELECT * FROM games 
WHERE status = 'running' 
ORDER BY start_time DESC 
LIMIT 1;

-- Get participants for current game
SELECT wallet_address, sol_amount 
FROM participants 
WHERE game_id = ?;
```

### Historical Data
```sql
-- Recent winners (24 hours)
SELECT w.wallet_address, g.start_time, w.won_at, w.total_participants
FROM winners w 
JOIN games g ON w.game_id = g.game_id 
WHERE w.won_at > DATE_SUB(NOW(), INTERVAL 24 HOUR)
ORDER BY w.won_at DESC;

-- Winner statistics for address
SELECT COUNT(*) as total_wins, 
       MIN(won_at) as first_win, 
       MAX(won_at) as latest_win
FROM winners 
WHERE wallet_address = ?;
```

### Game Management
```sql
-- Find expired games
SELECT * FROM games 
WHERE status = 'running' 
AND end_time < NOW();

-- Complete a game
UPDATE games 
SET status = 'completed', 
    winner_address = ?, 
    draw_shortlist = ? 
WHERE game_id = ?;
```

## Data Types and Constraints

### Solana Addresses
- **Format**: Base58 encoded, 32-44 characters
- **Storage**: VARCHAR(44) to accommodate all formats
- **Validation**: Application-level validation for format

### Transaction Signatures
- **Format**: Base58 encoded, ~88 characters
- **Storage**: VARCHAR(88)
- **Constraint**: UNIQUE to prevent duplicate entries

### SOL Amounts
- **Format**: DECIMAL(20, 9) for precision
- **Range**: Supports up to 99,999,999,999 SOL with 9 decimal places
- **Validation**: Application-level minimum amount checking

### Timestamps
- **Format**: DATETIME for all time fields
- **Timezone**: UTC recommended for consistency
- **Default**: CURRENT_TIMESTAMP for entry_time and won_at

## Backup and Maintenance

### Regular Backups
```sql
-- Daily backup command
mysqldump --single-transaction --routines --triggers banana_flip > backup_$(date +%Y%m%d).sql
```

### Data Retention
- Keep all game data indefinitely for transparency
- Consider archiving old games (>1 year) to separate tables
- Regular index optimization for performance

### Monitoring Queries
```sql
-- Games per day
SELECT DATE(start_time) as game_date, COUNT(*) as games_count
FROM games 
WHERE start_time > DATE_SUB(NOW(), INTERVAL 7 DAY)
GROUP BY DATE(start_time);

-- Average participants per game
SELECT AVG(participant_count) as avg_participants
FROM (
    SELECT game_id, COUNT(*) as participant_count
    FROM participants 
    GROUP BY game_id
) as game_stats;
```

## Performance Considerations

### Index Usage
- Primary queries use covering indexes
- Avoid SELECT * in application code
- Use LIMIT for pagination queries

### Connection Pooling
- Configured pool size: 10 connections
- Connection timeout handling
- Prepared statement caching

### Query Optimization
- Use EXPLAIN for slow queries
- Monitor slow query log
- Regular ANALYZE TABLE for statistics