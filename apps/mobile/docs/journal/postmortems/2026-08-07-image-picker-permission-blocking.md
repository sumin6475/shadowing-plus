# Postmortem — ImagePicker 설정이 기존 카메라·마이크 권한을 제거

- **날짜**: 2026-08-07
- **스텝**: 스크린샷 기반 phrase capture
- **심각도**: P1 잠재 회귀 (빌드 전 발견, 사용자 배포 없음)

## 실패 현상
`expo-image-picker` 플러그인에 `cameraPermission: false`, `microphonePermission: false`를 넣은 뒤 resolved Expo config에서 Android `CAMERA`와 `RECORD_AUDIO`가 사라졌다. 그대로 네이티브 빌드하면 기존 Mirror 카메라와 self-talk STT가 깨질 수 있었다.

## 근본 원인
두 `false` 값은 ImagePicker만 카메라·마이크를 쓰지 않게 하는 로컬 옵션이 아니라, 최종 manifest에서 해당 권한을 차단하는 설정이다. 이 앱은 ImagePicker에서는 사진만 고르지만 다른 기능이 같은 전역 권한을 실제로 사용한다.

## 수정
ImagePicker 플러그인에서 두 `false` 속성을 제거하고 사진 라이브러리 안내만 유지했다. `npx expo config --type public`으로 최종 Android 권한 목록에 `CAMERA`와 `RECORD_AUDIO`가 모두 남는 것을 확인했다.

## 재발 방지
권한 관련 config-plugin을 추가하거나 변경하면 JS 동작만 보지 않고 resolved Expo config의 iOS usage description과 Android permissions를 확인한다. 서로 다른 네이티브 모듈이 같은 전역 권한을 공유할 수 있음을 기준으로 판단한다.
