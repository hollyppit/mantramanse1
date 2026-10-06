# 타로 카드 이미지 (/report/hub/tarot/)

이 폴더에 아래 파일명으로 `.webp` 를 넣고 배포하면 **코드 수정 없이** 자동으로 반영됩니다.
없는 카드는 기본 자리표시 카드(번호·이름)가 보이고, 깨진 이미지 아이콘은 나오지 않습니다.

- 권장: 세로로 긴 카드 (가로:세로 = 5:8.4 근처, 예 600×1008), webp, 한 장 150KB 이하. 화면에는 lazy loading 으로 필요할 때만 불러옵니다.
- 역방향 카드는 같은 파일을 180° 돌려서 보여 주므로 **정방향 이미지 한 장만** 올리면 됩니다.
- 파일명 규칙의 원본은 `/shared-core.js` 의 CARDS(file) 입니다. `node tests/hub-sim.js` 가 규칙을 검사합니다.

## 메이저 아르카나 (22장)
- `00-fool.webp` — 바보 (The Fool)
- `01-magician.webp` — 마법사 (The Magician)
- `02-high-priestess.webp` — 여사제 (The High Priestess)
- `03-empress.webp` — 여황제 (The Empress)
- `04-emperor.webp` — 황제 (The Emperor)
- `05-hierophant.webp` — 교황 (The Hierophant)
- `06-lovers.webp` — 연인 (The Lovers)
- `07-chariot.webp` — 전차 (The Chariot)
- `08-strength.webp` — 힘 (Strength)
- `09-hermit.webp` — 은둔자 (The Hermit)
- `10-wheel-of-fortune.webp` — 운명의 수레바퀴 (Wheel of Fortune)
- `11-justice.webp` — 정의 (Justice)
- `12-hanged-man.webp` — 매달린 사람 (The Hanged Man)
- `13-death.webp` — 죽음 (Death)
- `14-temperance.webp` — 절제 (Temperance)
- `15-devil.webp` — 악마 (The Devil)
- `16-tower.webp` — 탑 (The Tower)
- `17-star.webp` — 별 (The Star)
- `18-moon.webp` — 달 (The Moon)
- `19-sun.webp` — 태양 (The Sun)
- `20-judgement.webp` — 심판 (Judgement)
- `21-world.webp` — 세계 (The World)

## 마이너 아르카나 (56장) — 수트별 `수트-번호.webp`

번호: 01=에이스, 02~10=숫자, 11=페이지, 12=나이트, 13=퀸, 14=킹
- 완드 (wands): `wands-NN.webp`  (NN = 01~14)
- 컵 (cups): `cups-NN.webp`  (NN = 01~14)
- 소드 (swords): `swords-NN.webp`  (NN = 01~14)
- 펜타클 (pentacles): `pentacles-NN.webp`  (NN = 01~14)
