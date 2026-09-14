import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { And, In, LessThan, MoreThanOrEqual, Repository } from 'typeorm';
import { Task } from '../entities/task.entity';
import { TaskCompletion } from '../entities/task-completion.entity';
import { UserSetting } from '../entities/user-setting.entity';
import { getCurrentPeriodRange, getWallClock, isTaskDueToday } from '../tasks/utils/period-key.util';
import { DiscordService } from '../notifications/discord.service';
import { ExpoPushService } from '../notifications/expo-push.service';
import { DevicesService } from '../devices/devices.service';

const DEFAULT_TIMEZONE = 'Asia/Seoul';

@Injectable()
export class ReminderService {
  private readonly logger = new Logger(ReminderService.name);

  constructor(
    @InjectRepository(Task)
    private readonly taskRepository: Repository<Task>,
    @InjectRepository(TaskCompletion)
    private readonly completionRepository: Repository<TaskCompletion>,
    @InjectRepository(UserSetting)
    private readonly userSettingRepository: Repository<UserSetting>,
    private readonly discordService: DiscordService,
    private readonly expoPushService: ExpoPushService,
    private readonly devicesService: DevicesService,
  ) {}

  // 매시 정각 실행. 운영 시 필요한 주기로 조정.
  // TODO: 지금은 remindTime이 지나면 매시간 반복 알림이 간다.
  //       주기당 1회만 보내려면 알림 발송 여부를 별도로 기록해서 체크해야 함.
  // TODO: deadLine은 아직 로직에 안 쓰임 — remindTime만으로 "언제부터 알릴지" 판단 중.
  //       새벽 마감(자정 넘어가는 경우) 처리는 별도로 재설계 예정.
  @Cron(CronExpression.EVERY_HOUR)
  async checkTasks() {
    const now = new Date();

    const tasks = await this.taskRepository.find({ where: { isActive: true } });
    if (tasks.length === 0) return;

    // 유저별 설정(타임존, 디스코드)을 한 번에 미리 불러옴 — task마다 따로 조회 안 하려고
    const userIds = [...new Set(tasks.map((task) => task.userId))];
    const settings = await this.userSettingRepository.find({ where: { userId: In(userIds) } });
    const settingByUserId = new Map(settings.map((setting) => [setting.userId, setting]));

    // 유저별로 미완료 할 일을 묶는다 — 알림 채널(디스코드 웹훅, 기기 목록)이 유저 단위라서
    const dueTasksByUser = new Map<number, Task[]>();

    for (const task of tasks) {
      const timezone = settingByUserId.get(task.userId)?.timezone ?? DEFAULT_TIMEZONE;

      if (!isTaskDueToday(task, timezone, now)) continue;

      const currentHour = getWallClock(now, timezone).hour;
      if (currentHour < task.remindTime) continue;

      // [start, end) — end는 다음 주기의 시작이라 포함하면 안 됨
      const { start, end } = getCurrentPeriodRange(task, timezone, now);
      const done = await this.completionRepository.findOne({
        where: { task: { id: task.id }, completeTime: And(MoreThanOrEqual(start), LessThan(end)) },
      });
      if (done) continue;

      const bucket = dueTasksByUser.get(task.userId) ?? [];
      bucket.push(task);
      dueTasksByUser.set(task.userId, bucket);
    }

    if (dueTasksByUser.size === 0) return;

    for (const [userId, dueTasks] of dueTasksByUser) {
      const setting = settingByUserId.get(userId);
      // 디스코드 알림이 가끔 안 올 때를 대비해, 같은 내용을 앱 푸시로도 같이 보냄
      const deviceTokens = await this.devicesService.findAllTokens(userId);

      for (const task of dueTasks) {
        this.logger.log(
          `[알림] "${task.name}" (userId=${userId}) 미완료 - 디스코드 + 앱 푸시로 알림 전송`,
        );
        const summary = `${task.name} 아직 완료하지 않았어요! (주기: ${task.cycleType})`;

        await Promise.all([
          setting?.discordAlarm
            ? this.discordService.sendMessage(setting.discordRoom, `⏰ **${summary}**`)
            : Promise.resolve(),
          this.expoPushService.sendToTokens(deviceTokens, '할 일 알림', `⏰ ${summary}`),
        ]);
      }
    }
  }
}
