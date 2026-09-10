import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 255, unique: true })
  email: string;

  // PBKDF2 결과. 형식: "{iterations}:{salt}:{hash}" (전부 hex)
  @Column({ length: 255 })
  passwordHash: string;

  // 이 유저의 알림이 갈 디스코드 웹훅 URL
  @Column({ length: 500, nullable: true })
  discordWebhookUrl?: string;

  @Column({ length: 50, default: 'Asia/Seoul' })
  timezone: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
