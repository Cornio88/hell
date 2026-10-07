/* Sanctuary — WebGL renderer with a Diablo-style overhead camera (global: Render3D) + character preview (Render3D.CharView).
   Same interface as the 2D renderer: init(canvas, overlay), resize(), draw(S, hud). */
(function () {
  'use strict';
  const T = window.THREE;
  const R = {};
  let canvas, overlay, octx, renderer, scene, camera, W = 1, H = 1, dpr = 1;
  let lights = {}, world = null, quality = 'high';
  const CAM_OFF = new T.Vector3(0, 21, 13.5);
  const camTarget = new T.Vector3(), camPos = new T.Vector3();
  const ents = new Map();
  const tmpV = new T.Vector3();
  let frameNo = 0, lastTime = 0;
  const texCache = {};
  const PI = Math.PI;

  R.available = function () { try { const c = document.createElement('canvas'); return !!(window.WebGLRenderingContext && (c.getContext('webgl') || c.getContext('experimental-webgl'))); } catch (e) { return false; } };

  R.init = function (c, ov) {
    canvas = c; overlay = ov; octx = overlay.getContext('2d');
    renderer = new T.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
    renderer.outputColorSpace = T.SRGBColorSpace;
    renderer.toneMapping = T.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
    renderer.shadowMap.enabled = true; renderer.shadowMap.type = T.PCFSoftShadowMap;
    scene = new T.Scene();
    camera = new T.PerspectiveCamera(30, 1, 0.5, 120);
    lights.hemi = new T.HemisphereLight(0xbfd4ff, 0x3a2a1a, 0.55); scene.add(lights.hemi);
    lights.dir = new T.DirectionalLight(0xffe9c8, 1.4); lights.dir.position.set(-10, 24, 8); lights.dir.castShadow = true;
    lights.dir.shadow.mapSize.set(2048, 2048); lights.dir.shadow.camera.left = -18; lights.dir.shadow.camera.right = 18; lights.dir.shadow.camera.top = 18; lights.dir.shadow.camera.bottom = -18; lights.dir.shadow.camera.near = 1; lights.dir.shadow.camera.far = 70; lights.dir.shadow.bias = -0.0008;
    scene.add(lights.dir); scene.add(lights.dir.target);
    lights.torch = new T.PointLight(0xffb070, 1.2, 12, 1.5); scene.add(lights.torch);
    lights.buff = new T.PointLight(0xffffff, 0, 9, 1.5); scene.add(lights.buff);
    R.setQuality(quality);
    R.resize();
    window.addEventListener('resize', R.resize);
  };
  R.setQuality = function (q) {
    quality = q || 'high';
    if (!renderer) return;
    renderer.shadowMap.enabled = quality !== 'low';
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, quality === 'high' ? 1.6 : quality === 'medium' ? 1.25 : 1));
    if (lights.dir) lights.dir.shadow.mapSize.set(quality === 'high' ? 2048 : 1024, quality === 'high' ? 2048 : 1024);
    scene.traverse(o => { if (o.material) o.material.needsUpdate = true; });
  };
  R.resize = function () {
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    W = Math.max(1, Math.floor(rect.width)); H = Math.max(1, Math.floor(rect.height));
    renderer.setSize(W, H, false);
    camera.aspect = W / H; camera.updateProjectionMatrix();
    dpr = Math.min(2, window.devicePixelRatio || 1);
    overlay.width = Math.floor(W * dpr); overlay.height = Math.floor(H * dpr);
  };
  R.worldToScreen = function (x, y, h) { tmpV.set(x, h || 0, y).project(camera); return { x: (tmpV.x + 1) / 2 * W, y: (1 - tmpV.y) / 2 * H }; };

  // ---------------------------------------------------------------- textures
  function groundTexture(zone) {
    const key = zone.id; if (texCache[key]) return texCache[key];
    const c = document.createElement('canvas'); c.width = c.height = 512; const g = c.getContext('2d');
    const base = zone.ground2, alt = zone.ground;
    g.fillStyle = base; g.fillRect(0, 0, 512, 512);
    const rng = U.seededRng(77);
    // soft large-scale mottling (seamless: draw wrapped copies)
    const blob = (x, y, r, col, a) => { for (const dx of [-512, 0, 512]) for (const dy of [-512, 0, 512]) { const gr = g.createRadialGradient(x + dx, y + dy, 0, x + dx, y + dy, r); gr.addColorStop(0, U.rgba(col, a)); gr.addColorStop(1, U.rgba(col, 0)); g.fillStyle = gr; g.beginPath(); g.arc(x + dx, y + dy, r, 0, PI * 2); g.fill(); } };
    for (let i = 0; i < 60; i++) blob(rng() * 512, rng() * 512, 40 + rng() * 90, rng() < 0.5 ? alt : U.mixHex(base, '#ffffff', 0.1), 0.22);
    for (let i = 0; i < 900; i++) { g.fillStyle = U.rgba(rng() < 0.5 ? U.mixHex(base, '#000000', 0.25) : U.mixHex(base, '#ffffff', 0.12), 0.18 + rng() * 0.2); const sz = 1 + rng() * 3; g.fillRect(rng() * 512, rng() * 512, sz, sz); }
    const d = zone.decor;
    if (d === 'snow') { for (let i = 0; i < 24; i++) blob(rng() * 512, rng() * 512, 50 + rng() * 80, '#e8eef8', 0.35); }
    else if (d === 'forest' || d === 'jungle') { for (let i = 0; i < 260; i++) { g.strokeStyle = U.rgba(U.mixHex(base, '#7dff5c', 0.3), 0.35); g.lineWidth = 1.2; const x = rng() * 512, y = rng() * 512; g.beginPath(); g.moveTo(x, y); g.lineTo(x + (rng() - 0.5) * 5, y - 5 - rng() * 6); g.stroke(); } }
    else if (d === 'salt' || d === 'desert') { g.strokeStyle = U.rgba(U.mixHex(base, '#000000', 0.3), 0.3); g.lineWidth = 1; for (let i = 0; i < 22; i++) { let x = rng() * 512, y = rng() * 512; g.beginPath(); g.moveTo(x, y); for (let k = 0; k < 7; k++) { x += (rng() - 0.5) * 70; y += (rng() - 0.5) * 70; g.lineTo(x, y); } g.stroke(); } }
    else if (d === 'swamp') { for (let i = 0; i < 14; i++) blob(rng() * 512, rng() * 512, 40 + rng() * 60, '#2a5a6a', 0.4); }
    const tex = new T.CanvasTexture(c); tex.wrapS = tex.wrapT = T.RepeatWrapping; tex.colorSpace = T.SRGBColorSpace; tex.anisotropy = 4;
    texCache[key] = tex; return tex;
  }
  function glowSprite() {
    if (texCache.glow) return texCache.glow;
    const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d'); const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.4, 'rgba(255,255,255,0.5)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
    texCache.glow = new T.CanvasTexture(c); return texCache.glow;
  }

  // ---------------------------------------------------------------- world build
  function buildWorld(S) {
    if (world) { scene.remove(world.group); disposeGroup(world.group); }
    for (const [, e] of ents) scene.remove(e.model.group); ents.clear();
    fxPools.forEach(p => p.clear());
    world = { S, group: new T.Group(), floor: S.floor, zoneId: S.zone.id };
    const z = S.zone; const g = world.group;
    scene.background = new T.Color(U.mixHex(z.ground, '#000000', 0.55));
    scene.fog = new T.Fog(scene.background, 26, 60);
    const tex = groundTexture(z); tex.repeat.set(S.w / 9, S.h / 9);
    const ground = new T.Mesh(new T.PlaneGeometry(S.w, S.h), new T.MeshStandardMaterial({ map: tex, roughness: 1, metalness: 0 }));
    ground.rotation.x = -PI / 2; ground.position.set(S.w / 2, 0, S.h / 2); ground.receiveShadow = true; g.add(ground);
    // surrounding darkness floor so the void isn't visible
    const outer = new T.Mesh(new T.PlaneGeometry(S.w + 80, S.h + 80), new T.MeshStandardMaterial({ color: U.mixHex(z.ground, '#000000', 0.6), roughness: 1 }));
    outer.rotation.x = -PI / 2; outer.position.set(S.w / 2, -0.05, S.h / 2); g.add(outer);
    // border walls
    const wallM = Models.mat(U.mixHex(z.ground2, '#000000', 0.35), { rough: 0.95, flat: true });
    const mk = (w, d, x, zz) => { const m = new T.Mesh(new T.BoxGeometry(w, 1.6, d), wallM); m.position.set(x, 0.8, zz); m.castShadow = true; m.receiveShadow = true; g.add(m); };
    mk(S.w + 2, 1, S.w / 2, -0.5); mk(S.w + 2, 1, S.w / 2, S.h + 0.5); mk(1, S.h + 2, -0.5, S.h / 2); mk(1, S.h + 2, S.w + 0.5, S.h / 2);
    for (let i = 0; i < 14; i++) { const t = i / 14; [[-0.5, t * S.h], [S.w + 0.5, t * S.h], [t * S.w, -0.5], [t * S.w, S.h + 0.5]].forEach(([x, zz]) => { const p = new T.Mesh(Models.geo('post', () => new T.CylinderGeometry(0.25, 0.3, 2.4, 6)), wallM); p.position.set(x, 1.2, zz); g.add(p); }); }
    S.obstacles.forEach(o => { const m = Models.obstacle(o, z.decor); m.position.set(o.x, 0, o.y); g.add(m); });
    // decor instanced
    const decoGeo = z.decor === 'snow' || z.decor === 'salt' || z.decor === 'desert' ? new T.DodecahedronGeometry(0.14, 0) : new T.ConeGeometry(0.1, 0.32, 4), decoMat = Models.mat(U.mixHex(z.ground2, z.decor === 'snow' ? '#ffffff' : z.decor === 'desert' || z.decor === 'salt' ? '#8a7a60' : '#7dff5c', 0.3), { rough: 1, flat: true });
    const inst = new T.InstancedMesh(decoGeo, decoMat, S.decor.length); const mtx = new T.Matrix4();
    S.decor.forEach((d, i) => { mtx.makeRotationY(d.k); mtx.setPosition(d.x, 0.1 * d.s, d.y); mtx.scale(new T.Vector3(1 + d.s, 1 + d.s * 2, 1 + d.s)); inst.setMatrixAt(i, mtx); });
    inst.receiveShadow = true; g.add(inst);
    scene.add(g);
    camTarget.set(S.player.x, 0, S.player.y); camPos.copy(camTarget).add(CAM_OFF);
  }
  function disposeGroup(g) { g.traverse(o => { if (o.geometry && !o.geometry.userData.shared) { /* geometry cached in Models for most; dispose only unique */ } }); }

  // ---------------------------------------------------------------- generic pools for transient effects
  class Pool {
    constructor(create, update) { this.map = new Map(); this.create = create; this.update = update; this.seen = new Set(); }
    sync(items, keyOf, extra) {
      this.seen.clear();
      for (const it of items) { const k = keyOf(it); if (k === undefined || k === null) continue; this.seen.add(k); let o = this.map.get(k); if (!o) { o = this.create(it, extra); if (!o) continue; scene.add(o.obj); this.map.set(k, o); } this.update(o, it, extra); }
      for (const [k, o] of this.map) if (!this.seen.has(k)) { scene.remove(o.obj); this.map.delete(k); }
    }
    clear() { for (const [, o] of this.map) scene.remove(o.obj); this.map.clear(); }
  }
  const fxPools = [];
  const mkPool = (c, u) => { const p = new Pool(c, u); fxPools.push(p); return p; };
  const flatGeo = (key, make) => Models.geo(key, make);
  const circleGeo = () => flatGeo('circle1', () => new T.CircleGeometry(1, 40));
  const ringGeo = () => flatGeo('ring1', () => new T.RingGeometry(0.9, 1, 48));
  const thinRing = () => flatGeo('ring2', () => new T.RingGeometry(0.96, 1, 48));
  function sectorGeo(arc) { const k = 'sector' + Math.round(arc * 100); return flatGeo(k, () => { const sh = new T.Shape(); sh.moveTo(0, 0); sh.absarc(0, 0, 1, -arc / 2, arc / 2, false); sh.lineTo(0, 0); return new T.ShapeGeometry(sh, 24); }); }
  function flatMat(color, opacity, emissive) { const m = new T.MeshBasicMaterial({ color, transparent: true, opacity, depthWrite: false, side: T.DoubleSide }); return m; }
  function flatMesh(g, color, opacity) { const m = new T.Mesh(g, flatMat(color, opacity)); m.rotation.x = -PI / 2; m.renderOrder = 2; return m; }
  // facing angle -> rotation about Y so local +X points along facing on ground. For flat meshes rotated -PI/2 about X, local +X maps to world +X and local +Y maps to world -Z; so to face angle a (cos→X, sin→Z) rotate by -a around world Y.
  const faceRot = (a) => -a;

  const zonePool = mkPool((z) => { const g = new T.Group(); const col = z.telegraph ? '#ff4040' : (DATA.ELEMENT_COLOR[z.element] || '#ffffff'); const fill = flatMesh(circleGeo(), col, z.telegraph ? 0.18 : 0.22); const inner = flatMesh(circleGeo(), col, z.telegraph ? 0.35 : 0.12); const ring = flatMesh(ringGeo(), col, 0.6); g.add(fill); g.add(inner); g.add(ring); g.position.set(z.x, 0.03, z.y); return { obj: g, fill, inner, ring }; },
    (o, z) => { o.obj.position.set(z.x, 0.03, z.y); const r = z.radius; o.fill.scale.set(r, r, 1); o.ring.scale.set(r, r, 1); if (z.telegraph) o.inner.scale.set(r * (z.t / z.dur), r * (z.t / z.dur), 1); else { o.inner.scale.set(r * 0.5, r * 0.5, 1); o.ring.rotation.z += 0.02; } });
  const beamPool = mkPool((b) => {
    const col = b.color || '#ffffff'; let obj, kind = b.kind;
    if (kind === 'arc') { obj = flatMesh(sectorGeo(b.arc), col, 0.45); obj.position.set(b.x, 0.06, b.y); obj.rotation.z = faceRot(b.dir); obj.scale.set(b.range, b.range, 1); }
    else if (kind === 'ring' || kind === 'telegraphRing') { obj = flatMesh(kind === 'ring' ? ringGeo() : thinRing(), col, 0.8); obj.position.set(b.x, 0.06, b.y); }
    else if (kind === 'spin') { obj = flatMesh(sectorGeo(2.4), col, 0.35); obj.position.set(b.x, 0.08, b.y); obj.scale.set(b.radius, b.radius, 1); }
    else if (kind === 'line') { const len = U.dist(b.x1, b.y1, b.x2, b.y2); obj = new T.Mesh(Models.geo('unitbox', () => new T.BoxGeometry(1, 1, 1)), new T.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.9 })); obj.scale.set(len, 0.12, 0.12); obj.position.set((b.x1 + b.x2) / 2, 0.9, (b.y1 + b.y2) / 2); obj.rotation.y = -Math.atan2(b.y2 - b.y1, b.x2 - b.x1); if (Math.abs(b.y1 - b.y2) > 4 && Math.abs(b.x1 - b.x2) < 0.01) { obj.rotation.set(0, 0, PI / 2); obj.scale.set(0.12, 7, 0.12); obj.position.set(b.x2, 3.5, b.y2); } }
    else return null;
    return { obj, kind };
  }, (o, b) => { const a = Math.max(0, 1 - b.t / b.dur); o.obj.material.opacity = (o.kind === 'line' ? 0.9 : o.kind === 'telegraphRing' ? 0.8 : 0.5) * a; if (o.kind === 'ring') { const s = b.radius * (0.4 + 0.6 * (b.t / b.dur)); o.obj.scale.set(s, s, 1); } if (o.kind === 'telegraphRing') { o.obj.scale.set(b.radius, b.radius, 1); o.obj.material.opacity = 0.5 + 0.5 * (b.t / b.dur); } if (o.kind === 'spin') o.obj.rotation.z += 0.5; });
  const telePool = mkPool((e) => {
    const tg = e.ai.telegraph; let obj; const col = '#ff4a4a';
    if (tg.kind === 'swing') { obj = flatMesh(sectorGeo(1.2), col, 0.35); obj.scale.set(e.range + 0.6, e.range + 0.6, 1); }
    else if (tg.kind === 'nova') { const g = new T.Group(); const f = flatMesh(circleGeo(), col, 0.18); const i = flatMesh(circleGeo(), col, 0.35); g.add(f); g.add(i); g.userData.inner = i; f.scale.set(tg.radius, tg.radius, 1); obj = g; }
    else if (tg.kind === 'cone') { const g = new T.Group(); const f = flatMesh(sectorGeo(tg.arc), col, 0.2); const i = flatMesh(sectorGeo(tg.arc), col, 0.35); f.scale.set(tg.range, tg.range, 1); g.add(f); g.add(i); g.userData.inner = i; obj = g; }
    else if (tg.kind === 'charge') { const g = new T.Group(); const f = new T.Mesh(Models.geo('unitplane', () => new T.PlaneGeometry(1, 1)), flatMat(col, 0.2)); f.rotation.x = -PI / 2; f.scale.set(tg.range, (e.r + 0.4) * 2, 1); f.position.x = tg.range / 2; const i = new T.Mesh(Models.geo('unitplane', () => new T.PlaneGeometry(1, 1)), flatMat(col, 0.35)); i.rotation.x = -PI / 2; i.scale.set(0.01, (e.r + 0.4) * 2, 1); g.add(f); g.add(i); g.userData.inner = i; g.userData.range = tg.range; obj = g; }
    else { obj = flatMesh(thinRing(), '#ffd060', 0.7); obj.scale.set(e.r + 0.3, e.r + 0.3, 1); }
    obj.position.set(e.x, 0.07, e.y); return { obj, tg };
  }, (o, e) => { const tg = e.ai.telegraph; const f = Math.min(1, tg.t / tg.dur); o.obj.position.set(e.x, 0.07, e.y); if (tg.kind === 'swing') o.obj.rotation.z = faceRot(e.facing); if (tg.kind === 'cone') { o.obj.rotation.y = faceRot(tg.dir); o.obj.userData.inner.scale.set(tg.range * f, tg.range * f, 1); } if (tg.kind === 'nova') o.obj.userData.inner.scale.set(tg.radius * f, tg.radius * f, 1); if (tg.kind === 'charge') { o.obj.rotation.y = faceRot(tg.dir); const i = o.obj.userData.inner; i.scale.x = Math.max(0.01, o.obj.userData.range * f); i.position.x = i.scale.x / 2; } });
  const projPool = mkPool((pr) => {
    const g = new T.Group(); const col = pr.color || '#ffffff'; const r = pr.size || 0.4;
    if (pr.orbit) { const m = Models.mat(col, { emissive: col, eint: 1.2, metal: 0.6, rough: 0.3 }); const a = new T.Mesh(Models.geo('unitbox', () => new T.BoxGeometry(1, 1, 1)), m); a.scale.set(r * 2, r * 0.6, r * 0.6); const b = a.clone(); b.scale.set(r * 0.6, r * 2, r * 0.6); g.add(a); g.add(b); g.userData.spin = true; }
    else if (pr.wander || (pr.res && pr.res.id === 'tornado')) { for (let i = 0; i < 4; i++) { const rg = new T.Mesh(Models.geo('torus_t', () => new T.TorusGeometry(1, 0.08, 6, 20)), new T.MeshBasicMaterial({ color: '#dfe6ee', transparent: true, opacity: 0.6 })); rg.rotation.x = PI / 2; rg.position.y = 0.3 + i * 0.5; rg.scale.setScalar(r * (0.5 + i * 0.35)); g.add(rg); } g.userData.spin = true; }
    else if (pr.radius >= 1) { const m = new T.Mesh(Models.geo('ico_p', () => new T.IcosahedronGeometry(1, 1)), Models.mat(pr.team === 1 ? col : '#8a8a80', { rough: 0.9, flat: true, emissive: pr.team === 1 ? col : undefined, eint: 0.6 })); m.scale.setScalar(r * 0.9); m.position.y = r * 0.9; m.castShadow = true; g.add(m); g.userData.roll = true; }
    else { const m = new T.Mesh(Models.geo('sph_p', () => new T.SphereGeometry(1, 10, 8)), Models.mat(col, { emissive: col, eint: 1.5, rough: 0.3 })); m.scale.setScalar(r * 0.6); g.add(m); const sp = new T.Sprite(new T.SpriteMaterial({ map: glowSprite(), color: col, transparent: true, opacity: 0.8, blending: T.AdditiveBlending, depthWrite: false })); sp.scale.setScalar(r * 3); g.add(sp); if (pr.spectre) { m.material = Models.mat(col, { opacity: 0.5, emissive: col, eint: 0.8 }); m.scale.set(r, r * 1.6, r); } }
    g.position.set(pr.x, 0.9, pr.y); return { obj: g };
  }, (o, pr) => { o.obj.position.set(pr.x, pr.orbit ? 1.0 : (pr.radius >= 1 ? 0 : 0.9), pr.y); if (o.obj.userData.spin) o.obj.rotation.y += 0.25; if (o.obj.userData.roll) { o.obj.rotation.x += 0.2; } });
  const dropPool = mkPool((d) => {
    let obj;
    if (d.kind === 'gold') obj = Models.goldDrop(); else if (d.kind === 'material') { obj = new T.Mesh(Models.geo('unitbox', () => new T.BoxGeometry(1, 1, 1)), Models.mat(DATA.MATERIALS[d.id].color, { emissive: DATA.MATERIALS[d.id].color, eint: 0.3 })); obj.scale.setScalar(0.3); obj.position.y = 0.15; }
    else if (d.kind === 'potion') { obj = new T.Mesh(Models.geo('sph_p', () => new T.SphereGeometry(1, 10, 8)), Models.mat('#ff4a4a', { emissive: '#ff2020', eint: 0.6, opacity: 0.9 })); obj.scale.setScalar(0.22); obj.position.y = 0.25; }
    else if (d.kind === 'gem') obj = Models.gemDrop(DATA.GEMS[d.gem].color, false);
    else { const rd = DATA.RARITY[d.item.rarity]; const g = new T.Group(); g.add(Models.gemDrop(rd.color, rd.order >= 3)); if (rd.order >= 3) { const beam = new T.Mesh(Models.geo('unitbox', () => new T.BoxGeometry(1, 1, 1)), new T.MeshBasicMaterial({ color: rd.color, transparent: true, opacity: 0.35, depthWrite: false })); beam.scale.set(0.12, 6, 0.12); beam.position.y = 3; g.add(beam); const sp = new T.Sprite(new T.SpriteMaterial({ map: glowSprite(), color: rd.color, transparent: true, opacity: 0.7, blending: T.AdditiveBlending, depthWrite: false })); sp.scale.setScalar(1.6); sp.position.y = 0.4; g.add(sp); } obj = g; }
    const g = new T.Group(); g.add(obj); g.position.set(d.x, 0, d.y); return { obj: g, inner: obj };
  }, (o, d) => { o.obj.position.set(d.x, 0.08 + Math.sin(d.t * 3) * 0.05, d.y); o.inner.rotation.y += 0.02; });
  const corpsePool = mkPool((c) => { const g = Models.corpse(); g.position.set(c.x, 0, c.y); g.rotation.y = Math.random() * 6; return { obj: g }; }, (o, c) => { });
  const orbPool = mkPool((ob) => { const g = new T.Group(); g.add(Models.orb()); const sp = new T.Sprite(new T.SpriteMaterial({ map: glowSprite(), color: '#ff3b3b', transparent: true, opacity: 0.7, blending: T.AdditiveBlending, depthWrite: false })); sp.scale.setScalar(1.6); sp.position.y = 0.35; g.add(sp); g.position.set(ob.x, 0, ob.y); return { obj: g }; }, (o, ob) => { o.obj.position.y = Math.sin(ob.t * 6) * 0.08; });
  const wallPool = mkPool((w) => { const m = Models.wallSegment(w.color); m.position.set(w.x, 0, w.y); return { obj: m }; }, (o, w) => { o.obj.scale.y = Math.min(1, w.t * 3); });
  const miscPool = mkPool((it) => { let obj; if (it.kind === 'chest') obj = Models.chest(); else obj = Models.stairs(); obj.position.set(it.x, 0, it.y); return { obj, kind: it.kind }; }, (o, it) => { if (o.kind === 'chest' && it.opened && o.obj.userData.lid) o.obj.userData.lid.rotation.x = -1.2; });
  // particles
  let points = null, pPos = null, pCol = null; const MAXP = 500;
  function ensureParticles() { if (points) return; const g = new T.BufferGeometry(); pPos = new Float32Array(MAXP * 3); pCol = new Float32Array(MAXP * 3); g.setAttribute('position', new T.BufferAttribute(pPos, 3)); g.setAttribute('color', new T.BufferAttribute(pCol, 3)); points = new T.Points(g, new T.PointsMaterial({ size: 0.22, vertexColors: true, transparent: true, opacity: 0.95, depthWrite: false, map: glowSprite(), blending: T.AdditiveBlending, sizeAttenuation: true })); points.frustumCulled = false; scene.add(points); }
  function updateParticles(S) {
    ensureParticles(); const n = Math.min(MAXP, S.particles.length); const col = new T.Color();
    for (let i = 0; i < n; i++) { const p = S.particles[i]; pPos[i * 3] = p.x; pPos[i * 3 + 1] = 0.6 + (1 - p.t / p.life) * 0.6; pPos[i * 3 + 2] = p.y; col.set(p.color); pCol[i * 3] = col.r; pCol[i * 3 + 1] = col.g; pCol[i * 3 + 2] = col.b; }
    points.geometry.setDrawRange(0, n); points.geometry.attributes.position.needsUpdate = true; points.geometry.attributes.color.needsUpdate = true;
  }

  // ---------------------------------------------------------------- entities
  function entityKey(e) { return e.id; }
  function getModel(e, S) {
    let rec = ents.get(e.id);
    const form = e.kind === 'player' ? (e.form || null) : null;
    const cosKey = e.kind === 'player' ? JSON.stringify(Models.playerOptions(S.char, form)) : null;
    if (rec && e.kind === 'player' && rec.key !== cosKey) { scene.remove(rec.model.group); rec = null; }
    if (!rec) {
      let model;
      if (e.kind === 'player') model = new Models.Humanoid(Models.playerOptions(S.char, form));
      else if (e.kind === 'enemy') model = Models.monster(e.def, e.elite.rank);
      else model = Models.minion(e.type, e.variant, e.element);
      rec = { model, key: cosKey, horse: null, lastHp: e.hp };
      if (e.kind === 'enemy' && e.elite.rank === 'normal') model.group.traverse(c => { if (c.isMesh) c.castShadow = false; });
      scene.add(model.group); ents.set(e.id, rec);
    }
    return rec;
  }
  function updateEntities(S, dt) {
    const alive = new Set();
    const all = [S.player].concat(S.enemies, S.minions.filter(m => !m.dead || m.respawn === undefined));
    for (const e of all) {
      if (e.kind === 'minion' && e.dead) continue;
      alive.add(e.id);
      const rec = getModel(e, S); const m = rec.model;
      const g = m.group; g.visible = !e.hidden;
      g.position.set(e.x, 0, e.y);
      const facing = e.facing !== undefined ? e.facing : 0;
      g.rotation.y = Math.atan2(Math.cos(facing), Math.sin(facing));
      const st = { moving: e.kind === 'player' ? e.moving : (e.kind === 'enemy' ? !e.dead && !(e.ai && e.ai.telegraph) && (e.ai && e.ai.state !== 'idle') : true), speed: e.speed || 4, attack: 0, dead: !!e.dead, mounted: !!e.mounted, channel: !!e.channel, dash: !!e.dash };
      if (e.kind === 'player') { st.attack = e.attackTimer > 0 ? Math.min(1, e.attackTimer / 0.6) : 0; if (m.setForm) m.setForm(e.form || null); }
      else if (e.kind === 'enemy') { const tg = e.ai && e.ai.telegraph; st.attack = tg ? Math.max(0.01, 1 - tg.t / tg.dur) : 0; st.moving = !e.dead && !tg && !(e.hitStun > 0) && !!(e.ai && e.ai.target) && !e.st.stun && !e.st.freeze; }
      else { st.attack = e.cd !== undefined && e.cd > (e.atkCd - 0.25) ? 0.5 : 0; st.moving = true; }
      // movement detection for enemies/minions: compare position
      if (e.kind !== 'player') { const moved = rec.lx !== undefined && (Math.abs(rec.lx - e.x) + Math.abs(rec.lz - e.y)) > 0.01; st.moving = moved; rec.lx = e.x; rec.lz = e.y; }
      m.update(st, dt);
      // hit flash
      if (e.hitFlash > 0 && !rec.flashed) { rec.flashed = true; g.traverse(c => { if (c.isMesh && c.material.emissive) { c.userData.em = c.material; c.material = c.material.clone(); c.material.emissive.set('#ffffff'); c.material.emissiveIntensity = 0.7; } }); }
      else if (!(e.hitFlash > 0) && rec.flashed) { rec.flashed = false; g.traverse(c => { if (c.isMesh && c.userData.em) { c.material = c.userData.em; c.userData.em = null; } }); }
      // frozen tint
      if (e.kind === 'enemy') { const frozen = !!(e.st.freeze || (e.st.stun && e.st.stun.petrify)); if (frozen !== rec.frozen) { rec.frozen = frozen; g.traverse(c => { if (c.isMesh) { if (frozen) { c.userData.fm = c.material; c.material = Models.mat(e.st.freeze ? '#9fd8ff' : '#8a8a8a', { rough: 0.3, metal: 0.2, opacity: 0.9 }); } else if (c.userData.fm) { c.material = c.userData.fm; c.userData.fm = null; } } }); } }
      // player mount
      if (e.kind === 'player') {
        const wantHorse = e.mounted ? S.char.mount.current : null;
        if (rec.horseId !== wantHorse) { if (rec.horse) { scene.remove(rec.horse.group); rec.horse = null; } rec.horseId = wantHorse; if (wantHorse) { rec.horse = Models.horse(DATA.mountById[wantHorse], DATA.MOUNT_ARMOR.find(a => a.id === S.char.mount.armor)); scene.add(rec.horse.group); } }
        if (rec.horse) { rec.horse.group.position.set(e.x, 0, e.y); rec.horse.group.rotation.y = g.rotation.y; rec.horse.update({ moving: e.moving, speed: 9, attack: 0 }, dt); g.position.y = 1.0 + rec.horse.parts.root.position.y; }
        // stealth/transparency
        const op = e.stealth > 0 ? 0.35 : 1; if (rec.op !== op) { rec.op = op; g.traverse(c => { if (c.isMesh) { c.material = c.material.clone(); c.material.transparent = op < 1; c.material.opacity = op; } }); }
      }
    }
    for (const [k, rec] of ents) if (!alive.has(k)) { scene.remove(rec.model.group); if (rec.horse) scene.remove(rec.horse.group); ents.delete(k); }
  }

  // ---------------------------------------------------------------- player auras / lights
  let auraRing = null, barrierShell = null, channelRing = null;
  function updatePlayerFx(S) {
    const p = S.player;
    if (!auraRing) { auraRing = flatMesh(thinRing(), '#fff2a6', 0.6); scene.add(auraRing); barrierShell = new T.Mesh(Models.geo('sph_p', () => new T.SphereGeometry(1, 10, 8)), new T.MeshBasicMaterial({ color: '#ffe9a0', transparent: true, opacity: 0.18, depthWrite: false })); scene.add(barrierShell); channelRing = flatMesh(ringGeo(), '#ffffff', 0.25); scene.add(channelRing); }
    const yOff = p.mounted ? 1.0 : 0;
    auraRing.visible = !!p.auraActive || p.buffs.some(b => b.aura); auraRing.position.set(p.x, 0.05, p.y); const ab = p.buffs.find(b => b.aura); const ar = ab ? ab.aura.radius : 2.2; auraRing.scale.set(ar, ar, 1); auraRing.material.color.set(ab && ab.res ? DATA.ELEMENT_COLOR[ab.res.element] : '#fff2a6'); auraRing.rotation.z += 0.01;
    barrierShell.visible = p.barrier > 0 || p.immune > 0; barrierShell.position.set(p.x, 0.9 + yOff, p.y); barrierShell.scale.setScalar(p.immune > 0 ? 1.1 : 0.95); barrierShell.material.color.set(p.immune > 0 ? '#ffffff' : '#ffe9a0');
    channelRing.visible = !!p.channel; if (p.channel) { channelRing.position.set(p.x, 0.04, p.y); const r = p.channel.res.eff.radius || 2; channelRing.scale.set(r, r, 1); channelRing.rotation.z += 0.3; }
    lights.torch.position.set(p.x, 2.2 + yOff, p.y);
    const glow = p.buffs.find(b => b.glow); const berserk = !!p.st.berserk;
    if (glow || berserk) { lights.buff.intensity = 1.6; lights.buff.color.set(glow ? glow.glow : '#ff6a4a'); lights.buff.position.set(p.x, 1.2 + yOff, p.y); } else lights.buff.intensity = 0;
    lights.dir.target.position.set(p.x, 0, p.y); lights.dir.position.set(p.x - 10, 24, p.y + 8);
  }

  // ---------------------------------------------------------------- overlay (2D labels, bars, texts, minimap, joystick)
  function drawOverlay(S, hud) {
    const g = octx; g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, W, H);
    const fontPx = Math.round(Math.max(11, H / 60));
    const bar = (sx, sy, w, frac, color, shield) => { g.fillStyle = 'rgba(0,0,0,0.7)'; g.fillRect(sx - w / 2 - 1, sy - 1, w + 2, 6); g.fillStyle = color; g.fillRect(sx - w / 2, sy, w * U.clamp(frac, 0, 1), 4); if (shield) { g.fillStyle = 'rgba(255,233,160,0.9)'; g.fillRect(sx - w / 2, sy, w * U.clamp(shield, 0, 1), 2); } };
    const dots = (ent, sx, sy) => { const list = []; if (ent.st.vulnerable) list.push('#ffe55c'); if (ent.st.stun || ent.st.knockdown) list.push('#ffffff'); if (ent.st.freeze) list.push('#7fd6ff'); if (ent.st.slow || ent.st.chill || ent.st.decrepify) list.push('#9ad'); if (ent.st.immobilize) list.push('#c9a86a'); if (ent.st.fear) list.push('#b36cff'); if (ent.dots) { if (ent.dots.some(d => d.st === 'bleed')) list.push('#ff3b3b'); if (ent.dots.some(d => d.st === 'poison')) list.push('#7dff5c'); if (ent.dots.some(d => d.st === 'burn')) list.push('#ff7a2a'); if (ent.dots.some(d => d.st === 'shadow_dot')) list.push('#b36cff'); } if (ent.st.iron_maiden) list.push('#8a1a2a'); if (ent.st.taunt) list.push('#ff8c1a'); list.slice(0, 7).forEach((c, i) => { g.fillStyle = c; g.beginPath(); g.arc(sx - (list.length - 1) * 4 + i * 8, sy, 3, 0, PI * 2); g.fill(); }); };
    for (const e of S.enemies) {
      if (e.dead || e.hidden) continue; const h = e.def.shape === 'boss' ? 3.4 : 2.1 * (e.r / 0.55) + 0.2; const s = R.worldToScreen(e.x, e.y, Math.min(4.5, h)); if (s.x < -50 || s.x > W + 50 || s.y < -50 || s.y > H + 50) continue;
      const rank = e.elite.rank; const col = rank === 'boss' ? '#b36cff' : rank !== 'normal' ? DATA.ELITE_RANKS[rank].color : '#d33';
      if (e.hp < e.maxHp || rank !== 'normal') bar(s.x, s.y, rank === 'boss' ? 110 : 44, e.hp / e.maxHp, col, e.shield / e.maxHp);
      dots(e, s.x, s.y - 8);
      if (rank !== 'normal') { g.font = 'bold ' + fontPx + 'px sans-serif'; g.textAlign = 'center'; g.lineWidth = 3; g.strokeStyle = 'rgba(0,0,0,0.8)'; const txt = e.name + (e.elite.affixes.length ? ' · ' + e.elite.affixes.map(a => a.name).join(', ') : ''); g.strokeText(txt, s.x, s.y - 14); g.fillStyle = col; g.fillText(txt, s.x, s.y - 14); }
    }
    for (const m of S.minions) { if (m.dead || m.hp >= m.maxHp) continue; const s = R.worldToScreen(m.x, m.y, 1.9); bar(s.x, s.y, 26, m.hp / m.maxHp, '#6f8cff'); }
    { const p = S.player; const s = R.worldToScreen(p.x, p.y, (p.mounted ? 3.2 : 2.1) * (p.form === 'werebear' ? 1.35 : 1)); const marker = DATA.MARKERS.find(x => x.id === S.char.cosmetics.marker); g.font = 'bold ' + fontPx + 'px sans-serif'; g.textAlign = 'center'; g.lineWidth = 3; g.strokeStyle = 'rgba(0,0,0,0.8)'; const nm = (marker && marker.glyph ? marker.glyph + ' ' : '') + S.char.name; g.strokeText(nm, s.x, s.y - 4); g.fillStyle = '#fff'; g.fillText(nm, s.x, s.y - 4); dots(p, s.x, s.y + 6); if (p.portal > 0) { g.strokeStyle = '#6f8cff'; g.lineWidth = 4; g.beginPath(); g.arc(s.x, s.y + 60, 34, -PI / 2, -PI / 2 + PI * 2 * (1 - p.portal / 3)); g.stroke(); } }
    for (const d of S.drops) { if (d.taken || d.kind !== 'item') continue; const rd = DATA.RARITY[d.item.rarity]; if (!(U.dist(d.x, d.y, S.player.x, S.player.y) < 6 || rd.order >= 3)) continue; const s = R.worldToScreen(d.x, d.y, 1.0); g.font = 'bold ' + Math.round(fontPx * 0.9) + 'px sans-serif'; g.textAlign = 'center'; const tw = g.measureText(d.item.name).width; g.fillStyle = 'rgba(0,0,0,0.65)'; g.fillRect(s.x - tw / 2 - 5, s.y - fontPx, tw + 10, fontPx + 6); g.fillStyle = rd.color; g.fillText(d.item.name, s.x, s.y); if (d.full) { g.fillStyle = '#f66'; g.fillText('Inventory full', s.x, s.y + fontPx + 2); } }
    if (S.chest && !S.chest.opened) { const s = R.worldToScreen(S.chest.x, S.chest.y, 1.6); g.font = 'bold ' + fontPx + 'px sans-serif'; g.textAlign = 'center'; g.fillStyle = '#ffd76a'; g.fillText('REWARD', s.x, s.y); }
    if (S.exit) { const s = R.worldToScreen(S.exit.x, S.exit.y, 1.2); g.font = 'bold ' + fontPx + 'px sans-serif'; g.textAlign = 'center'; g.fillStyle = '#6f8cff'; g.fillText('▼ STAIRS', s.x, s.y); }
    for (const t of S.texts) { const s = R.worldToScreen(t.x, t.y, 1.6 + (t.t / t.dur) * 1.2); const a = 1 - t.t / t.dur; g.globalAlpha = Math.max(0, Math.min(1, a * 1.5)); g.font = 'bold ' + Math.round(fontPx * 1.15 * t.size) + 'px sans-serif'; g.textAlign = 'center'; g.lineWidth = 3; g.strokeStyle = 'rgba(0,0,0,0.85)'; g.strokeText(t.txt, s.x + t.vx * 10, s.y); g.fillStyle = t.color; g.fillText(t.txt, s.x + t.vx * 10, s.y); }
    g.globalAlpha = 1;
    // minimap
    { const size = Math.min(120, W * 0.14); const x0 = W - size - 12, y0 = 12; const k = size / Math.max(S.w, S.h); g.fillStyle = 'rgba(0,0,0,0.45)'; g.fillRect(x0, y0, size, size); g.strokeStyle = 'rgba(255,255,255,0.3)'; g.lineWidth = 1; g.strokeRect(x0, y0, size, size); for (const e of S.enemies) { if (e.dead || e.hidden) continue; g.fillStyle = e.elite.rank === 'boss' ? '#b36cff' : e.elite.rank !== 'normal' ? DATA.ELITE_RANKS[e.elite.rank].color : '#e44'; g.fillRect(x0 + e.x * k - 1.5, y0 + e.y * k - 1.5, 3, 3); } for (const m of S.minions) { if (m.dead) continue; g.fillStyle = '#6f8cff'; g.fillRect(x0 + m.x * k - 1, y0 + m.y * k - 1, 2, 2); } for (const d of S.drops) { if (d.taken || d.kind !== 'item' || DATA.RARITY[d.item.rarity].order < 3) continue; g.fillStyle = DATA.RARITY[d.item.rarity].color; g.fillRect(x0 + d.x * k - 2, y0 + d.y * k - 2, 4, 4); } if (S.exit) { g.fillStyle = '#6f8cff'; g.fillRect(x0 + S.exit.x * k - 3, y0 + S.exit.y * k - 3, 6, 6); } if (S.chest && !S.chest.opened) { g.fillStyle = '#ffd76a'; g.fillRect(x0 + S.chest.x * k - 3, y0 + S.chest.y * k - 3, 6, 6); } g.fillStyle = '#fff'; g.beginPath(); g.arc(x0 + S.player.x * k, y0 + S.player.y * k, 3, 0, PI * 2); g.fill(); }
    if (hud && hud.joystick && hud.joystick.active) { const j = hud.joystick; g.globalAlpha = 0.5; g.strokeStyle = '#fff'; g.lineWidth = 2; g.beginPath(); g.arc(j.ox, j.oy, j.radius, 0, PI * 2); g.stroke(); g.fillStyle = 'rgba(255,255,255,0.5)'; g.beginPath(); g.arc(j.ox + j.dx * j.radius, j.oy + j.dy * j.radius, j.radius * 0.4, 0, PI * 2); g.fill(); g.globalAlpha = 1; }
    const p = S.player; if (p.hp < p.maxHp * 0.3 && !p.dead) { const gr = g.createRadialGradient(W / 2, H / 2, H * 0.3, W / 2, H / 2, H * 0.8); gr.addColorStop(0, 'rgba(120,0,0,0)'); gr.addColorStop(1, 'rgba(120,0,0,' + (0.5 * (1 - p.hp / (p.maxHp * 0.3))) + ')'); g.fillStyle = gr; g.fillRect(0, 0, W, H); }
    if (p.dead) { g.fillStyle = 'rgba(0,0,0,0.45)'; g.fillRect(0, 0, W, H); }
  }

  // ---------------------------------------------------------------- main draw
  R.draw = function (S, hud) {
    if (!S || !renderer) return;
    const now = performance.now(); const dt = lastTime ? Math.min(0.05, (now - lastTime) / 1000) : 0.016; lastTime = now;
    if ((frameNo++ % 15) === 0) { const rect = canvas.getBoundingClientRect(); if (Math.floor(rect.width) !== W || Math.floor(rect.height) !== H) R.resize(); }
    if (!world || world.S !== S || world.floor !== S.floor) buildWorld(S);
    const p = S.player;
    camTarget.lerp(tmpV.set(p.x, 0, p.y), 0.14);
    camPos.copy(camTarget).add(CAM_OFF);
    if (S.shake > 0) { camPos.x += (Math.random() - 0.5) * S.shake * 0.6; camPos.z += (Math.random() - 0.5) * S.shake * 0.6; }
    camera.position.copy(camPos); camera.lookAt(camTarget.x, 0.8, camTarget.z);
    updateEntities(S, dt);
    updatePlayerFx(S);
    zonePool.sync(S.zones, z => z.id);
    beamPool.sync(S.beams, b => { if (!b._k) b._k = U.uid('b'); return b._k; });
    telePool.sync(S.enemies.filter(e => !e.dead && e.ai.telegraph && !e.hidden), e => { const tg = e.ai.telegraph; if (!tg._k) tg._k = U.uid('t'); return tg._k; });
    projPool.sync(S.projectiles, pr => pr.id);
    dropPool.sync(S.drops.filter(d => !d.taken), d => { if (!d._k) d._k = U.uid('d'); return d._k; });
    corpsePool.sync(S.corpses, c => { if (!c._k) c._k = U.uid('c'); return c._k; });
    orbPool.sync(S.orbs, o => { if (!o._k) o._k = U.uid('o'); return o._k; });
    wallPool.sync(S.walls, w => { if (!w._k) w._k = U.uid('w'); return w._k; });
    const misc = []; if (S.chest) misc.push({ kind: 'chest', x: S.chest.x, y: S.chest.y, opened: S.chest.opened, _k: 'chest' + S.floor }); if (S.exit) misc.push({ kind: 'exit', x: S.exit.x, y: S.exit.y, _k: 'exit' + S.floor });
    miscPool.sync(misc, m => m._k);
    updateParticles(S);
    renderer.render(scene, camera);
    drawOverlay(S, hud);
  };

  // ---------------------------------------------------------------- character preview view
  R.CharView = (function () {
    let vr = null, vscene, vcam, vmodel = null, vcanvas = null, raf = 0, rotY = 0.4, dragging = false, lastX = 0, autoRot = true, pedestal = null, horse = null, lastOpts = '';
    function ensure(cv) {
      if (vr && vcanvas === cv) return;
      stop();
      vcanvas = cv;
      vr = new T.WebGLRenderer({ canvas: cv, antialias: true, alpha: true }); vr.outputColorSpace = T.SRGBColorSpace; vr.toneMapping = T.ACESFilmicToneMapping; vr.shadowMap.enabled = true; vr.shadowMap.type = T.PCFSoftShadowMap; vr.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
      vscene = new T.Scene();
      vcam = new T.PerspectiveCamera(28, 1, 0.1, 50); vcam.position.set(0, 1.25, 4.6); vcam.lookAt(0, 0.95, 0);
      vscene.add(new T.HemisphereLight(0xd8e4ff, 0x4a3a2a, 0.7));
      const key = new T.DirectionalLight(0xffe9c8, 1.6); key.position.set(2, 4, 3); key.castShadow = true; key.shadow.mapSize.set(1024, 1024); vscene.add(key);
      const rim = new T.DirectionalLight(0x8fb0ff, 0.9); rim.position.set(-3, 3, -3); vscene.add(rim);
      pedestal = new T.Mesh(new T.CylinderGeometry(0.9, 1.0, 0.12, 32), Models.mat('#2a2a36', { rough: 0.6, metal: 0.3 })); pedestal.position.y = -0.06; pedestal.receiveShadow = true; vscene.add(pedestal);
      const ring = new T.Mesh(new T.TorusGeometry(0.95, 0.02, 8, 48), Models.mat('#d8b25a', { emissive: '#d8b25a', eint: 0.6, metal: 0.8 })); ring.rotation.x = PI / 2; ring.position.y = 0.01; vscene.add(ring);
      const onDown = (x) => { dragging = true; lastX = x; autoRot = false; }; const onMove = (x) => { if (!dragging) return; rotY += (x - lastX) * 0.012; lastX = x; }; const onUp = () => { dragging = false; };
      cv.addEventListener('touchstart', e => { onDown(e.touches[0].clientX); e.preventDefault(); }, { passive: false }); cv.addEventListener('touchmove', e => { onMove(e.touches[0].clientX); e.preventDefault(); }, { passive: false }); cv.addEventListener('touchend', onUp);
      cv.addEventListener('mousedown', e => onDown(e.clientX)); window.addEventListener('mousemove', e => onMove(e.clientX)); window.addEventListener('mouseup', onUp);
      lastOpts = '';
      loop();
    }
    function resizeView() { const rect = vcanvas.getBoundingClientRect(); const w = Math.max(1, Math.floor(rect.width)), h = Math.max(1, Math.floor(rect.height)); if (vcanvas.width !== Math.floor(w * vr.getPixelRatio()) ) { vr.setSize(w, h, false); vcam.aspect = w / h; vcam.updateProjectionMatrix(); } }
    let lt = 0;
    function loop() { raf = requestAnimationFrame(loop); if (!vr || !document.body.contains(vcanvas)) { stop(); return; } resizeView(); const now = performance.now(); const dt = lt ? Math.min(0.05, (now - lt) / 1000) : 0.016; lt = now; if (autoRot) rotY += dt * 0.35; if (vmodel) { vmodel.group.rotation.y = rotY; vmodel.update({ moving: false, attack: 0 }, dt); } if (horse) { horse.group.rotation.y = rotY; horse.update({ moving: false }, dt); } vr.render(vscene, vcam); }
    function stop() { if (raf) cancelAnimationFrame(raf); raf = 0; if (vr) { vr.dispose(); vr.forceContextLoss && vr.forceContextLoss(); } vr = null; vmodel = null; horse = null; vcanvas = null; lt = 0; }
    // show(canvas, opts) — opts: humanoid options, or {char, form, mount}
    function show(cv, opts) {
      ensure(cv);
      const o = opts.char ? Models.playerOptions(opts.char, opts.form) : opts;
      const key = JSON.stringify(o) + '|' + (opts.mount || '') + '|' + (opts.mountArmor || ''); if (key === lastOpts && vmodel) return; lastOpts = key;
      if (vmodel) vscene.remove(vmodel.group); if (horse) { vscene.remove(horse.group); horse = null; }
      vmodel = new Models.Humanoid(o); vscene.add(vmodel.group);
      if (opts.mount) { horse = Models.horse(DATA.mountById[opts.mount], DATA.MOUNT_ARMOR.find(a => a.id === (opts.mountArmor || 'none'))); vscene.add(horse.group); vmodel.group.position.y = 1.0; vmodel.update({ mounted: true }, 0.016); vcam.position.set(0, 1.6, 6.2); vcam.lookAt(0, 1.1, 0); }
      else { vcam.position.set(0, 1.25, 4.6); vcam.lookAt(0, 0.95, 0); }
    }
    return { show, stop, isActive: () => !!vr };
  })();

  window.Render3D = R;
})();
