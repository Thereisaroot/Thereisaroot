# Moon (Crash) • WebGL Solo Demo

단일 유저 vs 시스템 구조의 간단한 크래시(문) 게임 데모입니다. WebGL로 배율 곡선을 그리며, 베팅/캐시아웃과 오토 캐시아웃을 지원합니다. 구조를 엔진/렌더러/UI로 분리해 추후 멀티플레이 확장에 대비했습니다.

## 실행 방법
- 별도 빌드 없이 정적 파일로 동작합니다.
- 로컬에서 `index.html`을 브라우저로 열어 테스트하세요. (CORS 이슈가 없다면 파일을 직접 열어도 됩니다.)
- 개발 서버를 원하면 간단한 HTTP 서버를 사용하세요:
  - Python: `python3 -m http.server 8000`
  - Node: `npx http-server -p 8000`

## 구조
- `index.html`: UI 스켈레톤과 캔버스
- `styles.css`: 기본 스타일
- `src/rng.js`: 데모용 시드/PRNG 및 배율 계산
- `src/engine.js`: 라운드/상태/이벤트 관리 (provably fair 교체 지점 표시)
- `src/renderer.js`: WebGL 라인 렌더러
- `src/main.js`: UI 연결 및 게임 루프

## 주의 (Provably Fair)
- 현재는 데모용 간이 해시/PRNG(FNV1a + xorshift32)를 사용합니다.
- 실서비스에서는 HMAC-SHA256(serverSeed, clientSeed:nonce)로 결과를 산출하고, server seed hash 공개 및 사후 검증을 구현하세요.

## 향후 확장 포인트
- 멀티플레이: 엔진 이벤트를 소켓에 브로드캐스트하고, 베팅 큐/동기화 레이어 추가
- 백엔드: 라운드 시드 생성/보관, 트랜잭션/지갑 연동(TRX 등)
- UI: 배당표, 히스토리, 리더보드, 반응형 레이아웃
