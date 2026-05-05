# Daily Briefing

10개국 매체에서 정치·경제·사회·IT 헤드라인을 RSS로 가져와 한국어로 분류·요약·번역해 보여주는 일일 브리핑 웹앱.

- 미국 · 아랍권 · 중국 · 일본 · 프랑스 · 독일 · 영국 · 멕시코 · 아르헨티나 · 아프리카
- 각 매체 RSS 직접 페치 → Google Gemini Flash로 분류·번역
- **완전 무료** (Gemini Flash 무료 티어 + RSS는 영구 무료)
- 출처 URL 클릭 시 실제 기사로 바로 이동

## 기술 스택

- Next.js 16 (App Router) + TypeScript + Tailwind CSS 4
- `@google/generative-ai` · Gemini 2.5 Flash
- `fast-xml-parser` (RSS/Atom 파싱)
- 폰트: Pretendard
- 배포: Vercel

## 비용

**0원.** Gemini Flash 무료 티어:
- 분당 10회 (RPM)
- 일당 250회 (RPD)
- 분당 25만 토큰 (TPM)

매일 1회 사용 시 한 달 30회 → 무료 한도 안.

## 로컬 실행

```bash
# 1) 환경 변수 설정
cp .env.local.example .env.local
# .env.local 파일을 열어 GEMINI_API_KEY 채우기
# 발급: https://aistudio.google.com/apikey

# 2) 의존성 설치
npm install

# 3) 개발 서버 실행
npm run dev
```

`http://localhost:3000` 접속 → "오늘의 브리핑 생성" 버튼 클릭.

## 동작 방식

1. 버튼 클릭 시 프론트엔드가 10개국을 **3개씩 순차 배치 호출** (Gemini 무료 티어 RPM 회피).
2. 각 라우트(`/api/briefing/[country]`)는:
   - 매체 2곳의 RSS 피드를 병렬 페치 (8초 타임아웃, 부분 실패 허용)
   - 헤드라인을 모아 Gemini Flash에 전달 → 한국어 JSON 브리핑 생성
3. 10개국 완료 후 자동으로 "오늘의 핵심 관통 주제" 요약 생성.

각 국가 호출은 ~5~10초. 전체 ~30초 내 완료.

## 프로젝트 구조

```
src/
├── app/
│   ├── layout.tsx
│   ├── page.tsx                   # 메인 페이지, 상태 관리
│   ├── globals.css                # 디자인 토큰
│   └── api/briefing/
│       ├── [country]/route.ts     # RSS → Gemini → 한국어 브리핑
│       └── summary/route.ts       # 핵심 관통 주제
├── components/
│   ├── Header.tsx
│   ├── CountryCard.tsx
│   ├── CategorySection.tsx
│   └── SummaryCard.tsx
└── lib/
    ├── gemini.ts                  # Google Generative AI 클라이언트
    ├── rss.ts                     # RSS 페치 + 파싱
    ├── countries.ts               # 10개국 + RSS URL
    ├── prompt.ts                  # 시스템·사용자 프롬프트
    ├── parse.ts                   # JSON 응답 파싱·검증
    ├── date.ts                    # 한국시간 유틸
    └── types.ts
```

## Vercel 배포

1. GitHub 레포 연결 → Import
2. **환경 변수에 `GEMINI_API_KEY` 추가** (Production·Preview·Development 모두)
3. Deploy

`maxDuration: 30`이 각 라우트에 설정되어 있다.

## 매체 변경 안내

원래 기획의 일부 매체는 RSS 미제공·페이월·차단 이슈로 다음과 같이 대체:
- 일본: 読売新聞 → **The Japan Times**
- 중국: 人民日报 중문 + 财新网 → **People's Daily 영문판 + South China Morning Post**
- 영국: Financial Times (페이월) → **BBC News**
- 아랍권: Al-Ahram (RSS 차단) → **Arab News**
- 멕시코: El Universal · Reforma (RSS 미제공·페이월) → **La Jornada · Expansión**
