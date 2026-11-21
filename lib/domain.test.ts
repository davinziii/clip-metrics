import { test } from 'node:test';
import assert from 'node:assert/strict';
import { addSnapshot, canonicalUrl, emptyData, growth, parseData, platformFor, portfolioTimeline, views, watchPercent, type Video } from './domain';
import { summarizeVideos } from './summary';
import { MAX_COMPARISON_VIDEOS, toggleComparison } from './comparison';
const video = (id = 'a'): Video => ({ id, url: `https://tiktok.com/@creator/video/${id}`, platform: 'TikTok', title: id, creator: '', thumbnail: '', publishedAt: '', nicheId: null, duration: 20, metrics: { watchTime: 25, fullWatch: 50 }, snapshots: [], createdAt: '2026-01-01T00:00:00.000Z', lastChecked: null });
test('comparison accepts ten videos, blocks an eleventh, and frees a slot on removal', () => {
  let selected: string[] = [];
  for (let index = 0; index < MAX_COMPARISON_VIDEOS; index++) selected = toggleComparison(selected, String(index));
  assert.equal(selected.length,10);
  assert.deepEqual(toggleComparison(selected,'eleventh'),selected);
  selected = toggleComparison(selected,'0');
  selected = toggleComparison(selected,'eleventh');
  assert.equal(selected.length,10);
  assert.ok(selected.includes('eleventh')); assert.ok(!selected.includes('0'));
});
test('comparison summary includes the full ten-video selection', () => {
  const videos = Array.from({ length: 10 }, (_,i) => ({ ...video(String(i)), metrics: { watchTime: 5+i, fullWatch: 10+i*5 } }));
  assert.ok(summarizeVideos(videos,'').observations.some(s => s.includes('“9”') && s.includes('55%')));
  assert.throws(() => summarizeVideos([...videos,video('eleventh')],''));
});
test('reject lookalike platform hosts and preserve unique YouTube identities', () => {
  assert.equal(platformFor('https://tiktok.com.evil.com/a'), null);
  assert.equal(platformFor('https://evil-tiktok.com/a'), null);
  assert.equal(canonicalUrl('https://www.youtube.com/shorts/abcdefghijk?si=tracking'), canonicalUrl('https://youtu.be/abcdefghijk'));
  assert.notEqual(canonicalUrl('https://youtube.com/watch?v=abcdefghijk'), canonicalUrl('https://youtube.com/watch?v=lmnopqrstuv'));
});
test('historical readings use recording time, preserve negative corrections and skip redundant API counts', () => {
  let v = addSnapshot(video(), { id: '2', at: '2026-02-02T00:00:00.000Z', views: 80, source: 'manual' });
  v = addSnapshot(v, { id: '1', at: '2026-02-01T00:00:00.000Z', views: 100, source: 'manual' });
  assert.equal(views(v),80); assert.equal(growth(v),-20);
  v = addSnapshot(v, { id: '3', at: '2026-02-03T00:00:00.000Z', views: 80, source: 'api' });
  assert.equal(v.snapshots.length,2); assert.equal(v.lastChecked,'2026-02-03T00:00:00.000Z');
  assert.throws(() => addSnapshot(v, { id: '4', at: '2026-02-02T00:00:00.000Z', views: 90, source: 'manual' }));
});
test('portfolio totals carry forward measured counts without adding synthetic history', () => {
  const a = addSnapshot(video('a'), { id: '1', at: '2026-01-01T00:00:00.000Z', views: 100, source: 'manual' });
  const b = addSnapshot(video('b'), { id: '2', at: '2026-01-02T00:00:00.000Z', views: 50, source: 'manual' });
  assert.deepEqual(portfolioTimeline([a,b]).map(p => p.value),[100,150]);
  assert.equal(growth(a),null); assert.equal(watchPercent(a),125);
  assert.equal(watchPercent({ ...a, duration: null }),null);
});
test('backup validation rejects unsupported versions, orphan niches and invalid percentages', () => {
  assert.deepEqual(parseData(emptyData),emptyData);
  assert.throws(() => parseData({ ...emptyData, version: 2 }));
  assert.throws(() => parseData({ ...emptyData, videos: [{ ...video(), nicheId: 'missing' }] }));
  assert.throws(() => parseData({ ...emptyData, videos: [{ ...video(), metrics: { watchTime: 10, fullWatch: 101 } }] }));
  assert.throws(() => parseData({ ...emptyData, videos: [video(),video()] }));
});
test('summary distinguishes reach from retention and never invents missing views', () => {
  const a = addSnapshot({ ...video('a'), metrics: { watchTime: 5, fullWatch: 20 } }, { id: 'a1', at: '2026-01-01T00:00:00.000Z', views: 1000, source: 'manual' });
  const b = addSnapshot({ ...video('b'), metrics: { watchTime: 15, fullWatch: 70 } }, { id: 'b1', at: '2026-01-01T00:00:00.000Z', views: 100, source: 'manual' });
  const summary = summarizeVideos([a,b], 'Why does this get more views?');
  assert.ok(summary.observations.some(o => o.includes('lower completion')));
  assert.ok(summary.perspective.includes('cannot establish why'));
  assert.ok(summary.perspective.includes('publication dates are missing'));
  assert.ok(summarizeVideos([video('a'),video('b')], '').observations[0].includes('Missing counts are not treated as zero'));
  assert.throws(() => summarizeVideos([a], ''));
});
