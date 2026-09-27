# Quality snapshot — mobile regression baseline (automatic portion)

- **스텝**: App Store v1 Phase 1 회귀 기준선
- **대상**: `feat/mobile-skeleton@a12a6b365e94b320dba49ee5b0b03680b8d68633`
- **환경**: macOS, Node v24.14.0, npm 11.9.0, Expo CLI 57.0.10,
  EAS CLI 21.7.0, Supabase CLI 2.111.0
- **상태**: 자동 검증과 추적 가능한 EAS development build 완료; 설치와
  실기기 전체 매트릭스 대기

## 결과

| gate | result | evidence |
|---|---|---|
| Correct worktree | PASS | 앱 후보는 `/Users/jadekim/Documents/shadowing-plus-mobile`; 별도 main worktree의 기존 변경 8개는 건드리지 않음 |
| Remote durability | PASS | `feat/mobile-skeleton`의 기존 29개 로컬 커밋을 origin에 push; 이후 divergence `0/0` |
| Fresh install | PASS with advisory | `npm ci` exit 0; 871 packages 설치. npm audit는 기존 25건(중간 8, 높음 17)을 보고했으며 자동 수정하지 않음 |
| TypeScript | PASS | `npm run typecheck` exit 0 |
| Baseline ESLint | PASS with warnings | 오류 0, 기존 경고 15; `--max-warnings 15`로 16번째부터 실패 |
| iOS production export | PASS | `tmp/export-ios`, 1,851 modules, 브랜드 폰트 4개 |
| Resolved Expo config | PASS | `npx expo config --type public` exit 0 |
| Diff whitespace | PASS | `git diff --check` exit 0 |
| Expo Doctor | EXPECTED ADVISORY | 19/20; SDK patch mismatch 15개만 재현. 기존 ABI crash 방지 exact pin을 자동 수정하지 않음 |
| Dependency lock | PASS | `package-lock.json` 및 모든 dependency version 변경 없음 |
| Local public env names | PASS | 필요한 3개 이름 모두 non-empty; 값은 출력하거나 기록하지 않음 |
| EAS account/project | PASS | 현재 계정과 app.json의 프로젝트 연결 확인; 식별자는 이 기록에서 생략 |
| EAS development env | PASS for presence | 최초 확인에서는 비어 있어 중단했고, 사용자 등록 후 필요한 3개 이름이 모두 보이는 것을 재확인. 값은 출력하지 않음 |
| Supabase Edge Functions | PASS for deployment inventory | 실제 프로젝트가 `talk-diagnose`, `talk-stuck`, `phrase-capture`, `media-url`, `phrase-tts`를 모두 나열 |
| Supabase schema 020–022 | PARTIAL PASS | live REST schema에 필요한 테이블/컬럼 존재. CLI migration history는 비어 있어 수동 적용으로 보이며, RLS/trigger 동작은 Tier 3에서 재검증 필요 |
| RLS isolation harness | READY / NOT RUN | 두 세션으로 Phrase·Story·Talk Session의 cross-account read/update/delete/owner-spoofed insert를 검사하는 privacy-safe 스크립트 추가; Node syntax·ESLint PASS, 실제 14개 검사는 테스트 계정 입력 후 실행 |
| EAS development build | PASS | Saylo branding build `b7b8fafb-42a0-4bec-9f02-28ccdb753d4c`, profile `development`, iOS app `1.0.0 (1)`, status `FINISHED`; runtime commit은 `a12a6b365e94b320dba49ee5b0b03680b8d68633`와 일치 |
| Physical-device matrix | NOT RUN | 하나의 추적 가능한 EAS build가 생긴 뒤 Tier 1–3 실행 필요 |

## 기준선 지문

- ESLint: error 0, warning 15.
- Expo export: iOS 1,851 modules.
- Expo Doctor: 19/20, package patch mismatch 15.
- Runtime source commit: `a12a6b365e94b320dba49ee5b0b03680b8d68633`.
- EAS build: `b7b8fafb-42a0-4bec-9f02-28ccdb753d4c`, iOS `1.0.0 (1)`,
  development profile, `FINISHED`.

## 차단 조건과 다음 행동

같은 build ID로
`docs/release/mobile-regression-baseline.md`의 Tier 1–3을 실행하기 전에는 PRD
Phase 1을 완료로 표시하거나 앱이 App Store 준비 완료라고 주장하지 않는다.

`npm audit fix`, `expo install --fix`, dependency upgrade, runtime repair는 이번
기준선 범위에 포함하지 않았다.
