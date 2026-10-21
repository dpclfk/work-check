import { Body, Controller, Get, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshDto } from './dto/refresh.dto';
import { UpdateMeDto } from './dto/update-me.dto';
import { JwtAuthGuard, AuthenticatedRequestUser } from './jwt-auth.guard';
import { CurrentUser } from './current-user.decorator';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @ApiOperation({ summary: '회원가입' })
  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @ApiOperation({ summary: '로그인' })
  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @ApiOperation({ summary: 'accessToken 재발급 (리프레시 토큰 로테이션됨)' })
  @Post('refresh')
  refresh(@Body() dto: RefreshDto) {
    return this.authService.refresh(dto);
  }

  @ApiOperation({ summary: '해당 리프레시 토큰 무효화' })
  @Post('logout')
  logout(@Body() dto: RefreshDto) {
    return this.authService.logout(dto);
  }

  @ApiOperation({ summary: '내 설정 조회 (discordRoom, discordAlarm, timezone)' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get('me')
  getMe(@CurrentUser() user: AuthenticatedRequestUser) {
    return this.authService.getMe(user.userId);
  }

  @ApiOperation({ summary: '내 설정 수정 (discordRoom, discordAlarm, timezone)' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Patch('me')
  updateMe(@CurrentUser() user: AuthenticatedRequestUser, @Body() dto: UpdateMeDto) {
    return this.authService.updateMe(user.userId, dto);
  }
}
