# Postmortem — Phrase 검색창이 잘려 보임

- **날짜**: 2026-08-21
- **영향**: Phrase Bank에서 검색을 열면 검색 pill이 얇게 잘리거나 오른쪽이 잘려, 검색어를 읽고 치기 어려웠음. TestFlight 1.0.0 (10) 스크린샷 피드백.

## 증상
verbatim: "phrase 검색 시 검색창이 잘려서 나옴"

키보드가 올라온 상태에서 History 아래 검색 pill이 한 줄 높이보다 낮게 보이거나, 오른쪽 라운드/닫기 버튼이 잘렸다. 아래 Empty 카드("Nothing here")는 그대로 보였다.

## 가설
- H1: 키보드 inset이 검색 필드를 가림
- H2: iOS `TextInput`이 row 안에서 intrinsic width를 안 줄여 오른쪽이 overflow로 잘림
- H3: `borderRadius: 9999` pill + `minHeight`만 있는 컨테이너가 높이를 못 지켜 글자/아이콘이 세로로 잘림
- H4: Summary/차트 + 키보드가 같은 화면에 남아 검색 줄이 찌그러짐

## 원인
H2 + H3 + H4, plus a second capture at 3:47: a full-page scroll screenshot of the same Phrase search. iOS `automaticallyAdjustKeyboardInsets` scrolled the focused `TextInput` (inside the page `ScrollView`) up under the Dynamic Island, then left a long empty `#F2F2F7` trail — the reporter’s “밑에까지 스크롤링됨”.

## 수정
- 검색 중에는 차트와 Summary를 접고, 검색창을 페이지 `ScrollView` **밖**에 고정한다. 포커스가 상태바 밑으로 끌려가지 않는다.
- 검색 pill을 `height: 44`로 고정. `TextInput`에 `minWidth: 0`, `paddingVertical: 0`.
- placeholder는 `Search`.

## 회귀 확인
- `cd apps/mobile && npm run typecheck` PASS
- 실기기: Phrases → 검색 아이콘 → 키보드 올라온 뒤 검색창이 44px pill로 전부 보이는지
