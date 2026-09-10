import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { User } from './user.entity';

/** 디스코드 알림을 놓쳤을 때를 대비한 백업 채널 — 앱(휴대폰)의 푸시 토큰 */
@Entity('device_tokens')
export class DeviceToken {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  userId: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({ length: 255, unique: true })
  expoPushToken: string;

  @Column({ length: 20, nullable: true })
  platform?: string; // 'ios' | 'android'

  @CreateDateColumn()
  createdAt: Date;
}
