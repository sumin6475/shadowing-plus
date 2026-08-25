# Postmortem — 첫 TestFlight Speak 완료 시 iOS 네트워크 연결 유실

- **날짜**: 2026-08-11
- **스텝**: 첫 외부 베타 Speak 완료 화면
- **상태**: 클라이언트 수정·정적 검증 완료, 새 TestFlight 실기기 확인 대기

## 실패 현상

26초 Speak 세션을 마친 뒤 세션 저장에는 `fetch failed: UnexpectedException: The network connection was lost. (at ExpoModulesCore/Promise.swift:56)`, AI 진단에는 `Failed to send a request to the Edge Function`이 동시에 표시됐다. 내부 SDK 예외가 그대로 사용자 화면에 노출됐다.

## 검증과 근본 원인 층

- `talk-diagnose`와 `talk-stuck`은 Supabase에서 ACTIVE였고, 데스크톱에서 각각 정상적인 인증 거부(HTTP 401 JSON)를 반환했다. 미배포·DNS·서버 전체 장애는 제외했다.
- 한 화면에서 일반 Supabase DB insert와 `functions.invoke`가 함께 실패했다. 두 경로의 공통점은 SDK 57이 native global로 설치한 `expo/fetch`다.
- 예외 위치도 `ExpoModulesCore/Promise.swift`여서 앱 로직이나 Edge Function 응답 파싱 전의 native transport 실패와 일치한다.

따라서 실패 층은 Expo SDK 57의 기본 `expo/fetch` iOS 전송 경로로 진단했다. 연결 유실을 일으킨 URLSession 하위 조건 자체는 새 빌드의 실기기 재현 여부 확인 전까지 미확정이다.

## 수정

Expo 57 공식 호환 플래그 `EXPO_PUBLIC_USE_RN_FETCH=1`을 development·preview·production EAS profile에 고정해 Supabase DB와 Edge Function 호출이 React Native fetch를 사용하게 했다. 세션 저장/진단 실패 시 raw 예외 대신 짧은 복구 문구만 표시하고 개발 빌드에서만 원인을 경고 로그로 남긴다.

## 재발 방지

`scripts/verify-release-config.mjs`를 `npm run validate`의 첫 gate로 추가했다. 세 EAS profile의 RN fetch 플래그, 실제 iOS 아이콘 경로, 1024×1024 opaque PNG 조건이 빠지면 validation이 즉시 실패한다. 새 TestFlight에서 Speak 저장·진단 성공을 최종 runtime gate로 남긴다.
