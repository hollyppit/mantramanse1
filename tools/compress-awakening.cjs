// 일간·일주 각성 영상 압축 교체 도구
// 운영 영상(R2 mantra-clips)을 내려받아 720p H.264(faststart)로 다시 인코딩하고, 새 키로 올린 뒤 KV 'awakening:index' 의 주소만 바꾼다.
// 원본 파일은 지우지 않는다(되돌리기 = 백업한 index 를 다시 쓰기).
//
//   node tools/compress-awakening.cjs plan               목록·용량 요약, index 백업
//   node tools/compress-awakening.cjs encode [id...]     내려받기+압축(로컬만). id 예: 기묘M, 기M(일간), fb. 생략하면 전부
//   node tools/compress-awakening.cjs apply              압축본 업로드 + index 주소 교체(운영 반영)
//   node tools/compress-awakening.cjs rollback           백업한 index 로 되돌리기
//
// 필요: ffmpeg (PATH 또는 FFMPEG 환경변수), Cloudflare API 토큰(CLOUDFLARE_API_TOKEN 또는 토큰 파일)
// 작업 폴더: AWK_WORK 환경변수(기본: ./.awk-compress, git 에 올리지 않음)
'use strict';
const fs = require('fs'), path = require('path'), crypto = require('crypto'), { spawnSync } = require('child_process');

const ACC = '9691f5fe73bf481a5d884db649c7eb01', KV_NS = '1a48b15379fc4a7191c9b2249e225c80', BUCKET = 'mantra-clips', KV_KEY = 'awakening:index';
const API = 'https://api.cloudflare.com/client/v4/accounts/' + ACC;
const WORK = path.resolve(process.env.AWK_WORK || '.awk-compress');
const FFMPEG = process.env.FFMPEG || 'ffmpeg';
const token = () => process.env.CLOUDFLARE_API_TOKEN || fs.readFileSync('E:/만트라 스튜디오 사업/앱 개발 소스/Cloudflare Workers API token 260411.txt', 'utf8').trim();
const H = () => ({ authorization: 'Bearer ' + token() });
const MB = n => (n / 1048576).toFixed(1) + 'MB';
const keyOf = u => { const m = /[?&]k=([\w.-]+)/.exec(u || ''); return m ? m[1] : null; };
const P = f => path.join(WORK, f);
fs.mkdirSync(path.join(WORK, 'src'), { recursive: true }); fs.mkdirSync(path.join(WORK, 'out'), { recursive: true });

async function getIndex() {
  const r = await fetch(API + '/storage/kv/namespaces/' + KV_NS + '/values/' + encodeURIComponent(KV_KEY), { headers: H() });
  if (!r.ok) throw Error('index 읽기 실패 ' + r.status); return JSON.parse(await r.text());
}
async function putIndex(d) {
  const r = await fetch(API + '/storage/kv/namespaces/' + KV_NS + '/values/' + encodeURIComponent(KV_KEY), { method: 'PUT', headers: { ...H(), 'content-type': 'text/plain' }, body: JSON.stringify(d) });
  const j = await r.json(); if (!j.success) throw Error('index 쓰기 실패 ' + JSON.stringify(j.errors));
}
const objUrl = k => API + '/r2/buckets/' + BUCKET + '/objects/' + encodeURIComponent(k);
async function download(k, file) {
  const r = await fetch(objUrl(k), { headers: H() }); if (!r.ok) throw Error('내려받기 실패 ' + k + ' ' + r.status);
  fs.writeFileSync(file, Buffer.from(await r.arrayBuffer()));
}
async function upload(k, file) {
  const r = await fetch(objUrl(k), { method: 'PUT', headers: { ...H(), 'content-type': 'video/mp4' }, body: fs.readFileSync(file) });
  const j = await r.json().catch(() => ({})); if (!r.ok || j.success === false) throw Error('올리기 실패 ' + k + ' ' + r.status + ' ' + JSON.stringify(j.errors || ''));
}
// 각 항목 → { id, field, key }
function entries(d) {
  const out = [], add = (id, o) => { for (const f of ['videoUrl', 'videoWebm']) { const k = keyOf(o[f]); if (k && /\.(mp4|mov|m4v|webm)$/i.test(k)) out.push({ id, field: f, key: k }); } };
  (d.videos || []).forEach(v => add(v.dayPillar + v.gender, v)); (d.ilgan || []).forEach(v => add(v.stem + v.gender, v)); if (d.fallback) add('fb', d.fallback);
  return out;
}
function encode(src, out) {
  // 720 폭 세로 영상, 화질 CRF 25, 바로 재생(faststart). 소리는 있으면 AAC 96k 로 유지.
  const a = ['-y', '-v', 'error', '-i', src, '-vf', "scale='min(720,iw)':-2:flags=lanczos", '-c:v', 'libx264', '-preset', 'slow', '-crf', '25', '-profile:v', 'high', '-pix_fmt', 'yuv420p', '-maxrate', '2500k', '-bufsize', '5000k', '-c:a', 'aac', '-b:a', '96k', '-movflags', '+faststart', out];
  const r = spawnSync(FFMPEG, a, { stdio: 'inherit' }); if (r.error) throw Error('ffmpeg 실행 실패: ' + r.error.message + ' (FFMPEG 환경변수로 경로 지정)'); if (r.status !== 0) throw Error('ffmpeg 오류 ' + r.status);
}

(async () => {
  const mode = process.argv[2], ids = process.argv.slice(3);
  if (mode === 'plan') {
    const d = await getIndex(); const bk = P('index-backup-' + Date.now() + '.json'); fs.writeFileSync(bk, JSON.stringify(d)); if (!fs.existsSync(P('index-backup.json'))) fs.writeFileSync(P('index-backup.json'), JSON.stringify(d));
    const es = entries(d); let total = 0;
    const sizes = {}; let cur = '';
    do { const r = await (await fetch(API + '/r2/buckets/' + BUCKET + '/objects?per_page=1000' + (cur ? '&cursor=' + encodeURIComponent(cur) : ''), { headers: H() })).json(); (r.result || []).forEach(o => { sizes[o.key] = o.size; }); cur = r.result_info && r.result_info.is_truncated ? r.result_info.cursor : ''; } while (cur);
    for (const e of es) { e.size = sizes[e.key] || 0; total += e.size; }
    fs.writeFileSync(P('plan.json'), JSON.stringify(es, null, 1));
    console.log('영상', es.length, '개, 합계', MB(total), '평균', MB(total / (es.length || 1)), '\n백업', bk);
    es.sort((a, b) => b.size - a.size).slice(0, 5).forEach(e => console.log('  ', e.id, e.key, MB(e.size)));
  } else if (mode === 'encode') {
    const d = await getIndex(), es = entries(d).filter(e => !ids.length || ids.includes(e.id)); let before = 0, after = 0, i = 0;
    for (const e of es) {
      i++; const src = P('src/' + e.key), out = P('out/' + e.key.replace(/\.\w+$/, '.mp4'));
      if (fs.existsSync(out)) { before += fs.statSync(src).size; after += fs.statSync(out).size; continue; }
      if (!fs.existsSync(src)) await download(e.key, src);
      encode(src, out); const a = fs.statSync(src).size, b = fs.statSync(out).size; before += a; after += b;
      console.log(`[${i}/${es.length}] ${e.id} ${MB(a)} → ${MB(b)}`);
    }
    console.log('합계', MB(before), '→', MB(after));
  } else if (mode === 'apply') {
    const d = await getIndex(), es = entries(d), map = fs.existsSync(P('uploaded.json')) ? JSON.parse(fs.readFileSync(P('uploaded.json'))) : {};
    for (const e of es) {
      if (map[e.key]) continue; const out = P('out/' + e.key.replace(/\.\w+$/, '.mp4')); if (!fs.existsSync(out)) continue;
      const src = P('src/' + e.key); if (fs.existsSync(src) && fs.statSync(out).size >= fs.statSync(src).size) continue; // 줄지 않았으면 원본 유지
      const nk = crypto.randomBytes(9).toString('hex') + '.mp4'; await upload(nk, out); map[e.key] = nk; fs.writeFileSync(P('uploaded.json'), JSON.stringify(map, null, 1)); console.log('올림', e.id, e.key, '→', nk);
    }
    const swap = o => { if (!o) return; for (const f of ['videoUrl', 'videoWebm']) { const k = keyOf(o[f]); if (k && map[k]) o[f] = '/api/clipfile?k=' + map[k]; } };
    (d.videos || []).forEach(swap); (d.ilgan || []).forEach(swap); swap(d.fallback);
    await putIndex(d); console.log('index 교체 완료 (바뀐 파일', Object.keys(map).length, '개)');
  } else if (mode === 'rollback') {
    const d = JSON.parse(fs.readFileSync(P('index-backup.json'))); await putIndex(d); console.log('백업 index 로 되돌림');
  } else { console.log('plan | encode [id...] | apply | rollback'); process.exit(1); }
})().catch(e => { console.error(e.message); process.exit(1); });
