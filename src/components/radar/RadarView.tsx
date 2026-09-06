'use client';

import React, { useState } from 'react';
import { useFinance } from '@/context/FinanceContext';
import { SavingsGoal, Debt } from '@/types';
import { 
  Plus, 
  Check, 
  CheckCircle2, 
  Gift, 
  ShieldCheck, 
  ArrowDownRight, 
  ArrowUpRight, 
  X,
  PiggyBank,
  HandCoins,
  Wallet,
  Sparkles,
  ArrowRight,
  Trash2,
  Pencil,
  ArrowLeftRight
} from 'lucide-react';

export default function RadarView() {
  const { 
    goals, 
    debts, 
    settleDebt, 
    editDebt,
    flipDebtDirection,
    addGoal, 
    addDebt,
    depositToGoal,
    withdrawFromGoal,
    deleteGoal,
    deleteDebt,
    currentBalance,
    availableLiquidCash
  } = useFinance();

  const [showGoalModal, setShowGoalModal] = useState(false);
  const [showDebtModal, setShowDebtModal] = useState(false);
  const [showDepositModal, setShowDepositModal] = useState(false);
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [selectedGoalForDeposit, setSelectedGoalForDeposit] = useState<SavingsGoal | null>(null);
  const [selectedGoalForWithdraw, setSelectedGoalForWithdraw] = useState<SavingsGoal | null>(null);
  const [goalToDelete, setGoalToDelete] = useState<SavingsGoal | null>(null);
  const [debtToDelete, setDebtToDelete] = useState<Debt | null>(null);
  const [customDepositAmount, setCustomDepositAmount] = useState('');
  const [customWithdrawAmount, setCustomWithdrawAmount] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // New goal form state
  const [goalName, setGoalName] = useState('');
  const [goalTarget, setGoalTarget] = useState('');
  const [goalCurrent, setGoalCurrent] = useState('');

  // New debt form state
  const [debtTitle, setDebtTitle] = useState('');
  const [debtAmount, setDebtAmount] = useState('');
  const [debtType, setDebtType] = useState<'owed_by_user' | 'owed_to_user'>('owed_by_user');
  const [debtDueDate, setDebtDueDate] = useState('');

  // Edit debt modal state
  const [editingDebt, setEditingDebt] = useState<Debt | null>(null);
  const [editDebtTitle, setEditDebtTitle] = useState('');
  const [editDebtAmount, setEditDebtAmount] = useState('');
  const [editDebtType, setEditDebtType] = useState<'owed_by_user' | 'owed_to_user'>('owed_by_user');
  const [editDebtDueDate, setEditDebtDueDate] = useState('');
  const [editDebtNotes, setEditDebtNotes] = useState('');

  // Partial settle modal state
  const [partialSettleDebt, setPartialSettleDebt] = useState<Debt | null>(null);
  const [partialSettleAmount, setPartialSettleAmount] = useState('');

  const openEditDebtModal = (debt: Debt) => {
    setEditingDebt(debt);
    setEditDebtTitle(debt.title);
    setEditDebtAmount(String(debt.amount));
    setEditDebtType(debt.debtType);
    setEditDebtDueDate(debt.dueDate || '');
    setEditDebtNotes(debt.notes || '');
  };

  const handleSaveDebtEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDebt) return;
    const num = parseFloat(editDebtAmount);
    if (isNaN(num) || num <= 0) return;

    editDebt(editingDebt.id, {
      title: editDebtTitle.trim() || editingDebt.title,
      amount: num,
      debtType: editDebtType,
      dueDate: editDebtDueDate.trim() || undefined,
      notes: editDebtNotes.trim() || undefined,
    });
    setToastMessage(`Updated liability record for ${editDebtTitle}!`);
    setTimeout(() => setToastMessage(null), 3000);
    setEditingDebt(null);
  };

  const handlePartialSettleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!partialSettleDebt) return;
    const num = parseFloat(partialSettleAmount);
    if (isNaN(num) || num <= 0) return;

    settleDebt(partialSettleDebt.id, true, num);
    setToastMessage(`Processed partial payment of ₹${num.toLocaleString()} for ${partialSettleDebt.title}!`);
    setTimeout(() => setToastMessage(null), 3000);
    setPartialSettleDebt(null);
    setPartialSettleAmount('');
  };

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleCreateGoal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!goalName || !goalTarget) return;

    addGoal({
      name: goalName,
      targetAmount: parseFloat(goalTarget),
      currentAmount: parseFloat(goalCurrent || '0'),
      monthlyAllocation: 1000,
      isShielded: true,
      category: 'Savings Goal',
      milestones: [
        { id: 'm1', title: 'Started', status: 'achieved', dateOrAmount: 'Initial Seed' },
        { id: 'm2', title: 'Goal Target', status: 'current', dateOrAmount: `Target: ₹${goalTarget}` },
      ],
    });

    setGoalName('');
    setGoalTarget('');
    setGoalCurrent('');
    setShowGoalModal(false);
    triggerToast('New savings goal added!');
  };

  const handleCreateDebt = (e: React.FormEvent) => {
    e.preventDefault();
    if (!debtTitle || !debtAmount) return;

    addDebt({
      title: debtTitle,
      amount: parseFloat(debtAmount),
      debtType,
      dueDate: debtDueDate || 'End of month',
      isSettled: false,
    });

    setDebtTitle('');
    setDebtAmount('');
    setShowDebtModal(false);
    triggerToast('Entry recorded successfully.');
  };

  const handleCustomDeposit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedGoalForDeposit || !customDepositAmount) return;
    const amount = parseFloat(customDepositAmount);
    if (isNaN(amount) || amount <= 0) return;

    depositToGoal(selectedGoalForDeposit.id, amount);
    triggerToast(`Added ₹${amount.toLocaleString()} to ${selectedGoalForDeposit.name}!`);
    setCustomDepositAmount('');
    setShowDepositModal(false);
    setSelectedGoalForDeposit(null);
  };

  const handleCustomWithdraw = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedGoalForWithdraw || !customWithdrawAmount) return;
    const amount = parseFloat(customWithdrawAmount);
    if (isNaN(amount) || amount <= 0) return;

    withdrawFromGoal(selectedGoalForWithdraw.id, amount);
    triggerToast(`Retrieved ₹${amount.toLocaleString()} from ${selectedGoalForWithdraw.name} back to checking balance!`);
    setCustomWithdrawAmount('');
    setShowWithdrawModal(false);
    setSelectedGoalForWithdraw(null);
  };

  const totalSaved = goals.reduce((sum, g) => sum + g.currentAmount, 0);
  const totalTarget = goals.reduce((sum, g) => sum + g.targetAmount, 0);
  const totalIOwe = debts.filter((d) => d.debtType === 'owed_by_user' && !d.isSettled).reduce((sum, d) => sum + d.amount, 0);
  const totalOwedToMe = debts.filter((d) => d.debtType === 'owed_to_user' && !d.isSettled).reduce((sum, d) => sum + d.amount, 0);

  return (
    <div className="w-full max-w-5xl mx-auto px-4 sm:px-8 py-6 sm:py-8 flex flex-col gap-6 sm:gap-8 pb-28 lg:pb-12">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-20 right-6 z-50 bg-[#0b1c30] text-white px-5 py-3 rounded-2xl shadow-lg flex items-center gap-2 text-xs sm:text-sm animate-in fade-in slide-in-from-top-4">
          <CheckCircle2 className="w-4 h-4 text-[#6cf8bb]" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-sans text-2xl sm:text-3xl font-bold text-[#0b1c30]">
            Goals & Money Tracking
          </h1>
          <p className="text-sm text-[#76777d]">
            Keep track of your special savings targets, current liquid balances, and borrowed money
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={() => setShowGoalModal(true)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#0b1c30] hover:bg-[#131b2e] text-white text-xs font-bold transition-all shadow-xs cursor-pointer"
          >
            <Plus className="w-4 h-4 text-[#6cf8bb]" />
            <span>+ Add Savings Goal</span>
          </button>
          <button
            onClick={() => setShowDebtModal(true)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-white hover:bg-[#eff4ff] text-[#0b1c30] text-xs font-bold border border-slate-200 transition-all shadow-xs cursor-pointer"
          >
            <Plus className="w-4 h-4 text-[#006c49]" />
            <span>+ Add Loan / Debt</span>
          </button>
        </div>
      </div>

      {/* Live Current Balance Card */}
      <div className="p-6 rounded-3xl bg-gradient-to-r from-[#0b1c30] via-[#112239] to-[#193252] text-white shadow-md flex flex-col md:flex-row md:items-center justify-between gap-5 border border-slate-800">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-[#6cf8bb] shrink-0">
            <Wallet className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                Current Liquid Balance
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-[#6cf8bb] border border-emerald-500/30">
                Live Ledger Sync
              </span>
            </div>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="font-mono-num text-3xl sm:text-4xl font-bold tracking-tight text-white">
                ₹{currentBalance.toLocaleString()}
              </span>
              <span className="text-xs text-slate-400 font-normal">
                (Salary + Recoveries – Outflows)
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-5 border-t md:border-t-0 md:border-l border-slate-700/80 pt-4 md:pt-0 md:pl-6 text-xs text-slate-300">
          <div>
            <span className="text-slate-400 block text-[11px]">Free Spendable Cash:</span>
            <span className="font-mono-num font-bold text-white text-base">₹{availableLiquidCash.toLocaleString()}</span>
          </div>
          <div className="h-8 w-px bg-slate-700/60" />
          <div>
            <span className="text-slate-400 block text-[11px]">Locked in Goals:</span>
            <span className="font-mono-num font-bold text-[#6cf8bb] text-base">₹{totalSaved.toLocaleString()}</span>
          </div>
        </div>
      </div>

      {/* Summary Highlights */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-3xl bg-white border border-slate-100 shadow-xs flex items-center gap-4">
          <div className="w-10 h-10 rounded-2xl bg-[#eff4ff] flex items-center justify-center text-[#006c49]">
            <PiggyBank className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] font-bold text-[#76777d] uppercase">Total Saved</span>
            <span className="font-mono-num text-lg font-bold text-[#0b1c30] block">
              ₹{totalSaved.toLocaleString()}
            </span>
          </div>
        </div>

        <div className="p-5 rounded-3xl bg-white border border-slate-100 shadow-xs flex items-center gap-4">
          <div className="w-10 h-10 rounded-2xl bg-rose-100 flex items-center justify-center text-[#ba1a1a]">
            <ArrowDownRight className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] font-bold text-[#76777d] uppercase">Money I Owe</span>
            <span className="font-mono-num text-lg font-bold text-[#ba1a1a] block">
              ₹{totalIOwe.toLocaleString()}
            </span>
          </div>
        </div>

        <div className="p-5 rounded-3xl bg-white border border-slate-100 shadow-xs flex items-center gap-4">
          <div className="w-10 h-10 rounded-2xl bg-emerald-100 flex items-center justify-center text-[#006c49]">
            <ArrowUpRight className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] font-bold text-[#76777d] uppercase">Owed to Me</span>
            <span className="font-mono-num text-lg font-bold text-[#006c49] block">
              ₹{totalOwedToMe.toLocaleString()}
            </span>
          </div>
        </div>
      </div>

      {/* 2-Column Clean Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        {/* Left: Savings Goals */}
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h2 className="font-sans text-lg font-bold text-[#0b1c30]">
              My Savings Goals
            </h2>
            <span className="text-xs text-[#76777d] font-semibold">{goals.length} active</span>
          </div>

          <div className="flex flex-col gap-4">
            {goals.map((goal) => {
              const percent = Math.min(100, Math.round((goal.currentAmount / goal.targetAmount) * 100));
              const isMama = goal.name.toLowerCase().includes('mama');

              return (
                <div
                  key={goal.id}
                  className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 flex flex-col gap-4"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-sans text-lg font-bold text-[#0b1c30]">
                        {goal.name}
                      </h3>
                      <span className="text-xs text-[#76777d]">
                        Target: ₹{goal.targetAmount.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setGoalToDelete(goal)}
                        className="w-8 h-8 rounded-xl bg-slate-50 hover:bg-rose-50 text-slate-400 hover:text-rose-600 flex items-center justify-center transition-all cursor-pointer"
                        title="Delete Goal"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                      <div className="w-10 h-10 rounded-2xl bg-[#eff4ff] flex items-center justify-center text-[#006c49]">
                        {isMama ? <Gift className="w-5 h-5" /> : <PiggyBank className="w-5 h-5" />}
                      </div>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="flex flex-col gap-2">
                    <div className="flex justify-between items-baseline text-xs">
                      <span className="text-[#45464d]">
                        Saved: <strong className="text-[#0b1c30]">₹{goal.currentAmount.toLocaleString()}</strong>
                      </span>
                      <span className="font-bold text-[#006c49]">{percent}%</span>
                    </div>
                    <div className="w-full h-2.5 bg-[#e5eeff] rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[#006c49] rounded-full transition-all duration-500"
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                    <span className="text-[11px] text-[#76777d]">
                      ₹{Math.max(0, goal.targetAmount - goal.currentAmount).toLocaleString()} more to reach goal
                    </span>
                  </div>

                  {/* Quick Deposit Buttons */}
                  <div className="flex flex-col gap-2 pt-2 border-t border-slate-100">
                    <div className="flex items-center justify-between text-[11px] font-bold text-[#76777d] uppercase">
                      <span>Quick Deposit to Goal</span>
                      <span className="text-[10px] text-emerald-700 font-semibold lowercase">
                        shielded from daily limit
                      </span>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <button
                        type="button"
                        onClick={() => {
                          depositToGoal(goal.id, 500);
                          triggerToast(`Added ₹500 to ${goal.name}!`);
                        }}
                        className="px-3 py-1.5 rounded-xl bg-[#eff4ff] hover:bg-emerald-50 hover:text-[#006c49] text-[#0b1c30] text-xs font-bold transition-all border border-slate-200 cursor-pointer"
                      >
                        +₹500
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          depositToGoal(goal.id, 1000);
                          triggerToast(`Added ₹1,000 to ${goal.name}!`);
                        }}
                        className="px-3 py-1.5 rounded-xl bg-[#eff4ff] hover:bg-emerald-50 hover:text-[#006c49] text-[#0b1c30] text-xs font-bold transition-all border border-slate-200 cursor-pointer"
                      >
                        +₹1,000
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          depositToGoal(goal.id, 2000);
                          triggerToast(`Added ₹2,000 to ${goal.name}!`);
                        }}
                        className="px-3 py-1.5 rounded-xl bg-[#eff4ff] hover:bg-emerald-50 hover:text-[#006c49] text-[#0b1c30] text-xs font-bold transition-all border border-slate-200 cursor-pointer"
                      >
                        +₹2,000
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedGoalForDeposit(goal);
                          setShowDepositModal(true);
                        }}
                        className="px-3 py-1.5 rounded-xl bg-white hover:bg-slate-50 text-[#76777d] hover:text-[#0b1c30] text-xs font-bold transition-all border border-dashed border-slate-300 cursor-pointer ml-auto"
                      >
                        Custom Deposit...
                      </button>
                    </div>
                  </div>

                  {/* Retrieve / Withdraw from Goal Buttons */}
                  {goal.currentAmount > 0 && (
                    <div className="flex flex-col gap-2 pt-2 border-t border-slate-100">
                      <div className="flex items-center justify-between text-[11px] font-bold text-[#76777d] uppercase">
                        <span>Retrieve Money to Account</span>
                        <span className="text-[10px] text-blue-700 font-semibold lowercase">
                          credits to checking balance
                        </span>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        {goal.currentAmount >= 500 && (
                          <button
                            type="button"
                            onClick={() => {
                              withdrawFromGoal(goal.id, 500);
                              triggerToast(`Retrieved ₹500 from ${goal.name} back to checking!`);
                            }}
                            className="px-3 py-1.5 rounded-xl bg-slate-50 hover:bg-blue-50 hover:text-blue-700 text-slate-700 text-xs font-bold transition-all border border-slate-200 cursor-pointer"
                          >
                            -₹500
                          </button>
                        )}
                        {goal.currentAmount >= 1000 && (
                          <button
                            type="button"
                            onClick={() => {
                              withdrawFromGoal(goal.id, 1000);
                              triggerToast(`Retrieved ₹1,000 from ${goal.name} back to checking!`);
                            }}
                            className="px-3 py-1.5 rounded-xl bg-slate-50 hover:bg-blue-50 hover:text-blue-700 text-slate-700 text-xs font-bold transition-all border border-slate-200 cursor-pointer"
                          >
                            -₹1,000
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedGoalForWithdraw(goal);
                            setShowWithdrawModal(true);
                          }}
                          className="px-3 py-1.5 rounded-xl bg-white hover:bg-slate-50 text-[#76777d] hover:text-[#0b1c30] text-xs font-bold transition-all border border-dashed border-slate-300 cursor-pointer ml-auto"
                        >
                          Withdraw Funds...
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Milestones if available */}
                  {goal.milestones && goal.milestones.length > 0 && (
                    <div className="flex flex-col gap-1.5 pt-1 border-t border-slate-100">
                      <span className="text-[11px] font-bold text-[#76777d] uppercase">Steps</span>
                      <div className="grid grid-cols-3 gap-2">
                        {goal.milestones.map((m) => (
                          <div
                            key={m.id}
                            className={`p-2 rounded-xl text-[10px] font-medium ${
                              m.status === 'achieved'
                                ? 'bg-emerald-50 text-[#006c49]'
                                : m.status === 'current'
                                ? 'bg-blue-50 text-blue-800 font-bold'
                                : 'bg-slate-50 text-slate-400'
                            }`}
                          >
                            <span className="block truncate">{m.title}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Borrowed & Lent Money */}
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h2 className="font-sans text-lg font-bold text-[#0b1c30]">
              Borrowed & Lent Money
            </h2>
            <span className="text-xs text-[#76777d] font-semibold">{debts.length} entries</span>
          </div>

          <div className="flex flex-col gap-4">
            {debts.map((d) => {
              const isIOwe = d.debtType === 'owed_by_user';

              return (
                <div
                  key={d.id}
                  className={`bg-white rounded-3xl p-5 shadow-sm border flex flex-col gap-3 ${
                    d.isSettled ? 'opacity-60 border-slate-100 bg-slate-50/50' : 'border-slate-100'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${
                          isIOwe ? 'bg-rose-100 text-[#ba1a1a]' : 'bg-emerald-100 text-[#006c49]'
                        }`}
                      >
                        {isIOwe ? <ArrowDownRight className="w-5 h-5" /> : <ArrowUpRight className="w-5 h-5" />}
                      </div>

                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-sans text-sm sm:text-base font-bold text-[#0b1c30]">
                            {d.title}
                          </h3>
                          <button
                            type="button"
                            onClick={() => {
                              flipDebtDirection(d.id);
                              triggerToast(`Flipped direction for "${d.title}"!`);
                            }}
                            className="flex items-center gap-1 text-[10px] font-semibold text-slate-500 hover:text-blue-600 bg-slate-100 hover:bg-blue-50 px-2 py-0.5 rounded-full transition-colors cursor-pointer"
                            title="Flip between I Owe and Owed to Me"
                          >
                            <ArrowLeftRight className="w-2.5 h-2.5" />
                            <span>Flip</span>
                          </button>
                        </div>
                        <span className="text-xs text-[#76777d]">
                          {isIOwe ? 'I need to pay' : 'To be returned to me'} • {d.dueDate}
                        </span>
                        {d.notes && (
                          <p className="text-[11px] text-slate-500 mt-1 italic bg-slate-50 px-2.5 py-1 rounded-lg">
                            {d.notes}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="text-right">
                      <span
                        className={`font-mono-num text-base font-bold ${
                          isIOwe ? 'text-[#ba1a1a]' : 'text-[#006c49]'
                        }`}
                      >
                        {isIOwe ? `-₹${d.amount.toLocaleString()}` : `+₹${d.amount.toLocaleString()}`}
                      </span>
                      <span className="block text-[10px] uppercase font-bold text-[#76777d]">
                        {d.isSettled ? 'Settled' : isIOwe ? 'Pending Pay' : 'Pending Receive'}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-100 flex-wrap gap-2">
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => openEditDebtModal(d)}
                        className="flex items-center gap-1 px-2.5 py-1 rounded-full text-slate-600 hover:text-blue-600 hover:bg-blue-50 text-xs font-semibold transition-all cursor-pointer"
                        title="Edit this record"
                      >
                        <Pencil className="w-3 h-3" />
                        <span>Edit</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setDebtToDelete(d)}
                        className="flex items-center gap-1 px-2.5 py-1 rounded-full text-slate-400 hover:text-rose-600 hover:bg-rose-50 text-xs font-semibold transition-all cursor-pointer"
                        title="Delete this record"
                      >
                        <Trash2 className="w-3 h-3" />
                        <span>Delete</span>
                      </button>
                    </div>

                    {!d.isSettled ? (
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {d.amount > 100 && (
                          <button
                            type="button"
                            onClick={() => {
                              setPartialSettleDebt(d);
                              setPartialSettleAmount('');
                            }}
                            className="flex items-center gap-1 px-3 py-1 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all cursor-pointer"
                          >
                            <span>Pay Partial...</span>
                          </button>
                        )}
                        <button
                          onClick={() => {
                            settleDebt(d.id, true);
                            if (d.debtType === 'owed_to_user') {
                              triggerToast(`Recovered ₹${d.amount.toLocaleString()} from ${d.title} & credited to balance!`);
                            } else {
                              triggerToast(`Paid & settled ₹${d.amount.toLocaleString()} for ${d.title}!`);
                            }
                          }}
                          className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 hover:bg-emerald-100 text-[#006c49] text-xs font-bold transition-all cursor-pointer border border-emerald-200"
                        >
                          <Check className="w-3.5 h-3.5 text-[#006c49]" />
                          <span>{d.debtType === 'owed_to_user' ? 'Settle Full' : 'Settle Full'}</span>
                        </button>
                      </div>
                    ) : (
                      <span className="text-[11px] text-slate-400 font-semibold italic">Record Settled</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Modal: Custom Deposit into Goal */}
      {showDepositModal && selectedGoalForDeposit && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl border border-slate-100 flex flex-col gap-5 animate-in zoom-in-95">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-sans text-lg font-bold text-[#0b1c30]">
                  Deposit to {selectedGoalForDeposit.name}
                </h3>
                <p className="text-xs text-[#76777d]">
                  Transfer money from your checking balance into this savings goal.
                </p>
              </div>
              <button
                onClick={() => {
                  setShowDepositModal(false);
                  setSelectedGoalForDeposit(null);
                }}
                className="w-8 h-8 rounded-full flex items-center justify-center text-[#76777d] hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCustomDeposit} className="flex flex-col gap-4 text-xs sm:text-sm">
              <div className="flex flex-col gap-1">
                <label className="font-bold text-[#0b1c30]">Deposit Amount (₹)</label>
                <input
                  type="number"
                  required
                  min="1"
                  placeholder="e.g. 2500"
                  value={customDepositAmount}
                  onChange={(e) => setCustomDepositAmount(e.target.value)}
                  className="bg-[#f8f9ff] border border-slate-200 rounded-xl px-4 py-2.5 text-[#0b1c30] focus:outline-none focus:ring-2 focus:ring-[#006c49]"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowDepositModal(false);
                    setSelectedGoalForDeposit(null);
                  }}
                  className="px-4 py-2 rounded-full text-[#76777d] hover:bg-slate-100 font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-full bg-[#006c49] text-white font-bold hover:bg-[#005236] cursor-pointer"
                >
                  Confirm Deposit
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Withdraw from Goal */}
      {showWithdrawModal && selectedGoalForWithdraw && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl border border-slate-100 flex flex-col gap-5 animate-in zoom-in-95">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-sans text-lg font-bold text-[#0b1c30]">
                  Withdraw to Checking Balance
                </h3>
                <span className="text-xs text-slate-500">
                  From: <strong>{selectedGoalForWithdraw.name}</strong> (Saved: ₹{selectedGoalForWithdraw.currentAmount.toLocaleString()})
                </span>
              </div>
              <button
                onClick={() => {
                  setShowWithdrawModal(false);
                  setSelectedGoalForWithdraw(null);
                }}
                className="w-8 h-8 rounded-full flex items-center justify-center text-[#76777d] hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCustomWithdraw} className="flex flex-col gap-4 text-xs sm:text-sm">
              <div className="flex flex-col gap-1">
                <label className="font-bold text-[#0b1c30]">Amount to Withdraw (₹)</label>
                <input
                  type="number"
                  required
                  min="1"
                  max={selectedGoalForWithdraw.currentAmount}
                  placeholder={`Max ₹${selectedGoalForWithdraw.currentAmount.toLocaleString()}`}
                  value={customWithdrawAmount}
                  onChange={(e) => setCustomWithdrawAmount(e.target.value)}
                  className="bg-[#f8f9ff] border border-slate-200 rounded-xl px-4 py-2.5 text-[#0b1c30] focus:outline-none focus:ring-2 focus:ring-[#006c49]"
                />
              </div>

              <div className="flex items-center gap-2">
                {selectedGoalForWithdraw.currentAmount >= 500 && (
                  <button
                    type="button"
                    onClick={() => setCustomWithdrawAmount('500')}
                    className="px-2.5 py-1 rounded-lg bg-slate-100 text-xs font-semibold hover:bg-slate-200 cursor-pointer"
                  >
                    ₹500
                  </button>
                )}
                {selectedGoalForWithdraw.currentAmount >= 1000 && (
                  <button
                    type="button"
                    onClick={() => setCustomWithdrawAmount('1000')}
                    className="px-2.5 py-1 rounded-lg bg-slate-100 text-xs font-semibold hover:bg-slate-200 cursor-pointer"
                  >
                    ₹1,000
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setCustomWithdrawAmount(selectedGoalForWithdraw.currentAmount.toString())}
                  className="px-2.5 py-1 rounded-lg bg-emerald-50 text-[#006c49] border border-emerald-200 text-xs font-bold hover:bg-emerald-100 cursor-pointer"
                >
                  All (₹{selectedGoalForWithdraw.currentAmount.toLocaleString()})
                </button>
              </div>

              <p className="text-[11px] text-slate-500">
                This will move money directly from your goal vault back into your checking account (+₹). Your daily pocket spending limit will remain safe.
              </p>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowWithdrawModal(false);
                    setSelectedGoalForWithdraw(null);
                  }}
                  className="px-4 py-2 rounded-full text-[#76777d] hover:bg-slate-100 font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-full bg-[#006c49] text-white font-bold hover:bg-[#005236] cursor-pointer"
                >
                  Confirm Withdrawal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Add Goal */}
      {showGoalModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl border border-slate-100 flex flex-col gap-5 animate-in zoom-in-95">
            <div className="flex items-center justify-between">
              <h3 className="font-sans text-lg font-bold text-[#0b1c30]">
                Add New Savings Goal
              </h3>
              <button
                onClick={() => setShowGoalModal(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-[#76777d] hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateGoal} className="flex flex-col gap-4 text-xs sm:text-sm">
              <div className="flex flex-col gap-1">
                <label className="font-bold text-[#0b1c30]">What are you saving for?</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. New Laptop, Vacation, Sister's Wedding"
                  value={goalName}
                  onChange={(e) => setGoalName(e.target.value)}
                  className="bg-[#f8f9ff] border border-slate-200 rounded-xl px-4 py-2.5 text-[#0b1c30] focus:outline-none focus:ring-2 focus:ring-[#006c49]"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="font-bold text-[#0b1c30]">Target Amount (₹)</label>
                <input
                  type="number"
                  required
                  placeholder="e.g. 15000"
                  value={goalTarget}
                  onChange={(e) => setGoalTarget(e.target.value)}
                  className="bg-[#f8f9ff] border border-slate-200 rounded-xl px-4 py-2.5 text-[#0b1c30] focus:outline-none focus:ring-2 focus:ring-[#006c49]"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="font-bold text-[#0b1c30]">Initial Saved Amount (₹)</label>
                <input
                  type="number"
                  placeholder="e.g. 2000 (optional)"
                  value={goalCurrent}
                  onChange={(e) => setGoalCurrent(e.target.value)}
                  className="bg-[#f8f9ff] border border-slate-200 rounded-xl px-4 py-2.5 text-[#0b1c30] focus:outline-none focus:ring-2 focus:ring-[#006c49]"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowGoalModal(false)}
                  className="px-4 py-2 rounded-full text-[#76777d] hover:bg-slate-100 font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-full bg-[#006c49] text-white font-bold hover:bg-[#005236] cursor-pointer"
                >
                  Create Goal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Add Debt / Loan */}
      {showDebtModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl border border-slate-100 flex flex-col gap-5 animate-in zoom-in-95">
            <div className="flex items-center justify-between">
              <h3 className="font-sans text-lg font-bold text-[#0b1c30]">
                Add Loan or Borrowed Money
              </h3>
              <button
                onClick={() => setShowDebtModal(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-[#76777d] hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateDebt} className="flex flex-col gap-4 text-xs sm:text-sm">
              <div className="flex flex-col gap-1">
                <label className="font-bold text-[#0b1c30]">Title or Person Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Rahul Sharma, Flat Rent Due"
                  value={debtTitle}
                  onChange={(e) => setDebtTitle(e.target.value)}
                  className="bg-[#f8f9ff] border border-slate-200 rounded-xl px-4 py-2.5 text-[#0b1c30] focus:outline-none focus:ring-2 focus:ring-[#006c49]"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="font-bold text-[#0b1c30]">Amount (₹)</label>
                <input
                  type="number"
                  required
                  placeholder="e.g. 5000"
                  value={debtAmount}
                  onChange={(e) => setDebtAmount(e.target.value)}
                  className="bg-[#f8f9ff] border border-slate-200 rounded-xl px-4 py-2.5 text-[#0b1c30] focus:outline-none focus:ring-2 focus:ring-[#006c49]"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="font-bold text-[#0b1c30]">Who owes whom?</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setDebtType('owed_by_user')}
                    className={`py-2.5 px-3 rounded-xl font-bold text-xs border cursor-pointer ${
                      debtType === 'owed_by_user'
                        ? 'bg-rose-50 border-rose-300 text-[#ba1a1a]'
                        : 'bg-slate-50 border-slate-200 text-[#45464d]'
                    }`}
                  >
                    I Owe Money
                  </button>
                  <button
                    type="button"
                    onClick={() => setDebtType('owed_to_user')}
                    className={`py-2.5 px-3 rounded-xl font-bold text-xs border cursor-pointer ${
                      debtType === 'owed_to_user'
                        ? 'bg-emerald-50 border-emerald-300 text-[#006c49]'
                        : 'bg-slate-50 border-slate-200 text-[#45464d]'
                    }`}
                  >
                    Someone Owes Me
                  </button>
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="font-bold text-[#0b1c30]">Expected Date (optional)</label>
                <input
                  type="text"
                  placeholder="e.g. 15th next month"
                  value={debtDueDate}
                  onChange={(e) => setDebtDueDate(e.target.value)}
                  className="bg-[#f8f9ff] border border-slate-200 rounded-xl px-4 py-2.5 text-[#0b1c30] focus:outline-none focus:ring-2 focus:ring-[#006c49]"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowDebtModal(false)}
                  className="px-4 py-2 rounded-full text-[#76777d] hover:bg-slate-100 font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-full bg-[#006c49] text-white font-bold hover:bg-[#005236] cursor-pointer"
                >
                  Record Entry
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Goal Confirmation Modal */}
      {goalToDelete && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in zoom-in-95 duration-150">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 flex flex-col gap-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <div className="text-center">
              <h3 className="font-sans text-lg font-bold text-[#0b1c30]">
                Delete Savings Goal?
              </h3>
              <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                Are you sure you want to delete the goal <strong className="text-[#0b1c30]">{goalToDelete.name}</strong>?
              </p>
              {goalToDelete.currentAmount > 0 && (
                <div className="mt-3 p-3 bg-emerald-50 border border-emerald-200 rounded-2xl text-left flex items-start gap-2.5">
                  <div className="w-6 h-6 rounded-full bg-emerald-100 text-[#006c49] flex items-center justify-center shrink-0 mt-0.5">
                    <Wallet className="w-3.5 h-3.5" />
                  </div>
                  <div className="text-xs text-emerald-900">
                    <strong className="block font-bold text-[#006c49]">Funds Returned to Balance:</strong>
                    The saved <strong className="font-bold">₹{goalToDelete.currentAmount.toLocaleString()}</strong> in this goal will immediately return to your available liquid balance.
                  </div>
                </div>
              )}
            </div>
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setGoalToDelete(null)}
                className="flex-1 py-2.5 rounded-2xl border border-slate-200 text-slate-600 font-bold text-xs hover:bg-slate-50 transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  deleteGoal(goalToDelete.id);
                  triggerToast(`Goal "${goalToDelete.name}" deleted and funds released!`);
                  setGoalToDelete(null);
                }}
                className="flex-1 py-2.5 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs transition-all shadow-md shadow-rose-200 cursor-pointer"
              >
                Yes, Delete Goal
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Loan / Debt Confirmation Modal */}
      {debtToDelete && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in zoom-in-95 duration-150">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 flex flex-col gap-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <div className="text-center">
              <h3 className="font-sans text-lg font-bold text-[#0b1c30]">
                Delete {debtToDelete.debtType === 'owed_by_user' ? 'Money You Owe' : 'Money Owed to You'}?
              </h3>
              <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                Are you sure you want to delete the record <strong className="text-[#0b1c30]">{debtToDelete.title}</strong> for <strong className="text-[#0b1c30]">₹{debtToDelete.amount.toLocaleString()}</strong>?
              </p>
              <div className="mt-3 p-3 bg-slate-50 border border-slate-200 rounded-2xl text-left text-xs text-slate-600">
                This record will be permanently removed from your debts list and tracking overview.
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDebtToDelete(null)}
                className="flex-1 py-2.5 rounded-2xl border border-slate-200 text-slate-600 font-bold text-xs hover:bg-slate-50 transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  const title = debtToDelete.title;
                  deleteDebt(debtToDelete.id);
                  triggerToast(`Record "${title}" deleted.`);
                  setDebtToDelete(null);
                }}
                className="flex-1 py-2.5 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs transition-all shadow-md shadow-rose-200 cursor-pointer"
              >
                Yes, Delete Record
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit & Correct Debt Modal */}
      {editingDebt && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in zoom-in-95 duration-150">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-100 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
                  <Pencil className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-[#0b1c30]">Edit & Correct Debt Record</h3>
                  <span className="text-[10px] text-slate-400">Update amount, direction, or details</span>
                </div>
              </div>
              <button
                onClick={() => setEditingDebt(null)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveDebtEdit} className="flex flex-col gap-3">
              <div>
                <label className="text-[11px] font-bold text-slate-500 block mb-1">Title / Counterparty</label>
                <input
                  type="text"
                  value={editDebtTitle}
                  onChange={(e) => setEditDebtTitle(e.target.value)}
                  required
                  className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0b1c30]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-500 block mb-1">Amount (₹)</label>
                  <input
                    type="number"
                    value={editDebtAmount}
                    onChange={(e) => setEditDebtAmount(e.target.value)}
                    required
                    min="1"
                    className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0b1c30]"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-500 block mb-1">Direction</label>
                  <select
                    value={editDebtType}
                    onChange={(e) => setEditDebtType(e.target.value as 'owed_by_user' | 'owed_to_user')}
                    className="w-full px-3 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0b1c30]"
                  >
                    <option value="owed_by_user">I Owe (Payable)</option>
                    <option value="owed_to_user">Owed to Me (Receivable)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-500 block mb-1">Due Date / Timeline</label>
                <input
                  type="text"
                  placeholder="e.g. On Pay Day / Flexible"
                  value={editDebtDueDate}
                  onChange={(e) => setEditDebtDueDate(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0b1c30]"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-500 block mb-1">Notes / Description</label>
                <input
                  type="text"
                  placeholder="Optional context or payment trail"
                  value={editDebtNotes}
                  onChange={(e) => setEditDebtNotes(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0b1c30]"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingDebt(null)}
                  className="px-4 py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-xs font-semibold text-slate-700 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-2xl bg-[#0b1c30] hover:bg-slate-800 text-white text-xs font-semibold cursor-pointer flex items-center gap-1.5 shadow-sm"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Save Changes</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Partial Settle Modal */}
      {partialSettleDebt && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in zoom-in-95 duration-150">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-100 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-2xl bg-emerald-50 text-[#006c49] flex items-center justify-center">
                  <HandCoins className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-[#0b1c30]">Partial Debt Payment</h3>
                  <span className="text-[10px] text-slate-400">
                    {partialSettleDebt.debtType === 'owed_by_user' ? 'Pay off a portion of your liability' : 'Record partial recovery'}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setPartialSettleDebt(null)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 flex flex-col gap-2">
              <div className="flex justify-between text-xs text-slate-600">
                <span>Counterparty:</span>
                <strong className="text-[#0b1c30]">{partialSettleDebt.title}</strong>
              </div>
              <div className="flex justify-between text-xs text-slate-600">
                <span>Current Outstanding:</span>
                <strong className="font-mono-num text-[#0b1c30]">₹{partialSettleDebt.amount.toLocaleString()}</strong>
              </div>
              {parseFloat(partialSettleAmount) > 0 && parseFloat(partialSettleAmount) < partialSettleDebt.amount && (
                <div className="flex justify-between text-xs pt-1 border-t border-slate-200 text-emerald-700">
                  <span>Remaining after payment:</span>
                  <strong className="font-mono-num font-bold">
                    ₹{(partialSettleDebt.amount - parseFloat(partialSettleAmount)).toLocaleString()}
                  </strong>
                </div>
              )}
            </div>

            <form onSubmit={handlePartialSettleSubmit} className="flex flex-col gap-3">
              <div>
                <label className="text-[11px] font-bold text-slate-500 block mb-1">Payment Amount (₹)</label>
                <input
                  type="number"
                  placeholder={`e.g. ${Math.min(5000, Math.round(partialSettleDebt.amount / 2))}`}
                  value={partialSettleAmount}
                  onChange={(e) => setPartialSettleAmount(e.target.value)}
                  required
                  min="1"
                  max={partialSettleDebt.amount}
                  autoFocus
                  className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0b1c30]"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setPartialSettleDebt(null)}
                  className="px-4 py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-xs font-semibold text-slate-700 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!partialSettleAmount || parseFloat(partialSettleAmount) <= 0 || parseFloat(partialSettleAmount) > partialSettleDebt.amount}
                  className="px-5 py-2.5 rounded-2xl bg-[#006c49] hover:bg-emerald-700 text-white text-xs font-semibold cursor-pointer disabled:opacity-50 flex items-center gap-1.5 shadow-sm"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Confirm Partial Payment</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
