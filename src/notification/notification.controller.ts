import { Body, Controller, Get, Param, Post, Put, BadRequestException } from '@nestjs/common';
import { Throttle, minutes } from '@nestjs/throttler';
import { PrismaService } from '../prisma.service';
import { EncryptionService } from '../encryption/encryption.service';
import { UpdateNotificationSettingsDto } from './dto/update-notification-settings.dto';
import { PushSubscriptionDto } from './dto/push-subscription.dto';

@Controller({ path: 'notifications', version: '1' })
export class NotificationController {
    constructor(
        private readonly prisma: PrismaService,
        private readonly encryption: EncryptionService,
    ) { }

    @Get('settings/:userId')
    async getSettings(@Param('userId') userId: string) {
        return this.prisma.notificationSetting.upsert({
            where: { userId },
            update: {},
            create: { userId },
        });
    }

    @Throttle({ default: { limit: 5, ttl: 60000 } })
    @Put('settings/:userId')
    async updateSettings(
        @Param('userId') userId: string,
        @Body() settings: UpdateNotificationSettingsDto,
    ) {
        return this.prisma.notificationSetting.upsert({
            where: { userId },
            update: settings,
            create: {
                userId,
                ...settings,
            },
        });
    }

    @Throttle({ default: { limit: 3, ttl: 60000 } })
    @Post('subscribe/:userId')
    async subscribeToPush(
        @Param('userId') userId: string,
        @Body() subscription: PushSubscriptionDto,
    ) {
        // Validate subscription structure
        if (!subscription.endpoint || !subscription.keys || !subscription.keys.p256dh || !subscription.keys.auth) {
            throw new BadRequestException('Invalid push subscription format');
        }

        // Additional validation for endpoint URL
        try {
            new URL(subscription.endpoint);
        } catch {
            throw new BadRequestException('Invalid endpoint URL');
        }

        // Validate key formats (base64)
        try {
            const p256dh = Buffer.from(subscription.keys.p256dh, 'base64');
            const auth = Buffer.from(subscription.keys.auth, 'base64');
            
            if (p256dh.length === 0 || auth.length === 0) {
                throw new BadRequestException('Invalid key format');
            }
        } catch {
            throw new BadRequestException('Invalid key encoding');
        }

        // Encrypt push subscription before storing
        const encryptedSubscription = this.encryption.encrypt(JSON.stringify(subscription));
        await this.prisma.user.update({
            where: { id: userId },
            data: { pushSubscription: encryptedSubscription },
        });
        return { success: true };
    }
}
