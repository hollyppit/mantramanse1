// 운세 환경 신기능 공개 스위치 (코드 재배포 없이 관리자 화면에서 켜고 끈다)
// GET /api/luck-flags — { interpret, timeline, region, version } (공개, 60초 캐시). 저장된 값이 없으면 모두 false
// PUT /api/luck-flags — { on: true|false } 세 기능을 한 번에, 또는 { flags: { interpret?, timeline?, region? } } 일부만 (관리자)
// 저장은 KV 키 luckenv:flags 하나만 쓴다. 기본값은 모두 꺼짐이며, 값이 없거나 읽기에 실패하면 꺼진 것으로 본다.
// timelineCopy(2026-11-06): 운명의 타임라인(#/timeline) 카드 첫머리 문안(luck-interpret.js SIX). { flags: { timelineCopy } }로만 켜고 끈다 —
//   { on } "모두 켜기/끄기"는 원래 세 기능(ALL_ON)에만 적용해, 다른 기능을 켜다가 이 문안이 같이 공개되지 않게 한다.
import { json, isAdmin, configError } from '../_lib.js';

const KEY = 'luckenv:flags', ALL_ON = ['interpret', 'timeline', 'region'], NAMES = ALL_ON.concat(['timelineCopy', 'topicDeep', 'lifeNarrative', 'elementFlow', 'luckCycle', 'gyeokAnalysis', 'flowChapters', 'healthChapters', 'dayCompat', 'mistTheme', 'sakuraTheme', 'premiumDepth', 'luckOverlay', 'tenGodRoles', 'macroEra', 'luckEnv', 'luckAlerts', 'musicVideo', 'aptitude', 'mulsangArt', 'sajuHouse']);   /* aptitude(2026-11-25): 만세력 '특기·적성' 탭(aptitude.js) */   /* sajuHouse(2026-11-24): 오행·강약 탭 '사주의 집'(saju-house.js, /api/mulsang-art kind=house) */   /* mulsangArt(2026-11-24): 만세력 원국 탭 'AI로 물상 표현하기'(mulsang.js, /api/mulsang-art) */   /* musicVideo(2026-11-18): 유료 주제 '내 사주 뮤직비디오'(report/v2/music-video.js, /api/music-video) */   /* tenGodRoles(2026-11-18): 십성 작용 분석(ten-god-roles.js) — 오행·강약 탭 카드 + 운세 흐름 상세 '원국과 운의 상호작용' */   /* premiumDepth(2026-11-17): 타임라인 서사 59장 프리미엄 심화 층(report/v2/premium-depth.js) */   // sakuraTheme(2026-11-17): 인연의 광장 벚꽃 테마(community/theme-sakura.css)   // mistTheme(2026-11-16): 밝은 안개 테마(report/hub/theme-mist.css) — 타임라인·일진 캘린더·무료 타로 겉모습만   // dayCompat(2026-11-16): 60갑자 일주 적합도 2판(compat-day.js)   // healthChapters(2026-11-15): 종합풀이 건강·사고수 상세 장 6개(report/v2/health-chapters.js)   // flowChapters(2026-11-15): 운명의 타임라인 오행 흐름·격국 상세 풀이 장 5개(report/v2/flow-chapters.js)   // gyeokAnalysis(2026-11-15): 오행·강약 탭 '사주 격국 분석' 카드(gyeok-structure.js), 따로 켠다   // luckCycle(2026-11-12): 운세 흐름 대운 30년(장기 분석 구간)·세운 2년(천간 오행 구간) 오행 사이클(luck-cycle.js), 따로 켠다   // elementFlow(2026-11-10): 운세 흐름 대운·세운 상세의 오행 흐름 상자(engine.js elementFlow), 따로 켠다   // lifeNarrative(2026-11-08): 타임라인 서사 엔진(report/v2/life-narrative.js)   // topicDeep(2026-11-06): 무빙툰 주제 심화 블록(report/v2/topic-deep.js), 따로 켠다
const safeDecode = s => { try { return decodeURIComponent(s); } catch { return ''; } };
// overlayWeights(2026-11-18): 오행 겹쳐 보기(luck-overlay.js) 층 무게 — 대운·세운·월운·일진, 각 0~2. 저장값이 없거나 잘못되면 기본값
export const OVERLAY_W_DEFAULT = { daeun: 1, seun: 0.7, wolun: 0.4, ilun: 0.2 };
const OW_KEYS = Object.keys(OVERLAY_W_DEFAULT), okW = v => typeof v === 'number' && Number.isFinite(v) && v >= 0 && v <= 2;
const cleanW = w => { const o = {}; OW_KEYS.forEach(k => { o[k] = w && okW(w[k]) ? Math.round(w[k] * 100) / 100 : OVERLAY_W_DEFAULT[k]; }); return o; };
const clean = doc => { const o = { version: (doc && Number.isInteger(doc.version)) ? doc.version : 0 }; NAMES.forEach(k => { o[k] = !!(doc && doc[k] === true); }); o.overlayWeights = cleanW(doc && doc.overlayWeights); return o; };

export function applyFlags(doc, body, at, by) {
  const next = { ...clean(doc), at, by };
  // 층 무게만 보내도 되고, 스위치와 같이 보내도 된다(보낸 칸만 바뀜)
  const hasW = body.overlayWeights !== undefined;
  if (hasW) {
    const w = body.overlayWeights; if (!w || typeof w !== 'object' || Array.isArray(w)) return { error: 'overlayWeights 는 { daeun, seun, wolun, ilun } 숫자여야 합니다' };
    for (const k of Object.keys(w)) { if (!OW_KEYS.includes(k) || !okW(w[k])) return { error: '층 무게는 daeun·seun·wolun·ilun, 0~2 숫자여야 합니다: ' + k }; }
    next.overlayWeights = cleanW({ ...cleanW(doc && doc.overlayWeights), ...w });
  }
  if (typeof body.on === 'boolean') ALL_ON.forEach(k => { next[k] = body.on; });
  else if (body.flags && typeof body.flags === 'object') {
    for (const k of Object.keys(body.flags)) { if (!NAMES.includes(k) || typeof body.flags[k] !== 'boolean') return { error: '알 수 없는 스위치이거나 true/false가 아닙니다: ' + k }; }
    for (const k of Object.keys(body.flags)) next[k] = body.flags[k];
  } else if (!hasW) return { error: '{ on: true|false } 또는 { flags: {…} } 또는 { overlayWeights: {…} } 형식이어야 합니다' };
  next.version = (doc && Number.isInteger(doc.version) ? doc.version : 0) + 1;
  return { doc: next };
}

export async function onRequestGet({ env }) {
  let doc = null; try { doc = env.GLOSSARY_KV ? await env.GLOSSARY_KV.get(KEY, 'json') : null; } catch { doc = null; }
  return new Response(JSON.stringify(clean(doc)), { status: 200, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'public, max-age=60' } });
}

export async function onRequestPut({ request, env }) {
  const err = configError(env); if (err) return json({ error: err }, 500);
  if (!isAdmin(request, env)) return json({ error: '관리자 인증이 필요합니다' }, 401);
  let body; try { body = await request.json(); } catch { return json({ error: '잘못된 요청 형식입니다' }, 400); }
  const by = safeDecode(request.headers.get('x-reviewer') || '').slice(0, 30), at = new Date().toISOString();
  const cur = await env.GLOSSARY_KV.get(KEY, 'json');
  const r = applyFlags(cur, body || {}, at, by); if (r.error) return json({ error: r.error }, 400);
  await env.GLOSSARY_KV.put(KEY, JSON.stringify(r.doc));
  return json({ ok: true, ...clean(r.doc) });
}
