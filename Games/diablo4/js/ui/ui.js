/* Sanctuary — DOM user interface (global: UI). All screens/panels render HTML strings; actions dispatch via data-action. */
(function () {
  'use strict';
  const UI = {};
  const $ = (id) => document.getElementById(id);
  const esc = U.esc;
  let panelStack = [];
  let hudEls = null;

  UI.ICONS = { helm: '⛑', chest: '🛡', gloves: '🧤', pants: '👖', boots: '🥾', amulet: '📿', ring: '💍', ring1: '💍', ring2: '💍', weapon: '⚔', offhand: '🛡', bludgeon: '🔨', slash: '🪓', dual1: '🗡', dual2: '🗡', gem: '💎' };
  UI.SKILL_ICONS = { basic: '✦', core: '✸', macabre: '☠', corruption: '☽', summoning: '⚰', ultimate: '★', defensive: '⛨', aura: '☀', judgement: '⚖', brawling: '✊', mastery: '⚔', companion: '🐺', wrath: '⚡', key: '♛' };
  const itemIcon = (it) => it.kind === 'gem' ? '💎' : (it.type ? (DATA.WEAPON_TYPES[it.type].offhand ? '🛡' : it.type.includes('2h') || it.type === 'polearm' || it.type === 'staff' ? '🪓' : '⚔') : UI.ICONS[it.slot] || '◆');

  UI.show = function (id) { document.querySelectorAll('.screen').forEach(s => s.classList.toggle('active', s.id === 'screen-' + id)); Input.enabled = id === 'combat'; };
  UI.toast = function (msg, color) { const t = document.createElement('div'); t.className = 't'; t.textContent = msg; if (color) t.style.color = color; $('toast').appendChild(t); setTimeout(() => t.remove(), 2600); while ($('toast').children.length > 4) $('toast').firstChild.remove(); };

  // ------------------------------------------------------------ modal panels
  UI.open = function (name, data) { panelStack.push({ name, data: data || {} }); UI.renderPanel(); };
  UI.replace = function (name, data) { panelStack.pop(); UI.open(name, data); };
  UI.close = function () { panelStack.pop(); if (panelStack.length) UI.renderPanel(); else { $('modal').classList.add('hidden'); $('modal-box').innerHTML = ''; if (Game.state === 'combat') Game.resumeCombat(); } };
  UI.closeAll = function () { panelStack = []; $('modal').classList.add('hidden'); $('modal-box').innerHTML = ''; if (Game.state === 'combat') Game.resumeCombat(); };
  UI.refresh = function () { if (panelStack.length) UI.renderPanel(); if (Game.state === 'town') UI.renderTown(); };
  UI.renderPanel = function () {
    const top = panelStack[panelStack.length - 1]; if (!top) return;
    $('modal').classList.remove('hidden');
    const fn = UI.panels[top.name]; if (!fn) { $('modal-box').innerHTML = '<div class="pad">Unknown panel ' + esc(top.name) + '</div>'; return; }
    $('modal-box').innerHTML = fn(top.data);
    const sc = $('modal-box').querySelector('.scroll'); if (sc && top.scroll) sc.scrollTop = top.scroll;
    if (Game.state === 'combat') Game.pauseCombat();
  };
  const topbar = (title, extra) => `<div class="topbar"><button class="btn" data-action="close">✕</button><h2>${esc(title)}</h2>${extra || ''}</div>`;
  const matsHtml = (char, keys) => `<div class="matlist">${(keys || Object.keys(char.materials)).filter(k => char.materials[k]).map(k => `<span class="mat" style="color:${DATA.MATERIALS[k] ? DATA.MATERIALS[k].color : '#fff'}">${U.fmtNum(char.materials[k])} ${esc(DATA.MATERIALS[k] ? DATA.MATERIALS[k].name : k)}</span>`).join('')}</div>`;
  const costHtml = (char, cost) => Object.keys(cost).filter(k => cost[k]).map(k => `<span class="${(char.materials[k] || 0) >= cost[k] ? 'green' : 'red'}">${U.fmtNum(cost[k])} ${esc(DATA.MATERIALS[k].name)}</span>`).join(', ');

  // ------------------------------------------------------------ main menu
  UI.renderMenu = function () {
    const acc = Game.account;
    const chars = acc.characters;
    $('screen-menu').innerHTML = `
      <div class="menu-title"><div class="sub">A Diablo IV tribute</div><h1>SANCTUARY</h1><div class="dim small">Four classes · Skill trees · Loot · Paragon · Quests · Mounts</div></div>
      <div class="charlist">${chars.map(c => `<div class="card charcard" data-action="selectchar" data-id="${c.id}"><div class="avatar" style="background:${DATA.classes[c.cls].color}"></div><div class="grow"><div><b>${esc(c.name)}</b> <span class="dim small">${esc(UI.titleOf(c))}</span></div><div class="small dim">Level ${c.level}${c.paragonLevel ? ' · Paragon ' + c.paragonLevel : ''} ${esc(DATA.classes[c.cls].name)} · ${esc(DATA.diffById[c.difficulty].name)}</div></div><button class="btn small danger" data-action="deletechar" data-id="${c.id}">✕</button></div>`).join('')}
        <div class="card charcard" data-action="gocreate" style="border-style:dashed;justify-content:center"><b>+ New Character</b></div>
      </div>
      <div class="row" style="margin-top:16px;justify-content:center"><button class="btn" data-action="openpanel" data-panel="saves">💾 Save / Load</button><button class="btn" data-action="openpanel" data-panel="help">? How to Play</button><button class="btn" data-action="openpanel" data-panel="settings">⚙ Settings</button></div>
      <div class="dim small center" style="margin-top:12px">Autosaves to this device. Export a file to keep your progress safe or move it to another device.</div>`;
  };
  UI.titleOf = (c) => { const t = DATA.TITLES.find(x => x.id === c.cosmetics.title); return t && t.id !== 'none' ? t.name : ''; };

  // ------------------------------------------------------------ character creation
  const createState = { cls: 'barbarian', name: '', skin: 'tan', hair: 'brown', body: 'average' };
  UI.createState = createState;
  UI.renderCreate = function () {
    const cls = DATA.classes[createState.cls];
    $('screen-create').innerHTML = `
      ${topbar('Create Character', '').replace('data-action="close"', 'data-action="gomenu"')}
      <div class="scroll pad">
        <h3>Choose your class</h3>
        <div class="classcards">${Object.values(DATA.classes).map(c => `<div class="card classcard ${c.id === createState.cls ? 'on' : ''}" data-action="pickclass" data-cls="${c.id}"><div class="swatch" style="background:${c.color}"></div><b>${esc(c.name)}</b><div class="small dim">${esc(c.resource.name)} · ${esc(c.mechanic.name)}</div></div>`).join('')}</div>
        <div class="card" style="margin-top:10px"><b style="color:${cls.color}">${esc(cls.name)}</b><p class="small">${esc(cls.desc)}</p><p class="small dim"><i>${esc(cls.lore)}</i></p><p class="small">Primary stat: <b>${esc(DATA.STAT_DEFS[cls.mainStat].name)}</b> · Starting skills: ${DATA.classStart[cls.id].skills.map(s => esc(DATA.skillById[s].name)).join(', ')}</p></div>
        <h3 style="margin-top:12px">Name</h3>
        <input type="text" id="create-name" maxlength="16" placeholder="Enter a name" value="${esc(createState.name)}" autocomplete="off" autocorrect="off" autocapitalize="words">
        <h3 style="margin-top:12px">Appearance</h3>
        <div class="row"><span class="dim small" style="width:60px">Skin</span><div class="swatches">${DATA.appearance.skin.map(s => `<div class="swatch-btn ${s.id === createState.skin ? 'on' : ''}" style="background:${s.c}" data-action="pickapp" data-k="skin" data-v="${s.id}"></div>`).join('')}</div></div>
        <div class="row" style="margin-top:6px"><span class="dim small" style="width:60px">Hair</span><div class="swatches">${DATA.appearance.hair.map(s => `<div class="swatch-btn ${s.id === createState.hair ? 'on' : ''}" style="background:${s.c}" data-action="pickapp" data-k="hair" data-v="${s.id}"></div>`).join('')}</div></div>
        <div class="row" style="margin-top:6px"><span class="dim small" style="width:60px">Build</span>${DATA.appearance.body.map(b => `<button class="btn small ${b === createState.body ? 'primary' : ''}" data-action="pickapp" data-k="body" data-v="${b}">${esc(U.cap(b))}</button>`).join('')}</div>
        <div style="margin-top:20px"><button class="btn primary block" data-action="createchar">Begin your journey</button></div>
      </div>`;
    const inp = $('create-name'); inp.addEventListener('input', () => { createState.name = inp.value; });
  };

  // ------------------------------------------------------------ town
  UI.renderTown = function () {
    const char = Game.char; const town = DATA.TOWNS[char.town]; const zone = DATA.zoneById[town.zone];
    const questNpcs = {};
    DATA.QUESTS.forEach(q => { if (!q.giver) return; const st = Player.questState(char, q); if (st === 'available' || (st === 'active' && Player.questComplete(char, q.id))) questNpcs[q.giver] = true; });
    const activeQ = Object.keys(char.quests.active).length;
    const canTurnIn = Object.keys(char.quests.active).filter(id => Player.questComplete(char, id)).length;
    const freeSP = Player.skillPointsFree(char), freePP = Paragon.pointsFree(char);
    $('screen-town').innerHTML = `
      <div class="topbar"><div class="avatar" style="width:36px;height:36px;border-radius:50%;background:${DATA.classes[char.cls].color}"></div><div class="grow"><b>${esc(char.name)}</b> <span class="small dim">${esc(UI.titleOf(char))}</span><div class="small dim">Level ${char.level}${char.paragonLevel ? ' · Paragon ' + char.paragonLevel : ''} ${esc(DATA.classes[char.cls].name)} · ${esc(DATA.diffById[char.difficulty].name)}</div></div><div class="col" style="align-items:flex-end"><span class="gold">${U.fmtNum(char.materials.gold)} gold</span><span class="small" style="color:#b36cff">${U.fmtNum(char.materials.obols || 0)} obols</span></div><button class="btn small" data-action="openpanel" data-panel="pause">☰</button></div>
      <div class="scroll pad">
        <h2>${esc(town.name)} <span class="small dim">— ${esc(zone.name)}</span></h2>
        <p class="small dim">${esc(town.desc)}</p>
        ${char.level < 5 ? '<div class="card" style="border-color:var(--gold)"><b>Welcome, wanderer.</b> Talk to <b>Lorath</b> for quests, visit vendors, then use the <b>World Map</b> to venture out. Tap <b>?</b> in the menu for controls.</div>' : ''}
        <div class="row" style="margin:8px 0"><button class="btn primary grow" data-action="gomap">🗺 World Map — Venture out</button><button class="btn" data-action="openpanel" data-panel="difficulty">⚔ ${esc(DATA.diffById[char.difficulty].name)}</button></div>
        <h3>Townsfolk</h3>
        <div class="npcgrid">${town.npcs.map(n => `<div class="card npc ${questNpcs[n.id] ? 'quest' : ''}" data-action="npc" data-id="${n.id}"><span class="role">${esc(roleName(n.role))}</span><span class="name">${esc(n.name)}</span></div>`).join('')}</div>
      </div>
      <div class="bottomnav">
        <button class="btn" data-action="openpanel" data-panel="inventory"><span class="ico">🎒</span>Inventory${char.inventory.length >= Player.INV_CAP ? ' <span class="badge">FULL</span>' : ''}</button>
        <button class="btn" data-action="openpanel" data-panel="skills"><span class="ico">✸</span>Skills${freeSP > 0 ? ' <span class="badge">' + freeSP + '</span>' : ''}</button>
        <button class="btn" data-action="openpanel" data-panel="paragon"><span class="ico">◈</span>Paragon${freePP > 0 ? ' <span class="badge">' + freePP + '</span>' : ''}</button>
        <button class="btn" data-action="openpanel" data-panel="quests"><span class="ico">📜</span>Quests${canTurnIn ? ' <span class="badge">' + canTurnIn + '</span>' : activeQ ? ' <span class="pill">' + activeQ + '</span>' : ''}</button>
        <button class="btn" data-action="openpanel" data-panel="character"><span class="ico">👤</span>Character</button>
        <button class="btn" data-action="openpanel" data-panel="mechanic"><span class="ico">${DATA.classes[char.cls].id === 'necromancer' ? '📖' : DATA.classes[char.cls].id === 'barbarian' ? '🗡' : DATA.classes[char.cls].id === 'druid' ? '🦌' : '☀'}</span>${esc(DATA.classes[char.cls].mechanic.name.split(' ')[0])}</button>
      </div>`;
  };
  function roleName(r) { return { quest: 'Quest', blacksmith: 'Blacksmith', jeweler: 'Jeweler', occultist: 'Occultist', alchemist: 'Alchemist', healer: 'Healer', purveyor: 'Purveyor of Curiosities', stable: 'Stable Master', wardrobe: 'Wardrobe', stash: 'Stash', waypoint: 'Waypoint', tree: 'Tree of Whispers' }[r] || r; }

  // ------------------------------------------------------------ world map
  UI.renderMap = function () {
    const char = Game.char; const sel = UI.mapZone || char.zone;
    const zone = DATA.zoneById[sel];
    $('screen-map').innerHTML = `
      ${topbar('World Map', `<span class="pill gold">${esc(DATA.diffById[char.difficulty].name)}</span>`).replace('data-action="close"', 'data-action="gotown"')}
      <div class="scroll pad">
        <div class="grid auto">${DATA.ZONES.map(z => { const unl = Player.zoneUnlocked(char, z); return `<div class="card zonecard ${z.id === sel ? 'on' : ''} ${unl ? '' : 'areacard locked'}" data-action="${unl ? 'pickzone' : 'noop'}" data-id="${z.id}" style="border-top:3px solid ${z.ground2}"><b>${esc(z.name)}</b><div class="lvl">Levels ${z.level[0]}–${z.level[1]} · ${esc(DATA.TOWNS[z.town].name)}</div>${unl ? '' : '<div class="small red">Unlocks at level ' + Math.max(1, z.level[0] - 6) + '</div>'}</div>`; }).join('')}</div>
        <h2 style="margin-top:12px">${esc(zone.name)}</h2><p class="small dim">${esc(zone.desc)}</p>
        <div class="row"><button class="btn small ${char.town === zone.town ? 'disabled' : ''}" data-action="travel" data-town="${zone.town}">🏘 Travel to ${esc(DATA.TOWNS[zone.town].name)}</button><span class="small dim">Monsters: ${zone.families.map(f => esc(DATA.FAMILIES[f])).join(', ')}</span></div>
        <div class="grid auto" style="margin-top:8px">${zone.areas.map(a => { const unl = Player.areaUnlocked(char, a); const lvl = Player.areaLevel(char, a); const cleared = char.unlocks.areasCleared[a.id] || 0; const str = a.type === 'stronghold' && char.unlocks.strongholds[a.id]; return `<div class="card areacard t-${a.type} ${unl ? '' : 'locked'}" data-action="${unl ? 'enterarea' : 'noop'}" data-id="${a.id}"><span class="type">${esc(areaType(a))} · Level ${lvl}${a.pit ? ' · Tier ' + (char.unlocks.pit || 1) : ''}</span><b>${esc(a.name)}</b><span class="small dim">${esc(a.desc)}</span>${a.boss ? '<span class="small" style="color:var(--mythic)">Boss: ' + esc(DATA.bossById[a.boss].name) + '</span>' : ''}${a.aspects ? '<span class="small" style="color:var(--legendary)">Aspect: ' + esc((DATA.aspectById[a.aspects[char.cls] || a.aspects.all] || {}).name || '') + (Game.account.codex[a.aspects[char.cls] || a.aspects.all] !== undefined ? ' ✓' : '') + '</span>' : ''}${cleared ? '<span class="small green">Cleared ×' + cleared + '</span>' : ''}${str ? '<span class="small green">Reclaimed</span>' : ''}${!unl ? '<span class="small red">Locked</span>' : ''}</div>`; }).join('')}</div>
      </div>`;
  };
  function areaType(a) { return a.type === 'field' ? 'Open World' : a.type === 'dungeon' ? (a.capstone ? 'Capstone Dungeon' : a.pit ? 'The Pit' : 'Dungeon') : a.type === 'stronghold' ? 'Stronghold' : a.type === 'boss' ? (a.pinnacle ? 'Pinnacle Boss' : 'Boss Lair') : a.type === 'event' ? 'World Event' : 'Cellar'; }

  // ------------------------------------------------------------ panels
  UI.panels = {};
  UI.panels.pause = function () {
    const inCombat = Game.state === 'combat';
    return `${topbar(inCombat ? 'Paused' : 'Menu')}<div class="scroll pad col">
      ${inCombat ? '<button class="btn primary block" data-action="close">▶ Resume</button>' : ''}
      <button class="btn block" data-action="openpanel" data-panel="inventory">🎒 Inventory</button>
      <button class="btn block" data-action="openpanel" data-panel="skills">✸ Skills</button>
      <button class="btn block" data-action="openpanel" data-panel="paragon">◈ Paragon</button>
      <button class="btn block" data-action="openpanel" data-panel="character">👤 Character</button>
      <button class="btn block" data-action="openpanel" data-panel="quests">📜 Quests</button>
      <button class="btn block" data-action="openpanel" data-panel="codex">📕 Codex of Power</button>
      <button class="btn block" data-action="openpanel" data-panel="saves">💾 Save / Export / Import</button>
      <button class="btn block" data-action="openpanel" data-panel="settings">⚙ Settings</button>
      <button class="btn block" data-action="openpanel" data-panel="help">? Help & Controls</button>
      ${inCombat ? '<button class="btn danger block" data-action="leave" data-how="abandon">⌂ Abandon & return to town</button>' : '<button class="btn danger block" data-action="gomenu">Exit to main menu</button>'}
    </div>`;
  };
  UI.panels.help = () => `${topbar('How to Play')}<div class="scroll pad">
    <h3>Touch (iPad)</h3><p class="small">Drag on the <b>left half</b> of the screen to move. Tap the <b>skill buttons</b> on the right to attack — skills auto-aim at the nearest enemy. <b>↯</b> evades, <b>⚗</b> drinks a potion, <b>🐎</b> mounts (open world only; tap again or attack to dismount with a slam), <b>⌂</b> channels a town portal (3s, interrupted by damage).</p>
    <h3>Keyboard</h3><p class="small"><kbd>WASD</kbd> move · <kbd>1</kbd>–<kbd>6</kbd> skills · <kbd>Space</kbd> evade · <kbd>Q</kbd> potion · <kbd>Z</kbd> mount · <kbd>T</kbd> portal · <kbd>Esc</kbd> menu. Left/right click casts slot 1/2.</p>
    <h3>Progression</h3><p class="small">Gain levels (1–60) for skill points, then Paragon levels (up to 300) for Paragon points. Skill clusters unlock as you spend points. Each active skill has an Enhanced upgrade plus two mutually exclusive variants. Items roll affixes by slot; Legendary items carry Aspects, which you can extract into the Codex by salvaging and imprint at the Occultist. Uniques and Mythics have fixed powers.</p>
    <h3>Stats</h3><p class="small">Damage = weapon damage × skill % × (1 + primary stat bonus) × (1 + all additive damage bonuses) × Critical (1.5 + Crit Damage) × Vulnerable (1.2 + Vulnerable Damage) × Overpower (1.5 + Overpower Damage), reduced by enemy resistances. Armor, resistances and Damage Reduction stack multiplicatively on defense. Fortify above your current Life grants 10% DR. Barriers absorb damage first.</p>
    <h3>World</h3><p class="small">Open-world areas scale with you and spawn endlessly (mount up!). Dungeons have 3 floors and unlock an Aspect on first clear. Strongholds reward cosmetics and mounts. Boss lairs drop targeted Uniques. Capstone dungeons unlock higher difficulties. The Tree of Whispers (Hawezar) offers rotating bounties.</p>
    <h3>Saving</h3><p class="small">The game autosaves to this device. Use <b>Save / Export</b> to download a .json file or copy a save code; import it on any device.</p></div>`;
  UI.panels.settings = () => { const s = Game.account.settings; return `${topbar('Settings')}<div class="scroll pad col">
    <label class="card row between"><span>Autosave to device</span><button class="btn small ${s.autosave ? 'primary' : ''}" data-action="toggle" data-k="autosave">${s.autosave ? 'On' : 'Off'}</button></label>
    <label class="card row between"><span>Damage numbers</span><button class="btn small ${s.damageNumbers ? 'primary' : ''}" data-action="toggle" data-k="damageNumbers">${s.damageNumbers ? 'On' : 'Off'}</button></label>
    <label class="card row between"><span>Screen shake</span><button class="btn small ${s.screenShake ? 'primary' : ''}" data-action="toggle" data-k="screenShake">${s.screenShake ? 'On' : 'Off'}</button></label>
    <div class="card"><div class="row between"><span>Clear local save (keeps nothing!)</span><button class="btn small danger" data-action="clearsave">Clear</button></div></div>
    <p class="small dim">Add this page to your iPad Home Screen (Share → Add to Home Screen) for full-screen play.</p></div>`; };
  UI.panels.saves = () => `${topbar('Save / Export / Import')}<div class="scroll pad col">
    <div class="card"><h3>Export</h3><p class="small dim">Downloads a .json save file (on iPad, Safari shows a Download/Share prompt). You can also copy a save code.</p><div class="row"><button class="btn primary" data-action="export">⬇ Download save file</button><button class="btn" data-action="sharesave">📤 Share…</button><button class="btn" data-action="exportcode">📋 Show save code</button></div><textarea id="save-code" class="hidden" readonly></textarea></div>
    <div class="card"><h3>Import</h3><p class="small dim">Importing replaces all characters on this device.</p><div class="row"><button class="btn primary" data-action="importfile">📂 Import save file</button></div><p class="small dim" style="margin-top:8px">Or paste a save code:</p><textarea id="import-code" placeholder="SANC1...."></textarea><button class="btn" data-action="importcode" style="margin-top:6px">Import code</button></div>
    <div class="card"><div class="row between"><span>Save now</span><button class="btn small" data-action="savenow">💾 Save</button></div><p class="small dim">Last saved: <span id="last-saved">${Game.lastSaved ? new Date(Game.lastSaved).toLocaleTimeString() : 'never'}</span></p></div></div>`;
  UI.panels.difficulty = () => { const char = Game.char; return `${topbar('Difficulty')}<div class="scroll pad list">${DATA.DIFFICULTIES.map(d => { const ok = Player.difficultyAvailable(char, d.id); return `<div class="card ${char.difficulty === d.id ? 'on' : ''} ${ok ? '' : 'areacard locked'}" data-action="${ok ? 'setdiff' : 'noop'}" data-id="${d.id}"><b>${esc(d.name)}</b> <span class="small dim">Monster Life ×${d.hp} · Damage ×${d.dmg} · XP +${Math.round((d.xp - 1) * 100)}% · Gold +${Math.round((d.gold - 1) * 100)}%</span><p class="small">${esc(d.desc)}</p>${!ok ? '<span class="small red">Requires level ' + d.minLevel + (d.reqQuest ? ' and quest "' + esc(DATA.questById[d.reqQuest].name) + '"' : '') + '</span>' : ''}</div>`; }).join('')}</div>`; };

  // ---- Inventory & items
  UI.panels.inventory = function (data) {
    const char = Game.char; const c = DATA.classes[char.cls];
    const slots = ['helm', 'chest', 'gloves', 'pants', 'boots', 'amulet', 'ring1', 'ring2'].concat(c.weaponSlots);
    const tab = data.tab || 'items';
    const inv = char.inventory.filter(it => tab === 'gems' ? it.kind === 'gem' : it.kind !== 'gem');
    return `${topbar('Inventory', `<span class="small dim">${char.inventory.length}/${Player.INV_CAP}</span>`)}
      <div class="scroll pad">
        <div class="paperdoll">${slots.map(sl => { const it = char.equipment[sl]; return `<div class="slot ${it ? 'r-' + it.rarity : 'empty'}" data-action="itemdetail" data-id="${it ? it.id : ''}" data-slot="${sl}"><span class="lbl">${esc(DATA.SLOT_NAMES[sl])}</span><span class="ico">${it ? itemIcon(it) : UI.ICONS[sl]}</span>${it ? '<span class="pw">' + it.power + '</span>' : ''}</div>`; }).join('')}</div>
        <div class="row" style="margin:8px 0"><button class="btn tab ${tab === 'items' ? 'on' : ''}" data-action="openpanelreplace" data-panel="inventory" data-tab="items">Items</button><button class="btn tab ${tab === 'gems' ? 'on' : ''}" data-action="openpanelreplace" data-panel="inventory" data-tab="gems">Gems & Materials</button><span class="grow"></span><button class="btn small" data-action="sortinv">Sort</button>${Game.state === 'town' ? '<button class="btn small" data-action="sellall" data-rar="normal,magic">Sell Normal/Magic</button>' : ''}</div>
        ${tab === 'gems' ? matsHtml(char) + '<hr>' : ''}
        <div class="itemgrid">${inv.map(it => `<div class="slot r-${it.rarity || 'normal'}" data-action="itemdetail" data-id="${it.id}"><span class="ico" ${it.kind === 'gem' ? 'style="color:' + it.color + '"' : ''}>${itemIcon(it)}</span>${it.power ? '<span class="pw">' + it.power + '</span>' : ''}${it.kind !== 'gem' && Items.canEquip(it, char) && isUpgrade(it, char) ? '<span class="lbl" style="color:#7dff5c">▲</span>' : ''}${it.kind !== 'gem' && !Items.canEquip(it, char) ? '<span class="lbl red">✕</span>' : ''}</div>`).join('') || '<p class="dim">Nothing here.</p>'}</div>
      </div>`;
  };
  function isUpgrade(it, char) { const slots = Items.equipSlotsFor(it, char.cls); if (!slots.length) return false; const cur = slots.map(s => char.equipment[s]).filter(Boolean); if (cur.length < slots.length) return true; return Items.score(it, char) > Math.min(...cur.map(x => Items.score(x, char))) * 1.05; }
  UI.panels.itemdetail = function (data) {
    const char = Game.char; const it = Player.findItem(char, data.id) || Game.account.stash.find(x => x.id === data.id);
    if (!it) return `${topbar('Item')}<div class="pad">Empty slot.</div>`;
    const equipped = Object.keys(char.equipment).find(k => char.equipment[k] && char.equipment[k].id === it.id);
    const inStash = Game.account.stash.includes(it);
    const inTown = Game.state === 'town';
    const vendor = data.vendor || null;
    let html = `${topbar(it.name)}<div class="scroll pad">`;
    if (it.kind === 'gem') {
      const g = DATA.GEMS[it.gem], t = DATA.GEM_TIERS.find(x => x.id === it.tier);
      html += `<div class="tt"><div class="tt-name" style="color:${g.color}">${esc(it.name)}</div><div class="tt-sub">${esc(t.name || 'Standard')} tier (×${t.mult})</div><div class="tt-aff">Weapon: ${esc(Items.affixName(Items.gemEffect(it, 'weapon')))}</div><div class="tt-aff">Armor: ${esc(Items.affixName(Items.gemEffect(it, 'armor')))}</div><div class="tt-aff">Jewelry: ${esc(Items.affixName(Items.gemEffect(it, 'jewelry')))}</div></div>
        <div class="row" style="margin-top:8px"><button class="btn" data-action="socketpick" data-id="${it.id}">Socket into…</button>${inTown ? `<button class="btn" data-action="stashput" data-id="${it.id}">${inStash ? 'Take' : 'Stash'}</button>` : ''}<button class="btn danger" data-action="dropitem" data-id="${it.id}">Discard</button></div></div>`;
      return html;
    }
    const slots = Items.equipSlotsFor(it, char.cls);
    const cmp = !equipped && slots.length ? slots.map(s => char.equipment[s]).filter(Boolean) : [];
    html += cmp.length ? `<div class="compare"><div><div class="small dim">New</div><div class="tt">${Items.tooltipHtml(it, char)}</div></div>${cmp.map(ci => `<div><div class="small dim">Equipped: ${esc(DATA.SLOT_NAMES[Object.keys(char.equipment).find(k => char.equipment[k] === ci)])}</div><div class="tt">${Items.tooltipHtml(ci, char)}</div></div>`).join('')}</div>` : `<div class="tt">${Items.tooltipHtml(it, char)}</div>`;
    html += '<div class="row" style="margin-top:10px">';
    if (!equipped && !inStash) { if (slots.length > 1 && char.cls === 'barbarian' || (slots.length > 1 && it.slot === 'ring')) slots.forEach(s => { html += `<button class="btn primary" data-action="equip" data-id="${it.id}" data-slot="${s}" ${Items.canEquip(it, char) ? '' : 'disabled'}>Equip → ${esc(DATA.SLOT_NAMES[s])}</button>`; }); else html += `<button class="btn primary" data-action="equip" data-id="${it.id}" ${Items.canEquip(it, char) ? '' : 'disabled'}>Equip</button>`; }
    if (equipped) html += `<button class="btn" data-action="unequip" data-slot="${equipped}">Unequip</button>`;
    if (inTown && !equipped) html += `<button class="btn" data-action="stashput" data-id="${it.id}">${inStash ? 'Take from stash' : 'Put in stash'}</button>`;
    if (inTown && !equipped && !inStash) html += `<button class="btn" data-action="sell" data-id="${it.id}">Sell (${it.value}g)</button>`;
    if (inTown && !inStash) html += `<button class="btn" data-action="salvage" data-id="${it.id}">Salvage</button>`;
    if (!equipped && !inStash) html += `<button class="btn danger" data-action="dropitem" data-id="${it.id}">Discard</button>`;
    html += '</div>';
    if (vendor === 'blacksmith' && !inStash) { const cost = Items.upgradeCost(it); html += `<hr><h3>Upgrade (${it.upgrades || 0}/${Items.MAX_UPGRADES})</h3><p class="small">+25 Item Power, scaling damage/armor and affixes.</p><p class="small">Cost: ${costHtml(char, cost)}</p><button class="btn primary" data-action="upgrade" data-id="${it.id}" ${(it.upgrades || 0) >= Items.MAX_UPGRADES || !Player.canAfford(char, cost) ? 'disabled' : ''}>Upgrade</button>`; }
    if (vendor === 'jeweler' && !inStash) { const sc = Items.socketCost(it); html += `<hr><h3>Sockets (${it.sockets || 0}/${it.maxSockets || 1})</h3><p class="small">Cost: ${costHtml(char, sc)}</p><button class="btn" data-action="addsocket" data-id="${it.id}" ${(it.sockets || 0) >= (it.maxSockets || 1) || !Player.canAfford(char, sc) ? 'disabled' : ''}>Add socket</button>`; for (let i = 0; i < (it.sockets || 0); i++) { html += `<div class="row" style="margin-top:6px"><span class="small">Socket ${i + 1}: ${it.gems[i] ? esc(it.gems[i].name) : 'empty'}</span><button class="btn small" data-action="socketgem" data-id="${it.id}" data-idx="${i}">${it.gems[i] ? 'Replace' : 'Insert gem'}</button>${it.gems[i] ? `<button class="btn small" data-action="unsocket" data-id="${it.id}" data-idx="${i}">Remove (300g)</button>` : ''}</div>`; } }
    if (vendor === 'occultist' && !inStash) {
      if (it.rarity !== 'unique' && it.rarity !== 'mythic' && it.rarity !== 'normal' && it.rarity !== 'magic') { const ic = Items.imprintCost(it); html += `<hr><h3>Imprint Aspect</h3><p class="small">Cost: ${costHtml(char, ic)}. Rare items become Legendary. Replaces any existing Aspect.</p><button class="btn primary" data-action="imprintpick" data-id="${it.id}" ${Player.canAfford(char, ic) ? '' : 'disabled'}>Choose Aspect from Codex</button>`; }
      if (it.affixes && it.affixes.length && it.rarity !== 'unique' && it.rarity !== 'mythic') { const ec = Items.enchantCost(it); html += `<hr><h3>Enchant (reroll one affix)</h3><p class="small">Cost: ${costHtml(char, ec)}${it.enchants ? ' · rerolled ' + it.enchants + '×' : ''}</p>${it.affixes.map((a, i) => `<button class="btn small block" style="margin-top:4px" data-action="enchant" data-id="${it.id}" data-idx="${i}" ${Player.canAfford(char, ec) ? '' : 'disabled'}>Reroll: ${esc(Items.affixName(a))}</button>`).join('')}`; }
      if (it.aspect) html += `<hr><p class="small">Salvaging this item will add <b>${esc(DATA.aspectById[it.aspect.id].name)}</b> (${esc(Items.aspectDesc(DATA.aspectById[it.aspect.id], it.aspect.roll))}) to your Codex if it rolls higher than what you have.</p>`;
    }
    return html + '</div>';
  };
  UI.panels.socketpick = (data) => { const char = Game.char; const gem = Player.findItem(char, data.gem); const cands = Object.values(char.equipment).concat(char.inventory).filter(it => it && it.kind !== 'gem' && (it.sockets || 0) > 0); return `${topbar('Socket ' + (gem ? gem.name : 'gem'))}<div class="scroll pad list">${cands.length ? cands.map(it => `<div class="card" ><b class="rarity-${it.rarity}">${esc(it.name)}</b> <span class="small dim">${esc(DATA.SLOT_NAMES[it.slot] || it.slot)}</span><div class="row" style="margin-top:4px">${Array.from({ length: it.sockets }).map((_, i) => `<button class="btn small" data-action="socketinto" data-gem="${data.gem}" data-id="${it.id}" data-idx="${i}">Socket ${i + 1}: ${it.gems[i] ? esc(it.gems[i].name) : 'empty'} → ${esc(Items.affixName(Items.gemEffect(gem, Items.slotCategory(it.slot))))}</button>`).join('')}</div></div>`).join('') : '<p class="dim">No socketed items. Visit the Jeweler to add sockets.</p>'}</div>`; };
  UI.panels.gempick = (data) => { const char = Game.char; const gems = char.inventory.filter(it => it.kind === 'gem'); const target = Player.findItem(char, data.id); return `${topbar('Choose a gem')}<div class="scroll pad list">${gems.length ? gems.map(g => `<div class="card row between"><span style="color:${g.color}"><b>${esc(g.name)}</b> <span class="small dim">→ ${esc(Items.affixName(Items.gemEffect(g, Items.slotCategory(target.slot))))}</span></span><button class="btn small primary" data-action="socketinto" data-gem="${g.id}" data-id="${data.id}" data-idx="${data.idx}">Insert</button></div>`).join('') : '<p class="dim">No gems in inventory.</p>'}</div>`; };
  UI.panels.imprintpick = (data) => { const char = Game.char; const it = Player.findItem(char, data.id); const sl = it.slot === 'ring' ? 'ring1' : it.slot; const list = DATA.ASPECTS.filter(a => (a.cls === 'all' || a.cls === char.cls) && (DATA.ASPECT_CAT_SLOTS[a.cat].includes(sl) || (sl === 'weapon' && DATA.ASPECT_CAT_SLOTS[a.cat].includes('bludgeon'))) && Game.account.codex[a.id] !== undefined); return `${topbar('Imprint onto ' + it.name)}<div class="scroll pad list">${list.length ? list.map(a => `<div class="card"><b style="color:var(--legendary)">${esc(a.name)}</b> <span class="pill">${esc(a.cat)}</span><p class="small">${esc(Items.aspectDesc(a, Game.account.codex[a.id]))}</p><button class="btn small primary" data-action="imprint" data-id="${it.id}" data-aspect="${a.id}">Imprint (${esc(Items.aspectDesc(a, Game.account.codex[a.id]).match(/[\d.]+%?/) ? '' : '')}roll ${a.flat ? Game.account.codex[a.id] : U.round(Game.account.codex[a.id] * 100, 1) + '%'})</button></div>`).join('') : '<p class="dim">No Codex aspects fit this slot. Clear dungeons or salvage Legendaries to learn Aspects.</p>'}</div>`; };
  UI.panels.stash = () => { const char = Game.char; const st = Game.account.stash; return `${topbar('Stash', `<span class="small dim">${st.length}/${Player.STASH_CAP}</span>`)}<div class="scroll pad"><p class="small dim">Shared between all your characters.</p><div class="itemgrid">${st.map(it => `<div class="slot r-${it.rarity || 'normal'}" data-action="itemdetail" data-id="${it.id}"><span class="ico">${itemIcon(it)}</span>${it.power ? '<span class="pw">' + it.power + '</span>' : ''}</div>`).join('') || '<p class="dim">Empty.</p>'}</div><hr><h3>Your inventory</h3><div class="itemgrid">${char.inventory.map(it => `<div class="slot r-${it.rarity || 'normal'}" data-action="itemdetail" data-id="${it.id}"><span class="ico">${itemIcon(it)}</span></div>`).join('')}</div></div>`; };

  // ---- Character sheet
  UI.panels.character = function () {
    const char = Game.char; const sctx = char.sctx; const rows = Stats.sheet(sctx);
    const groups = {}; rows.forEach(r => { (groups[r.group] = groups[r.group] || []).push(r); });
    const order = ['Core', 'Offense', 'Defense', 'Resistances', 'Recovery', 'Resource', 'Utility', 'Minions', 'Skills', 'Mount'];
    const fmt = (r) => r.kind === 'pct' ? U.fmtPctPlain(r.val) : U.fmtNum(r.val);
    return `${topbar(char.name + ' — Level ' + char.level)}<div class="scroll pad">
      <div class="row"><div class="avatar" style="width:48px;height:48px;border-radius:50%;background:${DATA.classes[char.cls].color}"></div><div class="grow"><b>${esc(DATA.classes[char.cls].name)}</b> ${esc(UI.titleOf(char))}<div class="small dim">XP ${U.fmtNum(char.xp)} / ${U.fmtNum(Stats.xpToNext(char.level))}${char.level >= 60 ? ' · Paragon ' + char.paragonLevel + ' (' + U.fmtNum(char.paragonXp) + '/' + U.fmtNum(Stats.paragonXpToNext(char.paragonLevel)) + ')' : ''}</div></div></div>
      <div class="bar" style="margin:6px 0"><div class="fill" style="width:${char.level >= 60 ? (char.paragonXp / Stats.paragonXpToNext(char.paragonLevel) * 100) : (char.xp / Stats.xpToNext(char.level) * 100)}%"></div></div>
      <div class="row small dim"><span>Kills ${U.fmtNum(char.record.kills)}</span><span>Elites ${char.record.eliteKills}</span><span>Bosses ${char.record.bossKills}</span><span>Dungeons ${char.record.dungeons}</span><span>Deaths ${char.record.deaths}</span><span>Playtime ${U.fmtTime(char.playtime)}</span></div>
      ${char.elixir ? `<div class="card small" style="margin-top:6px">Elixir: <b>${esc(DATA.elixirById[char.elixir.id].name)}</b> — ${U.fmtTime(char.elixir.remaining)} left</div>` : ''}
      ${order.filter(g => groups[g]).map(g => `<div class="statgroup"><h3>${esc(g)}</h3>${groups[g].map(r => `<div class="statrow"><span>${esc(r.name)}</span><span class="v">${fmt(r)}</span></div>`).join('')}</div>`).join('')}
      <div class="statgroup"><h3>Skill damage (per cast, rank included)</h3>${Object.values(sctx.skills).filter(s => s.coef > 0).map(s => `<div class="statrow"><span>${esc(s.def.name)}</span><span class="v">${U.fmtNum(s.weapon.avg * s.coef * (1 + sctx.d.mainStatBonus) * (1 + (sctx.flat.dmg || 0) + s.dmgMult))} base</span></div>`).join('')}</div>
    </div>`;
  };

  // ---- Skills
  UI.panels.skills = function (data) {
    const char = Game.char; const sctx = char.sctx; const cls = DATA.classes[char.cls];
    const spent = Player.skillPointsSpent(char), free = Player.skillPointsFree(char);
    const clusters = DATA.clusters[char.cls];
    const sel = data.sel ? DATA.skillById[data.sel] : null;
    let html = `${topbar('Skills', `<span class="pill gold">${free} point${free === 1 ? '' : 's'}</span>`)}<div class="scroll pad">
      <div class="row between"><span class="small dim">${spent} spent · ${Player.skillPointsTotal(char)} total</span><button class="btn small danger" data-action="respec">Refund all (${U.fmtNum(Player.respecCost(char))}g)</button></div>
      <h3>Action bar</h3><div class="barslots">${char.skills.bar.map((id, i) => `<div class="slot ${id ? 'on' : 'empty'}" data-action="barslot" data-idx="${i}">${id ? '<span>' + esc(DATA.skillById[id].name) + '</span>' : '<span class="dim">Slot ' + (i + 1) + '</span>'}</div>`).join('')}</div>
      <p class="small dim">Tap a slot to assign a learned skill. ${cls.id === 'paladin' ? 'Auras are activated from their skill entry or the Auras of Faith panel.' : ''}${cls.id === 'necromancer' ? ' Corpse skills consume the nearest Corpse.' : ''}</p>`;
    if (sel) html += renderSkillDetail(char, sel);
    clusters.forEach((cl, ci) => {
      const req = DATA.CLUSTER_REQ[ci]; const unlocked = spent >= req;
      const list = DATA.skillsFor(char.cls).filter(s => s.cluster === cl);
      html += `<div class="cluster ${unlocked ? '' : 'locked'}"><h3>${esc(DATA.CLUSTER_NAMES[cl])} <span class="small dim">${unlocked ? '' : 'needs ' + req + ' points'}</span></h3>`;
      list.forEach(s => {
        const r = char.skills.alloc[s.id] || 0; const eff = sctx.ranks[s.id] || 0;
        const up = char.skills.upgrades[s.id] || {};
        html += `<div class="skillrow ${r ? 'on' : ''}" data-action="openpanelreplace" data-panel="skills" data-sel="${s.id}"><div class="ico">${UI.SKILL_ICONS[s.cluster] || '✦'}</div><div class="info"><div class="name">${esc(s.name)} <span class="small dim">${s.type === 'active' ? (s.effect.kind === 'aura' ? 'Aura' : 'Active') : s.type === 'key' ? 'Key Passive' : 'Passive'}</span></div><div class="sub">${esc(s.type === 'active' ? (s.tags.filter(t => t !== s.cluster).map(U.cap).join(', ') + (s.cost ? ' · ' + s.cost + ' ' + cls.resource.name : s.gen ? ' · generates ' + cls.resource.name : '') + (s.cd ? ' · ' + s.cd + 's cooldown' : '')) : Stats.skillDesc(sctx, s, Math.max(1, eff)))}</div></div><div class="rank">${r}/${s.max}${eff > r ? ' (+' + (eff - r) + ')' : ''}${s.type === 'active' && up.e ? ' ✦' : ''}${up.v ? '✦' : ''}</div></div>`;
      });
      html += '</div>';
    });
    return html + '</div>';
  };
  function renderSkillDetail(char, s) {
    const sctx = char.sctx; const r = char.skills.alloc[s.id] || 0; const eff = sctx.ranks[s.id] || 0; const up = char.skills.upgrades[s.id] || {};
    const can = Player.canAlloc(char, s.id); const cls = DATA.classes[char.cls];
    let html = `<div class="card on" style="margin-bottom:10px"><div class="row between"><h3>${esc(s.name)} <span class="small dim">Rank ${r}/${s.max}${eff > r ? ' (+' + (eff - r) + ' from items)' : ''}</span></h3><div class="row"><button class="btn small" data-action="dealloc" data-id="${s.id}" ${r ? '' : 'disabled'}>−</button><button class="btn small primary" data-action="alloc" data-id="${s.id}" ${can ? '' : 'disabled'}>+</button></div></div>
      <p class="small">${esc(Stats.skillDesc(sctx, s, Math.max(1, eff)))}</p>`;
    if (s.type === 'active') {
      html += `<p class="small dim">${s.tags.map(U.cap).join(' · ')} · ${s.cost ? s.cost + ' ' + cls.resource.name : s.gen ? 'Generates ' + s.gen + ' ' + cls.resource.name : 'Free'} · ${s.cd ? s.cd + 's cooldown' : 'No cooldown'} · Lucky Hit ${Math.round((s.lucky || 0) * 100)}%${s.weapon ? ' · Weapon: ' + U.cap(s.weapon) : ''}</p>`;
      if (r < s.max && r > 0) html += `<p class="small dim">Next rank: ${esc(Stats.skillDesc(sctx, s, eff + 1).replace(/\([^)]*\)/g, '').slice(0, 120))}…</p>`;
      if (s.up) {
        html += `<div class="upgrade ${up.e ? 'on' : ''}"><b>${esc(s.up.e.name)}</b> <span class="small dim">(1 point)</span><p class="small">${esc(s.up.e.desc)}</p>${!up.e ? `<button class="btn small primary" data-action="upgrade_skill" data-id="${s.id}" data-which="e" ${r > 0 && Player.skillPointsFree(char) > 0 ? '' : 'disabled'}>Learn</button>` : '<span class="small green">Learned</span>'}</div>`;
        ['a', 'b'].forEach(w => { if (!s.up[w]) return; html += `<div class="upgrade ${up.v === w ? 'on' : ''}"><b>${esc(s.up[w].name)}</b> <span class="small dim">(1 point, choose one)</span><p class="small">${esc(s.up[w].desc)}</p>${up.v === w ? '<span class="small green">Learned</span>' : up.v ? '' : `<button class="btn small primary" data-action="upgrade_skill" data-id="${s.id}" data-which="${w}" ${up.e && Player.skillPointsFree(char) > 0 ? '' : 'disabled'}>Learn</button>`}</div>`; });
      }
      if (r > 0 && s.effect.kind !== 'aura') html += `<div class="row" style="margin-top:8px"><span class="small dim">Assign to slot:</span>${[0, 1, 2, 3, 4, 5].map(i => `<button class="btn small ${char.skills.bar[i] === s.id ? 'primary' : ''}" data-action="setbar" data-idx="${i}" data-id="${s.id}">${i + 1}</button>`).join('')}</div>`;
      if (s.effect.kind === 'aura' && r > 0) html += `<button class="btn small ${char.mechanics.aura === s.id ? 'primary' : ''}" data-action="setaura" data-id="${s.id}">${char.mechanics.aura === s.id ? 'Active Aura' : 'Activate Aura'}</button>`;
    }
    return html + '</div>';
  }
  UI.panels.barpick = (data) => { const char = Game.char; const idx = +data.idx; const learned = DATA.skillsFor(char.cls).filter(s => s.type === 'active' && char.skills.alloc[s.id] > 0 && s.effect.kind !== 'aura'); return `${topbar('Slot ' + (idx + 1))}<div class="scroll pad list"><button class="btn block" data-action="setbar" data-idx="${idx}" data-id="">Empty</button>${learned.map(s => `<button class="btn block ${char.skills.bar[idx] === s.id ? 'primary' : ''}" data-action="setbar" data-idx="${idx}" data-id="${s.id}">${esc(s.name)} <span class="small dim">(${esc(DATA.CLUSTER_NAMES[s.cluster])})</span></button>`).join('')}</div>`; };

  // ---- Class mechanics
  UI.panels.mechanic = function () {
    const char = Game.char; const cls = DATA.classes[char.cls]; const m = char.mechanics;
    let html = `${topbar(cls.mechanic.name)}<div class="scroll pad">`;
    if (char.cls === 'necromancer') {
      html += '<p class="small dim">Choose which minions you raise and their variant. Minions respawn automatically. Sacrifice a minion type for a permanent bonus.</p>';
      Object.keys(DATA.bookOfDead).forEach(k => { const g = DATA.bookOfDead[k]; const sel = m.bookOfDead[k]; html += `<h3>${esc(g.name)} <span class="small dim">×${g.count}</span></h3><div class="grid auto">${Object.keys(g.options).map(o => { const opt = g.options[o]; const on = sel && sel.opt === o; return `<div class="card ${on ? 'on' : ''}" data-action="bod" data-k="${k}" data-opt="${o}"><b>${esc(opt.name)}</b><p class="small">${esc(opt.desc)}</p>${on && opt.upgrade ? `<div class="small ${sel.upgraded ? 'green' : 'dim'}">Upgrade: ${esc(opt.upgrade.desc)}</div><button class="btn small ${sel.upgraded ? '' : 'primary'}" data-action="bodupg" data-k="${k}" ${sel.upgraded ? 'disabled' : ''}>${sel.upgraded ? 'Upgraded' : 'Upgrade (reach level ' + ({ skeletal_warriors: 10, skeletal_mages: 20, golem: 30 }[k]) + ')'}</button>` : ''}</div>`; }).join('')}</div>`; });
    } else if (char.cls === 'barbarian') {
      html += '<p class="small dim">Expertise grows as you kill with each weapon type (rank 1–10). Assign one weapon type as your <b>Technique</b> to gain its bonus with every weapon.</p><div class="list">';
      Object.keys(DATA.arsenal).forEach(t => { const a = DATA.arsenal[t]; const xp = (m.expertise || {})[t] || 0; const rk = Math.min(10, Math.floor(xp / 100) + 1); html += `<div class="card ${m.technique === t ? 'on' : ''}"><div class="row between"><b>${esc(a.name)}</b><span class="pill">Rank ${rk}</span></div><p class="small">${esc(a.desc)}</p><div class="bar"><div class="fill" style="width:${rk >= 10 ? 100 : (xp % 100)}%"></div></div><button class="btn small ${m.technique === t ? '' : 'primary'}" style="margin-top:6px" data-action="technique" data-t="${t}">${m.technique === t ? 'Current Technique' : 'Set as Technique'}</button></div>`; });
      html += '</div>';
    } else if (char.cls === 'druid') {
      html += '<p class="small dim">Earn Spirit Boons by completing dungeons and strongholds in Scosglen and beyond (each clear grants Spirit Offering). Pick one boon per spirit; a second boon from your bonded spirit.</p>';
      const offerings = char.mechanics.offerings || 0; html += `<p class="small">Spirit Offerings available: <b>${offerings}</b> (1 per dungeon/stronghold clear). Unlocked boons: ${(m.unlockedBoons || []).length}/16</p>`;
      Object.keys(DATA.spiritBoons).forEach(sp => { const g = DATA.spiritBoons[sp]; const sel = m.boons[sp]; const list = Array.isArray(sel) ? sel : sel ? [sel] : []; html += `<h3 style="color:${g.color}">${esc(g.name)} ${m.bonded === sp ? '<span class="pill gold">Bonded</span>' : `<button class="btn small" data-action="bond" data-sp="${sp}">Bond</button>`}</h3><div class="grid auto">${Object.keys(g.boons).map(b => { const bo = g.boons[b]; const unl = (m.unlockedBoons || []).includes(sp + ':' + b); const on = list.includes(b); return `<div class="card ${on ? 'on' : ''} ${unl ? '' : 'areacard locked'}" data-action="${unl ? 'boon' : 'unlockboon'}" data-sp="${sp}" data-b="${b}"><b>${esc(bo.name)}</b><p class="small">${esc(bo.desc)}</p>${unl ? '' : '<span class="small dim">Tap to unlock (1 offering)</span>'}</div>`; }).join('')}</div>`; });
    } else if (char.cls === 'paladin') {
      html += `<p class="small dim">${esc(DATA.paladinAurasNote)} Learn Auras in the Aura skill cluster.</p><div class="list">`;
      DATA.skillsFor('paladin').filter(s => s.effect && s.effect.kind === 'aura').forEach(s => { const r = char.skills.alloc[s.id] || 0; html += `<div class="card ${m.aura === s.id ? 'on' : ''}"><b>${esc(s.name)}</b> <span class="small dim">Rank ${r}</span><p class="small">${esc(s.desc)}</p>${r ? `<button class="btn small ${m.aura === s.id ? '' : 'primary'}" data-action="setaura" data-id="${s.id}">${m.aura === s.id ? 'Active' : 'Activate'}</button>` : '<span class="small dim">Not learned</span>'}</div>`; });
      html += '</div>';
    }
    return html + '</div>';
  };

  // ---- Paragon
  UI.panels.paragon = function (data) {
    const char = Game.char; const bi = data.board !== undefined ? +data.board : 0; const st = char.paragon.boards[bi]; const board = Paragon.getBoard(char, st);
    const free = Paragon.pointsFree(char);
    const selKey = data.sel; const selNode = selKey ? board.nodes[selKey] : null;
    let html = `${topbar('Paragon', `<span class="pill gold">${free} point${free === 1 ? '' : 's'}</span>`)}<div class="scroll pad">
      ${char.level < 60 ? '<p class="small dim">Paragon points come from Paragon levels after level 60 and from certain quests. Points available now can be spent early.</p>' : ''}
      <div class="row">${char.paragon.boards.map((b, i) => `<button class="btn small ${i === bi ? 'primary' : ''}" data-action="openpanelreplace" data-panel="paragon" data-board="${i}">${esc(Paragon.getBoard(char, b).name)}</button>`).join('')}<span class="grow"></span><button class="btn small danger" data-action="paragonreset">Reset (${U.fmtNum(Paragon.resetCost(char))}g)</button></div>`;
    if (selNode) {
      const k = selKey; const alloc = st.nodes[k]; const can = Paragon.canAlloc(char, bi, selNode.x, selNode.y);
      html += `<div class="card on" style="margin:8px 0"><b class="${selNode.kind === 'legendary' ? 'rarity-legendary' : selNode.kind === 'rare' ? 'rarity-rare' : selNode.kind === 'magic' ? 'rarity-magic' : ''}">${esc(selNode.name)}</b> <span class="small dim">${esc(U.cap(selNode.kind))}</span><p class="small">${esc(selNode.desc || (selNode.mods || []).map(Paragon.modText).join(', '))}</p>`;
      if (selNode.kind === 'gate' && alloc) { if (Paragon.canAttach(char, bi, selNode.side)) html += `<div class="row">${Paragon.availableBoards(char).map(b => `<button class="btn small primary" data-action="attachboard" data-board="${bi}" data-side="${selNode.side}" data-id="${b.id}">Attach ${esc(b.name)}</button>`).join('') || '<span class="small dim">No more boards.</span>'}</div>`; else html += '<span class="small dim">Board already attached here.</span>'; }
      else if (selNode.kind === 'socket' && alloc) { html += `<div class="row">${Paragon.allGlyphs(char.cls).map(g => { const info = Paragon.glyphXpInfo(char, g.id); const used = char.paragon.boards.some((b, i) => i !== bi && b.glyph && b.glyph.id === g.id); return `<button class="btn small ${st.glyph && st.glyph.id === g.id ? 'primary' : ''}" data-action="socketglyph" data-board="${bi}" data-id="${g.id}" ${used ? 'disabled' : ''}>${esc(g.name)} (r${info.rank})</button>`; }).join('')}<button class="btn small" data-action="socketglyph" data-board="${bi}" data-id="">Remove</button></div>`; if (st.glyph) { const g = Paragon.glyphDef(char.cls, st.glyph.id); const info = Paragon.glyphXpInfo(char, g.id); html += `<p class="small" style="margin-top:6px"><b style="color:var(--mythic)">${esc(g.name)}</b> rank ${info.rank}: ${esc(g.desc.replace('{v}', U.round(g.per * info.rank * 100, 1)))}<br>${esc(DATA.STAT_DEFS[g.req].name)} in radius: ${Paragon.statInRadius(char, st, g.req)}/40 ${Paragon.statInRadius(char, st, g.req) >= 40 ? '<span class="green">bonus active</span>' : ''}<br>Glyph XP ${info.xp}/${info.next} (earn by clearing dungeons & the Pit)</p>`; } }
      else if (!alloc) html += `<button class="btn small primary" data-action="paragonalloc" data-board="${bi}" data-x="${selNode.x}" data-y="${selNode.y}" ${can ? '' : 'disabled'}>${can ? 'Allocate (1 point)' : free <= 0 ? 'No points' : 'Must connect to an allocated node'}</button>`;
      else html += '<span class="small green">Allocated</span>';
      html += '</div>';
    } else html += '<p class="small dim" style="margin:8px 0">Tap a node to inspect it. Nodes must connect to your allocated path. Gates attach new boards; sockets hold Glyphs.</p>';
    html += '<div class="pboard">';
    for (let y = 0; y < 9; y++) for (let x = 0; x < 9; x++) { const k = x + ',' + y; const n = board.nodes[k]; const alloc = st.nodes[k]; const can = !alloc && Paragon.canAlloc(char, bi, x, y); const label = n.kind === 'normal' ? ({ str: 'S', int: 'I', will: 'W', dex: 'D' }[n.mods[0].stat]) : n.kind === 'magic' ? 'M' : n.kind === 'rare' ? 'R' : n.kind === 'legendary' ? 'L' : n.kind === 'socket' ? '◈' : n.kind === 'gate' ? '⇄' : '●'; html += `<div class="pnode ${n.kind} ${alloc ? 'alloc' : ''} ${can ? 'can' : ''} ${selKey === k ? 'sel' : ''}" data-action="openpanelreplace" data-panel="paragon" data-board="${bi}" data-sel="${k}" title="${esc(n.name)}">${label}</div>`; }
    return html + '</div></div>';
  };

  // ---- Quests
  UI.panels.quests = function (data) {
    const char = Game.char; const tab = data.tab || 'active';
    const quests = DATA.QUESTS.filter(q => { const st = Player.questState(char, q); if (tab === 'active') return st === 'active'; if (tab === 'available') return st === 'available' || st === 'locked'; return st === 'done'; });
    const w = char.quests.whispers;
    return `${topbar('Quests')}<div class="scroll pad">
      <div class="row"><button class="btn tab ${tab === 'active' ? 'on' : ''}" data-action="openpanelreplace" data-panel="quests" data-tab="active">Active (${Object.keys(char.quests.active).length})</button><button class="btn tab ${tab === 'available' ? 'on' : ''}" data-action="openpanelreplace" data-panel="quests" data-tab="available">Available</button><button class="btn tab ${tab === 'done' ? 'on' : ''}" data-action="openpanelreplace" data-panel="quests" data-tab="done">Completed (${Object.keys(char.quests.done).length})</button></div>
      <div class="list" style="margin-top:8px">${quests.map(q => renderQuest(char, q)).join('') || '<p class="dim">Nothing here.</p>'}</div>
      ${w.list.length ? `<h3 style="margin-top:12px">Whispers of the Dead <span class="small dim">(${esc(DATA.zoneById[w.zone || char.zone].name)}) · Grim Favor ${w.favor}/10</span></h3><div class="list">${w.list.map(x => `<div class="card quest ${x.done ? 'complete' : 'active'}"><b>${esc(x.name)}</b> <span class="pill">${x.grim} favor</span><div class="objective ${x.done ? 'done' : ''}">${x.type === 'kill' ? 'Kill ' + x.progress + '/' + x.n + ' ' + esc(DATA.FAMILIES[x.family]) : x.type === 'elite' ? 'Kill ' + x.progress + '/' + x.n + ' Elites' : x.type === 'boss' ? 'Slay ' + esc(DATA.bossById[x.boss].name) : 'Complete ' + esc(DATA.areaById[x.area].name)}</div></div>`).join('')}</div><button class="btn small primary" data-action="collectwhispers" ${w.list.some(x => x.done) ? '' : 'disabled'}>Turn in at the Tree of Whispers (Zarbinzet)</button>` : ''}
    </div>`;
  };
  function renderQuest(char, q) {
    const st = Player.questState(char, q); const prog = char.quests.active[q.id];
    const complete = st === 'active' && Player.questComplete(char, q.id);
    const giver = q.giver ? DATA.npcById[q.giver] : null;
    const rw = q.rewards; const rewards = [];
    if (rw.xp) rewards.push('XP'); if (rw.gold) rewards.push('Gold'); if (rw.items) rewards.push(rw.items.map(i => U.cap(i.rarity) + ' item').join(', ')); if (rw.skillPoints) rewards.push('+' + rw.skillPoints + ' Skill Point'); if (rw.paragon) rewards.push('+' + rw.paragon + ' Paragon'); if (rw.cosmetic) rewards.push('Cosmetic: ' + DATA.cosmeticById[rw.cosmetic].name); if (rw.mount) rewards.push('Mount: ' + DATA.mountById[rw.mount].name); if (rw.mount_armor) rewards.push('Mount armor'); if (rw.mount_trophy) rewards.push('Mount trophy'); if (rw.obols) rewards.push(rw.obols + ' Obols'); if (rw.potion) rewards.push('Potion upgrade');
    return `<div class="card quest ${st} ${complete ? 'complete' : ''}"><div class="row between"><b>${esc(q.name)}</b><span class="small dim">${q.zone === 'any' ? 'Milestone' : esc(DATA.zoneById[q.zone].name)}${giver ? ' · ' + esc(giver.name) : ''}</span></div><p class="small">${esc(q.desc)}</p>
      ${q.objectives.map((o, i) => `<div class="objective ${prog && prog.progress[i] >= (o.n || 1) ? 'done' : ''}">• ${esc(objectiveText(o))}${prog ? ' (' + prog.progress[i] + '/' + (o.n || 1) + ')' : ''}</div>`).join('')}
      <div class="small dim" style="margin-top:4px">Rewards: ${esc(rewards.join(', '))}</div>
      ${st === 'locked' ? '<div class="small red">Requires: ' + q.prereq.map(p => esc(DATA.questById[p].name)).join(', ') + '</div>' : ''}
      ${st === 'available' && !q.milestone && Game.state === 'town' ? `<button class="btn small primary" style="margin-top:6px" data-action="acceptquest" data-id="${q.id}">Accept</button>` : ''}
      ${complete && (Game.state === 'town' || q.milestone) ? `<button class="btn small primary" style="margin-top:6px" data-action="turnin" data-id="${q.id}">Turn in${giver && Game.state === 'town' ? ' (' + esc(giver.name) + ')' : ''}</button>` : complete ? '<span class="small green">Complete — turn in at the quest giver in town</span>' : ''}
    </div>`;
  }
  function objectiveText(o) { switch (o.type) { case 'kill': return 'Kill ' + o.n + ' ' + (o.family ? DATA.FAMILIES[o.family] : DATA.enemyById[o.enemy].name + 's'); case 'elite': return 'Slay ' + o.n + ' Elites'; case 'dungeon': return 'Complete ' + DATA.areaById[o.id].name + (o.n > 1 ? ' ×' + o.n : ''); case 'stronghold': return 'Conquer ' + DATA.areaById[o.id].name; case 'boss': return 'Defeat ' + DATA.bossById[o.id].name; case 'collect': return 'Collect ' + o.n + ' ' + DATA.MATERIALS[o.mat].name; case 'level': return 'Reach level ' + o.n; case 'event': return 'Complete ' + DATA.areaById[o.id].name; case 'whispers': return 'Complete ' + o.n + ' Whispers'; case 'dungeons_total': return 'Complete ' + o.n + ' dungeons'; default: return o.type; } }

  // ---- Codex of Power
  UI.panels.codex = function (data) {
    const char = Game.char; const cat = data.cat || 'all';
    const list = DATA.ASPECTS.filter(a => (a.cls === 'all' || a.cls === char.cls) && (cat === 'all' || a.cat === cat));
    return `${topbar('Codex of Power')}<div class="scroll pad"><p class="small dim">Aspects unlocked by clearing dungeons (first clear) or salvaging Legendary items (best roll is kept). Imprint them at the Occultist.</p>
      <div class="row">${['all', 'offensive', 'defensive', 'utility', 'resource', 'mobility'].map(c => `<button class="btn tab ${cat === c ? 'on' : ''}" data-action="openpanelreplace" data-panel="codex" data-cat="${c}">${esc(U.cap(c))}</button>`).join('')}</div>
      <div class="list" style="margin-top:8px">${list.map(a => { const roll = Game.account.codex[a.id]; const src = DATA.ZONES.flatMap(z => z.areas).find(ar => ar.aspects && (ar.aspects[char.cls] === a.id || ar.aspects.all === a.id)); return `<div class="card ${roll !== undefined ? '' : 'areacard locked'}"><div class="row between"><b style="color:var(--legendary)">${esc(a.name)}</b><span class="pill">${esc(a.cat)}</span></div><p class="small">${esc(a.desc.replace('{v}', Items.aspectRange(a)))}</p><div class="small ${roll !== undefined ? 'green' : 'dim'}">${roll !== undefined ? 'Unlocked — roll ' + (a.flat ? roll : U.round(roll * 100, 1) + '%') : (src ? 'Dungeon: ' + esc(src.name) + ' (' + esc(DATA.zoneById[src.zone].name) + ')' : 'Found on Legendary items')}</div></div>`; }).join('')}</div></div>`;
  };

  // ---- NPC dialog & vendors
  UI.panels.npc = function (data) {
    const char = Game.char; const npc = DATA.npcById[data.id]; const line = npc.lines.length ? U.pick(npc.lines) : '';
    const quests = DATA.QUESTS.filter(q => q.giver === npc.id);
    let body = '';
    if (npc.role === 'quest' || npc.role === 'tree') body += `<div class="list">${quests.map(q => renderQuest(char, q)).join('') || ''}</div>`;
    if (npc.role === 'tree') { const w = char.quests.whispers; if (!w.list.length || w.zone !== char.zone) Player.generateWhispers(char, char.zone); body += `<h3>Whispers of the Dead</h3><p class="small">Grim Favor: <b>${char.quests.whispers.favor}/10</b>. Collect 10 for a cache of rewards.</p><div class="list">${char.quests.whispers.list.map(x => `<div class="card quest ${x.done ? 'complete' : 'active'}"><b>${esc(x.name)}</b> <span class="pill">${x.grim} favor</span><div class="objective ${x.done ? 'done' : ''}">${x.type === 'kill' ? 'Kill ' + x.progress + '/' + x.n + ' ' + esc(DATA.FAMILIES[x.family]) : x.type === 'elite' ? 'Kill ' + x.progress + '/' + x.n + ' Elites' : x.type === 'boss' ? 'Slay ' + esc(DATA.bossById[x.boss].name) : 'Complete ' + esc(DATA.areaById[x.area].name)}</div></div>`).join('')}</div><button class="btn primary" data-action="collectwhispers" ${char.quests.whispers.list.some(x => x.done) ? '' : 'disabled'}>Offer completed Whispers</button> <button class="btn" data-action="rerollwhispers">New Whispers</button>`; }
    if (npc.role === 'healer') body += `<button class="btn primary block" data-action="heal">Heal & refill potions (free)</button>`;
    if (npc.role === 'stash') body += `<button class="btn primary block" data-action="openpanel" data-panel="stash">Open Stash</button>`;
    if (npc.role === 'waypoint') body += `<div class="list">${Object.values(DATA.TOWNS).map(t => `<button class="btn block ${t.id === char.town ? 'disabled' : ''}" data-action="travel" data-town="${t.id}">${esc(t.name)} <span class="small dim">(${esc(DATA.zoneById[t.zone].name)})</span></button>`).join('')}</div>`;
    if (['blacksmith', 'jeweler', 'occultist', 'alchemist', 'purveyor', 'stable', 'wardrobe'].includes(npc.role)) body += `<button class="btn primary block" data-action="openpanel" data-panel="vendor" data-role="${npc.role}" data-npc="${npc.id}">Trade</button>`;
    return `${topbar(npc.name, `<span class="small dim">${esc(roleName(npc.role))}</span>`)}<div class="scroll pad">${line ? `<div class="card"><i>“${esc(line)}”</i></div>` : ''}<div style="margin-top:8px">${body}</div></div>`;
  };
  UI.panels.vendor = function (data) {
    const char = Game.char; const role = data.role;
    const invHtml = (filter) => `<div class="itemgrid">${char.inventory.filter(it => it.kind !== 'gem' && (!filter || filter(it))).map(it => `<div class="slot r-${it.rarity}" data-action="itemdetail" data-id="${it.id}" data-vendor="${role}"><span class="ico">${itemIcon(it)}</span><span class="pw">${it.power}</span></div>`).join('') || '<p class="dim">No items.</p>'}</div>`;
    const eqHtml = () => `<div class="itemgrid">${Object.keys(char.equipment).filter(k => char.equipment[k]).map(k => { const it = char.equipment[k]; return `<div class="slot r-${it.rarity}" data-action="itemdetail" data-id="${it.id}" data-vendor="${role}"><span class="lbl">${esc(DATA.SLOT_NAMES[k])}</span><span class="ico">${itemIcon(it)}</span><span class="pw">${it.power}</span></div>`; }).join('')}</div>`;
    let html = `${topbar(roleName(role))}<div class="scroll pad">${matsHtml(char)}<hr>`;
    if (role === 'blacksmith') html += `<p class="small dim">Tap an item to upgrade (+Item Power) or salvage it for materials. Salvaging Legendaries records their Aspect in your Codex.</p><h3>Equipped</h3>${eqHtml()}<h3>Inventory</h3>${invHtml()}<div class="row" style="margin-top:8px"><button class="btn" data-action="salvageall" data-rar="normal,magic">Salvage all Normal/Magic</button><button class="btn" data-action="salvageall" data-rar="rare">Salvage all Rare</button></div>`;
    else if (role === 'jeweler') { html += `<p class="small dim">Add sockets and insert gems. Combine 3 gems of a tier into a higher tier.</p><h3>Equipped</h3>${eqHtml()}<h3>Inventory</h3>${invHtml(it => true)}<h3>Gems</h3><div class="list">`; const gems = char.inventory.filter(it => it.kind === 'gem'); const groups = {}; gems.forEach(g => { const k = g.gem + ':' + g.tier; (groups[k] = groups[k] || []).push(g); }); html += Object.keys(groups).map(k => { const g = groups[k]; const ti = DATA.GEM_TIERS.findIndex(t => t.id === g[0].tier); const cost = Items.gemUpgradeCost(ti); const canUp = ti < DATA.GEM_TIERS.length - 1 && g.length >= 3; return `<div class="card row between"><span style="color:${g[0].color}"><b>${esc(g[0].name)}</b> ×${g.length}</span>${ti < DATA.GEM_TIERS.length - 1 ? `<button class="btn small ${canUp && Player.canAfford(char, cost) ? 'primary' : ''}" data-action="gemup" data-gem="${g[0].gem}" data-tier="${g[0].tier}" ${canUp && Player.canAfford(char, cost) ? '' : 'disabled'}>Combine 3 → ${esc(DATA.GEM_TIERS[ti + 1].name || 'Standard')} (${U.fmtNum(cost.gold)}g)</button>` : '<span class="small dim">Max tier</span>'}</div>`; }).join('') || '<p class="dim">No gems. Gems drop from monsters.</p>'; html += `</div><div class="card row between" style="margin-top:8px"><span>Craft a Crude gem from 10 Gem Fragments</span><button class="btn small" data-action="craftgem" ${(char.materials.crude_gem || 0) >= 10 ? '' : 'disabled'}>Craft (random)</button></div>`; }
    else if (role === 'occultist') html += `<p class="small dim">Imprint Aspects from your Codex and reroll affixes. Tap an item.</p><div class="row"><button class="btn" data-action="openpanel" data-panel="codex">📕 View Codex</button></div><h3>Equipped</h3>${eqHtml()}<h3>Inventory</h3>${invHtml(it => it.rarity !== 'normal' && it.rarity !== 'magic')}`;
    else if (role === 'alchemist') { const next = DATA.POTION_TIERS.find(t => t.level > (char.potion.tier || 1)); html += `<h3>Healing Potion</h3><div class="card"><b>${esc((DATA.POTION_TIERS.slice().reverse().find(t => t.level <= (char.potion.tier || 1)) || DATA.POTION_TIERS[0]).name)}</b> — heals ${U.fmtPctPlain(char.sctx.d.potionHeal)} of Maximum Life, ${char.sctx.d.potionCharges} charges.${next ? `<div class="row between" style="margin-top:6px"><span class="small">Upgrade to ${esc(next.name)} (heals ${Math.round(next.heal * 100)}%). Requires level ${next.level}.</span><button class="btn small primary" data-action="potionup" ${char.level >= next.level && Player.canAfford(char, { gold: next.level * 150, gallowvine: 5 }) ? '' : 'disabled'}>${next.level * 150}g + 5 Gallowvine</button></div>` : '<div class="small green">Fully upgraded.</div>'}</div><h3>Elixirs (30 minutes of game time)</h3><div class="list">${DATA.ELIXIRS.map(e => `<div class="card"><b>${esc(e.name)}</b><p class="small">${esc(e.desc)}</p><div class="row between"><span class="small">${costHtml(char, e.cost)}</span><button class="btn small primary" data-action="elixir" data-id="${e.id}" ${Player.canAfford(char, e.cost) ? '' : 'disabled'}>Brew & drink</button></div></div>`).join('')}</div>${char.elixir ? `<p class="small">Active: <b>${esc(DATA.elixirById[char.elixir.id].name)}</b>, ${U.fmtTime(char.elixir.remaining)} remaining.</p>` : ''}`; }
    else if (role === 'purveyor') html += `<p class="small">Spend <b style="color:#b36cff">Murmuring Obols</b> (${char.materials.obols || 0}) on a mystery item. Legendaries and even Uniques are possible.</p><div class="grid auto">${['helm', 'chest', 'gloves', 'pants', 'boots', 'amulet', 'ring', 'weapon'].concat(DATA.classes[char.cls].weaponTypes.offhand ? ['offhand'] : []).map(sl => `<button class="btn" data-action="gamble" data-slot="${sl}" ${(char.materials.obols || 0) >= Items.gambleCost(sl) ? '' : 'disabled'}>${UI.ICONS[sl]} ${esc(DATA.SLOT_NAMES[sl] || U.cap(sl))}<br><span class="small">${Items.gambleCost(sl)} obols</span></button>`).join('')}</div>`;
    else if (role === 'stable') html += UI.stableHtml(char);
    else if (role === 'wardrobe') html += UI.wardrobeHtml(char, data.tab || 'transmog');
    return html + '</div>';
  };
  UI.stableHtml = function (char) {
    const acc = Game.account;
    return `<h3>Mounts</h3><p class="small dim">Ride in open-world areas (🐎). Spur for a burst of speed. Dismount onto enemies to knock them down.</p><div class="grid auto">${DATA.MOUNTS.map(m => { const unl = acc.mounts.includes(m.id); const on = char.mount.current === m.id; return `<div class="card ${on ? 'on' : ''} ${unl ? '' : 'areacard locked'}"><div class="row"><div class="sw" style="width:28px;height:28px;border-radius:50%;background:${m.color};border:2px solid ${m.mane}"></div><b>${esc(m.name)}</b></div><p class="small">${esc(m.desc)}</p><div class="small dim">Speed ×${m.speed} · ${m.spurs} spurs</div>${unl ? (on ? '<span class="small green">Selected</span>' : `<button class="btn small primary" data-action="pickmount" data-id="${m.id}">Select</button>`) : m.unlock.type === 'gold' ? `<button class="btn small" data-action="buymount" data-id="${m.id}" ${char.materials.gold >= m.unlock.cost ? '' : 'disabled'}>Buy (${U.fmtNum(m.unlock.cost)}g)</button>` : `<span class="small dim">${m.unlock.type === 'quest' ? 'Quest reward' : m.unlock.type === 'stronghold' ? 'Stronghold reward' : 'Rare drop'}</span>`}</div>`; }).join('')}</div>
      <h3>Mount Armor</h3><div class="grid auto">${DATA.MOUNT_ARMOR.map(a => { const unl = a.unlock.type === 'default' || acc.mountArmor.includes(a.id); const on = char.mount.armor === a.id; return `<div class="card ${on ? 'on' : ''} ${unl ? '' : 'areacard locked'}"><b>${esc(a.name)}</b>${a.mods ? '<div class="small">' + a.mods.map(Paragon.modText).join(', ') + '</div>' : ''}${unl ? (on ? '<span class="small green">Equipped</span>' : `<button class="btn small primary" data-action="pickmountarmor" data-id="${a.id}">Equip</button>`) : a.unlock.type === 'gold' ? `<button class="btn small" data-action="buymountarmor" data-id="${a.id}" ${char.materials.gold >= a.unlock.cost ? '' : 'disabled'}>Buy (${U.fmtNum(a.unlock.cost)}g)</button>` : '<span class="small dim">Reward</span>'}</div>`; }).join('')}</div>
      <h3>Trophies</h3><div class="grid auto">${DATA.MOUNT_TROPHIES.map(a => { const unl = a.unlock.type === 'default' || acc.mountTrophies.includes(a.id); const on = char.mount.trophy === a.id; return `<div class="card ${on ? 'on' : ''} ${unl ? '' : 'areacard locked'}"><b>${esc(a.name)}</b>${unl ? (on ? '<span class="small green">Equipped</span>' : `<button class="btn small primary" data-action="pickmounttrophy" data-id="${a.id}">Equip</button>`) : a.unlock.type === 'gold' ? `<button class="btn small" data-action="buymounttrophy" data-id="${a.id}" ${char.materials.gold >= a.unlock.cost ? '' : 'disabled'}>Buy (${U.fmtNum(a.unlock.cost)}g)</button>` : '<span class="small dim">Reward</span>'}</div>`; }).join('')}</div>`;
  };
  UI.wardrobeHtml = function (char, tab) {
    const acc = Game.account;
    let html = `<div class="row">${['transmog', 'dyes', 'markers', 'titles'].map(t => `<button class="btn tab ${tab === t ? 'on' : ''}" data-action="openpanelreplace" data-panel="vendor" data-role="wardrobe" data-tab="${t}">${esc(U.cap(t))}</button>`).join('')}</div>`;
    if (tab === 'transmog') { ['helm', 'chest', 'gloves', 'boots', 'back', 'weapon'].forEach(slot => { html += `<h3>${esc(U.cap(slot))}</h3><div class="grid auto">${DATA.COSMETICS.filter(c => c.slot === slot).map(c => { const unl = Player.cosmeticUnlocked(acc, char, c); const def = DATA.COSMETICS.find(x => x.slot === slot && x.unlock.type === 'default'); const on = (char.cosmetics.equipped[slot] || (def ? def.id : null)) === c.id; return `<div class="card cosmetic ${on ? 'on' : ''} ${unl ? '' : 'areacard locked'}"><div class="sw" style="background:${c.color || '#333'}"></div><div class="grow"><b>${esc(c.name)}</b><div class="small dim">${unl ? '' : c.unlock.type === 'gold' ? U.fmtNum(c.unlock.cost) + ' gold' : c.unlock.type === 'level' ? 'Level ' + c.unlock.level : c.unlock.type === 'stronghold' ? 'Stronghold reward' : 'Quest reward'}</div></div>${unl ? (on ? '<span class="small green">On</span>' : `<button class="btn small primary" data-action="wear" data-slot="${slot}" data-id="${c.id}">Wear</button>`) : c.unlock.type === 'gold' ? `<button class="btn small" data-action="buycos" data-id="${c.id}" ${char.materials.gold >= c.unlock.cost ? '' : 'disabled'}>Buy</button>` : ''}</div>`; }).join('')}</div>`; }); }
    else if (tab === 'dyes') html += `<div class="grid auto">${DATA.DYES.map(d => { const unl = d.unlock.type === 'default' || acc.cosmetics.includes('dye:' + d.id) || (d.unlock.type === 'level' && char.level >= d.unlock.level); const on = char.cosmetics.dye === d.id; return `<div class="card cosmetic ${on ? 'on' : ''} ${unl ? '' : 'areacard locked'}"><div class="sw" style="background:${d.color || 'transparent'}"></div><div class="grow"><b>${esc(d.name)}</b><div class="small dim">${unl ? '' : d.unlock.type === 'gold' ? U.fmtNum(d.unlock.cost) + ' gold' : 'Level ' + d.unlock.level}</div></div>${unl ? (on ? '<span class="small green">On</span>' : `<button class="btn small primary" data-action="dye" data-id="${d.id}">Apply</button>`) : d.unlock.type === 'gold' ? `<button class="btn small" data-action="buydye" data-id="${d.id}" ${char.materials.gold >= d.unlock.cost ? '' : 'disabled'}>Buy</button>` : ''}</div>`; }).join('')}</div>`;
    else if (tab === 'markers') html += `<div class="grid auto">${DATA.MARKERS.map(d => { const unl = d.unlock.type === 'default' || acc.cosmetics.includes('marker:' + d.id) || (d.unlock.type === 'level' && char.level >= d.unlock.level) || (d.unlock.type === 'quest' && char.quests.done[d.unlock.quest]); const on = char.cosmetics.marker === d.id; return `<div class="card cosmetic ${on ? 'on' : ''} ${unl ? '' : 'areacard locked'}"><div class="sw" style="display:flex;align-items:center;justify-content:center">${d.glyph || ''}</div><div class="grow"><b>${esc(d.name)}</b><div class="small dim">${unl ? '' : d.unlock.type === 'gold' ? U.fmtNum(d.unlock.cost) + ' gold' : d.unlock.type === 'level' ? 'Level ' + d.unlock.level : 'Quest: ' + esc(DATA.questById[d.unlock.quest].name)}</div></div>${unl ? (on ? '<span class="small green">On</span>' : `<button class="btn small primary" data-action="marker" data-id="${d.id}">Use</button>`) : d.unlock.type === 'gold' ? `<button class="btn small" data-action="buymarker" data-id="${d.id}" ${char.materials.gold >= d.unlock.cost ? '' : 'disabled'}>Buy</button>` : ''}</div>`; }).join('')}</div>`;
    else html += `<div class="grid auto">${DATA.TITLES.map(t => { const unl = t.unlock.type === 'default' || (t.unlock.type === 'kills' && char.record.kills >= t.unlock.n) || (t.unlock.type === 'quest' && char.quests.done[t.unlock.quest]); const on = char.cosmetics.title === t.id; return `<div class="card ${on ? 'on' : ''} ${unl ? '' : 'areacard locked'}"><b>${esc(t.name)}</b><div class="small dim">${unl ? '' : t.unlock.type === 'kills' ? U.fmtNum(t.unlock.n) + ' kills' : 'Quest: ' + esc(DATA.questById[t.unlock.quest].name)}</div>${unl ? (on ? '<span class="small green">On</span>' : `<button class="btn small primary" data-action="title" data-id="${t.id}">Use</button>`) : ''}</div>`; }).join('')}</div>`;
    return html;
  };

  // ---- Run result
  UI.panels.result = function (data) {
    const r = data.result; const loot = data.loot || [];
    return `${topbar(r.title || 'Return to town')}<div class="scroll pad"><div class="card"><p>${esc(r.text || '')}</p><div class="row small"><span>Kills ${r.kills}</span><span>Elites ${r.eliteKills}</span><span>XP ${U.fmtNum(r.xp)}</span><span>Gold ${U.fmtNum(r.gold)}</span><span>Time ${U.fmtTime(r.elapsed)}</span></div></div>
      ${r.extras && r.extras.length ? '<div class="card" style="margin-top:8px"><b>Rewards</b><ul class="small">' + r.extras.map(x => '<li>' + esc(x) + '</li>').join('') + '</ul></div>' : ''}
      ${loot.length ? '<h3>Notable loot</h3><div class="itemgrid">' + loot.map(it => `<div class="slot r-${it.rarity || 'normal'}" data-action="itemdetail" data-id="${it.id}"><span class="ico">${itemIcon(it)}</span>${it.power ? '<span class="pw">' + it.power + '</span>' : ''}</div>`).join('') + '</div>' : ''}
      <button class="btn primary block" style="margin-top:12px" data-action="closeall">Continue</button></div>`;
  };
  UI.panels.levelup = (data) => `${topbar('Level Up!')}<div class="scroll pad"><div class="card center"><h1>Level ${Game.char.level}</h1><p>You gained ${data.n} skill point${data.n > 1 ? 's' : ''}.</p><div class="row" style="justify-content:center"><button class="btn primary" data-action="openpanelreplace" data-panel="skills">Open Skills</button><button class="btn" data-action="close">Later</button></div></div></div>`;

  // ------------------------------------------------------------ HUD
  UI.initHud = function () {
    hudEls = { area: $('hud-area'), obj: $('hud-objective'), log: $('hud-log'), boss: $('hud-boss'), bossName: $('hud-boss').querySelector('.bossname'), bossFill: $('hud-boss').querySelector('.fill'), lifeFill: document.querySelector('.orb.life .fill'), lifeLabel: document.querySelector('.orb.life .label'), fort: document.querySelector('.orb.life .fortify'), resFill: document.querySelector('.orb.res .fill'), resLabel: document.querySelector('.orb.res .label'), skills: $('hud-skills'), potion: $('hud-potion'), evade: $('hud-evade'), mount: $('hud-mount'), portal: $('hud-portal'), xp: $('hud-xp').querySelector('.fill'), buffs: $('hud-buffs'), death: $('hud-death'), deathText: $('hud-death-text') };
    hudEls.skills.innerHTML = [0, 1, 2, 3, 4, 5].map(i => `<div class="skillbtn empty" data-action="skill" data-idx="${i}"><span class="ico"></span><span class="lbl"></span><span class="key">${i + 1}</span><div class="cd"></div></div>`).join('');
    hudEls.skillBtns = Array.from(hudEls.skills.children);
  };
  UI.hud = function (S) {
    if (!hudEls || !S) return; const p = S.player, char = S.char, sctx = S.sctx;
    hudEls.lifeFill.style.height = (p.hp / p.maxHp * 100) + '%'; hudEls.lifeLabel.textContent = U.fmtNum(Math.max(0, p.hp)) + (p.barrier > 0 ? ' +' + U.fmtNum(p.barrier) : ''); hudEls.fort.style.height = (Math.min(1, p.fortify / p.maxHp) * 100) + '%'; hudEls.fort.style.display = p.fortify > 0 ? 'block' : 'none';
    hudEls.resFill.style.height = (p.res / p.maxRes * 100) + '%'; hudEls.resLabel.textContent = Math.round(p.res);
    const bar = char.skills.bar;
    hudEls.skillBtns.forEach((b, i) => {
      const id = bar[i]; const res = id ? sctx.skills[id] : null;
      b.classList.toggle('empty', !res);
      if (!res) { b.querySelector('.ico').textContent = ''; b.querySelector('.lbl').textContent = ''; b.querySelector('.cd').style.height = '0'; return; }
      b.querySelector('.ico').textContent = UI.SKILL_ICONS[res.def.cluster] || '✦'; b.querySelector('.lbl').textContent = res.def.name;
      const cd = p.cds[id] || 0; b.querySelector('.cd').style.height = cd > 0 && res.cd ? (cd / res.cd * 100) + '%' : '0';
      b.classList.toggle('nores', res.cost > 0 && p.res < res.cost && !(p.channel && p.channel.id === id)); b.classList.toggle('active', !!(p.channel && p.channel.id === id)); b.classList.toggle('ult', res.def.cluster === 'ultimate');
    });
    hudEls.potion.querySelector('.count').textContent = p.potions; hudEls.potion.classList.toggle('cd', p.potions <= 0);
    hudEls.evade.querySelector('.count').textContent = p.evadeCharges; hudEls.evade.classList.toggle('cd', p.evadeCharges <= 0);
    hudEls.mount.style.display = S.mode === 'field' ? 'flex' : 'none'; hudEls.mount.classList.toggle('active', p.mounted); hudEls.mount.querySelector('.ico').textContent = p.mounted ? (p.spurs > 0 ? '💨' : '🐎') : '🐎';
    hudEls.portal.classList.toggle('active', p.portal > 0);
    hudEls.xp.style.width = (char.level >= 60 ? char.paragonXp / Stats.paragonXpToNext(char.paragonLevel) : char.xp / Stats.xpToNext(char.level)) * 100 + '%';
    // area/objective
    hudEls.area.textContent = S.area.name + ' · Lv ' + S.level + (S.maxFloors > 1 ? ' · Floor ' + S.floor + '/' + S.maxFloors : '') + (S.area.pit ? ' · Tier ' + S.pitTier : '');
    let obj = '';
    if (S.mode === 'field') obj = 'Explore. Kills: ' + S.kills + ' · Portal home anytime.'; else if (S.mode === 'event') obj = 'Survive: ' + U.fmtTime(S.eventTimer) + ' · Wave ' + S.wave + ' · Kills ' + S.kills; else if (S.mode === 'boss') obj = S.bossKilled ? 'Victory! Collect loot and portal home.' : 'Defeat ' + DATA.bossById[S.area.boss].name; else obj = (S.cleared ? (S.exit ? 'Find the stairs ▼' : S.chest && !S.chest.opened ? 'Open the reward chest' : 'Cleared! Portal home.') : 'Clear the area: ' + Math.max(0, S.quota - S.kills) + ' remaining') + (S.area.pit ? ' · ' + U.fmtTime(Math.max(0, 600 - S.elapsed)) : '');
    hudEls.obj.textContent = obj;
    hudEls.log.innerHTML = S.log.slice(-4).map(l => `<div style="color:${l.color || '#ddd'};opacity:${Math.max(0.3, 1 - (S.t - l.t) / 8)}">${esc(l.msg)}</div>`).join('');
    const boss = S.enemies.find(e => !e.dead && e.elite.rank === 'boss') || S.enemies.find(e => !e.dead && e.elite.rank === 'superunique');
    hudEls.boss.classList.toggle('on', !!boss); if (boss) { hudEls.bossName.textContent = boss.name + (boss.elite.affixes.length ? ' — ' + boss.elite.affixes.map(a => a.name).join(', ') : ''); hudEls.bossFill.style.width = (boss.hp / boss.maxHp * 100) + '%'; }
    const buffs = p.buffs.filter(b => !b.id.startsWith('hot_') && !b.id.startsWith('regen_') && b.id !== 'potion_regen').map(b => (b.res ? b.res.def.name : U.cap(b.id)) + (b.stacks > 1 ? ' ×' + b.stacks : '') + ' ' + Math.ceil(b.dur) + 's');
    if (p.st.berserk) buffs.push('Berserking ' + Math.ceil(p.st.berserk.dur) + 's'); if (p.form) buffs.push(U.cap(p.form)); if (p.unstoppable > 0) buffs.push('Unstoppable');
    Object.keys(p.st).forEach(k => { if (k !== 'berserk') buffs.push('⚠ ' + U.cap(k)); });
    hudEls.buffs.innerHTML = buffs.slice(0, 8).map(b => `<span class="b">${esc(b)}</span>`).join('');
    hudEls.death.classList.toggle('on', p.dead);
    if (p.dead) hudEls.deathText.textContent = S.mode === 'boss' ? 'Reviving restarts the fight.' : S.mode === 'dungeon' || S.mode === 'stronghold' ? 'Revive at the floor entrance. Enemies remain.' : 'Revive where you fell.';
  };

  // ------------------------------------------------------------ actions
  UI.actions = {
    noop() {},
    close() { UI.close(); }, closeall() { UI.closeAll(); },
    openpanel(d) { UI.open(d.panel, d); }, openpanelreplace(d) { const sc = $('modal-box').querySelector('.scroll'); const top = panelStack[panelStack.length - 1]; if (top && top.name === d.panel) { top.data = d; top.scroll = sc ? sc.scrollTop : 0; UI.renderPanel(); } else UI.open(d.panel, d); },
    gomenu() { UI.closeAll(); Game.goMenu(); }, gocreate() { Game.goCreate(); }, gotown() { UI.closeAll(); Game.goTown(); }, gomap() { Game.goMap(); },
    selectchar(d) { Game.selectChar(d.id); }, deletechar(d) { if (confirm('Delete this character permanently?')) Game.deleteChar(d.id); },
    pickclass(d) { createState.cls = d.cls; UI.renderCreate(); }, pickapp(d) { createState[d.k] = d.v; UI.renderCreate(); },
    createchar() { const name = ($('create-name').value || '').trim(); if (!name) { UI.toast('Enter a name', '#f88'); return; } Game.createChar(name, createState.cls, { skin: createState.skin, hair: createState.hair, body: createState.body }); },
    pickzone(d) { UI.mapZone = d.id; UI.renderMap(); }, enterarea(d) { Game.enterArea(d.id); }, travel(d) { Game.goTown(d.town); UI.closeAll(); UI.toast('Traveled to ' + DATA.TOWNS[d.town].name); },
    setdiff(d) { Game.char.difficulty = d.id; UI.toast('Difficulty: ' + DATA.diffById[d.id].name); UI.close(); UI.renderTown(); Game.save(); },
    npc(d) { UI.open('npc', { id: d.id }); },
    heal() { const c = Game.char; Player.usePotionInTown(c); UI.toast('Healed and potions refilled', '#7dff5c'); },
    acceptquest(d) { if (Player.acceptQuest(Game.char, d.id)) { UI.toast('Quest accepted: ' + DATA.questById[d.id].name, '#ffe55c'); UI.refresh(); Game.save(); } },
    turnin(d) { const got = Player.turnIn(Game.char, d.id, Game.account); if (got) { UI.toast('Quest complete! ' + got.join(', '), '#ffe55c'); Game.onQuestsChanged(); UI.refresh(); Game.save(); } },
    collectwhispers() { const r = Player.collectWhispers(Game.char, Game.account); if (r) { UI.toast('+' + r.grim + ' Grim Favor' + (r.got.length ? ' · Cache: ' + r.got.join(', ') : ''), '#b36cff'); UI.refresh(); Game.save(); } },
    rerollwhispers() { Player.generateWhispers(Game.char, Game.char.zone); UI.refresh(); },
    itemdetail(d) { if (!d.id) { UI.toast('Empty slot'); return; } UI.open('itemdetail', { id: d.id, vendor: d.vendor }); },
    equip(d) { const c = Game.char; const it = Player.findItem(c, d.id) || null; if (!it) return; if (Player.equip(c, it, false, d.slot)) { UI.toast('Equipped ' + it.name); UI.close(); UI.refresh(); Game.onGearChanged(); } else UI.toast('Cannot equip', '#f88'); },
    unequip(d) { if (Player.unequip(Game.char, d.slot)) { UI.close(); UI.refresh(); Game.onGearChanged(); } else UI.toast('Inventory full', '#f88'); },
    sell(d) { const c = Game.char; const it = Player.removeItem(c, d.id); if (it) { Player.addMaterial(c, 'gold', it.value); UI.toast('Sold for ' + it.value + ' gold', '#ffd76a'); UI.close(); UI.refresh(); Game.save(); } },
    sellall(d) { const c = Game.char; const rars = d.rar.split(','); let gold = 0, n = 0; c.inventory = c.inventory.filter(it => { if (it.kind !== 'gem' && rars.includes(it.rarity)) { gold += it.value; n++; return false; } return true; }); Player.addMaterial(c, 'gold', gold); UI.toast('Sold ' + n + ' items for ' + gold + ' gold', '#ffd76a'); UI.refresh(); Game.save(); },
    salvage(d) { const c = Game.char; const it = Player.findItem(c, d.id); if (!it) return; Game.salvage(it); UI.close(); UI.refresh(); },
    salvageall(d) { const c = Game.char; const rars = d.rar.split(','); const list = c.inventory.filter(it => it.kind !== 'gem' && rars.includes(it.rarity)); list.forEach(it => Game.salvage(it, true)); UI.toast('Salvaged ' + list.length + ' items'); UI.refresh(); Game.save(); },
    dropitem(d) { const c = Game.char; if (Player.removeItem(c, d.id)) { UI.close(); UI.refresh(); } },
    stashput(d) { const c = Game.char, acc = Game.account; const inStash = acc.stash.find(x => x.id === d.id); if (inStash) { if (!Player.addItem(c, inStash)) { UI.toast('Inventory full', '#f88'); return; } acc.stash.splice(acc.stash.indexOf(inStash), 1); } else { if (acc.stash.length >= Player.STASH_CAP) { UI.toast('Stash full', '#f88'); return; } const it = Player.removeItem(c, d.id); if (it) acc.stash.push(it); } UI.close(); UI.refresh(); Game.save(); },
    sortinv() { const c = Game.char; c.inventory.sort((a, b) => (b.kind === 'gem' ? -1 : DATA.RARITY[b.rarity].order) - (a.kind === 'gem' ? -1 : DATA.RARITY[a.rarity].order) || (b.power || 0) - (a.power || 0)); UI.refresh(); },
    upgrade(d) { const c = Game.char; const it = Player.findItem(c, d.id); const cost = Items.upgradeCost(it); if (Player.pay(c, cost)) { Items.applyUpgrade(it); Player.recompute(c); UI.toast('Upgraded to ' + it.power + ' Item Power', '#ffd76a'); UI.refresh(); Game.save(); } },
    addsocket(d) { const c = Game.char; const it = Player.findItem(c, d.id); const cost = Items.socketCost(it); if (Player.pay(c, cost)) { Items.addSocket(it); UI.toast('Socket added'); UI.refresh(); Game.save(); } },
    socketgem(d) { UI.open('gempick', { id: d.id, idx: d.idx }); },
    socketpick(d) { UI.open('socketpick', { gem: d.id }); },
    socketinto(d) { const c = Game.char; const it = Player.findItem(c, d.id); const gem = Player.findItem(c, d.gem); if (!it || !gem) return; const prev = Items.socketGem(it, +d.idx, gem); Player.removeItem(c, gem.id); if (prev) Player.addItem(c, prev); Player.recompute(c); UI.toast('Socketed ' + gem.name, gem.color); UI.close(); UI.refresh(); Game.onGearChanged(); },
    unsocket(d) { const c = Game.char; const it = Player.findItem(c, d.id); if (!it || !it.gems[+d.idx]) return; if (!Player.pay(c, Items.unsocketCost())) { UI.toast('Not enough gold', '#f88'); return; } const g = it.gems[+d.idx]; it.gems[+d.idx] = null; Player.addItem(c, Items.makeGem(g.gem, g.tier)); Player.recompute(c); UI.refresh(); Game.onGearChanged(); },
    gemup(d) { const c = Game.char; const gems = c.inventory.filter(it => it.kind === 'gem' && it.gem === d.gem && it.tier === d.tier).slice(0, 3); const ti = DATA.GEM_TIERS.findIndex(t => t.id === d.tier); if (gems.length < 3 || ti >= DATA.GEM_TIERS.length - 1) return; if (!Player.pay(c, Items.gemUpgradeCost(ti))) return; gems.forEach(g => Player.removeItem(c, g.id)); const ng = Items.makeGem(d.gem, DATA.GEM_TIERS[ti + 1].id); Player.addItem(c, ng); UI.toast('Crafted ' + ng.name, ng.color); UI.refresh(); Game.save(); },
    craftgem() { const c = Game.char; if (!Player.pay(c, { crude_gem: 10 })) return; const g = Items.makeGem(U.pick(Object.keys(DATA.GEMS)), 'crude'); if (Player.addItem(c, g)) UI.toast('Crafted ' + g.name, g.color); UI.refresh(); },
    imprintpick(d) { UI.open('imprintpick', { id: d.id }); },
    imprint(d) { const c = Game.char; const it = Player.findItem(c, d.id); const cost = Items.imprintCost(it); if (!Player.canAfford(c, cost)) { UI.toast('Cannot afford', '#f88'); return; } if (Items.imprint(it, d.aspect, Game.account.codex[d.aspect])) { Player.pay(c, cost); Player.recompute(c); UI.toast('Imprinted ' + DATA.aspectById[d.aspect].name, '#ff8c1a'); UI.close(); UI.refresh(); Game.onGearChanged(); } else UI.toast('That aspect cannot go on this item', '#f88'); },
    enchant(d) { const c = Game.char; const it = Player.findItem(c, d.id); const cost = Items.enchantCost(it); if (!Player.pay(c, cost)) return; const r = Items.enchant(it, +d.idx, c.cls); Player.recompute(c); if (r) UI.toast('Rerolled → ' + Items.affixName(r.next), '#7dd3ff'); UI.refresh(); Game.onGearChanged(); },
    gamble(d) { const c = Game.char; const cost = Items.gambleCost(d.slot); if (!Player.pay(c, { obols: cost })) return; const it = Items.gamble(c, d.slot); if (!Player.addItem(c, it)) { Game.account.stash.push(it); UI.toast('Inventory full — sent to stash'); } UI.toast('Received ' + it.name, DATA.RARITY[it.rarity].color); UI.refresh(); Game.save(); },
    potionup() { const c = Game.char; const next = DATA.POTION_TIERS.find(t => t.level > (c.potion.tier || 1)); if (!next || c.level < next.level) return; if (!Player.pay(c, { gold: next.level * 150, gallowvine: 5 })) return; c.potion.tier = next.level; Player.recompute(c); c.potion.charges = c.sctx.d.potionCharges; UI.toast('Potion upgraded: ' + next.name, '#7dff5c'); UI.refresh(); Game.save(); },
    elixir(d) { const c = Game.char; const e = DATA.elixirById[d.id]; if (!Player.pay(c, e.cost)) return; Player.drinkElixir(c, d.id); UI.toast('Drank ' + e.name, '#7dff5c'); UI.refresh(); Game.save(); },
    // skills
    alloc(d) { if (Player.alloc(Game.char, d.id)) { UI.refresh(); Game.onGearChanged(); } }, dealloc(d) { if (Player.dealloc(Game.char, d.id)) { UI.refresh(); Game.onGearChanged(); } else UI.toast('Cannot refund: higher clusters depend on these points', '#f88'); },
    upgrade_skill(d) { if (Player.setUpgrade(Game.char, d.id, d.which)) { UI.refresh(); Game.onGearChanged(); } },
    respec() { const c = Game.char; const cost = Player.respecCost(c); if (!confirm('Refund all skill points for ' + U.fmtNum(cost) + ' gold?')) return; if (!Player.pay(c, { gold: cost })) { UI.toast('Not enough gold', '#f88'); return; } Player.respecAll(c); UI.refresh(); Game.onGearChanged(); },
    barslot(d) { UI.open('barpick', { idx: d.idx }); }, setbar(d) { Player.setBar(Game.char, +d.idx, d.id || null); if (panelStack[panelStack.length - 1].name === 'barpick') UI.close(); UI.refresh(); Game.onGearChanged(); },
    setaura(d) { const c = Game.char; c.mechanics.aura = c.mechanics.aura === d.id ? null : d.id; Player.recompute(c); if (Game.state === 'combat') Combat.setAura(c.mechanics.aura); UI.refresh(); Game.save(); },
    bod(d) { const c = Game.char; c.mechanics.bookOfDead[d.k] = { opt: d.opt, upgraded: false }; Player.recompute(c); UI.refresh(); Game.save(); },
    bodupg(d) { const c = Game.char; const need = { skeletal_warriors: 10, skeletal_mages: 20, golem: 30 }[d.k]; if (c.level < need) { UI.toast('Requires level ' + need, '#f88'); return; } c.mechanics.bookOfDead[d.k].upgraded = true; Player.recompute(c); UI.refresh(); Game.save(); },
    technique(d) { const c = Game.char; c.mechanics.technique = d.t; Player.recompute(c); UI.refresh(); Game.save(); },
    unlockboon(d) { const c = Game.char; const m = c.mechanics; if ((m.offerings || 0) <= 0) { UI.toast('No Spirit Offerings. Clear dungeons or strongholds.', '#f88'); return; } m.offerings--; m.unlockedBoons = m.unlockedBoons || []; m.unlockedBoons.push(d.sp + ':' + d.b); UI.refresh(); Game.save(); },
    boon(d) { const c = Game.char; const m = c.mechanics; const cur = m.boons[d.sp]; const list = Array.isArray(cur) ? cur : cur ? [cur] : []; const max = m.bonded === d.sp ? 2 : 1; if (list.includes(d.b)) m.boons[d.sp] = list.filter(x => x !== d.b); else { if (list.length >= max) list.shift(); list.push(d.b); m.boons[d.sp] = list; } Player.recompute(c); UI.refresh(); Game.save(); },
    bond(d) { const c = Game.char; c.mechanics.bonded = d.sp; Object.keys(c.mechanics.boons).forEach(sp => { if (sp !== d.sp) { const l = c.mechanics.boons[sp]; if (Array.isArray(l) && l.length > 1) c.mechanics.boons[sp] = [l[l.length - 1]]; } }); Player.recompute(c); UI.refresh(); Game.save(); },
    // paragon
    paragonalloc(d) { if (Paragon.alloc(Game.char, +d.board, +d.x, +d.y)) { UI.refresh(); Game.onGearChanged(); } },
    attachboard(d) { if (Paragon.attach(Game.char, +d.board, d.side, d.id)) { UI.toast('Board attached: ' + d.id); UI.refresh(); Game.save(); } },
    socketglyph(d) { Paragon.socketGlyph(Game.char, +d.board, d.id || null); UI.refresh(); Game.onGearChanged(); },
    paragonreset() { const c = Game.char; const cost = Paragon.resetCost(c); if (!confirm('Reset all Paragon boards for ' + U.fmtNum(cost) + ' gold?')) return; if (!Player.pay(c, { gold: cost })) { UI.toast('Not enough gold', '#f88'); return; } Paragon.reset(c); UI.refresh(); Game.onGearChanged(); },
    // cosmetics & mounts
    wear(d) { Game.char.cosmetics.equipped[d.slot] = d.id; UI.refresh(); Game.save(); }, buycos(d) { const c = DATA.cosmeticById[d.id]; if (Player.buyCosmetic(Game.account, Game.char, c)) { UI.toast('Unlocked ' + c.name, '#ffd76a'); UI.refresh(); Game.save(); } },
    dye(d) { Game.char.cosmetics.dye = d.id; UI.refresh(); Game.save(); }, buydye(d) { const dy = DATA.DYES.find(x => x.id === d.id); if (Player.pay(Game.char, { gold: dy.unlock.cost })) { Game.account.cosmetics.push('dye:' + dy.id); UI.refresh(); Game.save(); } },
    marker(d) { Game.char.cosmetics.marker = d.id; UI.refresh(); Game.save(); }, buymarker(d) { const m = DATA.MARKERS.find(x => x.id === d.id); if (Player.pay(Game.char, { gold: m.unlock.cost })) { Game.account.cosmetics.push('marker:' + m.id); UI.refresh(); Game.save(); } },
    title(d) { Game.char.cosmetics.title = d.id; UI.refresh(); Game.save(); },
    pickmount(d) { Game.char.mount.current = d.id; UI.refresh(); Game.save(); }, buymount(d) { const m = DATA.mountById[d.id]; if (Player.buyMount(Game.account, Game.char, m)) { UI.toast('Purchased ' + m.name, '#ffd76a'); UI.refresh(); Game.save(); } },
    pickmountarmor(d) { Game.char.mount.armor = d.id; Player.recompute(Game.char); UI.refresh(); Game.save(); }, buymountarmor(d) { const a = DATA.MOUNT_ARMOR.find(x => x.id === d.id); if (Player.pay(Game.char, { gold: a.unlock.cost })) { Game.account.mountArmor.push(a.id); UI.refresh(); Game.save(); } },
    pickmounttrophy(d) { Game.char.mount.trophy = d.id; UI.refresh(); Game.save(); }, buymounttrophy(d) { const a = DATA.MOUNT_TROPHIES.find(x => x.id === d.id); if (Player.pay(Game.char, { gold: a.unlock.cost })) { Game.account.mountTrophies.push(a.id); UI.refresh(); Game.save(); } },
    // saves & settings
    export() { Save.download(Game.account); UI.toast('Save file download started'); }, sharesave() { Save.share(Game.account).then(ok => { if (!ok) { Save.download(Game.account); UI.toast('Sharing unavailable — downloading instead'); } }); },
    exportcode() { const ta = $('save-code'); ta.classList.remove('hidden'); ta.value = Save.exportCode(Game.account); ta.focus(); ta.select(); try { document.execCommand('copy'); UI.toast('Save code copied to clipboard'); } catch (e) { UI.toast('Select all and copy the code'); } },
    importfile() { $('import-file').value = ''; $('import-file').click(); },
    importcode() { const code = $('import-code').value; if (!code.trim()) return; Game.importCode(code); },
    savenow() { Game.save(true); UI.refresh(); },
    toggle(d) { Game.account.settings[d.k] = !Game.account.settings[d.k]; Game.save(); UI.refresh(); },
    clearsave() { if (confirm('Delete ALL saved data on this device? This cannot be undone.')) { Save.clearLocal(); location.reload(); } },
    // combat
    skill(d) { Game.hudSkill(+d.idx); }, evade() { Combat.evade(); }, potion() { Combat.potion(); }, mount() { const S = Combat.state(); if (S && S.player.mounted && S.player.spurs > 0) Combat.spur(); else Combat.toggleMount(); }, portal() { Combat.townPortal(); },
    revive() { Game.revive(); }, leave(d) { UI.closeAll(); Game.leaveCombat(d.how); }
  };
  UI.init = function () {
    document.addEventListener('click', (ev) => {
      const el = ev.target.closest('[data-action]'); if (!el) return;
      const fn = UI.actions[el.dataset.action]; if (!fn) return;
      ev.preventDefault();
      try { fn(el.dataset, el); } catch (e) { console.error(e); UI.toast('Error: ' + e.message, '#f88'); }
    });
    // skill buttons must respond on touchstart for responsiveness (no 300ms delay) — handled via pointer events
    document.addEventListener('touchstart', (ev) => { const el = ev.target.closest('#hud [data-action]'); if (!el) return; ev.preventDefault(); const fn = UI.actions[el.dataset.action]; if (fn) { el._touched = true; fn(el.dataset, el); } }, { passive: false });
    document.addEventListener('click', (ev) => { const el = ev.target.closest('#hud [data-action]'); if (el && el._touched) { el._touched = false; ev.stopImmediatePropagation(); } }, true);
    $('import-file').addEventListener('change', (ev) => { const f = ev.target.files[0]; if (f) Game.importFile(f); });
    UI.initHud();
  };
  window.UI = UI;
})();
