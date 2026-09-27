# Postmortem — expo-file-system 57.0.2가 실행 즉시 크래시 (dyld symbol-not-found)

- **날짜**: 2026-08-07
- **스텝**: 음성 녹음 Phase 1 — 로컬 저장 위해 `expo-file-system` 추가
- **심각도**: P0 (앱이 스플래시 전에 튕김, 완전 실행 불가)

## 실패 현상
`npx expo install expo-file-system` 후 dev-client를 재빌드하니 **스플래시가 뜨기도 전에** 앱이 즉시 튕김(사용자: "a" = 즉발, 네이티브). Xcode 콘솔:

```
dyld: Symbol not found: _$s15ExpoModulesCore10BaseModuleC11willDestroyyyF
  Referenced from: .../ExpoFileSystem.framework/ExpoFileSystem
  Expected in:     .../ExpoModulesCore.framework/ExpoModulesCore
```

## 가설
- **H1**: 내가 추가한 JS 코드(File/Directory API) 오용 → JS 예외.
- **H2**: 네이티브 ABI 불일치 — `expo-file-system`이 `ExpoModulesCore`에 없는 심볼(`BaseModule.willDestroy`)을 참조.

## 검증 방법과 결과
- H1 → 기각. 크래시가 **JS 로드 전 dyld 단계**(스플래시도 못 뜸). JS 예외라면 RedBox가 떴을 것.
- H2 → 확정. `expo install`이 **57.0.2**를 설치했는데, `expo@57.0.8`이 물고 있는 `ExpoModulesCore`는 **57.0.7**. 57.0.2가 참조하는 `BaseModule.willDestroy`는 core 57.0.7에 존재하지 않음 → dyld가 링크 시점에 심볼을 못 찾고 프로세스 종료. expo@57.0.8의 의도된 file-system 범위는 `~57.0.1`.

## 근본 원인
`expo install`의 버전 해석이 코어와 **미세하게 어긋난 패치 버전(57.0.2)**을 골랐다. Expo 네이티브 모듈은 `ExpoModulesCore`와 **정확히 같은 빌드**를 기대하는데, 패치 하나 차이로 심볼 그래프가 깨졌다. 사람 실수가 아니라 **해석기의 버전 픽 + 모듈/코어 ABI 결합의 취약성**.

## 수정
```
npm install expo-file-system@57.0.1 --save-exact   # 직접+전이 의존성 모두 57.0.1로 dedupe
npx pod-install
npx expo run:ios --device                           # 앱 정상 실행
```
`package.json`에 **`"expo-file-system": "57.0.1"` (정확 핀, ^/~ 없이)**. `rm -rf node_modules`나 `npm prune`으로는 안 없어짐 — file-system은 expo의 전이 의존성이라 스스로 다시 끌려온다. 정확 핀만이 core와 정렬시킨다.

## 지표 before / after
실행: dyld symbol-not-found 즉발 크래시 → **정상 부팅**(스플래시 → 앱), 녹음 저장/재생 동작.

## 재발 방지 (회귀 스위트에 추가)
- `package.json`의 정확 핀 `expo-file-system@57.0.1`이 회귀 가드 — `^`/`~`로 풀리면 다시 드리프트 가능하므로 유지.
- 규칙: **Expo 네이티브 모듈은 `expo install`이 골라준 버전을 맹신하지 말고 `ExpoModulesCore` 버전과 맞는지 확인**. dyld `Symbol not found ... Expected in ExpoModulesCore`는 거의 항상 모듈/코어 버전 불일치이지 코드 문제가 아니다.
- 자동 테스트 없음(네이티브 링크 단계, 환경 제약) — 대신 정확 핀 + 이 문서로 다음 세션 가드.
