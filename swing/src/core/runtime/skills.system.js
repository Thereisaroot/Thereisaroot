(function (global) {
  const RANDOM = Math.random;
  const MAX_SELECTION_TIME = 10; // seconds
  const ROLL_ANIMATION_DURATION = 1.2; // seconds
  const FLIP_STAGGER = 0.15; // seconds between card flips
  const FLIP_DURATION = 0.36; // seconds per card flip
  const RARITY_WEIGHT = {
    common: 6,
    rare: 3,
    epic: 1,
  };

  const state = {
    active: new Map(),
    unlockedHidden: new Set(),
    popup: null,
    queue: [],
    selectionsThisRun: 0,
    hiddenLearnedThisRun: false,
  };

  function getSkillLevel(id) {
    const entry = state.active.get(id);
    return entry ? entry.level : 0;
  }

  function setSkillLevel(id, level) {
    const def = SkillData.getSkillDefinition(id);
    if (!def) return;
    const clamped = Math.max(0, Math.min(def.maxLevel || 1, level));
    if (clamped <= 0) {
      state.active.delete(id);
      return;
    }
    state.active.set(id, {
      id,
      level: clamped,
      type: def.type,
    });
  }

  function resetRunState() {
    state.active.clear();
    state.unlockedHidden.clear();
    state.queue.length = 0;
    state.popup = null;
    state.selectionsThisRun = 0;
    state.hiddenLearnedThisRun = false;
  }

  function queueSelection(context, meta) {
    const baseMeta = Object.assign({ cardCount: 2, rerolls: 0 }, meta || {});
    if (typeof shopInv !== 'undefined' && shopInv) {
      const rerollBonus = Math.max(0, Number(shopInv.skillRerollLevel) || 0);
      if (rerollBonus > 0) {
        baseMeta.rerolls = (Number(baseMeta.rerolls) || 0) + rerollBonus;
      }
    }
    state.queue.push({ context, meta: baseMeta });
    preparePopup();
  }

  function evaluateHiddenUnlocks() {
    const pending = [];
    for (const hidden of SkillData.HIDDEN_SKILLS) {
      if ((hidden.maxLevel || 1) <= getSkillLevel(hidden.id)) continue;
      const requires = SkillData.getHiddenSkillRequirements(hidden.id);
      let allMax = true;
      for (const reqId of requires) {
        const reqLevel = getSkillLevel(reqId);
        const reqDef = SkillData.getSkillDefinition(reqId);
        if (!reqDef || reqLevel < (reqDef.maxLevel || 1)) {
          allMax = false;
          break;
        }
      }
      if (allMax) {
        if (!state.unlockedHidden.has(hidden.id)) {
          state.unlockedHidden.add(hidden.id);
          pending.push(hidden.id);
        }
      }
    }
    return pending;
  }

  function buildCardPool() {
    const pool = [];
    for (const skill of SkillData.BASIC_SKILLS) {
      const level = getSkillLevel(skill.id);
      if (level < (skill.maxLevel || 1)) {
        pool.push(skill);
      }
    }
    const hiddenLockedForRun = state.hiddenLearnedThisRun;
    for (const hidden of SkillData.HIDDEN_SKILLS) {
      if (hiddenLockedForRun) break;
      const level = getSkillLevel(hidden.id);
      if (level >= (hidden.maxLevel || 1)) continue;
      const requires = SkillData.getHiddenSkillRequirements(hidden.id);
      let unlocked = true;
      for (const reqId of requires) {
        const reqDef = SkillData.getSkillDefinition(reqId);
        if (!reqDef) { unlocked = false; break; }
        if (getSkillLevel(reqId) < (reqDef.maxLevel || 1)) { unlocked = false; break; }
      }
      if (unlocked) {
        pool.push(hidden);
        state.unlockedHidden.add(hidden.id);
      }
    }
    return pool;
  }

  function weightedDraw(pool, avoidIds) {
    const available = pool.filter((skill) => !avoidIds.has(skill.id));
    if (!available.length) return null;
    let total = 0;
    for (const skill of available) {
      const weight = RARITY_WEIGHT[skill.rarity] || 1;
      total += weight;
    }
    if (total <= 0) return available[0];
    let ticket = RANDOM() * total;
    for (const skill of available) {
      const weight = RARITY_WEIGHT[skill.rarity] || 1;
      if (ticket < weight) return skill;
      ticket -= weight;
    }
    return available[available.length - 1];
  }

  function computeCardCount(contextMeta) {
    const base = Math.max(1, contextMeta && contextMeta.cardCount ? contextMeta.cardCount : 2);
    let bonus = 0;
    if (typeof shopInv !== 'undefined' && shopInv && shopInv.skillCardPlus) {
      bonus += 1;
    }
    return base + bonus;
  }

  function preparePopup() {
    if (state.popup || state.queue.length === 0) return;
    const next = state.queue.shift();
    const pool = buildCardPool();
    if (pool.length === 0) {
      state.popup = null;
      state.queue.length = 0;
      return;
    }
    const cardCount = computeCardCount(next.meta || {});
    const cards = [];
    const hiddenIds = pool.filter((skill) => skill.type === 'hidden').map((skill) => skill.id);
    const hiddenIdSet = new Set(hiddenIds);
    const seen = new Set();
    if (state.hiddenLearnedThisRun) {
      for (const id of hiddenIdSet) seen.add(id);
    }
    let hiddenAddedThisSelection = false;
    for (let i = 0; i < cardCount; i++) {
      const pick = weightedDraw(pool, seen);
      if (!pick) break;
      seen.add(pick.id);
      cards.push({ id: pick.id, def: pick });
      if (!hiddenAddedThisSelection && pick.type === 'hidden') {
        hiddenAddedThisSelection = true;
        for (const id of hiddenIdSet) {
          seen.add(id);
        }
      }
    }
    if (!cards.length) {
      state.popup = null;
      return;
    }
    const meta = next.meta || {};
    state.popup = {
      context: next.context,
      meta,
      cards,
      selectedIndex: -1,
      timer: MAX_SELECTION_TIME,
      createdAt: performance.now ? performance.now() : Date.now(),
      rerollsRemaining: Math.max(0, Number.isFinite(meta.rerolls) ? meta.rerolls : 0),
      showDetails: false,
      createdAtMillis: performance.now ? performance.now() : Date.now(),
      rollTimer: ROLL_ANIMATION_DURATION,
      rollDuration: ROLL_ANIMATION_DURATION,
      rollFlipDuration: FLIP_DURATION,
      rollFlipStagger: FLIP_STAGGER,
    };
  }

  function applySkill(skillId) {
    const def = SkillData.getSkillDefinition(skillId);
    if (!def) return null;
    const currentLevel = getSkillLevel(skillId);
    if (currentLevel >= (def.maxLevel || 1)) {
      return { id: skillId, level: currentLevel, maxed: true };
    }
    setSkillLevel(skillId, currentLevel + 1);
    evaluateHiddenUnlocks();
    state.selectionsThisRun += 1;
    if (def.type === 'hidden') {
      state.hiddenLearnedThisRun = true;
    }
    return { id: skillId, level: currentLevel + 1, maxed: false };
  }

  function completeSelection(choiceIndex) {
    if (!state.popup || !state.popup.cards.length) return null;
    const index = Math.max(0, Math.min(state.popup.cards.length - 1, choiceIndex));
    const card = state.popup.cards[index];
    const result = applySkill(card.id);
    state.popup = null;
    preparePopup();
    return result;
  }

  function completeSelectionById(cardId) {
    if (!state.popup || !state.popup.cards.length) return null;
    const index = state.popup.cards.findIndex((card) => card.id === cardId);
    if (index < 0) return null;
    return completeSelection(index);
  }

  function update(dt) {
    if (!state.popup) return { active: false };
    let auto = null;
    if (state.popup.rollTimer && state.popup.rollTimer > 0) {
      state.popup.rollTimer = Math.max(0, state.popup.rollTimer - dt);
      if (state.popup.rollTimer <= 0) {
        state.popup.rollTimer = 0;
        state.popup.timer = MAX_SELECTION_TIME;
        state.popup.selectedIndex = -1;
      }
      return {
        active: true,
        rolling: true,
        autoSelected: null,
      };
    }
    state.popup.timer = Math.max(0, state.popup.timer - dt);
    if (state.popup.timer <= 0) {
      const randomIndex = Math.floor(RANDOM() * state.popup.cards.length);
      auto = completeSelection(randomIndex);
    }
    return {
      active: Boolean(state.popup),
      autoSelected: auto,
    };
  }

  function moveSelection(delta) {
    if (!state.popup || state.popup.rollTimer > 0 || !state.popup.cards.length) return;
    const count = state.popup.cards.length;
    const current = state.popup.selectedIndex;
    if (current < 0) {
      state.popup.selectedIndex = delta >= 0 ? 0 : count - 1;
      return;
    }
    const nextIndex = (current + delta + count) % count;
    state.popup.selectedIndex = nextIndex;
  }

  function setSelectionIndex(index) {
    if (!state.popup || state.popup.rollTimer > 0 || !state.popup.cards.length) return;
    const count = state.popup.cards.length;
    const clamped = Math.max(0, Math.min(count - 1, index));
    state.popup.selectedIndex = clamped;
  }

  function toggleDetails(force) {
    if (!state.popup || state.popup.rollTimer > 0) return;
    if (typeof force === 'boolean') {
      state.popup.showDetails = force;
    } else {
      state.popup.showDetails = !state.popup.showDetails;
    }
  }

  function rerollSelection() {
    if (!state.popup || state.popup.rollTimer > 0 || state.popup.rerollsRemaining <= 0) return false;
    const pool = buildCardPool();
    if (!pool.length) return false;
    const currentIds = new Set(state.popup.cards.map((card) => card.id));
    const desiredCount = state.popup.cards.length || 3;
    const newCards = [];
    const hiddenIds = pool.filter((skill) => skill.type === 'hidden').map((skill) => skill.id);
    const hiddenIdSet = new Set(hiddenIds);
    const seen = new Set();
    if (state.hiddenLearnedThisRun) {
      for (const id of hiddenIdSet) seen.add(id);
    }
    let hiddenAddedThisSelection = false;
    for (let i = 0; i < desiredCount; i++) {
      let avoid = new Set([...seen, ...currentIds]);
      let pick = weightedDraw(pool, avoid);
      if (!pick) {
        avoid = seen;
        pick = weightedDraw(pool, avoid);
      }
      if (!pick) break;
      seen.add(pick.id);
      newCards.push({ id: pick.id, def: pick });
      if (!hiddenAddedThisSelection && pick.type === 'hidden') {
        hiddenAddedThisSelection = true;
        for (const id of hiddenIdSet) {
          seen.add(id);
        }
      }
    }
    if (!newCards.length) return false;
    state.popup.cards = newCards;
    state.popup.selectedIndex = -1;
    state.popup.rerollsRemaining = Math.max(0, state.popup.rerollsRemaining - 1);
    state.popup.showDetails = false;
    state.popup.timer = MAX_SELECTION_TIME;
    state.popup.createdAtMillis = performance.now ? performance.now() : Date.now();
    state.popup.rollTimer = ROLL_ANIMATION_DURATION;
    state.popup.rollDuration = ROLL_ANIMATION_DURATION;
    state.popup.rollFlipDuration = FLIP_DURATION;
    state.popup.rollFlipStagger = FLIP_STAGGER;
    if (state.popup.meta) {
      state.popup.meta.rerolls = state.popup.rerollsRemaining;
      state.popup.meta.cardCount = newCards.length;
    }
    return true;
  }

  function getPopupState() {
    if (!state.popup) return null;
    return state.popup;
  }

  function serializeActiveSkills() {
    const out = [];
    state.active.forEach((value) => {
      out.push({ id: value.id, level: value.level, type: value.type });
    });
    out.sort((a, b) => a.id.localeCompare(b.id));
    return out;
  }

  global.SkillSystem = {
    resetRunState,
    queueSelection,
    update,
    completeSelection,
    completeSelectionById,
    moveSelection,
    setSelectionIndex,
    toggleDetails,
    rerollSelection,
    getSkillLevel,
    getPopupState,
    getSkillIconPath: SkillData.getSkillIconPath,
    getSkillDefinition: SkillData.getSkillDefinition,
    getActiveSkills: serializeActiveSkills,

    evaluateHiddenUnlocks,
    getUnlockedHidden: () => Array.from(state.unlockedHidden),
    selectionsThisRun: () => state.selectionsThisRun,
  };
})(typeof window !== 'undefined' ? window : globalThis);
