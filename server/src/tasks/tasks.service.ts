import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { And, LessThan, MoreThanOrEqual, Repository } from 'typeorm';
import { Task, TaskCycle } from '../entities/task.entity';
import { TaskCompletion } from '../entities/task-completion.entity';
import { UserSetting } from '../entities/user-setting.entity';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import {
  KST_TIMEZONE,
  convertScheduleFields,
  formatCompleteTime,
  formatInTimezone,
  getCurrentPeriodRange,
} from './utils/period-key.util';

const DEFAULT_TIMEZONE = 'Asia/Seoul';

interface ScheduleFields {
  cycleType: TaskCycle;
  cycleValue?: number;
  dueDate?: string;
  deadLine: number;
  remindTime: number;
}

@Injectable()
export class TasksService {
  constructor(
    @InjectRepository(Task)
    private readonly taskRepository: Repository<Task>,
    @InjectRepository(TaskCompletion)
    private readonly completionRepository: Repository<TaskCompletion>,
    @InjectRepository(UserSetting)
    private readonly userSettingRepository: Repository<UserSetting>,
  ) {}

  async create(userId: number, dto: CreateTaskDto) {
    const timezone = await this.getUserTimezone(userId);
    // 요청받은 일정 필드(유저 타임존 기준)를 한국시간으로 환산해서 저장
    const kst = convertScheduleFields(this.toScheduleFields(dto), timezone, KST_TIMEZONE);
    this.assertDeadLineNotEqualRemindTime(kst.deadLine, kst.remindTime);

    const task = this.taskRepository.create({ ...dto, ...kst, userId });
    const saved = await this.taskRepository.save(task);
    return this.toDisplay(saved, timezone);
  }

  async findAll(userId: number) {
    const [tasks, timezone] = await Promise.all([
      this.taskRepository.find({ where: { userId }, order: { createdAt: 'DESC' } }),
      this.getUserTimezone(userId),
    ]);
    return tasks.map((task) => this.toDisplay(task, timezone));
  }

  /** 내부용 — 저장된 그대로(한국시간 기준) 가져옴. update/remove/complete 등 로직에서 씀 */
  async findOne(userId: number, id: number) {
    const task = await this.taskRepository.findOne({ where: { id, userId } });
    if (!task) throw new NotFoundException(`Task #${id}를 찾을 수 없습니다.`);
    return task;
  }

  /** 조회 응답용 — 유저 타임존으로 역산해서 보여줌 (GET /tasks/:id) */
  async findOneForDisplay(userId: number, id: number) {
    const [task, timezone] = await Promise.all([this.findOne(userId, id), this.getUserTimezone(userId)]);
    return this.toDisplay(task, timezone);
  }

  async update(userId: number, id: number, dto: UpdateTaskDto) {
    const task = await this.findOne(userId, id);
    const timezone = await this.getUserTimezone(userId);

    // 기존(한국시간) 일정을 유저 타임존으로 역산한 뒤, PATCH로 들어온 값(유저 타임존
    // 기준 원본값)만 덮어쓰고, 그 결과를 다시 한국시간으로 환산해서 저장 —
    // PATCH로 일부 필드만 와도 "병합된 최종 일정" 기준으로 변환이 맞아떨어지게 함
    const currentDisplay = convertScheduleFields(this.toScheduleFields(task), KST_TIMEZONE, timezone);
    const mergedDisplay: ScheduleFields = {
      cycleType: dto.cycleType ?? currentDisplay.cycleType,
      cycleValue: dto.cycleValue ?? currentDisplay.cycleValue,
      dueDate: dto.dueDate ?? currentDisplay.dueDate,
      deadLine: dto.deadLine ?? currentDisplay.deadLine,
      remindTime: dto.remindTime ?? currentDisplay.remindTime,
    };
    const kst = convertScheduleFields(mergedDisplay, timezone, KST_TIMEZONE);
    this.assertDeadLineNotEqualRemindTime(kst.deadLine, kst.remindTime);

    Object.assign(task, dto, kst);

    // 주기/마감을 바꾸는 필드가 하나라도 왔으면, 예전 주기 기준 완료기록은
    // 이제 의미가 없어져서 같이 지움 (remindTime만 바뀐 건 주기 경계에
    // 영향이 없어서 완료기록을 안 건드림)
    const scheduleChanged =
      dto.cycleType !== undefined ||
      dto.cycleValue !== undefined ||
      dto.dueDate !== undefined ||
      dto.deadLine !== undefined;
    if (scheduleChanged) {
      await this.completionRepository.delete({ task: { id: task.id } });
    }

    const saved = await this.taskRepository.save(task);
    return this.toDisplay(saved, timezone);
  }

  async remove(userId: number, id: number) {
    const task = await this.findOne(userId, id);
    await this.taskRepository.remove(task);
    return { success: true };
  }

  async getCompletions(userId: number, id: number) {
    const [task, timezone] = await Promise.all([this.findOne(userId, id), this.getUserTimezone(userId)]);
    const completions = await this.completionRepository.find({
      where: { task: { id: task.id } },
      order: { createdAt: 'DESC' },
    });
    if (timezone === KST_TIMEZONE) return completions;
    // completeTime도 한국시간으로 통일 저장되므로, 조회 응답에서만 유저 타임존으로 보여줌
    return completions.map((c) => ({ ...c, completeTime: formatInTimezone(c.completeTime, timezone) }));
  }

  /** 현재 주기에 대한 완료 처리 (이미 완료했으면 기존 기록 반환) */
  async complete(userId: number, id: number) {
    const task = await this.findOne(userId, id);
    const now = new Date();

    // [start, end) — end는 다음 주기의 시작이라 포함하면 안 됨. Task가 전부
    // 한국시간으로 저장돼 있어서 유저 타임존을 더 몰라도 됨
    const { start, end } = getCurrentPeriodRange(task, now);
    const existing = await this.completionRepository.findOne({
      where: { task: { id: task.id }, completeTime: And(MoreThanOrEqual(start), LessThan(end)) },
    });
    if (existing) return existing;

    const completeTime = formatCompleteTime(now);
    const completion = this.completionRepository.create({ task, completeTime });
    return this.completionRepository.save(completion);
  }

  private toScheduleFields(source: ScheduleFields): ScheduleFields {
    return {
      cycleType: source.cycleType,
      cycleValue: source.cycleValue,
      dueDate: source.dueDate,
      deadLine: source.deadLine,
      remindTime: source.remindTime,
    };
  }

  private toDisplay(task: Task, timezone: string): Task {
    if (timezone === KST_TIMEZONE) return task;
    const display = convertScheduleFields(this.toScheduleFields(task), KST_TIMEZONE, timezone);
    return { ...task, ...display };
  }

  private async getUserTimezone(userId: number): Promise<string> {
    const setting = await this.userSettingRepository.findOne({ where: { userId } });
    return setting?.timezone ?? DEFAULT_TIMEZONE;
  }

  private assertDeadLineNotEqualRemindTime(deadLine: number, remindTime: number) {
    if (deadLine === remindTime) {
      throw new BadRequestException('deadLine과 remindTime은 같은 시각일 수 없습니다.');
    }
  }
}
