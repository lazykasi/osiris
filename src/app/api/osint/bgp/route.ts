import { NextResponse } from 'next/server';
import { isRateLimited, getClientIp } from '@/lib/ssrf-guard';

/**
 * BGP/ASN lookup via RIPEstat (free, no key, reliable).
 * Accepts: IP, AS number (with or without "AS" prefix), or prefix.
 */
const RIPESTAT = 'https://stat.ripe.net/data';

async function ripe(endpoint: string, resource: string, timeoutMs = 8000) {
  const url = `${RIPESTAT}/${endpoint}/data.json?resource=${encodeURIComponent(resource)}&sourceapp=rudraosint`;
  const res = await fetch(url, { signal: AbortSignal.timeout(timeoutMs), headers: { Accept: 'application/json' } });
  if (!res.ok) throw new Error(`RIPEstat ${endpoint} returned ${res.status}`);
  const json = await res.json();
  if (json.status !== 'ok' && json.status_code !== 200 && json.data == null) {
    throw new Error(`RIPEstat ${endpoint} status ${json.status || 'unknown'}`);
  }
  return json.data;
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const query = (searchParams.get('query') || searchParams.get('asn') || searchParams.get('ip') || '').trim();
  if (!query) {
    return NextResponse.json({ error: 'Missing query parameter (IP, ASN, or prefix)' }, { status: 400 });
  }

  const clientIp = getClientIp(req);
  if (isRateLimited(clientIp, 20, 60_000)) {
    return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
  }

  const isIPv4 = /^(\d{1,3}\.){3}\d{1,3}$/.test(query);
  const isPrefix = /^(\d{1,3}\.){3}\d{1,3}\/\d{1,2}$/.test(query) || /:.+\/\d+$/.test(query);
  const isASN = /^(AS)?\d+$/i.test(query);
  const asnNumber = isASN ? query.replace(/^AS/i, '') : null;
  const ripeResource = asnNumber ? `AS${asnNumber}` : query;

  const results: any = { query, timestamp: new Date().toISOString() };

  try {
    if (isIPv4 || isPrefix) {
      results.type = isPrefix ? 'prefix' : 'ip';
      const [netInfo, prefixOverview, whois] = await Promise.allSettled([
        ripe('network-info', query),
        ripe('prefix-overview', query),
        ripe('whois', query),
      ]);
      if (netInfo.status === 'fulfilled') {
        results.ip = {
          prefix: netInfo.value.prefix,
          asns: (netInfo.value.asns || []).map((a: any) => ({ asn: a })),
        };
      }
      if (prefixOverview.status === 'fulfilled') {
        const d = prefixOverview.value;
        results.prefix_info = {
          prefix: d.resource,
          block: d.block,
          announced: d.announced,
          asns: (d.asns || []).map((a: any) => ({ asn: a.asn, holder: a.holder })),
        };
        if (results.ip && d.asns?.length) {
          results.ip.asns = d.asns.map((a: any) => ({ asn: a.asn, name: a.holder }));
        }
      }
      if (whois.status === 'fulfilled') {
        results.whois_authority = whois.value.authorities?.[0];
        results.country_code = whois.value.records?.[0]?.find((r: any) => /country/i.test(r.key))?.value;
      }
    } else if (asnNumber) {
      results.type = 'asn';
      const [overview, prefixes, neighbours] = await Promise.allSettled([
        ripe('as-overview', `AS${asnNumber}`),
        ripe('announced-prefixes', `AS${asnNumber}`),
        ripe('asn-neighbours', `AS${asnNumber}`),
      ]);
      if (overview.status === 'fulfilled') {
        const d = overview.value;
        results.asn = {
          asn: asnNumber,
          name: d.holder,
          description_short: d.holder,
          country_code: d.resource?.split('-')?.[0]?.match(/[A-Z]{2}/)?.[0],
          announced: d.announced,
          type: d.type,
          block: d.block,
        };
      }
      if (prefixes.status === 'fulfilled') {
        const list = (prefixes.value.prefixes || []).map((p: any) => ({
          prefix: p.prefix,
          name: p.timelines?.[0]?.starttime ? `seen ${p.timelines[0].starttime.slice(0, 10)}` : undefined,
        }));
        results.prefixes = list.slice(0, 200);
        results.prefixes_total = list.length;
      }
      if (neighbours.status === 'fulfilled') {
        const list = neighbours.value.neighbours || [];
        results.peers = list.slice(0, 50).map((n: any) => ({ asn: n.asn, type: n.type, power: n.power }));
        results.peers_total = list.length;
      }
    } else {
      return NextResponse.json({ error: 'Unrecognized query format. Use IP address, ASN (e.g. AS15169) or prefix.' }, { status: 400 });
    }

    return NextResponse.json(results);
  } catch (e: any) {
    return NextResponse.json({ error: 'BGP lookup failed', detail: e?.message || String(e) }, { status: 502 });
  }
}
