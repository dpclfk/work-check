import { IsBoolean } from 'class-validator';

export class UpdateDeviceAlarmDto {
  @IsBoolean()
  deviceAlarm: boolean;
}
