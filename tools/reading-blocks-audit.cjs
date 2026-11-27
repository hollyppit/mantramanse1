// 상세풀이(/report/) 블록·그래프 쉬움 검사(읽기 전용, 2026-11-27):  node tools/reading-blocks-audit.cjs [--charts 8] [--out docs/READING_BLOCKS_AUDIT] [--html 폴더] [--overlay 폴더]
// reading-plain-audit.cjs 와 같은 방식으로 화면 스크립트를 vm 에 싣되, 운영 스위치(KV luckenv:flags v43 사본)를 그대로 켜고
// 화면이 끼워 넣는 장(흐름·격국·건강·적성)까지 그린다. 명리를 전혀 모르는 고객 기준으로 아래를 센다.
//   A. 각주가 닿지 않는 용어: 제목·카드 이름(dt/dd)·그림 글자(svg text)·표 머리 등 term-notes 가 단추를 못 다는 곳에 쓴 명리 용어(괄호 풀이 없이)
//   B. 본문 속 설명 없는 어려운 용어: 단추(tn)도 괄호 풀이도 없이 나온 핵심 명리 용어(장 안 두 번째부터 단추가 없는 것은 셈하지 않음)
//   C. 그래프 읽는 법: svg 그래프가 있는 구역에 축·색·띠·점수 뜻을 알려 주는 글(범례·읽는 법)이 있는지
//   D. 내부 영어 값 노출(strong·shaky·care 등)·점수/등급 기준 없이 숫자만
//   E. 긴 문장(90자+)·숫자 나열(한 문장 숫자 5개+)·같은 구역 같은 문장 반복
// 결과는 구역(블록) 이름별로 묶는다. 구역 이름은 section data-sc 꼬리 또는 class 의 dp-*/wp-* 이름.
const fs = require('fs'), vm = require('vm'), path = require('path'), url = require('url');
const root = path.join(__dirname, '..'), v2 = path.join(root, 'report/v2');
const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
const N = +arg('charts', 8), OUT = path.join(root, arg('out', 'docs/READING_BLOCKS_AUDIT')), HTML = arg('html', '');
// 운영 스위치 사본(2026-11-27 KV luckenv:flags version 43 에서 읽음). 상세풀이에 영향 있는 것만
const PROD = { interpret: true, timeline: true, region: true, timelineCopy: true, topicDeep: true, lifeNarrative: true, elementFlow: true, luckCycle: true, gyeokAnalysis: true, flowChapters: true, healthChapters: true, dayCompat: true, premiumDepth: true, luckOverlay: true, tenGodRoles: true, macroEra: true, luckEnv: true, aptChapters: true, aptitude: true, groupCompat: true, loveGroup: true, psych: true, weaponChapters: true, weapon: true, tlSimple: true, pairFlow: true };
// 고객이 모를 핵심 명리 용어(설명 없이 나오면 문제). 각주 사전에 있어도 단추가 못 닿는 곳이면 문제
const HARD = ['비견', '겁재', '식신', '상관', '편재', '정재', '편관', '정관', '편인', '정인', '비겁', '식상', '재성', '관성', '인성', '관살', '재관', '식재', '통근', '투간', '투출', '합거', '설기', '극설', '용신', '희신', '기신', '구신', '한신', '격국', '상신', '조후', '억부', '통관', '종격', '신강', '신약', '득령', '득지', '득세', '월령', '사령', '지장간', '12운성', '십이운성', '십성', '십신', '육친', '공망', '원진', '귀문', '형충', '충', '삼합', '육합', '방합', '천간', '지지', '일간', '일주', '월주', '시주', '연주', '대운', '세운', '월운', '일진', '건록', '제왕', '양인', '도화', '역마', '화개', '괴강', '백호', '신살', '왕상휴수사', '생극제화', '상생', '상극', '오행', '편고', '태과', '불급', '병약', '청탁', '파격', '한난조습', '근 안정성'];
const EASY_OK = { '대운': 1, '세운': 1, '월운': 1, '오행': 1, '일진': 1, '상생': 1, '상극': 1 };   // 상세풀이 전체가 쓰는 기본 낱말(처음 장에서 풀어 줌) — B 에서만 빼고 A 에서는 센다
// 한 글자 '충'은 뒤에 조사·끝이 올 때만(충돌·충동·충분 제외)
const HRE = new RegExp('(?<![가-힣])(' + HARD.sort((a, b) => b.length - a.length).map(t => t === '충' ? '충(?=[이을은과와·,.)\\s]|$)' : t).join('|') + ')(?![가-힣]*(?:하다|하게|해요|했|한다))', 'g');
const INTERNAL = /엔진(?: 계산| 지수| 구조 판정|이 계산| careerProfile)|[A-Za-z-]+\.js\b|careerProfile|fitScore|usefulElements|이 모델에서|계산값/;   // 자동차 비유의 '엔진'은 빼고, 내부 계산 이름만
const RAW_EN = /\b(strong|shaky|trim|hit|care|good|neutral|weak|on|off|mid|low|high|none|undefined|null|NaN)\b/;
(async () => {
  const noop = () => {}, el = () => ({ style: {}, classList: { add: noop, remove: noop, toggle: noop, contains: () => false }, setAttribute: noop, getAttribute: () => null, appendChild: noop, addEventListener: noop, removeEventListener: noop, querySelector: () => null, querySelectorAll: () => [], remove: noop, insertAdjacentHTML: noop, dataset: {}, children: [], innerHTML: '', textContent: '' });
  const store = new Map(), ls = { getItem: k => store.has(k) ? store.get(k) : null, setItem: (k, v) => store.set(k, String(v)), removeItem: k => store.delete(k), key: () => null, length: 0 };
  const G = globalThis;
  try { Object.defineProperty(G, 'navigator', { value: { userAgent: 'node', language: 'ko' }, configurable: true, writable: true }); } catch (e) { }
  Object.assign(G, { window: G, self: G, localStorage: ls, sessionStorage: ls, location: { hostname: 'localhost', search: '?mantraFlags=' + Object.keys(PROD).join(','), hash: '', href: 'http://localhost/report/v2/', pathname: '/report/v2/', origin: 'http://localhost' },
    document: { readyState: 'complete', documentElement: el(), body: el(), head: el(), createElement: el, getElementById: () => null, querySelector: () => null, querySelectorAll: () => [], addEventListener: noop, removeEventListener: noop, cookie: '' },
    addEventListener: noop, removeEventListener: noop, matchMedia: () => ({ matches: false, addListener: noop, addEventListener: noop }), requestAnimationFrame: f => setTimeout(f, 0), getComputedStyle: () => ({}), innerWidth: 1200, innerHeight: 800, scrollTo: noop,
    fetch: () => Promise.reject(new Error('offline')), MANTRA_FLAGS: Object.assign({}, PROD) });
  const html = fs.readFileSync(path.join(v2, 'index.html'), 'utf8'), srcs = [...html.matchAll(/<script src="([^"?]+)/g)].map(m => m[1]);
  // --overlay 폴더: 같은 상대 경로 파일이 있으면 그것을 대신 싣는다(바꾸기 전·후 비교용)
  const OVL = arg('overlay', ''), ovl = f => { if (!OVL) return f; const o = path.join(path.resolve(root, OVL), path.relative(root, f)); return fs.existsSync(o) ? o : f; };
  const fileOf = s => s.startsWith('/') ? path.join(root, s) : path.join(v2, s), loaded = [], failed = [];
  const origErr = console.error, origWarn = console.warn; console.warn = noop;
  for (const s of srcs) { const f = fileOf(s); if (!fs.existsSync(f)) { failed.push(s + ' (없음)'); continue; } try { vm.runInThisContext(fs.readFileSync(ovl(f), 'utf8'), { filename: f }); loaded.push(s); } catch (e) { failed.push(s + ' — ' + e.message.slice(0, 80)); } }
  const R = G.ReportV2, M = G.Manse;
  if (!R || !R.ReadingText || !M) throw Error('필수 모듈을 싣지 못함: ' + failed.join(' / '));
  // 화면이 기다리는 스위치 준비(오프라인이라 fetch 는 실패 → 기본 장 연결)
  for (const k of ['WeaponChapters', 'FlowChapters', 'HealthChapters', 'AptChapters']) { try { if (R[k] && R[k].ready) await R[k].ready(); } catch (e) { } }
  const { bundles } = await import(url.pathToFileURL(path.join(root, 'editorial/rebuild-20261022/index.mjs')).href);
  const C = await import(url.pathToFileURL(path.join(root, 'editorial/rebuild-20261022/compose.mjs')).href);
  const entries = Object.entries(bundles).filter(([b]) => b !== 'pilot').flatMap(([, l]) => l), chapters = [...new Set(entries.map(e => e.chapters[0]))].sort();
  const ROLE = { core: 'title', basis: 'why', notice: 'why', example: 'reality', positive: 'strength', negative: 'risk', advice: 'practice', applications: 'reinforce', second: 'reality', secondAdvice: 'practice' };
  const catalog = G.MantraEditorial ? (G.MantraEditorial.defaults().chapters || []) : [];
  const titleOf = id => (catalog.find(c => c.id === id) || {}).title || id;
  const BIRTHS = [[1992, 6, 23, 7, 'M'], [1985, 11, 2, 14, 'F'], [1970, 3, 9, 7, 'M'], [2001, 8, 30, 22, 'F'], [1960, 1, 15, 3, 'F'], [1997, 4, 4, 9, 'M'], [1978, 12, 12, 18, 'F'], [1988, 7, 7, 11, 'M'], [1995, 2, 19, 0, 'F'], [1965, 9, 28, 16, 'M'], [2008, 5, 5, 5, 'F'], [1982, 10, 10, 20, 'M']].slice(0, N);
  const now = Date.UTC(2026, 10, 27, 3);
  const pages = [];   // {chart, id, title, html}
  let errors = 0; const errSamples = [];
  for (const [y, mo, d, h, g] of BIRTHS) {
    R.FactOnce && R.FactOnce.reset && R.FactOnce.reset();
    const ch = M.compute({ year: y, month: mo, day: d, hour: h, minute: 0, calendar: 'solar', leap: false, gender: g, city: '서울' }), sd = R.SajuData.build(ch, { now }), vd = Object.assign({}, sd, { name: '민준' });
    const rep = C.composeReport(entries, sd, chapters, { preview: true }), byCh = Object.fromEntries(rep.chapters.map(x => [x.chapter, x]));
    let list = chapters.map(id => {
      const cc = byCh[id], paras = {};
      (cc && cc.sections || []).forEach(s => { const r = ROLE[s.key]; if (!r) return; paras[r] = paras[r] ? paras[r] + ' ' + s.text : s.text; });
      return { id, editorialContractId: id, editorialTopicId: id.split('_')[1], title: titleOf(id), readingVisualData: vd, readingParagraphs: Object.entries(paras).map(([role, text]) => ({ role, text })) };
    });
    let r2 = { chapters: list };
    for (const k of ['FlowChapters', 'HealthChapters', 'AptChapters']) { try { if (R[k]) r2 = R[k].add(r2, sd, '민준', M, ch) || r2; } catch (e) { errSamples.push(k + ': ' + e.message); } }
    for (const c of r2.chapters) {
      if (!c.readingVisualData) c.readingVisualData = vd; else c.readingVisualData = Object.assign({}, vd, c.readingVisualData);
      Object.defineProperty(c, 'readingFeature', { value: { M, ch, sd, now, name: '민준', assets: {}, videos: {} }, configurable: true });
      let out = ''; try { out = R.ReadingText.html(c, 0); } catch (e) { errors++; if (errSamples.length < 8) errSamples.push((c.editorialContractId || c.id) + ': ' + e.message); continue; }
      pages.push({ chart: [y, mo, d].join('-'), id: c.editorialContractId || c.id, title: c.title || titleOf(c.id), added: !!(c.flowChapter || c.aptChapter || c.healthChapter || /_h\d$/.test(c.id)), html: out });
    }
  }
  console.error = origErr; console.warn = origWarn;
  if (HTML) { const dd = path.join(root, HTML); fs.mkdirSync(dd, { recursive: true }); pages.filter(p => p.chart === pages[0].chart).forEach(p => fs.writeFileSync(path.join(dd, p.id + '.html'), '<meta charset="utf-8"><h1>' + p.title + '</h1>' + p.html)); }

  // ── 검사
  const ent = s => s.replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'");
  const strip = s => ent(s.replace(/<(script|style)[\s\S]*?<\/\1>/g, ' ').replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();
  // 구역 이름: section 의 class 중 dp-*/wp-*/블록 이름 우선, 없으면 data-sc 꼬리
  const partOf = sec => { const cls = (sec.match(/^<section[^>]*class="([^"]*)"/) || [])[1] || '', sc = (sec.match(/^<section[^>]*data-sc="([^"]*)"/) || [])[1] || '';
    const named = cls.split(/\s+/).filter(x => /^(?:dp-|wp|te-|fc-|pd-|apt|hc-|tl-|lc-|ln-|rd-blk|deep-|fe-)/.test(x) && !/^dp-embed$/.test(x));
    const tail = (sc.match(/_text_([a-z_0-9]+)$/) || sc.match(/_([a-z]+(?:_[a-z]+)?)(?:_\d+)*$/) || [])[1] || '';
    return (named[0] || tail.replace(/_\d+(?:_\d+)?$/, '') || 'body'); };
  // 블록(section 안의 dp-embed 등 하위 section 포함)으로 쪼개기
  const blocksOf = h => { const out = []; const re = /<section\b[^>]*>/g; let m; const idx = []; while ((m = re.exec(h))) idx.push(m.index); idx.push(h.length); for (let i = 0; i < idx.length - 1; i++) out.push(h.slice(idx[i], idx[i + 1])); return out; };
  const P = {};   // part → 통계
  const get = k => P[k] = P[k] || { pages: new Set(), sents: 0, long: 0, nums: 0, rawEn: 0, internal: 0, unreach: 0, bare: 0, svg: 0, svgNoGuide: 0, svgTerm: 0, score: 0, scoreNoKey: 0, rep: 0, samples: { unreach: new Map(), bare: new Map(), long: new Map(), nums: new Map(), rawEn: new Map(), internal: new Map(), svgNoGuide: new Map(), svgTerm: new Map(), scoreNoKey: new Map(), rep: new Map() } };
  const add = (S, k, s, where) => { S[k]++; const key = s.slice(0, 160); const v = S.samples[k].get(key) || { n: 0, where: new Set() }; v.n++; v.where.add(where); S.samples[k].set(key, v); };
  const GUIDE = /선 =|띠 =|색 =|점 =|읽는 법|보는 법|이 그래프|그래프는|그래프에서|점이 |길수록|높을수록|낮을수록|막대|선은|선이|점선|실선|색은|색이|색으로|띠는|띠가|가로축|세로축|가로는|세로는|범례|위로 갈수록|아래로 갈수록|칸은|표시는|동그라미/;
  // 용어가 이미 풀려 있는 자리: 쉬운 말(용어) · 용어(쉬운 말) · 용어: 설명 · 괄호 안
  const explained = (z, i, t) => { const before = z.slice(0, i), after = z.slice(i + t.length); if (/^\s?[(:：]/.test(after)) return true; const o = before.lastIndexOf('('), c = before.lastIndexOf(')'); return o > c; };
  const SCORE = /(\d{1,3})\s?점(?![가-힣]*(?:을 찍|검))/;
  const SCORE_KEY = /100점|만점|평균|기준|높을수록|50점|보통은|중간은|점수는/;
  for (const pg of pages) {
    const where = pg.id + ' ' + pg.chart;
    const seenSent = new Map();
    for (let sec of blocksOf(pg.html)) {
      sec = sec.replace(/<dl class="reading-terms">[\s\S]*?<\/dl>/g, ' ');   // 용어 풀이 목록(용어 = 뜻)은 설명 그 자체라 빼고 센다
      const part = /text-reading-origin/.test(sec.slice(0, 300)) ? 'chart-origin' : partOf(sec), S = get(part); S.pages.add(pg.id);
      const text = strip(sec.replace(/<svg[\s\S]*?<\/svg>/g, ' '));
      // A. 각주가 닿지 않는 곳(제목·dt/dd·figcaption·label·표 머리·svg text)
      const zones = [...sec.matchAll(/<(h[1-6]|dt|dd|figcaption|label|th|summary|legend|text)\b[^>]*>([\s\S]*?)<\/\1>/g)].map(m => strip(m[2])).filter(Boolean);
      for (const z of zones) { HRE.lastIndex = 0; let m; while ((m = HRE.exec(z))) { if (EASY_OK[m[1]] || explained(z, m.index, m[1])) continue; add(S, 'unreach', m[1] + ' ← ' + z, where); } }
      // B. 본문 속 단추 없는 어려운 용어(장 안 처음 나온 것만)
      const body = sec.replace(/<svg[\s\S]*?<\/svg>/g, ' ').replace(/<(h[1-6]|dt|dd|figcaption|label|th|summary|legend)\b[^>]*>[\s\S]*?<\/\1>/g, ' ').replace(/<button[^>]*class="tn"[^>]*>[\s\S]*?<\/button>/g, '〔각주〕').replace(/<span class="tip"[^>]*>[\s\S]*?<\/span>/g, '〔각주〕');   // 툴팁(span.tip)도 뜻이 붙은 용어
      const btext = strip(body);
      // C. svg 그래프
      const svgs = sec.match(/<svg[\s\S]*?<\/svg>/g) || [];
      for (const sv of svgs) { if (!/<(rect|path|polyline|line|circle)\b/.test(sv) || (sv.match(/<(rect|path|polyline|line|circle)\b/g) || []).length < 4) continue; S.svg++;
        if (!GUIDE.test(text) && !/legend|범례|lg-|-lg\b|key\b/.test(sec)) add(S, 'svgNoGuide', (text.slice(0, 120) || '(글 없음)'), where);
        const st = [...sv.matchAll(/<text\b[^>]*>([\s\S]*?)<\/text>/g)].map(m => strip(m[1])).join(' '); HRE.lastIndex = 0; let m; while ((m = HRE.exec(st))) { if (EASY_OK[m[1]]) continue; add(S, 'svgTerm', m[1] + ' ← 그림 글자: ' + st.slice(0, 80), where); } }
      // 문장 단위
      const sents = btext.split(/(?<=[.!?。])\s+|\s(?=·\s)/).map(s => s.trim()).filter(s => s.length >= 8 && /[가-힣]/.test(s));
      for (const s of sents) {
        S.sents++;
        if (s.replace(/〔각주〕/g, '').length > 90) add(S, 'long', s, where);
        if ((s.match(/\d+(?:\.\d+)?/g) || []).length >= 5) add(S, 'nums', s, where);
        if (RAW_EN.test(s.replace(/〔각주〕/g, ''))) add(S, 'rawEn', s, where);
        if (INTERNAL.test(s) && !/자동차|차예요|엔진 힘|엔진의 힘|엔진 출력|엔진 ·|엔진 [(]/.test(s)) add(S, 'internal', s, where);
        if (SCORE.test(s) && !SCORE_KEY.test(text)) add(S, 'scoreNoKey', s, where);
        if (SCORE.test(s)) S.score++;
        HRE.lastIndex = 0; let m; while ((m = HRE.exec(s))) { const t = m[1]; if (EASY_OK[t]) continue; if (explained(s, m.index, t)) continue; add(S, 'bare', t + ' ← ' + s, where); }
        const k = s.replace(/\d+/g, '#'); if (s.length >= 20) { if (seenSent.has(k) && seenSent.get(k) !== part + sec.length) add(S, 'rep', s, where); else seenSent.set(k, part + sec.length); }
      }
    }
  }
  // 단추(각주)가 붙은 용어는 B 에서 빠진다: TermNotes 는 장 안 처음 한 번만 단추를 다니, 두 번째부터 단추 없는 같은 용어는 bare 로 세지 않게 보정
  // (장 단위로 첫 등장에 단추가 있었는지는 html 에서 data-tn 으로 확인)
  for (const pg of pages) { const marked = new Set([...pg.html.matchAll(/data-tn="([^"]+)"/g)].map(m => m[1])); pg.marked = marked; }
  const markedBy = new Map(pages.map(p => [p.id + ' ' + p.chart, p.marked]));
  for (const S of Object.values(P)) { for (const [key, v] of [...S.samples.bare]) { const t = key.split(' ← ')[0]; const ws = [...v.where].filter(w => !(markedBy.get(w) || new Set()).has(t)); if (!ws.length) { S.samples.bare.delete(key); S.bare -= v.n; } else v.where = new Set(ws); } }
  const parts = Object.entries(P).sort((a, b) => (b[1].unreach + b[1].bare + b[1].svgNoGuide * 5 + b[1].long + b[1].rawEn * 5 + b[1].internal * 5) - (a[1].unreach + a[1].bare + a[1].svgNoGuide * 5 + a[1].long + a[1].rawEn * 5 + a[1].internal * 5));
  const tot = k => parts.reduce((a, [, S]) => a + S[k], 0);
  const summary = { charts: BIRTHS.length, pages: pages.length, errors, sents: tot('sents'), unreach: tot('unreach'), bare: tot('bare'), long: tot('long'), nums: tot('nums'), rawEn: tot('rawEn'), internal: tot('internal'), svg: tot('svg'), svgNoGuide: tot('svgNoGuide'), svgTerm: tot('svgTerm'), score: tot('score'), scoreNoKey: tot('scoreNoKey'), rep: tot('rep') };
  const pct = (a, b) => b ? (a / b * 100).toFixed(1) + '%' : '-';
  const md = ['# 상세풀이 블록·그래프 쉬움 검사(운영 스위치)', '', `- 사주 ${BIRTHS.length}개, 그린 장 ${pages.length}(끼워 넣는 장 ${pages.filter(p => p.added).length} 포함, 오류 ${errors}), 스크립트 ${loaded.length}/${srcs.length}`,
    `- 문장 ${summary.sents} · 각주 안 닿는 용어 ${summary.unreach} · 단추·풀이 없는 용어 ${summary.bare} · 긴 문장 ${summary.long}(${pct(summary.long, summary.sents)}) · 숫자 나열 ${summary.nums} · 영어 값 노출 ${summary.rawEn} · 내부 말 노출 ${summary.internal} · 반복 ${summary.rep}`,
    `- 그래프 ${summary.svg}개 · 읽는 법 없는 그래프 ${summary.svgNoGuide}(${pct(summary.svgNoGuide, summary.svg)}) · 그림 글자 속 용어 ${summary.svgTerm} · 점수 문장 ${summary.score} · 기준 없는 점수 ${summary.scoreNoKey}`, '',
    '## 구역(블록)별', '', '| 구역 | 장 수 | 문장 | 각주 안 닿는 용어 | 풀이 없는 용어 | 긴 문장 | 숫자 나열 | 영어 값 | 내부 말 | 그래프 | 읽는 법 없음 | 그림 속 용어 | 기준 없는 점수 | 반복 |', '|---|---|---|---|---|---|---|---|---|---|---|---|---|---|',
    ...parts.map(([k, S]) => `| ${k} | ${S.pages.size} | ${S.sents} | ${S.unreach} | ${S.bare} | ${S.long} | ${S.nums} | ${S.rawEn} | ${S.internal} | ${S.svg} | ${S.svgNoGuide} | ${S.svgTerm} | ${S.scoreNoKey} | ${S.rep} |`), ''];
  const LBL = { unreach: '각주 안 닿는 용어', bare: '풀이 없는 용어', svgNoGuide: '읽는 법 없는 그래프', svgTerm: '그림 속 용어', rawEn: '영어 값 노출', internal: '내부 말 노출', scoreNoKey: '기준 없는 점수', long: '긴 문장', nums: '숫자 나열', rep: '반복' };
  md.push('## 표본(구역별 상위)', '');
  for (const [k, S] of parts) { const rows = []; for (const t of Object.keys(LBL)) { const top = [...S.samples[t].entries()].sort((a, b) => b[1].n - a[1].n).slice(0, t === 'long' ? 3 : 5); top.forEach(([s, v]) => rows.push(`- [${LBL[t]} ×${v.n}, ${v.where.size}곳 · 예: ${[...v.where][0]}] ${s}`)); } if (rows.length) md.push('### ' + k, '', ...rows, ''); }
  if (failed.length) md.push('## 싣지 못한 스크립트', '', ...failed.map(f => '- ' + f), '');
  if (errSamples.length) md.push('## 그리기 오류 표본', '', ...errSamples.map(f => '- ' + f), '');
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT + '.md', md.join('\n'));
  fs.writeFileSync(OUT + '.json', JSON.stringify({ summary, parts: Object.fromEntries(parts.map(([k, S]) => [k, Object.assign({}, S, { pages: S.pages.size, samples: Object.fromEntries(Object.entries(S.samples).map(([t, m]) => [t, [...m.entries()].map(([s, v]) => ({ s, n: v.n, where: [...v.where].slice(0, 5) }))])) })])) }, null, 1));
  console.log(md.slice(0, 5).join('\n'));
  console.log('결과: ' + path.relative(root, OUT) + '.md / .json');
})().catch(e => { console.error(e); process.exit(1); });
