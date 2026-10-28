// 주역 원문(괘사·단전·상전·효사·소상) 수집·검증 도구.
// 출처: 중국어 위키문헌 「周易」 (https://zh.wikisource.org/wiki/周易). 고전 원문은 퍼블릭 도메인이고, 위키문헌 전사본은 CC BY-SA 4.0.
// 사용: node tools/build-iching-classics.cjs [--from-dir <미리 받아 둔 원문 폴더>]   → report/iching/texts/classics.js 를 쓴다.
// 위키문헌 페이지에는 "품질 50%" 표시가 있으므로, 결과는 status:'source-imported'(관리자 대조 필요)로만 기록한다.
// 검증: 효 이름(初九·六二…)의 음양이 report/iching/hexagrams.js 의 효 패턴과, 「X下Y上」 표기가 하괘·상괘와 모두 일치해야 한다.
const fs = require('fs'), path = require('path'), assert = require('assert/strict');
const H = require('../report/iching/hexagrams.js');
const fromDir = process.argv.includes('--from-dir') ? process.argv[process.argv.indexOf('--from-dir') + 1] : null;
const ALIAS = { '旣濟': '既濟' };
const POS = ['初', '二', '三', '四', '五', '上'];
const TRI_ZH = { geon: '乾', tae: '兌', li: '離', jin: '震', son: '巽', gam: '坎', gan: '艮', gon: '坤' };

let VARS = [];
// {{另|A|B}} = 본문은 A, 일부 판본은 B (위키문헌 교감 표기). {{*|一作…}} 도 같은 종류의 주석이다. 본문에는 A 를 쓰고 B 는 variants 로 남겨 관리자가 고르게 한다.
const clean = s => s
  .replace(/\{\{另\|([^|}]*)\|([^}]*)\}\}/g, (m, a, b) => { VARS.push({ text: a, alt: b }); return a; })
  .replace(/\{\{\*\|([^}]*)\}\}/g, (m, n) => { VARS.push({ note: n }); return ''; })
  .replace(/-\{([^}]*)\}-/g, '$1').replace(/<[^>]+>/g, '')
  .replace(/'''/g, '').replace(/^[*#:]+\s*/, '').replace(/\[\[[^\]|]*\|([^\]]*)\]\]/g, '$1').replace(/\[\[([^\]]*)\]\]/g, '$1').replace(/\s+/g, ' ').trim();

function parse(h, raw) {
  VARS = [];
  const L = raw.split(/\r?\n/);
  const head = L.find(x => /下.*上/.test(x) && /Iching-hexagram/.test(x)) || '';
  const m = /\]\]\s*(?:-\{)?(.+?)(?:\}-)?下(?:-\{)?(.+?)(?:\}-)?上/.exec(head.replace(/-\{|\}-/g, ''));
  const iEdge = L.findIndex(x => /易經：/.test(x)), iTuan = L.findIndex(x => /^\*'''彖曰/.test(x)), iXiang = L.findIndex(x => /^\*'''象曰/.test(x)), iWen = L.findIndex((x, i) => i > iXiang && /^\*'''[^']+曰/.test(x));
  assert(iEdge > 0 && iTuan > iEdge && iXiang > iTuan, h.num + ': 구획 표지를 찾지 못했습니다');
  const end = iWen > 0 ? iWen : L.length;
  const block = (a, b) => L.slice(a + 1, b);
  // 괘사: "易經：" 다음 첫 ** 줄의 ： 뒤. 효사: 그 뒤의 *# 줄
  const edge = block(iEdge, iTuan), gls = edge.filter(x => /^\*\*/.test(x)), gt = clean(gls[0]), guaci = ((gt.includes('：') ? gt.split('：').slice(1).join('：') : gt) + gls.slice(1).map(clean).join('')).trim(); // 곤괘만 괘사가 *** 줄로 이어진다
  const yao = edge.filter(x => /^\*#/.test(x)).map(clean).map(t => { const m2 = /^(.{2})[：，]/.exec(t); assert(m2, '효 표기 형식: ' + t.slice(0, 12)); return { label: m2[1], text: t.slice(3).trim() }; });
  const tuan = block(iTuan, iXiang).filter(x => /^\*\*/.test(x)).map(clean).join(' ');
  const xb = block(iXiang, end), daexiang = clean(xb.find(x => /^\*\*/.test(x)) || ''), xiao = xb.filter(x => /^\*#/.test(x)).map(clean);
  return { head: m && [m[1], m[2]], variants: VARS.slice(), guaci, yao, tuan, daexiang, xiao };
}

async function main() {
  const out = {};
  for (const h of H.HEXAGRAMS) {
    const title = '周易/' + (ALIAS[h.hanja] || h.hanja), f = fromDir && path.join(fromDir, String(h.num).padStart(2, '0') + '.txt');
    const raw = f ? fs.readFileSync(f, 'utf8') : await (await fetch('https://zh.wikisource.org/w/index.php?title=' + encodeURIComponent(title) + '&action=raw')).text();
    const p = parse(h, raw), extra = h.num <= 2 ? 1 : 0;
    assert(p.guaci, h.num + ': 괘사 없음');
    assert.equal(p.yao.length, 6 + extra, h.num + ': 효사 개수');
    assert.equal(p.xiao.length, 6 + extra, h.num + ': 소상 개수');
    if (p.head) { // 「하괘下 상괘上」 표기가 우리 표와 같은가(괘 이름이 쓰이는 8괘 한자)
      assert.equal(p.head[0], TRI_ZH[h.lower], h.num + ': 하괘 표기 불일치 ' + p.head[0]);
      assert.equal(p.head[1], TRI_ZH[h.upper], h.num + ': 상괘 표기 불일치 ' + p.head[1]);
    }
    const lines = [];
    for (let i = 0; i < 6; i++) { // 효 이름의 음양이 효 패턴과 같은가: 九=양, 六=음. 초·상은 앞/뒤, 나머지는 뒤/앞 글자
      const label = p.yao[i].label, want = h.lines[i] ? '九' : '六', pos = POS[i];
      const ok = i === 0 ? label === '初' + want : i === 5 ? label === '上' + want : label === want + pos;
      assert(ok, h.num + ': 효 이름 ' + label + ' 이(가) ' + (i + 1) + '효(' + (h.lines[i] ? '양' : '음') + ')와 다릅니다');
      lines.push({ position: i + 1, label, yaoci: p.yao[i].text, xiaoxiang: p.xiao[i].replace(/^[^，。]*?(?=[，。])/, m0 => m0) });
    }
    const rec = { num: h.num, guaci: p.guaci, tuan: p.tuan, daexiang: p.daexiang, lines };
    if (p.variants.length) rec.variants = p.variants;
    if (extra) { const y = p.yao[6]; rec.yong = { label: y.label, yaoci: y.text, xiaoxiang: p.xiao[6] }; assert(/用[九六]/.test(y.label)); }
    out[h.num] = rec;
  }
  const meta = {
    source: '中文維基文庫 「周易」 各卦 페이지(易經·彖·象)',
    url: 'https://zh.wikisource.org/wiki/周易',
    license: '고전 원문은 퍼블릭 도메인. 위키문헌 전사본·교감 표기는 CC BY-SA 4.0(출처 표시 필요).',
    fetchedAt: new Date().toISOString().slice(0, 10),
    quality: '위키문헌 자체 품질 표시 50% — 관리자 대조 전이므로 status 는 source-imported 로만 둔다.',
    notes: '이체자·표기는 원 페이지를 따른다(无, 羣 등). 소상(小象)은 각 효 순서대로의 상전, daexiang 은 대상전이다.'
  };
  const js = '/* 주역 원문(괘사·단전·대상·효사·소상). tools/build-iching-classics.cjs 가 만든 파일 — 직접 고치지 말고 관리자 검수 데이터에서 수정한다.\n   status: source-imported = 출처에서 가져왔고 관리자 대조 전. 사용자 화면에는 reviewed 이상만 노출한다. */\n(function(root){\'use strict\';\nvar CLASSICS={meta:' + JSON.stringify(meta) + ',status:\'source-imported\',hexagrams:' + JSON.stringify(out) + '};\nroot.IchingClassics=CLASSICS;\nif(typeof module!==\'undefined\'&&module.exports)module.exports=CLASSICS;\n})(typeof window!==\'undefined\'?window:globalThis);\n';
  fs.mkdirSync(path.join(__dirname, '../report/iching/texts'), { recursive: true });
  fs.writeFileSync(path.join(__dirname, '../report/iching/texts/classics.js'), js);
  console.log('OK', Object.keys(out).length, '괘 /', Object.values(out).reduce((n, r) => n + r.lines.length + (r.yong ? 1 : 0), 0), '개 효(용구·용육 포함)');
}
main().catch(e => { console.error(e.message); process.exit(1); });
