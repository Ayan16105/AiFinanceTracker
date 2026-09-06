'use client';

import React, { useState, useMemo } from 'react';
import { useFinance } from '@/context/FinanceContext';
import { Transaction, TransactionType } from '@/types';
import { 
  Search, 
  Trash2, 
  Plus, 
  ArrowUpRight, 
  ArrowDownLeft, 
  Receipt, 
  Calendar, 
  DollarSign, 
  Filter, 
  SlidersHorizontal,
  X,
  CheckCircle2,
  AlertTriangle,
  Wallet,
  Lock,
  ShieldAlert,
  KeyRound
} from 'lucide-react';

export default function TransactionsView() {
  const { 
    transactions, 
    deleteTransaction, 
    logExpense,
    userSettings,
    spentToday,
    currentBalance
  } = useFinance();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [showAddModal, setShowAddModal] = useState(false);

  // Security Authorization state for deleting transactions
  const [txToDelete, setTxToDelete] = useState<Transaction | null>(null);
  const [deleteAuthInput, setDeleteAuthInput] = useState('');
  const [deleteError, setDeleteError] = useState('');

  // New Transaction Form State
  const [newPrompt, setNewPrompt] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Categories list
  const categories = useMemo(() => {
    const set = new Set<string>();
    transactions.forEach((tx) => {
      if (tx.category) set.add(tx.category);
    });
    return Array.from(set);
  }, [transactions]);

  // Filtered transactions
  const filteredTransactions = useMemo(() => {
    return transactions.filter((tx) => {
      const matchesSearch = 
        tx.merchant.toLowerCase().includes(searchTerm.toLowerCase()) ||
        tx.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
        tx.amount.toString().includes(searchTerm) ||
        (tx.rawPrompt && tx.rawPrompt.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchesType = 
        selectedType === 'all' ? true : tx.transactionType === selectedType;

      const matchesCategory = 
        selectedCategory === 'all' ? true : tx.category === selectedCategory;

      return matchesSearch && matchesType && matchesCategory;
    });
  }, [transactions, searchTerm, selectedType, selectedCategory]);

  // Aggregate stats
  const totalOutflow = useMemo(() => {
    return transactions
      .filter((t) => t.transactionType === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);
  }, [transactions]);

  const totalInflow = useMemo(() => {
    return transactions
      .filter((t) => t.transactionType === 'income')
      .reduce((sum, t) => sum + t.amount, 0);
  }, [transactions]);

  const discretionaryExpensesCount = useMemo(() => {
    return transactions.filter((t) => t.isDiscretionary).length;
  }, [transactions]);

  const handleAddNewExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPrompt.trim()) return;
    setIsSubmitting(true);
    try {
      await logExpense(newPrompt);
      setNewPrompt('');
      setShowAddModal(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full max-w-6xl mx-auto px-4 sm:px-8 py-6 sm:py-8 flex flex-col gap-6 pb-28 lg:pb-12">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-[#006c49] font-mono-num text-[11px] font-bold border border-emerald-200 flex items-center gap-1.5">
              <Receipt className="w-3.5 h-3.5 text-emerald-600" />
              <span>DEDICATED LEDGER JOURNAL</span>
            </span>
            <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 font-mono-num text-[11px] font-bold">
              {transactions.length} Total Records
            </span>
          </div>
          <h1 className="font-sans text-2xl sm:text-3xl font-bold text-[#0b1c30]">
            Transaction Records
          </h1>
          <p className="text-sm text-[#76777d]">
            Complete real-time ledger of your expenses, income, splits, and transfers
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-[#0b1c30] text-white hover:bg-slate-800 text-xs font-semibold transition-all shadow-sm cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add Transaction</span>
          </button>
        </div>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-3xl bg-white border border-slate-100 shadow-xs flex flex-col gap-1">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
            <ArrowUpRight className="w-3.5 h-3.5 text-rose-500" />
            <span>Total Outflow</span>
          </span>
          <span className="font-mono-num text-xl sm:text-2xl font-bold text-rose-600">
            ₹{totalOutflow.toLocaleString()}
          </span>
          <span className="text-[11px] text-slate-400">Recorded across {transactions.length} items</span>
        </div>

        <div className="p-4 rounded-3xl bg-white border border-slate-100 shadow-xs flex flex-col gap-1">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
            <Wallet className="w-3.5 h-3.5 text-emerald-500" />
            <span>Current Balance</span>
          </span>
          <span className="font-mono-num text-xl sm:text-2xl font-bold text-emerald-600">
            ₹{currentBalance.toLocaleString()}
          </span>
          <span className="text-[11px] text-slate-400">Liquid cash (Salary + Inflows)</span>
        </div>

        <div className="p-4 rounded-3xl bg-white border border-slate-100 shadow-xs flex flex-col gap-1">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
            <DollarSign className="w-3.5 h-3.5 text-cyan-600" />
            <span>Spent Today</span>
          </span>
          <span className="font-mono-num text-xl sm:text-2xl font-bold text-[#0b1c30]">
            ₹{spentToday.toLocaleString()}
          </span>
          <span className="text-[11px] text-slate-400">Daily Cap: ₹{userSettings.dailySpendLimit}/day</span>
        </div>

        <div className="p-4 rounded-3xl bg-white border border-slate-100 shadow-xs flex flex-col gap-1">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
            <SlidersHorizontal className="w-3.5 h-3.5 text-indigo-600" />
            <span>Discretionary</span>
          </span>
          <span className="font-mono-num text-xl sm:text-2xl font-bold text-indigo-600">
            {discretionaryExpensesCount} items
          </span>
          <span className="text-[11px] text-slate-400">Pocket money expenses</span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-3xl p-4 sm:p-5 border border-slate-100 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search merchant, category, ₹ amount..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-slate-50 border border-slate-200/80 text-xs focus:outline-none focus:ring-2 focus:ring-[#0b1c30] text-slate-800"
          />
          {searchTerm && (
            <button 
              onClick={() => setSearchTerm('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
          {/* Type Filter */}
          <div className="flex items-center bg-slate-100 p-1 rounded-2xl text-xs font-semibold">
            <button
              type="button"
              onClick={() => setSelectedType('all')}
              className={`px-3 py-1.5 rounded-xl cursor-pointer transition-all ${
                selectedType === 'all' ? 'bg-white text-[#0b1c30] shadow-xs' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              All
            </button>
            <button
              type="button"
              onClick={() => setSelectedType('expense')}
              className={`px-3 py-1.5 rounded-xl cursor-pointer transition-all ${
                selectedType === 'expense' ? 'bg-white text-[#0b1c30] shadow-xs' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Expenses
            </button>
            <button
              type="button"
              onClick={() => setSelectedType('income')}
              className={`px-3 py-1.5 rounded-xl cursor-pointer transition-all ${
                selectedType === 'income' ? 'bg-white text-[#0b1c30] shadow-xs' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Income
            </button>
          </div>

          {/* Category Filter */}
          {categories.length > 0 && (
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-3 py-2 rounded-2xl bg-slate-50 border border-slate-200/80 text-xs font-semibold text-slate-700 cursor-pointer focus:outline-none"
            >
              <option value="all">All Categories</option>
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* Transactions Table / List */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden flex flex-col">
        {filteredTransactions.length === 0 ? (
          <div className="py-16 px-4 flex flex-col items-center justify-center text-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400">
              <Receipt className="w-6 h-6" />
            </div>
            <div className="flex flex-col gap-1">
              <h3 className="font-bold text-sm text-[#0b1c30]">No Transactions Found</h3>
              <p className="text-xs text-[#76777d] max-w-sm">
                {searchTerm || selectedType !== 'all' || selectedCategory !== 'all'
                  ? 'No records match your search or filter parameters. Try clearing the filters.'
                  : 'Your ledger is clean! Log an expense using the J.A.R.V.I.S. chat terminal or click "Add Transaction" above.'}
              </p>
            </div>
            {(searchTerm || selectedType !== 'all' || selectedCategory !== 'all') && (
              <button
                type="button"
                onClick={() => {
                  setSearchTerm('');
                  setSelectedType('all');
                  setSelectedCategory('all');
                }}
                className="mt-2 px-4 py-2 rounded-2xl bg-slate-100 hover:bg-slate-200 text-xs font-semibold text-slate-700 transition-colors cursor-pointer"
              >
                Reset Filters
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 text-[11px] font-bold text-slate-400 uppercase tracking-wider bg-slate-50/50">
                  <th className="py-3.5 px-5">Date & Time</th>
                  <th className="py-3.5 px-4">Merchant / Title</th>
                  <th className="py-3.5 px-4">Category</th>
                  <th className="py-3.5 px-4">Type</th>
                  <th className="py-3.5 px-4 text-right">Amount</th>
                  <th className="py-3.5 px-5 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {filteredTransactions.map((tx) => (
                  <tr 
                    key={tx.id}
                    className="hover:bg-slate-50/70 transition-colors group"
                  >
                    <td className="py-3.5 px-5 whitespace-nowrap text-slate-500 font-mono-num text-[11px]">
                      {tx.date} {tx.time && <span className="text-slate-400">· {tx.time}</span>}
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="flex flex-col">
                        <span className="font-bold text-[#0b1c30]">{tx.merchant}</span>
                        {tx.rawPrompt && tx.rawPrompt !== tx.merchant && (
                          <span className="text-[10px] text-slate-400 truncate max-w-xs">
                            "{tx.rawPrompt}"
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-700">
                        {tx.category}
                      </span>
                    </td>

                    <td className="py-3.5 px-4">
                      <span 
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          tx.isDiscretionary
                            ? 'bg-amber-50 text-amber-800 border border-amber-200'
                            : 'bg-indigo-50 text-indigo-800 border border-indigo-200'
                        }`}
                      >
                        {tx.isDiscretionary ? 'Pocket Money' : 'Fixed Overhead'}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <span 
                        className={`font-mono-num font-bold text-sm ${
                          tx.transactionType === 'income' 
                            ? 'text-emerald-600' 
                            : 'text-rose-600'
                        }`}
                      >
                        {tx.transactionType === 'income' ? '+₹' : '-₹'}
                        {tx.amount.toLocaleString()}
                      </span>
                    </td>

                    <td className="py-3.5 px-5 text-center">
                      <button
                        type="button"
                        onClick={() => {
                          setTxToDelete(tx);
                          setDeleteAuthInput('');
                          setDeleteError('');
                        }}
                        className="p-1.5 rounded-xl text-slate-300 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                        title="Request Ledger Security Authorization to Delete"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>



      {/* Special Security Clearance Modal for Deleting Transaction */}
      {txToDelete && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-rose-100 flex flex-col gap-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5 text-rose-600">
                <div className="w-10 h-10 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-center">
                  <Lock className="w-5 h-5 text-rose-600" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-[#0b1c30]">Security Clearance Required</h3>
                  <span className="text-[10px] font-bold text-rose-600 tracking-wider uppercase flex items-center gap-1">
                    <ShieldAlert className="w-3 h-3" /> Audit Record Protection
                  </span>
                </div>
              </div>
              <button
                onClick={() => {
                  setTxToDelete(null);
                  setDeleteAuthInput('');
                  setDeleteError('');
                }}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex flex-col gap-2">
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-500 font-semibold">Audit Record to Remove:</span>
                <span className="font-mono-num text-[11px] text-slate-400">{txToDelete.date}</span>
              </div>
              <div className="flex justify-between items-center">
                <div>
                  <div className="font-bold text-sm text-[#0b1c30]">{txToDelete.merchant}</div>
                  <div className="text-[11px] text-slate-500">{txToDelete.category}</div>
                </div>
                <div className={`font-mono-num font-bold text-base ${txToDelete.transactionType === 'income' ? 'text-emerald-600' : 'text-rose-600'}`}>
                  {txToDelete.transactionType === 'income' ? '+₹' : '-₹'}{txToDelete.amount.toLocaleString()}
                </div>
              </div>
            </div>

            <div className="text-xs text-slate-600 bg-amber-50/80 border border-amber-200 p-3 rounded-2xl leading-relaxed">
              <strong>⚠️ Protected Financial Record:</strong> To protect against accidental deletions or financial tampering, entering your Security PIN is strictly enforced.
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-slate-700">
                Enter Security PIN:
              </label>
              <div className="relative">
                <KeyRound className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  inputMode="numeric"
                  placeholder="••••"
                  value={deleteAuthInput}
                  onChange={(e) => {
                    setDeleteAuthInput(e.target.value);
                    setDeleteError('');
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      const val = deleteAuthInput.trim();
                      const userPin = (userSettings.securityPin || '1014').trim();
                      if (val === userPin) {
                        deleteTransaction(txToDelete.id);
                        setTxToDelete(null);
                        setDeleteAuthInput('');
                        setDeleteError('');
                      } else {
                        setDeleteError('Incorrect Security PIN. Please try again.');
                      }
                    }
                  }}
                  autoFocus
                  className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-sm font-mono text-slate-900 tracking-widest focus:outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>
              {deleteError && (
                <p className="text-[11px] text-rose-600 font-semibold">{deleteError}</p>
              )}
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => {
                  setTxToDelete(null);
                  setDeleteAuthInput('');
                  setDeleteError('');
                }}
                className="px-4 py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-xs font-semibold text-slate-700 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  const val = deleteAuthInput.trim();
                  const userPin = (userSettings.securityPin || '1014').trim();
                  if (val === userPin) {
                    deleteTransaction(txToDelete.id);
                    setTxToDelete(null);
                    setDeleteAuthInput('');
                    setDeleteError('');
                  } else {
                    setDeleteError('Incorrect Security PIN. Please try again.');
                  }
                }}
                disabled={!deleteAuthInput.trim()}
                className={`px-4 py-2.5 rounded-2xl text-xs font-semibold transition-all cursor-pointer shadow-sm ${
                  deleteAuthInput.trim()
                    ? 'bg-rose-600 hover:bg-rose-700 text-white shadow-rose-200'
                    : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                }`}
              >
                Authorize & Delete Record
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Transaction Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-100 flex flex-col gap-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-2xl bg-emerald-50 text-[#006c49] flex items-center justify-center">
                  <Plus className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-base text-[#0b1c30]">Quick Log Transaction</h3>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddNewExpense} className="flex flex-col gap-3">
              <p className="text-xs text-[#76777d]">
                Type in natural English or Hinglish (e.g. <em>"Tea ₹40"</em>, <em>"Uber ₹250 to office"</em>, or <em>"Grocery ₹1200 Blinkit"</em>):
              </p>
              <input
                type="text"
                placeholder="e.g. Zomato 250 lunch"
                value={newPrompt}
                onChange={(e) => setNewPrompt(e.target.value)}
                autoFocus
                className="w-full px-4 py-3 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0b1c30]"
              />

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-xs font-semibold text-slate-700 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!newPrompt.trim() || isSubmitting}
                  className="px-5 py-2.5 rounded-2xl bg-[#0b1c30] hover:bg-slate-800 text-white text-xs font-semibold cursor-pointer disabled:opacity-50 flex items-center gap-1.5 shadow-sm"
                >
                  {isSubmitting ? (
                    <span>Auditing...</span>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Log Entry</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
