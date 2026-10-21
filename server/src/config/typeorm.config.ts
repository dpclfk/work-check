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

// NestJS용(buildTypeOrmOptions)과 CLI용(config/data-source.ts) 양쪽이 공유하는
// 엔티티 목록 — 새 엔티티 추가 시 여기 한 곳만 수정하면 둘 다 반영됨
export const ENTITIES = [Task, TaskCompletion, Device, User, UserSetting, Refresh, MainCategory, SubCategory];

export const buildTypeOrmOptions = (configService: ConfigService): TypeOrmModuleOptions => ({
  type: 'mysql',
  host: configService.get<string>('DB_HOST', 'localhost'),
  port: configService.get<number>('DB_PORT', 3306),
  username: configService.get<string>('DB_USERNAME', 'root'),
  password: configService.get<string>('DB_PASSWORD', ''),
  database: configService.get<string>('DB_DATABASE', 'work_check'),
  entities: ENTITIES,
  // synchronize는 더 이상 안 씀(마이그레이션으로 전환) — 아래 migrations/
  // migrationsRun 참고. 자세한 경위는 CLAUDE.md "TypeORM 마이그레이션" 참고
  synchronize: false,
  // dist/migrations/*.js(빌드 산출물) — src가 아니라 컴파일된 js를 가리켜야
  // 런타임(node dist/main)에서 찾을 수 있음. CLI(ts-node)는 아래
  // config/data-source.ts가 src/migrations/*.ts를 따로 가리킴
  migrations: [__dirname + '/../migrations/*.js'],
  // 서버가 뜰 때마다 자동으로 미반영 마이그레이션을 실행 — docker-compose가
  // `docker compose up -d --build`만으로 끝나는 기존 배포 방식을 그대로
  // 유지하기 위해 별도 CLI 스텝 없이 부팅 시점에 처리함
  migrationsRun: true,
  charset: 'utf8mb4',
});
