# Postmortem — 시뮬레이터 dev client 연결이 `openurl code 60`으로 wedge

- **날짜**: 2026-08-05
- **스텝**: Speak 세션 온디바이스 STT — 재빌드 후 런타임 검증
- **상태**: 미해결(환경) — 런타임 검증을 실기기로 이관. 빌드/정적 검증은 통과.

## 증상 (verbatim)
재빌드는 성공했는데 시뮬레이터에서 앱을 Metro에 연결할 수 없었다.
```
Error: xcrun simctl openurl E1172493-… exp+shadowing-plus-mobile://expo-development-client/?url=http%3A%2F%2F141.215.218.205%3A8081 exited with non-zero code: 60
Underlying error (domain=NSPOSIXErrorDomain, code=60): Operation timed out
```
이후 내 수동 `xcrun simctl openurl`(bundle-id 스킴, exp+ 스킴 둘 다), 나중엔 `xcrun simctl launch`와 `xcrun simctl io … screenshot`까지 전부 2분 hang/타임아웃. 시뮬레이터가 이 앱에 대해 응답 불가 상태로 wedge됨.

## 타임라인 / 가설
1. 재빌드(`expo run:ios`) 성공 → `expo-speech-recognition`(56.0.1) SDK 57에서 `Build Succeeded`.
2. 검증하려고 dev client를 Metro에 연결 시도. `expo run:ios`의 자동 연결(`simctl openurl exp+…://…?url=<LAN IP>:8081`)이 **code 60(timeout)**.
3. 내가 수동 `simctl openurl`(bundle-id 스킴)로 우회 시도 → iOS **"Open in Shadowing+?" SpringBoard 모달**이 뜸. simctl엔 탭 기능이 없어 못 지움.
4. 그 모달이 뜬 채로는 새 openurl이 code 60으로 거부됨(모달이 launchservices를 블록). 심 재부팅으로 모달은 지웠으나 openurl은 **재부팅 후에도** 계속 code 60.
5. 결국 `simctl launch`/`screenshot`까지 hang → CoreSimulator 세션 자체가 wedge.

**근본 원인(추정)**: 이 세션에서 반복한 수동 `openurl` + 탭 불가 모달 누적이 시뮬레이터의 LaunchServices/CoreSimulator를 degraded 상태로 만들었다. dev client 연결은 오직 `openurl`(expo·나 둘 다)로만 되는데 그게 죽어서 연결 경로가 사라짐. **코드/빌드 문제 아님** — 앞서 같은 심에서 Topics 검증은 정상 동작했다.

## 왜 시뮬레이터로는 어차피 부족했나
설사 연결됐어도 **온디바이스 STT는 시뮬레이터에서 실 전사를 못 만든다**: (a) 사람 마이크 입력이 없고, (b) `simctl privacy`는 `microphone`/`siri`만 부여 가능 — **`speech-recognition` 권한을 못 줘서** 권한 다이얼로그가 뜨는데 탭 불가, (c) on-device 인식 모델이 심에 없을 수 있음. 즉 **온디바이스 STT의 실 검증은 물리 iPhone(dev client)이 유일한 경로.**

## 지금까지 검증된 것(시뮬레이터 없이)
- `expo-speech-recognition` 56.0.1이 **SDK 57(expo-modules-core 57)에서 컴파일**됨 → `Build Succeeded` (2회).
- Info.plist에 `NSMicrophoneUsageDescription` + `NSSpeechRecognitionUsageDescription` 주입 확인, `ExpoSpeechRecognition` pod 통합 확인.
- `tsc --noEmit` 클린, `expo export --platform ios` **전체 번들 성공**(새 훅·`createTalkSession`·speech 모듈 import 포함).

## 다음(복구/검증)
- **복구**: `xcrun simctl shutdown <dev> && xcrun simctl erase <dev>` 후 `expo run:ios` 재시도(수동 openurl 금지). 또는 Xcode에서 직접 Run.
- **실 검증**: 물리 iPhone에 dev client 설치 → Speak 세션 → 권한 허용 → 말하면 실시간 자막 + done에 transcript + `talk_sessions` row 확인.

## 재발 방지
- 시뮬레이터 dev client 연결은 **`expo run:ios` 또는 `expo start` 후 `i`** 한 경로만 쓰고, **수동 `simctl openurl`을 반복하지 말 것**(탭 불가 모달 → wedge의 도화선). 연결이 한 번 실패하면 재시도 전에 **erase**로 깨끗이 초기화.
- 온디바이스 STT류 기능은 처음부터 **실기기 검증 대상**으로 계획.
