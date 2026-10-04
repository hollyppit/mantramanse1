// 로컬 확인용: 정적 파일 서버 + 모의 API (KV·R2 없이 메모리에 저장, 서버를 끄면 사라짐). 관리자 비밀번호는 "test"
const http = require('http'), fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..');
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css', '.json': 'application/json' };
let home = null, intro = { on: false, src: null, srcMobile: null, skipAfter: 0, once: 'session' }, clips = [], defaults = {}, chapters = null, folders = [], files = {};
const send = (r, code, obj) => { r.statusCode = code; r.setHeader('content-type', 'application/json; charset=utf-8'); r.end(JSON.stringify(obj)); };
const authed = q => (q.headers.authorization || '') === 'Bearer test';
const body = q => new Promise(res => { const b = []; q.on('data', c => b.push(c)); q.on('end', () => res(Buffer.concat(b))); });

http.createServer(async (q, r) => {
  const u = new URL(q.url, 'http://x'), p = u.pathname;
  if (p === '/api/waitlist' && q.method === 'POST') { await body(q); return send(r, 200, { ok: true }); }
  if (p === '/api/admin') return authed(q) ? send(r, 200, { ok: true }) : send(r, 401, { error: '비밀번호가 맞지 않습니다' });
  if (p === '/api/clips') {
    if (!authed(q)) return send(r, 401, { error: '관리자 인증이 필요합니다' });
    if (q.method === 'GET') return send(r, 200, { clips, defaults, chapters: chapters || [['ch0', '序 일주의 각성'], ['ch1', '一 타고난 성정'], ['ch2', '二 인생의 길'], ['ch3', '三 인연의 장'], ['ch4', '四 재물의 장'], ['ch5', '五 도약의 장'], ['ch6', '六 가족의 장'], ['ch7', '七 앞으로 십 년의 문'], ['ch8', '終 개운 종합 카드']].map(([id, name]) => ({ id, name })), folders, r2: true });
    if (q.method === 'PUT') { const b = JSON.parse((await body(q)).toString()); clips = b.clips; defaults = b.defaults || {}; chapters = b.chapters || chapters; folders = b.folders || folders; return send(r, 200, { ok: true, count: clips.length }); }
  }
  // 모의 일레븐랩스: 1.2초 무음 WAV를 mp3 키로 돌려준다 (실제 API는 호출하지 않음)
  if (p === '/api/ai') {
    if (!authed(q)) return send(r, 401, { error: '관리자 인증이 필요합니다' });
    const b = JSON.parse((await body(q)).toString());
    if ((b.task === 'split' || b.task === 'draft') && !b.text) return send(r, 400, { error: '나눌 문장이 비어 있습니다' });
    const lines = b.task === 'polish' ? (b.lines || []).map(l => l + ' (다듬음)') : (b.task === 'split' || b.task === 'draft') ? String(b.text).split(/[.!?]\s*/).filter(Boolean) : ['(모의) ' + (b.title || '제목') + ' — ' + Object.entries(b.cond || {}).map(([k, v]) => k + ' ' + v).join(', '), '고요한 숲 한가운데 서 있는 나무처럼', '당신은 쉽게 흔들리지 않는 사람이에요', '그런데 왜 가끔은 홀로 서 있는 기분일까요?'].slice(0, b.n || 4);
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
  if (p === '/api/home') {
    if (q.method === 'GET') return send(r, 200, { home });
    if (!authed(q)) return send(r, 401, { error: '관리자 인증이 필요합니다' });
    if (q.method === 'PUT') { home = JSON.parse((await body(q)).toString()).home; return send(r, 200, { ok: true }); }
    if (q.method === 'DELETE') { home = null; return send(r, 200, { ok: true }); }
  }
  if (p === '/api/intro') {
    const u1 = x => !x ? '' : x.type === 'r2' ? '/api/clipfile?k=' + encodeURIComponent(x.value) : x.value, urlOf = c => ({ url: u1(c.src), urlMobile: u1(c.srcMobile) });
    if (q.method === 'PUT') { if (!authed(q)) return send(r, 401, { error: '관리자 인증이 필요합니다' }); const b = JSON.parse((await body(q)).toString()); if (b.on && !b.src && !b.srcMobile) return send(r, 400, { error: '영상을 올리거나 주소를 입력한 뒤 켜세요' }); intro = { on: !!b.on, src: b.src || null, srcMobile: b.srcMobile || null, fx: b.fx || {}, skipAfter: +b.skipAfter || 0, once: b.once === 'always' ? 'always' : 'session' }; return send(r, 200, { ok: true, ...intro, ...urlOf(intro) }); }
    if (!authed(q) && (!intro.on || !(intro.src || intro.srcMobile))) return send(r, 200, { on: false });
    return send(r, 200, { ...intro, ...urlOf(intro) });
  }
  if (p === '/api/clipfile') {
    if (q.method === 'POST') {
      if (!authed(q)) return send(r, 401, { error: '관리자 인증이 필요합니다' });
      const key = 'm' + Date.now().toString(36) + '.' + (u.searchParams.get('name') || 'x.mp4').split('.').pop();
      files[key] = await body(q); return send(r, 200, { ok: true, key });
    }
    const f = files[u.searchParams.get('k')]; if (!f) { r.statusCode = 404; return r.end('nf'); }
    r.setHeader('content-type', /.(webp|png|jpe?g|gif)$/.test(u.searchParams.get('k')||'') ? 'image/' + (u.searchParams.get('k').split('.').pop().replace('jpg','jpeg')) : 'video/mp4'); return r.end(f);
  }
  let rel = decodeURIComponent(p); if (rel.endsWith('/')) rel += 'index.html';
  const f = path.join(root, rel);
  if (!f.startsWith(root) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.statusCode = 404; return r.end('404'); }
  r.setHeader('content-type', TYPES[path.extname(f)] || 'application/octet-stream'); r.end(fs.readFileSync(f));
}).listen(8766);
