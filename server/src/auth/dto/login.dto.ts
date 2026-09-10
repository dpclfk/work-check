import { IsEmail, IsEnum, IsString } from 'class-validator';
import { ClientType } from '../../entities/refresh-token.entity';

export class LoginDto {
  @IsEmail()
  email: string;

  @IsString()
  password: string;

  @IsEnum(ClientType)
  clientType: ClientType;
}
