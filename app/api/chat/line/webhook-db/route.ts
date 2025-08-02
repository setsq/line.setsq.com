import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { Pool } from 'pg';

// Create database connection directly (no imports from lib/)
const pool = new Pool({
  host: process.env.DB_HOST || '192.168.11.50',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'setsq',
  user: process.env.DB_USER || 'dhevin',
  password: process.env.DB_PASSWORD || 'Dhev!nLewch@lermw0ngse',
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Batch notification state
let pendingNotification = false;
let notificationTimer: NodeJS.Timeout | null = null;

// Function to notify App 2 about new webhook events
async function notifyApp2() {
  const apiUrl = process.env.APP2_API_URL || 'https://dev.setsq.com/api/chat/line/process-webhooks';
  const apiKey = process.env.WEBHOOK_PROCESSOR_API_KEY || 'AigddeggeKKll23';
  const channel = process.env.APP2_CHANNEL_NAME || 'line_2';

  try {
    console.log('[DB Webhook] Notifying App 2 to process events...');
    
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        channel: channel,
        limit: 50,  // Process up to 50 events per batch
        apiKey: apiKey
      })
    });

    const result = await response.json();

    if (response.ok) {
      console.log(`[DB Webhook] App 2 processed ${result.processed || 0} events successfully`);
      if (result.failed && result.failed > 0) {
        console.log(`[DB Webhook] App 2 failed to process ${result.failed} events`);
      }
    } else {
      console.error('[DB Webhook] App 2 processing failed:', result.error || 'Unknown error');
    }
  } catch (error) {
    // Don't throw - just log the error
    console.error('[DB Webhook] Failed to notify App 2:', error);
  }
}

// Schedule batch notification with debouncing
function scheduleNotification() {
  if (!pendingNotification) {
    pendingNotification = true;

    // Clear existing timer if any
    if (notificationTimer) {
      clearTimeout(notificationTimer);
    }

    // Wait 5 seconds to batch multiple webhook events
    notificationTimer = setTimeout(async () => {
      pendingNotification = false;
      notificationTimer = null;
      await notifyApp2();
    }, 5000);

    console.log('[DB Webhook] Scheduled App 2 notification in 5 seconds');
  }
}

// Simple signature validation (no external imports)
async function validateSignature(
  body: string,
  channelSecret: string,
  signature: string | null
): Promise<boolean> {
  if (!signature) {
    console.error('Missing x-line-signature header');
    return false;
  }

  const hash = crypto
    .createHmac('sha256', channelSecret)
    .update(body)
    .digest('base64');

  const isValid = hash === signature;
  if (!isValid) {
    console.error('Invalid signature:', { expected: hash, received: signature });
  }
  return isValid;
}

export async function POST(request: NextRequest) {
  console.log('[DB Webhook] Received POST request');
  
  try {
    // Get signature from header
    const signature = request.headers.get('x-line-signature');
    console.log('[DB Webhook] Signature:', signature);
    
    // Get raw body as string for signature validation
    const body = await request.text();
    console.log('[DB Webhook] Body length:', body.length);
    
    // Validate signature
    const channelSecret = process.env.LINE_CHANNEL_SECRET || 'd9f03ba9523a251ef79b6bcfdf0ff4ab';
    
    const isValid = await validateSignature(body, channelSecret, signature);
    console.log('[DB Webhook] Signature validation result:', isValid);
    
    if (!isValid) {
      console.error('[DB Webhook] ERROR: Invalid webhook signature');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse webhook payload
    let payload: any;
    try {
      payload = JSON.parse(body);
      console.log('[DB Webhook] Parsed payload with', payload.events?.length || 0, 'events');
    } catch (error) {
      console.error('[DB Webhook] ERROR: Invalid JSON payload:', error);
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }

    // Process and store each event
    let eventsStored = 0;
    
    if (payload.events && Array.isArray(payload.events)) {
      console.log(`[DB Webhook] Processing ${payload.events.length} events from LINE`);
      
      for (const event of payload.events) {
        try {
          // Store in database
          const client = await pool.connect();
          try {
            const result = await client.query(
              `INSERT INTO chat.line_webhook_events (
                channel,
                event_type,
                raw_data
              ) VALUES ($1, $2, $3)
              RETURNING id`,
              [
                'line_2',                    // Hardcoded channel value
                event.type,                  // Event type (message, follow, etc.)
                JSON.stringify(event)        // Complete webhook data as JSONB
              ]
            );
            
            if (result.rows.length > 0) {
              const { id } = result.rows[0];
              console.log(`[DB Webhook] Stored event ${event.webhookEventId} with ID: ${id}`);
              eventsStored++;
            }
          } finally {
            client.release();
          }
        } catch (error) {
          console.error(`[DB Webhook] Failed to store event ${event.webhookEventId}:`, error);
          // Continue processing other events
        }
      }
      
      // Schedule notification to App 2 if we stored any events
      if (eventsStored > 0) {
        console.log(`[DB Webhook] Successfully stored ${eventsStored} events`);
        scheduleNotification();
      }
    }

    // Always return 200 OK quickly (within 1 second)
    return NextResponse.json({ success: true }, { status: 200 });

  } catch (error) {
    // Log error but still return 200 to prevent LINE from retrying
    console.error('[DB Webhook] ERROR: Webhook processing error:', error);
    console.error('[DB Webhook] Stack trace:', error instanceof Error ? error.stack : 'No stack trace');
    
    // Return 200 even on error to prevent LINE retries
    return NextResponse.json({ success: true }, { status: 200 });
  }
}

// Health check endpoint
export async function GET() {
  let dbStatus = 'unknown';
  try {
    const client = await pool.connect();
    try {
      await client.query('SELECT 1');
      dbStatus = 'connected';
    } finally {
      client.release();
    }
  } catch (error) {
    dbStatus = 'error';
    console.error('[DB Webhook] Database connection error:', error);
  }

  return NextResponse.json({
    status: 'ok',
    service: 'LINE DB Webhook',
    database: dbStatus,
    timestamp: new Date().toISOString(),
    env: {
      NODE_ENV: process.env.NODE_ENV,
      hasChannelSecret: !!process.env.LINE_CHANNEL_SECRET,
      hasAccessToken: !!process.env.LINE_CHANNEL_ACCESS_TOKEN,
      dbHost: process.env.DB_HOST || '192.168.11.50',
      app2ApiUrl: process.env.APP2_API_URL || 'https://dev.setsq.com/api/chat/line/process-webhooks',
      app2Channel: process.env.APP2_CHANNEL_NAME || 'line_2',
      hasApp2ApiKey: !!process.env.WEBHOOK_PROCESSOR_API_KEY
    },
    notification: {
      pendingNotification: pendingNotification,
      batchDelay: '5 seconds'
    }
  });
}