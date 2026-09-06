export interface JarvisGreetingContext {
  userName: string;
  userTitle?: string;
  dailyLimit: number;
  spentToday: number;
  safeToSpendRemaining: number;
  daysToSalary?: number;
}

export function generateJarvisGreeting(ctx: JarvisGreetingContext): string {
  const hour = new Date().getHours();
  const name = ctx.userName?.trim() || 'Boss';
  const title = ctx.userTitle?.trim() || 'Sir';
  const salutation = name.toLowerCase() === 'boss' ? 'Boss' : `${name} ${title}`;

  const remaining = Math.max(0, Math.round(ctx.safeToSpendRemaining));
  const spent = Math.round(ctx.spentToday);
  const limit = Math.round(ctx.dailyLimit);
  const isOver = ctx.spentToday > ctx.dailyLimit;
  const deficit = Math.round(ctx.spentToday - ctx.dailyLimit);

  // Time of day bucket
  const isMorning = hour >= 4 && hour < 12;
  const isAfternoon = hour >= 12 && hour < 17;
  const isEvening = hour >= 17 && hour < 22;
  const isLateNight = hour >= 22 || hour < 4;

  const morningPool = [
    `Good morning, ${salutation}! 🎩☕ J.A.R.V.I.S. online and systems nominal. Today's fuel allowance is locked at ₹${limit}. Try not to make the local coffee house an equity partner before noon! How may I assist your ledger today? 🥐💳`,
    `Top of the morning, ${salutation}! ⚡ All financial radar sensors are active. You have ₹${limit} in today's operating budget. Let's conquer the day — preferably without any spontaneous impulse purchases! 🛡️🎯`,
    `Greetings, ${salutation}! 🌅 Fresh sunrise, fresh ledger. Daily cap is locked at ₹${limit}. Ready to record any breakfast conquests or execute budget maneuvers at your command, Sir! ☕🥐✨`
  ];

  const afternoonPool = [
    `Good afternoon, ${salutation}! 🎩 Mid-day telemetry check: you've deployed ₹${spent} today, leaving ₹${remaining} in your tactical reserve. Shall we log lunch or review pending debits? 🍽️💳`,
    `Hello ${salutation}! ☀️ Hope your afternoon is treating you well. Your vault remains steady with ₹${remaining} safe to spend before nightfall. What are we recording today? 💰🛡️`,
    `Afternoon protocols initiated, ${salutation}! ⚡ Watching the ledger like a hawk. You have ₹${remaining} remaining for today. Tap or type whenever you make a move! 🦅💼`
  ];

  const eveningPool = [
    `Good evening, ${salutation}! 🎩🌆 Twilight ledger audit ready. Today's total logged expenditure is ₹${spent}. Whether you're settling dinner bills or planning tomorrow, your butler is at your service! 🍽️💳`,
    `Evening, ${salutation}! ☕ Hope the day was fruitful. We have ₹${remaining} left in today's allowance. Let's reconcile any evening expenses before closing the books! 🛡️✨`,
    `Welcome back, ${salutation}! 🌙 Running end-of-day diagnostics. Let's make sure every rupee is accounted for before you relax for the night! 💼📊`
  ];

  const lateNightPool = [
    `Burning the midnight oil, ${salutation}? 🕯️ Remember, online carts are 40% more tempting after midnight! Daily ledger stands at ₹${spent} spent. What requires logging? 🛒🧐`,
    `Late night audit active, ${salutation}! 🛡️ Still standing guard over your treasury. If you made late-night food or cab bookings, pass them to me and I'll balance the numbers! 🚕🍕`,
    `Greetings into the night, ${salutation}! 🌙 Financial guardians never sleep. Standing by for any late transactions or budget queries! 🎩⚡`
  ];

  const overLimitPool = [
    `Welcome back, ${salutation}! 🚨 Friendly heads-up: we are currently ₹${deficit} over today's standard allowance. Do not despair — I am auto-amortizing the difference so your monthly balance stays bulletproof! What can I log for you? 🛡️🥊`,
    `Ah, ${salutation}! ⚠️ Flashing a gentle amber caution: today's spending has passed the mark by ₹${deficit}. Consider me your financial conscience. Standing by for your next entry! 🧐💳`
  ];

  if (isOver) {
    const randomIndex = Math.floor(Math.random() * overLimitPool.length);
    return overLimitPool[randomIndex];
  }

  let selectedPool = afternoonPool;
  if (isMorning) selectedPool = morningPool;
  else if (isAfternoon) selectedPool = afternoonPool;
  else if (isEvening) selectedPool = eveningPool;
  else if (isLateNight) selectedPool = lateNightPool;

  const randomIndex = Math.floor(Math.random() * selectedPool.length);
  return selectedPool[randomIndex];
}
