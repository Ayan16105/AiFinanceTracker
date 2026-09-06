export interface ParsedBankAlert {
  isBankAlert: boolean;
  amount: number;
  merchant: string;
  suggestedCategory: string;
  cleanSummary: string;
  isDebit: boolean;
}

const CATEGORY_KEYWORDS: Record<string, string[]> = {
  'Food & Dining': [
    'zomato', 'swiggy', 'mcdonald', 'kfc', 'domino', 'pizza', 'burger', 'starbucks',
    'chai', 'cafe', 'restaurant', 'dhaba', 'bakery', 'eats', 'biryani', 'subway',
    'haldiram', 'bbq', 'barbeque'
  ],
  'Groceries': [
    'blinkit', 'zepto', 'instamart', 'bigbasket', 'dmart', 'supermarket', 'grocery',
    'kirana', 'nature basket', 'reliance fresh', 'milk', 'vegetable', 'fruits', 'spencer'
  ],
  'Transport': [
    'uber', 'ola', 'rapido', 'metro', 'petrol', 'fuel', 'indian oil', 'iocl', 'bpcl',
    'hpcl', 'shell', 'irctc', 'railway', 'makemytrip', 'redbus', 'toll', 'fastag',
    'parking', 'auto'
  ],
  'Shopping': [
    'amazon', 'flipkart', 'myntra', 'zara', 'h&m', 'nykaa', 'ajio', 'meesho',
    'croma', 'reliance digital', 'tatacliq', 'decathlon', 'uniqlo', 'clothing',
    'mall', 'retail'
  ],
  'Utilities': [
    'airtel', 'jio', 'vi', 'vodafone', 'electricity', 'bescom', 'tata power',
    'adani power', 'torrent', 'water bill', 'gas', 'indane', 'hp gas', 'bharat gas',
    'broadband', 'act fibernet', 'recharge', 'wifi'
  ],
  'Entertainment': [
    'netflix', 'prime video', 'disney', 'hotstar', 'spotify', 'bookmyshow', 'pvr',
    'inox', 'cinema', 'movie', 'youtube', 'apple music', 'steam', 'playstation'
  ],
  'Health & Medical': [
    'apollo', 'pharmacy', 'medplus', 'netmeds', 'tata 1mg', 'hospital', 'clinic',
    'dr ', 'doctor', 'diagnostic', 'pathology', 'dentist', 'chemist'
  ]
};

export function suggestCategoryFromMerchant(merchantOrText: string): string {
  const lower = merchantOrText.toLowerCase();
  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    for (const kw of keywords) {
      if (lower.includes(kw)) {
        return category;
      }
    }
  }
  return 'General Discretionary';
}

export function parseBankSms(smsText: string): ParsedBankAlert | null {
  if (!smsText || typeof smsText !== 'string') return null;

  const raw = smsText.trim();
  const lower = raw.toLowerCase();

  // If this is purely an OTP message without a debit, reject it
  if ((lower.includes('otp') || lower.includes('one time password')) && !lower.includes('debited') && !lower.includes('spent') && !lower.includes('paid')) {
    return null;
  }

  // Check if it's a debit / spend notification
  const isDebit = 
    lower.includes('debited') ||
    lower.includes('spent') ||
    lower.includes('paid') ||
    lower.includes('withdrawn') ||
    lower.includes('sent to') ||
    lower.includes('txn') ||
    lower.includes('payment to');

  if (!isDebit && !lower.includes('upi')) {
    // Might not be a transaction notification
    return null;
  }

  // 1. Extract Amount
  // Matches Rs. 250, Rs 250.00, INR 1,500, ₹500, Paid Rs 300, etc.
  const amountPatterns = [
    /(?:rs\.?|inr|₹)\s*([\d,]+(?:\.\d{1,2})?)/i,
    /debited\s*(?:by|for)?\s*(?:rs\.?|inr|₹)?\s*([\d,]+(?:\.\d{1,2})?)/i,
    /paid\s*(?:rs\.?|inr|₹)?\s*([\d,]+(?:\.\d{1,2})?)/i,
    /spent\s*(?:rs\.?|inr|₹)?\s*([\d,]+(?:\.\d{1,2})?)/i,
    /(?:amount|amt)\s*(?:of)?\s*(?:rs\.?|inr|₹)?\s*([\d,]+(?:\.\d{1,2})?)/i
  ];

  let amount = 0;
  for (const pattern of amountPatterns) {
    const match = raw.match(pattern);
    if (match && match[1]) {
      const cleanedNum = parseFloat(match[1].replace(/,/g, ''));
      if (!isNaN(cleanedNum) && cleanedNum > 0) {
        amount = cleanedNum;
        break;
      }
    }
  }

  if (amount <= 0) {
    return null;
  }

  // 2. Extract Merchant / Payee
  let merchant = '';

  const merchantPatterns = [
    /(?:to|towards|at)\s+([A-Za-z0-9\s&'.-]{2,30}?)(?:\s+(?:on|using|via|upi|ref|rrn|avl|bal|info|account|a\/c|from|dated|\.|\,)|$)/i,
    /info[:\s]+([A-Za-z0-9\s&'.-]{2,30}?)(?:\s+(?:on|using|via|upi|ref|rrn|avl|bal|account|a\/c|\.|\,)|$)/i,
    /(?:vpa|payee)\s+([A-Za-z0-9\s&'.-]{2,30}?)(?:\s+(?:on|using|via|ref|rrn|\.|\,)|$)/i
  ];

  for (const pattern of merchantPatterns) {
    const match = raw.match(pattern);
    if (match && match[1]) {
      const candidate = match[1].trim();
      // Filter out false positives
      const candidateLower = candidate.toLowerCase();
      if (!['your', 'a/c', 'account', 'card', 'bank', 'sbi', 'hdfc', 'icici', 'axis', 'rs', 'inr'].includes(candidateLower)) {
        merchant = candidate;
        break;
      }
    }
  }

  // Fallback merchant if not cleanly matched
  if (!merchant) {
    if (lower.includes('zomato')) merchant = 'Zomato';
    else if (lower.includes('swiggy')) merchant = 'Swiggy';
    else if (lower.includes('blinkit')) merchant = 'Blinkit';
    else if (lower.includes('zepto')) merchant = 'Zepto';
    else if (lower.includes('amazon')) merchant = 'Amazon';
    else if (lower.includes('flipkart')) merchant = 'Flipkart';
    else if (lower.includes('uber')) merchant = 'Uber';
    else if (lower.includes('ola')) merchant = 'Ola';
    else if (lower.includes('rapido')) merchant = 'Rapido';
    else if (lower.includes('petrol') || lower.includes('fuel')) merchant = 'Fuel Station';
    else merchant = 'UPI Merchant';
  }

  // Clean merchant text: capitalize words, remove trailing punctuation
  merchant = merchant.replace(/[.,;:]+$/, '').trim();
  merchant = merchant.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

  // 3. Category Suggestion
  const suggestedCategory = suggestCategoryFromMerchant(merchant + ' ' + raw);

  // 4. Clean summary for user
  const cleanSummary = `₹${amount} paid to ${merchant}`;

  return {
    isBankAlert: true,
    amount,
    merchant,
    suggestedCategory,
    cleanSummary,
    isDebit
  };
}
