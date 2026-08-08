# Mobile App Store v1

## Problem Statement

Shadowing Plus의 모바일 앱은 사용자가 자기 삶의 Story를 영어로 말하고, 필요한
표현을 포착해 다시 사용할 수 있는 방향을 보여 주고 있지만, 공개 App Store
제출에 필요한 첫인상, 개인화, 공유, 개인정보 관리가 아직 완결되지 않았다.
남은 기능을 한꺼번에 추가하면 이미 동작하는 인증, API 연결, Speaking World와
Self-talk 흐름이 회귀하거나, 실제 빌드와 스토어 설명이 달라질 위험이 있다.

## Key Hypothesis

We believe 남은 출시 기능을 작은 단계로 나누고 각 단계마다 기존 핵심 여정을
회귀 검증하면, 현재 앱의 동작을 보존하면서도 App Store 심사가 가능한 일관된
v1 경험을 만들 수 있다.

We'll know we're right when 모든 정의된 핵심 여정이 release candidate에서
통과하고, 개인정보 및 심사 차단 이슈 없이 내부·외부 TestFlight 사용자가
온보딩부터 Self-talk와 선택적 공유까지 완료할 수 있다.

## Users

**Primary user**: 자신의 일, 경험, 일상과 아이디어를 영어로 표현해야 하는
비원어민 학습자. 이미 영어 표현을 접하고 저장해 왔지만 실제로 자기 이야기를
말할 때 필요한 표현을 꺼내는 데 어려움을 겪는다.

**Job to Be Done**: When 내가 중요한 이야기를 영어로 말하고 싶을 때, I want to
내 Story를 정리하고 필요한 표현을 말하는 과정에서 포착해 다시 사용하고 싶다,
so I can 남이 만든 답을 외우지 않고 내 삶을 내 영어로 설명할 수 있다.

**Non-users**: 정해진 커리큘럼, 점수, 시험 또는 공개 소셜 피드를 원하는 사용자;
공개 제3자 콘텐츠의 대량 수집·다운로드를 기대하는 사용자.

## Solution

현재 모바일 앱 위에 최소 Profile과 Settings, Mirror frame 개인화, Self-talk
공유, Splash와 Onboarding을 순차적으로 완성한다. 각 단계는 독립적으로 구현하고
타입체크, iOS 번들, 기존 핵심 여정과 새 기능 여정을 검증한 뒤에만 다음 단계로
넘어간다. 공개 제출 메타데이터와 스크린샷은 구현된 release candidate를 기준으로
마지막에 작성한다.

## Mission & Principles

**Mission**: 사용자가 자기 삶을 자기 영어로 표현할 수 있게 돕는다.

1. **Existing behavior is a release contract.** 새 기능 때문에 이미 동작하는
   인증, API 연결, Story, Phrase 또는 Self-talk 흐름이 깨져서는 안 된다.
2. **Private by default.** 카메라, 음성, transcript와 공유 결과는 사용자가
   명시적으로 선택한 범위에서만 처리한다.
3. **One phase, one verifiable outcome.** 여러 기능을 한 번에 묶지 않고 기능별로
   구현·검증한다.
4. **English starts from the user's life.** Profile, Mirror와 Onboarding도
   Speaking World를 보조해야 하며 별도 소셜 제품으로 확장하지 않는다.
5. **Store claims follow shipped behavior.** 앱 설명과 스크린샷에는 실제 release
   candidate에서 사용할 수 있는 기능만 포함한다.

## MVP Scope

| Priority | Capability | Rationale |
|---|---|---|
| Must | 현재 동작의 회귀 기준선과 기능별 검증 게이트 | 사용자가 요구한 최우선 출시 조건이다. |
| Must | 최소 Profile과 Settings 분리 | 개인화와 법적·계정 관리를 혼합하지 않고 심사 필수 경로를 제공한다. |
| Must | Mirror frame 프리셋 선택과 지속성 | Self-talk의 차별화된 개인화 경험을 제공한다. |
| Must | Self-talk 공유 미리보기와 iOS Share Sheet | 앱 브랜딩을 제공하되 공개 피드와 모더레이션 범위를 피한다. |
| Must | Splash와 짧은 Onboarding | 앱의 가치를 설명하고 권한 요청 전 맥락을 제공한다. |
| Must | Privacy Policy, Support, 로그아웃, 데이터·계정 삭제 진입점 | App Store 심사와 사용자 통제에 필요한 기본 요소다. |
| Must | 카메라·마이크의 just-in-time 권한과 녹음 상태 표시 | 민감한 입력에 대한 명시적 동의와 투명성을 제공한다. |
| Must | 내부 TestFlight release candidate 검증 | 실제 기기에서 제출 빌드를 검증한다. |
| Should | 3~5명의 외부 TestFlight 검증 | 첫 사용자 환경과 심사 접근성을 확인한다. |
| Should | 영어 중심 스토어 메타데이터와 실제 화면 기반 스크린샷 | 첫 공개 제출 자료를 완성한다. |
| Won't | 공개 Library 탭 | 초기 비용과 콘텐츠·저작권 범위를 줄이기 위해 공개 v1에서 제외한다. |
| Won't | 앱 내부 공개 피드, 팔로우, 좋아요 또는 댓글 | UGC 모더레이션과 개인정보 범위를 확대한다. |
| Won't | 구독 또는 유료 디지털 기능 | 제품·법적 검증 전 수익화 범위를 추가하지 않는다. |
| Won't | Deep Learning 전체 플로우 재설계 | 별도 연구가 필요한 후속 범위다. |
| Won't | 홈과 전체 디자인 시스템의 전면 재작업 | 출시 이후 실제 피드백과 함께 다듬는다. |

## Feature Requirements

### Regression Baseline

- 구현 전 현재 release 후보의 핵심 사용자 여정을 기록한다.
- 각 단계에서 동일한 여정을 재실행한다.
- 타입체크와 iOS production-equivalent 번들 검증을 통과하지 못하면 다음 단계로
  넘어가지 않는다.
- 검증 중 발견한 기존 실패와 새 회귀를 구분해 기록한다.
- 기존 사용자 데이터나 설정을 파괴하는 마이그레이션은 별도 승인 없이 수행하지
  않는다.

### Profile

- Profile은 사용자가 보는 개인화 정보만 담당한다.
- 최소 필드는 TBD - 구현 계획 전 현재 데이터 모델과 UI를 확인해야 한다.
- 공개 프로필, 검색 노출, 팔로워 개념은 포함하지 않는다.
- Mirror 선택 상태를 확인하거나 변경 화면으로 이동할 수 있다.

### Settings

- 앱·권한 설정, Privacy Policy, Terms 또는 필요한 법적 문서, Support를 제공한다.
- 로그아웃과 데이터·계정 삭제 시작 경로를 제공한다.
- 삭제 범위와 완료 방식은 개인정보 데이터 맵 확정 후 구현한다.
- 앱 버전과 빌드 정보를 확인할 수 있다.

### Mirror Frame Customization

- `Clean`, `Warm`, `Focus`, `Soft` 수준의 소수 프리셋을 제공한다.
- 얼굴 보정이나 뷰티 필터를 제공하지 않는다.
- 선택한 프리셋과 phrase card 표시 여부를 유지한다.
- 로컬 저장과 계정 동기화 중 어느 수준까지 v1에 포함할지는 구현 계획에서
  현재 구조를 조사해 결정한다.

### Self-talk Sharing

- 공유 전에 결과 미리보기를 보여 준다.
- 카메라, 오디오, phrase 또는 텍스트 포함 여부를 사용자가 명시적으로 선택한다.
- 시스템 Share Sheet와 이미지 저장을 사용하며 앱 내부 공개 게시 기능은 없다.
- 공유 카드에는 최소한의 앱 브랜딩과 Story/Message 맥락을 제공한다.
- 사용자가 공유를 완료하거나 취소해도 원본 Self-talk 데이터가 변하지 않는다.

### Splash and Onboarding

- Splash는 세션 복원과 초기화가 끝날 때까지만 표시하며 불필요한 지연을 만들지
  않는다.
- Onboarding은 `내 Story 선택 → 말하기 → 필요한 표현 포착`의 핵심을 짧게
  설명한다.
- 카메라·마이크 OS 권한은 첫 진입에서 한꺼번에 요구하지 않고 실제 기능을
  시작하기 직전에 설명 후 요청한다.
- 사용자는 권한을 거절하거나 Onboarding을 건너뛰어도 가능한 범위에서 앱을
  탐색할 수 있다.

## Core Architecture & Patterns

- Expo SDK 57, React Native, Expo Router의 `src/app/` 라우팅을 유지한다.
- Supabase 세션은 AsyncStorage에 보존하고, 서버 비밀이 필요한 작업은 배포된 웹
  API에 Bearer token으로 요청한다.
- 모바일은 `web/` 코드를 직접 import하지 않는다.
- 사용자 소유 데이터는 Supabase RLS를 통해 직접 읽고 쓰며, 서버 권한이 필요한
  모바일 작업은 Supabase Edge Functions 경계를 사용한다.
- `src/lib/api.ts`의 Vercel 직접 호출은 기존 jobs 호환 경로로만 남아 있으며,
  공개 v1에서 Library를 제외할 때 함께 재검토한다.
- 색상과 UI geometry는 Cobalt Editorial token과 iOS motif 규칙을 따른다.
- 새 기능은 기존 구조를 대규모 재작성하지 않고 단계별로 추가한다.

## Security & Privacy

- 모바일 번들에는 `EXPO_PUBLIC_*` 값과 Supabase anon key만 포함한다.
- OpenAI, R2, Supabase service role 또는 기타 서버 비밀을 포함하지 않는다.
- 카메라 영상, 음성 원본, transcript, AI 입력·출력, Profile 데이터에 대한
  데이터 맵을 작성하고 보관·삭제 정책을 확정한다.
- Privacy Policy, 앱 내부 설명과 App Store Connect App Privacy 답변은 동일한
  실제 데이터 흐름을 반영한다.
- 녹음 중에는 명확한 시각적 또는 청각적 표시를 제공한다.

## User Stories

- As a returning user, I want the app to open into my existing state, so that a
  new onboarding flow does not erase or block my work.
- As a learner, I want a small private Profile, so that the speaking space feels
  like mine without creating a public identity.
- As a learner, I want to choose a calm Mirror frame, so that I can feel at ease
  while speaking.
- As a learner, I want to preview exactly what will be shared, so that my face,
  voice, or text is never included unexpectedly.
- As a learner, I want permissions requested when they become relevant, so that
  I understand why the app needs them.
- As a user leaving the product, I want to initiate account deletion in the app,
  so that I can control my personal data.

## Success Metrics

| Metric | Target | How measured |
|---|---|---|
| Regression safety | 100% of the approved baseline journeys pass after every phase | Repeated release checklist on the same build configuration |
| Release quality | 0 open P0/P1 defects before external TestFlight | Validation report and issue log |
| Privacy readiness | 0 unresolved camera, microphone, sharing, retention or deletion blockers | Data-map and App Privacy review |
| Core journey completion | All internal testers can complete onboarding → Story/Self-talk → optional share | TestFlight session checklist |
| Store truthfulness | Every screenshot feature is available in the selected build | Screenshot-to-build audit |
| Submission outcome | App version reaches App Review with complete metadata and reviewer access | App Store Connect status |

## Risks & Mitigations

| Risk | Mitigation |
|---|---|
| 새 네비게이션이 기존 인증과 딥링크를 깨뜨림 | 탭·라우트 변경 전 기준선을 기록하고 단계마다 인증/복원 여정을 검증한다. |
| Profile과 Settings 데이터 모델이 과도하게 커짐 | 공개 프로필을 제외하고 v1 필드를 최소화한다. |
| Mirror와 공유가 민감한 미디어를 예상 밖으로 노출 | 미리보기와 명시적 포함 선택을 요구하고 private-by-default를 적용한다. |
| Onboarding이 기존 사용자를 다시 막음 | 완료 상태를 보존하고 기존 사용자 마이그레이션·skip 경로를 검증한다. |
| 스토어 자료가 구현보다 앞서감 | 최종 release candidate 이후 실제 캡처로 교체한다. |
| 기존 문서의 Language Island와 최신 Speaking World 용어가 충돌 | 모바일 UI와 출시 문서에서는 최신 Speaking World 모델을 기준으로 한다. |

## Open Questions

- [ ] 공개 v1의 최종 앱 이름과 seller-facing 브랜드는 `Shadowing+`, `Saylo` 또는
      다른 이름 중 무엇인가?
- [ ] Profile v1에서 실제로 저장할 필드는 무엇인가?
- [ ] Mirror 선택을 로컬에만 저장할지 계정 간 동기화할지?
- [ ] Self-talk 원본 음성·영상과 transcript는 각각 어디에 얼마나 오래 보관하는가?
- [ ] 공유의 기본 포함 상태는 무엇이며 카메라·오디오를 기본적으로 끌 것인가?
- [ ] 모바일에서 신규 계정 생성을 제공할지 기존 계정 로그인만 제공할지?
- [ ] 첫 제출에서 지원할 UI 언어와 App Store localization은 무엇인가?
- [ ] 계정 삭제가 즉시 완료되는지, 서버 작업을 시작하고 완료 알림을 제공하는지?

## Implementation Phases

| # | Phase | Delivers | Status | Depends |
|---|---|---|---|---|
| 0 | Release contract | 본 PRD 승인과 v1 범위 동결 | done | - |
| 1 | Regression baseline | 실기기 development build, 핵심 여정 목록, 검증 명령 | in progress | Phase 0 |
| 2 | Profile and Settings | 최소 개인화, 법적·계정 관리 화면 | pending | Phase 1 |
| 3 | Mirror customization | 프리셋 선택, 지속성, Self-talk 반영 | pending | Phase 2 |
| 4 | Self-talk sharing | 미리보기, privacy controls, Share Sheet | pending | Phase 3 |
| 5 | First-run experience | Splash와 Onboarding, 권한 primer | pending | Phase 4 |
| 6 | Privacy and release hardening | 데이터 맵, 삭제, 실패 처리, 전체 회귀 검증 | pending | Phase 5 |
| 7 | TestFlight and store package | 내부·외부 TestFlight, 실제 스크린샷과 제출 메타데이터 | pending | Phase 6 |

## Future Considerations

- 출시 후 실제 사용자 피드백에 기반한 홈과 세부 디자인 개선
- Deep Learning 플로우 연구와 재설계
- 계정 간 Mirror preset 동기화가 v1에서 제외될 경우 후속 제공
- 추가 Speaking World Domain과 Story 추천
- 구독과 유료 기능은 별도 법적·제품 검토 후 결정

---
*Status: APPROVED — 2026-08-08*
