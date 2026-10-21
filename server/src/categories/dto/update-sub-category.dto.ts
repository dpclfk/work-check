// @nestjs/mapped-types 대신 @nestjs/swagger의 PartialType — 이유는 update-task.dto.ts 주석 참고
import { PartialType } from '@nestjs/swagger';
import { CreateSubCategoryDto } from './create-sub-category.dto';

export class UpdateSubCategoryDto extends PartialType(CreateSubCategoryDto) {}
