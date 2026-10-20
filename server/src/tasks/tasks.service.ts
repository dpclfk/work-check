import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { And, LessThan, MoreThanOrEqual, Repository } from 'typeorm';
import { Task, TaskCycle } from '../entities/task.entity';
import { TaskCompletion } from '../entities/task-completion.entity';
import { UserSetting } from '../entities/user-setting.entity';
import { SubCategory } from '../entities/sub-category.entity';
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
    @InjectRepository(SubCategory)
    private readonly subCategoryRepository: Repository<SubCategory>,
  ) {}

  async create(userId: number, dto: CreateTaskDto) {
    if (dto.subCategoryId !== undefined && dto.subCategoryId !== null) {
      await this.assertSubCategoryOwned(userId, dto.subCategoryId);
    }

    this.assertCycleValueValid(dto.cycleType, dto.cycleValue);

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
      // 프론트의 카테고리별 접기 기능을 위해 서브카테고리 + 그 메인카테고리까지 같이 가져옴.
      // subCategoryId가 없는 task는 subCategory가 그냥 undefined로 옴(nullable 관계라 문제없음)
      this.taskRepository.find({
        where: { userId },
        relations: ['subCategory', 'subCategory.mainCategory'],
        order: { createdAt: 'DESC' },
      }),
      this.getUserTimezone(userId),
    ]);

    const now = new Date();
    return Promise.all(
      tasks.map(async (task) => {
        const completion = await this.findCurrentPeriodCompletion(task, now);
        return { ...this.toDisplay(task, timezone), isCompleted: !!completion };
      }),
    );
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

    if (dto.subCategoryId !== undefined && dto.subCategoryId !== null) {
      await this.assertSubCategoryOwned(userId, dto.subCategoryId);
    }

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

    // 주기/마감을 바꾸는 필드가 하나라도 왔으면, 예전 주기 기준 완료기록은
    // 이제 의미가 없어져서 같이 지움 (remindTime만 바뀐 건 주기 경계에
    // 영향이 없어서 완료기록을 안 건드림)
    const scheduleChanged =
      dto.cycleType !== undefined ||
      dto.cycleValue !== undefined ||
      dto.dueDate !== undefined ||
      dto.deadLine !== undefined;

    // cycleValue 검증은 "스케줄을 실제로 건드릴 때만" — 안 그러면 예전에
    // cycleValue 없이 만들어진 레거시 WEEKLY/MONTHLY 할 일의 이름만 바꾸려
    // 해도(스케줄은 그대로인데) 400이 나버림
    if (scheduleChanged) {
      this.assertCycleValueValid(mergedDisplay.cycleType, mergedDisplay.cycleValue);
    }

    const kst = convertScheduleFields(mergedDisplay, timezone, KST_TIMEZONE);
    this.assertDeadLineNotEqualRemindTime(kst.deadLine, kst.remindTime);

    Object.assign(task, dto, kst);

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

  /**
   * 현재 주기에 대한 완료 처리 (이미 완료했으면 기존 기록 반환).
   * "완료 있나 확인 -> 없으면 insert"를 그냥 순서대로 하면, 완료 버튼을
   * 빠르게 여러 번 누르거나(연타) 여러 기기에서 거의 동시에 눌렀을 때
   * 두 요청이 동시에 "아직 없음"을 보고 둘 다 insert함.
   * 그래서 Task row에 쓰기 락(SELECT ... FOR UPDATE)을
   * 걸어서, 같은 task에 대한 동시 완료 요청이 하나씩 순서대로만 처리되게 함
   */
  async complete(userId: number, id: number) {
    const task = await this.findOne(userId, id);
    const now = new Date();

    return this.taskRepository.manager.transaction(async (manager) => {
      await manager
        .createQueryBuilder(Task, 'task')
        .setLock('pessimistic_write')
        .where('task.id = :id', { id: task.id })
        .getOne();

      const completionRepository = manager.getRepository(TaskCompletion);
      const existing = await this.findCurrentPeriodCompletion(task, now, completionRepository);
      if (existing) return existing;

      const completeTime = formatCompleteTime(now);
      const completion = completionRepository.create({ task, completeTime });
      return completionRepository.save(completion);
    });
  }

  /** 이 task가 현재 주기에 이미 완료됐는지(있으면 그 완료기록, 없으면 null) */
  private findCurrentPeriodCompletion(
    task: Task,
    now: Date,
    repository: Repository<TaskCompletion> = this.completionRepository,
  ) {
    const { start, end } = getCurrentPeriodRange(task, now);
    return repository.findOne({
      where: { task: { id: task.id }, completeTime: And(MoreThanOrEqual(start), LessThan(end)) },
    });
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

  /**
   * WEEKLY/MONTHLY는 cycleValue(요일/일자)가 필수
   * DAILY/ONCE는 cycleValue를 아예 안 쓰므로 검사 안 함
   */
  private assertCycleValueValid(cycleType: TaskCycle, cycleValue?: number) {
    if (cycleType === TaskCycle.WEEKLY) {
      if (cycleValue === undefined || cycleValue === null) {
        throw new BadRequestException('WEEKLY 주기는 요일(cycleValue, 0~6)을 지정해야 합니다.');
      }
      if (cycleValue < 0 || cycleValue > 6) {
        throw new BadRequestException('WEEKLY의 cycleValue는 0(일)~6(토) 사이여야 합니다.');
      }
    }
    if (cycleType === TaskCycle.MONTHLY) {
      if (cycleValue === undefined || cycleValue === null) {
        throw new BadRequestException('MONTHLY 주기는 날짜(cycleValue, 1~31)를 지정해야 합니다.');
      }
      if (cycleValue < 1 || cycleValue > 31) {
        throw new BadRequestException('MONTHLY의 cycleValue는 1~31 사이여야 합니다.');
      }
    }
  }

  /** subCategoryId가 "존재하고 + 내 소유"인지 — 참조값 자체의 유효성 검증이라 400 */
  private async assertSubCategoryOwned(userId: number, subCategoryId: number) {
    const exists = await this.subCategoryRepository.findOne({ where: { id: subCategoryId, userId } });
    if (!exists) throw new BadRequestException('유효하지 않은 서브 카테고리입니다.');
  }
}
