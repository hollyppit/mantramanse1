# 인계 문서 · 풀이 문안 톤 재작성 — career 05~08 작성 중 중단 (2026-10-25)

새 대화에서 이 문서를 먼저 읽고 이어가세요. **운영 DB 쓰기·푸시·배포는 사용자가 매번 명시적으로 승인한 뒤에만** 합니다(승인은 "○○ 운영에 올려줘"처럼 장 범위를 말한 한 번의 요청이 그 범위에만 유효). 이전 인계 문서: `docs/HANDOFF_2026-10-24_풀이톤재작성_self장.md`(0절에 self·wealth 현황과 함정이 있음).

## 1. 지금 상태 (사실만)

### 운영 DB에 새 문안(해요체)이 올라간 장 — 각 장 게시 직후 읽기 전용으로 초안=게시본·해시 일치 확인함
| 묶음 | 장 | 상태 |
|---|---|---|
| self | `timeline_self_01`~`22` (312항목) | 완료·푸시됨(커밋 `109f8aa`) |
| wealth | `timeline_wealth_01`~`12` (98항목) | 완료·푸시됨(커밋 `a94bafa`) |
| career | `timeline_career_01`~`04` (38항목) | **운영 게시 완료, 로컬 미커밋** |

### 로컬에만 있고 아직 운영에 안 올린 것
- `editorial/rebuild-20261022/career-05-08.mjs` — **해요체로 다시 썼음(39항목)**. 문법 검사 통과, id·조건·우선순위·시기(`timing`) 이전과 동일(차이 0), `node tests/rebuild-bundle-20261022.cjs career` → `problems []`. **아직 안 한 것:** `observed-prod.json` 갱신, `run-prepare`, 120차트 검증(`verifyAll`), 짧은 문단 점검, 화면 샘플 확인, 운영 게시.
- 미커밋 변경 3개: `career-01-04.mjs`(운영 게시됨), `career-05-08.mjs`(미준비), `index.mjs`(career 고지 연결). 마지막 커밋은 `a94bafa`(푸시됨). **먼저 커밋부터 하는 것을 권장**(이번 세션에서 `E:` 드라이브가 두 번 끊겼음).
- 아직 손도 안 댄 장: career 09~12(47항목: 09=9, 10=10, 11=10, 12=18), love 12장, health 10장, creative 8장, remedy 8장. 이들은 운영에 1차(합니다체) 문안 그대로.
- 운영 토큰: 사용자가 `setx SUPABASE_ACCESS_TOKEN`으로 **사용자 환경변수에 저장해 둔 상태**. 작업이 끝나면 `setx SUPABASE_ACCESS_TOKEN ""`로 지우고 Supabase 대시보드에서 토큰을 폐기하도록 안내할 것.

## 2. 바로 이어서 할 일 (순서)
1. (권장) 커밋: `git add editorial/rebuild-20261022 docs/...` 후 커밋(메시지 형식은 `a94bafa` 참고, 끝에 Co-Authored-By 줄). 푸시는 사용자가 요청할 때만.
2. **career 05~08 준비**
   - 읽기 전용으로 운영 현재 값 조회(아래 4절 SQL). 2026-10-25 조회값(모두 1차 게시본, 초안=게시본):
     - `timeline_career_05` v13 / 문단 78 / 해시 `a1b3995115f06d23987ad39de48438b2`
     - `timeline_career_06` v13 / 문단 64 / 해시 `f29695c6a27e885b36874bc5926f4169`
     - `timeline_career_07` v13 / 문단 64 / 해시 `8ee00288202d4fcc328a95e553546a69`
     - `timeline_career_08` v13 / 문단 92 / 해시 `b257dbd08fa14eb4d3039c79da9eab90`
     (게시 전에 한 번 더 조회해서 같은지 확인할 것. 다르면 그 값으로.)
   - `output/rebuild-publication-20261023/observed-prod.json`의 `chapters.timeline_career_05..08`을 `[버전, 해시, 문단수]`로 갱신. **지금 파일에는 1차 게시 이전 값(v12/189)이 들어 있어 그대로 두면 apply 가드가 거부한다.** (같은 파일의 career_01~04 항목은 "1차 게시 직후" 값이고, 이번에 새 문안을 게시했으므로 다시 준비할 일이 생기면 운영 현재 값 v15/v14/v14/v14로 갱신해야 함.)
   - `node editorial/rebuild-20261022/publish/run-prepare.mjs timeline_career_05,timeline_career_06,timeline_career_07,timeline_career_08` (몇 분 걸림). `plan-parts/<장>.json`에서 `validatorIssues=0`, `uncoveredConditionalPassages=0`, `prefixed=0`, `droppedForDuplicate=0`, `droppedUnreachable=[]` 확인.
   - 검증·화면 샘플은 5절 참고. 짧은 문단(30자 미만)이 있으면 문장을 늘려서 다시 준비.
3. 사용자 승인 후 게시(4절 절차). 끝나면 읽기 전용 해시 확인, 메모리의 진행 상황 갱신.
4. 그다음: career 09~12 → love → health → creative → remedy 순(건강·창작·개운은 안전 고지가 필수라 notice 처리를 먼저 확인).

## 3. 구조 메모 (wealth·career 공통)
- 문안 파일: `editorial/rebuild-20261022/career-01-04.mjs`, `career-05-08.mjs`, `career-09-12.mjs`, 상충 선언 `career-conflicts.mjs`(항목 **id를 참조** → id·조건·우선순위는 절대 바꾸지 않는다). 묶음 등록은 `index.mjs`(`bundles.career`).
- 항목 구조(`lib.mjs`의 `entry`): `text:[core, basis, example, positive, negative, advice, employee, business, freelance]` → 변환기가 core→title, basis(+notice)→why, example→reality, positive→strength, negative→risk, 응용 3문장→reinforce, advice→practice로 바꾼다. core는 "후킹 문장 + 이어지는 문장"이어야 화면의 큰 제목이 후킹이 된다.
- **고지(notice)**: career 전체 기본 `CAREER_NOTE`("이 해석은 직업이나 합격·채용·성공 여부를 단정하지 않고…")는 `career-01-04.mjs`에서 export, `index.mjs`가 `notice:e.notice||CAREER_NOTE`로 붙인다. 항목 자체에 `notice`가 있으면 그것이 우선(08장 `NOTE_MOVE`: 이직·독립 시점·결과를 말하지 않음). wealth도 같은 방식(`WEALTH_NOTE` + 장별 `NOTE_*`). 공통 문장은 변환기가 "틀 문장"으로 걷어 내므로 안전 고지는 반드시 `notice`로 둔다.
- 근거(basis)는 **항목마다 고유 문장**으로 쓴다(`[이름] 조합으로 계산됐고, <항목별 한 문장>. <공통 문장>` 형태). 공통 문장만 있으면 why가 비거나 핵심 문장이 덧붙는다.
- `career_08`은 `timing`(엔진 값 자리표시자 `{daewoonGanzhi}` 등)을 쓴다. 게시 문단에는 쓰이지 않지만 값은 보존한다.
- 이전 문안과의 중복에 주의: 운영 서비스는 이전에 보여 준 문장(`previous`)과 유사도 0.9 초과면 걸러 낼 수 있으므로, 새 후킹·문장은 self/wealth/career 앞 장과 겹치지 않게 쓴다(`career-05-08.mjs`는 이를 반영해 쓴 상태).

## 4. 운영 절차 (검증된 방식)
- 읽기 전용 조회(Supabase MCP `execute_sql`, 프로젝트 `devkslhggrkqtianjamj`):
  ```sql
  select replace(key,'ik:blocks:chapter:library.','') c, (value::jsonb->>'version')::int v, octet_length(value) bytes,
   jsonb_array_length(value::jsonb->'published') n, (value::jsonb->'draft')=(value::jsonb->'published') same,
   (select md5(string_agg((p->>'id')||chr(31)||(p->>'text'),chr(30) order by (p->>'id') collate "C"))
     from jsonb_array_elements(value::jsonb->'published') p) h
  from public.kv where key in ('ik:blocks:chapter:library.timeline_career_05', ... ) order by 1
  ```
  (쓰기는 이 도구로 하지 않는다.)
- 게시: PowerShell 도구에서 사용자 환경변수를 읽어 `apply-runner.mjs` 실행(토큰 값은 출력하지 않음). 반드시 `dry`가 모두 `ok`일 때만 `apply`:
  ```powershell
  $env:SUPABASE_ACCESS_TOKEN=[Environment]::GetEnvironmentVariable('SUPABASE_ACCESS_TOKEN','User')
  cd "E:\만트라 스튜디오 사업\앱 개발 소스\자체 만세력 어플\editorial\rebuild-20261022\publish"
  $c='timeline_career_05','timeline_career_06','timeline_career_07','timeline_career_08'
  node apply-runner.mjs dry @c
  if ($LASTEXITCODE -eq 0) { "apply" | node apply-runner.mjs apply @c }
  ```
  러너가 장마다 쓰기 직후 해시를 검증하고, 운영이 관찰값과 다르면 그 장은 건너뛴다. 게시 뒤 위 SQL로 다시 확인(초안=게시본, 해시가 `plan-parts/<장>.json`의 `newHash`와 일치).
- 크기 상한: 한 장의 저장 값이 7.5MB(`reading_compare_and_swap`)를 넘으면 거부된다(아무것도 쓰이지 않음). 큰 장: `self_01` 7.2MB, `self_03` 6.5MB, `self_20` 6.1MB, `wealth_02` 6.2MB, `career_01` 5.4MB. 넘으면 해당 장의 `sql/apply/<장>.sql`에서 이력 `limit 14`를 줄여 올린다(`self_01`은 8로 게시).
- 롤백: `output/rebuild-publication-20261023/sql/rollback/<장>.sql`(직전 버전 복원, 한 장에 한 번 적용했을 때 정확).

## 5. 검증 절차 (매 묶음 반복)
1. 문법·금지어·id/조건 보존: `node --check <파일>`, 금지어 grep(`반드시|무조건|100%|확정`), 이전 파일(`git show HEAD:<파일>`)을 임시 파일로 받아 `entries`의 id·`when`·`unless`·`priority`·`timing` 비교(차이 0이어야 함).
2. `node tests/rebuild-bundle-20261022.cjs career` → `problems []`(`wealth`, `self`, `self2`~`self4`도 같은 방식).
3. 준비 후 `plan-parts` 수치, 그리고 120개 가상 명식 검증(`editorial/rebuild-20261022/publish/verify.mjs`의 `verifyAll({root, charts:120, only:[장...]})`)에서 `validatorIssues 0, mixed 0, noticeMissing 0, forbidden 0, problems []`. (이전 세션의 임시 스크립트는 `%TEMP%`에 있었으나 사라질 수 있으니, 필요하면 `convert.mjs`의 `allEntries/chapterPassages/loadService`와 `verify.mjs`의 `sampleCharts`를 가져와 `L.composeReviewed`로 렌더링하는 짧은 스크립트를 다시 만든다.)
4. 짧은 문단 점검: 30자 미만 문단에는 변환기가 자동 머리말("이 사주의 강점을 짚어 보면 …")을 붙이므로 `prefixed 0`이 되도록 문장을 늘린다. 근거(why) 문단이 비거나 핵심 문장이 덧붙지 않았는지(`why`의 최소 길이)도 본다.
5. 임시 스크립트·`scratch-*.cjs`는 쓴 뒤 지운다(저장소에 남기지 않음).

## 6. 작성 규칙 (사용자 요구, 변하지 않음)
- 해요체, 챕터마다 후킹 문장으로 시작("이거 진짜 내 얘기잖아?"), 생활 장면(퇴근, 팀장 한마디, 읽씹, 회식비 정산 등)으로 구체적으로, 솔직하고 현실적인 결말. 십성·신강·신약 같은 용어는 근거(basis) 문단에서만 설명.
- 지킬 선: 시기(대운·세운)는 엔진 값으로만, 사건·합격·성공·수입 단정 금지. 건강은 진단·예측 금지, 전생은 창작 고지, 개운은 색·물건·방위 단정과 구매 권유 금지. 약점(neg) 끝에는 "가능성이지 정해진 일은 아니에요." 유지. 경쟁 서비스 글은 베끼지 않는다.
- 금지어: 확정·반드시·무조건·100% 등(투자 용어라도 "손실 확정" 같은 표현은 바꿔 쓴다).
- 묶음마다 화면 결과(서비스 렌더링 샘플)를 보여 주고, 사용자가 "올려줘"라고 한 뒤에 게시한다. 게시 직후 읽기 전용으로 해시를 확인해 보고한다.
- DB 밖에서 붙는 예전 문장(문단 끝 "예를 들어, …", 마무리 질문, 소제목, 조건에 안 맞는 명식의 `seed-` 폴백, 오프닝 파일)은 이번 작업으로 안 바뀐다. 화면에서 거슬린다는 말이 나오면 별도 작업으로 제안(미착수).

## 7. 기록해 둘 사실
- `wealth_10`의 `seun-build`(올해 세운·축적기) 7개 문단은 조건이 서로 모순이라 어떤 명식에도 선택되지 않아 게시에서 빠진다(1차부터 동일, 도달 불가).
- 이번 세션에서 `E:` 드라이브(프로젝트 위치)가 두 번 끊김. 끊기면 `git status`, `node --check`, `observed-prod.json` 파싱으로 파일이 온전한지 먼저 확인한 뒤 이어간다.
- 메모리: `C:\Users\user\.claude\projects\E-------------------------------\memory\`의 `rebuild-20261022-progress.md`에 진행 상황이 누적돼 있음(이번 중단 시점 기준으로 갱신해 둠).
