import { NextResponse } from 'next/server';
import { isRateLimited, getClientIp } from '@/lib/ssrf-guard';

/**
 * Certificate Transparency lookup.
 * Primary source: crt.sh (rich, free, but historically flaky).
 * Fallback: CertSpotter (api.certspotter.com — fast, no key for limited results).
 */

interface NormCert {
  id?: number | string;
  issuer?: string;
  common_name?: string;
  name_value?: string;
  not_before?: string;
  not_after?: string;
  serial?: string;
  source: 'crt.sh' | 'certspotter';
}

async function fromCrtSh(domain: string, signal: AbortSignal): Promise<NormCert[]> {
  const res = await fetch(`https://crt.sh/?q=%25.${encodeURIComponent(domain)}&output=json`, {
    signal,
    headers: { 'User-Agent': 'rudraosint/0.3', Accept: 'application/json' },
  });
  if (!res.ok) throw new Error(`crt.sh HTTP ${res.status}`);
  const arr: any[] = await res.json();
  return arr.map(c => ({
    id: c.id,
    issuer: c.issuer_name,
    common_name: c.common_name,
    name_value: c.name_value,
    not_before: c.not_before,
    not_after: c.not_after,
    serial: c.serial_number,
    source: 'crt.sh',
  }));
}

async function fromCertSpotter(domain: string, signal: AbortSignal): Promise<NormCert[]> {
  const url = `https://api.certspotter.com/v1/issuances?domain=${encodeURIComponent(domain)}&include_subdomains=true&expand=dns_names&expand=issuer`;
  const res = await fetch(url, {
    signal,
    headers: { 'User-Agent': 'rudraosint/0.3', Accept: 'application/json' },
  });
  if (!res.ok) throw new Error(`certspotter HTTP ${res.status}`);
  const arr: any[] = await res.json();
  return arr.map(c => ({
    id: c.id,
    issuer: c.issuer?.name,
    common_name: Array.isArray(c.dns_names) ? c.dns_names[0] : undefined,
    name_value: Array.isArray(c.dns_names) ? c.dns_names.join('\n') : undefined,
    not_before: c.not_before,
    not_after: c.not_after,
    source: 'certspotter',
  }));
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const domain = searchParams.get('domain')?.trim();
  if (!domain) return NextResponse.json({ error: 'Missing domain parameter' }, { status: 400 });

  const clientIp = getClientIp(req);
  if (isRateLimited(clientIp, 20, 60_000)) {
    return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
  }
  if (!/^[a-zA-Z0-9][a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(domain)) {
    return NextResponse.json({ error: 'Invalid domain format' }, { status: 400 });
  }

  // Race the two sources — whichever responds first wins.
  // If crt.sh wins, certSpotter is cancelled.
  // If both fail, surface both reasons.
  const controller = new AbortController();
  const errors: string[] = [];

  const wrap = async (label: string, fn: () => Promise<NormCert[]>) => {
    try { return await fn(); } catch (e: any) {
      errors.push(`${label}: ${e?.message || e}`);
      throw e;
    }
  };

  let certs: NormCert[] = [];
  let source = '';
  try {
    const t = setTimeout(() => controller.abort(), 25000);
    const result = await Promise.any([
      wrap('crt.sh',      () => fromCrtSh(domain, controller.signal)),
      wrap('certspotter', () => fromCertSpotter(domain, controller.signal)),
    ]);
    clearTimeout(t);
    controller.abort();
    certs = result;
    source = certs[0]?.source || 'unknown';
  } catch {
    return NextResponse.json({
      domain, certificates: [], subdomains: [],
      error: 'No CT source responded', details: errors,
    }, { status: 502 });
  }

  // Deduplicate by (issuer, common_name, not_before)
  const seen = new Set<string>();
  const subdomains = new Set<string>();
  const unique: NormCert[] = [];
  for (const cert of certs) {
    const key = `${cert.issuer || ''}|${cert.common_name || ''}|${cert.not_before || ''}`;
    if (seen.has(key)) continue;
    seen.add(key);
    (cert.name_value || '').split('\n').forEach(n => {
      const clean = n.trim().toLowerCase().replace(/^\*\./, '');
      if (clean.endsWith(domain.toLowerCase())) subdomains.add(clean);
    });
    unique.push(cert);
    if (unique.length >= 200) break;
  }

  return NextResponse.json({
    domain,
    source,
    certificates: unique.slice(0, 50),
    subdomains: Array.from(subdomains).sort(),
    total_certs: certs.length,
    unique_subdomains: subdomains.size,
    timestamp: new Date().toISOString(),
  });
}
