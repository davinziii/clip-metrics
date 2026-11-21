'use client';
import { platforms, type Data } from '@/lib/domain';
import { videoLengthCategories } from '@/lib/video-length';

export default function VideoFilters({ niches, platform, niche, onPlatform, onNiche, light = false, length }: { niches: Data['niches']; platform: string; niche: string; onPlatform: (platform: string) => void; onNiche: (niche: string) => void; light?: boolean; length?: { value: string; onChange: (value: string) => void } }) {
  return <div className={`video-filters ${light ? 'on-paper' : ''}`}>
    <div className="video-platform-tabs" role="group" aria-label="Video platforms">{['all', ...platforms].map(p => <button type="button" key={p} aria-pressed={platform === p} className={platform === p ? 'selected' : ''} onClick={() => onPlatform(p)}>{p === 'all' ? 'All videos' : p}</button>)}</div>
    <select className="video-niche-select" aria-label="Filter videos by niche" value={niche} onChange={e => onNiche(e.target.value)}><option value="all">All niches</option><option value="unassigned">Unassigned</option>{niches.map(n => <option key={n.id} value={n.id}>{n.name}</option>)}</select>
    {length && <select className="video-length-select" aria-label="Filter videos by length" title="Categories use lower-inclusive, upper-exclusive ranges: 15s starts 15–30s, 30s starts 30–60s, and 60s starts 60s+." value={length.value} onChange={e => length.onChange(e.target.value)}><option value="all">All lengths</option>{videoLengthCategories.map(c => <option value={c.id} key={c.id}>{c.label}</option>)}<option value="unknown">Length unknown</option></select>}
  </div>;
}
