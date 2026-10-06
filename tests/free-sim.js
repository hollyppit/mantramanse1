// 무료 콘텐츠 코어 검증:  node tests/free-sim.js
// 타로 합성기(78장×정/역×5분야) · 오늘의 운세 결과 객체(실제 엔진) · /api/free-content 정리 규칙
const fs = require('fs'), path = require('path'), vm = require('vm');
const root = path.join(__dirname, '..');
globalThis.window = globalThis;
vm.runInThisContext(fs.readFileSync(path.join(root, 'engine.js'), 'utf8'), { filename: 'engine.js' });
const Core = require(path.join(root, 'shared-core.js')), FC = require(path.join(root, 'report/hub/free-core.js')), T = Core.Tarot, M = globalThis.Manse;
const fails = []; const ok = (c, m) => { if (!c) { fails.push(m); } };
const BANNED = /(반드시|무조건|확정|100%|틀림없|결혼합니다|파산|사망|이혼|합격|대박|질병|암에|진단)/;
const MODES = Object.keys(T.modes);

(async () => {
  console.log('1. 타로 합성기');
  let n = 0, uniq = new Set();
  for (const c of T.cards) for (const rev of [false, true]) for (const m of MODES) {
    const r = FC.composeTarot(T, c.id, rev, m, 'seed1', null); n++;
    const all = [r.headline, r.summary, ...r.detail, r.currentFlow, r.opportunity, r.caution, ...r.actions, r.closing].join(' ');
    ok(r.headline && r.summary && r.detail.length === 2 && r.currentFlow && r.opportunity && r.caution && r.actions.length === 3 && r.closing, `구성 ${c.id}/${rev}/${m}`);
    ok(!/\{\w+\}/.test(all), `치환 안 된 자리표시 ${c.id}/${rev}/${m}`);
    ok(!BANNED.test(all), `금지어 ${c.id}/${rev}/${m}: ${(all.match(BANNED) || [])[0]}`);
    ok(new Set(r.actions).size === 3 && r.detail[0] !== r.detail[1], `중복 문장 ${c.id}`);
    ok(r.score === T.read(c.id, rev, m).score, '점수는 기존 카드 데이터 그대로');
    if (m === 'yesno') ok(r.verdict === T.read(c.id, rev, m).verdict && r.verdictLabel, 'YES/NO 판정은 기존 구간 그대로');
    uniq.add(r.headline + r.caution);
  }
  ok(n === 780, '780건 생성'); ok(uniq.size > 60, '문장 다양성: ' + uniq.size);
  const a = FC.composeTarot(T, 'M9', false, 'money', 's-A', null), a2 = FC.composeTarot(T, 'M9', false, 'money', 's-A', null);
  ok(JSON.stringify(a) === JSON.stringify(a2), '같은 seed 는 같은 결과(다시 열어도 문장 안 바뀜)');
  const variants = new Set(); for (let i = 0; i < 40; i++) variants.add(JSON.stringify(FC.composeTarot(T, 'M9', false, 'money', 'x' + i, null).actions)); ok(variants.size > 5, '다른 seed 는 다른 조합: ' + variants.size);
  const toneAll = {}; for (const m of MODES) toneAll[m] = FC.composeTarot(T, 'M9', false, m, 's', null).headline;
  ok(new Set(Object.values(toneAll)).size >= 4, '같은 카드도 분야마다 다른 핵심 메시지: ' + JSON.stringify(toneAll));
  ok(FC.composeTarot(T, 'M9', false, 'money', 's', null).tone === FC.composeTarot(T, 'M9', false, 'love', 's', null).tone, '같은 카드·방향이면 톤은 같다(앞뒤 의미 충돌 없음)');
  // 톤 일관성: 밝은 카드의 문장 풀에 신중 톤 문장이 섞이지 않는다
  const up = FC.tarotDefaults('money', 'up'), care = FC.tarotDefaults('money', 'care'); ok(!up.caution.some(x => care.headline.includes(x)) && up.headline.every(x => !care.headline.includes(x)), '톤별 풀 분리');
  // 관리자 override
  const ov = { tarot: { cards: { M9: { up: { money: { headline: ['돈을 움직이기 전에 돈이 어디로 가는지 보세요.'], action: ['A1', 'A2', 'A3', 'A4'] } } } } } };
  const o = FC.composeTarot(T, 'M9', false, 'money', 's', ov);
  ok(o.headline === '돈을 움직이기 전에 돈이 어디로 가는지 보세요.' && o.actions.every(x => /^A\d$/.test(x)) && o.source.headline === 'card' && o.source.caution === 'default', '카드별 override 는 해당 슬롯만 대체');
  ok(FC.composeTarot(T, 'M9', true, 'money', 's', ov).source.headline === 'default', '다른 방향은 영향 없음');
  const cm = FC.tarotCompleteness(ov, 'M9'); ok(cm.up.money === 25 && cm.up.love === 0 && cm.total === 3, '완성도 계산: ' + JSON.stringify(cm));
  ok(FC.tarotCompleteness(null, 'M0').total === 0, '미작성 카드는 0%');

  console.log('2. 오늘의 운세(실제 엔진)');
  const mk = (y, m, d, h, g) => M.compute({ year: y, month: m, day: d, hour: h, minute: 0, calendar: 'solar', leap: false, gender: g, lon: 126.98, timeMode: 'lmt', jasi: 'jeong', sinsalBase: 'year', model: 'season', school: 'eokbu' });
  let days = 0; const ctas = {}, phases = {};
  for (const [y, m, d, h, g] of [[1990, 5, 15, 14, 'M'], [1985, 11, 3, 6, 'F'], [2001, 2, 4, 23, 'F'], [1972, 8, 20, 12, 'M']]) {
    const ch = mk(y, m, d, h, g);
    for (let day = 0; day < 36; day++) {
      const now = Date.UTC(2026, 9, 1 + day * 3, 3), td = FC.todayData(M, ch, now, Core.DAYMODE), r = FC.buildDaily(td, { seed: `${y}-${m}-${d}`, name: '' }); days++;
      ok(r.overallScore === td.score && r.phase === td.phase && r.cond === td.cond, '점수·단계는 엔진 값 그대로');
      for (const k of ['money', 'work', 'love', 'health']) {
        const f = r.fields[k]; if (!td.fields[k]) continue;
        ok(f && f.score === Math.max(0, Math.min(100, Math.round(td.fields[k].s))) && f.band === td.fields[k].b, `분야 점수 ${k} 그대로`);
        ok(f.detail.length >= 1 && f.goodActions.length === 3 && f.cautions.length === 2 && f.summary, `분야 구성 ${k}`);
      }
      ok(r.fields.work && r.fields.work.examples.length >= 2, '일·사업 예시는 단계별 업무');
      ok(r.todayActions.length === 3 && r.avoidActions.length === 2 && r.closingMessage && r.headline && r.summary && r.summary2, '행동 처방 구성');
      ok(r.evidence.plain.length === 3 && r.evidence.pro.length >= 1 && r.evidence.intro, '근거 구성');
      const all = JSON.stringify(r); ok(!BANNED.test(all), '금지어(오늘): ' + (all.match(BANNED) || [])[0]);
      ok(!/\{\w+\}/.test(all), '자리표시 미치환');
      ok(/^#\/go\?to=(career|money|love|life)$/.test(r.next.to) && r.next.q && r.next.btn, 'CTA 는 무료 콘텐츠로만: ' + r.next.to);
      ok(JSON.stringify(FC.buildDaily(td, { seed: `${y}-${m}-${d}` })) === JSON.stringify(r), '같은 입력이면 같은 결과');
      ctas[r.next.key] = (ctas[r.next.key] || 0) + 1; phases[r.phase] = 1;
    }
  }
  console.log('   ' + days + '일 생성 · CTA 분포 ' + JSON.stringify(ctas));
  ok(Object.keys(ctas).length >= 3, 'CTA 가 결과에 따라 달라진다');
  // 근거는 실제 엔진 값(관계 문장 번역 · 임의 창작 없음)
  const chE = mk(1990, 5, 15, 14, 'M'), tdE = FC.todayData(M, chE, Date.UTC(2026, 9, 6, 3), Core.DAYMODE), ev = FC.dailyEvidence(tdE);
  ok(ev.plain[1].body.includes(tdE.phase) && ev.plain[0].body.includes(tdE.gz), '근거에 실제 일진·단계가 들어감');
  ok(ev.pro.some(x => x.includes('일진')) && (tdE.ev.reasons.length === 0 || ev.pro.some(x => tdE.ev.reasons.includes(x))), '전문 해석은 엔진 reasons 그대로');
  // 관리자 override(일일)
  const td0 = FC.todayData(M, chE, Date.UTC(2026, 9, 6, 3), Core.DAYMODE), o2 = FC.buildDaily(td0, { seed: 's', overrides: { daily: { act: { 축적기: ['커스텀 행동 하나', '커스텀 둘', '커스텀 셋'] }, cta: { life: { q: '질문?', btn: '버튼', to: '#/go?to=life' } } } } });
  if (td0.phase === '축적기') ok(o2.todayActions.every(x => x.startsWith('커스텀')), '행동 override');
  ok(o2.fields.money.detail.length >= 1, 'override 가 없는 경로는 기본 문구');

  console.log('3. /api/free-content 정리 규칙');
  const API = await import('file:///' + path.join(root, 'functions/api/free-content.js').replace(/\\/g, '/'));
  const store = new Map(), env = { ADMIN_PASSWORD: 'pw', GLOSSARY_KV: { get: async (k, t) => { const v = store.get(k); return v == null ? null : t === 'json' ? JSON.parse(v) : v; }, put: async (k, v) => { store.set(k, v); } } };
  const put = async (b, pw = 'pw') => { const r = await API.onRequestPut({ env, request: new Request('https://x/api/free-content', { method: 'PUT', headers: { authorization: 'Bearer ' + pw, 'content-type': 'application/json' }, body: JSON.stringify(b) }) }); return { s: r.status, d: await r.json() }; };
  ok((await put({}, 'bad')).s === 401, '인증 없으면 401');
  let p = await put({ tarot: { cards: { M9: { up: { money: { headline: ['  a  ', '', 5], evil: ['x'] } }, bad: {} }, ZZ99: { up: {} }, '__proto__': { up: {} } } }, daily: { act: { 축적기: ['x', ' '] }, cta: { work: { q: '질문', to: '#/go?to=career', evil: 5 }, life: { to: 'https://evil.com' } }, 'bad key!': ['x'] } });
  ok(p.s === 200 && p.d.version, 'PUT 성공');
  const saved = JSON.parse(store.get('free:content'));
  ok(JSON.stringify(saved.tarot.cards) === '{"M9":{"up":{"money":{"headline":["a"]}}}}', '타로 정리: ' + JSON.stringify(saved.tarot.cards));
  ok(saved.daily.act['축적기'].length === 1 && saved.daily.cta.work.to === '#/go?to=career' && !saved.daily.cta.life && !saved.daily['bad key!'], '일일 정리·외부 주소 차단: ' + JSON.stringify(saved.daily));
  const g = await (await API.onRequestGet({ env })).json(); ok(g.content.version === p.d.version, 'GET 은 공개');

  console.log(fails.length ? '\n실패 ' + fails.length + '건\n' + [...new Set(fails)].slice(0, 20).join('\n') : '\n전부 통과');
  process.exit(fails.length ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
