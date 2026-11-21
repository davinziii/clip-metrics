import { type Video, views, watchPercent, precise, growth } from './domain';

export type Summary = { headline: string; observations: string[]; perspective: string; nextStep: string };
export function summarizeVideos(videos: Video[], question: string): Summary {
  if (videos.length < 2 || videos.length > 4) throw new Error('Select 2–4 videos to get a comparison summary.');
  const observations: string[] = [];
  const recorded = videos.filter(v => v.snapshots.length);
  const byViews = [...recorded].sort((a,b) => views(b)-views(a));
  const byCompletion = [...videos].sort((a,b) => b.metrics.fullWatch-a.metrics.fullWatch);
  const byNormalized = videos.filter(v => v.duration).sort((a,b) => watchPercent(b)!-watchPercent(a)!);
  const high = byViews[0], low = byViews.at(-1);
  const leader = byCompletion[0], last = byCompletion.at(-1)!;
  if (high && low && recorded.length >= 2) {
    const difference = views(high)-views(low);
    observations.push(difference ? `“${high.title}” has ${precise(views(high))} recorded views, ${precise(difference)} more than “${low.title}” (${precise(views(low))}).${views(low) > 0 ? ` That is ${precise(views(high)/views(low))}× the recorded reach.` : ' A ratio cannot be calculated from a zero count.'}` : `The ${recorded.length} videos with view records have the same recorded view count (${precise(views(high))}).`);
    const retentionDifference = high.metrics.fullWatch-low.metrics.fullWatch;
    observations.push(retentionDifference > 0 ? `The higher-view video also has ${precise(retentionDifference)} percentage points higher completion (${precise(high.metrics.fullWatch)}% versus ${precise(low.metrics.fullWatch)}%). This is a retention signal, not evidence that completion caused the extra reach.` : retentionDifference < 0 ? `The higher-view video has lower completion (${precise(high.metrics.fullWatch)}% versus ${precise(low.metrics.fullWatch)}%). Your records show that greater reach and stronger retention do not necessarily belong to the same video.` : `The highest- and lowest-view videos have equal completion (${precise(high.metrics.fullWatch)}%). This metric does not explain the reach difference.`);
  } else observations.push('Record current view counts for at least two selected videos to compare reach. Missing counts are not treated as zero.');
  observations.push(leader.metrics.fullWatch === last.metrics.fullWatch ? `All selected videos have ${precise(leader.metrics.fullWatch)}% recorded completion.` : `“${leader.title}” has the highest recorded completion at ${precise(leader.metrics.fullWatch)}%, ${precise(leader.metrics.fullWatch-last.metrics.fullWatch)} percentage points above “${last.title}”.`);
  if (byNormalized.length >= 2) {
    const v = byNormalized[0];
    observations.push(`“${v.title}” has the highest duration-normalized watch time: ${precise(watchPercent(v)!)}% (${precise(v.metrics.watchTime)} seconds watched on a ${precise(v.duration!)}-second video).${watchPercent(v)! > 100 ? ' Values above 100% may reflect rewatches.' : ''} This is different from the percentage who finished the video.`);
  } else observations.push('At least two recorded durations are needed for a fair watch-time-to-length comparison. Raw watch seconds alone favor longer videos.');
  const history = videos.filter(v => growth(v) !== null).sort((a,b) => growth(b)!-growth(a)!);
  if (history.length) observations.push(`“${history[0].title}” changed by ${growth(history[0])! >= 0 ? '+' : ''}${precise(growth(history[0])!)} views between its first and latest snapshots. ${history.length < videos.length ? 'Some selected videos lack a second snapshot.' : 'Snapshot time windows may differ, so these changes are not a common-period growth ranking.'}`);
  const caveats = ['Saved metrics cannot establish why a platform distributed one video more widely.'];
  if (new Set(videos.map(v => v.platform)).size > 1) caveats.push('These videos span different platforms, whose audiences and distribution systems differ.');
  const dates = videos.map(v => v.publishedAt);
  if (dates.some(d => !d)) caveats.push('Some publication dates are missing, so exposure time cannot be compared.');
  else if (new Set(dates).size > 1) caveats.push('The publication dates differ; older videos have had more time to accumulate views.');
  caveats.push('Traffic sources, impressions, audience size, posting time, and the actual hooks are not recorded here.');
  const q = question.trim().toLowerCase();
  const nextStep = /why|views|reach|viral/.test(q) ? 'Compare videos on the same platform over the same time since publication. Record another view snapshot, then inspect the opening hook and traffic sources in your platform analytics before changing your strategy.' : /watch|retention|finish|completion|length|duration/.test(q) ? 'Compare videos with similar durations and publication windows. Review the first few seconds and the drop-off points in platform analytics, then test one creative change at a time.' : 'Use this small sample to choose a hypothesis, not a winner. Compare similar platform, length, and age cohorts; record another snapshot and test one creative variable at a time.';
  return { headline: question.trim() ? 'Here’s what your records can tell us.' : 'Your selected videos, in perspective.', observations, perspective: caveats.join(' '), nextStep };
}
