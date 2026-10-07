/* Sanctuary — canvas renderer + input (global: Render, Input) */
(function () {
  'use strict';
  const Render = {};
  let canvas, ctx, W = 0, H = 0, dpr = 1, scale = 40, camX = 0, camY = 0;
  const SHAPES = {};

  Render.init = function (c) {
    canvas = c; ctx = c.getContext('2d');
    Render.resize();
    window.addEventListener('resize', Render.resize);
  };
  Render.resize = function () {
    if (!canvas) return;
    dpr = Math.min(2, window.devicePixelRatio || 1);
    const rect = canvas.getBoundingClientRect();
    W = Math.max(1, Math.floor(rect.width)); H = Math.max(1, Math.floor(rect.height));
    canvas.width = Math.floor(W * dpr); canvas.height = Math.floor(H * dpr);
    scale = Math.max(26, Math.min(56, H / 17));
  };
  Render.worldToScreen = (x, y) => ({ x: (x - camX) * scale + W / 2, y: (y - camY) * scale + H / 2 });
  Render.screenToWorld = (sx, sy) => ({ x: (sx - W / 2) / scale + camX, y: (sy - H / 2) / scale + camY });

  function ellipseShadow(x, y, r) { ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.beginPath(); ctx.ellipse(x, y + r * 0.6, r * 1.1, r * 0.45, 0, 0, Math.PI * 2); ctx.fill(); }

  // ------------------------------------------------------------- main draw
  let frameNo = 0;
  Render.draw = function (S, hud) {
    if (!S || !ctx) return;
    if ((frameNo++ % 15) === 0) { const rect = canvas.getBoundingClientRect(); if (Math.floor(rect.width) !== W || Math.floor(rect.height) !== H) Render.resize(); }
    const p = S.player;
    camX += (p.x - camX) * 0.18; camY += (p.y - camY) * 0.18;
    if (S.shake > 0) { camX += (Math.random() - 0.5) * S.shake * 0.4; camY += (Math.random() - 0.5) * S.shake * 0.4; }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    // ground
    drawGround(S);
    const view = { x0: camX - W / 2 / scale - 2, y0: camY - H / 2 / scale - 2, x1: camX + W / 2 / scale + 2, y1: camY + H / 2 / scale + 2 };
    const vis = (e) => e.x > view.x0 && e.x < view.x1 && e.y > view.y0 && e.y < view.y1;
    // zones
    for (const z of S.zones) drawZone(z, S);
    for (const c of S.corpses) if (vis(c)) drawCorpse(c);
    for (const w of S.walls) if (vis(w)) drawWall(w);
    for (const d of S.drops) if (!d.taken && vis(d)) drawDrop(d, S);
    for (const o of S.orbs) if (vis(o)) drawOrb(o);
    if (S.exit) drawExit(S.exit);
    if (S.chest) drawChest(S.chest);
    // telegraphs (enemy)
    for (const e of S.enemies) if (!e.dead && e.ai.telegraph && vis(e)) drawTelegraph(e);
    // entities sorted by y
    const ents = [];
    for (const e of S.enemies) if (vis(e)) ents.push(e);
    for (const m of S.minions) if (!m.dead && vis(m)) ents.push(m);
    ents.push(p);
    ents.sort((a, b) => a.y - b.y);
    for (const e of ents) { if (e.kind === 'enemy') drawEnemy(e, S); else if (e.kind === 'minion') drawMinion(e, S); else drawPlayer(p, S); }
    for (const b of S.beams) drawBeam(b);
    for (const pr of S.projectiles) if (vis(pr)) drawProjectile(pr);
    for (const pt of S.particles) { const s = Render.worldToScreen(pt.x, pt.y); ctx.globalAlpha = Math.max(0, 1 - pt.t / pt.life); ctx.fillStyle = pt.color; ctx.beginPath(); ctx.arc(s.x, s.y, pt.size * scale, 0, Math.PI * 2); ctx.fill(); }
    ctx.globalAlpha = 1;
    for (const t of S.texts) drawText(t);
    if (p.portal > 0) { const s = Render.worldToScreen(p.x, p.y); ctx.strokeStyle = '#6f8cff'; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(s.x, s.y, scale * 1.4, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * (1 - p.portal / 3)); ctx.stroke(); }
    drawMinimap(S);
    if (hud && hud.joystick) drawJoystick(hud.joystick);
    // vignette when hurt
    if (p.hp < p.maxHp * 0.3 && !p.dead) { const g = ctx.createRadialGradient(W / 2, H / 2, H * 0.3, W / 2, H / 2, H * 0.8); g.addColorStop(0, 'rgba(120,0,0,0)'); g.addColorStop(1, 'rgba(120,0,0,' + (0.5 * (1 - p.hp / (p.maxHp * 0.3))) + ')'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); }
  };

  function drawGround(S) {
    const z = S.zone;
    ctx.fillStyle = z.ground; ctx.fillRect(0, 0, W, H);
    // bounds / outside area
    const tl = Render.worldToScreen(0, 0), br = Render.worldToScreen(S.w, S.h);
    ctx.fillStyle = z.ground2; ctx.fillRect(tl.x, tl.y, br.x - tl.x, br.y - tl.y);
    // checker tint
    const step = 4; const x0 = Math.floor(Math.max(0, camX - W / 2 / scale) / step) * step, y0 = Math.floor(Math.max(0, camY - H / 2 / scale) / step) * step;
    ctx.fillStyle = 'rgba(0,0,0,0.07)';
    for (let gx = x0; gx < Math.min(S.w, camX + W / 2 / scale + step); gx += step) for (let gy = y0; gy < Math.min(S.h, camY + H / 2 / scale + step); gy += step) { if (((gx + gy) / step) % 2 === 0) { const a = Render.worldToScreen(gx, gy); ctx.fillRect(a.x, a.y, Math.min(step, S.w - gx) * scale, Math.min(step, S.h - gy) * scale); } }
    // decor
    const col = z.decor === 'snow' ? 'rgba(255,255,255,0.25)' : z.decor === 'desert' ? 'rgba(255,220,160,0.18)' : z.decor === 'swamp' ? 'rgba(90,140,80,0.3)' : z.decor === 'salt' ? 'rgba(230,220,200,0.2)' : 'rgba(120,180,90,0.22)';
    ctx.fillStyle = col;
    for (const d of S.decor) { if (d.x < camX - W / 2 / scale - 1 || d.x > camX + W / 2 / scale + 1 || d.y < camY - H / 2 / scale - 1 || d.y > camY + H / 2 / scale + 1) continue; const s = Render.worldToScreen(d.x, d.y); if (d.k === 0) ctx.fillRect(s.x, s.y, d.s * scale * 0.6, d.s * scale * 0.25); else if (d.k === 1) { ctx.beginPath(); ctx.arc(s.x, s.y, d.s * scale * 0.2, 0, Math.PI * 2); ctx.fill(); } else if (d.k === 2) { ctx.fillRect(s.x, s.y, d.s * scale * 0.2, d.s * scale * 0.6); } else { ctx.beginPath(); ctx.moveTo(s.x, s.y); ctx.lineTo(s.x + d.s * scale * 0.4, s.y + d.s * scale * 0.2); ctx.lineTo(s.x, s.y + d.s * scale * 0.4); ctx.fill(); } }
    // obstacles
    for (const o of S.obstacles) {
      if (o.rect) { const a = Render.worldToScreen(o.x - o.hw, o.y - o.hh); ctx.fillStyle = '#4a4a52'; ctx.fillRect(a.x, a.y, o.hw * 2 * scale, o.hh * 2 * scale); continue; }
      if (o.x < camX - W / 2 / scale - 3 || o.x > camX + W / 2 / scale + 3 || o.y < camY - H / 2 / scale - 3 || o.y > camY + H / 2 / scale + 3) continue;
      const s = Render.worldToScreen(o.x, o.y); const r = o.r * scale;
      ellipseShadow(s.x, s.y, r);
      if (o.kind === 'tree') { ctx.fillStyle = '#3a2a18'; ctx.fillRect(s.x - r * 0.15, s.y - r * 0.2, r * 0.3, r * 0.9); ctx.fillStyle = z.decor === 'snow' ? '#5a7a66' : z.decor === 'desert' ? '#6a7a3a' : '#2f5a30'; ctx.beginPath(); ctx.arc(s.x, s.y - r * 0.4, r * 0.95, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = 'rgba(255,255,255,0.12)'; ctx.beginPath(); ctx.arc(s.x - r * 0.3, s.y - r * 0.7, r * 0.4, 0, Math.PI * 2); ctx.fill(); }
      else if (o.kind === 'rock') { ctx.fillStyle = '#6a6a70'; ctx.beginPath(); ctx.moveTo(s.x - r, s.y + r * 0.3); ctx.lineTo(s.x - r * 0.6, s.y - r * 0.7); ctx.lineTo(s.x + r * 0.2, s.y - r * 0.9); ctx.lineTo(s.x + r, s.y - r * 0.1); ctx.lineTo(s.x + r * 0.7, s.y + r * 0.5); ctx.closePath(); ctx.fill(); ctx.fillStyle = 'rgba(255,255,255,0.15)'; ctx.beginPath(); ctx.moveTo(s.x - r * 0.6, s.y - r * 0.7); ctx.lineTo(s.x + r * 0.2, s.y - r * 0.9); ctx.lineTo(s.x, s.y - r * 0.3); ctx.closePath(); ctx.fill(); }
      else { ctx.fillStyle = '#5a5250'; ctx.fillRect(s.x - r * 0.5, s.y - r * 1.4, r, r * 1.8); ctx.fillStyle = '#7a7270'; ctx.fillRect(s.x - r * 0.6, s.y - r * 1.5, r * 1.2, r * 0.3); }
    }
    // map border
    ctx.strokeStyle = 'rgba(0,0,0,0.6)'; ctx.lineWidth = 6; ctx.strokeRect(tl.x, tl.y, br.x - tl.x, br.y - tl.y);
  }

  function drawZone(z, S) {
    const s = Render.worldToScreen(z.x, z.y); const r = z.radius * scale;
    if (z.telegraph) { const f = z.t / z.dur; ctx.fillStyle = 'rgba(255,60,60,0.18)'; ctx.beginPath(); ctx.arc(s.x, s.y, r, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = 'rgba(255,60,60,0.35)'; ctx.beginPath(); ctx.arc(s.x, s.y, r * f, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = 'rgba(255,90,90,0.8)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(s.x, s.y, r, 0, Math.PI * 2); ctx.stroke(); return; }
    const col = DATA.ELEMENT_COLOR[z.element] || '#fff';
    const alpha = z.team === 0 ? 0.22 : 0.3;
    const g = ctx.createRadialGradient(s.x, s.y, r * 0.2, s.x, s.y, r);
    g.addColorStop(0, U.rgba(col, alpha + 0.1)); g.addColorStop(1, U.rgba(col, 0.04));
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(s.x, s.y, r, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = U.rgba(col, 0.5); ctx.lineWidth = 1.5; ctx.setLineDash([6, 6]); ctx.lineDashOffset = -S.t * 20; ctx.beginPath(); ctx.arc(s.x, s.y, r, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]);
  }
  function drawCorpse(c) { const s = Render.worldToScreen(c.x, c.y); ctx.fillStyle = '#cfc8b8'; ctx.beginPath(); ctx.ellipse(s.x, s.y, scale * 0.45, scale * 0.22, 0.3, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#8a1a1a'; ctx.beginPath(); ctx.ellipse(s.x + scale * 0.2, s.y + scale * 0.1, scale * 0.25, scale * 0.12, 0, 0, Math.PI * 2); ctx.fill(); }
  function drawWall(w) { const s = Render.worldToScreen(w.x, w.y); ctx.fillStyle = w.color; ctx.beginPath(); ctx.arc(s.x, s.y, w.r * scale, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.beginPath(); ctx.arc(s.x, s.y + 2, w.r * scale * 0.6, 0, Math.PI * 2); ctx.fill(); }
  function drawOrb(o) { const s = Render.worldToScreen(o.x, o.y); const pulse = 1 + Math.sin(o.t * 6) * 0.15; ctx.fillStyle = '#ff3b3b'; ctx.shadowColor = '#ff3b3b'; ctx.shadowBlur = 12; ctx.beginPath(); ctx.arc(s.x, s.y, scale * 0.28 * pulse, 0, Math.PI * 2); ctx.fill(); ctx.shadowBlur = 0; }
  function drawDrop(d, S) {
    const s = Render.worldToScreen(d.x, d.y);
    if (d.kind === 'gold') { ctx.fillStyle = '#ffd76a'; ctx.beginPath(); ctx.arc(s.x, s.y, scale * 0.16, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#b08a2a'; ctx.beginPath(); ctx.arc(s.x + 3, s.y + 2, scale * 0.12, 0, Math.PI * 2); ctx.fill(); return; }
    if (d.kind === 'material') { ctx.fillStyle = DATA.MATERIALS[d.id].color; ctx.fillRect(s.x - scale * 0.15, s.y - scale * 0.15, scale * 0.3, scale * 0.3); return; }
    if (d.kind === 'potion') { ctx.fillStyle = '#ff5a5a'; ctx.beginPath(); ctx.arc(s.x, s.y, scale * 0.2, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#fff'; ctx.fillRect(s.x - 2, s.y - scale * 0.32, 4, scale * 0.14); return; }
    if (d.kind === 'gem') { ctx.fillStyle = DATA.GEMS[d.gem].color; ctx.beginPath(); ctx.moveTo(s.x, s.y - scale * 0.25); ctx.lineTo(s.x + scale * 0.2, s.y); ctx.lineTo(s.x, s.y + scale * 0.25); ctx.lineTo(s.x - scale * 0.2, s.y); ctx.closePath(); ctx.fill(); return; }
    const rd = DATA.RARITY[d.item.rarity]; const bob = Math.sin(d.t * 3) * 3;
    if (rd.order >= 3) { ctx.strokeStyle = U.rgba(rd.color, 0.5); ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(s.x, s.y); ctx.lineTo(s.x, s.y - scale * 1.6); ctx.stroke(); }
    ctx.fillStyle = rd.color; ctx.shadowColor = rd.color; ctx.shadowBlur = rd.order >= 2 ? 10 : 0;
    ctx.beginPath(); ctx.moveTo(s.x, s.y - scale * 0.3 + bob); ctx.lineTo(s.x + scale * 0.22, s.y + bob); ctx.lineTo(s.x, s.y + scale * 0.3 + bob); ctx.lineTo(s.x - scale * 0.22, s.y + bob); ctx.closePath(); ctx.fill(); ctx.shadowBlur = 0;
    if (U.dist(d.x, d.y, S.player.x, S.player.y) < 5 || rd.order >= 3) { ctx.font = 'bold ' + Math.round(scale * 0.3) + 'px sans-serif'; ctx.textAlign = 'center'; ctx.fillStyle = 'rgba(0,0,0,0.6)'; const tw = ctx.measureText(d.item.name).width; ctx.fillRect(s.x - tw / 2 - 4, s.y - scale * 0.7 + bob, tw + 8, scale * 0.38); ctx.fillStyle = rd.color; ctx.fillText(d.item.name, s.x, s.y - scale * 0.42 + bob); if (d.full) { ctx.fillStyle = '#f66'; ctx.fillText('Inventory full', s.x, s.y + scale * 0.7); } }
  }
  function drawExit(ex) { const s = Render.worldToScreen(ex.x, ex.y); ctx.fillStyle = '#2a2a3a'; ctx.fillRect(s.x - scale * 0.9, s.y - scale * 0.9, scale * 1.8, scale * 1.8); ctx.fillStyle = '#6f8cff'; ctx.font = 'bold ' + Math.round(scale * 0.35) + 'px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('▼ STAIRS', s.x, s.y + 5); ctx.strokeStyle = '#6f8cff'; ctx.lineWidth = 2; ctx.strokeRect(s.x - scale * 0.9, s.y - scale * 0.9, scale * 1.8, scale * 1.8); }
  function drawChest(ch) { const s = Render.worldToScreen(ch.x, ch.y); ctx.fillStyle = ch.opened ? '#5a4a2a' : '#8a6a2a'; ctx.fillRect(s.x - scale * 0.6, s.y - scale * 0.4, scale * 1.2, scale * 0.8); ctx.fillStyle = ch.opened ? '#3a2a1a' : '#ffd76a'; ctx.fillRect(s.x - scale * 0.6, s.y - scale * 0.55, scale * 1.2, scale * 0.25); if (!ch.opened) { ctx.shadowColor = '#ffd76a'; ctx.shadowBlur = 16; ctx.strokeStyle = '#ffd76a'; ctx.lineWidth = 2; ctx.strokeRect(s.x - scale * 0.6, s.y - scale * 0.55, scale * 1.2, scale * 0.95); ctx.shadowBlur = 0; ctx.font = 'bold ' + Math.round(scale * 0.3) + 'px sans-serif'; ctx.textAlign = 'center'; ctx.fillStyle = '#ffd76a'; ctx.fillText('REWARD', s.x, s.y - scale * 0.7); } }
  function drawTelegraph(e) {
    const tg = e.ai.telegraph; const s = Render.worldToScreen(e.x, e.y); const f = Math.min(1, tg.t / tg.dur);
    ctx.lineWidth = 2;
    if (tg.kind === 'swing') { ctx.strokeStyle = 'rgba(255,80,80,' + (0.3 + f * 0.6) + ')'; ctx.beginPath(); ctx.arc(s.x, s.y, (e.range + 0.6) * scale, e.facing - 0.6, e.facing + 0.6); ctx.stroke(); }
    else if (tg.kind === 'cast') { ctx.strokeStyle = 'rgba(255,200,80,' + (0.4 + f * 0.5) + ')'; ctx.beginPath(); ctx.arc(s.x, s.y - e.r * scale - 6, 6 + f * 6, 0, Math.PI * 2); ctx.stroke(); }
    else if (tg.kind === 'nova') { ctx.fillStyle = 'rgba(255,60,60,0.15)'; ctx.beginPath(); ctx.arc(s.x, s.y, tg.radius * scale, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = 'rgba(255,60,60,0.3)'; ctx.beginPath(); ctx.arc(s.x, s.y, tg.radius * scale * f, 0, Math.PI * 2); ctx.fill(); }
    else if (tg.kind === 'cone') { ctx.fillStyle = 'rgba(255,60,60,0.2)'; ctx.beginPath(); ctx.moveTo(s.x, s.y); ctx.arc(s.x, s.y, tg.range * scale, tg.dir - tg.arc / 2, tg.dir + tg.arc / 2); ctx.closePath(); ctx.fill(); ctx.fillStyle = 'rgba(255,60,60,0.3)'; ctx.beginPath(); ctx.moveTo(s.x, s.y); ctx.arc(s.x, s.y, tg.range * scale * f, tg.dir - tg.arc / 2, tg.dir + tg.arc / 2); ctx.closePath(); ctx.fill(); }
    else if (tg.kind === 'charge') { const w = (e.r + 0.4) * scale; ctx.save(); ctx.translate(s.x, s.y); ctx.rotate(tg.dir); ctx.fillStyle = 'rgba(255,60,60,0.2)'; ctx.fillRect(0, -w, tg.range * scale, w * 2); ctx.fillStyle = 'rgba(255,60,60,0.35)'; ctx.fillRect(0, -w, tg.range * scale * f, w * 2); ctx.restore(); }
  }

  // ------------------------------------------------------------- entities
  function statusDots(ent, s, r) {
    const list = [];
    if (ent.st.vulnerable) list.push('#ffe55c'); if (ent.st.stun || ent.st.knockdown) list.push('#ffffff'); if (ent.st.freeze) list.push('#7fd6ff'); if (ent.st.slow || ent.st.chill || ent.st.decrepify) list.push('#9ad');
    if (ent.st.immobilize) list.push('#c9a86a'); if (ent.st.fear) list.push('#b36cff'); if (ent.dots && ent.dots.some(d => d.st === 'bleed')) list.push('#ff3b3b'); if (ent.dots && ent.dots.some(d => d.st === 'poison')) list.push('#7dff5c'); if (ent.dots && ent.dots.some(d => d.st === 'burn')) list.push('#ff7a2a'); if (ent.dots && ent.dots.some(d => d.st === 'shadow_dot')) list.push('#b36cff');
    if (ent.st.iron_maiden) list.push('#8a1a2a'); if (ent.st.taunt) list.push('#ff8c1a');
    list.slice(0, 7).forEach((c, i) => { ctx.fillStyle = c; ctx.beginPath(); ctx.arc(s.x - (list.length - 1) * 4 + i * 8, s.y - r - 12, 3, 0, Math.PI * 2); ctx.fill(); });
  }
  function hpBar(s, r, frac, color, w, shieldFrac) {
    const bw = w || Math.max(28, r * 2.2), bh = 5; const x = s.x - bw / 2, y = s.y - r - 9;
    ctx.fillStyle = 'rgba(0,0,0,0.7)'; ctx.fillRect(x - 1, y - 1, bw + 2, bh + 2);
    ctx.fillStyle = color; ctx.fillRect(x, y, bw * U.clamp(frac, 0, 1), bh);
    if (shieldFrac) { ctx.fillStyle = 'rgba(255,233,160,0.8)'; ctx.fillRect(x, y, bw * U.clamp(shieldFrac, 0, 1), 2); }
  }
  function drawEnemy(e, S) {
    const s = Render.worldToScreen(e.x, e.y); const r = e.r * scale;
    if (e.dead) { ctx.globalAlpha = Math.max(0, 1 - e.deathT / 0.6); ctx.fillStyle = e.color; ctx.beginPath(); ctx.ellipse(s.x, s.y + r * 0.4, r, r * 0.4, 0, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = 1; return; }
    if (e.hidden) return;
    ellipseShadow(s.x, s.y, r);
    const rank = e.elite.rank;
    if (rank !== 'normal') { const rc = DATA.ELITE_RANKS[rank].color; ctx.strokeStyle = rc; ctx.lineWidth = 3; ctx.shadowColor = rc; ctx.shadowBlur = 10; ctx.beginPath(); ctx.arc(s.x, s.y, r + 4, 0, Math.PI * 2); ctx.stroke(); ctx.shadowBlur = 0; }
    if (e.st.taunt) { ctx.strokeStyle = '#ff8c1a'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(s.x, s.y, r + 7, 0, Math.PI * 2); ctx.stroke(); }
    const body = e.hitFlash > 0 ? '#ffffff' : e.color;
    drawShape(e.def.shape, s.x, s.y, r, body, e.facing, S.t, e);
    if (e.st.freeze) { ctx.fillStyle = 'rgba(127,214,255,0.45)'; ctx.beginPath(); ctx.arc(s.x, s.y, r + 2, 0, Math.PI * 2); ctx.fill(); }
    if (e.st.stun && e.st.stun.petrify) { ctx.fillStyle = 'rgba(120,120,120,0.6)'; ctx.beginPath(); ctx.arc(s.x, s.y, r + 1, 0, Math.PI * 2); ctx.fill(); }
    if (e.shield > 0) { ctx.strokeStyle = 'rgba(255,233,160,0.8)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(s.x, s.y, r + 2, 0, Math.PI * 2); ctx.stroke(); }
    if (e.ai.telegraphExplode) { ctx.strokeStyle = '#ff5a1a'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(s.x, s.y, r + 3 + Math.sin(S.t * 30) * 2, 0, Math.PI * 2); ctx.stroke(); }
    if (e.elite.affixes.some(a => a.suppress)) { ctx.strokeStyle = 'rgba(180,120,255,0.5)'; ctx.lineWidth = 2; ctx.setLineDash([4, 4]); ctx.beginPath(); ctx.arc(s.x, s.y, 4.5 * scale, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]); }
    // hp bar
    if (e.hp < e.maxHp || rank !== 'normal') hpBar(s, r, e.hp / e.maxHp, rank === 'boss' ? '#b36cff' : rank !== 'normal' ? DATA.ELITE_RANKS[rank].color : '#d33', rank === 'boss' ? 90 : undefined, e.shield / e.maxHp);
    statusDots(e, s, r);
    if (rank !== 'normal') { ctx.font = 'bold ' + Math.round(scale * 0.28) + 'px sans-serif'; ctx.textAlign = 'center'; ctx.fillStyle = DATA.ELITE_RANKS[rank].color; ctx.fillText(e.name + (e.elite.affixes.length ? ' · ' + e.elite.affixes.map(a => a.name).join(', ') : ''), s.x, s.y - r - 16); }
  }
  function drawShape(shape, x, y, r, color, facing, t, ent) {
    ctx.fillStyle = color;
    const wob = Math.sin(t * 8 + x) * r * 0.05;
    switch (shape) {
      case 'skull': ctx.beginPath(); ctx.arc(x, y - r * 0.2, r * 0.85, 0, Math.PI * 2); ctx.fill(); ctx.fillRect(x - r * 0.5, y + r * 0.2, r, r * 0.5); ctx.fillStyle = '#111'; ctx.beginPath(); ctx.arc(x - r * 0.3, y - r * 0.3, r * 0.2, 0, Math.PI * 2); ctx.arc(x + r * 0.3, y - r * 0.3, r * 0.2, 0, Math.PI * 2); ctx.fill(); break;
      case 'imp': ctx.beginPath(); ctx.arc(x, y, r * 0.8, 0, Math.PI * 2); ctx.fill(); ctx.beginPath(); ctx.moveTo(x - r * 0.6, y - r * 0.5); ctx.lineTo(x - r * 0.8, y - r * 1.3); ctx.lineTo(x - r * 0.2, y - r * 0.7); ctx.moveTo(x + r * 0.6, y - r * 0.5); ctx.lineTo(x + r * 0.8, y - r * 1.3); ctx.lineTo(x + r * 0.2, y - r * 0.7); ctx.fill(); ctx.fillStyle = '#ffe55c'; ctx.beginPath(); ctx.arc(x - r * 0.25, y - r * 0.15, r * 0.12, 0, Math.PI * 2); ctx.arc(x + r * 0.25, y - r * 0.15, r * 0.12, 0, Math.PI * 2); ctx.fill(); break;
      case 'brute': ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.beginPath(); ctx.arc(x - r * 0.5, y - r * 0.1, r * 0.35, 0, Math.PI * 2); ctx.arc(x + r * 0.5, y - r * 0.1, r * 0.35, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#ff3b3b'; ctx.beginPath(); ctx.arc(x - r * 0.2, y - r * 0.3, r * 0.1, 0, Math.PI * 2); ctx.arc(x + r * 0.2, y - r * 0.3, r * 0.1, 0, Math.PI * 2); ctx.fill(); break;
      case 'spider': ctx.strokeStyle = color; ctx.lineWidth = Math.max(1, r * 0.12); for (let i = 0; i < 4; i++) { const a = facing + Math.PI / 2 + (i - 1.5) * 0.5; const l = r * 1.5; const wag = Math.sin(t * 14 + i) * 0.2; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + Math.cos(a + wag) * l, y + Math.sin(a + wag) * l); ctx.moveTo(x, y); ctx.lineTo(x - Math.cos(a - wag) * l, y - Math.sin(a - wag) * l); ctx.stroke(); } ctx.beginPath(); ctx.ellipse(x, y, r * 0.8, r * 0.6, facing, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#ff3b3b'; ctx.beginPath(); ctx.arc(x + Math.cos(facing) * r * 0.5, y + Math.sin(facing) * r * 0.5, r * 0.12, 0, Math.PI * 2); ctx.fill(); break;
      case 'blob': ctx.beginPath(); ctx.ellipse(x, y + wob, r * 1.05, r * 0.85, 0, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = 'rgba(255,255,255,0.2)'; ctx.beginPath(); ctx.arc(x - r * 0.3, y - r * 0.3, r * 0.3, 0, Math.PI * 2); ctx.fill(); break;
      case 'beast': ctx.beginPath(); ctx.ellipse(x, y, r * 1.1, r * 0.7, facing, 0, Math.PI * 2); ctx.fill(); ctx.beginPath(); ctx.arc(x + Math.cos(facing) * r * 0.9, y + Math.sin(facing) * r * 0.9, r * 0.45, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#ffe55c'; ctx.beginPath(); ctx.arc(x + Math.cos(facing) * r * 1.0, y + Math.sin(facing) * r * 1.0, r * 0.1, 0, Math.PI * 2); ctx.fill(); break;
      case 'ghost': ctx.globalAlpha = 0.7; ctx.beginPath(); ctx.arc(x, y - r * 0.2 + wob * 3, r * 0.8, Math.PI, 0); ctx.lineTo(x + r * 0.8, y + r * 0.6); ctx.lineTo(x + r * 0.4, y + r * 0.3); ctx.lineTo(x, y + r * 0.7); ctx.lineTo(x - r * 0.4, y + r * 0.3); ctx.lineTo(x - r * 0.8, y + r * 0.6); ctx.closePath(); ctx.fill(); ctx.globalAlpha = 1; ctx.fillStyle = '#111'; ctx.beginPath(); ctx.arc(x - r * 0.3, y - r * 0.2, r * 0.15, 0, Math.PI * 2); ctx.arc(x + r * 0.3, y - r * 0.2, r * 0.15, 0, Math.PI * 2); ctx.fill(); break;
      case 'horned': ctx.beginPath(); ctx.arc(x, y, r * 0.9, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = '#e8e2d0'; ctx.lineWidth = Math.max(1.5, r * 0.15); ctx.beginPath(); ctx.moveTo(x - r * 0.5, y - r * 0.6); ctx.quadraticCurveTo(x - r * 1.2, y - r * 1.2, x - r * 0.6, y - r * 1.5); ctx.moveTo(x + r * 0.5, y - r * 0.6); ctx.quadraticCurveTo(x + r * 1.2, y - r * 1.2, x + r * 0.6, y - r * 1.5); ctx.stroke(); break;
      case 'armored': ctx.fillRect(x - r * 0.8, y - r * 0.9, r * 1.6, r * 1.8); ctx.fillStyle = 'rgba(255,255,255,0.2)'; ctx.fillRect(x - r * 0.8, y - r * 0.9, r * 1.6, r * 0.3); ctx.fillStyle = '#ff3b3b'; ctx.fillRect(x - r * 0.4, y - r * 0.4, r * 0.25, r * 0.15); ctx.fillRect(x + r * 0.15, y - r * 0.4, r * 0.25, r * 0.15); break;
      case 'robed': ctx.beginPath(); ctx.moveTo(x, y - r); ctx.lineTo(x + r * 0.9, y + r); ctx.lineTo(x - r * 0.9, y + r); ctx.closePath(); ctx.fill(); ctx.fillStyle = '#111'; ctx.beginPath(); ctx.arc(x, y - r * 0.35, r * 0.3, 0, Math.PI * 2); ctx.fill(); break;
      case 'winged': ctx.beginPath(); ctx.ellipse(x - r * 0.9, y - r * 0.2, r * 0.8, r * 0.35, -0.5 + Math.sin(t * 10) * 0.2, 0, Math.PI * 2); ctx.ellipse(x + r * 0.9, y - r * 0.2, r * 0.8, r * 0.35, 0.5 - Math.sin(t * 10) * 0.2, 0, Math.PI * 2); ctx.fill(); ctx.beginPath(); ctx.arc(x, y, r * 0.7, 0, Math.PI * 2); ctx.fill(); break;
      case 'snake': ctx.strokeStyle = color; ctx.lineWidth = r * 0.7; ctx.lineCap = 'round'; ctx.beginPath(); for (let i = 0; i <= 6; i++) { const f = i / 6; const px = x - Math.cos(facing) * r * 2 * f + Math.cos(facing + Math.PI / 2) * Math.sin(f * 6 + t * 10) * r * 0.4, py = y - Math.sin(facing) * r * 2 * f + Math.sin(facing + Math.PI / 2) * Math.sin(f * 6 + t * 10) * r * 0.4; if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py); } ctx.stroke(); ctx.beginPath(); ctx.arc(x, y, r * 0.6, 0, Math.PI * 2); ctx.fill(); break;
      case 'crab': ctx.beginPath(); ctx.ellipse(x, y, r * 1.1, r * 0.7, 0, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = color; ctx.lineWidth = r * 0.2; for (const sgn of [-1, 1]) { ctx.beginPath(); ctx.moveTo(x + sgn * r * 0.8, y - r * 0.2); ctx.lineTo(x + sgn * r * 1.5, y - r * 0.7); ctx.stroke(); } break;
      case 'construct': ctx.fillRect(x - r * 0.9, y - r * 0.9, r * 1.8, r * 1.8); ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.fillRect(x - r * 0.6, y - r * 0.6, r * 1.2, r * 0.4); ctx.fillStyle = '#7fd6ff'; ctx.beginPath(); ctx.arc(x, y + r * 0.2, r * 0.25, 0, Math.PI * 2); ctx.fill(); break;
      case 'bat': ctx.beginPath(); ctx.ellipse(x - r * 0.8, y, r * 0.7, r * 0.3, Math.sin(t * 20) * 0.5, 0, Math.PI * 2); ctx.ellipse(x + r * 0.8, y, r * 0.7, r * 0.3, -Math.sin(t * 20) * 0.5, 0, Math.PI * 2); ctx.fill(); ctx.beginPath(); ctx.arc(x, y, r * 0.5, 0, Math.PI * 2); ctx.fill(); break;
      case 'boss': ctx.shadowColor = color; ctx.shadowBlur = 20; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill(); ctx.shadowBlur = 0; ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.beginPath(); ctx.arc(x, y, r * 0.6, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#ffe55c'; ctx.beginPath(); ctx.arc(x - r * 0.25, y - r * 0.25, r * 0.12, 0, Math.PI * 2); ctx.arc(x + r * 0.25, y - r * 0.25, r * 0.12, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = '#e8e2d0'; ctx.lineWidth = r * 0.15; ctx.beginPath(); ctx.moveTo(x - r * 0.6, y - r * 0.7); ctx.lineTo(x - r * 0.9, y - r * 1.5); ctx.moveTo(x + r * 0.6, y - r * 0.7); ctx.lineTo(x + r * 0.9, y - r * 1.5); ctx.stroke(); break;
      default: ctx.beginPath(); ctx.arc(x, y, r * 0.85, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.beginPath(); ctx.arc(x, y - r * 0.35, r * 0.4, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = color; ctx.fillRect(x + Math.cos(facing) * r * 0.6 - r * 0.15, y + Math.sin(facing) * r * 0.6 - r * 0.15, r * 0.3, r * 0.3);
    }
  }
  function drawMinion(m, S) {
    const s = Render.worldToScreen(m.x, m.y); const r = m.r * scale;
    if (!m.def.flying) ellipseShadow(s.x, s.y, r);
    const col = m.hitFlash > 0 ? '#fff' : m.color;
    if (m.empowered) { ctx.strokeStyle = '#ffe55c'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(s.x, s.y, r + 3, 0, Math.PI * 2); ctx.stroke(); }
    const shape = m.type === 'skeleton' || m.type === 'volatile_skeleton' ? 'skull' : m.type === 'mage' ? 'robed' : m.type === 'golem' ? 'construct' : m.type === 'wolf' ? 'beast' : m.type === 'raven' ? 'bat' : m.type === 'creeper' ? 'blob' : 'brute';
    drawShape(shape, s.x, s.y - (m.def.flying ? scale * 1.2 : 0), r, col, Math.atan2(0, 1), S.t, m);
    if (m.hp < m.maxHp) hpBar(s, r, m.hp / m.maxHp, '#6f8cff', 22);
  }
  function drawPlayer(p, S) {
    const s = Render.worldToScreen(p.x, p.y); const r = p.r * scale;
    const char = S.char; const cls = DATA.classes[char.cls];
    const dye = DATA.DYES.find(d => d.id === (char.cosmetics.dye || 'none'));
    const body = dye && dye.color ? U.mixHex(cls.color, dye.color, 0.6) : cls.color;
    ellipseShadow(s.x, s.y, r * (p.mounted ? 1.6 : 1));
    // aura/buff glow
    const glow = p.buffs.find(b => b.glow); if (glow) { ctx.fillStyle = U.rgba(glow.glow, 0.18); ctx.beginPath(); ctx.arc(s.x, s.y, r * 2.6 + Math.sin(S.t * 6) * 3, 0, Math.PI * 2); ctx.fill(); }
    if (p.auraActive) { ctx.strokeStyle = 'rgba(255,242,166,0.5)'; ctx.lineWidth = 2; ctx.setLineDash([3, 5]); ctx.lineDashOffset = -S.t * 15; ctx.beginPath(); ctx.arc(s.x, s.y, r * 2.2, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]); }
    for (const b of p.buffs) if (b.aura) { ctx.strokeStyle = U.rgba(b.res && DATA.ELEMENT_COLOR[b.res.element] || '#fff', 0.45); ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(s.x, s.y, b.aura.radius * scale, S.t * 2, S.t * 2 + Math.PI * 1.4); ctx.stroke(); }
    if (p.channel) { ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(s.x, s.y, (p.channel.res.eff.radius || 2) * scale, 0, Math.PI * 2); ctx.stroke(); if (p.channel.target) { ctx.strokeStyle = '#b36cff'; ctx.lineWidth = 4; const t = Render.worldToScreen(p.channel.target.x, p.channel.target.y); ctx.beginPath(); ctx.moveTo(s.x, s.y); ctx.lineTo(t.x, t.y); ctx.stroke(); } }
    // mount
    if (p.mounted) { const m = DATA.mountById[char.mount.current]; if (m) { ctx.fillStyle = m.color; ctx.beginPath(); ctx.ellipse(s.x, s.y + r * 0.3, r * 1.7, r * 0.8, 0, 0, Math.PI * 2); ctx.fill(); ctx.beginPath(); ctx.arc(s.x + Math.cos(p.facing) * r * 1.6, s.y + Math.sin(p.facing) * r * 1.6 - r * 0.5, r * 0.5, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = m.mane; ctx.beginPath(); ctx.ellipse(s.x + Math.cos(p.facing) * r * 1.0, s.y + Math.sin(p.facing) * r * 1.0 - r * 0.6, r * 0.6, r * 0.3, p.facing, 0, Math.PI * 2); ctx.fill(); const ma = DATA.MOUNT_ARMOR.find(a => a.id === char.mount.armor); if (ma && ma.color) { ctx.fillStyle = ma.color; ctx.fillRect(s.x - r * 0.9, s.y - r * 0.1, r * 1.8, r * 0.5); } if (m.glow) { ctx.strokeStyle = U.rgba(m.glow, 0.5); ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(s.x, s.y + r * 0.3, r * 1.9, r * 1.0, 0, 0, Math.PI * 2); ctx.stroke(); } } }
    const yOff = p.mounted ? -r * 0.9 : 0;
    // body
    const bodyR = p.form === 'werebear' ? r * 1.35 : p.form === 'werewolf' ? r * 1.1 : r;
    const col = p.form === 'werebear' ? '#5a3a1a' : p.form === 'werewolf' ? '#6a5a4a' : body;
    if (p.immune > 0 || p.buffs.some(b => b.immune)) { ctx.strokeStyle = 'rgba(255,255,255,0.7)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(s.x, s.y + yOff, bodyR + 5, 0, Math.PI * 2); ctx.stroke(); }
    if (p.barrier > 0) { ctx.fillStyle = 'rgba(255,233,160,0.25)'; ctx.beginPath(); ctx.arc(s.x, s.y + yOff, bodyR + 4, 0, Math.PI * 2); ctx.fill(); }
    if (p.stealth > 0) ctx.globalAlpha = 0.4;
    ctx.fillStyle = col; ctx.beginPath(); ctx.arc(s.x, s.y + yOff, bodyR, 0, Math.PI * 2); ctx.fill();
    // armor cosmetics tint ring
    const chest = DATA.cosmeticById[char.cosmetics.equipped.chest]; if (chest && chest.color) { ctx.strokeStyle = chest.color; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(s.x, s.y + yOff, bodyR - 1, 0, Math.PI * 2); ctx.stroke(); }
    const helm = DATA.cosmeticById[char.cosmetics.equipped.helm]; const skin = DATA.appearance.skin.find(k => k.id === char.appearance.skin);
    ctx.fillStyle = helm && helm.color ? helm.color : (skin ? skin.c : '#d9a877'); ctx.beginPath(); ctx.arc(s.x, s.y + yOff - bodyR * 0.45, bodyR * 0.45, 0, Math.PI * 2); ctx.fill();
    if (!helm || !helm.color) { const hair = DATA.appearance.hair.find(k => k.id === char.appearance.hair); ctx.fillStyle = hair ? hair.c : '#333'; ctx.beginPath(); ctx.arc(s.x, s.y + yOff - bodyR * 0.6, bodyR * 0.35, Math.PI, 0); ctx.fill(); }
    if (p.form === 'werewolf') { ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(s.x - bodyR * 0.5, s.y + yOff - bodyR * 0.6); ctx.lineTo(s.x - bodyR * 0.6, s.y + yOff - bodyR * 1.2); ctx.lineTo(s.x - bodyR * 0.2, s.y + yOff - bodyR * 0.8); ctx.moveTo(s.x + bodyR * 0.5, s.y + yOff - bodyR * 0.6); ctx.lineTo(s.x + bodyR * 0.6, s.y + yOff - bodyR * 1.2); ctx.lineTo(s.x + bodyR * 0.2, s.y + yOff - bodyR * 0.8); ctx.fill(); }
    // weapon indicator
    const wcos = DATA.cosmeticById[char.cosmetics.equipped.weapon];
    ctx.strokeStyle = wcos && wcos.color ? wcos.color : '#ddd'; ctx.lineWidth = 3; ctx.shadowColor = wcos && wcos.color ? wcos.color : 'transparent'; ctx.shadowBlur = wcos && wcos.color ? 8 : 0;
    const swing = p.attackTimer > 0 ? Math.sin(p.attackTimer * 20) * 0.6 : 0;
    ctx.beginPath(); ctx.moveTo(s.x + Math.cos(p.facing + swing) * bodyR * 0.5, s.y + yOff + Math.sin(p.facing + swing) * bodyR * 0.5); ctx.lineTo(s.x + Math.cos(p.facing + swing) * bodyR * 1.7, s.y + yOff + Math.sin(p.facing + swing) * bodyR * 1.7); ctx.stroke(); ctx.shadowBlur = 0;
    const back = DATA.cosmeticById[char.cosmetics.equipped.back]; if (back && back.color) { ctx.fillStyle = U.rgba(back.color, 0.6); ctx.beginPath(); ctx.ellipse(s.x - bodyR * 0.9, s.y + yOff - bodyR * 0.2, bodyR * 0.5, bodyR * 0.9, -0.4, 0, Math.PI * 2); ctx.ellipse(s.x + bodyR * 0.9, s.y + yOff - bodyR * 0.2, bodyR * 0.5, bodyR * 0.9, 0.4, 0, Math.PI * 2); ctx.fill(); }
    ctx.globalAlpha = 1;
    if (p.st.berserk) { ctx.strokeStyle = 'rgba(255,90,60,0.8)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(s.x, s.y + yOff, bodyR + 3, S.t * 8, S.t * 8 + 4); ctx.stroke(); }
    // marker & name
    const marker = DATA.MARKERS.find(m => m.id === char.cosmetics.marker);
    ctx.font = 'bold ' + Math.round(scale * 0.28) + 'px sans-serif'; ctx.textAlign = 'center'; ctx.fillStyle = '#fff';
    ctx.fillText((marker && marker.glyph ? marker.glyph + ' ' : '') + char.name, s.x, s.y + yOff - bodyR - 14);
    statusDots(p, { x: s.x, y: s.y + yOff }, bodyR);
    if (p.dead) { ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(0, 0, W, H); }
  }
  function drawBeam(b) {
    const a = 1 - b.t / b.dur; ctx.globalAlpha = Math.max(0, a);
    if (b.kind === 'arc') { const s = Render.worldToScreen(b.x, b.y); ctx.fillStyle = U.rgba(b.color, 0.35); ctx.beginPath(); ctx.moveTo(s.x, s.y); ctx.arc(s.x, s.y, b.range * scale, b.dir - b.arc / 2, b.dir + b.arc / 2); ctx.closePath(); ctx.fill(); ctx.strokeStyle = b.color; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(s.x, s.y, b.range * scale, b.dir - b.arc / 2, b.dir + b.arc / 2); ctx.stroke(); }
    else if (b.kind === 'ring') { const s = Render.worldToScreen(b.x, b.y); ctx.strokeStyle = b.color; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(s.x, s.y, b.radius * scale * (0.5 + 0.5 * (b.t / b.dur)), 0, Math.PI * 2); ctx.stroke(); ctx.fillStyle = U.rgba(b.color, 0.15); ctx.fill(); }
    else if (b.kind === 'telegraphRing') { const s = Render.worldToScreen(b.x, b.y); ctx.globalAlpha = 1; ctx.strokeStyle = U.rgba(b.color, 0.7); ctx.lineWidth = 2; ctx.setLineDash([5, 5]); ctx.beginPath(); ctx.arc(s.x, s.y, b.radius * scale, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]); ctx.fillStyle = U.rgba(b.color, 0.15 * (b.t / b.dur)); ctx.fill(); }
    else if (b.kind === 'line') { const a1 = Render.worldToScreen(b.x1, b.y1), a2 = Render.worldToScreen(b.x2, b.y2); ctx.strokeStyle = b.color; ctx.lineWidth = 4; ctx.shadowColor = b.color; ctx.shadowBlur = 10; ctx.beginPath(); ctx.moveTo(a1.x, a1.y); ctx.lineTo(a2.x, a2.y); ctx.stroke(); ctx.shadowBlur = 0; }
    else if (b.kind === 'spin') { const s = Render.worldToScreen(b.x, b.y); ctx.strokeStyle = b.color; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(s.x, s.y, b.radius * scale, b.t * 25, b.t * 25 + 2.5); ctx.stroke(); }
    ctx.globalAlpha = 1;
  }
  function drawProjectile(pr) {
    const s = Render.worldToScreen(pr.x, pr.y); const r = (pr.size || 0.4) * scale;
    const col = pr.color || '#fff';
    if (pr.team === 1) { ctx.fillStyle = col; ctx.shadowColor = col; ctx.shadowBlur = 8; ctx.beginPath(); ctx.arc(s.x, s.y, r, 0, Math.PI * 2); ctx.fill(); ctx.shadowBlur = 0; ctx.fillStyle = 'rgba(255,255,255,0.6)'; ctx.beginPath(); ctx.arc(s.x, s.y, r * 0.4, 0, Math.PI * 2); ctx.fill(); return; }
    if (pr.wander || (pr.res && pr.res.id === 'tornado')) { ctx.strokeStyle = 'rgba(220,230,240,0.7)'; ctx.lineWidth = 2; for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.arc(s.x, s.y - i * 4, r * (0.5 + i * 0.3), pr.t * 10 + i, pr.t * 10 + i + 4); ctx.stroke(); } return; }
    if (pr.orbit) { ctx.fillStyle = col; ctx.shadowColor = col; ctx.shadowBlur = 12; ctx.save(); ctx.translate(s.x, s.y); ctx.rotate(pr.t * 12); ctx.fillRect(-r * 0.8, -r * 0.3, r * 1.6, r * 0.6); ctx.fillRect(-r * 0.15, -r * 0.8, r * 0.3, r * 1.6); ctx.restore(); ctx.shadowBlur = 0; return; }
    if (pr.spectre) { ctx.globalAlpha = 0.6; ctx.fillStyle = col; ctx.beginPath(); ctx.arc(s.x, s.y, r, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = 1; return; }
    ctx.strokeStyle = col; ctx.lineWidth = Math.max(2, r * 0.8); ctx.shadowColor = col; ctx.shadowBlur = 8; ctx.beginPath(); ctx.moveTo(s.x - pr.vx / Math.max(1, pr.speed) * r * 2.5, s.y - pr.vy / Math.max(1, pr.speed) * r * 2.5); ctx.lineTo(s.x, s.y); ctx.stroke(); ctx.shadowBlur = 0;
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(s.x, s.y, r * 0.5, 0, Math.PI * 2); ctx.fill();
  }
  function drawText(t) {
    const s = Render.worldToScreen(t.x, t.y); const a = 1 - t.t / t.dur;
    ctx.globalAlpha = Math.max(0, Math.min(1, a * 1.5));
    ctx.font = 'bold ' + Math.round(scale * 0.42 * t.size) + 'px sans-serif'; ctx.textAlign = 'center';
    ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(0,0,0,0.8)'; ctx.strokeText(t.txt, s.x, s.y); ctx.fillStyle = t.color; ctx.fillText(t.txt, s.x, s.y);
    ctx.globalAlpha = 1;
  }
  function drawMinimap(S) {
    const size = Math.min(120, W * 0.14); const x0 = W - size - 12, y0 = 12; const k = size / Math.max(S.w, S.h);
    ctx.fillStyle = 'rgba(0,0,0,0.45)'; ctx.fillRect(x0, y0, size, size); ctx.strokeStyle = 'rgba(255,255,255,0.3)'; ctx.lineWidth = 1; ctx.strokeRect(x0, y0, size, size);
    for (const e of S.enemies) { if (e.dead || e.hidden) continue; ctx.fillStyle = e.elite.rank === 'boss' ? '#b36cff' : e.elite.rank !== 'normal' ? DATA.ELITE_RANKS[e.elite.rank].color : '#e44'; ctx.fillRect(x0 + e.x * k - 1.5, y0 + e.y * k - 1.5, 3, 3); }
    for (const m of S.minions) { if (m.dead) continue; ctx.fillStyle = '#6f8cff'; ctx.fillRect(x0 + m.x * k - 1, y0 + m.y * k - 1, 2, 2); }
    for (const d of S.drops) { if (d.taken || d.kind !== 'item' || DATA.RARITY[d.item.rarity].order < 3) continue; ctx.fillStyle = DATA.RARITY[d.item.rarity].color; ctx.fillRect(x0 + d.x * k - 2, y0 + d.y * k - 2, 4, 4); }
    if (S.exit) { ctx.fillStyle = '#6f8cff'; ctx.fillRect(x0 + S.exit.x * k - 3, y0 + S.exit.y * k - 3, 6, 6); }
    if (S.chest && !S.chest.opened) { ctx.fillStyle = '#ffd76a'; ctx.fillRect(x0 + S.chest.x * k - 3, y0 + S.chest.y * k - 3, 6, 6); }
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(x0 + S.player.x * k, y0 + S.player.y * k, 3, 0, Math.PI * 2); ctx.fill();
  }
  function drawJoystick(j) {
    if (!j.active) return;
    ctx.globalAlpha = 0.5; ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(j.ox, j.oy, j.radius, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.5)'; ctx.beginPath(); ctx.arc(j.ox + j.dx * j.radius, j.oy + j.dy * j.radius, j.radius * 0.4, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = 1;
  }

  // ------------------------------------------------------------- input
  const Input = { joystick: { active: false, id: null, ox: 0, oy: 0, dx: 0, dy: 0, radius: 60 }, keys: {}, mouse: null, enabled: false };
  Input.init = function (c, onSkill) {
    const js = Input.joystick;
    const rect = () => c.getBoundingClientRect();
    c.addEventListener('touchstart', (ev) => {
      if (!Input.enabled) return; ev.preventDefault();
      for (const t of ev.changedTouches) { const r = rect(); const x = t.clientX - r.left, y = t.clientY - r.top; if (!js.active && x < r.width * 0.55) { js.active = true; js.id = t.identifier; js.ox = x; js.oy = y; js.dx = 0; js.dy = 0; } }
    }, { passive: false });
    c.addEventListener('touchmove', (ev) => {
      if (!Input.enabled) return; ev.preventDefault();
      for (const t of ev.changedTouches) { if (js.active && t.identifier === js.id) { const r = rect(); const x = t.clientX - r.left, y = t.clientY - r.top; let dx = (x - js.ox) / js.radius, dy = (y - js.oy) / js.radius; const l = Math.hypot(dx, dy); if (l > 1) { dx /= l; dy /= l; js.ox = x - dx * js.radius; js.oy = y - dy * js.radius; } js.dx = dx; js.dy = dy; } }
    }, { passive: false });
    const end = (ev) => { for (const t of ev.changedTouches) { if (js.active && t.identifier === js.id) { js.active = false; js.dx = 0; js.dy = 0; } } };
    c.addEventListener('touchend', end); c.addEventListener('touchcancel', end);
    window.addEventListener('keydown', (ev) => { if (!Input.enabled) return; const k = ev.key.toLowerCase(); Input.keys[k] = true; if (ev.key >= '1' && ev.key <= '6') { onSkill('skill', +ev.key - 1); ev.preventDefault(); } else if (ev.code === 'Space') { onSkill('evade'); ev.preventDefault(); } else if (k === 'q') onSkill('potion'); else if (k === 'z') onSkill('mount'); else if (k === 't') onSkill('portal'); else if (k === 'escape' || k === 'i' || k === 'k' || k === 'c') onSkill('menu', k); });
    window.addEventListener('keyup', (ev) => { Input.keys[ev.key.toLowerCase()] = false; });
    c.addEventListener('mousedown', (ev) => { if (!Input.enabled) return; ev.preventDefault(); if (ev.button === 0) onSkill('skill', 0); else if (ev.button === 2) onSkill('skill', 1); });
    c.addEventListener('contextmenu', (ev) => ev.preventDefault());
  };
  Input.vector = function () {
    const js = Input.joystick; if (js.active) return { x: js.dx, y: js.dy };
    let x = 0, y = 0; const k = Input.keys;
    if (k.a || k.arrowleft) x -= 1; if (k.d || k.arrowright) x += 1; if (k.w || k.arrowup) y -= 1; if (k.s || k.arrowdown) y += 1;
    const l = Math.hypot(x, y); if (l > 1) { x /= l; y /= l; }
    return { x, y };
  };
  Render.Input = Input;
  window.Render = Render; window.Input = Input;
})();
