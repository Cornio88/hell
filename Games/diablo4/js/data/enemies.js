/* Sanctuary — enemy roster, elite affixes, bosses (global: DATA.ENEMIES, DATA.ELITE_AFFIXES, DATA.BOSSES) */
(function () {
  'use strict';
  // behavior: melee | ranged | caster | charger | summoner | exploder | support | lurker
  // abilities: list used by AI on cooldown. kinds: proj (speed, coef, count, spread, element), aoe (radius, delay, coef, element, at:'target'|'self'),
  //   charge (dist, coef), summon (id, count), heal (pct, radius), buff (radius, dmg), leap (dist, radius, coef), pool (radius, dur, coef, element), nova (radius, coef, element), explode (radius, coef) on death
  const E = (id, name, family, o) => Object.assign({ id, name, family, hp: 1, dmg: 1, speed: 3.2, r: 0.55, behavior: 'melee', range: 1.3, atkCd: 1.4, element: 'physical', resist: {}, abilities: [], xp: 1, minLevel: 1, weight: 1, shape: 'humanoid', color: '#a08060' }, o);
  const list = [
    // --- Fallen (demons) — Fractured Peaks/Dry Steppes/Kehjistan
    E('fallen', 'Fallen', 'fallen', { hp: 0.6, dmg: 0.7, speed: 3.8, r: 0.45, color: '#c0583a', shape: 'imp', xp: 0.7, weight: 3 }),
    E('fallen_lunatic', 'Fallen Lunatic', 'fallen', { hp: 0.4, dmg: 1.6, speed: 5.5, r: 0.45, color: '#ff6a3a', shape: 'imp', behavior: 'exploder', abilities: [{ kind: 'explode', radius: 1.8, coef: 1.6, element: 'fire' }], xp: 0.8, weight: 1.5 }),
    E('fallen_shaman', 'Fallen Shaman', 'fallen', { hp: 0.9, dmg: 0.9, speed: 2.6, r: 0.5, color: '#d8a040', shape: 'imp', behavior: 'summoner', range: 7, abilities: [{ kind: 'proj', speed: 9, coef: 1.0, element: 'fire', cd: 2.2 }, { kind: 'summon', id: 'fallen', count: 2, cd: 9, max: 6 }], xp: 1.4, minLevel: 3 }),
    E('fallen_overseer', 'Fallen Overseer', 'fallen', { hp: 2.4, dmg: 1.4, speed: 3.0, r: 0.75, color: '#8a3020', shape: 'brute', abilities: [{ kind: 'buff', radius: 5, dmg: 0.25, cd: 8 }], xp: 2.2, minLevel: 6, weight: 0.6 }),
    E('fallen_hound', 'Fallen Hound', 'fallen', { hp: 0.7, dmg: 0.9, speed: 5.2, r: 0.45, color: '#b04020', shape: 'beast', behavior: 'charger', abilities: [{ kind: 'charge', dist: 6, coef: 1.3, cd: 5 }], xp: 0.9, minLevel: 4 }),
    // --- Skeletons (undead)
    E('skeleton', 'Skeleton', 'skeleton', { hp: 0.8, dmg: 0.9, speed: 3.0, color: '#e8e2d0', shape: 'skull', resist: { cold: 0.5, poison: 0.8, shadow: 0.3 }, xp: 0.8, weight: 3 }),
    E('skeleton_archer', 'Skeleton Archer', 'skeleton', { hp: 0.6, dmg: 0.8, speed: 2.8, color: '#d8d2c0', shape: 'skull', behavior: 'ranged', range: 8, abilities: [{ kind: 'proj', speed: 14, coef: 1.0, cd: 1.8 }], resist: { cold: 0.5, poison: 0.8 }, xp: 0.9, weight: 2 }),
    E('skeletal_mage', 'Skeletal Mage', 'skeleton', { hp: 0.7, dmg: 1.1, speed: 2.6, color: '#9ab0ff', shape: 'skull', behavior: 'ranged', range: 9, element: 'cold', abilities: [{ kind: 'proj', speed: 10, coef: 1.2, element: 'cold', apply: { st: 'chill', pct: 0.3, dur: 2 }, cd: 2.0 }], resist: { cold: 0.9 }, xp: 1.1, minLevel: 4 }),
    E('skeleton_captain', 'Skeleton Captain', 'skeleton', { hp: 2.5, dmg: 1.4, speed: 3.0, r: 0.7, color: '#c8b890', shape: 'skull', abilities: [{ kind: 'buff', radius: 5, dmg: 0.2, cd: 7 }, { kind: 'summon', id: 'skeleton', count: 2, cd: 10, max: 5 }], resist: { cold: 0.5 }, xp: 2.4, minLevel: 8, weight: 0.5 }),
    E('skeletal_ballista', 'Skeletal Ballista', 'skeleton', { hp: 3.0, dmg: 2.2, speed: 0, r: 0.9, color: '#a89a78', shape: 'construct', behavior: 'ranged', range: 12, abilities: [{ kind: 'proj', speed: 18, coef: 2.5, cd: 3.5, pierce: 3 }], resist: { poison: 1 }, xp: 2.0, minLevel: 12, weight: 0.4 }),
    E('bone_warden', 'Bone Warden', 'skeleton', { hp: 4.0, dmg: 1.6, speed: 2.4, r: 0.85, color: '#fff3dd', shape: 'skull', abilities: [{ kind: 'nova', radius: 3, coef: 1.4, cd: 6, telegraph: 0.8 }], resist: { cold: 0.6, shadow: 0.5 }, xp: 3.0, minLevel: 20, weight: 0.35 }),
    // --- Zombies / Risen
    E('zombie', 'Zombie', 'zombie', { hp: 1.3, dmg: 1.0, speed: 2.0, r: 0.6, color: '#6f8a5a', shape: 'humanoid', resist: { poison: 0.8, shadow: 0.3 }, xp: 0.9, weight: 2.5 }),
    E('bloated_corpse', 'Bloated Corpse', 'zombie', { hp: 1.8, dmg: 1.2, speed: 1.8, r: 0.8, color: '#8ca070', shape: 'blob', behavior: 'exploder', abilities: [{ kind: 'explode', radius: 2.5, coef: 1.8, element: 'poison', pool: { dur: 4, coef: 0.3 } }], resist: { poison: 1 }, xp: 1.3, minLevel: 3 }),
    E('risen_knight', 'Risen Knight', 'zombie', { hp: 3.2, dmg: 1.5, speed: 2.4, r: 0.7, color: '#50604a', shape: 'armored', abilities: [{ kind: 'aoe', at: 'self', radius: 2.6, delay: 0.7, coef: 1.6, cd: 5 }], resist: { poison: 0.6 }, xp: 2.5, minLevel: 10, weight: 0.6 }),
    E('ghoul', 'Ghoul', 'zombie', { hp: 0.7, dmg: 1.1, speed: 5.0, r: 0.5, color: '#7a9a60', shape: 'beast', behavior: 'charger', abilities: [{ kind: 'charge', dist: 5, coef: 1.2, cd: 4 }], xp: 1.0, minLevel: 5, weight: 1.5 }),
    E('plague_carrier', 'Plague Carrier', 'zombie', { hp: 1.4, dmg: 0.8, speed: 2.4, r: 0.6, color: '#a0c060', shape: 'humanoid', behavior: 'caster', range: 7, abilities: [{ kind: 'pool', radius: 2.2, dur: 5, coef: 0.4, element: 'poison', cd: 4 }], resist: { poison: 1 }, xp: 1.4, minLevel: 9 }),
    // --- Drowned (Scosglen)
    E('drowned_wretch', 'Drowned Wretch', 'drowned', { hp: 1.0, dmg: 1.0, speed: 2.8, color: '#3f7a8a', shape: 'humanoid', resist: { cold: 0.6 }, xp: 0.9, weight: 2.5 }),
    E('drowned_deckhand', 'Drowned Deckhand', 'drowned', { hp: 1.4, dmg: 1.2, speed: 2.8, r: 0.6, color: '#2f6a7a', shape: 'humanoid', abilities: [{ kind: 'aoe', at: 'target', radius: 2.0, delay: 0.6, coef: 1.4, element: 'cold', cd: 5 }], resist: { cold: 0.6 }, xp: 1.2, minLevel: 4 }),
    E('drowned_seahag', 'Drowned Seahag', 'drowned', { hp: 1.2, dmg: 1.1, speed: 2.4, color: '#5aa0b0', shape: 'humanoid', behavior: 'caster', range: 8, abilities: [{ kind: 'proj', speed: 11, coef: 1.1, element: 'cold', count: 3, spread: 0.3, cd: 2.5 }, { kind: 'summon', id: 'drowned_wretch', count: 2, cd: 12, max: 4 }], resist: { cold: 0.7 }, xp: 1.6, minLevel: 6 }),
    E('drowned_abomination', 'Drowned Abomination', 'drowned', { hp: 4.5, dmg: 1.8, speed: 2.0, r: 1.0, color: '#1f4a5a', shape: 'brute', abilities: [{ kind: 'aoe', at: 'self', radius: 3.2, delay: 0.9, coef: 2.2, element: 'cold', cd: 6 }], resist: { cold: 0.8 }, xp: 3.5, minLevel: 14, weight: 0.3 }),
    E('tidal_crab', 'Tidal Crab', 'drowned', { hp: 2.0, dmg: 1.0, speed: 2.2, r: 0.65, color: '#8a4a3a', shape: 'crab', resist: { physical: 0.3 }, xp: 1.1, minLevel: 3, weight: 1.2 }),
    // --- Spiders (Scosglen/Hawezar)
    E('spider', 'Spider', 'spider', { hp: 0.5, dmg: 0.7, speed: 4.6, r: 0.4, color: '#4a3a2a', shape: 'spider', element: 'poison', abilities: [{ kind: 'applyOnHit', apply: { st: 'poison', coef: 0.4, dur: 4 } }], resist: { poison: 0.9 }, xp: 0.6, weight: 3 }),
    E('poison_spider', 'Poison Spider', 'spider', { hp: 0.9, dmg: 0.9, speed: 3.8, r: 0.5, color: '#5a8a2a', shape: 'spider', behavior: 'ranged', range: 7, element: 'poison', abilities: [{ kind: 'proj', speed: 10, coef: 0.9, element: 'poison', apply: { st: 'poison', coef: 0.6, dur: 4 }, cd: 2 }], resist: { poison: 1 }, xp: 1.0, minLevel: 4 }),
    E('spider_host', 'Spider Host', 'spider', { hp: 2.0, dmg: 1.0, speed: 2.2, r: 0.7, color: '#6a5a4a', shape: 'humanoid', behavior: 'summoner', abilities: [{ kind: 'summon', id: 'spider', count: 3, cd: 7, max: 8 }, { kind: 'explode', radius: 2.2, coef: 1.0, element: 'poison', spawn: { id: 'spider', count: 3 } }], resist: { poison: 0.8 }, xp: 1.8, minLevel: 8 }),
    E('broodmother', 'Broodmother', 'spider', { hp: 5.0, dmg: 1.6, speed: 2.6, r: 1.0, color: '#3a2a3a', shape: 'spider', abilities: [{ kind: 'summon', id: 'spider', count: 4, cd: 8, max: 10 }, { kind: 'pool', radius: 2.5, dur: 5, coef: 0.5, element: 'poison', cd: 5 }], resist: { poison: 1 }, xp: 4.0, minLevel: 18, weight: 0.3 }),
    // --- Goatmen / Khazra (Scosglen/Fractured Peaks)
    E('khazra_impaler', 'Khazra Impaler', 'khazra', { hp: 1.2, dmg: 1.2, speed: 3.6, r: 0.6, color: '#6a5a3a', shape: 'horned', xp: 1.1, weight: 2.5 }),
    E('khazra_shaman', 'Khazra Shaman', 'khazra', { hp: 1.0, dmg: 1.1, speed: 2.6, r: 0.55, color: '#8a6a3a', shape: 'horned', behavior: 'caster', range: 8, element: 'lightning', abilities: [{ kind: 'proj', speed: 12, coef: 1.2, element: 'lightning', cd: 2.2 }, { kind: 'heal', pct: 0.15, radius: 6, cd: 8 }], xp: 1.5, minLevel: 5 }),
    E('khazra_hunter', 'Khazra Hunter', 'khazra', { hp: 0.9, dmg: 1.0, speed: 3.4, r: 0.55, color: '#5a4a2a', shape: 'horned', behavior: 'ranged', range: 9, abilities: [{ kind: 'proj', speed: 15, coef: 1.1, cd: 1.6 }], xp: 1.1, minLevel: 3, weight: 2 }),
    E('khazra_brute', 'Khazra Brute', 'khazra', { hp: 3.5, dmg: 1.7, speed: 3.0, r: 0.85, color: '#4a3a2a', shape: 'brute', behavior: 'charger', abilities: [{ kind: 'charge', dist: 7, coef: 1.8, cd: 6, knock: true }], xp: 3.0, minLevel: 12, weight: 0.5 }),
    // --- Cannibals (Dry Steppes)
    E('cannibal_marauder', 'Cannibal Marauder', 'cannibal', { hp: 1.1, dmg: 1.3, speed: 4.0, r: 0.55, color: '#9a6a5a', shape: 'humanoid', xp: 1.1, weight: 2.5, minLevel: 8 }),
    E('cannibal_gorger', 'Cannibal Gorger', 'cannibal', { hp: 2.2, dmg: 1.5, speed: 3.0, r: 0.7, color: '#7a4a3a', shape: 'brute', abilities: [{ kind: 'heal', pct: 0.2, radius: 0, cd: 10, self: true }], xp: 1.8, minLevel: 10 }),
    E('cannibal_brute', 'Cannibal Brute', 'cannibal', { hp: 3.8, dmg: 1.9, speed: 2.8, r: 0.9, color: '#5a3a2a', shape: 'brute', abilities: [{ kind: 'leap', dist: 6, radius: 2.2, coef: 2.0, cd: 7 }], xp: 3.0, minLevel: 15, weight: 0.5 }),
    E('cannibal_butcher', 'Cannibal Butcher', 'cannibal', { hp: 1.6, dmg: 1.6, speed: 3.4, r: 0.6, color: '#b05a4a', shape: 'humanoid', abilities: [{ kind: 'applyOnHit', apply: { st: 'bleed', coef: 0.5, dur: 4 } }], xp: 1.5, minLevel: 12 }),
    // --- Bandits / Cultists (humans)
    E('bandit', 'Bandit', 'bandit', { hp: 0.9, dmg: 1.0, speed: 3.6, color: '#8a7a5a', shape: 'humanoid', xp: 0.9, weight: 2.5 }),
    E('bandit_archer', 'Bandit Archer', 'bandit', { hp: 0.7, dmg: 0.9, speed: 3.2, color: '#7a6a4a', shape: 'humanoid', behavior: 'ranged', range: 9, abilities: [{ kind: 'proj', speed: 16, coef: 1.0, cd: 1.5 }], xp: 0.9, weight: 2 }),
    E('bandit_captain', 'Bandit Captain', 'bandit', { hp: 2.6, dmg: 1.5, speed: 3.4, r: 0.65, color: '#5a4a3a', shape: 'armored', abilities: [{ kind: 'buff', radius: 5, dmg: 0.2, cd: 8 }, { kind: 'aoe', at: 'self', radius: 2.4, delay: 0.5, coef: 1.5, cd: 5 }], xp: 2.4, minLevel: 7, weight: 0.5 }),
    E('cultist', 'Cultist', 'cultist', { hp: 0.9, dmg: 1.0, speed: 3.2, color: '#6a3a6a', shape: 'robed', behavior: 'ranged', range: 8, element: 'shadow', abilities: [{ kind: 'proj', speed: 11, coef: 1.0, element: 'shadow', cd: 2 }], xp: 1.0, weight: 2, minLevel: 5 }),
    E('blasphemer', 'Blasphemer', 'cultist', { hp: 1.5, dmg: 1.3, speed: 2.8, r: 0.6, color: '#8a2a6a', shape: 'robed', behavior: 'caster', range: 8, element: 'shadow', abilities: [{ kind: 'aoe', at: 'target', radius: 2.4, delay: 0.9, coef: 1.8, element: 'shadow', cd: 4 }], xp: 1.6, minLevel: 9 }),
    E('cult_leader', 'Cult Leader', 'cultist', { hp: 3.0, dmg: 1.4, speed: 2.6, r: 0.7, color: '#aa2a8a', shape: 'robed', behavior: 'summoner', range: 8, element: 'shadow', abilities: [{ kind: 'summon', id: 'cultist', count: 2, cd: 9, max: 4 }, { kind: 'proj', speed: 10, coef: 1.4, element: 'shadow', count: 5, spread: 0.6, cd: 3 }], xp: 3.0, minLevel: 16, weight: 0.4 }),
    E('triune_zealot', 'Triune Zealot', 'cultist', { hp: 1.3, dmg: 1.4, speed: 3.8, r: 0.55, color: '#9a4a2a', shape: 'robed', element: 'fire', abilities: [{ kind: 'applyOnHit', apply: { st: 'burn', coef: 0.4, dur: 3 } }], xp: 1.3, minLevel: 20 }),
    // --- Vampires (Hawezar / Kehjistan)
    E('bloodseeker', 'Bloodseeker', 'vampire', { hp: 1.2, dmg: 1.3, speed: 4.2, r: 0.55, color: '#8a1a2a', shape: 'humanoid', abilities: [{ kind: 'lifesteal', pct: 0.3 }], xp: 1.3, minLevel: 15, weight: 2.5 }),
    E('bloodbound', 'Bloodbound Cultist', 'vampire', { hp: 1.4, dmg: 1.2, speed: 3.0, color: '#aa2a3a', shape: 'robed', behavior: 'caster', range: 8, abilities: [{ kind: 'proj', speed: 12, coef: 1.3, element: 'physical', apply: { st: 'bleed', coef: 0.6, dur: 4 }, cd: 2.2 }], xp: 1.4, minLevel: 18 }),
    E('vampire_lord', 'Vampire Lord', 'vampire', { hp: 4.5, dmg: 1.8, speed: 3.4, r: 0.8, color: '#5a0a1a', shape: 'armored', abilities: [{ kind: 'blink', dist: 6, cd: 6 }, { kind: 'nova', radius: 3.5, coef: 1.8, element: 'shadow', cd: 7, telegraph: 0.8 }, { kind: 'lifesteal', pct: 0.4 }], xp: 4.0, minLevel: 25, weight: 0.3 }),
    E('blood_bat', 'Blood Bat', 'vampire', { hp: 0.4, dmg: 0.6, speed: 6.0, r: 0.35, color: '#6a2a3a', shape: 'bat', abilities: [{ kind: 'lifesteal', pct: 0.5 }], xp: 0.5, minLevel: 15, weight: 2 }),
    // --- Demons (Hell)
    E('imp', 'Imp', 'demon', { hp: 0.5, dmg: 0.8, speed: 4.8, r: 0.4, color: '#c04040', shape: 'imp', behavior: 'ranged', range: 6, element: 'fire', abilities: [{ kind: 'proj', speed: 12, coef: 0.9, element: 'fire', cd: 1.6 }], resist: { fire: 0.8 }, xp: 0.8, minLevel: 10, weight: 2.5 }),
    E('succubus', 'Succubus', 'demon', { hp: 1.2, dmg: 1.2, speed: 3.6, r: 0.55, color: '#d05080', shape: 'winged', behavior: 'ranged', range: 9, element: 'shadow', abilities: [{ kind: 'proj', speed: 10, coef: 1.2, element: 'shadow', homing: true, cd: 2.2 }, { kind: 'blink', dist: 5, cd: 7 }], resist: { shadow: 0.6 }, xp: 1.6, minLevel: 18 }),
    E('blood_clan_warrior', 'Blood Clan Warrior', 'demon', { hp: 2.0, dmg: 1.4, speed: 3.4, r: 0.7, color: '#a03030', shape: 'brute', xp: 1.8, minLevel: 15, weight: 2 }),
    E('blood_clan_impaler', 'Blood Clan Impaler', 'demon', { hp: 1.8, dmg: 1.6, speed: 3.2, r: 0.65, color: '#803030', shape: 'brute', behavior: 'ranged', range: 7, abilities: [{ kind: 'proj', speed: 17, coef: 1.6, cd: 2.5, pierce: 2 }], xp: 1.8, minLevel: 17 }),
    E('fire_clan_hound', 'Hellhound', 'demon', { hp: 1.0, dmg: 1.2, speed: 5.4, r: 0.5, color: '#ff5a1a', shape: 'beast', element: 'fire', behavior: 'charger', abilities: [{ kind: 'charge', dist: 6, coef: 1.4, cd: 4 }, { kind: 'applyOnHit', apply: { st: 'burn', coef: 0.5, dur: 3 } }], resist: { fire: 1 }, xp: 1.2, minLevel: 14, weight: 2 }),
    E('pit_lord', 'Pit Lord', 'demon', { hp: 6.0, dmg: 2.2, speed: 2.6, r: 1.1, color: '#6a1010', shape: 'brute', element: 'fire', abilities: [{ kind: 'aoe', at: 'self', radius: 4, delay: 1.0, coef: 2.4, element: 'fire', cd: 7 }, { kind: 'charge', dist: 7, coef: 2.0, cd: 9, knock: true }], resist: { fire: 1 }, xp: 5.0, minLevel: 30, weight: 0.25 }),
    E('hell_spawn', 'Hellspawn', 'demon', { hp: 1.4, dmg: 1.3, speed: 3.8, r: 0.6, color: '#b03a1a', shape: 'horned', element: 'fire', xp: 1.3, minLevel: 22, weight: 2 }),
    E('tormentor', 'Tormentor', 'demon', { hp: 2.6, dmg: 1.5, speed: 3.0, r: 0.7, color: '#4a1a4a', shape: 'winged', behavior: 'caster', range: 8, element: 'shadow', abilities: [{ kind: 'aoe', at: 'target', radius: 2.8, delay: 1.0, coef: 2.0, element: 'shadow', cd: 4 }, { kind: 'pool', radius: 2, dur: 4, coef: 0.5, element: 'shadow', cd: 6 }], xp: 2.4, minLevel: 28 }),
    // --- Ghosts / Spirits
    E('specter', 'Specter', 'ghost', { hp: 0.8, dmg: 1.0, speed: 3.6, r: 0.5, color: '#9ac0d0', shape: 'ghost', element: 'cold', abilities: [{ kind: 'phase', cd: 5 }], resist: { physical: 0.4, cold: 0.6 }, xp: 1.0, minLevel: 6, weight: 2 }),
    E('wraith', 'Wraith', 'ghost', { hp: 1.5, dmg: 1.4, speed: 4.2, r: 0.55, color: '#6a8aa0', shape: 'ghost', element: 'shadow', behavior: 'charger', abilities: [{ kind: 'charge', dist: 7, coef: 1.4, cd: 4 }], resist: { physical: 0.4, shadow: 0.6 }, xp: 1.5, minLevel: 12 }),
    E('banshee', 'Banshee', 'ghost', { hp: 1.2, dmg: 1.2, speed: 3.0, color: '#c0d8e8', shape: 'ghost', behavior: 'caster', range: 8, element: 'shadow', abilities: [{ kind: 'nova', radius: 4, coef: 1.5, element: 'shadow', cd: 6, telegraph: 1.0, apply: { st: 'fear', dur: 1.5 } }], resist: { physical: 0.4 }, xp: 1.6, minLevel: 16 }),
    E('revenant', 'Revenant', 'ghost', { hp: 3.5, dmg: 1.6, speed: 2.8, r: 0.75, color: '#4a6a8a', shape: 'armored', element: 'cold', abilities: [{ kind: 'aoe', at: 'self', radius: 3, delay: 0.8, coef: 1.8, element: 'cold', apply: { st: 'freeze', dur: 1.5 }, cd: 7 }], resist: { physical: 0.3, cold: 0.8 }, xp: 3.0, minLevel: 24, weight: 0.4 }),
    // --- Wildlife / Werebeasts (Scosglen)
    E('wolf', 'Wolf', 'wildlife', { hp: 0.8, dmg: 0.9, speed: 5.0, r: 0.5, color: '#7a7a7a', shape: 'beast', xp: 0.7, weight: 2.5 }),
    E('dire_wolf', 'Dire Wolf', 'wildlife', { hp: 1.6, dmg: 1.3, speed: 4.8, r: 0.65, color: '#4a4a4a', shape: 'beast', behavior: 'charger', abilities: [{ kind: 'charge', dist: 6, coef: 1.4, cd: 5 }], xp: 1.4, minLevel: 8 }),
    E('bear', 'Grizzly', 'wildlife', { hp: 3.0, dmg: 1.7, speed: 3.2, r: 0.9, color: '#5a3a1a', shape: 'beast', abilities: [{ kind: 'aoe', at: 'self', radius: 2.5, delay: 0.6, coef: 1.8, cd: 6 }], xp: 2.5, minLevel: 6, weight: 0.6 }),
    E('werewolf', 'Werewolf', 'wildlife', { hp: 2.0, dmg: 1.6, speed: 4.6, r: 0.65, color: '#5a4a3a', shape: 'horned', behavior: 'charger', abilities: [{ kind: 'charge', dist: 7, coef: 1.5, cd: 4 }, { kind: 'applyOnHit', apply: { st: 'bleed', coef: 0.4, dur: 4 } }], xp: 2.0, minLevel: 14, weight: 1.2 }),
    E('werebear', 'Werebear', 'wildlife', { hp: 4.5, dmg: 2.0, speed: 3.0, r: 0.95, color: '#3a2a1a', shape: 'brute', abilities: [{ kind: 'aoe', at: 'self', radius: 3, delay: 0.8, coef: 2.2, cd: 6, knock: true }], xp: 3.5, minLevel: 20, weight: 0.4 }),
    E('giant_spider_crab', 'Lacuni Prowler', 'wildlife', { hp: 1.1, dmg: 1.2, speed: 4.4, r: 0.55, color: '#8a8a6a', shape: 'beast', xp: 1.1, minLevel: 12, weight: 1.5 }),
    // --- Snakes / Nangari (Hawezar)
    E('nangari_snake', 'Nangari Serpent', 'nangari', { hp: 0.9, dmg: 1.1, speed: 4.0, r: 0.5, color: '#4a8a4a', shape: 'snake', element: 'poison', abilities: [{ kind: 'applyOnHit', apply: { st: 'poison', coef: 0.5, dur: 4 } }], resist: { poison: 1 }, xp: 1.0, minLevel: 18, weight: 2.5 }),
    E('nangari_hexer', 'Nangari Hexer', 'nangari', { hp: 1.3, dmg: 1.2, speed: 2.8, color: '#6aaa4a', shape: 'snake', behavior: 'caster', range: 8, element: 'poison', abilities: [{ kind: 'pool', radius: 2.4, dur: 5, coef: 0.5, element: 'poison', cd: 4 }, { kind: 'proj', speed: 11, coef: 1.2, element: 'poison', cd: 2.5 }], resist: { poison: 1 }, xp: 1.6, minLevel: 20 }),
    E('nangari_eviscerator', 'Nangari Eviscerator', 'nangari', { hp: 3.5, dmg: 1.8, speed: 3.4, r: 0.8, color: '#2a6a2a', shape: 'snake', behavior: 'charger', abilities: [{ kind: 'charge', dist: 7, coef: 1.8, cd: 5 }], resist: { poison: 1 }, xp: 3.0, minLevel: 26, weight: 0.4 }),
    // --- Constructs / Lacuni / Nahantu
    E('bone_golem', 'Bone Golem', 'construct', { hp: 5.0, dmg: 1.8, speed: 2.2, r: 1.0, color: '#d0c8b0', shape: 'construct', abilities: [{ kind: 'nova', radius: 3.2, coef: 1.6, cd: 6, telegraph: 0.9 }], resist: { poison: 1, cold: 0.5 }, xp: 4.0, minLevel: 22, weight: 0.3 }),
    E('ancient_guardian', 'Ancient Guardian', 'construct', { hp: 7.0, dmg: 2.4, speed: 2.0, r: 1.1, color: '#8aa0a8', shape: 'construct', behavior: 'ranged', range: 9, element: 'lightning', abilities: [{ kind: 'proj', speed: 12, coef: 2.2, element: 'lightning', count: 3, spread: 0.4, cd: 3.5 }, { kind: 'aoe', at: 'self', radius: 3.5, delay: 1.0, coef: 2.6, cd: 8 }], resist: { poison: 1, lightning: 0.8, physical: 0.3 }, xp: 6.0, minLevel: 35, weight: 0.2 }),
    E('spirit_hunter', 'Spirit Hunter', 'nahantu', { hp: 1.2, dmg: 1.3, speed: 4.0, r: 0.55, color: '#5a8a6a', shape: 'humanoid', behavior: 'ranged', range: 9, abilities: [{ kind: 'proj', speed: 16, coef: 1.2, cd: 1.6 }], xp: 1.3, minLevel: 30, weight: 2 }),
    E('mother_zealot', 'Zealot of Mother', 'nahantu', { hp: 1.6, dmg: 1.4, speed: 3.6, r: 0.6, color: '#2a4a2a', shape: 'robed', element: 'shadow', abilities: [{ kind: 'applyOnHit', apply: { st: 'shadow_dot', coef: 0.5, dur: 4 } }], xp: 1.5, minLevel: 32, weight: 2 }),
    E('mother_judgement', 'Mother\'s Judgement', 'nahantu', { hp: 5.5, dmg: 2.2, speed: 2.8, r: 1.0, color: '#1a3a2a', shape: 'winged', behavior: 'caster', range: 9, element: 'shadow', abilities: [{ kind: 'aoe', at: 'target', radius: 3.2, delay: 1.1, coef: 2.6, element: 'shadow', cd: 4 }, { kind: 'summon', id: 'mother_zealot', count: 2, cd: 10, max: 4 }], xp: 5.0, minLevel: 40, weight: 0.25 }),
    E('maggot_swarm', 'Maggot Swarm', 'wildlife', { hp: 0.3, dmg: 0.5, speed: 4.4, r: 0.35, color: '#c0c080', shape: 'blob', xp: 0.4, weight: 2, minLevel: 2 }),
    E('scavenger_hyena', 'Hyena', 'wildlife', { hp: 0.9, dmg: 1.0, speed: 5.0, r: 0.5, color: '#a08a5a', shape: 'beast', xp: 0.8, weight: 2, minLevel: 8 })
  ];
  DATA.ENEMIES = list;
  DATA.enemyById = {}; list.forEach(e => { DATA.enemyById[e.id] = e; });
  DATA.FAMILIES = { fallen: 'Fallen', skeleton: 'Skeletons', zombie: 'Risen Dead', drowned: 'Drowned', spider: 'Spiders', khazra: 'Khazra', cannibal: 'Cannibals', bandit: 'Bandits', cultist: 'Cultists', vampire: 'Vampires', demon: 'Demons', ghost: 'Spirits', wildlife: 'Wildlife', nangari: 'Nangari', construct: 'Constructs', nahantu: 'Nahantu Cult' };

  // ---- Elite affixes (champions/elites roll 1-3). Fields are read by combat AI.
  DATA.ELITE_AFFIXES = [
    { id: 'teleporter', name: 'Teleporter', desc: 'Blinks toward you.', blink: 5 },
    { id: 'vampiric', name: 'Vampiric', desc: 'Heals when it damages you.', lifesteal: 0.5 },
    { id: 'shadow_enchanted', name: 'Shadow Enchanted', desc: 'Fires Shadow volleys.', volley: { element: 'shadow', count: 5, coef: 0.8, cd: 5 } },
    { id: 'cold_enchanted', name: 'Cold Enchanted', desc: 'Leaves chilling pools and Chills on hit.', pool: { element: 'cold', radius: 1.6, dur: 4, coef: 0.3, cd: 4, apply: { st: 'chill', pct: 0.4, dur: 2 } } },
    { id: 'fire_enchanted', name: 'Fire Enchanted', desc: 'Explodes in flames on death and Burns.', deathExplode: { element: 'fire', radius: 3, coef: 2.0 }, onHit: { st: 'burn', coef: 0.5, dur: 3 } },
    { id: 'lightning_enchanted', name: 'Lightning Enchanted', desc: 'Releases lightning orbs when hit.', retaliate: { element: 'lightning', coef: 0.6, chance: 0.25, count: 2 } },
    { id: 'poison_enchanted', name: 'Poison Enchanted', desc: 'Leaves poison pools.', pool: { element: 'poison', radius: 1.8, dur: 5, coef: 0.4, cd: 3.5 } },
    { id: 'suppressor', name: 'Suppressor', desc: 'Projects a bubble that reduces damage from Distant attackers by 70%.', suppress: 0.7 },
    { id: 'waller', name: 'Waller', desc: 'Summons walls of bone to trap you.', walls: { cd: 8 } },
    { id: 'terrifying', name: 'Terrifying', desc: 'Its attacks Fear you.', onHit: { st: 'fear', dur: 1.5 } },
    { id: 'multishot', name: 'Multishot', desc: 'Fires extra projectiles.', extraProj: 2 },
    { id: 'explosive', name: 'Explosive', desc: 'Lobs arcane bombs.', mortar: { element: 'shadow', radius: 2.2, coef: 1.6, cd: 4, delay: 1.2 } },
    { id: 'summoner', name: 'Summoner', desc: 'Summons allies.', summon: { cd: 9, count: 2 } },
    { id: 'mortar', name: 'Mortar', desc: 'Lobs fiery mortars at range.', mortar: { element: 'fire', radius: 2.4, coef: 2.0, cd: 3.5, delay: 1.0 } },
    { id: 'frozen', name: 'Frozen', desc: 'Its attacks have a chance to Freeze.', onHit: { st: 'freeze', dur: 1.5, chance: 0.3 } },
    { id: 'bloodthirsty', name: 'Bloodthirsty', desc: 'Gains damage as it loses life.', enrage: 0.6 },
    { id: 'barrier', name: 'Barrier', desc: 'Periodically shields itself.', shield: { pct: 0.25, cd: 12 } },
    { id: 'empowered', name: 'Empowered', desc: 'Empowers nearby allies.', buffAllies: 0.3 },
    { id: 'plaguebearer', name: 'Plaguebearer', desc: 'Its attacks Poison.', onHit: { st: 'poison', coef: 0.6, dur: 4 } },
    { id: 'chilling_wind', name: 'Chilling Wind', desc: 'Summons a wall of chilling wind.', pool: { element: 'cold', radius: 2.6, dur: 6, coef: 0.35, cd: 6, apply: { st: 'chill', pct: 0.5, dur: 1.5 } } },
    { id: 'thunderstruck', name: 'Thunderstruck', desc: 'Calls down lightning.', mortar: { element: 'lightning', radius: 1.8, coef: 1.8, cd: 3, delay: 0.8 } },
    { id: 'quickened', name: 'Quickened', desc: 'Moves and attacks faster.', speedMult: 1.4 },
    { id: 'juggernaut', name: 'Juggernaut', desc: 'Immune to Crowd Control.', unstoppable: true },
    { id: 'avenger', name: 'Avenger', desc: 'Enrages when allies die.', avenger: 0.15 }
  ];

  // Elite ranks
  DATA.ELITE_RANKS = {
    normal: { name: '', hp: 1, dmg: 1, xp: 1, color: null, affixes: 0, drops: 1 },
    champion: { name: 'Champion', hp: 2.2, dmg: 1.3, xp: 3, color: '#6f8cff', affixes: 1, drops: 2 },
    elite: { name: 'Elite', hp: 4.5, dmg: 1.6, xp: 7, color: '#ffe55c', affixes: 2, drops: 3 },
    superunique: { name: 'Unique', hp: 7, dmg: 1.9, xp: 14, color: '#ff8c1a', affixes: 3, drops: 4 },
    boss: { name: 'Boss', hp: 1, dmg: 1, xp: 40, color: '#b36cff', affixes: 0, drops: 8 }
  };

  // ---- Bosses: phases change at hp thresholds; abilities rotate.
  const BOSS = (id, name, o) => Object.assign({ id, name, r: 1.3, speed: 2.6, hp: 30, dmg: 2.0, color: '#b36cff', shape: 'boss', element: 'physical', resist: {}, abilities: [], phases: [], atkCd: 1.6, range: 1.8, xp: 40, family: 'boss', behavior: 'boss' }, o);
  DATA.BOSSES = [
    BOSS('xfal', 'X\'Fal, the Scarred Baron', { level: 12, color: '#c0583a', shape: 'brute', element: 'fire', hp: 25,
      abilities: [{ kind: 'aoe', at: 'target', radius: 2.6, delay: 0.9, coef: 2.0, element: 'fire', cd: 4 }, { kind: 'summon', id: 'fallen', count: 3, cd: 10, max: 6 }, { kind: 'charge', dist: 7, coef: 1.8, cd: 7, knock: true }],
      phases: [{ at: 0.5, add: [{ kind: 'nova', radius: 4, coef: 2.2, element: 'fire', cd: 6, telegraph: 1.0 }] }], lore: 'A Fallen Overseer who scarred himself for every soul he devoured.' }),
    BOSS('gaspar', 'Gaspar Stilbian', { level: 16, color: '#8a7a5a', shape: 'humanoid', hp: 24, speed: 3.4,
      abilities: [{ kind: 'proj', speed: 16, coef: 1.4, count: 3, spread: 0.3, cd: 2.5 }, { kind: 'summon', id: 'bandit', count: 3, cd: 9, max: 6 }, { kind: 'blink', dist: 6, cd: 6 }],
      phases: [{ at: 0.4, add: [{ kind: 'pool', radius: 2.5, dur: 6, coef: 0.4, element: 'fire', cd: 5 }] }], lore: 'Bandit king of the Fractured Peaks.' }),
    BOSS('ashava', 'Ashava, the Pestilent', { level: 25, r: 2.0, color: '#4a8a3a', shape: 'boss', element: 'poison', hp: 60, speed: 2.4,
      abilities: [{ kind: 'aoe', at: 'target', radius: 3.5, delay: 1.1, coef: 2.4, element: 'poison', cd: 4, apply: { st: 'poison', coef: 0.8, dur: 5 } }, { kind: 'cone', arc: 1.2, range: 7, coef: 2.6, element: 'poison', cd: 6, telegraph: 1.0 }, { kind: 'pool', radius: 3, dur: 8, coef: 0.6, element: 'poison', cd: 7 }],
      phases: [{ at: 0.6, add: [{ kind: 'summon', id: 'bloated_corpse', count: 3, cd: 12, max: 6 }] }, { at: 0.3, add: [{ kind: 'nova', radius: 5, coef: 3.0, element: 'poison', cd: 8, telegraph: 1.4 }] }], lore: 'A world boss whose breath withers the land.' }),
    BOSS('butcher', 'The Butcher', { level: 20, color: '#8a1a1a', shape: 'brute', hp: 40, speed: 4.2, dmg: 2.6, r: 1.2,
      abilities: [{ kind: 'charge', dist: 9, coef: 2.4, cd: 5, knock: true }, { kind: 'hook', range: 8, coef: 1.5, cd: 7 }, { kind: 'aoe', at: 'self', radius: 3, delay: 0.6, coef: 2.2, cd: 5 }],
      phases: [{ at: 0.5, speedMult: 1.25 }], lore: 'Fresh meat.', wander: true }),
    BOSS('varshan', 'Echo of Varshan', { level: 35, color: '#6a3a6a', shape: 'boss', element: 'shadow', hp: 70, r: 1.6,
      abilities: [{ kind: 'proj', speed: 11, coef: 1.6, count: 6, spread: 1.0, element: 'shadow', cd: 3 }, { kind: 'pool', radius: 2.5, dur: 6, coef: 0.6, element: 'shadow', cd: 5 }, { kind: 'summon', id: 'cultist', count: 2, cd: 10, max: 4 }],
      phases: [{ at: 0.5, add: [{ kind: 'nova', radius: 5, coef: 2.6, element: 'shadow', cd: 7, telegraph: 1.2 }] }], lore: 'The Malignant Heart, torn from its host.' }),
    BOSS('grigoire', 'Grigoire, the Galvanic Saint', { level: 40, color: '#ffe55c', shape: 'armored', element: 'lightning', hp: 90, r: 1.4,
      abilities: [{ kind: 'aoe', at: 'target', radius: 2.8, delay: 0.8, coef: 2.4, element: 'lightning', cd: 3 }, { kind: 'proj', speed: 14, coef: 1.8, element: 'lightning', count: 4, spread: 2.0, cd: 2.5 }, { kind: 'charge', dist: 8, coef: 2.6, cd: 7, knock: true }],
      phases: [{ at: 0.6, add: [{ kind: 'nova', radius: 4.5, coef: 2.8, element: 'lightning', cd: 6, telegraph: 1.0 }] }, { at: 0.3, add: [{ kind: 'summon', id: 'ancient_guardian', count: 1, cd: 20, max: 1 }] }], lore: 'A knight who sought sainthood through lightning.' }),
    BOSS('beast_in_ice', 'The Beast in the Ice', { level: 45, color: '#7fd6ff', shape: 'boss', element: 'cold', hp: 110, r: 1.8, speed: 2.2,
      abilities: [{ kind: 'aoe', at: 'target', radius: 3.2, delay: 1.0, coef: 2.6, element: 'cold', cd: 3.5, apply: { st: 'chill', pct: 0.5, dur: 3 } }, { kind: 'nova', radius: 4.5, coef: 2.4, element: 'cold', cd: 7, telegraph: 1.2, apply: { st: 'freeze', dur: 1.5 } }, { kind: 'pool', radius: 3, dur: 8, coef: 0.5, element: 'cold', cd: 6 }],
      phases: [{ at: 0.5, add: [{ kind: 'proj', speed: 12, coef: 1.8, element: 'cold', count: 8, spread: 3.1, cd: 4 }] }], lore: 'Sealed beneath the glacier for an age.' }),
    BOSS('lord_zir', 'Lord Zir', { level: 50, color: '#8a1a2a', shape: 'armored', element: 'physical', hp: 130, r: 1.3, speed: 3.6,
      abilities: [{ kind: 'proj', speed: 13, coef: 1.8, count: 5, spread: 0.6, cd: 3, apply: { st: 'bleed', coef: 0.6, dur: 4 } }, { kind: 'blink', dist: 7, cd: 5 }, { kind: 'summon', id: 'bloodseeker', count: 3, cd: 10, max: 6 }, { kind: 'lifesteal', pct: 0.3 }],
      phases: [{ at: 0.5, add: [{ kind: 'pool', radius: 3.5, dur: 8, coef: 0.7, element: 'physical', cd: 6 }] }], lore: 'The Dark Master of the vampires.' }),
    BOSS('duriel', 'Duriel, King of Maggots', { level: 55, color: '#9a8a4a', shape: 'boss', element: 'poison', hp: 170, r: 2.0, speed: 2.6, dmg: 2.4,
      abilities: [{ kind: 'aoe', at: 'target', radius: 3.6, delay: 1.0, coef: 2.8, element: 'poison', cd: 3.5 }, { kind: 'summon', id: 'maggot_swarm', count: 6, cd: 8, max: 12 }, { kind: 'charge', dist: 8, coef: 2.6, cd: 8, knock: true }, { kind: 'pool', radius: 3.2, dur: 8, coef: 0.7, element: 'poison', cd: 6 }],
      phases: [{ at: 0.5, add: [{ kind: 'burrow', cd: 12 }] }, { at: 0.25, add: [{ kind: 'nova', radius: 5.5, coef: 3.2, element: 'poison', cd: 8, telegraph: 1.4 }] }], lore: 'Lord of Pain, Lesser Evil.' }),
    BOSS('andariel', 'Andariel, Maiden of Anguish', { level: 58, color: '#d05080', shape: 'winged', element: 'poison', hp: 190, r: 1.6, speed: 3.2,
      abilities: [{ kind: 'proj', speed: 12, coef: 2.0, element: 'poison', count: 7, spread: 1.4, cd: 2.5 }, { kind: 'pool', radius: 3.0, dur: 10, coef: 0.8, element: 'poison', cd: 5 }, { kind: 'summon', id: 'succubus', count: 2, cd: 12, max: 4 }, { kind: 'aoe', at: 'target', radius: 3.0, delay: 0.9, coef: 2.8, element: 'fire', cd: 4 }],
      phases: [{ at: 0.5, add: [{ kind: 'nova', radius: 6, coef: 3.0, element: 'poison', cd: 7, telegraph: 1.3 }] }], lore: 'The Maiden of Anguish returns.' }),
    BOSS('lilith_echo', 'Echo of Lilith', { level: 60, color: '#b36cff', shape: 'winged', element: 'shadow', hp: 300, r: 1.7, speed: 3.4, dmg: 3.0,
      abilities: [{ kind: 'aoe', at: 'target', radius: 3.4, delay: 0.9, coef: 3.2, element: 'shadow', cd: 3 }, { kind: 'proj', speed: 14, coef: 2.4, element: 'shadow', count: 9, spread: 2.4, cd: 3.5 }, { kind: 'blink', dist: 8, cd: 6 }, { kind: 'cone', arc: 1.4, range: 8, coef: 3.4, element: 'shadow', cd: 6, telegraph: 1.0 }],
      phases: [{ at: 0.66, add: [{ kind: 'summon', id: 'tormentor', count: 2, cd: 14, max: 4 }] }, { at: 0.33, add: [{ kind: 'nova', radius: 7, coef: 4.0, element: 'shadow', cd: 8, telegraph: 1.6 }], speedMult: 1.2 }], lore: 'Daughter of Hatred, Mother of Sanctuary.' }),
    BOSS('harbinger', 'Harbinger of Hatred', { level: 60, color: '#1a3a2a', shape: 'boss', element: 'shadow', hp: 320, r: 1.9, speed: 2.8, dmg: 3.0,
      abilities: [{ kind: 'aoe', at: 'target', radius: 3.6, delay: 1.0, coef: 3.2, element: 'shadow', cd: 3 }, { kind: 'summon', id: 'mother_zealot', count: 3, cd: 10, max: 6 }, { kind: 'pool', radius: 3.6, dur: 9, coef: 0.9, element: 'shadow', cd: 5 }, { kind: 'charge', dist: 9, coef: 3.0, cd: 8, knock: true }],
      phases: [{ at: 0.5, add: [{ kind: 'nova', radius: 6.5, coef: 3.8, element: 'shadow', cd: 7, telegraph: 1.4 }] }], lore: 'Mephisto\'s herald in Nahantu.' })
  ];
  DATA.bossById = {}; DATA.BOSSES.forEach(b => { DATA.bossById[b.id] = b; });

  // Boss materials (summoning) & their drop sources
  DATA.BOSS_LOOT = {
    varshan: { uniques: ['black_river', 'blood_artisan', 'gohrs', 'tempest_roar', 'herald_of_zakarum', 'hand_of_blessed_light'] },
    grigoire: { uniques: ['deathless_visage', 'ramaladnis', 'vasilys', 'guardian_angel', 'ring_of_mendeln'] },
    beast_in_ice: { uniques: ['howl_from_below', 'ancients_oath', 'insatiable_fury', 'faiths_bastion', 'deathspeakers'] },
    lord_zir: { uniques: ['fields_of_crimson', 'mad_wolfs_glee', 'zakarums_judgement', 'battle_trance', 'hunters_zenith'] },
    duriel: { uniques: ['overkill', 'greatstaff_crone', 'lightwarden', 'rage_of_harrogath', 'waxing_gibbous'], mythics: ['harlequin_crest', 'doombringer', 'starless_skies'] },
    andariel: { uniques: ['black_river', 'tempest_roar', 'ramaladnis', 'herald_of_zakarum'], mythics: ['andariels_visage', 'grandfather', 'tyraels_might'] },
    lilith_echo: { mythics: ['harlequin_crest', 'doombringer', 'starless_skies', 'grandfather', 'andariels_visage', 'tyraels_might'] },
    harbinger: { mythics: ['harlequin_crest', 'tyraels_might', 'grandfather'] }
  };
})();
