<div align="center">

# ⬡ RudraOSINT

### A simple, friendly OSINT toolkit + public CCTV browser

[![Next.js](https://img.shields.io/badge/Next.js-16-black?style=for-the-badge&logo=next.js)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://typescriptlang.org)
[![License](https://img.shields.io/badge/License-MIT-D4AF37?style=for-the-badge)](LICENSE)

**Look up DNS, WHOIS, certificates, IP reputation, BGP/ASN, open ports, CVEs and tech stacks — all from your browser. Plus a clean browser for 2,000+ public traffic and city cameras. No accounts, no installs, no API keys.**

Forked from [simplifaisoul/osiris](https://github.com/simplifaisoul/osiris) and trimmed to the **OSINT investigation toolkit + CCTV** with a beginner-friendly UI.

</div>

---

## Why this fork?

Upstream Osiris is a brilliant kitchen-sink situational-awareness dashboard — flights, satellites, fires, earthquakes, news, conflict zones, all rendered on a 3D globe. Powerful, but overwhelming if you just want to learn OSINT.

**RudraOSINT** keeps **two things** and makes them easy to use:

1. **The recon toolkit** — DNS, WHOIS, certs, BGP, IP intel, threats, headers, SSL, subdomains, tech detect, port + vuln scans, IP sweep.
2. **Public CCTV** — 2,000+ traffic and city cameras you can watch live.

Everything else (flights, fires, news, weather, conflict, etc.) has been removed. The interface is three tabs — **Investigate · Cameras · Help** — with plain-language labels, a first-visit tour, an FAQ, and a glossary.

---

## Quick start

```bash
git clone https://github.com/lazykasi/osiris.git rudraosint
cd rudraosint
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and follow the welcome tour.

No environment variables required. Every tool runs against free public data sources.

---

## What's included

### Investigate tab — 13 tools

| Tool         | Backend                                | What it does                                              |
|--------------|----------------------------------------|-----------------------------------------------------------|
| Port scan    | local TCP-connect (Node `net`)         | Knocks on the top 25/100 server ports                     |
| Vuln scan    | local TCP + exposed-service heuristics | Open ports + risk tagging + CVE follow-ups                |
| DNS          | Cloudflare DoH                         | A, AAAA, MX, NS, TXT, CNAME, SOA records                  |
| WHOIS        | IANA RDAP                              | Domain/IP registration data                               |
| Certs        | crt.sh certificate transparency        | Every TLS cert ever issued for a domain                   |
| Threats      | AlienVault OTX, Tor exit list          | IP / domain / hash reputation                             |
| Headers      | local `safeFetch`                      | HTTP response headers + status                            |
| SSL/TLS      | local `node:tls`                       | Live peer-certificate inspection                          |
| Subdomains   | crt.sh CT log                          | Subdomain enumeration                                     |
| Tech detect  | local fetch + signature match          | Framework / CMS / CDN fingerprinting                      |
| IP intel    | ip-api.com                             | Geo, ISP, ASN                                             |
| BGP/ASN      | bgpview.io                             | Prefixes, peers, ASN details                              |
| IP sweep     | local TCP probe                        | Scan a /24-/28 with progress + device classification      |

### Cameras tab

Public traffic, transit and city cameras from:

- Transport for London (UK) — ~900 JamCams
- Washington State DOT (US-West)
- Caltrans (US-West) & NYC DOT (US-East)
- VicRoads (Australia)
- Public networks in Bulgaria, Greece, Serbia, North Macedonia, Romania, Turkey

All feeds are already public — RudraOSINT just lays them out in one place with a search/filter UI and a built-in viewer (HLS + JPG snapshot + iframe support).

### Help tab

- 60-second guided tour modal (first-visit auto-pop, persisted dismissal)
- Plain-English tool reference
- FAQ + glossary
- Safety note on responsible use

---

## What was removed from upstream

Real-time map layers (flights, fires, earthquakes, satellites, maritime, weather), live news streams, conflict-zone overlays, markets/space-weather panels, the 3D MapLibre globe, region dossiers and the upstream "Palantir-alternative" positioning. Also removed the giant `fork.diff` / `ito69_fork.diff` files. See the initial commit on the `beginner-osint-dashboard` branch for the exact deletion list.

---

## What changed in the backend (and why)

The upstream Osiris isn't fully runnable out of the box — three things break for any new clone:

1. **Scanner backend was a proxy to a private service.** `src/app/api/scanner/route.ts` upstream expected `SCANNER_URL`/`SCANNER_KEY` env vars pointing to a separate nmap/nikto service on port 7700 that isn't published anywhere. The hosted demo at osirisai.live runs it on private infra. Locally, the six RECON tools (Port Scan, Vuln, Headers, SSL, Subdomains, Tech Detect) all returned `503 Scanner not configured`.

    **RudraOSINT replaces the proxy with a self-hosted implementation** in `src/app/api/scanner/route.ts`:
   - Port / quick / deep scans use `node:net` TCP-connect with concurrency capping
   - SSL/TLS inspection uses `node:tls` peer-certificate inspection
   - Headers, tech detect run via `safeFetch` with header + HTML signature matching
   - Subdomain enumeration hits crt.sh directly
   - Vuln scan layers exposed-service heuristics over the quick scan

    Trade-off vs upstream: no OS detection, no service-version detection (no nmap `-sV`). Gain: zero config, no Docker sidecar, works on Vercel.

2. **BGP/ASN upstream used `bgpview.io`, which is defunct.** Its DNS no longer resolves (NXDOMAIN from `8.8.8.8`). RudraOSINT uses **RIPEstat** instead — same data, more reliable, also free / no key.

3. **`crt.sh` is genuinely flaky.** Upstream had a 10s timeout that often fired before crt.sh responded. RudraOSINT bumps the timeout to 25s and races crt.sh against **CertSpotter** — whichever returns first wins, so certs work even during crt.sh outages.

The other recon endpoints (`/api/osint/dns`, `/whois`, `/ip`, `/cve`, `/threats`, `/sweep`) are upstream code unchanged.

---

## Tech stack

| Layer       | Technology                          |
|-------------|-------------------------------------|
| Framework   | Next.js 16 (App Router, Turbopack)  |
| Language    | TypeScript 5                        |
| Animations  | Framer Motion                       |
| Icons       | Lucide React                        |
| Streaming   | HLS.js (for live HLS video cameras) |
| Deployment  | Vercel-friendly                     |

Dependencies dropped vs upstream: `maplibre-gl`, `react-map-gl`, `rss-parser`, `satellite.js`.

---

## Architecture

```
┌───────────────────────────────────────────────────┐
│                RUDRAOSINT FRONTEND                 │
│  Header  →  Tabs (Investigate / Cameras / Help)   │
│             │           │             │           │
│             ▼           ▼             ▼           │
│        OsintPanel   CamerasView    HelpView       │
└──────────────┬─────────────────┬──────────────────┘
               │                 │
┌──────────────▼─────────────────▼──────────────────┐
│              NEXT.JS API ROUTES                    │
│  /api/osint/{dns,whois,ip,certs,cve,bgp,           │
│              threats,sweep}                        │
│  /api/scanner    (local TCP + tls + crt.sh)        │
│  /api/cctv       (regional public feeds)           │
│  /api/health                                       │
└────────────────────────┬──────────────────────────┘
                         │
┌────────────────────────▼──────────────────────────┐
│       PUBLIC DATA SOURCES (no API keys)            │
│  Cloudflare DoH · IANA RDAP · crt.sh · OTX ·       │
│  ip-api.com · bgpview.io · TfL · WSDOT · Caltrans  │
└────────────────────────────────────────────────────┘
```

`/api/scanner` is self-hosted: TCP connects via `node:net`, TLS peer cert via `node:tls`, subdomain enum via crt.sh — no external scanner service required.

All `/api/*` routes are gated by:
- SSRF-safe target validation (`src/lib/ssrf-guard.ts`)
- Per-IP rate limiting (default 10–20/min depending on route)

---

## Use responsibly

Looking up DNS, WHOIS, certificates, BGP and crt.sh is generally fine — that data is published. **Running port and vulnerability scans against systems you do not own or have written authorisation to test may be illegal where you live.** When in doubt, stop. The Help tab covers this in more detail.

---

## License

MIT, same as upstream — see [LICENSE](LICENSE).

Upstream credit: [simplifaisoul/osiris](https://github.com/simplifaisoul/osiris).
