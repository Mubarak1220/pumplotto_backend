const { Connection, PublicKey } = require('@solana/web3.js');
const participantService = require('./participantService');
const gameService = require('./gameService');

class SolanaListener {
    constructor(io) {
        this.io = io;
        this.network = process.env.SOLANA_NETWORK || 'mainnet';
        
        // Select RPC URL based on network
        if (this.network === 'testnet') {
            this.rpcUrl = process.env.SOLANA_RPC_URL_TESTNET;
            this.tokenMintAddress = process.env.TOKEN_MINT_ADDRESS_TESTNET;
        } else if (this.network === 'devnet') {
            this.rpcUrl = process.env.SOLANA_RPC_URL_DEVNET;
            this.tokenMintAddress = process.env.TOKEN_MINT_ADDRESS_DEVNET;
        } else {
            this.rpcUrl = process.env.SOLANA_RPC_URL_MAINNET;
            this.tokenMintAddress = process.env.TOKEN_MINT_ADDRESS_MAINNET;
        }
        this.minSolAmount = parseFloat(process.env.MIN_SOL_AMOUNT) || 0.040;
        
        this.connection = new Connection(this.rpcUrl, {
            commitment: 'confirmed',
            wsEndpoint: null, // Disable websocket to avoid connection issues
        });
        this.isListening = false;
        this.lastProcessedSlot = null;
        this.retryCount = 0;
        this.maxRetries = 3;
        this.backoffMs = 1000;
    }
    
    async startListening() {
        if (this.isListening) return;
        
        console.log(`Starting Solana listener on ${this.network.toUpperCase()}...`);
        console.log(`RPC URL: ${this.rpcUrl}`);
        console.log(`Token Mint: ${this.tokenMintAddress}`);
        console.log(`Min SOL Amount: ${this.minSolAmount}`);
        
        // Validate configuration before starting
        if (!this.tokenMintAddress || 
            this.tokenMintAddress === 'INSERT_YOUR_MAINNET_TOKEN_MINT_ADDRESS_HERE' ||
            this.tokenMintAddress === 'INSERT_YOUR_DEVNET_TOKEN_MINT_ADDRESS_HERE' ||
            this.tokenMintAddress === 'INSERT_YOUR_TESTNET_TOKEN_MINT_ADDRESS_HERE') {
            console.log(`Token mint address not configured for ${this.network}, starting in monitoring mode only`);
            return;
        }
        
        try {
            this.isListening = true;
            
            // Test connection with retry
            console.log('Testing Solana RPC connection...');
            this.lastProcessedSlot = await this.retryOperation(() => this.connection.getSlot(), 5);
            console.log(`Connected! Latest slot: ${this.lastProcessedSlot}`);
            
            // Poll for new transactions every 15 seconds (further reduced to avoid timeouts)
            this.pollInterval = setInterval(() => {
                this.checkForNewTransactions();
            }, 15000);
            
            console.log('Solana listener started successfully');
            
        } catch (error) {
            console.error('Failed to start Solana listener:', error.message);
            console.log('Continuing without blockchain monitoring...');
            this.isListening = false;
            
            if (this.pollInterval) {
                clearInterval(this.pollInterval);
                this.pollInterval = null;
            }
        }
    }
    
    async stopListening() {
        if (!this.isListening) return;
        
        console.log('Stopping Solana listener...');
        this.isListening = false;
        
        if (this.pollInterval) {
            clearInterval(this.pollInterval);
            this.pollInterval = null;
        }
        
        // Clean up connection
        if (this.connection) {
            try {
                // Close any open connections
                this.connection = null;
            } catch (error) {
                console.error('Error closing Solana connection:', error);
            }
        }
        
        console.log('Solana listener stopped');
    }
    
    async checkForNewTransactions() {
        if (!this.isListening) return;
        
        try {
            const currentSlot = await this.retryOperation(() => this.connection.getSlot());
            
            if (currentSlot <= this.lastProcessedSlot) {
                return;
            }
            
            // Get signatures for the token mint address
            const signatures = await this.retryOperation(() => 
                this.connection.getSignaturesForAddress(
                    new PublicKey(this.tokenMintAddress),
                    {
                        before: undefined,
                        until: undefined,
                        limit: 25 // Further reduced limit
                    }
                )
            );
            
            // Process each signature
            for (const sigInfo of signatures) {
                if (sigInfo.slot <= this.lastProcessedSlot) {
                    continue;
                }
                
                await this.processTransaction(sigInfo.signature);
                
                // Add small delay between processing transactions
                await new Promise(resolve => setTimeout(resolve, 200));
            }
            
            this.lastProcessedSlot = currentSlot;
            this.retryCount = 0; // Reset retry count on success
            
        } catch (error) {
            console.error('Error checking for new transactions:', error.message);
            
            // Exponential backoff on repeated failures
            if (this.retryCount < this.maxRetries) {
                this.retryCount++;
                const delay = this.backoffMs * Math.pow(2, this.retryCount - 1);
                console.log(`Will retry in ${delay}ms (attempt ${this.retryCount}/${this.maxRetries})`);
            } else {
                console.log('Max retries reached, will try again in next interval');
                this.retryCount = 0; // Reset for next interval
            }
        }
    }
    
    async processTransaction(signature) {
        try {
            // Check if transaction already exists
            if (await participantService.transactionExists(signature)) {
                return;
            }
            
            // Get transaction details with retry
            const transaction = await this.retryOperation(() => 
                this.connection.getTransaction(signature, {
                    commitment: 'confirmed',
                    maxSupportedTransactionVersion: 0
                })
            );
            
            if (!transaction || !transaction.transaction) {
                console.log('Transaction data incomplete, skipping...');
                return;
            }
            
            // Validate transaction
            const isValid = await this.validateTransaction(transaction);
            if (!isValid) {
                return;
            }
            
            // Get buyer's wallet address (fee payer)
            // Handle both legacy and versioned transactions
            let walletAddress;
            if (transaction.transaction.message.accountKeys) {
                // Legacy transaction
                walletAddress = transaction.transaction.message.accountKeys[0].toString();
            } else if (transaction.transaction.message.staticAccountKeys) {
                // Versioned transaction
                walletAddress = transaction.transaction.message.staticAccountKeys[0].toString();
            } else {
                console.log('Unable to extract wallet address from transaction');
                return;
            }
            
            // Get current running game
            const currentGame = await gameService.getCurrentGame();
            if (!currentGame) {
                console.log('No running game found for transaction');
                return;
            }
            
            // Calculate SOL amount spent
            const preBalance = transaction.meta.preBalances[0];
            const postBalance = transaction.meta.postBalances[0];
            const solAmountSpent = (preBalance - postBalance) / 1000000000; // Convert lamports to SOL
            
            // Add participant with SOL amount
            const participant = await participantService.addParticipant(
                currentGame.game_id,
                walletAddress,
                signature,
                solAmountSpent
            );
            
            console.log(`New participant added: ${walletAddress}, SOL spent: ${solAmountSpent}`);
            
            // Emit new participant event with SOL amount
            this.io.emit('new_participant', {
                wallet_address: walletAddress,
                sol_amount: solAmountSpent
            });
            
        } catch (error) {
            if (error.message === 'Transaction already exists') {
                return; // Skip duplicate transactions
            }
            console.error('Error processing transaction:', error);
        }
    }
    
    async validateTransaction(transaction) {
        // Check if transaction was successful
        if (!transaction.meta || transaction.meta.err !== null) {
            return false;
        }
        
        // Check if we have balance information
        if (!transaction.meta.preBalances || !transaction.meta.postBalances || 
            transaction.meta.preBalances.length === 0 || transaction.meta.postBalances.length === 0) {
            return false;
        }
        
        // Check SOL amount based on configuration
        const minLamports = this.minSolAmount * 1000000000; // Convert SOL to lamports
        const preBalance = transaction.meta.preBalances[0];
        const postBalance = transaction.meta.postBalances[0];
        const amountSpent = preBalance - postBalance;
        
        return amountSpent >= minLamports;
    }
    
    async retryOperation(operation, maxRetries = 3) {
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                // Add timeout to prevent hanging
                return await Promise.race([
                    operation(),
                    new Promise((_, reject) => 
                        setTimeout(() => reject(new Error('Operation timeout')), 10000)
                    )
                ]);
            } catch (error) {
                if (attempt === maxRetries) {
                    throw error;
                }
                
                const delay = this.backoffMs * attempt * 2; // Longer delays
                console.log(`Operation failed (attempt ${attempt}/${maxRetries}), retrying in ${delay}ms...`);
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
    }
}

module.exports = SolanaListener;