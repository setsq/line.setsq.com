#!/usr/bin/env node

const crypto = require('crypto');
const http = require('http');
const path = require('path');

// Load environment variables from .env.local
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env.local') });

// Test webhook payload
const testPayload = {
  destination: 'U1234567890abcdef1234567890abcdef',
  events: [
    {
      type: 'message',
      mode: 'active',
      timestamp: Date.now(),
      source: {
        type: 'user',
        userId: 'U1234567890abcdef1234567890abcdef'
      },
      webhookEventId: `test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      deliveryContext: {
        isRedelivery: false
      },
      replyToken: 'test-reply-token',
      message: {
        id: `msg-${Date.now()}`,
        type: 'text',
        text: 'Test message from webhook tester'
      }
    }
  ]
};

// Calculate signature
const channelSecret = process.env.LINE_CHANNEL_SECRET;
if (!channelSecret) {
  console.error('Error: LINE_CHANNEL_SECRET not found in environment variables');
  process.exit(1);
}

const body = JSON.stringify(testPayload);
const signature = crypto
  .createHmac('sha256', channelSecret)
  .update(body)
  .digest('base64');

// Prepare request options
const options = {
  hostname: 'localhost',
  port: process.env.PORT || 3002,
  path: '/api/chat/line/webhook',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(body),
    'x-line-signature': signature
  }
};

// Send request
console.log('🚀 Sending test webhook to http://localhost:' + options.port + options.path);
console.log('📦 Event ID:', testPayload.events[0].webhookEventId);
console.log('🔐 Signature:', signature);

const req = require('http').request(options, (res) => {
  let data = '';

  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    console.log('\nResponse:');
    console.log('Status:', res.statusCode);
    console.log('Headers:', res.headers);
    console.log('Body:', data);
  });
});

req.on('error', (error) => {
  console.error('Error:', error);
});

// Write data and end request
req.write(body);
req.end();