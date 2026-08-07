# Quality snapshot — self-talk speaker routing

- **스텝**: 로컬 self-talk 녹음 재생의 iOS 출력 라우팅
- **대상**: `feat/mobile-skeleton`, Expo 57.0.8 / expo-audio 57.0.3 / expo-speech-recognition 56.0.1
- **환경**: iOS 번들 + 연결된 실제 iPhone(dev client)

## 결과

| gate | result | evidence |
|---|---|---|
| TypeScript | PASS | `./node_modules/.bin/tsc --noEmit` (exit 0) |
| Changed-file ESLint | PASS with 5 pre-existing warnings | `eslint src/lib/talk-audio-session.ts src/screens/world.tsx` (0 errors) |
| Full ESLint | BASELINE FAIL | 기존 `src/screens/library.tsx:274` React immutability 1건; 이번 변경 파일 신규 error 0 |
| iOS production bundle | PASS | `expo export --platform ios` (1,818 modules, exit 0) |
| Dev-client launch | PASS | `com.shadowingplus.mobile` connected-device launch 성공 |
| Built-in speaker listening | PASS | 사용자 실기기 확인: "응 잘 된다" |
| Next-session STT regression | PASS | 동일 실기기 확인 후 기능 종료 승인 |

## 읽은 것

정적·번들 경로와 물리 iPhone의 스피커 재생이 모두 정상이다. 공유 오디오 세션의 카테고리를 유지하고 모드·기본 출력만 재생 직전에 바꾸는 경로로 확정한다.
