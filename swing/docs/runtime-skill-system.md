# 런타임 스킬 카드 시스템 명세 (적 없는 캐주얼 버전)

## 개요
- 게임 시작, 스테이지 보상 구간마다 일시정지 후 3장의 스킬 카드를 제시
- 플레이어는 1장을 선택하여 해당 런 동안 빌드업
- 기본 스킬은 `Lv1`로 시작하여 최대 `Lv3`까지 성장하며, **히든 스킬**은 획득 시점부터 `Lv1`이자 단일 레벨로 작동합니다.
- 특정 일반 스킬 2종을 모두 Lv3으로 만들면 **히든 스킬**이 해금되어 다음 카드 풀에 포함
- 스킬 팝업은 캔버스 위에 오버레이로 노출, 선택 전까지 게임 로직 정지
- 원버튼 조작 유지: 선택은 클릭/터치/키 입력(Left/Right/Space)으로 처리

### 카드 제시 타이밍
1. **게임 시작 직후**: 첫 빌드 선택
2. **스테이지 게이트 보상 타이밍**: 스테이지 전환시 (예: 10/20/30번째 로프 구간 등)
3. **특수 이벤트**: 히든 스킬 해금 직후 추가 제시(Optional)

## 스킬 구조

### 공통 속성
- `id`: 고유 문자열
- `type`: `basic` | `hidden`
- `maxLevel`: 3 (기본 스킬), 1 (히든 스킬)
- `rarity`: `common` | `rare` | `epic` (카드 등장 확률 가중치)
- `effect(level)`: 각 레벨별 효과 설명
- `tags`: 빌드 템포를 구분하기 위한 태그 (예: `power`, `air`, `flight`, `defense`, `control`, `economy`)
- `unlockCondition`: 히든 스킬일 경우 필요 조합식

### 기본 스킬 목록 (예시 11종)

| ID | 이름 | 태그 | 설명(Lv1→Lv3) |
|----|------|------|----------------|
| `power_boost` | 차지 임팩트 | power | 로프에서 점프할 때마다 추진력이 레벨당 +30% 강화되어 Lv1/2/3에서 +30%/+60%/+90% 적용 |
| `rope_glide` | 로프 글라이드 | flight | 로프 히트박스 +5/+10/+20px |
| `air_combo` | 에어 콤보 | air | 원래는 1번 점프로 로프를 잡아야만 콤보가 올라가지만, 이 스킬을 통해 **추가점프로 로프를 잡아도 콤보가 증가**. **Lv1:** 20% 확률로 무조건 콤보 +1. **Lv2:** 확률 40%. **Lv3:** 확률 60% + 추가점프로 잡을 때 캐시 +1 |
| `drone_support` | 서포트 드론 | control | 드론이 자유롭게 이동하며 위급한 상황에서 로프를 대신 잡아 준다. 캐릭터가 부딪히면 해당 위치에서 잠시 로프를 제공한다. **Lv1:** 작은 히트박스. **Lv2:** 구조 드론 히트박스 확대. **Lv3:** 드론 2마리 등장 + 큰 히트박스 |
| `cash_magnet` | 캐시 마그넷 | economy | 아이템 흡입 반경 +15/+30/+50px, Lv3에서 상자 획득 캐시 +1 |
| `stage_focus` | 스테이지 포커스 | control | 스테이지 전환 필요 로프 개수 1/2/3 감소 |
| `fever_extension` | 피버 익스텐션 | fever | 피버 지속 +20%/+35%/+50% |
| `rope_shortener` | 로프 쇼트너 | control | 로프 간격 5%/10%/15% 감소 |
| `sky_harvest` | 스카이 하베스트 | air/economy | 공중에서 아이템 잡을 시 추가 캐시 +1/+2/+3, Lv3에서 EXP도 +1 |

### 히든 스킬 목록 (예시 5종)

| ID | 이름 | 조합식(둘 다 Lv3) | 효과 |
|----|------|------------------|------|
| `void_magnet` | 보이드 마그넷 | `cash_magnet` + `sky_harvest` | 3초마다 블랙홀 생성, 주변 아이템을 끌어당겨 캐시 변환 |
| `spider_guard` | 스파이더 가드 | `drone_support` + `rope_glide` | 거미 드론이 지면을 순찰하며 현재 위치부터 최대 100px 위까지 랜덤 높이로 거미줄 트램폴린을 생성. 캐릭터가 닿으면 기존 대비 50% 더 높은 점프로 크게 튀어 오른다 |
| `frenzy_feather` | 프렌지 페더 | `fever_extension` + `sky_harvest` | 피버 중, 0.2초마다 캐시 +1(획득 시 캐릭터 위에 `+$1` 표기), 피버 중 콤보 보너스 * 5 (경험치, 돈 모두, 버는 돈 캐릭터 위에 표시) |
| `combo_master` | 콤보 마스터 | `air_combo` + `rope_glide` | 로프를 어떤 방식으로든 잡을 때마다 **100% 확률로 콤보 +1**이며, 추가로 콤보마다 캐시 +1 |
| `drone_collector` | 드론 콜렉터 | `drone_support` + `cash_magnet` | 서포트 드론이 주변 아이템을 흡수하며, 아이템을 모을 때마다 추가로 $1을 지급한다. |

## 카드 팝업 UI 흐름

### 아이콘 자산
- `assets/skills/` 디렉터리에 스킬 ID와 동일한 파일명이 존재하며, `skillId.png` 단일 버전으로 관리한다.
- 초기 단계에서는 모든 스킬이 `power_boost` 아이콘을 공유하도록 복사해 두었고, 실제 아트가 완성되면 동일 파일명으로 교체하면 된다.
- 페이지 최초 로딩 시 모든 스킬 아이콘을 프리로드해 두고, 이후 런타임에서는 캐시된 이미지를 그대로 사용한다.

### UI 레이아웃 및 표시
- 카드 팝업은 화면 좌우 여백만 남기고 꽉 차게 배치되며, 카드들은 세로로 한 장씩 정렬되어 각각의 영역을 넘치지 않도록 한다.
- 각 카드는 좌측 아이콘, 우측 텍스트 패널(이름·현재 레벨·다음 레벨 효과 설명)으로 구성되며, 설명은 자동 줄바꿈으로 카드 영역 안에 맞춰 표시된다.

1. **트리거**: `showSkillCardPopup(context)` 호출 (context: `start`, `stage_reward`, `hidden_unlock` 등)
2. **카드 풀 선정**:
   - 기본 스킬 중 아직 Max Lv3 미만인 스킬 위주로 샘플링
   - 히든 스킬 조건 달성 시 `hidden` 풀에 추가
   - 확률 가중치: `common` 60%, `rare` 30%, `epic` 10% (Unlocked 상태 기준)
3. **카드 롤링 연출**: 약 2초간 여러 스킬 아이콘이 빠르게 롤링되는 애니메이션을 표시하여 기대감을 유발합니다.
4. **랜덤 3장 노출**: 롤링이 멈춘 후, 선정된 3장의 카드를 화면에 표시합니다. 카드 이름과 현재 레벨만 카드 셀에 표시하고, 팝업은 현재 후보만 설명한다.
5. **입력 처리**: 좌/우로 카드 이동, Space/클릭으로 선택. 10초 내 선택하지 않으면 자동으로 무작위 카드가 선택되며, 타이머 UI는 컨테이너 상단에 표시한다.
6. **선택 결과 표기**: 화면 우하단에 현재 활성 스킬들의 레벨 HUD를 갱신하고, 선택 또는 랜덤 결과를 즉시 반영한다.
7. **게임 재개**: 모듈 상태 업데이트 후 기존 런 상태로 복귀

## 상태 추적 구조 (새 모듈 제안)
```js
// runtime/skills.system.js (신규 파일 계획)
const SkillState = {
  activeSkills: new Map(), // skillId -> { level, type, tags }
  unlockedHidden: new Set(),
  pendingHidden: new Set(),
  selectionsThisRun: 0,
};

function addSkill(skillId) {
  const current = SkillState.activeSkills.get(skillId) || { level: 0 };
  if (current.level >= 3) return;
  current.level += 1;
  SkillState.activeSkills.set(skillId, current);
  evaluateHiddenUnlocks();
}

function evaluateHiddenUnlocks() {
  for (const hidden of HIDDEN_SKILL_LIST) {
    if (SkillState.unlockedHidden.has(hidden.id)) continue;
    const reqA = SkillState.activeSkills.get(hidden.requires[0]);
    const reqB = SkillState.activeSkills.get(hidden.requires[1]);
    if (reqA?.level === 3 && reqB?.level === 3) {
      SkillState.pendingHidden.add(hidden.id);
    }
  }
}
```

## 개발 TODO 요약
- [x] `skills.data.js` 신규 작성 (스킬 정의, 조합식)
- [x] `skills.system.js` 런타임 상태 관리/적용 로직
- [x] 카드 팝업 UI (`skills.popup.js` 또는 기존 HUD에 통합)
- [x] 이벤트 연결: 런 시작, 스테이지 보상, 히든 해금 시 트리거
- [ ] 스킬 효과 반영: 기존 시스템(점프/로프/아이템 등)과 연동
  - [x] `power_boost`
  - [x] `stage_focus`
  - [x] `rope_glide`
  - [x] `air_combo`
  - [x] `drone_support`
  - [x] `cash_magnet`
  - [x] `fever_extension`
  - [x] `rope_shortener`
  - [x] `sky_harvest`
  - [x] `void_magnet`
  - [x] `spider_guard`
  - [x] `frenzy_feather`
  - [x] `combo_master`
  - [x] `drone_collector`
- [ ] 기록 메뉴에 히든 스킬 항목 추가: 최초엔 모두 `???` 표시, 각 히든 스킬을 처음 획득하면 해당 카드의 조합식을 공개
- [ ] 페이지 최초 로드시 스킬 아이콘 프리로드 파이프라인 구축(후속 런에서는 캐시 사용)
- [x] 스킬 아이콘 로더 구현(초기 리소스 매핑)

---
