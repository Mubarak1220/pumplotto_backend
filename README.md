# Banana Flip Backend

Real-time sweepstakes backend system that monitors Solana blockchain transactions and manages 20-minute game cycles.

## Setup

1. Install dependencies:
```bash
npm install
```

2. Set up MySQL database:
```bash
mysql -u root -p < database/schema.sql
```

3. Configure environment variables in `.env`:
```bash
# Copy the example file
cp .env.example .env

# Edit with your values
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=banana_flip

# Choose network: 'testnet', 'devnet', or 'mainnet'
SOLANA_NETWORK=devnet

# Configure token addresses for all networks
TOKEN_MINT_ADDRESS_MAINNET=your_mainnet_token_mint_address
TOKEN_MINT_ADDRESS_DEVNET=your_devnet_token_mint_address
TOKEN_MINT_ADDRESS_TESTNET=your_testnet_token_mint_address

# Game settings
GAME_DURATION_MINUTES=20
MIN_SOL_AMOUNT=0.040
```

4. Start the server:
```bash
npm start
```

## API Endpoints

- `GET /api/v1/gamestate` - Get current game state
- `GET /health` - Health check

## WebSocket Events

Server emits:
- `new_participant` - New participant joined
- `winner_declared` - Game winner announced
- `new_game_started` - New 20-minute game cycle started

## Configuration Options

### Game Duration
Change game cycle duration by setting `GAME_DURATION_MINUTES` in `.env`:
```bash
GAME_DURATION_MINUTES=20  # 20-minute cycles
GAME_DURATION_MINUTES=10  # 10-minute cycles  
GAME_DURATION_MINUTES=5   # 5-minute cycles
```

### Solana Network
Switch between testnet, devnet, and mainnet by setting `SOLANA_NETWORK`:
```bash
SOLANA_NETWORK=testnet   # Use Solana testnet
SOLANA_NETWORK=devnet    # Use Solana devnet (recommended for development)
SOLANA_NETWORK=mainnet   # Use Solana mainnet
```

### Minimum SOL Amount
Adjust minimum transaction amount:
```bash
MIN_SOL_AMOUNT=0.040  # Require 0.040 SOL minimum
MIN_SOL_AMOUNT=0.100  # Require 0.100 SOL minimum
```

## Architecture

- **Scheduler Service**: Manages configurable game cycles
- **Solana Listener**: Monitors testnet/devnet/mainnet for qualifying transactions
- **Draw Service**: Executes random winner selection
- **Game Service**: Manages game lifecycle
- **Participant Service**: Handles participant data