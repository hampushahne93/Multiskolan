/* =========================================================
   Steal an Egg – i stil med Robloxs Steal an Egg.
   Man har en bas med en hage och ett springband. Från basen går en rak
   bana ut genom åtta zoner: Bondgården, Ängen, Skogen, Savannen, Djungeln,
   Isvidden, Dinodalen och Monsterberget. I varje zon vaktar ett djur ett bo
   med ett ägg. Sno ägget och spring hem över den gröna linjen – är man
   tillräckligt snabb (⚡ på skylten) hinner djuret inte ifatt en.
   I hagen kläcks ägget efter en liten stund till ett djur som stannar kvar
   och ger guld varje minut: kyckling 1 guld/min … jättemonster 30 guld/min.
   Springbandet ger ⚡ fart så länge man står på det, och kan bli snabbare.
   Allt sparas per gubbe. Blir man tagen förlorar man inget – ägget åker
   bara tillbaka till boet.
   ========================================================= */
import * as THREE from 'three';
import { createCharacter } from './avatar.js';
import { mergeStatic } from './merge.js';

const $ = id => document.getElementById(id);
const touch = matchMedia('(pointer: coarse)').matches;
const player = Save.active() || Save.players()[0] || null;
const soundOn = () => Save.load().settings.sound !== false;
$('pname').textContent = player ? player.name : 'Gäst';
const coins = () => player ? (Save.get(player.id) || player).coins : 0;
const showCoins = () => { $('pcoins').textContent = '🪙 ' + coins(); };
showCoins();

/* ---------- Konstanter ---------- */
const GRAVITY = -22, JUMP = 8.4;
const RAD = 0.32, HEIGHT = 1.6, STEP = 0.45, FOOT = 0.14;
const ZLEN = 40, TRACK_W = 7;                    // varje zon är 40 m lång, banan 14 m bred
const PEN_SLOTS = 10;
const runSpeed = sp => Math.min(16, 6 + sp * 0.0125);   // ⚡ 0 = 6 m/s, ⚡ 720 = 15 m/s
const TREAD = [{ rate: 1 }, { rate: 2, cost: 30 }, { rate: 4, cost: 120 }, { rate: 7, cost: 400 }, { rate: 12, cost: 1200 }, { rate: 20, cost: 3000 }];

/* ---------- Zoner och djur ---------- */
const ZONES = [
  { id: 'gard', name: 'Bondgården', ic: '🐔', req: 0, ground: '#8fd46a', wall: '#c98d52', hatch: 10, egg: ['speckle', '#fff6e0', '#c9a27a'], eggS: 0.55, animals: ['kyckling', 'anka'] },
  { id: 'ang', name: 'Ängen', ic: '🌼', req: 15, ground: '#a6e07a', wall: '#ffffff', hatch: 15, egg: ['dots', '#ffd6ec', '#ff6fb0'], eggS: 0.6, animals: ['kanin', 'gris'] },
  { id: 'skog', name: 'Skogen', ic: '🌲', req: 50, ground: '#5fae4a', wall: '#7a5230', hatch: 20, egg: ['leaves', '#c9eea8', '#3f8f33'], eggS: 0.65, animals: ['rav', 'radjur'] },
  { id: 'savann', name: 'Savannen', ic: '🦒', req: 110, ground: '#e9cf86', wall: '#b08a4a', hatch: 25, egg: ['spots', '#ffe7a8', '#c98a3a'], eggS: 0.7, animals: ['zebra', 'giraff'] },
  { id: 'djungel', name: 'Djungeln', ic: '🐒', req: 200, ground: '#4c9a3c', wall: '#2f6b2a', hatch: 30, egg: ['stripes', '#a8e88a', '#2f7a2a'], eggS: 0.75, animals: ['apa', 'tiger'] },
  { id: 'is', name: 'Isvidden', ic: '❄️', req: 330, ground: '#eef7ff', wall: '#a8d4f0', hatch: 40, egg: ['flakes', '#bfe6ff', '#ffffff'], eggS: 0.8, animals: ['pingvin', 'isbjorn'] },
  { id: 'dino', name: 'Dinodalen', ic: '🦖', req: 500, ground: '#9fb85a', wall: '#6b5a3a', hatch: 50, egg: ['spots', '#d6ee9a', '#5a8a2a'], eggS: 0.95, animals: ['triceratops', 'trex'] },
  { id: 'monster', name: 'Monsterberget', ic: '👾', req: 720, ground: '#6a4f8a', wall: '#2a1f3a', hatch: 60, egg: ['spikes', '#8a5cff', '#ff5ccf'], eggS: 1.1, animals: ['drake', 'monster'] }
];
const ANIMALS = {
  kyckling: { name: 'Kyckling', def: 'Kycklingen', ic: '🐥', rate: 1 },
  anka: { name: 'Anka', def: 'Ankan', ic: '🦆', rate: 1 },
  kanin: { name: 'Kanin', def: 'Kaninen', ic: '🐰', rate: 2 },
  gris: { name: 'Gris', def: 'Grisen', ic: '🐷', rate: 2 },
  rav: { name: 'Räv', def: 'Räven', ic: '🦊', rate: 3 },
  radjur: { name: 'Rådjur', def: 'Rådjuret', ic: '🦌', rate: 4 },
  zebra: { name: 'Zebra', def: 'Zebran', ic: '🦓', rate: 5 },
  giraff: { name: 'Giraff', def: 'Giraffen', ic: '🦒', rate: 6 },
  apa: { name: 'Apa', def: 'Apan', ic: '🐒', rate: 7 },
  tiger: { name: 'Tiger', def: 'Tigern', ic: '🐯', rate: 9 },
  pingvin: { name: 'Pingvin', def: 'Pingvinen', ic: '🐧', rate: 10 },
  isbjorn: { name: 'Isbjörn', def: 'Isbjörnen', ic: '🐻‍❄️', rate: 12 },
  triceratops: { name: 'Triceratops', def: 'Triceratopsen', ic: '🦕', rate: 15 },
  trex: { name: 'T-rex', def: 'T-rexen', ic: '🦖', rate: 20 },
  drake: { name: 'Drake', def: 'Draken', ic: '🐉', rate: 25 },
  monster: { name: 'Jättemonster', def: 'Jättemonstret', ic: '👾', rate: 30 }
};
const zoneOf = id => ZONES.findIndex(z => z.animals.includes(id));

/* ---------- Ljud och tal ---------- */
let ac = null;
function tone(f, dur = 0.15, type = 'triangle', vol = 0.08, when = 0, slide = 0) {
  if (!soundOn()) return;
  try {
    ac = ac || new (window.AudioContext || window.webkitAudioContext)();
    if (ac.state === 'suspended') ac.resume();
    const t = ac.currentTime + when, o = ac.createOscillator(), g = ac.createGain();
    o.type = type; o.frequency.setValueAtTime(f, t); if (slide) o.frequency.exponentialRampToValueAtTime(f * slide, t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(ac.destination); o.start(t); o.stop(t + dur + 0.03);
  } catch (e) {}
}
const sJump = () => tone(420, 0.16, 'sine', 0.06, 0, 1.8);
const sGrab = () => [523, 659, 784].forEach((f, i) => tone(f, 0.14, 'square', 0.05, i * 0.06));
const sAlarm = () => { tone(880, 0.12, 'square', 0.05); tone(660, 0.12, 'square', 0.05, 0.14); tone(880, 0.12, 'square', 0.05, 0.28); };
const sCaught = () => { tone(300, 0.4, 'sawtooth', 0.06, 0, 0.4); };
const sSafe = () => [784, 988, 1175].forEach((f, i) => tone(f, 0.18, 'triangle', 0.08, i * 0.08));
const sHatch = () => [523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, 0.22, 'triangle', 0.09, i * 0.08));
const sTick = () => tone(1760, 0.05, 'square', 0.015);
const sBuy = () => [659, 880, 1175, 1568].forEach((f, i) => tone(f, 0.18, 'square', 0.04, i * 0.07));
let svVoice = null;
function pickVoice() { try { svVoice = speechSynthesis.getVoices().find(v => /^sv/i.test(v.lang)) || null; } catch (e) {} }
try { pickVoice(); speechSynthesis.onvoiceschanged = pickVoice; } catch (e) {}
function say(t) {
  if (!soundOn()) return;
  try { speechSynthesis.cancel(); const u = new SpeechSynthesisUtterance(t); u.lang = 'sv-SE'; if (svVoice) u.voice = svVoice; u.rate = 0.95; u.pitch = 1.15; speechSynthesis.speak(u); } catch (e) {}
}

/* ---------- Renderare och scen ---------- */
const canvas = $('game');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: !touch });
const MAX_PR = Math.min(window.devicePixelRatio || 1, touch ? 1.5 : 2);
let pixelRatio = MAX_PR;
renderer.setPixelRatio(pixelRatio);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
const scene = new THREE.Scene();
scene.background = new THREE.Color('#9fdcff');
scene.fog = new THREE.Fog('#9fdcff', 70, 230);
const camera = new THREE.PerspectiveCamera(62, 1, 0.1, 900);
const hemi = new THREE.HemisphereLight('#ffffff', '#9ccf7a', 1.8);
scene.add(hemi);
const sun = new THREE.DirectionalLight('#fff4dc', 2.0);
scene.add(sun, sun.target);
function seeded(seed) { let s = seed >>> 0; return () => (s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296; }
const R = seeded(424242);
const rr = (a, b) => a + (b - a) * R();

/* ---------- Kollision (lådor) ---------- */
const boxes = [], buckets = new Map(), BK = 4;
function addBox(b) {
  b.c = Math.cos(b.yaw || 0); b.s = Math.sin(b.yaw || 0);
  b.top = b.y + b.hy; b.bot = b.y - b.hy; b.r = Math.hypot(b.hx, b.hz);
  for (let k = Math.floor(b.bot / BK); k <= Math.floor(b.top / BK); k++) { if (!buckets.has(k)) buckets.set(k, []); buckets.get(k).push(b); }
  boxes.push(b); return b;
}
let stamp = 0;
const nearList = [];
function near(x, z, y0, y1) {
  stamp++; nearList.length = 0;
  for (let k = Math.floor(y0 / BK); k <= Math.floor(y1 / BK); k++) {
    const arr = buckets.get(k); if (!arr) continue;
    for (const b of arr) {
      if (b.seen === stamp) continue; b.seen = stamp;
      if (Math.abs(b.x - x) > b.r + 1 || Math.abs(b.z - z) > b.r + 1) continue;
      nearList.push(b);
    }
  }
  return nearList;
}
const toLocal = (b, x, z) => { const dx = x - b.x, dz = z - b.z; return [dx * b.c - dz * b.s, dx * b.s + dz * b.c]; };
const toWorld = (b, lx, lz) => [b.x + lx * b.c + lz * b.s, b.z - lx * b.s + lz * b.c];
const inside = (b, x, z, m) => { const [lx, lz] = toLocal(b, x, z); return Math.abs(lx) <= b.hx + m && Math.abs(lz) <= b.hz + m; };
function supportAt(x, z, yMin, yMax) {
  let best = null, by = -Infinity;
  for (const b of near(x, z, yMin - 1, yMax + 1)) {
    if (b.top > yMax || b.top < yMin || b.top <= by) continue;
    if (!inside(b, x, z, FOOT)) continue;
    best = b; by = b.top;
  }
  return best;
}
function pushOut(x, z, y, tol) {
  for (let pass = 0; pass < 2; pass++) {
    for (const b of near(x, z, y - 1, y + HEIGHT + 1)) {
      if (y >= b.top - tol || y + HEIGHT <= b.bot) continue;
      let [lx, lz] = toLocal(b, x, z);
      const cx = Math.max(-b.hx, Math.min(b.hx, lx)), cz = Math.max(-b.hz, Math.min(b.hz, lz));
      let dx = lx - cx, dz = lz - cz, d2 = dx * dx + dz * dz;
      if (d2 >= RAD * RAD) continue;
      if (d2 > 1e-8) { const d = Math.sqrt(d2), k = (RAD - d) / d; lx += dx * k; lz += dz * k; }
      else { const px = b.hx - Math.abs(lx), pz = b.hz - Math.abs(lz); if (px < pz) lx = Math.sign(lx || 1) * (b.hx + RAD); else lz = Math.sign(lz || 1) * (b.hz + RAD); }
      [x, z] = toWorld(b, lx, lz);
    }
  }
  // säkerhetsgränser (väggarna gör jobbet, det här är bara om något går fel)
  x = Math.max(-23, Math.min(23, x)); z = Math.max(-37, Math.min(ZONES.length * ZLEN - 0.5, z));
  if (z > 0.3) x = Math.max(-TRACK_W + RAD, Math.min(TRACK_W - RAD, x));
  return [x, z];
}

/* ---------- Material och texturer ---------- */
const matCache = new Map();
const lam = (c, extra) => { const k = c + (extra ? Object.entries(extra).map(([a, v]) => a + '=' + (v && v.uuid ? v.uuid : v)).join(',') : ''); if (!matCache.has(k)) matCache.set(k, new THREE.MeshLambertMaterial({ color: c, ...extra })); return matCache.get(k); };
function canvasTex(w, h, draw, repeat = false) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}
const glowTex = canvasTex(64, 64, (g) => {
  const r = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(0.3, 'rgba(255,255,255,.8)'); r.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = r; g.fillRect(0, 0, 64, 64);
});
const blobTex = canvasTex(64, 64, (g) => { const r = g.createRadialGradient(32, 32, 0, 32, 32, 32); r.addColorStop(0, 'rgba(0,0,0,.45)'); r.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = r; g.fillRect(0, 0, 64, 64); });
const cloudTex = canvasTex(256, 128, (g) => {
  for (const [x, y, r] of [[70, 80, 46], [120, 62, 58], [175, 78, 46], [128, 92, 44], [210, 92, 30], [40, 98, 28]]) {
    const gr = g.createRadialGradient(x, y, r * 0.2, x, y, r); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.7, 'rgba(255,255,255,.9)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill();
  }
});
const noiseTex = canvasTex(128, 128, (g, w, h) => { g.fillStyle = '#ffffff'; g.fillRect(0, 0, w, h); const r = seeded(5); for (let i = 0; i < 260; i++) { g.fillStyle = `rgba(0,0,0,${0.03 + r() * 0.05})`; g.fillRect(r() * w, r() * h, 2 + r() * 3, 2 + r() * 5); } for (let i = 0; i < 40; i++) { g.fillStyle = 'rgba(255,255,255,.35)'; g.beginPath(); g.arc(r() * w, r() * h, 2 + r() * 3, 0, 7); g.fill(); } }, true);
const beltTex = canvasTex(64, 128, (g, w, h) => { g.fillStyle = '#2a2f45'; g.fillRect(0, 0, w, h); g.fillStyle = '#3ee8ff'; for (let i = 0; i < 4; i++) { const y = i * 32 + 6; g.beginPath(); g.moveTo(8, y + 18); g.lineTo(32, y); g.lineTo(56, y + 18); g.lineTo(46, y + 18); g.lineTo(32, y + 8); g.lineTo(18, y + 18); g.fill(); } }, true);
function stripeTex(bg, fg, n = 10, wobble = true) {
  return canvasTex(256, 128, (g, w, h) => {
    g.fillStyle = bg; g.fillRect(0, 0, w, h); g.fillStyle = fg;
    for (let i = 0; i < n; i++) { const x = i * w / n; g.beginPath(); g.moveTo(x, 0); for (let y = 0; y <= h; y += 16) g.lineTo(x + (wobble ? Math.sin(y / 12 + i) * 5 : 0), y); g.lineTo(x + w / n * 0.45, h); for (let y = h; y >= 0; y -= 16) g.lineTo(x + w / n * 0.45 + (wobble ? Math.sin(y / 12 + i + 1) * 5 : 0), y); g.fill(); }
  }, true);
}
const spotTex = (bg, fg) => canvasTex(256, 128, (g, w, h) => { g.fillStyle = bg; g.fillRect(0, 0, w, h); const r = seeded(bg.length * 31); g.fillStyle = fg; for (let i = 0; i < 26; i++) { g.beginPath(); g.ellipse(r() * w, r() * h, 9 + r() * 7, 7 + r() * 6, r() * 3, 0, 7); g.fill(); } }, true);
const zebraTex = stripeTex('#ffffff', '#1f1f28', 12);
const tigerTex = stripeTex('#ff8a2a', '#2a1a10', 9);
const giraffeTex = spotTex('#ffd27a', '#b06a28');

/* ---------- Ägg ---------- */
function eggCanvas(d, seed) {
  const W = 256, H = 128, c = document.createElement('canvas'); c.width = W; c.height = H;
  const g = c.getContext('2d'), r = seeded(seed), [kind, a, b] = d;
  const circle = (x, y, rad, col) => { for (const X of [x, x - W, x + W]) { g.fillStyle = col; g.beginPath(); g.arc(X, y, rad, 0, 7); g.fill(); } };
  g.fillStyle = a; g.fillRect(0, 0, W, H);
  if (kind === 'speckle') for (let i = 0; i < 150; i++) circle(r() * W, r() * H, 1 + r() * 3, b);
  else if (kind === 'dots') { for (let j = 0; j < 4; j++) for (let i = 0; i < 6; i++) circle(i * 43 + (j % 2) * 21, 14 + j * 33, 9, b); }
  else if (kind === 'leaves') { for (let i = 0; i < 30; i++) { const x = r() * W, y = r() * H, t = r() * 3; g.save(); g.translate(x, y); g.rotate(t); g.fillStyle = b; g.beginPath(); g.ellipse(0, 0, 12, 5, 0, 0, 7); g.fill(); g.restore(); } }
  else if (kind === 'spots') { for (let i = 0; i < 26; i++) circle(r() * W, r() * H, 5 + r() * 9, b); }
  else if (kind === 'stripes') { g.fillStyle = b; for (let j = 0; j < 7; j++) if (j % 2) g.fillRect(0, j * H / 7, W, H / 7); }
  else if (kind === 'flakes') { g.strokeStyle = b; g.lineWidth = 3; for (let j = 0; j < 3; j++) for (let i = 0; i < 5; i++) { const x = i * 51 + (j % 2) * 25, y = 22 + j * 40; for (let k = 0; k < 3; k++) { const t = k * Math.PI / 3; g.beginPath(); g.moveTo(x - Math.cos(t) * 12, y - Math.sin(t) * 12); g.lineTo(x + Math.cos(t) * 12, y + Math.sin(t) * 12); g.stroke(); } } }
  else if (kind === 'spikes') { g.fillStyle = b; for (let j = 0; j < 3; j++) for (let i = 0; i < 8; i++) { const x = i * 32 + (j % 2) * 16, y = 20 + j * 42; g.beginPath(); g.moveTo(x - 10, y + 12); g.lineTo(x, y - 14); g.lineTo(x + 10, y + 12); g.fill(); } }
  return c;
}
const eggPts = [];
for (let i = 0; i <= 20; i++) { const t = i / 20 * Math.PI; eggPts.push(new THREE.Vector2(Math.max(0.0001, Math.sin(t) * 0.45 * (1 + 0.12 * Math.cos(t))), -Math.cos(t) * 0.62)); }
const eggGeo = new THREE.LatheGeometry(eggPts, 24);
for (const [i, z] of ZONES.entries()) {
  z.cv = eggCanvas(z.egg, i * 97 + 13);
  const t = new THREE.CanvasTexture(z.cv); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = THREE.RepeatWrapping;
  z.eggMat = new THREE.MeshPhongMaterial({ map: t, shininess: 50, specular: '#444444' });
}
function eggMesh(zi, s = 1) { const m = new THREE.Mesh(eggGeo, ZONES[zi].eggMat); m.scale.setScalar(ZONES[zi].eggS * s); return m; }
function eggPath(g, w, h) {
  const m = w * 0.07;
  g.beginPath(); g.moveTo(w / 2, m);
  g.bezierCurveTo(w * 0.86, m, w - m, h * 0.36, w - m, h * 0.62);
  g.bezierCurveTo(w - m, h * 0.86, w * 0.78, h - m, w / 2, h - m);
  g.bezierCurveTo(w * 0.22, h - m, m, h * 0.86, m, h * 0.62);
  g.bezierCurveTo(m, h * 0.36, w * 0.14, m, w / 2, m);
  g.closePath();
}

/* ---------- Djuren (byggs av enkla former) ---------- */
const SPH = new THREE.SphereGeometry(1, 16, 12), CYL = new THREE.CylinderGeometry(1, 1, 1, 12), CONE = new THREE.ConeGeometry(1, 1, 12), BOX = new THREE.BoxGeometry(1, 1, 1);
function creature(id) {
  const root = new THREE.Group(), body = new THREE.Group(); root.add(body);
  const legs = [];
  const P_ = (geo, mat, x, y, z, sx, sy, sz, rx = 0, ry = 0, rz = 0, parent = body) => {
    const m = new THREE.Mesh(geo, typeof mat === 'string' ? lam(mat) : mat); m.position.set(x, y, z); m.scale.set(sx, sy ?? sx, sz ?? sx); m.rotation.set(rx, ry, rz); parent.add(m); return m;
  };
  const ball = (mat, x, y, z, sx, sy, sz) => P_(SPH, mat, x, y, z, sx, sy, sz);
  const eye = (x, y, z, s = 0.06) => { ball('#ffffff', x, y, z, s * 1.4); ball('#1b1320', x, y, z + s * 0.7, s * 0.8); };
  const eyes = (y, z, dx, s) => { eye(-dx, y, z, s); eye(dx, y, z, s); };
  const leg = (x, z, len, r, mat, phase = 0) => { const g = new THREE.Group(); g.position.set(x, len, z); body.add(g); P_(CYL, mat, 0, -len / 2, 0, r, len, r, 0, 0, 0, g); legs.push({ g, phase }); return g; };
  const quadLegs = (hw, front, back, len, r, mat) => { leg(-hw, front, len, r, mat, 0); leg(hw, front, len, r, mat, Math.PI); leg(-hw, back, len, r, mat, Math.PI); leg(hw, back, len, r, mat, 0); };
  let height = 1, rad = 0.5;
  switch (id) {
    case 'kyckling':
      ball('#ffe14a', 0, 0.4, 0, 0.32); ball('#ffe14a', 0, 0.78, 0.1, 0.22); eyes(0.84, 0.28, 0.08, 0.04);
      P_(CONE, '#ff9a2a', 0, 0.76, 0.34, 0.06, 0.14, 0.06, Math.PI / 2); ball('#ffd23f', -0.3, 0.42, 0, 0.08, 0.16, 0.22); ball('#ffd23f', 0.3, 0.42, 0, 0.08, 0.16, 0.22);
      leg(-0.1, 0, 0.16, 0.03, '#ff9a2a', 0); leg(0.1, 0, 0.16, 0.03, '#ff9a2a', Math.PI); height = 1.0; rad = 0.35; break;
    case 'anka':
      ball('#ffffff', 0, 0.45, 0, 0.34, 0.3, 0.44); ball('#ffffff', 0, 0.85, 0.25, 0.2); eyes(0.92, 0.42, 0.09, 0.04);
      P_(BOX, '#ff9a2a', 0, 0.82, 0.48, 0.16, 0.05, 0.18); ball('#ffffff', 0, 0.55, -0.42, 0.1, 0.12, 0.12);
      leg(-0.12, 0, 0.18, 0.035, '#ff9a2a', 0); leg(0.12, 0, 0.18, 0.035, '#ff9a2a', Math.PI); height = 1.1; rad = 0.4; break;
    case 'kanin':
      ball('#f0ecf4', 0, 0.38, 0, 0.3, 0.28, 0.36); ball('#f0ecf4', 0, 0.72, 0.24, 0.22); eyes(0.76, 0.43, 0.09, 0.04); ball('#ff8fb8', 0, 0.68, 0.46, 0.04);
      for (const s of [-1, 1]) { ball('#f0ecf4', s * 0.08, 1.08, 0.2, 0.06, 0.24, 0.05); ball('#ffb3d9', s * 0.08, 1.08, 0.23, 0.035, 0.18, 0.03); }
      ball('#ffffff', 0, 0.42, -0.38, 0.1); quadLegs(0.14, 0.18, -0.16, 0.14, 0.06, '#f0ecf4'); height = 1.3; rad = 0.4; break;
    case 'gris':
      ball('#ffb3c8', 0, 0.48, 0, 0.36, 0.32, 0.46); ball('#ffb3c8', 0, 0.62, 0.42, 0.24); eyes(0.72, 0.6, 0.1, 0.04);
      P_(CYL, '#ff8fb0', 0, 0.58, 0.67, 0.1, 0.06, 0.1, Math.PI / 2); for (const s of [-1, 1]) P_(CONE, '#ff8fb0', s * 0.14, 0.86, 0.38, 0.07, 0.14, 0.05, -0.3, 0, s * 0.4);
      P_(new THREE.TorusGeometry(0.06, 0.02, 6, 12), '#ff8fb0', 0, 0.6, -0.48, 1, 1, 1, 0, Math.PI / 2);
      quadLegs(0.18, 0.25, -0.25, 0.22, 0.07, '#ff9fbb'); height = 1.0; rad = 0.5; break;
    case 'rav':
      ball('#ff7a2a', 0, 0.5, 0, 0.28, 0.26, 0.48); ball('#ffffff', 0, 0.44, 0.26, 0.18, 0.18, 0.2); ball('#ff7a2a', 0, 0.74, 0.46, 0.22);
      P_(CONE, '#ff7a2a', 0, 0.7, 0.7, 0.1, 0.24, 0.1, Math.PI / 2); ball('#1b1320', 0, 0.7, 0.82, 0.035); eyes(0.8, 0.62, 0.09, 0.04);
      for (const s of [-1, 1]) P_(CONE, '#ff7a2a', s * 0.12, 0.98, 0.42, 0.07, 0.18, 0.05);
      const tl = ball('#ff7a2a', 0, 0.62, -0.62, 0.14, 0.14, 0.34); tl.rotation.x = -0.6; ball('#ffffff', 0, 0.78, -0.86, 0.1);
      quadLegs(0.14, 0.28, -0.26, 0.26, 0.05, '#3a2418'); height = 1.1; rad = 0.5; break;
    case 'radjur':
      ball('#b5784a', 0, 0.85, 0, 0.26, 0.26, 0.5); ball('#b5784a', 0, 1.18, 0.44, 0.1, 0.24, 0.1); ball('#b5784a', 0, 1.36, 0.56, 0.17, 0.15, 0.22); eyes(1.42, 0.68, 0.1, 0.035);
      ball('#1b1320', 0, 1.33, 0.76, 0.04); for (const s of [-1, 1]) { P_(CYL, '#8a5a32', s * 0.08, 1.62, 0.5, 0.02, 0.3, 0.02, 0, 0, s * 0.3); P_(CYL, '#8a5a32', s * 0.16, 1.7, 0.5, 0.015, 0.14, 0.015, 0, 0, s * 1.1); }
      ball('#ffffff', 0, 0.98, -0.5, 0.08); for (let i = 0; i < 5; i++) ball('#ffffff', (i % 2 ? 0.12 : -0.12), 0.95, -0.2 + i * 0.1, 0.035);
      quadLegs(0.13, 0.3, -0.3, 0.62, 0.04, '#9a6a3c'); height = 1.8; rad = 0.5; break;
    case 'zebra': {
      const zm = lam('#ffffff', { map: zebraTex });
      ball(zm, 0, 0.95, 0, 0.32, 0.32, 0.6); ball(zm, 0, 1.3, 0.5, 0.13, 0.3, 0.13).rotation.x = 0.5; ball(zm, 0, 1.52, 0.72, 0.13, 0.13, 0.28); ball('#2a2a32', 0, 1.46, 0.96, 0.1, 0.09, 0.08);
      eyes(1.6, 0.8, 0.11, 0.035); P_(BOX, '#1f1f28', 0, 1.45, 0.52, 0.05, 0.4, 0.3, 0.5); for (const s of [-1, 1]) P_(CONE, '#ffffff', s * 0.07, 1.74, 0.66, 0.04, 0.12, 0.03);
      P_(CYL, '#1f1f28', 0, 0.9, -0.62, 0.025, 0.4, 0.025, 0.4); quadLegs(0.16, 0.35, -0.35, 0.66, 0.06, zm); height = 1.9; rad = 0.6; break;
    }
    case 'giraff': {
      const gm = lam('#ffffff', { map: giraffeTex });
      ball(gm, 0, 1.4, 0, 0.32, 0.32, 0.5); P_(CYL, gm, 0, 2.15, 0.36, 0.1, 1.4, 0.1, 0.3); ball(gm, 0, 2.85, 0.6, 0.14, 0.14, 0.28); ball('#c98a4a', 0, 2.8, 0.85, 0.1, 0.08, 0.08); eyes(2.92, 0.7, 0.12, 0.035);
      for (const s of [-1, 1]) { P_(CYL, '#c98a4a', s * 0.06, 3.07, 0.52, 0.02, 0.14, 0.02); ball('#7a4a20', s * 0.06, 3.15, 0.52, 0.035); }
      P_(CYL, '#b06a28', 0, 1.3, -0.52, 0.02, 0.5, 0.02, 0.4); quadLegs(0.17, 0.28, -0.28, 1.1, 0.06, gm); height = 3.2; rad = 0.6; break;
    }
    case 'apa':
      ball('#8a5a32', 0, 0.62, 0, 0.26, 0.32, 0.24); ball('#8a5a32', 0, 1.06, 0.04, 0.22); ball('#e8c9a0', 0, 1.02, 0.2, 0.16, 0.13, 0.08); eyes(1.1, 0.24, 0.07, 0.035);
      for (const s of [-1, 1]) { ball('#8a5a32', s * 0.22, 1.1, 0, 0.08, 0.08, 0.04); ball('#e8c9a0', s * 0.22, 1.1, 0.02, 0.05, 0.05, 0.03); }
      for (const s of [-1, 1]) P_(CYL, '#8a5a32', s * 0.3, 0.6, 0.05, 0.05, 0.5, 0.05, 0, 0, s * 0.25);
      P_(new THREE.TorusGeometry(0.22, 0.035, 6, 16, Math.PI * 1.4), '#8a5a32', 0, 0.55, -0.32, 1, 1, 1, 0, Math.PI / 2);
      leg(-0.12, 0, 0.32, 0.06, '#8a5a32', 0); leg(0.12, 0, 0.32, 0.06, '#8a5a32', Math.PI); height = 1.4; rad = 0.4; break;
    case 'tiger': {
      const tm = lam('#ffffff', { map: tigerTex });
      ball(tm, 0, 0.62, 0, 0.32, 0.3, 0.62); ball(tm, 0, 0.86, 0.6, 0.27, 0.25, 0.25); ball('#ffffff', 0, 0.78, 0.8, 0.13, 0.1, 0.08); ball('#ff6fa0', 0, 0.83, 0.88, 0.04);
      eyes(0.94, 0.8, 0.11, 0.045); for (const s of [-1, 1]) ball(tm, s * 0.18, 1.08, 0.56, 0.08, 0.08, 0.04);
      const t2 = P_(CYL, tm, 0, 0.78, -0.82, 0.05, 0.6, 0.05, -0.9); quadLegs(0.18, 0.38, -0.38, 0.38, 0.08, tm); height = 1.3; rad = 0.6; break;
    }
    case 'pingvin':
      ball('#22243a', 0, 0.55, 0, 0.36, 0.5, 0.34); ball('#ffffff', 0, 0.5, 0.12, 0.28, 0.42, 0.26); ball('#22243a', 0, 1.05, 0.02, 0.25);
      eyes(1.1, 0.22, 0.08, 0.045); P_(CONE, '#ffa024', 0, 1.0, 0.3, 0.06, 0.16, 0.05, Math.PI / 2);
      for (const s of [-1, 1]) ball('#22243a', s * 0.36, 0.6, 0, 0.06, 0.3, 0.16).rotation.z = s * 0.3;
      leg(-0.12, 0.05, 0.08, 0.06, '#ffa024', 0); leg(0.12, 0.05, 0.08, 0.06, '#ffa024', Math.PI); height = 1.4; rad = 0.45; break;
    case 'isbjorn':
      ball('#f6f8ff', 0, 0.85, 0, 0.5, 0.46, 0.8); ball('#f6f8ff', 0, 1.0, 0.82, 0.32, 0.3, 0.32); ball('#f6f8ff', 0, 0.94, 1.08, 0.15, 0.13, 0.12); ball('#1b1320', 0, 0.98, 1.2, 0.05);
      eyes(1.1, 1.06, 0.13, 0.04); for (const s of [-1, 1]) ball('#f6f8ff', s * 0.22, 1.3, 0.76, 0.09, 0.09, 0.06);
      quadLegs(0.3, 0.5, -0.5, 0.5, 0.15, '#eef1fa'); height = 1.6; rad = 0.9; break;
    case 'triceratops':
      ball('#7cc86a', 0, 1.0, 0, 0.6, 0.55, 1.0); ball('#7cc86a', 0, 1.05, 1.05, 0.42, 0.4, 0.45); P_(CYL, '#e7a14a', 0, 1.35, 0.85, 0.75, 0.12, 0.75, -0.9);
      for (const [x, y, s] of [[-0.18, 1.35, 0.5], [0.18, 1.35, 0.5], [0, 1.0, 0.32]]) P_(CONE, '#fff6e0', x, y, 1.45, 0.07, s, 0.07, Math.PI / 2 - 0.25);
      eyes(1.2, 1.38, 0.2, 0.06); P_(CONE, '#7cc86a', 0, 0.95, -1.15, 0.25, 0.8, 0.25, -Math.PI / 2);
      for (let i = 0; i < 6; i++) ball('#4f9a40', (i % 2 ? 0.25 : -0.2), 1.3 + (i % 3) * 0.1, -0.5 + i * 0.2, 0.09);
      quadLegs(0.38, 0.55, -0.55, 0.55, 0.17, '#6cb85a'); height = 2.0; rad = 1.1; break;
    case 'trex':
      body.rotation.x = 0.0;
      ball('#3fae5a', 0, 1.45, 0, 0.5, 0.55, 0.75).rotation.x = -0.5; ball('#3fae5a', 0, 2.15, 0.6, 0.38, 0.34, 0.55); ball('#2f8a45', 0, 1.98, 0.75, 0.32, 0.12, 0.45);
      for (let i = 0; i < 6; i++) P_(CONE, '#ffffff', -0.2 + i * 0.08, 2.05, 1.0 - Math.abs(i - 2.5) * 0.04, 0.025, 0.08, 0.025, Math.PI);
      eyes(2.35, 0.82, 0.2, 0.06); for (const s of [-1, 1]) P_(CYL, '#3fae5a', s * 0.36, 1.5, 0.48, 0.04, 0.28, 0.04, 1.0);
      P_(CONE, '#3fae5a', 0, 1.25, -1.0, 0.3, 1.4, 0.3, -Math.PI / 2 - 0.25);
      for (let i = 0; i < 5; i++) P_(CONE, '#ffd84a', 0, 1.9 - i * 0.12, 0.3 - i * 0.28, 0.06, 0.18, 0.06);
      leg(-0.28, -0.1, 0.95, 0.15, '#2f8a45', 0); leg(0.28, -0.1, 0.95, 0.15, '#2f8a45', Math.PI); height = 2.6; rad = 0.9; break;
    case 'drake':
      ball('#8a3cff', 0, 1.0, 0, 0.5, 0.46, 0.85); ball('#c9a6ff', 0, 0.9, 0.2, 0.36, 0.36, 0.6); ball('#8a3cff', 0, 1.45, 0.8, 0.14, 0.36, 0.14).rotation.x = 0.6;
      ball('#8a3cff', 0, 1.75, 1.05, 0.3, 0.26, 0.38); ball('#8a3cff', 0, 1.68, 1.38, 0.18, 0.14, 0.18); eyes(1.88, 1.3, 0.14, 0.055);
      for (const s of [-1, 1]) { P_(CONE, '#ffd84a', s * 0.14, 2.05, 0.95, 0.05, 0.28, 0.05, -0.4); const wg = new THREE.Shape(); wg.moveTo(0, 0); wg.lineTo(1.3, 0.7); wg.lineTo(1.1, 0.1); wg.lineTo(1.4, -0.2); wg.lineTo(0.9, -0.3); wg.lineTo(0.6, -0.6); wg.closePath(); const w = P_(new THREE.ShapeGeometry(wg), lam('#ff5ccf', { side: THREE.DoubleSide }), s * 0.35, 1.35, 0, 1, 1, 1, 0, s > 0 ? 0 : Math.PI, 0.4 * s); w.userData.wing = s; }
      for (let i = 0; i < 6; i++) P_(CONE, '#ffd84a', 0, 1.45 - i * 0.05, 0.4 - i * 0.28, 0.07, 0.22, 0.07);
      P_(CONE, '#8a3cff', 0, 0.85, -1.2, 0.22, 1.1, 0.22, -Math.PI / 2 - 0.2);
      quadLegs(0.32, 0.45, -0.45, 0.5, 0.13, '#7a2ce8'); height = 2.3; rad = 1.0; break;
    case 'monster':
      ball('#5b6cff', 0, 1.35, 0, 0.95, 1.0, 0.85); ball('#8ec5ff', 0, 1.1, 0.42, 0.62, 0.6, 0.5); ball('#ffffff', 0, 1.75, 0.68, 0.36); ball('#2a1f3a', 0, 1.75, 0.98, 0.18); ball('#ffffff', 0.07, 1.82, 1.1, 0.05);
      P_(BOX, '#2a1f3a', 0, 1.05, 0.82, 0.6, 0.18, 0.1); for (let i = 0; i < 4; i++) P_(CONE, '#ffffff', -0.22 + i * 0.15, 1.12, 0.88, 0.05, 0.12, 0.04, Math.PI);
      for (const s of [-1, 1]) { P_(CONE, '#ffd84a', s * 0.45, 2.35, 0.1, 0.12, 0.5, 0.12, 0, 0, -s * 0.4); P_(CYL, '#5b6cff', s * 0.95, 1.3, 0.2, 0.14, 0.9, 0.14, 0, 0, s * 0.7); ball('#5b6cff', s * 1.25, 0.95, 0.25, 0.2); }
      leg(-0.42, 0, 0.42, 0.22, '#4a58e0', 0); leg(0.42, 0, 0.42, 0.22, '#4a58e0', Math.PI); height = 2.6; rad = 1.0; break;
  }
  return { root, body, legs, height, rad, id, t: Math.random() * 6 };
}
function animateCreature(c, dt, speed) {
  c.t += dt * (speed > 0.1 ? 1 + speed * 0.6 : 1);
  const run = speed > 0.1;
  for (const l of c.legs) l.g.rotation.x = run ? Math.sin(c.t * 7 + l.phase) * 0.7 : 0;
  c.body.position.y = run ? Math.abs(Math.sin(c.t * 7)) * 0.08 * c.root.scale.x : Math.sin(c.t * 2) * 0.02;
  c.body.traverse(o => { if (o.userData.wing) o.rotation.z = o.userData.wing * (0.4 + Math.sin(c.t * (run ? 9 : 2)) * (run ? 0.5 : 0.15)); });
}

/* ---------- Bygg världen ---------- */
const G = new THREE.Group(); scene.add(G);
function mesh(geo, mat, x, y, z, yaw = 0, parent = G) { const m = new THREE.Mesh(geo, typeof mat === 'string' ? lam(mat) : mat); m.rotation.order = 'YXZ'; m.position.set(x, y, z); m.rotation.y = yaw; parent.add(m); return m; }
function block(x, y0, z, w, h, d, mat, o = {}) {
  const m = mesh(new THREE.BoxGeometry(w, h, d), mat, x, y0 + h / 2, z, o.yaw || 0);
  if (o.solid !== false) addBox({ x, y: y0 + h / 2, z, hx: w / 2, hy: h / 2, hz: d / 2, yaw: o.yaw || 0 });
  return m;
}
function ballM(x, y, z, r, mat, sx = 1, sy = 1, sz = 1, seg = 12) { const m = mesh(new THREE.SphereGeometry(r, seg, Math.max(6, seg * 0.7 | 0)), mat, x, y, z); m.scale.set(sx, sy, sz); return m; }
function cyl(x, y0, z, r, h, mat, rt = 1, seg = 12) { return mesh(new THREE.CylinderGeometry(r * rt, r, h, seg), mat, x, y0 + h / 2, z); }
function coneM(x, y0, z, r, h, mat, seg = 10) { return mesh(new THREE.ConeGeometry(r, h, seg), mat, x, y0 + h / 2, z); }
function textCanvas(c, lines, bg, fg = '#ffffff') {
  const g = c.getContext('2d'), w = c.width, h = c.height;
  g.clearRect(0, 0, w, h); g.fillStyle = bg; g.strokeStyle = '#ffffff'; g.lineWidth = 10;
  g.beginPath(); g.roundRect(8, 8, w - 16, h - 16, 40); g.fill(); g.stroke();
  g.fillStyle = fg; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.font = '700 60px Fredoka, sans-serif'; g.fillText(lines[0], w / 2, lines[1] ? h * 0.36 : h / 2);
  if (lines[1]) { g.font = '700 54px Fredoka, sans-serif'; g.fillText(lines[1], w / 2, h * 0.72); }
}
function signPlane(w, h, cw = 512, ch = 200) {
  const c = document.createElement('canvas'); c.width = cw; c.height = ch;
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  // fram- och baksida var för sig, så att texten aldrig blir spegelvänd
  const geo = new THREE.PlaneGeometry(w, h), mat = new THREE.MeshBasicMaterial({ map: t, transparent: true });
  const m = new THREE.Group(), f = new THREE.Mesh(geo, mat), b = new THREE.Mesh(geo, mat); b.rotation.y = Math.PI; m.add(f, b);
  return { m, c, t };
}
// ett sprite-ord som svävar (t.ex. "+1")
const floatCache = new Map(), floats = [];
function floatTex(txt, col) {
  const k = txt + col; if (floatCache.has(k)) return floatCache.get(k);
  const t = canvasTex(256, 96, (g, w, h) => { g.font = '700 64px Fredoka, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.lineWidth = 12; g.strokeStyle = 'rgba(40,20,80,.85)'; g.strokeText(txt, w / 2, h / 2); g.fillStyle = col; g.fillText(txt, w / 2, h / 2); });
  floatCache.set(k, t); return t;
}
function floatText(txt, x, y, z, col = '#ffd84a', s = 1) {
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: floatTex(txt, col), transparent: true, depthWrite: false }));
  sp.scale.set(1.6 * s, 0.6 * s, 1); sp.position.set(x, y, z); scene.add(sp); floats.push({ sp, life: 1.3 });
}

const nests = [], guards = [], gates = [];
let tread = null, penPads = [];
const PEN = { x0: -21, x1: -3, z0: -30, z1: -9 };
function buildBase() {
  // marken i basen och utanför
  const gt = noiseTex.clone(); gt.needsUpdate = true; gt.repeat.set(14, 10);
  const ground = mesh(new THREE.PlaneGeometry(60, 44), lam('#8fd46a', { map: gt }), 0, 0, -18); ground.rotation.x = -Math.PI / 2;
  const out = mesh(new THREE.PlaneGeometry(400, 600), lam('#7cc85a'), 0, -0.05, 150); out.rotation.x = -Math.PI / 2;
  addBox({ x: 0, y: -1, z: 150, hx: 60, hy: 1, hz: 200 });                      // marken (allt står på y = 0)
  // staket runt basen
  const fence = (x0, z0, x1, z1) => { const L = Math.hypot(x1 - x0, z1 - z0), yaw = Math.atan2(x1 - x0, z1 - z0); block((x0 + x1) / 2, 0, (z0 + z1) / 2, 0.25, 1.1, L, '#ffffff', { yaw }); for (let i = 0; i <= L; i += 2) cyl(x0 + (x1 - x0) * i / L, 0, z0 + (z1 - z0) * i / L, 0.12, 1.35, '#ffffff', 1, 6); };
  fence(-22, -36, 22, -36); fence(-22, -36, -22, 0); fence(22, -36, 22, 0); fence(-22, 0, -TRACK_W - 0.2, 0); fence(TRACK_W + 0.2, 0, 22, 0);
  // den gröna säkra linjen
  const line = mesh(new THREE.PlaneGeometry(TRACK_W * 2, 1.2), new THREE.MeshBasicMaterial({ color: '#5aff8a', transparent: true, opacity: 0.85 }), 0, 0.03, 0); line.rotation.x = -Math.PI / 2;
  // hagen: tio rutor
  const name = player ? player.name : 'Min';
  const pt = signPlane(6, 1.6); textCanvas(pt.c, [`🏡 ${name}s hage`], '#ff5ccf'); pt.t.needsUpdate = true; pt.m.position.set((PEN.x0 + PEN.x1) / 2, 3.4, PEN.z1 + 0.6); scene.add(pt.m);
  cyl(PEN.x0 + 3.3, 0, PEN.z1 + 0.6, 0.12, 3.0, '#ffffff', 1, 6); cyl(PEN.x1 - 3.3, 0, PEN.z1 + 0.6, 0.12, 3.0, '#ffffff', 1, 6);
  const pf = (x0, z0, x1, z1) => { const L = Math.hypot(x1 - x0, z1 - z0), yaw = Math.atan2(x1 - x0, z1 - z0); block((x0 + x1) / 2, 0, (z0 + z1) / 2, 0.18, 0.8, L, '#c98d52', { yaw }); };
  pf(PEN.x0, PEN.z0, PEN.x1, PEN.z0); pf(PEN.x0, PEN.z0, PEN.x0, PEN.z1); pf(PEN.x1, PEN.z0, PEN.x1, PEN.z0 + 6); pf(PEN.x1, PEN.z1 - 6, PEN.x1, PEN.z1); pf(PEN.x0, PEN.z1, PEN.x0 + 6, PEN.z1); pf(PEN.x1 - 6, PEN.z1, PEN.x1, PEN.z1);
  const straw = mesh(new THREE.PlaneGeometry(PEN.x1 - PEN.x0, PEN.z1 - PEN.z0), lam('#e9d48a', { map: gt }), (PEN.x0 + PEN.x1) / 2, 0.02, (PEN.z0 + PEN.z1) / 2); straw.rotation.x = -Math.PI / 2;
  const cols = ['#ff8fd0', '#ffd84a', '#3ee8ff', '#8dff5a', '#a77bff'];
  for (let i = 0; i < PEN_SLOTS; i++) {
    const c = i % 5, r = Math.floor(i / 5), x = PEN.x0 + 2.4 + c * 3.3, z = PEN.z0 + 5.2 + r * 9.4;
    const pad = cyl(x, 0, z, 1.25, 0.18, cols[c], 1, 24);
    penPads.push({ i, x, z, pet: null, egg: null });
  }
  // springbandet
  const bx = 9, bz = -8;
  block(bx, 0, bz, 3.2, 0.35, 6, '#6d7a8c');
  const bt = beltTex.clone(); bt.needsUpdate = true; bt.repeat.set(1, 3);
  const belt = mesh(new THREE.PlaneGeometry(2.4, 5.6), new THREE.MeshBasicMaterial({ map: bt }), bx, 0.36, bz); belt.rotation.x = -Math.PI / 2;
  for (const s of [-1, 1]) { block(bx + s * 1.45, 0.35, bz + 2.4, 0.18, 1.0, 0.18, '#c9d2de', { solid: false }); }
  block(bx, 1.3, bz + 2.4, 3.1, 0.14, 0.14, '#ff5ccf', { solid: false });
  const ts = signPlane(4, 1.4); textCanvas(ts.c, ['⚡ Springband'], '#1a8fa0'); ts.t.needsUpdate = true; ts.m.position.set(bx, 2.4, bz + 2.6); ts.m.rotation.y = Math.PI; scene.add(ts.m);
  tread = { x: bx, z: bz, hx: 1.2, hz: 2.8, tex: bt };
  // lite pynt i basen
  for (const [x, z] of [[18, -30], [-18, -3], [16, -2], [3, -32], [-6, -33]]) { cyl(x, 0, z, 0.35, 2.4, '#9a6a3c', 1, 8); ballM(x, 3.4, z, 1.6, '#5cc845'); }
  for (let i = 0; i < 40; i++) { const x = rr(-20, 20), z = rr(-34, -2); if (x < -2 && z < -8 || Math.abs(x - 9) < 3 && z > -12 && z < -4 || Math.abs(x) < 3) continue; ballM(x, 0.25, z, 0.15, ['#ff5cb8', '#ffd84a', '#ffffff', '#a77bff'][i % 4], 1, 1, 1, 6); }
}
function buildTrack() {
  ZONES.forEach((zn, k) => {
    const z0 = k * ZLEN, z1 = z0 + ZLEN, zc = z0 + ZLEN / 2;
    const gt = noiseTex.clone(); gt.needsUpdate = true; gt.repeat.set(4, 8);
    const ground = mesh(new THREE.PlaneGeometry(TRACK_W * 2, ZLEN), lam(zn.ground, { map: gt }), 0, 0.01, zc); ground.rotation.x = -Math.PI / 2;
    const side = mesh(new THREE.PlaneGeometry(70, ZLEN), lam(zn.ground), 0, -0.02, zc); side.rotation.x = -Math.PI / 2;
    // väggar längs banan
    for (const s of [-1, 1]) { block(s * (TRACK_W + 0.2), 0, zc, 0.4, 1.0, ZLEN, zn.wall); for (let i = 0; i < ZLEN; i += 4) cyl(s * (TRACK_W + 0.2), 0, z0 + i, 0.25, 1.3, zn.wall, 1, 8); }
    // port med skylt
    for (const s of [-1, 1]) cyl(s * (TRACK_W - 0.3), 0, z0 + 0.5, 0.35, 5.2, zn.wall, 1, 10);
    const sg = signPlane(9, 2.4, 768, 200); sg.m.position.set(0, 5.4, z0 + 0.5); scene.add(sg.m);
    gates.push({ k, sg, ok: null });
    // boet och vakten
    // boet ligger vid sidan av banan (växlande höger/vänster), så att man kan springa förbi i mitten
    const nz = z0 + 27, nx = (k % 2 ? -1 : 1) * 4.3;
    const nest = new THREE.Mesh(new THREE.TorusGeometry(0.85 * zn.eggS / 0.55, 0.28 * zn.eggS / 0.55, 8, 18), lam('#c9962a')); nest.rotation.x = Math.PI / 2; nest.position.set(nx, 0.2, nz); scene.add(nest);
    const egg = eggMesh(k); egg.position.set(nx, 0.12 + 0.62 * zn.eggS, nz); scene.add(egg);
    const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: '#fff6c9', transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0.7 }));
    glow.position.set(nx, 0.3 + 1.24 * zn.eggS + 0.4, nz); glow.scale.setScalar(0.8); scene.add(glow);
    nests.push({ k, x: nx, z: nz, egg, glow, has: true, respawn: 0 });
    const gid = zn.animals[1], c = creature(gid), gs = gid === 'monster' || gid === 'trex' ? 1.5 : gid === 'giraff' ? 1.6 : 2.0;
    const hx = Math.sign(nx) * 3.0, hy = Math.sign(nx) > 0 ? -2.4 : 2.4;
    c.root.scale.setScalar(gs); c.root.position.set(hx, 0, nz + 2.6); c.root.rotation.y = hy; scene.add(c.root);
    const zz = new THREE.Sprite(new THREE.SpriteMaterial({ map: floatTex('Zzz', '#ffffff'), transparent: true, depthWrite: false })); zz.scale.set(1.6, 0.6, 1); scene.add(zz);
    const bang = new THREE.Sprite(new THREE.SpriteMaterial({ map: floatTex('!', '#ff4d6d'), transparent: true, depthWrite: false })); bang.scale.set(1.6, 1.2, 1); bang.visible = false; scene.add(bang);
    guards.push({ k, c, home: new THREE.Vector3(hx, 0, nz + 2.6), homeYaw: hy, state: 'sleep', t: 0, zz, bang, scale: gs, name: ANIMALS[gid].def });
    decorate(zn, k, z0);
  });
  block(0, 0, ZONES.length * ZLEN + 0.3, TRACK_W * 2 + 1, 2.0, 0.6, '#2a1f3a');                // slutet på banan
}
function decorate(zn, k, z0) {
  const r = seeded(k * 131 + 7);
  const spot = () => { const s = r() < 0.5 ? -1 : 1; return [s * (TRACK_W + 3 + r() * 22), z0 + r() * ZLEN]; };
  for (let i = 0; i < 14; i++) {
    const [x, z] = spot(), s = 0.8 + r() * 0.6;
    if (zn.id === 'gard') { if (i % 3) { cyl(x, 0, z, 0.7 * s, 1.0 * s, '#f2c94c', 1, 14).rotation.z = Math.PI / 2; } else { block(x, 0, z, 3 * s, 2.4 * s, 3 * s, '#c9343c', { solid: false }); coneM(x, 2.4 * s, z, 2.3 * s, 1.4 * s, '#7a3a2a', 4); } }
    else if (zn.id === 'ang') { ballM(x, 0.5, z, 1.0 * s, '#5cc845', 1.3, 0.8, 1.3, 10); ballM(x + 0.4, 1.1 * s, z, 0.2, ['#ff5cb8', '#ffd84a', '#ffffff'][i % 3], 1, 1, 1, 6); }
    else if (zn.id === 'skog') { cyl(x, 0, z, 0.3 * s, 2 * s, '#7a5230', 1, 8); coneM(x, 1.4 * s, z, 1.6 * s, 3.2 * s, i % 2 ? '#2f7a3a' : '#3f9a4a', 10); }
    else if (zn.id === 'savann') { if (i % 3) { cyl(x, 0, z, 0.22 * s, 2.6 * s, '#8a6a3a', 1, 8); ballM(x, 2.8 * s, z, 2.2 * s, '#7a9a3a', 1, 0.3, 1, 12); } else ballM(x, 0.3, z, 1.0 * s, '#c9a066', 1.4, 0.7, 1.1, 8); }
    else if (zn.id === 'djungel') { cyl(x, 0, z, 0.25 * s, 4 * s, '#8a6a3a', 0.7, 8); for (let j = 0; j < 5; j++) { const l = mesh(new THREE.SphereGeometry(1, 10, 6), lam('#2f9a3a'), x, 4 * s, z, j * 1.25); l.scale.set(0.5 * s, 0.12 * s, 1.8 * s); l.rotation.x = 0.4; l.position.x += Math.sin(j * 1.25) * 1.2 * s; l.position.z += Math.cos(j * 1.25) * 1.2 * s; } }
    else if (zn.id === 'is') { if (i % 2) { cyl(x, 0, z, 0.25 * s, 1 * s, '#7a5230', 1, 6); coneM(x, 0.8 * s, z, 1.4 * s, 2.8 * s, '#2f7a4a', 10); coneM(x, 2.0 * s, z, 0.8 * s, 1.4 * s, '#ffffff', 10); } else coneM(x, 0, z, 0.6 * s, 3 * s, new THREE.MeshPhongMaterial({ color: '#bfe6ff', transparent: true, opacity: 0.85, shininess: 90 }), 6); }
    else if (zn.id === 'dino') { if (i % 3) { for (let j = 0; j < 5; j++) { const l = mesh(new THREE.ConeGeometry(0.3 * s, 2.2 * s, 5), lam('#4f9a40'), x, 1.0 * s, z, j * 1.25); l.rotation.x = 0.7; } } else { ballM(x, 0.4, z, 1.2 * s, '#8a7a5a', 1.3, 0.6, 1.1, 8); } }
    else if (zn.id === 'monster') { coneM(x, 0, z, 0.5 * s, 2.6 * s, new THREE.MeshPhongMaterial({ color: i % 2 ? '#c95cff' : '#5cf0ff', emissive: i % 2 ? '#3a0a5a' : '#0a4a5a', shininess: 80 }), 5); ballM(x + 1, 0.4, z, 0.8 * s, '#3a2a4a', 1.2, 0.6, 1, 7); }
  }
  if (zn.id === 'dino') { const v = coneM(-45, 0, z0 + 25, 18, 22, '#6a4a3a', 14); coneM(-45, 21, z0 + 25, 4, 2, '#ff6a2a', 10); }
  if (zn.id === 'monster') for (const s of [-1, 1]) coneM(s * 40, 0, z0 + 20, 14, 30, '#3a2a4a', 8);
  if (zn.id === 'is') for (const s of [-1, 1]) coneM(s * 42, 0, z0 + 20, 16, 24, '#e8f4ff', 8);
}
function buildSky() {
  const m = new THREE.SpriteMaterial({ map: cloudTex, transparent: true, depthWrite: false, fog: false, opacity: 0.95 });
  const r = seeded(77);
  for (let i = 0; i < 34; i++) { const s = new THREE.Sprite(m); s.position.set(rr(-160, 160), 40 + r() * 40, rr(-80, 420)); const k = 30 + r() * 30; s.scale.set(k, k * 0.5, 1); scene.add(s); }
}

/* ---------- Sparning ---------- */
const st = { speed: 0, tread: 0, pets: {}, eggs: {}, seen: 0 };
function load() {
  const p = player && Save.get(player.id); const s = (p && p.progress && p.progress.steal) || null;
  if (s) Object.assign(st, { speed: s.speed || 0, tread: s.tread || 0, pets: { ...(s.pets || {}) }, eggs: { ...(s.eggs || {}) }, seen: s.seen || 0 });
  return !!s;
}
function save() { if (!player) return; Save.updatePlayer(player.id, p => { p.progress.steal = { v: 1, speed: Math.floor(st.speed), tread: st.tread, pets: st.pets, eggs: st.eggs, seen: st.seen }; }); }

/* ---------- Hagen ---------- */
function setPet(pad, id, fresh = false) {
  if (pad.pet) { scene.remove(pad.pet.c.root); pad.pet = null; }
  if (!id) return;
  const c = creature(id), A = ANIMALS[id];
  const s = Math.min(1.25, 2.2 / Math.max(1.0, c.height)) * (c.rad > 0.8 ? 0.9 : 1);
  c.root.scale.setScalar(Math.max(0.75, s)); c.root.position.set(pad.x, 0.18, pad.z); c.root.rotation.y = Math.PI * 0.85; scene.add(c.root);
  // skylt som alltid vänder sig mot kameran: hur mycket guld djuret ger
  const lc = document.createElement('canvas'); lc.width = 320; lc.height = 100; const g = lc.getContext('2d');
  g.fillStyle = 'rgba(20,14,70,.75)'; g.beginPath(); g.roundRect(4, 4, 312, 92, 40); g.fill(); g.fillStyle = '#ffd84a'; g.font = '700 50px Fredoka, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(`🪙 ${A.rate}/min`, 160, 52);
  const lt = new THREE.CanvasTexture(lc); lt.colorSpace = THREE.SRGBColorSpace;
  const lab = new THREE.Sprite(new THREE.SpriteMaterial({ map: lt, transparent: true, depthWrite: false }));
  const k = c.root.scale.x; lab.scale.set(2.0 / k, 0.62 / k, 1); lab.position.set(0, c.height + 0.45 / k, 0); c.root.add(lab);
  pad.pet = { id, c, acc: Math.random() * 0.5, lab };
  if (fresh) { c.root.scale.multiplyScalar(0.01); pad.pet.grow = 0; pad.pet.full = Math.max(0.75, s); }
}
function setEgg(pad, info) {
  if (pad.egg) { scene.remove(pad.egg.m); scene.remove(pad.egg.ring); pad.egg = null; }
  if (!info) return;
  const zi = info.zone, m = eggMesh(zi, 1.1); m.position.set(pad.x, 0.2 + 0.62 * ZONES[zi].eggS * 1.1, pad.z); scene.add(m);
  const ring = signPlane(1.8, 0.7, 260, 100); ring.m.position.set(pad.x, 0.4 + 1.24 * ZONES[zi].eggS * 1.1 + 0.5, pad.z); scene.add(ring.m);
  pad.egg = { info, m, ring: ring.m, rc: ring.c, rt: ring.t, last: '' };
}
function petsRate() { return penPads.reduce((s, p) => s + (p.pet ? ANIMALS[p.pet.id].rate : 0), 0); }
function updateRate() { $('rate').textContent = `🪙 ${petsRate()}/min`; }
function placeEgg(zi) {
  let pad = penPads.filter(p => !p.pet && !p.egg).sort((a, b) => Math.hypot(a.x - P.x, a.z - P.z) - Math.hypot(b.x - P.x, b.z - P.z))[0];
  if (!pad) {
    // hagen är full: det svagaste djuret flyttar (om det nya ägget är minst lika fint)
    const weakest = penPads.filter(p => p.pet).sort((a, b) => ANIMALS[a.pet.id].rate - ANIMALS[b.pet.id].rate)[0];
    if (!weakest || zoneOf(weakest.pet.id) > zi) { toast('🏡 Hagen är full av finare djur!', 3000); return false; }
    toast(`${ANIMALS[weakest.pet.id].ic} ${ANIMALS[weakest.pet.id].def} flyttade till en bondgård 🚜`, 3000);
    delete st.pets[weakest.i]; setPet(weakest, null); pad = weakest;
  }
  const info = { zone: zi, until: Date.now() + ZONES[zi].hatch * 1000 };
  st.eggs[pad.i] = info; setEgg(pad, info); save();
  sparkle(pad.x, 1, pad.z, 14, '#fff6c9');
  return true;
}
function hatch(pad, quiet = false) {
  const zi = pad.egg.info.zone, zn = ZONES[zi];
  const id = Math.random() < 0.3 ? zn.animals[1] : zn.animals[0];
  setEgg(pad, null); delete st.eggs[pad.i];
  st.pets[pad.i] = id; setPet(pad, id, !quiet); save(); updateRate();
  if (quiet) return id;
  const A = ANIMALS[id];
  sparkle(pad.x, 1.2, pad.z, 30, '#ffd84a'); sHatch();
  showFound(A, zi);
  say(`Det blev en ${A.name.toLowerCase()}!`);
  return id;
}
let foundTm = 0;
function showFound(A, zi) {
  const c = $('foundEgg'), g = c.getContext('2d'); g.clearRect(0, 0, c.width, c.height);
  g.font = '110px serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(A.ic, c.width / 2, c.height / 2);
  $('foundSmall').textContent = 'Det blev en'; $('foundName').textContent = A.name; $('foundGold').textContent = `+${A.rate} 🪙/min`;
  $('found').classList.add('show'); clearTimeout(foundTm); foundTm = setTimeout(() => $('found').classList.remove('show'), 3400);
}

/* ---------- Gubben ---------- */
const FALLBACK = { skin: '#f6b694', hair: 'kort', hairColor: '#6a4026', eyes: '#2f6db5', mouth: 'glad', extra: 'inga' };
const look = player ? { ...FALLBACK, ...player.look } : FALLBACK;
const P = { x: 0, y: 0, z: -16, vx: 0, vz: 0, vy: 0, grounded: true, on: null, heading: 0, coyote: 0, carry: -1, knock: 0 };
let ch = null, anim = null;
function playAnim(name, fade, restart = false) { if (!ch || (anim === name && !restart)) return; anim = name; ch.play(name, fade); }
const blob = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 1.1), new THREE.MeshBasicMaterial({ map: blobTex, transparent: true, depthWrite: false }));
blob.rotation.x = -Math.PI / 2; scene.add(blob);
let carryEgg = null;
const sparks = [];
const sparkMat = new THREE.SpriteMaterial({ map: glowTex, color: '#ffe27a', transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
function sparkle(x, y, z, n = 16, color = null) {
  for (let i = 0; i < n; i++) {
    const s = new THREE.Sprite(color ? sparkMat.clone() : sparkMat); if (color) s.material.color.set(color);
    s.position.set(x, y, z); s.scale.setScalar(0.26 + Math.random() * 0.12);
    const a = Math.random() * Math.PI * 2, u = Math.random();
    sparks.push({ s, vx: Math.cos(a) * (1 + u * 2.5), vy: 2 + Math.random() * 3, vz: Math.sin(a) * (1 + u * 2.5), life: 0.7 + Math.random() * 0.5, own: !!color });
    scene.add(s);
  }
}
let toastTm = 0;
function toast(t, ms = 2600) { const el = $('toast'); el.textContent = t; el.classList.add('show'); clearTimeout(toastTm); toastTm = setTimeout(() => el.classList.remove('show'), ms); }
function bump(id) { const c = $(id); c.classList.remove('bump'); void c.offsetWidth; c.classList.add('bump'); }
function showSpeed() { $('spd').textContent = `⚡ ${Math.floor(st.speed)}`; }

/* ---------- Ägg: sno, bära, bli tagen ---------- */
function grab(n) {
  n.has = false; n.egg.visible = false; n.glow.visible = false; n.respawn = 5;
  P.carry = n.k;
  carryEgg = eggMesh(n.k, 0.7); scene.add(carryEgg);
  sGrab(); $('carry').classList.add('show'); $('carryText').textContent = 'Spring hem till hagen!';
  const g = guards[n.k];
  g.state = 'wake'; g.t = 0; g.bang.visible = true; g.zz.visible = false; sAlarm();
  const zn = ZONES[n.k];
  if (st.speed < zn.req) toast(`⚠️ Du är för långsam för ${zn.name}! (⚡ ${zn.req})`, 2600);
}
function dropCarry() { if (carryEgg) scene.remove(carryEgg); carryEgg = null; P.carry = -1; $('carry').classList.remove('show'); }
function caught(g) {
  const n = nests[P.carry];
  dropCarry();
  n.has = true; n.egg.visible = true; n.glow.visible = true; n.respawn = 0;
  sCaught(); toast(`😮 ${g.name} tog tillbaka ägget! Träna mer på springbandet ⚡`, 3200);
  P.vz = -9; P.vx = 0; P.vy = 7; P.grounded = false; P.knock = 0.6; playAnim('jump', 0.1, true);
  g.state = 'home'; g.bang.visible = false;
}
function guardSpeed(g) { const zn = ZONES[g.k], v = runSpeed(st.speed); return v * (st.speed >= zn.req ? 0.82 : 1.35); }
function updateGuards(dt) {
  for (const g of guards) {
    const c = g.c, pos = c.root.position;
    let speed = 0;
    if (g.state === 'sleep') { c.root.rotation.y = g.homeYaw; g.zz.position.set(pos.x, g.scale * c.height + 0.6 + Math.sin(time * 2) * 0.15, pos.z); }
    else if (g.state === 'wake') { g.t += dt; c.root.rotation.y = Math.atan2(P.x - pos.x, P.z - pos.z); if (g.t > 0.9) g.state = 'chase'; }
    else if (g.state === 'chase') {
      if (P.carry !== g.k) { g.state = 'home'; g.bang.visible = false; }
      else {
        const dx = P.x - pos.x, dz = P.z - pos.z, d = Math.hypot(dx, dz), v = guardSpeed(g);
        speed = v; c.root.rotation.y = Math.atan2(dx, dz);
        const stepL = Math.min(d, v * dt); pos.x += dx / d * stepL; pos.z += dz / d * stepL;
        pos.x = Math.max(-TRACK_W + 1, Math.min(TRACK_W - 1, pos.x));
        if (pos.z < 0.8) { pos.z = 0.8; }                                     // vakten går aldrig över den säkra linjen
        if (d < 0.7 + c.rad * g.scale * 0.6 && P.z > 0.4) caught(g);
      }
    } else if (g.state === 'home') {
      const dx = g.home.x - pos.x, dz = g.home.z - pos.z, d = Math.hypot(dx, dz);
      if (d < 0.2) { g.state = 'sleep'; g.zz.visible = true; }
      else { const v = 4; speed = v; c.root.rotation.y = Math.atan2(dx, dz); const s2 = Math.min(d, v * dt); pos.x += dx / d * s2; pos.z += dz / d * s2; }
    }
    g.bang.position.set(pos.x, g.scale * c.height + 0.9, pos.z);
    if (Math.abs(pos.z - P.z) < 90) { c.root.visible = true; animateCreature(c, dt, speed / 6); } else c.root.visible = false;
  }
}

/* ---------- Kamera och styrning ---------- */
let yaw = Math.PI, pitch = 0.32, dist = 7.5, camSnap = true;
const camTarget = new THREE.Vector3(), camPos = new THREE.Vector3();
const keys = {};
let started = false;
addEventListener('keydown', e => {
  keys[e.code] = true;
  if (e.code === 'Space') { e.preventDefault(); if (!e.repeat) jump(); }
  if (e.code === 'KeyH') $('help').classList.toggle('show');
  if (e.code === 'KeyE' && $('upgrade').classList.contains('show')) buyTread();
});
addEventListener('keyup', e => { keys[e.code] = false; });
addEventListener('blur', () => { for (const k in keys) keys[k] = false; });
let dragging = false, lastX = 0, lastY = 0;
canvas.addEventListener('contextmenu', e => e.preventDefault());
addEventListener('mousemove', e => {
  if (!dragging) return;
  if (document.pointerLockElement === canvas) turn(e.movementX, e.movementY);
  else { turn(e.clientX - lastX, e.clientY - lastY); lastX = e.clientX; lastY = e.clientY; }
});
canvas.addEventListener('mousedown', e => {
  if (e.button !== 2) return;
  dragging = true; lastX = e.clientX; lastY = e.clientY;
  try { const r = canvas.requestPointerLock?.(); if (r && r.catch) r.catch(() => {}); } catch (_) {}
});
addEventListener('mouseup', e => { if (e.button !== 2 || !dragging) return; dragging = false; if (document.pointerLockElement === canvas) document.exitPointerLock?.(); });
canvas.addEventListener('wheel', e => { dist = Math.min(12, Math.max(3.5, dist + e.deltaY * 0.004)); }, { passive: true });
function turn(dx, dy) { yaw -= dx * 0.0028; pitch = Math.min(1.2, Math.max(-0.2, pitch + dy * 0.0022)); }
const stick = { id: null, ox: 0, oy: 0, x: 0, y: 0 };
let lookId = null;
if (touch) document.body.classList.add('touch');
function releaseStick() { stick.id = null; stick.x = stick.y = 0; $('joy').classList.remove('show'); $('knob').style.transform = ''; }
function syncTouches(e) {
  const ids = new Set(); for (const t of e.touches) ids.add(t.identifier);
  if (stick.id !== null && !ids.has(stick.id)) releaseStick();
  if (lookId !== null && !ids.has(lookId)) lookId = null;
}
document.addEventListener('touchend', syncTouches, true);
document.addEventListener('touchcancel', syncTouches, true);
for (const ev of ['blur', 'pagehide']) addEventListener(ev, () => { releaseStick(); lookId = null; });
for (const ev of ['visibilitychange', 'fullscreenchange', 'webkitfullscreenchange']) document.addEventListener(ev, () => { releaseStick(); lookId = null; for (const k in keys) keys[k] = false; });
canvas.addEventListener('touchstart', e => {
  syncTouches(e);
  for (const t of e.changedTouches) {
    if (t.clientX < innerWidth * 0.45 && stick.id === null) {
      stick.id = t.identifier; stick.ox = t.clientX; stick.oy = t.clientY; stick.x = stick.y = 0;
      const j = $('joy'); j.style.left = t.clientX + 'px'; j.style.top = t.clientY + 'px'; j.classList.add('show');
      $('joyHint').classList.add('hide');
    } else if (lookId === null) { lookId = t.identifier; lastX = t.clientX; lastY = t.clientY; }
  }
  e.preventDefault();
}, { passive: false });
canvas.addEventListener('touchmove', e => {
  for (const t of e.changedTouches) {
    if (t.identifier === stick.id) {
      let dx = t.clientX - stick.ox, dy = t.clientY - stick.oy;
      const m = Math.hypot(dx, dy), max = 60;
      if (m > max) { dx *= max / m; dy *= max / m; }
      stick.x = dx / max; stick.y = dy / max;
      $('knob').style.transform = `translate(${dx}px, ${dy}px)`;
    } else if (t.identifier === lookId) { turn((t.clientX - lastX) * 1.6, (t.clientY - lastY) * 1.6); lastX = t.clientX; lastY = t.clientY; }
  }
  e.preventDefault();
}, { passive: false });
const endTouch = e => { for (const t of e.changedTouches) { if (t.identifier === stick.id) releaseStick(); if (t.identifier === lookId) lookId = null; } };
canvas.addEventListener('touchend', endTouch);
canvas.addEventListener('touchcancel', endTouch);
$('jumpBtn').addEventListener('touchstart', e => { e.preventDefault(); jump(); }, { passive: false });
$('jumpBtn').addEventListener('click', jump);
let jumpBuf = 0;
function jump() { if (!started) return; if (P.grounded || P.coyote > 0) doJump(); else jumpBuf = 0.15; }
function doJump() { P.vy = JUMP; P.grounded = false; P.coyote = 0; P.on = null; jumpBuf = 0; playAnim('jump', 0.08, true); sJump(); }

/* ---------- Springbandet ---------- */
let onTread = false, treadAcc = 0, treadFloat = 0, saveTm = 0;
function treadInfo() { const nx = TREAD[st.tread + 1]; return nx ? { next: nx, cost: nx.cost } : null; }
let upKey = '';
function showUpgrade(show) {
  const el = $('upgrade'), inf = treadInfo();
  const key = show && inf ? st.tread + '|' + (coins() >= inf.cost) : 'off';
  if (key === upKey) return; upKey = key;
  if (!show || !inf) { el.classList.remove('show'); return; }
  $('upText').textContent = `⚡ +${inf.next.rate} i sekunden (nu +${TREAD[st.tread].rate})`;
  $('upCost').textContent = `${inf.cost} 🪙`;
  el.classList.toggle('poor', coins() < inf.cost);
  el.classList.add('show');
}
function buyTread() {
  const inf = treadInfo(); if (!inf || !player) return;
  if (coins() < inf.cost) { toast(`Du behöver ${inf.cost} 🪙 – djuren i hagen tjänar guld åt dig!`, 2800); return; }
  Save.addCoins(player.id, -inf.cost); showCoins(); bump('pcoins');
  st.tread++; save(); sBuy(); sparkle(tread.x, 1.2, tread.z, 24, '#3ee8ff'); upKey = '';
  toast(`⚡ Springbandet ger nu +${TREAD[st.tread].rate} i sekunden!`, 2600);
  showUpgrade(true);
}
$('upgrade').addEventListener('click', buyTread);

/* ---------- Spelloopen ---------- */
const fwd = new THREE.Vector3(), right = new THREE.Vector3(), move = new THREE.Vector3();
let time = 0, coinFlush = 0, coinPending = 0, gateTm = 0;
function update(dt) {
  time += dt;
  if (!started) { animate(dt, false); return; }
  let ix = 0, iz = 0;
  const followCam = !dragging && stick.id === null;
  if (keys.KeyW || keys.ArrowUp) iz += 1;
  if (keys.KeyS || keys.ArrowDown) iz -= 1;
  if (keys.KeyA || keys.ArrowLeft) ix -= 1;
  if (keys.KeyD || keys.ArrowRight) ix += 1;
  let mag = Math.min(1, Math.hypot(ix, iz));
  if (stick.id !== null) { ix = stick.x; iz = -stick.y; mag = Math.min(1, Math.hypot(ix, iz)); }
  else if (followCam) { yaw += -ix * 2.6 * dt; if (ix && !iz) P.heading = yaw + Math.PI; ix = 0; mag = Math.abs(iz); }
  const walking = keys.ShiftLeft || keys.ShiftRight || (stick.id !== null && mag < 0.5);
  fwd.set(-Math.sin(yaw), 0, -Math.cos(yaw)); right.set(Math.cos(yaw), 0, -Math.sin(yaw));
  move.set(0, 0, 0).addScaledVector(fwd, iz).addScaledVector(right, ix);
  const moving = mag > 0.08 && P.knock <= 0;
  const RUN = runSpeed(st.speed);
  let tvx = 0, tvz = 0;
  if (moving) {
    move.normalize();
    const want = Math.atan2(move.x, move.z);
    let d = want - P.heading; d = Math.atan2(Math.sin(d), Math.cos(d));
    if (followCam && iz < 0) P.heading = yaw + Math.PI; else P.heading += d * Math.min(1, dt * 12);
    if (stick.id !== null && lookId === null) { let dy = (P.heading + Math.PI) - yaw; dy = Math.atan2(Math.sin(dy), Math.cos(dy)); yaw += dy * Math.min(1, dt * 1.6); }
    const sp = (walking ? RUN * 0.42 : RUN) * (stick.id !== null ? Math.max(0.45, mag) : 1);
    tvx = move.x * sp; tvz = move.z * sp;
  }
  P.knock = Math.max(0, P.knock - dt);
  const acc = P.grounded ? 14 : 6;
  if ((P.grounded || moving) && P.knock <= 0) { P.vx += (tvx - P.vx) * Math.min(1, acc * dt); P.vz += (tvz - P.vz) * Math.min(1, acc * dt); }
  if (!P.grounded && P.knock <= 0) { const v = Math.hypot(P.vx, P.vz), m = Math.max(4.2, RUN * 0.7); if (v > m) { P.vx *= m / v; P.vz *= m / v; } }
  const tol = P.grounded ? STEP : 0.25;
  const steps = Math.max(1, Math.ceil(Math.hypot(P.vx, P.vz) * dt / 0.12));
  for (let i = 0; i < steps; i++) { const [nx, nz] = pushOut(P.x + P.vx * dt / steps, P.z + P.vz * dt / steps, P.y, tol); P.x = nx; P.z = nz; }
  if (P.grounded) {
    const s = supportAt(P.x, P.z, P.y - 0.5, P.y + STEP);
    if (s) { P.y = s.top; P.on = s; } else { P.grounded = false; P.on = null; P.vy = 0; P.coyote = 0.12; playAnim('jump', 0.2); }
  }
  if (!P.grounded) {
    P.coyote = Math.max(0, P.coyote - dt);
    const y0 = P.y; P.vy += GRAVITY * dt; P.vy = Math.max(P.vy, -40);
    let ny = P.y + P.vy * dt;
    if (P.vy <= 0) { const s = supportAt(P.x, P.z, ny, y0 + 0.25); if (s) { ny = s.top; P.grounded = true; P.on = s; P.vy = 0; P.coyote = 0; if (jumpBuf > 0) doJump(); } }
    P.y = ny;
    if (jumpBuf > 0) { jumpBuf -= dt; if (P.coyote > 0) doJump(); }
  }
  // springbandet
  onTread = P.grounded && Math.abs(P.x - tread.x) < tread.hx && Math.abs(P.z - tread.z) < tread.hz && P.y > 0.3;
  tread.tex.offset.y -= dt * (onTread ? 2.5 : 0.4);
  if (onTread) {
    const r = TREAD[st.tread].rate; st.speed += r * dt; treadAcc += r * dt; treadFloat -= dt;
    if (treadFloat <= 0 && treadAcc >= 1) { floatText(`+${Math.floor(treadAcc)} ⚡`, P.x + (Math.random() - 0.5), P.y + 2.4, P.z, '#3ee8ff', 0.9); treadAcc -= Math.floor(treadAcc); treadFloat = 0.5; }
    showSpeed(); saveTm -= dt; if (saveTm <= 0) { save(); saveTm = 3; }
  }
  showUpgrade(Math.hypot(P.x - tread.x, P.z - tread.z) < 4.2);
  // sno ägg
  if (P.carry < 0) for (const n of nests) { if (n.has && Math.hypot(P.x - n.x, P.z - n.z) < 1.4 && P.y < 1.5) { grab(n); break; } }
  // bära hem
  if (P.carry >= 0) {
    if (P.x > PEN.x0 && P.x < PEN.x1 && P.z > PEN.z0 && P.z < PEN.z1) {
      const k = P.carry; if (placeEgg(k)) { dropCarry(); sSafe(); toast(`🥚 Ägget ligger i hagen och kläcks snart!`, 2400); }
      else { const n = nests[k]; dropCarry(); n.has = true; n.egg.visible = true; n.glow.visible = true; }
    } else if (P.z < 0 && !P.safeTold) { P.safeTold = true; sSafe(); $('carryText').textContent = 'Säkert! Lägg ägget i hagen 🏡'; }
    if (P.z >= 0) P.safeTold = false;
  }
  // nya ägg i boet
  for (const n of nests) if (!n.has && P.carry !== n.k) { n.respawn -= dt; if (n.respawn <= 0 && Math.hypot(P.x - n.x, P.z - n.z) > 8) { n.has = true; n.egg.visible = true; n.glow.visible = true; } }
  updateGuards(dt);
  // ägg som kläcks och djur som tjänar guld
  const now = Date.now();
  for (const pad of penPads) {
    if (pad.egg) {
      const left = Math.ceil((pad.egg.info.until - now) / 1000);
      if (left <= 0) hatch(pad);
      else {
        const txt = `⏳ ${left}`; if (txt !== pad.egg.last) { pad.egg.last = txt; const g = pad.egg.rc.getContext('2d'); g.clearRect(0, 0, 260, 100); g.fillStyle = 'rgba(20,14,70,.75)'; g.beginPath(); g.roundRect(4, 4, 252, 92, 40); g.fill(); g.fillStyle = '#fff'; g.font = '700 54px Fredoka, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(txt, 130, 54); pad.egg.rt.needsUpdate = true; }
        pad.egg.m.rotation.z = left <= 3 ? Math.sin(time * 18) * 0.15 : Math.sin(time * 2) * 0.04;
      }
    }
    if (pad.pet) {
      const pe = pad.pet, A = ANIMALS[pe.id];
      if (pe.grow !== undefined) { pe.grow = Math.min(1, pe.grow + dt * 2.5); pe.c.root.scale.setScalar(pe.full * (pe.grow < 1 ? 0.2 + 0.8 * pe.grow + Math.sin(pe.grow * 9) * 0.1 * (1 - pe.grow) : 1)); if (pe.grow >= 1) delete pe.grow; }
      animateCreature(pe.c, dt, 0);
      pe.c.root.rotation.y = Math.PI * 0.85 + Math.sin(time * 0.4 + pad.i) * 0.6;
      pe.acc += A.rate / 60 * dt;
      if (pe.acc >= 1) { pe.acc -= 1; coinPending++; floatText('+1 🪙', pad.x, pe.c.height * pe.c.root.scale.x + 1.2, pad.z); if (Math.hypot(P.x - pad.x, P.z - pad.z) < 25) sTick(); }
    }
  }
  coinFlush -= dt;
  if (coinPending > 0 && coinFlush <= 0) { if (player) Save.addCoins(player.id, coinPending); coinPending = 0; coinFlush = 1.5; showCoins(); bump('pcoins'); }
  // skyltarna blir gröna när man är snabb nog
  gateTm -= dt; if (gateTm <= 0) { gateTm = 0.5; updateGates(); }
  animate(dt, moving || onTread, walking);
}
function updateGates() {
  for (const g of gates) {
    const zn = ZONES[g.k], ok = st.speed >= zn.req;
    if (g.ok === ok) continue; g.ok = ok;
    textCanvas(g.sg.c, [`${zn.ic} ${zn.name}`, ok ? `✅ ⚡ ${zn.req}` : `🔒 ⚡ ${zn.req}`], ok ? '#2fb84a' : '#e8383d'); g.sg.t.needsUpdate = true;
  }
}
let visY = 0, camY = null, camD = 7.5;
function animate(dt, moving, walking) {
  if (ch) {
    if (P.grounded) playAnim(moving ? 'run' : 'idle', moving ? 0.15 : 0.25);
    const v = Math.hypot(P.vx, P.vz);
    ch.mixer.timeScale = onTread ? 1 + TREAD[st.tread].rate * 0.05 : moving && walking && P.grounded ? 0.55 : moving ? Math.max(1, v / 6.5) : 1;
    visY = P.grounded && Math.abs(P.y - visY) < 0.7 ? visY + (P.y - visY) * Math.min(1, dt * 22) : P.y;
    ch.root.position.set(P.x, visY, P.z);
    ch.root.rotation.y = onTread && !moving ? 0 : P.heading;
    if (onTread && Math.hypot(P.vx, P.vz) < 0.5) ch.root.rotation.y = 0;
    ch.update(dt);
  }
  if (carryEgg) { carryEgg.position.set(P.x, visY + 2.25 + Math.sin(time * 8) * 0.05, P.z); carryEgg.rotation.y += dt * 2; }
  const s = supportAt(P.x, P.z, P.y - 40, P.y + 0.05);
  if (s) { const h = P.y - s.top; blob.visible = true; blob.position.set(P.x, s.top + 0.04, P.z); blob.scale.setScalar(Math.max(0.35, 1 - h * 0.05)); } else blob.visible = false;
  for (let i = sparks.length - 1; i >= 0; i--) {
    const p = sparks[i]; p.life -= dt; p.vy -= 6 * dt;
    p.s.position.x += p.vx * dt; p.s.position.y += p.vy * dt; p.s.position.z += p.vz * dt; p.s.material.opacity = Math.min(1, p.life * 2);
    if (p.life <= 0) { scene.remove(p.s); if (p.own) p.s.material.dispose(); sparks.splice(i, 1); }
  }
  for (let i = floats.length - 1; i >= 0; i--) { const f = floats[i]; f.life -= dt; f.sp.position.y += dt * 1.2; f.sp.material.opacity = Math.min(1, f.life * 2); if (f.life <= 0) { scene.remove(f.sp); f.sp.material.dispose(); floats.splice(i, 1); } }
  for (const n of nests) { n.egg.rotation.y += dt * 0.8; n.glow.material.opacity = 0.5 + Math.sin(time * 4 + n.k) * 0.25; }
  // kameran
  if (camY === null || camSnap || Math.abs(P.y + 1.5 - camY) > 5) camY = P.y + 1.5;
  else camY += (P.y + 1.5 - camY) * Math.min(1, dt * (P.grounded ? 9 : 5));
  camTarget.set(P.x, camY, P.z);
  const sx = Math.sin(yaw) * Math.cos(pitch), sz = Math.cos(yaw) * Math.cos(pitch), sy = Math.sin(pitch);
  let d = dist;
  for (let st2 = 0.6; st2 <= dist; st2 += 0.25) {
    const x = camTarget.x + sx * st2, y = camTarget.y + sy * st2, z = camTarget.z + sz * st2;
    let hit = y < 0.35;
    if (!hit) for (const b of near(x, z, y - 0.5, y + 0.5)) { if (b.hy > 50) continue; if (y > b.bot - 0.3 && y < b.top + 0.3 && inside(b, x, z, 0.3) && b.top > 0.05) { hit = true; break; } }
    if (hit) { d = Math.max(1.4, st2 - 0.3); break; }
  }
  if (camSnap) camD = d; else camD += (d - camD) * Math.min(1, dt * (d < camD ? 14 : 2.2));
  camPos.set(camTarget.x + sx * camD, camTarget.y + sy * camD, camTarget.z + sz * camD);
  if (camSnap) camera.position.copy(camPos); else camera.position.lerp(camPos, 1 - Math.exp(-dt * 12));
  camSnap = false;
  camera.lookAt(camTarget);
  sun.position.set(P.x + 60, P.y + 120, P.z + 40); sun.target.position.set(P.x, P.y, P.z);
}

function resize() { renderer.setSize(innerWidth, innerHeight, false); camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); }
addEventListener('resize', resize); resize();
let frameSum = 0, frameN = 0, goodWindows = 0;
function adaptResolution(raw) {
  if (document.hidden || raw > 0.25) return;
  frameSum += raw; frameN++;
  if (frameSum < 2) return;
  const avg = frameSum / frameN; frameSum = 0; frameN = 0;
  if (avg > 0.024 && pixelRatio > 1) { pixelRatio = Math.max(1, pixelRatio - 0.25); renderer.setPixelRatio(pixelRatio); goodWindows = 0; }
  else if (avg < 0.0145 && pixelRatio < MAX_PR) { if (++goodWindows >= 3) { pixelRatio = Math.min(MAX_PR, pixelRatio + 0.25); renderer.setPixelRatio(pixelRatio); goodWindows = 0; } }
  else goodWindows = 0;
}
const clock = new THREE.Clock();
function loop() {
  requestAnimationFrame(loop);
  const raw = clock.getDelta(), dt = Math.min(raw, 0.05);
  adaptResolution(raw);
  update(dt);
  renderer.render(scene, camera);
}
addEventListener('pagehide', () => { if (coinPending > 0 && player) { Save.addCoins(player.id, coinPending); coinPending = 0; } save(); });

/* ---------- Start ---------- */
buildSky(); buildBase(); buildTrack();
mergeStatic(G);
const had = load();
if (!had) st.eggs = { 0: { zone: 0, until: Date.now() + 6000 } };               // första gången: ett kycklingägg i hagen
let hatchedAway = 0;
for (const pad of penPads) {
  if (st.pets[pad.i]) setPet(pad, st.pets[pad.i]);
  else if (st.eggs[pad.i]) { setEgg(pad, st.eggs[pad.i]); if (st.eggs[pad.i].until <= Date.now()) { hatch(pad, true); hatchedAway++; } }
}
save(); showSpeed(); updateRate(); updateGates();
P.heading = 0; yaw = Math.PI; camSnap = true;
camera.position.set(P.x, 4, P.z - 8);
loop();
createCharacter(look, player ? player.gender : 'kille').then(c => {
  ch = c; scene.add(c.root); anim = null; playAnim('idle', 0);
  $('loading').classList.add('hide');
  started = true;
  $('help').classList.add('show'); setTimeout(() => $('help').classList.remove('show'), 9000);
  if (hatchedAway) setTimeout(() => toast(`🐣 ${hatchedAway} ägg kläcktes medan du var borta!`, 3200), 800);
  if (!had) setTimeout(() => { toast('🐣 Ditt första ägg kläcks snart i hagen!', 3600); say('Spring ut på banan och sno ägg från djuren!'); }, 900);
}).catch(e => { console.error(e); $('loading').innerHTML = '<div>😕 Kunde inte ladda gubben.<br>Ladda om sidan.</div>'; });
$('help').addEventListener('click', () => $('help').classList.remove('show'));

// För test
window.Steal = {
  P, st, ZONES, ANIMALS, nests, guards, penPads, boxes, keys, renderer, scene, camera, tread,
  step(n = 1, dt = 1 / 60) { for (let i = 0; i < n; i++) update(dt); },
  get yaw() { return yaw; }, set yaw(v) { yaw = v; }, set pitch(v) { pitch = v; }, set dist(v) { dist = v; },
  get started() { return started; }, get ch() { return ch; }, get anim() { return anim; }, get onTread() { return onTread; },
  jump, supportAt, save, buyTread, creature, scene2: scene, petsRate, setSnap() { camSnap = true; }
};
