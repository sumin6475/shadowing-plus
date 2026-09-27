# Postmortem — Expo start SSR `window is not defined`

- **날짜**: 2026-08-24
- **스텝**: `npx expo start --dev-client`
- **상태**: 수정 적용, 프로세스 재시작 후 확인 대기

## 실패 현상

```
ReferenceError: window is not defined
    at Object.getItem
    at getItemAsync
    at SupabaseAuthClient._recoverAndRefresh / __loadSession / _initialize
```

`expo start`가 웹 SSR 번들을 만들다 Node에서 프로세스 전체가 종료됐다 (exit 7). 네이티브 QR/dev-client까지 같이 죽었다.

## 가설

1. 웹 전용 코드가 실수로 Node에서 실행됨
2. AsyncStorage 웹 구현이 `window.localStorage`를 쓰는데, Expo Router SSR은 `window`가 없음
3. PostHog / SplashScreen이 먼저 터짐

## 근본 원인

가설 2. `createClient(..., { auth: { storage: AsyncStorage } })`가 모듈 로드 때 세션을 복구하면서 AsyncStorage `getItem`이 `window`를 읽음. iOS/Android에는 `window`가 없어도 native AsyncStorage가 동작하고, 웹 브라우저에는 `window`가 있다. 깨지는 곳은 `Platform.OS === "web"` 이면서 `typeof window === "undefined"`인 Node SSR뿐.

## 수정

SSR일 때만 no-op storage + `persistSession: false`. 네이티브와 브라우저 세션은 AsyncStorage 그대로. `WebBrowser.maybeCompleteAuthSession`과 `SplashScreen.preventAutoHideAsync`도 같은 가드.

## Before / after

- Before: `expo start --dev-client`가 SSR 중 크래시, Metro가 죽음
- After: 같은 가드에서 storage `getItem`이 `window`를 타지 않음

## 회귀

`npm --prefix apps/mobile run typecheck`. 재현은 `npx expo start --dev-client` 후 웹 SSR 로그에 `window is not defined`가 없어야 함.
