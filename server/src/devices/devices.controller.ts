import { Body, Controller, Delete, Param, Post } from '@nestjs/common';
import { DevicesService } from './devices.service';
import { RegisterDeviceDto } from './dto/register-device.dto';

@Controller('devices')
export class DevicesController {
  constructor(private readonly devicesService: DevicesService) {}

  // 앱이 실행될 때 Expo 푸시 토큰을 등록/갱신
  @Post()
  register(@Body() dto: RegisterDeviceDto) {
    return this.devicesService.register(dto);
  }

  // 로그아웃/알림 끄기 등으로 더 이상 안 쓰는 토큰 제거
  @Delete(':token')
  remove(@Param('token') token: string) {
    return this.devicesService.remove(token);
  }
}
