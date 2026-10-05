// 종합 PDF: 웹 화면을 캡처하지 않는다. 같은 Structured Saju Data + 선택된 모듈(rep)로 "A4 세로 전용 템플릿"을 만들고(pages), 페이지별로 래스터화해 PDF 로 묶는다(generate).
// 서버 생성은 한글 폰트 임베딩·번들 크기 문제로 이번에는 쓰지 않았다(Pages Functions 에 폰트 파일을 싣기 어렵다). 브라우저에서 웹폰트(Noto Serif/Sans KR)로 그려 한글이 깨지지 않는다.
// pages() 는 순수 함수라 Node 에서 테스트된다. 페이지 수: 표지 + 사주 + 챕터 20 + 마무리 = 약 23쪽 (챕터가 줄거나 늘면 같이 변한다).
(function (root) {
  var R = root.ReportV2 = root.ReportV2 || {};
  var W = 794, H = 1123; // A4 @96dpi
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var nl = function (s) { return esc(s).replace(/\n/g, '<br>'); };
  var EL = { '목': '#4F8F6A', '화': '#C0573F', '토': '#B0925A', '금': '#8E9AAA', '수': '#3F6FA8' };
  var ELKEY = { '목': 'wood', '화': 'fire', '토': 'earth', '금': 'metal', '수': 'water' };
  var SEA_ICON = { opportunity: '◆', expansion: '▲', harvest: '●', accumulation: '■', transition: '◇', defense: '▽' };

  var CSS = '.pg{width:' + W + 'px;height:' + H + 'px;position:relative;overflow:hidden;background:#FBF8F1;color:#1E2233;font-family:"Noto Sans KR","Apple SD Gothic Neo","Malgun Gothic",sans-serif;font-size:16px;line-height:1.85;word-break:keep-all;overflow-wrap:anywhere}' +
    '.pg *{box-sizing:border-box;margin:0;padding:0}.pg .in{padding:56px 62px 70px;height:auto}.pg h1,.pg h2,.pg h3{font-family:"Noto Serif KR","Nanum Myeongjo",serif;font-weight:600;line-height:1.4}' +
    '.pg .band{height:6px;background:var(--c,#B9975B)}.pg .act{font-size:10.5px;letter-spacing:.28em;color:#9A8250;margin-top:18px}.pg h2{font-size:30px;margin:6px 0 4px}.pg .sub{color:#6B6A63;font-size:12px}' +
    '.pg .hl{font-family:"Noto Serif KR",serif;font-size:22px;line-height:1.6;margin:26px 0 18px;padding-left:14px;border-left:3px solid var(--c,#B9975B)}.pg .fact{display:inline-block;font-size:11px;color:#6B6A63;border:1px solid #D9D2C0;border-radius:999px;padding:2px 12px;margin-bottom:12px}' +
    '.pg p{margin:6px 0}.pg .cap{font-size:10px;letter-spacing:.22em;color:#9A8250;margin:18px 0 6px}.pg .box{background:#F3EEE1;border:1px solid #E3DAC4;border-radius:8px;padding:12px 16px;margin:8px 0}.pg .box b{display:block;font-size:11px;letter-spacing:.1em;color:#9A8250;font-weight:500;margin-bottom:3px}' +
    '.pg li{list-style:none;padding-left:12px;position:relative}.pg li::before{content:"·";position:absolute;left:2px;color:#9A8250}.pg .g2{display:grid;grid-template-columns:1fr 1fr;gap:10px}' +
    '.pg .ft{position:absolute;left:62px;right:62px;bottom:26px;display:flex;justify-content:space-between;font-size:9.5px;color:#9A978A;border-top:1px solid #E3DAC4;padding-top:8px}' +
    '.pg table{width:100%;border-collapse:collapse;font-size:13.5px}.pg th,.pg td{border-bottom:1px solid #E3DAC4;padding:6px 6px;text-align:center}.pg th{color:#9A8250;font-weight:500;font-size:10.5px}' +
    '.pg .bar{display:flex;align-items:center;gap:8px;margin:5px 0;font-size:12px}.pg .bar i{display:block;height:9px;border-radius:5px}.pg .bar span{width:30px}.pg .st{display:flex;gap:8px;flex-wrap:wrap;margin:10px 0}.pg .st b{font-family:"Noto Serif KR",serif;font-weight:600;border:1px solid #B9975B;border-radius:999px;padding:5px 14px}' +
    '.pg .mo{display:grid;grid-template-columns:repeat(4,1fr);gap:6px;margin-top:8px}.pg .mo div{border:1px solid #E3DAC4;border-radius:6px;padding:6px 8px;font-size:11.5px;background:#fff}.pg .mo b{font-weight:500}.pg .cov{display:flex;flex-direction:column;justify-content:center;align-items:center;text-align:center;height:100%;background:linear-gradient(180deg,#14192E,#0B0E1B);color:#EDE8DC}' +
    '.pg .cov h1{font-size:44px;margin:14px 0}.pg .cov .k{letter-spacing:.4em;font-size:11px;color:#D5B97F}.pg .cov .t{display:flex;gap:10px;justify-content:center;margin-top:22px}.pg .cov .t span{border:1px solid #9A8250;border-radius:999px;padding:4px 14px;font-size:13px;color:#F0DFB2}.pg .cov p{color:#BDB8AB}' +
    '.pg .chk li::before{content:"□";left:0;color:#1E2233}.pg .chk li{padding-left:20px}.pg .ban{height:150px;border-radius:8px;margin:14px 0 4px;background:linear-gradient(135deg,var(--c,#B9975B),#14192E);background-size:cover;background-position:center}';

  function foot(n, total, who) { return '<div class="ft"><span>MANTRA FORTUNE' + (who ? ' · ' + esc(who) : '') + '</span><span>사주는 참고용 콘텐츠이며 미래를 단정하지 않습니다 · ' + n + ' / ' + total + '</span></div>'; }
  function page(inner, color, n, total, who, extra) { return '<div class="pg" style="--c:' + color + '"' + (extra || '') + '>' + inner + foot(n, total, who) + '</div>'; }
  var list = function (a) { return '<ul>' + a.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ul>'; };
  function heroImg(c) { // 대표 이미지(이미지·영상 포스터) — 없으면 색 띠
    var s = (c.scenes || []).filter(function (x) { return x.media; })[0], m = s && s.media, u = m && (/video|transition/i.test(m.type) ? m.posterUrl : (m.url || m.posterUrl));
    return '<div class="ban"' + (u ? ' style="background-image:url(&quot;' + esc(u) + '&quot;),linear-gradient(135deg,var(--c),#14192E)"' : '') + '></div>';
  }
  function bullets(c) { var s = (c.scenes || []).filter(function (x) { return x.sceneType === 'recommendation' && x.bullets; })[0]; return s ? s.bullets : []; }

  function chapterPage(c, rep, n, total, who, color, sd) {
    var act = rep.acts.filter(function (a) { return a.id === c.act; })[0] || {}, S = R.SajuData.SEASONS, h = '';
    h += '<div class="band"></div><div class="in"><div class="act">' + esc(act.roman || '') + ' · ' + esc(act.title || '') + ' · ' + String(c.no).padStart(2, '0') + '</div><h2>' + esc(c.title) + '</h2><div class="sub">' + esc(c.subtitle || '') + '</div>' + heroImg(c) +
      '<div class="hl">' + nl(c.headline) + '</div><span class="fact">FACT · ' + esc(c.fact) + '</span><p>' + nl(c.interpretation) + '</p>';
    var ck = R.Scenes.chartKind ? R.Scenes.chartKind(c) : null; if (ck && sd) h += '<div style="margin:10px 0">' + R.Charts.html(ck, sd, { theme: 'light', chapter: c.base || c.id }) + '</div>';
    if (c.verdict) { var vv = c.verdict; h += '<div class="cap">' + esc(vv.blocked.label) + '</div><p>' + nl(vv.blocked.text) + '</p>' + (vv.evidence ? '<div class="cap">EVIDENCE</div><p>' + nl(vv.evidence.text) + '</p>' : '') + '<div class="cap">다음 장면을 위한 두 걸음</div><p style="color:#6B6A63;font-size:12px">' + esc(vv.advice.lead) + '</p>' + list(vv.advice.items); }
    if (c.meaning) h += '<div class="cap">풀이</div><p>' + nl(c.meaning) + '</p>';
    if (c.kind === 'daewoon' && c.items) h += '<div class="cap">10-YEAR SEASONS</div><table><tr><th>나이</th><th>기간</th><th>대운</th><th>계절</th><th>핵심</th></tr>' + c.items.map(function (d) { return '<tr' + (d.isCurrent ? ' style="background:#F3EEE1"' : '') + '><td>' + d.startAge + '세</td><td>' + d.startYear + '–' + d.endYear + '</td><td>' + esc(d.ganzhi) + '</td><td>' + (SEA_ICON[d.season] || '') + ' ' + esc(d.seasonName || '') + (d.isCurrent ? ' (지금)' : '') + '</td><td style="text-align:left">' + esc((d.module && d.module.headline) || '') + '</td></tr>'; }).join('') + '</table>';
    else if (c.kind === 'monthly' && c.items) h += '<div class="cap">12 MONTHS</div><div class="mo">' + c.items.map(function (m) { var x = (m.module && m.module.extra) || {}; return '<div><b>' + m.month + '월 · ' + (SEA_ICON[m.season] || '') + esc(m.seasonName || '') + '</b><br><span style="color:#6B6A63">DO ' + esc((x.dos || []).slice(0, 2).join(', ')) + '</span></div>'; }).join('') + '</div>';
    else if (c.kind === 'remedy') {
      var K = { action: '행동', growth: '성장·학습', people: '사람', place: '공간', environment: '환경' }, ch = (c.timing && c.timing.chain) || [];
      h += '<div class="cap">TIMING</div><p>' + ch.map(function (x) { return esc(x.level) + ' ' + esc(x.ganzhi) + ' (' + esc(S[x.season] || '-') + ')'; }).join(' → ') + '</p><div class="st">' + ((c.timing && c.timing.strategy) || []).map(function (x) { return '<b>' + esc(x.label) + '</b>'; }).join('') + '</div><div class="g2">' +
        Object.keys(K).map(function (k) { var a = (c.remedy && c.remedy[k]) || []; return a.length ? '<div class="box"><b>' + K[k] + '</b>' + a.slice(0, 2).map(function (x) { return '<div style="margin-bottom:3px"><span style="font-weight:500">' + esc(x.title) + '</span></div>'; }).join('') + '</div>' : ''; }).join('') + '</div>';
    } else {
      var bl = bullets(c); if (bl.length) h += '<div class="g2" style="margin-top:12px">' + bl.slice(0, 6).map(function (b) { return '<div class="box"><b>' + esc(b.label) + '</b>' + list(b.items.slice(0, 4)) + '</div>'; }).join('') + '</div>';
      if ((c.details || []).length) h += '<div class="cap">MORE</div>' + c.details.slice(0, 2).map(function (d) { return '<p><b style="font-weight:500">' + esc(d.headline) + '</b> — ' + esc(d.summary) + '</p>'; }).join('');
    }
    if (c.action && c.action.length && c.kind !== 'remedy') h += '<div class="cap">ACTION</div>' + list(c.action);
    if (c.disclaimer) h += '<p style="margin-top:14px;color:#6B6A63;font-size:11.5px">※ ' + esc(c.disclaimer) + '</p>';
    return page(h + '</div>', color, n, total, who);
  }

  // pages(rep, sd, opts) → ['<div class="pg">…</div>', …]   opts: { name }
  function pages(rep, sd, opts) {
    opts = opts || {}; var who = opts.name || '', S = R.SajuData.SEASONS, out = [], total = rep.chapters.length + 3;
    var color = EL[sd.dayMaster.el] || '#B9975B', n = 0, K = R.SajuData.ELK;
    var cov1 = rep.chapters[0] || {};
    // 1 표지
    var kw = [sd.dayMaster.el + ' 기운', sd.dominantGroup + ' 중심', sd.strength.band].concat(sd.sewoon && sd.sewoon.season ? ['올해 ' + S[sd.sewoon.season]] : []);
    out.push('<div class="pg" style="--c:' + color + '"><div class="cov"><div class="k">MANTRA FORTUNE · 사주 무빙툰</div><h1>' + (who ? esc(who) + '님의<br>' : '') + '인생 사용설명서</h1><p>' + esc(sd.dayPillar.ko) + '일주 · ' + esc(sd.dayPillar.hanja) + '</p><div class="t">' + kw.slice(0, 4).map(function (k) { return '<span>' + esc(k) + '</span>'; }).join('') + '</div><p style="margin-top:46px;font-size:12px">' + esc(cov1.headline || '') + '</p><p style="margin-top:90px;font-size:10.5px">' + new Date().getFullYear() + ' · 이 리포트는 사주 구조를 바탕으로 한 참고용 콘텐츠입니다</p></div></div>'); n++;
    // 2 나의 사주
    var P = sd.pillars, cell = function (k, l) { var p = P[k]; return '<td>' + (p ? '<div style="font-size:21px;font-family:\'Noto Serif KR\',serif">' + esc(p.hanja) + '</div><div style="color:#6B6A63;font-size:11px">' + esc(p.ko) + '</div>' : '<span style="color:#9A978A">시간 모름</span>') + '</td>'; };
    var tg = function (k) { var p = P[k]; return '<td>' + (p ? esc((p.stemTG || '') + ' / ' + (p.branchTG || '')) : '-') + '</td>'; };
    var us = function (k) { var p = P[k]; return '<td>' + (p ? esc(p.unseong || '-') : '-') + '</td>'; };
    var bars = K.map(function (e) { return '<div class="bar"><span>' + e + '</span><i style="width:' + Math.max(2, sd.fiveElements[e] * 4) + 'px;background:' + EL[e] + '"></i>' + Math.round(sd.fiveElements[e]) + '%</div>'; }).join('');
    var yong = sd.usefulElements ? sd.usefulElements.yong + (sd.usefulElements.hee ? ' · 희신 ' + sd.usefulElements.hee : '') : '해당 없음';
    out.push(page('<div class="band"></div><div class="in"><div class="act">MY SAJU</div><h2>나의 사주 원국</h2><div class="sub">만세력 엔진이 계산한 네 기둥입니다</div><table style="margin-top:20px"><tr><th></th><th>시주</th><th>일주(나)</th><th>월주</th><th>연주</th></tr><tr><th>간지</th>' + cell('hour') + cell('day') + cell('month') + cell('year') + '</tr><tr><th>십성(천간/지지)</th>' + tg('hour') + tg('day') + tg('month') + tg('year') + '</tr><tr><th>12운성</th>' + us('hour') + us('day') + us('month') + us('year') + '</tr></table>' +
      '<div class="cap">FIVE ELEMENTS</div>' + bars + '<div class="g2" style="margin-top:14px"><div class="box"><b>신강약</b>' + esc(sd.strength.zone) + '</div><div class="box"><b>용신</b>' + esc(yong) + '</div><div class="box"><b>우세 십성군</b>' + esc(sd.dominantGroup) + '</div><div class="box"><b>원국 통근</b>' + esc(sd.roots ? sd.roots.level : '확인 불가') + '</div></div>' +
      (sd.patterns.length ? '<div class="cap">PATTERNS</div><p>' + esc(sd.patterns.map(function (p) { return p.name; }).join(' · ')) + '</p>' : '') + '<div class="cap">NOTE</div><p style="color:#6B6A63;font-size:12px">이 표의 값은 만세력 계산 결과이며, 이후 해석은 이 값에 사람이 작성한 해석 모듈을 연결해 구성되었습니다.</p></div>', color, 2, total, who)); n++;
    // 3.. 챕터
    rep.chapters.forEach(function (c) {
      n++; if (c.kind === 'summary' && c.plan) out.push(summaryPage(c, rep, n, total, who, color)); else out.push(chapterPage(c, rep, n, total, who, color, sd));
    });
    // 마무리
    n++;
    out.push(page('<div class="band"></div><div class="in"><div class="act">CLOSING</div><h2>당신의 이야기가 완성되었습니다</h2><p style="margin-top:14px">타고난 기질부터 현재의 운, 앞으로의 행동 전략까지 살펴보았습니다. 이 리포트는 정해진 미래를 말하는 것이 아니라, 지금 어떻게 움직이면 좋을지 생각해 보는 지도입니다.</p><div class="cap">현재 전략</div><div class="st">' + rep.plan.strategy.map(function (x) { return '<b>' + esc(x.label) + '</b>'; }).join('') + '</div>' +
      '<div class="cap">안내</div><p style="color:#6B6A63;font-size:12px">· 사주 해석은 과학적으로 검증된 예측이 아니며, 건강·재물 규모·법률·임신 등을 단정하지 않습니다.<br>· 전생 이야기는 사주 요소를 바탕으로 구성한 상징적 스토리 콘텐츠입니다.<br>· 운동·활동 추천은 건강 처방이 아니라 생활 콘텐츠입니다.</p></div>', color, n, total, who));
    return out;
  }
  function summaryPage(c, rep, n, total, who, color) {
    var sm = rep.summary, p = c.plan, K = [['core', '나의 핵심'], ['strengths', '강점'], ['weaknesses', '약점'], ['work', '일'], ['money', '돈'], ['people', '사람'], ['love', '사랑'], ['growth', '성장'], ['body', '몸과 활동'], ['place', '공간'], ['daewoon', '현재 대운'], ['thisYear', '올해']];
    return page('<div class="band"></div><div class="in"><div class="act">ACT IV · 20</div><h2>' + esc(c.title) + '</h2><div class="sub">' + esc(c.subtitle) + '</div><div class="hl">' + nl(c.headline) + '</div><div class="g2">' + K.map(function (k) { return sm[k[0]] ? '<div class="box"><b>' + k[1] + '</b>' + esc(sm[k[0]]) + '</div>' : ''; }).join('') + '</div>' +
      '<div class="cap">앞으로 12개월</div><p style="font-size:12px">' + esc((sm.months || []).join(' · ')) + '</p><div class="cap">STRATEGY</div><div class="st">' + p.strategy.map(function (x, i) { return (i ? '<span style="align-self:center">→</span>' : '') + '<b>' + esc(x.label) + '</b>'; }).join('') + '</div>' +
      '<div class="g2"><div><div class="cap">지금 해야 할 것</div><ul class="chk">' + p.checklist.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ul></div><div><div class="cap">피해야 할 것</div>' + list(p.avoid) + '</div></div></div>', color, n, total, who);
  }

  /* ── 브라우저: 페이지 → 래스터 → PDF ───────────────────────────────────── */
  function loadScript(src) { return new Promise(function (res, rej) { var e = document.createElement('script'); e.src = src; e.onload = res; e.onerror = function () { e.remove(); rej(new Error('라이브러리를 불러오지 못했습니다. 인터넷 연결을 확인하세요.')); }; document.head.appendChild(e); }); }
  function loadAny(srcs) { var p = Promise.reject(); srcs.forEach(function (u) { p = p.catch(function () { return loadScript(u); }); }); return p; }
  function libs() {
    var a = Promise.resolve();
    if (!root.html2canvas) a = loadAny(['https://cdn.jsdelivr.net/npm/html2canvas-pro@1.5.8/dist/html2canvas-pro.min.js', 'https://unpkg.com/html2canvas-pro@1.5.8/dist/html2canvas-pro.min.js']);
    return a.then(function () { if (!(root.jspdf && root.jspdf.jsPDF)) return loadAny(['https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js', 'https://cdn.jsdelivr.net/npm/jspdf@2.5.1/dist/jspdf.umd.min.js']); });
  }
  var MOBILE = /Android|iPhone|iPad|iPod/i.test(root.navigator ? navigator.userAgent : '');
  function generate(rep, sd, opts) {
    opts = opts || {}; var progress = opts.onProgress || function () { };
    var html = pages(rep, sd, opts), host = document.createElement('div'), style = document.createElement('style');
    host.style.cssText = 'position:fixed;left:-10000px;top:0;width:' + W + 'px;pointer-events:none'; style.textContent = CSS; host.appendChild(style);
    var wrap = document.createElement('div'); wrap.innerHTML = html.join(''); host.appendChild(wrap); document.body.appendChild(host);
    var els = [].slice.call(wrap.querySelectorAll('.pg'));
    var fonts = document.fonts && document.fonts.load ? Promise.all(['400 14px "Noto Sans KR"', '500 14px "Noto Sans KR"', '600 20px "Noto Serif KR"'].map(function (f) { return document.fonts.load(f, '가나다라마바사'); })).then(function () { return document.fonts.ready; }).catch(function () { }) : Promise.resolve();
    return libs().then(function () { return fonts; }).then(function () {
      // 한 페이지에 다 안 들어가면 글자 영역을 줄여 맞춘다(잘림 방지)
      els.forEach(function (el) { var inn = el.querySelector('.in'); if (!inn) return; var used = inn.offsetHeight; if (used > H) inn.style.zoom = Math.max(0.6, (H - 8) / used); });
      var pdf = new root.jspdf.jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait', compress: true }), i = 0;
      function next() {
        if (i >= els.length) return Promise.resolve();
        progress(i + 1, els.length);
        return root.html2canvas(els[i], { scale: MOBILE ? 1.4 : 2, backgroundColor: '#ffffff', useCORS: true, logging: false, width: W, height: H }).then(function (cv) {
          if (i) pdf.addPage('a4', 'portrait'); pdf.addImage(cv.toDataURL('image/jpeg', MOBILE ? 0.82 : 0.9), 'JPEG', 0, 0, 210, 297); i++; return new Promise(function (r) { setTimeout(r, 0); }).then(next);
        });
      }
      return next().then(function () { return pdf; });
    }).then(function (pdf) {
      var name = 'mantra-report-' + sd.dayPillar.ko + '.pdf', blob = pdf.output('blob'), file = new File([blob], name, { type: 'application/pdf' });
      host.remove();
      if (MOBILE && navigator.canShare && navigator.canShare({ files: [file] })) return navigator.share({ files: [file], title: '나의 인생 사용설명서' }).catch(function () { });
      var u = URL.createObjectURL(blob), a = document.createElement('a'); a.href = u; a.download = name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(function () { URL.revokeObjectURL(u); }, 60000);
    }).catch(function (e) { host.remove(); throw e; });
  }

  R.Pdf = { pages: pages, generate: generate, CSS: CSS, W: W, H: H };
})(typeof window !== 'undefined' ? window : globalThis);
