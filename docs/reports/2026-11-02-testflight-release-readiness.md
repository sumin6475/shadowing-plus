# TestFlight 배포 준비 상태 — 2026-11-02

## 후보 범위

브랜치 `codex/self-talk-used-today`의 한 묶음: 하루 표현 선정과 Self-talk 사용 표시, Ask How to say 결과의 2차 표현 추출 및 최종 편집 저장, Ask 대화 기록과 사이드바, 표현 추출·임베딩·발음 생성 비용 기록. [비용 추정 보고서](2026-11-02-ai-cost-and-chat-history.md)는 별도 보관한다.

## 현재 판정

**코드 검증 통과, TestFlight 배포 전 서버 적용·실기능 검증 필요.** 원격 Supabase에는 마이그레이션 034까지 적용되어 있고 035는 미적용이다. 따라서 현재 시뮬레이터에서 실제 Ask 기록 저장·재열기를 성공으로 확인할 수 없다. 화면 밀도 확인용 10건은 임시 모의 데이터였고 앱 코드에서는 제거했다.

| 검사 | 결과 |
| --- | --- |
| `npm run test:mvp` | PASS, 62/62 |
| `npm run validate` | PASS: 릴리스 설정, TypeScript, 린트 기준, iOS export (2,234 modules) |
| `git diff --check` | PASS |
| 린트 경고 | 기존 `src/screens/phrases.tsx:1025` 1개, 오류 0개 |
| Ask 히스토리 DB/RLS | 미검증: 035 미적용, 2계정 테스트 환경 없음 |
| Edge Function 실제 동작 | 미검증: 새 `phrase-capture`, `phrase-embed`, `phrase-tts` 코드 미배포 |
| TestFlight 빌드 | 이번 후보 미생성. 최신 확인 빌드는 `1.0.1 (45)` |

## DB 적용 주의

일반 `supabase db push --linked --dry-run`은 저장소의 001–030 과거 파일 중 원격 이력에 없는 항목 때문에 `LegacyDbPushMissingRemoteError`로 중단된다. `--include-all`은 과거 SQL을 재적용하려 하므로 사용하면 안 된다. 035를 적용할 때는 원격에 이미 적용된 버전 `020, 024, 031, 032, 033, 034`의 빈 마커와 **실제** `035_ask_conversation_history.sql`만 포함한 일회성 임시 Supabase 작업 디렉터리를 사용한다. 원격과 연결된 프로젝트 메타데이터를 가리키고 먼저 `supabase db push --linked --dry-run --workdir <임시 디렉터리>`을 재실행한다. 이번 확인에서는 적용 대상으로 `035_ask_conversation_history.sql` 하나만 나왔다. 실제 적용 직전 원격 이력을 다시 확인해야 한다.

035는 새 테이블과 RLS를 만들고 기존 Note 대화 턴을 이관한다. 예전 앱이 쓰는 `note_chat_turns`의 새 항목도 복제한다. 삭제한 대화의 오래된 Note 대화 사본은 함께 제거하지만 Note 자체는 보존한다. DB 롤백 시 035 테이블을 곧바로 삭제하면 새 대화 기록을 잃으므로, 앱을 이전 TestFlight 빌드로 되돌리더라도 테이블은 유지하는 것이 안전하다.

## 실제 배포 순서와 확인 항목

1. 변경 사항을 리뷰하고 릴리스 후보 커밋을 확정한다. 로컬 임시 의존성·환경 symlink는 커밋에 넣지 않는다.
2. 035만 대상으로 하는 DB dry-run을 다시 확인한 뒤 적용한다. `npm run verify:rls`는 별도 테스트 계정 2개의 `RLS_TEST_A_EMAIL/PASSWORD`, `RLS_TEST_B_EMAIL/PASSWORD`가 준비되면 실행한다. Ask 대화·턴의 타 계정 읽기/수정/삭제/소유자 위조 삽입 차단을 확인한다.
3. Edge Functions `phrase-capture`, `phrase-embed`, `phrase-tts`를 배포한다. 각 함수에서 인증 없는 요청은 JSON 401, 인증된 요청은 기존 결과를 반환하고 `usage_events`가 토큰 실측값 또는 발음 추정값으로 늘어나는지 확인한다.
4. DB 적용 후 시뮬레이터에서 실제 계정으로 Ask 질문 → 앱 재시작 후 대화 재열기 → 새 대화 → 삭제, How to say 저장 → 핵심 표현과 예시 문장이 채워진 최종 편집 화면 → 최종 저장을 확인한다. Self-talk에서 같은 날 사용한 표현 표시와 새 날짜 전환도 확인한다.
5. iOS `testflight` 프로필로 새 EAS 빌드를 만들고 TestFlight에 제출한다. EAS의 원격 버전 관리와 자동 증가 설정상 버전 `1.0.1`의 다음 빌드 번호가 예상되지만 빌드 생성 시 번호를 확인한다. 실제 TestFlight 설치본에서 4번을 다시 확인한다.

원격 DB·Edge Function 적용과 TestFlight 제출은 아직 실행하지 않았다. 서버 적용 전 앱을 제출하면 Ask 기록 호출이 실패한다.

## 서버 반영 업데이트 — 2026-11-02

위 표와 순서는 배포 전 시점의 기록이다. 사용자 승인 후 **035 마이그레이션과 세 Edge Function을 적용했다.** 시뮬레이터에서 기존 Note 대화 이관, 새 Ask 대화의 저장·재열기, How to say 표현의 2차 추출과 최종 Phrase 저장을 확인했다. 집계 조회에서 새 Ask 대화 1건·턴 2건, 예시 context를 가진 Phrase 1건, 네 종류의 AI 사용 기록을 확인했다. RLS 읽기 시험은 다른 사용자 0건·소유자 3건/14턴이었다. 두 계정의 쓰기 격리 검사는 전용 테스트 계정이 없어 남아 있다. 자세한 명령과 롤백은 `.agents/deploys/2026-11-02-ask-history-phrase-metering-server.md`에 기록했다.

**남은 배포 단계:** 새 iOS TestFlight 빌드 생성, 제출 후 설치, 실제 빌드에서 Ask 및 Self-talk 동작 확인. 서버 반영만으로 TestFlight 사용자에게 새 UI가 전달되지는 않는다.

## iOS 후보 빌드 업데이트 — 2026-11-02

EAS `testflight` 프로필의 **1.0.1 (46)** 빌드가 성공했다. [빌드 페이지](https://expo.dev/accounts/suminkiim/projects/shadowing-plus-mobile/builds/ce1c718e-366a-4f9b-b6a1-3cb6e9641b35)에서 `FINISHED`, `STORE`, 소스 커밋 `f38e465`를 확인했다. **App Store Connect에는 아직 제출하지 않았다.** 다음 명령은 `npx eas-cli submit --platform ios --profile testflight --id ce1c718e-366a-4f9b-b6a1-3cb6e9641b35 --non-interactive --wait`이며, 제출 뒤 Apple 처리와 실제 TestFlight 설치본 검증이 필요하다.

시뮬레이터에서 Self-talk 표현을 수동 체크하고 세션을 버린 뒤 다시 시작하자, 해당 표현은 사용하지 않은 카드 뒤로 이동하고 `Used earlier today`로 표시됐다. 시뮬레이터 음성 인식기는 초기화되지 않아 자동 발화 판정과 날짜 전환은 실제 기기에서 확인해야 한다.
