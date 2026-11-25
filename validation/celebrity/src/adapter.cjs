// 검증용 엔진 어댑터 — 저장소의 engine.js·luck-grade.js·luck-element-theme.js 를 읽기 전용으로 불러 결과만 꺼낸다.
//   · 엔진 코드·설정을 바꾸지 않는다(파일을 vm 에 그대로 올리고, 반환값만 읽음). 서비스 DB·화면과 무관.
//   · 출생시간이 verified·reported 가 아니면 hour:null 로 계산한다(시주를 만들지 않음).
//   · 사용: const A = require('./adapter.cjs'); const r = A.series(A.engine(), person, { toYear })
const fs = require('fs'), path = require('path'), vm = require('vm'), crypto = require('crypto');
const ROOT = path.join(__dirname, '..', '..', '..');
const FILES = ['engine.js', 'luck-grade.js', 'luck-element-theme.js'];
const DOMAINS = ['career', 'business', 'wealth', 'move', 'job', 'marriage', 'love', 'child', 'health', 'accident'];

function engine() {
  const c = { console }; c.window = c; vm.createContext(c);
  FILES.forEach(f => vm.runInContext(fs.readFileSync(path.join(ROOT, f), 'utf8'), c, { filename: f }));
  return { M: c.Manse, LG: c.MantraLuckGrade, LT: c.MantraLuckTheme };
}
function engineHash() {
  const h = crypto.createHash('sha256'); FILES.forEach(f => h.update(fs.readFileSync(path.join(ROOT, f)))); return h.digest('hex').slice(0, 16);
}
const timeKnown = p => (p.birth_time_confidence === 'verified' || p.birth_time_confidence === 'reported') && /^\d{1,2}:\d{2}$/.test(p.birth_time || '');
function toInput(p, over = {}) {
  const [y, m, d] = p.birth_date.split('-').map(Number);
  const known = timeKnown(p);
  const [hh, mm] = known ? p.birth_time.split(':').map(Number) : [null, 0];
  const inp = { year: y, month: m, day: d, hour: known ? hh : null, minute: known ? mm : 0, gender: p.gender === 'F' ? 'F' : 'M', calendar: 'solar' };
  if (p.birth_place && p.birth_place.tz) inp.tz = p.birth_place.tz;
  if (p.birth_place && typeof p.birth_place.lon === 'number') inp.lon = p.birth_place.lon;
  return Object.assign(inp, over);
}
// 한 사람(또는 가짜 명식)의 연도별 값. domains=false 면 분야 지표를 건너뛴다(기준 모델 반복용)
function series(E, p, opt = {}) {
  const { M, LG, LT } = E, inp = opt.input || toInput(p);
  const ch = M.compute(inp);
  const by = ch.solar.y, endY = Math.min(opt.toYear || 2025, p.death_date ? +p.death_date.slice(0, 4) : 9999), fromY = by + (opt.fromAge ?? 15);
  const years = {};
  M.seunRange(ch, fromY, endY).forEach(x => {
    const row = { age: x.year - by, flow: r2(x.combined), own: r2(x.ev.ownFit), grade: LG.flow(x.combined, M).n, vol: r2(x.ev.volatilityScore),
      gz: M.gzName(x), stemTG: x.stemTG, branchTG: x.branchTG, daeun: x.daeun ? M.gzName(x.daeun) : null };
    if (opt.detail) {
      const m = LT && LT.mainEl ? LT.mainEl(M, x) : null; row.mainEl = m ? m.el : null;
      row.rels = M.luckRelations(ch, { s: x.s, b: x.b }).rels.map(r => r.name);
      row.roles = { stem: ch.unified.roles[M.stemEl(x.s)], branch: ch.unified.roles[M.BR_EL[x.b]] };
      row.unified = r2(x.ev.unifiedScore); row.relation = r2(x.ev.relationScore); row.structure = r2(x.ev.structureScore);
    }
    if (opt.domains !== false) {
      const res = M.evaluateDomainLuck(ch, x, 'seun', { ms: x.midMs }); row.dom = {};
      DOMAINS.forEach(k => { const r = res[k]; if (r && typeof r.score === 'number') row.dom[k] = r.score; });
    }
    years[x.year] = row;
  });
  return {
    input: inp, hourKnown: !!ch.pillars.hour, pillars: ['year', 'month', 'day', 'hour'].map(k => ch.pillars[k] ? M.gzName(ch.pillars[k]) : null),
    unified: { mode: ch.unified.mode, primary: ch.unified.primaryName, yong: ch.unified.yong, roles: ch.unified.roles }, strength: r2(ch.strength.help),
    daeun: ch.daeun.list.map(d => ({ startYear: d.startYear, startAge: d.startAge, gz: M.gzName(d), fit: r2(d.ev.fitScore), stemTG: d.stemTG, branchTG: d.branchTG })),
    years
  };
}
const r2 = x => Math.round(x * 100) / 100;
module.exports = { engine, engineHash, toInput, series, timeKnown, DOMAINS, ROOT };
