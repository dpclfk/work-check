import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Task } from '../tasks/entities/task.entity';
import { TaskCompletion } from '../tasks/entities/task-completion.entity';
import { getCurrentPeriodKey, isTaskDueToday } from '../tasks/utils/period-key.util';
import { DiscordService } from '../notifications/discord.service';
import { ExpoPushService } from '../notifications/expo-push.service';
import { DevicesService } from '../devices/devices.service';

@Injectable()
export class ReminderService {
  private readonly logger = new Logger(ReminderService.name);

  constructor(
    @InjectRepository(Task)
    private readonly taskRepository: Repository<Task>,
    @InjectRepository(TaskCompletion)
    private readonly completionRepository: Repository<TaskCompletion>,
    private readonly discordService: DiscordService,
    private readonly expoPushService: ExpoPushService,
    private readonly devicesService: DevicesService,
  ) {}

  // 매시 정각 실행. 운영 시 필요한 주기로 조정.
  // TODO: 지금은 reminderTime이 지나면 매시간 반복 알림이 간다.
  //       주기당 1회만 보내려면 알림 발송 여부를 별도로 기록해서 체크해야 함.
  @Cron(CronExpression.EVERY_HOUR)
  async checkTasks() {
    const now = new Date();
    const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(
      now.getMinutes(),
    ).padStart(2, '0')}`;

    const tasks = await this.taskRepository.find({ where: { isActive: true } });
    const dueTasks: Task[] = [];

    for (const task of tasks) {
      if (!isTaskDueToday(task, now)) continue;
      if (currentTime < task.reminderTime) continue;

      const periodKey = getCurrentPeriodKey(task.cycleType, now);
      const done = await this.completionRepository.findOne({
        where: { task: { id: task.id }, periodKey },
      });
      if (!done) dueTasks.push(task);
    }

    if (dueTasks.length === 0) return;

    // 디스코드 알림이 가끔 안 올 때를 대비해, 같은 내용을 앱 푸시로도 같이 보냄
    const deviceTokens = await this.devicesService.findAllTokens();

    for (const task of dueTasks) {
      this.logger.log(`[알림] "${task.title}" 미완료 - 디스코드 + 앱 푸시로 알림 전송`);
      const summary = `${task.title} 아직 완료하지 않았어요! (주기: ${task.cycleType})`;

      await Promise.all([
        this.discordService.sendMessage(`⏰ **${task.title}** 아직 완료하지 않았어요! (주기: ${task.cycleType})`),
        this.expoPushService.sendToTokens(deviceTokens, '할 일 알림', `⏰ ${summary}`),
      ]);
    }
  }
}
