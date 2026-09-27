# 2026-08-24 · App Store 제출 전 전체 감사 (4-agent parallel audit)

범위: apps/mobile 전체 + supabase/functions. 영역: 보안 / 에러 처리 / App Store 규정 / 구현 갭.
검증 시점 기준: feat/mobile-skeleton, Privacy 화면·프로필 설정 구현 직후.

## BLOCKER (제출 전 필수)

1. **계정 삭제 in-app 부재 (Apple 5.1.1(v))** — 앱 내 삭제 진입점이 없고 Privacy 화면은 이메일 안내뿐. Apple은 "이메일로 요청"을 인정하지 않음. 필요 작업: 확인 다이얼로그 → 새 Edge Function(service key로 `auth.admin.deleteUser()` + 유저 데이터 캐스케이드) → sign out. 기존 edge function 패턴 재사용 가능.

## HIGH

2. **Apple 로그인 프로덕션 활성 미확인 (4.8)** — 구현은 완료(Supabase OAuth 웹 플로우)이나 버튼 노출이 GoTrue settings 응답에 의존. 프로덕션 Supabase에서 Apple provider(Service ID/키) 활성 확인 + 실기기에서 버튼 노출·완주 스모크 필수. Google만 뜨면 4.8 리젝.
3. **Talk 마이크/음성 권한 거부 시 복구 불가** — `talk.tsx`가 `speech.start()` 실패를 무시: 타이머 계속, Finish 활성, 빈 전사로 "세션 완료" 위장. 리뷰어가 반드시 테스트하는 경로. "마이크 접근 필요" 카드 + Open Settings + Finish 게이트 필요.
4. **권한 문구와 실제 불일치 (아바타 업로드)** — 카메라/사진 문구는 "mirror·학습 사진, 저장 안 함"인데 `profile-photo.ts`는 프로필 사진을 Supabase Storage에 업로드. 문구에 "프로필 사진 설정" 추가 필요.
5. **호스팅 개인정보처리방침 URL 부재** — App Store Connect 필수 입력. 인앱 Privacy 화면과 내용 일치하는 페이지를 웹에 호스팅.

## MEDIUM

6. **Library 추가 시트의 죽은 행 5개** — 탭하면 시트만 닫힘(2.1 리스크). 배선하거나 Coming soon 처리 또는 v1 제거.
7. **Raw `error.message` 노출 (~35곳)** — Postgrest 내부 문자열("JWT expired", RLS 위반 등)이 유저에게 그대로. `friendlyDbError` 헬퍼로 매핑 권장. (edge function 경로는 이미 정제된 카피 사용 — 직접 테이블 쿼리 경로만 해당.)
8. **조용한 빈 피커** — `islands.tsx`(도메인)·`practice.tsx`(스토리) fetch 실패 시 에러/재시도 없이 빈 목록. Today/Studio 패턴(에러 카드+Retry)으로 통일.
9. **RecsScreen 전체가 Coming soon 플레이스홀더** — 진입 카드 숨김 권장.
10. **`SAMPLE_PHRASE` 한국어 하드코딩 폴백** — item 없을 때 한국어 뜻 노출(L1 규칙 위반). L1 중립으로.
11. **avatars 버킷 public** — UUID 경로만으로 누구나 프로필 사진 접근 가능. 의도면 유지, 아니면 signed URL.
12. **PostHog에 email 전송** — person property로 이메일 식별. 개인정보 라벨에 반영했으니 유지 가능하나, opaque id만 쓰는 것도 옵션.

## LOW / 정리

13. `phrases.ts:406` fire-and-forget update에 `.catch` 없음(유일한 outlier) — 한 줄 수정.
14. `islands.tsx` + `design/data.ts` 데드 코드(호출처 없음) — 제거 가능.
15. `talk.tsx` TALK_SAMPLES 목업(한국어 포함, 미렌더) — 제거 가능.
16. `supabase/config.toml` 미커밋 — 함수별 `verify_jwt` 게이트를 소스 관리로(코드 내 getUser()는 전 함수 확인 완료라 방어는 이미 이중).
17. Settings "Coming soon" 5행 — 패턴 자체는 리뷰 통과 무방, 출시 시 숨길지 결정.
18. 온보딩 import·auth 에러 raw message 노출 — 소규모 카피 맵.

## 검증 완료(깨끗)

- **비밀키**: 번들·repo에 하드코딩 키 없음, `.env` gitignore + `.easignore` 확인, EXPO_PUBLIC_*만 사용.
- **Edge Functions 7종 전부** JWT 검증(`auth.getUser()` → 401) + anon key(RLS 스코프), service key 미사용.
- **RLS**: 전 테이블 ENABLE+FORCE, owner-only 정책, 재비활성화 마이그레이션 없음. 클라이언트 cross-user 쓰기 없음.
- **딥링크**: OAuth 콜백 토큰 파싱만, 위험 파라미터 없음.
- **Privacy manifest**: 필요한 네이티브 dep 전부 자체 PrivacyInfo.xcprivacy 포함(posthog-react-native는 순수 JS), 앱 레벨 추가 불필요.
- **ATT 불필요**(1st-party 분석만, IDFA/광고 SDK 없음). **ITSAppUsesNonExemptEncryption=false 정당**(HTTPS만).
- **버전/빌드**: EAS remote appVersionSource + autoIncrement, ascAppId 설정됨, 아이콘 검증 스크립트 존재.
- **빈 상태**: Today/Phrases/Studio/Sessions/Library 전부 zero-data 브랜치 정상.
- **로그**: console.* 전부 `__DEV__` 가드, PII 로깅 없음. 브랜딩 "Saylo" 일관.
- **JSON.parse/AsyncStorage 전부 try/catch**, apiJson·TTS 폴백·스키마 드리프트 허용 등 방어 로직 견고.

## App Store Connect 체크리스트 (코드 외)

- 리뷰용 데모 계정(이메일+비번, 사전 confirm, 데이터 시드).
- 개인정보처리방침 URL / 지원 URL.
- 개인정보 수집 라벨: 이메일·이름·사진·유저 콘텐츠·사용 데이터(계정 연결), 오디오 수집 안 함, 추적 없음.
- 스크린샷(6.9"/6.5"), 이름·부제·키워드·설명, 연령 등급, 수출 규정 응답.
