/* Sanctuary — save/load, export/import (global: Save) */
(function () {
  'use strict';
  const Save = {};
  Save.VERSION = 3;
  Save.KEY = 'sanctuary_save_v1';

  Save.newAccount = function () {
    return { version: Save.VERSION, characters: [], stash: [], cosmetics: [], mounts: [], mountArmor: [], mountTrophies: [], codex: {}, settings: { autosave: true, damageNumbers: true, screenShake: true, leftHanded: false, hudScale: 1, quality: 'high', renderer: '3d' }, selected: null, created: Date.now() };
  };

  // Strip runtime-only data before serializing
  Save.serialize = function (account) {
    const copy = { version: Save.VERSION, characters: account.characters.map(stripChar), stash: account.stash, cosmetics: account.cosmetics, mounts: account.mounts, mountArmor: account.mountArmor, mountTrophies: account.mountTrophies, codex: account.codex, settings: account.settings, selected: account.selected, created: account.created, exported: Date.now() };
    return JSON.stringify(copy);
  };
  function stripChar(c) { const o = Object.assign({}, c); delete o.sctx; return o; }

  Save.migrate = function (data) {
    if (!data || typeof data !== 'object') throw new Error('Invalid save data');
    if (!Array.isArray(data.characters)) throw new Error('Save has no characters list');
    const acc = Object.assign(Save.newAccount(), data);
    acc.settings = Object.assign(Save.newAccount().settings, data.settings || {});
    acc.characters = acc.characters.map(c => Save.migrateChar(c));
    acc.version = Save.VERSION;
    return acc;
  };
  Save.migrateChar = function (c) {
    const fresh = Player.create('x', DATA.classes[c.cls] ? c.cls : 'barbarian', c.appearance);
    const out = Object.assign({}, fresh, c);
    // deep-default nested objects
    out.skills = Object.assign({}, fresh.skills, c.skills || {}); if (!Array.isArray(out.skills.bar) || out.skills.bar.length !== 6) out.skills.bar = (out.skills.bar || []).concat([null, null, null, null, null, null]).slice(0, 6);
    out.mechanics = Object.assign({}, fresh.mechanics, c.mechanics || {});
    out.paragon = Object.assign({}, fresh.paragon, c.paragon || {});
    out.quests = Object.assign({}, fresh.quests, c.quests || {}); out.quests.whispers = Object.assign({}, fresh.quests.whispers, (c.quests || {}).whispers || {});
    out.cosmetics = Object.assign({}, fresh.cosmetics, c.cosmetics || {}); out.cosmetics.equipped = Object.assign({}, (c.cosmetics || {}).equipped || {});
    out.mount = Object.assign({}, fresh.mount, c.mount || {});
    out.unlocks = Object.assign({}, fresh.unlocks, c.unlocks || {});
    out.record = Object.assign({}, fresh.record, c.record || {});
    out.materials = Object.assign({}, fresh.materials, c.materials || {});
    out.potion = Object.assign({}, fresh.potion, c.potion || {});
    out.equipment = c.equipment || {};
    out.inventory = Array.isArray(c.inventory) ? c.inventory : [];
    // sanitize numbers
    out.level = U.clamp(Math.floor(out.level) || 1, 1, DATA.MAX_LEVEL); out.xp = Math.max(0, out.xp || 0);
    out.paragonLevel = U.clamp(Math.floor(out.paragonLevel) || 0, 0, DATA.MAX_PARAGON);
    if (!DATA.diffById[out.difficulty]) out.difficulty = 'normal';
    if (!DATA.TOWNS[out.town]) out.town = 'kyovashad';
    // remove skills that no longer exist
    Object.keys(out.skills.alloc).forEach(id => { if (!DATA.skillById[id] || DATA.skillById[id].cls !== out.cls) delete out.skills.alloc[id]; });
    Object.keys(out.skills.upgrades).forEach(id => { if (!out.skills.alloc[id]) delete out.skills.upgrades[id]; });
    out.skills.bar = out.skills.bar.map(id => id && out.skills.alloc[id] ? id : null);
    // items: drop unknown aspects/uniques
    const fixItem = (it) => { if (!it) return null; if (it.kind === 'gem') return DATA.GEMS[it.gem] ? it : null; if (it.aspect && !DATA.aspectById[it.aspect.id]) delete it.aspect; if (it.unique && !DATA.uniqueById[it.unique]) { it.unique = null; it.rarity = 'legendary'; } if (!DATA.RARITY[it.rarity]) it.rarity = 'rare'; it.affixes = (it.affixes || []).filter(a => a && typeof a.v === 'number'); it.gems = it.gems || []; it.inherent = it.inherent || []; return it; };
    Object.keys(out.equipment).forEach(k => { out.equipment[k] = fixItem(out.equipment[k]); if (out.equipment[k] && !Items.equipSlotsFor(out.equipment[k], out.cls).includes(k)) { out.inventory.push(out.equipment[k]); out.equipment[k] = null; } });
    out.inventory = out.inventory.map(fixItem).filter(Boolean);
    Paragon.init(out);
    out.paragon.boards = out.paragon.boards.filter(b => Paragon.boardDefs(out.cls).some(d => d.id === b.board));
    if (!out.paragon.boards.length) Paragon.init(out);
    delete out.sctx;
    return out;
  };

  Save.toLocal = function (account) { try { localStorage.setItem(Save.KEY, Save.serialize(account)); return true; } catch (e) { console.warn('localStorage save failed', e); return false; } };
  Save.fromLocal = function () { try { const raw = localStorage.getItem(Save.KEY); if (!raw) return null; return Save.migrate(JSON.parse(raw)); } catch (e) { console.warn('localStorage load failed', e); return null; } };
  Save.clearLocal = function () { try { localStorage.removeItem(Save.KEY); } catch (e) { } };

  Save.exportCode = (account) => 'SANC1.' + U.b64enc(Save.serialize(account));
  Save.importCode = function (code) {
    code = (code || '').trim();
    let json;
    if (code.startsWith('SANC1.')) json = U.b64dec(code.slice(6));
    else if (code.startsWith('{')) json = code;
    else json = U.b64dec(code);
    return Save.migrate(JSON.parse(json));
  };
  Save.fileName = (account) => { const d = new Date(); const pad = (n) => (n < 10 ? '0' : '') + n; return 'sanctuary-save-' + d.getFullYear() + pad(d.getMonth() + 1) + pad(d.getDate()) + '-' + pad(d.getHours()) + pad(d.getMinutes()) + '.json'; };
  // Download as a file (works on iPadOS 13+ Safari: offers "Download" / share sheet)
  Save.download = function (account) {
    const blob = new Blob([Save.serialize(account)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = Save.fileName(account); a.style.display = 'none';
    document.body.appendChild(a); a.click();
    setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url); }, 2000);
  };
  Save.share = async function (account) {
    if (!navigator.share) return false;
    try { const file = new File([Save.serialize(account)], Save.fileName(account), { type: 'application/json' }); if (navigator.canShare && !navigator.canShare({ files: [file] })) return false; await navigator.share({ files: [file], title: 'Sanctuary save' }); return true; } catch (e) { return false; }
  };
  Save.readFile = function (file) {
    return new Promise((resolve, reject) => { const r = new FileReader(); r.onload = () => { try { resolve(Save.importCode(String(r.result))); } catch (e) { reject(e); } }; r.onerror = () => reject(new Error('Could not read file')); r.readAsText(file); });
  };
  window.Save = Save;
})();
