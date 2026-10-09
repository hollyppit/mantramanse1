/* 관리자 "정합성 검사" — 테스트 사주로 무빙툰 전체 문서를 만들고, 계산값과 문장이 어긋나는 곳을 챕터별로 보여 준다.
   검사 규칙은 뷰어·테스트·AI 서버와 같은 파일(report/v2/consistency.js)이다. 이 화면은 AI 를 호출하지 않는다(규칙·DB 문장만 검사).
   - 챕터별 통과/실패 현황 · 같은 사주로 여러 챕터에 반복된 문장(중복) 탐지
   - 문장을 누르면: 이 문장에 걸린 규칙 · 비교한 계산값 · 어느 장면(챕터/장면 id)에서 나왔는지 · 생성 방식
   - 결과를 마크다운 리포트로 내려받기 */
(function () {
  'use strict';
  var R = window.ReportV2, C = window.V2Content, esc = C.esc, CS = R.Consistency;
  var KEY = 'mt_v2_check_ts', TS = { date: '1994-07-24', time: '12:00', gender: 'F' };
  try { Object.assign(TS, JSON.parse(localStorage.getItem(KEY) || '{}')); } catch (e) { }
  var $ = function (s, e) { return (e || document).querySelector(s); }, LAST = null;
  var RULE_KO = { 'birth-season': '출생 계절 ≠ 월령', 'branch-symbol-as-birth-env': '일지 상징을 출생 환경으로 서술', 'element-absent': '있는 오행을 없다고 서술', 'element-dominant': '최다 오행 불일치', 'group-absent': '있는 십성군을 없다고 서술', 'group-dominant': '최다 십성군 불일치', strength: '신강·신약 불일치', 'day-master': '일간 불일치', 'day-pillar': '일주 불일치', 'luck-scope': '대운·세운·월운 적용 범위 혼동', yong: '용신 불일치', 'yong-method': '억부/조후 기준별 용신 불일치', root: '통근 유무 불일치' };
  var plain = function (h) { return String(h || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim(); };
  var sents = function (h) { return plain(h).split(/(?<=[.!?。])\s+/).filter(function (x) { return x.length >= 8; }); };

  function calcValues(sd) {
    var bs = CS.birthSeason(sd), e = sd.fiveElements || {}, g = sd.groups || {}, M = sd.usefulElementMethods || {};
    return [['월령(월지)', bs ? bs.branch + ' · ' + bs.name : '-'], ['일간 · 일주', (sd.dayMaster && sd.dayMaster.stem) + ' · ' + (sd.dayPillar && sd.dayPillar.ko)],
      ['오행 %', Object.keys(e).map(function (k) { return k + ' ' + e[k]; }).join(' · ') + ' (최다 ' + sd.dominantEl + ')'], ['십성군 %', Object.keys(g).map(function (k) { return k + ' ' + g[k]; }).join(' · ') + ' (최다 ' + sd.dominantGroup + ')'],
      ['신강·신약', sd.strength ? sd.strength.band + ' (' + sd.strength.zone + ')' : '-'], ['통근', sd.roots ? (sd.roots.hasRoot ? '있음' : '없음') + ' · ' + sd.roots.score + '점' : '-'],
      ['용신', (sd.usefulElements && sd.usefulElements.yong || '-') + ' (억부 ' + (M.eokbu && M.eokbu.yong || '-') + ' / 조후 ' + (M.johu && M.johu.yong || '-') + ')']];
  }

  // 챕터가 쓴 풀이 모듈(DB 항목)과 그 적용 조건·참조한 원국 필드. 문장 단위 id 는 기록되지 않아 챕터 단위로 추적한다.
  var LIBM = null;
  function moduleRows(c, sd) {
    var ids = (c.modules || []).filter(function (x) { return typeof x === 'string'; }); if (!ids.length) return '';
    try { LIBM = LIBM || R.Compose.library(null).modules; } catch (e) { return ''; }
    var facts = R.Rules.flatten(sd, { project: 'full' });
    return ids.map(function (id) {
      var m = LIBM.filter(function (x) { return x.id === id; })[0]; if (!m) return '<div>' + esc(id) + ' <small class="muted">(라이브러리에서 찾지 못함)</small></div>';
      var ev = R.Rules.evaluate(m, facts);
      return '<div style="margin:4px 0"><b>' + esc(id) + '</b> <small class="muted">' + esc(m.category || '') + ' · ' + (ev.match ? '조건 충족' : '조건 불일치') + '</small>' + (ev.rows.length ? '<br><small>' + ev.rows.map(function (r) { return esc(r.label) + ' = ' + esc(Array.isArray(r.have) ? r.have.join(',') : String(r.have)) + ' (' + (r.hit ? '✓' : '✗') + ' 기준 ' + esc(r.want.join('/')) + ')'; }).join('<br>') + '</small>' : '<br><small class="muted">조건 없음(항상 적용)</small>') + '</div>';
    }).join('');
  }
  function run(M) {
    var d = TS.date.split('-').map(Number), t = (TS.time || '12:00').split(':').map(Number), now = Date.now();
    var ch = M.compute({ year: d[0], month: d[1], day: d[2], hour: t[0], minute: t[1], calendar: 'solar', leap: false, gender: TS.gender, city: '서울' }), sd = R.SajuData.build(ch, { now: now }), H = { M: M, ch: ch, sd: sd, now: now, name: '테스트', assets: {} };
    var lib = R.Compose.library(null), cfg = R.Chapters.forProject(null, 'full'), rep = R.Compose.build(sd, lib, cfg, { name: H.name });
    if (R.Deep && R.Deep.augment) R.Deep.augment(rep, H);
    var doc = R.LifeDoc.build(Object.assign({}, H, { rep: rep, soc: R.StoryDirector.social(M, ch, sd, now), plan: (rep.chapters.find(function (c) { return c.plan; }) || {}).plan })), chapters = [];
    var intro = R.CharIntro && R.CharIntro.chapter(sd, '테스트', {}, 1); if (intro) chapters.push(intro);
    chapters = chapters.concat(doc.chapters);
    var seen = {}, dup = {}, rows = chapters.map(function (c) {
      var viol = [], n = 0;
      (c.scenes || []).forEach(function (s) {
        var h = s.html || s.text || ''; n += sents(h).length;
        CS.checkAll(sd, h).forEach(function (v) { v.chapter = c.id; v.scene = s.sceneId || ''; viol.push(v); });
        sents(h).forEach(function (x) { if (x.length < 24) return; if (seen[x] && seen[x] !== c.id) dup[x] = (dup[x] || [seen[x]]).concat(c.id); else seen[x] = c.id; });
      });
      return { c: c, viol: viol, n: n };
    });
    return { sd: sd, rows: rows, dup: dup };
  }

  function draw(box, M) {
    var form = '<div class="pvh" style="margin-bottom:12px"><label>생년월일<input type="date" id="ckD" value="' + esc(TS.date) + '"></label><label>시각<input type="time" id="ckT" value="' + esc(TS.time) + '"></label><label>성별<select id="ckG"><option value="M"' + (TS.gender === 'M' ? ' selected' : '') + '>남</option><option value="F"' + (TS.gender === 'F' ? ' selected' : '') + '>여</option></select></label><button type="button" id="ckRun" class="pri">검사하기</button><button type="button" id="ckDl">리포트 내려받기</button></div>';
    var h = '<div class="card"><b style="color:var(--gold)">풀이 정합성 검사</b><p class="muted" style="margin:6px 0 12px">입력한 생년월일로 무빙툰 전체를 만들고, 만세력 계산값(월령·오행·십성·신강약·통근·용신·일간·일주)과 문장이 어긋나는 곳을 규칙으로 찾습니다. AI는 호출하지 않습니다.</p>' + form;
    var res; try { res = run(M); } catch (e) { box.innerHTML = h + '<p class="muted">검사 실패: ' + esc((e && e.message) || '') + '</p></div>'; bind(box, M); return; }
    LAST = res; var fail = res.rows.filter(function (r) { return r.viol.length; }), total = res.rows.reduce(function (a, r) { return a + r.viol.length; }, 0), dupN = Object.keys(res.dup).length;
    h += '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:10px;margin-bottom:12px"><div class="card" style="padding:10px"><div class="muted">검사한 챕터</div><b style="font-size:1.4rem;color:var(--gold)">' + res.rows.length + '</b></div><div class="card" style="padding:10px"><div class="muted">통과</div><b style="font-size:1.4rem;color:#7fd8a8">' + (res.rows.length - fail.length) + '</b></div><div class="card" style="padding:10px"><div class="muted">실패(위반 ' + total + '건)</div><b style="font-size:1.4rem;color:' + (fail.length ? '#ffb070' : '#7fd8a8') + '">' + fail.length + '</b></div><div class="card" style="padding:10px"><div class="muted">챕터 간 중복 문장</div><b style="font-size:1.4rem;color:' + (dupN ? '#ffd27a' : '#7fd8a8') + '">' + dupN + '</b></div></div>';
    h += '<h4 style="margin:10px 0 6px;color:var(--gold)">이 사주의 계산값(검사 기준)</h4><table style="width:100%;border-collapse:collapse;font-size:.84rem">' + calcValues(res.sd).map(function (r) { return '<tr><td style="padding:4px 8px;border-bottom:1px solid var(--line);color:var(--ink2);white-space:nowrap">' + esc(r[0]) + '</td><td style="padding:4px 8px;border-bottom:1px solid var(--line)">' + esc(r[1]) + '</td></tr>'; }).join('') + '</table>';
    h += '<h4 style="margin:14px 0 6px;color:var(--gold)">챕터별 현황</h4>' + res.rows.map(function (r, i) {
      var ok = !r.viol.length; return '<details data-i="' + i + '" style="border-bottom:1px solid var(--line);padding:6px 0"><summary style="cursor:pointer"><span style="color:' + (ok ? '#7fd8a8' : '#ffb070') + '">' + (ok ? '✓ 통과' : '⚠ 실패 ' + r.viol.length) + '</span> · <b>' + esc(r.c.title || r.c.id) + '</b> <small class="muted">' + esc(r.c.id) + ' · 문장 ' + r.n + '개</small></summary><div class="ckb" style="padding:8px 0 4px"></div></details>'; }).join('');
    if (dupN) h += '<h4 style="margin:14px 0 6px;color:var(--gold)">챕터 간 중복 문장</h4><ul class="muted" style="margin:0 0 0 18px;line-height:1.6;font-size:.84rem">' + Object.keys(res.dup).slice(0, 30).map(function (k) { return '<li>' + esc(k.slice(0, 80)) + ' <small>(' + esc(res.dup[k].join(', ')) + ')</small></li>'; }).join('') + '</ul>';
    h += '<h4 style="margin:14px 0 6px;color:var(--gold)">AI 응답 문장 검증 (붙여넣기)</h4><p class="muted" style="margin:0 0 6px;font-size:.84rem">AI가 쓴 문단을 붙여넣으면 위 사주의 계산값과 같은 규칙으로 대조합니다(서버가 응답을 버리는 기준과 동일).</p><textarea id="ckAi" rows="4" style="width:100%" placeholder="예) 겨울 문턱의 큰 물 곁에서 자란 신금 같은 기질을 타고난 사람입니다."></textarea><div><button type="button" id="ckAiBtn">검증</button></div><div id="ckAiOut" style="margin-top:6px;font-size:.86rem"></div>';
    h += '<div id="ckPanel" class="card" style="position:sticky;bottom:8px;margin-top:12px;display:none"></div></div>';
    box.innerHTML = h; bind(box, M);
    $('[id=ckRun]', box); box.querySelectorAll('details[data-i]').forEach(function (dt) { dt.addEventListener('toggle', function () { if (dt.open) fill(dt, box); }, { once: true }); });
  }
  // 챕터를 펼치면 문장 목록을 그린다. 문장을 누르면 근거 패널이 열린다.
  function fill(dt, box) {
    var r = LAST.rows[+dt.dataset.i], body = $('.ckb', dt), bad = {};
    r.viol.forEach(function (v) { bad[v.snippet] = v; });
    var out = []; (r.c.scenes || []).forEach(function (s) { sents(s.html || s.text || '').forEach(function (x) { out.push({ t: x, scene: s.sceneId || '', v: CS.checkAll(LAST.sd, x) }); }); });
    LAST.items = LAST.items || {}; LAST.items[dt.dataset.i] = out;
    body.innerHTML = out.slice(0, 120).map(function (x, k) { return '<div class="cks" data-k="' + k + '" style="padding:4px 6px;margin:2px 0;border-radius:6px;cursor:pointer;font-size:.86rem;line-height:1.55;' + (x.v.length ? 'background:rgba(255,150,60,.14);border-left:3px solid #ff9a3c' : 'border-left:3px solid transparent') + '">' + esc(x.t) + '</div>'; }).join('') + (out.length > 120 ? '<p class="muted">… 외 ' + (out.length - 120) + '문장</p>' : '');
    body.querySelectorAll('.cks').forEach(function (e) { e.onclick = function () { panel(box, r, LAST.items[dt.dataset.i][+e.dataset.k]); }; });
  }
  function panel(box, r, x) {
    var p = $('#ckPanel', box), sd = LAST.sd; p.style.display = '';
    p.innerHTML = '<div class="muted" style="font-size:.78rem">선택한 문장</div><p style="margin:4px 0 10px">' + esc(x.t) + '</p>' +
      '<table style="width:100%;border-collapse:collapse;font-size:.84rem">' +
      [['정합성 검증', x.v.length ? '<span style="color:#ffb070">실패 — ' + x.v.map(function (v) { return esc(RULE_KO[v.rule] || v.rule) + ' (문장: ' + esc(v.claimed || '-') + ' / 계산값: ' + esc(v.actual) + ')'; }).join(' · ') + '</span>' : '<span style="color:#7fd8a8">통과 — 적용한 규칙 14종에 걸리지 않음</span>'],
        ['나온 곳', esc((r.c.title || r.c.id) + ' · 챕터 ' + r.c.id + (x.scene ? ' · 장면 ' + x.scene : ''))],
        ['생성 방식', 'AI 미사용 — 규칙·풀이 DB 문장(이 화면은 AI를 호출하지 않습니다). 실제 서비스에서 AI가 다시 쓴 문단은 서버가 같은 규칙으로 검증하고, 어긋나면 버립니다.'],
        ['대조한 계산값', calcValues(sd).map(function (v) { return esc(v[0] + ': ' + v[1]); }).join('<br>')],
        ['풀이 DB 항목(챕터 단위)', (moduleRows(r.c, sd) || '이 챕터는 풀이 모듈 없이 계산값·엔진 문장으로 만들어졌거나, 풀이 지식(ik) 문장입니다. ik 문장은 "풀이 지식" 탭의 항목 id로 추적합니다.') + '<div style="margin-top:6px"><button type="button" data-go="v2test">문구·적용 조건 수정하러 가기 →</button> <button type="button" data-go="ikknow">풀이 지식(변경 이력·롤백) →</button></div>']].map(function (row) { return '<tr><td style="padding:4px 8px;border-bottom:1px solid var(--line);color:var(--ink2);white-space:nowrap;vertical-align:top">' + row[0] + '</td><td style="padding:4px 8px;border-bottom:1px solid var(--line)">' + row[1] + '</td></tr>'; }).join('') + '</table>';
    p.querySelectorAll('[data-go]').forEach(function (b) { b.onclick = function () { if (window.AdminShowTab) window.AdminShowTab(b.dataset.go); }; });
  }
  function report() {
    if (!LAST) return; var sd = LAST.sd, L = ['# 풀이 정합성 리포트', '', '- 입력: ' + TS.date + ' ' + TS.time + ' · ' + (TS.gender === 'M' ? '남' : '여'), '- 생성: ' + new Date().toISOString().slice(0, 16).replace('T', ' ') + ' (UTC)', '', '## 계산값'].concat(calcValues(sd).map(function (r) { return '- ' + r[0] + ': ' + r[1]; }), ['', '## 챕터별 결과', '', '| 챕터 | 결과 | 위반 |', '|---|---|---|']);
    LAST.rows.forEach(function (r) { L.push('| ' + (r.c.title || r.c.id).replace(/\|/g, '/') + ' (' + r.c.id + ') | ' + (r.viol.length ? '실패' : '통과') + ' | ' + r.viol.map(function (v) { return (RULE_KO[v.rule] || v.rule) + ': ' + v.snippet.replace(/\|/g, '/'); }).join('; ') + ' |'); });
    L.push('', '## 챕터 간 중복 문장', ''); Object.keys(LAST.dup).forEach(function (k) { L.push('- ' + k.slice(0, 100) + ' (' + LAST.dup[k].join(', ') + ')'); });
    var a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([L.join('\n')], { type: 'text/markdown;charset=utf-8' })); a.download = 'consistency-report-' + TS.date + '.md'; document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  }
  function bind(box, M) {
    var go = function () { TS.date = $('#ckD', box).value || TS.date; TS.time = $('#ckT', box).value || TS.time; TS.gender = $('#ckG', box).value; try { localStorage.setItem(KEY, JSON.stringify(TS)); } catch (e) { } draw(box, M); };
    var ab = $('#ckAiBtn', box); if (ab) ab.onclick = function () { var t = $('#ckAi', box).value, v = LAST ? CS.checkAll(LAST.sd, t) : [], o = $('#ckAiOut', box); o.innerHTML = !t.trim() ? '' : v.length ? '<span style="color:#ffb070">⚠ 서버에서 거부될 문장 — ' + v.map(function (x) { return esc(RULE_KO[x.rule] || x.rule) + ' (문장: ' + esc(x.claimed || '-') + ' / 계산값: ' + esc(x.actual) + ')'; }).join(' · ') + '</span>' : '<span style="color:#7fd8a8">✓ 계산값과 어긋나는 곳을 찾지 못했습니다(규칙으로 확인 가능한 범위).</span>'; };
    var b = $('#ckRun', box); if (b) b.onclick = go; var d = $('#ckDl', box); if (d) d.onclick = report;
  }
  window.V2Check = { _t: { run: run, moduleRows: moduleRows }, open: function () { var box = document.getElementById('t-check'); if (!box) return; box.innerHTML = '<p class="muted">엔진을 불러오는 중…</p>'; C.engine().then(function (M) { draw(box, M); }).catch(function (e) { box.innerHTML = '<p class="muted">' + esc((e && e.message) || '') + '</p>'; }); } };
})();
