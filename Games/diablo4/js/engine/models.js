/* Sanctuary — procedural 3D models built from Three.js primitives (global: Models)
   Humanoid characters (player/NPC-style with face, hair, beard, armor, weapons, forms, mount rider),
   monsters by shape family, mounts, obstacles and props. No external assets. */
(function () {
  'use strict';
  const T = window.THREE;
  const Models = {};
  const geoCache = {}, matCache = {};
  const PI = Math.PI;

  // ---------------------------------------------------------------- caches
  function geo(key, make) { if (!geoCache[key]) geoCache[key] = make(); return geoCache[key]; }
  function mat(color, opt) {
    opt = opt || {};
    const key = color + '|' + (opt.rough !== undefined ? opt.rough : 0.75) + '|' + (opt.metal || 0) + '|' + (opt.emissive || '') + '|' + (opt.eint || 0) + '|' + (opt.opacity !== undefined ? opt.opacity : 1) + '|' + (opt.flat ? 1 : 0);
    if (!matCache[key]) {
      const m = new T.MeshStandardMaterial({ color, roughness: opt.rough !== undefined ? opt.rough : 0.75, metalness: opt.metal || 0, flatShading: !!opt.flat });
      if (opt.emissive) { m.emissive = new T.Color(opt.emissive); m.emissiveIntensity = opt.eint || 0.6; }
      if (opt.opacity !== undefined && opt.opacity < 1) { m.transparent = true; m.opacity = opt.opacity; m.depthWrite = false; }
      matCache[key] = m;
    }
    return matCache[key];
  }
  Models.mat = mat; Models.geo = geo;
  const sphere = (r, seg) => geo('sph' + r + '_' + (seg || 12), () => new T.SphereGeometry(r, seg || 12, (seg || 12) * 0.75));
  const box = (w, h, d) => geo('box' + w + '_' + h + '_' + d, () => new T.BoxGeometry(w, h, d));
  const cyl = (rt, rb, h, seg) => geo('cyl' + rt + '_' + rb + '_' + h + '_' + (seg || 10), () => new T.CylinderGeometry(rt, rb, h, seg || 10));
  const capsule = (r, len) => geo('cap' + r + '_' + len, () => new T.CapsuleGeometry(r, len, 3, 8));
  const cone = (r, h, seg) => geo('cone' + r + '_' + h + '_' + (seg || 10), () => new T.ConeGeometry(r, h, seg || 10));
  const torus = (r, t) => geo('tor' + r + '_' + t, () => new T.TorusGeometry(r, t, 8, 18));
  const ico = (r, d) => geo('ico' + r + '_' + (d || 0), () => new T.IcosahedronGeometry(r, d || 0));
  function mesh(g, m, x, y, z, shadow) { const o = new T.Mesh(g, m); o.position.set(x || 0, y || 0, z || 0); if (shadow !== false) { o.castShadow = true; } return o; }
  function mix(a, b, t) { return U.mixHex(a, b, t); }
  function darken(hex, f) { return U.mixHex(hex, '#000000', f); }
  function lighten(hex, f) { return U.mixHex(hex, '#ffffff', f); }

  // ---------------------------------------------------------------- weapons
  function weaponMesh(type, glow) {
    const g = new T.Group();
    const steel = mat('#b8bcc6', { metal: 0.85, rough: 0.35, emissive: glow || undefined, eint: glow ? 0.8 : 0 });
    const wood = mat('#5a3a1a', { rough: 0.9 });
    const gold = mat('#d8b25a', { metal: 0.8, rough: 0.4 });
    const add = (m) => g.add(m);
    switch (type) {
      case 'sword1h': add(mesh(box(0.05, 0.55, 0.012), steel, 0, 0.42, 0)); add(mesh(box(0.14, 0.03, 0.03), gold, 0, 0.14, 0)); add(mesh(cyl(0.018, 0.02, 0.16), wood, 0, 0.05, 0)); break;
      case 'dagger': add(mesh(box(0.04, 0.3, 0.01), steel, 0, 0.28, 0)); add(mesh(box(0.08, 0.02, 0.02), gold, 0, 0.12, 0)); add(mesh(cyl(0.015, 0.018, 0.12), wood, 0, 0.05, 0)); break;
      case 'sword2h': add(mesh(box(0.07, 1.0, 0.015), steel, 0, 0.7, 0)); add(mesh(box(0.22, 0.035, 0.035), gold, 0, 0.18, 0)); add(mesh(cyl(0.02, 0.022, 0.26), wood, 0, 0.04, 0)); break;
      case 'axe1h': add(mesh(cyl(0.018, 0.02, 0.6), wood, 0, 0.3, 0)); add(mesh(box(0.02, 0.22, 0.2), steel, 0.08, 0.55, 0)); break;
      case 'axe2h': add(mesh(cyl(0.02, 0.024, 1.0), wood, 0, 0.5, 0)); add(mesh(box(0.025, 0.3, 0.28), steel, 0.12, 0.92, 0)); add(mesh(box(0.025, 0.3, 0.28), steel, -0.12, 0.92, 0)); break;
      case 'mace1h': add(mesh(cyl(0.018, 0.02, 0.5), wood, 0, 0.25, 0)); add(mesh(ico(0.08, 1), steel, 0, 0.52, 0)); break;
      case 'mace2h': add(mesh(cyl(0.022, 0.026, 0.9), wood, 0, 0.45, 0)); add(mesh(box(0.2, 0.2, 0.2), steel, 0, 0.95, 0)); break;
      case 'polearm': add(mesh(cyl(0.016, 0.02, 1.3), wood, 0, 0.65, 0)); add(mesh(box(0.05, 0.35, 0.012), steel, 0, 1.4, 0)); break;
      case 'staff': add(mesh(cyl(0.02, 0.024, 1.3), wood, 0, 0.65, 0)); add(mesh(sphere(0.07), mat('#7fd6ff', { emissive: '#7fd6ff', eint: 1.2 }), 0, 1.35, 0)); break;
      case 'wand': add(mesh(cyl(0.012, 0.016, 0.4), wood, 0, 0.2, 0)); add(mesh(sphere(0.045), mat('#b36cff', { emissive: '#b36cff', eint: 1.2 }), 0, 0.43, 0)); break;
      case 'scythe1h': add(mesh(cyl(0.016, 0.02, 0.7), wood, 0, 0.35, 0)); add(curvedBlade(0.35, steel, 0, 0.72)); break;
      case 'scythe2h': add(mesh(cyl(0.02, 0.024, 1.4), wood, 0, 0.7, 0)); add(curvedBlade(0.5, steel, 0, 1.4)); break;
      case 'shield': { const s = mesh(box(0.42, 0.55, 0.05), mat('#6a5a4a', { metal: 0.3, rough: 0.6 }), 0, 0.2, 0.03); add(s); add(mesh(cyl(0.1, 0.1, 0.07, 12), steel, 0, 0.2, 0.06).rotateX(PI / 2)); break; }
      case 'focus': add(mesh(sphere(0.09), mat('#8bd36b', { emissive: '#8bd36b', eint: 1.0, opacity: 0.85 }), 0, 0.15, 0)); add(mesh(torus(0.12, 0.012), gold, 0, 0.15, 0)); break;
      case 'totem': add(mesh(cyl(0.05, 0.06, 0.5), wood, 0, 0.25, 0)); add(mesh(box(0.14, 0.1, 0.1), mat('#c9a86a'), 0, 0.5, 0)); break;
      case 'bow': { const b = mesh(torus(0.42, 0.018), wood, 0, 0.3, 0); b.scale.set(0.45, 1, 1); add(b); add(mesh(box(0.006, 0.84, 0.006), mat('#ddd'), 0.19, 0.3, 0)); break; }
      case 'club': add(mesh(cyl(0.025, 0.05, 0.6, 7), wood, 0, 0.3, 0)); add(mesh(sphere(0.07, 7), wood, 0, 0.6, 0)); break;
      case 'knife': add(mesh(box(0.035, 0.22, 0.008), steel, 0, 0.2, 0)); add(mesh(cyl(0.014, 0.016, 0.1), wood, 0, 0.04, 0)); break;
      case 'spear': add(mesh(cyl(0.014, 0.018, 1.2), wood, 0, 0.6, 0)); add(mesh(cone(0.035, 0.22, 5), steel, 0, 1.3, 0)); break;
      default: add(mesh(box(0.05, 0.5, 0.012), steel, 0, 0.4, 0)); add(mesh(cyl(0.018, 0.02, 0.16), wood, 0, 0.05, 0));
    }
    return g;
  }
  function curvedBlade(len, m, x, y) {
    const shape = new T.Shape(); shape.moveTo(0, 0); shape.quadraticCurveTo(len * 0.6, 0.12, len, -0.1); shape.quadraticCurveTo(len * 0.6, 0.02, 0, -0.05); shape.closePath();
    const g = new T.ExtrudeGeometry(shape, { depth: 0.012, bevelEnabled: false });
    const o = new T.Mesh(g, m); o.position.set(x, y, 0); o.castShadow = true; return o;
  }
  Models.weaponMesh = weaponMesh;

  // ---------------------------------------------------------------- humanoid
  const HAIR_STYLES = ['short', 'long', 'bald', 'mohawk', 'braid', 'bun', 'wild'];
  const BEARDS = ['none', 'stubble', 'goatee', 'full'];
  const EYES = { brown: '#4a2a12', blue: '#3a6ad8', green: '#3a8a4a', amber: '#d89a2a', gray: '#8a9aa8', red: '#c02020' };
  Models.HAIR_STYLES = HAIR_STYLES; Models.BEARDS = BEARDS; Models.EYES = EYES;
  const HELM_STYLE = { plain_helm: 'hood', delver_hood: 'hood', iron_helm: 'helm', bone_crown: 'crown', penitent_halo: 'halo', lilith_crown: 'hcrown', rot_mask: 'mask', galvanic_plate: null };
  const BACK_STYLE = { torment_wings: 'wings', ascended_aura: 'aura', kor_dragan_sigil: 'cape', tur_dulra_cloak: 'cape', veteran_sash: 'sash', baron_pauldrons: 'pauldrons' };

  class Humanoid {
    constructor(o) {
      this.o = Object.assign({ skin: '#d9a877', hair: '#5a3a1a', hairStyle: 'short', beard: 'none', eyes: 'brown', body: 'average', frame: 'broad', tunic: '#5a4a3a', pants: '#2a2a30', boots: '#4a3a2a', gloves: null, helm: null, chest: null, back: null, dye: null, weaponGlow: null, weapon: null, offhand: null, form: null, scale: 1, monster: false, eyeGlow: null, hunch: 0, horns: false, tail: false, robe: false, bone: false, armored: false }, o || {});
      this.group = new T.Group();
      this.phase = Math.random() * 10; this.attackT = 0; this.deadT = 0; this.t = 0;
      this.build();
    }
    build() {
      const o = this.o, g = this.group;
      while (g.children.length) g.remove(g.children[0]);
      const wF = o.body === 'lean' ? 0.9 : o.body === 'heavy' ? 1.18 : 1;
      const sF = (o.frame === 'slender' ? 0.88 : 1.08) * wF;
      const skinM = mat(o.skin, { rough: 0.7 });
      const dye = o.dye;
      const tint = (c) => dye ? mix(c, dye, 0.55) : c;
      const tunicM = mat(tint(o.chest ? o.chest : o.tunic), { rough: o.chest ? 0.45 : 0.85, metal: o.chest ? 0.35 : 0 });
      const pantsM = mat(tint(o.pants), { rough: 0.85 });
      const bootsM = mat(tint(o.boots), { rough: 0.7 });
      const glovesM = o.gloves ? mat(tint(o.gloves), { rough: 0.5, metal: 0.3 }) : skinM;
      const hairM = mat(o.hair, { rough: 0.9 });
      const parts = this.parts = {};
      // root offset so feet touch y=0
      const root = parts.root = new T.Group(); g.add(root);
      root.scale.setScalar(o.scale);
      // pelvis & torso
      const hips = parts.hips = new T.Group(); hips.position.y = 1.0; root.add(hips);
      const pelvis = mesh(box(0.3 * wF, 0.16, 0.19 * wF), pantsM, 0, -0.03, 0); hips.add(pelvis);
      const torso = parts.torso = new T.Group(); torso.position.y = 0; hips.add(torso);
      const chest = mesh(cyl(0.19 * sF, 0.145 * wF, 0.52, 14), tunicM, 0, 0.3, 0); chest.scale.z = 0.7; torso.add(chest); parts.chest = chest;
      if (o.robe) { const skirt = mesh(cyl(0.16 * wF, 0.26 * wF, 0.9, 12), tunicM, 0, -0.42, 0); skirt.scale.z = 0.8; torso.add(skirt); }
      if (o.armored || o.chest) { const plate = mesh(cyl(0.2 * sF, 0.155 * wF, 0.36, 14), mat(tint(o.chest || '#8a9098'), { metal: 0.6, rough: 0.35 }), 0, 0.36, 0); plate.scale.z = 0.75; torso.add(plate); }
      const belt = mesh(torus(0.155 * wF, 0.022), mat('#3a2a1a', { rough: 0.8 }), 0, 0.05, 0); belt.rotation.x = PI / 2; belt.scale.z = 0.8; torso.add(belt);
      // shoulders
      [-1, 1].forEach(s => { const sh = mesh(sphere(0.068 * sF), (o.chest || o.armored) ? mat(tint(o.chest || '#8a9098'), { metal: 0.6, rough: 0.35 }) : tunicM, s * 0.235 * sF, 0.52, 0); torso.add(sh); if (o.back === 'pauldrons') { const pad = mesh(sphere(0.11), mat('#c0583a', { metal: 0.5, rough: 0.4 }), s * 0.26 * sF, 0.55, 0); pad.scale.y = 0.6; torso.add(pad); } });
      // neck & head
      torso.add(mesh(cyl(0.042, 0.05, 0.12, 8), skinM, 0, 0.6, 0));
      const head = parts.head = new T.Group(); head.position.set(0, 0.66, 0); torso.add(head);
      const skull = mesh(sphere(0.115, 18), o.bone ? mat('#e8e2d0') : skinM, 0, 0.1, 0); skull.scale.set(0.95, 1.15, 1.0); head.add(skull);
      if (!o.bone && !o.monster) { const jaw = mesh(sphere(0.1, 14), skinM, 0, 0.035, 0.01); jaw.scale.set(0.85, 0.75, 0.9); head.add(jaw); }
      // face
      const eyeCol = o.eyeGlow || EYES[o.eyes] || EYES.brown;
      [-1, 1].forEach(s => {
        if (!o.bone) { const white = mesh(sphere(0.02, 8), mat('#f4f0ea', { rough: 0.4 }), s * 0.042, 0.12, 0.092); head.add(white); }
        const pupil = mesh(sphere(0.011, 8), o.eyeGlow ? mat(eyeCol, { emissive: eyeCol, eint: 1.5 }) : mat(eyeCol, { rough: 0.3 }), s * 0.042, 0.12, o.bone ? 0.1 : 0.108); if (o.bone) pupil.scale.setScalar(1.6); head.add(pupil);
        if (!o.monster) { const brow = mesh(box(0.045, 0.01, 0.012), hairM, s * 0.043, 0.152, 0.1); brow.rotation.z = s * 0.15; head.add(brow); }
        if (!o.bone && !o.monster) head.add(mesh(sphere(0.02, 8), skinM, s * 0.112, 0.1, -0.01));
      });
      if (!o.bone && !o.monster) { const nose = mesh(cone(0.016, 0.045, 6), skinM, 0, 0.088, 0.115); nose.rotation.x = PI / 2; head.add(nose); }
      if (!o.monster || o.bone) head.add(mesh(box(0.045, 0.007, 0.01), mat(o.bone ? '#333' : '#7a3a3a'), 0, 0.052, 0.106));
      // hair
      if (!o.bone && !o.monster || (o.monster && o.hairStyle !== 'bald')) {
        const hs = o.hairStyle;
        if (hs !== 'bald') { const cap = new T.Mesh(geo('haircap', () => new T.SphereGeometry(0.124, 18, 12, 0, PI * 2, 0, PI * 0.58)), hairM); cap.position.set(0, 0.11, -0.012); cap.scale.set(0.98, 1.1, 1.02); cap.castShadow = true; head.add(cap); }
        if (hs === 'long') { const back = mesh(box(0.22, 0.4, 0.08), hairM, 0, -0.06, -0.085); head.add(back); [-1, 1].forEach(s => head.add(mesh(box(0.05, 0.3, 0.1), hairM, s * 0.12, 0.0, -0.01))); }
        if (hs === 'mohawk') { head.add(mesh(box(0.04, 0.14, 0.24), hairM, 0, 0.24, -0.02)); }
        if (hs === 'braid') { const br = mesh(cyl(0.028, 0.018, 0.42, 8), hairM, 0, -0.08, -0.12); br.rotation.x = 0.25; head.add(br); }
        if (hs === 'bun') { head.add(mesh(sphere(0.055, 10), hairM, 0, 0.19, -0.1)); }
        if (hs === 'wild') { for (let i = 0; i < 6; i++) { const sp = mesh(cone(0.035, 0.14, 5), hairM, Math.cos(i) * 0.07, 0.24, Math.sin(i) * 0.07 - 0.02); sp.rotation.z = Math.cos(i) * 0.6; sp.rotation.x = Math.sin(i) * 0.6; head.add(sp); } }
      }
      if (o.beard === 'full') { const bd = mesh(sphere(0.09, 12), hairM, 0, -0.005, 0.035); bd.scale.set(0.95, 0.85, 0.9); head.add(bd); }
      else if (o.beard === 'goatee') head.add(mesh(box(0.05, 0.07, 0.05), hairM, 0, 0.0, 0.085));
      else if (o.beard === 'stubble') { const st = mesh(sphere(0.102, 12), mat(darken(o.skin, 0.25), { rough: 0.9 }), 0, 0.035, 0.012); st.scale.set(0.86, 0.72, 0.9); head.add(st); }
      // helm
      const helm = o.helm;
      if (helm === 'hood') { const hd = new T.Mesh(geo('hood', () => new T.SphereGeometry(0.15, 14, 10, 0, PI * 2, 0, PI * 0.64)), mat(tint(o.helmColor || '#5a4a3a'), { rough: 0.9 })); hd.position.set(0, 0.1, -0.02); hd.scale.set(1, 1.12, 1.05); head.add(hd); }
      else if (helm === 'helm') { const hm = new T.Mesh(geo('helm', () => new T.SphereGeometry(0.13, 14, 10, 0, PI * 2, 0, PI * 0.6)), mat(tint(o.helmColor || '#8a9098'), { metal: 0.7, rough: 0.35 })); hm.position.set(0, 0.11, 0); head.add(hm); head.add(mesh(box(0.022, 0.11, 0.02), mat('#8a9098', { metal: 0.7, rough: 0.35 }), 0, 0.1, 0.125)); }
      else if (helm === 'crown' || helm === 'hcrown') { const cr = mesh(cyl(0.125, 0.118, 0.06, 12), mat(helm === 'crown' ? '#e8e2d0' : '#b36cff', { metal: 0.6, rough: 0.4, emissive: helm === 'hcrown' ? '#b36cff' : undefined, eint: 0.5 }), 0, 0.2, 0); head.add(cr); for (let i = 0; i < 6; i++) { const sp = mesh(cone(0.02, 0.09, 4), mat(helm === 'crown' ? '#e8e2d0' : '#b36cff', { metal: 0.6, rough: 0.4 }), Math.cos(i / 6 * PI * 2) * 0.12, 0.25, Math.sin(i / 6 * PI * 2) * 0.12); head.add(sp); } }
      else if (helm === 'halo') { const hl = mesh(torus(0.11, 0.013), mat('#ffe55c', { emissive: '#ffe55c', eint: 1.5 }), 0, 0.32, 0); hl.rotation.x = PI / 2; head.add(hl); }
      else if (helm === 'mask') { head.add(mesh(box(0.17, 0.14, 0.04), mat('#6f8a5a', { rough: 0.8 }), 0, 0.09, 0.105)); }
      if (o.horns) [-1, 1].forEach(s => { const h = mesh(cone(0.028, 0.2, 6), mat('#e8e2d0', { rough: 0.6 }), s * 0.08, 0.24, -0.02); h.rotation.z = -s * 0.7; head.add(h); });
      // arms
      const armLen = 0.26, foreLen = 0.24;
      [-1, 1].forEach(s => {
        const sh = new T.Group(); sh.position.set(s * 0.26 * sF, 0.5, 0); torso.add(sh);
        const upper = mesh(capsule(0.048 * wF, armLen), tunicM, 0, -(armLen / 2 + 0.04), 0); sh.add(upper);
        const el = new T.Group(); el.position.y = -(armLen + 0.08); sh.add(el);
        const fore = mesh(capsule(0.042 * wF, foreLen), o.gloves ? glovesM : skinM, 0, -(foreLen / 2 + 0.04), 0); el.add(fore);
        const hand = new T.Group(); hand.position.y = -(foreLen + 0.09); el.add(hand);
        const hm = mesh(sphere(0.048 * wF, 8), glovesM, 0, 0, 0); hm.scale.set(0.8, 1.1, 0.9); hand.add(hm);
        parts[s < 0 ? 'armL' : 'armR'] = sh; parts[s < 0 ? 'elbowL' : 'elbowR'] = el; parts[s < 0 ? 'handL' : 'handR'] = hand;
      });
      // legs
      const thighLen = 0.34, shinLen = 0.34;
      [-1, 1].forEach(s => {
        const hp = new T.Group(); hp.position.set(s * 0.1 * wF, -0.04, 0); hips.add(hp);
        hp.add(mesh(capsule(0.066 * wF, thighLen), pantsM, 0, -(thighLen / 2 + 0.06), 0));
        const kn = new T.Group(); kn.position.y = -(thighLen + 0.12); hp.add(kn);
        kn.add(mesh(capsule(0.052 * wF, shinLen), (o.boots ? bootsM : pantsM), 0, -(shinLen / 2 + 0.05), 0));
        const foot = mesh(box(0.1 * wF, 0.065, 0.21), bootsM, 0, -(shinLen + 0.12), 0.05); kn.add(foot);
        parts[s < 0 ? 'legL' : 'legR'] = hp; parts[s < 0 ? 'kneeL' : 'kneeR'] = kn;
      });
      // tail (monsters)
      if (o.tail) { const tl = mesh(cone(0.04, 0.5, 6), skinM, 0, -0.05, -0.2); tl.rotation.x = -PI / 2 - 0.5; hips.add(tl); parts.tail = tl; }
      // back cosmetics
      if (o.back === 'wings') { [-1, 1].forEach(s => { const w = new T.Mesh(geo('wing', () => { const sh = new T.Shape(); sh.moveTo(0, 0); sh.quadraticCurveTo(0.3, 0.5, 0.75, 0.6); sh.quadraticCurveTo(0.5, 0.2, 0.6, -0.3); sh.quadraticCurveTo(0.3, -0.1, 0, 0); return new T.ShapeGeometry(sh); }), mat('#ff8c1a', { emissive: '#ff6a1a', eint: 0.6, opacity: 0.85 })); w.position.set(s * 0.1, 0.35, -0.12); w.scale.x = s; w.rotation.y = s * 0.5; torso.add(w); parts['wing' + (s < 0 ? 'L' : 'R')] = w; }); }
      else if (o.back === 'cape') { const cp = mesh(box(0.42, 0.9, 0.03), mat(tint(o.backColor || '#8a1a2a'), { rough: 0.9 }), 0, 0.0, -0.16); torso.add(cp); parts.cape = cp; }
      else if (o.back === 'sash') { const sa = mesh(box(0.08, 0.6, 0.03), mat('#c9a86a'), -0.1, 0.2, 0.19); sa.rotation.z = 0.5; torso.add(sa); }
      else if (o.back === 'aura') { const au = mesh(torus(0.45, 0.02), mat('#fff2a6', { emissive: '#fff2a6', eint: 1.5 }), 0, 0.3, 0); au.rotation.x = PI / 2; torso.add(au); parts.aura = au; }
      // weapons
      if (o.weapon) { const w = weaponMesh(o.weapon, o.weaponGlow); w.rotation.x = PI / 2; w.position.set(0, -0.02, 0.05); parts.handR.add(w); parts.weapon = w; }
      if (o.offhand) { const w = weaponMesh(o.offhand, null); if (o.offhand === 'shield') { w.rotation.y = PI / 2; w.position.set(-0.06, 0, 0.05); } else { w.rotation.x = PI / 2; w.position.set(0, -0.02, 0.05); } parts.handL.add(w); parts.offhand = w; }
      // forms
      if (o.form === 'werewolf' || o.form === 'werebear') this.applyForm(o.form);
      g.traverse(c => { if (c.isMesh) c.castShadow = true; });
      this.baseHunch = o.hunch;
    }
    applyForm(form) {
      const p = this.parts, fur = mat(form === 'werewolf' ? '#5a4a3a' : '#4a2e14', { rough: 0.95 });
      this.group.traverse(c => { if (c.isMesh && c.material !== p.weapon) c.material = fur; });
      const head = p.head;
      const snout = mesh(box(0.1, 0.08, 0.16), fur, 0, 0.07, 0.17); head.add(snout);
      [-1, 1].forEach(s => { const ear = mesh(cone(0.035, 0.1, 5), fur, s * 0.1, 0.27, -0.02); head.add(ear); });
      [-1, 1].forEach(s => { const eye = mesh(sphere(0.016, 6), mat('#ffe55c', { emissive: '#ffe55c', eint: 1.5 }), s * 0.05, 0.12, 0.135); head.add(eye); });
      if (form === 'werebear') { p.root.scale.setScalar(this.o.scale * 1.35); p.chest.scale.set(1.3, 1, 1.1); } else { p.root.scale.setScalar(this.o.scale * 1.1); }
      this.o.hunch = form === 'werebear' ? 0.45 : 0.3;
    }
    setForm(form) { if (this.o.form === form) return; this.o.form = form; this.build(); }
    // st: { moving, speed, attack(0..1 remaining), dead, deadT, mounted, channel, dash, hp, berserk }
    update(st, dt) {
      const p = this.parts; this.t += dt;
      const walk = st.moving && !st.dead;
      this.phase += dt * (walk ? (st.speed || 5) * 1.9 : 0);
      const sw = Math.sin(this.phase), cw = Math.cos(this.phase);
      const hunch = this.o.hunch || 0;
      const breathe = Math.sin(this.t * 2.2) * 0.012;
      if (st.dead) { this.deadT = Math.min(1, this.deadT + dt * 2); p.root.rotation.x = -PI / 2 * this.deadT; p.root.position.y = 0.2 * this.deadT; return; }
      this.deadT = 0; p.root.rotation.x = 0; p.root.position.y = 0;
      if (st.mounted) {
        p.hips.position.y = 1.12; p.legL.rotation.x = -1.3; p.legR.rotation.x = -1.3; p.legL.rotation.z = 0.5; p.legR.rotation.z = -0.5; p.kneeL.rotation.x = 1.5; p.kneeR.rotation.x = 1.5;
        p.torso.rotation.x = 0.1; p.armL.rotation.x = -0.9; p.armR.rotation.x = -0.9; p.elbowL.rotation.x = -0.6; p.elbowR.rotation.x = -0.6; p.head.rotation.x = 0; return;
      }
      p.hips.position.y = 1.0 - (walk ? Math.abs(cw) * 0.03 : 0) + breathe - hunch * 0.15; p.legL.rotation.z = 0; p.legR.rotation.z = 0;
      p.torso.rotation.x = hunch * 0.9 + (walk ? 0.08 : 0) + (st.dash ? 0.35 : 0);
      p.torso.rotation.y = walk ? sw * 0.06 : 0;
      p.head.rotation.x = -hunch * 0.6;
      // legs
      const legAmp = walk ? 0.65 : 0;
      p.legL.rotation.x = sw * legAmp; p.legR.rotation.x = -sw * legAmp;
      p.kneeL.rotation.x = walk ? Math.max(0, -cw) * 0.9 : 0; p.kneeR.rotation.x = walk ? Math.max(0, cw) * 0.9 : 0;
      // arms
      const armAmp = walk ? 0.45 : 0.04;
      p.armL.rotation.x = -sw * armAmp + 0.1; p.armL.rotation.z = 0.12;
      p.elbowL.rotation.x = -0.25 - (walk ? 0.2 : 0);
      if (st.channel) { p.armR.rotation.x = -1.4 + Math.sin(this.t * 12) * 0.1; p.armR.rotation.z = -0.3; p.elbowR.rotation.x = -0.5; p.armL.rotation.x = -1.3; p.armL.rotation.z = 0.3; }
      else if (st.attack > 0) { const a = 1 - st.attack; const swing = a < 0.35 ? -2.4 + (a / 0.35) * 0.6 : -1.8 + ((a - 0.35) / 0.65) * 2.6; p.armR.rotation.x = swing; p.armR.rotation.z = -0.25; p.elbowR.rotation.x = a < 0.35 ? -1.0 : -0.3; p.torso.rotation.y = -0.35 + a * 0.6; }
      else { p.armR.rotation.x = sw * armAmp + 0.1; p.armR.rotation.z = -0.12; p.elbowR.rotation.x = -0.25 - (walk ? 0.2 : 0); }
      if (p.wingL) { p.wingL.rotation.y = -0.5 - Math.sin(this.t * 3) * 0.25; p.wingR.rotation.y = 0.5 + Math.sin(this.t * 3) * 0.25; }
      if (p.cape) p.cape.rotation.x = walk ? -0.35 - Math.abs(sw) * 0.1 : -0.05;
      if (p.aura) p.aura.rotation.z += dt;
      if (p.tail) p.tail.rotation.y = Math.sin(this.t * 4) * 0.4;
    }
    dispose() { }
  }
  Models.Humanoid = Humanoid;

  // Build humanoid options from a character record (player)
  Models.playerOptions = function (char, form) {
    const ap = char.appearance || {}; const cls = DATA.classes[char.cls]; const cos = char.cosmetics || { equipped: {} }; const eq = cos.equipped || {};
    const skin = (DATA.appearance.skin.find(s => s.id === ap.skin) || DATA.appearance.skin[1]).c;
    const hair = (DATA.appearance.hair.find(s => s.id === ap.hair) || DATA.appearance.hair[1]).c;
    const dye = (DATA.DYES.find(d => d.id === cos.dye) || {}).color || null;
    const helmCos = DATA.cosmeticById[eq.helm], chestCos = DATA.cosmeticById[eq.chest], glovesCos = DATA.cosmeticById[eq.gloves], bootsCos = DATA.cosmeticById[eq.boots], backCos = DATA.cosmeticById[eq.back], wCos = DATA.cosmeticById[eq.weapon];
    const weaponItem = char.cls === 'barbarian' ? (char.equipment.slash || char.equipment.bludgeon || char.equipment.dual1) : char.equipment.weapon;
    const offItem = char.cls === 'barbarian' ? (weaponItem && weaponItem === char.equipment.dual1 ? char.equipment.dual2 : null) : char.equipment.offhand;
    return {
      skin, hair, hairStyle: ap.hairStyle || 'short', beard: ap.beard || 'none', eyes: ap.eyes || 'brown', body: ap.body || 'average', frame: ap.frame || 'broad',
      tunic: cls.accent, pants: '#2a2a30', boots: bootsCos && bootsCos.color ? bootsCos.color : '#4a3a2a', gloves: glovesCos && glovesCos.color ? glovesCos.color : null,
      chest: chestCos && chestCos.color ? chestCos.color : null, helm: helmCos ? (HELM_STYLE[helmCos.id] !== undefined ? HELM_STYLE[helmCos.id] : 'helm') : null, helmColor: helmCos ? helmCos.color : null,
      back: backCos ? BACK_STYLE[backCos.id] || null : null, backColor: backCos ? backCos.color : null, dye, weaponGlow: wCos && wCos.color ? wCos.color : null,
      weapon: weaponItem ? weaponItem.type : null, offhand: offItem ? offItem.type : null, form: form || null, robe: char.cls === 'necromancer' && !chestCos, armored: char.cls === 'paladin' && !chestCos, scale: 1
    };
  };

  // ---------------------------------------------------------------- quadruped (beasts, horses)
  class Quadruped {
    constructor(o) {
      this.o = Object.assign({ color: '#7a7a7a', belly: null, size: 1, horse: false, mane: '#3a2a1a', glow: null, armor: null, legLen: 0.45, neck: 0.3, tailLen: 0.4, ears: true }, o || {});
      this.group = new T.Group(); this.phase = Math.random() * 10; this.t = 0; this.parts = {}; this.build();
    }
    build() {
      const o = this.o, g = this.group, p = this.parts; const s = o.size;
      const bodyM = mat(o.color, { rough: 0.85 }); const maneM = mat(o.mane, { rough: 0.95 });
      const root = p.root = new T.Group(); root.scale.setScalar(s); g.add(root);
      const bodyY = o.legLen + 0.25;
      const body = mesh(capsule(0.26, o.horse ? 0.75 : 0.5), bodyM, 0, bodyY, 0); body.rotation.x = PI / 2; root.add(body); p.body = body;
      if (o.armor) { const bard = mesh(box(0.5, 0.3, 0.9), mat(o.armor, { metal: 0.5, rough: 0.4 }), 0, bodyY + 0.08, 0.05); root.add(bard); }
      const neck = p.neck = new T.Group(); neck.position.set(0, bodyY + 0.12, o.horse ? 0.45 : 0.32); root.add(neck);
      const nk = mesh(capsule(0.11, o.neck), bodyM, 0, o.neck / 2 + 0.05, 0.05); nk.rotation.x = o.horse ? -0.6 : -1.1; neck.add(nk);
      const head = p.head = new T.Group(); head.position.set(0, o.horse ? o.neck + 0.25 : 0.12, o.horse ? 0.3 : 0.3); neck.add(head);
      head.add(mesh(box(0.2, 0.2, 0.36), bodyM, 0, 0, 0.1));
      [-1, 1].forEach(sg => { head.add(mesh(sphere(0.02, 6), mat('#ffe55c', { emissive: '#ffe55c', eint: 1.2 }), sg * 0.09, 0.06, 0.2)); if (o.ears) { const ear = mesh(cone(0.035, 0.1, 5), bodyM, sg * 0.07, 0.15, -0.05); head.add(ear); } });
      if (o.horse) { const mane = mesh(box(0.06, 0.16, 0.5), maneM, 0, o.neck / 2 + 0.2, 0.2); mane.rotation.x = -0.6; neck.add(mane); head.add(mesh(box(0.1, 0.1, 0.12), maneM, 0, 0.12, -0.05)); const saddle = mesh(box(0.34, 0.1, 0.4), mat('#5a3a1a', { rough: 0.7 }), 0, bodyY + 0.22, -0.05); root.add(saddle); p.saddle = saddle; }
      const tail = p.tail = mesh(cone(0.05, o.tailLen, 6), o.horse ? maneM : bodyM, 0, bodyY + 0.05, -(o.horse ? 0.55 : 0.4)); tail.rotation.x = PI / 2 + 0.6; root.add(tail);
      const legs = p.legs = [];
      [[-0.13, 0.28], [0.13, 0.28], [-0.13, -0.28], [0.13, -0.28]].forEach(([x, z], i) => {
        const hp = new T.Group(); hp.position.set(x, o.legLen + 0.15, z * (o.horse ? 1.4 : 1)); root.add(hp);
        hp.add(mesh(capsule(0.06, o.legLen * 0.5), bodyM, 0, -o.legLen * 0.25 - 0.05, 0));
        const kn = new T.Group(); kn.position.y = -o.legLen * 0.5 - 0.1; hp.add(kn);
        kn.add(mesh(capsule(0.05, o.legLen * 0.5), bodyM, 0, -o.legLen * 0.25 - 0.05, 0));
        kn.add(mesh(box(0.1, 0.06, 0.12), mat('#2a2a2a'), 0, -o.legLen * 0.5 - 0.12, 0.02));
        legs.push({ hp, kn, front: i < 2 });
      });
      g.traverse(c => { if (c.isMesh) c.castShadow = true; });
    }
    update(st, dt) {
      const p = this.parts; this.t += dt;
      if (st.dead) { this.deadT = Math.min(1, (this.deadT || 0) + dt * 2); p.root.rotation.z = PI / 2 * this.deadT; p.root.position.y = 0.3 * this.deadT; return; }
      const run = st.moving; this.phase += dt * (run ? (st.speed || 5) * 2.2 : 0);
      p.legs.forEach((l, i) => { const ph = this.phase + (i === 0 || i === 3 ? 0 : PI); const amp = run ? 0.7 : 0; l.hp.rotation.x = Math.sin(ph) * amp; l.kn.rotation.x = run ? Math.max(0, -Math.cos(ph)) * 0.8 : 0; });
      p.root.position.y = run ? Math.abs(Math.sin(this.phase)) * 0.06 : 0;
      p.neck.rotation.x = (run ? 0.15 : 0) + Math.sin(this.t * 1.5) * 0.04; p.tail.rotation.y = Math.sin(this.t * 5) * 0.35;
      if (st.attack > 0) p.neck.rotation.x = -0.5 + (1 - st.attack) * 0.8;
    }
  }
  Models.Quadruped = Quadruped;

  // ---------------------------------------------------------------- other monster bodies
  function spiderModel(color, size) {
    const g = new T.Group(); const bodyM = mat(color, { rough: 0.8 }); const parts = { legs: [] };
    const root = new T.Group(); root.scale.setScalar(size); g.add(root);
    root.add(mesh(sphere(0.3, 10), bodyM, 0, 0.3, -0.1)); root.add(mesh(sphere(0.2, 10), bodyM, 0, 0.32, 0.22));
    [-1, 1].forEach(s => { root.add(mesh(sphere(0.03, 6), mat('#ff3b3b', { emissive: '#ff3b3b', eint: 1.5 }), s * 0.08, 0.38, 0.4)); root.add(mesh(sphere(0.02, 6), mat('#ff3b3b', { emissive: '#ff3b3b', eint: 1.5 }), s * 0.14, 0.35, 0.36)); });
    for (let i = 0; i < 8; i++) { const s = i < 4 ? -1 : 1; const k = i % 4; const hp = new T.Group(); hp.position.set(s * 0.2, 0.32, 0.2 - k * 0.14); root.add(hp); const up = mesh(cyl(0.025, 0.02, 0.4, 6), bodyM, s * 0.18, 0.1, 0); up.rotation.z = s * 1.1; hp.add(up); const lo = mesh(cyl(0.02, 0.012, 0.4, 6), bodyM, s * 0.4, -0.12, 0); lo.rotation.z = s * 0.3; hp.add(lo); parts.legs.push(hp); }
    g.traverse(c => { if (c.isMesh) c.castShadow = true; });
    return { group: g, parts, phase: Math.random() * 9, update(st, dt) { if (st.dead) { root.rotation.x = PI; root.position.y = 0.4; return; } this.phase += dt * (st.moving ? 14 : 2); parts.legs.forEach((l, i) => { l.rotation.y = Math.sin(this.phase + i * 1.3) * (st.moving ? 0.35 : 0.05); l.rotation.x = Math.cos(this.phase + i) * 0.1; }); } };
  }
  function blobModel(color, size) {
    const g = new T.Group(); const m = mat(color, { rough: 0.5, opacity: 0.92 }); const b = mesh(sphere(0.5, 14), m, 0, 0.45, 0); b.scale.set(size, size * 0.85, size); g.add(b);
    [-1, 1].forEach(s => g.add(mesh(sphere(0.05, 6), mat('#111'), s * 0.15 * size, 0.55 * size, 0.42 * size)));
    return { group: g, t: 0, update(st, dt) { this.t += dt; const w = 1 + Math.sin(this.t * 5) * 0.06; b.scale.set(size * w, size * 0.85 / w, size * w); if (st.dead) b.scale.y = 0.1; } };
  }
  function ghostModel(color, size) {
    const g = new T.Group(); const m = mat(color, { opacity: 0.55, rough: 0.3, emissive: color, eint: 0.3 });
    const body = mesh(cone(0.4, 1.1, 10), m, 0, 0.75, 0); body.rotation.x = PI; g.add(body); g.add(mesh(sphere(0.3, 12), m, 0, 1.2, 0));
    [-1, 1].forEach(s => g.add(mesh(sphere(0.05, 6), mat('#111'), s * 0.1, 1.25, 0.26)));
    g.scale.setScalar(size); g.traverse(c => { if (c.isMesh) c.castShadow = false; });
    return { group: g, t: Math.random() * 5, update(st, dt) { this.t += dt; g.position.y = 0.2 + Math.sin(this.t * 2.5) * 0.12; g.rotation.y = Math.sin(this.t) * 0.2; if (st.dead) g.scale.setScalar(Math.max(0.01, g.scale.x - dt * 2)); } };
  }
  function snakeModel(color, size) {
    const g = new T.Group(); const m = mat(color, { rough: 0.6 }); const segs = [];
    for (let i = 0; i < 8; i++) { const r = 0.16 - i * 0.012; const s = mesh(sphere(r, 10), m, 0, r, -i * 0.22); g.add(s); segs.push(s); }
    const head = mesh(box(0.26, 0.18, 0.3), m, 0, 0.18, 0.15); g.add(head); [-1, 1].forEach(s => head.add(mesh(sphere(0.03, 6), mat('#ffe55c', { emissive: '#ffe55c', eint: 1.2 }), s * 0.08, 0.06, 0.14)));
    g.scale.setScalar(size); g.traverse(c => { if (c.isMesh) c.castShadow = true; });
    return { group: g, t: 0, update(st, dt) { this.t += dt * (st.moving ? 8 : 2); segs.forEach((s, i) => { s.position.x = Math.sin(this.t + i * 0.8) * 0.12; }); head.rotation.y = Math.sin(this.t) * 0.2; if (st.dead) g.scale.y = 0.2; } };
  }
  function crabModel(color, size) {
    const g = new T.Group(); const m = mat(color, { rough: 0.5, metal: 0.1 });
    const body = mesh(sphere(0.45, 12), m, 0, 0.3, 0); body.scale.set(1.2, 0.5, 1); g.add(body);
    const claws = [];
    [-1, 1].forEach(s => { const arm = new T.Group(); arm.position.set(s * 0.45, 0.3, 0.2); g.add(arm); arm.add(mesh(box(0.2, 0.12, 0.3), m, s * 0.1, 0, 0.15)); arm.add(mesh(box(0.12, 0.1, 0.22), m, s * 0.1, 0.05, 0.4)); claws.push(arm); for (let i = 0; i < 3; i++) { const leg = mesh(cyl(0.02, 0.015, 0.4, 5), m, s * 0.5, 0.15, -0.1 - i * 0.14); leg.rotation.z = s * 1.2; g.add(leg); } });
    [-1, 1].forEach(s => g.add(mesh(sphere(0.04, 6), mat('#111'), s * 0.15, 0.5, 0.35)));
    g.scale.setScalar(size); g.traverse(c => { if (c.isMesh) c.castShadow = true; });
    return { group: g, t: 0, update(st, dt) { this.t += dt; claws.forEach((c, i) => { c.rotation.x = st.attack > 0 ? -0.6 : Math.sin(this.t * 3 + i) * 0.1; }); if (st.dead) { g.rotation.x = PI; g.position.y = 0.5; } } };
  }
  function constructModel(color, size, boss) {
    const g = new T.Group(); const m = mat(color, { rough: 0.5, metal: 0.4, flat: true }); const root = new T.Group(); root.scale.setScalar(size); g.add(root);
    root.add(mesh(box(0.7, 0.8, 0.5), m, 0, 0.95, 0)); root.add(mesh(box(0.5, 0.35, 0.4), m, 0, 0.35, 0));
    root.add(mesh(box(0.35, 0.3, 0.32), m, 0, 1.5, 0.05)); root.add(mesh(sphere(0.07, 8), mat('#7fd6ff', { emissive: '#7fd6ff', eint: 1.5 }), 0, 1.5, 0.22));
    const arms = []; [-1, 1].forEach(s => { const a = new T.Group(); a.position.set(s * 0.45, 1.25, 0); root.add(a); a.add(mesh(box(0.22, 0.7, 0.24), m, 0, -0.35, 0)); a.add(mesh(box(0.28, 0.25, 0.28), m, 0, -0.8, 0)); arms.push(a); });
    const legs = []; [-1, 1].forEach(s => { const l = new T.Group(); l.position.set(s * 0.18, 0.55, 0); root.add(l); l.add(mesh(box(0.22, 0.55, 0.26), m, 0, -0.28, 0)); legs.push(l); });
    g.traverse(c => { if (c.isMesh) c.castShadow = true; });
    return { group: g, phase: 0, update(st, dt) { if (st.dead) { root.rotation.x = -PI / 2 * Math.min(1, (this.d = (this.d || 0) + dt * 2)); return; } this.phase += dt * (st.moving ? 6 : 0); legs.forEach((l, i) => { l.rotation.x = Math.sin(this.phase + i * PI) * 0.4; }); arms.forEach((a, i) => { a.rotation.x = st.attack > 0 ? -2 + (1 - st.attack) * 2.5 : Math.sin(this.phase + i * PI) * 0.3; }); } };
  }
  function batModel(color, size) {
    const g = new T.Group(); const m = mat(color, { rough: 0.8 }); const body = mesh(sphere(0.18, 8), m, 0, 0.9, 0); g.add(body);
    const wings = []; [-1, 1].forEach(s => { const w = mesh(box(0.5, 0.02, 0.3), mat(color, { opacity: 0.9, rough: 0.8 }), s * 0.3, 0.9, 0); g.add(w); wings.push(w); });
    [-1, 1].forEach(s => g.add(mesh(sphere(0.025, 6), mat('#ff3b3b', { emissive: '#ff3b3b', eint: 1.5 }), s * 0.07, 0.95, 0.15)));
    g.scale.setScalar(size); g.traverse(c => { if (c.isMesh) c.castShadow = false; });
    return { group: g, t: Math.random() * 5, update(st, dt) { this.t += dt; wings.forEach((w, i) => { w.rotation.z = (i ? -1 : 1) * Math.sin(this.t * 18) * 0.7; }); g.position.y = Math.sin(this.t * 3) * 0.1; if (st.dead) g.position.y = -0.7; } };
  }

  // Monster from an enemy def
  function familyWeapon(def) {
    const b = def.behavior, f = def.family;
    if (b === 'ranged') return f === 'skeleton' || f === 'bandit' || f === 'khazra' || f === 'nahantu' ? 'bow' : f === 'demon' ? 'spear' : 'wand';
    if (b === 'caster' || b === 'summoner') return 'staff';
    if (f === 'fallen') return 'knife'; if (f === 'cannibal' || f === 'zombie') return 'club'; if (f === 'khazra') return 'spear'; if (f === 'bandit') return 'axe1h'; if (f === 'vampire') return 'dagger'; if (f === 'cultist' || f === 'nahantu') return 'staff';
    return 'sword1h';
  }
  Models.monster = function (def, rank) {
    const shape = def.shape; const color = def.color; const size = def.r / 0.55;
    const fw = familyWeapon(def); const f = def.family;
    const famTweak = f === 'zombie' ? { hunch: 0.35, eyeGlow: '#9aff8a', hairStyle: 'bald', tunic: darken(color, 0.35) } : f === 'drowned' ? { hunch: 0.25, eyeGlow: '#7fd6ff', hairStyle: 'wild', hair: '#2a6a5a' } : f === 'bandit' ? { helm: 'hood', helmColor: darken(color, 0.3), beard: 'full', hair: '#2a1a0a' } : f === 'cannibal' ? { hairStyle: 'mohawk', hair: '#1a1a1a', beard: 'stubble', eyeGlow: '#ff8a4a' } : f === 'vampire' ? { hairStyle: 'long', hair: '#1a1a1a', skin: '#d8d0d0', eyeGlow: '#ff3b3b', back: 'cape', backColor: '#3a0a14' } : f === 'nahantu' ? { hairStyle: 'braid', hair: '#1a1a1a', helm: null } : f === 'cultist' ? { helm: 'hood', helmColor: color } : {};
    const eliteScale = rank === 'boss' ? 1.0 : rank === 'superunique' ? 1.25 : rank === 'elite' ? 1.15 : rank === 'champion' ? 1.08 : 1;
    let m;
    switch (shape) {
      case 'skull': m = new Humanoid({ skin: '#e8e2d0', bone: true, hairStyle: 'bald', beard: 'none', tunic: darken(color, 0.3), pants: darken(color, 0.4), boots: '#3a3a3a', body: 'lean', frame: 'slender', scale: 0.95 * size * eliteScale, monster: true, eyeGlow: def.element === 'cold' ? '#7fd6ff' : '#9aff8a', weapon: fw === 'bow' ? null : fw, offhand: fw === 'bow' ? 'bow' : (def.id === 'skeleton' && Math.random() < 0.5 ? 'shield' : null), helm: def.id === 'skeleton_captain' ? 'helm' : null, helmColor: '#6a6a70' }); break;
      case 'imp': m = new Humanoid(Object.assign({ skin: color, hairStyle: 'bald', tunic: darken(color, 0.2), pants: darken(color, 0.3), boots: darken(color, 0.4), body: 'lean', frame: 'slender', scale: 0.7 * size * eliteScale, monster: true, eyeGlow: '#ffe55c', horns: true, tail: true, hunch: 0.4, weapon: fw === 'bow' ? null : fw, offhand: fw === 'bow' ? 'bow' : null }, def.id === 'fallen_shaman' ? { helm: 'crown', weapon: 'staff' } : {})); break;
      case 'brute': m = new Humanoid({ skin: color, hairStyle: 'bald', tunic: darken(color, 0.15), pants: darken(color, 0.3), boots: darken(color, 0.4), body: 'heavy', frame: 'broad', scale: 1.25 * size * eliteScale, monster: true, eyeGlow: '#ff3b3b', hunch: 0.35, horns: rank === 'boss' || f === 'demon', weapon: f === 'cannibal' || f === 'fallen' ? 'club' : f === 'demon' ? 'axe2h' : 'mace2h' }); break;
      case 'horned': m = new Humanoid({ skin: color, hairStyle: 'wild', hair: darken(color, 0.5), tunic: darken(color, 0.2), pants: darken(color, 0.3), boots: darken(color, 0.4), body: 'average', scale: 1.05 * size * eliteScale, monster: true, eyeGlow: '#ffe55c', horns: true, weapon: fw === 'bow' ? null : (f === 'khazra' ? 'spear' : 'axe1h'), offhand: fw === 'bow' ? 'bow' : null }); break;
      case 'armored': m = new Humanoid({ skin: darken(color, 0.3), hairStyle: 'bald', tunic: color, chest: lighten(color, 0.1), pants: darken(color, 0.3), boots: darken(color, 0.4), gloves: color, helm: 'helm', helmColor: color, body: 'heavy', scale: 1.1 * size * eliteScale, monster: true, eyeGlow: '#ff3b3b', armored: true, weapon: 'sword2h' }); break;
      case 'robed': m = new Humanoid({ skin: '#b89a80', hairStyle: 'bald', tunic: color, pants: darken(color, 0.2), boots: '#2a2a2a', helm: 'hood', helmColor: color, robe: true, scale: 1.0 * size * eliteScale, monster: true, eyeGlow: f === 'vampire' ? '#ff3b3b' : '#b36cff', weapon: fw === 'bow' ? 'wand' : fw }); break;
      case 'winged': m = new Humanoid({ skin: color, hairStyle: 'long', hair: darken(color, 0.5), tunic: darken(color, 0.2), pants: darken(color, 0.3), boots: darken(color, 0.4), body: 'lean', back: 'wings', scale: 1.05 * size * eliteScale, monster: true, eyeGlow: '#ff6a6a', horns: rank === 'boss' }); break;
      case 'boss': m = new Humanoid({ skin: color, hairStyle: 'wild', hair: '#1a1a1a', tunic: darken(color, 0.2), chest: darken(color, 0.1), pants: darken(color, 0.3), boots: '#1a1a1a', body: 'heavy', frame: 'broad', scale: 1.6 * size, monster: true, eyeGlow: '#ffe55c', horns: true, armored: true, hunch: 0.2, weapon: 'axe2h' }); break;
      case 'humanoid': default: m = new Humanoid(Object.assign({ skin: f === 'zombie' || f === 'drowned' ? color : mix(color, '#d9a877', 0.5), hair: darken(color, 0.6), hairStyle: 'short', tunic: f === 'zombie' ? darken(color, 0.4) : color, pants: darken(color, 0.4), boots: '#3a2a1a', scale: 1.0 * size * eliteScale, monster: true, eyeGlow: null, weapon: fw === 'bow' ? null : fw, offhand: fw === 'bow' ? 'bow' : (f === 'bandit' && def.behavior === 'melee' && Math.random() < 0.4 ? 'shield' : null), armored: def.id === 'bandit_captain' }, famTweak)); break;
      case 'beast': m = new Quadruped({ color, size: 0.9 * size * eliteScale }); break;
      case 'spider': m = spiderModel(color, size * eliteScale); break;
      case 'blob': m = blobModel(color, size * eliteScale); break;
      case 'ghost': m = ghostModel(color, size * eliteScale); break;
      case 'snake': m = snakeModel(color, size * eliteScale); break;
      case 'crab': m = crabModel(color, size * eliteScale); break;
      case 'construct': m = constructModel(color, size * eliteScale * 0.9); break;
      case 'bat': m = batModel(color, size * eliteScale); break;
    }
    if (!m) m = new Humanoid({ skin: color, monster: true, scale: size });
    return m;
  };
  Models.minion = function (type, variant, element) {
    const D = Combat.MINION_DEFS[type];
    switch (type) {
      case 'skeleton': return new Humanoid({ skin: '#e8e2d0', bone: true, hairStyle: 'bald', tunic: '#3a3a3a', pants: '#2a2a2a', boots: '#2a2a2a', body: 'lean', frame: 'slender', scale: 0.85, monster: true, eyeGlow: variant === 'reapers' ? '#ff3b3b' : '#8bd36b', weapon: variant === 'reapers' ? 'scythe2h' : 'sword1h', offhand: variant === 'defenders' ? 'shield' : null });
      case 'volatile_skeleton': return new Humanoid({ skin: '#ffd090', bone: true, hairStyle: 'bald', tunic: '#5a3a1a', pants: '#3a2a1a', boots: '#2a2a2a', body: 'lean', scale: 0.85, monster: true, eyeGlow: '#ff8c1a' });
      case 'mage': return new Humanoid({ skin: '#e8e2d0', bone: true, hairStyle: 'bald', tunic: '#2a2a3a', pants: '#2a2a3a', boots: '#1a1a1a', helm: 'hood', helmColor: '#2a2a3a', robe: true, body: 'lean', scale: 0.9, monster: true, eyeGlow: DATA.ELEMENT_COLOR[element] || '#b36cff', weapon: 'wand' });
      case 'golem': return constructModel(variant === 'blood' ? '#8a1a2a' : variant === 'iron' ? '#8a9098' : '#d0c8b0', 0.95);
      case 'wolf': return new Quadruped({ color: '#8a8a8a', size: 0.75, mane: '#5a5a5a' });
      case 'raven': return batModel('#2a2a3a', 0.6);
      case 'creeper': return blobModel('#4a8a3a', 0.6);
      case 'ancient': return new Humanoid({ skin: '#c9a86a', hairStyle: 'wild', hair: '#e8e2d0', tunic: '#8a6a3a', chest: '#d8b25a', pants: '#5a4a2a', boots: '#3a2a1a', body: 'heavy', frame: 'broad', scale: 1.2, monster: true, eyeGlow: '#ffe55c', armored: true, weapon: 'axe2h' });
      default: return new Humanoid({ monster: true });
    }
  };

  // ---------------------------------------------------------------- props
  Models.horse = function (mountDef, armorDef) { return new Quadruped({ color: mountDef.color, mane: mountDef.mane, size: 1.0, horse: true, legLen: 0.6, neck: 0.4, tailLen: 0.5, glow: mountDef.glow, armor: armorDef && armorDef.color ? armorDef.color : null }); };
  Models.obstacle = function (o, decor) {
    const g = new T.Group(); const r = o.r;
    if (o.kind === 'tree') {
      const trunk = mesh(cyl(r * 0.18, r * 0.25, r * 1.4, 7), mat('#4a2e14', { rough: 0.95 }), 0, r * 0.7, 0); g.add(trunk);
      const leaf = decor === 'snow' ? '#5a7a66' : decor === 'desert' ? '#7a8a3a' : decor === 'jungle' ? '#2a6a30' : '#2f5a30';
      if (decor === 'snow' || decor === 'forest' || decor === 'jungle') { for (let i = 0; i < 3; i++) { const c = mesh(cone(r * (1.1 - i * 0.25), r * 1.1, 8), mat(leaf, { rough: 0.9, flat: true }), 0, r * (1.2 + i * 0.55), 0); g.add(c); if (decor === 'snow') { const snow = mesh(cone(r * (1.12 - i * 0.25), r * 0.3, 8), mat('#e8eef5', { rough: 0.9, flat: true }), 0, r * (1.6 + i * 0.55), 0); g.add(snow); } } }
      else { const c1 = mesh(ico(r * 0.95, 1), mat(leaf, { rough: 0.9, flat: true }), 0, r * 1.7, 0); g.add(c1); const c2 = mesh(ico(r * 0.7, 1), mat(lighten(leaf, 0.1), { rough: 0.9, flat: true }), r * 0.5, r * 1.3, r * 0.3); g.add(c2); }
    } else if (o.kind === 'rock') {
      const rk = mesh(ico(r * 0.95, 1), mat('#6a6a70', { rough: 0.95, flat: true }), 0, r * 0.45, 0); rk.scale.set(1, 0.7, 0.85); rk.rotation.y = o.seed * 6; g.add(rk);
      g.add(mesh(ico(r * 0.5, 1), mat('#7a7a80', { rough: 0.95, flat: true }), r * 0.6, r * 0.25, r * 0.4));
    } else {
      const ph = 1.6 + r * 0.6; g.add(mesh(cyl(r * 0.5, r * 0.6, ph, 8), mat('#5a5250', { rough: 0.9, flat: true }), 0, ph / 2, 0)); g.add(mesh(box(r * 1.5, 0.22, r * 1.5), mat('#7a7270', { rough: 0.9 }), 0, ph + 0.1, 0)); g.add(mesh(box(r * 1.5, 0.2, r * 1.5), mat('#6a6260', { rough: 0.9 }), 0, 0.1, 0));
    }
    g.traverse(c => { if (c.isMesh) { c.castShadow = true; c.receiveShadow = true; } });
    return g;
  };
  Models.chest = function () { const g = new T.Group(); g.add(mesh(box(1.1, 0.6, 0.7), mat('#6a4a2a', { rough: 0.8 }), 0, 0.3, 0)); const lid = mesh(box(1.12, 0.3, 0.72), mat('#8a6a2a', { rough: 0.7 }), 0, 0.72, 0); g.add(lid); g.add(mesh(box(0.2, 0.2, 0.74), mat('#d8b25a', { metal: 0.8, rough: 0.3, emissive: '#d8b25a', eint: 0.4 }), 0, 0.6, 0)); g.userData.lid = lid; g.traverse(c => { if (c.isMesh) c.castShadow = true; }); return g; };
  Models.stairs = function () { const g = new T.Group(); for (let i = 0; i < 4; i++) g.add(mesh(box(1.6, 0.18, 0.4), mat('#3a3a4a', { rough: 0.9 }), 0, -0.1 - i * 0.18, -0.6 + i * 0.4)); g.add(mesh(box(1.9, 0.1, 1.9), mat('#2a2a3a'), 0, -0.05, 0)); const glow = mesh(box(1.6, 0.02, 1.6), mat('#6f8cff', { emissive: '#6f8cff', eint: 1.2, opacity: 0.5 }), 0, 0.02, 0); g.add(glow); return g; };
  Models.corpse = function () { const g = new T.Group(); const b = mesh(sphere(0.3, 8), mat('#cfc8b8', { rough: 0.9 }), 0, 0.1, 0); b.scale.set(1.3, 0.35, 0.8); g.add(b); const blood = mesh(sphere(0.25, 8), mat('#8a1a1a', { rough: 0.6 }), 0.25, 0.03, 0.1, false); blood.scale.set(1.2, 0.15, 1); g.add(blood); return g; };
  Models.wallSegment = function (color) { const g = mesh(cyl(0.4, 0.5, 1.6, 7), mat(color, { rough: 0.9, flat: true }), 0, 0.8, 0); g.castShadow = true; return g; };
  Models.gemDrop = function (color, big) { const m = mesh(geo('oct' + (big ? 1 : 0), () => new T.OctahedronGeometry(big ? 0.32 : 0.24, 0)), mat(color, { emissive: color, eint: big ? 1.0 : 0.5, metal: 0.3, rough: 0.3 }), 0, 0.4, 0); return m; };
  Models.goldDrop = function () { const g = new T.Group(); for (let i = 0; i < 3; i++) g.add(mesh(cyl(0.12, 0.12, 0.04, 10), mat('#ffd76a', { metal: 0.9, rough: 0.3, emissive: '#aa8020', eint: 0.3 }), (i - 1) * 0.12, 0.03 + (i % 2) * 0.04, (i % 2) * 0.1)); return g; };
  Models.orb = function () { return mesh(sphere(0.28, 12), mat('#ff3b3b', { emissive: '#ff3b3b', eint: 1.2, opacity: 0.9 }), 0, 0.35, 0); };


  // ---------------------------------------------------------------- environment props
  Models.prop = function (p, zone) {
    const g = new T.Group(); const k = p.kind; const s = p.s || 1;
    const wood = mat('#5a3a1a', { rough: 0.95 }), stone = mat('#6a6a70', { rough: 0.95, flat: true }), bone = mat('#d8d0c0', { rough: 0.9 }), iron = mat('#3a3a40', { metal: 0.6, rough: 0.5 });
    switch (k) {
      case 'log': { const l = mesh(cyl(0.22, 0.25, 1.8, 8), wood, 0, 0.22, 0); l.rotation.z = PI / 2; g.add(l); g.add(mesh(cyl(0.2, 0.2, 0.05, 8), mat('#a07a4a'), 0.92, 0.22, 0).rotateZ(PI / 2)); break; }
      case 'stump': g.add(mesh(cyl(0.3, 0.38, 0.5, 9), wood, 0, 0.25, 0)); g.add(mesh(cyl(0.28, 0.28, 0.04, 9), mat('#a07a4a'), 0, 0.52, 0)); break;
      case 'gravestone': { const st = mesh(box(0.5, 0.8, 0.14), stone, 0, 0.4, 0); st.rotation.z = (p.rot % 1) * 0.2 - 0.1; g.add(st); g.add(mesh(cyl(0.25, 0.25, 0.14, 12), stone, 0, 0.8, 0).rotateX(PI / 2)); break; }
      case 'bonepile': { for (let i = 0; i < 5; i++) { const b = mesh(capsule(0.035, 0.3), bone, (i - 2) * 0.12, 0.05, (i % 2) * 0.15); b.rotation.set(PI / 2, 0, i * 0.7); g.add(b); } g.add(mesh(sphere(0.12, 10), bone, 0.15, 0.12, -0.1)); break; }
      case 'rubble': for (let i = 0; i < 5; i++) { const r = mesh(ico(0.18 + (i % 3) * 0.08, 0), stone, (i - 2) * 0.25, 0.1, ((i * 7) % 3 - 1) * 0.25); r.rotation.set(i, i * 2, 0); g.add(r); } break;
      case 'mushroom': { const col = zone.decor === 'swamp' ? '#9a6aff' : '#d05a3a'; for (let i = 0; i < 3; i++) { const h = 0.3 + (i % 2) * 0.2; g.add(mesh(cyl(0.05, 0.07, h, 6), mat('#e8dcc0'), (i - 1) * 0.25, h / 2, (i % 2) * 0.15)); const cap = mesh(sphere(0.16 + (i % 2) * 0.05, 8), mat(col, { emissive: zone.decor === 'swamp' ? col : undefined, eint: 0.4 }), (i - 1) * 0.25, h, (i % 2) * 0.15); cap.scale.y = 0.55; g.add(cap); } break; }
      case 'crate': g.add(mesh(box(0.8, 0.8, 0.8), mat('#8a6a3a', { rough: 0.9 }), 0, 0.4, 0)); g.add(mesh(box(0.84, 0.06, 0.06), wood, 0, 0.4, 0.41)); g.add(mesh(box(0.06, 0.84, 0.06), wood, 0, 0.4, 0.41)); break;
      case 'torch': { const pole = mesh(cyl(0.04, 0.05, 1.4, 6), wood, 0, 0.7, 0); g.add(pole); g.add(mesh(cyl(0.09, 0.07, 0.18, 6), iron, 0, 1.45, 0)); const fl = mesh(cone(0.09, 0.3, 6), mat('#ffa030', { emissive: '#ff8020', eint: 2.0 }), 0, 1.68, 0); g.add(fl); g.userData.flame = fl; break; }
      case 'wallsconce': { g.add(mesh(cyl(0.1, 0.08, 0.2, 6), iron, 0, 1.8, 0)); const fl = mesh(cone(0.1, 0.32, 6), mat('#ffa030', { emissive: '#ff8020', eint: 2.0 }), 0, 2.05, 0); g.add(fl); g.userData.flame = fl; break; }
      case 'brazier': { g.add(mesh(cyl(0.45, 0.3, 0.5, 10), iron, 0, 0.75, 0)); g.add(mesh(cyl(0.12, 0.2, 0.6, 8), iron, 0, 0.3, 0)); const fl = mesh(cone(0.3, 0.6, 8), mat('#ffa030', { emissive: '#ff8020', eint: 2.0 }), 0, 1.25, 0); g.add(fl); g.userData.flame = fl; g.add(mesh(sphere(0.2, 8), mat('#ffe080', { emissive: '#ffe080', eint: 2.5, opacity: 0.8 }), 0, 1.05, 0)); break; }
      case 'campfire': { for (let i = 0; i < 4; i++) { const l = mesh(cyl(0.06, 0.07, 0.9, 6), wood, 0, 0.08, 0); l.rotation.set(PI / 2, 0, i * PI / 4); g.add(l); } for (let i = 0; i < 6; i++) g.add(mesh(ico(0.14, 0), stone, Math.cos(i) * 0.6, 0.08, Math.sin(i) * 0.6)); const fl = mesh(cone(0.25, 0.7, 7), mat('#ffa030', { emissive: '#ff7020', eint: 2.2 }), 0, 0.45, 0); g.add(fl); g.userData.flame = fl; break; }
      case 'candles': for (let i = 0; i < 3; i++) { g.add(mesh(cyl(0.04, 0.04, 0.15 + (i % 2) * 0.08, 6), mat('#e8e0c0'), (i - 1) * 0.12, 0.1, 0)); g.add(mesh(sphere(0.03, 6), mat('#ffd060', { emissive: '#ffb030', eint: 2.5 }), (i - 1) * 0.12, 0.22 + (i % 2) * 0.08, 0)); } break;
      case 'cobweb': { const w = new T.Mesh(Models.geo('web', () => new T.CircleGeometry(0.8, 8)), new T.MeshBasicMaterial({ color: '#ddd', transparent: true, opacity: 0.25, side: T.DoubleSide, depthWrite: false })); w.position.set(0, 1.4, 0); w.rotation.y = PI / 4; g.add(w); break; }
      case 'chains': for (let i = 0; i < 2; i++) { const c = mesh(cyl(0.02, 0.02, 1.4, 5), iron, i * 0.3, 1.2, 0); c.rotation.z = 0.15 - i * 0.3; g.add(c); g.add(mesh(torus(0.12, 0.025), iron, i * 0.3 + (i ? -0.2 : 0.2), 0.5, 0)); } break;
      case 'banner': { g.add(mesh(cyl(0.05, 0.06, 3.2, 6), wood, 0, 1.6, 0)); const b = mesh(box(0.9, 1.6, 0.03), mat(zone.id === 'kehjistan' ? '#8a2a6a' : '#8a1a2a', { rough: 0.9 }), 0, 2.2, 0.03); g.add(b); g.userData.cloth = b; g.add(mesh(sphere(0.07, 8), mat('#d8b25a', { metal: 0.8 }), 0, 3.25, 0)); break; }
      case 'obelisk': { g.add(mesh(cyl(0.2, 0.4, 2.6, 4), mat('#4a4a58', { rough: 0.7, flat: true }), 0, 1.3, 0)); g.add(mesh(box(0.1, 0.9, 0.05), mat('#7fd6ff', { emissive: '#7fd6ff', eint: 1.2 }), 0, 1.3, 0.3)); break; }
      case 'well': { g.add(mesh(cyl(0.9, 0.9, 0.8, 12), stone, 0, 0.4, 0)); g.add(mesh(cyl(0.7, 0.7, 0.1, 12), mat('#1a3a4a', { rough: 0.2, metal: 0.3 }), 0, 0.82, 0)); [-1, 1].forEach(sg => g.add(mesh(box(0.1, 1.4, 0.1), wood, sg * 0.8, 1.3, 0))); g.add(mesh(cone(1.1, 0.6, 4), wood, 0, 2.3, 0)); break; }
      default: g.add(mesh(ico(0.3, 0), stone, 0, 0.2, 0));
    }
    g.scale.setScalar(s); g.rotation.y = p.rot || 0;
    g.traverse(c => { if (c.isMesh) { c.castShadow = true; c.receiveShadow = true; } });
    return g;
  };
  // obstacle kinds beyond tree/rock/pillar
  Models.obstacleExtra = function (o, zone) {
    const g = new T.Group(); const r = o.r;
    const wood = mat('#5a3a1a', { rough: 0.95 }), stone = mat('#5a5a62', { rough: 0.95, flat: true });
    switch (o.kind) {
      case 'cactus': { g.add(mesh(capsule(0.22, 1.2), mat('#3a7a3a', { rough: 0.9 }), 0, 0.85, 0)); const a = mesh(capsule(0.12, 0.5), mat('#3a7a3a', { rough: 0.9 }), 0.35, 0.9, 0); a.rotation.z = -0.6; g.add(a); const b = mesh(capsule(0.12, 0.4), mat('#3a7a3a', { rough: 0.9 }), -0.32, 0.7, 0); b.rotation.z = 0.6; g.add(b); break; }
      case 'palm': { const t = mesh(cyl(0.12, 0.2, 3.2, 7), wood, 0, 1.6, 0); t.rotation.z = 0.12; g.add(t); for (let i = 0; i < 6; i++) { const leaf = mesh(box(1.6, 0.04, 0.35), mat('#2f7a35', { rough: 0.9 }), Math.cos(i) * 0.7, 3.1, Math.sin(i) * 0.7); leaf.rotation.y = -i; leaf.rotation.z = -0.5; g.add(leaf); } break; }
      case 'barrel': { g.add(mesh(cyl(0.4 * r / 0.45, 0.35 * r / 0.45, 0.9, 10), mat('#7a5a2a', { rough: 0.9 }), 0, 0.45, 0)); [0.2, 0.7].forEach(y => g.add(mesh(torus(0.4 * r / 0.45, 0.025), mat('#3a3a40', { metal: 0.6 }), 0, y, 0).rotateX(PI / 2))); break; }
      case 'cart': { g.add(mesh(box(1.8, 0.5, 1.1), wood, 0, 0.7, 0)); [-1, 1].forEach(sg => { const w = mesh(cyl(0.45, 0.45, 0.1, 10), wood, sg * 0.7, 0.45, 0.6); w.rotation.x = PI / 2; g.add(w); const w2 = w.clone(); w2.position.z = -0.6; g.add(w2); }); g.add(mesh(box(0.1, 0.1, 1.6), wood, -1.2, 0.6, 0).rotateZ(0.3)); break; }
      case 'tent': { g.add(mesh(cone(1.5, 1.6, 4), mat(zone.decor === 'snow' ? '#8a7a66' : '#7a6a4a', { rough: 0.95, flat: true }), 0, 0.8, 0)); g.add(mesh(cyl(0.04, 0.04, 1.6, 5), wood, 0, 0.8, 0)); break; }
      case 'tower': { g.add(mesh(cyl(r * 0.9, r, 4.5, 10), stone, 0, 2.25, 0)); for (let i = 0; i < 8; i++) g.add(mesh(box(0.4, 0.5, 0.4), stone, Math.cos(i / 8 * PI * 2) * r * 0.85, 4.7, Math.sin(i / 8 * PI * 2) * r * 0.85)); break; }
      case 'barricade': { for (let i = 0; i < 4; i++) { const s = mesh(cyl(0.06, 0.08, 1.6, 5), wood, (i - 1.5) * 0.5, 0.6, 0); s.rotation.z = (i % 2 ? 0.7 : -0.7); g.add(s); } g.add(mesh(box(2.2, 0.08, 0.08), wood, 0, 0.9, 0)); break; }
      case 'well': return Models.prop({ kind: 'well', rot: 0 }, zone);
      default: return Models.obstacle(o, zone.decor);
    }
    g.traverse(c => { if (c.isMesh) { c.castShadow = true; c.receiveShadow = true; } });
    return g;
  };
  Models.hut = function (o) {
    const g = new T.Group(); const w = o.hw * 2, d = o.hh * 2;
    g.add(mesh(box(w, 2.2, d), mat('#6a5a46', { rough: 0.95 }), 0, 1.1, 0));
    g.add(mesh(box(w + 0.1, 0.1, d + 0.1), mat('#3a2a1a'), 0, 2.25, 0));
    const roof = mesh(cone(Math.max(w, d) * 0.78, 1.6, 4), mat('#5a3a22', { rough: 0.95, flat: true }), 0, 3.0, 0); roof.rotation.y = PI / 4; g.add(roof);
    g.add(mesh(box(0.7, 1.3, 0.1), mat('#2a1a0a'), 0, 0.65, d / 2 + 0.03));
    g.add(mesh(box(0.5, 0.5, 0.1), mat('#ffd080', { emissive: '#ffb050', eint: 1.0 }), w / 2 - 0.6, 1.3, d / 2 + 0.03));
    g.traverse(c => { if (c.isMesh) { c.castShadow = true; c.receiveShadow = true; } });
    return g;
  };

  window.Models = Models;
})();
