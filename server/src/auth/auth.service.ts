import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import { Repository } from 'typeorm';
import { User } from '../entities/user.entity';
import { ClientType, RefreshToken } from '../entities/refresh-token.entity';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshDto } from './dto/refresh.dto';
import { PasswordService } from './password.service';
import { generateRefreshToken, hashRefreshToken } from './refresh-token.util';

const REFRESH_TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30일

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(RefreshToken)
    private readonly refreshTokenRepository: Repository<RefreshToken>,
    private readonly passwordService: PasswordService,
    private readonly jwtService: JwtService,
  ) {}

  async register(dto: RegisterDto) {
    const existing = await this.userRepository.findOne({ where: { email: dto.email } });
    if (existing) throw new ConflictException('이미 가입된 이메일입니다.');

    const passwordHash = await this.passwordService.hash(dto.password);
    const user = await this.userRepository.save(
      this.userRepository.create({ email: dto.email, passwordHash }),
    );

    return { id: user.id, email: user.email };
  }

  async login(dto: LoginDto) {
    const user = await this.userRepository.findOne({ where: { email: dto.email } });
    const invalidCredentials = () => new UnauthorizedException('이메일 또는 비밀번호가 올바르지 않습니다.');

    if (!user) throw invalidCredentials();

    const passwordValid = await this.passwordService.verify(dto.password, user.passwordHash);
    if (!passwordValid) throw invalidCredentials();

    return this.issueTokens(user, dto.clientType);
  }

  async refresh(dto: RefreshDto) {
    const tokenHash = hashRefreshToken(dto.refreshToken);
    const existing = await this.refreshTokenRepository.findOne({
      where: { tokenHash },
      relations: ['user'],
    });

    if (!existing || existing.revokedAt || existing.expiresAt < new Date()) {
      throw new UnauthorizedException('유효하지 않거나 만료된 리프레시 토큰입니다.');
    }

    // 로테이션: 이 토큰은 여기서 무효화하고, 새 토큰을 발급한다.
    // 나중에 이 revoke된 토큰으로 다시 요청이 들어오면 탈취 의심 신호로 쓸 수 있음.
    existing.revokedAt = new Date();
    await this.refreshTokenRepository.save(existing);

    return this.issueTokens(existing.user, existing.clientType);
  }

  async logout(dto: RefreshDto) {
    const tokenHash = hashRefreshToken(dto.refreshToken);
    await this.refreshTokenRepository.update({ tokenHash }, { revokedAt: new Date() });
    return { success: true };
  }

  private async issueTokens(user: User, clientType: ClientType) {
    const accessToken = this.jwtService.sign({ sub: user.id, email: user.email });

    const rawRefreshToken = generateRefreshToken();
    await this.refreshTokenRepository.save(
      this.refreshTokenRepository.create({
        userId: user.id,
        tokenHash: hashRefreshToken(rawRefreshToken),
        clientType,
        expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_MS),
      }),
    );

    return {
      accessToken,
      refreshToken: rawRefreshToken,
      user: { id: user.id, email: user.email },
    };
  }
}
