import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { MainCategory } from '../entities/main-category.entity';
import { SubCategory } from '../entities/sub-category.entity';
import { Task } from '../entities/task.entity';
import { CreateMainCategoryDto } from './dto/create-main-category.dto';
import { UpdateMainCategoryDto } from './dto/update-main-category.dto';

@Injectable()
export class MainCategoriesService {
  constructor(
    @InjectRepository(MainCategory)
    private readonly mainCategoryRepository: Repository<MainCategory>,
    @InjectRepository(SubCategory)
    private readonly subCategoryRepository: Repository<SubCategory>,
    @InjectRepository(Task)
    private readonly taskRepository: Repository<Task>,
  ) {}

  create(userId: number, dto: CreateMainCategoryDto) {
    const category = this.mainCategoryRepository.create({ ...dto, userId });
    return this.mainCategoryRepository.save(category);
  }

  findAll(userId: number) {
    return this.mainCategoryRepository.find({ where: { userId }, order: { createdAt: 'DESC' } });
  }

  async findOne(userId: number, id: number) {
    const category = await this.mainCategoryRepository.findOne({ where: { id, userId } });
    if (!category) throw new NotFoundException(`MainCategory #${id}를 찾을 수 없습니다.`);
    return category;
  }

  async update(userId: number, id: number, dto: UpdateMainCategoryDto) {
    const category = await this.findOne(userId, id);
    Object.assign(category, dto);
    return this.mainCategoryRepository.save(category);
  }

  /**
   * deleteSubItems=false(기본): 이 메인카테고리만 지움 — SubCategory.mainCategory가
   * onDelete:'SET NULL'이라 DB가 알아서 하위 서브카테고리들의 mainCategoryId를 null로 바꿔줌
   * (서브카테고리 자체도, 그 밑의 task도 그대로 남음)
   *
   * deleteSubItems=true: 이 메인카테고리 아래 서브카테고리 전부 + 그 서브카테고리들에
   * 딸린 task까지 전부 같이 지움. task를 먼저 지운 뒤 서브카테고리를 지워야 함
   * (반대 순서면 Task.subCategory의 SET NULL이 먼저 발동해서 "지워야 할 task 목록"을
   * subCategoryId로 못 찾게 됨)
   */
  async remove(userId: number, id: number, deleteSubItems: boolean) {
    const category = await this.findOne(userId, id);

    if (deleteSubItems) {
      const subCategories = await this.subCategoryRepository.find({ where: { mainCategoryId: id } });
      const subCategoryIds = subCategories.map((sub) => sub.id);
      if (subCategoryIds.length > 0) {
        await this.taskRepository.delete({ subCategoryId: In(subCategoryIds) });
        await this.subCategoryRepository.delete({ id: In(subCategoryIds) });
      }
    }

    await this.mainCategoryRepository.remove(category);
    return { success: true };
  }
}
