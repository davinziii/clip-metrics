'use client';
import { useState } from 'react';
import { Sparkles, Info, Check } from 'lucide-react';
import { type Video } from '@/lib/domain';
import { summarizeVideos, type Summary } from '@/lib/summary';

export default function CompareSummary({ videos }: { videos: Video[] }) {
  const [question, setQuestion] = useState('');
  const [result, setResult] = useState<{ summary: Summary; question: string; signature: string } | null>(null);
  const signature = JSON.stringify(videos.map(v => ({ id: v.id, metrics: v.metrics, snapshots: v.snapshots, duration: v.duration, publishedAt: v.publishedAt, title: v.title })));
  const current = result?.signature === signature ? result : null;
  return <div className="summary-box"><div className="summary-title"><span className="summary-icon"><Sparkles size={20} /></span><div><h3>Connect the dots.</h3><p>A useful read on your selected videos, grounded in your records.</p></div><span className="badge">{videos.length} VIDEOS</span></div><form onSubmit={e => { e.preventDefault(); setResult({ summary: summarizeVideos(videos, question), question: question.trim(), signature }); }}><label htmlFor="summary-question">Have a question? <span>optional</span></label><textarea id="summary-question" rows={3} maxLength={1200} value={question} onChange={e => setQuestion(e.target.value)} placeholder="e.g. Why does this video get more views than the others?" /><div className="summary-submit"><span><ShieldNote /> Uses your saved metrics · no AI API required</span><button className="button primary" type="submit"><Sparkles size={15} />Get Summary</button></div></form>{current && <section className="summary-result" aria-live="polite"><div className="summary-result-heading"><span><Check size={15} />Summary ready</span><span>Based on {videos.length} selected videos</span></div><h3>{current.summary.headline}</h3>{current.question && <p className="summary-question">Your question: “{current.question}”</p>}<ul>{current.summary.observations.map((s,i) => <li key={i}>{s}</li>)}</ul><div className="summary-limits"><Info size={16} /><p>{current.summary.perspective}{current.question && !/why|view|reach|viral|watch|retention|finish|completion|length|duration|compare|better|perform/i.test(current.question) ? ' Your question may need information beyond the metrics stored here.' : ''}</p></div><div className="summary-next"><span>A useful next step</span><p>{current.summary.nextStep}</p></div></section>}</div>;
}
function ShieldNote() { return <Info size={12} />; }
