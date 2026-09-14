import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 255, unique: true })
  email: string;

  // PBKDF2 결과. 형식: "{iterations}:{salt}:{hash}" (전부 hex)
  // select: false — 로그인 검증 때만 명시적으로 select 옵션에 넣어서 꺼내씀,
  // 그 외 find()/findOne() 호출에서는 아예 안 딸려 나옴 (응답에 새어나갈 일 자체를 차단)
  @Column({ length: 255, select: false })
  password: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
