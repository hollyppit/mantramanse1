/* 깊이 풀이 3 — 대운·세운·월운(제목·그래프·기회/방어 후보) · 개운법의 명리 근거 · 명소 추천, 그리고 챕터 끼워 넣기(augment).
   시간 값은 전부 엔진(daeun.list · seunRange · wolun)이 계산한 것을 읽기만 한다. 제목·설명은 십성·계절·변동성 신호를 쉬운 말로 옮긴 것이다. */
(function (root) {
  var R = root.ReportV2 = root.ReportV2 || {}, D = R.Deep; if (!D) return;
  var S = D.SECTIONS, esc = D.esc, scene = D.scene, sec = D.sec, cap = D.cap, bar = D.bar, chip = D.chip, nz = D.nz, who = D.who, clamp = D.clamp, SEA = D.SEA, EL_HJ = D.EL_HJ;
  var OPEN = { opportunity: 1, expansion: 1, harvest: 1 };

  function stemEl(gzK) { var i = D.STEMS.indexOf(String(gzK).charAt(0)); return i >= 0 ? D.STEM_EL[i] : null; }
  function roleOf(H, gzK, which) { var u = H.sd.usefulElements; if (!u) return ''; var br = which === 'branch' ? (BR_EL[String(gzK).charAt(1)] || null) : stemEl(gzK); return br ? u.roles[br] || '' : ''; }
  var BR_EL = { 자: '수', 축: '토', 인: '목', 묘: '목', 진: '토', 사: '화', 오: '화', 미: '토', 신: '금', 유: '금', 술: '토', 해: '수' };
  var ROLE_PLAIN = { 용신: '내게 가장 필요한 기운이 들어와 흐름을 크게 도와줍니다', 희신: '내게 필요한 기운을 도와주는 기운이 들어와 힘을 보태 줍니다', 한신: '나에게 큰 도움도 해도 되지 않는 무난한 기운이 들어옵니다', 구신: '나를 소모시키는 쪽의 기운이 들어와 힘이 빠지기 쉽습니다', 기신: '나에게 맞지 않는 기운이 강하게 들어와 부담이 커지기 쉽습니다' };
  function volatileOf(x) { var o = x.ev && x.ev.flow && x.ev.flow.overlays; return !!(o && o.volatility && o.volatility.active); }
  function seasonOf(x) { return R.SajuData.seasonOf(x.ev); }
  function row(H, x, label, kind) { // 한 기간(대운·세운·월운)의 공통 값
    var M = H.M, gz = M.gzNameK(x), se = seasonOf(x), vol = volatileOf(x), sc = D.scoreOf(x), pct = D.pct10(sc);
    return { x: x, gz: gz, season: se, volatile: vol, pct: pct, label: label, title: D.eventTitle(x.stemTG, se, vol, kind), stemRole: roleOf(H, gz, 'stem'), brRole: roleOf(H, gz, 'branch'), cond: x.ev && x.ev.flow && x.ev.flow.condition && x.ev.flow.condition.name, unseong: x.unseong, sinsal: x.sinsal12 };
  }
  function whyOpen(r, unit) { var a = []; if (r.stemRole && /용신|희신/.test(r.stemRole)) a.push('천간이 ' + r.stemRole + ' 자리라 ' + ROLE_PLAIN[r.stemRole]); else if (r.brRole && /용신|희신/.test(r.brRole)) a.push('지지가 ' + r.brRole + ' 자리라 ' + ROLE_PLAIN[r.brRole]);
    a.push(D.TG_DO[r.x.stemTG] ? '"' + r.x.stemTG + '" 기운이 들어와 ' + D.TG_DO[r.x.stemTG] + ' 때가 됩니다' : ''); return a.filter(Boolean).slice(0, 2).join(' · '); }
  function whyGuard(r, unit) { var a = []; if (r.stemRole && /기신|구신/.test(r.stemRole)) a.push('천간이 ' + r.stemRole + ' 자리라 ' + ROLE_PLAIN[r.stemRole]); else if (r.brRole && /기신|구신/.test(r.brRole)) a.push('지지가 ' + r.brRole + ' 자리라 ' + ROLE_PLAIN[r.brRole]);
    if (r.volatile) a.push('원국과 부딪히는 글자(충·형)가 겹쳐 변동·마찰이 커집니다'); if (!a.length) a.push('흐름이 낮아 새 일을 벌이기보다 지키는 편이 낫습니다'); return a.slice(0, 2).join(' · '); }
  // 꺾은선 그래프(SVG): 점마다 라벨. cur = 지금 위치 인덱스
  function line(rows, labels, cur) {
    var W = 320, Hh = 130, pad = 22, n = rows.length, xs = rows.map(function (_, i) { return pad + (W - pad * 2) * (n === 1 ? .5 : i / (n - 1)); }), ys = rows.map(function (r) { return Hh - 26 - (Hh - 52) * (r.pct / 100); });
    var d = xs.map(function (x, i) { return (i ? 'L' : 'M') + x.toFixed(1) + ',' + ys[i].toFixed(1); }).join(' '), area = d + ' L' + xs[n - 1].toFixed(1) + ',' + (Hh - 26) + ' L' + xs[0].toFixed(1) + ',' + (Hh - 26) + ' Z';
    return '<div class="dp-chart"><svg viewBox="0 0 ' + W + ' ' + Hh + '" role="img" aria-label="시기별 흐름 그래프"><line x1="' + pad + '" x2="' + (W - pad) + '" y1="' + (Hh - 26 - (Hh - 52) * .5) + '" y2="' + (Hh - 26 - (Hh - 52) * .5) + '" class="dp-mid"/><path d="' + area + '" class="dp-area"/><path d="' + d + '" class="dp-line"/>' +
      rows.map(function (r, i) { return '<circle cx="' + xs[i].toFixed(1) + '" cy="' + ys[i].toFixed(1) + '" r="' + (i === cur ? 5 : 3) + '" class="' + (i === cur ? 'dp-dot cur' : 'dp-dot') + (r.pct >= 62 ? ' up' : r.pct <= 40 ? ' dn' : '') + '"/><text x="' + xs[i].toFixed(1) + '" y="' + (Hh - 8) + '" text-anchor="middle" class="dp-xl">' + esc(labels[i]) + '</text>'; }).join('') + '</svg><p class="dp-chartnote">선이 높을수록 나아가기 좋은 때, 낮을수록 쌓고 지키는 때예요(점수가 아니라 계절의 흐름).</p></div>';
  }
  function card(r, big, sub, isNow) { // 기간 카드
    return '<div class="dp-tl' + (isNow ? ' now' : '') + (r.pct >= 62 ? ' up' : r.pct <= 40 ? ' dn' : '') + '"><div class="dp-tl1"><b>' + esc(big) + '</b><small>' + esc(sub) + '</small></div><div class="dp-tl2"><div class="dp-tlh">' + esc(r.label) + (isNow ? ' <span class="dp-now">지금</span>' : '') + '</div><div class="dp-tlt">' + esc(r.title) + '</div>' + bar('', r.pct, { cls: 'dp-slim', color: r.pct >= 62 ? '#5FBF9A' : r.pct <= 40 ? '#FF9A3C' : '#D5B97F', text: SEA[r.season] || r.cond || '' }) +
      '<div class="dp-tags">' + (r.cond ? chip(r.cond, /주의/.test(r.cond) ? 'warn' : '') : '') + chip(r.x.stemTG + '·' + r.x.branchTG) + (r.unseong ? chip('운성 ' + r.unseong) : '') + (r.sinsal ? chip(r.sinsal) : '') + (r.volatile ? chip('변동 큼', 'warn') : '') + '</div></div></div>';
  }
  function cands(rows, nameOf, unit) { // 기회 후보 / 방어 후보
    var open = rows.filter(function (r) { return OPEN[r.season] || r.pct >= 60; }).sort(function (a, b) { return b.pct - a.pct; }).slice(0, 3), guard = rows.filter(function (r) { return r.season === 'defense' || r.volatile || r.pct <= 42; }).sort(function (a, b) { return a.pct - b.pct; }).slice(0, 3);
    var li = function (r, i, why) { return '<li><span>' + (i + 1) + '순위 · <b>' + esc(nameOf(r)) + '</b> <small>' + esc(SEA[r.season] || '') + '</small></span><em>' + esc(why(r)) + '</em></li>'; };
    return '<div class="dp-pc"><div class="dp-pro"><h4>기회를 잡을 ' + unit + ' 후보</h4><ul>' + (open.length ? open.map(function (r, i) { return li(r, i, whyOpen); }).join('') : '<li><span>뚜렷한 기회 구간은 없어요 — 꾸준히 쌓는 시기입니다</span></li>') + '</ul></div><div class="dp-con"><h4>방어해야 할 ' + unit + ' 후보</h4><ul>' + (guard.length ? guard.map(function (r, i) { return li(r, i, whyGuard); }).join('') : '<li><span>크게 조심할 구간은 없어요</span></li>') + '</ul></div></div>';
  }

  // ───────── 대운 ─────────
  S.deep_daewoon = function (H) {
    var M = H.M, sd = H.sd, list = H.ch.daeun.list, cur = -1, rows = list.map(function (x, i) { var r = row(H, x, M.gzNameK(x) + ' 대운', '운'); r.a1 = x.startAge; r.a2 = x.startAge + 9; r.y1 = x.startYear; if (sd.currentDaewoon && sd.currentDaewoon.startYear === x.startYear) cur = i; return r; });
    var dec = function (r) { return r.a1 < 10 ? '유년' : Math.floor((r.a1 + 4) / 10) * 10 + '대'; };
    var out = [scene(sec('', cap('대운 지도 · 10년마다 바뀌는 인생의 길') + '<p class="lead">대운은 <b>10년 단위로 바뀌는 큰 도로</b>예요. ' + esc(who(H)) + '은(는) 지금 <b>' + esc(cur >= 0 ? rows[cur].gz + ' 대운(' + rows[cur].a1 + '~' + rows[cur].a2 + '세)' : '대운이 시작되기 전') + '</b>을 지나고 있어요. 대운 이름(예: 신해·병오)과 나이대, "이 시기에 어떤 일을 하게 되는지"를 한눈에 모았습니다.</p>' + line(rows, rows.map(function (r) { return r.gz; }), cur))),
      scene(sec('', cap('10년씩 보는 나의 대운') + rows.map(function (r, i) { return card(r, dec(r), r.a1 + '~' + r.a2 + '세 · ' + D.ageSpan(r.a1, r.a2), i === cur); }).join('')))];
    out.push(scene(sec('', cap('대운으로 보는 기회와 방어') + cands(rows, function (r) { return r.gz + ' 대운 (' + r.a1 + '~' + r.a2 + '세)'; }, '대운'))));
    return { title: '대운 지도', sub: '10년마다 바뀌는 인생의 길 · 시기별로 하게 될 일', scenes: out, rows: rows };
  };

  // ───────── 세운 ─────────
  S.deep_seun = function (H) {
    var M = H.M, sd = H.sd, Y = sd.nowYear, list = M.seunRange(H.ch, Y, Y + 9), rows = list.map(function (x, i) { var r = row(H, x, x.year + '년 ' + M.gzNameK(x), '해'); var d; try { d = M.evaluateDomainLuck(H.ch, x, 'seun'); } catch (e) { } r.love = d && d.love && d.love.score; r.wealth = d && d.wealth && d.wealth.score; r.year = x.year; return r; });
    var out = [scene(sec('', cap('세운 지도 · 앞으로 10년, 해마다') + '<p class="lead">세운은 <b>해마다 바뀌는 날씨</b>예요. 대운이라는 큰 도로 위에서 올해부터 10년을 한 해씩 봅니다. 해마다 "무엇을 하게 될 해인지"를 제목으로 붙였어요.</p>' + line(rows, rows.map(function (r) { return String(r.year).slice(2); }), 0))),
      scene(sec('', cap('해마다 하게 될 일') + rows.map(function (r, i) { var c = card(r, String(r.year), r.gz.replace(/^\d+년 /, '') + ' · ' + (Y + i - sd.nowYear === 0 ? '올해' : (i) + '년 뒤'), i === 0); return c.replace('<div class="dp-tags">', '<div class="dp-tags">' + (r.love != null ? chip('연애 ' + r.love) : '') + (r.wealth != null ? chip('재물 ' + r.wealth) : '')); }).join(''))),
      scene(sec('', cap('세운으로 보는 기회의 해 · 방어의 해') + cands(rows, function (r) { return r.year + '년 ' + r.gz.replace(/^\d+년 /, ''); }, '해')))];
    return { title: '세운 지도', sub: '앞으로 10년, 해마다 하게 될 일', scenes: out, rows: rows };
  };

  // ───────── 월운 ─────────
  S.deep_wolun = function (H) {
    var M = H.M, sd = H.sd, Y = sd.nowYear, all = M.wolun(H.ch, Y).concat(M.wolun(H.ch, Y + 1)), now = H.now || Date.now(), ci = 0; all.forEach(function (x, i) { if (x.startMs <= now) ci = i; });
    var rows = all.slice(ci, ci + 12).map(function (x, i) { var r = row(H, x, '', '달'); r.m = new Date(x.startMs + 9 * 3600e3).getUTCMonth() + 1; r.term = x.termName; r.label = r.m + '월 ' + M.gzNameK(x); return r; });
    var dw = sd.currentDaewoon, se = sd.sewoon, chain = [dw && dw.ganzhi + ' 대운(' + (SEA[dw.season] || '') + ')', se && se.year + '년 ' + se.ganzhi + '(' + (SEA[se.season] || '') + ')', rows[0] && rows[0].m + '월 ' + M.gzNameK(all[ci]) + '(' + (SEA[rows[0].season] || '') + ')'].filter(Boolean);
    var out = [scene(sec('', cap('월운 지도 · 앞으로 12개월') + '<p class="lead">월운은 <b>달마다 바뀌는 교통 상황</b>이에요. 큰 도로(대운) → 오늘의 날씨(세운) → 이번 달 교통 상황(월운) 순서로 겹쳐서 읽습니다.</p><p class="dp-chain">' + chain.map(esc).join('  →  ') + '</p>' + line(rows, rows.map(function (r) { return r.m + '월'; }), 0))),
      scene(sec('', cap('달마다 하게 될 일') + rows.map(function (r, i) { return card(Object.assign({}, r, { label: r.label }), r.m + '월', r.term + ' 절기 시작', i === 0); }).join(''))),
      scene(sec('', cap('월운으로 보는 기회의 달 · 방어의 달') + cands(rows, function (r) { return r.m + '월 ' + r.label.replace(/^\d+월 /, ''); }, '달')))];
    return { title: '월운 지도', sub: '앞으로 12개월, 달마다 하게 될 일', scenes: out, rows: rows };
  };

  // ───────── 개운법: 명리 근거 ─────────
  var EL = { 목: { color: '초록·청록', dir: '동쪽', num: '3·8', season: '봄', taste: '신맛(식초·과일)', time: '오전 3~9시', mat: '나무·식물·종이·면', act: '숲 산책, 식물 키우기, 새로운 공부 시작', env: '교육·기획·성장하는 분야' },
    화: { color: '붉은색·주황·보라', dir: '남쪽', num: '2·7', season: '여름', taste: '쓴맛(커피·쌉싸름한 채소)', time: '오전 9시~오후 3시', mat: '조명·전기·실크', act: '햇볕 쬐기, 사람 만나는 모임, 열정을 쓰는 운동', env: '방송·표현·사람을 상대하는 분야' },
    토: { color: '노랑·베이지·황토', dir: '중앙·남서쪽', num: '5·10', season: '환절기(늦여름)', taste: '단맛(곡물·고구마)', time: '오후 1~5시', mat: '흙·도자기·가죽', act: '꾸준한 루틴, 정리정돈, 걷기·텃밭', env: '안정·신용·중개·부동산 분야' },
    금: { color: '흰색·은색·회색', dir: '서쪽', num: '4·9', season: '가을', taste: '매운맛(생강·마늘)', time: '오후 3~9시', mat: '금속·유리·돌', act: '정리·결단, 호흡·근력 운동, 불필요한 것 비우기', env: '법·기술·금융·정밀한 분야' },
    수: { color: '검정·남색·짙은 파랑', dir: '북쪽', num: '1·6', season: '겨울', taste: '짠맛(해조류·생선)', time: '밤 9시~새벽 3시', mat: '물·유리·검은 소재', act: '수영·반신욕, 충분한 수면, 조용한 사색·기록', env: '연구·유통·이동·정보 분야' } };
  var ELKEY = ['목', '화', '토', '금', '수'];
  S.deep_remedy = function (H) {
    var sd = H.sd, u = sd.usefulElements, out = [], ch = H.ch, temp = ch.climate && ch.climate.temp, hum = ch.climate && ch.climate.hum;
    var need = u ? [u.yong, u.hee].filter(Boolean) : [sd.weakestEl], avoid = u ? ELKEY.filter(function (e) { return /기신/.test(u.roles[e] || ''); }) : [], less = u ? ELKEY.filter(function (e) { return /구신/.test(u.roles[e] || ''); }) : [];
    var cl = temp > 0.4 ? '원국이 덥고 ' + (hum < -0.3 ? '건조해서' : '습기가 적어서') + ' 식혀 주는 기운(수·금)이 도움이 됩니다.' : temp < -0.4 ? '원국이 차가워서 데워 주는 기운(화·목)이 도움이 됩니다.' : '원국의 온도는 크게 치우치지 않았습니다.';
    out.push(scene(sec('', cap('개운법의 근거 · 왜 이 기운이 필요한가') + '<p class="lead">개운법은 "좋다더라"가 아니라 사주에서 <b>무엇이 모자라고 무엇이 넘치는지</b>를 보고 정합니다. ' + esc(who(H)) + '의 근거는 이렇습니다.</p>' +
      '<div class="dp-why"><div><small>① 일간의 힘</small><b>' + esc(sd.strength.band) + '</b><span>' + esc(sd.strength.band === '신강' ? '내 편 기운이 많아, 힘을 빼 주고 쓸 곳을 만들어 주는 기운이 필요해요' : sd.strength.band === '신약' ? '내 편 기운이 적어, 나를 받쳐 주는 기운이 필요해요' : '힘의 균형이 맞아, 치우침만 다듬으면 돼요') + '</span></div>' +
      '<div><small>② 기후(조후)</small><b>' + (temp > 0.4 ? '더운 편' : temp < -0.4 ? '찬 편' : '고른 편') + '</b><span>' + esc(cl) + '</span></div><div><small>③ 오행의 부족·과잉</small><b>' + esc((sd.lackEl ? sd.lackEl + ' 부족' : '큰 부족 없음') + ' · ' + sd.dominantEl + ' 과다') + '</b><span>부족한 기운은 채우고 넘치는 기운은 덜 쓰는 쪽으로 균형을 맞춥니다.</span></div></div>' +
      '<p class="lead rd-hl">필요한 기운: <b>' + need.map(function (e) { return e + '(' + EL_HJ[e] + ')'; }).join(' · ') + '</b>' + (avoid.length ? '<br><span style="font-size:.9em">줄일 기운: ' + avoid.map(function (e) { return e + '(' + EL_HJ[e] + ')'; }).join(' · ') + (less.length ? ' (조금 덜어낼 기운: ' + less.join('·') + ')' : '') + '</span>' : '') + '</p>')));
    var it = function (e, label, key, why) { var d = EL[e]; return '<div class="dp-rem"><div class="dp-rem1"><b>' + esc(label) + '</b><span>' + esc(d[key]) + '</span></div><p><em>명리 근거</em> ' + esc(why) + '</p></div>'; };
    var e1 = need[0] || sd.weakestEl, e2 = need[1] || e1, nm = function (e) { return e + '(' + EL_HJ[e] + ')'; };
    out.push(scene(sec('', cap('생활 속 개운법') + it(e1, '입는 색', 'color', nm(e1) + '이 가장 필요한 기운이라, 색으로 그 기운을 가까이 두면 마음이 안정됩니다.') + it(e1, '머물면 좋은 방향', 'dir', nm(e1) + '은 ' + EL[e1].dir + '에 해당해, 책상·침대 머리 방향을 맞추면 기운을 받기 좋다고 봅니다.') + it(e1, '좋은 시간대', 'time', nm(e1) + ' 기운이 강한 시간에 중요한 일을 두면 힘이 덜 듭니다.') + it(e2, '곁에 둘 것', 'mat', nm(e2) + '(희신)은 용신을 도와주는 기운이라 소재로 보완합니다.') + it(e2, '행동으로 옮기기', 'act', nm(e2) + ' 성질의 활동이 부족한 기운을 몸으로 채워 줍니다.') + it(e1, '맞는 일의 환경', 'env', nm(e1) + '을 키우는 환경에서 일할 때 사주의 균형이 맞습니다.') +
      (avoid[0] ? '<div class="dp-rem warn"><div class="dp-rem1"><b>줄이면 좋은 것</b><span>' + esc(EL[avoid[0]].color + ' 위주의 과한 사용 · ' + EL[avoid[0]].time + ' 과로') + '</span></div><p><em>명리 근거</em> ' + esc(nm(avoid[0]) + '은 기신이라 많아질수록 부담이 커집니다. 끊으라는 뜻이 아니라 비중을 줄이라는 뜻이에요.') + '</p></div>' : ''))));
    return { title: '개운법의 근거', sub: '무엇이 모자라고 넘치는지로 정한 생활 개운', scenes: out };
  };

  // ───────── 명소(명산대천·풍수 명당) ─────────
  var PLACES = {
    목: [['담양 죽녹원·메타세쿼이아길', '전남 담양', '명당·숲', '곧게 자라는 대나무와 숲이 모여 막힌 기운을 위로 틔워 주는 목(木) 기운의 길지'], ['제주 비자림·곶자왈', '제주', '숲', '천 년 숲의 푸른 생기, 성장과 회복의 목 기운이 강한 곳'], ['설악산 권금성·울산바위', '강원 속초', '명산(동악 계열)', '동쪽 산의 맑은 양기, 새로운 시작과 도약에 좋다고 전해지는 곳'], ['강릉 정동진·경포 해돋이', '강원 강릉', '해돋이', '동쪽 바다에서 해가 솟는 자리, 목·화의 시작 기운'], ['오대산 월정사 전나무숲길', '강원 평창', '명산·사찰', '곧은 전나무 숲과 사찰의 고요함이 목 기운과 안정을 함께 줍니다']],
    화: [['여수 향일암 해돋이', '전남 여수', '해돋이·사찰', '남쪽 바다 절벽 위 일출 명소, 화(火) 기운이 가장 강한 자리로 꼽히는 곳'], ['지리산 노고단(남악)', '전남 구례', '명산(오악 중 남악)', '오악 중 남악으로 따뜻하고 웅장한 화·토 기운이 모인다고 전해지는 곳'], ['부산 해운대·동백섬', '부산', '해안 명소', '남쪽 해안의 밝고 열린 기운, 활력과 인연을 부르는 곳'], ['한라산 영실·백록담', '제주', '명산', '남쪽 화산의 불 기운, 열정과 돌파가 필요할 때'], ['남해 보리암 일출', '경남 남해', '기도 도량', '남쪽 바다를 내려다보는 기도처, 화 기운과 소원 성취로 알려진 곳']],
    토: [['안동 하회마을', '경북 안동', '풍수 명당', '낙동강이 마을을 감싸 도는 연화부수형 명당, 토(土) 기운의 안정과 재물이 모인다는 곳'], ['경주 불국사·토함산', '경북 경주', '명산·사찰', '신라 천년의 땅, 토 기운의 포용과 안정'], ['북한산 인수봉(삼각산)', '서울', '명산(오악 중 중악)', '한양을 지키는 중악으로 중심을 잡아 주는 토·금 기운'], ['계룡산 신원사', '충남 공주', '명산·기도 도량', '풍수에서 큰 기운이 모인다고 하는 산, 토 기운의 중후함'], ['속리산 법주사', '충북 보은', '명산·사찰', '땅의 기운을 갈무리해 두는 곳, 토 기운과 평온']],
    금: [['강화 마니산 참성단', '인천 강화', '기(氣) 명소', '단군이 제를 올렸다는 곳으로 한국의 대표적 기 명소, 금(金) 기운의 단단함'], ['월출산 천황봉', '전남 영암', '명산', '바위 기운이 강한 서남쪽 명산, 금 기운과 결단'], ['변산반도 채석강·내소사', '전북 부안', '해안·사찰', '서해 절벽과 사찰, 맑고 단단한 금 기운'], ['태안 안면도 꽃지해변 일몰', '충남 태안', '일몰 명소', '서쪽 바다의 일몰, 금 기운의 정리와 마무리'], ['대구 팔공산 갓바위', '대구', '기도 도량', '소원을 들어준다고 알려진 석불, 금 기운과 집중']],
    수: [['양평 두물머리', '경기 양평', '풍수 명당(합수)', '두 강이 만나는 합수 자리, 수(水) 기운과 인연·소통'], ['춘천 소양강·의암호', '강원 춘천', '호반', '북쪽의 맑은 물, 수 기운의 차분함'], ['울릉도·독도', '경북', '섬', '동해 한가운데 크게 흐르는 수 기운'], ['제주 정방폭포·서귀포 바다', '제주', '폭포·바다', '물이 바다로 곧장 떨어지는 폭포, 수 기운의 정화'], ['동해 묵호·추암 촛대바위 새벽', '강원 동해', '새벽 바다', '북동쪽 새벽 바다, 수 기운과 지혜']],
  };
  var ROLE_BASE = { 용신: 92, 희신: 83, 한신: 64, 구신: 50, 기신: 38 };
  S.deep_places = function (H) {
    var sd = H.sd, u = sd.usefulElements, list = [];
    ELKEY.forEach(function (e) { var role = u ? (u.roles[e] || '한신') : '한신'; PLACES[e].forEach(function (p, i) { var sc = (ROLE_BASE[role] || 60) - i * 2 + (e === sd.lackEl ? 4 : 0) + (u ? 0 : (e === sd.weakestEl ? 12 : 0)); list.push({ p: p, el: e, role: role, score: clamp(sc, 20, 98) }); }); });
    list.sort(function (a, b) { return b.score - a.score; }); var top = list.slice(0, 7);
    var out = [scene(sec('', cap('나에게 맞는 명산대천 · 풍수 명당') + '<p class="lead">' + esc(who(H)) + '에게 필요한 기운(' + esc(u ? u.yong + '(' + EL_HJ[u.yong] + ') 용신' + (u.hee ? ' · ' + u.hee + '(' + EL_HJ[u.hee] + ') 희신' : '') : '부족한 오행') + ')을 오행 방위·산세·물길로 풀어 <b>실제로 갈 수 있는 곳</b>을 점수 순으로 골랐어요. 전통적으로 알려진 기운의 해석이며, 여행 겸 기분 전환으로 가볍게 활용해 주세요.</p>')),
      scene(sec('', top.map(function (x, i) { return '<div class="dp-place"><div class="dp-rank">' + (i + 1) + '</div><div class="dp-pl1"><b>' + esc(x.p[0]) + '</b><small>' + esc(x.p[1] + ' · ' + x.p[2]) + '</small>' + bar('', x.score, { cls: 'dp-slim', color: D.EL_COLOR[x.el], text: x.score + '점' }) + '<p>' + esc('나에게 ' + x.role + '인 ' + x.el + '(' + EL_HJ[x.el] + ') 기운 — ' + x.p[3]) + '</p></div></div>'; }).join('')))];
    return { title: '나에게 맞는 명소', sub: '명산대천 · 풍수 명당 · 해돋이 순위', scenes: out };
  };

  /* ═════ 챕터 끼워 넣기 ═════ */
  var PLACEMENT = [['c03', 'deep_car'], ['c05', 'deep_proscons'], ['deep_proscons', 'deep_stages'], ['c06', 'deep_jobs'], ['c10', 'deep_spouse'], ['c12', 'deep_ilju'], ['c14', 'deep_past'], ['c15', 'deep_daewoon'], ['c17', 'deep_seun'], ['c18', 'deep_wolun'], ['c19', 'deep_remedy'], ['deep_remedy', 'deep_places']];
  function chapter(id, o, scenes, anchor) {
    var intro = { sceneId: id + '_in', sceneType: 'chapterIntro', subtitle: o.sub || '', compact: true };
    return { id: id, base: id, project: anchor.project || 'full', kind: 'life', accessLevel: anchor.accessLevel || 'free', title: o.title, subtitle: o.sub || '', headline: o.sub || '', introText: '', moduleCategories: [], scenes: [intro].concat(scenes), enabled: true, act: anchor.act, deep: true, aiEnabled: false, items: o.rows || null };
  }
  // rep.chapters 에 새 챕터를 끼운다(없는 앵커는 건너뜀). 하나가 실패해도 나머지는 계속한다.
  function augment(rep, H) {
    if (!rep || !rep.chapters || !H || !H.M || !H.ch || !H.sd) return rep; var done = 0;
    PLACEMENT.forEach(function (pl) {
      var i = -1; rep.chapters.forEach(function (c, k) { if ((c.base || c.id) === pl[0] || c.id === pl[0]) i = k; });
      if (i < 0 || rep.chapters.some(function (c) { return c.id === pl[1]; })) return;
      try { var o = S[pl[1]](H); if (!o || !o.scenes || !o.scenes.length) return; rep.chapters.splice(i + 1, 0, chapter(pl[1], o, o.scenes, rep.chapters[i])); done++; } catch (e) { if (root.console && console.warn) console.warn('deep ' + pl[1], e && e.message); }
    });
    rep.chapters.forEach(function (c, k) { c.no = k + 1; });
    rep.meta = rep.meta || {}; rep.meta.deep = done; return rep;
  }
  Object.assign(R.Deep, { augment: augment, PLACEMENT: PLACEMENT, PLACES: PLACES, line: line });
})(typeof window !== 'undefined' ? window : globalThis);
