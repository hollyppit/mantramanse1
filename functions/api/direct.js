// AI 연출 추천 (관리자 전용) — 장면의 연출값을 "추천"만 한다. 저장하지 않고, 관리자가 확인해서 적용해야 반영된다.
// POST /api/direct  { scene: { narration, sceneType, chapter:{id,title}, media?:{type,tags}, previous?:{sceneType}, next?:{sceneType}, factualBasis? } }
//   → { ok, suggestion: { sceneType, preset, pacing, motionIntensity, imageMotion, transition, textAnimation, textPosition, textSize, overlayStrength, pauseAfter, bgmMood, mood, narrativePurpose, visualConcept } }
// AI 는 명리 계산값을 만들거나 고치지 않는다. 이미 쓰인 문장·장면 메타를 보고 "어떻게 보여 줄지"만 고른다. 허용 목록 밖의 값은 서버에서 버린다.
import { json, isAdmin } from '../_lib.js';
import { cleanCinema, SCENE_TYPES, PRESETS } from '../_cinema.js';

const SYSTEM = `당신은 "내 인생을 소재로 한 짧은 영화"의 장면 감독이다. 사용자는 점을 보는 손님이 아니라 이 이야기의 주인공이다.
수호신·신령·안내자·예언자 같은 존재는 없다. 화면 밖의 차분한 전지적 내레이터만 있다.
입력으로 이미 쓰인 내레이션과 장면 정보가 주어진다. 사주 계산값을 만들거나 바꾸지 말고, 이 장면을 어떻게 연출할지만 정한다.
원칙: 설명 장면은 거의 정적(motionIntensity 0~1), 감정 장면은 slow-zoom, 갈등은 조금 빠르게, 전환점은 camera push(3), 경고는 정적, 엔딩은 slow-zoom-out.
motionIntensity 3 은 챕터당 최대 2회, 4 는 리포트 전체에서 거의 쓰지 않는다. 특수 전환(dip-black, dip-white, blur, push-*, zoom, light-leak)은 ACT 전환·전환점에서만 쓴다. 평소에는 fade·crossfade·hard-cut.
핵심 문장 직전과 직후에는 정적(pauseAfter)을 둔다. 멋있어 보이려는 효과는 쓰지 않는다. 이야기의 타이밍을 돕는 것만 고른다.
허용값만 써라.
- sceneType: ${SCENE_TYPES.join(', ')}
- preset: ${PRESETS.join(', ')}
- pacing: FAST, MEDIUM, SLOW, PAUSE
- motionIntensity: 0~4 정수
- imageMotion: none, slow-zoom-in, slow-zoom-out, pan-left, pan-right, pan-up, pan-down, parallax, drift, focus-pull
- transition: fade, crossfade, dip-black, dip-white, blur, push-left, push-right, zoom, hard-cut, light-leak
- textAnimation: fade, fade-up, fade-down, slide-left, slide-right, zoom-in, zoom-out, blur-in, focus-in, word-reveal, line-reveal, typewriter, cinematic-title, impact, whisper, float, parallax-text
- textPosition: top, center, bottom, lower-third / textSize: S, M, L, XL
- overlayStrength: 0~1 / pauseAfter: 0~5000(ms)
- bgmMood: cinematic, minimal, ambient, emotional, tension, hopeful, reflective / mood: calm, awe, reflective, tense, warm, hopeful, lonely, powerful
JSON 한 덩어리로만 답하라: {"sceneType":"","preset":"","pacing":"","motionIntensity":1,"imageMotion":"","transition":"","textAnimation":"","textPosition":"","textSize":"","overlayStrength":0.45,"pauseAfter":0,"bgmMood":"","mood":"","narrativePurpose":"이 장면이 이야기에서 하는 일 한 문장","visualConcept":"어떤 영화적 장면이면 좋을지 한 문장"}`;

async function ask(env, user) {
  const errs = [];
  if (env.ANTHROPIC_API_KEY) {
    try {
      const r = await fetch('https://api.anthropic.com/v1/messages', { method: 'POST', signal: AbortSignal.timeout(30000), headers: { 'content-type': 'application/json', 'x-api-key': env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01' },
        body: JSON.stringify({ model: env.ANTHROPIC_MODEL || 'claude-sonnet-5-5', max_tokens: 600, system: SYSTEM, messages: [{ role: 'user', content: user }] }) });
      if (r.ok) { const d = await r.json(); return (d.content || []).filter(x => x.type === 'text').map(x => x.text).join(''); }
      errs.push('anthropic ' + r.status);
    } catch (e) { errs.push('anthropic ' + ((e && e.message) || e)); }
  }
  if (env.OPENAI_API_KEY) {
    try {
      const r = await fetch('https://api.openai.com/v1/responses', { method: 'POST', signal: AbortSignal.timeout(30000), headers: { 'content-type': 'application/json', authorization: 'Bearer ' + env.OPENAI_API_KEY },
        body: JSON.stringify({ model: env.OPENAI_MODEL || 'gpt-6.1-sol', instructions: SYSTEM, input: user }) });
      if (r.ok) { const d = await r.json(); return typeof d.output_text === 'string' ? d.output_text : (d.output || []).flatMap(o => o.content || []).map(c => c.text || '').join(''); }
      errs.push('openai ' + r.status);
    } catch (e) { errs.push('openai ' + ((e && e.message) || e)); }
  }
  throw new Error(errs.length ? 'AI 호출 실패: ' + errs.join(' / ') : 'AI 키가 없습니다(ANTHROPIC_API_KEY 또는 OPENAI_API_KEY)');
}

const s = (v, n) => (typeof v === 'string' ? v.slice(0, n) : '');
// 입력 정리: 허용한 필드만, 길이 제한 (주민 정보·생년월일은 받지 않는다)
export function cleanInput(sc) {
  sc = sc && typeof sc === 'object' ? sc : {};
  const st = x => (x && typeof x === 'object' ? { sceneType: s(x.sceneType, 30) } : null);
  return { narration: s(sc.narration, 500), sceneType: s(sc.sceneType, 30), chapter: { id: s((sc.chapter || {}).id, 20), title: s((sc.chapter || {}).title, 60) },
    media: sc.media && typeof sc.media === 'object' ? { type: s(sc.media.type, 20), tags: Array.isArray(sc.media.tags) ? sc.media.tags.slice(0, 12).map(t => s(t, 30)) : [] } : null, previous: st(sc.previous), next: st(sc.next) };
}

export async function onRequestPost({ request, env }) {
  if (!isAdmin(request, env)) return json({ error: '관리자 인증이 필요합니다' }, 401);
  let b; try { b = await request.json(); } catch { return json({ error: '잘못된 요청 형식입니다' }, 400); }
  const input = cleanInput(b.scene); if (!input.narration && !input.media) return json({ error: '내레이션 문장이나 미디어 정보가 필요합니다' }, 400);
  let text; try { text = await ask(env, '아래 장면의 연출을 정해 줘.\n' + JSON.stringify(input)); } catch (e) { return json({ error: e.message }, 502); }
  const a = text.indexOf('{'), z = text.lastIndexOf('}'); let d = null; try { d = JSON.parse(text.slice(a, z + 1)); } catch { /* 형식 오류 */ }
  if (!d) return json({ error: 'AI 답이 JSON 형식이 아닙니다' }, 502);
  const sug = cleanCinema(d); sug.narrativePurpose = s(d.narrativePurpose, 160); sug.visualConcept = s(d.visualConcept, 160);
  return json({ ok: true, suggestion: sug });
}
