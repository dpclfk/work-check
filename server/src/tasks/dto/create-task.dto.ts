import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
} from 'class-validator';
import { TaskCycle } from '../../entities/task.entity';

export class CreateTaskDto {
  @IsString()
  @MaxLength(100)
  title: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsEnum(TaskCycle)
  cycleType: TaskCycle;

  @IsOptional()
  @IsInt()
  @Min(0)
  cycleValue?: number;

  @IsOptional()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, {
    message: 'reminderTime은 HH:mm 형식이어야 합니다.',
  })
  reminderTime?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
