/* Sanctuary — skill trees (global: DATA.skills, DATA.clusters)
   Active skill fields: id, name, cls, cluster, type:'active', tags, element, cost, gen, cd, lucky, dmg (weapon-damage coefficient at rank 1),
   effect (how it behaves in combat), desc (template), up: {e,a,b} upgrades (Enhanced + two variants), weapon (barbarian slot), max (rank cap, default 5)
   Passive fields: type:'passive', max (default 3), mods (per rank), desc with {r} rank-scaled numbers.
   Key passive: type:'key', max 1.
*/
(function () {
  'use strict';
  const skills = [];
  const clusters = {
    necromancer: ['basic', 'core', 'macabre', 'corruption', 'summoning', 'ultimate', 'key'],
    paladin: ['basic', 'core', 'defensive', 'aura', 'judgement', 'ultimate', 'key'],
    barbarian: ['basic', 'core', 'defensive', 'brawling', 'mastery', 'ultimate', 'key'],
    druid: ['basic', 'core', 'defensive', 'companion', 'wrath', 'ultimate', 'key']
  };
  const CLUSTER_NAMES = { basic: 'Basic', core: 'Core', macabre: 'First Macabre', corruption: 'Corruption', summoning: 'Summoning', ultimate: 'Ultimate', key: 'Key Passive', defensive: 'Defensive', aura: 'Aura', judgement: 'Judgement', brawling: 'Brawling', mastery: 'Weapon Mastery', companion: 'Companion', wrath: 'Wrath' };
  const CLUSTER_REQ = [0, 2, 6, 11, 16, 23, 33]; // points spent required to unlock cluster index

  function A(cls, o) { o.cls = cls; o.type = 'active'; o.max = o.max || 5; o.tags = o.tags || []; o.tags.push(o.cluster); skills.push(o); return o; }
  function P(cls, o) { o.cls = cls; o.type = 'passive'; o.max = o.max || 3; skills.push(o); return o; }
  function K(cls, o) { o.cls = cls; o.type = 'key'; o.max = 1; o.cluster = 'key'; skills.push(o); return o; }
  // status shorthands
  const VULN = (d) => ({ st: 'vulnerable', dur: d });
  const SLOW = (p, d) => ({ st: 'slow', pct: p, dur: d });
  const STUN = (d) => ({ st: 'stun', dur: d });
  const BLEED = (c, d) => ({ st: 'bleed', coef: c, dur: d });
  const POISON = (c, d) => ({ st: 'poison', coef: c, dur: d });
  const BURN = (c, d) => ({ st: 'burn', coef: c, dur: d });
  const CHILL = (p, d) => ({ st: 'chill', pct: p, dur: d });
  const FREEZE = (d) => ({ st: 'freeze', dur: d });
  const IMMOB = (d) => ({ st: 'immobilize', dur: d });
  const DAZE = (d) => ({ st: 'daze', dur: d });
  const KNOCK = (d) => ({ st: 'knockdown', dur: d });
  const FEAR = (d) => ({ st: 'fear', dur: d });

  /* ===================================================================== NECROMANCER */
  const N = 'necromancer';
  // --- Basic
  A(N, { id: 'bone_splinters', name: 'Bone Splinters', cluster: 'basic', tags: ['bone', 'ranged'], element: 'physical', gen: 6, lucky: 0.17, dmg: 0.08,
    effect: { kind: 'proj', count: 3, spread: 0.25, speed: 16, range: 11, pierce: 0, radius: 0.5 },
    desc: 'Fire 3 bone splinters, dealing {dmg} damage each. Generates 6 Essence per splinter that hits.',
    up: { e: { name: 'Enhanced Bone Splinters', desc: 'Hitting the same enemy with 2+ splinters grants +1 Essence and 20% Critical Strike Chance for that cast.', mods: [{ p: 'critBonusMulti', set: 0.2 }, { p: 'gen', add: 1 }] },
      a: { name: 'Acolyte\'s Bone Splinters', desc: 'Hits against Vulnerable enemies fire 2 additional splinters.', mods: [{ p: 'extraVsVuln', set: 2 }] },
      b: { name: 'Initiate\'s Bone Splinters', desc: 'Critical Strikes have a 40% chance to make enemies Vulnerable for 2 seconds.', mods: [{ on: 'crit', chance: 0.4, do: { apply: VULN(2) } }] } } });
  A(N, { id: 'decompose', name: 'Decompose', cluster: 'basic', tags: ['darkness', 'ranged', 'channel'], element: 'shadow', gen: 10, lucky: 0.3, dmg: 0.22,
    effect: { kind: 'beam', range: 9, width: 0.8, interval: 0.4, corpseEvery: 2.5 },
    desc: 'Tear the flesh from an enemy, dealing {dmg} damage per tick and forming a Corpse every 2.5 seconds. Generates 10 Essence per second.',
    up: { e: { name: 'Enhanced Decompose', desc: 'While channeling, you and your minions deal 10% increased damage.', mods: [{ p: 'channelBuff', set: 0.1 }] },
      a: { name: 'Acolyte\'s Decompose', desc: 'Decompose Slows enemies by 50% and chains to 2 nearby enemies.', mods: [{ apply: SLOW(0.5, 2) }, { p: 'chain', set: 2 }] },
      b: { name: 'Initiate\'s Decompose', desc: 'Gain 3 Essence each time Decompose forms a Corpse and deals 20% increased damage to Vulnerable.', mods: [{ p: 'corpseEssence', set: 3 }, { p: 'dmgMult', add: 0.2, when: 'target_vuln' }] } } });
  A(N, { id: 'hemorrhage', name: 'Hemorrhage', cluster: 'basic', tags: ['blood', 'melee'], element: 'physical', gen: 8, lucky: 0.35, dmg: 0.3,
    effect: { kind: 'melee', range: 2.2, arc: 1.2, orbChance: 0.2 },
    desc: 'Burst an enemy\'s blood, dealing {dmg} damage. Has a 20% chance to form a Blood Orb. Generates 8 Essence.',
    up: { e: { name: 'Enhanced Hemorrhage', desc: 'After picking up a Blood Orb, Hemorrhage deals 20% increased damage and attacks 20% faster for 4s.', mods: [{ on: 'blood_orb', do: { buff: { id: 'ehem', dur: 4, mods: [{ stat: 'dmg_basic', add: 0.2 }, { stat: 'attack_speed_basic', add: 0.2 }] } } }] },
      a: { name: 'Acolyte\'s Hemorrhage', desc: 'Hemorrhage also deals 25% of its damage to enemies around the target and Fortifies you for 2% of Maximum Life.', mods: [{ p: 'splash', set: 0.25 }, { on: 'hit', do: { fortify: 0.02 } }] },
      b: { name: 'Initiate\'s Hemorrhage', desc: 'Hemorrhage has a 50% chance to form a Blood Orb while you are Healthy.', mods: [{ p: 'orbChance', set: 0.5, when: 'self_healthy' }] } } });
  A(N, { id: 'reap', name: 'Reap', cluster: 'basic', tags: ['darkness', 'melee'], element: 'shadow', gen: 4, lucky: 0.17, dmg: 0.13,
    effect: { kind: 'melee', range: 3.2, arc: 2.6, corpseEvery: 2 },
    desc: 'Sweep an ethereal scythe in front of you, dealing {dmg} damage and forming a Corpse on hitting 1+ enemies (every 2 seconds). Generates 4 Essence per enemy hit.',
    up: { e: { name: 'Enhanced Reap', desc: 'Gain 15% Damage Reduction for 2 seconds after hitting an enemy.', mods: [{ on: 'hit', do: { buff: { id: 'ereap', dur: 2, mods: [{ stat: 'dr', add: 0.15 }] } } }] },
      a: { name: 'Acolyte\'s Reap', desc: 'Reap forms a Corpse every hit if it damages 2+ enemies, and deals 20% increased damage to Slowed enemies.', mods: [{ p: 'corpseOnMulti', set: 1 }, { p: 'dmgMult', add: 0.2, when: 'target_slowed' }] },
      b: { name: 'Initiate\'s Reap', desc: 'Reap gains 30% Attack Speed and Heals you for 3% of Maximum Life per enemy hit.', mods: [{ stat: 'attack_speed_basic', add: 0.3 }, { on: 'hit', do: { heal: 0.03 } }] } } });
  // --- Core
  A(N, { id: 'blight', name: 'Blight', cluster: 'core', tags: ['darkness', 'ranged', 'dot'], element: 'shadow', cost: 25, lucky: 0.5, dmg: 0.5,
    effect: { kind: 'proj', speed: 12, range: 9, radius: 0.6, pierce: 0, aoe: 2.4, ground: { dur: 6, interval: 1, coef: 0.25 } },
    desc: 'Unleash concentrated blight that deals {dmg} damage and leaves behind a defiled area that deals {dmg2} damage per second for 6 seconds.',
    up: { e: { name: 'Enhanced Blight', desc: 'Blight Slows enemies by 25% and its defiled area deals 25% increased damage.', mods: [{ apply: SLOW(0.25, 3) }, { p: 'groundMult', add: 0.25 }] },
      a: { name: 'Paranormal Blight', desc: 'Blight has a 30% chance to Immobilize enemies for 1.5 seconds when it first hits.', mods: [{ on: 'hit', chance: 0.3, do: { apply: IMMOB(1.5) } }] },
      b: { name: 'Supernatural Blight', desc: 'You and your minions deal 15% increased damage to enemies standing in Blight.', mods: [{ stat: 'dmg', add: 0.15, when: 'target_in_zone' }] } } });
  A(N, { id: 'blood_lance', name: 'Blood Lance', cluster: 'core', tags: ['blood', 'ranged'], element: 'physical', cost: 15, lucky: 0.33, dmg: 0.8,
    effect: { kind: 'proj', speed: 18, range: 10, radius: 0.5, pierce: 1, apply: [{ st: 'lanced', dur: 3, coef: 0.1 }] },
    desc: 'Throw a blood lance that lingers in an enemy for 3 seconds, dealing {dmg} damage and {dmg2} per second to the lanced enemy.',
    up: { e: { name: 'Enhanced Blood Lance', desc: 'Blood Lance pierces through enemies who are already lanced, dealing 15% reduced damage after the first.', mods: [{ p: 'pierce', set: 4 }, { p: 'pierceFalloff', set: 0.15 }] },
      a: { name: 'Paranormal Blood Lance', desc: 'Every 8th cast of Blood Lance is guaranteed to Overpower and spawns a Blood Orb.', mods: [{ p: 'empowerEvery', set: 8, empowerOverpower: 1, empowerOrb: 1 }] },
      b: { name: 'Supernatural Blood Lance', desc: 'Blood Lance deals 10% increased damage per lanced enemy nearby, up to 50%.', mods: [{ flag: 'lance_stacking' }] } } });
  A(N, { id: 'blood_surge', name: 'Blood Surge', cluster: 'core', tags: ['blood', 'melee', 'aoe'], element: 'physical', cost: 30, lucky: 0.33, dmg: 0.42,
    effect: { kind: 'nova', radius: 3.5, novaBurst: { radius: 4, coef: 0.95, perDrain: 0.1, max: 0.5 } },
    desc: 'Draw blood from enemies in a radius, dealing {dmg} damage, then expel a blood nova dealing {dmg2} damage. The nova deals 10% increased damage per enemy drained, up to 50%.',
    up: { e: { name: 'Enhanced Blood Surge', desc: 'Blood Surge\'s nova echoes again after 1 second at 50% damage if it hits 4+ enemies.', mods: [{ p: 'echoAt', set: 4 }] },
      a: { name: 'Paranormal Blood Surge', desc: 'If an enemy is damaged by Blood Surge while you are Healthy, gain 1 Essence. Overpowers heal you for 2.5% of Maximum Life.', mods: [{ on: 'hit', when: 'self_healthy', do: { gain: 'resource', amt: 1 } }, { on: 'overpower', do: { heal: 0.025 } }] },
      b: { name: 'Supernatural Blood Surge', desc: 'Blood Surge heals you for 2% of Maximum Life per enemy drained and Fortifies you for 2.5%.', mods: [{ on: 'hit', do: { heal: 0.02, fortify: 0.025 } }] } } });
  A(N, { id: 'bone_spear', name: 'Bone Spear', cluster: 'core', tags: ['bone', 'ranged'], element: 'physical', cost: 25, lucky: 0.5, dmg: 1.0,
    effect: { kind: 'proj', speed: 22, range: 13, radius: 0.6, pierce: 99 },
    desc: 'Conjure a bone spear from the ground, dealing {dmg} damage and piercing through enemies.',
    up: { e: { name: 'Enhanced Bone Spear', desc: 'Bone Spear breaks into 3 shards when it is destroyed, dealing 10% damage each.', mods: [{ p: 'shards', set: 3 }] },
      a: { name: 'Paranormal Bone Spear', desc: 'Bone Spear has 10% increased Critical Strike Chance and fires 2 additional shards on Critical Strike.', mods: [{ p: 'critBonus', add: 0.1 }, { p: 'shardsOnCrit', set: 2 }] },
      b: { name: 'Supernatural Bone Spear', desc: 'Bone Spear makes the first enemy hit Vulnerable for 3 seconds.', mods: [{ on: 'first_hit', do: { apply: VULN(3) } }] } } });
  A(N, { id: 'sever', name: 'Sever', cluster: 'core', tags: ['darkness', 'ranged'], element: 'shadow', cost: 20, lucky: 0.2, dmg: 0.7,
    effect: { kind: 'dash', dist: 7, width: 1.6, spectre: true, returnMult: 0.25 },
    desc: 'A specter of you charges forward and attacks, dealing {dmg} damage, then returns dealing 25% of the damage.',
    up: { e: { name: 'Enhanced Sever', desc: 'Sever deals 25% increased damage to Cursed enemies.', mods: [{ p: 'dmgMult', add: 0.25, when: 'target_cursed' }] },
      a: { name: 'Paranormal Sever', desc: 'Every 4th cast of Sever deals 100% increased damage and makes enemies Vulnerable for 2 seconds.', mods: [{ p: 'empowerEvery', set: 4, empowerMult: 1.0, empowerApply: VULN(2) }] },
      b: { name: 'Supernatural Sever', desc: 'Sever Slows enemies by 40% and generates 2 Essence per enemy hit.', mods: [{ apply: SLOW(0.4, 2) }, { on: 'hit', do: { gain: 'resource', amt: 2 } }] } } });
  P(N, { id: 'unliving_energy', name: 'Unliving Energy', cluster: 'core', desc: 'Your Maximum Essence is increased by {r}.', vals: [3, 6, 9], mods: [{ stat: 'max_resource', add: 3 }] });
  P(N, { id: 'imperfectly_balanced', name: 'Imperfectly Balanced', cluster: 'core', desc: 'Your Core Skills cost {r}% more Essence, but deal {r2}% increased damage.', vals: [3, 6, 9], vals2: [5, 10, 15], mods: [{ stat: 'dmg_core', add: 0.05 }, { flag: 'core_cost_up', v: 0.03 }] });
  P(N, { id: 'hewed_flesh', name: 'Hewed Flesh', cluster: 'core', desc: 'Lucky Hit: Your damage has up to a {r}% chance to form a Corpse at the target\'s location.', vals: [4, 8, 12], mods: [{ on: 'lucky', chance: 0.04, do: { corpse: 1 } }] });
  // --- Macabre
  A(N, { id: 'blood_mist', name: 'Blood Mist', cluster: 'macabre', tags: ['blood', 'defensive'], element: 'physical', cd: 24, lucky: 0.1, dmg: 0.02,
    effect: { kind: 'buff', dur: 3, immune: true, aura: { radius: 2.5, interval: 0.5, coef: 0.02, heal: 0.005 }, moveMult: 0.8, mods: [] },
    desc: 'Disperse into a bloody mist, becoming Immune for 3 seconds. Your Movement Speed is reduced by 20% and you periodically deal {dmg} damage to enemies, healing for 0.5% of your Maximum Life.',
    up: { e: { name: 'Enhanced Blood Mist', desc: 'Casting a Skill that Overpowers reduces Blood Mist\'s cooldown by 2 seconds.', mods: [{ on: 'any_overpower', do: { cdr_skill: 2 } }] },
      a: { name: 'Dreadful Blood Mist', desc: 'Blood Mist Fortifies you for 2% of Maximum Life each time it hits an enemy.', mods: [{ on: 'hit', do: { fortify: 0.02 } }] },
      b: { name: 'Ghastly Blood Mist', desc: 'Blood Mist leaves behind a Corpse every second.', mods: [{ p: 'corpseEvery', set: 1 }] } } });
  A(N, { id: 'bone_prison', name: 'Bone Prison', cluster: 'macabre', tags: ['bone', 'utility'], element: 'physical', cd: 20, lucky: 0, dmg: 0,
    effect: { kind: 'aoeDebuff', at: 'target', radius: 3, apply: { st: 'immobilize', dur: 4 }, essencePerHit: 0 },
    desc: 'Summon a prison of bone around your target area, Immobilizing enemies inside it for 4 seconds.',
    up: { e: { name: 'Enhanced Bone Prison', desc: 'Gain 25 Essence per enemy trapped by Bone Prison.', mods: [{ on: 'hit', do: { gain: 'resource', amt: 25 } }] },
      a: { name: 'Dreadful Bone Prison', desc: 'Enemies trapped by Bone Prison are Vulnerable for 6 seconds.', mods: [{ apply: VULN(6) }] },
      b: { name: 'Ghastly Bone Prison', desc: 'Fortify for 5% of Maximum Life per enemy trapped. Trapped enemies are Slowed by 60% for 6s.', mods: [{ on: 'hit', do: { fortify: 0.05 } }, { apply: SLOW(0.6, 6) }] } } });
  A(N, { id: 'corpse_explosion', name: 'Corpse Explosion', cluster: 'macabre', tags: ['corpse', 'aoe'], element: 'physical', cd: 0, cost: 0, lucky: 0.4, dmg: 0.5,
    effect: { kind: 'corpse', radius: 2.8 },
    desc: 'Detonate the nearest Corpse, dealing {dmg} damage to surrounding enemies.',
    up: { e: { name: 'Enhanced Corpse Explosion', desc: 'Corpse Explosion\'s radius is increased by 15%.', mods: [{ p: 'radius', mul: 1.15 }] },
      a: { name: 'Blighted Corpse Explosion', desc: 'Corpse Explosion becomes a Darkness skill, releasing a miasma that deals {dmg2} Shadow damage over 6 seconds instead.', mods: [{ p: 'element', set: 'shadow' }, { p: 'tagAdd', set: 'darkness' }, { p: 'miasma', set: { dur: 6, interval: 1, coef: 0.19 } }, { p: 'dmgMult', add: -1 }] },
      b: { name: 'Plagued Corpse Explosion', desc: 'Corpse Explosion deals 10% increased damage to enemies that are Slowed, Stunned or Vulnerable. These bonuses stack.', mods: [{ p: 'dmgMult', add: 0.1, when: 'target_slowed' }, { p: 'dmgMult', add: 0.1, when: 'target_stunned' }, { p: 'dmgMult', add: 0.1, when: 'target_vuln' }] } } });
  P(N, { id: 'grim_harvest', name: 'Grim Harvest', cluster: 'macabre', desc: 'Consuming a Corpse generates {r} Essence.', vals: [2, 4, 6], mods: [{ on: 'corpse_consume', do: { gain: 'resource', amt: 2 } }] });
  P(N, { id: 'fueled_by_death', name: 'Fueled by Death', cluster: 'macabre', desc: 'You deal {r}% increased damage for 6 seconds after consuming a Corpse.', vals: [4, 8, 12], mods: [{ on: 'corpse_consume', do: { buff: { id: 'fueled', dur: 6, mods: [{ stat: 'dmg', add: 0.04 }] } } }] });
  P(N, { id: 'spiked_armor', name: 'Spiked Armor', cluster: 'macabre', desc: 'Gain {r} Thorns (scales with level).', vals: [40, 80, 120], mods: [{ stat: 'thorns', add: 40, scaleLevel: true }] });
  P(N, { id: 'skeletal_warrior_mastery', name: 'Skeletal Warrior Mastery', cluster: 'macabre', desc: 'Increase the damage and life of your Skeletal Warriors by {r}%.', vals: [10, 20, 30], mods: [{ minionStat: 'skeleton', stat: 'dmg', add: 0.1 }, { minionStat: 'skeleton', stat: 'life', add: 0.1 }] });
  // --- Corruption (Curses)
  A(N, { id: 'decrepify', name: 'Decrepify', cluster: 'corruption', tags: ['curse', 'darkness'], element: 'shadow', cost: 10, cd: 0, lucky: 0, dmg: 0,
    effect: { kind: 'aoeDebuff', at: 'target', radius: 3.5, apply: { st: 'decrepify', dur: 10, pct: 0.4, dmgRed: 0.2 } },
    desc: 'Curse the target area. Enemies afflicted by Decrepify are Slowed by 40% and deal 20% less damage for 10 seconds.',
    up: { e: { name: 'Enhanced Decrepify', desc: 'Lucky Hit: Enemies affected by Decrepify have up to 15% chance to be Stunned for 2 seconds when damaged.', mods: [{ flag: 'decrepify_stun', v: 0.15 }] },
      a: { name: 'Abhorrent Decrepify', desc: 'Lucky Hit: Enemies affected by Decrepify have up to a 20% chance to reduce your active cooldowns by 1 second when damaged.', mods: [{ flag: 'decrepify_cdr', v: 0.2 }] },
      b: { name: 'Horrid Decrepify', desc: 'When you hit an enemy affected by Decrepify who is below 10% Life, they are instantly killed. Does not work on bosses.', mods: [{ flag: 'decrepify_execute', v: 0.1 }] } } });
  A(N, { id: 'iron_maiden', name: 'Iron Maiden', cluster: 'corruption', tags: ['curse', 'blood'], element: 'physical', cost: 10, cd: 0, lucky: 0, dmg: 0.3,
    effect: { kind: 'aoeDebuff', at: 'target', radius: 3.5, apply: { st: 'iron_maiden', dur: 10, coef: 0.3 } },
    desc: 'Curse the target area. Enemies afflicted by Iron Maiden take {dmg} damage each time they deal direct damage, for 10 seconds.',
    up: { e: { name: 'Enhanced Iron Maiden', desc: 'Iron Maiden no longer costs Essence. Instead, gain 5 Essence for each enemy Cursed.', mods: [{ p: 'cost', set: 0 }, { on: 'hit', do: { gain: 'resource', amt: 5 } }] },
      a: { name: 'Abhorrent Iron Maiden', desc: 'Heal for 5% of Maximum Life when an enemy dies while affected by Iron Maiden.', mods: [{ flag: 'iron_maiden_heal', v: 0.05 }] },
      b: { name: 'Horrid Iron Maiden', desc: 'When at least 3 enemies are affected by Iron Maiden, its damage is increased by 100%.', mods: [{ flag: 'iron_maiden_mass', v: 1.0 }] } } });
  P(N, { id: 'amplify_damage', name: 'Amplify Damage', cluster: 'corruption', desc: 'You deal {r}% increased damage to Cursed enemies.', vals: [3, 6, 9], mods: [{ stat: 'dmg_curse', add: 0.03 }] });
  P(N, { id: 'deaths_reach', name: 'Death\'s Reach', cluster: 'corruption', desc: 'You deal {r}% increased damage to Distant enemies.', vals: [4, 8, 12], mods: [{ stat: 'dmg_distant', add: 0.04 }] });
  P(N, { id: 'gloom', name: 'Gloom', cluster: 'corruption', desc: 'When you deal Shadow damage, you deal {r}% increased Shadow damage for 3 seconds, stacking up to 5 times.', vals: [1, 2, 3], mods: [{ on: 'hit', element: 'shadow', do: { buff: { id: 'gloom', dur: 3, stackMax: 5, mods: [{ stat: 'dmg_shadow', add: 0.01 }] } } }] });
  P(N, { id: 'crippling_darkness', name: 'Crippling Darkness', cluster: 'corruption', desc: 'Lucky Hit: Shadow damage has up to a {r}% chance to Stun for 1 second.', vals: [10, 20, 30], mods: [{ on: 'lucky', element: 'shadow', chance: 0.1, do: { apply: STUN(1) } }] });
  P(N, { id: 'terror', name: 'Terror', cluster: 'corruption', desc: 'Darkness skills deal {r}% bonus damage to Slowed enemies, and {r}% to Stunned or Immobilized. Stacks.', vals: [3, 6, 9], mods: [{ stat: 'dmg_dark', add: 0.03, when: 'target_slowed' }, { stat: 'dmg_dark', add: 0.03, when: 'target_cc' }] });
  P(N, { id: 'deaths_embrace', name: 'Death\'s Embrace', cluster: 'corruption', desc: 'Close enemies take {r}% more damage from you and deal {r}% less damage to you.', vals: [2, 4, 6], mods: [{ stat: 'dmg_close', add: 0.02 }, { stat: 'dr_close', add: 0.02 }] });
  // --- Summoning
  A(N, { id: 'corpse_tendrils', name: 'Corpse Tendrils', cluster: 'summoning', tags: ['corpse', 'darkness'], element: 'shadow', cd: 11, lucky: 0.4, dmg: 0.2,
    effect: { kind: 'corpse', radius: 5, pull: true, apply: [STUN(3)] },
    desc: 'Veins burst out of the nearest Corpse, pulling in enemies, Stunning them for 3 seconds and dealing {dmg} damage.',
    up: { e: { name: 'Enhanced Corpse Tendrils', desc: 'Enemies who are pulled in by Corpse Tendrils are Slowed by 50% for 3 seconds.', mods: [{ apply: SLOW(0.5, 3) }] },
      a: { name: 'Blighted Corpse Tendrils', desc: 'Enemies damaged by Corpse Tendrils are made Vulnerable for 3 seconds.', mods: [{ apply: VULN(3) }] },
      b: { name: 'Plagued Corpse Tendrils', desc: 'Corpse Tendrils has a 25% chance per enemy hit to drop a Blood Orb.', mods: [{ on: 'hit', chance: 0.25, do: { orb: 1 } }] } } });
  A(N, { id: 'bone_spirit', name: 'Bone Spirit', cluster: 'summoning', tags: ['bone', 'ranged'], element: 'physical', cd: 12, lucky: 0.25, dmg: 2.0,
    effect: { kind: 'proj', speed: 9, range: 14, radius: 0.8, pierce: 0, aoe: 3.5, homing: true, consumesAllResource: true },
    desc: 'Consume all of your Essence to conjure a spirit of bone that seeks the nearest enemy and explodes, dealing {dmg} damage, increased by 1% per point of Essence consumed.',
    up: { e: { name: 'Enhanced Bone Spirit', desc: 'If Bone Spirit Critically Strikes, its Cooldown is reduced by 6 seconds. Guaranteed Critical Strike against Healthy enemies.', mods: [{ on: 'crit', do: { cdr_skill: 6 } }, { p: 'critBonus', add: 1, when: 'target_healthy' }] },
      a: { name: 'Dreadful Bone Spirit', desc: 'After Bone Spirit hits an enemy, you generate 30 Essence over 4 seconds.', mods: [{ on: 'first_hit', do: { regen: { amt: 30, dur: 4 } } }] },
      b: { name: 'Ghastly Bone Spirit', desc: 'Bone Spirit has a 10% increased Critical Strike Chance and its explosion radius is 15% larger.', mods: [{ p: 'critBonus', add: 0.1 }, { p: 'aoe', mul: 1.15 }] } } });
  P(N, { id: 'reapers_pursuit', name: 'Reaper\'s Pursuit', cluster: 'summoning', desc: 'Damaging enemies with Darkness skills increases your Movement Speed by {r}% for 3 seconds.', vals: [5, 10, 15], mods: [{ on: 'hit', tag: 'darkness', do: { buff: { id: 'reapers', dur: 3, mods: [{ stat: 'move_speed', add: 0.05 }] } } }] });
  P(N, { id: 'necrotic_carapace', name: 'Necrotic Carapace', cluster: 'summoning', desc: 'When a Corpse is formed from your skills or your minions, Fortify for {r}% of Maximum Life.', vals: [3, 6, 9], mods: [{ on: 'corpse_form', do: { fortify: 0.03 } }] });
  P(N, { id: 'golem_mastery', name: 'Golem Mastery', cluster: 'summoning', desc: 'Increase the damage and life of your Golem by {r}%.', vals: [25, 50, 75], mods: [{ minionStat: 'golem', stat: 'dmg', add: 0.25 }, { minionStat: 'golem', stat: 'life', add: 0.25 }] });
  P(N, { id: 'skeletal_mage_mastery', name: 'Skeletal Mage Mastery', cluster: 'summoning', desc: 'Increase the damage and life of your Skeletal Mages by {r}%.', vals: [20, 40, 60], mods: [{ minionStat: 'mage', stat: 'dmg', add: 0.2 }, { minionStat: 'mage', stat: 'life', add: 0.2 }] });
  P(N, { id: 'serration', name: 'Serration', cluster: 'summoning', desc: 'Your Bone skills have up to {r}% increased Critical Strike Chance based on your current Essence.', vals: [2, 4, 6], mods: [{ flag: 'serration', v: 0.02 }] });
  P(N, { id: 'compound_fracture', name: 'Compound Fracture', cluster: 'summoning', desc: 'After Critically Striking 10 times with Bone skills, your Bone skills deal {r}% increased damage for 5 seconds.', vals: [5, 10, 15], mods: [{ on: 'crit', tag: 'bone', counter: 10, do: { buff: { id: 'cfracture', dur: 5, mods: [{ stat: 'dmg_bone', add: 0.05 }] } } }] });
  P(N, { id: 'rapid_ossification', name: 'Rapid Ossification', cluster: 'summoning', desc: 'Every 100 Essence you spend reduces the Cooldowns of your Bone skills by {r} second(s).', vals: [0.5, 1, 1.5], mods: [{ flag: 'rapid_oss', v: 0.5 }] });
  P(N, { id: 'coalesced_blood', name: 'Coalesced Blood', cluster: 'summoning', desc: 'While Healthy, your Blood skills deal {r}% increased damage.', vals: [6, 12, 18], mods: [{ stat: 'dmg_blood', add: 0.06, when: 'self_healthy' }] });
  P(N, { id: 'tides_of_blood', name: 'Tides of Blood', cluster: 'summoning', desc: 'Your Blood skills deal {r}% increased Overpower damage. This bonus is doubled while Healthy.', vals: [5, 10, 15], mods: [{ stat: 'overpower_dmg', add: 0.05 }, { stat: 'overpower_dmg', add: 0.05, when: 'self_healthy' }] });
  P(N, { id: 'drain_vitality', name: 'Drain Vitality', cluster: 'summoning', desc: 'Lucky Hit: Hitting enemies with Blood skills has up to a {r}% chance to Fortify you for 3% of Maximum Life.', vals: [25, 50, 75], mods: [{ on: 'lucky', tag: 'blood', chance: 0.25, do: { fortify: 0.03 } }] });
  P(N, { id: 'transfusion', name: 'Transfusion', cluster: 'summoning', desc: 'Critical Strikes with Blood skills heal you for {r}% of Maximum Life.', vals: [1, 2, 3], mods: [{ on: 'crit', tag: 'blood', do: { heal: 0.01 } }] });
  P(N, { id: 'gruesome_mending', name: 'Gruesome Mending', cluster: 'summoning', desc: 'While below 50% Life, you receive {r}% more healing from all sources.', vals: [10, 20, 30], mods: [{ stat: 'healing', add: 0.1, when: 'self_below_half' }] });
  P(N, { id: 'bonded_in_essence', name: 'Bonded in Essence', cluster: 'summoning', desc: 'Every 5 seconds, your minions are healed for {r}% of their Maximum Life.', vals: [20, 40, 60], mods: [{ flag: 'minion_heal', v: 0.2 }] });
  P(N, { id: 'inspiring_leader', name: 'Inspiring Leader', cluster: 'summoning', desc: 'While Healthy, you and your minions gain {r}% Attack Speed.', vals: [4, 8, 12], mods: [{ stat: 'attack_speed', add: 0.04, when: 'self_healthy' }, { stat: 'minion_attack_speed', add: 0.04, when: 'self_healthy' }] });
  P(N, { id: 'hellbent_commander', name: 'Hellbent Commander', cluster: 'summoning', desc: 'Your minions deal {r}% increased damage.', vals: [10, 20, 30], mods: [{ stat: 'dmg_summon', add: 0.1 }] });
  P(N, { id: 'deaths_defense', name: 'Death\'s Defense', cluster: 'summoning', desc: 'Your minions cannot lose more than {r}% of their Maximum Life from a single damage instance.', vals: [60, 45, 30], mods: [{ flag: 'minion_dmg_cap', v: 0.6 }] });
  P(N, { id: 'cult_leader', name: 'Cult Leader', cluster: 'summoning', desc: 'Your minions have {r}% increased Attack Speed and take {r2}% less damage.', vals: [5, 10, 15], vals2: [10, 20, 30], mods: [{ stat: 'minion_attack_speed', add: 0.05 }, { stat: 'minion_dr', add: 0.1 }] });
  // --- Ultimate
  A(N, { id: 'army_of_the_dead', name: 'Army of the Dead', cluster: 'ultimate', tags: ['summoning', 'bone'], element: 'physical', cd: 70, lucky: 0, dmg: 0.6, max: 1,
    effect: { kind: 'summon', minion: 'volatile_skeleton', count: 7, dur: 7, stagger: 0.8 },
    desc: 'Call forth the deep buried dead. Volatile Skeletons emerge over 7 seconds that explode, dealing {dmg} damage to nearby enemies.',
    up: { e: { name: 'Prime Army of the Dead', desc: 'Army of the Dead\'s skeletons have a 30% chance to leave behind a Corpse when they explode.', mods: [{ p: 'corpseChance', set: 0.3 }] },
      a: { name: 'Supreme Army of the Dead', desc: 'When you cast Army of the Dead, your Skeletal Warriors and Mages are revived and Fortify you for 30% of Maximum Life.', mods: [{ on: 'cast', do: { reviveMinions: 1, fortify: 0.3 } }] } } });
  A(N, { id: 'blood_wave', name: 'Blood Wave', cluster: 'ultimate', tags: ['blood', 'ranged'], element: 'physical', cd: 50, lucky: 0.2, dmg: 1.2, max: 1,
    effect: { kind: 'proj', speed: 8, range: 12, radius: 2.2, pierce: 99, apply: [KNOCK(1.5)] },
    desc: 'Conjure a tidal wave of blood that deals {dmg} damage and Knocks Down enemies.',
    up: { e: { name: 'Prime Blood Wave', desc: 'Blood Wave Slows enemies by 50% for 4 seconds. Enemies hit are Vulnerable for 4 seconds.', mods: [{ apply: SLOW(0.5, 4) }, { apply: VULN(4) }] },
      a: { name: 'Supreme Blood Wave', desc: 'Blood Wave spawns a Blood Orb for each enemy hit (up to 3) and deals 30% increased damage.', mods: [{ on: 'hit', do: { orb: 1 } }, { p: 'dmgMult', add: 0.3 }] } } });
  A(N, { id: 'bone_storm', name: 'Bone Storm', cluster: 'ultimate', tags: ['bone', 'aoe'], element: 'physical', cd: 60, lucky: 0.1, dmg: 0.25, max: 1,
    effect: { kind: 'buff', dur: 10, aura: { radius: 3.5, interval: 0.3, coef: 0.25 }, mods: [{ stat: 'dr', add: 0.15 }] },
    desc: 'A swirling storm of bones appears around you, dealing {dmg} damage to surrounding enemies for 10 seconds. You take 15% less damage.',
    up: { e: { name: 'Prime Bone Storm', desc: 'Your Damage Reduction is increased by an additional 15% while Bone Storm is active and Critical Strikes reduce its Cooldown by 1s.', mods: [{ p: 'mods', push: { stat: 'dr', add: 0.15 } }, { on: 'crit', do: { cdr_skill: 1 } }] },
      a: { name: 'Supreme Bone Storm', desc: 'Bone Storm\'s Critical Strike Chance is increased by 20% and enemies hit by it are Vulnerable for 2 seconds.', mods: [{ p: 'critBonus', add: 0.2 }, { apply: VULN(2) }] } } });
  P(N, { id: 'stand_alone', name: 'Stand Alone', cluster: 'ultimate', desc: 'Increases Damage Reduction by {r}%, reduced by 2% for each active minion.', vals: [6, 12, 18], mods: [{ flag: 'stand_alone', v: 0.06 }] });
  P(N, { id: 'memento_mori', name: 'Memento Mori', cluster: 'ultimate', desc: 'Sacrificing both Skeletal Warriors and Skeletal Mages increases the Sacrifice bonuses by {r}%.', vals: [20, 40, 60], mods: [{ flag: 'memento_mori', v: 0.2 }] });
  // --- Key passives
  K(N, { id: 'ossified_essence', name: 'Ossified Essence', desc: 'Your Bone skills deal 1% increased damage for each point of Essence you have above 50 upon cast.', mods: [{ flag: 'ossified_essence' }] });
  K(N, { id: 'rathmas_vigor', name: 'Rathma\'s Vigor', desc: 'Increase your Maximum Life by 10%. After being Healthy for 12 seconds, your next Blood skill Overpowers.', mods: [{ stat: 'life_pct', add: 0.1 }, { flag: 'rathmas_vigor' }] });
  K(N, { id: 'shadowblight', name: 'Shadowblight', desc: 'Shadow damage infects enemies with Shadowblight for 2 seconds. Every 10th Shadow hit against a Shadowblighted enemy deals bonus Shadow damage equal to 150% of weapon damage.', mods: [{ flag: 'shadowblight' }] });
  K(N, { id: 'kalans_edict', name: 'Kalan\'s Edict', desc: 'After you have not taken damage in the last 3 seconds, your minions gain 15% Attack Speed. While you have at least 7 minions, this bonus is doubled.', mods: [{ flag: 'kalans_edict' }] });

  /* ===================================================================== PALADIN */
  const PA = 'paladin';
  A(PA, { id: 'smite', name: 'Smite', cluster: 'basic', tags: ['holy', 'melee'], element: 'holy', gen: 10, lucky: 0.4, dmg: 0.33,
    effect: { kind: 'melee', range: 2.4, arc: 1.4 },
    desc: 'Strike an enemy with your shield-arm, dealing {dmg} Holy damage. Generates 10 Faith.',
    up: { e: { name: 'Enhanced Smite', desc: 'Smite has a 30% chance to Daze enemies for 2 seconds.', mods: [{ on: 'hit', chance: 0.3, do: { apply: DAZE(2) } }] },
      a: { name: 'Blessed Smite', desc: 'Smite deals 30% increased damage to Crowd Controlled enemies and generates 4 additional Faith when it hits them.', mods: [{ p: 'dmgMult', add: 0.3, when: 'target_cc' }, { on: 'hit', when: 'target_cc', do: { gain: 'resource', amt: 4 } }] },
      b: { name: 'Fervent Smite', desc: 'Each Smite grants 5% Attack Speed for 3 seconds, up to 25%.', mods: [{ on: 'hit', do: { buff: { id: 'fervent', dur: 3, stackMax: 5, mods: [{ stat: 'attack_speed', add: 0.05 }] } } }] } } });
  A(PA, { id: 'holy_bolt', name: 'Holy Bolt', cluster: 'basic', tags: ['holy', 'ranged'], element: 'holy', gen: 8, lucky: 0.35, dmg: 0.3,
    effect: { kind: 'proj', speed: 18, range: 11, radius: 0.5, pierce: 0 },
    desc: 'Hurl a bolt of holy light, dealing {dmg} Holy damage. Generates 8 Faith.',
    up: { e: { name: 'Enhanced Holy Bolt', desc: 'Holy Bolt pierces its first target and deals 15% increased damage to Distant enemies.', mods: [{ p: 'pierce', set: 1 }, { p: 'dmgMult', add: 0.15, when: 'target_distant' }] },
      a: { name: 'Blessed Holy Bolt', desc: 'Holy Bolt Heals you for 2% of Maximum Life when it Critically Strikes.', mods: [{ on: 'crit', do: { heal: 0.02 } }] },
      b: { name: 'Fervent Holy Bolt', desc: 'Every 3rd cast fires 2 additional bolts.', mods: [{ p: 'empowerEvery', set: 3, empowerCount: 2 }] } } });
  A(PA, { id: 'righteous_strike', name: 'Righteous Strike', cluster: 'basic', tags: ['physical', 'melee'], element: 'physical', gen: 12, lucky: 0.5, dmg: 0.38,
    effect: { kind: 'melee', range: 2.4, arc: 1.0 },
    desc: 'A heavy overhead blow dealing {dmg} damage. Generates 12 Faith.',
    up: { e: { name: 'Enhanced Righteous Strike', desc: 'Righteous Strike has a 10% increased Critical Strike Chance against Healthy enemies.', mods: [{ p: 'critBonus', add: 0.1, when: 'target_healthy' }] },
      a: { name: 'Blessed Righteous Strike', desc: 'Critical Strikes with Righteous Strike make the enemy Vulnerable for 2 seconds.', mods: [{ on: 'crit', do: { apply: VULN(2) } }] },
      b: { name: 'Fervent Righteous Strike', desc: 'Righteous Strike Fortifies you for 3% of Maximum Life on hit.', mods: [{ on: 'hit', do: { fortify: 0.03 } }] } } });
  A(PA, { id: 'sacred_sweep', name: 'Sacred Sweep', cluster: 'basic', tags: ['holy', 'melee'], element: 'holy', gen: 5, lucky: 0.25, dmg: 0.2,
    effect: { kind: 'melee', range: 3.0, arc: 3.1 },
    desc: 'Sweep your weapon around you dealing {dmg} Holy damage to all nearby enemies. Generates 5 Faith per enemy hit.',
    up: { e: { name: 'Enhanced Sacred Sweep', desc: 'Sacred Sweep Slows enemies by 30% for 2 seconds.', mods: [{ apply: SLOW(0.3, 2) }] },
      a: { name: 'Blessed Sacred Sweep', desc: 'Gain 8% Damage Reduction for 3 seconds if Sacred Sweep hits 3+ enemies.', mods: [{ on: 'multi_hit', count: 3, do: { buff: { id: 'bsweep', dur: 3, mods: [{ stat: 'dr', add: 0.08 }] } } }] },
      b: { name: 'Fervent Sacred Sweep', desc: 'Sacred Sweep deals 25% increased damage to Close enemies.', mods: [{ p: 'dmgMult', add: 0.25, when: 'target_close' }] } } });
  // Core
  A(PA, { id: 'zeal', name: 'Zeal', cluster: 'core', tags: ['physical', 'melee'], element: 'physical', cost: 20, lucky: 0.3, dmg: 0.5,
    effect: { kind: 'melee', range: 2.4, arc: 1.2, hits: 3, hitInterval: 0.12 },
    desc: 'Attack in a frenzy of 3 rapid strikes, each dealing {dmg} damage.',
    up: { e: { name: 'Enhanced Zeal', desc: 'Each strike of Zeal increases your Attack Speed by 4% for 4 seconds, up to 20%.', mods: [{ on: 'hit', do: { buff: { id: 'zeal', dur: 4, stackMax: 5, mods: [{ stat: 'attack_speed', add: 0.04 }] } } }] },
      a: { name: 'Blessed Zeal', desc: 'Zeal\'s final strike deals 50% increased damage and makes enemies Vulnerable for 2 seconds.', mods: [{ p: 'lastHitMult', set: 1.5 }, { p: 'lastHitApply', set: VULN(2) }] },
      b: { name: 'Fervent Zeal', desc: 'Zeal gains 2 additional strikes and each strike restores 1% of Maximum Life.', mods: [{ p: 'hits', add: 2 }, { on: 'hit', do: { heal: 0.01 } }] } } });
  A(PA, { id: 'blessed_hammer', name: 'Blessed Hammer', cluster: 'core', tags: ['holy', 'ranged', 'aoe'], element: 'holy', cost: 25, lucky: 0.33, dmg: 0.6,
    effect: { kind: 'orbit', count: 1, radius: 3.2, dur: 2.5, speed: 5, hitRadius: 0.9, interval: 0.35 },
    desc: 'Summon a spinning hammer of holy light that orbits you for 2.5 seconds, dealing {dmg} Holy damage to enemies it passes through.',
    up: { e: { name: 'Enhanced Blessed Hammer', desc: 'Blessed Hammer summons 2 hammers.', mods: [{ p: 'count', set: 2 }] },
      a: { name: 'Blessed Blessed Hammer', desc: 'Hammers deal 25% increased damage to Crowd Controlled enemies and Slow by 30%.', mods: [{ p: 'dmgMult', add: 0.25, when: 'target_cc' }, { apply: SLOW(0.3, 1.5) }] },
      b: { name: 'Fervent Blessed Hammer', desc: 'Hammers orbit for 1.5 additional seconds and gain 10% Critical Strike Chance.', mods: [{ p: 'dur', add: 1.5 }, { p: 'critBonus', add: 0.1 }] } } });
  A(PA, { id: 'fist_of_the_heavens', name: 'Fist of the Heavens', cluster: 'core', tags: ['holy', 'lightning', 'ranged', 'aoe'], element: 'lightning', cost: 30, lucky: 0.4, dmg: 0.9,
    effect: { kind: 'aoe', at: 'target', radius: 2.4, delay: 0.3, bolts: { count: 2, coef: 0.3 } },
    desc: 'Call down a fist of lightning on the target, dealing {dmg} Lightning damage and releasing 2 holy bolts that seek nearby enemies for {dmg2} Holy damage.',
    up: { e: { name: 'Enhanced Fist of the Heavens', desc: 'Fist of the Heavens Stuns enemies for 1.5 seconds.', mods: [{ apply: STUN(1.5) }] },
      a: { name: 'Blessed Fist of the Heavens', desc: 'Releases 2 additional holy bolts. Bolts deal 40% increased damage.', mods: [{ p: 'boltsCount', add: 2 }, { p: 'boltsMult', add: 0.4 }] },
      b: { name: 'Fervent Fist of the Heavens', desc: 'Critical Strikes with Fist of the Heavens refund 15 Faith.', mods: [{ on: 'crit', do: { gain: 'resource', amt: 15 } }] } } });
  A(PA, { id: 'holy_shock', name: 'Holy Shock', cluster: 'core', tags: ['holy', 'lightning', 'ranged'], element: 'lightning', cost: 18, lucky: 0.45, dmg: 0.55,
    effect: { kind: 'chain', range: 9, jumps: 4, jumpRange: 4.5, falloff: 0.1 },
    desc: 'Release a bolt of sacred lightning that deals {dmg} Lightning damage and chains to up to 4 additional enemies.',
    up: { e: { name: 'Enhanced Holy Shock', desc: 'Holy Shock chains to 2 additional enemies.', mods: [{ p: 'jumps', add: 2 }] },
      a: { name: 'Blessed Holy Shock', desc: 'Holy Shock deals 30% increased damage to Vulnerable enemies and heals 1% Life per enemy chained.', mods: [{ p: 'dmgMult', add: 0.3, when: 'target_vuln' }, { on: 'hit', do: { heal: 0.01 } }] },
      b: { name: 'Fervent Holy Shock', desc: 'Lucky Hit: up to 30% chance to Stun enemies for 1 second.', mods: [{ on: 'lucky', chance: 0.3, do: { apply: STUN(1) } }] } } });
  A(PA, { id: 'charge', name: 'Charge', cluster: 'core', tags: ['physical', 'mobility'], element: 'physical', cost: 15, cd: 4, lucky: 0.4, dmg: 0.75,
    effect: { kind: 'dash', dist: 7, width: 1.6, apply: [KNOCK(1.0)] },
    desc: 'Charge forward, dealing {dmg} damage to enemies in your path and knocking them down.',
    up: { e: { name: 'Enhanced Charge', desc: 'Charge\'s Cooldown is reset if it hits an Elite.', mods: [{ on: 'hit', when: 'target_elite', do: { reset_skill: 1 } }] },
      a: { name: 'Blessed Charge', desc: 'Enemies hit by Charge are Vulnerable for 3 seconds.', mods: [{ apply: VULN(3) }] },
      b: { name: 'Fervent Charge', desc: 'Charge grants 20% Movement Speed for 3 seconds and generates 10 Faith per enemy hit.', mods: [{ on: 'cast', do: { buff: { id: 'fcharge', dur: 3, mods: [{ stat: 'move_speed', add: 0.2 }] } } }, { on: 'hit', do: { gain: 'resource', amt: 10 } }] } } });
  P(PA, { id: 'conviction', name: 'Conviction', cluster: 'core', desc: 'Core skills deal {r}% increased damage to Healthy enemies.', vals: [4, 8, 12], mods: [{ stat: 'dmg_core', add: 0.04, when: 'target_healthy' }] });
  P(PA, { id: 'devotion', name: 'Devotion', cluster: 'core', desc: 'Faith generation increased by {r}%.', vals: [5, 10, 15], mods: [{ stat: 'resource_gen', add: 0.05 }] });
  P(PA, { id: 'zealots_focus', name: 'Zealot\'s Focus', cluster: 'core', desc: 'Critical Strike Chance increased by {r}% against Close enemies.', vals: [3, 6, 9], mods: [{ stat: 'crit_chance', add: 0.03, when: 'target_close' }] });
  // Defensive
  A(PA, { id: 'holy_shield', name: 'Holy Shield', cluster: 'defensive', tags: ['holy', 'defensive'], element: 'holy', cd: 18, lucky: 0, dmg: 0,
    effect: { kind: 'shield', barrier: 0.3, dur: 6, mods: [{ stat: 'block_chance', add: 0.2 }] },
    desc: 'Raise your shield in prayer, gaining a Barrier for 30% of Maximum Life and 20% Block Chance for 6 seconds.',
    up: { e: { name: 'Enhanced Holy Shield', desc: 'While Holy Shield is active, you gain 15% Damage Reduction.', mods: [{ p: 'mods', push: { stat: 'dr', add: 0.15 } }] },
      a: { name: 'Protective Holy Shield', desc: 'Casting Holy Shield Fortifies you for 20% of Maximum Life.', mods: [{ on: 'cast', do: { fortify: 0.2 } }] },
      b: { name: 'Zealous Holy Shield', desc: 'While you have a Barrier, you deal 15% increased damage.', mods: [{ stat: 'dmg_barrier', add: 0.15 }] } } });
  A(PA, { id: 'cleansing', name: 'Cleansing', cluster: 'defensive', tags: ['holy', 'defensive'], element: 'holy', cd: 22, lucky: 0, dmg: 0,
    effect: { kind: 'buff', dur: 5, cleanse: true, unstoppable: true, mods: [{ stat: 'dr_dot', add: 0.5 }] },
    desc: 'Purge all Crowd Control and damage over time effects, becoming Unstoppable for 5 seconds. You take 50% less damage over time during this.',
    up: { e: { name: 'Enhanced Cleansing', desc: 'Cleansing Heals you for 15% of Maximum Life.', mods: [{ on: 'cast', do: { heal: 0.15 } }] },
      a: { name: 'Protective Cleansing', desc: 'Cleansing grants 25% Movement Speed for its duration.', mods: [{ p: 'mods', push: { stat: 'move_speed', add: 0.25 } }] },
      b: { name: 'Zealous Cleansing', desc: 'Cleansing restores 30 Faith.', mods: [{ on: 'cast', do: { gain: 'resource', amt: 30 } }] } } });
  A(PA, { id: 'prayer', name: 'Prayer', cluster: 'defensive', tags: ['holy', 'defensive'], element: 'holy', cd: 25, lucky: 0, dmg: 0,
    effect: { kind: 'buff', dur: 8, regen: { heal: 0.03, interval: 1 }, mods: [] },
    desc: 'Pray for 8 seconds, healing 3% of your Maximum Life every second.',
    up: { e: { name: 'Enhanced Prayer', desc: 'Prayer also Fortifies you for 2% of Maximum Life every second.', mods: [{ p: 'fortifyTick', set: 0.02 }] },
      a: { name: 'Protective Prayer', desc: 'While Prayer is active, you take 10% less damage.', mods: [{ p: 'mods', push: { stat: 'dr', add: 0.1 } }] },
      b: { name: 'Zealous Prayer', desc: 'Prayer\'s healing is doubled while you are Injured.', mods: [{ p: 'injuredDouble', set: 1 }] } } });
  A(PA, { id: 'defiance', name: 'Defiance', cluster: 'defensive', tags: ['defensive', 'utility'], element: 'physical', cd: 20, lucky: 0, dmg: 0,
    effect: { kind: 'buff', dur: 6, mods: [{ stat: 'armor_pct', add: 0.5 }, { stat: 'res_all', add: 0.15 }] },
    desc: 'Plant your feet, increasing Armor by 50% and all Resistances by 15% for 6 seconds.',
    up: { e: { name: 'Enhanced Defiance', desc: 'Defiance Taunts nearby enemies for 3 seconds.', mods: [{ p: 'tauntRadius', set: 5 }] },
      a: { name: 'Protective Defiance', desc: 'Defiance\'s duration is increased by 3 seconds.', mods: [{ p: 'dur', add: 3 }] },
      b: { name: 'Zealous Defiance', desc: 'While Defiance is active, your Thorns are increased by 100%.', mods: [{ p: 'mods', push: { stat: 'thorns_pct', add: 1.0 } }] } } });
  P(PA, { id: 'bulwark', name: 'Bulwark', cluster: 'defensive', desc: 'Block Chance increased by {r}%.', vals: [3, 6, 9], mods: [{ stat: 'block_chance', add: 0.03 }] });
  P(PA, { id: 'resolve', name: 'Resolve', cluster: 'defensive', desc: 'Damage Reduction increased by {r}% while Fortified.', vals: [3, 6, 9], mods: [{ stat: 'dr_fortified', add: 0.03 }] });
  P(PA, { id: 'sanctified_armor', name: 'Sanctified Armor', cluster: 'defensive', desc: 'Armor increased by {r}%.', vals: [5, 10, 15], mods: [{ stat: 'armor_pct', add: 0.05 }] });
  P(PA, { id: 'hallowed_ground', name: 'Hallowed Ground', cluster: 'defensive', desc: 'After casting a Defensive skill, you deal {r}% increased damage for 4 seconds.', vals: [5, 10, 15], mods: [{ on: 'cast_defensive', do: { buff: { id: 'hallowed', dur: 4, mods: [{ stat: 'dmg', add: 0.05 }] } } }] });
  // Aura
  A(PA, { id: 'aura_might', name: 'Aura of Might', cluster: 'aura', tags: ['aura'], element: 'physical', cd: 0, lucky: 0, dmg: 0,
    effect: { kind: 'aura', mods: [{ stat: 'dmg', add: 0.12 }] },
    desc: 'Radiate might: you deal 12% increased damage. Only one Aura can be active.',
    up: { e: { name: 'Enhanced Aura of Might', desc: 'Aura of Might also grants 5% Critical Strike Chance.', mods: [{ p: 'mods', push: { stat: 'crit_chance', add: 0.05 } }] },
      a: { name: 'Radiant Aura of Might', desc: 'Damage bonus is doubled against Elites.', mods: [{ p: 'mods', push: { stat: 'dmg_vs_elite', add: 0.12 } }] },
      b: { name: 'Steadfast Aura of Might', desc: 'Gain 8% Attack Speed while Aura of Might is active.', mods: [{ p: 'mods', push: { stat: 'attack_speed', add: 0.08 } }] } } });
  A(PA, { id: 'aura_holy_fire', name: 'Holy Fire', cluster: 'aura', tags: ['aura', 'fire'], element: 'fire', cd: 0, lucky: 0.1, dmg: 0.12,
    effect: { kind: 'aura', pulse: { radius: 4, interval: 1.0, coef: 0.12 }, mods: [{ stat: 'dmg_fire', add: 0.1 }] },
    desc: 'Radiate holy flames, dealing {dmg} Fire damage per second to nearby enemies and increasing your Fire damage by 10%.',
    up: { e: { name: 'Enhanced Holy Fire', desc: 'Holy Fire\'s pulses apply Burning for 30% of their damage over 3 seconds.', mods: [{ apply: BURN(0.3, 3) }] },
      a: { name: 'Radiant Holy Fire', desc: 'Holy Fire\'s radius is increased by 40%.', mods: [{ p: 'pulseRadius', mul: 1.4 }] },
      b: { name: 'Steadfast Holy Fire', desc: 'Gain 15% Fire Resistance and heal 0.5% Life per enemy pulsed.', mods: [{ p: 'mods', push: { stat: 'res_fire', add: 0.15 } }, { on: 'hit', do: { heal: 0.005 } }] } } });
  A(PA, { id: 'aura_thorns', name: 'Aura of Thorns', cluster: 'aura', tags: ['aura'], element: 'physical', cd: 0, lucky: 0, dmg: 0,
    effect: { kind: 'aura', mods: [{ stat: 'thorns_pct', add: 1.0 }, { flag: 'thorns_from_armor', v: 0.3 }] },
    desc: 'Radiate thorns: your Thorns are increased by 100% and you gain Thorns equal to 30% of your Armor.',
    up: { e: { name: 'Enhanced Aura of Thorns', desc: 'Thorns damage has a 10% chance to make enemies Vulnerable for 2 seconds.', mods: [{ flag: 'thorns_vuln', v: 0.1 }] },
      a: { name: 'Radiant Aura of Thorns', desc: 'Thorns are increased by another 50%.', mods: [{ p: 'mods', push: { stat: 'thorns_pct', add: 0.5 } }] },
      b: { name: 'Steadfast Aura of Thorns', desc: 'Gain 10% Damage Reduction from Close enemies.', mods: [{ p: 'mods', push: { stat: 'dr_close', add: 0.1 } }] } } });
  A(PA, { id: 'aura_fanaticism', name: 'Fanaticism', cluster: 'aura', tags: ['aura'], element: 'physical', cd: 0, lucky: 0, dmg: 0,
    effect: { kind: 'aura', mods: [{ stat: 'attack_speed', add: 0.15 }, { stat: 'resource_gen', add: 0.15 }] },
    desc: 'Radiate fanaticism: 15% increased Attack Speed and Faith generation.',
    up: { e: { name: 'Enhanced Fanaticism', desc: 'Fanaticism also grants 10% Movement Speed.', mods: [{ p: 'mods', push: { stat: 'move_speed', add: 0.1 } }] },
      a: { name: 'Radiant Fanaticism', desc: 'Critical Strike Damage increased by 15%.', mods: [{ p: 'mods', push: { stat: 'crit_dmg', add: 0.15 } }] },
      b: { name: 'Steadfast Fanaticism', desc: 'Basic skills deal 20% increased damage.', mods: [{ p: 'mods', push: { stat: 'dmg_basic', add: 0.2 } }] } } });
  A(PA, { id: 'aura_sanctuary', name: 'Sanctuary', cluster: 'aura', tags: ['aura', 'holy'], element: 'holy', cd: 0, lucky: 0, dmg: 0,
    effect: { kind: 'aura', mods: [{ stat: 'dr', add: 0.1 }, { stat: 'life_regen', add: 2, scaleLevel: true }] },
    desc: 'Radiate sanctuary: 10% Damage Reduction and increased Life Regeneration.',
    up: { e: { name: 'Enhanced Sanctuary', desc: 'Sanctuary reduces Crowd Control duration by 25%.', mods: [{ p: 'mods', push: { stat: 'cc_reduction', add: 0.25 } }] },
      a: { name: 'Radiant Sanctuary', desc: 'Healing received increased by 20%.', mods: [{ p: 'mods', push: { stat: 'healing', add: 0.2 } }] },
      b: { name: 'Steadfast Sanctuary', desc: 'Damage Reduction from Close enemies increased by 10%.', mods: [{ p: 'mods', push: { stat: 'dr_close', add: 0.1 } }] } } });
  P(PA, { id: 'aura_mastery', name: 'Aura Mastery', cluster: 'aura', desc: 'Aura effects are {r}% stronger.', vals: [10, 20, 30], mods: [{ flag: 'aura_mastery', v: 0.1 }] });
  P(PA, { id: 'radiance', name: 'Radiance', cluster: 'aura', desc: 'While an Aura is active, gain {r}% Holy damage.', vals: [4, 8, 12], mods: [{ stat: 'dmg_holy', add: 0.04, when: 'self_aura' }] });
  P(PA, { id: 'holy_endurance', name: 'Holy Endurance', cluster: 'aura', desc: 'Maximum Life increased by {r}%.', vals: [3, 6, 9], mods: [{ stat: 'life_pct', add: 0.03 }] });
  P(PA, { id: 'unyielding_faith', name: 'Unyielding Faith', cluster: 'aura', desc: 'Lucky Hit: up to a {r}% chance to Fortify for 5% of Maximum Life.', vals: [10, 20, 30], mods: [{ on: 'lucky', chance: 0.1, do: { fortify: 0.05 } }] });
  // Judgement
  A(PA, { id: 'consecration', name: 'Consecration', cluster: 'judgement', tags: ['holy', 'aoe', 'dot'], element: 'holy', cd: 14, lucky: 0.2, dmg: 0.35,
    effect: { kind: 'ground', at: 'self', radius: 3.5, dur: 6, interval: 0.5, coef: 0.35, selfHeal: 0.01 },
    desc: 'Consecrate the ground beneath you for 6 seconds, dealing {dmg} Holy damage per tick to enemies and healing you 1% of Maximum Life per tick while standing in it.',
    up: { e: { name: 'Enhanced Consecration', desc: 'Consecration\'s radius is increased by 30%.', mods: [{ p: 'radius', mul: 1.3 }] },
      a: { name: 'Judging Consecration', desc: 'Enemies in Consecration are Slowed by 40%.', mods: [{ apply: SLOW(0.4, 1) }] },
      b: { name: 'Merciful Consecration', desc: 'Consecration\'s healing is tripled.', mods: [{ p: 'selfHeal', mul: 3 }] } } });
  A(PA, { id: 'vengeance', name: 'Vengeance', cluster: 'judgement', tags: ['holy', 'fire', 'melee'], element: 'fire', cost: 25, lucky: 0.35, dmg: 0.7,
    effect: { kind: 'melee', range: 2.6, arc: 1.4, apply: [BURN(0.4, 4), CHILL(0.3, 3)] },
    desc: 'Strike with elemental vengeance, dealing {dmg} Fire damage. Burns and Chills enemies.',
    up: { e: { name: 'Enhanced Vengeance', desc: 'Vengeance has a 15% chance to Freeze enemies for 2 seconds.', mods: [{ on: 'hit', chance: 0.15, do: { apply: FREEZE(2) } }] },
      a: { name: 'Judging Vengeance', desc: 'Vengeance deals 25% increased damage to Chilled or Burning enemies.', mods: [{ p: 'dmgMult', add: 0.25, when: 'target_chilled' }, { p: 'dmgMult', add: 0.25, when: 'target_burning' }] },
      b: { name: 'Merciful Vengeance', desc: 'Vengeance restores 8 Faith on Critical Strike.', mods: [{ on: 'crit', do: { gain: 'resource', amt: 8 } }] } } });
  A(PA, { id: 'redemption', name: 'Redemption', cluster: 'judgement', tags: ['holy', 'utility'], element: 'holy', cd: 16, lucky: 0, dmg: 0.4,
    effect: { kind: 'nova', radius: 5, consumeCorpses: { healPer: 0.04, resourcePer: 8 } },
    desc: 'Redeem the souls of the fallen: deals {dmg} Holy damage to nearby enemies and consumes nearby Corpses, each healing 4% Life and restoring 8 Faith.',
    up: { e: { name: 'Enhanced Redemption', desc: 'Redemption Fortifies you for 5% of Maximum Life per Corpse consumed.', mods: [{ p: 'fortifyPerCorpse', set: 0.05 }] },
      a: { name: 'Judging Redemption', desc: 'Redemption makes enemies hit Vulnerable for 3 seconds.', mods: [{ apply: VULN(3) }] },
      b: { name: 'Merciful Redemption', desc: 'Redemption\'s Cooldown is reduced by 1 second per Corpse consumed.', mods: [{ p: 'cdrPerCorpse', set: 1 }] } } });
  A(PA, { id: 'conversion', name: 'Conversion', cluster: 'judgement', tags: ['holy', 'utility'], element: 'holy', cd: 20, lucky: 0, dmg: 0.5,
    effect: { kind: 'aoe', at: 'target', radius: 3, apply: [FEAR(3)] },
    desc: 'Terrify enemies at the target area with holy light, dealing {dmg} Holy damage and Fearing them for 3 seconds.',
    up: { e: { name: 'Enhanced Conversion', desc: 'Feared enemies take 20% increased damage from you.', mods: [{ stat: 'dmg', add: 0.2, when: 'target_feared' }] },
      a: { name: 'Judging Conversion', desc: 'Conversion also Stuns enemies for 1.5 seconds.', mods: [{ apply: STUN(1.5) }] },
      b: { name: 'Merciful Conversion', desc: 'Conversion restores 25 Faith.', mods: [{ on: 'cast', do: { gain: 'resource', amt: 25 } }] } } });
  P(PA, { id: 'wrath_of_heaven', name: 'Wrath of Heaven', cluster: 'judgement', desc: 'Holy damage increased by {r}%.', vals: [4, 8, 12], mods: [{ stat: 'dmg_holy', add: 0.04 }] });
  P(PA, { id: 'retribution', name: 'Retribution', cluster: 'judgement', desc: 'Damage to Crowd Controlled enemies increased by {r}%.', vals: [5, 10, 15], mods: [{ stat: 'dmg_vs_cc', add: 0.05 }] });
  P(PA, { id: 'judgement_passive', name: 'Judgement', cluster: 'judgement', desc: 'Lucky Hit: up to {r}% chance to make enemies Vulnerable for 2 seconds.', vals: [10, 20, 30], mods: [{ on: 'lucky', chance: 0.1, do: { apply: VULN(2) } }] });
  P(PA, { id: 'absolution', name: 'Absolution', cluster: 'judgement', desc: 'Healing received increased by {r}%.', vals: [5, 10, 15], mods: [{ stat: 'healing', add: 0.05 }] });
  P(PA, { id: 'hand_of_justice', name: 'Hand of Justice', cluster: 'judgement', desc: 'Critical Strike Damage increased by {r}% against Vulnerable enemies.', vals: [6, 12, 18], mods: [{ stat: 'crit_dmg_vs_vuln', add: 0.06 }] });
  // Ultimate
  A(PA, { id: 'heavens_fury', name: 'Heaven\'s Fury', cluster: 'ultimate', tags: ['holy', 'aoe'], element: 'holy', cd: 60, lucky: 0.15, dmg: 0.45, max: 1,
    effect: { kind: 'buff', dur: 6, aura: { radius: 4.5, interval: 0.3, coef: 0.45 }, mods: [], glow: '#fff2a6' },
    desc: 'Call down a pillar of holy light that follows you for 6 seconds, dealing {dmg} Holy damage to enemies within.',
    up: { e: { name: 'Prime Heaven\'s Fury', desc: 'Enemies hit by Heaven\'s Fury are Slowed by 50% and Vulnerable.', mods: [{ apply: SLOW(0.5, 1) }, { apply: VULN(2) }] },
      a: { name: 'Supreme Heaven\'s Fury', desc: 'While Heaven\'s Fury is active you are Unstoppable and heal 2% Life per second.', mods: [{ p: 'unstoppable', set: 1 }, { p: 'regen', set: { heal: 0.02, interval: 1 } }] } } });
  A(PA, { id: 'avatar_of_light', name: 'Avatar of Light', cluster: 'ultimate', tags: ['holy', 'buff'], element: 'holy', cd: 70, lucky: 0, dmg: 0, max: 1,
    effect: { kind: 'buff', dur: 12, mods: [{ stat: 'dmg', add: 0.4 }, { stat: 'attack_speed', add: 0.25 }, { stat: 'dr', add: 0.25 }], unstoppable: true, glow: '#fff2a6' },
    desc: 'Become an avatar of the Light for 12 seconds: 40% increased damage, 25% Attack Speed, 25% Damage Reduction, and Unstoppable.',
    up: { e: { name: 'Prime Avatar of Light', desc: 'Avatar of Light also grants 20% Movement Speed and refills Faith.', mods: [{ p: 'mods', push: { stat: 'move_speed', add: 0.2 } }, { on: 'cast', do: { gain: 'resource', amt: 100 } }] },
      a: { name: 'Supreme Avatar of Light', desc: 'Kills while Avatar of Light is active extend its duration by 1 second (up to 8 seconds).', mods: [{ p: 'extendOnKill', set: 1 }, { p: 'extendMax', set: 8 }] } } });
  A(PA, { id: 'divine_judgement', name: 'Divine Judgement', cluster: 'ultimate', tags: ['holy', 'aoe'], element: 'holy', cd: 55, lucky: 0.3, dmg: 3.0, max: 1,
    effect: { kind: 'aoe', at: 'target', radius: 4.5, delay: 0.6, apply: [STUN(2)] },
    desc: 'After a short delay, strike the target area with a divine blade dealing {dmg} Holy damage and Stunning enemies for 2 seconds.',
    up: { e: { name: 'Prime Divine Judgement', desc: 'Divine Judgement\'s Critical Strike Chance is increased by 25%.', mods: [{ p: 'critBonus', add: 0.25 }] },
      a: { name: 'Supreme Divine Judgement', desc: 'Divine Judgement deals 50% increased damage to Elites and refunds 20 seconds of Cooldown if it kills an Elite.', mods: [{ p: 'dmgMult', add: 0.5, when: 'target_elite' }, { on: 'kill', when: 'target_elite', do: { cdr_skill: 20 } }] } } });
  P(PA, { id: 'divine_favor', name: 'Divine Favor', cluster: 'ultimate', desc: 'Ultimate skills deal {r}% increased damage.', vals: [8, 16, 24], mods: [{ stat: 'dmg_ult', add: 0.08 }] });
  P(PA, { id: 'martyrdom', name: 'Martyrdom', cluster: 'ultimate', desc: 'While Injured, you deal {r}% increased damage and take {r}% less damage.', vals: [5, 10, 15], mods: [{ stat: 'dmg', add: 0.05, when: 'self_injured' }, { stat: 'dr_injured', add: 0.05 }] });
  K(PA, { id: 'zealous_fervor', name: 'Zealous Fervor', desc: 'Every Critical Strike increases your Attack Speed by 3% for 5 seconds, up to 30%. At 30%, your Core skills deal 20% increased damage.', mods: [{ on: 'crit', do: { buff: { id: 'zfervor', dur: 5, stackMax: 10, mods: [{ stat: 'attack_speed', add: 0.03 }] } } }, { flag: 'zealous_fervor' }] });
  K(PA, { id: 'holy_vengeance', name: 'Holy Vengeance', desc: 'When you take damage, your next Core skill deals 50% increased damage (up to once every 2 seconds).', mods: [{ flag: 'holy_vengeance' }] });
  K(PA, { id: 'aura_of_faith', name: 'Aura of Faith', desc: 'Your active Aura is 50% stronger. While Healthy, your Aura also grants 10% Damage Reduction.', mods: [{ flag: 'aura_mastery', v: 0.5 }, { stat: 'dr', add: 0.1, when: 'self_healthy' }] });
  K(PA, { id: 'bulwark_of_light', name: 'Bulwark of Light', desc: 'Blocking an attack grants a Barrier for 10% of Maximum Life for 4 seconds. While you have a Barrier, you deal 20% increased damage.', mods: [{ flag: 'bulwark_of_light' }, { stat: 'dmg_barrier', add: 0.2 }] });

  /* ===================================================================== BARBARIAN */
  const B = 'barbarian';
  A(B, { id: 'bash', name: 'Bash', cluster: 'basic', tags: ['physical', 'melee'], element: 'physical', gen: 10, lucky: 0.5, dmg: 0.35, weapon: 'bludgeon',
    effect: { kind: 'melee', range: 2.4, arc: 1.2, empowerEvery: 4, empowerApply: STUN(1.25) },
    desc: 'Bash the enemy with your weapon, dealing {dmg} damage. Every 4th Bash Stuns enemies for 1.25 seconds. Generates 10 Fury.',
    up: { e: { name: 'Enhanced Bash', desc: 'Damaging a Stunned enemy with Bash grants you 10% Fortify.', mods: [{ on: 'hit', when: 'target_stunned', do: { fortify: 0.1 } }] },
      a: { name: 'Battle Bash', desc: 'When Bash damages a Stunned enemy, it generates 4 additional Fury.', mods: [{ on: 'hit', when: 'target_stunned', do: { gain: 'resource', amt: 4 } }] },
      b: { name: 'Combat Bash', desc: 'After Critically Striking 4 times with Bash, your next Core or Weapon Mastery skill will Overpower.', mods: [{ on: 'crit', counter: 4, do: { nextOverpower: 1 } }] } } });
  A(B, { id: 'flay', name: 'Flay', cluster: 'basic', tags: ['physical', 'melee', 'bleed'], element: 'physical', gen: 9, lucky: 0.5, dmg: 0.1, weapon: 'slash',
    effect: { kind: 'melee', range: 2.4, arc: 1.2, apply: [BLEED(0.58, 5)] },
    desc: 'Flay the enemy, dealing {dmg} damage and inflicting {dmg2} Bleeding damage over 5 seconds. Generates 9 Fury.',
    up: { e: { name: 'Enhanced Flay', desc: 'Flay has a 20% chance to make the enemy Vulnerable for 2 seconds.', mods: [{ on: 'hit', chance: 0.2, do: { apply: VULN(2) } }] },
      a: { name: 'Battle Flay', desc: 'Enemies hit by Flay take 10% increased Bleeding damage from you for 10 seconds.', mods: [{ apply: { st: 'flayed', dur: 10 } }] },
      b: { name: 'Combat Flay', desc: 'When Flay deals direct damage, gain 3% Damage Reduction and 10% Fortify for 3 seconds (stacks 4 times).', mods: [{ on: 'hit', do: { buff: { id: 'cflay', dur: 3, stackMax: 4, mods: [{ stat: 'dr', add: 0.03 }] }, fortify: 0.1 } }] } } });
  A(B, { id: 'frenzy', name: 'Frenzy', cluster: 'basic', tags: ['physical', 'melee'], element: 'physical', gen: 4, lucky: 0.3, dmg: 0.25, weapon: 'dual',
    effect: { kind: 'melee', range: 2.2, arc: 1.0, frenzyStacks: true },
    desc: 'Unleash a rapid flurry of blows, dealing {dmg} damage. Each hit increases Attack Speed by 20% for 3 seconds, up to 60%. Generates 4 Fury.',
    up: { e: { name: 'Enhanced Frenzy', desc: 'While Frenzy is granting 60% bonus Attack Speed, it also generates 2 additional Fury.', mods: [{ flag: 'frenzy_bonus_fury', v: 2 }] },
      a: { name: 'Battle Frenzy', desc: 'While Frenzy is granting 60% bonus Attack Speed, your other skills gain 15% increased damage.', mods: [{ flag: 'frenzy_dmg', v: 0.15 }] },
      b: { name: 'Combat Frenzy', desc: 'You gain 8% Damage Reduction for each stack of Frenzy you currently have.', mods: [{ flag: 'frenzy_dr', v: 0.08 }] } } });
  A(B, { id: 'lunging_strike', name: 'Lunging Strike', cluster: 'basic', tags: ['physical', 'melee', 'mobility'], element: 'physical', gen: 10, lucky: 0.5, dmg: 0.33, weapon: 'any',
    effect: { kind: 'dash', dist: 4, width: 1.4 },
    desc: 'Lunge forward and strike enemies for {dmg} damage. Generates 10 Fury.',
    up: { e: { name: 'Enhanced Lunging Strike', desc: 'Lunging Strike deals 30% increased damage and Heals you for 2% of Maximum Life when it damages a Healthy enemy.', mods: [{ p: 'dmgMult', add: 0.3, when: 'target_healthy' }, { on: 'hit', when: 'target_healthy', do: { heal: 0.02 } }] },
      a: { name: 'Battle Lunging Strike', desc: 'Lunging Strike also inflicts {dmg2} Bleeding damage over 5 seconds.', mods: [{ apply: BLEED(0.2, 5) }] },
      b: { name: 'Combat Lunging Strike', desc: 'Critical Strikes with Lunging Strike grant you Berserking for 1.5 seconds.', mods: [{ on: 'crit', do: { berserk: 1.5 } }] } } });
  // Core
  A(B, { id: 'double_swing', name: 'Double Swing', cluster: 'core', tags: ['physical', 'melee'], element: 'physical', cost: 25, lucky: 0.3, dmg: 0.5, weapon: 'dual',
    effect: { kind: 'melee', range: 2.6, arc: 1.6, hits: 2, hitInterval: 0.15 },
    desc: 'Sweep your weapons from opposite directions, dealing {dmg} damage with each weapon.',
    up: { e: { name: 'Enhanced Double Swing', desc: 'If Double Swing damages a Stunned or Knocked Down enemy, gain 25 Fury.', mods: [{ on: 'hit', when: 'target_stunned', do: { gain: 'resource', amt: 25 } }] },
      a: { name: 'Furious Double Swing', desc: 'Casting Double Swing while Berserking grants 2 seconds of Berserking.', mods: [{ on: 'cast', when: 'self_berserk', do: { berserk: 2 } }] },
      b: { name: 'Violent Double Swing', desc: 'Double Swing\'s second strike makes enemies Vulnerable for 1 second.', mods: [{ p: 'lastHitApply', set: VULN(1) }] } } });
  A(B, { id: 'hota', name: 'Hammer of the Ancients', cluster: 'core', tags: ['physical', 'melee', 'aoe'], element: 'physical', cost: 35, lucky: 0.2, dmg: 0.6, weapon: 'bludgeon',
    effect: { kind: 'aoe', at: 'front', dist: 1.8, radius: 2.2 },
    desc: 'Slam your hammer down with the fury of the Ancients, dealing {dmg} damage to a concentrated area.',
    up: { e: { name: 'Enhanced Hammer of the Ancients', desc: 'Hammer of the Ancients deals 1% increased damage per 10 Fury you have when cast.', mods: [{ flag: 'hota_fury_scale' }] },
      a: { name: 'Furious Hammer of the Ancients', desc: 'Hammer of the Ancients deals 1% additional damage for each point of Fury you had when using it.', mods: [{ flag: 'hota_fury_bonus' }] },
      b: { name: 'Violent Hammer of the Ancients', desc: 'After Overpowering with Hammer of the Ancients, you deal 30% more damage for 2.5 seconds.', mods: [{ on: 'overpower', do: { buff: { id: 'vhota', dur: 2.5, mods: [{ stat: 'dmg', add: 0.3 }] } } }] } } });
  A(B, { id: 'rend', name: 'Rend', cluster: 'core', tags: ['physical', 'melee', 'bleed'], element: 'physical', cost: 35, lucky: 0.33, dmg: 0.16, weapon: 'slash',
    effect: { kind: 'melee', range: 3.2, arc: 2.0, apply: [BLEED(1.4, 5)] },
    desc: 'Cleave enemies in front of you, dealing {dmg} damage and inflicting {dmg2} Bleeding damage over 5 seconds.',
    up: { e: { name: 'Enhanced Rend', desc: 'Dealing direct damage with Rend extends the duration of Vulnerable on enemies by 2 seconds.', mods: [{ flag: 'rend_extend_vuln' }] },
      a: { name: 'Furious Rend', desc: 'Direct damage with Rend grants 4 Fury per enemy hit.', mods: [{ on: 'hit', do: { gain: 'resource', amt: 4 } }] },
      b: { name: 'Violent Rend', desc: 'Rend deals 12% increased damage to Vulnerable enemies.', mods: [{ p: 'dmgMult', add: 0.12, when: 'target_vuln' }] } } });
  A(B, { id: 'upheaval', name: 'Upheaval', cluster: 'core', tags: ['physical', 'ranged', 'aoe'], element: 'physical', cost: 40, lucky: 0.2, dmg: 1.4, weapon: 'slash',
    effect: { kind: 'cone', range: 7, arc: 0.9 },
    desc: 'Tear into the ground with your weapon and fling debris forward, dealing {dmg} damage.',
    up: { e: { name: 'Enhanced Upheaval', desc: 'Upheaval has a 20% chance to Stun all enemies it damages for 2.5 seconds.', mods: [{ on: 'cast', chance: 0.2, do: { castApply: STUN(2.5) } }] },
      a: { name: 'Furious Upheaval', desc: 'Dealing direct damage with a Skill that is not Upheaval causes your next Upheaval to deal 20% increased damage, stacking up to 4 times.', mods: [{ flag: 'upheaval_stack', v: 0.2 }] },
      b: { name: 'Violent Upheaval', desc: 'If Upheaval damages at least 2 enemies, you gain Berserking for 2 seconds.', mods: [{ on: 'multi_hit', count: 2, do: { berserk: 2 } }] } } });
  A(B, { id: 'whirlwind', name: 'Whirlwind', cluster: 'core', tags: ['physical', 'melee', 'channel'], element: 'physical', cost: 11, lucky: 0.2, dmg: 0.2, weapon: 'any',
    effect: { kind: 'channel', radius: 2.6, interval: 0.3, moveMult: 0.85, costPerTick: 11 },
    desc: 'Rapidly attack surrounding enemies for {dmg} damage per tick. Tap to toggle; costs 11 Fury per tick while active.',
    up: { e: { name: 'Enhanced Whirlwind', desc: 'Gain 1 Fury each time Whirlwind deals damage to an enemy.', mods: [{ on: 'hit', do: { gain: 'resource', amt: 1 } }] },
      a: { name: 'Furious Whirlwind', desc: 'Whirlwind also inflicts 40% of its damage as Bleeding over 5 seconds.', mods: [{ apply: BLEED(0.4, 5) }] },
      b: { name: 'Violent Whirlwind', desc: 'After Whirlwind has been channeled for 2 seconds, it deals 30% increased damage until it is cancelled.', mods: [{ flag: 'ww_ramp', v: 0.3 }] } } });
  P(B, { id: 'pressure_point', name: 'Pressure Point', cluster: 'core', desc: 'Lucky Hit: Your Core skills have up to a {r}% chance to make enemies Vulnerable for 2 seconds.', vals: [10, 20, 30], mods: [{ on: 'lucky', tag: 'core', chance: 0.1, do: { apply: VULN(2) } }] });
  P(B, { id: 'endless_fury', name: 'Endless Fury', cluster: 'core', desc: 'Basic skills generate {r}% more Fury.', vals: [10, 20, 30], mods: [{ stat: 'resource_gen', add: 0.1 }] });
  // Defensive
  A(B, { id: 'challenging_shout', name: 'Challenging Shout', cluster: 'defensive', tags: ['shout', 'defensive'], element: 'physical', cd: 25, lucky: 0, dmg: 0,
    effect: { kind: 'buff', dur: 6, mods: [{ stat: 'dr', add: 0.4 }], tauntRadius: 6, shout: true },
    desc: 'Taunt nearby enemies for 6 seconds and gain 40% Damage Reduction.',
    up: { e: { name: 'Enhanced Challenging Shout', desc: 'While Challenging Shout is active, gain Thorns equal to 30% of your Maximum Life.', mods: [{ p: 'thornsFromLife', set: 0.3 }] },
      a: { name: 'Strategic Challenging Shout', desc: 'While Challenging Shout is active, gain 20% bonus Maximum Life.', mods: [{ p: 'mods', push: { stat: 'life_pct', add: 0.2 } }] },
      b: { name: 'Tactical Challenging Shout', desc: 'While Challenging Shout is active, you gain 3 Fury each time you take damage.', mods: [{ p: 'furyOnDamaged', set: 3 }] } } });
  A(B, { id: 'ground_stomp', name: 'Ground Stomp', cluster: 'defensive', tags: ['physical', 'aoe', 'defensive'], element: 'physical', cd: 15, lucky: 0.33, dmg: 0.4,
    effect: { kind: 'nova', radius: 3.5, apply: [STUN(3)] },
    desc: 'Smash the ground, dealing {dmg} damage and Stunning surrounding enemies for 3 seconds.',
    up: { e: { name: 'Enhanced Ground Stomp', desc: 'Reduce the Cooldown of your Ultimate skill by 1 second for each enemy damaged by Ground Stomp.', mods: [{ on: 'hit', do: { cdr_ult: 1 } }] },
      a: { name: 'Strategic Ground Stomp', desc: 'Ground Stomp generates 25 Fury.', mods: [{ on: 'cast', do: { gain: 'resource', amt: 25 } }] },
      b: { name: 'Tactical Ground Stomp', desc: 'Ground Stomp\'s Stun duration is increased by 1 second and deals 50% increased damage.', mods: [{ p: 'dmgMult', add: 0.5 }, { apply: STUN(4) }] } } });
  A(B, { id: 'iron_skin', name: 'Iron Skin', cluster: 'defensive', tags: ['defensive'], element: 'physical', cd: 14, lucky: 0, dmg: 0,
    effect: { kind: 'shield', barrier: 0.5, dur: 5, ofMissing: true },
    desc: 'Steel yourself, gaining a Barrier that absorbs 50% of your missing Life for 5 seconds.',
    up: { e: { name: 'Enhanced Iron Skin', desc: 'Iron Skin\'s Barrier absorbs 20% more of your Maximum Life.', mods: [{ p: 'barrierBonus', set: 0.2 }] },
      a: { name: 'Strategic Iron Skin', desc: 'Iron Skin also grants Unstoppable while active.', mods: [{ p: 'unstoppable', set: 1 }] },
      b: { name: 'Tactical Iron Skin', desc: 'While Iron Skin is active, Heal for 10% of the Barrier\'s original amount each second.', mods: [{ p: 'healPerSec', set: 0.1 }] } } });
  A(B, { id: 'rallying_cry', name: 'Rallying Cry', cluster: 'defensive', tags: ['shout', 'defensive'], element: 'physical', cd: 25, lucky: 0, dmg: 0,
    effect: { kind: 'buff', dur: 6, mods: [{ stat: 'move_speed', add: 0.3 }, { stat: 'resource_gen', add: 0.4 }], shout: true },
    desc: 'Bellow a rallying cry, increasing Movement Speed by 30% and Resource Generation by 40% for 6 seconds.',
    up: { e: { name: 'Enhanced Rallying Cry', desc: 'Rallying Cry grants you Unstoppable while active.', mods: [{ p: 'unstoppable', set: 1 }] },
      a: { name: 'Strategic Rallying Cry', desc: 'Rallying Cry Fortifies you for 10% of Maximum Life, and for 2% each second while active.', mods: [{ on: 'cast', do: { fortify: 0.1 } }, { p: 'fortifyTick', set: 0.02 }] },
      b: { name: 'Tactical Rallying Cry', desc: 'Rallying Cry generates 20 Fury and grants 25% increased Attack Speed.', mods: [{ on: 'cast', do: { gain: 'resource', amt: 20 } }, { p: 'mods', push: { stat: 'attack_speed', add: 0.25 } }] } } });
  P(B, { id: 'imposing_presence', name: 'Imposing Presence', cluster: 'defensive', desc: 'Gain {r}% additional Maximum Life.', vals: [5, 10, 15], mods: [{ stat: 'life_pct', add: 0.05 }] });
  P(B, { id: 'martial_vigor', name: 'Martial Vigor', cluster: 'defensive', desc: 'Damage Reduction against Elites is increased by {r}%.', vals: [3, 6, 9], mods: [{ stat: 'dr_elite', add: 0.03 }] });
  P(B, { id: 'outburst', name: 'Outburst', cluster: 'defensive', desc: 'Gain {r} Thorns (scales with level). Also gain Thorns equal to 10% of your Maximum Life.', vals: [30, 60, 90], mods: [{ stat: 'thorns', add: 30, scaleLevel: true }, { flag: 'thorns_from_life', v: 0.1 }] });
  P(B, { id: 'tough_as_nails', name: 'Tough as Nails', cluster: 'defensive', desc: 'Increase your Thorns by {r}%.', vals: [10, 20, 30], mods: [{ stat: 'thorns_pct', add: 0.1 }] });
  // Brawling
  A(B, { id: 'charge_barb', name: 'Charge', cluster: 'brawling', tags: ['physical', 'mobility'], element: 'physical', cd: 17, lucky: 0.33, dmg: 0.5, weapon: 'any',
    effect: { kind: 'dash', dist: 8, width: 1.8, apply: [KNOCK(1.5)], unstoppable: true },
    desc: 'Become Unstoppable and rush forward, dealing {dmg} damage and Knocking Down enemies in your path.',
    up: { e: { name: 'Enhanced Charge', desc: 'Enemies hit by Charge are Stunned for 3 seconds and Charge deals 25% increased damage.', mods: [{ apply: STUN(3) }, { p: 'dmgMult', add: 0.25 }] },
      a: { name: 'Mighty Charge', desc: 'Damaging enemies with Charge grants you Berserking for 2 seconds.', mods: [{ on: 'hit', do: { berserk: 2 } }] },
      b: { name: 'Power Charge', desc: 'Charge\'s Cooldown is reduced by 3 seconds for each enemy hit, up to 9 seconds.', mods: [{ on: 'hit', do: { cdr_skill: 3 }, maxPerCast: 3 }] } } });
  A(B, { id: 'kick', name: 'Kick', cluster: 'brawling', tags: ['physical', 'melee'], element: 'physical', cd: 13, lucky: 0.4, dmg: 0.4, weapon: 'any',
    effect: { kind: 'melee', range: 2.4, arc: 1.2, apply: [KNOCK(2)], knockback: 5 },
    desc: 'Throw a powerful kick that Knocks Back enemies, dealing {dmg} damage.',
    up: { e: { name: 'Enhanced Kick', desc: 'Damaging enemies with Kick refunds 10 Fury. Kick deals 50% increased damage.', mods: [{ on: 'hit', do: { gain: 'resource', amt: 10 } }, { p: 'dmgMult', add: 0.5 }] },
      a: { name: 'Mighty Kick', desc: 'Enemies knocked back by Kick are made Vulnerable for 4 seconds.', mods: [{ apply: VULN(4) }] },
      b: { name: 'Power Kick', desc: 'If Kick damages an enemy, it consumes all your Fury and deals 2% increased damage per Fury consumed.', mods: [{ flag: 'kick_consume' }] } } });
  A(B, { id: 'leap', name: 'Leap', cluster: 'brawling', tags: ['physical', 'mobility', 'aoe'], element: 'physical', cd: 17, lucky: 0.66, dmg: 0.4, weapon: 'any',
    effect: { kind: 'leap', dist: 7, radius: 2.8, apply: [KNOCK(1)] },
    desc: 'Leap forward and then slam down, dealing {dmg} damage and Knocking Down surrounding enemies.',
    up: { e: { name: 'Enhanced Leap', desc: 'If Leap doesn\'t damage any enemies, its Cooldown is reduced by 12 seconds.', mods: [{ p: 'missRefund', set: 12 }] },
      a: { name: 'Mighty Leap', desc: 'Enemies damaged by Leap are Slowed by 50% for 5 seconds.', mods: [{ apply: SLOW(0.5, 5) }] },
      b: { name: 'Power Leap', desc: 'If Leap damages at least one enemy, generate 40 Fury.', mods: [{ on: 'multi_hit', count: 1, do: { gain: 'resource', amt: 40 } }] } } });
  A(B, { id: 'war_cry', name: 'War Cry', cluster: 'brawling', tags: ['shout', 'buff'], element: 'physical', cd: 25, lucky: 0, dmg: 0,
    effect: { kind: 'buff', dur: 6, mods: [{ stat: 'dmg', add: 0.15 }], shout: true },
    desc: 'Bellow a mighty war cry, increasing your damage dealt by 15% for 6 seconds.',
    up: { e: { name: 'Enhanced War Cry', desc: 'War Cry grants you Berserking for 4 seconds.', mods: [{ on: 'cast', do: { berserk: 4 } }] },
      a: { name: 'Mighty War Cry', desc: 'War Cry Fortifies you for 15% of Maximum Life.', mods: [{ on: 'cast', do: { fortify: 0.15 } }] },
      b: { name: 'Power War Cry', desc: 'If at least 6 enemies are nearby when you cast War Cry, your damage bonus is increased by 10%.', mods: [{ p: 'crowdBonus', set: { count: 6, stat: 'dmg', add: 0.1 } }] } } });
  P(B, { id: 'booming_voice', name: 'Booming Voice', cluster: 'brawling', desc: 'Your Shout skill effect durations are increased by {r}%.', vals: [8, 16, 24], mods: [{ stat: 'shout_duration', add: 0.08 }] });
  P(B, { id: 'raid_leader', name: 'Raid Leader', cluster: 'brawling', desc: 'Your Shouts also Heal you for {r}% of your Maximum Life per second.', vals: [1, 2, 3], mods: [{ flag: 'shout_heal', v: 0.01 }] });
  P(B, { id: 'guttural_yell', name: 'Guttural Yell', cluster: 'brawling', desc: 'Your Shout skills cause enemies to deal {r}% less damage for 5 seconds.', vals: [4, 8, 12], mods: [{ flag: 'shout_weaken', v: 0.04 }] });
  P(B, { id: 'aggressive_resistance', name: 'Aggressive Resistance', cluster: 'brawling', desc: 'Gain {r}% Damage Reduction while Berserking.', vals: [3, 6, 9], mods: [{ stat: 'dr', add: 0.03, when: 'self_berserk' }] });
  P(B, { id: 'prolific_fury', name: 'Prolific Fury', cluster: 'brawling', desc: 'While Berserking, Basic skills generate {r}% more Fury.', vals: [6, 12, 18], mods: [{ stat: 'resource_gen', add: 0.06, when: 'self_berserk' }] });
  P(B, { id: 'battle_fervor', name: 'Battle Fervor', cluster: 'brawling', desc: 'When you cast a Brawling skill you gain Berserking for {r} second(s).', vals: [1, 2, 3], mods: [{ on: 'cast', tag: 'brawling', do: { berserk: 1 } }] });
  P(B, { id: 'swiftness', name: 'Swiftness', cluster: 'brawling', desc: 'Movement Speed is increased by {r}%.', vals: [4, 8, 12], mods: [{ stat: 'move_speed', add: 0.04 }] });
  P(B, { id: 'quick_impulses', name: 'Quick Impulses', cluster: 'brawling', desc: 'While moving, you take {r}% less damage.', vals: [2, 4, 6], mods: [{ stat: 'dr', add: 0.02, when: 'self_moving' }] });
  // Weapon Mastery
  A(B, { id: 'death_blow', name: 'Death Blow', cluster: 'mastery', tags: ['physical', 'melee'], element: 'physical', cd: 15, lucky: 0.5, dmg: 1.5, weapon: 'bludgeon',
    effect: { kind: 'melee', range: 2.6, arc: 1.4, resetOnKill: true },
    desc: 'Attack enemies in front of you for {dmg} damage. If this skill kills an enemy, its Cooldown is reset.',
    up: { e: { name: 'Enhanced Death Blow', desc: 'Death Blow deals 100% increased damage against Bosses.', mods: [{ p: 'dmgMult', add: 1.0, when: 'target_boss' }] },
      a: { name: 'Fighter\'s Death Blow', desc: 'If Death Blow damages an enemy, you gain 20 Fury.', mods: [{ on: 'multi_hit', count: 1, do: { gain: 'resource', amt: 20 } }] },
      b: { name: 'Warrior\'s Death Blow', desc: 'Death Blow is guaranteed to Overpower.', mods: [{ p: 'guaranteedOverpower', set: 1 }] } } });
  A(B, { id: 'rupture', name: 'Rupture', cluster: 'mastery', tags: ['physical', 'melee', 'bleed'], element: 'physical', cd: 10, lucky: 0.5, dmg: 0.13, weapon: 'slash',
    effect: { kind: 'melee', range: 2.6, arc: 1.4, consumeBleed: 1.5 },
    desc: 'Skewer enemies in front of you, dealing {dmg} damage, removing all Bleeding damage from them and immediately dealing 150% of it.',
    up: { e: { name: 'Enhanced Rupture', desc: 'Rupture\'s explosion also spreads to nearby enemies as Bleeding.', mods: [{ p: 'spreadBleed', set: 1 }] },
      a: { name: 'Fighter\'s Rupture', desc: 'Heal for 15% of your Maximum Life over 5 seconds when you use Rupture.', mods: [{ on: 'cast', do: { hot: { amt: 0.15, dur: 5 } } }] },
      b: { name: 'Warrior\'s Rupture', desc: 'Casting Rupture increases your Attack Speed by 20% for 4 seconds.', mods: [{ on: 'cast', do: { buff: { id: 'wrupture', dur: 4, mods: [{ stat: 'attack_speed', add: 0.2 }] } } }] } } });
  A(B, { id: 'steel_grasp', name: 'Steel Grasp', cluster: 'mastery', tags: ['physical', 'ranged'], element: 'physical', cd: 11, lucky: 0.33, dmg: 0.25, weapon: 'dual',
    effect: { kind: 'cone', range: 8, arc: 0.6, pull: true },
    desc: 'Throw out a trio of chains that deal {dmg} damage and pull in enemies.',
    up: { e: { name: 'Enhanced Steel Grasp', desc: 'If Steel Grasp damages an enemy, gain Berserking for 2 seconds.', mods: [{ on: 'multi_hit', count: 1, do: { berserk: 2 } }] },
      a: { name: 'Fighter\'s Steel Grasp', desc: 'Enemies hit by Steel Grasp are made Vulnerable for 3 seconds.', mods: [{ apply: VULN(3) }] },
      b: { name: 'Warrior\'s Steel Grasp', desc: 'Steel Grasp\'s Cooldown is reduced by 4 seconds.', mods: [{ p: 'cd', add: -4 }] } } });
  P(B, { id: 'pit_fighter', name: 'Pit Fighter', cluster: 'mastery', desc: 'You deal {r}% increased damage to Close enemies and gain {r2}% Damage Reduction from Distant enemies.', vals: [3, 6, 9], vals2: [2, 4, 6], mods: [{ stat: 'dmg_close', add: 0.03 }, { stat: 'dr_distant', add: 0.02 }] });
  P(B, { id: 'no_mercy', name: 'No Mercy', cluster: 'mastery', desc: 'You have {r}% increased Critical Strike Chance against Immobilized, Stunned or Slowed enemies.', vals: [3, 6, 9], mods: [{ stat: 'crit_chance', add: 0.03, when: 'target_cc' }, { stat: 'crit_chance', add: 0.03, when: 'target_slowed' }] });
  P(B, { id: 'slaying_strike', name: 'Slaying Strike', cluster: 'mastery', desc: 'You deal {r}% increased damage against Injured enemies.', vals: [8, 16, 24], mods: [{ stat: 'dmg_vs_injured', add: 0.08 }] });
  P(B, { id: 'expose_vulnerability', name: 'Expose Vulnerability', cluster: 'mastery', desc: 'Dealing direct damage with a Weapon Mastery skill makes the enemy Vulnerable for {r} second(s).', vals: [1, 2, 3], mods: [{ on: 'hit', tag: 'mastery', do: { apply: VULN(1) }, scaleDur: true }] });
  P(B, { id: 'hamstring', name: 'Hamstring', cluster: 'mastery', desc: 'Your Bleeding effects Slow Healthy enemies by {r}%.', vals: [10, 20, 30], mods: [{ flag: 'bleed_slow', v: 0.1 }] });
  P(B, { id: 'cut_to_the_bone', name: 'Cut to the Bone', cluster: 'mastery', desc: 'Your Bleeding effects deal {r}% increased damage to Vulnerable enemies.', vals: [6, 12, 18], mods: [{ stat: 'dmg_bleed', add: 0.06, when: 'target_vuln' }] });
  P(B, { id: 'thick_skin', name: 'Thick Skin', cluster: 'mastery', desc: 'Each time you take direct damage, gain {r}% Fortify.', vals: [1, 2, 3], mods: [{ on: 'damaged', do: { fortify: 0.01 } }] });
  P(B, { id: 'defensive_stance', name: 'Defensive Stance', cluster: 'mastery', desc: 'Increase the Damage Reduction gained while you are Fortified by an additional {r}%.', vals: [3, 6, 9], mods: [{ stat: 'dr_fortified', add: 0.03 }] });
  P(B, { id: 'counteroffensive', name: 'Counteroffensive', cluster: 'mastery', desc: 'While you have Fortify for over 50% of your Maximum Life, you deal {r}% increased damage.', vals: [4, 8, 12], mods: [{ stat: 'dmg', add: 0.04, when: 'self_fortified' }] });
  // Ultimate
  A(B, { id: 'call_of_the_ancients', name: 'Call of the Ancients', cluster: 'ultimate', tags: ['summoning'], element: 'physical', cd: 50, lucky: 0, dmg: 0.6, max: 1,
    effect: { kind: 'summon', minion: 'ancient', count: 3, dur: 6 },
    desc: 'Call upon 3 Ancients to aid you in battle for 6 seconds.',
    up: { e: { name: 'Prime Call of the Ancients', desc: 'While Call of the Ancients is active, gain 10% bonus Attack Speed and 10% increased damage.', mods: [{ p: 'selfBuff', set: { dur: 6, mods: [{ stat: 'attack_speed', add: 0.1 }, { stat: 'dmg', add: 0.1 }] } }] },
      a: { name: 'Supreme Call of the Ancients', desc: 'The Ancients\' attacks make enemies Vulnerable for 2 seconds.', mods: [{ p: 'minionApply', set: VULN(2) }] } } });
  A(B, { id: 'iron_maelstrom', name: 'Iron Maelstrom', cluster: 'ultimate', tags: ['physical', 'aoe'], element: 'physical', cd: 45, lucky: 0.2, dmg: 1.6, max: 1,
    effect: { kind: 'multi', steps: [{ kind: 'nova', radius: 3.6, apply: [STUN(2)] }, { kind: 'nova', radius: 4.2, coefMult: 0.6, apply: [BLEED(0.9, 5)] }, { kind: 'cone', range: 7, arc: 1.4, coefMult: 1.0 }], stepInterval: 0.4 },
    desc: 'Attach chains to each of your weapons and perform a devastating three-hit combo: a Stunning slam ({dmg}), a Bleeding sweep, and a cone strike.',
    up: { e: { name: 'Prime Iron Maelstrom', desc: 'Iron Maelstrom gains 10% Critical Strike Chance and its Cooldown is reduced by 1 second per enemy hit.', mods: [{ p: 'critBonus', add: 0.1 }, { on: 'hit', do: { cdr_skill: 1 } }] },
      a: { name: 'Supreme Iron Maelstrom', desc: 'Casting Iron Maelstrom grants Berserking for 6 seconds.', mods: [{ on: 'cast', do: { berserk: 6 } }] } } });
  A(B, { id: 'wrath_of_the_berserker', name: 'Wrath of the Berserker', cluster: 'ultimate', tags: ['buff'], element: 'physical', cd: 60, lucky: 0, dmg: 0, max: 1,
    effect: { kind: 'buff', dur: 10, berserk: 5, unstoppable: true, mods: [{ stat: 'move_speed', add: 0.2 }], glow: '#ff7a5c', knockback: 4 },
    desc: 'Explode into rage, Knocking Back surrounding enemies, gaining Berserking and Unstoppable for 5 seconds, and 20% increased Movement Speed for 10 seconds.',
    up: { e: { name: 'Prime Wrath of the Berserker', desc: 'While Wrath of the Berserker is active, gain 20% increased Attack Speed and your Fury generation is increased by 50%.', mods: [{ p: 'mods', push: { stat: 'attack_speed', add: 0.2 } }, { p: 'mods', push: { stat: 'resource_gen', add: 0.5 } }] },
      a: { name: 'Supreme Wrath of the Berserker', desc: 'While Wrath of the Berserker is active, every 25 Fury you spend increases Berserking damage by 25%, up to 100%.', mods: [{ flag: 'supreme_wrath' }] } } });
  P(B, { id: 'heavy_handed', name: 'Heavy Handed', cluster: 'ultimate', desc: 'While using Two-Handed weapons, you deal {r}% increased Critical Strike Damage.', vals: [5, 10, 15], mods: [{ stat: 'crit_dmg', add: 0.05, when: 'weapon_twohanded' }] });
  P(B, { id: 'wallop', name: 'Wallop', cluster: 'ultimate', desc: 'Your skills using Bludgeoning weapons deal {r}% increased damage to Stunned or Vulnerable enemies.', vals: [5, 10, 15], mods: [{ stat: 'dmg_vs_vuln', add: 0.05, when: 'weapon_bludgeon' }, { stat: 'dmg_vs_stunned', add: 0.05, when: 'weapon_bludgeon' }] });
  P(B, { id: 'brute_force', name: 'Brute Force', cluster: 'ultimate', desc: 'Your Overpowers deal {r}% increased damage when using a Two-Handed weapon.', vals: [15, 30, 45], mods: [{ stat: 'overpower_dmg', add: 0.15, when: 'weapon_twohanded' }] });
  P(B, { id: 'concussion', name: 'Concussion', cluster: 'ultimate', desc: 'Lucky Hit: Skills using Bludgeoning weapons have up to a {r}% chance to Stun for 3 seconds.', vals: [10, 20, 30], mods: [{ on: 'lucky', chance: 0.1, when: 'weapon_bludgeon', do: { apply: STUN(3) } }] });
  P(B, { id: 'tempered_fury', name: 'Tempered Fury', cluster: 'ultimate', desc: 'Increases your Maximum Fury by {r}.', vals: [3, 6, 9], mods: [{ stat: 'max_resource', add: 3 }] });
  P(B, { id: 'furious_impulse', name: 'Furious Impulse', cluster: 'ultimate', desc: 'Each time you swap weapons, gain {r} Fury.', vals: [2, 4, 6], mods: [{ flag: 'furious_impulse', v: 2 }] });
  P(B, { id: 'invigorating_fury', name: 'Invigorating Fury', cluster: 'ultimate', desc: 'Heal for {r}% of your Maximum Life for each 100 Fury spent.', vals: [3, 6, 9], mods: [{ flag: 'invigorating_fury', v: 0.03 }] });
  P(B, { id: 'duelist', name: 'Duelist', cluster: 'ultimate', desc: 'Skills using Dual Wielded weapons gain {r}% Attack Speed.', vals: [3, 6, 9], mods: [{ stat: 'attack_speed', add: 0.03, when: 'weapon_dual' }] });
  K(B, { id: 'unconstrained', name: 'Unconstrained', desc: 'Increase Berserking\'s maximum duration by 5 seconds and its damage bonus from 25% to 60%.', mods: [{ flag: 'unconstrained' }] });
  K(B, { id: 'walking_arsenal', name: 'Walking Arsenal', desc: 'Dealing direct damage with a Two-Handed Bludgeoning, Two-Handed Slashing, or Dual Wielded weapon grants 10% increased damage for 6 seconds. While all three are active, gain an additional 15% damage.', mods: [{ flag: 'walking_arsenal' }] });
  K(B, { id: 'unbridled_rage', name: 'Unbridled Rage', desc: 'Core skills deal 135% increased damage, but cost 100% more Fury.', mods: [{ stat: 'dmg_core', add: 1.35 }, { flag: 'core_cost_up', v: 1.0 }] });
  K(B, { id: 'gushing_wounds', name: 'Gushing Wounds', desc: 'When causing an enemy to Bleed, you have a chance equal to your Critical Strike Chance to increase the Bleed amount by 140%.', mods: [{ flag: 'gushing_wounds' }] });

  /* ===================================================================== DRUID */
  const D = 'druid';
  A(D, { id: 'claw', name: 'Claw', cluster: 'basic', tags: ['werewolf', 'shapeshift', 'melee'], element: 'physical', gen: 10, lucky: 0.5, dmg: 0.2,
    effect: { kind: 'melee', range: 2.2, arc: 1.0, form: 'werewolf' },
    desc: 'Shapeshift into a Werewolf and claw at an enemy for {dmg} damage. Generates 10 Spirit.',
    up: { e: { name: 'Enhanced Claw', desc: 'Claw\'s Attack Speed is increased by 10%.', mods: [{ stat: 'attack_speed_basic', add: 0.1 }] },
      a: { name: 'Fierce Claw', desc: 'Claw applies {dmg2} Poisoning damage over 6 seconds.', mods: [{ apply: POISON(0.6, 6) }] },
      b: { name: 'Wild Claw', desc: 'Claw has a 20% chance to attack twice.', mods: [{ p: 'doubleChance', set: 0.2 }] } } });
  A(D, { id: 'earth_spike', name: 'Earth Spike', cluster: 'basic', tags: ['earth', 'ranged'], element: 'physical', gen: 10, lucky: 0.35, dmg: 0.2,
    effect: { kind: 'proj', speed: 20, range: 9, radius: 0.6, pierce: 0 },
    desc: 'Sunder the earth, impaling the first enemy hit for {dmg} damage. Generates 10 Spirit.',
    up: { e: { name: 'Enhanced Earth Spike', desc: 'Earth Spike has a 10% chance to Stun for 2.5 seconds.', mods: [{ on: 'hit', chance: 0.1, do: { apply: STUN(2.5) } }] },
      a: { name: 'Fierce Earth Spike', desc: 'Gain Fortify for 5% of Maximum Life when Earth Spike damages a Stunned or Immobilized enemy.', mods: [{ on: 'hit', when: 'target_cc', do: { fortify: 0.05 } }] },
      b: { name: 'Wild Earth Spike', desc: 'Earth Spike deals 40% increased damage to Stunned or Immobilized enemies.', mods: [{ p: 'dmgMult', add: 0.4, when: 'target_cc' }] } } });
  A(D, { id: 'maul', name: 'Maul', cluster: 'basic', tags: ['werebear', 'shapeshift', 'melee'], element: 'physical', gen: 11, lucky: 0.3, dmg: 0.2,
    effect: { kind: 'melee', range: 2.6, arc: 2.0, form: 'werebear' },
    desc: 'Shapeshift into a Werebear and maul enemies in front of you, dealing {dmg} damage. Generates 11 Spirit.',
    up: { e: { name: 'Enhanced Maul', desc: 'If an enemy is hit by Maul, then Fortify for 2% of Maximum Life.', mods: [{ on: 'hit', do: { fortify: 0.02 } }] },
      a: { name: 'Fierce Maul', desc: 'Increases the range and radius of Maul by 30%.', mods: [{ p: 'range', mul: 1.3 }] },
      b: { name: 'Wild Maul', desc: 'Maul has a 20% chance to Knock Down enemies for 1.5 seconds.', mods: [{ on: 'hit', chance: 0.2, do: { apply: KNOCK(1.5) } }] } } });
  A(D, { id: 'storm_strike', name: 'Storm Strike', cluster: 'basic', tags: ['storm', 'melee', 'lightning'], element: 'lightning', gen: 15, lucky: 0.25, dmg: 0.2,
    effect: { kind: 'chain', range: 2.6, jumps: 2, jumpRange: 3.5, falloff: 0, castBuff: { id: 'ssdr', dur: 3, mods: [{ stat: 'dr', add: 0.25 }] } },
    desc: 'Electricity gathers around your weapon, dealing {dmg} damage to your target and chaining to up to 2 surrounding enemies. You gain 25% Damage Reduction for 3 seconds. Generates 15 Spirit.',
    up: { e: { name: 'Enhanced Storm Strike', desc: 'Storm Strike has a 15% chance to Immobilize all enemies hit for 2.5 seconds.', mods: [{ on: 'cast', chance: 0.15, do: { castApply: IMMOB(2.5) } }] },
      a: { name: 'Fierce Storm Strike', desc: 'Storm Strike makes enemies Vulnerable for 3 seconds.', mods: [{ apply: VULN(3) }] },
      b: { name: 'Wild Storm Strike', desc: 'Storm Strike chains to 2 additional targets and Dazes them for 1.5s.', mods: [{ p: 'jumps', add: 2 }, { apply: DAZE(1.5) }] } } });
  A(D, { id: 'wind_shear', name: 'Wind Shear', cluster: 'basic', tags: ['storm', 'ranged'], element: 'physical', gen: 11, lucky: 0.2, dmg: 0.17,
    effect: { kind: 'proj', speed: 20, range: 12, radius: 0.6, pierce: 99 },
    desc: 'Conjure a piercing blade of wind that deals {dmg} damage. Generates 11 Spirit.',
    up: { e: { name: 'Enhanced Wind Shear', desc: 'Wind Shear has a 20% chance to make enemies Vulnerable for 4 seconds.', mods: [{ on: 'hit', chance: 0.2, do: { apply: VULN(4) } }] },
      a: { name: 'Fierce Wind Shear', desc: 'Gain 3% Movement Speed for 5 seconds, up to 15%, for each enemy hit with Wind Shear.', mods: [{ on: 'hit', do: { buff: { id: 'fws', dur: 5, stackMax: 5, mods: [{ stat: 'move_speed', add: 0.03 }] } } }] },
      b: { name: 'Wild Wind Shear', desc: 'Wind Shear generates 3 additional Spirit for each enemy hit beyond the first.', mods: [{ p: 'genPerExtra', set: 3 }] } } });
  // Core
  A(D, { id: 'landslide', name: 'Landslide', cluster: 'core', tags: ['earth', 'ranged'], element: 'physical', cost: 30, lucky: 0.2, dmg: 0.75,
    effect: { kind: 'aoe', at: 'target', radius: 1.4, count: 2, scatter: 2.0, delay: 0.25 },
    desc: 'Crush enemies between 2 pillars of earth, dealing up to {dmg} damage each.',
    up: { e: { name: 'Enhanced Landslide', desc: 'Every 4th Landslide is a guaranteed Critical Strike.', mods: [{ p: 'empowerEvery', set: 4, empowerCrit: 1 }] },
      a: { name: 'Primal Landslide', desc: 'Landslide deals 40% increased damage to Stunned or Immobilized enemies and is a guaranteed Critical Strike against them.', mods: [{ p: 'dmgMult', add: 0.4, when: 'target_cc' }, { p: 'critBonus', add: 1, when: 'target_cc' }] },
      b: { name: 'Raging Landslide', desc: 'Landslide forms an additional pillar of earth.', mods: [{ p: 'count', add: 1 }] } } });
  A(D, { id: 'lightning_storm', name: 'Lightning Storm', cluster: 'core', tags: ['storm', 'lightning', 'ranged', 'channel'], element: 'lightning', cost: 15, lucky: 0.15, dmg: 0.32,
    effect: { kind: 'channel', radius: 5, interval: 0.4, strikes: 1, rampStrikes: 5, rampInterval: 0.8, moveMult: 0.7, costPerTick: 15, bolts: true },
    desc: 'Conjure a growing lightning storm that deals {dmg} damage per strike. The number of strikes increases the longer the storm is channeled, up to 5. Tap to toggle.',
    up: { e: { name: 'Enhanced Lightning Storm', desc: 'Lightning Storm\'s strike radius is increased by 25%.', mods: [{ p: 'radius', mul: 1.25 }] },
      a: { name: 'Primal Lightning Storm', desc: 'Lightning Storm has a 10% chance to Immobilize enemies hit for 3 seconds.', mods: [{ on: 'hit', chance: 0.1, do: { apply: IMMOB(3) } }] },
      b: { name: 'Raging Lightning Storm', desc: 'Lightning Storm gains 3 additional maximum strikes.', mods: [{ p: 'rampStrikes', add: 3 }] } } });
  A(D, { id: 'pulverize', name: 'Pulverize', cluster: 'core', tags: ['werebear', 'shapeshift', 'melee', 'aoe'], element: 'physical', cost: 35, lucky: 0.33, dmg: 0.88,
    effect: { kind: 'aoe', at: 'front', dist: 1.5, radius: 2.8, form: 'werebear' },
    desc: 'Shapeshift into a Werebear and slam the ground, dealing {dmg} damage to nearby enemies.',
    up: { e: { name: 'Enhanced Pulverize', desc: 'Your next Pulverize will Overpower every 12 seconds while you remain Healthy.', mods: [{ flag: 'pulverize_op', v: 12 }] },
      a: { name: 'Primal Pulverize', desc: 'Enemies damaged by Pulverize deal 20% reduced damage for 4 seconds.', mods: [{ apply: { st: 'weakened', dur: 4, dmgRed: 0.2 } }] },
      b: { name: 'Raging Pulverize', desc: 'Enemies Overpowered by Pulverize are Stunned for 2 seconds.', mods: [{ on: 'overpower', do: { apply: STUN(2) } }] } } });
  A(D, { id: 'shred', name: 'Shred', cluster: 'core', tags: ['werewolf', 'shapeshift', 'melee'], element: 'physical', cost: 35, lucky: 0.2, dmg: 0.25,
    effect: { kind: 'melee', range: 2.2, arc: 1.1, hits: 3, hitInterval: 0.12, lastHitMult: 1.6, dashToTarget: 3, form: 'werewolf' },
    desc: 'Shapeshift into a Werewolf and perform a trio of combo attacks: the first two deal {dmg} damage each and the third is a larger finisher dealing {dmg2} damage.',
    up: { e: { name: 'Enhanced Shred', desc: 'Shred Heals for 2% of Maximum Life on hit.', mods: [{ on: 'hit', do: { heal: 0.02 } }] },
      a: { name: 'Primal Shred', desc: 'Shred\'s Critical Strike Damage is increased by 20%.', mods: [{ p: 'critDmgBonus', add: 0.2 }] },
      b: { name: 'Raging Shred', desc: 'Shred\'s third combo attack is larger and applies an additional {dmg3} Poisoning damage over 5 seconds.', mods: [{ p: 'lastHitApply', set: POISON(1.0, 5) }, { p: 'lastHitArc', set: 2.4 }] } } });
  A(D, { id: 'tornado', name: 'Tornado', cluster: 'core', tags: ['storm', 'ranged'], element: 'physical', cost: 40, lucky: 0.1, dmg: 0.33,
    effect: { kind: 'proj', speed: 5, range: 10, radius: 1.3, pierce: 99, wander: true, interval: 0.4 },
    desc: 'Conjure a swirling tornado that deals {dmg} damage repeatedly as it travels.',
    up: { e: { name: 'Enhanced Tornado', desc: 'When you cast Tornado, there is a 20% chance to spawn an additional Tornado.', mods: [{ p: 'extraChance', set: 0.2 }] },
      a: { name: 'Primal Tornado', desc: 'Enemies damaged by Tornado are Slowed by 8% for 3 seconds, stacking up to 40%.', mods: [{ apply: SLOW(0.08, 3), stackMax: 5 }] },
      b: { name: 'Raging Tornado', desc: 'Enemies damaged by Tornado are made Vulnerable for 3 seconds.', mods: [{ apply: VULN(3) }] } } });
  P(D, { id: 'heart_of_the_wild', name: 'Heart of the Wild', cluster: 'core', desc: 'Maximum Spirit is increased by {r}.', vals: [3, 6, 9], mods: [{ stat: 'max_resource', add: 3 }] });
  P(D, { id: 'wild_impulses', name: 'Wild Impulses', cluster: 'core', desc: 'Your Core skills cost {r}% more Spirit but deal {r2}% increased damage.', vals: [5, 10, 15], vals2: [10, 20, 30], mods: [{ stat: 'dmg_core', add: 0.1 }, { flag: 'core_cost_up', v: 0.05 }] });
  P(D, { id: 'predatory_instinct', name: 'Predatory Instinct', cluster: 'core', desc: 'Critical Strike Chance against Close enemies is increased by {r}%.', vals: [2, 4, 6], mods: [{ stat: 'crit_chance', add: 0.02, when: 'target_close' }] });
  P(D, { id: 'digitigrade_gait', name: 'Digitigrade Gait', cluster: 'core', desc: 'You gain {r}% Movement Speed while in Werewolf form.', vals: [3, 6, 9], mods: [{ stat: 'move_speed', add: 0.03, when: 'self_werewolf' }] });
  P(D, { id: 'iron_fur', name: 'Iron Fur', cluster: 'core', desc: 'You gain {r}% Damage Reduction while in Werebear form.', vals: [3, 6, 9], mods: [{ stat: 'dr', add: 0.03, when: 'self_werebear' }] });
  P(D, { id: 'abundance', name: 'Abundance', cluster: 'core', desc: 'Basic skills generate {r}% more Spirit.', vals: [8, 16, 24], mods: [{ stat: 'resource_gen', add: 0.08 }] });
  // Defensive
  A(D, { id: 'blood_howl', name: 'Blood Howl', cluster: 'defensive', tags: ['werewolf', 'shapeshift', 'defensive'], element: 'physical', cd: 15, lucky: 0, dmg: 0,
    effect: { kind: 'buff', dur: 4, healOnCast: 0.2, form: 'werewolf', mods: [] },
    desc: 'Shapeshift into a Werewolf and howl furiously, Healing you for 20% of your Maximum Life.',
    up: { e: { name: 'Enhanced Blood Howl', desc: 'Kills reduce the Cooldown of Blood Howl by 1 second.', mods: [{ on: 'any_kill', do: { cdr_skill: 1 } }] },
      a: { name: 'Innate Blood Howl', desc: 'Blood Howl also generates 20 Spirit.', mods: [{ on: 'cast', do: { gain: 'resource', amt: 20 } }] },
      b: { name: 'Preserving Blood Howl', desc: 'Blood Howl also increases your Attack Speed by 15% for 4 seconds.', mods: [{ p: 'mods', push: { stat: 'attack_speed', add: 0.15 } }] } } });
  A(D, { id: 'cyclone_armor', name: 'Cyclone Armor', cluster: 'defensive', tags: ['storm', 'defensive'], element: 'physical', cd: 18, lucky: 0, dmg: 0.2,
    effect: { kind: 'nova', radius: 4, apply: [KNOCK(1)], passiveMods: [{ stat: 'dr_distant', add: 0.1 }] },
    desc: 'Passive: Powerful winds surround you, granting 10% Damage Reduction from Distant enemies. Active: The winds expand outwards, Knocking Back enemies and dealing {dmg} damage.',
    up: { e: { name: 'Enhanced Cyclone Armor', desc: 'Enemies Knocked Back by Cyclone Armor are Slowed by 70% for 2 seconds.', mods: [{ apply: SLOW(0.7, 2) }] },
      a: { name: 'Innate Cyclone Armor', desc: 'Enemies damaged by Cyclone Armor are made Vulnerable for 3 seconds.', mods: [{ apply: VULN(3) }] },
      b: { name: 'Preserving Cyclone Armor', desc: 'Cyclone Armor\'s passive also grants 5% Damage Reduction from Close enemies.', mods: [{ stat: 'dr_close', add: 0.05 }] } } });
  A(D, { id: 'debilitating_roar', name: 'Debilitating Roar', cluster: 'defensive', tags: ['werebear', 'shapeshift', 'defensive'], element: 'physical', cd: 22, lucky: 0, dmg: 0,
    effect: { kind: 'buff', dur: 4, form: 'werebear', aoeApply: { radius: 5, apply: [{ st: 'weakened', dur: 4, dmgRed: 0.7 }] }, mods: [] },
    desc: 'Shapeshift into a Werebear and bellow a mighty roar, reducing Nearby enemies\' damage dealt by 70% for 4 seconds.',
    up: { e: { name: 'Enhanced Debilitating Roar', desc: 'While Debilitating Roar is active, you Heal for 4% of your Maximum Life each second.', mods: [{ p: 'regen', set: { heal: 0.04, interval: 1 } }] },
      a: { name: 'Innate Debilitating Roar', desc: 'Debilitating Roar also Fortifies you for 22% of Maximum Life.', mods: [{ on: 'cast', do: { fortify: 0.22 } }] },
      b: { name: 'Preserving Debilitating Roar', desc: 'Debilitating Roar also Slows enemies by 40% for its duration.', mods: [{ p: 'aoeApplyExtra', set: SLOW(0.4, 4) }] } } });
  A(D, { id: 'earthen_bulwark', name: 'Earthen Bulwark', cluster: 'defensive', tags: ['earth', 'defensive'], element: 'physical', cd: 16, lucky: 0, dmg: 0.3,
    effect: { kind: 'shield', barrier: 0.45, dur: 3, unstoppable: true },
    desc: 'Rocks surround you for 3 seconds, granting a Barrier that absorbs 45% of your Maximum Life and making you Unstoppable.',
    up: { e: { name: 'Enhanced Earthen Bulwark', desc: 'Rock shrapnel flies outward when Earthen Bulwark expires, dealing {dmg} damage to surrounding enemies.', mods: [{ p: 'explode', set: { radius: 3, coef: 0.3 } }] },
      a: { name: 'Innate Earthen Bulwark', desc: 'Earthen Bulwark\'s Barrier amount is increased by 20%.', mods: [{ p: 'barrier', add: 0.2 }] },
      b: { name: 'Preserving Earthen Bulwark', desc: 'Casting Earthen Bulwark grants 18% Maximum Life as Fortify.', mods: [{ on: 'cast', do: { fortify: 0.18 } }] } } });
  P(D, { id: 'ancestral_fortitude', name: 'Ancestral Fortitude', cluster: 'defensive', desc: 'Increase your Non-Physical Resistances by {r}%.', vals: [5, 10, 15], mods: [{ stat: 'res_all', add: 0.05 }] });
  P(D, { id: 'vigilance', name: 'Vigilance', cluster: 'defensive', desc: 'You gain {r}% Damage Reduction for 6 seconds after using a Defensive skill.', vals: [4, 8, 12], mods: [{ on: 'cast_defensive', do: { buff: { id: 'vigilance', dur: 6, mods: [{ stat: 'dr', add: 0.04 }] } } }] });
  // Companion
  A(D, { id: 'poison_creeper', name: 'Poison Creeper', cluster: 'companion', tags: ['companion', 'poison'], element: 'poison', cd: 20, lucky: 0, dmg: 1.1,
    effect: { kind: 'aoe', at: 'target', radius: 3, apply: [IMMOB(2), POISON(1.1, 6)], companion: 'creeper' },
    desc: 'Passive: A vine creeper periodically emerges and Poisons enemies. Active: Vines strangle enemies in the target area, Immobilizing them for 2 seconds and Poisoning them for {dmg} damage over 6 seconds.',
    up: { e: { name: 'Enhanced Poison Creeper', desc: 'Poison Creeper\'s Immobilize duration is increased by 1 second.', mods: [{ apply: IMMOB(3) }] },
      a: { name: 'Brutal Poison Creeper', desc: 'Critical Strike Chance is increased by 20% against Immobilized enemies.', mods: [{ stat: 'crit_chance', add: 0.2, when: 'target_immobilized' }] },
      b: { name: 'Ferocious Poison Creeper', desc: 'Poison Creeper\'s active Poisons enemies for 100% more damage.', mods: [{ p: 'dmgMult', add: 1.0 }] } } });
  A(D, { id: 'ravens', name: 'Ravens', cluster: 'companion', tags: ['companion', 'storm'], element: 'physical', cd: 15, lucky: 0, dmg: 0.3,
    effect: { kind: 'ground', at: 'target', radius: 2.8, dur: 6, interval: 0.3, coef: 0.3, companion: 'raven' },
    desc: 'Passive: A raven flies above you and periodically attacks enemies. Active: The flock swoops down at the target area, dealing {dmg} damage per tick for 6 seconds.',
    up: { e: { name: 'Enhanced Ravens', desc: 'You have 8% increased Critical Strike Chance against enemies hit by Ravens for 6 seconds.', mods: [{ apply: { st: 'raven_mark', dur: 6 } }, { stat: 'crit_chance', add: 0.08, when: 'target_marked' }] },
      a: { name: 'Brutal Ravens', desc: '2 additional Ravens periodically attack enemies.', mods: [{ p: 'companionCount', add: 2 }] },
      b: { name: 'Ferocious Ravens', desc: 'Enemies inside Ravens\' area are made Vulnerable for 3 seconds.', mods: [{ apply: VULN(3) }] } } });
  A(D, { id: 'wolves', name: 'Wolves', cluster: 'companion', tags: ['companion'], element: 'physical', cd: 14, lucky: 0.2, dmg: 0.6,
    effect: { kind: 'command', coef: 0.6, companion: 'wolf', companionCount: 2 },
    desc: 'Passive: Summon 2 wolf companions that bite enemies. Active: Direct your companions to focus an enemy, leaping to it and dealing {dmg} damage.',
    up: { e: { name: 'Enhanced Wolves', desc: 'Wolves deal 20% increased damage.', mods: [{ minionStat: 'wolf', stat: 'dmg', add: 0.2 }] },
      a: { name: 'Brutal Wolves', desc: 'When your Wolves hit an enemy, you gain 10% Damage Reduction for 2 seconds.', mods: [{ flag: 'wolf_dr' }] },
      b: { name: 'Ferocious Wolves', desc: 'Summon a third wolf companion.', mods: [{ p: 'companionCount', add: 1 }] } } });
  P(D, { id: 'call_of_the_wild', name: 'Call of the Wild', cluster: 'companion', desc: 'Your Companions deal {r}% bonus damage.', vals: [10, 20, 30], mods: [{ stat: 'dmg_companion', add: 0.1 }, { stat: 'dmg_summon', add: 0.1 }] });
  P(D, { id: 'clarity', name: 'Clarity', cluster: 'companion', desc: 'Gain {r} Spirit when transforming into Human form.', vals: [2, 4, 6], mods: [{ flag: 'clarity', v: 2 }] });
  P(D, { id: 'natures_reach', name: 'Nature\'s Reach', cluster: 'companion', desc: 'Deal {r}% increased damage to Distant enemies. Double this bonus if they are also Crowd Controlled.', vals: [5, 10, 15], mods: [{ stat: 'dmg_distant', add: 0.05 }, { stat: 'dmg_distant', add: 0.05, when: 'target_cc' }] });
  // Wrath
  A(D, { id: 'boulder', name: 'Boulder', cluster: 'wrath', tags: ['earth', 'ranged'], element: 'physical', cd: 10, lucky: 0.1, dmg: 0.33,
    effect: { kind: 'proj', speed: 7, range: 10, radius: 1.2, pierce: 99, interval: 0.3, apply: [SLOW(0.3, 2)] },
    desc: 'Unearth a large rolling boulder that continuously Knocks Back enemies, dealing {dmg} damage with each hit.',
    up: { e: { name: 'Enhanced Boulder', desc: 'If Boulder Overpowers, enemies hit are Stunned for 4 seconds.', mods: [{ on: 'overpower', do: { apply: STUN(4) } }] },
      a: { name: 'Natural Boulder', desc: 'While enemies are Slowed, your damage to them is increased by 10%.', mods: [{ p: 'dmgMult', add: 0.1, when: 'target_slowed' }] },
      b: { name: 'Savage Boulder', desc: 'Boulder\'s Critical Strike Chance is increased by 3% each time it deals damage.', mods: [{ p: 'critRamp', set: 0.03 }] } } });
  A(D, { id: 'hurricane', name: 'Hurricane', cluster: 'wrath', tags: ['storm', 'aoe'], element: 'physical', cd: 20, lucky: 0.2, dmg: 0.2,
    effect: { kind: 'buff', dur: 8, aura: { radius: 4, interval: 0.5, coef: 0.2, apply: [] }, mods: [] },
    desc: 'Form a hurricane around you that deals {dmg} damage per tick to surrounding enemies over 8 seconds.',
    up: { e: { name: 'Enhanced Hurricane', desc: 'Enemies who are damaged by Hurricane are Slowed by 25% for 2 seconds.', mods: [{ apply: SLOW(0.25, 2) }] },
      a: { name: 'Natural Hurricane', desc: 'Hurricane has a 15% chance to make enemies Vulnerable for 3 seconds each time it deals damage.', mods: [{ on: 'hit', chance: 0.15, do: { apply: VULN(3) } }] },
      b: { name: 'Savage Hurricane', desc: 'Enemies affected by Hurricane deal 20% less damage.', mods: [{ apply: { st: 'weakened', dur: 1, dmgRed: 0.2 } }] } } });
  A(D, { id: 'rabies', name: 'Rabies', cluster: 'wrath', tags: ['werewolf', 'shapeshift', 'poison', 'ranged'], element: 'poison', cd: 12, lucky: 0.4, dmg: 0.5,
    effect: { kind: 'proj', speed: 14, range: 8, radius: 0.6, pierce: 0, form: 'werewolf', apply: [{ st: 'poison', coef: 1.2, dur: 6, spread: { radius: 2.5, interval: 1.5 } }] },
    desc: 'Shapeshift into a Werewolf and deliver a rabid bite dealing {dmg} damage and Poisoning for {dmg2} over 6 seconds. Infected enemies spread Rabies to nearby enemies.',
    up: { e: { name: 'Enhanced Rabies', desc: 'Rabies\' Poisoning damage is increased by 30%.', mods: [{ p: 'dotMult', add: 0.3 }] },
      a: { name: 'Natural Rabies', desc: 'Rabies spreads 100% faster.', mods: [{ p: 'spreadMult', set: 0.5 }] },
      b: { name: 'Savage Rabies', desc: 'Rabies deals its total Poisoning damage in 4 seconds instead of 6.', mods: [{ p: 'dotDur', set: 4 }] } } });
  A(D, { id: 'trample', name: 'Trample', cluster: 'wrath', tags: ['werebear', 'shapeshift', 'earth', 'mobility'], element: 'physical', cd: 14, lucky: 0.25, dmg: 0.7,
    effect: { kind: 'dash', dist: 7, width: 2.0, form: 'werebear', apply: [KNOCK(1.5)], unstoppable: true },
    desc: 'Shapeshift into a Werebear, become Unstoppable, and charge forward, dealing {dmg} damage and Knocking Down enemies.',
    up: { e: { name: 'Enhanced Trample', desc: 'Trample deals 30% bonus damage.', mods: [{ p: 'dmgMult', add: 0.3 }] },
      a: { name: 'Natural Trample', desc: 'Casting Trample grants 20% Damage Reduction and increases Earth skill damage by 20% for 4 seconds.', mods: [{ on: 'cast', do: { buff: { id: 'ntrample', dur: 4, mods: [{ stat: 'dr', add: 0.2 }, { stat: 'dmg_earth', add: 0.2 }] } } }] },
      b: { name: 'Savage Trample', desc: 'Casting Trample grants 20 Spirit.', mods: [{ on: 'cast', do: { gain: 'resource', amt: 20 } }] } } });
  P(D, { id: 'crushing_earth', name: 'Crushing Earth', cluster: 'wrath', desc: 'Earth skills deal {r}% increased damage to Slowed, Stunned, Immobilized or Knocked Down enemies.', vals: [5, 10, 15], mods: [{ stat: 'dmg_earth', add: 0.05, when: 'target_cc' }, { stat: 'dmg_earth', add: 0.05, when: 'target_slowed' }] });
  P(D, { id: 'safeguard', name: 'Safeguard', cluster: 'wrath', desc: 'Critical Strikes with Earth skills Fortify you for {r}% of your Maximum Life.', vals: [2, 4, 6], mods: [{ on: 'crit', tag: 'earth', do: { fortify: 0.02 } }] });
  P(D, { id: 'stone_guard', name: 'Stone Guard', cluster: 'wrath', desc: 'While you have Fortify for over 50% of your Maximum Life, your Earth skills deal {r}% increased damage.', vals: [4, 8, 12], mods: [{ stat: 'dmg_earth', add: 0.04, when: 'self_fortified' }] });
  P(D, { id: 'neurotoxin', name: 'Neurotoxin', cluster: 'wrath', desc: 'Poisoned enemies are Slowed by {r}%.', vals: [8, 16, 24], mods: [{ flag: 'poison_slow', v: 0.08 }] });
  P(D, { id: 'toxic_claws', name: 'Toxic Claws', cluster: 'wrath', desc: 'Critical Strikes with Werewolf skills deal {r}% of their damage as Poisoning damage over 4 seconds.', vals: [8, 16, 24], mods: [{ on: 'crit', tag: 'werewolf', do: { applyScaled: { st: 'poison', pct: 0.08, dur: 4 } } }] });
  P(D, { id: 'envenom', name: 'Envenom', cluster: 'wrath', desc: 'Poisoned enemies take {r}% additional Critical Strike Damage.', vals: [10, 20, 30], mods: [{ stat: 'crit_dmg', add: 0.1, when: 'target_poisoned' }] });
  P(D, { id: 'mending', name: 'Mending', cluster: 'wrath', desc: 'While in Werebear form, you receive {r}% additional healing from all sources.', vals: [5, 10, 15], mods: [{ stat: 'healing', add: 0.05, when: 'self_werebear' }] });
  P(D, { id: 'provocation', name: 'Provocation', cluster: 'wrath', desc: 'When you remain in Werebear form for at least {r} seconds, your next skill will Overpower.', vals: [6, 4, 2], mods: [{ flag: 'provocation', v: 6 }] });
  P(D, { id: 'charged_atmosphere', name: 'Charged Atmosphere', cluster: 'wrath', desc: 'Every {r} seconds, a Lightning Strike hits a nearby enemy dealing 45% weapon damage.', vals: [6, 4, 3], mods: [{ flag: 'charged_atmosphere', v: 6 }] });
  P(D, { id: 'endless_tempest', name: 'Endless Tempest', cluster: 'wrath', desc: 'Increase the duration of Hurricane and Cataclysm by {r}%.', vals: [5, 10, 15], mods: [{ flag: 'endless_tempest', v: 0.05 }] });
  P(D, { id: 'bad_omen', name: 'Bad Omen', cluster: 'wrath', desc: 'Lucky Hit: Up to a {r}% chance when dealing damage to a Vulnerable, Immobilized or Slowed enemy that a Lightning Bolt also strikes dealing 55% weapon damage.', vals: [10, 20, 30], mods: [{ on: 'lucky', when: 'target_cc_or_vuln', chance: 0.1, do: { bolt: 0.55 } }] });
  P(D, { id: 'electric_shock', name: 'Electric Shock', cluster: 'wrath', desc: 'Lucky Hit: Dealing Lightning damage to enemies has a {r}% chance to Immobilize them for 3 seconds.', vals: [5, 10, 15], mods: [{ on: 'lucky', element: 'lightning', chance: 0.05, do: { apply: IMMOB(3) } }] });
  P(D, { id: 'elemental_exposure', name: 'Elemental Exposure', cluster: 'wrath', desc: 'Lucky Hit: Your Storm skills have up to a {r}% chance to make enemies Vulnerable for 1 second.', vals: [10, 20, 30], mods: [{ on: 'lucky', tag: 'storm', chance: 0.1, do: { apply: VULN(1) } }] });
  // Ultimate
  A(D, { id: 'cataclysm', name: 'Cataclysm', cluster: 'ultimate', tags: ['storm', 'lightning', 'aoe'], element: 'lightning', cd: 60, lucky: 0.1, dmg: 0.52, max: 1,
    effect: { kind: 'buff', dur: 8, aura: { radius: 6, interval: 0.25, coef: 0.52, bolts: true }, mods: [], glow: '#7fd6ff' },
    desc: 'A massive storm follows you for 8 seconds. Lightning strikes wildly dealing {dmg} damage.',
    up: { e: { name: 'Prime Cataclysm', desc: 'Cataclysm\'s duration is increased by 2 seconds.', mods: [{ p: 'dur', add: 2 }] },
      a: { name: 'Supreme Cataclysm', desc: 'Enemies damaged by Cataclysm are Vulnerable for 2 seconds.', mods: [{ apply: VULN(2) }] } } });
  A(D, { id: 'grizzly_rage', name: 'Grizzly Rage', cluster: 'ultimate', tags: ['werebear', 'shapeshift', 'buff'], element: 'physical', cd: 50, lucky: 0, dmg: 0, max: 1,
    effect: { kind: 'buff', dur: 10, form: 'werebear', lockForm: true, unstoppable: true, mods: [{ stat: 'dmg', add: 0.2 }, { stat: 'dr', add: 0.2 }], ramp: { stat: 'dmg', add: 0.03, max: 10 }, extendOnKill: 1, extendMax: 5, glow: '#c9a86a' },
    desc: 'Shapeshift into a Dire Werebear for 10 seconds gaining 20% bonus damage and 20% Damage Reduction. Damage bonus is increased by 3% each second. Kills extend the duration by 1 second, up to 5 seconds.',
    up: { e: { name: 'Prime Grizzly Rage', desc: 'While Grizzly Rage is active, gain 8% Maximum Life as Fortify per second.', mods: [{ p: 'fortifyTick', set: 0.08 }] },
      a: { name: 'Supreme Grizzly Rage', desc: 'Gain 20% Critical Strike Chance while Grizzly Rage is active.', mods: [{ p: 'mods', push: { stat: 'crit_chance', add: 0.2 } }] } } });
  A(D, { id: 'lacerate', name: 'Lacerate', cluster: 'ultimate', tags: ['werewolf', 'shapeshift', 'melee'], element: 'physical', cd: 50, lucky: 0.1, dmg: 0.75, max: 1,
    effect: { kind: 'multiDash', dashes: 10, dist: 4, width: 1.4, interval: 0.25, form: 'werewolf', immune: true, healPct: 0.03 },
    desc: 'Shapeshift into a Werewolf, become Immune and quickly dash 10 times between nearby enemies dealing {dmg} damage each. Heal 3% of Maximum Life per hit.',
    up: { e: { name: 'Prime Lacerate', desc: 'Lacerate\'s Critical Strikes Heal for an additional 3% of Maximum Life.', mods: [{ on: 'crit', do: { heal: 0.03 } }] },
      a: { name: 'Supreme Lacerate', desc: 'Lacerate\'s first strike makes enemies Vulnerable for 5 seconds and Lacerate has 20% Critical Strike Chance.', mods: [{ on: 'first_hit', do: { apply: VULN(5) } }, { p: 'critBonus', add: 0.2 }] } } });
  A(D, { id: 'petrify', name: 'Petrify', cluster: 'ultimate', tags: ['earth', 'aoe'], element: 'physical', cd: 50, lucky: 0, dmg: 0, max: 1,
    effect: { kind: 'aoeDebuff', at: 'self', radius: 6, apply: { st: 'stun', dur: 3, petrify: true } },
    desc: 'Encase all Nearby enemies in stone, Stunning them for 3 seconds. You deal 25% increased Critical Strike Damage to Petrified enemies.',
    up: { e: { name: 'Prime Petrify', desc: 'Petrify generates 50 Spirit.', mods: [{ on: 'cast', do: { gain: 'resource', amt: 50 } }] },
      a: { name: 'Supreme Petrify', desc: 'Killing a Petrified enemy reduces Petrify\'s Cooldown by 2 seconds.', mods: [{ on: 'any_kill', when: 'target_petrified', do: { cdr_skill: 2 } }] } } });
  P(D, { id: 'quickshift', name: 'Quickshift', cluster: 'ultimate', desc: 'When a Shapeshifting skill transforms you into a different form, it deals {r}% increased damage.', vals: [5, 10, 15], mods: [{ flag: 'quickshift', v: 0.05 }] });
  P(D, { id: 'natural_fortitude', name: 'Natural Fortitude', cluster: 'ultimate', desc: 'Shapeshifting Fortifies you for {r}% of your Maximum Life.', vals: [2, 4, 6], mods: [{ on: 'shapeshift', do: { fortify: 0.02 } }] });
  P(D, { id: 'heightened_senses', name: 'Heightened Senses', cluster: 'ultimate', desc: 'Upon shapeshifting into a Werewolf, gain {r}% Damage Reduction for 5 seconds; into a Werebear, gain 10% Maximum Life as Fortify.', vals: [4, 8, 12], mods: [{ on: 'shapeshift', form: 'werewolf', do: { buff: { id: 'hsenses', dur: 5, mods: [{ stat: 'dr', add: 0.04 }] } } }, { on: 'shapeshift', form: 'werebear', do: { fortify: 0.1 } }] });
  P(D, { id: 'defiance_druid', name: 'Defiance', cluster: 'ultimate', desc: 'Nature Magic skills deal {r}% increased damage to Elites.', vals: [4, 8, 12], mods: [{ stat: 'dmg_vs_elite', add: 0.04 }] });
  P(D, { id: 'natural_disaster', name: 'Natural Disaster', cluster: 'ultimate', desc: 'Your Earth skills deal {r}% increased damage to Vulnerable enemies. Your Storm skills deal {r}% increased damage to Crowd Controlled enemies.', vals: [4, 8, 12], mods: [{ stat: 'dmg_earth', add: 0.04, when: 'target_vuln' }, { stat: 'dmg_storm', add: 0.04, when: 'target_cc' }] });
  P(D, { id: 'circle_of_life', name: 'Circle of Life', cluster: 'ultimate', desc: 'Nature Magic skills that consume Spirit Heal you for {r}% of your Maximum Life.', vals: [1, 2, 3], mods: [{ on: 'cast', tag: 'core', do: { heal: 0.01 } }] });
  P(D, { id: 'resonance', name: 'Resonance', cluster: 'ultimate', desc: 'Nature Magic skills deal {r}% increased damage.', vals: [2, 4, 6], mods: [{ stat: 'dmg_earth', add: 0.02 }, { stat: 'dmg_storm', add: 0.02 }] });
  K(D, { id: 'natures_fury', name: 'Nature\'s Fury', desc: 'Casting an Earth skill has a 30% chance to trigger a free Storm skill of the same category, and vice versa.', mods: [{ flag: 'natures_fury' }] });
  K(D, { id: 'earthen_might', name: 'Earthen Might', desc: 'Lucky Hit: Damage from your Earth skills has up to a 5% chance to guarantee Critical Strikes and Overpowers for 5 seconds.', mods: [{ on: 'lucky', tag: 'earth', chance: 0.05, do: { buff: { id: 'emight', dur: 5, mods: [{ stat: 'crit_chance', add: 1 }, { stat: 'overpower_chance', add: 1 }] } } }] });
  K(D, { id: 'lupine_ferocity', name: 'Lupine Ferocity', desc: 'Every 6th Werewolf skill hit Critically Strikes and deals 70% increased damage, 140% against Injured enemies.', mods: [{ flag: 'lupine_ferocity' }] });
  K(D, { id: 'bestial_rampage', name: 'Bestial Rampage', desc: 'After being a Werewolf for 2.5 seconds, gain 20% Attack Speed for 15s. After being a Werebear for 2.5 seconds, deal 25% increased damage for 15s.', mods: [{ flag: 'bestial_rampage' }] });
  K(D, { id: 'perfect_storm', name: 'Perfect Storm', desc: 'Your Storm skills grant 2 Spirit and deal 15% increased damage when damaging a Vulnerable, Immobilized or Slowed enemy.', mods: [{ stat: 'dmg_storm', add: 0.15, when: 'target_cc_or_vuln' }, { on: 'hit', tag: 'storm', when: 'target_cc_or_vuln', do: { gain: 'resource', amt: 2 } }] });
  K(D, { id: 'ursine_strength', name: 'Ursine Strength', desc: 'Gain 20% additional Maximum Life while in Werebear form. While Healthy, deal 30% increased damage.', mods: [{ stat: 'life_pct', add: 0.2, when: 'self_werebear' }, { stat: 'dmg', add: 0.3, when: 'self_healthy' }] });

  // ---- export -------------------------------------------------------------
  const byId = {};
  skills.forEach(s => { byId[s.id] = s; });
  DATA.skills = skills;
  DATA.skillById = byId;
  DATA.clusters = clusters;
  DATA.CLUSTER_NAMES = CLUSTER_NAMES;
  DATA.CLUSTER_REQ = CLUSTER_REQ;
  DATA.skillsFor = (cls) => skills.filter(s => s.cls === cls);
  DATA.clusterReq = (cls, cluster) => CLUSTER_REQ[clusters[cls].indexOf(cluster)] || 0;
})();
