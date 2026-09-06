import { NextRequest, NextResponse } from 'next/server';
import { parseExpenseWithGemini } from '@/lib/geminiClient';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { prompt, dailyLimit = 540, spentToday = 0, apiKey: bodyKey, context, chatHistory } = body;
    const headerKey = req.headers.get('x-gemini-key');
    const customApiKey = headerKey || bodyKey || undefined;

    if (!prompt || typeof prompt !== 'string') {
      return NextResponse.json(
        { error: 'A valid text prompt is required to audit the expense.' },
        { status: 400 }
      );
    }

    const auditResult = await parseExpenseWithGemini(
      prompt,
      Number(dailyLimit),
      Number(spentToday),
      customApiKey,
      context,
      chatHistory
    );

    return NextResponse.json(auditResult);
  } catch (error: any) {
    console.error('API /api/gemini/parse error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server audit error' },
      { status: 500 }
    );
  }
}
