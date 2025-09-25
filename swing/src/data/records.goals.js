(function (global) {
  const RECORD_GOALS = [
    {
      id: 'first_boss_clear',
      titleKey: 'records.goals.first_boss_clear.title',
      descriptionKey: 'records.goals.first_boss_clear.desc',
      stat: 'bossSuccessCount',
      target: 1,
      reward: 30,
    },
    {
      id: 'cash_500',
      titleKey: 'records.goals.cash_500.title',
      descriptionKey: 'records.goals.cash_500.desc',
      stat: 'totalCashEarned',
      target: 500,
      reward: 20,
    },
    {
      id: 'exp_1000',
      titleKey: 'records.goals.exp_1000.title',
      descriptionKey: 'records.goals.exp_1000.desc',
      stat: 'totalExpEarned',
      target: 1000,
      reward: 25,
    },
    {
      id: 'items_owned_5',
      titleKey: 'records.goals.items_owned_5.title',
      descriptionKey: 'records.goals.items_owned_5.desc',
      stat: 'itemsOwned',
      target: 5,
      reward: 25,
    },
    {
      id: 'characters_owned_3',
      titleKey: 'records.goals.characters_owned_3.title',
      descriptionKey: 'records.goals.characters_owned_3.desc',
      stat: 'charactersOwned',
      target: 3,
      reward: 30,
    },
    {
      id: 'ropes_1000',
      titleKey: 'records.goals.ropes_1000.title',
      descriptionKey: 'records.goals.ropes_1000.desc',
      stat: 'ropesCaught',
      target: 1000,
      reward: 40,
    },
    {
      id: 'items_collected_200',
      titleKey: 'records.goals.items_collected_200.title',
      descriptionKey: 'records.goals.items_collected_200.desc',
      stat: 'itemsCollected',
      target: 200,
      reward: 35,
    },
  ];

  global.RECORD_GOALS = RECORD_GOALS;
})(typeof window !== 'undefined' ? window : globalThis);
