# ver2.0 결정 로그

> ver2.0 plan 폴더 내부용. MEMORY.md에는 반영하지 않음 (Sumin 지시, 2026-07-10).
> 새 결정이 나올 때마다 이 파일에 추가.

| 날짜 | 결정 | 근거 | 상세 문서 |
| :---- | :---- | :---- | :---- |
| 2026-07-10 | 배포 모델: 데모 모드 + 랜딩 + waitlist 먼저, freemium은 waitlist 전환율 보고 | 가장 싼 수요 검증, 포트폴리오 목적 즉시 달성 | research-brainstorm §0 |
| 2026-07-10 | 타깃 유저: 자기 콘텐츠가 있는 진심인 중급 학습자, 글로벌(EN/ES/FR/ZH/JA) | 경쟁 갭과 일치 | research-brainstorm §1 |
| 2026-07-10 | YouTube import는 퍼블릭 빌드에서 제거, 개인 배포에만 feature flag로 유지 | §1201 판례(*Yout*), Stripe/Paddle 정지 리스크, PO-token 운영 취약 | research-brainstorm §4 |
| 2026-07-10 | ASR 라우팅: zh/ja·유료 → ElevenLabs Scribe, 그 외 → Groq whisper-large-v3 | 비용 자릿수 절감, 품질은 언어별 라우팅으로 방어 | research-brainstorm §2, phase0 §3 |
| 2026-07-10 | 메신저: v1 Slack(개인) → v2 Telegram(퍼블릭) + PWA push, 일본 LINE·WhatsApp은 v3 | Telegram만 무료·무승인 선제 발송 | research-brainstorm §3 |
| 2026-07-10 | 표현 카드는 bookmarks 테이블에 통합 (segment_id nullable + source 컬럼) | SRS·verdict·Review 무수정 재사용 | kick-features §6-①, phase0 §1 |
| 2026-07-10 | Review 채점은 메신저 안에서 완결 (버튼 → 기존 verdict 로직) | 복습 완료율 > 앱 DAU. 리텐션이 승부처 | kick-features §6-② |
| 2026-07-10 | Notion은 코어 DB ❌, Language island 산출물의 내보내기 대상 ⭕ | API rate limit·비관계형 | research-brainstorm §0 |
| 2026-07-10 | Vercel Hobby 유지 | cron 하루 1회·시간대 내 임의 실행은 v0에 충분, 폴백 pg_cron | phase0 §2·리스크 |
| 2026-07-10 | 신규 인프라 없이 진행 (Cloud Run/Scheduler 초안 폐기 → Vercel Cron + webhook) | 현 스택 유지가 더 싸고 단순 | kick-features §0 |
| 2026-07-24 | 제품 포지셔닝: 범용 쉐도잉 앱 → 개인 speaking-memory tool; 첫 Island = “Explain what I do” | 사용자의 생각·기존 학습 청크·실제 발화 실패를 하나의 복습 루프로 연결 | `.agents/PRDs/speaking-memory-mvp.md` |
| 2026-07-24 | Telegram은 임시 알림 어댑터, Chrome extension은 owner-only 도구 | 네이티브 모바일/TestFlight의 플랫폼 알림을 장기 경로로 두되, 둘 다 2주 MVP 출시 게이트에서 분리 | `.agents/PRDs/speaking-memory-mvp.md` |
| 2026-07-24 | 공개 YouTube 캡션 ingestion은 VPS/API 프로젝트로도 출시 범위 밖 | 공식 embed와 임의 공개 캡션 수집은 별개; 기존 owner-only gate 유지 | `2026-07-19-youtube-import-personal-use-decision.md` |

| 2026-07-10 | 리네이밍 확정 (Shadowing Plus → 미정), island 비주얼 = 카드 그리드 | 확장성 좁음 / SRS 카드와 디자인 언어 통일 | phase1 §6 |

## 미결 (다음 세션 후보)

- 무료 티어 60분/월 수치 캘리브레이션 (본인 사용 패턴 기준)
- 데모 모드 샘플 클립 소싱 (자체 제작 vs CC 라이선스)
- Island TTS 음성 선택 (ElevenLabs vs OpenAI TTS)
- 캡쳐 음성 입력 허용 시점
- 데모 모드·랜딩 페이지 상세 설계 (Phase 1 문서)
