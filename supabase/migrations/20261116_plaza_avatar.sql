-- 운명의 광장 프로필 사진(2026-11-16). member_profiles(2단계에서 만든 새 표)에 칸 1개 추가. 다른 표는 건드리지 않는다.
--   · avatar_path(이미 있음): 회원이 직접 올린 사진의 저장 키(R2 CLIPS_R2, 'cm-av/…'). 비우면 기본 = 내 일간 포스터
--   · poster_gender(새 칸): 일간 포스터를 남·녀 중 어느 그림으로 보일지('M'|'F'). 관리자 화면 '일간·일주 영상'의 일간 포스터(10일간 × 성별)를 쓴다
-- 서버: functions/_plaza.js(authorsOf·avatarOf), functions/api/community/avatar.js
alter table public.member_profiles add column if not exists poster_gender text check (poster_gender is null or poster_gender in ('M','F'));

-- 되돌리기: alter table public.member_profiles drop column if exists poster_gender;
