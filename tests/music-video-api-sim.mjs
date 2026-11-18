// /api/music-video 서버 검사(가짜 KV·R2·일레븐랩스·이미지 모델). 실제 외부 호출 0회.
// 실행: node tests/music-video-api-sim.mjs
import assert from 'assert/strict'; import fs from 'fs'; import vm from 'vm'; import path from 'path'; import { pathToFileURL } from 'url';
const root = process.cwd();
globalThis.window = globalThis;
for (const f of ['engine.js', 'report/v2/saju-data.js']) vm.runInThisContext(fs.readFileSync(f, 'utf8'), { filename: f });
delete globalThis.window;
const mod = await import(pathToFileURL(path.join(root, 'functions/api/music-video.js')).href);
const L = globalThis.ReportV2.MusicVideoLyrics;

const kv = new Map(), r2 = new Map();
const KV = { get: async (k, t) => { const v = kv.get(k); return v == null ? null : t === 'json' ? JSON.parse(v) : v; }, put: async (k, v) => { kv.set(k, String(v)); }, delete: async k => { kv.delete(k); } };
const R2 = { put: async (k, b) => { r2.set(k, Buffer.from(b)); }, head: async k => r2.has(k) ? { size: r2.get(k).length } : null, get: async (k, o) => { const b = r2.get(k); if (!b) return null; const s = o && o.range ? b.subarray(o.range.offset, o.range.offset + o.range.length) : b; return { body: s }; }, delete: async k => { r2.delete(k); } };
const SECRET = 'xi-test-secret-key-123';
const env = { GLOSSARY_KV: KV, CLIPS_R2: R2, ADMIN_PASSWORD: 'pw', ELEVENLABS_API_KEY: SECRET, OPENAI_API_KEY: 'sk-test', MV_DAILY_LIMIT: '2' };
let eleven = 0, lastBody = null;
globalThis.fetch = async (u, o) => {
  u = String(u);
  if (u.startsWith('https://api.elevenlabs.io/v1/music')) { eleven++; assert.equal(o.headers['xi-api-key'], SECRET); lastBody = JSON.parse(o.body); return new Response(Buffer.alloc(4000, 7), { status: 200, headers: { 'content-type': 'audio/mpeg' } }); }
  if (u.includes('api.openai.com')) { const png = Buffer.from('89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000d4944415478da63f8ffff3f0005fe02fea7d6a4d40000000049454e44ae426082', 'hex'); return new Response(JSON.stringify({ data: [{ b64_json: png.toString('base64') }] }), { status: 200, headers: { 'content-type': 'application/json' } }); }
  throw new Error('예상 밖 외부 호출 ' + u);
};
const req = (method, url, body, headers = {}) => new Request('http://x' + url, { method, headers: { 'content-type': 'application/json', ...headers }, body: body ? JSON.stringify(body) : undefined });
const admin = { authorization: 'Bearer pw' };
const call = async (method, url, body, headers) => { const fn = method === 'GET' ? mod.onRequestGet : mod.onRequestPost; const r = await fn({ request: req(method, url, body, headers), env }); const txt = Buffer.from(await r.arrayBuffer()); assert(!txt.toString().includes(SECRET), '키가 응답에 노출됨'); let j = null; try { j = JSON.parse(txt.toString()); } catch { } return { status: r.status, j, txt, headers: r.headers }; };

const sd = ReportV2.SajuData.build(Manse.compute({ year: 1990, month: 5, day: 17, hour: 9, minute: 0, gender: 'F', calendar: 'solar', city: '서울' }), { now: Date.UTC(2026, 10, 18) });
kv.set('worlds:config', JSON.stringify({ worlds: [{ id: 'w1', access: 'paid' }, { id: 'w2', access: 'paid' }, { id: 'w3', access: 'free' }, { id: 'w7', access: 'paid' }] }));

// 1) 스위치 꺼짐 → 일반 사용자는 404, 외부 호출 없음
let r = await call('POST', '/api/music-video', { sd, topic: 'self' }); assert.equal(r.status, 404); assert.equal(eleven, 0);
// 2) 스위치 켬 → 로그인 안 했으면 401, 무료 주제(w3 연애)는 403
kv.set('luckenv:flags', JSON.stringify({ version: 1, musicVideo: true }));
r = await call('POST', '/api/music-video', { sd, topic: 'self' }); assert.equal(r.status, 401); assert.equal(r.j.error, 'login');
r = await call('POST', '/api/music-video', { sd, topic: 'love' }); assert.equal(r.status, 403); assert.equal(r.j.error, 'paid-topic-only');
assert.equal(eleven, 0);
// 3) 관리자 생성 → 일레븐랩스 1회, 요청 형식(composition_plan chunks 7개·3분·music_v2_5), R2 저장
r = await call('POST', '/api/music-video', { sd, topic: 'self' }, admin); assert.equal(r.status, 200, JSON.stringify(r.j)); assert.equal(eleven, 1);
assert.equal(lastBody.model_id, 'music_v2_5'); assert.equal(lastBody.composition_plan.chunks.length, 7); assert.equal(lastBody.composition_plan.chunks.reduce((a, c) => a + c.duration_ms, 0), 180000);
assert(!JSON.stringify(lastBody).includes(String(sd.birth.solarY) + '년'), '생년이 외부로 나감');
assert(r.j.song.sections.length === 7 && /^\/api\/music-video\?a=[0-9a-f]{64}$/.test(r.j.audio)); const key = r.j.key; assert(r2.has('mv-' + key + '.mp3'));
// 4) 같은 사주·주제 → 캐시(외부 호출 없음). 브라우저가 가사를 보내도 무시
r = await call('POST', '/api/music-video', { sd, topic: 'self', lyrics: '아무 가사' }, admin); assert.equal(r.status, 200); assert.equal(eleven, 1); assert.equal(r.j.key, key);
// 5) 다른 주제는 다른 곡
r = await call('POST', '/api/music-video', { sd, topic: 'wealth' }, admin); assert.equal(r.status, 200); assert.equal(eleven, 2); assert.notEqual(r.j.key, key); assert.equal(r.j.song.topic, 'wealth');
// 6) 신년운세: 괘 없으면 400, 있으면 생성
const birth = { year: 1990, month: 5, day: 17, hour: 9, minute: 0, gender: 'F', calendar: 'solar' };
r = await call('POST', '/api/music-video', { topic: 'newyear' }, admin); assert.equal(r.status, 400);
r = await call('POST', '/api/music-video', { topic: 'newyear', birth, year: 2027 }, admin); assert.equal(r.status, 409, '검수 전 괘는 노래를 만들지 않는다'); assert(/161괘/.test(r.j.detail)); assert.equal(eleven, 2);
kv.set('newyear:content', JSON.stringify({ rev: 1, modern: { 161: { status: 'reviewed', edits: { theme: '관리자가 고친 괘 제목' } } }, blocks: {}, history: [] }));
r = await call('POST', '/api/music-video', { topic: 'newyear', birth, year: 2027, sd: { dayMaster: { stem: '갑', el: '목' } } }, admin); assert.equal(r.status, 200, JSON.stringify(r.j)); assert.equal(eleven, 3);
assert.equal(r.j.song.sections[0].lines[3], '“관리자가 고친 괘 제목”', '승인·수정된 문구를 쓴다'); assert(r.j.song.title.startsWith('2027 ')); assert(r.j.song.sections[0].lines[0] === L.compose(sd, 'self').sections[0].lines[0], '사주는 서버가 출생 정보로 계산(브라우저 sd 무시)');
r = await call('POST', '/api/music-video', { topic: 'newyear', birth, year: 2027 }); assert.equal(r.status, 403, '신년운세 무료 공개·미설정이면 일반 사용자는 못 연다');
// 7) 하루 상한(일반 사용자 기준 2곡): 관리자는 상한 무시. 오늘 수는 4
assert.equal(kv.get('mv:count:' + new Date(Date.now() + 9 * 3600e3).toISOString().slice(0, 10)), '3');
// 8) 진행 중이면 202(같은 곡을 두 번 만들지 않는다)
{ const x = L.inputsOf(sd, 'career'), s = L.fromInputs(x); const enc = new TextEncoder(); const d = await crypto.subtle.digest('SHA-256', enc.encode(JSON.stringify({ v: s.version, m: 'music_v2_5', lyrics: s.lyrics, style: s.style, d: s.sections.map(q => q.durationMs) }))); const ck = [...new Uint8Array(d)].map(b => b.toString(16).padStart(2, '0')).join('');
  kv.set('mv:song:' + ck, JSON.stringify({ status: 'pending', at: Date.now() })); r = await call('POST', '/api/music-video', { sd, topic: 'career' }, admin); assert.equal(r.status, 202); assert.equal(r.j.pending, true); assert.equal(eleven, 3); kv.delete('mv:song:' + ck); }
// 9) 재생: 전체·Range·잘못된 열쇠
r = await call('GET', '/api/music-video?a=' + key); assert.equal(r.status, 200); assert.equal(r.headers.get('content-type'), 'audio/mpeg'); assert.equal(r.txt.length, 4000);
r = await call('GET', '/api/music-video?a=' + key, null, { range: 'bytes=100-199' }); assert.equal(r.status, 206); assert.equal(r.txt.length, 100); assert.equal(r.headers.get('content-range'), 'bytes 100-199/4000');
r = await call('GET', '/api/music-video?a=../x'); assert.equal(r.status, 404);
// 10) 관리자 화면 정보·패널: 권한 없으면 401, 만들기·비우기·주제 칸
r = await call('GET', '/api/music-video?admin=1'); assert.equal(r.status, 401);
r = await call('GET', '/api/music-video?admin=1', null, admin); assert.equal(r.status, 200); assert.equal(r.j.slots.length, 150); assert.equal(r.j.configured.music, true); assert.equal(r.j.flag, true);
r = await call('POST', '/api/music-video', { panel: { slot: 'mv-love-hook-fire', generate: true } }); assert.equal(r.status, 401);
r = await call('POST', '/api/music-video', { panel: { slot: 'mv-love-hook-fire', generate: true } }, admin); assert.equal(r.status, 200, JSON.stringify(r.j)); assert(/^\/api\/clipfile\?k=mvpanel-mv-love-hook-fire-/.test(r.j.panels['mv-love-hook-fire'].url));
r = await call('POST', '/api/music-video', { panel: { slot: 'nope', generate: true } }, admin); assert.equal(r.status, 400);
r = await call('GET', '/api/music-video?panels=1'); assert(r.j.panels['mv-love-hook-fire']);
r = await call('POST', '/api/music-video', { panel: { slot: 'mv-love-hook-fire', clear: true } }, admin); assert.equal(r.status, 200); assert(!r.j.panels['mv-love-hook-fire']);
// 11) 일레븐랩스 오류 → 502, 진행 중 기록 지움(다음에 다시 시도 가능)
globalThis.fetch = async () => new Response(JSON.stringify({ detail: 'bad' }), { status: 422, headers: { 'content-type': 'application/json' } });
r = await call('POST', '/api/music-video', { sd, topic: 'career' }, admin); assert.equal(r.status, 502); assert(![...kv.keys()].some(k => k.startsWith('mv:song:') && JSON.parse(kv.get(k)).status === 'pending'));
// 12) 키가 없으면 501
delete env.ELEVENLABS_API_KEY; r = await call('POST', '/api/music-video', { sd, topic: 'career' }, admin); assert.equal(r.status, 501);
console.log('music-video-api-sim ok: 스위치·로그인·무료 주제 차단, 생성 3곡(종합·재물·신년운세), 캐시 재사용, 재생 Range, 패널 150칸 만들기·비우기, 오류 처리, 키 노출 없음');
