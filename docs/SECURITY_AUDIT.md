# 인연의 광장 보안 점검 결과

`node tools/security-audit.cjs --write` 로 다시 만든다. 운영 DB 점검은 `tools/security-audit.sql`.

| 영역 | 점검 | 통과 |
|---|---|---|
| A 인증 | 57 | 57 |
| B 도배·봇 | 25 | 25 |
| C 감사 | 10 | 10 |
| D DB | 69 | 69 |
| E 비밀값 | 1 | 1 |
| F 업로드 | 3 | 3 |
| G 개인정보 | 4 | 4 |
| H 기능 스위치 | 9 | 9 |
| I 보안 머리말 | 1 | 1 |

**실패 없음.**

## 예외(이유)

- B 도배·봇 · access.js:Post — 관리자 비밀번호만
- B 도배·봇 · alert.js:Post — IP 시간당 20회(자체 한도)
- H 기능 스위치 · chat.js — chat
- H 기능 스위치 · comments.js — plaza
- B 도배·봇 · credits.js:Put — 관리자 비밀번호만
- B 도배·봇 · enter.js:Post — 쿠키 발급만(쓰기 없음)
- A 인증 · enter.js:Delete — 공개 허용: 입장 쿠키 지우기(나가기)
- B 도배·봇 · features.js:Put — 관리자 비밀번호만
- B 도배·봇 · launch.js:Put — 관리자 비밀번호만
- B 도배·봇 · launch.js:Post — 관리자 비밀번호만
- H 기능 스위치 · match.js — match
- B 도배·봇 · mod.js:Post — 관리자·운영자 열쇠만
- H 기능 스위치 · post.js — plaza
- H 기능 스위치 · posts.js — plaza
- H 기능 스위치 · react.js — plaza
- H 기능 스위치 · records.js — records
- B 도배·봇 · staff.js:Post — 관리자 비밀번호만
- A 인증 · status.js:Get — 공개 허용: 공개 단계 표시(처음 화면 카드). 값은 단계 이름뿐
- B 도배·봇 · status.js:Put — 관리자 비밀번호만
- B 도배·봇 · test-login.js:Post — 만들기는 관리자 비밀번호만, 코드 교환은 1분·한 번만 쓰는 무작위 코드
- B 도배·봇 · today-copy.js:Put — 관리자·운영 매니저만
- H 기능 스위치 · today.js — records
- H 기능 스위치 · verify.js — match
