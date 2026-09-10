import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Task } from '../entities/task.entity';
import { TaskCompletion } from '../entities/task-completion.entity';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { getCurrentPeriodKey } from './utils/period-key.util';

@Injectable()
export class TasksService {
  constructor(
    @InjectRepository(Task)
    private readonly taskRepository: Repository<Task>,
    @InjectRepository(TaskCompletion)
    private readonly completionRepository: Repository<TaskCompletion>,
  ) {}

  create(userId: number, dto: CreateTaskDto) {
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
      order: { completedAt: 'DESC' },
    });
  }

  /** 현재 주기에 대한 완료 처리 (이미 완료했으면 기존 기록 반환) */
  async complete(userId: number, id: number) {
    const task = await this.findOne(userId, id);
    const periodKey = getCurrentPeriodKey(task.cycleType);

    const existing = await this.completionRepository.findOne({
      where: { task: { id: task.id }, periodKey },
    });
    if (existing) return existing;

    const completion = this.completionRepository.create({ task, periodKey });
    return this.completionRepository.save(completion);
  }
}
