// 일주 캐릭터 영상 120 · 일간 소개 영상 20 API · 공개 영상 주소 검증 · 수호신 문구 부재 검증:  node tests/ilgan-intro-sim.js
const fs = require('fs'), path = require('path'), os = require('os'), url = require('url');
const root = path.join(__dirname, '..');
const fails = [], ok = (c, m) => { if (!c) fails.push(m); };

// 수호신 흔적이 사용자 화면 코드에 남지 않았는지(주석·보존 코드 제외한 공개 파일 전체 검사)
console.log('1. 사용자 화면에 수호신 문구가 없는지');
const walk = d => fs.readdirSync(d, { withFileTypes: true }).flatMap(e => e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]);
const BAD = /수호신|수호령|guardian|각성(?!\s*(?:$))/i;
const SHOWN = ['report/v2', 'report/story'].flatMap(d => walk(path.join(root, d))).filter(f => /\.(js|html|css)$/.test(f));
const hits = [];
SHOWN.forEach(f => fs.readFileSync(f, 'utf8').split('\n').forEach((l, i) => { if (/수호신|수호령|guardian|일주 각성|나의 수호/i.test(l)) hits.push(path.relative(root, f) + ':' + (i + 1)); }));
ok(hits.length === 0, '수호신 문구/식별자 남음: ' + hits.slice(0, 8).join(', '));

console.log('2. 공개 영상 기본 주소 (함수)');
const tmp = path.join(os.tmpdir(), 'media-test.mjs'); fs.writeFileSync(tmp, fs.readFileSync(path.join(root, 'functions/_media.js'), 'utf8')); fs.writeFileSync(path.join(os.tmpdir(), '_cinema.js'), fs.readFileSync(path.join(root, 'functions/_cinema.js'), 'utf8'));
import(url.pathToFileURL(tmp).href).then(async X => {
  ok(X.cleanPublicBase('https://video.example.com/') === 'https://video.example.com' && X.cleanPublicBase('http://x.com') === '' && X.cleanPublicBase('javascript:alert(1)') === '' && X.cleanPublicBase('') === '', '기본 주소 검증(https 만)');
  ok(X.publicUrl('https://v.example.com', '/api/clipfile?k=ab12cd.mp4') === 'https://v.example.com/ab12cd.mp4', '/api/clipfile?k= → 공개 주소');
  const c = X.publicizeClip('https://v.example.com', { videoUrl: '/api/clipfile?k=a1.mp4', posterUrl: '/api/clipfile?k=p1.webp', guardianImageUrl: '/api/clipfile?k=g.png', title: 't' });
  ok(c.videoUrl === 'https://v.example.com/a1.mp4' && c.posterUrl === 'https://v.example.com/p1.webp' && c.title === 't', '클립 필드 일괄 변환');
  ok(X.cleanAwakening({ dayPillar: '경오', gender: 'F' }).dayPillar === '경오' && X.cleanAwakening({ dayPillar: '경축', gender: 'F' }) === null && !('guardianImageUrl' in X.cleanAwakening({ dayPillar: '경오', gender: 'F', guardianImageUrl: '/api/clipfile?k=g.png' })), '일주 검증(60갑자) 유지 · 수호신 이미지 필드 없음');

  const awk = fs.readFileSync(path.join(root, 'functions/api/awakening.js'), 'utf8').replace("from '../_lib.js'", "from './_lib_stub.mjs'").replace("from '../_media.js'", "from './_media_real.mjs'");
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'awk-')); fs.writeFileSync(path.join(dir, 'a.mjs'), awk); fs.writeFileSync(path.join(dir, '_media_real.mjs'), fs.readFileSync(tmp, 'utf8')); fs.writeFileSync(path.join(dir, '_cinema.js'), fs.readFileSync(path.join(root, 'functions/_cinema.js'), 'utf8'));
  let admin = true;
  fs.writeFileSync(path.join(dir, '_lib_stub.mjs'), "export const json=(o,s=200)=>new Response(JSON.stringify(o),{status:s,headers:{'content-type':'application/json'}});export const isAdmin=()=>globalThis.__admin!==false;export const configError=()=>null;");
  const A = await import(url.pathToFileURL(path.join(dir, 'a.mjs')).href);
  const guardianVideos = [{ dayPillar: '갑자', gender: 'M', videoUrl: '/api/clipfile?k=aa11.mp4', posterUrl: '/api/clipfile?k=pp11.webp', guardianImageUrl: '/api/clipfile?k=gg11.png', title: '숲의 왕', enabled: true }];
  const doc = { videos: JSON.parse(JSON.stringify(guardianVideos)), ilgan: [{ stem: '갑', gender: 'M', videoUrl: '/api/clipfile?k=ig1.mp4', posterUrl: '/api/clipfile?k=ip1.webp', title: '', enabled: true }], fallback: { videoUrl: '/api/clipfile?k=fb.mp4' }, publicBase: '' };
  const env = { GLOSSARY_KV: { get: async () => JSON.parse(JSON.stringify(doc)), put: async (k, v) => { Object.keys(doc).forEach(x => delete doc[x]); Object.assign(doc, JSON.parse(v)); } } };
  const get = async (q, adm) => { globalThis.__admin = adm !== false; return (await A.onRequestGet({ request: new Request('https://x.dev/api/awakening' + q), env })).json(); };
  const put = async b => { globalThis.__admin = true; return (await A.onRequestPut({ request: new Request('https://x.dev/api/awakening', { method: 'PUT', body: JSON.stringify(b) }), env })).json(); };

  let d = await get('?pillar=갑자&gender=M');
  ok(d.video && d.video.videoUrl === '/api/clipfile?k=aa11.mp4' && d.video.title === '숲의 왕' && !('guardianImageUrl' in d.video), '공개: 그 일주·성별의 캐릭터 영상');
  ok(d.ilgan && d.ilgan.videoUrl === '/api/clipfile?k=ig1.mp4', '공개: 그 일간의 소개 영상');
  d = await get('?pillar=을축&gender=F'); ok(d.video === null && d.fallback && d.fallback.videoUrl === '/api/clipfile?k=fb.mp4', '일주 영상이 없으면 기본(fallback) 영상');
  d = await get('?all=1', false); ok(d.error, '관리자 목록은 인증 필요');
  d = await get('?all=1'); ok(d.videos.length === 1 && d.ilgan.length === 1, '관리자 목록: 120개 영상 + 일간 소개');
  await put({ videos: doc.videos, ilgan: doc.ilgan, fallback: doc.fallback, publicBase: 'https://video.example.com/' });
  ok(doc.publicBase === 'https://video.example.com' && doc.videos.length === 1 && doc.videos[0].dayPillar === '갑자', '저장: 공개 주소 + 일주 영상 유지');
  d = await get('?pillar=갑자&gender=M'); ok(d.video.videoUrl === 'https://video.example.com/aa11.mp4' && d.video.posterUrl === 'https://video.example.com/pp11.webp' && d.ilgan.videoUrl === 'https://video.example.com/ig1.mp4', '공개 조회: R2 공개 주소로 변환');
  await put({ videos: doc.videos, ilgan: doc.ilgan }); ok(doc.publicBase === 'https://video.example.com', '주소를 안 보낸 저장은 기존 값 유지');
  await put({ videos: doc.videos, ilgan: doc.ilgan, publicBase: 'http://insecure.com' }); ok(doc.publicBase === '', 'https 가 아니면 저장 안 됨');
  await put({ videos: [{ dayPillar: '을축', gender: 'F', videoUrl: '/api/clipfile?k=zz.mp4' }, { dayPillar: '경축', gender: 'F', videoUrl: '/api/clipfile?k=bad.mp4' }], ilgan: [] });
  ok(doc.videos.length === 1 && doc.videos[0].dayPillar === '을축', '잘못된 일주(경축)는 저장에서 거부');

  console.log('N. 일간·일주 문구 검사(기토 영상에 경금 문구가 붙은 경우)');
  {
    const vm = require('vm'); globalThis.window = globalThis; ['media', 'intro-text'].forEach(f => vm.runInThisContext(fs.readFileSync(path.join(root, 'report/v2', f + '.js'), 'utf8'), { filename: f + '.js' }));
    const M = globalThis.ReportV2.Media, IT = globalThis.ReportV2.IntroText;
    ok(M.ilganTextMismatch('기', '당신은 경금, 단단하게 벼려진 바위와 강철입니다.') === '경금', '기토 항목에 경금 문구 → 어긋남');
    ok(M.ilganTextMismatch('기', '당신은 기토, 무엇이든 키워 내는 논밭의 흙입니다.') === '', '자기 일간 문구는 통과');
    ok(M.ilganTextMismatch('기', '庚金의 기운') === '경금' && M.ilganTextMismatch('기', '己土의 기운') === '', '한자 표기도 검사');
    ok(M.ilganTextMismatch('기', '마음을 정화하는 시간') === '', '정화(淨化) 같은 일반 단어는 일간으로 보지 않는다');
    ok(M.ilganTextMismatch('기', '기토와 경금이 만나면') === '', '자기 일간이 함께 나오면 비교 문장으로 보고 통과');
    ok(M.ilganTextMismatch('기', '') === '' && M.ilganTextMismatch('기', '제목 없음') === '', '일간 이름이 없는 문구는 통과');
    ok(M.ijuTextMismatch('기사', '초여름 햇살 곁의 논밭, 경진일주입니다') === '경진일주' && M.ijuTextMismatch('기사', '기사일주입니다') === '', '일주 문구 검사');
    ok(IT.ilganTitle('기') === '기토 · 己土' && IT.ilganTitle('경') === '경금 · 庚金' && IT.ilganTitle('계') === '계수 · 癸水', '기본 제목: 이름 · 한자');
    '갑을병정무기경신임계'.split('').forEach(s => { const t = IT.ilganTitle(s) + ' ' + IT.ilgan(s).join(' '); ok(M.ilganTextMismatch(s, t) === '', '기본 문구는 자기 일간으로 통과: ' + s); });
  }

  console.log(fails.length ? '\n실패 ' + fails.length + '건\n' + fails.map(f => ' ✗ ' + f).join('\n') : '\n모두 통과');
  process.exit(fails.length ? 1 : 0);
});
