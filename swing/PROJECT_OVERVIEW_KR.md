# WebSwing 프로젝트 개요 (KOR)

HTML5 Canvas 기반의 2D 로프 스윙 러너 게임입니다. 기본 도형 캐릭터 또는 픽셀 캐릭터가 로프 끝을 잡고 나아가며, 점프/캐치 판정, 아이템 상자, 피버(스타) 모드, 상점·경험치·통화 시스템을 포함합니다. 최근 버전에서는 세이브 브리지, 캐릭터 상점, 확장 아이템, 한글 폰트 등이 추가되었습니다.

## 최근 업데이트
- 스테이지 전환 시스템 추가: 10번째와 11번째 로프 사이에서 배경이 짙은 파스텔 팔레트로 단계적으로 교체되며 `STAGE N` 배너가 로프 위치에 맞춰 함께 이동합니다. 초기 스테이지는 기존 색상을 유지합니다.
- Tailor 픽셀 캐릭터 도입: 중간 로프를 50% 확률로 이어 붙이고, 해당 로프를 잡으면 추가로 $1을 획득합니다.
- 다국어(i18n) 모듈 도입: 영어/한국어 리소스를 제공하며, `src/i18n/i18n.js`가 DOM과 HUD를 동적으로 갱신합니다.
- 인트로 `SETTINGS` 메뉴 추가: 언어를 실시간 변경하고 선택값을 `localStorage`(`webswing_lang`)에 저장합니다.

## 실행 및 배포
- **웹**: 브라우저에서 `index.html`을 직접 열면 실행됩니다. 별도의 번들링/서버가 필요 없습니다.
- **모바일 WebView (Capacitor 등)**:
  - `<script src="./save/safeStorage.nomodule.js"></script>` → `<script src="./save/storageBridge.nomodule.js"></script>` 순으로 포함해야 합니다.
  - `window.setupStorageBridge('webswing')` 초기화 후 `src/core/` 하위 런타임 스크립트(최종 `main.js` 포함)를 순차 로드합니다. Preferences/Filesystem과 `localStorage`를 동기화하여 네이티브에서도 동일한 세이브를 사용합니다.
  - 모듈 환경이라면 `save/safeStorage.js`, `save/storageBridge.js`를 `type="module"`로 import 할 수 있습니다.
- **폰트**: `fonts.css`에서 로컬 `Press Start 2P`, `Dalmoori` 폰트를 등록합니다. `assets/fonts/`에 woff2/ttf 파일을 배치하세요.
- **배포 스크립트**: `deploy.sh`는 로컬 전용 쉘 스크립트로, 외부 동기화와 캐시 버스터, git 커밋을 수행합니다 (환경 경로 수정 필요).

## 다국어(i18n) 지원
- `src/i18n/i18n.js`가 `webswing_lang` 키를 통해 현재 언어를 저장/로딩하고, DOM(`data-i18n`)과 HUD 텍스트를 즉시 갱신합니다.
- `src/i18n/i18n.lang.js`에는 영어(en)·한국어(ko) 메시지 테이블이 포함되어 있으며, 필요 시 동일 구조로 새 언어를 추가할 수 있습니다.
- 인트로 화면 하단의 `SETTINGS` 버튼에서 언어를 변경할 수 있고, 화살표/Enter/클릭 모두를 지원합니다.
- 번역 키는 `t('namespace.key', params)`로 접근하며, 상점·가이드·보스 HUD 등 대부분의 문자열이 i18n으로 이관되었습니다.

## 주요 폴더/파일
- `index.html`: Canvas/디버그 패널 DOM, SafeStorage 브리지 삽입, `src/i18n/`, `src/data/`, `src/core/` 모듈을 순서대로 로딩.
- `style.css`: 배경 그라데이션, 캔버스 스타일, 디버그 패널 UI.
- `fonts.css`: 라틴/한글 폰트 페어링 (`GameFont`).
- `src/core/setup/`: 환경 설정과 캔버스 초기화(`config.js`, `init.js`).
- `src/core/shared/`: 공통 유틸리티(`utils.js`).
- `src/core/entities/`: 게임 엔티티/클래스 정의(`classes.js`).
- `src/core/runtime/`: 상태 머신·입력·렌더·상점·루프(`game.*.js`, `main.js`).
- `src/data/`: 아이템/캐릭터 스펙 정의(`items.js`, `chars.js`).
- `src/i18n/`: 로컬 저장 기반 언어 선택기 및 en/ko 문자열 리소스(`i18n.js`, `i18n.lang.js`).
- `save/`: 브라우저·네이티브 공용 세이브 모듈.
  - `safeStorage(.mjs/nomodule)`: Capacitor Preferences + Filesystem 백업 + localStorage 미러.
  - `storageBridge(.mjs/nomodule)`: 기존 `localStorage` API를 패치해 SafeStorage와 양방향 동기화.
- `assets/fonts/`: 내장 폰트 리소스.

## 기술 스택 및 렌더링
- 런타임: 브라우저 (Canvas 2D), 네이티브 WebView 지원.
- 언어: 바닐라 JavaScript (ES2015+), 번들러 없음.
- 저장소: SafeStorage → Capacitor Preferences/Filesystem, fallback `localStorage`.
- 폰트: `Press Start 2P` (라틴), `Dalmoori` (한글), 통합 `GameFont`.
- 디버그: `V` 키로 토글 가능한 튜닝 패널 (슬라이더 값은 SafeStorage/localStorage에 유지).

## 게임 루프와 상태 머신
- 고정 물리 스텝 `dt = 1/120`, 렌더는 `requestAnimationFrame` 기반.
- 상태(`State.current`):
  - `intro`: 타이틀, 가이드, 상점·SETTINGS 버튼 및 언어 변경.
  - `run`: 스윙/점프/아이템/카메라 업데이트.
  - `boss_pending`/`boss`: 보스전 진입 전 세팅과 실전 진행(탄막·슬램·수집 타입).
  - `gameover`: 결과, 레벨업 안내, `ITEMS`/`CHARS`/Fast Mode(레벨 ≥8) 버튼.
  - `shop`: 탭 구조(아이템/캐릭터), 페이지네이션, 도움말 모달.
- Fast Mode: 레벨 8 이상 시 토글 가능. 이동 속도 및 스폰 관련 파라미터를 1.5배로 보정합니다.

## 핵심 플레이 메커닉
- **로프 계획**: 다음 로프는 현재 팁/예상 궤적 기반으로 생성. 짧은/긴 로프 비율, 간격 지터, Fast Mode, 데모 모드(간격 축소) 반영.
- **잡기 판정**: 기본 반경 `CONFIG.catchBase` + 글로우 레벨 보너스 + 일시 버프(`pendingCatchR`).
- **점수/콤보**: 한 점프 동안 소비한 공중 점프 수에 따라 3/2/1점. 점프 미사용 연속 캐치 또는 스타 모드 캐치 시 콤보 텍스트.
- **로프 스냅**: 경험치 10 이상부터 확률적 스냅 이벤트. 상점의 `Shield`가 있다면 1회 방어 예정.
- **플레이어 조작**: 부착 시 입력 → 탈출/점프, 자유 상태에서 남은 공중 점프 소모. `Fly` 구매 시 롱프레스 비행 1회/런, `Web` 구매 시 긴급 로프 1회 사용.
- **카메라**: X축만 추적, 상태별 스무딩. Fast Mode/스타 모드에서 보정.

## 보스전 시스템
- `bossStageTriggers` 설정에 맞춰 특정 스테이지에서 보스 프로그레스가 발동되며, `boss_pending` → `boss` 상태로 진입합니다.
- 타입별 목표
  - **탄막(bullet)**: 제한 시간 동안 탄환 회피, `Shots/Dodged` HUD와 전용 픽셀 보스가 등장.
  - **슬램(slam)**: 주어진 시간 내 지정 횟수만큼 점프/충돌을 성공시켜 누적(`JUMPS`, 잔여 시간 표시).
  - **수집(collect)**: 떨어지는 상자를 요구 수량만큼 회수, 놓치면 `missed` 카운트가 증가합니다.
- 성공 시 추가 점수/캐시를 보상하고, 실패 시 복귀 연출 후 일반 런으로 복귀합니다. 진행 상황은 `t('boss.*')` 키로 HUD에 다국어로 표시됩니다.
- 보스전 중 배경과 로프 스폰 로직이 전용 패턴으로 대체되며, 종료 시 기존 러너 상태(카메라 위치, 로프 버퍼)가 복구됩니다.

## 아이템 상자 & 스타 모드
- EXP ≥ 50 이후 로프 사이에 상자 스폰 확률(`itemSpawnProb`).
- 일반 상자: `extraJump`, `wideCatch`, `bigSize` 중 하나. 일시적 수치 상승.
- 스타 상자: 피버 모드 진입, 기존 로프 초기화, 즉시 웹 로프 부착.
- 스타 모드: 3초 기본 지속 (상점 `Fever+` 레벨당 +2초 예정), 촘촘한 로프 패턴, 캐치당 3점 고정.

## 통화·레벨·데모 흐름
- 경험치 구간: `LEVEL_THRESHOLDS = [10, 50, 100, 200, ..., 1000]` → 최대 13레벨.
- 수익: (점수 − 5)만큼 돈/EXP 획득(최소 0). `Gamble` 활성 시 다음 런 1.5배 후 소모.
- 데모 모드: 첫 실행 시 활성. 일정 금액/EXP/핵심 아이템(Glow, +Jump, Fly) 지급. EXP 110 초과 후 종료.
- Fast Mode 상태, 선택 캐릭터는 세션 간 저장됩니다.

## 상점 시스템
### 구조
- `ITEMS`/`CHARS` 두 모드. 각 모드마다 페이지네이션 및 '?' 도움말 팝업이 존재합니다.
- 상점 카드와 버튼은 공용 `UIButton`/`ShopCard` 객체로 관리됩니다.
- 구매 확인 팝업에서 잔액 표기 및 부족 메시지 표시. 일부 아이템은 단일 구매 후 품절 처리.

### 아이템 라인업 (`SHOP_ITEMS`)
|ID|이름|유형|조건|효과|
|--|--|----|----|----|
|glow|Glow|레벨형(최대 3)|Lv ≥2|캐치 반경 +5%/레벨, 글로우 연출|
|buds|Buds|레벨형(최대=현재 변 수)|Lv ≥2|꼬리 구슬 추가|
|plusjump|+Jump|단일|Lv ≥2|공중 점프 +1|
|fly|Fly|단일|Lv ≥2|롱프레스 비행 1회|
|big|Big|레벨형(상한=플레이어 레벨)|Lv ≥5|크기 +2.5%/레벨|
|gamble|Gamble|단일|Lv ≥1|다음 런 수익 1.5배|
|magnet|Magnet|레벨형(최대 5)|Lv ≥3|아이템 흡입 범위 +30px/레벨, 상자 끌어당김|
|combo|Combo+|레벨형(최대 3)|Lv ≥6|콤보 유지 시 레벨당 +1 점(배수 아님)|
|slow|Slow|레벨형(최대 5)|Lv ≥3|점프 시 레벨당 10% 확률로 슬로모션|
|lucky|Lucky|레벨형(최대 5)|Lv ≥2|상자 스폰 확률 +5%/레벨|
|revival|Revival|단일|Lv ≥10|추락 시 즉시 복구 부활 1회(로봇보다 선행)|
|fever|Fever+|레벨형(최대 3)|Lv ≥5|스타 모드 지속 +1초/레벨|

> **참고**: Magnet 이후 아이템 효과도 게임 내에 반영되어 있습니다.

### 캐릭터 상점
- `PIXEL_CHARACTERS` 목록(기본 폴리곤 포함 6종, 추후 확장 가능).
- 각 캐릭터는 가격·최소 레벨 조건·8x8 픽셀 데이터·색상 팔레트를 가집니다.
- 보유 목록은 `shopInv.characters`에 저장. 구매한 캐릭터는 계정 영구 소유.
- 선택 정보는 `webswing_selected_char_v1`에 저장되며, 런타임에서 애니메이션/특수 연출(예: 닌자 머플러, 위자드 로브 흔들림)이 적용됩니다.
- 캐릭터 전용 '?' 도움말 팝업에서는 각 캐릭터 소개 문구를 페이지 단위로 제공합니다.
- Tailor: 스윙 중간 지점에 50% 확률로 추가 로프를 이어 붙이며, 해당 로프를 잡으면 +$1을 추가로 획득합니다.

## 캐릭터 표현
- **기본 폴리곤**: 레벨1은 원형, 레벨2부터 3레벨마다 변 수 증가(삼각형→사각형→...); 내부 스트라이프 최대 3색.
- **아이템 반영**: `Big` 레벨에 따라 전체 스케일 증가, `Buds`는 변 수까지 꼬리 구슬 배치, `Glow`는 글로우와 캐치 반경 보너스.
- **픽셀 캐릭터**: 3배 스케일 픽셀 렌더 + 스쿼시/스트레치, 블링크, 상황별 픽셀 오프셋.

## 세이브 & 데이터 키
SafeStorage/`localStorage`에 사용되는 주요 키:
- `webswing_tuning_v1`: 디버그 튜닝 슬라이더 값.
- `webswing_savings_v1`: 상점 통화(SAV).
- `webswing_exp_v1`: 누적 EXP.
- `webswing_best_v1`: 최고 점수.
- `webswing_shop_inv_v1`: 상점 인벤토리(아이템 레벨, 구매 여부, 캐릭터 보유).
- `webswing_demo_done_v1`: 데모 모드 종료 플래그.
- `webswing_fastmode_v1`: Fast Mode 토글 상태.
- `webswing_selected_char_v1`: 현재 선택된 캐릭터 ID.

## 디버그/튜닝 패널
- `V` 키로 표시/숨김. 슬라이더 값 수정 시 바로 적용되고 SafeStorage/localStorage에 저장됩니다.
- 주요 파라미터: 점프 힘/속도, 캐치 반경, 로프 길이/간격, 짧은 로프 확률/계수, 아이템/스냅 확률, 버퍼링 간격 등.
- UI 상호작용 시 게임 입력과 분리되도록 이벤트 전파를 차단합니다.

## 향후 개선 아이디어
- 상점 신규 아이템(Magnet 이후)의 실제 게임 플레이 반영 로직 구현.
- 분리된 `src/core/*` 모듈을 ES Module 기반 번들링으로 전환해 의존성 로딩을 자동화.
- 사운드 효과/배경음 추가, 모바일 롱프레스·포커스 케이스 QA.
- 로프 스폰/캐치 수학 검증용 단위 테스트 도입.
- `deploy.sh` 환경 변수화 및 플랫폼별 세이브 초기화/이관 도구.

## 빠른 시작 요약
1. `index.html`을 브라우저에서 열기 → Space/클릭으로 시작.
2. 로프 끝을 잡으며 전진, 점수 5 초과분만큼 SAV/EXP 획득.
3. GAME OVER → `ITEMS` 또는 `CHARS` 상점에서 업그레이드 & 픽셀 캐릭터 구매.
4. 필요 시 인트로 `SETTINGS`에서 언어를 변경하고, SafeStorage 덕분에 웹/네이티브 간 동일 세이브로 이어서 플레이 가능.
