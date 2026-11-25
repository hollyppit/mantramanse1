// 엔진 사본에 개선안 A·B·C 를 넣어 engine-prop-{A,B,C,ABC}.js 를 만든다(저장소 파일은 건드리지 않음)
// 사용: node tools/luck-engine-audit-20261125/make-prop.cjs  → out/ 에 engine-base.js(현재 엔진 사본)와 개선안 사본을 만든다. 저장소 engine.js 는 바꾸지 않는다.
const fs=require('fs'),path=require('path');const S=path.join(__dirname,'out');fs.mkdirSync(S,{recursive:true});const base=fs.readFileSync(path.join(__dirname,'..','..','engine.js'),'utf8');fs.writeFileSync(path.join(S,'engine-base.js'),base);
const A_OLD_START='  function relationParts(ch, p, rels, r, roleTxt) {', A_OLD_END='  // 변동성: 운 글자가 원국과 만드는 관계를';
const A_NEW=`  function relationParts(ch, p, rels, r, roleTxt) {
    // [개선안 A] 합화 성립도 · 충 종류별 세기 · 지장간 가중 역할 · 형·파·해 차등
    const parts = [], posW = { day: 1, month: 0.8, year: 0.5, hour: 0.5 };
    const roleHid = b => { let v = 0; for (const [hs, dd] of HIDDEN[b]) v += r(stemEl(hs)) * dd / 30; return v; };
    const mEl = BR_EL[ch.pillars.month.b];
    const stemEls = ['year', 'month', 'hour'].filter(k => ch.pillars[k]).map(k => stemEl(ch.pillars[k].s)).concat([stemEl(p.s)]);
    const clashed = new Set(rels.filter(x => x.type === '충').flatMap(x => x.members));
    const hwaOf = (el, members) => { let h = 0.4; if (mEl === el || generates(mEl) === el) h += 0.3; if (stemEls.includes(el)) h += 0.3; if (members.some(m => m !== 'luck' && clashed.has(m))) h -= 0.2; return Math.max(0.2, Math.min(1, h)); };
    const CHK = [1, 0.6, 0.9, 1, 0.6, 0.9, 1, 0.6, 0.9, 1, 0.6, 0.9];   // 子午卯酉 왕지 1 · 寅申巳亥 생지 0.9 · 辰戌丑未 고지 0.6
    for (const x of rels) {
      const other = x.members.find(m => m !== 'luck'), w = posW[other] || 0.6, tb = ch.pillars[other] && ch.pillars[other].b;
      if (x.type === '충') {
        const role = roleHid(tb);
        parts.push({ label: \`\${x.name} — \${POS_K[other]}지 충돌·변동\`, v: (-role * 5 - 2) * CHK[tb] * w });
      } else if (['육합', '삼합', '반합', '방합'].includes(x.type) && x.el != null) {
        const h = hwaOf(x.el, x.members);
        parts.push({ label: \`\${x.name} — \${EL_K[x.el]}(\${roleTxt(x.el)}) 기운 형성(성립도 \${h.toFixed(1)})\`, v: r(x.el) * 5 * w * h + (1 - h) * (-roleHid(tb) * 1.5 * w) });
      } else if (x.type === '천간합' && x.el != null && other === 'day') {
        const h = hwaOf(x.el, x.members) * 0.6;
        parts.push({ label: \`\${x.name} — 일간이 묶임\`, v: r(x.el) * 3 * h });
      } else if (x.type === '천간충' && other === 'day') {
        parts.push({ label: \`\${x.name} — 일간 충돌\`, v: -4 });
      } else if (x.type === '천간합' && other !== 'day' && ch.pillars[other]) {
        const ne = stemEl(ch.pillars[other].s), rv = r(ne);
        if (Math.abs(rv) >= 1) parts.push({ label: \`\${x.name} — \${POS_K[other]}간 합으로 묶임\`, v: -rv * 1.5 * w });
      } else if (x.type === '형' && tb != null && !/자형/.test(x.name)) {
        parts.push({ label: \`\${x.name} — 형\`, v: (-roleHid(tb) * 2 - 1.5) * w * 0.6 });
      } else if ((x.type === '파' || x.type === '해') && tb != null) {
        parts.push({ label: \`\${x.name}\`, v: (-roleHid(tb) - 0.5) * w * 0.3 });
      }
    }
    if (CHEONEUL[ch.pillars.day.s].includes(p.b)) parts.push({ label: '천을귀인 운', v: 5 });
    return parts;
  }
`;
const B_OLD="      const adj = S.pattern[pt.name]; if (adj == null || pt.level === '참고') continue;";
const B_NEW="      const adj = S.pattern[pt.name]; if (adj == null || pt.level === '참고' || !patEstablished(ch, pt.name)) continue;";
const B_FN=`  // [개선안 B] 원국 구조가 실제로 성립할 때만 감점(이름만 일치하는 경우 제외)
  function patEstablished(ch, name) {
    const G = ch.weights.groups, help = ch.strength.help, dEl = stemEl(ch.pillars.day.s), tp = ch.weights.tgPct, rv = i => ch.unified.roleV[mod(dEl + i, 5)];
    if (name === '관살혼잡') return (tp['정관'] || 0) >= 5 && (tp['편관'] || 0) >= 5 && !((tp['식신'] || 0) >= 8) && !(help < 50 && G[4] >= 15);
    if (name === '상관견관') return rv(3) > 0 && (tp['정인'] || 0) < 8 && (tp['상관'] || 0) >= 5 && (tp['정관'] || 0) >= 5;
    if (name === '효신탈식(도식)') return rv(1) > 0 && G[2] < 10 && (tp['편인'] || 0) >= 8;
    if (name === '군겁쟁재') return G[3] < 10 && G[1] < 10;
    return true;
  }
`;
const C_PAIRS=[
 ["    add('good', '식신제살', G[3] >= S.heavy ?","    if (!useful(3) || G[3] >= S.heavy) add('good', '식신제살', G[3] >= S.heavy ?"],   // [개선안 C] 편관이 쓸모 있는(용·희) 사주에서는 제살을 가점하지 않음
 ["      add('good', '살인상생', Gd['살인상생'],","      if (useful(4)) add('good', '살인상생', Gd['살인상생'],"],
 ["      add('good', '살인상생(관 유입)', Gd['살인상생(관 유입)'],","      if (useful(4)) add('good', '살인상생(관 유입)', Gd['살인상생(관 유입)'],"],
 ["      add('good', '상관패인', Gd['상관패인'],","      if (useful(4) || !useful(1)) add('good', '상관패인', Gd['상관패인'],"]];
function build(opts){let s=base;
 if(opts.A){const a=s.indexOf(A_OLD_START),b=s.indexOf(A_OLD_END);if(a<0||b<0)throw 'A';s=s.slice(0,a)+A_NEW+s.slice(b);}
 if(opts.B&&s.includes('function patEstablished('))opts=Object.assign({},opts,{B:0});   // 2026-11-25: 엔진에 B안이 이미 들어 있으면 건너뜀
 if(opts.C&&s.includes('LUCK_CFG.structure.goodGate'))opts=Object.assign({},opts,{C:0});
 if(opts.B){if(!s.includes(B_OLD))throw 'B';s=s.replace(B_OLD,B_NEW);s=s.replace('  function luckStructures(ch, p) {',B_FN+'  function luckStructures(ch, p) {');}
 if(opts.C){for(const [o,n] of C_PAIRS){if(!s.includes(o))throw 'C '+o;s=s.replace(o,n);}}
 return s;}
for(const [k,o] of Object.entries({A:{A:1},B:{B:1},C:{C:1},ABC:{A:1,B:1,C:1}})) fs.writeFileSync(path.join(S,'engine-prop-'+k+'.js'),build(o));
console.log('ok');
