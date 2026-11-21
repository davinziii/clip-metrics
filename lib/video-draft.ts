import { z } from 'zod';

export const VIDEO_DRAFT_KEY = 'clipmetrics:add-video-draft';
const text = z.string().max(10000).default('');
const draftSchema = z.object({ version: z.literal(1), url: text, title: text, creator: text, thumbnail: text, duration: text, publishedAt: text, views: text, watchTime: text, fullWatch: text, nicheId: text });
export type VideoDraft = z.infer<typeof draftSchema>;
// Keep incomplete inputs as strings. A draft need not pass saved-video validation yet.
let sessionDraft: VideoDraft | null = null;
export function readVideoDraft(): VideoDraft | null {
  try {
    const raw = localStorage.getItem(VIDEO_DRAFT_KEY);
    if (!raw) return sessionDraft;
    const parsed = draftSchema.safeParse(JSON.parse(raw));
    if (parsed.success) { sessionDraft = parsed.data; return parsed.data; }
  } catch { /* Memory still preserves dismiss/reopen when browser storage is unavailable. */ }
  return sessionDraft;
}
export function writeVideoDraft(draft: VideoDraft) {
  sessionDraft = draft;
  try { localStorage.setItem(VIDEO_DRAFT_KEY, JSON.stringify(draft)); } catch { /* Preserve the current draft in memory. */ }
}
export function clearVideoDraft() {
  sessionDraft = null;
  try { localStorage.removeItem(VIDEO_DRAFT_KEY); } catch { /* The form can still clear in memory. */ }
}
