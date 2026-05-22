'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { X, ArrowRight, Radar, Camera, ShieldCheck, BookOpen } from 'lucide-react';

interface WelcomeTourProps {
  onClose: () => void;
  onJump: (tab: 'investigate' | 'cameras' | 'help') => void;
}

const STEPS = [
  {
    icon: BookOpen,
    title: 'Welcome to RudraOSINT',
    body: 'A friendly OSINT toolkit. Type a domain or IP, get back DNS, WHOIS, certificates, open ports — all from one screen.',
  },
  {
    icon: Radar,
    title: 'Investigate tab',
    body: 'Eleven recon tools. Each one has a single input box and plain-English results. Start with DNS or WHOIS — they are the most beginner-friendly.',
    cta: { label: 'Open Investigate', tab: 'investigate' as const },
  },
  {
    icon: Camera,
    title: 'Cameras tab',
    body: 'Browse 2,000+ public traffic and city cameras from the UK, US, Europe and more. Filter by country, click any card to watch the live feed.',
    cta: { label: 'Open Cameras', tab: 'cameras' as const },
  },
  {
    icon: ShieldCheck,
    title: 'Stay on the right side',
    body: 'Only investigate things you own or have written permission to test. Port and vulnerability scans against third parties can be illegal. When in doubt, stop.',
  },
];

export default function WelcomeTour({ onClose, onJump }: WelcomeTourProps) {
  const [i, setI] = useState(0);
  const step = STEPS[i];
  const Icon = step.icon;
  const isLast = i === STEPS.length - 1;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[600] flex items-center justify-center bg-black/80 backdrop-blur-sm px-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="welcome-tour-title"
    >
      <motion.div
        initial={{ scale: 0.95, y: 16 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.95, y: 16 }}
        transition={{ type: 'spring', damping: 25, stiffness: 280 }}
        className="glass-panel w-full max-w-md p-6 relative"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-3 right-3 p-1.5 rounded hover:bg-white/5 text-[var(--text-muted)] hover:text-white"
          aria-label="Close tour"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full border border-[var(--gold-primary)]/40 bg-[var(--gold-primary)]/10 flex items-center justify-center">
            <Icon className="w-5 h-5 text-[var(--gold-primary)]" />
          </div>
          <div>
            <div className="text-[9px] font-mono text-[var(--text-muted)] tracking-[0.2em]">
              STEP {i + 1} / {STEPS.length}
            </div>
            <h2 id="welcome-tour-title" className="text-base font-semibold text-[var(--text-heading)]">
              {step.title}
            </h2>
          </div>
        </div>

        <p className="text-[13px] text-[var(--text-secondary)] leading-relaxed mb-5">{step.body}</p>

        {step.cta && (
          <button
            onClick={() => onJump(step.cta!.tab)}
            className="w-full mb-3 flex items-center justify-center gap-2 px-4 py-2.5 rounded border border-[var(--cyan-primary)]/40 bg-[var(--cyan-primary)]/10 text-[var(--cyan-primary)] text-[12px] font-mono tracking-wider hover:bg-[var(--cyan-primary)]/20 transition-colors"
          >
            {step.cta.label}
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        )}

        <div className="flex items-center justify-between mt-2">
          <div className="flex gap-1.5">
            {STEPS.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setI(idx)}
                aria-label={`Go to step ${idx + 1}`}
                className={`w-2 h-2 rounded-full transition-colors ${
                  idx === i ? 'bg-[var(--gold-primary)]' : 'bg-[var(--text-muted)]/30'
                }`}
              />
            ))}
          </div>
          <div className="flex gap-2">
            {i > 0 && (
              <button
                onClick={() => setI(i - 1)}
                className="px-3 py-1.5 text-[11px] font-mono text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              >
                Back
              </button>
            )}
            {!isLast ? (
              <button
                onClick={() => setI(i + 1)}
                className="px-4 py-1.5 text-[11px] font-mono rounded border border-[var(--gold-primary)]/40 bg-[var(--gold-primary)]/10 text-[var(--gold-primary)] hover:bg-[var(--gold-primary)]/20"
              >
                Next
              </button>
            ) : (
              <button
                onClick={onClose}
                className="px-4 py-1.5 text-[11px] font-mono rounded border border-[var(--gold-primary)]/40 bg-[var(--gold-primary)]/10 text-[var(--gold-primary)] hover:bg-[var(--gold-primary)]/20"
              >
                Get started
              </button>
            )}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
