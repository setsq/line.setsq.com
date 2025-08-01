import { NextRequest, NextResponse } from 'next/server';
import { validateSignature } from '@/lib/line-validator-simple';
import { LineWebhookPayload } from '@/types/line.types';

export async function POST(request: NextRequest) {
  console.log('[Standalone Webhook] Received POST request');
  
  try {
    // Get signature from header
    const signature = request.headers.get('x-line-signature');
    console.log('[Standalone Webhook] Signature:', signature);
    
    // Get raw body as string for signature validation
    const body = await request.text();
    console.log('[Standalone Webhook] Body length:', body.length);
    
    // Validate signature
    const channelSecret = process.env.LINE_CHANNEL_SECRET || 'd9f03ba9523a251ef79b6bcfdf0ff4ab';
    
    const isValid = await validateSignature(body, channelSecret, signature);
    console.log('[Standalone Webhook] Signature validation result:', isValid);
    
    if (!isValid) {
      console.error('[Standalone Webhook] ERROR: Invalid webhook signature');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse webhook payload
    let payload: LineWebhookPayload;
    try {
      payload = JSON.parse(body);
      console.log('[Standalone Webhook] Parsed payload:', JSON.stringify(payload, null, 2));
    } catch (error) {
      console.error('[Standalone Webhook] ERROR: Invalid JSON payload:', error);
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }

    // Process each event (just log for now, no DB)
    if (payload.events && Array.isArray(payload.events)) {
      for (const event of payload.events) {
        console.log('[Standalone Webhook] Processing event:', {
          type: event.type,
          webhookEventId: event.webhookEventId,
          timestamp: event.timestamp,
          source: event.source
        });
        
        // Add your event processing logic here
        // For now, just log the events
      }
    }

    // Always return 200 OK quickly (within 1 second)
    return NextResponse.json({ success: true }, { status: 200 });

  } catch (error) {
    // Log error but still return 200 to prevent LINE from retrying
    console.error('[Standalone Webhook] ERROR: Webhook processing error:', error);
    console.error('[Standalone Webhook] Stack trace:', error instanceof Error ? error.stack : 'No stack trace');
    
    // Return 200 even on error to prevent LINE retries
    return NextResponse.json({ success: true }, { status: 200 });
  }
}

// Health check endpoint
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    service: 'LINE Standalone Webhook (No DB/Redis)',
    timestamp: new Date().toISOString(),
    env: {
      NODE_ENV: process.env.NODE_ENV,
      hasChannelSecret: !!process.env.LINE_CHANNEL_SECRET,
      hasAccessToken: !!process.env.LINE_CHANNEL_ACCESS_TOKEN
    }
  });
}