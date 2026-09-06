export interface UserSettings {
  id: string;
  userId: string;
  userName: string;
  userTitle: string;
  monthlySalary: number; // e.g. 35000
  salaryDayOfMonth: number; // default 7 (night of 7th)
  dailySpendLimit: number; // default 540
  monthlyDiscretionaryCap: number; // default 16200
  householdFundCurrent: number; // default 10000
  householdFundTarget: number; // default 10000
  strictModeEnabled: boolean;
  currencySymbol: string;
  geminiApiKey?: string;
  securityPin?: string; // custom terminal access passcode, defaults to '1014'
  biometricEnabled?: boolean; // toggle for 1-click quick access bypass, defaults to true
  savingsTarget?: number; // target monthly savings pool
  autoCalculateDaily?: boolean; // whether daily limit should be auto-derived
}

export type TransactionType = 'expense' | 'income' | 'transfer';

export interface Transaction {
  id: string;
  userId: string;
  rawPrompt?: string;
  merchant: string;
  amount: number;
  category: string;
  transactionType: TransactionType;
  isDiscretionary: boolean;
  isOverLimit: boolean;
  overLimitAmount: number;
  date: string; // YYYY-MM-DD
  time?: string;
  createdAt: string;
}

export interface MilestoneGate {
  id: string;
  title: string;
  status: 'achieved' | 'current' | 'pending';
  dateOrAmount?: string;
}

export interface SavingsGoal {
  id: string;
  userId: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  targetDate?: string;
  monthlyAllocation: number;
  isShielded: boolean;
  category?: string;
  milestones: MilestoneGate[];
}

export type DebtType = 'owed_by_user' | 'owed_to_user';

export interface Debt {
  id: string;
  userId: string;
  title: string;
  amount: number;
  debtType: DebtType;
  dueDate?: string;
  isSettled: boolean;
  notes?: string;
}

export type ChatSentiment = 'neutral' | 'praise' | 'scold';

export interface ChatSession {
  id: string;
  title: string;
  createdAt: string;
  lastActiveAt: string;
}

export interface BankAlertData {
  amount: number;
  merchant: string;
  suggestedCategory: string;
  rawText: string;
  confirmed?: boolean;
}

export interface ChatMessageMetadata {
  amount?: number;
  merchant?: string;
  category?: string;
  transactionType?: TransactionType;
  isOverLimit?: boolean;
  breachCode?: string;
  quotaConsumedPercent?: number;
  remainingSafeToSpend?: number;
  tomorrowAdjustedCap?: number;
  exceededBy?: number;
  amortizationRule?: string;
  autoAction?: AutoAction;
  sessionId?: string;
  bankAlertData?: BankAlertData;
}

export interface ChatMessage {
  id: string;
  sessionId?: string;
  sender: 'user' | 'ai';
  text: string;
  sentiment: ChatSentiment;
  timestamp: string;
  metadata?: ChatMessageMetadata;
}

export type AutoActionType = 
  | 'create_receivable' 
  | 'create_payable' 
  | 'offset_debt' 
  | 'navigate' 
  | 'update_budget' 
  | 'settle_debt' 
  | 'allocate_goal'
  | 'withdraw_goal'
  | 'create_goal' 
  | 'clear_transactions'
  | 'reset_today' 
  | 'adjust_budget' 
  | 'flip_last_debt'
  | 'edit_last_transaction'
  | 'edit_last_debt'
  | 'none';

export interface AutoAction {
  type: AutoActionType;
  debtTitle?: string;
  debtAmount?: number;
  debtType?: DebtType;
  dueDate?: string;
  note?: string;
  navigateTarget?: 'command-center' | 'ai-ca-ledger' | 'transactions-ledger' | 'radar-and-horizons';
  budgetUpdate?: {
    salary?: number;
    dailyLimit?: number;
    fixedBills?: number;
    salaryDay?: number;
  };
  settleCounterparty?: string;
  recoveryAmount?: number;
  isPartial?: boolean;
  transactionUpdate?: Partial<Transaction>;
  debtUpdate?: Partial<Debt>;
  goalData?: {
    name: string;
    targetAmount: number;
    monthlyAllocation?: number;
  };
  goalAllocation?: {
    goalName: string;
    amount: number;
  };
  goalWithdrawal?: {
    goalName: string;
    amount: number;
  };
}

export interface ParseExpenseResult {
  merchant: string;
  amount: number;
  category: string;
  transactionType: TransactionType;
  isDiscretionary: boolean;
  isOverLimit: boolean;
  exceededBy: number;
  remainingSafeToSpend: number;
  sentiment: ChatSentiment;
  caCommentary: string;
  breachCode?: string;
  tomorrowAdjustedCap: number;
  autoAction?: AutoAction;
  autoActions?: AutoAction[];
}

