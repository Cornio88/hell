/* Sanctuary — player/character logic: creation, leveling, skills, paragon, quests, inventory (global: Player, Paragon) */
(function () {
  'use strict';
  const Player = {};
  const Paragon = {};
  Player.INV_CAP = 50;
  Player.STASH_CAP = 100;

  // ---------------------------------------------------------------- creation
  Player.create = function (name, cls, appearance) {
    const c = DATA.classes[cls];
    const start = DATA.classStart[cls];
    const char = {
      id: U.uid('ch'), name: name.trim().slice(0, 16) || 'Wanderer', cls, level: 1, xp: 0, paragonLevel: 0, paragonXp: 0,
      appearance: Object.assign({ skin: 'tan', hair: 'brown', body: 'average' }, appearance || {}), created: Date.now(), playtime: 0,
      skills: { alloc: {}, upgrades: {}, bar: [null, null, null, null, null, null] }, skillPointsBonus: 0,
      mechanics: {}, paragon: { bonus: 0, boards: [], glyphs: {} },
      equipment: {}, inventory: [], materials: { gold: 500, obols: 0 },
      potion: { tier: 1, charges: 4 }, elixir: null,
      quests: { active: {}, done: {}, whispers: { list: [], favor: 0, grim: 0, completed: 0 } },
      cosmetics: { equipped: {}, dye: 'none', marker: 'none', title: 'wanderer' },
      mount: { current: null, armor: 'none', trophy: 'none' },
      unlocks: { waypoints: ['kyovashad'], areasCleared: {}, strongholds: {}, pit: 1 },
      record: { kills: 0, eliteKills: 0, bossKills: 0, dungeons: 0, deaths: 0, events: 0, highestPit: 0 },
      difficulty: 'normal', town: 'kyovashad', zone: 'fractured_peaks'
    };
    if (cls === 'necromancer') char.mechanics.bookOfDead = { skeletal_warriors: { opt: 'skirmishers', upgraded: false }, skeletal_mages: { opt: 'shadow', upgraded: false }, golem: { opt: 'bone', upgraded: false } };
    if (cls === 'barbarian') { char.mechanics.technique = null; char.mechanics.expertise = {}; }
    if (cls === 'druid') char.mechanics.boons = {};
    if (cls === 'paladin') char.mechanics.aura = null;
    // starting gear
    const w = Items.generate({ cls, level: 1, power: 10, rarity: 'normal', slot: 'weapon', type: start.weapon });
    w.name = 'Worn ' + w.name;
    Player.equip(char, w, true);
    if (start.offhand) Player.equip(char, Items.generate({ cls, level: 1, power: 10, rarity: 'normal', slot: 'offhand', type: start.offhand }), true);
    ['chest', 'boots'].forEach(sl => Player.equip(char, Items.generate({ cls, level: 1, power: 10, rarity: 'normal', slot: sl }), true));
    // starting skill
    char.skills.alloc[start.skills[0]] = 1;
    char.skills.bar[0] = start.skills[0];
    Paragon.init(char);
    Player.recompute(char);
    return char;
  };

  Player.recompute = function (char) { char.sctx = Stats.build(char); return char.sctx; };

  // ---------------------------------------------------------------- xp & levels
  Player.addXp = function (char, amount) {
    const gained = { levels: 0, paragon: 0 };
    if (char.level < DATA.MAX_LEVEL) {
      char.xp += amount;
      while (char.level < DATA.MAX_LEVEL && char.xp >= Stats.xpToNext(char.level)) { char.xp -= Stats.xpToNext(char.level); char.level++; gained.levels++; }
      if (char.level >= DATA.MAX_LEVEL) { char.xp = 0; }
    } else if (char.paragonLevel < DATA.MAX_PARAGON) {
      char.paragonXp += amount;
      while (char.paragonLevel < DATA.MAX_PARAGON && char.paragonXp >= Stats.paragonXpToNext(char.paragonLevel)) { char.paragonXp -= Stats.paragonXpToNext(char.paragonLevel); char.paragonLevel++; gained.paragon++; }
    }
    return gained;
  };
  Player.xpForKill = function (char, enemyLevel, xpMult, diff) {
    const base = 8 + enemyLevel * 4 + Math.pow(enemyLevel, 1.5);
    const diffLvl = enemyLevel - char.level;
    let penalty = 1;
    if (diffLvl < -10) penalty = Math.max(0.1, 1 + (diffLvl + 10) * 0.08);
    else if (diffLvl > 0) penalty = 1 + Math.min(3, diffLvl) * 0.05;
    const d = char.sctx ? char.sctx.d.xpBonus : 1;
    return Math.round(base * xpMult * penalty * diff.xp * d);
  };

  // ---------------------------------------------------------------- skills
  Player.skillPointsTotal = (char) => Math.min(DATA.MAX_LEVEL - 1, char.level - 1) + (char.skillPointsBonus || 0);
  Player.skillPointsSpent = function (char) {
    let n = 0;
    Object.values(char.skills.alloc).forEach(v => { n += v; });
    Object.values(char.skills.upgrades).forEach(u => { if (u.e) n++; if (u.v) n++; });
    return n;
  };
  Player.skillPointsFree = (char) => Player.skillPointsTotal(char) - Player.skillPointsSpent(char);
  Player.clusterUnlocked = function (char, cluster) { return Player.skillPointsSpent(char) >= DATA.clusterReq(char.cls, cluster); };
  Player.canAlloc = function (char, skillId) {
    const s = DATA.skillById[skillId]; if (!s || s.cls !== char.cls) return false;
    if (Player.skillPointsFree(char) <= 0) return false;
    if (!Player.clusterUnlocked(char, s.cluster)) return false;
    const cur = char.skills.alloc[skillId] || 0;
    if (cur >= s.max) return false;
    if (s.type === 'key') { if (Object.keys(char.skills.alloc).some(id => DATA.skillById[id].type === 'key' && char.skills.alloc[id] > 0 && id !== skillId)) return false; }
    return true;
  };
  Player.alloc = function (char, skillId) {
    if (!Player.canAlloc(char, skillId)) return false;
    char.skills.alloc[skillId] = (char.skills.alloc[skillId] || 0) + 1;
    const s = DATA.skillById[skillId];
    if (s.type === 'active' && !char.skills.bar.includes(skillId)) { const i = char.skills.bar.indexOf(null); if (i >= 0 && s.effect.kind !== 'aura') char.skills.bar[i] = skillId; }
    if (s.effect && s.effect.kind === 'aura' && !char.mechanics.aura) char.mechanics.aura = skillId;
    Player.recompute(char);
    return true;
  };
  // Refund one point. Prevents breaking cluster thresholds for higher clusters.
  Player.dealloc = function (char, skillId) {
    const cur = char.skills.alloc[skillId] || 0; if (cur <= 0) return false;
    const s = DATA.skillById[skillId];
    const spentAfter = Player.skillPointsSpent(char) - 1 - (cur === 1 ? ((char.skills.upgrades[skillId] || {}).e ? 1 : 0) + ((char.skills.upgrades[skillId] || {}).v ? 1 : 0) : 0);
    // check thresholds of clusters with points
    const clusters = DATA.clusters[char.cls];
    for (const id of Object.keys(char.skills.alloc)) {
      if (!char.skills.alloc[id] || id === skillId) continue;
      const req = DATA.clusterReq(char.cls, DATA.skillById[id].cluster);
      if (spentAfter < req) return false;
    }
    char.skills.alloc[skillId] = cur - 1;
    if (cur === 1) { delete char.skills.alloc[skillId]; delete char.skills.upgrades[skillId]; char.skills.bar = char.skills.bar.map(b => b === skillId ? null : b); if (char.mechanics.aura === skillId) char.mechanics.aura = null; }
    Player.recompute(char);
    return true;
  };
  Player.setUpgrade = function (char, skillId, which) {
    const s = DATA.skillById[skillId]; if (!s || s.type !== 'active' || !(char.skills.alloc[skillId] > 0)) return false;
    const up = char.skills.upgrades[skillId] = char.skills.upgrades[skillId] || {};
    if (which === 'e') { if (up.e || Player.skillPointsFree(char) <= 0) return false; up.e = true; }
    else { if (!up.e || up.v || !s.up[which] || Player.skillPointsFree(char) <= 0) return false; up.v = which; }
    Player.recompute(char);
    return true;
  };
  Player.respecCost = (char) => Math.round(50 * char.level * char.level);
  Player.respecAll = function (char) {
    char.skills.alloc = {}; char.skills.upgrades = {}; char.skills.bar = [null, null, null, null, null, null];
    if (char.cls === 'paladin') char.mechanics.aura = null;
    Player.recompute(char);
  };
  Player.setBar = function (char, idx, skillId) {
    if (skillId) { const s = DATA.skillById[skillId]; if (!s || !(char.skills.alloc[skillId] > 0) || s.type !== 'active' || s.effect.kind === 'aura') return false; const prev = char.skills.bar.indexOf(skillId); if (prev >= 0) char.skills.bar[prev] = char.skills.bar[idx]; }
    char.skills.bar[idx] = skillId || null;
    Player.recompute(char);
    return true;
  };

  // ---------------------------------------------------------------- paragon
  const SIDES = ['top', 'right', 'bottom', 'left'];
  const OPP = { top: 'bottom', bottom: 'top', left: 'right', right: 'left' };
  const GATE_POS = { top: [4, 0], right: [8, 4], bottom: [4, 8], left: [0, 4] };
  const MAGIC_POOL = [
    { name: 'Damage', mods: [{ stat: 'dmg', add: 0.03 }] }, { name: 'Life', mods: [{ stat: 'life_pct', add: 0.025 }] }, { name: 'Armor', mods: [{ stat: 'armor_pct', add: 0.05 }] },
    { name: 'Resist All', mods: [{ stat: 'res_all', add: 0.03 }] }, { name: 'Crit Chance', mods: [{ stat: 'crit_chance', add: 0.015 }] }, { name: 'Crit Damage', mods: [{ stat: 'crit_dmg', add: 0.05 }] },
    { name: 'Vulnerable', mods: [{ stat: 'vuln_dmg', add: 0.05 }] }, { name: 'Resource', mods: [{ stat: 'resource_gen', add: 0.03 }] }, { name: 'Close DR', mods: [{ stat: 'dr_close', add: 0.03 }] },
    { name: 'Distant DR', mods: [{ stat: 'dr_distant', add: 0.03 }] }, { name: 'Elite Damage', mods: [{ stat: 'dmg_vs_elite', add: 0.04 }] }, { name: 'Overpower', mods: [{ stat: 'overpower_dmg', add: 0.08 }] },
    { name: 'Attack Speed', mods: [{ stat: 'attack_speed', add: 0.02 }] }, { name: 'Lucky Hit', mods: [{ stat: 'lucky_hit', add: 0.03 }] }, { name: 'Healing', mods: [{ stat: 'healing', add: 0.04 }] }
  ];
  const boardCache = {};
  Paragon.boardDefs = (cls) => DATA.PARAGON.boards[cls];
  Paragon.glyphDef = (cls, id) => DATA.PARAGON.glyphs.all.find(g => g.id === id) || (DATA.PARAGON.glyphs[cls] || []).find(g => g.id === id);
  Paragon.allGlyphs = (cls) => DATA.PARAGON.glyphs.all.concat(DATA.PARAGON.glyphs[cls] || []);
  Paragon.generate = function (cls, boardId) {
    const key = cls + ':' + boardId;
    if (boardCache[key]) return boardCache[key];
    const def = Paragon.boardDefs(cls).find(b => b.id === boardId); if (!def) return null;
    const isStart = boardId === 'start';
    const rng = U.seededRng(Array.from(key).reduce((a, c) => a * 31 + c.charCodeAt(0), 7) >>> 0);
    const clsDef = DATA.classes[cls];
    const stats = [clsDef.mainStat, clsDef.secondaryStat, 'str', 'int', 'will', 'dex'];
    const board = { id: boardId, name: def.name, nodes: {}, start: isStart ? [4, 7] : null, socket: isStart ? [4, 3] : [4, 4] };
    for (let y = 0; y < 9; y++) for (let x = 0; x < 9; x++) {
      const k = x + ',' + y; let node;
      if (isStart && x === 4 && y === 7) node = { kind: 'start', name: 'Start', mods: [] };
      else if (x === board.socket[0] && y === board.socket[1]) node = { kind: 'socket', name: 'Glyph Socket', mods: [] };
      else if (!isStart && x === 4 && y === 1) node = { kind: 'legendary', name: def.legendary.name, desc: def.legendary.desc, mods: def.legendary.mods };
      else if ((x === 1 && y === 2) || (x === 7 && y === 2)) { const r = def.rare[x === 1 ? 0 : 1]; node = { kind: 'rare', name: r.name, mods: r.mods, desc: r.mods.map(m => Paragon.modText(m)).join(', ') }; }
      else if ((x === 2 && y === 6) || (x === 6 && y === 6)) { const r = def.rare[x === 2 ? 1 : 0]; node = { kind: 'rare', name: r.name, mods: r.mods.map(m => Object.assign({}, m, { add: m.add * 0.75 })), desc: r.mods.map(m => Paragon.modText(Object.assign({}, m, { add: m.add * 0.75 }))).join(', ') }; }
      else if (SIDES.some(s => GATE_POS[s][0] === x && GATE_POS[s][1] === y)) { const side = SIDES.find(s => GATE_POS[s][0] === x && GATE_POS[s][1] === y); node = { kind: 'gate', side, name: U.cap(side) + ' Gate', mods: [], desc: 'Attach another board here.' }; }
      else if ((x + 2 * y) % 5 === 0) { const m = MAGIC_POOL[Math.floor(rng() * MAGIC_POOL.length)]; node = { kind: 'magic', name: m.name, mods: m.mods, desc: m.mods.map(Paragon.modText).join(', ') }; }
      else { const st = stats[(x + y + Math.floor(rng() * 2)) % 2 === 0 ? 0 : (1 + Math.floor(rng() * 5))]; node = { kind: 'normal', name: '+5 ' + DATA.STAT_DEFS[st].name, mods: [{ stat: st, add: 5 }] }; }
      node.x = x; node.y = y; board.nodes[k] = node;
    }
    boardCache[key] = board;
    return board;
  };
  Paragon.modText = function (m) { if (!m.stat) return m.flag || ''; const d = DATA.STAT_DEFS[m.stat]; return (d && d.kind === 'pct' ? U.fmtPct(m.add) : '+' + U.fmtNum(m.add)) + ' ' + (d ? d.name : m.stat); };
  Paragon.init = function (char) {
    if (!char.paragon.boards.length) char.paragon.boards.push({ board: 'start', nodes: { '4,7': true }, glyph: null, attached: null });
  };
  Paragon.getBoard = (char, state) => Paragon.generate(char.cls, state.board);
  Paragon.pointsTotal = (char) => char.paragonLevel + (char.paragon.bonus || 0);
  Paragon.pointsSpent = function (char) { let n = 0; char.paragon.boards.forEach((b, i) => { Object.keys(b.nodes).forEach(k => { const bd = Paragon.getBoard(char, b); const nd = bd.nodes[k]; if (nd && nd.kind !== 'start' && !(b.entry === k)) n++; }); }); return n; };
  Paragon.pointsFree = (char) => Paragon.pointsTotal(char) - Paragon.pointsSpent(char);
  Paragon.canAlloc = function (char, bi, x, y) {
    const st = char.paragon.boards[bi]; if (!st) return false;
    const k = x + ',' + y; if (st.nodes[k]) return false;
    if (Paragon.pointsFree(char) <= 0) return false;
    const adj = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => st.nodes[(x + dx) + ',' + (y + dy)]);
    return adj;
  };
  Paragon.alloc = function (char, bi, x, y) { if (!Paragon.canAlloc(char, bi, x, y)) return false; char.paragon.boards[bi].nodes[x + ',' + y] = true; Player.recompute(char); return true; };
  // Attach a new board to a gate. Side on parent board; new board's opposite gate becomes its (free) entry.
  Paragon.canAttach = function (char, bi, side) {
    const st = char.paragon.boards[bi]; if (!st) return false;
    const gp = GATE_POS[side]; if (!st.nodes[gp[0] + ',' + gp[1]]) return false;
    if (char.paragon.boards.some(b => b.attached && b.attached.parent === bi && b.attached.side === side)) return false;
    if (st.attached && st.attached.side === OPP[side]) return false; // entry side
    return true;
  };
  Paragon.attach = function (char, bi, side, boardId) {
    if (!Paragon.canAttach(char, bi, side)) return false;
    if (char.paragon.boards.some(b => b.board === boardId)) return false;
    const opp = OPP[side]; const gp = GATE_POS[opp];
    char.paragon.boards.push({ board: boardId, nodes: { [gp[0] + ',' + gp[1]]: true }, entry: gp[0] + ',' + gp[1], glyph: null, attached: { parent: bi, side } });
    Player.recompute(char);
    return true;
  };
  Paragon.availableBoards = (char) => Paragon.boardDefs(char.cls).filter(b => b.id !== 'start' && !char.paragon.boards.some(s => s.board === b.id));
  Paragon.socketGlyph = function (char, bi, glyphId) {
    const st = char.paragon.boards[bi]; const bd = Paragon.getBoard(char, st);
    if (!st.nodes[bd.socket[0] + ',' + bd.socket[1]]) return false;
    if (char.paragon.boards.some((b, i) => i !== bi && b.glyph && b.glyph.id === glyphId)) return false;
    st.glyph = glyphId ? { id: glyphId, rank: Paragon.glyphRank(char, glyphId) } : null;
    Player.recompute(char);
    return true;
  };
  Paragon.glyphRank = (char, id) => { const g = char.paragon.glyphs[id] || { xp: 0 }; let r = 1, xp = g.xp; while (r < 21 && xp >= 100 * r) { xp -= 100 * r; r++; } return r; };
  Paragon.glyphXpInfo = (char, id) => { const g = char.paragon.glyphs[id] || { xp: 0 }; let r = 1, xp = g.xp; while (r < 21 && xp >= 100 * r) { xp -= 100 * r; r++; } return { rank: r, xp, next: 100 * r }; };
  Paragon.addGlyphXp = function (char, amount) {
    char.paragon.boards.forEach(b => { if (b.glyph) { const g = char.paragon.glyphs[b.glyph.id] = char.paragon.glyphs[b.glyph.id] || { xp: 0 }; g.xp += amount; b.glyph.rank = Paragon.glyphRank(char, b.glyph.id); } });
  };
  Paragon.statInRadius = function (char, st, stat) {
    const bd = Paragon.getBoard(char, st); let sum = 0;
    Object.keys(st.nodes).forEach(k => { const n = bd.nodes[k]; if (!n) return; if (Math.abs(n.x - bd.socket[0]) <= 2 && Math.abs(n.y - bd.socket[1]) <= 2) (n.mods || []).forEach(m => { if (m.stat === stat) sum += m.add; }); });
    return sum;
  };
  Paragon.resetCost = (char) => 20000 + Paragon.pointsSpent(char) * 500;
  Paragon.reset = function (char) { char.paragon.boards = []; Paragon.init(char); Player.recompute(char); };

  // ---------------------------------------------------------------- inventory
  Player.addItem = function (char, item) { if (char.inventory.length >= Player.INV_CAP) return false; char.inventory.push(item); return true; };
  Player.removeItem = function (char, itemId) { const i = char.inventory.findIndex(x => x.id === itemId); if (i >= 0) return char.inventory.splice(i, 1)[0]; return null; };
  Player.findItem = (char, id) => char.inventory.find(x => x.id === id) || Object.values(char.equipment).find(x => x && x.id === id);
  // Equip into a slot: returns displaced item(s) to inventory.
  Player.equip = function (char, item, silent, preferSlot) {
    if (!silent && !Items.canEquip(item, char)) return false;
    const slots = Items.equipSlotsFor(item, char.cls);
    if (!slots.length) return false;
    let slot = preferSlot && slots.includes(preferSlot) ? preferSlot : (slots.find(s => !char.equipment[s]) || slots[0]);
    const displaced = [];
    // 2H weapon rules for non-barb: weapon slot + offhand incompatible
    const wt = item.type ? DATA.WEAPON_TYPES[item.type] : null;
    if (char.cls !== 'barbarian' && slot === 'weapon' && wt && wt.hands === 2 && char.equipment.offhand) { displaced.push(char.equipment.offhand); char.equipment.offhand = null; }
    if (char.cls !== 'barbarian' && slot === 'offhand' && char.equipment.weapon && DATA.WEAPON_TYPES[char.equipment.weapon.type].hands === 2) { displaced.push(char.equipment.weapon); char.equipment.weapon = null; }
    if (char.equipment[slot]) displaced.push(char.equipment[slot]);
    Player.removeItem(char, item.id);
    char.equipment[slot] = item;
    displaced.forEach(d => { if (!Player.addItem(char, d)) char.inventory.push(d); });
    if (!silent) Player.recompute(char);
    return true;
  };
  Player.unequip = function (char, slot) {
    const it = char.equipment[slot]; if (!it) return false;
    if (char.inventory.length >= Player.INV_CAP) return false;
    char.equipment[slot] = null; char.inventory.push(it); Player.recompute(char); return true;
  };
  Player.canAfford = function (char, cost) { return Object.keys(cost || {}).every(k => (char.materials[k] || 0) >= (cost[k] || 0)); };
  Player.pay = function (char, cost) { if (!Player.canAfford(char, cost)) return false; Object.keys(cost).forEach(k => { char.materials[k] = (char.materials[k] || 0) - (cost[k] || 0); }); return true; };
  Player.addMaterial = function (char, id, n) { char.materials[id] = (char.materials[id] || 0) + n; };
  Player.costText = (cost) => Object.keys(cost).filter(k => cost[k]).map(k => U.fmtNum(cost[k]) + ' ' + (DATA.MATERIALS[k] ? DATA.MATERIALS[k].name : k)).join(', ');

  // ---------------------------------------------------------------- difficulty & unlocks
  Player.difficultyAvailable = function (char, diffId) {
    const d = DATA.diffById[diffId]; if (!d) return false;
    if (char.level < d.minLevel) return false;
    if (d.reqQuest && !char.quests.done[d.reqQuest]) return false;
    return true;
  };
  Player.areaLevel = function (char, area) {
    const z = DATA.zoneById[area.zone];
    const diff = DATA.diffById[char.difficulty];
    // Open world level scales with the player (D4-style) but clamped to the zone band; dungeons/bosses use their offset.
    let lvl;
    if (area.type === 'field' || area.type === 'event' || area.type === 'cellar') lvl = U.clamp(char.level + area.lvl, z.level[0], Math.max(z.level[1], char.level + area.lvl));
    else lvl = Math.max(z.level[0] + area.lvl, Math.min(char.level + area.lvl, z.level[1] + area.lvl));
    if (area.pit) lvl = 60 + (char.unlocks.pit || 1) * 2;
    if (diff.id !== 'normal' && diff.id !== 'hard') lvl = Math.max(lvl, char.level);
    if (diff.id.startsWith('t')) lvl = Math.max(lvl, 60 + (diff.id === 't1' ? 2 : diff.id === 't2' ? 5 : diff.id === 't3' ? 8 : 12));
    if (area.type === 'boss') lvl = Math.max(lvl, DATA.bossById[area.boss].level);
    return Math.max(1, Math.round(lvl));
  };
  Player.areaUnlocked = function (char, area) {
    const z = DATA.zoneById[area.zone];
    if (area.type === 'boss' && area.pinnacle && !char.quests.done.nh_harbinger) return false;
    if (area.capstone === 'capstone_penitent' && char.level < 50) return false;
    if (area.capstone === 'capstone_torment' && char.level < 60) return false;
    return true;
  };
  Player.zoneUnlocked = function (char, zone) { return char.level >= Math.max(1, zone.level[0] - 6) || char.unlocks.waypoints.includes(zone.town); };

  // ---------------------------------------------------------------- quests
  Player.questState = function (char, q) {
    if (char.quests.done[q.id]) return 'done';
    if (char.quests.active[q.id]) return 'active';
    if ((q.prereq || []).some(p => !char.quests.done[p])) return 'locked';
    return 'available';
  };
  Player.acceptQuest = function (char, qid) {
    const q = DATA.questById[qid]; if (!q || Player.questState(char, q) !== 'available') return false;
    char.quests.active[qid] = { progress: q.objectives.map(() => 0) };
    Player.syncPassiveObjectives(char);
    return true;
  };
  Player.questComplete = function (char, qid) {
    const q = DATA.questById[qid]; const st = char.quests.active[qid]; if (!q || !st) return false;
    return q.objectives.every((o, i) => st.progress[i] >= (o.n || 1));
  };
  // Objectives that depend on state (level, counts) are synced here
  Player.syncPassiveObjectives = function (char) {
    Object.keys(char.quests.active).forEach(qid => {
      const q = DATA.questById[qid]; const st = char.quests.active[qid]; if (!q) return;
      q.objectives.forEach((o, i) => {
        if (o.type === 'level') st.progress[i] = Math.min(o.n, char.level);
        if (o.type === 'dungeons_total') st.progress[i] = Math.min(o.n, char.record.dungeons);
        if (o.type === 'elite' && q.milestone) st.progress[i] = Math.min(o.n, char.record.eliteKills);
        if (o.type === 'collect') st.progress[i] = Math.min(o.n, char.materials[o.mat] || 0);
        if (o.type === 'whispers') st.progress[i] = Math.min(o.n, char.quests.whispers.completed);
      });
    });
  };
  // ev: {type:'kill', family, enemy, rank} | {type:'dungeon', id} | {type:'stronghold', id} | {type:'boss', id} | {type:'event', id}
  Player.progressQuests = function (char, ev) {
    const completedNow = [];
    Object.keys(char.quests.active).forEach(qid => {
      const q = DATA.questById[qid]; const st = char.quests.active[qid]; if (!q) return;
      const zoneOk = q.zone === 'any' || !ev.zone || ev.zone === q.zone;
      q.objectives.forEach((o, i) => {
        if (st.progress[i] >= (o.n || 1)) return;
        let hit = false;
        if (ev.type === 'kill') {
          if (o.type === 'kill' && ((o.family && o.family === ev.family) || (o.enemy && o.enemy === ev.enemy))) hit = true;
          if (o.type === 'elite' && !q.milestone && ev.rank && ev.rank !== 'normal' && ev.rank !== 'boss' && zoneOk) hit = true;
        }
        if (ev.type === 'boss' && o.type === 'boss' && o.id === ev.id) hit = true;
        if (ev.type === 'dungeon' && o.type === 'dungeon' && o.id === ev.id) hit = true;
        if (ev.type === 'cellar' && o.type === 'dungeon' && o.id === ev.id) hit = true;
        if (ev.type === 'stronghold' && o.type === 'stronghold' && o.id === ev.id) hit = true;
        if (ev.type === 'event' && o.type === 'event' && o.id === ev.id) hit = true;
        if (hit) st.progress[i] = Math.min(o.n || 1, st.progress[i] + 1);
      });
      if (Player.questComplete(char, qid)) completedNow.push(qid);
    });
    Player.syncPassiveObjectives(char);
    // whispers
    (char.quests.whispers.list || []).forEach(w => {
      if (w.done) return;
      if (ev.type === 'kill' && w.type === 'kill' && w.family === ev.family) w.progress++;
      if (ev.type === 'kill' && w.type === 'elite' && ev.rank && ev.rank !== 'normal' && ev.rank !== 'boss') w.progress++;
      if ((ev.type === 'dungeon' || ev.type === 'cellar') && (w.type === 'dungeon' || w.type === 'cellar') && w.area === ev.id) w.progress++;
      if (ev.type === 'event' && w.type === 'event' && w.area === ev.id) w.progress++;
      if (ev.type === 'boss' && w.type === 'boss' && w.boss === ev.id) w.progress++;
      if (w.progress >= w.n) { w.done = true; }
    });
    return completedNow;
  };
  Player.turnIn = function (char, qid, account) {
    const q = DATA.questById[qid]; if (!q || !Player.questComplete(char, qid)) return null;
    // consume collected materials
    q.objectives.forEach(o => { if (o.type === 'collect') char.materials[o.mat] = Math.max(0, (char.materials[o.mat] || 0) - o.n); });
    delete char.quests.active[qid]; char.quests.done[qid] = true;
    return Player.applyRewards(char, q.rewards, account, q);
  };
  Player.applyRewards = function (char, r, account, src) {
    const got = [];
    const diff = DATA.diffById[char.difficulty];
    const lvlXp = Stats.xpToNext(Math.min(char.level, 59)) * 0.06;
    if (r.xp) { const xp = Math.round(lvlXp * r.xp * diff.xp); const g = Player.addXp(char, xp); got.push(U.fmtNum(xp) + ' XP'); if (g.levels) got.push('Level up!'); }
    if (r.gold) { const gold = Math.round((100 + char.level * 40) * r.gold * diff.gold); Player.addMaterial(char, 'gold', gold); got.push(U.fmtNum(gold) + ' gold'); }
    if (r.obols) { Player.addMaterial(char, 'obols', r.obols); got.push(r.obols + ' Obols'); }
    if (r.skillPoints) { char.skillPointsBonus = (char.skillPointsBonus || 0) + r.skillPoints; got.push('+' + r.skillPoints + ' Skill Point' + (r.skillPoints > 1 ? 's' : '')); }
    if (r.paragon) { char.paragon.bonus = (char.paragon.bonus || 0) + r.paragon; got.push('+' + r.paragon + ' Paragon Points'); }
    if (r.potion) { const next = DATA.POTION_TIERS.find(t => t.level > (char.potion.tier || 1)); if (next) { char.potion.tier = next.level; got.push(next.name); } }
    (r.items || []).forEach(it => {
      const power = Math.max(diff.powerFloor, Stats.itemPowerForLevel(char.level));
      let item;
      if (it.rarity === 'unique' || it.rarity === 'mythic') { const pool = Items.uniquePool(char.cls, it.rarity, null); item = pool.length ? Items.generate({ cls: char.cls, level: char.level, power, unique: U.pick(pool).id }) : Items.generate({ cls: char.cls, level: char.level, power, rarity: 'legendary' }); }
      else item = Items.generate({ cls: char.cls, level: char.level, power, rarity: it.rarity, slot: it.slot });
      if (!Player.addItem(char, item)) account.stash.push(item);
      got.push(item.name);
    });
    if (r.materials) Object.keys(r.materials).forEach(k => { Player.addMaterial(char, k, r.materials[k]); got.push(r.materials[k] + ' ' + DATA.MATERIALS[k].name); });
    if (account) {
      if (r.cosmetic && !account.cosmetics.includes(r.cosmetic)) { account.cosmetics.push(r.cosmetic); got.push('Cosmetic: ' + DATA.cosmeticById[r.cosmetic].name); }
      if (r.mount && !account.mounts.includes(r.mount)) { account.mounts.push(r.mount); got.push('Mount: ' + DATA.mountById[r.mount].name); if (!char.mount.current) char.mount.current = r.mount; }
      if (r.mount_armor && !account.mountArmor.includes(r.mount_armor)) { account.mountArmor.push(r.mount_armor); got.push('Mount Armor: ' + DATA.MOUNT_ARMOR.find(m => m.id === r.mount_armor).name); }
      if (r.mount_trophy && !account.mountTrophies.includes(r.mount_trophy)) { account.mountTrophies.push(r.mount_trophy); got.push('Trophy: ' + DATA.MOUNT_TROPHIES.find(m => m.id === r.mount_trophy).name); }
    }
    Player.syncPassiveObjectives(char);
    Player.recompute(char);
    return got;
  };
  Player.availableQuests = function (char, zoneId) { return DATA.QUESTS.filter(q => (q.zone === zoneId || q.zone === 'any') && Player.questState(char, q) !== 'done'); };
  Player.autoAcceptMilestones = function (char) { DATA.QUESTS.filter(q => q.milestone).forEach(q => { if (Player.questState(char, q) === 'available') Player.acceptQuest(char, q.id); }); };

  // Whispers of the Dead: 3 rotating bounties for the current zone.
  Player.generateWhispers = function (char, zoneId) {
    const z = DATA.zoneById[zoneId]; const list = [];
    const tmpl = U.shuffle(DATA.WHISPER_TEMPLATES).slice(0, 3);
    tmpl.forEach(t => {
      const w = { id: U.uid('w'), type: t.type, grim: t.grim, progress: 0, n: 1, done: false, zone: zoneId };
      if (t.type === 'kill') { w.family = U.pick(z.families); w.n = U.randInt(t.n[0], t.n[1]); w.name = t.name.replace('{family}', DATA.FAMILIES[w.family]); }
      else if (t.type === 'elite') { w.n = U.randInt(t.n[0], t.n[1]); w.name = t.name; }
      else if (t.type === 'dungeon') { const a = U.pick(z.areas.filter(x => x.type === 'dungeon' && !x.capstone)); w.area = a.id; w.name = t.name.replace('{area}', a.name); }
      else if (t.type === 'cellar') { const a = z.areas.find(x => x.type === 'cellar'); if (!a) return; w.area = a.id; w.name = t.name; }
      else if (t.type === 'event') { const a = z.areas.find(x => x.type === 'event'); if (!a) return; w.area = a.id; w.name = t.name; }
      else if (t.type === 'boss') { const a = U.pick(z.areas.filter(x => x.type === 'boss' && !x.pinnacle)); w.boss = a.boss; w.name = t.name.replace('{boss}', DATA.bossById[a.boss].name); }
      list.push(w);
    });
    char.quests.whispers.list = list; char.quests.whispers.zone = zoneId;
    return list;
  };
  Player.collectWhispers = function (char, account) {
    const done = char.quests.whispers.list.filter(w => w.done);
    if (!done.length) return null;
    const grim = done.reduce((s, w) => s + w.grim, 0);
    char.quests.whispers.favor += grim; char.quests.whispers.completed += done.length;
    char.quests.whispers.list = char.quests.whispers.list.filter(w => !w.done);
    let got = [];
    while (char.quests.whispers.favor >= 10) {
      char.quests.whispers.favor -= 10;
      const diff = DATA.diffById[char.difficulty];
      const power = Math.max(diff.powerFloor, Stats.itemPowerForLevel(char.level));
      for (let i = 0; i < 3; i++) { const r = Math.random(); const item = Items.generate({ cls: char.cls, level: char.level, power, rarity: r < 0.25 ? 'legendary' : 'rare' }); if (!Player.addItem(char, item)) account.stash.push(item); got.push(item.name); }
      const gold = Math.round(500 * (1 + char.level / 10) * diff.gold); Player.addMaterial(char, 'gold', gold); got.push(gold + ' gold');
      Player.addMaterial(char, 'forgotten_soul', 1); got.push('1 Forgotten Soul');
      Player.addMaterial(char, 'obols', 100); got.push('100 Obols');
    }
    Player.syncPassiveObjectives(char);
    Player.generateWhispers(char, char.quests.whispers.zone || char.zone);
    return { grim, got };
  };

  // ---------------------------------------------------------------- consumables
  Player.usePotionInTown = function (char) { char.potion.charges = char.sctx.d.potionCharges; };
  Player.drinkElixir = function (char, id) { const e = DATA.elixirById[id]; if (!e) return false; char.elixir = { id, remaining: e.dur }; Player.recompute(char); return true; };
  Player.tickElixir = function (char, dt) { if (char.elixir && char.elixir.remaining > 0) { char.elixir.remaining -= dt; if (char.elixir.remaining <= 0) { char.elixir = null; Player.recompute(char); return true; } } return false; };

  // ---------------------------------------------------------------- cosmetics & mounts
  Player.cosmeticUnlocked = function (account, char, c) {
    const u = c.unlock;
    if (account.cosmetics.includes(c.id)) return true;
    if (u.type === 'default') return true;
    if (u.type === 'level') return char.level >= u.level;
    if (u.type === 'kills') return char.record.kills >= u.n;
    if (u.type === 'quest' && u.quest) return !!char.quests.done[u.quest];
    return false;
  };
  Player.buyCosmetic = function (account, char, c) {
    if (c.unlock.type !== 'gold' || account.cosmetics.includes(c.id)) return false;
    if (!Player.pay(char, { gold: c.unlock.cost })) return false;
    account.cosmetics.push(c.id); return true;
  };
  Player.mountUnlocked = (account, m) => account.mounts.includes(m.id);
  Player.buyMount = function (account, char, m) { if (m.unlock.type !== 'gold' || account.mounts.includes(m.id)) return false; if (!Player.pay(char, { gold: m.unlock.cost })) return false; account.mounts.push(m.id); if (!char.mount.current) char.mount.current = m.id; return true; };
  Player.mountSpeed = function (char) { const m = DATA.mountById[char.mount.current]; if (!m) return 0; return m.speed * (char.sctx ? char.sctx.d.mountSpeed : 1); };
  Player.mountSpurs = function (char) { const m = DATA.mountById[char.mount.current]; if (!m) return 0; return m.spurs + (char.sctx ? char.sctx.d.mountSpur : 0); };

  window.Player = Player;
  window.Paragon = Paragon;
})();
