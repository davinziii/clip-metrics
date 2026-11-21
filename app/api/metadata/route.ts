import { NextRequest, NextResponse } from 'next/server';
import { platformFor } from '@/lib/domain';
import { fullTikTokUrl, loadTikTokPage, parseTikTokPage } from '@/lib/tiktok-metadata';

export async function POST(request: NextRequest) {
  let input: unknown;
  try { input = await request.json(); } catch { return NextResponse.json({ message: 'Send a valid video URL.' }, { status: 400 }); }
  const url = input && typeof input === 'object' && 'url' in input ? input.url : null;
  if (typeof url !== 'string' || url.length > 2048 || !/^https?:\/\//.test(url)) return NextResponse.json({ message: 'Enter a valid video URL.' }, { status: 400 });
  const platform = platformFor(url);
  if (!platform) return NextResponse.json({ message: 'Use a TikTok, Instagram Reels, or YouTube Shorts URL.' }, { status: 400 });
  if (platform === 'Instagram') return NextResponse.json({ message: 'Instagram metadata requires authenticated API access. Enter the details manually; you can still save this video.' });
  try {
    let resolved = url; let page: Awaited<ReturnType<typeof loadTikTokPage>> | undefined;
    if (platform === 'TikTok') {
      const full = fullTikTokUrl(url);
      if (full) resolved = full;
      else { page = await loadTikTokPage(url); resolved = page.url; }
    }
    const endpoint = platform === 'TikTok' ? 'https://www.tiktok.com/oembed' : 'https://www.youtube.com/oembed';
    let title = '', creator = '', thumbnail = '', providerMessage = '';
    try {
      const response = await fetch(`${endpoint}?url=${encodeURIComponent(resolved)}&format=json`, { signal: AbortSignal.timeout(8000), redirect: 'error', cache: 'no-store' });
      if (response.ok) {
        const raw = await response.json();
        title = typeof raw.title === 'string' ? raw.title.trim().slice(0,250) : '';
        creator = typeof raw.author_name === 'string' ? raw.author_name.slice(0,100) : '';
        thumbnail = typeof raw.thumbnail_url === 'string' && raw.thumbnail_url.startsWith('https://') ? raw.thumbnail_url : '';
      } else providerMessage = `The public metadata endpoint returned HTTP ${response.status}.`;
    } catch { providerMessage = 'The public metadata endpoint could not be reached.'; }
    if (platform === 'TikTok' && (!title || !thumbnail)) {
      try {
        const fallback = parseTikTokPage((page ?? await loadTikTokPage(resolved)).html, resolved);
        return NextResponse.json({ ...fallback, title: fallback.title || title, creator: fallback.creator || creator, thumbnail: fallback.thumbnail || thumbnail, source: 'public-page', message: fallback.thumbnail ? 'Retrieved available details and cover image from TikTok’s public video page. Cover links can expire; fetch again if the image stops loading. Enter retention metrics below.' : 'Retrieved available public details, but TikTok did not provide a usable cover image. You can paste a thumbnail URL manually.' });
      } catch (error) {
        providerMessage = error instanceof Error ? error.message : 'TikTok public-page metadata is unavailable.';
      }
    }
    const available = Boolean(title || creator || thumbnail);
    return NextResponse.json({ url: resolved, title, creator, thumbnail, source: available ? 'oembed' : null, message: available ? `Retrieved available public details.${!thumbnail ? ' The provider did not include a thumbnail; you can add one manually.' : ''} Enter your metrics below.` : `${providerMessage || 'The provider returned an embed, but no title, creator, or thumbnail.'} Enter details manually or try again later.` });
  } catch (error) {
    return NextResponse.json({ message: error instanceof Error && error.name !== 'TimeoutError' ? error.message : 'TikTok took too long to respond. Try again or enter details manually.' });
  }
}
