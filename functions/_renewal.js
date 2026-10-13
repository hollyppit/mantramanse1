// Additive JSON schema in free:onboard; no tables or asset keys are replaced.
const text=(v,n=1200)=>typeof v==='string'?v.trim().slice(0,n):'';
const media=v=>{v=text(v,600);return /^(\/api\/clipfile\?k=[\w.-]{1,120}|\/report\/[\w./-]+\.(webp|png|jpe?g|mp4|webm)|https:\/\/[^\s"'<>]+)$/.test(v)?v:''};
const route=v=>/^#\/[\w/?=&%.-]*$/.test(text(v,300))?text(v,300):'#/begin';
const lines=v=>Array.isArray(v)?v.slice(0,12).map(x=>text(x)).filter(Boolean):[];
const ids=['hook','research','prepare','decode','preview'];
export function cleanRenewal(r){
  if(!r||typeof r!=='object')return null;
  const seen=new Set();
  return {revision:2,enabled:r.enabled!==false,
    scenes:(Array.isArray(r.scenes)?r.scenes:[]).filter(x=>x&&ids.includes(x.id)&&!seen.has(x.id)&&seen.add(x.id)).map(x=>({
      id:x.id,enabled:x.enabled!==false,title:text(x.title,200),sub:text(x.sub,400),body:lines(x.body),emphasis:text(x.emphasis,400),detail:text(x.detail,2400),
      image:media(x.image),imageMobile:media(x.imageMobile),video:media(x.video),bg:media(x.bg),overlay:Number.isFinite(+x.overlay)?Math.max(0,Math.min(1,+x.overlay)):0.65,
      character:x.character===true,guide:x.guide==='male'?'male':'female',dialogue:text(x.dialogue,600),researchIds:Array.isArray(x.researchIds)?x.researchIds.filter(v=>typeof v==='string'&&/^[a-z0-9_-]{2,41}$/.test(v)).slice(0,12):[],
      cta:{show:!!(x.cta&&x.cta.show),text:text(x.cta&&x.cta.text,80),to:route(x.cta&&x.cta.to)}
    })),
    previews:(Array.isArray(r.previews)?r.previews:[]).slice(0,16).filter(x=>x&&/^[a-z0-9_-]{2,41}$/.test(x.id)).map(x=>({id:x.id,enabled:x.enabled!==false,title:text(x.title,200),sample:text(x.sample),description:text(x.description),image:media(x.image),graph:Array.isArray(x.graph)?x.graph.slice(0,24).map(n=>Math.max(0,Math.min(100,+n||0))):[]}))
  };
}
export function renewalErrors(r){
  if(!r||r.enabled===false)return [];
  const errors=[];
  if(r.scenes.length!==5||new Set(r.scenes.map(s=>s.id)).size!==5)errors.push('5개 장면을 모두 유지해야 합니다. 비활성화로 숨길 수 있습니다.');
  const active=r.scenes.filter(s=>s.enabled!==false);
  if(!active.length)errors.push('활성 장면이 필요합니다.');
  if(!active.some(s=>s.cta.show&&s.cta.text&&s.cta.to))errors.push('활성 장면에 입력으로 이어지는 CTA가 필요합니다.');
  active.forEach(s=>{if(!s.title)errors.push(s.id+': 제목이 필요합니다.');if(s.character&&!s.dialogue)errors.push(s.id+': 캐릭터 대사가 필요합니다.');});
  if(/귀인|대공|수련생/.test(JSON.stringify(r.scenes.map(s=>[s.title,s.sub,s.body,s.emphasis,s.detail,s.dialogue,s.cta.text]))))errors.push('사용자 호칭 귀인·대공·수련생을 제거해 주세요.');
  return errors;
}
