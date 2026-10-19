/* 관리자 "온보딩" 탭의 확장 — 인터랙티브 스토리 · 에셋 · 운명의 타임라인 · 운영.
   · 초안 저장·게시·공개 중지·이력 복원은 v2-onboard.js 의 것을 그대로 쓴다(같은 /api/onboarding, 같은 초안/공개본). 여기서 고친 값은 config.quest · config.timeline 으로 저장된다.
   · 입력 종류(이름·성별·달력·해·달·일·시각·출생지·확인)와 계산 연결은 코드가 고정한다 — 필수 단계는 끌 수 없고, 문구·배경·연출만 바꿀 수 있다.
   · 기본 에셋은 /report/hub/quest/*.webp. 같은 키로 올린 이미지가 있으면 그것이 우선한다(PC/모바일 구분 + 초점).
   · 코드 수정 없이 바꿀 수 있는 것: 장면 켜기/끄기·배경·안내자 대사·버튼 문구·전환 효과, 안내자 이미지, 타임라인 영역·그래프·주제 타일·무료/프리미엄 표시. */
(function () {
  'use strict';
  var OB = window.V2Onboard, Q = window.Quest, O = window.Onboard;
  if (!OB || !OB.register || !Q) return;
  var T = OB.tools(), styBox = T.styBox, readSty = T.readSty, G = T.G, C = T.C, esc = T.esc, toast = T.toast, $ = T.$, $$ = T.$$, sel = T.sel, chk = T.chk, lines = T.lines, markDirty = T.markDirty, draw = T.draw, uid = T.uid;
  var FXN = { '': '기본(설정 따름)', fade: '페이드', rise: '아래에서 등장', none: '없음' };
  var FXG = { fade: '페이드', rise: '아래에서 등장', none: '없음' };
  var ASSET_LABEL = {}; Q.ASSET_KEYS.forEach(function (k) { ASSET_LABEL[k] = k + ' · ' + Q.ASSETS[k].label; });
  var INTEREST_LABEL = { '': '전체(인생 지도)', self: '나 자신', money: '돈', career: '일과 성공', love: '연애', marriage: '결혼', relation: '인간관계', future: '미래 · 개운' };

  var css = document.createElement('style');
  css.textContent = '.qa-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(330px,1fr));gap:12px}.qa-card{border:1px solid var(--line);border-radius:12px;padding:10px 12px;background:var(--bg)}.qa-card h4{margin:0 0 6px;font-size:.9rem;color:var(--gold)}' +
    '.qa-fr{display:flex;gap:10px;align-items:flex-end;margin:6px 0}.qa-pc,.qa-mb{background:#000 center/cover no-repeat;border:1px solid var(--line);border-radius:6px}.qa-pc{width:178px;height:100px}.qa-mb{width:52px;height:112px}.qa-fr small{display:block;color:var(--ink3);font-size:.7rem;margin-top:2px}' +
    '.qa-use{font-size:.74rem;color:var(--ink3);line-height:1.6}.qa-st{font-size:.72rem;margin-left:4px}.qa-row{display:grid;grid-template-columns:auto 1fr;gap:4px 10px;align-items:center}.qa-steps{display:flex;gap:6px;flex-wrap:wrap}' +
    '.qa-thumb{max-width:150px;max-height:90px;border-radius:6px;border:1px solid var(--line);display:block;margin-top:4px}.qa-trow{border:1px solid var(--line);border-radius:10px;padding:8px 10px;margin:8px 0}.qa-trow.off{opacity:.6}.qa-g3{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}@media(max-width:700px){.qa-g3{grid-template-columns:1fr}}';
  document.head.appendChild(css);

  var addUp = function (form, pre) { T.bindUploads(form, pre); };
  var val = function (f, n) { return f && f.elements[n] ? f.elements[n].value : ''; };
  var imgUrl = function (u) { return u && /^(\/|https:)/.test(u) ? u : ''; };
  var openPrev = function (hash) { G.prev.on = true; G.prev.hash = hash; draw(); window.scrollTo(0, 0); };
  var pvBtn = function (id, label) { return '<button type="button" class="ghost" id="' + id + '">' + label + '</button>'; };
  var note = function (t) { return '<p class="ob-lock">' + t + '</p>'; };

  /* ═════════ ① 스토리 장면 ═════════ */
  var qSel = 'seal';
  function stepOf(id) { return G.cfg.quest.steps.filter(function (s) { return s.id === id; })[0]; }
  function questView() {
    var QC = G.cfg.quest, st = stepOf(qSel) || QC.steps[0]; qSel = st.id;
    var flow = QC.steps.map(function (s, i) {
      return '<button type="button" class="ob-chip' + (s.id === qSel ? ' on' : '') + '" data-qs="' + s.id + '" style="' + (s.enabled === false ? 'opacity:.45' : '') + '">' + (i + 1) + '. ' + esc(s.title.replace(/^.*?·\s*/, '')) + (s.required ? ' 🔒' : '') + '</button>';
    }).join('');
    var g = QC.guides;
    var guideForm = '<form id="qGuides" class="ob-box" onsubmit="return false"><h4>안내자 (기존 남성·여성 안내자 · 사용자 호칭은 \'' + esc(G.cfg.honorific) + '\')</h4><div class="ob-g2">' + ['male', 'female'].map(function (k) {
      var o = g[k], im = Q.guideImage(G.cfg, k, false);
      return '<div><b>' + (k === 'male' ? '남성' : '여성') + ' 안내자</b> <span class="ob-lock">' + esc(Q.GUIDES[k].tone) + '</span><label class="ob-f">이름<input type="text" name="' + k + 'Name" maxlength="20" value="' + esc(o.name) + '"></label><label class="ob-f">소개 한 줄<input type="text" name="' + k + 'Tag" maxlength="40" value="' + esc(o.tag) + '"></label>' +
        '<label class="ob-f">이미지 (PC · 비우면 기본 에셋 ' + k + ')<input type="text" name="' + k + 'Img" value="' + esc(o.image || '') + '"><input type="file" data-up="' + k + 'Img" accept="image/*"></label><label class="ob-f">이미지 (모바일 · 비우면 PC와 같음)<input type="text" name="' + k + 'ImgM" value="' + esc(o.imageMobile || '') + '"><input type="file" data-up="' + k + 'ImgM" accept="image/*"></label><img class="qa-thumb" src="' + esc(im) + '" alt=""></div>';
    }).join('') + '</div>' + note('안내자 선택 카드와 대사 옆 작은 얼굴에 쓰입니다. 이미지를 올리지 않으면 제공된 기본 장면(report/hub/quest/male·female.webp)이 쓰입니다. 말투는 안내자별 대사에서 정합니다 — 계산 결과는 같습니다.') + '</form>';
    var req = st.required;
    var lineBox = function (key, label, src) { return '<div class="ob-g2"><label class="ob-f">' + label + ' · 남성 안내자<textarea name="' + key + 'M">' + esc(((src && src.male) || []).join('\n')) + '</textarea></label><label class="ob-f">' + label + ' · 여성 안내자<textarea name="' + key + 'F">' + esc(((src && src.female) || []).join('\n')) + '</textarea></label></div>'; };
    var stepForm = '<form id="qStep" class="ob-box" onsubmit="return false"><h4>' + esc(st.title) + ' <span class="ob-lock">단계 id ' + st.id + (st.field ? ' · 입력 ' + st.field : '') + (req ? ' · 필수(끌 수 없음, 계산 연결 고정)' : ' · 연출 단계') + '</span></h4>' +
      '<div class="ob-g2"><label class="ob-f">진행 줄에 표시되는 제목<input type="text" name="title" maxlength="60" value="' + esc(st.title) + '"></label>' + chk('enabled', st.enabled !== false || req, '사용' + (req ? ' (필수 단계)' : '')).replace('<input type="checkbox"', '<input type="checkbox"' + (req ? ' disabled' : '')) + '</div>' +
      (st.kind === 'seal' || st.kind === 'guide' ? '<label class="ob-f">큰 제목 (줄바꿈 가능)<textarea name="head" style="min-height:56px">' + esc(st.head || '') + '</textarea></label>' : '<input type="hidden" name="head" value="">') + (st.kind === 'seal' ? '<label class="ob-f">설명<textarea name="desc" style="min-height:56px">' + esc(st.desc || '') + '</textarea></label>' : '<input type="hidden" name="desc" value="">') +
      '<label class="ob-f">안내 문구 (장면 아래 작은 글씨 · 일반 한국어)<input type="text" name="hint" value="' + esc(st.hint || '') + '"></label><div class="ob-g2"><label class="ob-f">버튼 문구' + (st.kind === 'guide' ? ' (이 장면은 카드 선택이라 버튼 없음)' : '') + '<input type="text" name="button" maxlength="40" value="' + esc(st.button || '') + '"></label><label class="ob-f">화면 전환 효과<select name="fx">' + sel(FXN, st.fx || '') + '</select></label></div>' +
      (st.lines && (st.kind === 'input' || st.kind === 'confirm') ? lineBox('lines', '안내자 대사 ({귀인} {이름귀인} {이름} {year} {month} 사용 · 한 줄이 한 문단', st.lines) : '') + (st.unknownLines ? lineBox('unk', '시각을 모를 때 대사', st.unknownLines) : '') +
      '<div class="ob-g2"><label class="ob-f">배경 에셋<select name="asset">' + sel(ASSET_LABEL, st.asset) + '</select></label><div></div></div><div class="ob-g2"><label class="ob-f">배경 직접 지정 (PC · 에셋보다 우선)<input type="text" name="bg" value="' + esc(st.bg || '') + '"><input type="file" data-up="bg" accept="image/*"></label><label class="ob-f">배경 직접 지정 (모바일)<input type="text" name="bgMobile" value="' + esc(st.bgMobile || '') + '"><input type="file" data-up="bgMobile" accept="image/*"></label></div>' +
      styBox(['head', 'desc', 'say', 'hint', 'button'].filter(function (r) { return !((r === 'head' || r === 'desc') && st.kind !== 'seal' && !(r === 'head' && (st.kind === 'guide' || st.kind === 'confirm'))); }), st.sty) +
      '<div class="ob-sstage" id="qStage"><div class="ob-sbg"></div><img class="ob-sch" alt=""><div class="ob-sbub"></div><span class="ob-lock ob-sph">장면 미리보기 (남성 안내자 첫 대사)</span></div>' +
      '<div class="ob-bar">' + pvBtn('qPv', '이 장면 실제 화면으로 미리보기') + '<select id="qPvG"><option value="male">남성 안내자</option><option value="female">여성 안내자</option></select></div></form>';
    var misc = '<form id="qMisc" class="ob-box" onsubmit="return false"><h4>공통 문구</h4>' + lineBox('calc', '계산 중 대사', QC.calcLines) + lineBox('err', '계산 오류 안내 대사', QC.errLines) +
      '<div class="ob-g2"><label class="ob-f">이어하기 제목<input type="text" name="rHead" value="' + esc(QC.resumeText.head) + '"></label><label class="ob-f">이어하기 설명<input type="text" name="rDesc" value="' + esc(QC.resumeText.desc) + '"></label><label class="ob-f">이어하기 버튼<input type="text" name="rYes" value="' + esc(QC.resumeText.yes) + '"></label><label class="ob-f">처음부터 버튼<input type="text" name="rNo" value="' + esc(QC.resumeText.no) + '"></label></div>' +
      '<div class="ob-g2"><label class="ob-f">윤달 확인 제목<input type="text" name="lHead" value="' + esc(QC.leapText.head) + '"></label><label class="ob-f">윤달 확인 본문 ({year} {month} 사용)<textarea name="lBody" style="min-height:56px">' + esc(QC.leapText.body) + '</textarea></label><label class="ob-f">윤달 버튼<input type="text" name="lYes" value="' + esc(QC.leapText.yes) + '"></label><label class="ob-f">윤달 아님 버튼<input type="text" name="lNo" value="' + esc(QC.leapText.no) + '"></label></div>' +
      note('윤달 확인은 "음력 + 그 해에 그 달의 윤달이 실제로 있는 경우"에만 나타납니다(없으면 묻지 않음). 브라우저 기본 확인창이 아니라 이 문구의 대화 상자로 표시됩니다.') + '</form>';
    $('#obBody').innerHTML = '<div class="card"><h3 style="font-size:1rem">인터랙티브 스토리 장면 <span class="ob-lock">· 부적 봉인 → 안내자 → 이름 → 성별 → 달력 → 해 → 달 → (윤달) → 일 → 시각 → 출생지 → 확인 → 계산 → 일주 각성 → 타임라인</span></h3><div class="qa-steps">' + flow + '</div>' + note('장면을 눌러 편집합니다. 🔒 필수 단계는 계산에 필요한 입력이라 끌 수 없고, 입력 종류·순서·계산 연결은 코드가 고정합니다. 계절 선택 단계는 두지 않습니다 — 달을 고르면 배경 색조가 자동으로 바뀝니다.') + '</div>' +
      '<div class="card">' + stepForm + '</div><div class="card">' + guideForm + '</div><div class="card">' + misc + '</div>';
    $$('[data-qs]').forEach(function (b) { b.onclick = function () { collectQuest(); qSel = b.dataset.qs; questView(); bindQuest(); }; });
    bindQuest();
  }
  function bindQuest() {
    var f = $('#qStep'); if (!f) return; var st = stepOf(qSel), QC = G.cfg.quest;
    addUp(f, 'quest-bg-'); addUp($('#qGuides'), 'quest-guide-'); if (window.ObStyle) window.ObStyle.bind(f);
    var stage = $('#qStage'), upd = function () {
      var a = val(f, 'asset'), bg = val(f, 'bg').trim() || Q.assetUrl(G.cfg, a, false), ln = (val(f, 'linesM') || (st.lines && st.lines.male || []).join('\n') || val(f, 'head') || '').split('\n').filter(Boolean)[0] || '';
      stage.querySelector('.ob-sbg').style.backgroundImage = bg ? 'url("' + bg.replace(/["\\]/g, '') + '")' : ''; stage.querySelector('.ob-sbg').style.backgroundPosition = Q.assetFocus(G.cfg, a, false);
      var ch = stage.querySelector('.ob-sch'), im = Q.guideImage(G.cfg, 'male', false); ch.src = im; ch.style.display = 'block';
      stage.querySelector('.ob-sbub').textContent = Q.fill(ln, { name: '홍길동', year: 1992, month: 6 }, G.cfg) || '(대사가 여기에 표시됩니다)';
    };
    f.addEventListener('input', upd); upd();
    $('#qPv').onclick = function () { collectQuest(); var g = $('#qPvG').value; openPrev('#/begin?step=' + qSel + '&guide=' + g + (qSel === 'day' || qSel === 'month' ? '&cal=lunar' : '')); };
  }
  function collectQuest() {
    var QC = G.cfg.quest, f = $('#qStep'); if (!f) return;
    var st = stepOf(qSel); if (!st) return;
    st.title = val(f, 'title').trim() || st.title; st.hint = val(f, 'hint').trim(); st.button = val(f, 'button').trim(); st.fx = val(f, 'fx'); st.asset = val(f, 'asset') || st.asset; st.bg = val(f, 'bg').trim(); st.bgMobile = val(f, 'bgMobile').trim();
    if (f.elements.head && st.head !== undefined) st.head = val(f, 'head').trim(); if (st.desc !== undefined && f.elements.desc) st.desc = val(f, 'desc').trim();
    if (!st.required && f.elements.enabled) st.enabled = f.elements.enabled.checked;
    st.sty = readSty(f, ['head', 'desc', 'say', 'hint', 'button']);
    if (f.elements.linesM) st.lines = { male: lines(val(f, 'linesM')), female: lines(val(f, 'linesF')) };
    if (f.elements.unkM) st.unknownLines = { male: lines(val(f, 'unkM')), female: lines(val(f, 'unkF')) };
    var gf = $('#qGuides'); if (gf) ['male', 'female'].forEach(function (k) { var o = QC.guides[k]; o.name = val(gf, k + 'Name').trim() || o.name; o.tag = val(gf, k + 'Tag').trim() || o.tag; o.image = val(gf, k + 'Img').trim(); o.imageMobile = val(gf, k + 'ImgM').trim(); });
    var m = $('#qMisc'); if (m) { QC.calcLines = { male: lines(val(m, 'calcM')), female: lines(val(m, 'calcF')) }; QC.errLines = { male: lines(val(m, 'errM')), female: lines(val(m, 'errF')) };
      QC.resumeText = { head: val(m, 'rHead').trim(), desc: val(m, 'rDesc').trim(), yes: val(m, 'rYes').trim(), no: val(m, 'rNo').trim() }; QC.leapText = { head: val(m, 'lHead').trim(), body: val(m, 'lBody').trim(), yes: val(m, 'lYes').trim(), no: val(m, 'lNo').trim() };
      ['calcLines', 'errLines'].forEach(function (k) { ['male', 'female'].forEach(function (g) { if (!QC[k][g].length) QC[k][g] = Q.DEFAULT[k][g].slice(); }); });
      ['resumeText', 'leapText'].forEach(function (k) { Object.keys(Q.DEFAULT[k]).forEach(function (x) { if (!QC[k][x]) QC[k][x] = Q.DEFAULT[k][x]; }); }); }
  }

  /* ═════════ ② 에셋 관리 ═════════ */
  function usageOf(key) {
    var u = [], QC = G.cfg.quest; QC.steps.forEach(function (s) { if (s.asset === key && !s.bg) u.push('장면 ' + s.title.replace(/^.*?·\s*/, '')); });
    if (key === 'male' || key === 'female') u.push((key === 'male' ? '남성' : '여성') + ' 안내자 카드·얼굴');
    if (key === 'archive') u.push('타임라인 머리글'); if (key === 'portal') u.push('일주 각성 영상 대체 화면');
    var WA = { w1: 'courtyard', w2: 'archive', w3: 'mirror', w4: 'paths', w5: 'portal', w6: 'letter' }; Object.keys(WA).forEach(function (w) { if (WA[w] === key) u.push('운명 세계 ' + w + ' 기본 이미지(지도·타임라인 주제 타일)'); });
    return u;
  }
  var AW = null;
  function assetsView() {
    var QC = G.cfg.quest;
    var cards = Q.ASSET_KEYS.map(function (k) {
      var a = QC.assets[k] || {}, d = Q.ASSETS[k], pc = Q.assetUrl(G.cfg, k, false), mb = Q.assetUrl(G.cfg, k, true), uses = usageOf(k);
      return '<form class="qa-card" data-ak="' + k + '" onsubmit="return false"><h4>' + esc(k) + ' <span class="ob-lock">' + esc(d.label) + '</span><span class="qa-st" id="qaSt-' + k + '"></span></h4>' +
        '<div class="qa-fr"><div><div class="qa-pc" style="background-image:url(\'' + esc(pc) + '\');background-position:' + esc(a.focusPc || d.pc) + '"></div><small>PC 화면(16:9) 자름</small></div><div><div class="qa-mb" style="background-image:url(\'' + esc(mb) + '\');background-position:' + esc(a.focusMobile || d.mobile) + '"></div><small>모바일</small></div></div>' +
        '<label class="ob-f">이미지 PC (비우면 기본 파일)<input type="text" name="pc" value="' + esc(a.pc || '') + '" placeholder="' + esc(d.file) + '"><input type="file" data-up="pc" accept="image/*"></label>' +
        '<label class="ob-f">이미지 모바일 (비우면 PC와 같음)<input type="text" name="mobile" value="' + esc(a.mobile || '') + '"><input type="file" data-up="mobile" accept="image/*"></label>' +
        '<div class="ob-g2"><label class="ob-f">PC 초점 (예 50% 40%)<input type="text" name="focusPc" value="' + esc(a.focusPc || '') + '" placeholder="' + esc(d.pc) + '"></label><label class="ob-f">모바일 초점<input type="text" name="focusMobile" value="' + esc(a.focusMobile || '') + '" placeholder="' + esc(d.mobile) + '"></label></div>' +
        '<p class="qa-use">사용처: ' + (uses.length ? esc(uses.join(' · ')) : '현재 쓰는 장면 없음') + '</p></form>';
    }).join('');
    $('#obBody').innerHTML = '<div class="card"><h3 style="font-size:1rem">배경·안내자 에셋 <span class="ob-lock">· 기본 12종 (report/hub/quest/*.webp)</span></h3>' + note('이미지를 올리면 그 에셋을 쓰는 모든 장면에 적용됩니다(장면별로 따로 지정하려면 "스토리 장면"의 배경 직접 지정). 세로로 긴 그림은 가로 화면에서 위아래가 잘리므로 "초점"(CSS background-position)으로 피사체 위치를 맞춥니다 — 미리보기 두 칸이 PC·모바일에서 실제로 보이는 모습입니다. PNG·JPEG·WebP는 업로드 시 긴 변 1920px 이하로 자동 축소·압축합니다(비율·투명도 유지). 기존 파일은 위의 전체 자동 최적화를 사용하세요. 원본은 보존됩니다.') +
      '<div class="ob-bar">' + pvBtn('qaCheck', '에셋 상태 확인 (미등록·불러오기 실패)') + '<span class="ob-lock" id="qaCheckMsg"></span></div><div class="qa-grid">' + cards + '</div></div>' +
      '<div class="card"><h3 style="font-size:1rem">일주 각성 영상 연결 <span class="ob-lock">· 기존 일간·일주 영상 시스템을 그대로 씁니다</span></h3><div id="qaAw"><p class="muted">불러오는 중…</p></div></div>';
    $$('.qa-card').forEach(function (f) {
      var k = f.dataset.ak, upd = function () {
        var pc = val(f, 'pc').trim() || Q.ASSETS[k].file, mb = val(f, 'mobile').trim() || pc, d = Q.ASSETS[k];
        var p = f.querySelector('.qa-pc'), m = f.querySelector('.qa-mb'); p.style.backgroundImage = 'url("' + imgUrl(pc) + '")'; m.style.backgroundImage = 'url("' + imgUrl(mb) + '")';
        p.style.backgroundPosition = Q.focus(val(f, 'focusPc')) || d.pc; m.style.backgroundPosition = Q.focus(val(f, 'focusMobile')) || d.mobile;
      };
      f.addEventListener('input', upd); addUp(f, 'quest-asset-' + k + '-');
    });
    $('#qaCheck').onclick = checkAssets; loadAwakening();
  }
  function collectAssets() { var QC = G.cfg.quest; $$('.qa-card').forEach(function (f) { var k = f.dataset.ak, o = { pc: val(f, 'pc').trim(), mobile: val(f, 'mobile').trim(), focusPc: val(f, 'focusPc').trim(), focusMobile: val(f, 'focusMobile').trim() }; if (o.pc || o.mobile || o.focusPc || o.focusMobile) QC.assets[k] = o; else delete QC.assets[k]; }); }
  function probe(url) { return fetch(url, { method: 'GET', headers: { range: 'bytes=0-0' } }).then(function (r) { return r.ok || r.status === 206; }).catch(function () { return false; }); }
  function checkAssets() {
    collectAssets(); var msg = $('#qaCheckMsg'), bad = 0, done = 0, total = Q.ASSET_KEYS.length; msg.textContent = '확인 중…';
    Q.ASSET_KEYS.forEach(function (k) {
      var a = G.cfg.quest.assets[k] || {}, urls = [[Q.ASSETS[k].file, '기본 파일']].concat(a.pc ? [[a.pc, 'PC']] : [], a.mobile ? [[a.mobile, '모바일']] : []);
      Promise.all(urls.map(function (u) { return probe(u[0]).then(function (ok) { return { name: u[1], ok: ok }; }); })).then(function (rs) {
        var el = $('#qaSt-' + k), fail = rs.filter(function (r) { return !r.ok; }); if (fail.length) bad++;
        if (el) el.innerHTML = fail.length ? '<span class="ob-st bad">불러오기 실패: ' + fail.map(function (r) { return r.name; }).join(', ') + '</span>' : (a.pc || a.mobile ? '<span class="ob-st ok">교체됨</span>' : '<span class="ob-st ok">기본 파일</span>');
        if (++done === total) msg.textContent = bad ? '문제 ' + bad + '건 — 표시된 에셋을 다시 올리거나 주소를 확인하세요.' : '모든 에셋을 불러올 수 있습니다.';
      });
    });
  }
  var STEM_K = '갑을병정무기경신임계', BR_K = '자축인묘진사오미신유술해';
  function loadAwakening() {
    var box = $('#qaAw'); if (!box) return;
    C.api('/api/awakening?all=1').then(function (d) {
      var vs = (d.videos || []).filter(function (x) { return x.enabled !== false && (x.videoUrl || x.videoWebm || x.posterUrl); }), have = {}; vs.forEach(function (x) { have[x.dayPillar + '|' + x.gender] = 1; });
      var miss = []; for (var i = 0; i < 60; i++) { var nm = STEM_K[i % 10] + BR_K[i % 12]; ['M', 'F'].forEach(function (g) { if (!have[nm + '|' + g]) miss.push(nm + (g === 'M' ? '♂' : '♀')); }); }
      var ig = (d.ilgan || []).filter(function (x) { return x.enabled !== false && (x.videoUrl || x.videoWebm); }).length;
      box.innerHTML = '<table class="ob-t"><tr><th>일주 영상 등록</th><td>' + (120 - miss.length) + ' / 120 <span class="ob-st ' + (miss.length ? 'warn' : 'ok') + '">' + (miss.length ? '미등록 ' + miss.length : '모두 등록') + '</span></td></tr><tr><th>일간 소개 영상</th><td>' + ig + ' / 20</td></tr><tr><th>기본(대체) 영상</th><td>' + (d.fallback && (d.fallback.videoUrl || d.fallback.videoWebm) ? '등록됨' : '없음') + '</td></tr><tr><th>영상 없을 때</th><td>문구만 표시' + (d.textOnly ? '(켜짐)' : '') + ' + 대체 이미지(portal 에셋) · 안내 문구 "이 일주의 각성 영상은 아직 준비되지 않았습니다."</td></tr></table>' +
        (miss.length ? '<details><summary class="ob-lock">미등록 일주 보기 (' + miss.length + ')</summary><p class="ob-lock" style="line-height:1.9">' + esc(miss.slice(0, 120).join(' · ')) + (miss.length > 120 ? ' …' : '') + '</p></details>' : '') +
        '<div class="ob-bar"><button type="button" class="ghost" id="qaGoAw">"일간·일주 영상" 탭으로 이동 (등록·교체)</button></div>' + note('영상 매핑(60일주 × 성별)은 기존 "일간·일주 영상" 탭이 관리합니다. 온보딩은 그 값을 /api/awakening 으로 읽어 일주 각성에서 재생하며, 없으면 대체 이미지와 안내를 보여 줍니다.');
      $('#qaGoAw').onclick = function () { if (window.AdminShowTab) window.AdminShowTab('v2intro'); };
    }).catch(function (e) { box.innerHTML = '<p class="err">' + esc(e.message) + '</p>'; });
  }

  /* ═════════ ③ 운명의 타임라인 ═════════ */
  var tSel = null;
  var GRAPH_NAME = { elements: '오행·십성 막대', ziwei: '자미두수 명반 요약', daeun: '대운 그래프(끄면 목록만)', seun: '세운(10년 안의 해) 그래프', wolun: '월운 그래프', today: '오늘의 일진 요약' };
  function tlView() {
    var TC = G.cfg.timeline;
    var secs = TC.sections.map(function (s, i) {
      return '<div class="qa-trow' + (s.enabled === false ? ' off' : '') + '" data-sid="' + s.id + '"><div class="ob-g2"><label class="ob-f ob-ck"><input type="checkbox" name="en" ' + (s.enabled !== false ? 'checked' : '') + '> <b>' + (i + 1) + '. ' + esc(s.id === 'birth' ? '태어난 순간' : s.id === 'flow' ? '인생 전체의 흐름' : s.id === 'now' ? '지금과 앞으로' : '인생의 주요 주제') + '</b> 표시</label><div class="ob-bar"><button type="button" class="ghost" data-mv="-1"' + (i === 0 ? ' disabled' : '') + '>↑</button><button type="button" class="ghost" data-mv="1"' + (i === TC.sections.length - 1 ? ' disabled' : '') + '>↓</button></div></div>' +
        '<div class="ob-g2"><label class="ob-f">제목<input type="text" name="title" maxlength="40" value="' + esc(s.title) + '"></label><label class="ob-f">부제<input type="text" name="sub" maxlength="120" value="' + esc(s.sub || '') + '"></label></div></div>';
    }).join('');
    var graph = '<div class="qa-g3">' + Object.keys(GRAPH_NAME).map(function (k) { return chk('g_' + k, TC.graph[k] !== false, GRAPH_NAME[k]); }).join('') + '</div>';
    $('#obBody').innerHTML = '<div class="card"><h3 style="font-size:1rem">운명의 타임라인 구성 <span class="ob-lock">· 방문자 화면 #/timeline (홈 상단 카드에서 진입)</span></h3>' + '<form id="tlTexts" onsubmit="return false">' + chk('tlEnabled', TC.enabled !== false, '타임라인 화면 사용 (끄면 홈의 진입 카드도 숨김)') + '<label class="ob-f">소개 문장<input type="text" name="intro" maxlength="300" value="' + esc(TC.texts.intro) + '"></label><label class="ob-f">하단 안내(면책) 문구<textarea name="notice" style="min-height:60px">' + esc(TC.texts.notice) + '</textarea></label></form></div>' +
      '<div class="card"><h3 style="font-size:1rem">영역 구성 · 순서</h3><form id="tlSecs" onsubmit="return false">' + secs + '</form>' + note('모든 영역의 값은 기존 계산 엔진(원국·오행·십성·자미두수·대운·세운·월운·일진)에서 읽습니다. 여기서는 표시 여부·순서·문구만 정합니다.') + '</div>' +
      '<div class="card"><h3 style="font-size:1rem">그래프·표시 항목</h3><form id="tlGraph" onsubmit="return false">' + graph + '</form></div>' +
      '<div class="card"><h3 style="font-size:1rem">인생의 주요 주제 = 운명 세계</h3>' + note('4번째 영역의 타일은 기존 "운명 세계" 지도와 <b>같은 데이터</b>(이름·한 줄 설명·아이콘·이미지·순서·유료 표시·사용 여부)를 씁니다. 따로 관리하지 않으며, "세계관" 탭에서 고치면 세계 지도와 타임라인이 함께 바뀝니다. 타일을 누르면 그 세계가 바로 열립니다. "유료"는 표시 배지이고 결제·권한 시스템은 아직 없습니다.') + '<div class="ob-bar"><button type="button" class="ghost" id="tlWorld">"세계관" 탭으로 이동 (이름·이미지·순서·유료 표시)</button>' + pvBtn('tlConn', '풀이 DB 연결 상태 확인') + pvBtn('tlPv', '타임라인 미리보기') + '</div><div id="tlConnBox"></div></div>';
    bindTl();
  }
  function bindTl() {
    var TC = G.cfg.timeline;
    $$('#tlSecs [data-mv]').forEach(function (b) { b.onclick = function () { collectTl(); var id = b.closest('[data-sid]').dataset.sid, i = TC.sections.map(function (s) { return s.id; }).indexOf(id), j = i + (+b.dataset.mv); if (j < 0 || j >= TC.sections.length) return; var x = TC.sections.splice(i, 1)[0]; TC.sections.splice(j, 0, x); markDirty(); tlView(); }; });
    $('#tlWorld').onclick = function () { collectTl(); if (window.AdminShowTab) window.AdminShowTab('v2world'); };
    $('#tlPv').onclick = function () { collectTl(); openPrev('#/timeline'); };
    $('#tlConn').onclick = connCheck;
  }
  function collectTl() {
    var TC = G.cfg.timeline, f;
    if (!$('#tlSecs')) return;
    var en = $('input[name=tlEnabled]'); if (en) TC.enabled = en.checked;
    f = $('#tlTexts'); if (f) { TC.texts.intro = val(f, 'intro').trim() || TC.texts.intro; TC.texts.notice = val(f, 'notice').trim() || TC.texts.notice; }
    $$('#tlSecs [data-sid]').forEach(function (r) { var s = TC.sections.filter(function (x) { return x.id === r.dataset.sid; })[0]; if (s) { s.enabled = r.querySelector('[name=en]').checked; s.title = r.querySelector('[name=title]').value.trim() || s.title; s.sub = r.querySelector('[name=sub]').value.trim(); } });
    f = $('#tlGraph'); if (f) Object.keys(GRAPH_NAME).forEach(function (k) { if (f.elements['g_' + k]) TC.graph[k] = f.elements['g_' + k].checked; });
  }
  // 풀이 DB 연결 상태: 엔진 계산 → 시간 모듈(대운·세운·월운) → 관심 분야별 연결 모듈 수 → 서버 풀이 DB(report-content) 저장본
  var V2L = ['chapters', 'saju-data', 'rules', 'narrator', 'content', 'content-pro', 'content-pro2', 'topics', 'story-director', 'luck6', 'timeline'];
  function loadScripts(list) { return Promise.all(list.map(function (u) { return window[u.g] ? Promise.resolve() : new Promise(function (ok, no) { var s = document.createElement('script'); s.src = u.src; s.async = false; s.onload = ok; s.onerror = function () { no(new Error(u.src)); }; document.head.appendChild(s); }); })); }
  function connCheck() {
    collectTl(); var box = $('#tlConnBox'); box.innerHTML = '<p class="muted">확인 중…</p>';
    // 이미 불러온 모듈은 다시 불러오지 않는다
    var need = []; if (!window.Manse) need.push({ g: 'Manse', src: '/engine.js' }); if (!(window.ReportV2 && window.ReportV2.Timeline)) V2L.forEach(function (n) { need.push({ g: '__x' + n, src: '/report/v2/' + n + '.js' }); });
    loadScripts(need).then(function () {
      var rows = [], R = window.ReportV2, M = window.Manse, ok = function (c, a, b) { rows.push('<tr><td>' + a + '</td><td><span class="ob-st ' + (c ? 'ok' : 'bad') + '">' + (c ? '연결됨' : '실패') + '</span> ' + esc(b || '') + '</td></tr>'); };
      var ch = null; try { ch = M.compute({ year: 1992, month: 6, day: 23, hour: 7, minute: 30, calendar: 'solar', leap: false, gender: 'M', lon: 126.98, timeMode: 'lmt', jasi: 'jeong', sinsalBase: 'year', model: 'season', school: 'eokbu' }); } catch (e) { }
      ok(!!ch && !!ch.pillars, '만세력 엔진 (원국·오행·십성·자미두수)', ch ? '사주 원국 · 자미두수 ' + (ch.ziwei ? '명반 생성' : '시각 미상') : '');
      var dl = null, ys = null, ms = null; try { dl = R.Timeline.daeun(M, ch, Date.now()); ys = R.Timeline.years(M, ch, dl.filter(function (x) { return !x.pre; })[0].startYear, Date.now()); ms = R.Timeline.months(M, ch, new Date().getFullYear(), Date.now()); } catch (e) { }
      ok(!!dl, '대운 (엔진 → 6분류)', dl ? dl.filter(function (x) { return !x.pre; }).length + '개 구간' : ''); ok(!!ys && ys.length === 10, '세운', ys ? ys.length + '개 해' : ''); ok(!!ms && ms.length === 12, '월운', ms ? ms.length + '개월' : '');
      return C.api('/api/report-content').then(function (d) { var c = d && d.content; rows.push('<tr><td>서버 풀이 DB (report-content)</td><td><span class="ob-st ' + (c ? 'ok' : 'warn') + '">' + (c ? '저장본 있음' : '저장본 없음') + '</span> ' + esc(c ? '버전 ' + (c.version || '-') + ' · 관리자가 고친 모듈·개운법이 코드 기본 위에 적용됩니다' : '코드의 기본 시드(report/v2/*.js)를 사용합니다') + '</td></tr>'); }).catch(function () { rows.push('<tr><td>서버 풀이 DB</td><td><span class="ob-st warn">확인 못함</span> 네트워크 또는 저장소 설정을 확인하세요</td></tr>'); }).then(function () { box.innerHTML = '<table class="ob-t">' + rows.join('') + '</table>'; });
    }).catch(function (e) { box.innerHTML = '<p class="err">연결 확인 실패: ' + esc(e.message) + '</p>'; });
  }

  /* ═════════ ④ 운영 ═════════ */
  function opsView() {
    var QC = G.cfg.quest, TC = G.cfg.timeline, ids = QC.steps.map(function (s) { return s.id; });
    var stepOpts = {}; QC.steps.forEach(function (s) { stepOpts[s.id] = s.title; });
    $('#obBody').innerHTML = '<div class="card"><h3 style="font-size:1rem">운영 설정</h3><form id="qOps" onsubmit="return false">' +
      '<label class="ob-f">출생정보 입력 방식<select name="qMode">' + sel({story:'스토리 입력 (기본)',classic:'기본 입력 6장면 (호환)'}, QC.enabled === false ? 'classic' : 'story') + '</select></label><label class="ob-f">입력 완료 후 결과 화면<select name="destination">' + sel({timeline:'운명의 타임라인',home:'개인화 홈'}, window.Quest.destination(G.cfg)) + '</select></label>' + chk('qResume', QC.resume !== false, '이어하기: 입력 중 이탈한 방문자에게 "이어서 하기 / 처음부터"를 묻습니다 (입력값은 그 기기에만 저장)') +
      chk('qSkip', QC.skipReturning !== false, '재방문자 건너뛰기: 이미 입력한 방문자가 출생정보를 수정할 때는 부적 오프닝·안내자 선택을 건너뜁니다 (프로필이 있으면 #/begin 은 홈으로 돌아갑니다)') +
      chk('tlOn', TC.enabled !== false, '운명의 타임라인 사용') +
      '<label class="ob-f">기본 장면 전환 효과<select name="qFx">' + sel(FXG, QC.fx) + '</select></label>' +
      note('온보딩 전체를 끄는 "개발 단계 재방문자 강제 노출"은 "호칭·가중치" 메뉴에 있습니다. 시스템의 "동작 줄이기" 설정을 켠 방문자에게는 전환 효과와 부적 연출이 자동으로 짧아집니다.') + '</form></div>' +
      '<div class="card"><h3 style="font-size:1rem">관리자 미리보기</h3><p class="ob-lock">저장하지 않은 편집 내용까지 반영된 실제 화면이 위쪽 상자에 열립니다. 입력·계산·저장은 하지 않고 통계에 집계되지 않으며, 방문자에게 노출되지 않습니다.</p>' +
      '<div class="ob-bar"><label class="ob-f" style="display:inline-grid">장면<select id="oPvS">' + sel(stepOpts, 'seal') + '</select></label><label class="ob-f" style="display:inline-grid">안내자<select id="oPvG"><option value="male">남성</option><option value="female">여성</option></select></label><label class="ob-f ob-ck"><input type="checkbox" id="oPvL"> 음력(윤달 안내 확인)</label>' + pvBtn('oPvGo', '이 장면 미리보기') + pvBtn('oPvTl', '타임라인 미리보기') + '</div></div>' +
      '<div class="card"><h3 style="font-size:1rem">변경 이력 · 복원</h3><p class="ob-lock">스토리·에셋·타임라인 설정은 온보딩의 다른 문구와 같은 초안/공개본 체계를 씁니다. 게시 직전의 공개본이 최근 20개까지 이력에 남고, 어느 시점이든 초안으로 복원한 뒤 확인하고 게시할 수 있습니다.</p><div class="ob-bar">' + pvBtn('oHist', '"미리보기·게시 관리"에서 이력·복원 열기') + '</div></div>';
    $('#oPvGo').onclick = function () { collectOps(); openPrev('#/begin?step=' + $('#oPvS').value + '&guide=' + $('#oPvG').value + ($('#oPvL').checked ? '&cal=lunar' : '')); };
    $('#oPvTl').onclick = function () { collectOps(); openPrev('#/timeline'); };
    $('#oHist').onclick = function () { collectOps(); G.sub = 'publish'; draw(); };
    void ids;
  }
  function collectOps() {
    var f = $('#qOps'); if (!f) return; var QC = G.cfg.quest;
    QC.enabled = f.elements.qMode.value === 'story'; G.cfg.resultDestination = f.elements.destination.value; QC.resume = f.elements.qResume.checked; QC.skipReturning = f.elements.qSkip.checked; G.cfg.timeline.enabled = f.elements.tlOn.checked; QC.fx = f.elements.qFx.value;
  }

  function inputVideoView() {
    var slots = [['inputLoopMale', '운명 감찰관 · PC용'], ['inputLoopMaleMobile', '운명 감찰관 · 모바일용'], ['inputLoopFemale', '명운 해독관 · PC용'], ['inputLoopFemaleMobile', '명운 해독관 · 모바일용'], ['inputLoopVideo', '공통 대체 · PC용'], ['inputLoopVideoMobile', '공통 대체 · 모바일용']];
    $('#obBody').innerHTML = '<div class="card"><h3>생년월일시 입력 · 공통 루프 영상</h3><p>선택한 안내자에 맞는 영상을 모든 입력 장면에서 무음 반복 재생합니다. 운명 감찰관과 명운 해독관의 PC용·모바일용 영상을 각각 올리세요. 모바일용이 없으면 같은 안내자의 PC용을 사용합니다. 안내자 전용 영상이 없으면 기존 공통 대체 영상을 사용합니다.</p><p class="ob-lock">모바일 기준: 화면 너비 768px 미만. 업로드 후 초안 저장 → 게시를 눌러 적용하세요.</p><div class="ob-g2">' + slots.map(function (slot, i) {
      var url = G.cfg.quest[slot[0]] || '';
      return (i === 4 ? '</div><details><summary>공통 대체 영상 (기존 설정)</summary><div class="ob-g2">' : '') + '<form class="ob-box" data-loop-slot="' + slot[0] + '" onsubmit="return false"><h4>' + slot[1] + '</h4><label class="ob-f">영상 URL<input name="video" type="text" value="' + esc(url) + '"></label><label class="ob-f">영상 업로드 (90MB 이하 MP4·WebM·MOV)<input type="file" data-loop-upload accept="video/mp4,video/webm,video/quicktime"></label><span data-upload-status role="status"></span><video data-preview controls muted loop playsinline style="width:100%;max-height:360px;background:#000"' + (url ? ' src="' + esc(url) + '"' : ' hidden') + '></video><button type="button" data-remove>영상 연결 빼기</button></form>';
    }).join('') + '</div></details><div class="ob-bar"><select id="qLoopGuide"><option value="male">운명 감찰관</option><option value="female">명운 해독관</option></select><button type="button" id="qLoopScene">선택한 안내자로 입력 장면 미리보기</button></div></div>';
    slots.forEach(function (slot) {
      var key = slot[0], f = $('[data-loop-slot="' + key + '"]');
      function update() { var url = val(f, 'video').trim(), p = f.querySelector('[data-preview]'); G.cfg.quest[key] = url; p.hidden = !url; if (url) p.src = url; else { p.pause(); p.removeAttribute('src'); p.load(); } markDirty(); }
      f.elements.video.oninput = update;
      f.querySelector('[data-loop-upload]').onchange = function () {
        var file = this.files[0], input = this, status = f.querySelector('[data-upload-status]');
        if (!file) return;
        if (G.loopUploading) { input.value = ''; toast('진행 중인 영상 업로드가 끝난 뒤 올려 주세요', true); return; }
        if (!/\.(mp4|webm|mov)$/i.test(file.name) || file.size > 90 * 1048576) { status.textContent = '90MB 이하 MP4·WebM·MOV 파일을 선택해 주세요.'; input.value = ''; return; }
        G.loopUploading = true; input.disabled = true; status.textContent = '영상 업로드 중… 저장·게시 전에 완료를 기다려 주세요.';
        C.api('/api/clipfile?name=' + encodeURIComponent('quest-' + key + '-' + file.name), { method: 'POST', headers: { 'content-type': file.type || 'video/mp4' }, body: file })
          .then(function (r) { if (!r.key) throw new Error('업로드 응답에 키가 없습니다'); var url = '/api/clipfile?k=' + r.key; G.cfg.quest[key] = url; f.elements.video.value = url; if (f.isConnected) update(); markDirty(); status.textContent = '업로드 완료 · 초안 저장 후 게시하세요.'; toast(slot[1] + '을 올렸습니다 — 초안 저장 후 게시하세요'); })
          .catch(function (e) { status.textContent = '업로드 실패: ' + e.message; toast(e.message, true); })
          .finally(function () { G.loopUploading = false; input.disabled = false; input.value = ''; });
      };
      f.querySelector('[data-remove]').onclick = function () { f.elements.video.value = ''; update(); };
    });
    $('#qLoopScene').onclick = function () { collectInputVideo(); openPrev('#/begin?step=year&guide=' + $('#qLoopGuide').value); };
  }
  function collectInputVideo() { $$('[data-loop-slot]').forEach(function (f) { G.cfg.quest[f.dataset.loopSlot] = val(f, 'video').trim(); }); }
  OB.register({ id: 'qvideo', label: '입력 공통 루프 영상', view: inputVideoView, collect: collectInputVideo });
  OB.register({ id: 'quest', label: '스토리 장면', view: questView, collect: collectQuest });
  OB.register({ id: 'qassets', label: '에셋 관리', view: assetsView, collect: collectAssets });
  OB.register({ id: 'tl', label: '운명의 타임라인', view: tlView, collect: collectTl });
  OB.register({ id: 'qops', label: '흐름·운영 설정', view: opsView, collect: collectOps });
})();
