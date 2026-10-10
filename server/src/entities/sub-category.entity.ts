import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from './user.entity';
import { MainCategory } from './main-category.entity';

@Entity('sub_categories')
export class SubCategory {
  @PrimaryGeneratedColumn()
  id: number;

  // 메인카테고리 없이 서브카테고리만 쓰는 경우가 있어서 nullable.
  // 타입에 null도 명시 — PATCH로 명시적 null을 받아 "메인카테고리에서 분리"를 표현하므로
  @Column({ nullable: true })
  mainCategoryId?: number | null;

  @ManyToOne(() => MainCategory, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'mainCategoryId' })
  mainCategory?: MainCategory;

  @Column()
  userId: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({ length: 50 })
  name: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
