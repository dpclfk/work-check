import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { TaskCompletion } from './task-completion.entity';
import { User } from './user.entity';
import { SubCategory } from './sub-category.entity';

export enum TaskCycle {
  DAILY = 'DAILY',
  WEEKLY = 'WEEKLY',
  MONTHLY = 'MONTHLY',
  ONCE = 'ONCE',
}

@Entity('tasks')
export class Task {
  @PrimaryGeneratedColumn()
  id: number;

  // 서브카테고리 없이 할 일만 쓰는 경우가 있어서 nullable
  @Column({ nullable: true })
  subCategoryId?: number;

  @ManyToOne(() => SubCategory, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'subCategoryId' })
  subCategory?: SubCategory;

  @Column()
  userId: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({ length: 50 })
  name: string;

  @Column({ type: 'enum', enum: TaskCycle, default: TaskCycle.DAILY })
  cycle: TaskCycle;

  // WEEKLY: 0(일)~6(토), MONTHLY: 1~31, DAILY/ONCE: 사용 안 함
  @Column({ type: 'tinyint', unsigned: true, nullable: true })
  cycleValue?: number;

  // ONCE일 때만 씀 — 이 날짜 하루만 해당
  @Column({ type: 'date', nullable: true })
  dueDate?: string;

  // 이 시각(0~23시)까지 완료 기록이 없으면 마감으로 침
  @Column({ type: 'tinyint', unsigned: true })
  deadLine: number;

  // 이 시각(0~23시)부터 알림을 시작함 (deadLine이랑 별개 — 새벽 마감 등 처리는 추후 로직 정리 예정)
  @Column({ type: 'tinyint', unsigned: true })
  remindTime: number;

  @OneToMany(() => TaskCompletion, (completion) => completion.task)
  completions: TaskCompletion[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
