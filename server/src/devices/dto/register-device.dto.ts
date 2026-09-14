import { IsBoolean, IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { DevicePlatform } from '../../entities/device.entity';

export class RegisterDeviceDto {
  @IsString()
  @MaxLength(255)
  deviceToken: string;

  @IsOptional()
  @IsEnum(DevicePlatform)
  platform?: DevicePlatform;

  @IsOptional()
  @IsBoolean()
  deviceAlarm?: boolean;
}
