/* Sanctuary — stats engine: aggregates every modifier source into a StatContext used by combat & UI (global: Stats) */
(function () {
  'use strict';
  const Stats = {};
  const CORE = ['str', 'int', 'will', 'dex'];

  Stats.baseLife = (level) => 40 + 12 * level + 0.3 * level * level;
  Stats.xpToNext = (level) => Math.round(90 * Math.pow(level, 1.9) + 60 * level);
  Stats.paragonXpToNext = (plevel) => Math.round(40000 + 2500 * plevel + 120 * plevel * plevel);
  Stats.enemyBaseHp = (level) => 10 + 4 * Math.pow(level, 1.55);
  Stats.enemyBaseDmg = (level) => 3 + 1.6 * Math.pow(level, 1.15);
  Stats.enemyBaseArmorDR = (attackerLevel, enemyLevel) => 0; // enemies have resistances instead of armor
  Stats.armorDR = (armor, enemyLevel) => U.clamp(armor / (armor + 60 + 30 * enemyLevel), 0, 0.85);
  Stats.itemPowerForLevel = (level) => Math.round(Math.min(925, level < 60 ? 10 + level * 10 : 600 + (level - 60) * 10));

  // ---------- Mod scaling helpers ----------
  // Multiply the numeric payload of a mod by factor f (used for passive ranks and aspect rolls).
  function scaleMod(mod, f) {
    const m = U.deepClone(mod);
    const scaleDo = (d) => {
      if (!d) return;
      for (const k of ['fortify', 'heal', 'amt', 'cdr_skill', 'cdr_ult', 'cdr_all', 'nova', 'bolt', 'corpse', 'orb', 'berserk', 'gainPct']) if (typeof d[k] === 'number' && k !== 'corpse' && k !== 'orb') d[k] *= f;
      if (d.buff && d.buff.mods) d.buff.mods.forEach(x => { if (typeof x.add === 'number') x.add *= f; });
      if (d.applyScaled && typeof d.applyScaled.pct === 'number') d.applyScaled.pct *= f;
      if (d.regen && typeof d.regen.amt === 'number') d.regen.amt *= f;
      if (d.hot && typeof d.hot.amt === 'number') d.hot.amt *= f;
    };
    if (typeof m.add === 'number') m.add *= f;
    if (m.flag !== undefined && typeof m.v === 'number') m.v *= f;
    if (m.on) { if (typeof m.chance === 'number') m.chance *= f; if (m.scaleDur && m.do && m.do.apply) m.do.apply.dur *= f; scaleDo(m.do); }
    if (m.minionStat && typeof m.add === 'number') { /* already scaled */ }
    return m;
  }
  Stats.scaleMod = scaleMod;

  // Resolve aspect mods for a given roll value.
  Stats.resolveAspectMods = function (aspect, roll) {
    const opt = aspect;
    const mods = U.deepClone(aspect.mods);
    const walk = (o) => {
      if (!o || typeof o !== 'object') return;
      if (Array.isArray(o)) { o.forEach(walk); return; }
      if (typeof o.v === 'number') {
        if (o.stat !== undefined || o.minionStat !== undefined) { o.add = roll * o.v; delete o.v; }
        else if (o.flag !== undefined) { o.v = roll * o.v; }
        else if (o.p !== undefined) { if (o.addTo !== undefined) { o.add = roll; delete o.addTo; } else o.add = roll * o.v; delete o.v; }
        else if (o.gain !== undefined) { o.amt = roll * o.v; delete o.v; }
        else if (o.cdr_skill !== undefined) { o.cdr_skill = roll; delete o.v; }
      }
      Object.keys(o).forEach(k => { if (typeof o[k] === 'object') walk(o[k]); });
    };
    walk(mods);
    mods.forEach(m => {
      if (opt.chanceV && m.on) m.chance = roll;
      if (opt.groundV && m.do && m.do.ground) m.do.ground.coefTotal = roll;
      if (opt.groundV && m.p === 'ground' && m.set) m.set.coefTotal = roll;
      if (opt.boltV && m.do && m.do.bolt !== undefined) m.do.bolt = roll;
      if (opt.novaV && m.do && m.do.nova !== undefined) m.do.nova = roll;
      if (opt.gainPctV && m.do && m.do.gainPct !== undefined) m.do.gainPct = roll;
      if (opt.applyScaledV && m.do && m.do.applyScaled) m.do.applyScaled.pct = roll;
      if (opt.applyPctV && m.do && m.do.apply) m.do.apply.pct = roll;
      if (opt.durIsV && m.do && m.do.buff) m.do.buff.dur = roll;
    });
    return mods;
  };

  // ---------- Context construction ----------
  function newCtx(char) {
    return {
      char, cls: DATA.classes[char.cls], level: char.level,
      flat: {}, cond: [], triggers: [], flags: {}, skillMods: {}, minionMods: {}, minionCount: {},
      ranks: {}, sources: {}
    };
  }
  function addFlat(ctx, stat, v, src) {
    if (stat === 'all_stats') { CORE.forEach(s => addFlat(ctx, s, v, src)); return; }
    ctx.flat[stat] = (ctx.flat[stat] || 0) + v;
    if (src) { (ctx.sources[stat] = ctx.sources[stat] || []).push([src, v]); }
  }
  function applyMod(ctx, mod, src, skillScope) {
    if (!mod) return;
    if (mod.skill) { const m = Object.assign({}, mod); delete m.skill; (ctx.skillMods[mod.skill] = ctx.skillMods[mod.skill] || []).push(m); return; }
    if (mod.minionStat) { const mm = ctx.minionMods[mod.minionStat] = ctx.minionMods[mod.minionStat] || { dmg: 0, life: 0 }; mm[mod.stat] = (mm[mod.stat] || 0) + (mod.add || 0); return; }
    if (mod.minion) { ctx.minionCount[mod.minion] = (ctx.minionCount[mod.minion] || 0) + (mod.count || 0); return; }
    if (mod.p !== undefined || mod.apply !== undefined) { if (skillScope) (ctx.skillMods[skillScope] = ctx.skillMods[skillScope] || []).push(mod); return; }
    if (mod.on) { const t = Object.assign({}, mod); if (skillScope) t.scope = skillScope; t.src = src; ctx.triggers.push(t); return; }
    if (mod.flag !== undefined) { const v = mod.v === undefined ? 1 : mod.v; ctx.flags[mod.flag] = (ctx.flags[mod.flag] || 0) + v; return; }
    if (mod.stat) {
      let v = mod.add || 0;
      if (mod.scaleLevel) v *= (0.5 + ctx.level / 10);
      if (mod.when) ctx.cond.push({ stat: mod.stat, add: v, when: mod.when, src });
      else addFlat(ctx, mod.stat, v, src);
    }
  }
  Stats.applyMod = applyMod;

  // Item contribution
  function applyItem(ctx, item, slot) {
    if (!item) return;
    const src = item.name;
    if (item.armor) addFlat(ctx, 'armor', item.armor, src);
    (item.inherent || []).forEach(a => addFlat(ctx, a.stat, a.v, src));
    (item.affixes || []).forEach(a => addFlat(ctx, a.stat, a.v, src));
    (item.tempers || []).forEach(a => addFlat(ctx, a.stat, a.v, src));
    (item.gems || []).forEach(g => { if (g) addFlat(ctx, g.stat, g.v, src + ' (gem)'); });
    if (item.aspect) { const def = DATA.aspectById[item.aspect.id]; if (def) Stats.resolveAspectMods(def, item.aspect.roll).forEach(m => applyMod(ctx, m, def.name)); }
    if (item.unique) { const def = DATA.uniqueById[item.unique]; if (def) def.power.forEach(m => applyMod(ctx, m, def.name)); }
  }

  // Skill ranks (allocated + item bonuses)
  function computeRanks(ctx) {
    const char = ctx.char, alloc = char.skills.alloc || {};
    const clusters = DATA.clusters[char.cls];
    DATA.skillsFor(char.cls).forEach(s => {
      const base = alloc[s.id] || 0;
      if (base <= 0) { ctx.ranks[s.id] = 0; return; }
      let bonus = ctx.flat.rank_all || 0;
      if (s.type === 'active') {
        bonus += ctx.flat['rank_' + s.cluster] || 0;
        bonus += ctx.flat['rank_skill_' + s.id] || 0;
        s.tags.forEach(t => { bonus += ctx.flat['rank_tag_' + t] || 0; });
      }
      ctx.ranks[s.id] = Math.min(s.max + 10, base + bonus);
    });
  }

  // Skill passives & key passives & upgrade-granted global mods
  function applySkills(ctx) {
    const char = ctx.char;
    DATA.skillsFor(char.cls).forEach(s => {
      const r = ctx.ranks[s.id] || 0; if (r <= 0) return;
      if (s.type === 'passive' || s.type === 'key') {
        const f = s.vals ? s.vals[Math.min(r, s.vals.length) - 1] / s.vals[0] : r;
        (s.mods || []).forEach(m => applyMod(ctx, scaleMod(m, f), s.name));
      } else {
        const up = (char.skills.upgrades || {})[s.id] || {};
        const list = [];
        if (up.e && s.up && s.up.e) list.push(...s.up.e.mods);
        if (up.v && s.up && s.up[up.v]) list.push(...s.up[up.v].mods);
        list.forEach(m => applyMod(ctx, m, s.name, s.id));
      }
    });
  }

  function applyMechanics(ctx) {
    const char = ctx.char, mech = char.mechanics || {};
    if (char.cls === 'necromancer') {
      const bod = mech.bookOfDead || {};
      Object.keys(DATA.bookOfDead).forEach(k => {
        const sel = bod[k]; if (!sel) return;
        const opt = DATA.bookOfDead[k].options[sel.opt]; if (!opt) return;
        let mult = 1;
        if (opt.sacrifice && ctx.flags.memento_mori && bod.skeletal_warriors && bod.skeletal_warriors.opt === 'sacrifice' && bod.skeletal_mages && bod.skeletal_mages.opt === 'sacrifice') mult = 1 + ctx.flags.memento_mori;
        opt.mods.forEach(m => applyMod(ctx, mult === 1 ? m : scaleMod(m, mult), 'Book of the Dead'));
        if (sel.upgraded && opt.upgrade) opt.upgrade.mods.forEach(m => applyMod(ctx, m, 'Book of the Dead'));
      });
    }
    if (char.cls === 'barbarian') {
      const tech = mech.technique;
      if (tech && DATA.arsenal[tech]) DATA.arsenal[tech].technique.forEach(m => applyMod(ctx, m, 'Technique'));
      // expertise from equipped weapons (rank 1..10 by use)
      const exp = mech.expertise || {};
      const seen = {};
      ['bludgeon', 'slash', 'dual1', 'dual2'].forEach(sl => { const it = char.equipment[sl]; if (it && it.type && !seen[it.type] && DATA.arsenal[it.type]) { seen[it.type] = 1; const rk = Math.min(10, Math.floor((exp[it.type] || 0) / 100) + 1); DATA.arsenal[it.type].mods.forEach(m => applyMod(ctx, scaleMod(m, rk / 10), 'Expertise')); } });
    }
    if (char.cls === 'druid') {
      const boons = mech.boons || {};
      Object.keys(DATA.spiritBoons).forEach(sp => {
        const sel = boons[sp]; if (!sel) return;
        const list = Array.isArray(sel) ? sel : [sel];
        list.forEach(id => { const b = DATA.spiritBoons[sp].boons[id]; if (b) b.mods.forEach(m => applyMod(ctx, m, 'Spirit Boon')); });
      });
    }
    // Paladin aura applied at combat time (needs active toggle), but its stat mods count as passive while selected
    if (char.cls === 'paladin' && mech.aura && (ctx.ranks[mech.aura] || 0) > 0) {
      const s = DATA.skillById[mech.aura];
      const res = Stats.resolveSkill(ctx, s);
      const strength = 1 + (ctx.flags.aura_mastery || 0);
      (res.eff.mods || []).forEach(m => applyMod(ctx, scaleMod(m, strength * (1 + 0.1 * (res.rank - 1))), 'Aura'));
      ctx.flags.self_aura = 1;
    }
  }

  function applyParagon(ctx) {
    const par = ctx.char.paragon; if (!par || !par.boards) return;
    par.boards.forEach(b => {
      const board = Paragon.getBoard(ctx.char, b);
      if (!board) return;
      Object.keys(b.nodes || {}).forEach(key => {
        const node = board.nodes[key]; if (!node) return;
        (node.mods || []).forEach(m => applyMod(ctx, m, 'Paragon: ' + (node.name || node.kind)));
      });
      if (b.glyph && b.glyph.id) {
        const g = Paragon.glyphDef(ctx.char.cls, b.glyph.id);
        if (g) {
          const rank = b.glyph.rank || 1;
          const inRadius = Paragon.statInRadius(ctx.char, b, g.req);
          applyMod(ctx, { stat: g.stat, add: g.per * rank }, 'Glyph: ' + g.name);
          if (inRadius >= 40) g.bonus.forEach(m => applyMod(ctx, m, 'Glyph bonus: ' + g.name));
        }
      }
    });
  }

  Stats.build = function (char) {
    const ctx = newCtx(char);
    const cls = ctx.cls;
    // core stats from class/level
    CORE.forEach(s => addFlat(ctx, s, cls.base[s] + cls.perLevel[s] * (char.level - 1), 'Class'));
    // paragon flat levels: +? nothing
    Object.keys(char.equipment || {}).forEach(slot => applyItem(ctx, char.equipment[slot], slot));
    computeRanks(ctx);
    applySkills(ctx);
    applyParagon(ctx);
    applyMechanics(ctx);
    // elixir
    if (char.elixir && char.elixir.id && char.elixir.remaining > 0) { const e = DATA.elixirById[char.elixir.id]; if (e) e.mods.forEach(m => applyMod(ctx, m, e.name)); }
    // mount armor mods
    if (char.mount && char.mount.armor) { const ma = DATA.MOUNT_ARMOR.find(x => x.id === char.mount.armor); if (ma && ma.mods) ma.mods.forEach(m => applyMod(ctx, m, 'Mount Armor')); }
    // derived
    Stats.derive(ctx);
    // resolve equipped skills
    ctx.skills = {};
    (char.skills.bar || []).forEach(id => { if (id && DATA.skillById[id]) ctx.skills[id] = Stats.resolveSkill(ctx, DATA.skillById[id]); });
    if (char.cls === 'necromancer' && !ctx.skills.corpse_explosion && (ctx.ranks.corpse_explosion || 0) > 0) ctx.skills.corpse_explosion = Stats.resolveSkill(ctx, DATA.skillById.corpse_explosion);
    return ctx;
  };

  Stats.derive = function (ctx) {
    const f = ctx.flat, cls = ctx.cls, lvl = ctx.level;
    const g = (k) => f[k] || 0;
    const d = {};
    d.str = g('str'); d.int = g('int'); d.will = g('will'); d.dex = g('dex');
    d.mainStat = g(cls.mainStat);
    d.mainStatBonus = d.mainStat * 0.001;
    d.maxLife = Math.round((Stats.baseLife(lvl) + g('life')) * (1 + g('life_pct')));
    d.armor = Math.round((g('armor') + d.str) * (1 + g('armor_pct')));
    const baseRes = d.int * 0.0005;
    const maxRes = 0.7 + g('max_res');
    d.res = {};
    ['fire', 'cold', 'lightning', 'poison', 'shadow'].forEach(el => { d.res[el] = Math.min(maxRes, baseRes + g('res_all') + g(DATA.ELEMENT_RES_STAT[el])); });
    d.res.holy = d.res.shadow; d.res.physical = 0;
    d.maxRes = maxRes;
    d.dodge = Math.min(0.6, g('dodge') + d.dex * 0.0002);
    d.critChance = 0.05 + g('crit_chance') + d.dex * 0.0002;
    d.critDmg = 0.5 + g('crit_dmg');
    d.vulnDmg = 0.2 + g('vuln_dmg');
    d.overpowerChance = 0.03 + g('overpower_chance');
    d.overpowerDmg = 0.5 + g('overpower_dmg') + d.will * 0.001;
    d.luckyHit = g('lucky_hit');
    d.attackSpeed = 1 + g('attack_speed');
    d.cdr = Math.min(0.75, g('cdr'));
    d.resourceGen = 1 + g('resource_gen') + d.will * 0.001;
    d.resourceCostRed = Math.min(0.75, g('resource_cost_red'));
    d.maxResource = cls.resource.max + g('max_resource');
    d.moveSpeed = 1 + Math.min(1.0, g('move_speed'));
    d.healing = 1 + g('healing') + d.will * 0.001;
    d.lifeRegen = g('life_regen') + lvl * 0.15;
    d.lifeOnHit = g('life_on_hit'); d.lifeOnKill = g('life_on_kill');
    d.thorns = Math.round((g('thorns') + (ctx.flags.thorns_from_armor || 0) * d.armor + (ctx.flags.thorns_from_life || 0) * d.maxLife) * (1 + g('thorns_pct')));
    d.blockChance = Math.min(0.75, g('block_chance')); d.blockRed = Math.min(0.9, 0.2 + g('block_red'));
    d.dr = Math.min(0.9, g('dr'));
    d.fortifyGen = 1 + g('fortify_gen'); d.barrierGen = 1 + g('barrier_gen');
    d.ccReduction = Math.min(0.8, g('cc_reduction')); d.ccDuration = 1 + g('cc_duration');
    const pt = DATA.POTION_TIERS.slice().reverse().find(t => t.level <= (ctx.char.potion && ctx.char.potion.tier || 1)) || DATA.POTION_TIERS[0];
    d.potionHeal = pt.heal * (1 + g('potion_heal')); d.potionCharges = 4 + g('potion_charges');
    d.evadeCharges = 1 + g('evade_charges'); d.evadeCd = 5 * Math.max(0.3, 1 - g('evade_cdr'));
    d.xpBonus = 1 + g('xp_bonus'); d.goldFind = 1 + g('gold_find'); d.itemFind = 1 + g('item_find');
    d.minionDmg = g('dmg_summon'); d.minionLife = g('minion_life'); d.minionAttackSpeed = 1 + g('minion_attack_speed'); d.minionDr = Math.min(0.9, g('minion_dr'));
    d.shoutDuration = 1 + g('shout_duration'); d.dotDuration = 1 + g('dot_duration');
    d.mountSpeed = 1 + g('mount_speed'); d.mountSpur = g('mount_spur');
    d.pickupRadius = 1 + g('pickup_radius');
    ctx.d = d;
    return d;
  };

  // Weapon info for a skill: which weapon(s) it swings with.
  Stats.weaponFor = function (char, skill) {
    const eq = char.equipment;
    if (char.cls === 'barbarian') {
      const w = skill && skill.weapon;
      let slots;
      if (w === 'bludgeon') slots = ['bludgeon']; else if (w === 'slash') slots = ['slash']; else if (w === 'dual') slots = ['dual1', 'dual2'];
      else slots = ['bludgeon', 'slash', 'dual1', 'dual2'];
      let items = slots.map(s => eq[s]).filter(Boolean);
      if (!items.length) items = ['bludgeon', 'slash', 'dual1', 'dual2'].map(s => eq[s]).filter(Boolean);
      if (!items.length) return { avg: 2, aps: 1, slot: 'any', type: null, twoHanded: false, dual: false, items: [] };
      if (w === 'any' || !w) { items = [items.reduce((a, b) => (a.dmgAvg * a.aps > b.dmgAvg * b.aps ? a : b))]; }
      const avg = items.reduce((s, it) => s + it.dmgAvg, 0) / items.length;
      const aps = items.reduce((s, it) => s + it.aps, 0) / items.length;
      const type = items[0].type;
      return { avg, aps, slot: w || 'any', type, twoHanded: DATA.WEAPON_TYPES[type].hands === 2, dual: items.length === 2 || slots[0] === 'dual1', items };
    }
    const it = eq.weapon;
    if (!it) return { avg: 2, aps: 1, slot: 'weapon', type: null, twoHanded: false, dual: false, items: [] };
    return { avg: it.dmgAvg, aps: it.aps, slot: 'weapon', type: it.type, twoHanded: DATA.WEAPON_TYPES[it.type].hands === 2, dual: false, items: [it] };
  };

  // Resolve an active skill into concrete parameters given the context (skill mods from upgrades/aspects/uniques).
  Stats.resolveSkill = function (ctx, skill) {
    const char = ctx.char;
    const rank = ctx.ranks[skill.id] || 0;
    const eff = U.deepClone(skill.effect || {});
    eff.mods = eff.mods ? eff.mods.slice() : [];
    const res = { id: skill.id, def: skill, rank, eff, element: skill.element, tags: skill.tags.slice(), applies: (eff.apply ? eff.apply.map(a => Object.assign({}, a)) : []), triggers: [], dmgMult: 0, dmgMultCond: [], critBonus: 0, critBonusCond: [], critDmgBonus: 0,
      cost: skill.cost || 0, gen: skill.gen || 0, cd: skill.cd || 0, lucky: skill.lucky || 0, coef: (skill.dmg || 0) * (1 + 0.1 * Math.max(0, rank - 1)), flags: {} };
    const mods = ctx.skillMods[skill.id] || [];
    mods.forEach(m => {
      if (m.p !== undefined) {
        const p = m.p;
        if (p === 'dmgMult') { if (m.when) res.dmgMultCond.push({ add: m.add || 0, when: m.when }); else res.dmgMult += (m.add || 0); return; }
        if (p === 'critBonus') { if (m.when) res.critBonusCond.push({ add: m.add || 0, when: m.when }); else res.critBonus += (m.add || 0); return; }
        if (p === 'critDmgBonus') { res.critDmgBonus += (m.add || 0); return; }
        if (p === 'cost' || p === 'cd' || p === 'gen') { if (m.set !== undefined) res[p] = m.set; if (m.add !== undefined) res[p] = Math.max(0, res[p] + m.add); if (m.mul !== undefined) res[p] *= m.mul; return; }
        if (p === 'element') { res.element = m.set; return; }
        if (p === 'tagAdd') { if (!res.tags.includes(m.set)) res.tags.push(m.set); return; }
        if (m.push !== undefined) { if (!Array.isArray(eff[p])) eff[p] = eff[p] ? [eff[p]] : []; eff[p].push(m.push); return; }
        if (m.set !== undefined) { eff[p] = m.set; return; }
        if (m.add !== undefined) { eff[p] = (eff[p] || 0) + m.add; return; }
        if (m.mul !== undefined) { eff[p] = (eff[p] === undefined ? 1 : eff[p]) * m.mul; return; }
        return;
      }
      if (m.apply !== undefined) { const a = Object.assign({}, m.apply); if (m.chance !== undefined) a.chance = m.chance; if (m.when) a.when = m.when; if (m.stackMax) a.stackMax = m.stackMax; res.applies.push(a); return; }
      if (m.on) { res.triggers.push(m); return; }
      if (m.flag !== undefined) { res.flags[m.flag] = m.v === undefined ? 1 : m.v; return; }
    });
    // key-passive-driven cost changes
    if (res.tags.includes('core') && ctx.flags.core_cost_up) res.cost *= (1 + ctx.flags.core_cost_up);
    const dd = ctx.d || { resourceCostRed: 0, cdr: 0, shoutDuration: 1 };
    if (res.tags.includes('core') && skill.cost) res.cost *= (1 - dd.resourceCostRed);
    if (res.cd) res.cd *= (1 - dd.cdr);
    if (eff.kind === 'buff' && eff.shout) eff.dur *= dd.shoutDuration;
    if (eff.kind === 'buff' && ctx.flags.endless_tempest && (skill.id === 'hurricane' || skill.id === 'cataclysm')) eff.dur *= (1 + ctx.flags.endless_tempest);
    if (eff.kind === 'buff' && ctx.flags.ult_longer && skill.cluster === 'ultimate') eff.dur *= 1.25;
    res.weapon = Stats.weaponFor(char, skill);
    return res;
  };

  // Expand description template with resolved numbers.
  Stats.skillDesc = function (ctx, skill, rankOverride) {
    const rank = rankOverride !== undefined ? rankOverride : Math.max(1, ctx.ranks[skill.id] || 1);
    if (skill.type !== 'active') {
      const r = Math.max(1, rank);
      let txt = skill.desc.replace(/\{r2\}/g, skill.vals2 ? skill.vals2[Math.min(r, skill.vals2.length) - 1] : '').replace(/\{r\}/g, skill.vals ? skill.vals[Math.min(r, skill.vals.length) - 1] : r);
      return txt;
    }
    const w = Stats.weaponFor(ctx.char, skill);
    const coef = (skill.dmg || 0) * (1 + 0.1 * Math.max(0, rank - 1));
    const pct = (c) => Math.round(c * 100) + '% (' + U.fmtNum(w.avg * c * (1 + ctx.d.mainStatBonus)) + ')';
    const e = skill.effect || {};
    let d2 = 0, d3 = 0;
    if (e.ground) d2 = coef * e.ground.coef / (skill.dmg || 1);
    else if (e.novaBurst) d2 = e.novaBurst.coef * (1 + 0.1 * Math.max(0, rank - 1));
    else if (e.bolts) d2 = e.bolts.coef * (1 + 0.1 * Math.max(0, rank - 1));
    else if (e.apply && e.apply.find(a => a.coef)) d2 = e.apply.find(a => a.coef).coef * (1 + 0.1 * Math.max(0, rank - 1));
    else if (e.lastHitMult) d2 = coef * e.lastHitMult;
    else if (e.interval && e.dur) d2 = coef * (e.dur / e.interval);
    else d2 = coef;
    if (skill.id === 'corpse_explosion') d2 = 0.19 * 6 * (1 + 0.1 * Math.max(0, rank - 1));
    if (skill.id === 'claw') d2 = 0.6 * (1 + 0.1 * Math.max(0, rank - 1));
    if (skill.id === 'lunging_strike') d2 = 0.2 * (1 + 0.1 * Math.max(0, rank - 1));
    if (skill.id === 'shred') d3 = 1.0 * (1 + 0.1 * Math.max(0, rank - 1));
    return skill.desc.replace(/\{dmg\}/g, pct(coef)).replace(/\{dmg2\}/g, pct(d2)).replace(/\{dmg3\}/g, pct(d3));
  };

  // Condition evaluation. ctx: { self: entity, target: entity|null, skill: resolved|null, weapon }
  Stats.condMet = function (when, c) {
    const s = c.self, t = c.target;
    const hasSt = (e, st) => !!(e && e.st && e.st[st]);
    switch (when) {
      case 'skill_self': return true;
      case 'target_vuln': return hasSt(t, 'vulnerable');
      case 'target_cc': return !!(t && (hasSt(t, 'stun') || hasSt(t, 'freeze') || hasSt(t, 'immobilize') || hasSt(t, 'knockdown') || hasSt(t, 'fear') || hasSt(t, 'daze') || hasSt(t, 'taunt')));
      case 'target_slowed': return !!(t && (hasSt(t, 'slow') || hasSt(t, 'chill') || hasSt(t, 'decrepify')));
      case 'target_stunned': return !!(t && (hasSt(t, 'stun') || hasSt(t, 'knockdown') || hasSt(t, 'freeze')));
      case 'target_frozen': return hasSt(t, 'freeze');
      case 'target_immobilized': return hasSt(t, 'immobilize');
      case 'target_feared': return hasSt(t, 'fear');
      case 'target_marked': return hasSt(t, 'raven_mark');
      case 'target_petrified': return !!(t && t.st && t.st.stun && t.st.stun.petrify);
      case 'target_healthy': return !!(t && t.hp >= t.maxHp * 0.8);
      case 'target_injured': return !!(t && t.hp <= t.maxHp * 0.35);
      case 'target_elite': return !!(t && t.elite && t.elite.rank !== 'normal');
      case 'target_boss': return !!(t && t.elite && t.elite.rank === 'boss');
      case 'target_poisoned': return hasSt(t, 'poison');
      case 'target_bleeding': return hasSt(t, 'bleed');
      case 'target_burning': return hasSt(t, 'burn');
      case 'target_chilled': return !!(t && (hasSt(t, 'chill') || hasSt(t, 'freeze')));
      case 'target_cursed': return !!(t && (hasSt(t, 'decrepify') || hasSt(t, 'iron_maiden')));
      case 'target_shadowblight': return hasSt(t, 'shadowblight');
      case 'target_in_zone': return !!(t && t.inZone);
      case 'target_close': return !!(t && s && U.dist(s.x, s.y, t.x, t.y) <= 3.5);
      case 'target_distant': return !!(t && s && U.dist(s.x, s.y, t.x, t.y) > 3.5);
      case 'target_cc_or_vuln': return Stats.condMet('target_cc', c) || Stats.condMet('target_vuln', c) || Stats.condMet('target_slowed', c);
      case 'self_healthy': return !!(s && s.hp >= s.maxHp * 0.8);
      case 'self_injured': return !!(s && s.hp <= s.maxHp * 0.35);
      case 'self_below_half': return !!(s && s.hp < s.maxHp * 0.5);
      case 'self_fortified': return !!(s && s.fortify >= s.maxHp * 0.5);
      case 'self_berserk': return hasSt(s, 'berserk');
      case 'self_barrier': return !!(s && s.barrier > 0);
      case 'self_unstoppable': return !!(s && (s.unstoppable > 0 || hasSt(s, 'unstoppable')));
      case 'self_moving': return !!(s && s.moving);
      case 'self_aura': return !!(s && s.auraActive);
      case 'self_werewolf': return !!(s && s.form === 'werewolf');
      case 'self_werebear': return !!(s && s.form === 'werebear');
      case 'self_shapeshifted': return !!(s && (s.form === 'werewolf' || s.form === 'werebear'));
      case 'weapon_bludgeon': return !!(c.weapon && c.weapon.type === 'mace2h');
      case 'weapon_twohanded': return !!(c.weapon && c.weapon.twoHanded);
      case 'weapon_dual': return !!(c.weapon && c.weapon.dual);
      default: return false;
    }
  };

  // Summed stat with conditionals evaluated against a combat context, plus dynamic buffs (entity.buffStats).
  Stats.get = function (sctx, key, c, buffStats) {
    let v = sctx.flat[key] || 0;
    for (const m of sctx.cond) if (m.stat === key && Stats.condMet(m.when, c)) v += m.add;
    if (buffStats && buffStats[key]) v += buffStats[key];
    return v;
  };

  // Flattened stat list for the character sheet, grouped.
  Stats.sheet = function (sctx) {
    const d = sctx.d; const rows = [];
    const push = (group, name, val, kind) => rows.push({ group, name, val, kind });
    push('Core', 'Strength', d.str, 'flat'); push('Core', 'Intelligence', d.int, 'flat'); push('Core', 'Willpower', d.will, 'flat'); push('Core', 'Dexterity', d.dex, 'flat');
    push('Core', 'Skill Damage from ' + DATA.STAT_DEFS[sctx.cls.mainStat].name, d.mainStatBonus, 'pct');
    push('Offense', 'Critical Strike Chance', d.critChance, 'pct'); push('Offense', 'Critical Strike Damage', d.critDmg, 'pct'); push('Offense', 'Vulnerable Damage', d.vulnDmg, 'pct');
    push('Offense', 'Overpower Chance', d.overpowerChance, 'pct'); push('Offense', 'Overpower Damage', d.overpowerDmg, 'pct'); push('Offense', 'Lucky Hit Chance Bonus', d.luckyHit, 'pct'); push('Offense', 'Attack Speed', d.attackSpeed - 1, 'pct');
    push('Defense', 'Maximum Life', d.maxLife, 'flat'); push('Defense', 'Armor', d.armor, 'flat'); push('Defense', 'Armor DR vs level ' + sctx.level, Stats.armorDR(d.armor, sctx.level), 'pct'); push('Defense', 'Damage Reduction', d.dr, 'pct'); push('Defense', 'Dodge Chance', d.dodge, 'pct'); push('Defense', 'Block Chance', d.blockChance, 'pct'); push('Defense', 'Thorns', d.thorns, 'flat');
    ['fire', 'cold', 'lightning', 'poison', 'shadow'].forEach(el => push('Resistances', U.cap(el) + ' Resistance', d.res[el], 'pct'));
    push('Resistances', 'Maximum Resistance', d.maxRes, 'pct');
    push('Recovery', 'Life Regeneration /s', d.lifeRegen, 'flat'); push('Recovery', 'Life On Hit', d.lifeOnHit, 'flat'); push('Recovery', 'Life Per Kill', d.lifeOnKill, 'flat'); push('Recovery', 'Healing Received', d.healing - 1, 'pct'); push('Recovery', 'Potion Healing', d.potionHeal, 'pct'); push('Recovery', 'Potion Charges', d.potionCharges, 'flat');
    push('Resource', 'Maximum ' + sctx.cls.resource.name, d.maxResource, 'flat'); push('Resource', 'Resource Generation', d.resourceGen - 1, 'pct'); push('Resource', 'Resource Cost Reduction', d.resourceCostRed, 'pct');
    push('Utility', 'Cooldown Reduction', d.cdr, 'pct'); push('Utility', 'Movement Speed', d.moveSpeed - 1, 'pct'); push('Utility', 'Evade Charges', d.evadeCharges, 'flat'); push('Utility', 'XP Bonus', d.xpBonus - 1, 'pct'); push('Utility', 'Gold Find', d.goldFind - 1, 'pct'); push('Utility', 'Item Find', d.itemFind - 1, 'pct');
    push('Minions', 'Minion Damage', d.minionDmg, 'pct'); push('Minions', 'Minion Life', d.minionLife, 'pct'); push('Minions', 'Minion Attack Speed', d.minionAttackSpeed - 1, 'pct');
    // all other summed stats
    Object.keys(sctx.flat).forEach(k => {
      const def = DATA.STAT_DEFS[k]; if (!def) return;
      if (['str', 'int', 'will', 'dex', 'life', 'life_pct', 'armor', 'armor_pct', 'crit_chance', 'crit_dmg', 'vuln_dmg', 'overpower_chance', 'overpower_dmg', 'lucky_hit', 'attack_speed', 'dr', 'dodge', 'block_chance', 'thorns', 'life_regen', 'life_on_hit', 'life_on_kill', 'healing', 'potion_heal', 'potion_charges', 'max_resource', 'resource_gen', 'resource_cost_red', 'cdr', 'move_speed', 'evade_charges', 'xp_bonus', 'gold_find', 'item_find', 'dmg_summon', 'minion_life', 'minion_attack_speed', 'res_fire', 'res_cold', 'res_light', 'res_poison', 'res_shadow', 'res_all', 'max_res', 'thorns_pct'].includes(k)) return;
      if (Math.abs(sctx.flat[k]) < 1e-9) return;
      push(def.group, def.name, sctx.flat[k], def.kind);
    });
    sctx.cond.forEach(m => { const def = DATA.STAT_DEFS[m.stat]; if (def) push(def.group, def.name + ' (' + U.title(m.when.replace(/_/g, ' ')) + ')', m.add, def.kind); });
    return rows;
  };

  window.Stats = Stats;
})();
