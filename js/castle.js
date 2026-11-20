/* Slottet i Guldmyntsjakten: bottenvåning (tronsal), övervåning, takterrass med tinnar och fyra torn.
   Allt byggs av enkla former. Golv/trappor och tak finns som data så att man kan gå på alla våningar.

   Lokala koordinater: porten åt +z, x åt höger. Höjder räknas från slottsplanens mark (CASTLE.h). */
import * as THREE from 'three';

const KW = 16, KD = 13;                       // borgens halva yttermått
const Y0 = 0.3, Y1 = 5.3, Y2 = 10.3, Y3 = 14.3, SLAB = 0.4;
const GATE = 2, GATE_H = 4.2;
const TOWERS = [[-1, -1], [1, -1], [-1, 1], [1, 1]];   // [sx, sz] – fram (sz=1) är portsidan

/* ---------- Texturer ---------- */
function canvasTex(size, draw, repeat = 1) {
  const c = document.createElement('canvas'); c.width = c.height = size;
  draw(c.getContext('2d'), size);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 4;
  t.repeat.set(repeat, repeat);
  return t;
}
const bricks = (base, mortar, vary) => canvasTex(256, (g, S) => {
  g.fillStyle = mortar; g.fillRect(0, 0, S, S);
  const rows = 8, bh = S / rows, bw = S / 4;
  for (let r = 0; r < rows; r++) for (let k = -1; k < 5; k++) {
    const x = k * bw + (r % 2 ? bw / 2 : 0), n = Math.sin(r * 12.9 + k * 78.2) * 43758.5 % 1;
    const l = (Math.abs(n) - 0.5) * vary;
    const col = new THREE.Color(base); col.offsetHSL(0, 0, l);
    g.fillStyle = '#' + col.getHexString();
    g.fillRect(x + 3, r * bh + 3, bw - 6, bh - 6);
    g.fillStyle = 'rgba(255,255,255,0.18)'; g.fillRect(x + 3, r * bh + 3, bw - 6, 3);
  }
});
const tiles = () => canvasTex(128, (g, S) => {
  for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) { g.fillStyle = (i + j) % 2 ? '#d8cdea' : '#f2ecf8'; g.fillRect(i * 32, j * 32, 32, 32); }
  g.strokeStyle = 'rgba(120,100,150,.35)'; g.lineWidth = 2; for (let k = 0; k <= 4; k++) { g.beginPath(); g.moveTo(k * 32, 0); g.lineTo(k * 32, S); g.moveTo(0, k * 32); g.lineTo(S, k * 32); g.stroke(); }
});
const banner = () => canvasTex(128, (g) => {
  g.fillStyle = '#7a3cff'; g.fillRect(0, 0, 128, 128);
  g.fillStyle = '#ffd84a'; g.fillRect(0, 0, 128, 10); g.fillRect(0, 118, 128, 10);
  // krona
  g.beginPath(); g.moveTo(34, 86); g.lineTo(30, 46); g.lineTo(48, 62); g.lineTo(64, 38); g.lineTo(80, 62); g.lineTo(98, 46); g.lineTo(94, 86); g.closePath(); g.fill();
  g.fillStyle = '#ff6fae'; for (const x of [30, 64, 98]) { g.beginPath(); g.arc(x, x === 64 ? 36 : 44, 6, 0, 7); g.fill(); }
});

// Låda där texturen följer meter (inte utsträckt) – u/v i meter / skala
function boxUV(w, h, d, scale = 2) {
  const g = new THREE.BoxGeometry(w, h, d);
  const p = g.attributes.position, n = g.attributes.normal, uv = g.attributes.uv;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i) + w / 2, y = p.getY(i) + h / 2, z = p.getZ(i) + d / 2;
    const ax = Math.abs(n.getX(i)), ay = Math.abs(n.getY(i));
    if (ax > 0.5) uv.setXY(i, z / scale, y / scale);
    else if (ay > 0.5) uv.setXY(i, x / scale, z / scale);
    else uv.setXY(i, x / scale, y / scale);
  }
  return g;
}

export function buildCastle({ scene, colliders, C, plankTex }) {
  const f = { x: C.x, z: C.z, h: C.h, yaw: C.yaw };
  const cs = Math.cos(f.yaw), sn = Math.sin(f.yaw);
  const toWorld = (lx, lz) => [f.x + lx * cs + lz * sn, f.z - lx * sn + lz * cs];
  const worldRect = (x0, x1, z0, z1) => {
    const a = toWorld(x0, z0), b = toWorld(x1, z1);
    return { minX: Math.min(a[0], b[0]), maxX: Math.max(a[0], b[0]), minZ: Math.min(a[1], b[1]), maxZ: Math.max(a[1], b[1]) };
  };
  // Hinder: låda med höjdintervall (bara på sin våning)
  const block = (x0, x1, z0, z1, y0, y1, extra = {}) => {
    const r = worldRect(Math.min(x0, x1), Math.max(x0, x1), Math.min(z0, z1), Math.max(z0, z1));
    const c = { box: true, x: (r.minX + r.maxX) / 2, z: (r.minZ + r.maxZ) / 2, hw: (r.maxX - r.minX) / 2, hd: (r.maxZ - r.minZ) / 2, bottom: f.h + y0, top: f.h + y1, castle: true, ...extra };
    colliders.push(c);
    return c;
  };
  // Golv man kan stå på. under = tak för den som står under (golvets undersida)
  const surfaces = [];
  const floor = (x0, x1, z0, z1, y, under = null) => surfaces.push({ ...worldRect(Math.min(x0, x1), Math.max(x0, x1), Math.min(z0, z1), Math.max(z0, z1)), y0: f.h + y, gx: 0, gz: 0, ox: 0, oz: 0, lo: f.h + y, hi: f.h + y, under: under === null ? null : f.h + under });
  // Trappa: höjden ändras jämnt längs lokal x eller z, från 'from' (höjd yFrom) till 'to' (höjd yTo)
  const ramp = (x0, x1, z0, z1, axis, from, to, yFrom, yTo) => {
    const k = (yTo - yFrom) / (to - from);
    const [dx, dz] = axis === 'x' ? [cs, -sn] : [sn, cs];
    const [ox, oz] = axis === 'x' ? toWorld(from, 0) : toWorld(0, from);
    surfaces.push({ ...worldRect(Math.min(x0, x1), Math.max(x0, x1), Math.min(z0, z1), Math.max(z0, z1)), y0: f.h + yFrom, gx: k * dx, gz: k * dz, ox, oz, lo: f.h + Math.min(yFrom, yTo), hi: f.h + Math.max(yFrom, yTo), under: null });
  };

  /* ---------- Material ---------- */
  const stone = new THREE.MeshLambertMaterial({ map: bricks('#ece6f5', '#c4bad8', 0.12) });
  const stoneDark = new THREE.MeshLambertMaterial({ map: bricks('#d6cde6', '#aa9fc2', 0.1) });
  const tileMat = new THREE.MeshLambertMaterial({ map: tiles() });
  const woodFloor = new THREE.MeshLambertMaterial({ map: plankTex });
  const roofPink = new THREE.MeshLambertMaterial({ color: '#ff6fae', flatShading: true });
  const gold = new THREE.MeshStandardMaterial({ color: '#ffcf3a', metalness: 0.6, roughness: 0.35 });
  const red = new THREE.MeshLambertMaterial({ color: '#d8304a' });
  const wood = new THREE.MeshLambertMaterial({ color: '#8a5a32' });
  const dark = new THREE.MeshLambertMaterial({ color: '#3a3346' });
  const glass = new THREE.MeshLambertMaterial({ color: '#9fd8ff', emissive: '#3a6f9a', emissiveIntensity: 0.6 });
  const flame = new THREE.MeshBasicMaterial({ color: '#ffb340' });
  const bannerMat = new THREE.MeshLambertMaterial({ map: banner(), side: THREE.DoubleSide });
  const flagMat = new THREE.MeshLambertMaterial({ color: '#ff3d8a', side: THREE.DoubleSide });

  const root = new THREE.Group();
  root.position.set(f.x, f.h, f.z); root.rotation.y = f.yaw;
  scene.add(root);
  const add = (geo, mat, x, y, z, ry = 0) => {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z); m.rotation.y = ry; m.castShadow = true; m.receiveShadow = true;
    root.add(m); return m;
  };
  // Massiv låda mellan x0..x1, y0..y1, z0..z1 (lokalt)
  const solid = (x0, x1, y0, y1, z0, z1, mat = stone, scale = 2) => add(boxUV(x1 - x0, y1 - y0, z1 - z0, scale), mat, (x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);

  /* ---------- Bottenplatta, trappsteg vid porten ---------- */
  solid(-KW, KW, -1, Y0, -KD, KD, tileMat, 3);
  floor(-KW, KW, -KD, KD, Y0);
  solid(-3, 3, -1, 0.15, KD, KD + 1.6, stoneDark);
  floor(-3, 3, KD, KD + 1.6, 0.15);

  /* ---------- Ytterväggar (1 m tjocka) med tinnar ---------- */
  const WT = Y2 + 1.2, WC = Y2 + 4.5;          // synlig topp / osynlig spärr så man inte hoppar över
  // murarna går mellan tornen (tornen står på hörnen: |x| 12..20, |z| 9..17)
  const TX = KW - 4, TZ = KD - 4;
  solid(-TX, TX, Y0, WT, -KD, -KD + 1); block(-TX, TX, -KD, -KD + 1, -1, WC);
  solid(-KW, -KW + 1, Y0, WT, -TZ, TZ); block(-KW, -KW + 1, -TZ, TZ, -1, WC);
  solid(KW - 1, KW, Y0, WT, -TZ, TZ); block(KW - 1, KW, -TZ, TZ, -1, WC);
  solid(-TX, -GATE, Y0, WT, KD - 1, KD); block(-TX, -GATE, KD - 1, KD, -1, WC);
  solid(GATE, TX, Y0, WT, KD - 1, KD); block(GATE, TX, KD - 1, KD, -1, WC);
  solid(-GATE, GATE, Y0 + GATE_H, WT, KD - 1, KD); block(-GATE, GATE, KD - 1, KD, Y0 + GATE_H, WC);
  // stenram runt porten
  solid(-GATE - 0.6, -GATE, Y0, Y0 + GATE_H + 0.6, KD - 0.2, KD + 0.25, stoneDark);
  solid(GATE, GATE + 0.6, Y0, Y0 + GATE_H + 0.6, KD - 0.2, KD + 0.25, stoneDark);
  solid(-GATE - 0.6, GATE + 0.6, Y0 + GATE_H, Y0 + GATE_H + 0.6, KD - 0.2, KD + 0.25, stoneDark);
  for (const x of [-1.2, 0, 1.2]) add(new THREE.ConeGeometry(0.25, 0.5, 4), gold, x, Y0 + GATE_H + 0.85, KD + 0.05, Math.PI / 4);
  // tinnar längs muren mellan tornen
  const merlon = boxUV(0.9, 0.9, 1, 2);
  for (let x = -11; x <= 11.01; x += 1.8) { add(merlon, stone, x, WT + 0.45, -KD + 0.5); add(merlon, stone, x, WT + 0.45, KD - 0.5); }
  for (let z = -8; z <= 8.01; z += 1.8) { add(merlon, stone, -KW + 0.5, WT + 0.45, z); add(merlon, stone, KW - 0.5, WT + 0.45, z); }

  /* ---------- Fönster (på båda sidor av muren) ---------- */
  const win = (x, y, z, ry) => {
    const fr = add(new THREE.BoxGeometry(1.7, 2.5, 1.16), stoneDark, x, y, z, ry);
    fr.castShadow = false;
    add(new THREE.BoxGeometry(1.3, 2.1, 1.2), glass, x, y, z, ry).castShadow = false;
  };
  for (const y of [Y0 + 2.6, Y1 + 2.4]) {
    for (const x of [-11, -6, 6, 11]) { win(x, y, -KD + 0.5, 0); win(x, y, KD - 0.5, 0); }
    for (const z of [-6, 0, 6]) { win(-KW + 0.5, y, z, Math.PI / 2); win(KW - 0.5, y, z, Math.PI / 2); }
  }

  /* ---------- Övervåning (trägolv) med två trapphål ---------- */
  const slab = (x0, x1, z0, z1, y, mat) => { solid(x0, x1, y - SLAB, y, z0, z1, mat, 2); floor(x0, x1, z0, z1, y, y - SLAB); };
  const IX = KW - 1, IZ = KD - 1;               // innermått ±15 × ±12
  const SX = 12.6;                              // trapporna längs sidväggarna: x ±(12.6..15), z 1.0 → -5.7
  slab(-SX, SX, -IZ, IZ, Y1, woodFloor);
  slab(-IX, -SX, -IZ, -5.7, Y1, woodFloor); slab(-IX, -SX, 1.0, IZ, Y1, woodFloor);
  slab(SX, IX, -IZ, -5.7, Y1, woodFloor); slab(SX, IX, 1.0, IZ, Y1, woodFloor);

  /* ---------- Takterrass (sten) med trapphål längs bakväggen ---------- */
  const RX = 3.35, RZ = -9.6;                   // trappan upp till taket: x -3.35 → 3.35, z -12..-9.6
  slab(-IX, IX, RZ, IZ, Y2, stoneDark);
  slab(-IX, -RX, -IZ, RZ, Y2, stoneDark); slab(RX, IX, -IZ, RZ, Y2, stoneDark);

  /* ---------- Trappor ---------- */
  // Steg byggs som massiva block (inget hålrum under). Räcke = trappstegade låga väggar.
  function stairSteps(axis, a0, a1, b0, b1, yFrom, yTo, n, mat = stoneDark) {
    for (let i = 0; i < n; i++) {
      const s0 = a0 + (a1 - a0) * i / n, s1 = a0 + (a1 - a0) * (i + 1) / n, top = yFrom + (yTo - yFrom) * (i + 1) / n;
      if (axis === 'z') solid(b0, b1, yFrom - 0.01, top, Math.min(s0, s1), Math.max(s0, s1), mat);
      else solid(Math.min(s0, s1), Math.max(s0, s1), yFrom - 0.01, top, b0, b1, mat);
    }
  }
  function stairRail(axis, a0, a1, b0, b1, yFrom, yTo, n) {
    for (let i = 0; i < n; i++) {
      const s0 = a0 + (a1 - a0) * i / n, s1 = a0 + (a1 - a0) * (i + 1) / n, top = yFrom + (yTo - yFrom) * (i + 1) / n;
      if (axis === 'z') solid(b0, b1, top, top + 1.0, Math.min(s0, s1), Math.max(s0, s1), stone);
      else solid(Math.min(s0, s1), Math.max(s0, s1), top, top + 1.0, b0, b1, stone);
    }
  }
  // Bottenvåning → övervåning, en på varje sida
  for (const s of [-1, 1]) {
    const xa = s * SX, xb = s * IX, x0 = Math.min(xa, xb), x1 = Math.max(xa, xb);
    ramp(x0, x1, -5.7, 1.0, 'z', 1.0, -5.7, Y0, Y1);
    stairSteps('z', 1.0, -5.7, x0, x1, Y0, Y1, 16);
    const rx0 = s > 0 ? SX - 0.2 : -SX, rx1 = s > 0 ? SX : -SX + 0.2;
    stairRail('z', 1.0, -5.7, rx0, rx1, Y0, Y1, 16);
    block(rx0, rx1, -5.7, 1.0, -1, Y1 + 1.0);                      // räcke längs trappan (och runt hålet uppe)
    block(x0, x1, -5.8, -5.7, -1, Y1 - 1.0);                        // stängt under trappan (lägre än trappans topp så man kan kliva av)
    solid(x0, x1, Y1, Y1 + 1.0, 1.0, 1.15, stone); block(x0, x1, 1.0, 1.15, Y1 - 0.2, Y1 + 1.0);   // räcke vid hålets låga ände
  }
  // Övervåning → tak, längs bakväggen
  ramp(-RX, RX, -IZ, RZ, 'x', -RX, RX, Y1, Y2);
  stairSteps('x', -RX, RX, -IZ, RZ, Y1, Y2, 16);
  stairRail('x', -RX, RX, RZ, RZ + 0.2, Y1, Y2, 16);
  block(-RX, RX, RZ, RZ + 0.2, Y1 - 0.2, Y2 + 1.0);
  block(RX, RX + 0.1, -IZ, RZ, Y1 - 0.5, Y2 - 1.0);
  solid(-RX - 0.15, -RX, Y2, Y2 + 1.0, -IZ, RZ, stone); block(-RX - 0.15, -RX, -IZ, RZ, Y2 - 0.2, Y2 + 1.0);

  /* ---------- Torn i hörnen ---------- */
  const towerRooms = [];
  for (const [sx, sz] of TOWERS) {
    const cx = sx * KW, cz = sz * KD, front = sz > 0;
    // tornets egna koordinater: x' utåt i x, z' utåt i z (ytter -4..4, inner -3..3)
    const L = (a, b) => [cx + a * sx, cz + b * sz];
    const rect = (a0, a1, b0, b1) => { const p = L(a0, b0), q = L(a1, b1); return [Math.min(p[0], q[0]), Math.max(p[0], q[0]), Math.min(p[1], q[1]), Math.max(p[1], q[1])]; };
    const S = (a0, a1, b0, b1, y0, y1, mat = stone) => { const [x0, x1, z0, z1] = rect(a0, a1, b0, b1); return solid(x0, x1, y0, y1, z0, z1, mat); };
    const B = (a0, a1, b0, b1, y0, y1) => { const [x0, x1, z0, z1] = rect(a0, a1, b0, b1); return block(x0, x1, z0, z1, y0, y1); };
    const F = (a0, a1, b0, b1, y, under) => { const [x0, x1, z0, z1] = rect(a0, a1, b0, b1); floor(x0, x1, z0, z1, y, under); };
    // massiv nederdel upp till taket
    S(-4, 4, -4, 4, Y0, Y2 - 0.01); B(-4, 4, -4, 4, -1, Y2); F(-4, 4, -4, 4, Y2);
    const topW = front ? Y3 + 1.2 : Y3 + 0.4;
    // väggar runt tornrummet; dörr från takterrassen i den inre x-väggen
    S(3, 4, -4, 4, Y2, topW); B(3, 4, -4, 4, Y2 - 0.1, topW + 3.3);
    S(-4, 4, 3, 4, Y2, topW); B(-4, 4, 3, 4, Y2 - 0.1, topW + 3.3);
    S(-4, 4, -4, -3, Y2, topW); B(-4, 4, -4, -3, Y2 - 0.1, topW + 3.3);
    S(-4, -3, -1.4, 3, Y2, topW); B(-4, -3, -1.4, 3, Y2 - 0.1, topW + 3.3);
    S(-4, -3, -3, -1.4, Y2 + 2.6, topW); B(-4, -3, -3, -1.4, Y2 + 2.6, topW + 3.3);
    // tak i tornrummet / plattform högst upp
    const [ix0, ix1, iz0, iz1] = rect(-3, 3, -3, 3);
    towerRooms.push({ ...worldRect(ix0, ix1, iz0, iz1), floor: f.h + Y2, ceil: f.h + Y3 - SLAB, yMin: f.h + Y2 - 0.6, yMax: f.h + Y3 - 0.6 });
    if (front) {
      // trappa längs ytterväggen upp till tornets topp (x' 1.6..3, z' -2 → 2)
      const [rx0, rx1, rz0, rz1] = rect(1.6, 3, -2, 2);
      const za = L(0, -2)[1], zb = L(0, 2)[1];
      ramp(rx0, rx1, rz0, rz1, 'z', za, zb, Y2, Y3);
      stairSteps('z', za, zb, rx0, rx1, Y2, Y3, 13);
      S(1.5, 1.6, -2, 2, Y2, Y3 + 1.0); B(1.5, 1.6, -2, 2, Y2 - 0.1, Y3 + 1.0);   // vägg mellan trappan och rummet
      B(1.6, 3, 2, 2.1, Y2 - 0.1, Y3 - 1.0);                                        // stängt under trappan
      S(1.6, 3, -2.1, -2, Y3, Y3 + 1.0); B(1.6, 3, -2.1, -2, Y3 - 0.2, Y3 + 1.0);
      const pl = (a0, a1, b0, b1) => { const [x0, x1, z0, z1] = rect(a0, a1, b0, b1); solid(x0, x1, Y3 - SLAB, Y3, z0, z1, stoneDark); floor(x0, x1, z0, z1, Y3, Y3 - SLAB); };
      pl(-3, 1.6, -3, 3); pl(1.6, 3, 2, 3); pl(1.6, 3, -3, -2);
      // tinnar och flagga
      for (let a = -3.5; a <= 3.51; a += 1.75) { const p = L(a, 3.5), q = L(3.5, a); add(merlon, stone, p[0], topW + 0.45, p[1]); add(merlon, stone, q[0], topW + 0.45, q[1]); }
      const pole = L(-2, 2);
      add(new THREE.CylinderGeometry(0.07, 0.07, 4.5, 6), gold, pole[0], topW + 2.2, pole[1]);
      const fl = add(new THREE.PlaneGeometry(2, 1.2), flagMat, pole[0] + 1, topW + 3.8, pole[1]); fl.castShadow = false;
    } else {
      const [x0, x1, z0, z1] = rect(-3, 3, -3, 3);
      solid(x0, x1, Y3 - SLAB, Y3, z0, z1, stoneDark); floor(x0, x1, z0, z1, Y3, Y3 - SLAB);
      // spetsigt rosa tak med flagga
      const c = L(0, 0);
      const cone = add(new THREE.ConeGeometry(5.9, 8, 4, 1), roofPink, c[0], topW + 4, c[1], Math.PI / 4);
      cone.castShadow = true;
      add(new THREE.CylinderGeometry(0.06, 0.06, 2.4, 6), gold, c[0], topW + 9, c[1]);
      const fl = add(new THREE.PlaneGeometry(1.4, 0.8), flagMat, c[0] + 0.7, topW + 9.7, c[1]); fl.castShadow = false;
    }
  }
  // ett högt spetstorn mitt på taket (bara att titta på)
  solid(-2, 2, Y2, Y2 + 3.5, 2, 6, stone); block(-2, 2, 2, 6, Y2 - 0.1, Y2 + 6);
  add(new THREE.ConeGeometry(3.2, 6, 4, 1), roofPink, 0, Y2 + 6.5, 4, Math.PI / 4);
  add(new THREE.CylinderGeometry(0.06, 0.06, 2.4, 6), gold, 0, Y2 + 10.4, 4);
  add(new THREE.PlaneGeometry(1.6, 0.9), flagMat, 0.8, Y2 + 11.1, 4).castShadow = false;
  for (const [x, z] of [[-2.01, 4], [2.01, 4]]) win(x, Y2 + 1.9, z, Math.PI / 2);

  /* ---------- Porten: två dörrar som öppnas inåt ---------- */
  const doors = [];
  for (const s of [-1, 1]) {
    const pivot = new THREE.Group();
    pivot.position.set(s * GATE, Y0, KD - 0.6);
    const leaf = new THREE.Mesh(new THREE.BoxGeometry(GATE, GATE_H, 0.22), wood);
    leaf.position.set(-s * GATE / 2, GATE_H / 2, 0); leaf.castShadow = true;
    pivot.add(leaf);
    for (const y of [0.8, 2.2, 3.6]) { const band = new THREE.Mesh(new THREE.BoxGeometry(GATE * 0.96, 0.16, 0.28), dark); band.position.set(-s * GATE / 2, y, 0); pivot.add(band); }
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.04, 6, 12), gold); ring.position.set(-s * 0.3, 2.0, 0.18); pivot.add(ring);
    pivot.userData.hinge = [s * GATE, KD - 0.6, s > 0 ? -1 : 1];
    root.add(pivot);
    doors.push(pivot);
  }
  const gateCol = block(-GATE, GATE, KD - 1, KD, -1, Y0 + GATE_H, { active: true });
  const [gdx, gdz] = toWorld(0, KD + 1.8);
  const gate = { kind: 'castle', doors, doorCollider: gateCol, door: { x: gdx, z: gdz }, inner: { minX: 1, maxX: -1, minZ: 1, maxZ: -1 }, roof: 0, floorY: 0, open: false, t: 0, toggle() { this.open = !this.open; } };

  /* ---------- Inredning ---------- */
  // röd matta från porten till tronen
  const carpet = add(new THREE.PlaneGeometry(3, 21), red, 0, Y0 + 0.02, 1.6); carpet.rotation.x = -Math.PI / 2; carpet.castShadow = false;
  // tronen
  solid(-1.2, 1.2, Y0, Y0 + 0.6, -11.6, -9.4, stoneDark);
  floor(-1.2, 1.2, -11.6, -9.4, Y0 + 0.6);
  add(new THREE.BoxGeometry(1.6, 0.5, 1.2), red, 0, Y0 + 1.1, -10.2);
  add(new THREE.BoxGeometry(1.8, 2.8, 0.3), gold, 0, Y0 + 2.0, -10.95);
  add(new THREE.BoxGeometry(0.25, 0.9, 1.2), gold, -0.9, Y0 + 1.3, -10.2); add(new THREE.BoxGeometry(0.25, 0.9, 1.2), gold, 0.9, Y0 + 1.3, -10.2);
  for (const x of [-0.6, 0, 0.6]) add(new THREE.ConeGeometry(0.18, 0.5, 5), gold, x, Y0 + 3.65, -10.95);
  block(-1.0, 1.0, -11.2, -9.6, Y0 + 0.5, Y0 + 2.6);
  // ljuskrona i tronsalen
  const chand = new THREE.Group(); chand.position.set(0, Y1 - 1.6, 0); root.add(chand);
  const cr = new THREE.Mesh(new THREE.TorusGeometry(1.4, 0.08, 6, 24), gold); cr.rotation.x = Math.PI / 2; chand.add(cr);
  for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; const fl = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.3, 5), flame); fl.position.set(Math.cos(a) * 1.4, 0.25, Math.sin(a) * 1.4); chand.add(fl); }
  const ch2 = add(new THREE.CylinderGeometry(0.03, 0.03, 1.2, 4), gold, 0, Y1 - 0.9, 0); ch2.castShadow = false;
  // banér och facklor på väggarna
  for (const [x, z, ry] of [[-14.45, -2, Math.PI / 2], [14.45, -2, -Math.PI / 2], [-14.45, 6, Math.PI / 2], [14.45, 6, -Math.PI / 2], [-6, -11.45, 0], [6, -11.45, 0]]) {
    const b = add(new THREE.PlaneGeometry(1.6, 3), bannerMat, x, Y0 + 2.9, z, ry); b.castShadow = false;
  }
  for (const [x, y, z] of [[-14.6, Y0 + 2.2, 9], [14.6, Y0 + 2.2, 9], [-14.6, Y1 + 2.2, -9], [14.6, Y1 + 2.2, -9], [-9, Y1 + 2.2, 11.6], [9, Y1 + 2.2, 11.6]]) {
    add(new THREE.CylinderGeometry(0.08, 0.05, 0.6, 6), wood, x, y, z).castShadow = false;
    add(new THREE.ConeGeometry(0.16, 0.42, 6), flame, x, y + 0.48, z).castShadow = false;
  }
  // långbord med bänkar i tronsalen
  for (const x of [-7, 7]) {
    solid(x - 1, x + 1, Y0 + 0.9, Y0 + 1.05, -4, 5, wood);
    for (const [a, b] of [[-0.8, -3.6], [0.8, -3.6], [-0.8, 4.6], [0.8, 4.6]]) solid(x + a - 0.1, x + a + 0.1, Y0, Y0 + 0.9, b - 0.1, b + 0.1, wood);
    for (const s of [-1, 1]) solid(x + s * 1.6 - 0.25, x + s * 1.6 + 0.25, Y0, Y0 + 0.5, -4, 5, wood);
    for (let z = -3; z <= 4; z += 1.75) { add(new THREE.CylinderGeometry(0.22, 0.18, 0.12, 10), gold, x, Y0 + 1.11, z).castShadow = false; }
    block(x - 1.85, x + 1.85, -4, 5, Y0 - 0.1, Y0 + 1.05);
    floor(x - 1, x + 1, -4, 5, Y0 + 1.05);                         // man kan hoppa upp på bordet
  }
  // övervåningen: prinsessäng med himmel, runt bord, bokhyllor
  {
    const bx = -8, bz = 7;
    solid(bx - 1.6, bx + 1.6, Y1, Y1 + 0.7, bz - 2.2, bz + 2.2, wood);
    solid(bx - 1.5, bx + 1.5, Y1 + 0.7, Y1 + 0.95, bz - 2.1, bz + 2.1, new THREE.MeshLambertMaterial({ color: '#ffd1e6' }));
    add(new THREE.BoxGeometry(2.6, 0.3, 0.8), new THREE.MeshLambertMaterial({ color: '#ffffff' }), bx, Y1 + 1.1, bz - 1.6);
    for (const [a, b] of [[-1.5, -2.1], [1.5, -2.1], [-1.5, 2.1], [1.5, 2.1]]) solid(bx + a - 0.1, bx + a + 0.1, Y1, Y1 + 3.2, bz + b - 0.1, bz + b + 0.1, gold);
    solid(bx - 1.7, bx + 1.7, Y1 + 3.2, Y1 + 3.35, bz - 2.3, bz + 2.3, new THREE.MeshLambertMaterial({ color: '#ff8fc4' }));
    block(bx - 1.6, bx + 1.6, bz - 2.2, bz + 2.2, Y1 - 0.1, Y1 + 0.95);
    floor(bx - 1.6, bx + 1.6, bz - 2.2, bz + 2.2, Y1 + 0.95);     // man kan studsa upp i sängen
    const tx = 6, tz = 4;
    add(new THREE.CylinderGeometry(1.3, 1.3, 0.12, 20), wood, tx, Y1 + 0.95, tz);
    add(new THREE.CylinderGeometry(0.15, 0.25, 0.95, 8), wood, tx, Y1 + 0.47, tz);
    colliders.push({ x: toWorld(tx, tz)[0], z: toWorld(tx, tz)[1], r: 1.3, top: f.h + Y1 + 1.0, bottom: f.h + Y1 - 0.1, castle: true });
    const bookCols = ['#e23b4e', '#3d6fb5', '#2fae6a', '#ffcf3a', '#8a5cff'];
    for (const x of [-11, 9]) {
      solid(x - 1.2, x + 1.2, Y1, Y1 + 3, -11.95, -11.4, wood);
      for (let r = 0; r < 4; r++) for (let k = 0; k < 6; k++) add(new THREE.BoxGeometry(0.28, 0.5, 0.35), new THREE.MeshLambertMaterial({ color: bookCols[(r + k) % 5] }), x - 0.9 + k * 0.36, Y1 + 0.4 + r * 0.72, -11.6).castShadow = false;
      block(x - 1.2, x + 1.2, -12, -11.3, Y1 - 0.1, Y1 + 3);
    }
  }

  /* ---------- Kistplatser i slottet (alla våningar och tornen) ---------- */
  const spots = [];
  const spot = (lx, lz, y, rot, where = 'slott') => { const [x, z] = toWorld(lx, lz); spots.push({ x, z, y: f.h + y, rot: f.yaw + rot, where }); };
  spot(-10.5, -10.3, Y0, 0); spot(10.5, -10.3, Y0, 0); spot(-9, 10.4, Y0, Math.PI); spot(9, 10.4, Y0, Math.PI); spot(-3.5, -6, Y0, Math.PI / 2);
  spot(-9, -10.4, Y1, 0); spot(4, -6.5, Y1, 0); spot(9, 10.4, Y1, Math.PI); spot(-4, 10.4, Y1, Math.PI); spot(10, 2, Y1, -Math.PI / 2);
  spot(-9, 0, Y2, Math.PI / 2); spot(9, -4, Y2, -Math.PI / 2); spot(-8, 9.5, Y2, Math.PI);
  for (const [sx, sz] of TOWERS) {
    const front = sz > 0, p = [sx * KW + (front ? -0.5 : 1.3) * sx, sz * KD + (front ? 2.2 : 1.3) * sz];
    spot(p[0], p[1], Y2, sz > 0 ? Math.PI : 0);
    if (front) spot(sx * KW - 1.5 * sx, sz * KD + 1.5 * sz, Y3, sz > 0 ? Math.PI : 0);
  }

  /* ---------- Frågor från spelet ---------- */
  const inRect = (r, x, z) => x >= r.minX && x <= r.maxX && z >= r.minZ && z <= r.maxZ;
  const keepIn = worldRect(-IX, IX, -IZ, IZ);
  const outer = worldRect(-KW - 4.5, KW + 4.5, -KD - 4.5, KD + 4.5);
  return {
    root, gate, spots,
    rect: worldRect(-KW, KW, -KD, KD),
    towers: TOWERS.map(([sx, sz]) => worldRect(sx * KW - 4, sx * KW + 4, sz * KD - 4, sz * KD + 4)),
    // Högsta golvet under fötterna (man kan kliva upp ~0,75 m, t.ex. i trappor)
    groundAt(x, z, y) {
      if (!inRect(outer, x, z)) return -Infinity;
      let best = -Infinity;
      for (const s of surfaces) {
        if (x < s.minX || x > s.maxX || z < s.minZ || z > s.maxZ) continue;
        let h = s.y0 + s.gx * (x - s.ox) + s.gz * (z - s.oz);
        h = Math.min(s.hi, Math.max(s.lo, h));
        if (h <= y + 0.75 && h > best) best = h;
      }
      return best;
    },
    // Lägsta taket ovanför huvudet
    ceilingAt(x, z, y) {
      if (!inRect(outer, x, z)) return Infinity;
      let best = Infinity;
      for (const s of surfaces) {
        if (s.under === null || s.under <= y + 0.5 || x < s.minX || x > s.maxX || z < s.minZ || z > s.maxZ) continue;
        if (s.under < best) best = s.under;
      }
      return best;
    },
    // Inomhus? (för kameran och lampan): rum med golv/tak
    roomAt(x, z, y) {
      if (!inRect(outer, x, z)) return null;
      if (inRect(keepIn, x, z)) {
        if (y < f.h + Y1 - 0.6) return { ...keepIn, floor: f.h + Y0, ceil: f.h + Y1 - SLAB };
        if (y < f.h + Y2 - 0.6) return { ...keepIn, floor: f.h + Y1, ceil: f.h + Y2 - SLAB };
      }
      for (const r of towerRooms) if (inRect(r, x, z) && y >= r.yMin && y < r.yMax) return { ...r };
      return null;
    }
  };
}
