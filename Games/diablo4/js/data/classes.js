/* Sanctuary — class definitions (global: DATA.classes) */
window.DATA = window.DATA || {};
(function () {
  'use strict';

  // Stat keys used across the game. Each: name, kind ('flat'|'pct'|'core'), group for the stats sheet.
  DATA.STAT_DEFS = {
    str: { name: 'Strength', kind: 'flat', group: 'Core' }, int: { name: 'Intelligence', kind: 'flat', group: 'Core' },
    will: { name: 'Willpower', kind: 'flat', group: 'Core' }, dex: { name: 'Dexterity', kind: 'flat', group: 'Core' },
    life: { name: 'Maximum Life', kind: 'flat', group: 'Defense' }, life_pct: { name: 'Maximum Life', kind: 'pct', group: 'Defense' },
    armor: { name: 'Armor', kind: 'flat', group: 'Defense' }, armor_pct: { name: 'Armor', kind: 'pct', group: 'Defense' },
    dr: { name: 'Damage Reduction', kind: 'pct', group: 'Defense' }, dr_close: { name: 'DR from Close Enemies', kind: 'pct', group: 'Defense' },
    dr_distant: { name: 'DR from Distant Enemies', kind: 'pct', group: 'Defense' }, dr_fortified: { name: 'DR while Fortified', kind: 'pct', group: 'Defense' },
    dr_injured: { name: 'DR while Injured', kind: 'pct', group: 'Defense' }, dr_dot: { name: 'DR from Damage over Time', kind: 'pct', group: 'Defense' },
    dr_elite: { name: 'DR from Elites', kind: 'pct', group: 'Defense' }, dr_vs_cc: { name: 'DR from Crowd Controlled', kind: 'pct', group: 'Defense' },
    dr_vs_bleeding: { name: 'DR from Bleeding Enemies', kind: 'pct', group: 'Defense' }, dr_vs_poisoned: { name: 'DR from Poisoned Enemies', kind: 'pct', group: 'Defense' },
    dr_while_cc: { name: 'DR while Crowd Controlled', kind: 'pct', group: 'Defense' }, dr_barrier: { name: 'DR while you have a Barrier', kind: 'pct', group: 'Defense' },
    res_fire: { name: 'Fire Resistance', kind: 'pct', group: 'Resistances' }, res_cold: { name: 'Cold Resistance', kind: 'pct', group: 'Resistances' },
    res_light: { name: 'Lightning Resistance', kind: 'pct', group: 'Resistances' }, res_poison: { name: 'Poison Resistance', kind: 'pct', group: 'Resistances' },
    res_shadow: { name: 'Shadow Resistance', kind: 'pct', group: 'Resistances' }, res_all: { name: 'Resistance to All Elements', kind: 'pct', group: 'Resistances' },
    max_res: { name: 'Maximum Resistance', kind: 'pct', group: 'Resistances' },
    dodge: { name: 'Dodge Chance', kind: 'pct', group: 'Defense' }, block_chance: { name: 'Block Chance', kind: 'pct', group: 'Defense' }, block_red: { name: 'Blocked Damage Reduction', kind: 'pct', group: 'Defense' },
    thorns: { name: 'Thorns', kind: 'flat', group: 'Defense' }, life_regen: { name: 'Life Regeneration', kind: 'flat', group: 'Recovery' },
    life_on_hit: { name: 'Life On Hit', kind: 'flat', group: 'Recovery' }, life_on_kill: { name: 'Life Per Kill', kind: 'flat', group: 'Recovery' },
    healing: { name: 'Healing Received', kind: 'pct', group: 'Recovery' }, potion_heal: { name: 'Potion Healing', kind: 'pct', group: 'Recovery' },
    potion_charges: { name: 'Potion Capacity', kind: 'flat', group: 'Recovery' }, fortify_gen: { name: 'Fortify Generation', kind: 'pct', group: 'Recovery' },
    barrier_gen: { name: 'Barrier Generation', kind: 'pct', group: 'Recovery' }, cc_reduction: { name: 'Crowd Control Duration Reduction', kind: 'pct', group: 'Defense' },
    dmg: { name: 'Damage', kind: 'pct', group: 'Offense' }, dmg_close: { name: 'Damage to Close Enemies', kind: 'pct', group: 'Offense' },
    dmg_distant: { name: 'Damage to Distant Enemies', kind: 'pct', group: 'Offense' }, dmg_vs_cc: { name: 'Damage to Crowd Controlled', kind: 'pct', group: 'Offense' },
    dmg_vs_slowed: { name: 'Damage to Slowed Enemies', kind: 'pct', group: 'Offense' }, dmg_vs_stunned: { name: 'Damage to Stunned Enemies', kind: 'pct', group: 'Offense' },
    dmg_vs_frozen: { name: 'Damage to Frozen Enemies', kind: 'pct', group: 'Offense' }, dmg_vs_healthy: { name: 'Damage to Healthy Enemies', kind: 'pct', group: 'Offense' },
    dmg_vs_injured: { name: 'Damage to Injured Enemies', kind: 'pct', group: 'Offense' }, dmg_vs_elite: { name: 'Damage to Elites', kind: 'pct', group: 'Offense' },
    dmg_vs_poisoned: { name: 'Damage to Poisoned Enemies', kind: 'pct', group: 'Offense' }, dmg_vs_bleeding: { name: 'Damage to Bleeding Enemies', kind: 'pct', group: 'Offense' },
    dmg_vs_burning: { name: 'Damage to Burning Enemies', kind: 'pct', group: 'Offense' }, dmg_vs_chilled: { name: 'Damage to Chilled Enemies', kind: 'pct', group: 'Offense' },
    dmg_vs_vuln: { name: 'Damage to Vulnerable Enemies', kind: 'pct', group: 'Offense' },
    dmg_phys: { name: 'Physical Damage', kind: 'pct', group: 'Offense' }, dmg_fire: { name: 'Fire Damage', kind: 'pct', group: 'Offense' },
    dmg_cold: { name: 'Cold Damage', kind: 'pct', group: 'Offense' }, dmg_light: { name: 'Lightning Damage', kind: 'pct', group: 'Offense' },
    dmg_poison: { name: 'Poison Damage', kind: 'pct', group: 'Offense' }, dmg_shadow: { name: 'Shadow Damage', kind: 'pct', group: 'Offense' },
    dmg_holy: { name: 'Holy Damage', kind: 'pct', group: 'Offense' }, dmg_dot: { name: 'Damage Over Time', kind: 'pct', group: 'Offense' },
    dmg_basic: { name: 'Basic Skill Damage', kind: 'pct', group: 'Offense' }, dmg_core: { name: 'Core Skill Damage', kind: 'pct', group: 'Offense' },
    dmg_ult: { name: 'Ultimate Skill Damage', kind: 'pct', group: 'Offense' }, dmg_summon: { name: 'Minion Damage', kind: 'pct', group: 'Offense' },
    dmg_bone: { name: 'Bone Skill Damage', kind: 'pct', group: 'Offense' }, dmg_blood: { name: 'Blood Skill Damage', kind: 'pct', group: 'Offense' },
    dmg_dark: { name: 'Darkness Skill Damage', kind: 'pct', group: 'Offense' }, dmg_earth: { name: 'Earth Skill Damage', kind: 'pct', group: 'Offense' },
    dmg_storm: { name: 'Storm Skill Damage', kind: 'pct', group: 'Offense' }, dmg_werewolf: { name: 'Werewolf Skill Damage', kind: 'pct', group: 'Offense' },
    dmg_werebear: { name: 'Werebear Skill Damage', kind: 'pct', group: 'Offense' }, dmg_companion: { name: 'Companion Skill Damage', kind: 'pct', group: 'Offense' },
    dmg_aura: { name: 'Aura Skill Damage', kind: 'pct', group: 'Offense' }, dmg_bleed: { name: 'Bleeding Damage', kind: 'pct', group: 'Offense' },
    dmg_berserk: { name: 'Damage while Berserking', kind: 'pct', group: 'Offense' }, dmg_fortified: { name: 'Damage while Fortified', kind: 'pct', group: 'Offense' },
    dmg_healthy: { name: 'Damage while Healthy', kind: 'pct', group: 'Offense' }, dmg_barrier: { name: 'Damage while you have a Barrier', kind: 'pct', group: 'Offense' },
    dmg_shapeshift: { name: 'Damage while Shapeshifted', kind: 'pct', group: 'Offense' }, dmg_brawling: { name: 'Brawling Skill Damage', kind: 'pct', group: 'Offense' },
    dmg_mastery: { name: 'Weapon Mastery Skill Damage', kind: 'pct', group: 'Offense' }, dmg_wrath: { name: 'Wrath Skill Damage', kind: 'pct', group: 'Offense' },
    dmg_judgement: { name: 'Judgement Skill Damage', kind: 'pct', group: 'Offense' }, dmg_curse: { name: 'Damage to Cursed Enemies', kind: 'pct', group: 'Offense' },
    dmg_shadowblight: { name: 'Shadowblight Damage', kind: 'pct', group: 'Offense' },
    crit_chance: { name: 'Critical Strike Chance', kind: 'pct', group: 'Offense' }, crit_dmg: { name: 'Critical Strike Damage', kind: 'pct', group: 'Offense' },
    crit_dmg_vs_vuln: { name: 'Critical Strike Damage to Vulnerable', kind: 'pct', group: 'Offense' }, crit_dmg_vs_cc: { name: 'Critical Strike Damage to Crowd Controlled', kind: 'pct', group: 'Offense' },
    crit_chance_vs_injured: { name: 'Critical Strike Chance against Injured', kind: 'pct', group: 'Offense' },
    vuln_dmg: { name: 'Vulnerable Damage', kind: 'pct', group: 'Offense' }, overpower_chance: { name: 'Overpower Chance', kind: 'pct', group: 'Offense' },
    overpower_dmg: { name: 'Overpower Damage', kind: 'pct', group: 'Offense' }, lucky_hit: { name: 'Lucky Hit Chance', kind: 'pct', group: 'Offense' },
    attack_speed: { name: 'Attack Speed', kind: 'pct', group: 'Offense' }, attack_speed_basic: { name: 'Basic Skill Attack Speed', kind: 'pct', group: 'Offense' },
    cdr: { name: 'Cooldown Reduction', kind: 'pct', group: 'Utility' }, resource_gen: { name: 'Resource Generation', kind: 'pct', group: 'Resource' },
    resource_cost_red: { name: 'Resource Cost Reduction', kind: 'pct', group: 'Resource' }, max_resource: { name: 'Maximum Resource', kind: 'flat', group: 'Resource' },
    resource_on_kill: { name: 'Resource Per Kill', kind: 'flat', group: 'Resource' }, lucky_resource: { name: 'Lucky Hit: Resource Chance', kind: 'pct', group: 'Resource' },
    move_speed: { name: 'Movement Speed', kind: 'pct', group: 'Utility' }, move_speed_kill: { name: 'Movement Speed after Killing', kind: 'pct', group: 'Utility' },
    evade_charges: { name: 'Evade Charges', kind: 'flat', group: 'Utility' }, evade_cdr: { name: 'Evade Cooldown Reduction', kind: 'pct', group: 'Utility' },
    xp_bonus: { name: 'Experience Bonus', kind: 'pct', group: 'Utility' }, gold_find: { name: 'Gold Find', kind: 'pct', group: 'Utility' },
    item_find: { name: 'Item Find', kind: 'pct', group: 'Utility' }, minion_life: { name: 'Minion Life', kind: 'pct', group: 'Minions' },
    minion_attack_speed: { name: 'Minion Attack Speed', kind: 'pct', group: 'Minions' }, minion_dr: { name: 'Minion Damage Reduction', kind: 'pct', group: 'Minions' },
    lucky_vuln: { name: 'Lucky Hit: Vulnerable Chance', kind: 'pct', group: 'Offense' }, lucky_slow: { name: 'Lucky Hit: Slow Chance', kind: 'pct', group: 'Offense' },
    lucky_stun: { name: 'Lucky Hit: Stun Chance', kind: 'pct', group: 'Offense' }, lucky_heal: { name: 'Lucky Hit: Heal Chance', kind: 'pct', group: 'Recovery' },
    lucky_fortify: { name: 'Lucky Hit: Fortify Chance', kind: 'pct', group: 'Recovery' }, lucky_barrier: { name: 'Lucky Hit: Barrier Chance', kind: 'pct', group: 'Recovery' },
    lucky_freeze: { name: 'Lucky Hit: Freeze Chance', kind: 'pct', group: 'Offense' }, lucky_burn: { name: 'Lucky Hit: Burn Chance', kind: 'pct', group: 'Offense' },
    lucky_poison: { name: 'Lucky Hit: Poison Chance', kind: 'pct', group: 'Offense' }, lucky_bleed: { name: 'Lucky Hit: Bleed Chance', kind: 'pct', group: 'Offense' },
    lucky_immob: { name: 'Lucky Hit: Immobilize Chance', kind: 'pct', group: 'Offense' }, lucky_daze: { name: 'Lucky Hit: Daze Chance', kind: 'pct', group: 'Offense' },
    lucky_execute: { name: 'Lucky Hit: Execute Chance', kind: 'pct', group: 'Offense' },
    rank_all: { name: 'Ranks of All Skills', kind: 'flat', group: 'Skills' }, rank_basic: { name: 'Ranks of Basic Skills', kind: 'flat', group: 'Skills' },
    rank_core: { name: 'Ranks of Core Skills', kind: 'flat', group: 'Skills' }, rank_defensive: { name: 'Ranks of Defensive Skills', kind: 'flat', group: 'Skills' },
    rank_ult: { name: 'Ranks of Ultimate Skills', kind: 'flat', group: 'Skills' }, rank_macabre: { name: 'Ranks of Macabre Skills', kind: 'flat', group: 'Skills' },
    rank_curse: { name: 'Ranks of Curse Skills', kind: 'flat', group: 'Skills' }, rank_summoning: { name: 'Ranks of Summoning Skills', kind: 'flat', group: 'Skills' },
    rank_corruption: { name: 'Ranks of Corruption Skills', kind: 'flat', group: 'Skills' }, rank_brawling: { name: 'Ranks of Brawling Skills', kind: 'flat', group: 'Skills' },
    rank_mastery: { name: 'Ranks of Weapon Mastery Skills', kind: 'flat', group: 'Skills' }, rank_companion: { name: 'Ranks of Companion Skills', kind: 'flat', group: 'Skills' },
    rank_wrath: { name: 'Ranks of Wrath Skills', kind: 'flat', group: 'Skills' }, rank_aura: { name: 'Ranks of Aura Skills', kind: 'flat', group: 'Skills' },
    rank_judgement: { name: 'Ranks of Judgement Skills', kind: 'flat', group: 'Skills' },
    rank_tag_werebear: { name: 'Ranks of Werebear Skills', kind: 'flat', group: 'Skills' }, rank_tag_werewolf: { name: 'Ranks of Werewolf Skills', kind: 'flat', group: 'Skills' },
    shout_duration: { name: 'Shout Duration', kind: 'pct', group: 'Utility' }, dot_duration: { name: 'Damage Over Time Duration', kind: 'pct', group: 'Offense' },
    cc_duration: { name: 'Crowd Control Duration', kind: 'pct', group: 'Offense' }, slow_dur: { name: 'Slow Duration', kind: 'pct', group: 'Offense' },
    berserk_dur: { name: 'Berserking Duration', kind: 'pct', group: 'Utility' }, shapeshift_dur: { name: 'Shapeshift Duration', kind: 'pct', group: 'Utility' },
    minion_count: { name: 'Additional Minions', kind: 'flat', group: 'Minions' }, pickup_radius: { name: 'Gold Pickup Radius', kind: 'pct', group: 'Utility' },
    dmg_mount: { name: 'Mount Dismount Damage', kind: 'pct', group: 'Mount' }, mount_speed: { name: 'Mount Speed', kind: 'pct', group: 'Mount' },
    mount_spur: { name: 'Mount Spur Charges', kind: 'flat', group: 'Mount' },
    inherent_dmg_vs_healthy: { name: 'Damage to Healthy Enemies', kind: 'pct', group: 'Offense' }
  };

  DATA.ELEMENTS = ['physical', 'fire', 'cold', 'lightning', 'poison', 'shadow', 'holy'];
  DATA.ELEMENT_COLOR = { physical: '#d9c9a0', fire: '#ff7a2a', cold: '#7fd6ff', lightning: '#ffe55c', poison: '#7dff5c', shadow: '#b36cff', holy: '#fff2a6' };
  DATA.ELEMENT_DMG_STAT = { physical: 'dmg_phys', fire: 'dmg_fire', cold: 'dmg_cold', lightning: 'dmg_light', poison: 'dmg_poison', shadow: 'dmg_shadow', holy: 'dmg_holy' };
  DATA.ELEMENT_RES_STAT = { fire: 'res_fire', cold: 'res_cold', lightning: 'res_light', poison: 'res_poison', shadow: 'res_shadow', holy: 'res_shadow' };

  DATA.MAX_LEVEL = 60;
  DATA.MAX_PARAGON = 300;

  DATA.classes = {
    necromancer: {
      id: 'necromancer', name: 'Necromancer', color: '#8bd36b', accent: '#2f6b2c',
      resource: { name: 'Essence', max: 100, regen: 6, color: '#8bd36b' },
      mainStat: 'int', secondaryStat: 'will',
      base: { str: 7, int: 10, will: 8, dex: 7 }, perLevel: { str: 1, int: 3, will: 2, dex: 1 },
      weaponSlots: ['weapon', 'offhand'],
      weaponTypes: { weapon: ['sword1h', 'dagger', 'wand', 'scythe1h', 'sword2h', 'scythe2h', 'mace1h', 'axe1h'], offhand: ['focus', 'shield'] },
      desc: 'Master of the dead. Commands skeletal warriors, mages and golems, wields bone, blood and darkness, and curses enemies before harvesting their corpses.',
      mechanic: { id: 'book_of_dead', name: 'Book of the Dead' },
      lore: 'Priests of Rathma who walk the line between life and death.'
    },
    paladin: {
      id: 'paladin', name: 'Paladin', color: '#ffd76a', accent: '#8a6a1a',
      resource: { name: 'Faith', max: 100, regen: 4, color: '#ffd76a' },
      mainStat: 'str', secondaryStat: 'will',
      base: { str: 10, int: 7, will: 9, dex: 7 }, perLevel: { str: 3, int: 1, will: 2, dex: 1 },
      weaponSlots: ['weapon', 'offhand'],
      weaponTypes: { weapon: ['sword1h', 'mace1h', 'axe1h', 'sword2h', 'mace2h', 'polearm'], offhand: ['shield'] },
      desc: 'Holy warrior of Zakarum. Smites with Holy damage, radiates Auras that empower allies and torment foes, and endures behind shield and Barrier.',
      mechanic: { id: 'auras', name: 'Auras of Faith' },
      lore: 'The Hand of Zakarum, returned to Sanctuary to purge the Burning Hells.'
    },
    barbarian: {
      id: 'barbarian', name: 'Barbarian', color: '#ff7a5c', accent: '#8a2d1c',
      resource: { name: 'Fury', max: 100, regen: 0, decay: 1.5, color: '#ff7a5c' },
      mainStat: 'str', secondaryStat: 'will',
      base: { str: 10, int: 7, will: 8, dex: 8 }, perLevel: { str: 3, int: 1, will: 1, dex: 2 },
      weaponSlots: ['bludgeon', 'slash', 'dual1', 'dual2'],
      weaponTypes: { bludgeon: ['mace2h'], slash: ['sword2h', 'axe2h', 'polearm'], dual1: ['sword1h', 'axe1h', 'mace1h'], dual2: ['sword1h', 'axe1h', 'mace1h'] },
      desc: 'Carries an entire arsenal into battle. Builds Fury with Basic attacks, unleashes it with devastating Core skills, and shouts to rally and endure.',
      mechanic: { id: 'arsenal', name: 'Arsenal System' },
      lore: 'Children of Bul-Kathos, sworn protectors of Mount Arreat.'
    },
    druid: {
      id: 'druid', name: 'Druid', color: '#c9a86a', accent: '#5a4a1a',
      resource: { name: 'Spirit', max: 100, regen: 0, decay: 0, color: '#c9a86a' },
      mainStat: 'will', secondaryStat: 'dex',
      base: { str: 8, int: 7, will: 10, dex: 7 }, perLevel: { str: 1, int: 1, will: 3, dex: 2 },
      weaponSlots: ['weapon', 'offhand'],
      weaponTypes: { weapon: ['mace1h', 'axe1h', 'mace2h', 'axe2h', 'staff'], offhand: ['totem'] },
      desc: 'Shapeshifter and storm-caller. Takes Werewolf and Werebear forms, commands wolves and ravens, and calls down Earth and Storm.',
      mechanic: { id: 'spirit_boons', name: 'Spirit Boons' },
      lore: 'Children of Scosglen who commune with the spirits of the wild.'
    }
  };

  // ---- Class mechanics -------------------------------------------------------------
  DATA.bookOfDead = {
    skeletal_warriors: {
      name: 'Skeletal Warriors', count: 4, options: {
        skirmishers: { name: 'Skirmishers', desc: 'Fast warriors with +30% damage but -15% life.', mods: [{ stat: 'dmg_summon', add: 0.3 }, { stat: 'minion_life', add: -0.15 }], upgrade: { desc: 'Raise one additional Skirmisher.', mods: [{ minion: 'skeleton', count: 1 }] } },
        defenders: { name: 'Defenders', desc: 'Warriors with +15% life that taunt enemies.', mods: [{ stat: 'minion_life', add: 0.15 }, { flag: 'minion_taunt' }], upgrade: { desc: 'Defenders have 20% chance to Stun on hit.', mods: [{ flag: 'minion_stun' }] } },
        reapers: { name: 'Reapers', desc: 'Slow, powerful warriors with +25% damage that have a chance to form corpses.', mods: [{ stat: 'dmg_summon', add: 0.25 }, { flag: 'minion_corpse' }], upgrade: { desc: 'Reapers deal +20% damage to Vulnerable enemies.', mods: [{ stat: 'dmg_vs_vuln', add: 0.2 }] } },
        sacrifice: { name: 'Sacrifice', desc: 'Lose Skeletal Warriors. Gain +10% Critical Strike Damage.', mods: [{ stat: 'crit_dmg', add: 0.1 }], sacrifice: true }
      }
    },
    skeletal_mages: {
      name: 'Skeletal Mages', count: 3, options: {
        shadow: { name: 'Shadow Mages', desc: 'Mages that deal Shadow damage, +25% minion damage.', mods: [{ stat: 'dmg_summon', add: 0.25 }], element: 'shadow', upgrade: { desc: 'Shadow Mages have 25% chance to deal double damage.', mods: [{ flag: 'mage_double' }] } },
        cold: { name: 'Cold Mages', desc: 'Mages that Chill and Freeze enemies and generate Essence.', mods: [{ flag: 'mage_chill' }, { stat: 'resource_gen', add: 0.1 }], element: 'cold', upgrade: { desc: 'Cold Mages make enemies Vulnerable for 3 seconds.', mods: [{ flag: 'mage_vuln' }] } },
        bone: { name: 'Bone Mages', desc: 'Mages that deal +40% damage but lose 15% life per cast.', mods: [{ stat: 'dmg_summon', add: 0.4 }, { flag: 'mage_bone' }], element: 'physical', upgrade: { desc: 'Bone Mages Fortify you when they take damage.', mods: [{ flag: 'mage_fortify' }] } },
        sacrifice: { name: 'Sacrifice', desc: 'Lose Skeletal Mages. Gain +15% Overpower damage.', mods: [{ stat: 'overpower_dmg', add: 0.15 }], sacrifice: true }
      }
    },
    golem: {
      name: 'Golem', count: 1, options: {
        blood: { name: 'Blood Golem', desc: 'A golem with +40% life that drains life from nearby enemies.', mods: [{ stat: 'minion_life', add: 0.4 }, { flag: 'golem_drain' }], upgrade: { desc: 'Blood Golem absorbs 15% of damage you take.', mods: [{ flag: 'golem_absorb' }] } },
        bone: { name: 'Bone Golem', desc: 'A golem that taunts and deals +20% damage.', mods: [{ stat: 'dmg_summon', add: 0.2 }, { flag: 'golem_taunt' }], upgrade: { desc: 'Bone Golem gains Thorns equal to 50% of yours.', mods: [{ flag: 'golem_thorns' }] } },
        iron: { name: 'Iron Golem', desc: 'A golem that slams the ground, making enemies Vulnerable.', mods: [{ flag: 'golem_slam' }], upgrade: { desc: 'Iron Golem\'s slam also Stuns for 1.5s.', mods: [{ flag: 'golem_stun' }] } },
        sacrifice: { name: 'Sacrifice', desc: 'Lose your Golem. Gain +10% Attack Speed.', mods: [{ stat: 'attack_speed', add: 0.1 }], sacrifice: true }
      }
    }
  };

  // Barbarian weapon expertise: each weapon type grants a passive, levelled by use (kills with it).
  DATA.arsenal = {
    sword1h: { name: 'One-Handed Sword Expertise', desc: 'Direct damage applies Bleed for 20% over 5s. Technique: +15% Critical Strike Damage.', mods: [{ stat: 'crit_dmg', add: 0.15 }], technique: [{ stat: 'crit_dmg', add: 0.15 }, { flag: 'sword_bleed' }] },
    axe1h: { name: 'One-Handed Axe Expertise', desc: '+4% Critical Strike Chance against Vulnerable enemies per expertise rank (max 10%).', mods: [{ stat: 'crit_chance', add: 0.04 }], technique: [{ stat: 'crit_chance', add: 0.1 }] },
    mace1h: { name: 'One-Handed Mace Expertise', desc: '+5% Overpower chance vs Stunned enemies. Technique: Gain 2 Fury per enemy hit while Berserking.', mods: [{ stat: 'overpower_chance', add: 0.05 }], technique: [{ stat: 'overpower_chance', add: 0.05 }, { flag: 'mace_fury' }] },
    sword2h: { name: 'Two-Handed Sword Expertise', desc: 'Direct damage applies 20% of damage as Bleeding over 5s. Technique: Bleeding deals +30%.', mods: [{ flag: 'sword_bleed' }], technique: [{ flag: 'sword_bleed' }, { stat: 'dmg_bleed', add: 0.3 }] },
    axe2h: { name: 'Two-Handed Axe Expertise', desc: '+15% damage to Vulnerable enemies. Technique: Critical Strikes make enemies Vulnerable for 2s.', mods: [{ stat: 'dmg_vs_vuln', add: 0.15 }], technique: [{ stat: 'dmg_vs_vuln', add: 0.15 }, { on: 'crit', do: { apply: 'vulnerable', dur: 2 } }] },
    mace2h: { name: 'Two-Handed Mace Expertise', desc: 'Lucky Hit: 20% chance to gain 2 Fury. Technique: +15% Overpower Damage.', mods: [{ on: 'lucky', chance: 0.2, do: { gain: 'resource', amt: 2 } }], technique: [{ stat: 'overpower_dmg', add: 0.15 }, { stat: 'dmg_vs_stunned', add: 0.1 }] },
    polearm: { name: 'Polearm Expertise', desc: 'Lucky Hit: 10% chance to make enemies Vulnerable for 2s. Technique: +10% damage to Vulnerable.', mods: [{ on: 'lucky', chance: 0.1, do: { apply: 'vulnerable', dur: 2 } }], technique: [{ on: 'lucky', chance: 0.1, do: { apply: 'vulnerable', dur: 2 } }, { stat: 'dmg_vs_vuln', add: 0.1 }] }
  };

  DATA.spiritBoons = {
    deer: { name: 'Deer', color: '#b58a4a', boons: {
      prickleskin: { name: 'Prickleskin', desc: 'Gain Thorns equal to 15% of your Armor.', mods: [{ flag: 'thorns_from_armor', v: 0.15 }] },
      gift_of_the_stag: { name: 'Gift of the Stag', desc: 'Gain +10 Maximum Spirit.', mods: [{ stat: 'max_resource', add: 10 }] },
      wariness: { name: 'Wariness', desc: 'Take 10% reduced damage from Elites.', mods: [{ stat: 'dr_elite', add: 0.1 }] },
      advantageous_beast: { name: 'Advantageous Beast', desc: 'Reduce the duration of Crowd Control by 15%.', mods: [{ stat: 'cc_reduction', add: 0.15 }] } } },
    eagle: { name: 'Eagle', color: '#8ab4d6', boons: {
      scythe_talons: { name: 'Scythe Talons', desc: '+5% Critical Strike Chance.', mods: [{ stat: 'crit_chance', add: 0.05 }] },
      iron_feather: { name: 'Iron Feather', desc: '+10% Maximum Life.', mods: [{ stat: 'life_pct', add: 0.1 }] },
      swooping_attacks: { name: 'Swooping Attacks', desc: '+10% Attack Speed.', mods: [{ stat: 'attack_speed', add: 0.1 }] },
      avian_wrath: { name: 'Avian Wrath', desc: '+30% Critical Strike Damage.', mods: [{ stat: 'crit_dmg', add: 0.3 }] } } },
    wolf: { name: 'Wolf', color: '#9aa0a8', boons: {
      packleader: { name: 'Packleader', desc: 'Lucky Hit: Critical Strikes have 20% chance to reset Companion cooldowns.', mods: [{ on: 'crit', chance: 0.2, do: { reset: 'companion' } }] },
      energize: { name: 'Energize', desc: 'Lucky Hit: 20% chance to gain 10 Spirit.', mods: [{ on: 'lucky', chance: 0.2, do: { gain: 'resource', amt: 10 } }] },
      bolster: { name: 'Bolster', desc: 'Fortify for 10% of Maximum Life when you use a Defensive skill.', mods: [{ on: 'cast_defensive', do: { fortify: 0.1 } }] },
      calamity: { name: 'Calamity', desc: 'Ultimate skills last 25% longer and gain +20% damage.', mods: [{ stat: 'dmg_ult', add: 0.2 }, { flag: 'ult_longer' }] } } },
    snake: { name: 'Snake', color: '#7dc96a', boons: {
      obsidian_slam: { name: 'Obsidian Slam', desc: 'Every 10th kill causes your next Earth skill to Overpower.', mods: [{ flag: 'obsidian_slam' }] },
      overload: { name: 'Overload', desc: 'Lucky Hit: Lightning damage has 20% chance to deal 20% extra damage to surrounding enemies.', mods: [{ on: 'lucky', chance: 0.2, element: 'lightning', do: { nova: 0.2 } }] },
      masochistic: { name: 'Masochistic', desc: 'Critical Strikes with Werewolf skills heal you for 3% of Maximum Life.', mods: [{ on: 'crit', tag: 'werewolf', do: { heal: 0.03 } }] },
      calm_before_the_storm: { name: 'Calm Before the Storm', desc: 'Lucky Hit: Nature Magic skills have 15% chance to reduce Ultimate cooldowns by 2s.', mods: [{ on: 'lucky', chance: 0.15, do: { cdr_ult: 2 } }] } } }
  };

  // Paladin auras: one active aura is "radiated" at a time; ranks come from the skill tree's Aura cluster.
  DATA.paladinAurasNote = 'Only one Aura can be active. Switching Auras is free. Aura power scales with its skill rank.';

  // Starting gear and skills per class
  DATA.classStart = {
    necromancer: { weapon: 'scythe1h', skills: ['decompose', 'blight'] },
    paladin: { weapon: 'mace1h', offhand: 'shield', skills: ['smite', 'zeal'] },
    barbarian: { weapon: 'sword2h', skills: ['bash', 'whirlwind'] },
    druid: { weapon: 'axe1h', offhand: 'totem', skills: ['maul', 'pulverize'] }
  };

  // Appearance options (character creator)
  DATA.appearance = {
    skin: [{ id: 'fair', c: '#f1d2b6' }, { id: 'tan', c: '#d9a877' }, { id: 'olive', c: '#b58a5a' }, { id: 'brown', c: '#8a5a3a' }, { id: 'dark', c: '#5a3a28' }, { id: 'ashen', c: '#b9b2b0' }],
    hair: [{ id: 'black', c: '#1b1b1b' }, { id: 'brown', c: '#5a3a1a' }, { id: 'blonde', c: '#e2c278' }, { id: 'red', c: '#b5401a' }, { id: 'white', c: '#e8e8e8' }, { id: 'silver', c: '#a0a8b8' }],
    body: ['lean', 'average', 'heavy']
  };
})();
