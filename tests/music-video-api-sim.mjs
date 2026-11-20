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
const R2 = { put: async (k, b) => { r2.set(k, Buffer.from(b)); }, head: async k => r2.has(k) ? { size: r2.get(k).length } : null, get: async (k, o) => { const b = r2.get(k); if (!b) return null; const s = o && o.range ? b.subarray(o.range.offset, o.range.offset + o.range.length) : b; return { body: s, arrayBuffer: async () => s.buffer.slice(s.byteOffset, s.byteOffset + s.length) }; }, delete: async k => { r2.delete(k); } };
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
assert.equal(L.stripAdlibs(r.j.song.sections[0].lines[3]), '“관리자가 고친 괘 제목”', '승인·수정된 문구를 쓴다'); assert(r.j.song.title.startsWith('2027 ')); assert(r.j.song.sections[0].lines[0] === L.compose(sd, 'self').sections[0].lines[0], '사주는 서버가 출생 정보로 계산(브라우저 sd 무시)');
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
r = await call('GET', '/api/music-video?admin=1', null, admin); assert.equal(r.status, 200); assert.equal(r.j.day, '갑자'); assert(r.j.hero && r.j.hero.nameKo === '푸른 쥐'); assert.equal(r.j.configured.music, true); assert.equal(r.j.flag, true);
r = await call('POST', '/api/music-video', { panel: { slot: 'mv-love-hook-gyeong-o-f', generate: true } }); assert.equal(r.status, 401);
r = await call('POST', '/api/music-video', { panel: { slot: 'mv-love-hook-gyeong-o-f', generate: true } }, admin); assert.equal(r.status, 200, JSON.stringify(r.j)); assert(/^\/api\/clipfile\?k=mvpanel-mv-love-hook-gyeong-o-f-/.test(r.j.panels['mv-love-hook-gyeong-o-f'].url));
r = await call('POST', '/api/music-video', { panel: { slot: 'nope', generate: true } }, admin); assert.equal(r.status, 400);
r = await call('GET', '/api/music-video?admin=1&day=' + encodeURIComponent('경오') + '&g=F', null, admin); assert(r.j.panels['mv-love-hook-gyeong-o-f'] && r.j.hero.nameKo === '흰 말'); assert.equal(Object.keys(r.j.panels).length, 1);
r = await call('POST', '/api/music-video', { panel: { slot: 'mv-love-hook-gyeong-o-f', clear: true } }, admin); assert.equal(r.status, 200); assert(!r.j.panels['mv-love-hook-gyeong-o-f']);
// 10-2) 패널 그림 지시문(3판): 고급 K-힙합 뮤비 + 사람 주인공 + 일지 수호 동물(실제 동물) + 현대적 한국 요소, 무기·마약·폭력·글자 금지, 주제별 장면
{ let seen = ''; const f0 = globalThis.fetch; globalThis.fetch = async (u, o) => { if (String(u).includes('api.openai.com')) seen = String(o && o.body || ''); return f0(u, o); };
  r = await call('POST', '/api/music-video', { panel: { slot: 'mv-wealth-hook-byeong-in-m', generate: true } }, admin); assert.equal(r.status, 200);
  assert(/고급 K-힙합 뮤직비디오/.test(seen) && /포토리얼/.test(seen) && /재해석한 갓/.test(seen) && !/패러디|의인화|동물 얼굴/.test(JSON.parse(seen).prompt), '고급 뮤비 톤·한국 요소, 패러디·의인화 없음');
  assert(/남성 래퍼/.test(seen) && !/여성 래퍼/.test(seen), '남자 칸(-m)은 남성 래퍼가 주인공');
  { const p = JSON.parse(seen).prompt; assert(/한국인 남성 래퍼\(성인, 실제 사람\)/.test(p) && /한낮의 태양처럼/.test(p) && /수호 동물\(일지 호랑이\): 주인공 곁을 나란히 걷는 호랑이/.test(p) && /실제 동물 그대로/.test(p) && /붉은 빛\(일간 색\)/.test(p) && /크루의 상징 동물\(말·개\)은 옷의 자수·펜던트로만/.test(p) && /일주 병인/.test(p) && !/짝:/.test(p), '주인공 = 사람(일간 기질) + 일지 수호 동물, 크루 = 사람(삼합은 자수)'); }
  assert(!/갱스터|총|칼|마약|담배|폭력|술병|지폐|그리지 않는다|금지/.test(JSON.parse(seen).prompt), '안전 필터에 걸릴 단어 없음(긍정형 지시문)'); assert(/재물운/.test(seen) && /글자·간판 문구·로고·자막 없이/.test(seen), '주제 장면·글자 없음');
  { const pj = JSON.parse(seen); assert(/공통 화풍/.test(pj.prompt) && /\n촬영: .+mm/.test(pj.prompt) && /오늘의 의상\(주인공\): /.test(pj.prompt) && /색 팔레트\(일간 화\)/.test(pj.prompt), '지시문 2판: 공통 화풍·구간별 촬영·일간 색');
    assert(/풀 블리드/.test(pj.prompt) && !/어안|비워 둔다/.test(pj.prompt), '전체 화면 채움(원형 프레임·아래 여백 문구 없음)'); assert.equal(pj.size, '1024x1536'); assert.equal(pj.quality, 'high', '뮤직비디오 패널 화질 high'); assert.equal(r.j.panels['mv-wealth-hook-byeong-in-m'].pv, 3, '새 그림에 지시문 판 기록'); }
  { const shots = new Set(), shotOf = () => /\n촬영: ([^\n]+)/.exec(JSON.parse(seen).prompt)[1];
    for (const d of ['gap-ja', 'eul-chuk', 'byeong-in', 'jeong-myo', 'mu-jin', 'gi-sa', 'gyeong-o', 'sin-mi']) { r = await call('POST', '/api/music-video', { panel: { slot: 'mv-hook-' + d + '-f', generate: true } }, admin); assert.equal(r.status, 200); shots.add(shotOf()); }
    assert(shots.size >= 3, '일주가 다르면 훅 연출도 여러 가지 ' + shots.size);
    const once = []; for (let i = 0; i < 6; i++) { r = await call('POST', '/api/music-video', { panel: { slot: 'mv-hook-gap-ja-f', generate: true } }, admin); once.push(shotOf()); assert(r.j.panels['mv-hook-gap-ja-f'].seed, '다시 만들면 새 변형 씨앗'); }
    assert(new Set(once).size >= 2, '다시 누르면 다른 연출이 나올 수 있음');
    for (const d of ['gap-ja', 'eul-chuk', 'byeong-in', 'jeong-myo', 'mu-jin', 'gi-sa', 'gyeong-o', 'sin-mi']) await call('POST', '/api/music-video', { panel: { slot: 'mv-hook-' + d + '-f', clear: true } }, admin); }
  r = await call('POST', '/api/music-video', { panel: { slot: 'mv-love-intro-im-ja-f', generate: true } }, admin); assert.equal(r.status, 200); assert(/여성 래퍼/.test(seen) && !/남성 래퍼/.test(seen), '여자 칸(-f)은 여성 래퍼'); assert(/어깨 위에 앉은 작은 쥐/.test(seen) && /검은 빛/.test(seen) && /짝: 사람 한 명/.test(seen) && /짝의 상징 동물 소는/.test(seen), '연애운 짝 = 사람 + 육합 실루엣');
  r = await call('POST', '/api/music-video', { panel: { slot: 'mv-wealth-hook-metal', generate: true } }, admin); assert.equal(r.status, 400, '성별 없는 옛 칸 이름은 받지 않음');
  globalThis.fetch = f0; }
// 10-3) 패널 영상(Kling): 키 없으면 501, 시작 프레임 → 작업 → 확인(완료 시 R2 저장·칸 연결), 이미지 바꾸면 영상도 지움
r = await call('POST', '/api/music-video', { panel: { slot: 'mv-wealth-hook-byeong-in-m', video: { startKey: 'mvstart-x.jpg' } } }, admin); assert.equal(r.status, 501);
env.KLING_API_KEY = 'kling-test'; let kling = 0, klingBody = '';
{ const f0 = globalThis.fetch; globalThis.fetch = async (u, o) => { u = String(u);
    if (u.includes('kling')) { kling++; if (o && o.method === 'POST') { klingBody = String(o.body); return new Response(JSON.stringify({ code: 0, data: { id: 'task1' } }), { status: 200, headers: { 'content-type': 'application/json' } }); } return new Response(JSON.stringify({ code: 0, data: [{ status: 'succeeded', outputs: [{ type: 'video', url: 'https://mock.kling.local/v.mp4' }] }] }), { status: 200, headers: { 'content-type': 'application/json' } }); }
    if (u.startsWith('https://mock.kling.local/')) return new Response(Buffer.alloc(5000, 1), { status: 200, headers: { 'content-type': 'video/mp4' } });
    return f0(u, o); };
  r2.set('a1b2c3d4.jpg', Buffer.alloc(3000, 2)); const put0 = R2.put, head0 = R2.head; R2.head = async k => r2.has(k) ? { size: r2.get(k).length, httpMetadata: { contentType: k.endsWith('.jpg') ? 'image/jpeg' : 'image/png' } } : null;
  r = await call('POST', '/api/music-video', { panel: { slot: 'mv-love-hook-gyeong-o-f', video: { startKey: 'a1b2c3d4.jpg' } } }, admin); assert.equal(r.status, 400, '이미지 없는 칸');
  r = await call('POST', '/api/music-video', { panel: { slot: 'mv-wealth-hook-byeong-in-m', video: { startKey: '../x.jpg' } } }, admin); assert.equal(r.status, 400);
  r = await call('POST', '/api/music-video', { panel: { slot: 'mv-wealth-hook-byeong-in-m', video: { startKey: 'a1b2c3d4.jpg' } } }, admin); assert.equal(r.status, 200, JSON.stringify(r.j)); assert.equal(r.j.pending, true);
  assert(/hip-hop music video/.test(klingBody) && !/gangster|gun|drug|weapon|violence|smok/i.test(klingBody), 'Kling 지시문(위험 단어 없음)');
  assert(/Korean male rapper/.test(klingBody) && /real tiger as a majestic guardian animal/.test(klingBody) && !/female|anthropomorphic/.test(klingBody), 'Kling 영상도 칸 성별대로, 사람 + 수호 동물');
  r = await call('POST', '/api/music-video', { panel: { slot: 'mv-wealth-hook-byeong-in-m', video: { startKey: 'a1b2c3d4.jpg' } } }, admin); assert.equal(r.status, 409, '중복 작업');
  r = await call('GET', '/api/music-video?vt=mv-wealth-hook-byeong-in-m'); assert.equal(r.status, 401);
  r = await call('GET', '/api/music-video?vt=mv-wealth-hook-byeong-in-m', null, admin); assert.equal(r.j.state, 'done'); const vurl = r.j.panels['mv-wealth-hook-byeong-in-m'].video; assert(/^\/api\/clipfile\?k=mvvid-mv-wealth-hook-byeong-in-m-/.test(vurl));
  assert(r2.has(vurl.split('k=')[1]) && !r2.has('a1b2c3d4.jpg'), '영상 저장·시작 프레임 정리');
  r = await call('GET', '/api/music-video?admin=1&day=' + encodeURIComponent('병인') + '&g=M', null, admin); assert.equal(r.j.panels['mv-wealth-hook-byeong-in-m'].video, vurl);
  r = await call('POST', '/api/music-video', { panel: { slot: 'mv-wealth-hook-byeong-in-m', generate: true } }, admin); assert(!r.j.panels['mv-wealth-hook-byeong-in-m'].video && !r2.has(vurl.split('k=')[1]), '이미지 바꾸면 옛 영상 지움');
  // 10-3b) 일괄 다시 만들기: 만들어진 칸 훑기(옛 판·올린 그림·영상 여부, 50개씩) + 영상 있던 옛 칸은 새 그림으로 영상도 다시 맡김
  { KV.list = async ({ prefix, cursor, limit }) => { const ks = [...kv.keys()].filter(k => k.startsWith(prefix)).sort(), st = cursor ? +cursor : 0, page = ks.slice(st, st + limit); return { keys: page.map(name => ({ name })), list_complete: st + limit >= ks.length, cursor: String(st + limit) }; };
    kv.set('mv:panel:mv-hook-gap-ja-m', JSON.stringify({ url: '/api/clipfile?k=mvpanel-old-a.png', by: 'gemini:x', pv: 2, video: '/api/clipfile?k=mvvid-old-a.mp4' }));
    kv.set('mv:panel:mv-career-outro-gap-ja-m', JSON.stringify({ url: '/api/clipfile?k=mvpanel-up.png', by: 'upload' }));
    kv.set('mv:panel:mv-bad-slot', JSON.stringify({ url: '/api/clipfile?k=x.png' }));
    r = await call('GET', '/api/music-video?admin=1&scan=old'); assert.equal(r.status, 401);
    r = await call('GET', '/api/music-video?admin=1&scan=old', null, admin); assert.equal(r.status, 200); assert.equal(r.j.promptV, 3);
    { const by = Object.fromEntries(r.j.items.map(x => [x.id, x])); assert.deepEqual(by['mv-hook-gap-ja-m'], { id: 'mv-hook-gap-ja-m', pv: 2, upload: false, video: true }); assert.equal(by['mv-career-outro-gap-ja-m'].upload, true); assert(!by['mv-bad-slot'], '칸 이름이 틀린 키는 뺌'); assert.equal(by['mv-wealth-hook-byeong-in-m'].pv, 3); }
    const k0 = kling; r = await call('POST', '/api/music-video', { panel: { slot: 'mv-hook-gap-ja-m', generate: true, regenVideo: true } }, admin); assert.equal(r.status, 200, JSON.stringify(r.j));
    assert.equal(r.j.videoPending, true, '영상 있던 옛 칸은 영상도 다시 맡김'); assert(kling > k0 && /Korean male rapper/.test(klingBody)); assert.equal(r.j.panels['mv-hook-gap-ja-m'].pv, 3); assert(!r.j.panels['mv-hook-gap-ja-m'].video, '옛 영상은 빠짐');
    assert(kv.get('mv:vt:mv-hook-gap-ja-m'), '영상 작업 기록');
    const k1 = kling; r = await call('POST', '/api/music-video', { panel: { slot: 'mv-wealth-hook-byeong-in-m', generate: true, regenVideo: true } }, admin); assert.equal(r.status, 200); assert.equal(kling, k1, '영상 없던 칸은 영상 안 맡김'); assert(!('videoPending' in r.j));
    for (const k of ['mv:panel:mv-hook-gap-ja-m', 'mv:panel:mv-career-outro-gap-ja-m', 'mv:panel:mv-bad-slot', 'mv:vt:mv-hook-gap-ja-m']) kv.delete(k); delete KV.list; }
  R2.head = head0; globalThis.fetch = f0; delete env.KLING_API_KEY; }
// 10-4) music_v2_5 가 4xx 로 거절되면 music_v1(sections 형식)으로 한 번 더 — 성공하면 그 곡을 쓴다
{ const f0 = globalThis.fetch, models = []; globalThis.fetch = async (u, o) => { if (String(u).startsWith('https://api.elevenlabs.io/')) { const b = JSON.parse(o.body); models.push(b.model_id);
    if (b.model_id === 'music_v2_5') return new Response(JSON.stringify({ detail: { status: 'model_not_available', message: 'plan does not include music_v2_5' } }), { status: 403, headers: { 'content-type': 'application/json' } });
    assert(Array.isArray(b.composition_plan.sections) && b.composition_plan.positive_global_styles.length && b.composition_plan.sections[0].lines.length, 'v1 형식');
    return new Response(Buffer.alloc(4000, 3), { status: 200, headers: { 'content-type': 'audio/mpeg' } }); } return f0(u, o); };
  r = await call('POST', '/api/music-video', { sd, topic: 'love' }, admin); assert.equal(r.status, 200, JSON.stringify(r.j)); assert.deepEqual(models, ['music_v2_5', 'music_v1']);
  globalThis.fetch = f0; }
// 10-5) 자막 시각: 노래를 만든 뒤 음성 인식(Scribe)으로 줄 시각을 붙이고, 다시 열 때는 부르지 않는다. 예전 곡(sync 기록 없음)은 처음 열 때 한 번 맞춘다
{ const f0 = globalThis.fetch; let stt = 0, sttForm = null;
  const song = L.compose(sd, 'career');
  globalThis.fetch = async (u, o) => { u = String(u);
    if (u === 'https://api.elevenlabs.io/v1/speech-to-text') { stt++; sttForm = o.body; let t = 5; const words = []; for (const sec of song.sections) for (const line of sec.lines) { for (const w of line.split(' ')) { words.push({ text: w, start: t, end: t + 0.3, type: 'word' }); t += 0.35; } t += 1.2; }
      return new Response(JSON.stringify({ language_code: 'kor', text: '', words }), { status: 200, headers: { 'content-type': 'application/json' } }); }
    if (u.startsWith('https://api.elevenlabs.io/v1/music')) return new Response(Buffer.alloc(4000, 5), { status: 200, headers: { 'content-type': 'audio/mpeg' } });
    return f0(u, o); };
  r = await call('POST', '/api/music-video', { sd, topic: 'career' }, admin); assert.equal(r.status, 200, JSON.stringify(r.j)); assert.equal(stt, 1); assert.equal(r.j.song.sync, 'ok');
  assert(sttForm instanceof FormData && sttForm.get('model_id') === 'scribe_v2' && sttForm.get('timestamps_granularity') === 'word' && sttForm.get('language_code') === 'ko');
  assert(Array.isArray(r.j.song.timing) && r.j.song.timing.length === song.sections.reduce((a, x) => a + x.lines.length, 0) && r.j.song.timing[0].t === 5000);
  r = await call('POST', '/api/music-video', { sd, topic: 'career' }, admin); assert.equal(stt, 1, '다시 열 때 음성 인식 안 부름'); assert.equal(r.j.song.timing[0].t, 5000);
  const k = 'mv:song:' + r.j.key, old = JSON.parse(kv.get(k)); delete old.syncVersion; delete old.timing; delete old.sync; kv.set(k, JSON.stringify(old));
  r = await call('POST', '/api/music-video', { sd, topic: 'career' }, admin); assert.equal(stt, 2, '예전 곡은 한 번 맞춤'); assert.equal(r.j.song.sync, 'ok');
  // 음성 인식 권한 없음(401) → 노래는 그대로 열리고(timing 없음) 관리자 화면에 오류가 남는다
  globalThis.fetch = async (u, o) => String(u).endsWith('/speech-to-text') ? new Response(JSON.stringify({ detail: { status: 'missing_permissions', message: 'missing the permission speech_to_text' } }), { status: 401, headers: { 'content-type': 'application/json' } }) : f0(u, o);
  old.syncVersion = 0; kv.set(k, JSON.stringify(old)); r = await call('POST', '/api/music-video', { sd, topic: 'career' }, admin); assert.equal(r.status, 200); assert.equal(r.j.song.timing, null); assert.equal(r.j.song.sync, 'error');
  assert(/speech_to_text/.test(JSON.parse(kv.get('mv:lastError')).message));
  kv.delete(k); globalThis.fetch = f0; }
// 10-6) 성별: 같은 생년월일시라도 여자·남자면 다른 곡(캐시 열쇠)·보컬 지시·패널 칸
{ const f0 = globalThis.fetch, bodies = []; globalThis.fetch = async (u, o) => { u = String(u); if (u.startsWith('https://api.elevenlabs.io/v1/music')) { bodies.push(JSON.parse(o.body)); return new Response(Buffer.alloc(4000, 9), { status: 200, headers: { 'content-type': 'audio/mpeg' } }); } if (u.endsWith('/speech-to-text')) return new Response('{}', { status: 500 }); return f0(u, o); };
  const inp = { year: 1988, month: 3, day: 3, hour: 9, minute: 0, calendar: 'solar', city: '서울' };
  const sF = ReportV2.SajuData.build(Manse.compute(Object.assign({ gender: 'F' }, inp)), { now: Date.UTC(2026, 10, 18) }), sM = ReportV2.SajuData.build(Manse.compute(Object.assign({ gender: 'M' }, inp)), { now: Date.UTC(2026, 10, 18) });
  const rf = await call('POST', '/api/music-video', { sd: sF, topic: 'self' }, admin), rm = await call('POST', '/api/music-video', { sd: sM, topic: 'self' }, admin);
  assert.equal(rf.status, 200); assert.equal(rm.status, 200); assert.notEqual(rf.j.key, rm.j.key, '성별마다 다른 곡');
  assert(rf.j.song.sections.every(x => /-f$/.test(x.panel)) && rm.j.song.sections.every(x => /-m$/.test(x.panel)), '패널 칸 성별');
  assert(bodies[0].composition_plan.chunks[0].positive_styles.includes('female rapper') && bodies[1].composition_plan.chunks[0].positive_styles.includes('male rapper'), '보컬 성별 지시');
  globalThis.fetch = f0; }
// 10-7) 사용자 화면 자동 채우기: 곡을 열 권한이 있으면 이 곡의 빈 칸만 하나씩 만들고, 있으면 다시 만들지 않는다
{ const f0 = globalThis.fetch; let img = 0; globalThis.fetch = async (u, o) => { u = String(u); if (u.includes('api.openai.com')) img++; if (u.startsWith('https://api.elevenlabs.io/v1/music')) return new Response(Buffer.alloc(4000, 6), { status: 200, headers: { 'content-type': 'audio/mpeg' } }); if (u.endsWith('/speech-to-text')) return new Response('{}', { status: 500 }); return f0(u, o); };
  r = await call('POST', '/api/music-video', { sd, topic: 'love' }, admin); assert.equal(r.status, 200); assert.equal(r.j.fill, true);
  const id = r.j.song.sections[2].panel, pp = L.parsePanelId(id); assert.equal(pp.day, sd.dayPillar.ko); assert.equal(pp.topic, 'love'); assert(r.j.song.hero && r.j.song.hero.day === sd.dayPillar.ko);
  const before = img; let fr = await call('POST', '/api/music-video', { sd, topic: 'love', fillPanel: id }, admin); assert.equal(fr.status, 200, JSON.stringify(fr.j)); assert(fr.j.panel.url); assert.equal(img, before + 1);
  fr = await call('POST', '/api/music-video', { sd, topic: 'love', fillPanel: id }, admin); assert.equal(img, before + 1, '있는 칸은 다시 안 만듦');
  fr = await call('POST', '/api/music-video', { sd, topic: 'love', fillPanel: 'mv-love-hook-gap-ja-m' }, admin); assert.equal(fr.status, 400, '이 곡의 칸만');
  const id2 = r.j.song.sections[0].panel; kv.set('mv:pgen:' + id2, '1'); fr = await call('POST', '/api/music-video', { sd, topic: 'love', fillPanel: id2 }, admin); assert.equal(fr.status, 202, '다른 사람이 만드는 중'); kv.delete('mv:pgen:' + id2);
  r = await call('POST', '/api/music-video', { sd, topic: 'love' }, admin); assert(r.j.panels[id], '곡을 다시 열면 채운 칸이 함께 온다');
  fr = await call('POST', '/api/music-video', { sd, topic: 'love', fillPanel: id2 }); assert([401, 402, 403].includes(fr.status), '권한 없으면 못 채움 ' + fr.status);
  globalThis.fetch = f0; }
// 10-8) 일주 풍경 + 영상 자동 생성: 빈 칸 그림(jpeg) → Kling 자동 → 곡 단위 확인(checkVideos)으로 완성 영상이 칸에 붙는다
{ const f0 = globalThis.fetch; let imgBody = '', kSubmit = 0, kBody = ''; env.KLING_API_KEY = 'kling-test';
  globalThis.fetch = async (u, o) => { u = String(u);
    if (u.includes('api.openai.com')) imgBody = String(o.body || '');
    if (u.includes('kling')) { if (o && o.method === 'POST') { kSubmit++; kBody = String(o.body); return new Response(JSON.stringify({ code: 0, data: { id: 'auto1' } }), { status: 200, headers: { 'content-type': 'application/json' } }); } return new Response(JSON.stringify({ code: 0, data: [{ status: 'succeeded', outputs: [{ type: 'video', url: 'https://mock.kling.local/auto.mp4' }] }] }), { status: 200, headers: { 'content-type': 'application/json' } }); }
    if (u.startsWith('https://mock.kling.local/')) return new Response(Buffer.alloc(6000, 4), { status: 200, headers: { 'content-type': 'video/mp4' } });
    if (u.startsWith('https://api.elevenlabs.io/v1/music')) return new Response(Buffer.alloc(4000, 8), { status: 200, headers: { 'content-type': 'audio/mpeg' } });
    if (u.endsWith('/speech-to-text')) return new Response('{}', { status: 500 });
    return f0(u, o); };
  r = await call('POST', '/api/music-video', { sd, topic: 'wealth' }, admin); assert.equal(r.status, 200); assert.equal(r.j.videosPending, 0);
  const id = r.j.song.sections[1].panel;
  let fr = await call('POST', '/api/music-video', { sd, topic: 'wealth', fillPanel: id }, admin); assert.equal(fr.status, 200, JSON.stringify(fr.j));
  assert(/output_format.*jpeg/.test(imgBody), '패널은 jpeg 로(시작 프레임용)'); assert(/일주 상징 풍경/.test(imgBody) && imgBody.includes(L.DAY_OUTRO[sd.dayPillar.ko][0]), '일주 상징 풍경이 그림 지시문에');
  assert.equal(fr.j.videoPending, true); assert.equal(kSubmit, 1, '영상 자동 맡김'); assert(/Symbolic backdrop/.test(kBody));
  r = await call('POST', '/api/music-video', { sd, topic: 'wealth' }, admin); assert.equal(r.j.videosPending, 1);
  const cv = await call('POST', '/api/music-video', { sd, topic: 'wealth', checkVideos: true }, admin); assert.equal(cv.status, 200); assert.equal(cv.j.pending, 0); assert(/^\/api\/clipfile\?k=mvvid-/.test(cv.j.panels[id].video), '완성 영상이 칸에 붙음');
  fr = await call('POST', '/api/music-video', { sd, topic: 'wealth', fillPanel: id }, admin); assert.equal(kSubmit, 1, '있는 칸은 다시 안 맡김');
  const cv2 = await call('POST', '/api/music-video', { sd, topic: 'wealth', checkVideos: true }); assert([401, 402, 403].includes(cv2.status), '권한 없으면 확인 못 함');
  delete env.KLING_API_KEY; globalThis.fetch = f0; }
// 11) 일레븐랩스 오류 → 502, 진행 중 기록 지움(다음에 다시 시도 가능)
globalThis.fetch = async () => new Response(JSON.stringify({ detail: 'bad' }), { status: 422, headers: { 'content-type': 'application/json' } });
r = await call('POST', '/api/music-video', { sd, topic: 'career' }, admin); assert.equal(r.status, 502); assert(![...kv.keys()].some(k => k.startsWith('mv:song:') && JSON.parse(kv.get(k)).status === 'pending'));
assert(/HTTP 422/.test(r.j.detail) && /music_v1 재시도도/.test(r.j.detail), '관리자에게 실제 오류 문구');
{ const le = JSON.parse(kv.get('mv:lastError')); assert(/HTTP 422/.test(le.message) && !le.message.includes(SECRET)); const ad = await call('GET', '/api/music-video?admin=1', null, admin); assert(/HTTP 422/.test(ad.j.lastError.message)); }
kv.set('luckenv:flags', JSON.stringify({ version: 2, musicVideo: true })); kv.set('worlds:config', JSON.stringify({ worlds: [{ id: 'w7', access: 'paid' }] }));
// 12) 키가 없으면 501
delete env.ELEVENLABS_API_KEY; r = await call('POST', '/api/music-video', { sd, topic: 'career' }, admin); assert.equal(r.status, 501);
console.log('music-video-api-sim ok: 스위치·로그인·무료 주제 차단, 생성 3곡(종합·재물·신년운세), 캐시 재사용, 재생 Range, 패널 3,600칸(일주×성별×주제×구간) 만들기·비우기·자동 채우기, 여·남 다른 곡, 일주 풍경·영상 자동 생성, 고급 K-힙합 사람 주인공+수호 동물 지시문, Kling 패널 영상(작업·확인·저장·정리), 오류 처리, 키 노출 없음');
