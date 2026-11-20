// 옛 커밋의 engine.js 소스에 지금의 지장간 데이터(2026-11-20 정정: 子·卯·酉 정기 하나, 월률분야 표는 사령용으로 분리)를 끼워 넣는다.
// 옛 엔진과 지금 엔진을 비교하는 테스트가 "그 테스트가 지키려던 변경"만 보도록, 지장간 데이터 차이는 양쪽에서 같게 맞춘다.
// 이미 새 데이터를 쓰는 소스(WOLRYUL 이 있음)는 그대로 돌려준다.
function withCurrentJijanggan(oldSrc, curSrc) {
  if (/const WOLRYUL = /.test(oldSrc)) return oldSrc;
  const oldBlock = /  \/\/ 지장간 \[천간, 일수\][\s\S]*?const hiddenLabels = [^\n]*\n/;
  const curBlock = /  \/\/ ── 지장간: 세 가지를 따로 관리한다[\s\S]*?const hiddenLabels = [^\n]*\n/;
  const cur = curSrc.match(curBlock);
  if (!oldBlock.test(oldSrc) || !cur) throw new Error('지장간 데이터 블록을 찾지 못함');
  let out = oldSrc.replace(oldBlock, () => cur[0]);
  // 사령은 월률분야 일수표로 센다(지금 엔진과 같게)
  const oldSar = /let acc = 0, idx = HIDDEN\[b\]\.length - 1;\s*for \(let i = 0; i < HIDDEN\[b\]\.length; i\+\+\) \{ acc \+= HIDDEN\[b\]\[i\]\[1\]; if \(day < acc\) \{ idx = i; break; \} \}\s*const s = HIDDEN\[b\]\[idx\]\[0\];\s*return \{ day: day \+ 1, stem: s, label: hiddenLabels\(b\)\[idx\]/;
  if (oldSar.test(out)) out = out.replace(oldSar, 'let acc = 0, idx = WOLRYUL[b].length - 1; for (let i = 0; i < WOLRYUL[b].length; i++) { acc += WOLRYUL[b][i][1]; if (day < acc) { idx = i; break; } } const s = WOLRYUL[b][idx][0]; return { day: day + 1, stem: s, label: wolryulLabels(b)[idx]');
  // 뿌리 깊이(본기·중기·여기)도 이름표 기준으로
  out = out.replace("const rootDepth = (b, i) => { const n = HIDDEN[b].length; return i === n - 1 ? 'main' : (n === 3 && i === 1 ? 'middle' : 'residual'); };", "const rootDepth = (b, i) => ({ '정기': 'main', '중기': 'middle', '여기': 'residual' })[HIDDEN_LABELS[b][i]];");
  return out;
}
module.exports = { withCurrentJijanggan };
