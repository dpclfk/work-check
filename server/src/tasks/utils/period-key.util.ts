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

interface CycleInfo {
  cycle: TaskCycle;
  dueDate?: string; // ONCE일 때만 씀, 'YYYY-MM-DD'
}

/** 주어진 시각(timezone 기준)이 속한 주기를 식별하는 키를 만든다. */
export function getCurrentPeriodKey(task: CycleInfo, timezone: string, date: Date = new Date()): string {
  if (task.cycle === TaskCycle.ONCE) {
    // ONCE는 dueDate 하루뿐이라, 그 날짜 자체가 곧 periodKey
    return task.dueDate ?? '';
  }

  const { year, month, day } = getWallClock(date, timezone);
  const mm = String(month).padStart(2, '0');
  const dd = String(day).padStart(2, '0');

  switch (task.cycle) {
    case TaskCycle.MONTHLY:
      return `${year}-${mm}`;
    case TaskCycle.WEEKLY:
      return `${year}-W${String(getIsoWeekNumber(year, month, day)).padStart(2, '0')}`;
    case TaskCycle.DAILY:
    default:
      return `${year}-${mm}-${dd}`;
  }
}

function getIsoWeekNumber(year: number, month: number, day: number): number {
  const target = new Date(Date.UTC(year, month - 1, day));
  const dayNr = (target.getUTCDay() + 6) % 7;
  target.setUTCDate(target.getUTCDate() - dayNr + 3);
  const firstThursday = new Date(Date.UTC(target.getUTCFullYear(), 0, 4));
  const diff = target.getTime() - firstThursday.getTime();
  return 1 + Math.round(diff / (7 * 24 * 60 * 60 * 1000));
}

/** 지금(timezone 기준)이 이 할 일의 주기에 해당하는 날인지 (WEEKLY/MONTHLY의 cycleValue, ONCE의 dueDate 확인) */
export function isTaskDueToday(
  task: { cycle: TaskCycle; cycleValue?: number; dueDate?: string },
  timezone: string,
  date: Date = new Date(),
): boolean {
  const { year, month, day, weekday } = getWallClock(date, timezone);

  switch (task.cycle) {
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
