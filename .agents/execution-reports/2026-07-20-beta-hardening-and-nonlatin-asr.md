# Execution Report — 베타 공개 대비 하드닝 + 비라틴 ASR 수정

**Date:** 2026-07-20
**Status:** 코드 완료 · 로컬 검증 통과 · **커밋/배포 대기 (사람)**
**Gates:** lint 0 errors · tsc 0 · **npm test 44/44** (신규 3) · npm run build ✓ (모든 라우트 등록)

이번 세션은 (0) 지난 배치 배포 확인 → (1) 오픈 signup을 안전·정직하게 만드는 프로덕션 하드닝 4종 → (2) 사용자가 발견한 일본어 전사 버그를 근본 수정하는 흐름.

---

## 0. 지난 배치 배포 확인 (2026-07-19 작업분)
- prod에 landing/app-split + 다국어 파이프라인 배치가 **미배포 상태**였음을 발견 → Sumin이 배포.
- 배포 후 확인: `/` = 새 랜딩, `/app` = 307→/login(게이트 정상, 이전엔 HTML 404), `/api/usage` = 401(JSON). deployment `dpl_8H4D…`.

## 1. 비용 가드레일 (오픈 signup 재정 방어)
**문제:** signup이 열려 있는데(`/login` 오픈 가입) 클립당 유료 파이프라인(ASR+번역+R2)에 **per-user 상한이 전혀 없음** → 남용 시 소유자 청구서 폭증.
- `lib/quota.ts` (신규) — `checkClipQuota(userId)`: 소유자 면제 + env 조정 상한(`CLIP_LIMIT_PER_USER`, 기본 20).
- `lib/pipeline/jobs.ts` — `countActiveClips()` (HEAD count, failed 제외).
- `api/upload/route.ts` — job 생성 **전에** 429 (사용자용 메시지 포함).
- `useUpload.ts` — 429 메시지 그대로 노출.
- `.env.example` — 신규 var 문서화 (+ 누락됐던 `GROQ_API_KEY`, YouTube allowlist).
- 소유자 면제: `NEXT_PUBLIC_OWNER_IDS` (없으면 YouTube allowlist로 폴백).

## 2. 랜딩 정직화 (베타)
- 히어로에 **Beta** 알약(cobalt) 추가.
- 가격표(Solo/Plus/Teams) 제거 → **"Free while in beta"** 밴드로 교체 (결제 미연동인데 체크아웃 약속하던 문제 해소).
- nav·footer의 "Pricing" 링크 제거(정합성).
- 스크린샷으로 시각 확인 완료.

## 3. 최소 법무
- `/privacy`, `/terms` 신규 페이지 (실제 데이터 흐름 기반: Supabase/R2/ElevenLabs/Groq/OpenAI/Vercel), `legal.css` 공유 스타일, 테마 대응.
- footer Privacy/Terms 링크 연결.
- 연락 이메일 = `sumin002@gmail.com` (Sumin 승인).
- 자체 표기: "베타 개인 프로젝트, 법률 자문 아님, 공개 확대 전 전문가 검토 예정" — 프로젝트 기존 스탠스와 일치.

## 4. 첫 실행 온보딩
- 라이브러리 빈 상태(계정에 클립 0개일 때만)를 **"Welcome / Capture→Drill→Retain" 3스텝 가이드 + '첫 클립 추가'**로 교체. 빈 폴더/필터에는 기존 문구 유지.
- `home.css`에 `.onboard*` 스타일(기존 토큰 재사용).

---

## 5. ⭐ 일본어(비라틴) 전사 버그 — 근본 수정
**증상(Sumin 보고):** 소스 언어를 일본어로 설정하고 파일 업로드 → 에러 없이 **transcript가 비어서 나옴**. ElevenLabs 크레딧은 충분.

**근본 원인:** 후처리 마지막 단계 `removeHallucinations = detectHallucinations(removeNonEnglish(...))`의 `removeNonEnglish`가 **라틴 문자가 아닌 세그먼트를 전부 삭제**. 영어 전용 시절 Whisper의 "침묵→외국어 환각" 제거용 규칙인데, 이제 일본어가 **소스**라서 정상 전사를 통째로 지움 → 세그먼트 0개.
- 스페인어(A4)가 됐던 건 라틴 문자라 안 지워졌기 때문. jpn/kor/cmn 소스는 전부 이 필터에 죽고 있었음.

**추가로 발견:** 문장 종결부호 집합이 라틴 전용(`. ! ? …`)이라 CJK `。！？`를 인식 못 함 + 토큰을 공백으로 join → 일본어가 통짜 한 세그먼트 + "私 は" 식으로 벌어짐.

**수정 (파일 6 + 테스트 3):**
- `postprocess/remove_hallucinations.ts` — `removeHallucinations(segments, { dropNonLatin })`. 기본 `true`(기존 동작·테스트 보존).
- `pipeline/languages.ts` — `isLatinScriptLanguage(code)` (jpn/kor/cmn/zho/chi/yue → false).
- `pipeline/stage_3_postprocess.ts` — job의 소스 언어를 읽어 **비라틴 소스면 `dropNonLatin:false`** → 전사 보존.
- `pipeline/text.ts` (신규) — 공유 유틸: `SENTENCE_END_PUNCT`에 CJK `。！？．‥` 추가 + `joinWords()`(CJK끼리는 공백 없이). stage_2 + regroup_sentences가 공유.
- `stage_2_transcribe.ts` / `postprocess/regroup_sentences.ts` — 로컬 상수/조인 → 공유 유틸로 교체.
- 테스트: regroup에 CJK 문장 분할 1개, remove_hallucinations에 비라틴 보존/기본 삭제 2개.

**런타임 검증(로컬, dev):** 일본어 클립 재업로드 → `POST /api/jobs/…/run 200 in 12.6s` → player/media 200 → **일본어 전사 정상 표시**. (긴 문장 영상은 아니어서 `。` 분할은 유닛 테스트로만 확인.)

**부수 효과:** 일본어뿐 아니라 **한국어·중국어 소스**도 동일 필터에 죽고 있었으므로 함께 복구됨.
**남은 한계(경미):** CJK는 공백이 없어 반복-환각 탐지기가 사실상 no-op. Scribe는 환각이 드물어 현재는 무방. 필요 시 CJK 반복탐지 별도 작업.

---

## 배포 — 완료 (2026-07-20)
- [x] **커밋 + 배포** — `327b0a5`(베타 하드닝+비라틴 수정) + `db79fe9`(클립 60분 상한). `npx vercel --prod`로 라이브 확인: `/` 베타 랜딩, `/privacy`·`/terms` 200(이메일 반영), `/app` 307, `/api/usage` 401.
- [x] **env:** `CLIP_LIMIT_PER_USER=20` (테스트용 1에서 변경), 소유자는 `NEXT_PUBLIC_YOUTUBE_IMPORT_ALLOWLIST`로 면제. `MAX_CLIP_MINUTES` 기본 60.
- [x] **마이그레이션 없음** — 스키마 변경 없음.
- **후속 추가(db79fe9):** 클립당 **60분 길이 상한** — stage 1에서 duration probe 후 초과 시 유료작업 전 거부(소유자 면제). 개수 상한만으론 비용 바운드 안 되던 구멍 보완.

## 변경 파일
**신규(5):** `lib/quota.ts`, `lib/pipeline/text.ts`, `app/legal.css`, `app/privacy/page.tsx`, `app/terms/page.tsx`
**수정(15):** `.env.example`, `api/upload/route.ts`, `app/app/page.tsx`, `app/page.tsx`, `home.css`, `landing.css`, `useUpload.ts`, `pipeline/jobs.ts`, `pipeline/languages.ts`, `pipeline/stage_2_transcribe.ts`, `pipeline/stage_3_postprocess.ts`, `postprocess/regroup_sentences.ts`, `postprocess/remove_hallucinations.ts`, + 테스트 2개
