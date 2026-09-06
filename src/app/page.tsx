'use client';

import dynamic from 'next/dynamic';

const MainApp = dynamic(() => import('@/components/MainApp'), {
  ssr: false,
  loading: () => (
    <div className="min-h-screen bg-[#f8f9ff] flex items-center justify-center">
      <div className="flex items-center gap-3 px-5 py-2.5 rounded-full bg-white shadow-sm border border-slate-100">
        <div className="w-4 h-4 border-2 border-[#006c49] border-t-transparent rounded-full animate-spin"></div>
        <span className="font-sans text-xs text-[#0b1c30] font-semibold tracking-wider uppercase">
          Initializing CA Ledger Node…
        </span>
      </div>
    </div>
  ),
});

export default function Home() {
  return <MainApp />;
}
