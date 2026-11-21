import { z } from 'zod';

export const platforms = ['TikTok', 'Instagram', 'YouTube'] as const;
export type Platform = typeof platforms[number];
export const number = new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 });
export const compact = (n: number) => number.format(n);
export const precise = (n: number) => n.toLocaleString('en', { maximumFractionDigits: 1 });
export function platformFor(url: string): Platform | null {
  try { const host = new URL(url).hostname.toLowerCase().replace(/^www\./, '');
    if (host === 'tiktok.com' || host.endsWith('.tiktok.com')) return 'TikTok';
    if (host === 'instagram.com' || host === 'm.instagram.com') return 'Instagram';
    if (['youtube.com', 'm.youtube.com', 'youtu.be'].includes(host)) return 'YouTube';
  } catch { /* validation handles malformed URLs */ }
  return null;
}
export function canonicalUrl(input: string) {
  const u = new URL(input); u.hash = ''; u.hostname = u.hostname.toLowerCase().replace(/^www\./, '');
  if (platformFor(input) === 'YouTube') {
    const id = u.hostname === 'youtu.be' ? u.pathname.split('/')[1] : u.searchParams.get('v') || u.pathname.match(/^\/(?:shorts|embed)\/([^/]+)/)?.[1];
    if (id) return `https://youtube.com/watch?v=${id}`;
  }
  u.search = '';
  return u.toString().replace(/\/$/, '');
}
const safeUrl = z.string().url().refine(value => value.startsWith('https://') || value.startsWith('http://'), 'Use an http or https URL.');
const timestamp = z.string().datetime({ offset: true });
export const metricRegistry = {
  watchTime: { label: 'Average watch time', short: 'Watch time', unit: 's', platforms, schema: z.number().finite().min(0), aggregate: 'mean', format: (v: number) => `${precise(v)}s` },
  fullWatch: { label: 'Watched full video', short: 'Completion', unit: '%', platforms, schema: z.number().finite().min(0).max(100), aggregate: 'mean', format: (v: number) => `${precise(v)}%` },
} as const;
export type MetricKey = keyof typeof metricRegistry;
export const snapshotSchema = z.object({ id: z.string().min(1), at: timestamp, views: z.number().int().min(0).max(Number.MAX_SAFE_INTEGER), source: z.enum(['manual', 'api']) });
export const videoSchema = z.object({
  id: z.string().min(1), url: safeUrl.refine(v => platformFor(v) !== null, 'Use a TikTok, Instagram, or YouTube URL.'), platform: z.enum(platforms),
  title: z.string().trim().min(1).max(250), creator: z.string().max(100).default(''), thumbnail: z.union([safeUrl, z.literal('')]).default(''),
  duration: z.number().finite().positive().nullable(), publishedAt: z.union([z.string().date(), z.literal('')]).default(''),
  nicheId: z.string().nullable(), metrics: z.object({ watchTime: metricRegistry.watchTime.schema, fullWatch: metricRegistry.fullWatch.schema }),
  snapshots: z.array(snapshotSchema), createdAt: timestamp, lastChecked: timestamp.nullable(),
});
export const dataSchema = z.object({ version: z.literal(1), videos: z.array(videoSchema), niches: z.array(z.object({ id: z.string().min(1), name: z.string().trim().min(1).max(60) })) }).superRefine((data, ctx) => {
  if (new Set(data.videos.map(v => canonicalUrl(v.url))).size !== data.videos.length) ctx.addIssue({ code: 'custom', message: 'Duplicate video URLs in backup.' });
  if (new Set(data.videos.map(v => v.id)).size !== data.videos.length || new Set(data.niches.map(n => n.id)).size !== data.niches.length) ctx.addIssue({ code: 'custom', message: 'Duplicate record IDs.' });
  if (new Set(data.niches.map(n => n.name.toLowerCase())).size !== data.niches.length) ctx.addIssue({ code: 'custom', message: 'Duplicate niche names.' });
  for (const v of data.videos) {
    if (platformFor(v.url) !== v.platform) ctx.addIssue({ code: 'custom', message: 'Video platform does not match URL.' });
    if (v.nicheId && !data.niches.some(n => n.id === v.nicheId)) ctx.addIssue({ code: 'custom', message: 'Video references a missing niche.' });
    if (v.snapshots.some(s => Date.parse(s.at) > Date.now() + 60000)) ctx.addIssue({ code: 'custom', message: 'Snapshots cannot be in the future.' });
    if (new Set(v.snapshots.map(s => s.id)).size !== v.snapshots.length) ctx.addIssue({ code: 'custom', message: 'Duplicate snapshot IDs.' });
  }
});
export type Video = z.infer<typeof videoSchema>;
export type Snapshot = z.infer<typeof snapshotSchema>;
export type Data = z.infer<typeof dataSchema>;
export const emptyData: Data = { version: 1, videos: [], niches: [] };
export const STORAGE_KEY = 'clipmetrics:data';
export const sortedSnapshots = (v: Video) => [...v.snapshots].sort((a, b) => Date.parse(a.at) - Date.parse(b.at));
export const views = (v: Video) => sortedSnapshots(v).at(-1)?.views ?? 0;
export const mean = (values: number[]) => values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0;
export const watchPercent = (v: Video) => v.duration ? v.metrics.watchTime / v.duration * 100 : null;
export function growth(v: Video) { const ss = sortedSnapshots(v); return ss.length > 1 ? ss[ss.length - 1].views - ss[0].views : null; }
export function portfolioTimeline(videos: Video[]) {
  const events = videos.flatMap(v => v.snapshots.map(s => ({ ...s, videoId: v.id, title: v.title }))).sort((a,b) => Date.parse(a.at) - Date.parse(b.at));
  const latest = new Map<string, number>();
  return events.map(e => { latest.set(e.videoId, e.views); return { at: e.at, value: [...latest.values()].reduce((sum,n) => sum+n,0), source: `${e.title} · ${e.source} · ${new Date(e.at).toLocaleString()}` }; });
}
export function parseData(value: unknown): Data {
  if (!value || typeof value !== 'object') throw new Error('This is not a ClipMetrics backup.');
  const version = (value as { version?: unknown }).version;
  // Explicit migration entry point. Never guess at or overwrite newer schemas.
  if (version !== 1) throw new Error('Unsupported backup version. Your existing data has been kept.');
  return dataSchema.parse(value);
}
export function addSnapshot(video: Video, snapshot: Snapshot): Video {
  const parsed = snapshotSchema.parse(snapshot);
  if (Date.parse(parsed.at) > Date.now() + 60000) throw new Error('Choose a time in the past or present.');
  if (video.snapshots.some(s => s.at === parsed.at)) throw new Error('A snapshot already exists at that time.');
  if (parsed.source === 'api' && views(video) === parsed.views && video.snapshots.length) return { ...video, lastChecked: parsed.at };
  return { ...video, snapshots: [...video.snapshots, parsed] };
}
