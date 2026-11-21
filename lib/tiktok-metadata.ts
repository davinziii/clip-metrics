import { z } from 'zod';

const hosts = new Set(['www.tiktok.com', 'tiktok.com', 'm.tiktok.com', 'vm.tiktok.com', 'vt.tiktok.com']);
export function allowedTikTokUrl(input: string) {
  const url = new URL(input);
  if (url.protocol !== 'https:' || url.username || url.password || url.port || !hosts.has(url.hostname.toLowerCase())) throw new Error('Use an official HTTPS TikTok video or share link.');
  url.hash = '';
  return url;
}
export function fullTikTokUrl(input: string): string | null {
  const url = allowedTikTokUrl(input);
  const match = url.pathname.match(/^\/(@[^/]+)\/video\/(\d{10,25})\/?$/);
  return match ? `https://www.tiktok.com/${match[1]}/video/${match[2]}` : null;
}
export async function loadTikTokPage(input: string, request: typeof fetch = fetch) {
  let url = allowedTikTokUrl(input);
  const signal = AbortSignal.timeout(12000);
  for (let hops = 0; hops < 5; hops++) {
    const response = await request(url, { redirect: 'manual', cache: 'no-store', signal, headers: { Accept: 'text/html' } });
    if ([301,302,303,307,308].includes(response.status)) {
      await response.body?.cancel();
      const location = response.headers.get('location');
      if (!location) throw new Error('TikTok returned a redirect without a destination.');
      url = allowedTikTokUrl(new URL(location, url).href);
      continue;
    }
    if (!response.ok) throw new Error(`TikTok’s public page returned HTTP ${response.status}. Enter details manually or try again later.`);
    const resolved = fullTikTokUrl(url.href);
    if (!resolved) { await response.body?.cancel(); throw new Error('This link did not resolve to a public TikTok video. Try its full /@creator/video/… link.'); }
    if (!response.headers.get('content-type')?.includes('text/html')) { await response.body?.cancel(); throw new Error('TikTok did not return a public video page.'); }
    const reader = response.body?.getReader();
    if (!reader) throw new Error('TikTok returned an empty page.');
    const decoder = new TextDecoder(); let html = ''; let size = 0;
    try {
      while (true) { const { done, value } = await reader.read(); if (done) break; size += value.byteLength; if (size > 2 * 1024 * 1024) { await reader.cancel(); throw new Error('TikTok returned an unexpectedly large page.'); } html += decoder.decode(value, { stream: true }); }
      html += decoder.decode();
    } finally { reader.releaseLock(); }
    return { url: resolved, html };
  }
  throw new Error('TikTok redirected too many times. Try the full video link.');
}
const itemSchema = z.object({ id: z.string(), desc: z.string().optional(), createTime: z.union([z.number(), z.string()]).optional(), author: z.object({ uniqueId: z.string().optional(), nickname: z.string().optional() }).optional(), video: z.object({ cover: z.string().optional(), originCover: z.string().optional(), duration: z.number().finite().positive().optional() }).optional() });
const pageSchema = z.object({ __DEFAULT_SCOPE__: z.object({ 'webapp.video-detail': z.object({ statusCode: z.literal(0), itemInfo: z.object({ itemStruct: itemSchema }) }) }) });
export function parseTikTokPage(html: string, url: string) {
  const script = html.match(/<script\b[^>]*\bid=["']__UNIVERSAL_DATA_FOR_REHYDRATION__["'][^>]*>([\s\S]*?)<\/script>/i)?.[1];
  if (!script) throw new Error('TikTok did not include public video metadata. The video may be unavailable or the request may be restricted.');
  let payload: unknown; try { payload = JSON.parse(script); } catch { throw new Error('TikTok returned unreadable public video metadata.'); }
  const parsed = pageSchema.safeParse(payload);
  if (!parsed.success) throw new Error('TikTok did not expose this video’s public details. The video may be private, removed, or unavailable in this region.');
  const item = parsed.data.__DEFAULT_SCOPE__['webapp.video-detail'].itemInfo.itemStruct;
  if (item.id !== new URL(url).pathname.match(/\/video\/(\d+)/)?.[1]) throw new Error('TikTok returned metadata for a different video. No details were imported.');
  const thumbnail = [item.video?.cover, item.video?.originCover].find(value => { try { const u = new URL(value ?? ''); return u.protocol === 'https:' && !u.username && !u.password; } catch { return false; } }) ?? '';
  const published = Number(item.createTime);
  return { url, title: item.desc?.trim().slice(0,250) ?? '', creator: (item.author?.uniqueId || item.author?.nickname || '').slice(0,100), thumbnail, duration: item.video?.duration ?? null, publishedAt: Number.isFinite(published) && published > 0 && published < Date.now()/1000 ? new Date(published*1000).toISOString().slice(0,10) : '' };
}
