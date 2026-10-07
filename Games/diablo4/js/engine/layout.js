/* Sanctuary — map layout generator (global: Layout). Produces collision obstacles (circles + rectangles) and
   visual props/lights for each run mode: open fields, dungeons with rooms and corridors, cellars, strongholds,
   boss arenas and village sieges. Pure data; rendered by render3d.js (and minimally by render.js). */
(function () {
  'use strict';
  const Layout = {};

  // obstacle: circle {x,y,r,kind,seed} or rect {rect:true,x,y,hw,hh,kind,rot?}
  const circ = (x, y, r, kind, seed) => ({ x, y, r, kind, seed: seed || 0 });
  const rect = (x, y, hw, hh, kind) => ({ rect: true, x, y, hw, hh, kind });
  const prop = (kind, x, y, rot, s, extra) => Object.assign({ kind, x, y, rot: rot || 0, s: s || 1 }, extra || {});

  Layout.build = function (S, rng) {
    const out = { obstacles: [], props: [], lights: [], decor: [], decals: [], floor: 'ground', ambient: null, paths: [] };
    const d = S.zone.decor;
    out.ambient = d === 'snow' ? 'snow' : d === 'forest' ? 'leaves' : d === 'jungle' || d === 'swamp' ? 'fireflies' : 'dust';
    const mode = S.mode;
    if (mode === 'dungeon') { if (S.area.pit) buildPit(S, rng, out); else buildDungeon(S, rng, out); }
    else if (mode === 'cellar') buildCellar(S, rng, out);
    else if (mode === 'boss') buildArena(S, rng, out);
    else if (mode === 'stronghold') buildStronghold(S, rng, out);
    else if (mode === 'event') buildVillage(S, rng, out);
    else buildField(S, rng, out);
    // decor sprinkles everywhere (grass/pebbles)
    for (let i = 0; i < 160; i++) out.decor.push({ x: rng() * S.w, y: rng() * S.h, k: Math.floor(rng() * 4), s: 0.2 + rng() * 0.5 });
    // keep spawn area clear
    const px = S.w / 2, py = S.h - 6;
    out.obstacles = out.obstacles.filter(o => !(o.rect ? (Math.abs(o.x - px) < o.hw + 2.5 && Math.abs(o.y - py) < o.hh + 2.5) : U.dist(o.x, o.y, px, py) < o.r + 2.5));
    return out;
  };

  // --------------------------------------------------------------- helpers
  function free(out, x, y, pad) { return !out.obstacles.some(o => o.rect ? (Math.abs(o.x - x) < o.hw + pad && Math.abs(o.y - y) < o.hh + pad) : U.dist(o.x, o.y, x, y) < o.r + pad); }
  function scatter(out, rng, S, n, fn, pad, margin) {
    for (let i = 0, tries = 0; i < n && tries < n * 8; tries++) { const x = (margin || 2) + rng() * (S.w - 2 * (margin || 2)), y = (margin || 2) + rng() * (S.h - 2 * (margin || 2)); if (!free(out, x, y, pad || 1.2)) continue; if (U.dist(x, y, S.w / 2, S.h - 6) < 5) continue; fn(x, y); i++; }
  }
  function wallLine(out, x1, y1, x2, y2, thick, kind) {
    const hx = Math.abs(x2 - x1) / 2, hy = Math.abs(y2 - y1) / 2;
    out.obstacles.push(rect((x1 + x2) / 2, (y1 + y2) / 2, Math.max(hx, thick / 2), Math.max(hy, thick / 2), kind || 'wall'));
  }
  function torch(out, x, y, rot) { out.props.push(prop('torch', x, y, rot)); out.lights.push({ x, y, h: 1.6, color: '#ffa040', intensity: 1.4, dist: 7, flicker: true }); }
  function brazier(out, x, y) { out.props.push(prop('brazier', x, y)); out.lights.push({ x, y, h: 1.2, color: '#ff8030', intensity: 1.8, dist: 8, flicker: true }); }
  function campfire(out, x, y) { out.props.push(prop('campfire', x, y)); out.lights.push({ x, y, h: 0.6, color: '#ffa040', intensity: 1.6, dist: 7, flicker: true }); }

  // --------------------------------------------------------------- open world
  function buildField(S, rng, out) {
    const d = S.zone.decor;
    out.floor = 'ground';
    // winding path decal
    let x = rng() * S.w, y = 0; const pts = []; while (y < S.h) { pts.push([x, y]); y += 3; x = U.clamp(x + (rng() - 0.5) * 5, 3, S.w - 3); } out.paths.push(pts);
    // tree clusters
    const clusters = Math.round(S.w * S.h / 180);
    for (let c = 0; c < clusters; c++) {
      const cx = 3 + rng() * (S.w - 6), cy = 3 + rng() * (S.h - 6); const n = 2 + Math.floor(rng() * 4);
      for (let i = 0; i < n; i++) { const tx = U.clamp(cx + (rng() - 0.5) * 6, 2, S.w - 2), ty = U.clamp(cy + (rng() - 0.5) * 6, 2, S.h - 2); if (!free(out, tx, ty, 1.0)) continue; const kind = d === 'desert' || d === 'salt' ? (rng() < 0.5 ? 'cactus' : 'rock') : d === 'jungle' ? (rng() < 0.6 ? 'palm' : 'tree') : 'tree'; out.obstacles.push(circ(tx, ty, kind === 'cactus' ? 0.5 : 0.7 + rng() * 0.9, kind, rng())); }
    }
    scatter(out, rng, S, Math.round(S.w / 6), (x, y) => out.obstacles.push(circ(x, y, 0.6 + rng() * 1.0, 'rock', rng())), 1.2);
    // ruins: pairs of broken walls + pillars
    for (let i = 0; i < 3; i++) { const cx = 5 + rng() * (S.w - 10), cy = 5 + rng() * (S.h - 10); if (!free(out, cx, cy, 4)) continue; const horiz = rng() < 0.5; wallLine(out, cx - (horiz ? 3 : 0.4), cy - (horiz ? 0.4 : 3), cx + (horiz ? 3 : 0.4), cy + (horiz ? 0.4 : 3), 0.8, 'ruin'); out.obstacles.push(circ(cx + (horiz ? 4 : 0), cy + (horiz ? 0 : 4), 0.6, 'pillar', rng())); out.obstacles.push(circ(cx - (horiz ? 4 : 0), cy - (horiz ? 0 : 4), 0.6, 'pillar', rng())); out.props.push(prop('rubble', cx + 1.5, cy + 1.5, rng() * 6)); }
    // props
    const zoneProps = d === 'snow' ? ['gravestone', 'gravestone', 'log', 'stump', 'barrel', 'cart', 'bonepile'] : d === 'forest' ? ['log', 'stump', 'mushroom', 'mushroom', 'gravestone', 'cart', 'barrel'] : d === 'salt' ? ['bonepile', 'bonepile', 'cart', 'barrel', 'tent', 'log'] : d === 'swamp' ? ['mushroom', 'mushroom', 'log', 'bonepile', 'puddle', 'puddle', 'gravestone'] : d === 'desert' ? ['bonepile', 'cart', 'barrel', 'tent', 'rubble', 'obelisk'] : ['mushroom', 'log', 'stump', 'obelisk', 'bonepile', 'puddle'];
    scatter(out, rng, S, Math.round(S.w / 2.5), (x, y) => { const k = zoneProps[Math.floor(rng() * zoneProps.length)]; if (k === 'puddle') { out.decals.push({ kind: 'puddle', x, y, r: 1.2 + rng() * 1.2 }); return; } if (k === 'cart' || k === 'tent') out.obstacles.push(circ(x, y, k === 'cart' ? 1.0 : 1.4, k, rng())); else if (k === 'barrel') { out.obstacles.push(circ(x, y, 0.45, 'barrel', rng())); if (rng() < 0.6) out.obstacles.push(circ(x + 0.9, y + 0.2, 0.45, 'barrel', rng())); } else out.props.push(prop(k, x, y, rng() * 6, 0.8 + rng() * 0.5)); }, 1.4);
    // camps with fire
    for (let i = 0; i < 2; i++) { const cx = 6 + rng() * (S.w - 12), cy = 6 + rng() * (S.h - 12); if (!free(out, cx, cy, 3)) continue; campfire(out, cx, cy); out.obstacles.push(circ(cx + 2.2, cy, 1.4, 'tent', rng())); out.props.push(prop('log', cx - 1.8, cy + 0.6, 0.3)); }
    // fences
    for (let i = 0; i < 3; i++) { const fx = 4 + rng() * (S.w - 8), fy = 4 + rng() * (S.h - 8); const len = 3 + rng() * 4; const horiz = rng() < 0.5; if (!free(out, fx, fy, len / 2 + 1)) continue; wallLine(out, fx - (horiz ? len / 2 : 0.15), fy - (horiz ? 0.15 : len / 2), fx + (horiz ? len / 2 : 0.15), fy + (horiz ? 0.15 : len / 2), 0.3, 'fence'); }
  }

  // --------------------------------------------------------------- dungeon: rooms & corridors
  function buildDungeon(S, rng, out) {
    out.floor = 'stone'; out.ambient = 'dust';
    const cols = 3, rows = 3; const cw = S.w / cols, ch = S.h / rows; const T = 0.7;
    // interior walls between cells with door gaps; randomly remove some walls to form halls
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
      const x0 = c * cw, y0 = r * ch;
      if (c < cols - 1 && rng() < 0.8) { const x = x0 + cw; const gap = y0 + ch * (0.3 + rng() * 0.4); wallLine(out, x, y0 + 0.4, x, gap - 1.6, T, 'wall'); wallLine(out, x, gap + 1.6, x, y0 + ch - 0.4, T, 'wall'); torch(out, x - 0.5, gap - 2.0, 0); torch(out, x + 0.5, gap + 2.0, Math.PI); }
      if (r < rows - 1 && rng() < 0.8) { const y = y0 + ch; const gap = x0 + cw * (0.3 + rng() * 0.4); wallLine(out, x0 + 0.4, y, gap - 1.6, y, T, 'wall'); wallLine(out, gap + 1.6, y, x0 + cw - 0.4, y, T, 'wall'); torch(out, gap - 2.0, y - 0.5, Math.PI / 2); torch(out, gap + 2.0, y + 0.5, -Math.PI / 2); }
      // room contents
      const cx = x0 + cw / 2, cy = y0 + ch / 2;
      const kind = rng();
      if (kind < 0.3) { [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sy]) => out.obstacles.push(circ(cx + sx * cw * 0.28, cy + sy * ch * 0.28, 0.55, 'pillar', rng()))); }
      else if (kind < 0.55) { out.obstacles.push(rect(cx, cy, 1.1, 0.6, 'sarcophagus')); out.props.push(prop('candles', cx + 1.8, cy, 0)); out.props.push(prop('candles', cx - 1.8, cy, 0)); }
      else if (kind < 0.75) { for (let i = 0; i < 3; i++) out.obstacles.push(circ(cx + (rng() - 0.5) * 4, cy + (rng() - 0.5) * 4, 0.45, 'barrel', rng())); out.props.push(prop('crate', cx + 2, cy - 2, rng())); }
      else { brazier(out, cx, cy); }
      for (let i = 0; i < 2; i++) out.props.push(prop(rng() < 0.5 ? 'bonepile' : 'rubble', x0 + 1 + rng() * (cw - 2), y0 + 1 + rng() * (ch - 2), rng() * 6, 0.8));
      if (rng() < 0.5) out.props.push(prop('cobweb', x0 + 0.6, y0 + 0.6, 0));
      if (rng() < 0.4) out.decals.push({ kind: 'blood', x: x0 + 1 + rng() * (cw - 2), y: y0 + 1 + rng() * (ch - 2), r: 0.8 + rng() * 0.8 });
      if (rng() < 0.4) out.props.push(prop('chains', x0 + cw - 0.8, y0 + 1 + rng() * (ch - 2), 0));
    }
    // outer pillars along the border for look
    for (let i = 1; i < 6; i++) { out.props.push(prop('wallsconce', i * S.w / 6, 0.5, 0)); }
  }
  function buildPit(S, rng, out) { buildDungeon(S, rng, out); out.ambient = 'embers'; out.floor = 'stone'; for (let i = 0; i < 6; i++) out.decals.push({ kind: 'lava', x: 3 + rng() * (S.w - 6), y: 3 + rng() * (S.h - 6), r: 1.5 + rng() * 1.5 }); }
  function buildCellar(S, rng, out) {
    out.floor = 'stone'; out.ambient = 'dust';
    [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sy]) => out.obstacles.push(circ(S.w / 2 + sx * 7, S.h / 2 + sy * 7, 0.6, 'pillar', rng())));
    for (let i = 0; i < 8; i++) { const x = 3 + rng() * (S.w - 6), y = 3 + rng() * (S.h - 6); if (!free(out, x, y, 1.2)) continue; out.obstacles.push(circ(x, y, 0.45, 'barrel', rng())); }
    for (let i = 0; i < 5; i++) out.props.push(prop('crate', 3 + rng() * (S.w - 6), 3 + rng() * (S.h - 6), rng()));
    for (let i = 0; i < 3; i++) out.props.push(prop('bonepile', 3 + rng() * (S.w - 6), 3 + rng() * (S.h - 6), rng() * 6));
    wallLine(out, S.w * 0.35, S.h * 0.5, S.w * 0.65, S.h * 0.5, 0.7, 'wall'); torch(out, S.w * 0.35 - 1, S.h * 0.5, 0); torch(out, S.w * 0.65 + 1, S.h * 0.5, Math.PI);
    out.props.push(prop('wallsconce', S.w / 2, 0.5, 0)); brazier(out, S.w / 2, 4);
  }
  // --------------------------------------------------------------- boss arena
  function buildArena(S, rng, out) {
    out.floor = 'arena'; out.ambient = 'embers';
    const cx = S.w / 2, cy = S.h / 2, R = Math.min(S.w, S.h) / 2 - 2;
    for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; out.obstacles.push(circ(cx + Math.cos(a) * R, cy + Math.sin(a) * R, 0.7, 'pillar', rng())); }
    for (let i = 0; i < 4; i++) { const a = i / 4 * Math.PI * 2 + Math.PI / 4; brazier(out, cx + Math.cos(a) * (R - 3), cy + Math.sin(a) * (R - 3)); }
    out.decals.push({ kind: 'rune', x: cx, y: cy, r: R - 4 });
    for (let i = 0; i < 5; i++) out.decals.push({ kind: 'blood', x: cx + (rng() - 0.5) * R, y: cy + (rng() - 0.5) * R, r: 0.8 + rng() * 1.0 });
    for (let i = 0; i < 6; i++) out.props.push(prop('bonepile', cx + (rng() - 0.5) * R * 1.4, cy + (rng() - 0.5) * R * 1.4, rng() * 6, 1));
    out.props.push(prop('banner', cx - R, cy - R, 0)); out.props.push(prop('banner', cx + R, cy - R, 0));
  }
  // --------------------------------------------------------------- stronghold: ruined fort
  function buildStronghold(S, rng, out) {
    out.floor = 'ground'; out.ambient = out.ambient === 'snow' ? 'snow' : 'embers';
    const m = 6; // inner keep walls with gaps
    wallLine(out, m, m, S.w - m, m, 1.0, 'wall'); wallLine(out, m, S.h - m, S.w / 2 - 3, S.h - m, 1.0, 'wall'); wallLine(out, S.w / 2 + 3, S.h - m, S.w - m, S.h - m, 1.0, 'wall');
    wallLine(out, m, m, m, S.h / 2 - 3, 1.0, 'wall'); wallLine(out, m, S.h / 2 + 3, m, S.h - m, 1.0, 'wall'); wallLine(out, S.w - m, m, S.w - m, S.h / 2 - 3, 1.0, 'wall'); wallLine(out, S.w - m, S.h / 2 + 3, S.w - m, S.h - m, 1.0, 'wall');
    [[m, m], [S.w - m, m], [m, S.h - m], [S.w - m, S.h - m]].forEach(([x, y]) => { out.obstacles.push(circ(x, y, 1.4, 'tower', rng())); torch(out, x + 1.6, y + 1.6, 0); });
    // inner ruined buildings
    for (let i = 0; i < 4; i++) { const bx = m + 6 + rng() * (S.w - 2 * m - 12), by = m + 6 + rng() * (S.h - 2 * m - 12); if (!free(out, bx, by, 5)) continue; wallLine(out, bx - 3, by - 2.5, bx + 3, by - 2.5, 0.7, 'ruin'); wallLine(out, bx - 3, by - 2.5, bx - 3, by + 2.5, 0.7, 'ruin'); out.props.push(prop('rubble', bx + 1, by + 1, rng() * 6)); out.props.push(prop('crate', bx + 2, by, rng())); }
    brazier(out, S.w / 2, S.h / 2); out.props.push(prop('banner', S.w / 2 - 3, S.h / 2, 0)); out.props.push(prop('banner', S.w / 2 + 3, S.h / 2, 0));
    scatter(out, rng, S, 10, (x, y) => out.props.push(prop(rng() < 0.5 ? 'bonepile' : 'rubble', x, y, rng() * 6)), 1.5);
    for (let i = 0; i < 6; i++) out.decals.push({ kind: 'blood', x: 3 + rng() * (S.w - 6), y: 3 + rng() * (S.h - 6), r: 0.8 + rng() * 1.0 });
    scatter(out, rng, S, 6, (x, y) => out.obstacles.push(circ(x, y, 0.45, 'barrel', rng())), 1.2, m + 1);
  }
  // --------------------------------------------------------------- village siege
  function buildVillage(S, rng, out) {
    out.floor = 'ground';
    for (let i = 0; i < 6; i++) { const hx = 5 + rng() * (S.w - 10), hy = 5 + rng() * (S.h - 16); if (!free(out, hx, hy, 4.5)) continue; out.obstacles.push(rect(hx, hy, 2.4, 2.0, 'hut')); torch(out, hx + 2.9, hy + 2.3, 0); }
    for (let i = 0; i < 5; i++) { const fx = 4 + rng() * (S.w - 8), fy = 4 + rng() * (S.h - 8); const len = 3 + rng() * 3; const horiz = rng() < 0.5; if (!free(out, fx, fy, len / 2 + 1)) continue; wallLine(out, fx - (horiz ? len / 2 : 0.15), fy - (horiz ? 0.15 : len / 2), fx + (horiz ? len / 2 : 0.15), fy + (horiz ? 0.15 : len / 2), 0.3, 'fence'); }
    scatter(out, rng, S, 6, (x, y) => out.obstacles.push(circ(x, y, 1.0, 'cart', rng())), 1.5);
    scatter(out, rng, S, 8, (x, y) => out.obstacles.push(circ(x, y, 0.45, 'barrel', rng())), 1.2);
    scatter(out, rng, S, 4, (x, y) => out.obstacles.push(circ(x, y, 1.2, 'barricade', rng())), 1.8);
    campfire(out, S.w / 2, S.h - 10); out.props.push(prop('well', S.w / 2 + 4, S.h / 2, 0)); out.obstacles.push(circ(S.w / 2 + 4, S.h / 2, 0.9, 'well', 0));
    out.props.push(prop('banner', S.w / 2 - 3, S.h - 8, 0));
  }

  // collision helper used by combat
  Layout.collide = function (obstacles, ent, skipKinds) {
    for (const o of obstacles) {
      if (o.rect) {
        const dx = Math.max(Math.abs(ent.x - o.x) - o.hw, 0), dy = Math.max(Math.abs(ent.y - o.y) - o.hh, 0);
        const pad = ent.r * 0.8;
        if (dx * dx + dy * dy < pad * pad) {
          // push out along the axis of least penetration
          const px = o.hw + pad - Math.abs(ent.x - o.x), py = o.hh + pad - Math.abs(ent.y - o.y);
          if (px < py) ent.x += (ent.x >= o.x ? px : -px); else ent.y += (ent.y >= o.y ? py : -py);
          ent.blocked = true;
        }
      } else {
        const d = U.dist(ent.x, ent.y, o.x, o.y); const min = o.r + ent.r * 0.8;
        if (d < min && d > 0.0001) { const k = (min - d) / d; ent.x += (ent.x - o.x) * k; ent.y += (ent.y - o.y) * k; ent.blocked = true; }
      }
    }
  };
  Layout.blockedAt = function (obstacles, x, y, pad) { return obstacles.some(o => o.rect ? (Math.abs(o.x - x) < o.hw + pad && Math.abs(o.y - y) < o.hh + pad) : U.dist(o.x, o.y, x, y) < o.r + pad); };
  Layout.pointInside = function (obstacles, x, y) { return obstacles.some(o => o.rect ? (Math.abs(o.x - x) < o.hw && Math.abs(o.y - y) < o.hh) : U.dist(o.x, o.y, x, y) < o.r); };

  window.Layout = Layout;
})();
