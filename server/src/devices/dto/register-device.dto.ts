import { IsOptional, IsString, MaxLength } from 'class-validator';

export class RegisterDeviceDto {
  @IsString()
  @MaxLength(255)
  expoPushToken: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  platform?: string;
}
