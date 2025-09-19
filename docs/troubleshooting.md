# Troubleshooting Guide

## Common Issues and Solutions

### Database Issues

#### Connection Refused
**Error**: `Error: connect ECONNREFUSED 127.0.0.1:3306`

**Causes & Solutions**:
1. **MySQL not running**
   ```bash
   # Check MySQL status
   sudo systemctl status mysql
   
   # Start MySQL
   sudo systemctl start mysql
   ```

2. **Wrong connection parameters**
   ```bash
   # Test connection manually
   mysql -h $DB_HOST -u $DB_USER -p$DB_PASSWORD $DB_NAME
   ```

3. **Firewall blocking connection**
   ```bash
   # Check if port 3306 is open
   sudo ufw status
   sudo ufw allow 3306
   ```

#### Authentication Failed
**Error**: `ER_ACCESS_DENIED_ERROR: Access denied for user`

**Solutions**:
```sql
-- Reset user permissions
DROP USER IF EXISTS 'banana_user'@'localhost';
CREATE USER 'banana_user'@'localhost' IDENTIFIED BY 'new_password';
GRANT ALL PRIVILEGES ON banana_flip.* TO 'banana_user'@'localhost';
FLUSH PRIVILEGES;
```

#### Table Doesn't Exist
**Error**: `ER_NO_SUCH_TABLE: Table 'banana_flip.games' doesn't exist`

**Solution**:
```bash
# Import schema
mysql -u $DB_USER -p$DB_PASSWORD $DB_NAME < database/schema.sql

# Verify tables exist
mysql -u $DB_USER -p$DB_PASSWORD $DB_NAME -e "SHOW TABLES;"
```

### Solana Integration Issues

#### RPC Connection Timeout
**Error**: `Error: fetch timeout` or `ENOTFOUND`

**Solutions**:
1. **Check RPC endpoint availability**
   ```bash
   curl -X POST -H "Content-Type: application/json" \
     -d '{"jsonrpc":"2.0","id":1,"method":"getHealth"}' \
     $SOLANA_RPC_URL
   ```

2. **Use alternative RPC endpoints**
   ```bash
   # Add to .env
   SOLANA_RPC_URL_MAINNET=https://api.mainnet-beta.solana.com
   SOLANA_RPC_URL_BACKUP=https://solana-api.projectserum.com
   ```

3. **Implement RPC failover**
   ```javascript
   const rpcEndpoints = [
       process.env.SOLANA_RPC_URL_MAINNET,
       process.env.SOLANA_RPC_URL_BACKUP
   ];
   
   async function connectWithFailover() {
       for (const endpoint of rpcEndpoints) {
           try {
               const connection = new Connection(endpoint);
               await connection.getHealth();
               return connection;
           } catch (error) {
               console.warn(`Failed to connect to ${endpoint}:`, error.message);
           }
       }
       throw new Error('All RPC endpoints failed');
   }
   ```

#### Invalid Token Address
**Error**: `Invalid mint address` or no transactions detected

**Solutions**:
1. **Verify token address format**
   ```javascript
   const { PublicKey } = require('@solana/web3.js');
   try {
       new PublicKey(process.env.TOKEN_MINT_ADDRESS_MAINNET);
       console.log('Token address is valid');
   } catch (error) {
       console.error('Invalid token address:', error.message);
   }
   ```

2. **Check token exists on network**
   ```bash
   # Query token info
   curl -X POST -H "Content-Type: application/json" \
     -d "{\"jsonrpc\":\"2.0\",\"id\":1,\"method\":\"getAccountInfo\",\"params\":[\"$TOKEN_MINT_ADDRESS\"]}" \
     $SOLANA_RPC_URL
   ```

#### Rate Limiting
**Error**: `429 Too Many Requests`

**Solutions**:
1. **Implement request throttling**
   ```javascript
   const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
   
   async function throttledRequest(requestFn, delayMs = 1000) {
       try {
           return await requestFn();
       } catch (error) {
           if (error.message.includes('429')) {
               console.log('Rate limited, waiting...');
               await delay(delayMs);
               return throttledRequest(requestFn, delayMs * 2);
           }
           throw error;
       }
   }
   ```

2. **Use premium RPC providers**
   - QuickNode
   - Alchemy
   - Helius

### Application Issues

#### Port Already in Use
**Error**: `EADDRINUSE: address already in use :::3000`

**Solutions**:
```bash
# Find process using port
lsof -ti:3000

# Kill the process
kill -9 $(lsof -ti:3000)

# Or use different port
PORT=3001 npm start
```

#### Memory Leaks
**Symptoms**: Gradually increasing memory usage, eventual crash

**Debugging**:
```bash
# Start with memory profiling
node --inspect --max-old-space-size=1024 server.js

# Monitor memory usage
while true; do
    ps -p $(pgrep -f "node server.js") -o pid,ppid,%mem,%cpu,cmd
    sleep 10
done
```

**Common Causes & Solutions**:
1. **Unclosed database connections**
   ```javascript
   // Ensure connections are returned to pool
   try {
       const [rows] = await db.execute(query, params);
       return rows;
   } catch (error) {
       // Connection automatically returned on error
       throw error;
   }
   ```

2. **Event listener accumulation**
   ```javascript
   // Remove old listeners before adding new ones
   socket.removeAllListeners('disconnect');
   socket.on('disconnect', handleDisconnect);
   ```

3. **Large object retention**
   ```javascript
   // Clear large objects when done
   let largeData = await fetchLargeDataset();
   processData(largeData);
   largeData = null; // Allow garbage collection
   ```

#### WebSocket Connection Issues

**Error**: `WebSocket connection failed`

**Debugging**:
```bash
# Test WebSocket connectivity
npm install -g wscat
wscat -c ws://localhost:3000
```

**Solutions**:
1. **CORS configuration**
   ```javascript
   const io = socketIo(server, {
       cors: {
           origin: ["http://localhost:3001", "https://yourdomain.com"],
           methods: ["GET", "POST"]
       }
   });
   ```

2. **Firewall/Proxy issues**
   ```bash
   # Check if WebSocket upgrade is allowed
   curl -i -N -H "Connection: Upgrade" \
        -H "Upgrade: websocket" \
        -H "Sec-WebSocket-Key: test" \
        -H "Sec-WebSocket-Version: 13" \
        http://localhost:3000/socket.io/
   ```

### Performance Issues

#### Slow Database Queries

**Debugging**:
```sql
-- Enable slow query log
SET GLOBAL slow_query_log = 'ON';
SET GLOBAL long_query_time = 1;
SET GLOBAL slow_query_log_file = '/var/log/mysql/slow.log';

-- Check current queries
SHOW PROCESSLIST;

-- Analyze slow queries
EXPLAIN SELECT * FROM participants WHERE game_id = 1;
```

**Solutions**:
1. **Add missing indexes**
   ```sql
   CREATE INDEX idx_participants_game_entry ON participants(game_id, entry_time);
   CREATE INDEX idx_games_status_end ON games(status, end_time);
   ```

2. **Optimize queries**
   ```sql
   -- Instead of SELECT *
   SELECT wallet_address, sol_amount FROM participants WHERE game_id = ?;
   
   -- Use LIMIT for large result sets
   SELECT * FROM winners ORDER BY won_at DESC LIMIT 100;
   ```

#### High CPU Usage

**Debugging**:
```bash
# Monitor CPU usage
top -p $(pgrep -f "node server.js")

# Profile with clinic.js
npm install -g clinic
clinic doctor -- node server.js
```

**Common Causes**:
1. **Infinite loops in cron jobs**
2. **Excessive WebSocket broadcasting**
3. **Unoptimized blockchain polling**

**Solutions**:
```javascript
// Add circuit breaker for external calls
let consecutiveFailures = 0;
const MAX_FAILURES = 5;

async function robustApiCall(apiFunction) {
    if (consecutiveFailures >= MAX_FAILURES) {
        throw new Error('Circuit breaker open');
    }
    
    try {
        const result = await apiFunction();
        consecutiveFailures = 0;
        return result;
    } catch (error) {
        consecutiveFailures++;
        throw error;
    }
}
```

### Deployment Issues

#### PM2 Process Crashes

**Debugging**:
```bash
# Check PM2 logs
pm2 logs pump-lotto-backend

# Check process status
pm2 status

# Monitor in real-time
pm2 monit
```

**Solutions**:
1. **Increase memory limit**
   ```javascript
   // ecosystem.config.js
   module.exports = {
     apps: [{
       name: 'pump-lotto-backend',
       script: 'server.js',
       max_memory_restart: '1G',
       instances: 1,
       autorestart: true
     }]
   };
   ```

2. **Add error handling**
   ```javascript
   process.on('uncaughtException', (error) => {
       console.error('Uncaught Exception:', error);
       // Graceful shutdown
       shutdown('uncaughtException');
   });
   ```

#### Docker Container Issues

**Container won't start**:
```bash
# Check container logs
docker logs pump-lotto-backend

# Debug interactively
docker run -it --entrypoint /bin/sh pump-lotto-backend

# Check environment variables
docker exec pump-lotto-backend env
```

**Database connection from container**:
```bash
# Use host networking for local development
docker run --network host pump-lotto-backend

# Or use container networking
docker run --link mysql-container pump-lotto-backend
```

## Monitoring and Alerts

### Health Check Script

```bash
#!/bin/bash
# health-check.sh

API_URL="http://localhost:3000"
HEALTH_ENDPOINT="$API_URL/health"

# Check API health
response=$(curl -s -o /dev/null -w "%{http_code}" $HEALTH_ENDPOINT)
if [ $response -ne 200 ]; then
    echo "API health check failed: HTTP $response"
    exit 1
fi

# Check database connectivity
response=$(curl -s "$API_URL/api/v1/gamestate")
if [[ $response == *"error"* ]]; then
    echo "Database connectivity check failed"
    exit 1
fi

echo "All health checks passed"
```

### Log Analysis

```bash
# Monitor error patterns
tail -f /var/log/pump-lotto/error.log | grep -E "(ERROR|FATAL)"

# Count error types
grep "Error:" /var/log/pump-lotto/app.log | cut -d: -f2 | sort | uniq -c | sort -nr

# Monitor WebSocket connections
grep "Client connected\|Client disconnected" /var/log/pump-lotto/app.log | tail -20
```

### Performance Monitoring

```javascript
// Add to server.js for basic metrics
let requestCount = 0;
let errorCount = 0;
let activeConnections = 0;

app.use((req, res, next) => {
    requestCount++;
    const start = Date.now();
    
    res.on('finish', () => {
        const duration = Date.now() - start;
        if (res.statusCode >= 400) errorCount++;
        
        console.log(`${req.method} ${req.path} - ${res.statusCode} - ${duration}ms`);
    });
    
    next();
});

// Metrics endpoint
app.get('/metrics', (req, res) => {
    res.json({
        requests_total: requestCount,
        errors_total: errorCount,
        active_websocket_connections: activeConnections,
        uptime_seconds: process.uptime(),
        memory_usage: process.memoryUsage()
    });
});
```

## Emergency Procedures

### Service Recovery

1. **Quick restart**:
   ```bash
   pm2 restart pump-lotto-backend
   ```

2. **Database recovery**:
   ```bash
   # Restore from backup
   mysql -u $DB_USER -p$DB_PASSWORD $DB_NAME < /backups/latest_backup.sql
   ```

3. **Force game completion**:
   ```sql
   -- If a game is stuck, manually complete it
   UPDATE games SET status = 'completed' WHERE game_id = ? AND status = 'running';
   ```

### Rollback Procedures

1. **Code rollback**:
   ```bash
   git checkout previous-stable-tag
   npm ci --only=production
   pm2 restart pump-lotto-backend
   ```

2. **Database rollback**:
   ```bash
   # Stop application first
   pm2 stop pump-lotto-backend
   
   # Restore database
   mysql -u $DB_USER -p$DB_PASSWORD $DB_NAME < /backups/pre_deployment_backup.sql
   
   # Restart application
   pm2 start pump-lotto-backend
   ```

### Contact Escalation

For critical issues that cannot be resolved:

1. Check recent deployments and changes
2. Review error logs for patterns
3. Verify external service status (Solana RPC, database)
4. Contact team lead or DevOps engineer
5. Consider temporary service degradation vs. full outage