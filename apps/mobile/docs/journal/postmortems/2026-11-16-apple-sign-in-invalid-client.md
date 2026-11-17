# Apple 로그인: "Invalid client id or web redirect url"

- 날짜: 2026-11-16
- 영향: iOS 앱의 "Continue with Apple"이 출시 이후 한 번도 성공하지 않음 (`auth.identities`에 apple 0건). Google은 정상(2건, 시뮬레이터에서 재확인).

## 증상 (그대로)

appleid.apple.com 시트에 `invalid_request` / `Invalid client id or web redirect url.`

## 가설 → 확인

1. 앱의 redirectTo(`shadowingplus://auth/callback`)가 Supabase 허용 목록에 없음 → 아님. Google이 같은 경로로 성공.
2. Supabase가 Apple에 보내는 값이 잘못됨 → **맞음.** `/auth/v1/authorize?provider=apple`의 302 대상: `client_id=com.shadowingplus.mobile`, `redirect_uri=https://hetcnrmzrksbjoeczeze.supabase.co/auth/v1/callback`.

## 원인

Apple 웹 OAuth는 return URL이 등록된 **Services ID**만 client_id로 받는다. Supabase Apple provider에는 앱 번들 ID가 들어 있어 웹 흐름은 구조적으로 실패한다. 앱은 Apple도 Google처럼 웹 OAuth(`openAuthSessionAsync`)로 열고 있었다.

## 수정

iOS는 네이티브 Sign in with Apple로 전환 (`expo-apple-authentication` + `supabase.auth.signInWithIdToken`, SHA-256 nonce). 네이티브 identity token의 audience가 번들 ID라서 지금 Supabase 설정 그대로 맞는다. `app.json`에 `ios.usesAppleSignIn: true`. Android는 웹 흐름 그대로(미출시).

같이 고친 것: 시뮬레이터에 Apple 계정이 없을 때 Close를 누르면 `RequestUnknownException: The authorization attempt failed for an unknown reason (at ExpoAppleAuthentication/AppleAuthenticationExceptions.swift:61)`이 화면에 그대로 나옴 → 코드별 문구로 바꿈.

## 전/후

- 전: 웹 시트 → invalid_request.
- 후: iOS 시스템 Apple 시트가 뜸. 계정 없는 시뮬레이터에서 Close → "Couldn’t sign in with Apple. Make sure you’re signed in to your Apple Account in Settings, then try again."
- **미확인**: Apple 계정으로 실제 로그인 완료(시뮬레이터에 Apple 계정 없음), 실기기, EAS 빌드에서 App ID에 Sign in with Apple capability가 자동으로 켜지는지.

## 회귀 케이스

`tests/apple-sign-in.test.mjs` (test:mvp에 포함): 이름 처리, 취소 판별, 네이티브 예외 문구가 화면에 안 나오는지.
