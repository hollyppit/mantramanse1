/* 오행별 실전 전략 — 용신·희신·기신·구신을 직업·수익·시기 전략 문장으로 '번역'만 한다. 2026-11-20
   · 계산 재구현 없음: 오행 세력(ch.weights)·통합 용신 역할(ch.unified.roles)·학파별 판단(ch.yongAll·ch.unified.theories/conflicts)·
     운 흐름 점수(x.ev)·간지 관계(Manse.relationsAmong)를 읽기만 한다. 용신을 다시 판정하거나 점수·순위를 바꾸지 않는다.
   · 용신 = 핵심 전략, 희신 = 확장 전략, 기신·구신 = 주의 전략(금지 아님). 부족·과다 오행은 분포 참고 정보로만(용신과 따로).
   · 오행의 전통 상징을 현대 경제활동에 옮긴 분류이며, 특정 오행이 특정 직업을 뜻한다고 단정하지 않는다.
   · 사용: MantraElementStrategy.natal(M, ch) · .job(M, ch, job) · .luck(M, ch, x, kind, key) */
(function (G) {
  'use strict';
  var VERSION = 'element-strategy-20261120-1';
  var EL_K = ['목', '화', '토', '금', '수'], EL_H = ['木', '火', '土', '金', '水'];
  var ELS = [
    { name: '성장·기획·육성형', keys: ['성장', '기획', '교육', '창의성', '확장', '개발', '육성'],
      modes: ['교육·강의', '콘텐츠 제작', '기획·컨설팅', '브랜딩', '신규 서비스 개발', '창작·지식 기반 사업'],
      core: '자신의 지식과 경험을 콘텐츠나 서비스로 키워, 단기 수익보다 오래 확장되는 구조를 만드는 전략을 검토해 보세요.',
      expand: '기획·교육·새 프로젝트로 활동 범위를 넓히면, 핵심 강점이 더 오래 성장할 수 있어요.',
      caution: '계획만 늘리고 실행과 수익화를 미루지 않도록, 일정과 수익 시점을 먼저 정해 두는 편이 좋아요.',
      jobUse: '기획·교육·창작·신규 서비스 개발로 역량을 키워 가는 방향', focus: '기획력과 성장 가능성', env: '배우며 성장할 수 있는 조직',
      prep: '새 분야에서 배울 것과 이어 갈 것을 나눠 적어 두세요', biz: '신규 상품·서비스 기획', noble: '배움을 주는 선배·교육자', verify: '그 기회가 꾸준히 키울 수 있는 일인지 먼저 따져 보세요' },
    { name: '노출·표현·확산형', keys: ['표현', '홍보', '대중성', '주목', '전달', '확산', '브랜드'],
      modes: ['SNS·온라인 마케팅', '퍼스널 브랜딩', '강의·발표', '미디어 콘텐츠', '광고·홍보', '대중 대상 서비스'],
      core: '좋은 결과물을 만드는 것에서 그치지 않고 외부에 알리는 채널을 넓혀, 전문성과 인지도를 함께 키우는 전략이 유리할 수 있어요.',
      expand: '발표·홍보·브랜딩으로 이미 가진 강점을 더 많은 사람에게 전달하면 수익의 폭이 넓어질 수 있어요.',
      caution: '과도한 홍보와 무리한 확장보다, 실제로 남는 수익인지 먼저 검증하는 편이 좋아요.',
      jobUse: '전문성을 외부에 알리고 발표·홍보·브랜딩을 강화하는 방향', focus: '알리는 힘과 대외 노출', env: '대외 활동과 발표가 많은 직무',
      prep: '지금까지의 성과를 한눈에 보이는 자료로 정리해 두세요', biz: '브랜딩과 홍보 채널 확대', noble: '나를 알려 줄 매체·대외 파트너', verify: '노출이 실제 매출로 이어지는지 숫자로 확인해 보세요' },
    { name: '안정·운영·축적형', keys: ['안정', '관리', '운영', '축적', '시스템', '조직', '지속성'],
      modes: ['조직 운영', '프로젝트 관리', '사업 운영', '자산·재무 관리', '반복 매출 구조', '운영 시스템·프로세스'],
      core: '반복 가능한 수익 모델과 운영 체계를 먼저 갖춰, 수익의 지속성과 안정성을 확보하는 전략을 검토해 보세요.',
      expand: '업무 체계화와 재무 점검을 곁들이면, 확장한 활동이 흔들리지 않고 쌓여요.',
      caution: '지나친 안정 추구로 새로운 기회를 놓치지 않도록, 작은 시험은 꾸준히 해 보는 편이 좋아요.',
      jobUse: '업무를 체계화하고 운영 관리로 안정적인 수익 구조를 쌓는 방향', focus: '안정적인 운영 능력', env: '체계가 잘 갖춰진 조직',
      prep: '지금 자리에서 쌓은 운영 성과를 기록으로 남겨 두세요', biz: '운영 체계와 반복 매출 구조', noble: '오래 함께할 운영 파트너', verify: '그 수익이 반복될 수 있는 구조인지 먼저 따져 보세요' },
    { name: '전문성·분석·정밀형', keys: ['전문성', '분석', '기술', '정확성', '판단', '품질', '체계화'],
      modes: ['전문 기술 서비스', '데이터 분석', '재무·회계', '기술 개발', '품질 관리', '전문 자문·컨설팅'],
      core: '전문 기술과 지식의 정확성·품질로 차별화하고, 이를 증명하는 경력과 포트폴리오를 쌓아 서비스나 상품으로 전환하는 전략을 검토해 보세요.',
      expand: '기술과 결과물의 품질을 다듬어 두면, 다른 강점을 펼칠 때 신뢰의 바탕이 돼요.',
      caution: '완벽주의나 과도한 분석으로 실행이 늦어지지 않도록, 마감과 공개 시점을 먼저 정해 두는 편이 좋아요.',
      jobUse: '전문 기술과 분석 역량을 다듬어 품질과 정확성으로 경쟁력을 쌓는 방향', focus: '전문성과 정확성', env: '전문성을 객관적으로 평가하는 직무',
      prep: '자격·경력·결과물처럼 증명할 수 있는 근거를 정리해 두세요', biz: '전문 서비스의 품질 차별화', noble: '기준을 잡아 주는 전문가', verify: '조건과 위험을 숫자로 따져 본 뒤에 움직여 보세요' },
    { name: '연결·유통·정보형', keys: ['연결', '정보', '유통', '네트워크', '이동', '소통', '플랫폼'],
      modes: ['온라인 플랫폼', 'IT·디지털 서비스', '유통·중개', '네트워크 기반 사업', '해외 시장', '정보·데이터 서비스'],
      core: '사람과 정보가 연결되는 구조를 만들고 온라인 채널·제휴로 고객 접점을 넓히는 전략을 검토해 보세요.',
      expand: '협업과 제휴, 온라인 채널을 곁들이면 핵심 강점이 닿는 시장이 넓어질 수 있어요.',
      caution: '무분별한 확장이나 조건이 불확실한 협업은 경계하고, 연결을 늘리기 전에 역할과 조건을 분명히 하는 편이 좋아요.',
      jobUse: '정보·네트워크·플랫폼·유통을 활용해 활동 범위를 넓히는 방향', focus: '정보력과 연결망', env: '협업·네트워크가 넓은 직무',
      prep: '함께 일했던 사람과 연결 고리를 정리해 두세요', biz: '온라인 판매·제휴 채널', noble: '사람을 이어 주는 연결자', verify: '연결해 준 사람과 조건을 확인한 뒤에 움직여 보세요' },
  ];
  var GROUP_N = ['비겁', '식상', '재성', '관성', '인성'];
  var HOW = ['키우고 기획하는 방식으로', '밖으로 알리고 전달하는 방식으로', '꾸준히 운영하고 쌓는 방식으로', '정밀하게 다듬어 전문성으로', '사람과 정보를 잇는 방식으로'];
  var GROUP_SKILL = ['내 힘과 동료와의 협력', '만들고 표현하는 재능', '돈과 현실을 다루는 감각', '조직과 책임을 맡는 힘', '배움과 지식을 쌓는 힘'];
  var mod5 = function (x) { return ((x % 5) + 5) % 5; };
  var elN = function (e) { return EL_K[e] + '(' + EL_H[e] + ')'; };
  var jong = function (w) { var c = String(w).replace(/[)\s]+$/, '').slice(-1).charCodeAt(0); return c >= 0xAC00 && c <= 0xD7A3 && (c - 0xAC00) % 28 !== 0; };
  var J = function (w, a, b) { return w + (jong(w) ? a : b); };

  function rolesOf(ch) { var r = (ch.unified && ch.unified.roles) || {}, o = {}; [0, 1, 2, 3, 4].forEach(function (e) { o[e] = r[e] || ''; }); return o; }
  function byRole(roles, name) { return [0, 1, 2, 3, 4].filter(function (e) { return roles[e] === name; }); }

  // 원국: 장기 수익 전략
  function natal(M, ch) {
    if (!M || !ch || !ch.unified) return null;
    var roles = rolesOf(ch), dEl = M.stemEl(ch.pillars.day.s), pct = ch.weights.pct;
    var yong = byRole(roles, '용신')[0], hee = byRole(roles, '희신'), gi = byRole(roles, '기신'), gu = byRole(roles, '구신');
    var grp = function (e) { return mod5(e - dEl); };
    var core = yong == null ? null : { el: yong, elName: elN(yong), type: ELS[yong].name, group: GROUP_N[grp(yong)],
      text: ELS[yong].core, combo: J(elN(yong), '은', '는') + ' 일간에게 ' + GROUP_N[grp(yong)] + '에 해당해요. 그래서 ' + J(GROUP_SKILL[grp(yong)], '을', '를') + ' ' + HOW[yong] + ' 쓰는 것이 핵심이에요.',
      modes: ELS[yong].modes.slice(0, 4) };
    var expand = hee.map(function (e) { return { el: e, elName: elN(e), type: ELS[e].name, group: GROUP_N[grp(e)], text: ELS[e].expand, modes: ELS[e].modes.slice(0, 3) }; });
    var caution = gi.map(function (e) { return { el: e, elName: elN(e), role: '기신', text: ELS[e].caution }; }).concat(gu.map(function (e) { return { el: e, elName: elN(e), role: '구신', text: ELS[e].caution }; }));
    // 부족·과다(분포 참고) — 용희기구 판단과 따로
    var lack = [0, 1, 2, 3, 4].filter(function (e) { return pct[e] < 10; }), over = [0, 1, 2, 3, 4].filter(function (e) { return pct[e] >= 30; });
    var ref = { lack: lack.map(function (e) { return { el: e, elName: elN(e), pct: Math.round(pct[e] * 10) / 10, role: roles[e] }; }), over: over.map(function (e) { return { el: e, elName: elN(e), pct: Math.round(pct[e] * 10) / 10, role: roles[e] }; }) };
    ref.note = '부족·과다는 원국 오행 분포(계절·월령 반영 최종 세력)를 보여 주는 참고 정보예요. 부족하다고 무조건 채울 필요는 없고, 많다고 무조건 나쁜 것도 아니에요. 전략의 기준은 위의 용신·희신 판단이에요.' +
      (ref.lack.some(function (x) { return x.role !== '용신' && x.role !== '희신'; }) ? ' 이 사주에서는 적은 오행 중 일부가 용신·희신이 아니에요.' : '') + (ref.over.some(function (x) { return x.role !== '기신' && x.role !== '구신'; }) ? ' 많은 오행이 곧 기신인 것도 아니에요.' : '');
    // 판단 근거(엔진 결과 그대로)
    var Y = ch.yongAll || {}, u = ch.unified, basis = [];
    if (Y.eokbu && Y.eokbu.applicable && Y.eokbu.yong != null) basis.push('억부(강약 균형) 기준 용신: ' + elN(Y.eokbu.yong));
    if (Y.johu && Y.johu.applicable && Y.johu.yong != null) basis.push('조후(한난조습) 기준 용신: ' + elN(Y.johu.yong));
    var agree = Y.eokbu && Y.johu && Y.eokbu.applicable && Y.johu.applicable && Y.eokbu.yong === Y.johu.yong;
    basis.push('최종 판단: ' + (u.primaryName || '') + ' 기준' + (u.secondaryName ? '(+' + u.secondaryName + ')' : '') + (agree ? ' — 억부와 조후가 같은 오행을 가리켜 이 방향의 비중이 커요' : ''));
    (u.conflicts || []).slice(0, 2).forEach(function (c) { if (c && c.text) basis.push(c.text); });
    return { version: VERSION, core: core, expand: expand, caution: caution, ref: ref, basis: basis, agree: !!agree,
      note: '오행별 전략은 오행의 전통 상징을 현대 경제활동에 옮긴 분류예요. 특정 직업을 정하는 기준이 아니라, 강점을 어떤 방식으로 수익화할지 고르는 참고예요.' };
  }

  // 직업 한 항목(wealth-career.js s3.jobs 의 j): 순위·추천 근거는 그대로, 용신·희신 활용과 주의만 덧붙인다
  function job(M, ch, j) {
    if (!M || !ch || !ch.unified || !j) return null;
    var roles = rolesOf(ch), yong = byRole(roles, '용신')[0], hee = byRole(roles, '희신'), bad = byRole(roles, '기신').concat(byRole(roles, '구신'));
    var elIdx = (j.els || []).map(function (k) { var i = EL_K.indexOf(k); if (i < 0) i = EL_H.indexOf(k); return i; }).filter(function (i) { return i >= 0; });
    var out = { yongUse: yong == null ? '' : '이 직업에서는 ' + ELS[yong].jobUse + '으로 성장과 수익화를 설계해 볼 수 있어요(용신 ' + elN(yong) + ').',
      heeUse: hee.length ? hee.map(function (e) { return ELS[e].expand.replace(/\.$/, '') + '(희신 ' + elN(e) + ').'; }).join(' ') : '',
      caution: '', basis: [] };
    var badIn = elIdx.filter(function (e) { return bad.indexOf(e) >= 0; });
    if (badIn.length) out.caution = '이 일에 쓰이는 ' + badIn.map(elN).join('·') + ' 기운은 나에게 ' + badIn.map(function (e) { return roles[e]; }).join('·') + ' 쪽이라, ' + ELS[badIn[0]].caution;
    out.basis.push('직업 순위는 십성 구조·수익 유형·업무 환경·활동 분야로 정한 기존 계산 그대로예요(용신이 들어 있다고 순위를 올리지 않아요).');
    if (elIdx.length) out.basis.push('쓰이는 기운: ' + elIdx.map(function (e) { return elN(e) + (roles[e] ? '=' + roles[e] : ''); }).join(' · '));
    return out;
  }

  // 운세 흐름: 이 운에서 들어오는 오행을 시기 전략으로. key = job|move|career|business|noble|social|windfall
  var LUCK_KEYS = ['job', 'move', 'career', 'business', 'noble', 'social', 'windfall'];
  var GOOD = { 용신: 1, 희신: 1 }, BAD = { 기신: 1, 구신: 1 };
  function luck(M, ch, x, kind, key) {
    if (!M || !ch || !ch.unified || !x || x.s == null || LUCK_KEYS.indexOf(key) < 0) return null;
    var roles = rolesOf(ch), se = M.stemEl(x.s), be = M.stemEl(M.mainHidden(x.b)), fit = x.ev && typeof x.ev.fitScore === 'number' ? x.ev.fitScore : 0;
    var P = ch.pillars, POSK = { year: '연지', month: '월지', day: '일지', hour: '시지' };
    var rels = []; try { rels = M.relationsAmong(['year', 'month', 'day', 'hour'].filter(function (k) { return P[k]; }).map(function (k) { return { id: k, s: P[k].s, b: P[k].b }; }).concat([{ id: 'luck', s: x.s, b: x.b }])).filter(function (r) { return r.members.indexOf('luck') >= 0; }); } catch (e) { }
    var clash = rels.filter(function (r) { return r.kind === 'branch' && /^(충|형|파|해)$/.test(r.type); }), clashTxt = clash.map(function (r) { return r.name + '(' + r.members.filter(function (m) { return m !== 'luck'; }).map(function (m) { return POSK[m]; }).join('·') + ')'; });
    var inflow = [{ part: '천간', el: se }, { part: '지지', el: be }].filter(function (v, i, a) { return i === 0 || v.el !== a[0].el; });
    // 판정: 엔진 흐름 점수(계절 왕쇠·통근·생극·합충·희기 반영)와 원국 충돌을 함께 본다 — 역할만으로 길흉을 정하지 않는다
    inflow.forEach(function (f) { var r = roles[f.el]; f.role = r || '한신'; f.state = GOOD[r] ? (fit < -10 || clash.length ? 'mixed' : 'use') : BAD[r] ? 'careful' : 'neutral'; });
    var use = inflow.filter(function (f) { return f.state === 'use'; })[0], mixed = inflow.filter(function (f) { return f.state === 'mixed'; })[0], careful = inflow.filter(function (f) { return f.state === 'careful'; })[0];
    var main = use || mixed || inflow.filter(function (f) { return f.state === 'neutral'; })[0] || careful;
    var E = ELS[main.el], actions = [], cautions = [];
    var A = {
      job: function (e) { return '이력서·포트폴리오에서 ' + J(ELS[e].focus, '을', '를') + ' 앞세우고, ' + J(ELS[e].env, '을', '를') + ' 중심으로 지원처를 살펴보세요.'; },
      move: function (e) { return '지금 경력 가운데 ' + J(ELS[e].focus, '을', '를') + ' 더 높은 가치로 쓸 수 있는 직무인지 따져 보세요. 옮기기 전에 ' + ELS[e].prep + '.'; },
      career: function (e) { return '긴 흐름에서는 ' + J(ELS[e].focus, '을', '를') + ' 키우는 쪽으로 업무 방식을 다듬어 보세요(' + ELS[e].modes.slice(0, 2).join('·') + ' 같은 방식).'; },
      business: function (e) { return J(ELS[e].biz, '을', '를') + ' 먼저 검토해 보고, 확장 전에 현금 흐름을 따로 점검해 두세요.'; },
      noble: function (e) { return ELS[e].noble + ' 같은 관계를 눈여겨보세요. 도움을 받을 때는 내가 줄 수 있는 것도 함께 정리해 두면 관계가 오래가요.'; },
      social: function (e) { return '말과 글로 오가는 내용은 기록으로 남기고, 협의한 조건은 서로 확인해 두세요.' + (e === 1 ? ' 특히 온라인 발언과 대외 노출에서 표현이 앞서가지 않게 해요.' : ''); },
      windfall: function (e) { return '예상 밖의 수익 기회가 보이면 ' + ELS[e].verify + '. 이 흐름은 당첨이나 투기 수익을 기대하는 신호로 보지 않아요.'; }
    };
    if (use) actions.push(A[key](use.el));
    else if (mixed) { actions.push(A[key](mixed.el)); cautions.push(J(elN(mixed.el), '은', '는') + ' 나에게 ' + mixed.role + '이지만, 이 시기에는 ' + (clash.length ? clashTxt.join('·') + ' 같은 부딪힘' : '전체 흐름 점수가 낮은 조건') + '이 함께 있어 서두르지 말고 단계를 나눠 진행하는 편이 좋아요.'); }
    else { var ny = byRole(roles, '용신')[0]; actions.push('이 시기에 들어오는 기운은 나에게 직접 도움이 되는 쪽(용신·희신)은 아니에요. 장기 강점을 지키는 방향으로: ' + A[key](ny != null ? ny : main.el)); }
    if (careful) cautions.push('이 시기 들어오는 ' + J(elN(careful.el), '은', '는') + ' 나에게 ' + careful.role + ' 쪽이라, ' + ELS[careful.el].caution);
    if (key === 'social' && clash.length) cautions.push('원국과 ' + clashTxt.join('·') + '이(가) 생기는 시기라, 계약·업무 협의는 조건을 문서로 확인하고 감정이 앞선 대화는 하루 미뤄 보세요.');
    if (key === 'windfall') cautions.push('투자·지출은 미리 정한 한도 안에서만 움직이세요.');
    var natalCore = natal(M, ch), basis = [];
    basis.push('이 운의 천간 ' + M.STEM[x.s] + '=' + elN(se) + '(' + (roles[se] || '한신') + ') · 지지 ' + M.BR[x.b] + '(본기 ' + elN(be) + '=' + (roles[be] || '한신') + ')');
    basis.push('흐름 점수 ' + Math.round(fit) + ' — 계절 왕쇠·통근·생극·합충·희기를 반영한 엔진 값' + (clash.length ? ' · 원국과 ' + clashTxt.join('·') : ''));
    var longTerm = natalCore && natalCore.core ? '장기 전략(오행·강약 탭)은 용신 ' + natalCore.core.elName + ' 중심이고, 이 시기 전략은 지금 들어오는 기운의 작용을 기준으로 해요. 둘이 다를 수 있어요.' : '';
    return { version: VERSION, key: key, kind: kind, inflow: inflow, actions: actions.filter(Boolean), cautions: cautions, basis: basis, longTerm: longTerm };
  }

  var api = { version: VERSION, ELS: ELS, EL_K: EL_K, LUCK_KEYS: LUCK_KEYS, natal: natal, job: job, luck: luck };
  G.MantraElementStrategy = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
