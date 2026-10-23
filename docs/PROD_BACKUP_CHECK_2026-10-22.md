# 운영 DB 읽기 전용 백업 확인 · 2026-10-22

대상: Supabase 프로젝트 mantramanse1 (devkslhggrkqtianjamj), `public.kv`. SELECT만 실행했고 쓰기·게시는 없다.

## 현재 운영 상태

- `ik:blocks:chapter:library.timeline_*` 키 84개, 합계 243,163,807자(장당 약 0.4~4.7MB). 카탈로그의 84개 장과 일치.
- 전체 지문(키 정렬 후 `key:md5(value)` 연결의 md5): `ad1b8a0d836f46a45d4d0b9eea72b74a`. 이후 게시 전에 이 값을 다시 계산해 중간 변경을 감지한다.
- 84개 모두 `seedVersion = complete-84-20261020-1`. 로컬 시드(`everyday-all-84-20261021-15`)와 다르므로 10/21 직설형 재작성은 **운영에 게시되지 않은 상태**다.
- 84개 모두 `draft == published`: 미게시 관리자 수정 없음. `review.status` 가진 장 없음.
- 버전은 장별 3~15. 모든 행의 `updated_at`이 10/22 03:23~03:24 UTC로 동일한 것은 `reading-publication-projection.sql`의 `update ... set value=value` 재투영으로 보이며 내용 변경 증거는 아니다(내용 변경은 seedVersion·draft/published로 확인).

## 복구 경로

- 각 행의 `history` 배열에 이전 버전 전체 스냅샷(`draft, published, scenarios, version, at, releaseBackup`)이 내장되어 있다(예: creative_01 2건, self_01 13건). 이전 게시본 복원은 이 history로 가능하다.
- 로컬 `output/blunt-copy-20261021/old.json`은 10/21 05:25 시점 시드 덤프이며 운영 DB 백업이 아니다. 운영 본문 전체의 로컬 파일 백업은 **아직 없다**(243MB는 MCP SQL 경유로 옮기기 부적합).
- 게시 전 조치(요구): 게시 직전에 지문 재확인 + 대상 장별 현재 value를 롤백 SQL로 저장(`tools/prepare-blunt-full-replace.cjs`의 rollback 방식 재사용) + Supabase 대시보드의 자동 백업/PITR 시점 확인.
