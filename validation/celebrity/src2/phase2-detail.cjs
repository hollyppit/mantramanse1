// 2차 상세 계산·서비스 일치 확인(2026-11-25). 블라인드 계산(src/compute.cjs) 다음 단계라 사건 날짜를 읽는다.
//   1) 서비스 일치: 화면(index.html)이 올리는 engine.js 와 검증이 쓰는 파일이 같은지(해시),
//      서비스 입력 경로(해외 도시 목록 world-places.js 의 도시 → tz·lon)로 넣어도 원국·세운 흐름이 같은지
//   2) 원국 요약: 네 기둥·대운·통합 용신·강약(사람마다)
//   3) 사건 날짜의 월운·일진: 날짜가 일 단위면 일진, 월 단위 이상이면 월운(그 해 12개월 안 순위 = 서술용, 확증 검정 아님)
//   사용: node validation/celebrity/src2/phase2-detail.cjs [base=phase2]
const fs = require('fs'), path = require('path'), vm = require('vm'), crypto = require('crypto');
const A = require('../src/adapter.cjs');
const BASE = path.resolve(process.argv[2] || path.join(__dirname, '..', 'phase2')), ROOT = path.join(__dirname, '..', '..', '..');
const persons = JSON.parse(fs.readFileSync(path.join(BASE, 'data', 'persons.json'), 'utf8')).filter(p => !p.excluded);
const events = JSON.parse(fs.readFileSync(path.join(BASE, 'data', 'events.json'), 'utf8')).filter(e => !e.excluded);
const E = A.engine(), M = E.M;
const sha = f => crypto.createHash('sha256').update(fs.readFileSync(path.join(ROOT, f))).digest('hex').slice(0, 16);
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const service = { indexLoadsEngine: /<script src="engine\.js(\?[^"]*)?"><\/script>/.test(html), engineFileSha: sha('engine.js'), validationEngineHash: A.engineHash(), graphUses: 'seunRange(...).combined (index.html drawLife) = 검증 flow' };
const gz = p => p ? M.gzName(p) : null;
const out = { runAt: new Date().toISOString(), engineHash: A.engineHash(), base: path.basename(BASE), service, persons: [], cityPath: [], events: [] };
const SM = (() => { const c = { console }; c.window = c; vm.createContext(c); vm.runInContext(fs.readFileSync(path.join(ROOT, 'world-places.js'), 'utf8'), c); vm.runInContext(fs.readFileSync(path.join(ROOT, 'engine.js'), 'utf8'), c); return c; })();
const SEng = Object.values(SM).find(v => v && typeof v === 'object' && typeof v.compute === 'function' && typeof v.seunRange === 'function');
const WP = SM.MantraWorldPlaces;
for (const p of persons) {
  const inp = A.toInput(p), ch = M.compute(inp), by = ch.solar.y, endY = Math.min(2025, p.death_date ? +p.death_date.slice(0, 4) : 9999);
  const pil = ['year', 'month', 'day', 'hour'].map(k => ch.pillars[k] ? gz(ch.pillars[k]) : '-').join(' ');
  out.persons.push({ id: p.id, name: p.name, input: inp, pillars: pil, hourKnown: ch.hourKnown, strengthHelp: ch.strength && ch.strength.help, unified: { mode: ch.unified.mode, primary: ch.unified.primaryName, secondary: ch.unified.secondaryName, yong: ch.unified.yong, hee: ch.unified.hee, gi: ch.unified.gi },
    daeun: ch.daeun.list.slice(0, 10).map(d => ({ start: d.startYear, gz: gz(d), fit: Math.round(d.ev.fitScore * 10) / 10 })) });
  // 서비스 도시 경로: 같은 IANA 시간대의 목록 도시 중 경도가 가장 가까운 곳을 고른 것처럼 넣는다(출생지 도시가 목록에 없을 때 사용자가 하는 선택)
  const same = WP.LIST.filter(c => c.tz === inp.tz).sort((a, b) => Math.abs(a.lon - inp.lon) - Math.abs(b.lon - inp.lon))[0];
  if (same && /^[A-Za-z]+\/[A-Za-z_]+$/.test(inp.tz)) {
    const ch2 = SEng.compute(Object.assign({}, inp, { tz: undefined, lon: undefined, city: same.name }));
    const pil2 = ['year', 'month', 'day', 'hour'].map(k => ch2.pillars[k] ? SEng.gzName(ch2.pillars[k]) : '-').join(' ');
    const a = M.seunRange(ch, by + 15, endY), b = SEng.seunRange(ch2, by + 15, endY);
    const maxDiff = Math.max(...a.map((x, i) => Math.abs(x.combined - b[i].combined)));
    out.cityPath.push({ id: p.id, city: same.name, cityLon: same.lon, birthLon: inp.lon, samePillars: pil === pil2, pillarsCity: pil2, maxFlowDiff: Math.round(maxDiff * 1000) / 1000 });
  } else out.cityPath.push({ id: p.id, city: null, note: '서비스 도시 목록에 같은 시간대 도시 없음(' + inp.tz + ')' });
  // 직접 입력 경로(tz·lon)는 서비스 해외 출생지 입력과 같은 함수(compute)·같은 필드라 별도 비교 불필요 — 같은 파일 해시로 확인
  for (const e of events.filter(e => e.person_id === p.id)) {
    const m = String(e.event_date).match(/^(\d{4})(?:-(\d{2}))?(?:-(\d{2}))?$/); if (!m) continue;
    const Y = +m[1], mo = m[2] ? +m[2] : null, d = m[3] ? +m[3] : null; if (Y < by + 15 || Y > endY) continue;
    const row = { person_id: p.id, date: e.event_date, valence: e.valence, significance: e.event_significance, desc: e.event_description };
    try {
      if (mo) {
        const ms = Date.UTC(Y, mo - 1, d || 15, 3), sy = M.yearPillarAt(ms).sajuYear, wl = M.wolun(ch, sy), wi = wl.filter(x => x.startMs <= ms).pop() || M.wolun(ch, sy - 1)[11];
        const fits = wl.map(x => x.combined), rank = fits.filter(v => v > wi.combined).length + 1;
        Object.assign(row, { wolun: { gz: gz(wi), tgStem: wi.stemTG, tgBranch: wi.branchTG, flow: Math.round(wi.combined * 10) / 10, rankIn12: rank } });
      }
      if (mo && d) {
        const il = M.ilun(ch, Y, mo), it = il[d - 1], fits = il.map(x => x.combined);
        Object.assign(row, { iljin: { gz: gz(it), tgStem: it.stemTG, tgBranch: it.branchTG, flow: Math.round(it.combined * 10) / 10, rankInMonth: fits.filter(v => v > it.combined).length + 1, days: il.length } });
      }
    } catch (err) { row.error = String(err.message || err); }
    out.events.push(row);
  }
}
// 월운·일진 서술 통계(사건 성격별 월 순위·일 순위 평균 — 무작위면 월 6.5, 일 (일수+1)/2)
const avg = a => a.length ? Math.round(a.reduce((s, v) => s + v, 0) / a.length * 100) / 100 : null;
out.wolunIljinSummary = Object.fromEntries(['positive', 'negative', 'change'].map(v => { const r = out.events.filter(x => x.valence === v && x.significance >= 2); return [v, { monthN: r.filter(x => x.wolun).length, monthRankMean: avg(r.filter(x => x.wolun).map(x => x.wolun.rankIn12)), monthRankExpected: 6.5, dayN: r.filter(x => x.iljin).length, dayRankRel: avg(r.filter(x => x.iljin).map(x => (x.iljin.rankInMonth - 0.5) / x.iljin.days)), dayRankRelExpected: 0.5 }]; }));
const OUTF = path.join(BASE, 'out', 'detail.json'); fs.writeFileSync(OUTF, JSON.stringify(out, null, 1));
console.log(JSON.stringify({ service, cityPath: { checked: out.cityPath.filter(x => x.city).length, samePillars: out.cityPath.filter(x => x.samePillars).length, maxFlowDiff: Math.max(...out.cityPath.filter(x => x.city).map(x => x.maxFlowDiff)), differ: out.cityPath.filter(x => x.city && !x.samePillars).map(x => [x.id, x.city, x.birthLon, x.cityLon]) }, events: out.events.length, errors: out.events.filter(x => x.error).length, summary: out.wolunIljinSummary }, null, 1));
