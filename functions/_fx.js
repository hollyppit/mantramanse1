// 연출(자막·전환·목소리·영상) 설정 검증. 파일명이 _로 시작해 라우트로 노출되지 않는다.
// report/fx.js의 FIELDS와 같은 범위를 쓴다. 한쪽을 바꾸면 다른 쪽도 바꿀 것. 쓰는 곳: api/clips.js, api/intro.js
// 연출 옵션 검증표 (report/fx.js의 FIELDS와 같은 범위). 배열=허용 값, [min,max]=숫자 범위, 'S'=짧은 문자열, 'H'=#색상코드.
const FONT_KEYS = ['gothic', 'pretty', 'myeongjo', 'gowun', 'gowundodum', 'hanna', 'dohyeon', 'bagel', 'jua', 'dongle', 'gamja', 'hi', 'single', 'poor', 'pen', 'gaegu', 'dokdo', 'brush', 'songmyung', 'yeonsung', 'gugi', 'stylish', 'cute', 'kirang', 'sunflower', 'eulji', 'eulji10', 'euljioldae', 'hannapro', 'melona', 'taom', 'binggrae', 'lv1', 'lv2', 'football', 'bazzi', 'maple', 'cookie', 'infinity', 'yes', 'ridi', 'gmarket', 'suit', 'paperlogy', 'spoqa', 'nsround', 'ssurround', 'dangdang', 'supermagic', 'meongi', 'lotte', 'mango', 'moneyround', 'samlip', 'eyes', 'bokeh', 'crooked', 'delta', 'player', 'yacheR', 'kimhoon', 'eunyoung', 'dodam', 'muruk', 'ahnjg', 'butpen', 'doldam', 'sketchbook', 'poster', 'parkdh', 'meetme', 'okticon'];
const TR_IN = ['cut', 'fade', 'dissolve', 'slide-left', 'slide-right', 'slide-up', 'zoom-in', 'zoom-out', 'wipe', 'flash'];
const TR_OUT = ['cut', 'fade', 'dissolve', 'slide-left', 'slide-up', 'zoom-in', 'wipe', 'flash'];
const FX = {
  trans: { in: TR_IN, out: TR_OUT, dur: [0.1, 3] },
  sub: {
    font: FONT_KEYS, weight: ['400', '500', '700', '900'], italic: ['normal', 'italic'], size: ['S', 'M', 'L'], fs: [0.5, 40], color: ['ivory', 'white', 'gold', 'yellow'], colorHex: 'H', align: ['center', 'left', 'right'], lh: [0.8, 3], ls: [-10, 60],
    pos: ['bottom', 'middle', 'top'], x: [0, 100], y: [0, 100], w: [10, 100], rot: [-45, 45],
    strokeW: [0, 15], strokeColor: 'H', shOn: ['off', 'on'], shX: [-30, 30], shY: [-30, 30], shBlur: [0, 60], shColor: 'H', glowBlur: [0, 80], glowColor: 'H',
    bg: ['none', 'shade', 'box'], bgColor: 'H', bgOpacity: [0, 100], bgRadius: [0, 100], padX: [0, 200], padY: [0, 100],
    anim: ['none', 'fade', 'rise', 'drop', 'pop', 'zoom', 'blur', 'slide-l', 'slide-r', 'bounce', 'flip', 'type', 'word', 'char'], animDur: [0.1, 3], wordDelay: [0.02, 1], typeSpeed: [3, 60],
    animOut: ['none', 'fade', 'fall', 'lift', 'shrink', 'blur', 'slide-l', 'slide-r'], animOutDur: [0.1, 3], emph: ['none', 'pulse', 'float', 'shake', 'blink', 'wobble', 'glow'], emphSpeed: [0.3, 6], readCps: [0, 30],
  },
  voice: { on: ['off', 'on'], engine: ['browser', 'eleven', 'openai'], name: 'S', mode: ['cue', 'whole'], rate: [0.5, 2], pitch: [0.5, 2], vol: [0, 1], delay: [0, 10], fit: ['stretch', 'off'], pad: [0, 3],
    elVoice: 'I', elModel: ['eleven_multilingual_v2', 'eleven_v3', 'eleven_flash_v2_5', 'eleven_turbo_v2_5'], elStability: [0, 1], elSimilarity: [0, 1], elStyle: [0, 1], elSpeed: [0.7, 1.2],
    oaVoice: ['alloy', 'ash', 'ballad', 'coral', 'echo', 'fable', 'nova', 'onyx', 'sage', 'shimmer', 'verse', 'marin', 'cedar'], oaModel: ['gpt-4o-mini-tts', 'tts-1', 'tts-1-hd'], oaInstr: 'T', oaSpeed: [0.5, 2] },
  video: { speed: [0.25, 2], vol: [0, 1], duck: ['off', 'on'], duckVol: [0, 1], fadeIn: [0, 5], fadeOut: [0, 5], fit: ['contain', 'cover'], loop: ['auto', 'reverse', 'black', 'freeze', 'off'], trimStart: [0, 600], trimEnd: [0, 600], hold: [0, 10] },
};
const MAX_CUES = 80;

// 지정된 값만 남긴다. 비어 있으면 "기본 연출을 따름".
export function cleanFx(fx) {
  const out = {};
  if (!fx || typeof fx !== 'object') return out;
  for (const g of Object.keys(FX)) {
    const src = fx[g];
    if (!src || typeof src !== 'object') continue;
    for (const k of Object.keys(FX[g])) {
      const v = src[k], rule = FX[g][k];
      if (v === undefined || v === null || v === '') continue;
      let val;
      if (Array.isArray(rule) && typeof rule[0] === 'string') { if (!rule.includes(String(v))) continue; val = String(v); }
      else if (Array.isArray(rule)) { const n = +v; if (!Number.isFinite(n)) continue; val = Math.round(Math.max(rule[0], Math.min(rule[1], n)) * 100) / 100; }
      else if (rule === 'I') { if (!/^[A-Za-z0-9]{10,40}$/.test(String(v))) continue; val = String(v); }
      else if (rule === 'H') { if (!/^#[0-9a-fA-F]{3,8}$/.test(String(v))) continue; val = String(v); }
      else if (rule === 'T') val = String(v).slice(0, 400);
      else val = String(v).slice(0, 120);
      (out[g] = out[g] || {})[k] = val;
    }
  }
  if (Array.isArray(fx.cues)) {
    const cues = [];
    for (const c of fx.cues.slice(0, MAX_CUES)) {
      const t = String((c && c.t) || '').trim().slice(0, 200), s = +(c && c.s), e = +(c && c.e);
      if (t && Number.isFinite(s) && Number.isFinite(e) && s >= 0 && e > s && e <= 3600) {
        const cue = { t, s: Math.round(s * 100) / 100, e: Math.round(e * 100) / 100 };
        // 일레븐랩스로 만든 음성 파일: a=R2 키, d=길이(초), ah=만들 때의 문장·설정 서명(바뀌었는지 확인용)
        if (/^[\w.-]{1,120}$/.test(String(c.a || ''))) { cue.a = String(c.a); const d = +c.d; if (d > 0 && d < 600) cue.d = Math.round(d * 100) / 100; cue.ah = String(c.ah || '').slice(0, 300); }
        cues.push(cue);
      }
    }
    if (cues.length) out.cues = cues;
  }
  return out;
}

