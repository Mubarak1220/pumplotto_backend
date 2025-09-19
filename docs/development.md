# Development Guide

## Getting Started

### Prerequisites

Before starting development, ensure you have the following installed:

- **Node.js** (v18.x or higher)
- **npm** (v8.x or higher) 
- **MySQL** (v8.0 or higher)
- **Git**
- **Code Editor** (VS Code recommended)

### Initial Setup

1. **Clone the Repository**
```bash
git clone <repository-url>
cd pump-lotto-backend
```

2. **Install Dependencies**
```bash
npm install
```

3. **Database Setup**
```bash
# Start MySQL service
sudo systemctl start mysql  # Linux
brew services start mysql   # macOS

# Create database and user
mysql -u root -p
```

```sql
CREATE DATABASE banana_flip_dev;
CREATE USER 'dev_user'@'localhost' IDENTIFIED BY 'dev_password';
GRANT ALL PRIVILEGES ON banana_flip_dev.* TO 'dev_user'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

```bash
# Import schema
mysql -u dev_user -p banana_flip_dev < database/schema.sql
```

4. **Environment Configuration**
```bash
cp .env.example .env
```

Edit `.env` with development values:
```bash
NODE_ENV=development
DB_HOST=localhost
DB_USER=dev_user
DB_PASSWORD=dev_password
DB_NAME=banana_flip_dev
SOLANA_NETWORK=devnet
TOKEN_MINT_ADDRESS_DEVNET=INSERT_YOUR_DEVNET_TOKEN_HERE
GAME_DURATION_MINUTES=2
MIN_SOL_AMOUNT=0.001
PORT=3000
```

5. **Start Development Server**
```bash
npm run dev
```

The server will start with auto-reload enabled via nodemon.

## Project Structure

```
pump-lotto-backend/
├── database/
│   ├── connection.js       # Database connection pool
│   └── schema.sql         # Database schema
├── routes/
│   └── api.js            # REST API routes
├── services/
│   ├── drawService.js    # Draw execution logic
│   ├── gameService.js    # Game management
│   ├── participantService.js # Participant handling
│   ├── scheduler.js      # Game timing and lifecycle
│   └── solanaListener.js # Blockchain monitoring
├── docs/                 # Documentation
├── server.js            # Main application entry point
├── package.json         # Dependencies and scripts
├── .env.example         # Environment template
└── README.md           # Project overview
```

## Development Workflow

### Code Style and Standards

1. **ESLint Configuration** (add to project)
```bash
npm install --save-dev eslint
npx eslint --init
```

2. **Prettier Configuration** (add to project)
```bash
npm install --save-dev prettier
```

Create `.prettierrc`:
```json
{
  "semi": true,
  "trailingComma": "es5",
  "singleQuote": true,
  "printWidth": 100,
  "tabWidth": 4
}
```

### Git Workflow

1. **Branch Naming Convention**
```
feature/feature-name
bugfix/bug-description
hotfix/critical-fix
chore/maintenance-task
```

2. **Commit Message Format**
```
type(scope): description

feat(api): add winner statistics endpoint
fix(scheduler): handle timezone edge cases
docs(readme): update installation instructions
```

### Testing Strategy

#### Unit Tests Setup (recommended addition)

```bash
npm install --save-dev jest supertest
```

Create `tests/` directory structure:
```
tests/
├── services/
│   ├── gameService.test.js
│   ├── drawService.test.js
│   └── participantService.test.js
├── routes/
│   └── api.test.js
└── setup.js
```

Example test file:
```javascript
// tests/services/gameService.test.js
const gameService = require('../../services/gameService');

describe('GameService', () => {
    test('should create new game with correct duration', async () => {
        const game = await gameService.createNewGame();
        expect(game).toHaveProperty('game_id');
        expect(game.status).toBe('running');
    });
});
```

#### Integration Tests

```javascript
// tests/routes/api.test.js
const request = require('supertest');
const app = require('../../server');

describe('API Endpoints', () => {
    test('GET /health should return OK', async () => {
        const response = await request(app)
            .get('/health')
            .expect(200);
        
        expect(response.body).toEqual({
            status: 'OK',
            timestamp: expect.any(String)
        });
    });
});
```

### Local Development Tips

#### Fast Development Cycle

1. **Quick Game Testing**
```bash
# Set very short game duration for testing
GAME_DURATION_MINUTES=0.5  # 30 seconds
```

2. **Database Reset Script**
```bash
# Create reset script: scripts/reset-db.js
const db = require('../database/connection');

async function resetDatabase() {
    await db.execute('DELETE FROM participants');
    await db.execute('DELETE FROM winners');
    await db.execute('DELETE FROM games');
    console.log('Database reset complete');
    process.exit(0);
}

resetDatabase().catch(console.error);
```

3. **Mock Solana Transactions**
```javascript
// Create mock service for testing
// services/mockSolanaListener.js
class MockSolanaListener {
    constructor(io) {
        this.io = io;
    }
    
    async startListening() {
        // Simulate transactions every 10 seconds
        setInterval(() => {
            this.simulateTransaction();
        }, 10000);
    }
    
    simulateTransaction() {
        const mockWallet = this.generateMockWallet();
        const mockTxSig = this.generateMockSignature();
        const mockAmount = 0.045 + Math.random() * 0.1;
        
        // Process as real transaction
        this.processTransaction(mockWallet, mockTxSig, mockAmount);
    }
}
```

#### Debugging Tools

1. **Database Debugging**
```javascript
// Add to any service for query debugging
const originalExecute = db.execute;
db.execute = function(query, params) {
    console.log('SQL:', query);
    console.log('Params:', params);
    return originalExecute.call(this, query, params);
};
```

2. **WebSocket Debugging**
```javascript
// Add to server.js for WebSocket debugging
io.engine.on("connection_error", (err) => {
    console.log('WebSocket connection error:', err.req);
    console.log('Error code:', err.code);
    console.log('Error message:', err.message);
    console.log('Error context:', err.context);
});
```

3. **Solana RPC Debugging**
```javascript
// Add request logging to solanaListener.js
const originalFetch = fetch;
global.fetch = function(url, options) {
    console.log('RPC Request:', url, options?.body);
    return originalFetch.call(this, url, options)
        .then(response => {
            console.log('RPC Response:', response.status);
            return response;
        });
};
```

## Database Development

### Migrations (future enhancement)

Create migration system for schema changes:

```javascript
// database/migrations/001_add_prize_pool.js
module.exports = {
    up: async (db) => {
        await db.execute(`
            ALTER TABLE games 
            ADD COLUMN prize_pool DECIMAL(20, 9) NOT NULL DEFAULT 0,
            ADD COLUMN total_volume DECIMAL(20, 9) NOT NULL DEFAULT 0
        `);
    },
    
    down: async (db) => {
        await db.execute(`
            ALTER TABLE games 
            DROP COLUMN prize_pool,
            DROP COLUMN total_volume
        `);
    }
};
```

### Database Seeding

```javascript
// scripts/seed-dev-data.js
const gameService = require('../services/gameService');
const participantService = require('../services/participantService');

async function seedDevData() {
    // Create test game
    const game = await gameService.createNewGame();
    
    // Add test participants
    const testParticipants = [
        { wallet: '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU', amount: 0.045 },
        { wallet: '8yLYug3DW98e98UKTEqcbE6lcifeTrB94UaSfKjtdBtV', amount: 0.067 }
    ];
    
    for (const participant of testParticipants) {
        await participantService.addParticipant(
            game.game_id,
            participant.wallet,
            `mock_tx_${Math.random()}`,
            participant.amount
        );
    }
    
    console.log('Dev data seeded successfully');
}
```

## API Development

### Adding New Endpoints

1. **Define Route**
```javascript
// In routes/api.js
router.get('/v1/games/:gameId/participants', async (req, res) => {
    try {
        const { gameId } = req.params;
        const participants = await participantService.getParticipantsByGameId(gameId);
        res.json({ participants });
    } catch (error) {
        console.error('Error fetching participants:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
```

2. **Add Service Method**
```javascript
// In appropriate service
async getDetailedParticipants(gameId) {
    const [rows] = await db.execute(`
        SELECT wallet_address, sol_amount, entry_time 
        FROM participants 
        WHERE game_id = ? 
        ORDER BY entry_time ASC
    `, [gameId]);
    return rows;
}
```

3. **Test Endpoint**
```bash
curl http://localhost:3000/api/v1/games/1/participants
```

### WebSocket Event Development

1. **Add New Event Type**
```javascript
// In appropriate service
this.io.emit('game_stats_updated', {
    game_id: gameId,
    total_participants: count,
    total_volume: volume,
    prize_pool: prizePool
});
```

2. **Test WebSocket Events**
```html
<!-- Create test-websocket.html -->
<script>
const socket = io('http://localhost:3000');

socket.on('game_stats_updated', (data) => {
    console.log('Game stats:', data);
});
</script>
```

## Performance Optimization

### Database Query Optimization

1. **Use EXPLAIN for slow queries**
```sql
EXPLAIN SELECT * FROM participants WHERE game_id = 1;
```

2. **Add appropriate indexes**
```sql
CREATE INDEX idx_participants_entry_time ON participants(entry_time);
```

3. **Monitor query performance**
```javascript
// Add timing to database operations
const start = Date.now();
const result = await db.execute(query, params);
const duration = Date.now() - start;
if (duration > 100) {
    console.warn(`Slow query (${duration}ms):`, query);
}
```

### Memory Profiling

```bash
# Start with memory profiling
node --inspect server.js

# Use Chrome DevTools for memory analysis
# Navigate to chrome://inspect
```

## Troubleshooting

### Common Development Issues

1. **Database Connection Errors**
```bash
# Check MySQL is running
sudo systemctl status mysql

# Test connection
mysql -u dev_user -p banana_flip_dev -e "SELECT 1"
```

2. **Port Already in Use**
```bash
# Find process using port 3000
lsof -ti:3000

# Kill process
kill -9 $(lsof -ti:3000)
```

3. **Solana RPC Issues**
```bash
# Test RPC connectivity
curl -X POST -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"getHealth"}' \
  https://api.devnet.solana.com
```

### Debugging Checklist

- [ ] Environment variables loaded correctly
- [ ] Database connection established
- [ ] All required services started
- [ ] WebSocket connections working
- [ ] Solana RPC accessible
- [ ] Game creation and completion cycle functional
- [ ] Draw algorithm producing expected results

## Code Quality

### Pre-commit Hooks (recommended)

```bash
npm install --save-dev husky lint-staged

# Add to package.json
{
  "husky": {
    "hooks": {
      "pre-commit": "lint-staged"
    }
  },
  "lint-staged": {
    "*.js": ["eslint --fix", "prettier --write", "git add"]
  }
}
```

### Documentation Standards

- Keep inline comments minimal but meaningful
- Update API documentation when adding endpoints
- Document complex algorithms and business logic
- Maintain this development guide as the project evolves