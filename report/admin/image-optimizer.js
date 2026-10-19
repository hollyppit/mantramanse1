/* Browser-side image preparation shared by onboarding uploads and existing assets.
   Originals remain in storage; optimized URLs are applied only to the editable draft. */
(function () {
  'use strict';
  var busy = false, known = {};
  try { known = JSON.parse(localStorage.getItem('mt-image-optimized-v1') || '{}'); } catch (_) {}
  function remember(url) { known[url] = true; try { localStorage.setItem('mt-image-optimized-v1', JSON.stringify(known)); } catch (_) {} }
  function animated(bytes, type) {
    var text = new TextDecoder('latin1').decode(bytes);
    return type === 'image/gif' || type === 'image/avif' || /acTL|ANIM|ANMF/.test(text);
  }
  async function prepare(file, options) {
    options = options || {};
    if (!/^image\/(png|jpeg|webp)$/.test(file.type)) return file;
    if (file.size > 40 * 1024 * 1024) throw new Error('이미지 원본은 40MB 이하로 선택해 주세요');
    if (animated(await file.arrayBuffer(), file.type)) return file;
    var bitmap = await createImageBitmap(file);
    try {
      var limit = options.mobile ? 1080 : 1920;
      var scale = Math.min(1, limit / Math.max(bitmap.width, bitmap.height));
      var canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(bitmap.width * scale));
      canvas.height = Math.max(1, Math.round(bitmap.height * scale));
      var ctx = canvas.getContext('2d');
      ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      var blob = await new Promise(function (resolve) { canvas.toBlob(resolve, 'image/webp', 0.84); });
      if (!blob || blob.type !== 'image/webp') throw new Error('이미지 최적화를 지원하는 최신 브라우저로 다시 시도해 주세요');
      if (blob.size >= file.size) return file;
      return new File([blob], (file.name || 'image').replace(/\.[^.]+$/, '') + '.webp', { type: 'image/webp' });
    } finally { bitmap.close(); }
  }
  function candidate(value) {
    if (typeof value !== 'string' || !value || known[value] || /\s/.test(value)) return false;
    try {
      var url = new URL(value, location.origin);
      return url.origin === location.origin && (/\.(png|jpe?g|webp)(?:$)/i.test(url.pathname) || (url.pathname === '/api/clipfile' && /\.(png|jpe?g|webp)$/i.test(url.searchParams.get('k') || '')));
    } catch (_) { return false; }
  }
  function walk(value, visit) {
    if (!value || typeof value !== 'object') return;
    Object.keys(value).forEach(function (key) {
      if (typeof value[key] === 'string') visit(value, key);
      else walk(value[key], visit);
    });
  }
  async function optimizeDraft(T) {
    if (busy) return;
    T.collect();
    var urls = new Set(); walk(T.G.cfg, function (obj, key) { if (candidate(obj[key])) urls.add(obj[key]); });
    if (!urls.size) { T.toast('최적화할 PNG·JPEG·WebP 이미지가 없습니다.'); return; }
    busy = true; T.G.imageOptimizing = true;
    var done = 0, changed = 0, saved = 0, failures = [], skipped = 0;
    var button = T.$('#obOptimize');
    function progress() { if (button && button.isConnected) { button.disabled = true; button.textContent = '이미지 최적화 ' + done + ' / ' + urls.size; } }
    progress();
    try {
      for (var source of urls) {
        try {
          var response = await fetch(source, { signal: AbortSignal.timeout(45000) });
          if (!response.ok) throw new Error('이미지 불러오기 실패 (' + response.status + ')');
          var blob = await response.blob();
          var file = new File([blob], 'existing-image.' + (blob.type.split('/')[1] || 'png'), { type: blob.type });
          var optimized = await prepare(file);
          if (optimized === file) { skipped++; continue; }
          var data = await T.C.api('/api/clipfile?name=' + encodeURIComponent(optimized.name), { method: 'POST', headers: { 'content-type': optimized.type }, body: optimized });
          if (!data.key) throw new Error('최적화 이미지 업로드 실패');
          T.collect();
          var next = '/api/clipfile?k=' + encodeURIComponent(data.key), replaced = false;
          walk(T.G.cfg, function (obj, key) { if (obj[key] === source) { obj[key] = next; replaced = true; } });
          // Update the currently open form too so subsequent collect() cannot restore the old URL.
          T.$$('input,textarea').forEach(function (input) { if (input.value === source) input.value = next; });
          remember(next);
          if (replaced) { changed++; saved += file.size - optimized.size; T.markDirty(); }
        } catch (e) { failures.push({ source: source, error: e.message }); }
        finally { done++; progress(); }
      }
    } finally {
      busy = false; T.G.imageOptimizing = false; T.collect(); T.draw();
      var text = changed + '개 최적화 · ' + (saved / 1048576).toFixed(2) + 'MB 절약 · 유지 ' + skipped + '개' + (failures.length ? ' · 실패 ' + failures.length + '개 (다시 시도 가능)' : '') + (changed ? ' — 초안 저장 후 게시하면 반영됩니다. 원본은 보존됩니다.' : '');
      T.toast(text, !!failures.length);
      var report = document.createElement('div'); report.className = 'card'; report.setAttribute('role','status'); report.textContent = text;
      failures.forEach(function (item) { var line = document.createElement('p'); line.textContent = item.source + ': ' + item.error; report.appendChild(line); });
      T.$('#obBody').prepend(report);
    }
  }
  window.AdminImageOptimizer = { prepare: prepare, remember: remember, optimizeDraft: optimizeDraft, candidate: candidate };
})();
