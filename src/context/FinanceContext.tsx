'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  UserSettings,
  Transaction,
  SavingsGoal,
  Debt,
  DebtType,
  ChatMessage,
  ChatSession,
  ParseExpenseResult,
  AutoAction,
  BorrowDepositPrompt,
} from '@/types';
import {
  initialUserSettings,
  initialTransactions,
  initialGoals,
  initialDebts,
  initialChatMessages,
} from '@/lib/mockData';
import { parseExpenseWithRules } from '@/lib/geminiClient';
import { PayCycleInfo, getPayCycleInfo } from '@/lib/cycleUtils';
import { SupabaseService } from '@/lib/supabaseService';
import { generateJarvisGreeting } from '@/lib/jarvisGreetings';
import { parseBankSms } from '@/lib/bankSmsParser';
import { generateGeminiSessionTitle } from '@/lib/sessionUtils';
import { jarvisNotificationService } from '@/lib/notificationService';

export interface CloudSyncStatus {
  connected: boolean;
  tablesFound: boolean;
  error?: string;
}

interface FinanceContextType {
  activeTab: 'command-center' | 'ai-ca-ledger' | 'transactions-ledger' | 'radar-and-horizons';
  setActiveTab: (tab: 'command-center' | 'ai-ca-ledger' | 'transactions-ledger' | 'radar-and-horizons') => void;
  userSettings: UserSettings;
  payCycleInfo: PayCycleInfo;
  updateUserSettings: (settings: Partial<UserSettings>) => void;
  toggleStrictMode: () => void;
  transactions: Transaction[];
  goals: SavingsGoal[];
  debts: Debt[];
  chatMessages: ChatMessage[];
  // Chat Sessions & Bank Alert Butler
  sessions: ChatSession[];
  currentSessionId: string;
  createNewSession: (customTitle?: string) => string;
  switchSession: (sessionId: string) => void;
  deleteSession: (sessionId: string) => void;
  clearAllSessions: () => Promise<void>;
  processBankSms: (smsText: string) => { success: boolean; message: string };
  confirmBankAlertTransaction: (data: {
    amount: number;
    merchant: string;
    category: string;
    description?: string;
    messageId?: string;
  }) => void;
  confirmBorrowDeposit: (amount: number, counterparty: string, messageId?: string) => void;
  dismissBorrowDeposit: (messageId: string) => void;
  spentToday: number;
  safeToSpendRemaining: number;
  todayDeficit: number;
  tomorrowAdjustedCap: number;
  currentBalance: number;
  totalSavedGoals: number;
  availableLiquidCash: number;
  logExpense: (prompt: string) => Promise<ParseExpenseResult>;
  depositToGoal: (goalId: string, amount: number) => void;
  withdrawFromGoal: (goalId: string, amount: number) => void;
  settleDebt: (debtId: string, autoLogTransaction?: boolean, partialAmount?: number) => void;
  editTransaction: (transactionId: string, updates: Partial<Transaction>) => void;
  editDebt: (debtId: string, updates: Partial<Debt>) => void;
  flipDebtDirection: (debtId: string) => void;
  flipLastDebt: () => void;
  editLastTransaction: (updates: Partial<Transaction>) => void;
  addGoal: (goal: Omit<SavingsGoal, 'id' | 'userId'>) => void;
  deleteGoal: (goalId: string) => void;
  addDebt: (debt: Omit<Debt, 'id' | 'userId'>) => void;
  deleteDebt: (debtId: string) => void;
  deleteTransaction: (transactionId: string) => void;
  resetTodaySpending: () => void;
  clearChatMessages: () => void;
  isAuditing: boolean;
  cloudSyncStatus: CloudSyncStatus;
  refreshCloudData: () => Promise<void>;
  isSettingsOpen: boolean;
  openSettings: () => void;
  closeSettings: () => void;
}

export const isCounterpartyMatch = (name1: string, name2: string): boolean => {
  const clean1 = (name1 || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  const clean2 = (name2 || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  if (!clean1 || !clean2) return false;
  if (clean1 === clean2) return true;
  if (clean1.includes(clean2) || clean2.includes(clean1)) return true;

  // Handle minor phonetic/vowel variations like kamaran vs kamran:
  const noVowels1 = clean1.replace(/[aeiou]/g, '');
  const noVowels2 = clean2.replace(/[aeiou]/g, '');
  if (noVowels1.length >= 3 && noVowels1 === noVowels2) return true;

  // Prefix match (e.g. kamr...)
  if (clean1.length >= 4 && clean2.length >= 4) {
    if (clean1.slice(0, 4) === clean2.slice(0, 4)) return true;
  }

  return false;
};

export const isGoalMatch = (name1: string, name2: string): boolean => {
  const clean1 = (name1 || '').toLowerCase().trim().replace(/[^a-z0-9]/g, '');
  const clean2 = (name2 || '').toLowerCase().trim().replace(/[^a-z0-9]/g, '');
  if (!clean1 || !clean2) return false;
  if (clean1 === clean2) return true;
  if (clean1.includes(clean2) || clean2.includes(clean1)) return true;

  // Common keywords matching
  if (clean1.includes('emergency') && clean2.includes('emergency')) return true;
  if (clean1.includes('dress') && clean2.includes('dress')) return true;
  if (clean1.includes('mama') && clean2.includes('mama')) return true;
  if (clean1.includes('wedding') && clean2.includes('wedding')) return true;
  if (clean1.includes('iphone') && clean2.includes('iphone')) return true;

  const noVowels1 = clean1.replace(/[aeiou]/g, '');
  const noVowels2 = clean2.replace(/[aeiou]/g, '');
  if (noVowels1.length >= 3 && noVowels1 === noVowels2) return true;

  return false;
};

const FinanceContext = createContext<FinanceContextType | undefined>(undefined);

export const getTodaySessionId = () => {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `sess-${y}-${m}-${d}`;
};

export const getTodaySessionTitle = () => {
  const now = new Date();
  const formatted = now.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
  return `Briefing — ${formatted}`;
};

const DEFAULT_SESSION_ID = getTodaySessionId();

export function FinanceProvider({ children }: { children: React.ReactNode }) {
  const [activeTab, setActiveTab] = useState<'command-center' | 'ai-ca-ledger' | 'transactions-ledger' | 'radar-and-horizons'>('command-center');
  const [userSettings, setUserSettings] = useState<UserSettings>(initialUserSettings);
  const [transactions, setTransactions] = useState<Transaction[]>(initialTransactions);
  const [goals, setGoals] = useState<SavingsGoal[]>(initialGoals);
  const [debts, setDebts] = useState<Debt[]>(initialDebts);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('jarvis_chat_messages');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        }
      } catch {}
    }
    return initialChatMessages;
  });

  // Chat Sessions state (One persistent session per day)
  const [sessions, setSessions] = useState<ChatSession[]>(() => {
    const todayId = getTodaySessionId();
    const todayTitle = getTodaySessionTitle();
    const nowIso = new Date().toISOString();
    const todaySession: ChatSession = {
      id: todayId,
      title: todayTitle,
      createdAt: nowIso,
      lastActiveAt: nowIso,
    };

    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('jarvis_chat_sessions');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) {
            const hasToday = parsed.some((s: ChatSession) => s.id === todayId);
            if (!hasToday) {
              return [todaySession, ...parsed];
            }
            return parsed;
          }
        }
      } catch {}
    }
    return [todaySession];
  });

  const [currentSessionId, setCurrentSessionId] = useState<string>(() => {
    const todayId = getTodaySessionId();
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('jarvis_active_session_id');
        if (saved) return saved;
      } catch {}
    }
    return todayId;
  });

  const [isAuditing, setIsAuditing] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [cloudSyncStatus, setCloudSyncStatus] = useState<CloudSyncStatus>({
    connected: false,
    tablesFound: false,
  });

  const openSettings = () => setIsSettingsOpen(true);
  const closeSettings = () => setIsSettingsOpen(false);

  const refreshCloudData = async () => {
    try {
      const conn = await SupabaseService.checkCloudConnection();
      setCloudSyncStatus(conn);
      if (conn.connected && conn.tablesFound) {
        const cloudData = await SupabaseService.fetchAllData();
        if (cloudData) {
          if (cloudData.userSettings) {
            setUserSettings((prev) => {
              const cloud = cloudData.userSettings!;
              let localPin = '1014';
              let localBio = true;
              try {
                localPin = localStorage.getItem('jarvis_security_pin') || prev.securityPin || '1014';
                const bioVal = localStorage.getItem('jarvis_biometric_enabled');
                localBio = bioVal !== null ? bioVal === 'true' : (prev.biometricEnabled ?? true);
              } catch {}

              // Database is ground truth across all browsers:
              const finalPin = cloud.securityPin || localPin;
              const finalBio = cloud.biometricEnabled !== undefined ? cloud.biometricEnabled : localBio;
              const finalSavings = cloud.savingsTarget !== undefined
                ? cloud.savingsTarget
                : (prev.savingsTarget ?? Math.max(0, cloud.monthlySalary - cloud.householdFundCurrent - cloud.monthlyDiscretionaryCap));

              const mergedSettings: UserSettings = {
                ...cloud,
                securityPin: finalPin,
                biometricEnabled: finalBio,
                savingsTarget: finalSavings,
              };

              try {
                localStorage.setItem('aipa_settings', JSON.stringify(mergedSettings));
                localStorage.setItem('jarvis_security_pin', finalPin);
                localStorage.setItem('jarvis_biometric_enabled', String(finalBio));
              } catch {}

              return mergedSettings;
            });
          }
          if (cloudData.transactions !== undefined) setTransactions(cloudData.transactions);
          if (cloudData.goals !== undefined) {
            // Deduplicate goals so only ONE goal exists per name
            const deduplicatedGoals: SavingsGoal[] = [];
            const seenGoals = new Map<string, SavingsGoal>();
            const duplicateGoalIdsToDelete: string[] = [];

            for (const g of cloudData.goals) {
              const matchedKey = Array.from(seenGoals.keys()).find((k) => isGoalMatch(k, g.name));
              if (matchedKey) {
                const existing = seenGoals.get(matchedKey)!;
                existing.currentAmount += g.currentAmount;
                existing.targetAmount = Math.max(existing.targetAmount, g.targetAmount);
                duplicateGoalIdsToDelete.push(g.id);
              } else {
                const copy = { ...g };
                seenGoals.set(g.name, copy);
                deduplicatedGoals.push(copy);
              }
            }
            duplicateGoalIdsToDelete.forEach((id) => SupabaseService.syncGoalDelete(id));
            setGoals(deduplicatedGoals);
          }
          if (cloudData.debts !== undefined) {
            // Deduplicate active debts so only ONE record exists per person
            const deduplicatedDebts: Debt[] = [];
            const seenDebts = new Map<string, Debt>();
            const duplicateDebtIdsToDelete: string[] = [];

            for (const d of cloudData.debts) {
              if (d.isSettled) {
                deduplicatedDebts.push(d);
                continue;
              }
              const matchedKey = Array.from(seenDebts.keys()).find(
                (k) => k.startsWith(d.debtType + ':') && isCounterpartyMatch(k.split(':')[1], d.title)
              );
              if (matchedKey) {
                const existing = seenDebts.get(matchedKey)!;
                existing.amount += d.amount;
                duplicateDebtIdsToDelete.push(d.id);
              } else {
                const copy = { ...d };
                seenDebts.set(`${d.debtType}:${d.title}`, copy);
                deduplicatedDebts.push(copy);
              }
            }
            duplicateDebtIdsToDelete.forEach((id) => SupabaseService.syncDebtDelete(id));
            setDebts(deduplicatedDebts);
          }
          if (cloudData.chatMessages !== undefined && cloudData.chatMessages.length > 0) {
            setChatMessages(cloudData.chatMessages);
            try {
              localStorage.setItem('jarvis_chat_messages', JSON.stringify(cloudData.chatMessages));
            } catch {}
            const sessionMap = new Map<string, { title: string; createdAt: string; lastActiveAt: string }>();
            cloudData.chatMessages.forEach((m) => {
              const sId = m.metadata?.sessionId || m.sessionId;
              if (sId) {
                if (!sessionMap.has(sId)) {
                  const userMsgInSession = cloudData.chatMessages?.find(
                    (msg) => (msg.metadata?.sessionId === sId || msg.sessionId === sId) && msg.sender === 'user'
                  );
                  const cleanTitle = generateGeminiSessionTitle(
                    userMsgInSession?.text || m.text || '',
                    m.metadata?.merchant,
                    m.metadata?.category
                  );
                  sessionMap.set(sId, {
                    title: cleanTitle,
                    createdAt: m.timestamp || new Date().toISOString(),
                    lastActiveAt: m.timestamp || new Date().toISOString(),
                  });
                }
              }
            });

            if (sessionMap.size > 0) {
              setSessions((prev) => {
                const existingIds = new Set(prev.map((s) => s.id));
                const newFromCloud: ChatSession[] = [];
                sessionMap.forEach((meta, id) => {
                  if (!existingIds.has(id)) {
                    newFromCloud.push({
                      id,
                      title: meta.title,
                      createdAt: meta.createdAt,
                      lastActiveAt: meta.lastActiveAt,
                    });
                  }
                });
                return newFromCloud.length > 0 ? [...prev, ...newFromCloud] : prev;
              });
            }
          }
        }
      }
    } catch (e) {
      console.warn('Cloud data fetch failed:', e);
    }
  };

  // Load from localStorage on client mount & sanitize accidental chat transactions, then sync with cloud
  useEffect(() => {
    try {
      const savedSettings = localStorage.getItem('aipa_settings');
      let pin = localStorage.getItem('jarvis_security_pin') || '1014';
      let bio = localStorage.getItem('jarvis_biometric_enabled') !== null
        ? localStorage.getItem('jarvis_biometric_enabled') === 'true'
        : true;

      if (savedSettings) {
        const parsed = JSON.parse(savedSettings);
        if (!localStorage.getItem('jarvis_security_pin') && parsed.securityPin) {
          pin = parsed.securityPin;
        }
        if (parsed.biometricEnabled !== undefined && localStorage.getItem('jarvis_biometric_enabled') === null) {
          bio = parsed.biometricEnabled;
        }
        setUserSettings({
          ...initialUserSettings,
          ...parsed,
          securityPin: pin,
          biometricEnabled: bio,
        });
      } else {
        setUserSettings((prev) => ({ ...prev, securityPin: pin, biometricEnabled: bio }));
      }
    } catch (e) {
      console.error('Failed to load cached finance data:', e);
    }

    // Trigger Supabase cloud fetch
    refreshCloudData();
  }, []);

  // Local storage persistence has been migrated to Supabase Live Sync.

  const getLocalDateStr = (d: Date = new Date()) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  const todayStr = getLocalDateStr();

  // Calculate today's discretionary expense sum (fixed household rent does not drain daily pocket allowance)
  const spentToday = transactions
    .filter((tx) => tx.date === todayStr && tx.transactionType === 'expense' && tx.isDiscretionary !== false)
    .reduce((sum, tx) => sum + tx.amount, 0);

  const payCycleInfo = getPayCycleInfo(userSettings.salaryDayOfMonth || 7);
  const remainingCycleDays = Math.max(1, payCycleInfo.daysRemaining);

  const safeToSpendRemaining = Math.max(0, userSettings.dailySpendLimit - spentToday);
  const todayDeficit = spentToday > userSettings.dailySpendLimit ? spentToday - userSettings.dailySpendLimit : 0;
  // Amortize deficit across the remaining days of the cycle instead of zeroing out tomorrow
  const dailyAmortizedDeduction = Math.round(todayDeficit / remainingCycleDays);
  const tomorrowAdjustedCap = Math.max(100, userSettings.dailySpendLimit - dailyAmortizedDeduction);

  // Financial Balance Calculations:
  // Total Inflow: income transactions (salary credits, debt recoveries, refunds)
  const totalIncome = transactions
    .filter((tx) => tx.transactionType === 'income')
    .reduce((sum, tx) => sum + tx.amount, 0);

  // Total Outflow: expenses (daily pocket expenses + fixed bills)
  const totalExpense = transactions
    .filter((tx) => tx.transactionType === 'expense')
    .reduce((sum, tx) => sum + tx.amount, 0);

  // Goal Transfers: funds transferred from liquid checking into savings goal vaults
  const totalTransfersToGoals = transactions
    .filter((tx) => tx.transactionType === 'transfer' && tx.amount > 0)
    .reduce((sum, tx) => sum + tx.amount, 0);

  const totalSavedGoals = goals.reduce((sum, g) => sum + g.currentAmount, 0);

  // Liquid Checking Balance: Monthly Salary + Income - Expenses - Transfers to Goal Vaults
  const currentSalary = userSettings.monthlySalary || 35000;
  const currentBalance = Math.max(0, currentSalary + totalIncome - totalExpense - totalTransfersToGoals);
  const availableLiquidCash = currentBalance;

  const toggleStrictMode = () => {
    setUserSettings((prev) => ({
      ...prev,
      strictModeEnabled: !prev.strictModeEnabled,
    }));
  };

  const updateUserSettings = (newSettings: Partial<UserSettings>) => {
    setUserSettings((prev) => {
      const updated = { ...prev, ...newSettings };
      try {
        localStorage.setItem('aipa_settings', JSON.stringify(updated));
        if (updated.securityPin) {
          localStorage.setItem('jarvis_security_pin', updated.securityPin);
        }
        if (updated.biometricEnabled !== undefined) {
          localStorage.setItem('jarvis_biometric_enabled', String(updated.biometricEnabled));
        }
      } catch (err) {
        console.warn('Failed to save settings to localStorage:', err);
      }
      SupabaseService.syncUserSettings(updated);
      return updated;
    });
  };

  const settleDebt = (debtId: string, autoLogTransaction: boolean = true, partialAmount?: number) => {
    const debt = debts.find((d) => d.id === debtId);
    if (!debt || debt.isSettled || debt.amount <= 0) return;

    const paymentAmount = typeof partialAmount === 'number' && partialAmount > 0 ? Math.min(partialAmount, debt.amount) : debt.amount;
    const isPartial = paymentAmount < debt.amount;
    const remainingAmount = Math.max(0, debt.amount - paymentAmount);
    const now = new Date();
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const updatedDebt: Debt = {
      ...debt,
      amount: remainingAmount,
      isSettled: remainingAmount === 0,
      notes: isPartial
        ? `${debt.notes ? debt.notes + ' | ' : ''}Paid ₹${paymentAmount.toLocaleString()} on ${todayStr} (Remaining: ₹${remainingAmount.toLocaleString()})`
        : (debt.notes ? `${debt.notes} | Settled in full on ${todayStr}` : `Settled in full on ${todayStr}`),
    };

    setDebts((prev) =>
      prev.map((d) => (d.id === debtId ? updatedDebt : d))
    );
    SupabaseService.syncDebtUpsert(updatedDebt);

    if (!autoLogTransaction) return;

    if (debt.debtType === 'owed_to_user') {
      // Money was owed to Sir -> Settle/recovery means incoming money!
      const newTx: Transaction = {
        id: `tx-${Date.now()}`,
        userId: userSettings.userId,
        rawPrompt: isPartial ? `Partial debt recovery: ₹${paymentAmount} from ${debt.title}` : `Settled receivable: ${debt.title}`,
        merchant: debt.title,
        amount: paymentAmount,
        category: 'Debt Recovery / Refund',
        transactionType: 'income',
        isDiscretionary: false,
        isOverLimit: false,
        overLimitAmount: 0,
        date: todayStr,
        time: timeStr,
        createdAt: now.toISOString(),
      };
      setTransactions((prev) => [newTx, ...prev]);
      SupabaseService.syncTransactionInsert(newTx);
    } else {
      // Sir owed money -> Settle/repay means expense
      const newTx: Transaction = {
        id: `tx-${Date.now()}`,
        userId: userSettings.userId,
        rawPrompt: isPartial ? `Partial debt payment: ₹${paymentAmount} for ${debt.title}` : `Settled liability: ${debt.title}`,
        merchant: debt.title,
        amount: paymentAmount,
        category: 'Debt Repayment',
        transactionType: 'expense',
        isDiscretionary: false,
        isOverLimit: false,
        overLimitAmount: 0,
        date: todayStr,
        time: timeStr,
        createdAt: now.toISOString(),
      };
      setTransactions((prev) => [newTx, ...prev]);
      SupabaseService.syncTransactionInsert(newTx);
    }
  };

  const depositToGoal = (goalId: string, amount: number) => {
    if (amount <= 0) return;
    const goal = goals.find((g) => g.id === goalId);
    const goalName = goal ? goal.name : 'Savings Goal';

    let updatedGoal: SavingsGoal | null = null;
    setGoals((prev) =>
      prev.map((g) => {
        if (g.id === goalId) {
          const updated = g.currentAmount + amount;
          updatedGoal = {
            ...g,
            currentAmount: updated,
            milestones: g.milestones.map((m) => {
              if (m.title.includes('25%') && updated >= g.targetAmount * 0.25) return { ...m, status: 'achieved' };
              if (m.title.includes('Half') && updated >= g.targetAmount * 0.5) return { ...m, status: 'achieved' };
              if (updated >= g.targetAmount) return { ...m, status: 'achieved' };
              return m;
            }),
          };
          return updatedGoal;
        }
        return g;
      })
    );
    if (updatedGoal) {
      SupabaseService.syncGoalUpsert(updatedGoal);
    }

    const now = new Date();
    const newTx: Transaction = {
      id: `tx-${Date.now()}`,
      userId: userSettings.userId,
      rawPrompt: `Goal Deposit: ₹${amount} into ${goalName}`,
      merchant: goalName,
      amount,
      category: 'Savings & Goals',
      transactionType: 'transfer',
      isDiscretionary: false,
      isOverLimit: false,
      overLimitAmount: 0,
      date: todayStr,
      time: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      createdAt: now.toISOString(),
    };
    setTransactions((prev) => [newTx, ...prev]);
    SupabaseService.syncTransactionInsert(newTx);
  };

  const withdrawFromGoal = (goalId: string, amount: number) => {
    if (amount <= 0) return;
    const goal = goals.find((g) => g.id === goalId);
    if (!goal || goal.currentAmount <= 0) return;
    if (amount > goal.currentAmount) {
      console.warn(`[J.A.R.V.I.S. Guard] Cannot withdraw ₹${amount} from '${goal.name}' (Available balance: ₹${goal.currentAmount})`);
      return;
    }

    const withdrawAmount = amount;
    let updatedGoal: SavingsGoal | null = null;

    setGoals((prev) =>
      prev.map((g) => {
        if (g.id === goalId) {
          const updated = Math.max(0, g.currentAmount - withdrawAmount);
          updatedGoal = {
            ...g,
            currentAmount: updated,
            milestones: g.milestones.map((m) => {
              if (m.title.includes('25%') && updated < g.targetAmount * 0.25) return { ...m, status: 'pending' };
              if (m.title.includes('Half') && updated < g.targetAmount * 0.5) return { ...m, status: 'pending' };
              if (updated < g.targetAmount) return { ...m, status: 'pending' };
              return m;
            }),
          };
          return updatedGoal;
        }
        return g;
      })
    );
    if (updatedGoal) {
      SupabaseService.syncGoalUpsert(updatedGoal);
    }

    const now = new Date();
    const newTx: Transaction = {
      id: `tx-${Date.now()}`,
      userId: userSettings.userId,
      rawPrompt: `Goal Withdrawal: ₹${withdrawAmount} from ${goal.name}`,
      merchant: goal.name,
      amount: withdrawAmount,
      category: 'Savings & Goals',
      transactionType: 'income',
      isDiscretionary: false,
      isOverLimit: false,
      overLimitAmount: 0,
      date: todayStr,
      time: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      createdAt: now.toISOString(),
    };
    setTransactions((prev) => [newTx, ...prev]);
    SupabaseService.syncTransactionInsert(newTx);
  };

  const addGoal = (goalData: Omit<SavingsGoal, 'id' | 'userId'>) => {
    // Look if a goal with matching name already exists
    const existing = goals.find((g) => isGoalMatch(g.name, goalData.name));
    if (existing) {
      const updatedGoal: SavingsGoal = {
        ...existing,
        targetAmount: Math.max(existing.targetAmount, goalData.targetAmount),
        currentAmount: existing.currentAmount + (goalData.currentAmount || 0),
        monthlyAllocation: goalData.monthlyAllocation || existing.monthlyAllocation,
        targetDate: goalData.targetDate || existing.targetDate,
      };
      setGoals((prev) => prev.map((g) => (g.id === existing.id ? updatedGoal : g)));
      SupabaseService.syncGoalUpsert(updatedGoal);
      return;
    }

    const newGoal: SavingsGoal = {
      ...goalData,
      id: `goal-${Date.now()}`,
      userId: userSettings.userId,
    };
    setGoals((prev) => [...prev, newGoal]);
    SupabaseService.syncGoalUpsert(newGoal);
  };

  const deleteGoal = (goalId: string) => {
    const goal = goals.find((g) => g.id === goalId);
    if (goal && goal.currentAmount > 0) {
      const now = new Date();
      const newTx: Transaction = {
        id: `tx-${Date.now()}`,
        userId: userSettings.userId,
        rawPrompt: `Goal Released: Unlocked ₹${goal.currentAmount} from ${goal.name}`,
        merchant: `Unlocked: ${goal.name}`,
        amount: goal.currentAmount,
        category: 'Savings & Goals',
        transactionType: 'income',
        isDiscretionary: false,
        isOverLimit: false,
        overLimitAmount: 0,
        date: todayStr,
        time: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        createdAt: now.toISOString(),
      };
      setTransactions((prev) => [newTx, ...prev]);
      SupabaseService.syncTransactionInsert(newTx);
    }
    setGoals((prev) => prev.filter((g) => g.id !== goalId));
    SupabaseService.syncGoalDelete(goalId);
  };

  const addDebt = (debtData: Omit<Debt, 'id' | 'userId'>) => {
    // Look if active debt for same counterparty & debtType exists
    const existing = debts.find(
      (d) => !d.isSettled && d.debtType === debtData.debtType && isCounterpartyMatch(d.title, debtData.title)
    );
    if (existing) {
      const updatedDebt: Debt = {
        ...existing,
        amount: existing.amount + debtData.amount,
        notes: `${existing.notes ? existing.notes + ' | ' : ''}Added ₹${debtData.amount.toLocaleString()} on ${todayStr}`,
        dueDate: debtData.dueDate || existing.dueDate,
      };
      setDebts((prev) => prev.map((d) => (d.id === existing.id ? updatedDebt : d)));
      SupabaseService.syncDebtUpsert(updatedDebt);
      return;
    }

    const newDebt: Debt = {
      ...debtData,
      id: `debt-${Date.now()}`,
      userId: userSettings.userId,
    };
    setDebts((prev) => [...prev, newDebt]);
    SupabaseService.syncDebtUpsert(newDebt);
  };

  const confirmBorrowDeposit = (amount: number, counterparty: string, messageId?: string) => {
    const now = new Date();
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const newTx: Transaction = {
      id: `tx-borrow-${Date.now()}`,
      userId: userSettings.userId,
      rawPrompt: `Borrowed Funds Deposit: ₹${amount.toLocaleString()} from ${counterparty}`,
      merchant: `Borrowed from ${counterparty}`,
      amount: Math.abs(amount),
      category: 'Loan / Inflow',
      transactionType: 'income',
      isDiscretionary: false,
      isOverLimit: false,
      overLimitAmount: 0,
      date: todayStr,
      time: timeStr,
      createdAt: now.toISOString(),
    };

    setTransactions((prev) => [newTx, ...prev]);
    SupabaseService.syncTransactionInsert(newTx);

    // Update message metadata to mark confirmed
    setChatMessages((prev) =>
      prev.map((m) => {
        if ((messageId && m.id === messageId) || (!messageId && m.metadata?.borrowDepositPrompt && !m.metadata.borrowDepositPrompt.confirmed)) {
          const updatedMeta = {
            ...m.metadata,
            borrowDepositPrompt: {
              ...(m.metadata?.borrowDepositPrompt || { amount, counterparty }),
              confirmed: true,
            },
          };
          const updatedMsg = { ...m, metadata: updatedMeta };
          SupabaseService.syncChatMessage(updatedMsg);
          return updatedMsg;
        }
        return m;
      })
    );

    // Add J.A.R.V.I.S. acknowledgement
    const ackMsg: ChatMessage = {
      id: `ai-borrow-ack-${Date.now()}`,
      sessionId: currentSessionId,
      sender: 'ai',
      text: `Confirmed, Sir! ₹${amount.toLocaleString()} borrowed from ${counterparty} has been successfully deposited into your Current Liquid Balance.\n\nYour liquid balance has been credited, and the ₹${amount.toLocaleString()} liability remains logged on your radar.`,
      sentiment: 'praise',
      timestamp: timeStr,
      metadata: {
        sessionId: currentSessionId,
        amount,
        merchant: `Borrowed from ${counterparty}`,
        category: 'Loan / Inflow',
        transactionType: 'income',
      },
    };
    setChatMessages((prev) => [...prev, ackMsg]);
    SupabaseService.syncChatMessage(ackMsg);
  };

  const dismissBorrowDeposit = (messageId: string) => {
    setChatMessages((prev) =>
      prev.map((m) => {
        if (m.id === messageId && m.metadata?.borrowDepositPrompt) {
          const updatedMeta = {
            ...m.metadata,
            borrowDepositPrompt: {
              ...m.metadata.borrowDepositPrompt,
              confirmed: true,
              dismissed: true,
            },
          };
          const updatedMsg = { ...m, metadata: updatedMeta };
          SupabaseService.syncChatMessage(updatedMsg);
          return updatedMsg;
        }
        return m;
      })
    );
  };

  const deleteDebt = (debtId: string) => {
    setDebts((prev) => prev.filter((d) => d.id !== debtId));
    SupabaseService.syncDebtDelete(debtId);
  };

  // Persist sessions and active session ID to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('jarvis_chat_sessions', JSON.stringify(sessions));
    } catch {}
  }, [sessions]);

  useEffect(() => {
    try {
      localStorage.setItem('jarvis_active_session_id', currentSessionId);
    } catch {}
  }, [currentSessionId]);

  useEffect(() => {
    try {
      if (chatMessages && chatMessages.length > 0) {
        localStorage.setItem('jarvis_chat_messages', JSON.stringify(chatMessages));
      }
    } catch {}
  }, [chatMessages]);

  // J.A.R.V.I.S. Humorous Butler Greeting on new or empty session
  useEffect(() => {
    const sessionMessages = chatMessages.filter(
      (m) => (m.sessionId || m.metadata?.sessionId || DEFAULT_SESSION_ID) === currentSessionId
    );

    if (sessionMessages.length === 0) {
      const greetingText = generateJarvisGreeting({
        userName: userSettings.userName || 'Ayan',
        userTitle: userSettings.userTitle || 'Sir',
        dailyLimit: userSettings.dailySpendLimit,
        spentToday,
        safeToSpendRemaining,
        daysToSalary: payCycleInfo?.daysRemaining,
      });

      const now = new Date();
      const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const greetingMsg: ChatMessage = {
        id: `ai-greet-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        sessionId: currentSessionId,
        sender: 'ai',
        text: greetingText,
        sentiment: spentToday > userSettings.dailySpendLimit ? 'scold' : 'neutral',
        timestamp: timeStr,
        metadata: {
          sessionId: currentSessionId,
          remainingSafeToSpend: safeToSpendRemaining,
          tomorrowAdjustedCap: tomorrowAdjustedCap,
        },
      };

      setChatMessages((prev) => [...prev, greetingMsg]);
      SupabaseService.syncChatMessage(greetingMsg);
    }
  }, [currentSessionId, chatMessages.length]);

  const createNewSession = (customTitle?: string): string => {
    const newId = `sess-${Date.now()}`;
    const d = new Date();
    const dateLabel = d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
    const title = customTitle || `Briefing (${dateLabel})`;
    const newSession: ChatSession = {
      id: newId,
      title,
      createdAt: d.toISOString(),
      lastActiveAt: d.toISOString(),
    };

    setSessions((prev) => [newSession, ...prev]);
    setCurrentSessionId(newId);

    try {
      localStorage.setItem('jarvis_active_session_id', newId);
    } catch {}

    return newId;
  };

  const switchSession = (sessionId: string) => {
    setCurrentSessionId(sessionId);
    try {
      localStorage.setItem('jarvis_active_session_id', sessionId);
    } catch {}
  };

  const deleteSession = (sessionId: string) => {
    // 1. Delete from Supabase Database
    SupabaseService.deleteSessionMessages(sessionId);

    // 2. Remove session messages from state & localStorage
    setChatMessages((prev) => {
      const filtered = prev.filter(
        (m) => (m.sessionId || m.metadata?.sessionId || DEFAULT_SESSION_ID) !== sessionId
      );
      try {
        localStorage.setItem('jarvis_chat_messages', JSON.stringify(filtered));
      } catch {}
      return filtered;
    });

    // 3. Remove session from sessions list
    const remaining = sessions.filter((s) => s.id !== sessionId);
    let nextList = remaining;
    let nextId = currentSessionId;

    if (remaining.length === 0) {
      const todayId = getTodaySessionId();
      const freshSession: ChatSession = {
        id: todayId,
        title: 'Financial Briefing',
        createdAt: new Date().toISOString(),
        lastActiveAt: new Date().toISOString(),
      };
      nextList = [freshSession];
      nextId = todayId;
    } else if (currentSessionId === sessionId) {
      nextId = remaining[0].id;
    }

    setSessions(nextList);
    setCurrentSessionId(nextId);

    try {
      localStorage.setItem('jarvis_chat_sessions', JSON.stringify(nextList));
      localStorage.setItem('jarvis_active_session_id', nextId);
    } catch {}
  };

  const clearAllSessions = async () => {
    // 1. Delete all chat messages from Supabase Database
    await SupabaseService.clearAllChatMessages();

    // 2. Reset sessions state and localStorage
    const todayId = getTodaySessionId();
    const freshSession: ChatSession = {
      id: todayId,
      title: 'Financial Briefing',
      createdAt: new Date().toISOString(),
      lastActiveAt: new Date().toISOString(),
    };

    setSessions([freshSession]);
    setChatMessages([]);
    setCurrentSessionId(todayId);

    try {
      localStorage.setItem('jarvis_chat_sessions', JSON.stringify([freshSession]));
      localStorage.removeItem('jarvis_chat_messages');
      localStorage.setItem('jarvis_active_session_id', todayId);
    } catch {}
  };

  const processBankSms = (smsText: string): { success: boolean; message: string } => {
    const parsed = parseBankSms(smsText);
    const now = new Date();
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    if (!parsed || !parsed.amount) {
      const errorMsg: ChatMessage = {
        id: `ai-err-${Date.now()}`,
        sessionId: currentSessionId,
        sender: 'ai',
        text: `Sir, I scanned the alert text provided, but could not detect a valid debit or spend notification. Please ensure you copied a bank/UPI transaction SMS (e.g. from SBI, HDFC, ICICI, Axis, GPay, Paytm).`,
        sentiment: 'scold',
        timestamp: timeStr,
        metadata: { sessionId: currentSessionId },
      };
      setChatMessages((prev) => [...prev, errorMsg]);
      return { success: false, message: 'Could not detect a valid debit amount or merchant in the text.' };
    }

    const userNote: ChatMessage = {
      id: `user-sms-${Date.now()}`,
      sessionId: currentSessionId,
      sender: 'user',
      text: `📋 Bank Alert: ₹${parsed.amount.toLocaleString()} debited to ${parsed.merchant}`,
      sentiment: 'neutral',
      timestamp: timeStr,
      metadata: { sessionId: currentSessionId },
    };

    const cardMsgId = `ai-bank-${Date.now()}`;
    const cardMsg: ChatMessage = {
      id: cardMsgId,
      sessionId: currentSessionId,
      sender: 'ai',
      text: `Sir, I have analyzed your bank alert: ₹${parsed.amount.toLocaleString()} debited to ${parsed.merchant}.\n\nWhat was this purchase for? Select a category or specify below to analyze:`,
      sentiment: 'neutral',
      timestamp: timeStr,
      metadata: {
        sessionId: currentSessionId,
        amount: parsed.amount,
        merchant: parsed.merchant,
        category: parsed.suggestedCategory,
        bankAlertData: {
          amount: parsed.amount,
          merchant: parsed.merchant,
          suggestedCategory: parsed.suggestedCategory,
          rawText: smsText.slice(0, 300),
          confirmed: false,
        },
      },
    };

    setChatMessages((prev) => [...prev, userNote, cardMsg]);
    SupabaseService.syncChatMessage(userNote);
    SupabaseService.syncChatMessage(cardMsg);
    return { success: true, message: `Alert parsed: ₹${parsed.amount} at ${parsed.merchant}` };
  };

  const confirmBankAlertTransaction = (data: {
    amount: number;
    merchant: string;
    category: string;
    description?: string;
    messageId?: string;
  }) => {
    const now = new Date();
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const isOver = (spentToday + data.amount) > userSettings.dailySpendLimit;
    const exceededBy = Math.max(0, (spentToday + data.amount) - userSettings.dailySpendLimit);
    const fullMerchant = data.description?.trim()
      ? `${data.merchant} (${data.description.trim()})`
      : data.merchant;

    const newTx: Transaction = {
      id: `tx-bank-${Date.now()}`,
      userId: userSettings.userId,
      rawPrompt: `Bank SMS Alert: ₹${data.amount} to ${data.merchant}`,
      merchant: fullMerchant,
      amount: Math.abs(data.amount),
      category: data.category || 'General Discretionary',
      transactionType: 'expense',
      isDiscretionary: true,
      isOverLimit: isOver,
      overLimitAmount: exceededBy,
      date: todayStr,
      time: timeStr,
      createdAt: now.toISOString(),
    };

    setTransactions((prev) => [newTx, ...prev]);
    SupabaseService.syncTransactionInsert(newTx);

    // Mark the card message as confirmed
    if (data.messageId) {
      setChatMessages((prev) =>
        prev.map((m) => {
          if (m.id === data.messageId && m.metadata?.bankAlertData) {
            return {
              ...m,
              metadata: {
                ...m.metadata,
                category: data.category,
                bankAlertData: {
                  ...m.metadata.bankAlertData,
                  confirmed: true,
                  suggestedCategory: data.category,
                },
              },
            };
          }
          return m;
        })
      );
    }

    // Add J.A.R.V.I.S. Butler acknowledgement
    const ackMsg: ChatMessage = {
      id: `ai-ack-${Date.now()}`,
      sessionId: currentSessionId,
      sender: 'ai',
      text: `Recorded, Sir! ₹${data.amount.toLocaleString()} for ${fullMerchant} under "${data.category}". Ledger updated.\n\n${
        isOver
          ? `⚠️ Warning: We have exceeded today's allowance by ₹${exceededBy.toFixed(0)}. Amortization protocol engaged for tomorrow.`
          : `✅ Remaining safe-to-spend today: ₹${Math.max(0, safeToSpendRemaining - data.amount).toFixed(0)}.`
      }`,
      sentiment: isOver ? 'scold' : 'praise',
      timestamp: timeStr,
      metadata: {
        sessionId: currentSessionId,
        amount: data.amount,
        merchant: fullMerchant,
        category: data.category,
        transactionType: 'expense',
        isOverLimit: isOver,
        exceededBy,
        remainingSafeToSpend: Math.max(0, safeToSpendRemaining - data.amount),
        tomorrowAdjustedCap: Math.max(0, userSettings.dailySpendLimit - (isOver ? exceededBy : 0)),
      },
    };

    setChatMessages((prev) => [...prev, ackMsg]);
    SupabaseService.syncChatMessage(ackMsg);
  };

  const logExpense = async (prompt: string): Promise<ParseExpenseResult> => {
    setIsAuditing(true);

    const now = new Date();
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    // 1. Add User Message immediately with sessionId
    const userMsgId = `user-${Date.now()}`;
    const userMsg: ChatMessage = {
      id: userMsgId,
      sessionId: currentSessionId,
      sender: 'user',
      text: prompt,
      sentiment: 'neutral',
      timestamp: timeStr,
      metadata: {
        sessionId: currentSessionId,
      },
    };
    setChatMessages((prev) => [...prev, userMsg]);
    SupabaseService.syncChatMessage(userMsg);

    // Conversational confirmation to deposit borrowed funds into current balance
    const cleanLowerPrompt = prompt.toLowerCase().trim();
    const isDepositConfirmation =
      (cleanLowerPrompt.includes('deposit') || cleanLowerPrompt.includes('daal do') || cleanLowerPrompt.includes('dal do') || cleanLowerPrompt.includes('add kardo') || cleanLowerPrompt === 'yes' || cleanLowerPrompt === 'haa' || cleanLowerPrompt === 'ha' || cleanLowerPrompt.startsWith('yes ') || cleanLowerPrompt.startsWith('haa ')) &&
      (cleanLowerPrompt.includes('balance') || cleanLowerPrompt.includes('account') || cleanLowerPrompt.includes('current') || cleanLowerPrompt === 'yes' || cleanLowerPrompt === 'haa' || cleanLowerPrompt === 'ha' || cleanLowerPrompt.includes('kardo'));

    const pendingBorrowMsg = [...chatMessages].reverse().find(
      (m) => m.metadata?.borrowDepositPrompt && !m.metadata.borrowDepositPrompt.confirmed && !m.metadata.borrowDepositPrompt.dismissed
    );

    if (isDepositConfirmation && pendingBorrowMsg && pendingBorrowMsg.metadata?.borrowDepositPrompt) {
      const p = pendingBorrowMsg.metadata.borrowDepositPrompt;
      confirmBorrowDeposit(p.amount, p.counterparty, pendingBorrowMsg.id);
      setIsAuditing(false);
      return {
        merchant: `Borrowed from ${p.counterparty}`,
        amount: p.amount,
        category: 'Loan / Inflow',
        transactionType: 'income',
        isDiscretionary: false,
        isOverLimit: false,
        exceededBy: 0,
        remainingSafeToSpend: safeToSpendRemaining,
        sentiment: 'praise',
        caCommentary: `Right away, Sir! ₹${p.amount.toLocaleString()} has been deposited into your Current Liquid Balance.`,
        tomorrowAdjustedCap: userSettings.dailySpendLimit,
      };
    }

    let result: ParseExpenseResult;

    const totalOwedByUser = debts
      .filter((d) => d.debtType === 'owed_by_user' && !d.isSettled)
      .reduce((sum, d) => sum + d.amount, 0);

    const totalOwedToUser = debts
      .filter((d) => d.debtType === 'owed_to_user' && !d.isSettled)
      .reduce((sum, d) => sum + d.amount, 0);

    // Compute spending aggregates by category
    const todayStr2 = now.toISOString().split('T')[0];
    const weekAgoStr = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const monthAgoStr = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const buildAgg = (txList: typeof transactions) => {
      const byCat: Record<string, number> = {};
      let total = 0;
      for (const tx of txList) {
        if (tx.transactionType !== 'expense') continue;
        total += tx.amount;
        byCat[tx.category] = (byCat[tx.category] || 0) + tx.amount;
      }
      return {
        total,
        byCategory: Object.entries(byCat)
          .sort((a, b) => b[1] - a[1])
          .map(([category, total]) => ({ category, total })),
      };
    };

    const txToday = transactions.filter((t) => t.date === todayStr2);
    const txWeek = transactions.filter((t) => t.date >= weekAgoStr);
    const txMonth = transactions.filter((t) => t.date >= monthAgoStr);

    const hhCategoryKeywords = [
      'household', 'rent', 'grocer', 'blinkit', 'zepto', 'instamart',
      'ration', 'rashan', 'milk', 'doodh', 'utility', 'utilities',
      'electricity', 'bijli', 'gas', 'cylinder', 'wifi', 'maid', 'maintenance', 'sabzi', 'vegetable'
    ];
    const hhSpentThisMonth = txMonth
      .filter((t) => t.transactionType === 'expense')
      .filter((t) => {
        const cat = (t.category || '').toLowerCase();
        const merch = (t.merchant || '').toLowerCase();
        return hhCategoryKeywords.some((k) => cat.includes(k) || merch.includes(k)) || !t.isDiscretionary;
      })
      .reduce((sum, t) => sum + t.amount, 0);

    const hhBudget = userSettings.householdFundTarget ?? 10000;
    const hhRemaining = Math.max(0, hhBudget - hhSpentThisMonth);

    const financialContext = {
      salary: userSettings.monthlySalary,
      fixedBills: userSettings.householdFundTarget,
      dailyLimit: userSettings.dailySpendLimit,
      spentToday,
      currentBalance,
      availableLiquidCash,
      totalSavedGoals,
      transactionsCount: transactions.length,
      recentTransactions: transactions.slice(0, 10).map((t) => ({
        merchant: t.merchant,
        amount: t.amount,
        category: t.category,
        date: t.date,
      })),
      goals: goals.map((g) => ({
        name: g.name,
        targetAmount: g.targetAmount,
        currentAmount: g.currentAmount,
        targetDate: g.targetDate,
        monthlyAllocation: g.monthlyAllocation,
        progressPercent: Math.round((g.currentAmount / g.targetAmount) * 100),
      })),
      debtsSummary: {
        totalOwedByUser, // Humpe kitna karza hai (hume dena hai)
        totalOwedToUser, // Hume kitna paisa lena hai (lent to others)
        activeDebts: debts
          .filter((d) => !d.isSettled)
          .map((d) => ({
            title: d.title,
            amount: d.amount,
            debtType: d.debtType,
            dueDate: d.dueDate || 'Flexible',
            notes: d.notes,
          })),
      },
      householdSummary: {
        budget: hhBudget,
        spent: hhSpentThisMonth,
        remaining: hhRemaining,
      },
      spendingAggregates: {
        today: buildAgg(txToday),
        week: buildAgg(txWeek),
        month: buildAgg(txMonth),
      },
    };

    // Prepare multi-turn conversational history for RAG and pronoun resolution
    const recentChatHistory = chatMessages.slice(-8).map((m) => ({
      sender: m.sender,
      text: m.text,
    }));

    try {
      // Call Next.js API route with optional custom API key & financial context & multi-turn history
      const response = await fetch('/api/gemini/parse', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(userSettings.geminiApiKey ? { 'x-gemini-key': userSettings.geminiApiKey } : {})
        },
        body: JSON.stringify({
          prompt,
          dailyLimit: userSettings.dailySpendLimit,
          spentToday,
          apiKey: userSettings.geminiApiKey,
          context: financialContext,
          chatHistory: recentChatHistory,
        }),
      });

      if (response.ok) {
        result = await response.json();
      } else {
        result = parseExpenseWithRules(prompt, userSettings.dailySpendLimit, spentToday, financialContext, recentChatHistory);
      }
    } catch (err) {
      console.warn('API error, using local CA parser:', err);
      result = parseExpenseWithRules(prompt, userSettings.dailySpendLimit, spentToday, financialContext, recentChatHistory);
    }

    // Ensure withdraw_goal is treated as income credit to liquid checking
    if (result.autoAction && result.autoAction.type === 'withdraw_goal') {
      result.transactionType = 'income';
      result.category = 'Savings & Goals';
      result.isDiscretionary = false;
      result.amount = Math.abs(result.amount);
    }

    // Enforce Household Budget Overspend Guardrail Deterministically
    const isHhPrompt =
      cleanLowerPrompt.includes('household') ||
      cleanLowerPrompt.includes('house hold') ||
      cleanLowerPrompt.includes('grocer') ||
      cleanLowerPrompt.includes('blinkit') ||
      cleanLowerPrompt.includes('zepto') ||
      cleanLowerPrompt.includes('instamart') ||
      cleanLowerPrompt.includes('rashan') ||
      cleanLowerPrompt.includes('ration') ||
      cleanLowerPrompt.includes('rent') ||
      cleanLowerPrompt.includes('kiraya') ||
      cleanLowerPrompt.includes('bill') ||
      cleanLowerPrompt.includes('utility') ||
      cleanLowerPrompt.includes('utilities') ||
      cleanLowerPrompt.includes('doodh') ||
      cleanLowerPrompt.includes('milk') ||
      cleanLowerPrompt.includes('sabzi') ||
      cleanLowerPrompt.includes('vegetable') ||
      (result.category && (
        result.category.toLowerCase().includes('household') ||
        result.category.toLowerCase().includes('mandatory') ||
        result.category.toLowerCase().includes('utilities') ||
        result.category.toLowerCase().includes('bills')
      ));

    if (isHhPrompt && result.amount > 0) {
      result.isDiscretionary = false;
      const hhBudget = financialContext.householdSummary.budget;
      const currentHhSpent = financialContext.householdSummary.spent;
      const projectedHhTotal = currentHhSpent + result.amount;

      if (projectedHhTotal > hhBudget) {
        result.isOverLimit = true;
        result.exceededBy = projectedHhTotal - hhBudget;
        result.sentiment = 'scold';
        result.breachCode = 'HOUSEHOLD-BREACH';
        if (!result.caCommentary.includes('PROTOCOL BREACH') && !result.caCommentary.includes('EXCEEDS')) {
          result.caCommentary = `🚨 STRICT HOUSEHOLD PROTOCOL BREACH, Sir!\n\nYou have logged ₹${result.amount.toLocaleString()} for ${result.category} (${result.merchant}). This surges your monthly household spend to ₹${projectedHhTotal.toLocaleString()}, which violently EXCEEDS your strict monthly household ceiling of ₹${hhBudget.toLocaleString()} by ₹${result.exceededBy.toLocaleString()}!\n\n🛡️ MANDATORY RESTRAINT DIRECTIVE:\nHousehold overhead is non-negotiable and strictly capped. Any further leakage here directly threatens your savings goals and debt clearance milestones! Freeze non-essential provisions immediately, Sir!`;
        }
      }
    }

    // Inquiries and conversational prompts with amount === 0 must never be flagged as overLimit or breachCode
    if (result.amount === 0) {
      result.isOverLimit = false;
      result.exceededBy = 0;
      result.breachCode = undefined;
    }

    const isHypotheticalPrompt =
      prompt.toLowerCase().includes('what if') ||
      prompt.toLowerCase().includes('suppose') ||
      prompt.toLowerCase().includes('hypothetical') ||
      prompt.toLowerCase().includes('agar main') ||
      prompt.toLowerCase().includes('agar mai') ||
      prompt.toLowerCase().includes('kya hoga') ||
      result.merchant?.toLowerCase().includes('simulat') ||
      result.merchant?.toLowerCase().includes('hypothetical') ||
      result.category?.toLowerCase().includes('simulation');

    // 1.5 Update Session Title dynamically like Gemini
    setSessions((prev) =>
      prev.map((s) => {
        if (s.id === currentSessionId) {
          const isGeneric =
            !s.title ||
            s.title.startsWith('Briefing') ||
            s.title.startsWith('Financial Briefing') ||
            s.title.startsWith('Session') ||
            s.title === 'Current Session' ||
            s.title.includes('(');
          if (isGeneric) {
            const geminiHeading = generateGeminiSessionTitle(prompt, result.merchant, result.category);
            return {
              ...s,
              title: geminiHeading,
              lastActiveAt: new Date().toISOString(),
            };
          }
        }
        return s;
      })
    );

    // =========================================================================
    // STRICT FINANCIAL INTEGRITY & EDGE CASE PRE-VALIDATION PIPELINE
    // =========================================================================

    // 1. Fat-Finger Typographical Anomaly Intercept (> ₹1,00,000 for standard expense without confirmation)
    const isConfirmationPrompt =
      cleanLowerPrompt.includes('confirm') ||
      cleanLowerPrompt.includes('confirm ') ||
      cleanLowerPrompt === 'yes' ||
      cleanLowerPrompt === 'ha' ||
      cleanLowerPrompt === 'haa' ||
      cleanLowerPrompt.startsWith('yes ') ||
      cleanLowerPrompt.startsWith('ha ');

    if (
      result.amount >= 100000 &&
      result.transactionType === 'expense' &&
      !isConfirmationPrompt &&
      result.category !== 'Household Mandatory' &&
      !cleanLowerPrompt.includes('rent') &&
      !cleanLowerPrompt.includes('kiraya')
    ) {
      const suspiciousAmt = result.amount;
      result.amount = 0;
      result.sentiment = 'scold';
      result.isOverLimit = false;
      result.caCommentary = `Security Intercept, Sir! 🛡️✋ An expenditure of ₹${suspiciousAmt.toLocaleString()} for ${result.merchant} (${result.category}) appears to be an unintended typographical anomaly. To safeguard your ledger against accidental entries, this transaction has NOT been recorded. If genuinely intended, please reply: "Confirm ₹${suspiciousAmt.toLocaleString()} for ${result.merchant}".`;
      result.autoActions = [];
      result.autoAction = undefined;
    }

    // 2. Goal Over-Withdrawal Intercept (Prevent withdrawing more than exists in vault or fake money credit)
    const withdrawAct = (result.autoActions || (result.autoAction ? [result.autoAction] : [])).find((a) => a.type === 'withdraw_goal');
    const isWithdrawAttempt =
      withdrawAct !== undefined ||
      cleanLowerPrompt.includes('withdraw') ||
      cleanLowerPrompt.includes('nikaal') ||
      cleanLowerPrompt.includes('nikal');

    if (isWithdrawAttempt) {
      const targetName = (withdrawAct?.goalWithdrawal?.goalName || result.merchant || '').toLowerCase();
      const targetGoal = goals.find((g) => {
        const gName = g.name.toLowerCase();
        if (isGoalMatch(g.name, targetName)) return true;
        if (cleanLowerPrompt.includes(gName)) return true;
        const words = gName.split(/[\s\-_\/]+/).filter((w) => w.length > 2);
        return words.some((w) => cleanLowerPrompt.includes(w));
      });
      const reqWithdrawAmount = Math.abs(withdrawAct?.goalWithdrawal?.amount || result.amount || 0);

      if (targetGoal) {
        if (targetGoal.currentAmount <= 0) {
          result.amount = 0;
          result.sentiment = 'scold';
          result.isOverLimit = false;
          result.caCommentary = `Protocol Abort, Sir! 🛡️✋ Your '${targetGoal.name}' vault currently has a balance of ₹0. You cannot withdraw funds from an empty reserve! Transaction halted.`;
          result.autoActions = [];
          result.autoAction = undefined;
        } else if (reqWithdrawAmount > targetGoal.currentAmount) {
          result.amount = 0;
          result.sentiment = 'scold';
          result.isOverLimit = false;
          result.caCommentary = `Protocol Abort, Sir! 🛡️✋ You only have ₹${targetGoal.currentAmount.toLocaleString()} saved in your '${targetGoal.name}' vault. You cannot withdraw ₹${reqWithdrawAmount.toLocaleString()} from a reserve that lacks those funds! (Maximum available: ₹${targetGoal.currentAmount.toLocaleString()}). Transaction halted — zero funds have been transferred.`;
          result.autoActions = [];
          result.autoAction = undefined;
        }
      } else if (withdrawAct || cleanLowerPrompt.includes('withdraw') || cleanLowerPrompt.includes('nikaal') || cleanLowerPrompt.includes('nikal')) {
        result.amount = 0;
        result.sentiment = 'scold';
        result.isOverLimit = false;
        result.caCommentary = `Goal Not Found, Sir! 🛡️✋ I could not locate an active savings vault matching '${targetName || prompt}'. Active vaults: ${goals.map((g) => g.name).join(', ') || 'None'}. Transaction halted.`;
        result.autoActions = [];
        result.autoAction = undefined;
      }
    }

    // 3. Goal Over-Allocation Intercept (Prevent depositing more into goals than available liquid checking cash)
    const allocAct = (result.autoActions || (result.autoAction ? [result.autoAction] : [])).find((a) => a.type === 'allocate_goal');
    const isAllocAttempt =
      allocAct !== undefined ||
      ((cleanLowerPrompt.includes('goal') || cleanLowerPrompt.includes('saving') || cleanLowerPrompt.includes('vault')) &&
       (cleanLowerPrompt.includes('deposit') || cleanLowerPrompt.includes('allocate') || cleanLowerPrompt.includes('daal') || cleanLowerPrompt.includes('dal') || cleanLowerPrompt.includes('jama')));

    if (isAllocAttempt) {
      const reqAllocAmount = Math.abs(allocAct?.goalAllocation?.amount || result.amount || 0);
      if (reqAllocAmount > currentBalance) {
        result.amount = 0;
        result.sentiment = 'scold';
        result.isOverLimit = false;
        result.caCommentary = `Insolvency Warning, Sir! 🛡️✋ Your Current Liquid Balance is only ₹${currentBalance.toLocaleString()}. You cannot allocate ₹${reqAllocAmount.toLocaleString()} into '${allocAct?.goalAllocation?.goalName || result.merchant}' without plunging your checking account into an illegal negative deficit! Allocation cancelled.`;
        result.autoActions = [];
        result.autoAction = undefined;
      }
    }

    // 4. Negative Amount Rejection
    if (result.amount < 0 || (cleanLowerPrompt.includes('-') && /(?:^|\s)-\s*(?:₹|rs\.?|inr)?\s*\d+/i.test(cleanLowerPrompt))) {
      result.amount = 0;
      result.sentiment = 'scold';
      result.isOverLimit = false;
      result.caCommentary = `Invalid Transaction, Sir! 🛡️✋ Negative expenditure amounts are mathematically prohibited in your ledger. Please log a positive monetary figure.`;
      result.autoActions = [];
      result.autoAction = undefined;
    }

    // 5. Universal Abort & Halt Safeguard:
    // If the CA commentary or sentiment explicitly stated that the transaction was halted, aborted, cancelled, or intercepted,
    // NEVER allow any positive amount, ledger insertion, or auto-action execution!
    const commentaryLower = (result.caCommentary || '').toLowerCase();
    const isExplicitlyHalted =
      commentaryLower.includes('transaction halted') ||
      commentaryLower.includes('protocol abort') ||
      commentaryLower.includes('insolvency warning') ||
      commentaryLower.includes('security intercept') ||
      commentaryLower.includes('invalid transaction') ||
      commentaryLower.includes('zero funds have been transferred') ||
      commentaryLower.includes('transaction rok diya gaya') ||
      commentaryLower.includes('allocation cancelled') ||
      commentaryLower.includes('allocation cancel') ||
      commentaryLower.includes('cannot withdraw') ||
      commentaryLower.includes('withdraw nahi kar sakte') ||
      commentaryLower.includes('typographical anomaly') ||
      commentaryLower.includes('mathematically prohibited');

    if (isExplicitlyHalted) {
      result.amount = 0;
      result.autoActions = [];
      result.autoAction = undefined;
      result.isOverLimit = false;
      result.exceededBy = 0;
    }

    // 3. Execute J.A.R.V.I.S. Actions (Full App Navigation & Control)
    const actionsToExecute: AutoAction[] = isExplicitlyHalted
      ? []
      : (result.autoActions && result.autoActions.length > 0)
        ? result.autoActions
        : (result.autoAction ? [result.autoAction] : []);

    const settleActions = actionsToExecute.filter((a) => a.type === 'settle_debt');
    const hasSettleActions = settleActions.length > 0;

    // 2. Add New Transaction to Journal (only if amount > 0, NOT a simulation, NO debt settlements handled individually, and NOT explicitly halted)
    if (result.amount > 0 && !isHypotheticalPrompt && !hasSettleActions && !isExplicitlyHalted) {
      const newTx: Transaction = {
        id: `tx-${Date.now()}`,
        userId: userSettings.userId,
        rawPrompt: prompt,
        merchant: result.merchant,
        amount: Math.abs(result.amount),
        category: result.category,
        transactionType: result.transactionType,
        isDiscretionary: result.isDiscretionary,
        isOverLimit: result.isOverLimit,
        overLimitAmount: result.exceededBy,
        date: todayStr,
        time: timeStr,
        createdAt: now.toISOString(),
      };
      setTransactions((prev) => [newTx, ...prev]);
      SupabaseService.syncTransactionInsert(newTx);

      // Auto-enforce amortized daily limit reduction on overspend
      if (result.isOverLimit && (result.exceededBy || 0) > 0) {
        const overDeficit = result.exceededBy || 0;
        const amortizedDeduction = Math.round(overDeficit / remainingCycleDays);
        const newDailyLimit = Math.max(100, (result.tomorrowAdjustedCap || (userSettings.dailySpendLimit - amortizedDeduction)));
        if (newDailyLimit < userSettings.dailySpendLimit) {
          updateUserSettings({
            dailySpendLimit: newDailyLimit,
          });
        }
      }
    }

    // 3.1 Handle settle_debt actions (creates SEPARATE, DISTINCT transactions for each settled debt)
    if (hasSettleActions) {
      const newTxList: Transaction[] = [];
      setDebts((prevDebts) => {
        const currentList = [...prevDebts];
        for (let i = 0; i < settleActions.length; i++) {
          const act = settleActions[i];
          const query = (act.settleCounterparty || act.debtTitle || '').toLowerCase().trim();
          const payAmount = act.debtAmount;

          const idx = currentList.findIndex((d) => {
            if (d.isSettled) return false;
            return isCounterpartyMatch(d.title, query);
          });

          if (idx !== -1) {
            const debt = currentList[idx];
            const actualPay = typeof payAmount === 'number' && payAmount > 0 ? Math.min(payAmount, debt.amount) : debt.amount;
            const isPartial = actualPay < debt.amount;
            const remaining = Math.max(0, debt.amount - actualPay);

            const updatedDebt: Debt = {
              ...debt,
              amount: remaining,
              isSettled: remaining === 0,
              notes: isPartial
                ? `${debt.notes ? debt.notes + ' | ' : ''}Paid ₹${actualPay.toLocaleString()} on ${todayStr} (Remaining: ₹${remaining.toLocaleString()})`
                : (debt.notes ? `${debt.notes} | Settled in full on ${todayStr}` : `Settled in full on ${todayStr}`),
            };

            currentList[idx] = updatedDebt;
            SupabaseService.syncDebtUpsert(updatedDebt);

            const txTime = new Date();
            const newTx: Transaction = {
              id: `tx-${Date.now()}-${i}-${Math.random().toString(36).slice(2, 6)}`,
              userId: userSettings.userId,
              rawPrompt: isPartial
                ? `Partial Debt Payment: ₹${actualPay.toLocaleString()} for ${debt.title}`
                : `Debt Payment: ₹${actualPay.toLocaleString()} for ${debt.title}`,
              merchant: debt.title,
              amount: actualPay,
              category: debt.debtType === 'owed_to_user' ? 'Debt Recovery / Refund' : 'Debt Repayment',
              transactionType: debt.debtType === 'owed_to_user' ? 'income' : 'expense',
              isDiscretionary: false,
              isOverLimit: false,
              overLimitAmount: 0,
              date: todayStr,
              time: txTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              createdAt: txTime.toISOString(),
            };
            newTxList.push(newTx);
            SupabaseService.syncTransactionInsert(newTx);
          } else {
            // Debt counterparty not yet in active list, still record separate individual transaction if amount specified
            if (typeof payAmount === 'number' && payAmount > 0) {
              const txTime = new Date();
              const counterpartyName = query ? (query.charAt(0).toUpperCase() + query.slice(1)) : 'Debt Repayment';
              const newTx: Transaction = {
                id: `tx-${Date.now()}-${i}-${Math.random().toString(36).slice(2, 6)}`,
                userId: userSettings.userId,
                rawPrompt: `Debt Payment: ₹${payAmount.toLocaleString()} for ${counterpartyName}`,
                merchant: counterpartyName,
                amount: payAmount,
                category: 'Debt Repayment',
                transactionType: 'expense',
                isDiscretionary: false,
                isOverLimit: false,
                overLimitAmount: 0,
                date: todayStr,
                time: txTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                createdAt: txTime.toISOString(),
              };
              newTxList.push(newTx);
              SupabaseService.syncTransactionInsert(newTx);
            }
          }
        }
        return currentList;
      });

      if (newTxList.length > 0) {
        setTransactions((prev) => [...newTxList, ...prev]);
      }
    }

    // 3.2 Execute non-settle actions
    for (const action of actionsToExecute) {
      if (action.type === 'settle_debt') continue; // Handled in batch above
      if (action.type === 'navigate' && action.navigateTarget) {
        setActiveTab(action.navigateTarget);
      } else if (action.type === 'update_budget' && action.budgetUpdate) {
        const bu = action.budgetUpdate;
        const newSalary = bu.salary !== undefined ? bu.salary : userSettings.monthlySalary;
        const newFixed = bu.fixedBills !== undefined ? bu.fixedBills : userSettings.householdFundTarget;
        const debtBudget = totalOwedByUser > 0 ? Math.min(totalOwedByUser, 7000) : 0;
        const savingsBudget = userSettings.savingsTarget !== undefined ? userSettings.savingsTarget : 5000;
        const freeCash = Math.max(0, newSalary - newFixed - debtBudget - savingsBudget);
        const calculatedDaily = Math.max(100, Math.round(freeCash / 30));
        const newDaily = bu.dailyLimit !== undefined ? bu.dailyLimit : calculatedDaily;

        updateUserSettings({
          monthlySalary: newSalary,
          householdFundCurrent: newFixed,
          householdFundTarget: newFixed,
          dailySpendLimit: newDaily,
        });
      } else if (action.type === 'create_receivable') {
        const title = action.debtTitle || 'Roommate (Rent Share)';
        const debtAmt = action.debtAmount || 5000;
        setDebts((prev) => {
          const idx = prev.findIndex(
            (d) => !d.isSettled && d.debtType === 'owed_to_user' && isCounterpartyMatch(d.title, title)
          );
          if (idx !== -1) {
            const updated: Debt = {
              ...prev[idx],
              amount: prev[idx].amount + debtAmt,
              notes: `${prev[idx].notes ? prev[idx].notes + ' | ' : ''}Added ₹${debtAmt.toLocaleString()} on ${todayStr}`,
            };
            const copy = [...prev];
            copy[idx] = updated;
            SupabaseService.syncDebtUpsert(updated);
            return copy;
          }
          const autoDebt: Debt = {
            id: `debt-${Date.now()}`,
            userId: userSettings.userId,
            title,
            amount: debtAmt,
            debtType: 'owed_to_user',
            dueDate: action.dueDate || 'On Repayment',
            isSettled: false,
            notes: action.note || `Lent to ${title}. Recover once paid.`,
          };
          SupabaseService.syncDebtUpsert(autoDebt);
          return [autoDebt, ...prev];
        });
      } else if (action.type === 'create_payable') {
        const title = action.debtTitle || 'Friend Loan (Payable)';
        const debtAmt = action.debtAmount || 10000;
        setDebts((prev) => {
          const idx = prev.findIndex(
            (d) => !d.isSettled && d.debtType === 'owed_by_user' && isCounterpartyMatch(d.title, title)
          );
          if (idx !== -1) {
            const updated: Debt = {
              ...prev[idx],
              amount: prev[idx].amount + debtAmt,
              notes: `${prev[idx].notes ? prev[idx].notes + ' | ' : ''}Added ₹${debtAmt.toLocaleString()} on ${todayStr}`,
            };
            const copy = [...prev];
            copy[idx] = updated;
            SupabaseService.syncDebtUpsert(updated);
            return copy;
          }
          const autoDebt: Debt = {
            id: `debt-${Date.now()}`,
            userId: userSettings.userId,
            title,
            amount: debtAmt,
            debtType: 'owed_by_user',
            dueDate: action.dueDate || 'On Pay Day',
            isSettled: false,
            notes: action.note || `Borrowed from ${title}.`,
          };
          SupabaseService.syncDebtUpsert(autoDebt);
          return [autoDebt, ...prev];
        });
      } else if (action.type === 'create_goal' && action.goalData) {
        addGoal({
          name: action.goalData.name,
          targetAmount: action.goalData.targetAmount,
          currentAmount: 0,
          monthlyAllocation: action.goalData.monthlyAllocation || Math.round(action.goalData.targetAmount / 12),
          isShielded: true,
          milestones: [
            { id: `m1-${Date.now()}`, title: 'First 25% Deposit', status: 'current' },
            { id: `m2-${Date.now()}`, title: 'Halfway Mark', status: 'pending' },
            { id: `m3-${Date.now()}`, title: 'Goal Complete', status: 'pending' }
          ]
        });
      } else if (action.type === 'allocate_goal') {
        const alloc = action.goalAllocation;
        const targetName = (alloc?.goalName || result.merchant || '').toLowerCase();
        const allocAmount = alloc?.amount || result.amount;

        if (allocAmount > 0) {
          if (allocAmount > currentBalance) {
            console.warn(`[J.A.R.V.I.S. Guard] Prevented unbacked allocation of ₹${allocAmount} (balance: ₹${currentBalance})`);
            continue;
          }
          setGoals((prev) => {
            const idx = prev.findIndex((g) => isGoalMatch(g.name, targetName));
            if (idx !== -1) {
              const g = prev[idx];
              const updated = g.currentAmount + allocAmount;
              const updatedGoal: SavingsGoal = {
                ...g,
                currentAmount: updated,
                milestones: g.milestones.map((m) => {
                  if (m.title.includes('25%') && updated >= g.targetAmount * 0.25) return { ...m, status: 'achieved' };
                  if (m.title.includes('Half') && updated >= g.targetAmount * 0.5) return { ...m, status: 'achieved' };
                  if (updated >= g.targetAmount) return { ...m, status: 'achieved' };
                  return m;
                }),
              };
              const copy = [...prev];
              copy[idx] = updatedGoal;
              SupabaseService.syncGoalUpsert(updatedGoal);
              return copy;
            } else {
              const newGoal: SavingsGoal = {
                id: `goal-${Date.now()}`,
                userId: userSettings.userId,
                name: alloc?.goalName || result.merchant || 'Savings Goal',
                targetAmount: allocAmount * 4,
                currentAmount: allocAmount,
                monthlyAllocation: allocAmount,
                isShielded: true,
                milestones: [
                  { id: `m1-${Date.now()}`, title: 'First 25% Deposit', status: 'current' },
                  { id: `m2-${Date.now()}`, title: 'Halfway Mark', status: 'pending' },
                  { id: `m3-${Date.now()}`, title: 'Goal Complete', status: 'pending' }
                ]
              };
              SupabaseService.syncGoalUpsert(newGoal);
              return [...prev, newGoal];
            }
          });
        }
      } else if (action.type === 'withdraw_goal') {
        const withdraw = action.goalWithdrawal;
        const targetName = (withdraw?.goalName || result.merchant || '').toLowerCase();
        const withdrawAmount = Math.abs(withdraw?.amount || result.amount);

        if (withdrawAmount > 0) {
          setGoals((prev) =>
            prev.map((g) => {
              if (isGoalMatch(g.name, targetName)) {
                if (withdrawAmount > g.currentAmount) {
                  console.warn(`[J.A.R.V.I.S. Guard] Prevented over-withdrawal of ₹${withdrawAmount} from '${g.name}' (current: ₹${g.currentAmount})`);
                  return g;
                }
                const updated = Math.max(0, g.currentAmount - withdrawAmount);
                const updatedGoal: SavingsGoal = {
                  ...g,
                  currentAmount: updated,
                  milestones: g.milestones.map((m) => {
                    if (m.title.includes('25%') && updated < g.targetAmount * 0.25) return { ...m, status: 'pending' };
                    if (m.title.includes('Half') && updated < g.targetAmount * 0.5) return { ...m, status: 'pending' };
                    if (updated < g.targetAmount) return { ...m, status: 'pending' };
                    return m;
                  }),
                };
                SupabaseService.syncGoalUpsert(updatedGoal);
                return updatedGoal;
              }
              return g;
            })
          );
        }
      } else if (action.type === 'offset_debt') {
        // Offset against existing dues: remove temporary receivable and update net due
        const filtered = debts.filter(
          (d) => !d.title.includes('Roommate (Rent Share)') && !d.title.includes('Net Due')
        );
        const offsetDebt: Debt = {
          id: `debt-${Date.now()}`,
          userId: userSettings.userId,
          title: action?.debtTitle || 'Roommate Net Due (After ₹5k Rent Offset)',
          amount: action?.debtAmount || 15000,
          debtType: 'owed_by_user',
          dueDate: 'After Pay Day (8th Sep)',
          isSettled: false,
          notes:
            action?.note ||
            'Deducted ₹5,000 rent share from ₹20,000 prior dues. Remaining balance to pay: ₹15,000.',
        };
        setDebts([offsetDebt, ...filtered]);
        SupabaseService.syncDebtUpsert(offsetDebt);
      } else if (action.type === 'flip_last_debt') {
        flipLastDebt();
      } else if (action.type === 'edit_last_transaction') {
        if (action.transactionUpdate) {
          editLastTransaction(action.transactionUpdate);
        } else if (result.amount > 0) {
          editLastTransaction({
            amount: result.amount,
            merchant: result.merchant || undefined,
            category: result.category || undefined,
          });
        }
      } else if (action.type === 'edit_last_debt') {
        if (debts.length > 0 && action.debtUpdate) {
          editDebt(debts[0].id, action.debtUpdate);
        }
      }
    }

    // Check if the user borrowed funds (creating a payable)
    const isBorrowing =
      actionsToExecute.some((a) => a.type === 'create_payable') ||
      cleanLowerPrompt.includes('borrow') ||
      (cleanLowerPrompt.includes('lent') && (cleanLowerPrompt.includes('from') || cleanLowerPrompt.includes('more from'))) ||
      (cleanLowerPrompt.includes('se') && (cleanLowerPrompt.includes('liye') || cleanLowerPrompt.includes('udhar')));

    let borrowDepositPromptData: BorrowDepositPrompt | undefined = undefined;
    if (isBorrowing) {
      const payableAct = actionsToExecute.find((a) => a.type === 'create_payable');
      const bAmt = payableAct?.debtAmount || Math.abs(result.amount) || 2000;
      const bParty = payableAct?.debtTitle || result.merchant || 'Lender';
      borrowDepositPromptData = {
        amount: bAmt,
        counterparty: bParty,
        confirmed: false,
      };
      if (!result.caCommentary.toLowerCase().includes('deposit this') && !result.caCommentary.toLowerCase().includes('deposit in current balance') && !result.caCommentary.toLowerCase().includes('deposit kar')) {
        result.caCommentary += `\n\nSir, would you like me to deposit this borrowed ₹${bAmt.toLocaleString()} into your current liquid balance?`;
      }
    }

    // 4. Add AI Chartered Accountant response bubble
    const aiMsgId = `ai-${Date.now()}`;
    const aiMsg: ChatMessage = {
      id: aiMsgId,
      sessionId: currentSessionId,
      sender: 'ai',
      text: result.caCommentary,
      sentiment: result.sentiment,
      timestamp: timeStr,
      metadata: {
        sessionId: currentSessionId,
        amount: result.amount,
        merchant: result.merchant,
        category: result.category,
        transactionType: result.transactionType,
        isOverLimit: result.isOverLimit,
        breachCode: result.breachCode,
        quotaConsumedPercent: Math.min(
          100,
          Math.round(((spentToday + (result.isDiscretionary ? result.amount : 0)) / userSettings.dailySpendLimit) * 100)
        ),
        remainingSafeToSpend: result.remainingSafeToSpend,
        tomorrowAdjustedCap: result.tomorrowAdjustedCap,
        exceededBy: result.exceededBy,
        amortizationRule: result.isOverLimit ? 'T+1 AMORTIZATION APPLIED' : undefined,
        autoAction: result.autoAction,
        borrowDepositPrompt: borrowDepositPromptData,
      },
    };
    setChatMessages((prev) => [...prev, aiMsg]);
    SupabaseService.syncChatMessage(aiMsg);

    // Trigger J.A.R.V.I.S. Audio, Native Push & HUD Banner Alerts
    if (result.breachCode === 'HOUSEHOLD-BREACH') {
      jarvisNotificationService.sendHouseholdBreachNotification(
        result.amount,
        result.exceededBy || 0
      );
    } else if (result.isOverLimit) {
      jarvisNotificationService.sendDailyBreachNotification(
        result.amount,
        result.exceededBy || 0
      );
    } else if (
      result.sentiment === 'praise' &&
      (
        cleanLowerPrompt.includes('bachaye') ||
        cleanLowerPrompt.includes('saved') ||
        cleanLowerPrompt.includes('save') ||
        actionsToExecute.some((a) => a.type === 'allocate_goal') ||
        result.category?.toLowerCase().includes('saving')
      )
    ) {
      jarvisNotificationService.sendSavingsPraiseNotification(
        result.amount || 500,
        result.merchant || 'Savings Vault'
      );
    }

    // Update active session metadata
    setSessions((prev) =>
      prev.map((s) => {
        if (s.id === currentSessionId) {
          const isGeneric = s.title.startsWith('Briefing') || s.title.startsWith('Initial') || s.title.startsWith('Current Protocol');
          const newTitle = isGeneric && result.merchant && result.merchant !== 'Expense'
            ? `${result.merchant} & Audit`
            : s.title;
          return { ...s, title: newTitle, lastActiveAt: new Date().toISOString() };
        }
        return s;
      })
    );

    setIsAuditing(false);
    return result;
  };

  const deleteTransaction = (transactionId: string) => {
    setTransactions((prev) => prev.filter((tx) => tx.id !== transactionId));
    SupabaseService.syncTransactionDelete(transactionId);
  };

  const editTransaction = (transactionId: string, updates: Partial<Transaction>) => {
    let updatedTx: Transaction | null = null;
    setTransactions((prev) =>
      prev.map((tx) => {
        if (tx.id === transactionId) {
          updatedTx = { ...tx, ...updates };
          return updatedTx;
        }
        return tx;
      })
    );
    if (updatedTx) {
      SupabaseService.syncTransactionInsert(updatedTx);
    }
  };

  const editDebt = (debtId: string, updates: Partial<Debt>) => {
    let updatedDebt: Debt | null = null;
    setDebts((prev) =>
      prev.map((d) => {
        if (d.id === debtId) {
          updatedDebt = { ...d, ...updates };
          return updatedDebt;
        }
        return d;
      })
    );
    if (updatedDebt) {
      SupabaseService.syncDebtUpsert(updatedDebt);
    }
  };

  const flipDebtDirection = (debtId: string) => {
    const debt = debts.find((d) => d.id === debtId);
    if (!debt) return;
    const newType: DebtType = debt.debtType === 'owed_by_user' ? 'owed_to_user' : 'owed_by_user';
    const newTitle = debt.title
      .replace(/\(Payable\)/i, '(Receivable)')
      .replace(/\(Receivable\)/i, '(Payable)');

    const updated: Debt = {
      ...debt,
      debtType: newType,
      title: newTitle,
    };
    setDebts((prev) => prev.map((d) => (d.id === debtId ? updated : d)));
    SupabaseService.syncDebtUpsert(updated);
  };

  const flipLastDebt = () => {
    if (debts.length === 0) return;
    flipDebtDirection(debts[0].id);
  };

  const editLastTransaction = (updates: Partial<Transaction>) => {
    if (transactions.length === 0) return;
    editTransaction(transactions[0].id, updates);
  };

  const resetTodaySpending = () => {
    setTransactions((prev) => prev.filter((tx) => tx.date !== todayStr));
  };

  const clearChatMessages = () => {
    setChatMessages(initialChatMessages);
  };


  return (
    <FinanceContext.Provider
      value={{
        activeTab,
        setActiveTab,
        userSettings,
        payCycleInfo,
        updateUserSettings,
        toggleStrictMode,
        transactions,
        goals,
        debts,
        chatMessages,
        sessions,
        currentSessionId,
        createNewSession,
        switchSession,
        deleteSession,
        clearAllSessions,
        processBankSms,
        confirmBankAlertTransaction,
        confirmBorrowDeposit,
        dismissBorrowDeposit,
        spentToday,
        safeToSpendRemaining,
        todayDeficit,
        tomorrowAdjustedCap,
        currentBalance,
        totalSavedGoals,
        availableLiquidCash,
        logExpense,
        depositToGoal,
        withdrawFromGoal,
        settleDebt,
        editTransaction,
        editDebt,
        flipDebtDirection,
        flipLastDebt,
        editLastTransaction,
        addGoal,
        deleteGoal,
        addDebt,
        deleteDebt,
        deleteTransaction,
        resetTodaySpending,
        clearChatMessages,
        isAuditing,
        cloudSyncStatus,
        refreshCloudData,
        isSettingsOpen,
        openSettings,
        closeSettings,
      }}
    >
      {children}
    </FinanceContext.Provider>
  );
}

export function useFinance() {
  const context = useContext(FinanceContext);
  if (!context) {
    throw new Error('useFinance must be used within a FinanceProvider');
  }
  return context;
}
