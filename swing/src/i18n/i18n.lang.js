(function (global) {
  if (!global.I18N) return;

  const translations = {};
  translations.en = {
    meta: {
      title: 'Boing! Boing!',
      canvasLabel: 'Boing! Boing! Canvas',
    },
    debug: {
      title: 'Debug',
      hint: '(Press V to toggle)',
      jumpSpeed: 'Jump Speed',
      jumpImpulse: 'Jump Impulse',
      catchRadius: 'Catch Radius',
      budSwayMin: 'Buds Sway Min%',
      budSwayMax: 'Buds Sway Max%',
      lengthMin: 'Rope Length Min',
      lengthMax: 'Rope Length Max',
      lengthJitter: 'Length Jitter %',
      spacingMin: 'Spacing Min',
      spacingMax: 'Spacing Max',
      spacingJitterMin: 'Spacing Jitter Min',
      spacingJitterMax: 'Spacing Jitter Max',
      shortProb: 'Short Rope Prob',
      shortFactor: 'Short Rope Factor',
      longProb: 'Long Rope Prob',
      longFactor: 'Long Rope Factor',
      breakProb: 'Break Prob',
      itemProb: 'Item Spawn Prob',
      shortDistanceMin: 'Short Distance Min',
      shortDistanceProb: 'Short Distance Prob',
      stageRopesPerStage: 'Stage Ropes per Stage',
      savings: 'Savings ($)',
      exp: 'EXP',
      hiddenToggleLabel: 'Hidden Skill Override',
      hiddenToggleOn: 'ON',
      hiddenToggleOff: 'OFF',
    },
    intro: {
      title: 'Boing! Boing!',
      pressStart: 'PRESS START',
      guide: 'GUIDE',
      settings: 'SETTINGS',
    },
    guide: {
      lines: 'Game Guide\n\n- Go as far as possible\n- Use multiple jumps each run\n- Catch the rope tip to attach',
      tutorialButtonOn: 'Tutorial: ON',
      tutorialButtonOff: 'Tutorial: OFF',
      tutorialTitle: 'HOW TO PLAY',
      tutorialStep: 'STEP {current}/{total}',
      tutorial: {
        steps: '1. Tap or press Space to jump \nfrom the starting rope.\nAim for the next rope tip.\n\n2. Jump again while in the air\nto chain additional jumps.\nMultiple jumps depend on your\nitems or character.\nKeep rhythm to stay fast.\n\n3. Buy the Fly item to glide.\nHold the button to \ncross long gaps.\nUse it to recover \nwhen ropes are far apart.'
      },
    },
    settings: {
      title: 'Settings',
      currentMarker: '(Current)',
      help: 'Select language',
    },
    languages: {
      en: { name: 'English' },
      ko: { name: '한국어' },
    },
    pagination: {
      prev: '<',
      next: '>',
    },
    common: {
      items: 'Items Shop',
      chars: 'Character Shop',
      ads: 'Ad Shop',
      mainMenu: 'Main Menu',
      back: 'BACK',
      yes: 'YES',
      no: 'NO',
      on: 'ON',
      off: 'OFF',
      clickAnywhereToClose: 'Click anywhere to close',
      clickOutsideToClose: 'Click outside to close',
    },
    menu: {
      unlockAtLevel: 'Opens at Lv {level}.',
    },
    records: {
      title: 'Character Records',
      menuButton: 'Records',
      menu: {
        history: 'Lifetime Stats',
        historyHint: 'View your progress.',
        goals: 'Achievement Goals',
        goalsHint: 'Complete goals and rewards',
        closeHint: 'Click outside to close.',
      },
      stats: {
        gameOverCount: 'Total Game Overs',
        totalExp: 'Total EXP Earned',
        totalCash: 'Total Cash Earned',
        itemsOwned: 'Owned Items',
        charactersOwned: 'Owned Characters',
        ropesCaught: 'Ropes Caught',
        bossSuccess: 'Boss Victories',
        bossFailure: 'Boss Fails',
        itemsCollected: 'Items Collected',
      },
      common: {
        none: 'None',
      },
      pagination: 'Page {page}/{total}',
      back: 'Back',
      filters: {
        all: 'All',
        pending: 'Wait',
        achievable: 'Ready',
        completed: 'Done',
      },
      goals: {
        reward: 'Reward: ${amount}',
        claim: 'Claim',
        status: {
          completed: 'Completed',
          pending: 'Incomplete',
        },
        rewardPrefix: 'Reward: $',
        first_boss_clear: {
          title: 'First Boss Clear',
          desc: 'Defeat any boss once.',
        },
        cash_500: {
          title: 'Earn $500',
          desc: 'Accumulate $500 in total earnings.',
        },
        cash_1000: {
          title: 'Earn $1,000',
          desc: 'Accumulate $1,000 in total earnings.',
        },
        cash_2000: {
          title: 'Earn $2,000',
          desc: 'Accumulate $2,000 in total earnings.',
        },
        exp_1000: {
          title: 'Earn 1,000 EXP',
          desc: 'Reach 1,000 total EXP.',
        },
        exp_2000: {
          title: 'Earn 2,000 EXP',
          desc: 'Reach 2,000 total EXP.',
        },
        exp_4000: {
          title: 'Earn 4,000 EXP',
          desc: 'Reach 4,000 total EXP.',
        },
        items_owned_5: {
          title: 'Own 5 Items',
          desc: 'Own at least five shop items.',
        },
        characters_owned_3: {
          title: 'Recruit 3 Characters',
          desc: 'Own at least three characters.',
        },
        characters_owned_5: {
          title: 'Recruit 5 Characters',
          desc: 'Own at least five characters.',
        },
        ropes_1000: {
          title: 'Catch 1,000 Ropes',
          desc: 'Catch ropes 1,000 times in total.',
        },
        ropes_2000: {
          title: 'Catch 2,000 Ropes',
          desc: 'Catch ropes 2,000 times in total.',
        },
        ropes_4000: {
          title: 'Catch 4,000 Ropes',
          desc: 'Catch ropes 4,000 times in total.',
        },
        items_collected_200: {
          title: 'Grab 200 Items',
          desc: 'Collect in-run items 200 times.',
        },
        items_collected_400: {
          title: 'Grab 400 Items',
          desc: 'Collect in-run items 400 times.',
        },
        items_collected_800: {
          title: 'Grab 800 Items',
          desc: 'Collect in-run items 800 times.',
        },
      },
      goalClaimed: 'Reward claimed! +${amount}',
    },
    hud: {
      score: 'SCORE {score}',
      best: 'BEST {best}',
      savings: '$ {amount}',
      fever: 'FEVER',
      power: 'POWER',
      level: 'LV {level}',
    },
    stage: {
      banner: 'STAGE {stage}',
    },
    boss: {
      stageWithNumber: 'BOSS STAGE {stage}',
      stage: 'BOSS STAGE',
      bulletHud: 'Shots {shots}/{total} | Hits {hits}/{limit}',
      slamHudProgress: '{current} JUMPS (goal {goal})',
      slamHudTime: 'Time {seconds}s',
      collectHud: 'Collected {collected}/{total} | Missed {missed}/{allowed}',
      hud: {
        bullet: 'Dodge the bullets!',
        slam: 'Keep jumping!',
        collect: 'Collect the falling $ crates!',
      },
    },
    bossOutcome: {
      success: 'Boss Cleared!',
      failure: 'Boss Failed...',
      rewardCashScore: '+${cash} / +{score} pts',
      rewardCash: '+${cash} cash',
      rewardScore: '+{score} pts',
      reason: {
        hit: 'You were hit!',
        notEnoughDodge: 'Not enough dodges.',
        missedBoxes: 'Too many crates were missed.',
      },
    },
    roulette: {
      title: '',
      spinning: 'Spinning...',
      formula: '{before} {op} {value} = {after}',
      locked: 'WOW',
    },
    game: {
      fastToggle: 'FAST MODE: {state}',
      clearMessage: 'GAME CLEAR! Endless barrage unlocked.',
    },
    ads: {
      lifeCounter: 'LIVES {current}/{max}',
      lifeLoading: 'Loading ad... hold tight!',
      lifeRewarded: 'Lives +{lives}! Ready to swing!',
      lifePartial: 'Partial reward: +{lives} lives gained.',
      lifeLimit: 'Daily ad limit reached ({limit}/day).',
      lifeError: 'Ad failed. Please try again shortly.',
      lifeErrorWithReason: 'Ad failed ({reason}).\n+{lives} lives granted.',
      lifeUnavailable: 'Ads are currently unavailable.',
      lifePrompt: 'No lives! Watch an ad!',
      lifeTapToWatch: 'Tap to watch an ad and get lives.',
    },
    adsShop: {
      title: 'AD SHOP',
      wizardTitle: 'Wizard Unlock',
      wizardDesc: 'Watch an ad to unlock the Wizard character.',
      wizardUnlocked: 'Wizard unlocked! Enjoy the sparkle.',
      cashTitle: '$20 Pouch',
      cashDesc: 'Watch an ad to receive $20 instantly.',
      cashGranted: '${amount} added to savings.',
      watch: 'WATCH AD',
      loading: 'Loading...',
      claimedToday: 'Already claimed today.',
      adNotCompleted: 'Finish the ad to receive the reward.',
      noFill: 'No ad available right now. Please try again later.',
      nativeOnly: 'Ads are only available in the app.',
      alreadyOwned: 'Already unlocked.',
    },
    gameOver: {
      title: 'GAME OVER',
      demoLossLine1: 'YOU LOSE EVERYTHING.',
      demoLossLine2: 'YOU WILL BECOME A SMALL EGG.',
      nextDemo: 'Try to exceed 111P',
      nextDemoRuns: 'Play {runs} more runs',
      nextLevel: 'Next Level: {remaining}P to go',
      maxLevel: 'Max level reached!',
      earned: 'Gained: ${money} / +{exp}P',
      earnedHint: 'Earn $ and P by scoring over 5',
      tipLabel: 'TIP',
      tips: {
        jumpItem: 'Aim for the Jump+ item.',
        wizard: 'Wizard hard to earn many points.',
        fever: 'Fever helps you keep combos.',
        records: 'Records grants rewards.',
        scoreHint: 'Over 5P to earning $ and EXP.',
        airJump: 'Try jumps while in the air.',
      },
      stats: 'EXP: {exp}P | ${savings}',
      rouletteResult: 'Roulette: {before} {op} {value} = {after}',
      roulettePending: 'Roulette: {op} {value}',
      levelUp: 'LEVEL UP! LV {level}',
      retryCountdown: 'RETRY IN {seconds}',
      retryReady: 'CLICK TO RETRY',
    },
    shop: {
      charactersTitle: 'CHARACTERS',
      itemsTitle: 'ITEMS',
      selected: 'SELECTED',
      owned: 'OWNED',
      ownedTag: '[OWNED]',
      lockTag: 'LV {level}',
      levelTag: 'LV {level}',
      balance: 'Funds: ${amount}',
      specialTag: 'SPECIAL',
      lockedLevel: 'Reach LV {level}',
      lockedFunds: 'Need ${amount}',
      lockedSpecial: 'Special unlock required',
      price: '${amount}',
      itemLevel: 'Lv. {level}',
      soldOut: 'SOLD OUT',
      maxed: 'MAX',
      itemsHelpTitle: 'ITEM DESCRIPTIONS',
      characterInfoTitle: 'CHARACTER INFO',
      confirmPurchase: 'Buy {name} for ${amount}?',
      confirmSelectCharacter: 'Select {name}?',
      error: {
        level: 'Requires LV {level}',
        funds: 'Need ${amount}',
        alreadyPurchased: 'Already purchased',
        special: 'Requires special unlock',
      },
    },
    effects: {
      stageBonus: '+${cash}',
      cashPickup: '+$',
      cashEarned: '+${cash}',
      pointsEarned: '+{points}P',
      slow: 'SLOW!',
      comboCount: '{combo} COMBO',
      tailorBonus: '+{amount}',
      revive: 'REVIVE!',
      budsProtect: 'BUDS!',
    },
    items: {
      glow: {
        name: 'Glow',
        description: 'Glow effect and +10% catch radius per level.',
      },
      buds: {
        name: 'Buds',
        description: 'Adds rotating orbs that auto-catch ropes, boxes, and block bullets.',
      },
      plusjump: {
        name: '+Jump',
        description: 'Grants one extra air jump while free.',
      },
      powerjump: {
        name: 'Power Jump',
        description: 'Unlocks the charged launch once per run.',
      },
      fly: {
        name: 'Fly',
        description: 'Enables long-press flight once per run.',
      },
      big: {
        name: 'Big',
        description: 'Increases body size by 2.5% per level.',
      },
      gamble: {
        name: 'Gamble',
        description: 'Next run earns 1.5x money and EXP.',
      },
      magnet: {
        name: 'Magnet',
        description: 'Pulls nearby boxes and +10px pickup radius per level.',
      },
      combo: {
        name: 'Combo+',
        description: 'Combo catches grant +1 score per chain per level (no multiplier).',
      },
      slow: {
        name: 'Slow',
        description: 'On detach, 10% × level chance to trigger slow motion after a short delay.',
      },
      lucky: {
        name: 'Lucky',
        description: 'Item spawn chance +5% per level.',
      },
      revival: {
        name: 'Revival',
        description: 'Revive once after the Robot rescue fails when you hit the ground.',
      },
      startskill: {
        name: 'Start Skill',
        description: 'Gain a skill card choice right at the start of the run.',
      },
      fever: {
        name: 'Fever+',
        description: 'Extends star mode by +1 second per level.',
      },
      skill_card_plus: {
        name: 'Skill Card+',
        description: 'Skill selections display +1 extra card.',
      },
      skill_reroll: {
        name: 'Skill Reroll',
        description: '+1 skill reroll per run for each level (max 3).',
      },
    },
    chars: {
      default: {
        name: 'Polygon',
        summary: 'Classic form that\nscales with level',
        help: 'Classic geometric body that changes \nshape as you level up.',
      },
      robot: {
        name: 'Robot',
        summary: 'Emergency rope\nrevives you once',
        help: 'Triggers an automatic rescue rope \nwhen you hit the ground.',
      },
      ninja: {
        name: 'Ninja',
        summary: 'Extra air jump\nfor escapes',
        help: 'Adds one additional air jump for \nagile recoveries.',
      },
      pirate: {
        name: 'Pirate',
        summary: 'Combo catches\nearn +$2',
        help: 'Combo catches grant $2 bonus \nearnings each time.',
      },
      wizard: {
        name: 'Wizard',
        summary: 'Floaty leaps and\nsoft landings',
        help: 'Custom detach physics with gentle \nglide after a jump.',
      },
      knight: {
        name: 'Knight',
        summary: 'Double score\nbut -1 jump',
        help: 'Doubles score and money but \nremoves one air jump.',
      },
      tailor: {
        name: 'Tailor',
        summary: 'Adds bonus rope\n+$1 on catch',
        help: '50% chance to stitch an extra rope; \ncatching it grants +$1.',
      },
      springman: {
        name: 'Springman',
        summary: 'Charge every\nrope jump',
        help: 'Hold while attached to fill \na power gauge.',
      },
      bird: {
        name: 'Bird',
        summary: 'Fly anytime\nwhen owned',
        help: 'Allows Fly activation any time \nonce the Fly item is owned.',
      },
    },
    skills: {
      overlay: {
        title: 'Skill Select',
        timer: 'Auto pick in {seconds}s',
        rolling: 'Flipping... {seconds}s',
        flipping: 'Flipping',
        rolling: 'Rolling... {seconds}s',
        help: 'Details',
        helpClose: 'Back',
        reroll: 'Reroll',
        rerollCount: 'Reroll ×{count}',
        hudTitle: 'Skills',
        emptyHud: 'No skills yet',
        levelLabel: 'Lv {level}',
        requires: 'Requires {list}',
        iconModePixel: 'Icon: Pixel',
        iconModeHi: 'Icon: High',
      },
      cards: {
        power_boost: {
          name: 'Charge Impact',
          level1: '+30% rope jump thrust.',
        level2: '+60% rope jump thrust.',
        level3: '+90% rope jump thrust.',
        },
        rope_glide: {
          name: 'Rope Glide',
          level1: 'Rope catch radius +5px.',
          level2: 'Rope catch radius +10px.',
          level3: 'Rope catch radius +20px.',
        },
        air_combo: {
          name: 'Air Combo',
          level1: '20% chance: air-jump catches still grant combo.',
        level2: '40% chance: air-jump catches advance combo.',
        level3: '60% chance + $1 bonus on successful air-jump catches.',
        },
        drone_support: {
          name: 'Support Drone',
          level1: 'Deploy a roaming drone that becomes a rope when you collide. Small hitbox.',
        level2: 'Drone pause hitbox enlarged for easier catches.',
        level3: 'Spawn two drones with large rope hitboxes.',
        },
        cash_magnet: {
          name: 'Cash Magnet',
          level1: 'Pickup radius +15px.',
        level2: 'Pickup radius +30px.',
        level3: 'Pickup radius +50px and chests grant +$1.',
        },
        stage_focus: {
          name: 'Stage Focus',
          level1: 'Stage gate rope requirement reduced by 1.',
        level2: 'Stage gate rope requirement reduced by 2.',
        level3: 'Stage gate rope requirement reduced by 3.',
        },
        fever_extension: {
          name: 'Fever Extension',
          level1: 'Fever duration +20%.',
        level2: 'Fever duration +35%.',
        level3: 'Fever duration +50% & instant power charge on entry.',
        },
        rope_shortener: {
          name: 'Rope Shortener',
          level1: 'Main rope spacing reduced by 5%.',
        level2: 'Main rope spacing reduced by 10%.',
        level3: 'Main rope spacing reduced by 15% with periodic auto-optimisation.',
        },
        sky_harvest: {
          name: 'Sky Harvest',
          level1: 'Airborne item catches grant +$1.',
        level2: 'Airborne item catches grant +$2.',
        level3: 'Airborne item catches grant +$3 and +1 EXP.',
        },
        void_magnet: {
          name: 'Void Magnet',
          level1: 'Every 20s a small black hole pulls nearby items into cash.',
        level2: 'Black hole pull radius increased.',
        level3: 'Black hole converts pulled items into +$2 each.',
        },
        spider_guard: {
          name: 'Spider Guard',
          level1: 'Roaming spider spawns trampolines along the ground.',
        level2: 'Trampolines launch higher and linger longer.',
        level3: 'Spawns two webs, covering more ground for safety.',
        },
        frenzy_feather: {
          name: 'Frenzy Feather',
          level1: 'During fever, gain +$1 every 0.2s (shown above the player) and multiply combo bonuses (score & cash) by 5.',
        },
        combo_master: {
          name: 'Combo Master',
          level1: 'All rope catches advance combo regardless of jump method.',
        level2: 'Combo never resets from air jumps.',
        level3: 'Combo gains +$1 per chain.',
        },
        drone_collector: {
          name: 'Drone Collector',
          level1: 'Support drones vacuum nearby items while paused.',
        level2: 'Vacuum radius greatly increased.',
        level3: 'Two drones collect across a wide radius.',
        },
      },
    },
  };
  translations.ko = {
    meta: {
      title: 'Boing! Boing!',
      canvasLabel: 'Boing! Boing! 캔버스',
    },
    debug: {
      title: '디버그',
      hint: '(V 키로 토글)',
      jumpSpeed: '점프 속도',
      jumpImpulse: '점프 거리',
      catchRadius: '캐치 반경',
      budSwayMin: '버드 흔들림 최소%',
      budSwayMax: '버드 흔들림 최대%',
      lengthMin: '로프 길이 최소',
      lengthMax: '로프 길이 최대',
      lengthJitter: '길이 지터 %',
      spacingMin: '간격 최소',
      spacingMax: '간격 최대',
      spacingJitterMin: '간격 지터 최소',
      spacingJitterMax: '간격 지터 최대',
      shortProb: '짧은 로프 확률',
      shortFactor: '짧은 로프 계수',
      longProb: '긴 로프 확률',
      longFactor: '긴 로프 계수',
      breakProb: '끊김 확률',
      itemProb: '아이템 확률',
      shortDistanceMin: '짧은 거리 최소',
      shortDistanceProb: '짧은 거리 확률',
      stageRopesPerStage: '스테이지당 로프 수',
      savings: '소지금 ($)',
      exp: '경험치 (EXP)',
      hiddenToggleLabel: '히든 스킬 강제 등장',
      hiddenToggleOn: 'ON',
      hiddenToggleOff: 'OFF',
    },
    intro: {
      title: '짬푸! 짬푸!',
      pressStart: 'PRESS START',
      guide: '가이드',
      settings: '설정',
    },
    guide: {
      lines: '게임 가이드\n\n- 가능한 멀리 이동하세요\n- 한 번의 런에서 여러 번 점프하세요\n- 로프 끝을 잡아 매달리세요',
      tutorialButtonOn: '튜토리얼: ON',
      tutorialButtonOff: '튜토리얼: OFF',
      tutorialTitle: '조작 튜토리얼',
      tutorialStep: '{current}/{total} 단계',
      tutorial: {
        steps: '1. 시작 로프에서 점프하세요.\n다음 로프 끝을 노리면 됩니다.\n\n2. 공중에서 추가 점프가 가능합니다.\n아이템과 캐릭터에 따라 횟수가 달라집니다. \n연속 점프를 이용해 속도를 유지하세요.\n \n\n3. 플라이 아이템을 구매하면 \n버튼을 누른 채로 활강할 수 있습니다.\n멀리 떨어진 로프를 이어 갈 때 활용하세요.'
      },
    },
    settings: {
      title: '설정',
      currentMarker: '(현재)',
      help: '언어를 선택하세요',
    },
    languages: {
      en: { name: 'English' },
      ko: { name: '한국어' },
    },
    pagination: {
      prev: '<',
      next: '>',
    },
    common: {
      items: '아이템 상점',
      chars: '캐릭터 상점',
      ads: '광고 상점',
      mainMenu: '메인 화면',
      back: '뒤로',
      yes: 'YES',
      no: 'NO',
      on: 'ON',
      off: 'OFF',
      clickAnywhereToClose: '아무 곳이나 클릭하면 닫힙니다',
      clickOutsideToClose: '바깥을 클릭하면 닫힙니다',
    },
    menu: {
      unlockAtLevel: 'Lv {level}에 오픈됩니다.',
    },
    records: {
      title: '내 캐릭터 기록',
      menuButton: '기록',
      menu: {
        history: '누적 기록',
        historyHint: '지금까지 모은 데이터를 확인해요.',
        goals: '달성 목표',
        goalsHint: '조건을 채우고 보상을 획득하세요.',
        closeHint: '바깥 영역을 누르면 닫힙니다.',
      },
      stats: {
        gameOverCount: '게임 오버 횟수',
        totalExp: '누적 경험치',
        totalCash: '누적 소지금',
        itemsOwned: '보유 아이템',
        charactersOwned: '보유 캐릭터',
        ropesCaught: '잡은 로프 수',
        bossSuccess: '격파한 보스 수',
        bossFailure: '실패한 보스 수',
        itemsCollected: '먹은 인게임 아이템',
      },
      common: {
        none: '없음',
      },
      pagination: '{page} / {total} 페이지',
      back: '뒤로가기',
      filters: {
        all: '전체',
        pending: '미달성',
        achievable: '달성',
        completed: '완료',
      },
      goals: {
        reward: '보상: {amount}$',
        claim: '달성',
        status: {
          completed: '완료',
          pending: '미달성',
        },
        rewardPrefix: '보상: $',
        first_boss_clear: {
          title: '첫 보스 격파',
          desc: '아무 보스나 한 번 격파하세요.',
        },
        cash_500: {
          title: '소지금 500$ 모으기',
          desc: '누적 소지금을 500$ 이상 모으세요.',
        },
        cash_1000: {
          title: '소지금 1,000$ 모으기',
          desc: '누적 소지금을 1,000$ 이상 모으세요.',
        },
        cash_2000: {
          title: '소지금 2,000$ 모으기',
          desc: '누적 소지금을 2,000$ 이상 모으세요.',
        },
        exp_1000: {
          title: '경험치 1000 달성',
          desc: '누적 경험치를 1000 이상 모으세요.',
        },
        exp_2000: {
          title: '경험치 2000 달성',
          desc: '누적 경험치를 2000 이상 모으세요.',
        },
        exp_4000: {
          title: '경험치 4000 달성',
          desc: '누적 경험치를 4000 이상 모으세요.',
        },
        items_owned_5: {
          title: '아이템 5종 보유',
          desc: '상점 아이템을 5개 이상 보유하세요.',
        },
        characters_owned_3: {
          title: '캐릭터 3종 수집',
          desc: '캐릭터를 3명 이상 보유하세요.',
        },
        characters_owned_5: {
          title: '캐릭터 5종 수집',
          desc: '캐릭터를 5명 이상 보유하세요.',
        },
        ropes_1000: {
          title: '로프 1000번 잡기',
          desc: '누적 1000번 로프를 잡으세요.',
        },
        ropes_2000: {
          title: '로프 2000번 잡기',
          desc: '누적 2000번 로프를 잡으세요.',
        },
        ropes_4000: {
          title: '로프 4000번 잡기',
          desc: '누적 4000번 로프를 잡으세요.',
        },
        items_collected_200: {
          title: '아이템 200개 획득',
          desc: '인게임 아이템을 200번 획득하세요.',
        },
        items_collected_400: {
          title: '아이템 400개 획득',
          desc: '인게임 아이템을 400번 획득하세요.',
        },
        items_collected_800: {
          title: '아이템 800개 획득',
          desc: '인게임 아이템을 800번 획득하세요.',
        },
      },
      goalClaimed: '보상 {amount}$을 획득했습니다!',
    },
    hud: {
      score: 'SCORE {score}',
      best: 'BEST {best}',
      savings: '$ {amount}',
      fever: 'FEVER',
      power: 'POWER',
      level: 'LV {level}',
    },
    stage: {
      banner: 'STAGE {stage}',
    },
    boss: {
      stageWithNumber: '스테이지 {stage} : 보스전',
      stage: '보스 스테이지',
      bulletHud: '발사 {shots}/{total} | 피격 {hits}/{limit}',
      slamHudProgress: '{current}회 점프 (목표 {goal})',
      slamHudTime: '남은 시간 {seconds}초',
      collectHud: '획득 {collected}/{total} | 놓침 {missed}/{allowed}',
      hud: {
        bullet: '총알을 피하세요!',
        slam: '계속 점프하세요!',
        collect: '떨어지는 상자를 모으세요!',
      },
    },
    bossOutcome: {
      success: '보스를 격파했습니다!',
      failure: '보스 도전에 실패했습니다...',
      rewardCashScore: '+${cash} / +{score}점',
      rewardCash: '+${cash} 획득',
      rewardScore: '+{score}점 획득',
      reason: {
        hit: '공격에 맞았습니다.',
        notEnoughDodge: '회피 횟수가 부족합니다.',
        missedBoxes: '상자를 너무 많이 놓쳤습니다.',
      },
    },
    roulette: {
      title: '',
      spinning: '회전 중...',
      formula: '{before} {op} {value} = {after}',
      locked: 'WOW',
    },
    game: {
      fastToggle: 'FAST MODE: {state}',
      clearMessage: 'GAME CLEAR! 무한 탄막 모드 시작!',
    },
    ads: {
      lifeCounter: '기회 {current}/{max}',
      lifeLoading: '광고 불러오는 중... 잠시만요!',
      lifeRewarded: '기회 +{lives}! 다시 도전해요!',
      lifePartial: '부분 보상: 기회 +{lives} 획득.',
      lifeLimit: '오늘 광고 한도({limit}회)를 모두 사용했습니다.',
      lifeError: '광고 재생 실패. 잠시 후 다시 시도해주세요.',
      lifeErrorWithReason: '({reason}).\n기회 +{lives}을(를) 받았습니다.',
      lifeUnavailable: '현재 광고를 사용할 수 없습니다.',
      lifePrompt: '기회가 없어요! 광고를 보면 충전돼요.',
      lifeTapToWatch: '화면을 터치하면 광고를 보고 기회를 얻습니다.',
    },
    adsShop: {
      title: '광고 상점',
      wizardTitle: '위자드 해제',
      wizardDesc: '광고를 보면 위자드 캐릭터가 해제됩니다.',
      wizardUnlocked: '위자드가 해제되었습니다!',
      cashTitle: '$20 주머니',
      cashDesc: '광고를 보면 바로 20달러를 획득합니다.',
      cashGranted: '${amount}를 소지금에 추가했습니다.',
      watch: '광고 보기',
      loading: '불러오는 중...',
      claimedToday: '오늘은 이미 받았습니다.',
      adNotCompleted: '보상을 받으려면 광고를 끝까지 시청하세요.',
      noFill: '현재 재생할 광고가 없습니다. 잠시 후 다시 시도해 주세요.',
      nativeOnly: '이 기능은 앱 버전에서만 이용할 수 있습니다.',
      alreadyOwned: '이미 해제된 캐릭터입니다.',
    },
    gameOver: {
      title: 'GAME OVER',
      demoLossLine1: '모든 것을 잃었습니다.',
      demoLossLine2: '이제 작은 알이 됩니다.',
      nextDemo: '111P를 넘겨 보세요',
      nextDemoRuns: '{runs}회 더 플레이!',
      nextLevel: '다음 레벨까지 {remaining}P 남음',
      maxLevel: '최대 레벨에 도달했습니다!',
      earned: '획득: ${money} / +{exp}P',
      earnedHint: '점수 5 이상이면 $와 경험치를 얻습니다',
      tipLabel: '팁',
      tips: {
        jumpItem: '어렵다면 점프+ 아이템을 목표로 하세요.',
        wizard: '위자드는 점수를 많이 얻지는 못해요.',
        fever: '피버는 콤보를 쉽게 이어줍니다.',
        records: '기록을 달성하면 보상이 있습니다.',
        scoreHint: '5P를 넘겨야 돈과 경험치를 받을 수 있어요.',
        airJump: '공중에서 추가 점프를 해보세요.',
      },
      stats: '경험치: {exp}P | ${savings}',
      rouletteResult: '룰렛: {before} {op} {value} = {after}',
      roulettePending: '룰렛: {op} {value}',
      levelUp: 'LEVEL UP! LV {level}',
      retryCountdown: '다시 시작까지 {seconds}초',
      retryReady: '아무곳이나 클릭하면 재시작',
    },
    shop: {
      charactersTitle: '캐릭터',
      itemsTitle: '아이템',
      selected: '선택됨',
      owned: '보유',
      ownedTag: '[보유]',
      lockTag: 'LV {level}',
      levelTag: 'LV {level}',
      balance: '소지금: ${amount}',
      specialTag: '특별 조건',
      lockedLevel: 'LV {level} 필요',
      lockedFunds: '${amount} 필요',
      lockedSpecial: '특별 조건이 필요합니다',
      price: '${amount}',
      itemLevel: 'Lv. {level}',
      soldOut: 'SOLD OUT',
      maxed: 'MAX',
      itemsHelpTitle: '아이템 설명',
      characterInfoTitle: '캐릭터 정보',
      confirmPurchase: '{name}을(를) ${amount}에 구매할까요?',
      confirmSelectCharacter: '{name}을(를) 선택할까요?',
      error: {
        level: 'LV {level}이(가) 필요합니다',
        funds: '${amount}이 부족합니다',
        alreadyPurchased: '이미 구매했습니다',
        special: '특별 조건을 충족해야 합니다',
      },
    },
    effects: {
      stageBonus: '+${cash}',
      cashPickup: '+$',
      cashEarned: '+${cash}',
      pointsEarned: '+{points}P',
      slow: '슬로우!',
      comboCount: '{combo} COMBO',
      tailorBonus: '+{amount}',
      revive: '부활!',
      budsProtect: '버즈!',
    },
    items: {
      glow: {
        name: '글로우',
        description: '레벨마다 캐치 반경이 10% 늘고 빛나는 효과가 생깁니다 (최대 3).',
      },
      buds: {
        name: '버즈',
        description: '회전 구슬이 로프·아이템을 대신 잡아주고 탄환을 막아 줍니다 (최대 6개).',
      },
      plusjump: {
        name: '+점프',
        description: '공중에서 한 번 더 점프할 수 있습니다.',
      },
      powerjump: {
        name: '파워 점프',
        description: '런마다 한 번 차지 점프를 사용할 수 있습니다.',
      },
      fly: {
        name: '플라이',
        description: '런당 한 번, 길게 눌러 비행할 수 있습니다.',
      },
      big: {
        name: '빅',
        description: '레벨당 몸집이 2.5% 커집니다.',
      },
      gamble: {
        name: '갬블',
        description: '다음 런의 돈과 경험치가 1.5배가 되고 한 번 사용 후 사라집니다.',
      },
      magnet: {
        name: '마그넷',
        description: '근처 상자를 끌어당기고 레벨당 +10px 범위가 증가합니다.',
      },
      combo: {
        name: '콤보+',
        description: '콤보 캐치마다 레벨당 +1 점이 추가됩니다.',
      },
      slow: {
        name: '슬로',
        description: '점프 시 레벨당 10% 확률로 잠시 뒤 슬로모션이 발동합니다.',
      },
      lucky: {
        name: '럭키',
        description: '아이템 상자 출현 확률이 레벨당 +5% 증가합니다.',
      },
      revival: {
        name: '부활',
        description: '땅에 떨어질 때 로봇 구조가 실패하면 한 번 더 부활합니다.',
      },
      startskill: {
        name: '스타트 스킬',
        description: '런 시작 시 스킬 카드 선택을 받을 수 있습니다.',
      },
      fever: {
        name: '피버+',
        description: '스타 모드 지속 시간이 레벨당 +1초 늘어납니다.',
      },
      skill_card_plus: {
        name: '스킬카드+',
        description: '스킬 선택 팝업에서 카드가 한 장 더 등장합니다.',
      },
      skill_reroll: {
        name: '스킬 리롤',
        description: '레벨마다 런당 스킬 리롤 횟수가 +1 증가합니다 (최대 3).',
      },
    },
    chars: {
      default: {
        name: '폴리곤',
        summary: '레벨에 따라\n형태가 변합니다',
        help: '레벨이 오를수록 다각형 모양이 늘어납니다.',
      },
      robot: {
        name: '로봇',
        summary: '낙하 시 한 번\n구조 로프',
        help: '땅에 부딪히면 자동으로 구조 로프를 발사합니다.',
      },
      ninja: {
        name: '닌자',
        summary: '공중 점프가\n1회 추가됩니다',
        help: '민첩한 탈출을 위해 공중 점프를 \n한 번 더 제공합니다.',
      },
      pirate: {
        name: '해적',
        summary: '콤보마다\n+$2 보너스',
        help: '콤보 캐치마다 $2 추가 보상을 줍니다.',
      },
      wizard: {
        name: '위자드',
        summary: '부드러운 둥실\n점프와 착지',
        help: '점프 후 천천히 떠다니며 부드럽게 착지합니다.',
      },
      knight: {
        name: '나이트',
        summary: '점수/수익 2배\n공중 점프 -1',
        help: '점수와 수익이 두 배가 되지만 공중 점프가 1회 감소합니다.',
      },
      tailor: {
        name: '테일러',
        summary: '추가 로프\n잡으면 +$1',
        help: '50% 확률로 아래에 로프를 생성하고\n잡으면 $1을 얻습니다.',
      },
      springman: {
        name: '스프링맨',
        summary: '붙어있을 때\n파워 점프',
        help: '로프에 매달린 채로 누르고 있으면 파워 게이지가\n생기고 더 멀리 점프합니다.',
      },
      bird: {
        name: '버드',
        summary: '언제든지\n플라이 사용',
        help: '플라이 아이템을 보유하면 언제든지 비행을 \n발동할 수 있습니다.',
      },
    },
    skills: {
      overlay: {
        title: '스킬 선택',
        timer: '{seconds}초 후 자동 선택',
        rolling: '카드 뒤집는 중... {seconds}초',
        flipping: '카드 뒤집기',
        rolling: '셔플 중... {seconds}초',
        help: '설명',
        helpClose: '닫기',
        reroll: '다시 뽑기',
        rerollCount: '다시 뽑기 ×{count}',
        hudTitle: '스킬',
        emptyHud: '획득한 스킬 없음',
        levelLabel: 'Lv {level}',
        requires: '필요 조건: {list}',
        iconModePixel: '아이콘: 픽셀',
        iconModeHi: '아이콘: 고해상도',
      },
      cards: {
        power_boost: {
          name: '차지 임팩트',
          level1: '로프 점프 추진력 +30%.',
        level2: '로프 점프 추진력 +60%.',
        level3: '로프 점프 추진력 +90%.',
        },
        rope_glide: {
          name: '로프 글라이드',
          level1: '로프 잡기 히트박스 +5px.',
          level2: '로프 잡기 히트박스 +10px.',
          level3: '로프 잡기 히트박스 +20px.',
        },
        air_combo: {
          name: '에어 콤보',
          level1: '20% 확률로 공중 점프 캐치도 콤보 유지.',
        level2: '40% 확률로 공중 점프 캐치도 콤보 유지.',
        level3: '60% 확률 + 성공 시 추가 $1.',
        },
        drone_support: {
          name: '서포트 드론',
          level1: '충돌 시 멈춰 로프가 되는 드론 1기',
        level2: '드론 멈춤 히트박스 확대.',
        level3: '드론 2기 소환, 큰 히트박스.',
        },
        cash_magnet: {
          name: '캐시 마그넷',
          level1: '아이템 흡입 반경 +15px.',
        level2: '아이템 흡입 반경 +30px.',
        level3: '아이템 흡입 반경 +50px, 상자 +$1.',
        },
        stage_focus: {
          name: '스테이지 포커스',
          level1: '스테이지 전환에 필요한 로프 개수 1 감소.',
        level2: '스테이지 전환에 필요한 로프 개수 2 감소.',
        level3: '스테이지 전환에 필요한 로프 개수 3 감소.',
        },
        fever_extension: {
          name: '피버 익스텐션',
          level1: '피버 지속 +20%.',
        level2: '피버 지속 +35%.',
        level3: '피버 지속 +50% + 피버 진입 시 즉시 파워 충전.',
        },
        rope_shortener: {
          name: '로프 쇼트너',
          level1: '주요 로프 간격 5% 감소.',
        level2: '주요 로프 간격 10% 감소.',
        level3: '주요 로프 간격 15% 감소 + 주기적 자동 최적화.',
        },
        sky_harvest: {
          name: '스카이 하베스트',
          level1: '공중 아이템 +$1.',
        level2: '공중 아이템 +$2.',
        level3: '공중 아이템 +$3 + EXP +1.',
        },
        void_magnet: {
          name: '보이드 마그넷',
          level1: '20초마다 주변 아이템을 끌어모으는 블랙홀 생성.',
        level2: '블랙홀 흡입 반경 증가.',
        level3: '블랙홀에 빨려든 아이템당 +$2.',
        },
        spider_guard: {
          name: '스파이더 가드',
          level1: '맵을 순찰하며 거미줄 트램폴린 생성.',
        level2: '트램폴린 높이·지속 증가.',
        level3: '트램폴린을 2개까지 생성해 더 넓은 범위 보호.',
        },
        frenzy_feather: {
          name: '프렌지 페더',
          level1: '피버 중 0.2초마다 +$1 획득(캐릭터 위 표시)·콤보 보너스(점수/돈) 5배.',
        },
        combo_master: {
          name: '콤보 마스터',
          level1: '모든 로프 캐치가 콤보를 유지.',
        level2: '공중 점프 캐치도 콤보 유지.',
        level3: '콤보당 추가 $1.',
        },
        drone_collector: {
          name: '드론 콜렉터',
          level1: '정지한 드론이 주변 아이템을 흡수.',
        level2: '흡수 반경 대폭 확대.',
        level3: '두 드론이 넓은 범위 아이템 흡수.',
        },
      },
    },
  };

  function detectInitialLanguage() {
    let isNative = false;
    if (typeof window !== 'undefined') {
      const Cap = window.Capacitor;
      if (Cap) {
        try {
          if (typeof Cap.isNativePlatform === 'function' && Cap.isNativePlatform()) {
            isNative = true;
          }
        } catch (_) {}
        if (!isNative) {
          try {
            const platform = typeof Cap.getPlatform === 'function'
              ? Cap.getPlatform()
              : Cap.platform;
            if (platform && platform !== 'web') {
              isNative = true;
            }
          } catch (_) {}
        }
      }
      if (isNative) {
        const explicit = window.WEBSWING_DEFAULT_LANG;
        if (explicit) {
          const normalized = String(explicit).trim().toLowerCase();
          if (normalized === 'ko' || normalized === 'en') return normalized;
        }
        const locale = window.WEBSWING_DEVICE_LOCALE;
        if (locale) {
          const normalizedLocale = String(locale).trim().toLowerCase();
          if (normalizedLocale.startsWith('ko')) return 'ko';
          if (normalizedLocale.startsWith('en')) return 'en';
        }
      }
    }
    if (typeof navigator !== 'undefined') {
      const navLangs = navigator.languages || [navigator.language || navigator.userLanguage];
      for (const lang of navLangs) {
        if (!lang) continue;
        const lower = String(lang).trim().toLowerCase();
        if (!lower) continue;
        if (lower.startsWith('ko')) return 'ko';
      }
    }
    return 'en';
  }

  Object.keys(translations).forEach((locale) => {
    global.I18N.registerLanguage(locale, translations[locale]);
  });
  global.I18N.init(detectInitialLanguage());
})(typeof window !== 'undefined' ? window : globalThis);
