# AI 처리별 비용과 Ask 대화 기록 용량 추정

기준일: 2026-11-02 · 통화: USD · 범위: 이번 TestFlight 후보 코드와 공개 API 요금. 실제 청구액이 아니며 Supabase/Vercel/R2 기본 요금, 세금, 네트워크 비용은 AI 단가에 포함하지 않는다. 서버의 `ASK_MODEL` 비밀값이 기본값과 다르면 Ask 단가도 달라진다.

## 현재 모바일 사용 흐름

| 행동 | 호출 | AI API 비용 추정 |
| --- | --- | ---: |
| 셀프토킹 1회와 사용한 표현 판정 | 기기 내 음성 인식·표현 매칭 | $0 |
| Ask How to say 답변 1회 | `gpt-4.1-mini` | $0.0007–0.0011 |
| Ask Note 답변 1회 | `gpt-4.1-mini` | $0.0009–0.0012 |
| Ask 답의 ‘저장’ 탭에서 핵심 표현 추출 | `gpt-4o-mini` | 추가 $0.0001–0.0003 |
| 최종 표현 저장 | `text-embedding-3-small` + 새 발음이면 `gpt-4o-mini-tts` | 추가 약 $0.0008–0.0020; 음성 캐시 적중 시 거의 $0 |
| 붙여 넣은 글에서 표현 채우기 | `gpt-4o-mini` | $0.0001–0.0003 |
| 보통 크기 사진에서 표현 읽기 | `gpt-4o-mini`, high detail | $0.004–0.006 |

How to say 답변부터 최종 표현 저장까지 약 **$0.0016–0.0034**. 첫 ‘저장’ 탭의 추출 호출은 마지막 편집 화면에서 취소해도 발생한다. 표현 저장은 발음 음성을 미리 생성하므로, 듣기 버튼을 누르지 않아도 첫 생성 비용이 생긴다. 동일한 사용자·표현·목소리 조합은 R2 캐시를 재사용한다.

Ask 추정의 근거는 `docs/journal/quality/2026-10-05-ask-golden-gpt-4.1-mini.md`의 20문항 실행 기록이다. How to say 평균 1,561 입력 / 261 출력 토큰, Note 평균 1,580 입력 / 329 출력 토큰이었다. 캐시 입력 할인 적용 여부에 따라 위 범위가 달라진다. 긴 대화 기록과 Note 참고 자료가 붙으면 더 커질 수 있다. 사진은 OpenAI의 high-detail 타일 규칙으로 보통 4–6타일을 가정했다. 발음은 3–8초짜리 짧은 표현이라는 가정이므로 특히 오차가 크다.

## Ask 대화 기록의 추가 운영 비용

기록은 Supabase **Postgres 데이터베이스**의 `ask_conversations`와 `ask_chat_turns`에 저장한다. Supabase Storage 파일 버킷에 저장하지 않는다. 새 대화를 만들거나 옛 대화를 여는 것 자체는 OpenAI를 호출하지 않는다. 실제 Ask 질문은 기존처럼 질문 1회당 모델 호출 1회다. 오래된 대화의 내용을 이어서 질문하면 최근 최대 40턴을 모델에 보내므로 새 대화보다 입력 토큰 비용이 다소 커질 수 있다.

실제 Ask 평가 답변 JSON은 평균 약 1.0KB(How to say), 1.4KB(Note)였다. 질문, Postgres 행 헤더, 인덱스를 포함해 **질문·답변 한 쌍당 약 1.5–3KB**를 운영 추정치로 둔다. 정확한 행 크기는 배포 후 `pg_total_relation_size`로 확인해야 한다.

| 사용량 가정 | 새 질문·답변 | 데이터베이스 증가 추정 |
| --- | ---: | ---: |
| 가벼운 사용자: 하루 5회 × 30일 | 150쌍 | 약 0.2–0.5MB/월 |
| 헤비 사용자: 현재 제한인 하루 50회 × 30일 | 1,500쌍 | 약 2.3–4.5MB/월 |

인덱스·WAL·일시적 여유 공간까지 보수적으로 보면 헤비 사용자 **월 4–8MB 수준**을 예산에 잡는 편이 안전하다. 12개월 매일 한도까지 사용하고 삭제하지 않으면 약 48–96MB 수준으로 누적될 수 있다. Supabase 공개 요금은 Free 데이터베이스 500MB, Pro 기본 디스크 8GB 포함, 추가 gp3 디스크 $0.125/GB·월이다. 따라서 헤비 사용자 1명의 새 기록만으로 바로 별도 디스크 요금이 발생하지는 않지만, 프로젝트 전체 사용량과 함께 한도를 차지한다. 목록 열기와 대화 읽기는 DB 조회·전송량을 늘린다. 이미지나 녹음 파일은 이 기능에 저장하지 않는다.

용량 포함분을 모두 사용했다고 가정해도 헤비 사용자 1명의 **새 기록 4–8MB에 해당하는 단순 디스크 단가**는 월 약 $0.0005–0.001이다. 이것은 청구 최소 단위나 프로젝트 전체 요금을 예측한 숫자가 아니라 저장량을 가격에 대입한 참고치다. 같은 사용량에서 Ask 답변 자체의 기존 AI 비용은 How to say만 쓰면 월 약 $1.05–1.65, Note만 쓰면 약 $1.35–1.80이다. 매번 How to say 답을 추출하고 새 발음까지 저장한다면 전체 AI 비용은 약 $2.40–5.10/월까지 올라간다. 따라서 기록 기능의 추가 부담은 주로 DB 용량과 조회이고, 실제 질문·추출·음성 생성 빈도가 AI 비용을 결정한다.

## 계측 상태와 주의점

- Ask는 이미 `usage_events`에 실제 입력·출력 토큰과 예상 비용을 기록한다.
- 이번 후보 코드에서 표현 추출과 임베딩도 API가 반환한 토큰 수를 `usage_events`에 기록하도록 준비했다.
- 발음 API는 요청별 토큰 사용량을 반환하지 않으므로 **캐시 미적중 생성만** `phrase_tts_estimate`로 기록한다. 오디오 초와 비용은 150단어/분, 약 $0.015/분으로 계산한 운영 추정치다. OpenAI 청구서가 실측 기준이다.
- 웹 클립 전사는 10분당 Scribe v2 약 $0.0367 또는 Groq Whisper large-v3 약 $0.0185, 번역 별도다. 현재 모바일 Library의 ‘추가’ 선택지는 업로드 처리와 연결되지 않았다. 웹 `usage.ts`의 Scribe 추정 단가 $0.40/시간은 현재 공개 API 단가 $0.22/시간보다 높다.
- OpenAI는 `gpt-4o-mini-tts`를 2027-01-06, `gpt-4o-mini`와 `gpt-4.1-mini`를 2027-01-14 종료 예정으로 공지했다. 모델을 교체할 때 품질과 비용을 다시 측정해야 한다.

## 가격 근거

- OpenAI 모델 가격: https://platform.openai.com/docs/models/gpt-4.1-mini · https://platform.openai.com/docs/models/gpt-4o-mini · https://platform.openai.com/docs/models/text-embedding-3-small · https://platform.openai.com/docs/models/gpt-4o-mini-tts
- OpenAI 이미지 입력 토큰: https://developers.openai.com/api/docs/guides/images-vision?api-mode=chat
- OpenAI 종료 일정: https://developers.openai.com/api/docs/deprecations
- Supabase 청구 및 디스크: https://supabase.com/docs/guides/platform/billing-on-supabase · https://supabase.com/docs/guides/platform/manage-your-usage/disk-size
- ElevenLabs/Groq 전사: https://elevenlabs.io/pricing/api?price.section=speech_to_text · https://console.groq.com/docs/model/whisper-large-v3
