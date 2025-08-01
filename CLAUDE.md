# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with the LINE Webhook integration in this Next.js project.

## Project Overview

This is a new Next.js 15.x application with App Router for handling LINE Messaging API webhooks. The system receives webhooks from LINE, validates signatures, stores events in PostgreSQL (schema: chat), and processes them asynchronously using Bull queue with Redis.

## Architecture

- **Framework**: Next.js 15.x with App Router
- **Language**: TypeScript with strict mode
- **Database**: PostgreSQL (Remote: 192.168.11.50, Schema: chat)
- **Queue System**: Bull/BullMQ with Redis
- **Cache**: Redis for idempotency and validation caching
- **Process Manager**: PM2 in cluster mode
- **Environment**: Node.js 20.x LTS

## Development Commands

```bash
# Install dependencies
npm install

# Run development server on port 3002
npm run dev

# Build for production
npm run build

# Start production server with PM2
pm2 start ecosystem.config.js --env production

# Run tests
npm run test

# Lint code
npm run lint

# Database migrations
npm run migrate:up
npm run migrate:down
```

## Project Structure

```
/
├── /app                        # App Router directory
│   ├── /api
│   │   └── /chat
│   │       └── /line
│   │           └── /webhook
│   │               └── route.ts  # Webhook endpoint
│   ├── layout.tsx
│   └── page.tsx
├── /lib                        # Shared utilities
│   ├── line-validator.ts      # Signature validation
│   ├── queue.ts              # Bull queue setup
│   ├── db.ts                 # Database connection pool
│   └── redis.ts              # Redis client
├── /types                     # TypeScript types
│   └── line.types.ts         # LINE webhook types
├── /repositories             # Database access layer
│   └── webhook.repository.ts # CRUD operations
├── /workers                  # Background job processors
│   └── line-processor.ts     # Process webhook events
├── /migrations              # Database migrations
│   └── 001_create_webhook_events.sql
├── ecosystem.config.js      # PM2 configuration
├── .env.local              # Development environment
├── .env.production         # Production environment
└── next.config.js          # Next.js configuration
```

## Environment Variables

```bash
# Server Configuration
PORT=3002
NODE_ENV=production

# Database Configuration
DB_HOST="192.168.11.50"
DB_USER="dhevin"
DB_PASSWORD="Dhev!nLewch@lermw0ngse"
DB_NAME="setsq"
DB_PORT="5432"

# LINE Configuration
LINE_CHANNEL_ACCESS_TOKEN="uk7+MvcHWUIbVI4uJ1nhgpSTm911VAJF3Y2iZ9lKMBQv2/o/YGBPxIznR+LlZQEVjj25i0rk0DR3yoWYfBGMNx5PExDz/Yt3qEX2FmSXJhxdG+KtYoRS3S2XTkFEDIausEGtvSkJB/EaNpMUeqO1cgdB04t89/1O/w1cDnyilFU="
LINE_CHANNEL_SECRET="d9f03ba9523a251ef79b6bcfdf0ff4ab"
LINE_PUBLIC_URL="https://dev.line.setsq.com"

# Redis Configuration
REDIS_URL="redis://localhost:6379"

# Queue Configuration
QUEUE_CONCURRENCY=5
QUEUE_MAX_RETRIES=3
```

## Database Schema

```sql
-- Schema: chat
CREATE SCHEMA IF NOT EXISTS chat;

-- Table: chat.line_webhook_events
CREATE TABLE chat.line_webhook_events (
  id SERIAL PRIMARY KEY,
  webhook_event_id VARCHAR(255) UNIQUE NOT NULL,  -- LINE's unique ID
  event_type VARCHAR(100) NOT NULL,               -- message, follow, etc.
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL,    -- Event timestamp from LINE
  source JSONB NOT NULL,                          -- User/group/room info
  raw_data JSONB NOT NULL,                        -- Complete webhook payload
  processed_at TIMESTAMP WITH TIME ZONE,          -- When we processed it
  processing_status VARCHAR(50) DEFAULT 'pending', -- pending, processing, completed, failed
  retry_count INTEGER DEFAULT 0,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Indexes for performance
  INDEX idx_webhook_event_type (event_type),
  INDEX idx_webhook_status (processing_status),
  INDEX idx_webhook_created (created_at)
);

-- Additional tables can be added here for processed data
```

## Webhook Processing Flow

### 1. Webhook Entry Point
**Location**: `/app/api/chat/line/webhook/route.ts`

```
LINE Server → POST /api/chat/line/webhook → Your Server
```

```typescript
export async function POST(request: Request) {
  const signature = request.headers.get('x-line-signature');
  const body = await request.text();
  
  // 1. Validate signature
  if (!validateSignature(body, process.env.LINE_CHANNEL_SECRET!, signature)) {
    return new Response('Unauthorized', { status: 401 });
  }
  
  // 2. Parse events
  const { events } = JSON.parse(body);
  
  // 3. Store and queue each event
  for (const event of events) {
    await storeAndQueueEvent(event);
  }
  
  // 4. Return 200 immediately
  return new Response('OK', { status: 200 });
}
```

### 2. Signature Verification
**Location**: `/lib/line-validator.ts`

```typescript
export async function validateSignature(
  body: string,
  channelSecret: string,
  signature: string | null
): Promise<boolean> {
  // Check Redis cache first
  const cacheKey = `sig:${signature}`;
  const cached = await redis.get(cacheKey);
  if (cached) return cached === 'valid';
  
  // Compute HMAC-SHA256
  const hash = crypto
    .createHmac('sha256', channelSecret)
    .update(body)
    .digest('base64');
    
  const isValid = hash === signature;
  
  // Cache result for 5 minutes
  await redis.setex(cacheKey, 300, isValid ? 'valid' : 'invalid');
  
  return isValid;
}
```

### 3. Event Storage & Queueing
**Location**: `/repositories/webhook.repository.ts`

```typescript
export async function storeAndQueueEvent(event: LineWebhookEvent) {
  // Store in database with idempotency check
  const stored = await db.query(`
    INSERT INTO chat.line_webhook_events (
      webhook_event_id,
      event_type,
      timestamp,
      source,
      raw_data
    ) VALUES ($1, $2, $3, $4, $5)
    ON CONFLICT (webhook_event_id) DO NOTHING
    RETURNING id
  `, [
    event.webhookEventId,
    event.type,
    new Date(event.timestamp),
    event.source,
    event
  ]);
  
  // Only queue if newly inserted
  if (stored.rows.length > 0) {
    await lineQueue.add('process-event', {
      id: stored.rows[0].id,
      eventId: event.webhookEventId,
      type: event.type
    });
  }
}
```

### 4. Asynchronous Processing
**Location**: `/workers/line-processor.ts`

```typescript
lineQueue.process('process-event', async (job) => {
  const { id, eventId, type } = job.data;
  
  try {
    // Mark as processing
    await updateEventStatus(id, 'processing');
    
    // Process based on event type
    switch (type) {
      case 'message':
        await processMessageEvent(id);
        break;
      case 'follow':
        await processFollowEvent(id);
        break;
      case 'unfollow':
        await processUnfollowEvent(id);
        break;
      // ... other event types
    }
    
    // Mark as completed
    await updateEventStatus(id, 'completed');
    
  } catch (error) {
    // Log error and mark as failed
    await updateEventStatus(id, 'failed', error.message);
    throw error; // Let Bull handle retry
  }
});
```

## Key Features

1. **Idempotency**: Uses `webhook_event_id` to prevent duplicate processing
2. **Reliability**: Stores raw events before processing
3. **Scalability**: Async processing with Bull queue
4. **Monitoring**: Processing status tracking
5. **Error Recovery**: Automatic retries with exponential backoff
6. **Performance**: Redis caching for signature validation

## PM2 Configuration

```javascript
// ecosystem.config.js
module.exports = {
  apps: [
    {
      name: 'line-webhook-app',
      script: 'node_modules/next/dist/bin/next',
      args: 'start',
      instances: 2,
      exec_mode: 'cluster',
      max_memory_restart: '1G',
      env: {
        PORT: 3002,
        NODE_ENV: 'production'
      },
      error_file: './logs/pm2-error.log',
      out_file: './logs/pm2-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z'
    },
    {
      name: 'line-webhook-worker',
      script: './workers/line-processor.js',
      instances: 1,
      max_memory_restart: '512M',
      env: {
        NODE_ENV: 'production'
      }
    }
  ]
};
```

## Common Tasks

### Testing Webhook Locally
```bash
# Use ngrok or similar for local testing
ngrok http 3002

# Update LINE webhook URL to ngrok URL
# Send test webhook
curl -X POST http://localhost:3002/api/chat/line/webhook \
  -H "Content-Type: application/json" \
  -H "x-line-signature: [computed signature]" \
  -d @test-webhook.json
```

### Monitoring Queue
```bash
# Check queue status
npm run queue:status

# View failed jobs
npm run queue:failed

# Retry failed jobs
npm run queue:retry
```

### Database Queries
```sql
-- Check recent webhooks
SELECT * FROM chat.line_webhook_events 
ORDER BY created_at DESC LIMIT 10;

-- Check processing status
SELECT processing_status, COUNT(*) 
FROM chat.line_webhook_events 
GROUP BY processing_status;

-- Find failed events
SELECT * FROM chat.line_webhook_events 
WHERE processing_status = 'failed';
```

## Notes

- LINE webhooks timeout after 1 second - always respond quickly
- `webhook_event_id` is unique per event - use for idempotency
- Signature validation uses HMAC-SHA256 with channel secret
- Store raw events first, process async for reliability
- Monitor queue depth and processing lag
- Set up alerts for high failure rates