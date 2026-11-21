'use client';
import type { ReactNode } from 'react';
import { ExternalLink, X } from 'lucide-react';
import { type Video, type MetricKey, metricRegistry, precise, views, watchPercent } from '@/lib/domain';

export default function ComparisonCards({ videos, nicheName, thumbnail, onRemove }: { videos: Video[]; nicheName: (video: Video) => string; thumbnail: (video: Video) => ReactNode; onRemove: (id: string) => void }) {
  const highest = Object.fromEntries(Object.keys(metricRegistry).map(key => [key, Math.max(...videos.map(v => v.metrics[key as MetricKey]))])) as Record<MetricKey, number>;
  const highestWatchPercent = Math.max(...videos.map(v => watchPercent(v) ?? -1));
  return <div className="comparison-grid compact-comparisons">{videos.map(v => {
    const metrics = [
      { label: 'Duration', value: v.duration === null ? '—' : `${precise(v.duration)}s`, percentage: null, highest: false },
      { label: 'Views', value: v.snapshots.length ? precise(views(v)) : '—', percentage: null, highest: false },
      ...Object.entries(metricRegistry).map(([key, def]) => ({ label: def.label, value: def.format(v.metrics[key as MetricKey]), percentage: key === 'watchTime' ? watchPercent(v) : null, highest: v.metrics[key as MetricKey] === highest[key as MetricKey] })),
      { label: 'Watch / duration', value: watchPercent(v) === null ? '—' : `${precise(watchPercent(v)!)}%`, percentage: null, highest: watchPercent(v) !== null && watchPercent(v) === highestWatchPercent },
    ];
    return <article className="comparison-card compact-comparison-card" key={v.id} aria-label={`Comparison for ${v.title}`}>
      <header className="comparison-card-header">{thumbnail(v)}<div className="comparison-card-identity"><span className="badge">{nicheName(v)}</span><h3>{v.title}</h3><p>{v.platform}{v.creator ? ` · ${v.creator}` : ''}</p></div><button type="button" className="comparison-remove" aria-label={`Remove ${v.title} from comparison card`} onClick={() => onRemove(v.id)}><X size={15} /></button></header>
      <dl className="comparison-metrics-grid">{metrics.map(m => <div className={`comparison-compact-metric ${m.highest ? 'is-highest' : ''}`} key={m.label}><dt>{m.label}</dt><dd><span>{m.value}</span>{m.percentage !== null && <span className="awt-percentage" title="Average watch time divided by video duration">= {precise(m.percentage)}%</span>}{m.highest && <span className="highest-metric-label">Highest</span>}</dd></div>)}</dl>
      <footer className="comparison-card-footer"><span>{v.publishedAt ? `Published ${v.publishedAt}` : 'Publish date unknown'}</span><a href={v.url} target="_blank" rel="noreferrer" aria-label={`Open original video: ${v.title}`} title="Open original video"><ExternalLink size={14} /></a></footer>
    </article>;
  })}</div>;
}
