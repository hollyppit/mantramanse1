// 상품 안내는 개인 결과와 분리하고 기존 입력·무빙툰 라우터로 연결한다.
(function () {
  'use strict';
  var el = document.getElementById('productGuide'); if (!el) return;
  var preview = /[?&]preview=1\b/.test(location.search);
  el.innerHTML = '<div class="pg-wrap"><p class="pg-kicker">만트라 사주 무빙툰</p><h2>내 사주를, 읽고 보는 이야기로</h2><p class="pg-lead">태어난 정보를 바탕으로 기질과 관계, 일과 돈, 인생의 흐름을 살펴보세요. 캐릭터와 장면이 이어지는 무빙툰으로 복잡한 해석을 따라갈 수 있습니다.</p><div class="pg-actions"><a class="cv-btn" href="#/input?next=life" data-product-event="product_trial_click">내 사주로 체험하기</a><a href="#productSample" class="pg-secondary" data-product-event="product_sample_click">어떻게 읽는지 먼저 보기 ↓</a></div><p class="pg-note">출생정보 입력 → 내 사주 계산 → 개인화된 이야기 · 소리 없이도 읽을 수 있어요.</p><div class="pg-cards"><article><h3>나는 어떤 사람일까?</h3><p>타고난 기질과 강점, 주의할 성향을 이해하는 데서 시작합니다.</p></article><article><h3>어디에 힘을 쓸까?</h3><p>일·재물·관계 등 궁금한 주제를 골라 내 이야기를 살펴봅니다.</p></article><article><h3>언제 움직일까?</h3><p>인생의 흐름과 현재의 시기를 읽고, 일상에 적용할 방향을 생각해 봅니다.</p></article></div><section id="productSample" class="pg-sample"><p class="pg-kicker">읽는 방식 예시 · 개인 결과가 아닙니다</p><h3>해석에서 끝나지 않고, 내 선택으로</h3><ol><li><b>기질 이해</b><span>사주를 바탕으로 어떤 성향이 드러나는지 읽습니다.</span></li><li><b>내 생활에 연결</b><span>일과 관계에서 그 성향이 어떻게 나타날지 살펴봅니다.</span></li><li><b>행동으로 옮기기</b><span>개운 가이드에서 지금 시도해 볼 방향을 찾아봅니다.</span></li></ol><p class="pg-note">이 예시는 콘텐츠의 구성 안내입니다. 실제 문장과 장면은 사주·선택한 콘텐츠에 따라 달라집니다.</p></section><section class="pg-scope"><h3>먼저 체험하고, 깊이를 선택하세요</h3><div class="pg-cards"><article><h4>무료 콘텐츠</h4><p>오늘의 운세·일주 소개 등으로 나의 기질과 콘텐츠의 읽는 방식을 확인하세요.</p></article><article><h4>심층 무빙툰</h4><p>인생 지도와 분야별 이야기, 개운 가이드로 이어집니다. 제공 범위는 선택한 상품에 따라 달라집니다.</p></article></div><p class="pg-note">현재 공개된 콘텐츠를 먼저 체험할 수 있습니다. 유료 상품의 판매 여부·가격·제공 범위는 구매 화면에서 확인하세요.</p></section><section class="pg-faq"><h3>시작하기 전에 궁금한 점</h3><details><summary>태어난 시간을 몰라도 볼 수 있나요?</summary><p>입력 화면에서 시간 모름을 선택할 수 있습니다. 시간 정보가 없는 해석은 일부 범위가 제한될 수 있습니다.</p></details><details><summary>한 번 입력한 정보를 다시 써야 하나요?</summary><p>이 브라우저에 저장한 출생정보를 다른 운세 콘텐츠에서도 이어서 사용합니다. 공용 기기에서는 이용 후 입력 정보를 지워 주세요.</p></details><details><summary>미래를 확정해서 알려 주나요?</summary><p>사주는 성향과 흐름을 돌아보는 참고 콘텐츠입니다. 중요한 선택은 현실의 정보와 함께 판단해 주세요.</p></details><details><summary>영상 소리를 꼭 켜야 하나요?</summary><p>무빙툰은 텍스트와 함께 읽을 수 있습니다. 소리는 필요할 때 켜고, 영상은 건너뛰어 이야기를 이어 갈 수 있습니다.</p></details></section><div class="pg-actions"><a class="cv-btn" href="#/input?next=life" data-product-event="product_trial_bottom_click">나의 이야기 시작하기</a></div></div>';
  function visible() { el.hidden = preview || /^#\//.test(location.hash) && location.hash !== '#/' || /[?&](story=1|g=)/.test(location.search); }
  visible(); window.addEventListener('hashchange', visible);
  el.addEventListener('click', function (e) {
    var a = e.target.closest('[data-product-event]'); if (!a) return;
    if (a.getAttribute('href') === '#productSample') { e.preventDefault(); var sample = document.getElementById('productSample'); if (sample) sample.scrollIntoView({ behavior: window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' }); }
    var name = a.getAttribute('data-product-event');
    if (window.Hub) window.Hub.track(name, { placement: 'product_guide' });
    else window.dispatchEvent(new CustomEvent('mantra:track', { detail: { name: name, props: { placement: 'product_guide' } } }));
    if (a.getAttribute('href').indexOf('#/input') === 0) {
      // 허브 로딩 실패 시에도 독립 입력 화면으로 이동할 수 있다.
      if (!window.Hub) { e.preventDefault(); location.href = '/report/hub/#/input?next=life'; }
      else setTimeout(function () { var h = document.getElementById('hub'); if (h) h.scrollIntoView({ behavior: 'auto', block: 'start' }); }, 0);
    }
  });
})();
