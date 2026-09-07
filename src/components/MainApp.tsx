'use client';

import React, { useState, useEffect } from 'react';
import { FinanceProvider, useFinance } from '@/context/FinanceContext';
import Sidebar from '@/components/navigation/Sidebar';
import Header from '@/components/navigation/Header';
import MobileBottomNav from '@/components/navigation/MobileBottomNav';
import CommandCenter from '@/components/dashboard/CommandCenter';
import LedgerChat from '@/components/ledger/LedgerChat';
import RadarView from '@/components/radar/RadarView';
import TransactionsView from '@/components/transactions/TransactionsView';
import AuthScreen from '@/components/auth/AuthScreen';
import SalarySettingsModal from '@/components/modals/SalarySettingsModal';

import JarvisNotificationBanner from '@/components/notifications/JarvisNotificationBanner';

function MainAppLayout({ onLogout }: { onLogout: () => void }) {
  const { activeTab, isSettingsOpen, closeSettings } = useFinance();

  return (
    <div className="flex min-h-screen bg-[#f8f9ff]">
      {/* HUD Floating Notification Banner */}
      <JarvisNotificationBanner />

      {/* Persistent Desktop Sidebar */}
      <Sidebar />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col lg:pl-72 min-w-0 transition-all">
        <Header onLogout={onLogout} />

        <main className="flex-1 w-full bg-[#f8f9ff]">
          {activeTab === 'command-center' && <CommandCenter />}
          {activeTab === 'ai-ca-ledger' && <LedgerChat />}
          {activeTab === 'transactions-ledger' && <TransactionsView />}
          {activeTab === 'radar-and-horizons' && <RadarView />}
        </main>

        {/* Sticky Mobile Bottom Navigation */}
        <MobileBottomNav />
      </div>

      {/* Single Centralized Settings Modal */}
      <SalarySettingsModal isOpen={isSettingsOpen} onClose={closeSettings} />
    </div>
  );
}

export default function MainApp() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
    try {
      const savedAuth = localStorage.getItem('jarvis_authenticated');
      if (savedAuth === 'true') {
        setIsAuthenticated(true);
      } else {
        setIsAuthenticated(false);
      }
    } catch {
      setIsAuthenticated(true);
    }
  }, []);

  const handleLogout = () => {
    try {
      localStorage.removeItem('jarvis_authenticated');
    } catch {}
    setIsAuthenticated(false);
  };

  // Prevent flash during initial mount check
  if (isAuthenticated === null) {
    return (
      <div className="min-h-screen w-full bg-[#070e18] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <AuthScreen onAuthenticated={() => setIsAuthenticated(true)} />;
  }

  return (
    <FinanceProvider>
      <MainAppLayout onLogout={handleLogout} />
    </FinanceProvider>
  );
}
