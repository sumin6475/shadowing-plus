# ADR 0019 — Topics를 노드 그래프 대신 Bento folio로, Message를 Version으로

- **날짜**: 2026-08-23
- **스텝**: Topics 아이덴티티 리디자인
- **상태**: accepted

## 맥락 (Context)
Topics 탭은  Speakers의 삶의 영역(Domain)과 Story를 모아 두는 화면이다. 처음 의도는 노드가 모여 ‘나만의 topics’처럼 보이게 하는 것이었지만, Story가 늘수록 연결선이 모바일에서 산만해지고, 새 토픽을 그래프에 끼워 넣기도 어려웠다. 폴더 트리는 주입식 학습 앱처럼 딱딱하다. 원하는 여정은: 못 말하는 주제를 빠르게 캡처 → 거친 초안 → Version으로 다듬기 → Self-talk → Useful phrases가 쌓이는 스튜디오/족보.

## 검토한 선택지 (Options)
1. **노드 그래프 유지 + 레이아웃만 손보기** — ‘세계’ 메타포는 남지만, 항목이 늘수록 선과 겹침이 커지고 추가 UX를 그래프 문법으로 풀어야 한다.
2. **Domain 폴더 + Story 리스트** — 구현은 쉽지만 커리큘럼 앱처럼 보이고, 빈 서랍을 채우는 수집감이 없다.
3. **Domain별 Bento 카드 덱 + 시트 생성 + 화면에서 Version** — Active(채워진 카드) / Draft(점선)로 수집감을 주고, 생성은 바텀 시트, 상세는 족보(Versions · phrases · sessions)다.

## 결정 (Decision)
옵션 3. Topics 메인은 스튜디오 컬렉션(Bento). 사용자 카피는 Message → Version. 테이블은 `messages`를 유지한다. 새 Story/Version은 전면 양식 대신 contextual / preset 바텀 시트.

## 기각 이유 (판단의 증거)
그래프는 카드가 늘수록 모바일에서 읽히지 않고, 빈 노드를 ‘채운다’는 피드백보다 시각 소음이 먼저 온다. 폴더는 삶의 영역을 담는 족보가 아니라 레슨 목록처럼 보인다. Bento는 크기/배치로 개성을 내고, Draft 점선이 빈 서랍을 채우고 싶게 만든다. Version은 30-sec / Interview처럼 상황별 변형을 이름 그대로 말한다.

## 결과 (Consequences)
- Topics 메인·Domain은 같은 Bento. Story 상세는 Versions + Useful phrases + Sessions 묶음. Version 화면은 아웃라인, CTA는 Self-talk.
- 라우트 이름(`message`, `newMessage`)과 DB는 그대로라 혼동이 남을 수 있다. 카피만 Version.
- **재검토 조건**: 카드가 한 Domain 안에서 수십 개가 되어 그리드가 다시 산만해지거나, Version이 Message보다 덜 이해되면 레이아웃/카피를 다시 본다.
