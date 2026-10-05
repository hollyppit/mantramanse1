// 수호신 무료 결과·공유 링크·공개 영상 주소 검증:  node tests/guardian-flow-sim.js
const fs = require('fs'), path = require('path'), vm = require('vm'), os = require('os'), url = require('url');
const root = path.join(__dirname, '..');
vm.runInThisContext(fs.readFileSync(path.join(root, 'engine.js'), 'utf8'), { filename: 'engine.js' });
globalThis.window = globalThis;
['chapters', 'saju-data', 'rules', 'narrator', 'content', 'verdict', 'remedy', 'media', 'scenes', 'compose', 'charts', 'free'].forEach(f => vm.runInThisContext(fs.readFileSync(path.join(root, 'report/v2', f + '.js'), 'utf8'), { filename: f + '.js' }));
vm.runInThisContext(fs.readFileSync(path.join(root, 'report/story/content.js'), 'utf8'), { filename: 'story-content.js' });
const M = globalThis.Manse, R = globalThis.ReportV2, fails = [];
const ok = (c, m) => { if (!c) fails.push(m); };
const now = Date.UTC(2026, 9, 5), st = R.Free.mergeStory(globalThis.OnboardingContent, null);

console.log('1. 무료 결과 화면 (생일 5개)');
[[1990, 5, 17, 14, 'M'], [1984, 2, 10, 6, 'F'], [1974, 9, 3, 23, 'M'], [2000, 12, 25, 12, 'F'], [1964, 1, 15, 11, 'M']].forEach(b => {
  const sd = R.SajuData.build(M.compute({ year: b[0], month: b[1], day: b[2], hour: b[3], minute: 0, calendar: 'solar', leap: false, gender: b[4], city: '서울' }), { now });
  const withImg = R.Free.html(sd, { guardianUrl: 'https://v.example.com/a.webp', title: '숲의 왕' }, st), noImg = R.Free.html(sd, {}, st), line = R.Free.potentialLine(sd);
  console.log('   ' + sd.dayPillar.ko + ' → ' + line);
  ok(withImg.includes('class="gd-img"') && withImg.includes(sd.dayPillar.ko + '일주 · 숲의 왕'), '이미지·"{일주}일주 · {title}"');
  ok(noImg.includes('class="gd-fb"') && noImg.includes(sd.dayPillar.hanja) && noImg.includes(sd.dayPillar.ko + '일주</figcaption>'), '이미지 없으면 한자 그라데이션');
  ok(withImg.includes('aria-label="오행 분포: ') && withImg.includes('aria-label="십성군 분포: ') && withImg.includes('aria-label="신강약: ') && /\d+%<\/b>/.test(withImg), '오행·십성군·신강약 차트(수치 포함)');
  ok(withImg.includes('class="pil"') && withImg.includes(sd.pillars.day.hanja) && /용신|해당 없음/.test(withImg) && withImg.includes('대운 흐름') && withImg.includes('모두 무료'), '원국 표 · 용신 · 대운 · 무료 공개 안내');
  ok(withImg.indexOf('내 사주 계산 결과') < withImg.indexOf('그런데 이 힘은') && withImg.indexOf('그런데 이 힘은') < withImg.indexOf('id="freeBuy"'), '순서: 계산 결과(무료) → 전환 문장 → 결제');
  ok(withImg.includes(line.replace(/'/g, '&#39;')) && withImg.includes('그런데 이 힘은 아직 다 쓰이지 않고 있습니다.'), '잠재력 문장 + 전환 문장');
  ['이 힘이 아직 막혀 있는 이유', '수호신이 짚은 당신의 과거 한 시점', '올해 달마다 들어오는 흐름', '20개 챕터 전체'].forEach(t => ok(withImg.includes(t), '잠금 목록 ' + t));
  ok(withImg.includes('id="freeBuy"') && withImg.includes('id="freeLink"') && withImg.includes('id="freeCard"'), '결제·공유 버튼');
  ok(!/undefined|NaN/.test(withImg + noImg), 'undefined/NaN 없음');
  const link = R.Free.shareUrl(sd, 'https://mantramanse.pages.dev');
  ok(/^https:\/\/mantramanse\.pages\.dev\/report\/\?g=[^&]+&s=[MF]$/.test(link) && !link.includes(String(b[0])) && !/name|birth|year|month|day|hour/i.test(link), '공유 링크에 일주·성별만: ' + decodeURIComponent(link));
});
const sdT = R.SajuData.build(M.compute({ year: 1990, month: 5, day: 17, hour: 14, minute: 0, calendar: 'solar', leap: false, gender: 'M', city: '서울' }), { now });
ok(R.Free.html(sdT, {}, R.Free.mergeStory(globalThis.OnboardingContent, { result: { potentialLine: '틀:{group}/{potential}/{n}/{times}' } })).includes('틀:재성/기회를 알아보는 힘/42/2.1'), '관리자 문장 틀 반영');

console.log('2. 공유 링크 해석(스토리 페이지)');
{ // story.js 의 parseShared 를 DOM 없이 점검: location.search 만 흉내
  const code = fs.readFileSync(path.join(root, 'report/story/story.js'), 'utf8');
  const ctx = { window: null, document: undefined, location: { search: '' }, URLSearchParams, console }; ctx.window = ctx; ctx.OnboardingContent = globalThis.OnboardingContent; ctx.Manse = M;
  vm.createContext(ctx); vm.runInContext(code, ctx);
  const St = ctx.Story, p = q => { ctx.location.search = q; return St.parseShared(); };
  // DOC 가 false 면 null 이므로, DOM 이 있는 것처럼 최소 흉내
  ok(St.parseShared() === null, 'DOM 없으면 null');
  const ctx2 = { window: null, document: { getElementById: () => null, querySelectorAll: () => [], addEventListener() { } , readyState: 'loading' }, location: { search: '', hostname: 'x', pathname: '/report/' }, URLSearchParams, console, navigator: {}, matchMedia: () => ({ matches: false }), localStorage: { getItem: () => null, setItem() { } }, addEventListener() { }, setTimeout, clearTimeout };
  ctx2.window = ctx2; ctx2.OnboardingContent = globalThis.OnboardingContent; ctx2.Manse = M; vm.createContext(ctx2);
  try { vm.runInContext(code, ctx2); } catch (e) { fails.push('story.js 로드(DOM 흉내) 실패: ' + e.message); }
  if (ctx2.Story) {
    const P = q => { ctx2.location.search = q; return ctx2.Story.parseShared(); };
    ok(JSON.stringify(P('?g=%EA%B0%91%EC%9E%90&s=M')) === '{"g":"갑자","s":"M"}', '갑자 M 허용');
    ok(P('?g=' + encodeURIComponent('갑축') + '&s=M') === null, '음양이 안 맞는 간지(갑축) 거부');
    ok(P('?g=' + encodeURIComponent('갑자') + '&s=X') === null && P('?g=<script>&s=F') === null && P('') === null, '성별·형식 오류 거부');
  }
}

console.log('3. 공개 영상 기본 주소 (함수)');
const tmp = path.join(os.tmpdir(), 'media-test.mjs'); fs.writeFileSync(tmp, fs.readFileSync(path.join(root, 'functions/_media.js'), 'utf8'));
import(url.pathToFileURL(tmp).href).then(async X => {
  ok(X.cleanPublicBase('https://video.example.com/') === 'https://video.example.com' && X.cleanPublicBase('http://x.com') === '' && X.cleanPublicBase('javascript:alert(1)') === '' && X.cleanPublicBase('https://a.com/x y') === '' && X.cleanPublicBase('') === '', '기본 주소 검증(https 만)');
  ok(X.publicUrl('https://v.example.com', '/api/clipfile?k=ab12cd.mp4') === 'https://v.example.com/ab12cd.mp4', '/api/clipfile?k= → 공개 주소');
  ok(X.publicUrl('https://v.example.com', 'https://other.com/a.mp4') === 'https://other.com/a.mp4' && X.publicUrl('', '/api/clipfile?k=a.mp4') === '/api/clipfile?k=a.mp4', '다른 주소·미설정은 그대로');
  const c = X.publicizeClip('https://v.example.com', { videoUrl: '/api/clipfile?k=a1.mp4', posterUrl: '/api/clipfile?k=p1.webp', guardianImageUrl: '', title: 't' });
  ok(c.videoUrl === 'https://v.example.com/a1.mp4' && c.posterUrl === 'https://v.example.com/p1.webp' && c.title === 't', '클립 필드 일괄 변환');

  // 핸들러: 가짜 KV/R2 로 함수 호출 수 비교
  const awk = fs.readFileSync(path.join(root, 'functions/api/awakening.js'), 'utf8').replace("from '../_lib.js'", "from './_lib_stub.mjs'").replace("from '../_media.js'", "from './_media_real.mjs'");
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'awk-')); fs.writeFileSync(path.join(dir, 'a.mjs'), awk); fs.writeFileSync(path.join(dir, '_media_real.mjs'), fs.readFileSync(tmp, 'utf8'));
  fs.writeFileSync(path.join(dir, '_lib_stub.mjs'), "export const json=(o,s=200)=>new Response(JSON.stringify(o),{status:s,headers:{'content-type':'application/json'}});export const isAdmin=()=>true;export const configError=()=>null;");
  const A = await import(url.pathToFileURL(path.join(dir, 'a.mjs')).href);
  const doc = { videos: [{ dayPillar: '갑자', gender: 'M', videoUrl: '/api/clipfile?k=aa11.mp4', posterUrl: '/api/clipfile?k=pp11.webp', guardianImageUrl: '/api/clipfile?k=gg11.png', title: '숲의 왕', enabled: true }], ilgan: [], fallback: null, publicBase: '' };
  let kvReads = 0; const env = { GLOSSARY_KV: { get: async () => { kvReads++; return JSON.parse(JSON.stringify(doc)); }, put: async (k, v) => { Object.assign(doc, JSON.parse(v)); } } };
  const get = async () => (await A.onRequestGet({ request: new Request('https://x.dev/api/awakening?pillar=갑자&gender=M'), env })).json();
  let d = await get(); ok(d.video.videoUrl === '/api/clipfile?k=aa11.mp4', '기본 주소 없으면 기존 /api/clipfile 그대로');
  const put = async b => (await A.onRequestPut({ request: new Request('https://x.dev/api/awakening', { method: 'PUT', body: JSON.stringify(b) }), env })).json();
  await put({ videos: doc.videos, publicBase: 'https://video.example.com/' }); ok(doc.publicBase === 'https://video.example.com', '관리자 저장: 공개 주소 저장');
  d = await get(); ok(d.video.videoUrl === 'https://video.example.com/aa11.mp4' && d.video.posterUrl === 'https://video.example.com/pp11.webp' && d.video.guardianImageUrl === 'https://video.example.com/gg11.png', '공개 조회: 영상·포스터·수호신 이미지가 R2 공개 주소로 나감');
  await put({ videos: doc.videos }); ok(doc.publicBase === 'https://video.example.com', '주소를 안 보낸 저장은 기존 값 유지');
  await put({ videos: doc.videos, publicBase: '' }); ok(doc.publicBase === '', '빈 값으로 지우면 기존 방식으로 복귀');
  await put({ videos: doc.videos, publicBase: 'http://insecure.com' }); ok(doc.publicBase === '', 'https 가 아니면 저장 안 됨');

  // 함수 호출 수 비교(모델): 브라우저가 영상 하나를 재생하며 Range 요청 3번(앞부분·끝 moov·이어받기)을 보낸다고 가정
  const C2 = fs.readFileSync(path.join(root, 'functions/api/clipfile.js'), 'utf8').replace("from '../_lib.js'", "from './_lib_stub.mjs'"); fs.writeFileSync(path.join(dir, 'c.mjs'), C2);
  const CF = await import(url.pathToFileURL(path.join(dir, 'c.mjs')).href);
  const size = 6 * 1024 * 1024; let r2ops = 0;
  const r2 = { head: async () => { r2ops++; return { size, httpMetadata: { contentType: 'video/mp4' } }; }, get: async (k, o) => { r2ops++; return { body: new Uint8Array(o && o.range ? o.range.length : size), size, httpMetadata: { contentType: 'video/mp4' } }; } };
  const ranges = ['bytes=0-', 'bytes=' + (size - 65536) + '-', 'bytes=1048576-'];
  let fnBefore = 0; for (const rg of ranges) { const res = await CF.onRequestGet({ request: new Request('https://x.dev/api/clipfile?k=aa11.mp4', { headers: { range: rg } }), env: { CLIPS_R2: r2 } }); if (res.status === 206) fnBefore++; }
  const awkCalls = 1, fnAfter = 0;
  console.log(`   영상 1개 재생(Range ${ranges.length}회 가정): 파일 함수 호출 전 ${fnBefore}회 + /api/awakening ${awkCalls}회 = ${fnBefore + awkCalls}회 → 후 ${fnAfter}회 + ${awkCalls}회 = ${fnAfter + awkCalls}회 (R2 연산 ${r2ops}회가 함수 밖으로 이동)`);
  ok(fnBefore === 3 && fnAfter === 0, '함수 호출 수 비교');
  console.log(fails.length ? '\n실패 ' + fails.length + '건\n' + fails.map(f => ' ✗ ' + f).join('\n') : '\n모두 통과');
  process.exit(fails.length ? 1 : 0);
});
