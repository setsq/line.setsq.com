import { NextRequest, NextResponse } from 'next/server';
import { validateSignature } from '@/lib/line-validator-simple';
import { storeAndQueueEvent } from '@/repositories/webhook.repository';
import { LineWebhookPayload } from '@/types/line.types';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables based on NODE_ENV
if (process.env.NODE_ENV === 'production') {
  dotenv.config({ path: path.resolve(process.cwd(), '.env.production') });
} else {
  dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
}

export async function POST(request: NextRequest) {
  console.log('[Webhook] Received POST request');
  console.log('[Webhook] Headers:', Object.fromEntries(request.headers.entries()));
  
  try {
    // Get signature from header
    const signature = request.headers.get('x-line-signature');
    console.log('[Webhook] Signature:', signature);
    
    // Get raw body as string for signature validation
    const body = await request.text();
    console.log('[Webhook] Body length:', body.length);
    
    // Validate signature
    const channelSecret = process.env.LINE_CHANNEL_SECRET;
    if (!channelSecret) {
      console.error('[Webhook] ERROR: LINE_CHANNEL_SECRET not configured');
      console.error('[Webhook] Environment:', {
        NODE_ENV: process.env.NODE_ENV,
        hasChannelSecret: !!process.env.LINE_CHANNEL_SECRET,
        hasAccessToken: !!process.env.LINE_CHANNEL_ACCESS_TOKEN
      });
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }

    const isValid = await validateSignature(body, channelSecret, signature);
    console.log('[Webhook] Signature validation result:', isValid);
    
    if (!isValid) {
      console.error('[Webhook] ERROR: Invalid webhook signature');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse webhook payload
    let payload: LineWebhookPayload;
    try {
      payload = JSON.parse(body);
      console.log('[Webhook] Parsed payload:', JSON.stringify(payload, null, 2));
    } catch (error) {
      console.error('[Webhook] ERROR: Invalid JSON payload:', error);
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }

    // Process each event
    if (payload.events && Array.isArray(payload.events)) {
      // Process events in parallel for better performance
      const promises = payload.events.map(event => 
        storeAndQueueEvent(event).catch(error => {
          // Log error but don't fail the entire request
          console.error(`[Webhook] ERROR: Failed to process event ${event.webhookEventId}:`, error);
        })
      );

      await Promise.all(promises);
    }

    // Always return 200 OK quickly (within 1 second)
    return NextResponse.json({ success: true }, { status: 200 });

  } catch (error) {
    // Log error but still return 200 to prevent LINE from retrying
    console.error('[Webhook] ERROR: Webhook processing error:', error);
    console.error('[Webhook] Stack trace:', error instanceof Error ? error.stack : 'No stack trace');
    
    // Return 200 even on error to prevent LINE retries
    // Errors are logged and can be handled through monitoring
    return NextResponse.json({ success: true }, { status: 200 });
  }
}

// Health check endpoint
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    service: 'LINE Webhook',
    timestamp: new Date().toISOString(),
  });
}