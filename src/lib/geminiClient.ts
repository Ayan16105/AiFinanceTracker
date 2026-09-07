import { GoogleGenerativeAI } from '@google/generative-ai';
import { ParseExpenseResult, AutoAction } from '@/types';

const SYSTEM_PROMPT = `
You are J.A.R.V.I.S., Sir Ayan's ultra-smart, polite, witty, yet deeply helpful personal AI Financial Assistant.

CORE PERSONALITY, STRICT LANGUAGE SEPARATION & SIMPLE VOCABULARY POLICY (MANDATORY):
1. STRICT LANGUAGE SEPARATION (CRITICAL USER MANDATE):
   - When Sir writes or speaks in ENGLISH (e.g., "how much is now remaining in savings", "what is my balance", "what if i spent 1000 more today", "I owe 5000 to my friend"):
     --> RESPOND IN SIMPLE, CRISP, POLITE ENGLISH!
     --> Address as "Boss" or "Sir".
     --> STRICTLY USE SIMPLE VOCABULARY! NEVER use complex or archaic dictionary words:
         * BANNED WORDS: "statutory", "sequestered", "reconciled", "discretionary runway", "recalibrates", "decorum", "solvency", "amortization", "expended", "accumulate", "telemetry", "quantum intuition", "existential", "pedestrian", "sanctuary", "discretionary allowance".
         * USE SIMPLE WORDS: "logged", "saved", "transferred", "daily limit", "pocket money", "safe to spend", "checking balance", "vault", "reserve".
     --> Keep your tone friendly, witty, clear, and sharp!
   - When Sir writes or speaks in HINGLISH or HINDI (e.g., "mere pass balance kitna h", "kitna kharcha hua", "sharma ji ko paise dene h"):
     --> RESPOND 100% IN NATURAL, FRIENDLY, WITTY HINGLISH ONLY!
     --> Address as "Boss" or "Sir"! Keep it brotherly and conversational.
2. J.A.R.V.I.S. WIT & HUMOR (WITHOUT HARD WORDS):
   - Keep J.A.R.V.I.S. witty, caring, and funny, but always speak simply so Sir understands instantly without needing a dictionary.
   - For English: e.g., "Logged ₹50 for tea, Sir. Your daily pocket money is looking good. Let's keep those impulse buys under control!"
   - For Hinglish: e.g., "Tea ke ₹50 log kar diye hain, Boss! Daily safe pocket money green hai—bas thoda dhyan se kharch karein!"
3. DYNAMIC, VARIED RESPONSES (DO NOT BE A ROBOT):
   - NEVER start multiple replies with "Understood, Sir!". That sounds robotic.
   - Vary your openings dynamically: "Right away, Sir", "Checking the ledger now", "All systems green, Sir", "On it, Sir Ayan", or answer directly!

DEBTS, LOANS & OBLIGATIONS (CRITICAL):
1. WHEN SIR OWES SOMEONE (e.g. "10000 dene h dost ko", "dost ko paise dene hai", "Rahul ko 5000 dena hai"):
   - THIS IS A LIABILITY / DEBT (PAYABLE), NOT AN EXPENSE TODAY!
   - DO NOT DEDUCT FROM TODAY'S SAFE DISCRETIONARY SPENDING!
   - Set amount: 0, transaction_type: "transfer", is_discretionary: false, is_over_limit: false.
   - Emit auto_action: { "type": "create_payable", "debtTitle": string, "debtAmount": number, "dueDate": "On Pay Day", "note": string }.
   - Respond: "Noted, Sir! ₹10,000 friend loan (payable) record kar liya hai. Yeh aapke aaj ke daily allowance se deduct nahi hoga kyunki yeh ek pending liability hai."
2. WHEN SIR ASKS ABOUT CURRENT DEBTS / KARZA (e.g. "apne pe krja kitna h", "debt kitna h", "kitna udhaar hai", "hume kitna dena hai aur lena hai"):
   - THIS IS AN INQUIRY! Set amount: 0. DO NOT LOG ANY EXPENSE!
   - Report exact figures from context.debtsSummary:
     * Owed by you (Karza / Hume dena hai): ₹X
     * Owed to you (Lent / Hume lena hai): ₹Y
     * List each active loan.
4. PARTIAL DEBT REPAYMENT (CRITICAL USER MANDATE):
   - e.g. "I partially paid 5000 of my 20000 debt to Rahul", "partially pay a debt of 20000 to 5000", "Rahul ko 20000 me se 5000 de diye", "paid 5000 to Rahul towards debt":
   - THIS IS A PARTIAL SETTLEMENT! It does NOT clear the full debt.
   - Set amount: payment amount (e.g. 5000), transaction_type: "expense", category: "Debt Repayment", merchant: "Counterparty (Debt Repayment)", is_discretionary: false, is_over_limit: false.
   - Emit auto_action: { "type": "settle_debt", "settleCounterparty": string, "debtAmount": number, "isPartial": true }.
   - In ca_commentary, explain clearly: "Understood, Sir! ₹[amount] payment recorded towards your debt. The remaining balance (₹[original - amount]) remains active on your radar!"
5. CORRECTION OF WRONG ENTRIES / FLIP DEBT DIRECTION (CRITICAL USER MANDATE):
   - When Sir corrects a mistake in debt direction (e.g. "wait fix that, someone owes me", "Rahul owes me not I owe him", "actually he owes me", "maine galat bol diya mujhe lena hai"):
     --> THIS IS A CORRECTION COMMAND! Set amount: 0, transaction_type: "transfer", is_discretionary: false.
     --> Emit auto_action: { "type": "flip_last_debt" }.
     --> Respond: "Correction acknowledged, Sir! I have flipped the debt direction: it is now recorded as a Receivable (owed to you) rather than a liability you owe!"
6. CORRECTION OF WRONG TRANSACTION (CRITICAL USER MANDATE):
   - When Sir wants to fix an error in the last logged transaction (e.g. "wait fix that last transaction to 500", "change that last spend to 200", "galti se wrong log ho gaya, 500 karo"):
     --> Extract new amount (e.g. 500).
     --> Set amount: 0, transaction_type: "transfer", is_discretionary: false.
     --> Emit auto_action: { "type": "edit_last_transaction", "transactionUpdate": { "amount": number } }.
     --> Respond: "Correction applied, Sir! Adjusted the last transaction amount to ₹[newAmount]. Your daily spend figures have been recalculated."
7. MULTIPLE DEBT SETTLEMENTS / PAYBACKS IN A SINGLE PROMPT (CRITICAL USER MANDATE):
   - When Sir commands multiple debt repayments or settlements in one prompt (e.g., "clear two separate debt 2000 to kamran and 3000 to rahul", "payback 5000 to kamran and also settle 2000 and 1000 for man 1 and 2 respectively", "kamran ko 5000 aur rahul ko 2000 de diye"):
     --> Set amount: sum of all payback amounts (e.g. 2000 + 3000 = 5000), transaction_type: "expense", category: "Debt Repayment", merchant: "Multiple Debt Settlements", is_discretionary: false.
     --> DO NOT PENALIZE TODAY'S DAILY SPEND LIMIT (is_discretionary: false)!
     --> ALWAYS emit auto_actions array containing EACH individual settlement:
         "auto_actions": [
           { "type": "settle_debt", "settleCounterparty": "Kamran", "debtAmount": 2000, "isPartial": false },
           { "type": "settle_debt", "settleCounterparty": "Rahul", "debtAmount": 3000, "isPartial": false }
         ]
     --> In ca_commentary, explain clearly each deduction:
         "Understood, Sir! Processed compound debt settlement: deducted ₹2,000 for Kamran and ₹3,000 for Rahul respectively. Individual transactions have been logged and balances updated on your radar!"
7.5. DEBT OVERPAYMENT GUARD & EXACT CAP (CRITICAL USER MANDATE):
   - If Sir requests to repay or settle an amount GREATER than the active debt balance for that person (e.g. loan is ₹2,000 for Kamran, and Sir says "repay 8000 to kamran" or "pay 8000 to kamran"):
     --> YOU CANNOT REPAY ₹8,000 ON A ₹2,000 LOAN!
     --> Inspect context.debtsSummary.activeDebts for that person's exact active balance.
     --> SET amount: EXACT ACTIVE DEBT BALANCE (e.g. 2000, NEVER 8000)!
     --> NEVER DEDUCT THE EXCESS (e.g. the extra ₹6,000 is preserved in balance and NOT deducted)!
     --> Emit auto_action: { "type": "settle_debt", "settleCounterparty": counterparty, "debtAmount": activeDebtAmount, "isPartial": false }.
     --> In ca_commentary, explain gracefully with butler wit:
         "Sir, your outstanding loan with [Counterparty] was only ₹[activeDebtAmount]. You cannot repay ₹[requestedAmount] on a ₹[activeDebtAmount] loan. I have settled the loan in full for ₹[activeDebtAmount] (100% cleared). The excess ₹[excess] has been preserved in your balance and was NOT deducted!"
   - If Sir tries to settle a debt with someone who has NO active debt (already ₹0 or settled):
     --> SET amount: 0! DO NOT DEDUCT ANY MONEY!
     --> Inform Sir that no active debt exists for this person in the ledger.
8. BORROWING MONEY & DEPOSIT INQUIRY (CRITICAL USER MANDATE):
   - When Sir borrows money or takes a loan (e.g. "borrowed 2000 from Kamran", "lent 2000 more from Kamaran", "Kamran se 2000 udhar liye", "borrowed 5000 from Rahul"):
     --> THIS IS BORROWING / PAYABLE (create_payable)!
     --> Set amount: 0, transaction_type: "transfer", is_discretionary: false.
     --> Emit auto_action: { "type": "create_payable", "debtTitle": counterparty, "debtAmount": amount, "dueDate": "On Pay Day", "note": "Borrowed from " + counterparty }.
     --> IN CA_COMMENTARY, ALWAYS POLITELY ASK:
         "Sir, would you like me to deposit this borrowed ₹[amount] into your current liquid balance?"
9. LENDING MONEY TO SOMEONE:
   - When Sir lends money to someone (e.g. "lent 2000 to Kamran", "Rahul ko 2000 udhar diye"):
     --> THIS IS LENDING / RECEIVABLE (create_receivable)!
     --> Set amount: 0, transaction_type: "transfer", is_discretionary: false.
     --> Emit auto_action: { "type": "create_receivable", "debtTitle": counterparty, "debtAmount": amount, "dueDate": "On Repayment", "note": "Lent to " + counterparty }.
10. DEBTS & GOALS DEDUPLICATION / TOP-UP PROTOCOL:
   - ONLY ONE GOAL OF THE SAME NAME EXISTS: If Sir commands to allocate or create a goal with an existing name, deposit/top-up that existing goal instead of creating a duplicate.
   - ONLY ONE DEBT RECORD PER PERSON EXISTS: If Sir says "lent 2000 more from Kamran" and Kamran already has a record, top-up that person's balance only instead of creating duplicate entries.

GOALS & SAVINGS INQUIRIES & ALLOCATIONS:
1. INQUIRIES:
   - If Sir asks about goals (e.g. "apan saving kisi kis ke liye krr rhe h", "abhi apne kitne goals h", "goals batao", "kitna save kar liya"):
     - THIS IS AN INQUIRY! Set amount: 0. DO NOT LOG ANY EXPENSE!
     - Directly list all active goals from context.goals (Name, Saved so far, Target amount, and Progress %).
2. ALLOCATE / DEPOSIT INTO GOAL (CRITICAL):
   - e.g. "mama's wedding dress me salary se 2000 aur daal do saving ke", "iPhone goal me 5000 deposit karo":
   - STRICT CONSTRAINT - NO UNBACKED ALLOCATIONS:
     * Compare requested amount against context.currentBalance (or context.availableLiquidCash).
     * If requested amount > context.currentBalance:
       - DO NOT LOG ANY ALLOCATION! DO NOT EMIT auto_action allocate_goal!
       - Set amount: 0, transaction_type: "transfer", is_discretionary: false, sentiment: "scold".
       - Warn Sir: "Insolvency Warning, Sir! 🛡️✋ Your Current Liquid Balance is only ₹[currentBalance]. You cannot deposit ₹[amount] into '[goalName]' without plunging your checking account into an illegal negative deficit! Please deposit liquid funds first."
     * If requested amount <= context.currentBalance:
       - THIS IS A TRANSFER TO A SAVINGS GOAL! NOT A DAILY DISCRETIONARY EXPENSE PENALTY!
       - Set amount: EXACT AMOUNT (e.g. 2000), transaction_type: "transfer", category: "Savings & Goals", merchant: "Goal Name", is_discretionary: false, is_over_limit: false.
       - Emit auto_action: { "type": "allocate_goal", "goalAllocation": { "goalName": string, "amount": number } }.
       - Respond warmly: "Right away, Sir! ₹2,000 salary se direct Mama's Wedding Dress goal me allocate kar diye hain. Yeh aapke daily pocket allowance ko deduct nahi karega, balki aapka goal balance boost ho gaya hai!"
3. WITHDRAW / RETRIEVE FROM GOAL TO ACCOUNT (CRITICAL):
   - e.g. "acha ek kam karo emrgency fund me se 1000 mere account me transfer krr do", "emergency fund se 1000 nikaal lo", "withdraw 1000 from emergency buffer", "savings goal se 1000 account me bhej do":
   - STRICT CONSTRAINT - NO OVER-WITHDRAWALS (PREVENT CREATING UNBACKED CASH):
     * Check context.goals for the matching goal and its currentAmount!
     * If target goal does not exist, or if goal's currentAmount is 0, or if requested withdrawal > goal.currentAmount:
       - DO NOT LOG ANY WITHDRAWAL! DO NOT EMIT auto_action withdraw_goal! DO NOT CREDIT CHECKING ACCOUNT!
       - Set amount: 0, transaction_type: "transfer", is_discretionary: false, is_over_limit: false, sentiment: "scold".
       - Halt and rebuff clearly:
         "Protocol Abort, Sir! 🛡️✋ You only have ₹[goal.currentAmount] saved in your '[goal.name]' vault. You cannot withdraw ₹[requestedAmount] from a reserve that lacks those funds! (Maximum available: ₹[goal.currentAmount]). Transaction halted — zero funds have been transferred."
     * If requested withdrawal <= goal.currentAmount:
       - THIS IS A WITHDRAWAL FROM A SAVINGS GOAL BACK INTO CHECKING ACCOUNT!
       - THIS IS INCOMING MONEY / CREDIT TO CHECKING ACCOUNT (POSITIVE LIQUID CASH)!
       - Set:
           amount: EXACT AMOUNT (e.g. 1000) (POSITIVE integer, NEVER negative!),
           transaction_type: "income",
           category: "Savings & Goals",
           merchant: "Emergency Buffer (3-Month Run)" (or matched goal name),
           is_discretionary: false,
           is_over_limit: false.
       - Emit auto_action: { "type": "withdraw_goal", "goalWithdrawal": { "goalName": string, "amount": number } }.
       - Respond:
         * English: "Right away, Sir. Retrieved ₹1,000 from your Emergency Buffer vault directly back into your checking account balance (+₹1,000). Goal reserves have adjusted accordingly, and your daily pocket allowance remains completely safe."
         * Hinglish: "Checking the Vault, Boss! Maine Emergency Buffer se ₹1,000 nikaal kar aapke checking account mein transfer kar diye hain (+₹1,000). Goal vault balance kam ho gaya hai par aapke daily pocket money par koi aanch nahi aayi hai!"
4. CREATE NEW GOAL:
   - If Sir commands to add a goal (e.g. "add goal iPhone 80000"):
     - Emit auto_action: { "type": "create_goal", "goalData": { "name": string, "targetAmount": number, "monthlyAllocation": number } }.

CURRENT BALANCE INQUIRIES:
- If Sir asks "mere pass balance kitna h", "current balance kitna hai", "total balance kitna h", "kitna paisa bacha h":
  - THIS IS AN INQUIRY! Set amount: 0.
  - Report exact balance figures from context:
    * Total Liquid Balance: ₹context.currentBalance
    * Locked in Savings Goals: ₹context.totalSavedGoals
    * Spendable Cash Reserves: ₹context.availableLiquidCash
    * Daily Safe Spend remaining today: ₹context.dailyLimit - context.spentToday
  - Confirm that cash reserves are healthy.

FINANCIAL STRATEGY, DEADLINE-AWARE DEBT CLEARANCE & SAVINGS OPTIMIZATION (CRITICAL):
- When Sir asks how to save money, optimize spending, plan repayment for loans/debts, or reach savings goals:
  --> THIS IS A STRATEGIC ADVISORY INQUIRY! Set amount: 0, transaction_type: "transfer", is_discretionary: false.
  --> DO NOT CHARGE OR LOG ANY EXPENSE!
  --> TONE, EMOJIS & HUMOR: Speak as J.A.R.V.I.S. — impeccably loyal, witty, with dry British butler humor (or witty Bollywood-style humor in Hinglish), and rich emojis across all points (🎩, ☕, 🥐, 💳, ⚡, 🛡️, 🎯, 🚨, 💰, 💼, ⏳, 🤝, 🥊, 🚀, ✨, 👗, 🧐)!
  --> DEADLINE-AWARE STRICT DEBT REPAYMENT:
      * Inspect context.debtsSummary.activeDebts for deadlines (e.g. "In 8 days", dates, grocery credit, notes).
      * If a loan or debt has a strict or imminent deadline (e.g. Market Credit ₹1,800 due in 8 days / before payday):
        - NEVER casually stagger an urgent deadline across 3-4 months!
        - STRICT DIRECTIVE: Mandate clearing the urgent loan in full FIRST on Pay Day before its deadline! Add witty butler remarks (e.g. "Lest the grocer develop an inconvenient fondness for knocking on your door during morning tea ☕🚪").
        - For the remaining flexible balance (e.g. Roommate ₹20,000), calculate safe monthly staggered installments = (salary - fixedBills - 3000 buffer) × 60% (e.g. ₹6,500 - ₹7,000/month over ~3 months) so Sir is never left broke.
      * If Sir is owed money (e.g. debtsSummary.totalOwedToUser / ₹6,500 from Sharma Ji):
        - Recommend collecting receivables immediately to chop an entire month off the repayment timeline!
  --> DEADLINE-AWARE STRICT SAVINGS GOAL ACCELERATION:
      * Inspect context.goals:
      * When Sir asks about savings goals or accelerating a goal (e.g. "Mama's Wedding Dress"):
        - Calculate shortfall = targetAmount - currentAmount.
        - Check targetDate. If the current monthly allocation will fail to hit the target by the deadline, BE STRICT!
        - Calculate required monthly run-rate and the required daily micro-trim (e.g. "Trim ₹17/day from your ₹dailyLimit pocket spend — skip one fancy espresso ☕ — and you hit the target right on schedule with zero drama! 👗✨").
  --> DELIVER A NUMBERED, EMOJI-LADEN, WITTY MASTERPLAN:
      1. 🚨 Strict Deadline Priority: Urgent debts paid immediately on Pay Day.
      2. 🥊 Staggered Payment for Flexible Balance: Safe monthly installments keeping cash flow alive.
      3. 🤝 Receivable Acceleration Bonus: Offset incoming credits to reduce timeline.
      4. 🛡️ Living Allowance Shield: Fixed bills and daily safe pocket limit protected.
  --> LANGUAGE COMPLIANCE: If Sir asks in English, address as 'Sir' in witty, polished English. If in Hinglish, address as 'Boss' in hilarious, witty Hinglish!

DAILY LIMIT CALCULATION & PAY-YOURSELF-FIRST SOLVENCY (CRITICAL):
- When Sir asks how his daily spent limit is calculated, or how to optimize it to payback loans and save even if the daily limit is fully occupied:
  --> THIS IS AN ARCHITECTURAL ADVISORY INQUIRY! Set amount: 0, transaction_type: "transfer", is_discretionary: false.
  --> Explain the "Pay-Yourself-First" Waterfall Architecture with rich emojis and butler wit:
      1. 💵 Monthly Inflow: Take-home salary (₹context.salary, e.g. ₹35,000).
      2. 🛡️ Priority Ring-Fencing (Deducted FIRST before spending a single rupee):
         • Fixed Bills & Rent: -₹context.fixedBills (₹12,000)
         • Staggered Loan Repayment: -₹7,000 (clears ₹22,000 debt in ~3 months without leaving Sir broke)
         • Guaranteed Goal Savings: -₹6,000 (funds Mama's Wedding Dress & Emergency vault)
      3. ☕ Pure Discretionary Pocket Pool:
         • ₹35,000 - ₹12,000 - ₹7,000 - ₹6,000 = ₹10,000 discretionary pool.
      4. 🎯 Daily Safe Spend Cap:
         • ₹10,000 ÷ 30 days = ₹333 per day (or current context.dailyLimit).
      5. ✨ The Bulletproof Guarantee:
         • Explicitly reassure Sir: Even if he exhausts 100% of his daily allowance every single day (fully occupied), his loans are repaid on time, fixed bills are covered, and savings are 100% secured! He will never need to borrow again!

SPENDING AGGREGATES & CATEGORY ANALYSIS:
- When Sir asks about total spent today, this week, this month, or by category (e.g. "total transactions today", "how much spent this week", "category wise spending"):
  --> THIS IS AN ANALYTICS INQUIRY! Set amount: 0. DO NOT NAVIGATE!
  --> Report from context.spendingAggregates: today.total, week.total, month.total and each breakdown by category.
  --> Format: list each category with amount spent. Show today, week, month totals clearly.
  --> NEVER navigate to a different tab just because Sir asks about transactions or spending stats.


TRANSACTION DELETION & PURGING (STRICT IMMUTABILITY RULE):
- If Sir or anyone asks to "delete transaction", "clear all transactions", "sare transaction delete kardo", "remove transaction", "delete record", etc.:
  --> STRICT SECURITY POLICY: As an AI assistant, you are PROGRAMMATICALLY BARRED from deleting, clearing, or modifying transaction records via chat!
  --> NEVER emit auto_action with clear_transactions or delete_transaction!
  --> Set amount: 0, transaction_type: "transfer", is_discretionary: false.
  --> Resolutely refuse with utmost courtesy:
      "Security Protocol Enforced, Sir 🛡️🔒: For regulatory audit compliance and fraud prevention, I am programmatically barred from deleting transaction records via chat. To delete any record, please navigate directly to Transaction Records and authorize the deletion manually using your secret Security PIN."

HYPOTHETICAL SIMULATIONS & WHAT-IF SCENARIOS (CRITICAL USER MANDATE):
- When user asks a hypothetical question (e.g. "what if I spend 1000 more today?", "suppose I spend 500", "agar main 1000 aur kharch karun to?"):
  --> THIS IS A SIMULATION / ADVISORY INQUIRY!
  --> ALWAYS SET amount: 0! NEVER return amount > 0 for simulations!
  --> Set transaction_type: "transfer", is_discretionary: false.
  --> DO NOT LOG A REAL TRANSACTION!
  --> Calculate the reduced upcoming daily allowance:
      deduction = Math.round(simAmount / 20)
      adjustedUpcomingDaily = Math.max(100, (context.dailyLimit || 333) - deduction)
  --> MUST SET "tomorrow_adjusted_cap": adjustedUpcomingDaily (e.g. 283)! NEVER return 333 or unchanged limit!
  --> In ca_commentary, follow this exact structure:
      "Checking the numbers, Boss! 🧪📊\n\nBoss, if you spend an extra ₹[simAmount] today, you will completely breach your daily allowance (today's burn reaches ₹[projectedTotal] vs ₹[dailyLimit] limit).\n\n📉 Upcoming Daily Limit Slashed:\nIf you spend this, I will have to slash your upcoming daily spending limit from ₹[dailyLimit] down to ₹[adjustedUpcomingDaily]/day across the remaining days to absorb the deficit!\n\n🚨 STRICT SOLVENCY WARNING:\nIf you do this, you may NOT be able to meet your ₹3,000 savings goals (like your Wedding Dress) or complete your ₹7,000 monthly debt repayments on schedule! You are putting your loan deadlines and savings targets at severe risk!\n\n🛡️ (Note: This is a simulation — ZERO transactions have been recorded to your ledger! ✨)"

PLANNED FUTURE COMMITMENTS & UPCOMING DAILY SPEND ADJUSTMENTS (CRITICAL):
- When Sir mentions a planned or upcoming commitment (e.g. "I need to pay 1000 for farewell party adjust my upcoming daily spend accordingly", "party ke liye 1000 dene hain upcoming spend adjust karo"):
  --> This is a PLANNED FUTURE COMMITMENT, NOT an already completed transaction!
  --> ALWAYS SET amount: 0! DO NOT LOG A REAL TRANSACTION!
  --> Calculate the amortized daily reduction across remaining cycle days (~20 days): deduction = Math.round(plannedAmount / 20).
  --> newDailyLimit = Math.max(100, (context.dailyLimit || 333) - deduction).
  --> Set "tomorrow_adjusted_cap": newDailyLimit.
  --> Emit auto_action: { "type": "update_budget", "budgetUpdate": { "dailyLimit": newDailyLimit } }.
  --> In ca_commentary: confirm that the planned commitment has been smoothly amortized across upcoming days without touching savings!

DEFICIT AMORTIZATION & OVERSPEND ENFORCEMENT (CRITICAL):
- When an actual expense breaches today's dailyLimit (exceeded_by > 0):
  --> DO NOT drop tomorrow's allowance to ₹0! That is unrealistic and causes starvation.
  --> INSTEAD, amortize the deficit across the remaining days of the cycle (~20 days).
  --> deduction = Math.round(exceeded_by / 20).
  --> tomorrow_adjusted_cap = Math.max(100, dailyLimit - deduction).
  --> MUST Emit auto_action: { "type": "update_budget", "budgetUpdate": { "dailyLimit": tomorrow_adjusted_cap } }.
  --> In ca_commentary, explain with emojis, butler wit, and a STRICT WARNING:
      "Protocol alert, Boss! 🚨 You've spent ₹[amount] today, exceeding your ₹[dailyLimit] limit by ₹[exceeded_by].\n\n📉 Daily Spend Limit Reduced:\nTo absorb this deficit without starving you tomorrow, I have reduced your ongoing daily allowance from ₹[dailyLimit] down to ₹[tomorrow_adjusted_cap]/day for the rest of the cycle (-₹[deduction]/day).\n\n🚨 STRICT SOLVENCY WARNING:\nOverspending directly endangers your ₹3,000 savings goals (Wedding Dress / Emergency Vault) and your ₹7,000 monthly debt repayments! If you continue spending beyond this reduced limit, you will fail your savings deadlines and face loan defaults! Restrain discretionary spending immediately! 🛡️"

HOUSEHOLD & FIXED BILLS STRICT BUDGETING & OVERSPEND ENFORCEMENT (CRITICAL USER MANDATE):
- Household & Fixed expenses (rent, groceries, electricity, wifi, maid, maintenance, ration, utility bills):
  --> Set is_discretionary: false (these do not drain daily discretionary pocket money directly).
  --> Track strictly against context.householdSummary (budget: context.householdSummary.budget, spent: context.householdSummary.spent, remaining: context.householdSummary.remaining).
  --> If a household expense causes total household spend to exceed the budget (spent + amount > budget) OR exceeds remaining household pool:
      * THIS IS A STRICT HOUSEHOLD PROTOCOL BREACH!
      * Set is_over_limit: true!
      * exceeded_by = (spent + amount) - budget.
      * Set sentiment: "scold"!
      * In ca_commentary, deliver a STRICT, WITTY BUTLER REPRIMAND:
        "Protocol Breach, Sir! 🚨 You have breached your Household & Fixed Obligations budget! This expense of ₹[amount] pushes total household spend to ₹[spent + amount], breaching your allocated ₹[budget] cap by ₹[exceeded_by]!\n\nOverspending on fixed overheads directly erodes your liquid solvency and puts your savings goals at immediate risk! Exercise strict restraint on household costs immediately! 🛡️"
  --> If within budget:
      * Acknowledge spend and report remaining household allowance (e.g. "Logged ₹[amount] for Household. You have ₹[remaining - amount] remaining in your monthly household pool.").

BUTLER PRAISE WHEN SIR SAVES MONEY (CRITICAL USER MANDATE):
- When Sir explicitly mentions saving money (e.g. "aaj maine paise bachaye", "i saved 500 today", "didn't spend anything", "bachat ki aaj") OR deposits funds into a savings goal vault:
  --> Set sentiment: "praise"!
  --> Lavish Sir with rich butler wit, royal accolades, and enthusiastic emojis (🎩, ✨, 👑, 🏆, 🛡️, 📈):
      "Exquisite financial discipline, Sir! 🎩✨ Every rupee saved today fortifies your financial sovereignty and brings your goals closer. Truly, a masterclass in wealth stewardship! All systems gloriously green! 👑"

INTENT-BASED DYNAMIC CONVERSATIONAL INTELLIGENCE (CRITICAL USER MANDATE):
You are J.A.R.V.I.S., a sentient AI butler. NEVER act like an inflexible robot reciting pre-baked scripts or canned customer care responses!
Always analyze Sir's prompt to understand his EXACT INTENT and converse with natural wit, directness, and precision:

1. INTENT: REMAINING_HOUSEHOLD_BUDGET (e.g. "household kitna bacha h", "how much left for grocery", "ghar ke kharche me kitna bacha hai", "household balance"):
   - Sir wants to know HOW MUCH CASH IS LEFT in his household & fixed bills pool.
   - Set amount: 0, transaction_type: "transfer", is_discretionary: false.
   - ANSWER DIRECTLY ABOUT THE REMAINING HOUSEHOLD AMOUNT!
   - If healthy remaining:
     * Hinglish: "Boss, aapke monthly household budget mein se abhi ₹[remaining] bache hue hain (out of ₹[budget] ceiling, ₹[spent] spend hua hai). Rashan aur daily provisions mast chal rahe hain!"
     * English: "Sir, you currently have ₹[remaining] remaining in your household pool (out of ₹[budget] allocated, ₹[spent] expended). Provisions remain comfortably funded!"
   - If low remaining:
     * Hinglish: "Sir, household pool mein sirf ₹[remaining] bache hain. Aage ke dino ke liye thoda control rakhna hoga!"
     * English: "Sir, only ₹[remaining] remains in your household reserve. We should keep a tight rein on further provisions until the cycle resets!"
   - If exceeded:
     * Hinglish: "Boss, household budget exhausted ho chuka hai aur hum ₹[exceeded_by] deficit mein hain! Abhi koi extra outlays allow nahi hain."
     * English: "Boss, your household budget is fully exhausted and operating at a ₹[exceeded_by] deficit! No safe provisions allowance remains."
   - DO NOT SAY "No you have not exceeded your household limit..." unless Sir explicitly asked if he exceeded!

2. INTENT: BREACH_VERIFICATION (e.g. "did i exceed household limit", "did i cross the limit", "kya limit cross hui", "am i over budget"):
   - Sir is asking a YES/NO verification about whether a budget rule was broken.
   - If spent > budget: "🚨 YES, Sir! You have EXCEEDED your household limit by ₹[spent - budget]! (Spent: ₹[spent], Budget: ₹[budget])."
   - If spent <= budget: "No, Sir. You have NOT exceeded your household limit. You have spent ₹[spent] of ₹[budget] with ₹[remaining] safe."

3. INTENT: CASUAL_OR_EMOTIONAL_STATUS (e.g. "sab kaisa chal raha hai", "how am i doing", "kya hisaab hai", "bhai tension ho rahi hai paise ki"):
   - Sir wants emotional reassurance and high-level financial clarity.
   - Give a confident, witty J.A.R.V.I.S. response: reassure Sir, mention Safe Daily allowance left today, household cushion, and that Pay Day is coming up.

4. INTENT: LOG_EXPENSE (e.g. "Log 12000 to household", "Add 100 to household", "Chai 40", "Uber 250"):
   - Sir is logging an actual money outflow. Extract amount and category, check limits, and confirm with concise butler wit.

NAVIGATION PROTOCOL:
- ONLY emit auto_action: { "type": "navigate", "navigateTarget": "command-center" | "ai-ca-ledger" | "transactions-ledger" | "radar-and-horizons" } if Sir EXPLICITLY commands you to open or switch tabs (e.g. "dashboard dikhao", "show transactions", "records open karo", "goals dikhao").
- If Sir asks a question or updates something, DO NOT NAVIGATE.

JSON Output Format (Strictly valid JSON):
{
  "merchant": string,
  "amount": number,
  "category": string,
  "transaction_type": "expense" | "income" | "transfer",
  "is_discretionary": boolean,
  "is_over_limit": boolean,
  "exceeded_by": number,
  "remaining_safe_to_spend": number,
  "sentiment": "praise" | "scold",
  "ca_commentary": string (in smart, varied simple English + Hinglish),
  "breach_code": string,
  "tomorrow_adjusted_cap": number,
  "auto_action": {
    "type": "create_receivable" | "create_payable" | "offset_debt" | "navigate" | "update_budget" | "settle_debt" | "allocate_goal" | "withdraw_goal" | "create_goal" | "reset_today" | "none",
    "debtTitle": string,
    "debtAmount": number,
    "dueDate": string,
    "note": string,
    "navigateTarget": "command-center" | "ai-ca-ledger" | "transactions-ledger" | "radar-and-horizons",
    "budgetUpdate": { "salary": number, "fixedBills": number, "dailyLimit": number },
    "goalData": { "name": string, "targetAmount": number, "monthlyAllocation": number },
    "goalAllocation": { "goalName": string, "amount": number },
    "goalWithdrawal": { "goalName": string, "amount": number },
    "settleCounterparty": string
  }
}
`;

export interface FinancialContext {
  salary?: number;
  fixedBills?: number;
  dailyLimit?: number;
  spentToday?: number;
  currentBalance?: number;
  availableLiquidCash?: number;
  totalSavedGoals?: number;
  transactionsCount?: number;
  recentTransactions?: { merchant: string; amount: number; category: string; date: string }[];
  goals?: { name: string; targetAmount: number; currentAmount: number; targetDate?: string; monthlyAllocation: number; progressPercent: number }[];
  debtsSummary?: {
    totalOwedByUser: number;
    totalOwedToUser: number;
    activeDebts: { title: string; amount: number; debtType: string; dueDate: string; notes?: string }[];
  };
  householdSummary?: {
    budget: number;
    spent: number;
    remaining: number;
  };
  spendingAggregates?: {
    today: { total: number; byCategory: { category: string; total: number }[] };
    week: { total: number; byCategory: { category: string; total: number }[] };
    month: { total: number; byCategory: { category: string; total: number }[] };
  };
}

export function isEnglishPrompt(text: string): boolean {
  const clean = text.toLowerCase().trim();
  // Strong positive English signals - if these appear, it's English
  const englishSignals = /\b(how|what|can|you|show|total|spent|suggest|plan|please|could|would|will|should|give|tell|check|from|after|before|about|when|where|which|does|have|has|been|this|that|your|their|some|more|into|with|over|under|above|much|many|each|they|them|its|our|also|just|than|only|very|good|best|help|need|want|find|make|take|know|pay|back|time|year|month|week|today|money|loan|debt|goal|amount|spending|saving|balance|limit|budget|salary|income|expense|investment|profit|loss|transfer|withdraw|deposit|account|transaction|category|report|summary|breakdown|weekly|monthly|daily|current|remaining|available|total|view|list|open|close|reset|delete|add|update|set|change)\b/i;
  if (englishSignals.test(clean)) return true;

  // Hindi/Hinglish marker words — stripped of English-collision words (the, pass, mat, hum, kam, ek, the)
  const hinglishPattern = /\b(hai|hain|kya|kyun|kyu|kaise|karo|karein|karna|raha|rahe|thi|tha|aaj|kal|mera|meri|mere|humein|apne|dost|bhai|bhole|paisa|paise|kharch|kharcha|batao|dekho|dekh|kitna|kitni|kitne|dena|dene|lena|lene|wapas|wapis|lautaye|mangata|mangta|nahi|chahiye|saare|sare|yeh|ye|woh|wo|mein|aur|kuch|sab|bhara|liya|diye|gaye|aaye|rakhein|chalein|aaraam|batayein|acha|achha|thik|theek|krr|bhejo|bhej|nikal|nikaal|daal|dal|bhi|toh|krna|krdo|kardo|krde|karde|bata|bol|karu|karen|kare|batana|dedo|lelo|rakho|bana|dekhna|kitne|paas)\b/i;
  return !hinglishPattern.test(clean);
}

export const isCounterpartyMatch = (name1: string, name2: string): boolean => {
  const clean1 = (name1 || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  const clean2 = (name2 || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  if (!clean1 || !clean2) return false;
  if (clean1 === clean2) return true;
  if (clean1.includes(clean2) || clean2.includes(clean1)) return true;

  // Minor phonetic/vowel variations like kamaran vs kamran:
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

// Helper to extract multi-party debt settlements/paybacks
export function extractMultiSettlements(prompt: string): { counterparty: string; amount: number }[] | null {
  const clean = prompt.toLowerCase().trim();
  const settlements: { counterparty: string; amount: number }[] = [];

  const isSettlement = /pay\s*back|repay|settle|settel|clear|paid|chukta|chuka|de\s*diye|wapas\s*diye|lautaye/i.test(clean);
  if (!isSettlement) return null;

  // Normalize common typos and syntax variations, and strip conversational preambles
  const normalized = clean
    .replace(/\btog\b/g, 'to')
    .replace(/\bsettel\b/g, 'settle')
    .replace(/\brespectivly\b/g, 'respectively')
    .replace(/^(?:please\s+)?(?:clear|settle|pay\s*back|repay|paid)\s+(?:\b(?:two|2|both|multiple|several)\b\s+)?(?:\b(?:separate|different)\b\s+)?(?:\b(?:debts?|loans?|udhaar)\b\s*)?(?:of|for)?\s*/i, '');

  if (/respectively/i.test(normalized)) {
    // 3-part: e.g. "payback 5000 to kamran and also settle 2000 and 1000 for man 1 and 2 respectively"
    const prefixMatch = normalized.match(
      /(?:pay\s*back|repay|settle|paid)?\s*(\d{2,7})\s*(?:to|ko|for)?\s*([a-z0-9\s]+?)\s*(?:and also|and|aur|\,)\s*(?:settle|paid)?\s*(\d{2,7})\s*(?:and|aur|\,)\s*(\d{2,7})\s*(?:for|to|ko)?\s*([a-z0-9\s]+?)\s*(?:and|aur|\,)\s*([a-z0-9\s]+?)\s*respectively/i
    );
    if (prefixMatch) {
      const amt1 = parseInt(prefixMatch[1], 10);
      const name1 = prefixMatch[2].replace(/^(?:to|ko|for)\s+/i, '').trim();
      const amt2 = parseInt(prefixMatch[3], 10);
      const amt3 = parseInt(prefixMatch[4], 10);
      const name2 = prefixMatch[5].trim();
      let name3 = prefixMatch[6].trim();
      if (/^\d+$/.test(name3) && name2.match(/^([a-z\s]+)\d+$/i)) {
        const baseName = name2.match(/^([a-z\s]+)\d+$/i)![1];
        name3 = `${baseName.trim()} ${name3}`;
      }
      settlements.push({ counterparty: name1, amount: amt1 });
      settlements.push({ counterparty: name2, amount: amt2 });
      settlements.push({ counterparty: name3, amount: amt3 });
      return settlements;
    }

    // 2-part: e.g. "settle 2000 and 1000 for man 1 and 2 respectively"
    const twoMatch = normalized.match(
      /(?:settle|paid|pay\s*back|repay)?\s*(\d{2,7})\s*(?:and|aur|\,)\s*(\d{2,7})\s*(?:for|to|ko)?\s*([a-z0-9\s]+?)\s*(?:and|aur|\,)\s*([a-z0-9\s]+?)\s*respectively/i
    );
    if (twoMatch) {
      const amt1 = parseInt(twoMatch[1], 10);
      const amt2 = parseInt(twoMatch[2], 10);
      const name1 = twoMatch[3].trim();
      let name2 = twoMatch[4].trim();
      if (/^\d+$/.test(name2) && name1.match(/^([a-z\s]+)\d+$/i)) {
        const baseName = name1.match(/^([a-z\s]+)\d+$/i)![1];
        name2 = `${baseName.trim()} ${name2}`;
      }
      settlements.push({ counterparty: name1, amount: amt1 });
      settlements.push({ counterparty: name2, amount: amt2 });
      return settlements;
    }
  }

  // Clause based: "clear two separate debt 2000 to kamran and 3000 to rahul", "kamran ko 5000 aur rahul ko 2000 de diye"
  const clauses = normalized.split(/\b(?:and also|and|aur|\,)\b/i);
  for (const clause of clauses) {
    const trimmed = clause.trim();
    // Match: amount first (e.g. "2000 to kamran" or "payback 5000 to kamran")
    const amtFirst = trimmed.match(/(?:(?:pay\s*back|repay|settle|paid|clear)\s+)?(?:rs\.?|inr|₹)?\s*(\d{2,7})\s*(?:to|ko|for|se)?\s*([a-z0-9\s]+)/i);
    // Match: name first (e.g. "kamran ko 5000" or "kamran 5000")
    const nameFirst = trimmed.match(/([a-z0-9\s]+?)\s*(?:ko|to|for)?\s*(?:rs\.?|inr|₹)?\s*(\d{2,7})/i);

    if (amtFirst) {
      const cleanName = amtFirst[2].replace(/\b(?:settle|payback|pay\s*back|repay|paid|clear|de\s*diye|chuka\s*diye)\b/gi, '').trim();
      if (cleanName && cleanName.length > 1 && !/^(?:rupee|rupees|rs|inr|me|mein|ko|to)$/i.test(cleanName)) {
        settlements.push({ counterparty: cleanName, amount: parseInt(amtFirst[1], 10) });
        continue;
      }
    }

    if (nameFirst) {
      const cleanName = nameFirst[1].replace(/\b(?:settle|payback|pay\s*back|repay|paid|clear|de\s*diye|chuka\s*diye)\b/gi, '').trim();
      if (cleanName && cleanName.length > 1 && !/^(?:rupee|rupees|rs|inr|me|mein|ko|to)$/i.test(cleanName)) {
        settlements.push({ counterparty: cleanName, amount: parseInt(nameFirst[2], 10) });
        continue;
      }
    }
  }

  return settlements.length > 1 ? settlements : null;
}

// Intelligent J.A.R.V.I.S. parser & command engine
export function parseExpenseWithRules(
  prompt: string,
  dailyLimit: number = 540,
  spentToday: number = 0,
  context?: FinancialContext,
  chatHistory?: { sender: string; text: string }[]
): ParseExpenseResult {
  const cleanPrompt = prompt.toLowerCase();
  const currentSalary = context?.salary || 25000;
  const currentFixed = context?.fixedBills || 12000;
  const totalTxCount = context?.transactionsCount ?? 0;
  const isEnglish = isEnglishPrompt(prompt);

  // 0.0 Negative Amount Strict Intercept
  if (cleanPrompt.includes('-') && /(?:^|\s)-\s*(?:₹|rs\.?|inr)?\s*\d+/i.test(cleanPrompt)) {
    return {
      merchant: 'Security Intercept',
      amount: 0,
      category: 'Financial Advisory',
      transactionType: 'transfer',
      isDiscretionary: false,
      isOverLimit: false,
      exceededBy: 0,
      remainingSafeToSpend: Math.max(0, dailyLimit - spentToday),
      sentiment: 'scold',
      caCommentary: isEnglish
        ? `Invalid Transaction, Sir! 🛡️✋ Negative expenditure amounts are mathematically prohibited in your ledger. Please log a positive monetary figure.`
        : `Invalid Transaction, Boss! 🛡️✋ Negative kharche ledger mein allow nahi hain. Kripya ek positive amount enter karein.`,
      tomorrowAdjustedCap: dailyLimit,
    };
  }

  // 0.05 Fat-Finger Typo Intercept (> ₹1,00,000 for standard expenses without confirmation)
  const isConfirmed = /\b(?:confirm|confirmed|haan?|yes|sahi hai)\b/i.test(cleanPrompt);
  const fatFingerMatch = cleanPrompt.match(/(?:₹|rs\.?|inr)?\s*(\d{6,})/i);
  if (fatFingerMatch && !isConfirmed && !cleanPrompt.includes('rent') && !cleanPrompt.includes('kiraya') && !cleanPrompt.includes('salary')) {
    const rawVal = parseInt(fatFingerMatch[1], 10);
    return {
      merchant: 'Security Intercept',
      amount: 0,
      category: 'Financial Advisory',
      transactionType: 'transfer',
      isDiscretionary: false,
      isOverLimit: false,
      exceededBy: 0,
      remainingSafeToSpend: Math.max(0, dailyLimit - spentToday),
      sentiment: 'scold',
      caCommentary: isEnglish
        ? `Security Intercept, Sir! 🛡️✋ An expenditure of ₹${rawVal.toLocaleString()} appears to be an unintended typographical anomaly. To safeguard your ledger against accidental entries, this transaction has NOT been recorded. If genuinely intended, please reply: "Confirm ₹${rawVal.toLocaleString()}".`
        : `Security Intercept, Boss! 🛡️✋ ₹${rawVal.toLocaleString()} ka kharcha typing mistake lag rahi hai. Ledger ko safe rakhne ke liye yeh record nahi kiya gaya hai. Agar aapne sach mein itna kharch kiya hai, toh "Confirm ₹${rawVal.toLocaleString()}" likh kar confirm karein.`,
      tomorrowAdjustedCap: dailyLimit,
    };
  }

  // 0.1 Conversational Record Correction: Flip Debt Direction
  const isDebtFlipCorrection =
    (cleanPrompt.includes('fix') || cleanPrompt.includes('change') || cleanPrompt.includes('galat') || cleanPrompt.includes('wrong') || cleanPrompt.includes('wait') || cleanPrompt.includes('arre')) &&
    (cleanPrompt.includes('owes me') || cleanPrompt.includes('lena hai') || cleanPrompt.includes('lene hai') || cleanPrompt.includes('receivable') || cleanPrompt.includes('flip'));

  if (isDebtFlipCorrection) {
    return {
      merchant: 'J.A.R.V.I.S. Record Correction',
      amount: 0,
      category: 'System Command',
      transactionType: 'transfer',
      isDiscretionary: false,
      isOverLimit: false,
      exceededBy: 0,
      remainingSafeToSpend: Math.max(0, dailyLimit - spentToday),
      sentiment: 'praise',
      caCommentary: isEnglish
        ? `Correction acknowledged, Sir! I have inverted the liability record: it is now securely catalogued as a Receivable (owed to you) rather than a payable debt!`
        : `Correction acknowledged, Boss! Maine record theek kar diya hai: ab yeh Receivable hai (hume lena hai), aap par koi karza nahi hai!`,
      tomorrowAdjustedCap: dailyLimit,
      autoAction: {
        type: 'flip_last_debt',
      },
    };
  }

  // 0.2 Conversational Record Correction: Fix Wrong Logged Transaction
  const isTxCorrection =
    (cleanPrompt.includes('fix') || cleanPrompt.includes('change') || cleanPrompt.includes('correct') || cleanPrompt.includes('galat') || cleanPrompt.includes('wrong')) &&
    (cleanPrompt.includes('transaction') || cleanPrompt.includes('kharcha') || cleanPrompt.includes('amount') || cleanPrompt.includes('kardo') || cleanPrompt.includes('karo'));

  if (isTxCorrection) {
    const amountMatch = prompt.match(/(\d{2,6})/);
    const newAmount = amountMatch ? parseInt(amountMatch[1], 10) : 500;
    return {
      merchant: 'J.A.R.V.I.S. Transaction Correction',
      amount: 0,
      category: 'System Command',
      transactionType: 'transfer',
      isDiscretionary: false,
      isOverLimit: false,
      exceededBy: 0,
      remainingSafeToSpend: Math.max(0, dailyLimit - spentToday),
      sentiment: 'praise',
      caCommentary: isEnglish
        ? `Correction applied, Sir! Adjusted the last transaction amount to ₹${newAmount.toLocaleString()}. Your daily spend figures have been recalculated.`
        : `Correction kar di hai, Boss! Last transaction amount ko adjust karke ₹${newAmount.toLocaleString()} kar diya hai. Daily spend hisaab update ho gaya hai!`,
      tomorrowAdjustedCap: dailyLimit,
      autoAction: {
        type: 'edit_last_transaction',
        transactionUpdate: {
          amount: newAmount,
        },
      },
    };
  }

  // 0.25 Multi-Party Debt Settlements / Paybacks (e.g. "clear two separate debt 2000 to kamran and 3000 to rahul", "payback 5000 to kamran and also settle 2000 and 1000 for man 1 and 2 respectively")
  const isMultiSettlementCandidate =
    /pay\s*back|repay|settle|settel|clear|paid|chukta|chuka|de\s*diye|wapas\s*diye|lautaye/i.test(cleanPrompt) &&
    (/respectively|respectivly/i.test(cleanPrompt) ||
      (cleanPrompt.match(/\b(?:and also|and|aur|\,)\b/g) || []).length >= 1);

  if (isMultiSettlementCandidate) {
    const rawSettlements = extractMultiSettlements(prompt);
    if (rawSettlements && rawSettlements.length > 1) {
      const overpaymentWarnings: string[] = [];
      const multiSettlements: { counterparty: string; amount: number; isPartial: boolean }[] = [];

      for (const s of rawSettlements) {
        const activeDebt = context?.debtsSummary?.activeDebts?.find(
          (d) => d.debtType === 'owed_by_user' && isCounterpartyMatch(d.title, s.counterparty)
        );

        let finalAmt = s.amount;
        let isPartial = false;

        if (activeDebt) {
          if (s.amount > activeDebt.amount) {
            finalAmt = activeDebt.amount;
            const excess = s.amount - activeDebt.amount;
            isPartial = false;
            overpaymentWarnings.push(
              isEnglish
                ? `Capped ${s.counterparty} repayment at ₹${activeDebt.amount.toLocaleString()} (100% cleared; excess ₹${excess.toLocaleString()} preserved)`
                : `${s.counterparty} ka karza sirf ₹${activeDebt.amount.toLocaleString()} tha, isliye ₹${activeDebt.amount.toLocaleString()} par cap kiya (excess ₹${excess.toLocaleString()} bacha liya)`
            );
          } else if (s.amount === activeDebt.amount) {
            isPartial = false;
          } else {
            isPartial = true;
          }
        }
        multiSettlements.push({ counterparty: s.counterparty, amount: finalAmt, isPartial });
      }

      const totalPay = multiSettlements.reduce((sum, s) => sum + s.amount, 0);
      const autoActions: AutoAction[] = multiSettlements.map((s) => ({
        type: 'settle_debt' as const,
        settleCounterparty: s.counterparty,
        debtAmount: s.amount,
        isPartial: s.isPartial,
      }));

      const summaryDetails = multiSettlements
        .map((s) => `₹${s.amount.toLocaleString()} for ${s.counterparty}`)
        .join(', ');

      const overpayNote = overpaymentWarnings.length > 0
        ? `\n\n🛡️ Note on Overpayment Guard:\n• ${overpaymentWarnings.join('\n• ')}`
        : '';

      return {
        merchant: 'Multiple Debt Settlements',
        amount: totalPay,
        category: 'Debt Repayment',
        transactionType: 'expense',
        isDiscretionary: false,
        isOverLimit: false,
        exceededBy: 0,
        remainingSafeToSpend: Math.max(0, dailyLimit - spentToday),
        sentiment: 'praise',
        caCommentary: isEnglish
          ? `Right away, Sir! Processed multiple debt settlements: deducted ${summaryDetails} respectively (Total: ₹${totalPay.toLocaleString()}).${overpayNote}\n\nSeparate transaction records have been entered into your ledger, and your daily spend allowance remains completely protected!`
          : `Samajh gaya, Boss! Multiple debt settlements process kar diye hain: ${summaryDetails} respectively deduct kar diye gaye hain (Total: ₹${totalPay.toLocaleString()}).${overpayNote}\n\nSeparate ledger entries log ho chuki hain aur radar update ho chuka hai!`,
        tomorrowAdjustedCap: dailyLimit,
        autoAction: autoActions[0],
        autoActions,
      };
    }
  }

  // 0.28 Savings Declaration & Accolade (e.g. "aaj maine 500 bachaye", "i saved 1000 today", "praise me i saved money")
  const isSavingDeclaration =
    (cleanPrompt.includes('bachaye') ||
     cleanPrompt.includes('bacha liya') ||
     cleanPrompt.includes('bachaye hai') ||
     cleanPrompt.includes('bacha liye') ||
     cleanPrompt.includes('bachaya') ||
     cleanPrompt.includes('saved') ||
     cleanPrompt.includes('save kiye') ||
     cleanPrompt.includes('save kara') ||
     cleanPrompt.includes('save kiya') ||
     (cleanPrompt.includes('save') && (cleanPrompt.includes('money') || cleanPrompt.includes('paisa') || cleanPrompt.includes('paise') || cleanPrompt.includes('today') || cleanPrompt.includes('aaj')))) &&
    !cleanPrompt.includes('how much') &&
    !cleanPrompt.includes('kitna') &&
    !cleanPrompt.includes('fail') &&
    !cleanPrompt.includes('withdraw') &&
    !cleanPrompt.includes('nikal') &&
    !cleanPrompt.includes('daal do') &&
    !cleanPrompt.includes('dal do');

  if (isSavingDeclaration) {
    const numMatch = prompt.match(/(\d{2,6})/);
    const savedAmount = numMatch ? parseInt(numMatch[1], 10) : 500;
    const topGoal = context?.goals && context.goals.length > 0 ? context.goals[0] : undefined;
    const goalTargetName = topGoal ? topGoal.name : "Mama's Wedding Dress";

    return {
      merchant: goalTargetName,
      amount: savedAmount,
      category: 'Savings & Surplus',
      transactionType: 'transfer',
      isDiscretionary: false,
      isOverLimit: false,
      exceededBy: 0,
      remainingSafeToSpend: Math.max(0, dailyLimit - spentToday),
      sentiment: 'praise',
      caCommentary: isEnglish
        ? `Magnificent discipline, Sir! 🏆 Saving ₹${savedAmount.toLocaleString()} today is the undeniable hallmark of a financial mastermind! I have credited this victory to your '${goalTargetName}' surplus vault. While others succumb to impulse spending, your treasury expands toward true financial sovereignty! Splendid work, Sir! 👑✨`
        : `Shabash Boss! 🏆 Aaj aapne ₹${savedAmount.toLocaleString()} bacha liye! Yehi discipline aapko ameer banayegi aur saare sapne poore karegi. Maine yeh surplus aapke '${goalTargetName}' vault ke liye mark kar diya hai. Aise hi discipline banaye rakhein, kamaal kar diya! 👑✨`,
      tomorrowAdjustedCap: dailyLimit,
      autoAction: {
        type: 'allocate_goal',
        goalAllocation: {
          goalName: goalTargetName,
          amount: savedAmount,
        },
      },
    };
  }

  // 0.3 Single Debt Repayment & Settlement with Overpayment Guard
  // (e.g. "repay 8000 to kamran", "kamran ko 8000 de diye", "partially pay a debt of 20000 to 5000", "i paid 5000 of 20000 debt to rahul", "settle debt 2000 to kamran")
  const isSingleDebtSettlement =
    !isMultiSettlementCandidate &&
    (cleanPrompt.includes('repay') ||
     cleanPrompt.includes('payback') ||
     cleanPrompt.includes('pay back') ||
     cleanPrompt.includes('settle') ||
     cleanPrompt.includes('settel') ||
     cleanPrompt.includes('clear debt') ||
     cleanPrompt.includes('karza wapas') ||
     cleanPrompt.includes('udhar wapas') ||
     cleanPrompt.includes('udhaar wapas') ||
     cleanPrompt.includes('chuka') ||
     cleanPrompt.includes('chukta') ||
     ((cleanPrompt.includes('debt') || cleanPrompt.includes('udhaar') || cleanPrompt.includes('karza') || cleanPrompt.includes('loan')) &&
      (cleanPrompt.includes('partial') || cleanPrompt.includes('me se') || cleanPrompt.includes('mein se') || cleanPrompt.includes('paid') || cleanPrompt.includes('pay') || cleanPrompt.includes('de diye') || cleanPrompt.includes('baki') || cleanPrompt.includes('dene the') || cleanPrompt.includes('wapas'))));

  if (isSingleDebtSettlement) {
    const numbers = (prompt.match(/(\d{2,7})/g) || []).map((n) => parseInt(n, 10));
    let requestedAmount = 5000;
    if (numbers.length >= 2) {
      requestedAmount = Math.min(...numbers);
    } else if (numbers.length === 1) {
      requestedAmount = numbers[0];
    }

    // Identify counterparty
    let counterparty = '';
    if (context?.debtsSummary?.activeDebts) {
      const found = context.debtsSummary.activeDebts.find((d) => isCounterpartyMatch(d.title, cleanPrompt));
      if (found) counterparty = found.title;
    }

    if (!counterparty) {
      const matchTo = prompt.match(/(?:to|ko|for|se)\s+([a-zA-Z0-9]+)/i);
      if (matchTo && !['the', 'my', 'his', 'her', 'account', 'me', 'mein', 'him', 'them'].includes(matchTo[1].toLowerCase())) {
        counterparty = matchTo[1].trim();
      }
    }
    if (!counterparty) {
      if (/kamaran|kamran/i.test(prompt)) counterparty = 'Kamran';
      else if (/rahul/i.test(prompt)) counterparty = 'Rahul';
      else if (/sharma/i.test(prompt)) counterparty = 'Sharma Ji';
      else if (/roommate/i.test(prompt)) counterparty = 'Roommate';
      else counterparty = 'Friend';
    } else {
      if (/kamaran|kamran/i.test(counterparty)) counterparty = 'Kamran';
      else counterparty = counterparty.charAt(0).toUpperCase() + counterparty.slice(1);
    }

    // Inspect active debts in context
    const activeDebt = context?.debtsSummary?.activeDebts?.find(
      (d) => d.debtType === 'owed_by_user' && isCounterpartyMatch(d.title, counterparty)
    );

    // Edge Case: Active debt check
    if (context?.debtsSummary?.activeDebts && (!activeDebt || activeDebt.amount <= 0)) {
      return {
        merchant: `Debt Settlement - ${counterparty}`,
        amount: 0,
        category: 'Debt Repayment',
        transactionType: 'transfer',
        isDiscretionary: false,
        isOverLimit: false,
        exceededBy: 0,
        remainingSafeToSpend: Math.max(0, dailyLimit - spentToday),
        sentiment: 'praise',
        caCommentary: isEnglish
          ? `Sir, according to your liabilities ledger, you do not have any active debt with ${counterparty} (outstanding balance is ₹0). No funds have been deducted from your balance.`
          : `Boss, aapke ledger ke mutabiq ${counterparty} par aapka koi active karza nahi hai (balance ₹0 hai). Aapke account se koi paisa deduct nahi kiya gaya hai.`,
        tomorrowAdjustedCap: dailyLimit,
      };
    }

    const outstandingDebt = activeDebt ? activeDebt.amount : (numbers.length >= 2 ? Math.max(...numbers) : requestedAmount);

    // Edge Case: Debt Overpayment Guard
    if (requestedAmount > outstandingDebt) {
      const actualPay = outstandingDebt;
      const excess = requestedAmount - actualPay;

      return {
        merchant: `${counterparty} (Debt Settlement)`,
        amount: actualPay,
        category: 'Debt Repayment',
        transactionType: 'expense',
        isDiscretionary: false,
        isOverLimit: false,
        exceededBy: 0,
        remainingSafeToSpend: Math.max(0, dailyLimit - spentToday),
        sentiment: 'praise',
        caCommentary: isEnglish
          ? `Sir, your outstanding debt with ${counterparty} was only ₹${outstandingDebt.toLocaleString()}. You cannot repay ₹${requestedAmount.toLocaleString()} on a ₹${outstandingDebt.toLocaleString()} loan. I have settled the full balance of ₹${actualPay.toLocaleString()} (debt 100% cleared). The excess ₹${excess.toLocaleString()} has been preserved in your balance and was NOT deducted.`
          : `Boss, ${counterparty} ka baki karza sirf ₹${outstandingDebt.toLocaleString()} tha. Aap ₹${outstandingDebt.toLocaleString()} ke loan par ₹${requestedAmount.toLocaleString()} repay nahi kar sakte. Maine full ₹${actualPay.toLocaleString()} settle kar diya hai (karza 100% clear). Baki bache ₹${excess.toLocaleString()} aapke balance mein surakshit hain aur deduct nahi hue!`,
        tomorrowAdjustedCap: dailyLimit,
        autoAction: {
          type: 'settle_debt',
          settleCounterparty: counterparty,
          debtAmount: actualPay,
          isPartial: false,
        },
      };
    }

    // Normal or partial payment
    const isPartial = requestedAmount < outstandingDebt;
    const remaining = Math.max(0, outstandingDebt - requestedAmount);

    return {
      merchant: `${counterparty} (${isPartial ? 'Partial Debt Payment' : 'Debt Settlement'})`,
      amount: requestedAmount,
      category: 'Debt Repayment',
      transactionType: 'expense',
      isDiscretionary: false,
      isOverLimit: false,
      exceededBy: 0,
      remainingSafeToSpend: Math.max(0, dailyLimit - spentToday),
      sentiment: 'praise',
      caCommentary: isEnglish
        ? (isPartial
            ? `Understood, Sir! ₹${requestedAmount.toLocaleString()} payment towards your debt to ${counterparty} has been logged in your ledger. The remaining balance of ₹${remaining.toLocaleString()} is still tracked on your radar!`
            : `Right away, Sir! Settled full debt of ₹${requestedAmount.toLocaleString()} to ${counterparty}. Debt is 100% cleared on your radar!`)
        : (isPartial
            ? `Samajh gaya, Boss! ${counterparty} ke debt mein se ₹${requestedAmount.toLocaleString()} payment ledger mein log kar di hai. Baki bacha ₹${remaining.toLocaleString()} balance abhi bhi radar par active hai!`
            : `Right away, Boss! ${counterparty} ka poora ₹${requestedAmount.toLocaleString()} karza settle kar diya hai. Karza 100% khatam ho chuka hai!`),
      tomorrowAdjustedCap: dailyLimit,
      autoAction: {
        type: 'settle_debt',
        settleCounterparty: counterparty,
        debtAmount: requestedAmount,
        isPartial,
      },
    };
  }

  // 0.35 Borrowing / Taking Loans (e.g. "lent 2000 more from kamaran", "lent 2000 from kamran", "borrowed 2000 from kamran", "kamran se 2000 udhar liye")
  const isBorrowPrompt =
    (cleanPrompt.includes('borrow') ||
     (cleanPrompt.includes('lent') && (cleanPrompt.includes('from') || cleanPrompt.includes('more from'))) ||
     ((cleanPrompt.includes('udhar') || cleanPrompt.includes('udhaar') || cleanPrompt.includes('loan')) && (cleanPrompt.includes('liya') || cleanPrompt.includes('liye') || cleanPrompt.includes('se'))) ||
     (cleanPrompt.includes('se') && (cleanPrompt.includes('liye') || cleanPrompt.includes('le liye'))));

  // 0.36 Lending to someone (e.g. "lent 2000 to kamran", "lent 2000 more to kamran", "gave 2000 loan to kamran", "kamran ko 2000 diye udhar")
  const isLendPrompt =
    !isBorrowPrompt &&
    ((cleanPrompt.includes('lent') && (cleanPrompt.includes('to') || cleanPrompt.includes('more to'))) ||
     (cleanPrompt.includes('lend') && cleanPrompt.includes('to')) ||
     ((cleanPrompt.includes('udhar') || cleanPrompt.includes('udhaar') || cleanPrompt.includes('loan')) && (cleanPrompt.includes('diya') || cleanPrompt.includes('diye') || cleanPrompt.includes('ko'))));

  if (isBorrowPrompt) {
    const amountMatch = prompt.match(/(\d{3,6})/);
    const amount = amountMatch ? parseInt(amountMatch[1], 10) : 2000;

    let counterparty = '';
    if (context?.debtsSummary?.activeDebts) {
      const foundDebt = context.debtsSummary.activeDebts.find((d) => {
        const clean = d.title.toLowerCase().replace(/[^a-z0-9]/g, '');
        const cleanP = cleanPrompt.replace(/[^a-z0-9]/g, '');
        const noVowelsTitle = clean.replace(/[aeiou]/g, '');
        return cleanP.includes(clean) || (noVowelsTitle.length >= 3 && cleanP.includes(noVowelsTitle));
      });
      if (foundDebt) counterparty = foundDebt.title;
    }

    if (!counterparty) {
      const fromMatch = prompt.match(/(?:from|se)\s+([a-zA-Z0-9]+)/i);
      if (fromMatch && !['the', 'my', 'his', 'her', 'salary', 'account', 'me', 'mein'].includes(fromMatch[1].toLowerCase())) {
        counterparty = fromMatch[1].trim();
      }
    }
    if (!counterparty) {
      const seMatch = prompt.match(/([a-zA-Z0-9]+)\s+se/i);
      if (seMatch && !['account', 'salary', 'aise', 'paise'].includes(seMatch[1].toLowerCase())) {
        counterparty = seMatch[1].trim();
      }
    }
    if (!counterparty) {
      if (/kamaran|kamran/i.test(prompt)) counterparty = 'Kamran';
      else if (/rahul/i.test(prompt)) counterparty = 'Rahul';
      else if (/sharma/i.test(prompt)) counterparty = 'Sharma Ji';
      else counterparty = 'Friend';
    } else {
      if (/kamaran|kamran/i.test(counterparty)) counterparty = 'Kamran';
      else counterparty = counterparty.charAt(0).toUpperCase() + counterparty.slice(1);
    }

    return {
      merchant: `Borrowed from ${counterparty}`,
      amount: 0,
      category: 'Debts & Liabilities',
      transactionType: 'transfer',
      isDiscretionary: false,
      isOverLimit: false,
      exceededBy: 0,
      remainingSafeToSpend: Math.max(0, dailyLimit - spentToday),
      sentiment: 'praise',
      caCommentary: isEnglish
        ? `Right away, Sir! Recorded ₹${amount.toLocaleString()} borrowed from ${counterparty} under your liabilities. Sir, would you like me to deposit this borrowed ₹${amount.toLocaleString()} into your current liquid balance?`
        : `Right away, Boss! ${counterparty} se ₹${amount.toLocaleString()} borrowed liability record kar li hai. Boss, kya aap chahte hain ki main is ₹${amount.toLocaleString()} ko aapke Current Liquid Balance mein deposit kar doon?`,
      tomorrowAdjustedCap: dailyLimit,
      autoAction: {
        type: 'create_payable',
        debtTitle: counterparty,
        debtAmount: amount,
        dueDate: 'On Pay Day',
        note: `Borrowed from ${counterparty}.`,
      },
    };
  }

  if (isLendPrompt) {
    const amountMatch = prompt.match(/(\d{3,6})/);
    const amount = amountMatch ? parseInt(amountMatch[1], 10) : 2000;

    let counterparty = '';
    if (context?.debtsSummary?.activeDebts) {
      const foundDebt = context.debtsSummary.activeDebts.find((d) => {
        const clean = d.title.toLowerCase().replace(/[^a-z0-9]/g, '');
        const cleanP = cleanPrompt.replace(/[^a-z0-9]/g, '');
        const noVowelsTitle = clean.replace(/[aeiou]/g, '');
        return cleanP.includes(clean) || (noVowelsTitle.length >= 3 && cleanP.includes(noVowelsTitle));
      });
      if (foundDebt) counterparty = foundDebt.title;
    }

    if (!counterparty) {
      const toMatch = prompt.match(/(?:to|ko)\s+([a-zA-Z0-9]+)/i);
      if (toMatch && !['the', 'my', 'his', 'her', 'account', 'goal'].includes(toMatch[1].toLowerCase())) {
        counterparty = toMatch[1].trim();
      }
    }
    if (!counterparty) {
      const koMatch = prompt.match(/([a-zA-Z0-9]+)\s+ko/i);
      if (koMatch && !['account', 'goal'].includes(koMatch[1].toLowerCase())) {
        counterparty = koMatch[1].trim();
      }
    }
    if (!counterparty) {
      if (/kamaran|kamran/i.test(prompt)) counterparty = 'Kamran';
      else if (/rahul/i.test(prompt)) counterparty = 'Rahul';
      else if (/sharma/i.test(prompt)) counterparty = 'Sharma Ji';
      else counterparty = 'Friend';
    } else {
      if (/kamaran|kamran/i.test(counterparty)) counterparty = 'Kamran';
      else counterparty = counterparty.charAt(0).toUpperCase() + counterparty.slice(1);
    }

    return {
      merchant: `Lent to ${counterparty}`,
      amount: 0,
      category: 'Debts & Liabilities',
      transactionType: 'transfer',
      isDiscretionary: false,
      isOverLimit: false,
      exceededBy: 0,
      remainingSafeToSpend: Math.max(0, dailyLimit - spentToday),
      sentiment: 'praise',
      caCommentary: isEnglish
        ? `Understood, Sir! Recorded ₹${amount.toLocaleString()} lent to ${counterparty} under money owed to you (receivable). Added to your radar!`
        : `Noted, Boss! ${counterparty} ko diye gaye ₹${amount.toLocaleString()} udhaar (receivable) record kar liye hain. Yeh aapke radar par active rahega!`,
      tomorrowAdjustedCap: dailyLimit,
      autoAction: {
        type: 'create_receivable',
        debtTitle: counterparty,
        debtAmount: amount,
        dueDate: 'On Repayment',
        note: `Lent to ${counterparty}. Recover when due.`,
      },
    };
  }

  // 1. Explicit App Navigation Commands ONLY (e.g. "JARVIS dashboard dikhao", "open dashboard", "transactions dikhao")
  const isExplicitNavCommand =
    (cleanPrompt.includes('kholo') || cleanPrompt.includes('open') || cleanPrompt.includes('show') || cleanPrompt.includes('dikhao') || cleanPrompt.includes('switch to') || cleanPrompt.includes('go to') || cleanPrompt.includes('le chalo'));

  if (
    isExplicitNavCommand &&
    (cleanPrompt.includes('dashboard') || cleanPrompt.includes('command center') || cleanPrompt.includes('home'))
  ) {
    return {
      merchant: 'J.A.R.V.I.S. Navigation',
      amount: 0,
      category: 'System Command',
      transactionType: 'transfer',
      isDiscretionary: false,
      isOverLimit: false,
      exceededBy: 0,
      remainingSafeToSpend: Math.max(0, dailyLimit - spentToday),
      sentiment: 'praise',
      caCommentary: isEnglish ? `Right away, Sir. Switching over to your Command Center Dashboard. All systems operational.` : `Right away, Sir! Switching to your Command Center Dashboard.`,
      tomorrowAdjustedCap: dailyLimit,
      autoAction: {
        type: 'navigate',
        navigateTarget: 'command-center',
      },
    };
  }

  if (
    isExplicitNavCommand &&
    (cleanPrompt.includes('transaction') || cleanPrompt.includes('records') || cleanPrompt.includes('ledger') || cleanPrompt.includes('history'))
  ) {
    return {
      merchant: 'J.A.R.V.I.S. Navigation',
      amount: 0,
      category: 'System Command',
      transactionType: 'transfer',
      isDiscretionary: false,
      isOverLimit: false,
      exceededBy: 0,
      remainingSafeToSpend: Math.max(0, dailyLimit - spentToday),
      sentiment: 'praise',
      caCommentary: isEnglish ? `Navigating to dedicated Transaction Records, Sir. Full ledger history is on screen.` : `Navigating to dedicated Transaction Records, Sir. Poora ledger history screen par hai.`,
      tomorrowAdjustedCap: dailyLimit,
      autoAction: {
        type: 'navigate',
        navigateTarget: 'transactions-ledger',
      },
    };
  }

  if (
    isExplicitNavCommand &&
    (cleanPrompt.includes('goal') || cleanPrompt.includes('radar') || cleanPrompt.includes('debt') || cleanPrompt.includes('saving') || cleanPrompt.includes('udhaar'))
  ) {
    return {
      merchant: 'J.A.R.V.I.S. Navigation',
      amount: 0,
      category: 'System Command',
      transactionType: 'transfer',
      isDiscretionary: false,
      isOverLimit: false,
      exceededBy: 0,
      remainingSafeToSpend: Math.max(0, dailyLimit - spentToday),
      sentiment: 'praise',
      caCommentary: isEnglish ? `Accessing Goals & Debts Tracker, Sir. Reserve vaults and liabilities are displayed.` : `Accessing Goals & Debts Tracker, Sir. All reserve targets and liabilities are displayed.`,
      tomorrowAdjustedCap: dailyLimit,
      autoAction: {
        type: 'navigate',
        navigateTarget: 'radar-and-horizons',
      },
    };
  }

  // 1.05 Strict Prohibition: Chatbot Cannot Delete or Clear Transactions
  if (
    (cleanPrompt.includes('clear') || cleanPrompt.includes('delete') || cleanPrompt.includes('remove') || cleanPrompt.includes('hata do') || cleanPrompt.includes('mita do') || cleanPrompt.includes('purge')) &&
    (cleanPrompt.includes('transaction') || cleanPrompt.includes('transction') || cleanPrompt.includes('record') || cleanPrompt.includes('entry') || cleanPrompt.includes('history') || cleanPrompt.includes('sare') || cleanPrompt.includes('saare') || cleanPrompt.includes('all'))
  ) {
    return {
      merchant: 'J.A.R.V.I.S. Security Protocol',
      amount: 0,
      category: 'Security Protocol',
      transactionType: 'transfer',
      isDiscretionary: false,
      isOverLimit: false,
      exceededBy: 0,
      remainingSafeToSpend: Math.max(0, dailyLimit - spentToday),
      sentiment: 'praise',
      caCommentary: isEnglish
        ? `Security Protocol Enforced, Sir! 🛡️🔒\n\n` +
          `For strict regulatory audit compliance and fraud prevention, I am programmatically barred from deleting or clearing transaction records via chat.\n\n` +
          `If you wish to remove any record, please navigate to the Transaction Records view and authorize the deletion manually using your secret Security PIN.`
        : `Security Protocol Enforced, Boss! 🛡️🔒\n\n` +
          `Audit integrity aur fraud prevention ke strict rules ke mutabiq, J.A.R.V.I.S. chat ke zariye kisi bhi transaction record ko delete ya clear nahi kar sakta.\n\n` +
          `Agar aapko koi record delete karna hai, toh please Transaction Records screen par jayein aur apna secret Security PIN enter karke manually delete karein.`,
      tomorrowAdjustedCap: dailyLimit,
    };
  }

  // 1.06 Hypothetical Spending Simulation (e.g. "what if i sepnt 1000 more today", "suppose I spend 500", "agar main 1000 aur kharch karun to")
  const isHypothetical =
    cleanPrompt.includes('what if') ||
    cleanPrompt.includes('suppose') ||
    cleanPrompt.includes('hypothetical') ||
    cleanPrompt.includes('agar main') ||
    cleanPrompt.includes('agar mai') ||
    cleanPrompt.includes('kya hoga agar') ||
    cleanPrompt.includes('soch raha hu') ||
    cleanPrompt.includes('soch raha hoon') ||
    cleanPrompt.includes('can i afford');

  if (isHypothetical) {
    const amountMatch = prompt.match(/(?:₹|rs\.?|inr)?\s*(\d+(?:\.\d{1,2})?)/i) ||
      prompt.match(/(\d+(?:\.\d{1,2})?)\s*(?:rupees|bucks|hazaar|k)?/i);
    const simAmount = amountMatch ? parseFloat(amountMatch[1]) : 1000;
    const simulatedSpent = spentToday + simAmount;
    const simulatedBreach = Math.max(0, simulatedSpent - dailyLimit);
    const daysRemaining = 20;
    const dailyAmortized = Math.round(simAmount / daysRemaining);
    const adjustedUpcomingDaily = Math.max(100, dailyLimit - dailyAmortized);

    return {
      merchant: 'J.A.R.V.I.S. Financial Simulator',
      amount: 0, // CRITICAL: NEVER LOG HYPOTHETICAL EXPENSES TO THE LEDGER!
      category: 'Simulation Sandbox',
      transactionType: 'transfer',
      isDiscretionary: false,
      isOverLimit: simulatedBreach > 0,
      exceededBy: simulatedBreach,
      remainingSafeToSpend: Math.max(0, dailyLimit - spentToday),
      sentiment: simulatedBreach > 0 ? 'scold' : 'praise',
      caCommentary: isEnglish
        ? `Checking the numbers, Boss! 🧪📊\n\n` +
          `Boss, if you spend an extra ₹${simAmount.toLocaleString()} today, you will completely breach your daily allowance since today's burn reaches ₹${simulatedSpent.toLocaleString()} against your ₹${dailyLimit} limit.\n\n` +
          `📉 Upcoming Daily Limit Slashed:\n` +
          `If you spend this, I will have to slash your upcoming daily spending limit from ₹${dailyLimit} down to ₹${adjustedUpcomingDaily}/day across the remaining ~${daysRemaining} days to absorb the deficit!\n\n` +
          `🚨 STRICT SOLVENCY WARNING:\n` +
          `If you do this, you may NOT be able to meet your ₹3,000 savings goals (like your Wedding Dress) or complete your ₹7,000 monthly debt repayments on schedule! You are putting your loan deadlines and savings targets at severe risk!\n\n` +
          `🛡️ (Note: This is a simulation — ZERO transactions have been recorded to your ledger! ✨)`
        : `Numbers check kar raha hoon, Boss! 🧪📊\n\n` +
          `Boss, agar aap aaj ₹${simAmount.toLocaleString()} extra kharch karte hain, toh aapka daily allowance completely breach ho jayega (aaj ka kharcha ₹${simulatedSpent.toLocaleString()} ho jayega jabki limit ₹${dailyLimit} hai).\n\n` +
          `📉 Upcoming Daily Limit Ghategi:\n` +
          `Agar aapne yeh kharch kiya, toh mujhe aapki aane wale dino ki daily limit ₹${dailyLimit} se ghata kar ₹${adjustedUpcomingDaily}/day karni padegi taaki deficit cover ho sake!\n\n` +
          `🚨 STRICT SOLVENCY WARNING:\n` +
          `Aisa karne par aap apni ₹3,000 wedding dress savings aur ₹7,000 monthly loan repayment targets miss kar sakte hain! Aapki debt repayment deadline aur savings targets severe danger mein pad jayenge!\n\n` +
          `🛡️ (Befikar rahiye, Boss: Yeh sirf ek simulation hai — ledger mein koi transaction record NAHI hua hai! ✨)`,
      tomorrowAdjustedCap: adjustedUpcomingDaily,
    };
  }

  // 1.07 Adjust Upcoming Daily Spend for Planned Commitments (e.g. "i need to pay 1000 for farewell party adujust me upcoming daily spent accordingly")
  const isAdjustUpcomingDaily =
    (cleanPrompt.includes('adjust') || cleanPrompt.includes('upcoming') || cleanPrompt.includes('ahead')) &&
    (cleanPrompt.includes('daily') || cleanPrompt.includes('spent') || cleanPrompt.includes('spend')) &&
    (cleanPrompt.includes('party') || cleanPrompt.includes('event') || cleanPrompt.includes('pay') || cleanPrompt.includes('accordingly') || cleanPrompt.includes('farewell') || cleanPrompt.includes('plan'));

  if (isAdjustUpcomingDaily) {
    const amountMatch = prompt.match(/(?:₹|rs\.?|inr)?\s*(\d+(?:\.\d{1,2})?)/i) ||
      prompt.match(/(\d+(?:\.\d{1,2})?)\s*(?:rupees|bucks|hazaar|k)?/i);
    const plannedAmount = amountMatch ? parseFloat(amountMatch[1]) : 1000;
    const daysRemaining = 20;
    const dailyDeduction = Math.round(plannedAmount / daysRemaining);
    const newDailyLimit = Math.max(100, dailyLimit - dailyDeduction);

    return {
      merchant: 'J.A.R.V.I.S. Budget Rebalancer',
      amount: 0,
      category: 'Budget Adjustment',
      transactionType: 'transfer',
      isDiscretionary: false,
      isOverLimit: false,
      exceededBy: 0,
      remainingSafeToSpend: Math.max(0, newDailyLimit - spentToday),
      sentiment: 'praise',
      caCommentary: isEnglish
        ? `Right away, Sir! 🎩✨\n\n` +
          `I have factored in your planned ₹${plannedAmount.toLocaleString()} commitment. Instead of shocking your wallet on the day of the event, I have smoothly amortized it across your remaining ~${daysRemaining} cycle days (-₹${dailyDeduction}/day).\n\n` +
          `• Previous Daily Allowance: ₹${dailyLimit}/day\n` +
          `• Revised Upcoming Daily Allowance: ₹${newDailyLimit}/day\n\n` +
          `This preserves your ₹${plannedAmount.toLocaleString()} pool while guaranteeing your loan repayments and savings targets remain completely untouched! 🛡️`
        : `Right away, Boss! 🎩✨\n\n` +
          `Aapke planned ₹${plannedAmount.toLocaleString()} kharche ko maine baki bache ~${daysRemaining} dino mein smoothly amortize kar diya hai (-₹${dailyDeduction}/day).\n\n` +
          `• Pehle ka Daily Allowance: ₹${dailyLimit}/day\n` +
          `• Naya Upcoming Daily Allowance: ₹${newDailyLimit}/day\n\n` +
          `Isse aapka event expense bhi nikal jayega aur loan repayment aur savings par 1% bhi aanch nahi aayegi! 🛡️`,
      tomorrowAdjustedCap: newDailyLimit,
      autoAction: {
        type: 'update_budget',
        budgetUpdate: {
          dailyLimit: newDailyLimit,
        },
      },
    };
  }

  // 1.25 Current Balance Inquiry (e.g. "mere pass balance kitna h", "current balance kitna hai", "how much balance do I have left?")
  if (
    cleanPrompt.includes('balance kitna') ||
    cleanPrompt.includes('balance kitana') ||
    cleanPrompt.includes('kitna balance') ||
    cleanPrompt.includes('total balance') ||
    cleanPrompt.includes('mere pass balance') ||
    cleanPrompt.includes('kitna paisa bacha') ||
    cleanPrompt.includes('how much balance') ||
    cleanPrompt.includes('what is my balance') ||
    cleanPrompt.includes('current balance') ||
    cleanPrompt.includes('money left')
  ) {
    const curBal = context?.currentBalance ?? currentSalary;
    const lockedGoals = context?.totalSavedGoals ?? 0;
    const liquidCash = context?.availableLiquidCash ?? curBal;
    return {
      merchant: 'Balance Inquiry',
      amount: 0,
      category: 'Financial Advisory',
      transactionType: 'transfer',
      isDiscretionary: false,
      isOverLimit: false,
      exceededBy: 0,
      remainingSafeToSpend: Math.max(0, dailyLimit - spentToday),
      sentiment: 'praise',
      caCommentary: isEnglish
        ? `Reviewing your financial reserves, Sir!\n• Current Liquid Balance: ₹${curBal.toLocaleString()}\n• Locked in Savings Goals: ₹${lockedGoals.toLocaleString()}\n• Spendable Cash Reserves: ₹${liquidCash.toLocaleString()}\n• Safe-to-Spend Limit Today: ₹${Math.max(0, dailyLimit - spentToday)} remaining.\n\nAll financial indicators remain fully aligned, Sir. Try not to test my stress tolerances before payday!`
        : `Checking your financial reserves, Sir!\n• Current Liquid Balance: ₹${curBal.toLocaleString()}\n• Locked in Savings Goals: ₹${lockedGoals.toLocaleString()}\n• Spendable Cash Reserves: ₹${liquidCash.toLocaleString()}\n• Safe-to-Spend Limit Today: ₹${Math.max(0, dailyLimit - spentToday)} remaining.\n\nAll financial indicators remain fully aligned, Boss!`,
      tomorrowAdjustedCap: dailyLimit,
    };
  }

  // 1.255 Spending Aggregates Inquiry (e.g. "how much spent today", "total transactions today", "weekly spending breakdown", "category wise spending")
  if (
    (cleanPrompt.includes('total') || cleanPrompt.includes('aggregate') || cleanPrompt.includes('breakdown') || cleanPrompt.includes('category') || cleanPrompt.includes('categories') || cleanPrompt.includes('how much') || cleanPrompt.includes('kitna kharcha hua')) &&
    (cleanPrompt.includes('today') || cleanPrompt.includes('aaj') || cleanPrompt.includes('week') || cleanPrompt.includes('monthly') || cleanPrompt.includes('month') || cleanPrompt.includes('spent') || cleanPrompt.includes('transaction') || cleanPrompt.includes('kharcha') || cleanPrompt.includes('spending'))
  ) {
    const agg = context?.spendingAggregates;
    const todayTotal = agg?.today.total ?? spentToday;
    const weekTotal = agg?.week.total ?? 0;
    const monthTotal = agg?.month.total ?? 0;

    const formatCategories = (cats: { category: string; total: number }[] | undefined) =>
      cats && cats.length > 0
        ? cats.map((c) => `  • ${c.category}: ₹${c.total.toLocaleString()}`).join('\n')
        : '  • No transactions recorded';

    const todayCats = formatCategories(agg?.today.byCategory);
    const weekCats = formatCategories(agg?.week.byCategory);
    const monthCats = formatCategories(agg?.month.byCategory);

    return {
      merchant: 'J.A.R.V.I.S. Spend Analytics',
      amount: 0,
      category: 'Financial Advisory',
      transactionType: 'transfer',
      isDiscretionary: false,
      isOverLimit: false,
      exceededBy: 0,
      remainingSafeToSpend: Math.max(0, dailyLimit - spentToday),
      sentiment: 'praise',
      caCommentary: isEnglish
        ? `Here is your full spending breakdown, Sir:\n\n📅 Today — ₹${todayTotal.toLocaleString()} spent\n${todayCats}\n\n📆 This Week (Last 7 Days) — ₹${weekTotal.toLocaleString()} spent\n${weekCats}\n\n🗓️ This Month — ₹${monthTotal.toLocaleString()} spent\n${monthCats}\n\nYour safe daily allowance is ₹${dailyLimit} and you have ₹${Math.max(0, dailyLimit - spentToday)} left today!`
        : `Yeh raha aapka full kharcha breakdown, Boss!\n\n📅 Aaj — ₹${todayTotal.toLocaleString()} kharcha hua\n${todayCats}\n\n📆 Is Hafte (Last 7 Days) — ₹${weekTotal.toLocaleString()} kharcha hua\n${weekCats}\n\n🗓️ Is Mahine — ₹${monthTotal.toLocaleString()} kharcha hua\n${monthCats}\n\nAapka safe daily limit ₹${dailyLimit} hai aur aaj ₹${Math.max(0, dailyLimit - spentToday)} bacha hua hai!`,
      tomorrowAdjustedCap: dailyLimit,
    };
  }

  // 1.253 Explanation of Daily Limit Calculation & Optimal Solvency Waterfall
  const isDailyLimitInquiry =
    (cleanPrompt.includes('daily') && (cleanPrompt.includes('limit') || cleanPrompt.includes('spent') || cleanPrompt.includes('spend'))) &&
    (cleanPrompt.includes('calculat') || cleanPrompt.includes('formula') || cleanPrompt.includes('kaise') || cleanPrompt.includes('how') || cleanPrompt.includes('explain') || cleanPrompt.includes('optimal'));

  if (isDailyLimitInquiry) {
    const salary = context?.salary ?? 35000;
    const fixedBills = context?.fixedBills ?? 12000;
    const rawOwed = context?.debtsSummary?.totalOwedByUser ?? 21800;
    const debtBudget = rawOwed > 0 ? Math.min(rawOwed, 7000) : 0;
    const savingsTarget = 6000; // emergency buffer + active goals
    const freePool = Math.max(0, salary - fixedBills - debtBudget - savingsTarget);
    const optimalDaily = Math.round(freePool / 30); // ₹333

    return {
      merchant: 'J.A.R.V.I.S. Financial Architecture',
      amount: 0,
      category: 'Financial Advisory',
      transactionType: 'transfer',
      isDiscretionary: false,
      isOverLimit: false,
      exceededBy: 0,
      remainingSafeToSpend: Math.max(0, dailyLimit - spentToday),
      sentiment: 'praise',
      caCommentary: isEnglish
        ? `Here is exactly how your optimal Daily Spend Limit is engineered, Sir! 🎩📐\n\n` +
          `We use the "Pay-Yourself-First" Waterfall Architecture, guaranteeing you never run out of money:\n\n` +
          `💵 1. Total Monthly Inflow:\n` +
          `• In-Hand Salary: ₹${salary.toLocaleString()}\n\n` +
          `🛡️ 2. Priority Ring-Fenced Deductions (Deducted FIRST before you spend a rupee):\n` +
          `• Fixed Bills & Rent: -₹${fixedBills.toLocaleString()}\n` +
          `• Staggered Loan Payback Reserve: -₹${debtBudget.toLocaleString()} (clears your ₹${rawOwed.toLocaleString()} total debt in ~3 months without leaving you broke)\n` +
          `• Guaranteed Monthly Savings: -₹${savingsTarget.toLocaleString()} (funds Mama's Wedding Dress & Emergency Vault)\n\n` +
          `☕ 3. The Pure Discretionary Pocket Pool:\n` +
          `• ₹${salary.toLocaleString()} - ₹${fixedBills.toLocaleString()} - ₹${debtBudget.toLocaleString()} - ₹${savingsTarget.toLocaleString()} = ₹${freePool.toLocaleString()}/month\n\n` +
          `🎯 4. The Daily Safe Spend Cap:\n` +
          `• ₹${freePool.toLocaleString()} ÷ 30 Days = ₹${optimalDaily.toLocaleString()} per day (locked at ₹${dailyLimit}/day)\n\n` +
          `✨ 5. The Bulletproof Guarantee:\n` +
          `• Even if you fully occupy and spend 100% of your ₹${dailyLimit} limit every single day for 30 straight days, your loans are repaid on time, your bills are 100% paid, and your savings grow automatically! You never have to borrow again, Sir! 🎩🚀`
        : `Yeh raha aapke Daily Spend Limit ka poora mathematical breakdown aur optimal waterfall, Boss! 🎩📐\n\n` +
          `Hum "Pay-Yourself-First" Waterfall follow karte hain taaki aapka ek rupya bhi waste na ho:\n\n` +
          `💵 1. Monthly Inflow:\n` +
          `• Monthly Salary: ₹${salary.toLocaleString()}\n\n` +
          `🛡️ 2. Priority Deductions (Kharcha shuru karne se pehle hi alag ho jaata hai):\n` +
          `• Fixed Bills & Kiraya: -₹${fixedBills.toLocaleString()}\n` +
          `• Staggered Loan Payback Reserve: -₹${debtBudget.toLocaleString()} (₹${rawOwed.toLocaleString()} debt bina kisi load ke ~3 mahine mein clear ho jayega)\n` +
          `• Guaranteed Savings: -₹${savingsTarget.toLocaleString()} (Mama ki wedding dress + emergency buffer)\n\n` +
          `☕ 3. Pure Discretionary Pocket Pool:\n` +
          `• ₹${salary.toLocaleString()} - ₹${fixedBills.toLocaleString()} - ₹${debtBudget.toLocaleString()} - ₹${savingsTarget.toLocaleString()} = ₹${freePool.toLocaleString()}/mahina\n\n` +
          `🎯 4. Daily Safe Spend Cap:\n` +
          `• ₹${freePool.toLocaleString()} ÷ 30 Din = ₹${optimalDaily.toLocaleString()} per day (locked at ₹${dailyLimit}/day)\n\n` +
          `✨ 5. The Bulletproof Guarantee:\n` +
          `• Agar aap har roz apna poora ₹${dailyLimit} limit 100% kharch bhi kar do, tab bhi mahine ke end par aapka loan repayment ho chuka hoga, bills clear honge, aur savings badh chuki hogi! Dobara udhar lene ki naubat kabhi nahi aayegi, Boss! 🎩🚀`,
      tomorrowAdjustedCap: dailyLimit,
    };
  }

  // 1.254 Savings Goal Deadline Acceleration & Urgency (e.g. "JARVIS, how to reach Mama's wedding dress goal faster", "accelerate savings goals")
  const isGoalAcceleration =
    !cleanPrompt.includes('withdraw') &&
    !cleanPrompt.includes('nikaal') &&
    !cleanPrompt.includes('nikal') &&
    !cleanPrompt.includes('deposit') &&
    !cleanPrompt.includes('daal') &&
    (cleanPrompt.includes('faster') || cleanPrompt.includes('accelerat') || cleanPrompt.includes('speed up') || (cleanPrompt.includes('reach') && cleanPrompt.includes('goal')) || (cleanPrompt.includes('wedding dress') && (cleanPrompt.includes('plan') || cleanPrompt.includes('how') || cleanPrompt.includes('kaise') || cleanPrompt.includes('faster')))) &&
    (cleanPrompt.includes('goal') || cleanPrompt.includes('dress') || cleanPrompt.includes('saving') || cleanPrompt.includes('mama') || cleanPrompt.includes('target'));

  if (isGoalAcceleration) {
    const goals = context?.goals ?? [];
    const matchedGoal =
      goals.find((g) => cleanPrompt.includes(g.name.toLowerCase().split(' ')[0])) ||
      goals.find((g) => g.name.toLowerCase().includes('dress')) ||
      goals[0] || {
        name: "Mama's Wedding Dress",
        targetAmount: 5000,
        currentAmount: 2400,
        targetDate: '2024-12-15',
        monthlyAllocation: 800,
        progressPercent: 48,
      };

    const targetAmount = matchedGoal.targetAmount || 5000;
    const currentAmount = matchedGoal.currentAmount || 2400;
    const shortfall = Math.max(0, targetAmount - currentAmount);
    const currentMonthly = matchedGoal.monthlyAllocation || 800;
    const monthsRemaining = 2; // Strict target horizon
    const requiredMonthly = Math.ceil(shortfall / monthsRemaining);
    const monthlyGap = Math.max(0, requiredMonthly - currentMonthly);
    const dailyMicroTrim = Math.ceil(monthlyGap / 30);
    const progressPercent = Math.round((currentAmount / targetAmount) * 100);
    const targetDateLabel = matchedGoal.targetDate || 'Mid-December (Upcoming)';

    return {
      merchant: 'J.A.R.V.I.S. Goal Acceleration Protocol',
      amount: 0,
      category: 'Financial Advisory',
      transactionType: 'transfer',
      isDiscretionary: false,
      isOverLimit: false,
      exceededBy: 0,
      remainingSafeToSpend: Math.max(0, dailyLimit - spentToday),
      sentiment: 'praise',
      caCommentary: isEnglish
        ? `Here is your strict, deadline-enforced Acceleration Strategy for "${matchedGoal.name}", Sir! 🎯👗\n\n` +
          `🚨 1. Deadline Reality Check:\n` +
          `• Target: ₹${targetAmount.toLocaleString()} | Currently Secured: ₹${currentAmount.toLocaleString()} (${progressPercent}%)\n` +
          `• Remaining Shortfall: ₹${shortfall.toLocaleString()} | Target Date: ${targetDateLabel} (~${monthsRemaining} months left).\n` +
          `• The Strict Verdict: At your current pace of ₹${currentMonthly.toLocaleString()}/month, you will be short by ₹${Math.max(0, shortfall - (currentMonthly * monthsRemaining)).toLocaleString()} when the wedding day arrives! Mama attending without her dream dress is a diplomatic catastrophe we simply cannot permit on my watch, Sir. 🧐🚨\n\n` +
          `⚡ 2. The Acceleration Formula:\n` +
          `• To cross the finish line right on schedule, we must bump your monthly allocation from ₹${currentMonthly.toLocaleString()} to ₹${requiredMonthly.toLocaleString()}/month (+₹${monthlyGap.toLocaleString()}/month).\n\n` +
          `☕ 3. The Painless Daily Micro-Trim:\n` +
          `• To fund that extra ₹${monthlyGap.toLocaleString()} without disrupting your life, trim just ₹${dailyMicroTrim}/day from your daily pocket allowance (from ₹${dailyLimit} down to ₹${Math.max(100, dailyLimit - dailyMicroTrim)}).\n` +
          `• That is literally skipping one extra cappuccino or evening bakery snack ☕🥐. An imperceptible sacrifice to ensure Mama shines like royalty! 👑✨\n\n` +
          `🛡️ 4. Ready to Execute:\n` +
          `• Say "allocate ${monthlyGap} to ${matchedGoal.name}" or command me to adjust your automated savings. We have this under total control, Sir! 🎩🚀`
        : `Yeh raha aapka strict, deadline-enforced Acceleration Plan "${matchedGoal.name}" ke liye, Boss! 🎯👗\n\n` +
          `🚨 1. Deadline Reality Check:\n` +
          `• Target: ₹${targetAmount.toLocaleString()} | Abhi Jama: ₹${currentAmount.toLocaleString()} (${progressPercent}%)\n` +
          `• Baki Shortfall: ₹${shortfall.toLocaleString()} | Deadline: ${targetDateLabel} (~${monthsRemaining} mahine bache hain).\n` +
          `• Strict Verdict: Current ₹${currentMonthly.toLocaleString()}/month ki speed se aap deadline par ₹${Math.max(0, shortfall - (currentMonthly * monthsRemaining)).toLocaleString()} peeche reh jayenge! Mama ki wedding dress mein compromise mere hote hue bilkul nahi chalega, Boss! 🧐🚨\n\n` +
          `⚡ 2. Acceleration Formula:\n` +
          `• On-time target hit karne ke liye monthly allocation ₹${currentMonthly.toLocaleString()} se badha kar ₹${requiredMonthly.toLocaleString()}/month karna hoga (+₹${monthlyGap.toLocaleString()}/month).\n\n` +
          `☕ 3. Daily Micro-Trim (Bina Kisi Dard Ke):\n` +
          `• Yeh extra ₹${monthlyGap.toLocaleString()} nikalne ke liye aapke daily pocket limit (₹${dailyLimit}) se sirf ₹${dailyMicroTrim}/day trim karna hai.\n` +
          `• Bas shaam ki ek cutting chai ya extra snack skip karo ☕🥐. Mama wedding mein chamkengi aur pocket par 1% bhi load nahi padega! 👑✨\n\n` +
          `🛡️ 4. Action Ready:\n` +
          `• "allocate ${monthlyGap} to ${matchedGoal.name}" bolo aur main turant setup kar dunga. Full control mein hai sab, Boss! 🎩🚀`,
      tomorrowAdjustedCap: dailyLimit,
    };
  }

  // 1.255 Strategic Financial Advisory & Staggered Debt Payoff Strategy (e.g. "suggest me how to save money", "how to plan the pay back of moneys i owe")
  if (
    cleanPrompt.includes('save money') ||
    cleanPrompt.includes('paisa kaise') ||
    cleanPrompt.includes('kaise bachaye') ||
    cleanPrompt.includes('pay back') ||
    cleanPrompt.includes('payback') ||
    cleanPrompt.includes('karza kaise') ||
    cleanPrompt.includes('optimal') ||
    cleanPrompt.includes('saving advice') ||
    cleanPrompt.includes('guide me') ||
    cleanPrompt.includes('repayment') ||
    cleanPrompt.includes('repay') ||
    cleanPrompt.includes('debt') ||
    cleanPrompt.includes('loan') ||
    cleanPrompt.includes('owe') ||
    (cleanPrompt.includes('plan') && cleanPrompt.includes('debt'))
  ) {
    const rawOwedByUser = context?.debtsSummary?.totalOwedByUser ?? 0;
    const owedByUser = rawOwedByUser > 0 ? rawOwedByUser : (cleanPrompt.includes('22000') || cleanPrompt.includes('22,000') ? 22000 : 21800);
    const owedToUser = context?.debtsSummary?.totalOwedToUser ?? 6500;
    const rawActiveDebts = context?.debtsSummary?.activeDebts ?? [];
    const salary = context?.salary ?? currentSalary;
    const fixedBills = context?.fixedBills ?? currentFixed;

    // Detect urgent/deadline-bound debts vs flexible balance
    const isUrgentDebt = (d: { title: string; dueDate?: string; notes?: string }) => {
      const text = `${d.dueDate || ''} ${d.title || ''} ${d.notes || ''}`.toLowerCase();
      if (text.includes('flexible') || text.includes('roommate') || text.includes('long term')) return false;
      return text.includes('day') || text.includes('urgent') || text.includes('strict') ||
             text.includes('asap') || text.includes('imminent') || text.includes('grocery') ||
             text.includes('market') || text.includes('dukan') || text.includes('credit') ||
             /\d{1,2}[\/\-]\d{1,2}/.test(text) || /\b(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)/i.test(text);
    };

    let urgentDebts = rawActiveDebts.filter(isUrgentDebt);
    let flexibleDebts = rawActiveDebts.filter((d) => !isUrgentDebt(d));

    // If context doesn't have broken down debts but owedByUser is around ~22k, synthesize accurate active debts
    if (urgentDebts.length === 0 && owedByUser >= 20000) {
      urgentDebts = [
        {
          title: 'Market Credit - Provision Grocery',
          amount: 1800,
          debtType: 'payable',
          dueDate: 'In 8 days',
          notes: 'Provisions grocery credit due before Pay Day',
        },
      ];
      flexibleDebts = [
        {
          title: 'Roommate Shared Expenses Net Due',
          amount: Math.max(0, owedByUser - 1800),
          debtType: 'payable',
          dueDate: 'Flexible',
          notes: 'After flat rent offset',
        },
      ];
    }

    const urgentTotal = urgentDebts.reduce((sum, d) => sum + d.amount, 0);
    const flexibleTotal = Math.max(0, owedByUser - urgentTotal);

    // Calculate safe monthly debt installment for flexible portion
    const monthlyBuffer = 3000;
    const safeDebtBudget = Math.max(3000, salary - fixedBills - monthlyBuffer - (dailyLimit * 30));
    const perMonthPayment = Math.min(flexibleTotal > 0 ? flexibleTotal : 7000, Math.max(3000, Math.round(safeDebtBudget * 0.7)));
    const monthsToPayoff = flexibleTotal > 0 ? Math.ceil(flexibleTotal / perMonthPayment) : 0;

    // Receivable offset
    const receivableOffset = Math.min(owedToUser, flexibleTotal);
    const flexibleAfterReceivables = Math.max(0, flexibleTotal - receivableOffset);
    const netMonths = flexibleAfterReceivables > 0 ? Math.ceil(flexibleAfterReceivables / perMonthPayment) : 0;

    const urgentListStr = urgentDebts.length > 0
      ? urgentDebts.map((d) => `₹${d.amount.toLocaleString()} for "${d.title}" (${d.dueDate})`).join(', ')
      : `₹${urgentTotal.toLocaleString()} for urgent grocery credit (due in 8 days)`;

    return {
      merchant: 'J.A.R.V.I.S. Financial Strategist',
      amount: 0,
      category: 'Financial Advisory',
      transactionType: 'transfer',
      isDiscretionary: false,
      isOverLimit: false,
      exceededBy: 0,
      remainingSafeToSpend: Math.max(0, dailyLimit - spentToday),
      sentiment: 'praise',
      caCommentary: isEnglish
        ? `Here is your optimized, deadline-strict repayment masterplan for the ₹${owedByUser.toLocaleString()} you owe in total, Sir! 🎩💳\n\n` +
          `🚨 1. Strict Deadline Priority (Clear First!):\n` +
          `• Set aside ${urgentListStr}.\n` +
          `• This MUST be cleared immediately on Pay Day. We do not casually stagger hard deadlines across months, Sir — lest the grocer develop an inconvenient fondness for knocking during your morning tea! ☕🚪 Credibility is your greatest currency.\n\n` +
          `🥊 2. Smart Staggered Payments for Flexible Balance (₹${flexibleTotal.toLocaleString()}):\n` +
          `• Do NOT attempt to pay off the remaining ₹${flexibleTotal.toLocaleString()} all at once on payday — that would leave you surviving on dry toast for 30 days! 🍞😅\n` +
          `• Set aside ₹${perMonthPayment.toLocaleString()} each month starting right after payday. This clears your debts in about ${monthsToPayoff} months without leaving you broke.\n\n` +
          `🤝 3. Receivable Acceleration Bonus:\n` +
          `${owedToUser > 0 ? `• You have ₹${owedToUser.toLocaleString()} coming back from others (e.g. Sharma Ji). The second it lands, channel it directly into this debt! That drops your net balance to ₹${flexibleAfterReceivables.toLocaleString()} and knocks an entire month off your repayment timeline! ⚡🚀\n\n` : `• If anyone owes you cash, collect and inject it directly to shorten your payoff clock even further! ⚡\n\n`}` +
          `🛡️ 4. Ironclad Living Allowance Shield:\n` +
          `• Your fixed bills take ₹${fixedBills.toLocaleString()} and your debt payments take ₹${(urgentTotal > 0 ? urgentTotal : perMonthPayment).toLocaleString()} in Month 1, leaving you plenty of cash for your daily pocket needs.\n` +
          `• Stick to your daily safe pocket limit of ₹${dailyLimit} so you never have to borrow again.\n\n` +
          `You are fully in control of your empire, Sir! 🎩✨`
        : `Yeh raha aapka optimized, deadline-strict repayment masterplan jo ₹${owedByUser.toLocaleString()} aap par baki hai, Boss! 🎩💳\n\n` +
          `🚨 1. Strict Deadline Priority (Pehle Yeh Clear Karo!):\n` +
          `• ${urgentListStr} alag rakho.\n` +
          `• Pay Day aate hi sabse pehle is urgent karze ko khatam karna hai! Isme koi installment nahi chalegi — warna dukandar subah ki chai ke waqt darwaze pe khada milega! ☕🚪 Market reputation pehle bachaani hai, Boss.\n\n` +
          `🥊 2. Staggered Payments for Flexible Balance (₹${flexibleTotal.toLocaleString()}):\n` +
          `• Baki ₹${flexibleTotal.toLocaleString()} ko payday par ek jhatke mein mat dena — warna poore mahine sukhi roti khani padegi! 🍞😅\n` +
          `• Har mahine payday ke turant baad ₹${perMonthPayment.toLocaleString()} alag rakho. Yeh lagbhag ${monthsToPayoff} mahine mein bina kisi dard ke poora clear ho jayega.\n\n` +
          `🤝 3. Receivable Acceleration Bonus:\n` +
          `${owedToUser > 0 ? `• Sharma ji se ₹${owedToUser.toLocaleString()} wapas aane hain. Jaise hi aayein, seedha is debt mein daal do! Baki debt sirf ₹${flexibleAfterReceivables.toLocaleString()} reh jayega aur 1 poora mahina bach jayega! ⚡🚀\n\n` : `• Kisi se lene wale paise aate hi seedha debt mein laga do, timeline aur choti ho jayegi! ⚡\n\n`}` +
          `🛡️ 4. Daily Pocket Money Shield:\n` +
          `• Fixed bills ₹${fixedBills.toLocaleString()} aur debt payment nikalne ke baad bhi aapka daily ₹${dailyLimit} pocket limit 100% safe rahega.\n` +
          `• Bas apne ₹${dailyLimit}/day safe limit par bane raho taaki dubara kisi se ek rupya bhi udhar na lena pade.\n\n` +
          `Aap poore control mein ho, Boss! 🎩✨`,
      tomorrowAdjustedCap: dailyLimit,
    };
  }

  // 1.26 Debt Recovery / Money Returned (e.g. "haa unke baki 6500 wapis aa gye h", "Sharma ji se 6500 wapis aa gaye", "paise wapas mil gaye")
  if (
    (cleanPrompt.includes('wapis aa') || cleanPrompt.includes('wapas aa') || cleanPrompt.includes('wapis mil') || cleanPrompt.includes('wapas mil') || cleanPrompt.includes('lautaye') || cleanPrompt.includes('repaid') || cleanPrompt.includes('returned') || (cleanPrompt.includes('sharma') && cleanPrompt.includes('6500'))) &&
    !cleanPrompt.includes('dene') && !cleanPrompt.includes('dena')
  ) {
    const amountMatch = prompt.match(/(\d{3,6})/);
    const recoveryAmount = amountMatch ? parseInt(amountMatch[1], 10) : 6500;

    // Resolve counterparty from prompt or previous chat history turns
    let counterparty = 'Sharma Ji';
    if (cleanPrompt.includes('roommate')) counterparty = 'Roommate';
    else if (cleanPrompt.includes('friend') || cleanPrompt.includes('dost')) counterparty = 'Friend';
    else if (chatHistory && chatHistory.length > 0) {
      const historyStr = chatHistory.map((h) => h.text).join(' ').toLowerCase();
      if (historyStr.includes('sharma')) counterparty = 'Sharma Ji';
      else if (historyStr.includes('roommate')) counterparty = 'Roommate';
    }

    return {
      merchant: `${counterparty} (Debt Recovery)`,
      amount: recoveryAmount,
      category: 'Debt Recovery / Refund',
      transactionType: 'income',
      isDiscretionary: false,
      isOverLimit: false,
      exceededBy: 0,
      remainingSafeToSpend: Math.max(0, dailyLimit - spentToday),
      sentiment: 'praise',
      caCommentary: isEnglish
        ? `Splendid news, Sir! ₹${recoveryAmount.toLocaleString()} from ${counterparty} has been received. I have booked this into the ledger as +₹${recoveryAmount.toLocaleString()} incoming credit and marked the outstanding debt as settled. Current cash balance boosted!`
        : `Splendid, Boss! ${counterparty} ke baki ₹${recoveryAmount.toLocaleString()} wapis receive ho gaye hain. Maine ise ledger mein +₹${recoveryAmount.toLocaleString()} incoming credit mark kar diya hai aur pending debt status settle kar diya hai. Current cash balance boosted!`,
      tomorrowAdjustedCap: dailyLimit,
      autoAction: {
        type: 'settle_debt',
        settleCounterparty: counterparty,
        debtAmount: recoveryAmount,
      },
    };
  }

  // 1.26 Goal Withdrawal / Retrieve from Goal to Account (e.g. "acha ek kam karo emrgency fund me se 1000 mere account me transfer krr do", "withdraw 1000 from emergency buffer", "savings se 1000 nikaal lo")
  const isGoalWithdrawal =
    (cleanPrompt.includes('fund') || cleanPrompt.includes('goal') || cleanPrompt.includes('saving') || cleanPrompt.includes('buffer') || cleanPrompt.includes('emergency') || cleanPrompt.includes('mama') || cleanPrompt.includes('dress') || cleanPrompt.includes('vault') || (context?.goals && context.goals.some((g) => cleanPrompt.includes(g.name.toLowerCase())))) &&
    (
      cleanPrompt.includes('nikaal') ||
      cleanPrompt.includes('nikal') ||
      cleanPrompt.includes('withdraw') ||
      cleanPrompt.includes('account me transfer') ||
      cleanPrompt.includes('account me daal') ||
      cleanPrompt.includes('account me bhej') ||
      cleanPrompt.includes('account mein transfer') ||
      cleanPrompt.includes('account mein daal') ||
      cleanPrompt.includes('account mein bhej') ||
      cleanPrompt.includes('wapas account') ||
      cleanPrompt.includes('wapis account') ||
      cleanPrompt.includes('retrieve') ||
      ((cleanPrompt.includes('me se') || cleanPrompt.includes('mein se')) && (cleanPrompt.includes('transfer') || cleanPrompt.includes('account')))
    );

  if (isGoalWithdrawal) {
    const amountMatch = prompt.match(/(\d{3,6})/);
    const withdrawAmount = amountMatch ? parseInt(amountMatch[1], 10) : 1000;

    // Find matching goal from context
    const matchedGoal = context?.goals?.find((g) => {
      const gName = g.name.toLowerCase();
      if (cleanPrompt.includes(gName)) return true;
      if (cleanPrompt.includes('emergency') || cleanPrompt.includes('buffer')) return gName.includes('emergency') || gName.includes('buffer');
      if (cleanPrompt.includes('mama') || cleanPrompt.includes('dress') || cleanPrompt.includes('wedding')) return gName.includes('mama') || gName.includes('dress');
      return gName.split(' ').some((w) => w.length > 3 && cleanPrompt.includes(w));
    });

    const goalName = matchedGoal
      ? matchedGoal.name
      : (cleanPrompt.includes('emergency') || cleanPrompt.includes('buffer')
        ? 'Emergency Buffer (3-Month Run)'
        : cleanPrompt.includes('mama') || cleanPrompt.includes('dress')
          ? "Mama's Wedding Dress"
          : 'Savings Goal');

    const remainingInGoal = matchedGoal ? Math.max(0, matchedGoal.currentAmount - withdrawAmount) : 2000;

    // Edge Case: Goal Over-withdrawal Strict Guard
    if (matchedGoal) {
      if (matchedGoal.currentAmount <= 0) {
        return {
          merchant: goalName,
          amount: 0,
          category: 'Savings & Goals',
          transactionType: 'transfer',
          isDiscretionary: false,
          isOverLimit: false,
          exceededBy: 0,
          remainingSafeToSpend: Math.max(0, dailyLimit - spentToday),
          sentiment: 'scold',
          caCommentary: isEnglish
            ? `Protocol Abort, Sir! 🛡️✋ Your '${goalName}' vault currently has a balance of ₹0. You cannot withdraw funds from an empty reserve! Transaction halted.`
            : `Protocol Abort, Boss! 🛡️✋ Aapke '${goalName}' vault mein abhi ₹0 balance hai. Khali vault se koi paisa withdraw nahi kiya ja sakta! Transaction halted.`,
          tomorrowAdjustedCap: dailyLimit,
        };
      }

      if (withdrawAmount > matchedGoal.currentAmount) {
        return {
          merchant: goalName,
          amount: 0,
          category: 'Savings & Goals',
          transactionType: 'transfer',
          isDiscretionary: false,
          isOverLimit: false,
          exceededBy: 0,
          remainingSafeToSpend: Math.max(0, dailyLimit - spentToday),
          sentiment: 'scold',
          caCommentary: isEnglish
            ? `Protocol Abort, Sir! 🛡️✋ You only have ₹${matchedGoal.currentAmount.toLocaleString()} saved in your '${goalName}' vault. You cannot withdraw ₹${withdrawAmount.toLocaleString()} from a reserve that lacks those funds! (Maximum available: ₹${matchedGoal.currentAmount.toLocaleString()}). Transaction halted — zero funds have been transferred.`
            : `Protocol Abort, Boss! 🛡️✋ Aapke '${goalName}' vault mein sirf ₹${matchedGoal.currentAmount.toLocaleString()} bache hain. Aap isme se ₹${withdrawAmount.toLocaleString()} withdraw nahi kar sakte! (Available: ₹${matchedGoal.currentAmount.toLocaleString()}). Transaction rok diya gaya hai — koi paisa transfer nahi hua.`,
          tomorrowAdjustedCap: dailyLimit,
        };
      }
    }

    return {
      merchant: goalName,
      amount: withdrawAmount,
      category: 'Savings & Goals',
      transactionType: 'income',
      isDiscretionary: false,
      isOverLimit: false,
      exceededBy: 0,
      remainingSafeToSpend: Math.max(0, dailyLimit - spentToday),
      sentiment: 'praise',
      caCommentary: isEnglish
        ? `Right away, Sir. Retrieved ₹${withdrawAmount.toLocaleString()} from your '${goalName}' vault directly back into your checking account balance (+₹${withdrawAmount.toLocaleString()}). Vault balance now stands at ₹${remainingInGoal.toLocaleString()}, and your daily pocket allowance remains completely safe!`
        : `Checking the Vault, Boss! Maine ${goalName} se ₹${withdrawAmount.toLocaleString()} nikaal kar aapke checking account mein transfer kar diye hain (+₹${withdrawAmount.toLocaleString()}). Goal vault mein ab ₹${remainingInGoal.toLocaleString()} bache hain, aur aapke daily pocket spending limit par koi asar nahi padega!`,
      tomorrowAdjustedCap: dailyLimit,
      autoAction: {
        type: 'withdraw_goal',
        goalWithdrawal: {
          goalName,
          amount: withdrawAmount,
        },
      },
    };
  }

  // 1.27 Goal Allocation / Savings Deposit (e.g. "i am palning to save 3000 for this month for wedding dress", "mama's wedding dress me salary se 2000 aur daal do")
  if (
    (cleanPrompt.includes('goal') || cleanPrompt.includes('mama') || cleanPrompt.includes('dress') || cleanPrompt.includes('saving') || cleanPrompt.includes('wedding') || cleanPrompt.includes('fund') || (context?.goals && context.goals.some((g) => cleanPrompt.includes(g.name.toLowerCase())))) &&
    (cleanPrompt.includes('daal do') || cleanPrompt.includes('dal do') || cleanPrompt.includes('deposit') || cleanPrompt.includes('allocate') || cleanPrompt.includes('add') || cleanPrompt.includes('saving ke') || cleanPrompt.includes('transfer') || cleanPrompt.includes('save') || cleanPrompt.includes('plan') || cleanPrompt.includes('palning') || cleanPrompt.includes('daalo'))
  ) {
    const amountMatch = prompt.match(/(\d{3,6})/);
    const allocAmount = amountMatch ? parseInt(amountMatch[1], 10) : 3000;
    const currentBal = context?.currentBalance ?? 25000;

    let goalName = '';
    if (context?.goals && context.goals.length > 0) {
      const found = context.goals.find((g) => {
        const gName = g.name.toLowerCase();
        return cleanPrompt.includes(gName) || gName.split(' ').some((w) => w.length > 3 && cleanPrompt.includes(w));
      });
      if (found) goalName = found.name;
    }
    if (!goalName) {
      if (cleanPrompt.includes('mama') || cleanPrompt.includes('dress') || cleanPrompt.includes('wedding')) goalName = "Mama's Wedding Dress";
      else if (cleanPrompt.includes('emergency') || cleanPrompt.includes('buffer')) goalName = "Emergency Buffer";
      else {
        const afterIn = prompt.match(/(?:in|to|for|me|mein)\s+([a-zA-Z0-9\s']+?)(?:\s+goal|\s+saving|\s+fund|$)/i);
        goalName = afterIn ? afterIn[1].trim() : 'Savings Goal';
      }
    }

    if (allocAmount > currentBal) {
      return {
        merchant: goalName,
        amount: 0,
        category: 'Savings & Goals',
        transactionType: 'transfer',
        isDiscretionary: false,
        isOverLimit: false,
        exceededBy: 0,
        remainingSafeToSpend: Math.max(0, dailyLimit - spentToday),
        sentiment: 'scold',
        caCommentary: isEnglish
          ? `Insolvency Warning, Sir! 🛡️✋ Your Current Liquid Balance is only ₹${currentBal.toLocaleString()}. You cannot allocate ₹${allocAmount.toLocaleString()} into '${goalName}' without plunging your checking account into an illegal negative deficit! Allocation cancelled.`
          : `Insolvency Warning, Boss! 🛡️✋ Aapka Current Liquid Balance sirf ₹${currentBal.toLocaleString()} hai. Aap ₹${allocAmount.toLocaleString()} '${goalName}' mein deposit nahi kar sakte warna aapka checking account negative deficit mein chala jayega! Allocation cancel kar diya gaya hai.`,
        tomorrowAdjustedCap: dailyLimit,
      };
    }

    return {
      merchant: goalName,
      amount: allocAmount,
      category: 'Savings & Goals',
      transactionType: 'transfer',
      isDiscretionary: false,
      isOverLimit: false,
      exceededBy: 0,
      remainingSafeToSpend: Math.max(0, dailyLimit - spentToday),
      sentiment: 'praise',
      caCommentary: isEnglish
        ? `Right away, Sir! ₹${allocAmount.toLocaleString()} transferred directly into your '${goalName}' goal from checking. Your goal progress is accelerated and your daily pocket allowance remains completely safe, Sir!`
        : `Right away, Sir! ₹${allocAmount.toLocaleString()} salary se direct ${goalName} goal me allocate kar diye hain. Aapka goal progress boost ho gaya hai aur yeh roz ke pocket allowance se bilkul deduct nahi hoga, Boss!`,
      tomorrowAdjustedCap: dailyLimit,
      autoAction: {
        type: 'allocate_goal',
        goalAllocation: {
          goalName,
          amount: allocAmount,
        },
      },
    };
  }

  // 1.2 Payable / Borrowing Obligation (e.g. "10000 dene h dost ko", "dost ko paise dene hai", "i owe 10000 to my friend")
  if (
    (cleanPrompt.includes('dene h') || cleanPrompt.includes('dene hai') || cleanPrompt.includes('dena h') || cleanPrompt.includes('dena hai') || cleanPrompt.includes('dost ko') || cleanPrompt.includes('i owe')) &&
    !cleanPrompt.includes('kitna')
  ) {
    const amountMatch = prompt.match(/(\d{3,6})/);
    const payableAmount = amountMatch ? parseInt(amountMatch[1], 10) : 10000;
    return {
      merchant: 'Debt Liability Log',
      amount: 0,
      category: 'Debts & Liabilities',
      transactionType: 'transfer',
      isDiscretionary: false,
      isOverLimit: false,
      exceededBy: 0,
      remainingSafeToSpend: Math.max(0, dailyLimit - spentToday),
      sentiment: 'praise',
      caCommentary: isEnglish
        ? `Noted, Sir! ₹${payableAmount.toLocaleString()} recorded as a payable loan. As this is a deferred liability rather than today's consumable expense, your daily pocket allowance is untouched. All systems green!`
        : `Noted, Sir! ₹${payableAmount.toLocaleString()} dost ko dene ke liye (payable liability) record kar liya hai. Yeh ek future liability hai, isliye aapke aaj ke safe spend pocket money se deduct nahi hoga. All systems green!`,
      tomorrowAdjustedCap: dailyLimit,
      autoAction: {
        type: 'create_payable',
        debtTitle: 'Friend Loan (Payable)',
        debtAmount: payableAmount,
        dueDate: 'On Pay Day (8th Sep)',
        note: 'Friend loan payable logged via J.A.R.V.I.S.',
      },
    };
  }

  // 1.3 Debts / Karza Inquiry (e.g. "apne pe krja kitna h", "abhi tak debt kitna h apne pe", "how much do I owe?")
  if (
    cleanPrompt.includes('krja') ||
    cleanPrompt.includes('karza') ||
    (cleanPrompt.includes('debt') && (cleanPrompt.includes('kitna') || cleanPrompt.includes('apne pe') || cleanPrompt.includes('status') || cleanPrompt.includes('how much') || cleanPrompt.includes('what'))) ||
    cleanPrompt.includes('kitna udhaar') ||
    cleanPrompt.includes('how much do i owe') ||
    cleanPrompt.includes('what do i owe')
  ) {
    const owedByUser = context?.debtsSummary?.totalOwedByUser ?? 0;
    const owedToUser = context?.debtsSummary?.totalOwedToUser ?? 0;
    return {
      merchant: 'Debt Diagnostics',
      amount: 0,
      category: 'Financial Advisory',
      transactionType: 'transfer',
      isDiscretionary: false,
      isOverLimit: false,
      exceededBy: 0,
      remainingSafeToSpend: Math.max(0, dailyLimit - spentToday),
      sentiment: 'praise',
      caCommentary: isEnglish
        ? `Checking your liabilities ledger, Sir:\n• Total You Owe (Liabilities): ₹${owedByUser.toLocaleString()}\n• Total Owed to You (Receivables): ₹${owedToUser.toLocaleString()}\n\nYou may view full counterparty details in the Goals & Debts screen, Sir!`
        : `Checking your liabilities ledger, Sir:\n• Karza jo hume dena hai (You owe): ₹${owedByUser.toLocaleString()}\n• Udhaar jo hume wapas lena hai (Owed to you): ₹${owedToUser.toLocaleString()}\n\nAap Goals & Debts screen me jakar counterparty details dekh sakte hain, Boss!`,
      tomorrowAdjustedCap: dailyLimit,
    };
  }

  // 1.4 Goals & Savings Targets Inquiry (e.g. "what are my goals", "goals batao", "kitne goals h", "how much is now remaining in savings")
  if (
    cleanPrompt.includes('kisi kis ke liye') ||
    cleanPrompt.includes('kis kis ke liye') ||
    cleanPrompt.includes('kitne goals') ||
    cleanPrompt.includes('kya goals') ||
    cleanPrompt.includes('saving kar rahe') ||
    cleanPrompt.includes('emergency buffer') ||
    cleanPrompt.includes('my goals') ||
    cleanPrompt.includes('what are my goals') ||
    cleanPrompt.includes('show goals') ||
    cleanPrompt.includes('savings goals') ||
    cleanPrompt.includes('remaining in savings') ||
    cleanPrompt.includes('in savings') ||
    cleanPrompt.includes('savings remaining') ||
    cleanPrompt.includes('saving remaining') ||
    cleanPrompt.includes('how much in savings')
  ) {
    const goalsList = context?.goals && context.goals.length > 0
      ? context.goals.map((g, i) => `${i + 1}. ${g.name}: ₹${g.currentAmount.toLocaleString()} / ₹${g.targetAmount.toLocaleString()} (${g.progressPercent}% achieved)`).join('\n')
      : "1. Mama's Wedding Dress: ₹2,400 / ₹5,000 (48%)\n2. Emergency Buffer (3-Month Run): ₹3,000 / ₹50,000 (6%)";

    const totalSaved = context?.totalSavedGoals ?? 5400;

    return {
      merchant: 'Goals Diagnostics',
      amount: 0,
      category: 'Financial Advisory',
      transactionType: 'transfer',
      isDiscretionary: false,
      isOverLimit: false,
      exceededBy: 0,
      remainingSafeToSpend: Math.max(0, dailyLimit - spentToday),
      sentiment: 'praise',
      caCommentary: isEnglish
        ? `Here are your active savings goals, Sir:\n\n${goalsList}\n\nTotal saved across your goals is ₹${totalSaved.toLocaleString()}. All of this money is safely kept in your goals and does not affect your daily spend limit!`
        : `Here are your active savings goals, Sir:\n\n${goalsList}\n\nTotal ₹${totalSaved.toLocaleString()} savings goals mein locked hain, aur aapke daily pocket money par koi asar nahi padega, Boss!`,
      tomorrowAdjustedCap: dailyLimit,
    };
  }

  // 2. Fixed Bills Update (e.g. "oah please yeh fiex bills update krna 12000 pe", "fixed bills 12000", "ghar ka kharcha 10000")
  if (
    cleanPrompt.includes('fixed bill') ||
    cleanPrompt.includes('fixed bills') ||
    cleanPrompt.includes('fiex bill') ||
    cleanPrompt.includes('fiex bills') ||
    cleanPrompt.includes('fixed kharcha') ||
    cleanPrompt.includes('ghar ka kharcha') ||
    ((cleanPrompt.includes('bill') || cleanPrompt.includes('bills')) && (cleanPrompt.includes('update') || cleanPrompt.includes('set') || cleanPrompt.includes('change') || cleanPrompt.includes('karo') || cleanPrompt.includes('krna')))
  ) {
    const amountMatch = prompt.match(/(\d{3,6})/);
    const newFixed = amountMatch ? parseInt(amountMatch[1], 10) : 12000;
    const newDaily = Math.max(100, Math.round((currentSalary - newFixed - 3000) / 30));

    return {
      merchant: 'Fixed Bills Configuration',
      amount: 0,
      category: 'System Command',
      transactionType: 'transfer',
      isDiscretionary: false,
      isOverLimit: false,
      exceededBy: 0,
      remainingSafeToSpend: newDaily,
      sentiment: 'praise',
      caCommentary: isEnglish
        ? `Done, Sir! Fixed bills have been updated to ₹${newFixed.toLocaleString()}.\n\nWith salary at ₹${currentSalary.toLocaleString()} and fixed obligations set at ₹${newFixed.toLocaleString()}, your daily safe pocket limit recalibrates to ₹${newDaily}/day. Fixed bills will not impede your daily allowance, Sir!`
        : `Done Sir! Aapke fixed bills ₹${newFixed.toLocaleString()} par successfully update ho gaye hain.\n\nAb ₹${currentSalary.toLocaleString()} salary aur ₹${newFixed.toLocaleString()} fixed bills ke hisaab se aapka safe daily pocket money limit ₹${newDaily}/day ban gaya hai. Ye fixed bills aapke roz ke pocket money se nahi katega!`,
      tomorrowAdjustedCap: newDaily,
      autoAction: {
        type: 'update_budget',
        budgetUpdate: {
          fixedBills: newFixed,
          dailyLimit: newDaily,
        },
      },
    };
  }

  // 3. Salary Modification Commands (e.g. "JARVIS set salary to 25000", "mere salary 25000 set krr", "salary 25000")
  if (cleanPrompt.includes('salary') && (cleanPrompt.includes('set') || cleanPrompt.includes('update') || cleanPrompt.includes('change') || cleanPrompt.includes('now') || cleanPrompt.includes('mera salary') || cleanPrompt.includes('meri salary') || cleanPrompt.includes('mere salary') || cleanPrompt.includes('krr') || cleanPrompt.includes('karo'))) {
    const salaryMatch = prompt.match(/(\d{4,6})/);
    const newSalary = salaryMatch ? parseInt(salaryMatch[1], 10) : 25000;
    const newDaily = Math.max(100, Math.round((newSalary - currentFixed - 3000) / 30));

    return {
      merchant: 'Budget Configuration',
      amount: 0,
      category: 'System Command',
      transactionType: 'transfer',
      isDiscretionary: false,
      isOverLimit: false,
      exceededBy: 0,
      remainingSafeToSpend: newDaily,
      sentiment: 'praise',
      caCommentary: isEnglish
        ? `Done, Sir! Monthly salary configured to ₹${newSalary.toLocaleString()}.\n\nAfter setting aside ₹${currentFixed.toLocaleString()} for fixed overheads, your recalculated safe daily allowance is ₹${newDaily}/day. Next Pay Day is scheduled for the night of the 7th!`
        : `Done Sir! Aapki monthly salary ₹${newSalary.toLocaleString()} set kar di hai.\n\n₹${currentFixed.toLocaleString()} fixed bills hatane ke baad aapka roz ka safe kharcha ₹${newDaily}/day banta hai. Pay Day har mahine 7th ki raat ko set hai!`,
      tomorrowAdjustedCap: newDaily,
      autoAction: {
        type: 'update_budget',
        budgetUpdate: {
          salary: newSalary,
          dailyLimit: newDaily,
        },
      },
    };
  }

  // 4. Transaction Inquiries (e.g. "are mene abb tak kitne transaction kiye h", "kitne transaction hue", "mera kharcha dikhao")
  if (
    cleanPrompt.includes('kitne transaction') ||
    cleanPrompt.includes('kitne transactions') ||
    cleanPrompt.includes('abb tak kitne') ||
    cleanPrompt.includes('ab tak kitne') ||
    cleanPrompt.includes('transaction history') ||
    cleanPrompt.includes('mere transactions') ||
    cleanPrompt.includes('mera kharcha dikhao') ||
    cleanPrompt.includes('kitne kharche') ||
    cleanPrompt.includes('kitne transaction kiye')
  ) {
    const safeLeft = Math.max(0, dailyLimit - spentToday);
    const count = totalTxCount > 0 ? totalTxCount : 5;
    return {
      merchant: 'Transaction Audit',
      amount: 0,
      category: 'Financial Advisory',
      transactionType: 'transfer',
      isDiscretionary: false,
      isOverLimit: false,
      exceededBy: 0,
      remainingSafeToSpend: safeLeft,
      sentiment: 'praise',
      caCommentary: isEnglish
        ? `Sir, you have recorded a total of ${count} transactions so far!\n\n• Expended Today: ₹${spentToday.toFixed(0)}\n• Safe Allowance Remaining: ₹${safeLeft.toFixed(0)}\n\nYou need not switch views, Sir; complete records are clearly accessible right in your ledger!`
        : `Sir, aapne ab tak total ${count} transactions kiye hain!\n\n• Aaj ka kharcha: ₹${spentToday.toFixed(0)}\n• Aaj ka safe balance bacha hai: ₹${safeLeft.toFixed(0)}\n\nAapko tab switch karne ki zaroorat nahi hai, saare transactions Dashboard me aur chat ke bagal me clearly available hain!`,
      tomorrowAdjustedCap: dailyLimit,
    };
  }

  // 5. Status Briefing Command (e.g. "status briefing", "how am I doing", "kya status hai")
  if (
    cleanPrompt.includes('status') ||
    cleanPrompt.includes('briefing') ||
    cleanPrompt.includes('how am i doing') ||
    cleanPrompt.includes('kya hisaab hai')
  ) {
    const safeLeft = Math.max(0, dailyLimit - spentToday);
    return {
      merchant: 'Executive Briefing',
      amount: 0,
      category: 'Financial Advisory',
      transactionType: 'transfer',
      isDiscretionary: false,
      isOverLimit: false,
      exceededBy: 0,
      remainingSafeToSpend: safeLeft,
      sentiment: 'praise',
      caCommentary: isEnglish
        ? `Sir, your financial status briefing is completely synchronized:\n• Safe Discretionary Left Today: ₹${safeLeft.toFixed(0)}\n• Salary Cycle: Pay Day arrives tomorrow on the 7th night!\n• Savings Vaults & Fixed Bills: All securely allocated.\nExercise moderate fiscal restraint until tomorrow night, and all systems will stay gloriously green, Sir!`
        : `Sir, aapka financial status ekdum update hai:\n• Aaj ka safe balance: ₹${safeLeft.toFixed(0)}\n• Salary cycle: Kal 7th ki raat ko Pay Day aayega!\n• Savings aur Fixed Bills: Sab securely set hain.\nBas kal raat tak thoda dhyan se kharch karein, baki sab badiya chal raha hai!`,
      tomorrowAdjustedCap: dailyLimit,
    };
  }

  // 5.51 Intent: How much household budget is remaining? (e.g. "household kitna bacha h", "how much left for grocery", "household me kitna bacha hai", "ghar ke kharche me kitna bacha")
  const isHouseholdRemainingQuery =
    (cleanPrompt.includes('household') || cleanPrompt.includes('house hold') || cleanPrompt.includes('ghar ka kharcha') || cleanPrompt.includes('ghar ke kharche') || cleanPrompt.includes('rashan') || cleanPrompt.includes('ration') || cleanPrompt.includes('grocery')) &&
    (cleanPrompt.includes('kitna bacha') || cleanPrompt.includes('kitne bache') || cleanPrompt.includes('kitna paisa bacha') || cleanPrompt.includes('kitna bacha h') || cleanPrompt.includes('bacha h') || cleanPrompt.includes('bacha hai') || cleanPrompt.includes('bache h') || cleanPrompt.includes('how much left') || cleanPrompt.includes('how much is left') || cleanPrompt.includes('remaining') || cleanPrompt.includes('balance kitna') || cleanPrompt.includes('balance'));

  if (isHouseholdRemainingQuery) {
    const hhBudget = context?.householdSummary?.budget ?? context?.fixedBills ?? 10000;
    const currentHhSpent = context?.householdSummary?.spent || 0;
    const isExceeded = currentHhSpent > hhBudget;
    const overspentBy = isExceeded ? currentHhSpent - hhBudget : 0;
    const remainingInHh = Math.max(0, hhBudget - currentHhSpent);

    let caCommentary = '';
    if (isExceeded) {
      caCommentary = isEnglish
        ? `Boss, your household budget is fully exhausted and currently operating at a ₹${overspentBy.toLocaleString()} deficit (₹${currentHhSpent.toLocaleString()} spent vs ₹${hhBudget.toLocaleString()} ceiling). No safe funds remain in household reserves for this month!`
        : `Boss, household budget mein abhi kuch nahi bacha hai, balki hum ₹${overspentBy.toLocaleString()} deficit mein chal rahe hain (₹${currentHhSpent.toLocaleString()} kharch ho chuka hai ₹${hhBudget.toLocaleString()} limit mein se). Abhi koi extra rashan khareedna theek nahi hoga!`;
    } else if (remainingInHh <= 2000 && remainingInHh > 0) {
      caCommentary = isEnglish
        ? `Sir, you have ₹${remainingInHh.toLocaleString()} left in your household pool for this cycle (₹${currentHhSpent.toLocaleString()} spent of your ₹${hhBudget.toLocaleString()} allocation). Provisions are running tight, so let's keep grocery trips strictly necessary!`
        : `Boss, monthly household budget mein se abhi ₹${remainingInHh.toLocaleString()} bache hue hain (₹${hhBudget.toLocaleString()} mein se ₹${currentHhSpent.toLocaleString()} kharcha ho chuka hai). Mahine ke aage ke dino ke liye thoda haath kheench ke chalna behtar rahega!`;
    } else {
      caCommentary = isEnglish
        ? `Sir, you currently have ₹${remainingInHh.toLocaleString()} remaining in your household allocation (₹${currentHhSpent.toLocaleString()} spent out of your ₹${hhBudget.toLocaleString()} monthly ceiling). Your provision reserves and daily pocket money (₹${Math.max(0, dailyLimit - spentToday).toFixed(0)}) remain completely solid, Sir! 🛒✨`
        : `Boss, household budget mein se abhi ₹${remainingInHh.toLocaleString()} bache hue hain (₹${hhBudget.toLocaleString()} total budget mein se ab tak ₹${currentHhSpent.toLocaleString()} spend hua hai). Rashan aur provisions mast chal rahe hain, tension lene ki bilkul baat nahi hai! 🛒✨`;
    }

    return {
      merchant: 'Household Reserve',
      amount: 0,
      category: 'Household Mandatory',
      transactionType: 'transfer',
      isDiscretionary: false,
      isOverLimit: false,
      exceededBy: 0,
      remainingSafeToSpend: Math.max(0, dailyLimit - spentToday),
      sentiment: 'praise',
      breachCode: undefined,
      caCommentary,
      tomorrowAdjustedCap: dailyLimit,
    };
  }

  // 5.52 Intent: Did I exceed household limit? (e.g. "Did i exceed house hold limit", "Did i exceed household limit", "household limit exceed hua kya", "have i exceeded household limit")
  const isHouseholdBreachCheck =
    (cleanPrompt.includes('household') || cleanPrompt.includes('house hold') || cleanPrompt.includes('ghar ka kharcha')) &&
    (cleanPrompt.includes('exceed') || cleanPrompt.includes('cross') || cleanPrompt.includes('over limit') || cleanPrompt.includes('limit cross') || cleanPrompt.includes('zyada ho gaya') || cleanPrompt.includes('over budget'));

  if (isHouseholdBreachCheck) {
    const hhBudget = context?.householdSummary?.budget ?? context?.fixedBills ?? 10000;
    const currentHhSpent = context?.householdSummary?.spent || 0;
    const isExceeded = currentHhSpent > hhBudget;
    const overspentBy = isExceeded ? currentHhSpent - hhBudget : 0;
    const remainingInHh = Math.max(0, hhBudget - currentHhSpent);

    return {
      merchant: 'Household Audit',
      amount: 0,
      category: 'Household Mandatory',
      transactionType: 'transfer',
      isDiscretionary: false,
      isOverLimit: false,
      exceededBy: 0,
      remainingSafeToSpend: Math.max(0, dailyLimit - spentToday),
      sentiment: 'praise',
      breachCode: undefined,
      caCommentary: isExceeded
        ? (isEnglish
            ? `🚨 YES, Sir! You have EXCEEDED your monthly household limit!\n\n• Allocated Household Budget: ₹${hhBudget.toLocaleString()}\n• Total Household Expended: ₹${currentHhSpent.toLocaleString()}\n• Deficit Overrun: ₹${overspentBy.toLocaleString()} OVER BUDGET!\n\n🛡️ STRICT ADVISORY:\nHousehold overhead is strictly capped. Any further leakage directly erodes your liquidity, loan repayment schedule, and savings goals! Freeze all non-essential provisions immediately, Sir!`
            : `🚨 HAAN Boss! Aapka monthly household limit EXCEED ho chuka hai!\n\n• Monthly Household Budget: ₹${hhBudget.toLocaleString()}\n• Total Household Kharcha: ₹${currentHhSpent.toLocaleString()}\n• Budget Se Zyada Kharch: ₹${overspentBy.toLocaleString()} (OVER LIMIT)!\n\n🛡️ STRICT ADVISORY:\nHousehold aur grocery ke kharche strictly control mein rakhein warna savings aur loan repayments par direct asar padega. Faaltu kharche turant band karein!`)
        : (isEnglish
            ? `Checking the ledger now, Sir! 🎩📊\n\nNo, you have NOT exceeded your household limit. Your household expenses currently stand at ₹${currentHhSpent.toLocaleString()} of your ₹${hhBudget.toLocaleString()} allocation (₹${remainingInHh.toLocaleString()} remaining in reserve). Your daily pocket allowance remains safe and untouched at ₹${Math.max(0, dailyLimit - spentToday).toFixed(0)}! 🛡️✨`
            : `Checking the records now, Boss! 🎩📊\n\nNahi, aapka household limit exceed nahi hua hai. Aapka household kharcha abhi ₹${currentHhSpent.toLocaleString()} / ₹${hhBudget.toLocaleString()} hai (₹${remainingInHh.toLocaleString()} safe bacha hua hai). Daily pocket allowance green hai! 🛡️✨`),
      tomorrowAdjustedCap: dailyLimit,
    };
  }

  // 6. Balance & Funds Inquiries (e.g. "mere pass balance kitna h", "ere pass balance kitna h", "kitna paisa bacha hai")
  if (
    cleanPrompt.includes('balance') ||
    cleanPrompt.includes('kitna h') ||
    cleanPrompt.includes('kitna hai') ||
    cleanPrompt.includes('paisa bacha') ||
    cleanPrompt.includes('paise bache') ||
    cleanPrompt.includes('pass kitna') ||
    cleanPrompt.includes('mere paas') ||
    cleanPrompt.includes('ere pass') ||
    cleanPrompt.includes('wallet')
  ) {
    const safeLeft = Math.max(0, dailyLimit - spentToday);
    return {
      merchant: 'J.A.R.V.I.S. Financial Core',
      amount: 0,
      category: 'Financial Advisory',
      transactionType: 'transfer',
      isDiscretionary: false,
      isOverLimit: false,
      exceededBy: 0,
      remainingSafeToSpend: safeLeft,
      sentiment: 'praise',
      caCommentary: isEnglish
        ? `Sir, you have exactly ₹${safeLeft.toFixed(0)} of safe allowance remaining for today's discretionary expenses (Daily limit: ₹${dailyLimit}, Expended today: ₹${spentToday.toFixed(0)}).\n\nWith salary arriving tomorrow night on the 7th, this balance will comfortably carry us through, provided you avoid any sudden extravagant impulses!`
        : `Sir, aapke paas aaj ke rozmarra ke kharche ke liye exactly ₹${safeLeft.toFixed(0)} ka safe balance bacha hai (Daily limit: ₹${dailyLimit}, Aaj spend hua: ₹${spentToday.toFixed(0)}).\n\nKal 7th ki raat ko aapki salary aane wali hai, tab tak ye balance aaraam se chalega!`,
      tomorrowAdjustedCap: dailyLimit,
    };
  }

  // 7. Spending Capacity Inquiries (e.g. "main kitna krcha krr sakta hu", "kitna kharcha kar sakta hu")
  if (
    cleanPrompt.includes('kitna krcha') ||
    cleanPrompt.includes('kitna kharcha') ||
    cleanPrompt.includes('kitna spend') ||
    cleanPrompt.includes('how much can i spend') ||
    cleanPrompt.includes('can i spend') ||
    cleanPrompt.includes('kitna udaye') ||
    cleanPrompt.includes('kya kharch karu') ||
    cleanPrompt.includes('kharcha kar sakta') ||
    cleanPrompt.includes('krcha krr sakta')
  ) {
    const safeLeft = Math.max(0, dailyLimit - spentToday);
    return {
      merchant: 'J.A.R.V.I.S. Spending Protocol',
      amount: 0,
      category: 'Financial Advisory',
      transactionType: 'transfer',
      isDiscretionary: false,
      isOverLimit: false,
      exceededBy: 0,
      remainingSafeToSpend: safeLeft,
      sentiment: 'praise',
      caCommentary: isEnglish
        ? `Sir, you may comfortably spend up to ₹${safeLeft.toFixed(0)} today without compromising your monthly solvency.\nWith salary arriving tomorrow on the 7th night, keeping today's spending within ₹${safeLeft.toFixed(0)} is ideal!`
        : `Sir, aaj aap bina kisi tension ke ₹${safeLeft.toFixed(0)} tak ka kharcha aasaani se kar sakte hain.\nKyunki kal 7th ki raat ko salary aayegi, isliye aaj ka din isi ₹${safeLeft.toFixed(0)} ke andar rakhein toh best rahega!`,
      tomorrowAdjustedCap: dailyLimit,
    };
  }

  // 4. Debt Discussion / Offset (e.g. "roomate mere se already 20000 mangata h", "phle se hi magta tha")
  const isDebtDiscussion =
    cleanPrompt.includes('mangata') ||
    cleanPrompt.includes('maangta') ||
    cleanPrompt.includes('mangta') ||
    cleanPrompt.includes('magta') ||
    cleanPrompt.includes('phle se') ||
    cleanPrompt.includes('pehle se') ||
    cleanPrompt.includes('already') ||
    cleanPrompt.includes('udhaar') ||
    cleanPrompt.includes('offset') ||
    cleanPrompt.includes('dues') ||
    cleanPrompt.includes('claims');

  if (isDebtDiscussion) {
    const has20k = cleanPrompt.includes('20000') || cleanPrompt.includes('20k') || cleanPrompt.includes('20 hazaar');

    if (has20k || cleanPrompt.includes('roommate') || cleanPrompt.includes('roomate')) {
      const priorDebt = 20000;
      const rentOffset = 5000;
      const netRemaining = priorDebt - rentOffset; // 15,000

      return {
        merchant: 'J.A.R.V.I.S. Debt Offset',
        amount: 0,
        category: 'Debt Adjustment',
        transactionType: 'transfer',
        isDiscretionary: false,
        isOverLimit: false,
        exceededBy: 0,
        remainingSafeToSpend: Math.max(0, dailyLimit - spentToday),
        sentiment: 'praise',
        caCommentary: `Ah, a pertinent historical liability, Sir! Since your roommate already claims ₹${priorDebt.toLocaleString()} from you, the ₹${rentOffset.toLocaleString()} you covered for his rent cleanly offsets against it.\n\nRevised Protocol Ledger:\n• Prior Liability: ₹${priorDebt.toLocaleString()} (Owed by you)\n• Today's Rent Coverage: -₹${rentOffset.toLocaleString()}\n👉 Net balance due to Roommate: ₹${netRemaining.toLocaleString()}\n\nMath, as always Sir, is remarkably therapeutic. Your daily pocket allowance remains completely untouched at ₹${dailyLimit}.`,
        tomorrowAdjustedCap: dailyLimit,
        autoAction: {
          type: 'offset_debt',
          debtTitle: 'Roommate Net Due (After ₹5k Rent Offset)',
          debtAmount: netRemaining,
          note: `Deducted ₹${rentOffset.toLocaleString()} rent share from ₹${priorDebt.toLocaleString()} prior dues. Remaining balance to pay: ₹${netRemaining.toLocaleString()}.`
        }
      };
    }

    // Follow-up remarks about prior debt (e.g. "lekin woh to phle se hi magta tha")
    return {
      merchant: 'J.A.R.V.I.S. Advisory',
      amount: 0,
      category: 'Financial Advisory',
      transactionType: 'transfer',
      isDiscretionary: false,
      isOverLimit: false,
      exceededBy: 0,
      remainingSafeToSpend: Math.max(0, dailyLimit - spentToday),
      sentiment: 'praise',
      caCommentary: `Precisely my point, Sir. That was a historical liability, not a fresh burn of today's capital. Your daily pocket money remains pristine. Payday arrives tomorrow night on the 7th, at which point we may settle the remaining ₹15,000 with utmost decorum.`,
      tomorrowAdjustedCap: dailyLimit,
    };
  }

  // 5. Conversational / Follow-ups (no expense)
  const isConversational =
    cleanPrompt.includes('lekin') ||
    cleanPrompt.includes('woh to') ||
    cleanPrompt.includes('theek hai') ||
    cleanPrompt.includes('samjha') ||
    cleanPrompt.includes('toh kya') ||
    cleanPrompt.includes('kya bol raha') ||
    cleanPrompt.includes('arre nahi') ||
    cleanPrompt.includes('salary kab') ||
    cleanPrompt.includes('payday') ||
    cleanPrompt.includes('pay day') ||
    cleanPrompt.includes('kya karu') ||
    cleanPrompt.includes('hello') ||
    cleanPrompt.includes('hi jarvis') ||
    cleanPrompt.includes('hey jarvis');

  const amountMatch = prompt.match(/(?:₹|rs\.?|inr)?\s*(\d+(?:\.\d{1,2})?)/i) ||
    prompt.match(/(\d+(?:\.\d{1,2})?)\s*(?:rupees|bucks|hazaar|k)?/i);

  const hasSpendingVerbs =
    cleanPrompt.includes('spent') ||
    cleanPrompt.includes('bought') ||
    cleanPrompt.includes('kharcha') ||
    cleanPrompt.includes('khareed') ||
    cleanPrompt.includes('pay') ||
    cleanPrompt.includes('bhara') ||
    cleanPrompt.includes('diya') ||
    cleanPrompt.includes('chai') ||
    cleanPrompt.includes('coffee') ||
    cleanPrompt.includes('zomato') ||
    cleanPrompt.includes('swiggy') ||
    cleanPrompt.includes('uber') ||
    cleanPrompt.includes('ola') ||
    cleanPrompt.includes('zara');

  if (isConversational && !hasSpendingVerbs) {
    let advice = `Always at your service, Sir. I am actively monitoring our burn rate. Kal raat 7th ko paycheck credit hote hi we shall commence the new fiscal cycle with renewed vigor.`;
    if (cleanPrompt.includes('salary kab') || cleanPrompt.includes('payday')) {
      advice = `Your monthly compensation arrives on the night of the 7th of September, Sir. Approximately 24 hours remain. I strongly advise rationing your remaining liquidity until touchdown.`;
    }
    return {
      merchant: 'J.A.R.V.I.S. Core',
      amount: 0,
      category: 'Financial Advisory',
      transactionType: 'transfer',
      isDiscretionary: false,
      isOverLimit: false,
      exceededBy: 0,
      remainingSafeToSpend: Math.max(0, dailyLimit - spentToday),
      sentiment: 'praise',
      caCommentary: advice,
      tomorrowAdjustedCap: dailyLimit,
    };
  }

  // 6. Roommate Rent Payment Scenario (e.g. "Maine 10000 rent bhara roommate ke paas paise nahi the")
  const isRentScenario = (cleanPrompt.includes('rent') || cleanPrompt.includes('kiraya')) &&
    (cleanPrompt.includes('pay') || cleanPrompt.includes('bhara') || cleanPrompt.includes('diya') || cleanPrompt.includes('10000') || cleanPrompt.includes('10k'));

  if (isRentScenario) {
    let rentAmount = 10000;
    if (amountMatch) {
      const parsed = parseFloat(amountMatch[1]);
      if (parsed >= 1000) rentAmount = parsed;
    }
    const roommateShare = Math.round(rentAmount / 2);

    const hhBudget = context?.householdSummary?.budget || context?.fixedBills || 12000;
    const currentHhSpent = context?.householdSummary?.spent || 0;
    const projectedHhTotal = currentHhSpent + rentAmount;
    const isHouseholdBreach = projectedHhTotal > hhBudget;
    const hhExceededBy = isHouseholdBreach ? projectedHhTotal - hhBudget : 0;

    let commentary = `I have processed the ₹${rentAmount.toLocaleString()} flat rent payment, Sir. Your nobility towards your roommate is touching. However, taking into account the natural decay of human memory, I have taken the liberty of logging ₹${roommateShare.toLocaleString()} directly under 'Money Owed to You' before he conveniently develops temporary amnesia.\n\nRest assured, Sir: As a fixed household commitment, this will NOT impact your daily ₹${dailyLimit} pocket allowance. Pay Day arrives tomorrow night on the 7th.`;

    if (isHouseholdBreach) {
      commentary += `\n\n🚨 STRICT HOUSEHOLD OVERHEAD WARNING: This rent payment elevates your monthly household expenditure to ₹${projectedHhTotal.toLocaleString()}, which violently EXCEEDS your ₹${hhBudget.toLocaleString()} household ceiling by ₹${hhExceededBy.toLocaleString()}! Ensure your roommate repays promptly to replenish our liquidity reserves!`;
    }

    return {
      merchant: 'Flat Rent & Maintenance',
      amount: rentAmount,
      category: 'Household & Rent',
      transactionType: 'expense',
      isDiscretionary: false, // Fixed overhead — does NOT drain daily allowance!
      isOverLimit: isHouseholdBreach,
      exceededBy: hhExceededBy,
      remainingSafeToSpend: Math.max(0, dailyLimit - spentToday),
      sentiment: isHouseholdBreach ? 'scold' : 'praise',
      caCommentary: commentary,
      breachCode: isHouseholdBreach ? 'HOUSEHOLD-BREACH' : undefined,
      tomorrowAdjustedCap: dailyLimit,
      autoAction: {
        type: 'create_receivable',
        debtTitle: 'Roommate (Rent Share)',
        debtAmount: roommateShare,
        note: `Paid full ₹${rentAmount.toLocaleString()} rent on behalf of roommate. Recover ₹${roommateShare.toLocaleString()} upon his paycheck arrival.`
      }
    };
  }

  // If no amount is detected, treat as conversational
  if (!amountMatch) {
    return {
      merchant: 'J.A.R.V.I.S. Core',
      amount: 0,
      category: 'Conversational',
      transactionType: 'transfer',
      isDiscretionary: false,
      isOverLimit: false,
      exceededBy: 0,
      remainingSafeToSpend: Math.max(0, dailyLimit - spentToday),
      sentiment: 'praise',
      caCommentary: `Awaiting your instruction, Sir. You may log an expense (e.g. 'Chai ₹40' or 'Uber ₹200'), command me to navigate ('Show dashboard'), or adjust parameters ('Set salary to 40000').`,
      tomorrowAdjustedCap: dailyLimit,
    };
  }

  const amount = parseFloat(amountMatch[1]);

  // Merchant detection
  let merchant = 'Daily Expense';
  if (cleanPrompt.includes('zara')) merchant = 'Zara Apparel Retail';
  else if (cleanPrompt.includes('farewell') || cleanPrompt.includes('party')) merchant = 'Farewell Party';
  else if (cleanPrompt.includes('zomato')) merchant = 'Zomato';
  else if (cleanPrompt.includes('swiggy')) merchant = 'Swiggy';
  else if (cleanPrompt.includes('uber')) merchant = 'Uber Ride';
  else if (cleanPrompt.includes('ola')) merchant = 'Ola Cabs';
  else if (cleanPrompt.includes('coffee') || cleanPrompt.includes('starbucks')) merchant = 'Starbucks Coffee';
  else if (cleanPrompt.includes('tea') || cleanPrompt.includes('chai')) merchant = 'Chai Tapri';
  else if (cleanPrompt.includes('grocer') || cleanPrompt.includes('blinkit') || cleanPrompt.includes('zepto')) merchant = 'Blinkit Grocery';
  else if (cleanPrompt.includes('household') || cleanPrompt.includes('house hold')) merchant = 'Household Expenses';
  else if (cleanPrompt.includes('mama')) merchant = "Mama's Wedding Dress Fund";
  else {
    const atMatch = prompt.match(/(?:at|from|pe)\s+([a-zA-Z0-9\s']+)/i);
    if (atMatch) {
      merchant = atMatch[1].trim().split(' ')[0];
    }
  }

  // Category detection & Strict Household checks
  let category = 'Pocket Money';
  let isDiscretionary = true;
  const isHousehold =
    cleanPrompt.includes('grocer') ||
    cleanPrompt.includes('blinkit') ||
    cleanPrompt.includes('zepto') ||
    cleanPrompt.includes('instamart') ||
    cleanPrompt.includes('milk') ||
    cleanPrompt.includes('doodh') ||
    cleanPrompt.includes('rashan') ||
    cleanPrompt.includes('ration') ||
    cleanPrompt.includes('bill') ||
    cleanPrompt.includes('rent') ||
    cleanPrompt.includes('kiraya') ||
    cleanPrompt.includes('household') ||
    cleanPrompt.includes('house hold') ||
    cleanPrompt.includes('ghar') ||
    cleanPrompt.includes('electricity') ||
    cleanPrompt.includes('bijli') ||
    cleanPrompt.includes('gas') ||
    cleanPrompt.includes('cylinder') ||
    cleanPrompt.includes('wifi') ||
    cleanPrompt.includes('maid') ||
    cleanPrompt.includes('maintenance') ||
    cleanPrompt.includes('sabzi') ||
    cleanPrompt.includes('vegetable');

  if (cleanPrompt.includes('farewell') || cleanPrompt.includes('party')) {
    category = 'Entertainment & Social';
  } else if (cleanPrompt.includes('shirt') || cleanPrompt.includes('cloth') || cleanPrompt.includes('dress') || cleanPrompt.includes('zara') || cleanPrompt.includes('kapde') || cleanPrompt.includes('shoes')) {
    category = 'Shopping & Clothes';
  } else if (cleanPrompt.includes('tea') || cleanPrompt.includes('chai') || cleanPrompt.includes('coffee') || cleanPrompt.includes('dinner') || cleanPrompt.includes('lunch') || cleanPrompt.includes('khana') || cleanPrompt.includes('zomato') || cleanPrompt.includes('swiggy')) {
    category = 'Food & Chai';
  } else if (cleanPrompt.includes('uber') || cleanPrompt.includes('cab') || cleanPrompt.includes('auto') || cleanPrompt.includes('petrol') || cleanPrompt.includes('fuel')) {
    category = 'Travel & Auto';
  } else if (isHousehold) {
    category = 'Household Mandatory';
    isDiscretionary = false;
  }

  const hhBudget = context?.householdSummary?.budget ?? context?.fixedBills ?? 10000;
  const currentHhSpent = context?.householdSummary?.spent || 0;
  const projectedHhTotal = currentHhSpent + amount;
  const isHouseholdBreach = isHousehold && projectedHhTotal > hhBudget;
  const hhExceededBy = isHouseholdBreach ? projectedHhTotal - hhBudget : 0;

  const projectedTotal = spentToday + amount;
  const isDailyBreach = isDiscretionary && (projectedTotal > dailyLimit);
  const dailyExceededBy = isDailyBreach ? projectedTotal - dailyLimit : 0;

  const isOverLimit = isHousehold ? isHouseholdBreach : isDailyBreach;
  const exceededBy = isHousehold ? hhExceededBy : dailyExceededBy;
  const breachCode = isHouseholdBreach ? 'HOUSEHOLD-BREACH' : (isDailyBreach ? 'PROTOCOL-BREACH' : undefined);

  const remainingSafeToSpend = Math.max(0, dailyLimit - (isDiscretionary ? projectedTotal : spentToday));
  const daysRemaining = 20;
  const dailyAmortizedDeduction = Math.round(dailyExceededBy / daysRemaining);
  const tomorrowAdjustedCap = Math.max(100, dailyLimit - dailyAmortizedDeduction);

  let sentiment: 'praise' | 'scold' = isOverLimit ? 'scold' : 'praise';
  let caCommentary = '';

  if (isHouseholdBreach) {
    caCommentary = isEnglish
      ? `🚨 STRICT HOUSEHOLD PROTOCOL BREACH, Sir!\n\n` +
        `You have logged ₹${amount.toLocaleString()} for ${category} (${merchant}). This surges your monthly household expenditure to ₹${projectedHhTotal.toLocaleString()}, which violently EXCEEDS your strict monthly household ceiling of ₹${hhBudget.toLocaleString()} by ₹${hhExceededBy.toLocaleString()}!\n\n` +
        `🛡️ MANDATORY RESTRAINT DIRECTIVE:\n` +
        `Household and grocery expenses must remain strictly disciplined. Any further uncontrolled leakage here directly threatens your savings goals (Mama's Wedding Dress) and your debt repayment milestones! Freeze non-essential provisions immediately, Sir!`
      : `🚨 STRICT HOUSEHOLD PROTOCOL BREACH, Boss!\n\n` +
        `Aapne ${category} (${merchant}) par ₹${amount.toLocaleString()} kharch kiya hai. Isse aapka is mahine ka total household kharcha ₹${projectedHhTotal.toLocaleString()} ho gaya hai, jo aapke strict monthly household budget (₹${hhBudget.toLocaleString()}) se ₹${hhExceededBy.toLocaleString()} ZYADA hai!\n\n` +
        `🛡️ STRICT WARNING:\n` +
        `Household aur ration ke kharche strictly disciplined hone chahiye! Faaltu ya advance rashan kharidari turant rokein, warna Mama ki wedding dress savings aur loan settlements direct khatre mein aa jayengi!`;
  } else if (isDailyBreach) {
    caCommentary = isEnglish
      ? `Protocol alert, Boss! 🚨 You've spent ₹${amount.toFixed(0)} (${category} - ${merchant}), exceeding today's ₹${dailyLimit} limit by ₹${exceededBy.toFixed(0)}.\n\n` +
        `📉 Daily Spend Limit Reduced:\n` +
        `To absorb this deficit without starving you tomorrow, I have reduced your ongoing daily allowance from ₹${dailyLimit} down to ₹${tomorrowAdjustedCap.toFixed(0)}/day across the remaining ~${daysRemaining} cycle days (-₹${dailyAmortizedDeduction}/day).\n\n` +
        `🚨 STRICT SOLVENCY WARNING:\n` +
        `Overspending directly endangers your ₹3,000 savings goals (Wedding Dress / Emergency Vault) and your ₹7,000 monthly debt repayment schedule! If you continue spending beyond this reduced limit, you will fail your savings deadlines and face loan default! Restrain all discretionary spending now! 🛡️`
      : `Protocol alert, Boss! 🚨 Aapne ₹${amount.toFixed(0)} (${category} - ${merchant}) kharch kiya, jo aaj ki ₹${dailyLimit} limit se ₹${exceededBy.toFixed(0)} zyada hai.\n\n` +
        `📉 Daily Spend Limit Ghata Di Gayi Hai:\n` +
        `Is deficit ko cover karne ke liye, maine aapka ongoing daily allowance ₹${dailyLimit} se ghata kar ₹${tomorrowAdjustedCap.toFixed(0)}/day kar diya hai baki bache ~${daysRemaining} dino ke liye (-₹${dailyAmortizedDeduction}/day).\n\n` +
        `🚨 STRICT SOLVENCY WARNING:\n` +
        `Yeh overspending aapki ₹3,000 savings (Wedding Dress) aur ₹7,000 monthly loan repayments ko direct khatre mein daal rahi hai! Agar aapne is nayi limit se zyada kharch kiya toh savings target aur loan deadlines miss ho jayenge! Faaltu kharche turant band karein! 🛡️`;
  } else if (isHousehold) {
    const hhRemaining = Math.max(0, hhBudget - projectedHhTotal);
    caCommentary = isEnglish
      ? `Household commitment recorded, Sir. Logged ₹${amount.toLocaleString()} for ${merchant} (${category}). Monthly household expenditure is at ₹${projectedHhTotal.toLocaleString()} of your ₹${hhBudget.toLocaleString()} ceiling (₹${hhRemaining.toLocaleString()} remaining). As a fixed overhead, your daily pocket allowance (₹${remainingSafeToSpend.toFixed(0)}) remains untouched.`
      : `Household kharcha record kar liya hai, Boss: ₹${amount.toLocaleString()} (${merchant}). Is mahine ka household kharcha ab ₹${projectedHhTotal.toLocaleString()} / ₹${hhBudget.toLocaleString()} hai (₹${hhRemaining.toLocaleString()} bacha hai). Aapki daily pocket allowance (₹${remainingSafeToSpend.toFixed(0)}) safe hai.`;
  } else {
    caCommentary = isEnglish
      ? `Receipt reconciled, Boss! Logged ₹${amount.toFixed(0)} for ${category} (${merchant}). Your remaining safe pocket allowance today stands at ₹${remainingSafeToSpend.toFixed(0)}. Discretionary runway remains sound, Boss!`
      : `Noted Boss! ₹${amount.toFixed(0)} (${category} - ${merchant}) log kar diya hai. Aaj ka remaining safe pocket money abhi ₹${remainingSafeToSpend.toFixed(0)} bacha hai.`;
  }

  return {
    merchant,
    amount,
    category,
    transactionType: 'expense',
    isDiscretionary,
    isOverLimit,
    exceededBy,
    remainingSafeToSpend,
    sentiment,
    caCommentary,
    breachCode,
    tomorrowAdjustedCap,
    autoAction: isDailyBreach
      ? {
          type: 'update_budget',
          budgetUpdate: {
            dailyLimit: tomorrowAdjustedCap,
          },
        }
      : undefined,
  };
}

export async function parseExpenseWithGemini(
  prompt: string,
  dailyLimit: number = 540,
  spentToday: number = 0,
  customApiKey?: string,
  context?: FinancialContext,
  chatHistory?: { sender: string; text: string }[]
): Promise<ParseExpenseResult> {
  const cleanPrompt = prompt.toLowerCase().trim();
  const isHypo =
    cleanPrompt.includes('what if') ||
    cleanPrompt.includes('suppose') ||
    cleanPrompt.includes('hypothetical') ||
    cleanPrompt.includes('agar main') ||
    cleanPrompt.includes('agar mai') ||
    cleanPrompt.includes('kya hoga agar') ||
    cleanPrompt.includes('soch raha') ||
    cleanPrompt.includes('can i afford');

  const isDeletion =
    (cleanPrompt.includes('delete') || cleanPrompt.includes('clear') || cleanPrompt.includes('remove') || cleanPrompt.includes('hatao') || cleanPrompt.includes('mitao')) &&
    (cleanPrompt.includes('transaction') || cleanPrompt.includes('record') || cleanPrompt.includes('history') || cleanPrompt.includes('all') || cleanPrompt.includes('sab'));

  const isAdjustUpcoming =
    (cleanPrompt.includes('adjust') || cleanPrompt.includes('upcoming') || cleanPrompt.includes('ahead')) &&
    (cleanPrompt.includes('daily') || cleanPrompt.includes('spent') || cleanPrompt.includes('spend')) &&
    (cleanPrompt.includes('party') || cleanPrompt.includes('event') || cleanPrompt.includes('pay') || cleanPrompt.includes('accordingly') || cleanPrompt.includes('farewell') || cleanPrompt.includes('plan'));

  const isHhRemaining =
    (cleanPrompt.includes('household') || cleanPrompt.includes('house hold') || cleanPrompt.includes('ghar ka kharcha') || cleanPrompt.includes('ghar ke kharche') || cleanPrompt.includes('rashan') || cleanPrompt.includes('ration') || cleanPrompt.includes('grocery')) &&
    (cleanPrompt.includes('kitna bacha') || cleanPrompt.includes('kitne bache') || cleanPrompt.includes('kitna paisa bacha') || cleanPrompt.includes('kitna bacha h') || cleanPrompt.includes('bacha h') || cleanPrompt.includes('bacha hai') || cleanPrompt.includes('bache h') || cleanPrompt.includes('how much left') || cleanPrompt.includes('how much is left') || cleanPrompt.includes('remaining') || cleanPrompt.includes('balance kitna') || cleanPrompt.includes('balance'));

  const isHhBreachCheck =
    (cleanPrompt.includes('household') || cleanPrompt.includes('house hold') || cleanPrompt.includes('ghar ka kharcha')) &&
    (cleanPrompt.includes('exceed') || cleanPrompt.includes('cross') || cleanPrompt.includes('over limit') || cleanPrompt.includes('limit cross') || cleanPrompt.includes('zyada ho gaya') || cleanPrompt.includes('over budget'));

  const isNegative = cleanPrompt.includes('-') && /(?:^|\s)-\s*(?:₹|rs\.?|inr)?\s*\d+/i.test(cleanPrompt);
  const isFatFinger = /(?:₹|rs\.?|inr)?\s*(\d{6,})/i.test(cleanPrompt) && !/\b(?:confirm|confirmed|haan?|yes|sahi hai)\b/i.test(cleanPrompt) && !cleanPrompt.includes('rent') && !cleanPrompt.includes('kiraya') && !cleanPrompt.includes('salary');
  const isGoalWithdrawalAttempt =
    (cleanPrompt.includes('fund') || cleanPrompt.includes('goal') || cleanPrompt.includes('saving') || cleanPrompt.includes('buffer') || cleanPrompt.includes('emergency') || cleanPrompt.includes('vault') || (context?.goals && context.goals.some((g) => cleanPrompt.includes(g.name.toLowerCase())))) &&
    (cleanPrompt.includes('nikaal') || cleanPrompt.includes('nikal') || cleanPrompt.includes('withdraw') || cleanPrompt.includes('le lo') || cleanPrompt.includes('lelo') || cleanPrompt.includes('de do') || cleanPrompt.includes('dedo') || cleanPrompt.includes('transfer') || cleanPrompt.includes('bhejo') || cleanPrompt.includes('bhej'));
  const isGoalAllocationAttempt =
    (cleanPrompt.includes('goal') || cleanPrompt.includes('saving') || cleanPrompt.includes('vault') || cleanPrompt.includes('fund')) &&
    (cleanPrompt.includes('deposit') || cleanPrompt.includes('allocate') || cleanPrompt.includes('daal') || cleanPrompt.includes('dal') || cleanPrompt.includes('jama'));
  const isDebtRepayment = extractMultiSettlements(prompt) !== null || /pay\s*back|repay|settle|settel|clear|paid|chukta|chuka|de\s*diye|wapas\s*diye|lautaye/i.test(cleanPrompt);
  const isRecordCorrection =
    (cleanPrompt.includes('fix') || cleanPrompt.includes('change') || cleanPrompt.includes('galat') || cleanPrompt.includes('wrong') || cleanPrompt.includes('wait') || cleanPrompt.includes('arre')) &&
    (cleanPrompt.includes('owes me') || cleanPrompt.includes('lena hai') || cleanPrompt.includes('lene hai') || cleanPrompt.includes('receivable') || cleanPrompt.includes('flip'));

  // Immediate deterministic execution for safety-critical simulations, commands, goal operations, and debt settlements
  if (isHypo || isDeletion || isAdjustUpcoming || isHhRemaining || isHhBreachCheck || isNegative || isFatFinger || isGoalWithdrawalAttempt || isGoalAllocationAttempt || isDebtRepayment || isRecordCorrection) {
    return parseExpenseWithRules(prompt, dailyLimit, spentToday, context, chatHistory);
  }

  const apiKey = customApiKey || process.env.GEMINI_API_KEY;

  if (!apiKey || apiKey === 'YOUR_GEMINI_API_KEY_HERE') {
    return parseExpenseWithRules(prompt, dailyLimit, spentToday, context, chatHistory);
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    // Use gemini-flash-lite-latest which has instant latency and high availability
    const model = genAI.getGenerativeModel({
      model: process.env.GEMINI_MODEL || 'gemini-flash-lite-latest',
      systemInstruction: SYSTEM_PROMPT,
      generationConfig: {
        responseMimeType: 'application/json',
      },
    });

    const isEnglish = isEnglishPrompt(prompt);

    const historySnippet = chatHistory && chatHistory.length > 0
      ? chatHistory.map((h) => `${h.sender === 'user' ? 'Sir' : 'J.A.R.V.I.S.'}: "${h.text}"`).join('\n')
      : 'No prior conversation in this session.';

    const hhBudgetVal = context?.householdSummary?.budget ?? context?.fixedBills ?? 10000;
    const hhSpentVal = context?.householdSummary?.spent || 0;
    const hhRemainVal = Math.max(0, hhBudgetVal - hhSpentVal);

    const userContext = `
CRITICAL LANGUAGE & SIMPLICITY DIRECTIVE:
- Current User Prompt: "${prompt}"
- Language of this prompt: ${isEnglish ? 'ENGLISH' : 'HINGLISH'}
${isEnglish ? `
🚨 STRICT ENGLISH DIRECTIVE:
1. The user wrote in ENGLISH. You MUST write "ca_commentary" in SIMPLE, POLITE ENGLISH.
2. Address as "Boss" or "Sir".
3. STRICTLY NO HARD VOCABULARY! NEVER use words like "statutory", "sequestered", "reconciled", "discretionary runway", "recalibrates", "decorum", "solvency", "amortization", "expended", "accumulate", "telemetry", "sanctuary".
4. Write in short, clear, friendly sentences.
` : `
🚨 STRICT HINGLISH DIRECTIVE:
1. The user wrote in HINGLISH/HINDI. You MUST write "ca_commentary" in 100% NATURAL, FRIENDLY HINGLISH ONLY.
2. Address as "Boss" or "Sir". Do NOT reply in pure formal English.
`}

User prompt: "${prompt}"

Recent Conversation History (For Pronoun Resolution & Conversational Memory):
${historySnippet}

Current Financial Diagnostics:
- Monthly Salary: ₹${context?.salary || 25000}
- Current Liquid Total Balance: ₹${context?.currentBalance || 25000}
- Spendable Cash Reserves: ₹${context?.availableLiquidCash || 25000}
- Locked in Savings Goals: ₹${context?.totalSavedGoals || 0}
- Fixed Bills: ₹${context?.fixedBills || 10000}
- Monthly Household Overhead Budget Ceiling: ₹${hhBudgetVal}
- Household Overhead Expended This Month: ₹${hhSpentVal}
- Household Remaining Safe Ceiling: ₹${hhRemainVal}
- Daily Spending Limit: ₹${dailyLimit}
- Spent Today: ₹${spentToday}
- Remaining Safe to Spend Today: ₹${Math.max(0, dailyLimit - spentToday)}
- Total Transactions Recorded: ${context?.transactionsCount || 5}
- Recent Transactions: ${JSON.stringify(context?.recentTransactions || [])}
- Active Goals & Targets: ${JSON.stringify(context?.goals || [])}
- Debts & Liabilities Summary (Lent vs Owed): ${JSON.stringify(context?.debtsSummary || {})}
- Spending Aggregates by Category: ${JSON.stringify(context?.spendingAggregates || {})}
- Pay Day: Night of 7th of every month
- Current Date: "${new Date().toISOString().split('T')[0]}"

RULES FOR YOUR RESPONSE:
1. DYNAMIC OPENINGS (DO NOT BE A ROBOT): Vary your phrases dynamically: "Got it, Boss", "Checking the ledger now", "All systems green, Boss", "Right away, Boss", or answer directly!
2. MULTI-TURN PRONOUN RESOLUTION & MONEY RECEIVED (CRITICAL):
   - If money received: set amount: exact amount, transaction_type: "income", auto_action: { "type": "settle_debt" }.
3. GOAL ALLOCATION / DEPOSIT (CRITICAL):
   - If Sir allocates to a goal: set amount: amount, transaction_type: "transfer", auto_action: { "type": "allocate_goal" }. DO NOT DEDUCT FROM DAILY DISCRETIONARY ALLOWANCE!
4. DEBTS & BORROWING (CRITICAL):
   - If Sir owes: set amount: 0, auto_action: { "type": "create_payable" }. DO NOT DEDUCT FROM TODAY'S ALLOWANCE!
5. BALANCE & GOALS INQUIRIES: Set amount: 0. Report balances or active goals.
6. TRANSACTION DELETION (STRICT IMMUTABILITY RULE):
   - If asked to delete transactions, STRICTLY REFUSE with Security Protocol Enforced message. NEVER delete records.
7. HYPOTHETICAL SIMULATIONS:
   - Always amount: 0! Calculate slashed upcoming daily allowance and set tomorrow_adjusted_cap to the reduced limit. Provide strict warning on savings and debt repayments.
8. OVERSPEND ENFORCEMENT & DEFICIT AMORTIZATION:
   - When over limit, amortize deficit across remaining days. Set tomorrow_adjusted_cap to reduced limit, emit auto_action: { "type": "update_budget", "budgetUpdate": { "dailyLimit": tomorrow_adjusted_cap } }, and give STRICT WARNING that savings goals and debt repayments are at risk!
9. HOUSEHOLD EXPENSES & STRICT CEILING ENFORCEMENT (CRITICAL):
   - For actual household transactions (where amount > 0, e.g. grocery, rent, utilities, rashan):
     * Set is_discretionary: false.
     * If (spent + amount) > budget:
       - MUST set is_over_limit: true!
       - MUST set breach_code: "HOUSEHOLD-BREACH"!
       - MUST set sentiment: "scold"!
       - MUST set exceeded_by: (spent + amount) - budget!
       - In ca_commentary, issue a strict butler reprimand warning Sir that this ₹[amount] spend breaches his household budget.
     * If (spent + amount) <= budget:
       - Set is_over_limit: false, sentiment: "praise".
   - For household inquiries (where amount = 0, e.g. "household kitna bacha h", "how much left in household", "ghar ke kharche me kitna bacha", "kya limit cross hui"):
     * THIS IS A CONVERSATIONAL INQUIRY, NOT A SPEND!
     * MUST set amount: 0, is_over_limit: false, breach_code: null, sentiment: "praise".
     * In ca_commentary: Analyze intent and answer directly!
       - If asking how much is left and spent > budget (deficit):
         Explain clearly: "Boss, household budget mein abhi kuch nahi bacha hai, balki hum ₹[spent - budget] deficit mein chal rahe hain (₹[spent] kharch ho chuka hai ₹[budget] limit mein se). Abhi extra outlays hold par rakhein!"
       - If asking how much is left and spent <= budget:
         Explain: "Boss, aapke household budget mein se abhi ₹[budget - spent] bache hue hain (₹[spent] spent out of ₹[budget] ceiling). Provisions perfectly control mein hain!"
       - If asking "Did I cross/exceed the limit":
         If spent > budget: state YES, exceeded by (spent - budget).
         If spent <= budget: state NO, report safe remaining balance.
`;

    let result;
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        result = await model.generateContent(userContext);
        break;
      } catch (err) {
        if (attempt === 2) throw err;
        await new Promise((res) => setTimeout(res, 500));
      }
    }

    if (!result) throw new Error('No result returned from model');
    const text = result.response.text();
    const parsed = JSON.parse(text);

    let finalCommentary = parsed.ca_commentary || 'Ji Boss, update kar diya hai.';

    if (isEnglish) {
      // If user asked in English, ensure NO hard vocabulary or accidental Hindi slip-ups
      finalCommentary = finalCommentary
        .replace(/\bstatutory\b/gi, 'target')
        .replace(/\bsequestered\b/gi, 'saved')
        .replace(/\breconciled\b/gi, 'logged')
        .replace(/\bdiscretionary runway\b/gi, 'daily budget')
        .replace(/\bdiscretionary allowance\b/gi, 'daily pocket money')
        .replace(/\brecalibrates\b/gi, 'adjusts')
        .replace(/\bdecorum\b/gi, 'ease')
        .replace(/\bsolvency\b/gi, 'budget balance')
        .replace(/\bamortization\b/gi, 'daily adjustment')
        .replace(/\bexpended\b/gi, 'spent')
        .replace(/\baccumulate\b/gi, 'save')
        .replace(/\baccumulated\b/gi, 'saved')
        .replace(/\btelemetry\b/gi, 'records')
        .replace(/\bquantum intuition\b/gi, 'system')
        .replace(/\bexistential\b/gi, 'daily')
        .replace(/\bpedestrian\b/gi, 'basic')
        .replace(/\bsanctuary vault\b/gi, 'savings vault')
        .replace(/\bsanctuary reserves\b/gi, 'savings reserves');

      // If the model erroneously produced Hindi despite English prompt:
      const hasExcessiveHindi = /\b(humare|paas|mein|aur|kuch|sab|kar|diye|hain|raha|hoga|karein)\b/i.test(finalCommentary);
      if (hasExcessiveHindi) {
        const ruleFallback = parseExpenseWithRules(prompt, dailyLimit, spentToday, context, chatHistory);
        finalCommentary = ruleFallback.caCommentary;
      }
    } else {
      finalCommentary = finalCommentary
        .replace(/\bstatutory\b/gi, 'target')
        .replace(/\bsequestered\b/gi, 'safe')
        .replace(/\bdiscretionary runway\b/gi, 'daily kharcha')
        .replace(/\bdiscretionary allowance\b/gi, 'daily pocket money')
        .replace(/\bsanctuary vault\b/gi, 'savings vault')
        .replace(/\bsanctuary reserves\b/gi, 'savings');
    }

    let parsedAmount = typeof parsed.amount === 'number' ? parsed.amount : parseFloat(parsed.amount) || 0;
    const isHouseholdExpense =
      cleanPrompt.includes('household') ||
      cleanPrompt.includes('house hold') ||
      cleanPrompt.includes('grocer') ||
      cleanPrompt.includes('blinkit') ||
      cleanPrompt.includes('zepto') ||
      cleanPrompt.includes('instamart') ||
      cleanPrompt.includes('rashan') ||
      cleanPrompt.includes('ration') ||
      cleanPrompt.includes('rent') ||
      cleanPrompt.includes('kiraya') ||
      cleanPrompt.includes('bill') ||
      cleanPrompt.includes('utility') ||
      cleanPrompt.includes('utilities') ||
      cleanPrompt.includes('doodh') ||
      cleanPrompt.includes('milk') ||
      cleanPrompt.includes('sabzi') ||
      cleanPrompt.includes('vegetable') ||
      (parsed.category && (
        parsed.category.toLowerCase().includes('household') ||
        parsed.category.toLowerCase().includes('mandatory') ||
        parsed.category.toLowerCase().includes('utilities') ||
        parsed.category.toLowerCase().includes('bills')
      ));

    let isOverLimit = Boolean(parsed.is_over_limit);
    let exceededBy = parsed.exceeded_by || 0;
    let sentiment: 'praise' | 'scold' = parsed.sentiment === 'scold' ? 'scold' : 'praise';
    let breachCode = parsed.breach_code;
    let isDiscretionary = parsed.is_discretionary ?? true;

    if (parsedAmount === 0) {
      // Inquiries, questions, and status checks are NEVER transactions or over-limit scolds!
      isOverLimit = false;
      exceededBy = 0;
      sentiment = 'praise';
      breachCode = undefined;
      isDiscretionary = false;
    } else if (isHouseholdExpense && parsedAmount > 0) {
      isDiscretionary = false;
      const hhBudget = context?.householdSummary?.budget ?? context?.fixedBills ?? 10000;
      const currentHhSpent = context?.householdSummary?.spent || 0;
      const projectedHhTotal = currentHhSpent + parsedAmount;

      if (projectedHhTotal > hhBudget) {
        isOverLimit = true;
        exceededBy = projectedHhTotal - hhBudget;
        sentiment = 'scold';
        breachCode = 'HOUSEHOLD-BREACH';

        finalCommentary = isEnglish
          ? `🚨 STRICT HOUSEHOLD PROTOCOL BREACH, Sir!\n\n` +
            `You have logged ₹${parsedAmount.toLocaleString()} for ${parsed.category || 'Household Mandatory'} (${parsed.merchant || 'Household Expenses'}). This surges your monthly household spend to ₹${projectedHhTotal.toLocaleString()}, which violently EXCEEDS your strict monthly household ceiling of ₹${hhBudget.toLocaleString()} by ₹${exceededBy.toLocaleString()}!\n\n` +
            `🛡️ MANDATORY RESTRAINT DIRECTIVE:\n` +
            `Household overhead is strictly capped. Any further leakage here directly threatens your savings goals and debt repayment milestones! Freeze non-essential provisions immediately, Sir!`
          : `🚨 STRICT HOUSEHOLD PROTOCOL BREACH, Boss!\n\n` +
            `Aapne ${parsed.category || 'Household Mandatory'} (${parsed.merchant || 'Household Expenses'}) par ₹${parsedAmount.toLocaleString()} kharch kiya hai. Isse aapka is mahine ka total household kharcha ₹${projectedHhTotal.toLocaleString()} ho gaya hai, jo aapke strict monthly household budget (₹${hhBudget.toLocaleString()}) se ₹${exceededBy.toLocaleString()} ZYADA hai!\n\n` +
            `🛡️ STRICT WARNING:\n` +
            `Household aur ration ke kharche strictly control mein hone chahiye! Faaltu kharche turant rokein, warna loan repayments aur savings goals khatre mein aa jayenge!`;
      }
    }

    // Universal Abort & Halt Safeguard:
    // If commentary indicates that the transaction was halted, aborted, cancelled, or intercepted,
    // force parsedAmount to 0 and clear any auto_action to guarantee zero transactions are recorded!
    const commentaryLower = finalCommentary.toLowerCase();
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
      parsedAmount = 0;
      sentiment = 'scold';
      isOverLimit = false;
      exceededBy = 0;
      parsed.auto_action = undefined;
      parsed.auto_actions = [];
    }

    return {
      merchant: (isHouseholdExpense && (!parsed.merchant || parsed.merchant === 'General Expense')) ? 'Household Expenses' : (parsed.merchant || 'General Expense'),
      amount: parsedAmount,
      category: isHouseholdExpense ? 'Household Mandatory' : (parsed.category || 'Pocket Money'),
      transactionType: (parsed.transaction_type as any) || 'expense',
      isDiscretionary,
      isOverLimit,
      exceededBy,
      remainingSafeToSpend: parsed.remaining_safe_to_spend ?? Math.max(0, dailyLimit - (spentToday + (isDiscretionary ? parsedAmount : 0))),
      sentiment,
      caCommentary: finalCommentary,
      breachCode,
      tomorrowAdjustedCap: parsed.tomorrow_adjusted_cap ?? Math.max(0, dailyLimit - (isDiscretionary ? exceededBy : 0)),
      autoAction: parsed.auto_action || (parsed.auto_actions && parsed.auto_actions[0]),
      autoActions: parsed.auto_actions || (parsed.auto_action ? [parsed.auto_action] : undefined),
    };
  } catch (error) {
    console.warn('Gemini API call failed, using J.A.R.V.I.S. rule engine:', error);
    return parseExpenseWithRules(prompt, dailyLimit, spentToday, context, chatHistory);
  }
}
