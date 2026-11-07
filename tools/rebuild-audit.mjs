// 운명의 타임라인 사전 풀이 문안(editorial/rebuild-20261022) 전수 검사
//   node tools/rebuild-audit.mjs  → docs/REBUILD_AUDIT_2026-11-07.md, docs/rebuild-audit.json
// 게시되는 7개 역할(제목·근거·장면·강점·위험·적용·실천) 문장을 모두 읽어, 톤 기준(해요체·용어 최소·생활 장면·후킹 첫 문장)과
// 내부 설명 노출·중복·길이·단정 표현을 센다. 문안을 고치지 않고 읽기만 한다.
import { pathToFileURL, fileURLToPath } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const m = await import(pathToFileURL(path.join(root, 'editorial/rebuild-20261022/index.mjs')).href);
const E = Object.entries(m.bundles).filter(([b]) => b !== 'pilot').flatMap(([b, l]) => l.map(e => ({ ...e, bundle: b })));

const ROLE = { core: '제목(후킹)', basis: '근거', example: '장면', positive: '강점', negative: '위험', advice: '실천', apps: '직장·사업 적용' };
const textOf = (e, f) => f === 'apps' ? Object.values(e.applications || {}).join(' ') : String(e[f] || '');
const SENT = s => s.split(/(?<=[.!?])\s+/).map(x => x.trim()).filter(Boolean);

// 검사 규칙
const META = /엔진|계산한|계산값|이 장은|이 장에서|원국의 성향으로|문안|검수|학파|해석 범위|조건(?:을|이|에)? ?(?:충족|맞춰)|판정했|기준으로 읽|로 읽어요|라고 읽|읽습니다|단정하지|확정하지|정해진 (?:것|일)은 아니|가능성이지/;
const JARGON = /비견|겁재|식신|상관|편재|정재|편관|정관|편인|정인|비겁|식상|재성|관성|인성|신강|신약|중화|통근|무근|용신|희신|기신|구신|한신|억부|조후|일간|월지|일지|시지|년지|천간|지지|합충|육합|삼합|방합|원진|귀문|형살|충|대운|세운|월운|격국|십성|오행/g;
const HEDGE = /(?:수 있어요|수 있습니다|쉬워요|쉽습니다|편이에요|편입니다)/g;
const FORMAL = /(?:습니다|입니다|됩니다|합니다|십시오)[.!?]?$/;
const POLITE = /(?:요|죠|세요)[.!?]?$/;
const BAN = /반드시|무조건|틀림없이|100%|확실히|운명적으로|저주|망한다|죽는다/;
// 생활 장면 = 손에 잡히는 사물·장소·사람·때, 또는 따옴표로 옮긴 실제 대사("오늘 어땠어?"). 2026-11-07: '일·사람·돈'처럼 거의 모든 문장에 들어가는 말은 빼고, 돈·일 장면의 구체 명사(결제·연봉·계약서…)를 넣었다.
const LIFE = /회사|팀장|상사|동료|후배|선배|지인|월급|연봉|카톡|문자|전화|친구|연인|애인|배우자|남편|아내|부모|가족|엄마|아빠|형제|아이|집|방|퇴근|출근|야근|주말|휴가|회의|보고서|메일|면접|면담|이직|승진|통장|잔고|카드|결제|할부|적금|저축|대출|이자|빚|계좌|자동이체|가계부|구독|보험|고정비|생활비|비상금|월말|월급날|연말|연초|계약|서명|사인|거래처|의뢰|단가|매출|정산|동업|부업|강의|자격증|포트폴리오|장비|주식|종목|투자 권유|수수료|세금|이사|여행|단톡|메신저|카페|식당|술자리|회식|모임|경조사|약속|운동|산책|병원|잠|밤|새벽|아침|점심|저녁|식사|커피|휴대폰|앱|메모|종이|달력|일정|조항|메시지|파일|문의|멘토|성과급|예산|예금|본전|매매|손절|알림|버튼|공동 구매|보증|영업|중개|판매|현금|표에|목록|소개팅|상견례|생일|기념일|선물|SNS|데이트|밥값|이별|결혼|명절|사진|영화|첫 만남|썸|마감|이력서|서류|주간 보고|기획안|고객|단골|팀원|프로젝트|결재|출시|수강생|책상|통화|부서|조직 개편|퇴사|입사|연차|업무 분장|교육 프로그램|[0-9]+ ?(?:원|만 원|분|시간|일|주|달|개월|년|살|대)|"[^"]{2,60}"|“[^”]{2,60}”|'[^']{2,60}'/;

const fields = ['core', 'basis', 'example', 'positive', 'negative', 'advice', 'apps'];
const sentIndex = new Map();   // 문장 → [entry ids]
const issues = [], byRole = {}, byTopic = {};
fields.forEach(f => byRole[f] = { n: 0, chars: 0, meta: 0, jargon: 0, jargonHeavy: 0, formal: 0, mixed: 0, hedgeHeavy: 0, noLife: 0, empty: 0, ban: 0 });
for (const e of E) {
  const topic = (e.chapters[0] || '').replace(/^timeline_/, '').replace(/_(\d+|peak)$/, '');
  const T = byTopic[topic] = byTopic[topic] || { n: 0, flagged: 0 };
  T.n++;
  const mine = [];
  for (const f of fields) {
    const t = textOf(e, f).replace(/\s+/g, ' ').trim(), R = byRole[f];
    if (!t) { R.empty++; if (f !== 'apps') mine.push([f, 'empty', '']); continue; }
    R.n++; R.chars += t.length;
    const ss = SENT(t), j = (t.match(JARGON) || []).length, h = (t.match(HEDGE) || []).length;
    if (META.test(t)) { R.meta++; mine.push([f, 'meta', (t.match(META) || [])[0]]); }
    if (j) R.jargon++;
    if (j / Math.max(1, t.length / 100) >= 2.5) { R.jargonHeavy++; mine.push([f, 'jargon', j + '개']); }
    const fm = ss.filter(s => FORMAL.test(s)).length, pl = ss.filter(s => POLITE.test(s)).length;
    if (fm && !pl) R.formal++; if (fm && pl) { R.mixed++; mine.push([f, 'mixed-tone', fm + '/' + pl]); }
    if (h >= 3 || (ss.length && h / ss.length > 0.8 && h >= 2)) { R.hedgeHeavy++; mine.push([f, 'hedge', h + '회']); }
    if (['example', 'positive', 'negative', 'advice'].includes(f) && !LIFE.test(t)) { R.noLife++; mine.push([f, 'abstract', '']); }
    if (BAN.test(t)) { R.ban++; mine.push([f, 'ban', (t.match(BAN) || [])[0]]); }
    ss.filter(s => s.length >= 20).forEach(s => { const l = sentIndex.get(s) || []; l.push(e.id); sentIndex.set(s, l); });
    if (f === 'core') { const first = ss[0] || ''; if (first.length > 60) mine.push([f, 'long-hook', first.length + '자']); }
  }
  if (mine.length) { T.flagged++; issues.push({ id: e.id, chapter: e.chapters[0], when: Object.keys(e.when || {}), issues: mine }); }
}
const dups = [...sentIndex.entries()].filter(([, ids]) => new Set(ids).size >= 3).sort((a, b) => b[1].length - a[1].length);
const count = k => issues.reduce((n, x) => n + x.issues.filter(i => i[1] === k).length, 0);
const pct = (a, b) => (b ? (100 * a / b).toFixed(0) : 0) + '%';

const out = [], W = s => out.push(s);
W('# 운명의 타임라인 사전 풀이 문안 전수 검사 (2026-11-07)'); W('');
W(`대상: editorial/rebuild-20261022 문안 **${E.length}개** × 게시 역할 7종(제목·근거·장면·강점·위험·적용·실천). 다시 만들기: \`node tools/rebuild-audit.mjs\``); W('');
W('## 1. 한눈에 보기'); W('');
W('| 항목 | 값 |'); W('|---|---|');
W(`| 문제가 하나 이상 걸린 문안 | ${issues.length}개 (${pct(issues.length, E.length)}) |`);
W(`| 내부 설명이 사용자 문장에 섞임(엔진·계산·이 장은·로 읽어요·확정 아님 등) | ${count('meta')}곳 |`);
W(`| 명리 용어가 너무 많음(100자당 2.5개 이상) | ${count('jargon')}곳 |`);
W(`| 한 문단 안에서 해요체·합니다체가 섞임 | ${count('mixed-tone')}곳 |`);
W(`| "~수 있어요/쉬워요"가 겹쳐 흐릿함(3회 이상) | ${count('hedge')}곳 |`);
W(`| 생활 장면 없이 추상적인 장면·강점·위험·실천 | ${count('abstract')}곳 |`);
W(`| 제목(후킹) 첫 문장이 60자 넘음 | ${count('long-hook')}곳 |`);
W(`| 단정·공포 표현 | ${count('ban')}곳 |`);
W(`| 비어 있는 역할 | ${count('empty')}곳 |`);
W(`| 3개 이상 문안에 똑같이 들어간 문장 | ${dups.length}개 |`);
W(`| 사주 값(간지·오행·연도)을 직접 넣는 자리 | **0개** — 모든 문장이 고정이라, 사람마다 달라지는 건 "어느 문안이 뽑히는가"뿐 |`);
W('');
W('## 2. 역할별'); W('');
W('| 역할 | 평균 길이 | 내부 설명 | 용어 있음 | 용어 과다 | 합니다체만 | 섞임 | 흐릿함 | 생활 장면 없음 |'); W('|---|---:|---:|---:|---:|---:|---:|---:|---:|');
fields.forEach(f => { const R = byRole[f]; W(`| ${ROLE[f]} | ${Math.round(R.chars / Math.max(1, R.n))}자 | ${R.meta} | ${pct(R.jargon, R.n)} | ${R.jargonHeavy} | ${R.formal} | ${R.mixed} | ${R.hedgeHeavy} | ${['example', 'positive', 'negative', 'advice'].includes(f) ? R.noLife : '-'} |`); });
W('');
W('## 3. 주제별'); W('');
W('| 주제 | 문안 | 문제 있는 문안 |'); W('|---|---:|---:|');
Object.entries(byTopic).forEach(([t, v]) => W(`| ${t} | ${v.n} | ${v.flagged} (${pct(v.flagged, v.n)}) |`));
W('');
W('## 4. 여러 문안에 반복되는 문장 (상위 30)'); W('');
W('| 문장 | 들어간 문안 수 |'); W('|---|---:|');
dups.slice(0, 30).forEach(([s, ids]) => W(`| ${s.replace(/\|/g, '/').slice(0, 90)}${s.length > 90 ? '…' : ''} | ${new Set(ids).size} |`));
W('');
W('## 5. 내부 설명이 섞인 예 (20개)'); W('');
issues.filter(x => x.issues.some(i => i[1] === 'meta')).slice(0, 20).forEach(x => { const f = x.issues.find(i => i[1] === 'meta')[0], e = E.find(y => y.id === x.id), t = textOf(e, f); W(`- \`${x.id}\` ${ROLE[f]}: ${t.slice(0, 140).replace(/\n/g, ' ')}…`); });
W('');
fs.writeFileSync(path.join(root, 'docs/REBUILD_AUDIT_2026-11-07.md'), out.join('\n') + '\n');
fs.writeFileSync(path.join(root, 'docs/rebuild-audit.json'), JSON.stringify({ total: E.length, byRole, byTopic, issues, dups: dups.map(([s, ids]) => ({ s, n: new Set(ids).size })) }, null, 1));
console.log(`문안 ${E.length} · 문제 ${issues.length} · 내부설명 ${count('meta')} · 용어과다 ${count('jargon')} · 톤섞임 ${count('mixed-tone')} · 흐릿함 ${count('hedge')} · 추상 ${count('abstract')} · 반복문장 ${dups.length}`);
