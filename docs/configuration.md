# Configuration Guide

## Environment Variables

The Pump Lotto backend uses environment variables for configuration. Copy `.env.example` to `.env` and modify the values according to your deployment environment.

## Database Configuration

### Required Variables

```bash
# Database host (localhost for local development)
DB_HOST=localhost

# Database username
DB_USER=banana_user

# Database password (use strong passwords in production)
DB_PASSWORD=your_secure_password

# Database name
DB_NAME=banana_flip
```

### Connection Pool Settings

The database connection pool is configured in `database/connection.js`:

```javascript
const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,        // Adjust based on load
    queueLimit: 0
});
```

**Recommended Settings:**
- **Development**: connectionLimit: 5
- **Production**: connectionLimit: 10-20 (based on server resources)

## Solana Network Configuration

### Network Selection

```bash
# Set the network environment
SOLANA_NETWORK=mainnet  # Options: mainnet, devnet, testnet
```

### RPC Endpoints

Configure RPC URLs for each network:

```bash
# Mainnet RPC (production)
SOLANA_RPC_URL_MAINNET=https://solana-rpc.publicnode.com

# Devnet RPC (testing)
SOLANA_RPC_URL_DEVNET=https://api.devnet.solana.com

# Testnet RPC (testing)
SOLANA_RPC_URL_TESTNET=https://api.testnet.solana.com
```

**RPC Provider Recommendations:**
- **Primary**: PublicNode (free, reliable)
- **Backup**: Solana Labs official endpoints
- **Premium**: QuickNode, Alchemy, or Helius for high-volume production

### Token Configuration

Set the token mint address for each network:

```bash
# Token mint addresses (get from your token deployment)
TOKEN_MINT_ADDRESS_MAINNET=FjFt9FyxcKJE9wgMWwbJBLrEqXobnFB4zqLh3sprsD1d
TOKEN_MINT_ADDRESS_DEVNET=INSERT_YOUR_DEVNET_TOKEN_MINT_ADDRESS_HERE
TOKEN_MINT_ADDRESS_TESTNET=INSERT_YOUR_TESTNET_TOKEN_MINT_ADDRESS_HERE
```

### Transaction Validation

```bash
# Minimum SOL amount required for participation (in SOL)
MIN_SOL_AMOUNT=0.040
```

## Game Configuration

### Game Timing

```bash
# Duration of each game cycle in minutes
GAME_DURATION_MINUTES=20
```

**Common Values:**
- Development/Testing: 1-5 minutes
- Production: 20 minutes (recommended)
- Special Events: 10 or 30 minutes

### Prize Pool Calculation

The prize pool is calculated as 0.1% of total volume. This is hardcoded in `participantService.js`:

```javascript
// Prize pool calculation: 0.1% of total volume
const prizePercentage = 0.001;
const prizeAddition = solAmount * prizePercentage;
```

To modify this percentage, update the `prizePercentage` constant.

## Server Configuration

### Basic Settings

```bash
# Server port
PORT=3000

# Node.js environment
NODE_ENV=production  # Options: development, production, test
```

### WebSocket Configuration

WebSocket settings are configured in `server.js`:

```javascript
const io = socketIo(server, {
    cors: {
        origin: "*",                    // Configure for production
        methods: ["GET", "POST"]
    },
    pingTimeout: 60000,                 // 60 seconds
    pingInterval: 25000                 // 25 seconds
});
```

**Production Recommendations:**
- Set specific origins instead of "*" for CORS
- Adjust ping timeout based on client requirements
- Consider implementing connection limits

## Logging Configuration

### Log Levels

Set the logging level (if implementing custom logging):

```bash
LOG_LEVEL=info  # Options: error, warn, info, debug
```

### Log Files

```bash
# Log file paths (optional)
LOG_FILE=/var/log/pump-lotto/app.log
ERROR_LOG_FILE=/var/log/pump-lotto/error.log
```

## Performance Configuration

### Memory Limits

For production deployments, set Node.js memory limits:

```bash
# In PM2 ecosystem file or Docker
NODE_OPTIONS="--max-old-space-size=1024"  # 1GB limit
```

### Connection Limits

```bash
# Maximum WebSocket connections (optional)
MAX_WEBSOCKET_CONNECTIONS=1000

# Database connection pool limit
DB_CONNECTION_LIMIT=10
```

## Security Configuration

### CORS Settings

For production, configure specific origins:

```javascript
// In server.js
const io = socketIo(server, {
    cors: {
        origin: [
            "https://your-frontend-domain.com",
            "https://your-admin-domain.com"
        ],
        methods: ["GET", "POST"]
    }
});
```

### Rate Limiting

Consider implementing rate limiting:

```bash
# Rate limit settings (if implemented)
RATE_LIMIT_WINDOW_MS=900000  # 15 minutes
RATE_LIMIT_MAX_REQUESTS=100  # requests per window
```

## Development vs Production Configurations

### Development Settings

```bash
NODE_ENV=development
DB_HOST=localhost
SOLANA_NETWORK=devnet
GAME_DURATION_MINUTES=1
LOG_LEVEL=debug
PORT=3000
```

### Production Settings

```bash
NODE_ENV=production
DB_HOST=your-production-db-host
SOLANA_NETWORK=mainnet
GAME_DURATION_MINUTES=20
LOG_LEVEL=info
PORT=3000

# Security enhancements
DB_SSL_ENABLED=true
CORS_ORIGIN=https://your-domain.com
```

## Environment-Specific Examples

### Local Development

```bash
# .env.development
NODE_ENV=development
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=password
DB_NAME=banana_flip_dev
SOLANA_NETWORK=devnet
TOKEN_MINT_ADDRESS_DEVNET=YourDevnetTokenMintAddress
GAME_DURATION_MINUTES=2
MIN_SOL_AMOUNT=0.001
PORT=3000
```

### Staging Environment

```bash
# .env.staging
NODE_ENV=staging
DB_HOST=staging-db.your-domain.com
DB_USER=banana_staging
DB_PASSWORD=staging_secure_password
DB_NAME=banana_flip_staging
SOLANA_NETWORK=devnet
TOKEN_MINT_ADDRESS_DEVNET=YourDevnetTokenMintAddress
GAME_DURATION_MINUTES=5
MIN_SOL_AMOUNT=0.010
PORT=3000
```

### Production Environment

```bash
# .env.production
NODE_ENV=production
DB_HOST=prod-db.your-domain.com
DB_USER=banana_prod
DB_PASSWORD=production_very_secure_password
DB_NAME=banana_flip
SOLANA_NETWORK=mainnet
TOKEN_MINT_ADDRESS_MAINNET=FjFt9FyxcKJE9wgMWwbJBLrEqXobnFB4zqLh3sprsD1d
SOLANA_RPC_URL_MAINNET=https://your-premium-rpc-endpoint.com
GAME_DURATION_MINUTES=20
MIN_SOL_AMOUNT=0.040
PORT=3000
```

## Configuration Validation

### Startup Checks

The application should validate critical configuration on startup:

```javascript
// Add to server.js
function validateConfig() {
    const required = [
        'DB_HOST', 'DB_USER', 'DB_PASSWORD', 'DB_NAME',
        'SOLANA_NETWORK', 'MIN_SOL_AMOUNT'
    ];
    
    for (const env of required) {
        if (!process.env[env]) {
            console.error(`Missing required environment variable: ${env}`);
            process.exit(1);
        }
    }
    
    // Validate network-specific token address
    const network = process.env.SOLANA_NETWORK;
    const tokenAddress = process.env[`TOKEN_MINT_ADDRESS_${network.toUpperCase()}`];
    if (!tokenAddress) {
        console.error(`Missing token address for network: ${network}`);
        process.exit(1);
    }
}
```

### Configuration Testing

```bash
# Test configuration script
node -e "
require('dotenv').config();
console.log('Configuration loaded successfully');
console.log('Network:', process.env.SOLANA_NETWORK);
console.log('Game Duration:', process.env.GAME_DURATION_MINUTES, 'minutes');
console.log('Min SOL Amount:', process.env.MIN_SOL_AMOUNT);
"
```

## Dynamic Configuration

For advanced deployments, consider implementing dynamic configuration:

### Database-Stored Settings

```sql
CREATE TABLE settings (
    setting_key VARCHAR(100) PRIMARY KEY,
    setting_value TEXT NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

INSERT INTO settings VALUES 
('game_duration_minutes', '20', NOW()),
('min_sol_amount', '0.040', NOW()),
('prize_percentage', '0.001', NOW());
```

### Runtime Configuration Updates

Implement endpoints for admin configuration updates:

```javascript
// Admin endpoint for configuration updates
app.post('/admin/config', (req, res) => {
    // Validate admin access
    // Update configuration
    // Restart relevant services
});
```