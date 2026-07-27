# Execution Report / Review — 베타 프로덕션화 세션

**Date:** 2026-07-20 → 2026-07-21
**Status:** 전부 배포됨(자동배포) 또는 배포 대기 없음 · migrations 013·014·015 적용됨
**Gates (매 변경):** lint 0 errors · npm test (52) 통과 · npm run build ✓

한 세션에서 "베타를 안전·정직·측정가능하게" 만드는 작업 다수 + 사용자 발견 버그 2건 근본수정. 시간순 요약.

---

## 배포 방식 (이 세션에서 확정)
**git push → main = Vercel 자동배포** (git 연동 켜져 있음, 빌드 1~2분). CLI(`npx vercel --prod`)도 됨. 세션 중반 "push는 배포 안 됨"이라 잘못 판단했다가, 빌드 지연이었음을 확인하고 정정. → [[push-auto-deploys]]

## 이번 세션 산출물

### A. 프로덕션 하드닝 (오픈 베타 안전·정직)
1. **비용 가드레일** — 오픈 signup인데 유료 파이프라인에 상한 0이던 문제. `lib/quota.ts`: per-user 클립 상한(기본 20, `CLIP_LIMIT_PER_USER`) + **per-clip 60분 상한**(stage 1에서 duration probe 후 유료작업 전 거부, `MAX_CLIP_MINUTES`). 소유자 면제. `/api/upload` 429.
2. **랜딩 정직화** — 가격표(결제 미연동) → "Free while in beta" 밴드 + 히어로 Beta 배지. **YouTube 문구 전면 제거**(owner-only 기능이라) → 파일 업로드 프레이밍.
3. **최소 법무** — `/privacy` + `/terms` (실제 데이터흐름 기반), 푸터 연결, 연락처 sumin002@gmail.com.
4. **첫 실행 온보딩** — 라이브러리 빈 상태(클립 0개일 때만) → Capture→Drill→Retain 가이드.

### B. 로그인 UX
- 코발트 리틴트(기존 차콜 → 앱 브랜드 통일), 워드마크 Shadowing+ 홈링크.
- 이메일 형식 검증(blur), 비밀번호 실시간 체크리스트(8자·대소문자·숫자), 제출 게이팅. 에러문구는 비번영역과 버튼 사이 빨간줄로.
- ⚠️ 남은 것: 비번 정책은 **클라 검증만** — Supabase Auth 설정에서 서버 정책도 맞춰야 진짜 방어선.

### C. 측정 / 진도 추적 (metric ② 재방문)
- **migration 013 `practice_sessions`** — 플레이어가 활성 재생시간을 기록. 대시보드 placeholder("coming soon") → **실제 주간 막대차트 + 스트릭**(디자인의 미배선 `.chart` CSS 재활용). 순수함수 `practice-stats.ts` + 8 테스트.

### D. 사용자 발견 버그 2건 — 근본수정
1. **일본어(비라틴) 전사가 빈 결과** — 후처리 `removeNonEnglish`가 비라틴 세그먼트를 전부 삭제(영어 전용 시절 유물). 소스 스크립트 기준으로 게이팅(`isLatinScriptLanguage`) + CJK 문장부호/공백 처리(`text.ts`). 일/한/중 소스 복구. → [[postprocess-english-only-assumptions]]
2. **업로드가 "Queued"에서 안 넘어감(멈춘 것처럼)** — 파이프라인은 정상(run 200, 클립 생성됨)이나 **Realtime이 RLS로 막혀** 상태가 UI에 안 옴 → 유저가 재시도 → 중복 생성. `realtime.setAuth(token)` + in-flight 폴링 폴백. RLS 켠(008) 이후 계속 깨져 있던 것, 모든 유저 영향. → [[realtime-needs-setauth-with-rls]]

### E. 성장/학습 인프라
- **피드백 채널** — 계정메뉴 → Send feedback 모달 → `feedback`(migration 014). 소유자는 대시보드 조회. (모바일 미포함 — follow-up)
- **Language island 커밍순** — `/island` 티저 + "I'd use this" 수요신호(`feature_interest`, migration 015). 실구현은 코어 검증 후. 랜딩 푸터 링크.

## 스킵/보류
- **데모 GIF** — 실제 앱 녹화 시도했으나 제어 브라우저에서 **영상이 렌더 안 됨**(검정, 시간 0:00 고정) → 스킵. 필요시 Sumin이 직접 화면녹화 → 임베드.
- **중복 클립 정리** — 재시도로 생긴 중복("The thing I'm building"·"japanese"·"CleanShot" 각 ×2) 3개. 삭제 미확인이라 보류(되돌릴 수 없어 임의삭제 안 함).

## 남은 것 (follow-up)
- 비번 정책 Supabase 서버측 설정.
- 피드백/수요신호 모바일 진입점.
- 중복 클립 3개 삭제(Sumin).
- 데모 영상(Sumin 화면녹화).
- 대시보드 `detectHallucinations`는 CJK에서 no-op(공백 기반) — 필요시 CJK 반복탐지.

## Migrations (적용됨)
013 practice_sessions · 014 feedback · 015 feature_interest — 전부 direct-owner(`user_id DEFAULT auth.uid()`) + RLS 패턴(008 따름).
