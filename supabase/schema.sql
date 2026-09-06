-- ==============================================================================
-- AI-PA / J.A.R.V.I.S. Finance Tracker Database Schema (Supabase PostgreSQL)
-- Run this script in your Supabase SQL Editor: Dashboard > SQL Editor > New Query
-- ==============================================================================

-- Enable UUID extension if needed
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. User Settings & Advisory Configuration
CREATE TABLE IF NOT EXISTS public.user_settings (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    user_id TEXT UNIQUE NOT NULL DEFAULT 'default_user',
    user_name TEXT NOT NULL DEFAULT 'Ayan',
    user_title TEXT NOT NULL DEFAULT 'Principal',
    monthly_salary NUMERIC(10, 2) NOT NULL DEFAULT 35000.00,
    salary_day_of_month INT NOT NULL DEFAULT 7,
    daily_spend_limit NUMERIC(10, 2) NOT NULL DEFAULT 540.00,
    monthly_discretionary_cap NUMERIC(10, 2) NOT NULL DEFAULT 16200.00,
    household_fund_current NUMERIC(10, 2) NOT NULL DEFAULT 10000.00,
    household_fund_target NUMERIC(10, 2) NOT NULL DEFAULT 10000.00,
    strict_mode_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    currency_symbol TEXT NOT NULL DEFAULT '₹',
    gemini_api_key TEXT,
    security_pin TEXT NOT NULL DEFAULT '1014',
    biometric_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    savings_target NUMERIC(10, 2) NOT NULL DEFAULT 5000.00,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Upgrade existing user_settings table if columns do not exist yet (Safe to run on existing databases):
ALTER TABLE public.user_settings ADD COLUMN IF NOT EXISTS security_pin TEXT NOT NULL DEFAULT '1014';
ALTER TABLE public.user_settings ADD COLUMN IF NOT EXISTS biometric_enabled BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE public.user_settings ADD COLUMN IF NOT EXISTS savings_target NUMERIC(10, 2) NOT NULL DEFAULT 5000.00;

-- 2. Transactions Ledger
CREATE TABLE IF NOT EXISTS public.transactions (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    user_id TEXT NOT NULL DEFAULT 'default_user',
    raw_prompt TEXT,
    merchant TEXT NOT NULL,
    amount NUMERIC(10, 2) NOT NULL,
    category TEXT NOT NULL,
    transaction_type TEXT NOT NULL CHECK (transaction_type IN ('expense', 'income', 'transfer')),
    is_discretionary BOOLEAN NOT NULL DEFAULT TRUE,
    is_over_limit BOOLEAN NOT NULL DEFAULT FALSE,
    over_limit_amount NUMERIC(10, 2) DEFAULT 0.00,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    time TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_transactions_date ON public.transactions(date);
CREATE INDEX IF NOT EXISTS idx_transactions_user_date ON public.transactions(user_id, date);

-- 3. Capital Horizons & Savings Goals
CREATE TABLE IF NOT EXISTS public.savings_goals (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    user_id TEXT NOT NULL DEFAULT 'default_user',
    name TEXT NOT NULL,
    target_amount NUMERIC(10, 2) NOT NULL,
    current_amount NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    target_date TEXT,
    monthly_allocation NUMERIC(10, 2) DEFAULT 800.00,
    is_shielded BOOLEAN NOT NULL DEFAULT TRUE,
    category TEXT DEFAULT 'Sinking Fund',
    milestones JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Debts and Borrowed / Lent Money
CREATE TABLE IF NOT EXISTS public.debts (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    user_id TEXT NOT NULL DEFAULT 'default_user',
    title TEXT NOT NULL,
    amount NUMERIC(10, 2) NOT NULL,
    debt_type TEXT NOT NULL CHECK (debt_type IN ('owed_by_user', 'owed_to_user')),
    due_date TEXT,
    is_settled BOOLEAN NOT NULL DEFAULT FALSE,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. Chat Messages / AI Command Stream
CREATE TABLE IF NOT EXISTS public.chat_messages (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    user_id TEXT NOT NULL DEFAULT 'default_user',
    sender TEXT NOT NULL CHECK (sender IN ('user', 'ai')),
    text TEXT NOT NULL,
    sentiment TEXT NOT NULL CHECK (sentiment IN ('neutral', 'praise', 'scold')),
    timestamp TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- Enables anonymous public access with the anon key for full web-app sync
-- ==============================================================================

ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.savings_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.debts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
    DROP POLICY IF EXISTS "Allow anon all on user_settings" ON public.user_settings;
    DROP POLICY IF EXISTS "Allow anon all on transactions" ON public.transactions;
    DROP POLICY IF EXISTS "Allow anon all on savings_goals" ON public.savings_goals;
    DROP POLICY IF EXISTS "Allow anon all on debts" ON public.debts;
    DROP POLICY IF EXISTS "Allow anon all on chat_messages" ON public.chat_messages;
END $$;

CREATE POLICY "Allow anon all on user_settings" ON public.user_settings FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow anon all on transactions" ON public.transactions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow anon all on savings_goals" ON public.savings_goals FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow anon all on debts" ON public.debts FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow anon all on chat_messages" ON public.chat_messages FOR ALL USING (true) WITH CHECK (true);

-- ==============================================================================
-- Initial Seed Data (Executed only once)
-- ==============================================================================

INSERT INTO public.user_settings (
    user_id, user_name, user_title, monthly_salary, salary_day_of_month,
    daily_spend_limit, monthly_discretionary_cap, household_fund_current, household_fund_target
)
VALUES (
    'default_user', 'Ayan', 'Principal', 35000.00, 7,
    540.00, 16200.00, 10000.00, 10000.00
)
ON CONFLICT (user_id) DO NOTHING;

INSERT INTO public.savings_goals (id, user_id, name, target_amount, current_amount, target_date, monthly_allocation, milestones)
VALUES 
(
    'goal-wedding-dress',
    'default_user',
    'Mama''s Wedding Dress',
    5000.00,
    2400.00,
    '2026-12-15',
    800.00,
    '[
        {"id": "m1", "title": "25% Target Secured", "status": "achieved", "dateOrAmount": "₹1,250"},
        {"id": "m2", "title": "Halfway Milestone", "status": "pending", "dateOrAmount": "₹2,500"},
        {"id": "m3", "title": "Fully Funded", "status": "pending", "dateOrAmount": "₹5,000"}
    ]'::jsonb
),
(
    'goal-emergency-run',
    'default_user',
    'Emergency Buffer (3-Month Run)',
    50000.00,
    3000.00,
    '2026-12-31',
    4000.00,
    '[
        {"id": "m1", "title": "1 Month Buffer", "status": "pending", "dateOrAmount": "₹16,666"},
        {"id": "m2", "title": "2 Months Buffer", "status": "pending", "dateOrAmount": "₹33,333"},
        {"id": "m3", "title": "Full Shield", "status": "pending", "dateOrAmount": "₹50,000"}
    ]'::jsonb
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.debts (id, user_id, title, amount, debt_type, due_date, is_settled, notes)
VALUES
(
    'debt-grocery-credit',
    'default_user',
    'Market Provision Grocery',
    1800.00,
    'owed_by_user',
    'Tomorrow',
    false,
    'Provision store monthly bill'
)
ON CONFLICT (id) DO NOTHING;
