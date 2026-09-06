import { UserSettings, Transaction, SavingsGoal, Debt, ChatMessage } from '@/types';

export const initialUserSettings: UserSettings = {
  id: 'user_ayan_01',
  userId: 'default_user',
  userName: 'Ayan',
  userTitle: 'Personal Account',
  monthlySalary: 35000,
  salaryDayOfMonth: 7, // salary arrives on night of 7th
  dailySpendLimit: 540,
  monthlyDiscretionaryCap: 16200,
  householdFundCurrent: 10000,
  householdFundTarget: 10000,
  strictModeEnabled: true,
  currencySymbol: '₹',
  securityPin: '1014',
  biometricEnabled: true,
};

export const initialTransactions: Transaction[] = [
  {
    id: 'tx-01',
    userId: 'default_user',
    rawPrompt: 'Chai and biscuit at local cafe',
    merchant: 'Local Tea Stall',
    amount: 50,
    category: 'Food & Beverage',
    transactionType: 'expense',
    isDiscretionary: true,
    isOverLimit: false,
    overLimitAmount: 0,
    date: new Date().toISOString().split('T')[0],
    time: '10:14 AM',
    createdAt: new Date(Date.now() - 4 * 3600000).toISOString(),
  },
  {
    id: 'tx-02',
    userId: 'default_user',
    rawPrompt: 'Zomato lunch bowl',
    merchant: 'Zomato',
    amount: 180,
    category: 'Food & Beverage',
    transactionType: 'expense',
    isDiscretionary: true,
    isOverLimit: false,
    overLimitAmount: 0,
    date: new Date().toISOString().split('T')[0],
    time: '01:30 PM',
    createdAt: new Date(Date.now() - 2 * 3600000).toISOString(),
  },
];

export const initialGoals: SavingsGoal[] = [
  {
    id: 'goal-mama-dress',
    userId: 'default_user',
    name: "Mama's Wedding Dress",
    targetAmount: 5000,
    currentAmount: 2400,
    targetDate: '2024-12-15',
    monthlyAllocation: 800,
    isShielded: true,
    category: 'Celebration & Sinking Fund',
    milestones: [
      { id: 'm1', title: 'Saree Selection', status: 'achieved', dateOrAmount: 'Cleared: 12 Sep' },
      { id: 'm2', title: 'Tailoring Advance', status: 'current', dateOrAmount: 'Allocating ₹1,200' },
      { id: 'm3', title: 'Final Fitting', status: 'pending', dateOrAmount: 'Due 24 Nov' },
    ],
  },
  {
    id: 'goal-emergency-run',
    userId: 'default_user',
    name: 'Emergency Buffer (3-Month Run)',
    targetAmount: 50000,
    currentAmount: 3000,
    targetDate: '2025-04-30',
    monthlyAllocation: 3000,
    isShielded: true,
    category: 'Liquid Sovereign Reserve',
    milestones: [
      { id: 'em1', title: '1-Month Survival', status: 'current', dateOrAmount: 'Target: ₹15,000' },
      { id: 'em2', title: '2-Month Baseline', status: 'pending', dateOrAmount: 'Target: ₹30,000' },
      { id: 'em3', title: '3-Month Runway Seal', status: 'pending', dateOrAmount: 'Target: ₹50,000' },
    ],
  },
];

export const initialDebts: Debt[] = [
  {
    id: 'debt-01',
    userId: 'default_user',
    title: 'Market Credit - Provision Grocery',
    amount: 1800,
    debtType: 'owed_by_user',
    dueDate: 'In 8 days',
    isSettled: false,
    notes: 'Credit line balance reconciliation pending statement',
  },
  {
    id: 'debt-02',
    userId: 'default_user',
    title: 'Peer Receivable - Sharma Ji',
    amount: 6500,
    debtType: 'owed_to_user',
    dueDate: 'Due 1st Nov',
    isSettled: false,
    notes: 'Travel advance reimbursement promised by first week',
  },
];

export const initialChatMessages: ChatMessage[] = [
  {
    id: 'msg-01',
    sender: 'ai',
    text: "Good morning, Ayan. Your daily Safe-to-Spend limit is locked at ₹540.00.\nPriority statutory target: ₹5,000.00 for Mama's gift reserve is sequestered in the Sanctuary Vault. Spend with strict chartered discretion.",
    sentiment: 'neutral',
    timestamp: '08:00 AM',
  },
  {
    id: 'msg-02',
    sender: 'user',
    text: 'Logged ₹50 for tea',
    sentiment: 'neutral',
    timestamp: '10:14 AM',
  },
  {
    id: 'msg-03',
    sender: 'ai',
    text: 'Receipt reconciled for Food & Beverage. Discretionary allowance remains healthy.',
    sentiment: 'praise',
    timestamp: '10:14 AM',
    metadata: {
      amount: 50,
      merchant: 'Local Tea Stall',
      category: 'Food & Beverage',
      isOverLimit: false,
      quotaConsumedPercent: 9.2,
      remainingSafeToSpend: 490,
    },
  },
];
