// 4단계(자동 보고서): out/results.json + data + out/computed → reports/REPORT.md · reports/report.html
//   · 좋지 않은 결과·반례도 모두 싣는다. 표본이 작으면 그렇게 적는다. 사후 해석을 예측 성공으로 쓰지 않는다
//   · 사용: node validation/celebrity/src/report.cjs
const fs = require('fs'), path = require('path');
const BASE = process.env.CV_BASE || path.join(__dirname, '..'), OUT = path.join(BASE, 'out'), REP = path.join(BASE, 'reports');
fs.mkdirSync(REP, { recursive: true });
const R = JSON.parse(fs.readFileSync(path.join(OUT, 'results.json'), 'utf8'));
const persons = JSON.parse(fs.readFileSync(path.join(BASE, 'data', 'persons.json'), 'utf8'));
const events = JSON.parse(fs.readFileSync(path.join(BASE, 'data', 'events.json'), 'utf8'));
const MAP = JSON.parse(fs.readFileSync(path.join(BASE, 'protocol', 'mapping.json'), 'utf8'));
const C = {}; persons.filter(p => !p.excluded).forEach(p => C[p.id] = JSON.parse(fs.readFileSync(path.join(OUT, 'computed', p.id + '.json'), 'utf8')));
const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const f1 = x => x == null ? '—' : (Math.round(x * 10) / 10).toString();
const f3 = x => x == null ? '—' : (Math.round(x * 1000) / 1000).toString();
const VK = { positive: '긍정', negative: '부정', change: '변화' }, CONF = { verified: '확인(AA)', reported: '진술(A)', unknown: '미상' };
const H = R.hypotheses, small = R.sample.persons < 50;
const verdict = (p, stat, nullMean) => p == null ? '계산 불가' : p < 0.05 ? `무작위 기준보다 뚜렷이 큼(경험적 p ${f3(p)})` : p < 0.2 ? `무작위 기준보다 약간 큰 편이나 우연과 구분되지 않음(p ${f3(p)})` : `무작위 기준과 구분되지 않음(p ${f3(p)}, 가짜 명식 평균 ${f3(nullMean)})`;

const md = [];
md.push(`# 유명인 생애 데이터 기반 운세 흐름 검증 — 1차 보고서`, '');
md.push(`생성: ${R.generatedAt.slice(0, 10)} · 엔진 해시 ${R.engineHash} · 사람 ${R.sample.persons}명 · 분석 사건 ${R.sample.events}건(중요도 ${R.sample.minSignificance} 이상, 출처 확인) · 가짜 명식 ${R.sample.nullCount}개/사람`, '');
md.push('> 이 보고서는 사후 대조입니다. 유명인의 공개 사건과 엔진 값이 맞아 보이는 것을 예측 성공으로 보지 않습니다. 통계적 연관성은 인과가 아닙니다.' + (small ? ' 표본이 작아(30명 안팎) 수치는 방향을 보는 정도로만 읽어야 합니다.' : ''), '');
md.push('## 1. 핵심 결과', '');
md.push(`| 가설 | 실제 값 | 95% 구간(사람 단위 부트스트랩) | 가짜 명식 평균 | 판정 |`, '|---|---|---|---|---|');
md.push(`| H1 긍정 사건 해 흐름 백분위 − 부정 사건 해 | ${f1(H.H1.stat)}점 (긍정 ${f1(H.H1.posMean)} · 부정 ${f1(H.H1.negMean)}, n=${H.H1.nPos}/${H.H1.nNeg}) | ${H.H1.ci95 ? f1(H.H1.ci95[0]) + ' ~ ' + f1(H.H1.ci95[1]) : '—'} | ${f1(H.H1.nullMean)} | ${verdict(H.H1.pEmp, H.H1.stat, H.H1.nullMean)} |`);
md.push(`| H2 분야 지표 방향 일치율 | ${f1(H.H2.stat * 100)}% (n=${H.H2.n}) | ${H.H2.ci95 ? f1(H.H2.ci95[0] * 100) + ' ~ ' + f1(H.H2.ci95[1] * 100) + '%' : '—'} | ${f1(H.H2.nullMean * 100)}% | ${verdict(H.H2.pEmp, H.H2.stat, H.H2.nullMean)} |`);
md.push(`| H3 변화 사건 해 변동성 백분위 | ${f1(H.H3.stat)} (n=${H.H3.n}) | — | ${f1(H.H3.nullMean)} | ${verdict(H.H3.pEmp, H.H3.stat, H.H3.nullMean)} |`);
md.push(`| H4 나이·경력 기준 대비 AUC 증가 | ${f3(H.H4.gain)} (기준 ${f3(H.H4.aucBase)} → +흐름 ${f3(H.H4.aucFlow)}, n=${H.H4.n}) | — | ${f3(H.H4.nullGainMean)} | ${verdict(H.H4.pEmp, H.H4.gain, H.H4.nullGainMean)} |`, '');
md.push('사건 전후 점수 변화(사건 해 흐름 − 직전 2년 평균): ' + R.deltaByValence.map(d => `${VK[d.valence]} ${f1(d.mean)}(n=${d.n})`).join(' · '), '');
// 사전 등록 밖 탐색 결과(H1 의 구성 요소를 따로 본 것) — 확인 검증 전에는 결론으로 쓰지 않는다
{
  const mean = a => a.length ? a.reduce((x, y) => x + y, 0) / a.length : null, T = R.table;
  const by = (f, v) => mean(T.filter(t => f(t) && t.valence === v && t.flowPct != null).map(t => t.flowPct));
  md.push('### 1-1. 탐색적 결과(사전 등록 가설 아님)', '');
  md.push(`- 긍정 사건 해의 흐름 백분위 평균: 실제 명식 **${f1(H.H1.posMean)}** vs 가짜 명식 ${f1(H.H1.nullPosMean)} (가짜 명식 중 실제 이상인 비율 기준 경험적 p ${f3(H.H1.pPos)}).`);
  md.push(`- 부정 사건 해: 실제 ${f1(H.H1.negMean)} vs 가짜 ${f1(H.H1.nullNegMean)} — 부정 사건 해가 낮게 나오지 않음(기대와 반대 방향, p ${f3(H.H1.pNegLow)}).`);
  md.push(`- 방향 일관성: dev 긍정 ${f1(by(t => t.split === 'dev', 'positive'))} · test 긍정 ${f1(by(t => t.split === 'test', 'positive'))} · 스포츠 ${f1(by(t => t.profession === 'sports', 'positive'))} · 기업 ${f1(by(t => t.profession === 'business', 'positive'))} · 문화예술 ${f1(by(t => t.profession === 'arts', 'positive'))} · 출생시간 앎 ${f1(by(t => t.birthConf !== 'unknown', 'positive'))} / 미상 ${f1(by(t => t.birthConf === 'unknown', 'positive'))}`);
  const dd = v => { const seen = {}; return mean(T.filter(t => t.valence === v && t.flowPct != null && !seen[t.person_id + ':' + t.Y + ':' + v] && (seen[t.person_id + ':' + t.Y + ':' + v] = 1)).map(t => t.flowPct)); };
  const ddn = v => new Set(T.filter(t => t.valence === v).map(t => t.person_id + ':' + t.Y)).size;
  md.push(`- 민감도(같은 사람·같은 해·같은 성격 사건은 한 번만): 긍정 ${f1(dd('positive'))}(${ddn('positive')}건) · 부정 ${f1(dd('negative'))}(${ddn('negative')}건) · 변화 ${f1(dd('change'))}(${ddn('change')}건)`);
  md.push('- 해석: 긍정 사건 해가 그 사람 평생 중 흐름 점수가 높은 쪽에 놓이는 경향은 무작위 명식보다 뚜렷했지만, 부정 사건 해도 낮지 않아 **흐름 점수가 "좋고 나쁨"보다 "사건·활동이 많은 해"를 따라가는지** 구분되지 않습니다. 사전 등록한 차이(H1)는 우연과 구분되지 않았으므로, 이 결과는 100명 이상 확대 검증에서 새 가설로 미리 등록해 확인해야 합니다. 여러 값을 본 뒤 고른 결과라 우연히 나왔을 가능성도 있습니다.', '');
}
md.push('## 2. 나눠 본 결과', '', '| 구분 | 그룹 | H1(점) | 긍정/부정 n | H2 일치율 | H2 n |', '|---|---|---|---|---|---|');
const BN = { profession: '직업군', age: '나이대', birthTime: '출생시간', split: '분할' }, GN = { sports: '스포츠', business: '기업', arts: '문화예술', known: '시간 앎', unknown: '시간 미상', dev: 'dev', test: 'test(최종)' };
Object.entries(R.breakdown).forEach(([k, g]) => Object.entries(g).forEach(([n, s]) => md.push(`| ${BN[k]} | ${GN[n] || n} | ${f1(s.H1)} | ${s.nPos}/${s.nNeg} | ${s.H2 == null ? '—' : f1(s.H2 * 100) + '%'} | ${s.nDom} |`)));
md.push('', '> 그룹마다 사건 수가 적어 그룹 간 차이는 우연일 가능성이 큽니다. test 그룹은 방법 점검(dev)에 쓰지 않은 사람들입니다.', '');
md.push('## 3. 인물별 출생정보 신뢰도', '', '| 사람 | 직업 | 출생 | 출생시간 | 신뢰도 | 출처 | 분할 | 사주 |', '|---|---|---|---|---|---|---|---|');
persons.forEach(p => { const c = C[p.id]; md.push(`| ${esc(p.name_ko || p.name)} (${esc(p.name)}) | ${esc(p.profession_detail || p.profession)} | ${p.birth_date} ${esc(p.birth_place && p.birth_place.city)} | ${p.birth_time || '—'} | ${CONF[p.birth_time_confidence]} | ${p.birth_time_source ? esc(String(p.birth_time_source).slice(0, 60)) : '—'} | ${p.split}${p.excluded ? ' · 제외' : ''} | ${c ? c.pillars.map(x => x || '??').join(' ') + ` (${c.unified.primary})` : '—'} |`); });
md.push('', '## 4. 긍정적 일치 사례(사후 대조, 예측 아님)', '', '| 사람 | 날짜 | 사건 | 성격 | 흐름 점수(백분위) | 등급 | 세운·대운 |', '|---|---|---|---|---|---|---|');
R.matches.forEach(t => md.push(`| ${t.person_id} | ${t.date} | ${esc(t.desc)} | ${VK[t.valence]} | ${f1(t.flow)} (${f1(t.flowPct)}) | ${t.grade} | ${t.seun}·${t.daeun} |`));
md.push('', '## 5. 부정적 불일치 사례(반례 — 지우지 않음)', '', '| 사람 | 날짜 | 사건 | 성격 | 흐름 점수(백분위) | 등급 | 세운 십성 | 용신 역할(천간/지지) | 합충 |', '|---|---|---|---|---|---|---|---|---|');
R.mismatches.forEach(t => md.push(`| ${t.person_id} | ${t.date} | ${esc(t.desc)} | ${VK[t.valence]} | ${f1(t.flow)} (${f1(t.flowPct)}) | ${t.grade} | ${t.tg} | ${t.roles ? t.roles.stem + '/' + t.roles.branch : '—'} | ${esc((t.rels || []).join(', ')) || '—'} |`));
md.push('', '## 6. 계산 엔진 취약점 후보(서술, 표본 작음)', '');
md.push('긍정·부정 사건 중 불일치(긍정인데 하위 30% · 부정인데 상위 30%) 비율:', '', '| 세운 지지 십성 묶음 | 사건 | 불일치 | 비율 |', '|---|---|---|---|');
Object.entries(R.weakness.bySeunBranchGroup).forEach(([g, v]) => md.push(`| ${g} | ${v.n} | ${v.miss} | ${f1(v.miss / v.n * 100)}% |`));
md.push('', '| 통합 용신 방식 | 사건 | 불일치 | 비율 |', '|---|---|---|---|');
Object.entries(R.weakness.byYongMode).forEach(([g, v]) => md.push(`| ${g} | ${v.n} | ${v.miss} | ${f1(v.miss / v.n * 100)}% |`));
md.push('', '해석 주의: 그룹마다 사건이 몇 건 안 되어, 특정 십성·방식이 약하다고 결론 내리려면 100명 이상 확대 검증이 필요합니다.', '');
{ // 6-1. 사건 종류별(서술)
  const g = {}, mean = a => a.length ? a.reduce((x, y) => x + y, 0) / a.length : null;
  R.table.forEach(t => { g[t.key] = g[t.key] || { n: 0, f: [], h: [], v: t.valence }; g[t.key].n++; if (t.flowPct != null) g[t.key].f.push(t.flowPct); if (t.domHit != null) g[t.key].h.push(t.domHit ? 1 : 0); });
  md.push('### 6-1. 사건 종류별 흐름 백분위와 분야 지표 방향 일치율', '', '| 사건 종류 | 성격 | 건수 | 흐름 백분위 평균 | 분야 지표 방향 일치 |', '|---|---|---|---|---|');
  Object.entries(g).sort((a, b) => b[1].n - a[1].n).forEach(([k, v]) => md.push(`| ${k} | ${VK[v.v] || '—'} | ${v.n} | ${f1(mean(v.f))} | ${v.h.length ? f1(mean(v.h) * 100) + '% (' + v.h.length + ')' : '—'} |`));
  md.push('', '> 50이 그 사람의 평생 중간입니다. 부정 사건인 부상·질병(health_event)·재물 손실이 흐름 상위에 놓이는 경향은, 흐름 점수가 "좋고 나쁨"이 아니라 "기운이 크게 움직이는 해"를 반영할 가능성을 시사합니다(건수가 적어 확인 필요).', '');
}
md.push('## 7. 개선이 필요한 명리학적 판정 로직(검토 후보)', '',
  '- 불일치 사례의 세운 십성·용신 역할·합충 목록(5절)을 감사 문서(docs/luck-engine-audit-2026-11-25)의 A안(합화 성립도·충 종류)과 대조해, 같은 원인이 반복되는지 확인합니다.',
  '- 시간 미상 그룹과 시간 앎 그룹의 차이가 크면, 시주 없이 계산할 때의 강약·용신 판정 안정성을 따로 점검해야 합니다.',
  '- 부정 사건(부상·실패)이 흐름 상위 구간에 자주 있으면, 흐름 점수가 "체감 좋고 나쁨"보다 "활동량"에 가깝게 움직이는지 변동성 지표와 함께 다시 봐야 합니다.', '');
md.push('## 7-1. 데이터 한계(이번 1차)', '',
  '- 사건 근거의 상당수가 위키백과와 그 인용 기사에서 왔습니다. 수집자가 모든 인용 기사를 직접 열어 확인하지는 않았습니다(문화예술 134건 중 108건이 단일 출처 medium).',
  '- 스포츠 선수의 출생시간은 astro.com 직접 조회가 막혀 Rodden 등급을 인용한 Astrotheme 에서 가져왔습니다. 문화예술·기업인은 Astro-Databank 를 브라우저로 직접 확인했습니다.',
  '- 마돈나 출생 시각은 출처 기록(EST, UTC−5)대로 고정 시차를 썼습니다(data/overrides.json).',
  '- 2026년 사건과 15세 미만 사건은 계산 범위(15세~2025년) 밖이라 빠졌습니다.',
  '- 유명인은 공개된 사건 위주라 성공 사건과 큰 사건 쪽으로 치우쳐 있습니다. 사건이 없는 해가 정말 "아무 일 없는 해"인지 알 수 없습니다.', '');
md.push('## 8. 추가 검증이 필요한 항목', '',
  '- 탐색 결과(긍정 사건 해 흐름 상위 경향)와 "흐름 점수가 활동량을 따라간다"는 해석을 새 가설로 미리 등록하고, 확대 표본(100명 이상)의 test 군에서만 확인',
  '- 100명 이상으로 확대(직업군별 30명 이상), 출생시간 확인 인물 비율 확대',
  '- 사건 날짜를 월 단위까지 확보해 월운 대조',
  '- 일반인 동의 표본(06 블라인드 검증 계획)으로 유명인 선택 편향(공개 사건·성공 편중) 보정',
  '- 사건 성격 분류의 평가자 간 일치도(두 사람이 독립 분류) 측정', '');
md.push('## 9. 실제 사건과 운세 점수 대조표(전체)', '', '| 사람 | 날짜(사주 연도) | 나이 | 사건 | 성격 | 중요도 | 흐름(백분위) | 등급 | 전후 변화 | 변동성 백분위 | 대응 분야 | 분야 백분위 | 방향 일치 | 근거 |', '|---|---|---|---|---|---|---|---|---|---|---|---|---|---|');
R.table.forEach(t => md.push(`| ${t.person_id} | ${t.date} (${t.Y}) | ${t.age} | ${esc(t.desc)} | ${VK[t.valence] || '—'} | ${t.significance} | ${f1(t.flow)} (${f1(t.flowPct)}) | ${t.grade} | ${f1(t.delta)} | ${f1(t.volPct)} | ${t.domains.join('·') || '—'} | ${t.domScore == null ? '—' : t.domScore} | ${t.domHit == null ? '—' : t.domHit ? '예' : '아니오'} | ${t.url ? `[출처](${t.url})` : '—'} |`));
md.push('', '## 10. 방법', '', `- 사전 등록: validation/celebrity/protocol/PREREGISTRATION.md · mapping.json (해시 LOCK.txt)`, `- 계산: engine.js 를 수정 없이 불러 계산(엔진 해시 ${R.engineHash}). 계산 단계는 사건 데이터를 읽지 못하게 막음`,
  '- 흐름 점수: 세운 combined(세운 0.6 + 대운 0.4). 백분위는 그 사람의 15세~종료 연도 안에서', '- 무작위 기준: 같은 출생 연도 안 다른 월·일(시를 아는 사람은 시도)의 가짜 명식으로 같은 통계를 계산',
  '- H4: 긍정(1)·부정(0) 사건, 특징 = 나이·나이²·첫 공개 사건 이후 연차 (+흐름 백분위), 사람 하나씩 빼는 교차검증 AUC');
fs.writeFileSync(path.join(REP, 'REPORT.md'), md.join('\n') + '\n');

// ── HTML: 인물별 생애 사건 타임라인 + 대운·세운 그래프
const VC = { positive: '#2DB36B', negative: '#E8622C', change: '#7B6BD6' };
function chart(p) {
  const c = C[p.id]; if (!c) return '';
  const ys = Object.keys(c.years).map(Number).sort((a, b) => a - b); if (!ys.length) return '';
  const W = 760, Hh = 200, L = 34, Rr = 8, T = 22, B = 26, y0 = ys[0], y1 = ys[ys.length - 1];
  const X = y => L + (W - L - Rr) * (y - y0) / Math.max(1, y1 - y0), Y = v => T + (Hh - T - B) * (1 - (Math.max(-60, Math.min(60, v)) + 60) / 120);
  let s = `<svg viewBox="0 0 ${W} ${Hh}" style="width:100%;height:auto;font-family:sans-serif">`;
  c.daeun.forEach((d, i) => { const a = Math.max(y0, d.startYear), b = Math.min(y1, d.startYear + 10); if (b <= a) return; s += `<rect x="${X(a)}" y="${T}" width="${X(b) - X(a)}" height="${Hh - T - B}" fill="${i % 2 ? '#f1f1f5' : '#fafafa'}"/><text x="${(X(a) + X(b)) / 2}" y="${T - 6}" font-size="10" text-anchor="middle" fill="#777">${d.gz} ${f1(d.fit)}</text>`; });
  [-30, 0, 30].forEach(g => s += `<line x1="${L}" x2="${W - Rr}" y1="${Y(g)}" y2="${Y(g)}" stroke="${g ? '#ddd' : '#aaa'}" ${g ? 'stroke-dasharray="3 3"' : ''}/><text x="${L - 4}" y="${Y(g) + 3}" font-size="9" text-anchor="end" fill="#999">${g}</text>`);
  s += `<polyline fill="none" stroke="#4B5BD6" stroke-width="1.8" points="${ys.map(y => X(y).toFixed(1) + ',' + Y(c.years[y].flow).toFixed(1)).join(' ')}"/>`;
  for (let y = Math.ceil(y0 / 10) * 10; y <= y1; y += 10) s += `<text x="${X(y)}" y="${Hh - 8}" font-size="9" text-anchor="middle" fill="#999">${y}</text>`;
  R.table.filter(t => t.person_id === p.id).forEach(t => { const v = c.years[t.Y]; if (!v) return; s += `<circle cx="${X(t.Y)}" cy="${Y(v.flow)}" r="${2 + t.significance}" fill="${VC[t.valence] || '#999'}" stroke="#fff"><title>${esc(t.date + ' ' + t.desc + ' · 흐름 ' + f1(v.flow) + ' (' + f1(t.flowPct) + '백분위)')}</title></circle>`; });
  return s + '</svg>';
}
const tl = p => events.filter(e => e.person_id === p.id).sort((a, b) => String(a.event_date).localeCompare(String(b.event_date))).map(e => `<li${e.excluded ? ' style="color:#999"' : ''}><b>${esc(e.event_date)}</b> <span style="color:${VC[e.valence] || '#777'}">[${VK[e.valence] || '—'}·${e.event_significance}]</span> ${esc(e.event_description)} <small>— ${esc(e.evidence_text)} ${(e.evidence_urls || []).slice(0, 2).map((u, i) => `<a href="${esc(u)}" target="_blank" rel="noopener">출처${i + 1}</a>`).join(' ')}${e.excluded ? ' · 분석 제외(' + esc((e.issues || []).join(', ') || e.evidence_confidence) + ')' : ''}</small></li>`).join('');
const mdToHtml = t => t.split('\n').map(l => l.startsWith('# ') ? `<h1>${esc(l.slice(2))}</h1>` : l.startsWith('## ') ? `<h2>${esc(l.slice(3))}</h2>` : l.startsWith('> ') ? `<blockquote>${esc(l.slice(2))}</blockquote>` : l.startsWith('|') ? l : l.startsWith('- ') ? `<li>${esc(l.slice(2))}</li>` : l ? `<p>${esc(l)}</p>` : '').join('\n');
function tables(h) { return h.replace(/((?:^\|.*\n?)+)/gm, blk => { const rows = blk.trim().split('\n').filter(r => !/^\|[-| ]+\|$/.test(r)); return '<table>' + rows.map((r, i) => '<tr>' + r.slice(1, -1).split(' | ').map(c => i ? `<td>${c.replace(/\[출처\]\(([^)]+)\)/, '<a href="$1" target="_blank" rel="noopener">출처</a>')}</td>` : `<th>${c}</th>`).join('') + '</tr>').join('') + '</table>'; }); }
const people = persons.map(p => `<section class="p"><h3>${esc(p.name_ko || p.name)} <small>${esc(p.name)} · ${esc(p.profession_detail || p.profession)} · ${p.birth_date} ${p.birth_time || '시간 미상'}(${CONF[p.birth_time_confidence]}) · ${p.split}</small></h3>${chart(p)}<p class="lg"><span style="color:${VC.positive}">● 긍정</span> <span style="color:${VC.negative}">● 부정</span> <span style="color:${VC.change}">● 변화</span> · 선 = 세운 흐름 점수(대운 40% 포함) · 띠 = 대운(간지·대운 점수)</p><ul>${tl(p)}</ul></section>`).join('');
const html = `<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>유명인 생애 데이터 운세 흐름 검증 — 1차</title>
<style>body{font-family:system-ui,-apple-system,'Malgun Gothic',sans-serif;max-width:1100px;margin:24px auto;padding:0 16px;color:#222;line-height:1.55}table{border-collapse:collapse;width:100%;font-size:.82rem;margin:8px 0 16px}td,th{border:1px solid #ddd;padding:4px 6px;vertical-align:top}th{background:#f5f5f7}blockquote{margin:8px 0;padding:8px 12px;background:#f7f7fa;border-left:3px solid #999}.p{border-top:1px solid #ddd;padding-top:10px;margin-top:18px}.p ul{font-size:.84rem}.lg{font-size:.78rem;color:#666}h3 small{font-weight:400;color:#666;font-size:.8rem}</style></head><body>
${tables(mdToHtml(md.join('\n').split('## 9.')[0]))}<h2>9. 인물별 생애 사건 타임라인 · 대운·세운 그래프</h2>${people}${tables(mdToHtml('## 10.' + md.join('\n').split('## 10.')[1]))}</body></html>`;
fs.writeFileSync(path.join(REP, 'report.html'), html);
console.log('보고서: reports/REPORT.md · reports/report.html');
