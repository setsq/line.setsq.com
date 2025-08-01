import crypto from 'crypto';
import redis from './redis';

/**
 * Validates LINE webhook signature using HMAC-SHA256
 * @param body - Raw request body as string
 * @param channelSecret - LINE channel secret
 * @param signature - x-line-signature header value
 * @returns Promise<boolean> - true if signature is valid
 */
export async function validateSignature(
  body: string,
  channelSecret: string,
  signature: string | null
): Promise<boolean> {
  // Signature is required
  if (!signature) {
    console.error('Missing x-line-signature header');
    return false;
  }

  // Check Redis cache first for performance
  const cacheKey = `line_sig:${signature}`;
  try {
    const cached = await redis.get(cacheKey);
    if (cached !== null) {
      return cached === 'valid';
    }
  } catch (err) {
    console.error('Redis cache check failed:', err);
    // Continue with validation if cache fails
  }

  // Compute HMAC-SHA256
  const hash = crypto
    .createHmac('sha256', channelSecret)
    .update(body)
    .digest('base64');

  const isValid = hash === signature;

  // Cache result for 5 minutes
  try {
    await redis.setex(cacheKey, 300, isValid ? 'valid' : 'invalid');
  } catch (err) {
    console.error('Redis cache set failed:', err);
    // Continue even if caching fails
  }

  if (!isValid) {
    console.error('Invalid signature:', { expected: hash, received: signature });
  }

  return isValid;
}