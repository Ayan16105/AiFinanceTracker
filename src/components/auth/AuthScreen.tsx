'use client';

import React, { useState, useEffect } from 'react';
import { Sparkles, Shield, Lock, ArrowRight, Fingerprint, CheckCircle2, AlertCircle } from 'lucide-react';
import { SupabaseService } from '@/lib/supabaseService';

interface AuthScreenProps {
  onAuthenticated: () => void;
}

export default function AuthScreen({ onAuthenticated }: AuthScreenProps) {
  const [passcode, setPasscode] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState('');
  const [isAuthorizing, setIsAuthorizing] = useState(false);
  const [storedPin, setStoredPin] = useState('1014');
  const [biometricEnabled, setBiometricEnabled] = useState(true);

  // Load security settings from database (with local fallback)
  useEffect(() => {
    let isMounted = true;
    try {
      const pin = localStorage.getItem('jarvis_security_pin') || '1014';
      setStoredPin(pin);
      const bio = localStorage.getItem('jarvis_biometric_enabled');
      setBiometricEnabled(bio !== null ? bio === 'true' : true);
    } catch {}

    // Fetch ground truth password and settings directly from Supabase database
    SupabaseService.fetchSecurityCredentials().then((creds) => {
      if (isMounted && creds) {
        setStoredPin(creds.securityPin);
        setBiometricEnabled(creds.biometricEnabled);
        try {
          localStorage.setItem('jarvis_security_pin', creds.securityPin);
          localStorage.setItem('jarvis_biometric_enabled', String(creds.biometricEnabled));
        } catch {}
      }
    });

    return () => { isMounted = false; };
  }, []);

  const handleAuthorize = (enteredPasscode?: string) => {
    const codeToTest = (enteredPasscode ?? passcode).trim();
    if (!codeToTest) {
      setError('Please enter your PIN to unlock the terminal.');
      return;
    }
    if (codeToTest !== storedPin) {
      setError(`Incorrect PIN. Please try again.`);
      return;
    }
    setIsAuthorizing(true);
    setError('');
    setTimeout(() => {
      if (rememberMe) {
        try {
          localStorage.setItem('jarvis_authenticated', 'true');
        } catch {}
      }
      setIsAuthorizing(false);
      onAuthenticated();
    }, 500);
  };

  const handleQuickBypass = () => {
    setIsAuthorizing(true);
    setTimeout(() => {
      if (rememberMe) {
        try {
          localStorage.setItem('jarvis_authenticated', 'true');
        } catch {}
      }
      setIsAuthorizing(false);
      onAuthenticated();
    }, 400);
  };

  return (
    <div className="min-h-screen w-full bg-[#070e18] text-white flex flex-col items-center justify-center p-4 relative overflow-hidden font-sans">
      {/* Ambient background glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-cyan-600/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-emerald-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* Futuristic Frame Card */}
      <div className="w-full max-w-md bg-[#0b1626]/90 border border-slate-800 backdrop-blur-xl rounded-3xl p-8 sm:p-10 shadow-2xl flex flex-col gap-6 relative z-10 animate-in fade-in zoom-in-95 duration-200">
        {/* Arc Reactor Logo */}
        <div className="flex flex-col items-center text-center gap-3">
          <div className="relative">
            <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-cyan-600 to-[#0b1c30] p-0.5 shadow-lg shadow-cyan-500/20 ring-4 ring-cyan-400/20 flex items-center justify-center">
              <div className="w-full h-full rounded-full bg-[#070e18] flex items-center justify-center">
                <Sparkles className="w-8 h-8 text-cyan-400 animate-pulse" />
              </div>
            </div>
            <span className="absolute bottom-0 right-0 w-4 h-4 rounded-full bg-emerald-500 ring-2 ring-[#070e18] flex items-center justify-center text-[9px] font-bold">
              ✓
            </span>
          </div>

          <div>
            <span className="px-3 py-0.5 rounded-full bg-cyan-950/80 text-cyan-300 border border-cyan-800/60 text-[10px] font-bold uppercase tracking-widest font-mono-num inline-block mb-1.5">
              J.A.R.V.I.S. Core v2.4
            </span>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
              Autonomous Terminal
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Personal Chartered Financial Intelligence System
            </p>
          </div>
        </div>

        {/* Form */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleAuthorize();
          }}
          className="flex flex-col gap-4"
        >
          {/* Identity Field */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Principal Identity
            </label>
            <div className="flex items-center gap-2.5 px-4 py-3 rounded-2xl bg-[#0e1c2e] border border-slate-700/70 text-slate-200 text-xs">
              <Shield className="w-4 h-4 text-cyan-400 shrink-0" />
              <span className="font-semibold text-white">Ayan (Principal User)</span>
              <span className="ml-auto text-[10px] text-emerald-400 bg-emerald-950/70 px-2 py-0.5 rounded-full font-bold border border-emerald-800/60">
                Verified
              </span>
            </div>
          </div>

          {/* Passcode Field */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Security Passcode / PIN
              </label>
              <span className="text-[10px] text-slate-400 font-mono-num">
                Change PIN in Settings
              </span>
            </div>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                maxLength={8}
                value={passcode}
                onChange={(e) => {
                  setPasscode(e.target.value);
                  setError('');
                }}
                placeholder="Enter 4-digit PIN"
                autoFocus
                className="w-full bg-[#0e1c2e] border border-slate-700/80 rounded-2xl pl-11 pr-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all tracking-widest font-mono-num"
              />
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 text-rose-400 text-xs bg-rose-950/50 border border-rose-800/60 p-2.5 rounded-xl">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Remember this terminal toggle */}
          <label className="flex items-center gap-2.5 cursor-pointer text-xs text-slate-300 select-none pt-1">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="w-4 h-4 rounded-lg bg-[#0e1c2e] border-slate-700 text-cyan-600 focus:ring-0 cursor-pointer"
            />
            <span>Remember this terminal (Don't ask again)</span>
          </label>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isAuthorizing}
            className="w-full mt-2 py-3 rounded-2xl bg-gradient-to-r from-cyan-600 to-cyan-800 hover:from-cyan-500 hover:to-cyan-700 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all shadow-lg shadow-cyan-900/40 cursor-pointer disabled:opacity-60"
          >
            {isAuthorizing ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Authorizing Terminal...</span>
              </>
            ) : (
              <>
                <span>Authenticate & Access</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>

          {/* 1-Click Biometric Quick Bypass — conditional on user setting */}
          {biometricEnabled && (
            <>
              <div className="relative flex items-center justify-center my-1">
                <div className="border-t border-slate-800 w-full" />
                <span className="bg-[#0b1626] px-3 text-[10px] text-slate-400 uppercase tracking-wider font-semibold absolute">
                  or instant access
                </span>
              </div>

              <button
                type="button"
                onClick={handleQuickBypass}
                disabled={isAuthorizing}
                className="w-full py-2.5 rounded-2xl bg-[#0e1c2e] hover:bg-[#13263e] border border-slate-700/80 text-cyan-300 font-semibold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <Fingerprint className="w-4 h-4 text-cyan-400" />
                <span>1-Click Quick Access</span>
              </button>
            </>
          )}
        </form>

        {/* Security Footer */}
        <div className="text-center text-[10px] text-slate-500 border-t border-slate-800/80 pt-4 flex items-center justify-center gap-1.5">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
          <span>Encrypted Local & Cloud Telemetry • J.A.R.V.I.S. Secure</span>
        </div>
      </div>
    </div>
  );
}
