import { NextRequest, NextResponse } from 'next/server';
import { validateSignature } from '@/lib/line-validator';
import { storeAndQueueEvent } from '@/repositories/webhook.repository';
import { LineWebhookPayload } from '@/types/line.types';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

export async function POST(request: NextRequest) {
  try {
    // Get signature from header
    const signature = request.headers.get('x-line-signature');
    
    // Get raw body as string for signature validation
    const body = await request.text();
    
    // Validate signature
    const channelSecret = process.env.LINE_CHANNEL_SECRET;
    if (!channelSecret) {
      console.error('LINE_CHANNEL_SECRET not configured');
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }

    const isValid = await validateSignature(body, channelSecret, signature);
    if (!isValid) {
      console.error('Invalid webhook signature');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse webhook payload
    let payload: LineWebhookPayload;
    try {
      payload = JSON.parse(body);
    } catch (error) {
      console.error('Invalid JSON payload:', error);
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }

    // Process each event
    if (payload.events && Array.isArray(payload.events)) {
      // Process events in parallel for better performance
      const promises = payload.events.map(event => 
        storeAndQueueEvent(event).catch(error => {
          // Log error but don't fail the entire request
          console.error(`Failed to process event ${event.webhookEventId}:`, error);
        })
      );

      await Promise.all(promises);
    }

    // Always return 200 OK quickly (within 1 second)
    return NextResponse.json({ success: true }, { status: 200 });

  } catch (error) {
    // Log error but still return 200 to prevent LINE from retrying
    console.error('Webhook processing error:', error);
    
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