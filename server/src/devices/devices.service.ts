import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DeviceToken } from './entities/device-token.entity';
import { RegisterDeviceDto } from './dto/register-device.dto';

@Injectable()
export class DevicesService {
  constructor(
    @InjectRepository(DeviceToken)
    private readonly deviceRepository: Repository<DeviceToken>,
  ) {}

  async register(dto: RegisterDeviceDto) {
    const existing = await this.deviceRepository.findOne({
      where: { expoPushToken: dto.expoPushToken },
    });
    if (existing) {
      existing.platform = dto.platform ?? existing.platform;
      return this.deviceRepository.save(existing);
    }

    const device = this.deviceRepository.create(dto);
    return this.deviceRepository.save(device);
  }

  remove(expoPushToken: string) {
    return this.deviceRepository.delete({ expoPushToken });
  }

  async findAllTokens(): Promise<string[]> {
    const devices = await this.deviceRepository.find();
    return devices.map((device) => device.expoPushToken);
  }
}
