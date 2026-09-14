import { Column, Entity, JoinColumn, OneToOne, PrimaryColumn } from 'typeorm';
import { User } from './user.entity';

/**
 * User와 1:1 — userId를 PK이자 FK로 공유하는 패턴(공유 기본키).
 * 유저 한 명당 반드시 하나만 존재해야 하는 설정이라 이 방식이 자연스러움.
 * 회원가입 시 AuthService가 기본값으로 같이 만들어줌.
 */
@Entity('user_settings')
export class UserSetting {
  @PrimaryColumn()
  userId: number;

  @OneToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  // 이 유저의 알림이 갈 디스코드 방(웹훅 URL)
  @Column({ length: 255, nullable: true })
  discordRoom?: string;

  // discordRoom이 설정돼 있어도 이게 꺼져있으면 알림을 안 보냄
  @Column({ default: false })
  discordAlarm: boolean;

  @Column({ length: 50, default: 'Asia/Seoul' })
  timezone: string;
}
