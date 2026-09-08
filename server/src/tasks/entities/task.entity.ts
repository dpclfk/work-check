import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { TaskCompletion } from './task-completion.entity';

export enum TaskCycle {
  DAILY = 'DAILY',
  WEEKLY = 'WEEKLY',
  MONTHLY = 'MONTHLY',
}

@Entity('tasks')
export class Task {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 100 })
  title: string;

  @Column({ length: 500, nullable: true })
  description?: string;

  @Column({ type: 'enum', enum: TaskCycle, default: TaskCycle.DAILY })
  cycleType: TaskCycle;

  // WEEKLY: 0(일)~6(토), MONTHLY: 1~31, DAILY: 사용 안 함
  @Column({ type: 'int', nullable: true })
  cycleValue?: number;

  // 이 시각까지 완료 기록이 없으면 알림 대상이 됨 (HH:mm, 24시간)
  @Column({ length: 5, default: '21:00' })
  reminderTime: string;

  @Column({ default: true })
  isActive: boolean;

  @OneToMany(() => TaskCompletion, (completion) => completion.task)
  completions: TaskCompletion[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
