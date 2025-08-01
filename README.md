# LINE Webhook Receiver

A Next.js application for receiving and processing LINE Messaging API webhooks with PostgreSQL storage and Bull queue processing.

## Features

- 🔐 Secure webhook signature validation (HMAC-SHA256)
- 💾 PostgreSQL storage with idempotency
- 🔄 Asynchronous processing with Bull queue
- 📊 Monitoring endpoints for queue status
- 🚀 PM2 cluster mode deployment
- 🔍 Redis caching for performance

## Quick Start

### Prerequisites

- Node.js 20.x or higher
- PostgreSQL server (configured at 192.168.11.50)
- Redis server
- LINE Messaging API channel

### Installation

```bash
# Install dependencies
npm install

# Run database migration
npm run db:migrate

# Start development servers
npm run dev        # Web server on port 3002
npm run worker:dev # Worker process
```

### Production Deployment

```bash
# Build the application
npm run build

# Start with PM2
npm run pm2:start

# View logs
npm run pm2:logs
```

## Project Structure

```
/
├── app/                    # Next.js App Router
│   └── api/
│       ├── chat/line/webhook/  # Webhook endpoint
│       └── monitoring/         # Monitoring endpoints
├── lib/                    # Utilities
│   ├── db.ts              # PostgreSQL connection
│   ├── redis.ts           # Redis client
│   ├── queue.ts           # Bull queue setup
│   └── line-validator.ts  # Signature validation
├── types/                  # TypeScript types
├── repositories/           # Database operations
├── workers/                # Background processors
├── migrations/             # SQL migrations
└── scripts/                # Utility scripts
```

## API Endpoints

### Webhook Endpoint
- **POST** `/api/chat/line/webhook` - Receives LINE webhooks
- **GET** `/api/chat/line/webhook` - Health check

### Monitoring
- **GET** `/api/monitoring/queue` - Queue and processing statistics

## Configuration

Environment variables are stored in `.env.local` (development) and `.env.production`:

```env
PORT=3002
DB_HOST=192.168.11.50
DB_USER=dhevin
DB_PASSWORD=***
DB_NAME=setsq
LINE_CHANNEL_ACCESS_TOKEN=***
LINE_CHANNEL_SECRET=***
REDIS_URL=redis://localhost:6379
QUEUE_CONCURRENCY=5
QUEUE_MAX_RETRIES=3
```

## Testing

```bash
# Test webhook locally
npm run test:webhook

# Monitor queue status
curl http://localhost:3002/api/monitoring/queue
```

## Database Schema

The application uses PostgreSQL with schema `chat`:

```sql
chat.line_webhook_events
├── id (SERIAL PRIMARY KEY)
├── webhook_event_id (VARCHAR UNIQUE)
├── event_type (VARCHAR)
├── timestamp (TIMESTAMP)
├── source (JSONB)
├── raw_data (JSONB)
├── processing_status (VARCHAR)
└── ...
```

## Event Processing Flow

1. LINE sends webhook to `/api/chat/line/webhook`
2. Signature validation with Redis caching
3. Store event in PostgreSQL (idempotent)
4. Queue for async processing
5. Return 200 OK immediately
6. Worker processes event based on type
7. Update processing status

## Monitoring

Check application health:

```bash
# Queue statistics
curl http://localhost:3002/api/monitoring/queue

# PM2 process status
pm2 status

# View logs
pm2 logs line-webhook-app
pm2 logs line-webhook-worker
```

## Troubleshooting

### Common Issues

1. **Signature validation fails**
   - Verify LINE_CHANNEL_SECRET is correct
   - Check request body is raw (not parsed)

2. **Database connection errors**
   - Verify PostgreSQL credentials
   - Check network connectivity to 192.168.11.50

3. **Queue processing stuck**
   - Check Redis connection
   - Monitor failed jobs in queue

### Debug Commands

```sql
-- Check recent events
SELECT * FROM chat.line_webhook_events 
ORDER BY created_at DESC LIMIT 10;

-- Check failed events
SELECT * FROM chat.line_webhook_events 
WHERE processing_status = 'failed';
```

## Security Notes

- Never log channel secret or access token
- Always validate webhook signatures
- Use environment variables for secrets
- Implement rate limiting for production