import { Body, Controller, Delete, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { DevicesService } from './devices.service';
import { RegisterDeviceDto } from './dto/register-device.dto';
import { UpdateDeviceAlarmDto } from './dto/update-device-alarm.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { AuthenticatedRequestUser } from '../auth/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('devices')
export class DevicesController {
  constructor(private readonly devicesService: DevicesService) {}

  // 앱이 실행될 때(로그인 이후) Expo 푸시 토큰을 등록/갱신
  @Post()
  register(@CurrentUser() user: AuthenticatedRequestUser, @Body() dto: RegisterDeviceDto) {
    return this.devicesService.register(user.userId, dto);
  }

  // 이 기기의 알림 켜기/끄기만 변경 (토큰/플랫폼은 그대로)
  @Patch(':token')
  updateAlarm(
    @CurrentUser() user: AuthenticatedRequestUser,
    @Param('token') token: string,
    @Body() dto: UpdateDeviceAlarmDto,
  ) {
    return this.devicesService.updateAlarm(user.userId, token, dto.deviceAlarm);
  }

  // 로그아웃/알림 끄기 등으로 더 이상 안 쓰는 토큰 제거
  @Delete(':token')
  remove(@CurrentUser() user: AuthenticatedRequestUser, @Param('token') token: string) {
    return this.devicesService.remove(user.userId, token);
  }
}
