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
import { Transform } from 'class-transformer';
import { TaskCycle } from '../../entities/task.entity';

// 숫자로 해석 가능한 문자열("9" 같은거)만 숫자로 바꿈. 빈 문자열/null/undefined/"abc"는 그대로
// Number("")는 0이 되어서 일부러 변환 대상에서 제외
function toIntIfNumericString({ value }: { value: unknown }) {
  if (typeof value === 'string' && value.trim() !== '' && !Number.isNaN(Number(value))) {
    return Number(value);
  }
  return value;
}

export class CreateTaskDto {
  @IsOptional()
  @IsInt()
  subCategoryId?: number;

  // 숫자/불리언으로 보내도 문자열로 바꿔줌 (예: 123 -> "123").
  // 객체/배열/null/undefined는 그대로 둬서 @IsString()이 정상적으로 막게 함
  @Transform(({ value }) =>
    typeof value === 'number' || typeof value === 'boolean' ? String(value) : value,
  )
  @IsString()
  @MaxLength(50)
  name: string;

  @IsEnum(TaskCycle)
  cycleType: TaskCycle;

  // WEEKLY: 0(일)~6(토), MONTHLY: 1~31
  @IsOptional()
  @Transform(toIntIfNumericString)
  @IsInt()
  @Min(0)
  @Max(31)
  cycleValue?: number;

  // ONCE일 때만 씀. 'YYYY-MM-DD'
  // 한번 할건데 언제까지 완료 할건지
  @IsOptional()
  @IsDateString()
  dueDate?: string;

  // 몇시까지 완료 해야 되는지
  @Transform(toIntIfNumericString)
  @IsInt()
  @Min(0)
  @Max(23)
  deadLine: number;

  // 알람으로 언제 알려줄건지
  @Transform(toIntIfNumericString)
  @IsInt()
  @Min(0)
  @Max(23)
  remindTime: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
