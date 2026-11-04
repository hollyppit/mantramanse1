/* 공간·명당 풍수 계산 엔진: 현공비성(삼원구운·24산·운반·산성·향성·연비성·월비성), 팔택(본명괘·동서사택·팔유성), 형세.
   브라우저·Node·Cloudflare Functions 공용. AI 호출·네트워크 없음. 사주 계산(engine.js)은 읽기만 하고 바꾸지 않는다.
   원칙
   · 세 이론은 서로 독립적으로 계산한다. 점수를 임의로 합산하지 않고, 이론별 판정을 나란히 두고 “몇 가지가 같은 방향인지”만 표시한다.
   · 유파별 기준과 예외는 SCHOOL / EXCEPTIONS 에 명시한다. 이 앱이 지원하지 않는 규칙(체괘 등)은 계산에 쓰지 않고 경고로 알린다.
   · 입력이 없거나 모호하면 추정하지 않고 unknown 으로 표시한다.
   사용: MantraFengshui.xuankong({ facingDeg, builtYear, renovationYear, evalYear }) 등 */
(function (G) {
  'use strict';
  var D = G.MantraFengshuiData; if (!D || !D.STAR) throw new Error('fengshui-data.js 를 먼저 불러오세요');
  var VERSION = 'fengshui-engine-20261105-1';
  var mod = function (a, n) { return ((a % n) + n) % n; };
  var wrap9 = function (n) { return mod(n - 1, 9) + 1; };

  // ───────────── 유파 기준 (명시) ─────────────
  var SCHOOL = {
    name: '현공비성 기본 원반(정향) · 삼원구운 · 입춘 기준',
    periodBoundary: '입춘(양력 2월 4일경)을 운의 경계로 본다. 입춘 당일에 해당하면 경계 경고를 낸다.',
    yuan: '상원 1864~1923(1·2·3운), 중원 1924~1983(4·5·6운), 하원 1984~2043(7·8·9운). 20년마다 운이 바뀐다.',
    chartBasis: '건물의 운반은 준공(입주)연도 기준이며, 전면 개축·대수리를 입력하면 그 연도를 새 기준으로 삼는다.',
    stateBasis: '별의 상태(당령·생기·퇴기·쇠살)는 평가 시점의 운을 기준으로 판정한다. 건물 운반은 바뀌지 않는다.',
    fiveRule: '입중하는 별이 5이면 산성은 좌(坐)산, 향성은 향(向)산의 음양을 따른다.',
    kimThreshold: 4.5,       // 산 중심에서 이 각도(°)를 넘으면 겸향으로 표시
    gongmangWidth: 1.5,      // 경계에서 이 각도(°) 이내면 공망 경고
  };
  var EXCEPTIONS = [
    '체괘(替卦): 겸향이 큰 경우 별을 바꿔 쓰는 유파가 있으나 이 앱은 원반 정향 계산만 하고, 겸향·경계 부근은 경고로 표시합니다.',
    '반음·복음: 유파마다 정의가 달라 전판이 운반과 같은 복음만 표시하고 반음은 계산하지 않습니다.',
    '성문결·쌍성합십 등 고급 격국은 합십(合十)만 표시하고 그 밖의 격국은 계산하지 않습니다.',
    '동지/하지 이후 연비성 전환 등 연·월 경계는 입춘과 월 절기 기준입니다(절기 시각 직전·직후는 월주를 확인하세요).',
    '팔택은 본명괘(출생년 입춘 기준)와 집의 좌(坐)괘를 쓰며, 시간에 따라 변하는 규칙은 포함하지 않습니다.',
    '형세풍수는 사용자가 입력한 지형 항목만 해석하며 지도·도면 자동 인식은 하지 않습니다.',
  ];

  // ───────────── 24산 ─────────────
  var MT_HJ = ['子', '癸', '丑', '艮', '寅', '甲', '卯', '乙', '辰', '巽', '巳', '丙', '午', '丁', '未', '坤', '申', '庚', '酉', '辛', '戌', '乾', '亥', '壬'];
  var MT_KO = ['자', '계', '축', '간', '인', '갑', '묘', '을', '진', '손', '사', '병', '오', '정', '미', '곤', '신', '경', '유', '신', '술', '건', '해', '임'];
  var YUAN = ['지', '천', '인'];            // 지원룡·천원룡·인원룡
  var LO_ORDER = [8, 7, 6, 1, 4, 0, 5, 2, 3]; // 비행 경로: 중궁 → 건 → 태 → 간 → 이 → 감 → 곤 → 진 → 손 (궁 번호: 0감 1간 2진 3손 4이 5곤 6태 7건, 8중)
  var LO_IDX = { 1: 0, 8: 1, 3: 2, 4: 3, 9: 4, 2: 5, 7: 6, 6: 7 };   // 낙서 숫자 → 궁
  var LO_NUM = [1, 8, 3, 4, 9, 2, 7, 6, 5];                           // 궁 → 낙서 숫자
  var P = D.PALACE;

  function mountain(i) {
    var j = mod(i + 1, 24), t = Math.floor(j / 3), y = j % 3, card = t % 2 === 0;
    var yy = card ? (y === 2 ? -1 : 1) : (y === 2 ? 1 : -1);   // 사정방(감진이태): 천·지 양, 인 음 / 사우(간손곤건): 천·지 음, 인 양
    return { i: i, hj: MT_HJ[i], ko: MT_KO[i], t: t, yuan: y, yuanName: YUAN[y], yy: yy, yyName: yy > 0 ? '양' : '음', center: i * 15, label: MT_KO[i] + '(' + MT_HJ[i] + ')' };
  }
  var MTS = []; for (var q = 0; q < 24; q++) MTS.push(mountain(q));

  function mountainAt(deg, kimT, gmW) {
    deg = mod(+deg, 360); kimT = kimT == null ? SCHOOL.kimThreshold : kimT; gmW = gmW == null ? SCHOOL.gongmangWidth : gmW;
    var i = Math.floor(mod(deg + 7.5, 360) / 15), off = mod(deg - i * 15 + 180, 360) - 180, mt = MTS[i];
    var nb = off >= 0 ? MTS[mod(i + 1, 24)] : MTS[mod(i - 1, 24)], edge = 7.5 - Math.abs(off);
    var out = { mt: mt, deg: Math.round(deg * 10) / 10, offset: Math.round(off * 10) / 10, kim: null, gongmang: null };
    if (Math.abs(off) > kimT) out.kim = { toward: nb, text: mt.label + '산에서 ' + Math.abs(Math.round(off * 10) / 10) + '° 벗어나 ' + nb.label + ' 쪽에 가까운 겸향입니다.' };
    if (edge < gmW) out.gongmang = { big: nb.t !== mt.t, text: (nb.t !== mt.t ? '대공망선' : '소공망선') + '(' + mt.label + '·' + nb.label + ' 경계) 부근입니다. 각도 측정이 조금만 달라도 판정이 바뀝니다.' };
    return out;
  }

  // ───────────── 삼원구운 ─────────────
  // Y: 입춘 기준 연도. 날짜(y,m,d)를 주면 입춘 이전(2/4 이전)은 전년으로 본다.
  function lichunYear(y, m, d) { if (m == null) return y; return (m < 2 || (m === 2 && d < 4)) ? y - 1 : y; }
  function periodOfYear(Y) { var n = mod(Y - 1864, 180); return Math.floor(n / 20) + 1; }
  function yuanOfYear(Y) { return ['상원', '중원', '하원'][Math.floor(mod(Y - 1864, 180) / 60)]; }
  function periodRange(p) { var base = 1864 + (p - 1) * 20; return [base, base + 19]; }
  function boundaryWarn(m, d) { return m === 2 && d >= 3 && d <= 5 ? '입춘(2월 4일경) 전후라 운·연이 바뀔 수 있습니다. 정확한 입춘 시각으로 확인하세요.' : null; }

  // ───────────── 비행 ─────────────
  function fly(center, dir) { var a = new Array(9); for (var k = 0; k < 9; k++) a[LO_ORDER[k]] = wrap9(center + dir * k); return a; }
  function startDir(n, mt) {
    if (n === 5) return mt.yy;
    var t = LO_IDX[n]; for (var i = 0; i < 24; i++) if (MTS[i].t === t && MTS[i].yuan === mt.yuan) return MTS[i].yy;
    return 1;
  }
  // 별 상태: 평가 운(p) 기준
  function stateOf(star, p) { if (star === p) return 'wang'; if (star === wrap9(p + 1) || star === wrap9(p + 2)) return 'sheng'; if (star === wrap9(p - 1)) return 'tui'; return 'sha'; }
  var TONE = { 1: { wang: 2, sheng: 1.5, tui: .5, sha: 0 }, 2: { wang: 0, sheng: -.5, tui: -1.5, sha: -2 }, 3: { wang: 1, sheng: 0, tui: -1, sha: -1.5 }, 4: { wang: 2, sheng: 1, tui: 0, sha: -1 }, 5: { wang: 0, sheng: -1, tui: -2, sha: -2.5 },
    6: { wang: 2, sheng: 1.5, tui: .5, sha: 0 }, 7: { wang: 1.5, sheng: .5, tui: -1, sha: -1.5 }, 8: { wang: 2, sheng: 1.5, tui: .5, sha: 0 }, 9: { wang: 2, sheng: 1.5, tui: .5, sha: -.5 } };
  var toneOf = function (star, state) { return TONE[star][state]; };

  function xuankong(o) {
    o = o || {};
    var facingDeg = +o.facingDeg; if (!isFinite(facingDeg)) throw new Error('향(向)의 각도를 입력하세요');
    var built = o.builtYear != null && o.builtYear !== '' ? +o.builtYear : null, reno = o.renovationYear != null && o.renovationYear !== '' ? +o.renovationYear : null;
    var warnings = [], assumptions = [];
    var basisYear = reno || built;
    if (!basisYear) { basisYear = o.evalYear || new Date().getFullYear(); assumptions.push('건축·개축 연도가 없어 평가 시점의 운을 건물 기준으로 가정했습니다. 건축 연도를 입력하면 정확해집니다.'); }
    if (basisYear < 1864 || basisYear > 2103) throw new Error('1864~2103년만 지원합니다');
    var evalYear = +o.evalYear || new Date().getFullYear();
    var period = periodOfYear(basisYear), nowPeriod = periodOfYear(evalYear);
    if (reno && built && reno < built) warnings.push('개축 연도가 건축 연도보다 앞서 있습니다. 입력을 확인하세요.');
    if (built && !reno && o.builtMonth != null) { var bw = boundaryWarn(+o.builtMonth, +o.builtDay || 0); if (bw && (basisYear % 20 === 4 || basisYear % 20 === 3)) warnings.push(bw); }
    var xm = mountainAt(facingDeg, o.kimThreshold, o.gongmangWidth), sm = mountainAt(facingDeg + 180, o.kimThreshold, o.gongmangWidth);
    if (xm.kim) warnings.push(xm.kim.text + ' 이 앱은 체괘를 쓰지 않고 정향으로 계산합니다. 유파에 따라 결과가 달라질 수 있습니다.');
    if (xm.gongmang) warnings.push(xm.gongmang.text);
    var yun = fly(period, 1);
    var sN = yun[sm.mt.t], xN = yun[xm.mt.t];
    var sDir = startDir(sN, sm.mt), xDir = startDir(xN, xm.mt);
    var shan = fly(sN, sDir), xiang = fly(xN, xDir);
    var chart = { version: VERSION, input: { facingDeg: facingDeg, builtYear: built, renovationYear: reno, evalYear: evalYear }, period: period, periodRange: periodRange(period), yuan: yuanOfYear(basisYear), nowPeriod: nowPeriod, basisYear: basisYear,
      facing: xm, sitting: sm, boards: { yun: yun, shan: shan, xiang: xiang }, start: { shan: { star: sN, dir: sDir }, xiang: { star: xN, dir: xDir } }, warnings: warnings, assumptions: assumptions, school: SCHOOL.name };
    chart.pattern = patternOf(chart, period); chart.patternNow = patternOf(chart, nowPeriod);   // 격국은 건물 운 기준, 지금 운 기준은 patternNow
    chart.fuyin = xiang[8] === period && xDir === 1 && shan[8] === period && sDir === 1;
    chart.palaces = palaces(chart, nowPeriod);
    if (period !== nowPeriod) chart.assumptions.push('건물은 ' + period + '운 기준 배치이고 지금은 ' + nowPeriod + '운입니다. 별의 힘(당령·퇴기 등)은 지금 운 기준으로 판정했습니다.');
    return chart;
  }
  function patternOf(c, p) {
    var z = c.sitting.mt.t, x = c.facing.mt.t, S = c.boards.shan, X = c.boards.xiang;
    var wz = S[z] === p, wx = X[x] === p, ux = S[x] === p, dz = X[z] === p;
    var id = 'none', name = '특수 격국 없음', text = '운(令)의 별이 좌·향에 특별히 몰리지 않은 보통 배치입니다. 방별 별의 상태를 따로 보세요.';
    if (wz && wx) { id = 'wangsan-wanghyang'; name = '旺山旺向(왕산왕향)'; text = '산성이 좌에, 향성이 향에 놓여 사람·건강과 재물·사회운이 모두 제 자리를 얻은 가장 안정된 배치로 봅니다.'; }
    else if (ux && dz) { id = 'sangsan-hasu'; name = '上山下水(상산하수)'; text = '산성이 향으로, 향성이 좌로 거꾸로 놓여 사람·재물 흐름이 어긋나기 쉽다고 보는 배치입니다. 방 쓰임을 조정해 보완합니다.'; }
    else if (ux && wx) { id = 'ssanghyang'; name = '雙星會向(쌍성회향)'; text = '산성과 향성이 모두 향쪽에 모입니다. 앞쪽(향)이 탁 트이고 물이나 길이 있으면 힘을 받는다고 보는 배치입니다.'; }
    else if (wz && dz) { id = 'ssangjwa'; name = '雙星會坐(쌍성회좌)'; text = '산성과 향성이 모두 좌(뒤)쪽에 모입니다. 뒤쪽에 산이나 높은 건물이 받쳐 주면 힘을 받는다고 보는 배치입니다.'; }
    return { id: id, name: name, text: text, flags: { wangsan: wz, wanghyang: wx, sangsan: ux, hasu: dz } };
  }
  function palaces(c, p) {
    var out = [], b = c.boards;
    for (var i = 0; i < 9; i++) {
      var yn = b.yun[i], sn = b.shan[i], xn = b.xiang[i], ss = stateOf(sn, p), xs = stateOf(xn, p), notes = [];
      var hs = []; if (yn + sn === 10) hs.push('운·산'); if (yn + xn === 10) hs.push('운·향'); if (sn + xn === 10) hs.push('산·향');
      if (hs.length) notes.push({ id: 'heshi', text: '합십(合十) — ' + hs.join('·') + ' 별의 합이 10이 되어 서로 돕는 짝으로 보며, 흉성의 기운이 누그러진다고 해석합니다.', tone: 1 });
      var has = function (n) { return yn === n || sn === n || xn === n; };
      if (has(2) && has(5)) notes.push({ id: 'er-wu', text: '이흑·오황이 한 궁에 겹쳐(二五交加) 건강·사고에 특히 신경 써야 하는 조합으로 전해집니다. 이 궁은 오래 머무는 용도를 피하세요.', tone: -2 });
      if (has(3) && has(7)) notes.push({ id: 'san-qi', text: '삼벽·칠적이 겹쳐 말다툼·도난에 유의하는 조합으로 전해집니다. 현금과 문단속을 점검하세요.', tone: -1 });
      var pal = i < 8 ? P[i] : { key: 'C', gua: '중궁', dir: '중앙', el: 2, deg: null, lo: 5 };
      out.push({ idx: i, key: pal.key, gua: pal.gua, dir: pal.dir, el: pal.el, yun: yn, shan: sn, xiang: xn, shanState: ss, xiangState: xs, shanTone: toneOf(sn, ss), xiangTone: toneOf(xn, xs), notes: notes,
        shanText: D.STAR_TXT[sn].san[ss], xiangText: D.STAR_TXT[xn].hyang[xs], remedy: (toneOf(sn, ss) < 0 ? D.REMEDY[sn] : null) || (toneOf(xn, xs) < 0 ? D.REMEDY[xn] : null) || null });
    }
    return out;
  }
  function restate(c, period) { var o = JSON.parse(JSON.stringify(c)); o.nowPeriod = period; o.patternNow = patternOf(c, period); o.palaces = palaces(c, period); return o; }

  // ───────────── 연비성·월비성·삼살 ─────────────
  function yearCenter(Y) { var n = mod(Y - 1864, 180), yuan = Math.floor(n / 60), start = [1, 4, 7][yuan], k = n % 60; return wrap9(start - k); }
  function yearBranch(Y) { return mod(Y - 4, 12); }
  // 자오묘유년 정월(寅月) 중궁 8, 진술축미년 5, 인신사해년 2 — 이후 달마다 1씩 줄어든다
  function monthCenter(Y, mIdx) { var g = [8, 5, 2][yearBranch(Y) % 3]; return wrap9(g - (mIdx - 1)); }
  function monthIndexFromBranch(b) { return mod(b - 2, 12) + 1; }   // 寅月 = 1 ... 丑月 = 12
  var SAMSAL_GROUP = { 8: 0, 0: 0, 4: 0, 11: 1, 3: 1, 7: 1, 2: 2, 6: 2, 10: 2, 5: 3, 9: 3, 1: 3 };
  var SAMSAL_DIR = [['남', [5, 6, 7], 180], ['서', [8, 9, 10], 270], ['북', [11, 0, 1], 0], ['동', [2, 3, 4], 90]];
  function overlay(c, Y, mIdx) {
    var yc = yearCenter(Y), yb = fly(yc, 1), mc = mIdx ? monthCenter(Y, mIdx) : null, mb = mc ? fly(mc, 1) : null, p = periodOfYear(Y);
    var sam = SAMSAL_DIR[SAMSAL_GROUP[yearBranch(Y)]], tdeg = yearBranch(Y) * 30;
    var base = c ? c.palaces : P.map(function (q, k) { return { idx: k, key: q.key, dir: q.dir, shan: 0, xiang: 0 }; });   // 건물 없이(c=null) 연·월 흐름만 볼 수도 있다
    var cells = base.map(function (pl) {
      var i = pl.idx, y = yb[i], m = mb ? mb[i] : null, notes = [];
      if (y === 5) notes.push({ id: 'y5', tone: -2, text: '올해 오황이 들어온 방위입니다. 공사·큰 가구 이동·소음을 삼가고 오래 머무는 자리로 쓰지 마세요.' });
      if (y === 2) notes.push({ id: 'y2', tone: -1, text: '올해 이흑이 들어온 방위입니다. 건강 관리에 신경 쓰고 자주 환기하세요.' });
      if (y === 8 || y === 9 || y === 1) notes.push({ id: 'y' + y, tone: 1, text: '올해 길한 별(' + D.STAR[y].name + ')이 들어온 방위입니다. 밝고 깨끗하게 쓰면 좋습니다.' });
      if (m === 5 && i < 8) notes.push({ id: 'm5', tone: -1, text: '이번 달 오황이 들어온 방위입니다. 한 달 동안 공사·이동을 미루세요.' });
      if (i < 8 && (pl.shan === 5 || pl.xiang === 5) && y === 5) notes.push({ id: 'c5', tone: -2, text: '건물의 오황 자리에 올해 오황까지 겹쳐 특히 조심해야 하는 해입니다.' });
      return { idx: i, key: pl.key, dir: pl.dir, yearStar: y, monthStar: m, notes: notes };
    });
    return { year: Y, month: mIdx || null, period: p, yearCenter: yc, monthCenter: mc, cells: cells,
      taesae: { branch: MT_KO[yearBranch(Y) * 2], deg: tdeg, dir: dirName(tdeg), text: '태세(太歲) 방위: ' + dirName(tdeg) + '. 이 방위에서 땅을 파거나 큰 공사를 하는 것은 피하는 것이 전통입니다.' },
      sepa: { deg: mod(tdeg + 180, 360), dir: dirName(mod(tdeg + 180, 360)), text: '세파(歲破) 방위: ' + dirName(mod(tdeg + 180, 360)) + '. 태세 맞은편으로, 이 방위의 공사도 조심합니다.' },
      samsal: { dir: sam[0], text: '삼살(三煞) 방위: ' + sam[0] + '쪽(' + sam[1].map(function (b) { return MT_KO[b * 2]; }).join('·') + '). 이사·수리·문을 내는 일은 이 방향을 피하는 것이 전통입니다.' } };
  }
  function dirName(deg) { return P[Math.round(mod(deg, 360) / 45) % 8].dir; }

  // ───────────── 팔택 ─────────────
  var TRI = ['010', '001', '100', '011', '101', '000', '110', '111'];   // 궁 순서: 감 간 진 손 이 곤 태 건 (아래→위 효, 1=양)
  var CHG = { '001': 'sheng', '110': 'tian', '111': 'yan', '000': 'fu', '100': 'huo', '011': 'wugui', '101': 'liusha', '010': 'jue' };
  var GUA_TO_T = { 1: 0, 8: 1, 3: 2, 4: 3, 9: 4, 2: 5, 7: 6, 6: 7 };
  var EAST = [0, 2, 3, 4];
  function kuaOf(birthYear, gender) {
    var Y = +birthYear, r = Y % 100; var s = (r % 10) + Math.floor(r / 10); while (s > 9) s = (s % 10) + Math.floor(s / 10);
    var male = gender !== 'F', k;
    if (Y < 2000) k = male ? 10 - s : 5 + s; else k = male ? 9 - s : 6 + s;
    while (k > 9) k = (k % 10) + Math.floor(k / 10); if (k <= 0) k = 9 + k;
    var adj = null; if (k === 5) { k = male ? 2 : 8; adj = '5는 방위가 없어 ' + (male ? '남성은 2(곤)' : '여성은 8(간)') + '으로 봅니다.'; }
    return { kua: k, t: GUA_TO_T[k], gua: D.GUA_NAME[k], group: EAST.indexOf(GUA_TO_T[k]) >= 0 ? 'east' : 'west', groupName: EAST.indexOf(GUA_TO_T[k]) >= 0 ? '동사명(東四命)' : '서사명(西四命)', note: adj, birthYear: Y };
  }
  function eightStars(t) {   // t: 기준 괘의 궁 번호 → 방위별 팔유성
    var base = TRI[t], res = [];
    for (var i = 0; i < 8; i++) { var s = ''; for (var b = 0; b < 3; b++) s += base[b] === TRI[i][b] ? '0' : '1'; var id = CHG[s]; res.push(Object.assign({ id: id, idx: i, dir: P[i].dir, key: P[i].key }, D.BAZHAI[id])); }
    return res;
  }
  function birthYearFromChart(ch) {   // 입춘 기준 출생연도 (사주 년주로 판정)
    var y = ch.pillars.year, n = -1; for (var i = 0; i < 60; i++) if (i % 10 === y.s && i % 12 === y.b) { n = i; break; }
    var sy = ch.solar.y; return mod(sy - 4, 60) === n ? sy : sy - 1;
  }
  function bazhai(o) {
    o = o || {}; var out = { warnings: [], assumptions: [] };
    var hs = o.sitDeg != null ? mountainAt(+o.sitDeg).mt : (o.facingDeg != null ? mountainAt(+o.facingDeg + 180).mt : null);
    if (hs) { out.house = { t: hs.t, gua: P[hs.t].gua, dir: P[hs.t].dir, group: EAST.indexOf(hs.t) >= 0 ? 'east' : 'west', groupName: EAST.indexOf(hs.t) >= 0 ? '동사택(東四宅)' : '서사택(西四宅)', sit: hs }; out.houseStars = eightStars(hs.t); }
    else out.warnings.push('집의 좌향이 없어 동서사택과 방위별 길흉을 계산하지 않았습니다.');
    if (o.birthYear) { out.person = kuaOf(o.birthYear, o.gender); out.personStars = eightStars(out.person.t); } else out.warnings.push('본명괘를 계산할 출생연도가 없습니다.');
    if (out.house && out.person) {
      var same = out.house.group === out.person.group; out.match = same ? 'match' : 'mismatch';
      out.matchText = same ? out.person.groupName + '인 본인과 ' + out.house.groupName + '이 같은 계열이라 택명상배(宅命相配)로 봅니다.' : out.person.groupName + '인 본인과 ' + out.house.groupName + '은 계열이 달라 택명상배가 맞지 않는 편으로 봅니다. 대신 개인 길방을 활용해 방을 배치하는 방법을 권합니다.';
    }
    return out;
  }

  // ───────────── 형세풍수 ─────────────
  function form(inp) {
    inp = inp || {}; var items = [], score = 0, given = 0, keys = Object.keys(D.FORM);
    keys.forEach(function (k) { var v = inp[k], f = D.FORM[k]; if (!v || !f.opts[v]) { items.push({ key: k, label: f.label, value: null, unknown: true, text: '입력되지 않아 판단하지 않았습니다.' }); return; } given++; var o = f.opts[v]; score += o[0]; items.push({ key: k, label: f.label, value: v, score: o[0], text: o[1] }); });
    var hz = []; (inp.hazards || []).forEach(function (h) { var d = D.HAZARD[h]; if (!d) return; score += d[1]; hz.push({ key: h, label: d[0], score: d[1], text: d[2] }); });
    var known = items.filter(function (x) { return !x.unknown; });
    var tone = given < 3 ? 'unknown' : score >= 4 ? 'good' : score >= 1 ? 'ok' : score >= -2 ? 'mixed' : 'caution';
    var label = { unknown: '입력 부족', good: '형세가 좋은 편', ok: '무난한 편', mixed: '장단점이 섞인 편', caution: '보완이 필요한 편' }[tone];
    var verdict = tone === 'unknown' ? '입력된 항목이 ' + given + '개뿐이라 형세 판단을 보류합니다. 뒤·앞·좌우·물길·도로 중 3가지 이상 입력해 주세요.' : label + '입니다. 입력하신 ' + given + '개 항목과 주변 요소 ' + hz.length + '개를 바탕으로 한 참고용 해석입니다.';
    return { items: items, hazards: hz, score: tone === 'unknown' ? null : score, tone: tone, label: label, given: given, total: keys.length, verdict: verdict, pros: known.filter(function (x) { return x.score > 0; }), cons: known.filter(function (x) { return x.score < 0; }).concat(hz) };
  }

  // ───────────── 사주 연결 (읽기만) ─────────────
  // 방위 오행이 이 사주에서 어떤 역할인지. 억부와 조후를 따로 보여 주고, 서로 다르면 갈린다고 표시한다.
  var EL5 = ['목', '화', '토', '금', '수'], ROLEV = { 용신: 2, 희신: 1, 한신: 0, 구신: -1, 기신: -2 };
  function sajuFit(ch, palIdx) {
    var e = P[palIdx].el, eok = ch.yongAll && ch.yongAll.eokbu, jo = ch.yongAll && ch.yongAll.johu;
    var re = eok && eok.roles ? eok.roles[e] : null, rj = jo && jo.applicable !== false && jo.roles ? jo.roles[e] : null;
    var ve = re ? ROLEV[re] : 0, vj = rj ? ROLEV[rj] : null, lvl = function (v) { return v >= 1 ? 1 : v <= -1 ? -1 : 0; };
    var le = lvl(ve), lj = vj == null ? null : lvl(vj), level, text;
    if (lj == null || lj === le) { level = le; text = EL5[e] + ' 기운은 억부로 ' + re + (rj ? '·조후로 ' + rj : '') + '입니다.'; }
    else { level = 0; text = EL5[e] + ' 기운은 억부로 ' + re + '이지만 조후로는 ' + rj + '이라 기준이 갈립니다. 한쪽으로 단정하지 않고 쓰임을 나누어 보세요.'; }
    return { el: e, elName: EL5[e], eokbu: re, johu: rj, level: level, split: lj != null && lj !== le, text: text };
  }

  // ───────────── 배치 판정 (이론별 독립) ─────────────
  var ROLE_W = { bed: [.7, .3], desk: [.7, .3], owner: [.7, .3], consult: [.6, .4], living: [.5, .5], door: [.3, .7], entrance: [.3, .7], cashier: [.2, .8], work: [.5, .5], stove: [.5, .5], wc: [.5, .5], store: [.5, .5] };
  var lvOf = function (v) { return v >= 1 ? 1 : v <= -1 ? -1 : 0; };
  function xkLevel(pal, role) {
    var w = ROLE_W[role] || [.5, .5], v = w[0] * pal.shanTone + w[1] * pal.xiangTone, bad = D.ROOM_KIND[role] === 'bad', lv = lvOf(v);
    var strongBad = pal.notes.some(function (n) { return n.id === 'er-wu'; });
    if (bad) { lv = v <= -1 ? 1 : v >= 1.2 ? -1 : 0; } else if (strongBad) lv = -1;
    return { level: lv, raw: Math.round(v * 10) / 10 };
  }
  function bzLevel(bz, palIdx, role) {
    if (!bz || !bz.personStars) return { level: null, text: '본명괘 정보가 없어 판단을 보류합니다.' };
    var st = bz.personStars[palIdx], bad = D.ROOM_KIND[role] === 'bad', lv;
    if (role === 'stove') { /* 주방은 화구가 향하는 방위의 흉성을 눌러 쓴다: 길방 쪽 화구는 길을 태운다고 본다 */ }
    if (bad) lv = st.good ? -1 : 1; else lv = st.good ? 1 : -1;
    return { level: lv, star: st, text: st.name + '(' + st.hj + ') — ' + st.topic };
  }
  function judgePlacement(a) {   // a: { chart, bazhai, ch, role, idx, nowPeriod }
    var pal = a.chart.palaces[a.idx], role = a.role, X = xkLevel(pal, role), B = bzLevel(a.bazhai, a.idx, role), S = a.ch ? sajuFit(a.ch, a.idx) : null;
    var levels = [X.level, B.level, S ? S.level : null].filter(function (v) { return v != null; });
    var pos = levels.filter(function (v) { return v > 0; }).length, neg = levels.filter(function (v) { return v < 0; }).length;
    var verdict = levels.length < 2 ? 'insufficient' : neg === 0 && pos >= 2 ? 'agree-good' : pos === 0 && neg >= 2 ? 'agree-caution' : pos > 0 && neg > 0 ? 'differ' : pos >= 1 ? 'lean-good' : neg >= 1 ? 'lean-caution' : 'neutral';
    var vtext = { insufficient: '이론이 둘 미만이라 종합 판단을 보류합니다.', 'agree-good': '세 가지 기준이 같은 방향(무난~좋음)을 가리킵니다.', 'agree-caution': '세 가지 기준이 모두 조심할 쪽을 가리킵니다. 다른 자리를 먼저 검토하세요.', differ: '기준마다 판단이 갈립니다. 어느 이론을 우선할지는 아래 근거를 보고 결정하세요.', 'lean-good': '한쪽에서 좋게 보고 나머지는 특별히 반대하지 않습니다.', 'lean-caution': '한쪽에서 조심하라고 보고 나머지는 특별히 지지하지 않습니다.', neutral: '뚜렷한 장단점이 없는 자리입니다.' }[verdict];
    return { role: role, roleLabel: D.ROOM_LABEL[role] || role, idx: a.idx, dir: P[a.idx].dir, xuankong: Object.assign({ shan: pal.shan, xiang: pal.xiang, shanState: pal.shanState, xiangState: pal.xiangState, text: pal.shanText + ' ' + pal.xiangText, notes: pal.notes }, X), bazhai: B, saju: S, verdict: verdict, verdictText: vtext, agreeCount: pos, againstCount: neg, note: '이론별 판정을 합산하지 않고 같은 방향인 개수만 표시합니다.' };
  }
  function suggestRoles(a) {   // a: { chart, bazhai, ch, roles }
    var res = {};
    a.roles.forEach(function (role) {
      var arr = []; for (var i = 0; i < 8; i++) arr.push(judgePlacement({ chart: a.chart, bazhai: a.bazhai, ch: a.ch, role: role, idx: i }));
      var rank = { 'agree-good': 0, 'lean-good': 1, neutral: 2, differ: 3, insufficient: 4, 'lean-caution': 5, 'agree-caution': 6 };
      arr.sort(function (x, y) { return rank[x.verdict] - rank[y.verdict] || y.agreeCount - x.agreeCount || x.idx - y.idx; });
      res[role] = arr;
    });
    return res;
  }

  // ───────────── 종합 ─────────────
  function analyze(o) {   // o: { ch, facingDeg, builtYear, renovationYear, evalYear, gender, form }
    var out = { version: VERSION, school: SCHOOL, exceptions: EXCEPTIONS, disclaimer: D.DISCLAIMER, limits: D.DATA_LIMITS, warnings: [] };
    out.xuankong = xuankong(o);
    var birthYear = o.birthYear || (o.ch ? birthYearFromChart(o.ch) : null), gender = o.gender || (o.ch && o.ch.gender) || 'M';
    out.bazhai = bazhai({ facingDeg: o.facingDeg, birthYear: birthYear, gender: gender });
    out.form = form(o.form);
    out.saju = o.ch ? [0, 1, 2, 3, 4, 5, 6, 7].map(function (i) { return Object.assign({ idx: i, dir: P[i].dir }, sajuFit(o.ch, i)); }) : null;
    out.warnings = out.xuankong.warnings.concat(out.bazhai.warnings, out.form.tone === 'unknown' ? ['형세 항목 입력이 부족합니다.'] : []);
    out.theories = [
      { id: 'xuankong', name: '현공비성', status: 'ok', verdict: out.xuankong.pattern.name },
      { id: 'bazhai', name: '팔택', status: out.bazhai.match ? 'ok' : 'partial', verdict: out.bazhai.matchText || '정보 부족' },
      { id: 'form', name: '형세', status: out.form.tone === 'unknown' ? 'insufficient' : 'ok', verdict: out.form.verdict },
      { id: 'saju', name: '내 사주', status: o.ch ? 'ok' : 'none', verdict: o.ch ? '방위 오행의 억부·조후 역할만 참고 표시(합산 안 함)' : '사주 정보 없음' },
    ];
    return out;
  }

  // ───────────── 문구·규칙 관리 (관리자 게시본) ─────────────
  // 문구 ID: star.<별>.<san|hyang>.<wang|sheng|tui|sha> · remedy.<별> · form.<항목>.<값> · hazard.<키>. 규칙: kimThreshold · gongmangWidth.
  var RULES = [{ id: 'kimThreshold', label: '겸향 판정 각도(°)', min: 2, max: 7, v: 4.5, desc: '산 중심에서 이 각도를 넘으면 겸향으로 표시합니다.' }, { id: 'gongmangWidth', label: '공망 경고 폭(°)', min: 0.5, max: 3, v: 1.5, desc: '산 경계에서 이 각도 안이면 공망 경고를 냅니다.' }];
  var DEF = JSON.stringify({ S: D.STAR_TXT, R: D.REMEDY, F: D.FORM, H: D.HAZARD });
  var FIRST = /(니다|세요|요)[.!]?$/;
  function validateText(t) {
    if (typeof t !== 'string') return '문구는 문자열이어야 합니다'; var x = t.trim();
    if (x.length < 10 || x.length > 160) return '문구는 10~160자입니다'; if (D.BAN.test(x)) return '단정·공포 표현(반드시·절대·보장 등)은 쓸 수 없습니다'; if (!FIRST.test(x)) return '존댓말(~니다·~세요·~요)로 끝나야 합니다'; if (/[<>]/.test(x)) return '< > 문자는 쓸 수 없습니다'; return null;
  }
  function textRefs() {
    var out = [], S = D.STAR_TXT; Object.keys(S).forEach(function (n) { ['san', 'hyang'].forEach(function (l) { Object.keys(S[n][l]).forEach(function (st) { out.push({ id: 'star.' + n + '.' + l + '.' + st, group: '별 해석', label: D.STAR[n].name + ' · ' + (l === 'san' ? '산성' : '향성') + ' · ' + D.STATE_LABEL[st], get: function () { return S[n][l][st]; }, set: function (v) { S[n][l][st] = v; } }); }); }); });
    Object.keys(D.REMEDY).forEach(function (n) { out.push({ id: 'remedy.' + n, group: '보완법', label: D.STAR[n].name + ' 보완', get: function () { return D.REMEDY[n]; }, set: function (v) { D.REMEDY[n] = v; } }); });
    Object.keys(D.FORM).forEach(function (k) { Object.keys(D.FORM[k].opts).forEach(function (o) { out.push({ id: 'form.' + k + '.' + o, group: '형세', label: D.FORM[k].label + ' · ' + o, get: function () { return D.FORM[k].opts[o][1]; }, set: function (v) { D.FORM[k].opts[o][1] = v; } }); }); });
    Object.keys(D.HAZARD).forEach(function (k) { out.push({ id: 'hazard.' + k, group: '주변 요소', label: D.HAZARD[k][0], get: function () { return D.HAZARD[k][2]; }, set: function (v) { D.HAZARD[k][2] = v; } }); });
    return out;
  }
  function resetPublished() {
    var d = JSON.parse(DEF); [['STAR_TXT', 'S'], ['REMEDY', 'R'], ['FORM', 'F'], ['HAZARD', 'H']].forEach(function (p) { var tgt = D[p[0]], src = d[p[1]]; Object.keys(src).forEach(function (k) { tgt[k] = src[k]; }); });
    RULES.forEach(function (r) { r.cur = r.v; }); SCHOOL.kimThreshold = 4.5; SCHOOL.gongmangWidth = 1.5;
  }
  function applyPublished(pub) {
    resetPublished(); if (!pub || typeof pub !== 'object') return false; var n = 0, refs = {}; textRefs().forEach(function (r) { refs[r.id] = r; });
    Object.keys(pub.texts || {}).forEach(function (id) { var r = refs[id], t = pub.texts[id]; if (r && typeof t === 'string' && !validateText(t)) { r.set(t.trim()); n++; } });
    RULES.forEach(function (r) { var v = pub.rules && pub.rules[r.id]; if (typeof v === 'number' && v >= r.min && v <= r.max) { SCHOOL[r.id] = v; r.cur = v; n++; } });
    return n > 0;
  }
  function listTexts() { return textRefs().map(function (r) { return { id: r.id, group: r.group, label: r.label, text: r.get() }; }); }
  resetPublished();

  G.MantraFengshui = { VERSION: VERSION, SCHOOL: SCHOOL, EXCEPTIONS: EXCEPTIONS, MOUNTAINS: MTS, mountainAt: mountainAt, lichunYear: lichunYear, periodOfYear: periodOfYear, yuanOfYear: yuanOfYear, periodRange: periodRange, fly: fly, stateOf: stateOf, toneOf: toneOf,
    xuankong: xuankong, restate: restate, yearCenter: yearCenter, yearBranch: yearBranch, monthCenter: monthCenter, monthIndexFromBranch: monthIndexFromBranch, overlay: overlay,
    kuaOf: kuaOf, eightStars: eightStars, bazhai: bazhai, birthYearFromChart: birthYearFromChart, form: form, sajuFit: sajuFit, judgePlacement: judgePlacement, suggestRoles: suggestRoles, analyze: analyze, dirName: dirName, RULES: RULES, validateText: validateText, listTexts: listTexts, applyPublished: applyPublished, resetPublished: resetPublished };
})(typeof window !== 'undefined' ? window : globalThis);
