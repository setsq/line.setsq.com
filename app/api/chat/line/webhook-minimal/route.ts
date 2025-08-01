import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

// Minimal webhook without any external dependencies
export async function POST(request: NextRequest) {
  try {
    // Get signature and body
    const signature = request.headers.get('x-line-signature');
    const body = await request.text();
    
    // Hard-coded channel secret for testing
    const channelSecret = 'd9f03ba9523a251ef79b6bcfdf0ff4ab';
    
    // Validate signature
    const hash = crypto
      .createHmac('sha256', channelSecret)
      .update(body)
      .digest('base64');
    
    if (hash !== signature) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Parse payload and log to console
    const payload = JSON.parse(body);
    console.log('[Minimal Webhook] Received events:', JSON.stringify(payload.events, null, 2));
    
    // Always return 200
    return NextResponse.json({ success: true }, { status: 200 });
    
  } catch (error) {
    console.error('[Minimal Webhook] Error:', error);
    // Still return 200 to prevent LINE retries
    return NextResponse.json({ success: true }, { status: 200 });
  }
}

export async function GET() {
  return NextResponse.json({
    status: 'ok',
    service: 'LINE Minimal Webhook (No DB/Redis)',
    timestamp: new Date().toISOString(),
  });
}