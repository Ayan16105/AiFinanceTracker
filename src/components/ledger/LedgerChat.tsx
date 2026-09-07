'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useFinance } from '@/context/FinanceContext';
import {
  Send,
  Mic,
  MicOff,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Key,
  Check,
  Volume2,
  VolumeX,
  Compass,
  Sliders,
  Zap,
  Receipt,
  ChevronDown,
  MessageSquare,
  Plus,
  Trash2,
  ClipboardCopy,
  X
} from 'lucide-react';

export default function LedgerChat() {
  const {
    chatMessages,
    logExpense,
    isAuditing,
    userSettings,
    payCycleInfo,
    todayDeficit,
    safeToSpendRemaining,
    tomorrowAdjustedCap,
    spentToday,
    transactions,
    setActiveTab,
    updateUserSettings,
    resetTodaySpending,
    clearChatMessages,
    sessions,
    currentSessionId,
    createNewSession,
    switchSession,
    deleteSession,
    clearAllSessions,
    processBankSms,
    confirmBankAlertTransaction,
    confirmBorrowDeposit,
    dismissBorrowDeposit,
  } = useFinance();

  const [inputPrompt, setInputPrompt] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const [isPlayingVoice, setIsPlayingVoice] = useState(false);
  const [playingMessageId, setPlayingMessageId] = useState<string | null>(null);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [isSessionMenuOpen, setIsSessionMenuOpen] = useState(false);
  const [isBankModalOpen, setIsBankModalOpen] = useState(false);
  const [bankSmsInput, setBankSmsInput] = useState('');
  const [bankSmsStatus, setBankSmsStatus] = useState<string | null>(null);

  // Per-message categorization and description state for interactive butler cards
  const [selectedCategoryMap, setSelectedCategoryMap] = useState<Record<string, string>>({});
  const [descriptionMap, setDescriptionMap] = useState<Record<string, string>>({});

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);
  const lastSpokenMessageIdRef = useRef<string | null>(null);

  const stopJarvisVoice = useCallback(() => {
    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current.currentTime = 0;
      currentAudioRef.current = null;
    }
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
      } catch (e) {
        console.warn('Speech cancellation error:', e);
      }
    }
    setIsPlayingVoice(false);
    setPlayingMessageId(null);
  }, []);

  // J.A.R.V.I.S. British Neural Voice Synthesizer (Edge Neural TTS + Fallback)
  const playJarvisVoice = useCallback(async (text: string, msgId?: string) => {
    stopJarvisVoice();
    if (!text || typeof window === 'undefined') return;

    if (msgId) setPlayingMessageId(msgId);
    setIsPlayingVoice(true);

    const cleanText = text
      .replace(/https?:\/\/\S+/g, '')
      .replace(/[*#_~`•👉✅🤝🏠☕🚕⚠️💬⚖️🚨🎩💳⚡🛡️🎯💰💼⏳🥊🚀✨👗🧐]/gu, '')
      .replace(/₹\s*(\d+(?:,\d+)*(?:\.\d+)?)/g, '$1 rupees')
      .replace(/₹/g, ' rupees ')
      .replace(/\n+/g, '. ')
      .trim()
      .slice(0, 500);

    try {
      const response = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: cleanText, voice: 'en-GB-RyanNeural' }),
      });

      if (!response.ok) throw new Error(`Edge TTS API returned ${response.status}`);

      const blob = await response.blob();
      const audioUrl = URL.createObjectURL(blob);
      const audio = new Audio(audioUrl);
      currentAudioRef.current = audio;

      audio.onended = () => {
        URL.revokeObjectURL(audioUrl);
        setIsPlayingVoice(false);
        setPlayingMessageId(null);
      };

      audio.onerror = () => {
        URL.revokeObjectURL(audioUrl);
        setIsPlayingVoice(false);
        setPlayingMessageId(null);
      };

      await audio.play();
    } catch (err) {
      console.warn('Edge TTS API unavailable, using on-device synthesis fallback:', err);
      if ('speechSynthesis' in window) {
        try {
          const utterance = new SpeechSynthesisUtterance(cleanText.slice(0, 250));
          const voices = window.speechSynthesis.getVoices();
          const preferred = voices.find(
            (v) => v.lang.includes('en-GB') || v.name.includes('Daniel') || v.name.includes('Ryan') || v.name.includes('Google UK English Male')
          ) || voices[0];
          if (preferred) utterance.voice = preferred;
          utterance.rate = 1.05;
          utterance.pitch = 0.98;
          utterance.onend = () => {
            setIsPlayingVoice(false);
            setPlayingMessageId(null);
          };
          utterance.onerror = () => {
            setIsPlayingVoice(false);
            setPlayingMessageId(null);
          };
          window.speechSynthesis.speak(utterance);
        } catch {
          setIsPlayingVoice(false);
          setPlayingMessageId(null);
        }
      } else {
        setIsPlayingVoice(false);
        setPlayingMessageId(null);
      }
    }
  }, [stopJarvisVoice]);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  // Filter messages for current active session
  const currentSessionMessages = chatMessages.filter((m) => {
    const sId = m.sessionId || m.metadata?.sessionId;
    if (sId) return sId === currentSessionId;
    return currentSessionId === (sessions[0]?.id || 'sess-default');
  });

  const currentSession = sessions.find((s) => s.id === currentSessionId) || sessions[0];

  // Auto-scroll when new messages arrive
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;
    const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 120;
    if (isNearBottom) scrollToBottom();
  }, [chatMessages, isAuditing, scrollToBottom]);

  const handleScroll = () => {
    const container = scrollContainerRef.current;
    if (!container) return;
    const distFromBottom = container.scrollHeight - container.scrollTop - container.clientHeight;
    setShowScrollButton(distFromBottom > 150);
  };

  // Automatically speak new assistant replies if voiceEnabled is ON
  useEffect(() => {
    if (!voiceEnabled) {
      stopJarvisVoice();
      return;
    }
    const lastMsg = chatMessages[chatMessages.length - 1];
    if (lastMsg && lastMsg.sender === 'ai' && lastMsg.text && lastSpokenMessageIdRef.current !== lastMsg.id) {
      lastSpokenMessageIdRef.current = lastMsg.id;
      playJarvisVoice(lastMsg.text, lastMsg.id);
    }
  }, [chatMessages, voiceEnabled, playJarvisVoice, stopJarvisVoice]);

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputPrompt.trim() || isAuditing) return;

    const text = inputPrompt;
    setInputPrompt('');
    await logExpense(text);
  };

  const handleChipClick = async (text: string) => {
    setInputPrompt('');
    await logExpense(text);
  };

  const recognitionRef = useRef<any>(null);
  const shouldListenRef = useRef(false);
  const finalizedTextRef = useRef('');
  const [speechError, setSpeechError] = useState<string | null>(null);

  // Cleanup speech recognition on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch { }
      }
    };
  }, []);

  const toggleMic = () => {
    if (typeof window === 'undefined') return;

    const SpeechRecognitionAPI =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognitionAPI) {
      setSpeechError('Voice input is not supported in this browser. Please use Google Chrome or Edge.');
      setTimeout(() => setSpeechError(null), 5000);
      return;
    }

    if (isListening) {
      shouldListenRef.current = false;
      setIsListening(false);
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch { }
      }
      return;
    }

    try {
      shouldListenRef.current = true;
      finalizedTextRef.current = inputPrompt; // retain what they've already typed/spoken

      const recognition = new SpeechRecognitionAPI();
      recognitionRef.current = recognition;

      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-IN'; // Best balance for Hinglish and Indian English

      recognition.onstart = () => {
        setIsListening(true);
        setSpeechError(null);
      };

      recognition.onresult = (event: any) => {
        let interim = '';
        let final = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          if (event.results[i].isFinal) {
            final += event.results[i][0].transcript;
          } else {
            interim += event.results[i][0].transcript;
          }
        }
        if (final) {
          finalizedTextRef.current += ' ' + final;
          finalizedTextRef.current = finalizedTextRef.current.trim();
        }

        const currentDisplay = (finalizedTextRef.current + ' ' + interim).trim();
        setInputPrompt(currentDisplay);
      };

      recognition.onerror = (event: any) => {
        if (event.error === 'not-allowed' || event.error === 'permission-denied') {
          setSpeechError('Microphone blocked. Please allow mic access.');
          shouldListenRef.current = false;
          setIsListening(false);
        } else if (event.error === 'no-speech') {
          // Ignored. We will restart it on end if it aborted due to silence.
        } else if (event.error !== 'aborted') {
          console.warn('Speech recognition error:', event.error);
        }
      };

      recognition.onend = () => {
        if (shouldListenRef.current) {
          try {
            recognition.start();
          } catch (e) { }
        } else {
          setIsListening(false);
        }
      };

      recognition.start();
    } catch (err: any) {
      console.error('Failed to start speech recognition:', err);
      setSpeechError('Could not start microphone. Please check permissions.');
      shouldListenRef.current = false;
      setIsListening(false);
      setTimeout(() => setSpeechError(null), 5000);
    }
  };



  return (
    <div className="w-full max-w-5xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6 flex flex-col gap-4 sm:gap-6 pb-24 lg:pb-8">
      {/* Header with J.A.R.V.I.S. Core status */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full bg-cyan-50 text-cyan-900 border border-cyan-200 font-mono-num text-[10px] sm:text-[11px] font-bold flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-cyan-500 animate-ping shrink-0" />
              <span>J.A.R.V.I.S. ONLINE</span>
            </span>
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-[#006c49] font-mono-num text-[10px] sm:text-[11px] font-bold">
              {payCycleInfo.isPaydayTomorrow ? '⏳ Pay Day Tomorrow' : payCycleInfo.cycleStatusLabel}
            </span>
          </div>
          <h1 className="font-sans text-xl sm:text-3xl font-bold text-[#0b1c30] flex items-center gap-2">
            <span>J.A.R.V.I.S. Terminal</span>
          </h1>
          <p className="text-xs sm:text-sm text-[#76777d] mt-0.5">
            Your AI financial butler — expenses, budgets & debts in English & Hinglish
          </p>
        </div>

        {/* Status Pills & Voice Toggle */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          {/* Audio Voice Toggle */}
          <button
            type="button"
            onClick={() => {
              if (voiceEnabled) {
                stopJarvisVoice();
                setVoiceEnabled(false);
              } else {
                setVoiceEnabled(true);
              }
            }}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-2xl text-xs font-bold border transition-all cursor-pointer shadow-xs ${
              voiceEnabled
                ? isPlayingVoice
                  ? 'bg-cyan-500 text-white border-cyan-400 shadow-md shadow-cyan-200 animate-pulse'
                  : 'bg-cyan-50 text-cyan-900 border-cyan-300'
                : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
            }`}
            title="Toggle J.A.R.V.I.S. British Neural Voice (Edge TTS)"
          >
            {voiceEnabled ? (
              isPlayingVoice ? <Volume2 className="w-4 h-4 animate-bounce" /> : <Volume2 className="w-4 h-4 text-cyan-600" />
            ) : (
              <VolumeX className="w-4 h-4 text-slate-400" />
            )}
            <span className="hidden xs:inline">
              {voiceEnabled ? (isPlayingVoice ? 'Speaking…' : 'Voice ON') : 'Voice OFF'}
            </span>
          </button>

          {/* Pocket Money Pill */}
          <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-2xl shadow-xs border border-slate-100">
            <div className="flex flex-col">
              <span className="text-[9px] text-[#76777d] uppercase font-bold">Safe Today</span>
              <span
                className={`font-mono-num text-sm font-bold ${todayDeficit > 0 ? 'text-[#ba1a1a]' : 'text-[#006c49]'
                  }`}
              >
                {todayDeficit > 0 ? `-₹${todayDeficit.toFixed(0)}` : `₹${safeToSpendRemaining.toFixed(0)}`}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Chat & Sidebar Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6 items-start">
        {/* Left Side: Telemetry HUD & Transactions Ledger — DESKTOP ONLY */}
        <div className="hidden lg:flex col-span-4 flex-col gap-5">
          {/* Today's Telemetry HUD */}
          <div className="bg-white rounded-3xl p-5 sm:p-6 shadow-sm border border-slate-100 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#0b1c30] uppercase tracking-wider flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-cyan-500 animate-pulse" />
                <span>Daily Telemetry</span>
              </span>
              <span className="text-[11px] font-mono-num font-semibold text-slate-400 bg-slate-50 px-2 py-0.5 rounded-full border border-slate-200/60">
                {payCycleInfo.cycleStatusLabel}
              </span>
            </div>

            {/* Progress Gauge */}
            <div className="flex flex-col gap-1.5">
              <div className="flex justify-between text-xs font-medium">
                <span className="text-slate-500">Daily Cap Usage:</span>
                <span className={`font-mono-num font-bold ${todayDeficit > 0 ? 'text-rose-600' : 'text-[#0b1c30]'}`}>
                  {Math.min(100, Math.round((spentToday / (userSettings.dailySpendLimit || 1)) * 100))}%
                </span>
              </div>
              <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${todayDeficit > 0 ? 'bg-rose-500' : 'bg-gradient-to-r from-cyan-500 to-[#006c49]'
                    }`}
                  style={{ width: `${Math.min(100, Math.round((spentToday / (userSettings.dailySpendLimit || 1)) * 100))}%` }}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2.5 pt-1">
              <div className="p-3 bg-[#f8f9ff] rounded-2xl border border-slate-100 flex flex-col">
                <span className="text-[10px] text-slate-400 font-bold uppercase">Allowance</span>
                <span className="font-mono-num font-bold text-sm text-[#0b1c30]">₹{userSettings.dailySpendLimit}</span>
              </div>
              <div className="p-3 bg-[#f8f9ff] rounded-2xl border border-slate-100 flex flex-col">
                <span className="text-[10px] text-slate-400 font-bold uppercase">Spent Today</span>
                <span className="font-mono-num font-bold text-sm text-rose-600">₹{spentToday.toFixed(0)}</span>
              </div>
            </div>

            <div className="p-3.5 bg-emerald-50/70 rounded-2xl border border-emerald-200/80 flex items-center justify-between">
              <div>
                <span className="text-[10px] text-[#006c49] font-bold uppercase block">Safe to Spend</span>
                <span className="font-mono-num font-bold text-base text-[#006c49]">₹{safeToSpendRemaining.toFixed(0)}</span>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-[#006c49]">
                Live Cap
              </span>
            </div>

            {/* Overspend Notice */}
            {todayDeficit > 0 && (
              <div className="p-3.5 bg-rose-50 rounded-2xl border border-rose-200 text-xs text-[#ba1a1a] flex flex-col gap-2">
                <div className="flex items-center justify-between font-bold">
                  <div className="flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4" />
                    <span>Allowance Exceeded</span>
                  </div>
                  <button
                    type="button"
                    onClick={resetTodaySpending}
                    className="text-[10px] bg-white text-[#ba1a1a] px-2.5 py-0.5 rounded-full border border-rose-200 hover:bg-rose-100 cursor-pointer font-bold transition-all shadow-xs"
                    title="Undo today's accidental expenses"
                  >
                    Reset Overspend
                  </button>
                </div>
                <p className="text-slate-700 text-[11px] leading-relaxed">
                  Sir, today's variance is ₹{todayDeficit.toFixed(0)}. J.A.R.V.I.S. has clamped tomorrow's runway to <strong>₹{tomorrowAdjustedCap.toFixed(0)}</strong> to preserve solvency.
                </p>
              </div>
            )}
          </div>

          {/* Quick Transactions Ledger Card */}
          <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#0b1c30] uppercase tracking-wider flex items-center gap-1.5">
                <Receipt className="w-4 h-4 text-emerald-600" />
                <span>Transaction Ledger</span>
              </span>
              <span className="text-[11px] font-mono-num font-bold text-slate-600 bg-slate-100 px-2.5 py-0.5 rounded-full">
                {transactions.length} Total
              </span>
            </div>

            {transactions.length === 0 ? (
              <p className="text-xs text-slate-400 italic py-2">No transactions recorded yet.</p>
            ) : (
              <div className="flex flex-col gap-2 max-h-60 overflow-y-auto pr-1">
                {transactions.slice(0, 5).map((tx) => (
                  <div
                    key={tx.id}
                    className="flex items-center justify-between p-2.5 rounded-2xl bg-slate-50/80 hover:bg-slate-100 transition-colors border border-slate-100 text-xs"
                  >
                    <div className="flex flex-col min-w-0 pr-2">
                      <span className="font-bold text-slate-800 truncate">{tx.merchant}</span>
                      <span className="text-[10px] text-slate-400">
                        {tx.category} • {tx.time || tx.date}
                      </span>
                    </div>
                    <span
                      className={`font-mono-num font-bold text-xs shrink-0 ${tx.isDiscretionary ? 'text-rose-600' : 'text-slate-700'
                        }`}
                    >
                      -₹{tx.amount.toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            )}

            <button
              type="button"
              onClick={() => setActiveTab('command-center')}
              className="mt-1 text-left px-3 py-2 rounded-2xl bg-emerald-50 hover:bg-emerald-100 text-xs font-semibold text-[#006c49] transition-colors cursor-pointer border border-emerald-200 flex items-center justify-between"
            >
              <span>View Full Ledger in Dashboard</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Right Side: Conversational Timeline — full width on mobile, 8 cols on lg */}
        <div
          className="col-span-12 lg:col-span-8 bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden flex flex-col relative"
          style={{ height: 'calc(100dvh - 160px)', minHeight: '480px', maxHeight: '740px' }}
        >
          {/* Session Switcher & Action Header Bar */}
          <div className="px-4 py-2.5 bg-white border-b border-slate-100 flex flex-wrap items-center justify-between gap-2 z-20">
            {/* Active Session Dropdown */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsSessionMenuOpen(!isSessionMenuOpen)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-xs font-bold text-slate-800 transition-all cursor-pointer shadow-xs"
              >
                <MessageSquare className="w-3.5 h-3.5 text-cyan-600 shrink-0" />
                <span className="max-w-[150px] sm:max-w-[220px] truncate text-left">
                  {currentSession?.title || 'Current Session'}
                </span>
                <ChevronDown className="w-3 h-3 text-slate-400 shrink-0" />
              </button>

              {/* Sessions Dropdown Menu */}
              {isSessionMenuOpen && (
                <div className="absolute top-full left-0 mt-1.5 w-72 sm:w-80 bg-white border border-slate-200 rounded-2xl shadow-xl z-50 p-2 flex flex-col gap-1 animate-in fade-in zoom-in-95">
                  <div className="flex items-center justify-between px-2 py-1 border-b border-slate-100 pb-1.5">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">
                      Chat Sessions ({sessions.length})
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setIsSessionMenuOpen(false);
                        createNewSession();
                      }}
                      className="text-[10px] font-bold text-cyan-600 hover:text-cyan-800 flex items-center gap-1 cursor-pointer"
                    >
                      <Plus className="w-3 h-3" />
                      <span>New Session</span>
                    </button>
                  </div>

                  <div className="max-h-60 overflow-y-auto flex flex-col gap-1 pr-1">
                    {sessions.map((sess) => {
                      const isActive = sess.id === currentSessionId;
                      const count = chatMessages.filter(
                        (m) => (m.sessionId || 'sess-default') === sess.id
                      ).length;
                      return (
                        <div
                          key={sess.id}
                          onClick={() => {
                            switchSession(sess.id);
                            setIsSessionMenuOpen(false);
                          }}
                          className={`flex items-center justify-between p-2 rounded-xl text-xs cursor-pointer transition-colors ${
                            isActive
                              ? 'bg-cyan-50 border border-cyan-200 text-cyan-900 font-bold'
                              : 'hover:bg-slate-50 text-slate-700'
                          }`}
                        >
                          <div className="flex flex-col min-w-0 pr-2">
                            <span className="truncate">{sess.title}</span>
                            <span className="text-[9px] text-slate-400 font-normal">
                              {count} messages
                            </span>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            {isActive && <span className="w-2 h-2 rounded-full bg-cyan-500" />}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (window.confirm(`Delete "${sess.title}" and its messages from database?`)) {
                                  deleteSession(sess.id);
                                }
                              }}
                              className="p-1.5 hover:bg-rose-50 hover:text-rose-600 rounded text-slate-400 transition-colors cursor-pointer"
                              title="Delete Session from Database"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {sessions.length > 1 && (
                    <div className="pt-2 mt-1 border-t border-slate-100">
                      <button
                        type="button"
                        onClick={() => {
                          if (window.confirm('Delete all old chat sessions and their messages from database?')) {
                            clearAllSessions();
                            setIsSessionMenuOpen(false);
                          }
                        }}
                        className="w-full py-1.5 px-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-[11px] font-bold text-rose-700 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                        <span>Purge All Old Sessions (Database)</span>
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Quick Actions: Read Bank Alert + New Session + Delete Current Session */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsBankModalOpen(true)}
                className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl bg-gradient-to-r from-emerald-50 to-teal-50 hover:from-emerald-100 hover:to-teal-100 text-[#006c49] border border-emerald-200 text-[11px] sm:text-xs font-bold transition-all cursor-pointer shadow-xs"
                title="Scan or Paste Bank SMS Alert"
              >
                <Receipt className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>📋 Read Bank Alert</span>
              </button>

              <button
                type="button"
                onClick={() => createNewSession()}
                className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl bg-cyan-50 hover:bg-cyan-100 text-cyan-900 border border-cyan-200 text-[11px] sm:text-xs font-bold transition-all cursor-pointer shadow-xs"
                title="Start New Conversation Session"
              >
                <Plus className="w-3.5 h-3.5 text-cyan-600 shrink-0" />
                <span className="hidden xs:inline">New Session</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  if (window.confirm(`Delete current session "${currentSession?.title || 'this session'}" and its messages from database?`)) {
                    deleteSession(currentSessionId);
                  }
                }}
                className="p-1.5 rounded-xl bg-slate-50 hover:bg-rose-50 text-slate-400 hover:text-rose-600 border border-slate-200 text-xs transition-all cursor-pointer shadow-xs"
                title="Delete Current Session from Database"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Scrollable message stream */}
          <div
            ref={scrollContainerRef}
            onScroll={handleScroll}
            className="flex-1 min-h-0 p-4 sm:p-6 overflow-y-auto flex flex-col gap-4 bg-[#f8f9ff]/50 scroll-smooth"
          >
            {currentSessionMessages.length === 0 ? (
              <div className="flex flex-col items-center justify-center my-auto p-6 text-center max-w-lg mx-auto animate-in fade-in zoom-in-95">
                <div className="w-14 h-14 rounded-3xl bg-gradient-to-tr from-cyan-600 to-[#0b1c30] flex items-center justify-center shadow-lg text-white mb-4 ring-4 ring-cyan-500/20">
                  <Sparkles className="w-7 h-7 text-cyan-300" />
                </div>
                <h3 className="text-base sm:text-lg font-black text-slate-800 tracking-tight">
                  Good day, {userSettings.userName || 'Ayan'}! 🎩
                </h3>
                <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                  J.A.R.V.I.S. at your service. Today's Safe-to-Spend allowance is <span className="font-bold text-emerald-600">₹{safeToSpendRemaining.toLocaleString()}</span>. Type or speak below to log expenses, check balances, or clear debts.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full mt-6 text-left">
                  <button
                    type="button"
                    onClick={() => logExpense("Logged ₹50 for tea")}
                    className="p-3 rounded-2xl bg-white border border-slate-200 hover:border-cyan-300 hover:bg-cyan-50/50 text-xs font-semibold text-slate-700 transition-all flex items-center gap-2 shadow-xs cursor-pointer"
                  >
                    <span className="text-base">☕</span>
                    <span>"Logged ₹50 for tea"</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => logExpense("mere pass balance kitna h")}
                    className="p-3 rounded-2xl bg-white border border-slate-200 hover:border-cyan-300 hover:bg-cyan-50/50 text-xs font-semibold text-slate-700 transition-all flex items-center gap-2 shadow-xs cursor-pointer"
                  >
                    <span className="text-base">💳</span>
                    <span>"Check liquid balance"</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => logExpense("how to save money and clear loans")}
                    className="p-3 rounded-2xl bg-white border border-slate-200 hover:border-cyan-300 hover:bg-cyan-50/50 text-xs font-semibold text-slate-700 transition-all flex items-center gap-2 shadow-xs cursor-pointer"
                  >
                    <span className="text-base">🎯</span>
                    <span>"Debt clearance plan"</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => logExpense("emergency fund me se 1000 mere account me transfer krr do")}
                    className="p-3 rounded-2xl bg-white border border-slate-200 hover:border-cyan-300 hover:bg-cyan-50/50 text-xs font-semibold text-slate-700 transition-all flex items-center gap-2 shadow-xs cursor-pointer"
                  >
                    <span className="text-base">🛡️</span>
                    <span>"Withdraw ₹1,000 from vault"</span>
                  </button>
                </div>
              </div>
            ) : (
              currentSessionMessages.map((msg) => {
              const isUser = msg.sender === 'user';
              const isScold = msg.sentiment === 'scold';
              const isPraise = msg.sentiment === 'praise';

              if (isUser) {
                return (
                  <div key={msg.id} className="flex gap-2.5 items-end justify-end ml-auto max-w-md">
                    <div className="flex flex-col items-end gap-1">
                      <div className="px-4 py-2.5 rounded-2xl bg-[#0b1c30] text-white rounded-br-xs text-sm shadow-xs">
                        <p className="whitespace-pre-line">{msg.text}</p>
                      </div>
                      <span className="text-[10px] text-[#76777d] pr-1">{msg.timestamp}</span>
                    </div>
                  </div>
                );
              }

              // AI Message (J.A.R.V.I.S.)
              return (
                <div key={msg.id} className="flex gap-3 items-start max-w-xl">
                  {/* ARC Reactor Avatar */}
                  <div
                    className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 mt-1 shadow-md text-white transition-all ${isScold ? 'bg-[#ba1a1a]' : 'bg-gradient-to-tr from-cyan-600 to-[#0b1c30] ring-2 ring-cyan-400/40'
                      }`}
                  >
                    {isScold ? <AlertTriangle className="w-4 h-4" /> : <Sparkles className="w-4 h-4 text-cyan-300" />}
                  </div>

                  <div className="flex flex-col gap-2 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-[#0b1c30]">J.A.R.V.I.S.</span>
                      <span className="text-[10px] text-[#76777d]">{msg.timestamp}</span>

                      {/* Listen to this message audio button */}
                      <button
                        type="button"
                        onClick={() => {
                          if (playingMessageId === msg.id) {
                            stopJarvisVoice();
                          } else {
                            playJarvisVoice(msg.text, msg.id);
                          }
                        }}
                        className={`p-1 rounded-full transition-all cursor-pointer flex items-center gap-1 text-[10px] font-semibold ${
                          playingMessageId === msg.id
                            ? 'bg-cyan-100 text-cyan-800 animate-pulse px-2'
                            : 'text-slate-400 hover:text-cyan-700 hover:bg-slate-100'
                        }`}
                        title={playingMessageId === msg.id ? 'Stop speech' : 'Listen with J.A.R.V.I.S. voice'}
                      >
                        {playingMessageId === msg.id ? (
                          <>
                            <VolumeX className="w-3 h-3 text-rose-500" />
                            <span className="text-[9px] text-rose-600">Stop</span>
                          </>
                        ) : (
                          <Volume2 className="w-3.5 h-3.5" />
                        )}
                      </button>

                      {isScold && (
                        <span className="px-2 py-0.5 rounded-full bg-rose-100 text-[#ba1a1a] text-[10px] font-bold">
                          Protocol Breach
                        </span>
                      )}
                      {isPraise && (
                        <span className="px-2 py-0.5 rounded-full bg-cyan-50 text-cyan-900 border border-cyan-200 text-[10px] font-bold">
                          {msg.metadata?.autoAction?.type === 'navigate'
                            ? 'Interface Switched'
                            : msg.metadata?.autoAction?.type === 'update_budget'
                              ? 'Protocol Updated'
                              : msg.metadata?.autoAction?.type === 'offset_debt'
                                ? 'Debt Offset Applied'
                                : msg.metadata?.autoAction?.type === 'create_receivable'
                                  ? 'Receivable Appended'
                                  : msg.metadata?.autoAction?.type === 'settle_debt'
                                    ? 'Debt Settled'
                                    : 'Telemetry Synced'}
                        </span>
                      )}
                    </div>

                    {/* Interactive Butler Bank Alert Inquiry & Categorization Card */}
                    {msg.metadata?.bankAlertData && (
                      <div className="p-4 sm:p-5 rounded-2xl bg-white rounded-tl-xs shadow-xs border border-cyan-300 flex flex-col gap-3.5 ring-1 ring-cyan-100">
                        {/* Alert Header */}
                        <div className="flex items-center justify-between pb-2 border-b border-cyan-100">
                          <div className="flex items-center gap-2">
                            <span className="p-2 rounded-xl bg-cyan-50 text-cyan-700 border border-cyan-200">
                              <Receipt className="w-4 h-4" />
                            </span>
                            <div>
                              <span className="text-xs font-bold text-[#0b1c30] block">Bank Alert Analyzed</span>
                              <span className="text-[10px] text-slate-500 font-medium">100% Private Client-Side Butler Scan</span>
                            </div>
                          </div>
                          <div className="text-right">
                            <span className="font-mono-num text-sm sm:text-base font-bold text-rose-600">
                              -₹{msg.metadata.bankAlertData.amount.toLocaleString()}
                            </span>
                            <span className="text-[10px] text-slate-600 block font-medium">
                              {msg.metadata.bankAlertData.merchant}
                            </span>
                          </div>
                        </div>

                        {msg.metadata.bankAlertData.confirmed ? (
                          /* Confirmed State */
                          <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <CheckCircle2 className="w-4 h-4 text-[#006c49]" />
                              <span className="text-xs font-bold text-[#006c49]">
                                Recorded to Ledger under "{msg.metadata.category || msg.metadata.bankAlertData.suggestedCategory}"
                              </span>
                            </div>
                            <span className="text-[10px] bg-white text-[#006c49] px-2 py-0.5 rounded-full border border-emerald-200 font-bold">
                              Verified
                            </span>
                          </div>
                        ) : (
                          /* Interactive Inquiry & Categorization Mode */
                          <div className="flex flex-col gap-3">
                            <div>
                              <p className="text-xs font-medium text-[#0b1c30] leading-relaxed">
                                Sir, I detected a debit of <strong>₹{msg.metadata.bankAlertData.amount.toLocaleString()}</strong> to <strong>{msg.metadata.bankAlertData.merchant}</strong>.
                                <span className="block text-slate-500 text-[11px] mt-0.5">
                                  What was this purchase for? Select a category or specify below to analyze:
                                </span>
                              </p>
                            </div>

                            {/* Category Selector Pills */}
                            <div className="flex flex-wrap gap-1.5">
                              {[
                                { label: '🍔 Food & Dining', cat: 'Food & Dining' },
                                { label: '🛒 Groceries', cat: 'Groceries' },
                                { label: '🚗 Transport', cat: 'Transport' },
                                { label: '🛍️ Shopping', cat: 'Shopping' },
                                { label: '⚡ Utilities', cat: 'Utilities' },
                                { label: '🎬 Entertainment', cat: 'Entertainment' },
                                { label: '💊 Health', cat: 'Health & Medical' },
                                { label: '📦 Discretionary', cat: 'General Discretionary' },
                              ].map(({ label, cat }) => {
                                const isSelected =
                                  (selectedCategoryMap[msg.id] || msg.metadata?.bankAlertData?.suggestedCategory) === cat;
                                return (
                                  <button
                                    key={cat}
                                    type="button"
                                    onClick={() =>
                                      setSelectedCategoryMap((prev) => ({ ...prev, [msg.id]: cat }))
                                    }
                                    className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition-all cursor-pointer ${
                                      isSelected
                                        ? 'bg-cyan-600 text-white font-bold shadow-xs'
                                        : 'bg-slate-50 text-slate-700 border border-slate-200 hover:bg-slate-100'
                                    }`}
                                  >
                                    {label}
                                  </button>
                                );
                              })}
                            </div>

                            {/* Item / Purchase Description Input */}
                            <div className="flex flex-col gap-1">
                              <label className="text-[10px] text-slate-500 font-bold uppercase">
                                What did you purchase? (Optional note)
                              </label>
                              <input
                                type="text"
                                value={descriptionMap[msg.id] || ''}
                                onChange={(e) =>
                                  setDescriptionMap((prev) => ({ ...prev, [msg.id]: e.target.value }))
                                }
                                placeholder="e.g. Dinner with team, Blinkit snacks, Zara shirt..."
                                className="w-full bg-[#f8f9ff] border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-[#0b1c30] placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                              />
                            </div>

                            {/* Action Buttons */}
                            <div className="flex items-center justify-end gap-2 pt-1 border-t border-slate-100">
                              <button
                                type="button"
                                onClick={() => {
                                  const cat =
                                    selectedCategoryMap[msg.id] ||
                                    msg.metadata?.bankAlertData?.suggestedCategory ||
                                    'General Discretionary';
                                  const desc = descriptionMap[msg.id];
                                  confirmBankAlertTransaction({
                                    amount: msg.metadata!.bankAlertData!.amount,
                                    merchant: msg.metadata!.bankAlertData!.merchant,
                                    category: cat,
                                    description: desc,
                                    messageId: msg.id,
                                  });
                                }}
                                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-xs font-bold transition-all cursor-pointer shadow-sm"
                              >
                                <Check className="w-3.5 h-3.5" />
                                <span>Confirm & Record to Ledger</span>
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Conversational text / Advice / Command confirmation */}
                    {Boolean((!msg.metadata?.amount || msg.metadata.amount === 0) && !msg.metadata?.bankAlertData) && (
                      <div className="p-4 sm:p-5 rounded-2xl bg-white rounded-tl-xs shadow-xs border border-slate-100 flex flex-col gap-3">
                        <div className="text-sm leading-relaxed text-[#0b1c30] whitespace-pre-line">
                          {msg.text}
                        </div>

                        {/* Navigation Execution Badge */}
                        {msg.metadata?.autoAction?.type === 'navigate' && (
                          <div className="p-3 bg-cyan-50/70 rounded-2xl border border-cyan-200 flex items-center justify-between">
                            <span className="text-xs font-bold text-cyan-900 flex items-center gap-1.5">
                              <Compass className="w-4 h-4 text-cyan-600" />
                              <span>Switched view to {msg.metadata.autoAction.navigateTarget?.replace('-', ' ').toUpperCase()}</span>
                            </span>
                            <span className="text-[10px] text-cyan-700 bg-white px-2 py-0.5 rounded-full border border-cyan-200 font-bold">
                              Active
                            </span>
                          </div>
                        )}

                        {/* Budget Update Badge */}
                        {msg.metadata?.autoAction?.type === 'update_budget' && (
                          <div className="p-3 bg-emerald-50 rounded-2xl border border-emerald-200 flex items-center justify-between">
                            <span className="text-xs font-bold text-[#006c49] flex items-center gap-1.5">
                              <Sliders className="w-4 h-4 shrink-0" />
                              <span>
                                {msg.metadata.autoAction.budgetUpdate?.fixedBills !== undefined
                                  ? `Fixed bills updated to ₹${msg.metadata.autoAction.budgetUpdate.fixedBills.toLocaleString()} • Daily limit ₹${(msg.metadata.autoAction.budgetUpdate.dailyLimit ?? userSettings.dailySpendLimit).toLocaleString()}/day`
                                  : msg.metadata.autoAction.budgetUpdate?.salary !== undefined
                                    ? `Salary set to ₹${msg.metadata.autoAction.budgetUpdate.salary.toLocaleString()} • Daily limit ₹${(msg.metadata.autoAction.budgetUpdate.dailyLimit ?? userSettings.dailySpendLimit).toLocaleString()}/day`
                                    : `Daily limit set to ₹${(msg.metadata.autoAction.budgetUpdate?.dailyLimit ?? userSettings.dailySpendLimit).toLocaleString()}/day`}
                              </span>
                            </span>
                            <span className="text-[10px] text-[#006c49] bg-white px-2 py-0.5 rounded-full border border-emerald-200 font-bold shrink-0">
                              Updated
                            </span>
                          </div>
                        )}

                        {/* Debt Offset Card */}
                        {msg.metadata?.autoAction && msg.metadata.autoAction.type === 'offset_debt' && (
                          <div className="p-3.5 bg-blue-50 rounded-2xl border border-blue-200 flex flex-col gap-1.5">
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-xs text-blue-900 flex items-center gap-1.5">
                                <span>⚖️</span> Debt Offset Reconciled (Money I Owe)
                              </span>
                              <span className="font-mono-num font-bold text-xs text-blue-800 bg-white px-2.5 py-0.5 rounded-full border border-blue-200">
                                ₹{msg.metadata.autoAction.debtAmount?.toLocaleString()} Net Due
                              </span>
                            </div>
                            <p className="text-xs text-slate-700 leading-relaxed">
                              <strong>{msg.metadata.autoAction.debtTitle}</strong>: {msg.metadata.autoAction.note}
                            </p>
                            <button
                              type="button"
                              onClick={() => setActiveTab('radar-and-horizons')}
                              className="mt-1 self-start text-xs font-bold text-blue-700 hover:underline flex items-center gap-1 cursor-pointer"
                            >
                              <span>View in Goals & Debts Tracker</span>
                              <ArrowRight className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}

                        {/* Interactive Borrowed Funds Deposit Card */}
                        {msg.metadata?.borrowDepositPrompt && (
                          <div className="p-3.5 bg-gradient-to-r from-emerald-50 to-teal-50 rounded-2xl border border-emerald-300 flex flex-col gap-2.5 ring-1 ring-emerald-100">
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-xs text-[#006c49] flex items-center gap-1.5">
                                <span>💵</span> Borrowed Funds Inflow Pending
                              </span>
                              <span className="font-mono-num font-bold text-xs text-[#006c49] bg-white px-2.5 py-0.5 rounded-full border border-emerald-200 shadow-2xs">
                                +₹{msg.metadata.borrowDepositPrompt.amount.toLocaleString()}
                              </span>
                            </div>

                            {msg.metadata.borrowDepositPrompt.confirmed ? (
                              <div className="p-2.5 bg-white/80 rounded-xl border border-emerald-200 flex items-center justify-between">
                                <span className="text-xs font-bold text-[#006c49] flex items-center gap-1.5">
                                  <CheckCircle2 className="w-4 h-4 text-[#006c49]" />
                                  <span>
                                    {msg.metadata.borrowDepositPrompt.dismissed
                                      ? 'Kept Separate (Not Deposited)'
                                      : 'Deposited into Current Liquid Balance'}
                                  </span>
                                </span>
                                <span className="text-[10px] bg-emerald-100 text-[#006c49] px-2 py-0.5 rounded-full font-bold">
                                  {msg.metadata.borrowDepositPrompt.dismissed ? 'Dismissed' : 'Credited'}
                                </span>
                              </div>
                            ) : (
                              <div className="flex flex-col gap-2">
                                <p className="text-xs text-slate-700 leading-relaxed">
                                  Sir, you borrowed <strong>₹{msg.metadata.borrowDepositPrompt.amount.toLocaleString()}</strong> from <strong>{msg.metadata.borrowDepositPrompt.counterparty}</strong>. Would you like me to deposit this into your <strong>Current Liquid Balance</strong>?
                                </p>
                                <div className="flex flex-wrap items-center gap-2 pt-1">
                                  <button
                                    type="button"
                                    onClick={() =>
                                      confirmBorrowDeposit(
                                        msg.metadata!.borrowDepositPrompt!.amount,
                                        msg.metadata!.borrowDepositPrompt!.counterparty,
                                        msg.id
                                      )
                                    }
                                    className="flex-1 py-2 px-3 rounded-xl bg-[#006c49] hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
                                  >
                                    <CheckCircle2 className="w-3.5 h-3.5" />
                                    <span>Deposit into Current Balance</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => dismissBorrowDeposit(msg.id)}
                                    className="py-2 px-3 rounded-xl bg-white hover:bg-slate-100 text-slate-600 border border-slate-200 text-xs font-semibold transition-all cursor-pointer"
                                  >
                                    Keep Separate
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Standard Approved Transaction Card (Expense, Income, Transfer/Goal) */}
                    {isPraise && msg.metadata && (msg.metadata.amount ?? 0) > 0 && (
                      <div className={`p-4 sm:p-5 rounded-2xl bg-white rounded-tl-xs shadow-xs border flex flex-col gap-3 ${msg.metadata.transactionType === 'income'
                          ? 'border-emerald-300 bg-emerald-50/20'
                          : msg.metadata.transactionType === 'transfer'
                            ? 'border-blue-200 bg-blue-50/20'
                            : 'border-emerald-200'
                        }`}>
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-sm text-[#0b1c30]">{msg.metadata.category}</span>
                              {msg.metadata.transactionType === 'income' && (
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-[#006c49]">
                                  + Incoming Credit
                                </span>
                              )}
                              {msg.metadata.transactionType === 'transfer' && (
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800">
                                  Goal Vault
                                </span>
                              )}
                            </div>
                            <span className="block text-xs text-[#76777d]">{msg.metadata.merchant}</span>
                          </div>
                          <span className={`font-mono-num font-bold text-base ${msg.metadata.transactionType === 'income'
                              ? 'text-[#006c49]'
                              : msg.metadata.transactionType === 'transfer'
                                ? 'text-blue-700'
                                : 'text-[#006c49]'
                            }`}>
                            {msg.metadata.transactionType === 'income' ? '+' : msg.metadata.transactionType === 'transfer' ? '→ ' : '-'}₹{(msg.metadata.amount ?? 0).toLocaleString()}
                          </span>
                        </div>

                        {/* J.A.R.V.I.S. Commentary */}
                        <div className="text-xs text-[#0b1c30] bg-[#f8f9ff] p-3.5 rounded-xl border border-slate-100 leading-relaxed whitespace-pre-line">
                          {msg.text}
                        </div>

                        {/* Auto Action Notification: Roommate Rent Share */}
                        {msg.metadata.autoAction && msg.metadata.autoAction.type === 'create_receivable' && (
                          <div className="p-3.5 bg-emerald-50 rounded-2xl border border-emerald-200 flex flex-col gap-1.5">
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-xs text-[#006c49] flex items-center gap-1.5">
                                <span>🤝</span> Money Owed to You (Receivable Logged)
                              </span>
                              <span className="font-mono-num font-bold text-xs text-[#006c49] bg-white px-2.5 py-0.5 rounded-full border border-emerald-200">
                                +₹{msg.metadata.autoAction.debtAmount?.toLocaleString()}
                              </span>
                            </div>
                            <p className="text-xs text-slate-700 leading-relaxed">
                              <strong>{msg.metadata.autoAction.debtTitle}</strong>: {msg.metadata.autoAction.note}
                            </p>
                            <button
                              type="button"
                              onClick={() => setActiveTab('radar-and-horizons')}
                              className="mt-1 self-start text-xs font-bold text-[#006c49] hover:underline flex items-center gap-1 cursor-pointer"
                            >
                              <span>View in Goals & Debts Tracker</span>
                              <ArrowRight className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}

                        {/* Auto Action Notification: Goal Allocation */}
                        {msg.metadata.autoAction && msg.metadata.autoAction.type === 'allocate_goal' && (
                          <div className="p-3.5 bg-blue-50 rounded-2xl border border-blue-200 flex flex-col gap-1.5">
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-xs text-blue-900 flex items-center gap-1.5">
                                <span>🎯</span> Allocated to Savings Goal
                              </span>
                              <span className="font-mono-num font-bold text-xs text-blue-800 bg-white px-2.5 py-0.5 rounded-full border border-blue-200">
                                +₹{(msg.metadata.autoAction.goalAllocation?.amount || msg.metadata.amount)?.toLocaleString()}
                              </span>
                            </div>
                            <p className="text-xs text-slate-700 leading-relaxed">
                              Saved directly into <strong>{msg.metadata.autoAction.goalAllocation?.goalName || msg.metadata.merchant}</strong>. Daily pocket allowance remains safe!
                            </p>
                            <button
                              type="button"
                              onClick={() => setActiveTab('radar-and-horizons')}
                              className="mt-1 self-start text-xs font-bold text-blue-700 hover:underline flex items-center gap-1 cursor-pointer"
                            >
                              <span>View in Goals & Debts Tracker</span>
                              <ArrowRight className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}

                        {/* Auto Action Notification: Goal Withdrawal */}
                        {msg.metadata.autoAction && msg.metadata.autoAction.type === 'withdraw_goal' && (
                          <div className="p-3.5 bg-emerald-50 rounded-2xl border border-emerald-200 flex flex-col gap-1.5">
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-xs text-[#006c49] flex items-center gap-1.5">
                                <span>💸</span> Retrieved from Savings Goal
                              </span>
                              <span className="font-mono-num font-bold text-xs text-[#006c49] bg-white px-2.5 py-0.5 rounded-full border border-emerald-200">
                                +₹{(msg.metadata.autoAction.goalWithdrawal?.amount || msg.metadata.amount)?.toLocaleString()}
                              </span>
                            </div>
                            <p className="text-xs text-slate-700 leading-relaxed">
                              Transferred from <strong>{msg.metadata.autoAction.goalWithdrawal?.goalName || msg.metadata.merchant}</strong> directly into your checking account balance. Daily pocket allowance remains safe!
                            </p>
                            <button
                              type="button"
                              onClick={() => setActiveTab('radar-and-horizons')}
                              className="mt-1 self-start text-xs font-bold text-[#006c49] hover:underline flex items-center gap-1 cursor-pointer"
                            >
                              <span>View in Goals & Debts Tracker</span>
                              <ArrowRight className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}

                        {/* Auto Action Notification: Debt Settled */}
                        {msg.metadata.autoAction && msg.metadata.autoAction.type === 'settle_debt' && (
                          <div className="p-3.5 bg-emerald-50 rounded-2xl border border-emerald-200 flex flex-col gap-1.5">
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-xs text-[#006c49] flex items-center gap-1.5">
                                <span>🤝</span> Debt Settled & Recovered
                              </span>
                              <span className="text-[10px] text-[#006c49] bg-white px-2.5 py-0.5 rounded-full border border-emerald-200 font-bold">
                                Reconciled
                              </span>
                            </div>
                            <p className="text-xs text-slate-700 leading-relaxed">
                              Entry for <strong>{msg.metadata.autoAction.settleCounterparty || msg.metadata.merchant}</strong> marked as settled in active debt records.
                            </p>
                            <button
                              type="button"
                              onClick={() => setActiveTab('radar-and-horizons')}
                              className="mt-1 self-start text-xs font-bold text-[#006c49] hover:underline flex items-center gap-1 cursor-pointer"
                            >
                              <span>View in Goals & Debts Tracker</span>
                              <ArrowRight className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Scold Red Card (Only for actual transactions with amount > 0 that breached a cap) */}
                    {Boolean(isScold && (msg.metadata?.amount ?? 0) > 0) && (
                      <div className="p-4 sm:p-5 rounded-2xl bg-rose-50 rounded-tl-xs shadow-sm border border-rose-200 flex flex-col gap-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <span className="font-bold text-sm text-[#ba1a1a]">
                              {msg.metadata?.breachCode === 'HOUSEHOLD-BREACH' ? 'Household Budget Overrun' : 'Discretionary Cap Breached'}
                            </span>
                            <span className="block text-xs text-[#76777d]">{msg.metadata?.merchant || 'Transaction'}</span>
                          </div>
                          <span className="font-mono-num font-bold text-lg text-[#ba1a1a]">
                            -₹{msg.metadata?.amount?.toLocaleString()}
                          </span>
                        </div>

                        <div className="p-3.5 bg-white rounded-xl text-xs text-[#0b1c30] font-medium leading-relaxed border border-rose-100 whitespace-pre-line">
                          {msg.text}
                        </div>

                        <div className="flex justify-between items-center text-xs text-[#45464d] bg-white p-2.5 rounded-xl border border-rose-100">
                          <span>Tomorrow's Enforced Allowance:</span>
                          <span className="font-mono-num font-bold text-[#006c49]">
                            ₹{msg.metadata?.tomorrowAdjustedCap || tomorrowAdjustedCap}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}

            {isAuditing && (
              <div className="flex items-center gap-2.5 p-3 bg-white rounded-2xl shadow-xs border border-slate-100 max-w-xs text-xs">
                <div className="w-4 h-4 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
                <span className="text-[#45464d]">J.A.R.V.I.S. is calculating telemetry…</span>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Scroll-to-bottom Floating Button */}
          {showScrollButton && (
            <div className="absolute right-6 bottom-[130px] z-10">
              <button
                type="button"
                onClick={scrollToBottom}
                className="w-9 h-9 rounded-full bg-[#0b1c30] text-white shadow-lg flex items-center justify-center hover:bg-slate-700 transition-all cursor-pointer border border-white/10"
                title="Scroll to latest message"
              >
                <ChevronDown className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Sticky Command Input Bar */}
          <div className="p-3 sm:p-4 bg-white border-t border-slate-100 flex flex-col gap-2">
            {/* Strategic Advice Quick Chips */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-[11px]">
              <span className="text-[#76777d] font-bold shrink-0 flex items-center gap-1 mr-1">
                <Sparkles className="w-3.5 h-3.5 text-cyan-600" />
                <span>Strategy:</span>
              </span>

              {/* 1-Tap Read Bank Alert Chip */}
              <button
                type="button"
                onClick={() => setIsBankModalOpen(true)}
                className="px-2.5 py-1 rounded-full bg-emerald-50 hover:bg-emerald-100 text-[#006c49] font-bold whitespace-nowrap transition-all border border-emerald-300 cursor-pointer flex items-center gap-1 shadow-xs"
              >
                <Receipt className="w-3 h-3 text-emerald-600" />
                <span>📋 Read Bank SMS</span>
              </button>

              <button
                type="button"
                onClick={() => handleChipClick('JARVIS, suggest me how to save money and make every spent optimal')}
                className="px-2.5 py-1 rounded-full bg-[#eff4ff] hover:bg-cyan-50 hover:text-cyan-900 text-slate-700 font-medium whitespace-nowrap transition-all border border-slate-200 cursor-pointer"
              >
                💡 Save money & optimize spending
              </button>
              <button
                type="button"
                onClick={() => handleChipClick('JARVIS, how to plan the pay back of moneys i owe')}
                className="px-2.5 py-1 rounded-full bg-[#eff4ff] hover:bg-rose-50 hover:text-rose-900 text-slate-700 font-medium whitespace-nowrap transition-all border border-slate-200 cursor-pointer"
              >
                🥊 Plan payback of my debts
              </button>
              <button
                type="button"
                onClick={() => handleChipClick("JARVIS, how to reach Mama's wedding dress goal faster")}
                className="px-2.5 py-1 rounded-full bg-[#eff4ff] hover:bg-emerald-50 hover:text-emerald-900 text-slate-700 font-medium whitespace-nowrap transition-all border border-slate-200 cursor-pointer"
              >
                🎯 Accelerate savings goals
              </button>
            </div>

            {/* Live Voice Listening Indicator */}
            {isListening && (
              <div className="flex items-center justify-between px-4 py-2.5 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-800 animate-in fade-in slide-in-from-bottom-2">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-600 animate-ping" />
                  <span className="font-bold text-rose-900">Listening to you...</span>
                  <span className="text-slate-600 hidden sm:inline">Speak now in English or Hinglish</span>
                </div>
                <button
                  type="button"
                  onClick={toggleMic}
                  className="px-3 py-1 rounded-full bg-white text-rose-700 font-bold border border-rose-300 hover:bg-rose-100 text-[11px] cursor-pointer shadow-xs"
                >
                  Done Speaking
                </button>
              </div>
            )}

            {/* Speech Notice / Error */}
            {speechError && (
              <div className="flex items-center gap-2 px-4 py-2 bg-amber-50 border border-amber-200 rounded-2xl text-xs text-amber-900 animate-in fade-in">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>{speechError}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} autoComplete="off" data-form-type="other" className="flex items-center gap-2">
              <button
                type="button"
                onClick={toggleMic}
                className={`w-10 h-10 rounded-full flex items-center justify-center transition-all cursor-pointer ${isListening
                    ? 'bg-rose-600 text-white animate-pulse'
                    : 'bg-[#eff4ff] text-[#45464d] hover:bg-[#dce9ff] hover:text-[#0b1c30]'
                  }`}
                title={isListening ? 'Listening…' : 'Speak command to J.A.R.V.I.S.'}
              >
                {isListening ? <Mic className="w-5 h-5" /> : <MicOff className="w-4 h-4" />}
              </button>

              {/* 1-Tap Read Bank Alert Button */}
              <button
                type="button"
                onClick={() => setIsBankModalOpen(true)}
                className="w-10 h-10 rounded-full flex items-center justify-center transition-all cursor-pointer bg-emerald-50 hover:bg-emerald-100 text-[#006c49] border border-emerald-200 shrink-0 shadow-xs"
                title="Paste / Scan Bank Alert SMS"
              >
                <Receipt className="w-4 h-4" />
              </button>

              <input
                type="text"
                name="chatExpenseInput"
                autoComplete="off"
                autoCorrect="off"
                spellCheck={false}
                data-lpignore="true"
                data-1p-ignore="true"
                data-form-type="other"
                value={inputPrompt}
                onChange={(e) => setInputPrompt(e.target.value)}
                placeholder="Instruct J.A.R.V.I.S. (e.g. 'Show dashboard', 'Salary 40k', 'Spent 150 on lunch')..."
                disabled={isAuditing}
                className="flex-1 bg-[#eff4ff]/60 border border-slate-200 rounded-full px-4 py-2.5 text-xs sm:text-sm text-[#0b1c30] placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:bg-white transition-all disabled:opacity-60"
              />

              <button
                type="submit"
                disabled={!inputPrompt.trim() || isAuditing}
                className="w-10 h-10 rounded-full bg-gradient-to-r from-cyan-600 to-[#0b1c30] hover:from-cyan-700 hover:to-slate-900 text-white flex items-center justify-center transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-md shrink-0 cursor-pointer"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* Bank Alert Scanner Modal */}
      {isBankModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white rounded-3xl p-6 w-full max-w-lg shadow-2xl border border-slate-100 flex flex-col gap-4 animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600">
                  <Receipt className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-[#0b1c30]">1-Tap Bank SMS Butler</h3>
                  <p className="text-[11px] text-slate-500">100% On-Device & Private. Strips account numbers & OTPs.</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsBankModalOpen(false);
                  setBankSmsStatus(null);
                }}
                className="p-1 rounded-full text-slate-400 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-700">Paste Bank Alert or UPI SMS:</span>
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      if (navigator.clipboard) {
                        const clip = await navigator.clipboard.readText();
                        if (clip) setBankSmsInput(clip);
                      }
                    } catch {
                      setBankSmsStatus('Clipboard access denied. Please paste manually into the field below.');
                    }
                  }}
                  className="text-[11px] font-bold text-cyan-600 hover:text-cyan-800 flex items-center gap-1 cursor-pointer"
                >
                  <ClipboardCopy className="w-3 h-3" />
                  <span>Paste from Clipboard</span>
                </button>
              </div>

              <textarea
                rows={3}
                value={bankSmsInput}
                onChange={(e) => setBankSmsInput(e.target.value)}
                placeholder="e.g. Dear SBI UPI user, A/c 5678 debited by Rs 280.00 on 06-Sep-26 to Zomato Ref 123456"
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs text-[#0b1c30] focus:bg-white focus:outline-none focus:ring-2 focus:ring-cyan-500 transition-all font-mono text-[11px]"
              />

              {bankSmsStatus && (
                <p className="text-xs text-rose-600 font-medium">{bankSmsStatus}</p>
              )}

              {/* Quick Test Samples */}
              <div className="flex flex-col gap-1.5 pt-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Or test with 1-click sample:</span>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={() => setBankSmsInput('Dear SBI User, A/c 1234 debited by Rs 280.00 on 06-Sep-26 to ZOMATO UPI Ref 123456. Avl Bal: Rs 15420.00')}
                    className="px-2.5 py-1 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-medium transition-colors cursor-pointer"
                  >
                    🍔 SBI: ₹280 to Zomato
                  </button>
                  <button
                    type="button"
                    onClick={() => setBankSmsInput('HDFC Bank: Rs 1450.00 debited from A/c **4321 on 06-SEP-26 towards BLINKIT. Available balance is Rs 8500.')}
                    className="px-2.5 py-1 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-medium transition-colors cursor-pointer"
                  >
                    🛒 HDFC: ₹1,450 to Blinkit
                  </button>
                  <button
                    type="button"
                    onClick={() => setBankSmsInput('Paid Rs. 60.00 to Chai Point using PhonePe UPI. Txn ID: 987654.')}
                    className="px-2.5 py-1 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-medium transition-colors cursor-pointer"
                  >
                    ☕ UPI: ₹60 to Chai Point
                  </button>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  setIsBankModalOpen(false);
                  setBankSmsStatus(null);
                }}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!bankSmsInput.trim()) {
                    setBankSmsStatus('Please paste an SMS alert or select a sample above.');
                    return;
                  }
                  const res = processBankSms(bankSmsInput);
                  if (res.success) {
                    setBankSmsInput('');
                    setBankSmsStatus(null);
                    setIsBankModalOpen(false);
                    scrollToBottom();
                  } else {
                    setBankSmsStatus(res.message);
                  }
                }}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white text-xs font-bold shadow-md hover:from-emerald-700 hover:to-teal-700 cursor-pointer"
              >
                Analyze with J.A.R.V.I.S.
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
