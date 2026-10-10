// 로컬 확인용: 정적 파일 서버 + 모의 API (KV·R2 없이 메모리에 저장, 서버를 끄면 사라짐). 관리자 비밀번호는 "test"
const http = require('http'), fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..');
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css', '.json': 'application/json' };
let awkExtra = { fallback: null, publicBase: '', textOnly: false }, rc = null, mediaList = [], awk = [], ilg = [], story = null, intro = { on: false, src: null, srcMobile: null, skipAfter: 0, once: 'session' }, clips = [], defaults = {}, chapters = null, folders = [], files = {};
const ikMem = new Map(), ikEnv = { ADMIN_PASSWORD: 'test', GLOSSARY_KV: { get: async (k, t) => { const v = ikMem.get(k); return v == null ? null : t === 'json' ? JSON.parse(v) : v; }, put: async (k, v) => { ikMem.set(k, v); } } };
// 로컬 확인용 가짜 AI(Anthropic): 구간의 첫 긴 문장을 원문 인용으로 삼아 키워드로 조건을 읽어 후보 1개를 돌려준다
const r2mem = new Map(); ikEnv.ANTHROPIC_API_KEY = 'mock'; ikEnv.CLIPS_R2 = { put: async (k, v) => { r2mem.set(k, Buffer.from(v)); }, get: async k => (r2mem.has(k) ? { body: r2mem.get(k), httpMetadata: { contentType: 'application/pdf' } } : null), delete: async k => { r2mem.delete(k); } };
const realFetch = global.fetch;
global.fetch = async (u, o) => {
  if (String(u).includes('api.openai.com/v1/images')) { // 로컬 확인용 가짜 이미지 생성: 색만 다른 작은 PNG
    const c = [[120, 90, 60], [60, 110, 140], [140, 70, 90], [70, 130, 90]][Math.floor(Math.random() * 4)], zlib = require('zlib'), W = 64, Hh = 96, raw = Buffer.alloc((W * 3 + 1) * Hh); for (let y = 0; y < Hh; y++) { raw[y * (W * 3 + 1)] = 0; for (let x = 0; x < W; x++) { const k = y * (W * 3 + 1) + 1 + x * 3, f = 0.4 + 0.6 * y / Hh; raw[k] = c[0] * f; raw[k + 1] = c[1] * f; raw[k + 2] = c[2] * f; } }
    const crc = b => { let t = ~0; for (const x of b) { t ^= x; for (let i = 0; i < 8; i++) t = (t >>> 1) ^ (0xEDB88320 & -(t & 1)); } return ~t >>> 0; }, chunk = (t, d) => { const l = Buffer.alloc(4); l.writeUInt32BE(d.length); const td = Buffer.concat([Buffer.from(t), d]), cc = Buffer.alloc(4); cc.writeUInt32BE(crc(td)); return Buffer.concat([l, td, cc]); }, ih = Buffer.alloc(13); ih.writeUInt32BE(W, 0); ih.writeUInt32BE(Hh, 4); ih[8] = 8; ih[9] = 2;
    const png = Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ih), chunk('IDAT', zlib.deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]); return new Response(JSON.stringify({ data: [{ b64_json: png.toString('base64') }] }), { status: 200 });
  }
  if (!String(u).includes('api.anthropic.com')) return realFetch(u, o);
  const msg = JSON.parse(o.body).messages[0].content, body = (msg.split('[원문]\n')[1] || '').split('[원문 끝]')[0], sents = body.replace(/^#.*$/gm, '').split(/(?<=[.다])\s+/).map(x => x.trim()).filter(x => x.length >= 20 && !/^\[\d+쪽\]/.test(x) && !/^#/.test(x)), claim = sents[0];
  const cands = []; if (claim && /경금|庚|신약|身弱|관살|官殺|재성|비겁|인성/.test(claim)) { const c = {}; if (/경금|庚/.test(claim)) c.dayMaster = ['경']; if (/신약|身弱/.test(claim)) c.strength = ['신약']; else if (/신강|身強/.test(claim)) c.strength = ['신강']; const g = {}; if (/관살|官殺|관성/.test(claim)) g['관성'] = 'strong'; if (/재성.*약|재성이 약/.test(claim)) g['재성'] = 'weak'; if (Object.keys(g).length) c.group = g;
    cands.push({ sourceClaim: claim.slice(0, 380), title: (c.dayMaster ? '경금 ' : '') + (c.strength ? c.strength[0] + ' ' : '') + (g['관성'] ? '관성 강' : g['재성'] ? '재성 약' : '해석'), domains: g['재성'] ? ['MONEY'] : ['CAREER', 'SELF'], subDomain: g['재성'] ? 'moneyStructure' : 'aptitude', stance: 'caution', conditions: c, principle: '원문의 핵심 주장을 요약한 원리입니다.', interpretation: '자신의 여유보다 외부 요구나 책임이 크게 느껴질 수 있는 구조로 읽을 수 있습니다.', behaviorPatterns: ['업무량이 늘 때 쉬는 시간이 줄어드는 장면이 반복될 수 있습니다.'], strengths: ['책임을 끝까지 지려는 힘이 있습니다.'], risks: ['피로가 쌓이기 쉽습니다.'], actions: ['맡은 일의 범위를 먼저 정리해 보세요.'], realWorldExamples: { worker: '성과 압박이 큰 팀에서 특히 크게 느껴질 수 있습니다.' }, modifiers: /인성/.test(body) ? [{ when: { group: { 인성: 'strong' } }, effect: 'soften', text: '인성이 받쳐 주면 부담이 완화됩니다.' }] : [], theoryTags: ['억부'], extractionConfidence: 'HIGH', ambiguity: [] }); }
  return new Response(JSON.stringify({ content: [{ type: 'text', text: JSON.stringify({ candidates: cands }) }], model: 'mock' }), { status: 200 });
};
const send = (r, code, obj) => { r.statusCode = code; r.setHeader('content-type', 'application/json; charset=utf-8'); r.end(JSON.stringify(obj)); };
const authed = q => (q.headers.authorization || '') === 'Bearer test';
const body = q => new Promise(res => { const b = []; q.on('data', c => b.push(c)); q.on('end', () => res(Buffer.concat(b))); });

http.createServer(async (q, r) => {
  const u = new URL(q.url, 'http://x'), p = u.pathname;
  if (p === '/api/src') { // 실제 functions/api/src.js 를 메모리 KV 로 실행(AI 는 위의 가짜)
    const mod = await import(require('url').pathToFileURL(path.join(root, 'functions/api/src.js')).href), buf = q.method === 'POST' ? await body(q) : undefined;
    const res = await mod.onRequest({ env: ikEnv, request: new Request('http://x' + q.url, { method: q.method, headers: { authorization: q.headers.authorization || '', 'content-type': q.headers['content-type'] || 'application/json' }, body: buf }) });
    r.statusCode = res.status; const ct = res.headers.get('content-type') || 'application/json'; r.setHeader('content-type', ct); return r.end(Buffer.from(await res.arrayBuffer()));
  }
  const IMG = { '/api/assets': 'assets', '/api/asset-art': 'asset-art', '/api/panel-art': 'panel-art', '/api/tarot-art': 'tarot-art' };
  if (IMG[p]) { // 이미지 생성 API 4종을 메모리 KV·R2 로 실행(가짜 이미지 모델)
    ikEnv.OPENAI_API_KEY = 'mock'; const mod = await import(require('url').pathToFileURL(path.join(root, 'functions/api/' + IMG[p] + '.js')).href), fn = mod['onRequest' + q.method[0] + q.method.slice(1).toLowerCase()], buf = /^(POST|PUT)$/.test(q.method) ? await body(q) : undefined;
    if (!fn) return send(r, 405, { error: 'method' }); const res = await fn({ env: ikEnv, request: new Request('http://x' + q.url, { method: q.method, headers: { authorization: q.headers.authorization || '', 'content-type': 'application/json' }, body: buf }) });
    r.statusCode = res.status; r.setHeader('content-type', 'application/json; charset=utf-8'); return r.end(await res.text());
  }
  if (p === '/api/worlds') { // 실제 functions/api/worlds.js 를 메모리 KV 로 실행(세계관 관리자 탭 확인용)
    const mod = await import(require('url').pathToFileURL(path.join(root, 'functions/api/worlds.js')).href), buf = q.method === 'PUT' ? await body(q) : undefined;
    const res = await (q.method === 'PUT' ? mod.onRequestPut : mod.onRequestGet)({ env: ikEnv, request: new Request('http://x' + q.url, { method: q.method, headers: { authorization: q.headers.authorization || '', 'content-type': 'application/json' }, body: buf }) });
    r.statusCode = res.status; r.setHeader('content-type', 'application/json; charset=utf-8'); return r.end(await res.text());
  }
  if (p === '/api/free-content') { // 실제 functions/api/free-content.js 를 메모리 KV 로 실행
    const mod = await import(require('url').pathToFileURL(path.join(root, 'functions/api/free-content.js')).href), buf = q.method === 'PUT' ? await body(q) : undefined;
    const res = await (q.method === 'PUT' ? mod.onRequestPut : mod.onRequestGet)({ env: ikEnv, request: new Request('http://x' + q.url, { method: q.method, headers: { authorization: q.headers.authorization || '', 'content-type': 'application/json' }, body: buf }) });
    r.statusCode = res.status; r.setHeader('content-type', 'application/json; charset=utf-8'); return r.end(await res.text());
  }
  if (p === '/api/ik') { // 실제 functions/api/ik.js 를 메모리 KV 로 실행 (AI 키 없음 → 규칙 기반 합성)
    const mod = await import(require('url').pathToFileURL(path.join(root, 'functions/api/ik.js')).href), buf = q.method === 'POST' ? await body(q) : undefined;
    const res = await mod.onRequest({ env: ikEnv, request: new Request('http://x' + q.url, { method: q.method, headers: { authorization: q.headers.authorization || '', 'content-type': 'application/json' }, body: buf }) });
    r.statusCode = res.status; r.setHeader('content-type', 'application/json; charset=utf-8'); return r.end(await res.text());
  }
  if (p === '/api/waitlist' && q.method === 'POST') { await body(q); return send(r, 200, { ok: true }); }
  if (p === '/api/admin') return authed(q) ? send(r, 200, { ok: true }) : send(r, 401, { error: '비밀번호가 맞지 않습니다' });
  if (p === '/api/clips') {
    if (u.searchParams.get('public')) { const cs = chapters || [['ch0', 'a']].map(([id, name]) => ({ id, name })); return send(r, 200, { chapters: cs, folders, clips: clips.filter(c => c.src).map(c => ({ id: c.id, chapter: c.chapter, folder: c.folder, priority: c.priority, cond: c.cond, url: c.src.type === 'r2' ? '/api/clipfile?k=' + encodeURIComponent(c.src.value) : c.src.value, caption: c.caption })) }); }
    if (!authed(q)) return send(r, 401, { error: '관리자 인증이 필요합니다' });
    if (q.method === 'GET') return send(r, 200, { clips, defaults, chapters: chapters || [['ch0', '序 일주의 각성'], ['ch1', '一 타고난 성정'], ['ch2', '二 인생의 길'], ['ch3', '三 인연의 장'], ['ch4', '四 재물의 장'], ['ch5', '五 도약의 장'], ['ch6', '六 가족의 장'], ['ch7', '七 앞으로 십 년의 문'], ['ch8', '終 개운 종합 카드']].map(([id, name]) => ({ id, name })), folders, r2: true });
    if (q.method === 'PUT') { const b = JSON.parse((await body(q)).toString()); clips = b.clips; defaults = b.defaults || {}; chapters = b.chapters || chapters; folders = b.folders || folders; return send(r, 200, { ok: true, count: clips.length }); }
  }
  // 모의 일레븐랩스: 1.2초 무음 WAV를 mp3 키로 돌려준다 (실제 API는 호출하지 않음)
  if (p === '/api/ai') {
    if (!authed(q)) return send(r, 401, { error: '관리자 인증이 필요합니다' });
    const b = JSON.parse((await body(q)).toString());
    if ((b.task === 'split' || b.task === 'draft' || b.task === 'expand') && !b.text) return send(r, 400, { error: '나눌 문장이 비어 있습니다' });
    const lines = b.task === 'polish' ? (b.lines || []).map(l => l + ' (다듬음)') : (b.task === 'split' || b.task === 'draft' || b.task === 'expand') ? String(b.text).split(/[.!?]\s*/).filter(Boolean) : ['(모의) ' + (b.title || '제목') + ' — ' + Object.entries(b.cond || {}).map(([k, v]) => k + ' ' + v).join(', '), '고요한 숲 한가운데 서 있는 나무처럼', '당신은 쉽게 흔들리지 않는 사람이에요', '그런데 왜 가끔은 홀로 서 있는 기분일까요?'].slice(0, b.n || 4);
    const fb = /폴백/.test(b.tone || '');
    return send(r, 200, { ok: true, provider: fb ? 'openai' : 'anthropic', model: fb ? 'gpt-6.1-sol' : 'claude-sonnet-5-5', lines, attempts: fb ? [{ provider: 'anthropic', ok: false, error: 'anthropic 오류 529: Overloaded' }, { provider: 'openai', ok: true }] : [{ provider: 'anthropic', ok: true }] });
  }
  if (p === '/api/tts') {
    if (!authed(q)) return send(r, 401, { error: '관리자 인증이 필요합니다' });
    if (q.method === 'GET' && u.searchParams.get('status')) return send(r, 200, { eleven: true, openai: true, r2: true });
    if (q.method === 'GET') return send(r, 200, { voices: [{ id: 'KoVoice00000001', name: '모의 한국어 목소리', category: 'premade', labels: {}, preview: '', ko: true }, { id: 'EnVoice00000002', name: 'Mock English', category: 'premade', labels: {}, preview: '', ko: false }] });
    const b = JSON.parse((await body(q)).toString()); if (!(b.provider === 'openai' ? b.voice : b.voiceId)) return send(r, 400, { error: '목소리를 선택하세요' });
    const n = 1.2 * 8000, buf = Buffer.alloc(44 + n); buf.write('RIFF', 0); buf.writeUInt32LE(36 + n, 4); buf.write('WAVEfmt ', 8); buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20); buf.writeUInt16LE(1, 22); buf.writeUInt32LE(8000, 24); buf.writeUInt32LE(8000, 28); buf.writeUInt16LE(1, 32); buf.writeUInt16LE(8, 34); buf.write('data', 36); buf.writeUInt32LE(n, 40); buf.fill(128, 44);
    const key = 'tts-mock' + Date.now().toString(36) + '.mp3'; files[key] = buf; return send(r, 200, { ok: true, key, cached: false });
  }
  if (p === '/api/report-content') {
    if (q.method === 'GET') return send(r, 200, { content: rc });
    if (!authed(q)) return send(r, 401, { error: '관리자 인증이 필요합니다' });
    if (q.method === 'PUT') { rc = { ...(rc || {}), ...JSON.parse((await body(q)).toString()), version: 'c' + Date.now().toString(36) }; return send(r, 200, { ok: true, version: rc.version }); }
  }
  if (p === '/api/media') { // 모의: 메모리 저장. AI 태그 추천은 고정 응답
    if (q.method === 'GET') return send(r, 200, { media: authed(q) && u.searchParams.get('all') ? mediaList : mediaList.filter(m => m.enabled && m.tagsApproved) });
    if (!authed(q)) return send(r, 401, { error: '관리자 인증이 필요합니다' });
    if (q.method === 'PUT') { mediaList = JSON.parse((await body(q)).toString()).media; return send(r, 200, { ok: true, count: mediaList.length }); }
    if (q.method === 'POST') { await body(q); return send(r, 200, { ok: true, suggestion: { elementTags: ['wood'], stateTags: ['growth', 'recovery'], emotionTags: ['calm', 'hopeful'], sceneTags: ['forest', 'mist'], themeTags: ['personality'], actionTags: [], visualRole: ['hero'], chapterTags: ['personality'], description: '(모의) 안개 낀 숲. 성장과 회복의 표현에 어울립니다.' } }); }
  }
  if (p === '/api/awakening') {
    if (q.method === 'GET') { if (u.searchParams.get('all')) return authed(q) ? send(r, 200, { videos: awk, ilgan: ilg, ...awkExtra }) : send(r, 401, { error: '관리자 인증이 필요합니다' }); const pl = u.searchParams.get('pillar') || '', gd = u.searchParams.get('gender'); return send(r, 200, { video: awk.find(v => v.dayPillar === pl && v.gender === gd) || null, ilgan: ilg.find(v => v.stem === pl[0] && v.gender === gd) || null, fallback: null, textOnly: awkExtra.textOnly }); }
    if (!authed(q)) return send(r, 401, { error: '관리자 인증이 필요합니다' });
    if (q.method === 'PUT') { const b = JSON.parse((await body(q)).toString()); awk = b.videos; ilg = b.ilgan || []; for (const k of ['fallback', 'publicBase', 'textOnly']) if (k in b) awkExtra[k] = b[k]; return send(r, 200, { ok: true, count: awk.length, ilgan: ilg.length }); }
  }
  if (p === '/api/story') {
    if (q.method === 'GET') return send(r, 200, { story });
    if (!authed(q)) return send(r, 401, { error: '관리자 인증이 필요합니다' });
    if (q.method === 'PUT') { story = JSON.parse((await body(q)).toString()).story; return send(r, 200, { ok: true }); }
    if (q.method === 'DELETE') { story = null; return send(r, 200, { ok: true }); }
  }
  if (p === '/api/intro') {
    const u1 = x => !x ? '' : x.type === 'r2' ? '/api/clipfile?k=' + encodeURIComponent(x.value) : x.value, urlOf = c => ({ url: u1(c.src), urlMobile: u1(c.srcMobile) });
    if (q.method === 'PUT') { if (!authed(q)) return send(r, 401, { error: '관리자 인증이 필요합니다' }); const b = JSON.parse((await body(q)).toString()); if (b.on && !b.src && !b.srcMobile) return send(r, 400, { error: '영상을 올리거나 주소를 입력한 뒤 켜세요' }); intro = { on: !!b.on, src: b.src || null, srcMobile: b.srcMobile || null, fx: b.fx || {}, fxPc: b.fxPc || {}, fxMobile: b.fxMobile || {}, skipAfter: +b.skipAfter || 0, once: b.once === 'always' ? 'always' : 'session' }; return send(r, 200, { ok: true, ...intro, ...urlOf(intro) }); }
    if (!authed(q) && (!intro.on || !(intro.src || intro.srcMobile))) return send(r, 200, { on: false });
    return send(r, 200, { ...intro, ...urlOf(intro) });
  }
  if (p === '/api/clipfile') {
    if (q.method === 'POST') {
      if (!authed(q)) return send(r, 401, { error: '관리자 인증이 필요합니다' });
      const key = 'm' + Date.now().toString(36) + '.' + (u.searchParams.get('name') || 'x.mp4').split('.').pop();
      files[key] = await body(q); return send(r, 200, { ok: true, key });
    }
    const f = files[u.searchParams.get('k')] || r2mem.get(u.searchParams.get('k')); if (!f) { r.statusCode = 404; return r.end('nf'); }
    const kk = u.searchParams.get('k') || ''; if (/.(wav|mp3|ogg|m4a)$/.test(kk)) { r.setHeader('content-type', kk.endsWith('.wav') ? 'audio/wav' : 'audio/mpeg'); return r.end(f); }
    r.setHeader('content-type', /.(webp|png|jpe?g|gif)$/.test(u.searchParams.get('k')||'') ? 'image/' + (u.searchParams.get('k').split('.').pop().replace('jpg','jpeg')) : 'video/mp4'); return r.end(f);
  }
  let rel = decodeURIComponent(p); if (rel.endsWith('/')) rel += 'index.html';
  const f = path.join(root, rel);
  if (!f.startsWith(root) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.statusCode = 404; return r.end('404'); }
  r.setHeader('content-type', TYPES[path.extname(f)] || 'application/octet-stream'); r.end(fs.readFileSync(f));
}).listen(process.env.PORT || 8766);
