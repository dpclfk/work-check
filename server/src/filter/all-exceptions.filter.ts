import { ArgumentsHost, Catch, ExceptionFilter, HttpStatus } from '@nestjs/common';
import { Response } from 'express';

// HttpException(BadRequestException 등, 늘 4xx)이 아닌 나머지 전부를 잡는
// catch-all — DB 연결 끊김, 코드 버그로 인한 TypeError 등 "예상 못한" 에러라
// 사실상 전부 5xx. main.ts에서 HttpExceptionFilter보다 뒤에 등록해야
// HttpException은 그쪽이 먼저 잡고, 여기로는 안 넘어옴.
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    // 클라이언트에겐 내부 구현이 드러나지 않는 일반 메시지만 내려주고,
    // 실제 원인은 서버 콘솔에만 남김 (스택트레이스 포함)
    console.error(exception);

    response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      message: '서버에 오류가 발생했습니다.',
    });
  }
}
