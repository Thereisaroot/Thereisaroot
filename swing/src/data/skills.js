(function (global) {
  const ICON_BASE_PATH = 'assets/skills/';
  const ICON_VARIANTS = {
    hi: (id) => `${ICON_BASE_PATH}${id}.png`,
    pixel: (id) => `${ICON_BASE_PATH}${id}_pixel.png`,
  };
  const ICON_MODE_STORAGE_KEY = 'webswing_skill_icon_mode';
  const DEFAULT_ICON_MODE = 'pixel';

  let skillIconMode = DEFAULT_ICON_MODE;
  try {
    const stored = localStorage.getItem(ICON_MODE_STORAGE_KEY);
    if (stored && ICON_VARIANTS[stored]) {
      skillIconMode = stored;
    }
  } catch (_) {}

  const BASIC_SKILLS = [
    {
      id: 'power_boost',
      type: 'basic',
      rarity: 'common',
      maxLevel: 3,
      tags: ['power'],
      iconSlug: 'power_boost',
      nameKey: 'skills.cards.power_boost.name',
    },
    {
      id: 'rope_glide',
      type: 'basic',
      rarity: 'common',
      maxLevel: 3,
      tags: ['flight'],
      iconSlug: 'rope_glide',
      nameKey: 'skills.cards.rope_glide.name',
    },
    {
      id: 'air_combo',
      type: 'basic',
      rarity: 'rare',
      maxLevel: 3,
      tags: ['air'],
      iconSlug: 'air_combo',
      nameKey: 'skills.cards.air_combo.name',
    },
    {
      id: 'drone_support',
      type: 'basic',
      rarity: 'rare',
      maxLevel: 3,
      tags: ['control'],
      iconSlug: 'drone_support',
      nameKey: 'skills.cards.drone_support.name',
    },
    {
      id: 'cash_magnet',
      type: 'basic',
      rarity: 'common',
      maxLevel: 3,
      tags: ['economy'],
      iconSlug: 'cash_magnet',
      nameKey: 'skills.cards.cash_magnet.name',
    },
    {
      id: 'stage_focus',
      type: 'basic',
      rarity: 'rare',
      maxLevel: 3,
      tags: ['control'],
      iconSlug: 'stage_focus',
      nameKey: 'skills.cards.stage_focus.name',
    },
    {
      id: 'fever_extension',
      type: 'basic',
      rarity: 'rare',
      maxLevel: 3,
      tags: ['fever'],
      iconSlug: 'fever_extension',
      nameKey: 'skills.cards.fever_extension.name',
    },
    {
      id: 'rope_shortener',
      type: 'basic',
      rarity: 'rare',
      maxLevel: 3,
      tags: ['control'],
      iconSlug: 'rope_shortener',
      nameKey: 'skills.cards.rope_shortener.name',
    },
    {
      id: 'sky_harvest',
      type: 'basic',
      rarity: 'common',
      maxLevel: 3,
      tags: ['air', 'economy'],
      iconSlug: 'sky_harvest',
      nameKey: 'skills.cards.sky_harvest.name',
    },
  ];

  const HIDDEN_SKILLS = [
    {
      id: 'void_magnet',
      type: 'hidden',
      rarity: 'epic',
      maxLevel: 3,
      tags: ['economy'],
      iconSlug: 'void_magnet',
      nameKey: 'skills.cards.void_magnet.name',
      requires: ['cash_magnet', 'sky_harvest'],
    },
    {
      id: 'spider_guard',
      type: 'hidden',
      rarity: 'epic',
      maxLevel: 3,
      tags: ['defense'],
      iconSlug: 'spider_guard',
      nameKey: 'skills.cards.spider_guard.name',
      requires: ['drone_support', 'rope_glide'],
    },
    {
      id: 'frenzy_feather',
      type: 'hidden',
      rarity: 'epic',
      maxLevel: 3,
      tags: ['fever', 'air'],
      iconSlug: 'frenzy_feather',
      nameKey: 'skills.cards.frenzy_feather.name',
      requires: ['fever_extension', 'sky_harvest'],
    },
    {
      id: 'combo_master',
      type: 'hidden',
      rarity: 'epic',
      maxLevel: 3,
      tags: ['air', 'power'],
      iconSlug: 'combo_master',
      nameKey: 'skills.cards.combo_master.name',
      requires: ['air_combo', 'rope_glide'],
    },
    {
      id: 'drone_collector',
      type: 'hidden',
      rarity: 'epic',
      maxLevel: 3,
      tags: ['control', 'economy'],
      iconSlug: 'drone_collector',
      nameKey: 'skills.cards.drone_collector.name',
      requires: ['drone_support', 'cash_magnet'],
    },
  ];

  const BASIC_SKILL_MAP = Object.fromEntries(BASIC_SKILLS.map((skill) => [skill.id, skill]));
  const HIDDEN_SKILL_MAP = Object.fromEntries(HIDDEN_SKILLS.map((skill) => [skill.id, skill]));

  function listSkills(type) {
    if (type === 'basic') return BASIC_SKILLS.slice();
    if (type === 'hidden') return HIDDEN_SKILLS.slice();
    return BASIC_SKILLS.concat(HIDDEN_SKILLS);
  }

  function getSkillDefinition(id) {
    return BASIC_SKILL_MAP[id] || HIDDEN_SKILL_MAP[id] || null;
  }

  function getSkillIconPath(id, mode) {
    const skill = getSkillDefinition(id);
    if (!skill) return null;
    const variant = ICON_VARIANTS[mode] ? mode : skillIconMode;
    const resolver = ICON_VARIANTS[variant] || ICON_VARIANTS[DEFAULT_ICON_MODE];
    return resolver ? resolver(skill.iconSlug || skill.id) : null;
  }

  function setSkillIconMode(mode, persist) {
    if (!ICON_VARIANTS[mode]) return;
    skillIconMode = mode;
    if (persist) {
      try {
        localStorage.setItem(ICON_MODE_STORAGE_KEY, mode);
      } catch (_) {}
    }
  }

  function getSkillIconMode() {
    return skillIconMode;
  }

  function getHiddenSkillRequirements(id) {
    const hidden = HIDDEN_SKILL_MAP[id];
    return hidden && Array.isArray(hidden.requires) ? hidden.requires.slice() : [];
  }

  function getSkillNameKey(id) {
    const def = getSkillDefinition(id);
    return def ? def.nameKey : null;
  }

  function getSkillLevelKey(id, level) {
    const def = getSkillDefinition(id);
    if (!def) return null;
    const clamped = Math.max(1, Math.min(level || 1, def.maxLevel || 1));
    if (def.levelKeyRoot) {
      return `${def.levelKeyRoot}.level${clamped}`;
    }
    if (def.nameKey && def.nameKey.endsWith('.name')) {
      return `${def.nameKey.slice(0, -5)}.level${clamped}`;
    }
    return null;
  }

  global.SkillData = {
    BASIC_SKILLS,
    HIDDEN_SKILLS,
    listSkills,
    getSkillDefinition,
    getSkillIconPath,
    getSkillIconMode,
    setSkillIconMode,
    getHiddenSkillRequirements,
    getSkillNameKey,
    getSkillLevelKey,
    DEFAULT_ICON_MODE,
    ICON_MODE_STORAGE_KEY,
  };
})(typeof window !== 'undefined' ? window : globalThis);
