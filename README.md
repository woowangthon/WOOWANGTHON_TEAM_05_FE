# 온보딩 — 해외 정착 도우미 · Frontend

> 2026-11-13 업데이트: 가상 주거 데이터를 운영사 공개 요금 스냅샷으로 교체했습니다.
> Vercel에서 별도 백엔드 없이 Gemma를 연결하는 최신 절차와 데이터 수집 기준은 [DEPLOYMENT.md](DEPLOYMENT.md)를 참고하세요.
> 아래 초기 MVP 설명의 가상 데이터 안내보다 최신 문서·화면의 항목별 출처와 미확인 표시를 우선합니다.

2026 AI 우왕톤 05팀 **우짤래**. 시드니 취업·인턴·워킹홀리데이 준비를 위한 MVP입니다.

조건 입력 → 주거 최대 3개 비교 → 월/초기 비용 확인 → 공식 자료 체크리스트 → 조건 변경까지 동작합니다. Next.js App Router, React, TypeScript를 사용합니다.

## 빠른 실행 (Gemma 없이 데모)

Node.js 22 이상을 준비하고 이 저장소에서 실행합니다.

```sh
npm ci
npm run dev
```

http://localhost:3000 에서 시작합니다. 기본 상태는 **데모 · Gemma 미연결**입니다. 예시 계획이 처음 표시되며 내 조건을 입력한 뒤 생성할 수 있습니다. 모든 매물·비용·통근시간은 가상 데이터입니다.

데모 명령: `더 저렴하게`, `통근 60분`, `쉐어룸으로`, `스튜디오`, `월 예산 2500`. 자유로운 문장 해석은 별도 Gemma 서비스 연결 후 가능합니다. 처리하지 못한 요청은 오류로 알립니다.

## 전체 서비스 연결

세 저장소를 같은 부모 폴더에 받습니다.

| 저장소 | 역할 |
| --- | --- |
| [FE](https://github.com/woowangthon/WOOWANGTHON_TEAM_05_FE) | 입력·비교·체크리스트, 서버 API 프록시, 독립 데모 |
| [BE](https://github.com/woowangthon/WOOWANGTHON_TEAM_05_BE) | FastAPI, 검증·필터·예산·근거 검색·재계획 |
| [AI](https://github.com/woowangthon/WOOWANGTHON_TEAM_05_AI) | Ollama Gemma 조건 추출·설명 초점 선택 |

BE와 AI의 README대로 서비스를 실행하고 `.env.example`을 `.env.local`로 복사합니다.

```dotenv
API_BASE_URL=http://127.0.0.1:8000
# BE에 키를 설정한 경우에만 동일한 값을 넣습니다.
BACKEND_API_KEY=
```

환경 변수를 변경한 뒤 Next.js를 재시작합니다. 브라우저는 같은 출처의 `/api/plan`만 호출하며 서버 주소와 키는 클라이언트 번들에 포함하지 않습니다. 백엔드를 설정한 상태에서 연결에 실패하면 502를 반환합니다.

## Vercel

연결된 FE 저장소의 `main`을 배포 대상으로 사용합니다. Framework는 Next.js, Root Directory는 저장소 루트, Node.js는 22 이상입니다. `npm run build`를 사용합니다. API_BASE_URL 없이도 데모 배포가 가능합니다.

Gemma 연결 시 Vercel 환경 변수에 외부에서 접근 가능한 HTTPS 백엔드 주소와 BACKEND_API_KEY를 설정합니다. Vercel에서 localhost 주소는 로컬 PC를 가리키지 않습니다. Gemma 모델 자체는 Vercel 함수 안에서 실행하지 않습니다. 모델 요청은 프록시에서 90초 제한이며 배포 플랜의 함수 실행 제한도 확인해야 합니다.

## 데이터·계산 계약

- `data/sydney.json`은 BE `app/data/sydney.json`과 같은 fixture입니다. 수정할 때 두 파일을 함께 갱신하고 버전을 올리세요.
- 주 월세 × 52 ÷ 12로 월 환산합니다. 식비 600, 공과금 140, 통신 50 AUD는 가상 월 비용입니다.
- 월 지출과 초기 비용을 구분합니다. 초기 비용은 보증금 + 선납 월세 + 이사비의 부분 합계로, 두 합계를 서로 더하지 않습니다.
- 누락된 보증금·보험료는 별도 `*_missing`에 기록합니다. 알려진 비용 기준의 예산 잔액이며 실제 지출 가능 여부를 확정하지 않습니다.
- 초기 비용은 항공권·비자 관련 비용·기타 비용이 빠져 있어 항상 부분 합계입니다.
- 자유 주소 검색은 지원하지 않습니다. 회사명과 별도로 Sydney CBD / Surry Hills / Parramatta 중 확인한 근무 지역을 지정합니다.
- 체크 상태는 현재 페이지 메모리에서만 유지됩니다. 계정·서버 저장·자동 신청·예약은 없습니다.

## 검증

```sh
npm test
npm run build
```

FE(3000)와 BE(8000)를 실행한 상태에서 데이터·계산 계약도 검사할 수 있습니다.

```sh
node tests/integration.mjs
```

27가지 조건 조합에서 후보·비용·근거를 비교합니다. 테스트는 실제 Gemma 추론 품질을 검증하지 않습니다.

## 근거와 구현 참고

공식 정보는 `data/sydney.json`에 원문 URL·기관·확인일을 보관합니다. 비자 자격은 판정하지 않습니다.

- [호주 내무부](https://immi.homeaffairs.gov.au/)
- [myGov 세금·연금 안내](https://my.gov.au/en/services/living-arrangements/coming-to-australia/coming-to-australia-to-work/tax-and-superannuation-as-a-visa-holder)
- [NSW 임대차 안내](https://www.nsw.gov.au/housing-and-construction/renting-a-place-to-live)
- [Fair Work 비자 소지자 안내](https://www.fairwork.gov.au/find-help-for/visa-holders-migrants)
- [Transport for NSW Trip Planner](https://transportnsw.info/trip-planner/plan)
- [Next.js 설치·운영 문서](https://nextjs.org/docs/app/getting-started/installation)
