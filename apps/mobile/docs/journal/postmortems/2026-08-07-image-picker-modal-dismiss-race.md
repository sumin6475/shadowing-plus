# Postmortem — 앨범 picker가 source menu와 동시에 전환돼 무한 loading

- **날짜**: 2026-08-07
- **스텝**: Phrase 빠른 source menu 실기기 검증
- **심각도**: P1

## 실패 현상
실제 iPhone에서 `+` → `Choose from Photos` → 사진 선택 후에도 capture 화면으로 이동하지 않고, Today 화면의 `+`가 spinner 상태로 계속 남았다. 같은 메뉴의 카메라와 텍스트 경로는 정상 동작했다. 별도 앱 터미널 로그는 연결돼 있지 않았다.

## 가설
- **H1**: React Native `Modal` dismiss와 iOS PHPicker present가 같은 tick에 실행돼 native presentation transition이 겹쳤다.
- **H2**: 선택 이미지의 OCR 또는 Edge Function이 멈췄다.

## 검증 방법과 결과
- H1 → `chooseImage()`가 `setOpen(false)` 직후 `launchImageLibraryAsync()`를 호출하고 있었다. 카메라는 그 사이 권한 await가 있지만 앨범에는 transition 간격이 없었다. spinner는 picker Promise의 `finally` 전 상태와 일치했다.
- H2 → capture route가 push되기 전 spinner가 Today의 FAB에 남았으므로 이미지 resize/OCR 화면까지 도달하지 않은 상태였다.

## 근본 원인
source menu를 React Native `Modal`로 구현하면서, iOS native photo picker를 modal의 dismiss 완료 신호 없이 바로 present했다. 두 presentation transition의 생명주기를 하나의 async 함수에서 순차적으로 보이게 작성했지만 `setOpen(false)`는 dismiss 완료를 기다리지 않는다.

## 수정
iOS에서는 선택한 source를 pending state에 저장하고 menu를 닫은 뒤, `Modal.onDismiss`가 호출된 다음에만 camera/photo picker를 실행한다. 다른 플랫폼은 `InteractionManager.runAfterInteractions` 뒤 실행한다. 기존 spinner cleanup과 cancel/error 경로는 유지했다. 무한 상태를 지우기 위해 실제 iPhone 앱을 재시작했다.

## 지표 before / after
- Before: 앨범 선택 후 FAB spinner가 끝나지 않고 capture route 미진입.
- After: TypeScript·ESLint·diff check PASS, 실제 iPhone 앱 재실행/process 유지 PASS. 앨범 선택 end-to-end는 사용자 재탭 확인 대기.

## 재발 방지 (회귀 스위트에 추가)
native picker를 custom `Modal` 메뉴에서 여는 경로는 modal dismiss 완료를 명시적 gate로 사용한다. 품질 스냅샷의 실기기 capture matrix에 camera / photos / text를 각각 독립 항목으로 유지한다.
