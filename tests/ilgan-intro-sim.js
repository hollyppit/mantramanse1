// 캐릭터 소개(일간 소개) 영상 API · 수호신 영상 보존(DEPRECATED_GUARDIAN) · 공개 영상 주소 검증:  node tests/ilgan-intro-sim.js
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
  ok(typeof X.cleanAwakening === 'undefined', '일주 각성(수호신) 검증 함수 제거');

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
  ok(d.ilgan && d.ilgan.videoUrl === '/api/clipfile?k=ig1.mp4', '공개: 그 일간 소개 영상');
  ok(!('video' in d) && !('fallback' in d), '공개: 수호신 영상(video)·fallback 은 절대 내려가지 않음');
  d = await get('?pillar=갑오&gender=M'); ok(d.ilgan && d.ilgan.stem === '갑', '일주(갑오)로 물어도 일간(갑)으로 매칭');
  d = await get('?pillar=을축&gender=F'); ok(d.ilgan === null, '영상 없는 일간은 null (캐릭터 소개 단계 건너뜀)');
  d = await get('?all=1', false); ok(d.error, '관리자 목록은 인증 필요');
  d = await get('?all=1'); ok(Array.isArray(d.ilgan) && !('videos' in d) && d.deprecatedGuardian === 1, '관리자 목록: 수호신 영상 숨김 + 보존 개수만 표시');
  d = await get('?all=1&deprecated=1'); ok(d.state === 'DEPRECATED_GUARDIAN' && d.videos.length === 1, '명시적으로 요청할 때만 보존본 열람');

  await put({ ilgan: doc.ilgan, publicBase: 'https://video.example.com/' });
  ok(doc.publicBase === 'https://video.example.com', '공개 주소 저장');
  ok(doc.videos.length === 1 && doc.videos[0].guardianImageUrl === '/api/clipfile?k=gg11.png' && doc.fallback, '저장해도 보존 중인 수호신 영상은 그대로(롤백 가능)');
  d = await get('?pillar=갑자&gender=M'); ok(d.ilgan.videoUrl === 'https://video.example.com/ig1.mp4' && d.ilgan.posterUrl === 'https://video.example.com/ip1.webp', '공개 조회: R2 공개 주소로 변환');
  await put({ ilgan: doc.ilgan }); ok(doc.publicBase === 'https://video.example.com', '주소를 안 보낸 저장은 기존 값 유지');
  await put({ ilgan: doc.ilgan, publicBase: 'http://insecure.com' }); ok(doc.publicBase === '', 'https 가 아니면 저장 안 됨');
  await put({ videos: [{ dayPillar: '을축', gender: 'F', videoUrl: '/api/clipfile?k=zz.mp4' }], ilgan: [] });
  ok(doc.videos.length === 1 && doc.videos[0].dayPillar === '갑자', '요청에 videos 를 실어 보내도 보존본을 덮어쓰지 않음');

  console.log(fails.length ? '\n실패 ' + fails.length + '건\n' + fails.map(f => ' ✗ ' + f).join('\n') : '\n모두 통과');
  process.exit(fails.length ? 1 : 0);
});
