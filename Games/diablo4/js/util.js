/* Sanctuary — utility helpers (global namespace: U) */
(function () {
  window.BUILD = '3'; // bump with the ?v= tags in index.html on every release
  'use strict';
  const U = {};

  // ---- Seeded RNG (mulberry32) for reproducible dungeon layouts; Math.random for loot ----
  U.seededRng = function (seed) {
    let a = seed >>> 0;
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  };
  U.rand = (min, max) => min + Math.random() * (max - min);
  U.randInt = (min, max) => Math.floor(min + Math.random() * (max - min + 1));
  U.chance = (p) => Math.random() < p;
  U.pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
  U.pickWeighted = function (arr, weightFn) {
    let total = 0;
    for (const it of arr) total += weightFn(it);
    if (total <= 0) return arr[0];
    let r = Math.random() * total;
    for (const it of arr) { r -= weightFn(it); if (r <= 0) return it; }
    return arr[arr.length - 1];
  };
  U.shuffle = function (arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
    return a;
  };
  U.clamp = (v, lo, hi) => v < lo ? lo : v > hi ? hi : v;
  U.lerp = (a, b, t) => a + (b - a) * t;
  U.dist = (ax, ay, bx, by) => Math.hypot(ax - bx, ay - by);
  U.angleTo = (ax, ay, bx, by) => Math.atan2(by - ay, bx - ax);
  U.angleDiff = function (a, b) { let d = b - a; while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2; return d; };
  U.uid = (function () { let n = Math.floor(Math.random() * 1e6); return (p) => (p || 'id') + '_' + (++n).toString(36) + Date.now().toString(36).slice(-4); })();
  U.deepClone = (o) => JSON.parse(JSON.stringify(o));
  U.round = (v, d) => { const m = Math.pow(10, d || 0); return Math.round(v * m) / m; };

  // ---- Formatting ----
  U.fmtNum = function (n) {
    if (n === undefined || n === null || isNaN(n)) return '0';
    const a = Math.abs(n);
    if (a >= 1e9) return (n / 1e9).toFixed(2) + 'B';
    if (a >= 1e6) return (n / 1e6).toFixed(2) + 'M';
    if (a >= 1e4) return (n / 1e3).toFixed(1) + 'K';
    if (a >= 100) return Math.round(n).toLocaleString();
    if (a >= 10) return (Math.round(n * 10) / 10).toString();
    return (Math.round(n * 100) / 100).toString();
  };
  U.fmtPct = (v, d) => (v >= 0 ? '+' : '') + (v * 100).toFixed(d === undefined ? 1 : d).replace(/\.0+$/, '') + '%';
  U.fmtPctPlain = (v, d) => (v * 100).toFixed(d === undefined ? 1 : d).replace(/\.0+$/, '') + '%';
  U.fmtSigned = (v) => (v >= 0 ? '+' : '') + U.fmtNum(v);
  U.cap = (s) => s ? s.charAt(0).toUpperCase() + s.slice(1) : '';
  U.title = (s) => (s || '').split(/[_\s]+/).map(U.cap).join(' ');
  U.esc = (s) => String(s === undefined || s === null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  U.fmtTime = (sec) => { sec = Math.max(0, Math.floor(sec)); const m = Math.floor(sec / 60), s = sec % 60; return m + ':' + (s < 10 ? '0' : '') + s; };

  // ---- Base64 helpers (unicode safe) ----
  U.b64enc = (str) => btoa(unescape(encodeURIComponent(str)));
  U.b64dec = (b64) => decodeURIComponent(escape(atob(b64)));

  // ---- Simple event bus ----
  U.Events = function () {
    const map = {};
    return {
      on(ev, fn) { (map[ev] = map[ev] || []).push(fn); return () => this.off(ev, fn); },
      off(ev, fn) { if (!map[ev]) return; map[ev] = map[ev].filter(f => f !== fn); },
      emit(ev, ...args) { (map[ev] || []).slice().forEach(f => { try { f(...args); } catch (e) { console.error('event handler error', ev, e); } }); }
    };
  };

  // ---- Color helpers ----
  U.hexToRgb = function (hex) {
    const h = hex.replace('#', '');
    const n = parseInt(h.length === 3 ? h.split('').map(c => c + c).join('') : h, 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  };
  U.rgba = (hex, a) => { const [r, g, b] = U.hexToRgb(hex); return `rgba(${r},${g},${b},${a})`; };
  U.mixHex = function (a, b, t) {
    const A = U.hexToRgb(a), B = U.hexToRgb(b);
    const c = A.map((v, i) => Math.round(v + (B[i] - v) * t));
    return '#' + c.map(v => v.toString(16).padStart(2, '0')).join('');
  };

  window.U = U;
})();
