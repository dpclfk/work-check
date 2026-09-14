import { ConfigService } from '@nestjs/config';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { Task } from '../entities/task.entity';
import { TaskCompletion } from '../entities/task-completion.entity';
import { Device } from '../entities/device.entity';
import { User } from '../entities/user.entity';
import { UserSetting } from '../entities/user-setting.entity';
import { Refresh } from '../entities/refresh.entity';
import { MainCategory } from '../entities/main-category.entity';
import { SubCategory } from '../entities/sub-category.entity';

export const buildTypeOrmOptions = (configService: ConfigService): TypeOrmModuleOptions => ({
  type: 'mysql',
  host: configService.get<string>('DB_HOST', 'localhost'),
  port: configService.get<number>('DB_PORT', 3306),
  username: configService.get<string>('DB_USERNAME', 'root'),
  password: configService.get<string>('DB_PASSWORD', ''),
  database: configService.get<string>('DB_DATABASE', 'work_check'),
  entities: [Task, TaskCompletion, Device, User, UserSetting, Refresh, MainCategory, SubCategory],
  // 초기 개발 단계에서만 true로 사용. 운영에서는 마이그레이션으로 전환할 것.
  synchronize: configService.get<string>('NODE_ENV') !== 'production',
  charset: 'utf8mb4',
});
