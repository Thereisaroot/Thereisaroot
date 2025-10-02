# 런타임 스킬 카드 시스템 명세

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
- `tags`: 빌드 템포를 구분하기 위한 태그 (예: `power`, `air`, `flight`, `defense`, `drone`)
- `unlockCondition`: 히든 스킬일 경우 필요 조합식

### 기본 스킬 목록 (예시 12종)

| ID | 이름 | 태그 | 설명(Lv1→Lv3) |
|----|------|------|----------------|
| `power_boost` | 차지 임팩트 | power | 파워 게이지 충전 속도 +15%/+30%/+50%, Lv2부터 파워 점프 시 전방 파편 데미지, Lv3에서 폭발 범위 확대 |
| `rope_glide` | 로프 글라이드 | flight | 파워 점프 후 0.5/0.8/1.2초간 중력 20/35/50% 감소 |
| `air_combo` | 에어 콤보 | air | 공중 추가점프 사용 시 콤보 +1/+2/+3, Lv3에선 추가점프 시 캐시 +1 |
| `guardian_bud` | 가디언 버드 | defense | 버드 오브젝트 +1/+2/+3, Lv3에서 버드가 탄막 한 번 막을 때마다 체력 회복 1 |
| `drone_support` | 서포트 드론 | drone | 드론 1기가 따라다니며 파워 점프 순간 탄막 제거(Lv1 1회/Lv2 2회/Lv3 무제한), Lv3에서 아이템 자동획득 범위 +50 |
| `cash_magnet` | 캐시 마그넷 | economy | 아이템 흡입 반경 +15/+30/+50px, Lv3에서 상자 획득 캐시 +1 |
| `stage_focus` | 스테이지 포커스 | control | 스테이지 전환 시 스킬 카드 추가 1장 제시, Lv2부터 선택 후 1초 보호막, Lv3에서 보호막 2초 |
| `fever_extension` | 피버 익스텐션 | fever | 피버 지속 +20%/+35%/+50%, Lv3에서 피버 돌입 시 즉시 파워 게이지 충전 |
| `dive_break` | 다이브 브레이크 | power/air | 버튼 홀드로 하강 시 충격파 발생(데미지/범위 증가), Lv3에서 착지 후 캐시 +2 |
| `chrono_loop` | tempo | 런 중 60초마다 한 번 파워 게이지 자동 충전, Lv2는 45초, Lv3은 30초 주기 |
| `safe_landing` | stability | 착지 실패 시 한 번 자동 복구 (쿨타임 60→45→30초), Lv3에서 복구 시 파워 게이지 50% 유지 |
| `sky_harvest` | air/economy | 공중에서 아이템 잡을 시 추가 캐시 +1/+2/+3, Lv3에서 EXP도 +1 |

### 히든 스킬 목록 (예시 5종)

| ID | 이름 | 조합식(둘 다 Lv3) | 효과 |
|----|------|------------------|------|
| `overcharge_burst` | 오버차지 버스트 | `power_boost` + `air_combo` | 파워 점프 시 전방 고정 각도로 3연속 초음속 돌진, 적/탄막 관통, 관통마다 캐시 +2 |
| `aerial_emp` | 에어리얼 EMP | `rope_glide` + `drone_support` | 공중에서 버튼 홀드 1.5초 시 EMP 발동, 화면 내 탄막 제거 & 적 스턴(트리거당 1회/폐기 쿨타임 12초) |
| `void_magnet` | 보이드 마그넷 | `cash_magnet` + `chrono_loop` | 20초마다 블랙홀 생성, 주변 아이템/탄막 끌어당겨 제거 & 캐시 변환 |
| `phoenix_guard` | 피닉스 가드 | `guardian_bud` + `safe_landing` | 사망 시 자동 부활 1회, 부활 후 5초간 무적 & 파워 게이지 풀 충전 |
| `frenzy_feather` | 프렌지 페더 | `fever_extension` + `sky_harvest` | 피버 중 공중 아이템 획득 시 드론 스택 생성, 스택당 피버 타임 +0.5초, 종료 시 캐시 +스택*2 |

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
- [ ] 스킬 효과 반영: 기존 시스템(파워/플라이/드론 등)과 연동

---

위 명세는 스킬 카드 기반 로그라이크 성장 요소 도입을 위한 기본 설계를 다룹니다. 추가 조정이 필요하면 요청해 주세요.
