'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { Camera, Globe, Loader2, Search, RefreshCw, AlertTriangle } from 'lucide-react';

const CameraViewer = dynamic(() => import('@/components/CameraViewer'), { ssr: false });

interface Cam {
  id: string;
  lat: number;
  lng: number;
  name: string;
  city: string;
  country: string;
  feed_url?: string;
  stream_url?: string;
  external_url?: string;
  stream_type?: 'jpg' | 'hls' | 'iframe';
  source: string;
}

const PAGE_SIZE = 48;

export default function CamerasView() {
  const [cams, setCams] = useState<Cam[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [country, setCountry] = useState<string>('all');
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [active, setActive] = useState<Cam | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/cctv?region=all');
      if (!res.ok) throw new Error(`Server returned ${res.status}`);
      const data = await res.json();
      setCams(data.cameras || []);
      setLoaded(true);
    } catch (e: any) {
      setError(e?.message || 'Could not load cameras');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const countries = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const c of cams) counts[c.country] = (counts[c.country] || 0) + 1;
    return Object.entries(counts).sort((a, b) => b[1] - a[1]);
  }, [cams]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return cams.filter(c => {
      if (country !== 'all' && c.country !== country) return false;
      if (!q) return true;
      return (
        c.name?.toLowerCase().includes(q) ||
        c.city?.toLowerCase().includes(q) ||
        c.country?.toLowerCase().includes(q) ||
        c.source?.toLowerCase().includes(q)
      );
    });
  }, [cams, country, query]);

  const visible = filtered.slice(0, page * PAGE_SIZE);

  useEffect(() => {
    setPage(1);
  }, [country, query]);

  return (
    <div className="space-y-4">
      {/* ── Intro ── */}
      <div className="glass-panel p-4">
        <div className="flex items-start gap-3">
          <Camera className="w-5 h-5 text-[#39FF14] flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <h2 className="text-sm font-semibold text-[var(--text-heading)] mb-1">Live public cameras</h2>
            <p className="text-[12px] text-[var(--text-secondary)] leading-relaxed">
              Public traffic, transit and city cameras from agencies that already publish them. Pick a country to
              filter, search by city, click any card to watch live.
            </p>
          </div>
          <button
            onClick={load}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded border border-[var(--border-secondary)] text-[10px] font-mono tracking-wider text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:border-[var(--gold-primary)]/40 disabled:opacity-50"
            aria-label="Reload cameras"
          >
            <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
            Reload
          </button>
        </div>
      </div>

      {/* ── Error ── */}
      {error && (
        <div className="glass-panel p-4 border-l-4 border-l-red-400 flex items-start gap-3">
          <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-[12px] text-[var(--text-primary)] font-semibold">Could not load cameras</p>
            <p className="text-[11px] text-[var(--text-muted)] mt-0.5">{error}</p>
            <button
              onClick={load}
              className="mt-2 text-[11px] font-mono text-[var(--cyan-primary)] hover:underline"
            >
              Try again
            </button>
          </div>
        </div>
      )}

      {/* ── Filters ── */}
      {loaded && cams.length > 0 && (
        <div className="glass-panel p-3 space-y-3">
          {/* Search */}
          <label className="flex items-center gap-2 px-3 py-2 rounded border border-[var(--border-secondary)] bg-black/30">
            <Search className="w-3.5 h-3.5 text-[var(--text-muted)] flex-shrink-0" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name, city, or source…"
              className="flex-1 bg-transparent outline-none text-[12px] text-[var(--text-primary)] placeholder:text-[var(--text-muted)]"
              aria-label="Search cameras"
            />
            {query && (
              <button onClick={() => setQuery('')} className="text-[10px] text-[var(--text-muted)] hover:text-white">
                clear
              </button>
            )}
          </label>

          {/* Country chips */}
          <div className="flex flex-wrap gap-1.5">
            <button
              onClick={() => setCountry('all')}
              className={`px-2.5 py-1 rounded text-[10px] font-mono tracking-wider border transition-colors ${
                country === 'all'
                  ? 'border-[var(--gold-primary)]/60 bg-[var(--gold-primary)]/15 text-[var(--gold-primary)]'
                  : 'border-[var(--border-secondary)] text-[var(--text-muted)] hover:text-[var(--text-primary)]'
              }`}
            >
              <Globe className="w-3 h-3 inline mr-1" />
              ALL · {cams.length}
            </button>
            {countries.map(([c, n]) => (
              <button
                key={c}
                onClick={() => setCountry(c)}
                className={`px-2.5 py-1 rounded text-[10px] font-mono tracking-wider border transition-colors ${
                  country === c
                    ? 'border-[var(--cyan-primary)]/60 bg-[var(--cyan-primary)]/15 text-[var(--cyan-primary)]'
                    : 'border-[var(--border-secondary)] text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                }`}
              >
                {c} · {n}
              </button>
            ))}
          </div>

          <div className="text-[10px] font-mono text-[var(--text-muted)] tracking-wider">
            Showing {Math.min(visible.length, filtered.length)} of {filtered.length}
            {filtered.length !== cams.length && ` (filtered from ${cams.length})`}
          </div>
        </div>
      )}

      {/* ── Loading skeleton ── */}
      {loading && !loaded && (
        <div className="flex flex-col items-center justify-center py-16 text-[var(--text-muted)]">
          <Loader2 className="w-8 h-8 animate-spin text-[var(--gold-primary)] mb-3" />
          <p className="text-[12px] font-mono tracking-wider">Loading cameras…</p>
          <p className="text-[10px] mt-1">This pulls from ~10 public agencies — first load takes a few seconds.</p>
        </div>
      )}

      {/* ── Grid ── */}
      {loaded && visible.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {visible.map((cam) => (
            <CameraCard key={cam.id} cam={cam} onOpen={() => setActive(cam)} />
          ))}
        </div>
      )}

      {/* ── Empty state ── */}
      {loaded && filtered.length === 0 && (
        <div className="text-center py-12 text-[var(--text-muted)]">
          <Camera className="w-8 h-8 mx-auto mb-2 opacity-40" />
          <p className="text-[12px]">No cameras match your filter.</p>
          <button
            onClick={() => { setCountry('all'); setQuery(''); }}
            className="mt-2 text-[11px] font-mono text-[var(--cyan-primary)] hover:underline"
          >
            Reset filters
          </button>
        </div>
      )}

      {/* ── Load more ── */}
      {loaded && visible.length < filtered.length && (
        <div className="flex justify-center pt-2">
          <button
            onClick={() => setPage(p => p + 1)}
            className="px-4 py-2 rounded border border-[var(--gold-primary)]/40 bg-[var(--gold-primary)]/10 text-[var(--gold-primary)] text-[11px] font-mono tracking-wider hover:bg-[var(--gold-primary)]/20"
          >
            Show more
          </button>
        </div>
      )}

      <CameraViewer camera={active} onClose={() => setActive(null)} />
    </div>
  );
}

function CameraCard({ cam, onOpen }: { cam: Cam; onOpen: () => void }) {
  const [thumbErr, setThumbErr] = useState(false);
  const showThumb = cam.feed_url && !cam.stream_url && !thumbErr;

  return (
    <button
      onClick={onOpen}
      className="text-left glass-panel overflow-hidden hover:border-[#39FF14]/40 transition-colors group"
    >
      <div className="aspect-video bg-black/80 relative overflow-hidden">
        {showThumb ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={cam.feed_url}
            alt={cam.name}
            loading="lazy"
            className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform"
            onError={() => setThumbErr(true)}
          />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-[var(--text-muted)]">
            <Camera className="w-7 h-7 mb-1 opacity-50" />
            <span className="text-[9px] font-mono tracking-wider">
              {cam.stream_type === 'hls' ? 'LIVE VIDEO' : cam.stream_type === 'iframe' ? 'EMBEDDED' : 'CLICK TO WATCH'}
            </span>
          </div>
        )}
        <div className="absolute top-2 left-2 flex items-center gap-1 bg-black/70 backdrop-blur-sm px-1.5 py-0.5 rounded">
          <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
          <span className="text-[8px] font-mono text-white tracking-wider">LIVE</span>
        </div>
      </div>
      <div className="px-3 py-2">
        <div className="text-[11px] font-semibold text-[var(--text-primary)] truncate">{cam.name}</div>
        <div className="text-[10px] text-[var(--text-muted)] font-mono truncate">
          {cam.city ? `${cam.city} · ` : ''}{cam.country} · {cam.source}
        </div>
      </div>
    </button>
  );
}
