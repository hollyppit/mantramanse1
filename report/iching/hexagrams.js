/* 주역 8괘·64괘 구조 데이터. 문장(괘사·효사·해석)은 여기에 두지 않는다 — 구조(번호·이름·상하괘·효 음양)만 담고, 문장은 검수 상태를 가진 별도 데이터로 둔다.
   효 배열은 항상 아래(초효)→위(상효) 순서, 양=1 음=0. 괘 번호는 문왕괘서(通行本) 순서. 사주 엔진과 무관한 순수 데이터다. */
(function(root){'use strict';
// 8괘: id, 한글, 한자, 상징, 효(아래→위)
var TRIGRAMS=[
 {id:'geon',ko:'건',hanja:'乾',image:'하늘',lines:[1,1,1]},
 {id:'tae',ko:'태',hanja:'兌',image:'연못',lines:[1,1,0]},
 {id:'li',ko:'리',hanja:'離',image:'불',lines:[1,0,1]},
 {id:'jin',ko:'진',hanja:'震',image:'우레',lines:[1,0,0]},
 {id:'son',ko:'손',hanja:'巽',image:'바람',lines:[0,1,1]},
 {id:'gam',ko:'감',hanja:'坎',image:'물',lines:[0,1,0]},
 {id:'gan',ko:'간',hanja:'艮',image:'산',lines:[0,0,1]},
 {id:'gon',ko:'곤',hanja:'坤',image:'땅',lines:[0,0,0]}
];
// 문왕괘서 순서: 한글, 한자, 상괘 id, 하괘 id
var ORDER=[
 ['건','乾','geon','geon'],['곤','坤','gon','gon'],['준','屯','gam','jin'],['몽','蒙','gan','gam'],['수','需','gam','geon'],['송','訟','geon','gam'],['사','師','gon','gam'],['비','比','gam','gon'],
 ['소축','小畜','son','geon'],['리','履','geon','tae'],['태','泰','gon','geon'],['비','否','geon','gon'],['동인','同人','geon','li'],['대유','大有','li','geon'],['겸','謙','gon','gan'],['예','豫','jin','gon'],
 ['수','隨','tae','jin'],['고','蠱','gan','son'],['임','臨','gon','tae'],['관','觀','son','gon'],['서합','噬嗑','li','jin'],['비','賁','gan','li'],['박','剝','gan','gon'],['복','復','gon','jin'],
 ['무망','无妄','geon','jin'],['대축','大畜','gan','geon'],['이','頤','gan','jin'],['대과','大過','tae','son'],['감','坎','gam','gam'],['리','離','li','li'],['함','咸','tae','gan'],['항','恒','jin','son'],
 ['돈','遯','geon','gan'],['대장','大壯','jin','geon'],['진','晉','li','gon'],['명이','明夷','gon','li'],['가인','家人','son','li'],['규','睽','li','tae'],['건','蹇','gam','gan'],['해','解','jin','gam'],
 ['손','損','gan','tae'],['익','益','son','jin'],['쾌','夬','tae','geon'],['구','姤','geon','son'],['췌','萃','tae','gon'],['승','升','gon','son'],['곤','困','tae','gam'],['정','井','gam','son'],
 ['혁','革','tae','li'],['정','鼎','li','son'],['진','震','jin','jin'],['간','艮','gan','gan'],['점','漸','son','gan'],['귀매','歸妹','jin','tae'],['풍','豐','jin','li'],['려','旅','li','gan'],
 ['손','巽','son','son'],['태','兌','tae','tae'],['환','渙','son','gam'],['절','節','gam','tae'],['중부','中孚','son','tae'],['소과','小過','jin','gan'],['기제','旣濟','gam','li'],['미제','未濟','li','gam']
];
var T={};TRIGRAMS.forEach(function(t){T[t.id]=t;});
var HEXAGRAMS=ORDER.map(function(r,i){
 var up=T[r[2]],low=T[r[3]],lines=low.lines.concat(up.lines);
 return {num:i+1,ko:r[0],hanja:r[1],upper:r[2],lower:r[3],lines:lines,pattern:lines.join('')}; // pattern: 초효→상효
});
var BY_PATTERN={};HEXAGRAMS.forEach(function(h){BY_PATTERN[h.pattern]=h;});
var api={TRIGRAMS:TRIGRAMS,HEXAGRAMS:HEXAGRAMS,trigram:function(id){return T[id]||null;},byNum:function(n){return HEXAGRAMS[n-1]||null;},byLines:function(lines){return BY_PATTERN[lines.join('')]||null;}};
root.IchingHexagrams=api;
if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
