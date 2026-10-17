(function () {
  'use strict';
  if (document.getElementById('guideChange') || /[?&]preview=1/.test(location.search)) return;
  var style = document.createElement('style');
  style.textContent = '#guideChange{position:fixed;left:12px;bottom:92px;z-index:1200;padding:10px 14px;border:1px solid #8b7956;border-radius:24px;background:#11151eee;color:#e9dcc4;font:inherit;font-size:13px;cursor:pointer}#guidePicker{max-width:360px;width:calc(100% - 40px);padding:24px;border:1px solid #8b7956;border-radius:16px;background:#11151e;color:#eee5d5}#guidePicker::backdrop{background:#000a}#guidePicker button{display:block;width:100%;padding:14px;margin-top:12px;background:#202735;color:inherit;border:1px solid #77664b;border-radius:10px;font:inherit;cursor:pointer}#guidePicker button[aria-pressed=true]{outline:2px solid #d5b97f}#guidePicker small{display:block;margin-top:6px;color:#c6bca9}';
  document.head.appendChild(style);
  var button = document.createElement('button'); button.id = 'guideChange'; button.type = 'button'; button.textContent = '안내자 변경'; button.hidden = true;
  var dialog = document.createElement('dialog'); dialog.id = 'guidePicker'; dialog.setAttribute('aria-labelledby', 'guidePickerTitle');
  dialog.innerHTML = "<h2 id=\"guidePickerTitle\">안내자 변경</h2><p>지금 보시던 단계에서 계속 진행합니다.</p><button type=\"button\" data-guide=\"male\">운명 감찰관<small>직설적인 존댓말</small></button><button type=\"button\" data-guide=\"female\">명운 해독관<small>차분한 존댓말</small></button><button type=\"button\" data-close>닫기</button>";
  document.body.appendChild(button); document.body.appendChild(dialog);
  function current() { try { return JSON.parse(localStorage.getItem('mt_guide') || 'null') === 'female' ? 'female' : 'male'; } catch (e) { return 'male'; } }
  function canShow(saved, route, step, viewer) {
    if (saved !== 'male' && saved !== 'female') return false;
    if (viewer) return true;
    if (!route || route === 'welcome') return false;
    if (route === 'begin') return !!step && step !== 'seal' && step !== 'guide';
    return true;
  }
  function updateVisibility() {
    var saved = null; try { saved = JSON.parse(localStorage.getItem('mt_guide') || 'null'); } catch (e) { }
    var route = location.hash.replace(/^#\/?/, '').split('?')[0], scene = document.querySelector('[data-guide-step]');
    button.hidden = true;
    if (button.hidden && dialog.open) dialog.close();
  }
  updateVisibility();
  window.addEventListener('hashchange', updateVisibility);
  window.addEventListener('storage', updateVisibility);
  window.addEventListener('mantra:guide-change', updateVisibility);
  new MutationObserver(updateVisibility).observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['data-guide-step'] });
  window.mantraOpenGuidePicker = button.onclick = function () { dialog.querySelectorAll('[data-guide]').forEach(function (b) { b.setAttribute('aria-pressed', String(b.dataset.guide === current())); }); dialog.showModal(); };
  document.addEventListener('click', function (e) { if (e.target.closest && e.target.closest('[data-guide-open]')) button.onclick(); });
  dialog.onclick = function (e) {
    var b = e.target.closest('[data-guide]');
    if (b) {
      try { localStorage.setItem('mt_guide', JSON.stringify(b.dataset.guide)); } catch (err) { return; }
      window.dispatchEvent(new CustomEvent('mantra:guide-change', { detail: { guide: b.dataset.guide } })); dialog.close(); button.focus();
    } else if (e.target.closest('[data-close]')) dialog.close();
  };
})();
