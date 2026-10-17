// 풀이 문체·단정성 설정 API. 로직은 ../_style.js, 저장은 ../_stylestore.js (KV 'style:cfg' · 'style:hist').
// 공개:  GET  ?a=active                 — { ver, defaultStyle, chapters, address } (프롬프트 본문은 내보내지 않는다)
// 관리자(Bearer ADMIN_PASSWORD):
//        GET  ?a=cfg                    — 활성 설정 + 버전 이력 요약 + 기본값
//        GET  ?a=version&ver=N          — 이력의 한 버전
//        POST ?a=save     { config, note }
//        POST ?a=rollback { ver, note? } — 과거 설정을 새 버전으로 다시 저장
//        POST ?a=preview  { sd, ext, domain, styles?, config?, compose? } — 같은 사주·같은 근거로 문체별 결과 비교
import { json, isAdmin, configError } from '../_lib.js';
import { kvOf } from '../_store.js';
import * as S from '../_style.js';
import { inspectWriting } from '../_ux-writing.js';
import { loadStyle, loadHist, saveStyle, styleFor } from '../_stylestore.js';
import * as IK from '../_ik.js';
import { loadAll, meta, scrub, llm, blockedDocs } from '../_ikstore.js';

export async function onRequest({ request, env }) {
  const url = new URL(request.url), a = url.searchParams.get('a') || '', post = request.method === 'POST';
  if (a === 'active' && !post) {
    const kv = kvOf(env, { cache: true }), cur = await loadStyle(kv), c = cur.config;
    return json({ ok: true, ver: cur.ver, defaultStyle: c.defaultStyle, chapters: c.chapters, writing: c.writing, address: c.story.address, styleVersion: S.STYLE_VERSION });
  }
  if (!isAdmin(request, env)) return json({ error: '관리자 인증이 필요합니다' }, 401);
  const ce = configError(env); if (ce) return json({ error: ce }, 501);
  const kv = kvOf(env);
  let b = {}; if (post) { try { b = await request.json(); } catch { return json({ error: '잘못된 요청 형식입니다' }, 400); } }

  if (a === 'cfg' && !post) {
    const [cur, hist] = await Promise.all([loadStyle(kv), loadHist(kv)]);
    return json({ ok: true, active: cur, hist: hist.map(h => ({ ver: h.ver, at: h.at, note: h.note || '', defaultStyle: h.config.defaultStyle, rolledBackFrom: h.rolledBackFrom || null })),
      defaults: { config: S.DEFAULT_CONFIG, prompts: S.DEFAULT_PROMPTS }, styles: S.STYLE_IDS.map(id => ({ id, name: S.STYLE_KO[id], desc: S.STYLE_DESC[id] })),
      hardLimits: S.HARD_LIMITS, structure: S.STRUCTURE.map(s => ({ kind: s[0], name: s[1], guide: s[2] })), domains: IK.DOMAINS, aiAvailable: !!(env.ANTHROPIC_API_KEY || env.OPENAI_API_KEY || env.GEMINI_API_KEY) });
  }
  if (a === 'version' && !post) {
    const ver = +url.searchParams.get('ver'), h = (await loadHist(kv)).find(x => x.ver === ver), cur = await loadStyle(kv);
    const rec = h || (cur.ver === ver ? cur : null); return rec ? json({ ok: true, version: rec }) : json({ error: '없는 버전입니다' }, 404);
  }
  if (a === 'save' && post) {
    if (!b.config || typeof b.config !== 'object') return json({ error: '설정이 필요합니다' }, 400);
    const rec = await saveStyle(kv, b.config, b.note); return json({ ok: true, active: rec });
  }
  if (a === 'rollback' && post) {
    const ver = +b.ver, h = (await loadHist(kv)).find(x => x.ver === ver); if (!h) return json({ error: '없는 버전입니다' }, 404);
    const rec = await saveStyle(kv, h.config, b.note || (ver ? 'v' + ver + ' 으로 되돌림' : '기본값으로 되돌림'), { rolledBackFrom: ver }); return json({ ok: true, active: rec });
  }
  if (a === 'preview' && post) return preview(env, kv, b);
  return json({ error: '알 수 없는 요청입니다' }, 404);
}

// 같은 사주로 문체만 바꿔 합성한다. 계산(facts)·근거 패키지는 한 번만 만들고 세 번 재사용한다 → 근거가 바뀌지 않음을 factsHash 로 보인다.
async function preview(env, kv, b) {
  if (!IK.DOMAINS[b.domain]) return json({ error: '분야가 필요합니다' }, 400);
  const styles = (Array.isArray(b.styles) ? b.styles : S.STYLE_IDS).filter(s => S.STYLE_IDS.includes(s));
  if (!styles.length) return json({ error: '문체가 필요합니다' }, 400);
  try {
    const cur = await loadStyle(kv), cfg = b.config ? S.cleanConfig(b.config) : cur.config, loaded = { ver: b.config ? cur.ver : cur.ver, config: cfg };
    const [items, design, rules, m] = await Promise.all([loadAll(kv, [b.domain]), kv.get('ik:design', 'json'), kv.get('ik:rules', 'json'), meta(kv)]);
    const rl = rules || IK.DEFAULT_RULES, sd = scrub(b.sd);
    const pkg = IK.buildPackage(sd, b.ext, items, design, rl, { domain: b.domain, includeDraft: !!b.includeDraft, blockedDocs: b.includeDraft ? null : await blockedDocs(kv) });
    pkg.versions = { knowledge: m.k, design: m.d, rules: m.r, composer: IK.COMPOSER_VERSION };
    const factsHash = S.sig(IK.stable({ facts: pkg.facts, sections: pkg.order.map(id => [id, pkg.sections[id].status, pkg.sections[id].items.map(i => i.id)]) }));
    const plain = IK.composePlain(pkg, rl), out = {}; let provider = null, aiError = null;
    const wantAi = b.compose !== 'plain';
    const variants = b.comparison ? [{key:"general",id:"cautious",level:2,name:"B. 개선된 일반 풀이"},{key:"level3",id:"direct",level:3,name:"C. 팩폭 3단계"},{key:"level4",id:"direct",level:4,name:"D. 팩폭 4단계"}] : styles.map(id=>({key:id,id,name:S.STYLE_KO[id]}));
    for (const variant of variants) {
      const { id } = variant;
      const st = styleFor(loaded, [id === loaded.config.defaultStyle ? null : null], { structure: true, soft: IK.hasSoft(pkg) }); // 문체는 미리보기에서 강제로 지정
      const forced = styleFor({ ver: loaded.ver, config: { ...cfg, defaultStyle: id, chapters: {}, writing: {...cfg.writing,directness:variant.level || cfg.writing.directness,chapterDirectness:{}} } }, [], { structure: true, soft: IK.hasSoft(pkg) });
      let composed = null, text = null;
      if (wantAi) {
        try { const r = await llm(env, IK.composerSystem(rl, b.domain, forced), IK.composerUser(pkg), 6000, 60000); composed = IK.sanitizeComposed(r.text, pkg); provider = r.provider; if (!composed) aiError = 'AI 답이 형식에 맞지 않습니다'; }
        catch (e) { aiError = e.message; }
      }
      if (composed) text = Object.values(composed).flat().map(p => p.text);
      const paragraphs=composed ? Object.entries(composed).flatMap(([section,ps])=>ps.map((p,i)=>({...p,id:section+':'+i}))) : [];
      const writingCheck=paragraphs.length ? inspectWriting(paragraphs,forced.writing) : null;
      const check=text ? S.styleCheck(text,id,cfg) : null;
      if (check && writingCheck) {
        check.issues.push(...writingCheck.issues.map(x=>({level:x.severity,msg:x.id+' · '+x.code+' · '+x.excerpt})));
        check.status=check.issues.some(x=>x.level==='FAIL')?'FAIL':check.issues.length?'WARNING':'PASS';
      }
      const seen=new Set();let duplicates=0;
      paragraphs.forEach(p=>{const t=p.text.replace(/\s/g,'');if(seen.has(t))duplicates++;seen.add(t);});
      out[variant.key] = { style: id, name: variant.name, directive: forced.directive, composed, check, writingCheck, metrics: {paragraphs:paragraphs.length,withRefs:paragraphs.filter(p=>p.refs?.length).length,duplicates,directness:forced.meta.directness}, sig: forced.sig };
      void st;
    }
    if (b.comparison) out.legacy={style:"legacy",name:"A. 기존 원문",composed:plain,check:null,directive:"원본 DB 기반 합성. 새 문체 적용 전입니다."};
    return json({ ok: true, factsHash, versions: pkg.versions, knowledge: knowledgeBasis(pkg), insufficient: pkg.insufficient, soft: IK.softSections(pkg), confidence: pkg.confidence, plain, styles: out, provider, aiError, sectionTitles: Object.fromEntries(pkg.order.map(id => [id, pkg.sections[id].title])) });
  } catch (e) { return json({ error: e.message || '실패' }, 400); }
}
// 관리자용 근거 목록: 풀이 id · 제목 · 버전 · 검수 · 출처 자료
function knowledgeBasis(pkg) {
  const out = [];
  for (const id of pkg.order) for (const it of pkg.sections[id].items) out.push({ section: id, id: it.id, title: it.title, version: it.version || null, confidence: it.confidence, stance: it.stance, sources: (it.evidence || []).map(e => ({ docId: e.docId, title: e.title, pages: e.pageStart ? e.pageStart + (e.pageEnd && e.pageEnd !== e.pageStart ? '-' + e.pageEnd : '') : '' })) });
  return out;
}
