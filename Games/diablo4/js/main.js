/* Sanctuary — bootstrap, state machine, game loop, combat hooks (global: Game) */
(function () {
  'use strict';
  const Game = { account: null, char: null, state: 'menu', lastSaved: 0, paused: false, raf: 0, lastT: 0, hudT: 0, autosaveT: 0 };

  Game.init = function () {
    Game.account = Save.fromLocal() || Save.newAccount();
    UI.init();
    const use3d = window.Render3D && Render3D.available() && Game.account.settings.renderer !== '2d';
    Game.R = use3d ? Render3D : Render;
    try { Game.R.init(document.getElementById('game'), document.getElementById('overlay')); } catch (e) { console.error('3D init failed, falling back to 2D', e); Game.R = Render; Render.init(document.getElementById('game')); }
    if (Game.R === Render3D) Render3D.setQuality(Game.account.settings.quality || 'high'); else document.getElementById('overlay').style.display = 'none';
    Input.init(document.getElementById('game'), Game.onInput);
    Game.goMenu();
    window.addEventListener('beforeunload', () => Game.save());
    document.addEventListener('visibilitychange', () => { if (document.hidden) Game.save(); });
    window.addEventListener('error', (e) => { if (e && e.message) UI.toast('Error: ' + e.message, '#f88'); });
  };

  // ------------------------------------------------------------ navigation
  Game.goMenu = function () { Game.stopLoop(); Game.state = 'menu'; Game.char = null; UI.renderMenu(); UI.show('menu'); };
  Game.goCreate = function () { Game.state = 'create'; UI.renderCreate(); UI.show('create'); };
  Game.goTown = function (townId) {
    const c = Game.char; if (!c) return Game.goMenu();
    Game.stopLoop();
    if (townId) { c.town = townId; c.zone = DATA.TOWNS[townId].zone; if (!c.unlocks.waypoints.includes(townId)) c.unlocks.waypoints.push(townId); }
    Game.state = 'town';
    Player.recompute(c);
    Player.usePotionInTown(c);
    Player.autoAcceptMilestones(c); Player.syncPassiveObjectives(c);
    if (!c.quests.whispers.list.length) Player.generateWhispers(c, c.zone);
    UI.renderTown(); UI.show('town'); Game.save();
  };
  Game.goMap = function () { Game.state = 'map'; UI.mapZone = Game.char.zone; UI.renderMap(); UI.show('map'); };

  // ------------------------------------------------------------ characters
  Game.selectChar = function (id) {
    const c = Game.account.characters.find(x => x.id === id); if (!c) return;
    Game.char = c; Game.account.selected = id;
    Player.recompute(c);
    Game.goTown();
  };
  Game.createChar = function (name, cls, appearance) {
    const c = Player.create(name, cls, appearance);
    Game.account.characters.push(c);
    Game.char = c; Game.account.selected = c.id;
    Player.autoAcceptMilestones(c);
    UI.toast('Welcome to Sanctuary, ' + c.name + '.', '#ffd76a');
    Game.goTown();
    setTimeout(() => UI.open('help'), 300);
  };
  Game.deleteChar = function (id) { Game.account.characters = Game.account.characters.filter(x => x.id !== id); if (Game.account.selected === id) Game.account.selected = null; Game.save(); UI.renderMenu(); };

  // ------------------------------------------------------------ saving
  Game.save = function (force) {
    if (!Game.account) return;
    if (!Game.account.settings.autosave && !force) return;
    if (Game.char) Game.char.playtime = (Game.char.playtime || 0);
    if (Save.toLocal(Game.account)) { Game.lastSaved = Date.now(); if (force) UI.toast('Saved', '#7dff5c'); }
    else if (force) UI.toast('Could not save to this device (storage blocked?). Export a file instead.', '#f88');
  };
  Game.importFile = function (file) { Save.readFile(file).then(acc => Game.applyImport(acc)).catch(e => UI.toast('Import failed: ' + e.message, '#f88')); };
  Game.importCode = function (code) { try { Game.applyImport(Save.importCode(code)); } catch (e) { UI.toast('Import failed: ' + e.message, '#f88'); } };
  Game.applyImport = function (acc) {
    if (!confirm('Import this save? It will replace the ' + Game.account.characters.length + ' character(s) currently on this device.')) return;
    Game.stopLoop(); Game.account = acc; Game.char = null; Save.toLocal(acc); UI.closeAll(); Game.goMenu(); UI.toast('Imported ' + acc.characters.length + ' character(s)', '#7dff5c');
  };

  // ------------------------------------------------------------ gear / skills changed
  Game.onGearChanged = function () {
    const c = Game.char; Player.recompute(c);
    const S = Combat.state();
    if (S) { S.sctx = c.sctx; const p = S.player; const d = c.sctx.d; const ratio = p.hp / p.maxHp; p.maxHp = d.maxLife; p.hp = Math.min(p.maxHp, Math.max(1, p.maxHp * ratio)); p.maxRes = d.maxResource; p.res = Math.min(p.res, p.maxRes); }
    Game.save();
  };
  Game.onQuestsChanged = function () { Game.save(); };
  Game.salvage = function (it, quiet) {
    const c = Game.char;
    const y = Items.salvageYield(it);
    Object.keys(y).forEach(k => Player.addMaterial(c, k, y[k]));
    let codexMsg = '';
    if (it.aspect) { const cur = Game.account.codex[it.aspect.id]; if (cur === undefined || it.aspect.roll > cur) { Game.account.codex[it.aspect.id] = it.aspect.roll; codexMsg = ' · Codex: ' + DATA.aspectById[it.aspect.id].name; } }
    const eqSlot = Object.keys(c.equipment).find(k => c.equipment[k] && c.equipment[k].id === it.id);
    if (eqSlot) c.equipment[eqSlot] = null; else Player.removeItem(c, it.id);
    Player.recompute(c);
    if (!quiet) UI.toast('Salvaged: ' + Player.costText(y) + codexMsg, '#9aa');
    Game.save();
  };

  // ------------------------------------------------------------ combat
  Game.enterArea = function (areaId) {
    const c = Game.char; const area = DATA.areaById[areaId]; if (!area || !Player.areaUnlocked(c, area)) return;
    if (area.type === 'stronghold' && c.unlocks.strongholds[areaId]) { if (!confirm('This stronghold is already reclaimed. Run it again for loot?')) return; }
    Game.state = 'combat';
    c.zone = area.zone;
    const level = Player.areaLevel(c, area);
    Player.recompute(c);
    Combat.start({ char: c, account: Game.account, area, level, hooks: {
      onKill: (e) => { Player.progressQuests(c, { type: 'kill', family: e.def.family, enemy: e.def.id, rank: e.elite.rank, zone: area.zone }); if (c.cls === 'barbarian' && e.lastHitSkill && e.lastHitSkill.weapon.type) { const ex = c.mechanics.expertise; ex[e.lastHitSkill.weapon.type] = (ex[e.lastHitSkill.weapon.type] || 0) + 1; } Game.checkMilestones(); },
      onBoss: (boss) => { Player.progressQuests(c, { type: 'boss', id: boss.id, zone: area.zone }); const S = Combat.state(); if (S && S.mode === 'boss') { S.cleared = true; S.done = true; c.unlocks.areasCleared[areaId] = (c.unlocks.areasCleared[areaId] || 0) + 1; Game.onAreaCleared(area); } },
      onCleared: (mode) => { Game.onAreaCleared(area); },
      onChest: () => { Game.save(); },
      onLevel: () => { Game.save(); UI.toast('Level ' + c.level + '! Open Skills to spend points.', '#ffe55c'); },
      onLoot: (it) => { },
      onFail: (msg) => { UI.toast(msg, '#f88'); },
      onLog: (msg, color) => { },
      onDeath: () => { Game.save(); },
      onEnd: (result) => { Game.finishCombat(result); }
    } });
    UI.show('combat');
    Game.R.resize();
    Game.paused = false;
    Game.startLoop();
    Combat.log('Entered ' + area.name + ' (level ' + level + ')', '#ffe55c');
    if (area.type === 'dungeon') Combat.log('Clear all three floors. The first clear unlocks an Aspect.', '#9ad');
    if (area.type === 'event') Combat.log('Survive 90 seconds!', '#ffe55c');
  };
  Game.onAreaCleared = function (area) {
    const c = Game.char; const S = Combat.state();
    const ev = { type: area.type === 'cellar' ? 'cellar' : area.type === 'stronghold' ? 'stronghold' : area.type === 'event' ? 'event' : area.type === 'dungeon' ? 'dungeon' : 'boss', id: area.id, zone: area.zone };
    if (area.type !== 'boss') Player.progressQuests(c, ev);
    const first = !(c.unlocks.areasCleared[area.id]);
    if (area.type !== 'boss') c.unlocks.areasCleared[area.id] = (c.unlocks.areasCleared[area.id] || 0) + 1;
    const extras = [];
    if (area.type === 'dungeon') { c.record.dungeons++; Paragon.addGlyphXp(c, 30 + S.level); extras.push('+' + (30 + S.level) + ' Glyph XP'); }
    if ((area.type === 'dungeon' || area.type === 'stronghold') && c.cls === 'druid') { c.mechanics.offerings = (c.mechanics.offerings || 0) + 1; extras.push('+1 Spirit Offering'); }
    if (area.type === 'dungeon' && area.aspects) { const id = area.aspects[c.cls] || area.aspects.all; const asp = DATA.aspectById[id]; if (asp && Game.account.codex[id] === undefined) { Game.account.codex[id] = asp.lo; extras.push('Codex unlocked: ' + asp.name); Combat.log('Aspect unlocked: ' + asp.name, '#ff8c1a'); } }
    if (area.type === 'stronghold' && !c.unlocks.strongholds[area.id]) { c.unlocks.strongholds[area.id] = true; const r = area.reward || {}; const got = Player.applyRewards(c, r, Game.account); extras.push(...got); Combat.log('Stronghold reclaimed!', '#ffe55c'); }
    if (area.pit) { const t = S.elapsed; if (t <= 600) { c.unlocks.pit = Math.max(c.unlocks.pit || 1, S.pitTier + 1); c.record.highestPit = Math.max(c.record.highestPit, S.pitTier); extras.push('Pit tier ' + (S.pitTier + 1) + ' unlocked'); Paragon.addGlyphXp(c, 60 + S.pitTier * 10); } else extras.push('Too slow to advance the Pit tier'); }
    if (area.capstone) { Combat.log('Capstone complete! Return to town to turn in the quest.', '#ffe55c'); }
    if (area.type === 'event') c.record.events++;
    if (S) S.extras = (S.extras || []).concat(extras);
    Game.checkMilestones();
    Game.save();
  };
  Game.checkMilestones = function () { const c = Game.char; Player.autoAcceptMilestones(c); Player.syncPassiveObjectives(c); };
  Game.finishCombat = function (result) {
    const c = Game.char; const S = Combat.state();
    const loot = S ? S.lootLog.filter(it => it.rarity && DATA.RARITY[it.rarity].order >= 3) : [];
    const extras = S ? S.extras || [] : [];
    c.playtime = (c.playtime || 0) + (S ? S.elapsed : 0);
    Game.stopLoop();
    Combat.end();
    Input.joystick.active = false;
    Game.goTown();
    const titles = { portal: 'Returned to town', abandon: 'Abandoned', death: 'Defeated' };
    UI.open('result', { result: Object.assign({ title: titles[result.how] || 'Run complete', text: result.cleared ? 'Area cleared!' : (result.bossKilled ? 'Boss slain!' : ''), extras }, result), loot });
  };
  Game.leaveCombat = function (how) { Combat.leave(how); };
  Game.revive = function () { const S = Combat.state(); if (!S) return; Combat.revive(S.mode === 'dungeon' || S.mode === 'stronghold' || S.mode === 'boss' ? 'start' : 'here'); };
  Game.pauseCombat = function () { Game.paused = true; };
  Game.resumeCombat = function () { Game.paused = false; Game.lastT = performance.now(); };
  Game.hudSkill = function (idx) { if (Game.state !== 'combat') return; Combat.castSkill(idx); };
  Game.onInput = function (kind, arg) {
    if (Game.state !== 'combat') return;
    if (kind === 'skill') Combat.castSkill(arg); else if (kind === 'evade') Combat.evade(); else if (kind === 'potion') Combat.potion(); else if (kind === 'mount') UI.actions.mount(); else if (kind === 'portal') Combat.townPortal();
    else if (kind === 'menu') { if (arg === 'escape') UI.open('pause'); else if (arg === 'i') UI.open('inventory'); else if (arg === 'k') UI.open('skills'); else if (arg === 'c') UI.open('character'); }
  };

  // ------------------------------------------------------------ loop
  Game.startLoop = function () { Game.stopLoop(); Game.lastT = performance.now(); const step = (now) => { Game.raf = requestAnimationFrame(step); Game.frame(now); }; Game.raf = requestAnimationFrame(step); };
  Game.stopLoop = function () { if (Game.raf) cancelAnimationFrame(Game.raf); Game.raf = 0; };
  Game.frame = function (now) {
    const S = Combat.state(); if (!S) return;
    let dt = (now - Game.lastT) / 1000; Game.lastT = now;
    if (dt > 0.1) dt = 0.1;
    if (!Game.paused && !S.result) {
      const v = Input.vector(); Combat.setInput(v.x, v.y);
      // fixed-step simulation for stability
      Game.acc = (Game.acc || 0) + dt;
      let steps = 0; while (Game.acc >= 1 / 60 && steps < 4) { Combat.update(1 / 60); Game.acc -= 1 / 60; steps++; }
      if (steps === 4) Game.acc = 0;
      Game.autosaveT += dt; if (Game.autosaveT > 30) { Game.autosaveT = 0; Game.save(); }
    }
    if (!Game.account.settings.screenShake) S.shake = 0;
    if (!Game.account.settings.damageNumbers) S.texts.length = 0;
    Game.R.draw(S, { joystick: Input.joystick });
    Game.hudT += dt; if (Game.hudT > 0.08) { Game.hudT = 0; UI.hud(S); }
  };

  window.Game = Game;
  document.addEventListener('DOMContentLoaded', Game.init);
})();
