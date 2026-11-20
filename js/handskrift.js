/* =========================================================
   Handskrift – barnet ritar en siffra eller bokstav, ett litet
   neuralt nät läser vad det är. Samma nät som i prinsesspelet:
   strecken skalas om till en 20×20-bild på exakt samma sätt som
   i träningen. Allt körs i webbläsaren, ingen server behövs.
   ========================================================= */

export const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZÅÄÖ';
const JUNK = 29;                       // "ingen bokstav" (halvfärdiga bokstäver och klotter)
const G = 20, BOX = 16, PEN = 1.7, STEP = 0.5;
const nets = {};

export async function loadNets() {
  const load = async (id, file) => {
    if (nets[id]) return;
    const j = await (await fetch(file)).json();
    nets[id] = j.q.map((b64, k) => {
      const bin = atob(b64), q = new Int8Array(bin.length);
      for (let i = 0; i < bin.length; i++) q[i] = (bin.charCodeAt(i) << 24) >> 24;
      return { q, s: Float32Array.from(j.s[k]), b: Float32Array.from(j.b[k]), nin: j.n[k], nout: j.n[k + 1] };
    });
  };
  await Promise.all([load('dig', 'assets/models/siffror.json'), load('let', 'assets/models/bokstaver.json')]);
}

function resample(s, step) {
  if (s.length < 2) return s.slice();
  const L = [0];
  for (let i = 1; i < s.length; i++) L.push(L[i - 1] + Math.hypot(s[i][0] - s[i - 1][0], s[i][1] - s[i - 1][1]));
  const T = L[L.length - 1];
  if (T < 1e-9) return [s[0]];
  const n = Math.max(2, Math.ceil(T / step) + 1), out = [];
  let k = 0;
  for (let i = 0; i < n; i++) {
    const t = T * i / (n - 1);
    while (k < L.length - 2 && L[k + 1] < t) k++;
    const d = L[k + 1] - L[k], u = d > 1e-12 ? (t - L[k]) / d : 0;
    out.push([s[k][0] + (s[k + 1][0] - s[k][0]) * u, s[k][1] + (s[k + 1][1] - s[k][1]) * u]);
  }
  return out;
}

function toImage(strokes) {
  let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
  for (const s of strokes) for (const [x, y] of s) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  const sc = BOX / Math.max(x1 - x0, y1 - y0, 1e-6), cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
  const N = strokes.map(s => resample(s.map(([x, y]) => [(x - cx) * sc + G / 2, (y - cy) * sc + G / 2]), STEP));
  const img = new Float32Array(G * G);
  for (let j = 0; j < G; j++) for (let i = 0; i < G; i++) {
    const px = i + 0.5, py = j + 0.5;
    let b2 = 1e18;
    for (const s of N) {
      if (s.length === 1) { const dx = px - s[0][0], dy = py - s[0][1]; b2 = Math.min(b2, dx * dx + dy * dy); continue; }
      for (let k = 0; k < s.length - 1; k++) {
        const ax = s[k][0], ay = s[k][1], ex = s[k + 1][0] - ax, ey = s[k + 1][1] - ay;
        let l2 = ex * ex + ey * ey; if (l2 < 1e-12) l2 = 1e-12;
        let t = ((px - ax) * ex + (py - ay) * ey) / l2; t = t < 0 ? 0 : t > 1 ? 1 : t;
        const dx = px - ax - t * ex, dy = py - ay - t * ey, d = dx * dx + dy * dy;
        if (d < b2) b2 = d;
      }
    }
    img[j * G + i] = Math.min(1, Math.max(0, PEN - Math.sqrt(b2)));
  }
  return img;
}

function probs(img, id) {
  const L = nets[id];
  let h = img;
  for (let k = 0; k < L.length; k++) {
    const { q, s, b, nin, nout } = L[k], o = new Float32Array(nout);
    for (let i = 0; i < nin; i++) { const v = h[i]; if (!v) continue; const r = i * nout; for (let j = 0; j < nout; j++) o[j] += v * q[r + j]; }
    for (let j = 0; j < nout; j++) { o[j] = o[j] * s[j] + b[j]; if (k < L.length - 1 && o[j] < 0) o[j] = 0; }
    h = o;
  }
  let m = -1e9; for (const v of h) m = Math.max(m, v);
  let z = 0; const p = Array.from(h, v => { const e = Math.exp(v - m); z += e; return e; });
  return p.map(v => v / z);
}

const argmax = p => p.indexOf(Math.max(...p));
const xr = g => { let a = 1e9, b = -1e9; for (const s of g) for (const p of s) { if (p[0] < a) a = p[0]; if (p[0] > b) b = p[0]; } return [a, b]; };

/* dela upp strecken i siffror: streck som överlappar i sidled hör till samma siffra */
function digGroups(strokes) {
  let y0 = 1e9, y1 = -1e9;
  for (const s of strokes) for (const p of s) { y0 = Math.min(y0, p[1]); y1 = Math.max(y1, p[1]); }
  const H = Math.max(1, y1 - y0), tol = H * 0.08;
  const Gs = strokes.map(s => { const [a, b] = xr([s]); return { s: [s], a, b }; });
  let ch = true;
  while (ch) {
    ch = false;
    outer: for (let i = 0; i < Gs.length; i++) for (let j = i + 1; j < Gs.length; j++) {
      const A = Gs[i], B = Gs[j], ov = Math.min(A.b, B.b) - Math.max(A.a, B.a), mw = Math.min(A.b - A.a, B.b - B.a);
      if (ov > Math.min(0.25 * mw, H * 0.15) - tol) { Gs[i] = { s: A.s.concat(B.s), a: Math.min(A.a, B.a), b: Math.max(A.b, B.b) }; Gs.splice(j, 1); ch = true; break outer; }
    }
  }
  return Gs.sort((p, q) => p.a - q.a).map(g => g.s);
}

/* Läs ett ritat tal och avgör om det är rätt svar (lite snällt: rätt siffra behöver inte vara säkraste gissningen) */
export function readNumber(strokes, ans) {
  const want = String(ans).split('').map(Number);
  const nat = digGroups(strokes), natP = nat.map(g => probs(toImage(g), 'dig'));
  const read = natP.map(argmax).join(''), conf = Math.min(...natP.map(p => Math.max(...p)));
  let ok = read === String(ans);
  if (!ok) {
    const cand = [];
    if (want.length === nat.length) cand.push(natP);
    const [ax0, ax1] = xr(strokes);
    let ay0 = 1e9, ay1 = -1e9;
    for (const st of strokes) for (const q of st) { ay0 = Math.min(ay0, q[1]); ay1 = Math.max(ay1, q[1]); }
    const gaps = nat.slice(1).map((g, i) => xr(g)[0] - xr(nat[i])[1]);
    if (want.length === 1 && nat.length > 1 && ax1 - ax0 <= 0.95 * (ay1 - ay0) && Math.max(...gaps) < 0.15 * (ay1 - ay0)) cand.push([probs(toImage(strokes), 'dig')]);
    if (want.length === 2 && strokes.length >= 2) {
      const ord = strokes.map(s => ({ s, c: s.reduce((a, p) => a + p[0], 0) / s.length })).sort((a, b) => a.c - b.c).map(o => o.s);
      for (let k = 1; k < ord.length; k++) {
        const A = ord.slice(0, k), B = ord.slice(k), [a0, a1] = xr(A), [b0, b1] = xr(B);
        const ov = Math.min(a1, b1) - Math.max(a0, b0), mw = Math.max(1, Math.min(a1 - a0, b1 - b0));
        if (ov < 0.35 * mw) cand.push([probs(toImage(A), 'dig'), probs(toImage(B), 'dig')]);
      }
    }
    ok = cand.some(P => P.every((p, i) => p[want[i]] >= (want.length === 2 && i === 0 && want[0] === 1 ? 0.12 : 0.3)));
  }
  return { ok, read, conf };
}

/* Bokstäver. Gränser per bokstav: A ska vara svårare (ritas lätt av misstag), G lättare (förväxlas med C/O).
   lvl 'auto' = godkänns direkt efter ett streck, 'ok' = när man trycker på Klar. */
const LTH = { A: { auto: 0.88, ok: 0.6 }, Å: { auto: 0.8, ok: 0.5 }, Ä: { auto: 0.8, ok: 0.5 }, G: { auto: 0.3, ok: 0.06, alt: 'CO', junk: 0.5 } };
export function letterProbs(strokes) { return probs(toImage(strokes), 'let'); }
export function letterPass(p, ch, lvl) {
  const k = LETTERS.indexOf(ch), t = LTH[ch] || {}, th = t[lvl] ?? (lvl === 'auto' ? 0.75 : 0.45), jmax = t.junk ?? (lvl === 'auto' ? 0.15 : 0.25), top = argmax(p);
  if (top === JUNK || p[JUNK] > jmax) return false;
  if (top === k && p[k] >= th) return true;
  if (t.alt && lvl === 'ok') { let s = p[k]; for (const c of t.alt) s += p[LETTERS.indexOf(c)]; return s >= 0.6 && p[k] >= 0.02; }
  if (ch === 'G' && p[k] >= th) return true;
  return false;
}
/* Vad tror nätet att det är? { ch: 'B' | null, conf } */
export function letterGuess(p) { const t = argmax(p); return t < JUNK ? { ch: LETTERS[t], conf: p[t] } : { ch: null, conf: 0 }; }

/* =========================================================
   Ritruta: ett canvas man ritar i med finger, penna eller mus.
   ========================================================= */
export class Pad {
  constructor(host, { onStroke = null, color = '#8a3cff', line = 0.07, baseline = false } = {}) {
    this.host = host; this.onStroke = onStroke; this.color = color; this.line = line; this.baseline = baseline;
    this.strokes = []; this.cur = null; this.pid = null; this.locked = false; this.ghost = null; this.okColor = null;
    this.cv = document.createElement('canvas');
    this.cv.className = 'padcv';
    host.appendChild(this.cv);
    this.ctx = this.cv.getContext('2d');
    const pos = e => { const r = this.cv.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
    this.cv.addEventListener('pointerdown', e => {
      if (this.locked || this.pid !== null) return;
      e.preventDefault();
      try { this.cv.setPointerCapture(e.pointerId); } catch (_) {}
      this.pid = e.pointerId; this.cur = [pos(e)]; this.strokes.push(this.cur);
      this.host.classList.add('drawing');
      this.draw();
    });
    this.cv.addEventListener('pointermove', e => {
      if (!this.cur || e.pointerId !== this.pid) return;
      e.preventDefault();
      const ev = e.getCoalescedEvents ? e.getCoalescedEvents() : [e];
      for (const v of (ev.length ? ev : [e])) {
        const p = pos(v), l = this.cur[this.cur.length - 1];
        if (Math.hypot(p[0] - l[0], p[1] - l[1]) >= 1.2) this.cur.push(p);
      }
      this.draw();
    });
    const end = e => {
      if (e.pointerId !== this.pid) return;
      this.pid = null; this.cur = null;
      this.host.classList.remove('drawing');
      if (this.onStroke) this.onStroke(this);
    };
    this.cv.addEventListener('pointerup', end);
    this.cv.addEventListener('pointercancel', end);
    this.cv.addEventListener('lostpointercapture', end);
    this.ro = new ResizeObserver(() => this.resize());
    this.ro.observe(host);
  }
  resize() {
    const r = this.cv.getBoundingClientRect(), d = Math.min(2, window.devicePixelRatio || 1);
    const w = Math.max(1, Math.round(r.width * d)), h = Math.max(1, Math.round(r.height * d));
    if (w !== this.cv.width || h !== this.cv.height) { this.cv.width = w; this.cv.height = h; }
    this.draw();
  }
  get size() { const r = this.cv.getBoundingClientRect(); return [r.width, r.height]; }
  /* hur stort det ritade är (största sidan i px) */
  extent() {
    let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
    for (const s of this.strokes) for (const [x, y] of s) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
    return this.strokes.length ? Math.max(x1 - x0, y1 - y0) : 0;
  }
  clear() { this.strokes = []; this.cur = null; this.pid = null; this.okColor = null; this.host.classList.remove('drawing'); this.draw(); }
  setGhost(t) { this.ghost = t; this.draw(); }
  draw() {
    const [w, h] = this.size, d = this.cv.width / (w || 1), x = this.ctx;
    x.setTransform(1, 0, 0, 1, 0, 0); x.clearRect(0, 0, this.cv.width, this.cv.height); x.setTransform(d, 0, 0, d, 0, 0);
    if (this.baseline) {
      x.strokeStyle = 'rgba(138,92,255,.22)'; x.lineWidth = 3; x.setLineDash([12, 12]);
      x.beginPath(); x.moveTo(16, h * 0.84); x.lineTo(w - 16, h * 0.84); x.stroke(); x.setLineDash([]);
    }
    if (this.ghost) {
      x.fillStyle = 'rgba(138,92,255,.13)'; x.textAlign = 'center'; x.textBaseline = 'middle';
      x.font = `700 ${Math.round(h * 0.78)}px Fredoka, 'Trebuchet MS', sans-serif`;
      x.fillText(this.ghost, w / 2, h * 0.53);
    }
    x.lineCap = x.lineJoin = 'round';
    x.strokeStyle = this.okColor || this.color;
    x.lineWidth = Math.max(7, Math.min(22, Math.min(w, h) * this.line));
    for (const s of this.strokes) {
      x.beginPath(); x.moveTo(s[0][0], s[0][1]);
      if (s.length === 1) x.lineTo(s[0][0] + 0.01, s[0][1]);
      for (const p of s) x.lineTo(p[0], p[1]);
      x.stroke();
    }
  }
}
