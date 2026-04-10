@AGENTS.md

# Shadowing Plus

영어 쉐도잉 학습 웹앱. 영상에서 추출한 오디오와 AI 자막으로 문장 단위 학습을 제공한다.

## 프로젝트 구조

```
shadowing_plus/
├── sp                      # ./sp <video> --title "..." 로 process.py 실행
├── media/                  # 영상 소스 (.gitignore로 영상 파일 무시)
├── model/                  # Vibe 앱 모델 폴더 (ggml*.bin, .gitignore로 무시)
├── scripts/
│   ├── process.py          # FFmpeg → Vibe → GPT-4o-mini → Supabase 파이프라인
│   ├── requirements.txt    # openai, supabase, python-dotenv
│   └── .env                # OPENAI_API_KEY, SUPABASE_URL, SUPABASE_SERVICE_KEY, VIBE_API_PORT
├── web/                    # Next.js 16 앱 (App Router)
│   ├── src/app/            # 페이지: /, /player/[videoId], /bookmarks, /api/video/[videoId]
│   ├── src/components/     # AudioPlayer, SubtitlePanel, FocusPanel, BookmarkButton
│   ├── src/lib/            # supabase.ts (클라이언트), types.ts (Video, Segment, Bookmark)
│   └── .env.local          # NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_KEY
└── supabase/migrations/    # 001_initial.sql, 002_add_video_path.sql
```

## 기술 스택

- **프론트엔드**: Next.js 16.2.2, React 19, Tailwind CSS 4, TypeScript 5
- **DB/Storage**: Supabase (PostgreSQL + Storage)
- **처리**: Python 3, FFmpeg, Vibe (whisper.cpp), GPT-4o-mini
- **배포**: Vercel (웹), 로컬 (처리 스크립트)
- **경로 별칭**: `@/*` → `./src/*`

## Next.js 16 주의사항

`params`, `searchParams`는 **Promise**. 반드시 `await` 필요:
```tsx
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
}
```
클라이언트 컴포넌트에서는 `use(params)` 사용.

## DB 스키마

- **videos**: id, title, duration, audio_url, local_video_path, created_at
- **segments**: id, video_id(FK), index, start_time, end_time, text, translation, words(JSONB), created_at
- **bookmarks**: id, segment_id(FK), memo, created_at
- segments, bookmarks 모두 ON DELETE CASCADE

words JSONB: `[{word, meaning, start?, end?}]`

## 영상 처리 (process.py)

```bash
# 실행 전: Vibe 앱에서 Start Server 클릭 (포트 확인)
./sp media/video.mp4 --title "제목" --vibe-port <PORT>

# GPT 호출 없이 트랜스크립션+후처리 결과만 확인
./sp media/video.mp4 --title "제목" --vibe-port <PORT> --dry-run
```

**중요: Vibe 서버는 수동으로 시작해야 하며, 포트가 매번 바뀐다.**
Vibe 앱 > Start Server 클릭 후 표시되는 포트를 `--vibe-port`로 전달.
포트를 생략하면 `.env`의 VIBE_API_PORT 값 사용 (기본 65224).
모델은 `model/` 폴더의 `ggml*.bin` 파일을 자동 탐색. `POST /v1/models/load`로 자동 로드.

처리 흐름:
1. FFmpeg: 영상 → mp3
2. Vibe API: 모델 자동 로드 + 트랜스크립션
3. 후처리: 연속 중복 병합 → 빈 세그먼트 제거 → 비정상 길이 보정 → 타이밍 붕괴 감지/보정 → 비영어 환각 제거 → index 재번호
4. GPT-4o-mini: 배치 번역 + 단어 뜻 (5개씩, 위치 기반 매핑)
5. Supabase: 오디오 업로드 + DB 저장 (같은 제목 재처리 시 기존 데이터 삭제 후 새로 삽입)

### 번역 배치 처리 주의사항
- GPT 응답의 index 필드에 의존하지 않음. **배치 내 위치(enumerate)**로 세그먼트 매핑
- GPT가 일부 세그먼트를 누락하면 `[번역 실패]` 플레이스홀더로 채움

## 프론트엔드 개발

```bash
cd web && npm run dev
```

### 플레이어 레이아웃
- **로컬 영상 있을 때** (localhost): 좌우 분할 (왼쪽 비디오 + 오른쪽 자막)
- **영상 없을 때** (Vercel 배포): 세로 (오디오 플레이어 + 자막)
- 영상 유무는 `/api/video/[videoId]`에 HEAD 요청으로 판별
- 비디오 API 라우트는 localhost에서만 동작, Range 헤더 지원

### 키보드 단축키
A=이전, S=반복, D=다음, Space=재생/정지, ←→=3초 이동

### 테마
CSS 변수 기반. Primary: `#e05d38`. 폰트: Inter, Source Serif 4, JetBrains Mono.

## 빌드 & 배포

```bash
cd web && npm run build   # Turbopack 빌드
```

Vercel 배포 시 환경변수 설정:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_KEY` (API 라우트용, 로컬 개발 시만 필요)
