# Execution Report — 다국어 파이프라인 A2 · A3 (배포 직전까지)

**Date:** 2026-07-19
**Plan:** `.agents/plans/2026-07-19-multilang-pipeline-A2-A3-A4.md`
**Status:** A2 ✅ · A3 ✅ · **A4 ✅ 런타임 검증 성공** (스페인어 클립 end-to-end) · **배포 ✅ (2026-07-19, prod 라이브 확인)**
**Gates:** lint 0 errors · tsc 0 · npm test 41/41 · npm run build ✓ (모든 라우트 등록)

## A4 런타임 검증 (2026-07-19, dev 서버 UI)
스페인어 클립("Breakfast in Slow Spanish | Super Easy Spanish 105") 업로드 → 결과:
- ✅ 전사 = **스페인어** ("Yo suelo desayunar fruta con nueces, frutos secos.") → A2 언어쌍 배선 작동, source=spa로 흐름.
- ✅ 번역 = **한국어** ("저는 보통 아침식사로 과일과 견과류, 말린 과일을…") → target 배선 + Korean 프롬프트 가드 정상. "frutos secos"를 자연스럽게("견과류/말린 과일") 처리.
- ✅ **Groq 라우팅 작동** — spa는 Groq 경로. 전사가 나왔다는 것 자체가 pickAsrProvider("spa")→Groq 호출·성공의 증거.
- ✅ 플레이어 재생 + FocusLine 정상.

### ⚠️ A4가 잡은 버그 → migration 012
dev 로그에서: `recordUsage insert failed (non-fatal): violates check constraint "usage_events_provider_check"`.
- **원인:** `usage.ts`의 TS provider 타입은 groq로 확장했지만, **DB CHECK 제약**(migration 006: `provider IN ('openai','elevenlabs')`)은 안 풀었음. groq insert가 거부됨.
- **영향:** non-fatal이라 파이프라인은 성공하지만 **Groq 지출이 usage_events에 기록 안 됨** → 비용 리포트가 Groq를 놓침(A3 목적의 절반).
- **수정:** `supabase/migrations/012_usage_provider_groq.sql` — 제약을 drop 후 groq 포함해 재생성(idempotent). **Sumin이 012도 적용해야 함.**
- **교훈:** DB CHECK 제약이 있는 컬럼에 새 enum 값을 추가할 땐 TS 타입 + DB 제약을 **항상 함께** 봐야 함. 정적 게이트(tsc)는 이걸 못 잡음 — 런타임 검증(A4)이 잡았다.

---

## 배포 전 Sumin이 해야 할 것

- [x] **migration 011 적용** — jobs+videos 언어 컬럼. (완료)
- [x] **`GROQ_API_KEY` 추가** — 로컬 + Vercel env. (완료)
- [x] **migration 012 적용** — `supabase/migrations/012_usage_provider_groq.sql`. usage_events provider CHECK에 groq 추가. (Sumin 적용 완료.)
- [x] **배포** — Sumin이 repo 루트에서 `npx vercel --prod` 실행. 배포 후 라우트 body 확인 완료: `/` = 새 랜딩, `/app` = 307→/login(게이트 정상, 이전엔 HTML 404), `/api/usage` = 401(JSON). deployment `dpl_8H4Dn4SKCz64foBGKbronfArVZ4C`.

> **배포된 배치(2026-07-19):** 이 다국어 파이프라인 커밋(e65170d)뿐 아니라 그 뒤 같은 날 커밋 전부 — 계정 메뉴/설정, Groq 비용 대시보드, YouTube owner-gate, Home 대시보드, **공개 랜딩(/) + 앱 이동(/app) + PWA start_url**. prod는 그동안 landing-split 이전 빌드였고 이번에 한꺼번에 반영됨.

> A4 런타임 검증까지 로컬에서 통과. 남은 건 012 적용 + 배포뿐.

---

## A2 — per-clip 언어쌍 (완료)

언어쌍이 이제 end-to-end로 흐른다: **LanguagePanel(localStorage) → useUpload/page.tsx → upload/youtube 라우트 → createJob → jobs 테이블 → stage_2/stage_4가 job에서 읽음 → stage_5가 videos로 복사.**

- `011_jobs_language_pair.sql` — jobs+videos에 컬럼. (플랜 정정: phase0가 007이 videos에 넣는다고 했으나 007은 media_urls로 재사용됐고 언어 컬럼은 어디에도 없었음 — grep 0건 확인.)
- `languages.ts` — `languagePairForJob()` 헬퍼(null → eng/Korean 폴백) + 옵션 리스트를 단일 출처화(AUDIO_LANGUAGE_OPTIONS / TRANSLATION_LANGUAGE_OPTIONS) + localStorage 키 export.
- `stage_2` / `stage_4` — 하드코딩 상수 → `languagePairForJob(job)`. **번역 매칭은 batch position(k) 그대로 유지**(CLAUDE.md 규칙 안 건드림).
- **Korean 특화 프롬프트 가드** — 해요체/합쇼체 등 speech-level 지침과 원칙5의 한국어 예시는 `targetName === "Korean"`일 때만 주입. 다른 target에는 언어중립 지침(한국어 용어 누출 방지).
- `createJob` + upload/youtube 라우트 — 언어쌍 optional 수용, **옵션 리스트로 화이트리스트 검증**(임의 코드 주입 차단). YouTube는 영어 자막 고정이라 target만 받음.
- 업로드 UI — 별도 피커 대신 **localStorage 선호값 자동 적용**(파일 배치 업로드라 개별 피커 부적합). 모바일 셸도 useUpload 공유 → 자동 상속.
- LanguagePanel — 중복 배열 제거(공유 상수 참조), "Phase 3 work" 주석 제거, 노트를 실제 동작에 맞게 갱신.

## A3 — ASR provider 라우팅 (완료)

- `web/src/lib/asr/` 신설: `types.ts`(AsrWord/AsrResult/AsrProvider), `scribe.ts`, `groq.ts`, `provider.ts`.
- **경계 = 단어 배열.** provider는 raw 단어 스트림만 반환; 세그먼트 그루핑(GAP/30s/문장부호)은 stage_2에 공통 유지 → 모든 provider가 동일 세그먼트화.
- `pickAsrProvider(sourceLang)`: **zh/ja(cmn/zho/chi/jpn) → Scribe, 그 외 → Groq.** Groq 품질 미달 언어는 SCRIBE_LANGS에 추가만 하면 됨(다른 코드 무변).
- Groq 특이점 처리: (a) OpenAI 호환 API라 **오디오 바이트를 multipart로** 보내야 함 → signed URL에서 fetch 후 blob 전송 (Scribe는 URL 직접). (b) 언어 힌트가 ISO 639-1(2글자)이라 639-3→639-1 매핑, 미지 코드는 힌트 생략(auto-detect).
- **비용 추적:** `usage.ts` provider 타입에 `groq` 추가 + `groqCostUsd`(~$0.111/hr). stage_2가 실제 실행된 provider명·모델로 기록 → 비용 리포트에 Scribe/Groq 분리 반영.

## A4 — ES 스파이크 (대기)

GROQ_API_KEY 후: ES 클립 1개(source=spa, target=Korean 또는 English) 업로드 → Groq 라우팅 → 전사/번역/FocusLine 렌더/라이브러리 재생 확인. Groq 단어 타임스탬프 드리프트(±100–300ms)가 FocusLine에서 체감되면 라우팅 폴백.

## 부수 수정
- **린트 훅 v10 버그 해결** (실행리포트 open thread #5). `.claude/hooks/hooks_config.json`의 post_edit lint를 `npx eslint` → `npx --no-install eslint`로. v10 자동 fetch가 eslint-plugin-react에서 크래시하던 것 차단. **이번 세션엔 훅이 세션 시작 설정으로 돌아 가짜 알람이 계속 떴지만, 다음 세션부터 적용됨.** (세션 내내 v9로 직접 검증하며 진행.)

## 파이프라인 순수성 / 배포 함정 체크
- postprocess/SRS 순수함수 안 건드림 → test 41/41 유지.
- `.vercelignore` 관련 신규 경로 없음(asr는 src 하위라 기존 규칙 커버). build에서 라우트 전부 등록 확인.
- RLS: 011은 새 컬럼이라 Supabase RLS 재활성 안 됨, 008 정책 유지.
