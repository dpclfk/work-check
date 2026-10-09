import { TaskCycle } from '../../entities/task.entity';

export const KST_TIMEZONE = 'Asia/Seoul';

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

interface DateFields {
  year: number;
  month: number;
  day: number;
}

/**
 * 임의 타임존의 벽시계 시각(연,월,일,시,분)을, 그 시각이 실제로 가리키는
 * UTC 순간(Date)으로 변환한다 — getWallClock()의 반대 방향.
 *
 * JS 표준 API엔 이 방향(벽시계 -> UTC 순간, 임의 타임존 기준)이 없어서
 * (Date.UTC는 입력을 "UTC 그 자체"로만 간주함) 아래 트릭을 쓴다:
 *   1. 입력 벽시계 숫자를 일단 UTC라고 가정해 임시 Date를 만든다 (실제 offset 모름)
 *   2. 그 임시 Date를 다시 timezone 기준 벽시계로 포맷해보면, 그 타임존의
 *      UTC offset만큼 원래 입력과 오차가 생긴다
 *   3. 오차만큼 보정해서 최종 UTC 순간을 구한다 (DST가 있는 타임존도,
 *      임시 Date의 날짜가 실제 날짜와 하루 이상 차이나지 않는 한 이 한 번의
 *      보정으로 거의 항상 정확함)
 */
export function zonedWallClockToUtc(
  wallClock: DateFields & { hour: number; minute: number },
  timezone: string,
): Date {
  const guess = new Date(
    Date.UTC(wallClock.year, wallClock.month - 1, wallClock.day, wallClock.hour, wallClock.minute),
  );
  const seenInTimezone = getWallClock(guess, timezone);
  const seenAsUtcMs = Date.UTC(
    seenInTimezone.year,
    seenInTimezone.month - 1,
    seenInTimezone.day,
    seenInTimezone.hour,
    seenInTimezone.minute,
  );
  const driftMs = guess.getTime() - seenAsUtcMs;
  return new Date(guess.getTime() + driftMs);
}

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

/** 'YYYY-MM-DD HH:mm' 형식으로 조립 */
function formatDateTime(year: number, month: number, day: number, hour = 0, minute = 0): string {
  return `${year}-${pad(month)}-${pad(day)} ${pad(hour)}:${pad(minute)}`;
}

/** 'YYYY-MM-DD' 형식으로 조립 */
function formatDate(year: number, month: number, day: number): string {
  return `${year}-${pad(month)}-${pad(day)}`;
}

/** 순수 달력 연산(실제 타임존 순간과 무관) — Y/M/D에 일수를 더하고 월/연도 overflow를 보정 */
function addCalendarDays(date: DateFields, days: number): DateFields {
  const d = new Date(Date.UTC(date.year, date.month - 1, date.day + days));
  return { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1, day: d.getUTCDate() };
}

/** 순수 달력 연산 — 월을 더하고(연도 overflow 보정), day는 그대로 유지 시도 */
function addCalendarMonths(date: DateFields, months: number): DateFields {
  const d = new Date(Date.UTC(date.year, date.month - 1 + months, 1));
  return { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1, day: date.day };
}

/** 그 년/월에 실제로 존재하는 날짜인지 (예: 2월 30일처럼 존재하지 않는 날짜 방지) */
function isValidCalendarDate(date: DateFields): boolean {
  const d = new Date(Date.UTC(date.year, date.month - 1, date.day));
  return d.getUTCFullYear() === date.year && d.getUTCMonth() === date.month - 1 && d.getUTCDate() === date.day;
}

interface TaskScheduleFields {
  cycleType: TaskCycle;
  cycleValue?: number;
  dueDate?: string; // 'YYYY-MM-DD'
  deadLine: number; // hour 0-23
  remindTime: number; // hour 0-23
}

/**
 * 할 일의 일정 관련 필드(cycleValue/dueDate/deadLine/remindTime)를 한 타임존
 * 기준에서 다른 타임존 기준으로 환산한다. (fromTz -> toTz 양방향 공용 —
 * 저장 시엔 유저타임존->한국시간, 조회 응답 시엔 한국시간->유저타임존으로 씀)
 *
 * 날짜/요일을 미는 기준은 deadLine 하나뿐이다. remindTime은 시(hour)만
 * 독립적으로 환산하고, cycleValue(요일/일자)·dueDate에는 영향을 주지 않는다 —
 * Task 한 행엔 cycleValue/dueDate가 하나씩뿐이라 "두 시각이 서로 다른
 * 날짜로 밀리면 어느 쪽을 기준으로 할지" 동률을 깨야 했고, 마감(deadLine)이
 * "이 주기가 언제 끝나는지"를 결정하는 더 본질적인 값이라고 판단해 이걸
 * 기준으로 삼음.
 */
export function convertScheduleFields(
  fields: TaskScheduleFields,
  fromTz: string,
  toTz: string,
  now: Date = new Date(),
): TaskScheduleFields {
  if (fromTz === toTz) return fields;

  // remindTime은 날짜 앵커와 무관하게 그 자체 시각만 변환
  const convertHourOnly = (hour: number, anchor: DateFields): number => {
    const utc = zonedWallClockToUtc({ ...anchor, hour, minute: 0 }, fromTz);
    return getWallClock(utc, toTz).hour;
  };

  switch (fields.cycleType) {
    case TaskCycle.DAILY: {
      const anchor = getWallClock(now, fromTz); // 날짜는 의미 없음, 아무 날이나 기준으로 시각만 환산
      const deadLineUtc = zonedWallClockToUtc({ ...anchor, hour: fields.deadLine, minute: 0 }, fromTz);
      return {
        ...fields,
        deadLine: getWallClock(deadLineUtc, toTz).hour,
        remindTime: convertHourOnly(fields.remindTime, anchor),
      };
    }

    case TaskCycle.WEEKLY: {
      const nowInFromTz = getWallClock(now, fromTz);
      const targetWeekday = fields.cycleValue ?? nowInFromTz.weekday;
      const diffDays = (targetWeekday - nowInFromTz.weekday + 7) % 7;
      const anchor = addCalendarDays(nowInFromTz, diffDays);

      const deadLineUtc = zonedWallClockToUtc({ ...anchor, hour: fields.deadLine, minute: 0 }, fromTz);
      const deadLineConverted = getWallClock(deadLineUtc, toTz);

      return {
        ...fields,
        cycleValue: deadLineConverted.weekday,
        deadLine: deadLineConverted.hour,
        remindTime: convertHourOnly(fields.remindTime, anchor),
      };
    }

    case TaskCycle.MONTHLY: {
      const nowInFromTz = getWallClock(now, fromTz);
      const targetDay = fields.cycleValue ?? nowInFromTz.day;
      // 이번 달에 그 날짜가 없으면(예: 2월 30일) 가장 가까운 유효한 달까지 탐색
      let anchor: DateFields = { year: nowInFromTz.year, month: nowInFromTz.month, day: targetDay };
      for (let i = 0; i < 12 && !isValidCalendarDate(anchor); i++) {
        anchor = { ...addCalendarMonths(anchor, 1), day: targetDay };
      }

      const deadLineUtc = zonedWallClockToUtc({ ...anchor, hour: fields.deadLine, minute: 0 }, fromTz);
      const deadLineConverted = getWallClock(deadLineUtc, toTz);

      return {
        ...fields,
        cycleValue: deadLineConverted.day,
        deadLine: deadLineConverted.hour,
        remindTime: convertHourOnly(fields.remindTime, anchor),
      };
    }

    case TaskCycle.ONCE: {
      if (!fields.dueDate) return fields;
      const [y, m, d] = fields.dueDate.split('-').map(Number);
      const anchor: DateFields = { year: y, month: m, day: d };

      const deadLineUtc = zonedWallClockToUtc({ ...anchor, hour: fields.deadLine, minute: 0 }, fromTz);
      const deadLineConverted = getWallClock(deadLineUtc, toTz);

      return {
        ...fields,
        dueDate: formatDate(deadLineConverted.year, deadLineConverted.month, deadLineConverted.day),
        deadLine: deadLineConverted.hour,
        remindTime: convertHourOnly(fields.remindTime, anchor),
      };
    }
  }
}

/** 실제 완료된 순간을 'YYYY-MM-DD HH:mm' 형식으로 (항상 한국시간 기준 — Task 필드가 전부 한국시간으로 저장되므로 통일) */
export function formatCompleteTime(date: Date): string {
  const { year, month, day, hour, minute } = getWallClock(date, KST_TIMEZONE);
  return formatDateTime(year, month, day, hour, minute);
}

/** 한국시간 기준 'YYYY-MM-DD HH:mm' 문자열을, 조회용으로 다른 타임존 기준 같은 포맷으로 바꿔 보여줄 때 씀 */
export function formatInTimezone(kstDateTimeStr: string, timezone: string): string {
  const [datePart, timePart] = kstDateTimeStr.split(' ');
  const [year, month, day] = datePart.split('-').map(Number);
  const [hour, minute] = timePart.split(':').map(Number);
  const utc = zonedWallClockToUtc({ year, month, day, hour, minute }, KST_TIMEZONE);
  const wc = getWallClock(utc, timezone);
  return formatDateTime(wc.year, wc.month, wc.day, wc.hour, wc.minute);
}

interface DeadlineOccurrences {
  /** now 시점 기준, 가장 최근에 지난(또는 지금 막 도달한) 마감 순간. ONCE가 아직 안 지났으면 null */
  previous: Date | null;
  /** now 시점 기준, 다음으로 다가올 마감 순간. ONCE가 이미 지났으면 null */
  next: Date | null;
}

/**
 * Task의 cycleType/cycleValue/dueDate/deadLine(전부 한국시간 기준으로 저장돼
 * 있음을 전제)으로부터, now 기준 "가장 최근 지난 마감"과 "다음 마감"의 실제
 * 순간(UTC Date)을 계산한다. 평가 시점에 유저 타임존을 몰라도 되는 이유가
 * 바로 이것 — Task 필드 자체가 이미 한국시간이라 항상 KST_TIMEZONE 하나만 씀.
 */
export function getDeadlineOccurrences(
  task: { cycleType: TaskCycle; cycleValue?: number; dueDate?: string; deadLine: number },
  now: Date = new Date(),
): DeadlineOccurrences {
  const nowKst = getWallClock(now, KST_TIMEZONE);

  if (task.cycleType === TaskCycle.ONCE) {
    if (!task.dueDate) return { previous: null, next: null };
    const [y, m, d] = task.dueDate.split('-').map(Number);
    const moment = zonedWallClockToUtc({ year: y, month: m, day: d, hour: task.deadLine, minute: 0 }, KST_TIMEZONE);
    return moment.getTime() > now.getTime()
      ? { previous: null, next: moment }
      : { previous: moment, next: null };
  }

  if (task.cycleType === TaskCycle.DAILY) {
    const candidate = zonedWallClockToUtc({ ...nowKst, hour: task.deadLine, minute: 0 }, KST_TIMEZONE);
    if (candidate.getTime() > now.getTime()) {
      const prevDay = addCalendarDays(nowKst, -1);
      return {
        previous: zonedWallClockToUtc({ ...prevDay, hour: task.deadLine, minute: 0 }, KST_TIMEZONE),
        next: candidate,
      };
    }
    const nextDay = addCalendarDays(nowKst, 1);
    return {
      previous: candidate,
      next: zonedWallClockToUtc({ ...nextDay, hour: task.deadLine, minute: 0 }, KST_TIMEZONE),
    };
  }

  if (task.cycleType === TaskCycle.WEEKLY) {
    const targetWeekday = task.cycleValue ?? nowKst.weekday;
    const diffDays = (targetWeekday - nowKst.weekday + 7) % 7; // 0~6, 이번 주 안에서 가장 가까운 해당 요일(과거면 다음 주로 보정 아래에서)
    const thisWeekAnchor = addCalendarDays(nowKst, diffDays);
    const candidate = zonedWallClockToUtc({ ...thisWeekAnchor, hour: task.deadLine, minute: 0 }, KST_TIMEZONE);

    if (candidate.getTime() > now.getTime()) {
      const prevWeekAnchor = addCalendarDays(thisWeekAnchor, -7);
      return {
        previous: zonedWallClockToUtc({ ...prevWeekAnchor, hour: task.deadLine, minute: 0 }, KST_TIMEZONE),
        next: candidate,
      };
    }
    const nextWeekAnchor = addCalendarDays(thisWeekAnchor, 7);
    return {
      previous: candidate,
      next: zonedWallClockToUtc({ ...nextWeekAnchor, hour: task.deadLine, minute: 0 }, KST_TIMEZONE),
    };
  }

  // MONTHLY
  const targetDay = task.cycleValue ?? nowKst.day;
  const findValidMonth = (anchor: DateFields, step: 1 | -1): DateFields => {
    let candidate = { ...anchor, day: targetDay };
    for (let i = 0; i < 12 && !isValidCalendarDate(candidate); i++) {
      candidate = { ...addCalendarMonths(candidate, step), day: targetDay };
    }
    return candidate;
  };

  const thisMonthAnchor = findValidMonth({ year: nowKst.year, month: nowKst.month, day: 1 }, 1);
  const candidate = zonedWallClockToUtc({ ...thisMonthAnchor, hour: task.deadLine, minute: 0 }, KST_TIMEZONE);

  if (candidate.getTime() > now.getTime()) {
    const prevMonthAnchor = findValidMonth(addCalendarMonths(thisMonthAnchor, -1), -1);
    return {
      previous: zonedWallClockToUtc({ ...prevMonthAnchor, hour: task.deadLine, minute: 0 }, KST_TIMEZONE),
      next: candidate,
    };
  }
  const nextMonthAnchor = findValidMonth(addCalendarMonths(thisMonthAnchor, 1), 1);
  return {
    previous: candidate,
    next: zonedWallClockToUtc({ ...nextMonthAnchor, hour: task.deadLine, minute: 0 }, KST_TIMEZONE),
  };
}

/**
 * "이미 이번 주기를 완료했나?" 체크용 [시작, 끝) 범위를 'YYYY-MM-DD HH:mm'
 * 문자열로 구한다 — [previous 마감, next 마감) 사이. deadLine을 기준으로
 * 경계가 잡히므로(달력 자정이 아니라) 새벽 마감 등 자정을 넘는 경우도
 * 자연스럽게 처리됨. ONCE는 "그 전까지 아무때나 1번이라도" 완료하면
 * 인정되므로 시작을 사실상 무한 과거로 둠.
 */
export function getCurrentPeriodRange(
  task: { cycleType: TaskCycle; cycleValue?: number; dueDate?: string; deadLine: number },
  now: Date = new Date(),
): { start: string; end: string } {
  const { previous, next } = getDeadlineOccurrences(task, now);

  if (task.cycleType === TaskCycle.ONCE) {
    // 이미 끝난 ONCE: previous만 있음 -> [먼 과거, previous+1분) 사이 아무때나 완료면 인정
    // 아직 안 끝난 ONCE: next만 있음 -> [먼 과거, next) 사이 아무때나 완료면 인정 (미리 완료 가능)
    const end = previous ?? next;
    return { start: formatDateTime(1970, 1, 1), end: end ? formatCompleteTime(end) : formatDateTime(9999, 12, 31) };
  }

  // DAILY/WEEKLY/MONTHLY: previous/next 둘 다 항상 존재
  return { start: formatCompleteTime(previous!), end: formatCompleteTime(next!) };
}
