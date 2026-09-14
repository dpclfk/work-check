import { IsBoolean, IsOptional, IsTimeZone, IsUrl, MaxLength, ValidateIf } from 'class-validator';

export class UpdateMeDto {
  // null을 보내면 웹훅 해제(제거), 값을 보내면 반드시 유효한 URL이어야 함,
  // 아예 안 보내면(undefined) 기존 값 유지
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsUrl()
  @MaxLength(255)
  discordRoom?: string | null;

  @IsOptional()
  @IsBoolean()
  discordAlarm?: boolean;

  // IANA 타임존 이름 (예: 'Asia/Seoul', 'America/New_York')
  @IsOptional()
  @IsTimeZone()
  timezone?: string;
}
