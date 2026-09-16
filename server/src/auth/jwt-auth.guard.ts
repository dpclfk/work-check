import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

export interface AuthenticatedRequestUser {
  userId: number;
}

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly jwtService: JwtService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const authHeader: string | undefined = request.headers.authorization;

    if (!authHeader?.startsWith('Bearer ')) {
      throw new UnauthorizedException('인증 토큰이 필요합니다.');
    }

    const token = authHeader.slice('Bearer '.length);

    try {
      const payload = this.jwtService.verify<{ sub: number }>(token);
      const user: AuthenticatedRequestUser = { userId: payload.sub };
      request.user = user;
      return true;
    } catch {
      throw new UnauthorizedException('토큰이 유효하지 않거나 만료됐습니다.');
    }
  }
}
