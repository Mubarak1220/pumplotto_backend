require('dotenv').config();
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');

// Import services
const Scheduler = require('./services/scheduler');
const SolanaListener = require('./services/solanaListener');
const apiRoutes = require('./routes/api');

// Create Express app
const app = express();
const server = http.createServer(app);

// Increase max listeners to prevent warnings
server.setMaxListeners(20);

const io = socketIo(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    },
    // Add connection timeout and cleanup
    pingTimeout: 60000,
    pingInterval: 25000
});

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api', apiRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Initialize services
let scheduler;
let solanaListener;

async function initializeServices() {
    try {
        console.log('Initializing services...');
        
        // Initialize scheduler
        scheduler = new Scheduler(io);
        
        // Create initial game if needed
        await scheduler.createInitialGame();
        
        // Start scheduler
        scheduler.start();
        
        // Initialize and start Solana listener
        solanaListener = new SolanaListener(io);
        
        // Start Solana listener without blocking initialization
        solanaListener.startListening().catch(error => {
            console.error('Solana listener failed to start:', error.message);
            console.log('Server will continue running without blockchain monitoring');
        });
        
        console.log('All services initialized successfully');
        
    } catch (error) {
        console.error('Error initializing services:', error);
        process.exit(1);
    }
}

// WebSocket connection handling
io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);
    
    socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id);
    });
});

// Graceful shutdown
let isShuttingDown = false;

async function shutdown(signal) {
    if (isShuttingDown) return;
    isShuttingDown = true;
    
    console.log(`Received ${signal}. Shutting down gracefully...`);
    
    try {
        // Stop scheduler first
        if (scheduler) {
            console.log('Stopping scheduler...');
            scheduler.stop();
        }
        
        // Stop Solana listener
        if (solanaListener) {
            console.log('Stopping Solana listener...');
            await solanaListener.stopListening();
        }
        
        // Close all WebSocket connections
        console.log('Closing WebSocket connections...');
        io.disconnectSockets(true);
        
        // Close HTTP server
        console.log('Closing HTTP server...');
        server.close((err) => {
            if (err) {
                console.error('Error closing server:', err);
                process.exit(1);
            }
            console.log('Server closed successfully');
            process.exit(0);
        });
        
        // Force exit after 10 seconds if graceful shutdown fails
        setTimeout(() => {
            console.log('Force closing after timeout...');
            process.exit(1);
        }, 10000);
        
    } catch (error) {
        console.error('Error during shutdown:', error);
        process.exit(1);
    }
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGUSR2', () => shutdown('SIGUSR2')); // For nodemon

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
    shutdown('uncaughtException');
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
    shutdown('unhandledRejection');
});

// Start server
const PORT = process.env.PORT || 3000;

server.listen(PORT, async () => {
    console.log(`Banana Flip Backend running on port ${PORT}`);
    await initializeServices();
});

module.exports = app;