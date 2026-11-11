/* 사업자 정보 한 곳: 무빙툰 하단(푸터)·이용약관·개인정보처리방침·환불정책·구매 창이 모두 이 값을 읽는다.
   바꿀 일이 생기면(주소 이전·전화번호 변경 등) 이 파일만 고치면 된다. 출처: 사업자등록증(2026-10-21 정정)·통신판매업신고증(2026-02-11).
   - 페이지 안의 [data-biz="키"] 요소에 값을 채운다.
   - <body data-legal-footer> 이거나 이 스크립트에 data-footer 속성이 있으면 맨 아래에 사업자 정보 푸터를 붙인다. */
(function (root) {
  'use strict';
  var B = root.MANTRA_BUSINESS = {
    service: '만트라 사주 무빙툰',
    name: '만트라 스튜디오',
    ceo: '백진우',
    bizNo: '775-24-01924',
    mailOrderNo: '제2026-전주덕진-0195호',
    address: '전북특별자치도 전주시 덕진구 만성중앙로 53-44, 3층 A-2호(만성동)',
    phone: '070-4519-6416',
    email: 'critical5114@naver.com',
    privacyOfficer: '백진우',
    effective: '2026년 11월 10일',
    refundDays: 7,
    links: { my: '/report/my/', products: '/report/legal/products.html', terms: '/report/legal/terms.html', privacy: '/report/legal/privacy.html', refund: '/report/legal/refund.html' },
    // 공정거래위원회 사업자정보 공개 페이지(통신판매사업자 정보 확인)
    bizCheck: 'https://www.ftc.go.kr/bizCommPop.do?wrkr_no=7752401924',
  };
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  function fill(doc) { [].forEach.call((doc || document).querySelectorAll('[data-biz]'), function (el) { var v = B[el.getAttribute('data-biz')]; if (v != null) el.textContent = v; }); }
  function footerHtml() {
    return '<footer class="mt-legal" role="contentinfo"><nav class="mt-legal-links" aria-label="약관과 정책">' +
      '<a href="' + B.links.my + '">내 구매 내역</a><a href="' + B.links.products + '">상품 안내</a><a href="' + B.links.terms + '">이용약관</a><a href="' + B.links.privacy + '"><b>개인정보처리방침</b></a><a href="' + B.links.refund + '">환불정책</a></nav>' +
      '<p>' + esc(B.name) + ' · 대표 ' + esc(B.ceo) + ' · 사업자등록번호 ' + esc(B.bizNo) + ' <a href="' + B.bizCheck + '" target="_blank" rel="noopener">사업자정보 확인</a></p>' +
      '<p>통신판매업 신고 ' + esc(B.mailOrderNo) + ' · ' + esc(B.address) + '</p>' +
      '<p>고객 문의 <a href="tel:' + B.phone.replace(/-/g, '') + '">' + esc(B.phone) + '</a> · <a href="mailto:' + B.email + '">' + esc(B.email) + '</a></p></footer>';   // '참고용 콘텐츠' 안내는 화면마다 이미 있어 푸터에서는 반복하지 않는다
  }
  function css() {
    if (document.getElementById('mt-legal-css')) return;
    var s = document.createElement('style'); s.id = 'mt-legal-css';
    s.textContent = '.mt-legal{max-width:960px;margin:32px auto 0;padding:20px 16px calc(28px + env(safe-area-inset-bottom,0px));border-top:1px solid rgba(128,128,128,.25);font-size:12px;line-height:1.7;color:#8a8577;text-align:center}' +
      '.mt-legal p{margin:2px 0}.mt-legal a{color:inherit;text-decoration:underline;text-underline-offset:2px}.mt-legal-links{display:flex;gap:14px;justify-content:center;flex-wrap:wrap;margin-bottom:8px;font-size:13px}.mt-legal-links a{text-decoration:none}.mt-legal-note{margin-top:8px!important;opacity:.8}';
    document.head.appendChild(s);
  }
  function mountFooter(target) {
    if (document.querySelector('.mt-legal')) return;
    css(); (target || document.body).insertAdjacentHTML('beforeend', footerHtml());
  }
  root.MantraLegal = { info: B, fill: fill, footerHtml: footerHtml, mountFooter: mountFooter };
  var me = document.currentScript;
  var go = function () { fill(); if ((me && me.hasAttribute('data-footer')) || document.body.hasAttribute('data-legal-footer')) mountFooter(); };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', go); else go();
})(typeof window !== 'undefined' ? window : globalThis);
