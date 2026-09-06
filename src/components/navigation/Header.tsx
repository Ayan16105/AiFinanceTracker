'use client';

import React, { useState } from 'react';
import { useFinance } from '@/context/FinanceContext';
import { Settings, Sparkles, Wallet, Cloud, Database, Lock, CheckCircle2, RefreshCw } from 'lucide-react';

export default function Header({ onLogout }: { onLogout?: () => void }) {
  const { safeToSpendRemaining, userSettings, todayDeficit, cloudSyncStatus, refreshCloudData, openSettings } = useFinance();
  const [showCloudInfo, setShowCloudInfo] = useState(false);

  return (
    <>
      <header className="sticky top-0 z-40 h-14 bg-white/95 backdrop-blur-md border-b border-slate-200/70 flex items-center justify-between px-3 sm:px-6 lg:px-8 shadow-sm">
        {/* Left Brand */}
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-cyan-600 to-[#0b1c30] text-white flex items-center justify-center shadow-sm ring-2 ring-cyan-400/30 shrink-0">
            <Sparkles className="w-4 h-4 text-cyan-300" />
          </div>
          <div className="flex flex-col">
            <span className="font-sans font-bold text-sm leading-tight tracking-tight text-[#0b1c30]">
              J.A.R.V.I.S.
            </span>
            <span className="text-[9px] text-cyan-700 font-bold uppercase tracking-widest hidden sm:block">
              Autonomous Financial Core
            </span>
          </div>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-1.5 sm:gap-2">

          {/* Safe Today Pill */}
          <div className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-full border text-xs font-bold ${
            todayDeficit > 0
              ? 'bg-rose-50 text-rose-700 border-rose-200'
              : 'bg-emerald-50 text-emerald-700 border-emerald-200'
          }`}>
            <Wallet className="w-3.5 h-3.5 shrink-0" />
            <span className="font-mono-num">
              {todayDeficit > 0 ? `-₹${todayDeficit.toFixed(0)}` : `₹${safeToSpendRemaining.toFixed(0)}`}
            </span>
            <span className="hidden sm:inline text-[10px] opacity-70">left</span>
          </div>

          {/* Cloud Badge — icon only on mobile */}
          <button
            type="button"
            onClick={() => setShowCloudInfo(!showCloudInfo)}
            className={`w-8 h-8 sm:w-auto sm:h-auto sm:px-3 sm:py-1.5 rounded-full flex items-center justify-center sm:gap-1.5 text-[11px] font-bold border transition-all cursor-pointer ${
              cloudSyncStatus.connected && cloudSyncStatus.tablesFound
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : 'bg-slate-50 text-slate-500 border-slate-200'
            }`}
            title="Cloud Sync Status"
          >
            <Cloud className="w-3.5 h-3.5 shrink-0" />
            <span className="hidden sm:inline">
              {cloudSyncStatus.connected && cloudSyncStatus.tablesFound ? 'Synced' : 'Local'}
            </span>
          </button>

          {/* Settings Button */}
          <button
            onClick={openSettings}
            className="w-8 h-8 sm:w-auto sm:h-auto sm:px-3.5 sm:py-1.5 rounded-full bg-[#0b1c30] hover:bg-slate-800 text-white flex items-center justify-center sm:gap-1.5 text-xs font-semibold transition-all shadow-sm cursor-pointer"
            title="Budget & Security Settings"
          >
            <Settings className="w-3.5 h-3.5 shrink-0" />
            <span className="hidden sm:inline">Settings</span>
          </button>

          {/* User Avatar + Lock */}
          <div className="flex items-center gap-1 pl-1 border-l border-slate-200">
            <div className="w-8 h-8 rounded-full bg-[#131b2e] text-white flex items-center justify-center font-bold text-xs shadow-xs shrink-0">
              {userSettings.userName.charAt(0) || 'A'}
            </div>
            {onLogout && (
              <button
                type="button"
                onClick={onLogout}
                className="w-7 h-7 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 flex items-center justify-center transition-all cursor-pointer"
                title="Lock Terminal"
              >
                <Lock className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Cloud Info Panel — bottom sheet on mobile */}
      {showCloudInfo && (
        <div
          className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-end sm:items-center justify-center sm:p-4"
          onClick={() => setShowCloudInfo(false)}
        >
          <div
            className="bg-white rounded-t-3xl sm:rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-100 flex flex-col gap-4 animate-in fade-in slide-in-from-bottom-4 sm:zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-cyan-50 border border-cyan-200 flex items-center justify-center text-cyan-700">
                  <Database className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-[#0b1c30]">Cloud Storage</h3>
                  <span className="text-xs text-[#76777d]">Supabase PostgreSQL</span>
                </div>
              </div>
              <button type="button" onClick={() => setShowCloudInfo(false)} className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:bg-slate-100 cursor-pointer text-lg">✕</button>
            </div>

            <div className="flex flex-col gap-2 p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Connection</span>
                <span className={`font-bold ${cloudSyncStatus.connected ? 'text-emerald-600' : 'text-slate-500'}`}>
                  {cloudSyncStatus.connected ? '✓ Connected' : 'Not Connected'}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Database Tables</span>
                <span className={`font-bold ${cloudSyncStatus.tablesFound ? 'text-emerald-600' : 'text-amber-600'}`}>
                  {cloudSyncStatus.tablesFound ? '✓ Live & Synced' : 'Run schema.sql'}
                </span>
              </div>
            </div>

            {cloudSyncStatus.connected && cloudSyncStatus.tablesFound ? (
              <div className="flex items-center gap-2 p-3 bg-emerald-50 rounded-2xl border border-emerald-200 text-xs text-emerald-800">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>All data syncing live to Supabase cloud in real time!</span>
              </div>
            ) : (
              <div className="p-3.5 bg-amber-50 rounded-2xl border border-amber-200 text-xs text-amber-900 leading-relaxed">
                <strong>To activate:</strong> Supabase Dashboard → SQL Editor → paste <code className="bg-amber-100 px-1 rounded">supabase/schema.sql</code> → Run.
              </div>
            )}

            <button
              type="button"
              onClick={() => { refreshCloudData(); setShowCloudInfo(false); }}
              className="w-full py-3 rounded-2xl bg-[#0b1c30] hover:bg-slate-800 text-white text-xs font-bold cursor-pointer transition-all shadow-sm flex items-center justify-center gap-2"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Check Sync
            </button>
          </div>
        </div>
      )}

      {/* Settings Modal is managed centrally at app root */}
    </>
  );
}


