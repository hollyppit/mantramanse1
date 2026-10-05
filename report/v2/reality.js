// Reality — 사주 사실값 → "그럴 가능성이 있는 현실" 장면 문장.
// 은유(길·강·안개)로 넘어가기 전에, 어릴 때 · 집안 · 이동 · 인연 · 일 · 돈 · 지나온 10년을 구체적인 문장으로 먼저 말한다.
// 단정하지 않는다: 모든 문장은 "~했을 수 있다 / ~했을 가능성이 있다 / ~하기 쉽다" 꼴이다. 맞지 않는 부분은 흘려보내도 된다는 전제.
// 쓰지 않는다: 질병·수명·사고·이혼·자녀 유무 같은 사건 예측. 계산도 하지 않는다 — sd(Structured Saju Data)에 이미 있는 값만 읽는다.
// 근거: 년주=어린 시절·집안, 월주=10대 후반~20대·부모·사회 첫걸음, 일주=본인·배우자 자리, 시주=중년 이후. 대운은 천간이 앞 5년, 지지가 뒤 5년.
// 화면 문구에는 십성 용어를 먼저 쓰지 않는다(Translator.lint). 용어는 마지막 "명리에서는 …" 한 줄(basisNote)에만 둔다.
// 출력: make(kind, sd) → [{ preset, over, blocks, extra, basisNote }]  (Translator 가 sc()로 장면을 만든다)
(function (root) {
  var R = root.ReportV2 = root.ReportV2 || {};
  var GRP = { 비견: '비겁', 겁재: '비겁', 식신: '식상', 상관: '식상', 편재: '재성', 정재: '재성', 편관: '관성', 정관: '관성', 편인: '인성', 정인: '인성' };
  var grp = function (g) { return GRP[g] || ''; };

  /* ── 문장 도구 ── */
  // 공백 기준으로 max 자 이하 줄로 나눈다(장면 한 조각은 22자 이하). 줄머리 마크업(! ~ .)은 첫 줄에만 둔다.
  function wrap(t, max) {
    var m = /^[!~.]/.test(t) ? t[0] : '', w = String(m ? t.slice(1) : t).split(' '), out = [], cur = '';
    w.forEach(function (x) { if (!cur) cur = x; else if ((cur + ' ' + x).length <= max) cur += ' ' + x; else { out.push(cur); cur = x; } });
    if (cur) out.push(cur);
    return out.map(function (l, i) { return i === 0 ? m + l : l; });
  }
  // 문장 목록 → 블록. 첫 문장은 그대로, 이어지는 문장은 한 박자 쉬며(~) 나온다.
  function blocks(sentences) {
    return sentences.filter(Boolean).map(function (s, i) { var t = /^[!~.]/.test(s) ? s : (i ? '~' + s : s); return wrap(t, 19); });
  }
  function basisBlocks(a, b) { return [wrap('.' + a, 19), b ? wrap('.' + b, 19) : null].filter(Boolean); }
  var P = function (id, preset, over, sentences, extra) { return { preset: preset, over: over || {}, blocks: blocks(sentences), extra: extra || {} }; };
  var BASIS = function (a, b) { return { preset: 'REALITY_CHECK', over: { pacing: 'MEDIUM' }, blocks: basisBlocks(a, b), extra: { bg: 'black' }, basisNote: true }; };

  /* ── 사실 읽기 ── */
  var pil = function (sd, k) { return sd.pillars && sd.pillars[k] || null; };
  var tgOf = function (sd, k, w) { var p = pil(sd, k); return p ? p[w] : null; };
  var has12 = function (sd, k, n) { return !!(sd.sinsal12 && sd.sinsal12[k] === n); };
  var star = function (sd, n, k) { return (sd.specialStars || []).some(function (s) { return s.name === n && (!k || s.pillar === k); }); };
  var ko = function (sd, k) { var p = pil(sd, k); return p ? p.ko : ''; };
  // 지지끼리의 관계(천간합·천간충 제외) 중 기둥 k 가 들어간 것. types 로 종류를 좁힌다.
  function relOf(sd, k, types) {
    return (sd.clashes || []).concat(sd.combinations || []).filter(function (r) {
      return !/천간/.test(r.type) && (r.members || []).indexOf(k) >= 0 && (!types || types.test(r.type));
    });
  }
  var withOther = function (r, k) { return (r.members || []).filter(function (m) { return m !== k; }); };
  var isMale = function (sd) { return sd.gender !== 'F'; };
  var loveGroup = function (sd) { return isMale(sd) ? '재성' : '관성'; }; // 이성 인연의 별: 남자는 재성, 여자는 관성(전통 규칙)

  /* ── 1. 어린 시절 · 집안 (년주·월주) ── */
  var CHILD = {
    비견: ['형제나 또래와 나란히 자랐을 가능성이 있다.', '내 몫은 내가 챙겨야 한다는 감각이 일찍 생겼을 수 있다.'],
    겁재: ['형제나 친구와 무언가를 두고 다툰 기억이 있을 수 있다.', '양보하거나 빼앗긴 경험이 일찍 자존심을 단단하게 만들었을 수 있다.'],
    식신: ['비교적 너그러운 분위기에서 자랐을 가능성이 있다.', '먹고 놀고 만드는 일에서 쉽게 즐거움을 찾는 아이였을 수 있다.'],
    상관: ['어른 말에 "왜요?"가 먼저 나오던 아이였을 가능성이 있다.', '선생님이나 부모와 한 번쯤 크게 부딪혔거나, 튄다는 말을 들었을 수 있다.'],
    편재: ['집안의 돈 사정이나 환경이 한 번쯤 크게 움직였을 수 있다.', '부모가 바깥일로 바빴거나, 이사와 전학을 겪었을 가능성이 있다.'],
    정재: ['살림이 알뜰하고 현실적인 집이었을 가능성이 있다.', '물건과 돈의 값을 비교적 일찍 배웠을 수 있다.'],
    편관: ['집안에 긴장이나 엄한 기운이 있었을 가능성이 있다.', '혼나는 일이 잦았거나, 어른들의 갈등을 지켜보며 눈치가 빨라졌을 수 있다.'],
    정관: ['규칙과 기대가 분명한 집이었을 가능성이 있다.', '"바르게 해야 한다"는 말을 자주 듣고, 모범생으로 보이려 애썼을 수 있다.'],
    편인: ['돌봄이 한결같지 않았을 가능성이 있다.', '어른이 바빴거나 혼자 보내는 시간이 길어, 일찍 혼자 생각하는 법을 익혔을 수 있다.'],
    정인: ['곁에서 챙겨 주는 어른이 있었을 가능성이 높다.', '어머니나 조부모, 외가의 손길을 크게 받았을 수 있다.'],
  };
  var CHILD_OUT = {
    비겁: '집 밖에서는 또래와 어울리며 겨루는 일이 잦았을 수 있다.', 식상: '집 밖에서는 재주나 장난으로 눈에 띄었을 수 있다.', 재성: '집 밖에서는 일찍부터 현실 감각이 있다는 말을 들었을 수 있다.',
    관성: '집 밖에서는 선생님과 어른의 시선을 의식하며 지냈을 수 있다.', 인성: '집 밖에서는 어른들에게 귀여움을 받거나 공부로 인정받았을 수 있다.',
  };
  var TEEN = {
    비겁: '친구와 선후배가 삶의 중심이었고, 무리 안에서 내 자리를 지키려 애썼을 수 있다.', 식상: '하고 싶은 것이 많아 이것저것 건드려 보다가 진로가 한 번 이상 흔들렸을 수 있다.',
    재성: '일찍부터 용돈과 아르바이트, 돈의 쓰임을 의식하며 현실적인 선택을 했을 수 있다.', 관성: '성적과 평가, 규칙의 압박을 크게 느끼며 해야 할 일이 먼저였을 수 있다.',
    인성: '공부나 책, 혼자 몰입하는 시간이 길었고 어른의 기대를 받았을 수 있다.',
  };
  function child(sd) {
    var out = [], yB = tgOf(sd, 'year', 'branchTG'), yS = tgOf(sd, 'year', 'stemTG'), mB = tgOf(sd, 'month', 'branchTG'), C = CHILD[yB];
    if (C) {
      var s = ['어린 시절은 이랬을 가능성이 있다.', C[0], C[1]];
      if (grp(yS) && grp(yS) !== grp(yB) && CHILD_OUT[grp(yS)]) s.push(CHILD_OUT[grp(yS)]);
      out.push(P('c1', 'DAILY_REALITY', { pacing: 'SLOW', mediaTags: ['meadow', 'field'], visualMetaphor: '어린 시절의 들판' }, s, { mediaIntent: { scenes: ['meadow', 'field', 'road'], emotions: ['warm', 'calm'], actions: ['lookingBack'] } }));
    }
    var t = [], T = TEEN[grp(mB)];
    if (T) t.push('10대 후반에서 20대 초반에는,', T);
    var ym = relOf(sd, 'year', /충|형|파|해/).filter(function (r) { return r.members.indexOf('month') >= 0; });
    if (ym.length) t.push('그 사이 이사나 전학, 집안 사정의 변화가 한 번쯤 있었을 가능성이 있다.');
    else if (relOf(sd, 'year', /합/).some(function (r) { return r.members.indexOf('month') >= 0; })) t.push('가족이나 친척과의 인연이 오래 깊게 이어지는 편일 수 있다.');
    if (t.length) out.push(P('c2', 'DAILY_REALITY', { pacing: 'SLOW', mediaTags: ['road', 'stairs'], visualMetaphor: '집을 나서는 길' }, t, { mediaIntent: { scenes: ['road', 'stairs', 'trip'], emotions: ['contemplative'], actions: ['walking'] } }));

    // 어린 시절 이동·마음의 결 (년주·월주의 12신살·신살)
    var m = [];
    if (has12(sd, 'year', '역마살')) m.push('어릴 때부터 이사나 이동이 잦았거나, 고향을 일찍 떠나는 흐름이 있었을 수 있다.');
    if (has12(sd, 'month', '역마살')) m.push('10대 후반 이후에는 진학이나 일 때문에 집을 떠나 지낸 시간이 길었을 가능성이 있다.');
    if (has12(sd, 'year', '화개살')) m.push('혼자 놀거나 상상에 빠져 있는 시간이 많은 아이였을 수 있다.');
    if (has12(sd, 'year', '연살')) m.push('어른들에게 예쁨을 받거나 눈에 띄는 아이였을 수 있다.');
    if (star(sd, '고신살', 'year') || star(sd, '고신살', 'month') || star(sd, '과숙살', 'year') || star(sd, '과숙살', 'month')) m.push('가족 안에서도 외롭다고 느낀 순간이 있었을 수 있다.');
    if (star(sd, '천을귀인', 'year') || star(sd, '천을귀인', 'month')) m.push('막막할 때 손을 내밀어 준 어른이 한 명쯤 있었을 가능성이 있다.');
    if (m.length) out.push(P('c3', 'EMOTIONAL' in ((R.Cinema && R.Cinema.PRESETS) || {}) ? 'EMOTIONAL' : 'DAILY_REALITY', { pacing: 'SLOW', mediaTags: ['walkingAlone', 'rainWindow'] }, m.slice(0, 3), { mediaIntent: { scenes: ['walkingAlone', 'rainWindow', 'road'], emotions: ['lonely', 'warm'], actions: ['lookingBack'] } }));

    if (out.length) out.push(BASIS('명리에서는 어린 시절을 년주, 10대 후반~20대를 월주로 읽는다.', '년주 ' + ko(sd, 'year') + ' · 월주 ' + ko(sd, 'month')));
    return out;
  }

  /* ── 2. 연애 (도화·끌림 · 반복되는 패턴 · 인연이 가까워지는 시기) ── */
  var DOHWA = {
    year: '어릴 때부터 호감을 사는 얼굴이거나, 애교로 어른들에게 예쁨을 받았을 수 있다.', month: '10대 후반~20대에 이성의 관심을 자주 받았을 가능성이 있다.',
    day: '끌림을 빨리 느끼고 연애가 시작되기 쉬운 편이며, 가까운 사이에서도 매력이 살아 있을 수 있다.', hour: '나이가 들어서도 새로운 인연이나 관심이 이어질 수 있다.',
  };
  var LOVE_REPEAT = {
    비겁: '좋아하면서도 자존심 때문에 먼저 연락하지 못해 타이밍을 놓친 적이 있을 수 있다.', 식상: '마음을 말로 잘 표현하는 만큼, 가볍게 보이거나 말실수로 오해를 산 적이 있을 수 있다.',
    재성: '현실적인 조건과 마음 사이에서 오래 저울질하다가 놓친 인연이 있을 수 있다.', 관성: '상대의 기대에 맞추느라 내 감정을 뒤로 미루다 지친 연애가 있었을 수 있다.',
    인성: '마음이 깊어지기까지 오래 걸려, 상대가 먼저 지쳐 떠난 경험이 있을 수 있다.',
  };
  function love(sd) {
    var out = [], d = [];
    ['year', 'month', 'day', 'hour'].forEach(function (k) { if (has12(sd, k, '연살') && pil(sd, k)) d.push(DOHWA[k]); });
    if (!d.length && star(sd, '홍염살')) d.push('눈빛이나 분위기에 끌리는 사람이 생기기 쉽고, 나도 한 번 끌리면 깊이 빠지는 편일 수 있다.');
    var rep = LOVE_REPEAT[sd.dominantGroup];
    var s1 = []; if (d.length) s1 = d.slice(0, 2); if (rep) s1.push(rep);
    if (s1.length) out.push(P('l1', 'DAILY_REALITY', { pacing: 'SLOW', mediaTags: ['rainWindow', 'nightCity'], visualMetaphor: '비 오는 창가의 저녁' }, ['연애에서는 이런 장면이 있었을 수 있다.'].concat(s1.slice(0, 3)), { mediaIntent: { scenes: ['rainWindow', 'nightCity', 'walkingAlone'], emotions: ['romantic', 'lonely'], actions: ['thinking'] } }));
    var lg = loveGroup(sd), ls = luckWith(sd, lg);
    if (ls.length) out.push(P('l2', 'DAILY_REALITY', { pacing: 'SLOW', mediaTags: ['crossroads', 'sunset'], visualMetaphor: '인연이 가까워지는 길목' }, ['인연이 가까워지기 쉬운 시기도 따로 있다.'].concat(ls.slice(0, 2)), { mediaIntent: { scenes: ['crossroads', 'sunset', 'road'], emotions: ['romantic', 'hopeful'], actions: ['lookingForward'] } }));
    if (out.length) out.push(BASIS('명리에서는 ' + (isMale(sd) ? '남자의 연애·결혼 인연을 재성' : '여자의 연애·결혼 인연을 관성') + '이 들어오는 대운에서 읽는다.', d.length ? '도화(桃花)는 일지·월지 등 자리에 따라 시기를 가른다.' : ''));
    return out;
  }
  // 이성 인연의 별이 들어오는 대운(천간=앞 5년, 지지=뒤 5년)을 문장으로. 지난 시기·지금·앞으로를 따로 말한다.
  function luckWith(sd, group) {
    var res = [], now = sd.nowYear;
    (sd.daewoon || []).forEach(function (d) {
      var a = d.startAge, st = grp(d.stemTG) === group, br = grp(d.branchTG) === group; if (!st && !br) return;
      var from = st ? a : a + 5, to = br ? a + 9 : a + 4, y1 = st ? d.startYear : d.startYear + 5, y2 = br ? d.endYear : d.startYear + 4;
      var past = y2 < now, cur = y1 <= now && now <= y2;
      var tail = past ? '이성과 가까워져 연애나 결혼 같은 변화를 겪었을 가능성이 있다.' : cur ? '이성과 가까워지기 쉬운 흐름 한가운데에 있을 수 있다.' : '이성과 가까워질 기회가 열릴 수 있다.';
      res.push({ at: y1, text: from + '~' + to + '세 무렵(' + y1 + '~' + y2 + '년)에는 ' + tail, past: past });
    });
    // 가장 최근에 지난 시기 1개 + 지금 + 다가오는 첫 시기만 말한다(먼 미래까지 늘어놓지 않는다)
    var pa = res.filter(function (x) { return x.past; }).sort(function (x, y) { return y.at - x.at; }).slice(0, 1), rest = res.filter(function (x) { return !x.past; }).sort(function (x, y) { return x.at - y.at; }).slice(0, 2);
    return pa.concat(rest).map(function (x) { return x.text; });
  }

  /* ── 3. 배우자 자리 (일지) ── */
  var SPOUSE = {
    비견: '대등하고 친구 같은 상대와 잘 맞기 쉽다. 다만 주도권을 두고 맞서는 날이 있을 수 있다.',
    겁재: '나만큼 강한 상대에게 끌리고, 서로 양보하지 않아 부딪히는 날이 있을 수 있다. 돈이나 생활 방식을 두고 의견이 갈릴 가능성이 있다.',
    식신: '함께 먹고 웃고 편안한 상대와 잘 맞을 가능성이 있다. 소소한 일상을 나누는 관계에서 오래 간다.',
    상관: '말이 잘 통하고 재치 있는 상대에게 끌리지만, 말이 날카로워져 다투는 날이 있을 수 있다.',
    편재: '활동적이고 사교적인 상대에게 끌리기 쉽다. 상대가 바깥일로 바쁘거나, 관계의 거리를 조절해야 할 수 있다.',
    정재: '성실하고 현실적인 상대와 맞을 가능성이 있다. 생활을 함께 꾸리는 데 강하다.',
    편관: '카리스마 있거나 인상이 강한 상대에게 끌릴 수 있다. 끌림이 큰 만큼 긴장과 눈치도 따라올 가능성이 있다.',
    정관: '책임감 있고 단정한 상대와 맞기 쉽다. 서로 지킬 선이 분명한 관계를 편안해한다.',
    편인: '독특하거나 속을 알기 어려운 상대에게 끌릴 수 있다. 가까워져도 각자의 방이 필요한 관계가 될 가능성이 있다.',
    정인: '나를 챙기고 이해해 주는 상대에게 마음을 놓기 쉽다. 기대는 만큼 서운함도 쌓일 수 있다.',
  };
  var DAYREL = { 충: '가까운 사이에서 거리가 갑자기 멀어졌다 가까워지는 일이 있을 수 있다. 한 번에 정리하려 들면 오히려 크게 부딪힐 수 있다.',
    형: '사소한 일이 마음에 오래 남아 서로 날을 세우는 날이 있을 수 있다.', 해: '정이 깊은 만큼 서운함이 쉽게 생겨, 밀고 당기는 관계가 될 수 있다.',
    원진: '이유 없이 거슬리다가도 끌리는, 애증이 섞인 관계가 될 수 있다.', 귀문관: '상대의 기분을 지나치게 읽다 혼자 지치거나 의심이 커지는 순간이 있을 수 있다.',
    파: '관계의 계획이 한 번쯤 틀어지고 다시 짜는 경험이 있을 수 있다.', 합: '사람과 쉽게 붙고, 한번 맺은 인연은 오래 이어지는 편일 수 있다.' };
  function spouse(sd) {
    var out = [], dB = tgOf(sd, 'day', 'branchTG'), S = SPOUSE[dB]; if (!S) return out;
    var s = ['가까워질수록 드러나는 취향이 있다.'].concat(S.split(/(?<=\.) /));
    var rels = relOf(sd, 'day'), seen = {};
    rels.forEach(function (r) { var key = /합/.test(r.type) ? '합' : r.type; if (DAYREL[key] && !seen[key] && s.length < 5) { seen[key] = 1; s.push(DAYREL[key].split(/(?<=\.) /)[0]); } });
    out.push(P('s1', 'DAILY_REALITY', { pacing: 'SLOW', mediaTags: ['openDoor', 'sunset'], visualMetaphor: '문 앞에 선 두 사람의 그림자' }, s, { mediaIntent: { scenes: ['openDoor', 'sunset', 'city'], emotions: ['romantic', 'warm'], actions: ['meeting'] } }));
    out.push(BASIS('명리에서는 일주의 지지를 배우자 자리로 읽는다.', '일지 ' + ko(sd, 'day').slice(-1) + ' · ' + dB));
    return out;
  }

  /* ── 4. 일 (월주 · 이동 · 직업 환경) ── */
  var WORK = {
    비겁: '일은 내가 책임지고 끝내는 방식이 편하고, 누군가의 밑에서 오래 지시를 받으면 답답해졌을 수 있다.',
    식상: '정해진 틀의 업무보다 아이디어·기술·말로 승부하는 일에서 두각을 보였을 수 있다.',
    재성: '숫자와 결과가 보이는 일, 사람을 상대하는 일에서 일찍 감각을 발휘했을 수 있다.',
    관성: '조직과 직함, 평가가 있는 자리에서 책임을 맡아 일찍 인정받았거나, 크게 눌렸을 수 있다.',
    인성: '배우고 자격을 갖추는 데 시간을 들였고, 준비가 길어 사회 진출이 한 박자 늦었을 수 있다.',
  };
  function work(sd) {
    var out = [], mB = tgOf(sd, 'month', 'branchTG'), W = WORK[grp(mB)], s = [];
    if (W) s.push('일을 시작하던 무렵을 떠올려 본다.', W);
    if (has12(sd, 'day', '역마살')) s.push('한곳에 오래 머물면 답답해져서, 이동·출장·이사처럼 움직임이 일에 자주 끼어들 수 있다.');
    if (has12(sd, 'hour', '역마살') && pil(sd, 'hour')) s.push('중년 이후에도 활동 반경이 넓고, 멀리 떠나거나 멀리 있는 인연과 이어질 가능성이 있다.');
    if (relOf(sd, 'month', /충/).length) s.push('일하는 환경이 크게 바뀌는 때가 한 번 이상 있었을 가능성이 있다. 직장이나 일의 종류가 바뀌었을 수 있다.');
    else if (relOf(sd, 'month', /형|파/).length) s.push('일터에서 사람이나 방식 때문에 마음이 어긋나는 일이 있었을 수 있다.');
    if (s.length > 1) out.push(P('w1', 'DAILY_REALITY', { pacing: 'SLOW', mediaTags: ['commute', 'workspace'], visualMetaphor: '출근길의 도시' }, s.slice(0, 4), { mediaIntent: { scenes: ['commute', 'workspace', 'city'], emotions: ['tense', 'calm'], actions: ['working'] } }));
    if (out.length) out.push(BASIS('명리에서는 월주를 사회 첫걸음과 직업 환경의 자리로 읽는다.', '월주 ' + ko(sd, 'month') + ' · ' + (mB || '')));
    return out;
  }

  /* ── 5. 돈 (십성 비율 · 격국 패턴) ── */
  var lvl = function (sd, g) { var v = +(sd.groups && sd.groups[g]) || 0; return v >= 30 ? 'strong' : v >= 23 ? 'high' : v <= 8 ? 'weak' : v <= 15 ? 'low' : 'mid'; };
  var hasPat = function (sd, n) { return (sd.patterns || []).some(function (p) { return p.name === n; }); };
  function money(sd) {
    var s = [], hi = function (g) { var l = lvl(sd, g); return l === 'strong' || l === 'high'; };
    if (hasPat(sd, '군겁쟁재') || hi('비겁')) s.push('친구나 지인과 돈이 얽히면 손해를 본 경험이 있을 수 있다. 빌려주고 못 받았거나, 동업이 틀어졌을 가능성이 있다.');
    if (hi('식상')) s.push('쓰는 데 거리낌이 적어, 취미·경험·사람에 쓰는 돈이 큰 편일 수 있다.');
    if (hi('관성')) s.push('큰돈은 직장이나 월급처럼 정해진 길로 들어올 가능성이 크다. 사업보다 안정이 편할 수 있다.');
    if (hi('인성')) s.push('배움이나 자격, 집 같은 안정 자산에 돈이 묶이기 쉽다. 쓸 때 오래 고민하다 시기를 놓칠 수 있다.');
    if (hasPat(sd, '재다신약')) s.push('벌어야 할 돈과 챙길 일이 내 힘보다 커서, 늘 바쁜데 손에 남는 게 적은 시기가 있을 수 있다.');
    var l = lvl(sd, '재성');
    if (l === 'weak' || l === 'low') s.push('돈을 모으는 일에는 쉽게 흥미가 식을 수 있다. 자동이체 같은 장치가 도움이 될 수 있다.');
    else if (l === 'strong' || l === 'high') s.push('돈 들어올 길이 여러 갈래일 수 있다. 다만 번 만큼 나갈 일도 따라오는 구조일 수 있다.');
    if (!s.length) return [];
    return [P('m1', 'DAILY_REALITY', { pacing: 'SLOW', mediaTags: ['paymentAlert', 'card'], visualMetaphor: '결제 알림이 뜨는 화면' }, ['돈 앞에서는 이런 일이 있었을 수 있다.'].concat(s.slice(0, 3)), { mediaIntent: { scenes: ['paymentAlert', 'card', 'city'], emotions: ['tense', 'contemplative'], actions: ['thinking'] } }),
      BASIS('명리에서는 재성과 비겁의 힘, 그리고 격국(패턴)으로 돈의 결을 읽는다.', hasPat(sd, '군겁쟁재') ? '군겁쟁재 · 비겁이 재물을 두고 다투는 구조' : '')];
  }

  /* ── 6. 사람 사이 · 약점 ── */
  var PEOPLE = {
    비겁: '친구는 많아도 속마음을 보이는 사람은 소수일 수 있다. 부탁은 잘 못 하고, 부탁받는 건 잘 하는 쪽일 가능성이 있다.',
    식상: '말이 많아지는 자리에서 호감과 오해를 함께 사기 쉽다. 농담이 누군가에게 오래 남았을 수 있다.',
    재성: '사람을 쓸모로 계산한다는 오해를 받은 적이 있을 수 있다. 실제로는 챙기는 방식이 현실적일 뿐일 수 있다.',
    관성: '체면과 예의 때문에 불편해도 참는 편일 수 있다. 쌓이다가 어느 날 한 번에 거리를 두기도 한다.',
    인성: '한 발 물러나 관찰하는 시간이 길어, 늦게 친해지는 편일 수 있다. 정을 주면 깊지만 표현은 느릴 수 있다.',
  };
  function people(sd) {
    var s = [], p = PEOPLE[sd.dominantGroup];
    if (p) s.push('사람들 사이에서는 이런 일이 반복됐을 수 있다.', p);
    if (has12(sd, 'day', '화개살') || star(sd, '화개살')) s.push('사람 속에서도 혼자만의 시간이 꼭 필요하고, 마음속 세계가 깊은 편일 수 있다.');
    else if (has12(sd, 'month', '화개살') || has12(sd, 'hour', '화개살')) s.push('시끄러운 자리 뒤에는 조용히 충전하는 시간이 필요할 수 있다.');
    var bad = (sd.clashes || []).filter(function (r) { return /원진|귀문관/.test(r.type); });
    if (bad.length) s.push('가까운 사이에서도 이유 없이 거슬리거나 예민해지는 순간이 있을 수 있다.');
    if (s.length < 2) return [];
    return [P('p1', 'DAILY_REALITY', { pacing: 'SLOW', mediaTags: ['gathering', 'nightCity'], visualMetaphor: '북적이는 자리의 한구석' }, s.slice(0, 4), { mediaIntent: { scenes: ['gathering', 'nightCity', 'city'], emotions: ['lonely', 'warm'], actions: ['meeting'] } })];
  }
  var PATTERN = {
    '관살혼잡': '직장이나 관계에서 서로 다른 기대가 한꺼번에 몰려와 마음이 갈릴 때가 있을 수 있다.',
    '상관견관': '윗사람이나 규칙 앞에서 말이 먼저 나가, 아쉬운 퇴사나 갈등을 겪었을 가능성이 있다.',
    '군겁쟁재': '돈과 기회를 두고 가까운 사람과 부딪히는 일이 반복될 수 있다.',
    '효신탈식(도식)': '생각이 많아 정작 해야 할 일이 미뤄지는 날이 있을 수 있다.',
    '재다신약': '해야 할 일과 쫓는 돈이 내 힘보다 커서 지치는 시기가 있을 수 있다.',
    '관살과다': '책임과 압박이 내 몫보다 크게 느껴지는 시기가 반복될 수 있다.',
    '식상과다(설기)': '쏟아내는 만큼 에너지가 빠져 소진되는 날이 많을 수 있다.',
  };
  var STAR = {
    '괴강살': '한번 마음먹으면 굽히지 않아, 주변에 단호하다는 인상을 줄 수 있다.',
    '양인살': '승부욕과 순간 화력이 커서, 급한 말이나 결정으로 후회를 남기기 쉬울 수 있다.',
    '백호대살': '평소엔 잔잔하다가도 큰 일을 겪고 나서야 방향을 바꾸는, 극적인 전환을 겪기 쉬울 수 있다.',
    '공망': '채워도 어딘가 비어 있는 듯한 허전함을 느끼는 영역이 있을 수 있다.',
  };
  function shadow(sd) {
    var s = [], names = [];
    Object.keys(PATTERN).forEach(function (n) { if (hasPat(sd, n) && s.length < 3) { s.push(PATTERN[n]); names.push(n); } });
    Object.keys(STAR).forEach(function (n) { if (star(sd, n) && s.length < 4) { s.push(STAR[n]); names.push(n); } });
    if (!s.length) return [];
    return [P('x1', 'DAILY_REALITY', { pacing: 'SLOW', mediaTags: ['rainWindow', 'crossroads'], visualMetaphor: '같은 자리를 도는 길' }, ['같은 자리에서 반복되는 일이 있었을 수 있다.'].concat(s), { mediaIntent: { scenes: ['rainWindow', 'crossroads', 'walkingAlone'], emotions: ['tense', 'lonely'], actions: ['thinking'] } }),
      BASIS('명리에서는 이런 반복을 격국의 패턴과 신살로 읽는다.', names.slice(0, 3).join(' · '))];
  }

  /* ── 7. 대운 · 세운: 지나온 10년 · 지금 · 앞으로 ── */
  var STEM_CL = {
    비견: '친구·동료와 어울리며 내 뜻을 분명히 세우는', 겁재: '사람 때문에 경쟁하거나 돈이 새기 쉬운', 식신: '하고 싶은 일을 시작하고 재능이 눈에 띄는',
    상관: '말과 표현이 앞서고 규칙과 부딪혀 방향을 틀기 쉬운', 편재: '돈과 사람의 움직임이 커지고 활동 반경이 넓어지는', 정재: '꾸준한 수입과 생활의 틀이 잡혀 가는',
    편관: '책임과 압박이 커지고 시험받는 일이 늘어나는', 정관: '조직 안에서 자리가 잡히고 평가와 인정을 받는', 편인: '새로운 공부나 낯선 분야로 눈이 돌아가며 고민이 깊어지는', 정인: '배움과 자격, 윗사람의 도움이 따르는',
  };
  var BR_CL = {
    비견: '주변에 또래·동료가 늘고 혼자 해결하려는 마음이 강해지는', 겁재: '비슷한 처지의 사람과 부딪히거나 지출이 늘기 쉬운', 식신: '생활이 한결 여유로워지고 즐길 거리가 늘어나는',
    상관: '답답한 틀을 벗어나 이직·진로 변경을 고민하기 쉬운', 편재: '이동과 만남이 잦아지고 일과 돈의 규모가 커질 수 있는', 정재: '집·돈·생활 기반을 현실적으로 다지게 되는',
    편관: '직장이나 관계에서 눈치와 부담을 크게 느끼기 쉬운', 정관: '책임질 자리가 생기고 생활이 단정하게 정돈되는', 편인: '혼자 있는 시간이 늘고 방향을 다시 생각하게 되는', 정인: '마음이 안정되고 돌봐 주는 사람이나 배울 곳이 생기는',
  };
  var TAIL = { past: ' 때였을 수 있다.', now: ' 때일 수 있다.', next: ' 때가 될 수 있다.' };
  var tense = function (sd, y1, y2) { return y2 < sd.nowYear ? 'past' : y1 > sd.nowYear ? 'next' : 'now'; };
  var LOVE_TAIL = { past: '이성과 가까워져 연애나 결혼 같은 변화가 있었을 가능성이 있다.', now: '이성과의 인연이 가까워지기 쉬운 흐름일 수 있다.', next: '이성과의 인연이 가까워질 가능성이 있다.' };
  function dwScene(sd, d, id, lead) {
    var a = d.startAge, t = tense(sd, d.startYear, d.endYear), s = [lead || (a + '~' + (a + 9) + '세 (' + d.startYear + '~' + d.endYear + '년)')];
    var sc = STEM_CL[d.stemTG], bc = BR_CL[d.branchTG];
    if (sc) s.push('앞 5년(' + a + '~' + (a + 4) + '세)은 ' + sc + TAIL[t]);
    if (bc) s.push('뒤 5년(' + (a + 5) + '~' + (a + 9) + '세)은 ' + bc + TAIL[t]);
    var lg = loveGroup(sd); if (grp(d.stemTG) === lg || grp(d.branchTG) === lg) s.push(LOVE_TAIL[t]);
    return P(id, 'DAILY_REALITY', { pacing: 'SLOW', mediaTags: t === 'past' ? ['road', 'rainWindow'] : ['road', 'sunrise'], visualMetaphor: a + '세부터의 10년' }, s, { mediaIntent: { scenes: ['road', t === 'past' ? 'rainWindow' : 'sunrise', 'city'], emotions: ['contemplative'], actions: [t === 'past' ? 'lookingBack' : 'lookingForward'] } });
  }
  function past(sd) { // 지나온 대운 중 가장 최근 둘
    var L = (sd.daewoon || []).filter(function (d) { return d.endYear < sd.nowYear && d.stemTG; }), out = [];
    L.slice(-2).forEach(function (d, i, arr) { out.push(dwScene(sd, d, 'd' + (i + 1), i === 0 ? '지나온 10년을 현실로 옮겨 본다.' : null)); });
    // 첫 장면 머리글: 리드 문장이 있으면 나이 구간을 다음 문장으로 옮긴다
    out.forEach(function (p, i) { var d = L.slice(-2)[i]; if (i === 0) p.blocks.splice(1, 0, wrap('~' + d.startAge + '~' + (d.startAge + 9) + '세 (' + d.startYear + '~' + d.endYear + '년)', 19)); });
    if (out.length) out.push(BASIS('명리에서는 대운의 천간을 앞 5년, 지지를 뒤 5년의 흐름으로 읽는다.', L.slice(-2).map(function (d) { return d.ganzhi; }).join(' → ')));
    return out;
  }
  function now(sd) {
    var cd = sd.currentDaewoon, out = []; if (!cd || !cd.stemTG) return out;
    var n = sd.nowYear - cd.startYear, firstHalf = n < 5, s = ['지금은 ' + cd.startAge + '~' + (cd.startAge + 9) + '세 구간, ' + (n + 1) + '년째다.'];
    if (firstHalf) {
      if (STEM_CL[cd.stemTG]) s.push('앞 5년은 ' + STEM_CL[cd.stemTG] + TAIL.now);
      if (BR_CL[cd.branchTG]) s.push((cd.startYear + 5) + '년쯤부터는 ' + BR_CL[cd.branchTG] + ' 쪽으로 무게가 옮겨 갈 수 있다.');
    } else {
      if (BR_CL[cd.branchTG]) s.push('뒤 5년은 ' + BR_CL[cd.branchTG] + TAIL.now);
      if (STEM_CL[cd.stemTG]) s.push('앞 5년을 지나며 ' + STEM_CL[cd.stemTG] + ' 흐름이 이미 한 번 지나갔을 수 있다.');
    }
    var lg = loveGroup(sd); if (grp(cd.stemTG) === lg || grp(cd.branchTG) === lg) s.push('이성과의 인연도 이 시기의 한 주제일 수 있다.');
    out.push(P('n1', 'DAILY_REALITY', { pacing: 'SLOW', mediaTags: ['road', 'dawnCity'], visualMetaphor: '지금 걷고 있는 길' }, s, { mediaIntent: { scenes: ['road', 'dawnCity', 'city'], emotions: ['contemplative'], actions: ['walking'] } }));
    var nx = (sd.daewoon || []).filter(function (d) { return d.startYear === cd.endYear + 1; })[0];
    if (nx && nx.stemTG) out.push(dwScene(sd, nx, 'n2', '다음 10년은 ' + nx.startAge + '세 (' + nx.startYear + '년)부터다.'));
    out.push(BASIS('명리에서는 지금의 대운 ' + cd.ganzhi + (nx ? '에서 ' + nx.ganzhi + '으로 넘어가는 것으로 본다.' : '을 이렇게 본다.')));
    return out;
  }
  function year(sd) {
    var se = sd.sewoon; if (!se || !se.stemTG) return [];
    var s = ['올해(' + se.year + ')를 현실로 옮겨 본다.'];
    if (STEM_CL[se.stemTG]) s.push('상반기에는 ' + STEM_CL[se.stemTG] + ' 해로 느껴질 수 있다.');
    if (BR_CL[se.branchTG]) s.push('하반기로 갈수록 ' + BR_CL[se.branchTG] + ' 흐름이 체감될 수 있다.');
    var lg = loveGroup(sd); if (grp(se.stemTG) === lg || grp(se.branchTG) === lg) s.push('이성과의 인연이 눈에 들어오기 쉬운 해일 수 있다.');
    return [P('y1', 'DAILY_REALITY', { pacing: 'SLOW', mediaTags: ['road', 'sunrise'], visualMetaphor: '올해의 날씨' }, s, { mediaIntent: { scenes: ['road', 'sunrise', 'rain'], emotions: ['contemplative'], actions: ['lookingForward'] } }),
      BASIS('명리에서는 세운의 천간을 상반기, 지지를 하반기로 나눠 읽는다.', se.ganzhi + '년')];
  }

  var KINDS = { child: child, love: love, spouse: spouse, work: work, money: money, people: people, shadow: shadow, past: past, now: now, year: year };
  function make(kind, sd) { var f = KINDS[kind]; if (!f || !sd) return []; try { return f(sd) || []; } catch (e) { return []; } }

  R.Reality = { make: make, KINDS: Object.keys(KINDS), wrap: wrap, TEXT: { CHILD: CHILD, TEEN: TEEN, SPOUSE: SPOUSE, WORK: WORK, PEOPLE: PEOPLE, LOVE_REPEAT: LOVE_REPEAT, PATTERN: PATTERN, STAR: STAR, STEM_CL: STEM_CL, BR_CL: BR_CL } };
})(typeof window !== 'undefined' ? window : globalThis);
