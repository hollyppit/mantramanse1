// 운영 모니터(workers/production-monitor.js) 배포 + 비밀 값 설정.
//   node tools/deploy-production-monitor.cjs            → 모니터 배포, 모니터 비밀 값 설정, 사이트(Pages)에 모니터 열쇠 설정
//   node tools/deploy-production-monitor.cjs --pages-only → 사이트(Pages)에 모니터 열쇠만 설정(모니터 배포 없음)
// 비밀 값은 output/server-monitor/private-auth.json(git 제외)에 한 번 만들어 두고 다시 쓴다. 화면·로그에 값을 출력하지 않는다.
//   admin   : 모니터 수동 실행용 관리자 토큰(MONITOR_ADMIN_TOKEN)
//   reading : 유료 세계의 잠긴 장도 점검하기 위한 모니터 전용 열쇠(MONITOR_READING_KEY). 모니터와 사이트에 같은 값으로 넣는다.
// 사이트(Pages) 비밀 값은 다음 배포부터 적용되므로, 사이트 쪽은 이 스크립트 뒤에 배포(main 푸시 또는 재배포)해야 한다.
const fs = require('fs'), crypto = require('crypto'), { spawnSync } = require('child_process');
const token = process.env.CLOUDFLARE_API_TOKEN || fs.readFileSync('E:/만트라 스튜디오 사업/앱 개발 소스/Cloudflare Workers API token 260411.txt', 'utf8').trim();
const FILE = 'output/server-monitor/private-auth.json';
const saved = fs.existsSync(FILE) ? JSON.parse(fs.readFileSync(FILE, 'utf8')) : {};
const secrets = { admin: saved.admin || crypto.randomBytes(32).toString('hex'), reading: saved.reading || crypto.randomBytes(32).toString('hex') };
fs.writeFileSync(FILE, JSON.stringify(secrets, null, 2));
const env = { ...process.env, CLOUDFLARE_API_TOKEN: token, CLOUDFLARE_ACCOUNT_ID: '9691f5fe73bf481a5d884db649c7eb01', WRANGLER_SEND_METRICS: 'false' };
const run = (args, input) => {
  const r = spawnSync(process.execPath, ['output/rag-deploy-tools/node_modules/wrangler/bin/wrangler.js', ...args], { env, input, encoding: 'utf8', maxBuffer: 4 * 1024 * 1024, timeout: 120000 });
  // 비밀 값이 실수로 출력에 섞여도 지운다
  const clean = s => String(s || '').split(secrets.reading).join('[hidden]').split(secrets.admin).join('[hidden]').split(token).join('[hidden]');
  if (r.status) throw Error(clean(r.stderr || r.stdout).slice(-2000));
  console.log(clean(r.stdout).trim().split('\n').slice(-4).join('\n'));
};
const pagesOnly = process.argv.includes('--pages-only');
if (!pagesOnly) {
  run(['deploy', '-c', 'workers/production-monitor.wrangler.toml']);
  run(['secret', 'bulk', '-c', 'workers/production-monitor.wrangler.toml'], JSON.stringify({ MONITOR_ADMIN_TOKEN: secrets.admin, CF_MONITOR_TOKEN: token, MONITOR_READING_KEY: secrets.reading }));
}
// 사이트(Pages 프로덕션)에 같은 열쇠: 이 한 값만 넣는다(다른 환경변수는 건드리지 않는다)
run(['pages', 'secret', 'put', 'MONITOR_READING_KEY', '--project-name', 'mantramanse'], secrets.reading);
