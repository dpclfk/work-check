import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { User } from './user.entity';

export enum DevicePlatform {
  IOS = 'ios',
  ANDROID = 'android',
}

/** 디스코드 알림을 놓쳤을 때를 대비한 백업 채널 — 앱(휴대폰)의 푸시 토큰 */
@Entity('devices')
export class Device {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  userId: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({ length: 255, unique: true })
  deviceToken: string;

  // 꺼져 있으면 이 기기로는 푸시를 안 보냄
  @Column({ default: false })
  deviceAlarm: boolean;

  @Column({ type: 'enum', enum: DevicePlatform, nullable: true })
  platform?: DevicePlatform;

  @CreateDateColumn()
  createdAt: Date;
}
