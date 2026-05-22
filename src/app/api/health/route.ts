import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    status: 'operational',
    platform: 'RudraOSINT',
    version: '0.3.0',
    uptime: process.uptime ? Math.round(process.uptime()) : 0,
    timestamp: new Date().toISOString(),
    endpoints: [
      '/api/cctv',
      '/api/scanner',
      '/api/osint/dns',
      '/api/osint/whois',
      '/api/osint/ip',
      '/api/osint/certs',
      '/api/osint/cve',
      '/api/osint/bgp',
      '/api/osint/threats',
      '/api/osint/sweep',
    ],
  });
}
