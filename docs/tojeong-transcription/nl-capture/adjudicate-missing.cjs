// 빠진 4괘(국중도 필사본) 두 판독 A·B 를 메인 세션이 원본 사진을 직접 보고 판정해 합친다.
// 결과: report/newyear/texts/tojeong-nl-supplement.js
const fs = require('fs'), path = require('path');
const here = __dirname, root = path.join(here, '..', '..', '..');
const A = require('./READ-A.json'), B = require('./READ-B.json');
const out = { 663: {}, 711: {}, 862: {}, 863: {} };
// 판정(글자 모양 기준, 2026-11-15). □ = 두 판독과 메인 판정 모두 확정 못 함 → candidates 에 후보
const D = {
  '663.front.3': ['生涯爲主'],                // 爲/為 이체
  '663.front.4': ['春日梔花', '木+巵 꼴(梔). 梅일 수도 있음'],
  '711.back.1': ['危哉居卯', '尸 머리 꼴(居). 辰일 수도 있음'],
  '711.back.2': ['亥子□月', '숫자 二/三 구분 불가'],
  '711.back.7': ['安善子孫', '宀 머리(安)'],
  '711.back.8': ['以□七年', '둘째 글자 前/情 구분 불가'],
  '711.back.9': ['本人相沖'],
  '862.front.0': ['一□砲放', '扌+丰 꼴. 聲·擧·拜 후보(이 필사자의 拜別父母 拜와 같은 꼴)'],
  '862.front.3': ['結閑何害', '門 안 木(閑)'],
  '862.front.5': ['半笑半哭'],
  '862.front.6': ['馬躍草場', '草/苦'],
  '862.front.7': ['□振四海', '862.front.0 과 같은 글자'],
  '862.back.0': ['一□放砲', '862.front.0 과 같은 글자'],
  '862.back.3': ['結綢何解', '糹+周(綢). 網일 수도 있음'],
  '862.back.5': ['半笑半哭'],
  '862.back.7': ['□振四海', '862.front.0 과 같은 글자'],
  '863.front.6': ['□聞高閣', '862.front.0 과 같은 글자'],
  '863.back.0': ['黃氏佳約', '黃 머리 분명'],
  '863.back.3': ['稱在得失', '禾 변(稱/秤)'],
};
for (const g of ['663', '711', '862', '863']) for (const part of ['front', 'back']) {
  // 663 뒷부분은 B 의 단 순서(위 단을 오른쪽부터 모두 → 다음 단)가 지침과 같아 B 순서를 쓴다
  const baseArr = (g === '663' && part === 'back') ? B[g][part] : A[g][part];
  out[g][part] = baseArr.map((p, i) => {
    const d = D[`${g}.${part}.${i}`];
    if (d) return d[0];
    if (A[g][part][i] === B[g][part][i]) return p;
    return p;
  });
}
// 663 뒷부분 B 순서 위에 글자 판정 반영(勿恨早榮·若非財敗·大通戌亥·事如諧本)
out['663'].back = ['老人來氣', '年運可益', '財可如意', '事如諧本', '勿恨早榮', '晩成可取', '今年之運', '大通戌亥', '九月之數', '千人仰視', '若非財敗', '應有人謀', '千里遠出', '拜別父母'];
// 원문 파일과 같은 이체자 통일(靑·兎 등)
const VN = { '青': '靑', '兔': '兎', '為': '爲', '冲': '沖', '晚': '晩' };
for (const v of Object.values(out)) for (const k of ['front', 'back']) v[k] = v[k].map(p => [...p].map(c => VN[c] || c).join(''));
const notes = {
  '663': '뒷부분 財可如意·事如諧本·今年之運·大通戌亥 두 줄은 괘 번호가 없고 六六三과 七一一 머리 사이에 있어 663으로 넣음(711일 가능성 있음). 老人來氣의 氣, 事如諧本의 如·本 불확실.',
  '711': '앞부분 欸乃(款)·間士(閒) 불확실.',
  '862': '一□砲放 등 □ 글자는 扌+丰 꼴로 쓰인 같은 글자(聲 또는 擧로 보는 것이 문맥상 자연스러우나 모양은 拜와 같음).',
  '863': '앞부분 琢石得玉의 玉은 점 없는 王 꼴.',
};
const S = {
  meta: {
    source: '국립중앙도서관 「[土亭秘訣]」 이지함, 발행지·발행처 미상(필사본), CNTS-00076808100, 원문보기(관외이용-무료) 화면을 사용자가 휴대전화로 촬영',
    method: '독립 판독 2회(READ-A·READ-B) → 불일치 칸은 메인 세션이 원본 사진을 직접 보고 판정(adjudicate-missing.cjs). 판정 못 한 글자는 □.',
    note: '규장각본과 계통이 다른 판본: 앞부분(총론 8구)과 뒷부분(짧은 구 8~14구)뿐이고 규장각본의 괘사 9구·월별 36구 구성이 없다.',
    status: 'transcribed-unreviewed',
  },
  gua: Object.fromEntries(Object.entries(out).map(([g, v]) => [g, { front: v.front, back: v.back, frontPage: { 663: 18, 711: 19, 862: 24, 863: 24 }[g], backPage: { 663: 56, 711: 56, 862: 60, 863: 60 }[g], note: notes[g] }])),
};
const file = path.join(root, 'report', 'newyear', 'texts', 'tojeong-nl-supplement.js');
fs.writeFileSync(file, `/* 토정비결 보충 원문(국립중앙도서관 필사본) — 규장각본에 면이 없는 663·711·862·863괘. docs/tojeong-transcription/nl-capture/adjudicate-missing.cjs 가 만든 파일. */
(function(root){'use strict';
var SUPP=${JSON.stringify(S)};
root.TojeongSupplement=SUPP;
if(typeof module!=='undefined'&&module.exports)module.exports=SUPP;
})(typeof window!=='undefined'?window:globalThis);
`);
for (const [g, v] of Object.entries(S.gua)) console.log(g, v.front.join(' '), '||', v.back.join(' '));
