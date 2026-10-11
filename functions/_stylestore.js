// 풀이 문체 설정의 저장·조회 도우미. 파일명이 _로 시작해 라우트로 노출되지 않는다.
//   style:cfg   활성 설정 { ver, at, config }          — 읽기 경로(풀이 생성기들이 매 호출마다 읽는다)
//   style:hist  버전 이력 [{ ver, at, note, config }]    — 최근 40개, 최신이 앞. 롤백은 과거 설정을 "새 버전"으로 다시 저장한다
// KV 오류·설정 없음이면 기본 설정(단정형)으로 동작한다 — 풀이 생성이 문체 저장소 때문에 멈추지 않는다.
import { DEFAULT_CONFIG, cleanConfig, resolveStyle, directive, storyDirective, sig, STYLE_KO } from './_style.js';

export const MAX_HIST = 40;
export async function loadStyle(kv) {
  try {
    const a = kv && await kv.get('style:cfg', 'json');
    if (a && a.config) return { ver: +a.ver || 1, at: a.at || '', config: cleanConfig(a.config) };
  } catch { /* 기본값 */ }
  return { ver: 0, at: '', config: JSON.parse(JSON.stringify(DEFAULT_CONFIG)) };
}
export async function loadHist(kv) { try { return (kv && await kv.get('style:hist', 'json')) || []; } catch { return []; } }

export async function saveStyle(kv, config, note, extra) {
  const cur = await loadStyle(kv), hist = await loadHist(kv), ver = Math.max(cur.ver, hist.reduce((m, h) => Math.max(m, h.ver), 0)) + 1;
  const rec = { ver, at: new Date().toISOString(), config: cleanConfig(config) };
  if (cur.ver === 0 && !hist.length) hist.unshift({ ver: 0, at: '', note: '기본값(저장 전)', config: cur.config }); // 처음 저장할 때 기본값도 되돌릴 수 있게 남긴다
  hist.unshift({ ...rec, note: String(note || '').slice(0, 120), ...(extra || {}) });
  await kv.put('style:cfg', JSON.stringify(rec));
  await kv.put('style:hist', JSON.stringify(hist.slice(0, MAX_HIST)));
  return rec;
}

// 생성기가 쓰는 한 덩어리: 어느 문체를 쓸지(챕터/분야 키 순서대로), 프롬프트 지시문, 캐시 서명, 메타.
// opts: { structure, soft }
export function styleFor(loaded, keys, opts) {
  const id = resolveStyle(loaded.config, keys), text = directive(loaded.config, id, opts), story = storyDirective(loaded.config);
  return { id, name: STYLE_KO[id], ver: loaded.ver, directive: text, story, sig: sig(id + '|' + loaded.ver + '|' + text + '|' + story), meta: { id, ver: loaded.ver } };
}
