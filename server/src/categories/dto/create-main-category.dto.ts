import { IsString, MaxLength } from 'class-validator';

export class CreateMainCategoryDto {
  @IsString()
  @MaxLength(50)
  name: string;
}
