// 관리자 전용 읽기 검사. AI 호출이나 설정 변경 없이 운영 연결 상태를 확인한다.
import {json,isAdmin,configError} from '../_lib.js';
import {kvOf} from '../_store.js';
import {loadAll,meta,blockedDocs} from '../_ikstore.js';
import {DEFAULT_RULES,isProduction,sourceAllowed} from '../_ik.js';
import {loadStyle} from '../_stylestore.js';
export async function onRequestGet({request,env}) {
  const err=configError(env); if(err) return json({error:err},500);
  if(!isAdmin(request,env)) return json({error:'관리자 인증이 필요합니다'},401);
  const kv=kvOf(env);
  const [content,docs,items,versions,rawRules,style,live,draft,blocked]=await Promise.all([env.GLOSSARY_KV.get('v2:content','json'),kv.get('src:idx','json'),loadAll(kv),meta(kv),kv.get('ik:rules','json'),loadStyle(kv),kv.get('free:onboard','json'),kv.get('free:onboard:draft','json'),blockedDocs(kv)]);
  const rules={...DEFAULT_RULES,...(rawRules||{})};
  const prod=items.filter(isProduction), usable=prod.filter(it=>sourceAllowed(it,blocked));
  const findings=[];
  const add=(level,tab,text)=>findings.push({level,tab,text});
  if(items.some(it=>it.status==='approved')) add('info','ikknow','검수 완료 상태의 풀이 지식은 게시해야 실제 서비스에 사용됩니다.');
  if(!usable.length) add('warning','ikknow','서비스에 쓸 수 있는 게시된 풀이 지식이 없습니다. 기본 해석 모듈로 결과를 구성합니다.');
  if(rules.serviceEnabled===false) add('info','ikrules','풀이 지식 서비스 연결이 꺼져 있습니다. 등록한 지식이 결과에 적용되지 않습니다.');
  else if(rules.serviceBody!==true) add('info','ikrules','풀이 지식은 심화 설명에 추가됩니다. 기존 본문을 대체하는 설정은 꺼져 있습니다.');
  if(prod.length!==usable.length) add('warning','ikdoc','게시된 지식 중 서비스 사용을 중지한 출처 자료와 연결된 항목이 있습니다.');
  if(rules.serviceAi===true && !(env.OPENAI_API_KEY||env.ANTHROPIC_API_KEY||env.GEMINI_API_KEY)) add('warning','ikrules','AI 합성 사용 설정이 켜져 있지만 AI 제공자가 연결되지 않아 DB 원문을 사용합니다.');
  if(draft && (!live||draft.version!==live.version)) add('info','onboard','온보딩 초안이 공개본과 다릅니다. 저장한 내용은 게시 후 방문자에게 보입니다.');
  return json({ok:true,versions:{content:content&&content.version||'기본값',...versions,style:style.ver,onboarding:live&&live.version||'기본값'},knowledge:{total:items.length,published:prod.length,usable:usable.length,approved:items.filter(it=>it.status==='approved').length,docs:(docs||[]).length},service:{enabled:rules.serviceEnabled!==false,ai:rules.serviceAi===true,body:rules.serviceBody===true,providerAvailable:!!(env.OPENAI_API_KEY||env.ANTHROPIC_API_KEY||env.GEMINI_API_KEY),composeAiAvailable:!!(env.OPENAI_API_KEY||env.ANTHROPIC_API_KEY)},findings});
}
