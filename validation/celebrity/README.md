# 유명인 생애 데이터 기반 운세 흐름 검증 시스템

만트라 만세력 운세 흐름 엔진(`engine.js`)이 실제 인물의 공개 생애 사건과 우연 이상으로 관련되는지 확인하는 **독립 검증 모듈**입니다.
서비스 코드·점수·DB·화면과 완전히 분리되어 있습니다. 엔진은 읽기만 합니다.

## 폴더
| 경로 | 내용 |
|---|---|
| `protocol/` | 사전 등록(가설·사건 분류·중요도·사건→분야 대응·분할 규칙). 수집·계산 전에 고정, 해시는 `LOCK.txt` |
| `data/raw/` | 수집 원본(직업군별 JSON, 출처 URL·근거 문장 포함) |
| `data/persons.json` · `data/events.json` | 병합·검사 결과(출생 정보와 사건을 분리 저장), `data/QUALITY.md` 품질 점검 |
| `src/` | `adapter.cjs`(엔진 읽기 전용 연결) · `merge.cjs` · `compute.cjs`(블라인드 계산) · `evaluate.cjs`(대조·통계) · `report.cjs`(보고서) |
| `out/` | 계산 결과(`computed/`), 무작위 기준(`null/`, git 제외), `results.json` |
| `reports/` | `REPORT.md` · `report.html` |

## 실행 순서
```
node validation/celebrity/src/merge.cjs          # 원본 검사·병합·dev/test 분할
node validation/celebrity/src/compute.cjs 200    # 블라인드 계산(사건 파일을 읽으면 멈춤) + 가짜 명식 200개/사람
node validation/celebrity/src/evaluate.cjs       # 가설 H1~H4, 나눠 보기, 사례 목록
node validation/celebrity/src/report.cjs         # 보고서
```
환경변수 `CV_BASE`로 작업 폴더를 바꿀 수 있습니다(시험용).

## 확대(100명 이상)
- `data/raw/`에 같은 형식의 파일을 더하면 됩니다(사람 id 는 겹치지 않게).
- 분할 규칙은 id 해시라서 사람을 더해도 기존 사람의 dev/test 는 바뀌지 않습니다.
- 대응표·가설을 바꾸려면 `protocol/mapping.json`의 version 을 올려 새로 등록하고, 이전 결과와 함께 보고합니다.
