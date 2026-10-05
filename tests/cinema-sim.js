// 시네마틱 레이어 검증 (스키마·분절·프리셋·강도 제한·번역기·감독·렌더 HTML·접근성·기존 데이터 호환):  node tests/cinema-sim.js
const fs = require('fs'), path = require('path'), vm = require('vm'), os = require('os'), url = require('url');
const root = path.join(__dirname, '..');
vm.runInThisContext(fs.readFileSync(path.join(root, 'engine.js'), 'utf8'), { filename: 'engine.js' });
globalThis.window = globalThis;
['chapters', 'saju-data', 'rules', 'narrator', 'cinema', 'translator', 'content', 'content-pro', 'content-pro2', 'verdict', 'remedy', 'media', 'scenes', 'director', 'compose', 'charts', 'cinema-render'].forEach(f => vm.runInThisContext(fs.readFileSync(path.join(root, 'report/v2', f + '.js'), 'utf8'), { filename: f + '.js' }));
const M = globalThis.Manse, R = globalThis.ReportV2, K = R.Cinema, T = R.Translator, fails = [];
const ok = (c, m) => { if (!c) fails.push(m); };
const sdOf = (y, m, d, h, g) => R.SajuData.build(M.compute({ year: y, month: m, day: d, hour: h, minute: 0, calendar: 'solar', leap: false, gender: g, city: '서울' }), { now: Date.UTC(2026, 9, 5) });
const cases = [[1990, 5, 17, 14, 'M'], [1984, 2, 10, 6, 'F'], [1974, 9, 3, 23, 'M'], [2000, 12, 25, 12, 'F'], [1964, 1, 15, 11, 'M'], [1992, 6, 23, 1, 'M'], [1981, 11, 8, 9, 'F']];

console.log('1. 텍스트 자동 분절');
const seg = K.splitSegments('하지만 중요한 순간마다 이상하게 판이 커진다.');
ok(seg.map(s => s.text).join('|') === '하지만|중요한 순간마다|이상하게|판이 커진다.', '예시 문장 분절: ' + seg.map(s => s.text).join('|'));
ok(seg[0].emphasis === 'soft' && seg[2].emphasis === 'pause' && seg[2].animation === 'blur-in' && seg[3].emphasis === 'impact' && seg[3].animation === 'zoom-in', '강조/애니메이션: soft·pause(blur-in)·impact(zoom-in)');
const long = K.splitSegments('시작하는 힘과 지키는 힘은 전혀 다른 능력이기 때문이다.\n무언가 떠오르면 결국 현실로 꺼내놓아야 하는 사람이다.');
ok(long.every(s => s.text.replace(/\s/g, '').length <= 14), '한 조각이 길지 않음(14자 이하): ' + long.map(s => s.text.length));
ok(long.some(s => s.block === 1) && long[0].block === 0, '줄바꿈 = 블록 경계');

console.log('2. 기존 데이터 호환(마이그레이션 fallback)');
const legacy = K.resolve({ sceneType: 'insight' }, []);
ok(legacy.sceneType === 'EXPLANATION' && legacy.pacing === 'MEDIUM' && legacy.motionIntensity === 1 && legacy.transition === 'crossfade', 'insight → EXPLANATION/MEDIUM/1/crossfade');
const blank = K.resolve({}, []);
ok(blank.sceneType === 'EXPLANATION' && blank.pacing === 'MEDIUM' && blank.motionIntensity === 1 && blank.transition === 'crossfade' && blank.overlayStrength === 0.45, '필드가 하나도 없는 장면: ' + JSON.stringify(blank).slice(0, 80));
ok(K.resolve({ sceneType: 'unknownType' }, []).sceneType === 'EXPLANATION', '알 수 없는 종류도 EXPLANATION');
const bad = K.clean({ sceneType: 'NOPE', pacing: 'WARP', motionIntensity: 99, imageMotion: 'spin', transition: 'fireworks', textAnimation: 'explode', overlayStrength: 5, focalPoint: { x: 9, y: -1 }, segments: [{ text: '' }, { text: '가', emphasis: 'x' }] });
ok(!('sceneType' in bad) && !('pacing' in bad) && bad.motionIntensity === 4 && !('imageMotion' in bad) && !('transition' in bad) && !('textAnimation' in bad) && bad.overlayStrength === 1 && bad.focalPoint.x === 1 && bad.focalPoint.y === 0 && bad.segments.length === 1 && bad.segments[0].emphasis === 'normal', '허용 밖 값은 버리거나 범위로 고정');

console.log('3. 프리셋 14종 · 우선순위');
ok(K.PRESET_NAMES.length === 14 && ['CINEMATIC_INTRO', 'CHARACTER_REVEAL', 'QUIET_REFLECTION', 'DAILY_REALITY', 'REALITY_CHECK', 'TENSION', 'DISCOVERY', 'TURNING_POINT', 'TIMELINE', 'WARNING', 'OPPORTUNITY', 'EMOTIONAL', 'CLIMAX', 'ENDING'].every(n => K.PRESETS[n]), '프리셋 14종');
K.PRESET_NAMES.forEach(n => { const c = K.clean(K.PRESETS[n]); ok(Object.keys(c).length === Object.keys(K.PRESETS[n]).length, n + ': 프리셋 값이 전부 허용값'); ok(K.SCENE_TYPES.includes(K.PRESETS[n].sceneType), n + ': sceneType'); });
const rs = K.resolve({ sceneType: 'insight', cinema: { preset: 'TENSION' } }, []);
ok(rs.sceneType === 'CONFLICT' && rs.pacing === 'FAST' && rs.imageMotion === 'pan-left' && rs.transition === 'hard-cut', '프리셋만 골라도 기본 연출 적용');
const lay = K.resolve({ sceneType: 'insight', cinema: { pacing: 'SLOW' } }, [{ preset: 'WARNING' }, { pacing: 'FAST', transition: 'blur' }, { transition: 'hard-cut' }]);
ok(lay.sceneType === 'WARNING' && lay.pacing === 'SLOW' && lay.transition === 'hard-cut' && lay.imageMotion === 'none' && lay.textAnimation === 'whisper', '우선순위: 장면 > 클립 > 기본 연출 > 프리셋');

console.log('4. 모션 강도 · 전환 제한');
const sc = [1, 2, 3, 4, 5].map(i => ({ cinema: { motionIntensity: i % 2 ? 3 : 4 } }));
const st = K.limitIntensity(sc);
const cnt = n => sc.filter(s => s.cinema.motionIntensity === n).length;
ok(cnt(4) <= 1 && cnt(3) <= 2 && st.four <= 1, '강도 4 ≤ 1(리포트), 강도 3 ≤ 2(챕터): ' + sc.map(s => s.cinema.motionIntensity));
ok(K.limitTransition({ transition: 'zoom', sceneType: 'EXPLANATION' }) === 'crossfade' && K.limitTransition({ transition: 'zoom', sceneType: 'EXPLANATION' }, true) === 'zoom' && K.limitTransition({ transition: 'dip-black', sceneType: 'TURNING_POINT' }) === 'dip-black' && K.limitTransition({ transition: 'hard-cut', sceneType: 'WARNING' }) === 'hard-cut', '특수 전환은 ACT 전환·turning point 에서만');
ok(R.CinemaRender.camVars({ imageMotion: 'slow-zoom-in', motionIntensity: 2 }, false).on === true && R.CinemaRender.camVars({ imageMotion: 'slow-zoom-in', motionIntensity: 0 }, false).on === false && R.CinemaRender.camVars({ imageMotion: 'slow-zoom-in', motionIntensity: 4 }, true).on === false, '강도 0·reduced-motion → 카메라 정지');

console.log('5. 장면 타이밍 · 정적 구간 · 시퀀스');
const b = K.build({ cinema: { preset: 'TURNING_POINT', segments: [{ text: '그런데', emphasis: 'soft', animation: 'fade', block: 0 }, { text: '여기서 판이 바뀐다.', emphasis: 'impact', animation: 'zoom-in', block: 0 }] } }, []);
ok(b.timing.at[1] - b.timing.at[0] > 1100, 'impact 직전·직전 앞 조각 뒤에 정적 구간');
ok(b.timing.total > b.timing.end, '마지막 impact 뒤에도 여운(총 시간 > 마지막 등장)');
const fast = K.build({ cinema: { pacing: 'FAST', segments: [{ text: '가나다라마바사', emphasis: 'normal', animation: 'fade', block: 0 }] } }, []), slow = K.build({ cinema: { pacing: 'PAUSE', segments: [{ text: '가나다라마바사', emphasis: 'normal', animation: 'fade', block: 0 }] } }, []);
ok(slow.timing.total > fast.timing.total, 'PAUSE 가 FAST 보다 길다');
ok(b.sequence.some(m => m.target === 'background' && m.action === 'dim') && b.sequence.some(m => m.target === 'camera') && b.sequence.some(m => m.target === 'text-2' && m.action === 'impact') && b.sequence.every((m, i, a) => !i || a[i - 1].at <= m.at), 'motionSequence: 배경 dim · 카메라 · 텍스트 impact, 시간순');
const own = K.build({ cinema: { segments: [{ text: '가', block: 0 }], motionSequence: [{ at: 500, target: 'text-1', action: 'fade-up', duration: 300 }, { at: 0, target: 'evil', action: 'x' }] } }, []);
ok(own.sequence.length === 1 && own.sequence[0].at === 500, '관리자 motionSequence 우선(잘못된 항목은 제거)');

console.log('6. REAL-LIFE TRANSLATOR: 명리 용어는 화면에 나오지 않는다');
const all = [];
cases.forEach(c => {
  const sd = sdOf.apply(null, c), vars = R.Narrator.heroVars(sd, '백진우');
  const pr = T.prologue(sd, '백진우', vars), en = T.ending(sd, '백진우', vars), lifes = ['c03', 'c05', 'c08'].reduce((a, k) => a.concat(T.chapterScenes(k, sd, vars)), []);
  const texts = [].concat(pr, en, lifes).reduce((a, s) => a.concat((s.cinema.segments || []).map(g => g.text), (s.profile || []).map(p => p.value)), []);
  all.push.apply(all, texts);
  ok(texts.every(t => !T.TERMS.test(t)), '화면 문구에 명리 용어(식상·재성·신약 …) 없음 ' + c + ': ' + texts.filter(t => T.TERMS.test(t)).join(' / '));
  ok(texts.every(t => !/수호|신령|각성|소환|선택받/.test(t)), '수호신 어휘 없음 ' + c);
  ok(texts.every(t => !/\{[^}]*\}/.test(t)), '미치환 자리표시자 없음');
  const p = T.profile(sd, '백진우'); ok(p.character === '백진우' && p.role && p.coreDrive && p.strength && p.weakness && p.hiddenDesire && /사이의 충돌$/.test(p.conflict), '캐릭터 프로필 7칸 동적 생성');
  ok(T.basis(sd).dominant === sd.dominantGroup && T.basis(sd).weakest === sd.weakestGroup && T.basis(sd).groups.length === 5, 'factualBasis 는 계산값 그대로(내부 보존)');
  ok(pr.map(s => s.sceneId).join() === 'pro_1,pro_2,pro_3,pro_title,pro_hero,pro_profile,pro_analogy', '프롤로그 순서: ' + pr.map(s => s.sceneId));
  ok(pr.find(s => s.sceneId === 'pro_title').cinema.segments[0].text === 'THE STORY OF 백진우' && T.prologue(sd, '', R.Narrator.heroVars(sd, '')).find(s => s.sceneId === 'pro_title').cinema.segments[0].text === 'MY STORY', '타이틀: THE STORY OF 이름 / MY STORY');
  ok(/백진우다\.$/.test(pr.find(s => s.sceneId === 'pro_3').cinema.segments[1].text) && /지수다\.$/.test(T.ending(sd, '지수').find(s => s.sceneId === 'end_4').cinema.segments[1].text) && /민준이다\.$/.test(T.ending(sd, '민준').find(s => s.sceneId === 'end_4').cinema.segments[1].text), '이름 + 이다/다 받침 처리');
  ok(T.ending(sd, '').find(s => s.sceneId === 'end_4').cinema.segments[1].text === '결국 당신이다.', '이름이 없으면 당신');
});
const money = T.moneyScene(sdOf(1990, 5, 17, 14, 'M'), {}); ok(money.length === 1 && money[0].cinema.segments.length >= 4, '돈 장면');
const anaTxt = cases.map(c => T.analogy(sdOf.apply(null, c)));
ok(anaTxt.every(a => /영화로 비유한다면/.test(a.intro) && /구조와 비슷하다\.$/.test(a.tail) && !/입니다/.test(a.line)), '영화 비유는 단정하지 않고 "구조와 비슷하다"로 보조');
ok(all.filter(t => /아이언맨|닥터 스트레인지|윌리 웡카|머니볼|캡틴|헤르미온느/.test(t)).length > 0, '영화 캐릭터는 설명 도구로만 등장');

console.log('7. 감독: 챕터 장면 구성');
const lib = R.Compose.library(null), cfg = R.Chapters.forProject(null, 'full'), sd0 = sdOf(1990, 5, 17, 14, 'M');
const rep = R.Compose.build(sd0, lib, cfg, { name: '백진우' });
ok(rep.meta.warnings.length === 0, '경고 0');
ok(rep.acts.length === 5 && rep.acts.map(a => a.title).join() === 'WHO AM I,THE WORLD,THE CONFLICT,TIME,CHOICE', '5막 구조: ' + rep.acts.map(a => a.title));
ok(rep.chapters.every(c => c.scenes[0].kind === 'opener' && c.scenes[0].hook && /^CHAPTER \d\d · /.test(c.scenes[0].hook.label)), '모든 챕터가 검은 화면 + 질문 오프닝으로 시작');
ok(rep.chapters.slice(0, -1).every(c => c.scenes.some(s => s.sceneType === 'chapterEnding' && s.nextHook && s.nextHook.line)), '챕터 끝에 다음 장면 예고(NEXT HOOK)');
ok(['c03', 'c05', 'c08'].every(k => { const c = rep.chapters.find(x => x.base === k); return c.scenes.some(s => s.kind === 'script'); }), '성향·약점·돈 챕터에 현실 장면(DAILY_LIFE) 삽입');
rep.chapters.forEach(c => { const three = c.scenes.filter(s => K.resolve(s, [s.cinemaAuto]).motionIntensity === 3).length; ok(three <= 2, c.id + ' 강도 3 이 챕터당 2회 이하'); });
ok(rep.chapters.reduce((n, c) => n + c.scenes.filter(s => K.resolve(s, [s.cinemaAuto]).motionIntensity >= 4).length, 0) <= 1, '강도 4 는 전체 1회 이하');
const c16 = rep.chapters.find(c => c.base === 'c16'); ok(K.resolve(c16.scenes.find(s => s.sceneType === 'insight'), [c16.scenes.find(s => s.sceneType === 'insight').cinemaAuto]).sceneType === 'TURNING_POINT', '현재 대운 = TURNING_POINT');
const warn = rep.chapters.find(c => c.base === 'c05').scenes.find(s => s.sceneType === 'warning'); const wr = K.resolve(warn, [warn.cinemaAuto]); ok(wr.imageMotion === 'none' && wr.motionIntensity === 0, '경고 장면 = 정적');
// 규칙: 연속 3개 같은 종류면 박자 변경, 전체 장면 종류가 하나로 쏠리지 않음
const kinds = new Set(); rep.chapters.forEach(c => c.scenes.forEach(s => kinds.add(K.resolve(s, [s.cinemaAuto]).sceneType))); ok(kinds.size >= 6, '장면 종류 다양성 ' + kinds.size);
// 데이터 장면과 영화 장면이 교차
const seq = rep.chapters.find(c => c.base === 'c08').scenes.map(s => s.sceneType + (s.kind ? ':' + s.kind : '')).join('>'); ok(/opener.*chart.*insight.*script.*explanation/.test(seq.replace(/cinema:/g, '')), '영화(오프닝) → 데이터(chart) → 풀이 → 현실 장면 리듬: ' + seq);
// 기존 AI/서버 payload 가 새 장면 때문에 깨지지 않음
ok(JSON.stringify(R.Compose.mediaPayload(rep, lib)).length > 2 && R.Compose.aiPayload(rep).chapters.length === rep.chapters.length, 'AI payload 정상');

console.log('8. 렌더 HTML · 접근성');
const sc0 = T.prologue(sd0, '백진우', {})[0], h = R.CinemaRender.html(sc0, { reduce: false }), hr = R.CinemaRender.html(sc0, { reduce: true });
ok(/class="cn-scene/.test(h) && /data-cn-type="INTRO"/.test(h) && /--cn-dur:\d+ms/.test(h) && /data-e="impact"/.test(h) && /style="--at:\d+ms/.test(h), '장면 HTML: 타입·시간·강조 속성');
ok(!/cn-cam-on/.test(hr) && /data-motion="none"/.test(hr), 'reduced-motion: 카메라 정지');
const hz = R.CinemaRender.html({ cinema: { preset: 'CINEMATIC_INTRO', segments: [{ text: '느리게 타자', emphasis: 'normal', animation: 'typewriter', block: 0 }, { text: '한 단어씩 나타난다', emphasis: 'normal', animation: 'word-reveal', block: 0 }, { text: '큰 이동', emphasis: 'normal', animation: 'slide-left', block: 0 }] }, bg: 'black' }, { reduce: true });
ok(!/class="cn-c"|class="cn-w"/.test(hz) && !/data-a="(typewriter|slide-left|word-reveal)"/.test(hz) && /느리게 타자/.test(hz) && /큰 이동/.test(hz), 'reduced-motion: typewriter·word·slide 를 페이드로 단순화(문장은 그대로)');
const ht = R.CinemaRender.html({ cinema: { segments: [{ text: '타자', emphasis: 'normal', animation: 'typewriter', block: 0 }] } }, {});
ok(/aria-hidden="true"><i class="cn-c"/.test(ht) && /class="cn-sr">타자</.test(ht), 'typewriter: 글자 span 은 aria-hidden, 읽기용 텍스트 별도 제공');
ok(/<video[^>]*preload="metadata"/.test(R.CinemaRender.html({ cinema: {} , sceneType: 'insight', text: '가' }, { media: { type: 'video', url: '/a.mp4', posterUrl: '/p.webp' } })), '영상은 metadata 만 preload(다음 장면 이외는 지연 로드)');
ok(!/transition:\s*(width|height|top|left)/.test(fs.readFileSync(path.join(root, 'report/v2/cinema.css'), 'utf8')), '레이아웃을 흔드는 transition 없음(transform/opacity 위주)');
ok(/@media \(prefers-reduced-motion: reduce\)/.test(fs.readFileSync(path.join(root, 'report/v2/cinema.css'), 'utf8')), 'CSS reduced-motion 분기');

console.log('9. 서버 검증 미러(functions/_cinema.js)');
const tmp = path.join(os.tmpdir(), 'cinema-srv.mjs'); fs.writeFileSync(tmp, fs.readFileSync(path.join(root, 'functions/_cinema.js'), 'utf8'));
import(url.pathToFileURL(tmp).href).then(S => {
  const sample = { sceneType: 'CONFLICT', preset: 'TENSION', pacing: 'FAST', motionIntensity: 2, imageMotion: 'pan-left', transition: 'hard-cut', textAnimation: 'blur-in', textPosition: 'bottom', textSize: 'L', textEmphasis: 'impact', overlayStrength: 0.5, focalPoint: { x: 0.3, y: 0.7 }, pauseAfter: 300, bgmMood: 'tension', mood: 'tense' };
  const a = S.cleanCinema(sample), b = K.clean(sample);
  ['sceneType', 'preset', 'pacing', 'motionIntensity', 'imageMotion', 'transition', 'textAnimation', 'textPosition', 'textSize', 'textEmphasis', 'overlayStrength', 'pauseAfter', 'bgmMood', 'mood'].forEach(k => ok(a[k] === b[k] && a[k] !== undefined, '서버/클라이언트 동일: ' + k));
  ok(JSON.stringify(a.focalPoint) === JSON.stringify(b.focalPoint), '서버/클라이언트 동일: focalPoint');
  ok(S.SCENE_TYPES.join() === K.SCENE_TYPES.join() && S.PRESETS.join() === K.PRESET_NAMES.join(), '허용 목록 동기화(sceneType·preset)');
  const evil = S.cleanCinema({ sceneType: 'X', pacing: 'Y', motionIntensity: 'abc', evil: '<script>' }); ok(Object.keys(evil).length === 0, '서버: 허용 밖 값 모두 제거');
  const d = S.cleanCinemaDefaults({ WARNING: { motionIntensity: 0, imageMotion: 'none' }, NOPE: { pacing: 'FAST' } }); ok(d.WARNING && !d.NOPE, '기본 연출: 알 수 없는 sceneType 제거');
  console.log(fails.length ? '\n실패 ' + fails.length + '건\n' + fails.map(f => ' ✗ ' + f).join('\n') : '\n시네마 레이어 검증 모두 통과');
  process.exit(fails.length ? 1 : 0);
});
