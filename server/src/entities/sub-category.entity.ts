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

  // 메인카테고리 없이 서브카테고리만 쓰는 경우가 있어서 nullable
  @Column({ nullable: true })
  mainCategoryId?: number;

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
