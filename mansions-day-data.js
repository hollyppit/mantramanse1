/* 날짜별 28수(값일수) 배속·행사별 길흉 데이터. 계산은 mansions-day.js. 28수 기본 목록은 mansions-data.js 를 함께 쓴다.
   원칙(2026-11-21 사용자 기준)
   · 원문(original)과 쉬운 해설(plain)을 따로 저장한다. 해설은 원문을 풀어 쓴 것이고 원문을 대신하지 않는다.
   · 원전·판본이 확인되지 않은 규칙은 판정에 쓰지 않는다(status 가 'verified' 가 아니면 화면은 '미확정'으로 표시하고 원문만 참고로 보여 준다).
   · 원문에 언급이 없는 행사(이사·개업·계약)는 만들어 넣지 않는다.
   · 기존 택일 점수(engine.js pickDays)에는 더하거나 빼지 않는다. */
(function (G) {
  'use strict';
  var VERSION = 'mansions-day-data-20261125-2';

  // ───────────── 날짜 배속 프로필 ─────────────
  // 28일마다 도는 값일수(值宿). 각 수는 칠요(七曜) 요일이 고정(각=목요일 …).
  var ASSIGN_PROFILES = [
    { id: 'zhisu-28day', isDefault: true, title: '28일 순환 값일수(값숙·值宿)',
      rule: '하루에 한 수씩 角→軫 순서로 돌고 28일마다 처음으로 돌아온다. 각 수의 칠요와 그날 요일이 같다.',
      anchor: { ymd: '2026-11-21', jdn: 2461366, mansionId: 'nu' },
      sources: [
        { role: '값일수 관행과 일지·수 조합(원전)', title: '《흠정협기변방서》(사고전서본) 권36 伏斷日 조', url: 'https://zh.wikisource.org/wiki/%E6%AC%BD%E5%AE%9A%E5%8D%94%E7%B4%80%E8%BE%A8%E6%96%B9%E6%9B%B8_(%E5%9B%9B%E5%BA%AB%E5%85%A8%E6%9B%B8%E6%9C%AC)/%E5%8D%B736', quote: '伏斷日…皆以值宿起算…二十八宿選擇之法來自西域…以子日起虚丑值斗亥值壁…戌值胃酉值觜申值鬼未值張午值角已值房辰值箕…寅值室' },
        { role: '기준일(현대 역서)', title: '중국 노황력 2026-11-21 · 2026-11-22', url: 'https://wannianli.tianqi.com/laohuangli/2026-11-21.html', quote: '北方女土蝠 值日星宿 / 北方虚日鼠' },
        { role: '기준일(현대 계산 라이브러리)', title: 'lunar-javascript(6tail) getXiu', url: 'https://github.com/6tail/lunar-javascript', quote: 'LunarUtil.XIU[일지+요일]' } ],
      // 원전 대조: 협기변방서 伏斷 조합(일지 → 수) 12쌍.
      // 卯는 본문 '夘值斗'(四庫 원본 葉39a에도 있음)가 아니라 같은 권 伏斷時立成 표와 본문 '寅夘日在後三宮'을 따라 女(2026-11-22 판본 대조).
      fuduan: { '子': 'xu', '丑': 'dou', '寅': 'shi', '卯': 'nu', '辰': 'ji', '巳': 'fang', '午': 'jiao', '未': 'zhang', '申': 'gui', '酉': 'zi', '戌': 'wei_stomach', '亥': 'bi_wall' },
      status: 'verified',
      // 七元 규칙(甲子日 起 虛·奎·畢·鬼·翼·氐·箕)과 칠요 배속은 《협기변방서》 卷1 葉27a·28a 원본 면으로 확인했고, 기준일 결과와 같다.
      approval: { status: 'approved', date: '2026-11-25', by: '사용자', basis: '《협기변방서》 卷1·卷36 사고전서 원본 면 대조(edition_verified, 2026-11-22) + 엔진 결과 일치 + 테스트' },
      statusText: '값일수 관행과 七元·칠요 규칙, 일지·수 조합은 원전(《협기변방서》 사고전서본 원본 면)으로, 기준일은 현대 역서 두 곳으로 확인했습니다. 원전에는 날짜 기준일 자체가 적혀 있지 않습니다.' } ];

  // ───────────── 伏斷日 프로필 ─────────────
  // 그날 일지와 그날 수가 정해진 짝이면 伏斷日. 판정(이 날이 伏斷日인가)만 승인 자료로 하고,
  // 행사별 금기는 문헌마다 달라(협기변방서는 혼례 금기를 배척) 판정·점수에 쓰지 않고 문헌별로 그대로 보여 준다.
  var FUDUAN_PROFILES = [
    { id: 'xieji-fuduan', isDefault: true, title: '伏斷日(복단일)',
      pairs: { '子': 'xu', '丑': 'dou', '寅': 'shi', '卯': 'nu', '辰': 'ji', '巳': 'fang', '午': 'jiao', '未': 'zhang', '申': 'gui', '酉': 'zi', '戌': 'wei_stomach', '亥': 'bi_wall' },
      status: 'approved', approval: { date: '2026-11-25', by: '사용자', basis: '《협기변방서》 卷36 사고전서 원본 면(葉39a·伏斷時立成 표) edition_verified + 다른 문헌 4종 전산 일치' },
      sources: [
        { role: '원전(판본 확인)', title: '《흠정협기변방서》 卷36 辨譌 伏斷日 조·伏斷時立成 표 — 사고전서 영인본 원본 면(IA 06056527.cn n75·n80)', url: 'https://archive.org/details/06056527.cn', quote: '伏斷日…皆以值宿起算…以子日起虚丑值斗亥值壁…寅值室其值日之宿皆在日支後二宮…然寅夘日在後三宮' },
        { role: '교차(전산)', title: '《선택기요》 上編', url: 'https://zh.wikisource.org/wiki/%E9%81%B8%E6%93%87%E7%B4%80%E8%A6%81/%E4%B8%8A%E7%B7%A8', quote: '子虛丑斗寅嫌室。卯女辰箕巳怕房。午角未張申値鬼。酉觜戌胃亥壁當。' } ],
      note: '卯日은 본문에 「夘值斗」로 적혀 있으나, 같은 권의 표와 본문 설명이 女를 가리키고 다른 문헌 4종도 女라서 女로 봅니다.',
      // 행사별 쓰임: 문헌 원문 그대로(판정 아님)
      uses: [
        { label: '혼례', text: '《구선주후경》·《선택요략》은 꺼린다고 했지만, 《협기변방서》(卷10)는 옛 속설이라며 따르지 않았습니다.', quote: '結婚姻、嫁娶…忌…伏斷 / 嫁娶舊止宜不將日又忌章光無翹伏斷…今按章光無翹等皆俗説' },
        { label: '건축·입택', text: '《구선주후경》은 기둥 세우기·상량에, 《선택요략》은 수리·입택에 꺼린다고 했습니다.', quote: '豎柱…上梁…忌…伏斷 / 伏斷忌修造，入宅，上官，出行，嫁娶，百事凶' },
        { label: '장례', text: '《선택요략》은 장례에는 꺼리지 않는다고 했습니다.', quote: '葬埋不忌' } ] } ];

  // ───────────── 행사 목록 ─────────────
  // key, 화면 이름, 원문 용어(없으면 null = 원문 언급 없음 → 늘 미확정)
  var EVENTS = [['move', '이사', null], ['open', '개업', null], ['wedding', '혼례', '婚姻·嫁娶'], ['contract', '계약', null], ['build', '건축', '造作·起造'], ['funeral', '장례', '埋葬·葬'], ['gate', '문·물길 내기', '開門放水']];

  // ───────────── 길흉 원문 프로필 ─────────────
  // readings 는 원문 구절을 행사별로 읽은 것(근거 구절은 원문에서 그대로 뽑음). headVerdict 는 원문 제목줄의 吉/凶.
  var OMEN_PROFILES = [
    { id: 'yuxiaji-wikisource', isDefault: true, title: '《옥갑기(玉匣記)》 理論吉凶日篇 二十八宿值日吉凶歌',
      edition: '판본 미상 — 위키문헌 전사본(머리말: 東晉 許真人 저작으로 전함, 후대 증보로 여러 판본 존재)', sourceUrl: 'https://zh.wikisource.org/wiki/%E7%8E%89%E5%8C%A3%E8%A8%98', retrievedAt: '2026-11-21',
      transcriptionNotes: ['현존 최고본인 《續道藏》(1607) 《諸神聖誕日玉匣記等集》의 「二十八宿吉凶日」(도장 三家本 36책 332–335쪽, 원본 면 확인)은 이 노래와 다른 노래이며, 28수 중 15수의 길흉이 반대입니다. 그래서 어느 판본을 따를지 정하기 전까지 판정하지 않습니다.', '원문 전사의 鬥은 斗, 房日免의 免은 兔, 鬼井羊은 鬼金羊의 오기로 보인다(원문은 그대로 둠).', '전사본은 箕를 尾보다 먼저 싣는다.'],
      status: 'edition-unconfirmed',
      statusText: '원문은 확인했지만 판본(간행처·연대)이 확인되지 않아, 행사별 판정은 미확정으로 두고 원문만 참고로 보여 드립니다.',
      readingStatus: '행사별 읽기는 원문 구절에서 뽑은 것이며 전문가 검수 전입니다.',
      entries: {
    "jiao": {"head":"角木蛟 鄧禹 吉","headVerdict":"길","original":["角星造作主榮昌，外進田財及女郎；嫁取婚姻生貴子，文人及第見君王。","惟有葬埋不可用，三年之後主瘟癀；起工修築墳墓地，堂前立見主人王。"],"plain":"집 짓기와 혼인에는 좋게, 장례(땅에 묻는 일)에는 쓰지 말라고 노래합니다.","readings":{"build":{"verdict":"길","evidence":"角星造作主榮昌"},"wedding":{"verdict":"길","evidence":"嫁取婚姻生貴子"},"funeral":{"verdict":"흉","evidence":"惟有葬埋不可用"}}},
    "kang": {"head":"亢金龍 吳漢 凶","headVerdict":"흉","original":["亢星造作長房當，十日之中主有殃；田地消磨官失職，投軍定是虎狼傷。","嫁娶婚姻用此日，兒孫新婦守空房；埋葬若還逢此日，當時災禍主重喪。"],"plain":"집 짓기·혼인·장례 모두 피하라고 노래합니다.","readings":{"build":{"verdict":"흉","evidence":"亢星造作長房當，十日之中主有殃"},"wedding":{"verdict":"흉","evidence":"嫁娶婚姻用此日，兒孫新婦守空房"},"funeral":{"verdict":"흉","evidence":"埋葬若還逢此日，當時災禍主重喪"}}},
    "di": {"head":"氐土貉 賈複 凶","headVerdict":"흉","original":["氐星造作主災凶，費盡田園倉庫空；埋葬不可用此日，懸繩吊頸禍重重。","若是婚姻離別散，夜招浪子入房中；行船必定遭沉沒，更生聾啞子孫窮。"],"plain":"집 짓기·혼인·장례 모두 좋지 않게 보고, 배 타는 일도 조심하라고 합니다.","readings":{"build":{"verdict":"흉","evidence":"氐星造作主災凶"},"wedding":{"verdict":"흉","evidence":"若是婚姻離別散"},"funeral":{"verdict":"흉","evidence":"埋葬不可用此日"}}},
    "fang": {"head":"房日免 耿弇 吉","headVerdict":"길","original":["房星造作田園進，血財牛馬遍山岡；更招外處田莊宅，榮華富貴福壽康。","埋葬若然用此日，高官進職拜君王。嫁娶嫣娥歸月殿，三年抱子至朝堂。"],"plain":"집 짓기·장례·혼인을 모두 좋게 보는 날입니다.","readings":{"build":{"verdict":"길","evidence":"房星造作田園進"},"funeral":{"verdict":"길","evidence":"埋葬若然用此日，高官進職拜君王"},"wedding":{"verdict":"길","evidence":"嫁娶嫣娥歸月殿，三年抱子至朝堂"}}},
    "xin": {"head":"心月狐 寇恂 凶","headVerdict":"흉","original":["心星造作大為凶，更遭刑訟獄囚中；傳逆官非田宅退，埋葬卒暴死相從。","婚姻若是逢此日，子死兒亡淚滿胸；三年之內連遭禍，事事教君設始終。"],"plain":"집 짓기·장례·혼인 모두 피하라고 노래합니다.","readings":{"build":{"verdict":"흉","evidence":"心星造作大為凶"},"funeral":{"verdict":"흉","evidence":"埋葬卒暴死相從"},"wedding":{"verdict":"흉","evidence":"婚姻若是逢此日，子死兒亡淚滿胸"}}},
    "wei_tail": {"head":"尾火虎 岑彭 吉","headVerdict":"길","original":["尾星造作得天恩，富貴榮華福壽寧；招財進寶置田地，和合婚姻貴子孫。","埋葬若能依此日，男清女正子孫興；開門放水招田地，代代公侯遠播名。"],"plain":"집 짓기·혼인·장례·문과 물길 내기 모두 좋게 봅니다.","readings":{"build":{"verdict":"길","evidence":"尾星造作得天恩"},"wedding":{"verdict":"길","evidence":"和合婚姻貴子孫"},"funeral":{"verdict":"길","evidence":"埋葬若能依此日，男清女正子孫興"},"gate":{"verdict":"길","evidence":"開門放水招田地"}}},
    "ji": {"head":"箕水豹 馮異 吉","headVerdict":"길","original":["箕星造作主高強，歲歲年年大吉昌；埋葬修墳大吉利，田蠶牛馬遍山岡。","開門放水招財谷，篋滿金銀谷滿倉；福蔭高官加祿位，六親豐祿足安康。"],"plain":"집 짓기·장례·문 내고 물길 내기에 좋다고 노래합니다.","readings":{"build":{"verdict":"길","evidence":"箕星造作主高強"},"funeral":{"verdict":"길","evidence":"埋葬修墳大吉利"},"gate":{"verdict":"길","evidence":"開門放水招財谷"}}},
    "dou": {"head":"鬥木獬 朱佑 吉","headVerdict":"길","original":["鬥星造作主招財，文武官員位鼎台；田宅錢財千萬進，墳瑩修築富貴來。","開門放水招牛馬，旺財男女主和諧；遇此吉星來照護，時受福慶永無災。"],"plain":"집 짓기·묘 손보기·문과 물길 내기에 좋다고 노래합니다.","readings":{"build":{"verdict":"길","evidence":"鬥星造作主招財"},"funeral":{"verdict":"길","evidence":"墳瑩修築富貴來"},"gate":{"verdict":"길","evidence":"開門放水招牛馬"}}},
    "niu": {"head":"牛金牛 祭遵 凶","headVerdict":"흉","original":["牛星造作主災危，九橫三災不可推；家宅不安人口退，田蠶不利主人衰。","嫁娶婚姻皆自損，金銀財穀漸無之；若是開門並放水，牛豬羊馬亦傷悲。"],"plain":"집 짓기·혼인·문과 물길 내기를 피하라고 노래합니다.","readings":{"build":{"verdict":"흉","evidence":"牛星造作主災危"},"wedding":{"verdict":"흉","evidence":"嫁娶婚姻皆自損"},"gate":{"verdict":"흉","evidence":"若是開門並放水，牛豬羊馬亦傷悲"}}},
    "nu": {"head":"女土蝠 景丹 凶","headVerdict":"흉","original":["女星造作損婆娘，兄弟相嫌似虎狼；埋葬生災逢鬼怪，顛邪疾病更瘟癀。","為事遭官財失散，瀉痢留連不可當：開門放水逢此日，全家散敗主離鄉。"],"plain":"집 짓기·장례·문과 물길 내기를 피하라고 노래합니다.","readings":{"build":{"verdict":"흉","evidence":"女星造作損婆娘"},"funeral":{"verdict":"흉","evidence":"埋葬生災逢鬼怪"},"gate":{"verdict":"흉","evidence":"開門放水逢此日，全家散敗主離鄉"}}},
    "xu": {"head":"虛日鼠 蓋延 凶","headVerdict":"흉","original":["虛星造作生災殃，男女孤眠不一雙；內亂風聲無禮節，兒孫媳婦伴人床，","開門放水招災禍，虎咬蛇傷及卒亡；三三五五連年病，家破人亡不可當。"],"plain":"집 짓기와 문·물길 내기를 피하라고 노래합니다.","readings":{"build":{"verdict":"흉","evidence":"虛星造作生災殃"},"gate":{"verdict":"흉","evidence":"開門放水招災禍"}}},
    "wei_roof": {"head":"危月燕 堅鐔 凶","headVerdict":"흉","original":["危星不可造高堂，自吊遭刑見血光；三歲孩兒遭水厄，後生出外不還鄉。","埋葬若還逢此日，周年百日臥高床；開門放水遭刑杖，三年五載亦悲傷。"],"plain":"높은 집 짓기·장례·문과 물길 내기를 피하라고 노래합니다.","readings":{"build":{"verdict":"흉","evidence":"危星不可造高堂"},"funeral":{"verdict":"흉","evidence":"埋葬若還逢此日，周年百日臥高床"},"gate":{"verdict":"흉","evidence":"開門放水遭刑杖"}}},
    "shi": {"head":"室火豬 耿純 吉","headVerdict":"길","original":["室星造作進田牛，兒孫代代近五侯；富貴榮華天上至，壽如彭祖八千秋。","開門放水招財帛，和合婚姻生貴兒；埋葬若能依此日，門庭興旺福無休。"],"plain":"집 짓기·문과 물길 내기·혼인·장례 모두 좋게 봅니다.","readings":{"build":{"verdict":"길","evidence":"室星造作進田牛"},"gate":{"verdict":"길","evidence":"開門放水招財帛"},"wedding":{"verdict":"길","evidence":"和合婚姻生貴兒"},"funeral":{"verdict":"길","evidence":"埋葬若能依此日，門庭興旺福無休"}}},
    "bi_wall": {"head":"壁水貐 臧宮 吉","headVerdict":"길","original":["壁星造作進莊園，絲蠶大熟福滔天；奴婢自來人口進，開門放水出英賢。","埋葬招財官品進，家中諸事樂滔然；婚姻吉利生貴子，早播名聲著祖鞭。"],"plain":"집 짓기·문과 물길 내기·장례·혼인 모두 좋게 봅니다.","readings":{"build":{"verdict":"길","evidence":"壁星造作進莊園"},"gate":{"verdict":"길","evidence":"開門放水出英賢"},"funeral":{"verdict":"길","evidence":"埋葬招財官品進"},"wedding":{"verdict":"길","evidence":"婚姻吉利生貴子"}}},
    "kui": {"head":"奎木狼 馬武 凶","headVerdict":"흉","original":["奎星造作得禎祥，家下榮和大吉昌；若是埋葬陰卒死，當年定主兩三喪。","看看軍令刑傷到，重重官事上瘟癀；開門放水招災禍，三年兩次損兒郎。"],"plain":"집 짓기는 좋게 보지만, 장례와 문·물길 내기는 피하라고 노래합니다(제목에는 흉으로 표시).","readings":{"build":{"verdict":"길","evidence":"奎星造作得禎祥"},"funeral":{"verdict":"흉","evidence":"若是埋葬陰卒死"},"gate":{"verdict":"흉","evidence":"開門放水招災禍"}}},
    "lou": {"head":"婁金狗 劉隆 吉","headVerdict":"길","original":["婁星豎柱起門庭，財旺家和事事興；外境錢財百日進，一家兄弟播聲名。","婚姻進益生貴子，玉帛金銀箱滿盈；放水開門皆吉利，男榮女貴壽康寧。"],"plain":"기둥 세우기·혼인·문과 물길 내기를 좋게 봅니다.","readings":{"build":{"verdict":"길","evidence":"婁星豎柱起門庭"},"wedding":{"verdict":"길","evidence":"婚姻進益生貴子"},"gate":{"verdict":"길","evidence":"放水開門皆吉利"}}},
    "wei_stomach": {"head":"胃土雉 烏成 吉","headVerdict":"길","original":["胃星造作事如何，富貴榮華喜氣多。埋葬進臨官祿位，三災九禍不逢他。","婚姻遇此家富貴，夫婦齊眉永保和；從此門庭生吉慶，兒孫代代拜金坡。"],"plain":"집 짓기·장례·혼인을 좋게 봅니다.","readings":{"build":{"verdict":"길","evidence":"胃星造作事如何，富貴榮華喜氣多"},"funeral":{"verdict":"길","evidence":"埋葬進臨官祿位"},"wedding":{"verdict":"길","evidence":"婚姻遇此家富貴"}}},
    "mao": {"head":"昴日雞 王良 凶","headVerdict":"흉","original":["昴星造作進田牛，埋葬官災不得休；重喪二日三人死，賣盡田園不得留。","開門放水招災禍，三歲孩兒白了頭；婚姻不可逢此日，死別生離實可愁。"],"plain":"집 짓기는 좋게 말하지만, 장례·문과 물길 내기·혼인은 피하라고 노래합니다(제목에는 흉).","readings":{"build":{"verdict":"길","evidence":"昴星造作進田牛"},"funeral":{"verdict":"흉","evidence":"埋葬官災不得休"},"gate":{"verdict":"흉","evidence":"開門放水招災禍"},"wedding":{"verdict":"흉","evidence":"婚姻不可逢此日"}}},
    "bi_net": {"head":"畢月烏 陳俊 吉","headVerdict":"길","original":["畢星造作主無光，買得田園有粟錢；埋葬此日添官職，田蠶大熟來豐年。","開門放水多吉慶，闔家人口得安然；婚姻若能逢此日，生得孩兒福壽全。"],"plain":"장례·문과 물길 내기·혼인을 좋게 봅니다. 집 짓기 구절은 좋고 나쁨이 섞여 있습니다.","readings":{"funeral":{"verdict":"길","evidence":"埋葬此日添官職"},"gate":{"verdict":"길","evidence":"開門放水多吉慶"},"wedding":{"verdict":"길","evidence":"婚姻若能逢此日，生得孩兒福壽全"}}},
    "zi": {"head":"觜火猴 傅俊 凶","headVerdict":"흉","original":["觜星造作有徒刑，三年必定主伶仃；埋葬卒死多由此，取定寅年便殺人。","三喪不止皆由此，一人藥毒二人身；家門田地皆退敗，倉庫金銀化作塵。"],"plain":"집 짓기와 장례를 피하라고 노래합니다.","readings":{"build":{"verdict":"흉","evidence":"觜星造作有徒刑"},"funeral":{"verdict":"흉","evidence":"埋葬卒死多由此"}}},
    "shen": {"head":"參水猿 杜茂 吉","headVerdict":"길","original":["參星造作旺人家，文星照耀大光華；只因造作田財旺，埋葬招疾喪黃沙。","開門放水加官職，房房子孫見田加；婚姻許定遭刑克，男女朝開暮落花。"],"plain":"집 짓기·문과 물길 내기는 좋게, 장례와 혼인 약속은 좋지 않게 봅니다.","readings":{"build":{"verdict":"길","evidence":"參星造作旺人家"},"funeral":{"verdict":"흉","evidence":"埋葬招疾喪黃沙"},"gate":{"verdict":"길","evidence":"開門放水加官職"},"wedding":{"verdict":"흉","evidence":"婚姻許定遭刑克"}}},
    "jing": {"head":"井木犴 姚期 吉","headVerdict":"길","original":["井星造作旺蠶田，金榜題名第一先；埋葬須防驚卒死，忽癲瘋疾入黃泉。","開門放水招財帛，牛馬豬羊旺莫言；寡婦田塘來入宅，兒孫興旺有餘錢。"],"plain":"집 짓기·문과 물길 내기는 좋게, 장례는 조심하라고 노래합니다.","readings":{"build":{"verdict":"길","evidence":"井星造作旺蠶田"},"funeral":{"verdict":"흉","evidence":"埋葬須防驚卒死"},"gate":{"verdict":"길","evidence":"開門放水招財帛"}}},
    "gui": {"head":"鬼井羊 王霸 凶","headVerdict":"흉","original":["鬼星起造卒人亡，堂前不見主人郎。埋葬此日官祿至，兒孫代代近君王。","開門放水須傷死，嫁娶夫妻不久長；修土築牆傷產女，手扶雙女淚汪汪。"],"plain":"집 짓기·문과 물길 내기·혼인은 피하고, 장례는 좋게 봅니다.","readings":{"build":{"verdict":"흉","evidence":"鬼星起造卒人亡"},"funeral":{"verdict":"길","evidence":"埋葬此日官祿至"},"gate":{"verdict":"흉","evidence":"開門放水須傷死"},"wedding":{"verdict":"흉","evidence":"嫁娶夫妻不久長"}}},
    "liu": {"head":"柳土獐 任光 凶","headVerdict":"흉","original":["柳星造作主遭官，晝夜偷閒不暫安；埋葬瘟癀多疾病，田園退盡守孤寒。","開門放水招聾瞎，腰陀背曲似弓彎；更有棒刑宜謹慎，婦人隨客走盤桓。"],"plain":"집 짓기·장례·문과 물길 내기를 피하라고 노래합니다.","readings":{"build":{"verdict":"흉","evidence":"柳星造作主遭官"},"funeral":{"verdict":"흉","evidence":"埋葬瘟癀多疾病"},"gate":{"verdict":"흉","evidence":"開門放水招聾瞎"}}},
    "xing": {"head":"星日馬 李忠 凶","headVerdict":"흉","original":["星宿日好造新房，進職加官近帝王；不可埋葬並放水，凶星臨位女人亡。","生離死別無心戀，自要歸休別嫁郎；孔子九曲珠難度，放水開溝天命傷。"],"plain":"새 집 짓기는 좋게 보지만, 장례와 물길 내기는 하지 말라고 노래합니다.","readings":{"build":{"verdict":"길","evidence":"星宿日好造新房"},"funeral":{"verdict":"흉","evidence":"不可埋葬並放水"},"gate":{"verdict":"흉","evidence":"放水開溝天命傷"}}},
    "zhang": {"head":"張月鹿 萬修 吉","headVerdict":"길","original":["張星日好造龍軒，年年便見進莊園；埋葬不久升官職，代代為官進帝前。","開門放水招財帛，婚姻和合福綿綿；田蠶大利倉庫滿，百般利意自安然。"],"plain":"집 짓기·장례·문과 물길 내기·혼인 모두 좋게 봅니다.","readings":{"build":{"verdict":"길","evidence":"張星日好造龍軒"},"funeral":{"verdict":"길","evidence":"埋葬不久升官職"},"gate":{"verdict":"길","evidence":"開門放水招財帛"},"wedding":{"verdict":"길","evidence":"婚姻和合福綿綿"}}},
    "yi": {"head":"翼火蛇 邳仝 凶","headVerdict":"흉","original":["翼星不利架高堂，三年二載見瘟癀；埋葬若還逢此日，子孫必定走他鄉。","婚姻此日不宜利，歸家定是不相當；開門放水家須破，少女貪花戀外郎。"],"plain":"높은 집 짓기·장례·혼인·문과 물길 내기를 피하라고 노래합니다.","readings":{"build":{"verdict":"흉","evidence":"翼星不利架高堂"},"funeral":{"verdict":"흉","evidence":"埋葬若還逢此日，子孫必定走他鄉"},"wedding":{"verdict":"흉","evidence":"婚姻此日不宜利"},"gate":{"verdict":"흉","evidence":"開門放水家須破"}}},
    "zhen": {"head":"軫水蚓 劉直 吉","headVerdict":"길","original":["軫星臨水造龍宮，代代為官受敕封；富貴榮華增福壽，庫滿倉盈自昌隆。","埋葬文星來照助，宅合安寧不見凶；更有為官沽帝寵，婚姻龍子出龍宮。"],"plain":"집 짓기·장례·혼인 모두 좋게 봅니다.","readings":{"build":{"verdict":"길","evidence":"軫星臨水造龍宮"},"funeral":{"verdict":"길","evidence":"埋葬文星來照助"},"wedding":{"verdict":"길","evidence":"婚姻龍子出龍宮"}}}
      } } ];

  G.MantraMansionDayData = { VERSION: VERSION, ASSIGN_PROFILES: ASSIGN_PROFILES, FUDUAN_PROFILES: FUDUAN_PROFILES, EVENTS: EVENTS, OMEN_PROFILES: OMEN_PROFILES };
  if (typeof module !== 'undefined' && module.exports) module.exports = G.MantraMansionDayData;
})(typeof window !== 'undefined' ? window : globalThis);
