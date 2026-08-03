# Mobile Product Concept: Speaking World

> Status: Current product direction  
> Recorded: 2026-08-02

이 구조는 모바일 제품의 초기 컨셉과 정보 구조로 채택한다. 먼저 이 방향으로
제품을 만들고, 실제 사용자 피드백을 통해 Domain과 Story 구성을 발전시킨다.
초기 구조가 완벽한 분류 체계여야 하는 것은 아니지만, **Speaking World를
넓히는 도구**라는 정체성은 유지한다.

## One-line definition

**이 제품은 영어 학습 앱이 아니라, 내 삶을 영어로 표현할 수 있게 만드는 도구다.**

사용자는 주어진 영어를 연습하는 것이 아니라, 자신이 실제로 말하고 싶은
삶의 영역과 이야기를 영어로 구축한다. 앱이 관리해야 할 핵심 대상은 단어,
문장, 토픽의 목록이 아니라 사용자의 **Speaking World**다.

## Core mental model

```text
My life
  ↓
Speaking World
  ↓
Domain — 삶의 영역
  ↓
Story — 내가 말하고 싶은 나의 이야기
  ↓
Message — 그 이야기를 누구에게, 어떤 목적과 길이로 전할지
  ↓
Session — 실제로 말한 기록
```

기존 학습 앱의 구조가 `Lesson → Exercise`라면, 이 제품의 구조는
`My life → Story → Talk`다.

## Information hierarchy

### 1. Speaking World

사용자가 영어로 표현할 수 있게 된 자기 삶의 전체 지도다. 앱의 진행감은
정해진 커리큘럼을 완료하는 데서 오는 것이 아니라 이 세계가 넓어지고,
깊어지고, 다시 사용 가능해지는 데서 온다.

### 2. Domain

삶의 큰 영역을 구분하는 내부 정보 구조다.

예시:

- Work
- About me
- Experiences
- Ideas
- Daily life

`Domain`은 데이터 모델과 AI 추천 로직에서 사용하는 내부 용어로 유지한다.
사용자에게는 “Domain”이라는 추상적 레이블을 가르치지 않고 `Work`,
`About me` 같은 자연스러운 이름만 보여준다.

#### Initial Speaking World

다음 트리는 제품을 시작할 때 사용하는 초기 Domain과 Story 구성이다.
각 하위 항목은 사용자가 자신의 삶을 영어로 표현하기 위해 만들어갈 Story다.

```text
Speaking World

├── About me
│   ├── Background
│   ├── Strengths
│   └── Future goals
│
├── Work / Study
│   ├── My startup
│   ├── Current project
│   ├── Interview
│   └── My research
│
├── Experiences
│   ├── Moving abroad
│   ├── Biggest challenge
│   └── Trip to Japan
│
├── Daily life
│   ├── Morning routine
│   ├── Gym
│   └── Weekend
│
└── Ideas
    ├── AI
    ├── Education
    └── Design
```

이 트리는 모든 사용자에게 동일한 콘텐츠를 순서대로 제공하는 커리큘럼이
아니다. 사용자가 자신의 Speaking World를 만들기 시작할 수 있도록 보여주는
출발점이자, AI가 아직 비어 있는 영역과 이어질 만한 Story를 발견할 때 사용할
수 있는 기본 지도다. 사용자는 필요 없는 Story를 건너뛰고, 이름을 바꾸고,
자기만의 Story를 추가할 수 있어야 한다.

### 3. Story

사용자가 실제로 말하고 싶은 자기 이야기다. `Topic`보다 인간적이며,
셀프토킹이라는 제품 행동과 맞닿아 있다.

예시:

- My startup
- My current project
- My previous company
- How I moved to the US
- My biggest challenge
- My biggest mistake

사용자는 토픽을 공부하는 것이 아니라 자신의 Story를 만들고 다듬는다.

### 4. Message

같은 Story를 특정 청자, 상황, 목적, 길이에 맞게 전달하는 버전이다.

`My startup`이라는 Story에는 다음 Message가 생길 수 있다.

- 30초 버전
- 2분 버전
- VC에게 피칭하기
- 친구에게 설명하기

Story가 **무엇을 말할지**라면, Message는 **어떻게 전할지**다.

### 5. Session

사용자가 실제로 말한 한 번의 기록이다. Session은 추상적인 학습 진도가
아니라 Story와 Message를 현실에서 표현해 본 흔적이다.

## Language belongs to the Story

Phrase Bank는 `take the plunge` 같은 고립된 표현의 창고가 아니다. 표현은
사용자가 말하던 맥락에서 포착되며, 우선적으로 Story에 속한다.

```text
Story: My startup

Useful language
- What I'm trying to do is...
- One thing I realized is...
- The hardest part was...
```

새로운 Talk를 시작할 때 앱은 현재 Story를 이해하고, 그 Story에서 사용자가
저장했거나 자주 사용한 표현만 필요할 때 가볍게 다시 보여줄 수 있다.

핵심은 표현을 미리 가르치는 것이 아니라 다음 흐름을 만드는 것이다.

```text
말한다 → 필요한 표현을 포착한다 → 내 Story에 저장한다 → 다시 말할 때 사용한다
```

## AI's role

AI는 커리큘럼을 만들거나 숙제를 할당하지 않는다. 사용자의 Speaking World를
관찰하고 다음을 돕는다.

- 아직 비어 있는 삶의 영역을 발견한다.
- 이미 말한 내용과 자연스럽게 이어지는 새 Story를 제안한다.
- 현재 Story에 필요한 과거 표현을 다시 보여준다.
- 같은 Story를 다른 청자, 목적, 길이로 말할 Message를 제안한다.

예시:

```text
Your speaking world is growing.

You've built a lot around work.
Want to add a story about “Moving abroad”?
```

또는:

```text
You've talked about
✓ My startup
✓ Interview
✓ Moving abroad

Maybe you'd like to add
“My biggest mistake”
```

AI 추천의 목적은 다음 학습 과제를 정하는 것이 아니라, 사용자가 자기
Speaking World의 빈 공간을 발견하고 원하는 방향으로 확장하도록 돕는 것이다.

## Product principles

### 1. You build your own Speaking World.

누가 주어준 것이 아니라, 내가 말하면서 내가 필요한 표현을 저장하고,
저장한 것 안에서 계속 사용할 수 있어야 한다. 무엇이 중요한지는 앱이 아니라
사용자가 정한다.

### 2. English starts from your life, not a curriculum.

모든 Story는 사용자가 실제로 말하고 싶은 것에서 시작한다.

### 3. Phrases are captured, not taught.

표현은 말하기 전에 암기할 대상으로 주어지는 것이 아니라, 말하는 과정에서
필요에 의해 포착된다.

### 4. The tool supports thinking, not testing.

이 제품은 사용자의 표현과 생각을 돕는다. 점수, 스트릭, 임의의 레슨보다
자신을 더 잘 표현하게 된 변화를 진행으로 본다.

### 5. AI expands your world instead of assigning homework.

AI는 빈 공간을 발견하고, 새 Story를 제안하고, 필요한 순간에 유용한 표현을
되살린다.

## Product decision filter

새 기능이나 화면을 설계할 때 다음 질문으로 방향을 확인한다.

1. 이것은 사용자가 자기 삶에서 말하고 싶은 Story를 만드는 데 도움이 되는가?
2. 사용자가 말하는 과정에서 필요한 표현을 포착하고 다시 쓰게 하는가?
3. Speaking World가 넓어지거나 깊어졌다는 감각을 주는가?
4. AI가 사용자의 선택을 대신하지 않고 빈 공간과 가능성을 보여주는가?
5. 학습 앱의 레슨·시험·과제 문법을 무심코 다시 만들고 있지는 않은가?

## Naming guidance

| Concept | Internal model | User-facing language |
| --- | --- | --- |
| 전체 세계 | `SpeakingWorld` | Speaking World / my world |
| 삶의 영역 | `Domain` | Work, About me, Experiences 등 실제 이름 |
| 말하고 싶은 이야기 | `Story` | Story 또는 이야기 제목 |
| 전달 버전 | `Message` | 30 sec, For a friend, VC pitch 등 실제 목적 |
| 말한 기록 | `Session` | Talk / session의 자연스러운 표현 |
| 포착한 표현 | `Phrase` | Useful language / saved expressions |

내부 모델 이름은 구현의 일관성을 위한 것이며, 사용자에게 계층 구조 자체를
학습시키기 위한 것이 아니다. 사용자는 복잡한 모델을 의식하지 않고 자연스럽게
“내 Speaking World를 넓혀간다”는 경험을 해야 한다.
