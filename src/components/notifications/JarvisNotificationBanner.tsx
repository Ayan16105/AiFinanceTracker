'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { jarvisNotificationService, JarvisNotificationPayload } from '@/lib/notificationService';
import { Sparkles, AlertTriangle, ShieldCheck, Bell, X } from 'lucide-react';

export default function JarvisNotificationBanner() {
  const [activeNotification, setActiveNotification] = useState<JarvisNotificationPayload | null>(null);
  const [showPermissionPrompt, setShowPermissionPrompt] = useState(false);

  const handleIncomingNotification = useCallback((e: Event) => {
    const customEvent = e as CustomEvent<JarvisNotificationPayload>;
    if (customEvent.detail) {
      setActiveNotification(customEvent.detail);

      // Check if browser notifications are not yet enabled
      if (jarvisNotificationService.isSupported() && jarvisNotificationService.getPermission() === 'default') {
        setShowPermissionPrompt(true);
      }
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    window.addEventListener('jarvis-hud-notification', handleIncomingNotification);
    return () => {
      window.removeEventListener('jarvis-hud-notification', handleIncomingNotification);
    };
  }, [handleIncomingNotification]);

  // Auto-dismiss after 6.5s
  useEffect(() => {
    if (!activeNotification) return;

    const timer = setTimeout(() => {
      setActiveNotification(null);
    }, 6500);

    return () => clearTimeout(timer);
  }, [activeNotification]);

  const handleEnablePush = async () => {
    const granted = await jarvisNotificationService.requestPermission();
    setShowPermissionPrompt(false);
    if (granted) {
      jarvisNotificationService.notify({
        title: '🔔 System Push Notifications Activated!',
        body: 'J.A.R.V.I.S. will now alert your phone and device directly on budget overruns and savings triumphs!',
        type: 'praise',
      });
    }
  };

  if (!activeNotification) return null;

  const isBreach = activeNotification.type === 'breach';
  const isPraise = activeNotification.type === 'praise';

  return (
    <div className="fixed top-16 sm:top-20 right-3 sm:right-6 z-50 max-w-sm sm:max-w-md w-full pointer-events-none animate-in fade-in slide-in-from-top-4 duration-300">
      <div className={`pointer-events-auto rounded-2xl p-4 shadow-2xl backdrop-blur-xl border transition-all ${
        isBreach
          ? 'bg-rose-950/90 border-rose-500/50 text-white shadow-rose-900/30'
          : isPraise
            ? 'bg-[#061e24]/90 border-cyan-400/50 text-white shadow-cyan-900/30'
            : 'bg-[#0b1c30]/90 border-slate-700/60 text-white shadow-slate-900/40'
      }`}>
        <div className="flex items-start gap-3">
          {/* Avatar / Icon */}
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ring-2 ${
            isBreach
              ? 'bg-rose-600 ring-rose-400/40'
              : isPraise
                ? 'bg-cyan-500 ring-cyan-300/40'
                : 'bg-indigo-600 ring-indigo-400/40'
          }`}>
            {isBreach ? (
              <AlertTriangle className="w-5 h-5 text-white" />
            ) : isPraise ? (
              <Sparkles className="w-5 h-5 text-white" />
            ) : (
              <ShieldCheck className="w-5 h-5 text-white" />
            )}
          </div>

          {/* Text Details */}
          <div className="flex-1 min-w-0 pr-1">
            <div className="flex items-center justify-between gap-2">
              <span className={`text-[10px] font-black uppercase tracking-widest ${
                isBreach ? 'text-rose-300' : isPraise ? 'text-cyan-300' : 'text-slate-300'
              }`}>
                {isBreach ? '🚨 Protocol Alert' : isPraise ? '🎩 Royal Accolade' : '🛡️ Financial Telemetry'}
              </span>
              <span className="text-[10px] text-slate-400 font-mono">
                {activeNotification.timestamp || 'Now'}
              </span>
            </div>

            <h4 className="text-xs sm:text-sm font-black text-white mt-0.5 leading-snug">
              {activeNotification.title}
            </h4>

            <p className="text-[11px] sm:text-xs text-slate-200 mt-1 leading-relaxed whitespace-pre-line">
              {activeNotification.body}
            </p>

            {/* Optional Push Permission Prompt */}
            {showPermissionPrompt && (
              <div className="mt-2.5 pt-2 border-t border-white/10 flex items-center justify-between gap-2">
                <span className="text-[10px] text-slate-300">
                  Allow push alerts to phone/desktop?
                </span>
                <button
                  type="button"
                  onClick={handleEnablePush}
                  className="px-2.5 py-1 rounded-lg bg-white/20 hover:bg-white/30 text-white text-[10px] font-bold transition-all flex items-center gap-1 cursor-pointer shrink-0"
                >
                  <Bell className="w-3 h-3 text-cyan-300" />
                  <span>Enable Push</span>
                </button>
              </div>
            )}
          </div>

          {/* Dismiss Button */}
          <button
            type="button"
            onClick={() => setActiveNotification(null)}
            className="p-1 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors cursor-pointer shrink-0"
            title="Dismiss Notification"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Dynamic Progress line */}
        <div className="mt-3 w-full bg-white/10 h-0.5 rounded-full overflow-hidden">
          <div
            className={`h-full animate-[progress_6.5s_linear_forwards] ${
              isBreach ? 'bg-rose-400' : isPraise ? 'bg-cyan-400' : 'bg-indigo-400'
            }`}
            style={{ width: '100%' }}
          />
        </div>
      </div>
    </div>
  );
}
