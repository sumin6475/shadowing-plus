# Postmortem — 이미지 수집 모듈 누락 후 Expo ABI 불일치

- **날짜**: 2026-08-07
- **스텝**: 스크린샷 기반 phrase capture 실기기 실행
- **심각도**: P0 (앱 시작 불가)

## 실패 현상
첫 실행은 `Cannot find native module 'ExponentImagePicker'`로 JS import 단계에서 중단됐다. 새 dev client를 만든 뒤에는 더 이른 dyld 단계에서 `ExpoImageManipulator`가 `ExpoModulesCore.BaseModule.willDestroy` 심볼을 찾지 못해 종료됐다.

## 근본 원인
첫 오류는 ImagePicker를 추가하기 전에 설치된 dev client를 계속 사용한 것이 원인이었다. 두 번째 오류는 `npx expo install`이 고른 `expo-image-picker`·`expo-image-manipulator` 57.0.8과 `expo-asset` 57.0.9가, 현재 `expo@57.0.8`의 `bundledNativeModules.json`이 지정한 57.0.6·57.0.6·57.0.7보다 새 버전이어서 `ExpoModulesCore 57.0.7`과 ABI가 맞지 않은 것이 원인이었다.

## 수정
- SDK 번들 매핑에 맞춰 `expo-image-picker@57.0.6`, `expo-image-manipulator@57.0.6`, `expo-asset@57.0.7`을 정확 버전으로 고정했다.
- iOS prebuild와 CocoaPods 갱신으로 신규 모듈을 dev client에 포함했다.
- Expo Audio/ImagePicker 플러그인에 기존 마이크 안내 문구를 명시해 prebuild 시 기본 문구로 덮이지 않게 했다.
- 연결된 iPhone에 새 dev client를 빌드·설치했다.

## 검증
`expo run:ios --device` 빌드 성공(오류 0), `ExpoImagePicker`·`ExpoImageManipulator` 컴파일 확인. `devicectl --console --timeout 15`에서 JS bundle 평가 이후에도 종료되지 않았고, 별도 process 조회에서 `Shadowing.app/Shadowing`이 실행 중임을 확인했다.

## 재발 방지
Expo 네이티브 모듈을 추가할 때 `expo install` 결과만 신뢰하지 않고 `expo/bundledNativeModules.json`과 실제 `ExpoModulesCore` 버전을 대조한다. 신규 모듈은 production bundle만으로 검증하지 않고 dev client 재빌드 후 물리 기기 startup까지 확인한다.
