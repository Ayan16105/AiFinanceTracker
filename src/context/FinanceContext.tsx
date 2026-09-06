'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  UserSettings,
  Transaction,
  SavingsGoal,
  Debt,
  ChatMessage,
  ChatSession,
  ParseExpenseResult,
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
  processBankSms: (smsText: string) => { success: boolean; message: string };
  confirmBankAlertTransaction: (data: {
    amount: number;
    merchant: string;
    category: string;
    description?: string;
    messageId?: string;
  }) => void;
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
  settleDebt: (debtId: string, autoLogTransaction?: boolean) => void;
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

const FinanceContext = createContext<FinanceContextType | undefined>(undefined);

const DEFAULT_SESSION_ID = 'sess-default';

export function FinanceProvider({ children }: { children: React.ReactNode }) {
  const [activeTab, setActiveTab] = useState<'command-center' | 'ai-ca-ledger' | 'transactions-ledger' | 'radar-and-horizons'>('command-center');
  const [userSettings, setUserSettings] = useState<UserSettings>(initialUserSettings);
  const [transactions, setTransactions] = useState<Transaction[]>(initialTransactions);
  const [goals, setGoals] = useState<SavingsGoal[]>(initialGoals);
  const [debts, setDebts] = useState<Debt[]>(initialDebts);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>(initialChatMessages);

  // Chat Sessions state
  const [sessions, setSessions] = useState<ChatSession[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('jarvis_chat_sessions');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        }
      } catch {}
    }
    return [
      {
        id: DEFAULT_SESSION_ID,
        title: 'Initial Briefing',
        createdAt: new Date().toISOString(),
        lastActiveAt: new Date().toISOString(),
      },
    ];
  });

  const [currentSessionId, setCurrentSessionId] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('jarvis_active_session_id');
        if (saved) return saved;
      } catch {}
    }
    return DEFAULT_SESSION_ID;
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
            setGoals(cloudData.goals);
          }
          if (cloudData.debts !== undefined) setDebts(cloudData.debts);
          if (cloudData.chatMessages !== undefined && cloudData.chatMessages.length > 0) {
            setChatMessages(cloudData.chatMessages);
            const sessionMap = new Map<string, { title: string; createdAt: string; lastActiveAt: string }>();
            cloudData.chatMessages.forEach((m) => {
              const sId = m.metadata?.sessionId || m.sessionId;
              if (sId) {
                if (!sessionMap.has(sId)) {
                  sessionMap.set(sId, {
                    title: m.metadata?.merchant ? `${m.metadata.merchant} & Telemetry` : `Briefing (${sId.slice(-4)})`,
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
  const utcTodayStr = new Date().toISOString().split('T')[0];

  // Calculate today's discretionary expense sum (fixed household rent does not drain daily pocket allowance)
  const spentToday = transactions
    .filter((tx) => (tx.date === todayStr || tx.date === utcTodayStr) && tx.transactionType === 'expense' && tx.isDiscretionary !== false)
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

  const settleDebt = (debtId: string, autoLogTransaction: boolean = true) => {
    const debt = debts.find((d) => d.id === debtId);
    if (!debt) return;

    const settledDebt: Debt = { ...debt, isSettled: true };
    setDebts((prev) =>
      prev.map((d) => (d.id === debtId ? settledDebt : d))
    );
    SupabaseService.syncDebtUpsert(settledDebt);

    if (!autoLogTransaction) return;

    const now = new Date();
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    if (debt.debtType === 'owed_to_user') {
      // Money was owed to Sir -> Settle means it has been received/recovered!
      const newTx: Transaction = {
        id: `tx-${Date.now()}`,
        userId: userSettings.userId,
        rawPrompt: `Settled receivable: ${debt.title}`,
        merchant: debt.title,
        amount: debt.amount,
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
      // Sir owed money -> Settle means it has been paid off
      const newTx: Transaction = {
        id: `tx-${Date.now()}`,
        userId: userSettings.userId,
        rawPrompt: `Settled liability: ${debt.title}`,
        merchant: debt.title,
        amount: debt.amount,
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

    const withdrawAmount = Math.min(amount, goal.currentAmount);
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
    const newDebt: Debt = {
      ...debtData,
      id: `debt-${Date.now()}`,
      userId: userSettings.userId,
    };
    setDebts((prev) => [...prev, newDebt]);
    SupabaseService.syncDebtUpsert(newDebt);
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

  // J.A.R.V.I.S. Humorous Butler Greeting on new or empty session
  useEffect(() => {
    const sessionMessages = chatMessages.filter(
      (m) => (m.sessionId || DEFAULT_SESSION_ID) === currentSessionId
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
        id: `ai-greet-${Date.now()}`,
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
  }, [currentSessionId]);

  const createNewSession = (customTitle?: string): string => {
    const newId = `sess-${Date.now()}`;
    const d = new Date();
    const dateLabel = d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
    const title = customTitle || `Briefing ${dateLabel} (${sessions.length + 1})`;
    const newSession: ChatSession = {
      id: newId,
      title,
      createdAt: d.toISOString(),
      lastActiveAt: d.toISOString(),
    };

    setSessions((prev) => [newSession, ...prev]);
    setCurrentSessionId(newId);

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
      id: `ai-greet-${Date.now()}`,
      sessionId: newId,
      sender: 'ai',
      text: greetingText,
      sentiment: spentToday > userSettings.dailySpendLimit ? 'scold' : 'neutral',
      timestamp: timeStr,
      metadata: {
        sessionId: newId,
        remainingSafeToSpend: safeToSpendRemaining,
        tomorrowAdjustedCap: tomorrowAdjustedCap,
      },
    };

    setChatMessages((prev) => [...prev, greetingMsg]);
    SupabaseService.syncChatMessage(greetingMsg);

    return newId;
  };

  const switchSession = (sessionId: string) => {
    setCurrentSessionId(sessionId);
  };

  const deleteSession = (sessionId: string) => {
    if (sessions.length <= 1) return;
    setSessions((prev) => prev.filter((s) => s.id !== sessionId));
    setChatMessages((prev) => prev.filter((m) => (m.sessionId || DEFAULT_SESSION_ID) !== sessionId));
    if (currentSessionId === sessionId) {
      const remaining = sessions.filter((s) => s.id !== sessionId);
      if (remaining.length > 0) {
        setCurrentSessionId(remaining[0].id);
      }
    }
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

    // 2. Add New Transaction to Journal (only if amount > 0 and NOT a simulation)
    if (result.amount > 0 && !isHypotheticalPrompt) {
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

    // 3. Execute J.A.R.V.I.S. Actions (Full App Navigation & Control)
    if (result.autoAction) {
      if (result.autoAction.type === 'navigate' && result.autoAction.navigateTarget) {
        setActiveTab(result.autoAction.navigateTarget);
      } else if (result.autoAction.type === 'update_budget' && result.autoAction.budgetUpdate) {
        const bu = result.autoAction.budgetUpdate;
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
      } else if (result.autoAction.type === 'create_receivable') {
        const autoDebt: Debt = {
          id: `debt-${Date.now()}`,
          userId: userSettings.userId,
          title: result.autoAction.debtTitle || 'Roommate (Rent Share)',
          amount: result.autoAction.debtAmount || 5000,
          debtType: 'owed_to_user',
          dueDate: 'On Roommate Salary',
          isSettled: false,
          notes: result.autoAction.note || 'Paid on behalf of roommate for rent. Recover once paid.',
        };
        setDebts((prev) => [autoDebt, ...prev]);
      } else if (result.autoAction.type === 'create_payable') {
        const autoDebt: Debt = {
          id: `debt-${Date.now()}`,
          userId: userSettings.userId,
          title: result.autoAction.debtTitle || 'Friend Loan (Payable)',
          amount: result.autoAction.debtAmount || 10000,
          debtType: 'owed_by_user',
          dueDate: result.autoAction.dueDate || 'On Pay Day',
          isSettled: false,
          notes: result.autoAction.note || 'Dene hain (Payable logged via J.A.R.V.I.S.)',
        };
      } else if (result.autoAction.type === 'create_goal' && result.autoAction.goalData) {
        addGoal({
          name: result.autoAction.goalData.name,
          targetAmount: result.autoAction.goalData.targetAmount,
          currentAmount: 0,
          monthlyAllocation: result.autoAction.goalData.monthlyAllocation || Math.round(result.autoAction.goalData.targetAmount / 12),
          isShielded: true,
          milestones: [
            { id: `m1-${Date.now()}`, title: 'First 25% Deposit', status: 'current' },
            { id: `m2-${Date.now()}`, title: 'Halfway Mark', status: 'pending' },
            { id: `m3-${Date.now()}`, title: 'Goal Complete', status: 'pending' }
          ]
        });
      } else if (result.autoAction.type === 'allocate_goal') {
        const alloc = result.autoAction.goalAllocation;
        const targetName = (alloc?.goalName || result.merchant || '').toLowerCase();
        const allocAmount = alloc?.amount || result.amount;

        if (allocAmount > 0) {
          setGoals((prev) =>
            prev.map((g) => {
              const nameLower = g.name.toLowerCase();
              if (
                nameLower.includes(targetName) ||
                targetName.includes(nameLower) ||
                (targetName.includes('mama') && nameLower.includes('mama')) ||
                (targetName.includes('emergency') && nameLower.includes('emergency')) ||
                (targetName.includes('dress') && nameLower.includes('dress'))
              ) {
                const updated = g.currentAmount + allocAmount;
                return {
                  ...g,
                  currentAmount: updated,
                  milestones: g.milestones.map((m) => {
                    if (m.title.includes('25%') && updated >= g.targetAmount * 0.25) return { ...m, status: 'achieved' };
                    if (m.title.includes('Half') && updated >= g.targetAmount * 0.5) return { ...m, status: 'achieved' };
                    if (updated >= g.targetAmount) return { ...m, status: 'achieved' };
                    return m;
                  }),
                };
              }
              return g;
            })
          );
        }
      } else if (result.autoAction.type === 'withdraw_goal') {
        const withdraw = result.autoAction.goalWithdrawal;
        const targetName = (withdraw?.goalName || result.merchant || '').toLowerCase();
        const withdrawAmount = Math.abs(withdraw?.amount || result.amount);

        if (withdrawAmount > 0) {
          setGoals((prev) =>
            prev.map((g) => {
              const nameLower = g.name.toLowerCase();
              if (
                nameLower.includes(targetName) ||
                targetName.includes(nameLower) ||
                (targetName.includes('mama') && nameLower.includes('mama')) ||
                (targetName.includes('emergency') && nameLower.includes('emergency')) ||
                (targetName.includes('dress') && nameLower.includes('dress'))
              ) {
                const updated = Math.max(0, g.currentAmount - withdrawAmount);
                return {
                  ...g,
                  currentAmount: updated,
                  milestones: g.milestones.map((m) => {
                    if (m.title.includes('25%') && updated < g.targetAmount * 0.25) return { ...m, status: 'pending' };
                    if (m.title.includes('Half') && updated < g.targetAmount * 0.5) return { ...m, status: 'pending' };
                    if (updated < g.targetAmount) return { ...m, status: 'pending' };
                    return m;
                  }),
                };
              }
              return g;
            })
          );
        }
      } else if (result.autoAction.type === 'settle_debt') {
        const query = (result.autoAction.settleCounterparty || result.autoAction.debtTitle || '').toLowerCase();
        setDebts((prev) =>
          prev.map((d) =>
            d.title.toLowerCase().includes(query) || (query.includes('sharma') && d.title.toLowerCase().includes('sharma'))
              ? { ...d, isSettled: true }
              : d
          )
        );
      } else if (result.autoAction.type === 'offset_debt') {
        // Offset against existing dues: remove temporary receivable and update net due
        setDebts((prev) => {
          const filtered = prev.filter(
            (d) => !d.title.includes('Roommate (Rent Share)') && !d.title.includes('Net Due')
          );
          const offsetDebt: Debt = {
            id: `debt-${Date.now()}`,
            userId: userSettings.userId,
            title: result.autoAction?.debtTitle || 'Roommate Net Due (After ₹5k Rent Offset)',
            amount: result.autoAction?.debtAmount || 15000,
            debtType: 'owed_by_user',
            dueDate: 'After Pay Day (8th Sep)',
            isSettled: false,
            notes:
              result.autoAction?.note ||
              'Deducted ₹5,000 rent share from ₹20,000 prior dues. Remaining balance to pay: ₹15,000.',
          };
          return [offsetDebt, ...filtered];
        });
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
      },
    };
    setChatMessages((prev) => [...prev, aiMsg]);
    SupabaseService.syncChatMessage(aiMsg);

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
        processBankSms,
        confirmBankAlertTransaction,
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
