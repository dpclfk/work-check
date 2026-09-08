import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';

interface ExpoPushMessage {
  to: string;
  title: string;
  body: string;
  sound?: 'default';
}

@Injectable()
export class ExpoPushService {
  private readonly logger = new Logger(ExpoPushService.name);
  private readonly endpoint = 'https://exp.host/--/api/v2/push/send';

  async sendToTokens(tokens: string[], title: string, body: string) {
    if (tokens.length === 0) return;

    const messages: ExpoPushMessage[] = tokens.map((to) => ({
      to,
      title,
      body,
      sound: 'default',
    }));

    try {
      await axios.post(this.endpoint, messages, {
        headers: { 'Content-Type': 'application/json' },
      });
    } catch (error) {
      this.logger.error(
        'Expo 푸시 알림 전송 실패',
        error instanceof Error ? error.stack : String(error),
      );
    }
  }
}
