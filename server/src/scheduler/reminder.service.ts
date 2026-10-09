import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { And, In, LessThan, MoreThanOrEqual, Repository } from 'typeorm';
import { Task } from '../entities/task.entity';
import { TaskCompletion } from '../entities/task-completion.entity';
import { UserSetting } from '../entities/user-setting.entity';
import { KST_TIMEZONE, getCurrentPeriodRange, getDeadlineOccurrences, getWallClock } from '../tasks/utils/period-key.util';
import { DiscordService } from '../notifications/discord.service';
import { ExpoPushService } from '../notifications/expo-push.service';
import { DevicesService } from '../devices/devices.service';

const ALARM_LOOKAHEAD_MS = 24 * 60 * 60 * 1000;

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

  // 매시 정각 실행.
  // Task.deadLine/remindTime/cycleValue/dueDate가 전부 한국시간(KST) 기준으로
  // 저장돼 있어서(TasksService.create/update에서 유저 타임존 -> KST로 환산),
  // 여기서는 더 이상 유저별 타임존을 몰라도 "언제가 마감인지"를 계산할 수 있음.

  // 알림 1회 제한은 remindTime을 "그 시각에만" 정확히 일치시키는 걸로 자연스럽게
  // 보장됨(예전엔 remindTime이 지나면 매시간 반복 알림이 갔음) — 같은 주기 안에서
  // remindTime 시각은 한 번만 돌아오기 때문.
  @Cron(CronExpression.EVERY_HOUR)
  async checkTasks() {
    const now = new Date();
    const currentHourKst = getWallClock(now, KST_TIMEZONE).hour;

    // remindTime이 "지금 이 시각"과 정확히 일치하는 task만 — 다른 task는 이번 체크 대상 아님
    const tasks = await this.taskRepository.find({ where: { isActive: true, remindTime: currentHourKst } });
    if (tasks.length === 0) return;

    const userIds = [...new Set(tasks.map((task) => task.userId))];
    const settings = await this.userSettingRepository.find({ where: { userId: In(userIds) } });
    const settingByUserId = new Map(settings.map((setting) => [setting.userId, setting]));

    const dueTasksByUser = new Map<number, Task[]>();

    for (const task of tasks) {
      const { next } = getDeadlineOccurrences(task, now);
      if (!next) continue; // ONCE 할 일인데 마감이 이미 지남

      // 마감이 24시간 안으로 다가왔을 때만 알림 후보 — 그 외엔 remindTime이
      // 일치해도(매일 돌아오는 시각이라) 아직 이 주기 차례가 아닌 것
      const withinLookahead = next.getTime() - now.getTime() < ALARM_LOOKAHEAD_MS;
      if (!withinLookahead) continue;

      // [이전 마감, 다음 마감) 범위 안에 완료기록이 있으면 이미 끝낸 것
      const { start, end } = getCurrentPeriodRange(task, now);
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
            ? this.discordService.sendMessage(setting.discordRoom, `**${summary}**`)
            : Promise.resolve(),
          this.expoPushService.sendToTokens(deviceTokens, '할 일 알림', `${summary}`),
        ]);
      }
    }
  }
}
