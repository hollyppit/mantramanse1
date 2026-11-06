// 운명의 타임라인 주제별 장 — 사람 간 문안 겹침률 측정
//   node tools/reading-overlap.cjs [사주 수=600]
//   → docs/READING_OVERLAP_2026-11-06.md, docs/reading-overlap.json
// rebuild 장 문안(editorial/rebuild-20261022, 1,025개)을 오프라인 조립기(compose.mjs: 조건 → 후보 → 상위 1~2개)로 고르고,
// 두 사람이 같은 장에서 같은 문안 조합을 받을 확률을 잰다. 엔진 값만 읽고, 네트워크·DB·AI 호출이 없다.
// 주의: 운영 화면은 게시된 라이브러리(functions/_reviewed-library.js)로 조립한다. 같은 문안·같은 조건(deriveFacts)을 쓰지만
//       고르는 개수·순서 규칙이 다를 수 있으므로, 이 값은 "조건 설계가 얼마나 사람을 가르는가"의 지표로 읽는다.
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const root = path.join(__dirname, '..');
(async () => {
  const { bundles } = await import(path.join(root, 'editorial/rebuild-20261022/index.mjs').replace(/^([A-Za-z]):/, 'file:///$1:').replace(/\\/g, '/'));
  const toUrl = f => require('url').pathToFileURL(path.join(root, f)).href;
  const Eng = await import(toUrl('editorial/rebuild-20261022/engine.mjs')), IK = await import(toUrl('functions/_ik.js'));
  const C = await import(path.join(root, 'editorial/rebuild-20261022/compose.mjs').replace(/^([A-Za-z]):/, 'file:///$1:').replace(/\\/g, '/'));
  const entries = [...bundles.self, ...bundles.self2, ...bundles.self3, ...bundles.self4, ...bundles.wealth, ...bundles.career, ...bundles.love, ...bundles.health, ...bundles.creative, ...bundles.remedy];
  const chapters = [...new Set(entries.map(e => e.chapters[0]))].sort();
  const byId = Object.fromEntries(entries.map(e => [e.id, e]));
  global.fetch = () => { throw Error('network-forbidden'); };
  global.window = globalThis;
  for (const f of ['engine.js', 'report/v2/saju-data.js', 'report/v2/reading-catalog.js']) vm.runInThisContext(fs.readFileSync(path.join(root, f), 'utf8'), { filename: f });

  const N = +process.argv[2] || 600;
  let seed = 20261106; const rnd = () => (seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296;
  const sig = {}, entryHit = {}, keyHit = {}, missing = {}, lens = {}, why = {}, tie = {}, cand = {}, sigFull = {};
  chapters.forEach(c => { sig[c] = {}; sigFull[c] = {}; missing[c] = 0; lens[c] = []; why[c] = {}; tie[c] = 0; cand[c] = []; });
  const people = [];   // 사람마다 장별 서명(같은 문안 조합인지 비교용)
  for (let i = 0; i < N; i++) {
    const sd = ReportV2.SajuData.build(Manse.compute({ year: 1950 + Math.floor(rnd() * 60), month: 1 + Math.floor(rnd() * 12), day: 1 + Math.floor(rnd() * 28), hour: Math.floor(rnd() * 24), minute: Math.floor(rnd() * 60), calendar: 'solar', gender: rnd() < .5 ? 'M' : 'F', city: '서울' }), { now: Date.UTC(2026, 10, 6, 3) });
    const rep = C.composeReport(entries, sd, chapters, { preview: true }), mine = {};
    const facts = IK.deriveFacts(sd);
    for (const ch of rep.chapters) {
      // 이 사람만 따로 조립(다른 장과의 중복 제거 없이)했을 때 후보 수와, 1순위가 동점 해시로만 정해졌는지
      const sim = Eng.simulate(entries, sd, ch.chapter, { preview: true }), rk = sim.selected.length ? C.rank(sim.selected, sim.trace, facts, ch.chapter) : [];
      cand[ch.chapter].push(rk.length);
      const solo = rk.length ? rk[0].e.id : '(후보 없음)'; sigFull[ch.chapter][solo] = (sigFull[ch.chapter][solo] || 0) + 1;
      if (rk.length > 1 && rk[0].e.priority === rk[1].e.priority && rk[0].spec === rk[1].spec) tie[ch.chapter]++;
      if (ch.coverage !== 'matched') { missing[ch.chapter]++; why[ch.chapter][ch.coverage] = (why[ch.chapter][ch.coverage] || 0) + 1; mine[ch.chapter] = '(없음:' + ch.coverage + ')'; continue; }
      const s = ch.picks.map(p => p.id).join('+'); mine[ch.chapter] = s;
      sig[ch.chapter][s] = (sig[ch.chapter][s] || 0) + 1; lens[ch.chapter].push(ch.text.length);
      ch.picks.forEach(p => { entryHit[p.id] = (entryHit[p.id] || 0) + 1; p.matched.forEach(m => { const k = String(m.key).split('.')[0]; keyHit[k] = (keyHit[k] || 0) + 1; }); });
    }
    people.push(mine);
  }

  // ── 지표 ──
  const topicOf = c => c.replace(/^timeline_/, '').replace(/_(\d+|peak)$/, '');
  const TOPIC = { self: '종합풀이(나)', wealth: '재물운', career: '커리어운', love: '인연운', health: '건강', creative: '창작·전생', remedy: '개운법' };
  const rows = chapters.map(c => {
    const cnt = Object.values(sig[c]), tot = cnt.reduce((a, b) => a + b, 0) + missing[c];
    const p2 = Object.values(sig[c]).reduce((s, v) => s + (v / tot) ** 2, 0) + (missing[c] / tot) ** 2;   // 무작위 두 사람이 이 장에서 같은 결과를 받을 확률
    const top = Object.entries(sig[c]).sort((a, b) => b[1] - a[1])[0] || ['-', 0];
    const avgLen = lens[c].length ? Math.round(lens[c].reduce((a, b) => a + b, 0) / lens[c].length) : 0;
    const sameContent = cnt.length ? cnt.reduce((x, v) => x + (v / (tot - missing[c])) ** 2, 0) : 0;   // 둘 다 글을 받은 경우만 비교
    const soloTot = Object.values(sigFull[c]).reduce((a, b) => a + b, 0), soloSame = Object.values(sigFull[c]).reduce((x, v) => x + (v / soloTot) ** 2, 0);
    return { chapter: c, topic: topicOf(c), kinds: cnt.length, same: p2, sameContent, soloSame, tie: tie[c] / tot, cand: cand[c].reduce((a, b) => a + b, 0) / cand[c].length, noCand: cand[c].filter(x => !x).length / cand[c].length, dupSupp: (why[c]['suppressed-duplicate'] || 0) / tot, noEvidence: (why[c]['missing-evidence'] || 0) / tot, top: top[0], topShare: top[1] / tot, missing: missing[c] / tot, avgLen, pool: entries.filter(e => e.chapters.includes(c)).length };
  });
  // 실제 사람 쌍으로 확인: 무작위 쌍 3,000개에서 같은 장 수
  let pairSame = 0, pairs = 0; const pairDist = {};
  for (let k = 0; k < 3000; k++) { const a = people[Math.floor(rnd() * N)], b = people[Math.floor(rnd() * N)]; if (a === b) continue; let s = 0; chapters.forEach(c => { if (a[c] === b[c]) s++; }); pairSame += s; pairs++; const bucket = Math.floor(100 * s / chapters.length / 10) * 10; pairDist[bucket] = (pairDist[bucket] || 0) + 1; }
  const pct = v => (100 * v).toFixed(0) + '%', avg = a => a.reduce((x, y) => x + y, 0) / a.length;
  const byTopic = {}; rows.forEach(r => { (byTopic[r.topic] = byTopic[r.topic] || []).push(r); });
  const dominant = Object.entries(entryHit).map(([id, v]) => ({ id, share: v / N, chapter: byId[id].chapters[0], when: Object.keys(byId[id].when || {}) })).filter(x => x.share >= 0.4).sort((a, b) => b.share - a.share);
  const keyTot = Object.values(keyHit).reduce((a, b) => a + b, 0);

  const out = [], W = s => out.push(s);
  W('# 운명의 타임라인 주제별 장 — 문안 겹침률 (2026-11-06)'); W('');
  W(`가상 사주 ${N}명 × ${chapters.length}장 · rebuild 문안 ${entries.length}개 · 다시 만들기: \`node tools/reading-overlap.cjs ${N}\``); W('');
  W('**겹침률** = 무작위로 고른 두 사람이 그 장에서 **똑같은 문안 조합**을 받을 확률입니다. 0%에 가까울수록 사람마다 다르고, 100%면 모두 같은 글을 읽습니다.'); W('');
  W('측정은 오프라인 조립기(`editorial/rebuild-20261022/compose.mjs`)로 했습니다. 운영 화면과 같은 문안·같은 조건 계산(`deriveFacts`)을 쓰지만 고르는 개수·순서 규칙은 다를 수 있어, "조건 설계가 사람을 얼마나 가르는가"를 보는 지표입니다.'); W('');
  W('## 1. 한눈에 보기'); W('');
  W('| 항목 | 값 |'); W('|---|---|');
  W(`| 장 평균 겹침률 | **${pct(avg(rows.map(r => r.same)))}** |`);
  W(`| 두 사람이 똑같은 글을 받는 장 (실제 쌍 ${pairs.toLocaleString()}개 평균) | ${chapters.length}장 중 **${(pairSame / pairs).toFixed(1)}장** (${pct(pairSame / pairs / chapters.length)}) |`);
  W(`| 겹침률 50% 이상인 장 | ${rows.filter(r => r.same >= 0.5).length}장 |`);
  W(`| 겹침률 25% 이상인 장 | ${rows.filter(r => r.same >= 0.25).length}장 |`);
  W(`| 장마다 나오는 서로 다른 결과 수 (중앙값) | ${rows.map(r => r.kinds).sort((a, b) => a - b)[Math.floor(rows.length / 2)]}가지 |`);
  W(`| 둘 다 글을 받은 경우만 본 겹침률 | ${pct(avg(rows.map(r => r.sameContent)))} |`);
  W(`| **한 사람이 한 장에서 맞는 후보 문안 수 (평균)** | **${avg(rows.map(r => r.cand)).toFixed(1)}개** |`);
  W(`| **문안이 하나도 안 걸리는 장 보기 (평균)** | **${pct(avg(rows.map(r => r.noEvidence)))}** · 한 번이라도 비는 장 ${rows.filter(r => r.missing > 0).length}개 |`);
  W(`| 1순위가 동점 해시로만 정해진 비율 (평균) | ${pct(avg(rows.map(r => r.tie)))} · 50% 넘는 장 ${rows.filter(r => r.tie >= 0.5).length}개 |`);
  W('');
  W('### 읽는 법'); W('');
  W(`- **겹침 자체는 낮습니다.** 두 사람이 같은 글을 받는 장은 ${chapters.length}장 중 평균 ${(pairSame / pairs).toFixed(1)}장입니다.`);
  W(`- **문제는 깊이와 빈칸입니다.** 한 사람이 한 장에서 맞는 문안이 평균 ${avg(rows.map(r => r.cand)).toFixed(1)}개라, 장 하나가 사실상 문안 한 편(평균 ${Math.round(avg(rows.filter(r => r.avgLen).map(r => r.avgLen)))}자)으로 끝납니다. "여러 근거가 겹쳐 내 얘기 같다"는 느낌이 나기 어렵습니다.`);
  W(`- **장 보기의 ${pct(avg(rows.map(r => r.noEvidence)))}는 맞는 문안이 없습니다.** 조건이 좁은 문안만 있어서 해당하지 않는 사람은 빈 장(또는 운영에서는 일반 문구)을 봅니다.`);
  W('- **동점 해시 비율이 높은 장은 다양성이 가짜입니다.** 같은 조건에 걸린 문안 여러 개 중 하나를 생년 해시로 돌려 줄 뿐, 사주 차이로 갈린 것이 아닙니다.');
  W('');
  W('## 2. 주제별'); W('');
  W('| 주제 | 장 | 평균 겹침률 | 맞는 후보(평균) | 빈 장 보기 | 동점 해시 | 평균 길이(자) |'); W('|---|---:|---:|---:|---:|---:|---:|');
  Object.entries(byTopic).forEach(([t, rs]) => W(`| ${TOPIC[t] || t} | ${rs.length} | ${pct(avg(rs.map(r => r.same)))} | ${avg(rs.map(r => r.cand)).toFixed(1)} | ${pct(avg(rs.map(r => r.noEvidence)))} | ${pct(avg(rs.map(r => r.tie)))} | ${Math.round(avg(rs.filter(r => r.avgLen).map(r => r.avgLen)))} |`));
  W('');
  W('## 3. 장별 — 빈 장이 많은 순'); W('');
  W('"장 문안 수"는 그 장에 쓰인 문안 전체, "맞는 후보"는 한 사람에게 실제로 걸리는 평균 개수입니다.'); W('');
  W('| 장 | 빈 장 보기 | 맞는 후보 | 장 문안 수 | 동점 해시 | 겹침률 | 서로 다른 결과 | 가장 흔한 조합 |'); W('|---|---:|---:|---:|---:|---:|---:|---|');
  rows.slice().sort((a, b) => b.noEvidence - a.noEvidence || a.cand - b.cand).forEach(r => W(`| ${r.chapter.replace('timeline_', '')} | ${r.noEvidence ? pct(r.noEvidence) : '-'} | ${r.cand.toFixed(1)} | ${r.pool} | ${r.tie ? pct(r.tie) : '-'} | ${pct(r.same)} | ${r.kinds} | \`${r.top}\` |`));
  W('');
  W('### 동점 해시로 갈리는 장 (50% 이상)'); W('');
  W('| 장 | 동점 해시 | 맞는 후보 |'); W('|---|---:|---:|');
  rows.filter(r => r.tie >= 0.5).sort((a, b) => b.tie - a.tie).forEach(r => W(`| ${r.chapter.replace('timeline_', '')} | ${pct(r.tie)} | ${r.cand.toFixed(1)} |`));
  W('');
  W('## 4. 너무 많은 사람에게 나오는 문안 (40% 이상)'); W('');
  W('한 문안이 사람의 40% 이상에게 나오면, 그 장은 사실상 공통 문장으로 시작합니다. 조건 열은 그 문안이 거는 조건입니다.'); W('');
  W('| 문안 ID | 장 | 받는 사람 | 조건 |'); W('|---|---|---:|---|');
  dominant.forEach(d => W(`| \`${d.id}\` | ${d.chapter.replace('timeline_', '')} | ${pct(d.share)} | ${d.when.join(', ') || '(조건 없음)'} |`));
  if (!dominant.length) W('| - | - | - | - |');
  W('');
  W('## 5. 실제로 고른 문안이 맞춘 조건'); W('');
  W('뽑힌 문안이 어떤 조건으로 맞았는지 셌습니다. 위쪽 몇 개에 몰려 있을수록 "같은 유형끼리 같은 글"이 됩니다.'); W('');
  W('| 조건 | 비율 |'); W('|---|---:|');
  Object.entries(keyHit).sort((a, b) => b[1] - a[1]).forEach(([k, v]) => W(`| ${k} | ${pct(v / keyTot)} |`));
  W('');
  W('## 6. 두 사람 사이 같은 장 비율 분포'); W('');
  W('| 같은 글을 받는 장 비율 | 쌍 비율 |'); W('|---|---:|');
  Object.keys(pairDist).map(Number).sort((a, b) => a - b).forEach(b => W(`| ${b}~${b + 9}% | ${pct(pairDist[b] / pairs)} |`));
  W('');
  const worstTopic = Object.entries(byTopic).sort((a, b) => avg(b[1].map(r => r.noEvidence)) - avg(a[1].map(r => r.noEvidence)))[0];
  W('## 7. 다음에 할 일'); W('');
  W(`1. **빈 장부터 메우기** — 빈 장 보기가 30% 넘는 ${rows.filter(r => r.noEvidence >= 0.3).length}개 장에, 누구에게나 걸리는 넓은 조건의 바탕 문안(예: 일간·월지·용신 오행)을 하나씩 둡니다. 가장 급한 주제는 **${TOPIC[worstTopic[0]] || worstTopic[0]}**(빈 장 ${pct(avg(worstTopic[1].map(r => r.noEvidence)))}, 맞는 후보 ${avg(worstTopic[1].map(r => r.cand)).toFixed(1)}개)입니다.`);
  W('2. **장마다 층을 쌓기** — 한 장에 바탕(넓은 조건) + 특징(좁은 조건: 일주·신살·일지 합충·공망) + 시기(대운·세운 연도) 세 층이 함께 걸리게 해서, 맞는 후보를 1.2개에서 3개 이상으로 올립니다.');
  W(`3. **동점 해시 장 정리** — 동점 해시가 50% 넘는 ${rows.filter(r => r.tie >= 0.5).length}개 장은 같은 조건 문안들의 조건을 서로 다르게 나눠, 사주 차이로 갈리게 합니다.`);
  W(`4. **넓게 걸리는 공통 문안 손보기** — 4번 표의 문안(${dominant.length}개)은 조건이 신강·신약과 십성 묶음뿐이라 사람 40% 이상에게 같은 글로 나옵니다. 두 번째 조건을 더해 갈래를 나눕니다.`);
  W(''); W('운영 화면은 게시된 라이브러리로 조립하므로, 빈 장에 실제로 무엇이 보이는지(일반 문구 대체 여부)는 운영 화면에서 따로 확인해야 합니다.');
  fs.writeFileSync(path.join(root, 'docs/READING_OVERLAP_2026-11-06.md'), out.join('\n') + '\n');
  fs.writeFileSync(path.join(root, 'docs/reading-overlap.json'), JSON.stringify({ N, chapters: chapters.length, entries: entries.length, avgSame: avg(rows.map(r => r.same)), pairSameChapters: pairSame / pairs, rows, dominant, keyHit, pairDist }, null, 1));
  console.log(`장 평균 겹침률 ${pct(avg(rows.map(r => r.same)))} · 쌍당 같은 장 ${(pairSame / pairs).toFixed(1)}/${chapters.length} · 50%↑ ${rows.filter(r => r.same >= 0.5).length}장`);
})().catch(e => { console.error(e); process.exit(1); });
