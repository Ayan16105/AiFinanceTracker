'use client';

import React from 'react';
import { useFinance } from '@/context/FinanceContext';
import { LayoutDashboard, MessageSquareText, Target, Receipt } from 'lucide-react';

export default function MobileBottomNav() {
  const { activeTab, setActiveTab, todayDeficit } = useFinance();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 lg:hidden bg-white/95 backdrop-blur-md border-t border-slate-200/80 px-2 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] shadow-[0_-4px_20px_rgba(0,0,0,0.03)]">
      <div className="flex items-center justify-around max-w-md mx-auto">
        <button
          onClick={() => setActiveTab('command-center')}
          className={`flex flex-col items-center gap-1 py-1 px-2.5 rounded-xl transition-all cursor-pointer ${
            activeTab === 'command-center'
              ? 'text-[#0b1c30] font-bold'
              : 'text-[#76777d] hover:text-[#0b1c30]'
          }`}
        >
          <div
            className={`p-1.5 rounded-full ${
              activeTab === 'command-center' ? 'bg-[#0b1c30] text-white' : ''
            }`}
          >
            <LayoutDashboard className="w-4 h-4" />
          </div>
          <span className="text-[10px]">Dashboard</span>
        </button>

        <button
          onClick={() => setActiveTab('ai-ca-ledger')}
          className={`flex flex-col items-center gap-1 py-1 px-2.5 rounded-xl transition-all cursor-pointer relative ${
            activeTab === 'ai-ca-ledger'
              ? 'text-[#0b1c30] font-bold'
              : 'text-[#76777d] hover:text-[#0b1c30]'
          }`}
        >
          <div
            className={`p-1.5 rounded-full ${
              activeTab === 'ai-ca-ledger' ? 'bg-[#0b1c30] text-white' : ''
            }`}
          >
            <MessageSquareText className="w-4 h-4" />
          </div>
          {todayDeficit > 0 && (
            <span className="absolute top-1 right-2 w-2 h-2 bg-[#ba1a1a] rounded-full ring-2 ring-white animate-pulse" />
          )}
          <span className="text-[10px]">J.A.R.V.I.S.</span>
        </button>

        <button
          onClick={() => setActiveTab('transactions-ledger')}
          className={`flex flex-col items-center gap-1 py-1 px-2.5 rounded-xl transition-all cursor-pointer ${
            activeTab === 'transactions-ledger'
              ? 'text-[#0b1c30] font-bold'
              : 'text-[#76777d] hover:text-[#0b1c30]'
          }`}
        >
          <div
            className={`p-1.5 rounded-full ${
              activeTab === 'transactions-ledger' ? 'bg-[#0b1c30] text-white' : ''
            }`}
          >
            <Receipt className="w-4 h-4" />
          </div>
          <span className="text-[10px]">Records</span>
        </button>

        <button
          onClick={() => setActiveTab('radar-and-horizons')}
          className={`flex flex-col items-center gap-1 py-1 px-2.5 rounded-xl transition-all cursor-pointer ${
            activeTab === 'radar-and-horizons'
              ? 'text-[#0b1c30] font-bold'
              : 'text-[#76777d] hover:text-[#0b1c30]'
          }`}
        >
          <div
            className={`p-1.5 rounded-full ${
              activeTab === 'radar-and-horizons' ? 'bg-[#0b1c30] text-white' : ''
            }`}
          >
            <Target className="w-4 h-4" />
          </div>
          <span className="text-[10px]">Goals</span>
        </button>
      </div>
    </nav>
  );
}
