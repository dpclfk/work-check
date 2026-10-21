// TypeORM CLI 전용 설정 — `npm run migration:*` 스크립트가 이 파일을 가리킴.
// buildTypeOrmOptions(typeorm.config.ts)는 Nest의 ConfigService를 통해 읽지만,
// CLI는 Nest 앱 컨텍스트 밖에서 독립 실행되므로 dotenv로 직접 .env를 읽는다.
import 'dotenv/config';
import { DataSource } from 'typeorm';
import { ENTITIES } from './typeorm.config';

// typeorm CLI는 "이 파일이 DataSource export를 정확히 하나만 가질 것"을
// 요구해서(둘 이상이면 어느 걸 써야 할지 모호하다고 에러) default export만 둠
export default new DataSource({
  type: 'mysql',
  host: process.env.DB_HOST ?? 'localhost',
  port: Number(process.env.DB_PORT ?? 3306),
  username: process.env.DB_USERNAME ?? 'root',
  password: process.env.DB_PASSWORD ?? '',
  database: process.env.DB_DATABASE ?? 'work_check',
  entities: ENTITIES,
  // CLI는 ts-node로 직접 .ts를 실행하므로 src 쪽 마이그레이션 파일을 그대로 가리킴
  // (런타임 Nest 앱은 typeorm.config.ts에서 dist/migrations/*.js를 따로 가리킴)
  migrations: [__dirname + '/../migrations/*.ts'],
  synchronize: false,
  charset: 'utf8mb4',
});
