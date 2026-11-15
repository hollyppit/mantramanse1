// 신년운세 화면 꾸미기(배경·프롤로그·패널) 저장·공개 검증:  node tests/newyear-look-sim.mjs
import assert from 'assert';
import fs from 'fs';
import vm from 'vm';
const N = await import(new URL('../functions/_newyear.js', import.meta.url));
const m = N.cleanMedia({ bg: '/api/clipfile?k=a.webp', proImage: 'javascript:alert(1)', proVideo: 'https://cdn.example.com/p.mp4', proSec: 99, panels: false, proOn: false });
assert.equal(m.bg, '/api/clipfile?k=a.webp'); assert.equal(m.proImage, ''); assert.equal(m.proVideo, 'https://cdn.example.com/p.mp4'); assert.equal(m.proSec, 6); assert.equal(m.panels, false); assert.equal(m.proOn, false);
const d = N.cleanMedia(null); assert.equal(d.panels, true); assert.equal(d.proOn, true); assert.equal(d.proSec, 6);
const c = N.cleanNewyearConfig({ years: { 2027: { visibility: 'free', media: { bgMobile: '/api/clipfile?k=m.webp', proSec: 4 } } } }).years[2027];
assert.equal(c.media.bgMobile, '/api/clipfile?k=m.webp'); assert.equal(c.media.proSec, 4); assert.equal(c.visibility, 'free');
assert.equal(N.yearConfig({ years: {} }, 2030).media.panels, true, '설정 없는 해도 기본 꾸미기');
// 공개 API: 연도 검사·값 정리
const kv = new Map([['newyear:config', JSON.stringify({ years: { 2027: { visibility: 'closed', media: { bg: '/api/clipfile?k=b.webp', proImage: 'data:x' } } } })]]);
const env = { GLOSSARY_KV: { get: async (k, t) => { const v = kv.get(k); return v == null ? null : t === 'json' ? JSON.parse(v) : v; } } };
const look = await import(new URL('../functions/api/newyear/look.js', import.meta.url));
const r1 = await (await look.onRequestGet({ env, request: new Request('https://t/api/newyear/look?year=2027') })).json();
assert.equal(r1.ok, true); assert.equal(r1.media.bg, '/api/clipfile?k=b.webp'); assert.equal(r1.media.proImage, '');
assert.equal((await look.onRequestGet({ env, request: new Request('https://t/api/newyear/look?year=1999') })).status, 404);
// 화면: 패널 고르기(일간 오행·성별·주제, 한 풀이 안에서 겹치지 않음·장 다시 열어도 같은 그림)
const src = fs.readFileSync(new URL('../report/newyear/newyear-look.js', import.meta.url), 'utf8'), ctx = { window: {}, fetch: async () => ({ ok: true, json: async () => ({ media: [
  { id: 'panel-fire-sewoon', url: '/f1' }, { id: 'panel-fire-sewoon-F', url: '/f1F' }, { id: 'panel-earth-sewoon', url: '/e1' }, { id: 'panel-fire-wealth-M', url: '/fwM' }, { id: 'panel-water-wealth', url: '/ww' }, { id: 'panelbg-fire-sewoon', url: '/bg' }, { id: 'panel-fire-daewoon', url: '/fd' }] }) }) };
ctx.window = ctx; vm.runInNewContext(src, ctx);
const L = ctx.NewyearLook; L._state.media = { panels: true }; L.setPerson('丁', 'F'); await L.loadPanels();
const h1 = L.panelHtml('total', 0), h2 = L.panelHtml('total', 1), h1b = L.panelHtml('total', 0), hw = L.panelHtml('wealth', 0);
assert(/\/(f1F|e1)"/.test(h1), '총운 첫 칸: 올해 흐름 주제, 여성에게는 남녀 공용보다 여성 그림 먼저 ' + h1); assert(h2.includes('src=') && h2 !== h1, '두 번째 칸은 다른 그림 ' + h2); assert.equal(h1, h1b, '다시 열어도 같은 그림');
assert(hw.includes('/ww'), '남성 전용 그림은 여성에게 안 씀 → 다른 오행 재물 ' + hw); assert(!L.panelHtml('love', 0), '맞는 그림 없으면 빈 칸');
L._state.media = { panels: false }; L.resetUsed(); assert.equal(L.panelHtml('total', 0), '', '관리자가 끄면 안 넣음');
const app = fs.readFileSync(new URL('../report/newyear/newyear-app.js', import.meta.url), 'utf8'), idx = fs.readFileSync(new URL('../report/newyear/index.html', import.meta.url), 'utf8');
assert(app.includes('root.NewyearLook.boot(YEAR)') && app.includes('panel(ch, 0)') && idx.indexOf('newyear-look.js') < idx.indexOf('newyear-app.js'));
console.log('newyear-look-sim PASS: 꾸미기 값 정리·공개 API·패널 고르기(오행·성별·겹침 없음·같은 그림 유지·끄기)·화면 연결');
