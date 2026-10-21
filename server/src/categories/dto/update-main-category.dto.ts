// @nestjs/mapped-types 대신 @nestjs/swagger의 PartialType — 이유는 update-task.dto.ts 주석 참고
import { PartialType } from '@nestjs/swagger';
import { CreateMainCategoryDto } from './create-main-category.dto';

export class UpdateMainCategoryDto extends PartialType(CreateMainCategoryDto) {}
