# Daily Briefing

10개국 현지어 매체에서 정치·경제·사회·IT 헤드라인을 검색·요약·번역해 한국어로 보여주는 일일 브리핑 웹앱.

- 미국 · 아랍권 · 중국 · 일본 · 프랑스 · 독일 · 영국 · 멕시코 · 아르헨티나 · 아프리카
- 모든 검색은 각 매체의 **현지어 원본**에서 수행 (영문 국제판 X)
- 출처 URL 클릭 시 원문으로 바로 이동

## 기술 스택

- Next.js 16 (App Router) + TypeScript + Tailwind CSS 4
- Anthropic SDK · Claude Sonnet 4.6 + `web_search` 도구
- 폰트: Pretendard
- 배포: Vercel

## 로컬 실행

```bash
# 1) 환경 변수 설정
cp .env.local.example .env.local
# .env.local 파일을 열어 ANTHROPIC_API_KEY 채우기

# 2) 의존성 설치
npm install

# 3) 개발 서버 실행
npm run dev
```

`http://localhost:3000` 접속 → 우상단 "오늘의 브리핑 생성" 버튼 클릭.

## 동작 방식

버튼 클릭 시 프론트엔드가 10개국 API 라우트(`/api/briefing/[country]`)를 **병렬 호출**한다. 각 라우트는 Anthropic API의 `web_search` 도구로 해당 국가 현지어 매체 2곳에서 헤드라인을 검색하고, JSON 스키마로 정리된 한국어 브리핑을 반환한다. 결과가 들어오는 대로 카드가 채워지며, 10개국 모두 완료되면 마지막 "오늘의 핵심 관통 주제" 요약이 자동 생성된다.

Vercel 60초 함수 타임아웃을 회피하기 위해 국가별 호출로 분할되어 있다.

## 비용

1회 생성 기준 대략 **USD $0.30~$0.80**. 페이지 진입 시 자동 실행되지 않으므로 버튼을 눌러야만 비용이 발생한다.

## 프로젝트 구조

```
src/
├── app/
│   ├── layout.tsx                 # Pretendard, html lang="ko"
│   ├── page.tsx                   # 메인 페이지, 상태 관리
│   ├── globals.css                # 디자인 토큰 + Tailwind
│   └── api/briefing/
│       ├── [country]/route.ts     # 국가별 브리핑 생성
│       └── summary/route.ts       # 핵심 관통 주제 생성
├── components/
│   ├── Header.tsx
│   ├── CountryCard.tsx
│   ├── CategorySection.tsx
│   └── SummaryCard.tsx
└── lib/
    ├── anthropic.ts               # SDK 클라이언트
    ├── countries.ts               # 10개국 매체·언어·도메인
    ├── prompt.ts                  # 시스템 프롬프트
    ├── parse.ts                   # JSON 응답 파싱·검증
    ├── date.ts                    # 한국시간 날짜 유틸
    └── types.ts
```

## Vercel 배포

1. GitHub 레포 연결 → Import
2. **환경 변수에 `ANTHROPIC_API_KEY` 추가**
3. Deploy

`vercel.json`에 `maxDuration: 60`이 설정되어 있다.
