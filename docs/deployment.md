# Deployment Guide

## Overview

This guide covers deploying the Pump Lotto backend to various environments including local development, staging, and production.

## Prerequisites

### System Requirements
- **Node.js**: Version 18.x or higher
- **MySQL**: Version 8.0 or higher
- **Memory**: Minimum 512MB RAM (2GB+ recommended for production)
- **Storage**: 10GB+ for logs and database
- **Network**: Reliable internet connection for Solana RPC access

### External Dependencies
- **Solana RPC Access**: Reliable RPC endpoint (recommended: multiple providers)
- **Database**: MySQL server with appropriate user permissions
- **Process Manager**: PM2 for production deployments

## Environment Setup

### Local Development

1. **Clone and Install**
```bash
git clone <repository-url>
cd pump-lotto-backend
npm install
```

2. **Database Setup**
```bash
# Create database and user
mysql -u root -p
CREATE DATABASE banana_flip;
CREATE USER 'banana_user'@'localhost' IDENTIFIED BY 'secure_password';
GRANT ALL PRIVILEGES ON banana_flip.* TO 'banana_user'@'localhost';
FLUSH PRIVILEGES;

# Import schema
mysql -u banana_user -p banana_flip < database/schema.sql
```

3. **Environment Configuration**
```bash
cp .env.example .env
# Edit .env with your configuration
```

4. **Start Development Server**
```bash
npm run dev
```

### Production Deployment

#### Option 1: Traditional VPS/Server

1. **Server Setup**
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install MySQL
sudo apt install mysql-server -y
sudo mysql_secure_installation

# Install PM2
sudo npm install -g pm2
```

2. **Application Deployment**
```bash
# Clone repository
git clone <repository-url> /opt/pump-lotto-backend
cd /opt/pump-lotto-backend

# Install dependencies
npm ci --only=production

# Setup database
mysql -u root -p < database/schema.sql

# Configure environment
cp .env.example .env
# Edit .env with production values

# Start with PM2
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

3. **PM2 Configuration** (`ecosystem.config.js`)
```javascript
module.exports = {
  apps: [{
    name: 'pump-lotto-backend',
    script: 'server.js',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: '/var/log/pump-lotto/error.log',
    out_file: '/var/log/pump-lotto/out.log',
    log_file: '/var/log/pump-lotto/combined.log',
    time: true
  }]
};
```

#### Option 2: Docker Deployment

1. **Dockerfile**
```dockerfile
FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./
RUN npm ci --only=production

# Copy application
COPY . .

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodejs -u 1001
USER nodejs

EXPOSE 3000

CMD ["node", "server.js"]
```

2. **Docker Compose** (`docker-compose.yml`)
```yaml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
    env_file:
      - .env
    depends_on:
      - mysql
    restart: unless-stopped

  mysql:
    image: mysql:8.0
    environment:
      MYSQL_ROOT_PASSWORD: ${DB_ROOT_PASSWORD}
      MYSQL_DATABASE: ${DB_NAME}
      MYSQL_USER: ${DB_USER}
      MYSQL_PASSWORD: ${DB_PASSWORD}
    volumes:
      - mysql_data:/var/lib/mysql
      - ./database/schema.sql:/docker-entrypoint-initdb.d/schema.sql
    restart: unless-stopped

volumes:
  mysql_data:
```

3. **Deploy with Docker**
```bash
# Build and start
docker-compose up -d

# View logs
docker-compose logs -f app

# Scale if needed
docker-compose up -d --scale app=2
```

#### Option 3: Cloud Deployment (AWS)

1. **EC2 Instance Setup**
```bash
# Use Amazon Linux 2
sudo yum update -y
sudo yum install -y nodejs npm git

# Install PM2
sudo npm install -g pm2

# Setup application (similar to VPS setup)
```

2. **RDS Database**
- Create MySQL RDS instance
- Configure security groups
- Import schema via MySQL client

3. **Load Balancer**
- Application Load Balancer for multiple instances
- Health check on `/health` endpoint
- SSL certificate for HTTPS

## Environment Variables

### Required Variables
```bash
# Database
DB_HOST=localhost
DB_USER=banana_user
DB_PASSWORD=secure_password
DB_NAME=banana_flip

# Solana Configuration
SOLANA_NETWORK=mainnet
TOKEN_MINT_ADDRESS_MAINNET=your_token_mint_address
MIN_SOL_AMOUNT=0.040

# Game Configuration
GAME_DURATION_MINUTES=20
PORT=3000
```

### Optional Variables
```bash
# Multiple RPC endpoints for redundancy
SOLANA_RPC_URL_MAINNET=https://solana-rpc.publicnode.com
SOLANA_RPC_URL_BACKUP=https://api.mainnet-beta.solana.com

# Logging
LOG_LEVEL=info
LOG_FILE=/var/log/pump-lotto/app.log

# Performance
MAX_WEBSOCKET_CONNECTIONS=1000
DB_CONNECTION_LIMIT=10
```

## SSL/TLS Configuration

### Nginx Reverse Proxy
```nginx
server {
    listen 80;
    server_name your-domain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com;

    ssl_certificate /path/to/certificate.crt;
    ssl_certificate_key /path/to/private.key;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## Monitoring and Logging

### Health Checks
```bash
# Basic health check
curl http://localhost:3000/health

# Detailed status
curl http://localhost:3000/api/v1/gamestate
```

### Log Management
```bash
# PM2 logs
pm2 logs pump-lotto-backend

# System logs
journalctl -u pump-lotto-backend -f

# Log rotation
sudo logrotate -d /etc/logrotate.d/pump-lotto
```

### Monitoring Setup
- **PM2 Monitoring**: `pm2 monitor`
- **Custom Metrics**: Application-level metrics
- **Alerting**: Set up alerts for service downtime
- **Database Monitoring**: MySQL performance metrics

## Backup and Recovery

### Database Backups
```bash
# Daily backup script
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
mysqldump -u $DB_USER -p$DB_PASSWORD $DB_NAME > /backups/banana_flip_$DATE.sql
find /backups -name "banana_flip_*.sql" -mtime +7 -delete
```

### Application Backups
```bash
# Code and configuration backup
tar -czf /backups/app_$DATE.tar.gz /opt/pump-lotto-backend --exclude=node_modules
```

## Security Considerations

### Firewall Configuration
```bash
# UFW setup
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh
sudo ufw allow 80
sudo ufw allow 443
sudo ufw enable
```

### Database Security
- Use strong passwords
- Limit database user permissions
- Enable SSL for database connections
- Regular security updates

### Application Security
- Keep dependencies updated
- Use environment variables for secrets
- Implement rate limiting
- Monitor for suspicious activity

## Troubleshooting

### Common Issues

1. **Database Connection Errors**
```bash
# Check MySQL status
sudo systemctl status mysql

# Check connection
mysql -u $DB_USER -p $DB_NAME -e "SELECT 1"
```

2. **Solana RPC Issues**
```bash
# Test RPC connection
curl -X POST -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"getHealth"}' \
  $SOLANA_RPC_URL
```

3. **WebSocket Connection Issues**
```bash
# Check port availability
netstat -tlnp | grep :3000

# Test WebSocket
wscat -c ws://localhost:3000
```

### Performance Optimization

1. **Database Optimization**
```sql
-- Analyze slow queries
SHOW PROCESSLIST;
SHOW FULL PROCESSLIST;

-- Optimize tables
OPTIMIZE TABLE games, participants, winners;
```

2. **Application Tuning**
- Increase Node.js memory limit if needed
- Optimize database connection pool size
- Monitor CPU and memory usage

3. **Network Optimization**
- Use CDN for static assets
- Implement compression
- Optimize WebSocket heartbeat intervals