import '../report/v2/reading-metrics-summary.js';
export const USER_EVENTS=['viewed','completed','left-incomplete','helpful','specific','unclear','part-agree','part-disagree'];
// 문단 반응의 대상: el(사주 요소)·dt(일간·월지·용신 문장)·sig(시그니처)·lens(주제 렌즈·달력·대운·계획)
export const PART_RE=/^(el|dt|sig|lens):[가-힣a-z]{1,12}$/;
export const EXPERT_EVENTS=['expert-accepted','expert-revise'];
export const summarizeMetrics=globalThis.MantraReadingMetrics.summarize;
