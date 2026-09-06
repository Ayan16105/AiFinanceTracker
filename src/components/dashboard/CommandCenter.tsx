'use client';

import React, { useState, useMemo } from 'react';
import { useFinance } from '@/context/FinanceContext';
import { 
  Wallet, 
  CheckCircle2, 
  AlertCircle, 
  Home, 
  Plus, 
  Calendar,
  Coffee, 
  Utensils, 
  ShoppingBag, 
  Car, 
  ArrowUpRight, 
  ChevronRight,
  Sliders
} from 'lucide-react';

export default function CommandCenter() {
  const { 
    safeToSpendRemaining, 
    userSettings, 
    payCycleInfo,
    spentToday, 
    todayDeficit, 
    transactions,
    setActiveTab,
    currentBalance,
    openSettings
  } = useFinance();

  const [filter, setFilter] = useState<'all' | 'food' | 'transport' | 'shopping'>('all');

  // Dynamic Weekly Spending Data (Monday to Sunday of current week)
  const weeklySpending = useMemo(() => {
    const now = new Date();
    // JavaScript getDay(): 0 = Sun, 1 = Mon, ..., 6 = Sat
    const currentDay = now.getDay();
    // In Monday-to-Sunday week: if today is Sun (0), distance to Monday is -6 days
    const distanceToMonday = currentDay === 0 ? -6 : 1 - currentDay;

    const monday = new Date(now);
    monday.setDate(now.getDate() + distanceToMonday);
    monday.setHours(0, 0, 0, 0);

    const pad = (n: number) => String(n).padStart(2, '0');
    const todayDateStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
    const todayUtcDateStr = now.toISOString().split('T')[0];

    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const limit = userSettings.dailySpendLimit || 540;

    return days.map((dayName, index) => {
      const d = new Date(monday);
      d.setDate(monday.getDate() + index);

      const dateStr = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
      const isToday = dateStr === todayDateStr || dateStr === todayUtcDateStr;
      const isFuture = dateStr > todayDateStr && !isToday;

      // Sum all discretionary expenses on this calendar day from transactions
      const spent = transactions
        .filter((tx) => (tx.date === dateStr || (isToday && tx.date === todayUtcDateStr)) && tx.transactionType === 'expense' && tx.isDiscretionary !== false)
        .reduce((sum, tx) => sum + tx.amount, 0);

      const isOverLimit = spent > limit;
      let barPercent = 8;
      if (isFuture) {
        barPercent = 6;
      } else if (spent > 0) {
        barPercent = Math.min(100, Math.max(16, Math.round((spent / limit) * 100)));
      }

      return {
        dayName,
        dayNumber: d.getDate(),
        dateStr,
        isToday,
        isFuture,
        spent,
        isOverLimit,
        barPercent,
      };
    });
  }, [transactions, userSettings.dailySpendLimit]);

  const filteredTransactions = transactions.filter((tx) => {
    if (filter === 'all') return true;
    const cat = tx.category.toLowerCase();
    if (filter === 'food') return cat.includes('food') || cat.includes('beverage');
    if (filter === 'transport') return cat.includes('transport') || cat.includes('transit');
    if (filter === 'shopping') return cat.includes('wardrobe') || cat.includes('cloth') || cat.includes('shopping');
    return true;
  });

  const percentSpent = Math.min(100, Math.round((spentToday / userSettings.dailySpendLimit) * 100));

  const getCategoryIcon = (category: string) => {
    const text = category.toLowerCase();
    if (text.includes('food') || text.includes('beverage') || text.includes('tea')) {
      return <Coffee className="w-5 h-5 text-amber-600" />;
    }
    if (text.includes('lunch') || text.includes('dinner') || text.includes('zomato')) {
      return <Utensils className="w-5 h-5 text-rose-500" />;
    }
    if (text.includes('cloth') || text.includes('wardrobe') || text.includes('zara')) {
      return <ShoppingBag className="w-5 h-5 text-purple-600" />;
    }
    if (text.includes('uber') || text.includes('transit') || text.includes('cab')) {
      return <Car className="w-5 h-5 text-blue-600" />;
    }
    return <ArrowUpRight className="w-5 h-5 text-slate-500" />;
  };

  return (
    <div className="w-full max-w-5xl mx-auto px-4 sm:px-8 py-6 sm:py-8 flex flex-col gap-6 sm:gap-8 pb-24 lg:pb-12">
      {/* Friendly Welcome & Date */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-[#006c49] font-mono-num text-[11px] font-bold">
              {payCycleInfo.isPaydayTomorrow ? '⏳ Pay Day Tomorrow Night (7th Sep)' : payCycleInfo.cycleStatusLabel}
            </span>
          </div>
          <h1 className="font-sans text-2xl sm:text-3xl font-bold text-[#0b1c30]">
            Hi, {userSettings.userName} 👋
          </h1>
          <p className="text-sm text-[#76777d] mt-0.5">
            {payCycleInfo.isPaydayTomorrow 
              ? `Final day of your monthly cycle (${payCycleInfo.cycleStartDate} – ${payCycleInfo.cycleEndDate}). Hold tight for 24 hours!`
              : `Current pay cycle: ${payCycleInfo.cycleStartDate} – ${payCycleInfo.cycleEndDate}.`}
          </p>
        </div>

        <button
          type="button"
          onClick={openSettings}
          className="hidden sm:flex self-start sm:self-auto items-center gap-2 px-4 py-2 rounded-full bg-white border border-slate-200 text-xs font-bold text-[#0b1c30] hover:bg-[#eff4ff] transition-all shadow-xs cursor-pointer"
        >
          <Sliders className="w-3.5 h-3.5 text-[#006c49]" />
          <span>Pay Day & Budget Settings</span>
        </button>
      </div>

      {/* 3 Core Beginner-Friendly Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Card 1: Safe to Spend Today */}
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div>
              <span className="text-xs font-bold text-[#76777d] uppercase tracking-wider">
                Safe to Spend Today
              </span>
              <div className="flex items-baseline gap-1 mt-1.5">
                <span
                  className={`font-mono-num text-3xl sm:text-4xl font-bold tracking-tight ${
                    todayDeficit > 0 ? 'text-[#ba1a1a]' : 'text-[#006c49]'
                  }`}
                >
                  {todayDeficit > 0 ? `-₹${todayDeficit.toFixed(0)}` : `₹${safeToSpendRemaining.toFixed(0)}`}
                </span>
                <span className="text-xs text-[#76777d] font-normal">
                  / ₹{userSettings.dailySpendLimit} limit
                </span>
              </div>
            </div>
            <div className="w-10 h-10 rounded-2xl bg-[#eff4ff] flex items-center justify-center text-[#006c49]">
              <Wallet className="w-5 h-5" />
            </div>
          </div>

          <div className="mt-5 flex flex-col gap-2">
            <div className="w-full h-2 rounded-full bg-[#e5eeff] overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  todayDeficit > 0 ? 'bg-[#ba1a1a]' : 'bg-[#006c49]'
                }`}
                style={{ width: `${percentSpent}%` }}
              />
            </div>
            <div className="flex justify-between items-center text-xs text-[#76777d]">
              <span>Spent ₹{spentToday.toFixed(0)} so far</span>
              <span className="font-semibold text-[#0b1c30]">{percentSpent}% used</span>
            </div>
          </div>
        </div>

        {/* Card 2: Monthly Salary & Fixed Bills */}
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div>
              <span className="text-xs font-bold text-[#76777d] uppercase tracking-wider">
                Monthly Salary & Bills
              </span>
              <div className="flex items-baseline gap-1 mt-1.5">
                <span className="font-mono-num text-3xl sm:text-4xl font-bold tracking-tight text-[#0b1c30]">
                  ₹{userSettings.monthlySalary?.toLocaleString() || '35,000'}
                </span>
                <span className="text-xs text-[#76777d]">/month</span>
              </div>
            </div>
            <div className="w-10 h-10 rounded-2xl bg-[#eff4ff] flex items-center justify-center text-[#0b1c30]">
              <Home className="w-5 h-5 text-[#006c49]" />
            </div>
          </div>

          <div className="mt-5 flex flex-col gap-1.5 text-xs text-[#45464d] bg-[#eff4ff]/60 p-3 rounded-2xl border border-slate-100">
            <div className="flex justify-between items-center pb-1 mb-1 border-b border-slate-200/60">
              <span className="font-semibold text-slate-700">Current Liquid Cash:</span>
              <span className="font-mono-num font-bold text-[#006c49] bg-white px-2 py-0.5 rounded-full border border-emerald-200 shadow-2xs">
                ₹{currentBalance.toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Household & Bills:</span>
              <span className="font-bold text-[#0b1c30]">₹{userSettings.householdFundCurrent.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span>Daily Spending Cap:</span>
              <span className="font-bold text-[#006c49]">₹{userSettings.dailySpendLimit}/day</span>
            </div>
          </div>
        </div>

        {/* Card 3: AI Accountant Status */}
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div>
              <span className="text-xs font-bold text-[#76777d] uppercase tracking-wider">
                AI Accountant Advice
              </span>
              <h3 className="font-sans text-xl font-bold text-[#0b1c30] mt-1.5">
                {todayDeficit > 0 ? 'Over Budget Today' : 'On Track!'}
              </h3>
            </div>
            <div
              className={`w-10 h-10 rounded-2xl flex items-center justify-center ${
                todayDeficit > 0 ? 'bg-rose-100 text-[#ba1a1a]' : 'bg-emerald-100 text-[#006c49]'
              }`}
            >
              {todayDeficit > 0 ? <AlertCircle className="w-5 h-5" /> : <CheckCircle2 className="w-5 h-5" />}
            </div>
          </div>

          <p className="text-xs text-[#45464d] mt-4 leading-relaxed bg-[#f8f9ff] p-3 rounded-2xl border border-slate-100">
            {todayDeficit > 0
              ? `You spent ₹${todayDeficit.toFixed(0)} over your limit today. Your AI accountant will ask you to save a bit tomorrow!`
              : `Great job staying disciplined! You still have ₹${safeToSpendRemaining.toFixed(0)} left for today.`}
          </p>
        </div>
      </div>

      {/* Simple Weekly Spending Chart */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-100 flex flex-col gap-5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-sans text-lg font-bold text-[#0b1c30]">
              This Week's Spending
            </h2>
            <p className="text-xs text-[#76777d]">
              Daily comparison against your ₹{userSettings.dailySpendLimit} limit
            </p>
          </div>
          <div className="flex items-center gap-3 text-xs">
            <span className="flex items-center gap-1 text-[#006c49] font-medium">
              <span className="w-2 h-2 rounded-full bg-[#006c49]" /> Under limit
            </span>
            <span className="flex items-center gap-1 text-[#ba1a1a] font-medium">
              <span className="w-2 h-2 rounded-full bg-[#ba1a1a]" /> Over limit
            </span>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-1.5 sm:gap-3 pt-2">
          {weeklySpending.map((day) => (
            <div
              key={day.dateStr}
              className={`flex flex-col items-center gap-1.5 p-1.5 sm:p-2.5 rounded-2xl transition-all ${
                day.isToday
                  ? 'bg-cyan-50/80 border-2 border-cyan-400 shadow-sm ring-2 ring-cyan-400/20'
                  : day.isOverLimit
                  ? 'bg-rose-50/70 border border-rose-200'
                  : day.isFuture
                  ? 'bg-slate-50/50 border border-slate-100/60 opacity-60'
                  : 'bg-[#eff4ff]/40 border border-slate-100 hover:bg-[#eff4ff]/70'
              }`}
              title={`${day.dayName}, ${day.dateStr}: ₹${day.spent.toLocaleString()} spent (${day.isToday ? 'Today' : day.isFuture ? 'Upcoming' : day.isOverLimit ? 'Over limit' : 'Under limit'})`}
            >
              <div className="flex flex-col items-center">
                <span className={`text-[10px] sm:text-[11px] font-bold ${
                  day.isToday
                    ? 'text-cyan-950 font-extrabold'
                    : day.isOverLimit
                    ? 'text-[#ba1a1a]'
                    : 'text-[#76777d]'
                }`}>
                  {day.isToday ? 'Today' : day.dayName}
                </span>
                <span className={`text-[9px] sm:text-[10px] font-medium leading-none mt-0.5 ${
                  day.isToday ? 'text-cyan-700 font-bold' : 'text-slate-400'
                }`}>
                  {day.isToday ? day.dayName : day.dayNumber}
                </span>
              </div>

              <div className={`w-full h-20 sm:h-24 rounded-xl flex items-end p-1 transition-all ${
                day.isToday
                  ? 'bg-cyan-100/60'
                  : day.isOverLimit
                  ? 'bg-rose-100/70'
                  : day.isFuture
                  ? 'bg-slate-100'
                  : 'bg-[#e5eeff]'
              }`}>
                <div
                  className={`w-full rounded-lg transition-all duration-500 ${
                    day.isOverLimit
                      ? 'bg-[#ba1a1a] shadow-xs'
                      : day.isFuture
                      ? 'bg-slate-300/60'
                      : day.spent > 0
                      ? 'bg-[#006c49] shadow-xs'
                      : 'bg-slate-300/50'
                  }`}
                  style={{ height: `${day.barPercent}%` }}
                />
              </div>

              <span className={`font-mono-num text-[10px] sm:text-xs font-bold truncate max-w-full ${
                day.isToday
                  ? day.isOverLimit ? 'text-[#ba1a1a]' : 'text-[#0b1c30]'
                  : day.isOverLimit
                  ? 'text-[#ba1a1a]'
                  : day.isFuture
                  ? 'text-slate-400 font-normal'
                  : 'text-[#0b1c30]'
              }`}>
                {day.isFuture ? '—' : `₹${day.spent.toFixed(0)}`}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Expenses Stream */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-100 flex flex-col gap-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="font-sans text-lg font-bold text-[#0b1c30]">
              Recent Expenses
            </h2>
            <p className="text-xs text-[#76777d]">
              Track where your money went today
            </p>
          </div>

          <button
            onClick={() => setActiveTab('ai-ca-ledger')}
            className="flex items-center gap-2 px-4 py-2 rounded-full bg-[#0b1c30] hover:bg-[#131b2e] text-white text-xs font-bold transition-all shadow-xs cursor-pointer self-start sm:self-auto"
          >
            <Plus className="w-4 h-4 text-[#6cf8bb]" />
            <span>Log an Expense in Chat</span>
          </button>
        </div>

        {/* Transactions List */}
        <div className="flex flex-col divide-y divide-slate-100">
          {filteredTransactions.map((tx) => (
            <div
              key={tx.id}
              className="flex items-center justify-between py-3.5 hover:bg-[#eff4ff]/40 px-2 rounded-2xl transition-colors"
            >
              <div className="flex items-center gap-3.5">
                <div
                  className={`w-10 h-10 rounded-2xl flex items-center justify-center ${
                    tx.isOverLimit ? 'bg-rose-100 text-[#ba1a1a]' : 'bg-[#eff4ff] text-[#006c49]'
                  }`}
                >
                  {getCategoryIcon(tx.category)}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-[#0b1c30]">{tx.merchant}</span>
                    {tx.isOverLimit && (
                      <span className="px-2 py-0.5 rounded-full bg-rose-100 text-[#ba1a1a] text-[10px] font-bold">
                        Over limit
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-[#76777d]">{tx.category}</span>
                </div>
              </div>

              <div className="text-right">
                <span
                  className={`font-mono-num text-sm sm:text-base font-bold ${
                    tx.isOverLimit ? 'text-[#ba1a1a]' : 'text-[#0b1c30]'
                  }`}
                >
                  -₹{tx.amount.toFixed(0)}
                </span>
                <span className="block text-[10px] text-[#76777d]">
                  {tx.time || 'Today'}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
