// 리포트 v2 콘텐츠 저장본: 해석 모듈·개운법 라이브러리·챕터 설정·미디어 점수 가중치
// GET /api/report-content — 공개. { content: { modules, remedies, chapters, scoring, flow, version } | null }  (null 이면 코드의 기본 시드 report/v2/*.js 를 쓴다)
// PUT /api/report-content — 관리자. { modules?, remedies?, chapters?, projects?, textStyles?, scoring?, flow?, cinemaDefaults?, sceneCopy?, introEpic? } 보낸 항목만 교체. 저장할 때마다 version 이 바뀌어 캐시 키가 갱신된다.
// 저장: GLOSSARY_KV 'v2:content'.  모듈/개운법은 id 기준으로 코드 기본값 위에 덮어쓰기·추가되고, enabled:false 로 기본 항목을 끌 수 있다.
import { json, isAdmin, configError } from '../_lib.js';
import { cleanTextStyles } from '../_textstyle.js';
import { cleanCinemaDefaults, cleanSceneCopy } from '../_cinema.js';

const KEY = 'v2:content', MAX_BYTES = 3 * 1024 * 1024;
const TOPIC_CAT = /^t_c\d{2}_[a-z0-9]{2,20}$/; // 챕터별 주제 카드(report/v2/topics.js)
const MOD_CATS = ['identity', 'elements', 'personality', 'talent', 'shadow', 'career', 'success', 'wealth', 'love', 'marriage', 'relationship', 'compatibility', 'family', 'pastLife', 'daewoon', 'currentCycle', 'sewoon', 'monthly', 'remedy', 'actionPlan'];
const REM_TYPES = ['action', 'exercise', 'growth', 'people', 'place', 'environment', 'timing']; // exercise 는 예전 저장본 호환(저장 시 action 의 운동 종류로 바꾼다)
// 조건 키는 report/v2/rules.js 의 FIELDS 와 같다
const COND_KEYS = ['dayPillar', 'dayMasterStem', 'dayMasterEl', 'gender', 'dominantEl', 'lackEl', 'yongEl', 'dominantGroup', 'weakestGroup', 'strength', 'hasRoot', 'pattern', 'star', 'career', 'daewoonSeason', 'seunSeason', 'monthSeason', 'needTag', 'project'];
const ID_RE = /^[\w.\-가-힣]{1,80}$/; // 기본 모듈 id 에 한글(예: identity_el_금)이 있다
const str = (v, n) => (typeof v === 'string' ? v.slice(0, n) : '');
const strs = (v, n = 20, len = 40) => (Array.isArray(v) ? v.slice(0, n).map(x => str(x, len)).filter(Boolean) : []);
const MEDIA_OK = /^(\/api\/clipfile\?k=[\w.-]{1,120}|https:\/\/[^\s"'<>]+)$/;

function cleanCond(c) {
  const o = {}; if (!c || typeof c !== 'object') return o;
  for (const k of COND_KEYS) if (Array.isArray(c[k]) && c[k].length) o[k] = strs(c[k], 20, 30);
  return o;
}
// extra: 구조화 보조 필드(직업 환경·재물 항목 등). 문자열·문자열 배열·한 단계 객체만 허용
function cleanExtra(e, d = 0) {
  if (!e || typeof e !== 'object' || d > 2) return null; const o = {};
  for (const k of Object.keys(e).slice(0, 30)) { if (!/^[\w가-힣]{1,30}$/.test(k)) continue; const v = e[k];
    if (typeof v === 'string') o[k] = v.slice(0, 400); else if (Array.isArray(v)) o[k] = strs(v, 20, 120); else if (v && typeof v === 'object') o[k] = cleanExtra(v, d + 1); }
  return o;
}
function cleanModule(m) {
  if (!m || !ID_RE.test(m.id || '') || !(MOD_CATS.includes(m.category) || TOPIC_CAT.test(m.category))) return null;
  return { id: m.id, category: m.category, conditions: cleanCond(m.conditions), priority: Math.max(0, Math.min(100, Math.round(+m.priority || 0))), headline: str(m.headline, 120), summary: str(m.summary, 600), detail: str(m.detail, 2000),
    keywords: strs(m.keywords, 12), imageTags: strs(m.imageTags, 12), actionTags: strs(m.actionTags, 12), extra: cleanExtra(m.extra), enabled: m.enabled !== false };
}
function cleanRemedy(r) {
  if (!r || !ID_RE.test(r.id || '') || !REM_TYPES.includes(r.type)) return null;
  const legacyEx = r.type === 'exercise';
  return { id: r.id, type: legacyEx ? 'action' : r.type, title: str(r.title, 100), summary: str(r.summary, 500), detail: str(r.detail, 1500), tags: strs(r.tags, 20), conditions: cleanCond(r.conditions), priority: Math.max(0, Math.min(100, Math.round(+r.priority || 0))),
    imageUrl: MEDIA_OK.test(r.imageUrl || '') ? r.imageUrl : '', enabled: r.enabled !== false, extra: legacyEx ? Object.assign({}, cleanExtra(r.extra) || {}, { kind: 'exercise' }) : cleanExtra(r.extra) };
}
function cleanChapter(c) {
  if (!c || !ID_RE.test(c.id || '')) return null;
  return { id: c.id, project: ID_RE.test(c.project || '') ? c.project : 'full', base: ID_RE.test(c.base || '') ? c.base : c.id, no: Math.round(+c.no) || 0, order: Math.round(+c.order) || 0, act: Math.max(1, Math.min(9, Math.round(+c.act) || 1)), enabled: c.enabled !== false, title: str(c.title, 60), subtitle: str(c.subtitle, 120), kind: ['module', 'daewoon', 'current', 'sewoon', 'monthly', 'remedy', 'summary'].includes(c.kind) ? c.kind : 'module',
    moduleCategories: strs(c.moduleCategories, 10, 30).filter(x => MOD_CATS.includes(x)), maxModules: Math.max(1, Math.min(8, Math.round(+c.maxModules) || 1)), aiEnabled: c.aiEnabled !== false, accessLevel: c.accessLevel === 'premium' ? 'premium' : 'free',
    coverImage: MEDIA_OK.test(c.coverImage || '') ? c.coverImage : '', introText: str(c.introText, 300), disclaimer: str(c.disclaimer, 200) };
}
const cleanAct = a => (a && Number.isInteger(a.id) ? { id: a.id, title: str(a.title, 40), roman: str(a.roman, 12), line: str(a.line, 160), pdfDone: str(a.pdfDone, 120) } : null);
// 프로젝트: 상품. 챕터는 각자 하나의 프로젝트에 속하므로(chapter.project) 여기에는 ACT 문구만 둔다. chapters 는 예전 저장 방식(공유 목록) 호환용이고 새 저장에서는 null
function cleanProject(p) {
  if (!p || !ID_RE.test(p.id || '')) return null;
  const chapters = Array.isArray(p.chapters) ? p.chapters.slice(0, 60).filter(x => x && ID_RE.test(x.id || '')).map(x => ({ id: x.id, act: Math.max(1, Math.min(9, Math.round(+x.act) || 1)) })) : null;
  return { id: p.id, name: str(p.name, 40), desc: str(p.desc, 200), enabled: p.enabled !== false, accessLevel: p.accessLevel === 'premium' ? 'premium' : 'free',
    needTags: strs(p.needTags, 12, 24), requiredCompletionRate: typeof p.requiredCompletionRate === 'number' ? Math.max(0, Math.min(1, p.requiredCompletionRate)) : null,
    acts: Array.isArray(p.acts) ? p.acts.slice(0, 9).map(a => ({ title: str(a && a.title, 40), line: str(a && a.line, 160), pdfDone: str(a && a.pdfDone, 120) })) : null, chapters };
}
// 무빙 연출 설정(순차 등장·자동 스크롤). 범위는 report/v2/moving.js 의 clean() 과 같다.
function cleanFlow(f) {
  f = f && typeof f === 'object' ? f : {}; const n = (v, lo, hi, d) => { v = v === '' || v == null ? NaN : +v; return Number.isFinite(v) ? Math.min(hi, Math.max(lo, v)) : d; };
  return { enabled: f.enabled !== false, anim: ['rise', 'fade', 'zoom', 'blur', 'wipe', 'drop'].includes(f.anim) ? f.anim : 'rise', duration: n(f.duration, 0.1, 4, 0.8), distance: n(f.distance, 0, 120, 28), stagger: n(f.stagger, 0, 2, 0.35), trigger: n(f.trigger, 40, 100, 88),
    auto: f.auto !== false, speed: n(f.speed, 10, 400, 55), startDelay: n(f.startDelay, 0, 10, 1.5), stopAtChoice: f.stopAtChoice !== false, resumeAfter: n(f.resumeAfter, 0, 60, 0), btnShow: f.btnShow !== false, btnPos: ['right', 'center', 'left'].includes(f.btnPos) ? f.btnPos : 'right',
    readSpeed: n(f.readSpeed, 3, 12, 6.5), bgMotion: Math.round(n(f.bgMotion, 0, 2, 1)), playbackRate: [0.5, 0.75, 1, 1.25, 1.5, 2, 3, 4, 5].includes(+f.playbackRate) ? +f.playbackRate : 1 }; // 읽기 모드(report/v2/reader.js). 위의 예전 연출 값은 보존만 하고 화면은 쓰지 않는다
}
// 배경 음악: 분위기별 음원 주소(내 R2 업로드 또는 https). 7종 밖의 키·허용 밖 주소는 버린다.
const BGM_MOODS = ['default', 'cinematic', 'minimal', 'ambient', 'emotional', 'tension', 'hopeful', 'reflective'];
// 인트로 연출 설정(report/v2/epic-intro.js 와 같은 값 범위). style: 무협 출정(JOURNEY·기본)/무협 패러디/시네마틱/최소 · humor: 펀치라인 정도 · epicLevel: 1~5
const INTRO_STYLES = ['EPIC_WUXIA_JOURNEY_SHORT', 'EPIC_WUXIA_JOURNEY', 'EPIC_WUXIA_PARODY', 'CINEMATIC', 'MINIMAL'], INTRO_HUMORS = ['OFF', 'SUBTLE', 'PARODY'];
function cleanIntroEpic(b) {
  const o = {}; if (!b || typeof b !== 'object') return o;
  if (INTRO_STYLES.includes(b.style)) o.style = b.style; if (INTRO_HUMORS.includes(b.humor)) o.humor = b.humor;
  const L = Math.round(+b.epicLevel); if (L >= 1 && L <= 5) o.epicLevel = L;
  return o;
}
function cleanBgm(b) { const o = {}; if (!b || typeof b !== 'object') return o; for (const k of BGM_MOODS) if (MEDIA_OK.test(b[k] || '')) o[k] = b[k]; return o; }
function cleanScoring(s) {
  const o = {}; if (!s || typeof s !== 'object') return o;
  if (s.w && typeof s.w === 'object') { o.w = {}; for (const k of ['element', 'state', 'theme', 'emotion', 'action', 'chapter', 'scene', 'role', 'typePref']) if (Number.isFinite(+s.w[k])) o.w[k] = Math.max(0, Math.min(100, +s.w[k])); }
  for (const k of ['priorityDiv', 'adjacentChapter', 'sameTypeRun']) if (Number.isFinite(+s[k])) o[k] = +s[k];
  if (typeof s.requiredCompletionRate === 'number') o.requiredCompletionRate = Math.max(0, Math.min(1, s.requiredCompletionRate));
  return o;
}

export async function onRequestGet({ env }) {
  if (!env.GLOSSARY_KV) return json({ content: null });
  return json({ content: (await env.GLOSSARY_KV.get(KEY, 'json')) || null });
}

export async function onRequestPut({ request, env }) {
  if (!isAdmin(request, env)) return json({ error: '관리자 인증이 필요합니다' }, 401);
  const ce = configError(env); if (ce) return json({ error: ce }, 501);
  let b; try { b = await request.json(); } catch { return json({ error: '잘못된 요청 형식입니다' }, 400); }
  const cur = (await env.GLOSSARY_KV.get(KEY, 'json')) || {}, next = { ...cur };
  const uniq = (arr, f) => { const seen = new Set(), out = []; for (const x of arr || []) { const c = f(x); if (c && !seen.has(c.id)) { seen.add(c.id); out.push(c); } } return out; };
  if (Array.isArray(b.modules)) next.modules = uniq(b.modules.slice(0, 3000), cleanModule);
  if (Array.isArray(b.remedies)) next.remedies = uniq(b.remedies.slice(0, 1500), cleanRemedy);
  if (b.chapters && typeof b.chapters === 'object') next.chapters = { chapters: uniq((b.chapters.chapters || []).slice(0, 200), cleanChapter), acts: (b.chapters.acts || []).slice(0, 9).map(cleanAct).filter(Boolean) };
  if (Array.isArray(b.projects)) next.projects = uniq(b.projects.slice(0, 40), cleanProject);
  if (b.textStyles) next.textStyles = cleanTextStyles(b.textStyles);
  if (b.scoring) next.scoring = cleanScoring(b.scoring);
  if (b.flow) next.flow = cleanFlow(b.flow);
  if (b.bgm) next.bgm = cleanBgm(b.bgm); // 분위기별 배경 음악
  if (b.introEpic) next.introEpic = cleanIntroEpic(b.introEpic); // 인트로 연출(스타일·유머·에픽 레벨·해설 음성)
  if (b.cinemaDefaults) next.cinemaDefaults = cleanCinemaDefaults(b.cinemaDefaults); // 장면 종류별 기본 연출(없으면 프리셋·내장 기본값)
  if (b.sceneCopy) next.sceneCopy = cleanSceneCopy(b.sceneCopy); // 프롤로그·엔딩·챕터 연출 장면의 문장·이름 강조 override
  next.version = 'c' + Date.now().toString(36); // 콘텐츠가 바뀌면 리포트 캐시 키가 바뀐다
  const text = JSON.stringify(next);
  if (text.length > MAX_BYTES) return json({ error: '콘텐츠가 너무 큽니다' }, 413);
  await env.GLOSSARY_KV.put(KEY, text);
  return json({ ok: true, version: next.version, counts: { modules: (next.modules || []).length, remedies: (next.remedies || []).length } });
}
