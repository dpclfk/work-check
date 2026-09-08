import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

@Injectable()
export class DiscordService {
  private readonly logger = new Logger(DiscordService.name);
  private readonly webhookUrl?: string;

  constructor(private readonly configService: ConfigService) {
    this.webhookUrl = this.configService.get<string>('DISCORD_WEBHOOK_URL');
  }

  async sendMessage(content: string) {
    if (!this.webhookUrl) {
      this.logger.warn('DISCORD_WEBHOOK_URL이 설정되지 않아 알림을 보내지 않았습니다.');
      return;
    }

    try {
      await axios.post(this.webhookUrl, { content });
    } catch (error) {
      this.logger.error(
        '디스코드 알림 전송 실패',
        error instanceof Error ? error.stack : String(error),
      );
    }
  }
}
