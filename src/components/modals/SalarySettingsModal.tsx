'use client';

import React, { useState, useEffect } from 'react';
import { useFinance } from '@/context/FinanceContext';
import { X, Sparkles, Check, Calculator, HelpCircle, Lock, Eye, EyeOff, Shield } from 'lucide-react';

interface SalarySettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function SalarySettingsModal({ isOpen, onClose }: SalarySettingsModalProps) {
  const { userSettings, updateUserSettings, debts } = useFinance();

  const totalOwedByUser = (debts || [])
    .filter((d) => d.debtType === 'owed_by_user' && !d.isSettled)
    .reduce((sum, d) => sum + d.amount, 0);

  const [salary, setSalary] = useState(userSettings.monthlySalary || 35000);
  const [salaryDay, setSalaryDay] = useState(userSettings.salaryDayOfMonth || 7);
  const [fixedBills, setFixedBills] = useState(userSettings.householdFundCurrent || 10000);
  const [savingsTarget, setSavingsTarget] = useState(
    userSettings.savingsTarget !== undefined
      ? userSettings.savingsTarget
      : Math.max(0, (userSettings.monthlySalary || 35000) - (userSettings.householdFundCurrent || 10000) - (userSettings.monthlyDiscretionaryCap || 16200)) || 5000
  );
  const defaultDebtBudget = totalOwedByUser > 0 ? Math.min(totalOwedByUser, 7000) : 0;
  const [debtRepaymentBudget, setDebtRepaymentBudget] = useState(defaultDebtBudget);
  const [dailyLimit, setDailyLimit] = useState(userSettings.dailySpendLimit || 333);
  const [userName, setUserName] = useState(userSettings.userName || 'Ayan');
  const [autoCalculate, setAutoCalculate] = useState(false);
  const [geminiKey, setGeminiKey] = useState(userSettings.geminiApiKey || '');
  const [securityPin, setSecurityPin] = useState(userSettings.securityPin || '1014');
  const [biometricEnabled, setBiometricEnabled] = useState(userSettings.biometricEnabled !== false);
  const [showPin, setShowPin] = useState(false);
  const [pinError, setPinError] = useState('');

  // Synchronize modal state with userSettings whenever modal opens
  useEffect(() => {
    if (isOpen) {
      setSalary(userSettings.monthlySalary || 35000);
      setSalaryDay(userSettings.salaryDayOfMonth || 7);
      setFixedBills(userSettings.householdFundCurrent || 10000);
      const computedTarget = userSettings.savingsTarget !== undefined
        ? userSettings.savingsTarget
        : Math.max(0, (userSettings.monthlySalary || 35000) - (userSettings.householdFundCurrent || 10000) - (userSettings.monthlyDiscretionaryCap || 16200));
      setSavingsTarget(computedTarget >= 0 ? computedTarget : 5000);
      const dBudget = totalOwedByUser > 0 ? Math.min(totalOwedByUser, 7000) : 0;
      setDebtRepaymentBudget(dBudget);
      setDailyLimit(userSettings.dailySpendLimit || 333);
      setUserName(userSettings.userName || 'Ayan');
      setGeminiKey(userSettings.geminiApiKey || '');

      let pin = '1014';
      let bio = true;
      try {
        pin = localStorage.getItem('jarvis_security_pin') || userSettings.securityPin || '1014';
        const bioItem = localStorage.getItem('jarvis_biometric_enabled');
        bio = bioItem !== null ? bioItem === 'true' : (userSettings.biometricEnabled !== false);
      } catch {}
      setSecurityPin(pin);
      setBiometricEnabled(bio);
      setAutoCalculate(false);
      setPinError('');
    }
  }, [isOpen, userSettings, totalOwedByUser]);

  // Auto-calculate daily limit ONLY when explicitly enabled by user
  useEffect(() => {
    if (autoCalculate) {
      // Optimal Waterfall Formula: Salary - Bills - Debt Installment - Savings Target = Pure Discretionary
      const freeCash = Math.max(0, salary - fixedBills - debtRepaymentBudget - savingsTarget);
      const calculatedDaily = Math.round(freeCash / 30);
      setDailyLimit(calculatedDaily || 333);
    }
  }, [salary, fixedBills, debtRepaymentBudget, savingsTarget, autoCalculate]);

  const [activeSection, setActiveSection] = useState<'budget' | 'security'>('budget');

  if (!isOpen) return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();

    if (securityPin.length < 4) {
      setPinError('PIN must be at least 4 digits.');
      return;
    }
    if (!/^\d+$/.test(securityPin)) {
      setPinError('PIN must contain only numbers.');
      return;
    }
    setPinError('');

    const freePool = Math.max(0, salary - fixedBills - debtRepaymentBudget - savingsTarget);

    updateUserSettings({
      userName,
      monthlySalary: Number(salary),
      salaryDayOfMonth: Number(salaryDay),
      householdFundCurrent: Number(fixedBills),
      householdFundTarget: Number(fixedBills),
      dailySpendLimit: Number(dailyLimit),
      monthlyDiscretionaryCap: freePool || (Number(dailyLimit) * 30),
      savingsTarget: Number(savingsTarget),
      geminiApiKey: geminiKey.trim() || undefined,
      securityPin: securityPin.trim(),
      biometricEnabled,
    });

    onClose();
  };
  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center sm:p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-t-3xl sm:rounded-3xl w-full sm:max-w-lg shadow-2xl border border-slate-100 flex flex-col max-h-[92dvh] sm:max-h-[90dvh] animate-in fade-in slide-in-from-bottom-6 sm:zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drag handle on mobile */}
        <div className="flex justify-center pt-3 pb-1 sm:hidden">
          <div className="w-10 h-1 rounded-full bg-slate-300" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 sm:px-6 pt-3 sm:pt-5 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-2xl bg-[#006c49]/10 text-[#006c49] flex items-center justify-center shrink-0">
              <Calculator className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-sans text-base font-bold text-[#0b1c30] leading-tight">Budget & Settings</h2>
              <p className="text-[11px] text-[#76777d]">Set your financial parameters</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-[#76777d] hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Section Tabs */}
        <div className="flex px-5 sm:px-6 pt-3 gap-2">
          <button
            type="button"
            onClick={() => setActiveSection('budget')}
            className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeSection === 'budget'
                ? 'bg-[#0b1c30] text-white'
                : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
            }`}
          >
            💰 Budget Plan
          </button>
          <button
            type="button"
            onClick={() => setActiveSection('security')}
            className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeSection === 'security'
                ? 'bg-[#0b1c30] text-white'
                : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
            }`}
          >
            🔒 Security
          </button>
        </div>

        {/* Scrollable Form Area */}
        <div className="flex-1 overflow-y-auto px-5 sm:px-6 py-4">
          <form id="settings-form" onSubmit={handleSave} className="flex flex-col gap-4">

            {activeSection === 'budget' && (
              <>

                {/* Your Name */}
                <div className="flex flex-col gap-1.5">
                  <label className="font-sans text-xs font-bold text-[#0b1c30]">Your Name</label>
                  <input
                    type="text"
                    required
                    value={userName}
                    onChange={(e) => setUserName(e.target.value)}
                    className="bg-[#f8f9ff] border border-slate-200 rounded-2xl px-4 py-3 text-sm text-[#0b1c30] focus:outline-none focus:ring-2 focus:ring-[#006c49]"
                    placeholder="Your name"
                  />
                </div>

                {/* Monthly Income */}
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between">
                    <label className="font-sans text-xs font-bold text-[#0b1c30]">1. Monthly Take-Home Salary</label>
                    <span className="text-[11px] text-[#76777d]">In-hand pay</span>
                  </div>
                  <div className="relative">
                    <span className="absolute left-4 top-3.5 text-sm font-bold text-[#76777d]">₹</span>
                    <input
                      type="number" min="1000" required
                      value={salary}
                      onChange={(e) => setSalary(Number(e.target.value))}
                      className="w-full bg-[#f8f9ff] border border-slate-200 rounded-2xl pl-8 pr-4 py-3 text-lg font-bold text-[#0b1c30] focus:outline-none focus:ring-2 focus:ring-[#006c49]"
                    />
                  </div>
                </div>

                {/* Pay Day */}
                <div className="flex items-center gap-3 p-3.5 bg-[#eff4ff]/60 rounded-2xl border border-slate-200">
                  <div className="flex flex-col flex-1">
                    <span className="text-xs font-bold text-[#0b1c30]">2. Salary Pay Day</span>
                    <span className="text-[11px] text-[#76777d]">Day of month</span>
                  </div>
                  <input
                    type="number" min="1" max="31" required
                    value={salaryDay}
                    onChange={(e) => setSalaryDay(Number(e.target.value))}
                    className="w-16 bg-white border border-slate-200 rounded-xl px-2 py-2 text-base font-bold text-[#0b1c30] text-center focus:outline-none focus:ring-2 focus:ring-[#006c49]"
                  />
                  <span className="text-xs text-[#76777d] shrink-0">th of month</span>
                </div>

                {/* Fixed Bills */}
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between">
                    <label className="font-sans text-xs font-bold text-[#0b1c30]">3. Fixed Bills & Rent</label>
                    <span className="text-[11px] text-[#76777d]">Rent, utilities, family</span>
                  </div>
                  <div className="relative">
                    <span className="absolute left-4 top-3.5 text-sm font-bold text-[#76777d]">₹</span>
                    <input
                      type="number" min="0" required
                      value={fixedBills}
                      onChange={(e) => setFixedBills(Number(e.target.value))}
                      className="w-full bg-[#f8f9ff] border border-slate-200 rounded-2xl pl-8 pr-4 py-3 text-lg font-bold text-[#0b1c30] focus:outline-none focus:ring-2 focus:ring-[#006c49]"
                    />
                  </div>
                </div>

                {/* Savings Target */}
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between">
                    <label className="font-sans text-xs font-bold text-[#0b1c30]">4. Monthly Savings Target</label>
                    <span className="text-[11px] text-[#76777d]">Saved before spending</span>
                  </div>
                  <div className="relative">
                    <span className="absolute left-4 top-3.5 text-sm font-bold text-[#76777d]">₹</span>
                    <input
                      type="number" min="0" required
                      value={savingsTarget}
                      onChange={(e) => setSavingsTarget(Number(e.target.value))}
                      className="w-full bg-[#f8f9ff] border border-slate-200 rounded-2xl pl-8 pr-4 py-3 text-lg font-bold text-[#0b1c30] focus:outline-none focus:ring-2 focus:ring-[#006c49]"
                    />
                  </div>
                </div>

                {/* Active Debt Repayment Installment */}
                {totalOwedByUser > 0 && (
                  <div className="flex flex-col gap-1.5">
                    <div className="flex items-center justify-between">
                      <label className="font-sans text-xs font-bold text-[#0b1c30] flex items-center gap-1.5">
                        <span>🥊 5. Debt Payback Reserve</span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 font-semibold">
                          ₹{totalOwedByUser.toLocaleString()} Owed
                        </span>
                      </label>
                      <span className="text-[11px] text-[#76777d]">Monthly debt clearance</span>
                    </div>
                    <div className="relative">
                      <span className="absolute left-4 top-3.5 text-sm font-bold text-[#76777d]">₹</span>
                      <input
                        type="number" min="0" required
                        value={debtRepaymentBudget}
                        onChange={(e) => setDebtRepaymentBudget(Number(e.target.value))}
                        className="w-full bg-[#f8f9ff] border border-slate-200 rounded-2xl pl-8 pr-4 py-3 text-lg font-bold text-[#0b1c30] focus:outline-none focus:ring-2 focus:ring-[#006c49]"
                      />
                    </div>
                    <p className="text-[11px] text-slate-500">
                      At ₹{debtRepaymentBudget.toLocaleString()}/mo, total debt is cleared in ~{debtRepaymentBudget > 0 ? Math.ceil(totalOwedByUser / debtRepaymentBudget) : 0} months!
                    </p>
                  </div>
                )}

                {/* Daily Limit Result */}
                <div className="p-4 rounded-2xl bg-[#eff4ff] border border-slate-200/80 flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <span className="font-sans text-xs font-bold text-[#0b1c30] flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-[#006c49]" />
                      Daily Safe-to-Spend Cap
                    </span>
                    <button
                      type="button"
                      onClick={() => setAutoCalculate(!autoCalculate)}
                      className="text-[11px] text-[#006c49] font-semibold underline cursor-pointer"
                    >
                      {autoCalculate ? 'Customize' : 'Auto-Calculate'}
                    </button>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <div className="relative flex-1">
                      <span className="absolute left-3 top-2 text-base font-bold text-[#006c49]">₹</span>
                      <input
                        type="number" disabled={autoCalculate}
                        value={dailyLimit}
                        onChange={(e) => setDailyLimit(Number(e.target.value))}
                        className="w-full bg-white border border-slate-200 rounded-xl pl-7 pr-3 py-2 text-xl font-bold text-[#006c49] disabled:bg-slate-50 focus:outline-none"
                      />
                    </div>
                    <span className="text-xs text-[#76777d] shrink-0">/day</span>
                  </div>
                  <p className="text-[11px] text-[#45464d] leading-relaxed">
                    After ₹{fixedBills.toLocaleString()} bills{debtRepaymentBudget > 0 ? `, ₹${debtRepaymentBudget.toLocaleString()} debt` : ''} & ₹{savingsTarget.toLocaleString()} savings → <strong>₹{Math.max(0, salary - fixedBills - debtRepaymentBudget - savingsTarget).toLocaleString()}</strong> discretionary pool
                  </p>
                  <div className="p-2.5 rounded-xl bg-emerald-50/90 border border-emerald-200 text-[11px] text-emerald-900 flex items-start gap-1.5 mt-1">
                    <span className="text-sm shrink-0">🛡️</span>
                    <span><strong>Guaranteed Solvency:</strong> Even if you spend 100% of your ₹{dailyLimit}/day allowance every day, your loans are repaid on schedule and your savings stay 100% intact!</span>
                  </div>
                </div>

                {/* Gemini API Key */}
                <div className="flex flex-col gap-1.5">
                  <label className="font-sans text-xs font-bold text-[#0b1c30] flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-[#006c49]" />
                    Gemini API Key <span className="font-normal text-slate-400">(Optional)</span>
                  </label>
                  <input
                    type="password"
                    placeholder="AIzaSy... (leave blank to use built-in engine)"
                    value={geminiKey}
                    onChange={(e) => setGeminiKey(e.target.value)}
                    className="bg-[#f8f9ff] border border-slate-200 rounded-2xl px-4 py-3 text-xs text-[#0b1c30] focus:outline-none focus:ring-2 focus:ring-[#006c49]"
                  />
                </div>
              </>
            )}

            {activeSection === 'security' && (
              <>
                {/* Custom PIN */}
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between">
                    <label className="font-sans text-xs font-bold text-[#0b1c30] flex items-center gap-1.5">
                      <Lock className="w-3.5 h-3.5 text-slate-500" />
                      Access PIN (4–8 digits)
                    </label>
                    <span className="text-[11px] text-[#76777d]">Login screen PIN</span>
                  </div>
                  <div className="relative">
                    <input
                      type={showPin ? 'text' : 'password'}
                      inputMode="numeric" pattern="[0-9]*"
                      minLength={4} maxLength={8}
                      value={securityPin}
                      onChange={(e) => { setSecurityPin(e.target.value); setPinError(''); }}
                      className="w-full bg-[#f8f9ff] border border-slate-200 rounded-2xl px-4 py-3 text-2xl font-bold text-[#0b1c30] focus:outline-none focus:ring-2 focus:ring-cyan-500 tracking-[0.5em] pr-12"
                      placeholder="••••"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPin(!showPin)}
                      className="absolute right-4 top-3.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {pinError && <p className="text-[11px] text-rose-600 font-medium">{pinError}</p>}
                  <p className="text-[11px] text-[#76777d]">Default PIN is 1014. Change it to something you&apos;ll remember.</p>
                </div>

                {/* Biometric Toggle */}
                <div className="flex items-center justify-between p-4 bg-[#f8f9ff] rounded-2xl border border-slate-200">
                  <div className="flex flex-col">
                    <span className="text-sm font-bold text-[#0b1c30]">1-Click Quick Access</span>
                    <span className="text-[11px] text-[#76777d] mt-0.5">Show bypass button on login</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setBiometricEnabled(!biometricEnabled)}
                    className={`relative w-12 h-6.5 rounded-full transition-colors cursor-pointer focus:outline-none shrink-0 ${
                      biometricEnabled ? 'bg-cyan-500' : 'bg-slate-300'
                    }`}
                    style={{ minWidth: '48px', height: '28px' }}
                  >
                    <span
                      className={`absolute top-0.5 left-0.5 w-6 h-6 bg-white rounded-full shadow transition-transform ${
                        biometricEnabled ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                <div className={`text-[11px] p-3 rounded-xl ${
                  biometricEnabled ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-slate-50 text-slate-500 border border-slate-200'
                }`}>
                  {biometricEnabled
                    ? '✅ Quick Access ON — 1 tap to unlock, no PIN needed each time.'
                    : '🔒 Quick Access OFF — PIN is always required on the lock screen.'}
                </div>
              </>
            )}
          </form>
        </div>

        {/* Sticky Save/Cancel Footer */}
        <div className="px-5 sm:px-6 py-4 border-t border-slate-100 flex items-center gap-3 bg-white rounded-b-3xl">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-3 rounded-2xl text-sm font-semibold text-[#45464d] hover:bg-slate-100 transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="settings-form"
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl bg-[#006c49] hover:bg-[#005236] text-white text-sm font-bold transition-all shadow-md cursor-pointer"
          >
            <Check className="w-4 h-4" />
            <span>Save Settings</span>
          </button>
        </div>
      </div>
    </div>
  );
}
