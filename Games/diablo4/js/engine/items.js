/* Sanctuary — item engine: generation, loot, equip rules, crafting (global: Items) */
(function () {
  'use strict';
  const Items = {};
  const ARMOR = DATA.ARMOR_SLOTS, JEWELRY = ['amulet', 'ring'];

  Items.slotCategory = function (slot) {
    if (ARMOR.includes(slot)) return 'armor';
    if (slot === 'amulet' || slot === 'ring1' || slot === 'ring2' || slot === 'ring') return 'jewelry';
    if (slot === 'offhand') return 'offhand';
    return 'weapon';
  };
  // Which equipment slot(s) an item can go in for a class
  Items.equipSlotsFor = function (item, cls) {
    const c = DATA.classes[cls];
    if (item.slot === 'ring') return ['ring1', 'ring2'];
    if (item.slot === 'weapon' || item.slot === 'offhand') {
      const slots = [];
      c.weaponSlots.forEach(sl => { if (c.weaponTypes[sl].includes(item.type)) slots.push(sl); });
      return slots;
    }
    return [item.slot];
  };
  Items.canEquip = function (item, char) {
    if (item.cls && item.cls !== 'all' && item.cls !== char.cls) return false;
    if ((item.reqLevel || 1) > char.level) return false;
    return Items.equipSlotsFor(item, char.cls).length > 0;
  };

  // Pick an affix for a slot/class, excluding stats already present.
  function affixPool(slot, cls, exclude) {
    const cat = Items.slotCategory(slot);
    const normSlot = slot === 'ring1' || slot === 'ring2' ? 'ring1' : (['bludgeon', 'slash', 'dual1', 'dual2'].includes(slot) ? 'weapon' : slot);
    return DATA.AFFIX_POOL.filter(a => {
      if (a.cls && !a.cls.includes(cls)) return false;
      if (exclude.includes(a.stat)) return false;
      if (a.stat === 'dmg_holy' && cls !== 'paladin') return false;
      return a.slots.some(s => s === normSlot || (s === 'armor' && cat === 'armor') || (s === 'jewelry' && cat === 'jewelry') || (s === 'weapon' && cat === 'weapon') || (s === 'offhand' && cat === 'offhand') || (s === 'ring1' && normSlot === 'ring1'));
    });
  }
  function resolveRankStat(stat, cls) {
    const clusters = DATA.clusters[cls];
    if (stat === 'rank_cluster3') return 'rank_' + clusters[2];
    if (stat === 'rank_cluster4') return 'rank_' + clusters[3];
    if (stat === 'rank_cluster5') return 'rank_' + clusters[4];
    if (stat === 'rank_skill') { const actives = DATA.skillsFor(cls).filter(s => s.type === 'active' && s.cluster !== 'ultimate'); return 'rank_skill_' + U.pick(actives).id; }
    return stat;
  }
  function rollAffix(affix, power, cls, greater) {
    const scale = DATA.affixScale(affix, power);
    let t = greater ? U.rand(0.85, 1) : Math.random();
    let v = U.lerp(affix.lo, affix.hi, t) * scale;
    if (greater) v *= 1.5;
    if (affix.flat) v = Math.round(v); else v = U.round(v, 4);
    const stat = resolveRankStat(affix.stat, cls);
    return { stat, v, lo: affix.lo * scale, hi: affix.hi * scale * (greater ? 1.5 : 1), greater: !!greater, flat: !!affix.flat };
  }
  Items.affixName = function (a) {
    const def = DATA.STAT_DEFS[a.stat];
    if (a.stat.startsWith('rank_skill_')) { const s = DATA.skillById[a.stat.slice(11)]; return '+' + a.v + ' to ' + (s ? s.name : 'Skill'); }
    if (a.stat.startsWith('rank_')) { const d = DATA.STAT_DEFS[a.stat]; return '+' + a.v + ' ' + (d ? d.name : U.title(a.stat.slice(5)) + ' Skills'); }
    if (!def) return a.stat + ' ' + a.v;
    if (def.kind === 'pct') return U.fmtPct(a.v) + ' ' + def.name;
    return '+' + U.fmtNum(a.v) + ' ' + def.name;
  };

  // ---- Generation ---------------------------------------------------------
  // opts: { slot, type, rarity, power, level, cls, unique (id), aspect (id) }
  Items.generate = function (opts) {
    const cls = opts.cls;
    const level = opts.level || 1;
    let power = opts.power || Stats.itemPowerForLevel(level);
    power = Math.round(U.clamp(power * U.rand(0.9, 1.08), 1, 925));
    let rarity = opts.rarity || 'normal';
    let slot = opts.slot, type = opts.type;
    const c = DATA.classes[cls];
    // choose slot
    if (!slot) {
      const r = Math.random();
      if (r < 0.42) slot = U.pick(ARMOR); else if (r < 0.62) slot = U.pick(['amulet', 'ring', 'ring']); else if (r < 0.9) slot = 'weapon'; else slot = 'offhand';
      if (slot === 'offhand' && !c.weaponTypes.offhand) slot = 'weapon';
    }
    if (slot === 'ring1' || slot === 'ring2') slot = 'ring';
    const item = { id: U.uid('it'), slot, rarity, power, cls: 'all', reqLevel: Math.max(1, Math.min(60, Math.round(power / 10), Math.round(level))), affixes: [], inherent: [], gems: [], sockets: 0, upgrades: 0 };
    // unique override
    const uniq = opts.unique ? DATA.uniqueById[opts.unique] : null;
    if (uniq) { item.rarity = uniq.rarity; item.unique = uniq.id; item.name = uniq.name; item.slot = uniq.slot === 'ring1' ? 'ring' : uniq.slot; slot = item.slot; item.cls = uniq.cls; if (uniq.powerBonus) item.power += uniq.powerBonus; type = uniq.type || type; item.desc = uniq.desc; }
    // weapon / offhand type
    if (slot === 'weapon' || slot === 'offhand') {
      if (!type) {
        const types = slot === 'weapon' ? Object.keys(DATA.WEAPON_TYPES).filter(t => !DATA.WEAPON_TYPES[t].offhand && DATA.WEAPON_TYPES[t].cls.includes(cls)) : (c.weaponTypes.offhand || []);
        type = U.pick(types);
      }
      const wt = DATA.WEAPON_TYPES[type];
      item.type = type;
      if (!wt.offhand) {
        const base = DATA.weaponBaseDamage(item.power, type);
        item.dmgMin = Math.round(base * 0.8); item.dmgMax = Math.round(base * 1.2); item.dmgAvg = (item.dmgMin + item.dmgMax) / 2; item.aps = wt.aps;
        item.cls = item.cls === 'all' ? (wt.cls.length === 1 ? wt.cls[0] : 'all') : item.cls;
      } else {
        item.armor = DATA.armorBaseValue(item.power, 'offhand');
      }
      const inh = Object.assign({}, wt.inherent); const sc = inh.scale ? DATA.affixScale({ scale: 'regen' }, item.power) : 1;
      item.inherent.push({ stat: inh.stat, v: U.round(inh.v * sc * (inh.scale ? 1 : (0.6 + item.power / 2300)), 3) });
      if (wt.inherent2) item.inherent.push({ stat: wt.inherent2.stat, v: wt.inherent2.v });
      if (!item.cls || item.cls === 'all') item.cls = wt.cls.includes(cls) ? 'all' : wt.cls[0];
    } else if (ARMOR.includes(slot)) {
      item.armor = DATA.armorBaseValue(item.power, slot);
      if (slot === 'boots') item.inherent.push({ stat: 'evade_charges', v: 0 });
    } else {
      if (slot === 'amulet') item.inherent.push({ stat: 'res_all', v: U.round(0.05 + item.power / 9000, 3) });
      else item.inherent.push({ stat: U.pick(['res_fire', 'res_cold', 'res_light', 'res_poison', 'res_shadow']), v: U.round(0.1 + item.power / 6000, 3) });
    }
    item.inherent = item.inherent.filter(a => a.v > 0);
    // affixes
    const rdef = DATA.RARITY[item.rarity];
    const greaterChance = opts.greaterChance || (item.power >= 600 ? 0.12 : 0.03);
    if (uniq) {
      uniq.affixes.forEach(a => { const scale = DATA.affixScale({ stat: a.stat, flat: a.v >= 1, scale: a.v >= 1 ? (a.stat === 'life' ? 'life' : a.stat === 'armor' ? 'armor' : a.stat === 'life_on_hit' || a.stat === 'life_on_kill' ? 'regen' : (a.stat === 'max_resource' || a.stat.startsWith('rank') ? 'small' : 'core')) : undefined }, item.power); const flat = a.v >= 1; let v = a.v * scale * U.rand(0.85, 1.0); if (a.stat.startsWith('rank')) v = a.v; item.affixes.push({ stat: a.stat, v: flat ? Math.round(v) : U.round(v, 4), flat, lo: a.v * scale * 0.85, hi: a.v * scale }); });
    } else {
      const n = rdef.affixes;
      const used = item.inherent.map(a => a.stat);
      for (let i = 0; i < n; i++) {
        const pool = affixPool(slot === 'ring' ? 'ring1' : slot, cls, used);
        if (!pool.length) break;
        const af = U.pickWeighted(pool, a => a.w);
        used.push(af.stat);
        item.affixes.push(rollAffix(af, item.power, cls, U.chance(greaterChance)));
      }
      if (item.rarity === 'legendary') {
        const asp = opts.aspect ? DATA.aspectById[opts.aspect] : Items.randomAspectFor(cls, slot);
        if (asp) item.aspect = { id: asp.id, roll: Items.rollAspect(asp, item.power) };
      }
    }
    item.sockets = (item.rarity === 'normal' || item.rarity === 'magic') ? 0 : (ARMOR.includes(slot) || slot === 'weapon' || slot === 'offhand' || slot === 'amulet' || slot === 'ring') ? (U.chance(0.5) ? 1 : 0) : 0;
    if (slot === 'weapon' && item.type && DATA.WEAPON_TYPES[item.type].hands === 2) item.sockets = Math.min(2, item.sockets + (U.chance(0.4) ? 1 : 0));
    item.maxSockets = (slot === 'weapon' && item.type && DATA.WEAPON_TYPES[item.type].hands === 2) ? 2 : 1;
    if (!item.name) item.name = Items.makeName(item, cls);
    item.value = Items.sellValue(item);
    return item;
  };
  Items.rollAspect = function (asp, power) {
    const t = Math.random();
    let v = U.lerp(asp.lo, asp.hi, t);
    return asp.flat ? Math.round(v) : U.round(v, 4);
  };
  Items.randomAspectFor = function (cls, slot) {
    const sl = slot === 'ring' ? 'ring1' : slot;
    const pool = DATA.ASPECTS.filter(a => (a.cls === 'all' || a.cls === cls) && DATA.ASPECT_CAT_SLOTS[a.cat].includes(sl));
    return pool.length ? U.pick(pool) : null;
  };
  Items.makeName = function (item, cls) {
    let base;
    if (item.slot === 'weapon' || item.slot === 'offhand') base = DATA.WEAPON_TYPES[item.type].name;
    else base = U.pick(DATA.BASE_NAMES[item.slot] || ['Trinket']);
    if (item.rarity === 'normal') return base;
    if (item.rarity === 'magic') return U.pick(DATA.PREFIXES) + ' ' + base;
    if (item.rarity === 'rare') return U.pick(DATA.PREFIXES) + ' ' + base + ' of ' + U.pick(['Ruin', 'the Bear', 'Storms', 'Blood', 'the Wolf', 'Ashes', 'Light', 'Shadows', 'the Fallen', 'Thorns', 'Winter', 'the Ancients']);
    if (item.rarity === 'legendary') { const asp = item.aspect ? DATA.aspectById[item.aspect.id] : null; const an = asp ? asp.name.replace(/^Aspect of (the )?/i, '').replace(/'s Aspect$/i, '').replace(/ Aspect$/i, '') : U.pick(DATA.PREFIXES); return an + ' ' + base; }
    return base;
  };
  Items.sellValue = function (item) {
    const r = DATA.RARITY[item.rarity].order;
    return Math.round((5 + item.power * 0.6) * (1 + r * 0.8));
  };
  Items.salvageYield = function (item) {
    const y = { rawhide: 0, iron_chunk: 0, veiled_crystal: 0, abstruse_sigil: 0, coiling_ward: 0, baleful_fragment: 0, forgotten_soul: 0, crude_gem: 0 };
    const cat = Items.slotCategory(item.slot);
    const r = DATA.RARITY[item.rarity].order;
    if (cat === 'armor') y.rawhide += 2 + Math.floor(item.power / 150); else if (cat === 'weapon') y.iron_chunk += 2 + Math.floor(item.power / 150); else y.silver_ore = 1 + Math.floor(item.power / 250);
    if (r >= 1) y.veiled_crystal += r >= 2 ? 1 + Math.floor(item.power / 300) : 0;
    if (r >= 3) { if (cat === 'armor') y.coiling_ward += 1; else if (cat === 'weapon') y.baleful_fragment += 1; else y.abstruse_sigil += 1; }
    if (r >= 4) y.forgotten_soul += 1;
    if ((item.gems || []).some(Boolean)) y.crude_gem += 1;
    Object.keys(y).forEach(k => { if (!y[k]) delete y[k]; });
    return y;
  };

  // ---- Loot tables ----------------------------------------------------------
  // Roll drops for a killed enemy. Returns array of items / materials / gold.
  Items.rollDrops = function (char, enemyLevel, rank, diff, bossLoot) {
    const d = char.sctx ? char.sctx.d : { goldFind: 1, itemFind: 1 };
    const out = [];
    const rankDef = DATA.ELITE_RANKS[rank] || DATA.ELITE_RANKS.normal;
    const gold = Math.round((4 + enemyLevel * 2.2) * rankDef.drops * diff.gold * d.goldFind * U.rand(0.6, 1.4));
    if (rank !== 'normal' || U.chance(0.55)) out.push({ kind: 'gold', amount: gold });
    const itemChance = (rank === 'normal' ? 0.11 : rank === 'champion' ? 0.9 : 1.5) * d.itemFind;
    let n = Math.floor(itemChance) + (U.chance(itemChance % 1) ? 1 : 0);
    if (rank === 'boss') n = 3 + U.randInt(1, 3);
    const power = Math.max(diff.powerFloor, Stats.itemPowerForLevel(enemyLevel));
    for (let i = 0; i < n; i++) {
      const r = Math.random();
      const legChance = 0.045 * diff.legChance * (rank === 'normal' ? 1 : rank === 'champion' ? 2.5 : rank === 'elite' ? 4 : 8);
      const uniqChance = legChance * 0.12 * (enemyLevel >= 30 ? 1 : 0.2);
      const mythChance = diff.id.startsWith('t') ? uniqChance * 0.03 : 0;
      let rarity = 'normal';
      if (r < mythChance) rarity = 'mythic'; else if (r < uniqChance) rarity = 'unique'; else if (r < legChance) rarity = 'legendary'; else if (r < legChance + 0.25) rarity = 'rare'; else if (r < legChance + 0.6) rarity = 'magic';
      if (rank === 'boss' && i === 0 && rarity !== 'unique' && rarity !== 'mythic') rarity = 'legendary';
      if (rarity === 'unique' || rarity === 'mythic') {
        const pool = Items.uniquePool(char.cls, rarity, bossLoot);
        if (pool.length) { out.push({ kind: 'item', item: Items.generate({ cls: char.cls, level: enemyLevel, power, unique: U.pick(pool).id }) }); continue; }
        rarity = 'legendary';
      }
      out.push({ kind: 'item', item: Items.generate({ cls: char.cls, level: enemyLevel, power, rarity }) });
    }
    // materials
    if (U.chance(0.12 * rankDef.drops)) out.push({ kind: 'material', id: U.pick(['gallowvine', 'gallowvine', 'biteberry', 'howler_moss', 'reddamine', 'lifesbane']), amount: U.randInt(1, 3) });
    if (U.chance(0.06 * rankDef.drops)) out.push({ kind: 'material', id: 'crude_gem', amount: U.randInt(1, 2) });
    if (rank !== 'normal' && U.chance(0.5)) out.push({ kind: 'material', id: 'obols', amount: U.randInt(5, 15) * rankDef.drops });
    if (rank === 'boss') { out.push({ kind: 'material', id: 'forgotten_soul', amount: U.randInt(2, 5) }); out.push({ kind: 'material', id: 'obols', amount: U.randInt(60, 120) }); }
    if (U.chance(0.08 * rankDef.drops)) out.push({ kind: 'gem', gem: U.pick(Object.keys(DATA.GEMS)), tier: Items.gemTierForLevel(enemyLevel) });
    if (U.chance(0.05 * rankDef.drops)) out.push({ kind: 'potion' });
    return out;
  };
  Items.uniquePool = function (cls, rarity, bossLoot) {
    let pool = DATA.UNIQUES.filter(u => u.rarity === rarity && (u.cls === 'all' || u.cls === cls) && (!u.type || DATA.WEAPON_TYPES[u.type].cls.includes(cls)));
    if (bossLoot) { const ids = rarity === 'mythic' ? (bossLoot.mythics || []) : (bossLoot.uniques || []); const sub = pool.filter(u => ids.includes(u.id)); if (sub.length && U.chance(0.75)) pool = sub; }
    return pool;
  };
  Items.gemTierForLevel = function (level) {
    const tiers = DATA.GEM_TIERS.filter(t => t.level <= level && t.id !== 'grand');
    return tiers[tiers.length - 1].id;
  };
  Items.makeGem = function (gem, tier) {
    const g = DATA.GEMS[gem], t = DATA.GEM_TIERS.find(x => x.id === tier);
    return { id: U.uid('gem'), kind: 'gem', gem, tier, name: (t.name ? t.name + ' ' : '') + g.name, color: g.color, mult: t.mult };
  };
  Items.gemEffect = function (gemItem, slotCat) {
    const g = DATA.GEMS[gemItem.gem], t = DATA.GEM_TIERS.find(x => x.id === gemItem.tier);
    const e = slotCat === 'weapon' ? g.weapon : slotCat === 'armor' || slotCat === 'offhand' ? g.armor : g.jewelry;
    let v = e.v * t.mult;
    if (e.scale) v = Math.round(v * DATA.affixScale({ scale: e.scale }, 500));
    return { stat: e.stat, v: U.round(v, 4), gem: gemItem.gem, tier: gemItem.tier, name: gemItem.name };
  };

  // ---- Crafting ops -----------------------------------------------------------
  Items.upgradeCost = function (item) {
    const n = item.upgrades || 0; const r = DATA.RARITY[item.rarity].order;
    const cost = { gold: Math.round(200 * (n + 1) * (1 + item.power / 200) * (1 + r * 0.5)) };
    const cat = Items.slotCategory(item.slot);
    if (cat === 'armor') cost.rawhide = 5 * (n + 1); else if (cat === 'weapon' || cat === 'offhand') cost.iron_chunk = 5 * (n + 1); else cost.silver_ore = 3 * (n + 1);
    if (n >= 2) cost.veiled_crystal = n;
    if (n >= 4) { if (cat === 'armor') cost.coiling_ward = 1; else if (cat === 'weapon') cost.baleful_fragment = 1; else cost.abstruse_sigil = 1; }
    return cost;
  };
  Items.MAX_UPGRADES = 5;
  Items.applyUpgrade = function (item) {
    const oldPower = item.power;
    item.upgrades = (item.upgrades || 0) + 1;
    item.power += 25;
    const ratio = 1 + 25 / Math.max(50, oldPower);
    if (item.dmgMin) { item.dmgMin = Math.round(item.dmgMin * ratio); item.dmgMax = Math.round(item.dmgMax * ratio); item.dmgAvg = (item.dmgMin + item.dmgMax) / 2; }
    if (item.armor) item.armor = Math.round(item.armor * ratio);
    item.affixes.forEach(a => { a.v = a.flat ? Math.round(a.v * ratio) : U.round(a.v * (1 + 12 / 900), 4); a.hi = a.hi * ratio; a.lo = a.lo * ratio; if (a.stat.startsWith('rank')) a.v = Math.round(a.v); });
    item.value = Items.sellValue(item);
  };
  Items.enchantCost = function (item) { const n = item.enchants || 0; return { gold: Math.round(500 * (1 + n) * (1 + item.power / 150)), veiled_crystal: 2 + n, forgotten_soul: item.power >= 600 ? 1 : 0 }; };
  Items.enchant = function (item, index, cls) {
    const used = item.inherent.map(a => a.stat).concat(item.affixes.filter((a, i) => i !== index).map(a => a.stat));
    const slot = item.slot === 'ring' ? 'ring1' : item.slot;
    const pool = affixPool(slot, cls, used); if (!pool.length) return null;
    const old = item.affixes[index];
    const a = rollAffix(U.pickWeighted(pool, x => x.w), item.power, cls, U.chance(0.05));
    item.affixes[index] = a; item.enchants = (item.enchants || 0) + 1;
    return { old, next: a };
  };
  Items.imprintCost = function (item) { return { gold: Math.round(1000 * (1 + item.power / 100)), veiled_crystal: 5, abstruse_sigil: Items.slotCategory(item.slot) === 'jewelry' ? 1 : 0, coiling_ward: Items.slotCategory(item.slot) === 'armor' ? 1 : 0, baleful_fragment: Items.slotCategory(item.slot) === 'weapon' || Items.slotCategory(item.slot) === 'offhand' ? 1 : 0 }; };
  Items.imprint = function (item, aspectId, roll) {
    if (item.rarity === 'unique' || item.rarity === 'mythic') return false;
    const asp = DATA.aspectById[aspectId]; if (!asp) return false;
    const slot = item.slot === 'ring' ? 'ring1' : item.slot;
    if (!DATA.ASPECT_CAT_SLOTS[asp.cat].includes(slot) && !(slot === 'weapon' && DATA.ASPECT_CAT_SLOTS[asp.cat].includes('bludgeon'))) return false;
    item.aspect = { id: aspectId, roll: roll !== undefined ? roll : asp.lo };
    if (item.rarity === 'rare') { item.rarity = 'legendary'; item.name = Items.makeName(item, 'all'); }
    else item.name = Items.makeName(item, 'all');
    item.value = Items.sellValue(item);
    return true;
  };
  Items.socketCost = function (item) { return { gold: Math.round(400 * (1 + item.power / 150)), crude_gem: 3 + (item.sockets || 0) * 2 }; };
  Items.addSocket = function (item) { if ((item.sockets || 0) >= item.maxSockets) return false; item.sockets = (item.sockets || 0) + 1; return true; };
  Items.socketGem = function (item, idx, gemItem) {
    if (idx >= (item.sockets || 0)) return null;
    const prev = item.gems[idx] ? Items.makeGem(item.gems[idx].gem, item.gems[idx].tier) : null;
    item.gems[idx] = Items.gemEffect(gemItem, Items.slotCategory(item.slot));
    return prev;
  };
  Items.unsocketCost = () => ({ gold: 300 });
  Items.gemUpgradeCost = function (tierIdx) { return { gold: 500 * (tierIdx + 1) * (tierIdx + 1), crude_gem: 0 }; };
  Items.gambleCost = function (slot) { return slot === 'weapon' ? 75 : slot === 'offhand' ? 50 : (slot === 'amulet' ? 60 : slot === 'ring' ? 55 : 40); };
  Items.gamble = function (char, slot) {
    const level = char.level; const diff = DATA.diffById[char.difficulty] || DATA.DIFFICULTIES[0];
    const power = Math.max(diff.powerFloor, Stats.itemPowerForLevel(level));
    const r = Math.random();
    let rarity = r < 0.008 ? 'unique' : r < 0.11 ? 'legendary' : r < 0.6 ? 'rare' : 'magic';
    if (rarity === 'unique') { const pool = Items.uniquePool(char.cls, 'unique', null).filter(u => (u.slot === 'ring1' ? 'ring' : u.slot) === slot); if (pool.length) return Items.generate({ cls: char.cls, level, power, unique: U.pick(pool).id }); rarity = 'legendary'; }
    return Items.generate({ cls: char.cls, level, power, rarity, slot });
  };

  // Comparison helper: rough item score for a character's build (sum of weighted affixes)
  Items.score = function (item, char) {
    let s = 0;
    const mainStat = DATA.classes[char.cls].mainStat;
    const weight = (stat) => { if (stat === mainStat) return 0.4; if (stat === 'life') return 0.04; if (stat === 'armor') return 0.03; if (stat.startsWith('rank')) return 25; if (DATA.STAT_DEFS[stat] && DATA.STAT_DEFS[stat].kind === 'pct') return 200; return 0.2; };
    (item.affixes || []).forEach(a => { s += a.v * weight(a.stat); });
    (item.inherent || []).forEach(a => { s += a.v * weight(a.stat) * 0.5; });
    if (item.dmgAvg) s += item.dmgAvg * item.aps * 2; if (item.armor) s += item.armor * 0.1;
    if (item.aspect) s += 40; if (item.unique) s += 60;
    return s;
  };

  // Render an item's tooltip as HTML
  Items.tooltipHtml = function (item, char, compareWith) {
    const rd = DATA.RARITY[item.rarity];
    const lines = [];
    lines.push(`<div class="tt-name" style="color:${rd.color}">${U.esc(item.name)}</div>`);
    const typeName = item.type ? DATA.WEAPON_TYPES[item.type].name : DATA.SLOT_NAMES[item.slot] || U.title(item.slot);
    lines.push(`<div class="tt-sub">${rd.name} ${U.esc(typeName)} · Item Power ${item.power}${item.upgrades ? ' (+' + item.upgrades + ')' : ''}</div>`);
    if (item.dmgMin !== undefined) lines.push(`<div class="tt-big">${U.fmtNum(item.dmgAvg * item.aps)} Damage Per Second<br><span class="tt-dim">[${item.dmgMin}-${item.dmgMax}] Damage per Hit · ${item.aps.toFixed(2)} Attacks per Second</span></div>`);
    if (item.armor !== undefined) lines.push(`<div class="tt-big">${item.armor} Armor</div>`);
    (item.inherent || []).forEach(a => lines.push(`<div class="tt-inh">${U.esc(Items.affixName(a))}</div>`));
    if (item.inherent && item.inherent.length) lines.push('<hr>');
    (item.affixes || []).forEach(a => lines.push(`<div class="tt-aff${a.greater ? ' greater' : ''}">${a.greater ? '★ ' : '◆ '}${U.esc(Items.affixName(a))}${a.lo !== undefined && !a.stat.startsWith('rank') ? ` <span class="tt-dim">[${a.flat ? Math.round(a.lo) + '-' + Math.round(a.hi) : U.fmtPctPlain(a.lo) + '-' + U.fmtPctPlain(a.hi)}]</span>` : ''}</div>`));
    (item.tempers || []).forEach(a => lines.push(`<div class="tt-temper">⚒ ${U.esc(Items.affixName(a))}</div>`));
    if (item.aspect) { const asp = DATA.aspectById[item.aspect.id]; if (asp) lines.push(`<div class="tt-aspect"><b>${U.esc(asp.name)}</b><br>${U.esc(Items.aspectDesc(asp, item.aspect.roll))}</div>`); }
    if (item.unique) { const u = DATA.uniqueById[item.unique]; if (u) lines.push(`<div class="tt-aspect unique"><b>Unique Power</b><br>${U.esc(u.desc)}</div>`); }
    for (let i = 0; i < (item.sockets || 0); i++) { const g = item.gems[i]; lines.push(g ? `<div class="tt-gem" style="color:${DATA.GEMS[g.gem].color}">◉ ${U.esc(g.name)}: ${U.esc(Items.affixName({ stat: g.stat, v: g.v }))}</div>` : '<div class="tt-gem empty">◯ Empty Socket</div>'); }
    lines.push(`<div class="tt-foot">Requires Level ${item.reqLevel}${item.cls && item.cls !== 'all' ? ' · ' + DATA.classes[item.cls].name : ''} · Sells for ${item.value} gold</div>`);
    if (char && !Items.canEquip(item, char)) lines.push('<div class="tt-warn">Cannot equip</div>');
    return lines.join('');
  };
  Items.aspectDesc = function (asp, roll) {
    const v = asp.flat ? Math.round(roll) : U.round(roll * 100, 1);
    return asp.desc.replace(/\{v\}/g, v);
  };
  Items.aspectRange = (asp) => asp.flat ? `[${asp.lo}-${asp.hi}]` : `[${U.round(asp.lo * 100, 1)}-${U.round(asp.hi * 100, 1)}%]`;

  window.Items = Items;
})();
