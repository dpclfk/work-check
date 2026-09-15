import { IsEmail, IsEnum, IsStrongPassword } from 'class-validator';
import { ClientType } from '../../entities/refresh.entity';

export class LoginDto {
  // RegisterDto와 동일 규칙 — DB에 저장될 수 없는 형식/길이는 로그인 단계에서도 동일하게 거부
  @IsEmail({ allow_utf8_local_part: false }, { message: '이메일 형식이 올바르지 않습니다.' })
  email: string;

  @IsStrongPassword(
    { minLength: 8, minLowercase: 1, minUppercase: 0, minNumbers: 1, minSymbols: 1 },
    { message: '비밀번호는 최소8글자, 소문자, 숫자, 특수문자가 필요합니다.' },
  )
  password: string;

  @IsEnum(ClientType)
  clientType: ClientType;
}
