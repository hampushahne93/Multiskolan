/* =========================================================
   Egg hunt – påskäggsjakt i stil med Robloxs Egg Hunt.
   Man börjar på Äggtorget (navet). Där står sex portaler som leder till
   sex flygande öar: Blomsterängen, Godislandet, Bondgården, Snölandet,
   Molnbanan och Rymdön. På varje ö är fyra ägg gömda – några syns direkt,
   andra ligger högt upp, inne i något eller bakom något.
   - Gå på ett ägg så hamnar det i korgen (10 guld). Alla fyra på en ö: 50 guld.
   - Äggradarn blinkar snabbare ju närmare ett ägg man är.
   - Vid portalerna på torget står hyllor som visar öns ägg (grå = inte hittat).
   - Påskharen på torget tipsar om var det finns ägg kvar.
   - Har man hittat alla 24 öppnas glaskupan högst upp på torget: Guldägget (100 guld).
   Hittade ägg sparas per gubbe och försvinner aldrig.
   ========================================================= */
import * as THREE from 'three';
import { createCharacter } from './avatar.js';
import { mergeStatic } from './merge.js';

const $ = id => document.getElementById(id);
const touch = matchMedia('(pointer: coarse)').matches;
const player = Save.active() || Save.players()[0] || null;
const soundOn = () => Save.load().settings.sound !== false;
$('pname').textContent = player ? player.name : 'Gäst';
const showCoins = () => { $('pcoins').textContent = '🪙 ' + (player ? (Save.get(player.id) || player).coins : 0); };
showCoins();

/* ---------- Konstanter ---------- */
const RUN = 6.2, WALK = 2.6, GRAVITY = -22, JUMP = 8.4;   // hopp ca 1,6 m högt (Rymdön: lägre tyngdkraft)
const RAD = 0.32, HEIGHT = 1.6, STEP = 0.45, FOOT = 0.14, AIR_MAX = 4.2;
const GOLD_EGG = 10, GOLD_SET = 50, GOLD_GRAND = 100;
const HUB_R = 24, ISLE_R = 26, ISLE_D = 150;
const EGG_S = 0.8;                                    // äggen är ca 1 m höga (lätta att se för små barn)

/* ---------- Öarna och äggen ---------- */
const ZONES = [
  { id: 'blom', name: 'Blomsterängen', ic: '🌷', col: '#4fc93a' },
  { id: 'godis', name: 'Godislandet', ic: '🍭', col: '#ff5cb8' },
  { id: 'gard', name: 'Bondgården', ic: '🐔', col: '#ff9a3d' },
  { id: 'sno', name: 'Snölandet', ic: '❄️', col: '#3fb4ff' },
  { id: 'moln', name: 'Molnbanan', ic: '☁️', col: '#a77bff' },
  { id: 'rymd', name: 'Rymdön', ic: '🚀', col: '#4a3bd0', grav: 0.45 }
];
const EGGS = [
  { id: 'blom', z: 'blom', name: 'Blomägget', hint: 'Mitt i en ring av tulpaner.', d: ['flowers', '#fff2a8', '#ff6fb0', '#ffb020'] },
  { id: 'svamp', z: 'blom', name: 'Svampägget', hint: 'Högst upp på den stora svampen. Hoppa på de små svamparna!', d: ['dots', '#e8383d', '#ffffff'] },
  { id: 'bi', z: 'blom', name: 'Biägget', hint: 'Bakom trädet med bikupan.', d: ['bands', '#ffd23f', '#2b2118'] },
  { id: 'fjaril', z: 'blom', name: 'Fjärilsägget', hint: 'Inne i den ihåliga stocken.', d: ['butterfly', '#c9a6ff', '#ff7ac8', '#ffe066'] },
  { id: 'klubba', z: 'godis', name: 'Klubbägget', hint: 'Hoppa uppför gelégodiset hela vägen till toppen.', d: ['diag', '#ff4d6d', '#ffd84a', '#3ee8ff', '#8dff5a', '#a77bff'] },
  { id: 'choklad', z: 'godis', name: 'Chokladägget', hint: 'Under chokladkakan.', d: ['zigzag', '#7a4426', '#ffe8d1'] },
  { id: 'muffins', z: 'godis', name: 'Muffinsägget', hint: 'Högst upp på den jättestora muffinsen.', d: ['sprinkles', '#ffb3dc', '#ff4d6d', '#3ee8ff', '#ffd84a', '#8dff5a', '#ffffff'] },
  { id: 'polka', z: 'godis', name: 'Polkagrisägget', hint: 'Bakom den stora glassen.', d: ['diag', '#ffffff', '#e8203a'] },
  { id: 'hona', z: 'gard', name: 'Hönsägget', hint: 'Inne i hönshuset, i ett rede.', d: ['speckle', '#fff3df', '#a8714a'] },
  { id: 'ho', z: 'gard', name: 'Höägget', hint: 'Högst upp på höbalarna.', d: ['straw', '#f2c94c', '#c9962a'] },
  { id: 'morot', z: 'gard', name: 'Morotsägget', hint: 'I grönsakslandet, bland morötterna.', d: ['carrot', '#ff8a2a', '#3bb143'] },
  { id: 'lada', z: 'gard', name: 'Ladugårdsägget', hint: 'Inne i ladan, uppe på höskullen.', d: ['barn', '#d8343c', '#ffffff'] },
  { id: 'flinga', z: 'sno', name: 'Snöflingeägget', hint: 'Bakom snögubben.', d: ['flakes', '#9fd8ff', '#ffffff'] },
  { id: 'iglo', z: 'sno', name: 'Igloägget', hint: 'Inne i igloon.', d: ['bricks', '#f4fbff', '#b9d3ea'] },
  { id: 'is', z: 'sno', name: 'Isägget', hint: 'Högst upp på isblocken.', d: ['ice', '#bdeaff', '#ffffff'], ice: true },
  { id: 'pingvin', z: 'sno', name: 'Pingvinägget', hint: 'Hos pingvinerna uppe på snökullen.', d: ['penguin', '#22243a', '#ffffff', '#ffa024'] },
  { id: 'regnbage', z: 'moln', name: 'Regnbågsägget', hint: 'Där regnbågen slutar.', d: ['rainbow'] },
  { id: 'moln', z: 'moln', name: 'Molnägget', hint: 'Halvvägs upp på molntrappan.', d: ['clouds', '#7cc8ff', '#ffffff'] },
  { id: 'stjarna', z: 'moln', name: 'Stjärnägget', hint: 'Allra högst upp på molntrappan.', d: ['stars', '#1d2a6b', '#ffd84a'] },
  { id: 'blixt', z: 'moln', name: 'Blixtägget', hint: 'Bakom det mörka åskmolnet.', d: ['bolts', '#6b6f8f', '#ffe14a'] },
  { id: 'raket', z: 'rymd', name: 'Raketägget', hint: 'Gå uppför trappan till raketens dörr.', d: ['rocket', '#ffffff', '#e8383d', '#3fb4ff'] },
  { id: 'mane', z: 'rymd', name: 'Måneägget', hint: 'Nere i kratern.', d: ['craters', '#ffe9a8', '#e3b957'] },
  { id: 'ufo', z: 'rymd', name: 'UFO-ägget', hint: 'Uppe på UFO:t. Hoppa från stenen – på Rymdön hoppar man jättehögt!', d: ['alien', '#7dff6a', '#1b2a1b'] },
  { id: 'robot', z: 'rymd', name: 'Robotägget', hint: 'Roboten håller i det.', d: ['robot', '#c9d2de', '#6d7a8c', '#ff5a5a'] }
];
const GRAND = { id: 'guld', z: 'hub', name: 'Guldägget', hint: 'Hitta alla 24 ägg – då öppnas glaskupan högst upp på torget.', d: ['gold'], gold: true };
const EGG_BY = new Map([...EGGS, GRAND].map(e => [e.id, e]));

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
const sEgg = () => [784, 988, 1175, 1568].forEach((f, i) => tone(f, 0.2, 'triangle', 0.09, i * 0.08));
const sSet = () => [523, 659, 784, 1047, 1319, 1568].forEach((f, i) => tone(f, 0.26, 'triangle', 0.09, 0.5 + i * 0.09));
const sPortal = () => { tone(300, 0.5, 'sine', 0.08, 0, 3); tone(600, 0.4, 'triangle', 0.04, 0.05, 2.5); };
const sCoin = () => [1319, 1760, 2093].forEach((f, i) => tone(f, 0.16, 'square', 0.035, 0.3 + i * 0.07));
const sFall = () => tone(600, 0.6, 'sine', 0.06, 0, 0.3);
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
scene.background = new THREE.Color('#aee3ff');
scene.fog = new THREE.Fog('#aee3ff', 120, 420);
const camera = new THREE.PerspectiveCamera(62, 1, 0.1, 1500);
const hemi = new THREE.HemisphereLight('#ffffff', '#b7e08a', 1.8);
scene.add(hemi);
const sun = new THREE.DirectionalLight('#fff4dc', 2.0);
sun.position.set(60, 120, 40);
scene.add(sun, sun.target);

function seeded(seed) { let s = seed >>> 0; return () => (s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296; }
let R = seeded(20261122);
const rr = (a, b) => a + (b - a) * R();

/* ---------- Kollision: lådor (vridna runt y) och cylindrar ---------- */
const boxes = [], buckets = new Map(), BK = 4;
function index(b) {
  for (let k = Math.floor(b.bot / BK); k <= Math.floor(b.top / BK); k++) { if (!buckets.has(k)) buckets.set(k, []); buckets.get(k).push(b); }
}
function addBox(b) {                                  // b: x,y,z (mitt), hx,hy,hz, yaw
  b.c = Math.cos(b.yaw || 0); b.s = Math.sin(b.yaw || 0);
  b.top = b.y + b.hy; b.bot = b.y - b.hy; b.r = Math.hypot(b.hx, b.hz);
  index(b); boxes.push(b); return b;
}
function addCyl(b) {                                  // b: x,z,rad,top,bot
  b.cyl = true; b.r = b.rad; index(b); boxes.push(b); return b;
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
function inside(b, x, z, m) {
  if (b.cyl) return Math.hypot(x - b.x, z - b.z) <= b.rad + m;
  const [lx, lz] = toLocal(b, x, z); return Math.abs(lx) <= b.hx + m && Math.abs(lz) <= b.hz + m;
}
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
      if (b.cyl) {
        const dx = x - b.x, dz = z - b.z, d = Math.hypot(dx, dz), m = b.rad + RAD;
        if (d >= m) continue;
        if (d > 1e-6) { x = b.x + dx / d * m; z = b.z + dz / d * m; } else x = b.x + m;
        continue;
      }
      let [lx, lz] = toLocal(b, x, z);
      const cx = Math.max(-b.hx, Math.min(b.hx, lx)), cz = Math.max(-b.hz, Math.min(b.hz, lz));
      let dx = lx - cx, dz = lz - cz, d2 = dx * dx + dz * dz;
      if (d2 >= RAD * RAD) continue;
      if (d2 > 1e-8) { const d = Math.sqrt(d2), k = (RAD - d) / d; lx += dx * k; lz += dz * k; }
      else { const px = b.hx - Math.abs(lx), pz = b.hz - Math.abs(lz); if (px < pz) lx = Math.sign(lx || 1) * (b.hx + RAD); else lz = Math.sign(lz || 1) * (b.hz + RAD); }
      [x, z] = toWorld(b, lx, lz);
    }
    // man kan inte gå över kanten på ön
    const I = islandAt(x, z), dx = x - I.x, dz = z - I.z, d = Math.hypot(dx, dz), m = I.R - RAD - 0.45;
    if (d > m) { x = I.x + dx * m / d; z = I.z + dz * m / d; }
  }
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
const blobTex = canvasTex(64, 64, (g) => {
  const r = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  r.addColorStop(0, 'rgba(0,0,0,.45)'); r.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = r; g.fillRect(0, 0, 64, 64);
});
const cloudTex = canvasTex(256, 128, (g) => {
  for (const [x, y, r] of [[70, 80, 46], [120, 62, 58], [175, 78, 46], [128, 92, 44], [210, 92, 30], [40, 98, 28]]) {
    const gr = g.createRadialGradient(x, y, r * 0.2, x, y, r);
    gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.7, 'rgba(255,255,255,.9)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill();
  }
});
const stripeTex = canvasTex(64, 64, (g, w, h) => { g.fillStyle = '#ffffff'; g.fillRect(0, 0, w, h); g.fillStyle = '#e8203a'; for (let i = -1; i < 3; i++) { g.beginPath(); g.moveTo(i * 32, 0); g.lineTo(i * 32 + 16, 0); g.lineTo(i * 32 + 16 + 64, 64); g.lineTo(i * 32 + 64, 64); g.fill(); } }, true);
function groundTex(base, draw) { return canvasTex(256, 256, (g, w, h) => { g.fillStyle = base; g.fillRect(0, 0, w, h); const r = seeded(base.length * 977 + base.charCodeAt(1)); draw(g, w, h, r); }, true); }
const GROUND = {
  hub: groundTex('#f6ecda', (g, w, h) => { g.strokeStyle = 'rgba(190,160,120,.55)'; g.lineWidth = 3; for (let i = 0; i <= 4; i++) { g.beginPath(); g.moveTo(0, i * 64); g.lineTo(w, i * 64); g.stroke(); } for (let j = 0; j < 4; j++) for (let i = 0; i <= 4; i++) { const x = i * 64 + (j % 2) * 32; g.beginPath(); g.moveTo(x, j * 64); g.lineTo(x, j * 64 + 64); g.stroke(); } }),
  grass: groundTex('#7fd65a', (g, w, h, r) => { for (let i = 0; i < 500; i++) { g.fillStyle = r() < 0.5 ? '#6cc84a' : '#94e06e'; g.fillRect(r() * w, r() * h, 3, 7); } for (let i = 0; i < 26; i++) { g.fillStyle = ['#ffffff', '#ffe066', '#ff8fd0', '#c9a6ff'][i % 4]; g.beginPath(); g.arc(r() * w, r() * h, 3.2, 0, 7); g.fill(); } }),
  candy: groundTex('#ffc8e6', (g, w, h, r) => { for (let i = 0; i < 160; i++) { g.save(); g.translate(r() * w, r() * h); g.rotate(r() * 3); g.fillStyle = ['#ff4d6d', '#3ee8ff', '#ffd84a', '#8dff5a', '#ffffff', '#a77bff'][i % 6]; g.fillRect(-6, -2, 12, 4); g.restore(); } }),
  farm: groundTex('#86d05e', (g, w, h, r) => { for (let i = 0; i < 400; i++) { g.fillStyle = r() < 0.5 ? '#76c24f' : '#99dc72'; g.fillRect(r() * w, r() * h, 3, 6); } for (let i = 0; i < 6; i++) { g.fillStyle = 'rgba(160,110,60,.25)'; g.beginPath(); g.ellipse(r() * w, r() * h, 26, 14, r() * 3, 0, 7); g.fill(); } }),
  snow: groundTex('#f4f9ff', (g, w, h, r) => { for (let i = 0; i < 90; i++) { g.fillStyle = 'rgba(160,200,240,.35)'; g.beginPath(); g.arc(r() * w, r() * h, 2 + r() * 5, 0, 7); g.fill(); } for (let i = 0; i < 40; i++) { g.fillStyle = '#ffffff'; g.fillRect(r() * w, r() * h, 2, 2); } }),
  cloud: groundTex('#f3f0ff', (g, w, h, r) => { for (let i = 0; i < 40; i++) { const x = r() * w, y = r() * h, s = 10 + r() * 24; const gr = g.createRadialGradient(x, y, 0, x, y, s); gr.addColorStop(0, 'rgba(255,255,255,.9)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.beginPath(); g.arc(x, y, s, 0, 7); g.fill(); } for (let i = 0; i < 30; i++) { g.fillStyle = 'rgba(190,170,255,.25)'; g.beginPath(); g.arc(r() * w, r() * h, 6 + r() * 10, 0, 7); g.fill(); } }),
  moon: groundTex('#bdb6d6', (g, w, h, r) => { for (let i = 0; i < 18; i++) { const x = r() * w, y = r() * h, s = 6 + r() * 16; g.fillStyle = 'rgba(120,110,160,.35)'; g.beginPath(); g.arc(x, y, s, 0, 7); g.fill(); g.strokeStyle = 'rgba(255,255,255,.35)'; g.lineWidth = 2; g.beginPath(); g.arc(x, y, s, 3.6, 5.6); g.stroke(); } })
};

/* ---------- Äggens mönster ---------- */
function eggCanvas(d, seed) {
  const W = 256, H = 128, c = document.createElement('canvas'); c.width = W; c.height = H;
  const g = c.getContext('2d'), r = seeded(seed), [kind, a, b, cc, dd, ee, ff] = d;
  const wrap = (x, m, fn) => { fn(x); if (x - m < 0) fn(x + W); if (x + m > W) fn(x - W); };
  const circle = (x, y, rad, col) => wrap(x, rad, X => { g.fillStyle = col; g.beginPath(); g.arc(X, y, rad, 0, 7); g.fill(); });
  g.fillStyle = a || '#fff'; g.fillRect(0, 0, W, H);
  if (kind === 'flowers') {
    for (let j = 0; j < 4; j++) for (let i = 0; i < 7; i++) {
      const x = i * 37 + (j % 2) * 18, y = 16 + j * 32;
      for (let k = 0; k < 5; k++) { const t = k / 5 * Math.PI * 2; circle(x + Math.cos(t) * 7, y + Math.sin(t) * 7, 6, b); }
      circle(x, y, 5, cc);
    }
  } else if (kind === 'dots') {
    for (let j = 0; j < 4; j++) for (let i = 0; i < 6; i++) circle(i * 43 + (j % 2) * 21, 14 + j * 33, 10 - Math.abs(j - 1.5) * 1.5, b);
  } else if (kind === 'bands') {
    g.fillStyle = b; for (let j = 0; j < 7; j++) if (j % 2) g.fillRect(0, j * H / 7, W, H / 7);
  } else if (kind === 'butterfly') {
    for (let j = 0; j < 3; j++) for (let i = 0; i < 5; i++) {
      const x = i * 51 + (j % 2) * 25, y = 22 + j * 40;
      wrap(x, 18, X => {
        g.fillStyle = b; g.beginPath(); g.ellipse(X - 8, y - 4, 8, 10, -0.5, 0, 7); g.ellipse(X + 8, y - 4, 8, 10, 0.5, 0, 7); g.fill();
        g.fillStyle = cc; g.beginPath(); g.ellipse(X - 6, y + 8, 5, 6, -0.3, 0, 7); g.ellipse(X + 6, y + 8, 5, 6, 0.3, 0, 7); g.fill();
        g.fillStyle = '#4a2a5a'; g.fillRect(X - 1.5, y - 10, 3, 22);
      });
    }
  } else if (kind === 'diag') {
    const cols = [a, b, cc, dd, ee].filter(Boolean), sw = 22;
    for (let i = -12; i < 24; i++) { g.fillStyle = cols[((i % cols.length) + cols.length) % cols.length]; g.beginPath(); g.moveTo(i * sw, 0); g.lineTo(i * sw + sw, 0); g.lineTo(i * sw + sw - H, H); g.lineTo(i * sw - H, H); g.fill(); }
  } else if (kind === 'zigzag') {
    g.strokeStyle = b; g.lineWidth = 6;
    for (let j = 0; j < 4; j++) { const y = 18 + j * 30; g.beginPath(); for (let x = 0; x <= W; x += 16) g.lineTo(x, y + ((x / 16) % 2 ? 8 : -8)); g.stroke(); }
  } else if (kind === 'sprinkles') {
    const cols = [b, cc, dd, ee, ff];
    for (let i = 0; i < 120; i++) { const x = r() * W, y = 6 + r() * (H - 12), t = r() * 3; wrap(x, 8, X => { g.save(); g.translate(X, y); g.rotate(t); g.fillStyle = cols[i % cols.length]; g.fillRect(-6, -2, 12, 4); g.restore(); }); }
  } else if (kind === 'speckle') {
    for (let i = 0; i < 160; i++) circle(r() * W, r() * H, 1 + r() * 3, b);
  } else if (kind === 'straw') {
    g.strokeStyle = b; g.lineWidth = 2.5;
    for (let i = 0; i < 140; i++) { const x = r() * W, y = r() * H, t = (r() - 0.5) * 0.8; wrap(x, 12, X => { g.beginPath(); g.moveTo(X - Math.cos(t) * 12, y - Math.sin(t) * 12); g.lineTo(X + Math.cos(t) * 12, y + Math.sin(t) * 12); g.stroke(); }); }
  } else if (kind === 'carrot') {
    g.strokeStyle = 'rgba(160,60,0,.45)'; g.lineWidth = 3;
    for (let j = 0; j < 8; j++) { const y = 20 + j * 12; for (let i = 0; i < 6; i++) { const x = r() * W; g.beginPath(); g.moveTo(x, y); g.lineTo(x + 18, y); g.stroke(); } }
    g.fillStyle = b; g.fillRect(0, 0, W, 16);
    for (let i = 0; i < 16; i++) { g.beginPath(); g.moveTo(i * 16, 16); g.lineTo(i * 16 + 8, 30); g.lineTo(i * 16 + 16, 16); g.fill(); }
  } else if (kind === 'barn') {
    g.strokeStyle = b; g.lineWidth = 5;
    for (let i = 0; i < 4; i++) { const x = i * 64 + 8; g.strokeRect(x, 28, 48, 70); g.beginPath(); g.moveTo(x, 28); g.lineTo(x + 48, 98); g.moveTo(x + 48, 28); g.lineTo(x, 98); g.stroke(); }
  } else if (kind === 'flakes') {
    g.strokeStyle = b; g.lineWidth = 3; g.lineCap = 'round';
    for (let j = 0; j < 3; j++) for (let i = 0; i < 5; i++) {
      const x = i * 51 + (j % 2) * 25, y = 22 + j * 40;
      wrap(x, 14, X => { for (let k = 0; k < 3; k++) { const t = k * Math.PI / 3; g.beginPath(); g.moveTo(X - Math.cos(t) * 13, y - Math.sin(t) * 13); g.lineTo(X + Math.cos(t) * 13, y + Math.sin(t) * 13); g.stroke(); } });
    }
  } else if (kind === 'bricks') {
    g.strokeStyle = b; g.lineWidth = 3;
    for (let j = 0; j < 6; j++) { const y = j * 22; g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke(); for (let i = 0; i < 9; i++) { const x = i * 32 + (j % 2) * 16; g.beginPath(); g.moveTo(x, y); g.lineTo(x, y + 22); g.stroke(); } }
  } else if (kind === 'ice') {
    const gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, '#e9f8ff'); gr.addColorStop(1, a); g.fillStyle = gr; g.fillRect(0, 0, W, H);
    g.strokeStyle = 'rgba(255,255,255,.9)'; g.lineWidth = 2;
    for (let i = 0; i < 14; i++) { let x = r() * W, y = r() * H; g.beginPath(); g.moveTo(x, y); for (let k = 0; k < 3; k++) { x += (r() - 0.5) * 40; y += (r() - 0.5) * 30; g.lineTo(x, y); } g.stroke(); }
  } else if (kind === 'penguin') {
    g.fillStyle = b; g.beginPath(); g.ellipse(W / 2, 78, 52, 58, 0, 0, 7); g.fill();
    circle(W / 2 - 18, 40, 7, '#ffffff'); circle(W / 2 + 18, 40, 7, '#ffffff'); circle(W / 2 - 17, 41, 3.5, '#111'); circle(W / 2 + 17, 41, 3.5, '#111');
    g.fillStyle = cc; g.beginPath(); g.moveTo(W / 2 - 9, 50); g.lineTo(W / 2 + 9, 50); g.lineTo(W / 2, 62); g.fill();
  } else if (kind === 'rainbow') {
    const cols = ['#8a5cff', '#3f6dff', '#3ee8ff', '#5ad04a', '#ffd84a', '#ff9a3d', '#ff4d6d'];
    cols.forEach((c2, i) => { g.fillStyle = c2; g.fillRect(0, i * H / 7, W, H / 7 + 1); });
  } else if (kind === 'clouds') {
    for (let i = 0; i < 9; i++) { const x = (i * 29 + r() * 10) % W, y = 18 + (i % 3) * 38; for (const [ox, oy, s] of [[-10, 2, 9], [0, -4, 12], [11, 2, 9]]) circle(x + ox, y + oy, s, b); }
  } else if (kind === 'stars') {
    const star = (x, y, s) => wrap(x, s, X => { g.fillStyle = b; g.beginPath(); for (let k = 0; k < 10; k++) { const t = -Math.PI / 2 + k * Math.PI / 5, q = k % 2 ? s * 0.45 : s; g.lineTo(X + Math.cos(t) * q, y + Math.sin(t) * q); } g.fill(); });
    for (let j = 0; j < 3; j++) for (let i = 0; i < 5; i++) star(i * 51 + (j % 2) * 25, 22 + j * 40, 12);
    for (let i = 0; i < 40; i++) circle(r() * W, r() * H, 1.4, '#ffffff');
  } else if (kind === 'bolts') {
    g.fillStyle = b;
    for (let i = 0; i < 6; i++) { const x = i * 43 + 10, y = 18 + (i % 2) * 20; g.beginPath(); g.moveTo(x + 12, y); g.lineTo(x, y + 36); g.lineTo(x + 10, y + 36); g.lineTo(x + 2, y + 70); g.lineTo(x + 24, y + 26); g.lineTo(x + 13, y + 26); g.lineTo(x + 22, y); g.fill(); }
  } else if (kind === 'rocket') {
    g.fillStyle = b; g.fillRect(0, 98, W, 14); g.fillRect(0, 12, W, 10);
    for (let i = 0; i < 4; i++) { circle(i * 64 + 32, 58, 15, '#cfd8e6'); circle(i * 64 + 32, 58, 11, cc); }
  } else if (kind === 'craters') {
    for (let i = 0; i < 18; i++) { const x = r() * W, y = 10 + r() * (H - 20), s = 5 + r() * 11; circle(x, y, s, b); wrap(x, s, X => { g.strokeStyle = 'rgba(255,255,255,.55)'; g.lineWidth = 2; g.beginPath(); g.arc(X, y, s, 3.5, 5.6); g.stroke(); }); }
  } else if (kind === 'alien') {
    for (let j = 0; j < 2; j++) for (let i = 0; i < 4; i++) {
      const x = i * 64 + 32 + (j % 2) * 32, y = 36 + j * 50;
      wrap(x, 16, X => { g.fillStyle = b; g.beginPath(); g.ellipse(X - 7, y, 6, 9, -0.5, 0, 7); g.ellipse(X + 7, y, 6, 9, 0.5, 0, 7); g.fill(); g.fillRect(X - 5, y + 12, 10, 3); });
    }
  } else if (kind === 'robot') {
    g.strokeStyle = b; g.lineWidth = 3;
    for (let i = 0; i < 4; i++) g.strokeRect(i * 64 + 6, 30, 52, 60);
    for (let i = 0; i < 4; i++) for (const [ox, oy] of [[12, 36], [52, 36], [12, 84], [52, 84]]) circle(i * 64 + ox, oy, 3, b);
    for (let i = 0; i < 4; i++) circle(i * 64 + 32, 60, 8, cc);
  } else if (kind === 'gold') {
    const gr = g.createLinearGradient(0, 0, W, H); gr.addColorStop(0, '#fff3b0'); gr.addColorStop(0.35, '#ffcf3a'); gr.addColorStop(0.65, '#e0a100'); gr.addColorStop(1, '#ffe27a');
    g.fillStyle = gr; g.fillRect(0, 0, W, H);
    g.strokeStyle = '#fff6c9'; g.lineWidth = 4; for (const y of [30, 64, 98]) { g.beginPath(); for (let x = 0; x <= W; x += 8) g.lineTo(x, y + Math.sin(x / 16) * 5); g.stroke(); }
    for (let i = 0; i < 8; i++) circle(i * 32 + 16, 47, 5, '#ff4d6d');
    for (let i = 0; i < 8; i++) circle(i * 32, 81, 5, '#3ee8ff');
  }
  return c;
}
// Äggets form: bredare nertill, smalare upptill
const eggPts = [];
for (let i = 0; i <= 22; i++) { const t = i / 22 * Math.PI; eggPts.push(new THREE.Vector2(Math.max(0.0001, Math.sin(t) * 0.45 * (1 + 0.12 * Math.cos(t))), -Math.cos(t) * 0.62)); }
const eggGeo = new THREE.LatheGeometry(eggPts, 28);
for (const e of [...EGGS, GRAND]) {
  e.cv = eggCanvas(e.d, e.id.length * 131 + e.id.charCodeAt(0));
  const t = new THREE.CanvasTexture(e.cv); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = THREE.RepeatWrapping; t.anisotropy = 4;
  e.mat = new THREE.MeshPhongMaterial({ map: t, shininess: e.gold ? 110 : 55, specular: e.gold ? '#fff2b0' : '#444444', emissive: e.gold ? '#4a3000' : '#000000',
    transparent: !!e.ice, opacity: e.ice ? 0.88 : 1 });
}
const greyEgg = new THREE.MeshPhongMaterial({ color: '#8f8aa8', transparent: true, opacity: 0.45, shininess: 30 });
// Ägget som en liten bild (för korgen och "Du hittade"-rutan)
function eggPath(g, w, h) {
  const m = w * 0.07;
  g.beginPath(); g.moveTo(w / 2, m);
  g.bezierCurveTo(w * 0.86, m, w - m, h * 0.36, w - m, h * 0.62);
  g.bezierCurveTo(w - m, h * 0.86, w * 0.78, h - m, w / 2, h - m);
  g.bezierCurveTo(w * 0.22, h - m, m, h * 0.86, m, h * 0.62);
  g.bezierCurveTo(m, h * 0.36, w * 0.14, m, w / 2, m);
  g.closePath();
}
function drawEgg(c, e, found) {
  const g = c.getContext('2d'), w = c.width, h = c.height;
  g.clearRect(0, 0, w, h);
  g.save(); eggPath(g, w, h); g.clip();
  if (found) {
    g.drawImage(e.cv, 64, 0, 128, 128, 0, 0, w, h);
    const r = g.createRadialGradient(w * 0.34, h * 0.3, w * 0.04, w * 0.5, h * 0.55, w * 0.8);
    r.addColorStop(0, 'rgba(255,255,255,.6)'); r.addColorStop(0.35, 'rgba(255,255,255,0)'); r.addColorStop(1, 'rgba(0,0,0,.35)');
    g.fillStyle = r; g.fillRect(0, 0, w, h);
  } else { g.fillStyle = '#3b3270'; g.fillRect(0, 0, w, h); }
  g.restore();
  eggPath(g, w, h); g.lineWidth = Math.max(2, w * 0.045); g.strokeStyle = found ? 'rgba(255,255,255,.95)' : 'rgba(255,255,255,.35)'; g.stroke();
  if (!found) { g.fillStyle = 'rgba(255,255,255,.6)'; g.font = `700 ${Math.round(w * 0.52)}px Fredoka, sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('?', w / 2, h * 0.57); }
}

/* ---------- Sparning ---------- */
let mem = { found: {}, sets: {}, grand: 0 };          // gäst: bara i minnet
function prog() {
  if (!player) return mem;
  const p = Save.get(player.id); const e = (p && p.progress && p.progress.egg) || {};
  return { found: e.found || {}, sets: e.sets || {}, grand: e.grand || 0, seen: e.seen || 0 };
}
function saveProg(fn) {
  if (!player) { fn(mem); return; }
  Save.updatePlayer(player.id, p => { const e = p.progress.egg = p.progress.egg || {}; e.found = e.found || {}; e.sets = e.sets || {}; fn(e); });
}
const isFound = id => !!prog().found[id];
const foundCount = () => EGGS.filter(e => isFound(e.id)).length;
const zoneCount = z => EGGS.filter(e => e.z === z && isFound(e.id)).length;

/* ---------- Öarna ---------- */
const ISLANDS = [{ id: 'hub', x: 0, z: 0, R: HUB_R, a: 0, grav: 1, name: 'Äggtorget', ic: '🥚' }];
ZONES.forEach((zn, i) => { const a = i / ZONES.length * Math.PI * 2 + Math.PI / 6; ISLANDS.push({ ...zn, zone: zn, x: Math.sin(a) * ISLE_D, z: Math.cos(a) * ISLE_D, R: ISLE_R, a, grav: zn.grav || 1 }); });
const ISLE = Object.fromEntries(ISLANDS.map(I => [I.id, I]));
function islandAt(x, z) { let best = ISLANDS[0], bd = Infinity; for (const I of ISLANDS) { const d = (x - I.x) ** 2 + (z - I.z) ** 2; if (d < bd) { bd = d; best = I; } } return best; }

// Bygghjälp: koordinater lokalt på ön. Lokalt -z pekar mot torget.
let F = { x: 0, z: 0, c: 1, s: 0, a: 0 }, G = null;
const W = (x, z) => [F.x + x * F.c + z * F.s, F.z - x * F.s + z * F.c];
function mesh(geo, mat, x, y, z, yaw = 0, parent = G) {
  const m = new THREE.Mesh(geo, mat); const [wx, wz] = W(x, z);
  m.rotation.order = 'YXZ';                          // vridning runt y först, lutningar (x/z) i sakens egen ram
  m.position.set(wx, y, wz); m.rotation.y = yaw + F.a; parent.add(m); return m;
}
// låda: (x,z) mitt, y0 = botten
function block(x, y0, z, w, h, d, mat, o = {}) {
  const m = mesh(new THREE.BoxGeometry(w, h, d), typeof mat === 'string' ? lam(mat) : mat, x, y0 + h / 2, z, o.yaw || 0);
  if (o.solid !== false) { const [wx, wz] = W(x, z); addBox({ x: wx, y: y0 + h / 2, z: wz, hx: w / 2, hy: h / 2, hz: d / 2, yaw: (o.yaw || 0) + F.a }); }
  return m;
}
function column(x, y0, z, r, h, mat, o = {}) {
  const m = mesh(new THREE.CylinderGeometry(r * (o.rt ?? 1), r, h, o.seg || 18), typeof mat === 'string' ? lam(mat) : mat, x, y0 + h / 2, z);
  if (o.solid !== false) { const [wx, wz] = W(x, z); addCyl({ x: wx, z: wz, rad: o.cr || r, top: y0 + h, bot: y0 }); }
  return m;
}
function ball(x, y, z, r, mat, sx = 1, sy = 1, sz = 1, seg = 14) {
  const m = mesh(new THREE.SphereGeometry(r, seg, Math.max(6, seg * 0.7 | 0)), typeof mat === 'string' ? lam(mat) : mat, x, y, z);
  m.scale.set(sx, sy, sz); return m;
}
function cone(x, y0, z, r, h, mat, seg = 12) { return mesh(new THREE.ConeGeometry(r, h, seg), typeof mat === 'string' ? lam(mat) : mat, x, y0 + h / 2, z); }
function solidCyl(x, z, r, top, bot = 0) { const [wx, wz] = W(x, z); return addCyl({ x: wx, z: wz, rad: r, top, bot }); }
function solidBox(x, y0, z, w, h, d, yaw = 0) { const [wx, wz] = W(x, z); return addBox({ x: wx, y: y0 + h / 2, z: wz, hx: w / 2, hy: h / 2, hz: d / 2, yaw: yaw + F.a }); }

function islandBase(I, tex, under, rep = 7) {
  tex = tex.clone(); tex.needsUpdate = true; tex.repeat.set(rep, rep);
  mesh(new THREE.CylinderGeometry(I.R, I.R * 0.97, 1.4, 48), [lam(under), lam('#ffffff', { map: tex }), lam(under)], 0, -0.7, 0);
  const u = mesh(new THREE.ConeGeometry(I.R * 0.97, I.R * 0.95, 14), lam(under), 0, -1.4 - I.R * 0.475, 0); u.rotation.x = Math.PI;
  addCyl({ x: I.x, z: I.z, rad: I.R, top: 0, bot: -3 });
}
function rim(I, kind) {
  const n = Math.round(I.R * 1.6);
  for (let i = 0; i < n; i++) {
    const t = i / n * Math.PI * 2, rr2 = I.R - 0.6, x = Math.sin(t) * rr2, z = Math.cos(t) * rr2;
    if (kind === 'hedge') { const m = ball(x, 0.45, z, 0.75, i % 3 ? '#4fae3a' : '#5fc048', 1.3, 0.8, 1.3, 10); if (i % 2) ball(x, 1.0, z, 0.16, ['#ff8fd0', '#ffe066', '#ffffff'][i % 3], 1, 1, 1, 6); }
    else if (kind === 'candy') { column(x, 0, z, 0.14, 1.1, i % 2 ? '#ff5cb8' : '#ffffff', { solid: false, seg: 8 }); ball(x, 1.2, z, 0.26, ['#ffd84a', '#3ee8ff', '#8dff5a', '#ff4d6d'][i % 4], 1, 1, 1, 8); }
    else if (kind === 'fence') { column(x, 0, z, 0.1, 1.0, '#b07a45', { solid: false, seg: 6 }); const yaw = t + Math.PI / 2; mesh(new THREE.BoxGeometry(0.08, 0.14, 2 * Math.PI * rr2 / n + 0.1), lam('#c98d52'), x, 0.75, z, yaw - Math.PI / 2 + Math.PI / 2); }
    else if (kind === 'snow') ball(x, 0.2, z, 0.9, '#ffffff', 1.3, 0.6, 1.3, 10);
    else if (kind === 'cloud') ball(x, 0.3, z, 0.95, i % 2 ? '#ffffff' : '#f1ecff', 1.2, 0.8, 1.2, 10);
    else if (kind === 'space') { column(x, 0, z, 0.1, 0.9, '#7d74b8', { solid: false, seg: 6 }); ball(x, 1.0, z, 0.2, i % 2 ? '#3ee8ff' : '#ff5ccf', 1, 1, 1, 8); }
  }
}
function tree(x, z, h = 3.2, leaf = '#5cc845', r = 2.2) {
  column(x, 0, z, 0.4, h, '#9a6a3c', { seg: 8, cr: 0.45 });
  ball(x, h + r * 0.5, z, r, leaf, 1, 0.9, 1, 12); ball(x + r * 0.45, h + r * 0.2, z + 0.3, r * 0.62, leaf, 1, 0.9, 1, 10);
}

/* ---------- Ägg i världen ---------- */
const worldEggs = [];
function placeEgg(id, x, y, z) {                     // y = där ägget står (marken under det)
  const e = EGG_BY.get(id), [wx, wz] = W(x, z);
  e.pos = new THREE.Vector3(wx, y, wz); e.island = F.id;
  if (isFound(id) && !e.gold) return;
  const m = new THREE.Mesh(eggGeo, e.mat); m.scale.setScalar(EGG_S); m.position.set(wx, y + 0.62 * EGG_S + 0.12, wz); scene.add(m);
  const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: e.gold ? '#ffe27a' : '#fff6c9', transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0.8 }));
  glow.position.set(wx, y + 1.24 * EGG_S + 0.55, wz); glow.scale.setScalar(0.7); scene.add(glow);
  worldEggs.push({ e, m, glow, y, ph: Math.random() * 6 });
}

/* ---------- Portaler ---------- */
const swirlTex = canvasTex(128, 128, (g) => {
  g.fillStyle = 'rgba(255,255,255,.35)'; g.fillRect(0, 0, 128, 128);
  for (let i = 0; i < 26; i++) { const x = (i * 37) % 128, y = (i * 53) % 128, s = 6 + (i % 5) * 4; const gr = g.createRadialGradient(x, y, 0, x, y, s); gr.addColorStop(0, 'rgba(255,255,255,.95)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.beginPath(); g.arc(x, y, s, 0, 7); g.fill(); }
}, true);
const archAlpha = canvasTex(128, 160, (g) => {
  g.fillStyle = '#000'; g.fillRect(0, 0, 128, 160); g.fillStyle = '#fff';
  g.beginPath(); g.moveTo(4, 160); g.lineTo(4, 64); g.arc(64, 64, 60, Math.PI, 0); g.lineTo(124, 160); g.closePath(); g.fill();
});
const portals = [];
function signCanvas(c, lines, col) {
  const g = c.getContext('2d'), w = c.width, h = c.height;
  g.clearRect(0, 0, w, h);
  g.fillStyle = col; g.strokeStyle = '#ffffff'; g.lineWidth = 10;
  g.beginPath(); g.roundRect(8, 8, w - 16, h - 16, 40); g.fill(); g.stroke();
  g.fillStyle = '#fff'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.font = '700 58px Fredoka, sans-serif'; g.fillText(lines[0], w / 2, lines[1] ? h * 0.36 : h / 2);
  if (lines[1]) { g.font = '700 46px Fredoka, sans-serif'; g.fillText(lines[1], w / 2, h * 0.72); }
}
// x,z lokalt; man går in i portalen i riktningen "in" (lokal vinkel)
function portal(x, z, faceYaw, col, lines, target) {
  const P0 = { x, z };
  const fr = lam('#ffffff');
  const c = Math.cos(faceYaw), s = Math.sin(faceYaw);
  const at = (lx, lz) => [x + lx * c + lz * s, z - lx * s + lz * c];
  for (const sx of [-1.75, 1.75]) { const [px, pz] = at(sx, 0); column(px, 0, pz, 0.3, 2.5, lam(col), { seg: 12 }); }
  const arc = mesh(new THREE.TorusGeometry(1.75, 0.3, 10, 24, Math.PI), lam(col), x, 2.5, z, faceYaw); arc.userData.k = 1;
  const filmMat = new THREE.MeshBasicMaterial({ map: swirlTex.clone(), alphaMap: archAlpha, color: col, transparent: true, opacity: 0.85, side: THREE.DoubleSide, depthWrite: false });
  filmMat.map.needsUpdate = true; filmMat.map.repeat.set(1.5, 1.5);
  const film = new THREE.Mesh(new THREE.PlaneGeometry(3.3, 4.12), filmMat);
  const [fx, fz] = W(x, z); film.position.set(fx, 2.06, fz); film.rotation.y = faceYaw + F.a; scene.add(film);
  const sc = document.createElement('canvas'); sc.width = 512; sc.height = 200; signCanvas(sc, lines, col);
  const st = new THREE.CanvasTexture(sc); st.colorSpace = THREE.SRGBColorSpace;
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(3.8, 1.48), new THREE.MeshBasicMaterial({ map: st, transparent: true }));
  const [sx2, sz2] = W(...at(0, 0.06)); sign.position.set(sx2, 5.1, sz2); sign.rotation.y = faceYaw + F.a; scene.add(sign);
  const back = sign.clone(); back.rotation.y = faceYaw + F.a + Math.PI; const [bx, bz] = W(...at(0, -0.06)); back.position.set(bx, 5.1, bz); scene.add(back);
  // in = lokal -z i portalens ram (man kommer från +z-sidan)
  const p = { x: fx, z: fz, yaw: faceYaw + F.a, film, sc, st, col, target, island: F.id };
  p.c = Math.cos(p.yaw); p.s = Math.sin(p.yaw);
  portals.push(p);
  return p;
}

/* ---------- Bygg världen ---------- */
const anims = [];                                      // småsaker som rör sig (höns, pingviner, haren)
let bunny = null, grandDome = null, pedestals = [];
function startIsland(I) {
  F = { x: I.x, z: I.z, a: I.a, c: Math.cos(I.a), s: Math.sin(I.a), id: I.id };
  G = new THREE.Group(); scene.add(G);
  R = seeded(I.id.charCodeAt(0) * 7919 + I.id.length);
}
function endIsland() { mergeStatic(G); }
// Varje ö: returportal vid kanten mot torget, man kommer ut lite framför den
function islandPortal(I) {
  const p = portal(-9, -I.R + 6.8, 0.4, I.col, ['🏠 Till torget'], 'hub');          // vid sidan, så att kameran inte hamnar bakom den
  const [sx, sz] = W(0, -I.R + 8); I.spawn = { x: sx, z: sz, y: 0, heading: I.a };
  return p;
}

function buildHub() {
  const I = ISLE.hub; startIsland(I);
  islandBase(I, GROUND.grass, '#a0714a', 7);
  const plaza = mesh(new THREE.CircleGeometry(19.5, 48), lam('#ffffff', { map: (() => { const t = GROUND.hub.clone(); t.needsUpdate = true; t.repeat.set(9, 9); return t; })() }), 0, 0.02, 0);
  plaza.rotation.x = -Math.PI / 2;
  rim(I, 'hedge');
  // mitten: ett stort påskägg och en molntrappa runt det upp till glaskupan
  column(0, 0, 0, 3.0, 0.5, '#ffffff', { seg: 32 });
  const big = new THREE.Mesh(eggGeo, new THREE.MeshPhongMaterial({ map: (() => { const t = new THREE.CanvasTexture(eggCanvas(['diag', '#ffb3dc', '#b8f0ff', '#fff2a8', '#c9ffb8', '#e2c9ff'], 3)); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = THREE.RepeatWrapping; return t; })(), shininess: 40 }));
  big.scale.set(5.2, 4.6, 5.2); big.position.set(0, 0.5 + 0.62 * 4.6, 0); G.add(big);
  solidCyl(0, 0, 2.2, 5.9, 0.5);
  const steps = 8;
  for (let i = 0; i < steps; i++) {
    const t = i / steps * Math.PI * 2 * 0.95 + 0.4, x = Math.sin(t) * 4.6, z = Math.cos(t) * 4.6, top = 0.75 * (i + 1);
    column(x, top - 0.4, z, 1.1, 0.4, ['#ff8fd0', '#ffd84a', '#3ee8ff', '#8dff5a'][i % 4], { seg: 20 });
    column(x, 0, z, 0.12, top - 0.4, '#ffffff', { solid: false, seg: 6 });
  }
  column(0, 6.3, 0, 1.9, 0.35, '#ffffff', { seg: 28 });
  solidCyl(0, 0, 1.9, 6.65, 6.3);
  placeEgg('guld', 0, 6.65, 0);
  grandDome = new THREE.Mesh(new THREE.SphereGeometry(1.0, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshPhongMaterial({ color: '#cdefff', transparent: true, opacity: 0.35, shininess: 120, specular: '#ffffff', depthWrite: false }));
  grandDome.scale.set(1, 1.5, 1); grandDome.position.set(0, 6.65, 0); scene.add(grandDome);
  // sex portaler – var och en pekar mot sin ö
  ZONES.forEach((zn, i) => {
    const J = ISLE[zn.id], a = J.a, r = 17.5, x = Math.sin(a) * r, z = Math.cos(a) * r;
    J.hubPortal = portal(x, z, a + Math.PI, zn.col, [zn.ic + ' ' + zn.name, `🥚 0/4`], zn.id);
    J.hubSpawn = { x: Math.sin(a) * 9.6, z: Math.cos(a) * 9.6, y: 0, heading: a + Math.PI };
    // hyllor bredvid portalen med öns fyra ägg
    const tx = Math.cos(a), tz = -Math.sin(a);
    EGGS.filter(e => e.z === zn.id).forEach((e, k) => {
      const off = [-4.7, -3.3, 3.3, 4.7][k], px = x * 0.97 + tx * off, pz = z * 0.97 + tz * off;
      column(px, 0, pz, 0.5, 1.0, '#ffffff', { seg: 14 });
      column(px, 1.0, pz, 0.6, 0.12, lam(zn.col), { seg: 14, solid: false });
      const m = new THREE.Mesh(eggGeo, isFound(e.id) ? e.mat : greyEgg); m.scale.setScalar(0.42); m.position.set(px, 1.12 + 0.62 * 0.42, pz); scene.add(m);
      pedestals.push({ e, m });
    });
  });
  I.spawn = { x: 0, z: 10.5, y: 0, heading: Math.PI };
  // blomrabatter och bänkar
  for (let i = 0; i < 12; i++) {
    const t = (i + 0.5) / 12 * Math.PI * 2, x = Math.sin(t) * 21, z = Math.cos(t) * 21;
    for (let k = 0; k < 5; k++) { const fx = x + rr(-1.2, 1.2), fz = z + rr(-1.2, 1.2); column(fx, 0, fz, 0.04, 0.5, '#3f9a33', { solid: false, seg: 5 }); ball(fx, 0.56, fz, 0.16, ['#ff5cb8', '#ffd84a', '#ffffff', '#a77bff', '#ff8a2a'][(i + k) % 5], 1, 1, 1, 8); }
  }
  // Påskharen
  bunny = makeBunny();
  const [bx, bz] = W(3.6, 9); bunny.root.position.set(bx, 0, bz); solidCyl(3.6, 9, 0.6, 1.4);
  endIsland();
}
function makeBunny() {
  const root = new THREE.Group(); scene.add(root);
  const body = new THREE.Group(); root.add(body);
  const wh = lam('#ffffff'), pk = lam('#ffb3d9'), bl = lam('#2a1f3a');
  const add = (geo, mat, x, y, z, sx = 1, sy = 1, sz = 1, rz = 0) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.scale.set(sx, sy, sz); m.rotation.z = rz; body.add(m); return m; };
  const sph = new THREE.SphereGeometry(1, 16, 12);
  add(sph, wh, 0, 0.62, 0, 0.55, 0.62, 0.5);
  add(sph, wh, 0, 1.38, 0.05, 0.42, 0.4, 0.4);
  add(sph, wh, -0.17, 1.95, -0.02, 0.1, 0.42, 0.08, 0.12); add(sph, wh, 0.17, 1.95, -0.02, 0.1, 0.42, 0.08, -0.12);
  add(sph, pk, -0.17, 1.95, 0.04, 0.06, 0.32, 0.04, 0.12); add(sph, pk, 0.17, 1.95, 0.04, 0.06, 0.32, 0.04, -0.12);
  add(sph, bl, -0.14, 1.45, 0.38, 0.06, 0.07, 0.04); add(sph, bl, 0.14, 1.45, 0.38, 0.06, 0.07, 0.04);
  add(sph, pk, 0, 1.33, 0.43, 0.06, 0.045, 0.04);
  add(sph, wh, -0.24, 0.12, 0.3, 0.17, 0.1, 0.26); add(sph, wh, 0.24, 0.12, 0.3, 0.17, 0.1, 0.26);
  add(sph, pk, 0, 0.62, 0.42, 0.3, 0.36, 0.1);
  // korg med ägg
  const basket = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.2, 0.22, 12), lam('#c98d52')); basket.position.set(0.42, 0.85, 0.25); body.add(basket);
  for (const [dx, dz, cc] of [[-0.08, 0, '#ff8fd0'], [0.08, 0.04, '#8dff5a'], [0, -0.08, '#ffd84a']]) { const e = new THREE.Mesh(eggGeo, lam(cc)); e.scale.setScalar(0.17); e.position.set(0.42 + dx, 1.0, 0.25 + dz); body.add(e); }
  // pratbubbla
  const bc = document.createElement('canvas'); bc.width = 512; bc.height = 220;
  const bt = new THREE.CanvasTexture(bc); bt.colorSpace = THREE.SRGBColorSpace;
  const bubble = new THREE.Sprite(new THREE.SpriteMaterial({ map: bt, transparent: true, depthTest: false }));
  bubble.scale.set(4.2, 1.8, 1); bubble.position.set(0, 3.3, 0); bubble.visible = false; bubble.renderOrder = 10; root.add(bubble);
  return { root, body, bubble, bc, bt, text: '', near: false };
}
function bunnyText(t) {
  if (!bunny || bunny.text === t) return;
  bunny.text = t;
  const g = bunny.bc.getContext('2d'), w = 512, h = 220;
  g.clearRect(0, 0, w, h);
  g.fillStyle = '#ffffff'; g.strokeStyle = '#ff8fd0'; g.lineWidth = 8;
  g.beginPath(); g.roundRect(8, 8, w - 16, h - 52, 36); g.fill(); g.stroke();
  g.beginPath(); g.moveTo(w / 2 - 22, h - 46); g.lineTo(w / 2, h - 8); g.lineTo(w / 2 + 22, h - 46); g.fill();
  g.fillStyle = '#2a1f6b'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = '700 34px Fredoka, sans-serif';
  const words = t.split(' '), lines = []; let cur = '';
  for (const wd of words) { const tryL = cur ? cur + ' ' + wd : wd; if (g.measureText(tryL).width > w - 70 && cur) { lines.push(cur); cur = wd; } else cur = tryL; }
  lines.push(cur);
  const lh = 40, y0 = (h - 44) / 2 - (lines.length - 1) * lh / 2;
  lines.slice(0, 3).forEach((l, i) => g.fillText(l, w / 2, y0 + i * lh));
  bunny.bt.needsUpdate = true;
}

function buildBlom() {
  const I = ISLE.blom; startIsland(I);
  islandBase(I, GROUND.grass, '#a0714a'); rim(I, 'hedge'); islandPortal(I);
  for (const [x, z, h] of [[-15, -4, 3.4], [16, -9, 3.0], [-11, 13, 3.6], [15, 15, 3.2], [-19, 3, 2.8], [6, 21, 3.0]]) tree(x, z, h);
  // Blomägget: i en ring av tulpaner nära där man kommer in
  const fc = [-7, -12];
  for (let i = 0; i < 12; i++) { const t = i / 12 * Math.PI * 2, x = fc[0] + Math.sin(t) * 2.1, z = fc[1] + Math.cos(t) * 2.1; column(x, 0, z, 0.05, 0.8, '#3f9a33', { solid: false, seg: 5 }); cone(x, 0.75, z, 0.24, 0.45, ['#ff4d6d', '#ffd84a', '#ff8fd0', '#ffffff'][i % 4], 6).rotation.x = Math.PI; }
  placeEgg('blom', fc[0], 0, fc[1]);
  // Svampägget: små svampar som trappa upp till den stora
  const shroom = (x, z, top, r, cap = '#e8383d') => {
    column(x, 0, z, r * 0.35, top - 0.25, '#fff4e0', { solid: false, seg: 10 });
    column(x, top - 0.35, z, r, 0.35, cap, { seg: 20 });
    const d = mesh(new THREE.SphereGeometry(r, 20, 8, 0, Math.PI * 2, 0, Math.PI / 2), lam(cap), x, top - 0.02, z); d.scale.y = 0.28;
    for (let k = 0; k < 5; k++) { const t = k / 5 * Math.PI * 2 + r; ball(x + Math.sin(t) * r * 0.55, top + 0.05, z + Math.cos(t) * r * 0.55, r * 0.14, '#ffffff', 1, 0.5, 1, 6); }
    solidCyl(x, z, r * 0.35, top - 0.35, 0);
  };
  shroom(5.5, 2.0, 1.0, 1.0, '#ff8a2a'); shroom(6.2, 4.6, 1.9, 0.95, '#ff5cb8'); shroom(7.6, 6.8, 2.75, 0.95, '#a77bff'); shroom(10.2, 4.0, 3.5, 2.4);
  placeEgg('svamp', 10.2, 3.5 + 0.07, 4.0);
  // Biägget: bakom trädet med bikupan
  tree(-14, 8, 3.4, '#4fb83a', 2.4);
  ball(-13.2, 3.0, 7.0, 0.5, '#ffd23f', 1, 1.25, 1, 10); column(-13.2, 3.55, 7.0, 0.03, 0.6, '#5a3a1c', { solid: false, seg: 4 });
  for (let k = 0; k < 3; k++) ball(-13.2, 2.7 + k * 0.28, 7.0, 0.53, '#2b2118', 1, 0.08, 1, 10);
  placeEgg('bi', -16.4, 0, 10.8);
  // Fjärilsägget: inne i en ihålig stock
  const lg = mesh(new THREE.CylinderGeometry(1.35, 1.35, 7, 18, 1, true), lam('#9a6a3c', { side: THREE.DoubleSide }), 2, 1.35, 14); lg.rotation.z = Math.PI / 2; lg.rotation.y = F.a;
  for (const ex of [-3.5, 3.5]) { const ring = mesh(new THREE.TorusGeometry(1.3, 0.14, 8, 20), lam('#c98d52'), 2 + ex, 1.35, 14, Math.PI / 2); }
  solidBox(2, 0, 12.55, 7, 2.4, 0.2); solidBox(2, 0, 15.45, 7, 2.4, 0.2); solidBox(2, 2.45, 14, 7, 0.25, 2.9);
  for (let k = 0; k < 6; k++) ball(-1 + k * 1.2, 2.75, 14 + (k % 2 ? 0.4 : -0.4), 0.22, '#5cc845', 1, 0.6, 1, 6);
  placeEgg('fjaril', 2, 0, 14);
  // blommor överallt
  for (let i = 0; i < 120; i++) {
    const t = R() * Math.PI * 2, d = 3 + R() * (I.R - 5), x = Math.sin(t) * d, z = Math.cos(t) * d;
    if (Math.hypot(x - 2, z - 14) < 4.5 || Math.hypot(x - 10, z - 4) < 3 || Math.abs(x) < 2.5 && z < -14) continue;
    column(x, 0, z, 0.04, 0.45, '#3f9a33', { solid: false, seg: 4 }); ball(x, 0.5, z, 0.15, ['#ff5cb8', '#ffd84a', '#ffffff', '#a77bff', '#ff8a2a', '#3ee8ff'][i % 6], 1, 0.8, 1, 6);
  }
  endIsland();
}

function buildGodis() {
  const I = ISLE.godis; startIsland(I);
  islandBase(I, GROUND.candy, '#e8b07a'); rim(I, 'candy'); islandPortal(I);
  const swirl = canvasTex(128, 128, (g) => { g.fillStyle = '#fff'; g.fillRect(0, 0, 128, 128); const cols = ['#ff4d6d', '#ffd84a', '#3ee8ff', '#8dff5a', '#a77bff']; for (let k = 0; k < 5; k++) { g.strokeStyle = cols[k]; g.lineWidth = 9; g.beginPath(); for (let t = 0; t < 14; t += 0.1) { const r = t * 4.3; g.lineTo(64 + Math.cos(t + k * 1.25) * r, 64 + Math.sin(t + k * 1.25) * r); } g.stroke(); } });
  const lolly = (x, z, h, r) => { column(x, 0, z, 0.13, h, '#ffffff', { seg: 8, cr: 0.22 }); const d = mesh(new THREE.CylinderGeometry(r, r, 0.3, 28), [lam('#ffffff'), lam('#ffffff', { map: swirl }), lam('#ffffff', { map: swirl })], x, h + r * 0.9, z); d.rotation.x = Math.PI / 2; };
  for (const [x, z, h, r] of [[-16, -6, 3.2, 1.5], [15, -12, 2.8, 1.3], [-6, 19, 3.6, 1.6], [18, 6, 3.0, 1.4], [-19, 9, 2.6, 1.2], [5, -10, 2.4, 1.1]]) lolly(x, z, h, r);
  // Klubbägget: trappa av gelégodis
  const drop = (x, z, top, r, col) => { column(x, 0, z, r, top - 0.18, col, { rt: 0.86 }); const d = mesh(new THREE.SphereGeometry(r * 0.86, 18, 8, 0, Math.PI * 2, 0, Math.PI / 2), lam(col), x, top - 0.18, z); d.scale.y = 0.3; solidCyl(x, z, r * 0.9, top); };
  drop(-10, -4, 0.9, 1.3, '#ff4d6d'); drop(-12.2, -1.4, 1.8, 1.2, '#ffd84a'); drop(-12.6, 1.8, 2.7, 1.2, '#8dff5a'); drop(-10.6, 4.4, 3.6, 1.45, '#a77bff');
  placeEgg('klubba', -10.6, 3.6, 4.4);
  // Chokladägget: under en chokladkaka på ben
  const choc = canvasTex(128, 128, (g) => { g.fillStyle = '#7a4426'; g.fillRect(0, 0, 128, 128); g.strokeStyle = '#5a2f18'; g.lineWidth = 6; for (let i = 0; i <= 4; i++) { g.strokeRect(i * 32 - 32, 0, 32, 32); } for (let j = 0; j < 4; j++) for (let i = 0; i < 4; i++) g.strokeRect(i * 32 + 3, j * 32 + 3, 26, 26); }, true);
  const cm = lam('#ffffff', { map: choc });
  block(10, 2.0, -5, 6, 0.5, 4, cm);
  for (const [dx, dz] of [[-2.6, -1.6], [2.6, -1.6], [-2.6, 1.6], [2.6, 1.6]]) column(10 + dx, 0, -5 + dz, 0.22, 2.0, lam('#ffffff', { map: stripeTex }), { seg: 10 });
  placeEgg('choklad', 10, 0, -5);
  // Muffinsägget: högst upp på en jättemuffins
  const cup = canvasTex(64, 64, (g) => { g.fillStyle = '#ffd84a'; g.fillRect(0, 0, 64, 64); g.fillStyle = '#ffb020'; g.fillRect(0, 0, 16, 64); g.fillRect(32, 0, 16, 64); }, true);
  const ct = cup.clone(); ct.needsUpdate = true; ct.repeat.set(8, 1);
  column(12, 0, 12, 2.3, 2.6, lam('#ffffff', { map: ct }), { rt: 1.15, seg: 28, cr: 2.5 });
  const fr = mesh(new THREE.SphereGeometry(2.6, 24, 10, 0, Math.PI * 2, 0, Math.PI / 2), lam('#ffb3dc'), 12, 2.6, 12); fr.scale.y = 0.32;
  solidCyl(12, 12, 2.5, 3.3, 0);
  ball(13.2, 3.55, 11.4, 0.32, '#e8203a', 1, 1, 1, 10);
  for (let k = 0; k < 14; k++) { const t = R() * 6.3, d = R() * 2.1; ball(12 + Math.sin(t) * d, 3.28, 12 + Math.cos(t) * d, 0.09, ['#ff4d6d', '#3ee8ff', '#ffd84a', '#8dff5a', '#ffffff'][k % 5], 2, 0.6, 0.6, 5); }
  for (const [x, z, top, c] of [[8.2, 8.8, 0.85, '#3ee8ff'], [7.8, 11.4, 1.7, '#ff4d6d'], [8.8, 13.9, 2.55, '#8dff5a']]) block(x, 0, z, 1.3, top, 1.3, c);
  placeEgg('muffins', 12, 3.3, 12);
  // Polkagrisägget: bakom en stor glass
  const ice = (x, z) => { const cn = mesh(new THREE.ConeGeometry(1.4, 3.4, 16), lam('#e8b07a'), x, 1.7, z); cn.rotation.x = Math.PI; ball(x, 3.7, z, 1.45, '#ffe9f2', 1, 0.9, 1, 16); ball(x, 4.7, z, 1.1, '#9fe8c2', 1, 0.9, 1, 14); ball(x, 5.6, z, 0.3, '#e8203a', 1, 1, 1, 8); solidCyl(x, z, 1.2, 5.0, 0); };
  ice(-4, 18.5);
  placeEgg('polka', -4, 0, 21.4);
  // polkagrisar som pynt
  for (const [x, z] of [[-8, -12], [3, 4], [-17, -14], [20, -2], [0, 13]]) { column(x, 0, z, 0.2, 2.6, lam('#ffffff', { map: stripeTex }), { seg: 10 }); const hk = mesh(new THREE.TorusGeometry(0.5, 0.2, 8, 14, Math.PI), lam('#ffffff', { map: stripeTex }), x - 0.5, 2.6, z); }
  for (let i = 0; i < 40; i++) { const t = R() * 6.3, d = 4 + R() * 19, x = Math.sin(t) * d, z = Math.cos(t) * d; if (Math.hypot(x - 12, z - 12) < 4 || Math.hypot(x + 11, z) < 5 || Math.hypot(x - 10, z + 5) < 4.5 || Math.abs(x) < 2.5 && z < -14) continue; ball(x, 0.2, z, 0.35, ['#ff4d6d', '#ffd84a', '#3ee8ff', '#8dff5a', '#a77bff'][i % 5], 1, 0.7, 1, 8); }
  endIsland();
}

function buildGard() {
  const I = ISLE.gard; startIsland(I);
  islandBase(I, GROUND.farm, '#a0714a'); rim(I, 'fence'); islandPortal(I);
  const red = '#c9343c', wood = '#c98d52', white = '#ffffff';
  // Ladan (dörren mot väster), höskulle längst in
  const bx = 12, bz = 6, hw = 4.5, hd = 3.5, wh = 4;
  block(bx + hw, 0, bz, 0.3, wh, hd * 2 + 0.3, red);
  block(bx, 0, bz - hd, hw * 2, wh, 0.3, red); block(bx, 0, bz + hd, hw * 2, wh, 0.3, red);
  block(bx - hw, 0, bz - 2.4, 0.3, wh, 2.4, red); block(bx - hw, 0, bz + 2.4, 0.3, wh, 2.4, red); block(bx - hw, 2.6, bz, 0.3, wh - 2.6, 2.4, red);
  for (const sz of [-1, 1]) { const rf = mesh(new THREE.BoxGeometry(hw * 2 + 0.8, 0.25, hd + 0.9), lam('#7a3a2a'), bx, wh + 1.05, bz + sz * (hd / 2 + 0.05)); rf.rotation.x = sz * 0.55; }
  const gab = new THREE.Shape(); gab.moveTo(-hd, 0); gab.lineTo(hd, 0); gab.lineTo(0, 2.0); gab.closePath();
  for (const ex of [-hw, hw]) { const gm = mesh(new THREE.ShapeGeometry(gab), lam(red, { side: THREE.DoubleSide }), bx + ex, wh, bz, Math.PI / 2); }
  block(bx - hw - 0.02, 0.2, bz - 1.2, 0.08, 2.2, 0.12, white, { solid: false }); block(bx - hw - 0.02, 0.2, bz + 1.2, 0.08, 2.2, 0.12, white, { solid: false });
  solidBox(bx, wh, bz, hw * 2, 0.3, hd * 2);                                // taket (kameran stannar under det)
  block(bx + 3.0, 0, bz, 2.7, 2.4, 6.4, '#e0b44a');                     // höskullen
  block(bx + 0.6, 0, bz + 2.2, 1.4, 0.8, 1.6, '#f2c94c'); block(bx + 1.0, 0, bz + 0.6, 1.3, 1.6, 1.4, '#f2c94c');
  placeEgg('lada', bx + 3.2, 2.4, bz - 1.4);
  // Hönshuset (öppet mot öster)
  const hx = -12, hz = 8;
  block(hx - 1.9, 0, hz, 0.25, 2.6, 3.2, wood); block(hx, 0, hz - 1.5, 4, 2.6, 0.25, wood); block(hx, 0, hz + 1.5, 4, 2.6, 0.25, wood);
  block(hx + 1.9, 0, hz - 1.1, 0.25, 2.6, 0.8, wood); block(hx + 1.9, 0, hz + 1.1, 0.25, 2.6, 0.8, wood); block(hx + 1.9, 2.0, hz, 0.25, 0.6, 1.4, wood);
  solidBox(hx, 2.6, hz, 4, 0.3, 3.2);
  const hr = mesh(new THREE.BoxGeometry(4.6, 0.22, 3.8), lam(red), hx, 2.85, hz); hr.rotation.z = 0.18;
  const nest = mesh(new THREE.TorusGeometry(0.5, 0.18, 8, 14), lam('#e0b44a'), hx - 0.9, 0.18, hz); nest.rotation.x = Math.PI / 2;
  placeEgg('hona', hx - 0.9, 0.05, hz);
  // Höbalar i en pyramid
  const hay = '#f2c94c';
  block(-14, 0, -5, 4.8, 0.9, 3.6, hay); block(-14, 0.9, -5, 3.2, 0.9, 2.4, '#e8bd3e'); block(-14, 1.8, -5, 1.6, 0.9, 1.4, hay);
  placeEgg('ho', -14, 2.7, -5);
  // Grönsakslandet
  for (let rI = 0; rI < 4; rI++) { block(4 + rI * 1.6, 0, -6, 1.0, 0.18, 6, '#8a5a32', { solid: false }); for (let k = 0; k < 6; k++) { const x = 4 + rI * 1.6, z = -8.5 + k; if (rI === 2 && k === 3) continue; cone(x, 0.1, z, 0.13, 0.3, '#ff8a2a', 6); for (const t of [-0.4, 0, 0.4]) { const lf = cone(x + t * 0.2, 0.3, z, 0.05, 0.45, '#3bb143', 4); lf.rotation.z = t; } } }
  placeEgg('morot', 4 + 3.2, 0.1, -5.5);
  // Fågelskrämma
  column(0, 0, 13, 0.1, 2.6, wood, { seg: 6 }); block(0, 1.7, 13, 2.0, 0.12, 0.12, wood, { solid: false }); ball(0, 2.75, 13, 0.32, '#f2d59a', 1, 1, 1, 10); cone(0, 3.0, 13, 0.5, 0.5, '#8a5a32', 10); block(0, 1.1, 13, 0.7, 0.8, 0.4, '#3f6dff', { solid: false });
  // höns som pickar
  for (const [x, z] of [[-6, 3], [-8, 6], [-4, 9], [2, 2], [-9, 0]]) {
    const g = new THREE.Group(), [wx, wz] = W(x, z); g.position.set(wx, 0, wz); scene.add(g);
    const b = new THREE.Mesh(new THREE.SphereGeometry(0.32, 12, 8), lam('#ffffff')); b.position.y = 0.42; b.scale.set(1, 0.85, 1.25); g.add(b);
    const hd2 = new THREE.Mesh(new THREE.SphereGeometry(0.17, 10, 8), lam('#ffffff')); hd2.position.set(0, 0.72, 0.3); g.add(hd2);
    const cm = new THREE.Mesh(new THREE.SphereGeometry(0.07, 6, 6), lam('#e8203a')); cm.position.set(0, 0.89, 0.3); cm.scale.set(0.6, 1, 1.4); g.add(cm);
    const bk = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.12, 6), lam('#ffa024')); bk.position.set(0, 0.7, 0.48); bk.rotation.x = Math.PI / 2; g.add(bk);
    for (const lx of [-0.1, 0.1]) { const l = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.26, 4), lam('#ffa024')); l.position.set(lx, 0.13, 0); g.add(l); }
    anims.push({ kind: 'hen', g, hd: hd2, x: wx, z: wz, t: Math.random() * 6, yaw: Math.random() * 6 });
  }
  for (const [x, z, h] of [[-18, -12, 3.2], [18, -10, 3.0], [-6, 20, 3.4], [18, 17, 3.0]]) tree(x, z, h, '#5cbf3f');
  endIsland();
}

function buildSno() {
  const I = ISLE.sno; startIsland(I);
  islandBase(I, GROUND.snow, '#a8c4e0'); rim(I, 'snow'); islandPortal(I);
  const pine = (x, z, s = 1) => { column(x, 0, z, 0.3 * s, 1.2 * s, '#7a5230', { seg: 6, cr: 0.4 }); for (let k = 0; k < 3; k++) { cone(x, (1.0 + k * 1.0) * s, z, (1.8 - k * 0.45) * s, 1.7 * s, '#2f7a4a', 10); cone(x, (1.55 + k * 1.0) * s, z, (0.9 - k * 0.22) * s, 0.7 * s, '#ffffff', 10); } };
  for (const [x, z, s] of [[-16, -8, 1.1], [17, -6, 1.0], [-5, 20, 1.2], [19, 13, 1.0], [-20, 6, 0.9], [8, -12, 0.8]]) pine(x, z, s);
  // Snögubben – ägget gömt bakom
  const snowman = (x, z) => { ball(x, 0.9, z, 1.2, '#ffffff', 1, 1, 1, 16); ball(x, 2.4, z, 0.85, '#ffffff', 1, 1, 1, 14); ball(x, 3.5, z, 0.6, '#ffffff', 1, 1, 1, 14); const n = cone(x, 3.4, z - 0.55, 0.1, 0.5, '#ff8a2a', 8); n.rotation.x = -Math.PI / 2; ball(x - 0.2, 3.65, z - 0.5, 0.07, '#222', 1, 1, 1, 6); ball(x + 0.2, 3.65, z - 0.5, 0.07, '#222', 1, 1, 1, 6); column(x, 4.0, z, 0.45, 0.12, '#2a2f45', { solid: false }); column(x, 4.1, z, 0.32, 0.6, '#2a2f45', { solid: false }); block(x, 2.75, z, 1.9, 0.25, 0.25, '#e8203a', { solid: false }); solidCyl(x, z, 1.2, 4.1); };
  snowman(-9, -8);
  placeEgg('flinga', -9, 0, -6.2);
  // Igloo med ingång mot spelaren
  const ix = 10, iz = 6, ir = 3.2;
  const igloTex = canvasTex(256, 128, (g) => { g.fillStyle = '#f4fbff'; g.fillRect(0, 0, 256, 128); g.strokeStyle = '#b9d3ea'; g.lineWidth = 3; for (let j = 0; j < 6; j++) { g.beginPath(); g.moveTo(0, j * 22); g.lineTo(256, j * 22); g.stroke(); for (let i = 0; i < 9; i++) { const x = i * 32 + (j % 2) * 16; g.beginPath(); g.moveTo(x, j * 22); g.lineTo(x, j * 22 + 22); g.stroke(); } } }, true);
  const dome = mesh(new THREE.SphereGeometry(ir, 28, 12, 0, Math.PI * 2, 0, Math.PI / 2), lam('#ffffff', { map: igloTex, side: THREE.DoubleSide }), ix, 0, iz);
  for (let k = 0; k < 14; k++) { const t = k / 14 * Math.PI * 2; if (Math.abs(Math.atan2(Math.sin(t + Math.PI), Math.cos(t + Math.PI))) < 0.45) continue; solidBox(ix + Math.sin(t) * (ir - 0.1), 0, iz + Math.cos(t) * (ir - 0.1), 1.5, 2.6, 0.3, t); }
  solidBox(ix, 2.7, iz, 4.6, 0.5, 4.6);
  const tun = mesh(new THREE.CylinderGeometry(1.15, 1.15, 2.2, 16, 1, true, -Math.PI / 2, Math.PI), lam('#ffffff', { map: igloTex, side: THREE.DoubleSide }), ix, 0, iz - ir - 0.3); tun.rotation.x = -Math.PI / 2;
  solidBox(ix - 1.2, 0, iz - ir - 0.3, 0.2, 1.6, 2.2); solidBox(ix + 1.2, 0, iz - ir - 0.3, 0.2, 1.6, 2.2);
  placeEgg('iglo', ix, 0, iz + 0.8);
  // Isblock som trappa
  const iceM = new THREE.MeshPhongMaterial({ color: '#aee6ff', transparent: true, opacity: 0.8, shininess: 100, specular: '#ffffff' });
  for (const [x, z, top, s] of [[-8, 9, 0.9, 1.8], [-10.3, 10.8, 1.8, 1.7], [-12.8, 9.7, 2.7, 1.7], [-14.4, 12.1, 3.6, 1.7], [-12.5, 14.4, 4.5, 2.2]]) block(x, 0, z, s, top, s, iceM);
  placeEgg('is', -12.5, 4.5, 14.4);
  // Snökulle med pingviner
  column(8, 0, 16, 3.6, 1.0, '#ffffff', { rt: 0.92, seg: 26 });
  const hill = mesh(new THREE.SphereGeometry(3.3, 24, 8, 0, Math.PI * 2, 0, Math.PI / 2), lam('#ffffff'), 8, 1.0, 16); hill.scale.y = 0.12;
  solidCyl(8, 16, 3.4, 1.25, 0);
  for (const [x, z] of [[6.8, 15], [9.2, 15.4], [8.4, 17.6]]) {
    const g = new THREE.Group(), [wx, wz] = W(x, z); g.position.set(wx, 1.25, wz); g.rotation.y = F.a + Math.PI + (x - 8) * 0.3; scene.add(g);
    const b = new THREE.Mesh(new THREE.SphereGeometry(0.4, 12, 10), lam('#22243a')); b.position.y = 0.5; b.scale.set(1, 1.35, 0.95); g.add(b);
    const bl = new THREE.Mesh(new THREE.SphereGeometry(0.33, 12, 10), lam('#ffffff')); bl.position.set(0, 0.46, 0.13); bl.scale.set(1, 1.3, 0.9); g.add(bl);
    const bk = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.2, 6), lam('#ffa024')); bk.position.set(0, 0.85, 0.42); bk.rotation.x = Math.PI / 2; g.add(bk);
    for (const ex of [-0.12, 0.12]) { const e = new THREE.Mesh(new THREE.SphereGeometry(0.05, 6, 6), lam('#ffffff')); e.position.set(ex, 0.97, 0.33); g.add(e); }
    anims.push({ kind: 'penguin', g, t: Math.random() * 6, base: g.rotation.y });
  }
  placeEgg('pingvin', 8, 1.25, 15.9);
  endIsland();
}

function buildMoln() {
  const I = ISLE.moln; startIsland(I);
  islandBase(I, GROUND.cloud, '#ffffff'); rim(I, 'cloud'); islandPortal(I);
  for (let k = 0; k < 14; k++) { const t = k / 14 * Math.PI * 2; ball(Math.sin(t) * I.R * 0.6, -3 - (k % 3), Math.cos(t) * I.R * 0.6, 6, '#ffffff', 1, 0.6, 1, 12); }
  // Regnbågsbron: upp och ner, med en guldkruka i slutet
  const rb = canvasTex(128, 16, (g) => { ['#ff4d6d', '#ff9a3d', '#ffd84a', '#5ad04a', '#3ee8ff', '#3f6dff', '#8a5cff'].forEach((c, i) => { g.fillStyle = c; g.fillRect(i * 128 / 7, 0, 128 / 7 + 1, 16); }); });
  const rbm = lam('#ffffff', { map: rb });
  for (let i = 0; i < 18; i++) { const up = i < 8 ? i + 1 : i < 10 ? 8 : 17 - i; const top = up * 0.4; block(-15, 0, -9 + i, 3, Math.max(0.1, top), 1.02, rbm); }
  column(-15, 0, 10.6, 0.9, 0.9, '#2a2f45', { rt: 1.15, seg: 16 }); for (let k = 0; k < 7; k++) ball(-15 + Math.sin(k) * 0.45, 0.95, 10.6 + Math.cos(k) * 0.45, 0.2, '#ffd84a', 1, 0.5, 1, 6);
  placeEgg('regnbage', -15, 0.9, 10.6);
  // Molntrappan i en spiral
  const cx = 5, cz = 4, steps = 10;
  for (let i = 0; i < steps; i++) {
    const t = i / steps * Math.PI * 2 * 1.05 - 2.2, r = i === steps - 1 ? 1.9 : 1.35, x = cx + Math.sin(t) * 6, z = cz + Math.cos(t) * 6, top = 0.9 * (i + 1);
    column(x, top - 0.45, z, r, 0.45, i === steps - 1 ? '#fff6c9' : '#ffffff', { seg: 18 });
    for (let k = 0; k < 4; k++) { const u = k / 4 * Math.PI * 2 + i; ball(x + Math.sin(u) * r * 0.75, top - 0.4, z + Math.cos(u) * r * 0.75, r * 0.45, '#ffffff', 1, 0.55, 1, 8); }
    if (i === 4) placeEgg('moln', x, top, z);
    if (i === steps - 1) placeEgg('stjarna', x, top, z);
  }
  column(cx, 0, cz, 0.6, 9.5, lam('#ffffff', { map: rb }), { seg: 14 });
  ball(cx, 10.2, cz, 0.8, '#ffd84a', 1, 1, 1, 12);
  // Åskmolnet – ägget bakom
  for (const [dx, dy, dz, r] of [[0, 1.4, 0, 2.2], [1.8, 1.1, 0.4, 1.6], [-1.8, 1.0, 0.3, 1.6], [0.6, 2.6, 0, 1.5]]) ball(14 + dx, dy, -4 + dz, r, '#7d7f9a', 1, 0.8, 1, 12);
  solidCyl(14, -4, 2.4, 3.2, 0);
  const bolt = new THREE.Shape(); bolt.moveTo(0, 0); bolt.lineTo(0.5, 0.9); bolt.lineTo(0.15, 0.9); bolt.lineTo(0.6, 1.9); bolt.lineTo(-0.15, 0.75); bolt.lineTo(0.2, 0.75); bolt.closePath();
  const bm = mesh(new THREE.ExtrudeGeometry(bolt, { depth: 0.12, bevelEnabled: false }), lam('#ffe14a', { emissive: '#6a5a00' }), 13.4, 0.1, -6.3); bm.scale.setScalar(1.3);
  placeEgg('blixt', 14.6, 0, -0.6);
  for (let k = 0; k < 10; k++) { const t = R() * 6.3, d = 8 + R() * 14, x = Math.sin(t) * d, z = Math.cos(t) * d; if (Math.hypot(x - cx, z - cz) < 8.5 || Math.abs(x + 15) < 3 || Math.hypot(x - 14, z + 4) < 4.5 || Math.abs(x) < 3 && z < -14) continue; ball(x, 0.4, z, 1.0, '#ffffff', 1.4, 0.6, 1.2, 10); }
  endIsland();
}

function buildRymd() {
  const I = ISLE.rymd; startIsland(I);
  islandBase(I, GROUND.moon, '#5d4f8f'); rim(I, 'space'); islandPortal(I);
  // Raketen med trappa upp till dörren
  const rocketTex = canvasTex(128, 128, (g) => { g.fillStyle = '#ffffff'; g.fillRect(0, 0, 128, 128); g.fillStyle = '#e8383d'; g.fillRect(0, 10, 128, 12); g.fillRect(0, 106, 128, 12); }, true);
  const rx = 10, rz = 8;
  column(rx, 0.6, rz, 1.6, 6.4, lam('#ffffff', { map: rocketTex }), { seg: 24 });
  cone(rx, 7.0, rz, 1.6, 2.6, '#e8383d', 24);
  for (let k = 0; k < 3; k++) { const t = k / 3 * Math.PI * 2 + 0.5; block(rx + Math.sin(t) * 1.8, 0, rz + Math.cos(t) * 1.8, 0.2, 2.2, 1.2, '#e8383d', { yaw: t, solid: false }); }
  column(rx, 0, rz, 1.2, 0.6, '#6d7a8c', { seg: 12 });
  const win = mesh(new THREE.CircleGeometry(0.5, 20), lam('#3fb4ff', { emissive: '#103a6a' }), rx, 5.2, rz - 1.62, Math.PI);
  block(rx, 2.0, rz - 1.58, 1.3, 2.1, 0.08, '#2a2f45', { solid: false });
  block(rx, 0, rz - 2.7, 2.2, 2.0, 2.2, '#8f99aa');                                         // plattform vid dörren
  for (let k = 0; k < 4; k++) block(rx, 0, rz - 4.25 - k * 0.9, 1.6, 2.0 - (k + 1) * 0.44, 0.9, '#b6c0cf');
  placeEgg('raket', rx, 2.0, rz - 2.6);
  // Kratern
  const cr = mesh(new THREE.TorusGeometry(3.0, 0.4, 8, 28), lam('#9e97ba'), -10, 0.05, -4); cr.rotation.x = Math.PI / 2;
  const cf = mesh(new THREE.CircleGeometry(2.8, 28), lam('#8e88a6'), -10, 0.03, -4); cf.rotation.x = -Math.PI / 2;
  placeEgg('mane', -10, 0, -4);
  // UFO:t och stenen man hoppar från
  column(-4.4, 0, 7.8, 0.95, 1.4, '#8f88ae', { rt: 0.8, seg: 9 });
  const ufo = new THREE.Group(), [ux, uz] = W(-8.2, 12.4); ufo.position.set(ux, 3.9, uz); scene.add(ufo);
  const disc = new THREE.Mesh(new THREE.CylinderGeometry(2.7, 1.4, 0.55, 28), lam('#c9d2de')); disc.position.y = -0.28; ufo.add(disc);
  const domeU = new THREE.Mesh(new THREE.SphereGeometry(1.0, 18, 10, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshPhongMaterial({ color: '#7dff6a', transparent: true, opacity: 0.55 })); domeU.position.set(1.2, 0, 0); ufo.add(domeU);
  for (let k = 0; k < 10; k++) { const t = k / 10 * Math.PI * 2, l = new THREE.Mesh(new THREE.SphereGeometry(0.13, 8, 6), lam(k % 2 ? '#ffd84a' : '#3ee8ff', { emissive: k % 2 ? '#665000' : '#0a5a66' })); l.position.set(Math.sin(t) * 2.5, -0.3, Math.cos(t) * 2.5); ufo.add(l); }
  const beam = new THREE.Mesh(new THREE.ConeGeometry(1.6, 3.4, 20, 1, true), new THREE.MeshBasicMaterial({ color: '#b8ffb0', transparent: true, opacity: 0.18, depthWrite: false, side: THREE.DoubleSide })); beam.position.y = -2.2; ufo.add(beam);
  solidCyl(-8.2, 12.4, 2.6, 3.9, 3.6);
  anims.push({ kind: 'ufo', g: ufo, t: 0 });
  placeEgg('ufo', -9.0, 3.9, 13.0);
  // Roboten som håller ägget
  const rbx = 12, rbz = -8;
  block(rbx, 0, rbz, 1.4, 0.3, 0.9, '#6d7a8c'); block(rbx - 0.35, 0.3, rbz, 0.4, 0.9, 0.5, '#9aa6b8', { solid: false }); block(rbx + 0.35, 0.3, rbz, 0.4, 0.9, 0.5, '#9aa6b8', { solid: false });
  block(rbx, 1.2, rbz, 1.6, 1.4, 1.0, '#c9d2de'); block(rbx, 1.55, rbz - 0.52, 0.6, 0.5, 0.06, '#3ee8ff', { solid: false });
  block(rbx, 2.65, rbz, 1.0, 0.8, 0.8, '#c9d2de', { solid: false }); ball(rbx - 0.22, 3.1, rbz - 0.42, 0.12, '#ff5a5a', 1, 1, 0.5, 8); ball(rbx + 0.22, 3.1, rbz - 0.42, 0.12, '#ff5a5a', 1, 1, 0.5, 8);
  column(rbx, 3.45, rbz, 0.04, 0.5, '#6d7a8c', { solid: false, seg: 4 }); ball(rbx, 4.0, rbz, 0.12, '#ffd84a', 1, 1, 1, 8);
  for (const ex of [-1, 1]) { const arm = block(rbx + ex * 0.55, 1.95, rbz - 0.65, 0.25, 0.25, 1.1, '#9aa6b8', { solid: false }); }
  solidCyl(rbx, rbz, 0.8, 2.6, 0);
  placeEgg('robot', rbx, 2.15, rbz - 1.35);
  // planeter och stenar
  for (const [x, z, r] of [[-16, -10, 1.0], [18, 6, 1.3], [-18, 10, 0.8], [3, 18, 1.1], [-3, -12, 0.7]]) column(x, 0, z, r, r * 1.1, '#8f88ae', { rt: 0.7, seg: 8 });
  for (const [x, y, z, r, c] of [[-14, 9, 6, 1.4, '#ff8fd0'], [16, 11, -4, 1.8, '#ffd84a'], [2, 13, 18, 1.0, '#3ee8ff']]) { ball(x, y, z, r, c, 1, 1, 1, 16); const rg = mesh(new THREE.TorusGeometry(r * 1.6, 0.1, 6, 30), lam('#ffffff'), x, y, z); rg.rotation.x = 1.2; }
  endIsland();
}

function buildSky() {
  const g = new THREE.Group(); scene.add(g);
  const m = new THREE.SpriteMaterial({ map: cloudTex, transparent: true, depthWrite: false, fog: true, opacity: 0.95 });
  const r = seeded(77);
  for (let i = 0; i < 70; i++) { const s = new THREE.Sprite(m); const t = r() * 6.3, d = 30 + r() * 320; s.position.set(Math.sin(t) * d, -28 - r() * 22, Math.cos(t) * d); const k = 40 + r() * 50; s.scale.set(k, k * 0.5, 1); g.add(s); }
  for (let i = 0; i < 26; i++) { const s = new THREE.Sprite(m); const t = r() * 6.3, d = 60 + r() * 260; s.position.set(Math.sin(t) * d, 10 + r() * 40, Math.cos(t) * d); const k = 18 + r() * 24; s.scale.set(k, k * 0.5, 1); g.add(s); }
}

/* ---------- Gubben ---------- */
const FALLBACK = { skin: '#f6b694', hair: 'kort', hairColor: '#6a4026', eyes: '#2f6db5', mouth: 'glad', extra: 'inga' };
const look = player ? { ...FALLBACK, ...player.look } : FALLBACK;
const P = { x: 0, y: 0, z: 0, vx: 0, vz: 0, vy: 0, grounded: true, on: null, heading: 0, coyote: 0 };
let ch = null, anim = null, lastMoving = false, isl = ISLE.hub;
function playAnim(name, fade, restart = false) { if (!ch || (anim === name && !restart)) return; anim = name; ch.play(name, fade); }
const blob = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 1.1), new THREE.MeshBasicMaterial({ map: blobTex, transparent: true, depthWrite: false }));
blob.rotation.x = -Math.PI / 2; scene.add(blob);

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
function giveCoins(n) {
  if (!player) return;
  Save.addCoins(player.id, n); showCoins();
  const c = $('pcoins'); c.classList.remove('bump'); void c.offsetWidth; c.classList.add('bump');
  sCoin();
}
let toastTm = 0;
function toast(t, ms = 2600) { const el = $('toast'); el.textContent = t; el.classList.add('show'); clearTimeout(toastTm); toastTm = setTimeout(() => el.classList.remove('show'), ms); }

/* ---------- Hitta ägg ---------- */
let foundTm = 0;
function showFound(e, gold) {
  drawEgg($('foundEgg'), e, true);
  $('foundName').textContent = e.name;
  $('foundGold').textContent = `+${gold} 🪙`;
  $('found').classList.add('show');
  clearTimeout(foundTm); foundTm = setTimeout(() => $('found').classList.remove('show'), 3200);
}
function collect(w) {
  const e = w.e;
  if (e.gold) { if (foundCount() < EGGS.length || prog().grand) return; }
  else if (isFound(e.id)) return;
  scene.remove(w.m); scene.remove(w.glow); w.gone = true;
  sparkle(w.m.position.x, w.m.position.y, w.m.position.z, 26, e.gold ? '#ffd84a' : '#ffffff');
  sEgg();
  if (e.gold) {
    saveProg(s => { s.grand = Date.now(); });
    giveCoins(GOLD_GRAND); showFound(e, GOLD_GRAND); say('Du hittade Guldägget! Du är bäst på äggjakt!');
    for (let i = 0; i < 4; i++) setTimeout(() => sparkle(P.x + (Math.random() - 0.5) * 6, P.y + 3, P.z + (Math.random() - 0.5) * 6, 30, ['#ff5ccf', '#3ee8ff', '#ffd84a', '#8dff5a'][i]), 300 + i * 300);
    setTimeout(() => { $('winText').textContent = `Du hittade alla ${EGGS.length} ägg och Guldägget! Du fick ${GOLD_GRAND} guldmynt 🪙`; $('winBox').classList.add('show'); }, 2600);
    updateHud(); return;
  }
  saveProg(s => { s.found[e.id] = Date.now(); });
  giveCoins(GOLD_EGG); showFound(e, GOLD_EGG); say('Du hittade ' + e.name + '!');
  for (const p of pedestals) if (p.e === e) p.m.material = e.mat;
  const zn = ZONES.find(z => z.id === e.z);
  if (zoneCount(e.z) === 4 && !prog().sets[e.z]) {
    saveProg(s => { s.sets[e.z] = Date.now(); });
    if (player) Save.addCoins(player.id, GOLD_SET);                 // guldet sparas direkt, firandet kommer strax efter
    setTimeout(() => { showCoins(); const c = $('pcoins'); c.classList.remove('bump'); void c.offsetWidth; c.classList.add('bump'); sCoin(); toast(`${zn.ic} Alla ägg i ${zn.name}! +${GOLD_SET} 🪙`, 3600); sSet(); }, 1600);
  }
  if (foundCount() === EGGS.length) setTimeout(() => { toast('🏆 Alla ägg! Guldägget har vaknat – högst upp på torget!', 5000); openGrand(); }, 3400);
  updateHud();
}
function openGrand() { if (grandDome) grandDome.visible = false; }
function updateHud() {
  const n = foundCount();
  $('eggCount').textContent = `${n}/${EGGS.length}`;
  const b = $('eggBtn'); b.classList.remove('bump'); void b.offsetWidth; b.classList.add('bump');
  for (const zn of ZONES) { const J = ISLE[zn.id], c = zoneCount(zn.id); signCanvas(J.hubPortal.sc, [zn.ic + ' ' + zn.name, c === 4 ? '⭐ 4/4 ⭐' : `🥚 ${c}/4`], zn.col); J.hubPortal.st.needsUpdate = true; }
  if (n === EGGS.length && grandDome) grandDome.visible = false;
}

/* ---------- Korgen ---------- */
function openBasket() {
  const box = $('zones'); box.innerHTML = '';
  const rows = [...ZONES.map(z => ({ ...z, eggs: EGGS.filter(e => e.z === z.id) })), { id: 'hub', ic: '🏆', name: 'Torget', eggs: [GRAND] }];
  for (const z of rows) {
    const row = document.createElement('div'); row.className = 'zrow';
    const n = z.eggs.filter(e => e.gold ? prog().grand : isFound(e.id)).length, done = n === z.eggs.length;
    row.innerHTML = `<div class="zn${done ? ' done' : ''}">${z.ic} ${z.name}<small>${done ? '⭐ Klart!' : n + '/' + z.eggs.length}</small></div><div class="zeggs"></div>`;
    for (const e of z.eggs) {
      const f = e.gold ? !!prog().grand : isFound(e.id);
      const b = document.createElement('button'); const c = document.createElement('canvas'); c.width = 108; c.height = 136; drawEgg(c, e, f); b.appendChild(c);
      b.onclick = () => {
        box.querySelectorAll('.sel').forEach(x => x.classList.remove('sel')); b.classList.add('sel');
        $('eggInfo').innerHTML = f ? `<b>${e.name}</b> – du har hittat det! 🎉` : `<b>???</b> – ${e.hint}`;
        say(f ? e.name : e.hint);
      };
      row.querySelector('.zeggs').appendChild(b);
    }
    box.appendChild(row);
  }
  $('eggInfo').textContent = 'Tryck på ett ägg!';
  $('basket').classList.add('show');
}
$('eggBtn').onclick = openBasket;
$('bClose').onclick = () => $('basket').classList.remove('show');
$('bX').onclick = () => $('basket').classList.remove('show');
$('basket').addEventListener('click', e => { if (e.target.id === 'basket') $('basket').classList.remove('show'); });

/* ---------- Kamera och styrning ---------- */
let yaw = Math.PI, pitch = 0.3, dist = 7, camSnap = true;
const camTarget = new THREE.Vector3(), camPos = new THREE.Vector3();
const keys = {};
let started = false;
addEventListener('keydown', e => {
  keys[e.code] = true;
  if (e.code === 'Space') { e.preventDefault(); if (!e.repeat) jump(); }
  if (e.code === 'KeyH') $('help').classList.toggle('show');
  if (e.code === 'KeyK' || e.code === 'Tab') { e.preventDefault(); if ($('basket').classList.contains('show')) $('basket').classList.remove('show'); else openBasket(); }
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
const endTouch = e => {
  for (const t of e.changedTouches) {
    if (t.identifier === stick.id) releaseStick();
    if (t.identifier === lookId) lookId = null;
  }
};
canvas.addEventListener('touchend', endTouch);
canvas.addEventListener('touchcancel', endTouch);
$('jumpBtn').addEventListener('touchstart', e => { e.preventDefault(); jump(); }, { passive: false });
$('jumpBtn').addEventListener('click', jump);
let jumpBuf = 0;
function jump() {
  if (!started) return;
  if (P.grounded || P.coyote > 0) doJump(); else jumpBuf = 0.15;
}
function doJump() {
  P.vy = JUMP; P.grounded = false; P.coyote = 0; P.on = null; jumpBuf = 0;
  playAnim('jump', 0.08, true); sJump();
}

/* ---------- Förflyttning ---------- */
let portalCool = 0;
function goTo(I, sp, flash = true) {
  P.x = sp.x; P.z = sp.z; P.y = sp.y || 0; P.vx = P.vz = P.vy = 0; P.grounded = true; P.on = null; P.coyote = 0;
  P.heading = sp.heading; yaw = sp.heading + Math.PI; pitch = 0.3; camSnap = true; visY = P.y; isl = I;
  portalCool = 1.0;
  playAnim('idle', 0);
  if (flash) { const f = $('flash'); f.classList.add('on'); requestAnimationFrame(() => requestAnimationFrame(() => f.classList.remove('on'))); }
}
function enterPortal(p) {
  if (p.target === 'hub') { const from = ISLE[p.island]; goTo(ISLE.hub, from.hubSpawn); toast('🥚 Äggtorget'); }
  else { const I = ISLE[p.target]; goTo(I, I.spawn); const c = zoneCount(I.id); toast(`${I.ic} ${I.name} – ${c === 4 ? 'alla ägg hittade! ⭐' : (4 - c) + ' ägg kvar att hitta'}`, 3000); if (c < 4) say(I.name); }
  sPortal();
}

/* ---------- Spelloopen ---------- */
const fwd = new THREE.Vector3(), right = new THREE.Vector3(), move = new THREE.Vector3();
let time = 0;
function update(dt) {
  time += dt;
  animateWorld(dt);
  if (!started) { animate(dt, false); return; }
  portalCool = Math.max(0, portalCool - dt);

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
  const moving = mag > 0.08;
  let tvx = 0, tvz = 0;
  if (moving) {
    move.normalize();
    const want = Math.atan2(move.x, move.z);
    let d = want - P.heading; d = Math.atan2(Math.sin(d), Math.cos(d));
    if (followCam && iz < 0) P.heading = yaw + Math.PI; else P.heading += d * Math.min(1, dt * 12);
    if (stick.id !== null && lookId === null) { let dy = (P.heading + Math.PI) - yaw; dy = Math.atan2(Math.sin(dy), Math.cos(dy)); yaw += dy * Math.min(1, dt * 1.6); }
    const sp = (walking ? WALK : RUN) * (stick.id !== null ? Math.max(0.45, mag) : 1);
    tvx = move.x * sp; tvz = move.z * sp;
  }
  const acc = P.grounded ? 14 : 6;
  if (P.grounded || moving) { P.vx += (tvx - P.vx) * Math.min(1, acc * dt); P.vz += (tvz - P.vz) * Math.min(1, acc * dt); }
  if (!P.grounded) { const v = Math.hypot(P.vx, P.vz); if (v > AIR_MAX) { P.vx *= AIR_MAX / v; P.vz *= AIR_MAX / v; } }
  const tol = P.grounded ? STEP : 0.25;
  const steps = Math.max(1, Math.ceil(Math.hypot(P.vx, P.vz) * dt / 0.12));
  for (let i = 0; i < steps; i++) { const [nx, nz] = pushOut(P.x + P.vx * dt / steps, P.z + P.vz * dt / steps, P.y, tol); P.x = nx; P.z = nz; }

  const g = GRAVITY * (isl.grav || 1);
  if (P.grounded) {
    const s = supportAt(P.x, P.z, P.y - 0.5, P.y + STEP);
    if (s) { P.y = s.top; P.on = s; }
    else { P.coyoteOn = P.on; P.grounded = false; P.on = null; P.vy = 0; P.coyote = 0.12; playAnim('jump', 0.2); }
  }
  if (!P.grounded) {
    P.coyote = Math.max(0, P.coyote - dt);
    const y0 = P.y;
    P.vy += g * dt; P.vy = Math.max(P.vy, -40);
    let ny = P.y + P.vy * dt;
    if (P.vy > 0) {
      for (const b of near(P.x, P.z, y0 + HEIGHT - 1, ny + HEIGHT + 1)) {
        if (b.bot < y0 + HEIGHT - 0.05 || b.bot > ny + HEIGHT || !inside(b, P.x, P.z, -0.05)) continue;
        ny = b.bot - HEIGHT; P.vy = 0;
      }
    } else {
      const s = supportAt(P.x, P.z, ny, y0 + 0.25);
      if (s) { ny = s.top; P.grounded = true; P.on = s; P.vy = 0; P.coyote = 0; if (jumpBuf > 0) doJump(); }
    }
    P.y = ny;
    if (jumpBuf > 0) { jumpBuf -= dt; if (P.coyote > 0) doJump(); }
  }
  isl = islandAt(P.x, P.z);
  // ägg man går på
  for (const w of worldEggs) {
    if (w.gone || w.e.island !== isl.id) continue;
    const p = w.m.position;
    if (Math.hypot(p.x - P.x, p.z - P.z) < 1.05 && p.y > P.y - 0.3 && p.y < P.y + 2.1) collect(w);
  }
  // portaler
  if (portalCool <= 0) for (const p of portals) {
    if (p.island !== isl.id) continue;
    const dx = P.x - p.x, dz = P.z - p.z, lx = dx * p.c - dz * p.s, lz = dx * p.s + dz * p.c;
    if (Math.abs(lx) < 1.45 && Math.abs(lz) < 0.5 && P.y < 3) { enterPortal(p); break; }
  }
  if (P.y < -12) { sFall(); goTo(isl, isl.spawn); }
  animate(dt, moving, walking);
}
function animateWorld(dt) {
  for (const w of worldEggs) {
    if (w.gone) continue;
    const locked = w.e.gold && (foundCount() < EGGS.length || prog().grand);
    w.m.rotation.y += dt * (locked ? 0.3 : 1.2);
    w.m.position.y = w.y + 0.62 * EGG_S + 0.12 + Math.sin(time * 2.2 + w.ph) * 0.08;
    w.glow.material.opacity = locked ? 0.25 : 0.55 + Math.sin(time * 4 + w.ph) * 0.3;
    w.glow.scale.setScalar(0.6 + Math.sin(time * 3 + w.ph) * 0.15);
  }
  for (const p of pedestals) p.m.rotation.y += dt * 0.8;
  for (const p of portals) { p.film.material.map.offset.y -= dt * 0.35; p.film.material.map.offset.x = Math.sin(time * 0.7) * 0.1; }
  for (const a of anims) {
    a.t += dt;
    if (a.kind === 'hen') { a.g.rotation.y = a.yaw + Math.sin(a.t * 0.5) * 1.4; a.hd.position.y = 0.72 - Math.max(0, Math.sin(a.t * 3)) * 0.18; }
    else if (a.kind === 'penguin') { a.g.rotation.z = Math.sin(a.t * 4) * 0.12; a.g.rotation.y = a.base + Math.sin(a.t * 0.6) * 0.5; }
    else if (a.kind === 'ufo') { a.g.rotation.y += dt * 0.6; a.g.position.y = 3.9 + Math.sin(a.t * 1.6) * 0.08; }
  }
  if (bunny) {
    bunny.body.position.y = Math.abs(Math.sin(time * 2.6)) * 0.18;
    const d = Math.hypot(P.x - bunny.root.position.x, P.z - bunny.root.position.z);
    const near2 = started && isl.id === 'hub' && d < 6;
    if (near2) {
      bunny.root.rotation.y = Math.atan2(P.x - bunny.root.position.x, P.z - bunny.root.position.z);
      const left = ZONES.map(z => ({ z, n: 4 - zoneCount(z.id) })).filter(o => o.n > 0);
      let t;
      if (!left.length) t = prog().grand ? 'Du har hittat alla ägg! Du är bäst på äggjakt! 🏆' : 'Alla ägg! Klättra upp på molnen till Guldägget högst upp! ✨';
      else { const o = left[Math.floor(time / 6) % left.length]; t = `Hej! Det finns ${o.n} ägg kvar i ${o.z.ic} ${o.z.name}. Gå in i portalen!`; }
      bunnyText(t);
      if (!bunny.near) say(t.replace(/[^\p{L}\p{N} !.,:]/gu, ''));
    }
    bunny.near = near2; bunny.bubble.visible = near2;
  }
}
let visY = 0, camY = null, camD = 7;
function animate(dt, moving, walking) {
  lastMoving = !!moving;
  if (ch) {
    if (P.grounded) playAnim(moving ? 'run' : 'idle', moving ? 0.15 : 0.25);
    ch.mixer.timeScale = moving && walking && P.grounded ? 0.55 : 1;
    visY = P.grounded && Math.abs(P.y - visY) < 0.7 ? visY + (P.y - visY) * Math.min(1, dt * 22) : P.y;
    ch.root.position.set(P.x, visY, P.z);
    ch.root.rotation.y = P.heading;
    ch.update(dt);
  }
  const s = supportAt(P.x, P.z, P.y - 40, P.y + 0.05);
  if (s) { const h = P.y - s.top; blob.visible = true; blob.position.set(P.x, s.top + 0.03, P.z); blob.scale.setScalar(Math.max(0.35, 1 - h * 0.05)); blob.material.opacity = Math.max(0.25, 1 - h * 0.04); }
  else blob.visible = false;
  for (let i = sparks.length - 1; i >= 0; i--) {
    const p = sparks[i]; p.life -= dt; p.vy -= 6 * dt;
    p.s.position.x += p.vx * dt; p.s.position.y += p.vy * dt; p.s.position.z += p.vz * dt; p.s.material.opacity = Math.min(1, p.life * 2);
    if (p.life <= 0) { scene.remove(p.s); if (p.own) p.s.material.dispose(); sparks.splice(i, 1); }
  }
  // kameran
  if (camY === null || camSnap || Math.abs(P.y + 1.5 - camY) > 5) camY = P.y + 1.5;
  else camY += (P.y + 1.5 - camY) * Math.min(1, dt * (P.grounded ? 9 : 5));
  camTarget.set(P.x, camY, P.z);
  const sx = Math.sin(yaw) * Math.cos(pitch), sz = Math.cos(yaw) * Math.cos(pitch), sy = Math.sin(pitch);
  let d = dist;
  for (let st = 0.6; st <= dist; st += 0.2) {
    const x = camTarget.x + sx * st, y = camTarget.y + sy * st, z = camTarget.z + sz * st;
    let hit = y < 0.35 && Math.hypot(x - isl.x, z - isl.z) < isl.R;
    if (!hit) for (const b of near(x, z, y - 0.5, y + 0.5)) { if (y > b.bot - 0.3 && y < b.top + 0.3 && inside(b, x, z, 0.3) && b.top - b.bot < 40) { if (b.top <= 0.01 && y > 0.3) continue; hit = true; break; } }
    if (hit) { d = Math.max(1.2, st - 0.3); break; }
  }
  if (camSnap) camD = d; else camD += (d - camD) * Math.min(1, dt * (d < camD ? 14 : 2.2));
  camPos.set(camTarget.x + sx * camD, camTarget.y + sy * camD, camTarget.z + sz * camD);
  if (camSnap) camera.position.copy(camPos); else camera.position.lerp(camPos, 1 - Math.exp(-dt * 12));
  camSnap = false;
  camera.lookAt(camTarget);
  sun.position.set(P.x + 60, P.y + 120, P.z + 40); sun.target.position.set(P.x, P.y, P.z);
  radar();
}
// Äggradarn: närmaste ägg kvar på ön man är på
let radarKey = '';
function radar() {
  let best = Infinity;
  const grandOpen = foundCount() === EGGS.length && !prog().grand;
  for (const w of worldEggs) {
    if (w.gone || w.e.island !== isl.id) continue;
    if (w.e.gold && !grandOpen) continue;
    const p = w.m.position; best = Math.min(best, Math.hypot(p.x - P.x, p.z - P.z, (p.y - P.y - 1) * 0.6));
  }
  let k, txt, sub, col, sp;
  if (!started) k = 'off';
  else if (best === Infinity) { if (isl.id === 'hub') k = 'off'; else { k = 'done'; txt = 'Alla ägg här! ⭐'; sub = 'Gå till torget'; col = '#5ad04a'; sp = '3s'; } }
  else if (best < 5) { k = 'hot'; txt = 'Jättevarmt! 🔥'; sub = 'Ägget är här nära'; col = '#ff4d6d'; sp = '0.45s'; }
  else if (best < 11) { k = 'warm'; txt = 'Varmt!'; sub = 'Du är nära'; col = '#ff9a3d'; sp = '0.8s'; }
  else if (best < 20) { k = 'mild'; txt = 'Ljummet'; sub = 'Leta vidare'; col = '#ffd84a'; sp = '1.3s'; }
  else { k = 'cold'; txt = 'Kallt ❄️'; sub = 'Långt bort'; col = '#5ec8ff'; sp = '2s'; }
  if (k === radarKey) return;
  radarKey = k;
  const el = $('radar');
  el.classList.toggle('off', k === 'off');
  if (k === 'off') return;
  $('radarText').textContent = txt; $('radarSub').textContent = sub;
  el.style.setProperty('--rc', col); el.style.setProperty('--rs', sp);
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

/* ---------- Start ---------- */
buildSky();
buildHub(); buildBlom(); buildGodis(); buildGard(); buildSno(); buildMoln(); buildRymd();
if (prog().grand || foundCount() < EGGS.length) { if (grandDome) grandDome.visible = !prog().grand; }
else openGrand();
if (prog().grand) { const w = worldEggs.find(w => w.e.gold); if (w) { scene.remove(w.m); scene.remove(w.glow); w.gone = true; } }
updateHud();
goTo(ISLE.hub, ISLE.hub.spawn, false);
camera.position.set(P.x, P.y + 4, P.z + 8);
loop();
createCharacter(look, player ? player.gender : 'kille').then(c => {
  ch = c; scene.add(c.root); anim = null; playAnim('idle', 0);
  if (bunny) bunny.near = true;                       // haren pratar först när man kommer fram till den
  $('loading').classList.add('hide');
  started = true;
  $('help').classList.add('show'); setTimeout(() => $('help').classList.remove('show'), 8000);
  if (!prog().seen) { saveProg(s => { s.seen = 1; }); setTimeout(() => say('Hitta alla påskägg! Gå in i portalerna till de flygande öarna.'), 600); }
}).catch(e => {
  console.error(e);
  $('loading').innerHTML = '<div>😕 Kunde inte ladda gubben.<br>Ladda om sidan.</div>';
});
$('help').addEventListener('click', () => $('help').classList.remove('show'));
$('bAgain').onclick = () => $('winBox').classList.remove('show');
$('bMenu').onclick = () => { location.href = 'index.html'; };

// För test
window.Egg = {
  P, EGGS, GRAND, ISLE, ISLANDS, worldEggs, portals, boxes, keys, renderer, scene, camera,
  step(n = 1, dt = 1 / 60) { for (let i = 0; i < n; i++) update(dt); },
  get yaw() { return yaw; }, set yaw(v) { yaw = v; }, set pitch(v) { pitch = v; }, set dist(v) { dist = v; },
  get isl() { return isl.id; }, get started() { return started; }, get ch() { return ch; }, get anim() { return anim; },
  goTo: (id, sp) => goTo(ISLE[id], sp || ISLE[id].spawn), jump, supportAt, prog, openBasket, foundCount
};
