import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './filter/http-exception.filter';
import { AllExceptionsFilter } from './filter/all-exceptions.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors();
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  // 순서 중요(직관과 반대!): Nest가 내부적으로 useGlobalFilters에 넘긴
  // 배열을 reverse() 해서 매칭하기 때문에, 먼저 매칭돼야 하는(더 구체적인)
  // HttpExceptionFilter를 뒤에 넣어야 함. 이렇게 해야 HttpException(4xx)은
  // HttpExceptionFilter가 먼저 잡고, 그 외(예상 못한 에러, 사실상 5xx)만
  // AllExceptionsFilter로 넘어감
  app.useGlobalFilters(new AllExceptionsFilter(), new HttpExceptionFilter());

  const port = process.env.PORT ?? 3000;
  await app.listen(port);
  console.log(`Server running on http://localhost:${port}`);
}

bootstrap();
