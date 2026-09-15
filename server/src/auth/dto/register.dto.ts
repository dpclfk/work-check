import { IsEmail, IsStrongPassword } from 'class-validator';

export class RegisterDto {
  // allow_utf8_local_part: false — 로컬파트(@ 앞부분)는 영어만 허용
  // ignore_max_length(기본 false)가 254자 제한을 이미 걸어주고, User.email
  // 컬럼도 254로 맞춰뒀기 때문에 별도 MaxLength가 필요 없음
  @IsEmail({ allow_utf8_local_part: false }, { message: '이메일 형식이 올바르지 않습니다.' })
  email: string;

  @IsStrongPassword(
    { minLength: 8, minLowercase: 1, minUppercase: 0, minNumbers: 1, minSymbols: 1 },
    { message: '비밀번호는 최소8글자, 소문자, 숫자, 특수문자가 필요합니다.' },
  )
  password: string;
}
