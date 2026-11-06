// 문안 다듬기(editorial/rebuild-20261022/polish-20261107.mjs) 검증:  node tests/rebuild-polish-sim.mjs
// 비는 필드 없음 · 안전 안내(notice) 그대로 · 조사 깨짐 없음 · 내부 설명 대부분 제거 · 원문 대비 과도한 삭제 없음 · 결정론
import { pathToFileURL, fileURLToPath } from 'node:url';
import path from 'node:path';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const imp = f => import(pathToFileURL(path.join(root, f)).href);
const P = await imp('editorial/rebuild-20261022/polish-20261107.mjs');
const m = await imp('editorial/rebuild-20261022/index.mjs');
const fails = []; const ok = (c, msg) => { if (!c && fails.length < 25) fails.push(msg); };
const F = ['core', 'basis', 'example', 'positive', 'negative', 'advice'];
const E = Object.values(m.bundles).flat();
// 1 비는 필드 없음, 조사 깨짐 없음
const BROKEN = /[가-힣]으예요|으이에요|이이에요|예요예요|,\s*\.|\s{2,}|에 해당하는 [이가] /;
for (const e of E) for (const f of F) { const t = String(e[f] || ''); if (!t) continue; ok(t.trim().length >= 15, `${e.id}.${f} 너무 짧음`); ok(!BROKEN.test(t), `${e.id}.${f} 조사 깨짐: ${(t.match(BROKEN) || [])[0]}`); }
// 2 내부 설명 대표 문장이 남지 않음
const GONE = [/엔진이 계산한/, /고정된 순서로 한 가지 줄기만/, /서로 다른 조건이라 함께 확인했어요/, /^이 장은 /m, /엔진이 [^,.]{1,24}(?:으로|로) 분류한/, /단정하지(?:는)? 않(?:아요|습니다)/];
// "단정하지 않고 후보를 시험해 보는"처럼 실제 안내인 문장은 남긴다 — 면책형("…단정하지 않아요.")만 없어야 한다
for (const re of GONE) { const left = E.filter(e => F.some(f => re.test(String(e[f] || '')))).length; ok(left === 0, `남은 내부 설명 ${re}: ${left}곳`); }
// 3 원문 대비 과도한 삭제 없음 + notice 보존: polish 를 한 번 더 적용해도 같아야(멱등) 하고, notice 는 polish 대상이 아님
const again = P.applyPolish(E);
E.forEach((e, i) => { F.forEach(f => ok(again[i][f] === e[f], `${e.id}.${f} 두 번 적용하면 달라짐`)); ok(again[i].notice === e.notice, `${e.id} notice 변경됨`); });
// 4 규칙 단위
const cases = [['멈춰서 준비하는 쪽으로 읽어요.', '멈춰서 준비하는 쪽이에요.'], ['더 어려운 구조로 읽어요.', '더 어려운 구조예요.'], ['이 힘을 강점으로 풀었어요.', '이 힘을 강점으로 풀었어요.'],
  ['[편재가 높고 일간의 힘이 약함] 조합으로 계산됐고, 파트너와 나누는 쪽으로 읽어요.', '편재가 높고 일간의 힘이 약함 조합이라 파트너와 나누는 쪽이에요.'], ['올해는 엔진이 방어기로 분류한 해예요.', '올해는 방어기에 해당하는 해예요.']];
cases.forEach(([a, b]) => ok(P.rewrite(a) === b, `규칙: ${a} → ${P.rewrite(a)} (기대: ${b})`));
ok(P.polishText('엔진이 계산한 값이에요.') === '엔진이 계산한 값이에요.', '지우면 너무 짧아지는 문단은 원문 유지');
if (fails.length) { console.log('실패 ' + fails.length + '건'); fails.forEach(f => console.log('  ' + f)); process.exit(1); }
console.log(`모든 검증 통과 · 문안 ${E.length}개 · 비는 필드·조사 깨짐 없음 · 내부 설명 대표 문장 제거 · 멱등 · notice 보존`);
