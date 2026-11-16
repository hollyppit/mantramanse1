// 궁합 화면 가독성 감사(브라우저 콘솔·미리보기에서 실행): 대표 명식 × 관계 유형별로 궁합 결과 화면을 그려
//  ① 기본 풀이(접힌 근거 밖)에서 같은 문장이 반복되는지 ② 기본 풀이에 전문 용어·수치가 얼마나 남는지
//  ③ 엔진이 낸 근거(항목 점수·합충 이름·양방향 근거·억부/조후 메모·원국 상호작용)가 화면 어딘가(근거 펼침 포함)에 모두 남는지 ④ 분량을 센다.
// 사용: 이 파일 내용을 페이지에서 실행한 뒤 await compatUiAudit() — 결과 객체를 돌려준다. 메인 사주는 지금 입력된 사주를 쓴다.
window.compatUiAudit = async function (opt) {
  opt = opt || {};
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const PARTNERS = opt.partners || [
    { name: '가을', gender: 'F', y: 1990, m: 3, d: 15, h: 14, mi: 30 },
    { name: '겨울', gender: 'F', y: 1985, m: 12, d: 22, h: 6, mi: 0 },
    { name: '여름', gender: 'M', y: 1994, m: 7, d: 8, h: 13, mi: 0 },
    { name: '봄', gender: 'F', y: 1979, m: 4, d: 2, h: null, mi: 0 },
    { name: '새벽', gender: 'M', y: 2001, m: 1, d: 31, h: 23, mi: 59 },
  ];
  const RELS = opt.rels || ['lover', 'work', 'friend', 'family'];
  const JARGON = /억부|조후|십성|용신|희신|기신|구신|한신|비겁|비견|겁재|식상|식신|상관|재성|정재|편재|관성|정관|편관|인성|정인|편인|천간|지지|지장간|통근|월령|투간|관인상생|식신생재|식상제살|재생관|군겁쟁재|상관견관|편인도식|재극인|관살혼잡|태과|[年月日時]?[간지]\s?↔|\d+(\.\d+)?%|\d+점/g;
  const sentences = t => t.split(/\n|(?<=[.!?요다])\s+/).map(x => x.replace(/\s+/g, ' ').trim()).filter(x => x.length >= 14);
  const basicText = () => {   // 접힌 근거(details) 밖의 글
    const main = document.querySelector('main').cloneNode(true);
    main.querySelectorAll('details').forEach(d => d.remove());
    main.querySelectorAll('form, .seg, .pr-acts').forEach(d => d.remove());
    return main.innerText;
  };
  const allText = () => { document.querySelectorAll('main details').forEach(d => { d.open = true; }); return document.querySelector('main').innerText; };
  if (!PairCompat.__audit) { const orig = PairCompat.evaluate; PairCompat.evaluate = function () { const r = orig.apply(this, arguments); window.__lastPair = r; return r; }; PairCompat.__audit = 1; }   // 화면이 쓴 결과를 붙잡는다(계산은 그대로)
  const tab = document.querySelector('[data-tab=pair]'); if (tab) tab.click(); await sleep(300);
  const out = [];
  for (const p of PARTNERS) {
    const edit = document.querySelector('[data-pact=edit]'); if (edit) { edit.click(); await sleep(200); }
    const g = id => document.getElementById(id);
    const sg = (k, v) => { const b = document.querySelector(`[data-ps="${k}:${v}"]`); if (b && b.getAttribute('aria-pressed') !== 'true') b.click(); };
    sg('gender', p.gender); await sleep(80);
    g('pf-name').value = p.name; g('pf-y').value = p.y; g('pf-m').value = p.m; g('pf-d').value = p.d;
    g('pf-hu').checked = p.h == null; if (p.h != null) { g('pf-h').disabled = false; g('pf-mi').disabled = false; g('pf-h').value = p.h; g('pf-mi').value = p.mi; }
    document.querySelector('#pair-form button[type=submit]').click(); await sleep(350);
    for (const rel of RELS) {
      const rb = document.querySelector(`[data-ps="rel:${rel}"]`); if (rb) { rb.click(); await sleep(250); }
      const basic = basicText(), sb = sentences(basic);
      const cnt = {}; sb.forEach(s => { cnt[s] = (cnt[s] || 0) + 1; });
      const dups = Object.entries(cnt).filter(([, n]) => n > 1).map(([s, n]) => `${n}× ${s.slice(0, 60)}`);
      // 의미 중복: 같은 핵심 구(12자 이상 공통 조각)가 기본 풀이의 다른 문장에 또 나오는 경우
      const frag = new Map(); sb.forEach((s, i) => { for (let k = 0; k + 16 <= s.length; k += 8) { const f = s.slice(k, k + 16); if (!frag.has(f)) frag.set(f, new Set()); frag.get(f).add(i); } });
      const nearDup = new Set(); frag.forEach(set => { if (set.size > 1) [...set].forEach(i => nearDup.add(i)); });
      const jargon = (basic.match(JARGON) || []);
      const all = allText();
      // 엔진 근거가 화면에 남았는지 (구 화면의 근거 문장 = R.directions help/burden, balanceNotes, relations 이름, parts 점수)
      const R = window.__lastPair || null;
      const facts = [];
      if (R) {
        R.parts.forEach(x => facts.push(x.label));
        R.relations.forEach(x => facts.push(x.name));
        (R.balanceNotes || []).forEach(x => facts.push(x));
        ['ab', 'ba'].forEach(k => [...R.directions[k].help, ...R.directions[k].burden].forEach(x => facts.push(x)));
        (R.interplay || []).forEach(x => facts.push(x.text));
        facts.push(R.stems.aSeesB, R.stems.bSeesA);
      }
      const norm = s => s.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
      const allN = norm(all);
      const lost = facts.filter(f => f && !allN.includes(norm(f).slice(0, 40)));
      out.push({ partner: p.name, rel, basicChars: basic.replace(/\s+/g, '').length, basicSentences: sb.length, exactDup: dups.length, nearDupSentences: nearDup.size, jargon: jargon.length, jargonSample: [...new Set(jargon)].slice(0, 8), facts: facts.length, lost: lost.length, lostSample: lost.slice(0, 3), dupSample: dups.slice(0, 3) });
      document.querySelectorAll('main details').forEach(d => { d.open = false; });
    }
  }
  const sum = k => out.reduce((s, x) => s + x[k], 0);
  return { cases: out.length, total: { basicChars: sum('basicChars'), exactDup: sum('exactDup'), nearDupSentences: sum('nearDupSentences'), jargon: sum('jargon'), lost: sum('lost'), facts: sum('facts') }, rows: out };
};
