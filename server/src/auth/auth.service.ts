import { ConflictException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import { Repository } from 'typeorm';
import { User } from '../entities/user.entity';
import { UserSetting } from '../entities/user-setting.entity';
import { ClientType, Refresh } from '../entities/refresh.entity';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshDto } from './dto/refresh.dto';
import { UpdateMeDto } from './dto/update-me.dto';
import { PasswordService } from './password.service';
import { generateRefreshToken, hashRefreshToken } from './refresh-token.util';

const REFRESH_TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30일

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(UserSetting)
    private readonly userSettingRepository: Repository<UserSetting>,
    @InjectRepository(Refresh)
    private readonly refreshRepository: Repository<Refresh>,
    private readonly passwordService: PasswordService,
    private readonly jwtService: JwtService,
  ) {}

  async register(dto: RegisterDto) {
    const existing = await this.userRepository.findOne({ where: { email: dto.email } });
    if (existing) throw new ConflictException('이미 가입된 이메일입니다.');

    const password = await this.passwordService.hash(dto.password);
    const user = await this.userRepository.save(
      this.userRepository.create({ email: dto.email, password }),
    );
    // User 1명당 UserSetting 1개 — 기본값으로 같이 만들어둠 (없으면 getMe 등에서 매번 존재 확인해야 함)
    await this.userSettingRepository.save(this.userSettingRepository.create({ userId: user.id }));

    return { id: user.id, email: user.email };
  }

  async login(dto: LoginDto) {
    // password가 select: false라 기본 조회엔 안 딸려 나옴 — 검증하려면 여기서 명시적으로 요청
    const user = await this.userRepository.findOne({
      where: { email: dto.email },
      select: { id: true, email: true, password: true },
    });
    const invalidCredentials = () => new UnauthorizedException('이메일 또는 비밀번호가 올바르지 않습니다.');

    if (!user) throw invalidCredentials();

    const passwordValid = await this.passwordService.verify(dto.password, user.password);
    if (!passwordValid) throw invalidCredentials();

    return this.issueTokens(user, dto.clientType);
  }

  async refresh(dto: RefreshDto) {
    const tokenHash = hashRefreshToken(dto.refreshToken);
    const existing = await this.refreshRepository.findOne({
      where: { refreshToken: tokenHash },
      relations: ['user'],
    });

    if (!existing || existing.revokeAt || existing.expiresAt < new Date()) {
      throw new UnauthorizedException('유효하지 않거나 만료된 리프레시 토큰입니다.');
    }

    // 로테이션: 이 토큰은 여기서 무효화하고, 새 토큰을 발급한다.
    // 나중에 이 revoke된 토큰으로 다시 요청이 들어오면 탈취 의심 신호로 쓸 수 있음.
    existing.revokeAt = new Date();
    await this.refreshRepository.save(existing);

    return this.issueTokens(existing.user, existing.clientType);
  }

  async logout(dto: RefreshDto) {
    const tokenHash = hashRefreshToken(dto.refreshToken);
    await this.refreshRepository.update({ refreshToken: tokenHash }, { revokeAt: new Date() });
    return { success: true };
  }

  async getMe(userId: number) {
    const [user, setting] = await Promise.all([
      this.findUserOrThrow(userId),
      this.findOrCreateSetting(userId),
    ]);
    return this.toProfile(user, setting);
  }

  async updateMe(userId: number, dto: UpdateMeDto) {
    const [user, setting] = await Promise.all([
      this.findUserOrThrow(userId),
      this.findOrCreateSetting(userId),
    ]);
    Object.assign(setting, dto);
    const saved = await this.userSettingRepository.save(setting);
    return this.toProfile(user, saved);
  }

  private async findUserOrThrow(userId: number) {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('유저를 찾을 수 없습니다.');
    return user;
  }

  // register()에서 항상 같이 만들어두긴 하지만, 예전 계정 등 혹시 없는 경우를 대비한 방어 코드
  private async findOrCreateSetting(userId: number) {
    const existing = await this.userSettingRepository.findOne({ where: { userId } });
    if (existing) return existing;
    return this.userSettingRepository.save(this.userSettingRepository.create({ userId }));
  }

  // password를 절대 응답에 안 섞이게 여기서만 골라서 내려줌
  private toProfile(user: User, setting: UserSetting) {
    return {
      id: user.id,
      email: user.email,
      discordRoom: setting.discordRoom ?? null,
      discordAlarm: setting.discordAlarm,
      timezone: setting.timezone,
    };
  }

  private async issueTokens(user: User, clientType: ClientType) {
    const accessToken = this.jwtService.sign({ sub: user.id, email: user.email });

    const rawRefreshToken = generateRefreshToken();
    await this.refreshRepository.save(
      this.refreshRepository.create({
        userId: user.id,
        refreshToken: hashRefreshToken(rawRefreshToken),
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
