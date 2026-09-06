'use client';

import React from 'react';
import { useFinance } from '@/context/FinanceContext';
import { 
  LayoutDashboard, 
  MessageSquareText, 
  Target, 
  Sparkles,
  SlidersHorizontal,
  Receipt
} from 'lucide-react';

export default function Sidebar() {
  const { activeTab, setActiveTab, userSettings, openSettings } = useFinance();

  const navItems = [
    { id: 'command-center', label: 'Dashboard', Icon: LayoutDashboard },
    { id: 'ai-ca-ledger', label: 'Terminal', Icon: MessageSquareText },
    { id: 'transactions-ledger', label: 'Ledger', Icon: Receipt },
    { id: 'radar-and-horizons', label: 'Goals', Icon: Target },
  ] as const;

  return (
    <aside className="fixed left-0 top-0 h-full w-72 bg-white border-r border-slate-200/80 z-40 flex-col justify-between py-8 px-6 shadow-[0_1px_8px_rgba(0,0,0,0.02)] hidden lg:flex">
      <div className="flex flex-col gap-6">
        {/* Brand Header */}
        <div className="flex items-center gap-3 px-1">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-cyan-600 to-[#0b1c30] text-white flex items-center justify-center shadow-md ring-2 ring-cyan-400/30">
            <Sparkles className="w-5 h-5 text-cyan-300" />
          </div>
          <div className="flex flex-col">
            <span className="font-sans text-lg font-bold tracking-tight text-[#0b1c30]">
              J.A.R.V.I.S.
            </span>
            <span className="font-sans text-xs text-cyan-800 font-medium">
              Autonomous Financial Core
            </span>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex flex-col gap-2 mt-3">
          {navItems.map(({ id, label, Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`flex items-center gap-3 px-4 py-3 rounded-2xl transition-all text-sm font-semibold cursor-pointer ${
                activeTab === id
                  ? 'bg-[#0b1c30] text-white shadow-sm'
                  : 'text-[#45464d] hover:bg-[#eff4ff] hover:text-[#0b1c30]'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{label}</span>
            </button>
          ))}
        </nav>
      </div>

      {/* Bottom Monthly Plan Card */}
      <div className="flex flex-col gap-4 pt-4 border-t border-slate-100">
        <div className="p-4 rounded-2xl bg-[#eff4ff]/80 border border-slate-200/60 flex flex-col gap-2.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] uppercase font-bold tracking-wider text-[#76777d]">
              Monthly Plan
            </span>
            <button
              type="button"
              onClick={openSettings}
              className="text-[11px] text-[#006c49] font-bold hover:underline cursor-pointer flex items-center gap-1"
            >
              <SlidersHorizontal className="w-3 h-3" />
              <span>Edit</span>
            </button>
          </div>

          <div className="flex justify-between items-baseline text-xs">
            <span className="text-[#45464d]">Monthly Salary:</span>
            <span className="font-mono-num font-bold text-[#0b1c30]">
              ₹{userSettings.monthlySalary?.toLocaleString() || '35,000'}
            </span>
          </div>

          <div className="flex justify-between items-baseline text-xs">
            <span className="text-[#45464d]">Fixed Bills:</span>
            <span className="font-mono-num font-semibold text-[#76777d]">
              -₹{userSettings.householdFundCurrent.toLocaleString()}
            </span>
          </div>

          <div className="flex justify-between items-baseline text-xs border-t border-slate-200/60 pt-1.5">
            <span className="font-bold text-[#006c49]">Daily Spend Limit:</span>
            <span className="font-mono-num font-bold text-[#006c49]">
              ₹{userSettings.dailySpendLimit}/day
            </span>
          </div>
        </div>
      </div>
    </aside>
  );
}


