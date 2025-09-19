# Pump Lotto Backend Documentation

Welcome to the Pump Lotto Backend documentation. This directory contains comprehensive documentation for the backend system that powers the Pump Lotto sweepstakes platform.

## Documentation Structure

- **[API Documentation](./api.md)** - Complete REST API and WebSocket event reference
- **[Architecture](./architecture.md)** - System architecture and component overview
- **[Database Schema](./database.md)** - Database structure and relationships
- **[Services](./services.md)** - Service layer documentation
- **[Deployment](./deployment.md)** - Deployment and infrastructure guides
- **[Configuration](./configuration.md)** - Environment variables and configuration options
- **[Development](./development.md)** - Local development setup and guidelines
- **[Troubleshooting](./troubleshooting.md)** - Common issues and solutions

## Quick Start

1. Read the [Development Guide](./development.md) for local setup
2. Check the [Configuration Guide](./configuration.md) for environment setup
3. Review the [API Documentation](./api.md) for integration details

## Project Overview

Pump Lotto is a real-time sweepstakes platform that monitors Solana blockchain transactions for token purchases and automatically conducts draws every 20 minutes. The backend serves as the authoritative engine managing game cycles, participant tracking, and winner selection.

## Key Features

- **Real-time Blockchain Monitoring** - Continuous monitoring of Solana transactions
- **Automated Game Cycles** - 20-minute game rounds with automatic draw execution
- **WebSocket Communication** - Real-time updates to connected clients
- **Fair Draw System** - Provably fair winner selection algorithm
- **Comprehensive API** - RESTful endpoints for game state and historical data