// 풀이 화면 이미지 슬롯 목록 (공개 읽기) — 뷰어가 자동차·직업·배우자·전생 이미지 주소를 얻는다.
// GET /api/assets → { assets: { '슬롯id': '/api/clipfile?k=…' }, videos: { '슬롯id': '/api/clipfile?k=…mp4' } }   저장: GLOSSARY_KV 'assets:map' (관리자 생성 API 가 쓴다)
import { json } from '../_lib.js';

export async function onRequestGet({ env }) {
  if (!env.GLOSSARY_KV) return json({ assets: {}, videos: {} });
  const map = (await env.GLOSSARY_KV.get('assets:map', 'json')) || {};
  const videos = (await env.GLOSSARY_KV.get('assets:video', 'json')) || {}, res = json({ assets: map, videos }); res.headers.set('cache-control', 'public, max-age=60');
  return res;
}
