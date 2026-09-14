import { TaskCycle } from '../../entities/task.entity';

interface WallClock {
  year: number;
  month: number; // 1-12
  day: number; // 1-31
  hour: number; // 0-23
  minute: number;
  weekday: number; // 0(일)~6(토)
}

const WEEKDAY_INDEX: Record<string, number> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
};

/**
 * 특정 타임존 기준으로 "지금이 몇 년 몇 월 며칠 몇 시 몇 분, 무슨 요일인지"를 계산한다.
 * JS Date는 항상 서버(런타임) 자체의 로컬 타임존만 알기 때문에, 다른 타임존의
 * 벽시계 시각을 구하려면 Intl.DateTimeFormat을 거쳐야 한다.
 */
export function getWallClock(date: Date, timezone: string): WallClock {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    weekday: 'short',
  }).formatToParts(date);

  const map: Record<string, string> = {};
  for (const part of parts) map[part.type] = part.value;

  return {
    year: Number(map.year),
    month: Number(map.month),
    day: Number(map.day),
    // 일부 ICU 구현이 자정을 "24"로 표기하는 특이 케이스 보정
    hour: map.hour === '24' ? 0 : Number(map.hour),
    minute: Number(map.minute),
    weekday: WEEKDAY_INDEX[map.weekday],
  };
}

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

/** 'YYYY-MM-DD HH:mm' 형식으로 조립 */
function formatDateTime(year: number, month: number, day: number, hour = 0, minute = 0): string {
  return `${year}-${pad(month)}-${pad(day)} ${pad(hour)}:${pad(minute)}`;
}

/** 실제 완료된 순간을 'YYYY-MM-DD HH:mm' 문자열로 (timezone 기준 벽시계 시각) */
export function formatCompleteTime(date: Date, timezone: string): string {
  const { year, month, day, hour, minute } = getWallClock(date, timezone);
  return formatDateTime(year, month, day, hour, minute);
}

interface CycleInfo {
  cycleType: TaskCycle;
  dueDate?: string; // ONCE일 때만 씀, 'YYYY-MM-DD'
}

/**
 * 지금(timezone 기준)이 속한 주기의 [시작, 끝) 범위를 'YYYY-MM-DD HH:mm' 문자열로 구한다.
 * completeTime이 이제 "정확한 완료 순간"이라 값이 매번 달라서, "이 주기 완료했나?"는
 * 정확히 일치가 아니라 이 범위 안에 completeTime이 있는지로 판단해야 한다.
 */
export function getCurrentPeriodRange(
  task: CycleInfo,
  timezone: string,
  date: Date = new Date(),
): { start: string; end: string } {
  const { year, month, day } = getWallClock(date, timezone);

  if (task.cycleType === TaskCycle.ONCE) {
    if (!task.dueDate) return { start: '', end: '' };
    const [y, m, d] = task.dueDate.split('-').map(Number);
    const nextDay = new Date(Date.UTC(y, m - 1, d + 1));
    return {
      start: formatDateTime(y, m, d),
      end: formatDateTime(nextDay.getUTCFullYear(), nextDay.getUTCMonth() + 1, nextDay.getUTCDate()),
    };
  }

  if (task.cycleType === TaskCycle.MONTHLY) {
    const nextMonth = new Date(Date.UTC(year, month, 1)); // month(1~12)를 그대로 넣으면 다음 달 1일이 됨
    return {
      start: formatDateTime(year, month, 1),
      end: formatDateTime(nextMonth.getUTCFullYear(), nextMonth.getUTCMonth() + 1, 1),
    };
  }

  if (task.cycleType === TaskCycle.WEEKLY) {
    const current = new Date(Date.UTC(year, month - 1, day));
    const dayNr = (current.getUTCDay() + 6) % 7; // 월요일=0 기준으로 보정
    const monday = new Date(current);
    monday.setUTCDate(current.getUTCDate() - dayNr);
    const nextMonday = new Date(monday);
    nextMonday.setUTCDate(monday.getUTCDate() + 7);
    return {
      start: formatDateTime(monday.getUTCFullYear(), monday.getUTCMonth() + 1, monday.getUTCDate()),
      end: formatDateTime(
        nextMonday.getUTCFullYear(),
        nextMonday.getUTCMonth() + 1,
        nextMonday.getUTCDate(),
      ),
    };
  }

  // DAILY
  const nextDay = new Date(Date.UTC(year, month - 1, day + 1));
  return {
    start: formatDateTime(year, month, day),
    end: formatDateTime(nextDay.getUTCFullYear(), nextDay.getUTCMonth() + 1, nextDay.getUTCDate()),
  };
}

/** 지금(timezone 기준)이 이 할 일의 주기에 해당하는 날인지 (WEEKLY/MONTHLY의 cycleValue, ONCE의 dueDate 확인) */
export function isTaskDueToday(
  task: { cycleType: TaskCycle; cycleValue?: number; dueDate?: string },
  timezone: string,
  date: Date = new Date(),
): boolean {
  const { year, month, day, weekday } = getWallClock(date, timezone);

  switch (task.cycleType) {
    case TaskCycle.DAILY:
      return true;
    case TaskCycle.WEEKLY:
      return task.cycleValue === undefined || task.cycleValue === weekday;
    case TaskCycle.MONTHLY:
      return task.cycleValue === undefined || task.cycleValue === day;
    case TaskCycle.ONCE: {
      const todayStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      return task.dueDate === todayStr;
    }
    default:
      return false;
  }
}
