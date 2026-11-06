// 운명의 타임라인 — 사전 문안 현황표(커버리지) 생성기
//   node tools/timeline-copy-coverage.cjs [사주 수=300]
//   → docs/TIMELINE_COPY_COVERAGE_2026-11-06.md, docs/timeline-copy-coverage.json
// 엔진(engine.js)과 타임라인 모듈(report/v2/timeline.js)을 그대로 돌려, 사용자가 여는 카드(대운·세운·월운)마다
// 어떤 조건이 걸리는지 세고, 그 조건에 지금 어떤 문안이 있는지 적는다. 점수·판단은 만들지 않고 읽기만 한다.
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const root = path.join(__dirname, '..');
vm.runInThisContext(fs.readFileSync(path.join(root, 'engine.js'), 'utf8'), { filename: 'engine.js' });
globalThis.window = globalThis;
['chapters', 'saju-data', 'rules', 'narrator', 'content', 'content-pro', 'content-pro2', 'topics', 'intro-text', 'story-director', 'luck6', 'timeline']
  .forEach(n => vm.runInThisContext(fs.readFileSync(path.join(root, 'report/v2', n + '.js'), 'utf8'), { filename: n + '.js' }));
const R = globalThis.ReportV2, M = globalThis.Manse, T = R.Timeline, D = R.StoryDirector;
const LI = require(path.join(root, 'luck-interpret.js'));

const N = +process.argv[2] || 300, NOW = Date.UTC(2026, 10, 6);
let seed = 20261106; const rnd = () => (seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296;
const LV = { daeun: '대운', seun: '세운', wolun: '월운' }, FN = { money: '재물', career: '직업', love: '애정' };
const TGS = ['비견', '겁재', '식신', '상관', '편재', '정재', '편관', '정관', '편인', '정인'];
const POS = { year: '년주', month: '월주', day: '일주', hour: '시주' };

// ── 집계 ──
const cnt = {}; const inc = (tbl, k) => { (cnt[tbl] = cnt[tbl] || {})[k] = (cnt[tbl][k] || 0) + 1; };
const total = { daeun: 0, seun: 0, wolun: 0 };
const perPerson = { daeunMeaning: [], seunMeaning: [], liHeadline: [] };
const phraseUse = {};
let reasonsN = 0;

for (let i = 0; i < N; i++) {
  const ch = M.compute({ year: 1955 + Math.floor(rnd() * 55), month: 1 + Math.floor(rnd() * 12), day: 1 + Math.floor(rnd() * 28), hour: Math.floor(rnd() * 24), minute: Math.floor(rnd() * 60), calendar: 'solar', leap: false, gender: rnd() < 0.5 ? 'M' : 'F', city: '서울' });
  const roles = (ch.yong && ch.yong.roles) || ch.yongAll.eokbu.roles;
  const dl = T.daeun(M, ch, NOW).filter(x => !x.pre), cur = dl.find(x => x.isCurrent) || dl[0], nxt = dl[dl.indexOf(cur) + 1];
  const items = dl.map(x => ['daeun', x]);
  [cur, nxt].filter(Boolean).forEach(d => T.years(M, ch, d.startYear, NOW).forEach(y => items.push(['seun', y])));
  [2026, 2027].forEach(Y => T.months(M, ch, Y, NOW).forEach(m => items.push(['wolun', m])));

  perPerson.daeunMeaning.push(new Set(dl.map(x => x.meaning)).size);
  perPerson.seunMeaning.push(new Set(items.filter(x => x[0] === 'seun').map(x => x[1].meaning)).size);
  const heads = new Set();

  items.forEach(([lv, it]) => {
    const p = it._ref.p; total[lv]++;
    const rS = roles[M.stemEl(p.s)], rB = roles[M.BR_EL[p.b]];
    reasonsN += (it.reasons || []).length;
    inc('sixLevel', it.six + '|' + LV[lv]);
    inc('tgRole', p.stemTG + '|' + rS);
    inc('sixTgGroup', it.six + '|' + M.TG_GROUP[(TGS.indexOf(p.stemTG) / 2) | 0]);
    inc('roleCombo', rS + '/' + rB);
    inc('cond', (it.condition || '없음') + '|' + it.six);
    if (it.overlays && it.overlays.volatility) inc('overlay', '변동 신호|' + LV[lv]);
    if (it.overlays && it.overlays.defense) inc('overlay', '방어 신호|' + LV[lv]);
    ['money', 'career', 'love'].forEach(k => { const f = it.fields && it.fields[k]; if (f) inc('field', FN[k] + '|' + f.band); });
    const rels = M.luckRelations(ch, p).rels;
    if (!rels.length) inc('relType', '(관계 없음)');
    const seen = {};
    rels.forEach(r => { if (!seen[r.type]) { seen[r.type] = 1; inc('relType', r.type); } r.members.filter(m => m !== 'luck').forEach(m => inc('relPos', POS[m])); });
    if (rels.some(r => r.members.indexOf('day') >= 0)) inc('relDay', 'yes');
    // luck-interpret 가 이 카드에 대해 고르는 문구(타임라인 화면에는 아직 연결되지 않음)
    const r = LI.build(M, ch, p, lv, lv === 'seun' ? { daeun: p.daeun } : {});
    // headline 은 core 문구를 use() 없이 바로 읽어 phraseIds 에 남지 않으므로 여기서 함께 센다
    r.evidence.phraseIds.concat(['tg.' + p.stemTG + '.core']).forEach(id => { phraseUse[id] = (phraseUse[id] || 0) + 1; });
    heads.add(r.headline);
  });
  perPerson.liHeadline.push(heads.size);
}

// ── 파생 지표 ──
const allCards = total.daeun + total.seun + total.wolun;
const pctOf = (v, tot) => (100 * v / tot).toFixed(1) + '%';
const sorted = tbl => Object.entries(cnt[tbl] || {}).sort((a, b) => b[1] - a[1]);
const avg = a => (a.reduce((s, v) => s + v, 0) / a.length).toFixed(1);
const liSrc = fs.readFileSync(path.join(root, 'luck-interpret.js'), 'utf8');
const REL_KEYS = ((liSrc.match(/var REL_TEXT = \{([\s\S]*?)\};/) || [, ''])[1].match(/'([^']+)':/g) || []).map(x => x.slice(1, -2));
const relTypes = sorted('relType').map(x => x[0]).filter(t => t !== '(관계 없음)');
const relMissing = relTypes.filter(t => REL_KEYS.indexOf(t) < 0);
const fieldLow = ['재물', '직업', '애정'].map(k => {
  const t = sorted('field').filter(([x]) => x.indexOf(k + '|') === 0), all = t.reduce((s, x) => s + x[1], 0);
  return [k, t.filter(([x]) => /낮음/.test(x)).reduce((s, x) => s + x[1], 0) / all];
});
const fieldNowCount = Object.values(D.FIELD_NOW).reduce((s, o) => s + Object.keys(o).length, 0);
const unused = LI.PHRASES.map(p => p.id).filter(id => !phraseUse[id]);

// ── 문서 ──
const out = [], W = s => out.push(s);
W('# 운명의 타임라인 사전 문안 현황표 (2026-11-06)');
W('');
W(`샘플 사주 ${N}개 · 카드 ${allCards.toLocaleString()}장(대운 ${total.daeun.toLocaleString()} · 세운 ${total.seun.toLocaleString()} · 월운 ${total.wolun.toLocaleString()}) · 다시 만들기: \`node tools/timeline-copy-coverage.cjs ${N}\``);
W('');
W('세운은 현재·다음 대운의 20년, 월운은 2026·2027년 24개월을 셌습니다. "카드 비율"은 사용자가 여는 카드 중 그 조건이 나오는 비율입니다. 엔진 값을 읽기만 했고 점수나 판단은 새로 만들지 않았습니다.');
W('');
W('## 1. 한눈에 보기');
W('');
W('| 항목 | 현재 상태 |');
W('|---|---|');
W('| 타임라인 카드의 해석 문장 | 6분류 설명 **6줄**이 전부입니다. 대운·세운·월운 구분이 없고 모든 사주에 같은 문장이 나옵니다. |');
W(`| 한 사람이 대운 카드 약 ${(total.daeun / N).toFixed(0)}개에서 보는 서로 다른 설명 | 평균 **${avg(perPerson.daeunMeaning)}줄** |`);
W(`| 한 사람이 세운 20년에서 보는 서로 다른 설명 | 평균 **${avg(perPerson.seunMeaning)}줄** |`);
W(`| 운세 환경 해석 문구 DB (luck-interpret.js) | ${LI.PHRASES.length}개(십성 10 × 9종), 기본값 전부 \`draft\` · **타임라인 카드에 미연결** · 연결하면 한 사람당 서로 다른 핵심 문장 평균 ${avg(perPerson.liHeadline)}줄 |`);
W(`| 무빙툰 흐름 문안 (story-director.js) | 흐름 ${Object.keys(D.SEASON).length}개 × 헤드라인·본문·할 일·함정, 분야 3 × 등급 5 = ${fieldNowCount}줄 · "지금" 시점용 · **타임라인 카드에 미연결** |`);
W(`| 엔진이 만드는 판정 이유 문장 (ev.reasons) | 카드당 평균 ${(reasonsN / allCards).toFixed(1)}줄이 이미 계산되지만 상세 카드에는 보이지 않습니다. |`);
W('');
W('## 2. 먼저 정할 문제');
W('');
W(`1. **관계 설명 누락** — 엔진이 내는 관계 ${relTypes.length}종 가운데 ${relMissing.length}종은 luck-interpret 의 관계 설명(REL_TEXT)에 없어 일반 문장으로 떨어집니다: ` + (relMissing.length ? relMissing.map(t => `${t}(카드의 ${pctOf(cnt.relType[t], allCards)})`).join(', ') : '없음') + '.');
const lowTxt = fieldLow.map(([k, v]) => k + ' ' + (v * 100).toFixed(0) + '%').join(', ');
W(fieldLow.some(([, v]) => v > 0.4)
  ? `2. **분야 등급이 낮은 쪽으로 쏠림** — "다소 낮음·낮음" 비율이 ${lowTxt}입니다. 이대로 등급별 문안을 쓰면 대부분의 사람이 대부분의 시기에 "낮음" 문장을 봅니다. 등급 기준(engine.js DOMAIN_SCORE_THRESHOLDS)을 다시 봐야 합니다.`
  : `2. **분야 등급 분포** — "다소 낮음·낮음" 비율이 ${lowTxt}입니다. 2026-11-06 분야별 구간으로 재조정했습니다(docs/FIELD_BAND_REVIEW_2026-11-06.md). 직업은 활성도라 문안에서 "일이 많이 움직이는 / 잔잔한 시기"로 풉니다.`);
W('3. **이름 불일치** — 타임라인 6분류는 "변동기(volatility)", 무빙툰 흐름 문안은 "전환(transition)"입니다. 무빙툰 문안을 가져다 쓸 때 짝을 맞춰야 합니다.');
W('');
W('## 3. 조건별 빈칸 (자주 나오는 순)');
W('');
W('표의 칸은 모두 지금 **전용 문장이 없는 칸**입니다. 각 표 위에 그 조건에 대해 지금 쓸 수 있는 문안을 적었습니다.');
W('');
const section = (title, tbl, now, note, opt) => {
  opt = opt || {};
  W('### ' + title); W('');
  W('- 지금 화면: ' + now[0]); W('- 미연결 문안: ' + now[1]); if (note) W('- ' + note); W('');
  W('| 조건 | 카드 비율 |' + (opt.noAcc ? '' : ' 누적 |')); W('|---|---:|' + (opt.noAcc ? '' : '---:|'));
  let acc = 0; const rows = sorted(tbl), sum = rows.reduce((s, x) => s + x[1], 0);
  rows.forEach(([k, v]) => { acc += v; W(`| ${k.replace('|', ' · ')} | ${pctOf(v, allCards)} |` + (opt.noAcc ? '' : ` ${pctOf(acc, sum)} |`)); });
  W('');
};
section('3-1. 6분류 × 시간 단위 (18칸) — 카드 첫 문장', 'sixLevel',
  ['6분류마다 1줄, 시간 단위 구분 없음', 'story-director SEASON 6세트("지금" 시점 기준이라 대운·월운용으로 다시 써야 함)'],
  '"10년 대운의 축적기"와 "한 달 월운의 축적기"가 같은 문장입니다.');
section('3-2. 운의 천간 십성 × 그 오행의 용신 역할 (50칸) — 사람마다 달라지는 핵심', 'tgRole',
  ['없음', 'luck-interpret 십성 core 1줄 + "○은 이 사주의 ○신 역할" 템플릿(두 문장이 따로 붙음)'],
  '같은 정재라도 용신이면 "받아 쓰는 돈", 기신이면 "묶이는 돈"으로 읽힙니다. 칸마다 비율이 1~5%로 고르게 퍼져 있어 50칸을 모두 채워야 효과가 납니다.');
section('3-3. 6분류 × 십성 묶음 (30칸)', 'sixTgGroup',
  ['6분류 1줄', 'luck-interpret 십성 문구(6분류와 무관)'],
  '6분류는 십성 묶음과 많이 겹칩니다(축적기는 대부분 인성). 누적 비율을 보고 상위 칸만 쓰면 됩니다.');
section('3-4. 원국과의 관계 종류', 'relType',
  ['근거 상자에 관계 이름만', `luck-interpret REL_TEXT ${REL_KEYS.length}종 + 자리 뜻 템플릿`],
  '한 카드에 관계가 여러 개 걸릴 수 있어 합계가 100%를 넘습니다(누적 열 생략). 일주(나·배우자 자리)와 관계가 걸리는 카드는 ' + pctOf((cnt.relDay || {}).yes || 0, allCards) + '입니다.', { noAcc: true });
W('관계가 걸리는 자리는 고르게 나옵니다: ' + sorted('relPos').map(([k, v]) => k + ' ' + pctOf(v, allCards)).join(' · ') + '. 자리마다 문장을 따로 쓰기보다 관계 종류별 문장에 일주만 한 줄 더하는 편이 효율적입니다.');
W('');
section('3-5. 적합 상태 × 6분류', 'cond',
  ['"상태 ○○" 글자만', 'luck-interpret 적합도 1줄(순풍·부담·주의만, 6분류 무관)']);
section('3-6. 분야 점수 등급', 'field',
  ['막대 + 등급 글자만', `story-director FIELD_NOW ${fieldNowCount}줄("지금" 시점용)`],
  '2번 문제(낮음 쏠림)를 먼저 정해야 합니다. 분야마다 합계가 100%이므로 누적 열은 생략합니다.', { noAcc: true });
section('3-7. 변동·방어 신호', 'overlay',
  ['칩 글자만', 'luck-interpret: 변동성 55 이상이면 "큰 결정 주의" 1줄'], null, { noAcc: true });
W('### 3-8. 용신 역할 조합 (천간 / 지지)'); W('');
W('천간과 지지의 역할이 다른 카드가 대부분입니다. 한 문장 안에서 "겉(천간)과 속(지지)"을 나눠 말하는 틀이 필요합니다.'); W('');
W('| 조합 | 카드 비율 |'); W('|---|---:|');
sorted('roleCombo').forEach(([k, v]) => W(`| ${k} | ${pctOf(v, allCards)} |`)); W('');
const same = sorted('roleCombo').filter(([k]) => k.split('/')[0] === k.split('/')[1]).reduce((s, x) => s + x[1], 0);
W(`천간·지지 역할이 같은 카드는 ${pctOf(same, allCards)}입니다.`); W('');

W('## 4. luck-interpret 문구 사용 빈도'); W('');
W('타임라인 카드에 연결했다고 가정하고 문구가 몇 번 뽑히는지 셌습니다. 많이 뽑히는 문구부터 검수하면 됩니다.'); W('');
W('| 문구 ID | 뽑힌 횟수 | 카드 대비 |'); W('|---|---:|---:|');
Object.entries(phraseUse).sort((a, b) => b[1] - a[1]).forEach(([k, v]) => W(`| \`${k}\` | ${v.toLocaleString()} | ${pctOf(v, allCards)} |`));
W(''); W(`한 번도 뽑히지 않은 문구 ${unused.length}개` + (unused.length ? ': ' + unused.map(x => '`' + x + '`').join(', ') : '') + '.');
if (unused.length) W('영역별 대표 십성을 고르는 규칙(pickTG)상 이 십성들은 해당 영역 장면에 뽑히지 않습니다. 검수 우선순위에서 빼도 되고, 규칙을 바꿀 생각이 없다면 정리 대상입니다.');
W('');

W('## 5. 채우는 순서 제안'); W('');
W('카드 비율이 높고 지금 전용 문장이 없는 칸부터 채웁니다.'); W('');
W('0. **2번 문제 정리** — 빠진 관계 설명(원진·귀문관) 보충, 변동기/전환 이름 맞추기. 분야 등급 기준은 2026-11-06 재조정 완료.');
W('1. **6분류 × 시간 단위 18칸** — 카드 첫 문장(후킹). 칸 수가 적고 모든 카드에 나오므로 효과가 가장 큽니다. story-director SEASON 문안을 바탕으로 씁니다.');
W('2. **십성 × 용신 역할 50칸** — 사람마다 달라지는 핵심 문장. 3-2 표 상위 칸부터 씁니다. 천간·지지 역할이 다를 때의 연결 틀(3-8)도 함께 정합니다.');
W('3. **분야 등급 줄** — 등급 기준을 정한 뒤 FIELD_NOW 를 대운·세운·월운용으로 나눕니다.');
W('4. **관계** — 관계 종류별 문장 + 일주 관계 한 줄.');
W('5. **적합 상태 × 6분류**, **변동·방어 신호** — 보조 문장.');
W(''); W('새 문구는 luck-interpret.js 문구 DB에 넣어 기존 검수·게시 흐름(관리자 탭, /api/luck-phrases, 금지어 검사)을 그대로 씁니다. 용어(용신·십성·충·합 등)는 문장 안에서 풀어 쓰지 않고 용어 탭 말풍선으로 연결합니다.');

fs.writeFileSync(path.join(root, 'docs/TIMELINE_COPY_COVERAGE_2026-11-06.md'), out.join('\n') + '\n');
fs.writeFileSync(path.join(root, 'docs/timeline-copy-coverage.json'), JSON.stringify({ N, total, relMissing, fieldLow,
  perPerson: { daeunMeaning: +avg(perPerson.daeunMeaning), seunMeaning: +avg(perPerson.seunMeaning), liHeadline: +avg(perPerson.liHeadline) }, counts: cnt, phraseUse, unused }, null, 1));
console.log(`카드 ${allCards} · 대운 설명 평균 ${avg(perPerson.daeunMeaning)}줄 · 관계 설명 누락 ${relMissing.join(',') || '없음'} · 미사용 문구 ${unused.length}`);
