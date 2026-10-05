// Translator — FACTUAL BASIS → REAL-LIFE TRANSLATOR → STORY WRITER(템플릿 층).
// 명리 계산은 하지 않는다. 이미 나온 sd(만세력 엔진·명리 분석 결과)의 값만 읽어 "화면에 나올 현실적인 문장"으로 번역한다.
//   factualBasis : 내부 보존용 사실 목록(십성군 비율·강약). 화면에 직접 출력하지 않는다.
//   화면 문구      : 교과서적 용어(식상·재성·비겁·관성·신약…)를 쓰지 않고, 캐릭터 묘사·현실 장면으로 쓴다.
// 문체: 전지적 내레이터(서술체 ~다). 점쟁이·신령·예언 투 금지. 주인공 호칭은 {hero…} 자리표시자 → Narrator.fill.
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
      oneLine: ['이 이야기의 주인공은', '혼자 해결하는 데 익숙한 사람이다.'], flip: '너무 익숙하다는 것이 문제다.' },
    식상: { short: '확장', role: 'CREATOR', roleKo: '떠오른 것을 현실로 꺼내는 사람', drive: '머릿속의 것을 현실로 만든다.', strength: '시작하고 표현하는 힘', weakness: '너무 많은 장면을 동시에 시작한다.', desire: '자신만의 세계를 만드는 것', theme: '표현과 확장', whisper: '가만히 있는 것을 어려워한다.',
      oneLine: ['이 이야기의 주인공은', '이상할 정도로 가만히 있는 것을 어려워한다.'], flip: '무언가 떠오르면 결국 현실로 꺼내놓아야 하는 사람이다.' },
    재성: { short: '현실', role: 'REALIST', roleKo: '기회의 값을 가늠하는 사람', drive: '기회를 알아보고 현실로 바꾼다.', strength: '상황을 읽고 값어치를 가늠하는 눈', weakness: '눈앞의 이익에 마음이 먼저 기운다.', desire: '흔들리지 않는 현실의 기반', theme: '현실과 성과', whisper: '숫자가 쌓이는 것을 보면 마음이 놓인다.',
      oneLine: ['이 이야기의 주인공은', '기회가 어디에 있는지 먼저 알아본다.'], flip: '문제는 알아보는 것과 붙잡는 것이 다르다는 점이다.' },
    관성: { short: '책임', role: 'ANCHOR', roleKo: '책임의 무게를 지는 사람', drive: '맡은 일은 끝까지 책임진다.', strength: '믿고 맡길 수 있는 무게', weakness: '해야 하는 일에 눌려 하고 싶은 일을 미룬다.', desire: '인정받으며 자기 몫을 해내는 자리', theme: '책임과 질서', whisper: '규칙 앞에서 먼저 자세를 고친다.',
      oneLine: ['이 이야기의 주인공은', '맡은 일 앞에서 먼저 자세를 고치는 사람이다.'], flip: '책임이 쌓일수록 자신은 뒤로 밀린다.' },
    인성: { short: '이해', role: 'SEEKER', roleKo: '이유를 알아야 움직이는 사람', drive: '이유를 이해해야 움직인다.', strength: '깊이 파고들어 본질을 꿰뚫는 힘', weakness: '충분히 알 때까지 움직이지 않는다.', desire: '기대어 쉴 수 있는 안정과 이해', theme: '이해와 안정', whisper: '생각이 정리되기 전에는 입을 열지 않는다.',
      oneLine: ['이 이야기의 주인공은', '이유를 알기 전에는 쉽게 움직이지 않는다.'], flip: '알고 나면 이미 늦은 장면이 종종 있다.' },
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
    return { text: t, emphasis: e, animation: a, block: block };
  }
  function lines(blocks, defAnim) { var out = []; blocks.forEach(function (bl, i) { bl.forEach(function (l) { if (l) out.push(seg(i, l, defAnim)); }); }); return out; }
  function sc(id, preset, over, blocks, extra) {
    var cin = Object.assign({ preset: preset, segments: lines(blocks, over && over.textAnimation === 'cinematic-title' ? 'fade-up' : null) }, over || {});
    return Object.assign({ sceneId: id, sceneType: 'cinema', kind: 'script', cinema: cin }, extra || {});
  }
  var fill = function (scenes, vars) { // {hero…} 자리표시자 치환(이름은 브라우저에서만)
    var N = R.Narrator; if (!N) return scenes;
    scenes.forEach(function (s) { (s.cinema.segments || []).forEach(function (g) { g.text = N.fill(g.text, vars); }); if (s.profile) s.profile.forEach(function (p) { p.value = N.fill(p.value, vars); }); });
    return scenes;
  };

  // ── 5. 프롤로그 (MY LIFE AS A MOVIE) ──
  function prologue(sd, name, vars) {
    var nm = String(name || '').trim(), p = profile(sd, nm), a = analogy(sd), d = DOM[p.basis.dominant] || DOM.비겁, out = [];
    out.push(sc('pro_1', 'CINEMATIC_INTRO', { motionIntensity: 0, imageMotion: 'none', overlayStrength: 1, bgmMood: 'cinematic', pacing: 'SLOW' }, [['모든 사람에게는', '!각자의 이야기가 있다.']], { bg: 'black' }));
    out.push(sc('pro_2', 'QUIET_REFLECTION', { mediaTags: ['dawnCity', 'road'], pacing: 'SLOW' }, [['같은 나이에 시작해도', '!같은 장면에 도착하지 않는다.']], { chapterId: 'c00', mediaIntent: { scenes: ['city', 'road'], emotions: ['contemplative'] } }));
    out.push(sc('pro_3', 'QUIET_REFLECTION', { pacing: 'PAUSE', overlayStrength: 0.9, motionIntensity: 0, imageMotion: 'none' }, [['그리고 이 이야기의 주인공은', nm ? '!' + nm + copula(nm) + '.' : '!당신이다.']], { bg: 'black' }));
    out.push(sc('pro_title', 'CINEMATIC_INTRO', { textAnimation: 'cinematic-title', pacing: 'PAUSE', transition: 'dip-black', motionIntensity: 0, imageMotion: 'none', overlayStrength: 1 }, [[nm ? '!THE STORY OF ' + nm : '!MY STORY']], { bg: 'black', kind: 'title', sub: 'MY LIFE AS A MOVIE' }));
    out.push(sc('pro_hero', 'CHARACTER_REVEAL', { mediaTags: ['walkingAlone', 'nightCity'], pacing: 'SLOW' }, [d.oneLine, ['!' + d.flip]], { chapterId: 'c00', mediaIntent: { scenes: ['nightCity', 'city'], emotions: ['lonely', 'contemplative'], actions: ['walking'] } }));
    // CHARACTER PROFILE: 영화 캐릭터 카드처럼 한 줄씩
    var rows = [['CHARACTER', p.character], ['ROLE', p.role], ['CORE DRIVE', '“' + p.coreDrive + '”'], ['STRENGTH', '“' + p.strength + '”'], ['WEAKNESS', '“' + p.weakness + '”'], ['HIDDEN DESIRE', '“' + p.hiddenDesire + '”'], ['CONFLICT', '“' + p.conflict + '”']];
    var pf = sc('pro_profile', 'CHARACTER_REVEAL', { pacing: 'MEDIUM', textAnimation: 'line-reveal', motionIntensity: 1, imageMotion: 'slow-zoom-in', mediaTags: ['desk'] }, [rows.map(function (r) { return r[1]; })], { kind: 'profile', chapterId: 'c00', mediaIntent: { scenes: ['workspace', 'library'], emotions: ['calm'] } });
    pf.profile = rows.map(function (r) { return { label: r[0], value: r[1] }; });
    out.push(pf);
    // 영화로 비유하기(보조 설명)
    out.push(sc('pro_analogy', 'DISCOVERY', { pacing: 'SLOW', mediaTags: ['stairs'] }, [[a.intro], ['~' + a.line], ['.' + a.refs, '.' + a.tail]], { chapterId: 'c00', mediaIntent: { scenes: ['road', 'mountain'], emotions: ['powerful'] } }));
    return fill(out, vars);
  }

  // ── 6. 현실 장면(DAILY_LIFE) — 추상적 성향을 실제 생활 장면으로 ──
  function strongScene(sd, vars) {
    var b = basis(sd), k = b.dominant;
    var S = {
      비겁: { tags: ['meetingRoom'], intent: { scenes: ['workspace', 'city'], actions: ['meeting'], emotions: ['tense'] }, blocks: [['회의가 길어질수록', '이 사람은 답답해진다.'], ['~“그냥 제가 해볼게요.”'], ['결국 먼저 움직이는 쪽이다.']] },
      식상: { tags: ['studio', 'laptop'], intent: { scenes: ['workspace', 'library'], actions: ['creating'], emotions: ['energetic'] }, blocks: [['머릿속에 떠오른 아이디어를', '세상 밖으로 꺼내는 힘은 강하다.'], ['~문제는 그 다음이다.']] },
      재성: { tags: ['laptop', 'paymentAlert'], intent: { scenes: ['city', 'workspace'], actions: ['working'], emotions: ['calm'] }, blocks: [['기회는 늘', '조용히 먼저 눈에 들어온다.'], ['~문제는 알아본 뒤다.']] },
      관성: { tags: ['emptyOffice', 'commute'], intent: { scenes: ['workspace', 'city'], actions: ['working'], emotions: ['cold'] }, blocks: [['퇴근 시간이 지나도', '자리를 먼저 뜨지 못한다.'], ['~맡은 일이 아직 끝나지 않았기 때문이다.']] },
      인성: { tags: ['desk', 'library'], intent: { scenes: ['library', 'rain'], actions: ['studying'], emotions: ['contemplative'] }, blocks: [['결정을 내리기 전에', '자료를 한 번 더 확인한다.'], ['~확인이 끝나면 이미 늦은 장면이 있다.']] },
    }[k];
    return fill([sc('life_strong', 'DAILY_REALITY', { mediaTags: S.tags }, S.blocks, { mediaIntent: S.intent })], vars);
  }
  function weakScene(sd, vars) {
    var b = basis(sd), d = DOM[b.dominant] || DOM.비겁, w = WEAK[b.weakest] || WEAK.재성;
    var blocks;
    blocks = [[d.whisper], ['~' + (b.dominant === '식상' ? '무언가 떠오르면 결국 현실로 꺼내놓아야 하는 사람이다.' : d.weakness)], ['!' + w.line]];
    return fill([sc('life_weak', 'REALITY_CHECK', { pacing: 'SLOW', mediaTags: ['crossroads'] }, blocks, { mediaIntent: { scenes: ['road', 'rain'], emotions: ['lonely'], actions: ['thinking'] } })], vars);
  }
  function moneyScene(sd, vars) {
    var b = basis(sd), lv = levelOf(b, '재성'), flow = (b.dominant === '식상' || b.dominant === '비겁') && (lv === 'weak' || lv === 'low');
    var blocks, tags = ['paymentAlert', 'card'];
    if (flow) blocks = [['입금 알림.'], ['~돈이 들어온다.'], ['그런데 오래 머물지는 않는다.'], ['이 사람에게 돈은', '보관해야 할 물건보다'], ['~다음 장면을 만드는', '!연료에 가깝다.']];
    else if (lv === 'strong' || lv === 'high') blocks = [['입금 알림.'], ['돈이 들어온다.'], ['~이 사람은 그 돈이 어디로 가는지 정확히 안다.'], ['숫자가 쌓이는 것을 보면 마음이 놓인다.'], ['!문제는 놓이는 마음이 멈추는 마음이 되는 순간이다.']];
    else blocks = [['입금 알림.'], ['돈은 들어오고 나간다.'], ['~크게 흔들리지도, 크게 불어나지도 않는다.'], ['이 사람에게 돈은', '!목표가 아니라 선택지의 크기다.']];
    return fill([sc('life_money', 'DAILY_REALITY', { mediaTags: tags, pacing: 'SLOW' }, blocks, { mediaIntent: { scenes: ['city', 'nightCity'], emotions: ['contemplative'], actions: ['thinking'] } })], vars);
  }
  // 챕터(base id)별로 끼워 넣을 현실 장면
  var INSERT = { c03: ['strong'], c05: ['weak'], c08: ['money'] };
  function chapterScenes(base, sd, vars) {
    var out = []; (INSERT[base] || []).forEach(function (k) { out = out.concat(k === 'strong' ? strongScene(sd, vars) : k === 'weak' ? weakScene(sd, vars) : moneyScene(sd, vars)); });
    return out;
  }

  // ── 7. 챕터 오프닝(검은 화면 + 질문 한 줄) ──
  var HOOK = {
    c00: ['PROLOGUE', '이 이야기의 주인공은 누구인가.'], c01: ['CHARACTER', '이 사람은 어떤 장면에서 가장 이 사람다운가.'], c02: ['ELEMENTS', '이 사람을 이루는 재료는 무엇인가.'], c03: ['TEMPERAMENT', '이 사람은 위기 앞에서 어떻게 움직이는가.'],
    c04: ['HIDDEN DESIRE', '이 사람이 아직 꺼내지 않은 것은 무엇인가.'], c05: ['SHADOW', '이 사람이 같은 자리에서 자꾸 멈추는 이유는 무엇인가.'], c06: ['CAREER', '이 사람은 어떤 자리에서 가장 오래 버티는가.'], c07: ['SUCCESS', '이 사람에게 성공은 어떤 모양을 하고 있는가.'],
    c08: ['MONEY', '이 사람에게 돈은 무엇을 의미하는가.'], c09: ['LOVE', '이 사람은 누구에게, 어떻게 마음을 여는가.'], c10: ['PARTNER', '오래 가는 관계에서 이 사람이 바라는 것은 무엇인가.'], c11: ['PEOPLE', '사람들 사이에서 이 사람은 어떤 얼굴을 하는가.'],
    c12: ['MATCH', '이 사람과 같은 속도로 걷는 사람은 누구인가.'], c13: ['FAMILY', '이 사람이 자라온 자리는 어떤 장면이었는가.'], c14: ['ROOTS', '반복되는 장면에는 어떤 오래된 뿌리가 있는가.'], c15: ['SEASONS', '이 사람의 인생에는 어떤 계절이 흐르는가.'],
    c16: ['NOW', '지금 이 사람은 어느 계절에 서 있는가.'], c17: ['THIS YEAR', '올해, 이야기의 배경은 어떻게 바뀌는가.'], c18: ['NEXT 12 MONTHS', '앞으로 열두 달, 어떤 장면이 기다리는가.'], c19: ['NEXT SCENE', '다음 장면을 바꾸려면 무엇부터 해야 하는가.'], c20: ['ENDING', '그래서, 다음 장면은 누가 만드는가.'],
  };
  function chapterHook(base, no) { var h = HOOK[base]; return h ? { label: 'CHAPTER ' + String(no).padStart(2, '0') + ' · ' + h[0], line: h[1] } : null; }

  // ── 8. 엔딩 ──
  function ending(sd, name, vars) {
    var nm = String(name || '').trim(), out = [];
    out.push(sc('end_1', 'ENDING', { pacing: 'PAUSE', overlayStrength: 1, motionIntensity: 0, imageMotion: 'none', bgmMood: 'reflective' }, [['사주는', '!결말을 적어놓은 대본이 아니다.']], { bg: 'black' }));
    out.push(sc('end_2', 'ENDING', { pacing: 'PAUSE', overlayStrength: 1, motionIntensity: 0, imageMotion: 'none' }, [['어떤 장면에서', '내가 흔들리기 쉬운지.'], ['.그리고 어떤 장면에서', '앞으로 나가기 쉬운지.']], { bg: 'black' }));
    out.push(sc('end_3', 'ENDING', { pacing: 'SLOW', imageMotion: 'slow-zoom-out', mediaTags: ['sunrise'] }, [['~그 지도를 먼저 보는 것에 가깝다.']], { mediaIntent: { scenes: ['sunrise', 'field'], emotions: ['hopeful'], actions: ['lookingForward'] } }));
    out.push(sc('end_4', 'ENDING', { pacing: 'PAUSE', overlayStrength: 1, motionIntensity: 0, imageMotion: 'none', textAnimation: 'cinematic-title' }, [['다음 장면을 만드는 사람은', '!결국 ' + (nm ? nm + copula(nm) : '당신이다') + '.'], ['!END']], { bg: 'black' }));
    return fill(out, vars);
  }

  R.Translator = { GROUPS: GROUPS, TERMS: TERMS, DOM: DOM, WEAK: WEAK, ANALOGY: ANALOGY, basis: basis, profile: profile, analogy: analogy, prologue: prologue, ending: ending, strongScene: strongScene, weakScene: weakScene, moneyScene: moneyScene, chapterScenes: chapterScenes, chapterHook: chapterHook, HOOK: HOOK, INSERT: INSERT };
})(typeof window !== 'undefined' ? window : globalThis);
