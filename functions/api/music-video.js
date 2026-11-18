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
const SONG = k => 'mv:song:' + k, PANELS = 'mv:panels', COUNT = d => 'mv:count:' + d;
const KEY_RE = /^[0-9a-f]{64}$/, PENDING_MS = 4 * 60 * 1000;
const modelOf = env => (env.ELEVENLABS_MUSIC_MODEL === 'music_v2' || env.ELEVENLABS_MUSIC_MODEL === 'music_v2_5') ? env.ELEVENLABS_MUSIC_MODEL : 'music_v2_5';
const limitOf = env => { const n = parseInt(env.MV_DAILY_LIMIT, 10); return Number.isFinite(n) && n >= 0 ? n : 30; };
const today = () => new Date(Date.now() + 9 * 3600e3).toISOString().slice(0, 10);

async function sha256(s) { const d = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)); return [...new Uint8Array(d)].map(b => b.toString(16).padStart(2, '0')).join(''); }
async function flagOn(env) { try { const d = await env.GLOSSARY_KV.get('luckenv:flags', 'json'); return !!(d && d.musicVideo === true); } catch { return false; } }
async function panelsOf(env) { try { const m = await env.GLOSSARY_KV.get(PANELS, 'json'); return m && typeof m === 'object' ? m : {}; } catch { return {}; } }
const publicSong = (s, rec) => ({ title: s.title, topic: s.topic, topicKo: s.topicKo, totalMs: s.totalMs, timing: (rec && rec.timing) || null, sync: (rec && rec.sync) || null, sections: s.sections.map(x => ({ id: x.id, name: x.name, lines: x.lines, startMs: x.startMs, durationMs: x.durationMs, panel: x.panel, panelFallback: x.panelFallback, el: x.el })) });

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
  const reply = async r => json({ ok: true, key, song: publicSong(song, r), audio: '/api/music-video?a=' + key, panels: await panelsOf(env) });
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
  if (u.searchParams.get('panels')) return new Response(JSON.stringify({ panels: env.GLOSSARY_KV ? await panelsOf(env) : {} }), { headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'public, max-age=60' } });
  if (u.searchParams.get('vt')) { if (!isAdmin(request, env)) return json({ error: 'unauthorized' }, 401); if (!L.PANEL_SLOTS.some(s => s.id === u.searchParams.get('vt'))) return json({ error: 'bad-slot' }, 400); return videoCheck(env, u.searchParams.get('vt')); }
  if (u.searchParams.get('admin')) {
    if (!isAdmin(request, env)) return json({ error: 'unauthorized' }, 401);
    const vl = typeof env.GLOSSARY_KV.list === 'function' ? await env.GLOSSARY_KV.list({ prefix: 'mv:vt:' }) : null, vtasks = ((vl && vl.keys) || []).map(k => k.name.slice(6));
    const used = parseInt(await env.GLOSSARY_KV.get(COUNT(today())), 10) || 0;
    return json({ slots: L.PANEL_SLOTS, panels: await panelsOf(env), version: L.VERSION, flag: await flagOn(env), today: used, limit: limitOf(env), model: modelOf(env),
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

/* ── 관리자: 패널 이미지·영상
   연출 방향(사용자 요청 2026-11-18): 갱스터 힙합 뮤직비디오를 유쾌하게 패러디하되 한국적인 요소를 섞는다.
   과장된 스웩 포즈·로우앵글 어안 렌즈·플래시 조명·슬로모션 같은 힙합 뮤비 문법을 빌리고, 소품·공간은 한국 것으로 바꿔 웃음 포인트를 만든다.
   총·칼·마약·담배·술병 과시·폭력·갱 손동작·실존 인물·유명인·글자·로고는 넣지 않는다(공감형 운세 콘텐츠라 위협적인 느낌 없이). */
// 이미지 모델 안전 필터: 금지할 것을 단어로 적어도(예: '총은 그리지 않는다') 요청이 거절될 수 있어 지시문은 긍정형으로만 쓴다(2026-11-18 패널 502 원인)
const MV_LOOK = '세로 9:16 랩 뮤직비디오 한 장면. 힙합 뮤직비디오 특유의 과장된 스웩 연출을 유쾌하게 패러디한 한국풍 장면 — 자신감 넘치는 포즈, 로우앵글 어안 렌즈, 강한 플래시와 네온 조명, 슬로모션 같은 순간 포착, 고급스럽고 선명한 시네마틱 일러스트(뮤직비디오 스틸컷 느낌). 누구나 웃으며 볼 수 있는 밝고 코믹한 분위기.' +
  ' 한국적 요소를 섞는다: 갓에 선글라스, 한복 소매를 단 트레이닝복이나 퍼 코트, 금 체인 대신 엽전 꾸러미·노리개 목걸이, 부채, 단청 무늬, 한옥 골목, 포장마차, 편의점 앞 파라솔, 한강 다리 야경, 노래방 네온, 배달 스쿠터·마을버스·경운기를 튜닝한 차 같은 것 중 장면에 맞는 두세 가지.' +
  ' 인물은 가상의 성인 한국 래퍼와 크루로, 손에는 마이크·부채·엽전 꾸러미 같은 소품을 든다. 실존 인물을 닮지 않은 새 얼굴. 화면에는 글자·간판 문구·로고·자막 없이 그림만. 화면 아래쪽 1/3 은 자막이 올라가니 단순하게 비워 둔다.';
const SECTION_SCENE = {
  intro: '뮤직비디오 오프닝. 밤 골목이나 한옥 담장 앞, 튜닝한 마을버스·스쿠터 헤드라이트가 비추는 가운데 주인공이 선글라스를 천천히 내리며 카메라를 보는 등장 장면.',
  verse1: '주인공의 기질을 자랑하는 랩 벌스. 편의점 앞 파라솔·포장마차·옥상 같은 동네 공간을 자기 무대처럼 쓰며 크루와 함께 과장된 스웩 포즈를 취하는 장면.',
  hook: '후렴. 가장 화려한 장면 — 한강 다리 야경이나 단청 지붕 위에서 바람이 휘몰아치고 한복 소매·부채·엽전 꾸러미가 날리며 크루 전체가 같은 동작으로 춤추는 클라이맥스.',
  verse2: '힘들었던 이야기를 하는 벌스. 비 오는 밤 노래방 네온 아래나 막차 버스 안에서 혼자 랩하다가 다시 고개를 드는, 살짝 쓸쓸하지만 멋있는 장면.',
  bridge: '비트가 바뀌는 브리지. 하늘빛이 바뀌는 순간, 교차로나 다리 위에서 슬로모션으로 돌아서는 주인공과 흩날리는 소품.',
  outro: '엔딩. 동이 트는 골목이나 강변에서 크루와 함께 카메라를 등지고 걸어가거나, 마지막으로 선글라스를 고쳐 쓰며 웃는 장면.'
};
const TOPIC_SCENE = {
  self: '종합 — 주인공 한 사람의 개성과 인생 흐름이 드러나는 장면.',
  love: '연애운 — 커플 래퍼 듀엣처럼 두 사람이 등장. 한강 피크닉 돗자리·포장마차 데이트·노래방 듀엣 같은 설레는 장면을 힙합 뮤비 문법으로 과장.',
  wealth: '재물운 — 부자 자랑하는 힙합 뮤비 장면을 한국식으로 패러디: 엽전 꾸러미·복주머니·금두꺼비·가계부와 적금 통장을 트로피처럼 들고 뽐내는 장면.',
  career: '커리어운 — 사무실·작업실·출근길 지하철을 무대로 한 오피스 힙합 크루 패러디: 정장 위에 한복 조끼, 사원증 목걸이를 체인처럼, 서류 가방을 붐박스처럼 든 장면.',
  newyear: '토정비결 신년운세 — 새해 패러디: 해돋이 앞에서 세배하는 크루, 복주머니·떡국·연날리기·한지 등불을 힙합 뮤비 소품처럼 과장한 장면.'
};
const EL_MOTIF = { 목: '초록 네온과 대나무·나뭇잎', 화: '붉은 네온과 불꽃 조명·노을', 토: '황금빛 조명과 흙빛 질감', 금: '은빛·흰빛 금속 광택과 차가운 조명', 수: '푸른 네온과 빗물·강물 반사' };
// 주인공 성별(칸 이름 끝 -f / -m): 여자 사주 곡은 여성 래퍼, 남자 사주 곡은 남성 래퍼가 주인공
const LEAD_KO = { F: '주인공은 가상의 성인 한국 여성 래퍼. 크루도 여성 래퍼 중심으로, 걸크러시 느낌의 당당한 스타일링.', M: '주인공은 가상의 성인 한국 남성 래퍼. 크루도 남성 래퍼 중심으로, 여유 있고 당당한 스타일링.' };
const LEAD_EN = { F: 'The main character is a confident adult Korean female rapper with her female crew.', M: 'The main character is a confident adult Korean male rapper with his male crew.' };
function panelPrompt(slot, extra) {
  return MV_LOOK + '\n주인공: ' + (LEAD_KO[slot.gender] || LEAD_KO.M) + '\n주제: ' + (TOPIC_SCENE[slot.topic] || TOPIC_SCENE.self) + '\n장면: ' + SECTION_SCENE[slot.section] +
    '\n색과 상징(' + slot.el + ' 기운): ' + EL_MOTIF[slot.el] + '이 화면의 주 조명색과 소품에 드러난다.' + (extra ? '\n추가 요청: ' + String(extra).slice(0, 400) : '');
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
  return 'Playful, family-friendly parody of a swaggering hip-hop music video with Korean flavor. ' + (LEAD_EN[slot.gender] || LEAD_EN.M) + ' Keep the starting frame characters, outfits and setting. ' + SECTION_MOTION[slot.section] +
    '. Upbeat music-video energy, smooth cinematic motion, seamless loop feeling.' + (extra ? ' Additional direction: ' + String(extra).slice(0, 400) : '');
}
const VIDEO_NEG = 'text, captions, logos, watermark, distorted faces, extra limbs, blurry, flicker';   // 위험 단어는 넣지 않는다(안전 필터가 요청 자체를 거절할 수 있음) — 밝은 코믹 분위기는 지시문에서 긍정형으로
const VT = id => 'mv:vt:' + id, VT_AGE = 3 * 3600 * 1000;
const fileOf = u => { const m = /^\/api\/clipfile\?k=([\w.-]{1,120})$/.exec(u || ''); return m ? m[1] : ''; };
const ownFile = k => /^mv(panel|vid|start)-/.test(k || '');
async function dropFile(env, k) { if (ownFile(k)) { try { await deleteDerivedFile(env, k); } catch { } } }
async function dropStart(env, k) { if (k) { try { await deleteDerivedFile(env, k); } catch { } } }   // 영상 시작 프레임 임시 파일(보존 원본은 deleteDerivedFile 이 거른다)
const rid = () => Array.from(crypto.getRandomValues(new Uint8Array(4)), x => x.toString(16).padStart(2, '0')).join('');

async function panelPost(request, env, p) {
  if (!isAdmin(request, env)) return json({ error: 'unauthorized' }, 401);
  const slot = L.PANEL_SLOTS.find(s => s.id === (p && p.slot)); if (!slot) return json({ error: '패널 칸 이름이 올바르지 않습니다' }, 400);
  const map = await panelsOf(env), old = map[slot.id];
  const save = async () => { await env.GLOSSARY_KV.put(PANELS, JSON.stringify(map)); return json({ ok: true, panels: map }); };
  const dropOld = async () => { if (old) { await dropFile(env, fileOf(old.url)); await dropFile(env, fileOf(old.video)); } };   // 이미지가 바뀌면 그 이미지로 만든 영상도 지운다
  if (p.clear) { delete map[slot.id]; await env.GLOSSARY_KV.delete(VT(slot.id)); await dropOld(); return save(); }
  if (p.clearVideo) { if (old && old.video) { await dropFile(env, fileOf(old.video)); delete old.video; delete old.videoBy; } return save(); }
  if (p.uploadKey) {
    if (!/^[\w.-]{1,120}$/.test(p.uploadKey) || !env.CLIPS_R2 || !(await env.CLIPS_R2.head(p.uploadKey))) return json({ error: '올린 이미지를 찾을 수 없습니다' }, 400);
    await dropOld(); map[slot.id] = { url: '/api/clipfile?k=' + p.uploadKey, by: 'upload', at: Date.now() }; return save();
  }
  if (p.generate) {
    if (!env.CLIPS_R2) return json({ error: 'R2 바인딩(CLIPS_R2)이 없습니다' }, 501);
    let g; try { g = await generate(env, panelPrompt(slot, p.extra), p.provider === 'openai' || p.provider === 'gemini' ? p.provider : '', null); }
    catch (e) { await env.GLOSSARY_KV.put('mv:lastPanelError', JSON.stringify({ at: Date.now(), slot: slot.id, message: String(e.message).slice(0, 1200) }), { expirationTtl: 7 * 86400 }); return json({ error: e.message, slot: slot.id }, 502); }
    const k = 'mvpanel-' + slot.id + '-' + rid() + '.' + g.ext;
    await putDerivedFile(env, k, g.bytes, { httpMetadata: { contentType: g.mime } });
    await dropOld(); map[slot.id] = { url: '/api/clipfile?k=' + k, by: g.provider + ':' + g.model, at: Date.now() }; return save();
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
    return json({ ok: true, pending: true, panels: map });
  }
  return json({ error: 'generate·uploadKey·clear·video 중 하나가 필요합니다' }, 400);
}
// 영상 작업 확인(관리자): 끝났으면 R2 로 옮겨 칸에 연결한다
async function videoCheck(env, slotId) {
  const t = await env.GLOSSARY_KV.get(VT(slotId), 'json'); if (!t) return json({ ok: true, state: 'none', panels: await panelsOf(env) });
  if (Date.now() - t.at > VT_AGE) { await env.GLOSSARY_KV.delete(VT(slotId)); return json({ ok: false, state: 'failed', error: '3시간 안에 끝나지 않아 기록을 지웠습니다' }); }
  let q; try { q = await klingQuery(env, t.taskId); } catch (e) { return json({ ok: false, state: 'processing', error: e.message }); }
  if (q.status === 'processing') return json({ ok: true, state: 'processing' });
  if (q.status === 'failed') { await env.GLOSSARY_KV.delete(VT(slotId)); await dropStart(env, t.startKey); return json({ ok: false, state: 'failed', error: q.msg || '영상 생성에 실패했습니다' }); }
  const r = await fetch(q.url); if (!r.ok) return json({ ok: false, state: 'processing', error: '영상 파일을 받지 못했습니다(' + r.status + ')' });
  const bytes = new Uint8Array(await r.arrayBuffer()); if (bytes.length > 80 * 1024 * 1024) return json({ ok: false, state: 'failed', error: '영상이 80MB 를 넘습니다' });
  const k = 'mvvid-' + slotId + '-' + rid() + '.mp4'; await putDerivedFile(env, k, bytes, { httpMetadata: { contentType: 'video/mp4' } });
  const map = await panelsOf(env), cell = map[slotId];
  if (!cell) { await dropFile(env, k); } else { await dropFile(env, fileOf(cell.video)); cell.video = '/api/clipfile?k=' + k; cell.videoBy = 'kling'; await env.GLOSSARY_KV.put(PANELS, JSON.stringify(map)); }
  await env.GLOSSARY_KV.delete(VT(slotId)); await dropStart(env, t.startKey);
  return json({ ok: true, state: 'done', panels: map });
}
