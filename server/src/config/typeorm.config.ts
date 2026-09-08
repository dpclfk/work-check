import { ConfigService } from '@nestjs/config';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { Task } from '../tasks/entities/task.entity';
import { TaskCompletion } from '../tasks/entities/task-completion.entity';
import { DeviceToken } from '../devices/entities/device-token.entity';

export const buildTypeOrmOptions = (configService: ConfigService): TypeOrmModuleOptions => ({
  type: 'mysql',
  host: configService.get<string>('DB_HOST', 'localhost'),
  port: configService.get<number>('DB_PORT', 3306),
  username: configService.get<string>('DB_USERNAME', 'root'),
  password: configService.get<string>('DB_PASSWORD', ''),
  database: configService.get<string>('DB_DATABASE', 'work_check'),
  entities: [Task, TaskCompletion, DeviceToken],
  // 초기 개발 단계에서만 true로 사용. 운영에서는 마이그레이션으로 전환할 것.
  synchronize: configService.get<string>('NODE_ENV') !== 'production',
  charset: 'utf8mb4',
});
