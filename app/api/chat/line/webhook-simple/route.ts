import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

export async function POST(request: NextRequest) {
  console.log('[Simple Webhook] Received POST request');
  
  try {
    // Get signature from header
    const signature = request.headers.get('x-line-signature');
    console.log('[Simple Webhook] Signature:', signature);
    
    // Get raw body
    const body = await request.text();
    console.log('[Simple Webhook] Body:', body);
    
    // Simple signature validation
    const channelSecret = 'd9f03ba9523a251ef79b6bcfdf0ff4ab'; // Hard-coded for testing
    const hash = crypto
      .createHmac('sha256', channelSecret)
      .update(body)
      .digest('base64');
    
    console.log('[Simple Webhook] Computed hash:', hash);
    console.log('[Simple Webhook] Signature valid:', hash === signature);
    
    if (hash !== signature) {
      console.error('[Simple Webhook] Invalid signature');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Parse and log the payload
    const payload = JSON.parse(body);
    console.log('[Simple Webhook] Events:', JSON.stringify(payload.events, null, 2));
    
    // Return success immediately
    return NextResponse.json({ success: true }, { status: 200 });
    
  } catch (error) {
    console.error('[Simple Webhook] Error:', error);
    // Still return 200 to prevent LINE retries
    return NextResponse.json({ success: true }, { status: 200 });
  }
}

export async function GET() {
  return NextResponse.json({
    status: 'ok',
    service: 'LINE Simple Webhook',
    timestamp: new Date().toISOString(),
  });
}