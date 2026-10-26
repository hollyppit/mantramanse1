# 운영 카탈로그 챕터 이름 게시 · 대인관계 궁합 (2026-10-26)

`timeline_self_28`의 이름을 '잘 맞는 일주와 충돌하는 일주' → '대인관계 궁합'으로 바꿉니다(제목·질문만, 카탈로그 v13 → v14). 지금도 화면에서는 코드가 새 이름으로 덮어써서 보이므로, 이 게시는 관리자 화면·저장본과 이름을 맞추는 정리 작업입니다.

준비 파일: `output/rebuild-publication-20261026-title/` (없으면 `node editorial/rebuild-20261022/publish/prepare-title.mjs`).
관찰값(읽기 조회): 게시 카탈로그 v13, md5 `815d59b9ef57c613b8930716dfe1b187`, 초안=게시. 달라져 있으면 멈춥니다. 읽기 전용 모의 실행은 이미 통과(`DRYRUN-OK catalog version 13 -> 14`).

```powershell
$env:SUPABASE_ACCESS_TOKEN='여기에토큰'
node "E:\만트라 스튜디오 사업\앱 개발 소스\자체 만세력 어플\editorial\rebuild-20261022\publish\run-sql.mjs" rebuild-publication-20261026-title dry
node "E:\만트라 스튜디오 사업\앱 개발 소스\자체 만세력 어플\editorial\rebuild-20261022\publish\run-sql.mjs" rebuild-publication-20261026-title apply
```
되돌리기: 같은 명령의 `apply`를 `rollback`으로 바꿉니다(이력의 `backup-before-title-20261026` 사용).
