@AGENTS.md

# Shadowing Plus

영어 쉐도잉 학습 웹앱. 사용자가 영상/오디오를 브라우저에서 업로드하면 클라우드 ASR + 번역 파이프라인이 돌고, 문장 단위로 학습한다.

## 프로젝트 구조

```
shadowing_plus/
├── media/                       # 로컬 영상 보관 (선택, .gitignore)
├── supabase/migrations/
│   └── 004_rebuild_schema.sql   # 새 스키마 (SQL Editor에 한 번 적용)
└── web/                         # Next.js 16 앱 (App Router)
    ├── .env.local               # Supabase + OpenAI + ElevenLabs + R2 키
    ├── package.json             # 새 deps: @aws-sdk/client-s3, ffmpeg-static, openai, vitest
    ├── scripts/wipe-supabase.mjs  # 원샷 데이터 와이프 헬퍼
    └── src/
        ├── app/
        │   ├── page.tsx                 # 업로드 dropzone + 작업 큐 + 비디오 목록
        │   ├── player/[videoId]/        # 듀얼 모드 플레이어 (video/audio)
        │   ├── bookmarks/
        │   └── api/
        │       ├── upload/route.ts      # presigned URL 발급 + jobs 행 생성
        │       ├── jobs/route.ts        # GET list
        │       ├── jobs/[id]/route.ts   # GET / DELETE
        │       ├── jobs/[id]/run/route.ts    # 파이프라인 시작
        │       ├── jobs/[id]/retry/route.ts  # stage 별 재시도
        │       └── videos/[id]/route.ts # 비디오 삭제 (R2 + DB cascade)
        ├── components/
        │   ├── UploadDropzone.tsx
        │   ├── JobCard.tsx              # 진행도 + stage chip + retry
        │   ├── AudioPlayer / SubtitlePanel / FocusPanel / WordText / BookmarkButton
        └── lib/
            ├── types.ts                 # DB row + Pipeline 타입 한곳에
            ├── supabase.ts              # 클라이언트 (anon)
            ├── supabase-admin.ts        # 서버 (service key)
            ├── r2.ts                    # S3 호환 R2 클라이언트
            └── pipeline/
                ├── jobs.ts              # jobs 행 상태 헬퍼
                ├── orchestrator.ts      # 5단계 시퀀스 + retry-from-stage
                ├── stage_1_extract.ts   # ffmpeg-static (video → audio.mp3)
                ├── stage_2_transcribe.ts # ElevenLabs Scribe v2
                ├── stage_3_postprocess.ts # 후처리 5개 함수 합성
                ├── stage_4_translate.ts # GPT-4o-mini 배치 번역
                ├── stage_5_persist.ts   # Supabase videos/segments 저장
                └── postprocess/
                    ├── merge_duplicates.ts
                    ├── drop_empty.ts
                    ├── fix_timing.ts
                    ├── regroup_sentences.ts
                    ├── remove_hallucinations.ts
                    └── __tests__/*.test.ts (vitest)
```

## 기술 스택

- **프론트엔드**: Next.js 16.2.2, React 19, Tailwind CSS 4, TypeScript 5
- **DB/realtime**: Supabase Postgres (RLS off, anon key 직접 read/write)
- **미디어 저장소**: Cloudflare R2 (S3 API, 무료 10GB + 무료 egress)
- **처리**: ElevenLabs Scribe v2 (ASR) + GPT-4o-mini (번역), Vercel API Routes에서 실행
- **테스트**: vitest (postprocess 순수 함수 25개 케이스)

## Next.js 16 주의사항

`params`, `searchParams`는 **Promise**. 반드시 `await` 필요. 클라이언트 컴포넌트에서는 `use(params)` 사용.

## DB 스키마 (마이그레이션 004)

- **videos**: id, title, duration, audio_url, video_url(nullable), media_type('video'|'audio'), folder_id(nullable), created_at
- **segments**: id, video_id(FK CASCADE), index, start_time, end_time, text, translation, words(JSONB)
- **bookmarks**: id, segment_id(FK CASCADE), memo, created_at
- **folders**: id, name, position, created_at
- **jobs**: id, video_id(nullable), title, media_type, source_key, status, current_stage, progress, error, created_at, updated_at
- `jobs`는 realtime publication에 추가됨 (홈에서 실시간 진행도 구독)

## 파이프라인 (5 stages, R2의 JSON으로 체크포인트)

| Stage | Input | Output | 동작 |
|---|---|---|---|
| 1 extract | `jobs/{id}/source-*` | `jobs/{id}/audio.mp3` | ffmpeg-static (video만; audio_type=audio이면 no-op) |
| 2 transcribe | audio R2 키 | `jobs/{id}/raw_transcript.json` | ElevenLabs Scribe v2 (`cloud_storage_url`에 R2 presigned URL 넘김), word-level → 문장/갭 청킹 |
| 3 postprocess | raw_transcript.json | `jobs/{id}/segments.json` | merge_duplicates → drop_empty → fix_timing → regroup_sentences → remove_hallucinations |
| 4 translate | segments.json | `jobs/{id}/segments_translated.json` | GPT-4o-mini, 5개 배치, 위치 기반 매핑 |
| 5 persist | segments_translated.json | videos + segments rows | media_type별 audio_url / video_url 결정, ready 마킹 |

각 단계는 독립 재실행 가능. 실패 시 `current_stage` + `error`만 남기고 멈춤. 홈 카드의 retry 버튼이 임의 stage부터 재개.

### Compute 한계
- Vercel Hobby는 60s timeout. 1.5h 영상 처리 시 timeout 가능성.
- 옵션 우선순위: (a) `maxDuration` 늘려 Pro 사용 (b) Supabase Edge Functions (150s) (c) Inngest free tier.
- 코드는 그대로 둔 채 호출자만 바꾸면 됨. 지금은 (a)로 운영.

### 후처리는 순수 함수
`web/src/lib/pipeline/postprocess/*.ts`는 I/O 없음, `Segment[] → Segment[]`. vitest로 단독 테스트 (`npm test`).

## 환경변수 (`web/.env.local`)

```bash
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_KEY=...      # API 라우트 / 서버 사이드 전용
OPENAI_API_KEY=...
ELEVENLABS_API_KEY=...
R2_ACCOUNT_ID=...
R2_ACCESS_KEY_ID=...
R2_SECRET_ACCESS_KEY=...
R2_BUCKET_NAME=shadowing-media
R2_PUBLIC_URL=https://pub-xxxxx.r2.dev
```

## Cloudflare R2 설정 (최초 1회)

1. Cloudflare 대시보드 → R2 → Create bucket (이름 자유, 예: `shadowing-media`)
2. Public access:
   - 버킷 → Settings → "Public URL Access" 켜기, 발급된 `pub-xxxxx.r2.dev` 도메인을 `R2_PUBLIC_URL`에 넣기
3. API 토큰:
   - R2 → Manage R2 API Tokens → Create API token → Permissions: Object Read & Write, Bucket: 위에서 만든 버킷
   - 발급된 Access Key ID / Secret을 env에 넣기. Account ID는 R2 대시보드 우측에 표시됨
4. CORS (브라우저에서 presigned PUT 업로드용):
   - 버킷 → Settings → CORS Policy에 다음 추가:
   ```json
   [{
     "AllowedOrigins": ["http://localhost:3000", "https://your-vercel-domain"],
     "AllowedMethods": ["GET","PUT","HEAD"],
     "AllowedHeaders": ["*"],
     "ExposeHeaders": ["ETag"],
     "MaxAgeSeconds": 3600
   }]
   ```

## Supabase 설정 (최초 1회)

1. `supabase/migrations/004_rebuild_schema.sql` 내용을 Supabase 대시보드 → SQL Editor에 붙여넣고 실행
2. Storage 버킷 `audio`는 더 이상 안 씀 (R2로 이전). 남아 있어도 무해.

## 데이터 와이프 (필요 시)

```bash
cd web && node --env-file=.env.local scripts/wipe-supabase.mjs
```

기존 row + audio storage 객체 삭제. 스키마 변경(DROP/CREATE)은 SQL Editor에서 수동.

## 프론트엔드 개발

```bash
cd web && npm install   # 최초 1회
cd web && npm run dev
cd web && npm test      # 후처리 vitest
cd web && npm run build # Turbopack 빌드
```

## 플레이어 동작

- `media_type='video'` + `video_url`이 있으면 좌우 분할 (영상 + 자막). "Hide video" 토글로 오디오 전용 레이아웃으로 전환 가능.
- `media_type='audio'`이거나 영상이 없으면 자막 + 하단 오디오 플레이어만.
- 키보드: A=이전 / S=반복 / D=다음 / Space=재생-정지 / R=A-B 반복 / ←→=3초.

## 테마

CSS 변수 기반. Primary `#e05d38`. 폰트: Inter, Source Serif 4, JetBrains Mono.

## Vercel 배포 시 환경변수

위 `web/.env.local`의 항목 전부. `R2_PUBLIC_URL`의 도메인이 next/image 등으로 들어가지는 않으므로 `next.config`에 등록 불필요.
