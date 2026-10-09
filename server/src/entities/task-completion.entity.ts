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

  // 실제로 완료한 순간. 'YYYY-MM-DD HH:mm' (항상 한국시간(KST) 기준으로 저장 —
  // Task.deadLine 등 일정 필드도 전부 KST로 저장되므로, 주기 비교(getCurrentPeriodRange)가
  // 서로 다른 타임존끼리 비교되는 일이 없게 통일함. 조회 응답에서만 유저 타임존으로 역산해서 보여줌)
  @Column({ length: 20 })
  completeTime: string;

  @CreateDateColumn()
  createdAt: Date;
}
