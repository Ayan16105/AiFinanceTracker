# ⚖️ AI-PA | Prudent AI — Strict Chartered Advisory

> **A disciplined, hyper-vigilant personal finance web application acting as a strict Indian Chartered Accountant (CA) that tracks daily spending, capital horizons, and liabilities.**

Inspired by high-fidelity FinTech aesthetics from Stitch (`projects/9897034364293935358`).

---

## 🌟 Key Features

### 1. 🛡️ Command Center (Bento Dashboard)
- **Safe-to-Spend Today**: Dynamic real-time calculation defaulting to a ₹540.00 daily limit, with pacing gains and reserve runway indicators.
- **AI CA Sentinel Monitor**: Active status tracking audit compliance, pass ratios, and automatic variance rebalancing.
- **Liquid Reserves & Household Vault**: Tracks ₹10,000.00 household fund sweeps and emergency runway multipliers.
- **Execution Burn Engine**: Monospaced 7-day runway discipline chart highlighting daily spending and overspend spikes.
- **Automated CA Journal**: Recent transactions stream with category filters (All Items, Discretionary, Mandatory).

### 2. 📜 The AI CA Ledger (Conversational Workspace)
- **Natural Language Expense Logging**: Powered by Next.js API routes connecting to Google Gemini API (with seamless built-in rule parser fallback).
- **Strict Indian CA Persona**: 
  - Standard logged expenses get an **Emerald Reconciled Bubble** with quota consumption % and remaining safe runway.
  - Overspending triggers the signature **Rose-tinted High-Urgency Violation Card** with Gavel icon, `CAP EXCEEDED`, `[AUDIT RULE: BREACH #OCT-2204]`, stern reprimand, and **T+1 Amortization** penalty breakdown (compressing tomorrow's allowance to absorb the deficit!).
- **Simulation Chips**: Quick one-tap simulation chips (`☕ Coffee ₹40`, `🚕 Uber ₹210`, `⚠️ Zara Shirt ₹800 (Breach)`, `🍽️ Dinner ₹650`).
- **Voice / Mic Simulation**: Pinned bottom bar with microphone button and text field.

### 3. 🎯 Radar & Horizons (Sinking Funds & Debt Ledger)
- **KPI Metamarkers**: Liability reserve coverage (82.4%), net counterbalance (+₹4,700), horizon velocity.
- **Capital Horizons & Sinking Funds**:
  - **Mama's Wedding Dress**: ₹2,400 / ₹5,000 accumulated, circular SVG radial progress ring (48% funded), and Milestone Verification Gates (*Saree Selection [Achieved]*, *Tailoring Advance [Current]*, *Final Fitting [Pending]*).
  - **Emergency Buffer (6-Month Run)**: ₹1,20,000 / ₹2,00,000 with systematic sovereign sweeps.
- **Debt & Liability Ledger**:
  - Upcoming settlement warning strip.
  - Tracking payable liabilities (store credits, credit lines) and peer receivables (notes owed to user) with one-click reconcile actions.

---

## 🚀 Quickstart & Setup

### 1. Install Dependencies
```bash
npm install
```

### 2. Run Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) on your browser.

### 3. (Optional) Connect Live Gemini API & Supabase
Edit `.env.local`:
```env
# Google Gemini API Key
GEMINI_API_KEY=your_actual_gemini_api_key_here

# Supabase Credentials (optional - app automatically stores in localStorage if not set)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 4. Supabase Database Setup
To set up the PostgreSQL tables in Supabase:
1. Go to your Supabase project dashboard -> **SQL Editor**.
2. Open the file `supabase/schema.sql`.
3. Paste and click **Run**.

---

## 🎨 Tech Stack & Design System
- **Framework**: Next.js 15 (App Router), React 19, TypeScript
- **Styling**: Tailwind CSS
- **Fonts**: `Hanken Grotesk` (contemporary grotesk for headlines and body) & `JetBrains Mono` (high-precision financial data)
- **Icons**: Lucide React
- **Database**: Supabase (PostgreSQL) + LocalStorage offline sync
- **AI Engine**: Google Gemini API (`@google/generative-ai`) with structured JSON schema enforcement
- **Target Devices**: Responsive across Vivo smartphones (360px–430px) and Dell Latitude displays (1366px–1920px).
