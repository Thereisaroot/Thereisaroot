# Toss Platform Support Guide

## 1. 개요
- `IS_TOSS_PLATFORM` 플래그로 Toss 런타임을 감지하며, Toss 전용 AdMob 브리지를 사용할 수 있게 `window.TossAdMobManager`를 확보한다.
- Toss 환경에서는 `IS_NATIVE_APP`을 강제로 비활성화해 Kakao(PlayGate) 경로를 우회하고 Toss AdMob 전용 흐름만 사용한다.
- Toss 환경에서도 네이티브 앱과 동일한 광고 정책(레벨 2 이후 광고 상점 개방, 데모 모드 제외, 일일 기회 30회)을 유지한다.
- Toss용 광고는 `toss/admob-entry.ts`에서 초기화된 매니저(load/show) 이벤트만으로 성공 여부를 판단한다.

## 2. 광고 단위(Default)
| 용도 | 기본 adGroupId | 비고 |
| ---- | --------------- | ---- |
| 전면형(기회 충전) | `ait-ad-test-interstitial-id` | lives zero일 때 사용 |
| 리워드(광고 상점) | `ait-ad-test-rewarded-id` | Wizard / $20 파우치 |

- 브라우저 상에서 `window.WEBSWING_TOSS_AD_UNITS` 또는 `window.WEBSWING_AD_UNITS`로 override 가능.
- 키: `wizard`, `cash20`, `life`, `shared`(fallback).

## 3. Toss 전용 광고 호출 흐름
1. `getTossAdRewardItems` → Toss 상점에서 사용할 상품 목록 반환(각 카드에 `adMode` 포함).
2. `startRewardAd`
   - Toss 환경(`IS_TOSS_PLATFORM && !IS_NATIVE_APP`)이면 `requestTossAd` 호출.
   - Load/Show 이벤트에서만 성공‧실패 판단.
3. `requestTossAd`
   - `loadAppsInTossAdMob` → `showAppsInTossAdMob` 순으로 호출.
   - 이벤트 처리
     - `failedToShow` → 즉시 실패.
     - `userEarnedReward` → 리워드 모드 보상 확정.
     - `dismissed` → interstitial 성공, 또는 리워드 종료.
     - `onError` → 실패 처리.
4. 성공 시 `applyAdReward`/`markDailyRewardClaimed`, 실패 시 UI 메시지 업데이트.

## 4. Toss 광고 상점
- 메뉴명: `토스광고상점` (`common.tossAds`).
- 레벨 2 이상, 데모 모드 아님, Toss 플랫폼 전용으로 노출.
- UI/보상 메시지는 기존 네이티브 광고 상점과 동일.
- `startSkill` 카드가 추가되며, Toss 광고 리워드를 총 5회 완료해야 버튼이 활성화된다. 완료 횟수는 `webswing_toss_rewarded_count_v1`에 누적 저장된다.
- 실패 시에는 카드 메시지 대신 상단에 `adsShop.failShort`(노란색 `광고 실패`) 토스트를 2초간 노출한다.

## 5. 기회(lives) 정책
- Toss 환경에서도 일일 30회 제한, 0회 시 광고 시청 후 전량 충전.
- `triggerLifeAd`
  - Toss 모드 → `requestTossAd(..., mode: 'interstitial')` 호출.
  - 성공 기준: `dismissed` 이벤트.
  - 실패 시 fallback 보정(일부 기회 지급) & 메시지 동일.
- 잔여 기회가 0일 때 게임을 시작하면 광고를 즉시 실행하지 않고 `gameover` 화면으로 전환하여 사용자가 직접 광고를 호출하도록 안내한다.

## 6. 설정 및 확장
- 커스터마이징은 `window.WEBSWING_TOSS_AD_UNITS`로 광고 ID 교체.
- 추가 상품을 넣을 때 `TOSS_AD_REWARD_BASE`에 `adMode`(`'rewarded'` / `'interstitial'`) 지정.
- Toss 전용 메시지는 `adsShop.*`, `common.tossAds` 키로 관리.

## 7. 테스트 체크리스트
- Toss Preview/App에서 `window.IS_TOSS_PLATFORM === true` 확인.
- 광고 상점 버튼 클릭 → 광고 정상 재생 & Wizard/$20 보상 지급.
- `startSkill` 카드 → Toss 광고 리워드 누적 5회 미만일 때 비활성화, 5회 이상 시 광고 재생 및 스킬 해금 여부 확인.
- 광고 실패 시 상단 토스트(`광고 실패`, 2초)가 뜨는지 확인.
- 기회 0 상태 → 광고 시청 후 30회 충전.
- 실패(광고 없음 등) → `adsShop.noFill`/오류 메시지 노출.
- 필요 시 광고 ID override 후 동일 흐름 재검증.
