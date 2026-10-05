// 이벤트 분석 인터페이스. 지금은 외부 서비스가 없으므로 ① window 'mt:track' 이벤트 ② dataLayer(있으면) ③ 세션 지표 메모리 집계만 한다.
// 생년월일·이름 등 개인정보는 properties 에 넣지 않는다(호출하는 쪽 규칙 + 아래 필터). 나중에 sendBeacon 등을 이 한 곳에 붙이면 된다.
(function (root) {
  var R = root.ReportV2 = root.ReportV2 || {};
  var EVENTS = ['report_started', 'ilgan_video_started', 'ilgan_video_completed', 'ilgan_video_skipped', 'awakening_video_started', 'awakening_video_completed', 'awakening_video_skipped', 'chapter_viewed', 'chapter_completed', 'detail_expanded', 'act_completed', 'report_completed',
    'pdf_unlocked', 'pdf_downloaded', 'share_card_created', 'share_clicked', 'compatibility_cta_clicked', 'remedy_viewed', 'action_plan_viewed', 'free_result_viewed', 'purchase_clicked', 'guardian_shared'];
  var BLOCK = /^(name|birth|year|month|day|hour|minute|gender|input|dayPillar)$/i; // 개인 식별/생년월일 키는 버린다
  var session = { events: [], chapters: {}, details: 0, skipped: false, startedAt: 0 };

  function trackEvent(name, props) {
    var p = {}; Object.keys(props || {}).forEach(function (k) { if (!BLOCK.test(k)) p[k] = props[k]; });
    var e = { name: name, props: p, t: Date.now(), known: EVENTS.indexOf(name) >= 0 };
    session.events.push(e); if (session.events.length > 300) session.events.shift();
    if (name === 'report_started') session.startedAt = e.t;
    if (name === 'chapter_viewed') session.chapters[p.chapter] = (session.chapters[p.chapter] || 0) + 1;
    if (name === 'detail_expanded') session.details++;
    if (name === 'awakening_video_skipped') session.skipped = true;
    try { root.dispatchEvent(new CustomEvent('mt:track', { detail: e })); } catch (x) { }
    try { if (root.dataLayer && root.dataLayer.push) root.dataLayer.push({ event: 'mt_' + name, ...p }); } catch (x) { }
    if (root.location && /[?&]debug=1\b/.test(root.location.search) && root.console) console.log('[track]', name, p);
  }
  // 향후 측정 지표: 이탈 챕터, 평균 본 챕터 수, 상세 펼침, 영상 skip, PDF/공유/궁합 CTA
  function summary() { return { chaptersViewed: Object.keys(session.chapters).length, details: session.details, skipped: session.skipped, count: session.events.length }; }

  R.Analytics = { trackEvent: trackEvent, EVENTS: EVENTS, summary: summary, session: session };
})(typeof window !== 'undefined' ? window : globalThis);
