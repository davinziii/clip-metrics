import { NextRequest, NextResponse } from 'next/server';
import { platformFor } from '@/lib/domain';

export async function POST(request: NextRequest) {
  try {
    const { url } = await request.json();
    if (typeof url !== 'string' || url.length > 2048 || !/^https?:\/\//.test(url)) return NextResponse.json({ message: 'Enter a supported video URL.' }, { status: 400 });
    const platform = platformFor(url);
    if (!platform) return NextResponse.json({ message: 'Unsupported platform.' }, { status: 400 });
    const key = process.env.YOUTUBE_API_KEY;
    if (platform !== 'YouTube' || !key) return NextResponse.json({ message: platform === 'YouTube' ? 'Automatic YouTube view refresh requires a server-side YOUTUBE_API_KEY. You can record a measured snapshot manually.' : `${platform} public view counts are unavailable without authorized platform access. Record a measured snapshot manually.` });
    const u = new URL(url);
    const id = u.hostname.replace(/^www\./,'') === 'youtu.be' ? u.pathname.split('/')[1] : u.searchParams.get('v') || u.pathname.match(/^\/(?:shorts|embed)\/([^/]+)/)?.[1];
    if (!id || !/^[a-zA-Z0-9_-]{11}$/.test(id)) return NextResponse.json({ message: 'Could not identify this YouTube video. Record a manual snapshot.' });
    const response = await fetch(`https://www.googleapis.com/youtube/v3/videos?part=statistics&id=${id}&key=${encodeURIComponent(key)}`, { signal: AbortSignal.timeout(8000), cache: 'no-store' });
    if (!response.ok) return NextResponse.json({ message: 'YouTube did not return a reliable view count. Check API access or record a manual snapshot.' });
    const result = await response.json();
    const raw = result.items?.[0]?.statistics?.viewCount;
    if (typeof raw !== 'string' || !/^\d+$/.test(raw) || !Number.isSafeInteger(Number(raw))) return NextResponse.json({ message: 'No reliable public view count was returned. Use a manual snapshot.' });
    return NextResponse.json({ views: Number(raw) });
  } catch { return NextResponse.json({ message: 'The view refresh could not be completed. Your previous records are unchanged.' }); }
}
