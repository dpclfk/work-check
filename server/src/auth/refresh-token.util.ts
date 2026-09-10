import { createHash, randomBytes } from 'crypto';

/** 클라이언트에게 내려줄 원본 토큰 (DB엔 절대 이 값을 저장하지 않음) */
export function generateRefreshToken(): string {
  return randomBytes(64).toString('hex');
}

/** DB에 저장/조회할 때 쓰는 해시 (SHA-512, salt 없음 — 토큰값으로 직접 조회 가능해야 해서) */
export function hashRefreshToken(token: string): string {
  return createHash('sha512').update(token).digest('hex');
}
