/* =========================================================
   Tower hunt – ett bubbelgumstorn 1000 m högt, i stil med Bubble Jump Tower.
   Man börjar i underkläder på bottenvåningen och klättrar våning för våning
   (en våning = 50 m) inne i tornet. Överst på varje våning går man igenom
   en av tre portaler och får det plagget. Man kan dubbelhoppa (en bubbla
   blåses upp under fötterna) och studsa på svävande bubblor.
   Hinder: trappor, hopp mellan plattformar, smala balansgångar, rullband,
   studsbubblor, hissar, flyttande plattformar och snurrande bommar.
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
const PATH_R = 11, WALL_R = 17;                    // banan går runt längs insidan av tornväggen
const RUN = 6.2, WALK = 2.6, GRAVITY = -22, JUMP = 8.4;     // hopp ca 1,6 m högt
const BUBBLE_JUMP = 10.2;                           // hopp från en studsbubbla: ca 2,4 m högt
const AIR_JUMP = 7.6;                               // dubbelhoppet (bubblan) ger ca 1,3 m till
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
const sGum = () => { tone(300, 0.12, 'sine', 0.08, 0, 2.2); tone(1400, 0.06, 'square', 0.03, 0.18); };      // blås + plopp
const sSquish = () => tone(520, 0.12, 'sine', 0.05, 0, 0.6);
const sPop = () => { tone(1200, 0.07, 'square', 0.04); tone(220, 0.3, 'sine', 0.1, 0.02, 3.5); };

/* ---------- Renderare och scen ---------- */
const canvas = $('game');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: !touch });
const MAX_PR = Math.min(window.devicePixelRatio || 1, touch ? 1.5 : 2);
let pixelRatio = MAX_PR;
renderer.setPixelRatio(pixelRatio);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
const scene = new THREE.Scene();
scene.background = new THREE.Color('#bfe6ff');
scene.fog = new THREE.Fog('#bfe6ff', 70, 320);
const camera = new THREE.PerspectiveCamera(62, 1, 0.1, 2200);
const hemi = new THREE.HemisphereLight('#ffffff', '#ffc4ec', 1.7);
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
  return best;
}
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
    // tornväggen runt om (och räcket på taket)
    if (y < TOP + 1.4) { const d = Math.hypot(x, z), m = WALL_R - RAD - 0.05; if (d > m) { x *= m / d; z *= m / d; } }
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
  g.fillStyle = '#8f6fe6'; g.fillRect(0, 0, w, h);
  g.fillStyle = '#ffffff';
  g.beginPath(); g.moveTo(64, 14); g.lineTo(112, 62); g.lineTo(90, 62); g.lineTo(64, 36); g.lineTo(38, 62); g.lineTo(16, 62); g.closePath(); g.fill();
  g.beginPath(); g.moveTo(64, 70); g.lineTo(112, 118); g.lineTo(90, 118); g.lineTo(64, 92); g.lineTo(38, 118); g.lineTo(16, 118); g.closePath(); g.fill();
});
arrowTex.wrapS = arrowTex.wrapT = THREE.RepeatWrapping;
const liftTex = canvasTex(128, 128, (g, w, h) => {
  g.fillStyle = '#ffd3ee'; g.fillRect(0, 0, w, h); g.fillStyle = '#ff8fd0';
  for (let i = -2; i < 4; i++) { g.beginPath(); g.moveTo(i * 48, 0); g.lineTo(i * 48 + 24, 0); g.lineTo(i * 48 + 24 + h, h); g.lineTo(i * 48 + h, h); g.fill(); }
});
liftTex.wrapS = liftTex.wrapT = THREE.RepeatWrapping;
const stripeTex = canvasTex(64, 64, (g, w, h) => { g.fillStyle = '#ffffff'; g.fillRect(0, 0, w, h); g.fillStyle = '#ff6fbf'; g.fillRect(0, 0, w / 2, h); });
stripeTex.wrapS = stripeTex.wrapT = THREE.RepeatWrapping;
const floorTex = canvasTex(128, 128, (g, w, h) => {
  g.fillStyle = '#ffffff'; g.fillRect(0, 0, w, h); g.fillStyle = '#ece3f6'; g.fillRect(0, 0, 64, 64); g.fillRect(64, 64, 64, 64);
  g.fillStyle = 'rgba(255,255,255,.9)'; for (const [x, y] of [[32, 32], [96, 96]]) { g.beginPath(); g.arc(x, y, 9, 0, 7); g.fill(); }
});
floorTex.wrapS = floorTex.wrapT = THREE.RepeatWrapping;
// Såpbubbla: genomskinlig med glänsande kant och en vit blänk
const bubbleTex = canvasTex(128, 128, (g) => {
  const r = g.createRadialGradient(64, 64, 18, 64, 64, 62);
  r.addColorStop(0, 'rgba(255,255,255,0.06)'); r.addColorStop(0.72, 'rgba(255,255,255,0.2)'); r.addColorStop(0.93, 'rgba(255,255,255,0.85)'); r.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = r; g.beginPath(); g.arc(64, 64, 62, 0, 7); g.fill();
  g.lineWidth = 4;
  g.strokeStyle = 'rgba(150,215,255,.7)'; g.beginPath(); g.arc(64, 64, 56, 0.2, 2.2); g.stroke();
  g.strokeStyle = 'rgba(255,160,225,.7)'; g.beginPath(); g.arc(64, 64, 56, 3.2, 5.0); g.stroke();
  g.fillStyle = 'rgba(255,255,255,.95)'; g.beginPath(); g.ellipse(44, 40, 13, 7, -0.7, 0, 7); g.fill();
  g.beginPath(); g.arc(34, 56, 3.5, 0, 7); g.fill();
});
const blobTex = canvasTex(64, 64, (g) => { const r = g.createRadialGradient(32, 32, 2, 32, 32, 30); r.addColorStop(0, 'rgba(90,40,120,.45)'); r.addColorStop(1, 'rgba(90,40,120,0)'); g.fillStyle = r; g.fillRect(0, 0, 64, 64); });
const glowTex = canvasTex(64, 64, (g) => { const r = g.createRadialGradient(32, 32, 1, 32, 32, 31); r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(0.4, 'rgba(255,255,255,.5)'); r.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = r; g.fillRect(0, 0, 64, 64); });

/* ---------- Banan byggs: våning för våning inne i ett runt torn ---------- */
// Pastellfärger per våning: [plattform, ljus, vägg]
const THEMES = [
  ['#ff8fd0', '#ffd3ee', '#ffe3f3'],   // rosa bubbelgum
  ['#5fdcb6', '#c4f7e5', '#dcfbf0'],   // mint
  ['#ad92ff', '#e2d8ff', '#ece6ff'],   // lavendel
  ['#ffa577', '#ffd9c4', '#ffeadf'],   // persika
  ['#ffcf4d', '#fff0b3', '#fff6d6'],   // citron
  ['#74c2ff', '#cfe9ff', '#e2f2ff']    // himmelsblå
];
let T = THEMES[0], G = null;                         // aktuell färg och grupp (statiska delar slås ihop per våning)
const sections = [];
const dyn = [];                                     // rörliga plattformar
const spinners = [];
const belts = [];
const checkpoints = [];
const portals = [];
const bubbles = [];                                 // studsbubblor
const cur = { x: PATH_R, y: 0, z: 0 };
const fx = new THREE.Group(); scene.add(fx);          // saker som rör sig/lyser (slås inte ihop)

function mesh(geo, mat, x, y, z, yaw = 0, parent = G) {
  const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.rotation.y = yaw; parent.add(m); return m;
}
// Mjuk "godisbit": låda med rundade hörn och kanter
function roundBox(w, h, l) {
  const b = Math.min(0.12, h * 0.3), r = Math.min(0.35, w * 0.25, l * 0.25);
  const x0 = -w / 2 + b, x1 = w / 2 - b, z0 = -l / 2 + b, z1 = l / 2 - b;
  const rr = Math.max(0.02, Math.min(r, (x1 - x0) / 2 - 0.01, (z1 - z0) / 2 - 0.01));
  const s = new THREE.Shape();
  s.moveTo(x0 + rr, z0); s.lineTo(x1 - rr, z0); s.quadraticCurveTo(x1, z0, x1, z0 + rr);
  s.lineTo(x1, z1 - rr); s.quadraticCurveTo(x1, z1, x1 - rr, z1);
  s.lineTo(x0 + rr, z1); s.quadraticCurveTo(x0, z1, x0, z1 - rr);
  s.lineTo(x0, z0 + rr); s.quadraticCurveTo(x0, z0, x0 + rr, z0);
  const g = new THREE.ExtrudeGeometry(s, { depth: Math.max(0.01, h - 2 * b), bevelEnabled: true, bevelThickness: b, bevelSize: b, bevelSegments: 1, curveSegments: 3 });
  g.rotateX(Math.PI / 2); g.translate(0, (h - 2 * b) / 2, 0);
  return g;
}
const route = [];                                   // alla plattformar i ordning (för test av banan)
let curKind = 'start';
// Plattform med ovansidan på höjden top
function platform(x, top, z, w, l, yaw, color, { thick = 0.7, ...opts } = {}) {
  const b = addBox({ x, y: top - thick / 2, z, hx: w / 2, hy: thick / 2, hz: l / 2, yaw, ...opts });
  route.push({ b, kind: curKind });
  mesh(roundBox(w, thick, l), lam(color), x, top - thick / 2, z, yaw);
  return b;
}
// Riktning framåt: siktar på en punkt på spiralen (cirkeln längs tornväggen) en bit fram
function dirAhead(len) {
  const a = Math.atan2(cur.z, cur.x) + Math.max(0.6, len) / PATH_R;
  const dx = Math.cos(a) * PATH_R - cur.x, dz = Math.sin(a) * PATH_R - cur.z, L = Math.hypot(dx, dz) || 1;
  return { x: dx / L, z: dz / L, yaw: Math.atan2(dx / L, dz / L), lx: dz / L, lz: -dx / L };
}
const along = (d, dist, lat = 0) => ({ x: cur.x + d.x * dist + d.lx * lat, z: cur.z + d.z * dist + d.lz * lat });
function advance(d, dist, dy = 0) { cur.x += d.x * dist; cur.z += d.z * dist; cur.y += dy; }

function pLanding(size = 3) { const d = dirAhead(size), p = along(d, size / 2); platform(p.x, cur.y, p.z, Math.max(3, size), size, d.yaw, T[0]); advance(d, size); }
function pStairs(n, rise, w = 3, landing = true) {
  curKind = 'stairs';
  const run = 0.8, d = dirAhead(n * run), S = { x: cur.x, z: cur.z, y: cur.y, d, run, n, rise };
  for (let i = 1; i <= n; i++) {
    const p = along(d, run * (i - 0.5));
    platform(p.x, cur.y + rise * i, p.z, w, run + 0.02, d.yaw, i % 2 ? T[0] : T[1], { thick: Math.min(1.2, 0.5 + rise * 1.5) });
  }
  advance(d, n * run, rise * n);
  if (landing) pLanding(2.4);
  return S;
}
function pJumps(n, gap, rise, size, zig = 0) {
  curKind = 'jumps';
  for (let i = 0; i < n; i++) {
    const d = dirAhead(gap + size), lat = zig ? (i % 2 ? zig : -zig) : 0;
    const p = along(d, gap + size / 2, lat);
    platform(p.x, cur.y + rise, p.z, size, size, d.yaw, i % 2 ? T[0] : T[1]);
    advance(d, gap + size, rise);
  }
  pLanding(3);
}
function pBeam(len, w) {
  curKind = 'beam';
  const d = dirAhead(len), p = along(d, len / 2);
  platform(p.x, cur.y, p.z, w, len, d.yaw, '#ffffff', { thick: 0.35 });
  advance(d, len);
  pLanding(3);
}
function pBelt(len, mode, speed) {
  curKind = 'belt';
  const w = 3, d = dirAhead(len), p = along(d, len / 2);
  const b = platform(p.x, cur.y, p.z, w, len, d.yaw, '#8f6fe6');
  // Pilarna på bandet visar åt vilket håll det går
  const holder = new THREE.Group(); holder.position.set(p.x, cur.y + 0.03, p.z); holder.rotation.y = d.yaw; fx.add(holder);
  let geo, push;
  if (mode === 'back') { geo = new THREE.PlaneGeometry(w - 0.3, len - 0.3); geo.rotateX(-Math.PI / 2); push = [0, -1]; }
  else { const sg = R() < 0.5 ? 1 : -1; geo = new THREE.PlaneGeometry(len - 0.3, w - 0.3); geo.rotateX(-Math.PI / 2); geo.rotateY(sg * Math.PI / 2); push = [-sg, 0]; }
  const tex = arrowTex.clone(); tex.needsUpdate = true;
  if (mode === 'back') tex.repeat.set((w - 0.3) / 1.4, (len - 0.3) / 1.4); else tex.repeat.set((len - 0.3) / 1.4, (w - 0.3) / 1.4);
  holder.add(new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ map: tex })));
  const [wx, wz] = [push[0] * b.c + push[1] * b.s, -push[0] * b.s + push[1] * b.c];
  b.belt = { vx: wx * speed, vz: wz * speed };
  belts.push({ tex, speed, mesh: holder, y: cur.y });
  advance(d, len);
  pLanding(3);
}
/* Studsbubblor: man hoppar upp på den första, sedan studsar man från bubbla till bubbla (de smäller) */
function pBubbles(dh) {
  curKind = 'bubbles';
  const first = 1.0, n = Math.max(3, Math.min(6, Math.round((dh - first) / 1.7))), step = (dh - first) / n;   // ≤ 1,85 m mellan bubblorna
  const list = [];
  let top = cur.y + first;
  for (let i = 0; i < n; i++) {
    const d = dirAhead(i === 0 ? 2.6 : 3.0), p = along(d, i === 0 ? 2.6 : 3.0);
    const b = addBox({ x: p.x, y: top - 0.15, z: p.z, hx: 0.8, hy: 0.15, hz: 0.8, yaw: d.yaw });
    route.push({ b, kind: 'bubble' });
    const spr = new THREE.Sprite(new THREE.SpriteMaterial({ map: bubbleTex, color: ['#ffd1f0', '#d6f6ff', '#e9dcff', '#fff0c4'][i % 4], transparent: true, depthWrite: false }));
    spr.position.set(p.x, top - 0.85, p.z); spr.scale.setScalar(2.2); fx.add(spr);
    const bub = { b, spr, x: p.x, y: top - 0.85, z: p.z, popT: 0, ph: R() * 6 };
    b.bubble = bub; bubbles.push(bub); list.push(b);
    dyn.push({ vis: spr, y: top });
    cur.x = p.x; cur.z = p.z; cur.y = top;
    top += step;
  }
  // landningsplatta efter sista bubblan
  const d = dirAhead(3.6), p = along(d, 3.6);
  curKind = 'bubbles';
  const land = platform(p.x, cur.y + step, p.z, 3.4, 3.4, d.yaw, T[0]);
  cur.x = p.x + d.x * 1.7; cur.z = p.z + d.z * 1.7; cur.y += step;
  pLanding(2.4);
}
function pLift(dh) {
  curKind = 'lift';
  const size = 2.8, gap = 0.2;
  const d = dirAhead(size + gap), p = along(d, gap + size / 2);
  const y0 = cur.y, y1 = cur.y + dh;
  const b = addBox({ x: p.x, y: y0 - 0.35, z: p.z, hx: size / 2, hy: 0.35, hz: size / 2, yaw: d.yaw, dyn: true, ymin: y0 - 0.35, ymax: y1 - 0.35 });
  route.push({ b, kind: 'liftcar', y0, y1 });
  const m = new THREE.Mesh(roundBox(size, 0.7, size), new THREE.MeshLambertMaterial({ map: liftTex }));
  m.rotation.y = d.yaw; fx.add(m);
  for (const s of [-1, 1]) { const q = along(d, gap + size / 2, s * (size / 2 + 0.25)); mesh(new THREE.CylinderGeometry(0.1, 0.1, dh + 3, 8), lam('#ffffff'), q.x, y0 + (dh + 3) / 2 - 0.7, q.z); }
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
  curKind = 'lift';
  pLanding(3);
}
function pMover(gap) {
  curKind = 'mover';
  const size = 2.6, d = dirAhead(gap);
  const a = along(d, size / 2 + 0.15), c = along(d, gap - size / 2 - 0.15), y = cur.y;
  const b = addBox({ x: a.x, y: y - 0.35, z: a.z, hx: size / 2, hy: 0.35, hz: size / 2, yaw: d.yaw, dyn: true });
  route.push({ b, kind: 'movercar', a, c });
  const m = new THREE.Mesh(roundBox(size, 0.7, size), lam('#74e0ff'));
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
  curKind = 'mover';
  pLanding(3);
}
function pSpinner(speed) {
  curKind = 'spinner';
  const size = 7, d = dirAhead(size), p = along(d, size / 2);
  platform(p.x, cur.y, p.z, size, size, d.yaw, T[1]);
  const pivot = new THREE.Group(); pivot.position.set(p.x, cur.y + 0.55, p.z); fx.add(pivot);
  pivot.add(new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.55, 1.1, 16), lam('#ffffff')));
  const tex = stripeTex.clone(); tex.needsUpdate = true; tex.repeat.set(8, 1);
  const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 6.4, 12), new THREE.MeshLambertMaterial({ map: tex }));
  bar.rotation.z = Math.PI / 2; pivot.add(bar);
  spinners.push({ x: p.x, z: p.z, y: cur.y + 0.55, len: 3.2, r: 0.22, w: speed * (R() < 0.5 ? 1 : -1), a: R() * 6, pivot });
  dyn.push({ vis: pivot, y: cur.y });
  advance(d, size);
  pLanding(2.6);
}
function flagMesh(x, y, z, yaw) {
  const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.y = yaw; fx.add(g);
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 2.6, 8), lam('#ffffff')); pole.position.set(0, 1.3, 0); g.add(pole);
  const shape = new THREE.Shape(); shape.moveTo(0, 0); shape.lineTo(1.1, -0.35); shape.lineTo(0, -0.7); shape.closePath();
  const cloth = new THREE.Mesh(new THREE.ShapeGeometry(shape), new THREE.MeshLambertMaterial({ color: '#c9c3df', side: THREE.DoubleSide }));
  cloth.position.set(0.05, 2.55, 0); g.add(cloth);
  return { g, cloth };
}
function pCheckpoint(start = false) {
  curKind = 'cp';
  const size = 4, d = dirAhead(size), p = along(d, size / 2);
  const b = platform(p.x, cur.y, p.z, size, size, d.yaw, '#ffffff');
  const glow = mesh(new THREE.CylinderGeometry(1.2, 1.2, 0.06, 28), new THREE.MeshBasicMaterial({ color: start ? '#ffd84a' : '#7ff0c0' }), p.x, cur.y + 0.04, p.z, 0, fx);
  const q = along(d, size / 2, size / 2 - 0.4);
  const flag = flagMesh(q.x, cur.y, q.z, d.yaw);
  b.cp = checkpoints.length;
  checkpoints.push({ x: p.x, y: cur.y, z: p.z, heading: Math.atan2(d.x, d.z), flag, glow, start, ri: route.length });
  dyn.push({ vis: flag.g, y: cur.y });
  advance(d, size);
}

/* Golv mellan våningarna: en rund skiva med ett hål där trappan kommer upp underifrån */
const FLOOR_T = 1.0;
function slab(y, hole, theme) {
  const R2 = WALL_R + PATH_R + 3;
  if (hole) {
    const { ox, oz, yaw, x0, x1, z0, z1 } = hole, c = Math.cos(yaw), s = Math.sin(yaw);
    const W = (lx, lz) => [ox + lx * c + lz * s, oz - lx * s + lz * c];
    const part = (a0, a1, b0, b1) => { const [x, z] = W((a0 + a1) / 2, (b0 + b1) / 2); addBox({ x, y: y - FLOOR_T / 2, z, hx: (a1 - a0) / 2, hy: FLOOR_T / 2, hz: (b1 - b0) / 2, yaw, floor: true }); };
    part(-R2, x0, -R2, R2); part(x1, R2, -R2, R2); part(x0, x1, -R2, z0); part(x0, x1, z1, R2);
  } else addBox({ x: 0, y: y - FLOOR_T / 2, z: 0, hx: R2, hy: FLOOR_T / 2, hz: R2, yaw: 0, floor: true });
  // utseende: rund skiva (hålet urklippt)
  const shp = new THREE.Shape(); shp.absarc(0, 0, WALL_R + 0.05, 0, Math.PI * 2, false);
  if (hole) {
    const { ox, oz, yaw, x0, x1, z0, z1 } = hole, c = Math.cos(yaw), s = Math.sin(yaw);
    const W = (lx, lz) => new THREE.Vector2(ox + lx * c + lz * s, oz - lx * s + lz * c);
    const h = new THREE.Path(); const pts = [W(x0, z0), W(x0, z1), W(x1, z1), W(x1, z0)];
    h.moveTo(pts[0].x, pts[0].y); for (const q of pts.slice(1)) h.lineTo(q.x, q.y); h.closePath();
    shp.holes.push(h);
  }
  const g = new THREE.ExtrudeGeometry(shp, { depth: FLOOR_T, bevelEnabled: false, curveSegments: 40 });
  g.rotateX(Math.PI / 2);
  const tex = floorTex.clone(); tex.needsUpdate = true; tex.repeat.set(0.25, 0.25);
  const m = new THREE.Mesh(g, [new THREE.MeshLambertMaterial({ map: tex, color: theme[1] }), lam(theme[0])]);
  m.position.y = y; scene.add(m);
  return m;
}
/* Portalvägg tvärs över golvet (genom tornets mitt) med tre portaler där banan går */
function pPortal(k, y, ang) {
  curKind = 'portal';
  const u = { x: Math.cos(ang), z: Math.sin(ang) }, t = { x: -Math.sin(ang), z: Math.cos(ang) };   // längs väggen / framåt
  const W2 = (lx, lz) => [u.x * lx + t.x * lz, u.z * lx + t.z * lz];
  const Pt = { k, x: u.x * PATH_R, z: u.z * PATH_R, y, u, t, gates: [], chosen: -1, opts: null, cat: null };
  const wallH = 5.0, open = 3.3, yawW = -ang;
  const wall = (x0, x1, y0, y1, color) => {
    const [wx, wz] = W2((x0 + x1) / 2, 0);
    addBox({ x: wx, y: y + (y0 + y1) / 2, z: wz, hx: (x1 - x0) / 2, hy: (y1 - y0) / 2, hz: 0.3, yaw: yawW });
    mesh(roundBox(x1 - x0, y1 - y0, 0.6), lam(color), wx, y + (y0 + y1) / 2, wz, yawW, G);
  };
  const g0 = PATH_R - 3.3, g1 = PATH_R, g2 = PATH_R + 3.3;
  wall(-WALL_R, -0.6, 0, 3.4, T[0]); wall(-WALL_R, -0.6, 3.4, 3.8, '#ffffff');      // bortre halvan: lägre (går inte att hoppa över)
  for (const [x0, x1] of [[-0.6, g0 - 1.1], [g0 + 1.1, g1 - 1.1], [g1 + 1.1, g2 - 1.1], [g2 + 1.1, WALL_R]]) wall(x0, x1, 0, wallH, T[0]);
  for (const gx of [g0, g1, g2]) wall(gx - 1.1, gx + 1.1, open, wallH, T[0]);
  wall(-0.6, WALL_R, wallH, wallH + 0.5, '#ffffff');
  [g0, g1, g2].forEach(gx => {
    const [fx0, fz0] = W2(gx, 0);
    const film = new THREE.Mesh(new THREE.PlaneGeometry(2.2, open), new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.45, side: THREE.DoubleSide, depthWrite: false }));
    film.position.set(fx0, y + open / 2, fz0); film.rotation.y = yawW; fx.add(film);
    const frameM = new THREE.MeshBasicMaterial({ color: '#ffffff' });
    const fr = new THREE.Group(); fr.position.set(fx0, y, fz0); fr.rotation.y = yawW; fx.add(fr);
    for (const [bx, by, bw, bh] of [[-1.15, open / 2, 0.16, open], [1.15, open / 2, 0.16, open], [0, open + 0.02, 2.46, 0.16]]) {
      const bar = new THREE.Mesh(new THREE.BoxGeometry(bw, bh, 0.7), frameM); bar.position.set(bx, by, 0); fr.add(bar);
    }
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 1.3), new THREE.MeshBasicMaterial({ map: unknownTex, transparent: true }));
    const [sx, sz] = W2(gx, -0.36); sign.position.set(sx, y + (open + wallH) / 2 + 0.05, sz); sign.rotation.y = Math.PI - ang; fx.add(sign);
    Pt.gates.push({ lx: gx, film, frameM, sign, fr });
  });
  const head = new THREE.Mesh(new THREE.PlaneGeometry(7.5, 1.6), new THREE.MeshBasicMaterial({ map: unknownHead, transparent: true }));
  const [hx, hz] = W2(g1, -0.42); head.position.set(hx, y + wallH + 1.35, hz); head.rotation.y = Math.PI - ang; fx.add(head);
  Pt.head = head;
  // höjdskylt på golvet framför portalerna
  const [nx, nz] = W2(g0 - 2.6, -2.4);                                   // vid sidan om, där trappan inte kommer upp
  const num = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 1.2), new THREE.MeshBasicMaterial({ map: canvasTex(256, 96, (g, w, h) => { g.fillStyle = '#ff5ccf'; g.font = 'bold 76px Fredoka, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText((k + 1) * SECTION + ' m', w / 2, h / 2 + 4); }), transparent: true }));
  num.rotation.x = -Math.PI / 2; num.rotation.z = Math.atan2(t.x, t.z) + Math.PI; num.position.set(nx, y + 0.03, nz); fx.add(num);
  // checkpoints före och efter väggen
  const [ix, iz] = W2(g1, -2.8), [ox, oz] = W2(g1, 2.8);
  const hd = Math.atan2(t.x, t.z);
  Pt.cpIn = checkpoints.length; checkpoints.push({ x: ix, y, z: iz, heading: hd, portal: Pt, ri: route.length });
  Pt.cpOut = checkpoints.length; checkpoints.push({ x: ox, y, z: oz, heading: hd, portal: Pt, after: true, ri: route.length });
  portals.push(Pt);
  dyn.push({ vis: null, y, group: [head, num, ...Pt.gates.flatMap(g => [g.film, g.sign, g.fr])] });
  // banan fortsätter efter väggen
  cur.x = ox; cur.z = oz; cur.y = y;
}
const unknownTex = canvasTex(256, 128, (g, w, h) => {
  g.fillStyle = 'rgba(120,60,170,.88)'; roundRectP(g, 4, 4, w - 8, h - 8, 26); g.fill();
  g.strokeStyle = '#fff'; g.lineWidth = 6; g.stroke();
  g.fillStyle = '#fff'; g.font = 'bold 84px Fredoka, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('?', w / 2, h / 2 + 6);
});
const unknownHead = canvasTex(512, 110, (g, w, h) => {
  g.fillStyle = 'rgba(120,60,170,.88)'; roundRectP(g, 4, 4, w - 8, h - 8, 40); g.fill();
  g.strokeStyle = '#ffd84a'; g.lineWidth = 6; g.stroke();
  g.fillStyle = '#ffd84a'; g.font = 'bold 56px Fredoka, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('Portal ✨', w / 2, h / 2 + 4);
});
function roundRectP(g, x, y, w, h, r) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }

/* Bygg hela banan: våning för våning (en våning = 50 m) */
const floors = [];
function buildCourse() {
  G = new THREE.Group(); scene.add(G); sections.push(G);
  floors.push(slab(0, null, THEMES[0]));
  cur.x = PATH_R; cur.z = 0; cur.y = 0.3;
  pCheckpoint(true);
  for (let s = 0; s < TOP / SECTION; s++) {
    if (s > 0) { G = new THREE.Group(); scene.add(G); sections.push(G); }
    T = THEMES[s % THEMES.length];
    const k = s / 19, y1 = (s + 1) * SECTION;
    let lastCp = cur.y, lastChallenge = '', lastClimb = '', turn = s > 0 ? 1 : 0;
    const climbs = s < 1 ? ['stairs', 'jumpsUp', 'bubbles', 'stairs'] : s < 3 ? ['stairs', 'jumpsUp', 'bubbles', 'lift'] : ['stairs', 'jumpsUp', 'bubbles', 'lift', 'zigzag', 'bubbles'];
    const challenges = s < 1 ? ['beam', 'jumps'] : s < 2 ? ['beam', 'jumps', 'belt', 'mover'] : ['beam', 'jumps', 'belt', 'mover', 'spinner', 'bigjump'];
    while (cur.y < y1 - 9.5) {
      if (turn++ % 2 === 0) {
        let c; do { c = challenges[ri(0, challenges.length - 1)]; } while (c === lastChallenge && challenges.length > 1);
        lastChallenge = c;
        if (c === 'beam') pBeam(rr(6, 9 + 3 * k), 0.95 - 0.35 * k);
        else if (c === 'jumps') pJumps(ri(3, 5), rr(1.1, 1.5 + 0.4 * k), 0, 2.6 - 0.6 * k);
        else if (c === 'bigjump') pJumps(ri(2, 3), rr(2.8, 3.4), 0, 2.8);          // långa hopp: använd dubbelhoppet!
        else if (c === 'belt') pBelt(rr(8, 11), R() < 0.55 ? 'side' : 'back', R() < 0.5 ? 1.5 + 1.2 * k : 2.0 + 1.4 * k);
        else if (c === 'mover') pMover(rr(6, 8 + 2 * k));
        else if (c === 'spinner') pSpinner(1.0 + 0.7 * k);
      } else {
        const room = y1 - cur.y - 4.6;              // plats kvar under taket (huvudet får inte slå i)
        let c; do { c = climbs[ri(0, climbs.length - 1)]; } while (c === lastClimb && climbs.length > 1);
        if (turn === 2 && s > 0) c = ['bubbles', 'lift', 'stairs'][ri(0, s < 3 ? 0 : 2)];   // första klättringen efter portalen: hög
        if (turn === 2 && s > 0 && c === 'stairs') { pStairs(15, 0.42); lastClimb = c; if (cur.y - lastCp >= 9 && cur.y < y1 - 9.5) { pCheckpoint(); lastCp = cur.y; } continue; }
        lastClimb = c;
        if (c === 'bubbles') pBubbles(Math.min(room, rr(8, 12)));
        else if (c === 'lift') pLift(Math.min(room, rr(8, 12)));
        else if (c === 'stairs') { const n = Math.max(4, Math.min(ri(10, 15), Math.floor(room / 0.42))); pStairs(n, 0.42); }
        else if (c === 'zigzag') { const rise = 0.6 + 0.2 * k, n = Math.max(2, Math.min(ri(4, 6), Math.floor(room / rise))); pJumps(n, rr(1.0, 1.4), rise, 1.6, 1.2); }
        else { const rise = 0.7 + 0.2 * k, n = Math.max(2, Math.min(ri(4, 6), Math.floor(room / rise))); pJumps(n, rr(1.1, 1.4 + 0.3 * k), rise, 2.6 - 0.5 * k); }
      }
      if (cur.y - lastCp >= 9 && cur.y < y1 - 9.5) { pCheckpoint(); lastCp = cur.y; }
    }
    // sista biten: en trappa upp genom hålet i taket
    const rem = y1 - cur.y, n = Math.max(2, Math.ceil(rem / 0.43));
    const S = pStairs(n, rem / n, 3, false);
    const i0 = Math.max(1, Math.ceil((y1 - 3.4 - S.y) / S.rise));        // första trappsteget där huvudet når taket
    const nextTheme = THEMES[(s + 1) % THEMES.length];
    floors.push(slab(y1, { ox: S.x, oz: S.z, yaw: S.d.yaw, x0: -1.9, x1: 1.9, z0: S.run * (i0 - 1) - 0.5, z1: S.run * n + 0.15 }, s < 19 ? nextTheme : ['#ffd84a', '#fff0b3']));
    const arrive = Math.atan2(cur.z, cur.x);
    if (s < NPORT) { G = new THREE.Group(); scene.add(G); sections.push(G); T = nextTheme; pPortal(s, y1, arrive + 3.4 / PATH_R); }
  }
  // Slå ihop allt statiskt per våning (få ritanrop)
  for (const g of sections) mergeStatic(g);
}

/* ---------- Tornet, marken och himlen ---------- */
function buildWorld() {
  // tornväggar med runda fönster (man ser himlen och molnen genom dem)
  const wallTex = canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = '#ffffff'; g.fillRect(0, 0, w, h);
    g.fillStyle = 'rgba(255,170,220,.35)';
    for (let y = 16; y < h; y += 48) for (let x = (y / 48) % 2 ? 40 : 16; x < w; x += 48) { g.beginPath(); g.arc(x, y, 7, 0, 7); g.fill(); }
    g.fillStyle = 'rgba(255,255,255,1)'; g.beginPath(); g.arc(128, 120, 64, 0, 7); g.fill();
    g.globalCompositeOperation = 'destination-out'; g.beginPath(); g.arc(128, 120, 54, 0, 7); g.fill();
    g.globalCompositeOperation = 'source-over';
    g.strokeStyle = '#ffffff'; g.lineWidth = 6; g.beginPath(); g.moveTo(128, 66); g.lineTo(128, 174); g.moveTo(74, 120); g.lineTo(182, 120); g.stroke();
  });
  wallTex.wrapS = wallTex.wrapT = THREE.RepeatWrapping; wallTex.repeat.set(9, 3.5);
  for (let i = 0; i < TOP / SECTION; i++) {
    const th = THEMES[i % THEMES.length];
    const w = new THREE.Mesh(new THREE.CylinderGeometry(WALL_R + 0.1, WALL_R + 0.1, SECTION, 48, 1, true), new THREE.MeshLambertMaterial({ map: wallTex, color: th[1], side: THREE.DoubleSide, alphaTest: 0.5 }));
    w.position.y = i * SECTION + SECTION / 2; scene.add(w);
  }
  // tinnar runt taket
  const tinM = lam('#ffffff');
  for (let i = 0; i < 28; i++) {
    const a = i / 28 * Math.PI * 2;
    const m = new THREE.Mesh(roundBox(2.2, 1.4, 0.9), i % 2 ? tinM : lam('#ff8fd0')); m.position.set(Math.cos(a) * (WALL_R + 0.2), TOP, Math.sin(a) * (WALL_R + 0.2)); m.rotation.y = -a + Math.PI / 2; scene.add(m);
  }
  // pokalen på taket
  const cupM = new THREE.MeshStandardMaterial({ color: '#ffcf3a', metalness: 0.8, roughness: 0.25, emissive: '#ff9f00', emissiveIntensity: 0.25 });
  const cup = new THREE.Group(); cup.position.set(0, TOP, 0); scene.add(cup);
  const c1 = new THREE.Mesh(new THREE.CylinderGeometry(1.4, 1.8, 0.8, 24), cupM); c1.position.y = 0.4; cup.add(c1);
  const c2 = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.5, 1.6, 16), cupM); c2.position.y = 1.6; cup.add(c2);
  const c3 = new THREE.Mesh(new THREE.CylinderGeometry(1.7, 0.6, 2.2, 24, 1, true), cupM); c3.position.y = 3.4; cup.add(c3);
  for (const s of [-1, 1]) { const h = new THREE.Mesh(new THREE.TorusGeometry(0.6, 0.14, 8, 20, Math.PI), cupM); h.position.set(s * 1.75, 3.5, 0); h.rotation.z = s > 0 ? -Math.PI / 2 : Math.PI / 2; cup.add(h); }
  addBox({ x: 0, y: TOP + 2, z: 0, hx: 1.6, hy: 2, hz: 1.6, yaw: 0 });
  topCup = cup;
  // marken utanför tornet
  const ground = new THREE.Mesh(new THREE.CircleGeometry(260, 64), lam('#9be37a')); ground.rotation.x = -Math.PI / 2; ground.position.y = -0.05; scene.add(ground);
  const rnd = seeded(7);
  const trunkG = new THREE.CylinderGeometry(0.35, 0.45, 2.4, 8), crownG = new THREE.SphereGeometry(2, 10, 8);
  const tr = new THREE.Group();
  for (let i = 0; i < 70; i++) {
    const a = rnd() * Math.PI * 2, d = 30 + rnd() * 170, x = Math.cos(a) * d, z = Math.sin(a) * d, s = 0.8 + rnd() * 0.9;
    const t = new THREE.Mesh(trunkG, lam('#b07a52')); t.position.set(x, 1.2 * s, z); t.scale.setScalar(s); tr.add(t);
    const c = new THREE.Mesh(crownG, lam(['#ff9ad5', '#9be37a', '#c9a8ff', '#7fd8ff'][i % 4])); c.position.set(x, 3.8 * s, z); c.scale.setScalar(s); tr.add(c);
  }
  scene.add(tr); mergeStatic(tr);
  // moln runt tornet (syns genom fönstren)
  const cloudTex = canvasTex(128, 64, (g) => { g.fillStyle = '#fff'; for (const [x, y, r] of [[34, 38, 22], [60, 30, 28], [90, 38, 22], [64, 44, 20]]) { g.beginPath(); g.arc(x, y, r, 0, 7); g.fill(); } });
  const cm = new THREE.SpriteMaterial({ map: cloudTex, transparent: true, opacity: 0.95, depthWrite: false });
  for (let i = 0; i < 110; i++) {
    const a = rnd() * Math.PI * 2, d = 30 + rnd() * 150, s = new THREE.Sprite(cm);
    s.position.set(Math.cos(a) * d, rnd() * 1050, Math.sin(a) * d); s.scale.set(24 + rnd() * 30, 10 + rnd() * 10, 1); scene.add(s);
  }
  // stjärnor (syns högt upp)
  const sp = [];
  for (let i = 0; i < 900; i++) { const u = rnd() * 2 - 1, a = rnd() * Math.PI * 2, r = 900; sp.push(Math.sqrt(1 - u * u) * Math.cos(a) * r, Math.abs(u) * r * 0.9 + 40, Math.sqrt(1 - u * u) * Math.sin(a) * r); }
  const sg = new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.Float32BufferAttribute(sp, 3));
  stars = new THREE.Points(sg, new THREE.PointsMaterial({ color: '#ffffff', size: 2.2, sizeAttenuation: false, transparent: true, opacity: 0, fog: false, depthWrite: false }));
  scene.add(stars);
  planet = new THREE.Mesh(new THREE.SphereGeometry(60, 32, 16), new THREE.MeshBasicMaterial({ color: '#ff9ad5', fog: false, transparent: true, opacity: 0 }));
  scene.add(planet);
  // bubblor som svävar uppåt inne i tornet (pynt)
  for (const [n, size, col] of [[46, 0.8, '#ffffff'], [18, 1.9, '#ffe6f6']]) {
    const pos = new Float32Array(n * 3), meta = [];
    for (let i = 0; i < n; i++) meta.push({ a: rnd() * Math.PI * 2, r: 2 + rnd() * 13, y: rnd() * 40, v: 0.5 + rnd() * 0.9, w: rnd() * 6 });
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const pts = new THREE.Points(geo, new THREE.PointsMaterial({ map: bubbleTex, color: col, size, transparent: true, depthWrite: false, alphaTest: 0.02 }));
    pts.frustumCulled = false; scene.add(pts);
    floaters.push({ pts, meta, pos });
  }
}
let stars = null, planet = null, topCup = null;
const floaters = [];


/* ---------- Gubben ---------- */
const P = { x: 0, y: 0, z: 0, vx: 0, vz: 0, vy: 0, grounded: true, on: null, heading: 0, speed: 0, coyote: 0, launch: 0, airT: 0, airJumps: 1 };
let ch = null, look = underwear(), buildId = 0;
let anim = null, lastMoving = false;
function playAnim(name, fade, restart = false) {
  if (!ch || (anim === name && !restart)) return;
  anim = name; ch.play(name, fade);
}
async function applyLook(next, puff = false) {
  const id = ++buildId;
  const c = await createCharacter(next, gender);
  if (id !== buildId) { c.dispose(); return; }
  if (ch) { scene.remove(ch.root); ch.dispose(); }
  ch = c; scene.add(c.root);
  anim = null; playAnim(P.grounded ? (lastMoving ? 'run' : 'idle') : 'jump', 0);   // nya kläder: fortsätt med samma rörelse
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
  Save.updatePlayer(player.id, p => { p.progress.torn = { v: 2, cp: cpIdx, look, paid: run.paid, best: Math.max(run.best, (p.progress.torn || {}).best || 0), done: run.done, at: Date.now() }; });
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
  P.x = c.x; P.z = c.z; P.y = c.y; P.vx = P.vz = P.vy = 0; P.grounded = true; P.on = null; P.launch = 0; P.airT = 0; lastBubble = null;
  P.heading = c.heading; yaw = c.heading + Math.PI; camSnap = true; visY = P.y; playAnim('idle', 0);
  const f = $('flash'); f.classList.add('on'); requestAnimationFrame(() => requestAnimationFrame(() => f.classList.remove('on')));
}

/* ---------- Kamera och styrning (som i Guldmyntsjakten) ---------- */
let yaw = Math.PI, pitch = 0.3, dist = 6.5, camSnap = true;
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
function releaseStick() { stick.id = null; stick.x = stick.y = 0; $('joy').classList.remove('show'); $('knob').style.transform = ''; }
// håller bara koll på fingrar som faktiskt ligger kvar på skärmen
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
  if (!started || finished) return;
  if (P.grounded || P.coyote > 0) doJump();
  else if (P.airJumps > 0) airJump();                                     // dubbelhopp med bubbla
  else jumpBuf = 0.15;                                                    // lite förlåtande: hoppet "sparas" en kort stund
}
function doJump() {
  const from = P.on || (P.coyote > 0 ? P.coyoteOn : null);
  const bub = from && from.bubble && !from.ghost ? from.bubble : null;
  P.vy = bub ? BUBBLE_JUMP : JUMP; P.grounded = false; P.coyote = 0; P.on = null; jumpBuf = 0; P.airJumps = 1;
  playAnim('jump', 0.08, true);
  if (bub) { bub.squash = 1; sBoing(); } else sJump();
}
/* Studsbubblor: man landar och står på dem, hoppar själv (extra högt).
   Bubblan man hoppade ifrån smäller när man landar någon annanstans – och kommer tillbaka efter en stund. */
let lastBubble = null;
function popBubble(b) {
  const u = b.bubble; if (!u || b.ghost) return;
  u.popT = 2.6; b.ghost = true; u.spr.visible = false; u.squash = 0;
  sparkle(u.x, u.y + 0.3, u.z, 12, '#ffc4ec'); sPop();
}
function airJump() {
  P.airJumps = 0; P.vy = AIR_JUMP; P.launch = 0; jumpBuf = 0;
  playAnim('jump', 0.05, true);
  gumBubble(); sGum();
}
/* Bubbelgumsbubblan under fötterna vid dubbelhopp: blåses upp och smäller */
const gums = [];
const gumTex = canvasTex(128, 128, (g) => {
  const r = g.createRadialGradient(50, 48, 6, 64, 64, 62);
  r.addColorStop(0, 'rgba(255,215,240,0.95)'); r.addColorStop(0.55, 'rgba(255,128,200,0.85)'); r.addColorStop(0.95, 'rgba(240,70,170,0.95)'); r.addColorStop(1, 'rgba(240,70,170,0)');
  g.fillStyle = r; g.beginPath(); g.arc(64, 64, 62, 0, 7); g.fill();
  g.fillStyle = 'rgba(255,255,255,.95)'; g.beginPath(); g.ellipse(42, 38, 14, 8, -0.7, 0, 7); g.fill();
});
const gumMat = new THREE.SpriteMaterial({ map: gumTex, transparent: true, depthWrite: false });
function gumBubble() { const s = new THREE.Sprite(gumMat); s.position.set(P.x, P.y + 0.05, P.z); s.scale.setScalar(0.3); scene.add(s); gums.push({ s, t: 0 }); }

/* ---------- Spelloop ---------- */
const fwd = new THREE.Vector3(), right = new THREE.Vector3(), move = new THREE.Vector3();
let time = 0, lastPortalLz = new Map();
function update(dt) {
  time += dt;
  // rörliga saker
  for (const o of dyn) if (o.update) o.update(time);
  for (const s of spinners) { s.a += s.w * dt; s.pivot.rotation.y = s.a; }
  for (const b of belts) b.tex.offset.y -= b.speed * dt / 1.4;
  for (const u of bubbles) {
    if (u.popT > 0) { u.popT -= dt; if (u.popT <= 0) { u.b.ghost = false; u.spr.visible = true; u.grow = 0; } continue; }
    if (u.grow !== undefined && u.grow < 1) u.grow = Math.min(1, u.grow + dt * 3);
    const base = 2.2 * (u.grow === undefined ? 1 : 0.3 + 0.7 * u.grow) + Math.sin(time * 2.4 + u.ph) * 0.07;
    const q = u.squash || 0, w = q * Math.cos((1 - q) * 14) * 0.22;           // gungar som gelé
    u.spr.scale.set(base * (1 + w), base * (1 - w), 1);
    if (q > 0) u.squash = Math.max(0, q - dt * 1.6);
  }
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
    const s = supportAt(P.x, P.z, P.y - 0.5, P.y + STEP);       // följer med ner för trappsteg
    if (s) { P.y = s.top; P.on = s; P.airT = 0; }
    else { P.coyoteOn = P.on; P.grounded = false; P.on = null; P.vy = 0; P.coyote = 0.12; P.airJumps = 1; playAnim('jump', 0.2); }
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
  }
  for (const Pt of portals) {
    if (Math.abs(P.y - Pt.y) > 4 || Math.abs(P.x - Pt.x) > 10 || Math.abs(P.z - Pt.z) > 10) continue;
    preparePortal(Pt);
    // väggen går genom tornets mitt: lz < 0 = sidan man kommer upp på, lz > 0 = efter portalen
    const lz = P.x * Pt.t.x + P.z * Pt.t.z, lx = P.x * Pt.u.x + P.z * Pt.u.z;
    if (P.grounded && Pt.chosen < 0 && lz < 0 && Math.abs(P.y - Pt.y) < 0.3) {
      setCp(Pt.cpIn, false);
      if (!Pt.told) { Pt.told = true; const [t, ic] = CAT[Pt.cat]; toast(`${ic} ${t} Gå igenom en portal`, 3200); }
    }
    const prev = lastPortalLz.get(Pt);
    if (prev !== undefined && prev < 0 && lz >= 0) { const gi = Pt.gates.findIndex(g => Math.abs(lx - g.lx) < 1.25); if (gi >= 0) choose(Pt, gi); }
    lastPortalLz.set(Pt, lz);
  }
  if (P.grounded && P.y >= TOP - 0.01 && !finished) win();
  // Ramlar man: tillbaka till senaste checkpoint
  if (P.y < checkpoints[cpIdx].y - 7 || P.y < -3) { sFall(); respawn(); }
  run.best = Math.max(run.best, P.y);
  animate(dt, moving, walking);
}
function land(s) {
  const vyIn = P.vy;
  P.grounded = true; P.on = s; P.vy = 0; P.coyote = 0;
  if (lastBubble && lastBubble !== s) popBubble(lastBubble);
  lastBubble = s.bubble ? s : null;
  if (s.bubble) { s.bubble.squash = Math.min(1, 0.4 - vyIn * 0.06); sSquish(); }
  if (jumpBuf > 0) doJump();                                  // springa/stå väljs i animate() efter vad man gör
}
let visY = 0, camY = null, camD = 6.5;
function animate(dt, moving, walking) {
  lastMoving = !!moving;
  if (ch) {
    if (P.grounded) playAnim(moving ? 'run' : 'idle', moving ? 0.15 : 0.25);
    ch.mixer.timeScale = moving && walking && P.grounded ? 0.55 : 1;
    // i trappor hoppar man upp ett trappsteg i taget: kroppen glider upp mjukt istället för att rycka
    visY = P.grounded && Math.abs(P.y - visY) < 0.7 ? visY + (P.y - visY) * Math.min(1, dt * 22) : P.y;
    ch.root.position.set(P.x, visY, P.z);
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
  for (let i = gums.length - 1; i >= 0; i--) {
    const g = gums[i]; g.t += dt;
    g.s.scale.setScalar(0.3 + Math.min(1, g.t / 0.16) * 1.2);
    if (g.t < 0.16) g.s.position.set(P.x, P.y - 0.25, P.z);
    if (g.t > 0.3) { scene.remove(g.s); sparkle(g.s.position.x, g.s.position.y + 0.2, g.s.position.z, 9, '#ff8fd0'); gums.splice(i, 1); }
  }
  // pyntbubblor som stiger i våningen man är på
  const fb = Math.floor(Math.max(0, Math.min(TOP - 1, P.y)) / SECTION) * SECTION;
  for (const f of floaters) {
    for (let i = 0; i < f.meta.length; i++) {
      const m = f.meta[i], y = (m.y + time * m.v) % (SECTION - 2);
      f.pos[i * 3] = Math.cos(m.a) * m.r + Math.sin(time * 0.7 + m.w) * 0.4;
      f.pos[i * 3 + 1] = fb + 0.5 + y;
      f.pos[i * 3 + 2] = Math.sin(m.a) * m.r + Math.cos(time * 0.6 + m.w) * 0.4;
    }
    f.pts.geometry.attributes.position.needsUpdate = true;
  }
  // Kamera bakom gubben, inte inne i tornet eller i plattformar
  // höjden följer mjukt (trappsteg och hopp rycker inte i bilden); stora hopp i höjd = direkt
  if (camY === null || camSnap || Math.abs(P.y + 1.5 - camY) > 5) camY = P.y + 1.5;
  else camY += (P.y + 1.5 - camY) * Math.min(1, dt * (P.grounded ? 9 : 5));
  camTarget.set(P.x, camY, P.z);
  const sx = Math.sin(yaw) * Math.cos(pitch), sz = Math.cos(yaw) * Math.cos(pitch), sy = Math.sin(pitch);
  let d = dist;
  for (let st = 0.6; st <= dist; st += 0.2) {
    const x = camTarget.x + sx * st, y = camTarget.y + sy * st, z = camTarget.z + sz * st;
    let hit = Math.hypot(x, z) > WALL_R - 0.7 && y < TOP + 1;
    if (!hit) for (const b of near(x, z, y - 0.5, y + 0.5)) { if (!b.ghost && y > b.bot - 0.3 && y < b.top + 0.3 && inside(b, x, z, 0.3)) { hit = true; break; } }
    if (hit) { d = Math.max(1.2, st - 0.3); break; }
  }
  // något i vägen: kameran glider närmare snabbt, och backar ut lugnt igen (ingen "pumpande" kamera i trappor)
  if (camSnap) camD = d;
  else camD += (d - camD) * Math.min(1, dt * (d < camD ? 14 : 2.2));
  camPos.set(camTarget.x + sx * camD, camTarget.y + sy * camD, camTarget.z + sz * camD);
  if (camSnap) camera.position.copy(camPos); else camera.position.lerp(camPos, 1 - Math.exp(-dt * 12));
  camSnap = false;
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
  hemi.intensity = 1.7 - h * 0.5;
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
  const fl = Math.min(20, Math.floor(Math.max(0, P.y) / SECTION) + 1);
  $('hNow').innerHTML = `${Math.max(0, Math.floor(P.y))} <small>m</small><br><small>${P.y >= TOP - 0.5 ? 'Taket 👑' : 'Våning ' + fl}</small>`;
  const H = $('bar').clientHeight - 6;
  $('bar').querySelector('.fill').style.height = Math.max(0, Math.min(1, run.best / TOP)) * H + 'px';
  $('bar').querySelector('.me').style.bottom = Math.max(0, Math.min(1, P.y / TOP)) * H + 'px';
  for (const t of ticks) t.el.classList.toggle('done', portals[t.k] && portals[t.k].chosen >= 0);
}
let frame = 0;
const SKY = ['#bfe6ff', '#ffd1ec', '#e2c9ff', '#a98bff', '#5b3fbf', '#22175e'].map(c => new THREE.Color(c));
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
// Sparning från första versionen av banan (spiral runt tornet): checkpoint-numren stämmer inte längre,
// så man fortsätter efter den senaste portalen man gått igenom, med samma kläder.
function savedCp(sv) {
  if (!sv) return 0;
  if (sv.v === 2) return sv.cp;
  return sv.paid >= 0 && portals[sv.paid] ? portals[sv.paid].cpOut : 0;
}
function startRun(fromSave) {
  const saved = player && player.progress && player.progress.torn;
  cpIdx = 0; run.paid = -1; run.done = false; finished = false;
  for (const c of checkpoints) if (c.flag && !c.start) c.flag.cloth.material.color.set('#9a9ab0');
  for (const Pt of portals) { Pt.chosen = -1; Pt.opts = null; Pt.gates.forEach(g => { g.film.material.opacity = 0.45; g.film.material.color.set('#ffffff'); g.frameM.color.set('#ffffff'); g.sign.material.map = unknownTex; g.sign.material.needsUpdate = true; }); Pt.head.material.map = unknownHead; Pt.head.material.needsUpdate = true; }
  lastPortalLz = new Map();
  if (fromSave && saved && savedCp(saved) > 0 && checkpoints[savedCp(saved)]) {
    look = { ...underwear(), ...saved.look };
    run.paid = saved.paid ?? -1;
    cpIdx = savedCp(saved);
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
if (saved && savedCp(saved) > 0 && !saved.done && checkpoints[savedCp(saved)]) {
  $('startText').textContent = `Du var på ${Math.round(checkpoints[savedCp(saved)].y)} meter. Vill du fortsätta där, eller börja om längst ner i underkläderna?`;
  $('startBox').classList.add('show');
  $('bContinue').onclick = () => { $('startBox').classList.remove('show'); startRun(true); };
  $('bRestart').onclick = () => { $('startBox').classList.remove('show'); startRun(false); };
} else startRun(false);
$('bAgain').onclick = () => { $('winBox').classList.remove('show'); startRun(false); };
$('bMenu').onclick = () => { location.href = 'index.html'; };

// För test
window.Torn = {
  P, checkpoints, portals, boxes, keys, route, dyn, bubbles, get look() { return look; }, get cp() { return cpIdx; }, get ch() { return ch; }, renderer, scene, camera,
  step(n = 1, dt = 1 / 60) { for (let i = 0; i < n; i++) update(dt); },
  get yaw() { return yaw; }, set yaw(v) { yaw = v; }, set pitch(v) { pitch = v; }, set dist(v) { dist = v; },
  setCp(i) { cpIdx = i; respawn(); }, jump, choose, preparePortal, supportAt, get finished() { return finished; }, get anim() { return anim; }, get stick() { return stick; }, get camD() { return camD; }, get camY() { return camY; }, get visY() { return visY; }
};
