import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
} from '@nestjs/common';
import { Response } from 'express';

@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const errMessage = exception.getResponse() as {
      message: string | string[];
      statusCode: number;
      error: string;
    };
    // HttpException(BadRequestException/UnauthorizedException/NotFoundException 등)은
    // 여기서 잡히는 이상 전부 4xx라 로그를 남기지 않음 — 5xx(예상 못한 서버 에러)는
    // AllExceptionsFilter가 따로 잡아서 로그를 남김
    if (Array.isArray(errMessage.message)) {
      errMessage.message = errMessage.message[0];
    }
    response.status(exception.getStatus()).json({
      statusCode: exception.getStatus(),
      message: errMessage.message,
    });
  }
}
