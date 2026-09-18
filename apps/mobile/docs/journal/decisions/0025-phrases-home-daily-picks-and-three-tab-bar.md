# ADR 0025 — Phrases 홈: 오늘의 픽 규칙, Talk 탭 편입, Figma 폰트 번들

- **날짜**: 2026-09-18
- **스텝**: MVP 시뮬레이터 폴리시 — Phrases 홈 Figma 적용
- **상태**: accepted (Sumin 결정, 2026-09-18)

## 맥락 (Context)
Figma의 Phrases 홈 프레임과 PM 메뉴구조 노트가 들어왔다. 세 가지는 코드가 아니라 제품 결정이 필요했다: 히어로 두 번째 카드의 "0/5"가 무엇을 세는지, 검색·스테이지 필터가 사라진 자리, 그리고 Figma 폰트(Pretendard / Instrument Serif)가 앱에 없다는 점. Figma는 Talk를 바 안의 세 번째 탭으로 그렸는데, 앱은 iOS 26 search-role 원형 탭이었다.

## 검토한 선택지 (Options)
- **0/5**: ① 매일 5개 픽(오래된 미완료부터), 오늘 체크한 스텝이 있으면 완료 ② 오늘 저장한 표현 수(목표 5) ③ 레이아웃만, 숫자 고정
- **검색/필터**: ① 필터 아이콘 뒤 시트 ② 카드 아래 유지 ③ MVP에서 제거
- **폰트**: ① 기존 Newsreader/Inter로 매핑 ② Pretendard + Instrument Serif 번들
- **Talk**: ① 분리 원형 유지 ② 바 안의 세 번째 탭

## 결정 (Decision)
오늘의 픽 = 기존 설정 `phrasesPerDay`(기본 5)만큼 오래된 미완료 표현, 오늘 연습한 것은 Ready가 돼도 남김 · 검색/필터는 필터 아이콘 시트 · 폰트 번들 · Talk는 바 안의 세 번째 탭.

## 기각 이유 (판단의 증거)
- 저장 수(②)는 "연습"이 아니라 "수집"을 세서, Phrases 홈의 연습 루프(3단계 체크리스트)와 안 맞는다. 고정 숫자(③)는 곧 거짓말이 된다.
- 픽을 AsyncStorage에 저장하는 대신 순수 함수로 재계산: "오늘 연습한 것은 남긴다" 규칙 하나로 하루 안에서 목록이 안정적이고, 테스트 가능하다(`tests/mvp-model`).
- 카드 아래 검색 유지는 Figma와 어긋나고, PM 노트가 필터(검색·연습량)를 헤더에 뒀다.
- 폰트 매핑(①)은 Figma와 눈에 띄게 달랐다(특히 히어로의 Instrument Serif). Sumin이 파일을 직접 제공.
- Talk 분리 원형은 PM 노트의 "하단 네비게이션: Phrases / Studio / Talk → 언제든 쉽게 접근"과 Figma 모두와 달랐다.

## 결과 (Consequences)
- 폰트 ~6.5MB(Pretendard 4웨이트 OTF + Instrument Serif)가 번들에 추가. 일본어 글리프는 시스템 폰트로 폴백(PretendardJP는 안 씀).
- 나머지 화면(Profile, 노트 편집기 등)은 아직 Newsreader/Inter — 화면 간 타이포가 섞인 상태.
- 즐겨찾기 필터는 PM이 미정(제거 쪽으로 기울어짐)이라 넣지 않았다.
- **재검토 조건**: 사용자가 "오늘의 픽"이 매일 같은 오래된 표현만 보여준다고 느끼면(오래된 Collected가 쌓여 새 표현이 픽에 안 들어옴) 선정 규칙을 바꾼다. Talk 탭을 바에 넣은 뒤 녹음 진입이 줄면 원형 복귀를 검토.
