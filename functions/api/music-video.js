// 내 사주 뮤직비디오 — 일레븐랩스 음악 API(공식)로 노래를 만들고 R2 에 보관한다. 패널 이미지는 관리자 '뮤직비디오 패널'에서 만든다.
// 공개 스위치: /api/luck-flags 의 musicVideo(기본 꺼짐). 꺼져 있으면 관리자만 쓸 수 있다.
// 공개 범위: 유료 주제(worlds:config access=paid) 안에서만, 그 주제를 산 회원(또는 관리자)만 노래를 만든다.
//
// POST /api/music-video { sd, topic } | { topic:'newyear', birth, year } — topic: self(종합풀이 w1)·love(w3)·wealth(w2)·career(w7)·newyear(토정비결 신년운세 tj<연도>)
//      가사는 서버가 사주 값(+승인된 토정 현대어 풀이)으로 다시 조합한다(브라우저가 보낸 가사는 받지 않는다).
//      일레븐랩스는 구간마다 길이(composition_plan chunks duration_ms)를 지켜 주므로 패널·자막 시점이 정확히 맞는다.
//      → { ok, song:{title, sections, totalMs}, audio, panels } | 202 { ok:false, pending:true }(같은 곡을 만드는 중) | { ok:false, error, locked? }
// GET  /api/music-video?a=<열쇠>                 — 만든 노래(mp3) 재생, Range 지원. 열쇠는 사주 조합의 sha256
// GET  /api/music-video?panels=1                 — 패널 칸 → 이미지 주소(공개)
// GET  /api/music-video?admin=1                  — 관리자: 칸 목록·키 설정 여부·오늘 생성 수·상한
// POST /api/music-video { panel:{ slot, generate|uploadKey|clear, extra? } } — 관리자: 패널 이미지 만들기·직접 올린 이미지 연결·비우기
//
// 필요: GLOSSARY_KV · CLIPS_R2 · ELEVENLABS_API_KEY(서버 비밀값, 브라우저로 내려 보내지 않는다)
// 선택: ELEVENLABS_MUSIC_MODEL(기본 music_v2_5) · MV_DAILY_LIMIT(하루 새 곡 상한, 기본 30)
// 캐시: 같은 사주 조합(가사·스타일·모델이 같음)이면 다시 만들지 않는다 — KV mv:song:<열쇠> + R2 mv-<열쇠>.mp3
// 상업 이용: 일레븐랩스 음악 약관상 사업자는 Scale(직원 10명 미만) 이상 요금제 계정의 키를 써야 한다.
import { json, isAdmin } from '../_lib.js';
import { sajuKey, memberOf, worldAccess, ownedWorlds, cleanBirth } from '../_commerce.js';
import { generate } from '../_panelart.js';
import { putDerivedFile, deleteDerivedFile } from '../_original-assets.js';
import { NY, YEARS } from '../_newyear-runtime.js';   // 만세력 엔진·토정 엔진·토정 현대어 풀이(신년운세와 같은 파일)
import { newyearGate } from '../_newyear.js';
import { loadContent, applyContent } from '../_newyear-content.js';
import '../../report/v2/saju-data.js';
import '../../report/v2/music-video-lyrics-topics.js';
import '../../report/v2/music-video-lyrics.js';

const L = globalThis.ReportV2.MusicVideoLyrics;
const ELEVEN = 'https://api.elevenlabs.io/v1/music?output_format=mp3_44100_128';
const SONG = k => 'mv:song:' + k, PANELS = 'mv:panels', COUNT = d => 'mv:count:' + d;
const KEY_RE = /^[0-9a-f]{64}$/, PENDING_MS = 4 * 60 * 1000;
const modelOf = env => (env.ELEVENLABS_MUSIC_MODEL === 'music_v2' || env.ELEVENLABS_MUSIC_MODEL === 'music_v2_5') ? env.ELEVENLABS_MUSIC_MODEL : 'music_v2_5';
const limitOf = env => { const n = parseInt(env.MV_DAILY_LIMIT, 10); return Number.isFinite(n) && n >= 0 ? n : 30; };
const today = () => new Date(Date.now() + 9 * 3600e3).toISOString().slice(0, 10);

async function sha256(s) { const d = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)); return [...new Uint8Array(d)].map(b => b.toString(16).padStart(2, '0')).join(''); }
async function flagOn(env) { try { const d = await env.GLOSSARY_KV.get('luckenv:flags', 'json'); return !!(d && d.musicVideo === true); } catch { return false; } }
async function panelsOf(env) { try { const m = await env.GLOSSARY_KV.get(PANELS, 'json'); return m && typeof m === 'object' ? m : {}; } catch { return {}; } }
const publicSong = s => ({ title: s.title, topic: s.topic, topicKo: s.topicKo, totalMs: s.totalMs, sections: s.sections.map(x => ({ id: x.id, name: x.name, lines: x.lines, startMs: x.startMs, durationMs: x.durationMs, panel: x.panel, panelFallback: x.panelFallback, el: x.el })) });

// 유료 주제를 산 회원인가(관리자는 통과, 관리자 '무료 사용자로 보기'는 일반 회원과 같게)
async function gate(request, env, world, sd) {
  const admin = isAdmin(request, env), viewAsFree = admin && (request.headers.get('x-view-as') || '') === 'free';
  if (admin && !viewAsFree) return { ok: true, admin: true };
  if (!(await flagOn(env))) return { ok: false, status: 404, error: 'off' };
  const access = await worldAccess(env), a = access[world]; if (!a || !a.enabled || !a.paid) return { ok: false, status: 403, error: 'paid-topic-only' };
  const member = await memberOf(request, env); if (!member) return { ok: false, status: 401, error: 'login', locked: { world, reason: 'login' } };
  const key = await sajuKey(sd); let owned = [];
  try { owned = await ownedWorlds(env, member.id, key); } catch { return { ok: false, status: 503, error: 'commerce-unavailable' }; }
  if (!owned.includes(world)) return { ok: false, status: 402, error: 'locked', locked: { world, reason: 'purchase' } };
  return { ok: true };
}

// 신년운세 입력: { birth, year? } → 신년운세 화면과 같은 공개 판정(newyearGate) + 유료 공개일 때 산 사람만 + 승인된 토정 현대어 풀이
async function newyearInputs(request, env, b) {
  const birth = cleanBirth(b && b.birth); if (!birth) return { status: 400, error: 'invalid-birth' };
  const years = YEARS(), year = years.includes(Number(b.year)) ? Number(b.year) : years[years.length - 1];
  const deps = NY(); let ng;
  try { ng = await newyearGate(request, env, { year, birth, Manse: deps.Manse }); } catch { return { status: 400, error: 'invalid-birth' }; }
  const admin = ng.reason === 'admin';
  if (!admin) {
    if (!(await flagOn(env))) return { status: 404, error: 'off' };
    if (ng.reason === 'free' || ng.state === 'closed') return { status: 403, error: 'paid-topic-only' };   // 무료 공개·비공개 해에는 뮤직비디오를 열지 않는다
    if (ng.state !== 'open') return { status: ng.reason === 'login' ? 401 : ng.reason === 'unavailable' ? 503 : 402, error: ng.reason === 'login' ? 'login' : 'locked', locked: { world: 'tj' + year, reason: ng.reason } };
  }
  let tj; try { tj = deps.TojeongEngine.compute({ birth, targetYear: year }, deps.Manse); } catch { return { status: 400, error: 'invalid-birth' }; }
  const live = applyContent(deps, await loadContent(env), 'public'), entry = live.TojeongModern[tj.gua];
  if (!entry || entry.status !== 'reviewed') return { status: 409, error: 'newyear-text-not-reviewed', detail: admin ? tj.gua + '괘 현대어 풀이가 아직 검수 전입니다(관리자 › 신년운세에서 승인)' : undefined };
  const inp = { year: birth.year, month: birth.month, day: birth.day, calendar: birth.calendar || 'solar', leap: !!birth.leap, gender: birth.gender, city: '서울' };
  if (Number.isInteger(birth.hour)) { inp.hour = birth.hour; inp.minute = birth.minute || 0; }
  let sd; try { sd = globalThis.ReportV2.SajuData.build(deps.Manse.compute(inp), { now: Date.now() }); } catch { return { status: 400, error: 'invalid-birth' }; }
  const x = L.inputsOf(sd, 'newyear', { year, gua: tj.gua, entry }); if (!x) return { status: 400, error: 'bad-saju' };
  return { x, g: { ok: true, admin } };
}

async function callEleven(env, song) {
  const r = await fetch(ELEVEN, { method: 'POST', headers: { 'xi-api-key': env.ELEVENLABS_API_KEY, 'content-type': 'application/json', accept: 'audio/mpeg' },
    body: JSON.stringify({ composition_plan: L.toElevenPlan(song), model_id: modelOf(env) }) });
  const ct = r.headers.get('content-type') || '';
  if (!r.ok || /json|text/.test(ct)) { let msg = ''; try { msg = (await r.text()).slice(0, 300); } catch { } throw new Error('음악 생성 실패(' + r.status + ') ' + msg); }
  const bytes = new Uint8Array(await r.arrayBuffer()); if (bytes.length < 1000) throw new Error('음악 파일이 비어 있습니다');
  return bytes;
}

export async function onRequestPost({ request, env }) {
  if (!env.GLOSSARY_KV) return json({ error: 'KV 바인딩(GLOSSARY_KV)이 없습니다' }, 501);
  let b; try { b = await request.json(); } catch { return json({ error: 'bad-payload' }, 400); }
  if (b && b.panel) return panelPost(request, env, b.panel);

  const topic = L.TOPICS.includes(b && b.topic) ? b.topic : 'self';
  let x, g;
  if (topic === 'newyear') {
    // 신년운세: 출생 정보로 서버가 직접 계산한다(괘·사주 모두). 토정 현대어 풀이는 관리자 검수(reviewed)를 마친 문구만 쓴다. 출생 정보는 저장하지 않는다.
    const r = await newyearInputs(request, env, b); if (r.error) return json({ ok: false, error: r.error, locked: r.locked || null, detail: r.detail }, r.status);
    x = r.x; g = r.g;
  } else {
    x = L.inputsOf(b && b.sd, topic); if (!x) return json({ ok: false, error: 'bad-saju' }, 400);
    g = await gate(request, env, L.TOPIC_WORLD[topic], b.sd); if (!g.ok) return json({ ok: false, error: g.error, locked: g.locked || null }, g.status);
  }
  if (!env.CLIPS_R2) return json({ ok: false, error: 'R2 바인딩(CLIPS_R2)이 없습니다' }, 501);

  const song = L.fromInputs(x), key = await sha256(JSON.stringify({ v: song.version, m: modelOf(env), lyrics: song.lyrics, style: song.style, d: song.sections.map(s => s.durationMs) }));
  const done = () => json({ ok: true, key, song: publicSong(song), audio: '/api/music-video?a=' + key });
  const reply = async r => { const o = await r.json(); o.panels = await panelsOf(env); return json(o, r.status); };
  const rec = await env.GLOSSARY_KV.get(SONG(key), 'json');
  if (rec && rec.status === 'done') return reply(done());
  if (rec && rec.status === 'pending' && Date.now() - rec.at < PENDING_MS) return json({ ok: false, pending: true, key }, 202);
  if (!env.ELEVENLABS_API_KEY) return json({ ok: false, error: '음악 생성 키(ELEVENLABS_API_KEY)가 설정되지 않았습니다' }, 501);

  const day = today(), used = parseInt(await env.GLOSSARY_KV.get(COUNT(day)), 10) || 0;
  if (!g.admin && used >= limitOf(env)) return json({ ok: false, error: 'daily-limit' }, 429);
  await env.GLOSSARY_KV.put(SONG(key), JSON.stringify({ status: 'pending', at: Date.now() }), { expirationTtl: 600 });
  await env.GLOSSARY_KV.put(COUNT(day), String(used + 1), { expirationTtl: 3 * 86400 });
  let bytes;
  try { bytes = await callEleven(env, song); }
  catch (e) { await env.GLOSSARY_KV.delete(SONG(key)); return json({ ok: false, error: 'generate-failed', detail: g.admin ? e.message : undefined }, 502); }
  await putDerivedFile(env, 'mv-' + key + '.mp3', bytes, { httpMetadata: { contentType: 'audio/mpeg' } });
  await env.GLOSSARY_KV.put(SONG(key), JSON.stringify({ status: 'done', at: Date.now(), bytes: bytes.length, model: modelOf(env), title: song.title, topic: song.topic, version: song.version }));
  return reply(done());
}

export async function onRequestGet({ request, env }) {
  const u = new URL(request.url);
  const a = u.searchParams.get('a');
  if (a !== null) return audio(request, env, a);
  if (u.searchParams.get('panels')) return new Response(JSON.stringify({ panels: env.GLOSSARY_KV ? await panelsOf(env) : {} }), { headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'public, max-age=60' } });
  if (u.searchParams.get('admin')) {
    if (!isAdmin(request, env)) return json({ error: 'unauthorized' }, 401);
    const used = parseInt(await env.GLOSSARY_KV.get(COUNT(today())), 10) || 0;
    return json({ slots: L.PANEL_SLOTS, panels: await panelsOf(env), version: L.VERSION, flag: await flagOn(env), today: used, limit: limitOf(env), model: modelOf(env),
      configured: { music: !!env.ELEVENLABS_API_KEY, image: !!(env.OPENAI_API_KEY || env.GEMINI_API_KEY), r2: !!env.CLIPS_R2 } });
  }
  return json({ error: 'not-found' }, 404);
}

async function audio(request, env, k) {
  if (!KEY_RE.test(k) || !env.CLIPS_R2) return new Response('not found', { status: 404 });
  const key = 'mv-' + k + '.mp3', head = await env.CLIPS_R2.head(key); if (!head) return new Response('not found', { status: 404 });
  const size = head.size, m = /^bytes=(\d*)-(\d*)$/.exec(request.headers.get('range') || '');
  const h = { 'content-type': 'audio/mpeg', 'accept-ranges': 'bytes', 'cache-control': 'public, max-age=86400' };
  if (m && (m[1] || m[2])) {
    let start = m[1] ? +m[1] : Math.max(0, size - +m[2]), end = m[1] && m[2] ? Math.min(+m[2], size - 1) : size - 1;
    if (start >= size || start > end) return new Response(null, { status: 416, headers: { 'content-range': 'bytes */' + size } });
    const o = await env.CLIPS_R2.get(key, { range: { offset: start, length: end - start + 1 } });
    return new Response(o.body, { status: 206, headers: { ...h, 'content-range': `bytes ${start}-${end}/${size}`, 'content-length': String(end - start + 1) } });
  }
  const o = await env.CLIPS_R2.get(key);
  return new Response(o.body, { status: 200, headers: { ...h, 'content-length': String(size) } });
}

/* ── 관리자: 패널 이미지 */
const SECTION_SCENE = {
  intro: '뮤직비디오 첫 장면. 새벽 도시의 창가나 골목, 막 하루가 시작되려는 고요한 순간. 화면 아래쪽 1/3은 자막이 올라가도록 어둡고 단순하게 비워 둔다.',
  verse1: '주인공의 일상과 기질이 드러나는 장면. 출근길·작업실·카페 같은 현대 한국 생활 공간에서 자기 방식대로 움직이는 뒷모습이나 옆모습.',
  hook: '노래의 후렴. 바람이 주인공 쪽으로 불어오며 빛이 번지는 가장 시원하고 상징적인 장면. 넓은 하늘·옥상·강변처럼 탁 트인 곳.',
  verse2: '조금 지치고 흔들린 밤, 그래도 다시 숨을 고르는 장면. 버스 창가·방 안 스탠드 불빛처럼 차분하고 따뜻한 분위기.',
  bridge: '계절과 해가 바뀌는 전환 장면. 달력이 넘어가듯 하늘빛이 바뀌고 길이 갈라지는 교차로나 다리 위.',
  outro: '마지막 장면. 해 질 녘이나 새벽빛 속에서 앞으로 걸어가는 주인공의 멀어지는 뒷모습. 여운이 남는 넓은 구도.'
};
const TOPIC_SCENE = {
  self: '한 사람의 일상과 인생 전체의 흐름이 느껴지는 장면.',
  love: '연애·인연 이야기. 두 사람 사이의 거리와 설렘이 느껴지는 데이트 장면(카페·골목·버스 정류장 등), 인물은 실루엣이나 뒷모습.',
  wealth: '돈과 생활 이야기. 지갑·통장·가계부·시장·도시 야경처럼 돈의 흐름이 느껴지는 현대 생활 소품과 공간.',
  career: '일과 커리어 이야기. 사무실·작업실·회의실·출근길 지하철처럼 일하는 공간과 소품.',
  newyear: '새해 신년운세 이야기. 새 달력 첫 장·해돋이·복주머니·한지 등불처럼 새해를 여는 소품과 풍경.'
};
const EL_MOTIF = { 목: '초록 잎과 나무, 새싹, 봄바람', 화: '붉은 노을과 햇빛, 등불, 따뜻한 불빛', 토: '노란 흙빛 들판과 산, 단단한 땅', 금: '하얀 금속광, 맑은 겨울 하늘, 반짝이는 결정', 수: '푸른 물결과 비, 강물, 밤바다' };
function panelPrompt(slot, extra) {
  return '세로 9:16 뮤직비디오 한 장면(랩 뮤직비디오). 한국 웹툰 같은 시네마틱 일러스트, 영화 같은 조명. 글자·로고·자막·워터마크는 그리지 않는다. 실존 인물·유명인 얼굴은 그리지 않는다.\n주제: ' + (TOPIC_SCENE[slot.topic] || TOPIC_SCENE.self) + '\n장면: ' + SECTION_SCENE[slot.section] +
    '\n색과 상징(' + slot.el + ' 기운): ' + EL_MOTIF[slot.el] + '이 화면 전체 색감과 소품에 은은하게 녹아든다.' + (extra ? '\n추가 요청: ' + String(extra).slice(0, 400) : '');
}
async function panelPost(request, env, p) {
  if (!isAdmin(request, env)) return json({ error: 'unauthorized' }, 401);
  const slot = L.PANEL_SLOTS.find(s => s.id === (p && p.slot)); if (!slot) return json({ error: '패널 칸 이름이 올바르지 않습니다' }, 400);
  const map = await panelsOf(env), old = map[slot.id];
  const dropOld = async () => { const m = old && /^\/api\/clipfile\?k=(mvpanel-[\w.-]+)$/.exec(old.url || ''); if (m) { try { await deleteDerivedFile(env, m[1]); } catch { } } };
  if (p.clear) { delete map[slot.id]; await env.GLOSSARY_KV.put(PANELS, JSON.stringify(map)); await dropOld(); return json({ ok: true, panels: map }); }
  if (p.uploadKey) {
    if (!/^[\w.-]{1,120}$/.test(p.uploadKey) || !env.CLIPS_R2 || !(await env.CLIPS_R2.head(p.uploadKey))) return json({ error: '올린 이미지를 찾을 수 없습니다' }, 400);
    map[slot.id] = { url: '/api/clipfile?k=' + p.uploadKey, by: 'upload', at: Date.now() }; await env.GLOSSARY_KV.put(PANELS, JSON.stringify(map));
    return json({ ok: true, panels: map });
  }
  if (p.generate) {
    if (!env.CLIPS_R2) return json({ error: 'R2 바인딩(CLIPS_R2)이 없습니다' }, 501);
    let g; try { g = await generate(env, panelPrompt(slot, p.extra), p.provider === 'openai' || p.provider === 'gemini' ? p.provider : '', null); } catch (e) { return json({ error: e.message }, 502); }
    const k = 'mvpanel-' + slot.id + '-' + Array.from(crypto.getRandomValues(new Uint8Array(4)), x => x.toString(16).padStart(2, '0')).join('') + '.' + g.ext;
    await putDerivedFile(env, k, g.bytes, { httpMetadata: { contentType: g.mime } });
    map[slot.id] = { url: '/api/clipfile?k=' + k, by: g.provider + ':' + g.model, at: Date.now() }; await env.GLOSSARY_KV.put(PANELS, JSON.stringify(map)); await dropOld();
    return json({ ok: true, panels: map });
  }
  return json({ error: 'generate·uploadKey·clear 중 하나가 필요합니다' }, 400);
}
