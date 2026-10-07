/* Sanctuary — combat simulation (global: Combat). Part 1: state, helpers, statuses, damage pipeline. */
(function () {
  'use strict';
  const Combat = {};
  let S = null; // active combat state
  Combat.state = () => S;

  const CC_STATUSES = ['stun', 'freeze', 'knockdown', 'immobilize', 'fear', 'daze', 'taunt'];
  const HARD_CC = ['stun', 'freeze', 'knockdown'];
  const DOT_KINDS = { bleed: 'physical', poison: 'poison', burn: 'fire', shadow_dot: 'shadow' };
  Combat.TAG_STAT = { basic: 'dmg_basic', core: 'dmg_core', ultimate: 'dmg_ult', bone: 'dmg_bone', blood: 'dmg_blood', darkness: 'dmg_dark', earth: 'dmg_earth', storm: 'dmg_storm', werewolf: 'dmg_werewolf', werebear: 'dmg_werebear', companion: 'dmg_companion', aura: 'dmg_aura', brawling: 'dmg_brawling', mastery: 'dmg_mastery', wrath: 'dmg_wrath', judgement: 'dmg_judgement', summoning: 'dmg_summon', shapeshift: 'dmg_shapeshift', holy: 'dmg_holy' };

  // ------------------------------------------------------------- state creation
  Combat.start = function (cfg) {
    const char = cfg.char;
    Player.recompute(char);
    const sctx = char.sctx;
    const zone = DATA.zoneById[cfg.area.zone];
    S = {
      cfg, char, account: cfg.account, sctx, area: cfg.area, zone, mode: cfg.area.type, level: cfg.level, diff: DATA.diffById[char.difficulty],
      t: 0, floor: 1, maxFloors: cfg.area.type === 'dungeon' ? 3 : 1, w: 44, h: 44, seed: Math.floor(Math.random() * 1e9),
      obstacles: [], decor: [], props: [], lights: [], decals: [], bloodDecals: [], paths: [], enemies: [], minions: [], projectiles: [], zones: [], corpses: [], orbs: [], drops: [], particles: [], texts: [], actions: [], beams: [], walls: [],
      kills: 0, eliteKills: 0, bossKilled: false, spawnTimer: 2, packIndex: 0, quota: 0, spawned: 0, cleared: false, exit: null, chest: null, result: null, done: false,
      input: { mx: 0, my: 0, aim: null }, log: [], shake: 0, hooks: cfg.hooks || {}, elapsed: 0, eventTimer: 0, bossRef: null, lootLog: [], xpGained: 0, goldGained: 0,
      aspectUnlocked: null, pitTimer: 0, timeLimit: cfg.area.type === 'event' ? 90 : 0, waveTimer: 0, wave: 0, treasureGoblinSpawned: false
    };
    if (S.mode === 'boss') { S.w = 32; S.h = 32; }
    if (S.mode === 'cellar') { S.w = 30; S.h = 30; }
    if (S.mode === 'stronghold') { S.w = 50; S.h = 50; }
    S.player = makePlayer(char, sctx);
    buildMap();
    setupMode();
    spawnPersistentMinions();
    S.pitTier = char.unlocks.pit || 1;
    return S;
  };
  Combat.end = function () { S = null; };

  function makePlayer(char, sctx) {
    const d = sctx.d;
    const p = { kind: 'player', id: 'player', char, x: S.w / 2, y: S.h - 6, r: 0.5, team: 0, hp: d.maxLife, maxHp: d.maxLife, res: char.cls === 'barbarian' || char.cls === 'druid' ? 0 : d.maxResource, maxRes: d.maxResource,
      fortify: 0, barrier: 0, barriers: [], speed: 4.6, facing: -Math.PI / 2, st: {}, dots: [], buffs: [], buffStats: {}, cds: {}, evadeCharges: d.evadeCharges, evadeCd: 0, potions: char.potion.charges,
      form: null, formTimer: 0, formSince: 0, unstoppable: 0, immune: 0, mounted: false, spurs: 0, spurTimer: 0, mountHits: 0, moving: false, lastDamagedAt: -99, counters: {}, channel: null, auraActive: false, attackTimer: 0, dash: null, portal: 0, dead: false,
      castCounts: {}, lastCastTag: null, shadowblightHits: 0, healthySince: 0, ancientsTimer: 0, chargedTimer: 0, arsenal: {}, frenzyStacks: 0, berserkDmgBonus: 0, furySpentWrath: 0, lastHitSkill: null, resourceSpentAcc: 0, bloodOrbs: 0, corpseKills: 0, periodicOP: 0, guardianUsed: false, holyVengeance: 0, hvCd: 0, expectant: 0, upheavalStacks: 0, limitless: 0, starless: 0, lupineHits: 0, resonanceLast: null, provocationSince: 0, nextOverpower: false, stealth: 0, ambush: 0, veteranBrawler: 0, protectorCd: 0, luckyBuffs: {} };
    if (char.cls === 'paladin' && char.mechanics.aura && (sctx.ranks[char.mechanics.aura] || 0) > 0) p.auraActive = true;
    if ((sctx.flags.permabear) ) { p.form = 'werebear'; p.formTimer = 9999; }
    if ((sctx.flags.permawolf) ) { p.form = 'werewolf'; p.formTimer = 9999; }
    return p;
  }

  function buildMap() {
    const rng = U.seededRng(S.seed + S.floor * 7919);
    S.player.x = S.w / 2; S.player.y = S.h - 6;
    if (S.mode === 'boss') { S.player.y = S.h - 5; }
    const L = Layout.build(S, rng);
    S.obstacles = L.obstacles; S.decor = L.decor; S.props = L.props; S.lights = L.lights; S.decals = L.decals; S.floorKind = L.floor; S.ambient = L.ambient; S.paths = L.paths; S.walls = [];
    S.bloodDecals = [];
  }
  function setupMode() {
    const m = S.mode;
    S.exit = null; S.chest = null; S.cleared = false; S.quota = 0; S.spawned = 0; S.packIndex = 0;
    if (m === 'field') { S.quota = Infinity; S.spawnTimer = 1.5; }
    else if (m === 'cellar') { S.quota = 14; S.spawnTimer = 1; }
    else if (m === 'dungeon') { S.quota = 18 + S.floor * 6; S.spawnTimer = 1; }
    else if (m === 'stronghold') { S.quota = 40; S.spawnTimer = 1; }
    else if (m === 'event') { S.quota = Infinity; S.spawnTimer = 2; S.timeLimit = 90; S.eventTimer = 90; }
    else if (m === 'boss') { S.quota = 0; spawnBoss(DATA.bossById[S.area.boss]); }
    if (S.area.pit) S.quota = 22 + S.floor * 8;
  }

  // ------------------------------------------------------------- utility
  const dist = (a, b) => U.dist(a.x, a.y, b.x, b.y);
  function nearestEnemy(x, y, maxR, pred) {
    let best = null, bd = maxR === undefined ? Infinity : maxR;
    for (const e of S.enemies) { if (e.dead || e.hidden) continue; if (pred && !pred(e)) continue; const d = U.dist(x, y, e.x, e.y) - e.r; if (d < bd) { bd = d; best = e; } }
    return best;
  }
  function enemiesIn(x, y, r, pred) { const out = []; for (const e of S.enemies) { if (e.dead || e.hidden) continue; if (pred && !pred(e)) continue; if (U.dist(x, y, e.x, e.y) <= r + e.r) out.push(e); } return out; }
  function enemiesInSector(x, y, range, dir, arc) { return enemiesIn(x, y, range, e => Math.abs(U.angleDiff(dir, U.angleTo(x, y, e.x, e.y))) <= arc / 2 + Math.atan2(e.r, Math.max(0.5, U.dist(x, y, e.x, e.y)))); }
  function alliesIn(x, y, r) { const out = []; if (!S.player.dead && U.dist(x, y, S.player.x, S.player.y) <= r + S.player.r) out.push(S.player); for (const m of S.minions) if (!m.dead && U.dist(x, y, m.x, m.y) <= r + m.r) out.push(m); return out; }
  function addText(x, y, txt, color, size, crit) { if (S.texts.length > 80) S.texts.shift(); S.texts.push({ x, y, txt, color: color || '#fff', size: size || 1, t: 0, dur: crit ? 1.2 : 0.9, vy: -1.6 - Math.random() * 0.6, vx: (Math.random() - 0.5) * 0.8 }); }
  function addParticles(x, y, n, color, speed, life, size) { for (let i = 0; i < n; i++) { if (S.particles.length > 400) S.particles.shift(); const a = Math.random() * Math.PI * 2, s = (speed || 3) * (0.3 + Math.random()); S.particles.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: (life || 0.5) * (0.5 + Math.random()), t: 0, color: color || '#fff', size: size || 0.12 }); } }
  function schedule(delay, fn) { S.actions.push({ t: S.t + delay, fn }); }
  function log(msg, color) { S.log.push({ msg, color, t: S.t }); if (S.log.length > 6) S.log.shift(); if (S.hooks.onLog) S.hooks.onLog(msg, color); }
  Combat.log = log;
  function isCC(e) { return CC_STATUSES.some(s => e.st[s]); }
  function isHardCC(e) { return HARD_CC.some(s => e.st[s]); }
  function resolveObstacles(ent) {
    Layout.collide(S.obstacles, ent);
    for (const w of S.walls) { const d = U.dist(ent.x, ent.y, w.x, w.y); const min = w.r + ent.r * 0.8; if (d < min && d > 0.0001 && ent.kind !== w.owner) { const k = (min - d) / d; ent.x += (ent.x - w.x) * k; ent.y += (ent.y - w.y) * k; } }
    ent.x = U.clamp(ent.x, ent.r, S.w - ent.r); ent.y = U.clamp(ent.y, ent.r, S.h - ent.r);
  }

  // ------------------------------------------------------------- statuses
  // apply status object {st, dur, pct, coef, ...} from source (player/minion/enemy) to target
  function applyStatus(target, s, source, meta) {
    if (!s || target.dead) return false;
    const st = s.st;
    if (s.chance !== undefined && !U.chance(s.chance)) return false;
    if (s.when && source === S.player && !Stats.condMet(s.when, { self: S.player, target, weapon: meta && meta.weapon })) return false;
    const fromPlayer = source && source.team === 0;
    if (DOT_KINDS[st]) {
      const coef = s.coef || 0; if (!coef) return false;
      let total = (meta && meta.baseDmg !== undefined) ? meta.baseDmg * coef / (meta.coef || 1) : coef * (meta && meta.weaponAvg || 1);
      if (s.total !== undefined) total = s.total;
      addDot(target, st, total, s.dur, source, meta, s);
      return true;
    }
    let dur = s.dur || 0;
    if (CC_STATUSES.includes(st)) {
      if (target.kind === 'player') { if (target.unstoppable > 0 || target.immune > 0) return false; dur *= (1 - S.sctx.d.ccReduction); }
      else {
        if (target.unstoppable > 0 || (target.elite && target.elite.affixes.some(a => a.unstoppable))) { addText(target.x, target.y - target.r, 'Unstoppable', '#ddd', 0.7); return false; }
        if (fromPlayer) dur *= S.sctx.d.ccDuration;
        if (target.elite && target.elite.rank === 'boss') { target.stagger = (target.stagger || 0) + dur * 10; dur *= 0.25; if (target.stagger >= 100) { target.stagger = 0; dur = 4; addText(target.x, target.y - target.r - 1, 'STAGGERED', '#ffe55c', 1.4, true); } }
        else if (target.elite && target.elite.rank !== 'normal') dur *= 0.7;
      }
      if (fromPlayer && target.kind === 'enemy') { fireTriggers('cc_applied', { target }); if (S.sctx.flags.terramote !== undefined) S.player.counters.terramote = (S.player.counters.terramote || 0) + 1; }
    }
    const cur = target.st[st];
    const obj = Object.assign({}, s, { dur, max: dur, src: source });
    if (st === 'slow' || st === 'chill') {
      if (s.stackMax) { const stacks = Math.min(s.stackMax, (cur ? cur.stacks : 0) + 1); obj.stacks = stacks; obj.pct = Math.min(0.8, s.pct * stacks); }
      else if (cur && cur.pct > obj.pct && cur.dur > 0.3) { cur.dur = Math.max(cur.dur, dur); return true; }
    }
    if (cur && cur.dur > dur && !s.stackMax && st !== 'vulnerable') { if (st === 'vulnerable' || st === 'decrepify') cur.dur = Math.max(cur.dur, dur); return true; }
    if (st === 'vulnerable' && cur) obj.dur = Math.max(cur.dur, dur);
    target.st[st] = obj;
    if (st === 'taunt' && target.kind === 'enemy') target.ai.target = source;
    if (st === 'fear' && target.kind === 'enemy') target.ai.fearFrom = source;
    if (st === 'freeze' || st === 'stun' || st === 'knockdown') { if (target.kind === 'enemy') { target.ai.windup = 0; target.ai.charging = null; } }
    return true;
  }
  Combat.applyStatus = applyStatus;
  function addDot(target, st, total, dur, source, meta, s) {
    const fromPlayer = source && source.team === 0;
    let d = dur;
    if (fromPlayer) { d *= S.sctx.d.dotDuration; if (st === 'poison' && s && s.poisonDur) d = s.poisonDur; }
    if (fromPlayer && st === 'bleed' && S.sctx.flags.gushing_wounds && U.chance(S.sctx.d.critChance)) { total *= 2.4; addText(target.x, target.y - target.r, 'Gushing', '#ff5a5a', 0.8); }
    if (fromPlayer && st === 'bleed' && target.st.flayed) total *= 1.1;
    if (fromPlayer && st === 'poison' && S.sctx.flags.poison_slow) applyStatus(target, { st: 'slow', pct: S.sctx.flags.poison_slow, dur: d }, source);
    if (fromPlayer && st === 'bleed' && S.sctx.flags.bleed_slow && target.hp >= target.maxHp * 0.8) applyStatus(target, { st: 'slow', pct: S.sctx.flags.bleed_slow, dur: d }, source);
    target.dots.push({ st, dps: total / d, dur: d, max: d, src: source, element: DOT_KINDS[st], acc: 0, spread: s && s.spread ? Object.assign({ t: 0 }, s.spread) : null, skill: meta && meta.skill });
    if (target.dots.length > 40) target.dots.shift();
  }
  function cleanse(ent) { CC_STATUSES.forEach(s => delete ent.st[s]); delete ent.st.slow; delete ent.st.chill; ent.dots = []; }

  // buffs on player: {id, dur, mods, stacks, stackMax, ramp...}
  function addBuff(p, b) {
    const id = b.id || U.uid('buff');
    const cur = p.buffs.find(x => x.id === id);
    if (cur) {
      if (b.stackMax) { cur.stacks = Math.min(b.stackMax, cur.stacks + 1); cur.dur = b.stackDur ? cur.dur + b.dur : b.dur; cur.max = Math.max(cur.max, cur.dur); }
      else { cur.dur = Math.max(cur.dur, b.dur); cur.max = Math.max(cur.max, b.dur); cur.mods = b.mods; }
      return cur;
    }
    const nb = Object.assign({ stacks: 1, max: b.dur }, b, { id });
    p.buffs.push(nb);
    return nb;
  }
  Combat.addBuff = addBuff;
  function recomputeBuffStats(p) {
    const bs = {};
    for (const b of p.buffs) { (b.mods || []).forEach(m => { if (m.stat && (!m.when || Stats.condMet(m.when, { self: p, target: null }))) bs[m.stat] = (bs[m.stat] || 0) + (m.add || 0) * (b.stacks || 1) + (b.ramp && b.ramp.stat === m.stat ? 0 : 0); }); if (b.ramp) bs[b.ramp.stat] = (bs[b.ramp.stat] || 0) + Math.min(b.ramp.max, Math.floor(b.elapsed || 0)) * b.ramp.add; }
    if (p.st.berserk) { const bonus = S.sctx.flags.unconstrained ? 0.6 : 0.25; bs.dmg_berserk_mult = bonus + (p.berserkDmgBonus || 0); }
    if (p.frenzyStacks >= 3 && S.sctx.flags.frenzy_dmg) bs.dmg = (bs.dmg || 0) + S.sctx.flags.frenzy_dmg;
    if (p.frenzyStacks > 0 && S.sctx.flags.frenzy_dr) bs.dr = (bs.dr || 0) + S.sctx.flags.frenzy_dr * p.frenzyStacks;
    if (p.frenzyStacks > 0) bs.attack_speed = (bs.attack_speed || 0) + 0.2 * p.frenzyStacks;
    if (p.stealth > 0) bs.move_speed = (bs.move_speed || 0) + 0.3;
    p.buffStats = bs;
  }
  const gstat = (key, target, skillRes) => Stats.get(S.sctx, key, { self: S.player, target, skill: skillRes, weapon: skillRes && skillRes.weapon }, S.player.buffStats);

  // ------------------------------------------------------------- player resources / healing
  function gainResource(p, amt, raw) {
    const d = S.sctx.d;
    const mult = raw ? 1 : d.resourceGen * (1 + (p.buffStats.resource_gen || 0));
    p.res = Math.min(p.maxRes, p.res + amt * mult);
  }
  function spendResource(p, amt) {
    p.res = Math.max(0, p.res - amt);
    p.resourceSpentAcc += amt;
    if (S.sctx.flags.rapid_oss && p.resourceSpentAcc >= 100) { p.resourceSpentAcc -= 100; Object.keys(p.cds).forEach(id => { const s = DATA.skillById[id]; if (s && s.tags.includes('bone')) p.cds[id] = Math.max(0, p.cds[id] - S.sctx.flags.rapid_oss); }); }
    if (S.sctx.flags.invigorating_fury) { p.counters.ifury = (p.counters.ifury || 0) + amt; if (p.counters.ifury >= 100) { p.counters.ifury -= 100; heal(p, p.maxHp * S.sctx.flags.invigorating_fury); } }
    if (S.sctx.flags.supreme_wrath && p.buffs.find(b => b.id === 'wrath_of_the_berserker')) { p.furySpentWrath += amt; p.berserkDmgBonus = Math.min(1.0, Math.floor(p.furySpentWrath / 25) * 0.25); }
  }
  function heal(p, amt, src) {
    if (p.dead || amt <= 0) return;
    const d = S.sctx.d;
    let mult = p.kind === 'player' ? d.healing * (1 + (p.buffStats.healing || 0)) : 1;
    if (p.kind === 'player') { if (p.hp < p.maxHp * 0.5) mult += gstat('healing', null) - (S.sctx.flat.healing || 0); }
    const before = p.hp;
    p.hp = Math.min(p.maxHp, p.hp + amt * mult);
    const got = p.hp - before;
    if (got > 1 && p.kind === 'player') { addText(p.x, p.y - 1, '+' + U.fmtNum(got), '#5cff7a', 0.8); if (S.sctx.flags.starlight && src !== 'regen') gainResource(p, p.maxRes * S.sctx.flags.starlight * 0.1, true); }
  }
  Combat.heal = heal;
  function fortify(p, pct) { const amt = p.maxHp * pct * S.sctx.d.fortifyGen * (1 + (p.buffStats.fortify_gen || 0)); p.fortify = Math.min(p.maxHp, p.fortify + amt); }
  function barrier(p, amt, dur) { amt *= S.sctx.d.barrierGen * (1 + (p.buffStats.barrier_gen || 0)); p.barriers.push({ amt, dur: dur || 6 }); p.barrier = p.barriers.reduce((s, b) => s + b.amt, 0); addText(p.x, p.y - 1.2, 'Barrier', '#ffe9a0', 0.8); }
  Combat.fortify = fortify; Combat.barrier = barrier;

  // ------------------------------------------------------------- trigger system
  // ev: 'hit'|'crit'|'kill'|'lucky'|'cast'|'overpower'|'damaged'|'first_hit'|'multi_hit'|'last_hit'|'corpse_consume'|'corpse_form'|'blood_orb'|'any_kill'|'any_overpower'|'cc_applied'|'shapeshift'|'cast_defensive'
  function fireTriggers(ev, info) {
    const p = S.player; if (p.dead) return;
    const skill = info.skill || null;
    const run = (t) => {
      if (t.on !== ev) return;
      if (t.scope && (!skill || skill.id !== t.scope)) return;
      if (t.tag && !(skill && skill.tags.includes(t.tag))) return;
      if (t.element && !(info.element === t.element)) return;
      if (t.form && info.form !== t.form) return;
      if (t.when && !Stats.condMet(t.when, { self: p, target: info.target, skill, weapon: skill && skill.weapon })) return;
      if (t.count && (info.count || 0) < t.count) return;
      if (t.once && info.once) return;
      if (t.counter) { const key = 'ctr_' + (t.src || '') + t.on + (t.scope || ''); p.counters[key] = (p.counters[key] || 0) + 1; if (p.counters[key] < t.counter) return; p.counters[key] = 0; }
      if (t.chance !== undefined) { let ch = t.chance; if (ev === 'lucky') ch *= (info.luckyMult || 1); if (!U.chance(ch)) return; }
      if (t.maxPerCast && info.cast) { const k = 'mpc_' + t.on + (t.scope || ''); info.cast[k] = (info.cast[k] || 0) + 1; if (info.cast[k] > t.maxPerCast) return; }
      doEffect(t.do, info, skill);
    };
    for (const t of S.sctx.triggers) run(t);
    if (skill && skill.triggers) for (const t of skill.triggers) run(Object.assign({}, t, { scope: skill.id }));
  }
  Combat.fireTriggers = fireTriggers;
  function doEffect(d, info, skill) {
    if (!d) return; const p = S.player; const target = info.target;
    if (d.apply && target && target.kind === 'enemy') applyStatus(target, Object.assign({}, d.apply), p, { weaponAvg: skill ? skill.weapon.avg : weaponAvg(null), skill });
    if (d.castApply && info.cast) info.cast.castApply = d.castApply;
    if (d.applyScaled && target && target.kind === 'enemy' && info.dmg) addDot(target, d.applyScaled.st, info.dmg * d.applyScaled.pct, d.applyScaled.dur, p, { skill });
    if (d.gain === 'resource') gainResource(p, d.amt || 0, true);
    if (d.gainPct) gainResource(p, p.maxRes * d.gainPct, true);
    if (d.heal) heal(p, p.maxHp * d.heal);
    if (d.hot) addBuff(p, { id: 'hot_' + (skill ? skill.id : 'x'), dur: d.hot.dur, mods: [], hot: d.hot.amt * p.maxHp / d.hot.dur });
    if (d.fortify) fortify(p, d.fortify);
    if (d.buff) { const b = U.deepClone(d.buff); addBuff(p, b); }
    if (d.berserk) { const dur = d.berserk * (1 + (S.sctx.flat.berserk_dur || 0)); const maxDur = S.sctx.flags.unconstrained ? 10 : 5; const cur = p.st.berserk; p.st.berserk = { dur: Math.min(maxDur, (cur ? cur.dur : 0) + dur), max: maxDur }; }
    if (d.cdr_skill && skill) p.cds[skill.id] = Math.max(0, (p.cds[skill.id] || 0) - d.cdr_skill);
    if (d.cdr_ult) Object.keys(p.cds).forEach(id => { if (DATA.skillById[id] && DATA.skillById[id].cluster === 'ultimate') p.cds[id] = Math.max(0, p.cds[id] - d.cdr_ult); });
    if (d.cdr_all) Object.keys(p.cds).forEach(id => { if (DATA.skillById[id] && DATA.skillById[id].cluster !== 'ultimate') p.cds[id] = Math.max(0, p.cds[id] - d.cdr_all); });
    if (d.reset_skill && skill) p.cds[skill.id] = 0;
    if (d.reset === 'companion') Object.keys(p.cds).forEach(id => { if (DATA.skillById[id] && DATA.skillById[id].cluster === 'companion') p.cds[id] = 0; });
    if (d.corpse && target) spawnCorpse(target.x, target.y);
    if (d.orb && target) spawnOrb(target.x, target.y);
    if (d.nova && target) { const n = enemiesIn(target.x, target.y, 3); n.forEach(e => hitEnemy(e, { src: p, skill, coef: d.nova, element: d.element || (skill ? skill.element : 'physical'), tags: skill ? skill.tags : [], noTrigger: true })); addParticles(target.x, target.y, 12, DATA.ELEMENT_COLOR[d.element || 'physical'], 4, 0.4); }
    if (d.bolt && target) { const t2 = nearestEnemy(target.x, target.y, 6, e => e !== target) || target; spawnProjectile({ x: target.x, y: target.y - 0.5, dir: U.angleTo(target.x, target.y, t2.x, t2.y), speed: 14, range: 8, radius: 0.5, pierce: 0, coef: d.bolt, element: d.element || 'lightning', owner: p, skill, noTrigger: true, color: DATA.ELEMENT_COLOR[d.element || 'lightning'] }); }
    if (d.ground && target) spawnZone({ x: target.x, y: target.y, radius: d.ground.radius, dur: d.ground.dur, interval: d.ground.interval, coef: d.ground.coefTotal / (d.ground.dur / d.ground.interval), element: d.ground.element || (skill ? skill.element : 'physical'), owner: p, skill, noTrigger: true });
    if (d.regen) addBuff(p, { id: 'regen_' + (skill ? skill.id : 'x'), dur: d.regen.dur, mods: [], resRegen: d.regen.amt / d.regen.dur });
    if (d.nextOverpower) p.nextOverpower = true;
    if (d.reviveMinions) spawnPersistentMinions(true);
  }

  // ------------------------------------------------------------- damage: player/minion -> enemy
  function weaponAvg(skill) { return skill ? skill.weapon.avg : Stats.weaponFor(S.char, null).avg; }
  Combat.weaponAvg = weaponAvg;
  // info: {src, skill, coef, element, tags, isDot, forcedCrit, forcedOverpower, applies, mult, noTrigger, minion, cast, first, baseDmgOverride, critBonus}
  function hitEnemy(e, info) {
    if (!e || e.dead || e.hidden) return 0;
    const p = S.player, sctx = S.sctx, d = sctx.d;
    const skill = info.skill || null;
    const tags = info.tags || (skill ? skill.tags : []);
    const element = info.element || (skill ? skill.element : 'physical');
    const cctx = { self: p, target: e, skill, weapon: skill ? skill.weapon : null };
    let base = info.baseDmgOverride !== undefined ? info.baseDmgOverride : (info.minion ? info.minion.dmgBase : weaponAvg(skill)) * (info.coef !== undefined ? info.coef : (skill ? skill.coef : 1)) * U.rand(0.9, 1.1);
    // additive bucket
    let add = gstat('dmg', e, skill) + (DATA.ELEMENT_DMG_STAT[element] ? gstat(DATA.ELEMENT_DMG_STAT[element], e, skill) : 0);
    if (element !== 'physical') add += gstat('dmg_nonphys', e, skill);
    for (const t of tags) { const k = Combat.TAG_STAT[t]; if (k) add += gstat(k, e, skill); }
    const close = dist(p, e) <= 3.5;
    add += close ? gstat('dmg_close', e, skill) : gstat('dmg_distant', e, skill);
    if (isCC(e)) add += gstat('dmg_vs_cc', e, skill);
    if (e.st.slow || e.st.chill || e.st.decrepify) add += gstat('dmg_vs_slowed', e, skill);
    if (e.st.stun || e.st.knockdown || e.st.freeze) add += gstat('dmg_vs_stunned', e, skill);
    if (e.st.freeze) add += gstat('dmg_vs_frozen', e, skill);
    if (e.st.chill || e.st.freeze) add += gstat('dmg_vs_chilled', e, skill);
    if (e.hp >= e.maxHp * 0.8) add += gstat('dmg_vs_healthy', e, skill) + gstat('inherent_dmg_vs_healthy', e, skill);
    if (e.hp <= e.maxHp * 0.35) add += gstat('dmg_vs_injured', e, skill);
    if (e.elite && e.elite.rank !== 'normal') add += gstat('dmg_vs_elite', e, skill);
    if (e.dots.some(x => x.st === 'poison')) add += gstat('dmg_vs_poisoned', e, skill);
    if (e.dots.some(x => x.st === 'bleed')) add += gstat('dmg_vs_bleeding', e, skill);
    if (e.dots.some(x => x.st === 'burn')) add += gstat('dmg_vs_burning', e, skill);
    if (e.st.vulnerable) add += gstat('dmg_vs_vuln', e, skill);
    if (e.st.decrepify || e.st.iron_maiden) add += gstat('dmg_curse', e, skill);
    if (info.isDot) add += gstat('dmg_dot', e, skill); if (info.isDot && info.dotKind === 'bleed') add += gstat('dmg_bleed', e, skill);
    if (p.fortify >= p.hp && p.fortify > 0) add += gstat('dmg_fortified', e, skill);
    if (p.hp >= p.maxHp * 0.8) add += gstat('dmg_healthy', e, skill);
    if (p.barrier > 0) add += gstat('dmg_barrier', e, skill);
    if (p.form) add += gstat('dmg_shapeshift', e, skill);
    if (p.st.berserk) add += gstat('dmg_berserk', e, skill);
    if (skill) { add += skill.dmgMult; for (const m of skill.dmgMultCond) if (Stats.condMet(m.when, cctx)) add += m.add; }
    if (info.minion) add += d.minionDmg + (sctx.minionMods[info.minion.type] ? sctx.minionMods[info.minion.type].dmg || 0 : 0);
    // flags
    if (skill) {
      if (sctx.flags.edgemaster) add += sctx.flags.edgemaster * (p.res / p.maxRes);
      if (sctx.flags.ossified_essence && tags.includes('bone')) add += Math.max(0, p.res - 50) * 0.01;
      if (skill.flags.hota_fury_scale) add += Math.floor(p.res / 10) * 0.01;
      if (skill.flags.hota_fury_bonus) add += (info.furyAtCast || 0) * 0.01;
      if (skill.flags.ww_ramp && p.channel && p.channel.elapsed >= 2) add += skill.flags.ww_ramp;
      if (sctx.flags.expectant && tags.includes('core') && p.expectant > 0) { add += Math.min(0.3, p.expectant); }
      if (skill.flags.lance_stacking) add += Math.min(0.5, enemiesIn(e.x, e.y, 6, x => x.st.lanced).length * 0.1);
      if (sctx.flags.walking_arsenal) { let n = 0; ['bludgeon', 'slash', 'dual'].forEach(k => { if (p.arsenal[k] > 0) n++; }); add += n * 0.1 + (n === 3 ? 0.15 : 0); }
      if (sctx.flags.upheaval_stack && skill.id === 'upheaval') add += Math.min(4, p.upheavalStacks) * sctx.flags.upheaval_stack;
      if (sctx.flags.limitless_rage && tags.includes('core')) add += Math.min(1.5, p.limitless);
      if (sctx.flags.starless && tags.includes('core')) add += Math.min(0.5, p.starless * 0.1);
      if (sctx.flags.veteran_brawler && (skill.eff.kind === 'dash' || skill.eff.kind === 'leap')) add += Math.min(0.4, p.veteranBrawler);
      if (sctx.flags.earthquake_dmg && S.zones.some(z => z.owner === p && z.coefTotal !== undefined && U.dist(z.x, z.y, p.x, p.y) <= z.radius)) add += sctx.flags.earthquake_dmg;
      if (sctx.flags.holy_vengeance && tags.includes('core') && p.holyVengeance > 0) { add += 0.5; p.holyVengeance = 0; }
      if (sctx.flags.zealous_fervor && tags.includes('core')) { const b = p.buffs.find(x => x.id === 'zfervor'); if (b && b.stacks >= 10) add += 0.2; }
      if (sctx.flags.perfect_storm && tags.includes('storm') && Stats.condMet('target_cc_or_vuln', cctx)) add += 0; // handled via cond stat
      if (sctx.flags.resonance && p.resonanceLast && ((tags.includes('earth') && p.resonanceLast === 'storm') || (tags.includes('storm') && p.resonanceLast === 'earth'))) add += sctx.flags.resonance;
      if (sctx.flags.quickshift && info.quickshift) add += sctx.flags.quickshift;
      if (sctx.flags.bestial_rampage && p.form === 'werebear' && S.t - p.formSince >= 2.5) add += 0.25;
      if (sctx.flags.aura_mastery && tags.includes('aura')) add += sctx.flags.aura_mastery;
      if (sctx.flags.ramaladni && skill.weapon.items.some(it => it.unique === 'ramaladnis')) add += p.res * sctx.flags.ramaladni;
      if (e.st.weakened && e.st.weakened.amp) add += e.st.weakened.amp;
    }
    if (e.st.trapAmp) add += e.st.trapAmp.v;
    if (e.inConsecration) add += 0.1;
    if (e.st.fear && sctx.flags.fear_amp) add += sctx.flags.fear_amp;
    if (info.mult) add += info.mult;
    let dmg = base * (1 + d.mainStatBonus) * (1 + Math.max(-0.9, add));
    // crit
    let crit = false, overpower = false;
    if (!info.isDot) {
      let cc = d.critChance + (p.buffStats.crit_chance || 0) + gstat('crit_chance', e, skill) - (sctx.flat.crit_chance || 0);
      if (skill) { cc += skill.critBonus; for (const m of skill.critBonusCond) if (Stats.condMet(m.when, cctx)) cc += m.add; }
      if (info.critBonus) cc += info.critBonus;
      if (sctx.flags.serration && tags.includes('bone')) cc += sctx.flags.serration * (p.res / p.maxRes);
      if (e.hp <= e.maxHp * 0.35) cc += gstat('crit_chance_vs_injured', e, skill);
      if (p.ambush > 0) cc = 1;
      if (sctx.flags.lupine_ferocity && tags.includes('werewolf')) { p.lupineHits++; if (p.lupineHits >= 6) { p.lupineHits = 0; cc = 1; add += e.hp <= e.maxHp * 0.35 ? 1.4 : 0.7; dmg = base * (1 + d.mainStatBonus) * (1 + add); } }
      crit = info.forcedCrit || U.chance(cc);
      if (crit) {
        let cd = d.critDmg + (p.buffStats.crit_dmg || 0) + (skill ? skill.critDmgBonus : 0) + gstat('crit_dmg', e, skill) - (sctx.flat.crit_dmg || 0);
        if (e.st.vulnerable) cd += gstat('crit_dmg_vs_vuln', e, skill);
        if (isCC(e)) cd += gstat('crit_dmg_vs_cc', e, skill);
        if (e.st.stun && e.st.stun.petrify) cd += e.elite && e.elite.rank === 'boss' ? 0.5 : 0.25;
        if (sctx.flags.serration_aspect && tags.includes('bone')) cd += sctx.flags.serration_aspect * (p.res / p.maxRes);
        dmg *= 1 + cd;
      }
      if (e.st.vulnerable) dmg *= 1 + d.vulnDmg + (p.buffStats.vuln_dmg || 0);
      // overpower
      let oc = d.overpowerChance + (p.buffStats.overpower_chance || 0);
      if (info.forcedOverpower || (skill && skill.eff.guaranteedOverpower) || p.nextOverpower || (info.rathma)) oc = 1;
      overpower = !info.minion && !info.noOverpower && U.chance(oc);
      if (overpower) { dmg *= 1 + d.overpowerDmg + (p.buffStats.overpower_dmg || 0) + gstat('overpower_dmg', e, skill) - (sctx.flat.overpower_dmg || 0); dmg += (p.hp + p.fortify) * 0.05; if (p.nextOverpower) p.nextOverpower = false; }
    }
    if (p.st.berserk) dmg *= 1 + (p.buffStats.dmg_berserk_mult || 0.25);
    if (e.st.weakened && e.st.weakened.takeMore) dmg *= 1 + e.st.weakened.takeMore;
    // enemy resist
    const res = (e.resist[element] || 0) - (e.resShred || 0);
    dmg *= 1 - U.clamp(res, -0.5, 0.9);
    if (e.suppressed && info.src !== p && false) dmg *= 1;
    if (e.elite && e.elite.affixes.some(a => a.suppress) && dist(p, e) > 4.5 && !info.isDot) dmg *= 1 - 0.7;
    if (e.shield > 0) { const absorbed = Math.min(e.shield, dmg); e.shield -= absorbed; dmg -= absorbed; }
    if (e.invuln) dmg = 0;
    dmg = Math.max(0, dmg);
    // apply
    e.hp -= dmg; e.hitFlash = 0.12; e.lastHitBy = info.src || p; e.lastHitSkill = skill;
    if (!info.isDot) { e.hitStun = Math.max(e.hitStun || 0, 0.08); addParticles(e.x, e.y, crit ? 10 : 4, DATA.ELEMENT_COLOR[element], crit ? 5 : 3, 0.35, 0.1); }
    if (dmg > 0) { const col = overpower ? '#7fb8ff' : crit ? '#ffe55c' : (element === 'physical' ? '#fff' : DATA.ELEMENT_COLOR[element]); if (!info.isDot || (e.dotTextTimer || 0) <= 0) addText(e.x + (Math.random() - 0.5) * 0.6, e.y - e.r - 0.3, U.fmtNum(dmg) + (overpower ? '!' : ''), col, info.isDot ? 0.65 : crit ? 1.25 : 0.9, crit || overpower); if (info.isDot) e.dotTextTimer = 0.45; }
    // thorns-like reflects not here. Lifesteal etc:
    if (!info.isDot && !info.minion) { if (d.lifeOnHit) heal(p, d.lifeOnHit, 'loh'); }
    if (info.minion && sctx.flags.golem_drain && info.minion.type === 'golem') heal(p, dmg * 0.02, 'loh');
    // triggers
    if (!info.noTrigger) {
      const tinfo = { target: e, skill, dmg, element, cast: info.cast, form: p.form };
      if (!info.isDot) {
        fireTriggers('hit', tinfo);
        if (info.first) fireTriggers('first_hit', Object.assign({ once: false }, tinfo));
        if (crit) fireTriggers('crit', tinfo);
        if (overpower) { fireTriggers('overpower', tinfo); fireTriggers('any_overpower', tinfo); }
        // lucky hit
        const lucky = (skill ? skill.lucky : 0.3) * (1 + d.luckyHit + (p.buffStats.lucky_hit || 0)) * (info.minion ? 0.5 : 1);
        if (U.chance(lucky)) {
          fireTriggers('lucky', Object.assign({ luckyMult: 1 }, tinfo));
          const luckyStats = [['lucky_vuln', { st: 'vulnerable', dur: 2 }], ['lucky_slow', { st: 'slow', pct: 0.4, dur: 2 }], ['lucky_stun', { st: 'stun', dur: 1.5 }], ['lucky_freeze', { st: 'freeze', dur: 1.5 }], ['lucky_immob', { st: 'immobilize', dur: 2 }], ['lucky_daze', { st: 'daze', dur: 2 }]];
          for (const [k, st] of luckyStats) { const ch = gstat(k, e, skill); if (ch > 0 && U.chance(ch)) applyStatus(e, st, p); }
          const dots = [['lucky_burn', 'burn'], ['lucky_poison', 'poison'], ['lucky_bleed', 'bleed']];
          for (const [k, st] of dots) { const ch = gstat(k, e, skill); if (ch > 0 && U.chance(ch)) addDot(e, st, dmg * 0.6, 4, p, { skill }); }
          if (U.chance(gstat('lucky_heal', e, skill))) heal(p, p.maxHp * 0.05);
          if (U.chance(gstat('lucky_fortify', e, skill))) fortify(p, 0.05);
          if (U.chance(gstat('lucky_barrier', e, skill))) barrier(p, p.maxHp * 0.1, 5);
          if (U.chance(gstat('lucky_resource', e, skill))) gainResource(p, p.maxRes * 0.1, true);
          if (U.chance(gstat('lucky_execute', e, skill)) && e.hp <= e.maxHp * 0.1 && (!e.elite || e.elite.rank !== 'boss')) { e.hp = 0; addText(e.x, e.y - e.r, 'EXECUTED', '#ff5a5a', 1.2, true); }
          if (e.st.decrepify) { if (sctx.flags.decrepify_stun && U.chance(sctx.flags.decrepify_stun)) applyStatus(e, { st: 'stun', dur: 2 }, p); if (sctx.flags.decrepify_cdr && U.chance(sctx.flags.decrepify_cdr)) Object.keys(p.cds).forEach(id => { p.cds[id] = Math.max(0, p.cds[id] - 1); }); }
          if (sctx.flags.shared_misery && isCC(e) && U.chance(sctx.flags.shared_misery)) { const other = nearestEnemy(e.x, e.y, 5, x => x !== e && !isCC(x)); if (other) { const cc = CC_STATUSES.find(s => e.st[s]); if (cc) applyStatus(other, { st: cc, dur: e.st[cc].dur }, p); } }
          if (sctx.flags.mendeln && S.minions.length >= 7 && U.chance(sctx.flags.mendeln)) S.minions.forEach(m => { m.empowered = true; });
        }
        if (sctx.flags.shadowblight && element === 'shadow') { applyStatus(e, { st: 'shadowblight', dur: 2 }, p); if (e.st.shadowblight) { p.shadowblightHits++; if (p.shadowblightHits >= 10) { p.shadowblightHits = 0; const bonus = 1.5 * (1 + (p.counters.decay || 0)); hitEnemy(e, { src: p, coef: bonus, element: 'shadow', tags: ['darkness'], noTrigger: true, mult: gstat('dmg_shadowblight', e, null) }); if (sctx.flags.decay_aspect) p.counters.decay = Math.min(sctx.flags.decay_aspect * 5, (p.counters.decay || 0) + sctx.flags.decay_aspect); if (sctx.flags.blighted_aspect) { p.counters.blighted = (p.counters.blighted || 0) + 1; if (p.counters.blighted >= 10) { p.counters.blighted = 0; addBuff(p, { id: 'blighted', dur: 10, mods: [{ stat: 'dmg', add: sctx.flags.blighted_aspect }] }); } } } } }
        if (sctx.flags.decrepify_execute && e.st.decrepify && e.hp > 0 && e.hp <= e.maxHp * sctx.flags.decrepify_execute && (!e.elite || e.elite.rank !== 'boss')) { e.hp = 0; addText(e.x, e.y - e.r, 'EXECUTED', '#ff5a5a', 1.2, true); }
        if (sctx.flags.sword_bleed && skill && skill.weapon.type && (skill.weapon.type === 'sword1h' || skill.weapon.type === 'sword2h')) addDot(e, 'bleed', dmg * 0.2, 5, p, { skill });
        if (skill && skill.weapon && skill.weapon.type && sctx.flags.walking_arsenal) { const k = skill.weapon.type === 'mace2h' ? 'bludgeon' : skill.weapon.twoHanded ? 'slash' : 'dual'; p.arsenal[k] = 6; }
        if (sctx.flags.expectant) { if (tags.includes('basic')) p.expectant = Math.min(0.3, p.expectant + sctx.flags.expectant); else if (tags.includes('core')) p.expectant = 0; }
        if (sctx.flags.upheaval_stack && skill && skill.id !== 'upheaval') p.upheavalStacks = Math.min(4, p.upheavalStacks + 1); else if (skill && skill.id === 'upheaval') p.upheavalStacks = 0;
        if (sctx.flags.veteran_brawler && tags.includes('core')) p.veteranBrawler = Math.min(0.4, p.veteranBrawler + sctx.flags.veteran_brawler); else if (skill && (skill.eff.kind === 'dash' || skill.eff.kind === 'leap')) p.veteranBrawler = 0;
        if (sctx.flags.protector && e.elite && e.elite.rank !== 'normal' && p.protectorCd <= 0) { p.protectorCd = 30; barrier(p, p.maxHp * sctx.flags.protector, 10); }
        if (sctx.flags.rend_extend_vuln && skill && skill.id === 'rend' && e.st.vulnerable) e.st.vulnerable.dur += 2;
        if (sctx.flags.tempest_roar === undefined && false) {}
        if (sctx.flags.exploit_glyph && !e.exploited) { e.exploited = true; applyStatus(e, { st: 'vulnerable', dur: 3 }, p); }
        if (p.ambush > 0) p.ambush = 0;
      }
      if (e.st.iron_maiden && false) {}
    }
    if (e.elite && e.elite.affixes.some(a => a.retaliate) && !info.isDot) { const a = e.elite.affixes.find(x => x.retaliate).retaliate; if (U.chance(a.chance)) for (let i = 0; i < a.count; i++) spawnEnemyProjectile(e, { speed: 7, coef: a.coef, element: a.element, dir: Math.random() * Math.PI * 2, range: 6 }); }
    if (e.hp <= 0 && !e.dead) killEnemy(e, info);
    return dmg;
  }
  Combat.hitEnemy = hitEnemy;

  // ------------------------------------------------------------- damage: enemy -> player / minion
  // info: {src: enemy, coef (of enemy base), element, isDot, ability}
  function damagePlayer(amount, info) {
    const p = S.player; if (p.dead) return 0;
    const sctx = S.sctx, d = sctx.d, src = info.src;
    if (p.immune > 0 || (p.buffs.some(b => b.immune))) { addText(p.x, p.y - 1, 'Immune', '#ddd', 0.7); return 0; }
    if (p.mounted) { p.mountHits++; if (p.mountHits >= 3) dismount(false); amount *= 0.5; }
    const cctx = { self: p, target: src };
    if (!info.isDot && U.chance(d.dodge)) { addText(p.x, p.y - 1, 'Dodge', '#9ad', 0.8); return 0; }
    let dmg = amount;
    if (src && src.st && src.st.decrepify) dmg *= 1 - src.st.decrepify.dmgRed;
    if (src && src.st && src.st.weakened) dmg *= 1 - src.st.weakened.dmgRed;
    if (src && src.shoutWeak) dmg *= 1 - src.shoutWeak;
    // block
    let blocked = false;
    if (!info.isDot && d.blockChance > 0 && S.char.equipment.offhand && S.char.equipment.offhand.type === 'shield' && U.chance(d.blockChance + (p.buffStats.block_chance || 0))) { blocked = true; dmg *= 1 - d.blockRed; addText(p.x, p.y - 1, 'Block', '#ffe9a0', 0.8); onBlock(src); }
    // armor & resist
    const lvl = src ? src.level : S.level;
    dmg *= 1 - Stats.armorDR(d.armor * (1 + (p.buffStats.armor_pct || 0)), lvl);
    const el = info.element || 'physical';
    if (el !== 'physical') { let r = d.res[el] + (p.buffStats.res_all || 0) + (p.buffStats[DATA.ELEMENT_RES_STAT[el]] || 0) - (S.diff.resPenalty || 0); r = U.clamp(r, -0.5, d.maxRes); dmg *= 1 - r; }
    // DR buckets
    const drs = [d.dr + (p.buffStats.dr || 0) + gstat('dr', src) - (sctx.flat.dr || 0)];
    const close = src && dist(p, src) <= 3.5;
    drs.push(close ? gstat('dr_close', src) : gstat('dr_distant', src));
    if (p.fortify >= p.hp && p.fortify > 0) { drs.push(0.1); drs.push(gstat('dr_fortified', src)); }
    if (p.hp <= p.maxHp * 0.35) drs.push(gstat('dr_injured', src));
    if (info.isDot) drs.push(gstat('dr_dot', src) + (p.buffStats.dr_dot || 0));
    if (src && src.elite && src.elite.rank !== 'normal') drs.push(gstat('dr_elite', src));
    if (src && isCC(src)) drs.push(gstat('dr_vs_cc', src));
    if (src && src.dots && src.dots.some(x => x.st === 'bleed')) drs.push(gstat('dr_vs_bleeding', src));
    if (src && src.dots && src.dots.some(x => x.st === 'poison')) drs.push(gstat('dr_vs_poisoned', src));
    if (isCC(p)) drs.push(gstat('dr_while_cc', src));
    if (p.barrier > 0) drs.push(gstat('dr_barrier', src));
    if (sctx.flags.stand_alone) drs.push(Math.max(0, sctx.flags.stand_alone - 0.02 * S.minions.length));
    if (sctx.flags.hardened_bones && S.minions.length >= 7) drs.push(sctx.flags.hardened_bones);
    if (sctx.flags.bul_kathos_dr && S.zones.some(z => z.drInside && U.dist(z.x, z.y, p.x, p.y) <= z.radius)) drs.push(sctx.flags.bul_kathos_dr);
    if (sctx.flags.golem_absorb && S.minions.some(m => m.type === 'golem' && !m.dead)) { const g = S.minions.find(m => m.type === 'golem' && !m.dead); const share = dmg * 0.15; g.hp -= share; dmg -= share; if (g.hp <= 0) killMinion(g); }
    for (const r of drs) dmg *= 1 - U.clamp(r, 0, 0.9);
    dmg = Math.max(0, dmg);
    // barrier absorb
    if (p.barrier > 0 && dmg > 0) { let rem = dmg; for (const b of p.barriers) { const a = Math.min(b.amt, rem); b.amt -= a; rem -= a; if (rem <= 0) break; } p.barriers = p.barriers.filter(b => b.amt > 0); p.barrier = p.barriers.reduce((s, b) => s + b.amt, 0); dmg = rem; }
    p.hp -= dmg; p.fortify = Math.max(0, p.fortify - dmg);
    p.lastDamagedAt = S.t;
    if (dmg > 0) { addText(p.x + (Math.random() - 0.5) * 0.5, p.y - 1.1, '-' + U.fmtNum(dmg), '#ff6a6a', 0.85); S.shake = Math.min(0.5, S.shake + dmg / p.maxHp); }
    if (p.portal > 0 && dmg > 0) { p.portal = 0; log('Town portal interrupted!', '#ff8'); }
    if (!info.isDot) {
      fireTriggers('damaged', { target: src });
      if (sctx.flags.holy_vengeance && p.hvCd <= 0) { p.holyVengeance = 1; p.hvCd = 2; }
      const cs = p.buffs.find(b => b.id === 'challenging_shout'); if (cs && cs.furyOnDamaged) gainResource(p, cs.furyOnDamaged, true);
      // thorns
      if (src && src.kind === 'enemy' && !src.dead && d.thorns > 0 && info.direct) { let th = d.thorns * (1 + (p.buffStats.thorns_pct || 0)); if (cs && cs.thornsFromLife) th += p.maxHp * cs.thornsFromLife; hitEnemy(src, { src: p, baseDmgOverride: th, element: 'physical', tags: [], noTrigger: true, noOverpower: true, mult: -gstat('dmg', src) }); if (sctx.flags.thorns_vuln && U.chance(sctx.flags.thorns_vuln)) applyStatus(src, { st: 'vulnerable', dur: 2 }, p); }
      if (src && src.st && src.st.iron_maiden && !src.dead) { let coef = src.st.iron_maiden.coef; if (sctx.flags.iron_maiden_mass && S.enemies.filter(x => !x.dead && x.st.iron_maiden).length >= 3) coef *= 1 + sctx.flags.iron_maiden_mass; hitEnemy(src, { src: p, coef, element: 'physical', tags: ['blood', 'curse'], noTrigger: true }); }
      if (src && src.elite) { const ls = src.elite.affixes.find(a => a.lifesteal); if (ls) src.hp = Math.min(src.maxHp, src.hp + dmg * ls.lifesteal); }
      if (src && src.def && src.def.abilities) { const ls = src.def.abilities.find(a => a.kind === 'lifesteal'); if (ls) src.hp = Math.min(src.maxHp, src.hp + dmg * ls.pct); }
      if (sctx.flags.retribution_stun && src && dist(p, src) > 3.5 && U.chance(sctx.flags.retribution_stun)) applyStatus(src, { st: 'stun', dur: 2 }, p);
    }
    if (p.hp <= 0) {
      if (sctx.flags.guardian_angel && !p.guardianUsed) { p.guardianUsed = true; p.hp = p.maxHp * 0.4; p.unstoppable = 3; addText(p.x, p.y - 1.5, 'GUARDIAN ANGEL', '#fff2a6', 1.3, true); }
      else playerDie();
    }
    return dmg;
  }
  Combat.damagePlayer = damagePlayer;
  function onBlock(src) {
    const p = S.player, sctx = S.sctx;
    if (sctx.flags.bulwark_of_light) barrier(p, p.maxHp * 0.1, 4);
    if (sctx.flags.block_heal) heal(p, p.maxHp * sctx.flags.block_heal);
    if (sctx.flags.holy_bulwark && U.chance(sctx.flags.holy_bulwark)) { fortify(p, 0.05); if (p.cds.holy_shield) p.cds.holy_shield = Math.max(0, p.cds.holy_shield - 1); }
    if (sctx.flags.herald && src && !src.dead) { enemiesIn(p.x, p.y, 3).forEach(e => hitEnemy(e, { src: p, coef: sctx.flags.herald, element: 'holy', tags: ['holy'], noTrigger: true })); }
  }
  function damageMinion(m, amount, info) {
    if (m.dead) return;
    let dmg = amount * (1 - S.sctx.d.minionDr);
    if (S.sctx.flags.minion_dmg_cap) dmg = Math.min(dmg, m.maxHp * S.sctx.flags.minion_dmg_cap);
    if (m.immune) return;
    m.hp -= dmg; m.hitFlash = 0.1;
    if (S.sctx.flags.mage_fortify && m.type === 'mage') fortify(S.player, 0.01);
    if (m.hp <= 0) killMinion(m);
  }
  function playerDie() {
    const p = S.player; p.dead = true; p.hp = 0; p.channel = null; S.char.record.deaths++;
    log('You have died.', '#f66');
    if (S.hooks.onDeath) S.hooks.onDeath();
  }
  Combat.revive = function (where) {
    const p = S.player; p.dead = false; p.hp = p.maxHp; p.fortify = 0; p.barriers = []; p.barrier = 0; cleanse(p); p.immune = 3; p.res = S.char.cls === 'barbarian' || S.char.cls === 'druid' ? 0 : p.maxRes; p.potions = Math.max(p.potions, 2);
    if (where === 'start' || S.mode === 'boss') {
      S.enemies = S.enemies.filter(e => e.elite && e.elite.rank === 'boss');
      S.enemies.forEach(e => { e.hp = e.maxHp; e.x = S.w / 2; e.y = S.h / 2; e.dots = []; e.st = {}; });
      S.projectiles = []; S.zones = S.zones.filter(z => z.owner === p);
      p.x = S.w / 2; p.y = S.h - 6;
    } else { S.enemies.forEach(e => { if (dist(e, p) < 6) { e.x += (e.x - p.x); e.y += (e.y - p.y); } }); }
  };

  // ------------------------------------------------------------- expose internals to part 2
  Combat._ = { dist, nearestEnemy, enemiesIn, enemiesInSector, alliesIn, addText, addParticles, schedule, log, isCC, isHardCC, resolveObstacles, applyStatus, addDot, cleanse, addBuff, recomputeBuffStats, gstat, gainResource, spendResource, heal, fortify, barrier, fireTriggers, doEffect, hitEnemy, damagePlayer, damageMinion, playerDie, weaponAvg, CC_STATUSES, HARD_CC, DOT_KINDS,
    get S() { return S; }, set S(v) { S = v; } };
  // functions defined in part 2 (combat2.js) are attached onto Combat._ and referenced via these forwarders
  function spawnCorpse(x, y) { return Combat._.spawnCorpse(x, y); }
  function spawnOrb(x, y) { return Combat._.spawnOrb(x, y); }
  function spawnProjectile(o) { return Combat._.spawnProjectile(o); }
  function spawnZone(o) { return Combat._.spawnZone(o); }
  function spawnEnemyProjectile(e, o) { return Combat._.spawnEnemyProjectile(e, o); }
  function killEnemy(e, info) { return Combat._.killEnemy(e, info); }
  function killMinion(m) { return Combat._.killMinion(m); }
  function spawnBoss(def) { return Combat._.spawnBoss(def); }
  function spawnPersistentMinions(revive) { return Combat._.spawnPersistentMinions(revive); }
  function dismount(attack) { return Combat._.dismount(attack); }
  Combat._.buildMap = buildMap; Combat._.setupMode = setupMode;
  window.Combat = Combat;
})();
