/* =========================================================
   Tower hunt – en hinderbana 1000 m upp runt ett jättetorn.
   Man börjar i underkläder längst ner. Var 50:e meter kommer en
   portalvåning: man går igenom en av tre portaler och får det plagget.
   Hinder: trappor, hopp mellan plattformar, smala balansgångar,
   rullband, studsmattor, hissar, flyttande plattformar och snurrande bommar.
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
const TOP = 1000, SECTION = 50, NPORT = 19;          // portaler på 50, 100 … 950 m, toppen på 1000 m
const PATH_R = 19, PILLAR_R = 11;
const pillarR = y => PILLAR_R + 1.5 * Math.max(0, 1 - y / 1000);   // tornet är lite bredare nertill
const RUN = 6.2, WALK = 2.6, GRAVITY = -22, JUMP = 8.4;     // hopp ca 1,6 m högt
const RAD = 0.32, HEIGHT = 1.6, STEP = 0.45, FOOT = 0.14;
const AIR_MAX = 3.9;                                // fart i luften (lagom långa hopp, lätt att landa på små plattor)
const GOLD_PORTAL = 10, GOLD_TOP = 100;

/* ---------- Kläder: man börjar i underkläder ---------- */
const FALLBACK = { skin: '#f6b694', hair: 'kort', hairColor: '#6a4026', eyes: '#2f6db5', mouth: 'glad', extra: 'inga' };
const base = { ...FALLBACK, ...(player && player.look ? player.look : {}) };
const gender = player ? player.gender : 'kille';
function underwear() {
  return {
    skin: base.skin, hair: base.hair, hairColor: base.hairColor, eyes: base.eyes, mouth: base.mouth || 'glad',
    extra: ['kinder', 'fraknar', 'stjarnkinder'].includes(base.extra) ? base.extra : 'inga',
    top: 'linne', topColor: '#ffffff', topColor2: '#ffffff', pattern: 'enfargad', print: 'ingen', printColor: '#ffffff',
    bottom: 'shorts', bottomColor: '#ffffff', shoeStyle: 'barfota', shoes: base.skin, hat: 'ingen', hatColor: '#e23b4e', outfit: 'egen'
  };
}
const it = (id, label, ic) => ({ id, label, ic });
const ITEMS = {
  top: [it('tshirt', 'T-shirt', '👕'), it('langarm', 'Långärmad', '👚'), it('hoodie', 'Hoodie', '🏂'), it('jacka', 'Jacka', '🧥'), it('klanning', 'Klänning', '👗'),
    it('brollop', 'Bröllopsklänning', '👰'), it('brudslap', 'Brudklänning', '💍'), it('balklanning', 'Balklänning', '💃'), it('rosbal', 'Rosenklänning', '🌹'),
    it('tyll', 'Tyllklänning', '🧚'), it('glitter', 'Glitterklänning', '✨'), it('pike', 'Piké', '🎾'), it('vast', 'Väst', '🦺'), it('fotboll', 'Fotbollströja', '⚽'),
    it('superhjalte', 'Superhjälte', '🦸'), it('regnjacka', 'Regnjacka', '☔'), it('kofta', 'Kofta', '🧶'), it('smoking', 'Smoking', '🤵')],
  bottom: [it('byxor', 'Byxor', '👖'), it('jeans', 'Jeans', '🧵'), it('kjol', 'Kjol', '💃'), it('cargo', 'Cargo', '🎒'), it('leggings', 'Leggings', '🧘'),
    it('mjukis', 'Mjukisbyxor', '🛋️'), it('snickarbyxor', 'Snickarbyxor', '👷'), it('rutiga', 'Rutiga byxor', '🏁'), it('tutu', 'Tutu', '🩰'),
    it('veckkjol', 'Veckkjol', '🎐'), it('jeansshorts', 'Jeansshorts', '✂️'), it('kostym', 'Kostymbyxor', '🕴️')],
  shoeStyle: [it('sneakers', 'Sneakers', '👟'), it('stovlar', 'Stövlar', '👢'), it('glitter', 'Glitterskor', '✨'), it('tofflor', 'Tofflor', '🧸'),
    it('sandaler', 'Sandaler', '🩴'), it('ballerina', 'Ballerina', '🩰'), it('gummistovlar', 'Gummistövlar', '☔'), it('kangor', 'Kängor', '🥾'),
    it('fotbollsskor', 'Fotbollsskor', '⚽'), it('rullskridskor', 'Rullskridskor', '🛼'), it('foppa', 'Foppatofflor', '🐊'), it('vinterkangor', 'Vinterkängor', '⛄')],
  hat: [it('keps', 'Keps', '🧢'), it('mossa', 'Mössa', '❄️'), it('krona', 'Krona', '👑'), it('rosett', 'Rosett', '🎀'), it('horlurar', 'Hörlurar', '🎧'),
    it('cowboy', 'Cowboyhatt', '🤠'), it('trollkarl', 'Trollkarlshatt', '🧙'), it('kattoron', 'Kattöron', '🐱'), it('kaninoron', 'Kaninöron', '🐰'),
    it('enhorning', 'Enhörning', '🦄'), it('partyhatt', 'Partyhatt', '🥳'), it('blomkrans', 'Blomkrans', '🌸'), it('propeller', 'Propellerkeps', '🚁'),
    it('hjalm', 'Rymdhjälm', '🧑‍🚀'), it('tiara', 'Tiara', '💎')],
  pattern: [it('randig', 'Randig', '〰️'), it('prickig', 'Prickig', '🔵'), it('rutig', 'Rutig', '🏁'), it('stjarnor', 'Stjärnor', '⭐'), it('hjartan', 'Hjärtan', '💗'),
    it('zebra', 'Zebra', '🦓'), it('leopard', 'Leopard', '🐆'), it('kamo', 'Kamouflage', '🪖'), it('regnbage', 'Regnbåge', '🌈'), it('batik', 'Batik', '🌀'),
    it('blommor', 'Blommor', '🌼'), it('schack', 'Schackrutor', '♟️'), it('dinos', 'Dinosaurier', '🦕'), it('tassar', 'Tassar', '🐾'), it('fiskar', 'Fiskar', '🐟')],
  print: [it('hjarta', 'Hjärta', '❤️'), it('stjarna', 'Stjärna', '⭐'), it('blixt', 'Blixt', '⚡'), it('regnbage', 'Regnbåge', '🌈'), it('smiley', 'Smiley', '😊'),
    it('blomma', 'Blomma', '🌸'), it('raket', 'Raket', '🚀'), it('planet', 'Planet', '🪐'), it('katt', 'Katt', '🐱'), it('hund', 'Hund', '🐶'),
    it('enhorning', 'Enhörning', '🦄'), it('dino', 'Dino', '🦖'), it('panda', 'Panda', '🐼'), it('rav', 'Räv', '🦊'), it('uggla', 'Uggla', '🦉'),
    it('haj', 'Haj', '🦈'), it('fjaril', 'Fjäril', '🦋'), it('kanin', 'Kanin', '🐰')],
  extra: [it('glasogon', 'Glasögon', '👓'), it('solglasogon', 'Solglasögon', '😎'), it('hjartglasogon', 'Hjärtglasögon', '😍'), it('morrhar', 'Morrhår', '🐱'),
    it('stjarnkinder', 'Stjärnkinder', '⭐'), it('fraknar', 'Fräknar', '🌟'), it('mustasch', 'Mustasch', '🥸')],
  hair: [it('kort', 'Kort hår', '✂️'), it('snaggad', 'Snaggat', '🪒'), it('lugg', 'Lugg', '💇'), it('lang', 'Långt hår', '👸'), it('page', 'Page', '💁'),
    it('hastsvans', 'Hästsvans', '🐴'), it('tofsar', 'Tofsar', '🎀'), it('knut', 'Knut', '🍩'), it('lockigt', 'Lockigt', '🌀'), it('mohikan', 'Mohikan', '🦔'),
    it('afro', 'Afro', '☁️'), it('flata', 'Fläta', '🥨'), it('dubbelknut', 'Dubbelknut', '🐭'), it('spikigt', 'Spikigt', '⚡'), it('langlockar', 'Långa lockar', '🌊')],
  crown: [it('krona', 'Krona', '👑'), it('tiara', 'Tiara', '💎'), it('blomkrans', 'Blomkrans', '🌸'), it('enhorning', 'Enhörning', '🦄'), it('trollkarl', 'Trollkarlshatt', '🧙')]
};
const CLOTH = [['#ff5ccf', 'Rosa'], ['#3ee8ff', 'Turkos'], ['#8dff5a', 'Ljusgrön'], ['#ffd84a', 'Gul'], ['#ff7a3d', 'Orange'], ['#8a5cff', 'Lila'],
  ['#e23b4e', 'Röd'], ['#2f6db5', 'Blå'], ['#ffffff', 'Vit'], ['#2a2f45', 'Svart']];
const HAIRC = [['#1b1310', 'Svart'], ['#3b2316', 'Mörkbrunt'], ['#6a4026', 'Brunt'], ['#a8733f', 'Ljusbrunt'], ['#e3c27a', 'Blont'], ['#b3471f', 'Rött'],
  ['#ff5ccf', 'Rosa'], ['#3ee8ff', 'Turkos'], ['#8a5cff', 'Lila']];
const DRESSES = ['klanning', 'brollop', 'brudslap', 'balklanning', 'rosbal', 'tyll', 'glitter'];
const GOWNS = DRESSES.slice(1);
// Vad man väljer på varje portalvåning (anpassas efter vad man har på sig)
const PLAN = ['bottom', 'top', 'shoeStyle', 'bottomColor', 'topColor', 'hat', 'shoes', 'pattern', 'print', 'extra',
  'top', 'bottom', 'topColor2', 'hatColor', 'shoeStyle', 'hair', 'hairColor', 'pattern', 'crown'];
const CAT = {
  top: ['Välj tröja!', '👕'], bottom: ['Välj byxor!', '👖'], shoeStyle: ['Välj skor!', '👟'], hat: ['Välj hatt!', '🧢'], crown: ['Välj krona!', '👑'],
  pattern: ['Välj mönster!', '🌈'], print: ['Välj bild på tröjan!', '⭐'], extra: ['Välj glasögon & mer!', '👓'], hair: ['Välj frisyr!', '💇'],
  topColor: ['Färg på tröjan!', '🎨'], bottomColor: ['Färg på byxorna!', '🎨'], shoes: ['Färg på skorna!', '🎨'], hatColor: ['Färg på hatten!', '🎨'],
  topColor2: ['Andra färgen på tröjan!', '🖌️'], hairColor: ['Hårfärg!', '🎨']
};

/* ---------- Ljud ---------- */
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
const sBoing = () => { tone(180, 0.35, 'sine', 0.12, 0, 4); tone(360, 0.3, 'triangle', 0.05, 0.02, 3); };
const sCp = () => [660, 880, 1100].forEach((f, i) => tone(f, 0.18, 'triangle', 0.08, i * 0.07));
const sPortal = () => [523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, 0.28, 'triangle', 0.09, i * 0.08));
const sCoin = () => [1319, 1760, 2093].forEach((f, i) => tone(f, 0.16, 'square', 0.035, 0.3 + i * 0.07));
const sFall = () => tone(600, 0.6, 'sine', 0.06, 0, 0.3);

/* ---------- Renderare och scen ---------- */
const canvas = $('game');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: !touch });
const MAX_PR = Math.min(window.devicePixelRatio || 1, touch ? 1.5 : 2);
let pixelRatio = MAX_PR;
renderer.setPixelRatio(pixelRatio);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
const scene = new THREE.Scene();
scene.background = new THREE.Color('#8fd3ff');
scene.fog = new THREE.Fog('#8fd3ff', 60, 300);
const camera = new THREE.PerspectiveCamera(62, 1, 0.1, 2200);
const hemi = new THREE.HemisphereLight('#ffffff', '#6a7cff', 1.6);
scene.add(hemi);
const sun = new THREE.DirectionalLight('#fff4dc', 2.2);
scene.add(sun, sun.target);

/* ---------- Slump med fast frö: banan ser likadan ut varje gång ---------- */
function seeded(seed) { let s = seed >>> 0; return () => (s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296; }
const R = seeded(20261122);
const rr = (a, b) => a + (b - a) * R();
const ri = (a, b) => Math.floor(rr(a, b + 1));
const shuffle = (a, rnd = Math.random) => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

/* ---------- Kollision: lådor (kan vara vridna runt y) ---------- */
const boxes = [], buckets = new Map(), BK = 4;
function index(b, y0, y1) {
  for (let k = Math.floor(y0 / BK); k <= Math.floor(y1 / BK); k++) { if (!buckets.has(k)) buckets.set(k, []); buckets.get(k).push(b); }
}
function addBox(b) {
  b.c = Math.cos(b.yaw || 0); b.s = Math.sin(b.yaw || 0);
  b.top = b.y + b.hy; b.bot = b.y - b.hy; b.r = Math.hypot(b.hx, b.hz);
  index(b, b.ymin !== undefined ? b.ymin - b.hy : b.bot, b.ymax !== undefined ? b.ymax + b.hy : b.top);
  boxes.push(b);
  return b;
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
// Högsta yta under (x,z) mellan yMin och yMax
function supportAt(x, z, yMin, yMax) {
  let best = null, by = -Infinity;
  for (const b of near(x, z, yMin - 1, yMax + 1)) {
    if (b.top > yMax || b.top < yMin || b.top <= by || b.ghost) continue;
    if (!inside(b, x, z, FOOT)) continue;
    best = b; by = b.top;
  }
  // tornets tak (rund) och marken
  if (Math.hypot(x, z) < PILLAR_R + FOOT && TOP <= yMax && TOP >= yMin && TOP > by) { best = PILLAR_TOP; by = TOP; }
  if (0 <= yMax && 0 >= yMin && 0 > by && Math.hypot(x, z) < 230) { best = GROUND; by = 0; }
  return best;
}
const GROUND = { top: 0, ground: true }, PILLAR_TOP = { top: TOP, ground: true };
// Knuffa ut gubben ur väggar/plattformskanter (inte det man står på eller kan kliva upp på)
function pushOut(x, z, y, tol) {
  for (let pass = 0; pass < 2; pass++) {
    for (const b of near(x, z, y - 1, y + HEIGHT + 1)) {
      if (b.ghost || y >= b.top - tol || y + HEIGHT <= b.bot) continue;
      let [lx, lz] = toLocal(b, x, z);
      const cx = Math.max(-b.hx, Math.min(b.hx, lx)), cz = Math.max(-b.hz, Math.min(b.hz, lz));
      let dx = lx - cx, dz = lz - cz, d2 = dx * dx + dz * dz;
      if (d2 >= RAD * RAD) continue;
      if (d2 > 1e-8) { const d = Math.sqrt(d2), k = (RAD - d) / d; lx += dx * k; lz += dz * k; }
      else { const px = b.hx - Math.abs(lx), pz = b.hz - Math.abs(lz); if (px < pz) lx = Math.sign(lx || 1) * (b.hx + RAD); else lz = Math.sign(lz || 1) * (b.hz + RAD); }
      [x, z] = toWorld(b, lx, lz);
    }
    // tornet i mitten
    if (y < TOP - tol) { const d = Math.hypot(x, z), m = pillarR(y) + RAD; if (d < m) { const k = m / Math.max(d, 1e-4); x *= k; z *= k; } }
  }
  return [x, z];
}

/* ---------- Material och texturer ---------- */
const matCache = new Map();
const lam = (c, extra) => { const k = c + (extra ? JSON.stringify(extra) : ''); if (!matCache.has(k)) matCache.set(k, new THREE.MeshLambertMaterial({ color: c, ...extra })); return matCache.get(k); };
function canvasTex(w, h, draw) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  return t;
}
const arrowTex = canvasTex(128, 128, (g, w, h) => {
  g.fillStyle = '#3a3550'; g.fillRect(0, 0, w, h);
  g.fillStyle = '#ffd84a';
  g.beginPath(); g.moveTo(64, 14); g.lineTo(112, 62); g.lineTo(90, 62); g.lineTo(64, 36); g.lineTo(38, 62); g.lineTo(16, 62); g.closePath(); g.fill();
  g.beginPath(); g.moveTo(64, 70); g.lineTo(112, 118); g.lineTo(90, 118); g.lineTo(64, 92); g.lineTo(38, 118); g.lineTo(16, 118); g.closePath(); g.fill();
});
arrowTex.wrapS = arrowTex.wrapT = THREE.RepeatWrapping;
const hazardTex = canvasTex(128, 128, (g, w, h) => {
  g.fillStyle = '#ffd84a'; g.fillRect(0, 0, w, h); g.fillStyle = '#2a2f45';
  for (let i = -2; i < 4; i++) { g.beginPath(); g.moveTo(i * 48, 0); g.lineTo(i * 48 + 24, 0); g.lineTo(i * 48 + 24 + h, h); g.lineTo(i * 48 + h, h); g.fill(); }
});
hazardTex.wrapS = hazardTex.wrapT = THREE.RepeatWrapping;
const stripeTex = canvasTex(64, 64, (g, w, h) => { g.fillStyle = '#ffffff'; g.fillRect(0, 0, w, h); g.fillStyle = '#e23b4e'; g.fillRect(0, 0, w / 2, h); });
stripeTex.wrapS = stripeTex.wrapT = THREE.RepeatWrapping;
const blobTex = canvasTex(64, 64, (g) => { const r = g.createRadialGradient(32, 32, 2, 32, 32, 30); r.addColorStop(0, 'rgba(0,0,0,.55)'); r.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = r; g.fillRect(0, 0, 64, 64); });
const glowTex = canvasTex(64, 64, (g) => { const r = g.createRadialGradient(32, 32, 1, 32, 32, 31); r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(0.4, 'rgba(255,255,255,.5)'); r.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = r; g.fillRect(0, 0, 64, 64); });

/* ---------- Banan byggs ---------- */
const THEMES = [['#ff5ccf', '#ffd0f2'], ['#3ee8ff', '#cbf9ff'], ['#8dff5a', '#ddffcc'], ['#ffd84a', '#fff3c2'], ['#8a5cff', '#ddd0ff'], ['#ff7a3d', '#ffd8c4']];
let T = THEMES[0], G = null;                         // aktuell färg och grupp (statiska delar slås ihop per sektion)
const sections = [];
const dyn = [];                                     // rörliga plattformar
const spinners = [];
const belts = [];
const checkpoints = [];
const portals = [];
const cur = { x: PATH_R, y: 0, z: 0 };
const fx = new THREE.Group(); scene.add(fx);          // saker som rör sig/lyser (slås inte ihop)

function mesh(geo, mat, x, y, z, yaw = 0, parent = G) {
  const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.rotation.y = yaw; parent.add(m); return m;
}
// Plattform med ovansidan på höjden top
const route = [];                                   // alla plattformar i ordning (för test av banan)
let curKind = 'start';
function platform(x, top, z, w, l, yaw, color, { thick = 0.7, cap = true, capColor = null, ...opts } = {}) {
  const b = addBox({ x, y: top - thick / 2, z, hx: w / 2, hy: thick / 2, hz: l / 2, yaw, ...opts });
  route.push({ b, kind: curKind });
  mesh(new THREE.BoxGeometry(w, thick, l), lam(color), x, top - thick / 2, z, yaw);
  if (cap && w > 0.8 && l > 0.8) mesh(new THREE.BoxGeometry(w - 0.16, 0.05, l - 0.16), lam(capColor || T[1]), x, top + 0.005, z, yaw);
  return b;
}
// Riktning framåt: siktar på en punkt på spiralen (cirkeln runt tornet) en bit fram
function dirAhead(len) {
  const a = Math.atan2(cur.z, cur.x) + Math.max(0.6, len) / PATH_R;
  const dx = Math.cos(a) * PATH_R - cur.x, dz = Math.sin(a) * PATH_R - cur.z, L = Math.hypot(dx, dz) || 1;
  return { x: dx / L, z: dz / L, yaw: Math.atan2(dx / L, dz / L), lx: dz / L, lz: -dx / L };
}
const along = (d, dist, lat = 0) => ({ x: cur.x + d.x * dist + d.lx * lat, z: cur.z + d.z * dist + d.lz * lat });
function advance(d, dist, dy = 0) { cur.x += d.x * dist; cur.z += d.z * dist; cur.y += dy; }

function pLanding(size = 3) { const d = dirAhead(size), p = along(d, size / 2); platform(p.x, cur.y, p.z, Math.max(3, size), size, d.yaw, T[0]); advance(d, size); }
function pStairs(n, rise, w = 3) {
  curKind = 'stairs';
  const run = 0.8, d = dirAhead(n * run);
  for (let i = 1; i <= n; i++) {
    const p = along(d, run * (i - 0.5));
    platform(p.x, cur.y + rise * i, p.z, w, run + 0.02, d.yaw, i % 2 ? T[0] : T[1], { cap: false, thick: Math.min(1.2, 0.5 + rise * 1.5) });
  }
  advance(d, n * run, rise * n);
  pLanding(2.4);
}
function pJumps(n, gap, rise, size, zig = 0) {
  curKind = 'jumps';
  for (let i = 0; i < n; i++) {
    const d = dirAhead(gap + size), lat = zig ? (i % 2 ? zig : -zig) : 0;
    const p = along(d, gap + size / 2, lat);
    platform(p.x, cur.y + rise, p.z, size, size, d.yaw, i % 2 ? T[0] : '#ffffff', { capColor: i % 2 ? T[1] : T[0] });
    advance(d, gap + size, rise);
  }
  pLanding(3);
}
function pBeam(len, w) {
  curKind = 'beam';
  const d = dirAhead(len), p = along(d, len / 2);
  platform(p.x, cur.y, p.z, w, len, d.yaw, '#fff2c4', { thick: 0.35, cap: false });
  advance(d, len);
  pLanding(3);
}
function pBelt(len, mode, speed) {
  curKind = 'belt';
  const w = 3, d = dirAhead(len), p = along(d, len / 2);
  const b = platform(p.x, cur.y, p.z, w, len, d.yaw, '#2a2f45', { cap: false });
  // Pilarna på bandet visar åt vilket håll det går
  const holder = new THREE.Group(); holder.position.set(p.x, cur.y + 0.02, p.z); holder.rotation.y = d.yaw; fx.add(holder);
  let geo, push;
  if (mode === 'back') { geo = new THREE.PlaneGeometry(w - 0.2, len - 0.2); geo.rotateX(-Math.PI / 2); push = [0, -1]; }
  else { const sg = R() < 0.5 ? 1 : -1; geo = new THREE.PlaneGeometry(len - 0.2, w - 0.2); geo.rotateX(-Math.PI / 2); geo.rotateY(sg * Math.PI / 2); push = [-sg, 0]; }
  const tex = arrowTex.clone(); tex.needsUpdate = true;
  // en pil per ~1,4 m i båda riktningar
  if (mode === 'back') tex.repeat.set((w - 0.2) / 1.4, (len - 0.2) / 1.4); else tex.repeat.set((len - 0.2) / 1.4, (w - 0.2) / 1.4);
  const pm = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ map: tex })); holder.add(pm);
  const [wx, wz] = [push[0] * b.c + push[1] * b.s, -push[0] * b.s + push[1] * b.c];
  b.belt = { vx: wx * speed, vz: wz * speed };
  belts.push({ tex, speed, mesh: holder, y: cur.y, len: mode === 'back' ? (len - 0.2) : (w - 0.2) });
  advance(d, len);
  pLanding(3);
}
function pPad(dh) {
  curKind = 'pad';
  const size = 2.8; let d = dirAhead(size + 0.3); let p = along(d, 0.3 + size / 2);
  const pb = platform(p.x, cur.y, p.z, size, size, d.yaw, '#2f6db5', { capColor: '#3ee8ff' });
  mesh(new THREE.CylinderGeometry(1.05, 1.15, 0.22, 24), lam('#ffffff'), p.x, cur.y + 0.11, p.z, 0, G);
  mesh(new THREE.CylinderGeometry(0.85, 0.85, 0.24, 24), lam('#ff5ccf'), p.x, cur.y + 0.12, p.z, 0, G);
  // pil uppåt som svävar
  const arrow = new THREE.Mesh(new THREE.ConeGeometry(0.4, 0.7, 4), new THREE.MeshBasicMaterial({ color: '#ffd84a' }));
  const ay = cur.y;
  arrow.position.set(p.x, ay + 1.6, p.z); fx.add(arrow);
  dyn.push({ vis: arrow, y: ay, update: t => { arrow.position.y = ay + 1.5 + Math.sin(t * 4) * 0.25; arrow.rotation.y = t * 2; } });
  advance(d, 0.3 + size);
  const d2 = dirAhead(4.4), tp = along(d2, 1.4 + 1.6);
  platform(tp.x, cur.y + dh, tp.z, 3.2, 3.2, d2.yaw, T[0]);
  pb.pad = { x: tp.x, y: cur.y + dh, z: tp.z };
  cur.x = tp.x + d2.x * 1.6; cur.z = tp.z + d2.z * 1.6; cur.y += dh;
  pLanding(2.4);
}
function pLift(dh) {
  curKind = 'lift';
  const size = 2.8, gap = 0.2;
  const d = dirAhead(size + gap), p = along(d, gap + size / 2);
  const y0 = cur.y, y1 = cur.y + dh;
  const b = addBox({ x: p.x, y: y0 - 0.35, z: p.z, hx: size / 2, hy: 0.35, hz: size / 2, yaw: d.yaw, dyn: true, ymin: y0 - 0.35, ymax: y1 - 0.35 });
  route.push({ b, kind: 'liftcar', y0, y1 });
  const m = new THREE.Mesh(new THREE.BoxGeometry(size, 0.7, size), [lam('#ffd84a'), lam('#ffd84a'), new THREE.MeshLambertMaterial({ map: hazardTex }), lam('#c99a1c'), lam('#ffd84a'), lam('#ffd84a')]);
  m.rotation.y = d.yaw; fx.add(m);
  // två skenor som hissen åker längs
  for (const s of [-1, 1]) { const q = along(d, gap + size / 2, s * (size / 2 + 0.25)); mesh(new THREE.CylinderGeometry(0.1, 0.1, dh + 3, 8), lam('#c9c3ff'), q.x, y0 + (dh + 3) / 2 - 0.7, q.z); }
  const up = 3.4, wait = 1.6, per = 2 * (up + wait), ph = R() * per;
  const ease = t => t * t * (3 - 2 * t);
  dyn.push({
    box: b, vis: m, y: y0, update: t => {
      const u = (t + ph) % per;
      const f = u < wait ? 0 : u < wait + up ? ease((u - wait) / up) : u < 2 * wait + up ? 1 : 1 - ease((u - 2 * wait - up) / up);
      const ny = y0 + dh * f - 0.35;
      b.dx = 0; b.dz = 0; b.dy = ny - b.y; b.y = ny; b.top = ny + 0.35; b.bot = ny - 0.35;
      m.position.set(b.x, ny, b.z);
    }
  });
  advance(d, gap + size);
  cur.y = y1;
  advance(d, gap);
  pLanding(3);
}
function pMover(gap) {
  curKind = 'mover';
  const size = 2.6, d = dirAhead(gap);
  const a = along(d, size / 2 + 0.15), c = along(d, gap - size / 2 - 0.15), y = cur.y;
  const b = addBox({ x: a.x, y: y - 0.35, z: a.z, hx: size / 2, hy: 0.35, hz: size / 2, yaw: d.yaw, dyn: true });
  route.push({ b, kind: 'movercar', a, c });
  const m = new THREE.Mesh(new THREE.BoxGeometry(size, 0.7, size), [lam('#3ee8ff'), lam('#3ee8ff'), lam('#cbf9ff'), lam('#1a8fae'), lam('#3ee8ff'), lam('#3ee8ff')]);
  m.rotation.y = d.yaw; fx.add(m);
  const dist = Math.hypot(c.x - a.x, c.z - a.z), go = dist / 1.7, wait = 1.2, per = 2 * (go + wait), ph = R() * per;
  const ease = t => t * t * (3 - 2 * t);
  dyn.push({
    box: b, vis: m, y, update: t => {
      const u = (t + ph) % per;
      const f = u < wait ? 0 : u < wait + go ? ease((u - wait) / go) : u < 2 * wait + go ? 1 : 1 - ease((u - 2 * wait - go) / go);
      const nx = a.x + (c.x - a.x) * f, nz = a.z + (c.z - a.z) * f;
      b.dx = nx - b.x; b.dz = nz - b.z; b.dy = 0; b.x = nx; b.z = nz;
      m.position.set(nx, y - 0.35, nz);
    }
  });
  advance(d, gap);
  pLanding(3);
}
function pSpinner(speed) {
  curKind = 'spinner';
  const size = 7, d = dirAhead(size), p = along(d, size / 2);
  platform(p.x, cur.y, p.z, size, size, d.yaw, T[0]);
  const pivot = new THREE.Group(); pivot.position.set(p.x, cur.y + 0.55, p.z); fx.add(pivot);
  pivot.add(new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.55, 1.1, 16), lam('#2a2f45')));
  const tex = stripeTex.clone(); tex.needsUpdate = true; tex.repeat.set(8, 1);
  const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 6.4, 12), new THREE.MeshLambertMaterial({ map: tex }));
  bar.rotation.z = Math.PI / 2; pivot.add(bar);
  spinners.push({ x: p.x, z: p.z, y: cur.y + 0.55, len: 3.2, r: 0.22, w: speed * (R() < 0.5 ? 1 : -1), a: R() * 6, pivot });
  dyn.push({ vis: pivot, y: cur.y });
  advance(d, size);
}
function flagMesh(x, y, z, yaw) {
  const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.y = yaw; fx.add(g);
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 2.6, 8), lam('#ffffff')); pole.position.set(0, 1.3, 0); g.add(pole);
  const shape = new THREE.Shape(); shape.moveTo(0, 0); shape.lineTo(1.1, -0.35); shape.lineTo(0, -0.7); shape.closePath();
  const cloth = new THREE.Mesh(new THREE.ShapeGeometry(shape), new THREE.MeshLambertMaterial({ color: '#9a9ab0', side: THREE.DoubleSide }));
  cloth.position.set(0.05, 2.55, 0); g.add(cloth);
  return { g, cloth };
}
function pCheckpoint(start = false) {
  curKind = 'cp';
  const size = 4, d = dirAhead(size), p = along(d, size / 2);
  const b = platform(p.x, cur.y, p.z, size, size, d.yaw, '#ffffff', { capColor: start ? '#ffd84a' : '#e6fff0' });
  const glow = mesh(new THREE.CylinderGeometry(1.2, 1.2, 0.06, 28), new THREE.MeshBasicMaterial({ color: start ? '#ffd84a' : '#5ad04a' }), p.x, cur.y + 0.04, p.z, 0, fx);
  const q = along(d, size / 2, size / 2 - 0.4);
  const flag = flagMesh(q.x, cur.y, q.z, d.yaw);
  b.cp = checkpoints.length;
  checkpoints.push({ x: p.x, y: cur.y, z: p.z, heading: Math.atan2(d.x, d.z), flag, glow, start });
  dyn.push({ vis: flag.g, y: cur.y });
  advance(d, size);
}
/* Portalvåning: tre portaler i en vägg, man måste gå igenom en av dem */
function pPortal(k) {
  curKind = 'portal';
  const W = 10, L = 13, d = dirAhead(L), O = along(d, L / 2), y = cur.y;
  const b = platform(O.x, y, O.z, W, L, d.yaw, '#ffffff', { capColor: '#f3eeff', thick: 1 });
  const Pt = { k, x: O.x, z: O.z, y, d, gates: [], chosen: -1, opts: null, cat: null };
  const W2 = (lx, lz) => [O.x + d.lx * lx + d.x * lz, O.z + d.lz * lx + d.z * lz];
  const wallZ = 1.0, wallH = 5.0, open = 3.3;
  const wall = (x0, x1, y0, y1, color) => {
    const [wx, wz] = W2((x0 + x1) / 2, wallZ);
    addBox({ x: wx, y: y + (y0 + y1) / 2, z: wz, hx: (x1 - x0) / 2, hy: (y1 - y0) / 2, hz: 0.3, yaw: d.yaw });
    mesh(new THREE.BoxGeometry(x1 - x0, y1 - y0, 0.6), lam(color), wx, y + (y0 + y1) / 2, wz, d.yaw);
  };
  for (const [x0, x1] of [[-6.2, -4.4], [-2.2, -1.1], [1.1, 2.2], [4.4, 6.2]]) wall(x0, x1, 0, wallH, '#8a5cff');
  for (const [x0, x1] of [[-4.4, -2.2], [-1.1, 1.1], [2.2, 4.4]]) wall(x0, x1, open, wallH, '#8a5cff');
  wall(-6.2, 6.2, wallH, wallH + 0.4, '#ffd84a');
  // portalerna (ljusfilm + lysande ram + skylt ovanför)
  [-3.3, 0, 3.3].forEach((lx, i) => {
    const [gx, gz] = W2(lx, wallZ);
    const film = new THREE.Mesh(new THREE.PlaneGeometry(2.2, open), new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.45, side: THREE.DoubleSide, depthWrite: false }));
    film.position.set(gx, y + open / 2, gz); film.rotation.y = d.yaw; fx.add(film);
    const frameM = new THREE.MeshBasicMaterial({ color: '#ffffff' });
    const fr = new THREE.Group(); fr.position.set(gx, y, gz); fr.rotation.y = d.yaw; fx.add(fr);
    for (const [fx0, fy0, fw, fh] of [[-1.15, open / 2, 0.14, open], [1.15, open / 2, 0.14, open], [0, open + 0.02, 2.44, 0.14]]) {
      const bar = new THREE.Mesh(new THREE.BoxGeometry(fw, fh, 0.7), frameM); bar.position.set(fx0, fy0, 0); fr.add(bar);
    }
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 1.3), new THREE.MeshBasicMaterial({ map: unknownTex, transparent: true }));
    const [sx, sz] = W2(lx, wallZ - 0.36); sign.position.set(sx, y + (open + wallH) / 2 + 0.05, sz); sign.rotation.y = d.yaw + Math.PI; fx.add(sign);
    Pt.gates.push({ lx, film, frameM, sign, fr });
  });
  const head = new THREE.Mesh(new THREE.PlaneGeometry(7.5, 1.6), new THREE.MeshBasicMaterial({ map: unknownHead, transparent: true }));
  const [hx, hz] = W2(0, wallZ - 0.4); head.position.set(hx, y + wallH + 1.25, hz); head.rotation.y = d.yaw + Math.PI; fx.add(head);
  Pt.head = head;
  // höjdskylt på golvet
  const [nx, nz] = W2(0, -5.2);
  const num = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 1.2), new THREE.MeshBasicMaterial({ map: canvasTex(256, 96, (g, w, h) => { g.fillStyle = '#8a5cff'; g.font = 'bold 76px Fredoka, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText((k + 1) * SECTION + ' m', w / 2, h / 2 + 4); }), transparent: true }));
  num.rotation.x = -Math.PI / 2; num.rotation.z = d.yaw + Math.PI; num.position.set(nx, y + 0.04, nz); fx.add(num);
  // checkpoints före och efter väggen
  const [ix, iz] = W2(0, -4.5), [ox, oz] = W2(0, 4.6);
  Pt.cpIn = checkpoints.length; checkpoints.push({ x: ix, y, z: iz, heading: Math.atan2(d.x, d.z), portal: Pt });
  Pt.cpOut = checkpoints.length; checkpoints.push({ x: ox, y, z: oz, heading: Math.atan2(d.x, d.z), portal: Pt, after: true });
  b.portal = Pt;
  portals.push(Pt);
  dyn.push({ vis: null, y, group: [head, num, ...Pt.gates.flatMap(g => [g.film, g.sign, g.fr])] });
  advance(d, L);
}
const unknownTex = canvasTex(256, 128, (g, w, h) => {
  g.fillStyle = 'rgba(20,14,70,.85)'; roundRectP(g, 4, 4, w - 8, h - 8, 26); g.fill();
  g.strokeStyle = '#fff'; g.lineWidth = 6; g.stroke();
  g.fillStyle = '#fff'; g.font = 'bold 84px Fredoka, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('?', w / 2, h / 2 + 6);
});
const unknownHead = canvasTex(512, 110, (g, w, h) => {
  g.fillStyle = 'rgba(20,14,70,.85)'; roundRectP(g, 4, 4, w - 8, h - 8, 40); g.fill();
  g.strokeStyle = '#ffd84a'; g.lineWidth = 6; g.stroke();
  g.fillStyle = '#ffd84a'; g.font = 'bold 56px Fredoka, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('Portal ✨', w / 2, h / 2 + 4);
});
function roundRectP(g, x, y, w, h, r) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }
function pTop() {
  curKind = 'top';
  // sista plattformen och en bro in på tornets tak där pokalen står
  const W = 9, L = 8, d = dirAhead(L), O = along(d, L / 2);
  platform(O.x, TOP, O.z, W, L, d.yaw, '#ffd84a', { capColor: '#fff3c2' });
  const ang = Math.atan2(O.z, O.x), bx = Math.cos(ang) * (PILLAR_R + 2.2), bz = Math.sin(ang) * (PILLAR_R + 2.2);
  platform(bx, TOP, bz, 3.5, 5, Math.atan2(-Math.cos(ang), -Math.sin(ang)), '#ffd84a', { capColor: '#fff3c2' });
  advance(d, L);
}

/* Bygg hela banan: sektion för sektion (en sektion = 50 m) */
function buildCourse() {
  G = new THREE.Group(); scene.add(G); sections.push(G);
  cur.x = PATH_R; cur.z = 0; cur.y = 0.4;
  pCheckpoint(true);
  for (let s = 0; s < TOP / SECTION; s++) {
    if (s > 0) { G = new THREE.Group(); scene.add(G); sections.push(G); }
    T = THEMES[s % THEMES.length];
    const k = s / 19, y1 = (s + 1) * SECTION;
    let lastCp = cur.y, lastChallenge = '', lastClimb = '', turn = 0;
    const climbs = s < 1 ? ['stairs', 'jumpsUp', 'pad', 'stairs'] : s < 3 ? ['stairs', 'jumpsUp', 'pad', 'lift'] : ['stairs', 'jumpsUp', 'pad', 'lift', 'zigzag'];
    const challenges = s < 1 ? ['beam', 'jumps'] : s < 2 ? ['beam', 'jumps', 'belt', 'mover'] : ['beam', 'jumps', 'belt', 'mover', 'spinner'];
    while (cur.y < y1 - 7) {
      if (turn++ % 2 === 0) {
        let c; do { c = challenges[ri(0, challenges.length - 1)]; } while (c === lastChallenge && challenges.length > 1);
        lastChallenge = c;
        if (c === 'beam') pBeam(rr(6, 9 + 3 * k), 0.95 - 0.35 * k);
        else if (c === 'jumps') pJumps(ri(3, 5), rr(1.1, 1.5 + 0.4 * k), 0, 2.6 - 0.6 * k);
        else if (c === 'belt') pBelt(rr(8, 11), R() < 0.55 ? 'side' : 'back', R() < 0.5 ? 1.5 + 1.2 * k : 2.0 + 1.4 * k);
        else if (c === 'mover') pMover(rr(6, 8 + 2 * k));
        else if (c === 'spinner') pSpinner(1.0 + 0.7 * k);
      } else {
        const room = y1 - cur.y - 1;
        let c; do { c = climbs[ri(0, climbs.length - 1)]; } while (c === lastClimb && climbs.length > 1);
        lastClimb = c;
        if (c === 'pad') pPad(Math.min(room, rr(8, 11)));
        else if (c === 'lift') pLift(Math.min(room, rr(8, 12)));
        else if (c === 'stairs') { const n = Math.max(4, Math.min(ri(10, 15), Math.floor(room / 0.42))); pStairs(n, 0.42); }
        else if (c === 'zigzag') { const rise = 0.6 + 0.2 * k, n = Math.max(2, Math.min(ri(4, 6), Math.floor(room / rise))); pJumps(n, rr(1.0, 1.4), rise, 1.6, 1.2); }
        else { const rise = 0.7 + 0.2 * k, n = Math.max(2, Math.min(ri(4, 6), Math.floor(room / rise))); pJumps(n, rr(1.1, 1.4 + 0.3 * k), rise, 2.6 - 0.5 * k); }
      }
      if (cur.y - lastCp >= 9 && cur.y < y1 - 6) { pCheckpoint(); lastCp = cur.y; }
    }
    // sista biten: trappa exakt upp till portalvåningen
    const rem = y1 - cur.y;
    if (rem > 0.01) { const n = Math.max(1, Math.ceil(rem / 0.43)); pStairs(n, rem / n); }
    if (s < NPORT) pPortal(s); else pTop();
  }
  // Slå ihop allt statiskt per sektion (få ritanrop)
  for (const g of sections) mergeStatic(g);
}

/* ---------- Tornet, marken och himlen ---------- */
function buildWorld() {
  const brick = canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = '#e9e3ff'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#d6ccff';
    for (let y = 0; y < h; y += 32) for (let x = (y / 32) % 2 ? -32 : 0; x < w; x += 64) { g.fillRect(x + 3, y + 3, 58, 26); }
    g.fillStyle = '#5c4bb8'; roundRectP(g, 96, 72, 64, 104, 30); g.fill();
    g.fillStyle = '#ffd84a'; roundRectP(g, 104, 82, 48, 86, 22); g.fill();
    g.fillStyle = '#5c4bb8'; g.fillRect(126, 82, 4, 86); g.fillRect(104, 120, 48, 4);
  });
  brick.wrapS = brick.wrapT = THREE.RepeatWrapping; brick.repeat.set(10, 120);
  const pillar = new THREE.Mesh(new THREE.CylinderGeometry(PILLAR_R, PILLAR_R + 1.5, TOP, 48, 1, true), new THREE.MeshLambertMaterial({ map: brick }));
  pillar.position.y = TOP / 2; scene.add(pillar);
  // ringar var 50:e meter
  for (let i = 1; i <= TOP / SECTION; i++) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(PILLAR_R + 0.15 + 1.5 * (1 - i * SECTION / TOP), 0.3, 8, 64), new THREE.MeshBasicMaterial({ color: THEMES[(i - 1) % THEMES.length][0] }));
    ring.rotation.x = Math.PI / 2; ring.position.y = i * SECTION; scene.add(ring);
  }
  // taket och pokalen
  const roof = new THREE.Mesh(new THREE.CylinderGeometry(PILLAR_R, PILLAR_R, 0.6, 48), lam('#ffd84a')); roof.position.y = TOP - 0.3; scene.add(roof);
  const cupM = new THREE.MeshStandardMaterial({ color: '#ffcf3a', metalness: 0.8, roughness: 0.25, emissive: '#ff9f00', emissiveIntensity: 0.25 });
  const cup = new THREE.Group(); cup.position.set(0, TOP, 0); scene.add(cup);
  const c1 = new THREE.Mesh(new THREE.CylinderGeometry(1.4, 1.8, 0.8, 24), cupM); c1.position.y = 0.4; cup.add(c1);
  const c2 = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.5, 1.6, 16), cupM); c2.position.y = 1.6; cup.add(c2);
  const c3 = new THREE.Mesh(new THREE.CylinderGeometry(1.7, 0.6, 2.2, 24, 1, true), cupM); c3.position.y = 3.4; cup.add(c3);
  for (const s of [-1, 1]) { const h = new THREE.Mesh(new THREE.TorusGeometry(0.6, 0.14, 8, 20, Math.PI), cupM); h.position.set(s * 1.75, 3.5, 0); h.rotation.z = s > 0 ? -Math.PI / 2 : Math.PI / 2; cup.add(h); }
  addBox({ x: 0, y: TOP + 2, z: 0, hx: 1.6, hy: 2, hz: 1.6, yaw: 0 });
  topCup = cup;
  // mark och startplats
  const ground = new THREE.Mesh(new THREE.CircleGeometry(230, 64), lam('#7ed957')); ground.rotation.x = -Math.PI / 2; scene.add(ground);
  const plaza = new THREE.Mesh(new THREE.CircleGeometry(32, 48), lam('#ffe9a8')); plaza.rotation.x = -Math.PI / 2; plaza.position.y = 0.02; scene.add(plaza);
  // träd runt om
  const trunkG = new THREE.CylinderGeometry(0.35, 0.45, 2.4, 8), crownG = new THREE.ConeGeometry(2, 4.4, 9);
  const tr = new THREE.Group();
  const rnd = seeded(7);
  for (let i = 0; i < 70; i++) {
    const a = rnd() * Math.PI * 2, d = 45 + rnd() * 150;
    const x = Math.cos(a) * d, z = Math.sin(a) * d, s = 0.8 + rnd() * 0.9;
    const t = new THREE.Mesh(trunkG, lam('#8a5a32')); t.position.set(x, 1.2 * s, z); t.scale.setScalar(s); tr.add(t);
    const c = new THREE.Mesh(crownG, lam(['#3f9a3c', '#57b84a', '#2f8a5a'][i % 3])); c.position.set(x, (2.4 + 2) * s, z); c.scale.setScalar(s); tr.add(c);
  }
  scene.add(tr); mergeStatic(tr);
  // moln
  const cloudTex = canvasTex(128, 64, (g) => { g.fillStyle = '#fff'; for (const [x, y, r] of [[34, 38, 22], [60, 30, 28], [90, 38, 22], [64, 44, 20]]) { g.beginPath(); g.arc(x, y, r, 0, 7); g.fill(); } });
  const cm = new THREE.SpriteMaterial({ map: cloudTex, transparent: true, opacity: 0.92, depthWrite: false });
  for (let i = 0; i < 90; i++) {
    const a = rnd() * Math.PI * 2, d = 40 + rnd() * 170, s = new THREE.Sprite(cm);
    s.position.set(Math.cos(a) * d, 60 + rnd() * 620, Math.sin(a) * d); s.scale.set(28 + rnd() * 30, 12 + rnd() * 10, 1); scene.add(s);
  }
  // stjärnor (syns högt upp)
  const sp = [];
  for (let i = 0; i < 900; i++) { const u = rnd() * 2 - 1, a = rnd() * Math.PI * 2, r = 900; sp.push(Math.sqrt(1 - u * u) * Math.cos(a) * r, Math.abs(u) * r * 0.9 + 40, Math.sqrt(1 - u * u) * Math.sin(a) * r); }
  const sg = new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.Float32BufferAttribute(sp, 3));
  stars = new THREE.Points(sg, new THREE.PointsMaterial({ color: '#ffffff', size: 2.2, sizeAttenuation: false, transparent: true, opacity: 0, fog: false, depthWrite: false }));
  scene.add(stars);
  // planet längst upp
  planet = new THREE.Mesh(new THREE.SphereGeometry(60, 32, 16), new THREE.MeshBasicMaterial({ color: '#ff8de0', fog: false, transparent: true, opacity: 0 }));
  scene.add(planet);
}
let stars = null, planet = null, topCup = null;

/* ---------- Gubben ---------- */
const P = { x: 0, y: 0, z: 0, vx: 0, vz: 0, vy: 0, grounded: true, on: null, heading: 0, speed: 0, coyote: 0, launch: 0, airT: 0 };
let ch = null, look = underwear(), buildId = 0;
async function applyLook(next, puff = false) {
  const id = ++buildId;
  const c = await createCharacter(next, gender);
  if (id !== buildId) { c.dispose(); return; }
  if (ch) { scene.remove(ch.root); ch.dispose(); }
  ch = c; scene.add(c.root);
  ch.play(P.grounded ? 'idle' : 'jump', 0);
  if (puff) sparkle(P.x, P.y + 1, P.z, 18);
}
const blob = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 1.1), new THREE.MeshBasicMaterial({ map: blobTex, transparent: true, depthWrite: false }));
blob.rotation.x = -Math.PI / 2; scene.add(blob);

/* Gnistor (när man byter kläder / når en checkpoint) */
const sparks = [];
const sparkMat = new THREE.SpriteMaterial({ map: glowTex, color: '#ffe27a', transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
function sparkle(x, y, z, n = 16, color = null) {
  for (let i = 0; i < n; i++) {
    const s = new THREE.Sprite(color ? sparkMat.clone() : sparkMat); if (color) s.material.color.set(color);
    s.position.set(x, y, z); s.scale.setScalar(0.26 + Math.random() * 0.12);
    const a = Math.random() * Math.PI * 2, u = Math.random();
    sparks.push({ s, vx: Math.cos(a) * (1.5 + u * 3), vy: 2 + Math.random() * 4, vz: Math.sin(a) * (1.5 + u * 3), life: 0.9 + Math.random() * 0.5, own: !!color });
    scene.add(s);
  }
}

/* ---------- Spel-läge, sparning ---------- */
const run = { cp: 0, look: null, paid: -1, best: 0, done: false };
let cpIdx = 0;
function saveRun() {
  if (!player) return;
  Save.updatePlayer(player.id, p => { p.progress.torn = { cp: cpIdx, look, paid: run.paid, best: Math.max(run.best, (p.progress.torn || {}).best || 0), done: run.done, at: Date.now() }; });
}
function giveCoins(n) {
  if (!player) return;
  Save.addCoins(player.id, n); showCoins();
  const c = $('pcoins'); c.classList.remove('bump'); void c.offsetWidth; c.classList.add('bump');
  sCoin();
}
let toastTm = 0;
function toast(t, ms = 2400) { const el = $('toast'); el.textContent = t; el.classList.add('show'); clearTimeout(toastTm); toastTm = setTimeout(() => el.classList.remove('show'), ms); }

/* Portalernas val */
function lookHas(l) { return { dress: DRESSES.includes(l.top), gown: GOWNS.includes(l.top), hatColor: l.hat && !['ingen', 'krona'].includes(l.hat) }; }
function catFor(k, l) {
  let c = PLAN[k];
  const h = lookHas(l);
  const bad = c => ((c === 'bottom' || c === 'bottomColor') && h.dress) || ((c === 'pattern' || c === 'print') && h.gown) || (c === 'hatColor' && !h.hatColor) || (c === 'topColor2' && l.top === 'smoking');
  if (bad(c)) c = ['extra', 'hat', 'hairColor', 'topColor', 'shoes', 'hair'].find(x => !bad(x) && x !== PLAN[k - 1]) || 'topColor';
  return c;
}
function optionsFor(cat, l) {
  const key = cat === 'crown' ? 'hat' : cat;
  if (['topColor', 'bottomColor', 'shoes', 'hatColor', 'topColor2'].includes(cat)) {
    return shuffle(CLOTH.filter(([c]) => c !== l[key])).slice(0, 3).map(([c, n]) => ({ key, val: c, label: n, color: c }));
  }
  if (cat === 'hairColor') return shuffle(HAIRC.filter(([c]) => c !== l.hairColor)).slice(0, 3).map(([c, n]) => ({ key, val: c, label: n + ' hår', color: c }));
  const pool = ITEMS[cat].filter(o => o.id !== l[key]);
  return shuffle(pool.slice()).slice(0, 3).map(o => ({ key, val: o.id, label: o.label, ic: o.ic }));
}
function signTex(o) {
  return canvasTex(256, 128, (g, w, h) => {
    g.fillStyle = 'rgba(20,14,70,.88)'; roundRectP(g, 4, 4, w - 8, h - 8, 26); g.fill();
    g.strokeStyle = o.color || '#ffffff'; g.lineWidth = 7; g.stroke();
    if (o.color) { g.beginPath(); g.arc(52, h / 2, 34, 0, 7); g.fillStyle = o.color; g.fill(); g.lineWidth = 4; g.strokeStyle = '#ffffff'; g.stroke(); }
    else { g.font = '64px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(o.ic, 52, h / 2 + 4); }
    g.fillStyle = '#ffffff'; g.textAlign = 'left'; g.textBaseline = 'middle';
    let fs = 34; g.font = `bold ${fs}px Fredoka, sans-serif`;
    while (g.measureText(o.label).width > 150 && fs > 18) { fs -= 2; g.font = `bold ${fs}px Fredoka, sans-serif`; }
    g.fillText(o.label, 96, h / 2 + 2);
  });
}
function headTex(k, cat) {
  const [t, ic] = CAT[cat];
  return canvasTex(512, 110, (g, w, h) => {
    g.fillStyle = 'rgba(20,14,70,.88)'; roundRectP(g, 4, 4, w - 8, h - 8, 40); g.fill();
    g.strokeStyle = '#ffd84a'; g.lineWidth = 6; g.stroke();
    g.fillStyle = '#ffd84a'; g.textAlign = 'center'; g.textBaseline = 'middle';
    let fs = 54; g.font = `bold ${fs}px Fredoka, sans-serif`;
    while (g.measureText(t).width > 400 && fs > 26) { fs -= 2; g.font = `bold ${fs}px Fredoka, sans-serif`; }
    g.fillText(t, w / 2 + 28, h / 2 + 4);
    g.font = '52px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif'; g.fillText(ic, 52, h / 2 + 4);
  });
}
// Fyll i portalens tre val (görs när man närmar sig, utifrån vad man har på sig då)
function preparePortal(P) {
  if (!P || P.opts) return;
  P.cat = catFor(P.k, look);
  P.opts = optionsFor(P.cat, look);
  P.gates.forEach((g, i) => {
    const o = P.opts[i];
    g.sign.material.map = signTex(o); g.sign.material.needsUpdate = true;
    const col = o.color || ['#ff5ccf', '#3ee8ff', '#8dff5a'][i];
    g.film.material.color.set(col); g.frameM.color.set(col);
  });
  P.head.material.map = headTex(P.k, P.cat); P.head.material.needsUpdate = true;
}
function choose(P, i) {
  if (P.chosen === i) return;
  const o = P.opts[i];
  P.chosen = i;
  look = { ...look, [o.key]: o.val };
  if (o.key === 'top' && o.val === 'smoking' && look.topColor === '#ffffff') look.topColor = '#2a2f45';
  if (o.key === 'hat' && look.hat === 'krona') look.hatColor = '#ffd84a';
  P.gates.forEach((g, j) => { g.film.material.opacity = j === i ? 0.8 : 0.25; });
  applyLook(look, true);
  sPortal();
  toast(`✨ ${o.ic ? o.ic + ' ' : '🎨 '}${o.label}!`);
  if (P.k > run.paid) { run.paid = P.k; giveCoins(GOLD_PORTAL); setTimeout(() => toast(`+${GOLD_PORTAL} guldmynt 🪙`, 1800), 1400); }
  setCp(P.cpOut);
  preparePortal(portals[P.k + 1]);
  saveRun();
}
function setCp(i, effect = true) {
  if (i <= cpIdx) return;
  cpIdx = i;
  const c = checkpoints[i];
  if (c.flag) { c.flag.cloth.material.color.set('#5ad04a'); if (effect) { sCp(); sparkle(c.x, c.y + 1.2, c.z, 18); toast('🚩 Checkpoint!', 1500); } }
  saveRun();
}
function respawn() {
  const c = checkpoints[cpIdx];
  P.x = c.x; P.z = c.z; P.y = c.y; P.vx = P.vz = P.vy = 0; P.grounded = true; P.on = null; P.launch = 0; P.airT = 0;
  P.heading = c.heading; yaw = c.heading + Math.PI;
  const f = $('flash'); f.classList.add('on'); requestAnimationFrame(() => requestAnimationFrame(() => f.classList.remove('on')));
}

/* ---------- Kamera och styrning (som i Guldmyntsjakten) ---------- */
let yaw = Math.PI, pitch = 0.3, dist = 6.5;
const camTarget = new THREE.Vector3(), camPos = new THREE.Vector3();
const keys = {};
let started = false, finished = false;
addEventListener('keydown', e => {
  keys[e.code] = true;
  if (e.code === 'Space') { e.preventDefault(); if (!e.repeat) jump(); }
  if (e.code === 'KeyH') $('help').classList.toggle('show');
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
canvas.addEventListener('wheel', e => { dist = Math.min(11, Math.max(3.5, dist + e.deltaY * 0.004)); }, { passive: true });
function turn(dx, dy) { yaw -= dx * 0.0028; pitch = Math.min(1.2, Math.max(-0.2, pitch + dy * 0.0022)); }
const stick = { id: null, ox: 0, oy: 0, x: 0, y: 0 };
let lookId = null;
if (touch) document.body.classList.add('touch');
canvas.addEventListener('touchstart', e => {
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
    if (t.identifier === stick.id) { stick.id = null; stick.x = stick.y = 0; $('joy').classList.remove('show'); $('knob').style.transform = ''; }
    if (t.identifier === lookId) lookId = null;
  }
};
canvas.addEventListener('touchend', endTouch);
canvas.addEventListener('touchcancel', endTouch);
$('jumpBtn').addEventListener('touchstart', e => { e.preventDefault(); jump(); }, { passive: false });
$('jumpBtn').addEventListener('click', jump);
let jumpBuf = 0;
function jump() {
  if (!started || finished) return;
  if (P.grounded || P.coyote > 0) doJump(); else jumpBuf = 0.15;          // lite förlåtande: hoppet "sparas" en kort stund
}
function doJump() {
  P.vy = JUMP; P.grounded = false; P.coyote = 0; P.on = null; jumpBuf = 0;
  if (ch) ch.play('jump', 0.08);
  sJump();
}

/* ---------- Spelloop ---------- */
const fwd = new THREE.Vector3(), right = new THREE.Vector3(), move = new THREE.Vector3();
let time = 0, wasMoving = false, lastPortalLz = new Map();
function update(dt) {
  time += dt;
  // rörliga saker
  for (const o of dyn) if (o.update) o.update(time);
  for (const s of spinners) { s.a += s.w * dt; s.pivot.rotation.y = s.a; }
  for (const b of belts) b.tex.offset.y -= b.speed * dt / 1.4;
  if (!started || finished) { animate(dt, false); return; }

  // Åk med det man står på (hiss, flyttande plattform, rullband)
  if (P.grounded && P.on) {
    if (P.on.dyn) { P.x += P.on.dx || 0; P.z += P.on.dz || 0; P.y += P.on.dy || 0; }
    if (P.on.belt) { const [nx, nz] = pushOut(P.x + P.on.belt.vx * dt, P.z + P.on.belt.vz * dt, P.y, STEP); P.x = nx; P.z = nz; }
  }

  // Styrning
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
  // markkontroll är snabb, i luften lite trögare. Släpper man spaken i luften behåller man farten
  // (efter en studsmatta flyger man nästan av sig själv rätt)
  const acc = P.grounded ? 14 : P.launch > 0 ? 0.8 : 6;
  if (P.grounded || moving) {
    P.vx += (tvx - P.vx) * Math.min(1, acc * dt);
    P.vz += (tvz - P.vz) * Math.min(1, acc * dt);
  }
  if (!P.grounded && P.launch <= 0) { const v = Math.hypot(P.vx, P.vz); if (v > AIR_MAX) { P.vx *= AIR_MAX / v; P.vz *= AIR_MAX / v; } }
  // flytta i små steg så man inte går igenom tunna saker
  const tol = P.grounded ? STEP : 0.25;
  const steps = Math.max(1, Math.ceil(Math.hypot(P.vx, P.vz) * dt / 0.12));
  for (let i = 0; i < steps; i++) { const [nx, nz] = pushOut(P.x + P.vx * dt / steps, P.z + P.vz * dt / steps, P.y, tol); P.x = nx; P.z = nz; }

  // Upp och ner
  P.launch = Math.max(0, P.launch - dt);
  if (P.grounded) {
    const s = supportAt(P.x, P.z, P.y - 0.3, P.y + STEP);
    if (s) { P.y = s.top; P.on = s; P.airT = 0; }
    else { P.grounded = false; P.on = null; P.vy = 0; P.coyote = 0.12; if (ch) ch.play('jump', 0.2); }
  }
  if (!P.grounded) {
    P.coyote = Math.max(0, P.coyote - dt);
    P.airT += dt;
    const y0 = P.y;
    P.vy += GRAVITY * dt; P.vy = Math.max(P.vy, -40);
    let ny = P.y + P.vy * dt;
    if (P.vy > 0) {                                           // slår i en platta ovanför
      for (const b of near(P.x, P.z, y0 + HEIGHT - 1, ny + HEIGHT + 1)) {
        if (b.ghost || b.bot < y0 + HEIGHT - 0.05 || b.bot > ny + HEIGHT || !inside(b, P.x, P.z, -0.05)) continue;
        ny = b.bot - HEIGHT; P.vy = 0;
      }
    } else {
      const s = supportAt(P.x, P.z, ny, y0 + 0.25);
      if (s) { ny = s.top; land(s); }
    }
    P.y = ny;
    if (jumpBuf > 0) { jumpBuf -= dt; if (P.coyote > 0) doJump(); }
  }
  // Snurrande bommar knuffar
  for (const s of spinners) {
    if (Math.abs(P.y + 0.8 - s.y) > 1.2 || Math.abs(P.x - s.x) > 4.5 || Math.abs(P.z - s.z) > 4.5) continue;
    if (P.y > s.y + s.r || P.y + HEIGHT < s.y - s.r) continue;
    const ux = Math.cos(s.a), uz = -Math.sin(s.a);
    const t = Math.max(-s.len, Math.min(s.len, (P.x - s.x) * ux + (P.z - s.z) * uz));
    const cx = s.x + ux * t, cz = s.z + uz * t, dx = P.x - cx, dz = P.z - cz, d = Math.hypot(dx, dz), m = s.r + RAD;
    if (d < m) {
      const nx = d > 1e-4 ? dx / d : -uz, nz = d > 1e-4 ? dz / d : ux;
      P.x = cx + nx * m; P.z = cz + nz * m;
      const tang = Math.sign((dx * -uz + dz * ux) || 1) * Math.sign(s.w);
      P.vx += nx * 5 + (-uz) * tang * 2; P.vz += nz * 5 + ux * tang * 2;
      if (P.grounded) { P.vy = 4; P.grounded = false; P.on = null; }
    }
  }
  // Checkpoints, portaler och toppen
  if (P.grounded && P.on) {
    if (P.on.cp !== undefined) setCp(P.on.cp);
    if (P.on.portal) {
      const Pt = P.on.portal; preparePortal(Pt);
      if (Pt.chosen < 0) { setCp(Pt.cpIn, false); if (!Pt.told) { Pt.told = true; const [t, ic] = CAT[Pt.cat]; toast(`${ic} ${t} Gå igenom en portal`, 3200); } }
    }
  }
  for (const Pt of portals) {
    if (Math.abs(P.y - Pt.y) > 4 || Math.abs(P.x - Pt.x) > 9 || Math.abs(P.z - Pt.z) > 9) continue;
    preparePortal(Pt);
    const lz = (P.x - Pt.x) * Pt.d.x + (P.z - Pt.z) * Pt.d.z, lx = (P.x - Pt.x) * Pt.d.lx + (P.z - Pt.z) * Pt.d.lz;
    const prev = lastPortalLz.get(Pt);
    if (prev !== undefined && prev < 1.0 && lz >= 1.0) { const gi = Pt.gates.findIndex(g => Math.abs(lx - g.lx) < 1.25); if (gi >= 0) choose(Pt, gi); }
    lastPortalLz.set(Pt, lz);
  }
  if (P.grounded && P.y >= TOP - 0.01 && !finished) win();
  // Ramlar man: tillbaka till senaste checkpoint
  if (P.y < checkpoints[cpIdx].y - 7 || P.y < -3) { sFall(); respawn(); }
  run.best = Math.max(run.best, P.y);
  animate(dt, moving, walking);
}
function land(s) {
  P.grounded = true; P.on = s; P.vy = 0; P.coyote = 0;
  if (s.pad) {                                              // studsmatta: skjuts upp till plattformen ovanför
    const t = s.pad, apex = Math.max(1, t.y - s.top) + 1.8;
    const vy = Math.sqrt(2 * -GRAVITY * apex), tt = vy / -GRAVITY + Math.sqrt(2 * 1.8 / -GRAVITY);
    P.vy = vy; P.vx = (t.x - P.x) / tt; P.vz = (t.z - P.z) / tt; P.launch = tt; P.grounded = false; P.on = null;
    P.heading = Math.atan2(t.x - P.x, t.z - P.z);
    if (ch) ch.play('jump', 0.05);
    sBoing(); return;
  }
  if (ch) ch.play(Math.hypot(P.vx, P.vz) > 0.5 ? 'run' : 'idle', 0.12);
  if (jumpBuf > 0) doJump();
}
function animate(dt, moving, walking) {
  if (ch) {
    if (P.grounded) {
      if (moving && !wasMoving) ch.play('run', 0.15);
      if (!moving && wasMoving) ch.play('idle', 0.25);
    }
    ch.mixer.timeScale = moving && walking ? 0.55 : 1;
    wasMoving = moving && P.grounded;
    ch.root.position.set(P.x, P.y, P.z);
    ch.root.rotation.y = P.heading;
    ch.update(dt);
  }
  // skugga under fötterna
  const s = supportAt(P.x, P.z, P.y - 40, P.y + 0.05);
  if (s) { const h = P.y - s.top; blob.visible = true; blob.position.set(P.x, s.top + 0.03, P.z); blob.scale.setScalar(Math.max(0.35, 1 - h * 0.05)); blob.material.opacity = Math.max(0.25, 1 - h * 0.04); }
  else blob.visible = false;
  for (let i = sparks.length - 1; i >= 0; i--) {
    const p = sparks[i]; p.life -= dt; p.vy -= 6 * dt;
    p.s.position.x += p.vx * dt; p.s.position.y += p.vy * dt; p.s.position.z += p.vz * dt; p.s.material.opacity = Math.min(1, p.life * 2);
    if (p.life <= 0) { scene.remove(p.s); if (p.own) p.s.material.dispose(); sparks.splice(i, 1); }
  }
  if (topCup) topCup.rotation.y += dt * 0.5;
  // Kamera bakom gubben, inte inne i tornet eller i plattformar
  camTarget.set(P.x, P.y + 1.5, P.z);
  const sx = Math.sin(yaw) * Math.cos(pitch), sz = Math.cos(yaw) * Math.cos(pitch), sy = Math.sin(pitch);
  let d = dist;
  for (let st = 0.8; st <= dist; st += 0.4) {
    const x = camTarget.x + sx * st, y = camTarget.y + sy * st, z = camTarget.z + sz * st;
    let hit = Math.hypot(x, z) < pillarR(y) + 0.6 && y < TOP;
    if (!hit) for (const b of near(x, z, y - 0.5, y + 0.5)) { if (!b.ghost && y > b.bot - 0.25 && y < b.top + 0.25 && inside(b, x, z, 0.25)) { hit = true; break; } }
    if (hit) { d = Math.max(1.2, st - 0.4); break; }
  }
  camPos.set(camTarget.x + sx * d, camTarget.y + sy * d, camTarget.z + sz * d);
  camera.position.lerp(camPos, 1 - Math.exp(-dt * 12));
  camera.lookAt(camTarget);
  // himlen blir mörkare och stjärnorna kommer fram ju högre man är
  const h = Math.max(0, Math.min(1, P.y / TOP));
  skyCol.copy(SKY[0]);
  for (let i = 0; i < SKY.length - 1; i++) { const a = i / (SKY.length - 1), b = (i + 1) / (SKY.length - 1); if (h >= a && h <= b) { skyCol.copy(SKY[i]).lerp(SKY[i + 1], (h - a) / (b - a)); break; } }
  if (h >= 1) skyCol.copy(SKY[SKY.length - 1]);
  scene.background.copy(skyCol); scene.fog.color.copy(skyCol);
  if (stars) { stars.material.opacity = Math.max(0, Math.min(1, (h - 0.45) / 0.35)); stars.position.set(camera.position.x, camera.position.y - 200, camera.position.z); }
  if (planet) { planet.material.opacity = Math.max(0, Math.min(1, (h - 0.6) / 0.3)); planet.position.set(camera.position.x + 420, camera.position.y + 180, camera.position.z - 520); }
  sun.position.set(P.x + 40, P.y + 80, P.z + 30); sun.target.position.set(P.x, P.y, P.z);
  hemi.intensity = 1.6 - h * 0.5;
  // Visa bara rörliga saker i närheten
  if ((frame++ & 15) === 0) {
    for (const o of dyn) {
      const v = Math.abs(o.y - P.y) < 70;
      if (o.vis) o.vis.visible = v;
      if (o.group) for (const m of o.group) m.visible = v;
    }
    for (const b of belts) b.mesh.visible = Math.abs(b.y - P.y) < 70;
  }
  // höjdmätaren
  $('hNow').innerHTML = `${Math.max(0, Math.floor(P.y))} <small>m</small>`;
  const H = $('bar').clientHeight - 6;
  $('bar').querySelector('.fill').style.height = Math.max(0, Math.min(1, run.best / TOP)) * H + 'px';
  $('bar').querySelector('.me').style.bottom = Math.max(0, Math.min(1, P.y / TOP)) * H + 'px';
  for (const t of ticks) t.el.classList.toggle('done', portals[t.k] && portals[t.k].chosen >= 0);
}
let frame = 0;
const SKY = ['#8fd3ff', '#7fb8ff', '#8a8cff', '#5b3fbf', '#2a1a6e', '#0d0b2e'].map(c => new THREE.Color(c));
const skyCol = new THREE.Color();
const ticks = [];
for (let k = 0; k < NPORT; k++) { const el = document.createElement('div'); el.className = 'tick'; el.style.bottom = ((k + 1) * SECTION / TOP * 100) + '%'; $('bar').appendChild(el); ticks.push({ el, k }); }

function win() {
  finished = true;
  const first = !run.done;
  run.done = true;
  if (first) giveCoins(GOLD_TOP);
  sPortal(); setTimeout(sPortal, 450);
  for (let i = 0; i < 4; i++) setTimeout(() => sparkle(P.x + (Math.random() - 0.5) * 6, P.y + 3, P.z + (Math.random() - 0.5) * 6, 30, ['#ff5ccf', '#3ee8ff', '#ffd84a', '#8dff5a'][i]), i * 300);
  $('winText').textContent = first ? `Du klättrade hela vägen upp – 1000 meter! Du fick ${GOLD_TOP} guldmynt 🪙` : 'Du klättrade hela vägen upp – 1000 meter!';
  setTimeout(() => $('winBox').classList.add('show'), 1400);
  saveRun();
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
function startRun(fromSave) {
  const saved = player && player.progress && player.progress.torn;
  cpIdx = 0; run.paid = -1; run.done = false; finished = false;
  for (const c of checkpoints) if (c.flag && !c.start) c.flag.cloth.material.color.set('#9a9ab0');
  for (const Pt of portals) { Pt.chosen = -1; Pt.opts = null; Pt.gates.forEach(g => { g.film.material.opacity = 0.45; g.film.material.color.set('#ffffff'); g.frameM.color.set('#ffffff'); g.sign.material.map = unknownTex; g.sign.material.needsUpdate = true; }); Pt.head.material.map = unknownHead; Pt.head.material.needsUpdate = true; }
  lastPortalLz = new Map();
  if (fromSave && saved && saved.cp > 0 && checkpoints[saved.cp]) {
    look = { ...underwear(), ...saved.look };
    run.paid = saved.paid ?? -1;
    cpIdx = saved.cp;
    // tidigare portaler räknas som valda
    for (const Pt of portals) if (Pt.cpOut <= cpIdx) Pt.chosen = 0;
    for (let i = 0; i <= cpIdx; i++) if (checkpoints[i].flag) checkpoints[i].flag.cloth.material.color.set('#5ad04a');
  } else look = underwear();
  run.best = saved ? saved.best || 0 : 0;
  // portalen man är på väg mot får sina val direkt
  preparePortal(portals.find(Pt => Pt.chosen < 0));
  respawn();
  applyLook(look);
  started = true;
  saveRun();
  $('help').classList.add('show'); setTimeout(() => $('help').classList.remove('show'), 7000);
}

buildWorld();
buildCourse();
// Startplattan står på marken framför tornet
respawn();
camera.position.set(P.x + 6, P.y + 4, P.z + 6);
loop();
$('loading').classList.add('hide');
const saved = player && player.progress && player.progress.torn;
if (saved && saved.cp > 0 && !saved.done && checkpoints[saved.cp]) {
  $('startText').textContent = `Du var på ${Math.round(checkpoints[saved.cp].y)} meter. Vill du fortsätta där, eller börja om längst ner i underkläderna?`;
  $('startBox').classList.add('show');
  $('bContinue').onclick = () => { $('startBox').classList.remove('show'); startRun(true); };
  $('bRestart').onclick = () => { $('startBox').classList.remove('show'); startRun(false); };
} else startRun(false);
$('bAgain').onclick = () => { $('winBox').classList.remove('show'); startRun(false); };
$('bMenu').onclick = () => { location.href = 'index.html'; };

// För test
window.Torn = {
  P, checkpoints, portals, boxes, keys, route, dyn, get look() { return look; }, get cp() { return cpIdx; }, get ch() { return ch; }, renderer, scene, camera,
  step(n = 1, dt = 1 / 60) { for (let i = 0; i < n; i++) update(dt); },
  get yaw() { return yaw; }, set yaw(v) { yaw = v; }, set pitch(v) { pitch = v; }, set dist(v) { dist = v; },
  setCp(i) { cpIdx = i; respawn(); }, jump, choose, preparePortal, supportAt, get finished() { return finished; }
};
