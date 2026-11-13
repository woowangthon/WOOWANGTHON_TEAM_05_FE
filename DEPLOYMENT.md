# Vercel · Gemma 연결

대상: https://woowangthon-team-05-fe.vercel.app/

별도 Python 서버 없이 `/api/plan`의 Node.js 서버 함수에서 Google Gemma를 호출합니다.
계산과 출처는 수집 데이터로 처리하고, 모델은 허용된 조건 변경과 설명 초점만 반환합니다.
국적·회사명·입국일은 모델 호출에서 제외합니다.

Vercel 프로젝트 Settings → Environment Variables의 Production에:

- `GEMINI_API_KEY`: AI 저장소 `.env`의 실제 키. Git이나 클라이언트 변수에 넣지 않습니다.
- `GEMMA_MODEL`: `gemma-4-26b-a4b-it`
- `API_BASE_URL`: 별도 백엔드를 사용하지 않는 경우 삭제하거나 빈 값으로 둡니다. 이 값이 있으면 백엔드가 우선합니다.

설정 후 재배포합니다. `/api/health`에서 `connection: google`과 데이터 버전을 확인하고,
계획 생성 및 자연어 변경 요청에서 `mode: gemma`를 확인합니다. health는 설정만 검사합니다.
Gemma 설명 실패는 경고와 규칙 기반 결과로, 조건 변경 실패는 503으로 표시합니다.
자동 재시도나 유료 모델 전환은 없습니다. 함수 최대 실행 시간은 90초입니다.

## 공개 자료 스냅샷

`data/sydney.json`은 운영사 공개 시작 요금 5건과 대학·교통기관 참고 예산을 담습니다.
CDA 3건은 지역 요금 안내이며 특정 방 공실이 아닙니다. UKO 2건은 특정 호실 광고의 시작 요금입니다.
예약·입주일·계약 금액은 확정하지 않습니다. 통근 미확인 후보도 별도 표시하며 조건 충족을 보장하지 않습니다.
보증금·선납 월세·이사비가 미확인이므로 초기 비용 0을 실제 무료 입주 비용으로 표시하지 않습니다.
공과금 포함 요금에는 공과금을 중복 가산하지 않습니다.

수집 갱신은 형제 BE 저장소에서 실행합니다:

```sh
uv run python scripts/collect_sources.py --sync-frontend
```

필수 출처 수집·파싱 실패 시 기존 데이터를 보존합니다. 429는 재시도하거나 우회하지 않습니다.
원문 전체나 개인 연락처·사진을 저장하지 않고, 최소 가격·조건과 URL·수집일·해시를 기록합니다.
갱신 후 두 저장소 데이터의 동기화 및 계산 계약을 검사하고 재배포해야 반영됩니다.

```sh
npm test
npm run build
```
