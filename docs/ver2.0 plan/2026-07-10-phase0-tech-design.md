# Phase 0 기술 설계 — 기반 공사 + Review 봇 v0 (2026-07-10)

> ver2.0 plan. 범위: 개인용으로 계속 쓰면서 퍼블릭 준비의 기반이 되는 4개 작업.
> 결정 전제: 표현 카드는 bookmarks 통합, Review 채점은 메신저 완결
> (`2026-07-10-kick-features-ux-flows.md` §6).

---

## 범위

| # | 작업 | 산출물 |
| :---- | :---- | :---- |
| 1 | 스키마 마이그레이션 007 | bookmarks 확장 + user_settings + captures + videos 언어 컬럼 |
| 2 | 채널 어댑터 + Review 봇 v0 (Slack) | webhook route + cron route + 선별 로직 |
| 3 | ASR provider 라우팅 | Scribe/Groq 인터페이스 + stage 2 리팩터 |
| 4 | 다국어 스파이크 (ES 1개) | per-video 언어 쌍으로 파이프라인 end-to-end 1회 |

작업 간 의존: 2는 1에, 4는 1·3에 의존. 3은 독립.

---

## 1. 마이그레이션 007 (`007_v2_foundation.sql`)

기존 워크플로우 유지: SQL Editor에 수동 실행. **주의: 새 테이블 생성 시 Supabase가
RLS를 자동으로 켜므로, 002 패턴대로 마이그레이션 끝에 RLS off를 재강제할 것.**

```sql
-- (a) bookmarks: 클립 밖 표현 카드 허용 (결정 ①)
alter table bookmarks alter column segment_id drop not null;
alter table bookmarks add column source text not null default 'clip'
  check (source in ('clip','profile','island'));
alter table bookmarks add column expression_text text;      -- source != 'clip'일 때 본문
alter table bookmarks add column expression_translation text;
-- 무결성: clip 카드는 segment 필수, 비-clip 카드는 텍스트 필수
alter table bookmarks add constraint bookmarks_source_shape check (
  (source = 'clip' and segment_id is not null)
  or (source <> 'clip' and expression_text is not null)
);

-- (b) user_settings: 지금은 1행(싱글유저), Phase 1 인증 도입 시 user_id 붙임
create table user_settings (
  id uuid primary key default gen_random_uuid(),
  review_channel text not null default 'slack',   -- 'slack' | 'telegram' | 'none'
  review_time text not null default '09:00',      -- HH:MM, 유저 로컬 기준
  timezone text not null default 'Asia/Seoul',
  review_frequency text not null default 'daily', -- 'daily' | 'every2d' | 'weekly2'
  channel_user_ref text,                          -- Slack user id / Telegram chat id
  updated_at timestamptz not null default now()
);

-- (c) captures: island/miss 인바운드 원본 (킥 기능 2·3의 수집함)
create table captures (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('island','miss')),
  raw_text text not null,
  topic_guess text,                               -- router가 붙이는 주제 라벨
  island_id uuid,                                 -- 묶이면 채움 (islands 테이블은 Phase 2)
  processed boolean not null default false,
  created_at timestamptz not null default now()
);

-- (d) videos: 언어 쌍을 per-video로 (다국어 스파이크의 전제)
alter table videos add column source_lang text not null default 'eng';
alter table videos add column target_lang text not null default 'kor';
```

기존 행 backfill: bookmarks는 default 'clip'으로 자동 커버, videos는 default로 커버.

## 2. 채널 어댑터 + Review 봇 v0

### 인터페이스 (`web/src/lib/bot/channel.ts`)

```ts
export interface ChannelAdapter {
  sendReviewBatch(userRef: string, cards: ReviewCard[]): Promise<void>; // 버튼 포함 1메시지
  parseInbound(req: Request): Promise<InboundEvent>;  // 채널별 payload 정규화
  verifySignature(req: Request): Promise<boolean>;    // Slack signing secret 등
}
// InboundEvent = { kind: 'verdict', bookmarkId, verdict } | { kind: 'text', text } | ...
```

v0는 `SlackAdapter`만 구현. Telegram 이전 시 이 인터페이스만 다시 구현 (Phase 2).

### 라우트

- `POST /api/bot/[channel]/webhook` — 인바운드 전부 (버튼 callback + 텍스트).
  Slack은 3초 내 200 응답 필수 → 즉시 200 반환 후 처리하는 패턴으로.
- `GET /api/cron/review` — Vercel Cron 트리거. `vercel.json`에 스케줄 등록,
  `CRON_SECRET` 헤더 검증. **플랜은 Hobby로 확정 (2026-07-10):** cron은 하루 1회만
  허용(더 잦은 표현식은 배포 실패), 실행 시각은 지정한 시간대(hour) 내 임의 —
  `0 8 * * *`이면 8:00~8:59 사이 아무 때. v0(일 1회 리뷰)에는 충분.
  분 단위 정확도가 필요해지면(유저별 발송 시각, Phase 2) **Supabase pg_cron + pg_net**으로
  이 라우트를 POST하는 폴백 사용 — 기존 스택, 비용 0.

### 선별 로직 (`web/src/lib/bot/select-due.ts` — pure function + vitest)

```ts
// due 카드 → 오늘 보낼 최대 5개
// 정렬: (1) overdue 일수 내림차순 (2) lapses 내림차순 (3) 오래된 북마크 우선
// srs.ts처럼 I/O 없는 순수 함수로 두고 단위 테스트
```

### 채점 플로우 (기존 API 재사용, 결정 ②)

버튼 callback → webhook이 verdict 파싱 → 기존 `/api/bookmarks/[id]/verdict` 로직 호출
(route를 직접 fetch하지 말고 내부 함수로 추출해서 공유) → SM-2 재계산 → 메시지 갱신
(채점된 카드는 ✓ 표시, 다음 카드 노출).

### Inbound router v0

버튼 callback은 라우터 불필요(구조화된 payload). **자유 텍스트만 LLM 1콜**
(gpt-4o-mini)로 `island | miss | command` 분류 → captures에 저장 + 짧은 확인 답장.
miss는 즉석 표현 2~3개 답장까지 (프롬프트 1개 추가).

## 3. ASR provider 라우팅

### 인터페이스 (`web/src/lib/asr/provider.ts`)

```ts
export interface AsrProvider {
  name: 'scribe' | 'groq';
  transcribe(signedAudioUrl: string, lang: string): Promise<RawTranscript>; // 기존 shape 유지
}
```

- `ScribeProvider`: 현행 `stage_2_transcribe.ts`의 호출부를 그대로 이동.
- `GroqWhisperProvider`: whisper-large-v3, `verbose_json` +
  `timestamp_granularities: ["word"]`. 출력 단어 배열을 기존 `RawTranscript` shape로 변환.
- 라우팅 규칙 (`pickAsrProvider(sourceLang, tier)`): `zh/ja → scribe`, 그 외 `groq`.
  tier(무료/유료)는 Phase 1에서 추가 — 지금은 언어만.
- stage 2는 provider를 주입받아 호출만: 단어→세그먼트 그루핑 규칙(문장부호/1s 갭/30s)은
  provider 뒤에서 공통 재사용.
- **비용 기록:** usage_events(006)에 provider명·오디오 길이·단가 기록 — 이미 있는
  트래킹에 필드만 맞춤.
- **Groq 검증 항목:** 단어 타임스탬프 드리프트(±100–300ms 알려짐)가 FocusLine
  하이라이팅에서 체감되는지, 무음 구간 환각(VAD 필요 여부). 같은 클립을 Scribe/Groq
  양쪽으로 돌려 비교 1회.

env 추가: `GROQ_API_KEY`.

## 4. 다국어 스파이크 (ES 1개)

목표: "언어 쌍이 per-video로 흐르는가"를 최소 비용으로 검증. UI 다국어화는 범위 아님.

1. `languages.ts`의 고정 상수 → `videos.source_lang/target_lang` 읽어 파이프라인에 전달
   (upload 시 선택 UI는 임시 드롭다운이면 충분).
2. stage 4 프로필/번역 프롬프트의 타깃 언어를 파라미터로 (현재 Korean 하드코딩 확인).
3. ES 클립 1개 end-to-end: 전사 품질(Groq), 번역 품질, FocusLine 렌더 확인.
4. 폰트: 라틴계는 현행 폰트로 충분, ZH/JA 추가 시 `layout.tsx` 폰트 교체 필요
   (CLAUDE.md 기존 노트) — 이번 스파이크 범위 밖, 기록만.

## 순서 제안 & 완료 기준

| 주차 | 작업 | 완료 기준 |
| :---- | :---- | :---- |
| 1 | 마이그레이션 007 + 선별 로직(테스트 포함) | `npm test` 통과, SQL 적용 |
| 1–2 | Slack 봇: cron → 발송 → 버튼 채점 | 아침에 실제로 받고 메신저에서 채점 완료 |
| 2 | ASR 라우팅 + Scribe/Groq 비교 1회 | 비교 메모 남김 (품질 verdict) |
| 3 | 인바운드 router + captures 저장 | 봇에 보낸 생각이 captures에 쌓임 |
| 3 | ES 스파이크 | ES 클립 1개가 라이브러리에서 정상 재생 |

## 리스크 / 확인 필요

- **Vercel Hobby (확정)**: cron 하루 1회 + 시간대 내 임의 실행 — v0에 충분, 폴백은
  pg_cron(§2). 별개로 기존 알려진 제약: 파이프라인 run 라우트의 maxDuration=300은
  Hobby에서 60s로 캡되므로 긴 영상은 스테이지 중단 → retry 의존이 계속됨. Groq 전환은
  transcribe 스테이지를 빠르게 해 이 압박을 오히려 줄여줌.
- Groq 단어 타임스탬프 품질이 FocusLine 기준 미달이면 → 무료 티어도 Scribe 유지
  (비용상 여전히 예산 내, 리서치 문서 §2).
- bookmarks 확장 후 기존 Practice/Bookmarks 화면이 비-clip 카드를 만나면 깨질 수 있음
  → v0에서는 화면 쿼리에 `source = 'clip'` 필터를 명시적으로 추가해 기존 동작 보존,
  비-clip 카드 UI는 Phase 2에서.
