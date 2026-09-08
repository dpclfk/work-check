import { TaskCycle } from '../entities/task.entity';

/** 주어진 날짜가 속한 주기를 식별하는 키를 만든다. */
export function getCurrentPeriodKey(cycleType: TaskCycle, date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  switch (cycleType) {
    case TaskCycle.MONTHLY:
      return `${year}-${month}`;
    case TaskCycle.WEEKLY:
      return `${year}-W${String(getIsoWeekNumber(date)).padStart(2, '0')}`;
    case TaskCycle.DAILY:
    default:
      return `${year}-${month}-${day}`;
  }
}

function getIsoWeekNumber(date: Date): number {
  const target = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNr = (target.getUTCDay() + 6) % 7;
  target.setUTCDate(target.getUTCDate() - dayNr + 3);
  const firstThursday = new Date(Date.UTC(target.getUTCFullYear(), 0, 4));
  const diff = target.getTime() - firstThursday.getTime();
  return 1 + Math.round(diff / (7 * 24 * 60 * 60 * 1000));
}

/** 오늘이 이 할 일의 주기에 해당하는 날인지 (WEEKLY/MONTHLY의 cycleValue 확인) */
export function isTaskDueToday(
  task: { cycleType: TaskCycle; cycleValue?: number },
  date: Date = new Date(),
): boolean {
  switch (task.cycleType) {
    case TaskCycle.DAILY:
      return true;
    case TaskCycle.WEEKLY:
      return task.cycleValue === undefined || task.cycleValue === date.getDay();
    case TaskCycle.MONTHLY:
      return task.cycleValue === undefined || task.cycleValue === date.getDate();
    default:
      return false;
  }
}
