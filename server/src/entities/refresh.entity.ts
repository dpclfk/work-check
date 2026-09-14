import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from './user.entity';

export enum ClientType {
  WEB = 'web',
  APP = 'app',
}

@Entity('refreshes')
export class Refresh {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  userId: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  // SHA-512(원본 토큰) hex. 원본 토큰은 DB에 절대 저장 안 함.
  @Column({ length: 128, unique: true })
  refreshToken: string;

  @Column({ type: 'enum', enum: ClientType })
  clientType: ClientType;

  @Column()
  expiresAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  // 로그아웃/로테이션으로 무효화된 시각. null이면 아직 유효.
  @Column({ nullable: true })
  revokeAt?: Date;
}
