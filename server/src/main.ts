import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './filter/http-exception.filter';
import { AllExceptionsFilter } from './filter/all-exceptions.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors();
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

  // /api-docs에서 Swagger UI 제공. SWAGGER_ENABLED=false로 끌 수 있음(기본은 켜짐) —
  // NODE_ENV로 분기 안 하는 이유: docker-compose의 env_file(.env)이 Dockerfile의
  // ENV NODE_ENV=production보다 우선해서, 지금 이 프로젝트는 OCI 배포에서도
  // NODE_ENV가 .env 값(development)로 덮여 있음(README 참고) — 그 값에 기대지 않고
  // 별도 플래그로 명시적으로 제어함
  if (process.env.SWAGGER_ENABLED !== 'false') {
    const config = new DocumentBuilder()
      .setTitle('Work Check API')
      .setDescription(
        '일일/주간/월간 등 반복 주기로 해야 하는 일들을 등록해두고, 완료하지 않으면 ' +
          '디스코드/푸시 알림을 보내주는 앱의 API. 대부분의 엔드포인트는 로그인 후 ' +
          '발급받은 accessToken을 우측 상단 Authorize 버튼으로 등록해야 호출 가능합니다.',
      )
      .setVersion('1.0')
      .addBearerAuth()
      .build();
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api-docs', app, document);
  }
  // 순서 중요(직관과 반대!): Nest가 내부적으로 useGlobalFilters에 넘긴
  // 배열을 reverse() 해서 매칭하기 때문에, 먼저 매칭돼야 하는(더 구체적인)
  // HttpExceptionFilter를 뒤에 넣어야 함. 이렇게 해야 HttpException(4xx)은
  // HttpExceptionFilter가 먼저 잡고, 그 외(예상 못한 에러, 사실상 5xx)만
  // AllExceptionsFilter로 넘어감
  app.useGlobalFilters(new AllExceptionsFilter(), new HttpExceptionFilter());

  const port = process.env.PORT ?? 3000;
  await app.listen(port);
  console.log(`Server running on http://localhost:${port}`);
  if (process.env.SWAGGER_ENABLED !== 'false') {
    console.log(`Swagger docs at http://localhost:${port}/api-docs`);
  }
}

bootstrap();
