import { IsInt, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateSubCategoryDto {
  @IsString()
  @MaxLength(50)
  name: string;

  // 메인카테고리 없이 서브카테고리만 쓸 수도 있어서 nullable (SubCategory 엔티티와 동일한 정책).
  // null을 명시적으로 보내면 "메인카테고리와 분리"라는 의도(SubCategoriesService 참고)
  @IsOptional()
  @IsInt()
  mainCategoryId?: number | null;
}
