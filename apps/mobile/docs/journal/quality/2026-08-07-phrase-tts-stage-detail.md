# Quality snapshot — phrase TTS + learning-stage detail

- **스텝**: Phrase Bank의 표현 발음과 상세 학습 단계 UI
- **대상**: `feat/mobile-skeleton`, Expo 57.0.8 / expo-speech 57.0.1 / expo-audio 57.0.3
- **환경**: iPhone 17 Pro simulator + 연결된 iPhone 16 Pro Max(dev client)

## 결과

| gate | result | evidence |
|---|---|---|
| TypeScript | PASS | `npx tsc --noEmit` (exit 0) |
| ESLint | PASS | `npm run lint -- --quiet` (exit 0) |
| Full ESLint | PASS with baseline warnings | `npm run lint` (0 errors, 기존 warning 13) |
| Expo module pin | PASS | SDK 57 bundled `expo-speech ~57.0.1`; installed `57.0.1` |
| CocoaPods link | PASS | `ExpoSpeech (57.0.1)` 설치 |
| iOS simulator build/launch | PASS | `expo run:ios`; build 0 errors, app bundle 로드 |
| Physical iPhone build/install/launch | PASS | signed Debug build 0 errors; `devicectl` install + launch 성공 |
| Physical TTS audibility | PENDING USER TAP | 무음 모드 포함 실제 출력은 Phrase 상세 스피커 탭으로 확인 필요 |
| Expo dependency check | BASELINE DRIFT | 기존 SDK 패치 버전 차이로 `expo install --check` exit 1; 이번 `expo-speech`는 기대 버전 일치 |

## 읽은 것

표현 자체는 기기 TTS가 읽고, 원본 영상 구간은 `Hear in context`로 분리됐다. TTS는 앱 오디오 세션의 `playsInSilentMode` 정책을 사용하며 Practice 진입 전 정지한다. 정적·네이티브 빌드·설치 경로는 통과했고 최종 음성 출력만 실제 사용자의 한 번 탭 확인이 남았다.
