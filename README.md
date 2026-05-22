<div align="center">

# ⬡ OSIRIS — Beginner OSINT Edition

### A simple, friendly OSINT toolkit + public CCTV browser

[![Next.js](https://img.shields.io/badge/Next.js-16-black?style=for-the-badge&logo=next.js)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://typescriptlang.org)
[![License](https://img.shields.io/badge/License-MIT-D4AF37?style=for-the-badge)](LICENSE)

**Look up DNS, WHOIS, certificates, IP reputation, open ports and CVEs — all from your browser. Plus a clean browser for 2,000+ public traffic and city cameras. No accounts, no installs, no API keys.**

Forked from [simplifaisoul/osiris](https://github.com/simplifaisoul/osiris) and trimmed to the **RECON toolkit + CCTV** with a beginner-friendly UI.

</div>

---

## Why this fork?

Upstream Osiris is a brilliant kitchen-sink situational-awareness dashboard — flights, satellites, fires, earthquakes, news, conflict zones, all rendered on a 3D globe. Powerful, but overwhelming if you just want to learn OSINT.

This fork keeps **two things** and makes them easy to use:

1. **The RECON toolkit** — DNS, WHOIS, certs, BGP, IP intel, threats, headers, SSL, subdomains, tech detect, port + vuln scans.
2. **Public CCTV** — 2,000+ traffic and city cameras you can watch live.

Everything else (flights, fires, news, weather, conflict, etc.) has been removed. The interface is three tabs — **Investigate · Cameras · Help** — with plain-language labels, a first-visit tour, an FAQ, and a glossary.

---

## Screens

- **Investigate** — pick a tool, type a domain or IP, read the result.
- **Cameras** — filter by country, search by city, click a card to watch live.
- **Help** — 60-second tour, tool reference, FAQ, glossary, safety note.

---

## Quick start

```bash
git clone https://github.com/lazykasi/osiris.git
cd osiris
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and follow the welcome tour.

No environment variables required. Everything works out of the box on public data sources.

---

## What's included

### RECON tools (Investigate tab)

| Tool         | What it does                                         |
|--------------|------------------------------------------------------|
| Port scan    | Knock on common server ports and report what's open  |
| Vuln scan    | Match open ports against known CVEs                  |
| DNS          | A, AAAA, MX, NS, TXT, CNAME records                  |
| WHOIS        | Domain/IP registration data                          |
| Certs        | Certificate Transparency log search                  |
| Threats      | IP / domain / hash reputation                        |
| Headers      | HTTP response headers                                |
| SSL/TLS      | Live certificate chain inspection                    |
| Subdomains   | Subdomain enumeration                                |
| Tech detect  | Web tech fingerprinting                              |
| IP sweep     | Range scanning with progress                         |

### CCTV (Cameras tab)

Public traffic, transit and city cameras from:

- Transport for London (UK)
- Washington State DOT (US-West)
- Caltrans (US-West)
- NYC DOT (US-East)
- VicRoads (Australia)
- Public networks in Bulgaria, Greece, Serbia, North Macedonia, Romania, Turkey

All feeds are already public — Osiris just lays them out in one place with a search/filter UI and a built-in viewer.

---

## What was removed from upstream

Real-time map layers (flights, fires, earthquakes, satellites, maritime, weather), live news streams, conflict-zone overlays, markets/space-weather panels, the 3D MapLibre globe, region dossiers and the upstream Palantir-alternative positioning. Also removed the giant `fork.diff` and `ito69_fork.diff` files. See the initial commit on the `beginner-osint-dashboard` branch for the exact deletion list.

---

## Tech stack

| Layer       | Technology                          |
|-------------|-------------------------------------|
| Framework   | Next.js 16 (App Router, Turbopack)  |
| Language    | TypeScript 5                        |
| Animations  | Framer Motion                       |
| Icons       | Lucide React                        |
| Streaming   | HLS.js (for HLS video cameras)      |
| Deployment  | Vercel-friendly (Edge runtime)      |

Dependencies dropped vs upstream: `maplibre-gl`, `react-map-gl`, `rss-parser`, `satellite.js`.

---

## Use responsibly

Looking up DNS, WHOIS, certificates and BGP is generally fine — that data is published. **Running port and vulnerability scans against systems you do not own or have written authorisation to test may be illegal where you live.** When in doubt, stop. The Help tab covers this in more detail.

---

## License

MIT, same as upstream — see [LICENSE](LICENSE).

Upstream credit: [simplifaisoul/osiris](https://github.com/simplifaisoul/osiris).
