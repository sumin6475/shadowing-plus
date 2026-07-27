# Shadowing Plus 프로덕트화 — 리서치 & 브레인스토밍 (2026-07-10)

> 4개 영역 딥 리서치(경쟁사 / ASR 비용 / 메신저 채널 / 콘텐츠 정책 리스크) 결과와
> 그에 따른 방향 제안. 타깃 유저: **자기 콘텐츠가 있는 진심인 중급 학습자**, 글로벌
> (최소 EN/ES/FR/ZH/JA). Sumin 본인이 유료로 쓸 첫 유저.

---

## 0. 결정 요약 (TL;DR)

| 질문 | 결정/제안 | 근거 |
| :---- | :---- | :---- |
| 배포 모델 | 데모 모드(사전 처리 클립) + 랜딩 + waitlist 먼저 → freemium | 가장 싼 수요 검증. 포트폴리오 목적 즉시 달성 |
| 무료 티어 설계 | 업로드 **분(minute) 쿼터**제 (예: 월 60분) + SRS 덱 ~50문장 캡 | 비싼 것(ASR)에 쿼터. LingQ식 20단어 캡은 최악 평판 |
| 가격 앵커 | $8–12/mo (~$79/yr) | 경쟁사 클러스터 $12–15/mo 바로 아래 |
| 유료 차별화 | 메신저 리뷰 배달 = **유료 기능** | 경쟁사 전무(화이트 스페이스), 인지 가치 높음 |
| ASR | 하이브리드: Groq whisper-large-v3(무료 티어 EN/ES/FR) + ElevenLabs Scribe(ZH/JA·유료 유저) | 50유저×1hr/월 ≈ $10 미만. 예산 내 |
| 메신저 채널 | v1 개인용 Slack → **Telegram**으로 이전, v2 퍼블릭 = Telegram + PWA push, 일본은 LINE(후순위), WhatsApp은 v3 | Telegram만 무료·무승인·선제 발송 가능 |
| YouTube import | **퍼블릭 빌드에서 제거**, 개인 배포에만 유지 | *Yout v. RIAA* 등 §1201 리스크 + Stripe/Paddle 계정 정지 트리거 + PO-token으로 운영도 취약 |
| Notion | 코어 DB ❌. Language island 스크립트의 **내보내기/동기화 대상** ⭕ | API rate limit·비관계형. "학습 자산이 네 노션에 쌓인다" 스토리로 활용 |
| 결제 전 필수 | DMCA agent 등록($6) + repeat-infringer ToS + "본인 권리 보유 미디어만" 조항 | §512 safe harbor 요건 |

---

## 1. 경쟁 지형 (2026-07 기준)

| 제품 | 가격 | 무료 티어 | 콘텐츠 모델 | SRS | 쉐도잉 |
| :---- | :---- | :---- | :---- | :---- | :---- |
| Language Reactor | ~$5/mo, ~$28/yr | 넉넉 (듀얼 자막·사전) | 확장프로그램 오버레이 (Netflix/YT) | ❌ (Anki export만) | ❌ |
| Migaku | $15/mo, $144/yr, $499 평생 | 10일 트라이얼만 | 확장프로그램 → 원클릭 플래시카드 | ⭕ 내장 | ❌ |
| LingoPie | $12/mo, $67/yr | 카드 등록 필수 트라이얼 | 라이선스 카탈로그 | ⭕ | ⭕ "Say It" 발음 점수 |
| LingQ | $14.99/mo | 20단어 캡 (평판 최악) | 유저 임포트 (텍스트/YT 자막) | ⭕ | ❌ |
| Speechling | $19.99/mo | **forever-free + 월 10회 코치 피드백** | 큐레이션 문장 커리큘럼 | 부분 | ⭕ 코어 루프 (사람 코치) |
| Trancy | $3.49–4.99/mo | 일 40개 비디오 | 확장프로그램 오버레이 | ⭕ | ⭕ 쉐도잉 모드 |
| AI Shadowing (인디, 2026) | **완전 무료** | 전부 | YT 링크 + 로컬 파일 (Whisper) | ❌ | ⭕ 문장 루프 |

**갭 3개 (전부 우리 방향과 일치):**
1. **자기 업로드 + 쉐도잉 + SRS를 한 루프에 가진 제품이 없음.** 각자 2개씩만 가짐.
2. **메신저 기반 리뷰는 완전 화이트 스페이스.** 학술 연구와 취미 봇만 존재.
3. **"내가 L1에서 실제 쓰는 표현부터 배우기"는 아무도 안 함.** 전부 타깃 언어 콘텐츠에서 출발.

**위협:** AI Shadowing이 무료·무가입으로 업로드+쉐도잉을 이미 함. → 쉐도잉 플레이어 자체는 커모디티. **승부처는 리텐션 루프** (업로드 → 쉐도잉 → 북마크 → SM-2 → 메신저 배달)다.

**무료 티어 교훈:** Speechling(영구무료+월 쿼터)과 Trancy(일일 쿼터)를 따라하고, LingQ(기능 불구화)와 LingoPie(카드 필수)는 피할 것.

## 2. ASR 비용 (2026-07 기준, 시간당)

| 제공자 | $/hr | 단어 타임스탬프 | 비고 |
| :---- | :---- | :---- | :---- |
| Cloudflare Workers AI (whisper-v3-turbo) | $0.031 | **미확인** (segments+VTT 문서화; 검증 필요) | 일일 무료 할당 ≈ 3.5hr/일 → 사실상 $0 가능 |
| Groq whisper-large-v3-turbo | $0.04 | ⭕ (OpenAI 호환 API) | turbo는 일부 언어 품질 저하 |
| **Groq whisper-large-v3** | **$0.111** | ⭕ | 추천 기본값. ES/FR 강함, ZH/JA 양호 |
| AssemblyAI Universal | $0.15 | ⭕ (타임스탬프 정확도 우수 주장) | $50 무료 크레딧 (~333hr) |
| **ElevenLabs Scribe (현재)** | **$0.22** | ⭕ 정밀 | STT 리더보드 2위, CJK 최강 |
| Deepgram Nova-3 | $0.29–0.35 | ⭕ | $200 무료 크레딧 |
| OpenAI gpt-4o-transcribe | $0.18–0.36 | **❌ 단어 타임스탬프 미지원** | 탈락 |

**시나리오: 무료 유저 50명 × 월 1시간** → Groq v3 $5.55/월, Scribe $11/월. 어느 쪽이든 예산 내. **Scribe 유지도 합리적** — 전환은 최적화이지 필수가 아님.

**주의:** Whisper 계열 단어 경계는 ±100–300ms 드리프트, ZH/JA는 "단어"가 사실 토큰이라 하이라이팅 입도가 거칠어짐. 무음 구간 환각 → VAD 필터 필요. **제안: 언어 라우팅** — 무료 EN/ES/FR은 Groq v3, ZH/JA와 유료 유저는 Scribe.

## 3. 메신저 채널

| 채널 | 선제 발송 비용 | 승인 마찰 | 비고 |
| :---- | :---- | :---- | :---- |
| **Telegram** | **무료 무제한** (유저 /start 후) | 없음 (@BotFather로 몇 분) | 유일하게 무료+무승인+스케줄 발송. 1B+ MAU, 유럽 27%·LATAM 21% |
| WhatsApp Cloud API | 템플릿당 과금 (US 유틸리티 $0.004, 마케팅 $0.025; 국가별 상이) | 높음 (사업자 인증 2–10일 + 템플릿 사전승인) | 일일 리마인더가 "마케팅" 분류될 위험 → US 기준 유저당 연 ~$9. ES/FR/LATAM 시장 지배적이라 v3에 필요 |
| LINE | 무료 200push/월 (≈ 일일 리마인더 유저 6명), ¥5,000/5,000msgs | 중간 | 일본 필수 채널. 답장(reply)은 무료 |
| PWA Web Push | 무료 | 없음 | iOS 16.4+ 지원하나 **홈 화면 추가 후에만**. 보조 채널로 |
| Slack | 무료 (개인) | 없음 | 프로토타입 전용 |

**로드맵:** v1 개인용은 Slack에서 시작하되 곧 Telegram으로 이전 (프로덕션과 동일 플로우를 $0에 검증) → v2 퍼블릭 베타 = Telegram + PWA push → v3 스케일 = WhatsApp(ES/FR/LATAM) + LINE(일본). **채널 어댑터 인터페이스로 추상화**해서 갈아끼우기 싸게.

## 4. 콘텐츠/저작권 리스크

| 시나리오 | 리스크 | 근거 |
| :---- | :---- | :---- |
| (a) 퍼블릭 유료 제품에 서버사이드 YT import | **High** | YouTube ToS 위반 + DMCA §1201 우회 판례(*Yout v. RIAA*), 호스팅 리퍼들 $83M 배상·폐쇄 이력, Stripe/Paddle 금지 목록, PO-token/데이터센터 IP 차단으로 운영도 취약 |
| (b) 개인 단독 배포에서 YT import | **Low** | 집행은 서비스 대상, 개인 아님. 문제는 봇 차단 등 운영 마찰 |
| (c) 퍼블릭 + 유저 파일 업로드 전용 + DMCA 준수 | **Low–Med** | §512(c) safe harbor 표준 경로. *Sony Betamax*·*Cablevision* 판례가 사적 복사를 보강 |

**비교 툴들의 생존 전략:** Language Reactor/Trancy는 공식 플레이어 위 오버레이(복사본 없음), LingoPie는 라이선스 카탈로그, LingQ는 자막 텍스트만 + embedded 플레이어. **서버에 YT 영상을 저장하는 툴 중 살아남은 것 없음.**

**결정:** 퍼블릭 빌드에서 YT import 제거(feature flag로 개인 배포에만 유지). 퍼블릭 YT UX가 필요해지면 **iframe embed + 자막 싱크** 또는 확장프로그램 방식으로. 결제 켜기 전 DMCA agent 등록($6, 3년 갱신) + repeat-infringer 조항.

---

## 5. 제안 로드맵

**Phase 0 — 지금 (개인용 유지 + 기반 정리)**
- 채널 어댑터 인터페이스 설계 후 Review 에이전트를 Slack으로 프로토타입 (기존 Cloud Scheduler/Cron + serverless 아키텍처 초안 그대로 유효; Vercel Cron으로 시작하면 인프라 추가 없음)
- languages.ts 다국어 확장 스파이크 (ES 1개 언어로 파이프라인 end-to-end 검증)
- ASR 라우팅 레이어 (provider 인터페이스: Scribe | Groq) — 비용 로깅은 이미 있는 usage_events에 연결

**Phase 1 — 퍼블릭 준비 (랜딩 + 데모 + waitlist)**
- 인증 도입 (Supabase Auth) + RLS 재설계 — 퍼블릭의 최대 공사
- 데모 모드: 사전 처리된 언어별 샘플 클립 read-only (API 비용 0)
- 랜딩 페이지: 훅 = "네가 실제 쓰는 말부터, 네 콘텐츠로" (L1-first + own-content 포지셔닝)
- YT import를 feature flag 뒤로 (퍼블릭 off)
- Waitlist 수집 → 전환율이 Phase 2 진행 여부의 데이터

**Phase 2 — 베타 (무료 티어 + 킥 기능)**
- 무료: 월 60분 업로드 + SRS 50문장 / 유료 $8–12: 무제한 + 메신저 리뷰 + 다국어
- Telegram 봇: Review(outbound) + Language island 캡쳐(inbound)를 같은 봇으로
- Quick learning: L1 코퍼스 붙여넣기/연결 → 표현 프로파일 → SRS 시드덱 (언어 중립 설계)
- Language island 스크립트 → TTS → 기존 stage 3–5 재사용해 "내 스크립트가 쉐도잉 클립이 되는" 루프
- Notion 내보내기 (스크립트/표현 프로파일)

## 6. 열린 질문

- 무료 60분/월이 맞는 수치인가? (Sumin 본인 사용 패턴으로 캘리브레이션)
- 데모 모드 샘플 클립의 저작권 — 자체 제작 or CC 라이선스 콘텐츠 필요
- Quick learning의 L1 데이터 프라이버시 스토리 (업로드 vs 온디바이스 vs 붙여넣기만)
- 일본 시장 우선순위 (LINE 비용이 유일하게 구조적으로 비쌈)
- 킥 기능 3개의 상세 UX 플로우 — 다음 브레인스토밍 세션 주제

*리서치 출처는 각 섹션 원본 리포트에 인라인 인용됨 (경쟁사/ASR/채널/정책 4개 서브에이전트 리포트, 2026-07-10).*
