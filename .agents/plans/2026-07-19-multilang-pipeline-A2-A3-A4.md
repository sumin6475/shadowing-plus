# Plan — 다국어 파이프라인 완성 (A2 · A3 · A4)

**Date:** 2026-07-19
**Goal:** 앱이 English→Korean만이 아니라 임의의 source→target 언어쌍으로 클립을 처리하도록 파이프라인을 완성한다. LanguagePanel이 이미 선택 UI를 노출하지만 파이프라인은 `languages.ts` 하드코딩만 읽는 "반쯤 만들다 만" 상태를 메꾸는 것이 핵심.
**배포는 사람이.** 이 플랜의 모든 코드는 배포 직전까지 자동으로 진행하되, `npx vercel --prod`와 migration SQL 적용(Supabase SQL Editor)은 Sumin이 실행한다.

---

## 코드 확인으로 확정된 사실 (2026-07-19)

- 파이프라인은 **`jobs` 테이블** 중심으로 돈다. 스테이지는 `getJob(jobId)`만 조회 (`web/src/lib/pipeline/jobs.ts:6`). **`videos` 행은 stage 5(persist)에서 마지막에 생성**되므로 (`setJobReady(jobId, videoId)`), transcribe·translate 실행 시점엔 video가 없다.
  → **결론: 언어쌍은 `jobs`에 실어야 한다.** (정정 2026-07-19: phase0 문서는 007이 `videos`에 언어 컬럼을 넣는다고 계획했지만, 실제 007은 `media_urls_to_keys`로 재사용됐고 **언어 컬럼은 videos에도 존재하지 않는다** — 전 마이그레이션 grep 결과 0건. 그래서 문서 ≠ 코드였음.) persist가 videos로 복사하려면 videos에도 컬럼을 추가해야 한다 → 011이 jobs+videos 둘 다 처리.
- 언어 상수를 쓰는 곳은 **딱 2개 스테이지**: `stage_2_transcribe.ts:8,136` (ElevenLabs `language_code`), `stage_4_translate.ts:6` + 프롬프트 여러 곳(127/129/205/210/216/…).
- LanguagePanel은 **localStorage에만** 저장 (`sp:pref:audioLang` / `sp:pref:translationLang`), 서버로 안 감 (`LanguagePanel.tsx`).
- 업로드 진입점 2개: `api/upload/route.ts`, `api/youtube/import/route.ts` (둘 다 `createJob` 호출).
- `jobs` 테이블은 001에 정의, 이후 언어 alter 없음.

---

## A2 — per-clip 언어쌍 배선

### A2.1 — migration `011_jobs_language_pair.sql`
`jobs`에 언어 컬럼 추가. 기존 행은 default로 커버 (현행 동작 = eng→Korean 유지).
```sql
ALTER TABLE jobs
  ADD COLUMN IF NOT EXISTS source_lang TEXT NOT NULL DEFAULT 'eng',
  ADD COLUMN IF NOT EXISTS target_lang TEXT NOT NULL DEFAULT 'Korean';
```
- `source_lang`: ISO 639-3 (ElevenLabs Scribe / Groq에 넘길 코드). e.g. `eng`, `spa`, `cmn`, `jpn`.
- `target_lang`: 번역 프롬프트에 그대로 박히는 영문 라벨. e.g. `Korean`, `English`. (기존 `TRANSLATION_LANGUAGE` 형식 그대로.)
- **주의:** 새 컬럼이지 새 테이블이 아니므로 Supabase의 RLS 자동-on 재강제는 불필요. (008로 RLS는 이미 on; jobs 정책 유지.)
- persist 스테이지에서 `videos` 행 만들 때 이 값을 그대로 복사해 넣으면 007 컬럼도 채워진다 (라이브러리/재생 화면이 나중에 쓸 수 있게).

### A2.2 — `languages.ts` 헬퍼
하드코딩 상수는 **default 폴백으로 유지**(기존 import 깨지 않음) + job에서 언어쌍 읽는 얇은 헬퍼 추가.
```ts
export interface LanguagePair { sourceCode: string; sourceName: string; targetName: string; }
export function languagePairForJob(job: { source_lang?: string | null; target_lang?: string | null }): LanguagePair
```
- `source_lang` 코드 → 사람이름(`sourceName`)은 작은 lookup 맵 (LanguagePanel의 AUDIO_OPTIONS와 동일 소스). 미지 코드는 코드 자체를 이름으로 폴백.
- 값 없으면 `AUDIO_LANGUAGE`/`TRANSLATION_LANGUAGE` default.

### A2.3 — 스테이지 주입
- `stage_2_transcribe.ts`: `callElevenLabs`가 `language_code`를 파라미터로 받게. `stage2Transcribe`에서 `languagePairForJob(job).sourceCode` 사용. (A3에서 이 지점이 provider 라우팅으로 확장됨 — A2에선 코드만 파라미터화.)
- `stage_4_translate.ts`: 함수 상단에서 `const { sourceName, targetName } = languagePairForJob(job)` 뽑고, 프롬프트의 `AUDIO_LANGUAGE.name`/`TRANSLATION_LANGUAGE`를 지역 변수로 치환. **번역 매칭은 batch position(k) 기준 유지** — 언어만 바꾸지 매칭 로직 안 건드림 (CLAUDE.md 규칙).
- Korean 특화 프롬프트 문구(해요체/합쇼체 등)는 `targetName === 'Korean'`일 때만 주입하도록 가드 (다른 언어일 때 한국어 지침이 새는 것 방지).

### A2.4 — createJob + 업로드 라우트
- `createJob` input에 `source_lang`/`target_lang` optional 추가 (없으면 DB default).
- `api/upload/route.ts` + `api/youtube/import/route.ts`: 요청에서 언어쌍 읽어 `createJob`에 전달.

### A2.5 — 업로드 UI + LanguagePanel 연결
- 업로드 폼에 source/target 드롭다운 (LanguagePanel의 옵션 재사용).
- 기본값은 LanguagePanel이 저장한 localStorage 값 (`sp:pref:audioLang`/`sp:pref:translationLang`) → "선호 언어" 설정이 업로드 기본값으로 흐름. LanguagePanel의 `// Phase 3 work` 주석 제거.

---

## A3 — ASR provider 라우팅 (Scribe / Groq)

**전제:** A2 완료(job에 source_lang 흐름). **`GROQ_API_KEY` 필요 — Sumin이 넣어야 실제 검증 가능.**

### A3.1 — `web/src/lib/asr/provider.ts`
```ts
export interface AsrProvider {
  name: 'scribe' | 'groq';
  transcribe(signedAudioUrl: string, lang: string): Promise<RawTranscript>; // 기존 shape 유지
}
```
- `RawTranscript`는 현재 stage_2의 내부 타입 → 공유 타입으로 승격.
- **단어→세그먼트 그루핑(GAP_SPLIT/30s/문장부호)은 provider 밖 공통 유지** — provider는 raw 단어 배열만 반환.

### A3.2 — 두 provider
- `ScribeProvider`: 현행 `callElevenLabs` + 그루핑 호출부 이동.
- `GroqWhisperProvider`: `whisper-large-v3`, `verbose_json` + `timestamp_granularities: ["word"]`. 출력 단어 배열을 공통 그루핑에 먹임. env `GROQ_API_KEY`.

### A3.3 — 라우팅 `pickAsrProvider(sourceLang)`
- `zh/ja(cmn/jpn) → scribe`, 그 외 → `groq`. (tier(무료/유료)는 이번 범위 밖 — 언어만.)
- stage_2는 `pickAsrProvider(job.source_lang).transcribe(...)`만 호출.
- **비용 기록:** `recordUsage`에 provider명 반영 (usage_events, 기존 필드 재사용).

### A3.4 — 검증
- 같은 영어 클립을 Scribe/Groq 양쪽으로 1회씩 → 단어 타임스탬프 드리프트(±100–300ms 알려짐)가 FocusLine 하이라이팅에서 체감되는지 메모. 미달이면 라우팅에서 해당 언어를 Scribe로 되돌림 (비용상 여전히 예산 내).

---

## A4 — ES 다국어 스파이크 (검증)

**전제:** A2·A3 완료.
- ES 클립 1개 업로드 (source=spa, target=Korean 또는 English) → Groq 라우팅 → end-to-end.
- 확인: 전사 품질(Groq/spa), 번역 품질, FocusLine 렌더, 라이브러리 정상 재생.
- 폰트: 라틴계는 현행 Pretendard로 충분. ZH/JA는 `layout.tsx` 폰트 교체 필요(CLAUDE.md 노트) — **이번 범위 밖, 기록만.**

---

## 검증 게이트 (배포 전)
1. `cd web && npm test` — postprocess/SRS 순수함수 회귀 (언어 배선이 이걸 안 깨야 함).
2. `npm run build` — 모든 라우트 등록 + 타입 통과.
3. `npm run lint` — `npx --no-install eslint`(v9) 기준.
4. `/verify` 또는 로컬 dev로 실제 업로드 1회 (A2는 GROQ 없이도 기존 Scribe 경로로 검증 가능; A3/A4는 GROQ_API_KEY 후).
5. **배포는 Sumin이** `npx vercel --prod` (repo root) + 배포 후 라우트 body 확인.

## 롤아웃 순서
migration 011(수동 적용) → A2 코드 → 로컬 검증 → A3 코드(+GROQ env) → A4 스파이크 → 전체 게이트 → 사람이 배포.

## 리스크
- 기존 업로드가 언어쌍 없이 오면 DB default(eng/Korean)로 현행 동작 보존 — 역호환 OK.
- Korean 특화 프롬프트 문구가 다른 target에 새지 않도록 가드 (A2.3).
- Groq 타임스탬프 품질 미달 시 라우팅 폴백 (A3.4).
- Hobby 60s 타임아웃: Groq 전환은 transcribe를 빠르게 해 오히려 압박 완화.
