// 자주 쓰는 IANA 타임존 (직접 고른 값들이라 오타 걱정 없이 항상 유효함).
export const COMMON_TIMEZONES: { value: string; label: string }[] = [
  { value: 'Asia/Seoul', label: 'Asia/Seoul (한국)' },
  { value: 'Asia/Tokyo', label: 'Asia/Tokyo (일본)' },
  { value: 'Asia/Shanghai', label: 'Asia/Shanghai (중국)' },
  { value: 'Asia/Taipei', label: 'Asia/Taipei (대만)' },
  { value: 'Asia/Hong_Kong', label: 'Asia/Hong_Kong (홍콩)' },
  { value: 'Asia/Singapore', label: 'Asia/Singapore (싱가포르)' },
  { value: 'Asia/Bangkok', label: 'Asia/Bangkok (태국)' },
  { value: 'Asia/Jakarta', label: 'Asia/Jakarta (인도네시아)' },
  { value: 'Asia/Kolkata', label: 'Asia/Kolkata (인도)' },
  { value: 'Asia/Dubai', label: 'Asia/Dubai (UAE)' },
  { value: 'Europe/London', label: 'Europe/London (영국)' },
  { value: 'Europe/Paris', label: 'Europe/Paris (프랑스)' },
  { value: 'Europe/Berlin', label: 'Europe/Berlin (독일)' },
  { value: 'Europe/Moscow', label: 'Europe/Moscow (러시아)' },
  { value: 'America/New_York', label: 'America/New_York (미국 동부)' },
  { value: 'America/Chicago', label: 'America/Chicago (미국 중부)' },
  { value: 'America/Denver', label: 'America/Denver (미국 산악)' },
  { value: 'America/Los_Angeles', label: 'America/Los_Angeles (미국 서부)' },
  { value: 'America/Sao_Paulo', label: 'America/Sao_Paulo (브라질)' },
  { value: 'Australia/Sydney', label: 'Australia/Sydney (호주)' },
  { value: 'Pacific/Auckland', label: 'Pacific/Auckland (뉴질랜드)' },
  { value: 'UTC', label: 'UTC' },
];

/** 지금 이 기기가 속한 타임존 (자동 감지용) */
export function detectLocalTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return 'Asia/Seoul';
  }
}

/** 현재 값이 COMMON_TIMEZONES에 없으면(과거에 다른 값으로 설정된 경우) 맨 앞에 끼워서 반환 */
export function buildTimezoneOptions(currentValue?: string) {
  if (!currentValue || COMMON_TIMEZONES.some((tz) => tz.value === currentValue)) {
    return COMMON_TIMEZONES;
  }
  return [{ value: currentValue, label: currentValue }, ...COMMON_TIMEZONES];
}
