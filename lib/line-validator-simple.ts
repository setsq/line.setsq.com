import crypto from 'crypto';

/**
 * Validates LINE webhook signature using HMAC-SHA256 (without Redis caching)
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

  // Compute HMAC-SHA256
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