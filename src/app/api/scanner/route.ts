import { NextResponse } from 'next/server';
import net from 'node:net';
import tls from 'node:tls';
import { validateHost, safeFetch, isRateLimited, getClientIp } from '@/lib/ssrf-guard';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Self-hosted scanner. No external service required.
 * - quick / deep / ports → TCP-connect scan against a curated port list
 * - headers              → HTTP GET, return headers + status
 * - ssl                  → tls.connect, peer certificate summary
 * - subdomains           → crt.sh certificate-transparency enumeration
 * - tech                 → HTTP GET + fingerprint headers and HTML body
 * - vuln                 → quick scan + naive service/version → CVE pattern match
 */

const TOP_25_PORTS = [21, 22, 23, 25, 53, 80, 110, 111, 135, 139, 143, 443, 445, 587, 993, 995, 1723, 3306, 3389, 5900, 6379, 8080, 8443, 9000, 27017];
const TOP_100_PORTS = [
  ...TOP_25_PORTS,
  20, 26, 37, 79, 88, 106, 113, 119, 123, 137, 161, 179, 199, 389, 427, 444, 465, 513, 514, 515, 543, 544,
  548, 554, 631, 646, 873, 990, 1025, 1026, 1027, 1028, 1029, 1110, 1433, 1720, 1755, 1900, 2000, 2001,
  2049, 2121, 2717, 3000, 3128, 3268, 3306, 3389, 3690, 3986, 4899, 5000, 5009, 5051, 5060, 5101, 5190,
  5357, 5432, 5631, 5666, 5800, 5900, 6000, 6001, 6646, 7070, 8000, 8009, 8888, 9090, 9100, 9999, 10000, 32768, 49152, 49154,
];

const SERVICE_NAMES: Record<number, string> = {
  21: 'ftp', 22: 'ssh', 23: 'telnet', 25: 'smtp', 53: 'dns', 80: 'http', 110: 'pop3', 111: 'rpcbind',
  135: 'msrpc', 139: 'netbios-ssn', 143: 'imap', 161: 'snmp', 389: 'ldap', 443: 'https', 445: 'smb',
  465: 'smtps', 587: 'submission', 631: 'ipp', 993: 'imaps', 995: 'pop3s', 1433: 'mssql', 1521: 'oracle',
  1723: 'pptp', 2049: 'nfs', 2375: 'docker', 2379: 'etcd', 3000: 'http-alt', 3306: 'mysql', 3389: 'rdp',
  5432: 'postgres', 5900: 'vnc', 5984: 'couchdb', 6379: 'redis', 7000: 'cassandra', 8000: 'http-alt',
  8080: 'http-proxy', 8081: 'http-alt', 8443: 'https-alt', 8888: 'http-alt', 9000: 'http-alt',
  9090: 'prometheus', 9100: 'jetdirect', 9200: 'elasticsearch', 11211: 'memcached', 15672: 'rabbitmq',
  27017: 'mongodb', 27018: 'mongodb', 50000: 'sap',
};

interface OpenPort {
  port: number;
  state: 'open';
  service: string;
  banner?: string;
}

/* ─────────────── port scan ─────────────── */

function tcpProbe(host: string, port: number, timeoutMs: number): Promise<OpenPort | null> {
  return new Promise(resolve => {
    const socket = new net.Socket();
    let done = false;
    let banner = '';
    const finish = (open: boolean) => {
      if (done) return;
      done = true;
      try { socket.destroy(); } catch {}
      if (!open) return resolve(null);
      resolve({
        port,
        state: 'open',
        service: SERVICE_NAMES[port] || 'unknown',
        banner: banner ? banner.slice(0, 180) : undefined,
      });
    };
    socket.setTimeout(timeoutMs);
    socket.once('connect', () => {
      // Try grabbing a banner for plain-text protocols
      if (port === 22 || port === 25 || port === 21 || port === 110 || port === 143) {
        socket.once('data', (d) => { banner = d.toString('utf8').replace(/[\r\n]+/g, ' ').trim(); finish(true); });
        setTimeout(() => finish(true), Math.min(timeoutMs, 1000));
      } else {
        finish(true);
      }
    });
    socket.once('timeout', () => finish(false));
    socket.once('error', () => finish(false));
    try { socket.connect(port, host); } catch { finish(false); }
  });
}

async function scanPorts(host: string, ports: number[], perPortTimeoutMs = 1500): Promise<OpenPort[]> {
  // Limit parallelism so we don't exhaust ephemeral ports / file descriptors
  const concurrency = 64;
  const results: OpenPort[] = [];
  let i = 0;
  await Promise.all(
    Array.from({ length: concurrency }, async () => {
      while (i < ports.length) {
        const idx = i++;
        const r = await tcpProbe(host, ports[idx], perPortTimeoutMs);
        if (r) results.push(r);
      }
    }),
  );
  results.sort((a, b) => a.port - b.port);
  return results;
}

/* ─────────────── ssl / cert ─────────────── */

function fetchPeerCert(host: string, port = 443, timeoutMs = 6000): Promise<any> {
  return new Promise((resolve, reject) => {
    const socket = tls.connect({ host, port, servername: host, rejectUnauthorized: false, timeout: timeoutMs }, () => {
      const cert = socket.getPeerCertificate(true);
      const proto = socket.getProtocol();
      const cipher = socket.getCipher();
      socket.end();
      if (!cert || Object.keys(cert).length === 0) return reject(new Error('No peer certificate'));
      resolve({
        protocol: proto,
        cipher: cipher?.name,
        valid: socket.authorized,
        authorization_error: (socket as any).authorizationError ? String((socket as any).authorizationError) : undefined,
        subject: cert.subject ? Object.entries(cert.subject).map(([k, v]) => `${k}=${v}`).join(', ') : undefined,
        issuer: cert.issuer ? Object.entries(cert.issuer).map(([k, v]) => `${k}=${v}`).join(', ') : undefined,
        not_before: cert.valid_from,
        not_after: cert.valid_to,
        sans: typeof cert.subjectaltname === 'string' ? cert.subjectaltname.replace(/DNS:/g, '').split(/, ?/) : undefined,
        serial: cert.serialNumber,
        fingerprint_sha256: cert.fingerprint256,
      });
    });
    socket.once('error', reject);
    socket.once('timeout', () => { socket.destroy(); reject(new Error('TLS connect timeout')); });
  });
}

/* ─────────────── helpers ─────────────── */

function normalizeUrl(target: string): string {
  if (/^https?:\/\//i.test(target)) return target;
  return `https://${target}`;
}

function stripUrlToHost(target: string): string {
  try {
    if (/^https?:\/\//i.test(target)) return new URL(target).hostname;
  } catch {}
  return target.replace(/^https?:\/\//i, '').split('/')[0];
}

/* ─────────────── tech fingerprint ─────────────── */

interface TechSig { name: string; category: string; signal: string; }

function detectTech(headers: Record<string, string>, body: string): TechSig[] {
  const found: TechSig[] = [];
  const h = Object.fromEntries(Object.entries(headers).map(([k, v]) => [k.toLowerCase(), v]));

  const headerHits: [string, string, string, string][] = [
    ['server', /cloudflare/i.source,  'Cloudflare',  'CDN'],
    ['server', /nginx/i.source,       'nginx',       'Web Server'],
    ['server', /apache/i.source,      'Apache',      'Web Server'],
    ['server', /microsoft-iis/i.source, 'IIS',       'Web Server'],
    ['server', /caddy/i.source,       'Caddy',       'Web Server'],
    ['server', /litespeed/i.source,   'LiteSpeed',   'Web Server'],
    ['x-powered-by', /express/i.source, 'Express',   'Framework'],
    ['x-powered-by', /next\.js/i.source, 'Next.js',  'Framework'],
    ['x-powered-by', /php/i.source,     'PHP',       'Language'],
    ['x-powered-by', /asp\.net/i.source, 'ASP.NET',  'Framework'],
    ['x-vercel-id', /.+/.source,        'Vercel',    'Hosting'],
    ['x-amz-cf-id', /.+/.source,        'CloudFront','CDN'],
    ['cf-ray', /.+/.source,             'Cloudflare','CDN'],
    ['x-shopify-stage', /.+/.source,    'Shopify',   'E-commerce'],
    ['x-drupal-cache', /.+/.source,     'Drupal',    'CMS'],
    ['x-generator', /wordpress/i.source,'WordPress', 'CMS'],
  ];
  for (const [hdr, pat, name, category] of headerHits) {
    const v = h[hdr];
    if (v && new RegExp(pat, 'i').test(v)) found.push({ name, category, signal: `${hdr}: ${v}` });
  }

  const bodyHits: [RegExp, string, string][] = [
    [/<meta[^>]+name=["']generator["'][^>]+content=["']wordpress/i, 'WordPress', 'CMS'],
    [/wp-content\//i,                                                'WordPress', 'CMS'],
    [/<meta[^>]+name=["']generator["'][^>]+content=["']drupal/i,    'Drupal',    'CMS'],
    [/<meta[^>]+name=["']generator["'][^>]+content=["']joomla/i,    'Joomla',    'CMS'],
    [/__NEXT_DATA__/,                                                'Next.js',   'Framework'],
    [/_next\/static\//,                                              'Next.js',   'Framework'],
    [/__NUXT__/,                                                     'Nuxt',      'Framework'],
    [/data-react-helmet|react-root|__react_devtools/,                'React',     'Framework'],
    [/ng-version=|ng-app=|_angular_/,                                'Angular',   'Framework'],
    [/data-v-[a-f0-9]{8}/,                                           'Vue.js',    'Framework'],
    [/gatsby-/,                                                      'Gatsby',    'Framework'],
    [/cdn\.shopify\.com/,                                            'Shopify',   'E-commerce'],
    [/\/_woocommerce\/|woocommerce/i,                                'WooCommerce','E-commerce'],
    [/\/static\/svelte/,                                             'Svelte',    'Framework'],
    [/gtag\(|google-analytics|googletagmanager/,                     'Google Analytics','Analytics'],
    [/fbq\(|connect\.facebook\.net/,                                 'Facebook Pixel','Analytics'],
    [/cdn\.jsdelivr\.net\/npm\/bootstrap/,                           'Bootstrap', 'UI'],
    [/tailwindcss|tailwind\.css/,                                    'Tailwind',  'UI'],
  ];
  for (const [pat, name, category] of bodyHits) {
    if (pat.test(body)) {
      if (!found.find(f => f.name === name)) found.push({ name, category, signal: pat.source.slice(0, 60) });
    }
  }
  return found;
}

/* ─────────────── handler ─────────────── */

export async function GET(req: Request) {
  const clientIp = getClientIp(req);
  if (isRateLimited(clientIp, 10, 60_000)) {
    return NextResponse.json({ error: 'Rate limit exceeded', detail: 'Maximum 10 scans per minute.' }, { status: 429 });
  }

  const { searchParams } = new URL(req.url);
  const rawTarget = searchParams.get('target')?.trim() || '';
  const scanType = (searchParams.get('type') || 'quick').toLowerCase();
  if (!rawTarget) return NextResponse.json({ error: 'Missing target parameter' }, { status: 400 });

  const host = stripUrlToHost(rawTarget);
  const guard = await validateHost(host);
  if (!guard.ok) return NextResponse.json({ error: 'Target blocked', detail: guard.reason }, { status: 403 });
  const resolvedIp = guard.resolved?.[0] || host;

  try {
    if (scanType === 'quick' || scanType === 'deep' || scanType === 'ports') {
      const ports = scanType === 'quick' ? TOP_25_PORTS : TOP_100_PORTS;
      const started = Date.now();
      const open = await scanPorts(resolvedIp, ports, scanType === 'quick' ? 1200 : 1800);
      return NextResponse.json({
        target: host, resolved_ip: resolvedIp, scan_type: scanType,
        ports_tested: ports.length, ports: open,
        duration: `${((Date.now() - started) / 1000).toFixed(2)}s`,
        timestamp: new Date().toISOString(),
      });
    }

    if (scanType === 'ssl') {
      const cert = await fetchPeerCert(host, 443);
      return NextResponse.json({ target: host, ...cert, timestamp: new Date().toISOString() });
    }

    if (scanType === 'headers') {
      const url = normalizeUrl(rawTarget);
      const res = await safeFetch(url, { method: 'GET', signal: AbortSignal.timeout(8000) });
      const headers: Record<string, string> = {};
      res.headers.forEach((v, k) => { headers[k] = v; });
      return NextResponse.json({
        target: host, url, status: res.status, status_text: res.statusText,
        final_url: res.url, headers, timestamp: new Date().toISOString(),
      });
    }

    if (scanType === 'tech') {
      const url = normalizeUrl(rawTarget);
      const res = await safeFetch(url, { method: 'GET', signal: AbortSignal.timeout(10000) });
      const headers: Record<string, string> = {};
      res.headers.forEach((v, k) => { headers[k] = v; });
      const body = (await res.text()).slice(0, 200_000);
      const tech = detectTech(headers, body);
      return NextResponse.json({
        target: host, url, status: res.status, technologies: tech,
        count: tech.length, timestamp: new Date().toISOString(),
      });
    }

    if (scanType === 'subdomains') {
      // crt.sh certificate transparency log search
      const res = await fetch(`https://crt.sh/?q=${encodeURIComponent('%.' + host)}&output=json`, {
        signal: AbortSignal.timeout(15000),
        headers: { 'User-Agent': 'rudraosint-scanner/1.0' },
      });
      if (!res.ok) return NextResponse.json({ error: `crt.sh returned ${res.status}` }, { status: 502 });
      const rows: any[] = await res.json();
      const set = new Set<string>();
      for (const row of rows) {
        const names = String(row.name_value || '').split(/\n/);
        for (const n of names) {
          const trimmed = n.trim().toLowerCase().replace(/^\*\./, '');
          if (trimmed && trimmed.endsWith(host.toLowerCase())) set.add(trimmed);
        }
      }
      const subdomains = Array.from(set).sort();
      return NextResponse.json({
        target: host, count: subdomains.length, subdomains: subdomains.slice(0, 500),
        source: 'crt.sh', timestamp: new Date().toISOString(),
      });
    }

    if (scanType === 'vuln') {
      // Quick scan + naive service tagging. CVE enrichment is a follow-up — for
      // now we surface open ports + service banners with severity = INFO so the
      // UI's vuln renderer has something honest to show.
      const open = await scanPorts(resolvedIp, TOP_25_PORTS, 1200);
      const flagged = open.filter(p => [21, 23, 135, 139, 445, 3389, 5900, 27017, 6379, 9200, 2375, 11211].includes(p.port));
      const vulns = flagged.map(p => ({
        id: `EXPOSED-${String(p.port).padStart(5, '0')}`,
        type: 'exposed-service',
        severity: [445, 3389, 27017, 6379, 2375, 9200, 11211].includes(p.port) ? 'HIGH' : 'MEDIUM',
        description: `Port ${p.port}/${p.service} is publicly reachable. ${p.banner ? `Banner: ${p.banner}` : 'Verify whether this service should be exposed to the public internet.'}`,
        cvss: undefined,
      }));
      return NextResponse.json({
        target: host, resolved_ip: resolvedIp, ports: open,
        vulnerabilities: vulns,
        total_cves: vulns.length,
        risk_level: vulns.some(v => v.severity === 'HIGH') ? 'HIGH' : vulns.length ? 'MEDIUM' : 'LOW',
        note: 'Findings derive from exposed-service heuristics only. Cross-check open ports against /api/osint/cve for known CVEs.',
        timestamp: new Date().toISOString(),
      });
    }

    return NextResponse.json({
      error: 'Unknown scan type',
      available: ['quick', 'deep', 'ports', 'ssl', 'headers', 'tech', 'subdomains', 'vuln'],
    }, { status: 400 });
  } catch (e: any) {
    return NextResponse.json({ error: 'Scan failed', detail: e?.message || String(e) }, { status: 500 });
  }
}
