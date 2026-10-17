const text=(v,n=1200)=>typeof v==='string'?v.trim().slice(0,n):'';
const media=v=>{v=text(v,600);return /^(\/api\/clipfile\?k=[\w.-]{1,120}|\/report\/[\w./-]+\.(webp|png|jpe?g|mp4|webm)|https:\/\/[^\s"'<>]+)$/.test(v)?v:''};
const bound=(v,d,min,max)=>Number.isFinite(+v)?Math.max(min,Math.min(max,+v)):d;
export function cleanCinematic(r){
 if(!r||typeof r!=='object')return undefined;
 const seen=new Set();
 return {enabled:r.enabled!==false,button:text(r.button,80)||'봉인을 풀어 내 운 확인하기',seal:media(r.seal),skipRepeat:r.skipRepeat!==false,scenes:(Array.isArray(r.scenes)?r.scenes:[]).slice(0,30).filter(s=>s&&/^[a-z0-9_-]{2,60}$/.test(s.id)&&!seen.has(s.id)&&seen.add(s.id)).map(s=>({id:s.id,title:text(s.title,200),enabled:s.enabled!==false,image:media(s.image),imageMobile:media(s.imageMobile),video:media(s.video),videoMobile:media(s.videoMobile),foreground:media(s.foreground),motion:['none','zoom-in','zoom-out','pan-left','pan-right','pan-up','pan-down','parallax'].includes(s.motion)?s.motion:'zoom-in',transition:['fade','dissolve','slide-left','slide-right','blackout'].includes(s.transition)?s.transition:'dissolve',transitionMs:bound(s.transitionMs,650,100,2000),segments:(Array.isArray(s.segments)?s.segments:[]).slice(0,30).map(p=>({text:text(p.text),seconds:bound(p.seconds,0,0,60)})).filter(p=>p.text)}))};
}
export function cinematicErrors(r){if(!r||r.enabled===false)return [];const active=r.scenes.filter(s=>s.enabled!==false);return !active.length?['활성 시네마틱 장면이 필요합니다.']:active.flatMap(s=>!s.title||!s.segments.length?[s.id+': 제목과 독백 구간이 필요합니다.']:[]);}
