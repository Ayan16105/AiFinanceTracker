import { NextRequest, NextResponse } from 'next/server';
import { MsEdgeTTS, OUTPUT_FORMAT } from 'msedge-tts';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { text, voice = 'en-GB-RyanNeural' } = body;

    if (!text || typeof text !== 'string') {
      return NextResponse.json({ error: 'Text is required for TTS generation' }, { status: 400 });
    }

    // Clean text for natural speech synthesis
    const cleanText = text
      .replace(/https?:\/\/\S+/g, '') // remove URLs
      .replace(/[*#_~`•👉✅🤝🏠☕🚕⚠️💬⚖️🚨🎩💳⚡🛡️🎯💰💼⏳🥊🚀✨👗🧐]/gu, '') // remove emojis/markdown
      .replace(/₹\s*(\d+(?:,\d+)*(?:\.\d+)?)/g, '$1 rupees') // replace currency symbols with word
      .replace(/₹/g, ' rupees ')
      .replace(/-rupees/g, 'minus rupees')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 600); // 600 characters max for instant response

    if (!cleanText) {
      return NextResponse.json({ error: 'No speakable text provided' }, { status: 400 });
    }

    const tts = new MsEdgeTTS();
    await tts.setMetadata(voice, OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3);

    const { audioStream } = tts.toStream(cleanText);

    const chunks: Buffer[] = [];
    await new Promise<void>((resolve, reject) => {
      audioStream.on('data', (chunk: Buffer) => chunks.push(chunk));
      audioStream.on('end', () => resolve());
      audioStream.on('error', (err: any) => reject(err));
    });

    const audioBuffer = Buffer.concat(chunks);

    return new NextResponse(audioBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'audio/mpeg',
        'Content-Length': audioBuffer.length.toString(),
        'Cache-Control': 'public, max-age=86400',
      },
    });
  } catch (error: any) {
    console.error('API /api/tts error:', error);
    return NextResponse.json(
      { error: error.message || 'TTS speech synthesis failed' },
      { status: 500 }
    );
  }
}
