import { Injectable, Logger } from '@nestjs/common';
import * as webpush from 'web-push';

export interface WebPushPayload {
  title: string;
  body: string;
  data?: unknown;
}

@Injectable()
export class WebPushService {
  private readonly logger = new Logger(WebPushService.name);

  constructor() {
    // Note: Provide VAPID keys in .env
    if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
      webpush.setVapidDetails(
        `mailto:${process.env.VAPID_SUBJECT_EMAIL || 'admin@novafund.xyz'}`,
        process.env.VAPID_PUBLIC_KEY,
        process.env.VAPID_PRIVATE_KEY,
      );
    } else {
      this.logger.warn(
        'VAPID keys not set. Web push notifications will not work.',
      );
    }
  }

  async sendNotification(
    subscription: webpush.PushSubscription,
    payload: WebPushPayload,
  ): Promise<void> {
    try {
      if (!process.env.VAPID_PUBLIC_KEY) return;

      await webpush.sendNotification(subscription, JSON.stringify(payload));
      this.logger.log(
        `Push notification sent to endpoint: ${subscription.endpoint}`,
      );
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to send push notification: ${message}`);
      // Consider handling expired subscriptions (HTTP 410) by deleting them from the DB
      throw error;
    }
  }
}
