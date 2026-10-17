import { cleanWriting, writingFor, writingDirective } from './_ux-writing.js';
// 풀이 문체·단정성 정책(순수 함수, import 없음 → Node 테스트 가능). 파일명이 _로 시작해 라우트로 노출되지 않는다.
// 원칙: 문체는 "표현 강도"만 바꾼다. 만세력 계산값·검색된 풀이 DB 근거·적용되는 명리 판단은 문체와 무관하게 같아야 한다.
// 세 가지 유형(신중형·직설형·단정형)과 관리자 설정(config)을 검증·정리하고, AI 프롬프트에 붙일 지시문(directive)과 사후 검사를 만든다.
// 저장은 api/style.js 가 KV 'style:cfg'(활성) · 'style:hist'(버전 이력)에 한다.
export const STYLE_VERSION = 'style3-ux';
export const STYLE_IDS = ['cautious', 'direct', 'assertive'];
export const STYLE_KO = { cautious: '신중형', direct: '직설형 심층 감정', assertive: '단정형' };
export const STYLE_DESC = {
  cautious: '가능성과 경향을 중심으로 설명합니다. 부드럽고 조심스러운 표현을 씁니다.',
  direct: '차분하고 구체적으로 구조·강점·약점·모순·예외를 설명합니다. 전통 해석과 현실의 사실을 구분합니다. (기본값)',
  assertive: '확신 있는 문장과 강한 서사적 표현을 씁니다. 반복적인 가능성 표현을 줄이고 성향·강점·약점·적성·운의 특징을 분명히 서술합니다.',
};
export const DEFAULT_STYLE = 'direct';

export const DEFAULT_PROMPTS = {
  cautious: '가능성과 경향을 중심으로 설명한다. 부드럽고 조심스러운 표현("~하기 쉽습니다", "~하는 경향이 있습니다", "~로 읽을 수 있습니다")을 쓰되, 한 문단에서 같은 어미를 반복하지 않는다. 판단의 조건을 함께 밝힌다.',
  direct: '명리학적 판단을 명확하게 전달한다. 불필요한 완곡어법을 쓰지 않고 근거 중심으로 설명한다. 결론을 먼저 말하고 생활 장면과 손해, 실천을 연결한다. 전문 근거는 별도 항목에 쓴다. 조건이 실제로 필요한 판단에만 "~할 때"처럼 조건을 붙인다.',
  assertive: '확신 있는 문장과 힘 있는 서사적 표현을 쓴다. 성향·강점·약점·적성·재물 관리 방식·인간관계의 특징·운의 성격은 "~입니다"로 분명하게 말한다. "~일 수 있습니다", "~할 가능성이 있습니다", "~하는 경향이 있습니다", "~볼 수도 있습니다"를 문단마다 반복하지 않는다(한 항목에 많아야 한 번, 근거가 실제로 불확실한 판단에만). 항목의 첫 문장에 핵심 결론을 둔다. 좋은 이야기만 반복하지 말고 약점과 불리한 조건도 같은 힘으로 말한다.',
};

// 어떤 문체를 골라도 지키는 한계. 관리자가 지울 수 없다.
export const HARD_LIMITS = `[문체와 무관하게 지키는 한계]
- 문체는 표현의 강도만 바꾼다. 입력의 계산값(기둥·오행·십성·신강약·통근·대운·세운)과 풀이 DB 근거를 바꾸거나, 입력에 없는 사주 정보·근거·신살·수치를 만들어 내지 않는다.
- 전통 해석은 가설이다. 근거가 있어도 실제 행동이나 미래를 확인된 사실처럼 단정하지 않는다. 근거가 없거나 입력이 부족한 판단은 단정하지 않고 "근거가 부족합니다"라고 말하거나 쓰지 않는다.
- 결혼·이직·재물 상승 같은 시기는 "전환의 기운이 강하게 작용하는 시기"처럼 시기의 성격을 분명히 말하되, 실제 결혼·이직·수익 발생 같은 미래 사건이 일어난다고 확정하지 않는다.
- 쓰지 않는 것: 특정 연도의 사망·중대 사고 확정, 질병 발생·의학적 진단, 파산 확정, 범죄 성향·사기꾼 여부 단정, 배우자의 외도·이혼 확정, 특정 연도의 임신·출산 확정. 이런 주제는 전통 명리학의 해석 범위와 현실의 불확실성을 구분해 말하고, 의학·법률·투자 판단은 전문가에게 맡기도록 한다.
- 인격을 낙인찍거나 모욕하지 않는다. 사람이 아니라 구조와 습관을 짚는다.`;

// 풀이 항목의 6단 구조(IK 합성기·무빙툰 본문·PDF 공통)
export const STRUCTURE = [
  ['conclusion', '핵심 결론', '사용자가 가장 궁금해하는 내용을 첫 문장에 분명하게 제시한다.'],
  ['reality', '현실에서 나타나는 특징', '직업·돈·인간관계·연애·생활습관의 구체적인 장면과 연결한다.'],
  ['strengthWeak', '강점과 약점', '긍정과 불리한 면을 모두 쓴다. 좋은 이야기만 반복하지 않는다.'],
  ['luck', '운의 흐름에 따른 변화', '원국의 특징이 대운·세운에 따라 어떻게 달라지는지 쓴다. 입력에 운 정보가 없으면 쓰지 않는다.'],
  ['action', '현실적인 대응', '어떤 상황에서 움직이고 어떤 상황에서 대비해야 하는지 쓴다.'],
  ['basis', '명리학적 근거', '본문 뒤 별도 근거 영역에 어떤 오행·십성·일간·지지·합충·통근이 판단에 영향을 주었는지, 입력에 있는 값과 출처·예외로만 설명한다.'],
];
export const KIND_IDS = STRUCTURE.map(s => s[0]);

export const DEFAULT_PREFERRED = ['당신은 ~한 사람입니다', '이 사주의 핵심은 ~입니다', '가장 중요한 문제는 ~입니다', '~에 강점이 있습니다', '~하는 시기입니다'];
export const DEFAULT_DISCOURAGED = ['~일 수 있습니다', '~할 가능성이 있습니다', '~하는 경향이 있습니다', '~로 해석될 여지가 있습니다', '~라고 볼 수도 있습니다', '반드시 그렇지는 않습니다'];
export const DEFAULT_STORY = {
  address: '귀인',
  voice: '기존 동양 판타지 세계관을 유지한다. 신비롭고 위트 있는 무협풍 대사로 말하고, 사용자는 항상 "귀인"이라 부른다. 캐릭터별 말투와 성격을 지킨다. 대사는 연출이며 풀이의 근거나 사실 주장을 새로 만들지 않는다.',
};
export const DEFAULT_CONFIG = {
  defaultStyle: DEFAULT_STYLE, chapters: {}, prompts: { ...DEFAULT_PROMPTS }, preferred: DEFAULT_PREFERRED.slice(), discouraged: DEFAULT_DISCOURAGED.slice(),
  writing: cleanWriting(), story: { ...DEFAULT_STORY }, characters: {}, note: '',
};

const str = (v, n) => (typeof v === 'string' ? v.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '').trim().slice(0, n) : '');
const strs = (v, n, len) => (Array.isArray(v) ? [...new Set(v.map(x => str(x, len)).filter(Boolean))].slice(0, n) : []);
const KEY_RE = /^[A-Za-z0-9_.\-가-힣]{1,40}$/;

// 관리자 입력 → 정리된 설정. 알 수 없는 문체는 기본값으로, 비어 있는 프롬프트는 기본 프롬프트로 되돌린다.
export function cleanConfig(b) {
  const o = JSON.parse(JSON.stringify(DEFAULT_CONFIG));
  if (!b || typeof b !== 'object') return o;
  if (STYLE_IDS.includes(b.defaultStyle)) o.defaultStyle = b.defaultStyle;
  if (b.chapters && typeof b.chapters === 'object') for (const k of Object.keys(b.chapters).slice(0, 80)) if (KEY_RE.test(k) && STYLE_IDS.includes(b.chapters[k])) o.chapters[k] = b.chapters[k];
  for (const s of STYLE_IDS) { const p = b.prompts && str(b.prompts[s], 1500); if (p) o.prompts[s] = p; }
  if (Array.isArray(b.preferred)) o.preferred = strs(b.preferred, 30, 80);
  if (Array.isArray(b.discouraged)) o.discouraged = strs(b.discouraged, 30, 80);
  if (b.story && typeof b.story === 'object') { o.story.address = str(b.story.address, 12) || DEFAULT_STORY.address; o.story.voice = str(b.story.voice, 800) || DEFAULT_STORY.voice; }
  if (b.characters && typeof b.characters === 'object') for (const k of Object.keys(b.characters).slice(0, 30)) { const v = str(b.characters[k], 300); if (KEY_RE.test(k) && v) o.characters[k] = v; }
  o.writing = cleanWriting(b.writing);
  o.note = str(b.note, 200);
  return o;
}

// 챕터·분야 키 목록(앞쪽이 우선)에서 문체를 정한다. 설정이 없으면 기본 문체.
export function resolveStyle(cfg, keys) {
  const c = cfg || DEFAULT_CONFIG;
  for (const k of Array.isArray(keys) ? keys : [keys]) if (k && STYLE_IDS.includes(c.chapters && c.chapters[k])) return c.chapters[k];
  return STYLE_IDS.includes(c.defaultStyle) ? c.defaultStyle : DEFAULT_STYLE;
}

// RAG 근거가 얇을 때 표현 강도를 한 단계 낮춘다(근거를 지어내지 않는다).
export function softer(id) { return id === 'assertive' ? 'direct' : 'cautious'; }

// AI 프롬프트에 붙이는 문체 지시. opts.structure: 6단 구조 포함 여부.
export function directive(cfg, id, opts) {
  const c = cfg || DEFAULT_CONFIG, sid = STYLE_IDS.includes(id) ? id : DEFAULT_STYLE, o = opts || {};
  const pref = (c.preferred || []).length ? '권장 표현 예(문체 예시이며, 계산된 사주와 근거에 맞을 때만 쓴다): ' + c.preferred.join(' / ') : '';
  const disc = (c.discouraged || []).length && sid !== 'cautious' ? '반복해서 쓰지 않을 표현: ' + c.discouraged.join(' / ') : '';
  const lines = ['[풀이 문체: ' + STYLE_KO[sid] + ']', (c.prompts && c.prompts[sid]) || DEFAULT_PROMPTS[sid]];
  if (pref) lines.push(pref); if (disc) lines.push(disc);
  if (o.structure) lines.push('[항목 구성] 가능하면 아래 순서로 문단을 쓴다(근거가 없는 단계는 건너뛴다). 문단마다 kind 를 달아라.\n' + STRUCTURE.map((s, i) => (i + 1) + '. kind="' + s[0] + '" ' + s[1] + ': ' + s[2]).join('\n'));
  lines.push(HARD_LIMITS);
  lines.push(writingDirective(writingFor(c.writing, o.keys || [], !!o.consent)));
  if (o.soft) lines.push('[이번 입력의 근거 부족] "expression":"soft" 로 표시된 항목은 근거가 얇다. 그 항목만 한 단계 낮춘 표현(' + STYLE_KO[softer(sid)] + ')으로 쓰고, 근거 없는 내용은 보태지 않는다.');
  return lines.join('\n');
}
// 스토리 연출(캐릭터 대사) 지시 — 풀이 문체와 분리된 층
export function storyDirective(cfg) {
  const c = (cfg && cfg.story) || DEFAULT_STORY, ch = cfg && cfg.characters || {};
  const chars = Object.keys(ch).map(k => '- ' + k + ': ' + ch[k]).join('\n');
  return '[캐릭터 대사(연출) — 풀이 문체와 별개]\n사용자 호칭: ' + c.address + '\n' + c.voice + (chars ? '\n캐릭터별 말투:\n' + chars : '') + '\n캐릭터 대사에는 명리 판단의 근거나 사실 주장을 새로 담지 않는다. 실제 풀이 문장은 위 풀이 문체를 따른다.';
}

// 32비트 FNV-1a — 지시문이 바뀌면 캐시 키가 바뀌도록 하는 짧은 서명
export function sig(text) { let h = 0x811c9dc5; const s = String(text); for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; } return h.toString(16).padStart(8, '0'); }

// ───────────── 사후 검사 ─────────────
// 확정적 사건 예언(문체와 무관하게 항상 실패). 기존 BANNED_RE 보다 구체적인 패턴.
export const PROHIBITED_RE = /(사망(한다|합니다|하게|할 것|하는 해)|죽(는다|습니다|게 됩니다)|암(에 걸|이 발생|이 생)|(질병|병)에 걸(린다|립니다|리게)|(?:파산|부도)(한다|합니다|하게|를 맞)|이혼(한다|합니다|하게 됩니다|하게 된다)|외도(를 합니다|를 한다|를 하게|합니다)|바람(을 피웁니다|을 피운다)|사기꾼(입니다|이다)|범죄자(입니다|이다)|범죄를 저지(릅니다|른다)|임신(한다|합니다|하게|할 것)|출산(한다|합니다|하게)|(?:19|20)\d{2}년[^.。\n]{0,12}(결혼|이혼|사망|임신|출산|파산|사고)(한다|합니다|하게|합니다|할 것|됩니다|이 있습니다))/;
// 완곡·가능성 표현(문장 단위로 센다)
export const HEDGE_RE = /([가-힣] 수 (?:도 )?있|가능성이(?:있|높|큽|큰)|경향이 (?:있|강)|하는 경향|여지가 (?:있|많)|것으로 보입니다|반드시 그렇지는|듯합니다|듯하다|로 해석될)/;
const sentences = t => String(t || '').split(/(?<=[.!?。])\s+|\n+/).map(s => s.trim()).filter(s => s.length >= 4);
export function hedgeStats(texts, cfg) {
  const extra = ((cfg && cfg.discouraged) || []).map(s => s.replace(/^~/, '').trim()).filter(s => s.length >= 4);
  let n = 0, h = 0;
  for (const t of Array.isArray(texts) ? texts : [texts]) for (const s of sentences(t)) { n++; if (HEDGE_RE.test(s) || extra.some(e => s.includes(e))) h++; }
  return { sentences: n, hedged: h, ratio: n ? Math.round(h / n * 100) / 100 : 0 };
}
export const HEDGE_LIMIT = { assertive: 0.25, direct: 0.4 };
// styleId 에 맞는 결과인가: { status:'PASS'|'WARNING'|'FAIL', ratio, issues:[{level,msg}] }
export function styleCheck(texts, styleId, cfg) {
  const arr = (Array.isArray(texts) ? texts : [texts]).map(String), issues = [], all = arr.join('\n');
  const bad = PROHIBITED_RE.exec(all); if (bad) issues.push({ level: 'FAIL', msg: '확정적 사건 예언 표현: ' + bad[0] });
  const st = hedgeStats(arr, cfg), lim = HEDGE_LIMIT[styleId];
  if (lim != null && st.sentences >= 4 && st.ratio > lim) issues.push({ level: 'WARNING', msg: '완곡·가능성 표현이 문장의 ' + Math.round(st.ratio * 100) + '%입니다(' + STYLE_KO[styleId] + ' 기준 ' + Math.round(lim * 100) + '% 이하)' });
  return { status: issues.some(i => i.level === 'FAIL') ? 'FAIL' : issues.length ? 'WARNING' : 'PASS', ratio: st.ratio, sentences: st.sentences, issues };
}
