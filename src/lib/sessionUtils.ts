// src/lib/sessionUtils.ts

/**
 * Generates an intelligent, clean, topic-based session heading
 * similar to Gemini / ChatGPT based on the user prompt, merchant, and category.
 */
export function generateGeminiSessionTitle(
  prompt: string,
  merchant?: string,
  category?: string
): string {
  if (!prompt || typeof prompt !== 'string') {
    if (merchant && !merchant.includes('General') && !merchant.includes('J.A.R.V.I.S.')) {
      return `${merchant.slice(0, 20)} Ledger`;
    }
    return 'Financial Briefing';
  }

  const clean = prompt.trim();
  const lower = clean.toLowerCase();

  // 1. Multi-settlement / Compound paybacks
  if (
    lower.includes('settle') ||
    lower.includes('settel') ||
    lower.includes('payback') ||
    lower.includes('pay back') ||
    lower.includes('paid') ||
    lower.includes('de diye')
  ) {
    if (lower.includes('kamran')) return 'Kamran & Debt Paybacks';
    if (lower.includes('respectively') || lower.includes('respectivly')) return 'Multi-Party Debt Settlements';
    if (lower.includes('rahul')) return 'Rahul Debt Settlement';
    if (lower.includes('sharma')) return 'Sharma Ji Settlement';
    if (lower.includes('man 1') || lower.includes('man 2')) return 'Split Debt Settlements';
    return 'Debt Repayment Ledger';
  }

  // 2. Liabilities / Borrowing
  if (
    lower.includes('dene h') ||
    lower.includes('dena hai') ||
    lower.includes('owe') ||
    lower.includes('karza') ||
    lower.includes('udhaar')
  ) {
    if (lower.includes('dost') || lower.includes('friend')) return 'Friend Loan Liability';
    return 'Debt & Liability Record';
  }

  // 3. Receivables / Money lent
  if (
    lower.includes('lena hai') ||
    lower.includes('lene h') ||
    lower.includes('owes me') ||
    lower.includes('wapas')
  ) {
    return 'Receivable Asset Entry';
  }

  // 4. Balances & Financial health inquiries
  if (
    lower.includes('balance') ||
    lower.includes('kitna h') ||
    lower.includes('kitna bacha') ||
    lower.includes('paisa') ||
    lower.includes('safe to spend')
  ) {
    return 'Account Balance Inquiry';
  }

  // 5. Strategy & Savings advice / Planning
  if (
    lower.includes('save') ||
    lower.includes('batao') ||
    lower.includes('suggest') ||
    lower.includes('plan') ||
    lower.includes('advice') ||
    lower.includes('kaise')
  ) {
    return 'Debt & Savings Strategy';
  }

  // 6. Savings Goals (Mama, Emergency, iPhone, etc.)
  if (lower.includes('mama') || lower.includes('wedding') || lower.includes('dress')) {
    return "Mama's Dress Savings";
  }
  if (lower.includes('emergency')) {
    if (lower.includes('nikaal') || lower.includes('withdraw') || lower.includes('transfer')) {
      return 'Emergency Fund Retrieval';
    }
    return 'Emergency Vault Allocation';
  }
  if (lower.includes('iphone') || lower.includes('apple')) return 'iPhone Savings Vault';
  if (lower.includes('goal') || lower.includes('saving')) return 'Savings Goal Management';

  // 7. Everyday food / tea / groceries
  if (lower.includes('tea') || lower.includes('chai') || lower.includes('coffee')) {
    return 'Tea & Daily Spends';
  }
  if (lower.includes('grocer') || lower.includes('ration') || lower.includes('vegetable') || lower.includes('sabzi')) {
    return 'Groceries & Household';
  }
  if (lower.includes('zomato') || lower.includes('swiggy') || lower.includes('dinner') || lower.includes('lunch') || lower.includes('food')) {
    return 'Dining & Food Outflow';
  }
  if (lower.includes('fuel') || lower.includes('petrol') || lower.includes('metro') || lower.includes('uber') || lower.includes('cab')) {
    return 'Transport & Commute';
  }

  // 8. Named Merchant or Category specific
  if (merchant && !merchant.includes('General') && !merchant.includes('J.A.R.V.I.S.') && !merchant.includes('Expense')) {
    return `${merchant.slice(0, 22)} Expense`;
  }

  if (category && category !== 'Pocket Money' && category !== 'General Expense') {
    return `${category} Log`;
  }

  // 9. Intelligent fallback: extract first 2-3 significant words
  const words = clean
    .replace(/[^\w\s]/g, '')
    .split(/\s+/)
    .filter((w) => !/^(i|a|an|the|to|for|in|at|and|me|mein|ko|se|ka|ki|ke|hai|kardo|kar|diya|de|kuch|tha|thi|aaj)$/i.test(w))
    .slice(0, 3)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase());

  if (words.length > 0) {
    return `${words.join(' ')} Session`;
  }

  return 'Financial Briefing';
}
