// SNS 공유 카드(9:16, 1080×1920). 개인정보 최소화: 생년월일·이름·시각·성별은 넣지 않는다.
// 포함: 수호신 이미지(있으면), 일주, 한 줄 정의, 키워드 3개, 현재 운 키워드, MANTRA 브랜딩.
(function (root) {
  var R = root.ReportV2 = root.ReportV2 || {};
  var W = 1080, H = 1920;
  var PAL = { '목': ['#1D3A2C', '#5E9E78'], '화': ['#3E1A16', '#D0634A'], '토': ['#3A2F1A', '#BC9C62'], '금': ['#232A38', '#AEB9C6'], '수': ['#101F3A', '#4A7AB5'] };

  // 카드에 들어갈 내용(순수 함수, 테스트 가능). 생년월일 등은 절대 포함하지 않는다.
  function content(rep, sd, awk) {
    var S = R.SajuData.SEASONS, v = awk && awk.video, c1 = (rep.chapters[0] || {});
    var kw = (v && v.keywords && v.keywords.length ? v.keywords : [sd.dayMaster.el + ' 기운', sd.dominantGroup + ' 중심', sd.strength.band]).slice(0, 3);
    var now = [sd.currentDaewoon && sd.currentDaewoon.season ? '대운 ' + S[sd.currentDaewoon.season] : '', sd.sewoon && sd.sewoon.season ? '올해 ' + S[sd.sewoon.season] : ''].filter(Boolean);
    return { pillar: sd.dayPillar.ko + '일주', hanja: sd.dayPillar.hanja, line: (c1.headline || '').replace(/\n/g, ' '), keywords: kw, now: now, el: sd.dayMaster.el, guardian: v && v.guardianImageUrl || '' };
  }
  function wrap(ctx, text, maxW) { // 한글은 어절 단위로, 어절이 너무 길면 글자 단위로 줄바꿈
    var words = String(text).split(/\s+/), lines = [], cur = '';
    words.forEach(function (w) {
      var t = cur ? cur + ' ' + w : w; if (ctx.measureText(t).width <= maxW) { cur = t; return; }
      if (cur) lines.push(cur); cur = '';
      if (ctx.measureText(w).width > maxW) { var s = ''; w.split('').forEach(function (ch) { if (ctx.measureText(s + ch).width > maxW) { lines.push(s); s = ch; } else s += ch; }); cur = s; } else cur = w;
    });
    if (cur) lines.push(cur); return lines;
  }
  function loadImg(u) { return new Promise(function (res) { if (!u) return res(null); var i = new Image(); i.crossOrigin = 'anonymous'; i.onload = function () { res(i); }; i.onerror = function () { res(null); }; i.src = u; }); }

  function draw(cv, d, img) {
    cv.width = W; cv.height = H; var x = cv.getContext('2d'), p = PAL[d.el] || PAL['수'];
    var g = x.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#070913'); g.addColorStop(.45, p[0]); g.addColorStop(1, '#05060d'); x.fillStyle = g; x.fillRect(0, 0, W, H);
    var r = x.createRadialGradient(W / 2, 760, 20, W / 2, 760, 700); r.addColorStop(0, p[1] + 'AA'); r.addColorStop(1, 'transparent'); x.fillStyle = r; x.fillRect(0, 0, W, H);
    if (img) { var s = Math.min(760 / img.width, 760 / img.height), w = img.width * s, h = img.height * s; x.save(); x.globalAlpha = .95; x.drawImage(img, (W - w) / 2, 400 - 0 + (760 - h) / 2, w, h); x.restore(); }
    else { x.save(); x.strokeStyle = '#D5B97F88'; x.lineWidth = 3; x.beginPath(); x.arc(W / 2, 780, 250, 0, Math.PI * 2); x.stroke(); x.beginPath(); x.arc(W / 2, 780, 290, 0, Math.PI * 2); x.globalAlpha = .4; x.stroke(); x.restore(); x.fillStyle = '#F0DFB2'; x.font = '500 300px "Noto Serif KR", serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(d.hanja.charAt(0), W / 2 - 0, 790); }
    x.textAlign = 'center'; x.textBaseline = 'alphabetic'; x.fillStyle = '#D5B97F'; x.font = '500 34px "Noto Sans KR", sans-serif'; if (x.letterSpacing !== undefined) x.letterSpacing = '12px'; x.fillText('MANTRA FORTUNE', W / 2, 150); if (x.letterSpacing !== undefined) x.letterSpacing = '0px';
    x.fillStyle = '#F4EFE2'; x.font = '600 120px "Noto Serif KR", serif'; x.fillText(d.pillar, W / 2, 1330);
    x.fillStyle = '#BDB8AB'; x.font = '400 40px "Noto Serif KR", serif'; x.fillText(d.hanja, W / 2, 1390);
    x.fillStyle = '#F0DFB2'; x.font = '400 50px "Noto Serif KR", serif'; var lines = wrap(x, d.line, W - 220).slice(0, 3); lines.forEach(function (l, i) { x.fillText(l, W / 2, 1480 + i * 70); });
    // 키워드 3개
    x.font = '500 34px "Noto Sans KR", sans-serif'; var pillW = d.keywords.map(function (k) { return x.measureText('#' + k).width + 56; }), tot = pillW.reduce(function (a, b) { return a + b; }, 0) + 20 * (pillW.length - 1), cx = (W - tot) / 2, y = 1480 + lines.length * 70 + 40;
    d.keywords.forEach(function (k, i) { x.strokeStyle = '#D5B97F'; x.lineWidth = 2; rr(x, cx, y, pillW[i], 68, 34); x.stroke(); x.fillStyle = '#F4EFE2'; x.fillText('#' + k, cx + pillW[i] / 2, y + 45); cx += pillW[i] + 20; });
    if (d.now.length) { x.fillStyle = '#BDB8AB'; x.font = '400 34px "Noto Sans KR", sans-serif'; x.fillText('지금의 흐름 · ' + d.now.join(' · '), W / 2, Math.min(y + 150, H - 120)); }
    x.fillStyle = '#8A8678'; x.font = '400 26px "Noto Sans KR", sans-serif'; x.fillText('나의 사주 무빙툰 · 사주는 참고용 콘텐츠입니다', W / 2, H - 70);
  }
  function rr(x, a, b, w, h, r) { x.beginPath(); x.moveTo(a + r, b); x.arcTo(a + w, b, a + w, b + h, r); x.arcTo(a + w, b + h, a, b + h, r); x.arcTo(a, b + h, a, b, r); x.arcTo(a, b, a + w, b, r); x.closePath(); }

  // 브라우저: 미리보기 대화상자(저장·공유). 반환 Promise 는 카드가 만들어지면 resolve.
  function create(rep, sd, awk) {
    var d = content(rep, sd, awk), fonts = document.fonts && document.fonts.load ? Promise.all(['600 100px "Noto Serif KR"', '500 30px "Noto Sans KR"'].map(function (f) { return document.fonts.load(f, '가나다 MANTRA'); })).catch(function () { }) : Promise.resolve();
    return Promise.all([loadImg(d.guardian), fonts]).then(function (a) {
      var cv = document.createElement('canvas'); draw(cv, d, a[0]);
      return new Promise(function (res, rej) {
        cv.toBlob(function (b) {
          if (!b) return rej(new Error('카드를 만들지 못했습니다.'));
          var url = URL.createObjectURL(b), file = new File([b], 'mantra-card.png', { type: 'image/png' }), dlg = document.createElement('dialog');
          dlg.style.cssText = 'border:1px solid #9A8250;border-radius:16px;background:#0D1120;color:#EDE8DC;padding:16px;max-width:92vw;width:380px';
          dlg.innerHTML = '<img src="' + url + '" alt="공유 카드 미리보기" style="width:100%;border-radius:10px;display:block"><div style="display:grid;gap:8px;margin-top:12px"><button type="button" id="scShare" class="btn gold big">공유하기</button><button type="button" id="scSave" class="btn big">이미지 저장</button><button type="button" id="scLink" class="btn big">공유 링크 복사</button><button type="button" id="scClose" class="btn">닫기</button></div><p style="font-size:.74rem;color:#8A8678;margin:10px 0 0;text-align:center">생년월일·이름은 카드에 들어가지 않습니다.</p>';
          document.body.appendChild(dlg); dlg.showModal();
          var close = function () { dlg.close(); dlg.remove(); setTimeout(function () { URL.revokeObjectURL(url); }, 30000); };
          dlg.querySelector('#scClose').onclick = close;
          dlg.querySelector('#scLink').onclick = function () { var u = R.Free ? R.Free.shareUrl(sd, location.origin) : ''; (R.Free ? R.Free.copy(u) : Promise.reject()).then(function () { dlg.querySelector('#scLink').textContent = '링크를 복사했습니다'; if (R.Analytics) R.Analytics.trackEvent('guardian_shared', { from: 'card' }); }).catch(function () { dlg.querySelector('#scLink').textContent = u || '복사하지 못했습니다'; }); }; // 링크에는 일주·성별만 들어간다
          dlg.querySelector('#scSave').onclick = function () { var a = document.createElement('a'); a.href = url; a.download = file.name; document.body.appendChild(a); a.click(); a.remove(); };
          dlg.querySelector('#scShare').onclick = function () { if (navigator.canShare && navigator.canShare({ files: [file] })) navigator.share({ files: [file], title: '나의 사주 무빙툰' }).catch(function () { }); else dlg.querySelector('#scSave').click(); };
          res();
        }, 'image/png');
      });
    });
  }
  R.ShareCard = { content: content, draw: draw, create: create, W: W, H: H };
})(typeof window !== 'undefined' ? window : globalThis);
