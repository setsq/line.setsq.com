import { NextRequest, NextResponse } from 'next/server';
import { getProcessingStats, getRecentEvents } from '@/repositories/webhook.repository';

export async function GET(request: NextRequest) {
  try {
    // Get processing statistics from database
    const processingStats = await getProcessingStats();
    
    // Get recent events
    const recentEvents = await getRecentEvents(10);
    
    // Format the response
    const response = {
      timestamp: new Date().toISOString(),
      stats: processingStats,
      recentEvents: recentEvents.map(event => ({
        id: event.id,
        channel: event.channel,
        type: event.event_type,
        processed: event.processed,
        createdAt: event.created_at,
        processedAt: event.processed_at,
        error: event.error,
      })),
    };
    
    return NextResponse.json(response);
    
  } catch (error) {
    console.error('Error getting monitoring data:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve monitoring data' },
      { status: 500 }
    );
  }
}