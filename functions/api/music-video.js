// 내 사주 뮤직비디오 — 일레븐랩스 음악 API(공식)로 노래를 만들고 R2 에 보관한다. 패널 이미지는 관리자 '뮤직비디오 패널'에서 만든다.
// 공개 스위치: /api/luck-flags 의 musicVideo(기본 꺼짐). 꺼져 있으면 관리자만 쓸 수 있다.
// 공개 범위: 유료 주제(worlds:config access=paid) 안에서만, 그 주제를 산 회원(또는 관리자)만 노래를 만든다.
//
// POST /api/music-video { sd, topic } | { topic:'newyear', birth, year } — topic: self(종합풀이 w1)·love(w3)·wealth(w2)·career(w7)·newyear(토정비결 신년운세 tj<연도>)
//      가사는 서버가 사주 값(+승인된 토정 현대어 풀이)으로 다시 조합한다(브라우저가 보낸 가사는 받지 않는다).
//      일레븐랩스는 구간마다 길이(composition_plan chunks duration_ms)를 지켜 주므로 패널·자막 시점이 정확히 맞는다.
//      → { ok, song:{title, sections, totalMs}, audio, panels } | 202 { ok:false, pending:true }(같은 곡을 만드는 중) | { ok:false, error, locked? }
// GET  /api/music-video?a=<열쇠>                 — 만든 노래(mp3) 재생, Range 지원. 열쇠는 사주 조합의 sha256
// POST /api/music-video { …곡 요청과 같은 값, fillPanel:<칸> } — 사용자 화면: 이 곡의 빈 패널 칸 하나를 만든다(같은 권한·이 곡의 칸만·칸 잠금·하루 상한 MV_PANEL_DAILY_LIMIT 기본 120장)
// GET  /api/music-video?admin=1&day=<일주>&g=<F|M> — 관리자: 그 일주·성별의 30칸(주제5×구간6)·키 설정 여부·오늘 생성 수·상한
// POST /api/music-video { panel:{ slot, generate|uploadKey|clear|clearVideo|video:{startKey,extra?}, extra? } } — 관리자: 패널 이미지 만들기·올리기·비우기, Kling 영상 만들기
// GET  /api/music-video?vt=<칸>                  — 관리자: 그 칸의 영상 작업 확인(끝났으면 R2 저장 후 칸에 연결)
// 패널 연출: 갱스터 힙합 뮤직비디오를 유쾌하게 패러디 + 한국적 요소(아래 MV_LOOK). 영상은 KLING_API_KEY(또는 KLING_ACCESS_KEY·KLING_SECRET_KEY)
//
// 필요: GLOSSARY_KV · CLIPS_R2 · ELEVENLABS_API_KEY(서버 비밀값, 브라우저로 내려 보내지 않는다)
// 선택: ELEVENLABS_MUSIC_MODEL(기본 music_v2_5) · MV_DAILY_LIMIT(하루 새 곡 상한, 기본 30)
// 캐시: 같은 사주 조합(가사·스타일·모델이 같음)이면 다시 만들지 않는다 — KV mv:song:<열쇠> + R2 mv-<열쇠>.mp3
// 상업 이용: 일레븐랩스 음악 약관상 사업자는 Scale(직원 10명 미만) 이상 요금제 계정의 키를 써야 한다.
import { json, isAdmin } from '../_lib.js';
import { sajuKey, memberOf, worldAccess, ownedWorlds, cleanBirth } from '../_commerce.js';
import { generate } from '../_panelart.js';
import { klingEnabled, KLING_ENV_HELP, klingSubmit, klingQuery, toB64 } from '../_kling.js';
import { putDerivedFile, deleteDerivedFile } from '../_original-assets.js';
import { NY, YEARS } from '../_newyear-runtime.js';   // 만세력 엔진·토정 엔진·토정 현대어 풀이(신년운세와 같은 파일)
import { newyearGate } from '../_newyear.js';
import { loadContent, applyContent } from '../_newyear-content.js';
import '../../report/v2/saju-data.js';
import '../../report/v2/music-video-lyrics-topics.js';
import '../../report/v2/music-video-lyrics.js';

const L = globalThis.ReportV2.MusicVideoLyrics;
const ELEVEN = 'https://api.elevenlabs.io/v1/music?output_format=mp3_44100_128';
const SONG = k => 'mv:song:' + k, COUNT = d => 'mv:count:' + d, PCOUNT = d => 'mv:pcount:' + d;
// 패널은 칸마다 KV 키 하나(mv:panel:<칸>) — 여러 사용자가 동시에 채워도 서로 덮어쓰지 않는다(칸 조합 3,600가지)
const PANEL = id => 'mv:panel:' + id;
async function getPanels(env, ids) { const out = {}; await Promise.all([...new Set(ids)].map(async id => { try { const v = await env.GLOSSARY_KV.get(PANEL(id), 'json'); if (v && v.url) out[id] = v; } catch { } })); return out; }
const putPanel = (env, id, v) => env.GLOSSARY_KV.put(PANEL(id), JSON.stringify(v));
const delPanel = (env, id) => env.GLOSSARY_KV.delete(PANEL(id));
const songPanelIds = song => [...new Set(song.sections.flatMap(s => [s.panel, s.panelFallback]))];
const imageReady = env => !!((env.OPENAI_API_KEY || env.GEMINI_API_KEY) && env.CLIPS_R2);
const panelLimitOf = env => { const n = parseInt(env.MV_PANEL_DAILY_LIMIT, 10); return Number.isFinite(n) && n >= 0 ? n : 120; };
const KEY_RE = /^[0-9a-f]{64}$/, PENDING_MS = 4 * 60 * 1000;
const modelOf = env => (env.ELEVENLABS_MUSIC_MODEL === 'music_v2' || env.ELEVENLABS_MUSIC_MODEL === 'music_v2_5') ? env.ELEVENLABS_MUSIC_MODEL : 'music_v2_5';
const limitOf = env => { const n = parseInt(env.MV_DAILY_LIMIT, 10); return Number.isFinite(n) && n >= 0 ? n : 30; };
const today = () => new Date(Date.now() + 9 * 3600e3).toISOString().slice(0, 10);

async function sha256(s) { const d = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)); return [...new Uint8Array(d)].map(b => b.toString(16).padStart(2, '0')).join(''); }
async function flagOn(env) { try { const d = await env.GLOSSARY_KV.get('luckenv:flags', 'json'); return !!(d && d.musicVideo === true); } catch { return false; } }
const publicSong = (s, rec) => ({ title: s.title, topic: s.topic, topicKo: s.topicKo, totalMs: s.totalMs, hero: s.hero, timing: (rec && rec.timing) || null, sync: (rec && rec.sync) || null, sections: s.sections.map(x => ({ id: x.id, name: x.name, lines: x.lines, startMs: x.startMs, durationMs: x.durationMs, panel: x.panel, panelFallback: x.panelFallback, el: x.el })) });

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

// 요청 → 곡 입력값 + 권한(노래 만들기·패널 채우기 공통). 실패하면 { res: 응답 }
async function songFor(request, env, b) {
  const topic = L.TOPICS.includes(b && b.topic) ? b.topic : 'self';
  if (topic === 'newyear') {
    // 신년운세: 출생 정보로 서버가 직접 계산한다(괘·사주 모두). 토정 현대어 풀이는 관리자 검수(reviewed)를 마친 문구만 쓴다. 출생 정보는 저장하지 않는다.
    const r = await newyearInputs(request, env, b); if (r.error) return { res: json({ ok: false, error: r.error, locked: r.locked || null, detail: r.detail }, r.status) };
    return { x: r.x, g: r.g };
  }
  const x = L.inputsOf(b && b.sd, topic); if (!x) return { res: json({ ok: false, error: 'bad-saju' }, 400) };
  const g = await gate(request, env, L.TOPIC_WORLD[topic], b.sd); if (!g.ok) return { res: json({ ok: false, error: g.error, locked: g.locked || null }, g.status) };
  return { x, g };
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

async function elevenOnce(env, model, plan) {
  const r = await fetch(ELEVEN, { method: 'POST', headers: { 'xi-api-key': env.ELEVENLABS_API_KEY, 'content-type': 'application/json', accept: 'audio/mpeg' },
    body: JSON.stringify({ composition_plan: plan, model_id: model }) });
  const ct = r.headers.get('content-type') || '';
  if (!r.ok || /json|text/.test(ct)) { let msg = ''; try { msg = (await r.text()).slice(0, 600); } catch { } const e = new Error(model + ' 실패(HTTP ' + r.status + '): ' + msg); e.status = r.status; throw e; }
  const bytes = new Uint8Array(await r.arrayBuffer()); if (bytes.length < 1000) throw new Error(model + ': 음악 파일이 비어 있습니다');
  return bytes;
}
// 최신 모델(music_v2_5 chunks 형식)로 먼저 만들고, 요금제·형식 문제로 거절되면(4xx, 401·429 제외) music_v1(sections 형식)으로 한 번 더 시도한다
async function callEleven(env, song) {
  const model = modelOf(env);
  try { return { bytes: await elevenOnce(env, model, L.toElevenPlan(song)), model }; }
  catch (e) {
    if (!(e.status >= 400 && e.status < 500) || e.status === 401 || e.status === 429) throw e;
    try { return { bytes: await elevenOnce(env, 'music_v1', L.toElevenV1Plan(song)), model: 'music_v1' }; }
    catch (e2) { throw new Error(e.message + '\n→ music_v1 재시도도 ' + e2.message); }
  }
}

export async function onRequestPost({ request, env }) {
  if (!env.GLOSSARY_KV) return json({ error: 'KV 바인딩(GLOSSARY_KV)이 없습니다' }, 501);
  let b; try { b = await request.json(); } catch { return json({ error: 'bad-payload' }, 400); }
  if (b && b.panel) return panelPost(request, env, b.panel);

  const sf = await songFor(request, env, b); if (sf.res) return sf.res;
  const x = sf.x, g = sf.g;
  if (b && b.fillPanel) return fillPanel(env, request, b.fillPanel, L.fromInputs(x), g);
  if (b && b.checkVideos) return checkVideos(env, L.fromInputs(x));
  if (!env.CLIPS_R2) return json({ ok: false, error: 'R2 바인딩(CLIPS_R2)이 없습니다' }, 501);

  const song = L.fromInputs(x), key = await sha256(JSON.stringify({ v: song.version, m: modelOf(env), lyrics: song.lyrics, style: song.style, d: song.sections.map(s => s.durationMs) }));
  // panels: 이 곡의 칸만(주인공 일주·성별·주제), fill: 빈 칸을 화면이 하나씩 채워 달라고 할 수 있는지
  const reply = async r => json({ ok: true, key, song: publicSong(song, r), audio: '/api/music-video?a=' + key, panels: await getPanels(env, songPanelIds(song)), fill: imageReady(env), videosPending: await pendingVideos(env, songPanelIds(song)) });
  const rec = await env.GLOSSARY_KV.get(SONG(key), 'json');
  if (rec && rec.status === 'done') return reply(needSync(rec) ? await syncTiming(env, key, song, rec, null) : rec);   // 예전에 만든 곡도 처음 열 때 한 번 자막 시각을 맞춘다
  if (rec && rec.status === 'pending' && Date.now() - rec.at < PENDING_MS) return json({ ok: false, pending: true, key }, 202);
  if (!env.ELEVENLABS_API_KEY) return json({ ok: false, error: '음악 생성 키(ELEVENLABS_API_KEY)가 설정되지 않았습니다' }, 501);

  const day = today(), used = parseInt(await env.GLOSSARY_KV.get(COUNT(day)), 10) || 0;
  if (!g.admin && used >= limitOf(env)) return json({ ok: false, error: 'daily-limit' }, 429);
  await env.GLOSSARY_KV.put(SONG(key), JSON.stringify({ status: 'pending', at: Date.now() }), { expirationTtl: 600 });
  await env.GLOSSARY_KV.put(COUNT(day), String(used + 1), { expirationTtl: 3 * 86400 });
  let bytes;
  let usedModel = modelOf(env);
  try { const out = await callEleven(env, song); bytes = out.bytes; usedModel = out.model; }
  catch (e) {
    await env.GLOSSARY_KV.delete(SONG(key));
    await env.GLOSSARY_KV.put('mv:lastError', JSON.stringify({ at: Date.now(), topic: song.topic, message: String(e.message).slice(0, 1200) }), { expirationTtl: 7 * 86400 });   // 관리자 화면에 보여 준다(키·개인정보 없음)
    return json({ ok: false, error: 'generate-failed', detail: g.admin ? e.message : undefined }, 502);
  }
  await putDerivedFile(env, 'mv-' + key + '.mp3', bytes, { httpMetadata: { contentType: 'audio/mpeg' } });
  const fresh = { status: 'done', at: Date.now(), bytes: bytes.length, model: usedModel, title: song.title, topic: song.topic, version: song.version };
  await env.GLOSSARY_KV.put(SONG(key), JSON.stringify(fresh));
  return reply(await syncTiming(env, key, song, fresh, bytes));
}

// ── 자막 시각 맞추기: 만든 노래를 일레븐랩스 음성 인식(Scribe)으로 단어별 시각을 받아 가사 줄마다 실제 부르는 시각을 찾는다.
//    실패하면 timing 없이(화면은 구간 비율) 내보내고, 오류는 관리자 화면 '마지막 오류'에 남긴다. 실패한 곡은 6시간 뒤 다시 시도.
//    키에 음성 인식(speech_to_text) 권한이 있어야 한다. 3분 곡 한 번 = 음성 인식 3분 분량 크레딧.
const STT = 'https://api.elevenlabs.io/v1/speech-to-text', SYNC_V = 1;
const sttModel = env => /^scribe_[\w]{1,30}$/.test(env.ELEVENLABS_STT_MODEL || '') ? env.ELEVENLABS_STT_MODEL : 'scribe_v2';
const needSync = rec => rec.syncVersion !== SYNC_V || (rec.sync === 'error' && Date.now() - (rec.syncAt || 0) > 6 * 3600 * 1000);
async function transcribe(env, bytes) {
  const fd = new FormData();
  fd.append('model_id', sttModel(env)); fd.append('language_code', 'ko'); fd.append('timestamps_granularity', 'word'); fd.append('tag_audio_events', 'false');
  fd.append('file', new Blob([bytes], { type: 'audio/mpeg' }), 'song.mp3');
  const r = await fetch(STT, { method: 'POST', headers: { 'xi-api-key': env.ELEVENLABS_API_KEY }, body: fd });
  let d = null; try { d = await r.json(); } catch { d = null; }
  if (!r.ok || !d || !Array.isArray(d.words)) throw new Error('자막 맞추기(음성 인식 ' + sttModel(env) + ') 실패(HTTP ' + r.status + '): ' + JSON.stringify(d).slice(0, 500));
  return d.words;
}
async function syncTiming(env, key, song, rec, bytes) {
  try {
    if (!env.ELEVENLABS_API_KEY) throw new Error('ELEVENLABS_API_KEY 가 없어 자막 시각을 맞추지 못했습니다');
    if (!bytes) { const o = await env.CLIPS_R2.get('mv-' + key + '.mp3'); if (!o) throw new Error('노래 파일이 없습니다'); bytes = new Uint8Array(await o.arrayBuffer()); }
    const timing = L.alignToTranscript(song, await transcribe(env, bytes));
    rec.timing = timing; rec.sync = timing ? 'ok' : 'nomatch';
  } catch (e) {
    rec.timing = null; rec.sync = 'error';
    await env.GLOSSARY_KV.put('mv:lastError', JSON.stringify({ at: Date.now(), topic: song.topic, message: String(e.message).slice(0, 1200) }), { expirationTtl: 7 * 86400 });
  }
  rec.syncAt = Date.now(); rec.syncVersion = SYNC_V;
  await env.GLOSSARY_KV.put(SONG(key), JSON.stringify(rec));
  return rec;
}

export async function onRequestGet({ request, env }) {
  const u = new URL(request.url);
  const a = u.searchParams.get('a');
  if (a !== null) return audio(request, env, a);
  if (u.searchParams.get('vt')) { if (!isAdmin(request, env)) return json({ error: 'unauthorized' }, 401); if (!L.parsePanelId(u.searchParams.get('vt'))) return json({ error: 'bad-slot' }, 400); return videoCheck(env, u.searchParams.get('vt')); }
  if (u.searchParams.get('admin')) {
    if (!isAdmin(request, env)) return json({ error: 'unauthorized' }, 401);
    // 관리자 화면은 일주·성별 하나씩 본다: 그 일주·성별의 주제 5 × 구간 6 = 30칸
    const day = L.DAYS.includes(u.searchParams.get('day')) ? u.searchParams.get('day') : L.DAYS[0], gd = u.searchParams.get('g') === 'M' ? 'M' : 'F';
    const ids = L.TOPICS.flatMap(t => L.panelSlots(t, gd, day).map(s => s.id));
    const vl = typeof env.GLOSSARY_KV.list === 'function' ? await env.GLOSSARY_KV.list({ prefix: 'mv:vt:' }) : null, vtasks = ((vl && vl.keys) || []).map(k => k.name.slice(6));
    const used = parseInt(await env.GLOSSARY_KV.get(COUNT(today())), 10) || 0, pused = parseInt(await env.GLOSSARY_KV.get(PCOUNT(today())), 10) || 0;
    return json({ day, gender: gd, hero: L.heroOf(day, gd), panels: await getPanels(env, ids), version: L.VERSION, flag: await flagOn(env), today: used, limit: limitOf(env), panelToday: pused, panelLimit: panelLimitOf(env), videoToday: parseInt(await env.GLOSSARY_KV.get(VCOUNT(today())), 10) || 0, videoLimit: videoLimitOf(env), model: modelOf(env),
      vtasks, lastError: await env.GLOSSARY_KV.get('mv:lastError', 'json'), lastPanelError: await env.GLOSSARY_KV.get('mv:lastPanelError', 'json'), configured: { music: !!env.ELEVENLABS_API_KEY, image: !!(env.OPENAI_API_KEY || env.GEMINI_API_KEY), video: klingEnabled(env), r2: !!env.CLIPS_R2 } });
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

/* ── 패널 이미지·영상
   연출 방향(사용자 요청 2026-11-18): 힙합 뮤직비디오의 과장된 스웩 연출을 유쾌하게 패러디하되 한국적인 요소를 섞는다.
   주인공(2026-11-19): 사주의 일주 — 일간 오행 색 + 일지 동물을 한 의인화 래퍼(사주 성별). 크루는 일지 삼합 동물, 연애운 짝은 육합 동물.
   이미지 모델 안전 필터: 금지할 것을 단어로 적어도 요청이 거절될 수 있어 지시문은 긍정형으로만 쓴다(2026-11-18 패널 502 원인). */
/* 패널 지시문 2판(2026-11-19): 밋밋한 회색 톤·들쭉날쭉한 화풍·원형 프레임·아래 흰 여백을 고친다.
   - 원형 프레임은 '어안 렌즈'에서, 아래 흰 여백은 '아래 1/3 을 비워 둔다'에서 나왔다 → 직선 초광각 렌즈·전체 화면 채움·아래는 어두운 바닥으로.
   - 모든 칸이 같은 화풍이 되도록 공통 스타일 블록(MV_STYLE)을 맨 앞에 두고, 구간별로 카메라·렌즈·조명·포즈(SECTION_SHOT)를 정한다.
   - 지시문을 바꾸면 PANEL_PROMPT_V 를 올린다. 칸 KV 키(mv:panel:<칸>)는 그대로라 이미 만든 그림은 남고, 새로 만들거나 '다시' 누른 칸만 새 지시문을 쓴다(기록에 pv 로 남는다). */
const PANEL_PROMPT_V = 2;
const MV_STYLE = '[공통 화풍 — 모든 칸 동일] 세로 9:16 전체 화면을 가장자리까지 꽉 채운 직사각형 시네마틱 필름 스틸 한 장(풀 블리드, 테두리 없는 한 장면). ' +
  '고예산 힙합 뮤직비디오의 한 프레임처럼: 하이엔드 3D 애니메이션 영화 수준의 시네마틱 캐릭터 렌더, 털 한 올·가죽·새틴·금속 질감이 살아 있는 초정밀 디테일, 얕은 심도와 부드러운 보케, 아나모픽 렌즈 플레어, 은은한 필름 그레인. ' +
  '조명: 강한 역광 림라이트로 캐릭터 윤곽이 빛나고, 볼류메트릭 스모크와 빛줄기, 젖은 바닥에 비친 네온 반사. 색: 깊고 짙은 검정 위에 채도 높은 네온 색이 터지는 강한 명암 대비의 컬러 그레이딩, 선명하고 쨍한 색감. ' +
  '주인공은 화면 중앙 2/3 안에 크고 또렷하게, 얼굴과 의상이 가장 밝게. 화면 아래쪽은 어두운 바닥·젖은 아스팔트·물결이 화면 끝까지 이어져 자막이 잘 읽히게.';
const MV_LOOK = '힙합 뮤직비디오 특유의 과장된 스웩 연출을 유쾌하게 패러디한 한국풍 장면 — 자신감 넘치는 포즈, 슬로모션 같은 순간 포착. 누구나 웃으며 볼 수 있는 유쾌한 분위기.' +
  ' 한국적 요소를 섞는다: 갓에 선글라스, 한복 소매를 단 트레이닝복이나 퍼 코트, 금 체인 대신 엽전 꾸러미·노리개 목걸이, 부채, 단청 무늬, 한옥 골목, 포장마차, 편의점 앞 파라솔, 한강 다리 야경, 노래방 네온, 배달 스쿠터·마을버스·경운기를 튜닝한 차 같은 것 중 장면에 맞는 두세 가지.' +
  ' 인물은 모두 동물 얼굴을 한 의인화 캐릭터(사람 몸, 성인 체형)로, 손에는 마이크·부채·엽전 꾸러미 같은 소품을 든다. 화면에는 글자·간판 문구·로고·자막 없이 그림만(간판은 빛나는 색면과 무늬로).';
/* 구간별 연출 변형(2026-11-19 "단조롭다"): 구간마다 장소·카메라·렌즈·조명·포즈가 다른 변형 5개. 렌즈는 모두 직선(렉티리니어) 렌즈.
   칸 이름으로 고르므로 같은 칸은 늘 같은 변형, 일주·주제·성별이 다르면 다른 변형이 나온다. 관리자가 '다시' 누르면 새 변형을 고른다. */
const SECTION_SHOT = {
  intro: [
    '밤 한옥 골목. 로우앵글 풀샷, 24mm 직선 광각 렌즈. 주인공 뒤에서 튜닝한 마을버스 헤드라이트가 강한 역광으로 쏟아지고 스모크 속에 빛줄기가 갈라진다. 주인공은 선글라스를 내리며 렌즈를 똑바로 본다.',
    '노래방 건물 옥상. 위에서 비스듬히 내려다보는 하이앵글 와이드샷, 28mm. 옥상 난간에 걸터앉아 도시 불빛을 보던 주인공이 고개를 들어 카메라를 본다. 보라·분홍 네온이 위에서 쏟아지고 뒤로 도시 야경이 보케로 번진다.',
    '긴 콘크리트 지하 터널. 정면 대칭 구도, 35mm. 양쪽 천장 조명 줄이 소실점으로 이어지고, 튜닝한 경운기 보닛 위에 선 주인공이 등장한다. 바닥 물웅덩이에 조명이 길게 비친다.',
    '한옥 대문이 열리는 순간. 문틈 사이로 보는 프레임 속 프레임 구도, 35mm. 대문 너머로 강한 백라이트와 스모크, 윤곽만 빛나는 실루엣으로 걸어 나오는 주인공과 크루.',
    '안개 낀 새벽 전통시장 골목. 얼굴과 상반신을 크게 잡은 클로즈업, 50mm. 선글라스 렌즈에 네온 색면이 비치고 엽전 목걸이가 반짝인다. 측면에서 강한 림라이트.'
  ],
  verse1: [
    '편의점 앞 파라솔. 눈높이 미디엄 와이드샷, 35mm. 주인공이 앞에, 크루가 V자 대형으로 뒤에 서서 각자 과장된 스웩 포즈. 형광 간판 빛과 가장자리 네온 림라이트.',
    '포장마차 안. 어깨 너머로 잡은 오버숄더 샷, 40mm. 주황 전구와 김이 오르는 냄비, 주인공이 의자에 한 발 올리고 랩하고 크루는 국자를 마이크처럼 든다.',
    '동네 놀이터 정글짐. 로우앵글 단체 샷, 28mm. 크루가 정글짐 칸칸이 매달리거나 걸터앉아 포즈, 주인공은 꼭대기에. 가로등 스포트라이트와 보랏빛 밤하늘.',
    '세탁소·철물점이 늘어선 골목 벽화 앞. 옆에서 따라가며 찍는 측면 트래킹샷, 50mm. 주인공이 걸으며 손짓으로 랩하고 크루가 뒤따라 걷는다. 배경은 움직임에 살짝 흐려진다.',
    '빨랫줄 전구가 걸린 옥상 평상. 바로 위에서 내려다보는 버드아이 샷, 24mm. 크루가 평상 둘레에 원을 그리며 앉고 주인공이 가운데 서서 부채를 활짝 편다.'
  ],
  hook: [
    '한강 다리 야경. 극단적 로우앵글 히어로 샷, 16mm 직선 초광각 렌즈. 주인공이 한 발 내딛고 마이크를 높이 든 정점의 순간, 크루가 뒤에서 같은 동작으로 춤춘다. 강한 백라이트와 볼류메트릭 스모크, 공중에 흩날리는 엽전·꽃잎.',
    '단청 기와지붕 위. 높은 곳에서 비스듬히 잡은 와이드 샷, 24mm. 크루가 기와지붕 위에서 대형을 맞춰 춤추고, 뒤로 커다란 보름달과 도시 불빛. 바람에 한복 소매가 크게 펄럭인다.',
    '거대한 노래방 무대. 정면 대칭 구도, 35mm. 뒤 화면 벽이 일간 색으로 폭발하듯 빛나고 스포트라이트 빔이 교차한다. 가운데 주인공이 점프한 순간이 공중에 멈춘 듯하다.',
    '비 그친 사거리 한복판. 회전하는 카메라 느낌의 28mm, 배경은 원을 그리며 흐려진다. 주인공이 부채를 활짝 펴고 회전하고, 바닥 물웅덩이에 네온이 번진다.',
    '한지 등불 수백 개가 걸린 전통시장 아케이드. 로우앵글, 20mm. 크루가 양옆으로 늘어서 같은 동작을 하고, 금빛 종이 꽃가루가 천장에서 쏟아진다.'
  ],
  verse2: [
    '비 오는 밤 노래방 네온 아래. 클로즈업에 가까운 미디엄샷, 85mm 망원 렌즈, 얕은 심도. 빗방울이 네온에 반짝이고 젖은 털에 색이 비친다. 고개를 숙였다가 렌즈를 올려다보는 단단한 눈빛.',
    '막차 버스 창가. 창밖에서 유리창 너머로 들여다보는 구도, 50mm. 빗물 맺힌 유리 위로 도시 불빛이 보케로 흐르고, 창에 기대 조용히 랩하는 주인공.',
    '텅 빈 지하철 승강장. 멀리서 잡은 와이드샷, 35mm. 넓은 공간에 주인공 혼자 서 있고, 차가운 형광등 사이로 따뜻한 스포트라이트 한 줄기가 주인공만 비춘다.',
    '골목 끝 자판기 불빛만 있는 밤. 옆얼굴 클로즈업, 70mm. 자판기 빛이 얼굴 반쪽만 비추는 강한 명암 대비, 차가운 공기에 하얀 입김.',
    '비 오는 한옥 처마 아래. 물웅덩이에 위아래로 비친 대칭 구도, 35mm. 처마 끝 빗줄기가 네온 빛을 받아 빛나는 커튼처럼 드리운다.'
  ],
  bridge: [
    '다리 위, 하늘이 남색에서 노을빛으로 바뀌는 순간. 살짝 기울인 더치 앵글 미디엄 풀샷, 50mm. 주인공이 슬로모션으로 돌아서고 부채·엽전 꾸러미가 공중에 멈춘 듯 떠 있다.',
    '육교 위. 하늘 절반은 남색, 절반은 주황빛. 역광 실루엣 샷, 35mm. 바람에 코트 자락이 날리고 아래로 지나가는 차 불빛이 긴 빛줄기로 그어진다.',
    '거울로 둘러싸인 노래방 복도. 반사가 끝없이 이어지는 구도, 35mm. 거울마다 다른 포즈의 주인공이 비치고 일간 색 네온 튜브가 길게 이어진다.',
    '갈대가 흔들리는 강변. 하늘을 크게 담은 로우앵글, 24mm. 구름이 빠르게 흐르고, 바람에 흩날린 엽전이 노을빛을 반사한다.',
    '시간이 멈춘 순간. 공중에 멈춘 빗방울과 부채 사이로 주인공만 움직이는 미디엄 풀샷, 50mm. 측면에서 들어오는 강한 키라이트.'
  ],
  outro: [
    '동이 트는 강변. 뒤에서 본 와이드샷, 35mm. 금빛 해가 정면 역광으로 비치고 크루와 주인공의 긴 그림자가 카메라 쪽으로 뻗는다. 주인공만 어깨 너머로 돌아보며 웃는다.',
    '첫차가 다니는 새벽 골목. 하이앵글 와이드샷, 24mm. 크루가 서로 하이파이브를 하고, 가로등이 하나둘 꺼지며 하늘이 분홍빛으로 밝아온다.',
    '도시가 내려다보이는 언덕 계단 꼭대기. 로우앵글, 28mm. 떠오르는 해 앞에 크루가 나란히 앉아 여유롭게 쉬고, 주인공은 엽전 목걸이를 고쳐 맨다.',
    '장사를 마친 포장마차의 아침. 따뜻한 미디엄샷, 50mm. 주인공이 선글라스를 벗어 옷깃에 걸고 활짝 웃는다. 김 사이로 아침 햇살 빛줄기.',
    '한강 다리 위로 멀어지는 튜닝 스쿠터 행렬. 뒤에서 잡은 와이드샷, 35mm. 미등 빛줄기가 길게 이어지고 그 끝에 해가 떠오른다.'
  ]
};
/* 주인공 의상 변형: 칸마다 하나(구간 변형과 따로 골라 조합이 늘어난다) */
const OUTFIT = [
  '한복 소매를 단 오버사이즈 트랙수트, 갓에 둥근 선글라스',
  '단청 무늬 자수를 놓은 퍼 코트와 엽전 꾸러미 목걸이',
  '비단 두루마기를 롱 트렌치코트처럼 걸치고 하이탑 운동화',
  '한복 저고리 모양의 크롭 재킷과 와이드 카고 팬츠, 노리개 체인',
  '민화 호랑이·까치 무늬 봄버 재킷과 버킷햇',
  '광택 나는 새틴 한복 셋업과 금빛 부채'
];
const pick = (arr, key) => arr[L.hash(key) % arr.length];
// 이 칸의 연출 변형. seed 가 있으면(관리자 '다시') 다른 변형이 나올 수 있다
function variantOf(slot, seed) {
  const k = slot.id + (seed ? '|' + seed : '');
  return { shot: pick(SECTION_SHOT[slot.section], 'shot|' + k), outfit: pick(OUTFIT, 'outfit|' + k) };
}
const SECTION_SCENE = {
  intro: '뮤직비디오 오프닝 — 주인공이 처음 등장하는 강렬한 첫 장면.',
  verse1: '주인공의 기질을 자랑하는 랩 벌스 — 동네 공간을 자기 무대처럼 쓰며 크루와 함께 과장된 스웩.',
  hook: '후렴 — 가장 화려한 클라이맥스, 크루 전체가 하나로 움직이는 장면.',
  verse2: '힘들었던 이야기를 하는 벌스 — 혼자 있는, 살짝 쓸쓸하지만 멋있는 장면.',
  bridge: '비트가 바뀌는 브리지 — 분위기가 뒤집히는 전환의 순간.',
  outro: '엔딩 — 여운이 남는 마지막 장면, 밝아오는 빛.'
};
const TOPIC_SCENE = {
  self: '종합 — 주인공 한 사람의 개성과 인생 흐름이 드러나는 장면.',
  love: '연애운 — 주인공과 짝이 커플 래퍼 듀엣처럼 등장. 한강 피크닉 돗자리·포장마차 데이트·노래방 듀엣 같은 설레는 장면을 힙합 뮤비 문법으로 과장.',
  wealth: '재물운 — 부자 자랑하는 힙합 뮤비 장면을 한국식으로 패러디: 엽전 꾸러미·복주머니·금두꺼비·가계부와 적금 통장을 트로피처럼 들고 뽐내는 장면.',
  career: '커리어운 — 사무실·작업실·출근길 지하철을 무대로 한 오피스 힙합 크루 패러디: 정장 위에 한복 조끼, 사원증 목걸이를 체인처럼, 서류 가방을 붐박스처럼 든 장면.',
  newyear: '토정비결 신년운세 — 새해 패러디: 해돋이 앞에서 세배하는 크루, 복주머니·떡국·연날리기·한지 등불을 힙합 뮤비 소품처럼 과장한 장면.'
};
const EL_MOTIF = { 목: '에메랄드 초록 네온과 대나무·나뭇잎 그림자, 포인트로 금빛', 화: '진홍·주홍 네온과 불꽃 같은 조명·노을, 포인트로 호박색', 토: '황금·호박빛 조명과 흙빛·구릿빛 질감, 포인트로 짙은 청록', 금: '진주처럼 빛나는 흰색과 크롬 은빛 광택, 그 뒤로 짙은 남색 밤과 자홍·청록 네온의 강한 대비', 수: '사파이어 블루·청록 네온과 빗물·강물 반사, 포인트로 은빛' };
function heroKo(slot) {
  const h = slot.hero, fem = slot.gender === 'F';
  return h.nameKo + ' 얼굴을 한 의인화 ' + (fem ? '여성' : '남성') + ' 래퍼(사람 몸에 ' + h.colorKo + ' ' + h.animalKo + ' 머리, ' + (fem ? '걸크러시 느낌의 당당한' : '여유 있고 당당한') + ' 스트리트 패션). 모든 장면에서 같은 모습으로 알아볼 수 있게.' +
    ' 크루: ' + h.crewKo.join('·') + ' 얼굴의 의인화 래퍼들.' + (slot.topic === 'love' ? ' 짝: ' + h.partnerKo + ' 얼굴의 의인화 캐릭터.' : '') +
    (h.motifKo ? ' 일주 상징 풍경: “' + h.motifKo + '” 의 이미지가 배경·조명·소품에 은은하게 녹아든다.' : '');
}
function heroEn(slot) {
  const h = slot.hero, fem = slot.gender === 'F';
  return 'The main character is an anthropomorphic ' + h.colorEn + ' ' + h.animalEn + ' ' + (fem ? 'female' : 'male') + ' rapper (human body, ' + h.animalEn + ' head, stylish streetwear), with a crew of ' + h.crewEn.join(' and ') + ' characters' + (slot.topic === 'love' ? ' and a ' + h.partnerEn + ' partner' : '') + '.' + (h.motifKo ? ' Symbolic backdrop of this birth pillar (Korean): ' + h.motifKo + '.' : '');
}
function panelPrompt(slot, extra, seed) {
  const v = variantOf(slot, seed);
  return MV_STYLE + '\n' + MV_LOOK + '\n주인공(사주 일주 ' + slot.day + '): ' + heroKo(slot) + '\n주제: ' + (TOPIC_SCENE[slot.topic] || TOPIC_SCENE.self) + '\n장면: ' + SECTION_SCENE[slot.section] +
    '\n오늘의 의상(주인공): ' + v.outfit + '\n촬영: ' + v.shot +
    '\n색 팔레트(일간 ' + slot.hero.el + '): ' + EL_MOTIF[slot.hero.el] + '이 주 조명색이 되어 캐릭터 림라이트·의상 포인트·소품에 강하게 드러난다.' + (extra ? '\n추가 요청: ' + String(extra).slice(0, 400) : '');
}
/* 영상(Kling 이미지 → 영상): 칸 이미지를 첫 장면으로 5초 내외 반복 재생용 컷을 만든다. 영어 지시가 더 잘 듣는다 */
const SECTION_MOTION = {
  intro: 'slow push-in from a low angle, the character slowly lowers sunglasses and looks into the camera, headlights flare',
  verse1: 'handheld camera bouncing to the beat, the crew nods and does exaggerated swagger poses, neon flickers',
  hook: 'camera orbits around the crew dancing in sync, hanbok sleeves and fans fluttering in strong wind, energetic slow-motion burst',
  verse2: 'rain falling in neon light, the character raps alone then lifts the head, gentle dolly-in',
  bridge: 'slow-motion turn of the character, props floating in the air, sky color shifting, beat-switch feeling',
  outro: 'camera slowly pulls back as the crew walks away into the sunrise, one last smile, calm ending'
};
function videoPrompt(slot, extra) {
  return 'Playful, family-friendly parody of a swaggering hip-hop music video with Korean flavor. ' + heroEn(slot) + ' Keep the starting frame characters, outfits and setting. ' + SECTION_MOTION[slot.section] +
    '. Upbeat music-video energy, smooth cinematic motion, seamless loop feeling.' + (extra ? ' Additional direction: ' + String(extra).slice(0, 400) : '');
}
const VIDEO_NEG = 'text, captions, logos, watermark, distorted faces, extra limbs, blurry, flicker';   // 위험 단어는 넣지 않는다(안전 필터가 요청 자체를 거절할 수 있음)
const VT = id => 'mv:vt:' + id, VT_AGE = 3 * 3600 * 1000, PLOCK = id => 'mv:pgen:' + id;
const fileOf = u => { const m = /^\/api\/clipfile\?k=([\w.-]{1,120})$/.exec(u || ''); return m ? m[1] : ''; };
const ownFile = k => /^mv(panel|vid|start)-/.test(k || '');
async function dropFile(env, k) { if (ownFile(k)) { try { await deleteDerivedFile(env, k); } catch { } } }
async function dropStart(env, k) { if (k) { try { await deleteDerivedFile(env, k); } catch { } } }   // 영상 시작 프레임 임시 파일(보존 원본은 deleteDerivedFile 이 거른다)
const rid = () => Array.from(crypto.getRandomValues(new Uint8Array(4)), x => x.toString(16).padStart(2, '0')).join('');

// 칸 그림 한 장 만들기(관리자·사용자 자동 채우기 공통). 실패하면 관리자 화면 '마지막 패널 오류'에 남기고 throw
async function makePanel(env, slot, extra, provider, seed) {
  let g; try { g = await generate(env, panelPrompt(slot, extra, seed), provider === 'openai' || provider === 'gemini' ? provider : '', null, { format: 'jpeg', size: '1024x1536', aspect: '9:16', quality: /^(low|medium|high)$/.test(env.MV_PANEL_QUALITY || '') ? env.MV_PANEL_QUALITY : 'high' }); }
  catch (e) { await env.GLOSSARY_KV.put('mv:lastPanelError', JSON.stringify({ at: Date.now(), slot: slot.id, message: String(e.message).slice(0, 1200) }), { expirationTtl: 7 * 86400 }); throw e; }
  if (g.fellBack && g.fellBack.length) await env.GLOSSARY_KV.put('mv:lastPanelError', JSON.stringify({ at: Date.now(), slot: slot.id, message: ('그림은 ' + g.provider + ' 로 대신 만들었습니다. 먼저 시도한 모델 실패: ' + g.fellBack.join(' / ')).slice(0, 1200) }), { expirationTtl: 7 * 86400 });
  const k = 'mvpanel-' + slot.id + '-' + rid() + '.' + g.ext;
  await putDerivedFile(env, k, g.bytes, { httpMetadata: { contentType: g.mime } });
  const rec = { url: '/api/clipfile?k=' + k, by: g.provider + ':' + g.model, at: Date.now(), pv: PANEL_PROMPT_V, seed: seed || '' };
  await putPanel(env, slot.id, rec);
  return rec;
}

// 사용자 화면: 이 곡의 빈 칸 하나를 채운다(곡을 열 권한이 있는 사람만, 이 곡의 칸만). 같은 칸을 동시에 만들지 않도록 잠근다
async function fillPanel(env, request, id, song, g) {
  if (!songPanelIds(song).includes(id)) return json({ ok: false, error: 'not-in-song' }, 400);
  const slot = L.parsePanelId(id); if (!slot) return json({ ok: false, error: 'bad-slot' }, 400);
  const have = (await getPanels(env, [id]))[id]; if (have) return json({ ok: true, id, panel: have });
  if (!imageReady(env)) return json({ ok: false, error: 'image-not-configured' }, 501);
  if (await env.GLOSSARY_KV.get(PLOCK(id))) return json({ ok: false, pending: true, id }, 202);
  const day = today(), used = parseInt(await env.GLOSSARY_KV.get(PCOUNT(day)), 10) || 0;
  if (!g.admin && used >= panelLimitOf(env)) return json({ ok: false, error: 'panel-daily-limit' }, 429);
  await env.GLOSSARY_KV.put(PLOCK(id), '1', { expirationTtl: 300 });
  await env.GLOSSARY_KV.put(PCOUNT(day), String(used + 1), { expirationTtl: 3 * 86400 });
  try { const rec = await makePanel(env, slot, '', ''); const video = await autoVideo(env, new URL(request.url).origin, slot, rec); return json({ ok: true, id, panel: rec, videoPending: video }); }
  catch (e) { return json({ ok: false, error: 'panel-failed', detail: g.admin ? e.message : undefined }, 502); }
  finally { await env.GLOSSARY_KV.delete(PLOCK(id)); }
}

// 관리자: 칸 그림 만들기·올리기·비우기, Kling 영상. 응답 panels 는 바뀐 칸 하나({ 칸: 기록 | null })
async function panelPost(request, env, p) {
  if (!isAdmin(request, env)) return json({ error: 'unauthorized' }, 401);
  const slot = L.parsePanelId(p && p.slot); if (!slot) return json({ error: '패널 칸 이름이 올바르지 않습니다' }, 400);
  const old = (await getPanels(env, [slot.id]))[slot.id];
  const done = rec => json({ ok: true, panels: { [slot.id]: rec || null } });
  const dropOld = async () => { if (old) { await dropFile(env, fileOf(old.url)); await dropFile(env, fileOf(old.video)); } };   // 이미지가 바뀌면 그 이미지로 만든 영상도 지운다
  if (p.clear) { await delPanel(env, slot.id); await env.GLOSSARY_KV.delete(VT(slot.id)); await dropOld(); return done(null); }
  if (p.clearVideo) { if (old && old.video) { await dropFile(env, fileOf(old.video)); delete old.video; delete old.videoBy; await putPanel(env, slot.id, old); } return done(old); }
  if (p.uploadKey) {
    if (!/^[\w.-]{1,120}$/.test(p.uploadKey) || !env.CLIPS_R2 || !(await env.CLIPS_R2.head(p.uploadKey))) return json({ error: '올린 이미지를 찾을 수 없습니다' }, 400);
    await dropOld(); const rec = { url: '/api/clipfile?k=' + p.uploadKey, by: 'upload', at: Date.now() }; await putPanel(env, slot.id, rec); return done(rec);
  }
  if (p.generate) {
    if (!env.CLIPS_R2) return json({ error: 'R2 바인딩(CLIPS_R2)이 없습니다' }, 501);
    let rec; try { rec = await makePanel(env, slot, p.extra, p.provider, old ? rid() : ''); } catch (e) { return json({ error: e.message, slot: slot.id }, 502); }
    await dropOld(); return done(rec);
  }
  if (p.video) {
    // 시작 프레임: 관리자 화면이 칸 이미지를 JPEG 로 바꿔 /api/clipfile 로 올린 임시 파일 키(작업이 끝나거나 실패하면 지운다)
    if (!klingEnabled(env)) return json({ error: KLING_ENV_HELP }, 501);
    if (!old || !old.url) return json({ error: '이 칸에 이미지가 없습니다. 먼저 이미지를 만들거나 올려 주세요' }, 400);
    const sk = p.video.startKey; if (!/^[\w-][\w.-]{0,119}$/.test(sk || '')) return json({ error: '시작 프레임 키가 올바르지 않습니다' }, 400);
    const prev = await env.GLOSSARY_KV.get(VT(slot.id), 'json'); if (prev && Date.now() - prev.at < VT_AGE) return json({ error: '이 칸은 이미 영상을 만드는 중입니다' }, 409);
    const h = await env.CLIPS_R2.head(sk); if (!h) return json({ error: '시작 프레임 파일을 찾을 수 없습니다' }, 410);
    const up = h.uploaded ? new Date(h.uploaded).getTime() : 0;   // 로컬 가짜 저장소는 0(1970)을 돌려준다 — 그때는 건너뛴다
    if (up > 946684800000 && Date.now() - up > 30 * 60 * 1000) return json({ error: '시작 프레임은 방금 올린 임시 파일이어야 합니다(다른 파일을 지우지 않도록)' }, 400);
    if (!/^image\/(jpeg|png)$/.test((h.httpMetadata && h.httpMetadata.contentType) || '')) return json({ error: '시작 프레임은 JPG 또는 PNG 여야 합니다' }, 400);
    const obj = await env.CLIPS_R2.get(sk), here = new URL(request.url), imageUrl = here.protocol === 'https:' ? here.origin + '/api/clipfile?k=' + encodeURIComponent(sk) : '';
    let taskId; try { taskId = await klingSubmit(env, { imageUrl, b64: async () => toB64(new Uint8Array(await obj.arrayBuffer())), prompt: videoPrompt(slot, p.video.extra), negative: VIDEO_NEG, mode: p.video.mode, duration: p.video.duration || 5 }); }
    catch (e) { await dropStart(env, sk); return json({ error: e.message }, 502); }
    await env.GLOSSARY_KV.put(VT(slot.id), JSON.stringify({ taskId, startKey: sk, at: Date.now() }), { expirationTtl: 86400 });
    return json({ ok: true, pending: true, panels: { [slot.id]: old } });
  }
  return json({ error: 'generate·uploadKey·clear·video 중 하나가 필요합니다' }, 400);
}
// ── 영상 자동 생성(사용자 요청 2026-11-19): 사용자 화면이 빈 칸 그림을 만들면 이어서 Kling 영상(5초)을 맡긴다.
//    칸 그림(jpeg)을 시작 프레임으로 그대로 쓴다. 하루 상한 MV_VIDEO_DAILY_LIMIT(기본 40편), 이미 맡긴 칸은 다시 맡기지 않는다.
//    완성은 화면이 곡 단위로 확인해 달라고 할 때(checkVideos) 또는 관리자 확인(vt)에서 R2 로 옮겨 칸에 붙는다.
const VCOUNT = d => 'mv:vcount:' + d;
const videoLimitOf = env => { const n = parseInt(env.MV_VIDEO_DAILY_LIMIT, 10); return Number.isFinite(n) && n >= 0 ? n : 40; };
async function autoVideo(env, origin, slot, rec) {
  const k = fileOf(rec && rec.url);
  if (!klingEnabled(env) || !k || !/.(jpe?g|png)$/i.test(k)) return false;
  if (await env.GLOSSARY_KV.get(VT(slot.id))) return true;
  const day = today(), used = parseInt(await env.GLOSSARY_KV.get(VCOUNT(day)), 10) || 0; if (used >= videoLimitOf(env)) return false;
  await env.GLOSSARY_KV.put(VCOUNT(day), String(used + 1), { expirationTtl: 3 * 86400 });
  const obj = await env.CLIPS_R2.get(k), imageUrl = /^https:/.test(origin) ? origin + '/api/clipfile?k=' + encodeURIComponent(k) : '';
  try {
    const taskId = await klingSubmit(env, { imageUrl, b64: async () => toB64(new Uint8Array(await obj.arrayBuffer())), prompt: videoPrompt(slot, ''), negative: VIDEO_NEG, duration: 5 });
    await env.GLOSSARY_KV.put(VT(slot.id), JSON.stringify({ taskId, startKey: null, at: Date.now(), auto: true }), { expirationTtl: 86400 });
    return true;
  } catch (e) { await env.GLOSSARY_KV.put('mv:lastPanelError', JSON.stringify({ at: Date.now(), slot: slot.id, message: '자동 영상: ' + String(e.message).slice(0, 1100) }), { expirationTtl: 7 * 86400 }); return false; }
}
async function pendingVideos(env, ids) { let n = 0; await Promise.all(ids.map(async id => { if (await env.GLOSSARY_KV.get(VT(id))) n++; })); return n; }
// 곡 단위 영상 확인(그 곡을 열 권한이 있는 사람): 진행 중인 칸만 Kling 에 물어보고, 끝난 것은 붙인다
async function checkVideos(env, song) {
  const ids = songPanelIds(song); let pending = 0;
  for (const id of ids) { if (!(await env.GLOSSARY_KV.get(VT(id)))) continue; const r = await videoTask(env, id); if (r.state === 'processing') pending++; }
  return json({ ok: true, panels: await getPanels(env, ids), pending });
}
// 영상 작업 확인(관리자): 끝났으면 R2 로 옮겨 칸에 연결한다
async function videoCheck(env, slotId) { const r = await videoTask(env, slotId); return json(Object.assign({ ok: r.state !== 'failed' }, r)); }
async function videoTask(env, slotId) {
  const t = await env.GLOSSARY_KV.get(VT(slotId), 'json'); if (!t) return { state: 'none', panels: await getPanels(env, [slotId]) };
  if (Date.now() - t.at > VT_AGE) { await env.GLOSSARY_KV.delete(VT(slotId)); return ({ ok: false, state: 'failed', error: '3시간 안에 끝나지 않아 기록을 지웠습니다' }); }
  let q; try { q = await klingQuery(env, t.taskId); } catch (e) { return ({ ok: false, state: 'processing', error: e.message }); }
  if (q.status === 'processing') return ({ ok: true, state: 'processing' });
  if (q.status === 'failed') { await env.GLOSSARY_KV.delete(VT(slotId)); await dropStart(env, t.startKey); return ({ ok: false, state: 'failed', error: q.msg || '영상 생성에 실패했습니다' }); }
  const r = await fetch(q.url); if (!r.ok) return ({ ok: false, state: 'processing', error: '영상 파일을 받지 못했습니다(' + r.status + ')' });
  const bytes = new Uint8Array(await r.arrayBuffer()); if (bytes.length > 80 * 1024 * 1024) return ({ ok: false, state: 'failed', error: '영상이 80MB 를 넘습니다' });
  const k = 'mvvid-' + slotId + '-' + rid() + '.mp4'; await putDerivedFile(env, k, bytes, { httpMetadata: { contentType: 'video/mp4' } });
  const cell = (await getPanels(env, [slotId]))[slotId];
  if (!cell) { await dropFile(env, k); } else { await dropFile(env, fileOf(cell.video)); cell.video = '/api/clipfile?k=' + k; cell.videoBy = 'kling'; await putPanel(env, slotId, cell); }
  await env.GLOSSARY_KV.delete(VT(slotId)); await dropStart(env, t.startKey);
  return ({ ok: true, state: 'done', panels: { [slotId]: cell || null } });
}
