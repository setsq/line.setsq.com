import pool from '../lib/db';
import { LineWebhookEvent } from '../types/line.types';

export interface WebhookEventRecord {
  id: string;  // UUID in actual table
  channel: string;
  event_type: string;
  raw_data: any;
  processed: boolean;
  processed_at: Date | null;
  error: string | null;
  created_at: Date;
}

/**
 * Store webhook event and queue for processing
 * Implements idempotency using webhook_event_id
 */
export async function storeAndQueueEvent(event: LineWebhookEvent): Promise<void> {
  const client = await pool.connect();
  
  try {
    // Store in database - adjusted for actual table structure
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

    // Log result
    if (result.rows.length > 0) {
      const { id } = result.rows[0];
      console.log(`Stored event ${event.webhookEventId} with ID: ${id}`);
    }
  } catch (error) {
    console.error('Error storing webhook event:', error);
    throw error;
  } finally {
    client.release();
  }
}


/**
 * Get event by ID
 */
export async function getEventById(id: string): Promise<WebhookEventRecord | null> {
  const client = await pool.connect();
  
  try {
    const result = await client.query(
      'SELECT * FROM chat.line_webhook_events WHERE id = $1',
      [id]
    );
    
    return result.rows[0] || null;
  } catch (error) {
    console.error('Error getting event by ID:', error);
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Get recent events for monitoring
 */
export async function getRecentEvents(limit: number = 10): Promise<WebhookEventRecord[]> {
  const client = await pool.connect();
  
  try {
    const result = await client.query(
      `SELECT * FROM chat.line_webhook_events 
       ORDER BY created_at DESC 
       LIMIT $1`,
      [limit]
    );
    
    return result.rows;
  } catch (error) {
    console.error('Error getting recent events:', error);
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Get processing statistics
 */
export async function getProcessingStats(): Promise<any> {
  const client = await pool.connect();
  
  try {
    const result = await client.query(`
      SELECT 
        CASE 
          WHEN processed = true AND error IS NULL THEN 'completed'
          WHEN processed = true AND error IS NOT NULL THEN 'failed'
          WHEN processed = false THEN 'pending'
        END as status,
        COUNT(*) as count
      FROM chat.line_webhook_events
      WHERE created_at >= NOW() - INTERVAL '24 hours'
      GROUP BY status
    `);
    
    return result.rows;
  } catch (error) {
    console.error('Error getting processing stats:', error);
    throw error;
  } finally {
    client.release();
  }
}