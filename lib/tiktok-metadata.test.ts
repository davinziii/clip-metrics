import { test } from 'node:test';
import assert from 'node:assert/strict';
import { allowedTikTokUrl, fullTikTokUrl, loadTikTokPage, parseTikTokPage } from './tiktok-metadata';
const url = 'https://www.tiktok.com/@creator/video/6718335390845095173';
const page = (id = '6718335390845095173') => `<script id="__UNIVERSAL_DATA_FOR_REHYDRATION__" type="application/json">${JSON.stringify({ __DEFAULT_SCOPE__: { 'webapp.video-detail': { statusCode: 0, itemInfo: { itemStruct: { id, desc: 'A real caption', author: { uniqueId: 'creator' }, video: { cover: 'https://p16.tiktokcdn.com/cover.jpg', duration: 20 }, createTime: 1600000000 } } } } })}</script>`;
test('public-page fallback extracts validated metadata for the requested video only', () => {
  const result = parseTikTokPage(page(), url);
  assert.equal(result.title,'A real caption'); assert.equal(result.creator,'creator'); assert.equal(result.duration,20); assert.equal(result.thumbnail,'https://p16.tiktokcdn.com/cover.jpg');
  assert.throws(() => parseTikTokPage(page('9999999999999999999'),url));
  assert.throws(() => parseTikTokPage('<html>Unavailable</html>',url));
});
test('only official HTTPS TikTok hosts and normal ports can be requested', () => {
  for (const invalid of ['https://tiktok.com.evil.test/', 'https://127.0.0.1/', 'https://www.tiktok.com:8080/', 'https://user:pass@www.tiktok.com/', 'http://www.tiktok.com/']) assert.throws(() => allowedTikTokUrl(invalid));
  assert.equal(fullTikTokUrl(url + '?is_from_webapp=1'),url);
});
test('short-link resolution never follows an off-platform redirect', async () => {
  let requests = 0;
  const request = (async () => { requests++; return new Response(null, { status: 302, headers: { location: 'http://127.0.0.1/private' } }); }) as typeof fetch;
  await assert.rejects(loadTikTokPage('https://vm.tiktok.com/abcdef/',request)); assert.equal(requests,1);
});
test('official short-link redirects resolve to the matching video page', async () => {
  let requests = 0;
  const request = (async () => ++requests === 1 ? new Response(null, { status: 302, headers: { location: url } }) : new Response(page(), { headers: { 'content-type': 'text/html' } })) as typeof fetch;
  const result = await loadTikTokPage('https://vt.tiktok.com/abcdef/',request);
  assert.equal(result.url,url); assert.equal(parseTikTokPage(result.html,result.url).creator,'creator');
});
