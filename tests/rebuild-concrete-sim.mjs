// 생활 장면 다시 쓰기(editorial/rebuild-20261022/concrete-20261107.mjs) 검사
//   node tests/rebuild-concrete-sim.mjs
// 덮어쓴 칸이 실제 묶음에 그대로 들어가는지, 모든 id 가 존재하는지, 생활 장면 단어가 있는지, 금지어·{}가 없는지, 한 문단 안 같은 문장 반복이 없는지 본다.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { pathToFileURL } from 'node:url';
const P = process.cwd() + '/editorial/rebuild-20261022/';
const { CONCRETE_ALL } = await import(pathToFileURL(P + 'concrete-20261107.mjs').href);
const { bundles } = await import(pathToFileURL(P + 'index.mjs').href);
const LIFE = eval(fs.readFileSync('tools/rebuild-audit.mjs', 'utf8').match(/const LIFE = (\/.*\/);/)[1]);
const E = Object.values(bundles).flat();
let fields = 0;
for (const [id, x] of Object.entries(CONCRETE_ALL)) {
  const es = E.filter(e => e.id === id); assert(es.length, 'unknown id ' + id);
  for (const [f, t] of Object.entries(x)) {
    fields++;
    // 장면 칸은 그대로 들어가야 하고, 근거·제목 칸은 뒤 단계(용어 괄호 뜻·쉬운 말)가 이어서 다듬는다.
    if (['example', 'positive', 'negative', 'advice'].includes(f)) for (const e of es) assert.equal(e[f], t, `${id}.${f} not applied as written`);
    if (['example', 'positive', 'negative', 'advice'].includes(f)) assert(LIFE.test(t), `${id}.${f} has no everyday scene`);
    assert(!/[{}<>]|반드시|무조건|100%|확실히|엔진|계산/.test(t), `${id}.${f} has a banned or internal word`);
    const ss = t.split(/(?<=[.!?])\s+/); assert.equal(new Set(ss).size, ss.length, `${id}.${f} repeats a sentence`);
    assert(t.length >= 40 && t.length <= 400, `${id}.${f} length ${t.length}`);
  }
}
const wealth = Object.entries(bundles).filter(([b]) => b !== 'pilot').flatMap(([, l]) => l).filter(e => /timeline_(?:wealth|love|career|creative|remedy|health|self)_/.test(e.chapters?.[0] || ''));   // 다시 쓰기를 마친 주제
const abs = new Set(); for (const e of wealth) for (const f of ['example', 'positive', 'negative', 'advice']) { const t = String(e[f] || '').trim(); if (t && !LIFE.test(t)) abs.add(e.id + '.' + f); }
// 한 사람에게 여러 장에 걸쳐 같은 문장이 반복해 보이지 않아야 한다(같은 장 안의 조건별 공유 문장은 한 사람에게 하나만 보여서 허용).
{
  const idx = new Map();
  for (const e of Object.entries(bundles).filter(([b]) => b !== 'pilot').flatMap(([, l]) => l))
    for (const f of ['core', 'basis', 'example', 'positive', 'negative', 'advice'])
      for (const s of String(e[f] || '').split(/(?<=[.!?])\s+/).map(x => x.trim()).filter(x => x.length >= 20)) { const l = idx.get(s) || []; l.push([e.id, e.chapters?.[0]]); idx.set(s, l); }
  const cross = [...idx].filter(([, l]) => new Set(l.map(x => x[0])).size >= 3 && new Set(l.map(x => x[1])).size > 1);
  assert.equal(cross.length, 0, 'cross-chapter repeats: ' + cross.slice(0, 3).map(x => x[0]).join(' / '));
}
assert.equal(abs.size, 0, 'done topics abstract: ' + [...abs].join(', '));
console.log(JSON.stringify({ passed: true, ids: Object.keys(CONCRETE_ALL).length, fields, doneTopicsAbstract: abs.size }));
