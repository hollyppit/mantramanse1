// Translator — FACTUAL BASIS → 현실 해석 → 시각 은유(運路 연출 문장·장면 스크립트).
// 명리 계산은 하지 않는다. 이미 나온 sd(만세력 엔진·명리 분석 결과)의 값만 읽어 "화면에 나올 현실적인 문장"으로 번역한다.
//   factualBasis : 내부 보존용 사실 목록(십성군 비율·강약). 화면에 직접 출력하지 않는다.
//   화면 문구      : 교과서적 용어(식상·재성·비겁·관성·신약…)를 먼저 말하지 않고, 현실 공감 → 의미 → (필요할 때) 명리 근거 순서로 쓴다.
// 문체: 짧은 서술체(~다). 점쟁이·신령·예언 투 금지. 사용자는 "이 사람·주인공"이 아니라 이름({hero…} 자리표시자 → Narrator.fill)으로 부르고, 한국어 주어 생략을 활용해 이름을 아낀다.
(function (root) {
  var R = root.ReportV2 = root.ReportV2 || {};
  var GROUPS = ['비겁', '식상', '재성', '관성', '인성'];
  var TERMS = /(비겁|식상|재성|관성|인성|신강|신약|비견|겁재|식신|상관|편재|정재|편관|정관|편인|정인|용신|십성)/; // 화면 문구에 나오면 안 되는 말(검사용)

  // ── 1. factualBasis: 사실만 담는다(내부용) ──
  function basis(sd) {
    var g = sd.groups || {}, list = [], vals = GROUPS.map(function (k) { return +g[k] || 0; }), avg = 20;
    GROUPS.forEach(function (k, i) {
      var v = vals[i], level = v >= avg * 1.5 ? 'strong' : v >= avg * 1.15 ? 'high' : v <= avg * 0.4 ? 'weak' : v <= avg * 0.75 ? 'low' : 'mid';
      list.push({ key: k, pct: Math.round(v * 10) / 10, level: level });
    });
    return { dominant: sd.dominantGroup, weakest: sd.weakestGroup, groups: list, dayMasterEl: sd.dayMaster && sd.dayMaster.el, dayMaster: sd.dayMaster && sd.dayMaster.stem, gender: sd.gender,
      strength: sd.strength && (sd.strength.band || sd.strength.zone) || '', note: 'factualBasis — 화면에 직접 출력하지 않는다' };
  }
  var levelOf = function (b, k) { return (b.groups.filter(function (x) { return x.key === k; })[0] || {}).level || 'mid'; };

  // ── 2. 번역표: 우세 군 → 캐릭터 ──
  var DOM = {
    비겁: { short: '독립', role: 'PIONEER', roleKo: '스스로 길을 여는 사람', drive: '남의 길이 아니라 내 방식으로 길을 연다.', strength: '정하고 밀고 나가는 힘', weakness: '도움을 청하기 전에 혼자 끌어안는다.', desire: '누구에게도 휘둘리지 않는 자기만의 자리', theme: '내 방식', whisper: '혼자 해결하는 데 익숙하다.',
      oneLine: ['혼자 해결하는 데', '익숙한 기질이다.'], flip: '그 익숙함이 때로는 가장 큰 짐이 된다.' },
    식상: { short: '확장', role: 'CREATOR', roleKo: '떠오른 것을 현실로 꺼내는 사람', drive: '머릿속의 것을 현실로 만든다.', strength: '시작하고 표현하는 힘', weakness: '너무 많은 장면을 동시에 시작한다.', desire: '자신만의 세계를 만드는 것', theme: '표현과 확장', whisper: '가만히 있는 것을 어려워한다.',
      oneLine: ['생각만 하고 끝내는 쪽은 아니다.'], flip: '떠오른 것은 결국 어떤 형태로든 밖으로 꺼낸다.' },
    재성: { short: '현실', role: 'REALIST', roleKo: '기회의 값을 가늠하는 사람', drive: '기회를 알아보고 현실로 바꾼다.', strength: '상황을 읽고 값어치를 가늠하는 눈', weakness: '눈앞의 이익에 마음이 먼저 기운다.', desire: '흔들리지 않는 현실의 기반', theme: '현실과 성과', whisper: '숫자가 쌓이는 것을 보면 마음이 놓인다.',
      oneLine: ['기회가 어디에 있는지', '먼저 알아보는 기질이다.'], flip: '다만 알아보는 것과 붙잡는 것은 다른 문제다.' },
    관성: { short: '책임', role: 'ANCHOR', roleKo: '책임의 무게를 지는 사람', drive: '맡은 일은 끝까지 책임진다.', strength: '믿고 맡길 수 있는 무게', weakness: '해야 하는 일에 눌려 하고 싶은 일을 미룬다.', desire: '인정받으며 자기 몫을 해내는 자리', theme: '책임과 질서', whisper: '규칙 앞에서 먼저 자세를 고친다.',
      oneLine: ['맡은 일 앞에서', '먼저 자세를 고치는 기질이다.'], flip: '책임이 쌓일수록 자신의 몫은 뒤로 밀린다.' },
    인성: { short: '이해', role: 'SEEKER', roleKo: '이유를 알아야 움직이는 사람', drive: '이유를 이해해야 움직인다.', strength: '깊이 파고들어 본질을 꿰뚫는 힘', weakness: '충분히 알 때까지 움직이지 않는다.', desire: '기대어 쉴 수 있는 안정과 이해', theme: '이해와 안정', whisper: '생각이 정리되기 전에는 입을 열지 않는다.',
      oneLine: ['이유를 알기 전에는', '쉽게 움직이지 않는 기질이다.'], flip: '알고 나면 이미 늦은 때가 종종 있다.' },
  };
  // 부족한 군 → 현실 묘사(일상 장면 한 줄)
  var WEAK = {
    비겁: { short: '자기주장', theme: '자기 중심', line: '혼자 버티기보다 남의 속도에 맞추는 데 익숙하다.' },
    식상: { short: '표현', theme: '표현', line: '하고 싶은 말을 삼키는 날이 많다.' },
    재성: { short: '안정', theme: '현실 관리', line: '들어온 것이 오래 머물지 않는다.' },
    관성: { short: '규칙', theme: '틀과 규칙', line: '정해진 틀이 답답해, 규칙 앞에서 자꾸 길을 돌아간다.' },
    인성: { short: '쉼', theme: '쉼과 정리', line: '정리되기 전에 먼저 움직이고, 이유는 나중에 찾는다.' },
  };
  // 영화 속 인물 구조에 빗대기(설명 도구일 뿐 명리 근거가 아니다). 단정하지 않는다.
  var ANALOGY = {
    비겁: { line: '혼자 해결할 수 있다고 믿고 앞으로 나가지만, 결국 능력보다 더 큰 책임까지 떠안게 되는 주인공.', refs: '아이언맨이나 닥터 스트레인지처럼', tail: '능력보다 책임이 뒤늦게 따라오는 캐릭터 구조와 비슷하다.' },
    식상: { line: '머릿속의 세계를 현실로 꺼내놓지만, 완성된 것보다 다음에 올 장면에 더 마음이 가는 주인공.', refs: '윌리 웡카처럼', tail: '만드는 기쁨이 지키는 일보다 앞서는 캐릭터 구조와 비슷하다.' },
    재성: { line: '남들이 지나친 가능성에서 값어치를 읽어 내지만, 그 가치를 끝까지 붙잡는 일에서 시험받는 주인공.', refs: '머니볼의 빌리 빈처럼', tail: '눈은 앞서 있고 현실은 뒤따르는 캐릭터 구조와 비슷하다.' },
    관성: { line: '맡은 일을 끝까지 지켜 내지만, 정작 자기 몫의 장면은 가장 마지막에 챙기는 주인공.', refs: '캡틴 아메리카처럼', tail: '책임이 곧 정체성이 되어 버리는 캐릭터 구조와 비슷하다.' },
    인성: { line: '충분히 이해하기 전에는 움직이지 않다가, 이해한 순간 누구보다 깊이 들어가는 주인공.', refs: '헤르미온느처럼', tail: '준비가 길어서 타이밍과 싸우게 되는 캐릭터 구조와 비슷하다.' },
  };

  var jo = function (w, k) { return (R.Narrator ? R.Narrator.josa(w, k) : ''); };
  var copula = function (w) { return R.Narrator && R.Narrator.batchim(w) === 'none' ? '다' : '이다'; }; // 지수다 · 민준이다

  // ── 3. CHARACTER PROFILE (동적: 실제 분석 결과에서 만든다) ──
  function profile(sd, name) {
    var b = basis(sd), d = DOM[b.dominant] || DOM.비겁, w = WEAK[b.weakest] || WEAK.재성, nm = String(name || '').trim();
    var conflict = d.short + jo(d.short, '과/와') + ' ' + w.short + ' 사이의 충돌';
    return { character: nm || (sd.gender === 'F' ? '그녀' : '그'), role: d.role, roleKo: d.roleKo, coreDrive: d.drive, strength: d.strength, weakness: d.weakness, hiddenDesire: d.desire, conflict: conflict, basis: b };
  }
  function analogy(sd) { var b = basis(sd), a = ANALOGY[b.dominant] || ANALOGY.비겁; return { intro: '영화로 비유한다면 이런 인물이다.', line: a.line, refs: a.refs, tail: a.tail }; }

  // ── 4. 스크립트 마크업: 줄 앞 접두사  ! impact · ~ pause(blur-in) · . soft  /  빈 줄 = 새 블록 ──
  function seg(block, line, defAnim) {
    var e = 'normal', a = defAnim || 'fade-up', t = line;
    if (t[0] === '!') { e = 'impact'; a = 'zoom-in'; t = t.slice(1); }
    else if (t[0] === '~') { e = 'pause'; a = 'blur-in'; t = t.slice(1); }
    else if (t[0] === '.') { e = 'soft'; a = 'fade'; t = t.slice(1); }
    else if (t[0] === '#') { e = 'impact'; a = 'fade'; t = t.slice(1); return { text: t, emphasis: e, animation: a, block: block, name: true }; } // 사용자 이름: 천천히 나타나고 오래 머문다
    return { text: t, emphasis: e, animation: a, block: block };
  }
  function lines(blocks, defAnim) { var out = []; blocks.forEach(function (bl, i) { bl.forEach(function (l) { if (l) out.push(seg(i, l, defAnim)); }); }); return out; }
  function sc(id, preset, over, blocks, extra) {
    var pm = R.Cinema && R.Cinema.PRESETS[preset], cin = Object.assign({ preset: preset, segments: lines(blocks, over && over.textAnimation === 'cinematic-title' ? 'fade-up' : null) }, pm && pm.mediaTags ? { mediaTags: pm.mediaTags } : {}, over || {});
    if (preset === 'NAME_REVEAL' && !cin.nameEmphasis) cin.nameEmphasis = 'TITLE';
    return Object.assign({ sceneId: id, sceneType: 'cinema', kind: 'script', cinema: cin }, extra || {});
  }
  var fill = function (scenes, vars) { // {hero…} 자리표시자 치환(이름은 브라우저에서만)
    var N = R.Narrator; if (!N) return scenes;
    scenes.forEach(function (s) { (s.cinema.segments || []).forEach(function (g) { g.text = N.fill(g.text, vars); }); if (s.sub) s.sub = N.fill(s.sub, vars); if (s.profile) s.profile.forEach(function (p) { p.value = N.fill(p.value, vars); }); });
    return scenes;
  };

  // ── 5. 프롤로그 (運路) ──
  // 흐름: 갈대밭 → 산맥 → 눈 내리는 산사 → 암전 → 해 → 이름 → "나에게 맞는 때" → 타이틀 → 命(타고난 것).  이름이 없으면 이름 장면은 건너뛴다.
  var titleSub = function (nm) { return nm ? '{hero}에게는,\n{hero}의 때가 있다.' : '모든 사람에게는,\n각자의 때가 있다.'; };
  function prologue(sd, name, vars) {
    var nm = String(name || '').trim(), b = basis(sd), d = DOM[b.dominant] || DOM.비겁, out = [];
    out.push(sc('pro_1', 'DAWN', { pacing: 'SLOW', visualMetaphor: '해 뜨기 직전, 바람에 흔들리는 갈대밭' }, [['사람마다', '!때가 다르다.']], { chapterId: 'c00', mediaIntent: { scenes: ['field', 'sunrise', 'mist'], emotions: ['calm', 'hopeful'] } }));
    out.push(sc('pro_2', 'MOUNTAIN', { visualMetaphor: '넓은 산맥 사이로 이어지는 길' }, [['누군가는', '!일찍 움직이고.']], { chapterId: 'c00', mediaIntent: { scenes: ['mountain', 'road', 'cloud'], emotions: ['powerful'] } }));
    out.push(sc('pro_3', 'MIST', { mediaTags: ['snow', 'temple', 'mountain'], visualMetaphor: '눈 내리는 산사, 고요한 산길' }, [['누군가는', '!오랜 시간을 준비한다.']], { chapterId: 'c00', mediaIntent: { scenes: ['snow', 'temple', 'mountain'], emotions: ['contemplative'] } }));
    out.push(sc('pro_4', 'SILENCE', { pacing: 'PAUSE', bgmMood: 'minimal' }, [['중요한 것은']], { bg: 'black' }));
    out.push(sc('pro_5', 'SUNRISE', { visualMetaphor: '해가 산 위로 올라온다' }, [['남보다 빨리', '!가는 것이 아니다.']], { chapterId: 'c00', mediaIntent: { scenes: ['sunrise', 'mountain'], emotions: ['hopeful'] } }));
    if (nm) out.push(sc('pro_6', 'NAME_REVEAL', {}, [['#{hero}']], { bg: 'black' }));
    out.push(sc('pro_7', 'QUIET_REFLECTION', { pacing: 'PAUSE', overlayStrength: 0.9, motionIntensity: 0, imageMotion: 'none' }, [['나에게 맞는 때를', '!아는 것이다.']], { bg: 'black' }));
    out.push(sc('pro_title', 'CINEMATIC_INTRO', { textAnimation: 'cinematic-title', pacing: 'PAUSE', transition: 'dip-black', motionIntensity: 0, imageMotion: 'none', overlayStrength: 1, nameEmphasis: nm ? 'TITLE' : 'NONE' }, [['!運路']], { bg: 'black', kind: 'title', sub: titleSub(nm) }));
    // 본편 시작: 이름 → 하나의 명 → 命
    var born = nm ? [['#{hero}.'], ['~하나의 명(命)을 가지고 태어났다.']] : [['~하나의 명(命)을 가지고 태어났다.']];
    born.push(['그리고 시간은,', '그 명 위로 끊임없이', '새로운 운을 흘려보냈다.']);
    out.push(sc('pro_born', 'MIST', { nameEmphasis: nm ? 'STRONG' : 'NONE', visualMetaphor: '안개 속에서 시작되는 한 갈래 길' }, born, { chapterId: 'c00', mediaIntent: { scenes: ['mist', 'road'], emotions: ['contemplative'] } }));
    out.push(sc('pro_fixed', 'SILENCE', { pacing: 'SLOW' }, [['운은 계속 변한다.'], ['~하지만 변하지 않는 것도 있다.']], { bg: 'black' }));
    out.push(sc('pro_myeong', 'CHARACTER_REVEAL', { pacing: 'SLOW', textAnimation: 'line-reveal', nameEmphasis: 'SOFT', mediaTags: ['mountain', 'mist'] }, [['!命'], [nm ? '{hero이가} 처음부터' : '처음부터', '가지고 있던 것.']], { chapterId: 'c00', mediaIntent: { scenes: ['mountain', 'mist'], emotions: ['powerful'] } }));
    out.push(sc('pro_hero', 'CHARACTER_REVEAL', { pacing: 'SLOW', mediaTags: ['walkingAlone', 'road'], visualMetaphor: '길 위에 선 한 사람' }, [d.oneLine, ['!' + d.flip]], { chapterId: 'c00', mediaIntent: { scenes: ['road', 'walkingAlone'], emotions: ['contemplative'], actions: ['walking'] } }));
    return fill(out, vars);
  }

  // ── 6. 현실 해석 → 데이터 → 일상 → 통찰 (METAPHOR → DATA → REALITY → INSIGHT) ──
  // 명리 결과를 곧바로 판타지로 바꾸지 않는다. 먼저 현실 언어로 읽고, 그 뒤에 은유(길·강·안개 …)를 얹는다.
  var GL = { 비겁: '주관과 독립심', 식상: '표현력', 재성: '현실 감각', 관성: '책임감', 인성: '깊이 이해하는 힘' };
  var LV = { strong: '매우 높음', high: '높음', mid: '보통', low: '낮음', weak: '매우 낮음' };
  var RISK = { 비겁: '혼자 떠안을 위험', 식상: '에너지 분산 위험', 재성: '붙잡지 못할 위험', 관성: '자기 몫을 미룰 위험', 인성: '때를 놓칠 위험' };
  var FLOW = {
    비겁: { preset: 'MOUNTAIN', vm: '험한 산길을 먼저 오르는 사람', tags: ['mountain', 'road', 'cloud'], meta: [['길이 험할수록', '먼저 발을 내딛는 쪽이다.'], ['~뒤따르는 사람이 없어도.']],
      insight: [['혼자 가도 되는 길이 있다.'], ['~하지만 혼자 가면 안 되는 길도 있다.'], ['구분하는 일이', '!첫 번째 숙제다.']] },
    식상: { preset: 'CROSSROAD', vm: '산길 위에서 갈라지는 길', tags: ['crossroads', 'road'], meta: [['{hero}에게', '하나의 길만 보이는 경우는 드물다.'], ['하나를 시작하면', '그 옆의 가능성까지 함께 보인다.']],
      insight: [['길이 없는 것은 아니다.'], ['~오히려 많다.'], ['문제는', '!어느 길을 버릴 것인가.']] },
    재성: { preset: 'RIVER', vm: '물길이 갈라지는 강', tags: ['river', 'lake'], meta: [['물길이 어디로 날지는', '늘 먼저 눈에 들어온다.'], ['~다만 그 물을 담아 두는 일은', '또 다른 이야기다.']],
      insight: [['보이는 것과', '손에 쥐는 것은 다르다.'], ['~알아본 뒤의 한 걸음이', '!성과를 가른다.']] },
    관성: { preset: 'GATE', vm: '문 앞에서 옷깃을 여미는 사람', tags: ['openDoor', 'temple', 'stairs'], meta: [['문 앞에서', '먼저 옷깃을 여미는 쪽이다.'], ['~열기 전에 이미 자세를 갖춘다.']],
      insight: [['해야 하는 일은 끝까지 한다.'], ['~그런데 하고 싶은 일은', '늘 그다음이다.'], ['순서를 바꾸는 일이', '!이 길의 숙제다.']] },
    인성: { preset: 'MIST', vm: '안개가 걷히길 기다리는 사람', tags: ['mist', 'mountain'], meta: [['안개가 걷힐 때까지', '발을 떼지 않는다.'], ['~보이지 않는 길은', '걷지 않는다.']],
      insight: [['충분히 알고 움직이는 힘이 있다.'], ['~하지만 때는', '기다려 주지 않는다.'], ['아는 만큼 움직이는 것이', '!이 길의 균형이다.']] },
  };
  function dataScene(id, rows, over, extra) {
    var s = sc(id, 'DATA_VIEW', Object.assign({ textAnimation: 'line-reveal', pacing: 'MEDIUM' }, over || {}), [rows.map(function (r) { return r[1]; })], Object.assign({ kind: 'profile', bg: 'black' }, extra || {}));
    s.profile = rows.map(function (r) { return { label: r[0], value: r[1] }; }); return s;
  }
  function strongScene(sd, vars) {
    var b = basis(sd), k = b.dominant || '비겁', w = b.weakest || '재성', F = FLOW[k] || FLOW.비겁, out = [];
    var rows = [[GL[k], LV[levelOf(b, k)]], [GL[w] || GL.재성, LV[levelOf(b, w)]], [RISK[k], '주의']];
    out.push(sc('life_meta', F.preset, { mediaTags: F.tags, visualMetaphor: F.vm, pacing: 'SLOW' }, F.meta, { mediaIntent: { scenes: F.tags } }));
    out.push(dataScene('life_data', rows));
    var S = {
      비겁: { tags: ['meetingRoom'], intent: { scenes: ['workspace', 'city'], actions: ['meeting'], emotions: ['tense'] }, blocks: [['회의가 길어질수록', '답답해지는 쪽이다.'], ['~“그냥 제가 해볼게요.”'], ['결국 먼저 움직인다.']] },
      식상: { tags: ['studio', 'laptop'], intent: { scenes: ['workspace', 'library'], actions: ['creating'], emotions: ['energetic'] }, blocks: [['머릿속에 떠오른 것을', '밖으로 꺼내는 힘은 강하다.'], ['~문제는 그 다음이다.']] },
      재성: { tags: ['laptop', 'paymentAlert'], intent: { scenes: ['city', 'workspace'], actions: ['working'], emotions: ['calm'] }, blocks: [['기회는 늘', '조용히 먼저 눈에 들어온다.'], ['~문제는 알아본 뒤다.']] },
      관성: { tags: ['emptyOffice', 'commute'], intent: { scenes: ['workspace', 'city'], actions: ['working'], emotions: ['cold'] }, blocks: [['퇴근 시간이 지나도', '자리를 먼저 뜨지 못한다.'], ['~맡은 일이 아직 끝나지 않았기 때문이다.']] },
      인성: { tags: ['desk', 'library'], intent: { scenes: ['library', 'rain'], actions: ['studying'], emotions: ['contemplative'] }, blocks: [['결정을 내리기 전에', '자료를 한 번 더 확인한다.'], ['~확인이 끝나면 이미 늦은 때가 있다.']] },
    }[k] || null;
    if (S) out.push(sc('life_strong', 'DAILY_REALITY', { mediaTags: S.tags }, S.blocks, { mediaIntent: S.intent }));
    out.push(sc('life_insight', 'QUIET_REFLECTION', { pacing: 'SLOW', overlayStrength: 0.7 }, F.insight, { bg: 'black' }));
    // 현실 → 의미 → 명리 근거 순서: 용어는 마지막에 한 줄로만 짚는다(basisNote: 용어 검사 예외)
    var bn = sc('life_basis', 'REALITY_CHECK', { pacing: 'MEDIUM' }, [['.명리에서는 이 차이를', '.' + k + jo(k, '과/와') + ' ' + w + '의 관계로 본다.']], { bg: 'black' }); bn.basisNote = true; out.push(bn);
    return fill(out, vars);
  }
  function weakScene(sd, vars) {
    var b = basis(sd), d = DOM[b.dominant] || DOM.비겁, w = WEAK[b.weakest] || WEAK.재성;
    var blocks = [[d.whisper], ['~' + (b.dominant === '식상' ? '떠오른 것은 결국 밖으로 꺼내야 직성이 풀린다.' : d.weakness)], ['!' + w.line]];
    return fill([sc('life_weak', 'REALITY_CHECK', { pacing: 'SLOW', mediaTags: ['crossroads'] }, blocks, { mediaIntent: { scenes: ['road', 'rain'], emotions: ['lonely'], actions: ['thinking'] } })], vars);
  }
  function moneyScene(sd, vars) {
    var b = basis(sd), lv = levelOf(b, '재성'), flow = (b.dominant === '식상' || b.dominant === '비겁') && (lv === 'weak' || lv === 'low');
    var blocks, tags = ['paymentAlert', 'card'];
    if (flow) blocks = [['입금 알림.'], ['~돈이 들어온다.'], ['그런데 오래 머물지는 않는다.'], ['{hero}에게 돈은', '보관해야 할 물건보다'], ['~다음 길을 여는', '!연료에 가깝다.']];
    else if (lv === 'strong' || lv === 'high') blocks = [['입금 알림.'], ['돈이 들어온다.'], ['~그 돈이 어디로 가는지 정확히 안다.'], ['숫자가 쌓이는 것을 보면 마음이 놓인다.'], ['!문제는 놓이는 마음이 멈추는 마음이 되는 순간이다.']];
    else blocks = [['입금 알림.'], ['돈은 들어오고 나간다.'], ['~크게 흔들리지도, 크게 불어나지도 않는다.'], ['{hero}에게 돈은', '!목표가 아니라 선택지의 크기다.']];
    return fill([sc('life_money', 'DAILY_REALITY', { mediaTags: tags, pacing: 'SLOW' }, blocks, { mediaIntent: { scenes: ['city', 'nightCity'], emotions: ['contemplative'], actions: ['thinking'] } })], vars);
  }

  // ── 7. 大運 · 歲運 · 月運 · 日辰: 운 흐름 계산 결과(sd.daewoon / sd.sewoon / sd.monthlyLuck 의 season)만 읽어 은유로 옮긴다 ──
  //  분류는 AI 가 정하지 않는다. 계절 6종(기회·확장·수확·축적·전환·방어)은 엔진 flow 를 옮긴 saju-data.js 규칙이다.
  //  대운 = 길·지형(10년) / 세운 = 날씨(1년) / 월운 = 계절의 결 / 일진 = 오늘의 조건
  var SEASON = {
    opportunity: { h: '機', ko: '기회', preset: 'DAWN', terrain: '닫혀 있던 길이 열리는 구간.', weather: ['구름 사이로 해가 드는 날씨.', '움직이기에 비교적 가벼운 해.'], today: '새로운 시도를 가볍게 꺼내 보기 좋은 흐름.' },
    expansion: { h: '展', ko: '확장', preset: 'MOUNTAIN', terrain: '오를수록 시야가 트이는 능선.', weather: ['바람이 앞에서 밀어 주는 날씨.', '범위를 넓혀 볼 만한 해.'], today: '밖으로 넓혀 보기 좋은 흐름.' },
    harvest: { h: '收', ko: '수확', preset: 'WIND', terrain: '심어 둔 것이 익어 가는 들판.', weather: ['맑고 선선한 가을 날씨.', '쌓아 온 것을 거두기 좋은 해.'], today: '그동안 해 둔 것을 거두기 좋은 흐름.' },
    accumulation: { h: '蓄', ko: '축적', preset: 'MIST', terrain: '조용하지만 안에서 쌓이는 구간.', weather: ['안개가 낮게 깔린 날씨.', '나서기보다 쌓아 두는 해.'], today: '밀어붙이기보다 정리하고 쌓아 두기 좋은 흐름.' },
    transition: { h: '轉', ko: '전환', preset: 'SEASON_CHANGE', terrain: '길의 방향이 바뀌는 갈림목.', weather: ['바람의 방향이 바뀌는 날씨.', '익숙한 길을 다시 점검하는 해.'], today: '방향을 점검하고 바꿔 보기 좋은 흐름.' },
    defense: { h: '防', ko: '방어', preset: 'RAIN', terrain: '비가 내려 조심해서 걸어야 하는 구간.', weather: ['비가 내리는 날씨.', '조심해서 이동하고 점검하는 해.'], today: '앞으로 밀어붙이기보다 정리와 확인에 유리한 흐름.' },
  };
  var seasonTag = function (k) { var s = SEASON[k]; return s ? s.h + ' · ' + s.ko : ''; };
  // 일진: 길흉이 아니라 "오늘의 조건". season 값(일운 계산이 있을 때) → 한 줄
  function todayCondition(season) { var s = SEASON[season]; return s ? s.today : ''; }

  function daewoonScenes(sd, vars) {
    var L = sd.daewoon || [], out = []; if (!L.length) return out;
    out.push(sc('life_dw1', 'SEASON_CHANGE', { pacing: 'SLOW', visualMetaphor: '같은 산길 위로 봄·여름·비·겨울이 차례로 지나간다' }, [['명은 쉽게 바뀌지 않는다.'], ['~하지만 주변의 환경은 바뀐다.'], ['10년을 단위로', '!큰 흐름이 움직인다.']], { mediaIntent: { scenes: ['road', 'meadow', 'rain', 'snow'], emotions: ['contemplative'] } }));
    out.push(sc('life_dw2', 'CINEMATIC_INTRO', { textAnimation: 'cinematic-title', pacing: 'PAUSE', overlayStrength: 1, motionIntensity: 0, imageMotion: 'none' }, [['!大運']], { bg: 'black', kind: 'title', sub: '10년마다 달라지는 큰 환경' }));
    var ci = 0, cd = sd.currentDaewoon; L.forEach(function (x, i) { if (x.isCurrent || (cd && x.startYear === cd.startYear)) ci = i; });
    var from = Math.max(0, Math.min(ci - 1, L.length - 4)), win = L.slice(from, from + 4);
    out.push(dataScene('life_dw3', win.map(function (x) { return [x.startYear + ' ━ ' + x.endYear, seasonTag(x.season) || '—']; }), { textAnimation: 'slide-left' }));
    var cur = L[ci], S = cur && SEASON[cur.season];
    if (S) out.push(sc('life_dw4', S.preset, { visualMetaphor: S.terrain }, [['지금 {hero이가} 걷고 있는 길은,'], ['~' + S.terrain.replace(/\.$/, '') + '.']], { mediaIntent: { scenes: ['road', 'mountain'], emotions: ['contemplative'] } }));
    return fill(out, vars);
  }
  function sewoonScenes(sd, vars) {
    var se = sd.sewoon, out = []; if (!se) return out;
    out.push(sc('life_sw1', 'RAIN', { pacing: 'SLOW', visualMetaphor: '같은 산길에 갑자기 비가 내린다' }, [['같은 산길.'], ['~하지만 갑자기 비가 내린다.'], ['같은 길이라도', '!날씨에 따라 걷는 방법은 달라진다.']], { mediaIntent: { scenes: ['road', 'rain'], emotions: ['contemplative'] } }));
    out.push(sc('life_sw2', 'CINEMATIC_INTRO', { textAnimation: 'cinematic-title', pacing: 'PAUSE', overlayStrength: 1, motionIntensity: 0, imageMotion: 'none' }, [['!歲運']], { bg: 'black', kind: 'title', sub: String(se.year) }));
    var S = SEASON[se.season];
    if (S) out.push(sc('life_sw3', S.preset, { visualMetaphor: S.weather[0] }, [['올해의 날씨는'], ['~' + S.weather[0]], ['!' + S.weather[1]]], { mediaIntent: { scenes: ['road', 'sunrise', 'rain', 'mist'], emotions: ['contemplative'] } }));
    return fill(out, vars);
  }
  function monthScenes(sd, vars) {
    var m = (sd.monthlyLuck || [])[0], S = m && SEASON[m.season], out = []; if (!S) return out;
    out.push(sc('life_mo1', S.preset, { visualMetaphor: '달마다 달라지는 계절의 결' }, [['달마다', '계절의 결이 조금씩 달라진다.'], ['~이번 달은 ' + S.terrain.replace(/\.$/, '') + '.']], { mediaIntent: { scenes: ['road', 'field'], emotions: ['contemplative'] } }));
    return fill(out, vars);
  }

  // 챕터(base id)별로 끼워 넣을 현실·흐름 장면
  var INSERT = { c03: ['strong'], c05: ['weak'], c08: ['money'], c15: ['daewoon'], c17: ['sewoon'], c18: ['month'] };
  var MAKE = { strong: strongScene, weak: weakScene, money: moneyScene, daewoon: daewoonScenes, sewoon: sewoonScenes, month: monthScenes };
  function chapterScenes(base, sd, vars) {
    var out = []; (INSERT[base] || []).forEach(function (k) { out = out.concat(MAKE[k](sd, vars)); });
    return out;
  }

  // ── 8. 챕터 오프닝: 第N章 · 한자 + 질문 한 줄. 상위 분류 11개(命性勢財業緣壁機運時路)를 20챕터가 나눠 쓴다.  {hero…} 는 Narrator.fill 이 채운다 ──
  var UNYEON = {
    序: { no: 0, label: '序章', ko: '運路' }, 命: { no: 1, ko: '타고난 것' }, 性: { no: 2, ko: '기질' }, 勢: { no: 3, ko: '힘' }, 財: { no: 4, ko: '재물' }, 業: { no: 5, ko: '업' }, 緣: { no: 6, ko: '인연' },
    壁: { no: 7, ko: '벽' }, 機: { no: 8, ko: '기회' }, 運: { no: 9, ko: '운' }, 時: { no: 10, ko: '때' }, 路: { no: 11, ko: '길' }, 終: { no: 12, label: '終章', ko: '運路' },
  };
  var NUM = ['', '一', '二', '三', '四', '五', '六', '七', '八', '九', '十', '十一'];
  var HOOK = {
    c00: ['序', '{hero}의 운이 흐르는 길.'], c01: ['命', '{hero은는} 어떤 명(命)을 쥐고 태어났는가.'], c02: ['命', '그 명을 이루는 다섯 기운은\n어떻게 놓여 있는가.'], c03: ['性', '무엇이 {hero을를} 움직이는가.'],
    c04: ['勢', '{hero}의 힘은\n어디에서 살아나는가.'], c05: ['勢', '어디에서 힘이 빠지는가.'], c06: ['業', '어떤 길에서\n가장 강점을 발휘하는가.'], c07: ['機', '기회는 어떤 모습으로\n{hero}에게 찾아오는가.'],
    c08: ['財', '{hero}에게\n돈은 어떻게 들어오고 움직이는가.'], c09: ['緣', '{hero은는} 누구에게,\n어떻게 마음을 여는가.'], c10: ['緣', '오래 가는 관계에서\n{hero이가} 바라는 것은 무엇인가.'], c11: ['緣', '사람들 사이에서\n{hero}의 얼굴은 어떤가.'],
    c12: ['緣', '{hero}의 걸음과\n속도가 맞는 사람은 누구인가.'], c13: ['緣', '{hero이가} 자라온 자리는\n어떤 환경이었는가.'], c14: ['壁', '반복해서 마주치는 문제에는\n어떤 오래된 뿌리가 있는가.'], c15: ['運', '10년마다\n환경은 어떻게 달라지는가.'],
    c16: ['時', '지금은 움직일 때인가,\n준비할 때인가.'], c17: ['時', '올해, 같은 길 위의 날씨는\n어떻게 달라지는가.'], c18: ['時', '앞으로 열두 달,\n어떤 흐름이 기다리는가.'], c19: ['路', '앞으로\n어떤 선택이 유리한가.'], c20: ['終', '{hero}에게는,\n{hero}의 때가 있다.'],
  };
  // 반환: { label: '第一章 · 命', ko: '타고난 것', line: '…{hero}…' } — line 은 아직 자리표시자 상태(fill 로 채운다)
  function chapterHook(base, no) {
    var h = HOOK[base]; if (!h) return null; var u = UNYEON[h[0]], label;
    if (h[0] === '序') label = '序章 · 運路'; else if (h[0] === '終') label = '終章'; else label = '第' + NUM[u.no] + '章 · ' + h[0] + ' · ' + u.ko;
    return { label: label, ko: u.ko, line: h[1], hanja: h[0] };
  }

  // ── 9. 엔딩: 운명을 확정하지 않는다. 태어날 때 가진 것은 쉽게 바꿀 수 없지만, 운은 계속 움직인다. ──
  function ending(sd, name, vars) {
    var nm = String(name || '').trim(), out = [];
    out.push(sc('end_1', 'SUNRISE', { pacing: 'SLOW', imageMotion: 'slow-zoom-out', visualMetaphor: '해가 떠오르는 산맥, 길게 이어진 길' }, [['태어날 때 가진 것은', '쉽게 바꿀 수 없다.'], ['~하지만 운은', '!계속 움직인다.']], { mediaIntent: { scenes: ['sunrise', 'mountain', 'road'], emotions: ['hopeful'], actions: ['lookingForward'] } }));
    out.push(sc('end_2', 'DAWN', { pacing: 'SLOW', visualMetaphor: '길 위로 햇빛이 들어온다' }, [['좋은 때에는 움직이고.'], ['막힌 때에는 준비한다.']], { mediaIntent: { scenes: ['road', 'sunrise'], emotions: ['hopeful'] } }));
    if (nm) out.push(sc('end_3', 'NAME_REVEAL', {}, [['#{hero}']], { bg: 'black' }));
    out.push(sc('end_4', 'QUIET_REFLECTION', { pacing: 'PAUSE', overlayStrength: 1, motionIntensity: 0, imageMotion: 'none' }, [['중요한 것은', '남보다 빨리 가는 것이 아니다.'], ['~내게 오는 때를', '!놓치지 않는 것이다.']], { bg: 'black' }));
    out.push(sc('end_title', 'ENDING', { textAnimation: 'cinematic-title', pacing: 'PAUSE', overlayStrength: 1, motionIntensity: 0, imageMotion: 'none', nameEmphasis: nm ? 'TITLE' : 'NONE' }, [['!運路']], { bg: 'black', kind: 'title', sub: titleSub(nm) }));
    return fill(out, vars);
  }

  // ── 10. 문체 검사: 運路 콘텐츠에서 쓰지 않는 호칭("이 사람·주인공·이 인물·캐릭터·이 이야기")과 용어 선노출 ──
  var BAD_VOICE = /(이 사람|주인공|이 인물|캐릭터|이 이야기|당신의 이야기|내 이야기)/;
  function lint(scenes) {
    var p = []; (scenes || []).forEach(function (s) {
      var txt = ((s.cinema && s.cinema.segments) || []).map(function (g) { return g.text; }).join(' ') + ' ' + (s.sub || '');
      if (BAD_VOICE.test(txt)) p.push(s.sceneId + ': 금지 호칭 "' + txt.match(BAD_VOICE)[0] + '"');
      if (!s.basisNote && TERMS.test(txt)) p.push(s.sceneId + ': 용어가 현실 해석보다 먼저 나옴 "' + txt.match(TERMS)[0] + '"');
    }); return p;
  }

  // ── 11. 관리자 문구 override: content.sceneCopy[sceneId] = { segments, nameEmphasis, sub } 를 장면에 얹는다(원본은 건드리지 않고 복사본을 돌려준다) ──
  //  segments 의 {hero…} 자리표시자는 여기서 이름으로 채운다. 허용 범위는 Cinema.clean 이 정한다(서버 functions/_cinema.js cleanSceneCopy 와 같은 규칙).
  function applyCopy(scenes, copy, vars) {
    if (!copy || !scenes) return scenes; var K = R.Cinema, N = R.Narrator;
    return scenes.map(function (s) {
      var e = copy[s.sceneId]; if (!e || !s.cinema) return s;
      var o = Object.assign({}, s), cin = Object.assign({}, s.cinema), segs = (K.clean({ segments: e.segments }).segments || []);
      if (segs.length && s.kind !== 'profile') cin.segments = segs.map(function (g) { return Object.assign({}, g, { text: N ? N.fill(g.text, vars) : g.text }); });
      if (K.NAME_EMPH.indexOf(e.nameEmphasis) >= 0) cin.nameEmphasis = e.nameEmphasis;
      if (typeof e.sub === 'string' && s.sub != null) o.sub = N ? N.fill(e.sub, vars) : e.sub;
      o.cinema = cin; o._built = undefined; return o;
    });
  }

  R.Translator = { applyCopy: applyCopy, GROUPS: GROUPS, TERMS: TERMS, BAD_VOICE: BAD_VOICE, DOM: DOM, WEAK: WEAK, ANALOGY: ANALOGY, SEASON: SEASON, UNYEON: UNYEON, basis: basis, profile: profile, analogy: analogy, prologue: prologue, ending: ending, strongScene: strongScene, weakScene: weakScene, moneyScene: moneyScene,
    daewoonScenes: daewoonScenes, sewoonScenes: sewoonScenes, monthScenes: monthScenes, seasonTag: seasonTag, todayCondition: todayCondition, chapterScenes: chapterScenes, chapterHook: chapterHook, HOOK: HOOK, INSERT: INSERT, lint: lint };
})(typeof window !== 'undefined' ? window : globalThis);
