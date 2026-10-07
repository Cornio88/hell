/* Sanctuary — combat simulation part 2: spawning, skills, AI, update loop. Extends global Combat. */
(function () {
  'use strict';
  const C = Combat, _ = Combat._;
  const { dist, nearestEnemy, enemiesIn, enemiesInSector, alliesIn, addText, addParticles, schedule, log, isCC, isHardCC, resolveObstacles, applyStatus, addDot, cleanse, addBuff, recomputeBuffStats, gstat, gainResource, spendResource, heal, fortify, barrier, fireTriggers, doEffect, hitEnemy, damagePlayer, damageMinion, weaponAvg, CC_STATUSES } = _;
  const S = () => _.S;

  // ------------------------------------------------------------- spawning
  function pickEnemyDef(level, families) {
    const pool = DATA.ENEMIES.filter(e => families.includes(e.family) && e.minLevel <= Math.max(level, 3));
    const list = pool.length ? pool : DATA.ENEMIES.filter(e => e.minLevel <= 5);
    return U.pickWeighted(list, e => e.weight);
  }
  function makeEnemy(def, x, y, level, rank, opts) {
    const s = S(); const rankDef = DATA.ELITE_RANKS[rank] || DATA.ELITE_RANKS.normal;
    const diff = s.diff;
    const isBoss = rank === 'boss';
    const hp = Stats.enemyBaseHp(level) * def.hp * rankDef.hp * diff.hp * (isBoss ? 1 : 1) * (s.area.pit ? 1 + s.floor * 0.15 : 1);
    const e = { kind: 'enemy', id: U.uid('en'), def, x, y, r: def.r, team: 1, level, hp, maxHp: hp, dmg: Stats.enemyBaseDmg(level) * def.dmg * rankDef.dmg * diff.dmg, speed: def.speed, elite: { rank, affixes: [] }, st: {}, dots: [], resist: Object.assign({}, def.resist), shield: 0, invuln: false, hidden: false,
      ai: { target: null, timer: Math.random(), windup: 0, abilityCds: {}, charging: null, state: 'idle', strafe: Math.random() < 0.5 ? 1 : -1, fuse: -1, telegraph: null, lastAbility: 0 }, abilities: def.abilities.slice(), phaseIdx: 0, summoned: 0, hitFlash: 0, hitStun: 0, dead: false, dotTextTimer: 0, atkCd: def.atkCd, range: def.range, facing: 0, color: def.color, enraged: 0, unstoppable: 0, buffed: 0, spawnT: s.t, hpCapAnim: 0 };
    if (rank !== 'normal' && rank !== 'boss') { e.r *= 1.15; const n = rankDef.affixes; const pool = U.shuffle(DATA.ELITE_AFFIXES); e.elite.affixes = pool.slice(0, n); e.elite.affixes.forEach(a => { if (a.speedMult) e.speed *= a.speedMult; if (a.unstoppable) e.unstoppable = 9999; }); e.name = (rank === 'superunique' ? U.pick(['Blood', 'Bone', 'Dread', 'Grim', 'Vile', 'Ash']) + ' ' + def.name : def.name); }
    else e.name = def.name;
    if (opts && opts.summonedBy) { e.summonedBy = opts.summonedBy; e.hp = e.maxHp = hp * 0.6; }
    return e;
  }
  // ------------------------------------------------------------- navigation grid (flow field toward the player)
  function buildNav() {
    const s = S(); const cell = 1; const cols = Math.ceil(s.w / cell), rows = Math.ceil(s.h / cell);
    const blocked = new Uint8Array(cols * rows);
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) blocked[r * cols + c] = Layout.blockedAt(s.obstacles, (c + 0.5) * cell, (r + 0.5) * cell, 0.45) ? 1 : 0;
    s.nav = { cell, cols, rows, blocked, dist: new Int16Array(cols * rows).fill(-1), t: -9, queue: new Int32Array(cols * rows) };
  }
  function updateNav() {
    const s = S(), n = s.nav; if (!n) return; n.t = s.t;
    const p = s.player; const { cols, rows, blocked, dist, queue } = n; dist.fill(-1);
    const sc = U.clamp(Math.floor(p.x / n.cell), 0, cols - 1), sr = U.clamp(Math.floor(p.y / n.cell), 0, rows - 1);
    let head = 0, tail = 0; const start = sr * cols + sc; dist[start] = 0; queue[tail++] = start;
    while (head < tail) {
      const cur = queue[head++]; const cr = Math.floor(cur / cols), cc = cur - cr * cols; const d = dist[cur];
      for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
        if (!dr && !dc) continue; const nr = cr + dr, nc = cc + dc; if (nr < 0 || nc < 0 || nr >= rows || nc >= cols) continue;
        const ni = nr * cols + nc; if (blocked[ni] || dist[ni] >= 0) continue;
        if (dr && dc && (blocked[cr * cols + nc] || blocked[nr * cols + cc])) continue; // no corner cutting
        dist[ni] = d + 1; queue[tail++] = ni;
      }
    }
  }
  function navDist(x, y) { const n = S().nav; if (!n) return 0; const c = U.clamp(Math.floor(x / n.cell), 0, n.cols - 1), r = U.clamp(Math.floor(y / n.cell), 0, n.rows - 1); return n.dist[r * n.cols + c]; }
  function navAngle(e) {
    const n = S().nav; if (!n) return null;
    const c = U.clamp(Math.floor(e.x / n.cell), 0, n.cols - 1), r = U.clamp(Math.floor(e.y / n.cell), 0, n.rows - 1);
    let best = -1, bd = 1e9, bx = 0, by = 0; const here = n.dist[r * n.cols + c];
    for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) { const nr = r + dr, nc = c + dc; if (nr < 0 || nc < 0 || nr >= n.rows || nc >= n.cols) continue; const ni = nr * n.cols + nc; const d = n.dist[ni]; if (d < 0 || n.blocked[ni]) continue; if (dr && dc && (n.blocked[r * n.cols + nc] || n.blocked[nr * n.cols + c])) continue; if (d < bd) { bd = d; best = ni; bx = (nc + 0.5) * n.cell; by = (nr + 0.5) * n.cell; } }
    if (best < 0 || (here >= 0 && bd >= here && here > 0)) return null;
    return U.angleTo(e.x, e.y, bx, by);
  }
  function hasLOS(a, b) { const s = S(); const d = U.dist(a.x, a.y, b.x, b.y); const steps = Math.ceil(d / 0.6); for (let i = 1; i < steps; i++) { const t = i / steps; if (Layout.pointInside(s.obstacles, a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t)) return false; } return true; }
  C.hasLOS = hasLOS;
  // Nearest walkable cell centre to (x, y); when the nav grid exists it must also be reachable from the player.
  function freeSpotNear(x, y, maxR) {
    const s = S(); maxR = maxR || 8;
    const ok = (px, py) => px > 1 && py > 1 && px < s.w - 1 && py < s.h - 1 && !Layout.blockedAt(s.obstacles, px, py, 0.6) && (!s.nav || navDist(px, py) >= 0);
    if (ok(x, y)) return { x, y };
    let best = null, bd = 1e9;
    for (let dy = -maxR; dy <= maxR; dy++) for (let dx = -maxR; dx <= maxR; dx++) { const px = Math.floor(x) + dx + 0.5, py = Math.floor(y) + dy + 0.5; const d = dx * dx + dy * dy; if (d >= bd || !ok(px, py)) continue; bd = d; best = { x: px, y: py }; }
    return best || { x, y };
  }
  function spawnPoint(nearPlayer) {
    const s = S(), p = s.player;
    if (!nearPlayer && s.nav) {
      // prefer reachable cells 8-16 path steps away from the player
      for (let i = 0; i < 40; i++) { const a = Math.random() * Math.PI * 2, d = 9 + Math.random() * 8; const x = p.x + Math.cos(a) * d, y = p.y + Math.sin(a) * d; if (x < 1 || y < 1 || x > s.w - 1 || y > s.h - 1) continue; const nd = navDist(x, y); if (nd >= 8 && nd <= 22 && !Layout.blockedAt(s.obstacles, x, y, 0.8)) return { x, y }; }
      // fallback: any reachable cell within range
      for (let i = 0; i < 60; i++) { const x = 1 + Math.random() * (s.w - 2), y = 1 + Math.random() * (s.h - 2); const nd = navDist(x, y); if (nd >= 6 && nd <= 30 && !Layout.blockedAt(s.obstacles, x, y, 0.8)) return { x, y }; }
    }
    return spawnPointLegacy(nearPlayer);
  }
  function spawnPointLegacy(nearPlayer) {
    const s = S(), p = s.player;
    for (let i = 0; i < 20; i++) {
      const a = Math.random() * Math.PI * 2, d = nearPlayer ? 3 + Math.random() * 3 : 10 + Math.random() * 6;
      const x = p.x + Math.cos(a) * d, y = p.y + Math.sin(a) * d;
      if (x > 1 && y > 1 && x < s.w - 1 && y < s.h - 1 && !Layout.blockedAt(s.obstacles, x, y, 0.8)) return { x, y };
    }
    return { x: U.clamp(p.x + 8, 1, s.w - 1), y: U.clamp(p.y - 8, 1, s.h - 1) };
  }
  function spawnPack(size, eliteRank) {
    const s = S(); const families = s.area.families || s.zone.families;
    const pt = spawnPoint(false);
    const leadDef = pickEnemyDef(s.level, families);
    const packDefs = [leadDef];
    const fam = DATA.ENEMIES.filter(e => e.family === leadDef.family && e.minLevel <= Math.max(s.level, 3));
    for (let i = 1; i < size; i++) packDefs.push(U.chance(0.7) && fam.length ? U.pickWeighted(fam, e => e.weight) : pickEnemyDef(s.level, families));
    packDefs.forEach((def, i) => {
      const ox = (Math.random() - 0.5) * 3, oy = (Math.random() - 0.5) * 3;
      const rank = i === 0 && eliteRank ? eliteRank : 'normal';
      let ex = U.clamp(pt.x + ox, 1, s.w - 1), ey = U.clamp(pt.y + oy, 1, s.h - 1); if (Layout.blockedAt(s.obstacles, ex, ey, 0.6)) { ex = pt.x; ey = pt.y; }
      const e = makeEnemy(def, ex, ey, s.level, rank);
      if (rank === 'elite' || rank === 'superunique') { for (let k = 1; k < size; k++) { } }
      s.enemies.push(e); s.spawned++;
    });
    if (eliteRank === 'elite' || eliteRank === 'superunique') { for (let k = 0; k < 2; k++) { const d = packDefs[0]; const m = makeEnemy(d, pt.x + (Math.random() - 0.5) * 2, pt.y + (Math.random() - 0.5) * 2, s.level, 'normal'); m.minion = true; s.enemies.push(m); } }
    s.packIndex++;
  }
  function spawnBoss(def) {
    const s = S();
    const lvl = Math.max(s.level, def.level);
    const pt = freeSpotNear(s.w / 2, s.h / 2 - 2, 6);
    const e = makeEnemy(Object.assign({}, def, { abilities: def.abilities }), pt.x, pt.y, lvl, 'boss');
    e.maxHp = e.hp = Stats.enemyBaseHp(lvl) * def.hp * s.diff.hp;
    e.dmg = Stats.enemyBaseDmg(lvl) * def.dmg * s.diff.dmg;
    e.boss = def; e.name = def.name; e.r = def.r; e.speed = def.speed; e.resist = Object.assign({}, def.resist); e.phases = def.phases.slice();
    s.enemies.push(e); s.bossRef = e;
    log(def.name + ' appears!', '#b36cff');
    return e;
  }
  function spawnSummoned(id, x, y, by, count) {
    const s = S(); const def = DATA.enemyById[id]; if (!def) return;
    for (let i = 0; i < count; i++) { const e = makeEnemy(def, U.clamp(x + (Math.random() - 0.5) * 2, 1, s.w - 1), U.clamp(y + (Math.random() - 0.5) * 2, 1, s.h - 1), s.level, 'normal', { summonedBy: by }); e.noLoot = true; s.enemies.push(e); by.summoned++; }
  }
  function spawnCorpse(x, y) { const s = S(); if (s.char.cls !== 'necromancer' && s.char.cls !== 'paladin') return; if (s.corpses.length >= 25) s.corpses.shift(); s.corpses.push({ x, y, t: 12 }); fireTriggers('corpse_form', {}); }
  function spawnOrb(x, y) { const s = S(); if (s.orbs.length > 20) s.orbs.shift(); s.orbs.push({ x: x + (Math.random() - 0.5), y: y + (Math.random() - 0.5), t: 10 }); }
  function consumeCorpse(c) { const s = S(); s.corpses.splice(s.corpses.indexOf(c), 1); fireTriggers('corpse_consume', {}); }
  function nearestCorpse(x, y, maxR) { const s = S(); let best = null, bd = maxR; for (const c of s.corpses) { const d = U.dist(x, y, c.x, c.y); if (d < bd) { bd = d; best = c; } } return best; }

  // projectiles: owner team 0 (player/minion) or 1 (enemy)
  function spawnProjectile(o) {
    const s = S();
    const pr = Object.assign({ id: U.uid('pr'), team: 0, traveled: 0, hit: new Set(), tickT: 0, t: 0, alive: true, size: o.radius || 0.4 }, o);
    pr.vx = Math.cos(pr.dir) * pr.speed; pr.vy = Math.sin(pr.dir) * pr.speed;
    s.projectiles.push(pr);
    return pr;
  }
  function spawnEnemyProjectile(e, o) {
    const dir = o.dir !== undefined ? o.dir : U.angleTo(e.x, e.y, S().player.x, S().player.y);
    return spawnProjectile({ team: 1, x: e.x, y: e.y, dir, speed: o.speed || 10, range: o.range || 14, radius: o.radius || 0.4, pierce: o.pierce || 0, coef: o.coef, element: o.element || 'physical', owner: e, apply: o.apply, homing: o.homing, color: DATA.ELEMENT_COLOR[o.element || 'physical'] });
  }
  function spawnZone(o) { const s = S(); if (s.zones.length > 60) s.zones.shift(); const z = Object.assign({ id: U.uid('z'), t: 0, tickT: 0, team: 0 }, o); s.zones.push(z); return z; }
  function spawnTelegraph(e, o) { e.ai.telegraph = Object.assign({ t: 0 }, o); }

  // minions
  const MINION_DEFS = {
    skeleton: { name: 'Skeletal Warrior', hp: 0.35, dmg: 0.3, speed: 4.6, r: 0.4, range: 1.3, atkCd: 1.0, color: '#e8e2d0', melee: true },
    mage: { name: 'Skeletal Mage', hp: 0.25, dmg: 0.45, speed: 3.8, r: 0.4, range: 8, atkCd: 1.6, color: '#b8d0ff', ranged: true },
    golem: { name: 'Golem', hp: 1.6, dmg: 0.7, speed: 3.8, r: 0.75, range: 1.6, atkCd: 1.4, color: '#8a9a7a', melee: true },
    wolf: { name: 'Wolf', hp: 0.4, dmg: 0.35, speed: 5.4, r: 0.42, range: 1.3, atkCd: 0.9, color: '#8a8a8a', melee: true },
    raven: { name: 'Raven', hp: 0.2, dmg: 0.2, speed: 6, r: 0.3, range: 6, atkCd: 1.4, color: '#2a2a3a', ranged: true, flying: true },
    creeper: { name: 'Poison Creeper', hp: 0.3, dmg: 0.25, speed: 0, r: 0.35, range: 5, atkCd: 2.0, color: '#4a8a3a', caster: true },
    ancient: { name: 'Ancient', hp: 1.2, dmg: 0.9, speed: 5, r: 0.6, range: 1.6, atkCd: 1.0, color: '#c9a86a', melee: true },
    volatile_skeleton: { name: 'Volatile Skeleton', hp: 0.3, dmg: 0, speed: 6, r: 0.4, range: 1.2, atkCd: 9, color: '#ffd090', exploder: true }
  };
  C.MINION_DEFS = MINION_DEFS;
  function spawnMinion(type, opts) {
    const s = S(), p = s.player, sctx = s.sctx, def = MINION_DEFS[type];
    const mm = sctx.minionMods[type] || { dmg: 0, life: 0 };
    const hp = p.maxHp * def.hp * (1 + sctx.d.minionLife + (mm.life || 0));
    const m = Object.assign({ kind: 'minion', id: U.uid('mn'), type, def, x: p.x + (Math.random() - 0.5) * 2, y: p.y + (Math.random() - 0.5) * 2, r: def.r, team: 0, hp, maxHp: hp, speed: def.speed, range: def.range, atkCd: def.atkCd, cd: Math.random(), st: {}, dots: [], dead: false, hitFlash: 0, dmgBase: weaponAvg(null) * def.dmg, element: 'physical', dur: 0, lifeT: 0, empowered: false, color: def.color }, opts || {});
    s.minions.push(m);
    return m;
  }
  function spawnPersistentMinions(revive) {
    const s = S(), char = s.char, sctx = s.sctx;
    if (char.cls === 'necromancer') {
      const bod = char.mechanics.bookOfDead || {};
      const want = (k, type, base) => { const sel = bod[k]; if (!sel || sel.opt === 'sacrifice') return; const count = base + (sctx.minionCount[type] || 0) + (sel.upgraded && k === 'skeletal_warriors' && sel.opt === 'skirmishers' ? 1 : 0); const have = s.minions.filter(m => m.type === type && !m.dead).length; for (let i = have; i < count; i++) { const m = spawnMinion(type); if (type === 'mage') { m.element = DATA.bookOfDead.skeletal_mages.options[sel.opt].element || 'shadow'; m.variant = sel.opt; } else m.variant = sel.opt; if (type === 'golem') m.variant = sel.opt; } };
      want('skeletal_warriors', 'skeleton', 4); want('skeletal_mages', 'mage', 3); want('golem', 'golem', 1);
    }
    if (char.cls === 'druid') {
      ['wolves', 'ravens', 'poison_creeper'].forEach(id => {
        if (!(sctx.ranks[id] > 0)) return;
        const res = sctx.skills[id] || Stats.resolveSkill(sctx, DATA.skillById[id]);
        const type = res.eff.companion; const count = (res.eff.companionCount || 1) + (type === 'raven' ? (res.eff.companionCount ? 0 : 0) : 0);
        const have = s.minions.filter(m => m.type === type && !m.dead).length;
        for (let i = have; i < count; i++) { const m = spawnMinion(type); m.skillId = id; if (type === 'creeper') { m.x = s.player.x; m.y = s.player.y; m.follow = true; } }
      });
    }
  }
  function killMinion(m) { m.dead = true; addParticles(m.x, m.y, 8, m.color, 3, 0.4); if (m.type === 'volatile_skeleton') explodeVolatile(m); const s = S(); if (!m.temp && (m.type === 'skeleton' || m.type === 'mage' || m.type === 'golem' || m.type === 'wolf' || m.type === 'raven' || m.type === 'creeper')) { m.respawn = 8; } }
  function explodeVolatile(m) { const s = S(); const res = s.sctx.skills.army_of_the_dead; const coef = res ? res.coef : 0.6; enemiesIn(m.x, m.y, 2.2).forEach(e => hitEnemy(e, { src: s.player, skill: res, coef, element: 'physical', tags: ['summoning', 'bone', 'ultimate'], minion: m })); addParticles(m.x, m.y, 16, '#ffd090', 5, 0.5); if (res && res.eff.corpseChance && U.chance(res.eff.corpseChance)) spawnCorpse(m.x, m.y); }

  // ------------------------------------------------------------- kill & loot
  function killEnemy(e, info) {
    const s = S(), p = s.player, sctx = s.sctx, char = s.char;
    e.dead = true; e.deathT = 0;
    addParticles(e.x, e.y, 14, e.color, 4, 0.5, 0.14);
    if (s.bloodDecals.length > 40) s.bloodDecals.shift(); s.bloodDecals.push({ x: e.x + (Math.random() - 0.5) * 0.5, y: e.y + (Math.random() - 0.5) * 0.5, r: 0.5 + e.r * 0.8, t: 0, color: e.def.shape === 'skull' || e.def.shape === 'construct' ? '#4a4a40' : e.def.shape === 'ghost' ? null : '#5a0a0a' });
    const rank = e.elite.rank;
    s.kills++; char.record.kills++;
    if (rank !== 'normal' && rank !== 'boss') { s.eliteKills++; char.record.eliteKills++; }
    if (rank === 'boss') { char.record.bossKills++; s.bossKilled = true; }
    // xp
    const xp = Player.xpForKill(char, e.level, e.def.xp * DATA.ELITE_RANKS[rank].xp * (e.summonedBy ? 0.3 : 1), s.diff);
    const gained = Player.addXp(char, xp); s.xpGained += xp;
    if (gained.levels) { onLevelUp(gained.levels); }
    if (gained.paragon) { addText(p.x, p.y - 1.8, 'PARAGON LEVEL ' + char.paragonLevel, '#b36cff', 1.3, true); log('Paragon level ' + char.paragonLevel + '!', '#b36cff'); Player.recompute(char); s.sctx = char.sctx; }
    // drops
    if (!e.noLoot) {
      const bossLoot = rank === 'boss' && e.boss ? DATA.BOSS_LOOT[e.boss.id] : null;
      const drops = Items.rollDrops(char, e.level, rank, s.diff, bossLoot);
      drops.forEach((d, i) => { const a = Math.random() * Math.PI * 2, r = rank === 'boss' ? 1 + Math.random() * 2.5 : Math.random() * 1.2; s.drops.push(Object.assign({ x: e.x + Math.cos(a) * r, y: e.y + Math.sin(a) * r, t: 0 }, d)); });
    }
    if (rank === 'boss' && e.boss && e.boss.id === 'lilith_echo' && U.chance(0.1) && !s.account.mounts.includes('temptation')) { s.account.mounts.push('temptation'); log('Mount unlocked: Temptation!', '#ff4a6a'); }
    // corpse / orbs
    if (char.cls === 'necromancer' || char.cls === 'paladin') spawnCorpse(e.x, e.y);
    if (char.cls === 'necromancer' && U.chance(0.1)) spawnOrb(e.x, e.y);
    // on-kill effects
    if (sctx.d.lifeOnKill) heal(p, sctx.d.lifeOnKill, 'lok');
    const rok = sctx.flat.resource_on_kill || 0; if (rok) gainResource(p, rok, true);
    if (sctx.flat.move_speed_kill) addBuff(p, { id: 'mskill', dur: 3, mods: [{ stat: 'move_speed', add: sctx.flat.move_speed_kill }] });
    const skill = info && info.skill;
    fireTriggers('kill', { target: e, skill, form: p.form });
    fireTriggers('any_kill', { target: e, skill });
    if (sctx.flags.iron_maiden_heal && e.st.iron_maiden) heal(p, p.maxHp * sctx.flags.iron_maiden_heal);
    if (skill && skill.eff.resetOnKill) p.cds[skill.id] = 0;
    for (const b of p.buffs) if (b.extendOnKill && b.extended < (b.extendMax || 0)) { b.extended = (b.extended || 0) + b.extendOnKill; b.dur += b.extendOnKill; }
    if (sctx.flags.obsidian_slam) { p.counters.obsidian = (p.counters.obsidian || 0) + 1; if (p.counters.obsidian >= 10) { p.counters.obsidian = 0; p.nextOverpower = true; } }
    if (sctx.flags.hunters_zenith && skill && skill.tags.includes('shapeshift')) { if (skill.tags.includes('werewolf')) p.counters.hz_free_bear = 1; else p.counters.hz_heal_wolf = 1; }
    if (sctx.flags.waxing_gibbous && skill && skill.id === 'shred') p.stealth = 2;
    if (e.elite.affixes.some(a => a.deathExplode)) { const a = e.elite.affixes.find(x => x.deathExplode).deathExplode; spawnTelegraphExplosion(e.x, e.y, a.radius, 0.8, e.dmg * a.coef, a.element, e); }
    if (e.def.abilities.some(a => a.kind === 'explode') && e.ai.fuse < 0) { const a = e.def.abilities.find(x => x.kind === 'explode'); explodeEnemy(e, a); }
    // avenger
    s.enemies.forEach(o => { if (!o.dead && o.elite.affixes.some(a => a.avenger) && dist(o, e) < 8) o.enraged = Math.min(1, o.enraged + 0.15); });
    // hooks (quests, records)
    if (s.hooks.onKill) s.hooks.onKill(e);
    if (e.boss) { log(e.boss.name + ' has been slain!', '#ffe55c'); if (s.hooks.onBoss) s.hooks.onBoss(e.boss); }
    // frenzy stacks etc. nothing
  }
  function onLevelUp(n) {
    const s = S(), p = s.player, char = s.char;
    Player.recompute(char); s.sctx = char.sctx;
    const d = s.sctx.d; p.maxHp = d.maxLife; p.hp = p.maxHp; p.maxRes = d.maxResource;
    addText(p.x, p.y - 1.8, 'LEVEL ' + char.level + '!', '#ffe55c', 1.5, true); addParticles(p.x, p.y, 30, '#ffe55c', 5, 0.8, 0.14);
    log('Level ' + char.level + '! +' + n + ' skill point' + (n > 1 ? 's' : '') + '.', '#ffe55c');
    Player.syncPassiveObjectives(char);
    if (s.hooks.onLevel) s.hooks.onLevel();
  }
  function explodeEnemy(e, a) { const s = S(); addParticles(e.x, e.y, 20, DATA.ELEMENT_COLOR[a.element || 'fire'], 6, 0.5, 0.16); alliesIn(e.x, e.y, a.radius).forEach(t => t.kind === 'player' ? damagePlayer(e.dmg * a.coef, { src: e, element: a.element }) : damageMinion(t, e.dmg * a.coef, {})); if (a.pool) spawnZone({ team: 1, x: e.x, y: e.y, radius: a.radius * 0.8, dur: a.pool.dur, interval: 0.5, coef: a.pool.coef * 0.5, element: a.element, owner: e, dmgBase: e.dmg }); if (a.spawn) spawnSummoned(a.spawn.id, e.x, e.y, e, a.spawn.count); }
  function spawnTelegraphExplosion(x, y, radius, delay, dmg, element, src) { const s = S(); s.zones.push({ id: U.uid('tg'), team: 1, x, y, radius, dur: delay, t: 0, telegraph: true, onEnd: () => { addParticles(x, y, 20, DATA.ELEMENT_COLOR[element], 6, 0.5, 0.16); alliesIn(x, y, radius).forEach(t => t.kind === 'player' ? damagePlayer(dmg, { src, element }) : damageMinion(t, dmg, {})); }, color: DATA.ELEMENT_COLOR[element] }); }

  // ------------------------------------------------------------- skill casting
  function aimFor(res, range) {
    const s = S(), p = s.player;
    const r = range || (res.eff.range || 8) + 2;
    let target = s.input.aim && !s.input.aim.dead ? s.input.aim : null;
    if (!target || dist(p, target) > r + 4) target = nearestEnemy(p.x, p.y, r);
    const dir = target ? U.angleTo(p.x, p.y, target.x, target.y) : p.facing;
    return { target, dir };
  }
  C.canCast = function (slot) {
    const s = S(); if (!s) return false; const p = s.player; const id = s.char.skills.bar[slot]; if (!id) return false; const res = s.sctx.skills[id]; if (!res) return false;
    if (p.dead || p.mounted) return false;
    if ((p.cds[id] || 0) > 0 && !(res.eff.kind === 'channel' && p.channel && p.channel.id === id)) return false;
    if (res.cost > 0 && p.res < res.cost && !(res.eff.kind === 'channel' && p.channel && p.channel.id === id) && !(p.counters.hz_free_bear && res.tags.includes('werebear'))) return false;
    if (res.eff.kind === 'corpse' && !nearestCorpse(p.x, p.y, 10)) return false;
    return true;
  };
  C.castSkill = function (slot) {
    const s = S(); if (!s) return false; const p = s.player; const id = s.char.skills.bar[slot]; if (!id) return false;
    const res = s.sctx.skills[id]; if (!res) return false;
    if (p.dead) return false;
    if (p.mounted) { dismount(true); return false; }
    // channel toggle
    if (res.eff.kind === 'channel' || res.eff.kind === 'beam') {
      if (p.channel && p.channel.id === id) { stopChannel(); return true; }
      if ((p.cds[id] || 0) > 0 || (res.cost > 0 && p.res < res.cost)) { flashFail(res); return false; }
      p.channel = { id, res, tickT: 0, elapsed: 0, strikes: res.eff.strikes || 1, rampT: 0, corpseT: 0 };
      castCommon(res, {});
      return true;
    }
    if (p.attackTimer > 0 && !(res.eff.kind === 'buff' || res.eff.kind === 'shield' || res.eff.kind === 'aoeDebuff')) return false;
    if ((p.cds[id] || 0) > 0) { flashFail(res); return false; }
    let free = false;
    if (p.counters.hz_free_bear && res.tags.includes('werebear')) { free = true; p.counters.hz_free_bear = 0; }
    if (res.cost > 0 && p.res < res.cost && !free) { flashFail(res, 'Not enough ' + s.sctx.cls.resource.name); return false; }
    if (res.eff.kind === 'corpse' && !nearestCorpse(p.x, p.y, 10)) { flashFail(res, 'No corpse nearby'); return false; }
    if (p.channel) stopChannel();
    const cast = { furyAtCast: p.res, castApply: null, count: 0, hitAny: false };
    const aim = aimFor(res);
    // resource
    let spent = res.cost;
    if (res.eff.consumesAllResource) { spent = p.res; cast.consumed = spent; }
    if (!free && spent > 0) spendResource(p, spent);
    if (!free && res.cost > 0 && s.sctx.flags.starless && res.tags.includes('core')) p.starless = Math.min(5, p.starless + 1); else if (res.tags.includes('core') && !res.cost) {} else if (!res.tags.includes('core')) p.starless = 0;
    if (res.tags.includes('core') && s.sctx.flags.limitless_rage) p.limitless = 0;
    // cooldown & attack timer
    if (res.cd > 0 && !free) p.cds[id] = res.cd;
    if (res.eff.kind !== 'buff' && res.eff.kind !== 'shield' && res.eff.kind !== 'aoeDebuff' && res.eff.kind !== 'aura') {
      const asp = s.sctx.d.attackSpeed + (p.buffStats.attack_speed || 0) + (res.tags.includes('basic') ? (s.sctx.flat.attack_speed_basic || 0) + (p.buffStats.attack_speed_basic || 0) : 0) + (res.eff.kind === 'melee' && res.weapon.dual ? gstat('attack_speed', null, res) - (s.sctx.flat.attack_speed || 0) : 0);
      p.attackTimer = Math.max(0.12, 1 / (res.weapon.aps * Math.max(0.3, asp)) * (res.eff.hits ? 0.6 : 0.75));
    }
    castCommon(res, cast, aim);
    runEffect(res, res.eff, aim, cast);
    return true;
  };
  function flashFail(res, msg) { const s = S(); if (s.hooks.onFail) s.hooks.onFail(msg || 'On cooldown'); }
  function castCommon(res, cast, aim) {
    const s = S(), p = s.player, sctx = s.sctx;
    p.castCounts[res.id] = (p.castCounts[res.id] || 0) + 1;
    if (aim && aim.target) p.facing = aim.dir;
    // shapeshift
    if (res.eff.form && !(p.buffs.some(b => b.lockForm))) {
      const prev = p.form; const diff = prev !== res.eff.form;
      if (diff) { p.form = res.eff.form; p.formSince = s.t; cast.quickshift = true; fireTriggers('shapeshift', { form: p.form }); if (sctx.flags.bestial_rampage) {} }
      p.formTimer = (sctx.flags.permabear || sctx.flags.permawolf) ? 9999 : 6 * (1 + (sctx.flat.shapeshift_dur || 0));
      if (p.counters.hz_heal_wolf && res.tags.includes('werewolf')) { heal(p, p.maxHp * 0.08); p.counters.hz_heal_wolf = 0; }
    } else if (!res.eff.form && p.form && !sctx.flags.permabear && !sctx.flags.permawolf && !res.tags.includes('shapeshift') && !(sctx.flags.tempest_roar && res.tags.includes('storm')) && !(sctx.flags.vasilys && res.tags.includes('earth')) && !p.buffs.some(b => b.lockForm) && res.eff.kind !== 'buff' && res.eff.kind !== 'shield') {
      if (sctx.flags.clarity) gainResource(p, sctx.flags.clarity, true);
      p.form = null;
    }
    if (res.tags.includes('earth')) p.resonanceLast = 'earth'; else if (res.tags.includes('storm')) p.resonanceLast = 'storm';
    if (sctx.flags.natures_fury && (res.tags.includes('earth') || res.tags.includes('storm')) && !cast.fromFury && U.chance(0.3)) {
      const want = res.tags.includes('earth') ? 'storm' : 'earth';
      const cands = DATA.skillsFor('druid').filter(k => k.type === 'active' && k.cluster === res.def.cluster && k.tags.includes(want) && k.effect.kind !== 'buff' && k.effect.kind !== 'channel');
      if (cands.length) { const k = U.pick(cands); const r2 = sctx.skills[k.id] || Stats.resolveSkill(sctx, k); schedule(0.15, () => { const a = aimFor(r2); runEffect(r2, r2.eff, a, { fromFury: true, count: 0 }); addText(p.x, p.y - 1.4, "Nature's Fury: " + k.name, '#7dff5c', 0.8); }); }
    }
    fireTriggers('cast', { skill: res, cast, form: p.form });
    if (res.def.cluster === 'defensive') fireTriggers('cast_defensive', { skill: res, cast });
    if (sctx.flags.frenzy_bonus_fury && res.id === 'frenzy' && p.frenzyStacks >= 3) gainResource(p, sctx.flags.frenzy_bonus_fury, true);
    if (sctx.flags.furious_impulse && p.lastHitSkill && res.weapon.type !== p.lastHitSkill.weapon.type) gainResource(p, sctx.flags.furious_impulse, true);
    p.lastHitSkill = res;
    if (res.flags.ranks) {}
    // rathma's vigor
    if (sctx.flags.rathmas_vigor && res.tags.includes('blood') && p.healthySince >= 12) { cast.rathma = true; p.healthySince = 0; }
    // pulverize OP
    if (res.flags.pulverize_op && p.hp >= p.maxHp * 0.8) { p.counters.pulvT = p.counters.pulvT || 0; if (s.t - p.counters.pulvT >= res.flags.pulverize_op) { p.counters.pulvT = s.t; cast.forcedOverpower = true; } }
    if (sctx.flags.provocation && p.form === 'werebear' && s.t - p.formSince >= sctx.flags.provocation && !p.counters.provUsed) { p.nextOverpower = true; p.counters.provUsed = 1; }
    if (p.form !== 'werebear') p.counters.provUsed = 0;
    if (p.periodicOP <= 0 && sctx.flags.periodic_overpower) { p.nextOverpower = true; p.periodicOP = sctx.flags.periodic_overpower; }
    if (res.tags.includes('core') && sctx.flags.circle_of_life) {}
  }
  function stopChannel() {
    const s = S(), p = s.player; if (!p.channel) return;
    const ch = p.channel; const res = ch.res;
    if (s.sctx.flags.gohrs && res.id === 'whirlwind' && ch.totalBase > 0) { enemiesIn(p.x, p.y, 3).forEach(e => hitEnemy(e, { src: p, skill: res, baseDmgOverride: ch.totalBase * s.sctx.flags.gohrs, element: 'physical', tags: res.tags, noTrigger: true })); addParticles(p.x, p.y, 20, '#ff7a5c', 6, 0.5); }
    if (res.eff.preserve) { /* not implemented beyond flag */ }
    p.channel = null; p.cds[res.id] = Math.max(p.cds[res.id] || 0, 0.3);
  }
  C.stopChannel = stopChannel;

  // hit a list of enemies for a skill; returns count
  function hitList(list, res, cast, extra) {
    const s = S(), p = s.player;
    let count = 0;
    list.forEach((e, i) => {
      const info = Object.assign({ src: p, skill: res, coef: res.coef, element: res.element, tags: res.tags, cast, furyAtCast: cast && cast.furyAtCast, forcedOverpower: cast && cast.forcedOverpower, rathma: cast && cast.rathma, quickshift: cast && cast.quickshift, first: !(cast && cast.hitAny) }, extra || {});
      const dmg = hitEnemy(e, info);
      if (cast) { cast.hitAny = true; cast.count++; }
      if (!e.dead || true) applySkillApplies(e, res, info, dmg, cast);
      count++;
    });
    if (cast && count) fireTriggers('multi_hit', { skill: res, count, cast, target: list[0] });
    return count;
  }
  function applySkillApplies(e, res, info, dmg, cast) {
    const s = S(), p = s.player;
    const meta = { weaponAvg: res.weapon.avg * (1 + s.sctx.d.mainStatBonus) * (1 + gstat('dmg', e, res) + (res.tags.includes('core') ? gstat('dmg_core', e, res) : 0)), skill: res, baseDmg: dmg, coef: res.coef, weapon: res.weapon };
    const list = (info && info.appliesOverride) || res.applies;
    for (const a of list) {
      const st = Object.assign({}, a);
      if (st.st === 'poison' && res.eff.dotMult) st.coef *= 1 + res.eff.dotMult;
      if (st.st === 'poison' && res.eff.dotDur) st.dur = res.eff.dotDur;
      if (st.spread && res.eff.spreadMult) st.spread = Object.assign({}, st.spread, { interval: st.spread.interval * res.eff.spreadMult });
      if (DOT_KINDS_LOCAL[st.st]) { const total = (st.coef || 0) * meta.weaponAvg * (1 + (res.dmgMult || 0)); addDot(e, st.st, total, st.dur, p, meta, st); }
      else applyStatus(e, st, p, meta);
    }
    if (cast && cast.castApply) applyStatus(e, Object.assign({}, cast.castApply), p, meta);
    if (p.counters.terramote && res.tags.includes('earth')) p.counters.terramote--;
  }
  const DOT_KINDS_LOCAL = { bleed: 1, poison: 1, burn: 1, shadow_dot: 1 };

  // effect runner
  function runEffect(res, eff, aim, cast, origin) {
    const s = S(), p = s.player, sctx = s.sctx;
    const ox = origin ? origin.x : p.x, oy = origin ? origin.y : p.y;
    const dir = aim.dir;
    const coefMult = eff.coefMult || 1;
    const tx = aim.target ? aim.target.x : ox + Math.cos(dir) * Math.min(eff.range || 8, 7), ty = aim.target ? aim.target.y : oy + Math.sin(dir) * Math.min(eff.range || 8, 7);
    const kind = eff.kind;
    const empowered = eff.empowerEvery && (p.castCounts[res.id] % eff.empowerEvery === 0);
    if (kind === 'melee') {
      const hits = eff.hits || 1;
      const doHit = (i) => {
        if (p.dead) return;
        let range = eff.range, arc = eff.arc;
        const last = i === hits - 1;
        if (last && eff.lastHitArc) arc = eff.lastHitArc;
        if (eff.dashToTarget && aim.target && dist(p, aim.target) > range && dist(p, aim.target) < eff.dashToTarget + range) { const d = dist(p, aim.target) - range * 0.7; p.x += Math.cos(dir) * d; p.y += Math.sin(dir) * d; resolveObstacles(p); }
        const list = enemiesInSector(p.x, p.y, range, p.facing, arc);
        const extra = {};
        if (last && eff.lastHitMult) extra.coef = res.coef * eff.lastHitMult;
        if (empowered && eff.empowerMult) extra.coef = res.coef * (1 + eff.empowerMult);
        if (last && eff.lastHitApply) extra.appliesOverride = res.applies.concat([eff.lastHitApply]);
        if (empowered && eff.empowerApply) extra.appliesOverride = (extra.appliesOverride || res.applies).concat([eff.empowerApply]);
        if (empowered && eff.empowerCrit) extra.forcedCrit = true;
        if (eff.consumeBleed) list.forEach(e => { const bl = e.dots.filter(d => d.st === 'bleed'); const total = bl.reduce((a, d) => a + d.dps * d.dur, 0); e.dots = e.dots.filter(d => d.st !== 'bleed'); if (total > 0) { hitEnemy(e, { src: p, skill: res, baseDmgOverride: total * eff.consumeBleed, element: 'physical', tags: res.tags, noTrigger: true, noOverpower: true }); if (eff.spreadBleed) enemiesIn(e.x, e.y, 3, x => x !== e).forEach(x => addDot(x, 'bleed', total * 0.5, 5, p, { skill: res })); } });
        const n = hitList(list, res, cast, extra);
        if (last) list.forEach(e => fireTriggers('last_hit', { skill: res, target: e, cast }));
        if (eff.knockback) list.forEach(e => { if (!(e.elite.rank === 'boss')) { e.kb = { vx: Math.cos(dir) * eff.knockback * 2, vy: Math.sin(dir) * eff.knockback * 2, t: 0.3 }; } });
        if (eff.splash && list.length) list.forEach(e => enemiesIn(e.x, e.y, 2, x => !list.includes(x)).forEach(x => hitEnemy(x, { src: p, skill: res, coef: res.coef * eff.splash, element: res.element, tags: res.tags, noTrigger: true })));
        if (eff.orbChance && n && U.chance(eff.orbChance)) spawnOrb(list[0].x, list[0].y);
        if (eff.frenzyStacks && n) { p.frenzyStacks = Math.min(sctx.flags.battle_trance ? 5 : 3, p.frenzyStacks + 1); p.frenzyT = 3; }
        if (eff.corpseEvery && n && (!p.counters['corpse_' + res.id] || s.t - p.counters['corpse_' + res.id] >= eff.corpseEvery || (eff.corpseOnMulti && n >= 2))) { p.counters['corpse_' + res.id] = s.t; spawnCorpse(list[0].x, list[0].y); }
        if (eff.doubleChance && i === 0 && U.chance(eff.doubleChance)) schedule(0.1, () => doHit(0));
        if (res.gen && n) gainResource(p, res.gen * (res.tags.includes('basic') ? 1 : 1) * (eff.arc > 2.5 ? n : 1));
        if (eff.chainStrike && list.length) { const r2 = sctx.skills.storm_strike || Stats.resolveSkill(sctx, DATA.skillById.storm_strike); runEffect(r2, r2.eff, aim, { count: 0 }); }
        if (sctx.flags.kick_consume && res.id === 'kick' && n) { const f = p.res; spendResource(p, f); list.forEach(e => hitEnemy(e, { src: p, skill: res, coef: res.coef * f * 0.02, element: 'physical', tags: res.tags, noTrigger: true })); }
        s.beams.push({ kind: 'arc', x: p.x, y: p.y, dir: p.facing, range, arc, t: 0, dur: 0.18, color: DATA.ELEMENT_COLOR[res.element] });
      };
      doHit(0);
      for (let i = 1; i < hits; i++) schedule(i * (eff.hitInterval || 0.12), () => doHit(i));
      if (!eff.hits && res.gen && !enemiesInSector(p.x, p.y, eff.range, p.facing, eff.arc).length) {} // no gen on miss
      return;
    }
    if (kind === 'proj') {
      let count = eff.count || 1;
      if (empowered && eff.empowerCount) count += eff.empowerCount;
      if (eff.extraChance && U.chance(eff.extraChance)) count++;
      const spread = eff.spread || 0;
      for (let i = 0; i < count; i++) {
        const off = count > 1 ? (i - (count - 1) / 2) * spread : 0;
        spawnProjectile({ x: ox, y: oy, dir: dir + off, speed: eff.speed, range: eff.range, radius: eff.radius || 0.5, pierce: eff.pierce || 0, res, skill: res, cast, owner: p, element: res.element, aoe: eff.aoe, ground: eff.ground, groundMult: eff.groundMult, homing: eff.homing || aim.target && eff.homing, wander: eff.wander, interval: eff.interval, shards: eff.shards, shardsOnCrit: eff.shardsOnCrit, pierceFalloff: eff.pierceFalloff, extraVsVuln: eff.extraVsVuln, critRamp: eff.critRamp, color: DATA.ELEMENT_COLOR[res.element], consumed: cast && cast.consumed, forcedOverpower: empowered && eff.empowerOverpower, orbOnHit: empowered && eff.empowerOrb, knock: eff.radius > 1, size: eff.radius || 0.5, target: aim.target });
      }
      if (eff.wander && eff.critRamp) {}
      return;
    }
    if (kind === 'aoe') {
      const count = eff.count || 1;
      for (let i = 0; i < count; i++) {
        let ax = tx, ay = ty;
        if (eff.at === 'self') { ax = p.x; ay = p.y; } else if (eff.at === 'front') { ax = p.x + Math.cos(dir) * (eff.dist || 1.5); ay = p.y + Math.sin(dir) * (eff.dist || 1.5); }
        if (eff.scatter && i > 0) { ax += (Math.random() - 0.5) * eff.scatter * 2; ay += (Math.random() - 0.5) * eff.scatter * 2; }
        const radius = eff.radius;
        const delay = (eff.delay || 0) + i * 0.08;
        const fire = () => {
          if (p.dead) return;
          const list = enemiesIn(ax, ay, radius);
          const extra = {}; if (empowered && eff.empowerCrit) extra.forcedCrit = true; if (cast && cast.forcedOverpower) extra.forcedOverpower = true; if (eff.guaranteedOverpower) extra.forcedOverpower = true;
          hitList(list, res, cast, extra);
          addParticles(ax, ay, 14, DATA.ELEMENT_COLOR[res.element], 5, 0.4);
          s.beams.push({ kind: 'ring', x: ax, y: ay, radius, t: 0, dur: 0.3, color: DATA.ELEMENT_COLOR[res.element] });
          if (eff.bolts) { const n = (eff.bolts.count || 2) + (eff.boltsCount || 0); for (let k = 0; k < n; k++) { const t2 = nearestEnemy(ax + (Math.random() - 0.5), ay, 7, e => !list.includes(e) || Math.random() < 0.5); const d2 = t2 ? U.angleTo(ax, ay, t2.x, t2.y) : Math.random() * Math.PI * 2; spawnProjectile({ x: ax, y: ay, dir: d2 + (Math.random() - 0.5) * 0.3, speed: 12, range: 7, radius: 0.4, pierce: 0, res, skill: res, owner: p, element: 'holy', coef: res.coef * eff.bolts.coef / (res.def.dmg || 1) * (1 + (eff.boltsMult || 0)), color: DATA.ELEMENT_COLOR.holy, homing: !!t2, target: t2 }); } }
          if (eff.shockwave) { const list2 = enemiesInSector(p.x, p.y, 7, dir, 0.6).filter(e => !list.includes(e)); hitList(list2, res, cast, { coef: res.coef * eff.shockwave, noTrigger: true }); s.beams.push({ kind: 'arc', x: p.x, y: p.y, dir, range: 7, arc: 0.6, t: 0, dur: 0.25, color: '#c9a86a' }); }
          if (eff.ground) spawnZone({ x: ax, y: ay, radius: eff.ground.radius, dur: eff.ground.dur, interval: eff.ground.interval, coef: eff.ground.coefTotal / (eff.ground.dur / eff.ground.interval), element: res.element, owner: p, skill: res, noTrigger: true, drInside: eff.ground.drInside, coefTotal: eff.ground.coefTotal });
        };
        if (delay > 0) { s.beams.push({ kind: 'telegraphRing', x: ax, y: ay, radius, t: 0, dur: delay, color: DATA.ELEMENT_COLOR[res.element] }); schedule(delay, fire); } else fire();
      }
      return;
    }
    if (kind === 'nova') {
      const list = enemiesIn(p.x, p.y, eff.radius);
      const extra = {}; if (cast && cast.forcedOverpower) extra.forcedOverpower = true;
      if (eff.coefMult) extra.coef = res.coef * eff.coefMult;
      const n = hitList(list, res, cast, extra);
      s.beams.push({ kind: 'ring', x: p.x, y: p.y, radius: eff.radius, t: 0, dur: 0.35, color: DATA.ELEMENT_COLOR[res.element] });
      list.forEach(e => { if (eff.apply && eff.apply.some(a => a.st === 'knockdown') && e.elite.rank !== 'boss') { const a = U.angleTo(p.x, p.y, e.x, e.y); e.kb = { vx: Math.cos(a) * 8, vy: Math.sin(a) * 8, t: 0.25 }; } });
      if (eff.novaBurst) { const nb = eff.novaBurst; const bonus = Math.min(nb.max, n * nb.perDrain); const burst = () => { const l2 = enemiesIn(p.x, p.y, nb.radius); hitList(l2, res, cast, { coef: nb.coef * (1 + 0.1 * Math.max(0, res.rank - 1)), mult: bonus }); s.beams.push({ kind: 'ring', x: p.x, y: p.y, radius: nb.radius, t: 0, dur: 0.35, color: '#ff3b3b' }); return l2.length; }; schedule(0.25, () => { const c2 = burst(); if (eff.echoAt && c2 >= eff.echoAt) schedule(1, () => { const l3 = enemiesIn(p.x, p.y, nb.radius); hitList(l3, res, cast, { coef: nb.coef * 0.5, noTrigger: true }); }); }); }
      if (eff.consumeCorpses) { const cs = s.corpses.filter(c => U.dist(c.x, c.y, p.x, p.y) <= eff.radius); cs.forEach(c => { consumeCorpse(c); heal(p, p.maxHp * eff.consumeCorpses.healPer); gainResource(p, eff.consumeCorpses.resourcePer, true); if (eff.fortifyPerCorpse) fortify(p, eff.fortifyPerCorpse); if (eff.cdrPerCorpse) p.cds[res.id] = Math.max(0, (p.cds[res.id] || 0) - eff.cdrPerCorpse); }); }
      if (eff.passiveMods) {}
      return;
    }
    if (kind === 'cone') {
      const list = enemiesInSector(p.x, p.y, eff.range, dir, eff.arc);
      const extra = {}; if (eff.coefMult) extra.coef = res.coef * eff.coefMult;
      if (eff.count && eff.count > 3) {}
      hitList(list, res, cast, extra);
      if (eff.pull) list.forEach(e => { if (e.elite.rank !== 'boss') { const a = U.angleTo(e.x, e.y, p.x, p.y); const d = Math.max(0, dist(p, e) - 1.5); e.kb = { vx: Math.cos(a) * d * 3, vy: Math.sin(a) * d * 3, t: 0.33 }; } });
      s.beams.push({ kind: 'arc', x: p.x, y: p.y, dir, range: eff.range, arc: eff.arc, t: 0, dur: 0.3, color: DATA.ELEMENT_COLOR[res.element] });
      return;
    }
    if (kind === 'dash') {
      if (eff.spectre) {
        spawnProjectile({ x: p.x, y: p.y, dir, speed: 16, range: eff.range || eff.dist, radius: eff.width / 2, pierce: 99, res, skill: res, cast, owner: p, element: res.element, color: DATA.ELEMENT_COLOR[res.element], spectre: true, returnMult: eff.returnMult, size: 0.7, empowerMult: empowered && eff.empowerMult, empowerApply: empowered && eff.empowerApply });
        return;
      }
      const d = eff.dist;
      p.dash = { dir, remaining: d, speed: 22, res, cast, width: eff.width, hit: new Set(), unstoppable: eff.unstoppable };
      if (eff.unstoppable) p.unstoppable = Math.max(p.unstoppable, 0.6);
      return;
    }
    if (kind === 'leap') {
      p.dash = { dir, remaining: eff.dist, speed: 20, res, cast, width: 0, hit: new Set(), leap: true, onLand: () => { const list = enemiesIn(p.x, p.y, eff.radius); const n = hitList(list, res, cast, {}); list.forEach(e => { if (e.elite.rank !== 'boss') { const a = U.angleTo(p.x, p.y, e.x, e.y); e.kb = { vx: Math.cos(a) * 7, vy: Math.sin(a) * 7, t: 0.25 }; } }); s.beams.push({ kind: 'ring', x: p.x, y: p.y, radius: eff.radius, t: 0, dur: 0.35, color: '#c9a86a' }); S().shake = 0.3; if (!n && eff.missRefund) p.cds[res.id] = Math.max(0, p.cds[res.id] - eff.missRefund); if (eff.ground) spawnZone({ x: p.x, y: p.y, radius: eff.ground.radius, dur: eff.ground.dur, interval: eff.ground.interval, coef: eff.ground.coefTotal / (eff.ground.dur / eff.ground.interval), element: 'physical', owner: p, skill: res, noTrigger: true, drInside: eff.ground.drInside, coefTotal: eff.ground.coefTotal }); } };
      p.immune = Math.max(p.immune, 0.35);
      return;
    }
    if (kind === 'multiDash') {
      let n = 0; p.immune = Math.max(p.immune, eff.dashes * eff.interval + 0.2); if (eff.unstoppable) p.unstoppable = Math.max(p.unstoppable, eff.dashes * eff.interval);
      const step = () => { if (p.dead || n >= eff.dashes) return; const t = nearestEnemy(p.x, p.y, 9); if (t) { const a = U.angleTo(p.x, p.y, t.x, t.y); const d = Math.max(0, dist(p, t) - 0.8); p.x += Math.cos(a) * d; p.y += Math.sin(a) * d; p.facing = a; resolveObstacles(p); s.beams.push({ kind: 'line', x1: p.x - Math.cos(a) * d, y1: p.y - Math.sin(a) * d, x2: p.x, y2: p.y, t: 0, dur: 0.2, color: '#c9a86a' }); const list = enemiesIn(p.x, p.y, 1.6); const k = hitList(list, res, cast, {}); if (k && eff.healPct) heal(p, p.maxHp * eff.healPct); } n++; schedule(eff.interval, step); };
      step();
      return;
    }
    if (kind === 'chain') {
      let cur = aim.target && dist(p, aim.target) <= eff.range + 1 ? aim.target : nearestEnemy(p.x, p.y, eff.range);
      if (eff.castBuff) addBuff(p, U.deepClone(eff.castBuff));
      if (!cur) { if (res.gen) {} return; }
      const hitSet = new Set(); let coef = res.coef; let prev = p; let jumps = 0; let gen = 0;
      const extra = {};
      while (cur && jumps <= (eff.jumps || 0)) {
        hitSet.add(cur);
        s.beams.push({ kind: 'line', x1: prev.x, y1: prev.y, x2: cur.x, y2: cur.y, t: 0, dur: 0.25, color: DATA.ELEMENT_COLOR[res.element] });
        hitList([cur], res, cast, { coef });
        gen++;
        coef *= 1 - (eff.falloff || 0);
        prev = cur; jumps++;
        cur = nearestEnemy(prev.x, prev.y, eff.jumpRange, e => !hitSet.has(e));
      }
      if (res.gen) gainResource(p, res.gen + (eff.genPerExtra ? (gen - 1) * eff.genPerExtra : 0));
      return;
    }
    if (kind === 'orbit') {
      const count = eff.count || 1;
      for (let i = 0; i < count; i++) spawnProjectile({ x: p.x, y: p.y, dir: 0, speed: 0, range: 999, radius: eff.hitRadius, pierce: 999, res, skill: res, cast, owner: p, element: res.element, color: DATA.ELEMENT_COLOR[res.element], orbit: { radius: eff.radius, speed: eff.speed, angle: (i / count) * Math.PI * 2, dur: eff.dur, interval: eff.interval }, interval: eff.interval, size: 0.45 });
      return;
    }
    if (kind === 'corpse') {
      let c = nearestCorpse(p.x, p.y, 10); if (!c) return;
      const n = eff.multiCorpse ? 1 + Math.min(eff.multiCorpse, s.corpses.filter(x => x !== c && U.dist(x.x, x.y, c.x, c.y) <= 3).length) : 1;
      const extraCorpses = eff.multiCorpse ? s.corpses.filter(x => x !== c && U.dist(x.x, x.y, c.x, c.y) <= 3).slice(0, eff.multiCorpse) : [];
      const radius = eff.radius * (1 + 0.15 * extraCorpses.length);
      const cx = c.x, cy = c.y;
      consumeCorpse(c); extraCorpses.forEach(consumeCorpse);
      if (eff.volatile) { const m = spawnMinion('volatile_skeleton', { x: cx, y: cy, temp: true, dur: 6, explodeRes: res }); return; }
      if (eff.pull) { const list = enemiesIn(cx, cy, radius); list.forEach(e => { if (e.elite.rank !== 'boss') { const a = U.angleTo(e.x, e.y, cx, cy); const d = Math.max(0, U.dist(e.x, e.y, cx, cy) - 0.8); e.kb = { vx: Math.cos(a) * d * 3, vy: Math.sin(a) * d * 3, t: 0.33 }; } }); schedule(0.35, () => { hitList(enemiesIn(cx, cy, 2.5), res, cast, {}); }); s.beams.push({ kind: 'ring', x: cx, y: cy, radius, t: 0, dur: 0.4, color: '#b36cff' }); return; }
      if (eff.miasma) { spawnZone({ x: cx, y: cy, radius, dur: eff.miasma.dur, interval: eff.miasma.interval, coef: eff.miasma.coef * (1 + 0.1 * Math.max(0, res.rank - 1)), element: 'shadow', owner: p, skill: res }); return; }
      const list = enemiesIn(cx, cy, radius);
      hitList(list, res, cast, { mult: 0.9 * extraCorpses.length });
      addParticles(cx, cy, 18, '#d8c8a8', 5, 0.5, 0.14);
      s.beams.push({ kind: 'ring', x: cx, y: cy, radius, t: 0, dur: 0.3, color: '#d8c8a8' });
      return;
    }
    if (kind === 'aoeDebuff') {
      const ax = eff.at === 'self' ? p.x : tx, ay = eff.at === 'self' ? p.y : ty;
      const list = enemiesIn(ax, ay, eff.radius);
      list.forEach(e => { applyStatus(e, Object.assign({}, eff.apply), p); res.applies.forEach(a => applyStatus(e, Object.assign({}, a), p, { weaponAvg: res.weapon.avg })); fireTriggers('hit', { skill: res, target: e, cast, dmg: 0 }); if (eff.apply.st === 'immobilize' && res.id === 'bone_prison') e.st.trapAmp = { v: 0.15, dur: eff.apply.dur }; });
      if (eff.novaCoef) schedule(eff.apply.dur, () => { enemiesIn(ax, ay, eff.radius + 1).forEach(e => hitEnemy(e, { src: p, skill: res, coef: eff.novaCoef, element: 'physical', tags: res.tags, noTrigger: true })); });
      s.beams.push({ kind: 'ring', x: ax, y: ay, radius: eff.radius, t: 0, dur: 0.6, color: DATA.ELEMENT_COLOR[res.element] });
      if (res.id === 'bone_prison') { for (let i = 0; i < 10; i++) { const a = i / 10 * Math.PI * 2; s.walls.push({ x: ax + Math.cos(a) * (eff.radius + 0.4), y: ay + Math.sin(a) * (eff.radius + 0.4), r: 0.45, t: eff.apply.dur, owner: 'player', color: '#e8e2d0' }); } }
      if (res.id === 'petrify' && eff.at === 'self') {}
      return;
    }
    if (kind === 'buff' || kind === 'shield') {
      const b = { id: res.id, dur: eff.dur, mods: (eff.mods || []).slice(), aura: eff.aura, regen: eff.regen, immune: eff.immune, moveMult: eff.moveMult, glow: eff.glow, lockForm: eff.lockForm, ramp: eff.ramp, extendOnKill: eff.extendOnKill, extendMax: eff.extendMax, fortifyTick: eff.fortifyTick, healPerSec: eff.healPerSec, corpseEvery: eff.corpseEvery, res, skillDur: true, thornsFromLife: eff.thornsFromLife, furyOnDamaged: eff.furyOnDamaged, injuredDouble: eff.injuredDouble, explode: eff.explode, tickT: 0, regenT: 0, elapsed: 0 };
      if (eff.crowdBonus && enemiesIn(p.x, p.y, 6).length >= eff.crowdBonus.count) b.mods.push({ stat: eff.crowdBonus.stat, add: eff.crowdBonus.add });
      if (eff.unstoppable) p.unstoppable = Math.max(p.unstoppable, eff.dur);
      if (eff.cleanse) cleanse(p);
      if (eff.healOnCast) heal(p, p.maxHp * eff.healOnCast);
      if (eff.berserk) doEffect({ berserk: eff.berserk }, {}, res);
      if (eff.knockback) enemiesIn(p.x, p.y, 4).forEach(e => { if (e.elite.rank !== 'boss') { const a = U.angleTo(p.x, p.y, e.x, e.y); e.kb = { vx: Math.cos(a) * 9, vy: Math.sin(a) * 9, t: 0.25 }; } });
      if (eff.tauntRadius) enemiesIn(p.x, p.y, eff.tauntRadius).forEach(e => applyStatus(e, { st: 'taunt', dur: Math.min(6, eff.dur) }, p));
      if (eff.aoeApply) enemiesIn(p.x, p.y, eff.aoeApply.radius).forEach(e => { eff.aoeApply.apply.forEach(a => applyStatus(e, Object.assign({}, a), p)); if (eff.aoeApplyExtra) applyStatus(e, Object.assign({}, eff.aoeApplyExtra), p); });
      if (eff.shout && sctx.flags.shout_weaken) enemiesIn(p.x, p.y, 8).forEach(e => { e.shoutWeak = sctx.flags.shout_weaken; e.shoutWeakT = 5; });
      if (eff.shout && sctx.flags.shout_heal) b.hot = p.maxHp * sctx.flags.shout_heal;
      if (eff.shout && sctx.flags.echoing_fury) b.resRegen = sctx.flags.echoing_fury;
      if (kind === 'shield') { let amt = eff.ofMissing ? (p.maxHp - p.hp) * eff.barrier + p.maxHp * (eff.barrierBonus || 0) : p.maxHp * eff.barrier; barrier(p, amt, eff.dur); b.barrierAmt = amt; if (eff.drBonus) b.mods.push({ stat: 'dr', add: eff.drBonus }); }
      if (eff.selfBuff) addBuff(p, U.deepClone(eff.selfBuff));
      addBuff(p, b);
      s.beams.push({ kind: 'ring', x: p.x, y: p.y, radius: 2, t: 0, dur: 0.4, color: eff.glow || DATA.ELEMENT_COLOR[res.element] });
      return;
    }
    if (kind === 'ground') {
      const ax = eff.at === 'self' ? p.x : tx, ay = eff.at === 'self' ? p.y : ty;
      spawnZone({ x: ax, y: ay, radius: eff.radius, dur: eff.dur, interval: eff.interval, coef: res.coef, element: res.element, owner: p, skill: res, cast, follow: eff.follow, selfHeal: eff.selfHeal, consecration: res.id === 'consecration', applies: res.applies });
      return;
    }
    if (kind === 'summon') {
      const count = eff.count + (sctx.minionCount[eff.minion] || 0);
      for (let i = 0; i < count; i++) { const spawnOne = () => { const m = spawnMinion(eff.minion, { temp: true, dur: eff.dur, skillId: res.id, applyOnHit: eff.minionApply }); if (eff.minion === 'ancient') { m.dmgBase = weaponAvg(res) * res.coef; } }; if (eff.stagger) schedule(i * eff.stagger, spawnOne); else spawnOne(); }
      if (eff.selfBuff) addBuff(p, U.deepClone(eff.selfBuff));
      return;
    }
    if (kind === 'command') {
      const t = aim.target || nearestEnemy(p.x, p.y, 10); if (!t) return;
      s.minions.filter(m => m.type === eff.companion && !m.dead).forEach(m => { m.x = t.x + (Math.random() - 0.5) * 1.5; m.y = t.y + (Math.random() - 0.5) * 1.5; m.forceTarget = t; m.cd = 0; hitEnemy(t, { src: p, skill: res, coef: eff.coef, element: 'physical', tags: res.tags, minion: m, cast }); applySkillApplies(t, res, { skill: res }, 0, cast); });
      return;
    }
    if (kind === 'multi') {
      eff.steps.forEach((st, i) => schedule(i * (eff.stepInterval || 0.4), () => { if (!p.dead) runEffect(res, Object.assign({}, st, { apply: undefined }), aimFor(res), cast); const extraApplies = st.apply || []; if (extraApplies.length) { const list = st.kind === 'nova' ? enemiesIn(p.x, p.y, st.radius) : enemiesInSector(p.x, p.y, st.range, p.facing, st.arc); list.forEach(e => extraApplies.forEach(a => applyStatus(e, Object.assign({}, a), p, { weaponAvg: res.weapon.avg * (1 + sctx.d.mainStatBonus) }))); } }));
      return;
    }
    if (kind === 'beam') { return; }
  }
  C.runEffect = runEffect;

  // ------------------------------------------------------------- player actions
  C.evade = function () {
    const s = S(); if (!s) return; const p = s.player; if (p.dead || p.mounted) return;
    if (p.evadeCharges <= 0) return;
    const inp = s.input; const dir = (inp.mx || inp.my) ? Math.atan2(inp.my, inp.mx) : p.facing;
    p.evadeCharges--; if (p.evadeCd <= 0) p.evadeCd = s.sctx.d.evadeCd;
    p.dash = { dir, remaining: 3.5, speed: 18, evade: true, hit: new Set() }; p.immune = Math.max(p.immune, 0.2);
    cleanse(p);
  };
  C.potion = function () {
    const s = S(); if (!s) return; const p = s.player; if (p.dead) return;
    if (p.potions <= 0 || (p.potionCd || 0) > 0) { if (s.hooks.onFail) s.hooks.onFail('No potions'); return; }
    p.potions--; p.potionCd = 1; heal(p, p.maxHp * s.sctx.d.potionHeal, 'potion'); addBuff(p, { id: 'potion_regen', dur: 3, mods: [], hot: p.maxHp * 0.1 / 3 });
    addParticles(p.x, p.y, 12, '#ff3b3b', 3, 0.5);
    s.char.potion.charges = p.potions;
  };
  C.toggleMount = function () {
    const s = S(); if (!s) return; const p = s.player; if (p.dead) return;
    if (p.mounted) { dismount(true); return; }
    if (s.mode !== 'field') { if (s.hooks.onFail) s.hooks.onFail('Mounts only in the open world'); return; }
    if (!s.char.mount.current) { if (s.hooks.onFail) s.hooks.onFail('No mount. Complete Donan\'s Favor.'); return; }
    if (p.channel) stopChannel();
    p.mounted = true; p.spurs = Player.mountSpurs(s.char); p.mountHits = 0; p.form = null;
  };
  C.spur = function () { const s = S(); if (!s) return; const p = s.player; if (!p.mounted || p.spurs <= 0 || p.spurTimer > 0) return; p.spurs--; p.spurTimer = 1.2; };
  function dismount(attack) {
    const s = S(), p = s.player; if (!p.mounted) return;
    p.mounted = false;
    if (attack) { const list = enemiesIn(p.x, p.y, 3); const coef = 1.0 + (s.sctx.flat.dmg_mount || 0); list.forEach(e => { hitEnemy(e, { src: p, coef, element: 'physical', tags: [], noTrigger: true, mult: 0 }); applyStatus(e, { st: 'knockdown', dur: 1.5 }, p); }); s.beams.push({ kind: 'ring', x: p.x, y: p.y, radius: 3, t: 0, dur: 0.35, color: '#c9a86a' }); s.shake = 0.25; }
  }
  C.townPortal = function () { const s = S(); if (!s) return; const p = s.player; if (p.dead) return; if (p.portal > 0) { p.portal = 0; return; } p.portal = 3; };
  C.setInput = function (mx, my, aim) { const s = S(); if (!s) return; s.input.mx = mx; s.input.my = my; if (aim !== undefined) s.input.aim = aim; };
  C.setAura = function (skillId) { const s = S(); if (!s) return; s.char.mechanics.aura = skillId; Player.recompute(s.char); s.sctx = s.char.sctx; s.player.auraActive = !!skillId; };

  // ------------------------------------------------------------- update: player
  function updatePlayer(dt) {
    const s = S(), p = s.player, sctx = s.sctx, d = sctx.d;
    if (p.dead) return;
    // timers
    for (const k of ['immune', 'unstoppable', 'attackTimer', 'spurTimer', 'potionCd', 'hvCd', 'protectorCd', 'stealth', 'ambush', 'periodicOP']) if (p[k] > 0) p[k] -= dt;
    if (p.evadeCharges < d.evadeCharges) { p.evadeCd -= dt; if (p.evadeCd <= 0) { p.evadeCharges++; p.evadeCd = d.evadeCd; } }
    Object.keys(p.cds).forEach(k => { if (p.cds[k] > 0) p.cds[k] -= dt; });
    if (p.frenzyStacks > 0) { p.frenzyT -= dt; if (p.frenzyT <= 0) p.frenzyStacks = 0; }
    Object.keys(p.arsenal).forEach(k => { if (p.arsenal[k] > 0) p.arsenal[k] -= dt; });
    if (p.formTimer > 0 && p.form) { p.formTimer -= dt; if (p.formTimer <= 0 && !sctx.flags.permabear && !sctx.flags.permawolf) { p.form = null; if (sctx.flags.clarity) gainResource(p, sctx.flags.clarity, true); } }
    if (p.hp >= p.maxHp * 0.8) p.healthySince += dt; else p.healthySince = 0;
    if (s.t - p.lastDamagedAt > 3 && sctx.flags.kalans_edict) p.kalans = true; else p.kalans = false;
    // statuses on player
    for (const k of Object.keys(p.st)) { p.st[k].dur -= dt; if (p.st[k].dur <= 0) delete p.st[k]; }
    // buffs
    for (const b of p.buffs) {
      b.dur -= dt; b.elapsed = (b.elapsed || 0) + dt;
      if (b.hot) heal(p, b.hot * dt, 'regen');
      if (b.resRegen) gainResource(p, b.resRegen * dt, true);
      if (b.regen) { b.regenT = (b.regenT || 0) + dt; if (b.regenT >= b.regen.interval) { b.regenT = 0; let h = b.regen.heal; if (b.injuredDouble && p.hp <= p.maxHp * 0.35) h *= 2; heal(p, p.maxHp * h); if (b.fortifyTick) fortify(p, b.fortifyTick); } }
      else if (b.fortifyTick) { b.regenT = (b.regenT || 0) + dt; if (b.regenT >= 1) { b.regenT = 0; fortify(p, b.fortifyTick); } }
      if (b.healPerSec && b.barrierAmt) heal(p, b.barrierAmt * b.healPerSec * dt, 'regen');
      if (b.aura) { b.tickT = (b.tickT || 0) + dt; if (b.tickT >= b.aura.interval) { b.tickT = 0; const res = b.res; const list = enemiesIn(p.x, p.y, b.aura.radius); if (b.aura.bolts) { const n = Math.min(list.length, 2); U.shuffle(list).slice(0, n).forEach(e => { hitEnemy(e, { src: p, skill: res, coef: b.aura.coef * (1 + 0.1 * Math.max(0, res.rank - 1)), element: res.element, tags: res.tags }); applySkillApplies(e, res, { skill: res }, 0, null); s.beams.push({ kind: 'line', x1: e.x, y1: e.y - 6, x2: e.x, y2: e.y, t: 0, dur: 0.15, color: '#7fd6ff' }); }); } else { list.forEach(e => { hitEnemy(e, { src: p, skill: res, coef: b.aura.coef * (1 + 0.1 * Math.max(0, res.rank - 1)), element: res.element, tags: res.tags }); applySkillApplies(e, res, { skill: res }, 0, null); }); if (b.aura.heal && list.length) heal(p, p.maxHp * b.aura.heal); } } }
      if (b.corpseEvery) { b.corpseT = (b.corpseT || 0) + dt; if (b.corpseT >= b.corpseEvery) { b.corpseT = 0; spawnCorpse(p.x, p.y); } }
      if (b.dur <= 0 && b.explode) { enemiesIn(p.x, p.y, b.explode.radius).forEach(e => hitEnemy(e, { src: p, skill: b.res, coef: b.explode.coef, element: 'physical', tags: b.res.tags })); s.beams.push({ kind: 'ring', x: p.x, y: p.y, radius: b.explode.radius, t: 0, dur: 0.3, color: '#c9a86a' }); }
      if (b.lockForm && b.dur <= 0) p.formTimer = 0.1;
    }
    p.buffs = p.buffs.filter(b => b.dur > 0);
    p.barriers.forEach(b => { b.dur -= dt; }); p.barriers = p.barriers.filter(b => b.dur > 0 && b.amt > 0); p.barrier = p.barriers.reduce((a, b) => a + b.amt, 0);
    recomputeBuffStats(p);
    // dynamic max stats (life% buffs)
    const lifeMult = 1 + (p.buffStats.life_pct || 0) + (p.form === 'werebear' && sctx.cond.some(c => c.stat === 'life_pct' && c.when === 'self_werebear') ? gstat('life_pct', null) - (sctx.flat.life_pct || 0) : 0);
    const newMax = Math.round(d.maxLife * lifeMult); if (newMax !== p.maxHp) { const ratio = p.hp / p.maxHp; p.maxHp = newMax; p.hp = Math.min(newMax, Math.max(p.hp, Math.round(newMax * ratio))); }
    p.maxRes = d.maxResource;
    // regen
    heal(p, (d.lifeRegen + (p.buffStats.life_regen || 0)) * dt, 'regen');
    const cls = sctx.cls;
    if (cls.resource.regen) gainResource(p, cls.resource.regen * dt);
    if (cls.resource.decay && !p.channel && p.res > 0 && s.t - (p.lastResGain || 0) > 3) p.res = Math.max(0, p.res - cls.resource.decay * dt * 2);
    if (sctx.flags.ramaladni && s.char.equipment.weapon && false) {}
    if (p.channel) {} else if (sctx.flags.ramaladni && Object.values(s.char.equipment).some(it => it && it.unique === 'ramaladnis')) p.res = Math.max(0, p.res - 2 * dt);
    // paladin aura pulses
    if (p.auraActive && s.char.mechanics.aura) { const ares = sctx.skills[s.char.mechanics.aura] || Stats.resolveSkill(sctx, DATA.skillById[s.char.mechanics.aura]); if (ares.eff.pulse) { p.auraT = (p.auraT || 0) + dt; if (p.auraT >= ares.eff.pulse.interval) { p.auraT = 0; const list = enemiesIn(p.x, p.y, ares.eff.pulse.radius * (ares.eff.pulseRadius || 1)); list.forEach(e => { hitEnemy(e, { src: p, skill: ares, coef: ares.eff.pulse.coef * (1 + 0.1 * Math.max(0, ares.rank - 1)) * (1 + (sctx.flags.aura_mastery || 0)), element: ares.element, tags: ares.tags }); applySkillApplies(e, ares, { skill: ares }, 0, null); }); } } }
    // charged atmosphere
    if (sctx.flags.charged_atmosphere) { p.chargedTimer += dt; if (p.chargedTimer >= sctx.flags.charged_atmosphere) { p.chargedTimer = 0; const t = nearestEnemy(p.x, p.y, 8); if (t) { hitEnemy(t, { src: p, coef: 0.45, element: 'lightning', tags: ['storm'], noTrigger: true }); s.beams.push({ kind: 'line', x1: t.x, y1: t.y - 6, x2: t.x, y2: t.y, t: 0, dur: 0.15, color: '#ffe55c' }); } } }
    if (sctx.flags.bloodied) { const n = enemiesIn(p.x, p.y, 8, e => e.dots.length > 0).length; if (n) heal(p, sctx.flags.bloodied * n * dt, 'regen'); }
    if (sctx.flags.bestial_rampage && p.form === 'werewolf' && s.t - p.formSince >= 2.5) addBuff(p, { id: 'bestial_wolf', dur: 15, mods: [{ stat: 'attack_speed', add: 0.2 }] });
    // movement
    const inp = s.input;
    const len = Math.hypot(inp.mx, inp.my);
    p.moving = len > 0.05 && !isHardCC(p) && !p.st.immobilize;
    let speed = p.speed * (d.moveSpeed + (p.buffStats.move_speed || 0) - (sctx.flat.move_speed || 0) + gstat('move_speed', null) - (sctx.flat.move_speed || 0) * 0 ) ;
    speed = p.speed * (1 + Math.min(1.0, (sctx.flat.move_speed || 0) + (p.buffStats.move_speed || 0) + (gstat('move_speed', null) - (sctx.flat.move_speed || 0))));
    if (p.form === 'werewolf') speed *= 1.1;
    if (p.st.slow) speed *= 1 - p.st.slow.pct; if (p.st.chill) speed *= 1 - p.st.chill.pct;
    if (p.channel && p.channel.res.eff.moveMult) speed *= p.channel.res.eff.moveMult;
    for (const b of p.buffs) if (b.moveMult) speed *= b.moveMult;
    if (p.attackTimer > 0 && !p.channel) speed *= 0.75;
    if (p.mounted) speed = p.speed * 2.3 * Player.mountSpeed(s.char) * (p.spurTimer > 0 ? 1.8 : 1);
    if (p.dash) {
      const step = Math.min(p.dash.remaining, p.dash.speed * dt);
      const nx = p.x + Math.cos(p.dash.dir) * step, ny = p.y + Math.sin(p.dash.dir) * step;
      p.x = nx; p.y = ny; p.dash.remaining -= step; p.facing = p.dash.dir;
      const beforeX = p.x, beforeY = p.y; resolveObstacles(p); if (!p.dash.leap && (Math.abs(beforeX - p.x) > 0.01 || Math.abs(beforeY - p.y) > 0.01)) p.dash.remaining = 0;
      if (p.dash.res && !p.dash.leap) { enemiesIn(p.x, p.y, p.dash.width / 2 + 0.5).forEach(e => { if (!p.dash.hit.has(e)) { p.dash.hit.add(e); hitList([e], p.dash.res, p.dash.cast, {}); if (p.dash.res.eff.apply && p.dash.res.eff.apply.some(a => a.st === 'knockdown') && e.elite.rank !== 'boss') { const a = p.dash.dir + (Math.random() - 0.5); e.kb = { vx: Math.cos(a) * 6, vy: Math.sin(a) * 6, t: 0.25 }; } } }); }
      if (p.dash.remaining <= 0.001) { if (p.dash.onLand) p.dash.onLand(); if (p.dash.res && p.dash.res.gen && p.dash.hit.size) gainResource(p, p.dash.res.gen); p.dash = null; }
    } else if (p.moving) {
      const nx = p.x + inp.mx / len * Math.min(1, len) * speed * dt, ny = p.y + inp.my / len * Math.min(1, len) * speed * dt;
      p.x = nx; p.y = ny;
      if (p.attackTimer <= 0 && !p.channel) p.facing = Math.atan2(inp.my, inp.mx);
      resolveObstacles(p);
    }
    if (p.st.fear) { const f = p.st.fear.src; if (f) { const a = U.angleTo(f.x, f.y, p.x, p.y); p.x += Math.cos(a) * speed * 0.6 * dt; p.y += Math.sin(a) * speed * 0.6 * dt; resolveObstacles(p); } }
    // dots on player
    updateDots(p, dt);
    // channel
    if (p.channel) updateChannel(dt);
    // portal
    if (p.portal > 0) { p.portal -= dt; if (p.portal <= 0) { p.portal = 0; C.leave('portal'); return; } }
    // auto-aim target refresh
    const t = nearestEnemy(p.x, p.y, 12, e => hasLOS(p, e)) || nearestEnemy(p.x, p.y, 12); s.input.aim = t;
    // pickups
    for (const o of s.orbs) { if (U.dist(o.x, o.y, p.x, p.y) < 1.2) { o.t = 0; heal(p, p.maxHp * 0.15 * (1 + (sctx.flags.orb_heal || 0))); if (sctx.flags.potent_blood && p.hp >= p.maxHp) gainResource(p, sctx.flags.potent_blood, true); p.bloodOrbs++; fireTriggers('blood_orb', {}); if (sctx.flags.blood_artisan && p.bloodOrbs % sctx.flags.blood_artisan === 0) { const r2 = sctx.skills.bone_spirit || Stats.resolveSkill(sctx, DATA.skillById.bone_spirit); runEffect(r2, Object.assign({}, r2.eff, { consumesAllResource: false }), aimFor(r2), { count: 0 }); } } }
    for (const dr of s.drops) { if (dr.taken) continue; const pr = dr.kind === 'gold' || dr.kind === 'material' ? 2.2 * d.pickupRadius : 1.1; if (U.dist(dr.x, dr.y, p.x, p.y) < pr) pickup(dr); }
    if (s.chest && !s.chest.opened && U.dist(s.chest.x, s.chest.y, p.x, p.y) < 1.6) openChest();
    if (s.exit && U.dist(s.exit.x, s.exit.y, p.x, p.y) < 1.4) nextFloor();
  }
  function updateChannel(dt) {
    const s = S(), p = s.player, sctx = s.sctx; const ch = p.channel, res = ch.res, eff = res.eff;
    ch.elapsed += dt; ch.tickT += dt;
    if (isHardCC(p)) { stopChannel(); return; }
    if (eff.kind === 'beam') {
      const t = nearestEnemy(p.x, p.y, eff.range);
      if (t) p.facing = U.angleTo(p.x, p.y, t.x, t.y);
      ch.target = t;
      if (ch.tickT >= eff.interval) {
        ch.tickT = 0;
        if (t) { const targets = [t]; if (eff.chain) enemiesIn(t.x, t.y, 3, e => e !== t).slice(0, eff.chain).forEach(e => targets.push(e)); hitList(targets, res, null, {}); gainResource(p, res.gen * eff.interval); if (eff.channelBuff) addBuff(p, { id: 'decomp_buff', dur: 0.6, mods: [{ stat: 'dmg', add: eff.channelBuff }, { stat: 'dmg_summon', add: eff.channelBuff }] }); ch.corpseT += eff.interval; if (ch.corpseT >= eff.corpseEvery) { ch.corpseT = 0; spawnCorpse(t.x, t.y); if (eff.corpseEssence) gainResource(p, eff.corpseEssence, true); } }
      }
      return;
    }
    if (eff.rampStrikes) { ch.rampT += dt; if (ch.rampT >= eff.rampInterval) { ch.rampT = 0; ch.strikes = Math.min(eff.rampStrikes, ch.strikes + 1); } }
    const interval = eff.interval / (sctx.d.attackSpeed + (p.buffStats.attack_speed || 0));
    if (ch.tickT >= interval) {
      ch.tickT = 0;
      if (p.res < eff.costPerTick * (sctx.flags.core_cost_up ? 1 + sctx.flags.core_cost_up : 1) * (1 - sctx.d.resourceCostRed)) { stopChannel(); return; }
      spendResource(p, eff.costPerTick * (sctx.flags.core_cost_up ? 1 + sctx.flags.core_cost_up : 1) * (1 - sctx.d.resourceCostRed));
      if (eff.bolts) {
        const list = enemiesIn(p.x, p.y, eff.radius);
        for (let i = 0; i < ch.strikes; i++) { const e = list.length ? U.pick(list) : null; if (e) { hitList([e], res, null, {}); s.beams.push({ kind: 'line', x1: e.x + (Math.random() - 0.5), y1: e.y - 7, x2: e.x, y2: e.y, t: 0, dur: 0.15, color: '#ffe55c' }); } else { const ax = p.x + (Math.random() - 0.5) * eff.radius * 2, ay = p.y + (Math.random() - 0.5) * eff.radius * 2; s.beams.push({ kind: 'line', x1: ax, y1: ay - 7, x2: ax, y2: ay, t: 0, dur: 0.15, color: '#ffe55c' }); } }
      } else {
        const list = enemiesIn(p.x, p.y, eff.radius);
        const before = list.map(e => e.hp);
        hitList(list, res, null, {});
        ch.totalBase = (ch.totalBase || 0) + list.reduce((a, e, i) => a + Math.max(0, before[i] - e.hp), 0) * 0.3;
        s.beams.push({ kind: 'spin', x: p.x, y: p.y, radius: eff.radius, t: 0, dur: interval, color: '#ddd' });
        if (sctx.flags.gohrs) {}
      }
    }
  }
  function updateDots(ent, dt) {
    const s = S();
    if (!ent.dots.length) return;
    if (ent.dotTextTimer > 0) ent.dotTextTimer -= dt;
    let total = 0; const byEl = {};
    for (const d of ent.dots) {
      d.dur -= dt; const amt = d.dps * dt; total += amt; byEl[d.element] = (byEl[d.element] || 0) + amt;
      if (d.spread && ent.kind === 'enemy') { d.spread.t += dt; if (d.spread.t >= d.spread.interval) { d.spread.t = 0; enemiesIn(ent.x, ent.y, d.spread.radius, e => e !== ent && !e.dots.some(x => x.st === 'poison' && x.spread)).slice(0, 2).forEach(e => { e.dots.push({ st: 'poison', dps: d.dps * 1.1, dur: d.max, max: d.max, src: d.src, element: 'poison', acc: 0, spread: Object.assign({}, d.spread, { t: 0 }), skill: d.skill }); }); } }
    }
    ent.dots = ent.dots.filter(d => d.dur > 0);
    if (ent.kind === 'enemy') {
      for (const el of Object.keys(byEl)) { const src = ent.dots.find(d => d.element === el) || {}; hitEnemy(ent, { src: src.src || s.player, skill: src.skill, baseDmgOverride: byEl[el] / (1 + s.sctx.d.mainStatBonus), element: el, tags: src.skill ? src.skill.tags : [], isDot: true, dotKind: el === 'physical' ? 'bleed' : null, noTrigger: true, mult: 0 }); if (ent.dead) return; }
    } else if (ent.kind === 'player') { for (const el of Object.keys(byEl)) damagePlayer(byEl[el], { src: ent.dots[0] && ent.dots[0].src, element: el, isDot: true }); }
    else { damageMinion(ent, total, {}); }
  }
  function pickup(dr) {
    const s = S(), char = s.char, p = s.player;
    if (dr.kind === 'gold') { Player.addMaterial(char, 'gold', dr.amount); s.goldGained += dr.amount; addText(dr.x, dr.y - 0.5, '+' + U.fmtNum(dr.amount) + ' gold', '#ffd76a', 0.7); dr.taken = true; }
    else if (dr.kind === 'material') { Player.addMaterial(char, dr.id, dr.amount); addText(dr.x, dr.y - 0.5, '+' + dr.amount + ' ' + DATA.MATERIALS[dr.id].name, DATA.MATERIALS[dr.id].color, 0.7); dr.taken = true; }
    else if (dr.kind === 'potion') { p.potions = Math.min(s.sctx.d.potionCharges, p.potions + 1); char.potion.charges = p.potions; addText(dr.x, dr.y - 0.5, '+1 Potion', '#ff6a6a', 0.7); dr.taken = true; }
    else if (dr.kind === 'gem') { const g = Items.makeGem(dr.gem, dr.tier); if (Player.addItem(char, g)) { addText(dr.x, dr.y - 0.5, g.name, g.color, 0.8); dr.taken = true; s.lootLog.push(g); } else { dr.full = true; } }
    else if (dr.kind === 'item') { if (Player.addItem(char, dr.item)) { const rd = DATA.RARITY[dr.item.rarity]; addText(dr.x, dr.y - 0.5, dr.item.name, rd.color, rd.order >= 3 ? 1.0 : 0.8, rd.order >= 3); dr.taken = true; s.lootLog.push(dr.item); if (rd.order >= 3) log('Found ' + dr.item.name, rd.color); if (s.hooks.onLoot) s.hooks.onLoot(dr.item); } else { if (!dr.full) log('Inventory full!', '#f88'); dr.full = true; } }
    if (dr.taken) Player.syncPassiveObjectives(char);
  }

  // ------------------------------------------------------------- update: minions
  function updateMinions(dt) {
    const s = S(), p = s.player, sctx = s.sctx;
    const respawn = [];
    for (const m of s.minions) {
      if (m.dead) { if (m.respawn !== undefined) { m.respawn -= dt; if (m.respawn <= 0) respawn.push(m); } continue; }
      if (m.hitFlash > 0) m.hitFlash -= dt;
      if (m.temp) { m.lifeT += dt; if (m.lifeT >= m.dur) { m.dead = true; continue; } }
      for (const k of Object.keys(m.st)) { m.st[k].dur -= dt; if (m.st[k].dur <= 0) delete m.st[k]; }
      updateDots(m, dt); if (m.dead) continue;
      const def = m.def;
      // heal (bonded in essence)
      if (sctx.flags.minion_heal) { m.healT = (m.healT || 0) + dt; if (m.healT >= 5) { m.healT = 0; m.hp = Math.min(m.maxHp, m.hp + m.maxHp * sctx.flags.minion_heal); } }
      const leash = 11;
      let target = m.forceTarget && !m.forceTarget.dead ? m.forceTarget : nearestEnemy(m.x, m.y, 9, e => dist(e, p) < leash + 4 && hasLOS(m, e));
      if (dist(m, p) > leash + 2) { m.x = p.x + (Math.random() - 0.5) * 2; m.y = p.y + (Math.random() - 0.5) * 2; }
      const atkSpeed = sctx.d.minionAttackSpeed * (sctx.flags.inspiring_leader && p.hp >= p.maxHp * 0.8 ? 1.04 : 1) * (p.kalans ? (S().minions.length >= 7 ? 1.3 : 1.15) : 1);
      m.cd -= dt * atkSpeed;
      if (def.exploder) { const t = target || nearestEnemy(m.x, m.y, 20); if (t) { const a = U.angleTo(m.x, m.y, t.x, t.y); m.x += Math.cos(a) * m.speed * dt; m.y += Math.sin(a) * m.speed * dt; if (dist(m, t) < t.r + 1.0) { m.dead = true; if (m.explodeRes) { const r = m.explodeRes; enemiesIn(m.x, m.y, r.eff.radius).forEach(e => hitEnemy(e, { src: p, skill: r, coef: r.coef, element: r.element, tags: r.tags, minion: m })); addParticles(m.x, m.y, 16, '#d8c8a8', 5, 0.5); } else explodeVolatile(m); } } continue; }
      if (def.caster) { m.x = p.x - 0.8; m.y = p.y + 0.6; if (m.cd <= 0) { const t = nearestEnemy(m.x, m.y, 7); if (t) { m.cd = def.atkCd * 2.5; const list = enemiesIn(t.x, t.y, 1.8); list.forEach(e => { addDot(e, 'poison', m.dmgBase * 2.0 * (1 + sctx.d.minionDmg), 4, p, {}); applyStatus(e, { st: 'immobilize', dur: 1 }, p); }); s.beams.push({ kind: 'ring', x: t.x, y: t.y, radius: 1.8, t: 0, dur: 0.4, color: '#7dff5c' }); } } continue; }
      if (def.flying) { const t = target; const tx = t ? t.x : p.x, ty = t ? t.y - 1.5 : p.y - 1.5; const a = U.angleTo(m.x, m.y, tx, ty); const dd = U.dist(m.x, m.y, tx, ty); if (dd > 1) { m.x += Math.cos(a) * m.speed * dt; m.y += Math.sin(a) * m.speed * dt; } if (t && m.cd <= 0 && dd < 3) { m.cd = def.atkCd; minionHit(m, t, 1.0); } continue; }
      if (!target) { const dd = dist(m, p); if (dd > 2.5) { const a = U.angleTo(m.x, m.y, p.x, p.y); m.x += Math.cos(a) * m.speed * dt; m.y += Math.sin(a) * m.speed * dt; } resolveObstacles(m); continue; }
      const dd = dist(m, target) - target.r;
      if (def.ranged) {
        if (dd > m.range * 0.8) { const a = U.angleTo(m.x, m.y, target.x, target.y); m.x += Math.cos(a) * m.speed * dt; m.y += Math.sin(a) * m.speed * dt; }
        if (m.cd <= 0 && dd <= m.range) { m.cd = def.atkCd; const dir = U.angleTo(m.x, m.y, target.x, target.y); spawnProjectile({ x: m.x, y: m.y, dir, speed: 12, range: m.range + 2, radius: 0.4, pierce: 0, owner: p, minion: m, element: m.element || 'physical', coef: 1, color: DATA.ELEMENT_COLOR[m.element || 'physical'], minionProj: true }); if (m.variant === 'bone') m.hp = Math.max(1, m.hp - m.maxHp * 0.15); }
      } else {
        if (dd > m.range) { const a = U.angleTo(m.x, m.y, target.x, target.y); m.x += Math.cos(a) * m.speed * dt; m.y += Math.sin(a) * m.speed * dt; }
        else if (m.cd <= 0) { m.cd = def.atkCd; minionHit(m, target, 1.0); if (m.type === 'golem' && (sctx.flags.golem_slam || sctx.flags.golem_taunt)) { m.slamT = (m.slamT || 0) + 1; if (m.slamT >= 4) { m.slamT = 0; enemiesIn(m.x, m.y, 2.5).forEach(e => { if (sctx.flags.golem_slam) applyStatus(e, { st: 'vulnerable', dur: 3 }, p); if (sctx.flags.golem_stun) applyStatus(e, { st: 'stun', dur: 1.5 }, p); if (sctx.flags.golem_taunt) applyStatus(e, { st: 'taunt', dur: 3 }, m); }); s.beams.push({ kind: 'ring', x: m.x, y: m.y, radius: 2.5, t: 0, dur: 0.3, color: '#8a9a7a' }); } } }
      }
      resolveObstacles(m);
    }
    respawn.forEach(m => { m.dead = false; m.hp = m.maxHp; m.x = p.x + (Math.random() - 0.5) * 2; m.y = p.y + (Math.random() - 0.5) * 2; m.respawn = undefined; m.dots = []; m.st = {}; });
    s.minions = s.minions.filter(m => !m.dead || m.respawn !== undefined);
  }
  function minionHit(m, target, coefMult) {
    const s = S(), p = s.player, sctx = s.sctx;
    const info = { src: p, coef: coefMult, element: m.element || 'physical', tags: ['summoning', m.type === 'wolf' || m.type === 'raven' ? 'companion' : 'minion'], minion: m, skill: m.skillId ? sctx.skills[m.skillId] : null, noOverpower: true };
    if (m.empowered) { m.empowered = false; info.coef = 2.0; enemiesIn(target.x, target.y, 2).forEach(e => { if (e !== target) hitEnemy(e, Object.assign({}, info, { noTrigger: true })); }); }
    if (m.variant === 'shadow' && sctx.flags.mage_double && U.chance(0.25)) info.coef *= 2;
    const dmg = hitEnemy(target, info);
    if (m.applyOnHit) applyStatus(target, Object.assign({}, m.applyOnHit), p);
    if (m.variant === 'reapers' && U.chance(0.15)) spawnCorpse(target.x, target.y);
    if (m.variant === 'defenders' && sctx.flags.minion_stun && U.chance(0.2)) applyStatus(target, { st: 'stun', dur: 1 }, p);
    if (m.variant === 'defenders' && sctx.flags.minion_taunt && U.chance(0.3)) applyStatus(target, { st: 'taunt', dur: 2 }, m);
    if (m.variant === 'cold' && sctx.flags.mage_chill) { applyStatus(target, { st: 'chill', pct: 0.3, dur: 2 }, p); if (sctx.flags.mage_vuln) applyStatus(target, { st: 'vulnerable', dur: 3 }, p); }
    if (m.type === 'wolf' && sctx.flags.wolf_dr) addBuff(p, { id: 'wolf_dr', dur: 2, mods: [{ stat: 'dr', add: 0.1 }] });
    if (m.type === 'wolf' && sctx.flags.alpha_wolves && U.chance(0.2)) addDot(target, 'poison', dmg * 1.5, 4, p, {});
    s.beams.push({ kind: 'arc', x: m.x, y: m.y, dir: U.angleTo(m.x, m.y, target.x, target.y), range: 1.4, arc: 1.0, t: 0, dur: 0.12, color: m.color });
  }

  // ------------------------------------------------------------- update: enemies
  function updateEnemies(dt) {
    const s = S(), p = s.player;
    for (const e of s.enemies) {
      if (e.dead) { e.deathT += dt; continue; }
      if (e.hp <= 0 && !e.invuln) { killEnemy(e, { src: p }); continue; }
      if (e.hitFlash > 0) e.hitFlash -= dt;
      if (e.hitStun > 0) e.hitStun -= dt;
      if (e.shoutWeakT > 0) { e.shoutWeakT -= dt; if (e.shoutWeakT <= 0) e.shoutWeak = 0; }
      if (e.unstoppable > 0 && e.unstoppable < 9000) e.unstoppable -= dt;
      for (const k of Object.keys(e.st)) { e.st[k].dur -= dt; if (e.st[k].dur <= 0) delete e.st[k]; }
      updateDots(e, dt); if (e.dead) continue;
      e.inZone = s.zones.some(z => z.team === 0 && z.skill && z.skill.id === 'blight' && U.dist(z.x, z.y, e.x, e.y) <= z.radius);
      e.inConsecration = s.zones.some(z => z.consecration && z.skill && z.skill.flags && false);
      // knockback
      if (e.kb) { e.x += e.kb.vx * dt; e.y += e.kb.vy * dt; e.kb.t -= dt; if (e.kb.t <= 0) e.kb = null; resolveObstacles(e); }
      const ai = e.ai;
      if (e.hidden) { ai.hiddenT -= dt; if (ai.hiddenT <= 0) { e.hidden = false; e.invuln = false; const pt = spawnPoint(true); e.x = pt.x; e.y = pt.y; } continue; }
      // telegraph in progress
      if (ai.telegraph) { ai.telegraph.t += dt; if (ai.telegraph.t >= ai.telegraph.dur) { const tg = ai.telegraph; ai.telegraph = null; if (!isHardCC(e)) tg.fire(); } else continue; }
      if (ai.charging) { const c = ai.charging; const step = Math.min(c.remaining, c.speed * dt); e.x += Math.cos(c.dir) * step; e.y += Math.sin(c.dir) * step; c.remaining -= step; const bx = e.x, by = e.y; resolveObstacles(e); if (Math.abs(bx - e.x) > 0.01 || Math.abs(by - e.y) > 0.01) c.remaining = 0; alliesIn(e.x, e.y, e.r + 0.3).forEach(t => { if (!c.hit.has(t)) { c.hit.add(t); enemyHit(e, t, c.coef, e.def.element, c.knock); } }); if (c.remaining <= 0.001) ai.charging = null; continue; }
      if (isHardCC(e) || e.hitStun > 0) continue;
      if (e.st.fear) { const f = e.st.fear.src || p; const a = U.angleTo(f.x, f.y, e.x, e.y); e.x += Math.cos(a) * e.speed * 0.8 * dt; e.y += Math.sin(a) * e.speed * 0.8 * dt; resolveObstacles(e); continue; }
      // target selection
      let target = ai.target && !ai.target.dead && (ai.target.kind !== 'player' || !p.dead) ? ai.target : null;
      if (!target || ai.retarget <= 0) { ai.retarget = 1.5; const cands = [p].concat(s.minions.filter(m => !m.dead)); target = p.dead ? (cands[1] || null) : cands.reduce((best, c) => { const score = dist(e, c) + (c.kind === 'player' ? -1.5 : 0) + (c.type === 'golem' && S().sctx.flags.golem_taunt ? -4 : 0) + (c.mounted ? 3 : 0); return !best || score < best.score ? { c, score } : best; }, null); target = target && target.c ? target.c : target; }
      ai.retarget = (ai.retarget || 0) - dt;
      if (e.st.taunt && e.st.taunt.src && !e.st.taunt.src.dead) target = e.st.taunt.src;
      ai.target = target;
      if (!target) continue;
      let speed = e.speed * (1 + e.enraged * 0.5);
      if (e.st.slow) speed *= 1 - e.st.slow.pct; if (e.st.chill) speed *= 1 - e.st.chill.pct; if (e.st.decrepify) speed *= 1 - e.st.decrepify.pct;
      if (e.st.immobilize) speed = 0;
      const dd = dist(e, target) - target.r - e.r;
      const beh = e.def.behavior;
      const dirTo = U.angleTo(e.x, e.y, target.x, target.y);
      e.facing = dirTo;
      ai.losT = (ai.losT || 0) - dt; if (ai.losT <= 0) { ai.losT = 0.3; ai.los = hasLOS(e, target); }
      const navA = !ai.los ? navAngle(e) : null; // flow field is built from the player; minions stay close to them, so it guides minion-chasers too
      const moveDir = navA !== null ? navA : dirTo;
      ai.navSteer = navA !== null;
      // abilities
      Object.keys(ai.abilityCds).forEach(k => { ai.abilityCds[k] -= dt; });
      ai.globalCd = (ai.globalCd || 0) - dt;
      let usedAbility = false;
      if (ai.globalCd <= 0 && !e.st.daze) {
        const abil = e.abilities.concat(eliteAbilities(e));
        for (let i = 0; i < abil.length; i++) {
          const a = abil[i]; const key = a.kind + i;
          if (a.kind === 'applyOnHit' || a.kind === 'lifesteal' || a.kind === 'explode' || a.kind === 'phase') continue;
          if ((ai.abilityCds[key] || 0) > 0) continue;
          const want = a.kind === 'summon' ? e.summoned < (a.max || 4) : a.kind === 'heal' ? (a.self ? e.hp < e.maxHp * 0.5 : S().enemies.some(o => !o.dead && o !== e && o.hp < o.maxHp * 0.7 && dist(o, e) < a.radius)) : a.kind === 'charge' ? dd > 2 && dd < a.dist : a.kind === 'blink' ? dd > 4 : a.kind === 'leap' ? dd > 2 && dd < a.dist : a.kind === 'walls' ? dd < 6 : a.kind === 'hook' ? dd > 3 && dd < a.range : a.kind === 'burrow' ? true : (a.kind === 'proj' || a.kind === 'mortar' || a.kind === 'volley' || a.kind === 'aoe' || a.kind === 'pool' || a.kind === 'cone') ? dd < (a.range || e.range || 9) + 2 : a.kind === 'nova' ? dd < (a.radius || 3) + 1 : a.kind === 'buff' || a.kind === 'shield' ? true : dd < 8;
          if (!want) continue;
          if (!ai.los && !['summon', 'heal', 'buff', 'shield', 'blink', 'burrow', 'walls'].includes(a.kind)) continue;
          if (a.kind === 'proj' && e.def.behavior !== 'ranged' && e.def.behavior !== 'caster' && e.def.behavior !== 'summoner' && !e.boss && dd > (a.range || 9)) continue;
          ai.abilityCds[key] = a.cd || 3; ai.globalCd = 0.5 + Math.random() * 0.4;
          useAbility(e, a, target, dirTo, dd);
          usedAbility = true; break;
        }
      }
      if (usedAbility || ai.telegraph) continue;
      // movement & basic attack
      const ranged = beh === 'ranged' || beh === 'caster' || beh === 'summoner';
      const range = ranged ? (e.def.range || 8) : e.range;
      if (ranged) {
        if (!ai.los) { moveEntity(e, moveDir, speed, dt); }
        else if (dd > range * 0.85) { moveEntity(e, dirTo, speed, dt); }
        else if (dd < range * 0.4) { moveEntity(e, dirTo + Math.PI, speed * 0.7, dt); }
        else { moveEntity(e, dirTo + Math.PI / 2 * ai.strafe, speed * 0.4, dt); if (Math.random() < dt * 0.3) ai.strafe *= -1; }
        if (!e.abilities.some(a => a.kind === 'proj') && dd <= e.range + 0.2) basicAttack(e, target, dt);
      } else if (beh === 'exploder') {
        if (dd > 0.9) moveEntity(e, moveDir, speed * 1.15, dt);
        if (dd <= 1.1 && ai.fuse < 0) { ai.fuse = 0.6; e.ai.telegraphExplode = true; }
        if (ai.fuse >= 0) { ai.fuse -= dt; if (ai.fuse <= 0) { const a = e.abilities.find(x => x.kind === 'explode'); e.dead = true; e.deathT = 0; e.noLoot = true; ai.fuse = 99; explodeEnemy(e, a); s.kills++; if (s.hooks.onKill) s.hooks.onKill(e); } }
      } else {
        if (dd > 0.15) moveEntity(e, moveDir, speed, dt);
        if (dd <= e.range + 0.3 && !e.st.daze && ai.los) basicAttack(e, target, dt);
      }
      // separation
      for (const o of s.enemies) { if (o === e || o.dead || o.hidden) continue; const dx = e.x - o.x, dy = e.y - o.y; const d2 = dx * dx + dy * dy; const min = (e.r + o.r) * 0.9; if (d2 < min * min && d2 > 0.0001) { const d1 = Math.sqrt(d2); const push = (min - d1) * 0.5; e.x += dx / d1 * push; e.y += dy / d1 * push; } }
      resolveObstacles(e);
      // phases
      if (e.boss && e.phases.length && e.hp <= e.maxHp * e.phases[0].at) { const ph = e.phases.shift(); if (ph.add) e.abilities.push(...ph.add); if (ph.speedMult) e.speed *= ph.speedMult; addText(e.x, e.y - e.r - 1, e.name + ' grows stronger!', '#b36cff', 1.1, true); S().shake = 0.4; }
      if (e.elite.affixes.some(a => a.enrage)) { const a = e.elite.affixes.find(x => x.enrage); e.enraged = Math.max(e.enraged, a.enrage * (1 - e.hp / e.maxHp)); }
    }
    // remove dead after animation; summons of dead summoners stay
    s.enemies = s.enemies.filter(e => !e.dead || e.deathT < 4);
  }
  function moveEntity(e, dir, speed, dt) { const ai = e.ai; let d = dir; if (e.blocked && !(ai && ai.navSteer)) { d = dir + (ai.strafe || 1) * 0.9; } e.blocked = false; e.x += Math.cos(d) * speed * dt; e.y += Math.sin(d) * speed * dt; }
  function basicAttack(e, target, dt) {
    const ai = e.ai;
    ai.windup = (ai.windup || 0);
    if (ai.atkT === undefined) ai.atkT = 0.3;
    ai.atkT -= dt;
    if (ai.atkT <= 0) {
      ai.atkT = e.atkCd * (e.elite.affixes.some(a => a.speedMult) ? 0.75 : 1) / (1 + e.enraged * 0.5);
      // short telegraph then hit
      const tgt = target;
      spawnTelegraph(e, { dur: 0.35, kind: 'swing', fire: () => { if (!tgt.dead && dist(e, tgt) - tgt.r - e.r <= e.range + 0.6) enemyHit(e, tgt, 1.0, e.def.element, false); } });
    }
  }
  function enemyHit(e, t, coef, element, knock) {
    const s = S();
    let dmg = e.dmg * coef * (1 + e.enraged * 0.5) * (1 + e.buffed);
    if (t.kind === 'player') {
      damagePlayer(dmg, { src: e, element: element || 'physical', direct: true });
      if (knock && !S().player.dead && S().player.unstoppable <= 0) { const a = U.angleTo(e.x, e.y, t.x, t.y); t.x += Math.cos(a) * 1.5; t.y += Math.sin(a) * 1.5; resolveObstacles(t); applyStatus(t, { st: 'knockdown', dur: 0.8 }, e); }
      const onHits = e.def.abilities.filter(a => a.kind === 'applyOnHit').map(a => a.apply).concat(e.elite.affixes.filter(a => a.onHit).map(a => a.onHit));
      onHits.forEach(ap => { if (ap.chance === undefined || U.chance(ap.chance)) { if (ap.coef) applyStatus(t, Object.assign({}, ap, { total: e.dmg * ap.coef }), e); else applyStatus(t, Object.assign({}, ap), e); } });
    } else damageMinion(t, dmg, { src: e });
    s.beams.push({ kind: 'arc', x: e.x, y: e.y, dir: U.angleTo(e.x, e.y, t.x, t.y), range: e.range + 0.5, arc: 1.0, t: 0, dur: 0.15, color: '#ff6a6a' });
  }
  function eliteAbilities(e) {
    if (e.elite.rank === 'normal' || e.elite.rank === 'boss') return [];
    if (e._eliteAb) return e._eliteAb;
    const out = [];
    e.elite.affixes.forEach(a => {
      if (a.blink) out.push({ kind: 'blink', dist: a.blink, cd: 6 });
      if (a.volley) out.push({ kind: 'volley', count: a.volley.count, coef: a.volley.coef, element: a.volley.element, cd: a.volley.cd, range: 10 });
      if (a.pool) out.push({ kind: 'pool', radius: a.pool.radius, dur: a.pool.dur, coef: a.pool.coef, element: a.pool.element, cd: a.pool.cd, apply: a.pool.apply, atSelf: true });
      if (a.mortar) out.push({ kind: 'mortar', radius: a.mortar.radius, coef: a.mortar.coef, element: a.mortar.element, cd: a.mortar.cd, delay: a.mortar.delay, range: 12 });
      if (a.walls) out.push({ kind: 'walls', cd: a.walls.cd });
      if (a.summon) out.push({ kind: 'summon', id: e.def.id, count: a.summon.count, cd: a.summon.cd, max: 4 });
      if (a.shield) out.push({ kind: 'shield', pct: a.shield.pct, cd: a.shield.cd });
      if (a.buffAllies) out.push({ kind: 'buff', radius: 6, dmg: a.buffAllies, cd: 8 });
    });
    e._eliteAb = out; return out;
  }
  function useAbility(e, a, target, dirTo, dd) {
    const s = S(), p = s.player;
    const extraProj = e.elite.affixes.find(x => x.extraProj); const extra = extraProj ? extraProj.extraProj : 0;
    switch (a.kind) {
      case 'proj': { const count = (a.count || 1) + extra; const spread = a.spread || (count > 1 ? 0.3 : 0); spawnTelegraph(e, { dur: 0.3, kind: 'cast', fire: () => { const d2 = U.angleTo(e.x, e.y, target.x, target.y); for (let i = 0; i < count; i++) { const off = count > 1 ? (i - (count - 1) / 2) * spread : 0; spawnEnemyProjectile(e, { speed: a.speed, coef: a.coef, element: a.element, dir: d2 + off, range: (a.range || e.def.range || 9) + 3, pierce: a.pierce, apply: a.apply, homing: a.homing }); } } }); break; }
      case 'volley': { spawnTelegraph(e, { dur: 0.4, kind: 'cast', fire: () => { for (let i = 0; i < a.count; i++) spawnEnemyProjectile(e, { speed: 9, coef: a.coef, element: a.element, dir: U.angleTo(e.x, e.y, target.x, target.y) + (i - (a.count - 1) / 2) * 0.25, range: 11 }); } }); break; }
      case 'aoe': { const ax = a.at === 'self' ? e.x : target.x, ay = a.at === 'self' ? e.y : target.y; const dmg = e.dmg * a.coef * (1 + e.enraged * 0.5); s.zones.push({ id: U.uid('tg'), team: 1, x: ax, y: ay, radius: a.radius, dur: a.delay, t: 0, telegraph: true, color: DATA.ELEMENT_COLOR[a.element || 'physical'], onEnd: () => { if (e.dead) return; addParticles(ax, ay, 16, DATA.ELEMENT_COLOR[a.element || 'physical'], 5, 0.4); alliesIn(ax, ay, a.radius).forEach(t => { if (t.kind === 'player') { damagePlayer(dmg, { src: e, element: a.element || 'physical', direct: true }); if (a.apply) applyStatus(t, Object.assign({}, a.apply), e); if (a.knock) applyStatus(t, { st: 'knockdown', dur: 1 }, e); } else damageMinion(t, dmg, {}); }); } }); if (a.at === 'self') spawnTelegraph(e, { dur: a.delay, kind: 'cast', fire: () => {} }); break; }
      case 'nova': { const dmg = e.dmg * a.coef; const r = a.radius; spawnTelegraph(e, { dur: a.telegraph || 0.8, kind: 'nova', radius: r, fire: () => { addParticles(e.x, e.y, 20, DATA.ELEMENT_COLOR[a.element || 'physical'], 6, 0.5); s.beams.push({ kind: 'ring', x: e.x, y: e.y, radius: r, t: 0, dur: 0.3, color: DATA.ELEMENT_COLOR[a.element || 'physical'] }); alliesIn(e.x, e.y, r).forEach(t => { if (t.kind === 'player') { damagePlayer(dmg, { src: e, element: a.element || 'physical', direct: true }); if (a.apply) applyStatus(t, Object.assign({}, a.apply), e); } else damageMinion(t, dmg, {}); }); } }); break; }
      case 'cone': { const dmg = e.dmg * a.coef; const dir0 = dirTo; spawnTelegraph(e, { dur: a.telegraph || 0.8, kind: 'cone', range: a.range, arc: a.arc, dir: dir0, fire: () => { s.beams.push({ kind: 'arc', x: e.x, y: e.y, dir: dir0, range: a.range, arc: a.arc, t: 0, dur: 0.3, color: DATA.ELEMENT_COLOR[a.element || 'physical'] }); alliesIn(e.x, e.y, a.range).forEach(t => { if (Math.abs(U.angleDiff(dir0, U.angleTo(e.x, e.y, t.x, t.y))) <= a.arc / 2 + 0.15) { if (t.kind === 'player') damagePlayer(dmg, { src: e, element: a.element || 'physical', direct: true }); else damageMinion(t, dmg, {}); } }); } }); break; }
      case 'charge': { const dir0 = dirTo; spawnTelegraph(e, { dur: 0.6, kind: 'charge', range: a.dist, dir: dir0, fire: () => { e.ai.charging = { dir: dir0, remaining: a.dist, speed: 14, coef: a.coef, knock: a.knock, hit: new Set() }; } }); break; }
      case 'leap': { const tx = target.x, ty = target.y; const dmg = e.dmg * a.coef; e.hidden = true; e.ai.hiddenT = 0.5; e.invuln = true; s.zones.push({ id: U.uid('tg'), team: 1, x: tx, y: ty, radius: a.radius, dur: 0.6, t: 0, telegraph: true, color: '#ff6a6a', onEnd: () => { e.hidden = false; e.invuln = false; e.ai.hiddenT = 0; e.x = tx; e.y = ty; resolveObstacles(e); s.shake = 0.3; alliesIn(tx, ty, a.radius).forEach(t => { if (t.kind === 'player') { damagePlayer(dmg, { src: e, element: 'physical', direct: true }); applyStatus(t, { st: 'knockdown', dur: 0.8 }, e); } else damageMinion(t, dmg, {}); }); } }); break; }
      case 'summon': { spawnTelegraph(e, { dur: 0.6, kind: 'cast', fire: () => spawnSummoned(a.id, e.x, e.y, e, a.count) }); break; }
      case 'heal': { if (a.self) { e.hp = Math.min(e.maxHp, e.hp + e.maxHp * a.pct); addText(e.x, e.y - e.r, '+' + U.fmtNum(e.maxHp * a.pct), '#5cff7a', 0.8); } else S().enemies.forEach(o => { if (!o.dead && dist(o, e) <= a.radius) { o.hp = Math.min(o.maxHp, o.hp + o.maxHp * a.pct); addText(o.x, o.y - o.r, '+' + U.fmtNum(o.maxHp * a.pct), '#5cff7a', 0.7); } }); break; }
      case 'buff': { S().enemies.forEach(o => { if (!o.dead && dist(o, e) <= a.radius) { o.buffed = Math.max(o.buffed, a.dmg); o.buffT = 6; } }); s.beams.push({ kind: 'ring', x: e.x, y: e.y, radius: a.radius, t: 0, dur: 0.5, color: '#ff8c1a' }); break; }
      case 'pool': { const ax = a.atSelf ? e.x : target.x, ay = a.atSelf ? e.y : target.y; spawnZone({ team: 1, x: ax, y: ay, radius: a.radius, dur: a.dur, interval: 0.5, coef: a.coef * 0.5, element: a.element, owner: e, dmgBase: e.dmg, apply: a.apply }); break; }
      case 'mortar': { const tx = target.x + (Math.random() - 0.5) * 2, ty = target.y + (Math.random() - 0.5) * 2; const dmg = e.dmg * a.coef; s.zones.push({ id: U.uid('tg'), team: 1, x: tx, y: ty, radius: a.radius, dur: a.delay, t: 0, telegraph: true, color: DATA.ELEMENT_COLOR[a.element], onEnd: () => { addParticles(tx, ty, 16, DATA.ELEMENT_COLOR[a.element], 5, 0.4); alliesIn(tx, ty, a.radius).forEach(t => t.kind === 'player' ? damagePlayer(dmg, { src: e, element: a.element, direct: true }) : damageMinion(t, dmg, {})); } }); break; }
      case 'blink': { const a2 = Math.random() * Math.PI * 2; e.x = U.clamp(target.x + Math.cos(a2) * 2, 1, s.w - 1); e.y = U.clamp(target.y + Math.sin(a2) * 2, 1, s.h - 1); addParticles(e.x, e.y, 10, '#b36cff', 3, 0.4); e.ai.atkT = 0.4; break; }
      case 'walls': { for (let i = 0; i < 8; i++) { const an = i / 8 * Math.PI * 2; if (Math.abs(U.angleDiff(an, U.angleTo(p.x, p.y, e.x, e.y))) < 0.5) continue; s.walls.push({ x: p.x + Math.cos(an) * 2.6, y: p.y + Math.sin(an) * 2.6, r: 0.5, t: 5, owner: 'enemy', color: '#6a5a4a' }); } break; }
      case 'shield': { e.shield = e.maxHp * a.pct; addText(e.x, e.y - e.r, 'Barrier', '#ffe9a0', 0.8); break; }
      case 'hook': { const dir0 = dirTo; spawnTelegraph(e, { dur: 0.5, kind: 'charge', range: a.range, dir: dir0, fire: () => { if (Math.abs(U.angleDiff(dir0, U.angleTo(e.x, e.y, p.x, p.y))) < 0.25 && dist(e, p) <= a.range + 1 && p.unstoppable <= 0) { p.x = e.x + Math.cos(dir0) * (e.r + 0.8); p.y = e.y + Math.sin(dir0) * (e.r + 0.8); damagePlayer(e.dmg * a.coef, { src: e, element: 'physical', direct: true }); applyStatus(p, { st: 'stun', dur: 1 }, e); s.beams.push({ kind: 'line', x1: e.x, y1: e.y, x2: p.x, y2: p.y, t: 0, dur: 0.3, color: '#aaa' }); } } }); break; }
      case 'burrow': { e.hidden = true; e.invuln = true; e.ai.hiddenT = 3; addParticles(e.x, e.y, 20, '#9a8a4a', 4, 0.6); break; }
      default: break;
    }
  }

  // ------------------------------------------------------------- projectiles & zones
  function updateProjectiles(dt) {
    const s = S(), p = s.player;
    for (const pr of s.projectiles) {
      if (!pr.alive) continue;
      pr.t += dt;
      if (pr.orbit) { pr.orbit.angle += pr.orbit.speed * dt; pr.x = p.x + Math.cos(pr.orbit.angle) * pr.orbit.radius; pr.y = p.y + Math.sin(pr.orbit.angle) * pr.orbit.radius; if (pr.t >= pr.orbit.dur) pr.alive = false; pr.tickT += dt; if (pr.tickT >= pr.interval) { pr.tickT = 0; enemiesIn(pr.x, pr.y, pr.radius).forEach(e => { hitList([e], pr.res, pr.cast, {}); }); } continue; }
      if (pr.homing && pr.team === 0) { const t = pr.target && !pr.target.dead ? pr.target : nearestEnemy(pr.x, pr.y, 8); if (t) { const want = U.angleTo(pr.x, pr.y, t.x, t.y); const cur = Math.atan2(pr.vy, pr.vx); const nd = cur + U.clamp(U.angleDiff(cur, want), -3 * dt, 3 * dt); pr.vx = Math.cos(nd) * pr.speed; pr.vy = Math.sin(nd) * pr.speed; pr.target = t; } }
      if (pr.homing && pr.team === 1 && !p.dead) { const want = U.angleTo(pr.x, pr.y, p.x, p.y); const cur = Math.atan2(pr.vy, pr.vx); const nd = cur + U.clamp(U.angleDiff(cur, want), -2 * dt, 2 * dt); pr.vx = Math.cos(nd) * pr.speed; pr.vy = Math.sin(nd) * pr.speed; }
      if (pr.wander) { const cur = Math.atan2(pr.vy, pr.vx) + (Math.random() - 0.5) * 2.5 * dt; pr.vx = Math.cos(cur) * pr.speed; pr.vy = Math.sin(cur) * pr.speed; }
      if (pr.spectre && pr.returning) { const want = U.angleTo(pr.x, pr.y, p.x, p.y); pr.vx = Math.cos(want) * pr.speed; pr.vy = Math.sin(want) * pr.speed; if (U.dist(pr.x, pr.y, p.x, p.y) < 0.6) { pr.alive = false; continue; } }
      const step = pr.speed * dt; pr.x += pr.vx * dt; pr.y += pr.vy * dt; pr.traveled += step;
      if (pr.x < 0 || pr.y < 0 || pr.x > s.w || pr.y > s.h) { pr.alive = false; onProjExpire(pr); continue; }
      if (!pr.flying && !pr.orbit && !pr.spectre && Layout.pointInside(s.obstacles, pr.x, pr.y)) { pr.alive = false; onProjExpire(pr); continue; }
      if (pr.team === 0) {
        if (pr.interval) { pr.tickT += dt; if (pr.tickT >= pr.interval) { pr.tickT = 0; const list = enemiesIn(pr.x, pr.y, pr.radius); if (list.length) { const extra = {}; if (pr.critRamp) { extra.critBonus = pr.critRamp * (pr.critHits || 0); pr.critHits = (pr.critHits || 0) + list.length; } hitList(list, pr.res, pr.cast, extra); list.forEach(e => { if (pr.knock && e.elite.rank !== 'boss') { const a = Math.atan2(pr.vy, pr.vx); e.kb = { vx: Math.cos(a) * 5, vy: Math.sin(a) * 5, t: 0.2 }; } }); } } }
        else {
          const list = enemiesIn(pr.x, pr.y, pr.radius, e => !pr.hit.has(e));
          for (const e of list) {
            pr.hit.add(e);
            if (pr.minionProj) { minionHit(pr.minion, e, 1.0); }
            else if (pr.res) {
              const extra = {}; if (pr.pierceFalloff) extra.mult = -pr.pierceFalloff * (pr.hit.size - 1); if (pr.consumed !== undefined) extra.mult = (extra.mult || 0) + pr.consumed * 0.01; if (pr.forcedOverpower) extra.forcedOverpower = true; if (pr.empowerMult) extra.coef = pr.res.coef * (1 + pr.empowerMult); if (pr.returning) extra.coef = pr.res.coef * (pr.returnMult || 0.25);
              if (pr.empowerApply) extra.appliesOverride = pr.res.applies.concat([pr.empowerApply]);
              const hpBefore = e.hp; hitList([e], pr.res, pr.cast, extra);
              if (pr.orbOnHit && !pr.orbDone) { pr.orbDone = true; spawnOrb(e.x, e.y); }
              if (pr.extraVsVuln && e.st.vulnerable && !pr.extraDone) { pr.extraDone = true; for (let k = 0; k < pr.extraVsVuln; k++) spawnProjectile(Object.assign({}, pr, { id: U.uid('pr'), hit: new Set([e]), dir: Math.atan2(pr.vy, pr.vx) + (k - 0.5) * 0.4, extraVsVuln: 0, traveled: 0 })); }
              if (pr.aoe) { enemiesIn(pr.x, pr.y, pr.aoe, x => x !== e).forEach(x => hitList([x], pr.res, pr.cast, extra)); s.beams.push({ kind: 'ring', x: pr.x, y: pr.y, radius: pr.aoe, t: 0, dur: 0.3, color: pr.color }); }
              if (pr.ground) spawnZone({ x: pr.x, y: pr.y, radius: pr.aoe || 2, dur: pr.ground.dur, interval: pr.ground.interval, coef: pr.res.coef * pr.ground.coef / (pr.res.def.dmg || 1) * (1 + (pr.groundMult || 0)), element: pr.res.element, owner: p, skill: pr.res, applies: pr.res.applies });
            } else { hitEnemy(e, { src: p, skill: pr.skill, coef: pr.coef, element: pr.element, tags: pr.skill ? pr.skill.tags : [], noTrigger: pr.noTrigger, noOverpower: true }); }
            if (pr.hit.size > (pr.pierce || 0)) { pr.alive = false; onProjExpire(pr, e); break; }
          }
        }
      } else {
        if (!p.dead && U.dist(pr.x, pr.y, p.x, p.y) <= pr.radius + p.r && !pr.hit.has(p)) { pr.hit.add(p); damagePlayer(pr.owner.dmg * pr.coef * (1 + (pr.owner.enraged || 0) * 0.5), { src: pr.owner, element: pr.element, direct: true }); if (pr.apply) applyStatus(p, Object.assign({}, pr.apply, pr.apply.coef ? { total: pr.owner.dmg * pr.apply.coef } : {}), pr.owner); if (pr.hit.size > pr.pierce) { pr.alive = false; continue; } }
        for (const m of s.minions) { if (!m.dead && U.dist(pr.x, pr.y, m.x, m.y) <= pr.radius + m.r && !pr.hit.has(m)) { pr.hit.add(m); damageMinion(m, pr.owner.dmg * pr.coef, {}); if (pr.hit.size > pr.pierce) { pr.alive = false; break; } } }
      }
      if (pr.alive && pr.traveled >= pr.range) { if (pr.spectre && !pr.returning) { pr.returning = true; pr.hit = new Set(); pr.traveled = -999; } else { pr.alive = false; onProjExpire(pr); } }
    }
    s.projectiles = s.projectiles.filter(pr => pr.alive);
  }
  function onProjExpire(pr, e) {
    const s = S();
    if (pr.team !== 0 || !pr.res) return;
    if (pr.aoe && pr.res.eff.homing && !e) { enemiesIn(pr.x, pr.y, pr.aoe).forEach(x => hitList([x], pr.res, pr.cast, {})); }
    let shards = pr.shards || 0; if (pr.shardsOnCrit && e && e.lastCrit) shards += pr.shardsOnCrit;
    if (shards) { for (let i = 0; i < shards; i++) spawnProjectile({ x: pr.x, y: pr.y, dir: Math.atan2(pr.vy, pr.vx) + Math.PI + (i - (shards - 1) / 2) * 0.5, speed: 14, range: 5, radius: 0.35, pierce: 0, res: pr.res, skill: pr.res, cast: pr.cast, owner: s.player, element: pr.res.element, color: pr.color, coef: pr.res.coef * 0.1, size: 0.3, shardProj: true }); }
  }
  function updateZones(dt) {
    const s = S(), p = s.player;
    for (const z of s.zones) {
      z.t += dt;
      if (z.telegraph) { if (z.t >= z.dur) { z.done = true; if (z.onEnd) z.onEnd(); } continue; }
      if (z.follow) { z.x = p.x; z.y = p.y; }
      z.tickT += dt;
      if (z.tickT >= z.interval) {
        z.tickT = 0;
        if (z.team === 0) { const list = enemiesIn(z.x, z.y, z.radius); list.forEach(e => { if (z.skill) { hitList([e], z.skill, z.cast, { coef: z.coef, noTrigger: z.noTrigger, appliesOverride: z.applies || [] }); if (z.applyAmp) e.st.weakened = Object.assign(e.st.weakened || { dur: 0.6, dmgRed: 0 }, { takeMore: z.applyAmp, dur: 0.6 }); } else hitEnemy(e, { src: p, coef: z.coef, element: z.element, tags: [], noTrigger: true, noOverpower: true }); }); if (z.selfHeal && U.dist(p.x, p.y, z.x, z.y) <= z.radius) heal(p, p.maxHp * z.selfHeal); }
        else { if (!p.dead && U.dist(p.x, p.y, z.x, z.y) <= z.radius + p.r) { damagePlayer(z.dmgBase * z.coef, { src: z.owner, element: z.element, isDot: true }); if (z.apply) applyStatus(p, Object.assign({}, z.apply), z.owner); } s.minions.forEach(m => { if (!m.dead && U.dist(m.x, m.y, z.x, z.y) <= z.radius + m.r) damageMinion(m, z.dmgBase * z.coef, {}); }); }
      }
      if (z.t >= z.dur) z.done = true;
    }
    s.zones = s.zones.filter(z => !z.done);
    s.walls.forEach(w => { w.t -= dt; }); s.walls = s.walls.filter(w => w.t > 0);
  }

  // ------------------------------------------------------------- mode progression & spawning
  function updateSpawning(dt) {
    const s = S(), p = s.player;
    if (s.mode === 'boss') return;
    const alive = s.enemies.filter(e => !e.dead && !e.summonedBy).length;
    if (s.mode === 'field' || s.mode === 'event') {
      s.spawnTimer -= dt;
      const maxAlive = s.mode === 'event' ? 12 + s.wave * 2 : 14;
      const totalAlive = s.enemies.filter(e => !e.dead).length; if (totalAlive >= maxAlive + 8) return;
      if (s.spawnTimer <= 0 && alive < maxAlive) {
        s.spawnTimer = s.mode === 'event' ? 4 : 5 + Math.random() * 3;
        const r = Math.random();
        const rank = r < 0.06 ? 'elite' : r < 0.22 ? 'champion' : null;
        spawnPack(3 + U.randInt(0, 4), rank);
        if (s.mode === 'event') s.wave++;
        if (s.mode === 'field' && !s.treasureGoblinSpawned && Math.random() < 0.04) { s.treasureGoblinSpawned = true; spawnGoblin(); }
        if (s.mode === 'field' && Math.random() < 0.015 && !s.bossRef && s.char.level >= 10) { spawnBoss(DATA.bossById.butcher); }
      }
      if (s.mode === 'event') { s.eventTimer -= dt; if (s.eventTimer <= 0 && !s.cleared) { s.cleared = true; onCleared(); } }
      return;
    }
    // quota modes: spawn packs progressively
    if (s.spawned < s.quota) {
      s.spawnTimer -= dt;
      if (s.spawnTimer <= 0 && alive < 10) {
        s.spawnTimer = 2.5;
        const remaining = s.quota - s.spawned;
        const size = Math.min(remaining, 3 + U.randInt(0, 3));
        const lastPack = remaining - size <= 0;
        let rank = null;
        if (lastPack) rank = (s.mode === 'stronghold' || (s.mode === 'dungeon' && s.floor === s.maxFloors)) ? 'superunique' : 'elite';
        else if (Math.random() < (s.mode === 'stronghold' ? 0.25 : 0.14)) rank = Math.random() < 0.3 ? 'elite' : 'champion';
        if (lastPack && s.area.capstone && s.floor === s.maxFloors) { spawnBoss(DATA.bossById[s.area.bossFinal]); s.spawned += size; }
        else spawnPack(size, rank);
      }
    } else if (!s.cleared && alive === 0 && !s.enemies.some(e => !e.dead)) {
      s.cleared = true; onCleared();
    }
  }
  function spawnGoblin() { const s = S(); const def = Object.assign({}, DATA.enemyById.fallen, { id: 'goblin', name: 'Treasure Goblin', hp: 3, dmg: 0.2, speed: 6.5, color: '#ffd76a', shape: 'imp', abilities: [], xp: 5 }); const pt = spawnPoint(false); const e = makeEnemy(def, pt.x, pt.y, s.level, 'champion'); e.elite.affixes = []; e.goblin = true; e.name = 'Treasure Goblin'; s.enemies.push(e); log('A Treasure Goblin appears!', '#ffd76a'); }
  function onCleared() {
    const s = S(), p = s.player, char = s.char;
    if (s.mode === 'dungeon' && s.floor < s.maxFloors) { if (s.nav) updateNav(); s.exit = freeSpotNear(s.w / 2, 4, 10); log('Floor cleared! Find the stairs.', '#ffe55c'); return; }
    // final clear: chest + rewards
    if (s.nav) updateNav(); s.chest = Object.assign(freeSpotNear(p.x + 2, p.y - 2, 6), { opened: false });
    if (s.mode === 'event') { log('Event complete! Claim the chest.', '#ffe55c'); }
    else log('Area cleared! Claim your reward.', '#ffe55c');
    if (s.mode === 'dungeon' || s.mode === 'stronghold' || s.mode === 'cellar' || s.mode === 'event') { if (s.hooks.onCleared) s.hooks.onCleared(s.mode); }
  }
  function openChest() {
    const s = S(), p = s.player, char = s.char, diff = s.diff;
    s.chest.opened = true;
    const n = s.mode === 'cellar' ? 2 : s.mode === 'event' ? 3 : 4;
    const power = Math.max(diff.powerFloor, Stats.itemPowerForLevel(s.level));
    for (let i = 0; i < n; i++) { const r = Math.random(); const rarity = r < 0.35 * diff.legChance * 0.5 ? 'legendary' : r < 0.8 ? 'rare' : 'magic'; const a = Math.random() * Math.PI * 2; s.drops.push({ kind: 'item', item: Items.generate({ cls: char.cls, level: s.level, power, rarity }), x: s.chest.x + Math.cos(a) * 1.5, y: s.chest.y + Math.sin(a) * 1.5, t: 0 }); }
    s.drops.push({ kind: 'gold', amount: Math.round((200 + s.level * 30) * diff.gold), x: s.chest.x, y: s.chest.y + 0.5, t: 0 });
    s.drops.push({ kind: 'material', id: 'obols', amount: 30 + U.randInt(0, 40), x: s.chest.x + 0.5, y: s.chest.y - 0.5, t: 0 });
    if (s.mode !== 'cellar') s.drops.push({ kind: 'material', id: 'veiled_crystal', amount: U.randInt(2, 5), x: s.chest.x - 0.5, y: s.chest.y, t: 0 });
    addParticles(s.chest.x, s.chest.y, 30, '#ffd76a', 5, 0.8, 0.14);
    if (s.hooks.onChest) s.hooks.onChest();
    s.done = true;
  }
  function nextFloor() {
    const s = S();
    s.floor++; s.exit = null; s.enemies = []; s.projectiles = []; s.zones = []; s.corpses = []; s.walls = []; s.beams = []; s.nav = null;
    _.buildMap(); _.setupMode();
    s.minions.forEach(m => { m.x = s.player.x; m.y = s.player.y; });
    log('Floor ' + s.floor + ' of ' + s.maxFloors, '#ffe55c');
    s.player.immune = 1.5;
  }
  C.leave = function (how) { const s = S(); if (!s || s.result) return; s.result = { how, kills: s.kills, eliteKills: s.eliteKills, xp: s.xpGained, gold: s.goldGained, cleared: s.cleared, floor: s.floor, bossKilled: s.bossKilled, elapsed: s.elapsed }; s.char.potion.charges = s.player.potions; if (s.hooks.onEnd) s.hooks.onEnd(s.result); };

  // ------------------------------------------------------------- main update
  C.update = function (dt) {
    const s = S(); if (!s || s.result) return;
    dt = Math.min(dt, 0.05);
    s.t += dt; s.elapsed += dt;
    if (!s.nav) { buildNav(); updateNav(); } else if (s.t - s.nav.t > 0.35) updateNav();
    if (s.shake > 0) s.shake = Math.max(0, s.shake - dt * 1.5);
    // scheduled actions
    const due = s.actions.filter(a => a.t <= s.t); s.actions = s.actions.filter(a => a.t > s.t); due.forEach(a => { try { a.fn(); } catch (err) { console.error(err); } });
    updatePlayer(dt); if (!_.S || _.S.result) return;
    updateMinions(dt);
    updateEnemies(dt); if (!_.S || _.S.result) return;
    updateProjectiles(dt);
    updateZones(dt);
    updateSpawning(dt);
    s.enemies.forEach(e => { if (e.buffT > 0) { e.buffT -= dt; if (e.buffT <= 0) e.buffed = 0; } });
    // decorations: particles, texts, beams, orbs, corpses, drops
    for (const pt of s.particles) { pt.t += dt; pt.x += pt.vx * dt; pt.y += pt.vy * dt; pt.vx *= 0.9; pt.vy *= 0.9; }
    s.particles = s.particles.filter(pt => pt.t < pt.life);
    for (const tx of s.texts) { tx.t += dt; tx.x += tx.vx * dt; tx.y += tx.vy * dt; }
    s.texts = s.texts.filter(tx => tx.t < tx.dur);
    for (const b of s.beams) b.t += dt; s.beams = s.beams.filter(b => b.t < b.dur);
    for (const o of s.orbs) o.t -= dt; s.orbs = s.orbs.filter(o => o.t > 0);
    for (const c of s.corpses) c.t -= dt; s.corpses = s.corpses.filter(c => c.t > 0);
    for (const d of s.drops) d.t += dt; s.drops = s.drops.filter(d => !d.taken && d.t < 300);
    Player.tickElixir(s.char, dt);
    if (s.hooks.onTick) s.hooks.onTick(dt);
  };

  Object.assign(_, { spawnCorpse, spawnOrb, spawnProjectile, spawnZone, spawnEnemyProjectile, killEnemy, killMinion, spawnBoss, spawnPersistentMinions, dismount, spawnPack, makeEnemy, pickEnemyDef, nearestCorpse, hitList, applySkillApplies });
})();
