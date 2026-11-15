// 신년운세 콘텐츠 검수·수정 저장소(KV 'newyear:content'). 코드의 문구 파일(draft)은 그대로 두고, 관리자가 승인·수정한 내용을 위에 덧입힌다.
//   modern[괘]: { status: 'reviewed'|'draft', edits: { tone, theme, overview[], good[], caution[], months: { n: { tone, gist } } }, by, at }
//   blocks[id]: { status: 'reviewed'|'draft', edits: { hook, situation, scene, advice, line }, by, at }
// 공개(public) 모드: 승인한 토정 현대어만 보이고(그 외는 원문만), 사주 블록은 승인한 것만 쓴다. 미리보기(preview): 모두(수정 반영).
import { kvOf } from './_store.js';

export const CONTENT_KEY = 'newyear:content';
const TONES = ['good', 'neutral', 'caution', 'burden'];
const BLOCK_FIELDS = ['hook', 'situation', 'scene', 'advice', 'line'];
const MAX = 400;

export const emptyContent = () => ({ rev: 0, updatedAt: null, by: null, modern: {}, blocks: {}, history: [] });
export async function loadContent(env) {
  let v = null; try { const kv = kvOf(env); v = kv ? await kv.get(CONTENT_KEY, 'json') : null; } catch { v = null; }
  const c = emptyContent();
  if (v && typeof v === 'object') { c.rev = +v.rev || 0; c.updatedAt = v.updatedAt || null; c.by = v.by || null; c.modern = v.modern || {}; c.blocks = v.blocks || {}; c.history = Array.isArray(v.history) ? v.history.slice(-50) : []; }
  return c;
}
export async function saveContent(env, c) { const kv = kvOf(env); if (!kv) throw new Error('kv-unavailable'); await kv.put(CONTENT_KEY, JSON.stringify(c)); }

const str = (v, Q) => {
  if (typeof v !== 'string') return undefined;
  const t = v.trim().slice(0, MAX); if (!t) return undefined;
  const bad = Q ? Q.checkText(t, 'situation').filter(x => !/존댓말|길\(/.test(x)) : [];
  if (bad.length) { const e = new Error('banned-text'); e.detail = bad.join(',') + ': ' + t.slice(0, 40); throw e; }
  return t;
};
const list = (v, Q) => Array.isArray(v) ? v.map(x => str(x, Q)).filter(Boolean).slice(0, 6) : undefined;
// 관리자가 보낸 수정값 정리: 알 수 없는 칸·금지 표현은 받지 않는다
export function cleanModernEdits(e, Q) {
  if (!e || typeof e !== 'object') return {};
  const o = {};
  if (TONES.includes(e.tone)) o.tone = e.tone;
  const theme = str(e.theme, Q); if (theme) o.theme = theme.slice(0, 60);
  for (const k of ['overview', 'good', 'caution']) { const l = list(e[k], Q); if (l) o[k] = l; }
  if (e.months && typeof e.months === 'object') {
    o.months = {};
    for (const [m, v] of Object.entries(e.months)) {
      if (!/^(?:[1-9]|1[0-2])$/.test(m) || !v) continue;
      const mm = {}; if (TONES.includes(v.tone)) mm.tone = v.tone; const g = str(v.gist, Q); if (g) mm.gist = g;
      if (Object.keys(mm).length) o.months[m] = mm;
    }
    if (!Object.keys(o.months).length) delete o.months;
  }
  return o;
}
export function cleanBlockEdits(e, Q) {
  if (!e || typeof e !== 'object') return {};
  const o = {}; for (const k of BLOCK_FIELDS) { const t = str(e[k], Q); if (t) o[k] = t; }
  return o;
}

// 저장된 검수·수정을 코드의 문구 위에 덧입혀 조합기에 넘길 의존성을 만든다
export function applyContent(deps, content, mode) {
  const c = content || emptyContent(), preview = mode === 'preview';
  const modern = {};
  for (const [g, base] of Object.entries(deps.TojeongModern || {})) {
    const o = c.modern[g] || {}, e = o.edits || {};
    const months = base.months ? { ...base.months } : base.months;
    if (months && e.months) for (const [m, v] of Object.entries(e.months)) months[m] = { ...(months[m] || {}), ...v };
    modern[g] = { ...base, ...e, months, status: o.status === 'reviewed' ? 'reviewed' : 'draft' };
  }
  const blocks = [];
  for (const b of deps.NewyearBlocks || []) {
    const o = c.blocks[b.id] || {}, approved = o.status === 'reviewed';
    if (!preview && !approved) continue;
    const e = o.edits || {};
    blocks.push(Object.keys(e).length ? { ...b, ...e, alt: undefined } : b);   // 본문을 고친 블록은 고친 판만 쓴다(옛 다른 판은 쓰지 않음)
  }
  return { ...deps, TojeongModern: modern, NewyearBlocks: blocks };
}

export function summary(deps, content, possible) {
  const c = content || emptyContent();
  const mods = Object.keys(deps.TojeongModern || {}).map(Number).sort((a, b) => a - b);
  const reviewedModern = mods.filter(g => (c.modern[g] || {}).status === 'reviewed');
  const blockIds = (deps.NewyearBlocks || []).map(b => b.id), reviewedBlocks = blockIds.filter(id => (c.blocks[id] || {}).status === 'reviewed');
  const inYear = possible ? mods.filter(g => possible.includes(g)) : mods;
  return {
    modern: { total: mods.length, reviewed: reviewedModern.length, inYear: inYear.length, reviewedInYear: inYear.filter(g => reviewedModern.includes(g)).length },
    blocks: { total: blockIds.length, reviewed: reviewedBlocks.length },
  };
}
