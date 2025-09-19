# API Documentation

## REST API Endpoints

### GET /api/v1/gamestate

Returns the current game state including active participants, game timing, and recent winners.

**Response:**
```json
{
  "end_time": "2024-01-01T12:20:00.000Z",
  "participants": [
    {
      "wallet_address": "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU",
      "sol_amount": 0.045
    }
  ],
  "current_prize_pool": 0.00045,
  "current_volume": 0.045,
  "recent_winners": [
    {
      "winner_address": "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU",
      "start_time": "2024-01-01T12:00:00.000Z",
      "won_at": "2024-01-01T12:20:15.000Z",
      "total_participants": 15,
      "shortlist_size": 15,
      "game_id": 123,
      "prize_pool": 0.0015,
      "total_volume": 1.5
    }
  ]
}
```

### GET /api/v1/winners

Returns paginated list of all winners.

**Query Parameters:**
- `limit` (optional): Number of results to return (default: 100, max: 100)

**Response:**
```json
{
  "winners": [
    {
      "winner_address": "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU",
      "game_id": 123,
      "start_time": "2024-01-01T12:00:00.000Z",
      "won_at": "2024-01-01T12:20:15.000Z",
      "total_participants": 15,
      "shortlist_size": 15
    }
  ]
}
```

### GET /api/v1/winners/:address/stats

Returns statistics for a specific wallet address.

**Response:**
```json
{
  "wallet_address": "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU",
  "total_wins": 3,
  "first_win": "2024-01-01T10:20:15.000Z",
  "latest_win": "2024-01-01T16:20:15.000Z"
}
```

### GET /health

Health check endpoint for monitoring.

**Response:**
```json
{
  "status": "OK",
  "timestamp": "2024-01-01T12:00:00.000Z"
}
```

## WebSocket Events

### Client -> Server

Currently, no client-to-server events are implemented. The WebSocket connection is used for server-to-client communication only.

### Server -> Client

#### new_participant

Emitted when a new valid participant joins the current game.

**Payload:**
```json
{
  "wallet_address": "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU",
  "sol_amount": 0.045
}
```

#### winner_declared

Emitted when a game ends and a winner is selected.

**Payload:**
```json
{
  "winner": "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU",
  "shortlist": [
    "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU",
    "8yLYug3DW98e98UKTEqcbE6lcifeTrB94UaSfKjtdBtV"
  ]
}
```

#### new_game_started

Emitted when a new 20-minute game cycle begins.

**Payload:**
```json
{
  "end_time": "2024-01-01T12:20:00.000Z"
}
```

## Error Responses

All API endpoints return appropriate HTTP status codes:

- `200` - Success
- `404` - Resource not found
- `500` - Internal server error

Error responses include a JSON object with an error message:

```json
{
  "error": "Internal server error"
}
```

## Rate Limiting

Currently, no rate limiting is implemented. Consider implementing rate limiting for production deployments.

## Authentication

No authentication is currently required for any endpoints. All data is publicly accessible.