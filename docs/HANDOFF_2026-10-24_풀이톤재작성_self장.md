# 인계 문서 · 풀이 문안 톤 재작성(self 장) 진행 상황 (2026-10-24)

새 대화에서 이 문서를 먼저 읽고 이어가세요. **운영 DB 쓰기·푸시·배포는 사용자가 매번 명시적으로 승인한 뒤에만** 합니다. 이전 인계 문서: `docs/HANDOFF_2026-10-23_풀이재작성_운영게시준비.md`.

## 0. 최신 진행 상황 (2026-10-24 말 갱신 — 아래 1~7절보다 우선)
- **self 묶음 22개 장(`timeline_self_01`~`22`) 전부 해요체 새 문안으로 재작성·운영 게시 완료**(각 장 게시 직후 읽기 전용으로 초안=게시본·해시 일치 확인). **wealth 12개 장(`timeline_wealth_01`~`12`)도 같은 방식으로 재작성·운영 게시 완료**(2026-10-25). 나머지 50개 장(career 12·love 12·health 10·creative 8·remedy 8)은 1차 합니다체 문안 그대로, 아직 새로 쓰지 않았다. 다음은 career부터(건강·창작·개운은 안전 고지가 필수인 묶음이라 notice 처리를 먼저 확인).
- wealth 메모: 상충 선언(`wealth-conflicts.mjs`)이 항목 id를 참조하므로 id·조건을 바꾸지 않는다. 고지는 `wealth-01-04.mjs`의 `WEALTH_NOTE`(기본, `index.mjs`가 wealth 묶음 전체에 붙임)와 항목별 `notice`(06 `NOTE_TIME`, 08 `NOTE_INVEST`, 10 `NOTE_FLOW`, 11 `NOTE_SCENARIO`, 12 `NOTE_STRATEGY`)로 둔다. `wealth_10`의 `seun-build`(올해 세운·축적기) 7개 문단은 조건이 모순이라 게시에서 빠진다(1차부터 동일, 도달 불가).
- 게시는 사용자가 사용자 환경변수 `SUPABASE_ACCESS_TOKEN`을 저장해 둔 PowerShell 도구에서 `apply-runner.mjs`로 실행(`dry` → `"apply" | node apply-runner.mjs apply <장>`). 토큰은 채팅에 쓰지 않는다. 작업이 끝나면 토큰을 지우고 폐기한다.
- 한 장당 운영 저장 값은 7.5MB 상한(`reading_compare_and_swap`)이 있다. `self_01`은 이를 넘어서 apply SQL의 이력 `limit 14`를 8로 줄여 게시했다. 지금 큰 장: `self_20` 6.1MB, `self_01` 7.2MB, `self_03` 6.5MB, `self_12` 5.1MB. 다시 고쳐 올릴 때는 이력을 줄여야 할 수 있다.
- 새로 쓸 때의 함정(모두 검증으로 잡았다):
  - 같은 장 안에서 A/B(신강·신약 등) 항목이 같은 근거(basis) 문장을 공유하면 변환기가 "공통 틀"로 걷어 내서 `why`가 비거나 핵심 문장이 덧붙는다. basis는 항목마다 고유한 문장으로 쓴다.
  - 같은 조건대 항목끼리 조언 문장이 비슷하면(유사도>0.9) 한쪽이 탈락해 예전 seed 문단이 섞인다(`verify`의 `mixed`로 확인).
  - 30자 미만 문단에는 자동 머리말("이 사주의 강점을 짚어 보면 …")이 붙는다. 문장을 늘린다.
  - 금지어(반드시·무조건·확정·100% 등). 건강·시기 장은 고지 문장을 `notice`(보호 문장)로 둔다(`self_10`, `self_20`, `self_21` 참고).
  - 새 장을 쓰면 `self-variants.mjs`의 `REWRITTEN_PREFIXES`에 접두어를 추가한다. 운영 게시 전 `observed-prod.json`의 해당 장을 현재 운영 값(버전·해시·문단 수)으로 갱신한 뒤 `run-prepare.mjs`를 돌린다.
- 이번 세션에서 `E:` 드라이브가 두 번 끊겼다. 쓰기 중 끊기면 파일이 깨질 수 있으므로 작업 후 바로 커밋한다.
- **DB 밖에서 붙는 예전 문장은 그대로**다(문단 끝 "예를 들어, …", 마무리 질문, 소제목, 조건에 안 맞는 명식의 `seed-` 폴백, 오프닝). 화면에서 거슬리면 별도 작업으로 줄인다(미착수).

## 1. 지금 운영 상태 (읽기 전용으로 확인한 사실) — 2026-10-24 오전 시점(이후 위 0절 참고)
- 84개 장 전부 1차 재작성 문안(합니다체, `rb-` 문단)이 운영 DB에 게시됨. 점검: 84/84 준비 해시·문단 수 일치, 초안=게시본, 버전 +1.
- **`timeline_self_02`만 새 톤(해요체)으로 다시 올림**(사용자가 `apply-runner.mjs`로 실행, `version 14, hash verified`). 나머지 83개 장은 1차(합니다체) 문안 그대로.
- 코드는 `ddef818`까지 푸시·배포됨. 수정 내용: `functions/_reviewed-reading.js` — 게시본에 `rb-` 문단이 있으면 코드의 예전 시드 문단을 다시 합치지 않음(예전의 더 구체적인 조건 문단이 새 문안을 이기던 문제 해결).
- Supabase 토큰과 `execute_sql` 허용 규칙은 사용자가 지우기로 함(확인 안 됨 → 새로 필요하면 사용자가 다시 만들기).

## 2. 왜 화면 문구가 안 바뀌었나 (원인, 이미 수정됨)
- 서비스는 게시본에 "코드 시드 문단 ID"가 전부 없으면 코드 시드(self_01 기준 221개, 복합 조건)를 합쳤고, 조건이 더 구체적인 예전 문단이 새 문단을 이김. → 위 수정으로 해결(전후 비교: 새 문안 블록 476→560, 예전 84→0).
- **큰 후킹 제목은 각 장 `title` 문단의 첫 문장**이다(`report/v2/reading-text.js` 76행: title 문단이 2문장 이상이면 첫 문장이 `<h3 class="reading-hook">`). 그래서 초안의 core(첫 문단)를 "후킹 문장 + 이어지는 문장"으로 쓰면 후킹이 바뀐다. 한 문장뿐인 title이면 코드의 공용 후킹(`personalOpening`의 그룹별 문장, 예: "남들은 넘기는 약속도 그냥 지나치지 못하시죠?")이 나와 여러 장에서 반복됨.
- `timeline_self_03`은 코드가 큰 후킹을 고정(첫 문장 덮어쓰기에서 제외, 76행)하므로 core 첫 문장이 큰 제목이 되지 않는다.
- **아직 DB 밖에서 붙는 예전 문장(이번 작업으로 안 바뀜)**: 문단 끝 "예를 들어, …"(`report/v2/everyday-reading.js`), 마무리 질문("속도를 내는 때와 멈춰 확인하는 때를 구별하고 있나요?"), 소제목("이게 내 무기예요", "이렇게 쓰면 더 잘 풀려요"), 폴백(조건에 안 맞는 명식 ≈ 25%)의 `seed-` 문단, 오프닝 파일(`_reading-direct-openings.js`). 사용자가 거슬려하면 별도 작업으로 줄이기(미착수).

## 3. 사용자 요구 (이번 작업의 기준)
- 챕터마다 후킹 멘트를 더 강조. 풀이는 "이거 진짜 내 얘기잖아?" 느낌으로 더 디테일하게(생활 장면: 퇴근, 팀장 한마디, 읽씹, 회식비 정산 등).
- **해요체**, 십성·신강신약 용어 없이(근거 문단 why에서만 설명), 솔직하고 현실적인 결말. 이전 메모리 규칙(`feedback_reading-copy-voice`)과 동일. 1차 초안이 합니다체·일반적 장면이라 이 기준을 못 지켰던 것.
- 지킬 선: 시기(대운·세운)는 엔진 값으로만, 사건 단정 금지("~하겠네요" 식 단정 금지). 건강은 진단·예측 금지, 전생은 창작 고지, 개운은 색·물건·방위 단정과 구매 권유 금지. 약점(neg) 끝에는 "가능성이지 정해진 일은 아니에요." 유지. 경쟁 서비스 글(사용자가 보여 준 참고 이미지)은 베끼지 않는다.
- 묶음마다 화면 결과를 보여 줄 것(사용자 요청).

## 4. 지금 로컬 작업 상태 (미커밋)
`git status`: 수정됨 — `editorial/rebuild-20261022/self-01.mjs`, `self-02.mjs`, `self-03.mjs`, `self-04.mjs`, `self-05.mjs`, `self-variants.mjs`, `publish/convert.mjs`. 커밋 안 함.
- **self-02**: 12개 항목 새 톤으로 완료·운영 게시됨(커밋만 안 됨).
- **self-01**(일간 10 × 신강·중화·신약 = 30항목): 새로 작성. 예전 `self-variants-01.mjs`의 중화·신약 덮어쓰기를 항목 안으로 흡수. **운영에는 아직 안 올림.**
- **self-03**(일지 십성 10 × 세력 3 = 30항목), **self-04**(구조 11 × A·B = 22항목), **self-05**(월간 × 안쪽 십성군 25항목): 새로 작성, **운영에 아직 안 올림.** self-05는 `scratchpad`의 표(`self05-rows.txt`)를 `gen05.mjs`로 변환해 만든 파일이라, 같은 방식 유지 필요 없음(결과 파일 `self-05.mjs`가 정본).
- `self-variants.mjs`: `REWRITTEN_PREFIXES=['self01-','self02-','self03-','self04-','self05-']`로, 새로 쓴 장의 id는 예전 덮어쓰기(`LOW_VARIANTS`)를 적용하지 않음. **새 장을 다시 쓸 때마다 접두어를 추가해야 한다**(안 하면 예전 문안이 새 문안을 덮어씀).
- `publish/convert.mjs`: 연습(practice) 앞머리를 "이렇게 해 보세요. "로 변경(해요체).
- 로컬 검증: `node tests/rebuild-bundle-20261022.cjs self` → entries 129, problems [] (self_01·03·04·05 포함 통과).
- **마지막 단계에서 중단됨**: 아래 5번의 "SQL 준비(observed 갱신 + run-prepare)"를 실행하려다 사용자가 멈춤. 그래서 `output/rebuild-publication-20261023/`의 01·03·04·05 payload/SQL은 **아직 1차(합니다체) 기준 그대로**이고, `observed-prod.json`은 self_02만 갱신된 상태(`observed-prod.before-rebuild-v1.json`은 그 전 백업).

## 5. 이어서 할 일 (순서)
1. (선택) 새 대화에서 먼저 `git diff --stat`으로 위 변경 확인, 필요하면 커밋(사용자 지시 시).
2. **01·03·04·05 운영 반영 준비**(self_02를 한 방식 그대로):
   - 각 장의 `observed-prod.json` 항목을 "현재 운영 상태"로 갱신: `[plan-parts의 observedVersion+1, plan-parts의 newHash(1차 게시 때 값), passages]` (현재 운영 = 1차 게시본). 먼저 읽기 전용으로 실제 운영 버전·해시를 조회해 확인할 것(적용 SQL의 가드가 관찰값과 다르면 아무것도 안 쓰고 중단).
   - `node editorial/rebuild-20261022/publish/run-prepare.mjs timeline_self_01,timeline_self_03,timeline_self_04,timeline_self_05` (self_01은 시나리오 30개라 오래 걸림), `plan.json`에서 `validatorIssues=0`, `uncoveredConditionalPassages=0` 확인.
   - 로컬 검증: `node --input-type=module`로 `publish/verify.mjs`의 `verifyAll({root, charts:120, only:[...]})` 실행(이전 self_02 때 사용), 금지어·안전고지 누락 0 확인.
3. **화면 결과 보여 주기**: `tests/_tmp-*.cjs` 같은 임시 스크립트로 `functions/api/movingtoon-reading.js`를 `publishedLibrary`에 payload를 넣어 호출하면 운영과 같은 경로로 렌더링됨(응답의 `result.paragraphs[].text`, `blocks[].id`). 임시 스크립트는 쓴 뒤 삭제할 것.
4. 사용자 승인 후 **사용자가** `apply-runner.mjs apply <장,장...>`을 PowerShell에서 실행(토큰 필요, 채팅에 붙이지 말 것). 끝나면 읽기 전용으로 해시 확인, 필요하면 내장 브라우저로 실제 화면 확인.
5. 다음 묶음: self_06~22(`self-06.mjs`~`self-22.mjs`), 그다음 wealth·career·love·health·creative·remedy. 항목 수(self 합계 312): 06=10, 07=12, 08=8, 09=14, 10=10, 11=14, 12=10, 13=12, 14=12, 15=10, 16=10, 17=12, 18=8, 19=19, 20=20, 21=18, 22=6. 자세한 구조는 각 `.mjs`와 `self-variants-*.mjs`(06·07·09·10·11은 변형 덮어쓰기가 있어 항목으로 흡수해야 함) 참고.
6. 장마다 후킹이 겹치지 않게 core 첫 문장을 고유하게. 큰 후킹이 코드 고정인 장(self_03)은 예외.
7. 별도 작업 후보(사용자 확인 후): 문단 끝 예전 코드 문장·마무리 질문 줄이기, 폴백(`seed-`)과 오프닝을 새 톤으로 교체.

## 6. 작성 방식 메모
- 항목 구조: `entry({id, chapter, when, tags, text:[core, basis, example, positive, negative, advice, employee, business, freelance]})` (`lib.mjs`). 변환: core→title, basis(+notice)→why, example→reality, positive→strength, negative→risk, applications(직장·사업·프리랜서)→reinforce, advice→practice.
- core = "후킹 문장 + 이어지는 문장". 직장/사업/프리랜서 문장은 "직장에서는 …"으로 시작하지 않는다(변환기가 접두어를 붙임, 안 그러면 "직장에서는 직장에서는").
- 문단은 30자 이상 1000자 이하, `{}<>` 금지, 금지어(확정·반드시·무조건·100% 등) 금지, 같은 조건이 겹치는 문단끼리 거의 같은 문장 금지(유사도 > 0.9는 서비스 검증기가 거부).
- 조사 주의: 템플릿에 `${…}로` 붙일 때 받침 여부로 "으로"를 가려야 함(예: 신호등으로).
- Bash 도구에 긴 한국어 heredoc을 넣으면 따옴표 오류가 나므로, 긴 데이터는 `Write` 도구로 파일을 만든 뒤 실행.

## 7. 운영 절차 메모 (이미 검증된 방식)
- 게시: 사용자가 `editorial/rebuild-20261022/publish/apply-runner.mjs`를 PowerShell에서 실행. `$env:SUPABASE_ACCESS_TOKEN="..."` 설정 → `cd ...\editorial\rebuild-20261022\publish` → `node apply-runner.mjs apply <장>` → `apply` 입력. 장마다 쓰기 직후 해시 검증, 에러 시 해당 장에서 멈춤, 이미 준비 해시인 장은 건너뜀, 시작 전 운영이 관찰값과 다르면 그 장은 건너뜀. 83개 일괄도 이 방식으로 성공했음.
- 롤백: `output/rebuild-publication-20261023/sql/rollback/<장>.sql`(history[0] 복원, 한 장에 한 번 적용했을 때 정확). 장당 history는 최대 14개 버전만 유지.
- 읽기 전용 점검: Supabase MCP `execute_sql`로 `public.kv`의 `ik:blocks:chapter:library.<장>` 버전·게시본 해시·문단 수 조회(쓰기 금지). 이 도구로의 쓰기는 권한 분류기가 막음(사용자 허용 규칙이 있어야 함).
- 운영 화면 확인(내장 브라우저): `https://mantramanse.pages.dev/report/v2/?from=hub&world=w1` → 가상 출생정보 입력(성별 남/여 선택, 시간은 12시간제 입력이라 방향키로 조정) → 장 탭. 시범 항목(self_02 신약·관성)에 맞는 가상 명식: 1979-02-15 14:00 남. 강력 새로고침(Ctrl+F5) 필요.
- 인증 정보·토큰을 채팅에 쓰지 않는다. 개인 정보 대신 가상 데이터만 사용.

## 8. 테스트·검증 명령
- `node tests/rebuild-bundle-20261022.cjs <self|self2|self3|self4|wealth|career|love|health|creative|remedy>` — 항목 검증(problems []가 정상).
- `node tests/rebuild-compose-20261022.cjs`, `node tests/rebuild-pilot-20261022.cjs`, `node tests/reading-focus-eight-sim.cjs`, `node tests/reading-metadata-concurrency.cjs` — 통과 확인됨(수정 전후).
- `tests/ik-sim.js`는 기준선(원래 코드)에서도 `T1 실제 retrieval 됨`에서 실패하는 기존 실패라 무관.

## 9. 사용자 규칙 (유지)
- 운영 DB 쓰기·푸시·배포는 그때그때 사용자 승인. 시기(대운·세운)는 엔진 값만, 사건 단정 금지. 건강 진단·예측 금지, 전생 창작 고지, 개운은 단정·구매 권유 금지. 성별 조건이 필요한 배우자·자녀 풀이는 성별 조건 필수.
- 메모리: `C:\Users\user\.claude\projects\E-------------------------------\memory\` (`feedback_reading-copy-voice`, `reading-copy-architecture`, `rebuild-20261022-progress`).
