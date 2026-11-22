/* 일진 조심 신호(2026-11-22) — 만세력 '지금의 운'·운명의 타임라인 일진 캘린더 공용, 표시 전용
 *  그래프 지표(연애·재물·건강·사고수 + 세부 12개 + 재물손실 위험)마다 그날 일진 등급이 '조심'(luck-grade.js metric: 이 사주 평소 수준에서 가장 불리한 30%)이면
 *  "무엇을 조심할지" 한 줄과 함께 돌려준다. 전체 흐름 등급(좋음·무난·조심)과 상관없이 지표별로 본다.
 *   · 점수·근거는 엔진(M.evaluateDomainLuck) 그대로. 새 점수를 만들지 않는다.
 *   · 건강은 부위(health-body.js), 사고수는 장면(accident-hint.js), 재물은 손실 신호, 그 외는 그 지표의 조심 쪽 근거 하나(쉬운 말로).
 *   · 횡재운은 뺀다(낮으면 '뜻밖의 수입이 적다'는 뜻이라 조심 신호가 아님). 손실 쪽(재물손실 위험)만 본다.
 *  사용: MantraLuckCare.signals(M, ch, il, opt) → [{ k, metric, name, v, strong, why }]   (opt.names 로 이름 바꾸기, opt.domain 으로 이미 계산한 결과 넘기기)
 *  브라우저: window.MantraLuckCare · Node: module.exports  (먼저 engine.js, luck-grade.js)
 */
(function (root) {
  'use strict';
  var VERSION = 'luck-care-2026-11-22';
  var KEYS = ['love', 'wealth', 'health', 'accident', 'job', 'move', 'career', 'business', 'child', 'marriage', 'noble', 'study', 'estate', 'social', 'family'];
  var NAMES = { love: '연애운', wealth: '재물운', health: '건강', accident: '사고수', job: '취업운', move: '이직운', career: '직업운', business: '사업운', child: '자식운', marriage: '결혼운', noble: '귀인운', study: '학업운', estate: '문서·이사운', social: '대인·구설운', family: '부모·가족운', windfallLoss: '재물손실 위험' };
  function LG() { return root.MantraLuckGrade || (typeof require === 'function' ? require('./luck-grade.js') : null); }
  var cut = function (t) { return String(t || '').replace(/\s*\([^)]*\)/g, '').replace(/\s+/g, ' ').trim(); };
  var plain = function (t) { return !t || /뚜렷한 쏠림이 없는|대체로 안정적인/.test(t); };
  // 근거 문장 쉬운 말: '합충형파해 긴장 85 — 업무 안정성 하락 요인' → '부딪히는 글자가 많아 업무 안정성 쪽이 흔들리기 쉬워요'
  function easy(t) {
    t = cut(t); var m;
    if ((m = /^합충형파해 긴장 \d+(?: 누적)? — (.+?)(?: 하락 요인| 요인)?$/.exec(t))) { var x = m[1]; return '부딪히는 글자가 많아 ' + (/안정성$/.test(x) ? x + ' 쪽이 흔들리기 쉬워요' : /쉬운$/.test(x) ? x.replace(/쉬운$/, '쉬워요') : x + ' 쪽을 조심할 때예요'); }
    if ((m = /^변동성 \d+ — (.+)$/.exec(t))) return '변화가 큰 날이라 ' + m[1];
    return t.replace(/ — /, ': ');
  }
  // 조심할 이유만: 부정 신호 문장 중 지표 고유 문장 → 일반 긴장·변동 문장. 좋은 쪽 문장(늘어남·개선·결속)은 쓰지 않는다
  var NEG = /충|형|파|해|원진|긴장|하락|어긋|부담|마찰|말조심|구설|경쟁|분산|약해|약하|흔들|손실|지출|변동|움직|낮아|떨어/, POS = /개선|완화|결속 신호|받쳐|보완|늘어납니다(?!.*경쟁)/;
  function pickReason(rs) { var neg = rs.filter(function (t) { return NEG.test(t) && !POS.test(t); }); return neg.filter(function (t) { return !/^합충형파해 긴장|^변동성 \d/.test(t); })[0] || neg[0] || ''; }
  // 뚜렷한 조심 근거 문장이 없을 때(받쳐 주는 힘이 평소보다 약한 날) 쓰는 한 줄
  var FALLBACK = {
    love: '관계를 받쳐 주는 힘이 평소보다 약한 날이에요. 서운한 말은 한 번 더 고르세요.', wealth: '돈 흐름을 받쳐 주는 힘이 평소보다 약한 날이에요. 큰 결제는 미뤄 보세요.',
    health: '몸의 균형이 평소보다 흐트러지기 쉬운 날이에요. 무리한 일정은 줄이세요.', accident: '주의 신호가 평소보다 겹친 날이에요. 서두르는 일정은 줄이세요.',
    job: '조직과 닿는 힘이 평소보다 약한 날이에요. 지원·면접은 준비를 한 번 더 하세요.', move: '자리를 옮기는 판단이 평소보다 흔들리기 쉬운 날이에요.',
    career: '일에서 힘을 받기 어려운 날이에요. 중요한 보고는 한 번 더 확인하세요.', business: '사업 쪽 받쳐 주는 힘이 약한 날이에요. 확장보다 점검이 맞아요.',
    child: '자녀 영역을 받쳐 주는 힘이 평소보다 약한 날이에요.', marriage: '결혼·배우자 영역을 받쳐 주는 힘이 평소보다 약한 날이에요.',
    noble: '도와주는 사람의 힘이 평소보다 약한 날이에요. 부탁은 다른 날로 미뤄 보세요.', study: '집중이 평소보다 흐트러지기 쉬운 날이에요.',
    estate: '계약·문서·이사 쪽은 조건을 한 번 더 확인할 날이에요.', social: '말과 약속에서 오해가 생기기 쉬운 날이에요. 말을 아끼세요.',
    family: '가족 영역을 받쳐 주는 힘이 평소보다 약한 날이에요.'
  };
  function ctxOf(x) { return x && x.date ? { ms: Date.UTC(x.date[0], x.date[1] - 1, x.date[2], 3) } : {}; }

  function signals(M, ch, il, opt) {
    opt = opt || {}; var G = LG(); if (!M || !ch || !il || !G) return [];
    var r = opt.domain; if (!r) { try { r = M.evaluateDomainLuck(ch, il, 'ilun', ctxOf(il)); } catch (e) { return []; } }
    var names = Object.assign({}, NAMES, opt.names || {}), out = [];
    var loss = r.windfall && r.windfall.loss, lossOn = loss && G.metric('windfallLoss', loss.score).k === 'care';
    function why(k, x) {
      var rs = (x.reasons || []).filter(function (t) { return !/^원국 적합도|통합 용신 기준 보완/.test(t); });
      if (k === 'health') { try { var HB = root.MantraHealthBody, hb = HB && HB.read(M, ch, il, 'ilun'), it = hb && hb.items.filter(function (i) { return i.level === '주의'; }).slice(0, 2); if (it && it.length) return '살펴볼 부위: ' + it.map(function (i) { return (i.focus && i.focus[0] ? i.focus[0].organ + '(' + i.focus[0].glyph + ')' : i.organ) + ' — ' + i.body.split(',').slice(0, 2).join(','); }).join(' · '); } catch (e) { } }
      if (k === 'accident') { try { var AH = root.MantraAccidentHint, ah = AH && AH.read(M, ch, il, 'ilun', x.score), it2 = ah && ah.items.slice(0, 2); if (it2 && it2.length) return it2.map(function (i) { return i.title + (i.where ? ' (' + i.where.split(',').slice(0, 2).join(',') + ')' : ''); }).join(' · ') + (it2[0].tip ? ' — ' + it2[0].tip : ''); } catch (e) { } }
      if (k === 'wealth' && loss && loss.score >= G.SIG_CUTS.windfallLoss[2]) return '손실 신호: ' + loss.summary;
      var head = plain(x.summary) ? '' : x.summary, rr = pickReason(rs);
      return head && rr ? head + ' (' + easy(rr) + ')' : head || (rr ? easy(rr) : FALLBACK[k] || '이 사주의 평소 수준보다 불리하게 나온 날이에요.');
    }
    KEYS.forEach(function (k) {
      var x = r[k]; if (!x || x.score == null || G.metric(k, x.score).k !== 'care') return;
      out.push({ k: k, metric: k, name: names[k], v: x.score, strong: !!G.extreme(k, x.score), why: why(k, x) });
    });
    if (lossOn) {
      var rs = (loss.reasons || []), rr = pickReason(rs);
      out.push({ k: 'windfallLoss', metric: 'windfall', name: names.windfallLoss, v: loss.score, strong: !!G.extreme('windfallLoss', loss.score), why: loss.summary + (rr ? ' (' + easy(rr) + ')' : '') });
    }
    return out;
  }
  var NOTE = '달력의 좋음·무난·조심(전체 흐름)과 따로, 지표마다 이 사주의 평소 수준보다 불리한 쪽(가장 불리한 30%)이면 띄웁니다. 사고수·재물손실 위험은 높을수록 불리합니다. 사건 예측이 아닌 참고 신호입니다.';
  var api = { VERSION: VERSION, KEYS: KEYS, NAMES: NAMES, NOTE: NOTE, signals: signals, easy: easy, pickReason: pickReason };
  root.MantraLuckCare = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
