# Pump Lotto Backend

A real-time sweepstakes platform that monitors Solana blockchain transactions and automatically conducts fair draws every 20 minutes. This backend powers **Banana Flip** ([pump.fun/coin/FjFt9FyxcKJE9wgMWwbJBLrEqXobnFB4zqLh3sprsD1d](https://pump.fun/coin/FjFt9FyxcKJE9wgMWwbJBLrEqXobnFB4zqLh3sprsD1d)) and serves as the authoritative engine for the entire Pump Lotto ecosystem.

## 🎯 Overview

Pump Lotto Backend is a Node.js application that:
- **Monitors Solana blockchain** for qualifying token transactions in real-time
- **Manages automated game cycles** with configurable duration (default: 20 minutes)
- **Executes provably fair draws** with transparent winner selection
- **Provides real-time updates** via WebSocket connections
- **Serves comprehensive APIs** for game state and historical data

The frontend repository is available at: [pumplotto_frontend](https://github.com/UjwalAKrishna/pumplotto_frontend)

## 🏗️ Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Mobile App    │    │   Dashboard     │
│   (React)       │    │   (Flutter)     │    │   (Admin)       │
└─────────┬───────┘    └─────────┬───────┘    └─────────┬───────┘
          │                      │                      │
          └──────────────────────┼──────────────────────┘
                                 │
                    ┌─────────────▼─────────────┐
                    │   Pump Lotto Backend      │
                    │      (Node.js)            │
                    └─────────────┬─────────────┘
                                  │
          ┌───────────────────────┼───────────────────────┐
          │                       │                       │
┌─────────▼─────────┐   ┌─────────▼─────────┐   ┌─────────▼─────────┐
│   MySQL Database  │   │  Solana Network   │   │   File Storage    │
│   (Game State)    │   │   (Blockchain)    │   │    (Logs)         │
└───────────────────┘   └───────────────────┘   └───────────────────┘
```

### Core Services

- **🕐 Scheduler Service**: Manages game timing and lifecycle
- **⛓️ Solana Listener**: Monitors blockchain for qualifying transactions  
- **🎲 Draw Service**: Executes fair winner selection algorithm
- **🎮 Game Service**: Handles game state management
- **👥 Participant Service**: Manages participant registration and validation

## 🚀 Quick Start

### Prerequisites

- Node.js 18.x or higher
- MySQL 8.0 or higher
- Solana token deployment on desired network

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd pump-lotto-backend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Setup database**
   ```bash
   mysql -u root -p
   ```
   ```sql
   CREATE DATABASE banana_flip;
   CREATE USER 'banana_user'@'localhost' IDENTIFIED BY 'secure_password';
   GRANT ALL PRIVILEGES ON banana_flip.* TO 'banana_user'@'localhost';
   FLUSH PRIVILEGES;
   ```
   ```bash
   mysql -u banana_user -p banana_flip < database/schema.sql
   ```

4. **Configure environment**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

5. **Start the application**
   ```bash
   # Development
   npm run dev
   
   # Production
   npm start
   ```

## ⚙️ Configuration

Key environment variables:

```bash
# Database
DB_HOST=localhost
DB_USER=banana_user
DB_PASSWORD=your_password
DB_NAME=banana_flip

# Solana Network
SOLANA_NETWORK=mainnet
TOKEN_MINT_ADDRESS_MAINNET=FjFt9FyxcKJE9wgMWwbJBLrEqXobnFB4zqLh3sprsD1d
MIN_SOL_AMOUNT=0.040

# Game Configuration  
GAME_DURATION_MINUTES=20
PORT=3000
```

See [Configuration Guide](./docs/configuration.md) for complete setup details.

## 📡 API Reference

### REST Endpoints

#### `GET /api/v1/gamestate`
Returns current game state including active participants and recent winners.

#### `GET /api/v1/winners`
Returns paginated list of all winners with statistics.

#### `GET /api/v1/winners/:address/stats`
Returns win statistics for a specific wallet address.

#### `GET /health`
Health check endpoint for monitoring.

### WebSocket Events

#### Server → Client
- `new_participant`: Emitted when someone joins the current game
- `winner_declared`: Emitted when a draw completes with winner and shortlist
- `new_game_started`: Emitted every 20 minutes when a new game begins

See [API Documentation](./docs/api.md) for complete reference.

## 🎲 Fair Draw Algorithm

1. **Participant Collection**: Gather all unique wallet addresses from the current game
2. **Shortlist Creation**: Randomly select up to 25 unique participants using Fisher-Yates shuffle
3. **Winner Selection**: Randomly select one winner from the shortlist using cryptographically secure randomness
4. **Transparency**: All draw results are permanently stored and publicly accessible

## 🔧 Development

### Local Development Setup

```bash
# Install dependencies
npm install

# Setup development database
mysql -u root -p < database/schema.sql

# Configure for development
cp .env.example .env
# Set SOLANA_NETWORK=devnet and GAME_DURATION_MINUTES=2

# Start with auto-reload
npm run dev
```

### Testing

```bash
# Run health check
curl http://localhost:3000/health

# Test WebSocket connection
npm install -g wscat
wscat -c ws://localhost:3000

# Check game state
curl http://localhost:3000/api/v1/gamestate
```

See [Development Guide](./docs/development.md) for comprehensive development instructions.

## 🚀 Deployment

### Production Deployment with PM2

```bash
# Install PM2
npm install -g pm2

# Start application
pm2 start ecosystem.config.js

# Save PM2 configuration
pm2 save
pm2 startup
```

### Docker Deployment

```bash
# Build and run with Docker Compose
docker-compose up -d

# View logs
docker-compose logs -f app
```

See [Deployment Guide](./docs/deployment.md) for detailed deployment instructions.

## 📊 Monitoring

### Health Monitoring
- `/health` endpoint for load balancer probes
- Database connection monitoring  
- Solana RPC connectivity checks
- WebSocket connection tracking

### Performance Metrics
- Game cycle timing
- Transaction processing rates
- Database query performance
- Memory and CPU usage

## 🔒 Security

- **Input Validation**: All transactions validated for format and authenticity
- **Duplicate Prevention**: Transaction signatures ensure one entry per transaction
- **SQL Injection Protection**: Prepared statements throughout
- **Rate Limiting**: Configurable limits on API endpoints
- **Secure Configuration**: Environment-based secrets management

## 🗂️ Database Schema

### Tables
- **`games`**: Tracks 20-minute game cycles with timing and winner data
- **`participants`**: Records all valid entries per game with SOL amounts
- **`winners`**: Dedicated winner tracking for statistics and transparency

### Key Features
- Foreign key relationships for data integrity
- Optimized indexes for query performance
- JSON storage for draw shortlists
- Precise decimal handling for SOL amounts

See [Database Documentation](./docs/database.md) for complete schema details.

## 📁 Documentation

- **[API Reference](./docs/api.md)** - Complete REST API and WebSocket documentation
- **[Architecture](./docs/architecture.md)** - System design and component overview  
- **[Database Schema](./docs/database.md)** - Database structure and relationships
- **[Services](./docs/services.md)** - Service layer documentation
- **[Configuration](./docs/configuration.md)** - Environment setup and options
- **[Development](./docs/development.md)** - Local development guide
- **[Deployment](./docs/deployment.md)** - Production deployment instructions
- **[Troubleshooting](./docs/troubleshooting.md)** - Common issues and solutions

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is proprietary software. All rights reserved.

## 🆘 Support

For technical support or questions:

1. Check the [Troubleshooting Guide](./docs/troubleshooting.md)
2. Review the relevant documentation
3. Create an issue in the repository
4. Contact the development team

---

**Built with ❤️ for the Solana ecosystem**