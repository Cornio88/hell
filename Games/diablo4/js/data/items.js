/* Sanctuary — item data: bases, affix pools, aspects, uniques, gems, materials (global: DATA.items*) */
(function () {
  'use strict';
  DATA.STAT_DEFS.thorns_pct = { name: 'Thorns', kind: 'pct', group: 'Defense' };

  DATA.RARITY = {
    normal: { name: 'Normal', color: '#cfcfcf', affixes: 0, order: 0 },
    magic: { name: 'Magic', color: '#6f8cff', affixes: 1, order: 1 },
    rare: { name: 'Rare', color: '#ffe55c', affixes: 3, order: 2 },
    legendary: { name: 'Legendary', color: '#ff8c1a', affixes: 3, order: 3 },
    unique: { name: 'Unique', color: '#c9a86a', affixes: 4, order: 4 },
    mythic: { name: 'Mythic Unique', color: '#b36cff', affixes: 4, order: 5 }
  };

  DATA.ARMOR_SLOTS = ['helm', 'chest', 'gloves', 'pants', 'boots'];
  DATA.JEWELRY_SLOTS = ['amulet', 'ring1', 'ring2'];
  DATA.SLOT_NAMES = { helm: 'Helm', chest: 'Chest Armor', gloves: 'Gloves', pants: 'Pants', boots: 'Boots', amulet: 'Amulet', ring1: 'Ring', ring2: 'Ring', weapon: 'Weapon', offhand: 'Off-Hand', bludgeon: '2H Bludgeoning', slash: '2H Slashing', dual1: 'Dual Wield 1', dual2: 'Dual Wield 2' };

  // Weapon/offhand types. dps: relative damage, aps: attacks per second, hands.
  DATA.WEAPON_TYPES = {
    sword1h: { name: 'Sword', hands: 1, dmg: 1.0, aps: 1.1, inherent: { stat: 'crit_dmg', v: 0.175 }, cls: ['necromancer', 'paladin', 'barbarian'] },
    axe1h: { name: 'Axe', hands: 1, dmg: 1.05, aps: 1.0, inherent: { stat: 'dmg_vs_healthy', v: 0.2 }, cls: ['necromancer', 'paladin', 'barbarian', 'druid'] },
    mace1h: { name: 'Mace', hands: 1, dmg: 1.1, aps: 0.9, inherent: { stat: 'overpower_dmg', v: 0.35 }, cls: ['necromancer', 'paladin', 'barbarian', 'druid'] },
    dagger: { name: 'Dagger', hands: 1, dmg: 0.8, aps: 1.3, inherent: { stat: 'dmg_close', v: 0.2 }, cls: ['necromancer'] },
    wand: { name: 'Wand', hands: 1, dmg: 0.9, aps: 1.1, inherent: { stat: 'lucky_hit', v: 0.2 }, cls: ['necromancer'] },
    scythe1h: { name: 'Scythe', hands: 1, dmg: 1.0, aps: 1.0, inherent: { stat: 'life_on_kill', v: 1.0, scale: true }, cls: ['necromancer'] },
    sword2h: { name: 'Two-Handed Sword', hands: 2, dmg: 1.9, aps: 0.9, inherent: { stat: 'dmg_bleed', v: 0.4 }, cls: ['necromancer', 'paladin', 'barbarian'] },
    axe2h: { name: 'Two-Handed Axe', hands: 2, dmg: 2.0, aps: 0.85, inherent: { stat: 'dmg_vs_vuln', v: 0.3 }, cls: ['barbarian', 'druid'] },
    mace2h: { name: 'Two-Handed Mace', hands: 2, dmg: 2.1, aps: 0.8, inherent: { stat: 'overpower_dmg', v: 0.6 }, cls: ['paladin', 'barbarian', 'druid'] },
    polearm: { name: 'Polearm', hands: 2, dmg: 1.9, aps: 0.9, inherent: { stat: 'dmg_vs_vuln', v: 0.25 }, cls: ['paladin', 'barbarian'] },
    scythe2h: { name: 'Two-Handed Scythe', hands: 2, dmg: 1.9, aps: 0.9, inherent: { stat: 'life_on_kill', v: 2.0, scale: true }, cls: ['necromancer'] },
    staff: { name: 'Staff', hands: 2, dmg: 1.8, aps: 0.95, inherent: { stat: 'dmg_vs_cc', v: 0.3 }, cls: ['druid'] },
    shield: { name: 'Shield', hands: 0, offhand: true, inherent: { stat: 'block_chance', v: 0.3 }, inherent2: { stat: 'block_red', v: 0.4 }, cls: ['necromancer', 'paladin'] },
    focus: { name: 'Focus', hands: 0, offhand: true, inherent: { stat: 'cdr', v: 0.1 }, cls: ['necromancer'] },
    totem: { name: 'Totem', hands: 0, offhand: true, inherent: { stat: 'cdr', v: 0.1 }, cls: ['druid'] }
  };

  // Base item names by slot (flavor). Weapons use WEAPON_TYPES names with prefixes.
  DATA.BASE_NAMES = {
    helm: ['Cap', 'Hood', 'Helm', 'Crown', 'Great Helm', 'Skull Cap', 'Visage', 'Mask'],
    chest: ['Tunic', 'Robe', 'Hauberk', 'Breastplate', 'Cuirass', 'Plate', 'Vestments', 'Shroud'],
    gloves: ['Gloves', 'Gauntlets', 'Grips', 'Handguards', 'Fists', 'Wraps'],
    pants: ['Leggings', 'Greaves', 'Pants', 'Legplates', 'Faulds', 'Trousers'],
    boots: ['Boots', 'Sabatons', 'Treads', 'Striders', 'Greaves', 'Walkers'],
    amulet: ['Amulet', 'Pendant', 'Necklace', 'Talisman', 'Choker'],
    ring: ['Ring', 'Band', 'Loop', 'Circle', 'Signet']
  };
  DATA.PREFIXES = ['Ancient', 'Grim', 'Hallowed', 'Savage', 'Blessed', 'Cruel', 'Rotting', 'Ashen', 'Frozen', 'Storm', 'Vile', 'Gilded', 'Wicked', 'Sacred', 'Iron', 'Bone', 'Blood', 'Shadow', 'Thunder', 'Ember'];

  // Affix pool. v = [min,max] at item power 1 scale (final = roll * powerScale). pct values are fractions.
  // slots: which slots can roll it. 'armor' expands to armor slots, 'jewelry' to amulet/rings, 'weapon' to any weapon, 'offhand'.
  const A = (stat, slots, lo, hi, opt) => Object.assign({ stat, slots, lo, hi, w: 1 }, opt || {});
  DATA.AFFIX_POOL = [
    // core stats
    A('str', ['armor', 'jewelry', 'weapon', 'offhand'], 6, 12, { flat: true, scale: 'core' }),
    A('int', ['armor', 'jewelry', 'weapon', 'offhand'], 6, 12, { flat: true, scale: 'core' }),
    A('will', ['armor', 'jewelry', 'weapon', 'offhand'], 6, 12, { flat: true, scale: 'core' }),
    A('dex', ['armor', 'jewelry', 'weapon', 'offhand'], 6, 12, { flat: true, scale: 'core' }),
    A('all_stats', ['amulet', 'chest', 'weapon'], 3, 6, { flat: true, scale: 'core', w: 0.6 }),
    // defense
    A('life', ['armor', 'jewelry', 'offhand', 'weapon'], 20, 40, { flat: true, scale: 'life', w: 1.3 }),
    A('life_pct', ['chest', 'helm', 'amulet'], 0.03, 0.06),
    A('armor', ['armor', 'offhand'], 15, 30, { flat: true, scale: 'armor' }),
    A('armor_pct', ['helm', 'chest', 'pants', 'amulet'], 0.04, 0.09),
    A('dr', ['chest', 'pants', 'amulet'], 0.03, 0.06, { w: 0.6 }),
    A('dr_close', ['chest', 'pants', 'helm', 'ring1', 'ring2'], 0.04, 0.09),
    A('dr_distant', ['chest', 'pants', 'helm', 'ring1', 'ring2'], 0.04, 0.09),
    A('dr_fortified', ['chest', 'pants'], 0.04, 0.08),
    A('dr_injured', ['chest', 'pants', 'helm'], 0.04, 0.08),
    A('dr_elite', ['chest', 'pants', 'helm'], 0.03, 0.07),
    A('dr_dot', ['chest', 'pants'], 0.04, 0.08, { w: 0.5 }),
    A('dr_vs_cc', ['pants'], 0.04, 0.08, { w: 0.5 }),
    A('dr_vs_bleeding', ['pants'], 0.04, 0.09, { w: 0.4 }),
    A('dr_vs_poisoned', ['pants'], 0.04, 0.09, { w: 0.4 }),
    A('res_fire', ['armor', 'jewelry', 'offhand'], 0.06, 0.12),
    A('res_cold', ['armor', 'jewelry', 'offhand'], 0.06, 0.12),
    A('res_light', ['armor', 'jewelry', 'offhand'], 0.06, 0.12),
    A('res_poison', ['armor', 'jewelry', 'offhand'], 0.06, 0.12),
    A('res_shadow', ['armor', 'jewelry', 'offhand'], 0.06, 0.12),
    A('res_all', ['amulet', 'ring1', 'ring2', 'chest'], 0.03, 0.06, { w: 0.7 }),
    A('max_res', ['helm', 'amulet'], 0.02, 0.04, { w: 0.3 }),
    A('dodge', ['boots', 'pants', 'helm'], 0.03, 0.06),
    A('thorns', ['chest', 'pants', 'gloves', 'offhand'], 10, 25, { flat: true, scale: 'thorns' }),
    A('life_regen', ['helm', 'chest', 'offhand', 'ring1', 'ring2'], 1, 3, { flat: true, scale: 'regen', w: 0.8 }),
    A('life_on_hit', ['weapon', 'ring1', 'ring2'], 1, 3, { flat: true, scale: 'regen', w: 0.6 }),
    A('life_on_kill', ['weapon', 'helm', 'amulet'], 3, 8, { flat: true, scale: 'regen', w: 0.8 }),
    A('healing', ['helm', 'amulet', 'ring1', 'ring2'], 0.04, 0.09, { w: 0.6 }),
    A('potion_heal', ['helm', 'chest', 'amulet'], 0.05, 0.12, { w: 0.5 }),
    A('potion_charges', ['helm', 'boots', 'amulet'], 1, 1, { flat: true, w: 0.25 }),
    A('fortify_gen', ['helm', 'chest', 'pants'], 0.05, 0.12, { w: 0.5 }),
    A('barrier_gen', ['helm', 'chest', 'pants', 'offhand'], 0.05, 0.12, { w: 0.5 }),
    A('cc_reduction', ['helm', 'boots', 'amulet'], 0.05, 0.12, { w: 0.5 }),
    A('block_chance', ['offhand'], 0.03, 0.08, { w: 0.8 }),
    // offense
    A('dmg', ['weapon', 'gloves', 'amulet', 'ring1', 'ring2'], 0.04, 0.09, { w: 1.2 }),
    A('dmg_close', ['weapon', 'gloves', 'ring1', 'ring2', 'amulet'], 0.05, 0.11),
    A('dmg_distant', ['weapon', 'gloves', 'ring1', 'ring2', 'amulet'], 0.05, 0.11),
    A('dmg_vs_cc', ['weapon', 'gloves', 'ring1', 'ring2'], 0.05, 0.11),
    A('dmg_vs_slowed', ['weapon', 'gloves', 'ring1', 'ring2'], 0.05, 0.11, { w: 0.7 }),
    A('dmg_vs_stunned', ['weapon', 'gloves'], 0.05, 0.11, { w: 0.6 }),
    A('dmg_vs_healthy', ['weapon', 'ring1', 'ring2'], 0.05, 0.11, { w: 0.7 }),
    A('dmg_vs_injured', ['weapon', 'ring1', 'ring2'], 0.05, 0.11, { w: 0.7 }),
    A('dmg_vs_elite', ['weapon', 'amulet'], 0.04, 0.09, { w: 0.6 }),
    A('dmg_vs_vuln', ['weapon', 'ring1', 'ring2', 'gloves'], 0.05, 0.1, { w: 0.7 }),
    A('dmg_vs_poisoned', ['weapon', 'ring1', 'ring2'], 0.05, 0.11, { w: 0.4 }),
    A('dmg_vs_bleeding', ['weapon', 'ring1', 'ring2'], 0.05, 0.11, { w: 0.4 }),
    A('dmg_phys', ['weapon', 'ring1', 'ring2', 'amulet'], 0.04, 0.09, { w: 0.8 }),
    A('dmg_fire', ['weapon', 'ring1', 'ring2'], 0.04, 0.09, { w: 0.6 }),
    A('dmg_cold', ['weapon', 'ring1', 'ring2'], 0.04, 0.09, { w: 0.6 }),
    A('dmg_light', ['weapon', 'ring1', 'ring2'], 0.04, 0.09, { w: 0.6 }),
    A('dmg_poison', ['weapon', 'ring1', 'ring2'], 0.04, 0.09, { w: 0.6 }),
    A('dmg_shadow', ['weapon', 'ring1', 'ring2'], 0.04, 0.09, { w: 0.6 }),
    A('dmg_holy', ['weapon', 'ring1', 'ring2'], 0.04, 0.09, { w: 0.6, cls: ['paladin'] }),
    A('dmg_dot', ['weapon', 'ring1', 'ring2', 'amulet'], 0.05, 0.11, { w: 0.6 }),
    A('dmg_basic', ['gloves', 'weapon', 'amulet'], 0.05, 0.11, { w: 0.6 }),
    A('dmg_core', ['weapon', 'gloves', 'amulet', 'ring1', 'ring2'], 0.04, 0.09, { w: 0.9 }),
    A('dmg_ult', ['weapon', 'amulet'], 0.05, 0.12, { w: 0.5 }),
    A('dmg_summon', ['weapon', 'amulet', 'ring1', 'ring2', 'offhand'], 0.06, 0.14, { w: 0.6, cls: ['necromancer', 'druid'] }),
    A('crit_chance', ['weapon', 'gloves', 'ring1', 'ring2', 'amulet'], 0.02, 0.045, { w: 1.1 }),
    A('crit_dmg', ['weapon', 'gloves', 'ring1', 'ring2', 'amulet'], 0.06, 0.14, { w: 1.1 }),
    A('crit_dmg_vs_vuln', ['weapon', 'ring1', 'ring2'], 0.06, 0.14, { w: 0.5 }),
    A('vuln_dmg', ['weapon', 'gloves', 'ring1', 'ring2', 'amulet'], 0.05, 0.12, { w: 1.0 }),
    A('overpower_dmg', ['weapon', 'gloves', 'ring1', 'ring2'], 0.08, 0.2, { w: 0.6 }),
    A('overpower_chance', ['gloves', 'amulet'], 0.02, 0.04, { w: 0.3 }),
    A('lucky_hit', ['weapon', 'gloves', 'ring1', 'ring2', 'amulet'], 0.04, 0.09, { w: 0.8 }),
    A('attack_speed', ['gloves', 'weapon', 'ring1', 'ring2'], 0.04, 0.09, { w: 1.0 }),
    A('attack_speed_basic', ['gloves'], 0.05, 0.12, { w: 0.5 }),
    A('cdr', ['helm', 'amulet', 'offhand', 'ring1', 'ring2'], 0.03, 0.07, { w: 0.9 }),
    A('resource_gen', ['helm', 'ring1', 'ring2', 'amulet', 'offhand'], 0.04, 0.09, { w: 0.9 }),
    A('resource_cost_red', ['amulet', 'ring1', 'ring2', 'offhand'], 0.04, 0.09, { w: 0.7 }),
    A('max_resource', ['helm', 'ring1', 'ring2', 'amulet', 'offhand', 'weapon'], 3, 7, { flat: true, w: 0.6, scale: 'small' }),
    A('resource_on_kill', ['weapon', 'ring1', 'ring2'], 2, 5, { flat: true, w: 0.5, scale: 'small' }),
    A('lucky_resource', ['ring1', 'ring2', 'amulet', 'offhand'], 0.06, 0.14, { w: 0.6 }),
    A('lucky_vuln', ['weapon', 'gloves', 'amulet'], 0.05, 0.12, { w: 0.5 }),
    A('lucky_slow', ['weapon', 'gloves', 'boots'], 0.08, 0.16, { w: 0.4 }),
    A('lucky_stun', ['weapon', 'gloves'], 0.04, 0.09, { w: 0.4 }),
    A('lucky_heal', ['helm', 'amulet', 'offhand'], 0.06, 0.12, { w: 0.5 }),
    A('lucky_fortify', ['chest', 'pants', 'offhand'], 0.06, 0.12, { w: 0.4 }),
    A('lucky_barrier', ['chest', 'offhand'], 0.05, 0.1, { w: 0.4 }),
    A('lucky_freeze', ['weapon', 'gloves'], 0.04, 0.09, { w: 0.3 }),
    A('lucky_burn', ['weapon', 'gloves'], 0.05, 0.1, { w: 0.3 }),
    A('lucky_poison', ['weapon', 'gloves'], 0.05, 0.1, { w: 0.3 }),
    A('lucky_bleed', ['weapon', 'gloves'], 0.05, 0.1, { w: 0.3 }),
    A('lucky_immob', ['weapon', 'gloves'], 0.04, 0.09, { w: 0.3 }),
    A('lucky_daze', ['weapon', 'gloves'], 0.05, 0.1, { w: 0.3 }),
    A('lucky_execute', ['weapon'], 0.01, 0.03, { w: 0.15 }),
    A('dot_duration', ['weapon', 'amulet'], 0.05, 0.12, { w: 0.4 }),
    A('cc_duration', ['weapon', 'gloves', 'amulet'], 0.05, 0.12, { w: 0.4 }),
    A('slow_dur', ['boots', 'weapon'], 0.06, 0.14, { w: 0.3 }),
    // utility
    A('move_speed', ['boots', 'amulet'], 0.05, 0.12, { w: 1.2 }),
    A('move_speed_kill', ['boots'], 0.06, 0.14, { w: 0.5 }),
    A('evade_charges', ['boots'], 1, 1, { flat: true, w: 0.3 }),
    A('evade_cdr', ['boots'], 0.08, 0.18, { w: 0.5 }),
    A('xp_bonus', ['helm', 'amulet', 'ring1', 'ring2'], 0.02, 0.05, { w: 0.4 }),
    A('gold_find', ['boots', 'gloves', 'ring1', 'ring2'], 0.05, 0.15, { w: 0.4 }),
    A('item_find', ['amulet', 'ring1', 'ring2', 'helm'], 0.03, 0.08, { w: 0.4 }),
    A('minion_life', ['chest', 'helm', 'offhand', 'amulet'], 0.08, 0.18, { w: 0.5, cls: ['necromancer', 'druid'] }),
    A('minion_attack_speed', ['gloves', 'offhand'], 0.05, 0.12, { w: 0.4, cls: ['necromancer', 'druid'] }),
    A('shout_duration', ['helm', 'amulet'], 0.06, 0.14, { w: 0.4, cls: ['barbarian'] }),
    A('berserk_dur', ['helm', 'amulet'], 0.1, 0.25, { w: 0.4, cls: ['barbarian'] }),
    A('shapeshift_dur', ['helm', 'amulet'], 0.1, 0.25, { w: 0.4, cls: ['druid'] }),
    A('pickup_radius', ['boots', 'gloves'], 0.1, 0.25, { w: 0.3 }),
    // skill ranks (resolved into rank_<cluster> or rank_<skill>)
    A('rank_all', ['amulet'], 1, 1, { flat: true, w: 0.3 }),
    A('rank_basic', ['gloves', 'amulet'], 1, 2, { flat: true, w: 0.5 }),
    A('rank_core', ['gloves', 'amulet', 'weapon'], 1, 2, { flat: true, w: 0.6 }),
    A('rank_defensive', ['helm', 'chest', 'amulet'], 1, 2, { flat: true, w: 0.5 }),
    A('rank_ult', ['helm', 'amulet'], 1, 2, { flat: true, w: 0.4 }),
    A('rank_cluster3', ['amulet', 'helm', 'pants', 'gloves'], 1, 2, { flat: true, w: 0.5 }),
    A('rank_cluster4', ['amulet', 'chest', 'pants', 'gloves'], 1, 2, { flat: true, w: 0.5 }),
    A('rank_cluster5', ['amulet', 'chest', 'pants', 'gloves'], 1, 2, { flat: true, w: 0.5 }),
    A('rank_skill', ['gloves', 'amulet', 'ring1', 'ring2', 'weapon', 'offhand'], 1, 3, { flat: true, w: 0.8 })
  ];
  // Cluster index 2,3,4 names resolved per class at roll time (e.g. rank_macabre).

  // Scaling: how an affix magnitude grows with item power (0..1000). Returns multiplier for base [lo,hi].
  DATA.affixScale = function (affix, power) {
    const p = Math.max(1, power);
    switch (affix.scale) {
      case 'core': return 1 + p / 55;          // +12 → ~230 at 925 (D4-like)
      case 'life': return 1 + p / 28;          // 40 → ~1360
      case 'armor': return 1 + p / 40;
      case 'thorns': return 1 + p / 25;
      case 'regen': return 1 + p / 60;
      case 'small': return 1 + p / 400;
      default: return affix.flat ? 1 : 1 + p / 900; // pct affixes grow ~2x by 925
    }
  };

  // Weapon base damage per hit at item power p (1H sword baseline)
  DATA.weaponBaseDamage = function (power, type) {
    const wt = DATA.WEAPON_TYPES[type];
    const base = 2.5 + 0.045 * Math.pow(power, 1.42);
    return base * (wt ? wt.dmg : 1);
  };
  DATA.armorBaseValue = function (power, slot) {
    const mult = { helm: 0.9, chest: 1.3, gloves: 0.7, pants: 1.1, boots: 0.7, offhand: 1.0 }[slot] || 1;
    return Math.round((8 + power * 1.05) * mult);
  };

  // ---- Legendary Aspects (Codex of Power). v placeholder resolved from range [lo,hi]. 'all' or class list.
  // slots: 'offensive' -> weapon/gloves/amulet/rings ; 'defensive' -> helm/chest/pants/offhand(shield) ; 'utility' -> helm/chest/gloves/boots/offhand ; 'resource' -> rings/offhand/helm ; 'mobility' -> boots/amulet
  const CAT_SLOTS = { offensive: ['weapon', 'gloves', 'amulet', 'ring1', 'ring2', 'bludgeon', 'slash', 'dual1', 'dual2'], defensive: ['helm', 'chest', 'pants', 'offhand', 'amulet'], utility: ['helm', 'chest', 'gloves', 'boots', 'offhand', 'amulet'], resource: ['ring1', 'ring2', 'offhand', 'helm', 'amulet'], mobility: ['boots', 'amulet'] };
  DATA.ASPECT_CAT_SLOTS = CAT_SLOTS;
  const ASP = (id, name, cls, cat, lo, hi, desc, mods, opt) => Object.assign({ id, name, cls, cat, lo, hi, desc, mods }, opt || {});
  DATA.ASPECTS = [
    // generic
    ASP('edgemaster', 'Edgemaster\'s Aspect', 'all', 'offensive', 0.1, 0.2, 'Skills deal up to {v}% increased damage based on your available Primary Resource when cast, receiving the maximum benefit while you have full Resource.', [{ flag: 'edgemaster', v: 1 }]),
    ASP('accelerating', 'Accelerating Aspect', 'all', 'offensive', 0.15, 0.25, 'Critical Strikes with Core Skills increase your Attack Speed by {v}% for 5 seconds.', [{ on: 'crit', tag: 'core', do: { buff: { id: 'accel', dur: 5, mods: [{ stat: 'attack_speed', v: 1 }] } } }]),
    ASP('rapid', 'Rapid Aspect', 'all', 'offensive', 0.15, 0.3, 'Basic Skills gain {v}% Attack Speed.', [{ stat: 'attack_speed_basic', v: 1 }]),
    ASP('expectant', 'Aspect of the Expectant', 'all', 'offensive', 0.05, 0.1, 'Attacking enemies with a Basic Skill increases the damage of your next Core Skill cast by {v}%, up to 30%.', [{ flag: 'expectant', v: 1 }]),
    ASP('elements', 'Elementalist\'s Aspect', 'all', 'offensive', 0.2, 0.4, 'Core Skills that consume Resource deal {v}% increased damage to Crowd Controlled enemies.', [{ stat: 'dmg_core', v: 1, when: 'target_cc' }]),
    ASP('retribution', 'Aspect of Retribution', 'all', 'offensive', 0.1, 0.2, 'Distant enemies have a 8% chance to be Stunned for 2 seconds when they hit you. You deal {v}% increased damage to Stunned enemies.', [{ stat: 'dmg_vs_stunned', v: 1 }, { flag: 'retribution_stun', v: 0.08 }]),
    ASP('inner_calm', 'Aspect of Inner Calm', 'all', 'offensive', 0.1, 0.3, 'Deal {v}% increased damage; this bonus is tripled while you have a Barrier or Fortify above 50%.', [{ stat: 'dmg', v: 1 }, { stat: 'dmg', v: 2, when: 'self_fortified' }]),
    ASP('starlight', 'Starlight Aspect', 'all', 'resource', 0.1, 0.2, 'Gain {v}% of your Maximum Resource when you are Healed by a Potion, Lucky Hit or skill.', [{ flag: 'starlight', v: 1 }]),
    ASP('umbral', 'Aspect of the Umbral', 'all', 'resource', 1, 4, 'Restore {v} of your Primary Resource when you Crowd Control an enemy.', [{ on: 'cc_applied', do: { gain: 'resource', v: 1 } }], { flat: true }),
    ASP('protector', 'Aspect of the Protector', 'all', 'defensive', 0.15, 0.3, 'When you damage an Elite enemy, you gain a Barrier absorbing up to {v}% of your Maximum Life for 10 seconds. This effect can only happen once every 30 seconds.', [{ flag: 'protector', v: 1 }]),
    ASP('disobedience', 'Aspect of Disobedience', 'all', 'defensive', 0.0025, 0.005, 'You gain {v}% increased Armor for 4 seconds when you deal any form of damage, stacking up to 60%.', [{ on: 'hit', do: { buff: { id: 'disobedience', dur: 4, stackMax: 120, mods: [{ stat: 'armor_pct', v: 1 }] } } }]),
    ASP('might', 'Aspect of Might', 'all', 'defensive', 0.2, 0.2, 'Basic Skills grant 20% Damage Reduction for {v} seconds.', [{ on: 'cast', tag: 'basic', do: { buff: { id: 'might', dur: 3, mods: [{ stat: 'dr', add: 0.2 }] } } }], { lo: 2, hi: 6, flat: true, durIsV: true }),
    ASP('shared_misery', 'Aspect of Shared Misery', 'all', 'utility', 0.3, 0.5, 'Lucky Hit: When you hit a Crowd Controlled enemy, there is up to a {v}% chance for that Crowd Control effect to spread to another unaffected enemy.', [{ flag: 'shared_misery', v: 1 }]),
    ASP('ghostwalker', 'Ghostwalker Aspect', 'all', 'mobility', 0.1, 0.25, 'While Unstoppable and for 4 seconds after, you gain {v}% Movement Speed.', [{ stat: 'move_speed', v: 1, when: 'self_unstoppable' }]),
    ASP('wind_striker', 'Wind Striker Aspect', 'all', 'mobility', 0.08, 0.2, 'Critical Strikes grant {v}% Movement Speed for 1 second, up to 6 seconds.', [{ on: 'crit', do: { buff: { id: 'windstrike', dur: 1, stackMax: 6, stackDur: true, mods: [{ stat: 'move_speed', v: 1 }] } } }]),
    ASP('juggernaut', 'Juggernaut\'s Aspect', 'all', 'defensive', 1.5, 2.5, 'Gain {v} Armor per level, but your Evade has 100% increased Cooldown.', [{ stat: 'armor', v: 1, scaleLevel: true }, { stat: 'evade_cdr', add: -1 }], { flat: true }),
    ASP('unyielding', 'Unyielding Aspect', 'all', 'defensive', 0.08, 0.15, 'Gain {v}% Damage Reduction while Fortified.', [{ stat: 'dr_fortified', v: 1 }]),
    ASP('veteran_brawler', 'Veteran Brawler\'s Aspect', 'all', 'offensive', 0.04, 0.08, 'Each time a Core Skill deals direct damage to an enemy, your next Charge or Dash skill deals {v}% increased damage, up to 40%.', [{ flag: 'veteran_brawler', v: 1 }]),
    ASP('conceited', 'Conceited Aspect', 'all', 'offensive', 0.15, 0.25, 'Deal {v}% increased damage while you have a Barrier active.', [{ stat: 'dmg_barrier', v: 1 }]),
    ASP('exploiter', 'Exploiter\'s Aspect', 'all', 'utility', 0.2, 0.5, 'You have 20% increased Crowd Control Duration. While enemies are Unstoppable, you deal {v}% increased damage to them.', [{ stat: 'cc_duration', add: 0.2 }, { stat: 'dmg_vs_elite', v: 1 }]),
    ASP('executioner', 'Executioner\'s Aspect', 'all', 'offensive', 0.15, 0.3, 'Deal {v}% increased damage to Injured enemies.', [{ stat: 'dmg_vs_injured', v: 1 }]),
    ASP('bloodied', 'Bloodied Aspect', 'all', 'utility', 2, 5, 'Gain {v} Life per second for each Nearby Bleeding, Poisoned or Burning enemy.', [{ flag: 'bloodied', v: 1 }], { flat: true, scale: 'regen' }),
    // necromancer
    ASP('blood_getters', 'Blood-Getter\'s Aspect', 'necromancer', 'utility', 0.6, 0.9, 'Your maximum number of Skeletal Warriors is increased by 2. Warriors gain {v}% Attack Speed... (summarized: +2 Warriors, +{v}% minion damage).', [{ minion: 'skeleton', count: 2 }, { stat: 'dmg_summon', v: 1 }]),
    ASP('reanimation', 'Aspect of Reanimation', 'necromancer', 'offensive', 0.2, 0.4, 'Your Skeletons gain increased damage while alive, up to {v}% after 10 seconds.', [{ stat: 'dmg_summon', v: 1 }]),
    ASP('splintering', 'Splintering Aspect', 'necromancer', 'offensive', 0.3, 0.5, 'Bone Spear\'s primary attack makes enemies hit Vulnerable for 3 seconds. Bone Spear and its shards deal {v}% increased damage to Vulnerable enemies.', [{ skill: 'bone_spear', p: 'dmgMult', v: 1, when: 'target_vuln' }, { skill: 'bone_spear', on: 'hit', do: { apply: { st: 'vulnerable', dur: 3 } } }]),
    ASP('grasping_veins', 'Aspect of Grasping Veins', 'necromancer', 'offensive', 0.1, 0.2, 'Gain {v}% Critical Strike Chance for 6 seconds when you cast Corpse Tendrils. Critical Strikes deal 50% increased damage against those enemies.', [{ skill: 'corpse_tendrils', on: 'cast', do: { buff: { id: 'gveins', dur: 6, mods: [{ stat: 'crit_chance', v: 1 }, { stat: 'crit_dmg', add: 0.5 }] } } }]),
    ASP('serration', 'Aspect of Serration', 'necromancer', 'offensive', 0.2, 0.4, 'Bone Skills gain up to {v}% Critical Strike Damage based on your current Essence.', [{ flag: 'serration_aspect', v: 1 }]),
    ASP('decay', 'Aspect of Decay', 'necromancer', 'offensive', 0.4, 0.8, 'Each time the Shadowblight Key Passive deals damage, it increases the damage of the next Shadowblight by {v}% (stacks 5x).', [{ flag: 'decay_aspect', v: 1 }]),
    ASP('torment', 'Aspect of Torment', 'necromancer', 'resource', 0.3, 0.5, 'Critical Strikes with Bone Skills increase your Essence Regeneration by {v}% for 4 seconds.', [{ on: 'crit', tag: 'bone', do: { buff: { id: 'torment', dur: 4, mods: [{ stat: 'resource_gen', v: 1 }] } } }]),
    ASP('hardened_bones', 'Aspect of Hardened Bones', 'necromancer', 'defensive', 0.08, 0.14, 'While you have 7 or more Minions, you and they gain {v}% Damage Reduction.', [{ flag: 'hardened_bones', v: 1 }]),
    ASP('blighted', 'Blighted Aspect', 'necromancer', 'offensive', 0.5, 1.0, 'You deal {v}% increased damage for 10 seconds after the Shadowblight Key Passive damages enemies 10 times.', [{ flag: 'blighted_aspect', v: 1 }]),
    ASP('bursting_bone', 'Aspect of Bursting Bone', 'necromancer', 'offensive', 0.3, 0.5, 'When Bone Prison expires or is destroyed, it releases a Bone Nova dealing {v}% weapon damage to nearby enemies (summarized as Bone Prison deals damage).', [{ skill: 'bone_prison', p: 'novaCoef', v: 1 }]),
    ASP('exposed_flesh', 'Aspect of Exposed Flesh', 'necromancer', 'resource', 20, 40, 'Lucky Hit: Up to a 25% chance to generate {v} Essence when hitting a Vulnerable enemy.', [{ on: 'lucky', when: 'target_vuln', chance: 0.25, do: { gain: 'resource', v: 1 } }], { flat: true }),
    ASP('potent_blood', 'Aspect of Potent Blood', 'necromancer', 'resource', 5, 10, 'While at full Life, Blood Orbs grant {v} Essence.', [{ flag: 'potent_blood', v: 1 }], { flat: true }),
    ASP('empowering_reaper', 'Aspect of Empowering Reaper', 'necromancer', 'offensive', 0.3, 0.6, 'Critical Strikes with Sever have a 15% chance to spawn a pool of Blight that deals {v}% weapon damage over 3s.', [{ skill: 'sever', on: 'crit', chance: 0.15, do: { ground: { radius: 2, dur: 3, interval: 0.5, coefTotal: 1 } } }], { groundV: true }),
    // paladin
    ASP('zealous', 'Zealous Aspect', 'paladin', 'offensive', 0.2, 0.4, 'Zeal\'s final strike deals {v}% increased damage and generates 10 Faith.', [{ skill: 'zeal', p: 'lastHitMult', v: 1, addTo: 1 }, { skill: 'zeal', on: 'last_hit', do: { gain: 'resource', amt: 10 } }]),
    ASP('sacred_hammers', 'Aspect of Sacred Hammers', 'paladin', 'offensive', 1, 2, 'Blessed Hammer summons {v} additional hammers and they orbit 25% faster.', [{ skill: 'blessed_hammer', p: 'count', v: 1 }, { skill: 'blessed_hammer', p: 'speed', mul: 1.25 }], { flat: true }),
    ASP('radiant_faith', 'Aspect of Radiant Faith', 'paladin', 'defensive', 0.1, 0.2, 'Your active Aura also grants {v}% Damage Reduction.', [{ stat: 'dr', v: 1, when: 'self_aura' }]),
    ASP('heavenly_wrath', 'Aspect of Heavenly Wrath', 'paladin', 'offensive', 0.25, 0.5, 'Fist of the Heavens deals {v}% increased damage and releases 2 additional bolts.', [{ skill: 'fist_of_the_heavens', p: 'dmgMult', v: 1 }, { skill: 'fist_of_the_heavens', p: 'boltsCount', add: 2 }]),
    ASP('conviction_aspect', 'Aspect of Conviction', 'paladin', 'resource', 0.15, 0.3, 'Critical Strikes with Holy damage have a {v}% chance to restore 10 Faith.', [{ on: 'crit', element: 'holy', chance: 1, do: { gain: 'resource', amt: 10 } }], { chanceV: true }),
    ASP('holy_bulwark', 'Aspect of the Holy Bulwark', 'paladin', 'defensive', 0.3, 0.5, 'Blocking has a {v}% chance to Fortify you for 5% of Maximum Life and reduce Holy Shield\'s Cooldown by 1 second.', [{ flag: 'holy_bulwark', v: 1 }]),
    ASP('consecrated_ground', 'Aspect of Consecrated Ground', 'paladin', 'offensive', 0.3, 0.6, 'Consecration deals {v}% increased damage and lasts 2 seconds longer.', [{ skill: 'consecration', p: 'dmgMult', v: 1 }, { skill: 'consecration', p: 'dur', add: 2 }]),
    ASP('smiting', 'Smiting Aspect', 'paladin', 'offensive', 0.15, 0.3, 'Smite and Righteous Strike deal {v}% increased damage and Daze enemies for 1s.', [{ skill: 'smite', p: 'dmgMult', v: 1 }, { skill: 'righteous_strike', p: 'dmgMult', v: 1 }, { skill: 'smite', on: 'hit', do: { apply: { st: 'daze', dur: 1 } } }]),
    ASP('lightbringer', 'Lightbringer\'s Aspect', 'paladin', 'offensive', 0.1, 0.2, 'Holy damage has a {v}% chance to Burn enemies for 60% of the damage dealt over 3 seconds.', [{ on: 'hit', element: 'holy', chance: 1, do: { applyScaled: { st: 'burn', pct: 0.6, dur: 3 } } }], { chanceV: true }),
    // barbarian
    ASP('ancestral_force', 'Aspect of Ancestral Force', 'barbarian', 'offensive', 0.32, 0.5, 'Hammer of the Ancients quakes outwards, dealing {v}% of its damage to enemies in a larger radius.', [{ skill: 'hota', p: 'radius', mul: 1.6 }, { skill: 'hota', p: 'dmgMult', v: 1 }]),
    ASP('berserk_ripping', 'Aspect of Berserk Ripping', 'barbarian', 'offensive', 0.15, 0.25, 'Whenever you deal direct damage while Berserking, inflict {v}% of the damage dealt as additional Bleeding damage over 5 seconds.', [{ on: 'hit', when: 'self_berserk', do: { applyScaled: { st: 'bleed', pct: 1, dur: 5 } } }], { applyScaledV: true }),
    ASP('dust_devils', 'Dust Devil\'s Aspect', 'barbarian', 'offensive', 0.1, 0.3, 'Whirlwind leaves behind Dust Devils that deal {v}% weapon damage to surrounding enemies.', [{ skill: 'whirlwind', on: 'hit', chance: 0.2, do: { ground: { radius: 1.6, dur: 2, interval: 0.4, coefTotal: 1 } } }], { groundV: true }),
    ASP('relentless_armament', 'Aspect of Relentless Armament', 'barbarian', 'resource', 0.1, 0.2, 'Weapon Mastery skills gain {v}% Damage... summarized: each Weapon Mastery cast grants {v}% Fury of max.', [{ on: 'cast', tag: 'mastery', do: { gainPct: 1 } }], { gainPctV: true }),
    ASP('bul_kathos', 'Bul-Kathos\' Aspect', 'barbarian', 'defensive', 0.1, 0.2, 'Leap creates an Earthquake that deals Physical damage over 4 seconds. While standing in Earthquakes, you gain {v}% Damage Reduction.', [{ skill: 'leap', p: 'ground', set: { radius: 3, dur: 4, interval: 0.5, coefTotal: 1.5, drInside: 1 } }, { flag: 'bul_kathos_dr', v: 1 }]),
    ASP('iron_warrior', 'Iron Warrior\'s Aspect', 'barbarian', 'defensive', 0.1, 0.2, 'Iron Skin grants Unstoppable and {v}% Damage Reduction.', [{ skill: 'iron_skin', p: 'unstoppable', set: 1 }, { skill: 'iron_skin', p: 'drBonus', v: 1 }]),
    ASP('echoing_fury', 'Aspect of Echoing Fury', 'barbarian', 'resource', 2, 4, 'Your Shout skills generate {v} Fury per second while active.', [{ flag: 'echoing_fury', v: 1 }], { flat: true }),
    ASP('limitless_rage', 'Aspect of Limitless Rage', 'barbarian', 'offensive', 0.02, 0.04, 'Each point of Fury you generate while at Maximum Fury grants your next Core Skill {v}% increased damage, up to 150%.', [{ flag: 'limitless_rage', v: 1 }]),
    ASP('giant_strides', 'Aspect of Giant Strides', 'barbarian', 'utility', 2, 4, 'Reduces the Cooldown of Leap by {v} seconds per enemy hit, up to 9 seconds.', [{ skill: 'leap', on: 'hit', do: { cdr_skill: 1, v: 1 }, maxPerCast: 3 }], { flat: true, cdrV: true }),
    ASP('skullbreaker', 'Skullbreaker\'s Aspect', 'barbarian', 'offensive', 0.3, 0.5, 'Stunning a Bleeding enemy deals {v}% of their total Bleeding amount to them as Physical damage.', [{ flag: 'skullbreaker', v: 1 }]),
    ASP('wind_striker_barb', 'Windlasher Aspect', 'barbarian', 'offensive', 0.15, 0.3, 'Casting Double Swing twice within 3 seconds creates a Dust Devil; Double Swing deals {v}% increased damage.', [{ skill: 'double_swing', p: 'dmgMult', v: 1 }]),
    ASP('earthquake_aspect', 'Earthquake Aspect', 'barbarian', 'offensive', 0.3, 0.6, 'Ground Stomp creates an Earthquake dealing {v}% weapon damage over 4 seconds. While in Earthquakes you deal 5% increased damage.', [{ skill: 'ground_stomp', p: 'ground', set: { radius: 3.5, dur: 4, interval: 0.5, coefTotal: 1 } }, { flag: 'earthquake_dmg', v: 0.05 }], { groundV: true }),
    // druid
    ASP('shockwave', 'Shockwave Aspect', 'druid', 'offensive', 0.6, 1.0, 'Pulverize creates a shockwave that travels forward, dealing {v}% of its damage to targets in the path.', [{ skill: 'pulverize', p: 'shockwave', v: 1 }]),
    ASP('ursine_horror', 'Aspect of the Ursine Horror', 'druid', 'offensive', 0.3, 0.5, 'Pulverize is now also an Earth Skill. After casting Pulverize, tectonic spikes continue to deal {v}% weapon damage for 2 seconds.', [{ skill: 'pulverize', p: 'tagAdd', set: 'earth' }, { skill: 'pulverize', p: 'ground', set: { radius: 2.8, dur: 2, interval: 0.4, coefTotal: 1 } }], { groundV: true }),
    ASP('rampaging_werebeast', 'Aspect of the Rampaging Werebeast', 'druid', 'offensive', 0.03, 0.06, 'The duration of Grizzly Rage is increased by 5 seconds. In addition, Critical Strikes while Grizzly Rage is active increase your Critical Strike Damage by {v}% for the duration, up to 15 stacks.', [{ skill: 'grizzly_rage', p: 'dur', add: 5 }, { on: 'crit', when: 'self_werebear', do: { buff: { id: 'rampaging', dur: 10, stackMax: 15, mods: [{ stat: 'crit_dmg', v: 1 }] } } }]),
    ASP('stormchasers', 'Stormchaser\'s Aspect', 'druid', 'offensive', 0.1, 0.25, 'Tornado will seek up to 3 targets and deals {v}% increased damage.', [{ skill: 'tornado', p: 'homing', set: 1 }, { skill: 'tornado', p: 'dmgMult', v: 1 }]),
    ASP('lightning_dancer', 'Lightning Dancer\'s Aspect', 'druid', 'offensive', 0.3, 0.5, 'Lightning Storm Critical Strikes spawn Dancing Bolts that seek enemies dealing {v}% weapon damage.', [{ skill: 'lightning_storm', on: 'crit', chance: 0.5, do: { bolt: 1 } }], { boltV: true }),
    ASP('alpha', 'Aspect of the Alpha', 'druid', 'offensive', 0.5, 1.0, 'Your Wolf Companions are now Werewolf Companions. Werewolf Companions deal {v}% additional damage and can spread Rabies.', [{ minionStat: 'wolf', stat: 'dmg', v: 1 }, { flag: 'alpha_wolves' }]),
    ASP('crashstone', 'Crashstone Aspect', 'druid', 'offensive', 0.3, 0.5, 'Earth Skills deal {v}% more Critical Strike Damage to Crowd Controlled enemies.', [{ stat: 'crit_dmg_vs_cc', v: 1 }]),
    ASP('mangled', 'Mangled Aspect', 'druid', 'resource', 0.15, 0.3, 'When you are struck as a Werebear you have a {v}% chance to gain 1 Spirit... summarized: gain 4 Spirit.', [{ on: 'damaged', when: 'self_werebear', chance: 1, do: { gain: 'resource', amt: 4 } }], { chanceV: true }),
    ASP('nighthowler', 'Nighthowler\'s Aspect', 'druid', 'offensive', 0.08, 0.15, 'Blood Howl increases Critical Strike Chance by {v}% for its duration.', [{ skill: 'blood_howl', p: 'mods', push: { stat: 'crit_chance', v: 1 } }]),
    ASP('overcharged', 'Aspect of the Overcharged', 'druid', 'offensive', 0.1, 0.2, 'Lucky Hit: Dealing Lightning damage has up to a 20% chance to overcharge the enemy for 3 seconds, dealing {v}% weapon damage to them and surrounding enemies.', [{ on: 'lucky', element: 'lightning', chance: 0.2, do: { nova: 1 } }], { novaV: true }),
    ASP('quicksand', 'Aspect of Quicksand', 'druid', 'utility', 0.25, 0.5, 'Damage from Earth Skills Slows enemies hit by {v}% for 5 seconds.', [{ on: 'hit', tag: 'earth', do: { apply: { st: 'slow', pct: 1, dur: 5 } } }], { applyPctV: true }),
    ASP('trampled_earth', 'Aspect of the Trampled Earth', 'druid', 'offensive', 0.3, 0.5, 'Trample now summons 6 Landslide pillars of earth along its path that deal {v}% of normal damage. Trample is now also an Earth Skill.', [{ skill: 'trample', p: 'ground', set: { radius: 2, dur: 1.5, interval: 0.3, coefTotal: 1 } }], { groundV: true }),
    ASP('wild_rage', 'Aspect of the Wild Rage', 'druid', 'defensive', 0.08, 0.15, 'While Shapeshifted, you gain {v}% Damage Reduction.', [{ stat: 'dr', v: 1, when: 'self_shapeshifted' }])
  ];
  DATA.aspectById = {}; DATA.ASPECTS.forEach(a => { DATA.aspectById[a.id] = a; });

  // ---- Unique items: fixed affixes (values at power 1 scale via affixScale) + unique power (mods)
  const UNI = (id, name, cls, slot, type, affixes, power, desc, opt) => Object.assign({ id, name, cls, slot, type, affixes, power, desc, rarity: 'unique' }, opt || {});
  DATA.UNIQUES = [
    // mythic (class 'all')
    UNI('harlequin_crest', 'Harlequin Crest', 'all', 'helm', null, [{ stat: 'cdr', v: 0.1 }, { stat: 'life', v: 60 }, { stat: 'all_stats', v: 8 }, { stat: 'res_all', v: 0.06 }], [{ stat: 'dr', add: 0.2 }, { stat: 'rank_all', add: 4 }], 'Gain 20% Damage Reduction. In addition, gain +4 Ranks to all Skills.', { rarity: 'mythic' }),
    UNI('doombringer', 'Doombringer', 'all', 'weapon', 'sword1h', [{ stat: 'crit_dmg', v: 0.2 }, { stat: 'life', v: 60 }, { stat: 'lucky_hit', v: 0.1 }, { stat: 'dmg_core', v: 0.12 }], [{ on: 'lucky', chance: 0.25, do: { nova: 1.5 } }, { flag: 'doombringer_weaken', v: 0.2 }], 'Lucky Hit: Up to a 25% chance to deal Shadow damage to surrounding enemies and reduce their damage dealt by 20% for 5 seconds.', { rarity: 'mythic' }),
    UNI('starless_skies', 'Ring of Starless Skies', 'all', 'ring1', null, [{ stat: 'crit_chance', v: 0.04 }, { stat: 'crit_dmg', v: 0.15 }, { stat: 'lucky_hit', v: 0.08 }, { stat: 'dmg_core', v: 0.1 }], [{ flag: 'starless', v: 0.1 }], 'Each consecutive Core Skill cast reduces the Resource cost of your next Core Skill by 10% and increases its damage by 10%, up to 5 stacks.', { rarity: 'mythic' }),
    UNI('grandfather', 'The Grandfather', 'all', 'weapon', 'sword2h', [{ stat: 'crit_dmg', v: 0.5 }, { stat: 'all_stats', v: 10 }, { stat: 'life', v: 80 }, { stat: 'dmg', v: 0.15 }], [{ stat: 'crit_dmg', add: 0.75 }], 'Increases your Critical Strike Damage by 75%. The other properties on this weapon can roll higher than normal.', { rarity: 'mythic', powerBonus: 100 }),
    UNI('andariels_visage', 'Andariel\'s Visage', 'all', 'helm', null, [{ stat: 'attack_speed', v: 0.08 }, { stat: 'life_on_hit', v: 2 }, { stat: 'res_poison', v: 0.15 }, { stat: 'lucky_hit', v: 0.08 }], [{ on: 'lucky', chance: 0.2, do: { ground: { radius: 2, dur: 3, interval: 0.5, coefTotal: 2.0, element: 'poison' } } }], 'Lucky Hit: Up to a 20% chance to trigger a poison nova that applies Poisoning damage over 3 seconds to enemies in the area.', { rarity: 'mythic' }),
    UNI('tyraels_might', 'Tyrael\'s Might', 'all', 'chest', null, [{ stat: 'res_all', v: 0.1 }, { stat: 'armor', v: 40 }, { stat: 'life', v: 80 }, { stat: 'dmg_vs_elite', v: 0.1 }], [{ stat: 'dr', add: 0.12, when: 'self_healthy' }, { on: 'hit', tag: 'core', chance: 0.2, do: { nova: 0.6, element: 'holy' } }], 'While at full Life, you gain 12% Damage Reduction. Core skills have a chance to release Divine Barrages.', { rarity: 'mythic' }),
    // necromancer
    UNI('black_river', 'Black River', 'necromancer', 'weapon', 'scythe1h', [{ stat: 'int', v: 12 }, { stat: 'crit_dmg', v: 0.12 }, { stat: 'dmg_core', v: 0.1 }, { stat: 'resource_gen', v: 0.06 }], [{ skill: 'corpse_explosion', p: 'multiCorpse', set: 4 }, { skill: 'corpse_explosion', p: 'dmgMult', add: 0.9 }, { skill: 'corpse_explosion', p: 'radius', mul: 1.15 }], 'Corpse Explosion consumes up to 4 additional Corpses around the initial Corpse, dealing 90% increased damage and with a 15% larger radius per additional Corpse.'),
    UNI('blood_artisan', 'Blood Artisan\'s Cuirass', 'necromancer', 'chest', null, [{ stat: 'life', v: 50 }, { stat: 'armor_pct', v: 0.06 }, { stat: 'dmg_blood', v: 0.12 }, { stat: 'res_all', v: 0.05 }], [{ flag: 'blood_artisan', v: 5 }], 'When you pick up 5 Blood Orbs, a free Bone Spirit is spawned, dealing bonus damage based on your Maximum Life.'),
    UNI('deathless_visage', 'Deathless Visage', 'necromancer', 'helm', null, [{ stat: 'dmg_bone', v: 0.12 }, { stat: 'crit_dmg', v: 0.1 }, { stat: 'armor', v: 30 }, { stat: 'life', v: 40 }], [{ skill: 'bone_spear', p: 'ground', set: { radius: 1.2, dur: 1.5, interval: 0.3, coefTotal: 0.6 } }], 'Bone Spear leaves behind echoes as it travels that explode, dealing bonus damage.'),
    UNI('howl_from_below', 'Howl from Below', 'necromancer', 'gloves', null, [{ stat: 'attack_speed', v: 0.07 }, { stat: 'lucky_hit', v: 0.08 }, { stat: 'dmg_summon', v: 0.12 }, { stat: 'crit_chance', v: 0.03 }], [{ skill: 'corpse_explosion', p: 'volatile', set: 1 }, { skill: 'corpse_explosion', p: 'dmgMult', add: 0.4 }], 'Instead of detonating immediately, Corpse Explosion summons a Volatile Skeleton that charges at a random enemy and explodes. Corpse Explosion\'s damage is increased by 40%.'),
    UNI('deathspeakers', 'Deathspeaker\'s Pendant', 'necromancer', 'amulet', null, [{ stat: 'dmg_blood', v: 0.14 }, { stat: 'cdr', v: 0.06 }, { stat: 'res_all', v: 0.06 }, { stat: 'dmg_summon', v: 0.12 }], [{ skill: 'blood_surge', p: 'dmgMult', add: 0.3 }, { flag: 'deathspeaker' }], 'Blood Surge casts a mini nova from your Minions, dealing 30% increased damage.'),
    UNI('ring_of_mendeln', 'Ring of Mendeln', 'necromancer', 'ring1', null, [{ stat: 'minion_life', v: 0.15 }, { stat: 'lucky_hit', v: 0.1 }, { stat: 'dmg_summon', v: 0.15 }, { stat: 'res_all', v: 0.05 }], [{ flag: 'mendeln', v: 0.1 }], 'While you have 7 or more Minions, you are Empowered. While Empowered, Lucky Hit: Up to a 10% chance to empower all of your Minions, causing their next attack to explode for 200% weapon damage.'),
    // paladin
    UNI('herald_of_zakarum', 'Herald of Zakarum', 'paladin', 'offhand', 'shield', [{ stat: 'block_chance', v: 0.08 }, { stat: 'life', v: 50 }, { stat: 'dmg_holy', v: 0.12 }, { stat: 'res_all', v: 0.06 }], [{ flag: 'herald', v: 1.0 }, { stat: 'block_red', add: 0.2 }], 'Blocking an attack deals 100% weapon damage as Holy damage to the attacker and Nearby enemies.'),
    UNI('guardian_angel', 'Guardian Angel', 'paladin', 'chest', null, [{ stat: 'armor_pct', v: 0.08 }, { stat: 'life', v: 60 }, { stat: 'res_all', v: 0.06 }, { stat: 'healing', v: 0.08 }], [{ flag: 'guardian_angel' }], 'Once every 60 seconds, a fatal blow instead leaves you at 40% Life and grants Unstoppable for 3 seconds.'),
    UNI('hand_of_blessed_light', 'Hand of Blessed Light', 'paladin', 'gloves', null, [{ stat: 'crit_chance', v: 0.04 }, { stat: 'attack_speed', v: 0.08 }, { stat: 'dmg_core', v: 0.1 }, { stat: 'lucky_hit', v: 0.08 }], [{ skill: 'blessed_hammer', p: 'count', add: 2 }, { skill: 'blessed_hammer', p: 'dmgMult', add: 0.5 }], 'Blessed Hammer summons 2 additional hammers and deals 50% increased damage.'),
    UNI('faiths_bastion', 'Faith\'s Bastion', 'paladin', 'helm', null, [{ stat: 'cdr', v: 0.08 }, { stat: 'resource_gen', v: 0.08 }, { stat: 'life', v: 40 }, { stat: 'armor', v: 30 }], [{ flag: 'aura_mastery', v: 0.3 }, { flag: 'dual_aura' }], 'Your Auras are 30% stronger and your most recently deactivated Aura remains active at half strength.'),
    UNI('zakarums_judgement', 'Zakarum\'s Judgement', 'paladin', 'weapon', 'mace2h', [{ stat: 'str', v: 14 }, { stat: 'overpower_dmg', v: 0.3 }, { stat: 'dmg_holy', v: 0.14 }, { stat: 'dmg_vs_cc', v: 0.12 }], [{ skill: 'fist_of_the_heavens', p: 'guaranteedOverpower', set: 1 }, { skill: 'fist_of_the_heavens', p: 'radius', mul: 1.4 }], 'Fist of the Heavens always Overpowers and its radius is increased by 40%.'),
    UNI('lightwarden', 'Lightwarden Band', 'paladin', 'ring1', null, [{ stat: 'crit_chance', v: 0.04 }, { stat: 'dmg_holy', v: 0.12 }, { stat: 'res_all', v: 0.05 }, { stat: 'cdr', v: 0.05 }], [{ on: 'kill', do: { heal: 0.03, gain: 'resource', amt: 5 } }], 'Kills heal you for 3% of Maximum Life and restore 5 Faith.'),
    // barbarian
    UNI('gohrs', 'Gohr\'s Devastating Grips', 'barbarian', 'gloves', null, [{ stat: 'attack_speed', v: 0.08 }, { stat: 'crit_chance', v: 0.03 }, { stat: 'dmg_core', v: 0.1 }, { stat: 'lucky_hit', v: 0.08 }], [{ flag: 'gohrs', v: 0.3 }], 'Whirlwind explodes after it ends, dealing 30% of the total Base damage dealt to surrounding enemies.'),
    UNI('ramaladnis', 'Ramaladni\'s Magnum Opus', 'barbarian', 'weapon', 'sword1h', [{ stat: 'str', v: 12 }, { stat: 'crit_dmg', v: 0.15 }, { stat: 'dmg_core', v: 0.1 }, { stat: 'max_resource', v: 5 }], [{ flag: 'ramaladni', v: 0.005 }], 'Skills using this weapon deal 0.5% increased damage per point of Fury you have, but you lose 2 Fury every second.'),
    UNI('ancients_oath', 'Ancients\' Oath', 'barbarian', 'weapon', 'axe2h', [{ stat: 'str', v: 14 }, { stat: 'dmg_vs_vuln', v: 0.15 }, { stat: 'crit_chance', v: 0.03 }, { stat: 'dmg', v: 0.08 }], [{ skill: 'steel_grasp', p: 'count', set: 4 }, { skill: 'steel_grasp', p: 'dmgMult', add: 0.5 }, { skill: 'steel_grasp', apply: { st: 'slow', pct: 0.5, dur: 3 } }], 'Steel Grasp launches 2 additional chains. Enemies hit by Steel Grasp are Slowed by 50% for 3 seconds and it deals 50% more damage.'),
    UNI('fields_of_crimson', 'Fields of Crimson', 'barbarian', 'weapon', 'sword2h', [{ stat: 'str', v: 14 }, { stat: 'dmg_bleed', v: 0.2 }, { stat: 'dmg_vs_bleeding', v: 0.15 }, { stat: 'attack_speed', v: 0.06 }], [{ skill: 'rupture', p: 'ground', set: { radius: 3, dur: 6, interval: 0.5, coefTotal: 2.0, applyAmp: 0.15 } }], 'While using Rupture, you create a blood pool that inflicts Bleeding damage over 6 seconds. Enemies standing in the pool take 15% increased Bleeding damage.'),
    UNI('overkill', 'Overkill', 'barbarian', 'weapon', 'mace2h', [{ stat: 'str', v: 14 }, { stat: 'overpower_dmg', v: 0.3 }, { stat: 'dmg_core', v: 0.12 }, { stat: 'crit_dmg', v: 0.12 }], [{ skill: 'death_blow', p: 'radius', set: 2.5 }, { skill: 'death_blow', p: 'dmgMult', add: 0.5 }, { skill: 'death_blow', p: 'guaranteedOverpower', set: 1 }], 'Death Blow creates a shockwave, dealing 50% increased damage in a large area and always Overpowers.'),
    UNI('battle_trance', 'Battle Trance', 'barbarian', 'amulet', null, [{ stat: 'res_all', v: 0.06 }, { stat: 'rank_core', v: 2 }, { stat: 'crit_chance', v: 0.03 }, { stat: 'attack_speed', v: 0.06 }], [{ flag: 'battle_trance', v: 0.3 }], 'Increase Frenzy\'s maximum stacks by 2. While you have maximum Frenzy, your other Skills gain 30% increased Attack Speed.'),
    UNI('rage_of_harrogath', 'Rage of Harrogath', 'barbarian', 'chest', null, [{ stat: 'life', v: 50 }, { stat: 'armor_pct', v: 0.08 }, { stat: 'dr_fortified', v: 0.08 }, { stat: 'res_all', v: 0.05 }], [{ on: 'damaged', chance: 0.25, do: { cdr_all: 1 } }], 'Lucky Hit: Up to a 25% chance to reduce the Cooldowns of your Non-Ultimate Skills by 1 second when you take damage.'),
    // druid
    UNI('tempest_roar', 'Tempest Roar', 'druid', 'helm', null, [{ stat: 'crit_chance', v: 0.04 }, { stat: 'res_all', v: 0.06 }, { stat: 'life', v: 40 }, { stat: 'max_resource', v: 6 }], [{ flag: 'tempest_roar' }, { on: 'lucky', tag: 'storm', chance: 0.3, do: { gain: 'resource', amt: 4 } }], 'Lucky Hit: Storm Skills have up to a 30% chance to grant 4 Spirit. Your base Storm Skills are now also Werewolf Skills.'),
    UNI('vasilys', 'Vasily\'s Prayer', 'druid', 'helm', null, [{ stat: 'dmg_earth', v: 0.14 }, { stat: 'armor', v: 35 }, { stat: 'life', v: 40 }, { stat: 'fortify_gen', v: 0.1 }], [{ flag: 'vasilys' }, { on: 'cast', tag: 'earth', do: { fortify: 0.08 } }], 'Your Earth Skills are now also Werebear Skills and Fortify you for 8% of Maximum Life.'),
    UNI('insatiable_fury', 'Insatiable Fury', 'druid', 'chest', null, [{ stat: 'dmg_werebear', v: 0.14 }, { stat: 'life', v: 50 }, { stat: 'armor_pct', v: 0.08 }, { stat: 'res_all', v: 0.05 }], [{ flag: 'permabear' }, { stat: 'rank_tag_werebear', add: 2 }], 'Werebear form is now your true form, and you gain +2 Ranks to all Werebear Skills.'),
    UNI('mad_wolfs_glee', 'Mad Wolf\'s Glee', 'druid', 'chest', null, [{ stat: 'dmg_werewolf', v: 0.14 }, { stat: 'life', v: 50 }, { stat: 'move_speed', v: 0.06 }, { stat: 'res_all', v: 0.05 }], [{ flag: 'permawolf' }, { stat: 'rank_tag_werewolf', add: 2 }], 'Werewolf form is now your true form, and you gain +2 Ranks to all Werewolf Skills.'),
    UNI('hunters_zenith', 'Hunter\'s Zenith', 'druid', 'ring1', null, [{ stat: 'crit_chance', v: 0.04 }, { stat: 'dmg_shapeshift', v: 0.12 }, { stat: 'res_all', v: 0.05 }, { stat: 'attack_speed', v: 0.06 }], [{ flag: 'hunters_zenith' }], 'Gain a bonus when you kill with a Shapeshifting Skill: Werewolf: Your next Werebear Skill costs no Resource and has no Cooldown. Werebear: Your next Werewolf Skill will Heal you for 8% of your Maximum Life.'),
    UNI('greatstaff_crone', 'Greatstaff of the Crone', 'druid', 'weapon', 'staff', [{ stat: 'will', v: 14 }, { stat: 'dmg_storm', v: 0.14 }, { stat: 'crit_dmg', v: 0.15 }, { stat: 'lucky_hit', v: 0.08 }], [{ skill: 'claw', p: 'tagAdd', set: 'storm' }, { skill: 'claw', p: 'chainStrike', set: 1 }, { skill: 'claw', p: 'dmgMult', add: 1.2 }], 'Claw is now a Storm Skill and also casts Storm Strike at 120% normal damage.'),
    UNI('waxing_gibbous', 'Waxing Gibbous', 'druid', 'weapon', 'axe1h', [{ stat: 'will', v: 12 }, { stat: 'crit_dmg', v: 0.15 }, { stat: 'dmg_werewolf', v: 0.12 }, { stat: 'dmg_core', v: 0.1 }], [{ flag: 'waxing_gibbous', v: 0.5 }], 'Gain Stealth for 2 seconds when killing enemies with Shred. Breaking Stealth by attacking grants Ambush which guarantees Critical Strikes for 2 seconds.')
  ];
  DATA.uniqueById = {}; DATA.UNIQUES.forEach(u => { DATA.uniqueById[u.id] = u; });

  // ---- Gems: tiers with multiplier. Effects by slot category.
  DATA.GEM_TIERS = [{ id: 'crude', name: 'Crude', mult: 0.4, level: 1 }, { id: 'chipped', name: 'Chipped', mult: 0.6, level: 15 }, { id: 'normal', name: '', mult: 0.8, level: 30 }, { id: 'flawless', name: 'Flawless', mult: 1.0, level: 45 }, { id: 'royal', name: 'Royal', mult: 1.3, level: 60 }, { id: 'grand', name: 'Grand', mult: 1.7, level: 60 }];
  DATA.GEMS = {
    ruby: { name: 'Ruby', color: '#ff3b3b', weapon: { stat: 'overpower_dmg', v: 0.12 }, armor: { stat: 'life_pct', v: 0.03 }, jewelry: { stat: 'res_fire', v: 0.1 } },
    sapphire: { name: 'Sapphire', color: '#4aa8ff', weapon: { stat: 'crit_dmg_vs_cc', v: 0.12 }, armor: { stat: 'dr_fortified', v: 0.03 }, jewelry: { stat: 'res_cold', v: 0.1 } },
    emerald: { name: 'Emerald', color: '#3fe07a', weapon: { stat: 'crit_dmg_vs_vuln', v: 0.12 }, armor: { stat: 'thorns', v: 20, scale: 'thorns' }, jewelry: { stat: 'res_poison', v: 0.1 } },
    topaz: { name: 'Topaz', color: '#ffd23f', weapon: { stat: 'dmg_basic', v: 0.12 }, armor: { stat: 'dr_while_cc', v: 0.03 }, jewelry: { stat: 'res_light', v: 0.1 } },
    amethyst: { name: 'Amethyst', color: '#b06cff', weapon: { stat: 'dmg_dot', v: 0.12 }, armor: { stat: 'dr_dot', v: 0.03 }, jewelry: { stat: 'res_shadow', v: 0.1 } },
    diamond: { name: 'Diamond', color: '#e8f6ff', weapon: { stat: 'dmg_ult', v: 0.12 }, armor: { stat: 'barrier_gen', v: 0.05 }, jewelry: { stat: 'res_all', v: 0.04 } },
    skull: { name: 'Skull', color: '#cfc8b8', weapon: { stat: 'life_on_kill', v: 3, scale: 'regen' }, armor: { stat: 'healing', v: 0.03 }, jewelry: { stat: 'armor', v: 30, scale: 'armor' } }
  };

  DATA.MATERIALS = {
    gold: { name: 'Gold', color: '#ffd76a' }, obols: { name: 'Murmuring Obols', color: '#b36cff' },
    rawhide: { name: 'Rawhide', color: '#b58a5a' }, iron_chunk: { name: 'Iron Chunk', color: '#9aa0a8' }, silver_ore: { name: 'Silver Ore', color: '#d0d6e0' },
    veiled_crystal: { name: 'Veiled Crystal', color: '#6f8cff' }, abstruse_sigil: { name: 'Abstruse Sigil', color: '#ffe55c' }, coiling_ward: { name: 'Coiling Ward', color: '#8bd36b' }, baleful_fragment: { name: 'Baleful Fragment', color: '#ff7a5c' },
    forgotten_soul: { name: 'Forgotten Soul', color: '#ff8c1a' }, resplendent_spark: { name: 'Resplendent Spark', color: '#b36cff' },
    crude_gem: { name: 'Gem Fragments', color: '#e8f6ff' },
    gallowvine: { name: 'Gallowvine', color: '#7dff5c' }, biteberry: { name: 'Biteberry', color: '#ff3b3b' }, howler_moss: { name: 'Howler Moss', color: '#7fd6ff' }, reddamine: { name: 'Reddamine', color: '#ff7a2a' }, lifesbane: { name: 'Lifesbane', color: '#b06cff' }
  };

  DATA.ELIXIRS = [
    { id: 'elixir_iron_barbs', name: 'Elixir of Iron Barbs', dur: 1800, mods: [{ stat: 'thorns', add: 120, scaleLevel: true }, { stat: 'armor_pct', add: 0.1 }, { stat: 'xp_bonus', add: 0.08 }], cost: { gallowvine: 3, biteberry: 2, gold: 400 }, desc: '+Thorns, +10% Armor, +8% XP for 30 minutes.' },
    { id: 'elixir_precision', name: 'Elixir of Precision', dur: 1800, mods: [{ stat: 'crit_chance', add: 0.05 }, { stat: 'crit_dmg', add: 0.15 }, { stat: 'xp_bonus', add: 0.08 }], cost: { gallowvine: 3, howler_moss: 2, gold: 400 }, desc: '+5% Crit Chance, +15% Crit Damage, +8% XP for 30 minutes.' },
    { id: 'elixir_fortitude', name: 'Elixir of Fortitude', dur: 1800, mods: [{ stat: 'life_pct', add: 0.1 }, { stat: 'res_all', add: 0.1 }, { stat: 'xp_bonus', add: 0.08 }], cost: { gallowvine: 3, reddamine: 2, gold: 400 }, desc: '+10% Life, +10% All Resistance, +8% XP for 30 minutes.' },
    { id: 'elixir_resource', name: 'Elixir of Resourcefulness', dur: 1800, mods: [{ stat: 'resource_gen', add: 0.15 }, { stat: 'cdr', add: 0.05 }, { stat: 'xp_bonus', add: 0.08 }], cost: { gallowvine: 3, lifesbane: 2, gold: 400 }, desc: '+15% Resource Generation, +5% CDR, +8% XP for 30 minutes.' },
    { id: 'elixir_assault', name: 'Assault Elixir', dur: 1800, mods: [{ stat: 'attack_speed', add: 0.1 }, { stat: 'dmg', add: 0.08 }, { stat: 'xp_bonus', add: 0.08 }], cost: { gallowvine: 4, biteberry: 2, howler_moss: 2, gold: 600 }, desc: '+10% Attack Speed, +8% Damage, +8% XP for 30 minutes.' },
    { id: 'elixir_holy_bolts', name: 'Elixir of Holy Bolts', dur: 1800, mods: [{ on: 'hit', chance: 0.1, do: { bolt: 0.4, element: 'holy' } }, { stat: 'xp_bonus', add: 0.08 }], cost: { gallowvine: 4, reddamine: 3, gold: 800 }, desc: 'Hits have a 10% chance to release a Holy Bolt. +8% XP for 30 minutes.' }
  ];
  DATA.elixirById = {}; DATA.ELIXIRS.forEach(e => { DATA.elixirById[e.id] = e; });

  // Potion upgrade tiers (Alchemist): heal % of max life, unlocked at level
  DATA.POTION_TIERS = [{ level: 1, heal: 0.35, name: 'Weak Healing Potion' }, { level: 10, heal: 0.4, name: 'Light Healing Potion' }, { level: 20, heal: 0.45, name: 'Moderate Healing Potion' }, { level: 30, heal: 0.5, name: 'Strong Healing Potion' }, { level: 45, heal: 0.55, name: 'Greater Healing Potion' }, { level: 60, heal: 0.6, name: 'Superior Healing Potion' }];
})();
