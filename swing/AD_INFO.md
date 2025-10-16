# 광고 보상 처리 개요

이 문서는 WebSwing의 보상형 광고 흐름과 완료 콜백 처리 방식을 정리합니다. 코드 기준은 현재 리포지토리의 `src/core/runtime/game.logic.js`, `src/core/entities/classes.js`, `src/core/runtime/game.shop.js`, `src/core/shared/utils.js`입니다.

## 1. 광고 항목 정의
- `AD_REWARD_ITEMS`(`src/core/runtime/game.logic.js:74`)
  - `wizard`: 캐릭터 해제형 보상.
  - `cash20`: 통화 20달러 즉시 지급형 보상.
- Toss 광고 상점은 기본 상품 목록(`TOSS_AD_REWARD_BASE`, `src/core/runtime/game.logic.js:324`)에 더해 `startSkill` 카드(`src/core/runtime/game.logic.js:336`)를 포함한다. `startSkill`은 Toss 보상형 광고를 총 5회 이상 완료해야 버튼이 활성화된다.
- `DAILY_AD_REWARD_KEYS`(`src/core/shared/utils.js:13`)에도 동일 키(`wizard`, `cash20`)가 등록되어 있으며, `wizard`는 하루 1회, `cash20`은 30분 쿨다운으로 각각 사용 제한을 추적합니다.
- Toss 광고 상점에서 보상을 완주한 횟수는 `webswing_toss_rewarded_count_v1`(`getTossAdRewardCount`)에 누적 저장되며, `startSkill` 등 차후 전용 상품의 잠금 해제 조건으로 활용됩니다.

## 2. UI → 광고 호출 흐름
1. 상점에서 광고 카드 클릭 시 `ShopCard.onClick()`(`src/core/entities/classes.js:533`)가 실행됩니다.
2. 카드 타입이 `ad`일 때 `startRewardAd(key)`를 호출합니다.
3. `startRewardAd`(`src/core/runtime/game.logic.js:193`)는 다음 검사를 수행합니다.
   - 네이티브 환경 여부(`IS_NATIVE_APP`).
   - 이미 보상 받은 날인지(`isDailyRewardClaimed`).
   - 위자드 광고일 때 이미 캐릭터를 보유했는지.
   - 광고 모듈(`PlayGate.showRewardedAd`) 준비 여부.
4. 모든 조건이 통과되면 상태를 `loading`으로 바꾸고 `showRewardedAd({})`를 호출합니다.

## 3. 광고 완료/취소 처리
- 광고 완료 콜백은 `showRewardedAd`의 `Promise` `then` 블록(`src/core/runtime/game.logic.js:246`)에서 처리합니다.
- 결과 객체의 `res.rewarded`가 참일 때만 다음을 실행합니다.
  1. `applyAdReward(item)` 호출 → 실제 보상 지급(`wizard` 캐릭터 해제 또는 `cash20`만큼 소지금 증가).
  2. `markDailyRewardClaimed(key)` → 일일 보상 사용 기록 저장(`src/core/shared/utils.js:170`).
  3. 상태/메시지를 완료(`state.status = 'done'`, `state.message` 설정).
- `res.rewarded`가 거짓인 경우(광고를 중간에 닫거나 실패)에는
  - 보상 지급 로직이 실행되지 않고,
  - `adsShop.failShort` 토스트 메시지를 2초간 노출하며 상태를 초기화합니다.
- 광고 자체가 실패하거나 예외가 발생해도 동일하게 `adsShop.failShort` 토스트로 안내하고 보상 로직은 호출되지 않습니다.
- 보상형 광고는 `window.WEBSWING_AD_UNITS`(또는 플랫폼별 `WEBSWING_AD_UNITS_BY_PLATFORM`)에 지정된 광고 단위를 사용합니다. 키 값은 `wizard` / `cash20`와 동일합니다. 지정하지 않으면 Android는 Manifest `admob_rewarded_unit_id` 메타데이터를 사용합니다.

## 4. UI 피드백
- `renderAdShop`(`src/core/runtime/game.shop.js:520`)에서 상태별 메시지를 노출합니다.
  - `loading`: “불러오는 중…”
  - `done` + Wizard: “위자드가 해제되었습니다!”
  - `done` + Cash: “${amount}$ 추가”
  - `error`: “광고를 끝까지 시청하세요” 또는 “광고 재생 실패”
  - 이미 보유/하루 보상 사용 시 안내 문구 표시.
- 액션 버튼은 `alreadyOwned`, `claimedToday`, `status === 'loading'`이면 비활성화되어 재호출을 막습니다.

## 5. 추가 참고 (생명 광고)
- 생명 회복 광고(`triggerLifeAd` 등)도 동일하게 `showLifeAd` 결과의 `res.rewarded` 여부에 따라 +15 또는 +2 생명을 지급하고, 실패 시 메시지만 갱신합니다.

## 6. 정리
- 광고 보상은 **콜백에서 `res.rewarded`가 참일 때만** 지급됩니다.
- 중간 취소, 닫기, 실패 상황에서는 보상 함수(`applyAdReward`/`markDailyRewardClaimed`)가 호출되지 않으므로 리워드가 지급되지 않습니다.
- 일일/쿨다운 보상 추적(`DAILY_AD_REWARD_KEYS`)과 상태 메시지 표기를 통해 사용자에게 현재 상태를 명확히 안내합니다.
