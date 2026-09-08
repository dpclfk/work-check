import { Module } from '@nestjs/common';
import { DiscordService } from './discord.service';
import { ExpoPushService } from './expo-push.service';

@Module({
  providers: [DiscordService, ExpoPushService],
  exports: [DiscordService, ExpoPushService],
})
export class NotificationsModule {}
