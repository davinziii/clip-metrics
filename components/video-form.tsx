'use client';
import { useEffect, useState } from 'react';
import { Link2, LoaderCircle, Plus, Check, Info } from 'lucide-react';
import Dialog from './dialog';
import { Data, Video, platformFor, platforms, videoSchema, canonicalUrl, metricRegistry } from '@/lib/domain';
import { readVideoDraft, writeVideoDraft, clearVideoDraft, readRememberedNiche, rememberNiche } from '@/lib/video-draft';

export default function VideoForm({ data, video, onSave, onClose, onNiche }: { data: Data; video?: Video; onSave: (v: Video) => boolean; onClose: () => void; onNiche: () => void }) {
  const [initialDraft] = useState(() => video ? null : readVideoDraft());
  const [url, setUrl] = useState(video?.url ?? initialDraft?.url ?? '');
  const [title, setTitle] = useState(video?.title ?? initialDraft?.title ?? '');
  const [creator, setCreator] = useState(video?.creator ?? initialDraft?.creator ?? '');
  const [thumbnail, setThumbnail] = useState(video?.thumbnail ?? initialDraft?.thumbnail ?? '');
  const [duration, setDuration] = useState(video?.duration?.toString() ?? initialDraft?.duration ?? '');
  const [publishedAt, setPublishedAt] = useState(video?.publishedAt ?? initialDraft?.publishedAt ?? '');
  const [currentViews, setCurrentViews] = useState(initialDraft?.views ?? '');
  const [watchTime, setWatchTime] = useState(video?.metrics.watchTime.toString() ?? initialDraft?.watchTime ?? '');
  const [fullWatch, setFullWatch] = useState(video?.metrics.fullWatch.toString() ?? initialDraft?.fullWatch ?? '');
  const [nicheId, setNicheId] = useState(() => video ? video.nicheId ?? '' : initialDraft?.nicheId ?? readRememberedNiche());
  const [imageFailed, setImageFailed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const platform = platformFor(url);
  useEffect(() => {
    if (!video) writeVideoDraft({ version: 1, url, title, creator, thumbnail, duration, publishedAt, views: currentViews, watchTime, fullWatch, nicheId });
  }, [video, url, title, creator, thumbnail, duration, publishedAt, currentViews, watchTime, fullWatch, nicheId]);
  async function fetchMetadata() {
    if (!platform) { setError('Paste a valid TikTok, Instagram, or YouTube URL first.'); return; }
    setBusy(true); setError('');
    try {
      const response = await fetch('/api/metadata', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ url }) });
      const result = await response.json();
      if (result.title) setTitle(result.title);
      if (result.creator) setCreator(result.creator);
      if (result.thumbnail) { setThumbnail(result.thumbnail); setImageFailed(false); }
      if (result.url) setUrl(result.url);
      if (typeof result.duration === 'number') setDuration(String(result.duration));
      if (result.publishedAt) setPublishedAt(result.publishedAt);
      setMessage(result.message ?? 'Enter the remaining details manually.');
    } catch { setMessage('Could not fetch details. Manual entry is available below.'); }
    finally { setBusy(false); }
  }
  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError('');
    const f = new FormData(event.currentTarget);
    try {
      if (!platform) throw new Error('Choose a URL from a supported platform.');
      if (data.videos.some(v => v.id !== video?.id && canonicalUrl(v.url) === canonicalUrl(url))) throw new Error('This video is already in your library.');
      const now = new Date().toISOString();
      const initialViews = f.get('views');
      const candidate = videoSchema.parse({ id: video?.id ?? crypto.randomUUID(), url: url.trim(), platform, title, creator, thumbnail, duration: f.get('duration') ? Number(f.get('duration')) : null, publishedAt: f.get('publishedAt') ?? '', nicheId: f.get('niche') || null, metrics: Object.fromEntries(Object.keys(metricRegistry).map(key => [key, Number(f.get(key))])), snapshots: video?.snapshots ?? (initialViews !== '' && initialViews !== null ? [{ id: crypto.randomUUID(), views: Number(initialViews), at: now, source: 'manual' }] : []), createdAt: video?.createdAt ?? now, lastChecked: video?.lastChecked ?? null });
      if (onSave(candidate) && !video) { rememberNiche(candidate.nicheId ?? ''); clearVideoDraft(); }
    } catch (e) { setError(e instanceof Error ? (e.message.startsWith('[') ? 'Check your URL and numeric values. Watch time must be positive or zero and completion must be between 0 and 100%.' : e.message) : 'Please check the form.'); }
  }
  return <Dialog title={video ? 'Edit video details' : 'Let’s track something great.'} subtitle={video ? 'Update your details and recorded retention metrics.' : 'Bring your next TikTok, Reel, or Short into focus.'} onClose={onClose}><form onSubmit={submit} className="video-form">
    <div className="form-field"><label htmlFor="video-url">Video link</label><div className="input-action"><Link2 size={17} /><input id="video-url" autoFocus type="url" required value={url} onChange={e => setUrl(e.target.value)} placeholder="https://www.tiktok.com/@creator/video/…" /><button type="button" onClick={fetchMetadata} disabled={busy}>{busy ? <LoaderCircle className="spin" size={16} /> : 'Fetch details'}</button></div></div>
    <div className="platform-options">{platforms.map(p => <span className={p === platform ? 'detected' : ''} key={p}>{p === platform && <Check size={13} />}{p === 'YouTube' ? 'YouTube Shorts' : p === 'Instagram' ? 'Instagram Reels' : p}</span>)}</div>
    {message && <p className="form-note"><Info size={16} />{message}</p>}
    <label>Title<input required maxLength={250} value={title} onChange={e => setTitle(e.target.value)} placeholder="Give this video a name" /></label>
    <div className="form-grid"><label>Creator <span className="optional">optional</span><input value={creator} maxLength={100} onChange={e => setCreator(e.target.value)} placeholder="@creator" /></label><label>Published date <span className="optional">optional</span><input type="date" name="publishedAt" value={publishedAt} onChange={e => setPublishedAt(e.target.value)} /></label></div>
    <div className="form-grid"><label>Duration, seconds <span className="optional">optional</span><input type="number" name="duration" min="0.01" step="any" value={duration} onChange={e => setDuration(e.target.value)} placeholder="e.g. 30" /></label>{!video && <label>Current views <span className="optional">optional</span><input type="number" name="views" min="0" step="1" value={currentViews} onChange={e => setCurrentViews(e.target.value)} placeholder="Enter a measured count" /></label>}</div>
    <label>Thumbnail URL <span className="optional">optional · fetched automatically when available</span><input type="url" value={thumbnail} onChange={e => { setThumbnail(e.target.value); setImageFailed(false); }} placeholder="https://…" /></label>
    {thumbnail && <div className="thumbnail-preview">{imageFailed ? <p className="form-note"><Info size={16} />The image could not load. Its link may have expired or the host may restrict access. Fetch details again or paste another image URL.</p> : <><img src={thumbnail} alt="Fetched video cover preview" referrerPolicy="no-referrer" onError={() => setImageFailed(true)} /><span>Video cover preview</span></>}</div>}
    <div className="form-divider"><span>RETENTION METRICS</span><span>From your platform analytics</span></div>
    <div className="form-grid">{Object.entries(metricRegistry).map(([key, def]) => <label key={key}>{def.label} ({def.unit})<input required type="number" name={key} min="0" max={key === 'fullWatch' ? 100 : undefined} step="any" value={key === 'watchTime' ? watchTime : fullWatch} onChange={e => key === 'watchTime' ? setWatchTime(e.target.value) : setFullWatch(e.target.value)} placeholder={key === 'watchTime' ? 'e.g. 18.5' : 'e.g. 42.8'} /></label>)}</div>
    <div className="form-field"><div className="split"><label htmlFor="video-niche">Niche</label><button className="text-button" type="button" onClick={onNiche}><Plus size={14} /> Add niche</button></div><select id="video-niche" name="niche" value={data.niches.some(n => n.id === nicheId) ? nicheId : ''} onChange={e => { setNicheId(e.target.value); if (!video) rememberNiche(e.target.value); }}><option value="">Unassigned</option>{data.niches.map(n => <option key={n.id} value={n.id}>{n.name}</option>)}</select></div>
    {!video && <p className="muted small">Your draft is kept when you close this form. After saving, the other fields clear and your last niche stays selected for the next video.</p>}
    <p className="muted small">Views are recorded as timestamped snapshots. Retention comes from your manual entries. Rewatches may make average watch percentage exceed 100%.</p>
    {error && <p role="alert" className="error">{error}</p>}
    <div className="dialog-footer"><button type="button" className="button secondary" onClick={onClose}>Cancel</button><button className="button primary" type="submit" disabled={busy}><Check size={16} />{video ? 'Save changes' : 'Save video'}</button></div>
  </form></Dialog>;
}
