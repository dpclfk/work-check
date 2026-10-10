import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MainCategory } from '../entities/main-category.entity';
import { SubCategory } from '../entities/sub-category.entity';
import { Task } from '../entities/task.entity';
import { CreateSubCategoryDto } from './dto/create-sub-category.dto';
import { UpdateSubCategoryDto } from './dto/update-sub-category.dto';

@Injectable()
export class SubCategoriesService {
  constructor(
    @InjectRepository(SubCategory)
    private readonly subCategoryRepository: Repository<SubCategory>,
    @InjectRepository(MainCategory)
    private readonly mainCategoryRepository: Repository<MainCategory>,
    @InjectRepository(Task)
    private readonly taskRepository: Repository<Task>,
  ) {}

  async create(userId: number, dto: CreateSubCategoryDto) {
    // null은 "메인카테고리 없이"라는 의도된 값이라 검증 대상이 아님 — undefined/null
    // 둘 다 건너뛰고, 실제 id가 왔을 때만 존재/소유 여부를 확인함
    if (dto.mainCategoryId !== undefined && dto.mainCategoryId !== null) {
      await this.assertMainCategoryOwned(userId, dto.mainCategoryId);
    }
    const category = this.subCategoryRepository.create({ ...dto, userId });
    return this.subCategoryRepository.save(category);
  }

  findAll(userId: number) {
    return this.subCategoryRepository.find({ where: { userId }, order: { createdAt: 'DESC' } });
  }

  async findOne(userId: number, id: number) {
    const category = await this.subCategoryRepository.findOne({ where: { id, userId } });
    if (!category) throw new NotFoundException(`SubCategory #${id}를 찾을 수 없습니다.`);
    return category;
  }

  async update(userId: number, id: number, dto: UpdateSubCategoryDto) {
    const category = await this.findOne(userId, id);
    // null로 보내면 "메인카테고리에서 분리"라는 의도된 요청 — 검증 없이 그대로 적용
    if (dto.mainCategoryId !== undefined && dto.mainCategoryId !== null) {
      await this.assertMainCategoryOwned(userId, dto.mainCategoryId);
    }
    Object.assign(category, dto);
    return this.subCategoryRepository.save(category);
  }

  /**
   * deleteSubItems=false(기본): 서브카테고리만 지움 — Task.subCategory가
   * onDelete:'SET NULL'이라 DB가 알아서 이 서브카테고리를 쓰던 task들의
   * subCategoryId를 null로 바꿔줌 (task 자체는 그대로 남음)
   *
   * deleteSubItems=true: 이 서브카테고리를 쓰는 task까지 전부 같이 지움
   */
  async remove(userId: number, id: number, deleteSubItems: boolean) {
    const category = await this.findOne(userId, id);

    if (deleteSubItems) {
      await this.taskRepository.delete({ subCategoryId: id });
    }

    await this.subCategoryRepository.remove(category);
    return { success: true };
  }

  /** mainCategoryId가 "존재하고 + 내 소유"인지 — 참조값 자체의 유효성 검증이라 400 */
  private async assertMainCategoryOwned(userId: number, mainCategoryId: number) {
    const exists = await this.mainCategoryRepository.findOne({ where: { id: mainCategoryId, userId } });
    if (!exists) throw new BadRequestException('유효하지 않은 메인 카테고리입니다.');
  }
}
