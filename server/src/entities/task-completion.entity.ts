import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Task } from './task.entity';

@Entity('task_completions')
@Index(['task', 'periodKey'], { unique: true })
export class TaskCompletion {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Task, (task) => task.completions, { onDelete: 'CASCADE' })
  task: Task;

  // 완료가 속한 주기를 식별하는 키
  // DAILY: 2026-09-08 / WEEKLY: 2026-W36 / MONTHLY: 2026-09
  @Column({ length: 20 })
  periodKey: string;

  @CreateDateColumn()
  completedAt: Date;
}
