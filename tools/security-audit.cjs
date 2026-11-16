// 9단계 보안 점검(코드·마이그레이션 정적 점검): node tools/security-audit.cjs [--write]
//   --write 면 docs/SECURITY_AUDIT.md 에 결과표를 쓴다. 실패 항목이 있으면 종료 코드 1(테스트 tests/security-audit-sim.js 가 부른다).
// 운영 DB 점검(RLS·권한·함수 search_path)은 tools/security-audit.sql 을 Supabase SQL 로 실행한다.
//
// 점검 항목
//   A 인증: /api/community/* 의 모든 요청 처리 함수가 회원·관리자·운영자 확인을 한다(공개 허용 목록 제외, 이유를 적어 둠)
//   B 도배·봇: 회원이 쓰는 쓰기 요청(POST·PUT·PATCH)에 하루 한도(overLimit) 또는 다른 제한이 있다(예외는 이유와 함께)
//   C 감사: 관리자·운영자 쓰기 요청은 감사 로그(audit)를 남긴다
//   D DB: 커뮤니티 마이그레이션의 모든 표가 RLS 켬 + anon/authenticated 권한 회수, 정책(create policy) 없음,
//         security definer 함수는 search_path 고정 + public/anon/authenticated 실행 권한 회수
//   E 비밀값: 브라우저로 가는 파일(community/·gate/·report/admin/)에 서버 비밀값 이름·키 모양이 없다
//   F 업로드: 프로필 사진 업로드는 형식(webp·jpg·png)·크기 한도를 서버에서 확인한다
//   G 개인정보: 회원 찾기·지표 응답에 전화번호·이메일 원문·생년월일을 내보내지 않는다
//   H 기능 스위치: 광장·기록·인연·대화 API 가 기능 스위치를 확인한다
//   I 보안 머리말: 커뮤니티·처음 화면·관리자·회원 API 응답에 보안 머리말을 붙인다
const fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..');
const rd = p => fs.readFileSync(path.join(ROOT, p), 'utf8');
const ls = d => fs.readdirSync(path.join(ROOT, d));

// 인증 없이 열어 두는 처리 함수(이유)
const PUBLIC_OK = {
  'status.js:Get': '공개 단계 표시(처음 화면 카드). 값은 단계 이름뿐',
  'alert.js:Post': '출시 알림 신청(비회원 가능). 봇 함정 칸·IP 시간당 20회 제한·동의 버전 기록',
  'alert.js:Get': '관리자 통계(안에서 isAdmin) 또는 철회 링크(토큰 해시 확인)',
  'enter.js:Post': '입장 쿠키 발급 — 안에서 관리자/회원 토큰·접근 권한 확인(requesterRole)',
  'enter.js:Delete': '입장 쿠키 지우기(나가기)',
  'avatar.js:Get': '프로필 사진 보기 — 커뮤니티 잠금 안쪽(입장 쿠키), 공개 여부는 글 작성자 정보에서 결정',
};
// 하루 한도 대신 다른 제한이 있는 쓰기(이유)
const RATE_OK = {
  'status.js:Put': '관리자 비밀번호만', 'access.js:Post': '관리자 비밀번호만', 'audit.js': '',
  'mod.js:Post': '관리자·운영자 열쇠만', 'launch.js:Put': '관리자 비밀번호만', 'launch.js:Post': '관리자 비밀번호만', 'staff.js:Post': '관리자 비밀번호만',
  'today-copy.js:Put': '관리자·운영 매니저만', 'features.js:Put': '관리자 비밀번호만', 'credits.js:Put': '관리자 비밀번호만',
  'credits.js:Post': '지급은 관리자만, 더 보기는 하루 횟수(morePicksPerDay)·멱등 키', 'enter.js:Post': '쿠키 발급만(쓰기 없음)', 'alert.js:Post': 'IP 시간당 20회(자체 한도)',
  'chat.js:Post': 'MSG_PER_DAY·overLimit', 'test-login.js:Post': '만들기는 관리자 비밀번호만, 코드 교환은 1분·한 번만 쓰는 무작위 코드', 'match.js:Post': 'LIKE_PER_DAY·overLimit',
  'records.js:Delete': '', 'post.js:Delete': '', 'comments.js:Delete': '', 'access.js:Delete': '', 'today-copy.js:Delete': '', 'avatar.js:Delete': '',
};
const AUTH_RE = /\b(viewer|writer|memberOf|need|isAdmin|staffOf|who|requesterRole|w\.res|me\b)\s*\(/;
const AUDIT_ADMIN = ['status.js', 'access.js', 'mod.js', 'launch.js', 'staff.js', 'today-copy.js', 'features.js', 'credits.js', 'members.js'];
const FEATURE = { 'posts.js': 'plaza', 'post.js': 'plaza', 'comments.js': 'plaza', 'react.js': 'plaza', 'today.js': 'records', 'records.js': 'records', 'match.js': 'match', 'verify.js': 'match', 'chat.js': 'chat' };

// 처리 함수 몸통 잘라내기(다음 export 까지)
function handlers(src) {
  const out = []; const re = /export async function onRequest(Get|Post|Put|Patch|Delete)\s*\(/g; let m; const idx = [];
  while ((m = re.exec(src))) idx.push({ method: m[1], at: m.index });
  idx.forEach((h, i) => out.push({ method: h.method, body: src.slice(h.at, i + 1 < idx.length ? idx[i + 1].at : src.length) }));
  return out;
}

function run() {
  const rows = []; const add = (area, item, pass, note) => rows.push({ area, item, pass: !!pass, note: note || '' });
  const dir = 'functions/api/community';
  for (const f of ls(dir).filter(x => x.endsWith('.js')).sort()) {
    const src = rd(dir + '/' + f);
    for (const h of handlers(src)) {
      const key = f + ':' + h.method;
      // 몸통 + 몸통이 부르는 같은 파일 안의 보조 함수(who·manual 등)까지 본다
      // 같은 파일 안에서 인증을 하는 보조 함수(guard·who·manual 등)를 부르면 인증으로 본다
      const helpers = [...src.matchAll(/(?:async )?function (\w+)\s*\([^)]*\)\s*\{([\s\S]*?)\n\}/g)].filter(x => !/^onRequest/.test(x[1]) && AUTH_RE.test(x[2])).map(x => x[1]);
      const authed = AUTH_RE.test(h.body) || helpers.some(n => new RegExp('\\b' + n + '\\(').test(h.body));
      add('A 인증', key, authed || PUBLIC_OK[key], authed ? '' : PUBLIC_OK[key] ? '공개 허용: ' + PUBLIC_OK[key] : '인증 확인 없음');
      if (['Post', 'Put', 'Patch'].includes(h.method)) {
        const limited = /overLimit\(|LIKE_PER_DAY|MSG_PER_DAY|morePicksPerDay/.test(h.body) || /overLimit\(/.test(src) && /need\(|isAdmin/.test(h.body);
        const why = RATE_OK[key];
        add('B 도배·봇', key, limited || why !== undefined, limited ? '' : why !== undefined ? why : '하루 한도 없음');
      }
      if (h.method !== 'Get' && AUDIT_ADMIN.includes(f) && /need\(|isAdmin\(/.test(h.body)) add('C 감사', key, /audit\(/.test(h.body) || /audit\(/.test(src) && f === 'mod.js', /audit\(/.test(h.body) ? '' : '감사 로그 없음');
    }
    if (FEATURE[f]) add('H 기능 스위치', f, (src.match(/featureGate\(request, env, '(\w+)'\)/g) || []).every(x => x.includes("'" + FEATURE[f] + "'")) && /featureGate\(/.test(src), FEATURE[f]);
  }
  // D 마이그레이션
  const migs = ls('supabase/migrations').filter(x => /^2026111[5-9]|^202611[2-3]/.test(x) && x.endsWith('.sql')).sort();
  for (const m of migs) {
    const sql = rd('supabase/migrations/' + m).replace(/--[^\n]*/g, '');
    const tables = [...sql.matchAll(/create table if not exists public\.(\w+)/g)].map(x => x[1]);
    for (const t of tables) {
      add('D DB', m + ' · ' + t + ' RLS', new RegExp('alter table public\\.' + t + '\\s+enable row level security').test(sql), '');
      add('D DB', m + ' · ' + t + ' 권한 회수', new RegExp('revoke all on [^;]*public\\.' + t + '\\b[^;]*from anon, authenticated').test(sql), '');
    }
    add('D DB', m + ' · 정책 없음', !/create policy/i.test(sql), '');
    const fns = [...sql.matchAll(/create or replace function public\.(\w+)\(([^)]*)\)[^$]*?security definer([^$]*?)as \$\$/g)];
    for (const fm of fns) {
      add('D DB', m + ' · ' + fm[1] + '() search_path', /set search_path/.test(fm[3]), '');
      add('D DB', m + ' · ' + fm[1] + '() 실행 권한 회수', new RegExp('revoke all on function [^;]*public\\.' + fm[1] + '\\b[^;]*from public, anon, authenticated').test(sql), '');
    }
  }
  // E 비밀값(브라우저로 가는 파일)
  const clientFiles = [...ls('community').map(x => 'community/' + x), ...ls('gate').map(x => 'gate/' + x), ...ls('report/admin').filter(x => /\.(js|html)$/.test(x)).map(x => 'report/admin/' + x)].filter(p => fs.statSync(path.join(ROOT, p)).isFile() && /\.(js|html|css)$/.test(p));
  // 비밀값 '이름'(설정 안내 문구)은 괜찮고, 값의 모양을 찾는다: 서비스 역할 JWT·결제 비밀 키·운영자 열쇠·서버 환경변수 직접 읽기
  const SECRET = /\bsk_live_[A-Za-z0-9]{10,}|env\.SUPABASE_SERVICE_KEY|process\.env\.|eyJhbGciOi[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.|mts_[0-9a-f]{32}/;
  const leaks = clientFiles.filter(p => SECRET.test(rd(p)));
  add('E 비밀값', '브라우저 파일 ' + clientFiles.length + '개', !leaks.length, leaks.join(', '));
  // F 업로드
  const av = rd('functions/api/community/avatar.js');
  add('F 업로드', 'avatar.js 형식 제한', /webp/.test(av) && /png/.test(av) && /jpe?g/.test(av) && /content-type|type/.test(av), '');
  add('F 업로드', 'avatar.js 크기 한도', /(size|byteLength|length)\s*[><]=?\s*\d|MAX_?(BYTES|SIZE)/i.test(av), '');
  add('F 업로드', 'avatar.js 무작위 파일 이름', /getRandomValues|randomUUID/.test(av), '');
  // G 개인정보
  const mem = rd('functions/api/community/members.js');
  add('G 개인정보', '회원 찾기: 전화번호 안 내보냄', /hasPhone: !!\(p && p\.phone\)/.test(mem) && !/phone: p\.phone|phone: p && p\.phone/.test(mem), '');
  add('G 개인정보', '회원 찾기: 이메일 가림', /maskEmail\(au\.email\)/.test(mem) && !/email: au\.email|email: au && au\.email/.test(mem), '');
  add('G 개인정보', '회원 찾기: 생년 대신 나이대', /ageBand\(/.test(mem) && !/birth_year: v\.birth_year|birthYear:/.test(mem), '');
  add('G 개인정보', '지표: 회원 단위 값 없음', !/user_id/.test((rd('supabase/migrations/20261116_admin_stage7.sql').split('create or replace function public.cm_metrics')[1] || '').split('jsonb_build_object(').slice(1).join('').replace(/select [^)]*user_id[^)]*\)/g, '').match(/'user_?id'/g) || []), '');
  // I 보안 머리말
  const mw = rd('functions/_middleware.js');
  add('I 보안 머리말', '_middleware.js withSecurity', /withSecurity\(ctx\.request/.test(mw) && /nosniff/.test(mw) && /frame-ancestors/.test(mw) && /SECURE_PATH/.test(mw), '');
  // 관리자 대입 막기
  const cm = rd('functions/_community.js');
  add('A 인증', '관리자 인증 대입 막기(authThrottle)', /authThrottle\(request, env\)/.test(cm) && /AUTH_FAIL_MAX = \d+/.test(cm), '');
  return rows;
}

function report(rows) {
  const fails = rows.filter(r => !r.pass), by = {};
  rows.forEach(r => { (by[r.area] = by[r.area] || []).push(r); });
  let md = '# 인연의 광장 보안 점검 결과\n\n`node tools/security-audit.cjs --write` 로 다시 만든다. 운영 DB 점검은 `tools/security-audit.sql`.\n\n';
  md += '| 영역 | 점검 | 통과 |\n|---|---|---|\n' + Object.keys(by).sort().map(a => '| ' + a + ' | ' + by[a].length + ' | ' + by[a].filter(r => r.pass).length + ' |').join('\n') + '\n\n';
  md += fails.length ? '## 실패\n\n' + fails.map(r => '- ' + r.area + ' · ' + r.item + (r.note ? ' — ' + r.note : '')).join('\n') + '\n\n' : '**실패 없음.**\n\n';
  md += '## 예외(이유)\n\n' + rows.filter(r => r.pass && r.note).map(r => '- ' + r.area + ' · ' + r.item + ' — ' + r.note).join('\n') + '\n';
  return { md, fails };
}

if (require.main === module) {
  const rows = run(), { md, fails } = report(rows);
  if (process.argv.includes('--write')) fs.writeFileSync(path.join(ROOT, 'docs/SECURITY_AUDIT.md'), md);
  console.log('security-audit: ' + rows.length + '개 점검, 실패 ' + fails.length + (fails.length ? '\n - ' + fails.map(r => r.area + ' · ' + r.item + ' ' + r.note).join('\n - ') : ''));
  process.exit(fails.length ? 1 : 0);
}
module.exports = { run, report };
