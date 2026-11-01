import {isPublicMedia} from './_media.js';
// Presentation metadata only. Never stores or rewrites a reviewed reading paragraph.
export const SEAL_KEY='ik:blocks:chapter:seals.presentation';
export const SEAL_ROLES=['title','why','reality','strength','risk','reinforce','practice','evidence','story','insight','luck-context'];
const id=v=>typeof v==='string'&&/^[A-Za-z0-9_.:-]{1,100}$/.test(v);
const text=(v,n)=>typeof v==='string'&&v.length<=n&&!/[<>\u0000-\u0008]/.test(v);
const phase=r=>({risk:'conflict',reinforce:'practice',practice:'practice',reality:'daily',strength:'daily',title:'daily',why:'daily',evidence:'daily',story:'daily',insight:'daily','luck-context':'daily'}[r]||r);
const plain=o=>o&&typeof o==='object'&&!Array.isArray(o);
const point=v=>plain(v)&&Object.keys(v).every(k=>['x','y'].includes(k))&&['x','y'].every(k=>typeof v[k]==='number'&&v[k]>=0&&v[k]<=100);
const safe=v=>plain(v)&&Object.keys(v).every(k=>['top','right','bottom','left'].includes(k))&&['top','right','bottom','left'].every(k=>typeof v[k]==='number'&&v[k]>=0&&v[k]<=45)&&v.top+v.bottom<90&&v.left+v.right<90;
export const emptySeals=()=>({schemaVersion:1,version:0,draft:[],published:[],publishedVersion:0,review:null,history:[]});
export async function sealDigest(value){const bytes=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify(value)));return Array.from(new Uint8Array(bytes),b=>b.toString(16).padStart(2,'0')).join('');}
export function validateSealScenes(chapters,media=[]){
 const issues=[],seen=new Set(),assets=new Map(media.map(m=>[m.id,m]));
 const add=(chapterId,sceneId,code)=>issues.push({chapterId,sceneId,code});
 if(!Array.isArray(chapters)||chapters.length>150)return [{code:'invalid-chapters'}];
 for(const c of chapters){if(!plain(c)||!id(c.chapterId)||seen.has(c.chapterId)){add(c?.chapterId,'','invalid-chapter-id');continue;}seen.add(c.chapterId);
  if(Object.keys(c).some(k=>!['schemaVersion','chapterId','question','hook','practice','order','scenes'].includes(k)))add(c.chapterId,'','unknown-chapter-field');
  if(c.schemaVersion!==1||!text(c.question,180)||!c.question.trim()||!text(c.hook||'',300)||!text(c.practice||'',300)||!Number.isInteger(c.order)||c.order<0||c.order>999)add(c.chapterId,'','invalid-presentation');
  if(!Array.isArray(c.scenes)||c.scenes.length>30||!c.scenes.length){add(c.chapterId,'','invalid-scenes');continue;}
  const sceneIds=new Set(),roles=new Set();
  for(const s of c.scenes){if(!plain(s)||!id(s.id)||sceneIds.has(s.id)){add(c.chapterId,s?.id,'invalid-scene-id');continue;}sceneIds.add(s.id);
   if(Object.keys(s).some(k=>!['id','role','order','bodyAssetId','backgroundAssetId','focus','safeArea','crop'].includes(k)))add(c.chapterId,s.id,'unknown-scene-field');
   if(!SEAL_ROLES.includes(s.role)||roles.has(s.role))add(c.chapterId,s.id,'invalid-or-duplicate-role');roles.add(s.role);
   if(!Number.isInteger(s.order)||s.order<0||s.order>999||s.focus&&!point(s.focus)||s.safeArea&&!safe(s.safeArea)||s.crop&&!['contain','cover'].includes(s.crop))add(c.chapterId,s.id,'invalid-layout');
   for(const [key,bg]of [['bodyAssetId',false],['backgroundAssetId',true]]){if(!s[key])continue;const m=assets.get(s[key]);if(!m){add(c.chapterId,s.id,'missing-asset:'+s[key]);continue;}if((m.paragraphRole&&phase(m.paragraphRole)!==phase(s.role))||(m.phase&&m.phase!==phase(s.role)))add(c.chapterId,s.id,'asset-phase-mismatch:'+s[key]);if(!isPublicMedia(m))add(c.chapterId,s.id,'asset-not-approved:'+s[key]);if(/^panelbg-/.test(m.id)!==bg||/tarot/i.test(m.pool||m.type||''))add(c.chapterId,s.id,'asset-role-mismatch:'+s[key]);if((m.chapterIds||m.chapters||[]).length&&!(m.chapterIds||m.chapters).includes(c.chapterId))add(c.chapterId,s.id,'asset-chapter-mismatch:'+s[key]);}
  }
 }
 return issues;
}
