// 주제별 상세풀이 본문 전수 쉬움 검사(읽기 전용):  node tools/reading-plain-audit.cjs [--charts 12] [--out docs/READING_PLAIN_AUDIT]
// 상세풀이 화면(report/v2/index.html)이 싣는 스크립트를 같은 순서로 vm 에 싣고, 게시 문안(editorial compose, 검수 초안 포함)을
// 화면 역할(title·why·reality·strength·risk·practice·reinforce)로 넣어 ReadingText.html 로 84장을 그린다. 사용자가 읽는 글자만 모아
// 문장마다 규칙(용어로 시작·설명 없는 용어 많음·긴 문장·내부 설명·습니다체 섞임·추상 문장·한자)을 세고, 문제 문장의 출처 파일을 찾는다.
const fs = require('fs'), vm = require('vm'), path = require('path'), url = require('url');
const root = path.join(__dirname, '..'), v2 = path.join(root, 'report/v2');
const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
const N = +arg('charts', 12), OUT = path.join(root, arg('out', 'docs/READING_PLAIN_AUDIT'));
(async () => {
  // ── 1. 브라우저 흉내(문자열만 다루는 모듈이 실리도록 최소한만)
  const noop = () => {}, el = () => ({ style: {}, classList: { add: noop, remove: noop, toggle: noop, contains: () => false }, setAttribute: noop, getAttribute: () => null, appendChild: noop, addEventListener: noop, removeEventListener: noop, querySelector: () => null, querySelectorAll: () => [], remove: noop, insertAdjacentHTML: noop, dataset: {}, children: [], innerHTML: '', textContent: '' });
  const store = new Map(), ls = { getItem: k => store.has(k) ? store.get(k) : null, setItem: (k, v) => store.set(k, String(v)), removeItem: k => store.delete(k), key: () => null, length: 0 };
  const G = globalThis;
  try { Object.defineProperty(G, 'navigator', { value: { userAgent: 'node', language: 'ko' }, configurable: true, writable: true }); } catch (e) { }
  Object.assign(G, { window: G, self: G, localStorage: ls, sessionStorage: ls, location: { hostname: 'localhost', search: '?mantraFlags=lifeNarrative,premiumDepth', hash: '', href: 'http://localhost/report/v2/', pathname: '/report/v2/', origin: 'http://localhost' },
    document: { readyState: 'complete', documentElement: el(), body: el(), head: el(), createElement: el, getElementById: () => null, querySelector: () => null, querySelectorAll: () => [], addEventListener: noop, removeEventListener: noop, cookie: '' },
    addEventListener: noop, removeEventListener: noop, matchMedia: () => ({ matches: false, addListener: noop, addEventListener: noop }), requestAnimationFrame: f => setTimeout(f, 0), getComputedStyle: () => ({}), innerWidth: 1200, innerHeight: 800, scrollTo: noop,
    fetch: () => Promise.reject(new Error('offline')), MANTRA_FLAGS: { lifeNarrative: true, premiumDepth: true, topicDeep: true, luckCycle: true, elementFlow: true } });
  const html = fs.readFileSync(path.join(v2, 'index.html'), 'utf8'), srcs = [...html.matchAll(/<script src="([^"?]+)/g)].map(m => m[1]);
  const fileOf = s => s.startsWith('/') ? path.join(root, s) : path.join(v2, s), loaded = [], failed = [];
  for (const s of srcs) { const f = fileOf(s); if (!fs.existsSync(f)) { failed.push(s + ' (없음)'); continue; } try { vm.runInThisContext(fs.readFileSync(f, 'utf8'), { filename: f }); loaded.push(s); } catch (e) { failed.push(s + ' — ' + e.message.slice(0, 80)); } }
  const R = G.ReportV2, M = G.Manse;
  if (!R || !R.ReadingText || !M) throw Error('필수 모듈을 싣지 못함: ' + failed.join(' / '));
  // ── 2. 게시 문안(검수 초안 포함) → 화면 역할
  const { bundles } = await import(url.pathToFileURL(path.join(root, 'editorial/rebuild-20261022/index.mjs')).href);
  const C = await import(url.pathToFileURL(path.join(root, 'editorial/rebuild-20261022/compose.mjs')).href);
  const entries = Object.entries(bundles).filter(([b]) => b !== 'pilot').flatMap(([, l]) => l), chapters = [...new Set(entries.map(e => e.chapters[0]))].sort();
  const ROLE = { core: 'title', basis: 'why', notice: 'why', example: 'reality', positive: 'strength', negative: 'risk', advice: 'practice', applications: 'reinforce', second: 'reality', secondAdvice: 'practice' };
  const catalog = (R.MantraEditorial || G.MantraEditorial) ? (G.MantraEditorial.defaults().chapters || []) : [];
  const titleOf = id => (catalog.find(c => c.id === id) || {}).title || id;
  // ── 3. 사주 여러 개 × 84장 그리기
  const BIRTHS = [[1992, 6, 23, 7, 'M'], [1985, 11, 2, 14, 'F'], [1970, 3, 9, 7, 'M'], [2001, 8, 30, 22, 'F'], [1960, 1, 15, 3, 'F'], [1997, 4, 4, 9, 'M'], [1978, 12, 12, 18, 'F'], [1988, 7, 7, 11, 'M'], [1995, 2, 19, 0, 'F'], [1965, 9, 28, 16, 'M'], [2008, 5, 5, 5, 'F'], [1982, 10, 10, 20, 'M'], [1990, 1, 1, 12, 'F'], [1974, 8, 15, 6, 'M'], [2004, 3, 3, 15, 'M'], [1956, 6, 6, 9, 'F']].slice(0, N);
  const now = Date.UTC(2026, 10, 23, 3), shown = []; let rendered = 0, errors = 0;
  for (const [y, mo, d, h, g] of BIRTHS) {
    R.FactOnce && R.FactOnce.reset && R.FactOnce.reset();
    const ch = M.compute({ year: y, month: mo, day: d, hour: h, minute: 0, calendar: 'solar', leap: false, gender: g, city: '서울' }), sd = R.SajuData.build(ch, { now }), vd = Object.assign({}, sd, { name: '민준' });
    const rep = C.composeReport(entries, sd, chapters, { preview: true }), byCh = Object.fromEntries(rep.chapters.map(x => [x.chapter, x]));
    for (const id of chapters) {
      const cc = byCh[id], paras = {};
      (cc && cc.sections || []).forEach(s => { const r = ROLE[s.key]; if (!r) return; paras[r] = paras[r] ? paras[r] + ' ' + s.text : s.text; });
      const c = { id, editorialContractId: id, editorialTopicId: id.split('_')[1], title: titleOf(id), readingVisualData: vd, readingParagraphs: Object.entries(paras).map(([role, text]) => ({ role, text })) };
      Object.defineProperty(c, 'readingFeature', { value: { M, ch, sd, now, name: '민준', assets: {}, videos: {} } });
      let out = ''; try { out = R.ReadingText.html(c, 0); rendered++; } catch (e) { errors++; continue; }
      // 구역별 글자: <section ... data-sc="ID_text_SUFFIX">
      out.split(/(?=<section )/).forEach(sec => { const m = sec.match(/data-sc="[^"]*_text_([a-z_0-9]+)"/); if (!m) return; const part = m[1].replace(/_\d+(?:_\d+)?$/, ''), txt = sec.replace(/<(script|style|svg)[\s\S]*?<\/\1>/g, ' ').replace(/<\/strong>\s*(?=<(?:span|small|p|div)\b)/g, '</strong>\n').replace(/<small\b/g, '\n<small') /* 카드 목록의 '이름·설명·근거' 칸은 따로 센다(2026-11-24) */.replace(/<details[^>]*>\s*<summary>[\s\S]*?<\/summary>/g, ' ').replace(/<\/?(?:h[1-6]|p|li|div|dt|dd|figcaption|br|tr|td|th|section|summary|figure|ol|ul|dl|fieldset|legend|label)\b[^>]*>/g, '\n').replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/[ \t]+/g, ' ').replace(/ *\n[\n ]*/g, '\n').trim(); if (txt) shown.push({ chart: [y, mo, d].join('-'), id, part, txt }); });
    }
  }
  // --dump 폴더: 앞 두 사주의 장별 본문을 주제별 파일로(사람이 읽고 검토하는 용도)
  const DUMP = arg('dump', '');
  if (DUMP) { const dd = path.join(root, DUMP); fs.mkdirSync(dd, { recursive: true }); const charts = [...new Set(shown.map(x => x.chart))].slice(0, 2);
    for (const cht of charts) { const byTopic = {}; shown.filter(x => x.chart === cht).forEach(x => { const t = x.id.split('_')[1]; (byTopic[t] = byTopic[t] || {}); (byTopic[t][x.id] = byTopic[t][x.id] || []).push('[' + x.part + '] ' + x.txt.replace(/\n+/g, ' / ')); });
      Object.entries(byTopic).forEach(([t, chs]) => fs.writeFileSync(path.join(dd, cht + '_' + t + '.txt'), Object.entries(chs).map(([id, ps]) => '### ' + id + ' ' + titleOf(id) + '\n' + ps.join('\n')).join('\n\n'))); } }
  // ── 4. 문장 검사
  const TN = G.MantraTermNotesData || {}, TERMS = Object.keys(TN).filter(k => k.length >= 2).sort((a, b) => b.length - a.length);
  const TRE = new RegExp('(?<![가-힣])(' + TERMS.map(t => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|') + ')(?!하|해|한|할|합|했|없|적)', 'g');
  const META = /엔진|계산값|계산한|계산했|만세력에서|문안|검수|학파|해석 범위|적용 조건|판정|지표이|내부 지표|조건을 (?:충족|만족)|선택합니다|규칙이 연결|단정하지|확정하지|참고 해설|근거 강도/;
  const ABS = /기운|흐름|구조|에너지|균형|작용|성향|경향|요소|측면|영역|가능성|상징|의미|방향성|힘이 실/g;
  const LIFE = /회사|팀장|상사|동료|친구|연인|배우자|가족|부모|집|퇴근|출근|주말|회의|면접|이직|승진|통장|카드|결제|저축|대출|계약|매출|부업|이사|여행|카톡|메시지|약속|운동|잠|아침|저녁|커피|휴대폰|일정|메모|돈|월급|연봉|지출|선물|데이트|결혼|명절|시험|공부|모임|술자리|병원|\d+\s?(?:원|만 원|분|시간|일|주|달|개월|년|살|세)|"[^"]{2,}"|“[^”]{2,}”/;
  const FORMAL = /(?:습니다|입니다|됩니다|합니다|십시오)[.!?]?$/, HANJA = /[一-鿿]{2,}/;
  const sents = t => t.split(/\n|(?<=[.!?])\s+(?=[^\s])/).map(s => s.trim()).filter(s => s.length >= 8 && /[가-힣]/.test(s));
  const uniq = new Map(), byPart = {};
  for (const x of shown) for (const s of sents(x.txt)) {
    const P = byPart[x.part] = byPart[x.part] || { n: 0, chars: 0, flags: {} }; P.n++; P.chars += s.length;
    const key = s.replace(/민준님?/g, '◯').replace(/\d{4}년/g, 'YYYY년').replace(/만 \d+~\d+세/g, '만 A~B세');
    let u = uniq.get(key); if (!u) { u = { s, part: x.part, ids: new Set(), n: 0, flags: [] }; uniq.set(key, u);
      TRE.lastIndex = 0; const terms = [...s.matchAll(TRE)].map(m => m[1]), first = terms.length && s.indexOf(terms[0]) <= 3;
      if (first && terms.length >= 2) u.flags.push('용어로 시작');
      if (terms.length >= 4 || (terms.length >= 3 && s.length < 70)) u.flags.push('용어 많음(' + terms.length + ')');
      if (s.length > 90) u.flags.push('긴 문장(' + s.length + '자)');
      if (META.test(s)) u.flags.push('내부 설명');
      if (FORMAL.test(s)) u.flags.push('습니다체');
      if ((s.match(ABS) || []).length >= 3 && !LIFE.test(s)) u.flags.push('추상');
      if (HANJA.test(s.replace(/\([^)]*\)/g, ''))) u.flags.push('한자');
    }
    u.n++; u.ids.add(x.id); u.flags.forEach(f => { const k = f.replace(/\(.*\)/, ''); P.flags[k] = (P.flags[k] || 0) + 1; });
  }
  // ── 5. 출처 파일 찾기(문장 앞 18자 조각을 문안 파일에서 찾는다)
  const SRC = [...fs.readdirSync(v2).filter(f => /\.js$/.test(f)).map(f => 'report/v2/' + f), ...fs.readdirSync(path.join(root, 'editorial/rebuild-20261022')).filter(f => /\.mjs$/.test(f)).map(f => 'editorial/rebuild-20261022/' + f), 'engine.js', 'luck-cycle.js', 'element-strategy.js', 'amhap.js', 'ten-god-roles.js', 'gyeok-structure.js'].filter(f => fs.existsSync(path.join(root, f)));
  const texts = SRC.map(f => [f, fs.readFileSync(path.join(root, f), 'utf8')]);
  const whereIs = s => { const frags = s.replace(/[“”"']/g, '').split(/[,.·—]/).map(x => x.trim()).filter(x => x.length >= 10).sort((a, b) => b.length - a.length); for (const fr of frags.slice(0, 3)) { const p = fr.slice(0, 18), hit = texts.filter(([, t]) => t.includes(p)).map(([f]) => f); if (hit.length) return hit.slice(0, 2).join(', '); } return '(조합 문장)'; };
  const bad = [...uniq.values()].filter(u => u.flags.length).sort((a, b) => b.flags.length - a.flags.length || b.n - a.n);
  bad.forEach(u => { u.src = whereIs(u.s); });
  // ── 6. 결과
  const bySrc = {}; bad.forEach(u => { const k = u.src.split(',')[0]; const B = bySrc[k] = bySrc[k] || { n: 0, flags: {} }; B.n++; u.flags.forEach(f => { const kk = f.replace(/\(.*\)/, ''); B.flags[kk] = (B.flags[kk] || 0) + 1; }); });
  const total = [...uniq.values()].length;
  const md = ['# 상세풀이 본문 전수 쉬움 검사', '', `- 사주 ${BIRTHS.length}개 × ${chapters.length}장, 그린 장 ${rendered}(오류 ${errors}), 실은 스크립트 ${loaded.length}/${srcs.length}`, `- 화면 문장 ${[...uniq.values()].reduce((a, u) => a + u.n, 0)}개 · 서로 다른 문장 ${total}개 · 문제 문장 ${bad.length}개(${(bad.length / total * 100).toFixed(1)}%)`, '',
    '## 화면 구역별', '', '| 구역 | 문장 | 평균 길이 | 용어로 시작 | 용어 많음 | 긴 문장 | 내부 설명 | 습니다체 | 추상 | 한자 |', '|---|---|---|---|---|---|---|---|---|---|',
    ...Object.entries(byPart).sort((a, b) => b[1].n - a[1].n).map(([k, P]) => `| ${k} | ${P.n} | ${Math.round(P.chars / P.n)} | ${P.flags['용어로 시작'] || 0} | ${P.flags['용어 많음'] || 0} | ${P.flags['긴 문장'] || 0} | ${P.flags['내부 설명'] || 0} | ${P.flags['습니다체'] || 0} | ${P.flags['추상'] || 0} | ${P.flags['한자'] || 0} |`), '',
    '## 출처 파일별 문제 문장(서로 다른 문장 수)', '', '| 파일 | 문제 문장 | 주된 문제 |', '|---|---|---|', ...Object.entries(bySrc).sort((a, b) => b[1].n - a[1].n).map(([k, B]) => `| ${k} | ${B.n} | ${Object.entries(B.flags).sort((a, b) => b[1] - a[1]).map(([f, n]) => f + ' ' + n).join(', ')} |`), '',
    '## 문제 문장 표본(문제 많은 순 200개)', '', ...bad.slice(0, 200).map(u => `- [${u.flags.join(' · ')}] (${u.part} · ${u.src} · ${u.ids.size}장) ${u.s}`)];
  if (failed.length) md.push('', '## 싣지 못한 스크립트', '', ...failed.map(f => '- ' + f));
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT + '.md', md.join('\n'));
  fs.writeFileSync(OUT + '.json', JSON.stringify({ charts: BIRTHS.length, rendered, errors, total, bad: bad.map(u => ({ s: u.s, flags: u.flags, part: u.part, src: u.src, chapters: [...u.ids], n: u.n })), byPart, bySrc }, null, 1));
  console.log(md.slice(0, 6).join('\n'));
  console.log('결과: ' + path.relative(root, OUT) + '.md / .json');
})().catch(e => { console.error(e); process.exit(1); });
