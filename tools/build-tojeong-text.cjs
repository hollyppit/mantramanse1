// 토정비결 원문 파일 만들기: 규장각 奎古 1077 판독본(1차 A·2차 B·불일치 판정)을 합쳐 report/newyear/texts/tojeong-kyu1077.js 를 만든다.
// 사용: node tools/build-tojeong-text.cjs [판독 폴더=docs/tojeong-transcription]
//   판독 폴더: passA/{면}.json, passB/{면}.json, adj-*.json(불일치 판정)
// 규칙: 두 판독이 같으면(이체자는 같은 글자로 봄) 그 값, 다르면 판정값. 판정이 없는 불일치가 남으면 실패한다.
// 한글 풀이(김혁제 해설)는 판독 단계에서 옮기지 않았다 — 저작권이 남아 있을 수 있어 이 파일에 넣지 않는다.
const fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..');
const dir = path.resolve(process.argv[2] || path.join(root, 'docs', 'tojeong-transcription'));
const out = path.join(root, 'report', 'newyear', 'texts', 'tojeong-kyu1077.js');

// 이체자 묶음: 합본에는 첫 글자(한국 통용 꼴)를 쓴다. 판독자마다 다른 코드값을 고른 경우를 하나로 맞춘다.
const VARIANTS = ['靑青', '鄕鄉', '尙尚', '産產', '凉涼', '沖冲', '棊碁', '絶絕', '旣既', '橫横', '淸清', '閑閒', '兎兔', '吳呉', '盜盗', '疎踈', '弔吊', '豊豐', '虛虚', '甁瓶', '遲遟', '厠廁', '擧舉', '稱穪', '晉晋', '眞真', '惠恵', '僞偽', '爲為', '敎教', '黃黄', '說説', '歲嵗', '來来', '與与', '雙双', '蓋盖', '寧寕', '強强', '剋尅', '鬧閙', '往徃', '値值', '徵徴', '册冊', '曾曽', '卽即', '竝並', '刃刄', '釐厘', '晩晚', '餠餅', '孼孽'];
const VMAP = {}; for (const g of VARIANTS) { const cs = [...g]; for (const c of cs) VMAP[c] = cs[0]; }
const norm = s => [...String(s == null ? '' : s)].map(c => VMAP[c] || c).join('');
const hanjaOnly = s => String(s || '').replace(/[가-힣\s]/g, '');

const read = p => JSON.parse(fs.readFileSync(p, 'utf8'));
const sidesOf = d => fs.readdirSync(d).filter(f => /^\d{3}[ab]\.json$/.test(f)).map(f => f.slice(0, 4)).sort();
const A = path.join(dir, 'passA'), B = path.join(dir, 'passB');
const adj = {};
for (const f of fs.readdirSync(dir).filter(f => /^adj-\d+\.json$/.test(f))) for (const r of read(path.join(dir, f))) adj[r.side + '|' + r.key] = r;

const cellKeys = j => {
  const o = { 'guaxiang.0': j.guaxiang[0], 'guaxiang.1': j.guaxiang[1] };
  j.bands.forEach((b, bi) => {
    b.guaci.forEach((pr, k) => pr.forEach((p, i) => o[`b${bi}.guaci${k}.${i}`] = p));
    b.months.forEach((pr, m) => pr.forEach((p, i) => o[`b${bi}.m${m + 1}.${i}`] = p));
  });
  return o;
};
const errors = [], gua = {}, unresolved = [];
for (const s of sidesOf(A)) {
  const a = read(path.join(A, s + '.json')), b = fs.existsSync(path.join(B, s + '.json')) ? read(path.join(B, s + '.json')) : null;
  if (a.kind !== 'gua') continue;
  if (!b) { errors.push(s + ': 2차 판독 없음'); continue; }
  if (a.gua !== b.gua) errors.push(`${s}: 괘 번호 불일치 ${a.gua}/${b.gua}`);
  if (norm(a.zhouyi) !== norm(b.zhouyi) && !/□/.test(a.zhouyi + b.zhouyi)) errors.push(`${s}: 주역 괘 이름 불일치 ${a.zhouyi}/${b.zhouyi}`);
  const ca = cellKeys(a), cb = cellKeys(b), fin = {};
  for (const k of Object.keys(ca)) {
    if (norm(ca[k]) === norm(cb[k])) { fin[k] = norm(ca[k]); continue; }
    const d = adj[s + '|' + k];
    if (!d) { unresolved.push(`${s} ${k} A=${ca[k]} B=${cb[k]}`); fin[k] = norm(ca[k]); continue; }
    fin[k] = norm(d.value);
  }
  const pair = (bi, kind, k) => [fin[`b${bi}.${kind}${k}.0`], fin[`b${bi}.${kind}${k}.1`]];
  const guaci = [], months = {};
  for (let bi = 0; bi < 3; bi++) for (let k = 0; k < 3; k++) guaci.push(pair(bi, 'guaci', k));
  for (let m = 1; m <= 12; m++) months[m] = [0, 1, 2].map(bi => pair(bi, 'm', m));
  // 판독자가 □ 를 남긴 칸·두 판독 모두 확신하지 못한 글자(uncertain)는 검수 목록으로 남긴다
  const unc = [...(a.uncertain || []).map(u => ({ ...u, by: 'A' })), ...(b.uncertain || []).map(u => ({ ...u, by: 'B' }))];
  const boxes = Object.entries(fin).filter(([, v]) => /□/.test(v)).map(([k, v]) => ({ where: k, read: v }));
  const zj = hanjaOnly(a.zhujie) === hanjaOnly(b.zhujie) ? a.zhujie : (adj[s + '|zhujie'] ? adj[s + '|zhujie'].value : a.zhujie);
  gua[a.gua] = {
    side: s, zhouyi: norm(a.zhouyi.includes('□') ? b.zhouyi : a.zhouyi), zhujie: norm(zj),
    guaxiang: [fin['guaxiang.0'], fin['guaxiang.1']], guaci, months,
    review: { illegible: boxes, uncertain: unc.length, adjudicated: Object.keys(adj).filter(k => k.startsWith(s + '|')).length },
  };
}
// 구조 검사: 괘사 9구·월 12×3구, 모든 구 4자
for (const [g, v] of Object.entries(gua)) {
  if (v.guaci.length !== 9) errors.push(g + ' 괘사 9구 아님');
  for (let m = 1; m <= 12; m++) if (v.months[m].length !== 3) errors.push(g + ' ' + m + '월 3구 아님');
  [v.guaxiang, ...v.guaci, ...Object.values(v.months).flat()].flat().forEach(p => { if ([...p].length !== 4) errors.push(`${g} '${p}' 4자 아님`); });
}
const want = []; for (let x = 1; x <= 8; x++) for (let y = 1; y <= 6; y++) for (let z = 1; z <= 3; z++) want.push(x * 100 + y * 10 + z);
const missing = want.filter(g => !gua[g]);
if (unresolved.length) errors.push('판정 없는 불일치 ' + unresolved.length + '칸: ' + unresolved.slice(0, 5).join(' / '));
if (errors.length) { console.error(errors.join('\n')); process.exit(1); }

const meta = {
  source: '(四十五句)松亭土亭秘訣, 松亭 金赫濟 著, 新鉛活字本(1964년 무렵 추정), 서울대학교 규장각한국학연구원 소장 奎古 1077',
  imageUrl: 'https://kyudb.snu.ac.kr/ (원문 이미지, 면 GA01077_00_IL_0001_{002a~071b})',
  method: '공개 원문 이미지를 면마다 독립 판독 2회(A·B) → 이체자 정규화 후 비교 → 불일치 칸만 원본 재확인 판정. 한글 풀이는 옮기지 않음.',
  transcribedAt: '2026-11-15',
  status: 'transcribed-unreviewed',   // 관리자 대조 전: 사용자 화면에는 reviewed 이상만 노출
  missing, missingNote: '스캔본에 해당 괘 면이 없음(663·711은 면 사이 누락, 862·863은 861 다음 면이 보는 법). 다른 판본으로 보충 필요.',
  layout: 'guaci = 卦辭 9구(위 단 3·가운데 단 3·아래 단 3, 각 구 [앞 4자, 뒤 4자]). months[n] = n월 3구(위·가운데·아래 단). guaxiang = 【卦象】.',
  variants: '이체자는 VARIANTS 표의 첫 글자로 통일(tools/build-tojeong-text.cjs).',
};
const body = { meta, gua };
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, `/* 토정비결 원문(한문) — tools/build-tojeong-text.cjs 가 판독본에서 만든 파일. 직접 고치지 말고 판독·판정 데이터를 고쳐 다시 만든다.
   저본: 규장각 奎古 1077. status transcribed-unreviewed = 관리자 대조 전. 김혁제 한글 풀이는 싣지 않음. */
(function(root){'use strict';
var TEXT=${JSON.stringify(body)};
root.TojeongText=TEXT;
if(typeof module!=='undefined'&&module.exports)module.exports=TEXT;
})(typeof window!=='undefined'?window:globalThis);
`);
console.log(JSON.stringify({ out: path.relative(root, out), gua: Object.keys(gua).length, missing, illegibleCells: Object.values(gua).reduce((n, v) => n + v.review.illegible.length, 0) }));
