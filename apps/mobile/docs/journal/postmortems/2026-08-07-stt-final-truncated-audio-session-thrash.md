# Postmortem — 녹음 켠 뒤 STT가 첫 몇 단어만 저장 (+ 오디오세션 뺏기 삽질)

- **날짜**: 2026-08-07
- **스텝**: 음성 녹음 Phase 1 — persist 저장 + 재생 스피커 라우팅
- **심각도**: P1 (라이브 자막은 정상인데 완료 시 트랜스크립트가 앞부분만 저장 → 세션 기록 손상)

## 실패 현상 (두 갈래, 같은 디버깅 아크)

**증상 A — 재생이 수화기(earpiece)로만, 스피커 안 나오고 볼륨 낮음.**
사용자: "이어피스로 나와… 아직도 수화기에서만." 스피커 라우팅을 고치려 오디오세션을 여러 번 만짐.

**증상 B — 그 시도 후 STT 감도 급락 + 완료 시 첫 3단어만 저장.**
사용자: "말할때는 트랜스크립트 뜨는데 완료하면 처음 말한 3단어만 기록되어있어. 완전 회귀해버렸어." 라이브 자막(`speech.transcript`)엔 전체 문장이 보이는데, Finish 후 저장된 값은 앞부분만.

## 가설
- **H1**(A): expo-audio `setAudioModeAsync`로 `.playback` 카테고리 강제하면 스피커로 라우팅된다.
- **H2**(A): 인식기가 `playAndRecord`+`measurement` 세션을 active인 채 남겨 수화기로 고정 → 재생 화면에서 세션을 뒤집으면 해결.
- **H3**(B): `stop()`이 커밋된 final만 반환 → 마지막 interim이 버려진다.
- **H4**(B): `persist:true` + 16kHz recordingOptions가 인식기 finalize 타이밍을 바꿔 isFinal이 초반 1회만 뜬다.

## 검증 방법과 결과
- H1·H2 → **부분적으로 맞지만 대가가 큼**. iOS `AVAudioSession`은 **프로세스 전체가 하나를 공유**. 재생 화면(world.tsx)에서 `setAudioModeAsync({allowsRecording:false,...})`로 카테고리/라우팅을 바꾸고 인식기 `end`에서 `setAudioSessionActiveIOS(false)`로 세션을 강제 해제하니 — **다음 녹음의 입력 게인/감도가 떨어졌다**(증상 B의 감도 급락). 두 라이브러리가 공유 세션을 뺏고 뺏기면서 서로를 오염.
- H3 → **확정, 진짜 근본 원인**. `stop()`은 `finalRef.current`(커밋된 final)만 반환. 완료 시점에 마지막 구간이 interim으로만 남아 있으면 통째로 버려짐.
- H4 → 확정(H3의 트리거). `persist:true`+16kHz로 켜니 on-device 연속 인식이 **초반 isFinal 1개(3단어)만 커밋**하고 나머지를 계속 자라는 interim으로 유지 → stop에서 interim이 날아가 3단어만 남음. persist 없던 진짜 baseline에선 주기적 isFinal이 떠서 우연히 다 잡혔던 것.

## 근본 원인
1. **(B, 저장 손상)** 저장 로직이 인식기의 finalize 타이밍에 의존. 연속 on-device 인식은 "isFinal 하나 + 나머지 전부 interim" 패턴이 흔한데 `stop()`이 interim을 무시.
2. **(A, 감도 저하)** 공유 `AVAudioSession`을 재생 화면과 인식기 양쪽에서 서로 뒤집음. 스피커 라우팅(비필수, roadmap 항목)을 쫓다가 필수 기능(STT)을 두 번 회귀시킴.

## 수정
1. **`stop()`이 final + 마지막 interim을 합쳐 반환**(`use-speech-session.ts`). `interimRef`를 result 핸들러에서 동기화, isFinal마다 리셋(연속 모드는 구간마다 interim 리셋 → 중복 없음). 인식기 finalize 타이밍에 무의존 → 견고.
2. **오디오세션 조작 전면 롤백**. `end`의 `setAudioSessionActiveIOS(false)` 제거, world.tsx의 카테고리/라우팅 토글 제거. 재생 화면엔 무음스위치 대비 **`setAudioModeAsync({ playsInSilentMode: true })` 하나만** 남김(공유 카테고리 미변경). **스피커 라우팅은 post-submission roadmap으로 defer** — 나중에 시도하면 재생 화면이 아니라 **인식기 쪽 `setCategoryIOS`의 `defaultToSpeaker`** 한 방법으로만 격리.

## 지표 before / after
- 완료 저장 트랜스크립트: **첫 3단어** → **문장 전체**(라이브에 보이던 그대로).
- STT 감도: 급락(오디오세션 오염) → **baseline 복구**(사용자 확인 "녹음은 된거니까").
- 재생: 수화기(earpiece)로 소리 남 — baseline로 수용, 스피커 라우팅은 defer.

## 재발 방지 (회귀 스위트에 추가)
- **저장 회귀 가드**: `stop()`이 `[final, interim]`을 합치는 로직 = 이 버그의 회귀 케이스. 코드 주석에 근거 명시. (순수함수 유닛테스트 대상 아님 — 이벤트 기반 훅, 환경 제약)
- **원칙(메모리화 후보)**: iOS 오디오는 **프로세스 전체 단일 `AVAudioSession` 공유**. STT(playAndRecord/measurement)와 재생(playback)이 같은 세션을 뺏으면 **한쪽 고치다 다른 쪽 게인/라우팅이 깨진다**. 재생 화면에서 카테고리를 만지지 말 것. 스피커가 필요하면 **인식기 쪽에서 `defaultToSpeaker`**로 격리.
- **원칙**: on-device 연속 인식은 isFinal 누적을 신뢰하지 말고 **완료 시 interim을 flush**해서 라이브에 보인 전체 문자열을 저장.

## 후속 해결 — 스피커 라우팅 (2026-08-07)

defer했던 증상 A도 해결했다. 세션 상세에서 재생 직전에 인식기와 같은 API 경계인 `setCategoryIOS`를 사용해 카테고리는 `playAndRecord`로 유지하고, 옵션은 `defaultToSpeaker`·`allowBluetooth`, 모드는 출력 레벨이 낮은 `measurement`에서 `default`로 전환한다. 다음 인식 시작은 라이브러리가 다시 `measurement`를 설정하므로 STT 경로를 오염시키지 않는다.

- **회귀 가드**: 재생 화면에서 `allowsRecording:false` 또는 `playback` 카테고리로 뒤집지 않는다.
- **검증**: TypeScript·변경 파일 lint·iOS 번들 PASS, 물리 iPhone에서 사용자 스피커 재생 정상 확인("응 잘 된다"). 품질 스냅샷: [[quality/2026-08-07-self-talk-speaker-routing]].
