import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { And, LessThan, MoreThanOrEqual, Repository } from 'typeorm';
import { Task } from '../entities/task.entity';
import { TaskCompletion } from '../entities/task-completion.entity';
import { UserSetting } from '../entities/user-setting.entity';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { formatCompleteTime, getCurrentPeriodRange } from './utils/period-key.util';

const DEFAULT_TIMEZONE = 'Asia/Seoul';

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

  create(userId: number, dto: CreateTaskDto) {
    this.assertDeadLineNotEqualRemindTime(dto.deadLine, dto.remindTime);
    const task = this.taskRepository.create({ ...dto, userId });
    return this.taskRepository.save(task);
  }

  findAll(userId: number) {
    return this.taskRepository.find({ where: { userId }, order: { createdAt: 'DESC' } });
  }

  async findOne(userId: number, id: number) {
    const task = await this.taskRepository.findOne({ where: { id, userId } });
    if (!task) throw new NotFoundException(`Task #${id}를 찾을 수 없습니다.`);
    return task;
  }

  async update(userId: number, id: number, dto: UpdateTaskDto) {
    const task = await this.findOne(userId, id);
    Object.assign(task, dto);
    // dto가 둘 중 하나만 바꿔도(PATCH) 병합된 최종 값 기준으로 체크해야
    // "기존 deadLine이랑 새로 바꾼 remindTime이 겹치는" 경우도 잡힘
    this.assertDeadLineNotEqualRemindTime(task.deadLine, task.remindTime);
    return this.taskRepository.save(task);
  }

  async remove(userId: number, id: number) {
    const task = await this.findOne(userId, id);
    await this.taskRepository.remove(task);
    return { success: true };
  }

  async getCompletions(userId: number, id: number) {
    const task = await this.findOne(userId, id);
    return this.completionRepository.find({
      where: { task: { id: task.id } },
      order: { createdAt: 'DESC' },
    });
  }

  /** 현재 주기에 대한 완료 처리 (이미 완료했으면 기존 기록 반환) */
  async complete(userId: number, id: number) {
    const task = await this.findOne(userId, id);
    // "오늘"의 기준을 이 유저의 타임존으로 계산 — 서버 시간 기준이면
    // 유저 타임존과 자정 근처에서 하루가 어긋날 수 있음
    const setting = await this.userSettingRepository.findOne({ where: { userId } });
    const timezone = setting?.timezone ?? DEFAULT_TIMEZONE;
    const now = new Date();

    // [start, end) — end는 다음 주기의 시작이라 포함하면 안 됨
    const { start, end } = getCurrentPeriodRange(task, timezone, now);
    const existing = await this.completionRepository.findOne({
      where: { task: { id: task.id }, completeTime: And(MoreThanOrEqual(start), LessThan(end)) },
    });
    if (existing) return existing;

    const completeTime = formatCompleteTime(now, timezone);
    const completion = this.completionRepository.create({ task, completeTime });
    return this.completionRepository.save(completion);
  }

  private assertDeadLineNotEqualRemindTime(deadLine: number, remindTime: number) {
    if (deadLine === remindTime) {
      throw new BadRequestException('deadLine과 remindTime은 같은 시각일 수 없습니다.');
    }
  }
}
