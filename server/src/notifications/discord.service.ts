import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';

@Injectable()
export class DiscordService {
  private readonly logger = new Logger(DiscordService.name);

  // webhookUrl은 유저별 설정(User.discordWebhookUrl)에서 호출부가 넘겨줌 — 여기선 전역 설정을 안 읽음
  async sendMessage(webhookUrl: string | undefined, content: string) {
    if (!webhookUrl) {
      this.logger.warn('discordWebhookUrl이 설정되지 않은 유저라 알림을 보내지 않았습니다.');
      return;
    }

    try {
      await axios.post(webhookUrl, { content });
    } catch (error) {
      this.logger.error(
        '디스코드 알림 전송 실패',
        error instanceof Error ? error.stack : String(error),
      );
    }
  }
}
