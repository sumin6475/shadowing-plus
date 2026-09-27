# 2026-09-01 · 외부 TestFlight 후보 build 21

범위: `feat/mobile-skeleton` worktree의 build 19 이후 미빌드 변경 전체와 릴리스 게이트 수선.

## 릴리스 구성

- Expo SDK: 57.0.0 (`expo` 57.0.8)
- EAS CLI: 23.2.0 (`npx eas-cli@latest`)
- 프로필: `production`
- 배포: `STORE` (TestFlight/App Store용)
- 번들 ID: `com.shadowingplus.mobile`
- App Store Connect 앱 ID: `6799375053`
- 앱 버전/빌드: `1.0.0 (21)`

## 검증

| 단계 | 결과 | 비고 |
|---|---|---|
| release config | PASS | transport와 iOS icon 구성 확인 |
| TypeScript | PASS | `tsc --noEmit` |
| ESLint | PASS | error 0, 기존 허용 기준 warning 15 |
| iOS export | PASS | 2,107 modules, Hermes bundle 5.9 MB |
| EAS Build | PASS | `8bc8be3f-761d-4afa-bb1a-998af8d9fe4f` |
| EAS Submit | PASS | `b71fd2ca-0a50-4d4e-a869-1ffe9ec935bb` |
| Apple processing | PASS | `VALID` |
| Expo dependency alignment | WARN | SDK 57 권장 패치 업데이트 24개; 이번 후보에는 미적용 |

릴리스 게이트 수선: React Compiler ref/immutability 오류 제거, video seek API 사용, ref 갱신을 effect로 이동, gesture 완료 성공값 사용, 통계 기준시각을 로드 시점에 고정, 불필요 상태 제거, 초기 데이터 로드를 취소 가능한 timer callback으로 지연.

## TestFlight 상태

- 내부 상태: `IN_BETA_TESTING`
- 외부 상태: `READY_FOR_BETA_SUBMISSION`
- 외부 테스터 사용 가능한 Store 빌드임을 확인.
- 아직 외부 그룹의 Beta App Review에는 제출하지 않음. App Store Connect에서 build 21을 외부 그룹에 추가하고 테스트 정보와 함께 제출해야 함.
- `npx expo install --check`가 Expo/RN 패치 업데이트를 권고했지만, 네이티브 의존성 변경과 추가 EAS 빌드를 분리하기 위해 build 21 이후 작업으로 남김.

- EAS build: https://expo.dev/accounts/suminkiim/projects/shadowing-plus-mobile/builds/8bc8be3f-761d-4afa-bb1a-998af8d9fe4f
- TestFlight: https://appstoreconnect.apple.com/apps/6799375053/testflight/ios
