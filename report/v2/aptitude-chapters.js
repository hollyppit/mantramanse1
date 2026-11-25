/* 특기·적성 장(2026-11-25) — 만세력 '특기·적성' 탭과 같은 계산으로 운명의 타임라인에 장 3개와 연결 블록 2개를 끼운다.
   · 종합풀이 '내 손이 먼저 가는 일 — 특기와 끌리는 활동'(timeline_self_talent): '타고난 강점과 맞는 일'(timeline_self_26) 바로 뒤
   · 커리어운 심화 '내 특기가 일에서 무기가 되는 방식'(timeline_career_talent): '내 재능의 값'(timeline_career_02) 바로 뒤
   · 커리어운 심화 '일 밖에서 날을 세우는 법 — 재충전과 사이드 프로젝트'(timeline_career_recharge): '앞으로 10년 일의 흐름 그래프'(timeline_career_14) 바로 뒤
   · 연결 블록: '일하는 방식 성향'(timeline_career_01)에 짧은 요약(reading-feature.js custom:'apt'). 'rest' 블록은 재충전 장이 '커리어 날을 세우는 습관' 바로 앞에 오고 그 장은 블록 목록(SPEC)에 없어 붙이지 않는다
   · 인연(2026-11-25): 궁합 장 '그 사람과 나의 궁합'(love-compat.js) 결과에 '두 사람이 함께 하면 좋은 활동'(pairHtml) · 종합풀이 '인연이 열리는 곳 · 순위'(timeline_self_27) 끝 '활동으로 넓히는 만남 자리'(meet)
   · 재물운 심화 블록(2026-11-25): '이렇게 벌면 편해요'(timeline_wealth_02) 끝 '특기가 돈이 되는 구조'(20세 미만 제외)·'돈이 새는 자리 점검'(timeline_wealth_03) 끝 '취미에 나가는 돈 점검'
   · 표시 전용: /aptitude.js(MantraAptitude.build) · engine careerProfile 결과만 읽는다. AI·DB 문안·새 점수 없음. 문안은 aptitude-chapters-data.js
   · 20세 미만은 진로·동아리 말로 바꾼다. 실력·수입·건강을 단정하지 않는다(tests/aptitude-chapters-sim.cjs 금지 표현 검사).
   · 공개 스위치: /api/luck-flags aptChapters(기본 꺼짐). 로컬·미리보기 주소에서는 ?mantraFlags=aptChapters
   · 2026-11-26 세분화 반영: 특기 결(typeLine·WORK_TYPE)·두 번째 적성의 앞선 세부 분야·새 두 축(axisPick)·결 활동(final.typeActs), 새 세부 분야 12개는 재충전·부업·비용·만남·함께 할 활동 후보에
   · 같은 방식의 앞선 장: flow-chapters.js · health-chapters.js */
(function (root) {
  'use strict';
  var R = root.ReportV2 = root.ReportV2 || {};
  var VERSION = 'aptitude-chapters-20261126-1';   // 2026-11-26 특기 결·세부 분야 8·활동 방식 7축 반영
  var IDS = { self: 'timeline_self_talent', work: 'timeline_career_talent', rest: 'timeline_career_recharge' };
  var TITLES = { timeline_self_talent: '내 손이 먼저 가는 일 — 특기와 끌리는 활동', timeline_career_talent: '내 특기가 일에서 무기가 되는 방식', timeline_career_recharge: '일 밖에서 날을 세우는 법 — 재충전과 사이드 프로젝트' };
  var TOPIC = { timeline_self_talent: 'self', timeline_career_talent: 'career', timeline_career_recharge: 'career' };
  var BANNED = /반드시|무조건|성공합니다|성공할 거예요|대박|보장|확정|틀림없|천재|재능이 뛰어|실력이 뛰어|돈을 법니다|수익이 납니다|월 \d+만|건강해집니다|부상|진단/;
  var DD = function () { return R.AptChaptersData || (typeof require === 'function' ? require('./aptitude-chapters-data.js') : null); };
  var APT = function () { return root.MantraAptitude; };

  // 조사(flow-chapters.js 와 같은 규칙): 괄호 앞 낱말 기준
  var bare = function (w) { var t = String(w).replace(/['"]+$/, ''); while (/\)\s*$/.test(t)) { var k = t.lastIndexOf('('); if (k < 0) break; t = t.slice(0, k); } return t; };
  var bat = function (w) { var t = bare(w).replace(/[^가-힣]+$/, ''), c = t.charCodeAt(t.length - 1) - 0xAC00; return c >= 0 && c <= 11171 && c % 28 !== 0; };
  var rieul = function (w) { var t = bare(w).replace(/[^가-힣]+$/, ''), c = t.charCodeAt(t.length - 1) - 0xAC00; return c >= 0 && c % 28 === 8; };
  var J = {
    은: function (w) { return w + (bat(w) ? '은' : '는'); }, 이: function (w) { return w + (bat(w) ? '이' : '가'); }, 을: function (w) { return w + (bat(w) ? '을' : '를'); },
    과: function (w) { return w + (bat(w) ? '과' : '와'); }, 로: function (w) { return w + (bat(w) && !rieul(w) ? '으로' : '로'); }, 예요: function (w) { return w + (bat(w) ? '이에요' : '예요'); },
  };
  var clean = function (t) { return String(t || '').replace(/\s+/g, ' ').replace(/ ([.,])/g, '$1').trim(); };
  var join = function (a) { return a.filter(Boolean).map(clean).join('\n\n'); };
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };

  // ── 공통 재료: 특기·적성 결과 + 직업 적성 결과 ──
  function ctx(M, ch, name) {
    var A = APT(), r = A && A.build(M, ch); if (!r || !r.ok) return null;
    var P = null; try { P = M.careerProfile ? M.careerProfile(ch) : null; } catch (e) { P = null; }
    var nowY = new Date().getFullYear(), by = ch.input && ch.input.year ? +ch.input.year : (ch.pillars && ch.pillars.year && ch.pillars.year.sajuYear) || nowY - 30;
    var bySc = function (a) { return a.filter(function (x) { return x.ok; }).slice().sort(function (x, y) { return (y.score - x.score) || (x.id < y.id ? -1 : 1); }); };
    var subs = {}; Object.keys(r.details).forEach(function (fid) { r.details[fid].subs.forEach(function (s) { if (s.ok) subs[s.id] = { sub: s, field: r.details[fid] }; }); });
    var nm = String(name || '').trim().replace(/님$/, '');
    return { M: M, ch: ch, r: r, P: P, ts: bySc(r.talents), fs: bySc(r.fields), subs: subs, kid: nowY - by < 20, me: nm ? nm + '님' : '당신', nm: nm };
  }
  // 일하는 방식 축: value 는 왼쪽(독립·안정·창작·사람·실행·단기성과) 몫
  function poles(C) {
    if (!C.P || !C.P.workStyle) return [];
    return (C.M.CAREER_AXIS_KEYS || Object.keys(C.P.workStyle)).map(function (k) { var x = C.P.workStyle[k]; if (!x) return null; var L = x.value >= 50; return { key: k, side: L ? 'L' : 'R', name: L ? x.left : x.right, other: L ? x.right : x.left, v: L ? x.value : x.other, lean: Math.abs(x.value - 50) }; })
      .filter(Boolean).sort(function (a, b) { return (b.lean - a.lean) || (a.key < b.key ? -1 : 1); });
  }
  function pickSub(C, ids, used, avoidField) { var c = ids.map(function (id) { return C.subs[id]; }).filter(function (x) { return x && !(used && used[x.sub.id]) && !(avoidField && x.field.id === avoidField); }).sort(function (a, b) { return (b.sub.score - a.sub.score) || (a.sub.id < b.sub.id ? -1 : 1); }); return c[0] || null; }
  // 특기 결(2026-11-26): 1위 결 · 섞임이면 두 결
  function typeOf(t) { if (!t || !t.types) return null; var T = t.types, top = T.list.filter(function (x) { return x.id === T.top; })[0], sec = T.mix ? T.list.filter(function (x) { return x.id === T.second; })[0] : null; return top ? { T: T, top: top, sec: sec } : null; }
  function typeLine(t) { var y = typeOf(t); if (!y) return ''; return y.T.mix ? t.name + ' 안에서도 결이 나뉘는데, ' + y.T.text : t.name + ' 안에서도 가장 앞선 결은 ' + y.top.name + '(' + y.top.levelK + ')이에요. ' + y.top.txt; }
  // 새 두 축(실내↔야외·짧고 굵게↔길고 꾸준히) 중 기운 것만
  function axisPick(C) { return C.r.sport.axes.filter(function (a) { return (a.id === 'in_out' || a.id === 'short_long') && a.ok && a.side !== 'bal'; }).map(function (a) { return a.text; }); }
  function trait(C, id) { var t = C.r.sport.traits.filter(function (x) { return x.id === id; })[0]; return t && t.ok ? t : null; }

  function chapter(id, core, vd) {
    if (core.why) { var wp = String(core.why).split('\n\n'); wp[0] = '이 사주: ' + wp[0]; core.why = wp.join('\n\n'); }
    return {
      id: id, base: id, title: TITLES[id], kind: 'life', editorialTopicId: TOPIC[id], editorialContractId: id, aiEnabled: false, readingSupplementary: true, readingDeferred: false,
      readingProvider: 'local-engine-aptitude', aptChapter: true, readingCore: core, readingParagraphs: Object.keys(core).filter(function (k) { return core[k]; }).map(function (k) { return { role: k, text: core[k] }; }),
      readingVisualData: vd || {}, scenes: R.ReadingFlow ? R.ReadingFlow.scenes(core, id) : [],
    };
  }

  // ───────── 1. 종합풀이 · 내 손이 먼저 가는 일 ─────────
  function selfTalent(M, ch, name) {
    var C = ctx(M, ch, name); if (!C || !C.ts[0] || !C.fs[0]) return null;
    var t1 = C.ts[0], t2 = C.ts[1], f1 = C.fs[0], f2 = C.fs[1], d1 = C.r.details[f1.id], f = C.r.final;
    var top3 = d1 ? d1.subs.filter(function (s) { return s.ok; }).sort(function (a, b) { return a.rank - b.rank; }).slice(0, 3) : [];
    var links = (f1.links || []).map(function (l) { return l.name + '(' + l.levelK + ')'; }).join('·');
    var core = {
      title: C.me + '은 ' + J.로(t1.name) + ' 힘을 쓰고, ' + f1.name + ' 쪽 활동에 손이 먼저 가기 쉬워요.',
      reality: join([
        '특기는 “이렇게 힘을 써요”, 적성은 “이런 분야에 끌려요”예요. ' + C.me + '에게 먼저 보이는 특기는 ' + t1.name + '(' + t1.levelK + ')' + (t2 ? '과 ' + t2.name + '(' + t2.levelK + ')' : '') + '이에요. ' + t1.interp,
        t1.link,
        typeLine(t1),
        f1.name + '(' + f1.levelK + ')' + (f2 ? '과 ' + f2.name + '(' + f2.levelK + ')' : '') + ' 쪽이 먼저 끌리는 분야예요. ' + f1.interp + (links ? ' 이 분야는 ' + links + ' 특기와 이어져 있어요.' : ''),
      ]),
      strength: join([
        top3.length ? f1.name + ' 안에서 먼저 볼 만한 세부 분야는 ' + top3.map(function (s) { return s.name + '(' + s.recK + ')'; }).join(', ') + '이에요.' : '',
      ].concat(top3.slice(0, 2).map(function (s) { return s.name + ' — ' + s.why + ' 예를 들면 ' + s.ex.join('·') + '처럼요.'; })).concat([
        f2 && f2.topSubs && f2.topSubs.length ? '두 번째로 끌리는 ' + f2.name + ' 쪽에서는 ' + (f2.topSubs[1] ? J.과(f2.topSubs[0].name) + ' ' + f2.topSubs[1].name : f2.topSubs[0].name) + ' 쪽이 앞서요.' : '',
        axisPick(C).length ? DD().AXIS_PICK + axisPick(C).join(' ') : '',
      ])),
      risk: join([
        f.complement ? '곁들이면 좋은 쪽은 ' + f.complement.name + '(' + f.complement.levelK + ')이에요. ' + f.complement.text : '',
        t1.care,
      ]),
      reinforce: join([
        (f.typeActs || []).map(function (a) { return DD().TYPE_ACT.replace('{talent}', a.talentName).replace('{type}', a.typeName).replace('{acts}', a.acts.join('·')); }).join(' '),
        f.longTerm ? '오래 붙잡고 다듬어 볼 활동으로는 ' + J.이(f.longTerm.name) + ' 잘 맞아요(' + f.longTerm.from + '). ' + f.longTerm.why : '',
        C.kid ? '지금 나이에는 하나를 깊게 파기보다 여러 활동을 맛보며 손이 가는 쪽을 찾는 시기예요.' : '',
      ]),
      practice: f.activities[0] ? '이번 달에 ' + J.을(f.activities[0].name) + ' 한 번 체험해 보세요(' + f.activities[0].recK + '). ' + (top3[0] && top3[0].consider[0] ? top3[0].consider[0] : '') : '',
      why: join([
        '대표 특기(' + t1.name + ') 근거: ' + t1.basis.map(function (b) { return b.label; }).join(' · ') + '.',
        '대표 적성(' + f1.name + ') 근거: ' + f1.basis.map(function (b) { return b.label; }).join(' · ') + '.',
        '특기 5영역: ' + C.r.talents.map(function (t) { return t.name + ' ' + (t.levelK || '근거 부족'); }).join(' · ') + '.',
        typeOf(t1) ? t1.name + ' 결 순서: ' + t1.types.list.filter(function (x) { return x.ok; }).sort(function (a, b) { return a.rank - b.rank; }).map(function (x) { return x.name + '(' + x.basis.map(function (b) { return b.label; }).slice(0, 2).join(', ') + ')'; }).join(' > ') + '.' : '',
        '적성 6분야: ' + C.r.fields.map(function (x) { return x.name + ' ' + (x.levelK || '근거 부족'); }).join(' · ') + '.',
        '만세력 특기·적성 탭과 같은 계산이에요. ' + DD().NOTE,
      ]),
    };
    return chapter(IDS.self, core, { name: C.nm, talent: t1.id, type: t1.types ? t1.types.top : null, field: f1.id });
  }

  // ───────── 2. 커리어 · 내 특기가 일에서 무기가 되는 방식 ─────────
  function workTalent(M, ch, name) {
    var C = ctx(M, ch, name), D = DD(); if (!C || !C.ts[0]) return null;
    var ts = C.ts.slice(0, C.ts[2] && C.ts[2].level !== 'lo' ? 3 : 2), t1 = ts[0], W1 = D.WORK[t1.id];
    var top = C.P && C.P.top ? C.P.top.slice(0, 3) : [];
    var tail = function (tid, c) { var g = D.STAGE_TYPE[c.category] || 'make'; return D.COMBO_TAIL[tid][g]; };
    var seenG = {};   // 같은 무대 유형이 다시 나오면 꼬리 문장은 한 번만
    var combo = top.map(function (c) { var g = D.STAGE_TYPE[c.category] || 'make', tl = seenG[g] ? '' : tail(t1.id, c); seenG[g] = 1; return t1.name + ' × ' + c.name + ' — ' + J.은(c.name) + ' ' + (D.STAGE[c.category] || '나에게 맞는 무대') + '예요. ' + tl; });
    var t2 = ts[1], combo2 = t2 && top[0] ? t2.name + ' × ' + top[0].name + ' — 두 번째 무기인 ' + J.이(D.WORK[t2.id].weapon) + ' 같은 무대를 받쳐 줘요. ' + tail(t2.id, top[0]) : '';
    // 쉬는 쪽 활동 방식과 일하는 방식이 같은 방향인지
    var ps = poles(C), pmap = {}; ps.forEach(function (p) { pmap[p.key] = p; });
    var axes = {}; C.r.sport.axes.forEach(function (a) { axes[a.id] = a; });
    var match = D.MATCH.map(function (m) {
      var a = axes[m.apt], p = pmap[m.work]; if (!a || !a.ok || a.side === 'bal' || !p || p.lean < 8) return '';
      var aptSide = a.side === 'L' ? a.L : a.R, same = (a.side === 'L') === (p.side === 'L');
      return same ? m.same : m.cross.replace('{work}', p.name).replace('{apt}', aptSide);
    }).filter(Boolean).slice(0, 2);
    var role = function (t) { var w = D.WORK[t.id], y = typeOf(t), wt = y && D.WORK_TYPE[y.top.id]; return (wt ? [C.kid ? wt.kidRole : wt.role] : []).concat(C.kid ? w.kidRoles : w.roles).join(', '); };
    function typeWork(t) { var y = typeOf(t), wt = y && D.WORK_TYPE[y.top.id]; if (!wt) return ''; return '그중에서도 ' + y.top.name + ' 결이 앞서요' + (y.sec ? '(' + y.sec.name + ' 결도 비슷)' : '') + '. ' + (C.kid ? wt.kid : wt.work); }
    var core = {
      title: C.kid ? C.me + '이 진로에서 쓸 수 있는 무기는 ' + J.예요(W1.weapon) + '.' : C.me + '의 일하는 무기는 ' + J.예요(W1.weapon) + '.',
      reality: join([
        C.kid ? '아직 직업을 정할 나이는 아니라, 나중에 일할 때 어떤 힘이 무기가 되는지 미리 보는 장이에요. 진로·전공을 고를 때 참고로 보세요.' : '',
        C.me + '에게 먼저 보이는 특기는 ' + ts.map(function (t) { return t.name + '(' + t.levelK + ')'; }).join(', ') + '이에요. ' + W1.use,
        typeWork(t1),
        t2 ? t2.name + ' 쪽에서는 — ' + D.WORK[t2.id].use + (typeWork(t2) ? ' ' + typeWork(t2) : '') : '',
      ].concat(top.length ? ['직업 적성에서 강점 활용 분야로 나온 ' + J.과(top.map(function (c) { return c.name + '(조화도 ' + c.score + ')'; }).join(', ')) + ' 특기를 엮으면 이렇게 읽혀요.'].concat(combo).concat([combo2]) : [])),
      strength: join(ts.map(function (t) { var w = D.WORK[t.id]; return t.name + ' — 맞는 역할: ' + role(t) + '. ' + (C.kid ? w.kidProof : w.proof); })),
      risk: join(ts.slice(0, 2).map(function (t) { return t.name + ' — ' + D.WORK[t.id].trap; }).concat(match)),
      reinforce: join(ts.map(function (t) { return t.name + ' 키우기 — ' + D.WORK[t.id].grow; })),
      practice: C.kid ? '이번 달에 ‘' + D.WORK[t1.id].kidRoles[0] + '’에 한 번 도전해 보고, 끝나면 무엇이 편했고 무엇이 어려웠는지 세 줄로 적어 보세요.'
        : '이번 주에 ' + J.이(W1.weapon) + ' 드러났던 일 하나를 골라, 남에게 보여 줄 수 있는 한 장짜리(무엇을·어떻게·결과)로 정리해 보세요.',
      why: join([
        '대표 특기(' + t1.name + ') 근거: ' + t1.basis.map(function (b) { return b.label; }).join(' · ') + '.',
        '특기 5영역: ' + C.r.talents.map(function (t) { return t.name + ' ' + (t.levelK || '근거 부족'); }).join(' · ') + '.',
        '앞선 특기의 결: ' + ts.map(function (t) { var y = typeOf(t); return y ? t.name + ' — ' + y.top.name + '(' + y.top.basis.map(function (b) { return b.label; }).slice(0, 2).join(', ') + ')' : ''; }).filter(Boolean).join(' · ') + '.',
        top.length ? '직업 강점 활용 분야(엔진 careerProfile): ' + top.map(function (c) { return c.name + ' ' + c.score; }).join(' · ') + '.' : '',
        ps.length ? '일하는 방식(양쪽 합 100%): ' + ps.slice(0, 3).map(function (p) { return p.name + ' ' + p.v + '%'; }).join(' · ') + '.' : '',
        '특기는 만세력 특기·적성 탭, 강점 분야는 커리어 장들과 같은 계산이에요. ' + D.NOTE,
      ]),
    };
    return chapter(IDS.work, core, { name: C.nm, talents: ts.map(function (t) { return t.id; }), types: ts.map(function (t) { return t.types ? t.types.top : null; }), cats: top.map(function (c) { return c.category; }) });
  }

  // ───────── 3. 커리어 · 일 밖에서 날을 세우는 법 ─────────
  function recharge(C) {
    var D = DD(), ps = poles(C).slice(0, 2), used = {}, out = [];
    ps.forEach(function (p) { var rc = D.RECHARGE[p.key] && D.RECHARGE[p.key][p.side]; if (!rc) return; var pk = pickSub(C, rc.ids, used, out[0] && out[0].field.id) || pickSub(C, rc.ids, used); if (!pk) return; used[pk.sub.id] = 1; out.push({ pole: p, why: rc.why, sub: pk.sub, field: pk.field }); });
    return out;
  }
  function restTalent(M, ch, name) {
    var C = ctx(M, ch, name), D = DD(); if (!C) return null;
    var rc = recharge(C); if (!rc.length) return null;
    var ps = poles(C), burden = C.P && C.P.burdenEnvs ? C.P.burdenEnvs.slice(0, 2) : [];
    var ranked = Object.keys(C.subs).map(function (k) { return C.subs[k]; }).filter(function (x) { return D.SIDE[x.sub.id]; }).sort(function (a, b) { return (b.sub.score - a.sub.score) || (a.sub.id < b.sub.id ? -1 : 1); }).slice(0, 2);
    var disc = trait(C, 'discipline'), lv = disc ? disc.level : 'mid';
    var A1 = rc[0].sub.ex[0], B1 = (rc[1] ? rc[1].sub.ex[0] : (C.r.final.activities[0] ? C.r.final.activities[0].name : rc[0].sub.ex[1]));   // 예: 숲 해설 산책 / 볼더링
    var routine = (C.kid ? D.KID_ROUTINE : D.ROUTINE[lv] || D.ROUTINE.mid).replace('{a}를', J.을(A1)).replace('{b}를', J.을(B1)).replace('{a}', A1).replace('{b}', B1);
    var kidWord = function (t) { return C.kid ? String(t).replace(/으로 일하는 만큼/g, '으로 생활하는 만큼').replace(/며 일하는 만큼/g, '며 생활하는 만큼').replace(/일하는 방식/g, '생활 방식') : t; };
    var lead = ps.slice(0, 2).map(function (p) { return p.name + '(' + C.M.careerLevelWord(p.v) + ')'; }).join('·');
    var core = {
      title: C.kid ? C.me + '은 공부 밖에서 ' + J.로(rc[0].sub.name) + ' 기운을 채우기 쉬워요.' : C.me + '은 일 밖에서 ' + J.로(rc[0].sub.name) + ' 날을 세우기 쉬워요.',
      reality: join([
        (C.kid ? '공부하고 생활하는 방식은 ' : '일하는 방식은 ') + lead + ' 쪽으로 기울어 있어요. 쉬는 시간은 같은 쪽을 더 쓰기보다, 덜 쓰는 쪽을 채워 줄 때 회복이 빨라요.',
      ].concat(rc.map(function (x) { return kidWord(x.why); }))),
      strength: join(rc.map(function (x) {
        return x.sub.name + '(' + x.field.name + ' · ' + x.sub.recK + ') — ' + x.sub.ex.join('·') + '. ' + x.sub.why;
      })),
      risk: join(C.kid ? ['시험·과제가 몰리는 시기처럼 같은 일이 반복될 때 쉽게 지칠 수 있어요. 그럴수록 위 활동을 짧게라도 끼워 넣어 리듬을 바꿔 주세요.'] : burden.length ? ['특히 ' + burden.map(function (e) { return e.name; }).join('·') + ' 같은 환경이 겹치는 시기에는 지치기 쉬운 편이에요.'].concat(burden.map(function (e) { return D.REST_ENV[e.env] || ''; })) : []),
      reinforce: join(C.kid ? [ranked.length ? ranked.map(function (x) { return x.sub.name; }).join('·') + ' 쪽은 나중에 진로로도 이어질 수 있는 활동이에요. ' + D.SIDE_KID : ''] :
        ranked.map(function (x) { var s = D.SIDE[x.sub.id]; return x.sub.name + '(' + x.sub.recK + ') — ' + s.path + ' ' + s.step; }).concat(ranked.length ? [D.SIDE_NOTE + ' 처음 드는 비용·반복 수입 같은 돈의 구조는 재물운 심화 ‘이렇게 벌면 편해요’ 장에서 따로 짚어요.'] : [])),
      practice: routine,
      why: join([
        ps.length ? (C.kid ? '생활 방식' : '일하는 방식') + '(엔진 careerProfile, 양쪽 합 100%): ' + ps.map(function (p) { return p.name + ' ' + p.v + '%'; }).join(' · ') + '.' : '',
        '재충전 활동은 기울어진 두 축의 반대쪽 활동 중 이 사주의 세부 분야 점수가 높은 것으로 골랐어요: ' + rc.map(function (x) { return x.sub.name + ' ' + x.sub.recK; }).join(' · ') + '.',
        !C.kid && burden.length ? '부담이 커질 수 있는 환경: ' + burden.map(function (e) { return e.name + ' ' + e.burden; }).join(' · ') + '.' : '',
        D.NOTE,
      ]),
    };
    return chapter(IDS.rest, core, { name: C.nm, recharge: rc.map(function (x) { return x.sub.id; }) });
  }

  function buildAll(M, ch, name) {
    var out = {};
    [['self', selfTalent], ['work', workTalent], ['rest', restTalent]].forEach(function (p) { try { var c = p[1](M, ch, name); if (c) out[IDS[p[0]]] = c; } catch (e) { } });
    return out;
  }
  function idxOf(list, f) { for (var i = 0; i < list.length; i++) if (f(list[i])) return i; return -1; }
  function contract(c) { return c && (c.editorialContractId || c.id) || ''; }
  function add(rep, sd, name, M, ch) {
    if (!rep || !rep.chapters || !M || !ch || !APT()) return rep;
    if (rep.chapters.some(function (c) { return c.aptChapter; })) return rep;
    var made = buildAll(M, ch, name), list = rep.chapters.slice();
    function put(after, id) {
      var c = made[id]; if (!c) return; var i = idxOf(list, function (x) { return contract(x) === after; });
      if (i < 0) { var t = TOPIC[id]; for (var k = list.length - 1; k >= 0; k--) if (list[k].editorialTopicId === t) { i = k; break; } }
      if (i < 0) return;
      c.act = list[i].act; c.placeAfter = list[i].id; list.splice(i + 1, 0, c);
    }
    put('timeline_self_26', IDS.self); put('timeline_career_02', IDS.work); put('timeline_career_14', IDS.rest);
    list.forEach(function (c, j) { c.no = j + 1; });
    API.on = true;
    return Object.assign({}, rep, { chapters: list });
  }

  // ───────── 연결 블록(reading-feature.js custom:'apt') ─────────
  function block(H, kind) {
    if (!API.on || !H || !H.M || !H.ch) return null;
    var C = ctx(H.M, H.ch, ''); if (!C) return null;
    if (kind === 'work') {
      var t = C.ts.slice(0, 2), D = DD(); if (!t.length) return null;
      return '<section class="dp-embed dp dp-apt"><div class="cap">특기로 본 일하는 힘</div><p class="lead">' + esc('일하는 방식 위에, 힘을 쓰는 방식(특기)을 겹쳐 보면 ' + t.map(function (x) { return x.name + '(' + x.levelK + ')'; }).join('·') + ' 쪽이 먼저 보여요. 위의 일하는 방식이 “어떤 환경이 편한가”라면, 특기는 “그 환경에서 무엇으로 힘을 쓰는가”예요 — 한마디로 ' + J.예요(D.WORK[t[0].id].weapon) + '.') + '</p>' +   // 커리어 무기 장 첫 문단(WORK.use)과 겹치지 않게
        '<p class="dp-mi">' + esc('이 특기가 어떤 직업 분야에서 무기가 되는지는 뒤의 “' + TITLES[IDS.work] + '” 장에서 자세히 풀어요.') + '</p></section>';
    }
    if (kind === 'rest') {
      var rc = recharge(C); if (!rc.length) return null;
      return '<section class="dp-embed dp dp-apt"><div class="cap">일 밖에서 기운을 채우는 활동</div><p class="lead">' + esc(rc.map(function (x) { return x.sub.name + '(' + x.sub.ex[0] + ')'; }).join(', ') + ' 쪽이 ' + (C.kid ? '생활 방식' : '일하는 방식') + '의 반대쪽을 채워 줘요. ' + (C.kid ? String(rc[0].why).replace(/일하는/g, '생활하는') : rc[0].why)) + '</p>' +
        '<p class="dp-mi">' + esc('왜 이 활동인지, 지치기 쉬운 시기와 주간 루틴은 앞의 “' + TITLES[IDS.rest] + '” 장에 있어요.') + '</p></section>';
    }
    if (kind === 'money') return moneyBlock(C);
    if (kind === 'spend') return spendBlock(C);
    if (kind === 'meet') return meetBlock(C);
    return null;
  }
  // 종합풀이 '인연이 열리는 곳 · 순위'(timeline_self_27) 끝: 활동으로 넓히는 만남 자리
  function meetBlock(C) {
    var D = DD(), ax = C.r.sport.axes.filter(function (a) { return a.id === 'solo_team'; })[0], side = ax && ax.ok ? ax.side : 'bal';
    var soc = C.r.fields.filter(function (x) { return x.id === 'social'; })[0];
    var subs = D.MEET_IDS.map(function (id) { return C.subs[id]; }).filter(Boolean).sort(function (a, b) { return (b.sub.score - a.sub.score) || (a.sub.id < b.sub.id ? -1 : 1); }).slice(0, 3);
    if (!subs.length) return null;
    return '<section class="dp-embed dp dp-apt"><div class="cap">활동으로 넓히는 만남 자리</div><p class="lead">' + esc(D.MEET_SIDE[side] || D.MEET_SIDE.bal) + '</p>' +
      '<div class="dp-tags">' + subs.map(function (x) { return '<span class="dp-chip">' + esc(x.sub.name + ' · ' + x.sub.ex[0]) + '</span>'; }).join('') + '</div>' +
      '<p class="dp-mi">' + esc((soc && soc.ok ? '사회·교류형은 ' + soc.levelK + '이에요. ' : '') + D.MEET_TIP) + '</p></section>';
  }

  // ───────── 인연운 궁합 장(love-compat.js) '두 사람이 함께 하면 좋은 활동' ─────────
  //   pair(M, chA, chB, nameA, nameB) → { common, roles, axes, acts } · pairHtml(...) → 궁합 결과 카드(lc-card) HTML
  function pair(M, chA, chB, nameA, nameB) {
    var A = APT(); if (!A || !chA || !chB) return null;
    var ra = A.build(M, chA), rb = A.build(M, chB); if (!ra || !ra.ok || !rb || !rb.ok) return null;
    var D = DD(), na = nameA || '나', nb = nameB || '그 사람';
    var fb = {}; rb.fields.forEach(function (x) { fb[x.id] = x; });
    var common = ra.fields.filter(function (x) { var y = fb[x.id]; return x.ok && y && y.ok && x.level !== 'lo' && y.level !== 'lo'; })
      .sort(function (x, y) { return (Math.min(y.score, fb[y.id].score) - Math.min(x.score, fb[x.id].score)) || (x.id < y.id ? -1 : 1); })
      .map(function (x) { return { id: x.id, name: x.name, a: x.levelK, b: fb[x.id].levelK }; });
    var tb = {}; rb.talents.forEach(function (x) { tb[x.id] = x; });
    var roles = [];
    ra.talents.forEach(function (x) { var y = tb[x.id]; if (!x.ok || !y || !y.ok) return;
      if (x.level === 'hi' && y.level === 'lo') roles.push({ who: na, id: x.id, name: x.name, role: D.PAIR_ROLE[x.id] });
      else if (y.level === 'hi' && x.level === 'lo') roles.push({ who: nb, id: x.id, name: x.name, role: D.PAIR_ROLE[x.id] }); });
    var axb = {}; rb.sport.axes.forEach(function (a) { axb[a.id] = a; });
    var fill = function (t, a, b) { return t.replace('{a}은', J.은(na)).replace('{b}는', J.은(nb)).replace('{aSide}', a).replace('{bSide}', b); };
    var axes = ra.sport.axes.map(function (a) {
      var b = axb[a.id], T = D.PAIR_AXIS[a.id]; if (!a.ok || !b || !b.ok || !T || a.side === 'bal' || b.side === 'bal') return null;
      if (a.side === b.side) return { id: a.id, kind: 'same', text: T.same.replace('{side}', a.sideK) };
      return { id: a.id, kind: 'diff', text: fill(T.diff, a.sideK, b.sideK).replace('{L}', a.L).replace('{R}', a.R) };
    }).filter(Boolean);
    axes.sort(function (x, y) { return (x.kind === 'diff' ? 0 : 1) - (y.kind === 'diff' ? 0 : 1); });
    // 함께 해 볼 활동: 두 사람 모두 '취향에 따라' 이상인 세부 분야를 합친 점수 순 — 같은 분야에서 두 개까지
    var sb = {}; Object.keys(rb.details).forEach(function (fid) { rb.details[fid].subs.forEach(function (x) { sb[x.id] = x; }); });
    var cand = []; Object.keys(ra.details).forEach(function (fid) { ra.details[fid].subs.forEach(function (x) { var y = sb[x.id]; if (x.ok && y && y.ok && D.PAIR_SKIP.indexOf(x.id) < 0) cand.push({ id: x.id, name: x.name, ex: x.ex, field: ra.details[fid].name, fid: fid, s: x.score + y.score, both: x.rec !== 'pref' && y.rec !== 'pref' }); }); });
    cand.sort(function (x, y) { return (y.both - x.both) || (y.s - x.s) || (x.id < y.id ? -1 : 1); });
    var acts = [], perField = {};
    cand.forEach(function (x) { if (acts.length >= 3 || (perField[x.fid] || 0) >= 2) return; perField[x.fid] = (perField[x.fid] || 0) + 1; acts.push(x); });
    return { names: [na, nb], common: common.slice(0, 3), roles: roles.slice(0, 3), axes: axes.slice(0, 3), acts: acts };
  }
  function pairHtml(M, chA, chB, nameA, nameB) {
    var p = pair(M, chA, chB, nameA, nameB); if (!p) return '';
    var D = DD(), na = p.names[0], nb = p.names[1];
    var li = function (a) { return '<ul>' + a.map(function (t) { return '<li>' + esc(t) + '</li>'; }).join('') + '</ul>'; };
    var common = p.common.length ? J.은('두 사람') + ' ' + p.common.map(function (c) { return c.name; }).join(', ') + ' 쪽에 함께 끌리기 쉬워요. 둘 다 ‘드러남’ 이상인 분야만 골랐어요.'
      : '두 사람이 끌리는 분야가 서로 달라요. 각자 좋아하는 활동에 상대를 한 번씩 초대해 보는 방식이 잘 맞아요.';
    return '<div class="lc-card lc-apt"><h3>두 사람이 함께 하면 좋은 활동</h3><p class="lc-sub">만세력 특기·적성과 같은 계산으로 두 사람을 나란히 봤어요</p>' +
      '<p class="lc-lead">' + esc(common) + '</p>' +
      (p.acts.length ? '<div class="lc-k">함께 해 볼 활동</div>' + li(p.acts.map(function (x) { return x.name + ' · ' + x.field + ' — ' + x.ex.slice(0, 2).join(', '); })) : '') +
      (p.roles.length ? '<div class="lc-k">서로 채워 주는 역할</div>' + li(p.roles.map(function (r) { return J.은(r.who) + ' ' + r.name + ' 쪽 힘이 뚜렷해서, 함께 할 때 ' + r.role + '을 맡으면 편해요.'; })) : '') +
      (p.axes.length ? '<div class="lc-k">활동 방식 맞춰 보기</div>' + li(p.axes.map(function (a) { return a.text; })) : '') +
      '<p class="lc-note">' + esc(D.PAIR_NOTE) + '</p></div>';
  }
  // 재물운 심화 '이렇게 벌면 편해요'(timeline_wealth_02) 끝: 특기가 돈이 되는 구조 — 20세 미만은 넣지 않는다
  function moneyBlock(C) {
    var D = DD(), t1 = C.ts[0]; if (C.kid || !t1) return null;
    var es = null; try { es = root.MantraElementStrategy && root.MantraElementStrategy.natal(C.M, C.ch); } catch (e) { es = null; }
    var lead = es && es.core ? es.core.type + ' × ' + t1.name + ' — ' + D.TYPE_CLAUSE[es.core.el] + ', ' + D.TALENT_MONEY[t1.id] : t1.name + ' — ' + D.TALENT_MONEY[t1.id];
    var subs = moneySubs(C);
    // 2026-11-26 세분화: 대표 특기의 1위 결 · 돈 버는 리듬(짧고 굵게↔길고 꾸준히, 실내↔바깥) — 기운 쪽만
    var y = typeOf(t1), typeLineM = y && D.TYPE_MONEY[y.top.id] ? D.TYPE_MONEY[y.top.id] : '';
    var axm = {}; C.r.sport.axes.forEach(function (a) { axm[a.id] = a; });
    var rhythm = ['short_long', 'in_out'].map(function (k) { var a = axm[k]; return a && a.ok && a.side !== 'bal' ? D.MONEY_AXIS[k][a.side] : ''; }).filter(Boolean);
    var rows = subs.map(function (x) { var m = D.MONEY[x.sub.id]; return '<div class="dp-talent"><h4>' + esc(x.sub.name + ' · ' + x.sub.recK) + '</h4><p>' + esc('버는 방식 ' + m.model + ' · 처음 드는 비용 ' + m.cost + ' · ' + m.repeat + '. ' + m.eff + '.') + '</p><p class="dp-mi">' + esc('주의: ' + m.caution) + '</p></div>'; }).join('');
    return '<section class="dp-embed dp dp-apt"><div class="cap">특기가 돈이 되는 구조</div><p class="lead">' + esc(lead) + '</p>' +
      (typeLineM || rhythm.length ? '<p>' + esc([typeLineM].concat(rhythm).filter(Boolean).join(' ')) + '</p>' : '') + rows +
      '<p class="dp-mi">' + esc(D.MONEY_NOTE) + '</p></section>';
  }
  function moneySubs(C) {
    var D = DD();
    return Object.keys(C.subs).map(function (k) { return C.subs[k]; }).filter(function (x) { return D.MONEY[x.sub.id]; })
      .sort(function (a, b) { return (b.sub.score - a.sub.score) || (a.sub.id < b.sub.id ? -1 : 1); }).slice(0, 2);
  }
  // 재물운 심화 '돈이 새는 자리 점검'(timeline_wealth_03) 끝: 추천 활동에 나가는 돈의 모양
  function spendBlock(C) {
    var D = DD(), acts = C.r.final.activities, seen = {}, groups = {};
    acts.forEach(function (a) {
      var hit = null; Object.keys(C.subs).some(function (k) { var x = C.subs[k]; if (x.sub.ex.indexOf(a.name) >= 0) { hit = x; return true; } return false; });
      if (!hit || seen[hit.sub.id]) return; seen[hit.sub.id] = 1;
      var t = D.COST_TYPE[hit.sub.id] || 'low'; (groups[t] = groups[t] || []).push(a.name);
    });
    var keys = ['gear', 'lesson', 'material', 'low'].filter(function (k) { return groups[k]; }); if (!keys.length) return null;
    var sl = C.r.sport.axes.filter(function (a) { return a.id === 'short_long'; })[0], spendAx = sl && sl.ok && sl.side !== 'bal' ? D.SPEND_AXIS[sl.side] : '';   // 2026-11-26: 지출이 새는 모양
    return '<section class="dp-embed dp dp-apt"><div class="cap">취미에 나가는 돈 점검</div><p class="lead">' + esc((C.kid ? '해 보면 좋은 활동' : '추천 활동') + '을 시작하기 전에, 돈이 어떤 모양으로 나가는지 먼저 보면 새는 돈을 줄일 수 있어요.') + '</p>' +
      keys.map(function (k) { return '<div class="dp-talent"><h4>' + esc(D.COST_NAME[k] + ' · ' + groups[k].join(', ')) + '</h4><p>' + esc(D.COST_TIP[k]) + '</p></div>'; }).join('') +
      (spendAx ? '<p>' + esc(spendAx) + '</p>' : '') +
      '<p class="dp-mi">' + esc('활동은 특기·적성 풀이(종합풀이 “' + TITLES[IDS.self] + '”)의 추천에서 가져왔어요. 이 사주의 돈 쓰는 성향은 이 장 위쪽 풀이와 함께 보세요.') + '</p></section>';
  }

  // ───────── 공개 스위치(flow-chapters.js 와 같은 방식) ─────────
  function localFlag() {
    try {
      var f = root.MANTRA_FLAGS; if (f && f.aptChapters === true) return true;
      var h = root.location && root.location.hostname || '';
      if (/^(localhost|127\.0\.0\.1)$/.test(h) || /^[a-z0-9][a-z0-9-]*\.mantramanse\.pages\.dev$/i.test(h)) return /[?&]mantraFlags=[A-Za-z,]*\baptChapters\b/.test(root.location.search || '');
    } catch (e) { }
    return false;
  }
  var readyP = null;
  function ready() {
    if (readyP) return readyP;
    if (localFlag()) return (readyP = Promise.resolve(true));
    if (!root.fetch) return (readyP = Promise.resolve(false));
    var valid = function (d) { return !!(d && typeof d === 'object' && Number.isInteger(d.version)); };
    var p = root.MantraLastGood ? root.MantraLastGood.json('/api/luck-flags', 5000, valid) : root.fetch('/api/luck-flags', { cache: 'no-store' }).then(function (r) { return r.ok ? r.json() : null; });
    return (readyP = Promise.resolve(p).then(function (d) { return !!(d && d.aptChapters === true); }).catch(function () { return false; }));
  }
  function readyWithin(ms) {
    var saved = function () { try { var d = root.MantraLastGood && root.MantraLastGood.saved('/api/luck-flags'); return !!(d && d.aptChapters === true); } catch (e) { return false; } };
    return Promise.race([ready(), new Promise(function (ok) { setTimeout(function () { ok(saved()); }, ms || 2500); })]);
  }
  if (root.document && root.fetch) { try { ready(); } catch (e) { } }

  var API = { VERSION: VERSION, IDS: IDS, TITLES: TITLES, BANNED: BANNED, on: false, buildAll: buildAll, add: add, block: block, pair: pair, pairHtml: pairHtml, ready: ready, readyWithin: readyWithin, localFlag: localFlag,
    selfTalent: selfTalent, workTalent: workTalent, restTalent: restTalent };
  R.AptChapters = API;
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
})(typeof window !== 'undefined' ? window : globalThis);
