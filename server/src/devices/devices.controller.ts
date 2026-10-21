import { Body, Controller, Delete, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { DevicesService } from './devices.service';
import { RegisterDeviceDto } from './dto/register-device.dto';
import { UpdateDeviceAlarmDto } from './dto/update-device-alarm.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { AuthenticatedRequestUser } from '../auth/jwt-auth.guard';

@ApiTags('devices')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('devices')
export class DevicesController {
  constructor(private readonly devicesService: DevicesService) {}

  @ApiOperation({ summary: '앱의 Expo 푸시 토큰 등록/갱신 (내 계정에 연결)' })
  @Post()
  register(@CurrentUser() user: AuthenticatedRequestUser, @Body() dto: RegisterDeviceDto) {
    return this.devicesService.register(user.userId, dto);
  }

  @ApiOperation({ summary: '이 기기 알림 켜기/끄기만 변경 (토큰/플랫폼은 그대로)' })
  @Patch(':token')
  updateAlarm(
    @CurrentUser() user: AuthenticatedRequestUser,
    @Param('token') token: string,
    @Body() dto: UpdateDeviceAlarmDto,
  ) {
    return this.devicesService.updateAlarm(user.userId, token, dto.deviceAlarm);
  }

  @ApiOperation({ summary: '푸시 토큰 삭제 (알림 끄기)' })
  @Delete(':token')
  remove(@CurrentUser() user: AuthenticatedRequestUser, @Param('token') token: string) {
    return this.devicesService.remove(user.userId, token);
  }
}
