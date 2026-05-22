'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { motion, AnimatePresence } from 'framer-motion';
import { Radar, Camera, HelpCircle, Sparkles, X } from 'lucide-react';
import ErrorBoundary from '@/components/ErrorBoundary';
import WelcomeTour from '@/components/WelcomeTour';

const OsintPanel = dynamic(() => import('@/components/OsintPanel'), { ssr: false });
const CamerasView = dynamic(() => import('@/components/CamerasView'), { ssr: false });
const HelpView = dynamic(() => import('@/components/HelpView'));

type Tab = 'investigate' | 'cameras' | 'help';

const TABS: { id: Tab; label: string; sub: string; icon: any }[] = [
  { id: 'investigate', label: 'Investigate', sub: 'OSINT tools — DNS, WHOIS, IP, certs, ports', icon: Radar },
  { id: 'cameras',     label: 'Cameras',     sub: '2,000+ public CCTV feeds worldwide',         icon: Camera },
  { id: 'help',        label: 'Help',        sub: 'New here? Start with a 60-second tour',     icon: HelpCircle },
];

export default function Dashboard() {
  const [tab, setTab] = useState<Tab>('investigate');
  const [showTour, setShowTour] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const seen = localStorage.getItem('osiris.tour.seen.v1');
    if (!seen) setShowTour(true);
    const p = new URLSearchParams(window.location.search);
    const t = p.get('tab') as Tab | null;
    if (t && TABS.find(x => x.id === t)) setTab(t);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const p = new URLSearchParams(window.location.search);
    p.set('tab', tab);
    window.history.replaceState(null, '', `${window.location.pathname}?${p.toString()}`);
  }, [tab]);

  const dismissTour = () => {
    if (typeof window !== 'undefined') localStorage.setItem('osiris.tour.seen.v1', '1');
    setShowTour(false);
  };

  return (
    <main className="min-h-dvh w-full bg-[var(--bg-void)] text-[var(--text-primary)] flex flex-col">
      {/* ── HEADER ── */}
      <header className="border-b border-[var(--border-secondary)] bg-black/40 backdrop-blur-sm sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 md:px-6 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full border-2 border-[var(--gold-primary)] flex items-center justify-center animate-glow-pulse">
              <div className="w-3 h-3 rounded-full bg-[var(--gold-primary)]/30 border border-[var(--gold-primary)]/60" />
            </div>
            <div>
              <h1 className="text-base md:text-lg font-bold tracking-[0.3em] font-mono text-[var(--text-heading)]">OSIRIS</h1>
              <p className="text-[9px] md:text-[10px] text-[var(--gold-primary)] font-mono tracking-[0.2em] opacity-80">
                OSINT TOOLKIT · BEGINNER FRIENDLY
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowTour(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded border border-[var(--gold-primary)]/40 text-[var(--gold-primary)] text-[10px] md:text-[11px] font-mono tracking-wider hover:bg-[var(--gold-primary)]/10 transition-colors"
            aria-label="Open quick start tour"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">QUICK START</span>
          </button>
        </div>

        {/* ── TABS ── */}
        <nav className="max-w-6xl mx-auto px-2 md:px-6">
          <div className="flex gap-1 md:gap-2 overflow-x-auto styled-scrollbar -mb-px">
            {TABS.map(t => {
              const Icon = t.icon;
              const active = tab === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className={`group flex items-center gap-2 px-3 md:px-4 py-2.5 border-b-2 transition-all whitespace-nowrap ${
                    active
                      ? 'border-[var(--gold-primary)] text-[var(--gold-primary)]'
                      : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                  }`}
                  aria-current={active ? 'page' : undefined}
                >
                  <Icon className="w-4 h-4" />
                  <div className="text-left">
                    <div className="text-[11px] md:text-[12px] font-semibold tracking-wider">{t.label.toUpperCase()}</div>
                    <div className="hidden md:block text-[9px] text-[var(--text-muted)]/70 font-mono">{t.sub}</div>
                  </div>
                </button>
              );
            })}
          </div>
        </nav>
      </header>

      {/* ── CONTENT ── */}
      <section className="flex-1 max-w-6xl w-full mx-auto px-3 md:px-6 py-4 md:py-6">
        <AnimatePresence mode="wait">
          <motion.div
            key={tab}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.18 }}
          >
            {tab === 'investigate' && (
              <ErrorBoundary name="Investigate">
                <div className="mb-4 glass-panel p-4">
                  <div className="flex items-start gap-3">
                    <Radar className="w-5 h-5 text-[var(--cyan-primary)] flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <h2 className="text-sm font-semibold text-[var(--text-heading)] mb-1">Investigate a domain, IP, or website</h2>
                      <p className="text-[11px] md:text-[12px] text-[var(--text-secondary)] leading-relaxed">
                        Pick a tool below and type what you want to look up. Every tool works on public data — no
                        accounts, no installs. Try <code className="px-1 py-0.5 rounded bg-black/40 text-[var(--gold-primary)] text-[10px]">example.com</code> or
                        an IP like <code className="px-1 py-0.5 rounded bg-black/40 text-[var(--gold-primary)] text-[10px]">8.8.8.8</code>.
                      </p>
                    </div>
                  </div>
                </div>
                <OsintPanel />
              </ErrorBoundary>
            )}
            {tab === 'cameras' && (
              <ErrorBoundary name="Cameras">
                <CamerasView />
              </ErrorBoundary>
            )}
            {tab === 'help' && <HelpView onStartTour={() => setShowTour(true)} />}
          </motion.div>
        </AnimatePresence>
      </section>

      {/* ── FOOTER ── */}
      <footer className="border-t border-[var(--border-secondary)] py-3 px-4 text-center">
        <p className="text-[10px] font-mono text-[var(--text-muted)] tracking-wider">
          OSIRIS · Open-source OSINT toolkit · Use only on systems you own or are authorised to test
        </p>
      </footer>

      {/* ── WELCOME TOUR ── */}
      <AnimatePresence>
        {showTour && <WelcomeTour onClose={dismissTour} onJump={(t) => { setTab(t); dismissTour(); }} />}
      </AnimatePresence>
    </main>
  );
}
