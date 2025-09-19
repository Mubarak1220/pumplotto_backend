# System Architecture

## Overview

Pump Lotto Backend is a Node.js application that operates as a real-time sweepstakes engine. The system continuously monitors the Solana blockchain for token transactions and automatically manages game cycles with fair winner selection.

## High-Level Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Mobile App    │    │   Dashboard     │
│   (React)       │    │   (Flutter)     │    │   (Admin)       │
└─────────┬───────┘    └─────────┬───────┘    └─────────┬───────┘
          │                      │                      │
          └──────────────────────┼──────────────────────┘
                                 │
                    ┌─────────────▼─────────────┐
                    │     WebSocket/HTTP        │
                    │     Load Balancer         │
                    └─────────────┬─────────────┘
                                  │
                    ┌─────────────▼─────────────┐
                    │    Pump Lotto Backend     │
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

## Core Components

### 1. HTTP Server (Express.js)
- **Purpose**: Serves REST API endpoints
- **Responsibilities**:
  - Initial game state delivery
  - Historical data queries
  - Health monitoring
- **Key Files**: `server.js`, `routes/api.js`

### 2. WebSocket Server (Socket.io)
- **Purpose**: Real-time bidirectional communication
- **Responsibilities**:
  - Broadcasting new participants
  - Winner announcements
  - Game state updates
- **Key Files**: `server.js`

### 3. Service Layer

#### Scheduler Service
- **Purpose**: Manages game timing and lifecycle
- **Responsibilities**:
  - Creates new games every 20 minutes
  - Triggers draw execution for expired games
  - Broadcasts game events
- **Key Files**: `services/scheduler.js`

#### Solana Listener Service
- **Purpose**: Monitors blockchain transactions
- **Responsibilities**:
  - Connects to Solana RPC endpoints
  - Filters relevant token transactions
  - Validates transaction criteria
  - Records valid participants
- **Key Files**: `services/solanaListener.js`

#### Game Service
- **Purpose**: Game state management
- **Responsibilities**:
  - Game CRUD operations
  - Winner tracking
  - Historical data queries
- **Key Files**: `services/gameService.js`

#### Participant Service
- **Purpose**: Participant management
- **Responsibilities**:
  - Recording new participants
  - Preventing duplicate entries
  - Volume and prize pool calculations
- **Key Files**: `services/participantService.js`

#### Draw Service
- **Purpose**: Fair winner selection
- **Responsibilities**:
  - Shortlist generation (max 25 participants)
  - Random winner selection
  - Draw result recording
- **Key Files**: `services/drawService.js`

### 4. Database Layer (MySQL)
- **Purpose**: Persistent data storage
- **Tables**:
  - `games`: Game rounds and their metadata
  - `participants`: All valid entries per game
  - `winners`: Winner tracking and statistics
- **Key Files**: `database/connection.js`, `database/schema.sql`

## Data Flow

### 1. Game Initialization
```
Scheduler Service → Game Service → MySQL
                 ↓
            WebSocket Broadcast (new_game_started)
```

### 2. Transaction Processing
```
Solana Blockchain → Solana Listener → Participant Service → MySQL
                                   ↓
                              WebSocket Broadcast (new_participant)
```

### 3. Draw Execution
```
Scheduler Service → Draw Service → Game Service → MySQL
                               ↓
                         WebSocket Broadcast (winner_declared)
```

### 4. Client Queries
```
Frontend → HTTP API → Game/Participant Services → MySQL → JSON Response
```

## Scalability Considerations

### Horizontal Scaling
- **Challenge**: Single-instance cron jobs and WebSocket state
- **Solution**: Use Redis for distributed scheduling and session management
- **Implementation**: Replace node-cron with Bull queues

### Database Scaling
- **Read Replicas**: Separate read operations for historical data
- **Partitioning**: Partition tables by date for better performance
- **Indexing**: Current indexes support main query patterns

### Blockchain Monitoring
- **Multiple RPC Endpoints**: Failover for reliability
- **WebSocket Subscriptions**: More efficient than polling
- **Rate Limiting**: Respect RPC provider limits

## Security Architecture

### Input Validation
- Transaction signature validation
- Wallet address format verification
- SQL injection prevention via prepared statements

### DoS Protection
- Connection limits on WebSocket server
- Rate limiting considerations for API endpoints
- Resource monitoring and alerting

### Data Integrity
- Transaction uniqueness constraints
- Foreign key relationships
- Atomic operations for critical paths

## Monitoring and Observability

### Health Checks
- `/health` endpoint for load balancer probes
- Database connection monitoring
- Solana RPC connectivity checks

### Logging
- Structured logging for all services
- Error tracking and alerting
- Performance metrics collection

### Metrics
- Game cycle timing
- Transaction processing rates
- WebSocket connection counts
- Database query performance