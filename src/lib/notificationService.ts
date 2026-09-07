'use client';

export interface JarvisNotificationPayload {
  id?: string;
  title: string;
  body: string;
  type?: 'breach' | 'praise' | 'info' | 'reminder';
  icon?: string;
  timestamp?: string;
}

class NotificationService {
  private hasRequested = false;

  // Synthesize futuristic sound effects via Web Audio API (Zero external assets needed)
  public playAudio(type: 'breach' | 'praise' | 'alert' | 'neutral' = 'neutral') {
    if (typeof window === 'undefined') return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();

      if (type === 'breach') {
        // Dual warning klaxon sound (880Hz -> 440Hz)
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(880, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.35);
        gain.gain.setValueAtTime(0.2, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.35);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.35);
      } else if (type === 'praise') {
        // Triumphant royal harmonic chime (523Hz -> 659Hz -> 784Hz - C E G chord)
        [523.25, 659.25, 783.99].forEach((freq, i) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, ctx.currentTime + i * 0.08);
          gain.gain.setValueAtTime(0.18, ctx.currentTime + i * 0.08);
          gain.gain.exponentialRampToValueAtTime(0.005, ctx.currentTime + i * 0.08 + 0.4);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(ctx.currentTime + i * 0.08);
          osc.stop(ctx.currentTime + i * 0.08 + 0.4);
        });
      } else {
        // Pleasant twin futuristic ding
        [880, 1320].forEach((freq, i) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, ctx.currentTime + i * 0.09);
          gain.gain.setValueAtTime(0.15, ctx.currentTime + i * 0.09);
          gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + i * 0.09 + 0.25);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(ctx.currentTime + i * 0.09);
          osc.stop(ctx.currentTime + i * 0.09 + 0.25);
        });
      }
    } catch {
      // Audio context might be restricted before user gesture
    }
  }

  // Check if system notifications are supported & granted
  public isSupported(): boolean {
    return typeof window !== 'undefined' && 'Notification' in window;
  }

  public getPermission(): NotificationPermission {
    if (!this.isSupported()) return 'denied';
    return Notification.permission;
  }

  public async requestPermission(): Promise<boolean> {
    if (!this.isSupported()) return false;
    try {
      this.hasRequested = true;
      const perm = await Notification.requestPermission();
      return perm === 'granted';
    } catch {
      return false;
    }
  }

  // Dispatch both Native Web Push Notification AND In-App HUD Banner
  public notify(payload: JarvisNotificationPayload) {
    const id = payload.id || `notif-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const fullPayload: JarvisNotificationPayload = {
      ...payload,
      id,
      timestamp: payload.timestamp || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    // 1. Play audio effect
    if (payload.type === 'breach') {
      this.playAudio('breach');
    } else if (payload.type === 'praise') {
      this.playAudio('praise');
    } else {
      this.playAudio('neutral');
    }

    // 2. Dispatch in-app HUD banner event
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('jarvis-hud-notification', { detail: fullPayload })
      );
    }

    // 3. Dispatch native OS/Browser Notification if granted
    if (this.isSupported() && Notification.permission === 'granted') {
      try {
        if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
          navigator.serviceWorker.ready.then((registration) => {
            registration.showNotification(fullPayload.title, {
              body: fullPayload.body,
              icon: fullPayload.icon || '/icon-192.png',
              badge: '/icon-192.png',
              tag: fullPayload.id,
            } as any);
          }).catch(() => {
            new Notification(fullPayload.title, {
              body: fullPayload.body,
              icon: fullPayload.icon || '/icon-192.png',
            });
          });
        } else {
          new Notification(fullPayload.title, {
            body: fullPayload.body,
            icon: fullPayload.icon || '/icon-192.png',
          });
        }
      } catch (err) {
        console.warn('Native notification dispatch failed:', err);
      }
    }
  }

  // Pre-configured Witty J.A.R.V.I.S. Notifications
  public sendHouseholdBreachNotification(amount: number, exceededBy: number) {
    this.notify({
      title: '🚨 Household Budget Breached, Sir!',
      body: `Expense of ₹${amount.toLocaleString()} exceeds your household cap by ₹${exceededBy.toLocaleString()}! Tighten the household belt immediately! 🛡️`,
      type: 'breach',
    });
  }

  public sendDailyBreachNotification(amount: number, exceededBy: number) {
    this.notify({
      title: '🚨 Allowance Overrun Detected, Sir!',
      body: `Spent ₹${amount.toLocaleString()}, breaching today's allowance by ₹${exceededBy.toLocaleString()}. Deficit amortization engaged across upcoming days.`,
      type: 'breach',
    });
  }

  public sendSavingsPraiseNotification(amount: number, goalOrCategory?: string) {
    const label = goalOrCategory || 'Savings Vault';
    this.notify({
      title: '🎩 Magnificent Discipline, Sir!',
      body: `Secured ₹${amount.toLocaleString()} into ${label}! Your financial sovereignty expands while others succumb to impulse. Splendid! 👑✨`,
      type: 'praise',
    });
  }

  public sendMorningBriefingNotification(dailyLimit: number, safeLeft: number) {
    this.notify({
      title: '☀️ J.A.R.V.I.S. Morning Briefing',
      body: `Good morning, Sir! Today's safe allowance is ₹${safeLeft.toLocaleString()} (Cap: ₹${dailyLimit}). Tread lightly on the artisan espressos! ☕🥐`,
      type: 'info',
    });
  }

  public sendRandomWittyNotification() {
    const quips = [
      {
        title: '🎩 J.A.R.V.I.S. Financial Wisdom',
        body: 'Sir, a rupee saved today is a cappuccino secured tomorrow with zero guilt. The treasury flourishes! ☕🥐',
        type: 'praise' as const,
      },
      {
        title: '🛡️ Radar Perimeter Secure',
        body: 'All active debt horizons and fixed obligations are catalogued. Grocers kept strictly outside your tea hours! 🚪☕',
        type: 'info' as const,
      },
      {
        title: '👑 Royal Solvency Status',
        body: 'Hold your daily spend discipline, Sir, and Mama attends the wedding looking like royalty with her dream dress! 👗✨',
        type: 'praise' as const,
      },
      {
        title: '📊 Core Telemetry Synchronization',
        body: 'All ledgers and liquid balances are 100% verified. Discretionary runway remains pristine, Sir! 🎩🚀',
        type: 'info' as const,
      },
    ];

    const random = quips[Math.floor(Math.random() * quips.length)];
    this.notify(random);
  }
}

export const jarvisNotificationService = new NotificationService();
