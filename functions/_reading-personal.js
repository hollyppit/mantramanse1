// 풀이 근거를 "이 사주의 실제 값"으로 한 줄 옮긴다(2026-11-07).
// 문안은 조건(신강/신약·십성 비중·위치·대운 등)으로 골라지지만, 문장 자체는 고정이라 사람마다 같은 말이 나온다.
// 여기서는 그 문안을 고르게 한 조건(evalConds 의 맞은 행)을 이 사주의 숫자·글자로 바꿔 적는다. 새 판단은 만들지 않는다.
//   personalLine(rows, sd) → '이 사주: 경금 일간 · 신약(나를 돕는 힘 36%) · 관성 50% · 월지 정관(午)' 또는 ''
// 이름은 서버로 오지 않으므로 쓰지 않는다. 출력에는 { } < > 가 없다(composeReviewed 의 available 검사와 맞춤).
const EL_HJ = { 목: '木', 화: '火', 토: '土', 금: '金', 수: '水' };
const POS = { year: '년', month: '월', day: '일', hour: '시' };
const PART = { stem: '간', branch: '지' };
const ROOT = { '매우 강한 통근': '매우 강함', '강한 통근': '강함', '통근': '보통', '약한 통근': '약함', '매우 약한 통근': '매우 약함', '무근': '없음' };
const pctOf = have => { const m = /(\d+(?:\.\d+)?)%/.exec(String(have || '')); return m ? Math.round(+m[1]) : null; };
const lvl = have => /강함|많/.test(String(have)) ? '많은 편' : /약함|적|낮/.test(String(have)) ? '적은 편' : '';
const asList = v => Array.isArray(v) ? v : v == null ? [] : [v];
const hits = (row) => { const want = asList(row.want), have = asList(row.have); return want.filter(w => have.includes(w)); };

function piece(row, sd) {
  const key = String(row.key || ''), [base, sub] = key.split('.'), have = row.have;
  const pill = p => (sd.pillars && sd.pillars[p]) || null;
  switch (base) {
    case 'dayMaster': return sd.dayMaster ? `${sd.dayMaster.stem}${sd.dayMaster.el}(${sd.dayMaster.hanja || ''}) 일간` : '';
    case 'dayPillar': return pill('day') ? `${pill('day').ko}(${pill('day').hanja}) 일주` : '';
    case 'strength': return sd.strength ? `${have}(나를 돕는 힘 ${Math.round(sd.strength.help)}%)` : String(have || '');
    case 'rootLevel': return `일간의 뿌리 ${ROOT[have] || have}`;
    case 'yongEl': return `필요한 기운(용신) ${have}${EL_HJ[have] ? '(' + EL_HJ[have] + ')' : ''}`;
    case 'group': case 'tenGod': { const p = pctOf(have), l = p === 0 ? '원국에 없음' : lvl(have); return sub ? `${sub} ${p != null ? p + '%' : ''}${l ? '로 ' + l : ''}`.trim() : ''; }
    case 'el': { const p = pctOf(have); return sub ? `${sub}${EL_HJ[sub] ? '(' + EL_HJ[sub] + ')' : ''} 기운 ${p != null ? p + '%' : lvl(have)}` : ''; }
    case 'positionTG': return hits(row).map(w => { const [loc, tg] = String(w).split(':'), [pos, part] = String(loc).split('.'), p = pill(pos); if (!p) return ''; if (part === 'hidden') return `${POS[pos]}지 속 ${tg}`; const ch = part === 'stem' ? p.hanja[0] : p.hanja[1]; return `${POS[pos]}${PART[part] || ''} ${tg}(${ch})`; }).filter(Boolean).join(' · ');
    case 'pattern': return hits(row).map(x => x + ' 구조').join(' · ');
    case 'star': return hits(row).join(' · ');
    case 'relation': { const types = hits(row), names = asList(have).filter(h => h.length > 2 && types.some(t => h.endsWith(t) || h.includes(t))); return (names.length ? names : types).join(' · '); }
    case 'season': return have ? `${have}에 태어남` : '';
    case 'daewoonStemTG': { const d = sd.currentDaewoon; return d ? `지금 대운 ${d.ganzhi}(${have}, ${d.startYear}~${d.endYear - 1}년)` : `지금 대운 ${have}`; }
    case 'daewoonNextStemTG': { const list = sd.daewoon || [], i = list.findIndex(x => sd.currentDaewoon && x.startYear === sd.currentDaewoon.startYear), n = i >= 0 ? list[i + 1] : null; return n ? `다음 대운 ${n.ganzhi}(${have}, ${n.startYear}년부터)` : `다음 대운 ${have}`; }
    case 'daewoonChangeIn': return `다음 대운까지 ${have}`;
    case 'daewoonSeason': return `지금 대운 흐름 ${have}`;
    case 'seunSeason': return sd.sewoon ? `${sd.sewoon.year}년 흐름 ${have}` : `올해 흐름 ${have}`;
    case 'seunStemTG': return sd.sewoon ? `${sd.sewoon.year}년 ${sd.sewoon.ganzhi}(${have})` : `올해 ${have}`;
    case 'daewoonDayRelation': return `지금 대운과 일지가 ${asList(have).join('·')}`;
    case 'seunDayRelation': return `올해와 일지가 ${asList(have).join('·')}`;
    case 'natalDayRelation': return `원국 안 일지가 ${asList(have).join('·')}`;
    default: return '';   // gender·methodDifference 등은 사람이 읽을 값이 아니라 생략
  }
}
export function personalLine(rows, sd) {
  if (!sd || !Array.isArray(rows)) return '';
  const out = [], seen = new Set();
  rows.filter(r => r && r.hit).forEach(r => { const t = piece(r, sd); if (t && !seen.has(t)) { seen.add(t); out.push(t); } });
  const line = out.slice(0, 5).join(' · ').replace(/[{}<>]/g, '');
  return line ? '이 사주: ' + line : '';
}
