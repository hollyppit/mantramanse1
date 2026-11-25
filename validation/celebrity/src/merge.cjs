// 1단계: 수집 원본(data/raw/*.json) → 검사·정리 → data/persons.json(출생 정보만) + data/events.json(사건만) + data/QUALITY.md
//   · 사람 단위 dev/test 분할(protocol/mapping.json split 규칙: id SHA-256 첫 바이트 짝수 dev · 홀수 test)
//   · 형식 오류·출처 누락·시간대 오류는 지우지 않고 QUALITY.md 에 남기고, 분석 제외 표시(excluded)를 붙인다
//   · 사용: node validation/celebrity/src/merge.cjs
const fs = require('fs'), path = require('path'), crypto = require('crypto');
const BASE = process.env.CV_BASE || path.join(__dirname, '..'), RAW = path.join(BASE, 'data', 'raw');
const MAP = JSON.parse(fs.readFileSync(path.join(BASE, 'protocol', 'mapping.json'), 'utf8'));
const CATS = Object.keys(MAP.event_categories), TYPED = ['financial_event', 'relationship_event'];
const okTz = tz => { try { new Intl.DateTimeFormat('en', { timeZone: tz }); return true; } catch (e) { return false; } };
const okDate = s => /^\d{4}(-\d{2}(-\d{2})?)?$/.test(String(s || ''));
const persons = [], events = [], issues = [];
const OVR = (() => { try { return JSON.parse(fs.readFileSync(path.join(BASE, 'data', 'overrides.json'), 'utf8')); } catch (e) { return {}; } })();
const files = fs.existsSync(RAW) ? fs.readdirSync(RAW).filter(f => f.endsWith('.json')).sort() : [];
for (const f of files) {
  let j; try { j = JSON.parse(fs.readFileSync(path.join(RAW, f), 'utf8')); } catch (e) { issues.push(`${f}: JSON 읽기 실패 — ${e.message}`); continue; }
  for (const p of j.persons || []) {
    const pi = [];
    // 출처 기반 보정(data/overrides.json) — 적용 내역은 QUALITY.md 에 남긴다
    const ov = OVR[p.id];
    if (ov && ov.set) { Object.entries(ov.set).forEach(([k, v]) => { const ks = k.split('.'); let o = p; for (let i = 0; i < ks.length - 1; i++) o = o[ks[i]] = o[ks[i]] || {}; o[ks[ks.length - 1]] = v; }); issues.push(`${p.id}: 보정 적용 — ${JSON.stringify(ov.set)} · ${ov.reason}`); }
    if (!p.id || !p.name) pi.push('id·이름 없음');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(p.birth_date || '')) pi.push('출생일 형식 오류');
    if (!['M', 'F'].includes(p.gender)) pi.push('성별 없음(대운 방향 계산 불가)');
    if (!p.birth_place || !okTz(p.birth_place.tz)) pi.push('출생지 시간대(IANA) 오류');
    if (!p.birth_place || typeof p.birth_place.lon !== 'number') pi.push('출생지 경도 없음');
    if (!['verified', 'reported', 'unknown'].includes(p.birth_time_confidence)) pi.push('출생시간 신뢰도 값 오류');
    if (p.birth_time && p.birth_time_confidence === 'unknown') pi.push('시간 미상인데 출생시간 값이 있음 → 무시');
    if ((p.birth_time_confidence === 'verified' || p.birth_time_confidence === 'reported') && !p.birth_time_source) pi.push('출생시간 출처 없음 → 시간 미상으로 처리');
    if (!(p.source_urls || []).length) pi.push('출생 정보 출처 URL 없음');
    const excluded = pi.some(x => /형식 오류|성별 없음|시간대|경도 없음|id·이름/.test(x));
    const conf = (p.birth_time_confidence === 'verified' || p.birth_time_confidence === 'reported') && p.birth_time_source && p.birth_time ? p.birth_time_confidence : 'unknown';
    const split = (crypto.createHash('sha256').update(String(p.id)).digest()[0] % 2 === 0) ? 'dev' : 'test';
    persons.push({ id: p.id, name: p.name, name_ko: p.name_ko || '', gender: p.gender, birth_date: p.birth_date, birth_time: conf === 'unknown' ? null : p.birth_time,
      birth_time_confidence: conf, birth_time_source: p.birth_time_source || null, birth_place: p.birth_place, profession: p.profession || j.group, profession_detail: p.profession_detail || '',
      death_date: p.death_date || null, source_urls: p.source_urls || [], split, excluded, issues: pi });
    if (pi.length) issues.push(`${p.id}: ${pi.join(' · ')}`);
  }
  for (const e of j.events || []) {
    const ei = [];
    if (!okDate(e.event_date)) ei.push('날짜 형식 오류');
    if (!CATS.includes(e.event_category)) ei.push('범주 오류: ' + e.event_category);
    if (TYPED.includes(e.event_category) && !MAP.event_type_valence[e.event_type]) ei.push('세부 유형 오류: ' + e.event_type);
    if (!(e.evidence_urls || []).length) ei.push('출처 URL 없음');
    if (!e.evidence_text) ei.push('근거 문장 없음');
    if (![1, 2, 3].includes(e.event_significance)) ei.push('중요도 값 오류');
    const cat = MAP.event_categories[e.event_category];
    const valence = !cat ? null : cat.valence === 'by_type' ? (MAP.event_type_valence[e.event_type] || null) : cat.valence;
    const excluded = ei.length > 0 || e.evidence_confidence === 'unverified';
    events.push(Object.assign({}, e, { valence, excluded, issues: ei }));
    if (ei.length) issues.push(`${e.person_id} ${e.event_date} ${e.event_type}: ${ei.join(' · ')}`);
  }
}
const ids = new Set(persons.map(p => p.id));
events.forEach(e => { if (!ids.has(e.person_id)) { e.excluded = true; e.issues.push('사람 id 없음'); issues.push(`${e.person_id}: 사건의 사람 id 가 persons 에 없음`); } });
fs.writeFileSync(path.join(BASE, 'data', 'persons.json'), JSON.stringify(persons, null, 1));
fs.writeFileSync(path.join(BASE, 'data', 'events.json'), JSON.stringify(events, null, 1));
const byProf = {}; persons.forEach(p => { const k = p.profession; byProf[k] = byProf[k] || { n: 0, verified: 0, reported: 0, unknown: 0 }; byProf[k].n++; byProf[k][p.birth_time_confidence]++; });
const evOk = events.filter(e => !e.excluded), sig2 = evOk.filter(e => e.event_significance >= 2);
const vc = {}; sig2.forEach(e => { vc[e.valence] = (vc[e.valence] || 0) + 1; });
const q = [`# 데이터 품질 점검 (${new Date().toISOString().slice(0, 10)})`, '', `원본 파일: ${files.join(', ') || '없음'}`, '',
  `| 직업군 | 인원 | 출생시간 verified | reported | 미상 |`, '|---|---|---|---|---|',
  ...Object.entries(byProf).map(([k, v]) => `| ${k} | ${v.n} | ${v.verified} | ${v.reported} | ${v.unknown} |`), '',
  `- 사건 전체 ${events.length}건 · 분석 가능(출처·형식 확인) ${evOk.length}건 · 그중 중요도 2 이상 ${sig2.length}건`,
  `- 중요도 2 이상 사건의 성격: ${Object.entries(vc).map(([k, v]) => k + ' ' + v).join(' · ')}`,
  `- 분할: dev ${persons.filter(p => p.split === 'dev').length}명 · test ${persons.filter(p => p.split === 'test').length}명`, '',
  '## 문제 목록(지우지 않고 남김)', ...(issues.length ? issues.map(x => '- ' + x) : ['- 없음'])];
fs.writeFileSync(path.join(BASE, 'data', 'QUALITY.md'), q.join('\n') + '\n');
console.log(`persons ${persons.length} · events ${events.length} (분석 가능 ${evOk.length}) · 문제 ${issues.length}`);
