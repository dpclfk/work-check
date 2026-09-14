import { Column, CreateDateColumn, Entity, Index, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Task } from './task.entity';

@Entity('task_completions')
// task+completeTime 유니크는 안 씀 — completeTime이 이제 실제 완료 순간(분 단위)이라
// 값이 매번 달라서 "정확히 일치"로는 중복 방지가 안 됨. 중복 체크는
// getCurrentPeriodRange()로 구한 범위 안에 있는지로 서비스 코드에서 함.
@Index(['task'])
export class TaskCompletion {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Task, (task) => task.completions, { onDelete: 'CASCADE' })
  task: Task;

  // 실제로 완료한 순간. 'YYYY-MM-DD HH:mm' (해당 유저 타임존 기준 벽시계 시각)
  @Column({ length: 20 })
  completeTime: string;

  @CreateDateColumn()
  createdAt: Date;
}
