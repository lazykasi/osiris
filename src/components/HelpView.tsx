'use client';

import { Sparkles, Radar, Camera, ShieldAlert, BookOpen, ExternalLink } from 'lucide-react';

interface HelpViewProps {
  onStartTour: () => void;
}

const FAQ: { q: string; a: string }[] = [
  {
    q: 'What is OSINT?',
    a: 'OSINT — Open Source Intelligence — is information you can gather from publicly available sources: DNS records, WHOIS data, certificate logs, public APIs, public webcams. No hacking, no secrets, no special access.',
  },
  {
    q: 'Is it legal to use these tools?',
    a: 'Looking up DNS, WHOIS, certificates, or BGP info is generally fine — that data is published. Port and vulnerability scanning a system you do not own or have permission to test may be illegal in your jurisdiction. When unsure, stop and ask.',
  },
  {
    q: 'Where does the camera data come from?',
    a: 'Public traffic and city camera networks: Transport for London, Washington State DOT, Caltrans, NYC DOT, VicRoads (Australia), and several European agencies. All feeds are already public — RudraOSINT just lays them out in one place.',
  },
  {
    q: 'Do I need an API key?',
    a: 'No. Every tool here works out of the box. The upstream Osiris project supports optional API keys for higher rate limits — this beginner fork (RudraOSINT) sticks to the free tier.',
  },
  {
    q: 'Will my searches be logged or shared?',
    a: 'Your searches are sent from your browser to the RudraOSINT API, which forwards them to the relevant public data source. There is rate-limiting per IP. There is no per-user logging or third-party sharing in this fork.',
  },
];

const GLOSSARY: { term: string; meaning: string }[] = [
  { term: 'DNS', meaning: 'The phonebook of the internet — maps a name like example.com to an IP address.' },
  { term: 'WHOIS', meaning: 'A public record of who registered a domain name and when.' },
  { term: 'IP address', meaning: 'A numeric address for a computer on the internet, e.g. 8.8.8.8.' },
  { term: 'TLS certificate', meaning: 'A signed document that proves a website really is who it claims to be (the padlock in your browser).' },
  { term: 'Port', meaning: 'A numbered door on a server. Common doors: 22 (SSH), 80 (HTTP), 443 (HTTPS).' },
  { term: 'BGP / ASN', meaning: 'BGP is how big internet networks tell each other "I can reach X." Each network has an AS Number.' },
  { term: 'CVE', meaning: 'A unique identifier for a known software vulnerability, e.g. CVE-2024-1234.' },
  { term: 'CCTV', meaning: 'Closed-circuit television — in this app, public traffic and city cameras you can watch live.' },
];

export default function HelpView({ onStartTour }: HelpViewProps) {
  return (
    <div className="space-y-5">
      {/* ── Quick start ── */}
      <div className="glass-panel p-5">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-full bg-[var(--gold-primary)]/10 border border-[var(--gold-primary)]/40 flex items-center justify-center flex-shrink-0">
            <Sparkles className="w-5 h-5 text-[var(--gold-primary)]" />
          </div>
          <div className="flex-1">
            <h2 className="text-base font-semibold text-[var(--text-heading)] mb-1">New here? Take the 60-second tour.</h2>
            <p className="text-[12px] text-[var(--text-secondary)] mb-3">
              Four short slides covering what the app does, where to start, and how to use it responsibly.
            </p>
            <button
              onClick={onStartTour}
              className="px-4 py-2 rounded border border-[var(--gold-primary)]/40 bg-[var(--gold-primary)]/10 text-[var(--gold-primary)] text-[12px] font-mono tracking-wider hover:bg-[var(--gold-primary)]/20 transition-colors"
            >
              Start the tour
            </button>
          </div>
        </div>
      </div>

      {/* ── Tool reference ── */}
      <div className="glass-panel p-5">
        <h2 className="flex items-center gap-2 text-base font-semibold text-[var(--text-heading)] mb-3">
          <Radar className="w-4 h-4 text-[var(--cyan-primary)]" /> The tools, in plain English
        </h2>
        <div className="grid sm:grid-cols-2 gap-3 text-[12px]">
          {[
            ['PORT SCAN', 'Knock on common doors of a server and see which are open.'],
            ['VULN SCAN', 'Check open ports against a database of known security holes.'],
            ['DNS', 'Look up the IP and other DNS records for a domain.'],
            ['WHOIS', 'See who registered a domain and when.'],
            ['CERTS', 'Find every TLS certificate ever issued for a domain.'],
            ['THREATS', 'Check if an IP, domain, or hash is known-bad.'],
            ['HEADERS', 'See the HTTP headers a website returns.'],
            ['SSL/TLS', 'Inspect the live HTTPS certificate a site presents.'],
            ['SUBDOMAINS', 'Enumerate subdomains of a domain.'],
            ['TECH DETECT', 'Guess what tech stack a site is built on.'],
            ['IP SWEEP', 'Scan a range of IPs to see which respond.'],
          ].map(([name, desc]) => (
            <div key={name} className="p-3 rounded border border-[var(--border-secondary)] bg-black/20">
              <div className="text-[10px] font-mono text-[var(--gold-primary)] tracking-wider mb-1">{name}</div>
              <div className="text-[var(--text-secondary)] leading-snug">{desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── FAQ ── */}
      <div className="glass-panel p-5">
        <h2 className="flex items-center gap-2 text-base font-semibold text-[var(--text-heading)] mb-3">
          <BookOpen className="w-4 h-4 text-[var(--gold-primary)]" /> FAQ
        </h2>
        <div className="space-y-3">
          {FAQ.map(({ q, a }) => (
            <details key={q} className="group rounded border border-[var(--border-secondary)] bg-black/20">
              <summary className="cursor-pointer list-none px-3 py-2.5 flex items-center justify-between text-[12px] font-semibold text-[var(--text-primary)]">
                {q}
                <span className="text-[var(--text-muted)] group-open:rotate-180 transition-transform">▾</span>
              </summary>
              <p className="px-3 pb-3 text-[12px] text-[var(--text-secondary)] leading-relaxed">{a}</p>
            </details>
          ))}
        </div>
      </div>

      {/* ── Glossary ── */}
      <div className="glass-panel p-5">
        <h2 className="text-base font-semibold text-[var(--text-heading)] mb-3">Glossary</h2>
        <dl className="grid sm:grid-cols-2 gap-x-6 gap-y-2 text-[12px]">
          {GLOSSARY.map(({ term, meaning }) => (
            <div key={term}>
              <dt className="font-mono text-[10px] text-[var(--cyan-primary)] tracking-wider">{term}</dt>
              <dd className="text-[var(--text-secondary)] leading-snug">{meaning}</dd>
            </div>
          ))}
        </dl>
      </div>

      {/* ── Safety ── */}
      <div className="glass-panel p-5 border-l-4 border-l-[var(--alert-red,_#FF3D3D)]">
        <h2 className="flex items-center gap-2 text-base font-semibold text-[var(--text-heading)] mb-2">
          <ShieldAlert className="w-4 h-4 text-red-400" /> Use responsibly
        </h2>
        <p className="text-[12px] text-[var(--text-secondary)] leading-relaxed">
          Only run port and vulnerability scans against systems you own, or where you have written authorisation
          to test. Looking up DNS, WHOIS, certificates and BGP is fine — that data is public. Scanning a third
          party&apos;s network without permission may be unlawful where you live.
        </p>
      </div>

      {/* ── Upstream link ── */}
      <div className="text-center pb-2">
        <a
          href="https://github.com/simplifaisoul/osiris"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-[11px] font-mono text-[var(--text-muted)] hover:text-[var(--gold-primary)] tracking-wider"
        >
          Forked from simplifaisoul/osiris <ExternalLink className="w-3 h-3" />
        </a>
      </div>
    </div>
  );
}
