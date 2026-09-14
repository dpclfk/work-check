import {
  Check,
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

// 서비스 레이어(TasksService.assertDeadLineNotEqualRemindTime)에서도 같은
// 규칙을 막지만, 그걸 거치지 않는 경로(직접 쿼리, 나중에 추가될 배치
// 작업 등)까지 대비해 DB 레벨에도 동일 제약을 둠.
// 주의: TypeORM은 `synchronize`로 MySQL의 CHECK 제약을 자동 생성/반영하지
// 않는다(RdbmsSchemaBuilder가 MySQL 계열이면 건너뜀 — "Mysql does not
// support check constraints"라는 오래된 가정 때문에, 실제로는 MySQL
// 8.0.16+부터 지원하는데도 반영 안 됨). 그래서 이 데코레이터는 스키마
// 문서화 용도일 뿐이고, 실제 제약은 DB에 수동으로 만들어줘야 함 — 아래
// SQL을 새 환경(OCI 등)에도 동일하게 적용할 것:
//   ALTER TABLE `tasks`
//     ADD CONSTRAINT `CHK_task_dead_line_remind_time`
//     CHECK (`deadLine` <> `remindTime`);
@Entity('tasks')
@Check('CHK_task_dead_line_remind_time', '`deadLine` <> `remindTime`')
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
  cycleType: TaskCycle;

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

  // 꺼두면 지우지 않고도 알림 대상에서 빠짐 (완료 이력은 그대로 남음)
  @Column({ default: true })
  isActive: boolean;

  @OneToMany(() => TaskCompletion, (completion) => completion.task)
  completions: TaskCompletion[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
