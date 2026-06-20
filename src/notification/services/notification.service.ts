import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import * as webpush from 'web-push';
import { PrismaService } from '../../prisma.service';
import { EmailService } from './email.service';
import { WebPushService } from './web-push.service';
import { NotificationType } from '../enums/notification-type.enum';
import { validateEnum } from '../../common/validators/enum.validator';

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
    private readonly webPushService: WebPushService,
  ) {}

  async notify(
    userId: string,
    type: NotificationType,
    title: string,
    message: string,
    data?: Prisma.InputJsonValue,
  ): Promise<void> {
    // Validate notification type at runtime
    validateEnum(NotificationType, type, 'NotificationType');

    const user = await this.prisma.user.findFirst({
      where: {
        id: userId,
        deletedAt: null,
      },
      include: { notificationSettings: true },
    });

    if (!user) {
      this.logger.warn(`User ${userId} not found for notification`);
      return;
    }

    // Default settings if none exist
    const settings = user.notificationSettings || {
      emailEnabled: true,
      pushEnabled: false,
      notifyContributions: true,
      notifyMilestones: true,
      notifyDeadlines: true,
    };

    // Check specific preferences
    if (type === 'CONTRIBUTION' && !settings.notifyContributions) return;
    if (type === 'MILESTONE' && !settings.notifyMilestones) return;
    if (type === 'DEADLINE' && !settings.notifyDeadlines) return;

    // Save notification to history
    await this.prisma.notification.create({
      data: {
        userId,
        type,
        title,
        message,
        data,
      },
    });

    // Dispatch via Email
    if (settings.emailEnabled && user.email) {
      try {
        await this.emailService.sendEmail(
          user.email,
          title,
          `<p>${message}</p>`,
        );
      } catch {
        this.logger.error(
          `Failed to send email to ${user.email} for notification ${title}`,
        );
      }
    }

    // Dispatch via Web Push
    const pushSubscription = this.getPushSubscription(user.pushSubscription);
    if (settings.pushEnabled && pushSubscription) {
      try {
        await this.webPushService.sendNotification(pushSubscription, {
          title,
          body: message,
          data,
        });
      } catch {
        this.logger.error(`Failed to send web push for user ${userId}`);
      }
    }
  }

  private getPushSubscription(
    value: Prisma.JsonValue | null,
  ): webpush.PushSubscription | null {
    if (typeof value === 'string') {
      try {
        const parsed = JSON.parse(value) as unknown;
        return this.isPushSubscription(parsed) ? parsed : null;
      } catch {
        return null;
      }
    }

    return this.isPushSubscription(value) ? value : null;
  }

  private isPushSubscription(
    value: unknown,
  ): value is webpush.PushSubscription {
    if (typeof value !== 'object' || value === null) {
      return false;
    }

    const candidate = value as Partial<webpush.PushSubscription>;
    return typeof candidate.endpoint === 'string' && Boolean(candidate.keys);
  }
}
