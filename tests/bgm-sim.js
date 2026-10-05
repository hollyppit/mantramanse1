// BGM 규칙 검증:  node tests/bgm-sim.js
// 음원이 없는 분위기의 장면이 와도 흐르던 곡이 끊기거나 빈 오디오가 만들어지면 안 된다(예전 버그: 주석이 검사 줄을 삼킴).
globalThis.window = globalThis; const made = [];
globalThis.Audio = function (u) { made.push(u); this.volume = 1; this.paused = false; this.play = () => Promise.resolve(); this.pause = () => { this.paused = true; }; };
require('../report/v2/bgm.js'); const B = ReportV2.Bgm, fails = [], ok = (c, m) => { if (!c) fails.push(m); };
B.init({ cinematic: '/api/clipfile?k=a.mp3' });
ok(B.has() && B.KEYS[0] === 'default', '음원 하나만 있어도 has()');
B.play('cinematic'); ok(made.length === 1 && made[0] === '/api/clipfile?k=a.mp3', '인트로: 시네마틱 곡 재생');
B.play('minimal'); B.play('ambient'); B.play('tension'); ok(made.length === 1 && !made.includes(''), '음원 없는 분위기에서는 아무것도 새로 만들지 않는다(곡 유지)');
B.init({ cinematic: '/api/clipfile?k=a.mp3', default: '/api/clipfile?k=base.mp3' }); B.stop(); B.play('tension'); ok(made[made.length - 1] === '/api/clipfile?k=base.mp3', '분위기 음원이 없으면 기본 곡');

// 자동재생이 막힌 경우(온보딩 페이지에서 넘어온 직후): 첫 터치에서 다시 시작해야 한다
const H = {}; let rejectNext = true, plays = 0;
globalThis.document = { addEventListener: (e, f) => { H[e] = f; }, removeEventListener: () => { }, createElement: () => ({ setAttribute() { }, classList: { toggle() { } }, set onclick(f) { } }), body: { appendChild() { } } };
globalThis.Audio = function (u) { this.volume = 1; this.paused = true; this.play = () => { plays++; if (rejectNext) return Promise.reject(new Error('NotAllowedError')); this.paused = false; return Promise.resolve(); }; this.pause = () => { this.paused = true; }; };
B.stop(); B.init({ cinematic: '/api/clipfile?k=a.mp3' }); B.play('cinematic');
setTimeout(() => {
  ok(B.blocked() === true && H.pointerdown, '재생이 막히면 blocked 표시 + 첫 터치 대기');
  rejectNext = false; H.pointerdown();
  setTimeout(() => { ok(plays >= 2 && B.blocked() === false, '첫 터치에서 다시 재생되어 blocked 해제'); }, 100);
}, 100);
setTimeout(() => { console.log(fails.length ? '\n실패 ' + fails.length + '건\n' + fails.map(f => ' ✗ ' + f).join('\n') : '\nBGM 규칙 검증 모두 통과'); process.exit(fails.length ? 1 : 0); }, 700);
