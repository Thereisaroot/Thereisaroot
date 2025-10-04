# 런타임 스킬 카드 시스템 명세 (적 없는 캐주얼 버전)

## 개요
- 게임 시작, 스테이지 보상 구간마다 일시정지 후 3장의 스킬 카드를 제시
- 플레이어는 1장을 선택하여 해당 런 동안 빌드업
- 스킬은 `Lv1`로 시작, 동일 스킬 중복 획득 시 레벨 업(최대 Lv3)
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
- `maxLevel`: 3 (숨은 스킬도 레벨 3 구조 동일)
- `rarity`: `common` | `rare` | `epic` (카드 등장 확률 가중치)
- `effect(level)`: 각 레벨별 효과 설명
- `tags`: 빌드 템포를 구분하기 위한 태그 (예: `power`, `air`, `flight`, `defense`, `control`, `economy`)
- `unlockCondition`: 히든 스킬일 경우 필요 조합식

### 기본 스킬 목록 (예시 11종)

| ID | 이름 | 태그 | 설명(Lv1→Lv3) |
|----|------|------|----------------|
| `power_boost` | 차지 임팩트 | power | 파워 게이지 충전 속도 +15%/+30%/+50%, Lv2부터 점프 시 짧은 상승 보너스, Lv3에서 상승 보너스 강화 |
| `rope_glide` | 로프 글라이드 | flight | 로프에서 점프 후 0.5/0.8/1.2초간 중력 20/35/50% 감소 |
| `air_combo` | 에어 콤보 | air | 원래는 1번 점프로 로프를 잡아야만 콤보가 올라가지만, 이 스킬을 통해 **추가점프로 로프를 잡아도 콤보가 증가**. **Lv1:** 20% 확률로 무조건 콤보 +1. **Lv2:** 확률 40%. **Lv3:** 확률 60% + 추가점프로 잡을 때 캐시 +1 |
| `guardian_bud` | 가디언 버드 | defense | 버드 오브젝트 +1/+2/+3, Lv3에서 추락 직전 자동 점프 보조 1회 |
| `drone_support` | 서포트 드론 | control | 드론이 자유롭게 돌아다니다가 **캐릭터와 충돌 시 해당 위치에서 멈춰 로프 역할**을 수행. 캐릭터가 다시 점프하면 드론은 다시 자유 비행을 시작. 비행 중 아이템을 만나면 자동으로 수집. **Lv1:** 작은 히트박스. **Lv2:** 히트박스 확대. **Lv3:** 드론 2마리 등장 + 큰 히트박스 |
| `cash_magnet` | 캐시 마그넷 | economy | 아이템 흡입 반경 +15/+30/+50px, Lv3에서 상자 획득 캐시 +1 |
| `stage_focus` | 스테이지 포커스 | control | 스테이지 전환 시 스킬 카드 추가 1장 제시, Lv2부터 선택 후 로프 캐치 히트박스 +10%, Lv3에서 +20% |
| `fever_extension` | 피버 익스텐션 | fever | 피버 지속 +20%/+35%/+50%, Lv3에서 피버 돌입 시 즉시 파워 게이지 충전 |
| `dive_break` | 다이브 브레이크 | power/air | 버튼 홀드로 하강 시 바운스 점프 발생, Lv3에서 바운스 후 캐시 +2 |
| `rope_shortener` | 로프 쇼트너 | control | 로프 간격 5%/10%/15% 감소, Lv3에서 일정 주기마다 자동 최적화 |
| `sky_harvest` | 스카이 하베스트 | air/economy | 공중에서 아이템 잡을 시 추가 캐시 +1/+2/+3, Lv3에서 EXP도 +1 |

### 히든 스킬 목록 (예시 5종)

| ID | 이름 | 조합식(둘 다 Lv3) | 효과 |
|----|------|------------------|------|
| `void_magnet` | 보이드 마그넷 | `cash_magnet` + `chrono_loop` | 20초마다 블랙홀 생성, 주변 아이템을 끌어당겨 캐시 변환 |
| `spider_guard` | 스파이더 가드 | `guardian_bud` + `safe_landing` | 맵 땅 부분을 거미가 돌아다니다가 랜덤 위치에 거미줄 트램폴린 생성. 캐릭터가 닿으면 떨어지지 않고 튕겨 하늘로 상승 |
| `frenzy_feather` | 프렌지 페더 | `fever_extension` + `sky_harvest` | 피버 중 공중 아이템 획득 시 드론 스택 생성, 스택당 피버 타임 +0.5초, 종료 시 캐시 +스택*2 |
| `combo_master` | 콤보 마스터 | `air_combo` + `rope_glide` | 로프를 어떤 방식으로든 잡을 때마다 **100% 확률로 콤보 +1**. Lv3에서는 추가로 콤보마다 캐시 +1 |
| `drone_collector` | 드론 콜렉터 | `drone_support` + `cash_magnet` | 드론이 멈춰 로프 역할을 하는 동시에 근처 아이템을 자동 수집. Lv3에서는 두 드론 모두 넓은 반경에서 아이템 흡수 |

## 카드 팝업 UI 흐름
1. **트리거**: `showSkillCardPopup(context)` 호출 (context: `start`, `stage_reward`, `hidden_unlock` 등)
2. **카드 풀 선정**:
   - 기본 스킬 중 아직 Max Lv3 미만인 스킬 위주로 샘플링
   - 히든 스킬 조건 달성 시 `hidden` 풀에 추가
   - 확률 가중치: `common` 60%, `rare` 30%, `epic` 10% (Unlocked 상태 기준)
3. **랜덤 3장 노출**: 카드마다 레벨 표시, 현재 보유 레벨에 따라 `Lv X → Lv X+1` 설명 포함
4. **입력 처리**: 좌/우로 카드 이동, Space/클릭으로 선택. 선택 시 카드 확대 + 효과 설명 출력 후 `applySkillSelection(skillId)` 호출
5. **게임 재개**: 모듈 상태 업데이트 후 기존 런 상태로 복귀

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
- [ ] `skills.data.js` 신규 작성 (스킬 정의, 조합식)
- [ ] `skills.system.js` 런타임 상태 관리/적용 로직
- [ ] 카드 팝업 UI (`skills.popup.js` 또는 기존 HUD에 통합)
- [ ] 이벤트 연결: 런 시작, 스테이지 보상, 히든 해금 시 트리거
- [ ] 스킬 효과 반영: 기존 시스템(점프/로프/아이템 등)과 연동

---

드론의 동작을 업데이트했습니다: 
- 캐릭터와 충돌 시 멈춰 **로프 역할** 수행.
- 캐릭터가 점프하면 다시 날아다니며 자유 비행.
- 비행 중 아이템을 만나면 자동으로 수집.
- 레벨업 시 히트박스가 커지고, Lv3에서는 드론 2마리.

