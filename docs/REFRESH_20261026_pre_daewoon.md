# 운영 DB 갱신 안내 · 첫 대운 전 명식 대체 문안 + 개운법 조사 오류 (2026-10-26)

대상 행 4개(모두 기존 행 갱신, 한 줄씩 PowerShell에서 실행, 쓰기 단계에서 `apply` 입력):
`timeline_wealth_14`, `timeline_career_14`, `timeline_love_14` (첫 대운 전 명식 대체 문안 7문단 추가, 35→42문단), `timeline_self_37` (개운법 "물가이" → "물가가" 조사 수정).

준비 파일: `output/rebuild-publication-20261026-pre/` (없으면 `$env:PREPARE_OUT` 지정 후 `node editorial/rebuild-20261022/publish/run-prepare.mjs timeline_wealth_14,timeline_career_14,timeline_love_14,timeline_self_37`).
관찰값(읽기 조회, 2026-10-26): wealth_14 `e641632372229bf680c560d2c46691fd`, career_14 `ac88fb8bebf3a4358faa8e8416d6ca2d`, love_14 `d6cf8e6077f5687346369207fd3ee31a`, self_37 `7b078536ead14f232f4dcdf665c314cf` (모두 v1, draft=published). 운영이 바뀌어 있으면 러너가 멈춥니다.

```powershell
$env:SUPABASE_ACCESS_TOKEN='여기에토큰'
$env:PREPARE_OUT='rebuild-publication-20261026-pre'
node "E:\만트라 스튜디오 사업\앱 개발 소스\자체 만세력 어플\editorial\rebuild-20261022\publish\apply-runner.mjs" dry
node "E:\만트라 스튜디오 사업\앱 개발 소스\자체 만세력 어플\editorial\rebuild-20261022\publish\apply-runner.mjs" apply
```
기대: dry `ok` 4줄 → apply 후 각 행 version 2. 되돌리기는 같은 폴더의 `sql/rollback/<장>.sql`.
