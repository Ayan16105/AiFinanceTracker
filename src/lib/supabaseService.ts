import { supabase, isSupabaseConfigured } from './supabaseClient';
import { UserSettings, Transaction, SavingsGoal, Debt, ChatMessage } from '@/types';

// Helper to convert snake_case DB row to camelCase UserSettings
function mapDbToUserSettings(row: any): UserSettings {
  return {
    id: row.id,
    userId: row.user_id,
    userName: row.user_name || 'Ayan',
    userTitle: row.user_title || 'Principal',
    monthlySalary: Number(row.monthly_salary) || 35000,
    salaryDayOfMonth: Number(row.salary_day_of_month) || 7,
    dailySpendLimit: Number(row.daily_spend_limit) || 540,
    monthlyDiscretionaryCap: Number(row.monthly_discretionary_cap) || 16200,
    householdFundCurrent: Number(row.household_fund_current) || 10000,
    householdFundTarget: Number(row.household_fund_target) || 10000,
    strictModeEnabled: row.strict_mode_enabled ?? true,
    currencySymbol: row.currency_symbol || '₹',
    geminiApiKey: row.gemini_api_key || undefined,
    securityPin: row.security_pin || undefined,
    biometricEnabled: row.biometric_enabled !== undefined ? Boolean(row.biometric_enabled) : undefined,
    savingsTarget: row.savings_target !== undefined ? Number(row.savings_target) : undefined,
  };
}

// Helper to convert camelCase UserSettings to snake_case DB object
function mapUserSettingsToDb(settings: UserSettings) {
  return {
    id: settings.id,
    user_id: settings.userId || 'default_user',
    user_name: settings.userName,
    user_title: settings.userTitle,
    monthly_salary: settings.monthlySalary,
    salary_day_of_month: settings.salaryDayOfMonth,
    daily_spend_limit: settings.dailySpendLimit,
    monthly_discretionary_cap: settings.monthlyDiscretionaryCap,
    household_fund_current: settings.householdFundCurrent,
    household_fund_target: settings.householdFundTarget,
    strict_mode_enabled: settings.strictModeEnabled,
    currency_symbol: settings.currencySymbol,
    gemini_api_key: settings.geminiApiKey || null,
    security_pin: settings.securityPin || '1014',
    biometric_enabled: settings.biometricEnabled !== false,
    savings_target: settings.savingsTarget || 5000,
    updated_at: new Date().toISOString(),
  };
}

// Helper to convert snake_case DB row to camelCase Transaction
function mapDbToTransaction(row: any): Transaction {
  return {
    id: row.id,
    userId: row.user_id,
    rawPrompt: row.raw_prompt || undefined,
    merchant: row.merchant,
    amount: Number(row.amount),
    category: row.category,
    transactionType: row.transaction_type,
    isDiscretionary: row.is_discretionary ?? true,
    isOverLimit: row.is_over_limit ?? false,
    overLimitAmount: Number(row.over_limit_amount) || 0,
    date: row.date,
    time: row.time || undefined,
    createdAt: row.created_at || new Date().toISOString(),
  };
}

// Helper to convert camelCase Transaction to snake_case DB object
function mapTransactionToDb(tx: Transaction) {
  return {
    id: tx.id,
    user_id: tx.userId || 'default_user',
    raw_prompt: tx.rawPrompt || null,
    merchant: tx.merchant,
    amount: tx.amount,
    category: tx.category,
    transaction_type: tx.transactionType,
    is_discretionary: tx.isDiscretionary,
    is_over_limit: tx.isOverLimit,
    over_limit_amount: tx.overLimitAmount,
    date: tx.date,
    time: tx.time || null,
    created_at: tx.createdAt || new Date().toISOString(),
  };
}

// Helper to convert snake_case DB row to camelCase SavingsGoal
function mapDbToGoal(row: any): SavingsGoal {
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    targetAmount: Number(row.target_amount),
    currentAmount: Number(row.current_amount) || 0,
    targetDate: row.target_date || undefined,
    monthlyAllocation: Number(row.monthly_allocation) || 800,
    isShielded: row.is_shielded ?? true,
    category: row.category || 'Savings Goal',
    milestones: Array.isArray(row.milestones) ? row.milestones : [],
  };
}

// Helper to convert camelCase SavingsGoal to snake_case DB object
function mapGoalToDb(goal: SavingsGoal) {
  return {
    id: goal.id,
    user_id: goal.userId || 'default_user',
    name: goal.name,
    target_amount: goal.targetAmount,
    current_amount: goal.currentAmount,
    target_date: goal.targetDate || null,
    monthly_allocation: goal.monthlyAllocation,
    is_shielded: goal.isShielded,
    category: goal.category || 'Savings Goal',
    milestones: JSON.stringify(goal.milestones || []),
    updated_at: new Date().toISOString(),
  };
}

// Helper to convert snake_case DB row to camelCase Debt
function mapDbToDebt(row: any): Debt {
  return {
    id: row.id,
    userId: row.user_id,
    title: row.title,
    amount: Number(row.amount),
    debtType: row.debt_type,
    dueDate: row.due_date || undefined,
    isSettled: row.is_settled ?? false,
    notes: row.notes || undefined,
  };
}

// Helper to convert camelCase Debt to snake_case DB object
function mapDebtToDb(debt: Debt) {
  return {
    id: debt.id,
    user_id: debt.userId || 'default_user',
    title: debt.title,
    amount: debt.amount,
    debt_type: debt.debtType,
    due_date: debt.dueDate || null,
    is_settled: debt.isSettled,
    notes: debt.notes || null,
    updated_at: new Date().toISOString(),
  };
}

// Helper to convert snake_case DB row to camelCase ChatMessage
function mapDbToChatMessage(row: any): ChatMessage {
  const meta = row.metadata && typeof row.metadata === 'object' ? row.metadata : undefined;
  return {
    id: row.id,
    sessionId: row.session_id || meta?.sessionId || undefined,
    sender: row.sender,
    text: row.text,
    sentiment: row.sentiment,
    timestamp: row.timestamp || '',
    metadata: meta,
  };
}

// Helper to convert camelCase ChatMessage to snake_case DB object
function mapChatMessageToDb(msg: ChatMessage) {
  const sessionId = msg.sessionId || msg.metadata?.sessionId || null;
  return {
    id: msg.id,
    user_id: 'default_user',
    session_id: sessionId,
    sender: msg.sender,
    text: msg.text,
    sentiment: msg.sentiment,
    timestamp: msg.timestamp,
    metadata: {
      ...(msg.metadata || {}),
      sessionId: sessionId || undefined,
    },
    created_at: new Date().toISOString(),
  };
}

export class SupabaseService {
  public static async checkCloudConnection(): Promise<{ connected: boolean; tablesFound: boolean; error?: string }> {
    if (!isSupabaseConfigured || !supabase) {
      return { connected: false, tablesFound: false, error: 'Supabase credentials not configured' };
    }
    try {
      const { data, error } = await supabase.from('transactions').select('id').limit(1);
      if (error) {
        if (error.code === '42P01' || error.message.includes('not find the table')) {
          return { connected: true, tablesFound: false, error: 'Database connected, but schema tables need to be created in SQL Editor' };
        }
        return { connected: false, tablesFound: false, error: error.message };
      }
      return { connected: true, tablesFound: true };
    } catch (e: any) {
      return { connected: false, tablesFound: false, error: e?.message || 'Network error' };
    }
  }

  public static async fetchAllData(): Promise<{
    userSettings?: UserSettings;
    transactions?: Transaction[];
    goals?: SavingsGoal[];
    debts?: Debt[];
    chatMessages?: ChatMessage[];
  } | null> {
    if (!isSupabaseConfigured || !supabase) return null;

    try {
      const [settingsRes, txRes, goalsRes, debtsRes, chatRes] = await Promise.all([
        supabase.from('user_settings').select('*').limit(1),
        supabase.from('transactions').select('*').order('date', { ascending: false }).order('created_at', { ascending: false }),
        supabase.from('savings_goals').select('*').order('created_at', { ascending: true }),
        supabase.from('debts').select('*').order('created_at', { ascending: false }),
        supabase.from('chat_messages').select('*').order('created_at', { ascending: true }),
      ]);

      if (settingsRes.error && settingsRes.error.code === '42P01') {
        console.warn('Supabase tables not found in schema. Falling back to local offline storage.');
        return null;
      }

      return {
        userSettings: settingsRes.data && settingsRes.data.length > 0 ? mapDbToUserSettings(settingsRes.data[0]) : undefined,
        transactions: txRes.data ? txRes.data.map(mapDbToTransaction) : undefined,
        goals: goalsRes.data ? goalsRes.data.map(mapDbToGoal) : undefined,
        debts: debtsRes.data ? debtsRes.data.map(mapDbToDebt) : undefined,
        chatMessages: chatRes.data ? chatRes.data.map(mapDbToChatMessage) : undefined,
      };
    } catch (err) {
      console.warn('Supabase fetch failed, continuing with local cache:', err);
      return null;
    }
  }

  // --- Transactions Sync ---
  public static async syncTransactionInsert(tx: Transaction): Promise<void> {
    if (!isSupabaseConfigured || !supabase) return;
    try {
      const dbRow = mapTransactionToDb(tx);
      const { error } = await supabase.from('transactions').upsert(dbRow);
      if (error) console.warn('Supabase insert transaction error:', error.message);
    } catch (e) {
      console.warn('Supabase transaction insert exception:', e);
    }
  }

  public static async syncTransactionDelete(id: string): Promise<void> {
    if (!isSupabaseConfigured || !supabase) return;
    try {
      const { error } = await supabase.from('transactions').delete().eq('id', id);
      if (error) console.warn('Supabase delete transaction error:', error.message);
    } catch (e) {
      console.warn('Supabase transaction delete exception:', e);
    }
  }

  // --- Savings Goals Sync ---
  public static async syncGoalUpsert(goal: SavingsGoal): Promise<void> {
    if (!isSupabaseConfigured || !supabase) return;
    try {
      const dbRow = mapGoalToDb(goal);
      const { error } = await supabase.from('savings_goals').upsert(dbRow);
      if (error) console.warn('Supabase upsert goal error:', error.message);
    } catch (e) {
      console.warn('Supabase goal upsert exception:', e);
    }
  }

  public static async syncGoalDelete(id: string): Promise<void> {
    if (!isSupabaseConfigured || !supabase) return;
    try {
      const { error } = await supabase.from('savings_goals').delete().eq('id', id);
      if (error) console.warn('Supabase delete goal error:', error.message);
    } catch (e) {
      console.warn('Supabase goal delete exception:', e);
    }
  }

  // --- Debts / Loans Sync ---
  public static async syncDebtUpsert(debt: Debt): Promise<void> {
    if (!isSupabaseConfigured || !supabase) return;
    try {
      const dbRow = mapDebtToDb(debt);
      const { error } = await supabase.from('debts').upsert(dbRow);
      if (error) console.warn('Supabase upsert debt error:', error.message);
    } catch (e) {
      console.warn('Supabase debt upsert exception:', e);
    }
  }

  public static async syncDebtDelete(id: string): Promise<void> {
    if (!isSupabaseConfigured || !supabase) return;
    try {
      const { error } = await supabase.from('debts').delete().eq('id', id);
      if (error) console.warn('Supabase delete debt error:', error.message);
    } catch (e) {
      console.warn('Supabase debt delete exception:', e);
    }
  }

  // --- User Settings Sync ---
  public static async syncUserSettings(settings: UserSettings): Promise<void> {
    if (!isSupabaseConfigured || !supabase) return;
    try {
      const dbRow = mapUserSettingsToDb(settings);
      const { error } = await supabase.from('user_settings').upsert(dbRow, { onConflict: 'user_id' });
      if (error) {
        if (error.code === '42703') {
          // Column security_pin/biometric_enabled not yet present in Supabase table
          console.warn('Database user_settings table missing security columns. Falling back to base fields until schema.sql migration is run.');
          const { security_pin, biometric_enabled, savings_target, ...baseRow } = dbRow as any;
          const { error: fallbackErr } = await supabase.from('user_settings').upsert(baseRow, { onConflict: 'user_id' });
          if (fallbackErr) console.warn('Supabase fallback upsert error:', fallbackErr.message);
        } else {
          console.warn('Supabase upsert settings error:', error.message);
        }
      }
    } catch (e) {
      console.warn('Supabase settings upsert exception:', e);
    }
  }

  // Fetch security credentials directly from database for the login screen
  public static async fetchSecurityCredentials(): Promise<{ securityPin: string; biometricEnabled: boolean } | null> {
    if (!isSupabaseConfigured || !supabase) return null;
    try {
      const { data, error } = await supabase.from('user_settings').select('*').limit(1);
      if (error || !data || data.length === 0) return null;
      const row = data[0];
      return {
        securityPin: row.security_pin || '1014',
        biometricEnabled: row.biometric_enabled !== undefined ? Boolean(row.biometric_enabled) : true,
      };
    } catch {
      return null;
    }
  }

  // --- Chat Messages Sync ---
  public static async syncChatMessage(msg: ChatMessage): Promise<void> {
    if (!isSupabaseConfigured || !supabase) return;
    try {
      const dbRow = mapChatMessageToDb(msg);
      const { error } = await supabase.from('chat_messages').upsert(dbRow);
      if (error) {
        if (error.code === '42703') {
          // Column session_id not yet added to SQL table, omit column and rely on metadata JSONB
          const { session_id, ...baseRow } = dbRow as any;
          const { error: fbErr } = await supabase.from('chat_messages').upsert(baseRow);
          if (fbErr) console.warn('Supabase fallback chat upsert error:', fbErr.message);
        } else {
          console.warn('Supabase upsert chat message error:', error.message);
        }
      }
    } catch (e) {
      console.warn('Supabase chat message upsert exception:', e);
    }
  }
}
