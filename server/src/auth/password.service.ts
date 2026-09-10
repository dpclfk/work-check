import { Injectable } from '@nestjs/common';
import { pbkdf2, randomBytes, timingSafeEqual } from 'crypto';
import { promisify } from 'util';

const pbkdf2Async = promisify(pbkdf2);

// OWASP 권장 수준. 저장 포맷에 같이 박아두니 나중에 올려도 기존 값은 그대로 검증 가능.
const ITERATIONS = 600_000;
const KEY_LENGTH = 64;
const DIGEST = 'sha512';

@Injectable()
export class PasswordService {
  async hash(password: string): Promise<string> {
    const salt = randomBytes(16).toString('hex');
    const derivedKey = await pbkdf2Async(password, salt, ITERATIONS, KEY_LENGTH, DIGEST);
    return `${ITERATIONS}:${salt}:${derivedKey.toString('hex')}`;
  }

  async verify(password: string, stored: string): Promise<boolean> {
    const [iterationsStr, salt, hashHex] = stored.split(':');
    if (!iterationsStr || !salt || !hashHex) return false;

    const derivedKey = await pbkdf2Async(password, salt, Number(iterationsStr), KEY_LENGTH, DIGEST);
    const storedBuffer = Buffer.from(hashHex, 'hex');

    // 길이가 다르면 timingSafeEqual이 예외를 던지므로 먼저 체크
    if (derivedKey.length !== storedBuffer.length) return false;
    return timingSafeEqual(derivedKey, storedBuffer);
  }
}
