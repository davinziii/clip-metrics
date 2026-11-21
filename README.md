# ClipMetrics

A private, browser-local analytics workspace for TikTok, Instagram Reels, and YouTube Shorts. The charcoal, lime, and contrasting library surfaces follow the supplied visual reference. There is no seeded or fabricated user data.

## Run

```powershell
npm install
npm run dev
```

Open http://localhost:3000. Production: `npm run build` then `npm start`.

## Features

- Dashboard, video library and detail view, 2–10-video comparisons, custom niche management, and Settings.
- Compare includes an optional question field above **Get Summary**. Summaries use rule-based analysis of the selected videos, distinguish reach from retention, identify missing evidence and platform/date differences, and suggest a next check. No paid AI API is used; arbitrary questions needing video content or external facts cannot be answered from stored metrics alone.
- Persistent themes with a one-click dark/light navigation toggle and a System preference in Settings, responsive navigation, keyboard-accessible native modal dialogs, reduced-motion support.
- Search, platform/niche/date filters, view/retention sorting, retention charts, historical views, and descriptive insights.
- Video CRUD; manual metrics and dated view snapshots with source labels; optional public metadata; official YouTube view refresh.
- Versioned JSON backup/restore with confirmation, validation and storage-write rollback. Invalid/newer saved schemas are preserved until explicit recovery. Cross-tab changes reload automatically.

## Retrieval limits

TikTok and YouTube public oEmbed endpoints are attempted for titles, creators, and thumbnails. When TikTok oEmbed omits fields, the app reads structured JSON from the requested public video page for caption, creator, cover, duration, and publication date. Official TikTok short links are resolved with bounded, host-checked redirects. Returned video IDs must match the requested video. Availability varies by video/provider. The oEmbed endpoints do **not** provide reliable view counts, duration, publication dates, or private retention metrics; manual entry is always available. Instagram retrieval requires authorized platform access and uses manual entry here. No paid API is required. The TikTok public-page fallback depends on its page structure and access policies. Unavailable or restricted videos still require manual entry. Cover URLs may expire; fetch details again to renew them.

To enable automatic YouTube view refresh, copy `.env.example` to `.env.local`, set a server-side `YOUTUBE_API_KEY` with YouTube Data API v3 enabled, and restart. The key stays on the server. Without it, Refresh Views explains the limitation and opens the manual dated-snapshot form. TikTok and Instagram use manual view snapshots. Identical API counts update last-successful-refresh time without adding redundant history.

## Data and calculations

Data lives at localStorage key `clipmetrics:data`, schema version 1. This is a new isolated application and does not change data from other tracker projects. Export regularly; browser data is device/profile-specific and clearing it removes the library. Theme preference is stored separately by next-themes. No credentials are stored in the browser.

Summary views sum each selected video's latest recorded count. Missing counts are excluded from measured counts. Retention metrics are equal-weight means of saved video entries. Watch/duration = average watch seconds divided by duration; rewatches may exceed 100%. Growth is the signed difference between first and latest actual snapshots, including genuine downward corrections. The main views timeline sums latest-known measured counts at each snapshot event; it is not daily new views and can rise when another video joins the library. No points are generated between records. Date filters use publication date where recorded, otherwise saved date. Snapshot tooltips and logs identify source and timestamp.

The centralized `lib/domain.ts` metric registry holds visible metric definitions, validation, formatting, platforms, and aggregation semantics. Add future metrics there and extend the typed schema; the generated form and comparison rows consume the registry. `parseData` is the explicit migration entry point; unsupported versions are rejected without silently replacing data. There is no previous ClipMetrics schema to migrate yet.

## Checks

```powershell
npm run lint
npm run typecheck
npm test
npm run build
```

Domain tests cover URL identity, spoofed domains, snapshot chronology, duplicate suppression, measured portfolio totals, normalized retention, and backup safety. API success depends on provider availability and valid server credentials; manual workflows require neither.

## Provider references

- https://developers.tiktok.com/doc/embed-videos/
- https://oembed.org/providers/youtube
- https://developers.google.com/youtube/v3/docs/videos/list

## Add Video drafts and filtering

Add Video automatically keeps every field as an incomplete browser-local draft, including fetched details, metrics, and niche choice. Closing, clicking outside, navigating, or refreshing preserves the draft. A successful video save clears it; validation or storage failures keep it. Edit Video does not replace the Add Video draft. Clear all data also clears the draft. Drafts are separate from exported saved-library backups.

The library and Compare page both show platform tabs with custom niche buttons immediately underneath. Platform and niche filters are combined. Library tabs stay synchronized with the dashboard filters. Compare selections remain selected when browsing other platforms or niches, with visible selection chips for removal.
