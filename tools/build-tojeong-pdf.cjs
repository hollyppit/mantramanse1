// 토정비결 원문 PDF: 규장각본(奎古 1077) 140괘 + 국립중앙도서관 필사본 보충(빠진 4괘)을 한 권으로 묶는다.
// 사용: node tools/build-tojeong-pdf.cjs   → output/tojeong/토정비결_원문_규장각본_국중도보충.html·.pdf
// PDF 는 이 컴퓨터의 Microsoft Edge(헤드리스 인쇄)로 만든다. 글꼴은 바탕·Noto Serif KR(한자 포함).
const fs = require('fs'), path = require('path'), { execFileSync } = require('child_process');
const root = path.join(__dirname, '..');
const T = require(path.join(root, 'report', 'newyear', 'texts', 'tojeong-kyu1077.js'));
let S = null; try { S = require(path.join(root, 'report', 'newyear', 'texts', 'tojeong-nl-supplement.js')); } catch { S = null; }
const outDir = path.join(root, 'output', 'tojeong');
const base = '토정비결_원문_규장각본_국중도보충';
const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const NUM = d => '〇一二三四五六七八九'[d];
const hanNum = g => String(g).split('').map(NUM).join('');
const MONTH = ['', '正月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '十一月', '十二月'];
const pair = p => `<span class="ph">${esc(p[0])}</span><span class="ph">${esc(p[1])}</span>`;
const mark = s => esc(s).replace(/□/g, '<b class="ill">□</b>');
const pairM = p => `<span class="ph">${mark(p[0])}</span><span class="ph">${mark(p[1])}</span>`;

const want = []; for (let a = 1; a <= 8; a++) for (let b = 1; b <= 6; b++) for (let c = 1; c <= 3; c++) want.push(a * 100 + b * 10 + c);
const pages = [];
for (const g of want) {
  const v = T.gua[g];
  if (v) {
    const band = ['위 단', '가운데 단', '아래 단'];
    const ill = v.review.illegible.length ? `<p class="note">판독 불가(□) ${v.review.illegible.length}칸 — 보수 종이·찢김. 다른 판본 대조 필요.</p>` : '';
    pages.push(`<section class="gua">
  <header><div class="no">${hanNum(g)} <small>${g}</small></div><div class="zy">${esc(v.zhouyi)}</div></header>
  <dl class="head"><dt>卦象</dt><dd>${pairM(v.guaxiang)}</dd><dt>註解</dt><dd>${mark(v.zhujie)}</dd></dl>
  <h3>卦辭</h3>
  <table class="gc">${[0, 1, 2].map(b => `<tr><th>${band[b]}</th>${[0, 1, 2].map(k => `<td>${pairM(v.guaci[b * 3 + k])}</td>`).join('')}</tr>`).join('')}</table>
  <h3>月別</h3>
  <table class="mo"><tr><th></th><th>위 단</th><th>가운데 단</th><th>아래 단</th></tr>${Object.keys(v.months).map(m => `<tr><th>${MONTH[m]}</th>${v.months[m].map(p => `<td>${pairM(p)}</td>`).join('')}</tr>`).join('')}</table>
  ${ill}
  <footer>저본: 규장각 奎古 1077 면 ${esc(v.side)}</footer>
</section>`);
  } else {
    const s = S && S.gua && S.gua[g];
    pages.push(`<section class="gua supp">
  <header><div class="no">${hanNum(g)} <small>${g}</small></div><div class="zy">보충본</div></header>
  <p class="warn">규장각본 스캔에 이 괘의 면이 없어 <b>국립중앙도서관 「[土亭秘訣]」 필사본</b>에서 보충했습니다. 계통이 달라 규장각본의 45구(괘사 9·월별 36) 구성과 다릅니다.</p>
  ${s ? `<h3>앞부분(총론)</h3><p class="lines">${s.front.map(mark).join('　')}</p>
  <h3>뒷부분(달 묶음 구절)</h3><p class="lines">${s.back.map(mark).join('　')}</p>
  ${s.note ? `<p class="note">판독 메모: ${esc(s.note)}</p>` : ""}
  <footer>출처: 국립중앙도서관 「[土亭秘訣]」(이지함, 발행처 미상, CNTS-00076808100) 앞부분 ${esc(s.frontPage)}면·뒷부분 ${esc(s.backPage)}면, 사용자 화면 촬영본 판독</footer>`
    : '<p class="note">보충 판독 전</p>'}
</section>`);
  }
}

const nGua = Object.keys(T.gua).length, illTotal = Object.values(T.gua).reduce((n, v) => n + v.review.illegible.length, 0);
const html = `<!doctype html><html lang="ko"><head><meta charset="utf-8"><title>토정비결 원문</title><style>
@page { size: A4; margin: 16mm 15mm; }
body { font-family: "HANBatang","Batang","Noto Serif KR",serif; color:#111; font-size: 10.5pt; line-height: 1.55; }
h1 { font-size: 24pt; margin: 40mm 0 6mm; } h2 { font-size: 15pt; border-bottom: 1px solid #333; padding-bottom: 2mm; }
h3 { font-size: 11pt; margin: 4mm 0 1.5mm; color:#333 }
.cover p, .intro p, .intro li { font-size: 10.5pt; }
section.gua { page-break-before: always; }
header { display:flex; align-items: baseline; gap: 6mm; border-bottom: 2px solid #111; padding-bottom: 2mm; }
.no { font-size: 22pt; font-weight: 700; } .no small { font-size: 10pt; color:#666; font-weight: 400 } .zy { font-size: 14pt; }
dl.head { display:grid; grid-template-columns: 14mm 1fr; gap: 1mm 3mm; margin: 3mm 0; } dl.head dt { color:#555 } dl.head dd { margin:0; font-size: 12.5pt }
table { width:100%; border-collapse: collapse; } td, th { border: 1px solid #bbb; padding: 1.2mm 2mm; vertical-align: top; }
th { background:#f3f1ec; font-weight: 400; white-space: nowrap; font-size: 9.5pt; color:#444 }
td { font-size: 12pt; letter-spacing: .5px } .ph { display:inline-block; margin-right: 3mm }
table.mo td { font-size: 11.5pt; padding: .9mm 1.5mm }
.ill { color:#b00; } .note { color:#b00; font-size: 9pt } .warn { background:#fff6e5; border:1px solid #e8c77d; padding: 2mm 3mm; font-size: 10pt }
.lines { font-size: 13pt; line-height: 2; letter-spacing: .5px }
footer { margin-top: 3mm; font-size: 8.5pt; color:#666 }
table.num td, table.num th { text-align:center; font-size: 10pt }
</style></head><body>
<section class="cover">
<h1>土亭秘訣 원문</h1>
<p style="font-size:13pt">규장각본(四十五句 松亭土亭秘訣) 140괘 + 국립중앙도서관 필사본 보충 4괘</p>
<p>정리: 만트라 스튜디오 · ${esc(T.meta.transcribedAt)} · 상태: 판독본(관리자 대조 전)</p>
</section>
<section class="intro" style="page-break-before:always">
<h2>판본과 판독 방법</h2>
<ul>
<li><b>저본</b>: ${esc(T.meta.source)}. 원문 이미지는 서울대학교 규장각한국학연구원 원문검색서비스 공개본.</li>
<li><b>수록</b>: ${nGua}괘. 저본 스캔에 면이 없는 ${T.meta.missing.join('·')}괘는 국립중앙도서관 「[土亭秘訣]」 필사본에서 보충(계통이 달라 구성이 다름, 해당 면에 표시).</li>
<li><b>판독</b>: ${esc(T.meta.method)}</li>
<li><b>표기</b>: ${esc(T.meta.variants)} 인쇄 꼴을 따른 글자(예: '이미 已'를 己 꼴로 찍은 곳)는 고치지 않았다.</li>
<li><b>판독 불가</b>: 보수 종이·찢김으로 읽지 못한 글자는 <b class="ill">□</b>(저본 전체 ${illTotal}칸).</li>
<li><b>싣지 않은 것</b>: 저본의 한글 풀이(해왈·구별 풀이)는 저작권 확인 전이라 싣지 않았다.</li>
</ul>
<h2>각 괘 면 읽는 법</h2>
<p>卦象(괘의 상징 구), 註解(괘의 뜻 한 줄), 卦辭 9구(위·가운데·아래 단 각 3구), 月別 36구(달마다 위·가운데·아래 단 1구씩). 한 구는 4자 2마디.</p>
<h2>작괘법 (저본 「鑑定法」·「數理法」)</h2>
<p>상괘 = (세는 나이 + 당년 태세수) ÷ 8의 나머지(0이면 8) · 중괘 = (당년 생월 날수 큰달 30·작은달 29 + 생월 월건수) ÷ 6의 나머지(0이면 6) · 하괘 = (생일 + 생일 일진수) ÷ 3의 나머지(0이면 3). 천간수 甲己9 乙庚8 丙辛7 丁壬6 戊癸5.</p>
<table class="num"><tr><th>지지</th>${'子丑寅卯辰巳午未申酉戌亥'.split('').map(c => `<th>${c}</th>`).join('')}</tr>
<tr><th>太歲數</th>${[11, 13, 10, 10, 13, 9, 9, 13, 12, 12, 13, 11].map(n => `<td>${n}</td>`).join('')}</tr>
<tr><th>月建數</th>${[9, 8, 7, 6, 5, 4, 9, 8, 7, 6, 5, 4].map(n => `<td>${n}</td>`).join('')}</tr>
<tr><th>日辰數</th>${[9, 11, 8, 8, 11, 7, 7, 11, 10, 10, 11, 9].map(n => `<td>${n}</td>`).join('')}</tr></table>
</section>
${pages.join('\n')}
</body></html>`;

fs.mkdirSync(outDir, { recursive: true });
const htmlPath = path.join(outDir, base + '.html'), pdfPath = path.join(outDir, base + '.pdf');
fs.writeFileSync(htmlPath, html);
const edge = ['C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', 'C:/Program Files/Microsoft/Edge/Application/msedge.exe'].find(p => fs.existsSync(p));
if (!edge) { console.log('Edge 를 찾지 못해 HTML 만 만들었습니다:', htmlPath); process.exit(0); }
// Edge 가 이미 떠 있으면 헤드리스 요청을 그 창에 넘기고 바로 끝나므로 별도 프로필을 쓴다. 한글 경로를 피하려고 임시 폴더에서 인쇄한 뒤 옮긴다.
const os = require('os'), tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'tjpdf-'));
const tHtml = path.join(tmp, 'tj.html'), tPdf = path.join(tmp, 'tj.pdf');
fs.copyFileSync(htmlPath, tHtml);
execFileSync(edge, ['--headless=new', '--disable-gpu', '--no-pdf-header-footer', '--user-data-dir=' + path.join(tmp, 'prof'), '--print-to-pdf=' + tPdf, 'file:///' + tHtml.replace(/\\/g, '/')], { stdio: 'ignore', timeout: 180000 });
// msedge.exe 는 실제 인쇄 프로세스가 끝나기 전에 돌아올 수 있어, 파일 크기가 멈출 때까지 기다린다(최대 3분)
const sleep = ms => Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
let last = -1;
for (let i = 0; i < 180; i++) { sleep(1000); const n = fs.existsSync(tPdf) ? fs.statSync(tPdf).size : -1; if (n > 0 && n === last) break; last = n; }
if (!fs.existsSync(tPdf)) { console.error('PDF 생성 실패(Edge 출력 없음). HTML:', htmlPath); process.exit(1); }
fs.copyFileSync(tPdf, pdfPath);
try { fs.rmSync(tmp, { recursive: true, force: true }); } catch { }
console.log(JSON.stringify({ html: path.relative(root, htmlPath), pdf: path.relative(root, pdfPath), bytes: fs.statSync(pdfPath).size, gua: nGua, supplement: S ? Object.keys(S.gua).length : 0 }));
