import { ConflictException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import { IsNull, Repository } from 'typeorm';
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

    // login()만 user를 같이 내려줌 — 웹/앱이 로그인 직후 /auth/me 없이도
    // 화면에 이메일을 바로 표시할 수 있게. refresh()는 이 정보가 필요 없음
    // (기존에 저장해둔 값을 그대로 재사용하기 때문)
    const tokens = await this.issueTokens(user, dto.clientType);
    return { ...tokens, user: { id: user.id, email: user.email } };
  }

  async refresh(dto: RefreshDto) {
    const tokenHash = hashRefreshToken(dto.refreshToken);
    const existing = await this.refreshRepository.findOne({
      where: { refreshToken: tokenHash },
      relations: ['user'],
    });

    if (!existing) {
      throw new UnauthorizedException('유효하지 않거나 만료된 리프레시 토큰입니다.');
    }

    // 이미 로테이션(또는 로그아웃)으로 무효화된 토큰이 재사용됨 — 탈취 의심 신호.
    // 공격자가 먼저 리프레시해서 이 토큰이 무효화됐고, 그 뒤에 진짜 주인이
    // (또는 반대로) 이 "오래된" 토큰으로 다시 요청한 상황이라, 서버는 둘 중
    // 누가 진짜 주인인지 구분할 수 없음. 그래서 안전하게 이 유저의 모든
    // 세션(아직 안 무효화된 리프레시 토큰 전부)을 강제 무효화해서, 공격자든
    // 진짜 사용자든 전부 다시 로그인(비밀번호 입력)하게 만듦
    if (existing.revokeAt) {
      await this.refreshRepository.update(
        { userId: existing.userId, revokeAt: IsNull() },
        { revokeAt: new Date() },
      );
      throw new UnauthorizedException(
        '이미 사용된 리프레시 토큰이 재사용되어 모든 세션을 무효화했습니다. 다시 로그인해주세요.',
      );
    }

    if (existing.expiresAt < new Date()) {
      throw new UnauthorizedException('유효하지 않거나 만료된 리프레시 토큰입니다.');
    }

    // 로테이션: 이 토큰은 여기서 무효화하고, 새 토큰을 발급한다.
    existing.revokeAt = new Date();
    await this.refreshRepository.save(existing);

    return this.issueTokens(existing.user, existing.clientType);
  }

  async logout(dto: RefreshDto) {
    const tokenHash = hashRefreshToken(dto.refreshToken);
    const existing = await this.refreshRepository.findOne({ where: { refreshToken: tokenHash } });

    if (!existing) {
      throw new UnauthorizedException('유효하지 않은 리프레시 토큰입니다.');
    }
    if (existing.revokeAt) {
      throw new UnauthorizedException('이미 로그아웃 되었습니다.');
    }

    existing.revokeAt = new Date();
    await this.refreshRepository.save(existing);
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

  // User 테이블에서 다른것도 쓰게될 경우를 대비해 User 테이블 전체를 받음
  private async issueTokens(user: User, clientType: ClientType) {
    const accessToken = this.jwtService.sign({ sub: user.id });

    const rawRefreshToken = generateRefreshToken();
    await this.refreshRepository.save(
      this.refreshRepository.create({
        userId: user.id,
        refreshToken: hashRefreshToken(rawRefreshToken),
        clientType,
        expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_MS),
      }),
    );

    return { accessToken, refreshToken: rawRefreshToken };
  }
}
