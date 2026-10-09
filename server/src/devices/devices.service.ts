import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Device } from '../entities/device.entity';
import { RegisterDeviceDto } from './dto/register-device.dto';

@Injectable()
export class DevicesService {
  constructor(
    @InjectRepository(Device)
    private readonly deviceRepository: Repository<Device>,
  ) {}

  async register(userId: number, dto: RegisterDeviceDto) {
    const existing = await this.deviceRepository.findOne({
      where: { deviceToken: dto.deviceToken },
    });
    if (existing) {
      existing.userId = userId;
      existing.platform = dto.platform ?? existing.platform;
      existing.deviceAlarm = dto.deviceAlarm ?? existing.deviceAlarm;
      return this.deviceRepository.save(existing);
    }

    const device = this.deviceRepository.create({ ...dto, userId });
    return this.deviceRepository.save(device);
  }

  remove(userId: number, deviceToken: string) {
    return this.deviceRepository.delete({ deviceToken, userId });
  }

  /** 알림 켜기/끄기만 변경 — register()와 달리 없으면 새로 만들지 않고 404 */
  async updateAlarm(userId: number, deviceToken: string, deviceAlarm: boolean) {
    const device = await this.deviceRepository.findOne({ where: { deviceToken, userId } });
    if (!device) throw new NotFoundException('디바이스를 찾을 수 없습니다.');

    device.deviceAlarm = deviceAlarm;
    return this.deviceRepository.save(device);
  }

  /** 알림 대상 기기 토큰만 (deviceAlarm이 꺼져있으면 제외) */
  async findAllTokens(userId: number): Promise<string[]> {
    const devices = await this.deviceRepository.find({ where: { userId, deviceAlarm: true } });
    return devices.map((device) => device.deviceToken);
  }
}
