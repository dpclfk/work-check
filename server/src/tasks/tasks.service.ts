import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Task } from './entities/task.entity';
import { TaskCompletion } from './entities/task-completion.entity';
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

  create(dto: CreateTaskDto) {
    const task = this.taskRepository.create(dto);
    return this.taskRepository.save(task);
  }

  findAll() {
    return this.taskRepository.find({ order: { createdAt: 'DESC' } });
  }

  async findOne(id: number) {
    const task = await this.taskRepository.findOne({ where: { id } });
    if (!task) throw new NotFoundException(`Task #${id}를 찾을 수 없습니다.`);
    return task;
  }

  async update(id: number, dto: UpdateTaskDto) {
    const task = await this.findOne(id);
    Object.assign(task, dto);
    return this.taskRepository.save(task);
  }

  async remove(id: number) {
    const task = await this.findOne(id);
    await this.taskRepository.remove(task);
    return { success: true };
  }

  async getCompletions(id: number) {
    const task = await this.findOne(id);
    return this.completionRepository.find({
      where: { task: { id: task.id } },
      order: { completedAt: 'DESC' },
    });
  }

  /** 현재 주기에 대한 완료 처리 (이미 완료했으면 기존 기록 반환) */
  async complete(id: number) {
    const task = await this.findOne(id);
    const periodKey = getCurrentPeriodKey(task.cycleType);

    const existing = await this.completionRepository.findOne({
      where: { task: { id: task.id }, periodKey },
    });
    if (existing) return existing;

    const completion = this.completionRepository.create({ task, periodKey });
    return this.completionRepository.save(completion);
  }
}
