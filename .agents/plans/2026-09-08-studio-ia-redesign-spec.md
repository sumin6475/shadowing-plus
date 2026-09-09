# Studio 정보구조 리디자인 스펙

작성 2026-09-08 · 대상 `apps/mobile/src/screens/studio-information.tsx`, `studio.tsx`, `world.tsx`, `shell.tsx`
근거 PRD `Studio 정보 구조 개편` · 현행 구현 커밋 전 상태(untracked)

---

## 0. 전제: 지금은 "같은 데이터 위에 UI가 두 벌"이다

`lib/studio-information.ts` 헤더가 밝히듯 물리 테이블은 그대로입니다.

```
domains = Topics · stories = Situations · messages = Speaking Notes · talk_sessions = Practice Attempts
```

그래서 새 화면(`StudioTopicScreen` / `StudioSituationScreen` / `SpeakingNoteScreen`)과
옛 화면(`DomainScreen` / `StoryScreen` / `MessageScreen`)은 **같은 행을 서로 다른 이름으로 보여주는 두 벌의 UI**입니다.
데이터 마이그레이션 문제가 아니라 화면 정리 문제이므로, 리디자인의 첫 작업은 **한 벌만 남기는 것**입니다.

---

## 1. 라우트 복구 (먼저, 다른 모든 것보다)

탭 라우팅이 `topics`/`sessions` → `StudioHomeScreen`으로 바뀌면서 `SpeakingWorldScreen`(world.tsx:460)이
shell에서 import조차 되지 않는 고아가 됐고, 그 화면이 유일한 진입점이던 뷰들이 같이 끊겼습니다.

| 뷰 | 현재 진입점 | 처리 |
|---|---|---|
| `studio` 데이터 대시보드 (`studio.tsx`) | **0** | Studio 홈 하단 "정리" 블록에서 복구 |
| `sessionsList` 세션 목록 | **0** | 같은 블록에서 `All attempts`로 복구 |
| `studioTopic` 새 Topic 화면 | **0** | `topicsList`의 목적지로 연결 |
| `topicsList` | 1 (Situation 0개일 때만 보이는 빈 상태 카드) | 상시 노출로 승격 |
| `domain` / `story` / `message` 옛 3화면 | `topicsList`에서 유입 | 새 화면으로 대체 후 제거 |
| `SpeakingWorldScreen` | 0 (import 안 됨) | 삭제 |

**결정 1.** `topicsList`의 카드 탭은 `domain`이 아니라 `studioTopic`으로 간다.
**결정 2.** 옛 `DomainScreen` / `StoryScreen` / `MessageScreen`은 아래 기능 공백이 메워진 뒤 삭제한다.
새 화면에 없는 것: **노트/상황 삭제, 상황 이동(move), 아카이브.** 지금 새 Studio 화면 어디에도 `confirmDelete`가 없다.

---

## 2. Studio 홈

### 문제

- `Continue practicing`의 현재 노트가 `notes.find(active||unsorted)` = `updated_at` 최신뿐(:594). 연습 이력을 안 본다.
  방금 만든 빈 Quick Note가 계속 최상단을 차지한다.
- `StudioNoteRow`의 원형 아이콘이 `index % 3`으로 의미 없이 순환(:68). 78pt를 쓰면서 phrase 수, attempt 수는 안 보여준다.
  그 정보를 가진 `NoteRow`는 홈에서 쓰지 않는다.
- Situation이 3분할 82pt 타일이라 노트 수, 날짜 같은 판단 근거가 없다.
- Topics로 가는 상시 경로가 없다.

### 새 구조: 3개 존

```
[헤더]  YOUR STUDIO · Avatar
        Ready to speak?

[존 A · 연습]   Continue practicing
                └ 큰 카드 1장 (Topic · Situation / 제목 / 목표 / phrase·attempt / Start practice)

[존 B · 기록]   Recent notes                    See all
                └ 밀도 높은 2줄 행 × 3~8

[존 C · 정리]   Your situations                 All
                └ 세로 행 × 3 (제목 / 노트·attempt 수 / 날짜)
                Browse
                └ Topics · All attempts · Speaking stats

[FAB] Quick note
```

**존 A 선택 규칙(변경).** 다음 순서로 고른다.
1. 최근 7일 안에 attempt가 있는 노트 중 가장 최근 것
2. 없으면 phrase가 1개 이상 연결된 가장 최근 수정 노트
3. 없으면 가장 최근 수정 노트
4. 노트가 없으면 지금의 빈 상태 카드 유지

**존 B 행 규격.** 장식 아이콘 제거, 높이 78 → 64pt.
1행 제목(16/700, 1줄). 2행 `Situation · phrase n · attempt n`(13/ink2). Unsorted는 제목 앞에 4pt 점 하나.
정보가 없는 원형 아이콘을 빼는 만큼 한 화면에 들어오는 노트가 3개에서 5개로 늘어난다.

**존 C.** 3분할 타일을 세로 행으로 바꾼다. 행 안에 노트 수, attempt 수, `event_date`가 있으면 날짜.
그 아래 `Browse` 블록이 1절의 끊긴 라우트 3개를 전부 되살린다. PRD의 "Topics와 Situations는 정리·탐색 경로로 하단에 배치한다"와 맞는 자리다.

---

## 3. Situation 상세

### 문제

Speaking Notes / Useful Phrases / Recent Attempts가 **셋 다 같은 `Sect` + 같은 `Card`로 동일 무게**(:747-752).
PRD가 정한 1 : 2 : 3 위계가 화면에 없다. 게다가 상단에 `Hero`(현재 노트) + `Pill full "New speaking note"` + `Sect`가
쌓여서 정작 Notes 리스트는 첫 화면 밖으로 밀린다.

### 새 구조

```
< 뒤로                                    ···

Work & Study                          (Topic, 12.5/accD)
실험 결과 참가자 디브리핑                 (Serif 31)
설명문 2줄                              (15/ink2)
                                       9월 12일 · 노트 4 · 시도 7

Speaking notes                    + New
┌─────────────────────────────────┐
│ 연구 내용을 디브리핑하기      ▶  │   ← 현재 노트는 행 안에서 Practice 버튼으로
│ 목표 한 줄 · phrase 3 · 시도 2   │
├─────────────────────────────────┤
│ ...                              │
└─────────────────────────────────┘

Useful phrases  6                          See all
 phrase                       status
 ─────────────────────────────────
 walk through the results     Ready
 it turned out that…          Practicing
 (5개까지, 나머지는 See all)

Recent attempts                            All
 9월 6일   42초
 9월 4일   1분 10초
 (카드 없음, 구분선만, ink3)
```

**Hero 제거.** 현재 노트를 별도 큰 카드로 띄우지 않고, Notes 리스트 첫 행 안의 `▶` 버튼으로 흡수한다.
같은 노트가 화면에 두 번 나오는 지금 구조가 위계를 흐린다.

**Useful phrases를 실제 2열로.** 헤더에 개수, 좌 phrase / 우 status chip, 5개 + `See all`.
지금은 상태가 그냥 우측 텍스트 한 줄이라 PRD가 말한 "데이터베이스형"이 아니다.

**Recent attempts는 카드 밖으로.** `Card` 크롬을 벗기고 구분선만 남긴 저강도 리스트, 3개까지.

---

## 4. Speaking Note 상세

### 문제

- `SPEAKING GOAL` 캡스 라벨이 붙은 폼 구조. PRD의 "Apple Notes에 가까운 열린 편집 영역"과 반대.
- 저장이 BackBar 우측의 수동 `Save` chip. **뒤로 가면 입력이 유실된다.**
- `Start practice`가 하단 고정이 아니라 스크롤 맨 끝(:862).
- Chip 4개 중 `Link phrase`와 `How can I say this?`가 **같은 `PhrasePicker`를 연다**(:855).

### 새 구조

```
< 뒤로              Work & Study / 실험 디브리핑 ›        Saved ✓

연구 내용을 디브리핑하기                (Serif 31, 인라인 편집)
연구 목적과 결과를 명확하게 설명하기      (17/600/ink2, 라벨 없음, 인라인 편집)
─────────────────────────────────────
자유롭게 쓴 본문…                       (16/25, 열린 편집 영역, 라벨 없음)



[+ 생각 추가]  [🎙 아이디어 녹음]  [🔗 표현 연결]     ← 4개 → 3개

Linked phrases 3                                + Link
 ...
Previous attempts
 ...

┌─── sticky ───────────────────────┐
│   🎙  Start practice              │
└───────────────────────────────────┘
```

**자동 저장.** 800ms 디바운스 + 화면 이탈 시 flush. 헤더 우측은 `Saved ✓` / `Saving…` 표시만 남기고 수동 버튼 제거.
**목표 라벨 제거.** 캡스 라벨 대신 자리와 무게로 구분한다. 비어 있을 때만 placeholder로 "무엇을 전달하고 싶나요?".
**Chip 4 → 3.** `How can I say this?`는 `Link phrase` 시트 안의 검색 필드가 이미 하는 일이므로 흡수한다.
**Start practice 하단 고정.**

---

## 5. Quick Note 시트

### 문제

- **`goal`이 UI에 없다.** 본문 첫 문장을 `title`과 `goal` 양쪽에 똑같이 넣는다(:375-376).
  PRD 필수 3필드 중 하나가 사실상 사라졌고, 두 필드에 같은 문자열이 들어간다.
- 제목 자동 채움이 저장 시점에만 돌아서, 입력 중에는 "Title부터 채워야 하는 폼"으로 보인다.
- Topic이 필수인데 Situation 행 안에 숨어 있다.
- Title, 본문, Situation, Phrases, CTA 2개, 헬퍼 카피까지 쌓여서 스크롤이 생긴다. Apple Notes 감각이 아니다.

### 새 구조

```
─────  QUICK CAPTURE                        ✕

무엇을 말하고 싶나요?
┌───────────────────────────────────┐
│ (자동 포커스, 여기부터 시작)        │
│                                   │
│                    🎙 말로 대신    │
└───────────────────────────────────┘

제목  연구 결과를 디브리핑하기            ← 본문에서 실시간 파생, 탭하면 편집
                                            (입력 전에는 이 줄 자체가 안 보임)

Topic   [Work & Study] [Experiences] [Daily Life] …   ← 칩 가로 스크롤, 상시 노출

나중에 정리하기  ›                        ← Situation + Phrases를 한 줄로 접음

┌───────────────────────────────────┐
│   🎙  저장하고 연습                 │
└───────────────────────────────────┘
              나중에 저장
```

**본문이 첫 필드.** 열리면 본문에 자동 포커스. 제목 줄은 본문에 글자가 생긴 뒤에야 나타나고 실시간으로 파생된다.
**Topic 칩을 표면으로.** 필수 필드는 접힌 행 안에 있으면 안 된다.
**Situation + Linked Phrases는 "나중에 정리하기" 한 줄로.** PRD가 둘 다 선택 사항이라고 못박았다.
**CTA 하나 + 텍스트 링크 하나.** 동등한 `Pill` 두 개는 선택을 강요한다.

---

## 6. Attempt 루프 (연습 후 복귀)

`startNotePractice` → Talk → 종료 시 `nav.go(p0.from ?? "today")`(talk.tsx:364).
`nav.go`는 **탭 전환 + 디테일 스택 초기화**라서, 연습을 마치면 Speaking Note가 아니라 Studio 홈으로 튕긴다.
PRD의 `말하기 → 한 가지 수정 제안 → 다시 말하기` 루프가 여기서 끊긴다.

**변경.** `TalkCtx`에 `returnTo?: { name: ViewName; props?: Record<string, unknown> }`를 추가하고,
`messageId`가 있으면 종료 시 탭 초기화 대신 해당 Speaking Note로 되돌린다.
돌아온 노트의 `Previous attempts` 최상단에 방금 시도가 펼쳐진 상태로 붙고, 그 자리에서 두 번째 시도를 시작할 수 있다.

Phrase 사용 확인 UI(`bankUsedVerdicts`, talk.tsx:127)는 이미 있으므로 새로 만들지 않는다. 위치만 루프 안으로 들어온다.

---

## 7. 삭제와 아카이브 (지금 아예 없음)

새 Studio 화면 어디에도 노트/상황을 지우거나 보관하는 수단이 없다. 옛 `StoryScreen`에는 있었다.
옛 화면을 걷어내기 전에 최소한 이만큼은 채워야 한다.

- Speaking Note 행 `SwipeRow` → Archive / Delete (`confirmDelete` 재사용)
- Situation 상세 헤더 `···` → 이름 변경 / Topic 이동 / 아카이브
- 아카이브된 항목은 기본 목록에서 빠지고 Topic 화면 하단 `Archived`에서 볼 수 있다

---

## 8. 작업 순서

| # | 단계 | 내용 | 선행 |
|---|---|---|---|
| 1 | 라우트 복구 | Browse 블록 신설, `topicsList` → `studioTopic` 연결, `SpeakingWorldScreen` 삭제 | 없음 |
| 2 | Studio 홈 | 3개 존, Continue 선택 규칙, 행 규격 | 1 |
| 3 | Attempt 복귀 | `returnTo` 추가, talk.tsx 종료 경로 | 없음 (병렬 가능) |
| 4 | Situation 상세 | Hero 제거, 위계 1:2:3, phrases 2열 | 2 |
| 5 | Speaking Note | 자동 저장, 열린 편집, sticky CTA, chip 3개 | 3 |
| 6 | Quick Note | 본문 우선, Topic 표면화, goal 결정 반영 | 5 |
| 7 | 삭제/아카이브 | SwipeRow, `···` 메뉴 | 4, 5 |
| 8 | 옛 화면 제거 | `DomainScreen`/`StoryScreen`/`MessageScreen` 삭제 | 7 |

---

## 9. 열린 질문

- [ ] **`goal`을 어떻게 할 것인가.** Quick Note에서 (a) 세 번째 실제 필드로 살릴지, (b) 캡처 단계에서는 빼고
      Note 상세에서만 채우게 할지. 지금처럼 title과 같은 문자열을 넣는 것만 아니면 된다. **(b) 추천.**
- [ ] 데이터 대시보드(`studio.tsx`)를 Browse 블록의 한 줄로 둘지, Studio 홈 상단에 작은 진행 스트립으로 요약하고
      탭하면 펼치게 할지.
- [ ] 화면 용어를 `Topics`로 유지할지 `Areas`로 바꿀지 (PRD 열린 질문 그대로).
- [ ] 아카이브를 이번 범위에 넣을지, 삭제만 먼저 넣을지.
