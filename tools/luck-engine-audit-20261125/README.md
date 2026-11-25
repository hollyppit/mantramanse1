# 운세 흐름 엔진 감사 스크립트 (2026-11-25)

저장소 `engine.js`는 바꾸지 않는다. 개선안은 `out/`의 엔진 **사본**에만 넣는다. `out/`은 git 에서 뺀다.

순서
1. `node tools/luck-engine-audit-20261125/make-prop.cjs` — 현재 엔진 사본(engine-base.js)과 개선안 A·B·C·ABC 사본을 만든다
2. `node tools/luck-engine-audit-20261125/compare.cjs` — 개발 표본 300·독립 표본 300으로 변경 전후 비교 → `out/compare-result.json` (수 분)
3. `node tools/luck-engine-audit-20261125/domvol.cjs` — 분야 지표 기준값 재산출·독립 표본 확인·변동성 측정 → `out/domvol-result.json`
4. `node tools/luck-engine-audit-20261125/strict.cjs` — 분야 지표 경계값 판정 방식 비교(콘솔 출력)

결과 해설: `docs/luck-engine-audit-2026-11-25/`
