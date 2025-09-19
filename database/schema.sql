CREATE DATABASE IF NOT EXISTS banana_flip;
USE banana_flip;

CREATE TABLE IF NOT EXISTS games (
    game_id INT PRIMARY KEY AUTO_INCREMENT,
    start_time DATETIME NOT NULL,
    end_time DATETIME NOT NULL,
    status ENUM('running', 'completed') NOT NULL DEFAULT 'running',
    winner_address VARCHAR(44) NULL,
    draw_shortlist JSON NULL,
    total_volume DECIMAL(20, 9) NOT NULL DEFAULT 0,
    prize_pool DECIMAL(20, 9) NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS participants (
    entry_id INT PRIMARY KEY AUTO_INCREMENT,
    game_id INT NOT NULL,
    wallet_address VARCHAR(44) NOT NULL,
    transaction_sig VARCHAR(88) NOT NULL UNIQUE,
    sol_amount DECIMAL(20, 9) NOT NULL DEFAULT 0,
    entry_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (game_id) REFERENCES games(game_id)
);

CREATE TABLE IF NOT EXISTS winners (
    winner_id INT PRIMARY KEY AUTO_INCREMENT,
    game_id INT NOT NULL,
    wallet_address VARCHAR(44) NOT NULL,
    won_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    total_participants INT NOT NULL DEFAULT 0,
    shortlist_size INT NOT NULL DEFAULT 0,
    FOREIGN KEY (game_id) REFERENCES games(game_id),
    UNIQUE KEY unique_game_winner (game_id)
);

CREATE INDEX idx_games_status_end_time ON games(status, end_time);
CREATE INDEX idx_participants_game_id ON participants(game_id);
CREATE INDEX idx_participants_transaction_sig ON participants(transaction_sig);
CREATE INDEX idx_winners_wallet_address ON winners(wallet_address);
CREATE INDEX idx_winners_won_at ON winners(won_at);