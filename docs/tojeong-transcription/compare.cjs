// 두 판독(passA·passB) 비교: 같은 면의 같은 칸 글자가 다르면 목록으로, 같으면 합본에 넣는다.
// 사용: node compare.cjs <dir>   → <dir>/diff.json, <dir>/merged.json, 요약 출력
const fs = require('fs'), path = require('path');
const dir = process.argv[2] || __dirname;
const read = p => { try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch (e) { return { __err: String(e.message) }; } };
const sides = d => fs.existsSync(d) ? fs.readdirSync(d).filter(f => /^\d{3}[ab]\.json$/.test(f)).map(f => f.slice(0, 4)) : [];
const A = path.join(dir, 'passA'), B = path.join(dir, 'passB'), F = path.join(dir, 'fix');
const all = [...new Set([...sides(A), ...sides(B)])].sort();
const diffs = [], merged = {}, problems = [];
// 이체자(같은 글자의 다른 꼴): 판독자마다 고른 코드값이 달라도 같은 글자로 본다. 합본에는 앞 글자(한국 통용 꼴)를 쓴다.
const VARIANTS = ['靑青', '鄕鄉', '尙尚', '産產', '凉涼', '沖冲', '棊碁', '絶絕', '旣既', '橫横', '淸清', '閑閒', '兎兔', '吳呉', '盜盗', '疎踈', '弔吊', '豊豐', '虛虚', '甁瓶', '遲遟', '厠廁', '擧舉', '稱穪', '晉晋', '眞真', '惠恵', '僞偽', '爲為', '敎教', '黃黄', '說説', '歲嵗', '來来', '與与', '雙双', '蓋盖', '寧寕', '強强', '剋尅', '鬧閙', '往徃', '値值', '徵徴', '德悳', '册冊', '缺欠', '曾曽', '毫毫', '釐厘'];
const VMAP = {}; for (const g of VARIANTS) { const cs = [...g]; for (const c of cs) VMAP[c] = cs[0]; }
const norm = s => [...String(s || '')].map(c => VMAP[c] || c).join('');
const cells = j => {
  const out = {};
  out.gua = String(j.gua); out.zhouyi = j.zhouyi || ''; out.zhujie = String(j.zhujie || '').replace(/[가-힣\s]/g, '');   // 註解 속 한글 토는 판독자마다 넣고 빼는 방식이 달라 비교에서 뺀다
  (j.guaxiang || []).forEach((p, i) => out['guaxiang.' + i] = p);
  (j.bands || []).forEach((b, bi) => {
    (b.guaci || []).forEach((pr, k) => pr.forEach((p, i) => out[`b${bi}.guaci${k}.${i}`] = p));
    (b.months || []).forEach((pr, m) => pr.forEach((p, i) => out[`b${bi}.m${m + 1}.${i}`] = p));
  });
  return out;
};
function shape(j, s) {
  const e = [];
  if (j.kind !== 'gua') return e;
  if (!Array.isArray(j.bands) || j.bands.length !== 3) e.push('bands≠3');
  (j.bands || []).forEach((b, bi) => {
    if ((b.guaci || []).length !== 3) e.push(`b${bi} guaci≠3`);
    if ((b.months || []).length !== 12) e.push(`b${bi} months≠12`);
    [...(b.guaci || []), ...(b.months || [])].forEach(pr => (pr || []).forEach(p => { if ([...String(p)].length !== 4) e.push(`b${bi} '${p}' 4자 아님`); }));
  });
  if ((j.guaxiang || []).length !== 2) e.push('guaxiang≠2');
  return e.map(x => s + ': ' + x);
}
for (const s of all) {
  const fix = fs.existsSync(path.join(F, s + '.json')) ? read(path.join(F, s + '.json')) : null;
  const a = read(path.join(A, s + '.json')), b = read(path.join(B, s + '.json'));
  if (fix) { merged[s] = fix; problems.push(...shape(fix, s)); continue; }
  if (a.__err || b.__err) { problems.push(`${s}: 판독 ${a.__err ? 'A' : 'B'} 없음`); continue; }
  if (a.kind !== b.kind) { diffs.push({ side: s, key: 'kind', a: a.kind, b: b.kind }); continue; }
  if (a.kind !== 'gua') { merged[s] = { side: s, kind: a.kind, notes: [a.notes, b.notes].filter(Boolean).join(' / ') }; continue; }
  const ca = cells(a), cb = cells(b); let n = 0;
  for (const k of new Set([...Object.keys(ca), ...Object.keys(cb)])) {
    if (norm(ca[k]) !== norm(cb[k])) {
      n++;
      const ch = [...String(ca[k] || '')].map((c, i) => c !== [...String(cb[k] || '')][i] ? i : -1).filter(i => i >= 0);
      diffs.push({ side: s, gua: a.gua, key: k, a: ca[k], b: cb[k], pos: ch });
    }
  }
  problems.push(...shape(a, s + '(A)'), ...shape(b, s + '(B)'));
  if (!n) merged[s] = a;
}
fs.writeFileSync(path.join(dir, 'diff.json'), JSON.stringify(diffs, null, 1));
fs.writeFileSync(path.join(dir, 'merged.json'), JSON.stringify(merged, null, 1));
const guas = Object.values(merged).filter(j => j.kind === 'gua').map(j => j.gua);
const want = []; for (let a = 1; a <= 8; a++) for (let b = 1; b <= 6; b++) for (let c = 1; c <= 3; c++) want.push(a * 100 + b * 10 + c);
console.log(JSON.stringify({ sides: all.length, merged: Object.keys(merged).length, mergedGua: guas.length, diffCells: diffs.length, diffSides: new Set(diffs.map(d => d.side)).size, missingGua: want.filter(g => !guas.includes(g)).length, dupGua: guas.filter((g, i) => guas.indexOf(g) !== i), problems: problems.slice(0, 40) }, null, 1));
