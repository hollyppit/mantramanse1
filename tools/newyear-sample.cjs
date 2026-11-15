// 신년운세 조합 견본 문서 만들기: node tools/newyear-sample.cjs > docs/NEWYEAR_SAMPLE_2027.md
require('../report/newyear/node-loader.js'); const C = globalThis.NewyearCompose;
const people = [['1990-05-15 14:30 남(양력)', { year: 1990, month: 5, day: 15, hour: 14, minute: 30, gender: 'M', calendar: 'solar' }], ['1984 음력 윤10월 5일, 시각 모름, 여', { year: 1984, month: 10, day: 5, leap: true, gender: 'F', calendar: 'lunar' }]];
console.log('# 2027 신년운세 조합 견본 (preview 모드, 검수 전 초안)\n\n자동 생성: `tools/newyear-sample.cjs` → `report/newyear/compose.js`. 문구는 모두 draft이며 운영 화면에 나가기 전 검수가 필요합니다.\n');
for (const [label, b] of people) {
  const r = C.compose({ birth: b, targetYear: 2027, mode: 'preview' });
  console.log(`\n---\n\n## ${label} — ${r.tojeong.gua}괘 (${r.tojeong.zhouyi || '보충본'})\n`);
  const w = ps => (ps || []).forEach(p => console.log(`- **${p.role}** ${p.text}`));
  for (const ch of r.chapters) {
    console.log(`\n### ${ch.title}\n`); w(ch.paras);
    (ch.sections || []).forEach(s => { console.log(`\n#### ${s.title}${s.compare ? ` (비교: ${s.compare.kind})` : ''}\n`); w(s.paras); });
    if (ch.note) console.log(`\n> ${ch.note}`);
    (ch.months || []).forEach(m => { console.log(`\n#### ${m.label} (${m.solar}) · 사주 ${m.sajuMonth}월 ${m.direction} · 토정 ${m.tojeongTone} · ${m.compare}\n`); if (m.hook) console.log(`- **hook** ${m.hook}`); w(m.paras); });
  }
}
