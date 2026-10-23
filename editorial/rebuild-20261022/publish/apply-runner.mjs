// Runs the prepared per-chapter SQL against production through the Supabase Management API (no dependencies).
// Run it yourself; nothing here is executed by the assistant.
//   set SUPABASE_ACCESS_TOKEN=<personal access token>   (Supabase dashboard > Account > Access Tokens; never paste it into chat)
//   node apply-runner.mjs dry   [chapter ...]   read-only dry run (every file must end in DRYRUN-OK)
//   node apply-runner.mjs apply [chapter ...]   writes; stops at the first error; asks for typed confirmation first
//   node apply-runner.mjs apply --limit 3       only the next 3 chapters not yet applied
// Without chapter names it uses every chapter in plan.json except those already at the prepared hash.
import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline/promises';
import {OUT} from './prepare.mjs';

const REF = 'devkslhggrkqtianjamj';
const mode = process.argv[2];
if (!['dry', 'apply'].includes(mode)) { console.error('usage: node apply-runner.mjs dry|apply [chapter ...] [--limit N]'); process.exit(1); }
const token = process.env.SUPABASE_ACCESS_TOKEN;
if (!token) { console.error('SUPABASE_ACCESS_TOKEN is not set'); process.exit(1); }

const args = process.argv.slice(3);
const li = args.indexOf('--limit'), limit = li >= 0 ? Number(args.splice(li, 2)[1]) : Infinity;
const plan = JSON.parse(fs.readFileSync(path.join(OUT, 'plan.json'), 'utf8'));

async function query(sql) {
  const r = await fetch(`https://api.supabase.com/v1/projects/${REF}/database/query`, {
    method: 'POST', headers: {Authorization: `Bearer ${token}`, 'Content-Type': 'application/json'}, body: JSON.stringify({query: sql})});
  return {status: r.status, text: await r.text()};
}
const HASH = x => `(select md5(string_agg((p->>'id')||chr(31)||(p->>'text'),chr(30) order by (p->>'id') collate "C")) from jsonb_array_elements(${x}) p)`;
async function state(chapter) {
  const res = await query(`select (value::jsonb->>'version')::int v, ${HASH("value::jsonb->'published'")} h from public.kv where key='ik:blocks:chapter:library.${chapter}'`);
  try { return JSON.parse(res.text)[0] || null; } catch { throw new Error(`state query failed for ${chapter}: ${res.status} ${res.text.slice(0, 200)}`); }
}

let todo = plan.filter(r => !args.length || args.includes(r.chapter));
const pending = [];
for (const r of todo) {
  const s = await state(r.chapter);
  if (!s) throw new Error('library missing: ' + r.chapter);
  if (s.h === r.newHash) { console.log(`skip ${r.chapter}: already at the prepared text (version ${s.v})`); continue; }
  if (s.h !== r.observedHash || s.v !== r.observedVersion) { console.error(`STOP ${r.chapter}: production differs from the observed backup (version ${s.v}, hash ${s.h}); not touching it`); continue; }
  pending.push(r);
}
const run = pending.slice(0, limit);
console.log(`${mode}: ${run.length} chapter(s): ${run.map(r => r.chapter).join(', ')}`);
if (!run.length) process.exit(0);

if (mode === 'apply') {
  const rl = readline.createInterface({input: process.stdin, output: process.stdout});
  const a = await rl.question(`WRITE to production for ${run.length} chapter(s)? type "apply" to continue: `); rl.close();
  if (a.trim() !== 'apply') { console.log('cancelled'); process.exit(0); }
}

for (const r of run) {
  const sql = fs.readFileSync(path.join(OUT, 'sql', mode, r.chapter + '.sql'), 'utf8');
  const res = await query(sql);
  if (mode === 'dry') {
    if (res.text.includes('DRYRUN-OK')) console.log(`ok   ${r.chapter}`);
    else { console.error(`FAIL ${r.chapter}: ${res.status} ${res.text.slice(0, 300)}`); process.exit(1); }
    continue;
  }
  const after = await state(r.chapter);
  if (after && after.h === r.newHash) console.log(`done ${r.chapter}: version ${after.v}, hash verified`);
  else { console.error(`FAIL ${r.chapter}: ${res.status} ${res.text.slice(0, 300)}\nstopped; later chapters not touched`); process.exit(1); }
}
console.log('finished');
