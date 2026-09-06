export interface PayCycleInfo {
  salaryDay: number;
  daysRemaining: number;
  isPaydayToday: boolean;
  isPaydayTomorrow: boolean;
  cycleTotalDays: number;
  currentDayInCycle: number;
  cycleStartDate: string;
  cycleEndDate: string;
  cycleStatusLabel: string;
  cycleHeadline: string;
}

export function getPayCycleInfo(salaryDay: number = 7, now: Date = new Date()): PayCycleInfo {
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth(); // 0-indexed (0 = Jan, 8 = Sep)
  const currentDay = now.getDate();

  let cycleStart: Date;
  let cycleEnd: Date;

  if (currentDay >= salaryDay) {
    // Current cycle started this month on salaryDay, ends next month on salaryDay
    cycleStart = new Date(currentYear, currentMonth, salaryDay);
    cycleEnd = new Date(currentYear, currentMonth + 1, salaryDay);
  } else {
    // Current cycle started last month on salaryDay, ends this month on salaryDay
    cycleStart = new Date(currentYear, currentMonth - 1, salaryDay);
    cycleEnd = new Date(currentYear, currentMonth, salaryDay);
  }

  // Calculate day difference
  const msPerDay = 24 * 60 * 60 * 1000;
  const cycleTotalDays = Math.round((cycleEnd.getTime() - cycleStart.getTime()) / msPerDay);
  const daysPassed = Math.round((now.getTime() - cycleStart.getTime()) / msPerDay);
  const currentDayInCycle = Math.max(1, Math.min(cycleTotalDays, daysPassed + 1));
  const daysRemaining = Math.max(0, Math.round((cycleEnd.getTime() - now.getTime()) / msPerDay));

  const isPaydayToday = currentDay === salaryDay;
  const isPaydayTomorrow = daysRemaining === 1;

  const monthNames = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
  ];

  const cycleStartDate = `${cycleStart.getDate()} ${monthNames[cycleStart.getMonth()]}`;
  const cycleEndDate = `${cycleEnd.getDate()} ${monthNames[cycleEnd.getMonth()]}`;

  let cycleStatusLabel = `${daysRemaining} days left until Pay Day (${cycleEndDate})`;
  let cycleHeadline = `Cycle: ${cycleStartDate} – ${cycleEndDate}`;

  if (isPaydayToday) {
    cycleStatusLabel = `🎉 Salary lands tonight! (${cycleEndDate})`;
    cycleHeadline = 'Final hours of current pay cycle';
  } else if (isPaydayTomorrow) {
    cycleStatusLabel = `⏳ Pay Day tomorrow night! (7th ${monthNames[cycleEnd.getMonth()]})`;
    cycleHeadline = `Final day of pay cycle • Stretch your remaining balance`;
  }

  return {
    salaryDay,
    daysRemaining,
    isPaydayToday,
    isPaydayTomorrow,
    cycleTotalDays,
    currentDayInCycle,
    cycleStartDate,
    cycleEndDate,
    cycleStatusLabel,
    cycleHeadline,
  };
}
