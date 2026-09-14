import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { TaskCycle } from '../../entities/task.entity';

export class CreateTaskDto {
  @IsOptional()
  @IsInt()
  subCategoryId?: number;

  @IsString()
  @MaxLength(50)
  name: string;

  @IsEnum(TaskCycle)
  cycleType: TaskCycle;

  // WEEKLY: 0(일)~6(토), MONTHLY: 1~31
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(31)
  cycleValue?: number;

  // ONCE일 때만 씀. 'YYYY-MM-DD'
  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @IsInt()
  @Min(0)
  @Max(23)
  deadLine: number;

  @IsInt()
  @Min(0)
  @Max(23)
  remindTime: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
