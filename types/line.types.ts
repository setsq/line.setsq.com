// LINE Webhook Event Types
export interface LineWebhookEvent {
  type: 'message' | 'follow' | 'unfollow' | 'join' | 'leave' | 'memberJoined' | 'memberLeft' | 'postback' | 'videoPlayComplete';
  mode: 'active' | 'standby';
  timestamp: number;
  source: LineSource;
  webhookEventId: string;
  deliveryContext: {
    isRedelivery: boolean;
  };
  replyToken?: string;
  message?: LineMessage;
  postback?: LinePostback;
}

export interface LineSource {
  type: 'user' | 'group' | 'room';
  userId?: string;
  groupId?: string;
  roomId?: string;
}

export interface LineMessage {
  id: string;
  type: 'text' | 'image' | 'video' | 'audio' | 'file' | 'location' | 'sticker';
  text?: string;
  fileName?: string;
  fileSize?: number;
  title?: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  packageId?: string;
  stickerId?: string;
  stickerResourceType?: string;
  keywords?: string[];
}

export interface LinePostback {
  data: string;
  params?: {
    date?: string;
    time?: string;
    datetime?: string;
  };
}

export interface LineWebhookPayload {
  destination: string;
  events: LineWebhookEvent[];
}