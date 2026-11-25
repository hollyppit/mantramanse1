/* 주무기 상세풀이 블록(2026-11-26) — 만세력 '나의 주무기'(/weapon.js MantraWeapon)와 같은 판정을 운명의 타임라인 유료 장에 주제별로 붙인다.
   · 공통 데이터: MantraWeapon.analyze(원국 판정) · MantraWeapon.timeline(대운·세운·월운 활성도·유리도). 이 파일은 계산하지 않고 주제별로 골라 쓴다.
     활성도와 유리도(엔진 흐름 등급)는 따로 보여 주고 합치지 않는다. 운세 점수·용신·격국·합충 계산 불변.
   · 주제별 역할(같은 설명을 반복하지 않기):
       종합(self)   주무기의 정체·형성 근거·보조 주무기·과잉·장기 환경·대운 발현 — 형성 근거는 이 주제에만
       재물(wealth) 주무기와 재성의 관계(같은 개념 아님)·수익 구조·강점·주의·세운/월운
       커리어(career) 직업적 주무기·업무 방식·조직/독립·기존 관성·식상·재성 비율과 함께·리더십·이직 기준·대운/세운
       인연(love)   관계에서의 주무기·표현·소통·과잉·상대와의 상호작용·배우자 자리 사실(단정 없음)·대운/세운
       개운(remedy) 강화 루틴·보조 주무기·과잉 조절·부족한 기능 보완(용신 쪽 십성)·현재 대운/올해/다음 달들
     건강·사고수·전생 장에는 붙이지 않는다(설정에서도 고를 수 없음).
   · 장 연결: 질문(장)별 설정 rows — 기본값 DEFAULT_ROWS, 관리자 설정(/api/weapon-links, KV weapon:links)이 있으면 그것을 쓴다.
     설정 항목: on · topic · use{first,second,power,overlap,rootExp,tenGod,daeun,seun,wolun,activation,favor}. 장 ID·질문·결제는 건드리지 않는다.
     reading-feature.js SPEC 에 custom:'wp:<장 ID>' 조각을 더하고, reading-feature.js 가 render 로 넘긴다.
   · 주무기가 없거나 미확정이면 종합풀이에만 짧은 안내, 다른 주제는 블록을 생략한다. 시간 모름은 /weapon.js 가 시주 근거를 쓰지 않는다.
   · 공개 스위치: /api/luck-flags weaponChapters(기본 꺼짐). 로컬·미리보기 주소에서는 ?mantraFlags=weaponChapters
   · 검증: node tests/weapon-chapters-sim.cjs */
(function (root) {
  'use strict';
  var R = root.ReportV2 = root.ReportV2 || {};
  var VERSION = 'weapon-chapters-20261126-1';
  var TOPICS = ['self', 'wealth', 'career', 'love', 'remedy'], TOPIC_K = { self: '종합풀이', wealth: '재물운', career: '커리어운', love: '인연운', remedy: '개운법' };
  var SCOPES = ['daeun', 'seun', 'wolun'], SCOPE_K = { daeun: '대운', seun: '세운', wolun: '월운' };
  var USE_KEYS = ['first', 'second', 'power', 'overlap', 'rootExp', 'tenGod', 'daeun', 'seun', 'wolun', 'activation', 'favor'];
  var USE_K = { first: '1순위 주무기', second: '2순위 주무기', power: '오행 세력', overlap: '병존·간여지동 근거', rootExp: '통근·투간 근거', tenGod: '십성 작용', daeun: '대운', seun: '세운', wolun: '월운', activation: '주무기 활성도', favor: '활용 유리도' };
  var BLOCKED = /^timeline_(health|creative)_|^timeline_self_(3[56]|h\d+)$/;   // 건강·사고수(health_*, self_35, 건강 상세 self_h1~6)·전생(creative_*, self_36) 장
  var u = function (o) { var r = {}; USE_KEYS.forEach(function (k) { r[k] = !!(o && o[k]); }); return r; };
  var ALL = { first: 1, second: 1, power: 1, overlap: 1, rootExp: 1, tenGod: 1, activation: 1, favor: 1 };
  var mix = function (a, b) { var r = {}; for (var k in a) r[k] = a[k]; for (var j in b) r[j] = b[j]; return r; };
  // 기본 연결(지시문 10절 표): 종합=전체 주무기·대운·세운 / 재물=주무기+재성·대운·세운·월운 / 커리어=주무기+직업 십성·대운·세운·월운 / 인연=주무기+관계 십성·대운·세운 / 개운=보완·현재 대운·세운·월운
  var DEFAULT_ROWS = {
    timeline_self_25: { on: true, topic: 'self', use: u(mix(ALL, { daeun: 1, seun: 1 })) },
    timeline_wealth_02: { on: true, topic: 'wealth', use: u(mix(ALL, { overlap: 0, rootExp: 0, daeun: 1, seun: 1, wolun: 1 })) },
    timeline_career_04: { on: true, topic: 'career', use: u(mix(ALL, { overlap: 0, rootExp: 0, daeun: 1, seun: 1, wolun: 1 })) },
    timeline_love_04: { on: true, topic: 'love', use: u(mix(ALL, { overlap: 0, rootExp: 0, power: 0, daeun: 1, seun: 1 })) },
    timeline_self_37: { on: true, topic: 'remedy', use: u(mix(ALL, { overlap: 0, rootExp: 0, daeun: 1, seun: 1, wolun: 1 })) },
    // 발현 그래프(view:'graph', 2026-11-26) — 이미 '시기'를 다루는 장에 단계 선 그래프 + 흐름 등급 띠 + 주제별 요약. 범위(scope)는 대운·세운·월운 중 하나
    timeline_self_20: { on: true, topic: 'self', view: 'graph', scope: 'daeun', use: u({ first: 1, second: 1, activation: 1, favor: 1, daeun: 1 }) },
    timeline_self_24: { on: true, topic: 'self', view: 'graph', scope: 'wolun', use: u({ first: 1, second: 1, activation: 1, favor: 1, wolun: 1 }) },
    timeline_wealth_14: { on: true, topic: 'wealth', view: 'graph', scope: 'seun', use: u({ first: 1, second: 1, activation: 1, favor: 1, seun: 1 }) },
    timeline_career_14: { on: true, topic: 'career', view: 'graph', scope: 'seun', use: u({ first: 1, second: 1, activation: 1, favor: 1, seun: 1 }) },
    timeline_love_14: { on: true, topic: 'love', view: 'graph', scope: 'seun', use: u({ first: 1, second: 1, activation: 1, favor: 1, seun: 1 }) },
  };
  var BANNED = /반드시|무조건|성공합니다|성공할 거예요|성공 확률|대박|보장|틀림없|천재|돈을 법니다|수익이 납니다|결혼합니다|결혼하게 됩니다|건강해집니다|병이|진단|월 \d+만/;
  var WD = function () { return root.MantraWeaponData; }, W = function () { return root.MantraWeapon; };
  var DD = function () { return R.WeaponChaptersData || (typeof require === 'function' ? require('./weapon-chapters-data.js') : null); };
  var EL_K = ['목', '화', '토', '금', '수'], EL_H = ['木', '火', '土', '金', '水'], GN = ['비겁', '식상', '재성', '관성', '인성'];
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var bat = function (w) { var t = String(w).replace(/\([^)]*\)/g, '').replace(/[^가-힣]+$/, ''), c = t.charCodeAt(t.length - 1) - 0xAC00; return c >= 0 && c <= 11171 && c % 28 !== 0; };
  var J = { 은: function (w) { return w + (bat(w) ? '은' : '는'); }, 이: function (w) { return w + (bat(w) ? '이' : '가'); }, 을: function (w) { return w + (bat(w) ? '을' : '를'); }, 예요: function (w) { return w + (bat(w) ? '이에요' : '예요'); } };
  var fill = function (t, o) { return String(t).replace(/\{(\w+)\}/g, function (m, k) { return o[k] == null ? '' : o[k]; }); };

  // ── 설정 ──
  var cfg = { version: 0, rows: DEFAULT_ROWS };
  function sanitize(d) {
    var rows = {}; if (!d || typeof d !== 'object' || !d.rows || typeof d.rows !== 'object') return null;
    Object.keys(d.rows).forEach(function (id) {
      var r = d.rows[id]; if (!/^timeline_[a-z]+_[\w]+$/.test(id) || BLOCKED.test(id) || !r || TOPICS.indexOf(r.topic) < 0) return;
      rows[id] = { on: r.on !== false, topic: r.topic, use: u(r.use) };
      if (r.view === 'graph') { rows[id].view = 'graph'; rows[id].scope = SCOPES.indexOf(r.scope) >= 0 ? r.scope : 'seun'; }
    });
    return { version: Number.isInteger(d.version) ? d.version : 0, rows: rows };
  }
  function setConfig(d) { var s = sanitize(d); if (s) { cfg = s; inject(); } return cfg; }
  function rowsOf() { return cfg.rows; }

  // reading-feature.js SPEC 에 조각 더하기(장이 SPEC 에 없으면 장 제목 없이 새로 만든다). 꺼진 줄은 빼고, 이미 있는 조각은 중복으로 넣지 않는다.
  function inject() {
    var RF = R.ReadingFeature; if (!RF || !RF.SPEC) return false;
    Object.keys(RF.SPEC).forEach(function (id) { var sp = RF.SPEC[id]; if (sp && sp.parts) sp.parts = sp.parts.filter(function (p) { return !(p.custom && /^wp:/.test(p.custom)); }); });
    Object.keys(cfg.rows).forEach(function (id) {
      var r = cfg.rows[id]; if (!r.on) return;
      var sp = RF.SPEC[id] || (RF.SPEC[id] = { title: '나의 주무기 · ' + TOPIC_K[r.topic], parts: [] });
      sp.parts = sp.parts.concat([{ custom: 'wp:' + id }]);
    });
    return true;
  }

  // ── 공통 재료 ──
  function base(H) {
    if (!H || !H.M || !H.ch || !W() || !WD()) return null;
    var A; try { A = W().analyze(H.M, H.ch); } catch (e) { return null; } if (!A || !A.ok) return null;
    var now = H.now || Date.now(), nowY = H.M.yearPillarAt ? H.M.yearPillarAt(now).sajuYear : new Date(now).getFullYear();
    var tl = null; try { tl = W().timeline(H.M, H.ch, { fromY: nowY, years: 10, wolY: nowY }); } catch (e) { tl = null; }
    // 유료 풀이는 1순위 주무기 이야기라, 시기마다 '가장 켜지는 무기' 대신 1순위 무기의 활성도로 맞춘다(보조 무기 신호가 섞이지 않게)
    if (tl) ['daeun', 'seun', 'wolun'].forEach(function (k) { (tl[k] || []).forEach(prim); });
    var sure = A.weapons.length && A.status !== 'undetermined' && A.status !== 'complex';
    return { A: A, tl: tl, now: now, nowY: nowY, sure: sure, M: H.M, ch: H.ch, who: H.name || (H.sd && H.sd.name) || '' };
  }
  function prim(r) { if (r && r.acts && r.acts[0]) { r.best = r.acts[0]; if (W().readPair) r.read = W().readPair(r.best, r.favor); } return r; }
  function pickWeapons(B, use) { var w = B.A.weapons.slice(); var out = []; if (use.first && w[0]) out.push(w[0]); if (use.second && w[1]) out.push(w[1]); return out; }
  function wTitle(w) { return EL_K[w.el] + '(' + EL_H[w.el] + ') — ' + WD().el[w.el].title; }
  function curIdx(list, now) { var c = -1; (list || []).forEach(function (r, i) { if (r && r.startMs <= now) c = i; }); return c; }
  // 시기 한 줄: [시기] 활성도 · 유리도 — 주제 렌즈 문장 · 활용 방향 · 지원/제약
  function periodLine(B, r, label, topic, use, w) {
    if (!r || !r.best) return '';
    var a = r.best, wd = WD(), d = DD(), bits = [];
    if (use.activation) bits.push('주무기 활성도 ' + a.levelK);
    if (use.favor && r.favor) bits.push('활용 유리도 ' + r.favor.n);
    var cls = /strong|on|shaky/.test(a.level) ? 'on' : /sup|quiet/.test(a.level) ? 'prep' : 'guard';   // 활성도 단계에 맞는 문장(조용한 때를 '좋은 때'로 읽지 않게)
    // 2판(2026-11-26): 주제 × 작용 유형(강화·지원·발산·조정·조용함) + 주제 × 들어오는 십성 — 같은 해라도 주제마다, 해마다 다른 풀이
    var typ = !a.types.length ? 'quiet' : (a.types.indexOf('adjust') >= 0 && cls !== 'on') ? 'adjust' : a.types[0];
    var lens = topic === 'remedy' ? d.remedy.now[r.read] : topic === 'self' ? d.selfType[typ] : d.typeLens[topic][typ];
    if (B.seenLens) { if (B.seenLens[topic + lens]) lens = ''; else B.seenLens[topic + lens] = 1; }   // 같은 블록 안에서 같은 문장 반복 안 함
    var P = d.period[topic];   // 주제마다 다른 말로 — 같은 시기라도 주제 사이에 같은 문장이 나오지 않게
    var dir = use.tenGod ? ' ' + d.useLens[topic][a.use.group] + '(운 천간 ' + a.use.tg + ').' : '';
    if (dir && B.seenLens) { var ug = 'g' + a.use.group; if (B.seenLens[ug]) { dir = ' ' + fill(d.contUse[topic], { tg: a.use.tg }); if (B.seenLens['u' + dir]) dir = ''; else B.seenLens['u' + dir] = 1; } else B.seenLens[ug] = 1; }   // 같은 십성 묶음이 다시 오면 '이어져요' 한 줄로
    var rk = (a.roles.stem || '—') + '|' + (a.roles.branch || '—');   // 지원(용신 역할)은 앞 줄과 같으면 생략
    var sup = use.tenGod && (a.roles.stem || a.roles.branch) && !(B.seenLens && B.seenLens['r' + rk]) ? ' ' + fill(P.sup, { s: a.roles.stem || '—', b: a.roles.branch || '—' }) : ''; B.lastRole = rk; if (B.seenLens) B.seenLens['r' + rk] = 1;
    var cc = a.constraints.filter(function (c) { return !(B.seenLens && B.seenLens['c' + c]) && !(topic === 'self' && /이미 많은 쪽/.test(c)); })[0];   // 같은 제약은 블록 안에서 처음 한 번만
    var con = cc ? ' ' + fill(P.con, { c: cc }) : ''; if (cc) { B.hasCon = true; if (B.seenLens) B.seenLens['c' + cc] = 1; }
    return '<li><b>' + esc(label + ' ' + r.gz) + '</b>' + (bits.length ? ' <span class="dp-mi">' + esc(bits.join(' · ')) + '</span>' : '') + '<br>' + esc((lens + dir + sup + con).trim()) + '</li>';
  }
  function timingBlock(B, topic, use, w) {
    var tl = B.tl, d = DD(); if (!tl || !w) return '';
    B.seenLens = {}; B.lastRole = null; B.hasCon = false; var lines = [], on = function (r) { return r && r.best && /strong|on|shaky/.test(r.best.level); };
    if (use.daeun) {
      var di = curIdx(tl.daeun, B.now), cur = tl.daeun[di];
      if (cur) lines.push(periodLine(B, cur, '지금 대운(' + (cur.startAge) + '세~)', topic, use, w));
      var nx = topic !== 'remedy' ? tl.daeun.slice(di + 1).filter(on)[0] : null;   // 다음 발현 대운은 가까운 해·달 뒤에(시간 순서)
    }
    if (use.seun) {
      if (topic === 'remedy') { var cs = tl.seun.filter(function (r) { return r.year === B.nowY; })[0]; if (cs) lines.push(periodLine(B, cs, '올해 ' + cs.year + '년', topic, use, w)); }
      else tl.seun.filter(on).slice(0, topic === 'self' ? 2 : 3).forEach(function (r) { lines.push(periodLine(B, r, r.year + '년', topic, use, w)); });
    }
    if (use.wolun) {
      var wi = Math.max(0, curIdx(tl.wolun, B.now)), ms = tl.wolun.slice(wi + 1, wi + 7);
      var pick = topic === 'remedy' ? ms.slice(0, 3) : ms.filter(on).slice(0, 2);
      pick.forEach(function (r) { lines.push(periodLine(B, r, r.month + '월(' + r.termName + ')', topic, use, w)); });
    }
    if (use.daeun && nx) lines.push(periodLine(B, nx, '다음 발현 대운(' + nx.startAge + '세~, ' + nx.startYear + '년)', topic, use, w));
    lines = lines.filter(Boolean); if (!lines.length) return '';
    return '<h4>' + esc(d.timing[topic]) + '</h4><ul class="dp-ul">' + lines.join('') + '</ul>' + (B.hasCon ? '<p>' + esc(d.conTail[topic]) + '</p>' : '') + ((use.activation && use.favor && topic === 'self') ? '<p class="dp-mi">' + esc(d.selfFoot.axes) + '</p>' : '');
  }
  function formationPlain(B, w, use) {
    var d = DD().selfPlain, P = { year: '년', month: '월', day: '일', hour: '시' }, out = [];
    if (use.power) out.push(fill(d.power, { el: EL_K[w.el] + '(' + EL_H[w.el] + ')', pct: w.pct, rank: w.rank === 1 ? '가장' : w.rank + '번째로' }));
    if (use.rootExp) {
      out.push(fill(d.exposed, { list: w.stems.map(function (x) { return P[x.pos] + '간 ' + x.ch + '(' + x.tg + ')'; }).join(', ') }));
      var seen = {}, rl = w.roots.filter(function (r) { var k = r.pos; if (seen[k]) return false; seen[k] = 1; return true; }).map(function (r) { return P[r.pos] + '지 ' + r.ch + ' 속 ' + r.hs; });
      if (rl.length) out.push(fill(w.cond.deepRoot ? d.rootDeep : d.rootLight, { list: rl.join(', ') }));
      if (w.season) out.push(fill(d.season[/왕|상/.test(w.season) ? 'good' : w.season === '휴' ? 'mid' : 'low'], { st: w.season }));
    }
    if (use.overlap) {
      w.ganyeo.forEach(function (g) { out.push(fill(d.ganyeo, { pos: P[g.pos], gz: g.gz })); });
      w.byeongjon.stem.concat(w.byeongjon.branch).forEach(function (b) { out.push(fill(d.byeong, { ch: b.ch, n: b.pos.length, adj: d.byeongAdj[b.adj ? 'near' : 'far'] })); });
    }
    if (use.rootExp) {
      w.stems.forEach(function (x) { var nm = x.bound.concat(x.clash); if (nm.length) out.push(fill(d.bound, { pos: P[x.pos], ch: x.ch, names: nm.join('·') })); });
      w.rootClash.forEach(function (r) { if (r.chung.length) out.push(fill(d.rootChung, { pos: P[r.pos] })); });
      var oth = {}; w.rootClash.forEach(function (r) { r.other.forEach(function (n) { oth[n] = 1; }); }); var on = Object.keys(oth);
      if (on.length) out.push(fill(d.rootOther, { names: on.slice(0, 3).join('·') }));
    }
    return out.length ? '<ul class="dp-ul">' + out.map(function (t) { return '<li>' + esc(t) + '</li>'; }).join('') + '</ul>' : '';
  }
  function fitLine(B, w) {
    var d = DD().fit, st = B.A.strength, zone = st.zone, help = Math.round(st.help), drain = w.group >= 1 && w.group <= 3;
    var k = /신약|태약|극약/.test(zone) ? (drain ? 'weakDrain' : 'weakHelp') : /신강|태강|극왕/.test(zone) ? (drain ? 'strongDrain' : 'strongHelp') : 'even';
    return fill(d[k], { zone: zone, help: help });
  }
  function evidence(w, use) {
    var keep = (w.reasons || []).filter(function (t) {
      if (/병존|간여지동/.test(t)) return use.overlap;
      if (/투간|통근|뿌리/.test(t)) return use.rootExp;
      if (/^.\s?세력/.test(t)) return use.power;
      return true;
    });
    return keep.length ? '<ul class="dp-ul">' + keep.map(function (t) { return '<li>' + esc(t.replace(/^[○×△·]\s?/, '')) + '</li>'; }).join('') + '</ul>' : '';
  }
  var sec = function (cap, lead, body, mi) { return '<section class="dp-embed dp dp-wp"><div class="cap">' + esc(cap) + '</div>' + (lead ? '<p class="lead">' + lead + '</p>' : '') + (body || '') + (mi ? '<p class="dp-mi">' + esc(mi) + '</p>' : '') + '</section>'; };

  // ── 주제별 블록 ──
  function selfBlock(B, use) {
    var A = B.A, wd = WD(), d = DD();
    if (!B.sure) {
      if (A.status === 'undetermined') return sec('나의 핵심 주무기', esc(fill(d.none.undetermined, { cand: A.candidates.map(function (e) { return EL_K[e]; }).join('·') || '없음' })), '', wd.disclaimer);
      return sec('나의 핵심 주무기', esc(d.none.self), A.hiddenPow.length ? '<p>' + esc('세력과 뿌리는 넉넉한데 천간에 드러나지 않은 힘(' + A.hiddenPow.map(function (e) { return EL_K[e]; }).join('·') + ')은 그 기운이 천간에 오는 운에서 겉으로 올라오기 쉬워요.') + '</p>' : '', wd.disclaimer);
    }
    var ws = pickWeapons(B, use); if (!ws.length) return null; var w = ws[0], g = w.group;
    var lead = esc(J.은('주무기') + ' ') + '<b>' + esc(wTitle(w)) + '</b>' + esc('이에요. ' + wd.el[w.el].strengths.join('·') + ' 쪽이 대표 강점이에요.');
    var body = '';
    if (use.power || use.rootExp || use.overlap) body += '<h4>' + esc('주무기의 형성 근거') + '</h4>' + formationPlain(B, w, use);   // 2판: 실제 글자·자리를 쉬운 문장으로
    if (use.tenGod) body += '<h4>' + esc('강점이 발현되는 방식') + '</h4><p>' + esc(EL_K[w.el] + ' 기운이 ' + w.groupName + '(' + wd.group[g].way + ')으로 드러나요. ' + wd.elGroup[w.el][g] + '이 이 명식의 쓰는 방식이에요.' + (w.tgs.length ? ' 천간에 드러난 ' + J.은(w.tgs.join('·')) + ' ' + w.tgs.map(function (t) { return wd.tg[t]; }).join(', ') + '으로 읽혀요.' : '')) + '</p>';
    if (ws[1]) { var v = ws[1]; body += '<h4>' + esc('보조 주무기와의 결합') + '</h4><p>' + esc('보조 주무기는 ' + wTitle(v) + '(' + v.groupName + ')이에요. ' + wd.group[g].short + '에 ' + J.이(wd.group[v.group].short) + ' 붙어, ' + wd.elGroup[v.el][v.group] + '이 주무기를 옆에서 받쳐 줘요.') + '</p>'; }
    body += '<h4>' + esc('과잉 작용 시 주의점') + '</h4><p>' + esc(wd.el[w.el].overLine + ' ' + d.self.distort[g]) + (/기신|구신/.test(w.role || '') ? esc(' 이 명식에선 주무기가 균형상 이미 많은 쪽(' + w.role + ')이라 더 주의가 필요해요.') : '') + '</p>';
    body += '<h4>' + esc('장기적인 발현 환경') + '</h4><p>' + esc(fitLine(B, w) + ' ' + d.self.grow[g]) + '</p>';   // 강약과 주무기의 관계 + 십성별 키우는 환경
    body += timingBlock(B, 'self', use, w);
    var hk = A.provisional && A.hourKeep, pv = hk ? (hk.keep >= hk.of ? wd.statusNote.provisional : wd.statusNote.provisionalSome.replace('{k}', hk.keep)) + ' ' : '';   // 시간 모름: 종합풀이에만 한 번
    var mi = pv + (A.yong ? (A.yong.isWeapon ? wd.yongRel.same : /기신|구신/.test(w.role || '') ? wd.yongRel.gisin : wd.yongRel.other) + ' ' : '') + fill(d.selfFoot.conf, { c: wd.confidence[w.confidence].replace('판정 근거 ', '') });
    return sec('나의 핵심 주무기', lead, body, mi);
  }
  function wealthBlock(B, use) {
    if (!B.sure) return null; var ws = pickWeapons(B, use); if (!ws.length) return null;
    var w = ws[0], g = w.group, wd = WD(), d = DD(), dEl = B.M.stemEl(B.ch.pillars.day.s), jEl = (dEl + 2) % 5, jf = B.A.facts[jEl];
    var st = jf.cond.force ? 'strong' : jf.cond.exposed ? 'exposed' : jf.roots.length ? 'hidden' : 'weak';
    var lead = esc('경제활동에서 쓰는 주무기는 ') + '<b>' + esc(EL_K[w.el] + ' · ' + wd.el[w.el].title) + '</b>' + esc('이에요. ' + d.wealth.relation[g]);
    var body = '';
    if (use.power) body += '<p>' + esc(fill(d.wealth.jaeLine, { el: EL_K[jEl] + '(' + EL_H[jEl] + ')', pct: jf.pct, state: d.wealth.jaeState[st], w: EL_K[w.el] })) + '</p>';
    // 2판(2026-11-26): 주무기 십성 × 재성 실제 세력(또는 강약) + 엔진이 성립으로 판정한 재물 구조
    var W2 = d.wealth2, zone = B.A.strength.zone, zk = /신약|태약|극약/.test(zone) ? 'weak' : /신강|태강|극왕/.test(zone) ? 'strong' : 'even';
    var jl = jf.pct >= 20 ? 'strong' : jf.pct < 10 ? 'weak' : null, rm = W2.relMod[g];
    var relX = g === 2 ? rm[zk + 'Body'] : jl ? fill(rm[jl], { pct: jf.pct }) : '';
    var pats = ((B.ch.patterns && B.ch.patterns.list) || []).filter(function (p) { return W2.pattern[p.name] && p.status !== '불성립'; }).map(function (p) { return W2.pattern[p.name]; });
    if (relX || pats.length) body += '<p>' + esc([relX].concat(pats.slice(0, 1)).filter(Boolean).join(' ')) + '</p>';
    body += '<h4>' + esc('수익 창출 방식') + '</h4><p>' + esc(d.wealth.mode[g] + '이 이 주무기와 결이 맞아요.') + '</p>';
    body += '<h4>' + esc('사업·직장·투자에서의 강점') + '</h4><p>' + esc(d.wealth.edge[g] + (ws[1] ? ' 보조 주무기 ' + EL_K[ws[1].el] + '(' + ws[1].groupName + ')' + (bat(ws[1].groupName) ? '은' : '는') + ' ' + d.wealth.mode[ws[1].group].split(' — ')[0] + '를 곁가지로 열어 줘요.' : '')) + '</p><ul class="dp-ul">' + W2.arena[g].map(function (t, i) { return '<li><b>' + esc(W2.arenaK[i]) + '</b> — ' + esc(t) + '</li>'; }).join('') + '</ul>';
    body += timingBlock(B, 'wealth', use, w);
    body += '<h4>' + esc('재물활동에서 주의할 점') + '</h4><p>' + esc(d.wealth.caution[g] + ' ' + fill(W2.overTail, { o: wd.el[w.el].over.replace(' · ', '·') })) + '</p>';
    body += '<h4>' + esc('장기적인 재물 전략') + '</h4><p>' + esc(W2.strat[g] + ', ' + W2.stratMod[zk]) + '</p>';
    return sec('경제활동의 주무기', lead, body, '주무기의 정체와 형성 근거는 종합풀이 “나의 타고난 강점과 약점”에서 풀었어요. 수익을 약속하는 풀이가 아니라, 돈을 다룰 때 힘이 실리는 방식을 읽은 거예요.');
  }
  function careerBlock(B, use) {
    if (!B.sure) return null; var ws = pickWeapons(B, use); if (!ws.length) return null;
    var w = ws[0], g = w.group, wd = WD(), d = DD(), G = B.ch.weights.groups.map(function (x) { return Math.round(x * 10) / 10; });
    var lead = esc('직업에서 쓰는 주무기는 ') + '<b>' + esc(EL_K[w.el] + ' · ' + w.groupName + ' — ' + d.career.type[g]) + '</b>' + esc('이에요.');
    var body = '<h4>' + esc('업무 수행 방식') + '</h4><p>' + esc(d.career.how[g]) + '</p>';
    if (use.tenGod) {
      var rich = [3, 1, 2].filter(function (k) { return k !== g && G[k] >= 20; });
      body += '<h4>' + esc('주무기와 직업 십성의 결합') + '</h4><p>' + esc(fill(d.career.mixLine, { g3: G[3], g1: G[1], g2: G[2] }) + ' ' + (rich.length ? d.career.mixHint[rich[0]] : d.career.mixHint.none)) + '</p>';
    }
    body += '<h4>' + esc('조직과 협업에서') + '</h4><p>' + esc(d.career.lead[g]) + '</p>';
    body += timingBlock(B, 'career', use, w);
    body += '<h4>' + esc('경력 발전 방향') + '</h4><p>' + esc(d.career.move[g] + ' ' + d.career.over[g]) + '</p>';
    return sec('직업적 주무기', lead, body, '직업은 주무기 하나로 정하지 않아요. 이 장 위쪽 직업 분석과 함께 보세요.');
  }
  function loveBlock(B, use) {
    if (!B.sure) return null; var ws = pickWeapons(B, use); if (!ws.length) return null;
    var w = ws[0], g = w.group, d = DD(), M = B.M, ch = B.ch, dEl = M.stemEl(ch.pillars.day.s), male = (ch.gender || ch.input && ch.input.gender) !== 'F';
    var sgEl = (dEl + (male ? 2 : 3)) % 5, sTg = M.tenGod(ch.pillars.day.s, M.mainHidden(ch.pillars.day.b));
    var lead = esc(d.love.show[g]);
    var body = '<h4>' + esc('애정 표현과 의사소통') + '</h4><p>' + esc(d.love.talk[g]) + '</p>';
    body += '<h4>' + esc('상대방과의 상호작용') + '</h4><p>' + esc(d.partnerBy[g]) + '</p>';   // 내 주무기 십성별로 맞물리는 상대·부딪히는 지점
    if (use.tenGod) body += '<p>' + esc(fill(d.love.spouseLine, { tg: J.이(sTg), sg: (male ? '재성' : '관성') + ' ' + EL_K[sgEl], pct: B.A.facts[sgEl].pct })) + '</p>';
    body += '<h4>' + esc('관계에서 주의할 성향') + '</h4><p>' + esc(d.love.over[g]) + '</p>';
    body += timingBlock(B, 'love', use, w);
    return sec('관계에서의 주무기 · ' + EL_K[w.el] + '(' + w.groupName + ')', lead, body, '인연의 시기와 상대는 배우자 자리·재성·관성·합충을 함께 보는 이 장의 다른 풀이를 기준으로 하세요.');
  }
  function remedyBlock(B, use) {
    if (!B.sure) return null; var ws = pickWeapons(B, use); if (!ws.length) return null;
    var w = ws[0], g = w.group, d = DD(), A = B.A, dEl = B.M.stemEl(B.ch.pillars.day.s);
    var body = '<h4>' + esc('주무기 강화 루틴') + '</h4><ul class="dp-ul">' + d.remedy.grow[g].map(function (t) { return '<li>' + esc(t) + '</li>'; }).join('') + '</ul>';
    if (ws[1]) body += '<h4>' + esc('보조 주무기 활용') + '</h4><p>' + esc('주무기가 막힐 땐 보조 주무기 ' + EL_K[ws[1].el] + '(' + ws[1].groupName + ') 쪽 루틴 — “' + d.remedy.grow[ws[1].group][0] + '” — 으로 우회하세요.') + '</p>';
    body += '<h4>' + esc('과잉 성향 조절') + '</h4><p>' + esc(d.remedy.calm[g] + '을(를) 하나 정해 두세요.' + (/기신|구신/.test(w.role || '') ? ' 주무기가 이 명식에서 이미 많은 힘(' + w.role + ')이라 조절 규칙이 특히 중요해요.' : '')) + '</p>';
    if (A.yong && use.tenGod) { var yg = (A.yong.el - dEl + 5) % 5; if (yg !== g) body += '<h4>' + esc('부족한 기능 보완') + '</h4><p>' + esc(d.remedy.lack[yg] + ' (균형에 필요한 기운: ' + EL_K[A.yong.el] + ' · ' + GN[yg] + ')') + '</p>'; }
    body += timingBlock(B, 'remedy', use, w);
    return sec('주무기로 운을 쓰는 법', esc('색이나 물건보다 먼저, 주무기 ') + '<b>' + esc(EL_K[w.el] + '(' + w.groupName + ')') + '</b>' + esc('을(를) 생활에서 다루는 습관이 개운의 바탕이에요.'), body, '실천 항목은 예시예요. 내 생활에 맞는 것 하나만 골라 4주 해 보는 걸 권해요.');
  }
  // ── 발현 그래프 블록(기존 점수 막대와 다른 모양: 단계 이름 눈금의 선 + 흐름 등급 띠, 점수 숫자 없음) ──
  var EC = ['#4FB477', '#E5664F', '#D2A24C', '#B8C0CF', '#5B8DEF'], FAV_C = { good: '#5FBF9A', ok: 'rgba(255,255,255,.28)', care: '#FF9A3C' };
  var LV_Y = { strong: 4, on: 3, shaky: 3, sup: 2, quiet: 1, trim: 0, hit: 0 };
  function graphRows(B, scope) {
    var tl = B.tl, M = B.M, ch = B.ch; if (!tl) return null;
    if (scope === 'daeun') return { rows: tl.daeun, labs: tl.daeun.map(function (r) { return r.startAge + '세'; }), when: tl.daeun.map(function (r) { return r.startAge + '세 대운(' + r.startYear + '~)'; }), nowIdx: curIdx(tl.daeun, B.now) };
    if (scope === 'seun') { var src = M.seunRange(ch, B.nowY, B.nowY + 9) || []; tl.seun.forEach(function (r, i) { if (r) r.src = src[i]; }); }
    if (scope === 'seun') return { rows: tl.seun, labs: tl.seun.map(function (r) { return "'" + String(r.year).slice(2); }), when: tl.seun.map(function (r) { return r.year + '년'; }), nowIdx: tl.seun.findIndex(function (r) { return r.year === B.nowY; }) };
    var all = [B.nowY, B.nowY + 1].reduce(function (a, y) { return a.concat((M.wolun(ch, y) || []).map(function (x) { var r = prim(W().luck(M, ch, x, 'wolun')); if (r) { var k = new Date(x.startMs + 9 * 3600e3); r.src = x; r.startMs = x.startMs; r.month = k.getUTCMonth() + 1; r.y = k.getUTCFullYear(); } return r; })); }, []);
    var ci = Math.max(0, curIdx(all, B.now)), rows = all.slice(ci, ci + 12);
    return { rows: rows, labs: rows.map(function (r) { return r.month + '월'; }), when: rows.map(function (r) { return r.y + '년 ' + r.month + '월'; }), nowIdx: 0 };
  }
  function svgChart(G, use) {
    var n = G.rows.length, CW = 44, LM = 62, top = 12, step = 15, H = use.favor ? 122 : 104, yOf = function (y) { return top + (4 - y) * step; }, wd = LM + n * CW, pts = [], dots = '', fav = '', xl = '';
    G.rows.forEach(function (r, i) {
      var a = r && r.best; if (!a) return; var x = LM + i * CW + CW / 2, y = yOf(LV_Y[a.level]), col = EC[Math.floor((r.s == null ? 0 : r.s) / 2)], hollow = a.level === 'shaky' || a.level === 'trim';
      pts.push(x + ',' + y);
      dots += '<circle cx="' + x + '" cy="' + y + '" r="' + (i === G.nowIdx ? 6 : 4.5) + '" fill="' + (hollow ? '#0d1122' : col) + '" stroke="' + col + '" stroke-width="2"' + (a.level === 'shaky' ? ' stroke-dasharray="2 2"' : '') + '><title>' + esc(G.when[i] + ' ' + r.gz + ' · ' + a.levelK + (r.favor ? ' · 흐름 ' + r.favor.n : '')) + '</title></circle>';
      if (use.favor && r.favor) fav += '<rect x="' + (x - CW / 2 + 5) + '" y="' + (yOf(0) + 16) + '" width="' + (CW - 10) + '" height="6" rx="3" fill="' + FAV_C[r.favor.k] + '"/>';
      xl += '<text x="' + x + '" y="' + (H - 3) + '" text-anchor="middle" font-size="10" fill="' + (i === G.nowIdx ? '#F3E3B5' : 'rgba(255,255,255,.55)') + '"' + (i === G.nowIdx ? ' font-weight="700"' : '') + '>' + esc(G.labs[i]) + '</text>';
    });
    var grid = [[4, '강하게 켜짐'], [3, '켜짐'], [2, '받쳐 줌'], [1, '조용함'], [0, '눌림·정리']].map(function (g) { var y = yOf(g[0]); return '<line x1="' + LM + '" x2="' + wd + '" y1="' + y + '" y2="' + y + '" stroke="rgba(255,255,255,.08)"/><text x="' + (LM - 5) + '" y="' + (y + 3) + '" text-anchor="end" font-size="9" fill="rgba(255,255,255,.5)">' + g[1] + '</text>'; }).join('');
    var favL = use.favor ? '<text x="' + (LM - 5) + '" y="' + (yOf(0) + 22) + '" text-anchor="end" font-size="9" fill="rgba(255,255,255,.5)">흐름 등급</text>' : '';
    return '<div style="overflow-x:auto;margin:8px 0"><svg viewBox="0 0 ' + wd + ' ' + H + '" style="display:block;width:100%;min-width:' + Math.round(wd * 0.8) + 'px;max-width:' + Math.round(wd * 1.35) + 'px" role="img" aria-label="주무기 활성도 단계 그래프">' + grid + favL + fav + '<polyline points="' + pts.join(' ') + '" fill="none" stroke="rgba(243,227,181,.75)" stroke-width="2"/>' + dots + xl + '</svg></div>';
  }
  function graphBlock(B, topic, scope, use) {
    if (!B.sure || !B.tl) return null; var ws = pickWeapons(B, use); if (!ws.length || !use.activation) return null;
    var G = graphRows(B, scope); if (!G || G.rows.filter(function (r) { return r && r.best; }).length < 3) return null;
    // 띠(유리도): 재물·인연·커리어는 그 주제의 기존 지수 등급(이 장 위 시기 그래프와 같은 엔진 지수), 없으면 전체 흐름 등급. 활성도와 합치지 않는다
    var LGm = root.MantraLuckGrade, lvl = scope === 'wolun' ? 'wolun' : 'seun', dk = { wealth: 'wealth', love: 'love', career: 'career' }[topic], favName = '그 시기 전체 흐름 등급';
    if (dk && scope !== 'daeun' && LGm && LGm.metric && B.M.evaluateDomainLuck) {
      var used = 0; G.rows = G.rows.map(function (r) { if (!r || !r.src) return r; var dd = null; try { dd = B.M.evaluateDomainLuck(B.ch, r.src, lvl); } catch (e) { dd = null; } var o = dd && dd[dk]; if (!o || !Number.isFinite(o.score)) return r; used++; var gg = LGm.metric(dk, o.score), c = {}; for (var k in r) c[k] = r[k]; c.favor = { k: gg.k, n: gg.n }; return c; });
      if (used) favName = { wealth: '재물 지수 등급', love: '인연 지수 등급', career: '직업 지수 등급' }[dk] + '(이 장 위 시기 그래프와 같은 엔진 지수)';
    }
    var d = DD(), g = d.graph, w = ws[0], strong = WD().el[w.el].strengths.slice(0, 2).join('·');
    var from = scope === 'daeun' ? Math.max(0, G.nowIdx) : 0;   // 요약은 지금부터 앞쪽만(그래프는 평생 전체)
    var pick = function (f) { return G.rows.map(function (r, i) { return i >= from && f(r) ? G.when[i] : null; }).filter(Boolean); };
    var isOn = function (r) { return r && r.best && /strong|on|shaky/.test(r.best.level); };
    var onL = pick(isOn), both = use.favor ? pick(function (r) { return isOn(r) && r.favor && r.favor.k === 'good'; }) : [], over = use.favor ? pick(function (r) { return isOn(r) && r.favor && r.favor.k === 'care'; }) : [], low = pick(function (r) { return r && r.best && /hit|trim/.test(r.best.level); });
    var lim = function (a) { return a.slice(0, 4).join(', ') + (a.length > 4 ? ' 외 ' + (a.length - 4) + '구간' : ''); };
    var T = g[topic] || g.self, lines = [];
    var allOver = onL.length && over.length === onL.length && !both.length;   // 켜지는 구간이 모두 조심이면 같은 목록을 두 번 말하지 않는다
    lines.push(allOver ? fill(T.allOver, { list: lim(onL) }) : onL.length ? fill(T.on, { list: lim(onL), s: strong }) : fill(T.none, { s: strong }));
    if (both.length) lines.push(fill(T.both, { list: lim(both) }));
    if (over.length && !allOver) lines.push(fill(T.over, { list: lim(over) }));
    if (low.length) lines.push(fill(T.low, { list: lim(low) }));
    var leg = '선 = 주무기 활성도(' + EL_K[w.el] + ' · ' + WD().el[w.el].title + ')' + (use.favor ? ' · 아래 띠 = ' + favName + '(초록 좋음·회색 무난·주황 조심)' : '') + ' · 점 색 = 그 시기 천간의 오행 · 두 값은 합치지 않아요';
    return sec(fill(g.cap[scope], { t: TOPIC_K[topic] }), esc(fill(T.lead[scope] || T.lead.seun, { s: strong })), svgChart(G, use) + '<p class="dp-mi">' + esc(leg) + '</p><ul class="dp-ul">' + lines.map(function (t) { return '<li>' + esc(t) + '</li>'; }).join('') + '</ul>', '');
  }
  var BUILD = { self: selfBlock, wealth: wealthBlock, career: careerBlock, love: loveBlock, remedy: remedyBlock };

  function has(custom) { return /^wp:/.test(String(custom || '')); }
  function render(part, H, id) {
    if (!API.on) return null;
    var cid = String(part.custom).slice(3), row = cfg.rows[cid] || cfg.rows[id]; if (!row || !row.on || BLOCKED.test(cid)) return null;
    var B = base(H); if (!B) return null;
    var html = null; try { html = row.view === 'graph' ? graphBlock(B, row.topic, row.scope, row.use) : BUILD[row.topic](B, row.use); } catch (e) { html = null; }
    if (html && BANNED.test(html.replace(/<[^>]+>/g, ' '))) return null;
    return html;
  }
  // 관리자 미리보기·검사용: 장 ID 없이 주제·설정으로 바로 그린다
  // 관리자 미리보기: 설정 줄 하나(형태·범위 포함)로 그린다
  function previewRow(H, row) { var B = base(H); if (!B || !row) return null; var c = sanitize({ rows: { timeline_x_preview: row } }), r = c && c.rows.timeline_x_preview; if (!r) return null; return r.view === 'graph' ? graphBlock(B, r.topic, r.scope, r.use) : BUILD[r.topic](B, r.use); }
  function preview(H, topic, use) { var B = base(H); if (!B || !BUILD[topic]) return null; return BUILD[topic](B, u(use || DEFAULT_ROWS[Object.keys(DEFAULT_ROWS).filter(function (k) { return DEFAULT_ROWS[k].topic === topic && DEFAULT_ROWS[k].view !== 'graph'; })[0]].use)); }

  // ── 공개 스위치·설정 불러오기(aptitude-chapters.js 와 같은 방식) ──
  function localFlag() {
    try {
      var f = root.MANTRA_FLAGS; if (f && f.weaponChapters === true) return true;
      var h = root.location && root.location.hostname || '';
      if (/^(localhost|127\.0\.0\.1)$/.test(h) || /^[a-z0-9][a-z0-9-]*\.mantramanse\.pages\.dev$/i.test(h)) return /[?&]mantraFlags=[A-Za-z,]*\bweaponChapters\b/.test(root.location.search || '');
    } catch (e) { }
    return false;
  }
  var readyP = null;
  function getJson(url) { return root.fetch(url, { cache: 'no-store' }).then(function (r) { return r.ok ? r.json() : null; }).catch(function () { return null; }); }
  function loadDeps() {
    if (W() && WD()) return Promise.resolve();
    var DOC = root.document; if (!DOC) return Promise.resolve();
    return ['/weapon-data.js?v=20261126-hr', '/weapon.js?v=20261126-hr'].reduce(function (p, src) { return p.then(function () { return new Promise(function (ok) { var s = DOC.createElement('script'); s.src = src; s.async = false; s.onload = ok; s.onerror = ok; DOC.head.appendChild(s); }); }); }, Promise.resolve());
  }
  function ready() {
    if (readyP) return readyP;
    if (!root.fetch) return (readyP = Promise.resolve(localFlag()));
    var flagP = localFlag() ? Promise.resolve(true) : (root.MantraLastGood ? Promise.resolve(root.MantraLastGood.json('/api/luck-flags', 5000, function (d) { return !!(d && typeof d === 'object' && Number.isInteger(d.version)); })) : getJson('/api/luck-flags')).then(function (d) { return d === true || !!(d && d.weaponChapters === true); }).catch(function () { return false; });
    return (readyP = flagP.then(function (on) {
      if (!on) return false;
      return Promise.all([loadDeps(), getJson('/api/weapon-links').then(function (d) { if (d && d.rows) setConfig(d); })]).then(function () { API.on = true; inject(); return true; });
    }));
  }
  function readyWithin(ms) { return Promise.race([ready(), new Promise(function (ok) { setTimeout(function () { ok(API.on); }, ms || 2500); })]); }
  if (root.document && root.fetch) { try { ready(); } catch (e) { } }
  if (R.ReadingFeature) inject();

  var API = { VERSION: VERSION, on: false, TOPICS: TOPICS, TOPIC_K: TOPIC_K, USE_KEYS: USE_KEYS, USE_K: USE_K, DEFAULT_ROWS: DEFAULT_ROWS, BLOCKED: BLOCKED, BANNED: BANNED,
    has: has, render: render, preview: preview, previewRow: previewRow, SCOPES: SCOPES, setConfig: setConfig, rows: rowsOf, inject: inject, sanitize: sanitize, ready: ready, readyWithin: readyWithin, localFlag: localFlag };
  R.WeaponChapters = API;
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
})(typeof window !== 'undefined' ? window : globalThis);
