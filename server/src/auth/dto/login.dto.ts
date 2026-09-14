import { IsEmail, IsEnum, IsString } from 'class-validator';
import { ClientType } from '../../entities/refresh.entity';

export class LoginDto {
  @IsEmail()
  email: string;

  @IsString()
  password: string;

  @IsEnum(ClientType)
  clientType: ClientType;
}
