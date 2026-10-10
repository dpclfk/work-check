import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MainCategory } from '../entities/main-category.entity';
import { SubCategory } from '../entities/sub-category.entity';
import { Task } from '../entities/task.entity';
import { MainCategoriesService } from './main-categories.service';
import { SubCategoriesService } from './sub-categories.service';
import { MainCategoriesController } from './main-categories.controller';
import { SubCategoriesController } from './sub-categories.controller';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [TypeOrmModule.forFeature([MainCategory, SubCategory, Task]), AuthModule],
  controllers: [MainCategoriesController, SubCategoriesController],
  providers: [MainCategoriesService, SubCategoriesService],
})
export class CategoriesModule {}
